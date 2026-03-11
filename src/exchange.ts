// ─────────────────────────────────────────────────────────────────────────────
//  Qabban Global Exchange (GEX)
//  Multi-vendor B2B coffee trading layer built on top of Qabban OS.
//
//  Modules:
//    1. Vendor Portal       — global producers register lots + FOB prices
//    2. Buyer Portal        — Saudi roasteries browse and contract
//    3. Currency Engine     — XE Data API proxy + 2 % buffer, SAR conversion
//    4. Climate Passport    — IoT humidity verification + SCA Gold badge
//    5. Landed Price Calc   — shipping + customs + 15 % ZATCA VAT
//    6. Phase-2 E-Invoice   — UUID + QR-code, ZATCA-compliant
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto'

// ══════════════════════════════════════════════════════════════════════════════
//  § 1  TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export type GexLotStatus =
  | 'AVAILABLE'    // listed, open to offers
  | 'CONTRACTED'   // buyer contract confirmed, pre-shipment
  | 'SHIPPED'      // FOB vessel departed
  | 'LANDED'       // arrived in KSA, customs cleared
  | 'REJECTED'     // buyer rejected after inspection
  | 'WITHDRAWN'    // vendor withdrew listing

export type ProcessingMethod =
  | 'Natural'
  | 'Washed'
  | 'Honey'
  | 'Anaerobic Natural'
  | 'Anaerobic Washed'
  | 'Wet-Hulled'
  | 'Pulped Natural'
  | 'Other'

export type FobCurrency = 'USD' | 'EUR' | 'GBP'

// SCA Gold Storage: warehouse RH must be 50–60 %
export const SCA_RH_MIN = 50
export const SCA_RH_MAX = 60

// Landed price components
export const ZATCA_VAT_RATE    = 0.15   // 15 %
export const CUSTOMS_DUTY_RATE = 0.05   // 5 % flat (green coffee HS 0901.11)
export const DEFAULT_FREIGHT_USD_PER_KG = 0.85   // sea freight + insurance estimate

export interface ClimatePassport {
  sensorId:        string    // producer's IoT device ID
  lastReadingAt:   string    // ISO timestamp of last sensor push
  humidity:        number    // current RH %
  tempCelsius:     number    // ambient temperature °C
  scaGoldBadge:    boolean   // humidity within 50–60 %
  badgeReason:     string    // human-readable explanation
}

export interface GexVendor {
  id:              string    // VND-001, VND-002 …
  companyName:     string
  country:         string
  contactEmail:    string
  registeredAt:    string    // ISO date
  verified:        boolean   // admin-verified vendor
}

export interface GexLot {
  id:              string    // GEX-001, GEX-002 …
  vendorId:        string
  origin:          string    // e.g. "Ethiopia Yirgacheffe"
  region:          string    // sub-region / cooperative
  variety:         string
  process:         ProcessingMethod
  cropYear:        string    // e.g. "2025/26"
  gradeScore:      number    // SCA cupping score
  availableKg:     number    // quantity on offer
  fobPricePerKg:   number    // price in fobCurrency
  fobCurrency:     FobCurrency
  minOrderKg:      number
  description:     string
  flavorNotes:     string[]
  certifications:  string[]  // e.g. ['Organic', 'Fair Trade']
  climate:         ClimatePassport
  status:          GexLotStatus
  listedAt:        string    // ISO date
  expiresAt:       string    // ISO date — offer expiry
}

export interface GexContract {
  id:             string    // CON-001 …
  buyerId:        string    // cafe/roastery client ID (e.g. CAF-001) or buyer account
  vendorId:       string
  gexLotId:       string
  quantityKg:     number
  agreedFobPerKg: number
  agreedCurrency: FobCurrency
  // SAR conversion snapshot at contract time
  exchangeRateUsed:     number   // e.g. 3.76 USD→SAR
  exchangeBufferPct:    number   // e.g. 2
  fobSarPerKg:          number   // fob × rate × (1+buffer)
  // Landed cost breakdown
  freightUsdPerKg:      number
  customsDutyPct:       number
  vatPct:               number
  landedSarPerKg:       number
  totalLandedSar:       number
  // Status
  status:         'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED'
  createdAt:      string
  invoiceId:      string | null   // linked e-invoice UUID
}

