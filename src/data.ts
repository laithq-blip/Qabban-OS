// ─────────────────────────────────────────────────────────────────────────────
//  Qabban OS  —  Master Data & Business Logic
//  Synced with: Qabban OS Regional Master Ledger
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── Climate Presets ──────────────────────────────────────────────────────────
// Two regional climate archetypes used to auto-configure new branches.
// Inland  = Riyadh pattern  — arid, low humidity, LOW baseline risk
// Coastal = Jeddah / Dammam — humid, higher baseline, escalates faster
export type ClimateType = 'Inland' | 'Coastal'

export interface ClimatePreset {
  type:            ClimateType
  label:           string          // display name
  description:     string
  typicalHumidity: number          // seeded on creation
  typicalTemp:     number
  // Risk thresholds (humidity %) — override classifyHumidityRisk defaults
  threshLow:       number          // below this → LOW
  threshModerate:  number          // below this → MODERATE
  threshHigh:      number          // below this → HIGH
  // ≥ threshHigh → CRITICAL
  acuteRiskNote:   string          // shown on card
  storageAdvice:   string
}

export const CLIMATE_PRESETS: Record<ClimateType, ClimatePreset> = {
  Inland: {
    type:            'Inland',
    label:           'Inland — Arid',
    description:     'Continental / desert interior. Low ambient humidity year-round. Risk escalates sharply only during rare humid spells or poor ventilation.',
    typicalHumidity: 40,
    typicalTemp:     24,
    threshLow:       50,   // < 50 % → LOW
    threshModerate:  62,   // 50–61 % → MODERATE
    threshHigh:      75,   // 62–74 % → HIGH  (≥75 → CRITICAL)
    acuteRiskNote:   'Risk: CRITICAL if humidity ≥ 75 % — rare but rapid mould onset',
    storageAdvice:   'Standard ventilation sufficient. Check sensors weekly.',
  },
  Coastal: {
    type:            'Coastal',
    label:           'Coastal — Humid',
    description:     'Sea-facing or Gulf coast location. Consistently elevated humidity. Requires active dehumidification and tighter monitoring cadence.',
    typicalHumidity: 65,
    typicalTemp:     28,
    threshLow:       45,   // < 45 % → LOW   (tighter band)
    threshModerate:  55,   // 45–54 % → MODERATE
    threshHigh:      65,   // 55–64 % → HIGH  (≥65 → CRITICAL)
    acuteRiskNote:   'Risk: CRITICAL if humidity ≥ 65 % — dehumidify immediately',
    storageAdvice:   'Active dehumidification required. Daily sensor checks.',
  },
}

// Re-export a preset-aware risk classifier so new branches use correct thresholds
export const classifyRiskForPreset = (
  humidity: number,
  climate: ClimateType
): Branch['riskStatus'] => {
  const p = CLIMATE_PRESETS[climate]
  if (humidity <  p.threshLow)      return 'LOW'
  if (humidity <  p.threshModerate) return 'MODERATE'
  if (humidity <  p.threshHigh)     return 'HIGH'
  return 'CRITICAL'
}

export interface Branch {
  id:          string
  name:        string          // widened from union — supports user-added branches
  city:        string
  climateType: ClimateType
  humidity:    number
  temperature: number
  lastChecked: string
  riskStatus:  'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  activeLots:  number
  totalGreenKg: number
}

export interface CafeClient {
  id: string
  username: string
  password: string
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

// ─── Roasting Interest (Pre-Order for OUT OF STOCK origins) ────────────────
// Submitted by cafes when an origin has 0 kg live roasted balance.
// Captures demand so the roaster knows what to schedule next.
export interface RoastingInterest {
  id: string
  cafeId: string
  cafeName: string
  origin: string             // catalog origin key
  interestedKg: number       // how many kg the cafe wants
  submittedAt: string
  notes: string
  status: 'NEW' | 'SEEN' | 'SCHEDULED'
}

// ─── Shrinkage formula ─────────────────────────────────────────────────────
export const applyRoastShrinkage = (greenKg: number): number =>
  Math.round(greenKg * 0.82 * 10) / 10

export const roastedToGreenEquiv = (roastedKg: number): number =>
  Math.round((roastedKg / 0.82) * 10) / 10

// ─── Humidity risk classifier ──────────────────────────────────────────────
export const classifyHumidityRisk = (humidity: number): Branch['riskStatus'] => {
  if (humidity < 50) return 'LOW'
  if (humidity < 62) return 'MODERATE'
  if (humidity < 75) return 'HIGH'
  return 'CRITICAL'
}

// ─────────────────────────────────────────────────────────────────────────────
//  Live Balance Calculator
//  Only DISPATCHED requests reduce live stock; CANCELLED are excluded entirely.
// ─────────────────────────────────────────────────────────────────────────────

export interface LotLiveBalance {
  lotId:                string
  purchasedGreenKg:     number
  purchasedRoastedKg:   number
  dispatchedRoastedKg:  number
  dispatchedGreenEquiv: number
  liveGreenKg:          number
  liveRoastedKg:        number
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
  const dispatchedByLot = new Map<string, number>()
  for (const r of requests) {
    if (r.status === 'DISPATCHED') {
      dispatchedByLot.set(r.lotId, (dispatchedByLot.get(r.lotId) ?? 0) + r.quantityKg)
    }
  }

