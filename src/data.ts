// ─────────────────────────────────────────────
//  Qabban OS  —  Mock Data & Business Logic
// ─────────────────────────────────────────────

export type LotStatus = 'OPTIMAL' | 'MONITOR' | 'CRITICAL' | 'RECALLED'

export interface RecallInfo {
  initiatedAt: string          // ISO timestamp
  instructions: string         // roaster's recall instructions
  notifiedCafes: string[]      // cafe IDs that had DISPATCHED orders for this lot
}

export interface CoffeeLot {
  id: string
  origin: string
  variety: string
  process: string
  greenWeightKg: number     // PURCHASED green weight — never mutated
  roastedWeightKg: number   // PURCHASED roasted weight (green × 0.82) — never mutated
  roastDate: string
  expiryDate: string
  status: LotStatus
  flavorNotes: string[]
  branch: 'Riyadh' | 'Jeddah' | 'Dammam'
  gradeScore: number
  recallInfo?: RecallInfo    // populated when status === 'RECALLED'
}

export interface Branch {
  id: string
  name: 'Riyadh' | 'Jeddah' | 'Dammam'
  humidity: number          // percent
  temperature: number       // celsius
  lastChecked: string
  riskStatus: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  activeLots: number
  totalGreenKg: number
}

export interface CafeClient {
  id: string
  username: string
  password: string          // hashed in real-world; plain for demo
  name: string
  branch: 'Riyadh' | 'Jeddah' | 'Dammam'
  tier: 'Gold' | 'Silver' | 'Bronze'
}

export interface BeanRequest {
  id: string
  cafeId: string
  cafeName: string
  lotId: string
  lotOrigin: string
  quantityKg: number        // roasted kg ordered by the cafe
  requestedAt: string
  status: 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'CANCELLED'
  notes: string
}

// ─── Shrinkage formula ─────────────────────────────────────────────────────
export const applyRoastShrinkage = (greenKg: number): number =>
  Math.round(greenKg * 0.82 * 10) / 10

// Reverse: convert a dispatched roasted quantity back to its green equivalent
export const roastedToGreenEquiv = (roastedKg: number): number =>
  Math.round((roastedKg / 0.82) * 10) / 10

// ─── Humidity risk classifier ──────────────────────────────────────────────
export const classifyHumidityRisk = (
  humidity: number
): Branch['riskStatus'] => {
  if (humidity < 50) return 'LOW'
  if (humidity < 62) return 'MODERATE'
  if (humidity < 75) return 'HIGH'
  return 'CRITICAL'
}

// ─────────────────────────────────────────────────────────────────────────────
//  Live Balance Calculator
//
//  Rule: only DISPATCHED requests reduce live stock.
//  CANCELLED orders are fully excluded — their weight is restored.
//
//  dispatchedRoastedKg  = sum of quantityKg for DISPATCHED (non-CANCELLED) requests
//  dispatchedGreenEquiv = dispatchedRoastedKg / 0.82   (reverse shrinkage)
//  liveGreenKg          = purchasedGreenKg − dispatchedGreenEquiv
//  liveRoastedKg        = liveGreenKg × 0.82
// ─────────────────────────────────────────────────────────────────────────────

export interface LotLiveBalance {
  lotId:                 string
  purchasedGreenKg:      number   // original purchase weight
  purchasedRoastedKg:    number   // original roasted weight
  dispatchedRoastedKg:   number   // total dispatched (roasted kg)
  dispatchedGreenEquiv:  number   // dispatched converted back to green
  liveGreenKg:           number   // balance remaining (green)
  liveRoastedKg:         number   // balance remaining (roasted)
}

export interface AggregateBalance {
  purchasedGreenKg:     number
  purchasedRoastedKg:   number
  dispatchedRoastedKg:  number
  dispatchedGreenEquiv: number
  liveGreenKg:          number
  liveRoastedKg:        number
  byLot: Map<string, LotLiveBalance>
}