// Phase-2 ZATCA e-invoice
export interface GexInvoice {
  uuid:              string    // UUID v4
  invoiceNumber:     string    // INV-GEX-2026-0001 …
  issueDate:         string    // ISO date
  issueTime:         string    // HH:MM:SS
  sellerName:        string    // vendor company name
  buyerName:         string    // roastery / cafe name
  contractId:        string
  lineItems:         GexInvoiceLineItem[]
  subtotalSar:       number
  vatAmountSar:      number
  totalSar:          number
  vatNumber:         string    // buyer VAT registration number (placeholder)
  qrCodePayload:     string    // Base64-encoded TLV as per ZATCA Phase 2
  status:            'DRAFT' | 'ISSUED' | 'CANCELLED'
}

export interface GexInvoiceLineItem {
  description:     string
  qty:             number
  unitPriceSar:    number
  vatRate:         number
  lineNetSar:      number
  lineVatSar:      number
  lineTotalSar:    number
}

// Exchange-rate cache entry
export interface FxRate {
  from:        FobCurrency
  to:          'SAR'
  rate:        number
  bufferedRate:number   // rate × (1 + buffer/100)
  fetchedAt:   string   // ISO timestamp
  source:      'live' | 'fallback'
}

// Finance settings (persisted in-memory, overridable via admin)
export interface GexSettings {
  exchangeBufferPct: number   // default 2 %
  freightUsdPerKg:   number   // default 0.85
  customsDutyPct:    number   // default 5
  vatPct:            number   // always 15 (ZATCA)
  xeApiAccountId:    string   // XE Data API account ID (or '')
  xeApiKey:          string   // XE Data API key (or '')
}

// ══════════════════════════════════════════════════════════════════════════════
//  § 2  IN-MEMORY STORES
// ══════════════════════════════════════════════════════════════════════════════

export const gexVendors: GexVendor[] = [
  {
    id:          'VND-001',
    companyName: 'Yirgacheffe Estates Co-op',
    country:     'Ethiopia',
    contactEmail:'sourcing@yirgacheffe-estates.et',
    registeredAt:'2026-01-15',
    verified:    true,
  },
  {
    id:          'VND-002',
    companyName: 'Fazenda Cerrado Ltda.',
    country:     'Brazil',
    contactEmail:'export@fazendacerrado.br',
    registeredAt:'2026-01-20',
    verified:    true,
  },
  {
    id:          'VND-003',
    companyName: 'Hacienda La Palma',
    country:     'Colombia',
    contactEmail:'trade@lapalma.co',
    registeredAt:'2026-02-01',
    verified:    false,
  },
]

// Seed climate passports — IoT readings
const mkPassport = (
  sensorId: string, rh: number, temp: number
): ClimatePassport => {
  const badge  = rh >= SCA_RH_MIN && rh <= SCA_RH_MAX
  const reason = badge
    ? `RH ${rh}% is within the SCA Gold Storage range (${SCA_RH_MIN}–${SCA_RH_MAX}%). Warehouse meets SCA Green Coffee Storage Standard.`
    : rh < SCA_RH_MIN
      ? `RH ${rh}% is below the ${SCA_RH_MIN}% minimum. Risk of moisture loss and premature aging.`
      : `RH ${rh}% exceeds the ${SCA_RH_MAX}% maximum. Risk of mould — dehumidification recommended.`
  return {
    sensorId,
    lastReadingAt: new Date().toISOString(),
    humidity:      rh,
    tempCelsius:   temp,
    scaGoldBadge:  badge,
    badgeReason:   reason,
  }
}