  const byLot = new Map<string, LotLiveBalance>()
  let totPurchasedGreen    = 0
  let totPurchasedRoasted  = 0
  let totDispatchedRoasted = 0
  let totDispatchedGreen   = 0

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
export const getFifoLot = (lots: CoffeeLot[], origin: string): CoffeeLot | undefined =>
  lots
    .filter(l => l.origin === origin && l.status !== 'RECALLED')
    .sort((a, b) => a.roastDate.localeCompare(b.roastDate))[0]

// ─────────────────────────────────────────────────────────────────────────────
//  CATALOG MASTER — 6 canonical origins, Qabban OS Regional Master Ledger
//  Always shown in the Cafe Portal. Drives the catalog-led view.
// ─────────────────────────────────────────────────────────────────────────────
export interface CatalogOrigin {
  key: string           // matches lot.origin exactly
  displayName: string
  variety: string
  process: string
  flavorNotes: string[]
  description: string
}

export const CATALOG_ORIGINS: CatalogOrigin[] = [
  {
    key:         'Ethiopia Yirgacheffe',
    displayName: 'Ethiopia Yirgacheffe',
    variety:     'Heirloom',
    process:     'Natural',
    flavorNotes: ['Blueberry', 'Jasmine'],
    description: 'A classic Ethiopian natural with pronounced fruit-forward complexity. Notes of wild blueberry and floral jasmine.',
  },
  {
    key:         'Brazil Cerrado',
    displayName: 'Brazil Cerrado',
    variety:     'Catuai',
    process:     'Pulped Natural',
    flavorNotes: ['Milk Chocolate', 'Almond'],
    description: 'Grown on the high-altitude Cerrado plateau. Smooth and balanced — the ideal everyday espresso base.',
  },
  {
    key:         'Colombia Huila',
    displayName: 'Colombia Huila',
    variety:     'Caturra',
    process:     'Washed',
    flavorNotes: ['Caramel', 'Red Apple'],
    description: 'From the Huila department in southern Colombia. Bright washed clarity with clean caramel sweetness and a crisp apple finish.',
  },
  {
    key:         'Yemen Khawlani',
    displayName: 'Yemen Khawlani',
    variety:     'Heirloom',
    process:     'Natural',
    flavorNotes: ['Spices', 'Dried Fruits'],
    description: 'Sourced from ancient terraced farms in the Khawlan highlands. Rare and complex with layers of warm spice and sun-dried fruit.',
  },
  {
    key:         'Kenya AA',
    displayName: 'Kenya AA',
    variety:     'SL28',
    process:     'Washed',
    flavorNotes: ['Blackcurrant', 'Citrus'],
    description: 'Kenya AA grade, washed for exceptional clarity. Intense blackcurrant brightness and vibrant citrus acidity.',
  },
  {
    key:         'Indonesia Sumatra',
    displayName: 'Indonesia Sumatra',
    variety:     'Lintong',
    process:     'Wet-Hulled',
    flavorNotes: ['Cedar', 'Cocoa'],
    description: 'Wet-hulled (Giling Basah) from the Lintong region. Full-bodied and earthy with cedar and dark cocoa. Exceptionally low acidity.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
//  Coffee Lots — synced exactly with Qabban OS Regional Master Ledger
//
//  Corrections applied:
//    LOT-003  Yemen Khawlani   (was: Yemen Haraaz / Typica / Natural Dry)
//    LOT-004  Yemen Khawlani   (was: Guatemala Antigua / Bourbon / Honey — REMOVED)
//    LOT-005  Kenya AA         (was: Kenya AA Kiambu / Double Fermented)
//    LOT-007  Indonesia Sumatra (was: Costa Rica Tarrazú — NOT in master ledger, REMOVED)
// ─────────────────────────────────────────────────────────────────────────────
export const coffeeLots: CoffeeLot[] = [
  // ── Ethiopia Yirgacheffe ──────────────────────────────────────────────────
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
    flavorNotes: ['Blueberry', 'Jasmine'],
    branch: 'Riyadh',
    gradeScore: 92,
  },
  // ── Colombia Huila ────────────────────────────────────────────────────────
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
    flavorNotes: ['Caramel', 'Red Apple'],
    branch: 'Jeddah',
    gradeScore: 89,
  },
  // ── Yemen Khawlani (Batch 1) — was Yemen Haraaz ───────────────────────────
  {
    id: 'LOT-003',
    origin: 'Yemen Khawlani',
    variety: 'Heirloom',
    process: 'Natural',
    greenWeightKg: 200,
    roastedWeightKg: applyRoastShrinkage(200),
    roastDate: '2026-01-28',
    expiryDate: '2026-04-28',
    status: 'MONITOR',
    flavorNotes: ['Spices', 'Dried Fruits'],
    branch: 'Dammam',
    gradeScore: 88,
  },
  // ── Yemen Khawlani (Batch 2) — was Guatemala Antigua (CORRECTED) ──────────
  {
    id: 'LOT-004',
    origin: 'Yemen Khawlani',
    variety: 'Heirloom',
    process: 'Natural',
    greenWeightKg: 450,
    roastedWeightKg: applyRoastShrinkage(450),
    roastDate: '2026-02-18',
    expiryDate: '2026-05-18',
    status: 'OPTIMAL',
    flavorNotes: ['Spices', 'Dried Fruits'],
    branch: 'Riyadh',
    gradeScore: 91,
  },
  // ── Kenya AA — was "Kenya AA Kiambu / Double Fermented" ───────────────────
  {
    id: 'LOT-005',
    origin: 'Kenya AA',
    variety: 'SL28',
    process: 'Washed',
    greenWeightKg: 320,
    roastedWeightKg: applyRoastShrinkage(320),
    roastDate: '2026-01-20',
    expiryDate: '2026-04-20',
    status: 'CRITICAL',
    flavorNotes: ['Blackcurrant', 'Citrus'],
    branch: 'Dammam',
    gradeScore: 81,
  },
  // ── Brazil Cerrado ────────────────────────────────────────────────────────
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
    flavorNotes: ['Milk Chocolate', 'Almond'],
    branch: 'Jeddah',
    gradeScore: 87,
  },
  // ── Indonesia Sumatra (Batch 1) — was Costa Rica Tarrazú (CORRECTED) ──────
  {
    id: 'LOT-007',
    origin: 'Indonesia Sumatra',
    variety: 'Lintong',
    process: 'Wet-Hulled',
    greenWeightKg: 150,
    roastedWeightKg: applyRoastShrinkage(150),
    roastDate: '2026-02-05',
    expiryDate: '2026-05-05',
    status: 'MONITOR',
    flavorNotes: ['Cedar', 'Cocoa'],
    branch: 'Riyadh',
    gradeScore: 85,
  },
  // ── Indonesia Sumatra (Batch 2) ───────────────────────────────────────────
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
    flavorNotes: ['Cedar', 'Cocoa'],
    branch: 'Dammam',
    gradeScore: 84,
  },
]

