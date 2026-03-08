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
  branch: string    // widened — supports runtime-added branches
  gradeScore: number
  recallInfo?: RecallInfo    // populated when status === 'RECALLED'
  labelImageUrl?: string     // optional sack-label photo (base64 data-URL or blob URL)
                             // stored as Label_Image_URL — SFDA Article 18 traceability
  // ── Qabban Financial Intelligence fields ────────────────────────────────
  costPerKg?: number        // Green bean purchase cost (SAR/kg) — used for True Roasted Cost
  targetMargin?: number     // Target gross margin % (e.g. 35 = 35%) — drives Wholesale Price
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

export type ClientTier = 'Silver' | 'Gold' | 'Platinum'

export interface CafeClient {
  id: string
  username: string
  password: string
  name: string
  branch: string    // widened — supports runtime-added branches
  tier: ClientTier
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

// ─────────────────────────────────────────────────────────────────────────────
//  SPONGE EFFECT DYNAMIC COEFFICIENT ENGINE
//  Floating Yield Coefficient that adjusts the 0.82 shrinkage baseline
//  based on real-time or branch-level relative humidity (RH).
//
//  Rule A — Coastal / High Humidity (RH > 70 %)
//    Green beans absorb atmospheric moisture → effective "green equivalent"
//    weight is heavier → increase coefficient by +0.5 % (adds 0.005)
//    Effect: more of the purchased green weight is actually usable roasted product
//
//  Rule B — Inland / Arid (RH < 20 %)
//    Green beans lose moisture faster via evaporation → usable weight shrinks
//    more than baseline → decrease coefficient by −0.3 % (subtracts 0.003)
//    Effect: less roasted product per kg of purchased green
//
//  When 20 % ≤ RH ≤ 70 % the baseline 0.82 coefficient is used as-is.
// ─────────────────────────────────────────────────────────────────────────────

export const SPONGE_BASELINE_COEFFICIENT = 0.82

/** Thresholds that trigger Sponge Effect adjustments */
export const SPONGE_RH_HIGH_THRESHOLD = 70   // % — Rule A: moisture absorption
export const SPONGE_RH_LOW_THRESHOLD  = 20   // % — Rule B: evaporation loss

/** Magnitude of each adjustment (as decimal fractions) */
export const SPONGE_HIGH_DELTA = +0.005  // +0.5 %
export const SPONGE_LOW_DELTA  = -0.003  // −0.3 %

/** Human-readable label for each active rule */
export type SpongeRule = 'BASELINE' | 'MOISTURE_ABSORPTION' | 'EVAPORATION_LOSS'

export interface SpongeCoeffResult {
  /** The final yield coefficient to apply (e.g. 0.825 or 0.817) */
  coefficient:   number
  /** Which rule is active */
  rule:          SpongeRule
  /** Relative humidity that was evaluated */
  humidity:      number
  /** Short diagnostic label for UI display */
  label:         string
  /** Delta applied vs baseline (+0.005, −0.003, or 0) */
  delta:         number
  /** Percentage representation of the coefficient (e.g. "82.5%") */
  pct:           string
}

/**
 * calcSpongeCoefficient
 * Core Sponge Effect engine. Given a branch's current relative humidity (RH),
 * returns the adjusted Floating Yield Coefficient and diagnostic metadata.
 *
 * @param humidity  Current RH reading (0–100 %)
 */
export const calcSpongeCoefficient = (humidity: number): SpongeCoeffResult => {
  if (humidity > SPONGE_RH_HIGH_THRESHOLD) {
    // Rule A — Coastal: moisture absorption adds weight → higher yield
    const coefficient = Math.round((SPONGE_BASELINE_COEFFICIENT + SPONGE_HIGH_DELTA) * 10000) / 10000
    return {
      coefficient,
      rule:    'MOISTURE_ABSORPTION',
      humidity,
      delta:   SPONGE_HIGH_DELTA,
      label:   `Rule A — Coastal High Humidity (RH ${humidity}% > ${SPONGE_RH_HIGH_THRESHOLD}%)`,
      pct:     (coefficient * 100).toFixed(1) + '%',
    }
  }

  if (humidity < SPONGE_RH_LOW_THRESHOLD) {
    // Rule B — Arid: evaporation loss reduces yield → lower coefficient
    const coefficient = Math.round((SPONGE_BASELINE_COEFFICIENT + SPONGE_LOW_DELTA) * 10000) / 10000
    return {
      coefficient,
      rule:    'EVAPORATION_LOSS',
      humidity,
      delta:   SPONGE_LOW_DELTA,
      label:   `Rule B — Inland Arid (RH ${humidity}% < ${SPONGE_RH_LOW_THRESHOLD}%)`,
      pct:     (coefficient * 100).toFixed(1) + '%',
    }
  }

  // Within normal range — baseline coefficient applies
  return {
    coefficient: SPONGE_BASELINE_COEFFICIENT,
    rule:        'BASELINE',
    humidity,
    delta:       0,
    label:       `Baseline — Normal RH (${SPONGE_RH_LOW_THRESHOLD}% ≤ RH ${humidity}% ≤ ${SPONGE_RH_HIGH_THRESHOLD}%)`,
    pct:         (SPONGE_BASELINE_COEFFICIENT * 100).toFixed(1) + '%',
  }
}

/**
 * Convenience: given a branch object (or just its humidity + city name),
 * return the Sponge coefficient. Used in balance calculations.
 */
export const spongeCoeffForBranch = (humidity: number): number =>
  calcSpongeCoefficient(humidity).coefficient

// ─── Shrinkage formula ─────────────────────────────────────────────────────
// The baseline formula always uses 0.82.
// For humidity-adjusted calculations use applyRoastShrinkageWithSponge().
export const applyRoastShrinkage = (greenKg: number): number =>
  Math.round(greenKg * SPONGE_BASELINE_COEFFICIENT * 10) / 10

/**
 * applyRoastShrinkageWithSponge
 * Applies the Sponge Effect coefficient instead of the flat 0.82 baseline.
 * Use this wherever live balance is calculated and a humidity reading exists.
 *
 * @param greenKg   Green coffee weight (kg)
 * @param humidity  Branch current RH (%)
 */
export const applyRoastShrinkageWithSponge = (greenKg: number, humidity: number): number => {
  const coeff = spongeCoeffForBranch(humidity)
  return Math.round(greenKg * coeff * 10) / 10
}

export const roastedToGreenEquiv = (roastedKg: number): number =>
  Math.round((roastedKg / SPONGE_BASELINE_COEFFICIENT) * 10) / 10

/**
 * roastedToGreenEquivWithSponge
 * Reverse of applyRoastShrinkageWithSponge — converts a roasted qty back to
 * its green equivalent using the humidity-adjusted coefficient.
 */
export const roastedToGreenEquivWithSponge = (roastedKg: number, humidity: number): number => {
  const coeff = spongeCoeffForBranch(humidity)
  return Math.round((roastedKg / coeff) * 10) / 10
}

// ─── Humidity risk classifier (LEGACY — Inland thresholds only) ────────────
// ⚠️  DEPRECATED: Use classifyRiskForPreset(humidity, climateType) instead.
//     This function uses Inland (Riyadh-style) thresholds and will produce
//     INCORRECT results for Coastal branches (Jeddah, Dammam).
//     Kept only for backward-compatibility reference; not called by any route.
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
  /** Sponge Effect metadata for this lot's branch */
  sponge:               SpongeCoeffResult
}