export const gexLots: GexLot[] = [
  {
    id:            'GEX-001',
    vendorId:      'VND-001',
    origin:        'Ethiopia Yirgacheffe',
    region:        'Gedeo Zone — Kochere Cooperative',
    variety:       'Heirloom (JARC)',
    process:       'Natural',
    cropYear:      '2025/26',
    gradeScore:    93.5,
    availableKg:   3000,
    fobPricePerKg: 7.80,
    fobCurrency:   'USD',
    minOrderKg:    300,
    description:   'Sundried naturals from the Kochere cooperative. Intense blueberry and jasmine aromatics, 2400 masl.',
    flavorNotes:   ['Blueberry', 'Jasmine', 'Dark Chocolate', 'Stone Fruit'],
    certifications:['Organic', 'Fair Trade', 'Rainforest Alliance'],
    climate:       mkPassport('ETH-IOT-K01', 55, 18),
    status:        'AVAILABLE',
    listedAt:      '2026-03-01',
    expiresAt:     '2026-04-30',
  },
  {
    id:            'GEX-002',
    vendorId:      'VND-002',
    origin:        'Brazil Cerrado',
    region:        'Cerrado Mineiro — Patrocínio',
    variety:       'Catuaí Vermelho',
    process:       'Pulped Natural',
    cropYear:      '2025/26',
    gradeScore:    86.5,
    availableKg:   10000,
    fobPricePerKg: 4.20,
    fobCurrency:   'USD',
    minOrderKg:    500,
    description:   'Consistent specialty microlot from certified Cerrado Mineiro region. Nutty, sweet, with balanced acidity.',
    flavorNotes:   ['Hazelnut', 'Milk Chocolate', 'Dried Fruit', 'Brown Sugar'],
    certifications:['Rainforest Alliance'],
    climate:       mkPassport('BRZ-IOT-P02', 58, 22),
    status:        'AVAILABLE',
    listedAt:      '2026-03-03',
    expiresAt:     '2026-05-31',
  },
  {
    id:            'GEX-003',
    vendorId:      'VND-003',
    origin:        'Colombia Huila',
    region:        'Huila — Pitalito',
    variety:       'Caturra / Castillo',
    process:       'Washed',
    cropYear:      '2025/26',
    gradeScore:    89.0,
    availableKg:   1500,
    fobPricePerKg: 5.90,
    fobCurrency:   'USD',
    minOrderKg:    200,
    description:   'Double-fermented washed lots from small family farms at 1700–1900 masl. Classic Huila profile.',
    flavorNotes:   ['Caramel', 'Red Apple', 'Citrus', 'Vanilla'],
    certifications:['Fair Trade'],
    climate:       mkPassport('COL-IOT-H03', 63, 17),  // RH 63 — above SCA max
    status:        'AVAILABLE',
    listedAt:      '2026-03-05',
    expiresAt:     '2026-04-15',
  },
  {
    id:            'GEX-004',
    vendorId:      'VND-001',
    origin:        'Kenya AA',
    region:        'Nyeri — Tetu Cooperative',
    variety:       'SL28 / SL34',
    process:       'Washed',
    cropYear:      '2025/26',
    gradeScore:    91.0,
    availableKg:   800,
    fobPricePerKg: 9.10,
    fobCurrency:   'USD',
    minOrderKg:    100,
    description:   'Classic Nyeri AB/AA lot. Double-washing on raised African beds at 1900 masl. Bright and complex.',
    flavorNotes:   ['Blackcurrant', 'Grapefruit', 'Black Tea', 'Floral'],
    certifications:['Organic'],
    climate:       mkPassport('KEN-IOT-T04', 52, 16),
    status:        'AVAILABLE',
    listedAt:      '2026-03-06',
    expiresAt:     '2026-04-20',
  },
  {
    id:            'GEX-005',
    vendorId:      'VND-002',
    origin:        'Guatemala Antigua',
    region:        'Antigua Valley — La Hermosa',
    variety:       'Bourbon',
    process:       'Honey',
    cropYear:      '2025/26',
    gradeScore:    88.0,
    availableKg:   2000,
    fobPricePerKg: 5.40,
    fobCurrency:   'USD',
    minOrderKg:    250,
    description:   'Honey-processed Bourbon from the Antigua Valley. Volcanic soil at 1500–1700 masl.',
    flavorNotes:   ['Peach', 'Toffee', 'Almond', 'Mild Acidity'],
    certifications:['Organic', 'Shade Grown'],
    climate:       mkPassport('GTM-IOT-A05', 57, 20),
    status:        'CONTRACTED',
    listedAt:      '2026-02-20',
    expiresAt:     '2026-04-10',
  },
]