export const calcLiveBalance = (
  lots: CoffeeLot[],
  requests: BeanRequest[]
): AggregateBalance => {
  // Build per-lot dispatched totals from DISPATCHED requests only
  const dispatchedByLot = new Map<string, number>()
  for (const r of requests) {
    if (r.status === 'DISPATCHED') {
      dispatchedByLot.set(
        r.lotId,
        (dispatchedByLot.get(r.lotId) ?? 0) + r.quantityKg
      )
    }
  }

  const byLot = new Map<string, LotLiveBalance>()
  let totPurchasedGreen   = 0
  let totPurchasedRoasted = 0
  let totDispatchedRoasted = 0
  let totDispatchedGreen  = 0

  for (const lot of lots) {
    const dispatchedRoasted = Math.round((dispatchedByLot.get(lot.id) ?? 0) * 10) / 10
    const dispatchedGreen   = roastedToGreenEquiv(dispatchedRoasted)
    const liveGreen         = Math.round(Math.max(0, lot.greenWeightKg - dispatchedGreen) * 10) / 10
    const liveRoasted       = applyRoastShrinkage(liveGreen)

    byLot.set(lot.id, {
      lotId:                lot.id,
      purchasedGreenKg:     lot.greenWeightKg,
      purchasedRoastedKg:   lot.roastedWeightKg,
      dispatchedRoastedKg:  dispatchedRoasted,
      dispatchedGreenEquiv: dispatchedGreen,
      liveGreenKg:          liveGreen,
      liveRoastedKg:        liveRoasted,
    })

    totPurchasedGreen    += lot.greenWeightKg
    totPurchasedRoasted  += lot.roastedWeightKg
    totDispatchedRoasted += dispatchedRoasted
    totDispatchedGreen   += dispatchedGreen
  }

  return {
    purchasedGreenKg:     Math.round(totPurchasedGreen * 10) / 10,
    purchasedRoastedKg:   Math.round(totPurchasedRoasted * 10) / 10,
    dispatchedRoastedKg:  Math.round(totDispatchedRoasted * 10) / 10,
    dispatchedGreenEquiv: Math.round(totDispatchedGreen * 10) / 10,
    liveGreenKg:          Math.round((totPurchasedGreen  - totDispatchedGreen) * 10) / 10,
    liveRoastedKg:        Math.round((totPurchasedRoasted - totDispatchedRoasted) * 10) / 10,
    byLot,
  }
}

// ─── FIFO Lot Selector ─────────────────────────────────────────────────────
// Returns the oldest available (non-RECALLED) lot for a given origin,
// determined by roastDate ascending. Used by Log New Roast to enforce FIFO.
export const getFifoLot = (
  lots: CoffeeLot[],
  origin: string
): CoffeeLot | undefined =>
  lots
    .filter(l => l.origin === origin && l.status !== 'RECALLED')
    .sort((a, b) => a.roastDate.localeCompare(b.roastDate))[0]

// ─── Mock coffee lots ──────────────────────────────────────────────────────
export const coffeeLots: CoffeeLot[] = [
  {
    id: 'LOT-001',
    origin: 'Ethiopia Yirgacheffe',
    variety: 'Heirloom',
    process: 'Natural',
    greenWeightKg: 500,
    roastedWeightKg: applyRoastShrinkage(500),
    roastDate: '2026-02-10',
    expiryDate: '2026-05-10',
    status: 'OPTIMAL',
    flavorNotes: ['Blueberry', 'Jasmine', 'Dark Chocolate'],
    branch: 'Riyadh',
    gradeScore: 92,
  },
  {
    id: 'LOT-002',
    origin: 'Colombia Huila',
    variety: 'Caturra',
    process: 'Washed',
    greenWeightKg: 380,
    roastedWeightKg: applyRoastShrinkage(380),
    roastDate: '2026-02-14',
    expiryDate: '2026-05-14',
    status: 'OPTIMAL',
    flavorNotes: ['Caramel', 'Red Apple', 'Citrus'],
    branch: 'Jeddah',
    gradeScore: 89,
  },
  {
    id: 'LOT-003',
    origin: 'Yemen Haraaz',
    variety: 'Typica',
    process: 'Natural Dry',
    greenWeightKg: 200,
    roastedWeightKg: applyRoastShrinkage(200),
    roastDate: '2026-01-28',
    expiryDate: '2026-04-28',
    status: 'MONITOR',
    flavorNotes: ['Dried Fruit', 'Spice', 'Wine'],
    branch: 'Dammam',
    gradeScore: 85,
  },
  {
    id: 'LOT-004',
    origin: 'Guatemala Antigua',
    variety: 'Bourbon',
    process: 'Honey',
    greenWeightKg: 450,
    roastedWeightKg: applyRoastShrinkage(450),
    roastDate: '2026-02-18',
    expiryDate: '2026-05-18',
    status: 'OPTIMAL',
    flavorNotes: ['Brown Sugar', 'Peach', 'Walnut'],
    branch: 'Riyadh',
    gradeScore: 91,
  },
  {
    id: 'LOT-005',
    origin: 'Kenya AA Kiambu',
    variety: 'SL28',
    process: 'Double Fermented',
    greenWeightKg: 320,
    roastedWeightKg: applyRoastShrinkage(320),
    roastDate: '2026-01-20',
    expiryDate: '2026-04-20',
    status: 'CRITICAL',
    flavorNotes: ['Blackcurrant', 'Tomato', 'Cedar'],
    branch: 'Dammam',
    gradeScore: 78,
  },
  {
    id: 'LOT-006',
    origin: 'Brazil Cerrado',
    variety: 'Catuai',
    process: 'Pulped Natural',
    greenWeightKg: 600,
    roastedWeightKg: applyRoastShrinkage(600),
    roastDate: '2026-02-20',
    expiryDate: '2026-05-20',
    status: 'OPTIMAL',
    flavorNotes: ['Hazelnut', 'Milk Chocolate', 'Almond'],
    branch: 'Jeddah',
    gradeScore: 87,
  },
  {
    id: 'LOT-007',
    origin: 'Costa Rica Tarrazú',
    variety: 'Gesha',
    process: 'Anaerobic',
    greenWeightKg: 150,
    roastedWeightKg: applyRoastShrinkage(150),
    roastDate: '2026-02-05',
    expiryDate: '2026-05-05',
    status: 'MONITOR',
    flavorNotes: ['Bergamot', 'Tropical Fruit', 'Rose'],
    branch: 'Riyadh',
    gradeScore: 93,
  },
  {
    id: 'LOT-008',
    origin: 'Indonesia Sumatra',
    variety: 'Lintong',
    process: 'Wet-Hulled',
    greenWeightKg: 280,
    roastedWeightKg: applyRoastShrinkage(280),
    roastDate: '2026-02-22',
    expiryDate: '2026-05-22',
    status: 'OPTIMAL',
    flavorNotes: ['Earthy', 'Cedar', 'Dark Cocoa'],
    branch: 'Dammam',
    gradeScore: 84,
  },
]