// ─── Mock branches ─────────────────────────────────────────────────────────
export const branches: Branch[] = [
  {
    id:          'BR-RUH',
    name:        'Riyadh',
    city:        'Riyadh',
    climateType: 'Inland',
    humidity:    45,
    temperature: 22,
    lastChecked: '2026-02-24 08:30',
    riskStatus:  'LOW',
    activeLots:  coffeeLots.filter(l => l.branch === 'Riyadh').length,
    totalGreenKg: coffeeLots.filter(l => l.branch === 'Riyadh').reduce((s, l) => s + l.greenWeightKg, 0),
  },
  {
    id:          'BR-JED',
    name:        'Jeddah',
    city:        'Jeddah',
    climateType: 'Coastal',
    humidity:    68,
    temperature: 26,
    lastChecked: '2026-02-24 08:28',
    riskStatus:  'HIGH',
    activeLots:  coffeeLots.filter(l => l.branch === 'Jeddah').length,
    totalGreenKg: coffeeLots.filter(l => l.branch === 'Jeddah').reduce((s, l) => s + l.greenWeightKg, 0),
  },
  {
    id:          'BR-DMM',
    name:        'Dammam',
    city:        'Dammam',
    climateType: 'Coastal',
    humidity:    80,
    temperature: 28,
    lastChecked: '2026-02-24 08:25',
    riskStatus:  'CRITICAL',
    activeLots:  coffeeLots.filter(l => l.branch === 'Dammam').length,
    totalGreenKg: coffeeLots.filter(l => l.branch === 'Dammam').reduce((s, l) => s + l.greenWeightKg, 0),
  },
]

// ─── Mock cafe clients ──────────────────────────────────────────────────────
export const cafeClients: CafeClient[] = [
  { id: 'CAF-001', username: 'alnokhba',    password: 'cafe123', name: 'Al Nokhba Specialty', branch: 'Riyadh', tier: 'Gold'   },
  { id: 'CAF-002', username: 'qahwa_bahr',  password: 'cafe123', name: 'Qahwa Al Bahr',        branch: 'Jeddah', tier: 'Silver' },
  { id: 'CAF-003', username: 'pearl_roast', password: 'cafe123', name: 'Pearl Roast Café',      branch: 'Dammam', tier: 'Bronze' },
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
    status: 'DISPATCHED',
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
    status: 'CONFIRMED',
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

// ─── In-memory roasting interest store (pre-orders for OUT OF STOCK) ───────
export const roastingInterests: RoastingInterest[] = []