export const gexContracts: GexContract[] = [
  {
    id:              'CON-001',
    buyerId:         'CAF-001',
    vendorId:        'VND-002',
    gexLotId:        'GEX-005',
    quantityKg:      500,
    agreedFobPerKg:  5.40,
    agreedCurrency:  'USD',
    exchangeRateUsed:    3.75,
    exchangeBufferPct:   2,
    fobSarPerKg:         5.40 * 3.75 * 1.02,
    freightUsdPerKg:     0.85,
    customsDutyPct:      5,
    vatPct:              15,
    landedSarPerKg:      0,   // computed below
    totalLandedSar:      0,
    status:          'CONFIRMED',
    createdAt:       '2026-02-25T10:30:00Z',
    invoiceId:       'INV-GEX-2026-0001',
  },
]
// Compute landed for seed contract
;(function seedLanded() {
  const con = gexContracts[0]
  const fobSar      = con.fobSarPerKg                         // ≈ 20.655
  const freightSar  = con.freightUsdPerKg * con.exchangeRateUsed * (1 + con.exchangeBufferPct / 100)
  const costBeforeDuty = fobSar + freightSar
  const dutyPerKg      = costBeforeDuty * (con.customsDutyPct / 100)
  const preVat         = costBeforeDuty + dutyPerKg
  const vatPerKg       = preVat * (con.vatPct / 100)
  con.landedSarPerKg   = Math.round((preVat + vatPerKg) * 100) / 100
  con.totalLandedSar   = Math.round(con.landedSarPerKg * con.quantityKg * 100) / 100
})()

export const gexInvoices: GexInvoice[] = []

// ── GEX Finance Settings (mutable) ────────────────────────────────────────
export let gexSettings: GexSettings = {
  exchangeBufferPct: 2,
  freightUsdPerKg:   DEFAULT_FREIGHT_USD_PER_KG,
  customsDutyPct:    5,
  vatPct:            15,
  xeApiAccountId:    '',
  xeApiKey:          '',
}

export const updateGexSettings = (patch: Partial<GexSettings>) => {
  Object.assign(gexSettings, patch)
}

// FX rate cache (updated by live fetch or fallback)
export const fxCache = new Map<FobCurrency, FxRate>()

// Fallback SAR rates (pegged / approximate as of early 2026)
const FX_FALLBACK: Record<FobCurrency, number> = {
  USD: 3.75,
  EUR: 4.08,
  GBP: 4.76,
}

// ══════════════════════════════════════════════════════════════════════════════
//  § 3  PURE BUSINESS LOGIC
// ══════════════════════════════════════════════════════════════════════════════

// ── 3a  Currency Engine ────────────────────────────────────────────────────

/**
 * getBufferedRate
 * Returns the buffered SAR rate for a given currency.
 * If no live rate cached, uses FX_FALLBACK.
 */
export const getBufferedRate = (currency: FobCurrency, bufferPct = gexSettings.exchangeBufferPct): number => {
  const cached = fxCache.get(currency)
  const base   = cached ? cached.rate : FX_FALLBACK[currency]
  return Math.round(base * (1 + bufferPct / 100) * 10000) / 10000
}

/**
 * fobToSar
 * Converts a FOB price per kg to SAR using the buffered exchange rate.
 */
export const fobToSar = (fobPerKg: number, currency: FobCurrency): number => {
  return Math.round(fobPerKg * getBufferedRate(currency) * 100) / 100
}

// ── 3b  Landed Price Calculator ───────────────────────────────────────────

export interface LandedBreakdown {
  fobPerKg:            number   // FOB in original currency
  fobCurrency:         FobCurrency
  exchangeRate:        number   // base (unbuffered)
  bufferPct:           number
  bufferedRate:        number
  fobSarPerKg:         number   // FOB converted to SAR with buffer
  freightUsdPerKg:     number
  freightSarPerKg:     number   // freight converted with same buffered rate
  cfrSarPerKg:         number   // cost + freight
  customsDutyPct:      number
  customsDutySarPerKg: number
  cifSarPerKg:         number   // cif = cfr + duty (simplified)
  vatPct:              number
  vatSarPerKg:         number
  landedSarPerKg:      number   // total all-in per kg
  totalLandedSar:      number   // × quantity
  quantityKg:          number
}

