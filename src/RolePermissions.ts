// ═══════════════════════════════════════════════════════════════════
//  QABBAN OS — Role-Based Permission System v6.0
//  Hybrid Ecosystem: Roasteries can act as Cafés (Dual-Mode Nodes)
//  Enterprise ERP: HR · Asset Management · Financial Intelligence
// ═══════════════════════════════════════════════════════════════════

export type QabbanRole =
  | 'platform_owner'    // ManagementHQ — full God View
  | 'roaster_admin'     // /admin — manages roastery, branches, finance
  | 'cafe_client'       // /cafe — external B2B buyer
  | 'hybrid_node'       // roastery branch that also acts as café consumer

// ── Permission tokens ────────────────────────────────────────────
export type Permission =
  // Network (Branches / My Network)
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
  | 'finance.consolidated_pnl'// view Consolidated P&L (Enterprise)
  | 'finance.true_margin'     // compute True Operating Margin

  // Marketplace / Global Exchange
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

  // Human Capital (Enterprise HR)
  | 'people.view'             // see Staff Directory
  | 'people.edit'             // add / edit staff records
  | 'people.payroll'          // access payroll processing
  | 'people.wps_export'       // generate WPS/SIF salary files
  | 'people.gosi'             // view/export GOSI reports
  | 'people.eosb'             // view EOSB accrual ledger

  // Asset & Maintenance (Enterprise Operations)
  | 'assets.view'             // see Asset Registry
  | 'assets.edit'             // add / update assets
  | 'assets.maintenance_log'  // log maintenance events
  | 'assets.watchdog'         // receive maintenance alerts
  | 'assets.depreciation'     // view Depreciation Ledger

  // HQ
  | 'hq.god_view'             // ManagementHQ access
  | 'hq.set_plan'             // override branch plan