// ─── Mock branches ─────────────────────────────────────────────────────────
export const branches: Branch[] = [
  {
    id: 'BR-RUH',
    name: 'Riyadh',
    humidity: 45,
    temperature: 22,
    lastChecked: '2026-02-24 08:30',
    riskStatus: 'LOW',
    activeLots: coffeeLots.filter((l) => l.branch === 'Riyadh').length,
    totalGreenKg: coffeeLots
      .filter((l) => l.branch === 'Riyadh')
      .reduce((s, l) => s + l.greenWeightKg, 0),
  },
  {
    id: 'BR-JED',
    name: 'Jeddah',
    humidity: 68,
    temperature: 26,
    lastChecked: '2026-02-24 08:28',
    riskStatus: 'HIGH',
    activeLots: coffeeLots.filter((l) => l.branch === 'Jeddah').length,
    totalGreenKg: coffeeLots
      .filter((l) => l.branch === 'Jeddah')
      .reduce((s, l) => s + l.greenWeightKg, 0),
  },
  {
    id: 'BR-DMM',
    name: 'Dammam',
    humidity: 80,
    temperature: 28,
    lastChecked: '2026-02-24 08:25',
    riskStatus: 'CRITICAL',
    activeLots: coffeeLots.filter((l) => l.branch === 'Dammam').length,
    totalGreenKg: coffeeLots
      .filter((l) => l.branch === 'Dammam')
      .reduce((s, l) => s + l.greenWeightKg, 0),
  },
]

// ─── Mock cafe clients ──────────────────────────────────────────────────────
export const cafeClients: CafeClient[] = [
  {
    id: 'CAF-001',
    username: 'alnokhba',
    password: 'cafe123',
    name: 'Al Nokhba Specialty',
    branch: 'Riyadh',
    tier: 'Gold',
  },
  {
    id: 'CAF-002',
    username: 'qahwa_bahr',
    password: 'cafe123',
    name: 'Qahwa Al Bahr',
    branch: 'Jeddah',
    tier: 'Silver',
  },
  {
    id: 'CAF-003',
    username: 'pearl_roast',
    password: 'cafe123',
    name: 'Pearl Roast Café',
    branch: 'Dammam',
    tier: 'Bronze',
  },
]

// ─── In-memory bean requests store ────────────────────────────────────────
export const beanRequests: BeanRequest[] = [
  {
    id: 'REQ-001',
    cafeId: 'CAF-002',
    cafeName: 'Qahwa Al Bahr',
    lotId: 'LOT-002',
    lotOrigin: 'Colombia Huila',
    quantityKg: 20,
    requestedAt: '2026-02-23 14:12',
    status: 'DISPATCHED',       // already dispatched — deducts from LOT-002 live balance
    notes: 'Urgent — weekend event',
  },
  {
    id: 'REQ-002',
    cafeId: 'CAF-001',
    cafeName: 'Al Nokhba Specialty',
    lotId: 'LOT-001',
    lotOrigin: 'Ethiopia Yirgacheffe',
    quantityKg: 50,
    requestedAt: '2026-02-24 09:05',
    status: 'CONFIRMED',        // confirmed but not dispatched yet — no deduction
    notes: 'Monthly standing order',
  },
  {
    id: 'REQ-003',
    cafeId: 'CAF-003',
    cafeName: 'Pearl Roast Café',
    lotId: 'LOT-006',
    lotOrigin: 'Brazil Cerrado',
    quantityKg: 30,
    requestedAt: '2026-02-24 11:20',
    status: 'PENDING',
    notes: '',
  },
]
