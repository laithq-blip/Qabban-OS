// ═══════════════════════════════════════════════════════════════════════════════
//  AcaiaLink  —  Web Bluetooth Service for Acaia Lunar / Pearl Scales
//  Client-side TypeScript class that runs entirely in the browser.
//
//  Acaia GATT Profile:
//    Service UUID      : 0x0000ffe0-0000-1000-8000-00805f9b34fb
//    Characteristic    : 0x0000ffe1-0000-1000-8000-00805f9b34fb
//
//  Packet Structure (Acaia binary protocol):
//    Byte 0   : 0xEF  — header byte 1
//    Byte 1   : 0xDD  — header byte 2
//    Byte 2   : Message type
//                 0x0B = Weight report
//                 0x07 = Heart-beat
//                 0x0A = Tare confirmed
//    Byte 3   : Payload length
//    Byte 4-5 : Weight (little-endian int16) × 0.1 = grams (signed)
//    Byte 6   : Unit byte  (0x02 = grams, 0x05 = oz)
//    Byte 7   : Status bits
//                 bit 0 = stable flag (1 = stable reading)
//    Byte 8   : Checksum (XOR of bytes 2..7)
// ═══════════════════════════════════════════════════════════════════════════════

export const ACAIA_SERVICE_UUID        = '0000ffe0-0000-1000-8000-00805f9b34fb'
export const ACAIA_CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb'

export const ACAIA_MSG_WEIGHT    = 0x0b
export const ACAIA_MSG_HEARTBEAT = 0x07
export const ACAIA_MSG_TARE      = 0x0a

export const ACAIA_HEADER_1 = 0xef
export const ACAIA_HEADER_2 = 0xdd

export interface AcaiaWeightEvent {
  weightGrams : number    // Parsed weight in grams (2 decimal places)
  stable      : boolean   // True when scale has settled
  unit        : 'g' | 'oz'
  rawPacket   : Uint8Array
  timestamp   : number    // performance.now()
}

export type AcaiaEventType =
  | 'weight'        // AcaiaWeightEvent
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'tare'

export type AcaiaListener = (event: AcaiaEventType, data?: AcaiaWeightEvent | Error | null) => void

// ── Heartbeat command bytes the scale expects every ~3 s ─────────────────────
const HEARTBEAT_CMD = new Uint8Array([0xef, 0xdd, 0x00, 0x02, 0x00, 0x02, 0x00, 0x05, 0x0f])
const TARE_CMD      = new Uint8Array([0xef, 0xdd, 0x04, 0x02, 0x00, 0x00, 0x00, 0x05, 0x0b])

// ─────────────────────────────────────────────────────────────────────────────
export class AcaiaLink {
  // ── Public state ──────────────────────────────────────────────────
  connected         = false
  latestWeightGrams = 0
  latestStable      = false

  // ── Dial-in mode — log every stable reading as waste ─────────────
  dialInActive   = false
  dialInLog      : { weightGrams: number; ts: number; sessionId: string }[] = []
  private _dialInSessionId = ''

  // ── Internal ──────────────────────────────────────────────────────
  private _device      : BluetoothDevice | null     = null
  private _char        : BluetoothRemoteGATTCharacteristic | null = null
  private _listeners   : AcaiaListener[]            = []
  private _hbTimer     : ReturnType<typeof setInterval> | null = null
  private _parseBuffer : number[]                   = []

  // ── 5 readings/s debounce ─────────────────────────────────────────
  private _lastWeightTs = 0
  private readonly _MIN_INTERVAL_MS = 200   // max 5 readings/s

  // ─── Event subscription ──────────────────────────────────────────
  on(listener: AcaiaListener): () => void {
    this._listeners.push(listener)
    return () => { this._listeners = this._listeners.filter(l => l !== listener) }
  }

  private _emit(type: AcaiaEventType, data?: AcaiaWeightEvent | Error | null) {
    this._listeners.forEach(l => {
      try { l(type, data) } catch { /* ignore listener errors */ }
    })
  }