// ── Role → Permission map ────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<QabbanRole, Permission[]> = {

  platform_owner: [
    // Network
    'network.view', 'network.transfer', 'network.add_node', 'network.edit_node',
    // B2B
    'b2b.view_clients', 'b2b.edit_clients', 'b2b.create_order', 'b2b.zatca_invoice',
    // Finance
    'finance.view', 'finance.cogs_detail', 'finance.zatca_export', 'finance.set_pricing',
    'finance.consolidated_pnl', 'finance.true_margin',
    // Exchange
    'exchange.view', 'exchange.buy_green', 'exchange.list_roasted', 'exchange.climate_passport',
    // Inventory
    'inventory.view', 'inventory.import', 'inventory.recall',
    // Café
    'cafe.view_dashboard', 'cafe.extraction_risk', 'cafe.tier_tracker',
    'cafe.iot_reconciliation', 'cafe.request_beans',
    // Watchdog
    'watchdog.view', 'watchdog.acknowledge',
    // Human Capital
    'people.view', 'people.edit', 'people.payroll', 'people.wps_export',
    'people.gosi', 'people.eosb',
    // Assets
    'assets.view', 'assets.edit', 'assets.maintenance_log', 'assets.watchdog', 'assets.depreciation',
    // HQ
    'hq.god_view', 'hq.set_plan',
  ],

  roaster_admin: [
    // Network
    'network.view', 'network.transfer', 'network.add_node', 'network.edit_node',
    // B2B
    'b2b.view_clients', 'b2b.edit_clients', 'b2b.create_order', 'b2b.zatca_invoice',
    // Finance
    'finance.view', 'finance.cogs_detail', 'finance.zatca_export', 'finance.set_pricing',
    'finance.consolidated_pnl', 'finance.true_margin',
    // Exchange
    'exchange.view', 'exchange.buy_green', 'exchange.list_roasted', 'exchange.climate_passport',
    // Inventory
    'inventory.view', 'inventory.import', 'inventory.recall',
    // Watchdog
    'watchdog.view', 'watchdog.acknowledge',
    // Human Capital — full HR access
    'people.view', 'people.edit', 'people.payroll', 'people.wps_export',
    'people.gosi', 'people.eosb',
    // Assets — full asset access
    'assets.view', 'assets.edit', 'assets.maintenance_log', 'assets.watchdog', 'assets.depreciation',
  ],

  cafe_client: [
    // Café
    'cafe.view_dashboard', 'cafe.extraction_risk', 'cafe.tier_tracker',
    'cafe.iot_reconciliation', 'cafe.request_beans',
    // Exchange (read + buy)
    'exchange.view', 'exchange.buy_green', 'exchange.climate_passport',
  ],

  hybrid_node: [
    // Network (own sub-nodes only)
    'network.view', 'network.transfer',
    // B2B
    'b2b.view_clients', 'b2b.create_order', 'b2b.zatca_invoice',
    // Finance (view + COGS, no pricing override)
    'finance.view', 'finance.cogs_detail', 'finance.consolidated_pnl',
    // Exchange (dual-role vendor + buyer)
    'exchange.view', 'exchange.buy_green', 'exchange.list_roasted', 'exchange.climate_passport',
    // Inventory
    'inventory.view', 'inventory.import',
    // Café-side (bi-directional node)
    'cafe.view_dashboard', 'cafe.extraction_risk', 'cafe.tier_tracker',
    'cafe.iot_reconciliation', 'cafe.request_beans',
    // Watchdog
    'watchdog.view',
    // Human Capital — limited (view + payroll of own staff)
    'people.view', 'people.payroll',
    // Assets — view + maintenance logging
    'assets.view', 'assets.maintenance_log', 'assets.watchdog',
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

// ── Sidebar Navigation Groups (Enterprise v6.0) ──────────────────
export const SIDEBAR_GROUPS = {
  GLOBAL_EXCHANGE: {
    label  : 'Global Exchange',
    labelAr: 'البورصة العالمية',
    icon   : 'fa-globe',
    links  : [
      { href: '/exchange',           icon: 'fa-store',         label: 'Exchange Hub',     id: 'exchange',  permission: 'exchange.view'  },
      { href: '/exchange/contracts', icon: 'fa-file-contract', label: 'Forward Contracts',id: 'forwards',  permission: 'exchange.view'  },
    ],
  },
  PRODUCTION_HUB: {
    label  : 'Production Hub',
    labelAr: 'مركز الإنتاج',
    icon   : 'fa-industry',
    links  : [
      { href: '/admin',              icon: 'fa-gauge',         label: 'Overview',         id: 'overview',  permission: null             },
      { href: '/admin/inventory',    icon: 'fa-boxes-stacked', label: 'Inventory',        id: 'inventory', permission: 'inventory.view' },
      { href: '/admin/branches',     icon: 'fa-sitemap',       label: 'My Network',       id: 'branches',  permission: 'network.view'   },
      { href: '/admin/pulse',        icon: 'fa-wave-square',   label: 'Pulse',            id: 'pulse',     permission: null             },
      { href: '/admin/watchdog',     icon: 'fa-shield-virus',  label: 'Risk Watchdog',    id: 'watchdog',  permission: 'watchdog.view'  },
      { href: '/operations/assets',  icon: 'fa-wrench',        label: 'Assets & Maint.',  id: 'assets',    permission: 'assets.view'    },
    ],
  },
  RETAIL_HUB: {
    label  : 'Retail Hub',
    labelAr: 'مركز التجزئة',
    icon   : 'fa-mug-hot',
    links  : [
      { href: '/cafe',               icon: 'fa-store',         label: 'Café Portal',      id: 'cafe',      permission: 'cafe.view_dashboard' },
      { href: '/admin/requests',     icon: 'fa-bell',          label: 'Bean Requests',    id: 'requests',  permission: null             },
    ],
  },
  WHOLESALE_CRM: {
    label  : 'Wholesale CRM',
    labelAr: 'إدارة عملاء الجملة',
    icon   : 'fa-handshake',
    links  : [
      { href: '/admin/b2b',          icon: 'fa-handshake',     label: 'B2B Clients',      id: 'b2b',       permission: 'b2b.view_clients' },
    ],
  },
  HUMAN_CAPITAL: {
    label  : 'Human Capital',
    labelAr: 'رأس المال البشري',
    icon   : 'fa-users',
    links  : [
      { href: '/people',             icon: 'fa-id-badge',      label: 'Staff Directory',  id: 'people',    permission: 'people.view'    },
      { href: '/people/payroll',     icon: 'fa-money-check',   label: 'Payroll & WPS',    id: 'payroll',   permission: 'people.payroll' },
      { href: '/people/gosi',        icon: 'fa-shield-alt',    label: 'GOSI Reports',     id: 'gosi',      permission: 'people.gosi'    },
      { href: '/people/eosb',        icon: 'fa-hand-holding-usd', label: 'EOSB Ledger',   id: 'eosb',      permission: 'people.eosb'    },
    ],
  },
  INTELLIGENCE: {
    label  : 'Intelligence',
    labelAr: 'الذكاء المالي',
    icon   : 'fa-chart-line',
    links  : [
      { href: '/admin/finance',      icon: 'fa-chart-line',    label: 'Finance',          id: 'finance',   permission: 'finance.view'   },
      { href: '/admin/finance/enterprise', icon: 'fa-chart-mixed', label: 'Enterprise P&L', id: 'enterprise-pnl', permission: 'finance.consolidated_pnl' },
    ],
  },
} as const

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