export const calcLandedPrice = (
  fobPerKg:    number,
  currency:    FobCurrency,
  quantityKg:  number,
  settings:    GexSettings = gexSettings,
): LandedBreakdown => {
  const cached = fxCache.get(currency)
  const baseRate     = cached ? cached.rate : FX_FALLBACK[currency]
  const bufferedRate = Math.round(baseRate * (1 + settings.exchangeBufferPct / 100) * 10000) / 10000

  const fobSarPerKg      = Math.round(fobPerKg * bufferedRate * 100) / 100
  const freightSarPerKg  = Math.round(settings.freightUsdPerKg * bufferedRate * 100) / 100
  const cfrSarPerKg      = fobSarPerKg + freightSarPerKg
  const customsDutySar   = Math.round(cfrSarPerKg * (settings.customsDutyPct / 100) * 100) / 100
  const cifSarPerKg      = cfrSarPerKg + customsDutySar
  const vatSarPerKg      = Math.round(cifSarPerKg * (settings.vatPct / 100) * 100) / 100
  const landedSarPerKg   = Math.round((cifSarPerKg + vatSarPerKg) * 100) / 100
  const totalLandedSar   = Math.round(landedSarPerKg * quantityKg * 100) / 100

  return {
    fobPerKg, fobCurrency: currency,
    exchangeRate:        baseRate,
    bufferPct:           settings.exchangeBufferPct,
    bufferedRate,
    fobSarPerKg,
    freightUsdPerKg:     settings.freightUsdPerKg,
    freightSarPerKg,
    cfrSarPerKg,
    customsDutyPct:      settings.customsDutyPct,
    customsDutySarPerKg: customsDutySar,
    cifSarPerKg,
    vatPct:              settings.vatPct,
    vatSarPerKg,
    landedSarPerKg,
    totalLandedSar,
    quantityKg,
  }
}

// ── 3c  ZATCA Phase-2 E-Invoice Generator ─────────────────────────────────

let invoiceCounter = 1

/**
 * generateUUIDv4
 * RFC-4122 v4 UUID — uses Web Crypto so it works in the Workers runtime.
 */
export const generateUUIDv4 = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40   // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80   // variant 10
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

/**
 * buildZatcaQrPayload
 * Encodes ZATCA Phase-2 TLV (simplified) as Base64.
 * Tags: 1=Seller, 2=VAT#, 3=Timestamp, 4=TotalWithVAT, 5=VATAmount
 */
const tlvField = (tag: number, value: string): Uint8Array => {
  const enc = new TextEncoder().encode(value)
  return new Uint8Array([tag, enc.length, ...enc])
}