  // ─── Connect ─────────────────────────────────────────────────────
  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available in this browser. Use Chrome/Edge on a supported OS.')
    }

    try {
      this._device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [ACAIA_SERVICE_UUID] },
          { namePrefix: 'ACAIA' },
          { namePrefix: 'Acaia' },
          { namePrefix: 'LUNAR' },
          { namePrefix: 'PEARL' },
        ],
        optionalServices: [ACAIA_SERVICE_UUID],
      })

      this._device.addEventListener('gattserverdisconnected', () => this._onDisconnect())

      const server  = await this._device.gatt!.connect()
      const service = await server.getPrimaryService(ACAIA_SERVICE_UUID)
      this._char    = await service.getCharacteristic(ACAIA_CHARACTERISTIC_UUID)

      // Subscribe to notifications (scale pushes data packets)
      await this._char.startNotifications()
      this._char.addEventListener(
        'characteristicvaluechanged',
        (ev: Event) => this._onCharacteristicChanged(ev as unknown as { target: BluetoothRemoteGATTCharacteristic })
      )

      // Start heartbeat to keep connection alive
      this._startHeartbeat()

      this.connected = true
      this._emit('connected')

    } catch (err) {
      this._emit('error', err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  // ─── Disconnect ──────────────────────────────────────────────────
  async disconnect(): Promise<void> {
    this._stopHeartbeat()
    if (this._char) {
      try { await this._char.stopNotifications() } catch { /* best effort */ }
      this._char = null
    }
    if (this._device?.gatt?.connected) {
      this._device.gatt.disconnect()
    }
    this._device = null
    this.connected = false
    this._emit('disconnected')
  }

  // ─── Tare (zero) the scale ────────────────────────────────────────
  async tare(): Promise<void> {
    if (!this._char) throw new Error('Scale not connected')
    await this._char.writeValue(TARE_CMD)
    this._emit('tare')
  }

  // ─── Dial-in Mode ────────────────────────────────────────────────
  startDialIn(sessionId?: string): void {
    this._dialInSessionId = sessionId ?? `DI-${Date.now()}`
    this.dialInActive     = true
    this.dialInLog        = []
    console.info('[AcaiaLink] Dial-in mode STARTED — session:', this._dialInSessionId)
  }

  stopDialIn(): { sessionId: string; entries: typeof this.dialInLog; totalGrams: number } {
    this.dialInActive = false
    const total = this.dialInLog.reduce((s, e) => s + e.weightGrams, 0)
    console.info(`[AcaiaLink] Dial-in mode STOPPED — ${this.dialInLog.length} readings, ${total.toFixed(1)} g total`)
    return {
      sessionId  : this._dialInSessionId,
      entries    : [...this.dialInLog],
      totalGrams : Math.round(total * 10) / 10,
    }
  }

  // ─── Internal: characteristic changed callback ────────────────────
  private _onCharacteristicChanged(ev: { target: BluetoothRemoteGATTCharacteristic }) {
    const view  = ev.target.value
    if (!view) return

    const raw: number[] = []
    for (let i = 0; i < view.byteLength; i++) raw.push(view.getUint8(i))

    // Append to streaming buffer and drain complete packets
    this._parseBuffer.push(...raw)
    this._drainBuffer()
  }

  // ─── Packet parser (streaming buffer drain) ───────────────────────
  // Each Acaia packet: [0xEF, 0xDD, type, len, ...payload, checksum]
  private _drainBuffer(): void {
    while (this._parseBuffer.length >= 7) {
      // Find header
      const h1 = this._parseBuffer.indexOf(ACAIA_HEADER_1)
      if (h1 === -1) { this._parseBuffer = []; return }
      if (h1 > 0)    { this._parseBuffer.splice(0, h1) }

      if (this._parseBuffer.length < 4) return

      if (this._parseBuffer[1] !== ACAIA_HEADER_2) {
        this._parseBuffer.splice(0, 1)
        continue
      }

      const msgType   = this._parseBuffer[2]
      const payloadLen = this._parseBuffer[3]
      const totalLen  = 4 + payloadLen + 1   // header(2) + type + len + payload + checksum

      if (this._parseBuffer.length < totalLen) return  // wait for more bytes

      const packet = new Uint8Array(this._parseBuffer.splice(0, totalLen))
      this._processPacket(packet, msgType)
    }
  }

  // ─── Process a fully-assembled Acaia packet ───────────────────────
  private _processPacket(packet: Uint8Array, msgType: number): void {
    // Verify checksum (XOR of bytes from index 2 to penultimate)
    let xorVal = 0
    for (let i = 2; i < packet.length - 1; i++) xorVal ^= packet[i]
    if (xorVal !== packet[packet.length - 1]) return  // bad checksum — discard

    if (msgType === ACAIA_MSG_WEIGHT && packet.length >= 9) {
      this._parseWeightPacket(packet)
    }
    // HEARTBEAT and TARE acks: no action needed beyond ACK
  }

  // ─── Weight packet decoder ────────────────────────────────────────
  // Bytes 4-5: signed int16 LE = weight × 10 (gives 0.1 g resolution)
  // Byte 6   : unit (0x02 = g, 0x05 = oz)
  // Byte 7   : status bits — bit 0 = stable
  private _parseWeightPacket(packet: Uint8Array): void {
    const now = performance.now()

    // Rate limit: cap at 5 readings/s
    if (now - this._lastWeightTs < this._MIN_INTERVAL_MS) return
    this._lastWeightTs = now

    const rawInt = (packet[5] << 8) | packet[4]
    // Handle two's complement for negative weight (below tare)
    const signed       = rawInt > 0x7FFF ? rawInt - 0x10000 : rawInt
    const weightGrams  = Math.round(signed) / 10     // 1 decimal place

    const unitByte = packet[6]
    const unit: 'g' | 'oz' = unitByte === 0x05 ? 'oz' : 'g'

    const statusByte = packet[7]
    const stable     = Boolean(statusByte & 0x01)

    const event: AcaiaWeightEvent = {
      weightGrams,
      stable,
      unit,
      rawPacket: packet,
      timestamp: now,
    }

    // Update live state
    this.latestWeightGrams = weightGrams
    this.latestStable      = stable

    // Dial-in mode: log every STABLE positive reading
    if (this.dialInActive && stable && weightGrams > 0) {
      this.dialInLog.push({
        weightGrams,
        ts        : Date.now(),
        sessionId : this._dialInSessionId,
      })
    }

    this._emit('weight', event)
  }

  // ─── Heartbeat ────────────────────────────────────────────────────
  // Acaia scales time-out if they don't receive a heartbeat every ~3 s.
  private _startHeartbeat(): void {
    this._stopHeartbeat()
    this._hbTimer = setInterval(async () => {
      if (!this._char || !this.connected) return
      try { await this._char.writeValue(HEARTBEAT_CMD) } catch { /* ignore */ }
    }, 2800)
  }

  private _stopHeartbeat(): void {
    if (this._hbTimer) { clearInterval(this._hbTimer); this._hbTimer = null }
  }

  // ─── GATT disconnect handler ──────────────────────────────────────
  private _onDisconnect(): void {
    this._stopHeartbeat()
    this.connected = false
    this._char     = null
    this._emit('disconnected')
  }

  // ─── Utility: simulate weight (for browsers without BT / testing) ─
  simulateWeight(grams: number, stable = true): void {
    const event: AcaiaWeightEvent = {
      weightGrams: grams,
      stable,
      unit: 'g',
      rawPacket: new Uint8Array([0xef, 0xdd, ACAIA_MSG_WEIGHT, 0x06,
        grams & 0xff, (grams >> 8) & 0xff, 0x02, stable ? 0x01 : 0x00, 0x00, 0x00]),
      timestamp: performance.now(),
    }
    this.latestWeightGrams = grams
    this.latestStable      = stable
    if (this.dialInActive && stable && grams > 0) {
      this.dialInLog.push({ weightGrams: grams, ts: Date.now(), sessionId: this._dialInSessionId })
    }
    this._emit('weight', event)
  }
}

// ── Singleton export for the Pulse page ───────────────────────────────────────
export const acaiaLink = new AcaiaLink()
