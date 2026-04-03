// ═══════════════════════════════════════════════════════════════════
//  QABBAN OS — Role-Based Permission System
//  Hybrid Ecosystem: Roasteries can act as Cafés (Dual-Mode Nodes)
// ═══════════════════════════════════════════════════════════════════

export type QabbanRole =
  | 'platform_owner'    // ManagementHQ — full God View
  | 'roaster_admin'     // /admin — manages roastery, branches, finance
  | 'cafe_client'       // /cafe — external B2B buyer
  | 'hybrid_node'       // roastery branch that also acts as café consumer

// ── Permission tokens ────────────────────────────────────────────
export type Permission =
  // Network (Branches)
  | 'network.view'            // see My Network / internal nodes
  | 'network.transfer'        // initiate SAR-0 internal stock transfers
  | 'network.add_node'        // register new internal branch node
  | 'network.edit_node'       // edit branch node settings
  // B2B CRM
  | 'b2b.view_clients'        // see B2B Clients tab
  | 'b2b.edit_clients'        // edit client records, tiers, schedules
  | 'b2b.create_order'        // create outbound B2B sale order
  | 'b2b.zatca_invoice'       // generate ZATCA-compliant invoice
  // Finance
  | 'finance.view'            // access finance dashboard
  | 'finance.cogs_detail'     // see trueRoastedCost / QFI COGS breakdown
  | 'finance.zatca_export'    // export ZATCA XML
  | 'finance.set_pricing'     // adjust wholesale / platform pricing
  // Marketplace
  | 'exchange.view'           // browse Global Exchange catalog
  | 'exchange.buy_green'      // submit buy orders for green beans
  | 'exchange.list_roasted'   // list roasted lots for sale (Vendor mode)
  | 'exchange.climate_passport' // view full Climate Passport data
  // Inventory
  | 'inventory.view'          // see lot list
  | 'inventory.import'        // import CSV / add lots
  | 'inventory.recall'        // trigger SFDA recall
  // Café-side
  | 'cafe.view_dashboard'     // /cafe multi-branch dashboard
  | 'cafe.extraction_risk'    // see Extraction Risk (Room RH%)
  | 'cafe.tier_tracker'       // see KG-to-Next-Tier widget
  | 'cafe.iot_reconciliation' // IoT Pulse reconciliation panel
  | 'cafe.request_beans'      // submit bean requests to roaster
  // Watchdog
  | 'watchdog.view'           // see Risk Watchdog alerts
  | 'watchdog.acknowledge'    // ack / dismiss alerts
  // HQ
  | 'hq.god_view'             // ManagementHQ access
  | 'hq.set_plan'             // override branch plan

// ── Role → Permission map ────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<QabbanRole, Permission[]> = {

  platform_owner: [
    'network.view', 'network.transfer', 'network.add_node', 'network.edit_node',
    'b2b.view_clients', 'b2b.edit_clients', 'b2b.create_order', 'b2b.zatca_invoice',
    'finance.view', 'finance.cogs_detail', 'finance.zatca_export', 'finance.set_pricing',
    'exchange.view', 'exchange.buy_green', 'exchange.list_roasted', 'exchange.climate_passport',
    'inventory.view', 'inventory.import', 'inventory.recall',
    'cafe.view_dashboard', 'cafe.extraction_risk', 'cafe.tier_tracker',
    'cafe.iot_reconciliation', 'cafe.request_beans',
    'watchdog.view', 'watchdog.acknowledge',
    'hq.god_view', 'hq.set_plan',
  ],

  roaster_admin: [
    'network.view', 'network.transfer', 'network.add_node', 'network.edit_node',
    'b2b.view_clients', 'b2b.edit_clients', 'b2b.create_order', 'b2b.zatca_invoice',
    'finance.view', 'finance.cogs_detail', 'finance.zatca_export', 'finance.set_pricing',
    'exchange.view', 'exchange.buy_green', 'exchange.list_roasted', 'exchange.climate_passport',
    'inventory.view', 'inventory.import', 'inventory.recall',
    'watchdog.view', 'watchdog.acknowledge',
  ],

  cafe_client: [
    'cafe.view_dashboard', 'cafe.extraction_risk', 'cafe.tier_tracker',
    'cafe.iot_reconciliation', 'cafe.request_beans',
    'exchange.view', 'exchange.buy_green', 'exchange.climate_passport',
  ],

  hybrid_node: [
    // Has all roaster_admin permissions for its own sub-nodes
    'network.view', 'network.transfer',
    'b2b.view_clients', 'b2b.create_order', 'b2b.zatca_invoice',
    'finance.view', 'finance.cogs_detail',
    'exchange.view', 'exchange.buy_green', 'exchange.list_roasted', 'exchange.climate_passport',
    'inventory.view', 'inventory.import',
    // Plus café-side permissions (bi-directional node)
    'cafe.view_dashboard', 'cafe.extraction_risk', 'cafe.tier_tracker',
    'cafe.iot_reconciliation', 'cafe.request_beans',
    'watchdog.view',
  ],
}