export const buildZatcaQrPayload = (
  sellerName:  string,
  vatNumber:   string,
  timestamp:   string,
  totalSar:    number,
  vatSar:      number,
): string => {
  const fields = [
    tlvField(1, sellerName),
    tlvField(2, vatNumber),
    tlvField(3, timestamp),
    tlvField(4, totalSar.toFixed(2)),
    tlvField(5, vatSar.toFixed(2)),
  ]
  const total  = fields.reduce((n, f) => n + f.length, 0)
  const merged = new Uint8Array(total)
  let offset   = 0
  for (const f of fields) { merged.set(f, offset); offset += f.length }

  // Convert to Base64 using standard btoa
  let binary = ''
  for (const byte of merged) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * createGexInvoice
 * Generates a ZATCA Phase-2 compliant e-invoice for a confirmed contract.
 * Appends to the gexInvoices store and updates contract.invoiceId.
 */
export const createGexInvoice = (
  contract:  GexContract,
  lot:       GexLot,
  vendor:    GexVendor,
  buyerName: string,
): GexInvoice => {
  const uuid   = generateUUIDv4()
  const now    = new Date()
  const isoDate = now.toISOString().split('T')[0]
  const isoTime = now.toISOString().split('T')[1].split('.')[0]
  const invNum  = `INV-GEX-${now.getFullYear()}-${String(invoiceCounter++).padStart(4, '0')}`

  // Line items
  const fobLine: GexInvoiceLineItem = {
    description:  `Green Coffee — ${lot.origin} (${lot.variety}, ${lot.process}) · ${contract.quantityKg} kg`,
    qty:          contract.quantityKg,
    unitPriceSar: contract.fobSarPerKg,
    vatRate:      0,    // FOB value — VAT applied at landed step
    lineNetSar:   Math.round(contract.fobSarPerKg * contract.quantityKg * 100) / 100,
    lineVatSar:   0,
    lineTotalSar: Math.round(contract.fobSarPerKg * contract.quantityKg * 100) / 100,
  }
  const freightSar    = Math.round(contract.freightUsdPerKg * contract.exchangeRateUsed * (1 + contract.exchangeBufferPct / 100) * contract.quantityKg * 100) / 100
  const freightLine: GexInvoiceLineItem = {
    description:  `Sea Freight & Insurance · ${contract.quantityKg} kg`,
    qty:          contract.quantityKg,
    unitPriceSar: Math.round(contract.freightUsdPerKg * contract.exchangeRateUsed * (1 + contract.exchangeBufferPct / 100) * 100) / 100,
    vatRate:      0,
    lineNetSar:   freightSar,
    lineVatSar:   0,
    lineTotalSar: freightSar,
  }
  const cfrTotal       = fobLine.lineTotalSar + freightSar
  const dutyAmount     = Math.round(cfrTotal * (contract.customsDutyPct / 100) * 100) / 100
  const dutyLine: GexInvoiceLineItem = {
    description:  `Customs Duty ${contract.customsDutyPct}% · HS 0901.11 (Green Coffee)`,
    qty:          1,
    unitPriceSar: dutyAmount,
    vatRate:      0,
    lineNetSar:   dutyAmount,
    lineVatSar:   0,
    lineTotalSar: dutyAmount,
  }
  const subtotal   = cfrTotal + dutyAmount
  const vatAmount  = Math.round(subtotal * (contract.vatPct / 100) * 100) / 100
  const vatLine: GexInvoiceLineItem = {
    description:  `VAT ${contract.vatPct}% (ZATCA Phase 2)`,
    qty:          1,
    unitPriceSar: vatAmount,
    vatRate:      contract.vatPct / 100,
    lineNetSar:   0,
    lineVatSar:   vatAmount,
    lineTotalSar: vatAmount,
  }

  const vatNumber = '300123456789003'   // placeholder buyer VAT
  const qr = buildZatcaQrPayload(
    vendor.companyName,
    vatNumber,
    `${isoDate}T${isoTime}`,
    subtotal + vatAmount,
    vatAmount,
  )

  const invoice: GexInvoice = {
    uuid,
    invoiceNumber:  invNum,
    issueDate:      isoDate,
    issueTime:      isoTime,
    sellerName:     vendor.companyName,
    buyerName,
    contractId:     contract.id,
    lineItems:      [fobLine, freightLine, dutyLine, vatLine],
    subtotalSar:    Math.round(subtotal * 100) / 100,
    vatAmountSar:   vatAmount,
    totalSar:       Math.round((subtotal + vatAmount) * 100) / 100,
    vatNumber,
    qrCodePayload:  qr,
    status:         'ISSUED',
  }

  gexInvoices.push(invoice)
  contract.invoiceId = invNum
  return invoice
}

// ── 3d  Vendor / Lot ID generators ────────────────────────────────────────

export const nextVendorId = () => `VND-${String(gexVendors.length + 1).padStart(3, '0')}`
export const nextLotId    = () => `GEX-${String(gexLots.length + 1).padStart(3, '0')}`
export const nextContractId = () => `CON-${String(gexContracts.length + 1).padStart(3, '0')}`

// ── 3e  Helper: resolve vendor / lot safely ───────────────────────────────

export const findVendor = (id: string) => gexVendors.find(v => v.id === id)
export const findGexLot = (id: string) => gexLots.find(l => l.id === id)
export const findContract = (id: string) => gexContracts.find(c => c.id === id)
