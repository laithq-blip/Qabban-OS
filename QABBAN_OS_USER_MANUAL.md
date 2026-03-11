# QABBAN OS — Complete User Manual
### Qabban Global Exchange & Loyalty Engine v6
**Version 2.0 | March 2026 | Bilingual (EN / AR)**

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Login & Authentication](#2-login--authentication)
3. [Admin Portal — Overview Tab](#3-admin-portal--overview-tab)
4. [Admin Portal — Inventory Tab](#4-admin-portal--inventory-tab)
5. [Admin Portal — Branches Tab](#5-admin-portal--branches-tab)
6. [Admin Portal — Finance Tab](#6-admin-portal--finance-tab)
7. [Admin Portal — Bean Requests Tab](#7-admin-portal--bean-requests-tab)
8. [Cafe (Buyer) Portal](#8-cafe-buyer-portal)
9. [Cafe Orders Page](#9-cafe-orders-page)
10. [Global Exchange Hub](#10-global-exchange-hub)
11. [Exchange — Global Catalog](#11-exchange--global-catalog)
12. [Exchange — Climate Passport](#12-exchange--climate-passport)
13. [Exchange — Ship Tracker](#13-exchange--ship-tracker)
14. [Exchange — Forward Contract Detail](#14-exchange--forward-contract-detail)
15. [Exchange — Analytics Dashboard](#15-exchange--analytics-dashboard)
16. [Vendor Portal](#16-vendor-portal)
17. [Buyer Portal (Global Exchange)](#17-buyer-portal-global-exchange)
18. [Coffee Miles — Loyalty Engine](#18-coffee-miles--loyalty-engine)
19. [Tier Watcher & Milestone Nudge Engine](#19-tier-watcher--milestone-nudge-engine)
20. [XE Currency & SAMA Rate Engine](#20-xe-currency--sama-rate-engine)
21. [Sponge Effect — Dynamic Yield Coefficient Engine](#21-sponge-effect--dynamic-yield-coefficient-engine)
22. [ZATCA Phase-2 Compliance & Bulk Shrinkage Report](#22-zatca-phase-2-compliance--bulk-shrinkage-report)
23. [SFDA Recall & Audit Shield](#23-sfda-recall--audit-shield)
24. [Bilingual Engine (EN / AR)](#24-bilingual-engine-en--ar)
25. [API Reference](#25-api-reference)
26. [Business Constants & Configuration](#26-business-constants--configuration)
27. [Demo Credentials & Test Data](#27-demo-credentials--test-data)

---

## 1. System Overview

**QABBAN OS** is a fully integrated, cloud-native roastery operating system built for Saudi specialty coffee producers and buyers. It combines:

| Module | Purpose |
|---|---|
| Roaster Admin Portal | Inventory, branch monitoring, financials, request fulfilment |
| Cafe (Buyer) Portal | Coffee catalog, ordering, loyalty tracker, order history |
| Qabban Global Exchange | International green-bean sourcing marketplace |
| Vendor Portal | Producer registration and lot listing |
| Buyer Portal | Saudi roastery registration and forward contracting |
| Loyalty Engine | Coffee Miles tiered discount system |
| Financial Intelligence | QFI reactive engine, wholesale pricing, ZATCA compliance |
| Sponge Effect Engine | Dynamic yield coefficient for environmental P&L |

**Technology Stack:** Hono (TypeScript) on Cloudflare Pages · Vite 6 · TailwindCSS via CDN · Font Awesome 6 icons

**Live URL (Sandbox):** https://3000-ihghwgfukl99k815ye7z8-cbeee0f9.sandbox.novita.ai

---

## 2. Login & Authentication

### Screen: `/` (Landing Page)

The Qabban OS login page features the official brand logo with an amber ambient glow halo. It provides **two role-based access tabs**:

#### 2.1 Roaster Admin Tab
- **Username:** `admin`
- **Password:** `qabban2026`
- Redirects to `/admin` (Overview Dashboard)

#### 2.2 Cafe Portal Tab
- **Username:** `alnokhba` → Al Nokhba Specialty (Riyadh) — Gold Tier
- **Username:** `qahwa_bahr` → Qahwa Al Bahr (Jeddah) — Silver Tier
- **Username:** `pearl_roast` → Pearl Roast Café (Dammam) — Bronze Tier
- **Password for all cafes:** `cafe123`
- Redirects to `/cafe?cid=CAF-001/002/003`

#### 2.3 Language Toggle
- **EN / AR** pill toggle in the top-right corner of the login page
- Instantly switches all labels, navigation, and content between English and Arabic (RTL layout)
- Preference is persisted via `localStorage`

#### 2.4 Security Notes
- Credentials are validated server-side; failed login shows an error message
- The "AUTHENTICATING…" spinner provides visual feedback during validation

---

## 3. Admin Portal — Overview Tab

### Screen: `/admin`

The **Overview Dashboard** is the command center for the roastery operator. It opens with the QABBAN OS top-bar navigation containing five tabs and a live status bar.

### 3.1 Top Navigation Bar
| Tab | Icon | Path |
|---|---|---|
| Overview | fa-gauge | `/admin` |
| Inventory | fa-boxes-stacking | `/admin/inventory` |
| Branches | fa-building | `/admin/branches` |
| Finance | fa-chart-line | `/admin/finance` |
| Bean Requests | fa-inbox | `/admin/requests` |

**Top-bar Status Badges (always visible):**
- 🟡 Live branch count badge
- 🔴 Pending bean requests counter (pulsing when >0)
- 🌐 Language toggle (EN/AR)
- 🔔 Notification bell (shows pending requests count)

### 3.2 KPI Stat Cards (Row 1)
| Card | Description |
|---|---|
| **Total Lots** | All coffee lots in the inventory (including recalled) |
| **Optimal Lots** | Lots with `OPTIMAL` status (green) |
| **Pending Requests** | Bean requests awaiting admin action |
| **Critical Branches** | Branches in HIGH or CRITICAL humidity risk |

### 3.3 Financial Impact Cards — QFI Overview (Row 2)
Four-tile grid showing live portfolio values by tier:

| Card | ID | Color |
|---|---|---|
| 🥉 Bronze Portfolio | `ov-qfi-value-bronze` | `#cd7f32` (amber-brown) |
| 🥈 Silver Portfolio | `ov-qfi-value-silver` | `#94a3b8` (slate) |
| 🥇 Gold Portfolio | `ov-qfi-value-gold` | `#f59e0b` (amber) |
| 🌿 Environmental P&L | `ov-qfi-env` | Green/Red dynamic |

Each card shows:
- **Total Inventory Value (SAR)** — rounded, locale-formatted
- **Projected Profit** — with `+/-` sign and green/red colouring
- Refreshes every **10 seconds** via BroadcastChannel (`qabban_margin`) or polling `/api/finance/snapshot`

### 3.4 Live Balance Section
Displays the **Live Balance Formula** output:
- **Purchased Green Kg** — raw green bean weight across all non-recalled lots
- **Dispatched Green-Equivalent Kg** — total dispatched orders back-calculated to green weight
- **Live Balance Kg** — remaining green-equivalent available
- All figures formatted for Saudi locale (`en-SA`)

### 3.5 Sponge Effect — Dynamic Yield Coefficient Engine Card
Status: **ACTIVE** badge
- Shows the current yield coefficient per branch (adjusted from baseline 0.82)
- Displays `spongeKgDelta` — the SAR-equivalent gain/loss from Sponge adjustments
- Color coded: green = gain, red = loss

### 3.6 Branch Risk Matrix (Summary)
- Quick list of branches in CRITICAL and HIGH risk states
- Each entry shows branch name, risk badge, and current humidity %

### 3.7 Recent Bean Requests Snapshot
- Latest 5–8 bean requests with status badges (PENDING / CONFIRMED / DISPATCHED / CANCELLED)
- Quick-link button to the full Bean Requests tab

### 3.8 KSA Environmental Live Feed
- Live simulated sensor data for all branches
- Temperature (°C) and Relative Humidity (%) per branch
- Risk level indicator: LOW / MODERATE / HIGH / CRITICAL

---

## 4. Admin Portal — Inventory Tab

### Screen: `/admin/inventory`

The Inventory tab is the core stock management center. It manages all coffee lots with full lifecycle tracking.

### 4.1 Page Header Stats
| Stat | Description |
|---|---|
| Total Lots | All lots (incl. recalled) |
| Optimal | Status = OPTIMAL |
| Monitor | Status = MONITOR |
| Critical | Status = CRITICAL |
| Recalled | Status = RECALLED |

### 4.2 Add New Lot (Manual Entry)
**Button:** "ADD LOT" → opens `openAddLotModal()`

Fields in the modal:
| Field | Type | Notes |
|---|---|---|
| Origin | Text | e.g. "Ethiopia Yirgacheffe" |
| Variety | Text | e.g. "Heirloom" |
| Process | Text | e.g. "Natural", "Washed" |
| Green Weight (kg) | Number | Purchased green weight |
| Roasted Weight (kg) | Auto | Calculated: green × 0.82 |
| Roast Date | Date | |
| Expiry Date | Date | |
| Branch | Select | From active branch list |
| Grade Score | Number | 0–100 |
| Flavor Notes | Tags | Comma-separated |
| Cost per Kg (SAR) | Number | For QFI financial calculations |
| Target Margin % | Number | e.g. 35 for wholesale pricing |
| Label Image | File | SFDA Article 18 traceability (base64) |
| Marketplace Type | Toggle | **SPOT** or **FORWARD** |
| SAS Clause | Checkbox | Subject to Approval of Sample |
| Deposit % | Number | Default 30% for FORWARD lots |
| Harvest Date | Date | FORWARD lots only |

### 4.3 Bulk CSV Import
**Button:** "BULK IMPORT" → drag-and-drop upload zone

Workflow:
1. **Download Template** — downloads `qabban-os-lot-import-template.csv`
   - Contains all required columns with example data
2. **Upload CSV** — drag-and-drop or click to browse (UTF-8 CSV only; Excel `.xlsx` rejected with instructions to convert)
3. **Column Mapping** — auto-maps columns by header name; manual override available
4. **Preview Table** — shows parsed rows with validation state (green = valid, red = error)
5. **Calculated Columns Highlighted** — Roasted Weight auto-computed shown in amber
6. **Import Progress Bar** — animated during import
7. **Summary Pills** — `X imported / Y skipped / Z errors`

**POST** `/admin/inventory/import` — server-side CSV parsing, 0.82 formula applied per lot.

### 4.4 Full Inventory Ledger
A scrollable table showing all lots with:

| Column | Description |
|---|---|
| Label | 40×40px thumbnail (SFDA sack photo) |
| Lot ID | Unique identifier |
| Origin | Country/region of origin |
| Variety & Process | Bean type |
| Branch | Storage location |
| Green Kg | Purchased green weight |
| Roasted Kg | Calculated roasted weight |
| Grade Score | Quality score with progress bar |
| Cost/kg | SAR cost per green kg |
| Marketplace | 🟢 SPOT / 🌱 FORWARD badge |
| Status | OPTIMAL / MONITOR / CRITICAL / RECALLED badge |
| Expiry | Date with color alert |
| Actions | Edit, Recall |

**Row States:**
- 🔴 RECALLED rows have red tint + "RECALLED — BLOCKED" overlay
- 🔘 CANCELLED rows are dimmed with audit tag

### 4.5 Inventory Shrinkage Summary — All Branches
- Per-branch breakdown of green kg, roasted kg, and yield coefficient
- Shows which branches apply Sponge Effect adjustment (non-standard coefficient)

### 4.6 SFDA Lot Recall
**Button on each lot row:** "INITIATE RECALL" → SFDA Recall Modal

Modal fields:
- Recall Instructions (text — sent to affected cafes)
- List of cafes with DISPATCHED orders for this lot (auto-populated `notifiedCafes`)
- **CONFIRM RECALL** button → sets lot `status = 'RECALLED'`, stores `recallInfo`, triggers cafe notifications

**POST** `/admin/inventory/:lotId/recall`

---

## 5. Admin Portal — Branches Tab

### Screen: `/admin/branches`

### 5.1 Page Header Stats
| Stat | Description |
|---|---|
| Total Branches | All registered storage branches |
| Critical | Branches at CRITICAL humidity risk |
| High Risk | Branches at HIGH humidity risk |
| Total Lots | All active lots across all branches |

### 5.2 Branch Filter Tabs
Horizontal tab row: **All Branches** | Branch 1 | Branch 2 | …
- Clicking a tab filters the cards to that branch
- URL parameter: `/admin/branches?branch=riyadh`

### 5.3 Branch Cards
Each branch card displays:

| Section | Details |
|---|---|
| **Header** | Branch name, climate type (Inland/Coastal), risk badge |
| **Sensors** | Live humidity % + temperature °C |
| **Risk Badge** | LOW / MODERATE / HIGH / CRITICAL with color coding |
| **Lot Count** | Active lots stored at this branch |
| **Local Cafes** | Cafes served from this branch |
| **Sponge Coefficient** | Current yield coefficient (e.g. 0.825) with rule label |
| **Storage Advice** | Climate-specific recommendations |
| **Acute Risk Note** | Warning for threshold breach conditions |

**Risk Color Scale:**
- 🟢 LOW — humidity < 50% (Inland) / < 45% (Coastal)
- 🟡 MODERATE — 50–61% / 45–55%
- 🟠 HIGH — 62–74% / 56–65%
- 🔴 CRITICAL — ≥ 75% / ≥ 66%

### 5.4 Add Branch Modal
**Button:** "ADD BRANCH" → `openAddBranchModal()`

Fields:
| Field | Type |
|---|---|
| Branch Name | Text |
| City | Text |
| Climate Type | Select: Inland / Coastal |
| Initial Humidity % | Number (seeded from climate preset) |
| Initial Temperature °C | Number |

**POST** `/admin/branches/add`

### 5.5 Sensor Update Modal
**Button on branch card:** "UPDATE SENSOR" → `openSensorModal(branchId)`

Fields: New Humidity %, New Temperature °C
**POST** `/admin/branches/:id/update`

### 5.6 Branch Risk Matrix (Full View)
- Table of all branches ranked by risk level (highest first)
- Shows lot-level risks per branch
- Humidity Risk Thresholds card explains the classification rules for both climate types

### 5.7 Inventory Ledger filtered by Branch
- Shows only lots assigned to the selected branch
- Same columns as the full Inventory Ledger
- Roasting schedule hints based on expiry proximity

---

## 6. Admin Portal — Finance Tab

### Screen: `/admin/finance`

The Finance tab is the most feature-rich tab in the system, containing six major sub-sections.

### 6.1 Financial Intelligence Header
Page subtitle: *"QFI Reactive Engine · Tier Margins · ZATCA Phase-2 · Exchange Rates"*

### 6.2 QFI Portfolio Cards (Tier Summary)
Three cards in a responsive grid:

| Card | Border Color | Elements |
|---|---|---|
| 🥉 **Bronze — Portfolio Value** | `rgba(205,127,50,0.35)` | `qfi-total-value-bronze`, `qfi-total-profit-bronze` |
| 🥈 **Silver — Portfolio Value** | `rgba(148,163,184,0.35)` | `qfi-total-value-silver`, `qfi-total-profit-silver` |
| 🥇 **Gold — Portfolio Value** | `rgba(245,158,11,0.45)` | `qfi-total-value-gold`, `qfi-total-profit-gold` |
| 🌿 **Environmental P&L** | `rgba(245,158,11,0.25)` | `qfi-env-pnl`, sponge-kg delta, priced-lots count |

All values update reactively when margins change (BroadcastChannel `qabban_margin`).

**Environmental P&L Card:**
- Shows total SAR value of Sponge Effect adjustments
- Positive = moisture absorption gain; Negative = evaporation loss
- Displays number of priced lots contributing to the calculation

### 6.3 QFI Table — Per-Lot Wholesale Prices
A full-width scrollable table with columns:

| Column | Description |
|---|---|
| Lot ID | Unique lot reference |
| Origin | Coffee origin |
| Branch | Storage branch |
| True Roasted Cost | `costPerKg / 0.82` (green cost ÷ yield) |
| 🥉 Bronze Price | `calcWholesalePrice(cost, tierMargins.Bronze)` in `#cd7f32` |
| 🥈 Silver Price | `calcWholesalePrice(cost, tierMargins.Silver)` in `#94a3b8` |
| 🥇 Gold Price | `calcWholesalePrice(cost, tierMargins.Gold)` in `#f59e0b` |
| Live Stock (kg) | Current roasted inventory |
| Live Inventory Value (Gold) | Stock × Gold wholesale price |
| Projected Profit (Gold) | Profit at Gold margin |
| Environmental P&L | Sponge-adjusted P&L (green/red) |
| Yield Coefficient | Current sponge coefficient (blue ▲ / orange ▼ / neutral —) |

**RESET button** — reloads table with current saved margins.

### 6.4 Coffee Miles — Loyalty Tier Engine
**Card Title:** "Coffee Miles — Loyalty Tier Engine"

**Tier Reference Cards** (generated from `COFFEE_MILES_TIERS`):

| Tier | Range | Base Discount | + Bulk Bonus | Max Stacked |
|---|---|---|---|---|
| 🥉 Bronze | 0–500 kg lifetime | 0% | +10% (>10 bags) | 10% |
| 🥈 Silver | 501–2,000 kg lifetime | 3% | +10% (>10 bags) | 13% |
| 🥇 Gold | ≥2,001 kg lifetime | 5% | +10% (>10 bags) | 15% |

**Bulk Trigger Rule:** Orders > 10 bags (600 kg) add an extra 10% discount stacked on top of the tier base.

### 6.5 Buyer Loyalty Ledger
A table listing all registered cafe clients:

| Column | Description |
|---|---|
| Buyer | Cafe name |
| Lifetime Kg | Total kg purchased since registration |
| Tier | Badge with icon, name, color |
| Base Discount | Tier's base discount % |
| Max Stacked | Base + bulk bonus % |
| Progress | "X kg to [NextTier]" with animated progress bar + % complete |
| ⚡ NUDGE (Tier Watcher) | Amber badge if within 50 kg of next tier; opens WhatsApp nudge modal |

**Tier Watcher Legend** — below the table, explains the 50 kg nudge threshold rule.

**Hybrid Pricing Formula Card:**
```
Total Discount % = Tier Base % + Bulk Quantity %
Final Price = Unit Price × (1 − Total Discount / 100)
Bulk triggers when order > 10 bags (~600 kg) → adds extra 10%
Example: Gold (5%) + Bulk (10%) = 15% total at checkout
```

### 6.6 Tier Watcher Dashboard
**Card Title:** "⚡ Tier Watcher Dashboard — Buyers Near Upgrade"

- Lists all buyers within **50 kg** of their next tier boundary
- Shows: Buyer name, current tier, kg needed, progress bar, **SEND WHATSAPP NUDGE** button
- Each nudge button opens `admin-wa-modal` — a mock WhatsApp preview panel showing:
  - Formatted WhatsApp message: `🎯 *Qabban Coffee Miles — Tier Upgrade Alert* …`
  - Includes buyer name, kg needed, next tier name, discount preview
  - **Copy & Send** button
- **Empty state:** "No buyers currently in the nudge zone" when all buyers are well below thresholds

**POST** `/api/cafe/tier-nudge` — returns nudge status, next tier, kg needed, and WhatsApp copy text.

### 6.7 Client Tier Pricing — QFI ENGINE
**Card Title:** "Client Tier Pricing — QFI ENGINE"

Three margin input panels for Bronze, Silver, Gold:

| Field | Default | Range |
|---|---|---|
| Bronze Margin % | 40% | 1–99, step 0.1 |
| Silver Margin % | 35% | 1–99, step 0.1 |
| Gold Margin % | 28% | 1–99, step 0.1 |

**SET ALL button** — broadcasts margin changes via BroadcastChannel to all open cafe portals, updating wholesale prices in real-time.

**Wholesale Price Formula:**
```
Wholesale Price = True Roasted Cost × (1 + Margin% / 100)
True Roasted Cost = Green Bean Cost (SAR/kg) ÷ 0.82
```

**Current display spans:** `cur-bronze`, `cur-silver`, `cur-gold` — show saved margin %
**Preview spans:** show live wholesale price per lot as margins are dragged

### 6.8 ZATCA Bulk Shrinkage Report
**Button:** "📥 ZATCA BULK SHRINKAGE EXPORT"
- Downloads: `qabban-zatca-bulk-shrinkage-{date}.csv`
- **GET** `/admin/finance/zatca-export`

CSV Format:
```
QABBN OS — ZATCA BULK SHRINKAGE EXPORT — WEIGHT RECONCILIATION REPORT
Period: 30 days ending {date}

Lot ID, Origin, Branch, Green Kg, Roasted Kg (0.82), Sponge Coeff, Adjusted Roasted Kg,
Shrinkage Kg, Humidity RH%, Temp °C, ZATCA VAT Rate, Cost/kg, Total Cost SAR
```

**Audit Notes:**
- Standard 18% weight-loss baseline (yield coefficient 0.82) per ZATCA commodity rules
- Humidity-adjusted Sponge coefficient applied where applicable
- Phase-2 compliant format with 15% VAT (`ZATCA_VAT_RATE = 0.15`)

**ZATCA Invoice Counter** — shows total invoices generated in the system.

### 6.9 Global Exchange — Currency Settings
- Live **USD → SAR** and **EUR → SAR** rates from XE Currency Data API
- **Exchange Rate Buffer %** — configurable markup (0–10%) applied on top of official SAMA peg
- Effective Rate formula: `SAMA rate × (1 + buffer/100)`
- **REFRESH RATES** button — POST `/api/finance/exchange-rates/refresh`
- **SAVE BUFFER** button — POST `/api/finance/set-exchange-buffer`
- Note: "Applied to all USD/EUR → SAR conversions in the Buyer Portal Landed Price calculator"
- Last refresh timestamp displayed

### 6.10 Live Balance Banner
Persistent banner at the bottom of the Finance tab:
- **Purchased Green Kg** across all lots
- **Dispatched Green-Equivalent Kg** (reverse-calculated: dispatched roasted ÷ sponge coeff)
- **Live Balance Kg** = Purchased − Dispatched equivalent

---

## 7. Admin Portal — Bean Requests Tab

### Screen: `/admin/requests`

### 7.1 Page Header Stats
| Stat | Description |
|---|---|
| Pending | Requests awaiting admin action (amber, pulsing) |
| Confirmed | Requests confirmed, not yet dispatched |
| Dispatched | Fully fulfilled orders |
| Cancelled | Voided requests |

### 7.2 Incoming Bean Requests Table
Columns:

| Column | Description |
|---|---|
| Request ID | Unique `REQ-XXXX` identifier |
| Cafe | Requesting cafe name and city |
| Lot | Coffee lot ID and origin |
| Quantity (kg) | Ordered roasted weight |
| Notes | Buyer's notes |
| Requested At | Timestamp |
| Status | Badge: PENDING / CONFIRMED / DISPATCHED / CANCELLED |
| Actions | CONFIRM / DISPATCH / CANCEL buttons |

**Action Buttons:**
- **CONFIRM** → POST `/admin/requests/:id/confirm` — status → CONFIRMED
- **DISPATCH** → POST `/admin/requests/:id/dispatch`
  - Status → DISPATCHED
  - **Auto-increments `lifetimeKgPurchased`** on the buyer's cafe record
  - **Recalculates `coffeeMilesTier`** — applies `getCoffeeMilesTier(newLifetimeKg)`
  - Deducts from lot inventory
- **CANCEL** → POST `/admin/requests/:id/cancel` — status → CANCELLED (audit row, dimmed)

**Row Styles:**
- PENDING rows — amber left border
- DISPATCHED rows — green tint
- CANCELLED rows — grey dimmed with "CANCELLED" audit tag

### 7.3 Roasting Interests — Pre-Orders Section
Shown when cafes submit interest for OUT-OF-STOCK origins:

Columns: Cafe | Origin Requested | Submitted At | Status | Actions
- **MARK SEEN** → POST `/admin/interests/:id/seen`
- **SCHEDULE** → POST `/admin/interests/:id/schedule` — marks for upcoming roast batch
- Admin note: "Use this to plan your next roast schedule"

---

## 8. Cafe (Buyer) Portal

### Screen: `/cafe?cid=CAF-001`

The Cafe Portal is the buyer-facing interface for Saudi roasteries to browse and order green/roasted beans.

### 8.1 Cafe Portal Top Bar
- Cafe name + city (e.g. "Al Nokhba Specialty — Riyadh")
- **My Orders** navigation link → `/cafe/orders`
- Language toggle (EN/AR)
- Notification bell — shows active SFDA recall count

### 8.2 XE Currency Rate Bar
A full-width banner above the catalog:
- 💱 **USD → SAR:** Live rate with buffer applied (e.g. "3.7850 SAR" if buffer = 0.8%)
- 💶 **EUR → SAR:** Live rate with buffer
- **Lock Rate (60s)** button → POST `/api/exchange/rate-lock`
  - Creates a 60-second execution lock (`rateLockWindowSecs = 60`)
  - Countdown timer shown in the bar
  - After 60 seconds: "RATE EXPIRED" message appears
  - Prevents rate slippage during order entry

### 8.3 Loyalty Tracker Card (Above Catalog)
**Full-width card displayed before the coffee catalog.**

Components:
1. **Tier Badge** — icon (🥇/🥈/🥉), tier name, tier color, base discount %
2. **Lifetime KG** — `X kg purchased` in large mono font
3. **Progress Bar** — animated fill showing % toward next tier
4. **Progress Text** — "X kg to [NextTier] tier" or "MAX TIER — Gold" if already Gold
5. **Discount Breakdown Cards:**
   - 🎯 Tier Base: `X%` — the base discount from the loyalty tier
   - 📦 Bulk Bonus: `+10%` — extra for orders >10 bags (>600 kg)
   - ⚡ Max Stacked: `X+10%` — total combined discount
6. **Mini Tier Reference Row** — all three tiers with icons, colors, and ranges
7. **Note:** "Tier applied automatically at checkout"
8. **Stats Grid** — number of available origins, active catalog lots

### 8.4 Milestone Nudge Banner (Tier Watcher)
**Shown only when buyer is within 50 kg of next tier.**

Visual: Pulsing amber banner with `nudgePulse` animation
Content:
- "⚡ TIER UPGRADE MILESTONE" header
- "You are only **X kg** away from [NextTier]!"
- Progress bar showing proximity
- **SEND WHATSAPP** button → opens `wa-nudge-modal`
  - Mock WhatsApp preview panel with formatted message
  - Shows: buyer name, kg needed, next tier, discount improvement
  - "Copy & Send" and "Dismiss" options
- **Dismiss** button (×) → hides banner for the session

### 8.5 SFDA Recall Urgent Banner
**Shown only if a recalled lot has been dispatched to this cafe.**

Visual: Red pulsing banner at top of portal
Content:
- "⚠ URGENT RECALL — SFDA AUDIT SHIELD"
- Lot ID and origin name
- Instructions from roaster (from `recallInfo.instructions`)
- **ACKNOWLEDGE** button → dismisses banner, logs acknowledgement

### 8.6 Coffee Catalog
Grid of lot cards (one card per available lot).

**Each Lot Card Contains:**

| Section | Content |
|---|---|
| **Header** | Lot ID, Origin name, Branch badge |
| **Label Photo** | 40×40 thumbnail (SFDA Article 18 sack photo) if available |
| **Marketplace Badge** | 🟢 SPOT — 48h local dispatch / 🌱 FORWARD — harvest pre-order |
| **Grade Score Bar** | Visual 0–100 score with color gradient |
| **Flavor Notes** | Tag pills (e.g. "Jasmine", "Stone Fruit", "Chocolate") |
| **Weights** | Green Kg / Roasted Kg available |
| **Variety & Process** | Bean cultivar and processing method |
| **Roast Date / Expiry** | With expiry warning if near |
| **Tier Price Badge** | Wholesale price for buyer's tier (Gold/Silver/Bronze) with discount % shown |
| **SAS Badge** | "Subject to Sample Approval" if `sasClause = true` |

**Tier Price Badge Logic:**
- Displays the buyer's specific tier wholesale price (e.g. wpGold, wpSilver, wpBronze)
- Shows tier icon, tier name, price in SAR/kg, and "Coffee Miles X% discount" label
- Updates in real-time via BroadcastChannel when admin changes margins

**Out-of-Stock Lots:**
- Card shown with "OUT OF STOCK" overlay (muted grey)
- Pre-order panel replaces action buttons
- If recalled: "RECALLED — BLOCKED" overlay; "Pre-Order Blocked" message + recall warning

**Marketplace Type Badges:**
- **SPOT** (green badge) — "48h local dispatch"
- **FORWARD** (amber seedling badge) — "harvest pre-order"

### 8.7 Request Beans Modal
**Button:** "REQUEST BEANS" → `openModal(lotId, origin, available, wholesalePrice)`

Modal fields:
| Field | Description |
|---|---|
| Quantity (kg) | Slider + input; max = available roasted kg |
| Bags | Auto-calculated: `kg ÷ 60` |
| Notes | Optional text for special instructions |

**Hybrid Discount Display (calcHybridDiscount):**
- Shows tier base discount (from buyer's Coffee Miles tier)
- Shows bulk bonus if order > 10 bags (`BULK_ORDER_THRESHOLD_BAGS = 10`, `BAG_SIZE_KG = 60`)
- Shows **total combined discount %**
- Displays final price = unit price × (1 − totalDiscount/100)
- Example: Silver buyer (3%) + bulk order = 3% + 10% = 13% total discount

**POST** `/cafe/request` → creates `BeanRequest` record with status PENDING

### 8.8 Request Roasting Modal
**Button (out-of-stock lots):** "REQUEST ROASTING" → `openRoastingModal(lotId, origin)`

Fields: origin, preferred quantity estimate, notes
**POST** `/cafe/roasting-interest` → creates `RoastingInterest` record (pre-order queue)

---

## 9. Cafe Orders Page

### Screen: `/cafe/orders?cid=CAF-XXX`

### 9.1 Stats Row
| Stat | Description |
|---|---|
| Your Orders | Total orders submitted |
| Confirmed | Admin-confirmed orders |
| Total Dispatched | All-time kg dispatched |
| Pending | Awaiting admin confirmation |

### 9.2 Order History Table
Columns:
| Column | Description |
|---|---|
| Order ID | `REQ-XXXX` |
| Lot / Origin | Lot ID + coffee name |
| Quantity (kg) | Ordered amount |
| Notes | Buyer's notes |
| Requested | Date/time |
| Status | PENDING / CONFIRMED / DISPATCHED / CANCELLED badge |

**Empty state:** "No orders yet — Your order history will appear here."

### 9.3 Roasting Pre-Orders (Interests)
Section showing submitted roasting-interest requests for out-of-stock origins.

---

## 10. Global Exchange Hub

### Screen: `/exchange`

The **Qabban Global Exchange** is a separate portal for international green-bean sourcing.

### 10.1 Exchange Navigation
| Item | Icon | Path | Section |
|---|---|---|---|
| Exchange Hub | fa-gauge | `/exchange` | — |
| Global Catalog | fa-list | `/exchange/catalog` | MARKETPLACE |
| Spot Lots | fa-bolt | `/exchange/catalog?type=SPOT` | — |
| Forward Lots | fa-seedling | `/exchange/catalog?type=FORWARD` | — |
| Vendor Portal | fa-store | `/vendor` | PORTALS |
| Buyer Portal | fa-handshake | `/buyer` | BUYERS |
| Analytics | fa-chart-bar | `/exchange/analytics` | INTELLIGENCE |

### 10.2 Exchange Hub Dashboard Stats
| Stat | Source |
|---|---|
| Total Lots | All exchange lots |
| Spot Lots | `marketplaceType = 'SPOT'` |
| Forward Lots | `marketplaceType = 'FORWARD'` |
| Available Lots | Lots with available volume |
| Vendors | Registered global vendors |
| Buyers | Registered Saudi buyers |
| Contracts | Active forward contracts |
| Invoices | Generated ZATCA invoices |

### 10.3 Live Exchange Rates Card
- USD → SAR rate (SAMA reference + configured buffer)
- EUR → SAR rate
- Buffer %, effective rate calculation
- Last updated timestamp
- Link to Analytics →

### 10.4 Recent Spot Lots Preview
- Top 3–5 spot lots with origin, volume, price, and "View all Spot lots →" link

### 10.5 Recent Forward Lots Preview
- Top 3–5 forward lots with origin, harvest date, deposit %, and "View all Forward lots →" link

---

## 11. Exchange — Global Catalog

### Screen: `/exchange/catalog` (with optional `?type=SPOT` or `?type=FORWARD`)

### 11.1 Catalog Filter Bar
- **All** | **SPOT** | **FORWARD** type filter buttons
- Search/filter by origin name

### 11.2 Exchange Lot Cards
Each card shows:
| Section | Content |
|---|---|
| **Marketplace Type Badge** | 🟢 SPOT or 🌱 FORWARD (prominent, top of card) |
| **Origin** | Country flag emoji + name |
| **Variety & Process** | |
| **Volume Available (kg)** | |
| **Price (USD/kg)** | Origin asking price |
| **SAR Equivalent** | Converted using SAMA rate + buffer |
| **Grade Score** | Cupping score |
| **Harvest Date** | FORWARD lots: expected harvest date |
| **SAS Clause** | "Subject to Sample Approval" badge if applicable |
| **Climate Passport** | 🌡 link to `/exchange/climate/:lotId` if certified |
| **Ship Tracker** | 🚢 link to `/exchange/shiptrack/:lotId` if data available |
| **Deposit %** | FORWARD: "30% deposit to reserve" |
| **IoT Sensors** | Warehouse humidity % and temperature °C (live) |

### 11.3 SPOT Lots
- Available for **immediate purchase**
- **48-hour local dispatch** from nearest warehouse
- Full payment on order

### 11.4 FORWARD Lots (Pre-Harvest Contracts)
- **30% deposit** to reserve allocation
- Harvest date shown
- **SAS Clause** — buyer may reject lot if sample does not meet specifications
- Milestone payment schedule (typically: 30% deposit → 40% on shipment → 30% on delivery)
- Links to full Forward Contract detail page

### 11.5 IoT Sensor Updates
**POST** `/api/exchange/iot-update` — updates warehouse humidity/temp for exchange lots (simulates real IoT data feed)

---

## 12. Exchange — Climate Passport

### Screen: `/exchange/climate/:lotId`

A digital provenance document for each exchange lot.

### 12.1 Header
- Lot ID + Origin name
- Climate Certified badge (if `climateCertifiedAt` set) with date

### 12.2 Current Conditions
- Live warehouse humidity % and temperature °C
- Risk level assessment

### 12.3 Climate Log Table
Chronological log of IoT readings during transit and storage:

| Column | Description |
|---|---|
| Timestamp | ISO date/time |
| Location | e.g. "Jeddah Islamic Port", "Riyadh Warehouse" |
| Phase | LOADING / TRANSIT / ARRIVAL / STORAGE |
| Humidity | RH% at that checkpoint |
| Temperature | °C at that checkpoint |
| Note | e.g. "SFDA customs cleared", "Vessel departure" |

### 12.4 Sponge Coefficient at Each Phase
- Shows the dynamic yield coefficient calculated for each log entry
- Rule applied (Baseline / Moisture Absorption / Evaporation Loss)
- Cumulative environmental impact on expected roasted weight

---

## 13. Exchange — Ship Tracker

### Screen: `/exchange/shiptrack/:lotId`

Visual shipment tracking for exchange lots in transit.

### 13.1 Header
- Lot ID, Origin → Destination route
- Overall shipment status (IN TRANSIT / ARRIVED / PENDING)

### 13.2 Shipment Timeline
Visual timeline with phases:
1. **LOADING** — at origin port
2. **TRANSIT** — vessel underway
3. **ARRIVAL** — at Saudi port (e.g. Jeddah Islamic Port)
4. **CUSTOMS** — SFDA clearance
5. **STORAGE** — at destination warehouse

Each phase shows:
- Location name
- Timestamp
- Humidity/temp readings (from Climate Passport log)
- Status indicator (completed ✓ / active 🔄 / pending ○)

### 13.3 Vessel Information
- Vessel name
- Departure date / Expected arrival date
- Port of loading / Port of discharge

---

## 14. Exchange — Forward Contract Detail

### Screen: `/exchange/forward/:contractId`

Detailed view of a forward pre-harvest contract.

### 14.1 Contract Header
- Contract ID, Vendor, Buyer, Origin
- Lot allocation (kg), Price (USD/kg), Total SAR value
- Created date, Expected harvest date

### 14.2 SAS Status Panel
**SAS = Subject to Approval of Sample**

Status options:
| Status | Color | Description |
|---|---|---|
| PENDING_SAMPLE | Amber | Sample not yet received |
| SAMPLE_APPROVED | Green | Buyer approved the sample |
| SAMPLE_REJECTED | Red | Buyer rejected sample (contract renegotiable) |
| WAIVED | Grey | Buyer waived SAS clause |

**Update SAS Status:** POST `/api/exchange/forward/:id/sas`

### 14.3 Payment Milestones
Table showing the payment schedule:

| Milestone | % | Amount (SAR) | Due Date | Status |
|---|---|---|---|---|
| Initial Deposit | 30% | SAR X | At signing | PAID |
| On Shipment | 40% | SAR Y | At vessel departure | PENDING |
| On Delivery | 30% | SAR Z | At SFDA clearance | PENDING |

**Trigger Milestone:** POST `/api/exchange/forward/:id/milestone`

### 14.4 ZATCA Invoice
- Invoice generated per ZATCA Phase-2 UBL XML format
- Invoice number, issue date, VAT (15%), buyer/vendor details
- Download XML: GET `/buyer/invoice/:uuid/xml`

---

## 15. Exchange — Analytics Dashboard

### Screen: `/exchange/analytics`

### 15.1 Totals Panel
| Metric | Description |
|---|---|
| Total Lots | All lots on the exchange |
| Spot / Forward split | Count by marketplace type |
| Available Lots | Lots with remaining volume |
| Vendors | Total registered vendors |
| Verified Vendors | Vendors with verified status |
| Buyers | Registered Saudi roastery buyers |
| Contracts | Active forward contracts |
| Invoices | Generated ZATCA invoices |
| SCA Gold Lots | Specialty Coffee Association Grade 85+ lots |
| Total Volume (kg) | Sum of all lot volumes |

### 15.2 Rate Intelligence Panel
| Metric | Value |
|---|---|
| SAMA Reference Rate | 3.75 SAR/USD (pegged) |
| USD Spot Rate | Live from XE API |
| EUR Spot Rate | Live from XE API |
| Exchange Buffer % | Configured by admin |
| Effective USD Rate | SAMA + buffer |
| Last Updated | Timestamp |
| Rate Lock Window | 60 seconds |

### 15.3 Invoice Totals
- Total SAR value of all invoices in the system
- Total VAT collected (at 15%)

---

## 16. Vendor Portal

### Screen: `/vendor`

Dashboard for international coffee producers selling on the exchange.

### 16.1 Vendor Hub Stats
- My Lots listed, Active lots, Sold lots
- Total revenue (SAR equivalent)

### 16.2 Vendor Registration

**Screen:** `/vendor/register`

Fields:
| Field | Description |
|---|---|
| Company Name | Producer name |
| Country | Origin country |
| Contact Email | Primary contact |
| Phone | WhatsApp-capable number |
| Certificate | SCA / UTZ / Rainforest Alliance cert number |
| Description | Farm/company profile |

**POST** `/vendor/register` → creates `GlobalVendor` record

### 16.3 List a New Lot

**Screen:** `/vendor/lots/new`

Fields:
| Field | Description |
|---|---|
| Origin | Country + region |
| Variety | Bean cultivar |
| Process | Natural / Washed / Honey etc. |
| Volume (kg) | Available volume |
| Price (USD/kg) | Asking price |
| Harvest Date | For FORWARD lots |
| Marketplace Type | SPOT or FORWARD toggle |
| SAS Clause | Sample approval required |
| Deposit % | For FORWARD (default 30%) |
| Grade Score | Cupping score 0–100 |
| Flavor Notes | Cupping descriptors |

**POST** `/vendor/lots/new` → creates `GlobalExchangeLot` record

---

## 17. Buyer Portal (Global Exchange)

### Screen: `/buyer`

Dashboard for Saudi roastery buyers sourcing from the global exchange.

### 17.1 Buyer Registration

**Screen:** `/buyer/register`

Fields: Company name, CR number, Contact, Email, City, ZATCA TIN

**POST** `/buyer/register` → creates `GlobalBuyer` record

### 17.2 Browse & Contract

**Screen:** `/buyer/contract`

Full-featured contracting interface:

1. **Select Lot** — browse exchange catalog filtered by origin, type, volume
2. **Choose Marketplace Type** — Spot (immediate) or Forward (pre-harvest)
3. **Landed Price Calculator:**
   - Origin price (USD/kg) × converted SAR rate + buffer
   - Displayed as SAR/kg final landed cost
4. **Volume Entry** — enter desired quantity in kg
5. **Forward Contract Setup** (if FORWARD):
   - Review milestone schedule (30/40/30 split)
   - SAS clause confirmation
   - Deposit amount calculated
6. **Generate ZATCA Invoice:**
   - UBL XML invoice generated on confirmation
   - Invoice number, VAT (15%), totals
   - Links to HTML invoice and XML download

**POST** `/buyer/contract` → creates `ForwardContract` + `ZatcaInvoice` records

### 17.3 Invoice View

**Screen:** `/buyer/invoice/:uuid`

HTML view of ZATCA Phase-2 e-invoice with:
- Invoice number, UUID, issue date/time
- Vendor details (seller) + Buyer details
- Line item: origin, volume (KGM unit code), unit price, total
- VAT base amount + 15% VAT
- Grand total in SAR
- Download XML button → `/buyer/invoice/:uuid/xml`

---

## 18. Coffee Miles — Loyalty Engine

### Overview
The Coffee Miles Loyalty Engine automatically assigns buyers to discount tiers based on their **cumulative lifetime kilograms purchased**.

### 18.1 Tier Definitions

| Tier | Lifetime KG Range | Base Discount | Roastery Margin | Icon | Color |
|---|---|---|---|---|---|
| 🥉 **Bronze** | 0 – 500 kg | 0% | 40% | 🥉 | `#cd7f32` |
| 🥈 **Silver** | 501 – 2,000 kg | 3% | 35% | 🥈 | `#94a3b8` |
| 🥇 **Gold** | ≥ 2,001 kg | 5% | 28% | 🥇 | `#f59e0b` |

**No "Platinum" tier** — the system was fully unified to Bronze/Silver/Gold in v6.

### 18.2 Automatic Tier Assignment
- Triggered every time `POST /admin/requests/:id/dispatch` is called
- `lifetimeKgPurchased += dispatchedKg`
- `coffeeMilesTier = getCoffeeMilesTier(newLifetimeKg)` — recalculates automatically
- No manual override needed; tiers upgrade silently

### 18.3 Hybrid Stacked Pricing — `calcHybridDiscount(lifetimeKg, orderKg)`

```
Step 1: Determine tier base discount from lifetimeKg
  Bronze → 0%  |  Silver → 3%  |  Gold → 5%

Step 2: Check bulk eligibility
  bags = orderKg ÷ 60
  if bags > 10 → add BULK_DISCOUNT_PCT = 10%

Step 3: Apply total
  totalDiscount = tierBase + bulkBonus
  finalPrice = unitPrice × (1 − totalDiscount / 100)
```

Returns: `{ tier, basePct, bulkPct, totalPct, isBulk, bagCount, breakdown }`

### 18.4 Tier Progress — `kgToNextTier(lifetimeKg)`

```
Bronze → Silver: 0–500 kg range, need 501 - lifetimeKg kg more
Silver → Gold:   501–2000 kg range, need 2001 - lifetimeKg kg more
Gold:            Already at maximum tier; returns { nextTier: null, progressPct: 100 }
```

### 18.5 Where Tiers Appear in the UI
1. **Cafe Portal** — Loyalty Tracker card + tier price badge on lot cards
2. **Finance Tab** — Buyer Loyalty Ledger + QFI tier cards + per-lot price table
3. **Overview Tab** — 4-tile Financial Impact grid
4. **Bean Requests Tab** — Dispatch action auto-updates tier
5. **Request Modal** — Hybrid discount displayed before submission

---

## 19. Tier Watcher & Milestone Nudge Engine

### 19.1 Threshold
```
TIER_NUDGE_THRESHOLD = 50 kg
```
Any buyer with `kgNeeded ≤ 50` is in the "nudge zone."

### 19.2 Current Nudge-Zone Buyers (Demo Data)
| Cafe | Lifetime KG | Current Tier | KG to Next | Next Tier |
|---|---|---|---|---|
| Qahwa Al Bahr (CAF-002) | 1,965 kg | Silver | 36 kg | 🥇 Gold |
| Pearl Roast Café (CAF-003) | 460 kg | Bronze | 41 kg | 🥈 Silver |

### 19.3 Nudge Components

**Cafe Portal Nudge Banner:**
- Pulsing amber banner appears above the Loyalty Tracker
- Shows exact kg needed, animated progress bar
- "SEND WHATSAPP" button → mock WhatsApp preview modal
- Dismissable for the session

**Finance Tab Tier Watcher Dashboard:**
- Card listing all buyers in the nudge zone
- Per-buyer: name, tier, kg remaining, progress
- "SEND WHATSAPP NUDGE" button → admin WhatsApp preview modal
- Empty state when no one is in the zone

**Buyer Loyalty Ledger Nudge Column:**
- ⚡ amber badge appears next to buyers in the nudge zone
- Clicking opens the WhatsApp preview modal

### 19.4 WhatsApp Nudge Message Template
```
🎯 *Qabban Coffee Miles — Tier Upgrade Alert*

Dear [Cafe Name],

You are only *[X kg]* away from reaching *[NextTier] Tier* on Qabban OS!

📦 Current Tier: [CurrentTier] ([BaseDiscount]% discount)
🏆 Next Tier: [NextTier] ([NextDiscount]% discount)
📊 Progress: [ProgressPct]% complete

Place your next order to unlock your upgrade!

— Qabban Team
```

### 19.5 API Endpoint
**POST** `/api/cafe/tier-nudge`
- Body: `{ cafeId: "CAF-XXX" }`
- Returns: `{ ok, nextTier, kgNeeded, nudgeMessage, whatsappCopy }`

---

## 20. XE Currency & SAMA Rate Engine

### 20.1 SAMA Reference Rate
- Saudi Riyal is **pegged at 3.75 SAR/USD** (official SAMA rate)
- This serves as the baseline for all USD conversions

### 20.2 XE Currency Data API Integration
- Live USD → SAR and EUR → SAR rates fetched from XE Currency Data API
- API credentials stored as Cloudflare secrets (`XE_API_ID`, `XE_API_KEY`)
- **POST** `/api/finance/exchange-rates/refresh` triggers a live fetch
- Last successful fetch timestamp stored as `exchangeRateUpdatedAt`
- Fallback: if API unavailable, SAMA peg (3.75) is used for USD, computed for EUR

### 20.3 Exchange Rate Buffer
- Admin-configurable buffer: **0–10%** additional markup
- Default buffer: varies (configurable in Finance tab)
- **POST** `/api/finance/set-exchange-buffer` — validates 0–10 range
- **Effective Rate** = `liveRate × (1 + buffer / 100)`

### 20.4 Rate Execution Lock (60-Second Lock)
Purpose: freezes the SAR conversion rate during order entry to prevent slippage.

Workflow:
1. Buyer clicks "LOCK RATE (60s)" in the Cafe Portal top bar
2. **POST** `/api/exchange/rate-lock` — creates a `RateLock` record
3. 60-second countdown displayed in the currency bar
4. Lock ID stored: `RL-XXXX`
5. **GET** `/api/exchange/rate-lock/:id` — checks lock validity
6. After 60s: "RATE EXPIRED" message; buyer may re-lock

`rateLockWindowSecs = 60` constant

### 20.5 Where Currency Appears
1. **Exchange Catalog** — all prices shown in SAR (converted from USD/kg)
2. **Buyer Portal Landed Price Calculator** — origin price → SAR
3. **Finance Tab** — currency settings card with rate display
4. **Cafe Portal XE Rate Bar** — top of every cafe portal page
5. **Exchange Hub** — live rates card

---

## 21. Sponge Effect — Dynamic Yield Coefficient Engine

### 21.1 Concept
The **Sponge Effect** dynamically adjusts the standard 0.82 roasting shrinkage coefficient based on actual warehouse humidity conditions. This provides more accurate financial projections than a fixed yield factor.

### 21.2 Baseline
```
SPONGE_BASELINE_COEFFICIENT = 0.82 (18% weight loss during roasting)
```

### 21.3 Adjustment Rules

| Rule | Condition | Adjustment | Coefficient | Effect |
|---|---|---|---|---|
| **Rule A** — Moisture Absorption | RH > 70% (Coastal High) | +0.005 | **0.825** | Beans absorb moisture → heavier → less shrinkage |
| **Rule B** — Evaporation Loss | RH < 20% (Inland Arid) | −0.003 | **0.817** | Beans dry out → lighter → more shrinkage |
| **Baseline** | 20% ≤ RH ≤ 70% | 0 | **0.820** | Standard shrinkage |

### 21.4 Thresholds
```
SPONGE_RH_HIGH_THRESHOLD = 70%  → Rule A: +0.5% yield
SPONGE_RH_LOW_THRESHOLD  = 20%  → Rule B: −0.3% yield
SPONGE_HIGH_DELTA = +0.005
SPONGE_LOW_DELTA  = −0.003
```

### 21.5 Financial Impact (Environmental P&L)
```
spongeKgDelta = (spongeCoeff - 0.82) × greenKg
environmentalPnL = spongeKgDelta × wholesalePricePerKg (Gold reference)
```

Positive delta = gain (absorbed moisture = more saleable weight)
Negative delta = loss (evaporation = less saleable weight)

### 21.6 Sponge Effect Panel in Admin
**GET** `/api/sponge` — returns per-branch sponge data
**POST** `/api/sponge/simulate` — simulates coefficient for any humidity value

Admin panel shows:
- Status: **ACTIVE**
- Per-branch coefficient and rule applied
- Total environmental P&L across all branches

---

## 22. ZATCA Phase-2 Compliance & Bulk Shrinkage Report

### 22.1 ZATCA Background
Saudi Arabia's Zakat, Tax and Customs Authority (ZATCA) mandates Phase-2 e-invoicing for B2B transactions. QABBAN OS generates fully compliant UBL XML invoices.

### 22.2 ZATCA Invoice Generator
Function: `generateZatcaInvoice({ vendorId, buyerId, lotId, quantityKg, unitPriceUsd })`

Output:
- UUID (unique per invoice)
- Invoice number (sequential: `INV-XXXX`)
- Issue date + time (UTC)
- UBL XML document (OASIS Invoice-2 schema)
- VAT: 15% (`ZATCA_VAT_RATE = 0.15`)
- Unit code: KGM (kilograms)
- Invoice type code: 388 (Standard Tax Invoice)

**HTML Invoice:** `/buyer/invoice/:uuid`
**XML Download:** `/buyer/invoice/:uuid/xml`

### 22.3 ZATCA Bulk Shrinkage Report
**GET** `/admin/finance/zatca-export`
**Download:** `qabban-zatca-bulk-shrinkage-{YYYY-MM-DD}.csv`

Report covers the **30-day period** ending the report date.

**CSV Columns:**
```
Lot ID | Origin | Branch | Green Kg | Roasted Kg (×0.82) | Sponge Coeff |
Adjusted Roasted Kg | Shrinkage Kg | Humidity RH% | Temp °C |
ZATCA VAT Rate | Cost/kg (SAR) | Total Cost SAR
```

**Audit Notes embedded in CSV:**
- Standard 18% weight-loss baseline (ZATCA commodity rule)
- Humidity-adjusted Sponge coefficient applied per branch climate
- Phase-2 compliant format

**Use case:** Reconciles roasting weight loss for tax reporting and regulatory audits.

---

## 23. SFDA Recall & Audit Shield

### 23.1 SFDA Article 18 Traceability
Every lot can store a `labelImageUrl` — a base64 sack-label photo for SFDA audit trail.
This satisfies Saudi Food and Drug Authority (SFDA) Article 18 product traceability requirements.

### 23.2 Initiating a Recall
1. Admin navigates to Inventory tab → finds the lot → clicks "INITIATE RECALL"
2. SFDA Recall Modal appears:
   - Admin enters recall instructions
   - System shows which cafes received DISPATCHED orders for this lot (`notifiedCafes`)
3. Admin confirms → **POST** `/admin/inventory/:lotId/recall`
4. Lot status → `RECALLED`; `recallInfo` object populated

### 23.3 Cafe Notification
- All affected cafes see the **Recall Urgent Banner** on their portal (red, pulsing)
- Banner shows: Lot ID, origin, instructions from roaster
- Cafe staff must click **ACKNOWLEDGE** to dismiss
- **GET** `/api/recalls/:cafeId` — returns active recalls for that cafe
- Recall check runs on portal load and every minute (`checkRecalls()` interval)

### 23.4 Effects of Recall
- Lot card shows "RECALLED — BLOCKED" overlay
- Lot cannot be ordered (request button disabled/hidden)
- Pre-order requests for that lot show recall warning
- Recalled row highlighted red in Inventory Ledger
- Lot excluded from financial calculations

---

## 24. Bilingual Engine (EN / AR)

### 24.1 Architecture
```
Strategy: every translatable text node carries data-i18n="KEY"
Engine swaps innerHTML on language change
RTL layout toggled via <html dir="rtl|ltr">
Preference persisted via localStorage
```

### 24.2 Coverage
The i18n engine covers **all UI text** across:
- Brand name and taglines
- Login page labels and errors
- All 5 admin navigation tabs
- Page titles and subtitles
- Stat labels (Active Branches, Pending Requests, etc.)
- Section titles (Financial Intelligence, Loyalty Engine, etc.)
- Table headers (all columns)
- Button labels (CONFIRM, DISPATCH, CANCEL, SEND REQUEST, etc.)
- Modal labels
- Form field labels
- Climate/branch labels
- Risk levels (LOW / MODERATE / HIGH / CRITICAL)
- Lot card labels
- Environment feed labels
- Sponge Effect descriptions
- Recall notifications
- Orders page
- Financial Intelligence labels

### 24.3 Arabic (RTL) Layout Adjustments
- `<html dir="rtl">` applied globally
- Navigation tabs reverse order
- Login tabs use `flex-direction: row-reverse`
- Recall banner body uses `text-align: right`
- Number formats maintain LTR (e.g. SAR values)
- Arabic font loaded from Google Fonts

### 24.4 Language Toggle
- Pill button in top-right of all pages
- **EN** / **عربي** labels
- Instant switch (no page reload)

---

## 25. API Reference

### Admin APIs
| Method | Path | Description |
|---|---|---|
| GET | `/admin` | Overview dashboard |
| GET | `/admin/inventory` | Inventory management |
| POST | `/admin/inventory/add` | Add single lot |
| POST | `/admin/inventory/import` | Bulk CSV import |
| GET | `/admin/inventory/template` | Download CSV template |
| POST | `/admin/inventory/:lotId/recall` | Initiate SFDA recall |
| GET | `/admin/branches` | Branch monitor |
| POST | `/admin/branches/add` | Add new branch |
| POST | `/admin/branches/:id/update` | Update branch sensors |
| GET | `/admin/finance` | Finance tab |
| GET | `/admin/finance/zatca-export` | Download ZATCA CSV |
| GET | `/admin/requests` | Bean requests |
| POST | `/admin/requests/:id/confirm` | Confirm request |
| POST | `/admin/requests/:id/dispatch` | Dispatch + update tier |
| POST | `/admin/requests/:id/cancel` | Cancel request |
| POST | `/admin/interests/:id/seen` | Mark interest seen |
| POST | `/admin/interests/:id/schedule` | Schedule roast |

### Finance APIs
| Method | Path | Description |
|---|---|---|
| GET | `/api/finance/snapshot` | Live portfolio snapshot (Bronze/Silver/Gold) |
| POST | `/api/finance/set-tier-margins` | Update tier margins |
| POST | `/api/finance/set-margin` | Update single margin |
| POST | `/api/finance/set-exchange-buffer` | Update exchange buffer |
| POST | `/api/finance/exchange-rates/refresh` | Fetch live XE rates |

### Cafe APIs
| Method | Path | Description |
|---|---|---|
| GET | `/cafe` | Cafe portal (requires `?cid=CAF-XXX`) |
| POST | `/cafe/request` | Submit bean request |
| POST | `/cafe/roasting-interest` | Submit pre-order interest |
| GET | `/cafe/orders` | Order history |
| POST | `/api/cafe/tier-nudge` | Get tier nudge status + WhatsApp copy |
| GET | `/api/recalls/:cafeId` | Active recalls for cafe |

### Exchange APIs
| Method | Path | Description |
|---|---|---|
| GET | `/exchange` | Exchange hub |
| GET | `/exchange/catalog` | Global catalog (optional `?type=SPOT|FORWARD`) |
| GET | `/exchange/climate/:lotId` | Climate passport |
| GET | `/exchange/shiptrack/:lotId` | Ship tracker |
| GET | `/exchange/forward/:contractId` | Forward contract detail |
| GET | `/exchange/analytics` | Analytics dashboard |
| GET | `/api/exchange/lots` | JSON: all exchange lots |
| GET | `/api/exchange/vendors` | JSON: all vendors |
| GET | `/api/exchange/buyers` | JSON: all buyers |
| GET | `/api/exchange/contracts` | JSON: all contracts |
| POST | `/api/exchange/rate-lock` | Create 60s rate lock |
| GET | `/api/exchange/rate-lock/:id` | Check rate lock validity |
| POST | `/api/exchange/iot-update` | Update lot IoT sensor data |
| POST | `/api/exchange/forward/:id/milestone` | Trigger milestone payment |
| POST | `/api/exchange/forward/:id/sas` | Update SAS status |
| GET | `/api/exchange/analytics` | JSON: analytics data |

### Vendor & Buyer APIs
| Method | Path | Description |
|---|---|---|
| GET | `/vendor` | Vendor portal hub |
| GET | `/vendor/register` | Registration form |
| POST | `/vendor/register` | Create vendor |
| GET | `/vendor/lots/new` | New lot form |
| POST | `/vendor/lots/new` | Create exchange lot |
| GET | `/buyer` | Buyer portal hub |
| GET | `/buyer/register` | Registration form |
| POST | `/buyer/register` | Create buyer |
| GET | `/buyer/contract` | Contracting interface |
| POST | `/buyer/contract` | Submit contract + generate invoice |
| GET | `/buyer/invoice/:uuid` | HTML invoice view |
| GET | `/buyer/invoice/:uuid/xml` | ZATCA UBL XML download |

### Utility APIs
| Method | Path | Description |
|---|---|---|
| GET | `/api/lots` | All roastery lots |
| GET | `/api/lots/optimal` | OPTIMAL status lots only |
| GET | `/api/branches` | All branches |
| GET | `/api/requests` | All bean requests |
| GET | `/api/interests` | All roasting interests |
| GET | `/api/catalog` | Catalog origins |
| GET | `/api/weather` | KSA environmental live feed |
| GET | `/api/sponge` | Sponge effect data per branch |
| POST | `/api/sponge/simulate` | Simulate sponge for any humidity |

---

## 26. Business Constants & Configuration

| Constant | Value | Description |
|---|---|---|
| `BULK_ORDER_THRESHOLD_BAGS` | 10 bags | Minimum bags for bulk discount trigger |
| `BAG_SIZE_KG` | 60 kg | Standard coffee sack weight |
| `BULK_DISCOUNT_PCT` | 10% | Extra discount for bulk orders |
| `TIER_NUDGE_THRESHOLD` | 50 kg | Proximity to next tier that triggers nudge alert |
| `SPONGE_BASELINE_COEFFICIENT` | 0.82 | Standard roasting yield (18% shrinkage) |
| `SPONGE_RH_HIGH_THRESHOLD` | 70% | RH above this → moisture absorption (+0.5%) |
| `SPONGE_RH_LOW_THRESHOLD` | 20% | RH below this → evaporation loss (−0.3%) |
| `SPONGE_HIGH_DELTA` | +0.005 | Yield increase in high humidity |
| `SPONGE_LOW_DELTA` | −0.003 | Yield decrease in low humidity |
| `ZATCA_VAT_RATE` | 0.15 (15%) | Saudi VAT rate for ZATCA invoices |
| `rateLockWindowSecs` | 60 seconds | Duration of SAR rate execution lock |
| Default Bronze Margin | 40% | Tier margin for Bronze buyers |
| Default Silver Margin | 35% | Tier margin for Silver buyers |
| Default Gold Margin | 28% | Tier margin for Gold buyers (best price) |

### Tier Thresholds
| Tier | Min Kg | Max Kg | Base Discount |
|---|---|---|---|
| Bronze | 0 | 500 | 0% |
| Silver | 501 | 2,000 | 3% |
| Gold | 2,001 | ∞ | 5% |

---

## 27. Demo Credentials & Test Data

### Login Credentials
| Portal | Username | Password | Redirects To |
|---|---|---|---|
| Admin | `admin` | `qabban2026` | `/admin` |
| Cafe — Al Nokhba | `alnokhba` | `cafe123` | `/cafe?cid=CAF-001` |
| Cafe — Qahwa Al Bahr | `qahwa_bahr` | `cafe123` | `/cafe?cid=CAF-002` |
| Cafe — Pearl Roast | `pearl_roast` | `cafe123` | `/cafe?cid=CAF-003` |

### Demo Cafe Clients
| ID | Name | City | Tier | Lifetime KG | Status |
|---|---|---|---|---|---|
| CAF-001 | Al Nokhba Specialty | Riyadh | 🥇 Gold | 2,400 kg | MAX TIER |
| CAF-002 | Qahwa Al Bahr | Jeddah | 🥈 Silver | 1,965 kg | ⚡ 36 kg from Gold |
| CAF-003 | Pearl Roast Café | Dammam | 🥉 Bronze | 460 kg | ⚡ 41 kg from Silver |

### Demo Branches
| Name | City | Climate | Current RH% | Risk |
|---|---|---|---|---|
| Riyadh Central | Riyadh | Inland | ~40% | LOW |
| Jeddah Coastal | Jeddah | Coastal | ~68% | HIGH |
| Dammam Port | Dammam | Coastal | ~72% | HIGH |

### Demo Exchange Lots (Selection)
| Origin | Type | Price (USD/kg) | SAS | Harvest Date |
|---|---|---|---|---|
| Ethiopia Yirgacheffe | SPOT | — | No | — |
| Colombia Huila | SPOT | — | Yes | — |
| Kenya AA | SPOT | — | No | — |
| Yemen Haraz | FORWARD | — | Yes | 2026-09 |
| Ethiopia Sidama | FORWARD | — | Yes | 2026-07 |

### Key API Test Calls
```bash
# Finance snapshot
curl http://localhost:3000/api/finance/snapshot

# Tier nudge for CAF-002
curl -X POST http://localhost:3000/api/cafe/tier-nudge \
  -H "Content-Type: application/json" -d '{"cafeId":"CAF-002"}'

# ZATCA CSV export
curl http://localhost:3000/admin/finance/zatca-export -o zatca-export.csv

# Exchange analytics
curl http://localhost:3000/api/exchange/analytics

# Sponge simulation (RH 85%)
curl -X POST http://localhost:3000/api/sponge/simulate \
  -H "Content-Type: application/json" -d '{"humidity":85}'
```

---

*QABBAN OS — User Manual v2.0 — March 2026*
*Built for Saudi specialty coffee roasteries · Powered by Hono + Cloudflare Pages*