// ── Permission check helper ──────────────────────────────────────
export function can(role: QabbanRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// ── Workspace routing map ────────────────────────────────────────
export const WORKSPACE_ROOT: Record<QabbanRole, string> = {
  platform_owner : '/hq',
  roaster_admin  : '/admin',
  cafe_client    : '/cafe',
  hybrid_node    : '/admin',   // starts as roaster, can switch to /cafe view
}

// ── Node type labels ─────────────────────────────────────────────
export const NODE_TYPE_LABELS = {
  internal : 'Internal Node',     // SAR-0 transfer target
  b2b      : 'B2B Client',        // commercial buyer
  hybrid   : 'Hybrid Node',       // roaster + café dual-mode
  exchange : 'Exchange Vendor',   // listed on Global Exchange
} as const

export type NodeType = keyof typeof NODE_TYPE_LABELS

// ── Loyalty Tier thresholds ──────────────────────────────────────
export const LOYALTY_TIERS = [
  { tier: 'Bronze', minKg: 0,    maxKg: 500,  discount: 0,    label: 'Entry',    color: '#cd7f32' },
  { tier: 'Silver', minKg: 501,  maxKg: 2000, discount: 0.03, label: 'Mid',      color: '#a8a9ad' },
  { tier: 'Gold',   minKg: 2001, maxKg: Infinity, discount: 0.05, label: 'Top',  color: '#FFB300' },
] as const

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold'

export function getLoyaltyTier(lifetimeKg: number): typeof LOYALTY_TIERS[number] {
  return LOYALTY_TIERS.find(t => lifetimeKg >= t.minKg && lifetimeKg <= t.maxKg)
    ?? LOYALTY_TIERS[LOYALTY_TIERS.length - 1]
}

export function kgToNextTier(lifetimeKg: number): { nextTier: string; kgNeeded: number } | null {
  const current = getLoyaltyTier(lifetimeKg)
  const currentIdx = LOYALTY_TIERS.findIndex(t => t.tier === current.tier)
  const next = LOYALTY_TIERS[currentIdx + 1]
  if (!next) return null   // already Gold
  return { nextTier: next.tier, kgNeeded: next.minKg - lifetimeKg }
}

// ── Stock Transfer record ────────────────────────────────────────
export interface StockTransfer {
  id          : string
  fromBranch  : string      // source branch name
  toBranch    : string      // destination internal node
  lotId       : string      // lot being transferred
  kgTransferred: number
  sarValue    : 0           // always SAR 0 for internal transfers
  transferredAt: string
  note        : string
  initiatedBy : string      // admin username
}

// ── B2B Client extended record ───────────────────────────────────
export interface B2BClient {
  id                : string
  name              : string
  city              : string
  contactPhone      : string
  contactEmail      : string
  loyaltyTier       : LoyaltyTier
  lifetimeKgPurchased: number
  lifetimeSarSpent  : number          // LTV in SAR
  orderHistory      : B2BOrder[]
  nextScheduledOrder: string | null   // ISO date
  nodeType          : NodeType
  assignedBranchId  : string | null   // for hybrid nodes
  createdAt         : string
}

export interface B2BOrder {
  orderId    : string
  date       : string
  items      : { lotId: string; origin: string; kgOrdered: number; sarPerKg: number }[]
  totalSar   : number
  status     : 'DELIVERED' | 'IN_TRANSIT' | 'PENDING' | 'CANCELLED'
  zatcaRef   : string | null
}