export interface AggregateBalance {
  purchasedGreenKg:     number
  purchasedRoastedKg:   number
  dispatchedRoastedKg:  number
  dispatchedGreenEquiv: number
  liveGreenKg:          number
  liveRoastedKg:        number
  byLot: Map<string, LotLiveBalance>
  /** Baseline (no Sponge) roasted total — for delta comparison in UI */
  baselineRoastedKg:    number
  /** Sponge-adjusted total − baseline total (can be positive or negative) */
  spongeAdjustmentKg:   number
}

export const calcLiveBalance = (
  lots:     CoffeeLot[],
  requests: BeanRequest[],
  branchList: Branch[] = branches
): AggregateBalance => {
  // Build a humidity lookup by branch name
  const humidityByBranch = new Map<string, number>()
  for (const b of branchList) {
    humidityByBranch.set(b.name, b.humidity)
  }

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
  let totBaselineRoasted   = 0
  let totSpongeRoasted     = 0

  for (const lot of lots) {
    // Resolve this lot's branch humidity (fallback to 50 % if not found)
    const branchHumidity = humidityByBranch.get(lot.branch) ?? 50
    const sponge         = calcSpongeCoefficient(branchHumidity)

    const dispatchedRoasted = Math.round((dispatchedByLot.get(lot.id) ?? 0) * 10) / 10
    // Use humidity-adjusted coefficient for the green equivalent reverse calc
    const dispatchedGreen   = roastedToGreenEquivWithSponge(dispatchedRoasted, branchHumidity)
    const liveGreen         = Math.round(Math.max(0, lot.greenWeightKg - dispatchedGreen) * 10) / 10
    // Live roasted balance uses the Sponge-adjusted coefficient
    const liveRoasted       = applyRoastShrinkageWithSponge(liveGreen, branchHumidity)

    byLot.set(lot.id, {
      lotId:                lot.id,
      purchasedGreenKg:     lot.greenWeightKg,
      purchasedRoastedKg:   lot.roastedWeightKg,
      dispatchedRoastedKg:  dispatchedRoasted,
      dispatchedGreenEquiv: dispatchedGreen,
      liveGreenKg:          liveGreen,
      liveRoastedKg:        liveRoasted,
      sponge,
    })

    totPurchasedGreen    += lot.greenWeightKg
    totPurchasedRoasted  += lot.roastedWeightKg
    totDispatchedRoasted += dispatchedRoasted
    totDispatchedGreen   += dispatchedGreen
    // Track baseline (0.82) vs sponge-adjusted totals for the delta display
    totBaselineRoasted   += applyRoastShrinkage(liveGreen)
    totSpongeRoasted     += liveRoasted
  }

  const spongeAdjustmentKg = Math.round((totSpongeRoasted - totBaselineRoasted) * 10) / 10

  return {
    purchasedGreenKg:     Math.round(totPurchasedGreen * 10) / 10,
    purchasedRoastedKg:   Math.round(totPurchasedRoasted * 10) / 10,
    dispatchedRoastedKg:  Math.round(totDispatchedRoasted * 10) / 10,
    dispatchedGreenEquiv: Math.round(totDispatchedGreen * 10) / 10,
    liveGreenKg:          Math.round((totPurchasedGreen  - totDispatchedGreen) * 10) / 10,
    liveRoastedKg:        Math.round(totSpongeRoasted * 10) / 10,
    baselineRoastedKg:    Math.round(totBaselineRoasted * 10) / 10,
    spongeAdjustmentKg,
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
    costPerKg: 48,
    targetMargin: 38,
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
    costPerKg: 42,
    targetMargin: 35,
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
    costPerKg: 65,
    targetMargin: 40,
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
    costPerKg: 65,
    targetMargin: 40,
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
    costPerKg: 55,
    targetMargin: 35,
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
    costPerKg: 32,
    targetMargin: 32,
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
    costPerKg: 38,
    targetMargin: 33,
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
    costPerKg: 38,
    targetMargin: 33,
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
    riskStatus:  'CRITICAL',
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
  { id: 'CAF-001', username: 'alnokhba',    password: 'cafe123', name: 'Al Nokhba Specialty', branch: 'Riyadh', tier: 'Gold'     },
  { id: 'CAF-002', username: 'qahwa_bahr',  password: 'cafe123', name: 'Qahwa Al Bahr',        branch: 'Jeddah', tier: 'Silver'   },
  { id: 'CAF-003', username: 'pearl_roast', password: 'cafe123', name: 'Pearl Roast Café',      branch: 'Dammam', tier: 'Platinum' },
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

// ─────────────────────────────────────────────────────────────────────────────
//  QABBAN FINANCIAL INTELLIGENCE ENGINE
//  Connects real-time environmental data (Sponge Effect) to pricing & P&L.
//
//  True Roasted Cost  = Green Bean Cost (SAR/kg) ÷ Live Yield Coefficient
//    → Accounts for actual shrinkage: if humidity raises yield, cost per
//      roasted kg drops; if aridity lowers yield, cost per roasted kg rises.
//
//  Wholesale Price    = True Roasted Cost ÷ (1 − Target Gross Margin %)
//    → Fixed to the BASELINE coefficient (0.82) so the price shown to cafes
//      never fluctuates with weather — only internal P&L changes.
//
//  Live Inventory Value = Wholesale Price × Live Roasted Balance (Sponge-adj)
//    → Uses the sponge-adjusted live weight so environmental gains/losses
//      are reflected in the portfolio valuation.
//
//  Environmental P&L  = Σ (Sponge Adjustment kg) × Wholesale Price
//    → The SAR value of kilograms gained or lost due to humidity rules.
// ─────────────────────────────────────────────────────────────────────────────

/** Roastery-wide default target gross margin (%) — overridable per lot */
export let defaultTargetMargin = 35   // 35 %

/** Update the roastery-wide default margin (called from Finance settings) */
export const setDefaultTargetMargin = (pct: number) => {
  defaultTargetMargin = Math.max(1, Math.min(99, Math.round(pct * 10) / 10))
}

// ─── Tier-based Margin Settings ──────────────────────────────────────────────
// Each client tier gets its own gross margin %, applied when calculating the
// wholesale price shown to that tier's cafes.
// Silver = entry-level (higher margin for roastery)
// Gold   = mid-tier
// Platinum = top-tier / VIP (lowest margin = best price for client)
export interface TierMargins {
  Silver:   number   // e.g. 40
  Gold:     number   // e.g. 35
  Platinum: number   // e.g. 28
}

export let tierMargins: TierMargins = {
  Silver:   40,
  Gold:     35,
  Platinum: 28,
}

/** Update one or all tier margins (called from Finance settings) */
export const setTierMargins = (updates: Partial<TierMargins>) => {
  for (const key of Object.keys(updates) as Array<keyof TierMargins>) {
    const val = updates[key]
    if (val !== undefined) {
      tierMargins[key] = Math.max(1, Math.min(99, Math.round(val * 10) / 10))
    }
  }
}

/** Get the effective margin for a given client tier */
export const marginForTier = (tier: ClientTier): number => {
  return tierMargins[tier] ?? defaultTargetMargin
}

export interface LotFinancials {
  lotId:             string
  origin:            string
  branch:            string
  costPerKg:         number   // green bean purchase cost (SAR/kg)
  targetMargin:      number   // target gross margin %
  yieldCoeff:        number   // sponge-adjusted coefficient for this lot's branch
  trueRoastedCost:   number   // costPerKg ÷ yieldCoeff  (SAR/kg roasted)
  wholesalePrice:    number   // fixed on BASELINE 0.82 for stable cafe pricing
  liveRoastedKg:     number   // sponge-adjusted live balance
  liveInventoryValue:number   // wholesalePrice × liveRoastedKg
  projectedProfit:   number   // (wholesalePrice − trueRoastedCost) × liveRoastedKg
  spongeKgDelta:     number   // kg gained/lost vs baseline
  environmentalPnL:  number   // spongeKgDelta × wholesalePrice
}

/**
 * calcTrueRoastedCost
 * True cost per kg of ROASTED coffee, accounting for humidity-adjusted shrinkage.
 *
 * @param costPerKgGreen  Green bean purchase cost (SAR/kg)
 * @param humidity        Branch current RH (%) — drives sponge coefficient
 */
export const calcTrueRoastedCost = (costPerKgGreen: number, humidity: number): number => {
  const coeff = spongeCoeffForBranch(humidity)
  return Math.round((costPerKgGreen / coeff) * 100) / 100
}

/**
 * calcWholesalePrice
 * Wholesale price per kg of roasted coffee at the target gross margin.
 * Uses BASELINE coefficient (0.82) so the price remains stable for cafes
 * regardless of daily humidity fluctuations.
 *
 * @param costPerKgGreen  Green bean purchase cost (SAR/kg)
 * @param targetMarginPct Target gross margin (e.g. 35 for 35 %)
 */
export const calcWholesalePrice = (costPerKgGreen: number, targetMarginPct: number): number => {
  const baselineCost = costPerKgGreen / SPONGE_BASELINE_COEFFICIENT
  const margin = Math.max(0.01, Math.min(0.99, targetMarginPct / 100))
  return Math.round((baselineCost / (1 - margin)) * 100) / 100
}

/**
 * calcLotFinancials
 * Full financial profile for a single lot, given its branch humidity.
 */
export const calcLotFinancials = (
  lot:         CoffeeLot,
  liveBalance: LotLiveBalance,
  branchHumidity: number,
  globalDefaultMargin: number = defaultTargetMargin,
  forceMargin?: number,          // when set, overrides both lot.targetMargin AND globalDefault
): LotFinancials => {
  const cost   = lot.costPerKg ?? 0
  const margin = forceMargin !== undefined ? forceMargin : (lot.targetMargin ?? globalDefaultMargin)
  const coeff  = liveBalance.sponge.coefficient

  const trueRoastedCost    = cost > 0 ? calcTrueRoastedCost(cost, branchHumidity) : 0
  const wholesalePrice     = cost > 0 ? calcWholesalePrice(cost, margin) : 0
  const liveRoastedKg      = liveBalance.liveRoastedKg
  const baselineRoastedKg  = applyRoastShrinkage(liveBalance.liveGreenKg)
  const spongeKgDelta      = Math.round((liveRoastedKg - baselineRoastedKg) * 10) / 10
  const liveInventoryValue = Math.round(wholesalePrice * liveRoastedKg * 100) / 100
  const projectedProfit    = Math.round((wholesalePrice - trueRoastedCost) * liveRoastedKg * 100) / 100
  const environmentalPnL   = Math.round(spongeKgDelta * wholesalePrice * 100) / 100

  return {
    lotId:             lot.id,
    origin:            lot.origin,
    branch:            lot.branch,
    costPerKg:         cost,
    targetMargin:      margin,
    yieldCoeff:        coeff,
    trueRoastedCost,
    wholesalePrice,
    liveRoastedKg,
    liveInventoryValue,
    projectedProfit,
    spongeKgDelta,
    environmentalPnL,
  }
}

export interface PortfolioFinancials {
  totalInventoryValue:  number   // Σ liveInventoryValue across all lots with cost data
  totalProjectedProfit: number   // Σ projectedProfit
  totalEnvironmentalPnL:number   // Σ environmentalPnL (Sponge SAR impact)
  totalSpongeKgDelta:   number   // Σ spongeKgDelta (total kg gained/lost)
  lotsWithPricing:      number   // count of lots that have costPerKg set
  byLot:                LotFinancials[]
}

/**
 * calcPortfolioFinancials
 * Aggregates financial intelligence across all non-recalled lots.
 */
export const calcPortfolioFinancials = (
  lots:        CoffeeLot[],
  balances:    AggregateBalance,
  branchList:  Branch[] = branches,
  overrideDefaultMargin?: number,
  forceMargin?: number,           // when set, overrides ALL per-lot targetMargins
): PortfolioFinancials => {
  const humidityByBranch = new Map<string, number>()
  for (const b of branchList) humidityByBranch.set(b.name, b.humidity)

  const activeLots = lots.filter(l => l.status !== 'RECALLED')
  const byLot: LotFinancials[] = []
  let totalInventoryValue   = 0
  let totalProjectedProfit  = 0
  let totalEnvironmentalPnL = 0
  let totalSpongeKgDelta    = 0
  let lotsWithPricing       = 0

  for (const lot of activeLots) {
    const lb      = balances.byLot.get(lot.id)
    if (!lb) continue
    const humidity = humidityByBranch.get(lot.branch) ?? 50
    const fin      = calcLotFinancials(lot, lb, humidity, overrideDefaultMargin ?? defaultTargetMargin, forceMargin)
    byLot.push(fin)
    if (lot.costPerKg && lot.costPerKg > 0) {
      totalInventoryValue   += fin.liveInventoryValue
      totalProjectedProfit  += fin.projectedProfit
      lotsWithPricing++
    }
    totalEnvironmentalPnL += fin.environmentalPnL
    totalSpongeKgDelta    += fin.spongeKgDelta
  }

  return {
    totalInventoryValue:   Math.round(totalInventoryValue * 100) / 100,
    totalProjectedProfit:  Math.round(totalProjectedProfit * 100) / 100,
    totalEnvironmentalPnL: Math.round(totalEnvironmentalPnL * 100) / 100,
    totalSpongeKgDelta:    Math.round(totalSpongeKgDelta * 10) / 10,
    lotsWithPricing,
    byLot,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ZATCA BULK SHRINKAGE EXPORT ENGINE
//  Produces a per-lot weight-reconciliation report for Saudi tax auditors.
//
//  Theoretical vs. Actual weight reconciliation:
//    • Theoretical Roasted (Baseline) = greenWeightKg × 0.82
//      → what the standard 18 % roasting loss formula predicts
//    • Actual Roasted (Sponge-adj.)   = greenWeightKg × spongeCoeff
//      → what the branch's real humidity yields after Sponge Effect
//
//  Sponge rules applied:
//    Rule A — Coastal Surplus : spongeCoeff > 0.82  (high humidity, > 70 % RH)
//    Rule B — Arid Deficit    : spongeCoeff < 0.82  (low humidity,  < 20 % RH)
//    Baseline                 : spongeCoeff = 0.82  (20–70 % RH, no adjustment)
//
//  30-day aggregates:
//    totalBaselineShrinkageKg = Σ (greenKg × 0.18)           [kg lost @ standard]
//    totalRuleASurplusKg      = Σ positive sponge deltas      [coastal gain]
//    totalRuleBDeficitKg      = Σ negative sponge deltas      [arid loss]
//    netSpongeAdjustmentKg    = totalRuleASurplus + totalRuleBDeficit
// ─────────────────────────────────────────────────────────────────────────────

export interface ZatcaLotRow {
  // Identifiers
  lotId:               string
  origin:              string
  variety:             string
  process:             string
  branch:              string
  roastDate:           string
  expiryDate:          string

  // Weight inputs
  purchasedGreenKg:    number   // original green purchase weight
  dispatchedRoastedKg: number   // total roasted kg dispatched (from DISPATCHED requests)

  // Shrinkage calculations
  baselineShrinkagePct:number   // always 18 % (= 1 − 0.82)
  baselineRoastedKg:   number   // purchasedGreenKg × 0.82  (theoretical)
  spongeCoefficient:   number   // actual live coefficient from branch humidity
  spongeRule:          SpongeRule
  actualRoastedKg:     number   // purchasedGreenKg × spongeCoeff  (actual)

  // Delta breakdown
  baselineShrinkageKg: number   // kg lost to standard 18 % roast process
  spongeAdjKg:         number   // actualRoasted − theoreticalRoasted  (+ = surplus, − = deficit)
  ruleASurplusKg:      number   // max(0, spongeAdjKg)
  ruleBDeficitKg:      number   // min(0, spongeAdjKg)

  // Live inventory (post-dispatch)
  liveGreenKg:         number   // remaining unroasted green equivalent
  liveRoastedKg:       number   // sponge-adjusted live roasted balance
  liveBaselineKg:      number   // liveGreenKg × 0.82 for comparison

  // Financial reference
  costPerKg:           number   // green bean cost (SAR/kg), 0 if not set
  wholesalePriceGold:  number   // SAR/kg at Gold tier margin (0 if no cost data)
  liveInventoryValue:  number   // liveRoastedKg × wholesalePriceGold

  // Status
  status:              string
  branchHumidity:      number   // branch RH at report time
}

export interface ZatcaShrinkageReport {
  // Report metadata
  reportDate:          string   // ISO date string of generation
  periodLabel:         string   // e.g. "30-Day Period ending 2026-03-08"
  generatedBy:         string   // system identifier

  // Portfolio-level 30-day aggregates
  totalLotsReported:    number
  totalPurchasedGreenKg:number
  totalBaselineRoastedKg:number  // Σ (green × 0.82) — theoretical
  totalActualRoastedKg: number   // Σ (green × spongeCoeff) — actual
  totalBaselineShrinkageKg:number // Σ (green × 0.18) — standard loss
  totalRuleASurplusKg:  number   // total coastal gain across all lots
  totalRuleBDeficitKg:  number   // total arid loss across all lots
  netSpongeAdjustmentKg:number   // = totalRuleA + totalRuleB (net)
  totalDispatchedRoastedKg:number
  totalLiveRoastedKg:   number

  // Per-lot rows
  rows: ZatcaLotRow[]
}

/**
 * calcZatcaShrinkageReport
 *
 * Builds the full ZATCA-ready weight reconciliation report by iterating over
 * all coffee lots (including RECALLED — auditors need the full picture),
 * computing theoretical vs. actual roasted weight per lot using the Sponge
 * Effect engine, and summing up Rule A/B adjustments for the 30-day period.
 */
export const calcZatcaShrinkageReport = (
  lots:        CoffeeLot[],
  requests:    BeanRequest[],
  branchList:  Branch[] = branches,
  goldMargin:  number   = 35,
  reportDate?: string,
): ZatcaShrinkageReport => {
  const today = reportDate ?? new Date().toISOString().split('T')[0]

  // Build branch humidity lookup
  const humidityByBranch = new Map<string, number>()
  for (const b of branchList) humidityByBranch.set(b.name, b.humidity)

  // Build dispatched quantity lookup
  const dispatchedByLot = new Map<string, number>()
  for (const r of requests) {
    if (r.status === 'DISPATCHED') {
      dispatchedByLot.set(r.lotId, (dispatchedByLot.get(r.lotId) ?? 0) + r.quantityKg)
    }
  }

  const rows: ZatcaLotRow[] = []
  let totPurchasedGreen       = 0
  let totBaselineRoasted      = 0
  let totActualRoasted        = 0
  let totBaselineShrinkage    = 0
  let totRuleASurplus         = 0
  let totRuleBDeficit         = 0
  let totDispatched           = 0
  let totLiveRoasted          = 0

  for (const lot of lots) {
    const branchHumidity  = humidityByBranch.get(lot.branch) ?? 50
    const sponge          = calcSpongeCoefficient(branchHumidity)

    const greenKg           = lot.greenWeightKg
    const baselineRoastedKg = Math.round(greenKg * SPONGE_BASELINE_COEFFICIENT * 100) / 100
    const actualRoastedKg   = Math.round(greenKg * sponge.coefficient * 100) / 100
    const baselineShrinkKg  = Math.round((greenKg * (1 - SPONGE_BASELINE_COEFFICIENT)) * 100) / 100
    const spongeAdjKg       = Math.round((actualRoastedKg - baselineRoastedKg) * 100) / 100
    const ruleASurplusKg    = Math.max(0, spongeAdjKg)
    const ruleBDeficitKg    = Math.min(0, spongeAdjKg)

    const dispatchedRoastedKg  = Math.round((dispatchedByLot.get(lot.id) ?? 0) * 100) / 100
    const dispatchedGreenEquiv = roastedToGreenEquivWithSponge(dispatchedRoastedKg, branchHumidity)
    const liveGreenKg          = Math.max(0, Math.round((greenKg - dispatchedGreenEquiv) * 100) / 100)
    const liveRoastedKg        = Math.round(applyRoastShrinkageWithSponge(liveGreenKg, branchHumidity) * 100) / 100
    const liveBaselineKg       = Math.round(liveGreenKg * SPONGE_BASELINE_COEFFICIENT * 100) / 100

    const cost               = lot.costPerKg ?? 0
    const wpGold             = cost > 0 ? calcWholesalePrice(cost, goldMargin) : 0
    const liveInventoryValue = Math.round(liveRoastedKg * wpGold * 100) / 100

    rows.push({
      lotId:               lot.id,
      origin:              lot.origin,
      variety:             lot.variety ?? '—',
      process:             lot.process  ?? '—',
      branch:              lot.branch,
      roastDate:           lot.roastDate,
      expiryDate:          lot.expiryDate,
      purchasedGreenKg:    greenKg,
      dispatchedRoastedKg,
      baselineShrinkagePct:18,
      baselineRoastedKg,
      spongeCoefficient:   sponge.coefficient,
      spongeRule:          sponge.rule,
      actualRoastedKg,
      baselineShrinkageKg: baselineShrinkKg,
      spongeAdjKg,
      ruleASurplusKg,
      ruleBDeficitKg,
      liveGreenKg,
      liveRoastedKg,
      liveBaselineKg,
      costPerKg:           cost,
      wholesalePriceGold:  wpGold,
      liveInventoryValue,
      status:              lot.status,
      branchHumidity,
    })

    totPurchasedGreen    += greenKg
    totBaselineRoasted   += baselineRoastedKg
    totActualRoasted     += actualRoastedKg
    totBaselineShrinkage += baselineShrinkKg
    totRuleASurplus      += ruleASurplusKg
    totRuleBDeficit      += ruleBDeficitKg
    totDispatched        += dispatchedRoastedKg
    totLiveRoasted       += liveRoastedKg
  }

  const r2 = (n: number) => Math.round(n * 100) / 100

  return {
    reportDate:              today,
    periodLabel:             `30-Day Period ending ${today}`,
    generatedBy:             'Qabban OS — ZATCA Shrinkage Export Engine v1.0',
    totalLotsReported:       rows.length,
    totalPurchasedGreenKg:   r2(totPurchasedGreen),
    totalBaselineRoastedKg:  r2(totBaselineRoasted),
    totalActualRoastedKg:    r2(totActualRoasted),
    totalBaselineShrinkageKg:r2(totBaselineShrinkage),
    totalRuleASurplusKg:     r2(totRuleASurplus),
    totalRuleBDeficitKg:     r2(totRuleBDeficit),
    netSpongeAdjustmentKg:   r2(totRuleASurplus + totRuleBDeficit),
    totalDispatchedRoastedKg:r2(totDispatched),
    totalLiveRoastedKg:      r2(totLiveRoasted),
    rows,
  }
}
