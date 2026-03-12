import { Hono } from 'hono'
import {
  coffeeLots,
  branches,
  cafeClients,
  beanRequests,
  roastingInterests,
  applyRoastShrinkage,
  applyRoastShrinkageWithSponge,
  calcLiveBalance,
  getFifoLot,
  CATALOG_ORIGINS,
  CLIMATE_PRESETS,
  classifyRiskForPreset,
  calcSpongeCoefficient,
  SPONGE_BASELINE_COEFFICIENT,
  SPONGE_RH_HIGH_THRESHOLD,
  SPONGE_RH_LOW_THRESHOLD,
  SPONGE_HIGH_DELTA,
  SPONGE_LOW_DELTA,
  calcWholesalePrice,
  calcPortfolioFinancials,
  calcZatcaShrinkageReport,
  defaultTargetMargin,
  setDefaultTargetMargin,
  tierMargins,
  setTierMargins,
  marginForTier,
  type SpongeCoeffResult,
  type CoffeeLot,
  type Branch,
  type ClimateType,
  type RoastingInterest,
  type PortfolioFinancials,
  type ClientTier,
  type ZatcaShrinkageReport,
  // ── Global Exchange ──────────────────────────────────────────────
  globalVendors,
  globalLots,
  globalBuyers,
  globalContracts,
  forwardContracts,
  zatcaInvoices,
  rateLocks,
  calcLandedPrice,
  generateZatcaInvoice,
  createRateLock,
  getActiveLock,
  exchangeRateBuffer,
  setExchangeRateBuffer,
  lastKnownUsdToSar,
  lastKnownEurToSar,
  samaReferenceRate,
  exchangeRateUpdatedAt,
  updateExchangeRates,
  usdToSarBuffered,
  shippingEstimateBaseSar,
  SAUDI_CUSTOMS_RATE,
  ZATCA_VAT_RATE,
  QABBAN_PLATFORM_FEE,
  // ── Coffee Miles Loyalty ─────────────────────────────────────────
  COFFEE_MILES_TIERS,
  BULK_ORDER_THRESHOLD_BAGS,
  BAG_SIZE_KG,
  BULK_DISCOUNT_PCT,
  getCoffeeMilesTier,
  getTierBaseDiscount,
  kgToNextTier,
  calcHybridDiscount,
  TIER_NUDGE_THRESHOLD,
  getTierNudgeStatus,
  type TierNudgeStatus,
  type CoffeeMilesTier,
  type GlobalVendor,
  type GlobalLot,
  type GlobalBuyer,
  type ForwardContract,
  type ClimateLogEntry,
  type ShipTrackerData,
  type RateLock,
  type LandedPriceBreakdown,
  type ZatcaInvoice,
  // ── Qabban Pulse ─────────────────────────────────────────────────
  wasteLogs,
  pulseRecons,
  pulseId,
  calcTheoreticalUsage,
  calcFinancialLoss,
  PULSE_BEAN_MAP,
  type WasteLog,
  type PulseReconciliation,
  // ── Hybrid Humidity / IoT ─────────────────────────────────────
  resolveActiveRH,
  calcSpongeCoefficientForBranch,
  IOT_STALE_THRESHOLD_MS,
  type HumiditySource,
  type HybridSpongeResult,
} from './data'

const app = new Hono()

// ══════════════════════════════════════════════════════════════════
//  SHARED HTML SHELL
// ══════════════════════════════════════════════════════════════════

const shell = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — Qabban OS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg-0:#0a0a0a; --bg-1:#111111; --bg-2:#181818; --bg-3:#222222; --bg-4:#2a2a2a;
      --amber:#f59e0b; --amber-dim:#b45309;
      --amber-glow:rgba(245,158,11,0.12); --amber-glow2:rgba(245,158,11,0.25);
      --border-amber:rgba(245,158,11,0.3);
      --green:#10b981; --green-dim:rgba(16,185,129,0.15);
      --red:#ef4444; --red-dim:rgba(239,68,68,0.15);
      --orange:#f97316; --orange-dim:rgba(249,115,22,0.15);
      --blue:#3b82f6;
      --text-pri:#f5f5f5; --text-sec:#a3a3a3; --text-muted:#525252;
      --border:#2a2a2a;
      --font-mono:'IBM Plex Mono',monospace;
      --font-sans:'Inter',sans-serif;
      --radius:4px; --radius-lg:8px;
    }
    html { font-size:16px; }
    body { background:var(--bg-0); color:var(--text-pri); font-family:var(--font-sans); min-height:100vh; line-height:1.6; }
    a { color:var(--amber); text-decoration:none; }
    a:hover { text-decoration:underline; }
    ::-webkit-scrollbar { width:6px; height:6px; }
    ::-webkit-scrollbar-track { background:var(--bg-1); }
    ::-webkit-scrollbar-thumb { background:var(--bg-4); border-radius:3px; }
    ::-webkit-scrollbar-thumb:hover { background:var(--amber-dim); }

    /* ── TOPBAR ── */
    .topbar {
      position:sticky; top:0; z-index:100;
      background:var(--bg-1); border-bottom:1px solid var(--border);
      display:flex; align-items:center; justify-content:space-between;
      padding:0 24px; height:58px;
    }
    .topbar-brand { display:flex; align-items:center; gap:10px; }
    .topbar-logo {
      width:36px; height:36px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }
    .topbar-logo img {
      width:36px; height:36px;
      object-fit:contain;
      filter: drop-shadow(0 0 4px rgba(245,158,11,0.55));
    }
    .topbar-title { font-family:var(--font-mono); font-size:15px; font-weight:700; color:var(--text-pri); letter-spacing:1px; }
    .topbar-title span { color:var(--amber); }
    .topbar-right { display:flex; align-items:center; gap:16px; }
    .topbar-badge {
      font-family:var(--font-mono); font-size:10px; font-weight:500;
      padding:3px 8px; border-radius:2px; text-transform:uppercase; letter-spacing:.5px;
    }
    .badge-admin { background:var(--amber-glow); color:var(--amber); border:1px solid var(--border-amber); }
    .badge-cafe  { background:rgba(59,130,246,.12); color:var(--blue); border:1px solid rgba(59,130,246,.3); }
    .topbar-user { font-size:13px; color:var(--text-sec); display:flex; align-items:center; gap:6px; }
    .btn-logout {
      font-family:var(--font-mono); font-size:11px;
      padding:5px 12px; border-radius:var(--radius);
      background:transparent; color:var(--text-muted);
      border:1px solid var(--border); cursor:pointer; transition:all .2s;
    }
    .btn-logout:hover { border-color:var(--red); color:var(--red); }

    /* ── LAYOUT ── */
    .layout { display:flex; min-height:calc(100vh - 58px); }
    .sidebar {
      width:220px; min-width:220px;
      background:var(--bg-1); border-right:1px solid var(--border);
      padding:20px 0;
    }
    .sidebar-section { margin-bottom:24px; }
    .sidebar-label {
      font-family:var(--font-mono); font-size:9px;
      text-transform:uppercase; letter-spacing:1.5px;
      color:var(--text-muted); padding:0 20px; margin-bottom:6px;
    }
    .sidebar-link {
      display:flex; align-items:center; gap:10px;
      padding:9px 20px; font-size:13px; color:var(--text-sec);
      cursor:pointer; transition:all .2s; text-decoration:none;
      border-left:2px solid transparent;
    }
    .sidebar-link:hover { color:var(--text-pri); background:var(--bg-2); text-decoration:none; }
    .sidebar-link.active { color:var(--amber); background:var(--amber-glow); border-left-color:var(--amber); }
    .sidebar-link i { width:16px; text-align:center; font-size:12px; }
    .main { flex:1; padding:28px; overflow-x:hidden; }
    .page-header { margin-bottom:28px; }
    .page-title { font-family:var(--font-mono); font-size:20px; font-weight:700; color:var(--text-pri); letter-spacing:.5px; }
    .page-title span { color:var(--amber); }
    .page-sub { font-size:13px; color:var(--text-muted); margin-top:4px; }

    /* ── CARDS ── */
    .card { background:var(--bg-1); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; }
    .card-title {
      font-family:var(--font-mono); font-size:11px;
      text-transform:uppercase; letter-spacing:1px;
      color:var(--text-muted); margin-bottom:12px;
      display:flex; align-items:center; gap:8px;
    }
    .card-title::after { content:''; flex:1; height:1px; background:var(--border); }

    /* ── STAT GRID ── */
    .stat-grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); }
    .stat-card {
      background:var(--bg-2); border:1px solid var(--border);
      border-radius:var(--radius-lg); padding:18px; transition:border-color .2s;
    }
    .stat-card:hover { border-color:var(--border-amber); }
    .stat-label { font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.8px; }
    .stat-value { font-family:var(--font-mono); font-size:28px; font-weight:700; color:var(--amber); margin:6px 0 2px; }
    .stat-unit { font-size:11px; color:var(--text-sec); }

    /* ── TABLE ── */
    .table-wrap { overflow-x:auto; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th {
      text-align:left; padding:10px 14px;
      font-family:var(--font-mono); font-size:10px; font-weight:500;
      text-transform:uppercase; letter-spacing:1px;
      color:var(--text-muted); border-bottom:1px solid var(--border); white-space:nowrap;
    }
    td { padding:12px 14px; border-bottom:1px solid var(--bg-3); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:var(--bg-2); }
    .mono { font-family:var(--font-mono); font-size:12px; }

    /* ── BADGES ── */
    .badge {
      display:inline-flex; align-items:center; gap:5px;
      font-family:var(--font-mono); font-size:10px; font-weight:600;
      padding:3px 8px; border-radius:2px; text-transform:uppercase; letter-spacing:.5px; white-space:nowrap;
    }
    .badge::before { content:''; width:5px; height:5px; border-radius:50%; }
    .badge-OPTIMAL  { background:var(--green-dim); color:var(--green); border:1px solid rgba(16,185,129,.3); }
    .badge-OPTIMAL::before  { background:var(--green); }
    .badge-MONITOR  { background:var(--orange-dim); color:var(--orange); border:1px solid rgba(249,115,22,.3); }
    .badge-MONITOR::before  { background:var(--orange); }
    .badge-CONFIRMED  { background:var(--green-dim); color:var(--green); border:1px solid rgba(16,185,129,.3); }
    .badge-CONFIRMED::before { background:var(--green); }
    .badge-CRITICAL::before { background:var(--red); animation:pulse 1.2s infinite; }
    .badge-LOW      { background:var(--green-dim); color:var(--green); border:1px solid rgba(16,185,129,.3); }
    .badge-LOW::before      { background:var(--green); }
    .badge-MODERATE { background:var(--orange-dim); color:var(--orange); border:1px solid rgba(249,115,22,.3); }
    .badge-MODERATE::before { background:var(--orange); }
    .badge-HIGH     { background:rgba(239,68,68,.1); color:#fb923c; border:1px solid rgba(249,115,22,.4); }
    .badge-HIGH::before     { background:#fb923c; }
    /* ── Request-status badge colours ──
       PENDING   = amber  (needs attention)
       CONFIRMED = green  (unchanged)
       DISPATCHED= green  (fulfilled)
       CANCELLED = grey   (inactive / audit)  */
    .badge-PENDING    { background:var(--amber-glow); color:var(--amber); border:1px solid var(--border-amber); }
    .badge-PENDING::before  { background:var(--amber); animation:pulse 1.8s ease-in-out infinite; }
    .badge-DISPATCHED { background:var(--green-dim); color:var(--green); border:1px solid rgba(16,185,129,.3); }
    .badge-DISPATCHED::before { background:var(--green); }
    .badge-CANCELLED { background:rgba(63,63,70,0.40); color:#71717a; border:1px solid rgba(113,113,122,0.20); }
    .badge-CANCELLED::before { background:#52525b; }
    /* OUT OF STOCK — muted grey */
    .badge-OOS { background:rgba(63,63,70,0.30); color:#a1a1aa; border:1px solid rgba(113,113,122,0.25); letter-spacing:.8px; }
    .badge-OOS::before { background:#71717a; }
    /* Roasting Interest (pre-order) badge */
    .badge-interest-NEW       { background:rgba(59,130,246,0.12); color:#60a5fa; border:1px solid rgba(59,130,246,0.30); }
    .badge-interest-NEW::before { background:#60a5fa; animation:pulse 1.8s ease-in-out infinite; }
    .badge-interest-SEEN      { background:rgba(245,158,11,0.10); color:var(--amber); border:1px solid var(--border-amber); }
    .badge-interest-SEEN::before { background:var(--amber); }
    .badge-interest-SCHEDULED { background:var(--green-dim); color:var(--green); border:1px solid rgba(16,185,129,.3); }
    .badge-interest-SCHEDULED::before { background:var(--green); }
    /* RECALLED — bold red, pulsing */
    .badge-RECALLED { background:rgba(239,68,68,0.15); color:var(--red); border:1px solid rgba(239,68,68,0.45); }
    .badge-RECALLED::before { background:var(--red); animation:pulse 1s ease-in-out infinite; }

    /* ── INVENTORY LEDGER — row & thumbnail constraints ──────── */
    /* Hard cap on row height so images never stretch rows */
    .inv-table tbody tr { max-height:60px; }
    .inv-table td { padding:8px 12px; vertical-align:middle; max-height:60px; overflow:hidden; }
    .inv-table th { padding:9px 12px; }
    /* Label column: tiny 40×40 thumbnail, cover crop, amber border */
    .lot-thumb {
      display:block;
      width:40px; height:40px;
      min-width:40px; min-height:40px;
      max-width:40px; max-height:40px;
      object-fit:cover;
      border-radius:4px;
      border:1.5px solid rgba(245,158,11,0.45);
      cursor:pointer;
      transition:border-color .18s, box-shadow .18s;
      background:var(--bg-1);
    }
    .lot-thumb:hover {
      border-color:#F59E0B;
      box-shadow:0 0 10px rgba(245,158,11,0.55);
    }
    .label-cell {
      text-align:center; vertical-align:middle;
      padding:6px 10px !important;
      width:56px; min-width:56px;
    }
    /* Grey placeholder when no photo exists */
    .no-photo-badge {
      display:inline-flex; align-items:center; justify-content:center;
      width:40px; height:40px;
      border-radius:4px;
      background:var(--bg-3);
      border:1px dashed rgba(113,113,122,0.35);
      color:rgba(113,113,122,0.5);
      font-size:16px;
    }

    /* ── Recalled lot row — strong red tint ── */
    .tr-recalled td {
      background: rgba(239,68,68,0.04) !important;
    }
    .tr-recalled:hover td {
      background: rgba(239,68,68,0.09) !important;
    }
    /* Recalled lot card overlay */
    .lot-card.recalled {
      border-color: rgba(239,68,68,0.50) !important;
      opacity: 0.70;
      pointer-events: none;
    }
    .lot-card.recalled::after {
      content: 'RECALLED — BLOCKED';
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-mono); font-size: 13px; font-weight: 700;
      color: var(--red); letter-spacing: 2px;
      background: rgba(0,0,0,0.55);
      border-radius: var(--radius-lg);
      pointer-events: none;
    }

    /* ── SFDA Recall modal ── */
    .recall-modal { background:var(--bg-1); border:1px solid rgba(239,68,68,0.55); border-radius:var(--radius-lg); padding:28px; width:480px; max-width:95vw; }
    .recall-modal-title { font-family:var(--font-mono); font-size:14px; font-weight:700; color:var(--red); margin-bottom:8px; display:flex; align-items:center; gap:8px; }
    .recall-modal-sub { font-size:12px; color:var(--text-muted); margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--bg-3); }
    .btn-recall-confirm {
      flex:2; padding:10px;
      font-family:var(--font-mono); font-size:12px; font-weight:700;
      background:var(--red); color:white;
      border:none; border-radius:var(--radius); cursor:pointer; transition:all .2s; letter-spacing:.5px;
    }
    .btn-recall-confirm:hover { background:#dc2626; }
    .btn-recall-confirm:disabled { background:var(--bg-4); color:var(--text-muted); cursor:not-allowed; }

    /* ── Cafe Recall Urgent Banner ── */
    .recall-urgent-banner {
      position: fixed; top: 70px; left: 0; right: 0; z-index: 999;
      background: rgba(239,68,68,0.97);
      border-bottom: 2px solid #dc2626;
      padding: 14px 24px;
      display: flex; align-items: flex-start; gap: 14px;
      animation: recallSlideIn 0.4s ease-out;
      box-shadow: 0 4px 32px rgba(239,68,68,0.5);
    }
    @keyframes recallSlideIn {
      from { transform: translateY(-100%); opacity: 0; }
      to   { transform: translateY(0);     opacity: 1; }
    }
    .recall-banner-icon {
      font-size: 24px; color: white; flex-shrink: 0; margin-top: 2px;
      animation: pulse 1s ease-in-out infinite;
    }
    .recall-banner-body { flex: 1; }
    .recall-banner-title {
      font-family: var(--font-mono); font-size: 13px; font-weight: 700;
      color: white; letter-spacing: 1px; margin-bottom: 4px;
    }
    .recall-banner-lot {
      font-family: var(--font-mono); font-size: 11px; color: rgba(255,255,255,0.85);
      margin-bottom: 6px;
    }
    .recall-banner-instructions {
      font-size: 13px; color: white; line-height: 1.5;
      padding: 8px 12px;
      background: rgba(0,0,0,0.25); border-radius: var(--radius);
      border-left: 3px solid rgba(255,255,255,0.5);
    }
    .recall-banner-close {
      background: transparent; border: 1px solid rgba(255,255,255,0.4);
      border-radius: var(--radius); padding: 6px 12px;
      color: white; font-family: var(--font-mono); font-size: 11px;
      cursor: pointer; flex-shrink: 0; transition: all .2s;
    }
    .recall-banner-close:hover { background: rgba(0,0,0,0.3); }

    /* ── Cancelled row — dimmed audit style ── */
    .tr-cancelled td {
      opacity:0.45;
      background: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 6px,
        rgba(63,63,70,0.08) 6px,
        rgba(63,63,70,0.08) 7px
      ) !important;
    }
    .tr-cancelled:hover td {
      background: rgba(63,63,70,0.18) !important;
      opacity:0.60;
    }
    .tr-cancelled .audit-tag {
      font-family:var(--font-mono); font-size:9px;
      letter-spacing:1px; text-transform:uppercase;
      color:#52525b; padding:2px 6px;
      border:1px solid rgba(113,113,122,0.20);
      border-radius:2px; white-space:nowrap;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    /* ── BRANCH CARDS ── */
    .branch-grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); }
    .branch-card {
      background:var(--bg-2); border:1px solid var(--border);
      border-radius:var(--radius-lg); padding:20px;
      position:relative; overflow:hidden; transition:border-color .2s;
    }
    .branch-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
    .branch-card.risk-LOW::before      { background:var(--green); }
    .branch-card.risk-MODERATE::before { background:var(--orange); }
    .branch-card.risk-HIGH::before     { background:#fb923c; }
    .branch-card.risk-CRITICAL::before { background:var(--red); }
    .branch-card:hover { border-color:var(--border-amber); }
    .branch-name { font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--text-pri); margin-bottom:4px; }
    .branch-id { font-family:var(--font-mono); font-size:10px; color:var(--text-muted); margin-bottom:14px; }
    .branch-metrics { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
    .branch-metric-label { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.6px; }
    .branch-metric-value { font-family:var(--font-mono); font-size:22px; font-weight:700; margin-top:2px; }
    .metric-humidity { color:var(--amber); }
    .metric-temp { color:var(--blue); }
    .branch-footer { display:flex; justify-content:space-between; align-items:center; }
    .branch-footer-info { font-size:11px; color:var(--text-muted); }
    .humidity-bar { margin-top:8px; height:4px; background:var(--bg-4); border-radius:2px; overflow:hidden; }
    .humidity-fill { height:100%; border-radius:2px; transition:width .5s; }

    /* ── LOT CARDS ── */
    .lot-grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); }
    .lot-card {
      background:var(--bg-2); border:1px solid var(--border);
      border-radius:var(--radius-lg); padding:20px;
      transition:all .25s;
    }
    .lot-card:hover { border-color:var(--border-amber); transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,.4); }
    /* OUT OF STOCK lot card — visible but dimmed, no hover lift */
    .lot-card.oos {
      opacity: 0.72;
      border-color: rgba(113,113,122,0.25);
    }
    .lot-card.oos:hover { transform:none; box-shadow:none; border-color:rgba(113,113,122,0.45); }
    /* Request Roasting button — blue/interest tone */
    .btn-roasting {
      width:100%;
      font-family:var(--font-mono); font-size:12px; font-weight:600;
      padding:10px 16px; border-radius:var(--radius);
      background:rgba(59,130,246,0.12); color:#60a5fa;
      border:1px solid rgba(59,130,246,0.30);
      cursor:pointer; transition:all .2s;
      display:flex; align-items:center; justify-content:center; gap:8px;
    }
    .btn-roasting:hover { background:rgba(59,130,246,0.22); border-color:rgba(59,130,246,0.55); }
    .lot-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
    .lot-id { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); }
    .lot-origin { font-size:15px; font-weight:600; color:var(--text-pri); margin-top:2px; }
    .lot-variety { font-size:12px; color:var(--text-sec); margin-top:1px; }
    .lot-divider { height:1px; background:var(--border); margin:14px 0; }
    .lot-metrics { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .lot-metric-label { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.5px; }
    .lot-metric-value { font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--amber); margin-top:2px; }
    .lot-metric-sub { font-size:10px; color:var(--text-muted); }
    .flavor-tags { display:flex; flex-wrap:wrap; gap:5px; margin:12px 0; }
    .flavor-tag { font-size:10px; padding:2px 7px; background:var(--bg-3); border:1px solid var(--border); border-radius:2px; color:var(--text-sec); }
    .lot-footer { margin-top:14px; }
    .btn-request {
      width:100%;
      font-family:var(--font-mono); font-size:12px; font-weight:600;
      padding:10px 16px; border-radius:var(--radius);
      background:var(--amber-glow); color:var(--amber);
      border:1px solid var(--border-amber);
      cursor:pointer; transition:all .2s;
      display:flex; align-items:center; justify-content:center; gap:8px;
    }
    .btn-request:hover { background:var(--amber); color:var(--bg-0); }

    /* ── SCORE BAR ── */
    .score-bar { display:flex; align-items:center; gap:8px; }
    .score-track { flex:1; height:4px; background:var(--bg-4); border-radius:2px; overflow:hidden; }
    .score-fill { height:100%; background:var(--amber); border-radius:2px; }
    .score-num { font-family:var(--font-mono); font-size:12px; color:var(--amber); min-width:26px; }

    /* ── WEIGHT BLOCK ── */
    .weight-block { display:flex; align-items:center; gap:6px; font-family:var(--font-mono); font-size:12px; }
    .weight-green { color:var(--text-sec); }
    .weight-arrow { color:var(--text-muted); }
    .weight-roast { color:var(--amber); font-weight:600; }

    /* ── ALERTS ── */
    .alert {
      padding:12px 16px; border-radius:var(--radius);
      font-size:13px; margin-bottom:16px;
      display:flex; align-items:center; gap:10px;
    }
    .alert-warning  { background:rgba(249,115,22,.1); border:1px solid rgba(249,115,22,.3); color:#fb923c; }
    .alert-critical { background:var(--red-dim); border:1px solid rgba(239,68,68,.3); color:var(--red); }
    .alert-success  { background:var(--green-dim); border:1px solid rgba(16,185,129,.3); color:var(--green); }

    /* ── NOTIFICATION BELL ── */
    .notif-btn {
      position:relative; background:transparent; border:1px solid var(--border);
      border-radius:var(--radius); padding:7px 10px;
      color:var(--text-muted); cursor:pointer; transition:all .2s; text-decoration:none;
    }
    .notif-btn:hover { border-color:var(--border-amber); color:var(--amber); }
    .notif-count {
      position:absolute; top:-5px; right:-5px;
      background:var(--red); color:white;
      font-family:var(--font-mono); font-size:9px; font-weight:700;
      width:16px; height:16px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
    }

    /* ── MODAL ── */
    .modal-overlay {
      display:none; position:fixed; inset:0; z-index:200;
      background:rgba(0,0,0,.7); backdrop-filter:blur(4px);
      align-items:center; justify-content:center;
    }
    .modal-overlay.open { display:flex; }
    .modal { background:var(--bg-1); border:1px solid var(--border-amber); border-radius:var(--radius-lg); padding:28px; width:440px; max-width:95vw; }
    .modal-title { font-family:var(--font-mono); font-size:14px; font-weight:700; color:var(--text-pri); margin-bottom:20px; display:flex; align-items:center; gap:8px; }
    .modal-title i { color:var(--amber); }
    .modal-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--bg-3); font-size:13px; }
    .modal-row:last-of-type { border-bottom:none; }
    .modal-row-label { color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:.5px; }
    .modal-row-val { font-family:var(--font-mono); color:var(--text-pri); }
    .modal-actions { display:flex; gap:10px; margin-top:20px; }
    .btn-cancel {
      flex:1; padding:10px;
      font-family:var(--font-mono); font-size:12px;
      background:transparent; color:var(--text-muted);
      border:1px solid var(--border); border-radius:var(--radius); cursor:pointer; transition:all .2s;
    }
    .btn-cancel:hover { border-color:var(--red); color:var(--red); }
    .btn-confirm {
      flex:2; padding:10px;
      font-family:var(--font-mono); font-size:12px; font-weight:700;
      background:var(--amber); color:var(--bg-0);
      border:none; border-radius:var(--radius); cursor:pointer; transition:all .2s; letter-spacing:.5px;
    }
    .btn-confirm:hover { background:#d97706; }
    .form-group { margin-bottom:16px; }
    .form-label { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.8px; margin-bottom:6px; display:block; }
    .form-input {
      width:100%; padding:10px 14px;
      background:var(--bg-2); border:1px solid var(--border);
      border-radius:var(--radius); color:var(--text-pri);
      font-family:var(--font-mono); font-size:13px;
      outline:none; transition:border-color .2s;
    }
    .form-input:focus { border-color:var(--amber); }
    .form-input::placeholder { color:var(--text-muted); }
    .form-textarea {
      width:100%; padding:10px 14px;
      background:var(--bg-2); border:1px solid var(--border);
      border-radius:var(--radius); color:var(--text-pri);
      font-family:var(--font-sans); font-size:13px;
      outline:none; transition:border-color .2s; resize:vertical; min-height:72px;
    }
    .form-textarea:focus { border-color:var(--amber); }

    /* ── LOGIN PAGE ── */
    .login-page {
      min-height:100vh; display:flex; align-items:center; justify-content:center;
      background:var(--bg-0);
      background-image:
        repeating-linear-gradient(0deg,transparent,transparent 39px,var(--bg-2) 39px,var(--bg-2) 40px),
        repeating-linear-gradient(90deg,transparent,transparent 39px,var(--bg-2) 39px,var(--bg-2) 40px);
    }
    .login-box {
      background:var(--bg-1); border:1px solid var(--border);
      border-radius:var(--radius-lg); padding:40px 36px; width:400px; max-width:95vw;
    }

    /* ── LOGO HEADER — official Qabban OS brand image ── */
    .login-logo-header {
      display:flex; flex-direction:column; align-items:center;
      gap:0; margin-bottom:28px; padding-top:4px;
    }
    .login-logo-img-wrap {
      width:140px; height:140px;
      position:relative;
      display:flex; align-items:center; justify-content:center;
      margin: 0 auto 4px;
    }
    /* Ambient glow halo behind the logo */
    .login-logo-img-wrap::before {
      content:'';
      position:absolute; inset:-12px;
      background: radial-gradient(ellipse at 50% 55%,
        rgba(245,158,11,0.22) 0%,
        rgba(245,158,11,0.08) 40%,
        transparent 70%);
      border-radius:50%;
      pointer-events:none;
    }
    .login-logo-img {
      width:130px; height:130px;
      object-fit:contain;
      position:relative; z-index:1;
      animation: logoFloat 5s ease-in-out infinite;
    }
    @keyframes logoFloat {
      0%,100% {
        transform:translateY(0px);
        filter: drop-shadow(0 0 10px rgba(245,158,11,0.55))
                drop-shadow(0 4px 20px rgba(245,158,11,0.25));
      }
      50% {
        transform:translateY(-5px);
        filter: drop-shadow(0 0 18px rgba(245,158,11,0.75))
                drop-shadow(0 8px 28px rgba(245,158,11,0.40));
      }
    }
    .login-brand-name {
      font-family:var(--font-mono); font-size:24px; font-weight:700;
      color:var(--text-pri); letter-spacing:2px; text-align:center;
      line-height:1; margin-top:2px;
    }
    .login-brand-name span { color:var(--amber); }
    .login-brand-sub {
      font-size:10px; color:var(--text-muted); margin-top:6px;
      letter-spacing:3px; text-transform:uppercase; text-align:center;
      font-family:var(--font-mono);
    }
    .login-brand-rule {
      width:48px; height:1px;
      background:linear-gradient(90deg,transparent,var(--border-amber),transparent);
      margin:10px auto 0;
    }
    .login-tabs { display:flex; margin-bottom:28px; border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
    .login-tab {
      flex:1; padding:8px; font-size:12px; font-family:var(--font-mono);
      text-align:center; cursor:pointer; background:var(--bg-2); color:var(--text-muted);
      border:none; transition:all .2s; letter-spacing:.5px;
    }
    .login-tab.active { background:var(--amber-glow); color:var(--amber); }
    .btn-primary {
      width:100%; padding:12px;
      font-family:var(--font-mono); font-size:13px; font-weight:700;
      letter-spacing:1px; text-transform:uppercase;
      background:var(--amber); color:var(--bg-0);
      border:none; border-radius:var(--radius); cursor:pointer;
      transition:all .2s; margin-top:8px;
    }
    .btn-primary:hover { background:#d97706; }
    .btn-primary:disabled { background:var(--bg-4); color:var(--text-muted); cursor:not-allowed; }
    .login-error {
      background:var(--red-dim); border:1px solid rgba(239,68,68,.3);
      border-radius:var(--radius); padding:10px 14px;
      font-size:12px; color:var(--red); margin-bottom:16px;
      display:none; align-items:center; gap:8px;
    }
    .login-hint {
      margin-top:20px; padding-top:16px; border-top:1px solid var(--border);
      font-size:11px; color:var(--text-muted); text-align:center;
    }
    .login-hint code { font-family:var(--font-mono); color:var(--amber); background:var(--amber-glow); padding:2px 5px; border-radius:2px; }

    /* ── MISC ── */
    .divider { height:1px; background:var(--border); margin:28px 0; }
    .empty-state { text-align:center; padding:48px 20px; color:var(--text-muted); font-size:13px; }
    .empty-state i { font-size:36px; color:var(--bg-4); margin-bottom:12px; display:block; }

    /* ── KSA ENVIRONMENTAL LIVE FEED ── */
    .env-feed-grid {
      display:grid; gap:14px;
      grid-template-columns:repeat(3,1fr);
    }
    @media(max-width:600px){ .env-feed-grid { grid-template-columns:1fr; } }

    .env-card {
      background:var(--bg-2);
      border:1px solid var(--border);
      border-radius:var(--radius-lg);
      padding:18px 16px 14px;
      position:relative; overflow:hidden;
      transition:border-color .3s, box-shadow .3s;
    }
    /* default ambient glow — very faint */
    .env-card::before {
      content:''; position:absolute; inset:0; border-radius:inherit;
      background: radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 70%);
      pointer-events:none;
    }
    /* ── DANGER state: amber pulse glow ── */
    .env-card.env-danger {
      border-color: rgba(245,158,11,0.55);
      box-shadow: 0 0 0 0 rgba(245,158,11,0.40);
      animation: envPulse 2.4s ease-in-out infinite;
    }
    .env-card.env-danger::before {
      background: radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.18) 0%, transparent 65%);
    }
    @keyframes envPulse {
      0%,100% { box-shadow: 0 0  6px 1px rgba(245,158,11,0.25), 0 0 0 0 rgba(245,158,11,0.20); }
      50%      { box-shadow: 0 0 22px 4px rgba(245,158,11,0.50), 0 0 40px 8px rgba(245,158,11,0.12); }
    }

    .env-city {
      font-family:var(--font-mono); font-size:11px; font-weight:600;
      letter-spacing:1.5px; text-transform:uppercase;
      color:var(--text-sec); margin-bottom:10px;
      display:flex; align-items:center; gap:6px;
    }
    .env-city-dot {
      width:6px; height:6px; border-radius:50%;
      background:var(--green); flex-shrink:0;
      animation: liveDot 2s ease-in-out infinite;
    }
    .env-card.env-danger .env-city-dot { background:var(--amber); }
    @keyframes liveDot {
      0%,100% { opacity:1; } 50% { opacity:0.3; }
    }

    .env-humidity-row {
      display:flex; align-items:flex-end; gap:6px; margin-bottom:6px;
    }
    .env-humidity-val {
      font-family:var(--font-mono); font-size:38px; font-weight:700;
      line-height:1; color:var(--amber);
    }
    .env-card.env-danger .env-humidity-val { color:#fbbf24; }
    .env-humidity-unit {
      font-family:var(--font-mono); font-size:14px;
      color:var(--text-muted); margin-bottom:6px;
    }

    .env-bar-wrap {
      height:4px; background:var(--bg-4); border-radius:2px;
      margin-bottom:8px; overflow:hidden;
    }
    .env-bar-fill {
      height:100%; border-radius:2px;
      transition:width 1s ease;
      background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
      background-size:300% 100%;
    }

    .env-meta-row {
      display:flex; justify-content:space-between; align-items:center;
      margin-bottom:4px;
    }
    .env-meta-label { font-size:11px; color:var(--text-muted); }
    .env-meta-val   { font-family:var(--font-mono); font-size:11px; color:var(--text-sec); }

    .env-alert-tag {
      display:inline-flex; align-items:center; gap:4px;
      font-family:var(--font-mono); font-size:9px; font-weight:700;
      letter-spacing:.8px; text-transform:uppercase;
      padding:2px 7px; border-radius:2px; margin-top:6px;
      background:rgba(245,158,11,0.12); color:var(--amber);
      border:1px solid rgba(245,158,11,0.35);
    }
    .env-alert-tag i { font-size:8px; }

    .env-source {
      font-size:9px; color:var(--text-muted);
      margin-top:10px; padding-top:8px;
      border-top:1px solid var(--bg-3);
      display:flex; align-items:center; gap:4px;
      letter-spacing:.3px; flex-wrap:wrap;
    }
    .env-source i { color:var(--amber); font-size:9px; }
    .env-source-live {
      font-family:var(--font-mono); font-weight:700;
      color:var(--green); letter-spacing:.6px; font-size:9px;
      text-transform:uppercase;
    }
    .env-source-time {
      font-family:var(--font-mono); font-size:9px; color:var(--text-muted);
    }

    .env-refresh-row {
      display:flex; align-items:flex-start; justify-content:space-between;
      margin-bottom:10px; gap:8px;
    }
    .env-last-updated {
      font-family:var(--font-mono); font-size:10px; color:var(--text-muted);
    }
    .env-refresh-btn {
      background:transparent; border:1px solid var(--border);
      border-radius:var(--radius); padding:4px 10px;
      font-family:var(--font-mono); font-size:10px;
      color:var(--text-muted); cursor:pointer; transition:all .2s;
      display:flex; align-items:center; gap:5px;
    }
    .env-refresh-btn:hover { border-color:var(--border-amber); color:var(--amber); }
    .env-refresh-btn.spinning i { animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    .env-skeleton {
      display:flex; flex-direction:column; gap:8px; padding:4px 0;
    }
    .env-skeleton-line {
      height:10px; border-radius:3px;
      background:linear-gradient(90deg,var(--bg-3) 25%,var(--bg-4) 50%,var(--bg-3) 75%);
      background-size:200% 100%;
      animation:shimmer 1.4s infinite;
    }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* ══ BULK IMPORT ══════════════════════════════════════════════ */
    /* Upload zone — dashed amber border, lights up on drag-over */
    .import-zone {
      border:2px dashed rgba(245,158,11,0.35);
      border-radius:var(--radius-lg);
      padding:32px 24px;
      text-align:center;
      cursor:pointer;
      transition:all .25s;
      background:var(--bg-2);
      position:relative;
    }
    .import-zone:hover,
    .import-zone.drag-over {
      border-color:var(--amber);
      background:rgba(245,158,11,0.06);
    }
    .import-zone input[type="file"] {
      position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%;
    }
    .import-zone-icon {
      font-size:32px; color:var(--amber); margin-bottom:10px; display:block;
    }
    .import-zone-label {
      font-family:var(--font-mono); font-size:13px; color:var(--text-sec);
      margin-bottom:4px;
    }
    .import-zone-sub {
      font-size:11px; color:var(--text-muted);
    }
    /* Template download pill */
    .import-template-link {
      display:inline-flex; align-items:center; gap:6px;
      font-family:var(--font-mono); font-size:11px;
      color:var(--amber); padding:5px 12px;
      border:1px solid var(--border-amber); border-radius:var(--radius);
      background:var(--amber-glow); text-decoration:none; transition:all .2s;
      white-space:nowrap;
    }
    .import-template-link:hover {
      background:var(--amber); color:var(--bg-0); text-decoration:none;
    }
    /* Column mapping grid */
    .import-map-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(200px,1fr));
      gap:12px;
      margin:14px 0;
    }
    /* Preview table — compact, scrollable */
    .import-preview-wrap {
      max-height:320px; overflow-y:auto;
      border:1px solid var(--border); border-radius:var(--radius);
      margin-top:16px;
    }
    .import-preview-wrap table thead th {
      position:sticky; top:0;
      background:var(--bg-3); color:var(--amber);
      font-family:var(--font-mono); font-size:10px;
      padding:7px 12px; white-space:nowrap;
    }
    .import-preview-wrap table tbody tr:nth-child(even) td {
      background:rgba(255,255,255,0.015);
    }
    /* Row validation states */
    .import-row-ok  td:first-child  { border-left:2px solid var(--green); }
    .import-row-err td:first-child  { border-left:2px solid var(--red); }
    .import-row-warn td:first-child { border-left:2px solid var(--orange); }
    /* Calculated column highlight */
    .import-calc-col { color:var(--amber); font-family:var(--font-mono); }
    /* Import progress bar */
    .import-progress-bar {
      height:4px; background:var(--bg-4); border-radius:2px;
      overflow:hidden; margin:10px 0;
    }
    .import-progress-fill {
      height:100%; background:var(--amber);
      border-radius:2px; transition:width .4s ease;
    }
    /* Import summary pills */
    .import-summary {
      display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;
    }
    .import-pill {
      font-family:var(--font-mono); font-size:11px; font-weight:600;
      padding:4px 10px; border-radius:var(--radius);
      display:inline-flex; align-items:center; gap:5px;
    }
    .import-pill-ok   { background:var(--green-dim);  color:var(--green);  border:1px solid rgba(16,185,129,.3); }
    .import-pill-skip { background:var(--orange-dim); color:var(--orange); border:1px solid rgba(249,115,22,.3); }
    .import-pill-err  { background:var(--red-dim);    color:var(--red);    border:1px solid rgba(239,68,68,.3);  }
    /* Section header with action buttons */
    .import-header-row {
      display:flex; align-items:center; justify-content:space-between;
      flex-wrap:wrap; gap:12px; margin-bottom:16px;
    }
    /* ══ END BULK IMPORT ══════════════════════════════════════════ */

    /* ── MOBILE NAV ── */
    .mobile-nav {
      display:none; position:fixed; bottom:0; left:0; right:0; z-index:100;
      background:var(--bg-1); border-top:1px solid var(--border); padding:8px 0;
    }
    .mobile-nav-items { display:flex; justify-content:space-around; }
    .mobile-nav-item {
      display:flex; flex-direction:column; align-items:center; gap:3px;
      font-size:10px; color:var(--text-muted); padding:4px 12px;
      background:transparent; border:none; cursor:pointer; text-decoration:none; transition:color .2s;
    }
    .mobile-nav-item.active { color:var(--amber); }
    .mobile-nav-item i { font-size:18px; }

    /* ── RESPONSIVE ── */
    @media (max-width:768px) {
      .sidebar { display:none; }
      .main { padding:16px; }
      .topbar { padding:0 16px; }
      .branch-grid { grid-template-columns:1fr; }
      .lot-grid { grid-template-columns:1fr; }
      .stat-grid { grid-template-columns:repeat(2,1fr); }
      .mobile-nav { display:block; }
      .main { padding-bottom:72px; }
    }

    /* ══ RTL / ARABIC LAYOUT ══════════════════════════════════════ */
    [dir="rtl"] body { font-family: 'IBM Plex Arabic', 'Noto Sans Arabic', 'Segoe UI', var(--font-sans); }
    [dir="rtl"] .topbar { flex-direction: row-reverse; }
    [dir="rtl"] .topbar-brand { flex-direction: row-reverse; }
    [dir="rtl"] .topbar-right { flex-direction: row-reverse; }
    [dir="rtl"] .layout { flex-direction: row-reverse; }
    [dir="rtl"] .sidebar { border-right: none; border-left: 1px solid var(--border); }
    [dir="rtl"] .sidebar-link { border-left: none; border-right: 2px solid transparent; flex-direction: row-reverse; }
    [dir="rtl"] .sidebar-link.active { border-left-color: transparent; border-right-color: var(--amber); }
    [dir="rtl"] .sidebar-label { text-align: right; }
    [dir="rtl"] .card-title { flex-direction: row-reverse; }
    [dir="rtl"] .card-title::after { display:none; }
    [dir="rtl"] .card-title::before { content:''; flex:1; height:1px; background:var(--border); }
    [dir="rtl"] table { direction: rtl; }
    [dir="rtl"] th, [dir="rtl"] td { text-align: right; }
    [dir="rtl"] .badge { flex-direction: row-reverse; }
    [dir="rtl"] .stat-grid { direction: rtl; }
    [dir="rtl"] .branch-grid { direction: rtl; }
    [dir="rtl"] .lot-grid { direction: rtl; }
    [dir="rtl"] .page-title { direction: rtl; text-align: right; }
    [dir="rtl"] .page-sub { direction: rtl; text-align: right; }
    [dir="rtl"] .alert { flex-direction: row-reverse; text-align: right; }
    [dir="rtl"] .mobile-nav-item { flex-direction: column; }
    [dir="rtl"] .modal-title { flex-direction: row-reverse; }
    [dir="rtl"] .modal-row { flex-direction: row-reverse; }
    [dir="rtl"] .modal-actions { flex-direction: row-reverse; }
    [dir="rtl"] .form-label { direction: rtl; }
    [dir="rtl"] .form-input, [dir="rtl"] .form-textarea { direction: rtl; text-align: right; }
    [dir="rtl"] .env-city { flex-direction: row-reverse; }
    [dir="rtl"] .env-meta-row { flex-direction: row-reverse; }
    [dir="rtl"] .env-refresh-row { flex-direction: row-reverse; }
    [dir="rtl"] .weight-block { flex-direction: row-reverse; }
    [dir="rtl"] .score-bar { flex-direction: row-reverse; }
    [dir="rtl"] .login-tabs { flex-direction: row-reverse; }
    [dir="rtl"] .bcard-header { flex-direction: row-reverse; }
    [dir="rtl"] .bcard-footer { flex-direction: row-reverse; }
    [dir="rtl"] .branch-footer { flex-direction: row-reverse; }
    [dir="rtl"] .lot-header { flex-direction: row-reverse; }
    [dir="rtl"] .lot-footer { direction: rtl; }
    [dir="rtl"] .flavor-tags { direction: rtl; }
    [dir="rtl"] .import-header-row { flex-direction: row-reverse; }
    [dir="rtl"] .addlot-grid { direction: rtl; }
    [dir="rtl"] .recall-modal-title { flex-direction: row-reverse; }
    [dir="rtl"] .recall-banner-body { text-align: right; }

    /* ── LANGUAGE TOGGLE PILL ── */
    #langToggle {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 0;
      background: var(--bg-2);
      border: 1px solid var(--border-amber);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.55), 0 0 14px rgba(245,158,11,0.22);
      cursor: pointer;
      transition: box-shadow .2s, transform .15s;
      font-family: var(--font-mono);
      user-select: none;
    }
    [dir="rtl"] #langToggle { left: auto; right: 24px; }
    #langToggle:hover {
      box-shadow: 0 6px 28px rgba(0,0,0,0.65), 0 0 22px rgba(245,158,11,0.35);
      transform: translateY(-2px);
    }
    #langToggle:active { transform: translateY(0); }
    .lang-globe {
      padding: 8px 10px 8px 14px;
      color: var(--amber);
      font-size: 13px;
      opacity: 0.7;
      display: flex;
      align-items: center;
    }
    .lang-opt {
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .8px;
      color: var(--text-muted);
      transition: all .18s;
      display: flex;
      align-items: center;
      gap: 5px;
      text-transform: uppercase;
    }
    .lang-opt.active {
      background: var(--amber-glow);
      color: var(--amber);
    }
    .lang-divider {
      width: 1px;
      height: 26px;
      background: var(--border-amber);
      flex-shrink: 0;
    }
    .lang-globe-divider {
      width: 1px;
      height: 26px;
      background: rgba(245,158,11,0.15);
      flex-shrink: 0;
    }
    /* Mobile adjustment */
    @media (max-width:768px) {
      #langToggle { bottom: 80px; left: 16px; }
      [dir="rtl"] #langToggle { left: auto; right: 16px; }
      .lang-globe { padding: 8px 8px 8px 12px; }
    }
  </style>

  <!-- ══ ARABIC FONT (Google Fonts) ══ -->
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>

  <!-- ══ i18n ENGINE ══════════════════════════════════════════════ -->
  <script>
  /* ────────────────────────────────────────────────────────────────
     QABBAN OS — Bilingual i18n Engine
     Strategy: every translatable text node carries  data-i18n="KEY"
     The engine swaps innerHTML on language change and persists via
     localStorage. RTL layout is toggled via <html dir="rtl|ltr">.
  ──────────────────────────────────────────────────────────────── */

  var I18N = {
    en: {
      /* ── BRAND ── */
      'brand.name':          'QABBAN <span style="color:var(--amber)">OS</span>',
      'brand.sub':           'Roast Operations Platform',
      'brand.tagline':       'Roast Operations Platform',

      /* ── LOGIN ── */
      'login.tab.admin':     '<i class="fa fa-shield-alt"></i> Roaster Admin',
      'login.tab.cafe':      '<i class="fa fa-mug-hot"></i> Cafe Portal',
      'login.username':      'Username',
      'login.password':      'Password',
      'login.btn':           '<i class="fa fa-arrow-right-to-bracket"></i> &nbsp; ACCESS SYSTEM',
      'login.hint':          'Admin: <code>admin</code> / <code>qabban2026</code> &nbsp;—&nbsp; Cafe: <code>alnokhba</code> / <code>cafe123</code>',
      'login.error':         'Invalid credentials. Please try again.',
      'login.authenticating':'<i class="fa fa-spinner fa-spin"></i> &nbsp; AUTHENTICATING...',

      /* ── NAV ── */
      'nav.overview':        'Overview',
      'nav.inventory':       'Inventory',
      'nav.branches':        'Branches',
      'nav.requests':        'Bean Requests',
      'nav.catalog':         'Coffee Catalog',
      'nav.orders':          'My Orders',
      'nav.system':          'System',
      'nav.system.online':   'System Online',
      'nav.logout':          'LOGOUT',

      /* ── TOPBAR BADGES ── */
      'badge.admin':         '<i class="fa fa-shield-alt"></i> Roaster Admin',
      'badge.cafe':          '<i class="fa fa-mug-hot"></i> Cafe Portal',
      'badge.user':          'admin',

      /* ── PAGE TITLES ── */
      'page.overview':       'Overview Dashboard',
      'page.inventory':      'Inventory Ledger',
      'page.branches':       'Branch Monitor',
      'page.requests':       'Bean Requests',
      'page.catalog':        'Coffee Catalog',
      'page.orders':         'My Orders',

      /* ── PAGE SUBTITLES ── */
      'sub.overview':        'Last sync: 2026-02-24 08:30 UTC+3',
      'sub.inventory':       'All lots · Live shrinkage · FIFO balance',
      'sub.branches':        'Humidity & temperature sensors · Risk classification',
      'sub.requests':        'Incoming bean requests · Dispatch queue',

      /* ── STAT LABELS ── */
      'stat.live.green':     'Live Green Stock',
      'stat.live.roasted':   'Live Roasted Balance',
      'stat.optimal.lots':   'OPTIMAL Lots',
      'stat.pending':        'Pending',
      'stat.confirmed':      'Confirmed',
      'stat.dispatched':     'Dispatched',
      'stat.cancelled':      'Cancelled',
      'stat.active.branches':'Active Branches',
      'stat.critical.high':  'Critical / High Risk',
      'stat.active.lots':    'Active Lots',
      'stat.in.stock':       'In Stock',
      'stat.out.of.stock':   'Out of Stock',
      'stat.your.orders':    'Your Orders',
      'stat.origins':        'Origins in Catalog',
      'stat.total.dispatched':'Total Dispatched',
      'stat.yield.rate':     'Yield Rate',
      'stat.kg.available':   'kg available',
      'stat.total.lots':     'of total lots',
      'stat.awaiting':       'awaiting confirmation',
      'stat.kg.sent':        'kg roasted sent out',
      'stat.sponge.adj':     'Sponge-adjusted per branch',

      /* ── SECTION TITLES ── */
      'section.live.balance':    'Live Balance Formula',
      'section.env.feed':        'KSA Environmental Live Feed',
      'section.branch.risk':     'Branch Risk Matrix',
      'section.recent.requests': 'Recent Bean Requests',
      'section.shrinkage':       'Inventory Shrinkage Summary — All Branches',
      'section.sponge':          'Sponge Effect — Dynamic Yield Coefficient Engine',
      'section.risk.legend':     'Humidity Risk Thresholds',
      'section.lots.by.branch':  'Lots by Branch',
      'section.all.requests':    'All Bean Requests',
      'section.roasting.interests': 'Roasting Interests — Pre-Orders',
      'section.balance.formula': 'Live Balance Formula',
      'section.bulk.import':     'Bulk Import',
      'section.inventory.table': 'Inventory Ledger — All Lots',

      /* ── TABLE HEADERS ── */
      'th.lot.id':           'Lot ID',
      'th.origin':           'Origin',
      'th.branch':           'Branch',
      'th.purchased.green':  'Purchased Green',
      'th.purchased.roasted':'Purchased Roasted',
      'th.dispatched':       'Dispatched',
      'th.live.green':       'Live Green Balance',
      'th.live.roasted':     'Live Roasted Balance',
      'th.status':           'Status',
      'th.grade':            'Grade',
      'th.coeff':            '⬡ Yield Coeff.',
      'th.req.id':           'Req ID',
      'th.cafe':             'Cafe',
      'th.lot':              'Lot',
      'th.qty':              'Qty',
      'th.notes':            'Notes',
      'th.submitted':        'Submitted',
      'th.action':           'Action',
      'th.roast.date':       'Roast Date',
      'th.expiry':           'Expiry',
      'th.humidity':         'Humidity',
      'th.temp':             'Temp',
      'th.risk':             'Risk',
      'th.city':             'City',
      'th.climate':          'Climate',
      'th.ref':              'Ref',
      'th.interest.kg':      'Interest (kg)',

      /* ── BUTTONS / ACTIONS ── */
      'btn.confirm':         'CONFIRM',
      'btn.dispatch':        'DISPATCH',
      'btn.return.stock':    'RETURN TO STOCK',
      'btn.cancel':          'CANCEL',
      'btn.send.request':    '<i class="fa fa-paper-plane"></i> &nbsp;SEND REQUEST',
      'btn.refresh':         'REFRESH',
      'btn.add.branch':      '<i class="fa fa-plus"></i>&nbsp; ADD NEW BRANCH',
      'btn.update.sensors':  '<i class="fa fa-sliders"></i> Update Sensors',
      'btn.save.reading':    '<i class="fa fa-check"></i>&nbsp; SAVE READING',
      'btn.add.lot':         '<i class="fa fa-plus"></i>&nbsp; LOG NEW LOT',
      'btn.import.csv':      'BULK IMPORT',
      'btn.download.tpl':    '<i class="fa fa-download"></i> Download Template',
      'btn.view.all':        'View all requests →',
      'btn.request.beans':   '<i class="fa fa-basket-shopping"></i> Request Beans',
      'btn.request.roasting':'<i class="fa fa-fire"></i> Request Roasting',
      'btn.recall.confirm':  'INITIATE RECALL',
      'btn.add.confirm':     '<i class="fa fa-check"></i>&nbsp; CONFIRM ADD',

      /* ── MODAL LABELS ── */
      'modal.request.title': '<i class="fa fa-basket-shopping"></i> Request Beans',
      'modal.lot.label':     'Lot',
      'modal.origin.label':  'Origin',
      'modal.available':     'Available',
      'modal.qty.label':     'Quantity (kg)',
      'modal.notes.label':   'Notes (optional)',
      'modal.notes.ph':      'Delivery instructions, special requirements...',
      'modal.add.branch':    '<i class="fa fa-plus-circle"></i> Add New Branch',
      'modal.update.sensor': 'Update Sensor Reading',
      'modal.add.lot':       '<i class="fa fa-seedling"></i> Log New Green Lot',

      /* ── FORM LABELS ── */
      'form.branch.name':    'Branch Name',
      'form.city':           'City',
      'form.climate.type':   'Climate Type',
      'form.humidity':       'Initial Humidity (%)',
      'form.temperature':    'Initial Temperature (°C)',
      'form.climate.inland': 'Inland — Arid (Riyadh pattern, low humidity)',
      'form.climate.coastal':'Coastal — Humid (Jeddah / Dammam pattern)',

      /* ── CLIMATE / BRANCH LABELS ── */
      'climate.inland':      'Inland',
      'climate.coastal':     'Coastal',
      'climate.advisory':    'CLIMATE ADVISORY',
      'climate.note':        'Risk auto-calculated from humidity. New Branch ID assigned automatically.',

      /* ── RISK LEVELS ── */
      'risk.low':            'LOW',
      'risk.moderate':       'MODERATE',
      'risk.high':           'HIGH',
      'risk.critical':       'CRITICAL',
      'risk.low.desc':       'Ideal conditions — standard ventilation',
      'risk.moderate.desc':  'Monitor weekly',
      'risk.high.desc':      'Dehumidify within 48h',
      'risk.critical.desc':  'Immediate action required',

      /* ── LOT CARD LABELS ── */
      'lot.roasted.balance': 'Roasted Balance',
      'lot.best.grade':      'Best Lot Grade',
      'lot.ref':             'Lot Ref',
      'lot.expires':         'Expires',
      'lot.live.available':  'live available',
      'lot.latest.batch':    'latest batch',
      'lot.in.stock':        'IN STOCK',
      'lot.out.of.stock':    'OUT OF STOCK',

      /* ── ENVIRONMENT FEED ── */
      'env.live.badge':      '● LIVE DATA',
      'env.simulated':       '◌ NO API KEY — SIMULATED',
      'env.fetching':        'Fetching live sensor data…',
      'env.next.refresh':    'Next refresh in',
      'env.refreshed':       'Last refreshed:',
      'env.source':          'LIVE SENSOR DATA: REFRESHED',
      'env.temp':            'Temp',
      'env.wind':            'Wind',
      'env.sky':             'Sky',

      /* ── SPONGE EFFECT ── */
      'sponge.active':       '⬡ ACTIVE',
      'sponge.baseline':     'Baseline Coefficient',
      'sponge.rule.a':       'Rule A — Coastal',
      'sponge.rule.b':       'Rule B — Arid',
      'sponge.baseline.range':'20% ≤ RH ≤ 70%',
      'sponge.no.adj':       'No adjustment',
      'sponge.rule.a.desc':  'Moisture absorption → heavier green weight',
      'sponge.rule.b.desc':  'Evaporation loss → lighter green weight',
      'sponge.branch.coeffs':'Live Coefficients by Branch',
      'sponge.portfolio':    'Portfolio Impact',

      /* ── RECALL ── */
      'recall.title':        '⚠ URGENT RECALL — SFDA AUDIT SHIELD',
      'recall.instructions': 'Instructions from Roaster:',
      'recall.acknowledge':  'ACKNOWLEDGE',
      'recall.btn':          'INITIATE RECALL',
      'recall.blocked':      'RECALLED — BLOCKED',

      /* ── ORDERS PAGE ── */
      'orders.empty':        'No orders yet',
      'orders.sub':          'Your order history',
      'orders.status':       'Order Status',

      /* ── MISC ── */
      'misc.kg':             'kg',
      'misc.rh':             'RH',
      'misc.system.online':  'System Online',
      'misc.branches.active':'Branches Active',
      'misc.view.all':       'View all requests →',
      'misc.audit.only':     'AUDIT ONLY',
      'misc.empty.requests': 'No requests yet',
      'misc.empty.lots':     'No lots yet',
      'misc.last.checked':   'Checked:',
      'misc.pre.orders.desc':'Cafes submitted these pre-orders for origins that are currently OUT OF STOCK. Use this to plan your next roast schedule.',
      'misc.no.preorders':   'No pre-orders yet — cafes will submit Roasting Interest requests when an origin is out of stock.',
      'misc.sponge.adjusted':'⬡ SPONGE-ADJUSTED',

      /* ── FINANCIAL INTELLIGENCE ── */
      'fin.module':           '⬡ Qabban Financial Intelligence',
      'fin.nav':              'Finance',
      'fin.page.title':       'Financial Intelligence',
      'fin.page.sub':         'True costs · Wholesale pricing · Environmental P&L',
      'fin.impact.card':      'Financial Impact',
      'fin.portfolio.value':  'Total Portfolio Value',
      'fin.env.pnl':          'Environmental P&L',
      'fin.env.pnl.desc':     'SAR value of Sponge Adjustment',
      'fin.proj.profit':      'Projected Profit',
      'fin.lots.priced':      'Lots with Pricing',
      'fin.sponge.kg':        'Sponge Δ kg',
      'fin.default.margin':   'Default Target Margin',
      'fin.set.margin':       'SET',
      'fin.margin.saved':     'Default margin updated',
      'fin.table.title':      'Lot-Level Financial Breakdown',
      'fin.true.cost':        'True Roasted Cost',
      'fin.wholesale':        'Wholesale Price',
      'fin.live.value':       'Live Inventory Value',
      'fin.proj.profit.col':  'Projected Profit',
      'fin.env.col':          'Env. P&L',
      'fin.coeff.col':        'Yield Coeff.',
      'fin.no.cost':          'No cost data',
      'fin.sar':              'SAR',
      'fin.per.kg':           '/kg',
      'fin.add.cost':         'Green Bean Cost (SAR/kg)',
      'fin.add.margin':       'Target Gross Margin (%)',
      'fin.add.cost.ph':      'e.g. 45',
      'fin.add.margin.ph':    'e.g. 35',
      'fin.true.cost.formula':'True Roasted Cost = Green Cost ÷ Yield Coeff.',
      'fin.wholesale.formula':'Wholesale Price = True Cost ÷ (1 − Margin %)',
      'fin.cafe.price.label': 'Wholesale',
      'fin.cafe.price.badge': '⬡ PRICED',
      'fin.env.gain':         '⬡ ENV GAIN',
      'fin.env.loss':         '⬡ ENV LOSS',
    },

    ar: {
      /* ── BRAND ── */
      'brand.name':          'قبّان <span style="color:var(--amber)">OS</span>',
      'brand.sub':           'منصة عمليات التحميص',
      'brand.tagline':       'منصة عمليات التحميص',

      /* ── LOGIN ── */
      'login.tab.admin':     '<i class="fa fa-shield-alt"></i> مسؤول المحمصة',
      'login.tab.cafe':      '<i class="fa fa-mug-hot"></i> بوابة المقهى',
      'login.username':      'اسم المستخدم',
      'login.password':      'كلمة المرور',
      'login.btn':           '<i class="fa fa-arrow-right-to-bracket"></i> &nbsp; دخول النظام',
      'login.hint':          'المسؤول: <code>admin</code> / <code>qabban2026</code> &nbsp;—&nbsp; المقهى: <code>alnokhba</code> / <code>cafe123</code>',
      'login.error':         'بيانات اعتماد غير صحيحة. حاول مرة أخرى.',
      'login.authenticating':'<i class="fa fa-spinner fa-spin"></i> &nbsp; جارٍ المصادقة...',

      /* ── NAV ── */
      'nav.overview':        'نظرة عامة',
      'nav.inventory':       'المخزون',
      'nav.branches':        'الفروع',
      'nav.requests':        'طلبات البن',
      'nav.catalog':         'كتالوج القهوة',
      'nav.orders':          'طلباتي',
      'nav.system':          'النظام',
      'nav.system.online':   'النظام متصل',
      'nav.logout':          'خروج',

      /* ── TOPBAR BADGES ── */
      'badge.admin':         '<i class="fa fa-shield-alt"></i> مسؤول المحمصة',
      'badge.cafe':          '<i class="fa fa-mug-hot"></i> بوابة المقهى',
      'badge.user':          'المسؤول',

      /* ── PAGE TITLES ── */
      'page.overview':       'لوحة المتابعة',
      'page.inventory':      'سجل المخزون',
      'page.branches':       'مراقبة الفروع',
      'page.requests':       'طلبات البن',
      'page.catalog':        'كتالوج القهوة',
      'page.orders':         'طلباتي',

      /* ── PAGE SUBTITLES ── */
      'sub.overview':        'آخر مزامنة: 2026-02-24 08:30 UTC+3',
      'sub.inventory':       'جميع الدفعات · التقلص المباشر · رصيد FIFO',
      'sub.branches':        'حساسات الرطوبة والحرارة · تصنيف المخاطر',
      'sub.requests':        'طلبات البن الواردة · قائمة الإرسال',

      /* ── STAT LABELS ── */
      'stat.live.green':     'مخزون البن الأخضر',
      'stat.live.roasted':   'رصيد المحمص المباشر',
      'stat.optimal.lots':   'دفعات مثالية',
      'stat.pending':        'قيد الانتظار',
      'stat.confirmed':      'مؤكّدة',
      'stat.dispatched':     'مُرسَلة',
      'stat.cancelled':      'ملغاة',
      'stat.active.branches':'الفروع النشطة',
      'stat.critical.high':  'خطر حرج / مرتفع',
      'stat.active.lots':    'الدفعات النشطة',
      'stat.in.stock':       'متوفر',
      'stat.out.of.stock':   'نفد المخزون',
      'stat.your.orders':    'طلباتي',
      'stat.origins':        'أصول في الكتالوج',
      'stat.total.dispatched':'إجمالي المُرسَل',
      'stat.yield.rate':     'نسبة الإنتاج',
      'stat.kg.available':   'كغ متاحة',
      'stat.total.lots':     'من إجمالي الدفعات',
      'stat.awaiting':       'بانتظار التأكيد',
      'stat.kg.sent':        'كغ محمصة مُرسَلة',
      'stat.sponge.adj':     'معدّل حسب الفرع',

      /* ── SECTION TITLES ── */
      'section.live.balance':    'معادلة الرصيد المباشر',
      'section.env.feed':        'البث البيئي المباشر - المملكة',
      'section.branch.risk':     'مصفوفة مخاطر الفروع',
      'section.recent.requests': 'أحدث طلبات البن',
      'section.shrinkage':       'ملخص تقلص المخزون — جميع الفروع',
      'section.sponge':          'تأثير الإسفنج — محرك معامل الإنتاج الديناميكي',
      'section.risk.legend':     'عتبات مخاطر الرطوبة',
      'section.lots.by.branch':  'الدفعات حسب الفرع',
      'section.all.requests':    'جميع طلبات البن',
      'section.roasting.interests': 'اهتمامات التحميص — الطلبات المسبقة',
      'section.balance.formula': 'معادلة الرصيد المباشر',
      'section.bulk.import':     'الاستيراد الجماعي',
      'section.inventory.table': 'سجل المخزون — جميع الدفعات',

      /* ── TABLE HEADERS ── */
      'th.lot.id':           'رقم الدفعة',
      'th.origin':           'المنشأ',
      'th.branch':           'الفرع',
      'th.purchased.green':  'البن الأخضر المشترى',
      'th.purchased.roasted':'المحمص المشترى',
      'th.dispatched':       'المُرسَل',
      'th.live.green':       'رصيد الأخضر المباشر',
      'th.live.roasted':     'رصيد المحمص المباشر',
      'th.status':           'الحالة',
      'th.grade':            'التقييم',
      'th.coeff':            '⬡ معامل الإنتاج',
      'th.req.id':           'رقم الطلب',
      'th.cafe':             'المقهى',
      'th.lot':              'الدفعة',
      'th.qty':              'الكمية',
      'th.notes':            'ملاحظات',
      'th.submitted':        'تاريخ الطلب',
      'th.action':           'إجراء',
      'th.roast.date':       'تاريخ التحميص',
      'th.expiry':           'تاريخ الانتهاء',
      'th.humidity':         'الرطوبة',
      'th.temp':             'الحرارة',
      'th.risk':             'المخاطر',
      'th.city':             'المدينة',
      'th.climate':          'المناخ',
      'th.ref':              'المرجع',
      'th.interest.kg':      'الكمية المطلوبة (كغ)',

      /* ── BUTTONS / ACTIONS ── */
      'btn.confirm':         'تأكيد',
      'btn.dispatch':        'إرسال',
      'btn.return.stock':    'إعادة للمخزون',
      'btn.cancel':          'إلغاء',
      'btn.send.request':    '<i class="fa fa-paper-plane"></i> &nbsp;إرسال الطلب',
      'btn.refresh':         'تحديث',
      'btn.add.branch':      '<i class="fa fa-plus"></i>&nbsp; إضافة فرع',
      'btn.update.sensors':  '<i class="fa fa-sliders"></i> تحديث الحساسات',
      'btn.save.reading':    '<i class="fa fa-check"></i>&nbsp; حفظ القراءة',
      'btn.add.lot':         '<i class="fa fa-plus"></i>&nbsp; تسجيل دفعة جديدة',
      'btn.import.csv':      'استيراد جماعي',
      'btn.download.tpl':    '<i class="fa fa-download"></i> تحميل النموذج',
      'btn.view.all':        'عرض جميع الطلبات ←',
      'btn.request.beans':   '<i class="fa fa-basket-shopping"></i> طلب البن',
      'btn.request.roasting':'<i class="fa fa-fire"></i> طلب تحميص',
      'btn.recall.confirm':  'بدء الاستدعاء',
      'btn.add.confirm':     '<i class="fa fa-check"></i>&nbsp; تأكيد الإضافة',

      /* ── MODAL LABELS ── */
      'modal.request.title': '<i class="fa fa-basket-shopping"></i> طلب البن',
      'modal.lot.label':     'الدفعة',
      'modal.origin.label':  'المنشأ',
      'modal.available':     'المتاح',
      'modal.qty.label':     'الكمية (كغ)',
      'modal.notes.label':   'ملاحظات (اختياري)',
      'modal.notes.ph':      'تعليمات التسليم، متطلبات خاصة...',
      'modal.add.branch':    '<i class="fa fa-plus-circle"></i> إضافة فرع جديد',
      'modal.update.sensor': 'تحديث قراءة الحساسات',
      'modal.add.lot':       '<i class="fa fa-seedling"></i> تسجيل دفعة خضراء جديدة',

      /* ── FORM LABELS ── */
      'form.branch.name':    'اسم الفرع',
      'form.city':           'المدينة',
      'form.climate.type':   'نوع المناخ',
      'form.humidity':       'الرطوبة الابتدائية (%)',
      'form.temperature':    'الحرارة الابتدائية (°م)',
      'form.climate.inland': 'داخلي — جاف (نمط الرياض، رطوبة منخفضة)',
      'form.climate.coastal':'ساحلي — رطب (نمط جدة / الدمام)',

      /* ── CLIMATE / BRANCH LABELS ── */
      'climate.inland':      'داخلي',
      'climate.coastal':     'ساحلي',
      'climate.advisory':    'التوصية المناخية',
      'climate.note':        'تُحسَب درجة المخاطر تلقائياً من الرطوبة. يُعيَّن رقم معرّف الفرع تلقائياً.',

      /* ── RISK LEVELS ── */
      'risk.low':            'منخفض',
      'risk.moderate':       'متوسط',
      'risk.high':           'مرتفع',
      'risk.critical':       'حرج',
      'risk.low.desc':       'ظروف مثالية — تهوية قياسية',
      'risk.moderate.desc':  'مراقبة أسبوعية',
      'risk.high.desc':      'إزالة رطوبة خلال 48 ساعة',
      'risk.critical.desc':  'إجراء فوري مطلوب',

      /* ── LOT CARD LABELS ── */
      'lot.roasted.balance': 'رصيد المحمص',
      'lot.best.grade':      'أعلى تقييم للدفعة',
      'lot.ref':             'مرجع الدفعة',
      'lot.expires':         'ينتهي في',
      'lot.live.available':  'متاح حالياً',
      'lot.latest.batch':    'آخر دفعة',
      'lot.in.stock':        'متوفر',
      'lot.out.of.stock':    'نفد المخزون',

      /* ── ENVIRONMENT FEED ── */
      'env.live.badge':      '● بيانات مباشرة',
      'env.simulated':       '◌ لا يوجد مفتاح API — محاكاة',
      'env.fetching':        'جارٍ جلب بيانات الحساسات المباشرة…',
      'env.next.refresh':    'التحديث القادم خلال',
      'env.refreshed':       'آخر تحديث:',
      'env.source':          'بيانات حساس مباشرة: مُحدَّثة',
      'env.temp':            'الحرارة',
      'env.wind':            'الرياح',
      'env.sky':             'السماء',

      /* ── SPONGE EFFECT ── */
      'sponge.active':       '⬡ نشط',
      'sponge.baseline':     'المعامل الأساسي',
      'sponge.rule.a':       'القاعدة أ — ساحلي',
      'sponge.rule.b':       'القاعدة ب — جاف',
      'sponge.baseline.range':'20% ≤ رطوبة ≤ 70%',
      'sponge.no.adj':       'لا تعديل',
      'sponge.rule.a.desc':  'امتصاص الرطوبة ← وزن أخضر أثقل',
      'sponge.rule.b.desc':  'خسارة التبخر ← وزن أخضر أخف',
      'sponge.branch.coeffs':'المعاملات الحية حسب الفرع',
      'sponge.portfolio':    'التأثير الإجمالي',

      /* ── RECALL ── */
      'recall.title':        '⚠ استدعاء عاجل — درع تدقيق SFDA',
      'recall.instructions': 'تعليمات من المحمصة:',
      'recall.acknowledge':  'تم الاستلام',
      'recall.btn':          'بدء الاستدعاء',
      'recall.blocked':      'مستدعى — محظور',

      /* ── ORDERS PAGE ── */
      'orders.empty':        'لا توجد طلبات بعد',
      'orders.sub':          'سجل طلباتك',
      'orders.status':       'حالة الطلب',

      /* ── MISC ── */
      'misc.kg':             'كغ',
      'misc.rh':             'رطوبة',
      'misc.system.online':  'النظام متصل',
      'misc.branches.active':'فروع نشطة',
      'misc.view.all':       'عرض جميع الطلبات ←',
      'misc.audit.only':     'للتدقيق فقط',
      'misc.empty.requests': 'لا توجد طلبات بعد',
      'misc.empty.lots':     'لا توجد دفعات بعد',
      'misc.last.checked':   'آخر فحص:',
      'misc.pre.orders.desc':'قدّمت المقاهي هذه الطلبات المسبقة للأصول غير المتوفرة. استخدمها لتخطيط جدول التحميص القادم.',
      'misc.no.preorders':   'لا توجد طلبات مسبقة بعد — ستُرسِل المقاهي طلبات اهتمام التحميص عند نفاد المخزون.',
      'misc.sponge.adjusted':'⬡ معدَّل بتأثير الإسفنج',

      /* ── الذكاء المالي ── */
      'fin.module':           '⬡ الذكاء المالي - قبّان',
      'fin.nav':              'المالية',
      'fin.page.title':       'الذكاء المالي',
      'fin.page.sub':         'التكاليف الحقيقية · أسعار الجملة · الأثر البيئي',
      'fin.impact.card':      'الأثر المالي',
      'fin.portfolio.value':  'إجمالي قيمة المحفظة',
      'fin.env.pnl':          'الأثر البيئي (ر.س)',
      'fin.env.pnl.desc':     'قيمة تعديل تأثير الإسفنج بالريال',
      'fin.proj.profit':      'الربح المتوقع',
      'fin.lots.priced':      'دفعات مُسعَّرة',
      'fin.sponge.kg':        'فرق الإسفنج (كغ)',
      'fin.default.margin':   'هامش الربح الافتراضي',
      'fin.set.margin':       'حفظ',
      'fin.margin.saved':     'تم تحديث الهامش الافتراضي',
      'fin.table.title':      'التحليل المالي لكل دفعة',
      'fin.true.cost':        'التكلفة الحقيقية للمحمص',
      'fin.wholesale':        'سعر الجملة',
      'fin.live.value':       'القيمة المباشرة للمخزون',
      'fin.proj.profit.col':  'الربح المتوقع',
      'fin.env.col':          'الأثر البيئي',
      'fin.coeff.col':        'معامل الإنتاج',
      'fin.no.cost':          'لا توجد بيانات تكلفة',
      'fin.sar':              'ر.س',
      'fin.per.kg':           '/كغ',
      'fin.add.cost':         'تكلفة البن الأخضر (ر.س/كغ)',
      'fin.add.margin':       'هامش الربح المستهدف (%)',
      'fin.add.cost.ph':      'مثال: 45',
      'fin.add.margin.ph':    'مثال: 35',
      'fin.true.cost.formula':'التكلفة الحقيقية = التكلفة الخضراء ÷ معامل الإنتاج',
      'fin.wholesale.formula':'سعر الجملة = التكلفة الحقيقية ÷ (1 − الهامش %)',
      'fin.cafe.price.label': 'جملة',
      'fin.cafe.price.badge': '⬡ مُسعَّر',
      'fin.env.gain':         '⬡ مكسب بيئي',
      'fin.env.loss':         '⬡ خسارة بيئية',
    }
  };

  /* ─── Core engine ─────────────────────────────────────────────── */
  var _lang = (localStorage.getItem('qabban_lang') || 'en');

  function t(key) {
    var dict = I18N[_lang] || I18N['en'];
    return dict[key] !== undefined ? dict[key] : (I18N['en'][key] || key);
  }

  function applyLang(lang) {
    _lang = lang;
    localStorage.setItem('qabban_lang', lang);

    /* 1. html dir + lang attributes */
    var html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    /* 2. Swap all [data-i18n] elements */
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (val !== undefined) el.innerHTML = val;
    });

    /* 3. Swap all [data-i18n-ph] placeholders */
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-ph');
      var val = t(key);
      if (val !== undefined) el.placeholder = val;
    });

    /* 4. Update toggle pill UI */
    var enOpt = document.getElementById('lang-opt-en');
    var arOpt = document.getElementById('lang-opt-ar');
    if (enOpt) enOpt.classList.toggle('active', lang === 'en');
    if (arOpt) arOpt.classList.toggle('active', lang === 'ar');

    /* 5. Arabic font on body */
    if (lang === 'ar') {
      document.body.style.fontFamily = "'IBM Plex Arabic', 'Noto Sans Arabic', sans-serif";
    } else {
      document.body.style.fontFamily = '';
    }
  }

  function toggleLang() {
    applyLang(_lang === 'en' ? 'ar' : 'en');
  }

  /* Run on every page load */
  document.addEventListener('DOMContentLoaded', function() {
    applyLang(_lang);
  });
  </script>
</head>
<body>
${body}

<!-- ── LANGUAGE TOGGLE PILL ── -->
<div id="langToggle" onclick="toggleLang()" title="Switch language / تغيير اللغة">
  <div class="lang-globe">
    <i class="fa fa-globe"></i>
  </div>
  <div class="lang-globe-divider"></div>
  <div class="lang-opt" id="lang-opt-en">
    <span>EN</span>
  </div>
  <div class="lang-divider"></div>
  <div class="lang-opt" id="lang-opt-ar">
    <span>ع</span>
  </div>
</div>

</body>
</html>`

// ══════════════════════════════════════════════════════════════════
//  CREDENTIALS  (client-side check — plain lookup table)
// ══════════════════════════════════════════════════════════════════
// Credentials are validated entirely in the browser via JavaScript.
// The server serves pages at /cafe?cid=CAF-xxx so each cafe user
// sees their own identity — no cookie/session middleware required.

const CREDENTIALS: Record<string, { dest: string }> = {
  'admin':       { dest: '/admin' },
  'alnokhba':    { dest: '/cafe?cid=CAF-001' },
  'qahwa_bahr':  { dest: '/cafe?cid=CAF-002' },
  'pearl_roast': { dest: '/cafe?cid=CAF-003' },
}

// ── Resolve cafe client from ?cid= query param ─────────────────────────────
function resolveCafeClient(cidParam: string | null) {
  if (cidParam) {
    const found = cafeClients.find(c => c.id === cidParam)
    if (found) return found
  }
  return cafeClients[0]  // fallback
}

// ══════════════════════════════════════════════════════════════════
//  LOGIN PAGE  —  GET /
// ══════════════════════════════════════════════════════════════════

app.get('/', (c) => {
  const body = `
  <div class="login-page">
    <div class="login-box">

      <div class="login-logo-header">
        <!-- Official Qabban OS logo image -->
        <div class="login-logo-img-wrap">
          <img
            src="/static/qabban-logo-256.png"
            alt="Qabban OS Logo"
            class="login-logo-img"
            width="130"
            height="130"
          />
        </div>
        <div class="login-brand-name" data-i18n="brand.name">QABBAN <span>OS</span></div>
        <div class="login-brand-sub" data-i18n="brand.sub">Roast Operations Platform</div>
        <div class="login-brand-rule"></div>
      </div>

      <div class="login-tabs">
        <button class="login-tab active" id="tabAdmin" onclick="switchTab('admin')" data-i18n="login.tab.admin">
          <i class="fa fa-shield-alt"></i> Roaster Admin
        </button>
        <button class="login-tab" id="tabCafe" onclick="switchTab('cafe')" data-i18n="login.tab.cafe">
          <i class="fa fa-mug-hot"></i> Cafe Portal
        </button>
      </div>

      <div class="login-error" id="loginError">
        <i class="fa fa-exclamation-circle"></i>
        <span id="loginErrorMsg">Invalid credentials. Please try again.</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="username" data-i18n="login.username">Username</label>
        <input class="form-input" type="text" id="username"
               placeholder="admin" autocomplete="username" autocapitalize="none"/>
      </div>

      <div class="form-group">
        <label class="form-label" for="password" data-i18n="login.password">Password</label>
        <input class="form-input" type="password" id="password"
               placeholder="••••••••" autocomplete="current-password"/>
      </div>

      <button class="btn-primary" id="accessBtn" onclick="handleLogin()" data-i18n="login.btn">
        <i class="fa fa-arrow-right-to-bracket"></i> &nbsp; ACCESS SYSTEM
      </button>

      <div class="login-hint" data-i18n="login.hint">
        Admin: <code>admin</code> / <code>qabban2026</code>
        &nbsp;&mdash;&nbsp;
        Cafe: <code>alnokhba</code> / <code>cafe123</code>
      </div>

    </div>
  </div>

  <script>
    /* ── tab switcher ── */
    var currentTab = 'admin';
    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('tabAdmin').classList.toggle('active', tab === 'admin');
      document.getElementById('tabCafe').classList.toggle('active', tab === 'cafe');
      document.getElementById('username').placeholder = tab === 'admin' ? 'admin' : 'alnokhba';
      document.getElementById('username').focus();
      document.getElementById('loginError').style.display = 'none';
    }

    /* ── allow Enter key ── */
    document.getElementById('username').addEventListener('keydown', function(e){ if(e.key==='Enter') handleLogin(); });
    document.getElementById('password').addEventListener('keydown', function(e){ if(e.key==='Enter') handleLogin(); });

    /* ── credential table ── */
    var CREDS = {
      admin:       { pass: 'qabban2026', dest: '/admin' },
      alnokhba:    { pass: 'cafe123',    dest: '/cafe?cid=CAF-001' },
      qahwa_bahr:  { pass: 'cafe123',    dest: '/cafe?cid=CAF-002' },
      pearl_roast: { pass: 'cafe123',    dest: '/cafe?cid=CAF-003' }
    };

    function handleLogin() {
      var btn  = document.getElementById('accessBtn');
      var errEl = document.getElementById('loginError');
      var user = document.getElementById('username').value.trim();
      var pass = document.getElementById('password').value;

      /* visual feedback */
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> &nbsp; AUTHENTICATING...';
      errEl.style.display = 'none';

      /* small artificial delay so the spinner is visible */
      setTimeout(function() {
        var match = CREDS[user];
        if (match && match.pass === pass) {
          /* correct — navigate immediately */
          window.location.href = match.dest;
        } else {
          /* wrong — show error, re-enable button */
          document.getElementById('loginErrorMsg').textContent =
            t('login.error');
          errEl.style.display = 'flex';
          btn.disabled = false;
          btn.innerHTML = t('login.btn');
          document.getElementById('password').value = '';
          document.getElementById('password').focus();
        }
      }, 300);
    }
  </script>`

  return c.html(shell('Login', body))
})

// ══════════════════════════════════════════════════════════════════
//  SHARED LAYOUT BUILDERS
// ══════════════════════════════════════════════════════════════════

function adminLayout(pageTitle: string, activeNav: string, content: string, pendingCount = 0) {
  const navLinks = [
    { href: '/admin',           icon: 'fa-gauge',         label: 'Overview',        id: 'overview',   i18n: 'nav.overview'  },
    { href: '/admin/inventory', icon: 'fa-boxes-stacked', label: 'Inventory',       id: 'inventory',  i18n: 'nav.inventory' },
    { href: '/admin/branches',  icon: 'fa-building',      label: 'Branches',        id: 'branches',   i18n: 'nav.branches'  },
    { href: '/admin/finance',   icon: 'fa-chart-line',    label: 'Finance',         id: 'finance',    i18n: 'fin.nav'       },
    { href: '/admin/requests',  icon: 'fa-bell',          label: 'Bean Requests',   id: 'requests',   i18n: 'nav.requests'  },
    { href: '/exchange',        icon: 'fa-globe',         label: 'Global Exchange', id: 'exchange',   i18n: 'nav.exchange'  },
    { href: '/admin/pulse',     icon: 'fa-wave-square',   label: 'Pulse',           id: 'pulse',      i18n: 'nav.pulse'     },
  ]
  const body = `
  <header class="topbar">
    <div class="topbar-brand">
      <div class="topbar-logo">
        <img src="/static/qabban-logo-48.png" alt="Qabban OS" width="36" height="36"/>
      </div>
      <span class="topbar-title" data-i18n="brand.name">QABBAN <span>OS</span></span>
    </div>
    <div class="topbar-right">
      <a href="/admin/requests" class="notif-btn" title="Bean Requests">
        <i class="fa fa-bell"></i>
        ${pendingCount > 0 ? `<span class="notif-count">${pendingCount}</span>` : ''}
      </a>
      <span class="topbar-badge badge-admin" data-i18n="badge.admin"><i class="fa fa-shield-alt"></i> Roaster Admin</span>
      <span class="topbar-user"><i class="fa fa-user-circle"></i> <span data-i18n="badge.user">admin</span></span>
      <a href="/"><button class="btn-logout" data-i18n="nav.logout">LOGOUT</button></a>
    </div>
  </header>
  <div class="layout">
    <nav class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-label" data-i18n="nav.system">Navigation</div>
        ${navLinks.map(l => `
        <a href="${l.href}" class="sidebar-link ${activeNav === l.id ? 'active' : ''}">
          <i class="fa ${l.icon}"></i> <span data-i18n="${l.i18n}">${l.label}</span>
          ${l.id === 'requests' && pendingCount > 0
            ? `<span style="margin-left:auto;background:var(--red);color:white;font-size:9px;padding:1px 5px;border-radius:9px;font-family:var(--font-mono)">${pendingCount}</span>`
            : ''}
        </a>`).join('')}
      </div>
      <div class="sidebar-section">
        <div class="sidebar-label" data-i18n="nav.system">System</div>
        <div class="sidebar-link" style="font-size:11px;color:var(--text-muted)">
          <i class="fa fa-circle" style="color:var(--green);font-size:8px"></i> <span data-i18n="misc.system.online">System Online</span>
        </div>
        <div class="sidebar-link" style="font-size:11px;color:var(--text-muted)">
          <i class="fa fa-database"></i> ${branches.length} <span data-i18n="misc.branches.active">Branches Active</span>
        </div>
      </div>
    </nav>
    <main class="main">
      <div class="page-header">
        <div class="page-title"><span>// </span>${pageTitle}</div>
        <div class="page-sub" data-i18n="sub.overview">Last sync: 2026-02-24 08:30 UTC+3</div>
      </div>
      ${content}
    </main>
  </div>
  <nav class="mobile-nav">
    <div class="mobile-nav-items">
      ${navLinks.map(l => `
      <a href="${l.href}" class="mobile-nav-item ${activeNav === l.id ? 'active' : ''}">
        <i class="fa ${l.icon}"></i> <span data-i18n="${l.i18n}">${l.label}</span>
      </a>`).join('')}
    </div>
  </nav>`
  return shell(pageTitle, body)
}

function cafeLayout(pageTitle: string, activeNav: string, content: string, clientInfo: { name: string; tier: string; branch: string; id: string }) {
  const cid = clientInfo.id  // e.g. "CAF-001"
  const navLinks = [
    { href: `/cafe?cid=${cid}`,        icon: 'fa-mug-hot',           label: 'Coffee Catalog', id: 'lots',   i18n: 'nav.catalog' },
    { href: `/cafe/orders?cid=${cid}`, icon: 'fa-clock-rotate-left', label: 'My Orders',      id: 'orders', i18n: 'nav.orders'  },
  ]
  const tierColor = clientInfo.tier === 'Gold' ? 'var(--amber)' : clientInfo.tier === 'Silver' ? '#94a3b8' : '#cd7f32'
  const body = `
  <header class="topbar">
    <div class="topbar-brand">
      <div class="topbar-logo">
        <img src="/static/qabban-logo-48.png" alt="Qabban OS" width="36" height="36"/>
      </div>
      <span class="topbar-title" data-i18n="brand.name">QABBAN <span>OS</span></span>
    </div>
    <div class="topbar-right">
      <span style="font-family:var(--font-mono);font-size:11px;color:${tierColor};padding:3px 8px;border:1px solid ${tierColor}40;border-radius:2px">
        ★ ${clientInfo.tier}
      </span>
      <span class="topbar-badge badge-cafe" data-i18n="badge.cafe"><i class="fa fa-mug-hot"></i> Cafe Portal</span>
      <span class="topbar-user"><i class="fa fa-store"></i> ${clientInfo.name}</span>
      <a href="/"><button class="btn-logout" data-i18n="nav.logout">LOGOUT</button></a>
    </div>
  </header>
  <div class="layout">
    <nav class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-label" data-i18n="badge.cafe">Cafe Portal</div>
        ${navLinks.map(l => `
        <a href="${l.href}" class="sidebar-link ${activeNav === l.id ? 'active' : ''}">
          <i class="fa ${l.icon}"></i> <span data-i18n="${l.i18n}">${l.label}</span>
        </a>`).join('')}
      </div>
      <div class="sidebar-section">
        <div class="sidebar-label" data-i18n="nav.overview">Account</div>
        <div style="padding:12px 20px">
          <div style="font-size:12px;font-weight:600;color:var(--text-pri)">${clientInfo.name}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${clientInfo.branch} Branch</div>
          <div style="font-size:11px;color:${tierColor};margin-top:4px">★ ${clientInfo.tier} Client</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono)">${cid}</div>
        </div>
      </div>
    </nav>
    <main class="main">
      <div class="page-header">
        <div class="page-title"><span>// </span>${pageTitle}</div>
        <div class="page-sub">Coffee Catalog · All Origins · ${clientInfo.branch} Region</div>
      </div>
      ${content}
    </main>
  </div>
  <nav class="mobile-nav">
    <div class="mobile-nav-items">
      ${navLinks.map(l => `
      <a href="${l.href}" class="mobile-nav-item ${activeNav === l.id ? 'active' : ''}">
        <i class="fa ${l.icon}"></i> <span data-i18n="${l.i18n}">${l.label}</span>
      </a>`).join('')}
    </div>
  </nav>

  <!-- Request Beans Modal -->
  <div class="modal-overlay" id="requestModal">
    <div class="modal">
      <div class="modal-title" data-i18n="modal.request.title"><i class="fa fa-basket-shopping"></i> Request Beans</div>
      <div id="modalContent"></div>
      <form method="POST" action="/cafe/request" id="requestForm">
        <input type="hidden" name="cafeId" value="${cid}"/>
        <input type="hidden" name="lotId" id="modalLotId"/>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" data-i18n="modal.qty.label">Quantity (kg)</label>
          <input class="form-input" type="number" name="quantity" id="modalQty" min="1" max="500" data-i18n-ph="modal.qty.label" placeholder="Enter kg" required
            oninput="updateOrderTotal()"/>
          <!-- Hybrid Discount breakdown (Coffee Miles) -->
          <div id="orderDiscountRow" style="display:none;margin-top:8px;padding:8px 12px;border-radius:var(--radius);background:rgba(245,158,11,0.05);border:1px dashed rgba(245,158,11,0.30)"></div>
          <!-- Order Total live display -->
          <div id="orderTotalRow" style="display:none;margin-top:10px;padding:10px 14px;border-radius:var(--radius);background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.25)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px">Order Total</div>
                <div style="font-size:9px;color:var(--text-muted);font-family:var(--font-mono)" id="orderTotalFormula"></div>
              </div>
              <div style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--amber)" id="orderTotalValue">—</div>
            </div>
            <div id="orderTotalOverStock" style="display:none;margin-top:6px;font-size:10px;color:var(--red);font-family:var(--font-mono)">
              <i class="fa fa-triangle-exclamation"></i> Exceeds available stock
            </div>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" data-i18n="modal.notes.label">Notes (optional)</label>
          <textarea class="form-textarea" name="notes" data-i18n-ph="modal.notes.ph" placeholder="Delivery instructions, special requirements..."></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" onclick="closeModal()" data-i18n="btn.cancel">CANCEL</button>
          <button type="submit" class="btn-confirm" data-i18n="btn.send.request"><i class="fa fa-paper-plane"></i> &nbsp;SEND REQUEST</button>
        </div>
      </form>
    </div>
  </div>
  <script>
    var _modalWholesalePrice = null;
    var _modalAvailable = 0;

    function openModal(lotId, origin, available, wholesalePrice) {
      _modalWholesalePrice = (typeof wholesalePrice === 'number' && wholesalePrice > 0) ? wholesalePrice : null;
      _modalAvailable = available;
      document.getElementById('modalLotId').value = lotId;
      document.getElementById('modalQty').max = available;
      document.getElementById('modalQty').value = '';
      document.getElementById('modalContent').innerHTML =
        '<div class="modal-row"><span class="modal-row-label">Lot</span><span class="modal-row-val">' + lotId + '</span></div>' +
        '<div class="modal-row"><span class="modal-row-label">Origin</span><span class="modal-row-val">' + origin + '</span></div>' +
        '<div class="modal-row" style="margin-bottom:' + (_modalWholesalePrice ? '0' : '16px') + '"><span class="modal-row-label">Available</span><span class="modal-row-val" style="color:var(--amber)">' + available + ' kg</span></div>' +
        (_modalWholesalePrice
          ? '<div class="modal-row" style="margin-bottom:16px" data-modal-unit-price><span class="modal-row-label">Unit Price</span>' +
            '<span class="modal-row-val" style="color:' + (typeof _tierColor !== \'undefined\' ? _tierColor : \'var(--amber)\') + '">' + _modalWholesalePrice.toFixed(2) + ' <span style="font-size:10px;color:var(--text-muted)">SAR/kg</span></span></div>'
          : '');
      document.getElementById('orderTotalRow').style.display = 'none';
      document.getElementById('orderTotalOverStock').style.display = 'none';
      document.getElementById('requestModal').classList.add('open');
      setTimeout(function(){ document.getElementById('modalQty').focus(); }, 80);
    }

    function updateOrderTotal() {
      var qty    = parseFloat(document.getElementById('modalQty').value);
      var row    = document.getElementById('orderTotalRow');
      var valEl  = document.getElementById('orderTotalValue');
      var fmEl   = document.getElementById('orderTotalFormula');
      var overEl = document.getElementById('orderTotalOverStock');
      // ── Hybrid discount breakdown row ──
      var discRow = document.getElementById('orderDiscountRow');

      if (!_modalWholesalePrice || isNaN(qty) || qty <= 0) {
        row.style.display = 'none';
        if (discRow) discRow.style.display = 'none';
        return;
      }

      // Compute hybrid discount (tier base + bulk stacking)
      var hd = (typeof _calcHybridDiscount === 'function') ? _calcHybridDiscount(qty) : { base: 0, bulk: 0, total: 0, isBulk: false };
      var discountFrac  = hd.total / 100;
      var priceAfterDisc = _modalWholesalePrice * (1 - discountFrac);
      var total = qty * priceAfterDisc;

      valEl.textContent = total.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' SAR';

      // Build formula string
      var formulaParts = [];
      formulaParts.push(qty.toFixed(1) + ' kg × ' + priceAfterDisc.toFixed(2) + ' SAR/kg');
      if (hd.total > 0) formulaParts.push('(' + hd.total + '% discount applied)');
      fmEl.textContent = formulaParts.join(' ');

      row.style.display = 'block';

      // Show/update discount breakdown row
      if (discRow && hd.total > 0) {
        var cmCol = (typeof _cmColor !== 'undefined') ? _cmColor : '#f59e0b';
        var discParts = [];
        if (hd.base > 0) discParts.push(_cmTier + ' tier: ' + hd.base + '%');
        if (hd.isBulk) discParts.push('Bulk >' + _BULK_THRESHOLD_BAGS + ' bags: +' + hd.bulk + '%');
        var discLabel = discParts.length ? discParts.join(' + ') : 'No discount';
        discRow.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">' +
          '<span style="font-size:9px;color:var(--text-muted);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.5px">Coffee Miles Discount</span>' +
          '<span style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:' + cmCol + '">−' + hd.total + '%</span>' +
          '</div>' +
          '<div style="font-size:9px;color:var(--text-muted);font-family:var(--font-mono)">' + discLabel + '</div>' +
          (hd.isBulk ? '<div style="font-size:9px;color:var(--green);font-family:var(--font-mono);margin-top:2px">🎉 Bulk bonus unlocked!</div>' : '');
        discRow.style.display = 'block';
      } else if (discRow) {
        discRow.style.display = 'none';
      }

      if (qty > _modalAvailable) {
        overEl.style.display  = 'block';
        row.style.borderColor = 'rgba(239,68,68,0.35)';
        row.style.background  = 'rgba(239,68,68,0.06)';
        valEl.style.color     = 'var(--red)';
      } else {
        overEl.style.display  = 'none';
        var _tc = (typeof _tierColor !== 'undefined') ? _tierColor : 'var(--amber)';
        row.style.borderColor = _tc === '#f59e0b' ? 'rgba(245,158,11,0.30)' : _tc === '#94a3b8' ? 'rgba(148,163,184,0.30)' : 'rgba(245,158,11,0.25)';
        row.style.background  = _tc === '#f59e0b' ? 'rgba(167,139,250,0.07)' : _tc === '#94a3b8' ? 'rgba(148,163,184,0.07)' : 'rgba(245,158,11,0.07)';
        valEl.style.color     = _tc;
      }
    }

    function closeModal() {
      document.getElementById('requestModal').classList.remove('open');
      document.getElementById('modalQty').value = '';
      document.getElementById('orderTotalRow').style.display = 'none';
    }
    document.getElementById('requestModal').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });

    /* ── RECALL ALERT CHECKER ── */
    // Polls for active recalls relevant to this cafe every 30s.
    // Renders persistent urgent red banner(s) at the top of the portal.
    var _shownRecalls = new Set();
    var CAFE_ID = '${cid}';

    function checkRecalls() {
      fetch('/api/recalls/' + CAFE_ID)
        .then(function(r){ return r.json(); })
        .then(function(d){
          (d.recalls || []).forEach(function(recall){
            if (_shownRecalls.has(recall.lotId)) return;
            _shownRecalls.add(recall.lotId);
            renderRecallBanner(recall);
          });
        })
        .catch(function(){});
    }

    function renderRecallBanner(recall) {
      var banner = document.createElement('div');
      banner.className = 'recall-urgent-banner';
      banner.id = 'recall-banner-' + recall.lotId;
      /* Build DOM nodes directly to avoid any string-escaping issues */
      var icon = document.createElement('i');
      icon.className = 'fa fa-triangle-exclamation recall-banner-icon';
      var body = document.createElement('div');
      body.className = 'recall-banner-body';
      var titleEl = document.createElement('div');
      titleEl.className = 'recall-banner-title';
      titleEl.textContent = '\u26a0 URGENT RECALL \u2014 SFDA AUDIT SHIELD';
      var lotEl = document.createElement('div');
      lotEl.className = 'recall-banner-lot';
      lotEl.textContent = 'Lot: ' + recall.lotId + ' \u00b7 ' + recall.lotOrigin + ' \u00b7 Initiated: ' + recall.initiatedAt;
      var instrEl = document.createElement('div');
      instrEl.className = 'recall-banner-instructions';
      instrEl.innerHTML = '<strong>Instructions from Roaster:</strong> ' + recall.instructions;
      body.appendChild(titleEl);
      body.appendChild(lotEl);
      body.appendChild(instrEl);
      var btn = document.createElement('button');
      btn.className = 'recall-banner-close';
      btn.textContent = 'ACKNOWLEDGE';
      btn.setAttribute('data-lot', recall.lotId);
      btn.addEventListener('click', function() { dismissRecallBanner(this.getAttribute('data-lot')); });
      banner.appendChild(icon);
      banner.appendChild(body);
      banner.appendChild(btn);
      document.body.insertBefore(banner, document.body.firstChild.nextSibling || document.body.firstChild);
    }

    function dismissRecallBanner(lotId) {
      var el = document.getElementById('recall-banner-' + lotId);
      if (el) el.style.display = 'none';
    }

    // Initial check + poll every 4 seconds (5-second protocol: recall appears within 5s)
    checkRecalls();
    setInterval(checkRecalls, 4000);
  </script>`
  return shell(pageTitle, body)
}

// ══════════════════════════════════════════════════════════════════
//  ADMIN ROUTES  (no auth guard — client-side navigation handles access)
// ══════════════════════════════════════════════════════════════════

app.get('/admin', (c) => {
  const pendingCount      = beanRequests.filter(r => r.status === 'PENDING').length
  const optimalLots       = coffeeLots.filter(l => l.status === 'OPTIMAL').length
  const criticalBranches  = branches.filter(b => b.riskStatus === 'CRITICAL' || b.riskStatus === 'HIGH').length

  // ── Live Balance: deduct all DISPATCHED orders from purchased totals ──
  const bal = calcLiveBalance(coffeeLots, beanRequests, branches)

  // ── Financial Intelligence — use Gold-tier margin forced across all lots ──
  const portfolio = calcPortfolioFinancials(coffeeLots, bal, branches, undefined, tierMargins.Gold)
  const portValueFmt = portfolio.totalInventoryValue.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const portProfitFmt = portfolio.totalProjectedProfit.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const envPnlFmt = portfolio.totalEnvironmentalPnL.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const envPnlSign  = portfolio.totalEnvironmentalPnL >= 0 ? '+' : ''
  const envPnlColor = portfolio.totalEnvironmentalPnL > 0 ? 'var(--green)' : portfolio.totalEnvironmentalPnL < 0 ? 'var(--red)' : 'var(--text-muted)'
  const spongeKgSign  = portfolio.totalSpongeKgDelta >= 0 ? '+' : ''
  const spongeKgColor = portfolio.totalSpongeKgDelta > 0 ? 'var(--green)' : portfolio.totalSpongeKgDelta < 0 ? 'var(--red)' : 'var(--text-muted)'

  // ── Sponge Effect: compute per-branch coefficients ──────────────────
  const spongeBranches = branches.map(b => {
    const sc = calcSpongeCoefficient(b.humidity)
    return { ...b, sponge: sc }
  })
  const spongeAdj      = bal.spongeAdjustmentKg
  const spongeAdjSign  = spongeAdj >= 0 ? '+' : ''
  const spongeAdjColor = spongeAdj > 0 ? 'var(--green)' : spongeAdj < 0 ? 'var(--red)' : 'var(--text-muted)'

  const content = `
  ${criticalBranches > 0 ? `
  <div class="alert alert-critical">
    <i class="fa fa-triangle-exclamation"></i>
    <div><strong>${criticalBranches} branch${criticalBranches > 1 ? 'es' : ''} require immediate attention</strong> — Humidity levels exceed safe thresholds.</div>
  </div>` : ''}

  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label" data-i18n="stat.live.green">Live Green Stock</div>
      <div class="stat-value">${bal.liveGreenKg.toLocaleString()}</div>
      <div class="stat-unit" data-i18n="stat.kg.available">kg available</div>
    </div>
    <div class="stat-card" style="border-color:rgba(245,158,11,0.35);position:relative;overflow:hidden">
      <div style="position:absolute;top:0;right:0;font-family:var(--font-mono);font-size:9px;padding:2px 8px;background:rgba(245,158,11,0.1);color:var(--amber);border-left:1px solid rgba(245,158,11,0.25);border-bottom:1px solid rgba(245,158,11,0.25);border-radius:0 0 0 4px;letter-spacing:.4px">
        ⬡ SPONGE
      </div>
      <div class="stat-label" data-i18n="stat.live.roasted">Live Roasted Balance</div>
      <div class="stat-value">${bal.liveRoastedKg.toLocaleString()}</div>
      <div class="stat-unit">kg · <span style="color:${spongeAdjColor};font-family:var(--font-mono)">${spongeAdjSign}${spongeAdj} kg sponge adj.</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label" data-i18n="stat.optimal.lots">OPTIMAL Lots</div>
      <div class="stat-value">${optimalLots}</div>
      <div class="stat-unit">${coffeeLots.length} <span data-i18n="stat.total.lots">of total lots</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label" data-i18n="stat.pending">Pending Orders</div>
      <div class="stat-value" style="color:${pendingCount > 0 ? 'var(--red)' : 'var(--green)'}">
        ${pendingCount}
      </div>
      <div class="stat-unit" data-i18n="stat.awaiting">awaiting confirmation</div>
    </div>
  </div>

  <!-- ══ FINANCIAL IMPACT CARD ══ -->
  <div class="card" style="margin-bottom:28px;border-color:rgba(245,158,11,0.35);background:linear-gradient(135deg,var(--bg-1) 0%,rgba(245,158,11,0.04) 100%)">
    <div class="card-title" style="margin-bottom:16px">
      <i class="fa fa-chart-line" style="color:var(--amber)"></i>
      <span data-i18n="fin.impact.card">Financial Impact</span>
      <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(245,158,11,0.10);color:var(--amber);border:1px solid rgba(245,158,11,0.25);margin-left:8px;letter-spacing:.4px">⬡ QFI ENGINE</span>
      <a href="/admin/finance" style="margin-left:auto;font-family:var(--font-mono);font-size:10px;color:var(--amber);text-decoration:none;border:1px solid rgba(245,158,11,0.35);padding:3px 10px;border-radius:2px">
        <i class="fa fa-arrow-right"></i> Finance Tab
      </a>
    </div>

    <!-- Per-tier value + profit rows — Bronze / Silver / Gold + Env P&L -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin-bottom:16px">

      <!-- Bronze tier -->
      <div style="background:var(--bg-2);border:1px solid rgba(205,127,50,0.30);border-radius:var(--radius);padding:14px">
        <div style="font-size:9px;color:#cd7f32;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;font-family:var(--font-mono)">🥉 Bronze — Portfolio</div>
        <div style="font-family:var(--font-mono);font-size:18px;color:#cd7f32;font-weight:700" id="ov-qfi-value-bronze">${Math.round(calcPortfolioFinancials(coffeeLots, bal, branches, undefined, tierMargins.Bronze).totalInventoryValue).toLocaleString('en-SA')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono)">SAR &nbsp;·&nbsp; <span id="ov-qfi-profit-bronze"></span></div>
      </div>

      <!-- Silver tier -->
      <div style="background:var(--bg-2);border:1px solid rgba(148,163,184,0.30);border-radius:var(--radius);padding:14px">
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;font-family:var(--font-mono)">🥈 Silver — Portfolio</div>
        <div style="font-family:var(--font-mono);font-size:18px;color:#94a3b8;font-weight:700" id="ov-qfi-value-silver">${Math.round(calcPortfolioFinancials(coffeeLots, bal, branches, undefined, tierMargins.Silver).totalInventoryValue).toLocaleString('en-SA')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono)">SAR &nbsp;·&nbsp; <span id="ov-qfi-profit-silver"></span></div>
      </div>

      <!-- Gold tier (reference / primary) -->
      <div style="background:var(--bg-2);border:1px solid rgba(245,158,11,0.40);border-radius:var(--radius);padding:14px">
        <div style="font-size:9px;color:#f59e0b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;font-family:var(--font-mono)">🥇 Gold — Portfolio</div>
        <div style="font-family:var(--font-mono);font-size:18px;color:#f59e0b;font-weight:700" id="ov-qfi-value-gold">${Math.round(calcPortfolioFinancials(coffeeLots, bal, branches, undefined, tierMargins.Gold).totalInventoryValue).toLocaleString('en-SA')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono)">SAR &nbsp;·&nbsp; <span id="ov-qfi-profit-gold"></span></div>
      </div>

      <!-- Env P&L -->
      <div style="background:var(--bg-2);border:1px solid rgba(245,158,11,0.25);border-radius:var(--radius);padding:14px">
        <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px" data-i18n="fin.env.pnl">Environmental P&L</div>
        <div style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:${envPnlColor}" id="ov-qfi-env">${envPnlSign}${envPnlFmt}</div>
        <div style="font-size:10px;color:${spongeKgColor};margin-top:2px;font-family:var(--font-mono)">SAR · ${spongeKgSign}${portfolio.totalSpongeKgDelta} kg sponge Δ</div>
      </div>
    </div>
  </div>
  <script>
  /* Refresh Overview Financial Impact card whenever tier margins change on Finance tab */
  (function ovQfiRefresh(){
    function applySnapshot(d){
      var eEl  = document.getElementById('ov-qfi-env');
      var te   = d.totals && d.totals.Gold ? d.totals.Gold.environmentalPnL : d.totalEnvironmentalPnL;
      if(eEl){
        eEl.style.color = te>0?'var(--green)':te<0?'var(--red)':'var(--text-muted)';
        eEl.textContent = (te>=0?'+':'') + te.toFixed(2);
      }
      /* Bronze */
      if(d.totals && d.totals.Bronze){
        var bvEl = document.getElementById('ov-qfi-value-bronze');
        var bpEl = document.getElementById('ov-qfi-profit-bronze');
        if(bvEl) bvEl.textContent = Math.round(d.totals.Bronze.inventoryValue).toLocaleString('en-SA');
        if(bpEl){
          var bp = d.totals.Bronze.projectedProfit;
          bpEl.style.color = bp>=0?'var(--green)':'var(--red)';
          bpEl.textContent = (bp>=0?'+':'') + Math.round(bp).toLocaleString('en-SA') + ' profit';
        }
      }
      /* Silver */
      if(d.totals && d.totals.Silver){
        var svEl = document.getElementById('ov-qfi-value-silver');
        var spEl = document.getElementById('ov-qfi-profit-silver');
        if(svEl) svEl.textContent = Math.round(d.totals.Silver.inventoryValue).toLocaleString('en-SA');
        if(spEl){
          var sp = d.totals.Silver.projectedProfit;
          spEl.style.color = sp>=0?'var(--green)':'var(--red)';
          spEl.textContent = (sp>=0?'+':'') + Math.round(sp).toLocaleString('en-SA') + ' profit';
        }
      }
      /* Gold */
      if(d.totals && d.totals.Gold){
        var pvEl = document.getElementById('ov-qfi-value-gold');
        var ppEl = document.getElementById('ov-qfi-profit-gold');
        if(pvEl) pvEl.textContent = Math.round(d.totals.Gold.inventoryValue).toLocaleString('en-SA');
        if(ppEl){
          var pp = d.totals.Gold.projectedProfit;
          ppEl.style.color = pp>=0?'var(--green)':'var(--red)';
          ppEl.textContent = (pp>=0?'+':'') + Math.round(pp).toLocaleString('en-SA') + ' profit';
        }
      }
    }
    function poll(){
      fetch('/api/finance/snapshot')
        .then(function(r){ return r.json(); })
        .then(applySnapshot).catch(function(){});
    }
    /* Listen for instant broadcast from Finance tab when tier margins are saved */
    if (typeof BroadcastChannel !== 'undefined') {
      var _ch = new BroadcastChannel('qabban_margin');
      _ch.onmessage = function(ev) {
        if (ev.data && (ev.data.type === 'margin_changed' || ev.data.type === 'tier_margins_changed')) {
          /* Fetch snapshot with new tier margins right away */
          fetch('/api/finance/snapshot')
            .then(function(r){ return r.json(); })
            .then(applySnapshot).catch(function(){});
        }
      };
    }
    /* Poll every 10s so if the Finance tab is open in another window, Overview stays in sync */
    setInterval(poll, 10000);
  })();
  </script>

  <!-- Live balance breakdown banner -->
  <div style="background:var(--bg-2);border:1px solid var(--border);border-left:3px solid var(--amber);border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:24px;align-items:center">
    <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;flex-shrink:0">
      <i class="fa fa-scale-balanced" style="color:var(--amber)"></i>&nbsp; <span data-i18n="section.live.balance">Live Balance Formula</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:20px;font-family:var(--font-mono);font-size:12px">
      <span>
        <span style="color:var(--text-muted)">Purchased Green: </span>
        <span style="color:var(--text-pri)">${bal.purchasedGreenKg.toLocaleString()} kg</span>
      </span>
      <span style="color:var(--text-muted)">−</span>
      <span>
        <span style="color:var(--text-muted)">Dispatched (green equiv.): </span>
        <span style="color:var(--red)">${bal.dispatchedGreenEquiv.toLocaleString()} kg</span>
      </span>
      <span style="color:var(--text-muted)">=</span>
      <span>
        <span style="color:var(--text-muted)">Live Balance: </span>
        <span style="color:var(--amber);font-weight:700">${bal.liveGreenKg.toLocaleString()} kg</span>
      </span>
    </div>
  </div>

  <!-- ══ SPONGE EFFECT ENGINE PANEL ══ -->
  <div class="card" style="margin-bottom:28px;border-color:rgba(245,158,11,0.30);background:linear-gradient(135deg,var(--bg-1) 0%,rgba(245,158,11,0.03) 100%)">
    <div class="card-title">
      <i class="fa fa-droplet" style="color:var(--amber)"></i>
      <span data-i18n="section.sponge">Sponge Effect — Dynamic Yield Coefficient Engine</span>
      <span style="font-family:var(--font-mono);font-size:9px;padding:2px 8px;border-radius:2px;background:rgba(245,158,11,0.10);color:var(--amber);border:1px solid rgba(245,158,11,0.30);letter-spacing:.5px" data-i18n="sponge.active">
        ⬡ ACTIVE
      </span>
    </div>

    <!-- Engine explanation row -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="padding:14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-lg);border-top:2px solid var(--text-muted)">
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px" data-i18n="sponge.baseline">Baseline Coefficient</div>
        <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--text-sec)">82.0<span style="font-size:14px">%</span></div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px" data-i18n="sponge.baseline.range">20% ≤ RH ≤ 70%</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px" data-i18n="sponge.no.adj">No adjustment</div>
      </div>
      <div style="padding:14px;background:var(--bg-2);border:1px solid rgba(56,189,248,0.25);border-radius:var(--radius-lg);border-top:2px solid #38bdf8">
        <div style="font-family:var(--font-mono);font-size:9px;color:#38bdf8;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px" data-i18n="sponge.rule.a">Rule A — Coastal</div>
        <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:#38bdf8">82.5<span style="font-size:14px">%</span></div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px">RH &gt; 70% · +0.5%</div>
        <div style="font-size:10px;color:#38bdf8;margin-top:2px" data-i18n="sponge.rule.a.desc">Moisture absorption → heavier green weight</div>
      </div>
      <div style="padding:14px;background:var(--bg-2);border:1px solid rgba(251,146,60,0.25);border-radius:var(--radius-lg);border-top:2px solid #fb923c">
        <div style="font-family:var(--font-mono);font-size:9px;color:#fb923c;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px" data-i18n="sponge.rule.b">Rule B — Arid</div>
        <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:#fb923c">81.7<span style="font-size:14px">%</span></div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px">RH &lt; 20% · −0.3%</div>
        <div style="font-size:10px;color:#fb923c;margin-top:2px" data-i18n="sponge.rule.b.desc">Evaporation loss → lighter green weight</div>
      </div>
    </div>

    <!-- Per-branch coefficient table -->
    <div style="margin-bottom:16px">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px">
        <i class="fa fa-building" style="color:var(--amber)"></i> <span data-i18n="sponge.branch.coeffs">Live Coefficients by Branch</span>
      </div>
      <div style="display:grid;gap:8px">
        ${spongeBranches.map(b => {
          const ruleColor =
            b.sponge.rule === 'MOISTURE_ABSORPTION' ? '#38bdf8' :
            b.sponge.rule === 'EVAPORATION_LOSS'    ? '#fb923c' : 'var(--text-sec)'
          const ruleIcon =
            b.sponge.rule === 'MOISTURE_ABSORPTION' ? 'fa-water' :
            b.sponge.rule === 'EVAPORATION_LOSS'    ? 'fa-sun' : 'fa-minus'
          const ruleBg =
            b.sponge.rule === 'MOISTURE_ABSORPTION' ? 'rgba(56,189,248,0.08)' :
            b.sponge.rule === 'EVAPORATION_LOSS'    ? 'rgba(251,146,60,0.08)' : 'var(--bg-2)'
          const ruleBorder =
            b.sponge.rule === 'MOISTURE_ABSORPTION' ? 'rgba(56,189,248,0.25)' :
            b.sponge.rule === 'EVAPORATION_LOSS'    ? 'rgba(251,146,60,0.25)' : 'var(--border)'
          const deltaStr = b.sponge.delta === 0 ? '—' :
            (b.sponge.delta > 0 ? '+' : '') + (b.sponge.delta * 100).toFixed(1) + '%'
          return `
        <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:${ruleBg};border:1px solid ${ruleBorder};border-radius:var(--radius);flex-wrap:wrap">
          <div style="font-family:var(--font-mono);font-weight:700;font-size:13px;color:var(--text-pri);min-width:80px">${b.name}</div>
          <div style="display:flex;align-items:center;gap:5px;min-width:72px">
            <i class="fa fa-droplet" style="font-size:10px;color:${ruleColor}"></i>
            <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-sec)">${b.humidity}% RH</span>
          </div>
          <div style="flex:1;min-width:180px;font-size:11px;color:${ruleColor}">
            <i class="fa ${ruleIcon}" style="margin-right:5px"></i>${b.sponge.label}
          </div>
          <div style="display:flex;align-items:center;gap:16px;font-family:var(--font-mono);font-size:12px">
            <span style="color:var(--text-muted)">
              Baseline <span style="color:var(--text-sec)">82.0%</span>
            </span>
            <span style="color:var(--text-muted)">→</span>
            <span style="font-size:18px;font-weight:700;color:${ruleColor}">${b.sponge.pct}</span>
            <span style="font-size:10px;padding:2px 7px;border-radius:2px;border:1px solid ${ruleBorder};color:${ruleColor};background:${ruleBg}">${deltaStr}</span>
          </div>
        </div>`}).join('')}
      </div>
    </div>

    <!-- Portfolio-level impact summary -->
    <div style="padding:14px 16px;background:var(--bg-2);border:1px solid var(--border);border-left:3px solid var(--amber);border-radius:var(--radius);display:flex;flex-wrap:wrap;gap:24px;align-items:center">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;flex-shrink:0">
        <i class="fa fa-sigma" style="color:var(--amber)"></i>&nbsp; Portfolio Impact
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:20px;font-family:var(--font-mono);font-size:12px">
        <span>
          <span style="color:var(--text-muted)">Baseline Roasted (0.82): </span>
          <span style="color:var(--text-sec)">${bal.baselineRoastedKg.toLocaleString()} kg</span>
        </span>
        <span style="color:var(--text-muted)">→</span>
        <span>
          <span style="color:var(--text-muted)">Sponge-Adjusted: </span>
          <span style="color:var(--amber);font-weight:700">${bal.liveRoastedKg.toLocaleString()} kg</span>
        </span>
        <span style="color:var(--text-muted)">·</span>
        <span>
          <span style="color:var(--text-muted)">Net Δ: </span>
          <span style="color:${spongeAdjColor};font-weight:700">${spongeAdjSign}${spongeAdj} kg</span>
        </span>
      </div>
    </div>
  </div>
  <!-- ══ end SPONGE EFFECT ENGINE ══ -->

  <!-- ══ KSA ENVIRONMENTAL LIVE FEED ══ -->
  <div class="card" style="margin-bottom:28px" id="envFeedCard">
    <div class="card-title">
      <i class="fa fa-satellite-dish" style="color:var(--amber)"></i>
      KSA Environmental Live Feed
      <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(16,185,129,0.12);color:var(--green);border:1px solid rgba(16,185,129,0.25);letter-spacing:.5px;margin-left:4px" id="envSourceBadge">
        ● LIVE
      </span>
    </div>

    <div class="env-refresh-row">
      <div style="display:flex;flex-direction:column;gap:3px">
        <span class="env-last-updated" id="envLastUpdated">Fetching live sensor data…</span>
        <span id="envCountdown" style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:.3px"></span>
      </div>
      <button class="env-refresh-btn" id="envRefreshBtn" onclick="fetchWeather()">
        <i class="fa fa-rotate-right" id="envRefreshIcon"></i> REFRESH
      </button>
    </div>

    <div class="env-feed-grid" id="envGrid">
      <!-- skeleton cards while loading -->
      ${['Riyadh','Jeddah','Dammam'].map(city => `
      <div class="env-card" id="env-${city}">
        <div class="env-city">
          <span class="env-city-dot"></span>${city}
        </div>
        <div class="env-skeleton">
          <div class="env-skeleton-line" style="width:60%;height:42px;border-radius:4px"></div>
          <div class="env-skeleton-line" style="width:100%;height:4px"></div>
          <div class="env-skeleton-line" style="width:75%"></div>
          <div class="env-skeleton-line" style="width:55%"></div>
        </div>
        <div class="env-source"><i class="fa fa-satellite-dish"></i><span class="env-source-live">LIVE SENSOR DATA: REFRESHED</span></div>
      </div>`).join('')}
    </div>
  </div>
  <!-- ══ end live feed ══ -->

  <script>
  /* ── KSA Weather Feed ── */
  var ENV_REFRESH_MS = 900000;  // auto-refresh every 15 minutes (900 s)
  var envTimer;

  /* danger thresholds */
  function isDanger(city, hum) {
    if (city === 'Jeddah'  && hum > 65)  return { msg: 'HIGH HUMIDITY — Exceeds 65% threshold' };
    if (city === 'Riyadh'  && hum < 30)  return { msg: 'LOW HUMIDITY — Below 30% threshold' };
    if (city === 'Dammam'  && hum > 75)  return { msg: 'CRITICAL — Exceeds 75% threshold' };
    return null;
  }

  /* humidity colour: low=blue, optimal=green, high=orange/red */
  function humColour(h) {
    if (h < 30)  return '#60a5fa';  /* blue  — too dry    */
    if (h < 50)  return '#10b981';  /* green — optimal    */
    if (h < 65)  return '#f97316';  /* orange— elevated   */
    return '#ef4444';               /* red   — danger     */
  }

  /* bar gradient position: maps 0-100% humidity to background-position */
  function barPos(h) { return (100 - h) + '%'; }

  function renderCard(city, data) {
    var card    = document.getElementById('env-' + city);
    if (!card) return;
    var danger  = isDanger(city, data.humidity);
    var col     = humColour(data.humidity);

    card.className = 'env-card' + (danger ? ' env-danger' : '');

    card.innerHTML =
      '<div class="env-city">' +
        '<span class="env-city-dot"></span>' + city +
      '</div>' +
      '<div class="env-humidity-row">' +
        '<span class="env-humidity-val">' + data.humidity + '</span>' +
        '<span class="env-humidity-unit">%</span>' +
      '</div>' +
      '<div class="env-bar-wrap">' +
        '<div class="env-bar-fill" style="width:' + data.humidity + '%;background-position:' + barPos(data.humidity) + '"></div>' +
      '</div>' +
      '<div class="env-meta-row">' +
        '<span class="env-meta-label"><i class="fa fa-thermometer-half" style="color:var(--amber)"></i> Temp</span>' +
        '<span class="env-meta-val">' + data.temp + '°C</span>' +
      '</div>' +
      '<div class="env-meta-row">' +
        '<span class="env-meta-label"><i class="fa fa-wind" style="color:var(--amber)"></i> Wind</span>' +
        '<span class="env-meta-val">' + data.wind + ' km/h</span>' +
      '</div>' +
      '<div class="env-meta-row">' +
        '<span class="env-meta-label"><i class="fa fa-cloud" style="color:var(--amber)"></i> Sky</span>' +
        '<span class="env-meta-val" style="text-transform:capitalize">' + data.desc + '</span>' +
      '</div>' +
      (danger ?
        '<div class="env-alert-tag"><i class="fa fa-triangle-exclamation"></i>' + danger.msg + '</div>' : '') +
      '<div class="env-source" id="env-source-' + city + '">' +
        '<i class="fa fa-satellite-dish"></i>' +
        '<span class="env-source-live">LIVE SENSOR DATA: REFRESHED</span>' +
        '<span class="env-source-time" id="env-src-time-' + city + '"></span>' +
      '</div>';
  }

  function fetchWeather() {
    var btn  = document.getElementById('envRefreshBtn');
    var icon = document.getElementById('envRefreshIcon');
    if (btn)  btn.classList.add('spinning');
    if (icon) icon.style.animation = 'spin .7s linear infinite';

    fetch('/api/weather')
      .then(function(r){ return r.json(); })
      .then(function(d){
        /* update source badge */
        var badge = document.getElementById('envSourceBadge');
        if (badge) {
          if (d.source === 'live') {
            badge.innerHTML = '● LIVE DATA';
            badge.style.color = 'var(--green)';
            badge.style.borderColor = 'rgba(16,185,129,0.25)';
            badge.style.background  = 'rgba(16,185,129,0.12)';
          } else {
            badge.innerHTML = '◌ NO API KEY — SIMULATED';
            badge.style.color = 'var(--amber)';
            badge.style.borderColor = 'rgba(245,158,11,0.3)';
            badge.style.background  = 'rgba(245,158,11,0.10)';
          }
        }
        /* render each city card */
        d.cities.forEach(function(item){
          renderCard(item.city, item);
        });
        /* update timestamp */
        var now = new Date();
        var timeStr = now.toLocaleTimeString('en-SA', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
        var ts = document.getElementById('envLastUpdated');
        if (ts) {
          ts.textContent = (d.source === 'live' ? '🛰 LIVE — Last refreshed: ' : '⚙ SIMULATED — Last refreshed: ') + timeStr;
        }
        /* stamp per-card source line with fetch time */
        d.cities.forEach(function(item) {
          var el = document.getElementById('env-src-time-' + item.city);
          if (el) el.textContent = ' · ' + timeStr;
        });
        /* update next-refresh countdown */
        clearInterval(_countdownTimer);
        _countdownSec = ENV_REFRESH_MS / 1000;
        _countdownTimer = setInterval(function() {
          _countdownSec--;
          var cd = document.getElementById('envCountdown');
          if (cd) {
            var m = Math.floor(_countdownSec / 60);
            var s = _countdownSec % 60;
            cd.textContent = 'Next refresh in ' + m + ':' + (s < 10 ? '0' : '') + s;
          }
          if (_countdownSec <= 0) clearInterval(_countdownTimer);
        }, 1000);
      })
      .catch(function(){
        var ts = document.getElementById('envLastUpdated');
        if (ts) ts.textContent = 'Connection error — retrying…';
      })
      .finally(function(){
        if (btn)  btn.classList.remove('spinning');
        if (icon) icon.style.animation = '';
      });
  }

  /* countdown tracker */
  var _countdownSec  = 0;
  var _countdownTimer;

  /* Initial load + auto-refresh every 15 min */
  fetchWeather();
  envTimer = setInterval(fetchWeather, ENV_REFRESH_MS);
  </script>

  <div style="display:grid;gap:20px;grid-template-columns:1fr 1fr;margin-bottom:28px">
    <div class="card">
      <div class="card-title">Branch Risk Matrix</div>
      ${branches.map(b => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bg-3)">
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${b.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${b.activeLots} lots · ${b.totalGreenKg} kg green</div>
          <div class="humidity-bar">
            <div class="humidity-fill" style="width:${b.humidity}%;background:${
              b.riskStatus === 'LOW' ? 'var(--green)' :
              b.riskStatus === 'MODERATE' ? 'var(--orange)' :
              b.riskStatus === 'HIGH' ? '#fb923c' : 'var(--red)'}"></div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-mono);font-size:20px;color:var(--amber)">${b.humidity}%</div>
          <span class="badge badge-${b.riskStatus}">${b.riskStatus}</span>
        </div>
      </div>`).join('')}
    </div>
    <div class="card">
      <div class="card-title">Recent Bean Requests</div>
      ${beanRequests.length === 0
        ? '<div class="empty-state"><i class="fa fa-inbox"></i>No requests yet</div>'
        : beanRequests.slice(-4).reverse().map(r => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bg-3)">
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${r.cafeName}</div>
          <div style="font-size:11px;color:var(--text-muted)">${r.lotOrigin} · ${r.quantityKg} kg</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${r.requestedAt}</div>
        </div>
        <span class="badge badge-${r.status}">${r.status}</span>
      </div>`).join('')}
      <a href="/admin/requests" style="display:block;text-align:center;margin-top:12px;font-family:var(--font-mono);font-size:11px;color:var(--amber)">
        View all requests →
      </a>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Inventory Shrinkage Summary — All Branches <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(245,158,11,0.10);color:var(--amber);border:1px solid rgba(245,158,11,0.25);margin-left:6px">⬡ SPONGE-ADJUSTED</span></div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lot ID</th><th>Origin</th><th>Branch</th>
            <th>Purchased Green</th><th>Purchased Roasted</th>
            <th>Dispatched</th>
            <th>Live Green Balance</th><th>Live Roasted Balance</th>
            <th>⬡ Yield Coeff.</th>
            <th>Status</th><th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${coffeeLots.map(l => {
            const lb = bal.byLot.get(l.id)!
            const hasDispatch = lb.dispatchedRoastedKg > 0
            const sc = lb.sponge
            const coeffColor =
              sc.rule === 'MOISTURE_ABSORPTION' ? '#38bdf8' :
              sc.rule === 'EVAPORATION_LOSS'    ? '#fb923c' : 'var(--text-sec)'
            const coeffIcon =
              sc.rule === 'MOISTURE_ABSORPTION' ? '▲' :
              sc.rule === 'EVAPORATION_LOSS'    ? '▼' : '—'
            return `
          <tr>
            <td class="mono" style="color:var(--amber)">${l.id}</td>
            <td style="font-weight:500">${l.origin}</td>
            <td style="font-size:12px;color:var(--text-sec)">${l.branch}</td>
            <td class="mono" style="color:var(--text-muted)">${lb.purchasedGreenKg} kg</td>
            <td class="mono" style="color:var(--text-muted)">${lb.purchasedRoastedKg} kg</td>
            <td class="mono" style="color:${hasDispatch ? 'var(--red)' : 'var(--text-muted)'}">
              ${hasDispatch ? `−${lb.dispatchedRoastedKg} kg <span style="font-size:10px;color:var(--text-muted)">(≈${lb.dispatchedGreenEquiv} green)</span>` : '—'}
            </td>
            <td class="mono" style="color:var(--amber);font-weight:600">${lb.liveGreenKg} kg</td>
            <td class="mono" style="color:var(--amber)">${lb.liveRoastedKg} kg</td>
            <td>
              <span style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:${coeffColor}">${coeffIcon} ${sc.pct}</span>
              <div style="font-size:9px;color:var(--text-muted);margin-top:2px">${sc.humidity}% RH</div>
            </td>
            <td><span class="badge badge-${l.status}">${l.status}</span></td>
            <td>
              <div class="score-bar">
                <div class="score-track"><div class="score-fill" style="width:${l.gradeScore}%"></div></div>
                <span class="score-num">${l.gradeScore}</span>
              </div>
            </td>
          </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`

  return c.html(adminLayout('Overview Dashboard', 'overview', content, pendingCount))
})

// ── GET /admin/branches ─────────────────────────────────────────
app.get('/admin/branches', (c) => {
  const pendingCount = beanRequests.filter(r => r.status === 'PENDING').length
  const filter = (c.req.query('branch') ?? 'all').trim()

  // live lot stats per branch
  const lotsByBranch = new Map<string, typeof coffeeLots>()
  for (const b of branches) {
    lotsByBranch.set(b.name, coffeeLots.filter(l => l.branch === b.name))
  }

  // aggregate balance for whole inventory (used in stat cards)
  const bal = calcLiveBalance(coffeeLots, beanRequests, branches)

  // helper: risk colour
  const riskColor = (r: string) =>
    r === 'LOW' ? 'var(--green)' : r === 'MODERATE' ? 'var(--orange)' : r === 'HIGH' ? '#fb923c' : 'var(--red)'

  // stat cards at top
  const totalBranches    = branches.length
  const criticalCount    = branches.filter(b => b.riskStatus === 'CRITICAL').length
  const highCount        = branches.filter(b => b.riskStatus === 'HIGH').length
  const totalActiveLots  = coffeeLots.filter(l => l.status !== 'RECALLED').length

  // branch filter tabs
  const tabs = [{ id: 'all', label: 'All Branches' }, ...branches.map(b => ({ id: b.name.toLowerCase(), label: b.name }))]

  const content = `
  <style>
    /* ── ADD-BRANCH MODAL ── */
    .branch-modal-overlay {
      display:none; position:fixed; inset:0; z-index:200;
      background:rgba(0,0,0,0.72); align-items:center; justify-content:center;
    }
    .branch-modal-overlay.open { display:flex; }
    .branch-modal {
      background:var(--bg-2); border:1px solid var(--border-amber);
      border-radius:var(--radius-lg); padding:32px; width:520px; max-width:95vw;
      max-height:90vh; overflow-y:auto;
    }
    .branch-modal-title {
      font-family:var(--font-mono); font-size:13px; color:var(--amber);
      letter-spacing:.8px; text-transform:uppercase; margin-bottom:20px;
      display:flex; align-items:center; gap:10px;
    }
    .branch-modal label {
      display:block; font-size:11px; color:var(--text-sec);
      text-transform:uppercase; letter-spacing:.6px; margin:14px 0 5px;
    }
    .branch-modal input, .branch-modal select {
      width:100%; padding:9px 12px;
      background:var(--bg-3); border:1px solid var(--border);
      color:var(--text-pri); font-size:13px; font-family:var(--font-mono);
      border-radius:var(--radius); outline:none;
    }
    .branch-modal input:focus, .branch-modal select:focus {
      border-color:var(--amber); box-shadow:0 0 0 2px var(--amber-glow);
    }
    .branch-modal-footer {
      display:flex; gap:10px; justify-content:flex-end; margin-top:24px;
    }
    .btn-add-branch {
      padding:8px 18px; background:var(--amber); color:var(--bg-0);
      font-family:var(--font-mono); font-size:11px; font-weight:700;
      letter-spacing:.8px; border:none; border-radius:var(--radius); cursor:pointer;
    }
    .btn-add-branch:hover { background:#fbbf24; }
    .btn-cancel-branch {
      padding:8px 18px; background:transparent;
      color:var(--text-sec); font-family:var(--font-mono); font-size:11px;
      border:1px solid var(--border); border-radius:var(--radius); cursor:pointer;
    }
    /* ── EDIT SENSOR MODAL ── */
    .sensor-modal-overlay {
      display:none; position:fixed; inset:0; z-index:200;
      background:rgba(0,0,0,0.72); align-items:center; justify-content:center;
    }
    .sensor-modal-overlay.open { display:flex; }
    .sensor-modal {
      background:var(--bg-2); border:1px solid rgba(59,130,246,0.4);
      border-radius:var(--radius-lg); padding:28px; width:460px; max-width:95vw;
    }
    .sensor-modal-title {
      font-family:var(--font-mono); font-size:13px; color:#3b82f6;
      letter-spacing:.8px; text-transform:uppercase; margin-bottom:18px;
    }
    .sensor-modal label {
      display:block; font-size:11px; color:var(--text-sec);
      text-transform:uppercase; letter-spacing:.6px; margin:12px 0 4px;
    }
    .sensor-modal input {
      width:100%; padding:9px 12px;
      background:var(--bg-3); border:1px solid var(--border);
      color:var(--text-pri); font-size:13px; font-family:var(--font-mono);
      border-radius:var(--radius); outline:none;
    }
    .sensor-modal input:focus { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,0.15); }
    .sensor-modal-footer { display:flex; gap:10px; justify-content:flex-end; margin-top:20px; }
    .btn-save-sensor {
      padding:8px 18px; background:#3b82f6; color:white;
      font-family:var(--font-mono); font-size:11px; font-weight:700;
      letter-spacing:.8px; border:none; border-radius:var(--radius); cursor:pointer;
    }
    /* ── IoT Data Fidelity Toggle ── */
    .iot-toggle { position:relative; display:inline-block; width:38px; height:20px; cursor:pointer; }
    .iot-toggle input { opacity:0; width:0; height:0; }
    .iot-slider {
      position:absolute; inset:0; background:#334155; border-radius:20px; transition:.3s;
      border:1px solid var(--border);
    }
    .iot-slider::before {
      content:''; position:absolute; width:14px; height:14px; left:2px; bottom:2px;
      background:white; border-radius:50%; transition:.3s;
    }
    .iot-toggle input:checked + .iot-slider { background:rgba(16,185,129,0.3); border-color:rgba(16,185,129,0.6); }
    .iot-toggle input:checked + .iot-slider::before { transform:translateX(18px); background:var(--green); }
    .btn-save-sensor:hover { background:#2563eb; }
    /* ── BRANCH FILTER TABS ── */
    .branch-tabs {
      display:flex; gap:6px; flex-wrap:wrap; margin-bottom:20px;
    }
    .branch-tab {
      padding:6px 14px; font-family:var(--font-mono); font-size:11px;
      border:1px solid var(--border); border-radius:20px;
      color:var(--text-sec); background:var(--bg-2); cursor:pointer;
      text-decoration:none; transition:all .15s;
    }
    .branch-tab:hover { border-color:var(--amber); color:var(--amber); text-decoration:none; }
    .branch-tab.active { background:var(--amber-glow); border-color:var(--amber); color:var(--amber); }
    /* ── ENHANCED BRANCH CARD ── */
    .branch-card-v2 {
      background:var(--bg-2); border:1px solid var(--border);
      border-radius:var(--radius-lg); overflow:hidden;
      transition:border-color .15s, transform .15s;
    }
    .branch-card-v2:hover { transform:translateY(-1px); }
    .branch-card-v2.risk-LOW    { border-top:3px solid var(--green); }
    .branch-card-v2.risk-MODERATE { border-top:3px solid var(--orange); }
    .branch-card-v2.risk-HIGH   { border-top:3px solid #fb923c; }
    .branch-card-v2.risk-CRITICAL { border-top:3px solid var(--red); }
    .bcard-header {
      padding:16px 18px 10px; display:flex; justify-content:space-between; align-items:flex-start;
    }
    .bcard-name { font-weight:600; font-size:15px; color:var(--text-pri); }
    .bcard-id   { font-family:var(--font-mono); font-size:10px; color:var(--text-muted); margin-top:2px; }
    .bcard-climate {
      font-family:var(--font-mono); font-size:10px;
      padding:3px 8px; border-radius:3px; border:1px solid;
    }
    .bcard-climate.Inland  { color:#fbbf24; border-color:rgba(251,191,36,0.3); background:rgba(251,191,36,0.07); }
    .bcard-climate.Coastal { color:#38bdf8; border-color:rgba(56,189,248,0.3); background:rgba(56,189,248,0.07); }
    .bcard-metrics { padding:0 18px 14px; display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .bcard-metric-box {
      padding:10px 12px; background:var(--bg-3); border-radius:var(--radius);
      border:1px solid var(--border);
    }
    .bcard-metric-label { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
    .bcard-metric-val   { font-family:var(--font-mono); font-size:20px; font-weight:700; }
    .bcard-bar-wrap { padding:0 18px 14px; }
    .bcard-bar-label { font-size:10px; color:var(--text-muted); display:flex; justify-content:space-between; margin-bottom:4px; }
    .bcard-bar { height:6px; background:var(--bg-4); border-radius:3px; overflow:hidden; }
    .bcard-bar-fill { height:100%; border-radius:3px; transition:width .4s; }
    .bcard-stats { padding:0 18px 14px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .bcard-stat { font-size:11px; color:var(--text-sec); }
    .bcard-stat strong { color:var(--text-pri); font-family:var(--font-mono); }
    .bcard-footer {
      padding:10px 18px; border-top:1px solid var(--border);
      display:flex; align-items:center; justify-content:space-between;
    }
    .bcard-checked { font-size:10px; color:var(--text-muted); font-family:var(--font-mono); }
    .btn-edit-sensor {
      padding:5px 12px; font-family:var(--font-mono); font-size:10px;
      background:transparent; border:1px solid rgba(59,130,246,0.4);
      color:#3b82f6; border-radius:var(--radius); cursor:pointer;
      display:flex; align-items:center; gap:5px;
    }
    .btn-edit-sensor:hover { background:rgba(59,130,246,0.1); }
    /* ── LOTS TABLE BRANCH HIGHLIGHT ── */
    .branch-section-header {
      padding:10px 0 6px;
      font-family:var(--font-mono); font-size:12px; color:var(--amber);
      border-bottom:1px solid var(--border); margin-bottom:2px;
      display:flex; align-items:center; gap:8px;
    }
  </style>

  <!-- ── ALERTS ── -->
  ${branches.filter(b => b.riskStatus === 'CRITICAL').map(b => `
  <div class="alert alert-critical" style="margin-bottom:10px">
    <i class="fa fa-triangle-exclamation"></i>
    <strong>CRITICAL:</strong>&nbsp; ${b.name} branch (${b.id}) humidity at <strong>${b.humidity}%</strong> — immediate dehumidification required.
  </div>`).join('')}
  ${branches.filter(b => b.riskStatus === 'HIGH').map(b => `
  <div class="alert alert-warning" style="margin-bottom:10px">
    <i class="fa fa-exclamation-triangle"></i>
    <strong>HIGH RISK:</strong>&nbsp; ${b.name} branch humidity at <strong>${b.humidity}%</strong> — dehumidify within 48h.
  </div>`).join('')}

  <!-- ── TOP STAT STRIP ── -->
  <div class="stat-grid" style="margin-bottom:24px">
    <div class="stat-card">
      <div class="stat-label">Active Branches</div>
      <div class="stat-value">${totalBranches}</div>
      <div class="stat-sub">locations online</div>
    </div>
    <div class="stat-card">
      <div class="stat-label" style="color:var(--red)">Critical / High Risk</div>
      <div class="stat-value" style="color:${criticalCount > 0 ? 'var(--red)' : 'var(--orange)'}">${criticalCount + highCount}</div>
      <div class="stat-sub">${criticalCount} critical · ${highCount} high</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active Lots</div>
      <div class="stat-value">${totalActiveLots}</div>
      <div class="stat-sub">across all branches</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Live Green Stock</div>
      <div class="stat-value">${bal.liveGreenKg.toFixed(1)}<span style="font-size:14px;color:var(--text-sec)"> kg</span></div>
      <div class="stat-sub">all branches combined</div>
    </div>
  </div>

  <!-- ── PAGE ACTIONS ── -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
    <div class="branch-tabs">
      ${tabs.map(t => `<a href="/admin/branches?branch=${t.id}" class="branch-tab ${filter === t.id ? 'active' : ''}">${t.label}</a>`).join('')}
    </div>
    <button class="btn-add-branch" onclick="openAddBranchModal()">
      <i class="fa fa-plus"></i>&nbsp; ADD NEW BRANCH
    </button>
  </div>

  <!-- ── BRANCH CARDS GRID ── -->
  <div class="branch-grid" style="margin-bottom:28px">
    ${branches
      .filter(b => filter === 'all' || b.name.toLowerCase() === filter)
      .map(b => {
        const bLots = lotsByBranch.get(b.name) ?? []
        const activeLotCount = bLots.filter(l => l.status !== 'RECALLED').length
        const recalledCount  = bLots.filter(l => l.status === 'RECALLED').length
        const greenSum  = bLots.reduce((s, l) => s + l.greenWeightKg, 0)
        const roastSum  = applyRoastShrinkage(greenSum)
        const preset    = CLIMATE_PRESETS[b.climateType]
        const humiColor = riskColor(b.riskStatus)
        // cafe clients at this branch
        const localCafes = cafeClients.filter(cl => cl.branch === b.name)
        return `
    <div class="branch-card-v2 risk-${b.riskStatus}">
      <div class="bcard-header">
        <div>
          <div class="bcard-name"><i class="fa fa-building" style="color:var(--text-muted);font-size:12px;margin-right:6px"></i>${b.name}</div>
          <div class="bcard-id">${b.id} · ${b.city}</div>
        </div>
        <span class="bcard-climate ${b.climateType}">${b.climateType}</span>
      </div>

      <!-- ── DATA FIDELITY TOGGLE ── -->
      ${(() => {
        const hasIot    = b.iot_humidity !== null && b.last_iot_reading_at !== null
        const ageMs     = hasIot ? Date.now() - new Date(b.last_iot_reading_at!).getTime() : null
        const isStale   = ageMs !== null && ageMs > IOT_STALE_THRESHOLD_MS
        const isIotMode = b.humidity_source === 'IOT_SENSOR'
        const showStale = isIotMode && isStale
        const showNoData= isIotMode && !hasIot
        const { rh: activeRH } = resolveActiveRH(b)
        return `
      <div style="padding:8px 18px;background:rgba(15,23,42,0.6);border-top:1px solid var(--border)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">
            <i class="fa fa-tower-broadcast" style="margin-right:4px"></i>Data Fidelity
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:10px;color:${isIotMode ? 'var(--text-muted)' : 'var(--amber)'}">City Weather</span>
            <label class="iot-toggle" title="Switch between General City Weather and Local Room Sensor">
              <input type="checkbox" ${isIotMode ? 'checked' : ''}
                onchange="toggleIotSource('${b.id}', this.checked)"
                id="iot-toggle-${b.id}"/>
              <span class="iot-slider"></span>
            </label>
            <span style="font-size:10px;color:${isIotMode ? 'var(--green)' : 'var(--text-muted)'}">Local Sensor</span>
          </div>
        </div>
        <!-- Source badge row -->
        <div style="margin-top:5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span id="src-badge-${b.id}" style="font-size:10px;font-family:var(--font-mono);padding:2px 7px;border-radius:3px;background:${isIotMode ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'};border:1px solid ${isIotMode ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'};color:${isIotMode ? 'var(--green)' : 'var(--amber)'}">
            ${isIotMode ? '<i class="fa fa-microchip"></i> IOT_SENSOR' : '<i class="fa fa-cloud-sun"></i> WEATHER_API'}
          </span>
          <span style="font-size:10px;color:var(--text-muted)">Active RH:
            <span style="font-family:var(--font-mono);color:${humiColor}">${activeRH}%</span>
          </span>
          ${hasIot && !isStale ? `<span style="font-size:10px;color:var(--green)"><i class="fa fa-circle-check"></i> IoT Live</span>` : ''}
          ${showNoData ? `<span style="font-size:10px;color:#fb923c"><i class="fa fa-triangle-exclamation"></i> Waiting for first pulse</span>` : ''}
          ${showStale ? `<span id="stale-warn-${b.id}" style="font-size:10px;color:var(--red);font-weight:600;animation:pulse 1.4s ease-in-out infinite">
            <i class="fa fa-clock-rotate-left"></i> STALE DATA — ${ageMs !== null ? Math.round(ageMs/60000) : '?'}min ago · Auto-fallback active
          </span>` : ''}
        </div>
        <!-- IoT reading display (when available) -->
        ${hasIot ? `<div style="margin-top:4px;font-size:10px;color:var(--text-muted)">
          <i class="fa fa-microchip" style="color:var(--green);margin-right:3px"></i>
          Sensor: <span style="font-family:var(--font-mono);color:${isStale ? 'var(--red)' : 'var(--green)'}">
            ${b.iot_humidity}% RH · ${b.iot_temperature}°C
          </span>
          <span style="margin-left:4px;font-family:var(--font-mono)">
            · Last: ${b.last_iot_reading_at ? new Date(b.last_iot_reading_at).toLocaleString('en-SA', {hour:'2-digit',minute:'2-digit'}) : '—'}
          </span>
        </div>` : `<div style="margin-top:4px;font-size:10px;color:var(--text-muted)">
          <i class="fa fa-microchip" style="margin-right:3px"></i>Device key: <span style="font-family:var(--font-mono);color:var(--text-muted);font-size:9px">${b.iot_device_key.slice(0,28)}…</span>
        </div>`}
      </div>`
      })()}

      <div class="bcard-metrics">
        <div class="bcard-metric-box">
          <div class="bcard-metric-label">Humidity</div>
          <div class="bcard-metric-val" style="color:${humiColor}">${b.humidity}<span style="font-size:13px">%</span></div>
        </div>
        <div class="bcard-metric-box">
          <div class="bcard-metric-label">Temperature</div>
          <div class="bcard-metric-val" style="color:var(--orange)">${b.temperature}<span style="font-size:13px">°C</span></div>
        </div>
      </div>
      <div class="bcard-bar-wrap">
        <div class="bcard-bar-label">
          <span>Humidity Level</span>
          <span style="color:${humiColor}">${b.riskStatus}</span>
        </div>
        <div class="bcard-bar">
          <div class="bcard-bar-fill" style="width:${b.humidity}%;background:${humiColor}"></div>
        </div>
      </div>
      <div class="bcard-stats">
        <div class="bcard-stat"><strong>${activeLotCount}</strong> active lots</div>
        <div class="bcard-stat"><strong>${recalledCount}</strong> recalled lots</div>
        <div class="bcard-stat"><strong>${greenSum} kg</strong> green total</div>
        <div class="bcard-stat"><strong>${roastSum} kg</strong> roasted equiv.</div>
        <div class="bcard-stat" style="grid-column:1/-1"><strong>${localCafes.length}</strong> cafe client${localCafes.length !== 1 ? 's' : ''}${localCafes.length > 0 ? ': ' + localCafes.map(cl => cl.name).join(', ') : ''}</div>
      </div>
      <div style="padding:0 18px 14px">
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">CLIMATE ADVISORY</div>
        <div style="font-size:11px;color:var(--text-sec);line-height:1.5">${preset.storageAdvice}</div>
        <div style="font-size:10px;color:${humiColor};margin-top:4px">${preset.acuteRiskNote}</div>
      </div>
      <div class="bcard-footer">
        <div class="bcard-checked"><i class="fa fa-clock" style="margin-right:4px"></i>Checked: ${b.lastChecked}</div>
        <button class="btn-edit-sensor" onclick="openSensorModal('${b.id}','${b.name}',${b.humidity},${b.temperature},'${b.iot_device_key}')">
          <i class="fa fa-sliders"></i> Update Sensors
        </button>
      </div>
    </div>`}).join('')}
  </div>



  <!-- ── RISK THRESHOLD LEGEND ── -->
  <div class="card" style="margin-bottom:24px">
    <div class="card-title"><i class="fa fa-triangle-exclamation" style="color:var(--amber);margin-right:6px"></i>Humidity Risk Thresholds</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding-top:8px">
      ${[
        { label: 'LOW',      range: '< 50%',  color: 'var(--green)',  desc: 'Ideal conditions — standard ventilation' },
        { label: 'MODERATE', range: '50–61%', color: 'var(--orange)', desc: 'Monitor weekly'                          },
        { label: 'HIGH',     range: '62–74%', color: '#fb923c',       desc: 'Dehumidify within 48h'                   },
        { label: 'CRITICAL', range: '≥ 75%',  color: 'var(--red)',    desc: 'Immediate action required'               },
      ].map(t => `
      <div style="padding:14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-lg)">
        <span class="badge badge-${t.label}">${t.label}</span>
        <div style="font-family:var(--font-mono);font-size:20px;color:${t.color};margin:8px 0 2px">${t.range}</div>
        <div style="font-size:11px;color:var(--text-muted)">${t.desc}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- ── LOTS BY BRANCH TABLE ── -->
  <div class="card">
    <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
      <span><i class="fa fa-list" style="color:var(--amber);margin-right:8px"></i>Lots by Branch</span>
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${coffeeLots.length} total lots</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lot ID</th>
            <th>Origin</th>
            <th>Branch</th>
            <th>Green</th>
            <th>Roasted</th>
            <th>Roast Date</th>
            <th>Expiry</th>
            <th>Status</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${branches
            .filter(b => filter === 'all' || b.name.toLowerCase() === filter)
            .flatMap(b => coffeeLots.filter(l => l.branch === b.name).map(l => `
          <tr style="${l.status === 'RECALLED' ? 'opacity:.5' : ''}">
            <td class="mono" style="color:${l.status === 'RECALLED' ? 'var(--red)' : 'var(--amber)'}">${l.id}</td>
            <td>
              <div style="font-weight:500;font-size:13px">${l.origin}</div>
              <div style="font-size:10px;color:var(--text-muted)">${l.variety} · ${l.process}</div>
            </td>
            <td>
              <span style="font-size:11px;padding:2px 7px;border-radius:3px;background:var(--bg-3);border:1px solid var(--border)">${b.name}</span>
            </td>
            <td class="mono">${l.greenWeightKg} kg</td>
            <td class="mono" style="color:var(--amber)">${l.roastedWeightKg} kg</td>
            <td class="mono" style="font-size:11px;color:var(--text-muted)">${l.roastDate}</td>
            <td class="mono" style="font-size:11px;color:var(--text-muted)">${l.expiryDate}</td>
            <td><span class="badge badge-${l.status}">${l.status}</span></td>
            <td>
              <div class="score-bar">
                <div class="score-track"><div class="score-fill" style="width:${l.gradeScore}%"></div></div>
                <span class="score-num">${l.gradeScore}</span>
              </div>
            </td>
          </tr>`)).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ ADD NEW BRANCH MODAL ══ -->
  <div class="branch-modal-overlay" id="addBranchOverlay">
    <div class="branch-modal">
      <div class="branch-modal-title"><i class="fa fa-plus-circle"></i> Add New Branch</div>
      <form id="addBranchForm" onsubmit="submitAddBranch(event)">
        <label>Branch Name</label>
        <input type="text" name="name" placeholder="e.g. Khobar" required/>
        <label>City</label>
        <input type="text" name="city" placeholder="e.g. Al Khobar" required/>
        <label>Climate Type</label>
        <select name="climateType">
          <option value="Inland">Inland — Arid (Riyadh pattern, low humidity)</option>
          <option value="Coastal">Coastal — Humid (Jeddah / Dammam pattern)</option>
        </select>
        <label>Initial Humidity (%)</label>
        <input type="number" name="humidity" min="0" max="100" placeholder="e.g. 52" required/>
        <label>Initial Temperature (°C)</label>
        <input type="number" name="temperature" min="0" max="60" placeholder="e.g. 24" required/>
        <div style="margin-top:16px;padding:12px;background:var(--bg-3);border-radius:var(--radius);font-size:11px;color:var(--text-sec);line-height:1.6">
          <i class="fa fa-circle-info" style="color:var(--amber);margin-right:6px"></i>
          The risk status is <strong>auto-calculated</strong> from humidity using the selected climate preset thresholds.
          A new Branch ID will be assigned automatically.
        </div>
        <div class="branch-modal-footer">
          <button type="button" class="btn-cancel-branch" onclick="closeAddBranchModal()">CANCEL</button>
          <button type="submit" class="btn-add-branch"><i class="fa fa-check"></i>&nbsp; CONFIRM ADD</button>
        </div>
      </form>
    </div>
  </div>



  <!-- ══ UPDATE SENSOR MODAL ══ -->
  <div class="sensor-modal-overlay" id="sensorOverlay">
    <div class="sensor-modal">
      <div class="sensor-modal-title"><i class="fa fa-sliders"></i> Update Sensor Reading — <span id="sensorBranchName"></span></div>
      <form id="sensorForm" onsubmit="submitSensorUpdate(event)">
        <input type="hidden" name="branchId" id="sensorBranchId"/>
        <label>Humidity (%)</label>
        <input type="number" name="humidity" id="sensorHumidity" min="0" max="100" required/>
        <label>Temperature (°C)</label>
        <input type="number" name="temperature" id="sensorTemperature" min="0" max="60" required/>

        <!-- IoT Device Key (read-only reference for ESP32 firmware) -->
        <label style="margin-top:16px">IoT Device Key <span style="color:var(--text-muted);font-weight:400">(copy to firmware)</span></label>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="text" id="sensorDeviceKey" readonly style="cursor:text;color:var(--amber);font-size:11px;letter-spacing:.3px"/>
          <button type="button" onclick="copyDeviceKey()" title="Copy to clipboard"
            style="padding:6px 10px;background:#334155;border:1px solid var(--border);border-radius:4px;color:var(--text);cursor:pointer;font-size:12px">
            <i class="fa fa-copy"></i>
          </button>
        </div>
        <div style="margin-top:8px;padding:10px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);border-radius:6px;font-size:10px;color:var(--text-sec);line-height:1.6">
          <i class="fa fa-circle-info" style="color:var(--green);margin-right:4px"></i>
          Flash this key into your <strong>ESP32/DHT22</strong> firmware. The sensor should POST to
          <code style="background:#0f172a;padding:1px 5px;border-radius:3px">/api/iot/telemetry</code>
          with <code style="background:#0f172a;padding:1px 5px;border-radius:3px">{ device_key, humidity, temperature }</code>.
          Readings older than <strong>60 min</strong> trigger automatic fallback to City Weather API.
        </div>

        <div class="sensor-modal-footer">
          <button type="button" class="btn-cancel-branch" onclick="closeSensorModal()">CANCEL</button>
          <button type="submit" class="btn-save-sensor"><i class="fa fa-check"></i>&nbsp; SAVE READING</button>
        </div>
      </form>
    </div>
  </div>

  <script>
  // ── Add Branch modal ──────────────────────────────────────────
  function openAddBranchModal() {
    document.getElementById('addBranchOverlay').classList.add('open')
  }
  function closeAddBranchModal() {
    document.getElementById('addBranchOverlay').classList.remove('open')
    document.getElementById('addBranchForm').reset()
  }
  async function submitAddBranch(e) {
    e.preventDefault()
    const fd   = new FormData(e.target)
    const body = Object.fromEntries(fd.entries())
    const res  = await fetch('/admin/branches/add', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (res.ok) {
      closeAddBranchModal()
      window.location.reload()
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      alert('Error: ' + (err.error ?? 'Could not add branch'))
    }
  }

  // ── Update Sensor modal ───────────────────────────────────────
  function openSensorModal(id, name, humidity, temperature, deviceKey) {
    document.getElementById('sensorBranchName').textContent = name
    document.getElementById('sensorBranchId').value         = id
    document.getElementById('sensorHumidity').value         = humidity
    document.getElementById('sensorTemperature').value      = temperature
    document.getElementById('sensorDeviceKey').value        = deviceKey || ''
    document.getElementById('sensorOverlay').classList.add('open')
  }
  function closeSensorModal() {
    document.getElementById('sensorOverlay').classList.remove('open')
  }
  function copyDeviceKey() {
    const el = document.getElementById('sensorDeviceKey')
    navigator.clipboard.writeText(el.value).then(() => {
      el.style.borderColor = 'var(--green)'
      setTimeout(() => el.style.borderColor = '', 1500)
    })
  }
  async function submitSensorUpdate(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const branchId    = fd.get('branchId')
    const humidity    = parseFloat(fd.get('humidity'))
    const temperature = parseFloat(fd.get('temperature'))
    const res = await fetch('/admin/branches/' + branchId + '/update', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ humidity, temperature }),
    })
    if (res.ok) {
      closeSensorModal()
      window.location.reload()
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      alert('Error: ' + (err.error ?? 'Could not update sensor'))
    }
  }

  // ── Data Fidelity Toggle — switches humidity source ───────────
  async function toggleIotSource(branchId, wantIot) {
    const source = wantIot ? 'IOT_SENSOR' : 'WEATHER_API'
    const toggle = document.getElementById('iot-toggle-' + branchId)
    if (toggle) toggle.disabled = true
    try {
      const res = await fetch('/api/iot/source-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, source }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Toggle failed')
      // Update source badge without full reload
      const badge = document.getElementById('src-badge-' + branchId)
      if (badge) {
        badge.innerHTML = source === 'IOT_SENSOR'
          ? '<i class="fa fa-microchip"></i> IOT_SENSOR'
          : '<i class="fa fa-cloud-sun"></i> WEATHER_API'
        badge.style.background = source === 'IOT_SENSOR' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'
        badge.style.borderColor = source === 'IOT_SENSOR' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'
        badge.style.color = source === 'IOT_SENSOR' ? 'var(--green)' : 'var(--amber)'
      }
      if (data.warning) {
        // Show transient warning banner instead of blocking alert
        const warnId = 'iot-warn-' + branchId
        let warn = document.getElementById(warnId)
        if (!warn) {
          warn = document.createElement('div')
          warn.id = warnId
          warn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;padding:12px 16px;background:#1e293b;border:1px solid rgba(245,158,11,0.5);border-radius:8px;font-size:12px;color:var(--amber);max-width:340px;line-height:1.5'
          document.body.appendChild(warn)
        }
        warn.innerHTML = '<i class="fa fa-triangle-exclamation" style="margin-right:6px"></i>' + data.warning
        setTimeout(() => warn.remove(), 6000)
      }
    } catch(e) {
      alert('Source toggle error: ' + e.message)
      // Revert toggle UI on error
      if (toggle) toggle.checked = !wantIot
    } finally {
      if (toggle) toggle.disabled = false
    }
  }

  // Close modals on backdrop click
  document.getElementById('addBranchOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeAddBranchModal()
  })
  document.getElementById('sensorOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeSensorModal()
  })

  </script>`

  return c.html(adminLayout('Branch Monitor', 'branches', content, pendingCount))
})

// ── POST /admin/branches/add ─────────────────────────────────────
// Adds a new branch. Calculates risk status from humidity + climate preset.
app.post('/admin/branches/add', async (c) => {
  let body: Record<string, string>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { name, city, climateType, humidity: humRaw, temperature: tempRaw } = body
  if (!name || !name.trim()) return c.json({ error: 'Branch name is required' }, 400)
  if (!city || !city.trim()) return c.json({ error: 'City is required' }, 400)
  if (climateType !== 'Inland' && climateType !== 'Coastal')
    return c.json({ error: 'climateType must be Inland or Coastal' }, 400)

  const humidity    = parseFloat(humRaw)
  const temperature = parseFloat(tempRaw)
  if (isNaN(humidity)    || humidity    < 0 || humidity    > 100) return c.json({ error: 'humidity must be 0–100' }, 400)
  if (isNaN(temperature) || temperature < 0 || temperature > 60)  return c.json({ error: 'temperature must be 0–60' }, 400)

  // Duplicate name check
  if (branches.some(b => b.name.toLowerCase() === name.trim().toLowerCase()))
    return c.json({ error: `Branch "${name.trim()}" already exists` }, 409)

  // Auto-generate a unique ID (BR-XXX)
  const idNum  = branches.length + 1
  const padded = String(idNum).padStart(3, '0')
  const newId  = 'BR-' + name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) + padded

  const riskStatus = classifyRiskForPreset(humidity, climateType as ClimateType)

  const newBranch: Branch = {
    id:           newId,
    name:         name.trim(),
    city:         city.trim(),
    climateType:  climateType as ClimateType,
    humidity,
    temperature,
    lastChecked:  new Date().toISOString().replace('T', ' ').slice(0, 16),
    // ── IoT defaults ──
    humidity_source     : 'WEATHER_API' as HumiditySource,
    iot_device_key      : `dkey-${newId.toLowerCase()}-${crypto.randomUUID()}`,
    iot_humidity        : null,
    iot_temperature     : null,
    last_iot_reading_at : null,
    riskStatus,
    activeLots:   0,
    totalGreenKg: 0,
  }

  branches.push(newBranch)
  return c.json({ ok: true, branch: newBranch }, 201)
})

// ── POST /admin/branches/:id/update ─────────────────────────────
// Updates humidity + temperature for a branch; recalculates risk status.
app.post('/admin/branches/:id/update', async (c) => {
  const id = c.req.param('id')
  const branch = branches.find(b => b.id === id)
  if (!branch) return c.json({ error: `Branch ${id} not found` }, 404)

  let body: Record<string, number>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { humidity, temperature } = body
  if (typeof humidity !== 'number' || humidity < 0 || humidity > 100)
    return c.json({ error: 'humidity must be 0–100' }, 400)
  if (typeof temperature !== 'number' || temperature < 0 || temperature > 60)
    return c.json({ error: 'temperature must be 0–60' }, 400)

  branch.humidity    = humidity
  branch.temperature = temperature
  branch.riskStatus  = classifyRiskForPreset(humidity, branch.climateType)
  branch.lastChecked = new Date().toISOString().replace('T', ' ').slice(0, 16)

  return c.json({ ok: true, branch })
})

// ── GET /admin/inventory/template ──────────────────────────────
// Streams a CSV template file so owners know the exact column format.
// Includes 2 example rows with real master-ledger origins.
app.get('/admin/inventory/template', (c) => {
  const VALID_ORIGINS = [
    'Ethiopia Yirgacheffe',
    'Brazil Cerrado',
    'Colombia Huila',
    'Yemen Khawlani',
    'Kenya AA',
    'Indonesia Sumatra',
  ].join(' | ')

  const csv = [
    // ── Header row ─────────────────────────────────────────────
    'Lot ID,Origin,Variety,Process,Green Weight (kg),Roast Date (YYYY-MM-DD),Expiry Date (YYYY-MM-DD),Branch,Grade Score (0-100),Flavor Note 1,Flavor Note 2',
    // ── Example row 1 ──────────────────────────────────────────
    'LOT-009,Ethiopia Yirgacheffe,Heirloom,Natural,300,2026-03-01,2026-06-01,Riyadh,90,Blueberry,Jasmine',
    // ── Example row 2 ──────────────────────────────────────────
    'LOT-010,Yemen Khawlani,Heirloom,Natural,200,2026-03-05,2026-06-05,Jeddah,88,Spices,Dried Fruits',
    // ── Reminder row (starts with #, will be skipped on import) ─
    `# Valid Origins: ${VALID_ORIGINS}`,
    `# Valid Branches: Riyadh | Jeddah | Dammam`,
    `# Live Roasted Balance is AUTO-CALCULATED on import: Green Weight × 0.82`,
    `# Rows starting with # are ignored`,
  ].join('\r\n')

  return new Response(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="qabban-os-lot-import-template.csv"',
    },
  })
})

// ── POST /admin/inventory/import ────────────────────────────────
// Accepts a multipart/form-data upload with field name "csvFile".
// Parses CSV, maps columns, validates each row, applies 0.82 formula,
// and appends valid rows to coffeeLots in-memory.
// Returns JSON: { imported, skipped, errors[] }
app.post('/admin/inventory/import', async (c) => {
  let csvText = ''

  try {
    const form = await c.req.formData()
    const file = form.get('csvFile') as File | null
    if (!file || file.size === 0) {
      return c.json({ error: 'No file received' }, 400)
    }
    // Accept .csv and .txt; reject obvious binary formats
    const name = file.name?.toLowerCase() ?? ''
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return c.json({
        error: 'Excel (.xlsx/.xls) cannot be parsed server-side in this edge runtime. ' +
               'Please save your file as CSV (UTF-8) first, then re-upload.',
        hint:  'In Excel: File → Save As → CSV UTF-8 (Comma delimited)',
      }, 415)
    }
    csvText = await file.text()
  } catch {
    return c.json({ error: 'Failed to read uploaded file' }, 400)
  }

  // ── Parse CSV ─────────────────────────────────────────────────
  const lines   = csvText.split(/\r?\n/).filter(l => l.trim() && !l.trimStart().startsWith('#'))
  if (lines.length < 2) {
    return c.json({ error: 'File must have a header row and at least one data row' }, 400)
  }

  // Normalise header → column index map (case-insensitive, trim whitespace)
  const headerCells = lines[0].split(',').map(h => h.trim().toLowerCase())
  const col = (names: string[]): number => {
    for (const n of names) {
      const idx = headerCells.indexOf(n.toLowerCase())
      if (idx !== -1) return idx
    }
    return -1
  }

  const iLotId    = col(['lot id','lot_id','lotid','id'])
  const iOrigin   = col(['origin'])
  const iVariety  = col(['variety'])
  const iProcess  = col(['process'])
  const iGreen    = col(['green weight (kg)','green weight','green_weight','greenweight','green weight kg'])
  const iRoast    = col(['roast date (yyyy-mm-dd)','roast date','roast_date','roastdate'])
  const iExpiry   = col(['expiry date (yyyy-mm-dd)','expiry date','expiry_date','expirydate','expiry'])
  const iBranch   = col(['branch'])
  const iGrade    = col(['grade score (0-100)','grade score','grade_score','gradescore','grade'])
  const iFlavor1  = col(['flavor note 1','flavor_note_1','flavor1','flavour1','tasting 1'])
  const iFlavor2  = col(['flavor note 2','flavor_note_2','flavor2','flavour2','tasting 2'])

  if (iLotId === -1 || iOrigin === -1 || iGreen === -1) {
    return c.json({
      error:   'Required columns not found: "Lot ID", "Origin", "Green Weight (kg)"',
      headers: headerCells,
      hint:    'Download the template to see the exact column names.',
    }, 422)
  }

  const VALID_BRANCHES = new Set(['Riyadh', 'Jeddah', 'Dammam'])
  const now = new Date().toISOString().slice(0, 10)

  const imported: string[]    = []
  const skipped:  string[]    = []
  const errors:   { row: number; lotId: string; reason: string }[] = []

  const dataLines = lines.slice(1)

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2   // 1-indexed, accounting for header
    // Simple CSV split — handles quoted fields containing commas
    const cells = dataLines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const get   = (idx: number) => (idx >= 0 && idx < cells.length) ? cells[idx].trim() : ''

    const lotId    = get(iLotId)
    const origin   = get(iOrigin)
    const greenRaw = get(iGreen)

    // ── Required field checks ─────────────────────────────────
    if (!lotId) {
      errors.push({ row: rowNum, lotId: '—', reason: 'Missing Lot ID' })
      continue
    }
    if (!origin) {
      errors.push({ row: rowNum, lotId, reason: 'Missing Origin' })
      continue
    }
    const greenKg = parseFloat(greenRaw)
    if (isNaN(greenKg) || greenKg <= 0) {
      errors.push({ row: rowNum, lotId, reason: `Invalid Green Weight: "${greenRaw}"` })
      continue
    }

    // ── Duplicate Lot ID check ────────────────────────────────
    if (coffeeLots.some(l => l.id === lotId)) {
      skipped.push(`${lotId} (duplicate — already exists)`)
      continue
    }

    // ── Branch validation & fallback ─────────────────────────
    let branch = get(iBranch) as 'Riyadh' | 'Jeddah' | 'Dammam'
    if (!VALID_BRANCHES.has(branch)) branch = 'Riyadh'

    // ── Dates ────────────────────────────────────────────────
    const roastDate  = get(iRoast)  || now
    // Default expiry = 90 days after roast date
    const expiryDate = get(iExpiry) || (() => {
      const d = new Date(roastDate)
      d.setDate(d.getDate() + 90)
      return d.toISOString().slice(0, 10)
    })()

    // ── Grade score ───────────────────────────────────────────
    let grade = parseInt(get(iGrade), 10)
    if (isNaN(grade) || grade < 0 || grade > 100) grade = 80

    // ── Flavor notes ─────────────────────────────────────────
    const flavor1 = get(iFlavor1)
    const flavor2 = get(iFlavor2)
    const flavorNotes = [flavor1, flavor2].filter(Boolean)
    if (flavorNotes.length === 0) flavorNotes.push('—')

    // ── Live Roasted Balance: apply 0.82 formula ─────────────
    const roastedWeightKg = applyRoastShrinkage(greenKg)

    // ── Determine status (OPTIMAL unless grade < 75) ─────────
    const status: 'OPTIMAL' | 'MONITOR' | 'CRITICAL' =
      grade >= 80 ? 'OPTIMAL' : grade >= 70 ? 'MONITOR' : 'CRITICAL'

    const newLot: CoffeeLot = {
      id:              lotId,
      origin,
      variety:         get(iVariety)  || 'Unknown',
      process:         get(iProcess)  || 'Unknown',
      greenWeightKg:   Math.round(greenKg * 10) / 10,
      roastedWeightKg,
      roastDate,
      expiryDate,
      status,
      flavorNotes,
      branch,
      gradeScore:      grade,
    }

    coffeeLots.push(newLot)
    imported.push(lotId)
  }

  return c.json({
    success:        true,
    imported:       imported.length,
    importedLotIds: imported,
    skipped:        skipped.length,
    skippedDetails: skipped,
    errors:         errors.length,
    errorDetails:   errors,
    formula:        'roastedWeightKg = greenWeightKg × 0.82',
    totalLots:      coffeeLots.length,
  })
})

// ── POST /admin/inventory/add ───────────────────────────────────
// Manual single-lot entry. Applies ×0.82 formula, inherits branch
// climate risk status, returns the new lot as JSON.
app.post('/admin/inventory/add', async (c) => {
  let body: Record<string, string>
  try { body = await c.req.json() }
  catch { return c.json({ error: 'Invalid JSON body' }, 400) }

  const {
    id: lotId, origin, variety, process: proc,
    branch, greenWeightRaw, arrivalDate,
    grade: gradeRaw, flavor1, flavor2, notes,
    labelImageUrl,
    costPerKg: costRaw, targetMargin: marginRaw,
  } = body

  // ── Required field validation ─────────────────────────────────
  if (!lotId?.trim())         return c.json({ error: 'Lot ID is required' }, 400)
  if (!origin?.trim())        return c.json({ error: 'Origin is required' }, 400)
  const VALID_BRANCHES = ['Riyadh', 'Jeddah', 'Dammam', ...branches.filter(b => !['Riyadh','Jeddah','Dammam'].includes(b.name)).map(b => b.name)]
  if (!branch || !VALID_BRANCHES.includes(branch))
    return c.json({ error: 'Invalid branch' }, 400)

  const greenKg = parseFloat(greenWeightRaw)
  if (isNaN(greenKg) || greenKg <= 0)
    return c.json({ error: `Invalid green weight: "${greenWeightRaw}"` }, 400)

  // ── Duplicate check ───────────────────────────────────────────
  if (coffeeLots.some(l => l.id === lotId.trim()))
    return c.json({ error: `Lot ID "${lotId.trim()}" already exists` }, 409)

  // ── Build new lot ─────────────────────────────────────────────
  const grade = (() => { const g = parseInt(gradeRaw, 10); return (!isNaN(g) && g >= 0 && g <= 100) ? g : 80 })()
  const status: 'OPTIMAL' | 'MONITOR' | 'CRITICAL' =
    grade >= 80 ? 'OPTIMAL' : grade >= 70 ? 'MONITOR' : 'CRITICAL'

  const today      = new Date().toISOString().slice(0, 10)
  const roastDate  = arrivalDate?.trim() || today
  const expiryDate = (() => {
    const d = new Date(roastDate); d.setDate(d.getDate() + 90)
    return d.toISOString().slice(0, 10)
  })()

  const flavorNotes = [flavor1, flavor2].map(f => f?.trim()).filter(Boolean) as string[]
  if (flavorNotes.length === 0) flavorNotes.push('—')

  // ── Climate Sync: look up branch to get live risk status ─────────
  const branchRecord   = branches.find(b => b.name === branch)
  const climatePreset  = branchRecord ? CLIMATE_PRESETS[branchRecord.climateType] : null
  // Always compute live — never rely on the cached .riskStatus seed value
  const branchRisk     = branchRecord
    ? classifyRiskForPreset(branchRecord.humidity, branchRecord.climateType)
    : 'LOW'
  const climateWarning = branchRecord && branchRisk !== 'LOW'
    ? `Branch ${branch} is currently at ${branchRisk} humidity risk (${branchRecord.humidity}%). Monitor storage conditions closely.`
    : null

  // ── Validate image (optional) ──────────────────────────────────
  // Accept data-URLs (jpeg/png/webp/gif) up to ~4 MB (base64 ≈ 4/3 raw bytes)
  let safeImageUrl: string | undefined
  if (labelImageUrl && typeof labelImageUrl === 'string') {
    const ok = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]{1,5500000}$/.test(labelImageUrl)
    if (!ok) return c.json({ error: 'labelImageUrl must be a valid base64 image data-URL (jpeg/png/webp, max ~4 MB)' }, 400)
    safeImageUrl = labelImageUrl
  }

  const newLot: CoffeeLot = {
    id:              lotId.trim(),
    origin:          origin.trim(),
    variety:         variety?.trim() || 'Unknown',
    process:         proc?.trim()    || 'Unknown',
    greenWeightKg:   Math.round(greenKg * 10) / 10,
    roastedWeightKg: applyRoastShrinkage(greenKg),
    roastDate,
    expiryDate,
    status,
    flavorNotes,
    branch:          branch as 'Riyadh' | 'Jeddah' | 'Dammam',
    gradeScore:      grade,
    ...(safeImageUrl ? { labelImageUrl: safeImageUrl } : {}),
    // ── Financial Intelligence ────────────────────────────────────
    ...(costRaw   ? { costPerKg:    Math.round(parseFloat(costRaw)   * 100) / 100 } : {}),
    ...(marginRaw ? { targetMargin: Math.round(parseFloat(marginRaw) * 10)  / 10  } : {}),
  }

  coffeeLots.push(newLot)

  // Update branch aggregate stats
  if (branchRecord) {
    branchRecord.activeLots  = coffeeLots.filter(l => l.branch === branch && l.status !== 'RECALLED').length
    branchRecord.totalGreenKg = coffeeLots.filter(l => l.branch === branch).reduce((s, l) => s + l.greenWeightKg, 0)
  }

  return c.json({
    ok: true,
    lot: newLot,
    roastedWeightKg: newLot.roastedWeightKg,
    branchRisk,
    climateWarning,
    hasImage: !!safeImageUrl,
    totalLots: coffeeLots.length,
  }, 201)
})

// ── GET /admin/inventory ────────────────────────────────────────
app.get('/admin/inventory', (c) => {
  const pendingCount = beanRequests.filter(r => r.status === 'PENDING').length

  // ── Live Balance ──────────────────────────────────────────────
  const bal            = calcLiveBalance(coffeeLots, beanRequests, branches)
  const totalShrinkage = bal.liveGreenKg - bal.liveRoastedKg   // shrinkage on live stock only

  // ── FIFO: list unique non-recalled origins for the Log New Roast selector
  const availableOrigins = [...new Set(
    coffeeLots.filter(l => l.status !== 'RECALLED').map(l => l.origin)
  )].sort()

  // ── Branch data for climate sync ──────────────────────────────
  const branchClimateData = branches.map(b => ({
    name:        b.name,
    riskStatus:  b.riskStatus,
    humidity:    b.humidity,
    temperature: b.temperature,
    climateType: b.climateType,
    acuteNote:   CLIMATE_PRESETS[b.climateType].acuteRiskNote,
    storageAdvice: CLIMATE_PRESETS[b.climateType].storageAdvice,
  }))

  // ── Auto-suggest next lot ID ──────────────────────────────────
  const existingNums = coffeeLots
    .map(l => parseInt(l.id.replace('LOT-', ''), 10))
    .filter(n => !isNaN(n))
  const nextNum    = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1
  const suggestedId = 'LOT-' + String(nextNum).padStart(3, '0')

  const content = `
  <style>
    /* ── ADD LOT MODAL ─────────────────────────────────────────── */
    .addlot-overlay {
      display:none; position:fixed; inset:0; z-index:300;
      background:rgba(0,0,0,0.78); align-items:flex-start;
      justify-content:center; padding:32px 16px; overflow-y:auto;
    }
    .addlot-overlay.open { display:flex; }
    .addlot-modal {
      background:var(--bg-2); border:1px solid var(--border-amber);
      border-radius:10px; width:640px; max-width:100%;
      box-shadow:0 24px 60px rgba(0,0,0,0.6);
      animation: modalSlideIn .22s ease-out;
    }
    @keyframes modalSlideIn { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
    .addlot-header {
      padding:22px 28px 16px;
      border-bottom:1px solid var(--border);
      display:flex; align-items:center; justify-content:space-between;
    }
    .addlot-title {
      font-family:var(--font-mono); font-size:13px; color:var(--amber);
      letter-spacing:.8px; text-transform:uppercase;
      display:flex; align-items:center; gap:10px;
    }
    .addlot-close {
      background:none; border:none; color:var(--text-muted);
      font-size:18px; cursor:pointer; padding:4px;
      transition:color .15s;
    }
    .addlot-close:hover { color:var(--text-pri); }
    .addlot-body { padding:24px 28px; }
    .addlot-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .addlot-grid .full-width { grid-column:1/-1; }
    .addlot-label {
      display:block; font-size:10px; color:var(--text-sec);
      text-transform:uppercase; letter-spacing:.7px; margin-bottom:5px;
      display:flex; align-items:center; gap:5px;
    }
    .addlot-label .req { color:var(--red); }
    .addlot-input, .addlot-select, .addlot-textarea {
      width:100%; padding:10px 13px;
      background:var(--bg-3); border:1px solid var(--border);
      color:var(--text-pri); font-size:13px; font-family:var(--font-mono);
      border-radius:var(--radius); outline:none; transition:border-color .15s;
    }
    .addlot-input:focus, .addlot-select:focus, .addlot-textarea:focus {
      border-color:var(--amber); box-shadow:0 0 0 2px var(--amber-glow);
    }
    .addlot-input.error { border-color:var(--red) !important; }
    .addlot-input::placeholder { color:var(--text-muted); }
    .addlot-select option { background:var(--bg-3); }
    /* ── live formula preview ── */
    .roast-preview {
      margin-top:8px; padding:11px 14px;
      background:var(--bg-1); border:1px solid var(--border-amber);
      border-radius:var(--radius);
      font-family:var(--font-mono); font-size:12px;
      display:flex; align-items:center; gap:10px; flex-wrap:wrap;
    }
    .roast-preview-val { color:var(--amber); font-size:16px; font-weight:700; }
    .roast-preview-label { color:var(--text-muted); font-size:10px; }
    /* ── climate sync banner ── */
    .climate-banner {
      margin-top:14px; padding:13px 16px;
      border-radius:var(--radius); border-left:3px solid;
      font-size:12px; line-height:1.6;
      display:none;
    }
    .climate-banner.LOW      { border-color:var(--green);  background:var(--green-dim); }
    .climate-banner.MODERATE { border-color:var(--orange); background:var(--orange-dim); }
    .climate-banner.HIGH     { border-color:#fb923c;       background:rgba(249,115,22,0.1); }
    .climate-banner.CRITICAL { border-color:var(--red);    background:var(--red-dim); }
    .climate-badge-inline {
      display:inline-block; font-family:var(--font-mono); font-size:9px;
      padding:2px 7px; border-radius:2px; border:1px solid; margin-left:6px;
      vertical-align:middle; text-transform:uppercase;
    }
    /* ── add lot footer ── */
    .addlot-footer {
      padding:16px 28px 22px;
      border-top:1px solid var(--border);
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      flex-wrap:wrap;
    }
    .addlot-footer-meta { font-family:var(--font-mono); font-size:10px; color:var(--text-muted); }
    .addlot-footer-actions { display:flex; gap:10px; }
    .btn-addlot-submit {
      padding:10px 22px; background:var(--amber); color:var(--bg-0);
      font-family:var(--font-mono); font-size:12px; font-weight:700;
      letter-spacing:.6px; border:none; border-radius:var(--radius);
      cursor:pointer; transition:background .15s;
      display:flex; align-items:center; gap:7px;
    }
    .btn-addlot-submit:hover { background:#fbbf24; }
    .btn-addlot-submit:disabled { opacity:.45; cursor:not-allowed; }
    .btn-addlot-cancel {
      padding:10px 18px; background:transparent;
      color:var(--text-sec); font-family:var(--font-mono); font-size:11px;
      border:1px solid var(--border); border-radius:var(--radius); cursor:pointer;
      transition:all .15s;
    }
    .btn-addlot-cancel:hover { border-color:var(--text-sec); color:var(--text-pri); }
    /* ── result banner ── */
    #addlotResultBanner { display:none; margin-top:14px; }
    /* ── header action row ── */
    .inv-action-row {
      display:flex; align-items:center; justify-content:space-between;
      flex-wrap:wrap; gap:12px; margin-bottom:22px;
    }
    .btn-add-green-lot {
      padding:10px 20px; background:var(--amber); color:var(--bg-0);
      font-family:var(--font-mono); font-size:12px; font-weight:700;
      letter-spacing:.6px; border:none; border-radius:var(--radius);
      cursor:pointer; transition:background .15s;
      display:inline-flex; align-items:center; gap:8px;
      box-shadow: 0 0 14px rgba(245,158,11,0.25);
    }
    .btn-add-green-lot:hover { background:#fbbf24; box-shadow:0 0 20px rgba(245,158,11,0.4); }

    /* ── SACK LABEL PHOTO — image picker ──────────────────────── */
    .img-picker-zone {
      position:relative; border:2px dashed rgba(245,158,11,0.35);
      border-radius:var(--radius); padding:22px 16px; text-align:center;
      cursor:pointer; transition:border-color .18s, background .18s;
      background:var(--bg-3);
    }
    .img-picker-zone:hover,
    .img-picker-zone.drag-over {
      border-color:#F59E0B;
      background:rgba(245,158,11,0.06);
      box-shadow:0 0 12px rgba(245,158,11,0.18);
    }
    .img-picker-zone input[type="file"] {
      position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%;
    }
    .img-picker-icon { font-size:24px; color:rgba(245,158,11,0.5); margin-bottom:6px; }
    .img-picker-label { font-size:12px; color:var(--text-sec); }
    .img-picker-label span { color:#F59E0B; text-decoration:underline; }
    .img-picker-sub { font-size:10px; color:var(--text-muted); margin-top:4px; font-family:var(--font-mono); }

    /* ── preview strip (after image selected) ── */
    .img-preview-wrap {
      display:none; align-items:center; gap:14px;
      background:var(--bg-3); border:1px solid #F59E0B;
      border-radius:var(--radius); padding:10px 14px;
      box-shadow:0 0 10px rgba(245,158,11,0.12);
    }
    .img-preview-wrap.visible { display:flex; }
    .img-preview-thumb {
      width:72px; height:72px; max-width:72px;
      object-fit:contain; border-radius:4px;
      border:1px solid rgba(245,158,11,0.45);
      background:var(--bg-1); cursor:pointer;
      transition:box-shadow .18s, border-color .18s;
      flex-shrink:0;
    }
    .img-preview-thumb:hover {
      border-color:#F59E0B;
      box-shadow:0 0 14px rgba(245,158,11,0.45);
    }
    .img-preview-info { flex:1; min-width:0; }
    .img-preview-name {
      font-size:12px; color:var(--text-pri); font-weight:600;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .img-preview-size { font-family:var(--font-mono); font-size:10px; color:var(--text-muted); margin-top:2px; }
    .img-preview-clear {
      background:transparent; border:1px solid rgba(239,68,68,0.35);
      color:var(--red); font-family:var(--font-mono); font-size:10px;
      padding:4px 9px; border-radius:var(--radius); cursor:pointer;
      transition:all .15s; flex-shrink:0;
    }
    .img-preview-clear:hover { background:var(--red-dim); border-color:var(--red); }
    .img-enlarge-hint {
      font-size:9px; color:var(--amber); font-family:var(--font-mono);
      margin-top:3px; letter-spacing:.4px;
    }

    /* ── SFDA helper text ── */
    .sfda-helper {
      margin-top:8px; font-size:11px; color:var(--text-muted);
      line-height:1.6; display:flex; align-items:flex-start; gap:6px;
    }
    .sfda-helper i { color:#3b82f6; margin-top:1px; flex-shrink:0; }

    /* ── LIGHTBOX — full-size photo viewer ────────────────────── */
    .lightbox-overlay {
      display:none; position:fixed; inset:0; z-index:1000;
      background:rgba(0,0,0,0.88);
      align-items:center; justify-content:center;
      flex-direction:column; gap:14px; padding:24px 16px;
    }
    .lightbox-overlay.open { display:flex; }
    .lightbox-img {
      max-width:min(860px,92vw); max-height:72vh;
      object-fit:contain; border-radius:6px;
      border:2px solid rgba(245,158,11,0.5);
      box-shadow:0 16px 60px rgba(0,0,0,0.7);
    }
    .lightbox-meta {
      font-family:var(--font-mono); font-size:12px; color:var(--text-sec);
      text-align:center; max-width:640px;
    }
    .lightbox-footer {
      display:flex; gap:12px; align-items:center;
    }
    .lightbox-close {
      background:transparent; border:1px solid var(--border);
      color:var(--text-sec); font-family:var(--font-mono); font-size:11px;
      padding:8px 16px; border-radius:var(--radius); cursor:pointer;
      transition:all .15s;
    }
    .lightbox-close:hover { border-color:var(--text-sec); color:var(--text-pri); }
    .lightbox-download {
      background:var(--amber); color:var(--bg-0);
      font-family:var(--font-mono); font-size:11px; font-weight:700;
      padding:8px 18px; border:none; border-radius:var(--radius); cursor:pointer;
      transition:background .15s; display:flex; align-items:center; gap:6px;
    }
    .lightbox-download:hover { background:#fbbf24; }
  </style>

  <!-- ══ PROMINENT ADD BUTTON ══ -->
  <div class="inv-action-row">
    <div>
      <div style="font-size:13px;color:var(--text-sec)">
        <span style="color:var(--amber);font-family:var(--font-mono)">${coffeeLots.length}</span> lots in ledger
        &nbsp;·&nbsp;
        <span style="color:var(--amber);font-family:var(--font-mono)">${coffeeLots.filter(l=>l.status!=='RECALLED').length}</span> active
        &nbsp;·&nbsp;
        <span style="color:var(--red);font-family:var(--font-mono)">${coffeeLots.filter(l=>l.status==='RECALLED').length}</span> recalled
      </div>
    </div>
    <button class="btn-add-green-lot" onclick="openAddLotModal()">
      <i class="fa fa-circle-plus"></i>
      ADD NEW GREEN LOT
    </button>
  </div>

  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label">Live Green Balance</div>
      <div class="stat-value">${bal.liveGreenKg.toLocaleString()}</div>
      <div class="stat-unit">kg available</div>
    </div>
    <div class="stat-card" style="border-color:rgba(245,158,11,0.35);position:relative;overflow:hidden">
      <div style="position:absolute;top:0;right:0;font-family:var(--font-mono);font-size:9px;padding:2px 8px;background:rgba(245,158,11,0.1);color:var(--amber);border-left:1px solid rgba(245,158,11,0.25);border-bottom:1px solid rgba(245,158,11,0.25);border-radius:0 0 0 4px;letter-spacing:.4px">
        ⬡ SPONGE
      </div>
      <div class="stat-label">Live Roasted Balance</div>
      <div class="stat-value">${bal.liveRoastedKg.toLocaleString()}</div>
      <div class="stat-unit">kg · <span style="color:${bal.spongeAdjustmentKg >= 0 ? 'var(--green)' : 'var(--red)'};font-family:var(--font-mono)">${bal.spongeAdjustmentKg >= 0 ? '+' : ''}${bal.spongeAdjustmentKg} kg adj.</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Dispatched</div>
      <div class="stat-value" style="color:var(--red)">${bal.dispatchedRoastedKg.toLocaleString()}</div>
      <div class="stat-unit">kg roasted sent out</div>
    </div>
    <div class="stat-card" style="border-color:rgba(245,158,11,0.25)">
      <div class="stat-label">Yield Rate</div>
      <div class="stat-value" style="font-size:20px">82.0–82.5%</div>
      <div class="stat-unit">Sponge-adjusted per branch</div>
    </div>
  </div>

  <!-- Balance equation card -->
  <div class="card" style="margin-bottom:20px">
    <div class="card-title">Live Balance Formula <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(245,158,11,0.10);color:var(--amber);border:1px solid rgba(245,158,11,0.25);margin-left:6px">⬡ SPONGE-ADJUSTED</span></div>
    <div style="padding:16px;background:var(--bg-2);border-radius:var(--radius);font-family:var(--font-mono);font-size:13px;letter-spacing:0.4px;line-height:2">
      <div>
        <span style="color:var(--text-muted)">Purchased Green:    </span>
        <span style="color:var(--text-pri)">${bal.purchasedGreenKg.toLocaleString()} kg</span>
      </div>
      <div>
        <span style="color:var(--text-muted)">Dispatched (roasted): </span>
        <span style="color:var(--red)">− ${bal.dispatchedRoastedKg.toLocaleString()} kg roasted</span>
        <span style="color:var(--text-muted);font-size:11px"> (÷ sponge coeff. = ${bal.dispatchedGreenEquiv.toLocaleString()} kg green equiv.)</span>
      </div>
      <div style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px">
        <span style="color:var(--amber)">Live Green Balance: </span>
        <span style="color:var(--amber);font-weight:700">${bal.liveGreenKg.toLocaleString()} kg</span>
        <span style="color:var(--text-muted);font-size:11px"> × sponge coeff. = </span>
        <span style="color:var(--amber)">${bal.liveRoastedKg.toLocaleString()} kg roasted</span>
      </div>
      <div style="font-size:10px;color:var(--text-muted);border-top:1px solid var(--border);margin-top:6px;padding-top:6px">
        Baseline (0.82): ${bal.baselineRoastedKg.toLocaleString()} kg &nbsp;·&nbsp;
        <span style="color:${bal.spongeAdjustmentKg >= 0 ? 'var(--green)' : 'var(--red)'}">Sponge Δ: ${bal.spongeAdjustmentKg >= 0 ? '+' : ''}${bal.spongeAdjustmentKg} kg</span>
        &nbsp;·&nbsp; Rule A (RH&gt;70%): +0.5% · Rule B (RH&lt;20%): −0.3%
      </div>
    </div>
  </div>

  </div>
  <!-- ══ end balance equation ══ -->

  <!-- ══ BULK IMPORT ══════════════════════════════════════════════════ -->
  <div class="card" style="margin-bottom:24px" id="bulkImportCard">

    <!-- Header row: title + download template link -->
    <div class="import-header-row">
      <div>
        <div class="card-title" style="margin-bottom:2px">
          <i class="fa fa-file-arrow-up" style="color:var(--amber)"></i>
          Bulk Import — Upload CSV
          <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(245,158,11,0.12);color:var(--amber);border:1px solid rgba(245,158,11,0.35);margin-left:6px">BATCH</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">
          Import multiple lots at once. Live Roasted Balance is auto-calculated for every row using the <strong style="color:var(--amber)">× 0.82 formula</strong>.
        </div>
      </div>
      <a class="import-template-link" href="/admin/inventory/template" download="qabban-os-lot-import-template.csv">
        <i class="fa fa-download"></i> Download Template
      </a>
    </div>

    <!-- Drag-and-drop upload zone -->
    <div class="import-zone" id="importZone">
      <input type="file" id="importFileInput" accept=".csv,.txt" onchange="importHandleFile(this.files[0])"/>
      <i class="fa fa-cloud-arrow-up import-zone-icon"></i>
      <div class="import-zone-label">Drop your CSV file here, or <span style="color:var(--amber)">click to browse</span></div>
      <div class="import-zone-sub">Accepts .csv files &nbsp;·&nbsp; Max 5 MB &nbsp;·&nbsp; Excel: save as CSV first</div>
    </div>

    <!-- Progress bar (hidden until upload starts) -->
    <div id="importProgressWrap" style="display:none;margin-top:12px">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-bottom:4px" id="importProgressLabel">Parsing…</div>
      <div class="import-progress-bar">
        <div class="import-progress-fill" id="importProgressFill" style="width:0%"></div>
      </div>
    </div>

    <!-- Column mapping panel (hidden until file is chosen) -->
    <div id="importMapPanel" style="display:none;margin-top:18px">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--amber);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">
        <i class="fa fa-table-columns"></i> &nbsp;Detected Columns — Mapping to Ledger Fields
      </div>
      <div class="import-map-grid" id="importMapGrid"></div>
    </div>

    <!-- Preview table (hidden until file parsed) -->
    <div id="importPreviewPanel" style="display:none;margin-top:4px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">
          <i class="fa fa-eye"></i> &nbsp;Preview — Rows to be Imported
        </div>
        <div class="import-summary" id="importSummaryPills"></div>
      </div>
      <div class="import-preview-wrap">
        <table>
          <thead>
            <tr>
              <th style="min-width:90px">Lot ID</th>
              <th style="min-width:160px">Origin</th>
              <th style="min-width:100px">Variety</th>
              <th style="min-width:100px">Process</th>
              <th style="min-width:90px">Branch</th>
              <th style="min-width:110px">Green (kg)</th>
              <th style="min-width:120px;color:var(--amber)">⟹ Roasted (kg) ×0.82</th>
              <th style="min-width:100px">Roast Date</th>
              <th style="min-width:100px">Expiry</th>
              <th style="min-width:60px">Grade</th>
              <th style="min-width:80px">Status</th>
              <th style="min-width:140px">Flavor Notes</th>
              <th style="min-width:60px">Check</th>
            </tr>
          </thead>
          <tbody id="importPreviewBody"></tbody>
        </table>
      </div>
    </div>

    <!-- Action buttons (hidden until preview ready) -->
    <div id="importActionRow" style="display:none;margin-top:16px;display:none">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button
          id="importConfirmBtn"
          onclick="importConfirm()"
          style="font-family:var(--font-mono);font-size:12px;font-weight:700;padding:10px 20px;background:var(--amber);color:var(--bg-0);border:none;border-radius:var(--radius);cursor:pointer;transition:all .2s;letter-spacing:.5px"
        >
          <i class="fa fa-check-double"></i> &nbsp;IMPORT ALL VALID ROWS
        </button>
        <button
          onclick="importReset()"
          style="font-family:var(--font-mono);font-size:11px;padding:10px 16px;background:transparent;color:var(--text-muted);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;transition:all .2s"
          onmouseover="this.style.color='var(--red)';this.style.borderColor='var(--red)'"
          onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--border)'"
        >
          <i class="fa fa-xmark"></i> &nbsp;CLEAR
        </button>
        <span id="importRowCount" style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)"></span>
      </div>
    </div>

    <!-- Result banner (shown after server responds) -->
    <div id="importResultBanner" style="display:none;margin-top:16px"></div>

  </div>
  <!-- ══ end BULK IMPORT ══ -->

  <script>
  /* ═══════════════════════════════════════════════════════════════
     BULK IMPORT — client-side logic
     1. User picks / drops a CSV file
     2. JS parses it, maps columns, applies ×0.82, renders preview
     3. User clicks IMPORT — JS POSTs the raw file to /admin/inventory/import
     4. Server response shown as result banner
  ═══════════════════════════════════════════════════════════════ */

  // ── Drag-and-drop wiring ──────────────────────────────────────
  (function(){
    var zone = document.getElementById('importZone');
    zone.addEventListener('dragover', function(e){
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', function(){
      zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', function(e){
      e.preventDefault();
      zone.classList.remove('drag-over');
      var files = e.dataTransfer.files;
      if (files && files[0]) importHandleFile(files[0]);
    });
  })();

  var _importFile   = null;   // raw File object
  var _importRows   = [];     // parsed row objects ready to send

  // ── Column name aliases ──────────────────────────────────────
  var COL_MAP = {
    lotId:    ['lot id','lot_id','lotid','id'],
    origin:   ['origin'],
    variety:  ['variety'],
    process:  ['process'],
    green:    ['green weight (kg)','green weight','green_weight','greenweight','green weight kg'],
    roast:    ['roast date (yyyy-mm-dd)','roast date','roast_date','roastdate'],
    expiry:   ['expiry date (yyyy-mm-dd)','expiry date','expiry_date','expirydate','expiry'],
    branch:   ['branch'],
    grade:    ['grade score (0-100)','grade score','grade_score','gradescore','grade'],
    flavor1:  ['flavor note 1','flavor_note_1','flavor1','flavour1','tasting 1'],
    flavor2:  ['flavor note 2','flavor_note_2','flavor2','flavour2','tasting 2'],
  };

  function importFindCol(headers, names) {
    for (var j = 0; j < names.length; j++) {
      var idx = headers.indexOf(names[j].toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function importHandleFile(file) {
    if (!file) return;
    // Size guard (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      importShowError('File too large (max 5 MB). Please trim the CSV and try again.');
      return;
    }
    _importFile = file;
    importSetProgress(10, 'Reading file…');
    document.getElementById('importProgressWrap').style.display = 'block';

    var reader = new FileReader();
    reader.onload = function(e) {
      importSetProgress(40, 'Parsing rows…');
      setTimeout(function(){
        importParseAndPreview(e.target.result);
      }, 60);
    };
    reader.onerror = function(){
      importShowError('Could not read the file. Try a different CSV.');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function importSetProgress(pct, label) {
    document.getElementById('importProgressFill').style.width  = pct + '%';
    document.getElementById('importProgressLabel').textContent = label;
  }

  function importParseAndPreview(text) {
    // Split into lines, skip comments and blanks
    var lines = text.split(/\\r?\\n/).filter(function(l){
      return l.trim() && !l.trimStart().startsWith('#');
    });
    if (lines.length < 2) {
      importShowError('File must contain a header row and at least one data row.');
      return;
    }

    var headers = lines[0].split(',').map(function(h){ return h.trim().replace(/^"|"$/g,'').toLowerCase(); });

    // Resolve column indices
    var ci = {};
    for (var k in COL_MAP) ci[k] = importFindCol(headers, COL_MAP[k]);

    // Required columns check
    if (ci.lotId === -1 || ci.origin === -1 || ci.green === -1) {
      importShowError(
        'Required columns not found. Need at least: "Lot ID", "Origin", "Green Weight (kg)".\\n' +
        'Detected headers: ' + headers.join(', ') + '\\n' +
        'Download the template for the exact format.'
      );
      return;
    }

    // Render column mapping panel
    importRenderMapPanel(headers, ci);

    // Parse data rows
    var okCount   = 0;
    var warnCount = 0;
    var errCount  = 0;
    var rows      = [];
    var today     = new Date().toISOString().slice(0,10);

    for (var i = 1; i < lines.length; i++) {
      var cells = lines[i].split(',').map(function(c){ return c.trim().replace(/^"|"$/g,''); });
      var get   = function(idx){ return (idx >= 0 && idx < cells.length) ? cells[idx].trim() : ''; };

      var lotId    = get(ci.lotId);
      var origin   = get(ci.origin);
      var greenRaw = get(ci.green);

      var rowError = null;
      if (!lotId)   rowError = 'Missing Lot ID';
      else if (!origin)  rowError = 'Missing Origin';
      else {
        var g = parseFloat(greenRaw);
        if (isNaN(g) || g <= 0) rowError = 'Invalid Green Weight: "' + greenRaw + '"';
      }

      var greenKg     = rowError ? 0 : parseFloat(greenRaw);
      var roasted     = rowError ? 0 : Math.round(greenKg * 0.82 * 10) / 10;
      var grade       = parseInt(get(ci.grade), 10);
      if (isNaN(grade) || grade < 0 || grade > 100) grade = 80;
      var status      = grade >= 80 ? 'OPTIMAL' : grade >= 70 ? 'MONITOR' : 'CRITICAL';
      var branch      = get(ci.branch) || 'Riyadh';
      var roastDate   = get(ci.roast)  || today;
      var expiryDate  = get(ci.expiry) || '';
      if (!expiryDate) {
        var d = new Date(roastDate);
        d.setDate(d.getDate() + 90);
        expiryDate = d.toISOString().slice(0,10);
      }
      var flavor1     = get(ci.flavor1) || '';
      var flavor2     = get(ci.flavor2) || '';
      var flavorStr   = [flavor1, flavor2].filter(Boolean).join(', ') || '—';
      var isDuplicate = false; // can't check client-side without full lot list

      var rowState = rowError ? 'err' : 'ok';
      if (rowError) errCount++; else okCount++;

      rows.push({
        lotId, origin, variety: get(ci.variety) || 'Unknown',
        process: get(ci.process) || 'Unknown', branch,
        greenKg, roasted, roastDate, expiryDate, grade, status, flavorStr,
        rowState, rowError,
      });
    }

    _importRows = rows;
    importSetProgress(90, 'Building preview…');

    // Render preview table
    var tbody = document.getElementById('importPreviewBody');
    tbody.innerHTML = rows.map(function(r, idx){
      var stateClass = 'import-row-' + r.rowState;
      var statusBadgeColor = r.status === 'OPTIMAL' ? 'var(--green)' :
                             r.status === 'MONITOR'  ? 'var(--orange)' : 'var(--red)';
      return '<tr class="' + stateClass + '">' +
        '<td class="mono" style="color:var(--amber);font-size:11px">' + (r.lotId||'—') + '</td>' +
        '<td style="font-size:12px;font-weight:500">'  + (r.origin||'—')   + '</td>' +
        '<td style="font-size:11px;color:var(--text-sec)">'  + r.variety   + '</td>' +
        '<td style="font-size:11px;color:var(--text-sec)">'  + r.process   + '</td>' +
        '<td style="font-size:11px">'                         + r.branch    + '</td>' +
        '<td class="mono" style="font-size:12px">'            + (r.greenKg||'?') + ' kg</td>' +
        '<td class="import-calc-col" style="font-weight:700;font-size:12px">' +
          (r.rowState==='ok' ? r.roasted + ' kg <span style=\\"font-size:9px;color:var(--text-muted)\\">×0.82</span>' : '—') +
        '</td>' +
        '<td class="mono" style="font-size:11px;color:var(--text-muted)">' + r.roastDate  + '</td>' +
        '<td class="mono" style="font-size:11px;color:var(--text-muted)">' + r.expiryDate + '</td>' +
        '<td class="mono" style="font-size:11px">'             + r.grade    + '</td>' +
        '<td><span style="font-family:var(--font-mono);font-size:9px;padding:2px 6px;border-radius:2px;border:1px solid;color:' + statusBadgeColor + ';border-color:' + statusBadgeColor + '40">' + r.status + '</span></td>' +
        '<td style="font-size:11px;color:var(--text-sec)">'   + r.flavorStr + '</td>' +
        '<td style="text-align:center">' +
          (r.rowState === 'ok'
            ? '<i class="fa fa-circle-check" style="color:var(--green)"></i>'
            : '<i class="fa fa-circle-xmark" title="' + (r.rowError||'') + '" style="color:var(--red);cursor:help"></i>') +
        '</td>' +
      '</tr>';
    }).join('');

    // Summary pills
    var pills = document.getElementById('importSummaryPills');
    pills.innerHTML =
      (okCount  > 0 ? '<span class="import-pill import-pill-ok"><i class="fa fa-check"></i>' + okCount   + ' ready</span>'   : '') +
      (errCount > 0 ? '<span class="import-pill import-pill-err"><i class="fa fa-xmark"></i>' + errCount  + ' errors</span>'  : '') +
      (warnCount > 0? '<span class="import-pill import-pill-skip"><i class="fa fa-warning"></i>' + warnCount + ' warnings</span>' : '');

    document.getElementById('importRowCount').textContent =
      rows.length + ' row' + (rows.length !== 1 ? 's' : '') + ' detected';

    importSetProgress(100, 'Preview ready');
    document.getElementById('importPreviewPanel').style.display  = 'block';
    document.getElementById('importActionRow').style.display     = 'flex';

    if (okCount === 0) {
      document.getElementById('importConfirmBtn').disabled = true;
      document.getElementById('importConfirmBtn').style.opacity = '0.4';
      document.getElementById('importConfirmBtn').style.cursor  = 'not-allowed';
    }
  }

  function importRenderMapPanel(headers, ci) {
    var LABELS = {
      lotId:'Lot ID', origin:'Origin', variety:'Variety',
      process:'Process', green:'Green Weight', roast:'Roast Date',
      expiry:'Expiry Date', branch:'Branch', grade:'Grade Score',
      flavor1:'Flavor 1', flavor2:'Flavor 2',
    };
    var html = '';
    for (var k in ci) {
      var found    = ci[k] !== -1;
      var colName  = found ? headers[ci[k]] : '—';
      var required = k === 'lotId' || k === 'origin' || k === 'green';
      var color    = found ? 'var(--green)' : required ? 'var(--red)' : 'var(--text-muted)';
      html += '<div style="background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px">' +
        '<div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">' + LABELS[k] + (required ? ' *' : '') + '</div>' +
        '<div style="font-family:var(--font-mono);font-size:11px;color:' + color + '">' +
          '<i class="fa ' + (found ? 'fa-circle-check' : 'fa-circle-xmark') + '"></i> ' +
          (found ? '"' + colName + '"' : 'not found') +
        '</div>' +
      '</div>';
    }
    document.getElementById('importMapGrid').innerHTML = html;
    document.getElementById('importMapPanel').style.display = 'block';
  }

  function importShowError(msg) {
    var b = document.getElementById('importResultBanner');
    b.style.display = 'block';
    b.innerHTML =
      '<div style="background:var(--red-dim);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);padding:12px 16px;color:var(--red);font-size:12px;white-space:pre-wrap;font-family:var(--font-mono)">' +
      '<i class="fa fa-circle-xmark"></i> &nbsp;' + msg + '</div>';
    document.getElementById('importProgressWrap').style.display = 'none';
  }

  function importReset() {
    _importFile = null;
    _importRows = [];
    document.getElementById('importFileInput').value = '';
    document.getElementById('importProgressWrap').style.display  = 'none';
    document.getElementById('importMapPanel').style.display      = 'none';
    document.getElementById('importPreviewPanel').style.display  = 'none';
    document.getElementById('importActionRow').style.display     = 'none';
    document.getElementById('importResultBanner').style.display  = 'none';
    document.getElementById('importPreviewBody').innerHTML        = '';
    document.getElementById('importMapGrid').innerHTML            = '';
    document.getElementById('importSummaryPills').innerHTML       = '';
  }

  function importConfirm() {
    if (!_importFile) { importShowError('No file loaded. Please re-upload.'); return; }
    var validCount = _importRows.filter(function(r){ return r.rowState === 'ok'; }).length;
    if (validCount === 0) { importShowError('No valid rows to import.'); return; }

    var btn = document.getElementById('importConfirmBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> &nbsp;IMPORTING…';
    importSetProgress(20, 'Uploading to server…');
    document.getElementById('importProgressWrap').style.display = 'block';

    var fd = new FormData();
    fd.append('csvFile', _importFile);

    fetch('/admin/inventory/import', { method: 'POST', body: fd })
      .then(function(r){ return r.json(); })
      .then(function(d){
        importSetProgress(100, 'Done');
        var b = document.getElementById('importResultBanner');
        b.style.display = 'block';

        if (d.error) {
          b.innerHTML =
            '<div style="background:var(--red-dim);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);padding:14px 18px">' +
              '<div style="font-family:var(--font-mono);font-size:12px;color:var(--red);font-weight:700;margin-bottom:4px"><i class="fa fa-circle-xmark"></i> Import Failed</div>' +
              '<div style="font-size:12px;color:var(--text-sec)">' + d.error + '</div>' +
              (d.hint ? '<div style="margin-top:6px;font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">' + d.hint + '</div>' : '') +
            '</div>';
          btn.disabled = false;
          btn.innerHTML = '<i class="fa fa-check-double"></i> &nbsp;IMPORT ALL VALID ROWS';
          return;
        }

        b.innerHTML =
          '<div style="background:var(--green-dim);border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius);padding:14px 18px">' +
            '<div style="font-family:var(--font-mono);font-size:12px;color:var(--green);font-weight:700;margin-bottom:8px"><i class="fa fa-circle-check"></i> &nbsp;Import Complete</div>' +
            '<div class="import-summary" style="margin-bottom:10px">' +
              '<span class="import-pill import-pill-ok"><i class="fa fa-check"></i>' + d.imported + ' lots imported</span>' +
              (d.skipped > 0 ? '<span class="import-pill import-pill-skip"><i class="fa fa-forward"></i>' + d.skipped + ' skipped (duplicates)</span>' : '') +
              (d.errors  > 0 ? '<span class="import-pill import-pill-err"><i class="fa fa-xmark"></i>' + d.errors  + ' rows had errors</span>' : '') +
            '</div>' +
            (d.imported > 0 ? '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">Lots added: ' + (d.importedLotIds||[]).join(', ') + '</div>' : '') +
            '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:4px">Formula applied: roasted = green × 0.82 &nbsp;·&nbsp; Total lots in system: ' + d.totalLots + '</div>' +
            (d.imported > 0 ? '<div style="margin-top:10px"><a href="/admin/inventory" style="font-family:var(--font-mono);font-size:11px;color:var(--green)"><i class="fa fa-rotate-right"></i> Reload page to see updated inventory →</a></div>' : '') +
          '</div>';

        if (d.errorDetails && d.errorDetails.length > 0) {
          var errHtml = '<div style="margin-top:10px;background:var(--red-dim);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius);padding:12px 16px">' +
            '<div style="font-family:var(--font-mono);font-size:10px;color:var(--red);margin-bottom:6px">Row Errors:</div>';
          d.errorDetails.forEach(function(e){
            errHtml += '<div style="font-size:11px;color:var(--text-sec);margin-bottom:2px">Row ' + e.row + ' &nbsp;[' + e.lotId + ']&nbsp; → ' + e.reason + '</div>';
          });
          errHtml += '</div>';
          b.innerHTML += errHtml;
        }
      })
      .catch(function(err){
        importShowError('Network error: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-check-double"></i> &nbsp;IMPORT ALL VALID ROWS';
      });
  }
  </script>
  <!-- ══ end BULK IMPORT script ══ -->

  <!-- ══ ADD NEW GREEN LOT MODAL ══════════════════════════════════ -->
  <div class="addlot-overlay" id="addLotOverlay">
    <div class="addlot-modal">

      <!-- Header -->
      <div class="addlot-header">
        <div class="addlot-title">
          <i class="fa fa-seedling"></i>
          Add New Green Lot
          <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(245,158,11,0.12);color:var(--amber);border:1px solid rgba(245,158,11,0.35)">MANUAL ENTRY</span>
        </div>
        <button class="addlot-close" onclick="closeAddLotModal()" title="Close"><i class="fa fa-xmark"></i></button>
      </div>

      <!-- Body -->
      <div class="addlot-body">
        <form id="addLotForm" onsubmit="submitAddLot(event)" autocomplete="off">

          <div class="addlot-grid">

            <!-- Lot ID -->
            <div>
              <label class="addlot-label"><i class="fa fa-barcode"></i> Lot ID <span class="req">*</span></label>
              <input class="addlot-input" type="text" name="id" id="addLotId" placeholder="e.g. LOT-009" required/>
              <div style="font-size:10px;color:var(--text-muted);margin-top:3px">Suggested: <span id="suggestedId" style="color:var(--amber);cursor:pointer" onclick="document.getElementById('addLotId').value=this.textContent">${suggestedId}</span></div>
            </div>

            <!-- Origin -->
            <div>
              <label class="addlot-label"><i class="fa fa-globe"></i> Origin <span class="req">*</span></label>
              <select class="addlot-input addlot-select" name="origin" id="addLotOrigin" required>
                <option value="">— Select Origin —</option>
                ${CATALOG_ORIGINS.map(o => `<option value="${o.key}">${o.displayName}</option>`).join('')}
                <option value="__custom__">Other (type below)</option>
              </select>
              <input class="addlot-input" type="text" name="originCustom" id="addLotOriginCustom"
                placeholder="Custom origin name" style="margin-top:6px;display:none"/>
            </div>

            <!-- Variety -->
            <div>
              <label class="addlot-label"><i class="fa fa-leaf"></i> Variety</label>
              <input class="addlot-input" type="text" name="variety" id="addLotVariety" placeholder="e.g. Heirloom, SL28"/>
            </div>

            <!-- Process -->
            <div>
              <label class="addlot-label"><i class="fa fa-gears"></i> Process</label>
              <select class="addlot-input addlot-select" name="process">
                <option value="Natural">Natural</option>
                <option value="Washed">Washed</option>
                <option value="Pulped Natural">Pulped Natural</option>
                <option value="Wet-Hulled">Wet-Hulled</option>
                <option value="Honey">Honey</option>
                <option value="Anaerobic">Anaerobic</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <!-- Branch -->
            <div>
              <label class="addlot-label"><i class="fa fa-building"></i> Branch Location <span class="req">*</span></label>
              <select class="addlot-input addlot-select" name="branch" id="addLotBranch" onchange="addLotClimatSync(this.value)" required>
                <option value="">— Select Branch —</option>
                ${branches.map(b => `<option value="${b.name}">${b.name} (${b.riskStatus})</option>`).join('')}
              </select>
            </div>

            <!-- Arrival Date -->
            <div>
              <label class="addlot-label"><i class="fa fa-calendar-days"></i> Arrival / Roast Date <span class="req">*</span></label>
              <input class="addlot-input" type="date" name="arrivalDate" id="addLotDate"
                value="${new Date().toISOString().slice(0,10)}" required/>
            </div>

            <!-- Purchased Green Weight — full width with live formula -->
            <div class="full-width">
              <label class="addlot-label"><i class="fa fa-weight-hanging"></i> Purchased Green Weight (kg) <span class="req">*</span></label>
              <input class="addlot-input" type="number" name="greenWeightRaw" id="addLotGreen"
                placeholder="e.g. 300" min="0.1" step="0.1" oninput="addLotUpdateFormula(this.value)" required/>
              <!-- Live formula preview -->
              <div class="roast-preview" id="roastPreview" style="display:none">
                <div>
                  <div class="roast-preview-label">Green Weight</div>
                  <div style="font-family:var(--font-mono);font-size:14px;color:var(--text-sec)" id="previewGreen">—</div>
                </div>
                <div style="color:var(--text-muted);font-size:18px">×&nbsp;0.82</div>
                <div style="color:var(--amber);font-size:20px;font-weight:700">=</div>
                <div>
                  <div class="roast-preview-label">Live Roasted Balance</div>
                  <div class="roast-preview-val" id="previewRoasted">—</div>
                </div>
                <div style="flex:1">
                  <div class="roast-preview-label">Shrinkage (18%)</div>
                  <div style="font-family:var(--font-mono);font-size:13px;color:var(--red)" id="previewShrink">—</div>
                </div>
              </div>
            </div>

            <!-- Grade Score -->
            <div>
              <label class="addlot-label"><i class="fa fa-star"></i> Grade Score (0–100)</label>
              <input class="addlot-input" type="number" name="grade" id="addLotGrade"
                placeholder="e.g. 88" min="0" max="100" oninput="addLotUpdateStatus(this.value)"/>
              <div style="font-size:10px;margin-top:4px;font-family:var(--font-mono)" id="gradeStatusPreview">
                <span style="color:var(--text-muted)">Status auto-set: </span>
                <span id="gradeStatusBadge" style="color:var(--green)">OPTIMAL (≥ 80)</span>
              </div>
            </div>

            <!-- ── FINANCIAL INTELLIGENCE FIELDS ── -->
            <div>
              <label class="addlot-label">
                <i class="fa fa-coins" style="color:var(--amber)"></i>
                <span data-i18n="fin.add.cost">Green Bean Cost (SAR/kg)</span>
                <span class="req">*</span>
              </label>
              <input class="addlot-input" type="number" name="costPerKg" id="addLotCost"
                placeholder="e.g. 45" min="0" step="0.01"
                data-i18n-ph="fin.add.cost.ph"
                oninput="addLotUpdateFinancials()"/>
              <div style="font-size:10px;color:var(--text-muted);margin-top:3px;font-family:var(--font-mono)">
                Purchase cost per kg of green beans
              </div>
            </div>
            <div>
              <label class="addlot-label">
                <i class="fa fa-percent" style="color:var(--amber)"></i>
                <span data-i18n="fin.add.margin">Target Gross Margin (%)</span>
                <span class="req">*</span>
              </label>
              <input class="addlot-input" type="number" name="targetMargin" id="addLotMargin"
                placeholder="e.g. 35" min="1" max="99" step="0.1"
                data-i18n-ph="fin.add.margin.ph"
                oninput="addLotUpdateFinancials()"/>
              <div style="font-size:10px;margin-top:4px;font-family:var(--font-mono)" id="finPreview">
                <span style="color:var(--text-muted)">Wholesale price preview: </span>
                <span id="wholesalePreview" style="color:var(--amber)">— SAR/kg</span>
              </div>
            </div>

            <!-- Flavor Notes -->
            <div>
              <label class="addlot-label"><i class="fa fa-mug-hot"></i> Flavor Notes</label>
              <input class="addlot-input" type="text" name="flavor1" placeholder="Note 1 (e.g. Blueberry)"/>
              <input class="addlot-input" type="text" name="flavor2" placeholder="Note 2 (e.g. Jasmine)" style="margin-top:6px"/>
            </div>

            <!-- ── SACK LABEL PHOTO (OPTIONAL) ── -->
            <div class="full-width">
              <label class="addlot-label">
                <i class="fa fa-camera"></i>
                Sack Label Photo
                <span style="margin-left:6px;font-family:var(--font-mono);font-size:9px;color:var(--text-muted);border:1px solid var(--border);padding:1px 5px;border-radius:2px;text-transform:uppercase;letter-spacing:.5px">OPTIONAL</span>
              </label>
              <!-- drag-drop / click zone -->
              <div class="img-picker-zone" id="imgPickerZone">
                <input type="file" id="imgPickerInput" accept="image/jpeg,image/png,image/webp"
                  onchange="imgPickerHandleFile(this.files[0])"/>
                <div class="img-picker-icon"><i class="fa fa-image"></i></div>
                <div class="img-picker-label">Drop photo here, or <span>click to browse</span></div>
                <div class="img-picker-sub">JPEG · PNG · WebP · auto-compressed to ≤1 MB</div>
              </div>
              <!-- preview strip after selection -->
              <div class="img-preview-wrap" id="imgPreviewWrap">
                <div style="position:relative;flex-shrink:0">
                  <img id="imgPreviewThumb" class="img-preview-thumb" src="" alt="Sack label preview"
                    onclick="imgThumbEnlarge()" title="Click to enlarge"/>
                  <div class="img-enlarge-hint"><i class="fa fa-expand"></i> Click to enlarge</div>
                </div>
                <div class="img-preview-info">
                  <div class="img-preview-name" id="imgPreviewName">—</div>
                  <div class="img-preview-size" id="imgPreviewSize">—</div>
                  <div style="font-size:10px;color:var(--green);margin-top:3px"><i class="fa fa-circle-check"></i> Ready to save · Auto-compressed ≤1 MB</div>
                </div>
                <button type="button" class="img-preview-clear" onclick="imgPickerClear()" title="Remove photo">
                  <i class="fa fa-xmark"></i> Remove
                </button>
              </div>
              <!-- SFDA helper text -->
              <div class="sfda-helper">
                <i class="fa fa-shield-halved"></i>
                <strong style="color:#3b82f6">Optional:</strong>
                Keep a visual record for <strong style="color:var(--text-pri)">SFDA Article 18 traceability compliance.</strong>
                Stored as <code style="font-family:var(--font-mono);font-size:10px;color:var(--amber)">Label_Image_URL</code> in the lot record.
                Show this thumbnail instantly during inspector audits.
              </div>
            </div>

          </div>

          <!-- Climate Sync Banner -->
          <div class="climate-banner" id="climateBanner">
            <span id="climateBannerContent"></span>
          </div>

          <!-- Result Banner -->
          <div id="addlotResultBanner"></div>

        </form>
      </div>

      <!-- Footer -->
      <div class="addlot-footer">
        <div class="addlot-footer-meta">
          <i class="fa fa-circle-info" style="color:var(--amber)"></i>
          Roasted balance = green × 0.82 — auto-calculated on save.
          Expiry is set to roast date + 90 days.
        </div>
        <div class="addlot-footer-actions">
          <button type="button" class="btn-addlot-cancel" onclick="closeAddLotModal()">CANCEL</button>
          <button type="submit" form="addLotForm" class="btn-addlot-submit" id="addLotSubmitBtn">
            <i class="fa fa-circle-check"></i> SAVE LOT
          </button>
        </div>
      </div>

    </div>
  </div>
  <!-- ══ end ADD NEW GREEN LOT MODAL ══ -->

  <script>
  /* ══════════════════════════════════════════════════════════════
     ADD NEW GREEN LOT — client-side logic
  ══════════════════════════════════════════════════════════════ */

  // Branch climate data injected from server
  var BRANCH_CLIMATE = ${JSON.stringify(branchClimateData)};

  var RISK_COLORS = {
    LOW:      'var(--green)',
    MODERATE: 'var(--orange)',
    HIGH:     '#fb923c',
    CRITICAL: 'var(--red)',
  };
  var RISK_BG = {
    LOW:      'var(--green-dim)',
    MODERATE: 'var(--orange-dim)',
    HIGH:     'rgba(249,115,22,0.1)',
    CRITICAL: 'var(--red-dim)',
  };

  function openAddLotModal() {
    document.getElementById('addLotOverlay').classList.add('open');
    // Pre-fill suggested ID
    document.getElementById('addLotId').value = '${suggestedId}';
  }
  function closeAddLotModal() {
    document.getElementById('addLotOverlay').classList.remove('open');
    document.getElementById('addLotForm').reset();
    document.getElementById('roastPreview').style.display    = 'none';
    document.getElementById('climateBanner').style.display   = 'none';
    document.getElementById('addlotResultBanner').style.display = 'none';
    document.getElementById('addLotSubmitBtn').disabled      = false;
    document.getElementById('addLotSubmitBtn').innerHTML     = '<i class="fa fa-circle-check"></i> SAVE LOT';
    document.getElementById('addLotOriginCustom').style.display = 'none';
    document.getElementById('addLotId').value = '${suggestedId}';
    imgPickerClear();
  }

  // ── Image picker logic ────────────────────────────────────────
  var _imgDataUrl = null;

  (function(){
    var zone = document.getElementById('imgPickerZone');
    zone.addEventListener('dragover',  function(e){ e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', function(){ zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', function(e){
      e.preventDefault(); zone.classList.remove('drag-over');
      var files = e.dataTransfer.files;
      if (files && files[0]) imgPickerHandleFile(files[0]);
    });
  })();

  /**
   * imgPickerHandleFile — loads image, compresses to ≤1MB via canvas,
   * then shows a contained 300px thumbnail with click-to-enlarge.
   */
  function imgPickerHandleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Only image files accepted (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      alert('File too large (max 12 MB source). Please choose a smaller image.');
      return;
    }

    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        // ── Canvas compression ─────────────────────────────────
        var MAX_SIDE = 1600;   // max dimension after resize
        var TARGET_KB = 900;   // target ≤ 900 KB
        var w = img.naturalWidth;
        var h = img.naturalHeight;

        if (w > MAX_SIDE || h > MAX_SIDE) {
          var ratio = Math.min(MAX_SIDE / w, MAX_SIDE / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        var canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Iteratively lower quality until ≤ TARGET_KB
        var quality = 0.88;
        var dataUrl = canvas.toDataURL('image/jpeg', quality);
        var kb = Math.round(dataUrl.length * 0.75 / 1024);
        while (kb > TARGET_KB && quality > 0.35) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          kb = Math.round(dataUrl.length * 0.75 / 1024);
        }
        // ──────────────────────────────────────────────────────

        _imgDataUrl = dataUrl;

        // Update thumbnail
        var thumb = document.getElementById('imgPreviewThumb');
        thumb.src = dataUrl;

        // Meta info
        document.getElementById('imgPreviewName').textContent = file.name;
        document.getElementById('imgPreviewSize').textContent =
          kb + ' KB (compressed) \u00b7 ' + w + '\u00d7' + h + 'px';

        document.getElementById('imgPreviewWrap').classList.add('visible');
        document.getElementById('imgPickerZone').style.display = 'none';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  /** Open the lightbox directly from the form-preview thumbnail */
  function imgThumbEnlarge() {
    if (!_imgDataUrl) return;
    openLightbox('PREVIEW', 'Sack Label Photo', _imgDataUrl);
  }

  function imgPickerClear() {
    _imgDataUrl = null;
    var inp = document.getElementById('imgPickerInput');
    if (inp) inp.value = '';
    var wrap = document.getElementById('imgPreviewWrap');
    if (wrap) wrap.classList.remove('visible');
    var thumb = document.getElementById('imgPreviewThumb');
    if (thumb) thumb.src = '';
    var zone = document.getElementById('imgPickerZone');
    if (zone) zone.style.display = 'block';
  }

  // ── Origin selector: show custom input when "Other" chosen ────
  document.getElementById('addLotOrigin').addEventListener('change', function() {
    var custom = document.getElementById('addLotOriginCustom');
    var variety = document.getElementById('addLotVariety');
    custom.style.display = this.value === '__custom__' ? 'block' : 'none';

    // Auto-fill variety from catalog
    var ORIGINS_MAP = ${JSON.stringify(Object.fromEntries(CATALOG_ORIGINS.map(o => [o.key, { variety: o.variety, process: o.process }])))};
    if (ORIGINS_MAP[this.value]) {
      variety.value = ORIGINS_MAP[this.value].variety;
      var procSel = document.querySelector('[name="process"]');
      if (procSel) procSel.value = ORIGINS_MAP[this.value].process || procSel.value;
    }
  });

  // ── Live formula: green → roasted ×0.82 ───────────────────────
  function addLotUpdateFormula(val) {
    var g = parseFloat(val);
    var preview = document.getElementById('roastPreview');
    if (!val || isNaN(g) || g <= 0) {
      preview.style.display = 'none'; return;
    }
    var roasted = Math.round(g * 0.82 * 10) / 10;
    var shrink  = Math.round((g - roasted) * 10) / 10;
    document.getElementById('previewGreen').textContent   = g.toFixed(1) + ' kg';
    document.getElementById('previewRoasted').textContent = roasted.toFixed(1) + ' kg';
    document.getElementById('previewShrink').textContent  = '−' + shrink.toFixed(1) + ' kg';
    preview.style.display = 'flex';
  }

  // ── Financial Intelligence: live wholesale price preview ───────
  function addLotUpdateFinancials() {
    var costEl   = document.getElementById('addLotCost');
    var marginEl = document.getElementById('addLotMargin');
    var preview  = document.getElementById('wholesalePreview');
    if (!costEl || !marginEl || !preview) return;
    var cost   = parseFloat(costEl.value);
    var margin = parseFloat(marginEl.value);
    if (isNaN(cost) || cost <= 0 || isNaN(margin) || margin <= 0 || margin >= 100) {
      preview.textContent = '— SAR/kg';
      return;
    }
    var baselineCost = cost / 0.82;
    var wholesale    = baselineCost / (1 - margin / 100);
    preview.textContent = wholesale.toFixed(2) + ' SAR/kg';
  }

  // ── Grade → auto status badge ──────────────────────────────────
  function addLotUpdateStatus(val) {
    var g = parseInt(val, 10);
    var badge = document.getElementById('gradeStatusBadge');
    if (isNaN(g)) { badge.textContent = 'OPTIMAL (≥ 80)'; badge.style.color = 'var(--green)'; return; }
    if (g >= 80)  { badge.textContent = 'OPTIMAL';  badge.style.color = 'var(--green)';  }
    else if (g >= 70) { badge.textContent = 'MONITOR'; badge.style.color = 'var(--orange)'; }
    else          { badge.textContent = 'CRITICAL'; badge.style.color = 'var(--red)';    }
  }

  // ── Climate Sync: show risk banner for selected branch ────────
  function addLotClimatSync(branchName) {
    var banner = document.getElementById('climateBanner');
    var content = document.getElementById('climateBannerContent');
    if (!branchName) { banner.style.display = 'none'; return; }

    var bd = BRANCH_CLIMATE.find(function(b){ return b.name === branchName; });
    if (!bd) { banner.style.display = 'none'; return; }

    var risk      = bd.riskStatus;
    var color     = RISK_COLORS[risk] || 'var(--text-sec)';
    var riskLabel = '<span class="climate-badge-inline" style="color:' + color + ';border-color:' + color + '40">' + risk + '</span>';

    var icon = risk === 'LOW' ? 'fa-circle-check' :
               risk === 'MODERATE' ? 'fa-triangle-exclamation' :
               risk === 'HIGH'     ? 'fa-exclamation-triangle' : 'fa-radiation';

    content.innerHTML =
      '<strong style="color:' + color + '"><i class="fa ' + icon + '"></i>' +
      '  Climate Sync — ' + branchName + ' is ' + riskLabel + '</strong>' +
      '<br/>' +
      '<span style="color:var(--text-sec)">' +
        'Humidity: <strong style="font-family:var(--font-mono)">' + bd.humidity + '%</strong> &nbsp;·&nbsp; ' +
        'Temperature: <strong style="font-family:var(--font-mono)">' + bd.temperature + '°C</strong> &nbsp;·&nbsp; ' +
        'Type: <strong style="font-family:var(--font-mono)">' + bd.climateType + '</strong>' +
      '</span>' +
      '<br/><span style="color:var(--text-muted);font-size:11px">' +
        '<i class="fa fa-circle-info"></i> ' + bd.storageAdvice +
      '</span>' +
      (risk !== 'LOW'
        ? '<br/><span style="color:' + color + ';font-size:11px;font-weight:600">' +
            '<i class="fa fa-triangle-exclamation"></i> ' + bd.acuteNote + '</span>'
        : '');

    banner.className = 'climate-banner ' + risk;
    banner.style.display = 'block';
  }

  // ── Submit form ───────────────────────────────────────────────
  async function submitAddLot(e) {
    e.preventDefault();
    var form   = document.getElementById('addLotForm');
    var fd     = new FormData(form);
    var btn    = document.getElementById('addLotSubmitBtn');
    var banner = document.getElementById('addlotResultBanner');

    // Resolve origin: if "other" was chosen use the custom input
    var originVal = fd.get('origin');
    if (originVal === '__custom__') {
      var customOrigin = (fd.get('originCustom') || '').trim();
      if (!customOrigin) {
        document.getElementById('addLotOriginCustom').classList.add('error');
        document.getElementById('addLotOriginCustom').focus();
        return;
      }
      originVal = customOrigin;
    }

    var body = {
      id:             fd.get('id'),
      origin:         originVal,
      variety:        fd.get('variety'),
      process:        fd.get('process'),
      branch:         fd.get('branch'),
      greenWeightRaw: fd.get('greenWeightRaw'),
      arrivalDate:    fd.get('arrivalDate'),
      grade:          fd.get('grade'),
      flavor1:        fd.get('flavor1'),
      flavor2:        fd.get('flavor2'),
      labelImageUrl:  _imgDataUrl || undefined,
      costPerKg:      fd.get('costPerKg')    || undefined,
      targetMargin:   fd.get('targetMargin') || undefined,
    };

    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> SAVING…';
    banner.style.display = 'none';

    try {
      var res  = await fetch('/admin/inventory/add', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      var data = await res.json();

      if (!res.ok) {
        banner.style.display = 'block';
        banner.innerHTML =
          '<div style="background:var(--red-dim);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);padding:13px 16px">' +
            '<div style="font-family:var(--font-mono);font-size:12px;color:var(--red);font-weight:700;margin-bottom:3px"><i class="fa fa-circle-xmark"></i>  Error</div>' +
            '<div style="font-size:12px;color:var(--text-sec)">' + (data.error || 'Unknown error') + '</div>' +
          '</div>';
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-circle-check"></i> SAVE LOT';
        return;
      }

      // ── Success ──
      var lot     = data.lot;
      var warning = data.climateWarning;

      banner.style.display = 'block';
      banner.innerHTML =
        '<div style="background:var(--green-dim);border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius);padding:14px 18px">' +
          '<div style="font-family:var(--font-mono);font-size:12px;color:var(--green);font-weight:700;margin-bottom:8px">' +
            '<i class="fa fa-circle-check"></i>  Lot Added Successfully</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:8px">' +
            '<div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Lot ID</div>' +
              '<div style="font-family:var(--font-mono);font-size:14px;color:var(--amber)">' + lot.id + '</div></div>' +
            '<div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Green</div>' +
              '<div style="font-family:var(--font-mono);font-size:14px">' + lot.greenWeightKg + ' kg</div></div>' +
            '<div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Roasted ×0.82</div>' +
              '<div style="font-family:var(--font-mono);font-size:14px;color:var(--amber)">' + lot.roastedWeightKg + ' kg</div></div>' +
            '<div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Status</div>' +
              '<div style="font-family:var(--font-mono);font-size:14px;color:' +
                (lot.status==='OPTIMAL'?'var(--green)':lot.status==='MONITOR'?'var(--orange)':'var(--red)') +
              '">' + lot.status + '</div></div>' +
            '<div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Branch</div>' +
              '<div style="font-family:var(--font-mono);font-size:14px">' + lot.branch + '</div></div>' +
            '<div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Expiry</div>' +
              '<div style="font-family:var(--font-mono);font-size:12px;color:var(--text-sec)">' + lot.expiryDate + '</div></div>' +
          '</div>' +
          (data.hasImage && _imgDataUrl
            ? '<div style="display:flex;align-items:center;gap:10px;margin-top:6px;padding:8px 10px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.22);border-radius:var(--radius)">' +
                '<img src="' + _imgDataUrl + '" style="width:48px;height:48px;object-fit:cover;border-radius:3px;border:1px solid var(--border-amber)"/>' +
                '<div style="font-size:11px;color:#3b82f6"><i class="fa fa-shield-halved"></i> <strong>Sack label photo saved</strong> \u2014 Label_Image_URL stored for SFDA Article 18 traceability.</div>' +
              '</div>'
            : '') +
          (warning
            ? '<div style="margin-top:6px;padding:8px 12px;background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.3);border-radius:var(--radius);font-size:11px;color:#fb923c">' +
                '<i class="fa fa-triangle-exclamation"></i> ' + warning + '</div>'
            : '') +
          '<div style="margin-top:10px"><a href="/admin/inventory" style="font-family:var(--font-mono);font-size:11px;color:var(--green)"><i class="fa fa-rotate-right"></i> Reload page to see updated ledger →</a></div>' +
        '</div>';

      btn.innerHTML = '<i class="fa fa-circle-check"></i> SAVED!';
    } catch(err) {
      banner.style.display = 'block';
      banner.innerHTML = '<div style="color:var(--red);font-size:12px;padding:12px;background:var(--red-dim);border-radius:var(--radius);border:1px solid rgba(239,68,68,0.3)">Network error: ' + err.message + '</div>';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa fa-circle-check"></i> SAVE LOT';
    }
  }

  // ── Lightbox — sack label photo inspector ─────────────────────
  // Lot image registry: populated from <img> tags already in the DOM
  // (avoids embedding giant base64 strings inside onclick attributes)
  var _lotImageMap = {};
  (function buildImageMap() {
    document.querySelectorAll('.lot-thumb[data-lot-id]').forEach(function(img) {
      _lotImageMap[img.dataset.lotId] = img.src;
    });
  })();

  var _lbDataUrl = '';
  var _lbLotId   = '';

  /** Open lightbox from the inventory ledger — looks up image by lot ID */
  function openLightboxById(lotId, origin) {
    // Re-read from the actual <img> src already rendered in the table
    var thumb = document.querySelector('.lot-thumb[data-lot-id="' + lotId + '"]');
    var dataUrl = thumb ? thumb.src : (_lotImageMap[lotId] || '');
    openLightbox(lotId, origin, dataUrl);
  }

  function openLightbox(lotId, origin, dataUrl) {
    _lbDataUrl = dataUrl;
    _lbLotId   = (lotId === 'PREVIEW') ? 'PREVIEW' : lotId;
    document.getElementById('lightboxImg').src            = dataUrl;
    document.getElementById('lightboxLotId').textContent  = lotId;
    document.getElementById('lightboxOrigin').textContent = origin;
    document.getElementById('lightboxOverlay').classList.add('open');
  }
  function closeLightbox() {
    document.getElementById('lightboxImg').src = ''; // free memory
    document.getElementById('lightboxOverlay').classList.remove('open');
  }
  function downloadLabelImage() {
    if (!_lbDataUrl) return;
    var a = document.createElement('a');
    a.href     = _lbDataUrl;
    a.download = 'sack-label-' + _lbLotId + '.jpg';
    a.click();
  }

  // Backdrop click to close
  document.getElementById('addLotOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeAddLotModal();
  });
  </script>
  <!-- ══ end ADD NEW GREEN LOT MODAL ══ -->

  <!-- ══ FIFO LOG NEW ROAST ══ -->
  <div class="card" style="margin-bottom:24px">
    <div class="card-title">
      <i class="fa fa-fire" style="color:var(--amber)"></i>
      Log New Roast
      <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(245,158,11,0.12);color:var(--amber);border:1px solid rgba(245,158,11,0.35);margin-left:4px">FIFO</span>
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
      Select an origin — the system automatically suggests the <strong style="color:var(--amber)">oldest available lot</strong> (FIFO compliance).
    </div>

    <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:flex-end;margin-bottom:16px">
      <div class="form-group" style="margin:0">
        <label class="form-label">Origin</label>
        <select class="form-input" id="fifoOriginSelect" onchange="fifoSelectOrigin(this.value)">
          <option value="">— Select Origin —</option>
          ${availableOrigins.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>
      </div>
      <button
        style="font-family:var(--font-mono);font-size:11px;padding:10px 16px;background:var(--amber-glow);color:var(--amber);border:1px solid var(--border-amber);border-radius:var(--radius);cursor:pointer;white-space:nowrap"
        onclick="fifoConfirmRoast()"
        id="fifoRoastBtn"
        disabled
      >
        <i class="fa fa-check"></i> CONFIRM ROAST
      </button>
    </div>

    <!-- FIFO suggestion panel (hidden until origin is selected) -->
    <div id="fifoPanel" style="display:none;background:var(--bg-2);border:1px solid var(--border-amber);border-left:3px solid var(--amber);border-radius:var(--radius);padding:14px 16px">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--amber);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">
        <i class="fa fa-arrow-up-right-dots"></i> &nbsp;FIFO Suggestion — Oldest Available Lot
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px">
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px">Lot ID</div>
          <div id="fifoLotId" style="font-family:var(--font-mono);font-size:16px;color:var(--amber);font-weight:700;margin-top:2px">—</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px">Origin</div>
          <div id="fifoOrigin" style="font-size:13px;font-weight:600;color:var(--text-pri);margin-top:2px">—</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px">Roast Date</div>
          <div id="fifoDate" style="font-family:var(--font-mono);font-size:13px;color:var(--text-sec);margin-top:2px">—</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px">Green Weight</div>
          <div id="fifoGreen" style="font-family:var(--font-mono);font-size:13px;color:var(--text-sec);margin-top:2px">—</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px">Status</div>
          <div id="fifoStatus" style="margin-top:2px">—</div>
        </div>
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--text-muted)">
        <i class="fa fa-circle-info" style="color:var(--amber)"></i>
        FIFO (First-In First-Out): This is the oldest unrecalled lot for this origin — it must be processed first to maintain traceability.
      </div>
    </div>
  </div>
  <!-- ══ end FIFO ══ -->

  <div class="card">
    <div class="card-title">Full Inventory Ledger — Live Balances</div>
    <div class="table-wrap">
      <table class="inv-table">
        <thead>
          <tr>
            <th>Lot ID</th><th>Origin</th><th>Variety / Process</th><th>Branch</th>
            <th>Purchased</th><th>Dispatched</th>
            <th>Live Green</th><th>Live Roasted</th>
            <th>Roast Date</th><th>Expiry</th><th>Status</th><th>Grade</th>
            <th class="label-cell">Label</th>
            <th>SFDA</th>
          </tr>
        </thead>
        <tbody class="inv-table-body">
          ${coffeeLots.map(l => {
            const lb = bal.byLot.get(l.id)!
            const hasDispatch = lb.dispatchedRoastedKg > 0
            const isRecalled = l.status === 'RECALLED'
            return `
          <tr class="${isRecalled ? 'tr-recalled' : ''}">
            <td class="mono" style="color:${isRecalled ? 'var(--red)' : 'var(--amber)'}">${l.id}</td>
            <td>
              <div style="font-weight:500">${l.origin}</div>
              <div class="flavor-tags" style="margin:4px 0 0">
                ${l.flavorNotes.slice(0, 2).map(f => `<span class="flavor-tag">${f}</span>`).join('')}
              </div>
            </td>
            <td style="font-size:12px;color:var(--text-sec)">${l.variety}<br/><span style="color:var(--text-muted)">${l.process}</span></td>
            <td style="font-size:12px">${l.branch}</td>
            <td>
              <div class="weight-block">
                <span class="weight-green" style="color:var(--text-muted)">${lb.purchasedGreenKg} kg</span>
                <span class="weight-arrow">→</span>
                <span class="weight-roast" style="color:var(--text-muted)">${lb.purchasedRoastedKg} kg</span>
              </div>
            </td>
            <td class="mono" style="font-size:11px;color:${hasDispatch ? 'var(--red)' : 'var(--text-muted)'}">
              ${hasDispatch
                ? `−${lb.dispatchedRoastedKg} kg<br/><span style="color:var(--text-muted);font-size:10px">≈${lb.dispatchedGreenEquiv} kg green</span>`
                : '—'}
            </td>
            <td class="mono" style="color:var(--amber);font-weight:700;font-size:14px">${lb.liveGreenKg} kg</td>
            <td class="mono" style="color:var(--amber)">${lb.liveRoastedKg} kg</td>
            <td class="mono" style="font-size:11px;color:var(--text-muted)">${l.roastDate}</td>
            <td class="mono" style="font-size:11px;color:var(--text-muted)">${l.expiryDate}</td>
            <td><span class="badge badge-${l.status}">${l.status}</span>
              ${isRecalled && l.recallInfo ? `<div style="font-size:10px;color:var(--red);margin-top:3px">${l.recallInfo.initiatedAt}</div>` : ''}
            </td>
            <td>
              <div class="score-bar">
                <div class="score-track"><div class="score-fill" style="width:${l.gradeScore}%"></div></div>
                <span class="score-num">${l.gradeScore}</span>
              </div>
            </td>
            <td class="label-cell">
              ${l.labelImageUrl
                ? `<img
                    src="${l.labelImageUrl}"
                    class="lot-thumb"
                    data-lot-id="${l.id}"
                    alt="Sack label"
                    title="Click to enlarge · ${l.id}"
                    onclick="openLightboxById('${l.id}','${l.origin.replace(/'/g, '&apos;')}')"
                  />`
                : `<span class="no-photo-badge" title="No photo"><i class="fa fa-image"></i></span>`
              }
            </td>
            <td>
              ${isRecalled
                ? `<div style="font-family:var(--font-mono);font-size:9px;color:var(--red);border:1px solid rgba(239,68,68,0.4);padding:3px 7px;border-radius:2px;white-space:nowrap"><i class="fa fa-ban"></i> RECALLED</div>
                   ${l.recallInfo ? `<div style="font-size:10px;color:var(--text-muted);margin-top:4px;max-width:140px;white-space:normal;line-height:1.3">${l.recallInfo.instructions}</div>` : ''}`
                : `<button
                    onclick="openRecallModal('${l.id}','${l.origin.replace(/'/g, "\\'")}')"
                    style="font-family:var(--font-mono);font-size:10px;padding:5px 10px;background:rgba(239,68,68,0.12);color:var(--red);border:1px solid rgba(239,68,68,0.35);border-radius:var(--radius);cursor:pointer;white-space:nowrap;transition:all .2s"
                    onmouseover="this.style.background='rgba(239,68,68,0.25)'"
                    onmouseout="this.style.background='rgba(239,68,68,0.12)'"
                  >
                    <i class="fa fa-triangle-exclamation"></i> INITIATE RECALL
                  </button>`
              }
            </td>
          </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ LIGHTBOX — SACK LABEL PHOTO VIEWER ══ -->
  <div class="lightbox-overlay" id="lightboxOverlay" onclick="if(event.target===this)closeLightbox()">
    <img id="lightboxImg" class="lightbox-img" src="" alt="Sack label"/>
    <div class="lightbox-meta">
      <strong id="lightboxLotId"></strong>
      &nbsp;·&nbsp; <span id="lightboxOrigin"></span>
      &nbsp;·&nbsp; <span style="color:#3b82f6"><i class="fa fa-shield-halved"></i> SFDA Article 18 — Label_Image_URL</span>
    </div>
    <div class="lightbox-footer">
      <button class="lightbox-close" onclick="closeLightbox()"><i class="fa fa-xmark"></i> Close</button>
      <button class="lightbox-download" id="lightboxDownload" onclick="downloadLabelImage()">
        <i class="fa fa-download"></i> Download for Inspector
      </button>
    </div>
  </div>
  <!-- ══ end LIGHTBOX ══ -->

  <!-- ══ SFDA RECALL MODAL ══ -->
  <div class="modal-overlay" id="recallModal">
    <div class="recall-modal">
      <div class="recall-modal-title">
        <i class="fa fa-triangle-exclamation"></i>
        SFDA AUDIT SHIELD — INITIATE RECALL
      </div>
      <div class="recall-modal-sub">
        <span id="recallLotBadge"></span>
        You are about to initiate a formal product recall. This action will:
        <ul style="margin:8px 0 0 16px;line-height:1.8;color:var(--text-sec);font-size:12px">
          <li>Lock the lot status to <strong style="color:var(--red)">RECALLED</strong></li>
          <li>Block all further roast logging and cafe ordering for this patch</li>
          <li>Notify all cafes with dispatched orders from this lot</li>
          <li>This action cannot be undone.</li>
        </ul>
      </div>

      <div class="form-group">
        <label class="form-label"><i class="fa fa-clipboard-list"></i> &nbsp;Recall Instructions</label>
        <textarea
          class="form-textarea"
          id="recallInstructions"
          placeholder="e.g. Dispose of lot immediately — do not serve. Courier will pick up tomorrow at 9am."
          style="min-height:90px"
        ></textarea>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px">These instructions will be sent to all affected cafes as an urgent notification.</div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-cancel" onclick="closeRecallModal()">CANCEL</button>
        <button type="button" class="btn-recall-confirm" id="recallConfirmBtn" onclick="submitRecall()">
          <i class="fa fa-triangle-exclamation"></i> &nbsp;CONFIRM RECALL
        </button>
      </div>
    </div>
  </div>

  <script>
    /* ── FIFO Lot Selector ── */
    // Built from server-side lot data
    var LOTS_DATA = ${JSON.stringify(coffeeLots.map(l => ({
      id: l.id,
      origin: l.origin,
      roastDate: l.roastDate,
      greenWeightKg: l.greenWeightKg,
      status: l.status,
    })))};

    function fifoSelectOrigin(origin) {
      var panel  = document.getElementById('fifoPanel');
      var btn    = document.getElementById('fifoRoastBtn');
      if (!origin) {
        panel.style.display = 'none';
        btn.disabled = true;
        return;
      }

      // Filter non-recalled lots for this origin, sort by roastDate ascending (oldest first)
      var candidates = LOTS_DATA
        .filter(function(l){ return l.origin === origin && l.status !== 'RECALLED'; })
        .sort(function(a,b){ return a.roastDate.localeCompare(b.roastDate); });

      if (!candidates.length) {
        panel.style.display = 'none';
        btn.disabled = true;
        return;
      }

      var lot = candidates[0];
      document.getElementById('fifoLotId').textContent   = lot.id;
      document.getElementById('fifoOrigin').textContent  = lot.origin;
      document.getElementById('fifoDate').textContent    = lot.roastDate;
      document.getElementById('fifoGreen').textContent   = lot.greenWeightKg + ' kg';
      document.getElementById('fifoStatus').innerHTML    =
        '<span class="badge badge-' + lot.status + '">' + lot.status + '</span>';

      panel.style.display = 'block';
      btn.disabled = false;
    }

    function fifoConfirmRoast() {
      var lotId = document.getElementById('fifoLotId').textContent;
      if (!lotId || lotId === '—') return;
      alert('✅ FIFO Compliance Confirmed\\n\\nLot: ' + lotId + '\\nThis lot has been selected for the next roast batch per FIFO protocol.\\n\\nIn a full system, this would open the roast logging form for Lot ' + lotId + '.');
    }

    /* ── SFDA Recall Modal ── */
    var _recallLotId     = '';
    var _recallLotOrigin = '';

    function openRecallModal(lotId, origin) {
      _recallLotId     = lotId;
      _recallLotOrigin = origin;
      document.getElementById('recallLotBadge').innerHTML =
        '<span class="badge badge-RECALLED" style="margin-right:8px">' + lotId + '</span>' +
        '<strong style="color:var(--text-pri)">' + origin + '</strong><br/><br/>';
      document.getElementById('recallInstructions').value = '';
      document.getElementById('recallConfirmBtn').disabled = false;
      document.getElementById('recallModal').classList.add('open');
    }

    function closeRecallModal() {
      document.getElementById('recallModal').classList.remove('open');
    }

    function submitRecall() {
      var instructions = document.getElementById('recallInstructions').value.trim();
      if (!instructions) {
        document.getElementById('recallInstructions').focus();
        document.getElementById('recallInstructions').style.borderColor = 'var(--red)';
        return;
      }
      document.getElementById('recallConfirmBtn').disabled = true;
      document.getElementById('recallConfirmBtn').innerHTML = '<i class="fa fa-spinner fa-spin"></i> &nbsp;PROCESSING RECALL...';

      // POST to server
      fetch('/admin/inventory/' + _recallLotId + '/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: instructions })
      })
      .then(function(r){
        if (r.ok) {
          window.location.href = '/admin/inventory?recallSuccess=' + encodeURIComponent(_recallLotId);
        } else {
          alert('Recall failed. Please try again.');
          document.getElementById('recallConfirmBtn').disabled = false;
          document.getElementById('recallConfirmBtn').innerHTML = '<i class="fa fa-triangle-exclamation"></i> &nbsp;CONFIRM RECALL';
        }
      })
      .catch(function(){
        alert('Network error. Please try again.');
        document.getElementById('recallConfirmBtn').disabled = false;
        document.getElementById('recallConfirmBtn').innerHTML = '<i class="fa fa-triangle-exclamation"></i> &nbsp;CONFIRM RECALL';
      });
    }

    document.getElementById('recallModal').addEventListener('click', function(e){
      if (e.target === this) closeRecallModal();
    });

    /* ── Show recall success alert ── */
    var urlParams = new URLSearchParams(window.location.search);
    var recalledId = urlParams.get('recallSuccess');
    if (recalledId) {
      var banner = document.createElement('div');
      banner.className = 'alert alert-critical';
      banner.style.cssText = 'margin-bottom:16px;animation:recallSlideIn .4s ease-out';
      banner.innerHTML = '<i class="fa fa-triangle-exclamation"></i><div><strong>RECALL INITIATED — Lot ' + recalledId + '</strong> — Status locked to RECALLED. Affected cafes have been notified.</div>';
      document.querySelector('.page-header').insertAdjacentElement('afterend', banner);
    }
  </script>`

  return c.html(adminLayout('Inventory Ledger', 'inventory', content, pendingCount))
})

// ── GET /admin/finance ──────────────────────────────────────────
app.get('/admin/finance', (c) => {
  const pendingCount = beanRequests.filter(r => r.status === 'PENDING').length
  const bal          = calcLiveBalance(coffeeLots, beanRequests, branches)
  // Compute per-tier portfolios so the Finance summary cards start with the right values
  const portBronze   = calcPortfolioFinancials(coffeeLots, bal, branches, undefined, tierMargins.Bronze)
  const portSilver   = calcPortfolioFinancials(coffeeLots, bal, branches, undefined, tierMargins.Silver)
  const portGold     = calcPortfolioFinancials(coffeeLots, bal, branches, undefined, tierMargins.Gold)
  const portfolio    = portGold  // Gold is the reference tier for env / sponge display

  const envPnlFmt     = portfolio.totalEnvironmentalPnL.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const envPnlSign    = portfolio.totalEnvironmentalPnL >= 0 ? '+' : ''
  const envPnlColor   = portfolio.totalEnvironmentalPnL > 0 ? 'var(--green)' : portfolio.totalEnvironmentalPnL < 0 ? 'var(--red)' : 'var(--text-muted)'
  const spongeKgSign  = portfolio.totalSpongeKgDelta >= 0 ? '+' : ''
  const spongeKgColor = portfolio.totalSpongeKgDelta > 0 ? 'var(--green)' : portfolio.totalSpongeKgDelta < 0 ? 'var(--red)' : 'var(--text-muted)'

  const content = `
  <div class="page-title" style="margin-bottom:4px" data-i18n="fin.page.title">Financial Intelligence</div>
  <div class="page-sub" style="margin-bottom:24px" data-i18n="fin.page.sub">True costs · Wholesale pricing · Environmental P&L</div>

  <!-- ── Portfolio Summary Cards ── -->
  <div class="stat-grid" style="margin-bottom:28px">

    <!-- Bronze tier totals -->
    <div class="stat-card" style="border-color:rgba(205,127,50,0.35)">
      <div class="stat-label" style="color:#cd7f32">🥉 Bronze — Portfolio Value</div>
      <div class="stat-value" style="color:#cd7f32" id="qfi-total-value-bronze">${Math.round(portBronze.totalInventoryValue).toLocaleString('en-SA')}</div>
      <div class="stat-unit">SAR &nbsp;·&nbsp; <span id="qfi-total-profit-bronze" style="color:${portBronze.totalProjectedProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${portBronze.totalProjectedProfit >= 0 ? '+' : ''}${Math.round(portBronze.totalProjectedProfit).toLocaleString('en-SA')} profit</span></div>
    </div>

    <!-- Silver tier totals -->
    <div class="stat-card" style="border-color:rgba(148,163,184,0.35)">
      <div class="stat-label" style="color:#94a3b8">🥈 Silver — Portfolio Value</div>
      <div class="stat-value" style="color:#94a3b8" id="qfi-total-value-silver">${Math.round(portSilver.totalInventoryValue).toLocaleString('en-SA')}</div>
      <div class="stat-unit">SAR &nbsp;·&nbsp; <span id="qfi-total-profit-silver" style="color:${portSilver.totalProjectedProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${portSilver.totalProjectedProfit >= 0 ? '+' : ''}${Math.round(portSilver.totalProjectedProfit).toLocaleString('en-SA')} profit</span></div>
    </div>

    <!-- Gold tier totals (reference) -->
    <div class="stat-card" style="border-color:rgba(245,158,11,0.45)">
      <div class="stat-label" style="color:#f59e0b">🥇 Gold — Portfolio Value</div>
      <div class="stat-value" style="color:#f59e0b" id="qfi-total-value-gold">${Math.round(portGold.totalInventoryValue).toLocaleString('en-SA')}</div>
      <div class="stat-unit">SAR &nbsp;·&nbsp; <span id="qfi-total-profit-gold" style="color:${portGold.totalProjectedProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${portGold.totalProjectedProfit >= 0 ? '+' : ''}${Math.round(portGold.totalProjectedProfit).toLocaleString('en-SA')} profit</span></div>
    </div>

    <!-- Environmental P&L + Lots -->
    <div class="stat-card" style="border-color:rgba(245,158,11,0.25)">
      <div class="stat-label" data-i18n="fin.env.pnl">Environmental P&L</div>
      <div class="stat-value" style="color:${envPnlColor}" id="qfi-env-pnl">${envPnlSign}${envPnlFmt}</div>
      <div class="stat-unit" style="color:${spongeKgColor}">${spongeKgSign}${portfolio.totalSpongeKgDelta} kg sponge Δ &nbsp;·&nbsp; ${portfolio.lotsWithPricing} lots priced</div>
    </div>
  </div>

  <!-- ── Tier Margin Settings ── -->
  <div class="card" style="margin-bottom:28px">
    <div class="card-title" style="margin-bottom:4px">
      <i class="fa fa-layer-group" style="color:var(--amber)"></i>
      <span>Client Tier Pricing — Bronze / Silver / Gold</span>
      <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(245,158,11,0.10);color:var(--amber);border:1px solid rgba(245,158,11,0.25);margin-left:8px">⬡ QFI ENGINE</span>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:18px;font-family:var(--font-mono)">
      Wholesale Price = (Green Cost ÷ 0.82) ÷ (1 − Tier Margin %) &nbsp;·&nbsp;
      <span style="color:rgba(245,158,11,0.8)">Type any value to simulate · click SET ALL to save &amp; broadcast to cafe portals</span>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:16px">

      <!-- Bronze -->
      <div style="background:var(--bg-2);border:1px solid rgba(205,127,50,0.35);border-radius:var(--radius);padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-family:var(--font-mono);font-size:11px;color:#cd7f32;font-weight:700;padding:2px 8px;border:1px solid rgba(205,127,50,0.4);border-radius:2px">🥉 BRONZE</span>
          <span style="font-size:10px;color:var(--text-muted)">entry · 0–500 kg LTV</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <input id="marginBronze" type="number" min="1" max="99" step="0.1"
            value="${tierMargins.Bronze}"
            style="width:72px;background:var(--bg-1);border:1px solid rgba(205,127,50,0.4);border-radius:var(--radius);padding:7px 8px;color:var(--text-pri);font-family:var(--font-mono);font-size:15px;font-weight:700;text-align:center"/>
          <span style="font-family:var(--font-mono);color:#cd7f32;font-size:13px">%</span>
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-left:auto" id="cur-bronze">${tierMargins.Bronze}% saved</span>
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px;font-family:var(--font-mono)" id="sim-bronze-wp">
          — preview prices below —
        </div>
      </div>

      <!-- Silver -->
      <div style="background:var(--bg-2);border:1px solid rgba(148,163,184,0.35);border-radius:var(--radius);padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-family:var(--font-mono);font-size:11px;color:#94a3b8;font-weight:700;padding:2px 8px;border:1px solid rgba(148,163,184,0.4);border-radius:2px">🥈 SILVER</span>
          <span style="font-size:10px;color:var(--text-muted)">mid · 501–2000 kg LTV</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <input id="marginSilver" type="number" min="1" max="99" step="0.1"
            value="${tierMargins.Silver}"
            style="width:72px;background:var(--bg-1);border:1px solid rgba(148,163,184,0.4);border-radius:var(--radius);padding:7px 8px;color:var(--text-pri);font-family:var(--font-mono);font-size:15px;font-weight:700;text-align:center"/>
          <span style="font-family:var(--font-mono);color:#94a3b8;font-size:13px">%</span>
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-left:auto" id="cur-silver">${tierMargins.Silver}% saved</span>
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px;font-family:var(--font-mono)" id="sim-silver-wp">
          — preview prices below —
        </div>
      </div>

      <!-- Gold -->
      <div style="background:var(--bg-2);border:1px solid rgba(245,158,11,0.35);border-radius:var(--radius);padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-family:var(--font-mono);font-size:11px;color:#f59e0b;font-weight:700;padding:2px 8px;border:1px solid rgba(245,158,11,0.4);border-radius:2px">🥇 GOLD</span>
          <span style="font-size:10px;color:var(--text-muted)">top · 2001 kg+ LTV</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <input id="marginGold" type="number" min="1" max="99" step="0.1"
            value="${tierMargins.Gold}"
            style="width:72px;background:var(--bg-1);border:1px solid rgba(245,158,11,0.4);border-radius:var(--radius);padding:7px 8px;color:var(--text-pri);font-family:var(--font-mono);font-size:15px;font-weight:700;text-align:center"/>
          <span style="font-family:var(--font-mono);color:#f59e0b;font-size:13px">%</span>
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-left:auto" id="cur-gold">${tierMargins.Gold}% saved</span>
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:8px;font-family:var(--font-mono)" id="sim-gold-wp">
          — preview prices below —
        </div>
      </div>

    </div>

    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <button onclick="saveTierMargins()" style="padding:9px 22px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--amber);cursor:pointer;letter-spacing:.5px">
        <i class="fa fa-satellite-dish"></i> &nbsp;SET ALL &amp; BROADCAST
      </button>
      <div id="tierSavedMsg" style="font-family:var(--font-mono);font-size:11px;color:var(--green);display:none">
        <i class="fa fa-circle-check"></i> Tier margins saved &amp; broadcast to all cafe portals
      </div>
    </div>
  </div>

  <!-- ── Lot-Level Financial Breakdown Table ── -->
  <div class="card">
    <div class="card-title" style="margin-bottom:16px">
      <i class="fa fa-table" style="color:var(--amber)"></i>
      <span data-i18n="fin.table.title">Lot-Level Financial Breakdown</span>
      <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(245,158,11,0.10);color:var(--amber);border:1px solid rgba(245,158,11,0.25);margin-left:6px">⬡ QFI ENGINE</span>
    </div>
    <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:12px">
      Wholesale prices shown below are at <strong style="color:var(--amber)">Gold tier margin (${tierMargins.Gold}%)</strong> as reference.
      Bronze, Silver and Gold prices are computed per tier.
    </div>

    <!-- PREVIEW MODE banner — shown when any margin input is being changed -->
    <div id="qfi-preview-banner" style="display:none;align-items:center;gap:10px;padding:8px 14px;margin-bottom:14px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.35);border-radius:var(--radius);font-family:var(--font-mono);font-size:11px;color:var(--amber)">
      <i class="fa fa-eye"></i>
      <span>PORTFOLIO SIMULATION — values shown at typed tier margins. Click SET ALL to save.</span>
      <button onclick="resetTierPreview()" style="margin-left:auto;padding:3px 10px;font-family:var(--font-mono);font-size:10px;background:transparent;border:1px solid rgba(245,158,11,0.4);color:var(--amber);border-radius:2px;cursor:pointer">RESET</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lot ID</th>
            <th>Origin</th>
            <th>Branch</th>
            <th>True Roasted Cost</th>
            <th style="color:#cd7f32">🥉 Bronze Price</th>
            <th style="color:#94a3b8">🥈 Silver Price</th>
            <th style="color:#f59e0b">🥇 Gold Price</th>
            <th>Live Stock</th>
            <th>Live Inv. Value <span style="font-size:9px;font-weight:400;color:var(--text-muted)">(Gold)</span></th>
            <th>Projected Profit <span style="font-size:9px;font-weight:400;color:var(--text-muted)">(Gold)</span></th>
            <th>Env. P&L</th>
            <th>Yield Coeff.</th>
          </tr>
        </thead>
        <tbody>
          ${portfolio.byLot.map(fin => {
            const hasCost     = fin.costPerKg > 0
            const profitColor = fin.projectedProfit >= 0 ? 'var(--green)' : 'var(--red)'
            const envColor    = fin.environmentalPnL > 0 ? 'var(--green)' : fin.environmentalPnL < 0 ? 'var(--red)' : 'var(--text-muted)'
            const coeffColor  = fin.yieldCoeff > SPONGE_BASELINE_COEFFICIENT ? '#38bdf8' :
                                fin.yieldCoeff < SPONGE_BASELINE_COEFFICIENT ? '#fb923c' : 'var(--text-sec)'
            const coeffIcon   = fin.yieldCoeff > SPONGE_BASELINE_COEFFICIENT ? '▲' :
                                fin.yieldCoeff < SPONGE_BASELINE_COEFFICIENT ? '▼' : '—'
            // Server-rendered prices per unified tier (Bronze / Silver / Gold)
            const wpBronze = hasCost ? calcWholesalePrice(fin.costPerKg, tierMargins.Bronze) : null
            const wpSilver = hasCost ? calcWholesalePrice(fin.costPerKg, tierMargins.Silver) : null
            const wpGold   = hasCost ? calcWholesalePrice(fin.costPerKg, tierMargins.Gold)   : null
            return `
          <tr data-lot-id="${fin.lotId}">
            <td class="mono" style="color:var(--amber)">${fin.lotId}</td>
            <td style="font-weight:500">${fin.origin}</td>
            <td style="font-size:12px;color:var(--text-sec)">${fin.branch}</td>
            <td class="mono" id="qfi-true-${fin.lotId}">${hasCost
              ? `<span style="color:var(--text-pri)">${fin.trueRoastedCost.toFixed(2)}</span> <span style="font-size:10px;color:var(--text-muted)">SAR/kg</span>`
              : `<span style="color:var(--text-muted);font-size:11px">No cost data</span>`
            }</td>
            <td class="mono" id="qfi-wp-bronze-${fin.lotId}">${wpBronze !== null
              ? `<span style="color:#cd7f32;font-weight:700">${wpBronze.toFixed(2)}</span> <span style="font-size:10px;color:var(--text-muted)">SAR/kg</span>`
              : `<span style="color:var(--text-muted)">—</span>`
            }</td>
            <td class="mono" id="qfi-wp-silver-${fin.lotId}">${wpSilver !== null
              ? `<span style="color:#94a3b8;font-weight:700">${wpSilver.toFixed(2)}</span> <span style="font-size:10px;color:var(--text-muted)">SAR/kg</span>`
              : `<span style="color:var(--text-muted)">—</span>`
            }</td>
            <td class="mono" id="qfi-wp-gold-${fin.lotId}">${wpGold !== null
              ? `<span style="color:#f59e0b;font-weight:700">${wpGold.toFixed(2)}</span> <span style="font-size:10px;color:var(--text-muted)">SAR/kg</span>`
              : `<span style="color:var(--text-muted)">—</span>`
            }</td>
            <td class="mono" style="color:var(--text-sec)">${fin.liveRoastedKg} kg</td>
            <td class="mono" id="qfi-iv-${fin.lotId}">${hasCost
              ? `<span style="color:var(--amber)">${fin.liveInventoryValue.toLocaleString('en-SA', {minimumFractionDigits:0,maximumFractionDigits:0})}</span> <span style="font-size:10px;color:var(--text-muted)">SAR</span>`
              : `<span style="color:var(--text-muted)">—</span>`
            }</td>
            <td class="mono" id="qfi-pp-${fin.lotId}" style="color:${profitColor}">${hasCost
              ? `${fin.projectedProfit >= 0 ? '+' : ''}${fin.projectedProfit.toLocaleString('en-SA', {minimumFractionDigits:0,maximumFractionDigits:0})} SAR`
              : `<span style="color:var(--text-muted)">—</span>`
            }</td>
            <td class="mono" id="qfi-ep-${fin.lotId}" style="color:${envColor}">${hasCost
              ? `${fin.environmentalPnL >= 0 ? '+' : ''}${fin.environmentalPnL.toFixed(2)} SAR`
              : `<span style="color:var(--text-muted)">—</span>`
            }</td>
            <td>
              <span style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:${coeffColor}">${coeffIcon} ${(fin.yieldCoeff * 100).toFixed(1)}%</span>
              <div style="font-size:9px;color:var(--text-muted);margin-top:2px" id="qfi-margin-${fin.lotId}">cost: ${fin.costPerKg > 0 ? fin.costPerKg + ' SAR/kg' : '—'}</div>
            </td>
          </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ ZATCA BULK SHRINKAGE EXPORT ══ -->
  ${(() => {
    const rpt = calcZatcaShrinkageReport(coffeeLots, beanRequests, branches, tierMargins.Gold)
    const netSign   = rpt.netSpongeAdjustmentKg >= 0 ? '+' : ''
    const netColor  = rpt.netSpongeAdjustmentKg > 0 ? 'var(--green)' : rpt.netSpongeAdjustmentKg < 0 ? 'var(--red)' : 'var(--text-muted)'
    const ruleAColor = rpt.totalRuleASurplusKg > 0 ? 'var(--green)' : 'var(--text-muted)'
    const ruleBColor = rpt.totalRuleBDeficitKg < 0 ? 'var(--red)'   : 'var(--text-muted)'
    return `
  <div class="card" style="margin-bottom:28px;border-color:rgba(245,158,11,0.35);background:linear-gradient(135deg,var(--bg-1) 0%,rgba(245,158,11,0.04) 100%)">
    <div class="card-title" style="margin-bottom:4px">
      <i class="fa fa-file-invoice" style="color:var(--amber)"></i>
      <span>ZATCA Bulk Shrinkage Export</span>
      <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(245,158,11,0.10);color:var(--amber);border:1px solid rgba(245,158,11,0.25);margin-left:8px">⬡ TAX AUDIT</span>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:20px;font-family:var(--font-mono)">
      Theoretical vs. Actual weight reconciliation · ${rpt.periodLabel} · ${rpt.totalLotsReported} lots
    </div>

    <!-- 30-day aggregate summary tiles -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:24px">

      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px">
        <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Purchased Green</div>
        <div style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--text-pri)">${rpt.totalPurchasedGreenKg.toLocaleString('en-SA')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono)">kg total</div>
      </div>

      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px">
        <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Baseline Shrinkage</div>
        <div style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--red)">−${rpt.totalBaselineShrinkageKg.toLocaleString('en-SA')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono)">kg · standard 18% roast loss</div>
      </div>

      <div style="background:var(--bg-2);border:1px solid rgba(34,197,94,0.30);border-radius:var(--radius);padding:14px">
        <div style="font-size:9px;color:${ruleAColor};text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Rule A Surplus</div>
        <div style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:${ruleAColor}">${rpt.totalRuleASurplusKg > 0 ? '+' : ''}${rpt.totalRuleASurplusKg.toLocaleString('en-SA')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono)">kg · Coastal Gain (RH &gt; 70%)</div>
      </div>

      <div style="background:var(--bg-2);border:1px solid rgba(239,68,68,0.25);border-radius:var(--radius);padding:14px">
        <div style="font-size:9px;color:${ruleBColor};text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Rule B Deficit</div>
        <div style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:${ruleBColor}">${rpt.totalRuleBDeficitKg < 0 ? '' : '+'}${rpt.totalRuleBDeficitKg.toLocaleString('en-SA')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono)">kg · Arid Loss (RH &lt; 20%)</div>
      </div>

      <div style="background:var(--bg-2);border:1px solid rgba(245,158,11,0.30);border-radius:var(--radius);padding:14px">
        <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Net Sponge Adjustment</div>
        <div style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:${netColor}">${netSign}${rpt.netSpongeAdjustmentKg.toLocaleString('en-SA')}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono)">kg · Rule A + Rule B net</div>
      </div>

      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px">
        <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Actual vs. Theoretical</div>
        <div style="font-family:var(--font-mono);font-size:15px;font-weight:700;color:var(--text-sec)">${rpt.totalActualRoastedKg.toLocaleString('en-SA')} <span style="font-weight:400;font-size:11px;color:var(--text-muted)">actual</span></div>
        <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">vs ${rpt.totalBaselineRoastedKg.toLocaleString('en-SA')} theoretical kg</div>
      </div>

    </div>

    <!-- Per-lot shrinkage preview table -->
    <div style="overflow-x:auto;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:8px 10px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;font-weight:600;letter-spacing:.4px;white-space:nowrap">LOT ID</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;font-weight:600;letter-spacing:.4px">ORIGIN</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;font-weight:600;letter-spacing:.4px">BRANCH</th>
            <th style="text-align:right;padding:8px 10px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;font-weight:600;white-space:nowrap">GREEN (kg)</th>
            <th style="text-align:right;padding:8px 10px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;font-weight:600;white-space:nowrap">THEORETICAL (kg)</th>
            <th style="text-align:right;padding:8px 10px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;font-weight:600;white-space:nowrap">ACTUAL (kg)</th>
            <th style="text-align:right;padding:8px 10px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;font-weight:600;white-space:nowrap">SHRINKAGE (kg)</th>
            <th style="text-align:right;padding:8px 10px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;font-weight:600;white-space:nowrap">SPONGE Δ (kg)</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;font-weight:600">RULE</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text-muted);font-family:var(--font-mono);font-size:10px;font-weight:600">STATUS</th>
          </tr>
        </thead>
        <tbody>
          ${rpt.rows.map(r => {
            const adjColor  = r.spongeAdjKg > 0 ? 'var(--green)' : r.spongeAdjKg < 0 ? 'var(--red)' : 'var(--text-muted)'
            const adjSign   = r.spongeAdjKg >= 0 ? '+' : ''
            const ruleShort = r.spongeRule === 'MOISTURE_ABSORPTION' ? '★ Rule A — Coastal' :
                              r.spongeRule === 'EVAPORATION_LOSS'    ? '★ Rule B — Arid'    : 'Baseline'
            const ruleColor = r.spongeRule === 'MOISTURE_ABSORPTION' ? 'var(--green)' :
                              r.spongeRule === 'EVAPORATION_LOSS'    ? 'var(--red)'   : 'var(--text-muted)'
            const statusColor = r.status === 'RECALLED' ? 'var(--red)' : r.status === 'OPTIMAL' ? 'var(--green)' : 'var(--blue)'
            return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
            <td style="padding:8px 10px;font-family:var(--font-mono);color:var(--amber);font-weight:700">${r.lotId}</td>
            <td style="padding:8px 10px;font-size:12px">${r.origin}</td>
            <td style="padding:8px 10px;font-size:11px;color:var(--text-sec)">${r.branch} <span style="font-size:9px;color:var(--text-muted)">${r.branchHumidity}% RH</span></td>
            <td style="padding:8px 10px;text-align:right;font-family:var(--font-mono);color:var(--text-pri)">${r.purchasedGreenKg}</td>
            <td style="padding:8px 10px;text-align:right;font-family:var(--font-mono);color:var(--text-sec)">${r.baselineRoastedKg}</td>
            <td style="padding:8px 10px;text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--text-pri)">${r.actualRoastedKg}</td>
            <td style="padding:8px 10px;text-align:right;font-family:var(--font-mono);color:var(--red)">−${r.baselineShrinkageKg}</td>
            <td style="padding:8px 10px;text-align:right;font-family:var(--font-mono);font-weight:700;color:${adjColor}">${adjSign}${r.spongeAdjKg}</td>
            <td style="padding:8px 10px;font-family:var(--font-mono);font-size:10px;color:${ruleColor}">${ruleShort}</td>
            <td style="padding:8px 10px;font-family:var(--font-mono);font-size:10px;color:${statusColor}">${r.status}</td>
          </tr>`
          }).join('')}
          <!-- Totals row -->
          <tr style="border-top:2px solid rgba(245,158,11,0.4);background:rgba(245,158,11,0.04)">
            <td colspan="3" style="padding:10px;font-family:var(--font-mono);font-size:11px;color:var(--amber);font-weight:700">PORTFOLIO TOTALS</td>
            <td style="padding:10px;text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--text-pri)">${rpt.totalPurchasedGreenKg}</td>
            <td style="padding:10px;text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--text-sec)">${rpt.totalBaselineRoastedKg}</td>
            <td style="padding:10px;text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--text-pri)">${rpt.totalActualRoastedKg}</td>
            <td style="padding:10px;text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--red)">−${rpt.totalBaselineShrinkageKg}</td>
            <td style="padding:10px;text-align:right;font-family:var(--font-mono);font-weight:700;color:${netColor}">${netSign}${rpt.netSpongeAdjustmentKg}</td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Download button — ZATCA Bulk Shrinkage Report prominent per spec -->
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:4px">
      <a href="/admin/finance/zatca-export"
         download="qabban-zatca-bulk-shrinkage-${rpt.reportDate}.csv"
         style="display:inline-flex;align-items:center;gap:10px;padding:13px 28px;background:linear-gradient(135deg,rgba(245,158,11,0.20),rgba(245,158,11,0.08));border:2px solid rgba(245,158,11,0.60);border-radius:var(--radius);font-family:var(--font-mono);font-size:13px;font-weight:800;color:var(--amber);text-decoration:none;letter-spacing:.7px;box-shadow:0 0 18px rgba(245,158,11,0.12);transition:all .15s"
         onmouseover="this.style.boxShadow='0 0 32px rgba(245,158,11,0.30)';this.style.borderColor='rgba(245,158,11,0.85)'"
         onmouseout="this.style.boxShadow='0 0 18px rgba(245,158,11,0.12)';this.style.borderColor='rgba(245,158,11,0.60)'">
        <i class="fa fa-file-arrow-down" style="font-size:16px"></i>
        ZATCA BULK SHRINKAGE REPORT
      </a>
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);line-height:1.6">
        CSV · UTF-8 · ${rpt.totalLotsReported} lots<br>
        Rule A/B evaporation reconciliation · Gold-tier pricing · ${rpt.reportDate}
      </div>
    </div>

    <!-- Audit notes -->
    <div style="margin-top:18px;padding:12px 16px;background:rgba(245,158,11,0.05);border:1px dashed rgba(245,158,11,0.25);border-radius:var(--radius);font-size:10px;color:var(--text-muted);font-family:var(--font-mono);line-height:1.7">
      <strong style="color:var(--amber)">Auditor Reference:</strong><br>
      <strong>Baseline Shrinkage</strong> — Standard 18% weight loss (yield coeff. 0.82) per ZATCA commodity regulations.<br>
      <strong>Rule A — Coastal Surplus</strong> — Branches with RH &gt; 70%: yield coeff. rises to 0.825 (+0.5%). Moisture absorption documented.<br>
      <strong>Rule B — Arid Deficit</strong> — Branches with RH &lt; 20%: yield coeff. drops to 0.817 (−0.3%). Evaporation loss documented.<br>
      Branch humidity readings sourced in real-time from Qabban OS Sponge Effect Engine. All weights in kg (SAR prices at Gold-tier margin).
    </div>
  </div>`
  })()}

  <!-- ══ COFFEE MILES — LOYALTY ENGINE ══ -->
  <div class="card" style="margin-bottom:28px;border-color:rgba(245,158,11,0.35)">
    <div class="card-title" style="margin-bottom:4px">
      <i class="fa fa-mug-hot" style="color:var(--amber)"></i>
      <span>Coffee Miles — Loyalty Tier Engine</span>
      <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(245,158,11,0.10);color:var(--amber);border:1px solid rgba(245,158,11,0.25);margin-left:8px">HYBRID PRICING</span>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:20px;font-family:var(--font-mono)">
      Lifetime KG purchased → auto-assigns Bronze / Silver / Gold tier · Stacks with Bulk Discount (Orders &gt; ${BULK_ORDER_THRESHOLD_BAGS} bags = +${BULK_DISCOUNT_PCT}%)
    </div>

    <!-- Tier Reference Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;margin-bottom:24px">
      ${COFFEE_MILES_TIERS.map(t => `
      <div style="background:var(--bg-2);border:1px solid ${t.color}44;border-radius:var(--radius);padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-size:20px">${t.icon}</span>
          <span style="font-family:var(--font-mono);font-size:12px;font-weight:800;color:${t.color}">${t.tier.toUpperCase()}</span>
        </div>
        <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:8px">
          ${t.minKg.toLocaleString()} – ${t.maxKg ? t.maxKg.toLocaleString() : '∞'} kg lifetime
        </div>
        <div style="font-size:22px;font-weight:800;color:${t.color};font-family:var(--font-mono)">${t.baseDiscountPct}%</div>
        <div style="font-size:10px;color:var(--text-muted)">base discount</div>
        <div style="margin-top:8px;font-size:10px;color:var(--text-muted);font-family:var(--font-mono);padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:4px">
          + ${BULK_DISCOUNT_PCT}% bulk if &gt;${BULK_ORDER_THRESHOLD_BAGS} bags<br>
          = <strong style="color:${t.color}">${t.baseDiscountPct + BULK_DISCOUNT_PCT}% max</strong> stacked
        </div>
      </div>`).join('')}
    </div>

    <!-- Buyer Loyalty Ledger -->
    <div style="font-size:11px;font-weight:700;color:var(--text-pri);margin-bottom:12px;font-family:var(--font-mono);letter-spacing:.5px">
      <i class="fa fa-users" style="color:var(--amber)"></i> BUYER LOYALTY LEDGER
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr style="border-bottom:1px solid var(--bg-3)">
            <th style="text-align:left;padding:8px 10px;font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:.5px">BUYER</th>
            <th style="text-align:right;padding:8px 10px;font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">LIFETIME KG</th>
            <th style="text-align:center;padding:8px 10px;font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">TIER</th>
            <th style="text-align:right;padding:8px 10px;font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">BASE DISC.</th>
            <th style="text-align:right;padding:8px 10px;font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">MAX STACKED</th>
            <th style="text-align:left;padding:8px 10px;font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">PROGRESS</th>
            <th style="text-align:center;padding:8px 10px;font-family:var(--font-mono);font-size:9px;color:#25d366">TIER WATCHER</th>
          </tr>
        </thead>
        <tbody>
          ${cafeClients.map(cl => {
            const cm    = cl.coffeeMilesTier ?? getCoffeeMilesTier(cl.lifetimeKgPurchased ?? 0)
            const base  = getTierBaseDiscount(cm)
            const prog  = kgToNextTier(cl.lifetimeKgPurchased ?? 0)
            const col   = cm === 'Gold' ? '#f59e0b' : cm === 'Silver' ? '#94a3b8' : '#cd7f32'
            const icon  = cm === 'Gold' ? '🥇' : cm === 'Silver' ? '🥈' : '🥉'
            const nudgeStatus = getTierNudgeStatus(cl.lifetimeKgPurchased ?? 0, cl.name)
            const dispatchedKg = beanRequests.filter(r => r.cafeId === cl.id && r.status === 'DISPATCHED').reduce((s,r) => s+r.quantityKg, 0)
            return `
          <tr style="border-bottom:1px solid var(--bg-3);${nudgeStatus.isNudge ? 'background:rgba(245,158,11,0.04);' : ''}">
            <td style="padding:10px;font-weight:600">${cl.name}
              ${nudgeStatus.isNudge ? `<span style="font-family:var(--font-mono);font-size:8px;background:rgba(245,158,11,0.18);color:var(--amber);border:1px solid rgba(245,158,11,0.4);border-radius:3px;padding:1px 5px;margin-left:6px;letter-spacing:.3px">⚡ NUDGE</span>` : ''}
              <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);margin-left:6px">${cl.id}</span>
            </td>
            <td style="padding:10px;text-align:right;font-family:var(--font-mono);font-weight:700">${(cl.lifetimeKgPurchased ?? 0).toLocaleString()} kg</td>
            <td style="padding:10px;text-align:center">
              <span style="font-size:14px">${icon}</span>
              <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:${col};margin-left:4px">${cm}</span>
            </td>
            <td style="padding:10px;text-align:right;font-family:var(--font-mono);font-weight:700;color:${col}">${base}%</td>
            <td style="padding:10px;text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--green)">${base + BULK_DISCOUNT_PCT}%</td>
            <td style="padding:10px;min-width:180px">
              ${prog.nextTier ? `
              <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:4px">
                <span>${prog.kgNeeded.toLocaleString()} kg to <strong style="color:${prog.nextTier==='Gold'?'#f59e0b':'#94a3b8'}">${prog.nextTier}</strong></span>
                <span>${prog.progressPct}%</span>
              </div>
              <div style="height:6px;background:var(--bg-3);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${prog.progressPct}%;background:${nudgeStatus.isNudge ? 'linear-gradient(90deg,var(--amber),#fbbf24)' : col};border-radius:3px;transition:width .3s;${nudgeStatus.isNudge ? 'box-shadow:0 0 6px rgba(245,158,11,0.5)' : ''}"></div>
              </div>
              ` : `<span style="font-size:10px;font-family:var(--font-mono);color:#f59e0b">🥇 MAX TIER</span>`}
            </td>
            <td style="padding:10px;text-align:center">
              ${nudgeStatus.isNudge ? `
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
                <span style="font-size:9px;font-family:var(--font-mono);color:var(--amber);font-weight:700">${nudgeStatus.kgNeeded} kg left</span>
                <a href="mailto:?subject=Tier+Upgrade+Alert&body=${encodeURIComponent(nudgeStatus.whatsappCopy)}"
                   style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:rgba(37,211,102,0.15);border:1px solid rgba(37,211,102,0.4);border-radius:3px;color:#25d366;font-size:9px;font-family:var(--font-mono);text-decoration:none;font-weight:700">
                  <i class="fa fa-brands fa-whatsapp"></i> NUDGE
                </a>
              </div>` : `<span style="font-size:9px;color:var(--text-muted);font-family:var(--font-mono)">—</span>`}
            </td>
          </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Tier Watcher Legend + Stacking formula -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;flex-wrap:wrap">
      <div style="padding:12px 16px;background:rgba(37,211,102,0.04);border:1px dashed rgba(37,211,102,0.25);border-radius:var(--radius);font-size:10px;color:var(--text-muted);font-family:var(--font-mono);line-height:1.8">
        <strong style="color:#25d366">⚡ Tier Watcher Logic:</strong><br>
        Buyers within <strong style="color:var(--amber)">${TIER_NUDGE_THRESHOLD} kg</strong> of the next tier trigger a <em>Milestone Nudge</em>.<br>
        A mock WhatsApp notification is dispatched via the <code>/api/cafe/tier-nudge</code> endpoint.<br>
        Badge: <span style="background:rgba(245,158,11,0.18);color:var(--amber);border:1px solid rgba(245,158,11,0.4);border-radius:3px;padding:1px 5px;font-size:8px">⚡ NUDGE</span> appears on row and buyer portal.
      </div>
      <div style="padding:12px 16px;background:rgba(245,158,11,0.04);border:1px dashed rgba(245,158,11,0.25);border-radius:var(--radius);font-size:10px;color:var(--text-muted);font-family:var(--font-mono);line-height:1.8">
        <strong style="color:var(--amber)">Hybrid Pricing Formula:</strong><br>
        <strong>Total Discount %</strong> = Tier Base % + Bulk Quantity %<br>
        <strong>Bulk Trigger</strong>: &gt; ${BULK_ORDER_THRESHOLD_BAGS} bags (${BAG_SIZE_KG} kg/bag) → +${BULK_DISCOUNT_PCT}%<br>
        Example: <span style="color:var(--amber)">Gold + Bulk = 5% + 10% = 15% total</span>
      </div>
    </div>
  </div>

  <!-- ══ TIER WATCHER DASHBOARD ══ -->
  <div class="card" style="margin-bottom:28px;border-color:rgba(37,211,102,0.25)">
    <div class="card-title" style="margin-bottom:4px">
      <i class="fa fa-bell" style="color:#25d366"></i>
      <span>Tier Watcher — Milestone Nudge Dashboard</span>
      <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(37,211,102,0.10);color:#25d366;border:1px solid rgba(37,211,102,0.25);margin-left:8px">⚡ ACTIVE</span>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:18px;font-family:var(--font-mono)">
      Buyers within <strong style="color:var(--amber)">${TIER_NUDGE_THRESHOLD} kg</strong> of the next tier — auto-detected · mock WhatsApp nudge dispatched via <code>/api/cafe/tier-nudge</code>
    </div>

    ${(() => {
      const nudgeBuyers = cafeClients.filter(cl => {
        const n = getTierNudgeStatus(cl.lifetimeKgPurchased ?? 0, cl.name)
        return n.isNudge
      })
      if (nudgeBuyers.length === 0) return `
      <div style="padding:24px;text-align:center;color:var(--text-muted);font-family:var(--font-mono);font-size:11px;border:1px dashed rgba(255,255,255,0.1);border-radius:var(--radius)">
        <i class="fa fa-check-circle" style="color:#25d366;font-size:18px;margin-bottom:8px;display:block"></i>
        No buyers currently in the nudge zone (within ${TIER_NUDGE_THRESHOLD} kg of next tier)
      </div>`

      return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
        ${nudgeBuyers.map(cl => {
          const nudge = getTierNudgeStatus(cl.lifetimeKgPurchased ?? 0, cl.name)
          const nextCol = nudge.nextTier === 'Gold' ? '#f59e0b' : '#94a3b8'
          const nextIcon = nudge.nextTier === 'Gold' ? '🥇' : '🥈'
          const curCol = nudge.currentTier === 'Gold' ? '#f59e0b' : nudge.currentTier === 'Silver' ? '#94a3b8' : '#cd7f32'
          const curIcon = nudge.currentTier === 'Gold' ? '🥇' : nudge.currentTier === 'Silver' ? '🥈' : '🥉'
          return `
          <div style="background:linear-gradient(135deg,rgba(37,211,102,0.06),rgba(245,158,11,0.04));border:1px solid rgba(245,158,11,0.35);border-radius:10px;padding:16px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <div style="width:32px;height:32px;border-radius:50%;background:rgba(37,211,102,0.15);border:1.5px solid rgba(37,211,102,0.5);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">⚡</div>
              <div>
                <div style="font-weight:700;color:var(--text-pri);font-size:12px">${cl.name}</div>
                <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">${cl.id} · ${(cl.lifetimeKgPurchased ?? 0).toLocaleString()} kg lifetime</div>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="font-size:16px">${curIcon}</span>
              <span style="font-family:var(--font-mono);font-size:10px;color:${curCol};font-weight:700">${nudge.currentTier}</span>
              <span style="color:var(--text-muted);font-size:12px">→</span>
              <span style="font-size:16px">${nextIcon}</span>
              <span style="font-family:var(--font-mono);font-size:10px;color:${nextCol};font-weight:700">${nudge.nextTier}</span>
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--amber);margin-left:auto;font-weight:700">${nudge.kgNeeded} kg left</span>
            </div>

            <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;margin-bottom:10px">
              <div style="height:100%;width:${nudge.progressPct}%;background:linear-gradient(90deg,var(--amber),#fbbf24);border-radius:3px;box-shadow:0 0 6px rgba(245,158,11,0.5)"></div>
            </div>

            <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:10px;line-height:1.4">${nudge.nudgeMessage}</div>

            <button onclick="adminSendNudge('${cl.id}', '${cl.name.replace(/'/g, "\\'")}')" style="width:100%;padding:7px;background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.4);border-radius:6px;color:#25d366;font-size:10px;font-family:var(--font-mono);cursor:pointer;font-weight:700;letter-spacing:.3px;display:flex;align-items:center;justify-content:center;gap:6px">
              <i class="fa fa-brands fa-whatsapp"></i> SEND WHATSAPP NUDGE
            </button>
          </div>`
        }).join('')}
      </div>`
    })()}

    <script>
    function adminSendNudge(cafeId, name) {
      fetch('/api/cafe/tier-nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafeId: cafeId })
      }).then(function(r){ return r.json(); }).then(function(d) {
        if (d.ok) {
          var modal = document.getElementById('admin-wa-modal');
          var msgEl  = document.getElementById('admin-wa-msg');
          if (modal && msgEl) {
            msgEl.textContent = d.whatsappCopy;
            modal.style.display = 'flex';
          }
        }
      }).catch(function(){});
    }
    function closeAdminWaModal() {
      var m = document.getElementById('admin-wa-modal');
      if (m) m.style.display = 'none';
    }
    </script>
  </div>

  <!-- ── Admin Mock WhatsApp Preview Modal ── -->
  <div id="admin-wa-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;align-items:center;justify-content:center">
    <div style="width:min(420px,94vw);background:#111b21;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.7)">
      <div style="background:#1f2c34;padding:12px 16px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;font-size:18px">☕</div>
        <div>
          <div style="font-weight:700;color:#e9edef;font-size:13px">Qabban Coffee Miles</div>
          <div style="font-size:10px;color:#8696a0">Admin — Tier Watcher Nudge</div>
        </div>
        <button onclick="closeAdminWaModal()" style="margin-left:auto;background:transparent;border:none;color:#8696a0;font-size:18px;cursor:pointer;line-height:1">✕</button>
      </div>
      <div style="padding:20px 16px;background:#0b141a;min-height:160px">
        <div style="display:flex;justify-content:flex-end">
          <div style="max-width:82%;background:#005c4b;border-radius:12px 2px 12px 12px;padding:10px 14px">
            <pre id="admin-wa-msg" style="font-size:12px;color:#e9edef;font-family:'Segoe UI',sans-serif;white-space:pre-wrap;word-break:break-word;margin:0;line-height:1.55"></pre>
            <div style="text-align:right;font-size:10px;color:#8696a0;margin-top:4px">✓✓ Delivered</div>
          </div>
        </div>
      </div>
      <div style="padding:10px 16px;background:#1f2c34;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:10px;color:#8696a0;font-family:var(--font-mono)">Mock — WhatsApp Business API</div>
        <button onclick="closeAdminWaModal()" style="padding:6px 16px;background:rgba(37,211,102,0.2);border:1px solid rgba(37,211,102,0.5);border-radius:6px;color:#25d366;font-size:11px;font-family:var(--font-mono);cursor:pointer;font-weight:700">DONE</button>
      </div>
    </div>
  </div>

  <!-- ══ GLOBAL EXCHANGE — CURRENCY SETTINGS ══ -->
  <div class="card" style="margin-bottom:28px">
    <div class="card-title" style="margin-bottom:4px">
      <i class="fa fa-coins" style="color:#4ade80"></i>
      <span>Global Exchange — Currency Settings</span>
      <span style="font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(74,222,128,0.10);color:#4ade80;border:1px solid rgba(74,222,128,0.25);margin-left:8px">XE CURRENCY API</span>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:18px;font-family:var(--font-mono)">
      Live USD/EUR → SAR rates with volatility buffer · Rates cached and refreshed every 30 min via XE Currency Data API
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:16px">

      <!-- USD Rate -->
      <div style="background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.2);border-radius:var(--radius);padding:14px">
        <div style="font-size:10px;color:#4ade80;font-family:var(--font-mono);margin-bottom:6px">1 USD →</div>
        <div style="font-size:22px;font-weight:700;color:#f8fafc" id="exr-usd-display">${lastKnownUsdToSar.toFixed(4)}</div>
        <div style="font-size:10px;color:var(--text-muted)">SAR (spot)</div>
      </div>

      <!-- EUR Rate -->
      <div style="background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.2);border-radius:var(--radius);padding:14px">
        <div style="font-size:10px;color:#4ade80;font-family:var(--font-mono);margin-bottom:6px">1 EUR →</div>
        <div style="font-size:22px;font-weight:700;color:#f8fafc" id="exr-eur-display">${lastKnownEurToSar.toFixed(4)}</div>
        <div style="font-size:10px;color:var(--text-muted)">SAR (spot)</div>
      </div>

      <!-- Buffer Setting -->
      <div style="background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.2);border-radius:var(--radius);padding:14px">
        <div style="font-size:10px;color:#4ade80;font-family:var(--font-mono);margin-bottom:6px">Exchange Rate Buffer</div>
        <div style="display:flex;align-items:center;gap:6px">
          <input type="number" id="exrBufferInput" min="0" max="10" step="0.1"
            value="${exchangeRateBuffer}"
            style="width:72px;background:rgba(255,255,255,0.06);border:1px solid rgba(74,222,128,0.35);border-radius:4px;padding:6px 8px;color:#f8fafc;font-size:15px;font-family:var(--font-mono)"/>
          <span style="color:var(--text-muted);font-size:13px">%</span>
          <span style="font-size:10px;color:var(--text-muted)" id="exr-cur-buf">${exchangeRateBuffer}% saved</span>
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:6px">
          Effective rate: <span id="exr-effective" style="color:#4ade80">${(lastKnownUsdToSar*(1+exchangeRateBuffer/100)).toFixed(4)}</span> SAR/USD
        </div>
      </div>

      <!-- Last Updated -->
      <div style="background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.2);border-radius:var(--radius);padding:14px">
        <div style="font-size:10px;color:#4ade80;font-family:var(--font-mono);margin-bottom:6px">Last Rate Refresh</div>
        <div style="font-size:12px;color:#f8fafc;font-family:var(--font-mono)" id="exr-last-updated">${exchangeRateUpdatedAt || 'Using fallback rates'}</div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="refreshExchangeRates()"
            style="padding:5px 12px;background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.4);border-radius:4px;color:#4ade80;font-size:11px;cursor:pointer;font-family:var(--font-mono)">
            ↻ REFRESH RATES
          </button>
          <button onclick="saveExchangeBuffer()"
            style="padding:5px 12px;background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.4);border-radius:4px;color:#4ade80;font-size:11px;cursor:pointer;font-family:var(--font-mono)">
            SAVE BUFFER
          </button>
        </div>
      </div>
    </div>

    <div id="exrSavedMsg" style="display:none;align-items:center;gap:6px;padding:6px 12px;background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.35);border-radius:4px;font-size:11px;color:#4ade80;font-family:var(--font-mono)">
      <i class="fa fa-check"></i> Exchange rate buffer saved
    </div>

    <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:12px;padding:10px;background:rgba(74,222,128,0.04);border:1px dashed rgba(74,222,128,0.2);border-radius:4px">
      <strong style="color:#4ade80">Buffer Logic:</strong>
      Effective Rate = Spot Rate × (1 + Buffer %) &nbsp;·&nbsp;
      Applied to all USD/EUR → SAR conversions in the Buyer Portal Landed Price calculator.
      Recommend: 2% buffer for normal volatility · 5% for geopolitical events.
    </div>
  </div>

  <script>
  /* ── QFI REACTIVE ENGINE (TIER-BASED) ───────────────────────────────────────
     Recalculates wholesale prices per tier in real-time as the admin types.
     Formula: Wholesale Price = (costPerKg / 0.82) / (1 - tierMargin/100)
  ─────────────────────────────────────────────────────────────────────────── */

  var BASELINE = ${SPONGE_BASELINE_COEFFICIENT};

  /* Per-lot raw data — costPerKg is the only immutable input for WP calc */
  var LOT_DATA = ${JSON.stringify(portfolio.byLot.map(fin => ({
    id:              fin.lotId,
    costPerKg:       fin.costPerKg,
    liveRoasted:     fin.liveRoastedKg,
    spongeKgDelta:   fin.spongeKgDelta,
    trueRoastedCost: fin.trueRoastedCost,
  })))};

  /* Current saved tier margins — kept in sync with server */
  var _tierMargins = { Bronze: ${tierMargins.Bronze}, Silver: ${tierMargins.Silver}, Gold: ${tierMargins.Gold} };

  /* Helper: compute WP for a cost + margin */
  function _wp(cost, marginPct) {
    var m = Math.max(0.01, Math.min(0.99, marginPct / 100));
    return Math.round((cost / BASELINE) / (1 - m) * 100) / 100;
  }

  /* ── Core recalculation — updates all 3 tier columns + summary cards ── */
  function qfiCalc(bronzeM, silverM, goldM, isPreview) {
    var totValueBronze = 0; var totProfitBronze = 0;
    var totValueSilver = 0; var totProfitSilver = 0;
    var totValueGold   = 0; var totProfitGold   = 0;
    var totEnvPnL      = 0;

    LOT_DATA.forEach(function(lot) {
      if (!lot.costPerKg || lot.costPerKg <= 0) return;

      var wpB = _wp(lot.costPerKg, bronzeM);
      var wpS = _wp(lot.costPerKg, silverM);
      var wpG = _wp(lot.costPerKg, goldM);

      var ivB = wpB * lot.liveRoasted;  var ppB = (wpB - lot.trueRoastedCost) * lot.liveRoasted;
      var ivS = wpS * lot.liveRoasted;  var ppS = (wpS - lot.trueRoastedCost) * lot.liveRoasted;
      var ivG = wpG * lot.liveRoasted;  var ppG = (wpG - lot.trueRoastedCost) * lot.liveRoasted;
      var ep  = lot.spongeKgDelta * wpG;

      totValueBronze += ivB;  totProfitBronze += ppB;
      totValueSilver += ivS;  totProfitSilver += ppS;
      totValueGold   += ivG;  totProfitGold   += ppG;
      totEnvPnL      += ep;

      /* Bronze column */
      var wbEl = document.getElementById('qfi-wp-bronze-' + lot.id);
      if (wbEl) wbEl.innerHTML =
        '<span style="color:#cd7f32;font-weight:700">' + wpB.toFixed(2) + '</span>' +
        ' <span style="font-size:10px;color:var(--text-muted)">SAR/kg</span>';

      /* Silver column */
      var wsEl = document.getElementById('qfi-wp-silver-' + lot.id);
      if (wsEl) wsEl.innerHTML =
        '<span style="color:#94a3b8;font-weight:700">' + wpS.toFixed(2) + '</span>' +
        ' <span style="font-size:10px;color:var(--text-muted)">SAR/kg</span>';

      /* Gold column */
      var wgEl = document.getElementById('qfi-wp-gold-' + lot.id);
      if (wgEl) wgEl.innerHTML =
        '<span style="color:#f59e0b;font-weight:700">' + wpG.toFixed(2) + '</span>' +
        ' <span style="font-size:10px;color:var(--text-muted)">SAR/kg</span>';

      /* Inventory Value (Gold reference) */
      var ivEl = document.getElementById('qfi-iv-' + lot.id);
      if (ivEl) ivEl.innerHTML =
        '<span style="color:var(--amber)">' + Math.round(ivG).toLocaleString('en-SA') + '</span>' +
        ' <span style="font-size:10px;color:var(--text-muted)">SAR</span>';

      /* Projected Profit (Gold reference) */
      var ppEl = document.getElementById('qfi-pp-' + lot.id);
      if (ppEl) {
        ppEl.style.color = ppG >= 0 ? 'var(--green)' : 'var(--red)';
        ppEl.textContent = (ppG >= 0 ? '+' : '') + Math.round(ppG).toLocaleString('en-SA') + ' SAR';
      }

      /* Environmental P&L */
      var epEl = document.getElementById('qfi-ep-' + lot.id);
      if (epEl) {
        epEl.style.color = ep > 0 ? 'var(--green)' : ep < 0 ? 'var(--red)' : 'var(--text-muted)';
        epEl.textContent = (ep >= 0 ? '+' : '') + ep.toFixed(2) + ' SAR';
      }
    });

    /* Summary cards — per tier */
    /* Bronze */
    var tvBEl = document.getElementById('qfi-total-value-bronze');
    var tpBEl = document.getElementById('qfi-total-profit-bronze');
    if (tvBEl) tvBEl.textContent = Math.round(totValueBronze).toLocaleString('en-SA');
    if (tpBEl) {
      tpBEl.style.color = totProfitBronze >= 0 ? 'var(--green)' : 'var(--red)';
      tpBEl.textContent = (totProfitBronze >= 0 ? '+' : '') + Math.round(totProfitBronze).toLocaleString('en-SA') + ' profit';
    }
    /* Silver */
    var tvSEl = document.getElementById('qfi-total-value-silver');
    var tpSEl = document.getElementById('qfi-total-profit-silver');
    if (tvSEl) tvSEl.textContent = Math.round(totValueSilver).toLocaleString('en-SA');
    if (tpSEl) {
      tpSEl.style.color = totProfitSilver >= 0 ? 'var(--green)' : 'var(--red)';
      tpSEl.textContent = (totProfitSilver >= 0 ? '+' : '') + Math.round(totProfitSilver).toLocaleString('en-SA') + ' profit';
    }
    /* Gold tier card */
    var tvPEl = document.getElementById('qfi-total-value-gold');
    var tpPEl = document.getElementById('qfi-total-profit-gold');
    if (tvPEl) tvPEl.textContent = Math.round(totValueGold).toLocaleString('en-SA');
    if (tpPEl) {
      tpPEl.style.color = totProfitGold >= 0 ? 'var(--green)' : 'var(--red)';
      tpPEl.textContent = (totProfitGold >= 0 ? '+' : '') + Math.round(totProfitGold).toLocaleString('en-SA') + ' profit';
    }
    /* Environmental P&L (always Gold-tier reference) */
    var enEl = document.getElementById('qfi-env-pnl');
    if (enEl) {
      enEl.style.color = totEnvPnL > 0 ? 'var(--green)' : totEnvPnL < 0 ? 'var(--red)' : 'var(--text-muted)';
      enEl.textContent = (totEnvPnL >= 0 ? '+' : '') + totEnvPnL.toFixed(2);
    }

    /* Update tier card preview hints */
    var bEl = document.getElementById('sim-bronze-wp');
    var sEl = document.getElementById('sim-silver-wp');
    var gEl = document.getElementById('sim-gold-wp');
    if (sEl && LOT_DATA.length) {
      var sample = LOT_DATA.find(function(l){ return l.costPerKg > 0; });
      if (sample) {
        if (bEl) bEl.textContent = 'e.g. ' + _wp(sample.costPerKg, bronzeM).toFixed(2) + ' SAR/kg (' + sample.id + ')';
        sEl.textContent = 'e.g. ' + _wp(sample.costPerKg, silverM).toFixed(2) + ' SAR/kg (' + sample.id + ')';
        gEl.textContent = 'e.g. ' + _wp(sample.costPerKg, goldM).toFixed(2)   + ' SAR/kg (' + sample.id + ')';
      }
    }

    /* Preview banner */
    var banner = document.getElementById('qfi-preview-banner');
    if (banner) banner.style.display = isPreview ? 'flex' : 'none';
  }

  /* ── Wire up live-preview on each tier input ── */
  function _getInputMargin(id, fallback) {
    var v = parseFloat(document.getElementById(id).value);
    return (!isNaN(v) && v >= 1 && v <= 99) ? v : fallback;
  }
  function _onTierInput() {
    qfiCalc(
      _getInputMargin('marginBronze', _tierMargins.Bronze),
      _getInputMargin('marginSilver', _tierMargins.Silver),
      _getInputMargin('marginGold',   _tierMargins.Gold),
      true
    );
  }
  document.getElementById('marginBronze').addEventListener('input', _onTierInput);
  document.getElementById('marginSilver').addEventListener('input', _onTierInput);
  document.getElementById('marginGold').addEventListener('input',   _onTierInput);

  /* ── Reset preview to saved values ── */
  function resetTierPreview() {
    document.getElementById('marginBronze').value = _tierMargins.Bronze;
    document.getElementById('marginSilver').value = _tierMargins.Silver;
    document.getElementById('marginGold').value   = _tierMargins.Gold;
    qfiCalc(_tierMargins.Bronze, _tierMargins.Silver, _tierMargins.Gold, false);
  }

  /* ── BroadcastChannel ── */
  var _qfiChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('qabban_margin') : null;

  /* ── SET ALL: persist tier margins to server + broadcast ── */
  function saveTierMargins() {
    var b = _getInputMargin('marginBronze', _tierMargins.Bronze);
    var s = _getInputMargin('marginSilver', _tierMargins.Silver);
    var g = _getInputMargin('marginGold',   _tierMargins.Gold);

    fetch('/api/finance/set-tier-margins', {
      method: 'POST',

      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Bronze: b, Silver: s, Gold: g })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.ok) {
        _tierMargins = d.tierMargins;
        document.getElementById('cur-bronze').textContent = d.tierMargins.Bronze + '% saved';
        document.getElementById('cur-silver').textContent = d.tierMargins.Silver + '% saved';
        document.getElementById('cur-gold').textContent   = d.tierMargins.Gold   + '% saved';

        /* Re-run with confirmed server values */
        qfiCalc(d.tierMargins.Bronze, d.tierMargins.Silver, d.tierMargins.Gold, false);

        /* Broadcast to all open tabs (Overview + Cafe portals) */
        if (_qfiChannel) {
          _qfiChannel.postMessage({ type: 'tier_margins_changed', tierMargins: d.tierMargins });
        }

        var msg = document.getElementById('tierSavedMsg');
        msg.style.display = 'inline-flex';
        setTimeout(function(){ msg.style.display = 'none'; }, 3000);
      }
    });
  }

  /* ── Exchange Rate Buffer (Finance Settings) ── */
  function saveExchangeBuffer() {
    var v = parseFloat(document.getElementById('exrBufferInput').value);
    if (isNaN(v) || v < 0 || v > 10) return;
    fetch('/api/finance/set-exchange-buffer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buffer: v })
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.ok) {
        document.getElementById('exr-cur-buf').textContent = d.buffer + '% saved';
        document.getElementById('exr-effective').textContent = (d.usdRate * (1 + d.buffer/100)).toFixed(4);
        var msg = document.getElementById('exrSavedMsg');
        msg.style.display = 'inline-flex';
        setTimeout(function(){ msg.style.display = 'none'; }, 3000);
      }
    });
  }

  function refreshExchangeRates() {
    fetch('/api/finance/exchange-rates/refresh', { method: 'POST' })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.ok) {
        document.getElementById('exr-usd-display').textContent = d.usd.toFixed(4);
        document.getElementById('exr-eur-display').textContent = d.eur.toFixed(4);
        document.getElementById('exr-last-updated').textContent = d.updatedAt;
        var buf = parseFloat(document.getElementById('exrBufferInput').value) || ${exchangeRateBuffer};
        document.getElementById('exr-effective').textContent = (d.usd * (1 + buf/100)).toFixed(4);
      }
    });
  }
  </script>`

  return c.html(adminLayout('Financial Intelligence', 'finance', content, pendingCount))
})

// ── POST /api/finance/set-tier-margins ──────────────────────────
app.post('/api/finance/set-tier-margins', async (c) => {
  try {
    const body = await c.req.json()
    const updates: Record<string, number> = {}
    for (const tier of ['Bronze', 'Silver', 'Gold'] as const) {
      const val = parseFloat(body[tier])
      if (!isNaN(val) && val >= 1 && val <= 99) updates[tier] = val
    }
    setTierMargins(updates)
    return c.json({ ok: true, tierMargins })
  } catch {
    return c.json({ error: 'Invalid request' }, 400)
  }
})

// ── POST /api/finance/set-margin (legacy — kept for compatibility) ───────────
app.post('/api/finance/set-margin', async (c) => {
  try {
    const { margin } = await c.req.json()
    const val = parseFloat(margin)
    if (isNaN(val) || val < 1 || val > 99) return c.json({ error: 'margin must be 1–99' }, 400)
    setDefaultTargetMargin(val)
    return c.json({ ok: true, margin: defaultTargetMargin })
  } catch {
    return c.json({ error: 'Invalid request' }, 400)
  }
})

// ── GET /api/finance/snapshot ───────────────────────────────────
// Returns current portfolio financials + per-lot wholesale prices per tier.
// Portfolio totals are computed three times — once per tier — so that the
// Admin Overview and Finance page always reflect the correct tier-adjusted values.
// Called by the Overview page, Finance tab, and Cafe portal.
app.get('/api/finance/snapshot', (c) => {
  const bal = calcLiveBalance(coffeeLots, beanRequests, branches)

  // Compute portfolio totals using each tier's margin forced across ALL lots.
  // This ensures lots that have their own targetMargin still reflect tier pricing.
  const portBronze   = calcPortfolioFinancials(coffeeLots, bal, branches, undefined, tierMargins.Bronze)
  const portSilver   = calcPortfolioFinancials(coffeeLots, bal, branches, undefined, tierMargins.Silver)
  const portGold   = calcPortfolioFinancials(coffeeLots, bal, branches, undefined, tierMargins.Gold)

  // Gold is the reference / default for Overview totals
  return c.json({
    tierMargins,
    defaultMargin:         defaultTargetMargin,

    // Gold-tier portfolio totals (reference values shown on Overview & Finance summary cards)
    totalInventoryValue:   portGold.totalInventoryValue,
    totalProjectedProfit:  portGold.totalProjectedProfit,
    totalEnvironmentalPnL: portGold.totalEnvironmentalPnL,
    totalSpongeKgDelta:    portGold.totalSpongeKgDelta,
    lotsWithPricing:       portGold.lotsWithPricing,

    // Per-tier portfolio totals (used by Finance page tier summary cards)
    totals: {
      Bronze: { inventoryValue: portBronze.totalInventoryValue, projectedProfit: portBronze.totalProjectedProfit, environmentalPnL: portBronze.totalEnvironmentalPnL },
      Silver: { inventoryValue: portSilver.totalInventoryValue, projectedProfit: portSilver.totalProjectedProfit, environmentalPnL: portSilver.totalEnvironmentalPnL },
      Gold:   { inventoryValue: portGold.totalInventoryValue,   projectedProfit: portGold.totalProjectedProfit,   environmentalPnL: portGold.totalEnvironmentalPnL },
    },

    // Per-lot data: costPerKg for client-side recalc + per-tier wholesale prices
    byLot: portGold.byLot.map(fin => ({
      lotId:             fin.lotId,
      costPerKg:         fin.costPerKg,
      trueRoastedCost:   fin.trueRoastedCost,
      liveRoastedKg:     fin.liveRoastedKg,
      // Gold-tier lot financials (for backward compat)
      liveInventoryValue:fin.liveInventoryValue,
      projectedProfit:   fin.projectedProfit,
      environmentalPnL:  fin.environmentalPnL,
      // Per-tier wholesale prices for this lot (Bronze / Silver / Gold)
      wpBronze: fin.costPerKg > 0 ? calcWholesalePrice(fin.costPerKg, tierMargins.Bronze) : null,
      wpSilver: fin.costPerKg > 0 ? calcWholesalePrice(fin.costPerKg, tierMargins.Silver) : null,
      wpGold:   fin.costPerKg > 0 ? calcWholesalePrice(fin.costPerKg, tierMargins.Gold)   : null,
    })),
  })
})

// ── POST /api/finance/set-exchange-buffer ────────────────────────
app.post('/api/finance/set-exchange-buffer', async (c) => {
  try {
    const { buffer } = await c.req.json()
    const val = parseFloat(buffer)
    if (isNaN(val) || val < 0 || val > 10) return c.json({ error: 'buffer must be 0–10' }, 400)
    setExchangeRateBuffer(val)
    return c.json({ ok: true, buffer: exchangeRateBuffer, usdRate: lastKnownUsdToSar, eurRate: lastKnownEurToSar })
  } catch {
    return c.json({ error: 'Invalid request' }, 400)
  }
})

// ── POST /api/finance/exchange-rates/refresh ─────────────────────
// Fetches live USD/EUR→SAR rates from the XE Currency Data API.
// Falls back to cached rates if the API key is not configured.
app.post('/api/finance/exchange-rates/refresh', async (c) => {
  try {
    // XE Currency Data API — set XE_API_ID + XE_API_KEY as Cloudflare secrets
    const xeId  = (c.env as any)?.XE_API_ID  as string | undefined
    const xeKey = (c.env as any)?.XE_API_KEY as string | undefined

    if (xeId && xeKey) {
      const credentials = btoa(`${xeId}:${xeKey}`)
      const resp = await fetch(
        'https://xecdapi.xe.com/v1/convert_from.json/?from=USD&to=SAR,EUR&amount=1',
        { headers: { Authorization: `Basic ${credentials}` } }
      )
      if (resp.ok) {
        const data = await resp.json() as any
        const usd = data?.to?.find((t: any) => t.quotecurrency === 'SAR')?.mid ?? lastKnownUsdToSar
        const eurMid = data?.to?.find((t: any) => t.quotecurrency === 'EUR')?.mid
        // Convert EUR: 1 EUR = (1/eurMid) USD * usd SAR
        const eur = eurMid ? Math.round((1 / eurMid) * usd * 10000) / 10000 : lastKnownEurToSar
        const updatedAt = new Date().toISOString()
        updateExchangeRates(usd, eur, updatedAt)
        return c.json({ ok: true, usd, eur, updatedAt, source: 'xe' })
      }
    }

    // Fallback: use current cached rates (no change)
    const updatedAt = new Date().toISOString()
    updateExchangeRates(lastKnownUsdToSar, lastKnownEurToSar, updatedAt)
    return c.json({
      ok: true,
      usd: lastKnownUsdToSar,
      eur: lastKnownEurToSar,
      updatedAt,
      source: 'fallback',
      note: 'XE_API_ID / XE_API_KEY not configured — using cached rates',
    })
  } catch {
    return c.json({ error: 'Rate refresh failed' }, 500)
  }
})

// ── GET /admin/finance/zatca-export ─────────────────────────────────────────
// Streams a ZATCA-formatted CSV for tax auditors: Theoretical vs. Actual
// roasted weight reconciliation, per lot, for the current 30-day period.
// Includes: Baseline Shrinkage, Rule A Surplus, Rule B Deficit, net adjustment.
app.get('/admin/finance/zatca-export', (c) => {
  const report = calcZatcaShrinkageReport(
    coffeeLots,
    beanRequests,
    branches,
    tierMargins.Gold,   // Gold tier used as reference wholesale price column
  )

  // ── CSV helper ────────────────────────────────────────────────────────────
  // Escapes a value for safe CSV embedding (handles commas, quotes, newlines).
  const esc = (v: string | number): string => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  const row = (...cols: (string | number)[]) => cols.map(esc).join(',')

  const lines: string[] = []

  // ── Section 1: Report Header ──────────────────────────────────────────────
  lines.push(row('ZATCA BULK SHRINKAGE EXPORT — WEIGHT RECONCILIATION REPORT'))
  lines.push(row('Generated By',   report.generatedBy))
  lines.push(row('Report Date',    report.reportDate))
  lines.push(row('Period',         report.periodLabel))
  lines.push(row('Lots Reported',  report.totalLotsReported))
  lines.push('')

  // ── Section 2: Portfolio 30-Day Aggregates ────────────────────────────────
  lines.push(row('=== 30-DAY PORTFOLIO SHRINKAGE SUMMARY ==='))
  lines.push(row('Metric', 'Value (kg)', 'Notes'))
  lines.push(row('Total Purchased Green Weight',    report.totalPurchasedGreenKg,    'Sum of all lot green purchase weights'))
  lines.push(row('Baseline Roasted (Theoretical)',  report.totalBaselineRoastedKg,   'Σ green × 0.82 — standard 18% roast loss'))
  lines.push(row('Actual Roasted (Sponge-adj.)',    report.totalActualRoastedKg,     'Σ green × sponge coefficient'))
  lines.push(row('Total Baseline Shrinkage',        report.totalBaselineShrinkageKg, 'Σ green × 0.18 — standard loss (regulatory baseline)'))
  lines.push(row('Rule A Surplus (Coastal Gain)',   report.totalRuleASurplusKg,      'Extra yield from high humidity (RH > 70%)'))
  lines.push(row('Rule B Deficit (Arid Loss)',      report.totalRuleBDeficitKg,      'Yield reduction from low humidity (RH < 20%)'))
  lines.push(row('Net Sponge Adjustment',           report.netSpongeAdjustmentKg,    'Rule A + Rule B combined net kg deviation'))
  lines.push(row('Total Dispatched Roasted',        report.totalDispatchedRoastedKg, 'Sum of all DISPATCHED order quantities'))
  lines.push(row('Total Live Roasted Balance',      report.totalLiveRoastedKg,       'Current sponge-adjusted inventory'))
  lines.push('')

  // ── Section 3: Per-Lot Detail ─────────────────────────────────────────────
  lines.push(row('=== PER-LOT THEORETICAL VS. ACTUAL WEIGHT RECONCILIATION ==='))
  lines.push(row(
    // Identifiers
    'Lot ID', 'Origin', 'Variety', 'Process', 'Branch', 'Roast Date', 'Expiry Date', 'Status', 'Branch RH (%)',
    // Green weight
    'Purchased Green (kg)',
    // Theoretical (Baseline)
    'Baseline Shrinkage %', 'Theoretical Roasted — Baseline (kg)', 'Standard Shrinkage Loss (kg)',
    // Actual (Sponge)
    'Sponge Coefficient', 'Sponge Rule', 'Actual Roasted — Sponge adj. (kg)',
    // Delta
    'Sponge Adjustment (kg)', 'Rule A Surplus (kg)', 'Rule B Deficit (kg)',
    // Dispatched & live
    'Dispatched Roasted (kg)', 'Live Green Equiv. (kg)', 'Live Roasted — Sponge adj. (kg)', 'Live Roasted — Baseline (kg)',
    // Financial
    'Green Cost (SAR/kg)', 'Wholesale Price Gold (SAR/kg)', 'Live Inventory Value (SAR)',
  ))

  for (const r of report.rows) {
    // Friendly sponge rule label
    const ruleLabel =
      r.spongeRule === 'MOISTURE_ABSORPTION' ? 'Rule A — Coastal High Humidity' :
      r.spongeRule === 'EVAPORATION_LOSS'    ? 'Rule B — Inland Arid'            :
                                               'Baseline — Normal RH'

    lines.push(row(
      r.lotId, r.origin, r.variety, r.process, r.branch, r.roastDate, r.expiryDate, r.status, r.branchHumidity,
      r.purchasedGreenKg,
      r.baselineShrinkagePct + '%', r.baselineRoastedKg, r.baselineShrinkageKg,
      r.spongeCoefficient, ruleLabel, r.actualRoastedKg,
      r.spongeAdjKg, r.ruleASurplusKg, r.ruleBDeficitKg,
      r.dispatchedRoastedKg, r.liveGreenKg, r.liveRoastedKg, r.liveBaselineKg,
      r.costPerKg > 0 ? r.costPerKg : 'N/A',
      r.wholesalePriceGold > 0 ? r.wholesalePriceGold : 'N/A',
      r.liveInventoryValue > 0 ? r.liveInventoryValue : 'N/A',
    ))
  }

  lines.push('')

  // ── Section 4: Auditor Notes ──────────────────────────────────────────────
  lines.push(row('=== AUDITOR NOTES ==='))
  lines.push(row('Definition: Baseline Shrinkage',
    'Standard 18% weight loss (yield coefficient 0.82) applied uniformly to all lots per ZATCA commodity regulations.'))
  lines.push(row('Definition: Rule A — Coastal Surplus',
    'Lots stored at branches with RH > 70% absorb ambient moisture. Yield coefficient rises to 0.825 (+0.5%). Weight gain is REAL and auditable.'))
  lines.push(row('Definition: Rule B — Arid Deficit',
    'Lots stored at branches with RH < 20% lose additional moisture. Yield coefficient drops to 0.817 (−0.3%). Additional loss is REAL and auditable.'))
  lines.push(row('Definition: Sponge Adjustment',
    'Net deviation (kg) between Actual and Theoretical roasted weight. Positive = surplus under Rule A. Negative = deficit under Rule B.'))
  lines.push(row('Regulatory Basis',
    'Weight differences arise solely from documented environmental humidity readings. Branch RH logged in real-time by Qabban OS Sponge Effect Engine.'))
  lines.push(row('Currency', 'SAR (Saudi Riyal)'))
  lines.push(row('Weight Unit', 'Kilograms (kg)'))

  const csvBody = lines.join('\r\n')
  const filename = `qabban-zatca-shrinkage-${report.reportDate}.csv`

  return new Response(csvBody, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
})

// ── GET /admin/requests ─────────────────────────────────────────
app.get('/admin/requests', (c) => {
  const pendingCount = beanRequests.filter(r => r.status === 'PENDING').length

  const content = `
  ${pendingCount > 0 ? `
  <div class="alert alert-warning">
    <i class="fa fa-bell"></i>
    <div><strong>${pendingCount} request${pendingCount > 1 ? 's' : ''} awaiting your confirmation</strong> — Review and action below.</div>
  </div>` : ''}

  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label">Pending</div>
      <div class="stat-value" style="color:var(--blue)">${beanRequests.filter(r => r.status === 'PENDING').length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Confirmed</div>
      <div class="stat-value" style="color:var(--green)">${beanRequests.filter(r => r.status === 'CONFIRMED').length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Dispatched</div>
      <div class="stat-value" style="color:var(--amber)">${beanRequests.filter(r => r.status === 'DISPATCHED').length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Cancelled</div>
      <div class="stat-value" style="color:var(--text-muted)">${beanRequests.filter(r => r.status === 'CANCELLED').length}</div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">All Bean Requests</div>
    ${beanRequests.length === 0
      ? '<div class="empty-state"><i class="fa fa-inbox"></i><p>No bean requests yet</p></div>'
      : `<div class="table-wrap">
      <table>
        <thead>
          <tr><th>Req ID</th><th>Cafe</th><th>Lot</th><th>Qty</th><th>Notes</th><th>Submitted</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${beanRequests.map(r => {
            const isCancelled = r.status === 'CANCELLED'
            return `
          <tr class="${isCancelled ? 'tr-cancelled' : ''}">
            <td class="mono" style="color:${isCancelled ? '#52525b' : 'var(--amber)'}">${r.id}</td>
            <td>
              <div style="font-weight:500">${r.cafeName}</div>
              <div style="font-size:11px;color:var(--text-muted)">${r.cafeId}</div>
            </td>
            <td>
              <div style="font-weight:500;font-size:13px">${r.lotOrigin}</div>
              <div class="mono" style="font-size:10px;color:var(--text-muted)">${r.lotId}</div>
            </td>
            <td class="mono" style="color:${isCancelled ? 'var(--text-muted)' : 'var(--amber)'}">${r.quantityKg} kg</td>
            <td style="font-size:12px;color:var(--text-sec);max-width:160px">${r.notes || '—'}</td>
            <td class="mono" style="font-size:10px;color:var(--text-muted)">${r.requestedAt}</td>
            <td><span class="badge badge-${r.status}">${r.status}</span></td>
            <td>
              ${r.status === 'PENDING' ? `
              <form method="POST" action="/admin/requests/${r.id}/confirm" style="display:inline">
                <button type="submit" style="font-family:var(--font-mono);font-size:10px;padding:5px 10px;background:var(--green-dim);color:var(--green);border:1px solid rgba(16,185,129,.3);border-radius:var(--radius);cursor:pointer">CONFIRM</button>
              </form>` : ''}
              ${r.status === 'CONFIRMED' ? `
              <form method="POST" action="/admin/requests/${r.id}/dispatch" style="display:inline">
                <button type="submit" style="font-family:var(--font-mono);font-size:10px;padding:5px 10px;background:var(--amber-glow);color:var(--amber);border:1px solid var(--border-amber);border-radius:var(--radius);cursor:pointer">DISPATCH</button>
              </form>` : ''}
              ${r.status === 'DISPATCHED' ? `
              <form method="POST" action="/admin/requests/${r.id}/cancel" style="display:inline">
                <button type="submit" style="font-family:var(--font-mono);font-size:10px;padding:5px 10px;background:rgba(113,113,122,0.12);color:#a1a1aa;border:1px solid rgba(113,113,122,0.3);border-radius:var(--radius);cursor:pointer">RETURN TO STOCK</button>
              </form>` : ''}
              ${isCancelled ? `<span class="audit-tag">AUDIT ONLY</span>` : ''}
            </td>
          </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>`}
  </div>

  <!-- ── Roasting Interests (Pre-Orders for OUT OF STOCK) ── -->
  <div class="card" style="margin-top:24px">
    <div class="card-title">
      <i class="fa fa-fire" style="color:#60a5fa"></i>
      Roasting Interests — Pre-Orders
      ${roastingInterests.filter(r => r.status === 'NEW').length > 0
        ? `<span style="background:rgba(59,130,246,0.15);color:#60a5fa;font-family:var(--font-mono);font-size:9px;padding:2px 7px;border-radius:2px;border:1px solid rgba(59,130,246,0.35);margin-left:4px">${roastingInterests.filter(r => r.status === 'NEW').length} NEW</span>`
        : ''
      }
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">
      Cafes submitted these pre-orders for origins that are currently <strong>OUT OF STOCK</strong>. Use this to plan your next roast schedule.
    </div>
    ${roastingInterests.length === 0
      ? `<div class="empty-state" style="padding:28px">
           <i class="fa fa-clock" style="color:#52525b"></i>
           <p>No pre-orders yet — cafes will submit Roasting Interest requests when an origin is out of stock.</p>
         </div>`
      : `<div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ref</th><th>Cafe</th><th>Origin</th>
            <th>Interested Qty</th><th>Notes</th><th>Submitted</th><th>Status</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${roastingInterests.map(r => `
          <tr>
            <td class="mono" style="color:#60a5fa">${r.id}</td>
            <td>
              <div style="font-weight:500">${r.cafeName}</div>
              <div style="font-size:11px;color:var(--text-muted)">${r.cafeId}</div>
            </td>
            <td style="font-weight:500">${r.origin}</td>
            <td class="mono" style="color:#60a5fa">${r.interestedKg} kg</td>
            <td style="font-size:12px;color:var(--text-sec);max-width:160px">${r.notes || '—'}</td>
            <td class="mono" style="font-size:10px;color:var(--text-muted)">${r.submittedAt}</td>
            <td><span class="badge badge-interest-${r.status}">${r.status}</span></td>
            <td style="white-space:nowrap">
              ${r.status === 'NEW' ? `
              <form method="POST" action="/admin/interests/${r.id}/seen" style="display:inline">
                <button type="submit" style="font-family:var(--font-mono);font-size:10px;padding:5px 10px;background:var(--amber-glow);color:var(--amber);border:1px solid var(--border-amber);border-radius:var(--radius);cursor:pointer;margin-right:4px">MARK SEEN</button>
              </form>` : ''}
              ${r.status !== 'SCHEDULED' ? `
              <form method="POST" action="/admin/interests/${r.id}/schedule" style="display:inline">
                <button type="submit" style="font-family:var(--font-mono);font-size:10px;padding:5px 10px;background:var(--green-dim);color:var(--green);border:1px solid rgba(16,185,129,.3);border-radius:var(--radius);cursor:pointer">SCHEDULE</button>
              </form>` : `
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--green)"><i class="fa fa-check"></i> Scheduled</span>`}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`
    }
  </div>`

  return c.html(adminLayout('Bean Requests', 'requests', content, pendingCount))
})

// ── POST /admin/requests/:id/confirm ───────────────────────────
app.post('/admin/requests/:id/confirm', (c) => {
  const req = beanRequests.find(r => r.id === c.req.param('id'))
  if (req) req.status = 'CONFIRMED'
  return c.redirect('/admin/requests', 303)
})

// ── POST /admin/requests/:id/dispatch ──────────────────────────
app.post('/admin/requests/:id/dispatch', (c) => {
  const req = beanRequests.find(r => r.id === c.req.param('id'))
  if (req) {
    req.status = 'DISPATCHED'
    // ── Coffee Miles: accumulate lifetimeKgPurchased and auto-assign tier ──
    const cafe = cafeClients.find(cl => cl.id === req.cafeId)
    if (cafe) {
      cafe.lifetimeKgPurchased = (cafe.lifetimeKgPurchased ?? 0) + req.quantityKg
      cafe.coffeeMilesTier     = getCoffeeMilesTier(cafe.lifetimeKgPurchased)
    }
  }
  return c.redirect('/admin/requests', 303)
})

// ── POST /admin/requests/:id/cancel ────────────────────────────
// Sets status to CANCELLED. calcLiveBalance() only counts DISPATCHED,
// so the deducted weight is immediately restored to live stock totals.
app.post('/admin/requests/:id/cancel', (c) => {
  const req = beanRequests.find(r => r.id === c.req.param('id'))
  if (req) req.status = 'CANCELLED'
  return c.redirect('/admin/requests', 303)
})

// ── POST /admin/interests/:id/seen ─────────────────────────────
app.post('/admin/interests/:id/seen', (c) => {
  const ri = roastingInterests.find(r => r.id === c.req.param('id'))
  if (ri) ri.status = 'SEEN'
  return c.redirect('/admin/requests', 303)
})

// ── POST /admin/interests/:id/schedule ─────────────────────────
app.post('/admin/interests/:id/schedule', (c) => {
  const ri = roastingInterests.find(r => r.id === c.req.param('id'))
  if (ri) ri.status = 'SCHEDULED'
  return c.redirect('/admin/requests', 303)
})

// ── POST /admin/inventory/:lotId/recall ────────────────────────
// SFDA Audit Shield: marks a lot as RECALLED, records instructions,
// identifies all cafes with DISPATCHED orders for this lot.
app.post('/admin/inventory/:lotId/recall', async (c) => {
  const lotId = c.req.param('lotId')
  const lot   = coffeeLots.find(l => l.id === lotId)
  if (!lot) return c.json({ error: 'Lot not found' }, 404)
  if (lot.status === 'RECALLED') return c.json({ error: 'Already recalled' }, 400)

  let instructions = ''
  try {
    const body = await c.req.json() as { instructions?: string }
    instructions = (body.instructions ?? '').trim()
  } catch { /* no body */ }

  if (!instructions) return c.json({ error: 'Instructions required' }, 400)

  // Find cafes with DISPATCHED orders for this lot
  const affectedCafeIds = [
    ...new Set(
      beanRequests
        .filter(r => r.lotId === lotId && r.status === 'DISPATCHED')
        .map(r => r.cafeId)
    )
  ]

  const now = new Date().toISOString().replace('T', ' ').slice(0, 16)

  // Lock the lot
  lot.status = 'RECALLED'
  lot.recallInfo = {
    initiatedAt:   now,
    instructions:  instructions,
    notifiedCafes: affectedCafeIds,
  }

  return c.json({
    success:       true,
    lotId,
    recalledAt:    now,
    instructions,
    notifiedCafes: affectedCafeIds,
  })
})

// ══════════════════════════════════════════════════════════════════
//  CAFE ROUTES
// ══════════════════════════════════════════════════════════════════

// ── GET /cafe ────────────────────────────────────────────────────
app.get('/cafe', (c) => {
  const client      = resolveCafeClient(c.req.query('cid') ?? null)
  const bal         = calcLiveBalance(coffeeLots, beanRequests, branches)

  // ── XE Currency — effective SAR rate for display ──
  const effRate = lastKnownUsdToSar * (1 + exchangeRateBuffer / 100)

  // ── Per-origin live roasted balance (summed across all lots for that origin)
  // Includes ALL non-RECALLED lots (OPTIMAL, MONITOR, CRITICAL) with remaining stock.
  const originBalanceMap = new Map<string, number>()
  for (const cat of CATALOG_ORIGINS) {
    const total = coffeeLots
      .filter(l => l.origin === cat.key && l.status !== 'RECALLED')
      .reduce((sum, lot) => {
        const lb = bal.byLot.get(lot.id)
        return sum + (lb ? lb.liveRoastedKg : 0)
      }, 0)
    originBalanceMap.set(cat.key, Math.round(total * 10) / 10)
  }

  // ── Best lot per origin (highest grade non-RECALLED lot with remaining stock)
  const bestLotMap = new Map<string, CoffeeLot>()
  for (const cat of CATALOG_ORIGINS) {
    const lots = coffeeLots
      .filter(l => l.origin === cat.key && l.status !== 'RECALLED')
      .sort((a, b) => b.gradeScore - a.gradeScore)
    if (lots.length > 0) bestLotMap.set(cat.key, lots[0])
  }

  // ── Wholesale price per origin — tier-specific, fixed to BASELINE 0.82
  // Uses the best (highest-grade) lot's costPerKg with this client's tier margin.
  const clientTierMargin = marginForTier(client.tier as ClientTier)
  const wholesalePriceMap = new Map<string, number | null>()
  for (const cat of CATALOG_ORIGINS) {
    const best = bestLotMap.get(cat.key)
    if (best && best.costPerKg && best.costPerKg > 0) {
      wholesalePriceMap.set(cat.key, calcWholesalePrice(best.costPerKg, clientTierMargin))
    } else {
      wholesalePriceMap.set(cat.key, null)
    }
  }

  const inStockCount  = CATALOG_ORIGINS.filter(c => (originBalanceMap.get(c.key) ?? 0) > 0).length
  const outOfStockCount = CATALOG_ORIGINS.length - inStockCount

  // ── Marketplace Type from Global Exchange lots (SPOT / FORWARD) per origin ──
  // Shows buyers whether supply comes from spot dispatch or forward harvest contracts.
  const originMarketplaceMap = new Map<string, 'SPOT' | 'FORWARD' | null>()
  for (const cat of CATALOG_ORIGINS) {
    const gLot = globalLots.find(l => l.origin.toLowerCase().includes(cat.key.split(' ')[0].toLowerCase()) && l.status === 'AVAILABLE')
    originMarketplaceMap.set(cat.key, gLot ? gLot.marketplaceType : null)
  }

  // ── Coffee Miles loyalty data for this client ──
  const lifetimeKg   = client.lifetimeKgPurchased ?? 0
  const cmTier       = client.coffeeMilesTier ?? getCoffeeMilesTier(lifetimeKg)
  const cmBase       = getTierBaseDiscount(cmTier)
  const cmProgress   = kgToNextTier(lifetimeKg)
  const cmColor      = cmTier === 'Gold' ? '#f59e0b' : cmTier === 'Silver' ? '#94a3b8' : '#cd7f32'
  const cmIcon       = cmTier === 'Gold' ? '🥇' : cmTier === 'Silver' ? '🥈' : '🥉'
  const cmBgGrad     = cmTier === 'Gold'
    ? 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))'
    : cmTier === 'Silver'
    ? 'linear-gradient(135deg,rgba(148,163,184,0.12),rgba(148,163,184,0.04))'
    : 'linear-gradient(135deg,rgba(205,127,50,0.12),rgba(205,127,50,0.04))'
  const cmBorderCol  = cmTier === 'Gold' ? 'rgba(245,158,11,0.40)' : cmTier === 'Silver' ? 'rgba(148,163,184,0.35)' : 'rgba(205,127,50,0.35)'

  // ── Tier Watcher — Milestone Nudge (within 50 kg of next tier) ──
  const nudge = getTierNudgeStatus(lifetimeKg, client.name)

  const content = `
  <!-- NOTE: Recall alerts are injected dynamically by checkRecalls() polling every 4s.
       No static server-rendered recall alert here — banners only appear when admin
       has explicitly clicked INITIATE RECALL in the Inventory tab. -->

  <!-- ── XE CURRENCY RATE BAR ── -->
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:8px 16px;background:rgba(74,222,128,0.05);border:1px solid rgba(74,222,128,0.18);border-radius:var(--radius);margin-bottom:16px;font-family:var(--font-mono);font-size:10px">
    <span style="color:var(--text-muted)"><i class="fa fa-coins" style="color:#4ade80;margin-right:5px"></i>SAMA/XE RATE</span>
    <span style="font-weight:700;color:#4ade80">1 USD = ${effRate.toFixed(4)} SAR</span>
    <span style="color:var(--text-muted)">·</span>
    <span style="color:var(--text-muted)">SAMA peg: ${lastKnownUsdToSar.toFixed(4)} + ${exchangeRateBuffer.toFixed(1)}% buffer</span>
    <span style="color:var(--text-muted)">·</span>
    <span style="color:var(--text-muted)">60-s rate lock · ${exchangeRateUpdatedAt ? `Updated ${exchangeRateUpdatedAt}` : 'Using cached rate'}</span>
    <a href="/admin/finance" style="color:#4ade80;text-decoration:none;margin-left:auto">⚙ Rate Settings</a>
  </div>

  ${nudge.isNudge ? `
  <!-- ── TIER WATCHER — MILESTONE NUDGE BANNER ── -->
  <div id="tier-nudge-banner" style="display:flex;align-items:flex-start;gap:14px;padding:14px 18px;background:linear-gradient(135deg,rgba(245,158,11,0.14),rgba(245,158,11,0.06));border:1.5px solid rgba(245,158,11,0.55);border-radius:10px;margin-bottom:18px;animation:nudgePulse 2.5s ease-in-out infinite">
    <div style="width:36px;height:36px;border-radius:50%;background:rgba(245,158,11,0.18);border:2px solid rgba(245,158,11,0.6);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">⚡</div>
    <div style="flex:1">
      <div style="font-family:var(--font-mono);font-size:11px;font-weight:800;color:var(--amber);letter-spacing:.6px;margin-bottom:3px">
        TIER UPGRADE MILESTONE — ${nudge.kgNeeded} KG AWAY
      </div>
      <div style="font-size:12px;color:var(--text-pri);line-height:1.5">
        ${nudge.nudgeMessage}
      </div>
      <div style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="height:6px;flex:1;min-width:120px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${nudge.progressPct}%;background:linear-gradient(90deg,var(--amber),#fbbf24);border-radius:3px;box-shadow:0 0 8px rgba(245,158,11,0.5)"></div>
        </div>
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);white-space:nowrap">${nudge.progressPct}% → ${nudge.nextTier === 'Gold' ? '🥇' : '🥈'} ${nudge.nextTier}</span>
        <button onclick="sendWhatsAppNudge('${client.id}')" style="padding:4px 12px;background:rgba(37,211,102,0.15);border:1px solid rgba(37,211,102,0.45);border-radius:4px;color:#25d366;font-size:10px;font-family:var(--font-mono);cursor:pointer;font-weight:700;letter-spacing:.3px">
          <i class="fa fa-brands fa-whatsapp" style="margin-right:4px"></i>SEND WHATSAPP
        </button>
        <button onclick="document.getElementById('tier-nudge-banner').style.display='none'" style="padding:4px 10px;background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:4px;color:var(--text-muted);font-size:10px;cursor:pointer">✕ Dismiss</button>
      </div>
    </div>
  </div>
  <style>
    @keyframes nudgePulse {
      0%,100%{ box-shadow:0 0 0 0 rgba(245,158,11,0.0); }
      50%    { box-shadow:0 0 0 6px rgba(245,158,11,0.18); }
    }
  </style>
  ` : ''}

  <!-- ── LOYALTY TRACKER CARD (above catalog per spec) ── -->
  <div style="background:${cmBgGrad};border:1px solid ${cmBorderCol};border-radius:12px;padding:20px 24px;margin-bottom:24px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <!-- Left: tier badge + stats -->
      <div style="flex:1;min-width:220px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="width:52px;height:52px;border-radius:50%;background:${cmColor}22;border:2px solid ${cmColor};display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">${cmIcon}</div>
          <div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:.8px">COFFEE MILES — LOYALTY TIER</div>
            <div style="font-size:22px;font-weight:800;color:${cmColor};line-height:1.1">${cmTier.toUpperCase()}</div>
            <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-top:2px">${lifetimeKg.toLocaleString()} kg lifetime · ${cmBase}% base discount</div>
          </div>
        </div>

        <!-- Progress bar to next tier -->
        ${cmProgress.nextTier ? `
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:10px;font-family:var(--font-mono);color:var(--text-muted);margin-bottom:6px">
            <span style="color:${cmColor};font-weight:700">${cmTier}</span>
            <span>${cmProgress.kgNeeded.toLocaleString()} kg to <strong style="color:${cmProgress.nextTier==='Gold'?'#f59e0b':'#94a3b8'}">${cmProgress.nextTier}</strong></span>
          </div>
          <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;position:relative">
            <div style="height:100%;width:${cmProgress.progressPct}%;background:linear-gradient(90deg,${cmColor},${cmColor}99);border-radius:4px;transition:width .6s ease;box-shadow:0 0 8px ${cmColor}66"></div>
          </div>
          <div style="font-size:9px;color:var(--text-muted);font-family:var(--font-mono);margin-top:4px;text-align:right">${cmProgress.progressPct}% of the way to ${cmProgress.nextTier}</div>
        </div>` : `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(245,158,11,0.08);border-radius:6px">
          <i class="fa fa-trophy" style="color:var(--amber)"></i>
          <span style="font-size:10px;font-family:var(--font-mono);color:var(--amber)">Maximum tier reached — Gold status unlocked!</span>
        </div>`}
      </div>

      <!-- Right: discount breakdown -->
      <div style="display:grid;grid-template-columns:repeat(3,minmax(100px,1fr));gap:10px;flex-shrink:0">
        <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px">
          <div style="font-size:9px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:4px">TIER BASE</div>
          <div style="font-size:22px;font-weight:800;color:${cmColor}">${cmBase}%</div>
          <div style="font-size:9px;color:var(--text-muted)">discount</div>
        </div>
        <div style="text-align:center;padding:12px;background:rgba(74,222,128,0.05);border:1px solid rgba(74,222,128,0.2);border-radius:8px">
          <div style="font-size:9px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:4px">BULK BONUS</div>
          <div style="font-size:22px;font-weight:800;color:var(--green)">+${BULK_DISCOUNT_PCT}%</div>
          <div style="font-size:9px;color:var(--text-muted)">&gt;${BULK_ORDER_THRESHOLD_BAGS} bags</div>
        </div>
        <div style="text-align:center;padding:12px;background:rgba(74,222,128,0.08);border:2px solid rgba(74,222,128,0.3);border-radius:8px">
          <div style="font-size:9px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:4px">MAX STACKED</div>
          <div style="font-size:22px;font-weight:800;color:var(--green)">${cmBase + BULK_DISCOUNT_PCT}%</div>
          <div style="font-size:9px;color:var(--green);font-family:var(--font-mono)">combined</div>
        </div>
      </div>
    </div>

    <!-- All tiers mini-reference -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06)">
      ${COFFEE_MILES_TIERS.map(t => {
        const active = t.tier === cmTier
        const tCol = t.tier==='Gold'?'#f59e0b':t.tier==='Silver'?'#94a3b8':'#cd7f32'
        return `<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:5px;background:${active?tCol+'22':'rgba(255,255,255,0.03)'};border:1px solid ${active?tCol+'66':'rgba(255,255,255,0.07)'}">
          <span style="font-size:13px">${t.icon}</span>
          <span style="font-family:var(--font-mono);font-size:10px;font-weight:${active?'800':'400'};color:${active?tCol:'var(--text-muted)'}">${t.tier}</span>
          <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">${t.baseDiscountPct}%</span>
        </div>`
      }).join('')}
      <div style="margin-left:auto;font-size:9px;color:var(--text-muted);font-family:var(--font-mono);align-self:center">
        Tier applies at checkout automatically
      </div>
    </div>
  </div>

  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label">Origins in Catalog</div>
      <div class="stat-value">${CATALOG_ORIGINS.length}</div>
      <div class="stat-unit">master ledger origins</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">In Stock</div>
      <div class="stat-value" style="color:var(--green)">${inStockCount}</div>
      <div class="stat-unit">origins with roasted balance</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Out of Stock</div>
      <div class="stat-value" style="color:var(--text-muted)">${outOfStockCount}</div>
      <div class="stat-unit">pre-order available</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Your Orders</div>
      <div class="stat-value">${beanRequests.filter(r => r.cafeId === client.id).length}</div>
      <div class="stat-unit">total requests</div>
    </div>
  </div>

  <!-- Catalog Grid — all 6 origins always visible -->
  <div class="lot-grid">
    ${CATALOG_ORIGINS.map(cat => {
      const liveRoasted = originBalanceMap.get(cat.key) ?? 0
      const isInStock   = liveRoasted > 0
      const bestLot     = bestLotMap.get(cat.key)
      const isRecalled  = coffeeLots.some(l => l.origin === cat.key && l.status === 'RECALLED')
      const wprice      = wholesalePriceMap.get(cat.key) ?? null
      const mktType     = originMarketplaceMap.get(cat.key)

      return `
    <div class="lot-card${isInStock ? '' : ' oos'}" style="position:relative">
      <!-- Header row: origin name + stock badge + marketplace type -->
      <div class="lot-header">
        <div>
          <div class="lot-id">${cat.variety} · ${cat.process}${mktType ? ` · <span style="color:${mktType==='SPOT'?'#4ade80':'#f59e0b'};font-weight:700">${mktType==='SPOT'?'⚡ Spot':'🌱 Forward'}</span>` : ''}</div>
          <div class="lot-origin">${cat.displayName}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          ${isInStock
            ? `<span class="badge badge-OPTIMAL">IN STOCK</span>`
            : `<span class="badge badge-OOS">OUT OF STOCK</span>`
          }
          ${mktType === 'FORWARD' ? `<span style="font-family:var(--font-mono);font-size:8px;padding:2px 6px;background:rgba(245,158,11,0.12);color:var(--amber);border:1px solid rgba(245,158,11,0.30);border-radius:2px">30% DEPOSIT</span>` : ''}
        </div>
      </div>

      <!-- Flavor tags from master catalog -->
      <div class="flavor-tags">
        ${cat.flavorNotes.map(f => `<span class="flavor-tag">${f}</span>`).join('')}
      </div>

      <!-- Origin description -->
      <div style="font-size:11px;color:var(--text-muted);line-height:1.5;margin:8px 0 12px">${cat.description}</div>

      <div class="lot-divider"></div>

      ${isInStock && bestLot ? `
      <!-- In-stock metrics: use live balance -->
      <div class="lot-metrics" style="margin-bottom:12px">
        <div>
          <div class="lot-metric-label">Roasted Balance</div>
          <div class="lot-metric-value">${liveRoasted} kg</div>
          <div class="lot-metric-sub">live available</div>
        </div>
        <div>
          <div class="lot-metric-label">Best Lot Grade</div>
          <div class="lot-metric-value">${bestLot.gradeScore}</div>
          <div class="lot-metric-sub">
            <div class="score-bar">
              <div class="score-track"><div class="score-fill" style="width:${bestLot.gradeScore}%"></div></div>
            </div>
          </div>
        </div>
        <div>
          <div class="lot-metric-label">Lot Ref</div>
          <div class="lot-metric-value" style="font-size:12px;color:var(--amber)">${bestLot.id}</div>
          <div class="lot-metric-sub">latest batch</div>
        </div>
        <div>
          <div class="lot-metric-label">Expires</div>
          <div class="lot-metric-value" style="font-size:12px">${bestLot.expiryDate}</div>
        </div>
      </div>
      <!-- ⬡ Wholesale Price badge — tier-specific, fixed to baseline 0.82 -->
      ${wprice !== null ? `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:${
        client.tier === 'Gold' ? 'rgba(245,158,11,0.08)' : client.tier === 'Silver' ? 'rgba(148,163,184,0.08)' : 'rgba(205,127,50,0.08)'
      };border:1px solid ${
        client.tier === 'Gold' ? 'rgba(245,158,11,0.30)' : client.tier === 'Silver' ? 'rgba(148,163,184,0.30)' : 'rgba(205,127,50,0.25)'
      };border-radius:var(--radius);margin-bottom:4px" id="wp-badge-${cat.key.replace(/\s+/g,'-')}">
        <span style="font-family:var(--font-mono);font-size:9px;color:${
          client.tier === 'Gold' ? '#f59e0b' : client.tier === 'Silver' ? '#94a3b8' : '#cd7f32'
        };letter-spacing:.4px;font-weight:700">⬡ ${client.tier.toUpperCase()} PRICE</span>
        <span style="flex:1;font-family:var(--font-mono);font-size:16px;font-weight:700;color:${
          client.tier === 'Gold' ? '#f59e0b' : client.tier === 'Silver' ? '#94a3b8' : '#cd7f32'
        }" id="wp-val-${cat.key.replace(/\s+/g,'-')}">${wprice.toFixed(2)} <span style="font-size:11px;font-weight:400;color:var(--text-muted)">SAR/kg</span></span>
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">★ ${client.tier}</span>
      </div>
      ${cmBase > 0 ? `<div style="font-size:9px;font-family:var(--font-mono);color:${cmColor};margin-bottom:8px;padding:3px 8px;background:${cmColor}11;border-radius:3px;display:inline-block">${cmIcon} ${cmTier} discount: ${cmBase}% base${BULK_DISCOUNT_PCT > 0 ? ` + up to ${BULK_DISCOUNT_PCT}% bulk = ${cmBase+BULK_DISCOUNT_PCT}% max stacked` : ''}</div>` : `<div style="font-size:9px;font-family:var(--font-mono);color:var(--text-muted);margin-bottom:8px;padding:3px 8px">🥉 Bronze tier — no base discount · earn ${501-lifetimeKg > 0 ? (501-lifetimeKg).toLocaleString()+' kg to Silver' : 'Silver tier'}</div>`}` : `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(113,113,122,0.06);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px" id="wp-badge-${cat.key.replace(/\s+/g,'-')}">
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:.4px">PRICE</span>
        <span style="flex:1;font-family:var(--font-mono);font-size:14px;color:var(--text-muted)" id="wp-val-${cat.key.replace(/\s+/g,'-')}">— SAR/kg</span>
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">no cost data</span>
      </div>`}
      <div class="lot-footer">
        <button class="btn-request"
          onclick="openModal('${bestLot.id}','${cat.displayName.replace(/'/g, "\\'")}',${liveRoasted},(_originWP&&_originWP['${cat.key.replace(/'/g,"\\'")}'])?_originWP['${cat.key.replace(/'/g,"\\'")}'].wp:null)">
          <i class="fa fa-basket-shopping"></i> REQUEST BEANS
        </button>
      </div>
      ` : `
      <!-- Out of stock: show pre-order panel -->
      <div style="padding:14px 0 4px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;display:flex;align-items:center;gap:6px">
          <i class="fa fa-clock" style="color:#71717a"></i>
          Not currently roasted — express your interest and the roaster will schedule it.
        </div>
        ${isRecalled ? `
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--red);padding:6px 10px;border:1px solid rgba(239,68,68,.35);border-radius:var(--radius);margin-bottom:10px">
          <i class="fa fa-ban"></i> One or more lots from this origin are currently RECALLED
        </div>` : ''}
      </div>
      <div class="lot-footer">
        <button class="btn-roasting"
          onclick="openRoastingModal('${cat.key.replace(/'/g, "\\'")}','${cat.displayName.replace(/'/g, "\\'")}')">
          <i class="fa fa-fire"></i> REQUEST ROASTING
        </button>
      </div>
      `}
    </div>`
    }).join('')}
  </div>

  <!-- ── Request Roasting Modal (pre-order / interest) ── -->
  <div class="modal-overlay" id="roastingModal">
    <div class="modal" style="border-color:rgba(59,130,246,0.40)">
      <div class="modal-title" style="color:#60a5fa">
        <i class="fa fa-fire" style="color:#60a5fa"></i>
        Request Roasting
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--bg-3)">
        <span id="roastingOriginLabel" style="font-weight:600;color:var(--text-pri)"></span><br/>
        This origin is currently out of stock. Let the roaster know how many kg you need and they'll schedule a roast for you.
      </div>
      <form method="POST" action="/cafe/roasting-interest" id="roastingForm">
        <input type="hidden" name="cafeId" id="roastingCafeId" value="${client.id}"/>
        <input type="hidden" name="origin" id="roastingOriginInput"/>
        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label">How many kg are you interested in?</label>
          <input class="form-input" type="number" name="interestedKg" id="roastingKg"
                 min="1" max="2000" placeholder="e.g. 50" required
                 style="border-color:rgba(59,130,246,0.40)"/>
        </div>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Notes (optional)</label>
          <textarea class="form-textarea" name="notes"
                    placeholder="Preferred roast profile, delivery timing, blend use-case..."
                    style="border-color:rgba(59,130,246,0.25)"></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" onclick="closeRoastingModal()">CANCEL</button>
          <button type="submit"
            style="flex:2;padding:10px;font-family:var(--font-mono);font-size:12px;font-weight:700;background:#3b82f6;color:white;border:none;border-radius:var(--radius);cursor:pointer;letter-spacing:.5px">
            <i class="fa fa-paper-plane"></i> &nbsp;SEND INTEREST
          </button>
        </div>
      </form>
    </div>
  </div>

  <script>
    function openRoastingModal(originKey, displayName) {
      document.getElementById('roastingOriginInput').value = originKey;
      document.getElementById('roastingOriginLabel').textContent = displayName;
      document.getElementById('roastingKg').value = '';
      document.getElementById('roastingModal').classList.add('open');
    }
    function closeRoastingModal() {
      document.getElementById('roastingModal').classList.remove('open');
    }
    document.getElementById('roastingModal').addEventListener('click', function(e) {
      if (e.target === this) closeRoastingModal();
    });

    /* ── TIER-AWARE WHOLESALE PRICE LIVE REFRESH ── */
    var _CAFE_BASELINE = 0.82;

    // This client's tier (injected from server)
    var _clientTier = '${client.tier}';

    // ── Coffee Miles Hybrid Pricing (injected from server) ──
    var _lifetimeKg          = ${lifetimeKg};
    var _cmTier              = '${cmTier}';
    var _cmBaseDiscountPct   = ${cmBase};
    var _BULK_THRESHOLD_BAGS = ${BULK_ORDER_THRESHOLD_BAGS};
    var _BAG_SIZE_KG         = ${BAG_SIZE_KG};
    var _BULK_DISCOUNT_PCT   = ${BULK_DISCOUNT_PCT};
    var _cmColor             = '${cmColor}';

    /** Return hybrid discount % for a given order qty */
    function _calcHybridDiscount(orderKg) {
      var bags   = orderKg / _BAG_SIZE_KG;
      var isBulk = bags > _BULK_THRESHOLD_BAGS;
      var bulk   = isBulk ? _BULK_DISCOUNT_PCT : 0;
      var total  = _cmBaseDiscountPct + bulk;
      return { base: _cmBaseDiscountPct, bulk: bulk, total: total, isBulk: isBulk, bags: bags };
    }

    // Maps origin key → { lotId, wp (tier-specific), costPerKg }
    var _originWP = ${JSON.stringify(Object.fromEntries(CATALOG_ORIGINS.map(cat => {
      const best = bestLotMap.get(cat.key)
      const wp   = wholesalePriceMap.get(cat.key) ?? null
      return [cat.key, {
        lotId:     best?.id ?? null,
        wp,
        costPerKg: best?.costPerKg ?? null,
      }]
    })))};

    // Current tier margins from server (kept in sync)
    var _tierMargins = { Bronze: ${tierMargins.Bronze}, Silver: ${tierMargins.Silver}, Gold: ${tierMargins.Gold} };

    // Tier color for DOM updates
    var _tierColor = _clientTier === 'Gold' ? '#f59e0b' : _clientTier === 'Silver' ? '#94a3b8' : '#cd7f32';

    /* Compute WP for this client's tier */
    function _calcTierWP(costPerKg) {
      var m = _tierMargins[_clientTier];
      if (!m) m = _tierMargins['Gold'];
      var marginFrac = Math.max(0.01, Math.min(0.99, m / 100));
      return Math.round((costPerKg / _CAFE_BASELINE) / (1 - marginFrac) * 100) / 100;
    }

    /* Apply updated prices to the DOM + open modal if visible */
    function _applyWholesalePrices(wpByOrigin) {
      Object.keys(wpByOrigin).forEach(function(originKey) {
        var newWp = wpByOrigin[originKey];
        if (newWp == null) return;
        var entry = _originWP[originKey];
        if (entry) entry.wp = newWp;

        var slug  = originKey.replace(/\s+/g, '-');
        var valEl = document.getElementById('wp-val-' + slug);
        var badge = document.getElementById('wp-badge-' + slug);
        if (!valEl) return;

        valEl.innerHTML =
          '<span style="font-family:var(--font-mono);font-size:16px;font-weight:700;color:' + _tierColor + '">' +
          newWp.toFixed(2) + '</span> <span style="font-size:11px;font-weight:400;color:var(--text-muted)">SAR/kg</span>';
      });

      /* If the Request Beans modal is open, refresh its Unit Price + Order Total */
      var openLotId = document.getElementById('modalLotId') && document.getElementById('modalLotId').value;
      if (openLotId && document.getElementById('requestModal').classList.contains('open')) {
        Object.keys(_originWP).forEach(function(originKey) {
          var entry = _originWP[originKey];
          if (entry && entry.lotId === openLotId && wpByOrigin[originKey] != null) {
            _modalWholesalePrice = wpByOrigin[originKey];
            var modalContent = document.getElementById('modalContent');
            if (modalContent) {
              var upRow = modalContent.querySelector('[data-modal-unit-price]');
              if (upRow) {
                upRow.innerHTML =
                  '<span class="modal-row-label">Unit Price</span>' +
                  '<span class="modal-row-val" style="color:' + _tierColor + '">' +
                  _modalWholesalePrice.toFixed(2) + ' <span style="font-size:10px;color:var(--text-muted)">SAR/kg</span></span>';
              }
            }
            if (typeof updateOrderTotal === 'function') updateOrderTotal();
          }
        });
      }
    }

    /* Recalculate from updated tier margins (client-side, no round-trip) */
    function _recalcFromTierMargins(newTierMargins) {
      _tierMargins = newTierMargins;
      var result = {};
      Object.keys(_originWP).forEach(function(originKey) {
        var entry = _originWP[originKey];
        if (!entry.costPerKg || entry.costPerKg <= 0) return;
        result[originKey] = _calcTierWP(entry.costPerKg);
      });
      return result;
    }

    /* Fetch fresh prices from server (fallback / initial sync) */
    function refreshWholesalePrices() {
      fetch('/api/finance/snapshot')
        .then(function(r){ return r.json(); })
        .then(function(d){
          if (d.tierMargins) _tierMargins = d.tierMargins;
          // Pick the right wp key for this tier
          var wpKey = 'wp' + _clientTier;   // e.g. 'wpGold', 'wpSilver', 'wpBronze'
          var lotWpMap = {};
          (d.byLot || []).forEach(function(l){ if (l[wpKey] != null) lotWpMap[l.lotId] = l[wpKey]; });

          var wpByOrigin = {};
          Object.keys(_originWP).forEach(function(originKey) {
            var entry = _originWP[originKey];
            if (!entry.lotId) return;
            var newWp = lotWpMap[entry.lotId];
            if (newWp !== undefined) wpByOrigin[originKey] = newWp;
          });
          _applyWholesalePrices(wpByOrigin);
        }).catch(function(){});
    }

    /* Listen for instant broadcast from Finance tab */
    if (typeof BroadcastChannel !== 'undefined') {
      var _cafeCh = new BroadcastChannel('qabban_margin');
      _cafeCh.onmessage = function(ev) {
        if (ev.data && ev.data.type === 'tier_margins_changed' && ev.data.tierMargins) {
          var wpByOrigin = _recalcFromTierMargins(ev.data.tierMargins);
          _applyWholesalePrices(wpByOrigin);
        }
      };
    }

    // Poll every 10s as fallback
    setInterval(refreshWholesalePrices, 10000);

    /* ── Tier Watcher — sendWhatsAppNudge ─────────────────────────────────
       Calls POST /api/cafe/tier-nudge to log the nudge, then shows a mock
       WhatsApp message preview modal confirming dispatch.
    ─────────────────────────────────────────────────────────────────────── */
    function sendWhatsAppNudge(cafeId) {
      fetch('/api/cafe/tier-nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafeId: cafeId })
      })
      .then(function(r){ return r.json(); })
      .then(function(d) {
        if (d.ok) {
          var modal = document.getElementById('wa-nudge-modal');
          var msgEl = document.getElementById('wa-msg-body');
          if (modal && msgEl) {
            msgEl.textContent = d.whatsappCopy;
            modal.style.display = 'flex';
          }
        }
      })
      .catch(function(){});
    }
    function closeWaNudgeModal() {
      var m = document.getElementById('wa-nudge-modal');
      if (m) m.style.display = 'none';
    }
  </script>

  <!-- ── Mock WhatsApp Nudge Preview Modal ── -->
  <div id="wa-nudge-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;align-items:center;justify-content:center">
    <div style="width:min(420px,94vw);background:#111b21;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.7)">
      <!-- WhatsApp-style header -->
      <div style="background:#1f2c34;padding:12px 16px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;font-size:18px">☕</div>
        <div>
          <div style="font-weight:700;color:#e9edef;font-size:13px">Qabban Coffee Miles</div>
          <div style="font-size:10px;color:#8696a0">Loyalty · Tier Watcher Bot</div>
        </div>
        <button onclick="closeWaNudgeModal()" style="margin-left:auto;background:transparent;border:none;color:#8696a0;font-size:18px;cursor:pointer;line-height:1">✕</button>
      </div>
      <!-- Chat area -->
      <div style="padding:20px 16px;background:#0b141a;min-height:160px">
        <div style="display:flex;justify-content:flex-end">
          <div style="max-width:82%;background:#005c4b;border-radius:12px 2px 12px 12px;padding:10px 14px">
            <pre id="wa-msg-body" style="font-size:12px;color:#e9edef;font-family:'Segoe UI',sans-serif;white-space:pre-wrap;word-break:break-word;margin:0;line-height:1.55"></pre>
            <div style="text-align:right;font-size:10px;color:#8696a0;margin-top:4px">✓✓ Delivered</div>
          </div>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:10px 16px;background:#1f2c34;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:10px;color:#8696a0;font-family:var(--font-mono)">Mock notification — WhatsApp Business API</div>
        <button onclick="closeWaNudgeModal()" style="padding:6px 16px;background:rgba(37,211,102,0.2);border:1px solid rgba(37,211,102,0.5);border-radius:6px;color:#25d366;font-size:11px;font-family:var(--font-mono);cursor:pointer;font-weight:700">DONE</button>
      </div>
    </div>
  </div>`

  return c.html(cafeLayout('Coffee Catalog', 'lots', content, { name: client.name, tier: client.tier, branch: client.branch, id: client.id }))
})

// ── POST /cafe/request ──────────────────────────────────────────
app.post('/cafe/request', async (c) => {
  const form     = await c.req.formData()
  const lotId    = form.get('lotId') as string
  const quantity = parseInt(form.get('quantity') as string, 10)
  const notes    = (form.get('notes') as string) || ''
  const cafeId   = (form.get('cafeId') as string) || ''

  const lot    = coffeeLots.find(l => l.id === lotId && l.status !== 'RECALLED')  // RECALLED lots blocked
  const client = resolveCafeClient(cafeId)

  if (!lot || isNaN(quantity) || quantity <= 0) return c.redirect('/cafe', 303)

  const reqId = `REQ-${String(beanRequests.length + 1).padStart(3, '0')}`
  const now   = new Date().toISOString().replace('T', ' ').slice(0, 16)
  beanRequests.push({
    id: reqId,
    cafeId: client.id,
    cafeName: client.name,
    lotId,
    lotOrigin: lot.origin,
    quantityKg: quantity,
    requestedAt: now,
    status: 'PENDING',
    notes,
  })

  return c.redirect('/cafe/orders?success=1&cid=' + client.id, 303)
})

// ── POST /cafe/roasting-interest ─────────────────────────────────
// Captures pre-order interest for OUT OF STOCK origins.
app.post('/cafe/roasting-interest', async (c) => {
  const form         = await c.req.formData()
  const origin       = (form.get('origin') as string ?? '').trim()
  const interestedKg = parseInt(form.get('interestedKg') as string, 10)
  const notes        = (form.get('notes') as string) || ''
  const cafeId       = (form.get('cafeId') as string) || ''
  const client       = resolveCafeClient(cafeId)

  if (!origin || isNaN(interestedKg) || interestedKg <= 0) return c.redirect('/cafe', 303)

  const now  = new Date().toISOString().replace('T', ' ').slice(0, 16)
  const riId = `RI-${String(roastingInterests.length + 1).padStart(3, '0')}`

  roastingInterests.push({
    id:           riId,
    cafeId:       client.id,
    cafeName:     client.name,
    origin,
    interestedKg,
    submittedAt:  now,
    notes,
    status:       'NEW',
  })

  return c.redirect('/cafe/orders?preorder=1&cid=' + client.id, 303)
})

// ── GET /cafe/orders ─────────────────────────────────────────────
app.get('/cafe/orders', (c) => {
  const client    = resolveCafeClient(c.req.query('cid') ?? null)
  const myOrders  = beanRequests.filter(r => r.cafeId === client.id)
  const myInterests = roastingInterests.filter(r => r.cafeId === client.id)
  const success   = c.req.query('success')
  const preorder  = c.req.query('preorder')

  const content = `
  ${success ? `
  <div class="alert alert-success">
    <i class="fa fa-circle-check"></i>
    <div><strong>Request sent!</strong> Your bean request has been submitted. The roaster admin will review and confirm shortly.</div>
  </div>` : ''}
  ${preorder ? `
  <div class="alert" style="background:rgba(59,130,246,0.10);border:1px solid rgba(59,130,246,0.30);color:#60a5fa">
    <i class="fa fa-fire"></i>
    <div><strong>Roasting interest registered!</strong> The roaster has been notified of your pre-order request and will schedule accordingly.</div>
  </div>` : ''}

  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label">Total Orders</div>
      <div class="stat-value">${myOrders.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending</div>
      <div class="stat-value" style="color:var(--amber)">${myOrders.filter(r => r.status === 'PENDING').length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Confirmed</div>
      <div class="stat-value" style="color:var(--green)">${myOrders.filter(r => r.status === 'CONFIRMED').length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pre-Orders</div>
      <div class="stat-value" style="color:#60a5fa">${myInterests.length}</div>
      <div class="stat-unit">roasting interests</div>
    </div>
  </div>

  <!-- Bean Orders -->
  <div class="card" style="margin-bottom:24px">
    <div class="card-title"><i class="fa fa-basket-shopping" style="color:var(--amber)"></i> Bean Orders</div>
    ${myOrders.length === 0 ? `
    <div class="empty-state">
      <i class="fa fa-basket-shopping"></i>
      <p>No orders yet — browse the catalog and request available beans.</p>
      <a href="/cafe?cid=${client.id}" style="display:inline-block;margin-top:12px;font-family:var(--font-mono);font-size:12px">Browse Catalog →</a>
    </div>` : `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Request ID</th><th>Lot</th><th>Origin</th><th>Qty</th><th>Notes</th><th>Submitted</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${myOrders.map(r => `
          <tr>
            <td class="mono" style="color:var(--amber)">${r.id}</td>
            <td class="mono" style="font-size:11px">${r.lotId}</td>
            <td style="font-weight:500">${r.lotOrigin}</td>
            <td class="mono" style="color:var(--amber)">${r.quantityKg} kg</td>
            <td style="font-size:12px;color:var(--text-sec);max-width:140px">${r.notes || '—'}</td>
            <td class="mono" style="font-size:10px;color:var(--text-muted)">${r.requestedAt}</td>
            <td><span class="badge badge-${r.status}">${r.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
  </div>

  <!-- Roasting Interests / Pre-Orders -->
  <div class="card">
    <div class="card-title"><i class="fa fa-fire" style="color:#60a5fa"></i> Roasting Interests (Pre-Orders)</div>
    ${myInterests.length === 0 ? `
    <div class="empty-state">
      <i class="fa fa-clock" style="color:#52525b"></i>
      <p>No pre-orders yet — click 'Request Roasting' on any out-of-stock origin in the catalog.</p>
      <a href="/cafe?cid=${client.id}" style="display:inline-block;margin-top:12px;font-family:var(--font-mono);font-size:12px">Browse Catalog →</a>
    </div>` : `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Ref</th><th>Origin</th><th>Interested Qty</th><th>Notes</th><th>Submitted</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${myInterests.map(r => `
          <tr>
            <td class="mono" style="color:#60a5fa">${r.id}</td>
            <td style="font-weight:500">${r.origin}</td>
            <td class="mono" style="color:#60a5fa">${r.interestedKg} kg</td>
            <td style="font-size:12px;color:var(--text-sec);max-width:140px">${r.notes || '—'}</td>
            <td class="mono" style="font-size:10px;color:var(--text-muted)">${r.submittedAt}</td>
            <td><span class="badge badge-interest-${r.status}">${r.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
  </div>`

  return c.html(cafeLayout('My Orders', 'orders', content, { name: client.name, tier: client.tier, branch: client.branch, id: client.id }))
})

// ══════════════════════════════════════════════════════════════════
//  JSON API
// ══════════════════════════════════════════════════════════════════

app.get('/api/lots',         (c) => c.json(coffeeLots))
app.get('/api/lots/optimal', (c) => c.json(coffeeLots.filter(l => l.status === 'OPTIMAL')))
app.get('/api/branches',     (c) => c.json(branches))
app.get('/api/requests',     (c) => c.json(beanRequests))
app.get('/api/interests',    (c) => c.json(roastingInterests))
app.get('/api/catalog',      (c) => c.json(CATALOG_ORIGINS))

// ── GET /api/recalls/:cafeId  ─────────────────────────────────────────
// ── POST /api/cafe/tier-nudge ─────────────────────────────────────────────
// Tier Watcher endpoint: logs the milestone nudge and returns the WhatsApp
// message copy for client-side preview modal.
// In production this would enqueue a WhatsApp Business API message.
app.post('/api/cafe/tier-nudge', async (c) => {
  try {
    const { cafeId } = await c.req.json()
    const client = resolveCafeClient(cafeId)
    if (!client) return c.json({ error: 'Client not found' }, 404)

    const nudge = getTierNudgeStatus(client.lifetimeKgPurchased ?? 0, client.name)
    if (!nudge.isNudge) return c.json({ ok: false, message: 'Not within nudge threshold' })

    // In production: POST to WhatsApp Business API with nudge.whatsappCopy
    // For now: log + return copy for in-browser mock preview
    console.log(`[TIER WATCHER] Nudge dispatched → ${client.name} (${client.id}) · ${nudge.kgNeeded} kg to ${nudge.nextTier}`)
    return c.json({
      ok: true,
      cafeId,
      clientName:   client.name,
      currentTier:  nudge.currentTier,
      nextTier:     nudge.nextTier,
      kgNeeded:     nudge.kgNeeded,
      progressPct:  nudge.progressPct,
      nudgeMessage: nudge.nudgeMessage,
      whatsappCopy: nudge.whatsappCopy,
      channel:      'mock-whatsapp',
      sentAt:       new Date().toISOString(),
    })
  } catch {
    return c.json({ error: 'Invalid request' }, 400)
  }
})

// Returns active recalls relevant to this cafe (had DISPATCHED orders for
// a recalled lot). Used by the cafe portal to render urgent red banners.
app.get('/api/recalls/:cafeId', (c) => {
  const cafeId = c.req.param('cafeId')

  // Collect all recalled lots where this cafe had a dispatched order
  const relevantRecalls = coffeeLots
    .filter(l => l.status === 'RECALLED' && l.recallInfo?.notifiedCafes.includes(cafeId))
    .map(l => ({
      lotId:        l.id,
      lotOrigin:    l.origin,
      instructions: l.recallInfo!.instructions,
      initiatedAt:  l.recallInfo!.initiatedAt,
    }))

  return c.json({ recalls: relevantRecalls })
})

// ── GET /api/weather  ──────────────────────────────────────────────
// Server-side proxy to OpenWeatherMap — API key is NEVER sent to the browser.
// Set your real key below or inject via Cloudflare secret OPENWEATHER_KEY.
//
// HOW TO USE:
//   Option A — paste your key directly here (for local dev only):
//              const WEATHER_API_KEY = 'your_real_key_here'
//   Option B — set as Cloudflare secret (recommended for production):
//              wrangler pages secret put OPENWEATHER_KEY
//              (leave the constant below as the placeholder string)
//
// Get your free key at: https://openweathermap.org/api
// City IDs: Riyadh=108410, Jeddah=105343, Dammam=110336
// ─────────────────────────────────────────────────────────────────
const WEATHER_API_KEY = 'PASTE_YOUR_OPENWEATHERMAP_KEY_HERE'

app.get('/api/weather', async (c) => {
  // Priority: Cloudflare secret → compile-time constant → stub
  const key = (c.env as Record<string,string> | undefined)?.OPENWEATHER_KEY
           || (WEATHER_API_KEY !== 'PASTE_YOUR_OPENWEATHERMAP_KEY_HERE' ? WEATHER_API_KEY : '')

  // ── KSA realistic fallback (no key / fetch error) ──────────────
  // Values mirror typical Feb conditions + slight randomisation
  const stub = () => {
    const rand = (lo: number, hi: number) =>
      Math.round(lo + Math.random() * (hi - lo))
    return {
      source: 'stub',
      cities: [
        {
          city:     'Riyadh',
          humidity: rand(22, 42),   // arid plateau — can dip < 30%
          temp:     rand(18, 28),
          desc:     'Clear skies',
          wind:     rand(8, 22),
          icon:     '01d',
        },
        {
          city:     'Jeddah',
          humidity: rand(55, 75),   // coastal — can exceed 65%
          temp:     rand(24, 34),
          desc:     'Partly cloudy',
          wind:     rand(10, 30),
          icon:     '02d',
        },
        {
          city:     'Dammam',
          humidity: rand(40, 65),   // Gulf coast
          temp:     rand(20, 32),
          desc:     'Hazy',
          wind:     rand(12, 28),
          icon:     '50d',
        },
      ],
    }
  }

  if (!key) return c.json(stub())

  // ── Live OpenWeatherMap fetch ──────────────────────────────────
  const cityIds = '108410,105343,110336'  // Riyadh, Jeddah, Dammam
  const url = `https://api.openweathermap.org/data/2.5/group?id=${cityIds}&units=metric&appid=${key}`

  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return c.json(stub())

    const data = await res.json() as { list: Array<{
      name: string
      main: { humidity: number; temp: number }
      weather: Array<{ description: string; icon: string }>
      wind: { speed: number }
    }> }

    const cities = data.list.map(item => ({
      city:     item.name,
      humidity: item.main.humidity,
      temp:     Math.round(item.main.temp),
      desc:     item.weather[0]?.description ?? '—',
      wind:     Math.round((item.wind?.speed ?? 0) * 3.6),  // m/s → km/h
      icon:     item.weather[0]?.icon ?? '01d',
    }))

    return c.json({ source: 'live', cities })
  } catch {
    return c.json(stub())
  }
})

// ── GET /api/sponge  ────────────────────────────────────────────
// Returns the current Sponge Effect coefficients for all branches
// plus the aggregate portfolio impact. Called by the live dashboard
// to refresh the Sponge panel without a full page reload.
app.get('/api/sponge', (c) => {
  const bal = calcLiveBalance(coffeeLots, beanRequests, branches)

  const branchCoefficients = branches.map(b => {
    const sc = calcSpongeCoefficient(b.humidity)
    return {
      branchId:    b.id,
      branchName:  b.name,
      humidity:    b.humidity,
      climateType: b.climateType,
      coefficient: sc.coefficient,
      pct:         sc.pct,
      rule:        sc.rule,
      label:       sc.label,
      delta:       sc.delta,
    }
  })

  return c.json({
    baseline:            SPONGE_BASELINE_COEFFICIENT,
    highThreshold:       SPONGE_RH_HIGH_THRESHOLD,
    lowThreshold:        SPONGE_RH_LOW_THRESHOLD,
    highDelta:           SPONGE_HIGH_DELTA,
    lowDelta:            SPONGE_LOW_DELTA,
    branches:            branchCoefficients,
    portfolio: {
      baselineRoastedKg:  bal.baselineRoastedKg,
      spongeRoastedKg:    bal.liveRoastedKg,
      adjustmentKg:       bal.spongeAdjustmentKg,
      liveGreenKg:        bal.liveGreenKg,
    },
    computedAt: new Date().toISOString(),
  })
})

// ── POST /api/sponge/simulate  ─────────────────────────────────
// Simulate the Sponge coefficient for any humidity value.
// Body: { humidity: number }
// Returns the coefficient + rule without affecting live state.
app.post('/api/sponge/simulate', async (c) => {
  let body: { humidity?: number }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { humidity } = body
  if (typeof humidity !== 'number' || humidity < 0 || humidity > 100) {
    return c.json({ error: 'humidity must be a number between 0 and 100' }, 400)
  }

  const sc = calcSpongeCoefficient(humidity)

  // Also show what the roasted yield would be for common green weights
  const examples = [100, 250, 500, 1000].map(greenKg => ({
    greenKg,
    baselineRoastedKg: Math.round(greenKg * SPONGE_BASELINE_COEFFICIENT * 10) / 10,
    spongeRoastedKg:   Math.round(greenKg * sc.coefficient * 10) / 10,
    deltaKg:           Math.round((greenKg * sc.coefficient - greenKg * SPONGE_BASELINE_COEFFICIENT) * 10) / 10,
  }))

  return c.json({
    input:       { humidity },
    result:      sc,
    examples,
  })
})

// ═════════════════════════════════════════════════════════════════════════════
//  QABBAN GLOBAL EXCHANGE ROUTES  v2 — Dual-Track · Climate Passport · Ship
//  Tracker · Rate Lock · Forward Contracts · ZATCA Phase-2
// ═════════════════════════════════════════════════════════════════════════════

// ─── Shared Exchange CSS + Layout ────────────────────────────────────────────
const EXCHANGE_CSS = `
  :root{--bg:#0f0f11;--card:#18181b;--card2:#1c1c20;--border:rgba(255,255,255,0.07);
        --text:#f1f5f9;--muted:#64748b;--amber:#f59e0b;--green:#4ade80;--red:#f87171;
        --blue:#60a5fa;--purple:#f59e0b;--cyan:#22d3ee;
        --radius:8px;--mono:'JetBrains Mono',ui-monospace,monospace}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;min-height:100vh;display:flex}
  /* ── Sidebar ── */
  .sidebar{width:224px;min-height:100vh;background:rgba(0,0,0,.4);border-right:1px solid var(--border);
           display:flex;flex-direction:column;padding:0;flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto}
  .sb-brand{padding:20px 18px 16px;border-bottom:1px solid var(--border)}
  .sb-brand-icon{font-size:18px;margin-bottom:4px;color:var(--amber)}
  .sb-brand-title{font-family:var(--mono);font-size:11px;color:var(--amber);letter-spacing:.12em;font-weight:700}
  .sb-brand-sub{font-size:10px;color:var(--muted);margin-top:2px}
  .sb-section{font-size:9px;color:var(--muted);font-family:var(--mono);letter-spacing:.1em;padding:14px 18px 4px;text-transform:uppercase}
  .nav-a{display:flex;align-items:center;gap:9px;padding:8px 18px;color:var(--muted);text-decoration:none;
         font-size:12px;border-left:2px solid transparent;transition:all .12s;white-space:nowrap}
  .nav-a:hover,.nav-a.on{color:var(--amber);border-left-color:var(--amber);background:rgba(245,158,11,.06)}
  .nav-a i{width:14px;text-align:center;font-size:11px;flex-shrink:0}
  .nav-a .tag{font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(245,158,11,.15);color:var(--amber);font-family:var(--mono);margin-left:auto}
  /* ── Main ── */
  .main{flex:1;padding:28px 32px;overflow-x:hidden;min-width:0}
  .pg-title{font-size:20px;font-weight:700;margin-bottom:3px;display:flex;align-items:center;gap:10px}
  .pg-sub{font-size:11px;color:var(--muted);margin-bottom:22px;font-family:var(--mono)}
  /* ── Cards ── */
  .card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:18px}
  .card-hdr{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;margin-bottom:14px}
  .stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:14px;margin-bottom:22px}
  .stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px}
  .stat-lbl{font-size:9px;color:var(--muted);font-family:var(--mono);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
  .stat-val{font-size:22px;font-weight:700;line-height:1}
  .stat-sub{font-size:10px;color:var(--muted);margin-top:3px}
  /* ── Badges ── */
  .badge{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:20px;font-size:9px;font-family:var(--mono);font-weight:700;white-space:nowrap}
  .b-green{background:rgba(74,222,128,.12);color:var(--green);border:1px solid rgba(74,222,128,.3)}
  .b-amber{background:rgba(245,158,11,.12);color:var(--amber);border:1px solid rgba(245,158,11,.3)}
  .b-blue{background:rgba(96,165,250,.12);color:var(--blue);border:1px solid rgba(96,165,250,.3)}
  .b-purple{background:rgba(167,139,250,.12);color:var(--purple);border:1px solid rgba(167,139,250,.3)}
  .b-red{background:rgba(248,113,113,.12);color:var(--red);border:1px solid rgba(248,113,113,.3)}
  .b-muted{background:rgba(255,255,255,.05);color:var(--muted);border:1px solid rgba(255,255,255,.1)}
  .b-cyan{background:rgba(34,211,238,.12);color:var(--cyan);border:1px solid rgba(34,211,238,.3)}
  /* Track-type pills */
  .track-spot{background:rgba(74,222,128,.1);color:var(--green);border:1px solid rgba(74,222,128,.3);padding:3px 9px;border-radius:4px;font-size:10px;font-family:var(--mono);font-weight:700}
  .track-fwd{background:rgba(245,158,11,.1);color:var(--amber);border:1px solid rgba(245,158,11,.3);padding:3px 9px;border-radius:4px;font-size:10px;font-family:var(--mono);font-weight:700}
  /* ── Table ── */
  .tbl{width:100%;border-collapse:collapse;font-size:12px}
  .tbl th{text-align:left;padding:7px 10px;font-size:9px;color:var(--muted);font-family:var(--mono);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)}
  .tbl td{padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.03);vertical-align:middle}
  .tbl tr:hover td{background:rgba(255,255,255,.015)}
  /* ── Buttons ── */
  .btn{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:5px;
       font-size:11px;font-family:var(--mono);font-weight:700;cursor:pointer;border:none;text-decoration:none;transition:all .12s;white-space:nowrap}
  .btn-green{background:rgba(74,222,128,.13);color:var(--green);border:1px solid rgba(74,222,128,.35)}
  .btn-green:hover{background:rgba(74,222,128,.22)}
  .btn-amber{background:rgba(245,158,11,.13);color:var(--amber);border:1px solid rgba(245,158,11,.35)}
  .btn-amber:hover{background:rgba(245,158,11,.22)}
  .btn-blue{background:rgba(96,165,250,.13);color:var(--blue);border:1px solid rgba(96,165,250,.35)}
  .btn-blue:hover{background:rgba(96,165,250,.22)}
  .btn-red{background:rgba(248,113,113,.13);color:var(--red);border:1px solid rgba(248,113,113,.35)}
  /* ── Forms ── */
  .fg{margin-bottom:14px}
  .fl{font-size:10px;color:var(--muted);font-family:var(--mono);margin-bottom:4px;display:block}
  .fi{width:100%;background:#1a1a1e;border:1px solid var(--border);border-radius:5px;
      padding:8px 11px;color:var(--text);font-size:13px;outline:none}
  .fi:focus{border-color:rgba(245,158,11,.5);background:rgba(245,158,11,.03)}
  .fs{width:100%;background:#1a1a1e;border:1px solid var(--border);border-radius:5px;
      padding:8px 11px;color:var(--text);font-size:13px;outline:none;cursor:pointer}
  .fs option{background:#1a1a1e;color:#f1f5f9}
  /* ── Alerts ── */
  .alert{padding:11px 15px;border-radius:var(--radius);margin-bottom:14px;font-size:12px;display:flex;align-items:center;gap:9px}
  .al-green{background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.22);color:var(--green)}
  .al-amber{background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.22);color:var(--amber)}
  .al-red{background:rgba(248,113,113,.07);border:1px solid rgba(248,113,113,.22);color:var(--red)}
  .al-blue{background:rgba(96,165,250,.07);border:1px solid rgba(96,165,250,.22);color:var(--blue)}
  /* ── Ship tracker ── */
  .tracker-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
  .tracker-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--amber),var(--green));transition:width .4s}
  .tracker-events{border-left:2px solid rgba(245,158,11,.3);padding-left:14px;margin-top:12px}
  .tracker-event{position:relative;padding-bottom:14px;font-size:11px}
  .tracker-event::before{content:'';position:absolute;left:-19px;top:4px;width:8px;height:8px;border-radius:50%;background:var(--amber);border:2px solid var(--bg)}
  /* ── Climate passport ── */
  .climate-timeline{border-left:2px solid rgba(34,211,238,.25);padding-left:14px}
  .cl-row{position:relative;padding-bottom:14px;font-size:11px}
  .cl-row::before{content:'';position:absolute;left:-19px;top:3px;width:8px;height:8px;border-radius:50%;border:2px solid var(--bg)}
  .cl-origin::before{background:var(--green)}
  .cl-transit::before{background:var(--amber)}
  .cl-port::before{background:var(--blue)}
  .cl-arrival::before{background:var(--cyan)}
  /* ── Rate Lock countdown ── */
  .ratelock-box{border:1px solid rgba(245,158,11,.4);border-radius:var(--radius);padding:14px 18px;background:rgba(245,158,11,.05)}
  .ratelock-timer{font-family:var(--mono);font-size:28px;font-weight:700;color:var(--amber);letter-spacing:.05em}
  /* ── SAS clause banner ── */
  .sas-box{border:1px dashed rgba(167,139,250,.4);border-radius:var(--radius);padding:12px 16px;background:rgba(167,139,250,.04);font-size:11px;font-family:var(--mono)}
  /* ── Milestone steps ── */
  .milestone-step{display:flex;align-items:center;gap:12px;padding:10px;border-radius:6px;margin-bottom:6px;background:rgba(255,255,255,.02);border:1px solid var(--border)}
  .ms-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
  /* ── Catalog Grid ── */
  .cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:4px}
  .lot-grid-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;
                 display:flex;flex-direction:column;transition:transform .15s,border-color .15s,box-shadow .15s;position:relative}
  .lot-grid-card:hover{transform:translateY(-3px);box-shadow:0 10px 36px rgba(0,0,0,.45)}
  .lot-grid-card.spot{border-top:3px solid rgba(74,222,128,.5)}
  .lot-grid-card.forward{border-top:3px solid rgba(245,158,11,.5)}
  .lgc-hero{padding:16px 16px 10px;flex:1}
  .lgc-origin{font-size:17px;font-weight:700;line-height:1.2;margin-bottom:3px}
  .lgc-meta{font-size:10px;color:var(--muted);font-family:var(--mono);margin-bottom:10px}
  .lgc-badges{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
  .lgc-score-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .lgc-score{font-size:32px;font-weight:700;line-height:1;color:var(--green)}
  .lgc-score-label{font-size:8px;color:var(--muted);font-family:var(--mono);letter-spacing:.08em;text-transform:uppercase;margin-top:2px}
  .lgc-flavor{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:10px}
  .lgc-flavor-tag{font-size:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
                  padding:2px 6px;border-radius:3px;color:var(--muted)}
  .lgc-footer{padding:12px 14px;border-top:1px solid var(--border);background:rgba(0,0,0,.15);display:flex;flex-direction:column;gap:8px}
  .lgc-price-row{display:flex;align-items:center;justify-content:space-between}
  .lgc-price-main{font-size:20px;font-weight:700;color:var(--amber);font-family:var(--mono)}
  .lgc-price-sub{font-size:9px;color:var(--muted);font-family:var(--mono)}
  .lgc-actions{display:flex;gap:6px;flex-wrap:wrap}
  /* ── Price Breakdown Modal ── */
  .pb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}
  .pb-overlay.open{display:flex}
  .pb-modal{background:#18181b;border:1px solid rgba(245,158,11,.35);border-radius:10px;width:440px;max-width:100%;max-height:90vh;overflow-y:auto}
  .pb-header{padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between}
  .pb-title{font-family:var(--mono);font-size:13px;font-weight:700;color:var(--amber);display:flex;align-items:center;gap:8px}
  .pb-close{background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:2px 6px;border-radius:4px}
  .pb-close:hover{color:var(--text)}
  .pb-body{padding:18px 20px}
  .pb-lot-header{font-size:14px;font-weight:700;margin-bottom:4px}
  .pb-lot-sub{font-size:10px;color:var(--muted);font-family:var(--mono);margin-bottom:16px}
  .pb-qty-row{display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:10px 12px;background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.15);border-radius:6px}
  .pb-qty-input{width:90px;background:#1a1a1e;border:1px solid rgba(245,158,11,.35);border-radius:4px;padding:6px 8px;
                color:var(--text);font-size:14px;font-family:var(--mono);outline:none;text-align:center}
  .pb-line{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px}
  .pb-line:last-of-type{border-bottom:none}
  .pb-line-label{color:var(--muted);display:flex;align-items:center;gap:6px}
  .pb-line-label i{width:14px;text-align:center;font-size:10px}
  .pb-line-val{font-family:var(--mono);font-weight:600}
  .pb-total-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0 0;margin-top:6px;border-top:2px solid rgba(245,158,11,.25)}
  .pb-total-label{font-size:13px;font-weight:700}
  .pb-total-val{font-family:var(--mono);font-size:20px;font-weight:700;color:var(--green)}
  .pb-perkg{font-size:10px;color:var(--muted);font-family:var(--mono);text-align:right;margin-top:2px}
  .pb-footer{padding:14px 20px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;flex-wrap:wrap}
  /* ── Forward Checkout Stepper ── */
  .fwd-stepper{display:flex;gap:0;margin-bottom:20px;overflow:hidden;border:1px solid var(--border);border-radius:var(--radius)}
  .fwd-step{flex:1;padding:12px 10px;text-align:center;font-size:10px;font-family:var(--mono);color:var(--muted);
            background:rgba(255,255,255,.02);border-right:1px solid var(--border);position:relative;cursor:default}
  .fwd-step:last-child{border-right:none}
  .fwd-step.active{background:rgba(245,158,11,.08);color:var(--amber)}
  .fwd-step.done{background:rgba(74,222,128,.06);color:var(--green)}
  .fwd-step-num{display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;
                margin:0 auto 5px;font-size:10px;font-weight:700;border:2px solid currentColor}
  .fwd-step.done .fwd-step-num{background:rgba(74,222,128,.2)}
  .fwd-step.active .fwd-step-num{background:rgba(245,158,11,.2)}
  .fwd-step-line{position:absolute;top:50%;right:-1px;width:1px;height:60%;background:var(--border);transform:translateY(-50%)}
  /* ── SVG Sparkline ── */
  .sparkline-wrap{margin-top:10px;padding:10px 12px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.05);border-radius:6px}
  .sparkline-title{font-size:9px;font-family:var(--mono);color:var(--muted);margin-bottom:6px;letter-spacing:.08em;text-transform:uppercase;display:flex;align-items:center;justify-content:space-between}
  .sparkline-svg{width:100%;height:44px;overflow:visible}
  .sparkline-rule-a{fill:none;stroke:var(--cyan);stroke-width:1.5;stroke-dasharray:3 2}
  .sparkline-rule-b{fill:none;stroke:var(--red);stroke-width:1.5;stroke-dasharray:3 2}
  .sparkline-baseline{fill:none;stroke:rgba(255,255,255,.15);stroke-width:1;stroke-dasharray:4 3}
  .sparkline-line{fill:none;stroke:var(--amber);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .sparkline-area{opacity:.12}
  .sparkline-dot{fill:var(--amber);stroke:var(--bg);stroke-width:1.5}
  .sparkline-dot.sca{fill:var(--cyan)}
  .sparkline-dot.high{fill:var(--red)}
  /* ── SFDA upload in vendor form ── */
  .sfda-drop{border:2px dashed rgba(96,165,250,.3);border-radius:6px;padding:16px;text-align:center;cursor:pointer;
             background:rgba(96,165,250,.03);transition:border-color .15s}
  .sfda-drop:hover{border-color:rgba(96,165,250,.6)}
  .sfda-drop-icon{font-size:22px;color:var(--blue);margin-bottom:6px}
  .sfda-drop-lbl{font-size:11px;color:var(--muted);font-family:var(--mono)}
  .sfda-preview{display:none;margin-top:8px;align-items:center;gap:10px}
  .sfda-thumb{width:56px;height:56px;object-fit:cover;border-radius:4px;border:1px solid rgba(96,165,250,.3)}
  @media(max-width:720px){.sidebar{display:none}.main{padding:16px}.cat-grid{grid-template-columns:1fr}}
`

function exchangeLayout(pageTitle: string, activeNav: string, content: string) {
  const navLinks = [
    { href: '/exchange',           icon: 'fa-gauge',         label: 'Exchange Hub',   id: 'hub',     section: '' },
    { href: '/exchange/catalog',   icon: 'fa-list',          label: 'Global Catalog', id: 'catalog', section: 'MARKETPLACE' },
    { href: '/exchange/catalog?type=SPOT',    icon: 'fa-bolt',     label: 'Spot Lots',     id: 'spot',    section: '' },
    { href: '/exchange/catalog?type=FORWARD', icon: 'fa-seedling', label: 'Forward Lots',  id: 'forward', section: '' },
    { href: '/vendor',             icon: 'fa-store',         label: 'Vendor Portal',  id: 'vendor',  section: 'PORTALS', tag: '' },
    { href: '/vendor/register',    icon: 'fa-user-plus',     label: 'Register Vendor',id: 'vreg',    section: '' },
    { href: '/vendor/lots/new',    icon: 'fa-plus',          label: 'List New Lot',   id: 'vnew',    section: '' },
    { href: '/buyer',              icon: 'fa-handshake',     label: 'Buyer Portal',   id: 'buyer',   section: 'BUYERS' },
    { href: '/buyer/register',     icon: 'fa-user-plus',     label: 'Register Buyer', id: 'breg',    section: '' },
    { href: '/buyer/contract',     icon: 'fa-file-contract', label: 'Contract / Order',id: 'bcon',   section: '' },
    { href: '/exchange/analytics',    icon: 'fa-chart-bar',    label: 'Analytics',     id: 'analytics', section: 'INTELLIGENCE' },
    { href: '/admin',              icon: 'fa-arrow-left',    label: 'Back to Admin',  id: 'back',    section: 'SYSTEM' },
  ]
  const grouped: string[] = []
  for (const n of navLinks) {
    if (n.section) grouped.push(`<div class="sb-section">${n.section}</div>`)
    grouped.push(`<a href="${n.href}" class="nav-a${activeNav===n.id?' on':''}">`+
      `<i class="fa ${n.icon}"></i>${n.label}`+
      (n.tag?`<span class="tag">${n.tag}</span>`:'')+
      `</a>`)
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${pageTitle} — Qabban Global Exchange</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"/>
  <style>${EXCHANGE_CSS}</style>
</head>
<body>
  <aside class="sidebar">
    <div class="sb-brand">
      <div class="sb-brand-icon">⚖</div>
      <div class="sb-brand-title">GLOBAL EXCHANGE</div>
      <div class="sb-brand-sub">Qabban B2B Trade Platform</div>
    </div>
    ${grouped.join('\n    ')}
  </aside>
  <main class="main">${content}</main>
</body>
</html>`
}

// ── GET /exchange — Exchange Hub ──────────────────────────────────────────────
app.get('/exchange', (c) => {
  const spotLots    = globalLots.filter(l => l.marketplaceType==='SPOT'    && l.status==='AVAILABLE')
  const fwdLots     = globalLots.filter(l => l.marketplaceType==='FORWARD' && l.status==='AVAILABLE')
  const availLots   = globalLots.filter(l => l.status==='AVAILABLE')
  const verVendors  = globalVendors.filter(v => v.status==='VERIFIED').length
  const activeBuyers= globalBuyers.filter(b => b.status==='ACTIVE').length
  const contracts   = globalContracts.length + forwardContracts.length
  const scaBadged   = globalLots.filter(l => l.scaGoldStorage).length
  const totalKg     = availLots.reduce((s,l)=>s+l.greenWeightKg, 0)
  const effRate     = lastKnownUsdToSar*(1+exchangeRateBuffer/100)

  const content = `
  <div class="pg-title"><i class="fa fa-globe" style="color:var(--amber)"></i>Qabban Global Exchange</div>
  <div class="pg-sub">Multi-vendor B2B · Spot &amp; Forward lots · ZATCA Phase-2 · Live ship tracking · Climate passports</div>

  <div class="stat-grid">
    <div class="stat-card" style="border-color:rgba(74,222,128,.25)">
      <div class="stat-lbl">Spot Lots</div>
      <div class="stat-val" style="color:var(--green)">${spotLots.length}</div>
      <div class="stat-sub">Immediate dispatch</div>
    </div>
    <div class="stat-card" style="border-color:rgba(245,158,11,.25)">
      <div class="stat-lbl">Forward Lots</div>
      <div class="stat-val" style="color:var(--amber)">${fwdLots.length}</div>
      <div class="stat-sub">Pre-harvest orders · 30% deposit</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Verified Vendors</div>
      <div class="stat-val" style="color:var(--blue)">${verVendors}</div>
      <div class="stat-sub">${globalVendors.length} registered</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Active Buyers</div>
      <div class="stat-val" style="color:var(--purple)">${activeBuyers}</div>
      <div class="stat-sub">Saudi roasteries</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Total Volume</div>
      <div class="stat-val" style="color:var(--text)">${totalKg.toLocaleString()}</div>
      <div class="stat-sub">kg available</div>
    </div>
    <div class="stat-card" style="border-color:rgba(34,211,238,.25)">
      <div class="stat-lbl">SCA Gold Storage</div>
      <div class="stat-val" style="color:var(--cyan)">${scaBadged}</div>
      <div class="stat-sub">Climate-verified lots</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Active Contracts</div>
      <div class="stat-val" style="color:var(--amber)">${contracts}</div>
      <div class="stat-sub">${zatcaInvoices.length} ZATCA invoices</div>
    </div>
    <div class="stat-card" style="border-color:rgba(245,158,11,.2)">
      <div class="stat-lbl">USD→SAR (effective)</div>
      <div class="stat-val" style="color:var(--amber);font-size:17px">${effRate.toFixed(4)}</div>
      <div class="stat-sub">SAMA ${samaReferenceRate.toFixed(4)} + ${exchangeRateBuffer}% buffer</div>
    </div>
  </div>

  <!-- Dual-track overview -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div class="card" style="border-color:rgba(74,222,128,.25)">
      <div class="card-hdr"><span class="track-spot">⚡ SPOT</span><span style="font-size:12px">Spot Market Lots</span></div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px;font-family:var(--mono)">Immediate dispatch from origin warehouse</div>
      ${spotLots.slice(0,3).map(l=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div><span style="color:var(--green);font-family:var(--mono)">${l.id}</span> — ${l.origin}</div>
        <div style="font-family:var(--mono);color:var(--amber)">$${l.fobPriceUsd.toFixed(2)}/kg</div>
      </div>`).join('')}
      <a href="/exchange/catalog?type=SPOT" class="btn btn-green" style="margin-top:12px;font-size:10px">View all Spot lots →</a>
    </div>
    <div class="card" style="border-color:rgba(245,158,11,.25)">
      <div class="card-hdr"><span class="track-fwd">🌱 FORWARD</span><span style="font-size:12px">Forward Pre-orders</span></div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px;font-family:var(--mono)">30% deposit · SAS clause · milestone payments</div>
      ${fwdLots.slice(0,3).map(l=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div><span style="color:var(--amber);font-family:var(--mono)">${l.id}</span> — ${l.origin}</div>
        <div style="font-size:10px;color:var(--muted)">Harvest: ${l.harvestDate?.slice(0,7) ?? '—'}</div>
      </div>`).join('')}
      <a href="/exchange/catalog?type=FORWARD" class="btn btn-amber" style="margin-top:12px;font-size:10px">View all Forward lots →</a>
    </div>
  </div>

  <!-- Rate Display -->
  <div class="card" style="border-color:rgba(245,158,11,.25)">
    <div class="card-hdr"><i class="fa fa-coins" style="color:var(--amber)"></i>Live Exchange Rates — SAMA Reference + Buffer</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">
      <div style="text-align:center;padding:12px;background:rgba(245,158,11,.05);border:1px solid rgba(245,158,11,.15);border-radius:6px">
        <div style="font-size:10px;color:var(--muted);font-family:var(--mono)">SAMA Reference</div>
        <div style="font-size:22px;font-weight:700;color:var(--amber)">${samaReferenceRate.toFixed(4)}</div>
        <div style="font-size:10px;color:var(--muted)">SAR per 1 USD</div>
      </div>
      <div style="text-align:center;padding:12px;background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.15);border-radius:6px">
        <div style="font-size:10px;color:var(--muted);font-family:var(--mono)">With +${exchangeRateBuffer}% Buffer</div>
        <div style="font-size:22px;font-weight:700;color:var(--green)">${effRate.toFixed(4)}</div>
        <div style="font-size:10px;color:var(--muted)">SAR per 1 USD (effective)</div>
      </div>
      <div style="text-align:center;padding:12px;background:rgba(96,165,250,.05);border:1px solid rgba(96,165,250,.15);border-radius:6px">
        <div style="font-size:10px;color:var(--muted);font-family:var(--mono)">EUR Rate</div>
        <div style="font-size:22px;font-weight:700;color:var(--blue)">${(lastKnownEurToSar*(1+exchangeRateBuffer/100)).toFixed(4)}</div>
        <div style="font-size:10px;color:var(--muted)">SAR per 1 EUR (effective)</div>
      </div>
      <div style="text-align:center;padding:12px;background:rgba(167,139,250,.05);border:1px solid rgba(167,139,250,.15);border-radius:6px">
        <div style="font-size:10px;color:var(--muted);font-family:var(--mono)">Rate Lock</div>
        <div style="font-size:20px;font-weight:700;color:var(--purple)">60s</div>
        <div style="font-size:10px;color:var(--muted)">Execution window</div>
      </div>
    </div>
    <div style="font-size:10px;color:var(--muted);font-family:var(--mono);margin-top:10px">
      ${exchangeRateUpdatedAt ? `Last updated: ${exchangeRateUpdatedAt}` : 'Using SAMA peg fallback (3.75 SAR/USD)'} ·
      <a href="/admin/finance" style="color:var(--amber)">Manage in Finance settings →</a> ·
      <a href="/exchange/analytics" style="color:var(--blue)">View Analytics →</a>
    </div>
  </div>`

  return c.html(exchangeLayout('Exchange Hub', 'hub', content))
})

// ── GET /exchange/catalog — Global Catalog (multi-vendor grid + modal) ────────
app.get('/exchange/catalog', (c) => {
  const typeFilter = c.req.query('type') as 'SPOT'|'FORWARD'|undefined
  const effRate    = lastKnownUsdToSar*(1+exchangeRateBuffer/100)
  const filtered   = typeFilter ? globalLots.filter(l=>l.marketplaceType===typeFilter) : globalLots

  const tabBar = `
  <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
    <a href="/exchange/catalog" class="btn ${!typeFilter?'btn-amber':'btn-blue'}" style="font-size:11px">All Lots (${globalLots.length})</a>
    <a href="/exchange/catalog?type=SPOT" class="btn ${typeFilter==='SPOT'?'btn-green':'btn-blue'}" style="font-size:11px">⚡ Spot (${globalLots.filter(l=>l.marketplaceType==='SPOT').length})</a>
    <a href="/exchange/catalog?type=FORWARD" class="btn ${typeFilter==='FORWARD'?'btn-amber':'btn-blue'}" style="font-size:11px">🌱 Forward (${globalLots.filter(l=>l.marketplaceType==='FORWARD').length})</a>
  </div>`

  // Build lot cards — compact multi-vendor grid style
  const lotCards = filtered.map(lot => {
    const vendor  = globalVendors.find(v=>v.id===lot.vendorId)
    const landed  = calcLandedPrice(lot)
    const isSpot  = lot.marketplaceType === 'SPOT'
    const isFwd   = lot.marketplaceType === 'FORWARD'

    // ── RH Sparkline from climateLog (Rule A/B history) ───────────
    const rhValues = lot.climateLog.map(cl => cl.humidity)
    const sparkW = 120, sparkH = 32
    const sparkMin = 0, sparkMax = 100
    const sparkPoints = rhValues.map((rh, i) => {
      const x = rhValues.length > 1 ? Math.round(i * (sparkW-4) / (rhValues.length - 1)) + 2 : sparkW/2
      const y = Math.round(sparkH - 4 - ((rh - sparkMin) / (sparkMax - sparkMin)) * (sparkH - 8))
      return `${x},${y}`
    }).join(' ')
    const ruleColors = rhValues.map(rh =>
      rh > 70 ? '#f87171' : rh < 20 ? '#f59e0b' : rh >= 50 && rh <= 60 ? '#22d3ee' : '#64748b'
    )
    // Zone bands
    const y50 = Math.round(sparkH - 4 - ((50 - sparkMin) / (sparkMax - sparkMin)) * (sparkH - 8))
    const y60 = Math.round(sparkH - 4 - ((60 - sparkMin) / (sparkMax - sparkMin)) * (sparkH - 8))
    const sparkline = rhValues.length < 2 ? '' : `
      <svg width="${sparkW}" height="${sparkH}" style="display:block;overflow:visible" title="RH History">
        <rect x="0" y="${y60}" width="${sparkW}" height="${y50 - y60}" fill="rgba(34,211,238,.10)" rx="1"/>
        <polyline points="${sparkPoints}" fill="none" stroke="${ruleColors[ruleColors.length-1]}" stroke-width="1.5" stroke-linejoin="round"/>
        ${rhValues.map((rh, i) => {
          const x = rhValues.length > 1 ? Math.round(i * (sparkW-4) / (rhValues.length - 1)) + 2 : sparkW/2
          const y = Math.round(sparkH - 4 - ((rh - sparkMin) / (sparkMax - sparkMin)) * (sparkH - 8))
          return `<circle cx="${x}" cy="${y}" r="2.5" fill="${ruleColors[i]}"/>`
        }).join('')}
        <text x="2" y="${sparkH}" font-size="7" fill="#64748b" font-family="monospace">Rule A>70% / B&lt;20%</text>
      </svg>`

    // ── Climate Passport mini-section ─────────────────────────────
    const passport = `
    <div style="margin-top:14px;padding:12px;background:${lot.scaGoldStorage?'rgba(34,211,238,.05)':'rgba(255,255,255,.02)'};
                border:1px solid ${lot.scaGoldStorage?'rgba(34,211,238,.25)':'var(--border)'};border-radius:6px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <div style="font-size:9px;font-family:var(--mono);color:${lot.scaGoldStorage?'var(--cyan)':'var(--muted)'};letter-spacing:.08em">
          <i class="fa fa-passport"></i> DIGITAL CLIMATE PASSPORT — ${lot.scaGoldStorage?'✓ SCA GOLD CERTIFIED':'STANDARD STORAGE'}
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${sparkline}
          <div style="font-size:9px;font-family:var(--mono);color:var(--muted);text-align:right">
            <div>RH History</div>
            <div style="color:${lot.scaGoldStorage?'var(--cyan)':'var(--muted)'}">
              ${lot.warehouseHumidity!=null?`${lot.warehouseHumidity}% RH`:'—'}
            </div>
          </div>
        </div>
      </div>
      <div class="climate-timeline">
        ${lot.climateLog.slice(-3).map(cl=>`
        <div class="cl-row cl-${cl.phase.toLowerCase()}">
          <div style="color:var(--text);font-weight:600">${cl.location}</div>
          <div style="color:var(--muted);font-family:var(--mono);font-size:10px">
            ${cl.ts.split('T')[0]} · RH <strong style="color:${cl.humidity>=50&&cl.humidity<=60?'var(--cyan)':cl.humidity>70?'var(--red)':'var(--amber)'}">${cl.humidity}%</strong>
            · Temp <strong>${cl.temp}°C</strong>
            ${cl.humidity>70?`<span class="badge b-red" style="font-size:8px">Rule A</span>`:''}
            ${cl.humidity<20?`<span class="badge b-amber" style="font-size:8px">Rule B</span>`:''}
            ${cl.note?`· <em style="color:var(--muted)">${cl.note}</em>`:''}
          </div>
        </div>`).join('')}
      </div>
      ${lot.scaGoldStorage?`<div style="margin-top:6px;font-size:9px;font-family:var(--mono);color:var(--cyan)">✓ Certified ${lot.climateCertifiedAt?.split('T')[0]} · SCA threshold 50–60% RH</div>`:''}
      <a href="/exchange/climate/${lot.id}" style="display:inline-block;margin-top:6px;font-size:9px;color:var(--blue);font-family:var(--mono)">
        <i class="fa fa-arrow-right"></i> Full Climate Passport & timeline →
      </a>
    </div>`

    // ── Ship Tracker mini-panel ────────────────────────────────────
    const shipPanel = lot.shipTracker ? `
    <div style="margin-top:10px;padding:10px 12px;background:rgba(96,165,250,.04);border:1px solid rgba(96,165,250,.2);border-radius:6px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <div style="font-size:9px;font-family:var(--mono);color:var(--blue)">
          <i class="fa fa-ship"></i> ${lot.shipTracker.vessel} · ${lot.shipTracker.status} · ${lot.shipTracker.progressPct}%
        </div>
        <a href="/exchange/shiptrack/${lot.id}" style="font-size:9px;color:var(--blue);font-family:var(--mono)">
          Live tracker →
        </a>
      </div>
      <div class="tracker-bar" style="margin-top:6px"><div class="tracker-fill" style="width:${lot.shipTracker.progressPct}%"></div></div>
    </div>` : ''

    // ── Forward milestones mini-panel ─────────────────────────────
    const fwdPanel = isFwd ? `
    <div style="margin-top:10px;padding:10px 12px;background:rgba(245,158,11,.04);border:1px dashed rgba(245,158,11,.3);border-radius:6px">
      <div style="font-size:9px;font-family:var(--mono);color:var(--amber);margin-bottom:6px"><i class="fa fa-calendar-check"></i> FORWARD 4-STEP MILESTONE FLOW</div>
      <div style="display:flex;gap:0;font-size:9px;font-family:var(--mono)">
        <div style="flex:1;text-align:center;padding:4px 2px;background:rgba(245,158,11,.12);border-radius:4px 0 0 4px;border:1px solid rgba(245,158,11,.3)">
          <div style="color:var(--amber);font-weight:700">① Deposit</div>
          <div style="color:var(--muted)">${lot.depositPct}%</div>
        </div>
        <div style="flex:1;text-align:center;padding:4px 2px;background:rgba(167,139,250,.08);border-top:1px solid rgba(167,139,250,.25);border-bottom:1px solid rgba(167,139,250,.25)">
          <div style="color:var(--purple);font-weight:700">② Sample</div>
          <div style="color:var(--muted)">${lot.sasClause?'SAS':'Waived'}</div>
        </div>
        <div style="flex:1;text-align:center;padding:4px 2px;background:rgba(96,165,250,.08);border-top:1px solid rgba(96,165,250,.2);border-bottom:1px solid rgba(96,165,250,.2)">
          <div style="color:var(--blue);font-weight:700">③ Transit</div>
          <div style="color:var(--muted)">${Math.round((100-lot.depositPct)*0.4)}%</div>
        </div>
        <div style="flex:1;text-align:center;padding:4px 2px;background:rgba(74,222,128,.08);border-radius:0 4px 4px 0;border:1px solid rgba(74,222,128,.25)">
          <div style="color:var(--green);font-weight:700">④ Landing</div>
          <div style="color:var(--muted)">${Math.round((100-lot.depositPct)*0.6)}%</div>
        </div>
      </div>
      <div style="font-size:9px;color:var(--muted);margin-top:4px">Harvest: ${lot.harvestDate??'TBD'} · SAS: ${lot.sasClause?'Required':'Waived'}</div>
    </div>` : ''

    return `
    <div class="catalog-card" style="border-color:${isSpot?'rgba(74,222,128,.2)':isFwd?'rgba(245,158,11,.25)':'var(--border)'}">
      <!-- Card Header: badges + track -->
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-family:var(--mono);font-size:9px;color:var(--muted)">${lot.id}</span>
        <span class="${isSpot?'track-spot':'track-fwd'}">${isSpot?'⚡ SPOT':'🌱 FORWARD'}</span>
        ${lot.scaGoldStorage?`<span class="badge b-cyan" style="font-size:8px"><i class="fa fa-certificate"></i> SCA GOLD</span>`:''}
        ${lot.sasClause?`<span class="badge b-purple" style="font-size:8px">SAS</span>`:''}
        <span class="badge ${lot.status==='AVAILABLE'?'b-green':'b-muted'}" style="font-size:8px;margin-left:auto">${lot.status}</span>
      </div>

      <!-- Origin + SCA Score row -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div style="flex:1">
          <div style="font-size:17px;font-weight:700;color:var(--text);line-height:1.2">${lot.origin}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:3px">${vendor?.companyName??'—'} · ${vendor?.country??''}</div>
        </div>
        <div style="text-align:center;flex-shrink:0;background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2);border-radius:6px;padding:6px 10px">
          <div style="font-size:9px;color:var(--muted);font-family:var(--mono)">SCA</div>
          <div style="font-size:24px;font-weight:800;color:var(--green);line-height:1">${lot.gradeScore}</div>
          <div style="font-size:8px;color:var(--muted)">/ 100</div>
        </div>
      </div>

      <!-- Process + Variety + Weight row -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:5px;padding:7px;text-align:center">
          <div style="font-size:8px;color:var(--muted);font-family:var(--mono)">PROCESS</div>
          <div style="font-size:11px;font-weight:600;color:var(--text);margin-top:2px">${lot.process}</div>
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:5px;padding:7px;text-align:center">
          <div style="font-size:8px;color:var(--muted);font-family:var(--mono)">VARIETY</div>
          <div style="font-size:11px;font-weight:600;color:var(--text);margin-top:2px">${lot.variety.length>10?lot.variety.slice(0,10)+'…':lot.variety}</div>
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:5px;padding:7px;text-align:center">
          <div style="font-size:8px;color:var(--muted);font-family:var(--mono)">WEIGHT</div>
          <div style="font-size:11px;font-weight:600;color:var(--text);margin-top:2px">${lot.greenWeightKg.toLocaleString()}kg</div>
        </div>
      </div>

      <!-- Flavor notes -->
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">
        ${lot.flavorNotes.map(n=>`<span style="font-size:8px;background:rgba(255,255,255,.05);padding:2px 6px;border-radius:10px;color:var(--muted);border:1px solid var(--border)">${n}</span>`).join('')}
      </div>

      <!-- FOB price + Landed Price Button -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <div style="font-family:var(--mono)">
          <div style="font-size:9px;color:var(--muted)">FOB PRICE</div>
          <div style="font-size:15px;font-weight:700;color:var(--amber)">$${lot.fobPriceUsd.toFixed(2)}<span style="font-size:10px;color:var(--muted)">/kg</span></div>
        </div>
        <button onclick="openPriceModal('${lot.id}')"
                style="background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(245,158,11,.05));border:1px solid rgba(245,158,11,.4);color:var(--amber);padding:8px 14px;border-radius:6px;cursor:pointer;font-size:10px;font-weight:700;font-family:var(--mono);letter-spacing:.05em;transition:all .2s">
          <i class="fa fa-receipt"></i> LANDED PRICE IN SAR
        </button>
      </div>

      <!-- Action buttons -->
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <a href="/buyer/contract?lotId=${lot.id}" class="btn ${isSpot?'btn-green':'btn-amber'}" style="flex:1;justify-content:center;font-size:10px;min-width:100px">
          <i class="fa fa-file-contract"></i> ${isSpot?'Order Spot':'Pre-order Forward'}
        </a>
        <a href="/exchange/climate/${lot.id}" class="btn btn-blue" style="font-size:9px;padding:6px 10px">
          <i class="fa fa-passport"></i> Passport
        </a>
        ${lot.shipTracker?`<a href="/exchange/shiptrack/${lot.id}" class="btn btn-blue" style="font-size:9px;padding:6px 10px"><i class="fa fa-ship"></i> Track</a>`:''}
      </div>

      ${passport}
      ${shipPanel}
      ${fwdPanel}
    </div>`
  }).join('')

  // ── Price Breakdown Modal data (JSON embedded) ─────────────────────────────
  const modalData = filtered.map(lot => {
    const l = calcLandedPrice(lot)
    return {
      id: lot.id, origin: lot.origin, fobUsd: lot.fobPriceUsd,
      qty: lot.greenWeightKg,
      fobSar: l.fobPriceSar, fobTot: Math.round(l.fobPriceSar * lot.greenWeightKg * 100)/100,
      ship: l.shippingEstimateSar,
      customs: l.customsFeesSar, qabban: l.qabbanFeeSar, vat: l.vatSar,
      total: l.landedPriceSar, perKg: l.landedPricePerKg,
      rate: l.effectiveRate, process: lot.process, sca: lot.gradeScore,
      isFwd: lot.marketplaceType === 'FORWARD',
      depositPct: lot.depositPct
    }
  })

  const content = `
  <style>
    .catalog-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px;margin-top:0 }
    .catalog-card { background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;transition:box-shadow .2s,transform .15s;display:flex;flex-direction:column }
    .catalog-card:hover { box-shadow:0 6px 28px rgba(0,0,0,.35);transform:translateY(-2px) }

    /* Price Breakdown Modal */
    #pb-overlay { display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:1000;align-items:center;justify-content:center }
    #pb-overlay.open { display:flex }
    #pb-modal { background:var(--card);border:1px solid rgba(245,158,11,.35);border-radius:12px;padding:28px 30px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;position:relative }
    .pb-row { display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);font-size:12px }
    .pb-row:last-child { border-bottom:none }
    .pb-row-label { color:var(--muted);font-family:var(--mono) }
    .pb-row-val { font-family:var(--mono);font-weight:600 }
    .pb-total-row { display:flex;align-items:center;justify-content:space-between;padding:12px 0 0;font-size:15px;font-weight:700;border-top:2px solid rgba(245,158,11,.3);margin-top:4px }
    .pb-milestone { display:flex;gap:0;margin-top:12px }
    .pb-ms-step { flex:1;text-align:center;padding:6px 4px;font-size:9px;font-family:var(--mono) }
  </style>

  <!-- Price Breakdown Modal -->
  <div id="pb-overlay" onclick="closePriceModal(event)">
    <div id="pb-modal">
      <button onclick="closePriceModal()" style="position:absolute;top:14px;right:16px;background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer">✕</button>
      <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:2px" id="pb-lot-id">—</div>
      <div style="font-size:17px;font-weight:700;margin-bottom:4px" id="pb-origin">—</div>
      <div style="font-size:10px;color:var(--muted);font-family:var(--mono);margin-bottom:18px" id="pb-meta">—</div>

      <div id="pb-rate-note" style="background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:6px;padding:8px 12px;font-size:10px;font-family:var(--mono);color:var(--amber);margin-bottom:16px">
        <i class="fa fa-coins"></i> Effective Rate: <strong id="pb-rate">—</strong> SAR/USD
        (SAMA ${samaReferenceRate.toFixed(4)} + ${exchangeRateBuffer}% buffer)
      </div>

      <div id="pb-rows">
        <div class="pb-row">
          <span class="pb-row-label"><i class="fa fa-box" style="color:var(--blue);width:14px"></i> FOB Price (USD/kg → SAR/kg × qty)</span>
          <span class="pb-row-val" id="pb-fob" style="color:var(--text)">—</span>
        </div>
        <div class="pb-row">
          <span class="pb-row-label"><i class="fa fa-ship" style="color:var(--blue);width:14px"></i> Logistics (Sea Freight to KSA)</span>
          <span class="pb-row-val" id="pb-ship" style="color:var(--amber)">—</span>
        </div>
        <div class="pb-row">
          <span class="pb-row-label"><i class="fa fa-landmark" style="color:var(--amber);width:14px"></i> Saudi Customs (5% of CIF)</span>
          <span class="pb-row-val" id="pb-customs" style="color:var(--amber)">—</span>
        </div>
        <div class="pb-row">
          <span class="pb-row-label"><i class="fa fa-q" style="color:var(--cyan);width:14px"></i> Qabban Platform Fee (1.5% of CIF)</span>
          <span class="pb-row-val" id="pb-qabban" style="color:var(--cyan)">—</span>
        </div>
        <div class="pb-row" style="background:rgba(248,113,113,.04);border-radius:4px;padding:9px 6px;margin:2px 0">
          <span class="pb-row-label"><i class="fa fa-percent" style="color:var(--red);width:14px"></i> ZATCA VAT (15% — Phase 2 compliant)</span>
          <span class="pb-row-val" id="pb-vat" style="color:var(--red)">—</span>
        </div>
      </div>

      <div class="pb-total-row">
        <span style="color:var(--muted)">Total Landed Price</span>
        <span style="color:var(--green)" id="pb-total">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--mono);margin-top:6px">
        <span style="color:var(--muted)">Per kg landed</span>
        <span style="color:var(--green);font-weight:700" id="pb-perkg">—</span>
      </div>

      <!-- Forward milestone breakdown (shown only for FORWARD lots) -->
      <div id="pb-fwd-section" style="display:none;margin-top:18px">
        <div style="font-size:10px;font-family:var(--mono);color:var(--amber);margin-bottom:8px;font-weight:700">
          <i class="fa fa-calendar-check"></i> 4-STEP MILESTONE PAYMENT SCHEDULE
        </div>
        <div class="pb-milestone">
          <div class="pb-ms-step" style="background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);border-radius:4px 0 0 4px">
            <div style="color:var(--amber);font-weight:700">① Deposit</div>
            <div id="pb-ms1-pct" style="color:var(--muted)">30%</div>
            <div id="pb-ms1-amt" style="color:var(--text);font-size:10px">—</div>
          </div>
          <div class="pb-ms-step" style="background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.25);border-top:1px solid rgba(167,139,250,.25);border-bottom:1px solid rgba(167,139,250,.25)">
            <div style="color:var(--purple);font-weight:700">② Sample</div>
            <div style="color:var(--muted)">SAS Review</div>
            <div style="color:var(--muted);font-size:10px">No payment</div>
          </div>
          <div class="pb-ms-step" style="background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.2);border-top:1px solid rgba(96,165,250,.2);border-bottom:1px solid rgba(96,165,250,.2)">
            <div style="color:var(--blue);font-weight:700">③ Transit</div>
            <div id="pb-ms3-pct" style="color:var(--muted)">28%</div>
            <div id="pb-ms3-amt" style="color:var(--text);font-size:10px">—</div>
          </div>
          <div class="pb-ms-step" style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.25);border-radius:0 4px 4px 0">
            <div style="color:var(--green);font-weight:700">④ Landing</div>
            <div id="pb-ms4-pct" style="color:var(--muted)">42%</div>
            <div id="pb-ms4-amt" style="color:var(--text);font-size:10px">—</div>
          </div>
        </div>
      </div>

      <div style="margin-top:18px;display:flex;gap:8px">
        <a id="pb-order-link" href="#" class="btn btn-green" style="flex:1;justify-content:center;font-size:11px">
          <i class="fa fa-file-contract"></i> Place Order
        </a>
        <button onclick="closePriceModal()" class="btn btn-blue" style="font-size:11px">Close</button>
      </div>
    </div>
  </div>

  <script>
    const _lots = ${JSON.stringify(modalData)};
    function fmt(n){ return n.toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2})+' SAR' }
    function openPriceModal(id){
      const d = _lots.find(l=>l.id===id); if(!d) return;
      document.getElementById('pb-lot-id').textContent = d.id;
      document.getElementById('pb-origin').textContent = d.origin;
      document.getElementById('pb-meta').textContent = d.process + ' · SCA ' + d.sca + ' · ' + d.qty.toLocaleString() + ' kg';
      document.getElementById('pb-rate').textContent = d.rate.toFixed(4);
      document.getElementById('pb-fob').textContent = fmt(d.fobTot) + ' ('+d.qty.toLocaleString()+'kg × '+d.fobSar.toFixed(2)+')';
      document.getElementById('pb-ship').textContent = fmt(d.ship);
      document.getElementById('pb-customs').textContent = fmt(d.customs);
      document.getElementById('pb-qabban').textContent = fmt(d.qabban);
      document.getElementById('pb-vat').textContent = fmt(d.vat);
      document.getElementById('pb-total').textContent = fmt(d.total);
      document.getElementById('pb-perkg').textContent = d.perKg.toFixed(2) + ' SAR/kg';
      document.getElementById('pb-order-link').href = '/buyer/contract?lotId='+d.id;
      const fwdSec = document.getElementById('pb-fwd-section');
      if(d.isFwd){
        fwdSec.style.display='block';
        const dep = d.depositPct, rem = 100-dep;
        const transit = Math.round(rem*0.4), landing = Math.round(rem*0.6);
        document.getElementById('pb-ms1-pct').textContent = dep+'%';
        document.getElementById('pb-ms1-amt').textContent = fmt(Math.round(d.total*dep/100*100)/100);
        document.getElementById('pb-ms3-pct').textContent = transit+'%';
        document.getElementById('pb-ms3-amt').textContent = fmt(Math.round(d.total*transit/100*100)/100);
        document.getElementById('pb-ms4-pct').textContent = landing+'%';
        document.getElementById('pb-ms4-amt').textContent = fmt(Math.round(d.total*landing/100*100)/100);
      } else { fwdSec.style.display='none'; }
      document.getElementById('pb-overlay').classList.add('open');
      document.body.style.overflow='hidden';
    }
    function closePriceModal(e){
      if(e && e.target !== document.getElementById('pb-overlay') && e.type==='click') return;
      document.getElementById('pb-overlay').classList.remove('open');
      document.body.style.overflow='';
    }
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') closePriceModal(); });
  </script>

  <div class="pg-title"><i class="fa fa-list" style="color:var(--green)"></i>Global Coffee Catalog</div>
  <div class="pg-sub">Multi-vendor · Real-time SAR pricing · Digital Climate Passports · Landed cost</div>
  <div class="alert al-green" style="font-family:var(--mono);font-size:10px">
    <i class="fa fa-coins"></i>
    USD → SAR effective: <strong>${effRate.toFixed(4)}</strong> (SAMA ${samaReferenceRate.toFixed(4)} + ${exchangeRateBuffer}% buffer) ·
    EUR: <strong>${(lastKnownEurToSar*(1+exchangeRateBuffer/100)).toFixed(4)}</strong> ·
    15% ZATCA VAT · Click <strong>LANDED PRICE IN SAR</strong> on any card for full breakdown · 60s Rate Lock on contract
  </div>
  ${tabBar}
  <div class="catalog-grid">${lotCards}</div>`

  return c.html(exchangeLayout('Global Catalog', 'catalog', content))
})

// ── GET /vendor ───────────────────────────────────────────────────────────────
app.get('/vendor', (c) => {
  const content = `
  <div class="pg-title"><i class="fa fa-store" style="color:var(--blue)"></i>Vendor Portal</div>
  <div class="pg-sub">Registered global coffee producers · Climate passport · Lot management</div>
  <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
    <a href="/vendor/register" class="btn btn-green"><i class="fa fa-plus"></i> Register Vendor</a>
    <a href="/vendor/lots/new" class="btn btn-blue"><i class="fa fa-seedling"></i> List New Lot</a>
  </div>

  <div class="card">
    <div class="card-hdr"><i class="fa fa-building" style="color:var(--blue)"></i>Registered Vendors</div>
    <table class="tbl">
      <thead><tr><th>ID</th><th>Company</th><th>Country · Region</th><th>Contact</th><th>RH / Temp</th><th>Status</th><th>Since</th></tr></thead>
      <tbody>
        ${globalVendors.map(v=>{
          const rhOk  = v.warehouseHumidity!=null&&v.warehouseHumidity>=50&&v.warehouseHumidity<=60
          const rhClr = v.warehouseHumidity==null?'var(--muted)':rhOk?'var(--cyan)':v.warehouseHumidity>70?'var(--red)':'var(--amber)'
          const sb    = v.status==='VERIFIED'?'<span class="badge b-blue">VERIFIED</span>':
                        v.status==='PENDING_REVIEW'?'<span class="badge b-amber">PENDING</span>':
                        '<span class="badge b-red">SUSPENDED</span>'
          return `<tr>
            <td style="font-family:var(--mono);color:var(--blue)">${v.id}</td>
            <td><strong>${v.companyName}</strong></td>
            <td style="font-size:11px;color:var(--muted)">${v.country} · ${v.region}</td>
            <td style="font-size:11px"><div>${v.contactName}</div><div style="color:var(--muted)">${v.contactEmail}</div></td>
            <td style="font-family:var(--mono)">
              <span style="color:${rhClr}">${v.warehouseHumidity??'—'}% RH</span>
              <span style="color:var(--muted)"> / ${v.warehouseTemp??'—'}°C</span>
              ${rhOk?'<span class="badge b-cyan" style="margin-left:4px">SCA ✓</span>':''}
            </td>
            <td>${sb}</td>
            <td style="font-size:10px;color:var(--muted);font-family:var(--mono)">${v.registeredAt.slice(0,10)}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="card">
    <div class="card-hdr"><i class="fa fa-seedling" style="color:var(--green)"></i>Listed Lots</div>
    <table class="tbl">
      <thead><tr><th>ID</th><th>Vendor</th><th>Origin</th><th>Track</th><th>Weight</th><th>FOB USD</th><th>Harvest</th><th>Climate</th><th>SFDA Label</th><th>Status</th></tr></thead>
      <tbody>
        ${globalLots.map(l=>{
          const v  = globalVendors.find(x=>x.id===l.vendorId)
          const cl = l.scaGoldStorage?'<span class="badge b-cyan">SCA Gold</span>':'<span class="badge b-muted">'+l.warehouseHumidity+'% RH</span>'
          const sfda = l.sfdaLabelUrl
            ? `<img src="${l.sfdaLabelUrl}" alt="Sack label" style="width:36px;height:24px;object-fit:cover;border-radius:3px;border:1px solid rgba(96,165,250,.3);cursor:pointer" onclick="window.open(this.src,'_blank')" title="SFDA Article 18 label photo"/>`
            : `<span style="font-size:9px;color:var(--muted);font-family:var(--mono)">—</span>`
          return `<tr>
            <td style="font-family:var(--mono);color:var(--green)">${l.id}</td>
            <td style="font-size:11px">${v?.companyName??l.vendorId}</td>
            <td>${l.origin}</td>
            <td><span class="${l.marketplaceType==='SPOT'?'track-spot':'track-fwd'}">${l.marketplaceType}</span></td>
            <td style="font-family:var(--mono)">${l.greenWeightKg.toLocaleString()} kg</td>
            <td style="font-family:var(--mono);color:var(--amber)">$${l.fobPriceUsd.toFixed(2)}</td>
            <td style="font-size:10px;color:var(--muted);font-family:var(--mono)">${l.harvestDate??l.harvestYear}</td>
            <td>${cl}</td>
            <td>${sfda}</td>
            <td><span class="badge ${l.status==='AVAILABLE'?'b-green':'b-muted'}">${l.status}</span></td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
  </div>`
  return c.html(exchangeLayout('Vendor Portal', 'vendor', content))
})

// ── GET /vendor/register ──────────────────────────────────────────────────────
app.get('/vendor/register', (c) => {
  const msg = c.req.query('msg')
  const content = `
  <div class="pg-title"><i class="fa fa-user-plus" style="color:var(--blue)"></i>Register as Vendor</div>
  <div class="pg-sub">Global coffee producers — join the Qabban B2B network</div>
  ${msg==='ok'?`<div class="alert al-green"><i class="fa fa-check"></i>Registration submitted! Under review.</div>`:''}
  <div class="card" style="max-width:580px">
    <form method="POST" action="/vendor/register">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fg" style="grid-column:1/-1"><label class="fl">Company / Farm Name *</label><input name="companyName" class="fi" required/></div>
        <div class="fg"><label class="fl">Contact Person *</label><input name="contactName" class="fi" required/></div>
        <div class="fg"><label class="fl">Contact Email *</label><input name="contactEmail" type="email" class="fi" required/></div>
        <div class="fg">
          <label class="fl">Country *</label>
          <select name="country" class="fs" required>
            <option value="">Select…</option>
            ${['Ethiopia','Brazil','Colombia','Yemen','Kenya','Indonesia','Guatemala','Costa Rica','Rwanda','Peru'].map(c=>`<option>${c}</option>`).join('')}
          </select>
        </div>
        <div class="fg"><label class="fl">Growing Region *</label><input name="region" class="fi" placeholder="e.g. Yirgacheffe" required/></div>
        <div class="fg"><label class="fl">Warehouse Humidity (% RH) — IoT</label><input name="warehouseHumidity" type="number" min="0" max="100" step="0.1" class="fi" placeholder="50–60% = SCA Gold"/></div>
        <div class="fg"><label class="fl">Warehouse Temperature (°C) — IoT</label><input name="warehouseTemp" type="number" min="0" max="50" step="0.1" class="fi" placeholder="e.g. 18"/></div>
      </div>
      <button type="submit" class="btn btn-green" style="width:100%;justify-content:center;padding:11px;font-size:12px"><i class="fa fa-paper-plane"></i>SUBMIT REGISTRATION</button>
    </form>
  </div>`
  return c.html(exchangeLayout('Register Vendor', 'vreg', content))
})

// ── POST /vendor/register ─────────────────────────────────────────────────────
app.post('/vendor/register', async (c) => {
  try {
    const b  = await c.req.parseBody()
    const rh = parseFloat(b.warehouseHumidity as string)
    const tp = parseFloat(b.warehouseTemp as string)
    const id = `VND-${String(globalVendors.length+1).padStart(3,'0')}`
    globalVendors.push({
      id, companyName: String(b.companyName||'').trim(),
      contactName: String(b.contactName||'').trim(), contactEmail: String(b.contactEmail||'').trim(),
      country: String(b.country||'').trim(), region: String(b.region||'').trim(),
      warehouseHumidity: isNaN(rh)?undefined:rh, warehouseTemp: isNaN(tp)?undefined:tp,
      status: 'PENDING_REVIEW', registeredAt: new Date().toISOString(),
    })
    return c.redirect('/vendor/register?msg=ok')
  } catch { return c.redirect('/vendor/register?msg=error') }
})

// ── GET /vendor/lots/new ──────────────────────────────────────────────────────
app.get('/vendor/lots/new', (c) => {
  const msg = c.req.query('msg')
  const verifiedVendors = globalVendors.filter(v=>v.status==='VERIFIED')
  const content = `
  <div class="pg-title"><i class="fa fa-seedling" style="color:var(--green)"></i>List a New Lot</div>
  <div class="pg-sub">Submit your green coffee lot to the Qabban Global Exchange catalog</div>
  ${msg==='ok'?`<div class="alert al-green"><i class="fa fa-check"></i>Lot listed! Visible in catalog.</div>`:''}
  ${verifiedVendors.length===0?`<div class="alert al-amber"><i class="fa fa-warning"></i>No verified vendors yet.</div>`:''}
  <div class="card" style="max-width:680px">
    <form method="POST" action="/vendor/lots/new">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fg">
          <label class="fl">Vendor *</label>
          <select name="vendorId" class="fs" required>
            <option value="">Select…</option>
            ${verifiedVendors.map(v=>`<option value="${v.id}">${v.companyName} (${v.country})</option>`).join('')}
          </select>
        </div>
        <div class="fg"><label class="fl">Origin *</label><input name="origin" class="fi" placeholder="e.g. Ethiopia Yirgacheffe" required/></div>
        <div class="fg"><label class="fl">Variety *</label><input name="variety" class="fi" required/></div>
        <div class="fg">
          <label class="fl">Process *</label>
          <select name="process" class="fs" required>
            ${['Natural','Washed','Honey','Wet-Hulled','Anaerobic','Other'].map(p=>`<option>${p}</option>`).join('')}
          </select>
        </div>

        <!-- Dual-Track Toggle -->
        <div class="fg" style="grid-column:1/-1">
          <label class="fl">Marketplace Type *</label>
          <div style="display:flex;gap:10px">
            <label style="flex:1;cursor:pointer">
              <input type="radio" name="marketplaceType" value="SPOT" checked style="accent-color:var(--green)"/>
              <span class="track-spot" style="margin-left:6px">⚡ SPOT</span>
              <div style="font-size:10px;color:var(--muted);margin-top:3px;padding-left:22px">Immediate dispatch · 100% payment on contract</div>
            </label>
            <label style="flex:1;cursor:pointer">
              <input type="radio" name="marketplaceType" value="FORWARD" style="accent-color:var(--amber)"/>
              <span class="track-fwd" style="margin-left:6px">🌱 FORWARD</span>
              <div style="font-size:10px;color:var(--muted);margin-top:3px;padding-left:22px">Pre-harvest order · 30% deposit · milestone payments</div>
            </label>
          </div>
        </div>

        <div class="fg"><label class="fl">Green Weight (kg) *</label><input name="greenWeightKg" type="number" min="1" class="fi" required/></div>
        <div class="fg"><label class="fl">FOB Price (USD/kg) *</label><input name="fobPriceUsd" type="number" min="0.01" step="0.01" class="fi" required/></div>
        <div class="fg"><label class="fl">SCA Grade Score</label><input name="gradeScore" type="number" min="60" max="100" class="fi" placeholder="80–100"/></div>
        <div class="fg"><label class="fl">Harvest Year</label><input name="harvestYear" type="number" min="2024" max="2030" class="fi" placeholder="2025"/></div>
        <div class="fg"><label class="fl">Expected Harvest Date (FORWARD)</label><input name="harvestDate" type="date" class="fi"/></div>
        <div class="fg">
          <label class="fl">SAS Clause</label>
          <select name="sasClause" class="fs">
            <option value="false">No SAS — contract confirmed on signing</option>
            <option value="true">Yes — Subject to Approval of Sample</option>
          </select>
        </div>
        <div class="fg"><label class="fl">Warehouse Humidity (% RH) — IoT</label><input name="warehouseHumidity" type="number" min="0" max="100" step="0.1" class="fi" placeholder="50–60% earns SCA Gold badge"/></div>
        <div class="fg"><label class="fl">Warehouse Temp (°C) — IoT</label><input name="warehouseTemp" type="number" min="0" max="50" step="0.1" class="fi"/></div>
        <div class="fg"><label class="fl">Ship to KSA (est. days)</label><input name="shipmentDays" type="number" min="1" max="90" class="fi" placeholder="21"/></div>
        <div class="fg" style="grid-column:1/-1\"><label class="fl">Flavor Notes (comma-separated)</label><input name="flavorNotes" class="fi" placeholder="e.g. Blueberry, Jasmine, Dark Chocolate"/></div>
      </div>
      <div style="font-size:10px;color:var(--muted);font-family:var(--mono);margin-bottom:16px">50–60% RH → SCA Gold Storage badge awarded automatically</div>

      <!-- ── SFDA Sack Label Photo Upload (Article 18 Traceability) ── -->
      <div style="border:1px solid rgba(96,165,250,.3);border-radius:8px;padding:16px 18px;margin-bottom:18px;background:rgba(96,165,250,.04)">
        <div style="font-size:11px;font-weight:700;color:var(--blue);margin-bottom:6px;letter-spacing:.05em">
          <i class="fa fa-shield-halved"></i> SFDA AUDIT SHIELD — Sack Label Photo
        </div>
        <div style="font-size:10px;color:var(--muted);font-family:var(--mono);margin-bottom:12px;line-height:1.8">
          Upload a photo of the sack label for <strong style="color:var(--text)">SFDA Article 18</strong> traceability compliance.
          Accepted formats: JPG, PNG, WEBP (max ~4 MB). This image will be stored as <code style="color:var(--blue)">sfdaLabelUrl</code>
          and displayed in the catalog and audit reports.
        </div>

        <!-- Drop-zone / file input -->
        <div id="sfda-dropzone" onclick="document.getElementById('sfda-file-input').click()"
             style="border:2px dashed rgba(96,165,250,.4);border-radius:8px;padding:24px;text-align:center;cursor:pointer;background:rgba(255,255,255,.02);transition:border-color .2s"
             ondragover="event.preventDefault();this.style.borderColor='var(--blue)'"
             ondragleave="this.style.borderColor='rgba(96,165,250,.4)'"
             ondrop="handleSfdaDrop(event)">
          <i class="fa fa-camera" style="font-size:22px;color:var(--blue);display:block;margin-bottom:8px"></i>
          <div style="font-size:11px;color:var(--muted)">Drop sack label photo here, or <strong style="color:var(--blue)">click to browse</strong></div>
          <div style="font-size:9px;color:var(--muted);margin-top:4px;font-family:var(--mono)">SFDA Article 18 compliance — Label_Image_URL</div>
        </div>
        <input id="sfda-file-input" type="file" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="handleSfdaFile(this.files[0])"/>
        <input id="sfda-data-input" name="sfdaLabelUrl" type="hidden"/>

        <!-- Preview area -->
        <div id="sfda-preview-wrap" style="display:none;margin-top:12px">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <img id="sfda-preview-img" src="" alt="Label preview"
                 style="width:120px;height:80px;object-fit:cover;border-radius:6px;border:1px solid rgba(96,165,250,.3)"/>
            <div style="flex:1">
              <div style="font-size:10px;color:var(--green);font-family:var(--mono);margin-bottom:4px">
                <i class="fa fa-check-circle"></i> <strong>Sack label photo loaded</strong>
              </div>
              <div id="sfda-file-name" style="font-size:9px;color:var(--muted);font-family:var(--mono)"></div>
              <div id="sfda-file-size" style="font-size:9px;color:var(--muted);font-family:var(--mono)"></div>
              <div style="font-size:9px;color:var(--blue);font-family:var(--mono);margin-top:4px">
                <i class="fa fa-shield-halved"></i> SFDA Article 18 traceability — Label_Image_URL stored
              </div>
              <button type="button" onclick="clearSfdaPhoto()" style="margin-top:6px;font-size:9px;color:var(--red);background:none;border:none;cursor:pointer;font-family:var(--mono);padding:0">
                <i class="fa fa-trash"></i> Remove photo
              </button>
            </div>
          </div>
        </div>
        <div id="sfda-err" style="display:none;margin-top:8px;font-size:10px;color:var(--red);font-family:var(--mono)"></div>
      </div>

      <button type="submit" class="btn btn-green" style="width:100%;justify-content:center;padding:11px"><i class="fa fa-plus"></i>LIST LOT ON EXCHANGE</button>
    </form>
  </div>

  <script>
    function handleSfdaDrop(e){
      e.preventDefault();
      document.getElementById('sfda-dropzone').style.borderColor='rgba(96,165,250,.4)';
      const file = e.dataTransfer.files[0];
      if(file) handleSfdaFile(file);
    }
    function handleSfdaFile(file){
      if(!file) return;
      const err = document.getElementById('sfda-err');
      err.style.display='none';
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
        err.textContent='Error: only JPG, PNG, or WEBP images are accepted.';
        err.style.display='block'; return;
      }
      if(file.size > 4.5*1024*1024){
        err.textContent='Error: image is too large (max ~4 MB).';
        err.style.display='block'; return;
      }
      const reader = new FileReader();
      reader.onload = function(ev){
        const data = ev.target.result;
        document.getElementById('sfda-data-input').value = data;
        document.getElementById('sfda-preview-img').src = data;
        document.getElementById('sfda-file-name').textContent = 'File: ' + file.name;
        document.getElementById('sfda-file-size').textContent = 'Size: ' + (file.size/1024).toFixed(1) + ' KB';
        document.getElementById('sfda-preview-wrap').style.display='block';
        document.getElementById('sfda-dropzone').style.display='none';
      };
      reader.readAsDataURL(file);
    }
    function clearSfdaPhoto(){
      document.getElementById('sfda-data-input').value='';
      document.getElementById('sfda-preview-img').src='';
      document.getElementById('sfda-preview-wrap').style.display='none';
      document.getElementById('sfda-dropzone').style.display='block';
      document.getElementById('sfda-file-input').value='';
    }
  </script>`
  return c.html(exchangeLayout('List New Lot', 'vnew', content))
})

// ── POST /vendor/lots/new ─────────────────────────────────────────────────────
app.post('/vendor/lots/new', async (c) => {
  try {
    const b   = await c.req.parseBody()
    const rh  = parseFloat(b.warehouseHumidity as string)
    const tp  = parseFloat(b.warehouseTemp as string)
    const sca = !isNaN(rh) && rh>=50 && rh<=60
    const id  = `GLOT-${String(globalLots.length+1).padStart(3,'0')}`
    const mkt = (b.marketplaceType as string)==='FORWARD'?'FORWARD':'SPOT'
    const notes = String(b.flavorNotes||'').split(',').map(s=>s.trim()).filter(Boolean)
    // SFDA sack-label photo
    let sfdaLabel: string|undefined = undefined
    const rawLabel = b.sfdaLabelUrl as string | undefined
    if (rawLabel && typeof rawLabel === 'string' && rawLabel.startsWith('data:image/')) {
      const ok = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]{1,5500000}$/.test(rawLabel)
      if (ok) sfdaLabel = rawLabel
    }
    const newLot: GlobalLot = {
      id, vendorId: String(b.vendorId), origin: String(b.origin||'').trim(),
      variety: String(b.variety||'').trim(), process: (b.process as any)||'Other',
      greenWeightKg: parseFloat(b.greenWeightKg as string)||0,
      fobPriceUsd: parseFloat(b.fobPriceUsd as string)||0,
      gradeScore: parseFloat(b.gradeScore as string)||80,
      flavorNotes: notes.length?notes:['—'],
      harvestYear: parseInt(b.harvestYear as string)||new Date().getFullYear(),
      marketplaceType: mkt, sasClause: b.sasClause==='true', depositPct: mkt==='FORWARD'?30:100,
      harvestDate: mkt==='FORWARD'&&b.harvestDate?String(b.harvestDate):undefined,
      warehouseHumidity: isNaN(rh)?undefined:rh, warehouseTemp: isNaN(tp)?undefined:tp,
      scaGoldStorage: sca, climateCertifiedAt: sca?new Date().toISOString():undefined,
      climateLog: [{
        ts: new Date().toISOString(), location: `Origin Warehouse — ${String(b.origin||'')}`,
        phase: 'ORIGIN', humidity: isNaN(rh)?55:rh, temp: isNaN(tp)?20:tp,
        note: 'Initial listing climate check',
      }],
      sfdaLabelUrl: sfdaLabel,
      status: 'AVAILABLE', listedAt: new Date().toISOString(),
      shipmentEstimateDays: parseInt(b.shipmentDays as string)||21, customsHsCode: '0901.11',
    }
    globalLots.push(newLot)
    return c.redirect('/vendor/lots/new?msg=ok')
  } catch { return c.redirect('/vendor/lots/new?msg=error') }
})

// ── GET /buyer ────────────────────────────────────────────────────────────────
app.get('/buyer', (c) => {
  const content = `
  <div class="pg-title"><i class="fa fa-handshake" style="color:var(--amber)"></i>Buyer Portal</div>
  <div class="pg-sub">Saudi roasteries · Browse lots · Contract · Live ship tracking · ZATCA invoices</div>
  <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
    <a href="/buyer/register" class="btn btn-amber"><i class="fa fa-plus"></i>Register Buyer</a>
    <a href="/exchange/catalog" class="btn btn-green"><i class="fa fa-list"></i>Browse Catalog</a>
    <a href="/buyer/contract" class="btn btn-blue"><i class="fa fa-file-contract"></i>New Contract</a>
  </div>

  <div class="card">
    <div class="card-hdr"><i class="fa fa-building" style="color:var(--amber)"></i>Registered Saudi Roasteries</div>
    <table class="tbl">
      <thead><tr><th>ID</th><th>Roastery</th><th>City</th><th>Contact</th><th>VAT</th><th>Status</th></tr></thead>
      <tbody>
        ${globalBuyers.map(b=>`<tr>
          <td style="font-family:var(--mono);color:var(--amber)">${b.id}</td>
          <td><strong>${b.roasteryName}</strong></td><td>${b.city}</td>
          <td style="font-size:11px"><div>${b.contactName}</div><div style="color:var(--muted)">${b.contactEmail}</div></td>
          <td style="font-family:var(--mono);font-size:10px">${b.vatNumber}</td>
          <td><span class="badge b-green">${b.status}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Spot Contracts -->
  <div class="card">
    <div class="card-hdr"><i class="fa fa-bolt" style="color:var(--green)"></i>Spot Contracts</div>
    ${globalContracts.length===0
      ?`<div style="font-size:12px;color:var(--muted)">No spot contracts yet. <a href="/exchange/catalog?type=SPOT" style="color:var(--green)">Browse Spot lots →</a></div>`
      :`<table class="tbl"><thead><tr><th>ID</th><th>Lot</th><th>Buyer</th><th>Qty kg</th><th>FOB USD</th><th>Date</th><th>Status</th><th>Invoice</th></tr></thead><tbody>
      ${globalContracts.map(con=>{
        const lot=globalLots.find(l=>l.id===con.lotId); const buyer=globalBuyers.find(b=>b.id===con.buyerId)
        const inv=zatcaInvoices.find(i=>i.lotId===con.lotId)
        return `<tr>
          <td style="font-family:var(--mono);color:var(--green)">${con.id}</td>
          <td style="font-size:11px">${lot?.origin??con.lotId}</td>
          <td style="font-size:11px">${buyer?.roasteryName??con.buyerId}</td>
          <td style="font-family:var(--mono)">${con.quantityKg.toLocaleString()}</td>
          <td style="font-family:var(--mono);color:var(--amber)">$${con.agreedFobUsd.toFixed(2)}</td>
          <td style="font-size:10px;font-family:var(--mono)">${con.contractedAt.slice(0,10)}</td>
          <td><span class="badge b-green">${con.status}</span></td>
          <td>${inv?`<a href="/buyer/invoice/${inv.uuid}" class="btn btn-blue" style="font-size:9px;padding:3px 7px"><i class="fa fa-receipt"></i>View</a>`:'—'}</td>
        </tr>`}).join('')}
      </tbody></table>`}
  </div>

  <!-- Forward Contracts -->
  <div class="card">
    <div class="card-hdr"><i class="fa fa-seedling" style="color:var(--amber)"></i>Forward Pre-orders</div>
    ${forwardContracts.length===0
      ?`<div style="font-size:12px;color:var(--muted)">No forward contracts yet. <a href="/exchange/catalog?type=FORWARD" style="color:var(--amber)">Browse Forward lots →</a></div>`
      :`<table class="tbl"><thead><tr><th>ID</th><th>Lot</th><th>Buyer</th><th>Qty kg</th><th>SAS</th><th>Deposit Paid</th><th>Status</th><th>Invoice</th></tr></thead><tbody>
      ${forwardContracts.map(fc=>{
        const lot=globalLots.find(l=>l.id===fc.lotId); const buyer=globalBuyers.find(b=>b.id===fc.buyerId)
        const inv=zatcaInvoices.find(i=>i.lotId===fc.lotId)
        const paid=fc.milestones.filter(m=>m.status==='PAID')
        const sas=fc.sasStatus==='SAMPLE_APPROVED'?`<span class="badge b-green">APPROVED</span>`:
                  fc.sasStatus==='SAMPLE_REJECTED'?`<span class="badge b-red">REJECTED</span>`:
                  fc.sasStatus==='WAIVED'?`<span class="badge b-muted">WAIVED</span>`:
                  `<span class="badge b-amber">PENDING</span>`
        return `<tr>
          <td style="font-family:var(--mono);color:var(--amber)"><a href="/exchange/forward/${fc.id}" style="color:var(--amber)">${fc.id}</a></td>
          <td style="font-size:11px">${lot?.origin??fc.lotId}</td>
          <td style="font-size:11px">${buyer?.roasteryName??fc.buyerId}</td>
          <td style="font-family:var(--mono)">${fc.quantityKg.toLocaleString()}</td>
          <td>${sas}</td>
          <td style="font-size:11px;font-family:var(--mono)">${paid.length}/${fc.milestones.length} paid</td>
          <td><span class="badge b-amber">${fc.status}</span></td>
          <td style="display:flex;gap:4px;flex-wrap:wrap">
            ${inv?`<a href="/buyer/invoice/${inv.uuid}" class="btn btn-blue" style="font-size:9px;padding:3px 7px"><i class="fa fa-receipt"></i>Invoice</a>`:''}
            <a href="/exchange/forward/${fc.id}" class="btn btn-amber" style="font-size:9px;padding:3px 7px"><i class="fa fa-seedling"></i>Dashboard</a>
          </td>
        </tr>`}).join('')}
      </tbody></table>`}
  </div>`
  return c.html(exchangeLayout('Buyer Portal', 'buyer', content))
})

// ── GET /buyer/register ───────────────────────────────────────────────────────
app.get('/buyer/register', (c) => {
  const msg = c.req.query('msg')
  const content = `
  <div class="pg-title"><i class="fa fa-user-plus" style="color:var(--amber)"></i>Register as Buyer</div>
  <div class="pg-sub">Saudi roasteries — join the Qabban B2B trade network</div>
  ${msg==='ok'?`<div class="alert al-green"><i class="fa fa-check"></i>Registered! You can now contract lots.</div>`:''}
  <div class="card" style="max-width:520px">
    <form method="POST" action="/buyer/register">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fg" style="grid-column:1/-1"><label class="fl">Roastery Name *</label><input name="roasteryName" class="fi" required/></div>
        <div class="fg"><label class="fl">Contact Person *</label><input name="contactName" class="fi" required/></div>
        <div class="fg"><label class="fl">Contact Email *</label><input name="contactEmail" type="email" class="fi" required/></div>
        <div class="fg"><label class="fl">City *</label>
          <select name="city" class="fs" required>
            ${['Riyadh','Jeddah','Dammam','Makkah','Madinah','Khobar','Other'].map(c=>`<option>${c}</option>`).join('')}
          </select>
        </div>
        <div class="fg"><label class="fl">Saudi VAT Number *</label><input name="vatNumber" class="fi" placeholder="15-digit" required/></div>
      </div>
      <button type="submit" class="btn btn-amber" style="width:100%;justify-content:center;padding:11px"><i class="fa fa-paper-plane"></i>REGISTER</button>
    </form>
  </div>`
  return c.html(exchangeLayout('Register Buyer', 'breg', content))
})

// ── POST /buyer/register ──────────────────────────────────────────────────────
app.post('/buyer/register', async (c) => {
  try {
    const b  = await c.req.parseBody()
    const id = `BYR-${String(globalBuyers.length+1).padStart(3,'0')}`
    globalBuyers.push({
      id, roasteryName: String(b.roasteryName||'').trim(),
      contactName: String(b.contactName||'').trim(), contactEmail: String(b.contactEmail||'').trim(),
      city: String(b.city||'Riyadh'), vatNumber: String(b.vatNumber||'').trim(),
      status: 'ACTIVE', registeredAt: new Date().toISOString(),
    })
    return c.redirect('/buyer/register?msg=ok')
  } catch { return c.redirect('/buyer/register?msg=error') }
})

// ── GET /buyer/contract — Contract form (Spot + Forward) ─────────────────────
app.get('/buyer/contract', (c) => {
  const lotId = c.req.query('lotId')
  const lot   = lotId ? globalLots.find(l=>l.id===lotId) : null
  const msg   = c.req.query('msg')
  const isLockPage = c.req.query('lock') === '1'

  const effRate = lastKnownUsdToSar*(1+exchangeRateBuffer/100)

  // Check for active rate lock for demo buyer
  const demoBuyerId = globalBuyers[0]?.id ?? 'BYR-001'
  const activeLock  = lot ? getActiveLock(demoBuyerId, lot.id) : undefined
  const lockSecsLeft = activeLock
    ? Math.max(0, Math.round((new Date(activeLock.expiresAt).getTime()-Date.now())/1000))
    : 0

  const content = `
  <div class="pg-title"><i class="fa fa-file-contract" style="color:var(--purple)"></i>${lot?.marketplaceType==='FORWARD'?'Forward Pre-order':'Spot Order'} Contract</div>
  <div class="pg-sub">Lock rate · Calculate landed cost · Generate ZATCA Phase-2 invoice</div>

  ${msg==='ok'?`<div class="alert al-green"><i class="fa fa-check"></i>Contract created! ZATCA invoice generated. <a href="/buyer" style="color:var(--green)">View in Buyer Portal →</a></div>`:''}
  ${msg==='sold'?`<div class="alert al-red"><i class="fa fa-warning"></i>This lot has already been contracted.</div>`:''}

  <!-- Rate Lock Panel -->
  <div class="ratelock-box" style="margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:10px;color:var(--muted);font-family:var(--mono);margin-bottom:2px"><i class="fa fa-lock"></i> 60-SECOND RATE EXECUTION LOCK</div>
        <div style="font-size:12px;font-family:var(--mono)">
          SAMA ref: <strong>${samaReferenceRate.toFixed(4)}</strong> ·
          Buffer: <strong>+${exchangeRateBuffer}%</strong> ·
          Effective: <strong style="color:var(--amber)">${effRate.toFixed(4)} SAR/USD</strong>
        </div>
      </div>
      <div style="text-align:right">
        ${activeLock
          ? `<div class="ratelock-timer" id="lockTimer">${lockSecsLeft}s</div>
             <div style="font-size:9px;color:var(--muted);font-family:var(--mono)">Rate locked at ${activeLock.lockedRate.toFixed(4)} SAR/USD</div>`
          : `<div style="font-size:12px;color:var(--muted);font-family:var(--mono)">No active lock</div>`}
        <button onclick="lockRate()" class="btn btn-amber" style="margin-top:6px;font-size:10px"><i class="fa fa-lock"></i>LOCK RATE (60s)</button>
      </div>
    </div>
  </div>

  <div class="card" style="max-width:680px">
    <form method="POST" action="/buyer/contract">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fg">
          <label class="fl">Select Lot *</label>
          <select name="lotId" class="fs" required onchange="onLotChange(this.value)">
            <option value="">Select lot…</option>
            ${globalLots.filter(l=>l.status==='AVAILABLE').map(l=>`
              <option value="${l.id}" ${lot?.id===l.id?'selected':''}>
                ${l.id} [${l.marketplaceType}] — ${l.origin} (${l.greenWeightKg}kg @ $${l.fobPriceUsd}/kg)
              </option>`).join('')}
          </select>
        </div>
        <div class="fg">
          <label class="fl">Buyer *</label>
          <select name="buyerId" class="fs" required>
            <option value="">Select buyer…</option>
            ${globalBuyers.filter(b=>b.status==='ACTIVE').map(b=>`<option value="${b.id}">${b.roasteryName} (${b.city})</option>`).join('')}
          </select>
        </div>
        <div class="fg"><label class="fl">Quantity (kg) *</label><input name="quantityKg" id="qtyInput" type="number" min="1" class="fi" required oninput="updateCalc()"/></div>
        <div class="fg"><label class="fl">Agreed FOB Price (USD/kg) *</label><input name="agreedFobUsd" id="fobInput" type="number" min="0.01" step="0.01" class="fi" value="${lot?.fobPriceUsd??''}" required oninput="updateCalc()"/></div>
      </div>

      <!-- Forward-specific: SAS + milestones -->
      <div id="fwdSection" style="display:${lot?.marketplaceType==='FORWARD'?'block':'none'}">
        <div class="sas-box" style="margin-bottom:12px">
          <div style="color:var(--purple);font-weight:700;margin-bottom:6px"><i class="fa fa-file-signature"></i> SAS — Subject to Approval of Sample</div>
          <div id="sasCopy" style="font-size:11px">${lot?.sasClause?`This lot carries a SAS clause. The contract becomes binding only after the buyer's Q.C. team approves a physical sample. Sample to be dispatched within 7 days of contract signing.`:`No SAS clause on this lot.`}</div>
        </div>
        <div style="padding:12px 14px;background:rgba(245,158,11,.05);border:1px dashed rgba(245,158,11,.3);border-radius:var(--radius);margin-bottom:12px">
          <div style="font-size:10px;color:var(--amber);font-family:var(--mono);font-weight:700;margin-bottom:8px"><i class="fa fa-calendar-check"></i> MILESTONE PAYMENT SCHEDULE</div>
          <div class="milestone-step">
            <div class="ms-dot" style="background:rgba(245,158,11,.2);color:var(--amber)">1</div>
            <div><div style="font-size:12px;font-weight:600">Deposit (30%)</div><div style="font-size:10px;color:var(--muted)">Due on contract signing — locks the lot and triggers sample dispatch</div></div>
            <div id="m1-amt" style="margin-left:auto;font-family:var(--mono);font-size:12px;color:var(--amber)">—</div>
          </div>
          <div class="milestone-step">
            <div class="ms-dot" style="background:rgba(96,165,250,.15);color:var(--blue)">2</div>
            <div><div style="font-size:12px;font-weight:600">Pre-shipment (40%)</div><div style="font-size:10px;color:var(--muted)">Due on shipping confirmation + B/L upload</div></div>
            <div id="m2-amt" style="margin-left:auto;font-family:var(--mono);font-size:12px;color:var(--blue)">—</div>
          </div>
          <div class="milestone-step">
            <div class="ms-dot" style="background:rgba(74,222,128,.15);color:var(--green)">3</div>
            <div><div style="font-size:12px;font-weight:600">On delivery (30%)</div><div style="font-size:10px;color:var(--muted)">Due on delivery confirmation at KSA warehouse</div></div>
            <div id="m3-amt" style="margin-left:auto;font-family:var(--mono);font-size:12px;color:var(--green)">—</div>
          </div>
        </div>
      </div>

      <!-- Live Landed Calculator -->
      <div style="margin:14px 0;padding:13px;background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.18);border-radius:6px">
        <div style="font-size:9px;font-family:var(--mono);color:var(--amber);margin-bottom:8px;letter-spacing:.08em"><i class="fa fa-calculator"></i> LIVE LANDED PRICE CALCULATOR</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;font-size:11px;font-family:var(--mono)">
          <div><span style="color:var(--muted)">FOB SAR/kg:</span><br><strong id="lc-fob">—</strong></div>
          <div><span style="color:var(--muted)">Shipping:</span><br><strong id="lc-ship">—</strong></div>
          <div><span style="color:var(--muted)">Customs 5%:</span><br><strong id="lc-customs">—</strong></div>
          <div><span style="color:var(--muted)">VAT 15%:</span><br><strong id="lc-vat" style="color:var(--red)">—</strong></div>
          <div><span style="color:var(--muted)">Landed/kg:</span><br><strong id="lc-perkg" style="color:var(--green);font-size:14px">—</strong></div>
          <div><span style="color:var(--muted)">Total:</span><br><strong id="lc-total" style="color:var(--green)">—</strong></div>
        </div>
      </div>

      <div style="font-family:var(--mono);font-size:9px;color:var(--muted);margin-bottom:12px;padding:9px;background:rgba(74,222,128,.03);border:1px dashed rgba(74,222,128,.18);border-radius:4px">
        <strong style="color:var(--green)">ZATCA Phase-2:</strong> Submitting generates a UUID v4 · UBL 2.1 XML · TLV QR code (ZATCA e-Invoice spec).
        Rate: ${samaReferenceRate.toFixed(4)} SAR/USD (SAMA) + ${exchangeRateBuffer}% buffer = <strong>${effRate.toFixed(4)} SAR/USD</strong>
      </div>

      <button type="submit" class="btn btn-green" style="width:100%;justify-content:center;padding:11px;font-size:12px">
        <i class="fa fa-file-invoice"></i>CREATE CONTRACT &amp; GENERATE ZATCA INVOICE
      </button>
    </form>
  </div>

  <script>
  var LOTS = ${JSON.stringify(globalLots.map(l=>({id:l.id,fob:l.fobPriceUsd,kg:l.greenWeightKg,type:l.marketplaceType,sas:l.sasClause,dep:l.depositPct})))};
  var EFF  = ${effRate};
  var SHIP = ${shippingEstimateBaseSar};
  var CUS  = ${SAUDI_CUSTOMS_RATE};
  var VAT  = ${ZATCA_VAT_RATE};

  function onLotChange(id) {
    var l = LOTS.find(function(x){return x.id===id;});
    if(!l) return;
    document.getElementById('fobInput').value = l.fob;
    document.getElementById('fwdSection').style.display = l.type==='FORWARD'?'block':'none';
    if(l.type==='FORWARD'){
      document.getElementById('sasCopy').textContent = l.sas
        ? 'This lot carries a SAS clause. Contract binding only after buyer Q.C. approves physical sample.'
        : 'No SAS clause on this lot.';
    }
    updateCalc();
  }

  function updateCalc() {
    var fob = parseFloat(document.getElementById('fobInput').value);
    var qty = parseFloat(document.getElementById('qtyInput').value);
    if(isNaN(fob)||isNaN(qty)||qty<=0) return;
    var fobSar  = fob * EFF;
    var fobTot  = fobSar * qty;
    var cif     = fobTot + SHIP;
    var customs = Math.round(cif * CUS * 100)/100;
    var vat     = Math.round((cif+customs) * VAT * 100)/100;
    var total   = Math.round((fobTot+SHIP+customs+vat)*100)/100;
    var perKg   = Math.round(total/qty*100)/100;
    var fmt = function(n){return n.toLocaleString('en-SA',{minimumFractionDigits:2,maximumFractionDigits:2});};
    document.getElementById('lc-fob').textContent     = fmt(fobSar)+' SAR/kg';
    document.getElementById('lc-ship').textContent    = fmt(SHIP)+' SAR';
    document.getElementById('lc-customs').textContent = fmt(customs)+' SAR';
    document.getElementById('lc-vat').textContent     = fmt(vat)+' SAR';
    document.getElementById('lc-perkg').textContent   = perKg.toFixed(2)+' SAR/kg';
    document.getElementById('lc-total').textContent   = fmt(total)+' SAR';
    // Milestones
    var dep   = Math.round(total*0.30*100)/100;
    var pre   = Math.round(total*0.40*100)/100;
    var deliv = Math.round(total*0.30*100)/100;
    var m1=document.getElementById('m1-amt'),m2=document.getElementById('m2-amt'),m3=document.getElementById('m3-amt');
    if(m1)m1.textContent=fmt(dep)+' SAR';
    if(m2)m2.textContent=fmt(pre)+' SAR';
    if(m3)m3.textContent=fmt(deliv)+' SAR';
  }

  /* Rate Lock */
  var _lockEnd = null;
  var _lockTimer = null;
  function lockRate() {
    var lotSel = document.querySelector('select[name="lotId"]');
    var lotId  = lotSel ? lotSel.value : '';
    if(!lotId){ alert('Select a lot first'); return; }
    fetch('/api/exchange/rate-lock', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({buyerId:'BYR-001', lotId: lotId})
    }).then(function(r){return r.json();}).then(function(d){
      if(d.ok){
        _lockEnd = new Date(d.lock.expiresAt).getTime();
        startCountdown(d.lock.lockedRate);
      }
    });
  }

  function startCountdown(rate) {
    var el = document.getElementById('lockTimer');
    if(!el){ var box=document.querySelector('.ratelock-box');
      var div=document.createElement('div');
      div.innerHTML='<div class="ratelock-timer" id="lockTimer">60s</div><div style="font-size:9px;color:var(--muted);font-family:var(--mono)">Rate locked at '+rate.toFixed(4)+' SAR/USD</div>';
      box.querySelector('[onclick="lockRate()"]').parentElement.insertBefore(div,box.querySelector('[onclick="lockRate()"]').parentElement.lastChild);
      el = document.getElementById('lockTimer');
    }
    if(_lockTimer) clearInterval(_lockTimer);
    _lockTimer = setInterval(function(){
      var s = Math.max(0, Math.round((_lockEnd - Date.now())/1000));
      el.textContent = s+'s';
      el.style.color = s <= 10 ? 'var(--red)' : 'var(--amber)';
      if(s===0){ clearInterval(_lockTimer); el.textContent='EXPIRED'; el.style.color='var(--muted)'; }
    }, 500);
  }

  // Auto-fill if lot is pre-selected
  (function(){
    var sel = document.querySelector('select[name="lotId"]');
    if(sel && sel.value) onLotChange(sel.value);
  })();
  </script>`

  return c.html(exchangeLayout('Contract a Lot', 'bcon', content))
})

// ── POST /buyer/contract ──────────────────────────────────────────────────────
app.post('/buyer/contract', async (c) => {
  try {
    const b     = await c.req.parseBody()
    const lotId = String(b.lotId)
    const buyId = String(b.buyerId)
    const qty   = parseFloat(b.quantityKg as string)
    const fob   = parseFloat(b.agreedFobUsd as string)
    const lot   = globalLots.find(l=>l.id===lotId)
    const buyer = globalBuyers.find(b=>b.id===buyId)
    if (!lot||lot.status!=='AVAILABLE') return c.redirect('/buyer/contract?msg=sold')
    if (!buyer) return c.redirect('/buyer/contract?msg=error')
    lot.status = 'CONTRACTED'; lot.contractedByBuyerId = buyId
    const landed  = calcLandedPrice(lot, qty)
    const invoice = generateZatcaInvoice({ buyer, lot, quantityKg: qty, unitPriceSar: landed.landedPricePerKg })

    if (lot.marketplaceType === 'FORWARD') {
      const conId = `FWD-${String(forwardContracts.length+1).padStart(3,'0')}`
      const total = landed.landedPriceSar
      const fwdCon: ForwardContract = {
        id: conId, lotId, buyerId: buyId, quantityKg: qty, agreedFobUsd: fob,
        contractedAt: new Date().toISOString(),
        sasStatus: lot.sasClause ? 'PENDING_SAMPLE' : 'WAIVED',
        milestones: [
          { id:'M1', label:`Deposit (30%)`,       pct:30, dueEvent:'Contract signing',       status:'PENDING' },
          { id:'M2', label:`Pre-shipment (40%)`,   pct:40, dueEvent:'Shipping confirmation', status:'PENDING' },
          { id:'M3', label:`On delivery (30%)`,    pct:30, dueEvent:'Delivery confirmation', status:'PENDING' },
        ],
        status: 'ACTIVE', invoiceId: invoice.uuid,
      }
      forwardContracts.push(fwdCon)
    } else {
      const conId = `CON-${String(globalContracts.length+1).padStart(3,'0')}`
      globalContracts.push({ id:conId, lotId, buyerId:buyId, quantityKg:qty, agreedFobUsd:fob,
        contractedAt:new Date().toISOString(), status:'ACTIVE', invoiceId:invoice.uuid })
    }
    return c.redirect('/buyer/contract?msg=ok')
  } catch { return c.redirect('/buyer/contract?msg=error') }
})

// ── GET /buyer/invoice/:uuid — ZATCA Invoice Viewer ──────────────────────────
app.get('/buyer/invoice/:uuid', (c) => {
  const uuid    = c.req.param('uuid')
  const invoice = zatcaInvoices.find(i=>i.uuid===uuid)
  if (!invoice) return c.html(exchangeLayout('Invoice Not Found', 'buyer',
    `<div class="alert al-red"><i class="fa fa-warning"></i>Invoice not found.</div>
     <a href="/buyer" class="btn btn-blue">← Back</a>`))

  const content = `
  <div class="pg-title"><i class="fa fa-receipt" style="color:var(--green)"></i>ZATCA Phase-2 E-Invoice</div>
  <div class="pg-sub" style="font-family:var(--mono);color:var(--green)">${invoice.uuid}</div>

  <div style="display:grid;grid-template-columns:1fr 220px;gap:18px;align-items:start;flex-wrap:wrap">
    <div>
      <div class="card" style="border-color:rgba(74,222,128,.25)">
        <div class="card-hdr"><i class="fa fa-file-invoice" style="color:var(--green)"></i>Invoice Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:11px;font-family:var(--mono)">
          <div><span style="color:var(--muted)">Invoice #:</span><br><strong style="color:var(--green)">${invoice.invoiceNumber}</strong></div>
          <div><span style="color:var(--muted)">Issue Date/Time:</span><br><strong>${invoice.issueDate} ${invoice.issueTime}</strong></div>
          <div><span style="color:var(--muted)">Seller:</span><br><strong>${invoice.sellerName}</strong><br><span style="color:var(--muted)">VAT: ${invoice.sellerVat}</span></div>
          <div><span style="color:var(--muted)">Buyer:</span><br><strong>${invoice.buyerName}</strong><br><span style="color:var(--muted)">VAT: ${invoice.buyerVat}</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-hdr"><i class="fa fa-seedling" style="color:var(--amber)"></i>Line Item</div>
        <div style="font-size:12px;font-family:var(--mono);margin-bottom:12px"><strong>${invoice.origin}</strong> · Lot ${invoice.lotId}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;font-size:11px;font-family:var(--mono)">
          <div><span style="color:var(--muted)">Qty:</span><br><strong>${invoice.quantityKg.toLocaleString()} kg</strong></div>
          <div><span style="color:var(--muted)">Unit:</span><br><strong>${invoice.unitPriceSar.toFixed(2)} SAR/kg</strong></div>
          <div><span style="color:var(--muted)">Subtotal:</span><br><strong>${invoice.subtotalSar.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR</strong></div>
          <div><span style="color:var(--muted)">VAT 15%:</span><br><strong style="color:var(--red)">${invoice.vatAmountSar.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR</strong></div>
          <div><span style="color:var(--muted)">TOTAL:</span><br><strong style="color:var(--green);font-size:15px">${invoice.totalSar.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR</strong></div>
        </div>
      </div>
      <div class="card">
        <div class="card-hdr"><i class="fa fa-code" style="color:var(--blue)"></i>UBL 2.1 XML Payload
          <a href="/buyer/invoice/${invoice.uuid}/xml" class="btn btn-blue" style="margin-left:auto;font-size:9px;padding:3px 8px"><i class="fa fa-download"></i>Download XML</a>
        </div>
        <pre style="font-size:9px;font-family:var(--mono);color:var(--muted);overflow-x:auto;max-height:220px;line-height:1.5;white-space:pre-wrap">${invoice.xmlPayload.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
      </div>
    </div>

    <!-- QR + Compliance -->
    <div>
      <div class="card" style="border-color:rgba(74,222,128,.25);text-align:center">
        <div style="font-size:9px;font-family:var(--mono);color:var(--green);margin-bottom:10px;letter-spacing:.1em">ZATCA QR CODE</div>
        <div style="background:#fff;padding:12px;border-radius:6px;display:inline-block;margin-bottom:8px">
          <div style="color:#000;font-size:8px;font-family:monospace;word-break:break-all;max-width:180px;line-height:1.4">${invoice.qrCodeData.slice(0,72)}…</div>
        </div>
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono)">TLV: seller · VAT · date · total · VAT amt</div>
      </div>
      <div class="card">
        <div style="font-size:9px;font-family:var(--mono);color:var(--green);margin-bottom:8px;letter-spacing:.1em">COMPLIANCE</div>
        <div style="font-size:11px;font-family:var(--mono);line-height:2;color:var(--text)">
          <div>✓ ZATCA Phase-2</div><div>✓ UUID v4</div><div>✓ UBL 2.1 XML</div>
          <div>✓ 15% VAT</div><div>✓ SAR currency</div><div>✓ TLV QR payload</div>
        </div>
      </div>
    </div>
  </div>
  <a href="/buyer" class="btn btn-blue" style="margin-top:6px">← Buyer Portal</a>`

  return c.html(exchangeLayout(`Invoice ${invoice.invoiceNumber}`, 'buyer', content))
})

// ── GET /buyer/invoice/:uuid/xml ──────────────────────────────────────────────
app.get('/buyer/invoice/:uuid/xml', (c) => {
  const invoice = zatcaInvoices.find(i=>i.uuid===c.req.param('uuid'))
  if (!invoice) return c.text('Not found',404)
  return new Response(invoice.xmlPayload, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.xml"`,
      'Cache-Control': 'no-store',
    },
  })
})

// ── GET /api/exchange/lots ────────────────────────────────────────────────────
app.get('/api/exchange/lots', (c) => {
  const typeFilter = c.req.query('type') as 'SPOT'|'FORWARD'|undefined
  const lots = (typeFilter ? globalLots.filter(l=>l.marketplaceType===typeFilter) : globalLots)
    .map(lot => ({ ...lot, landed: calcLandedPrice(lot), vendor: globalVendors.find(v=>v.id===lot.vendorId) }))
  return c.json({ lots, exchangeRate: lastKnownUsdToSar, samaRate: samaReferenceRate,
    effectiveRate: lastKnownUsdToSar*(1+exchangeRateBuffer/100), exchangeBufferPct: exchangeRateBuffer })
})

// ── GET /api/exchange/vendors ─────────────────────────────────────────────────
app.get('/api/exchange/vendors', (c) => c.json({ vendors: globalVendors }))

// ── GET /api/exchange/buyers ──────────────────────────────────────────────────
app.get('/api/exchange/buyers', (c) => c.json({ buyers: globalBuyers }))

// ── GET /api/exchange/contracts ───────────────────────────────────────────────
app.get('/api/exchange/contracts', (c) => c.json({
  spotContracts: globalContracts, forwardContracts, invoices: zatcaInvoices
}))

// ── POST /api/exchange/rate-lock — Create 60s execution lock ─────────────────
app.post('/api/exchange/rate-lock', async (c) => {
  try {
    const { buyerId, lotId } = await c.req.json()
    if (!buyerId || !lotId) return c.json({ error: 'buyerId and lotId required' }, 400)
    const lot = globalLots.find(l=>l.id===lotId)
    if (!lot||lot.status!=='AVAILABLE') return c.json({ error: 'Lot not available' }, 404)
    const lock = createRateLock(String(buyerId), String(lotId))
    return c.json({ ok: true, lock })
  } catch { return c.json({ error: 'Invalid request' }, 400) }
})

// ── GET /api/exchange/rate-lock/:id — Check lock status ──────────────────────
app.get('/api/exchange/rate-lock/:id', (c) => {
  const lock = rateLocks.find(rl=>rl.id===c.req.param('id'))
  if (!lock) return c.json({ error: 'Not found' }, 404)
  const secsLeft = Math.max(0, Math.round((new Date(lock.expiresAt).getTime()-Date.now())/1000))
  const status   = secsLeft > 0 && lock.status==='ACTIVE' ? 'ACTIVE' : 'EXPIRED'
  if (status==='EXPIRED' && lock.status==='ACTIVE') lock.status = 'EXPIRED'
  return c.json({ lock, secsLeft, status })
})

// ── POST /api/exchange/iot-update — IoT humidity push ────────────────────────
app.post('/api/exchange/iot-update', async (c) => {
  try {
    const { vendorId, warehouseHumidity, warehouseTemp } = await c.req.json()
    const vendor = globalVendors.find(v=>v.id===vendorId)
    if (!vendor) return c.json({ error: 'Vendor not found' }, 404)
    const rh = parseFloat(warehouseHumidity)
    const tp = parseFloat(warehouseTemp)
    if (isNaN(rh)||rh<0||rh>100) return c.json({ error: 'Invalid humidity' }, 400)
    vendor.warehouseHumidity = rh
    if (!isNaN(tp)) vendor.warehouseTemp = tp
    const updatedLots: string[] = []
    for (const lot of globalLots) {
      if (lot.vendorId===vendorId && lot.status==='AVAILABLE') {
        const ts = new Date().toISOString()
        lot.warehouseHumidity    = rh
        if (!isNaN(tp)) lot.warehouseTemp = tp
        lot.scaGoldStorage       = rh>=50 && rh<=60
        lot.climateCertifiedAt   = ts
        lot.climateLog.push({
          ts, location: `Origin Warehouse — IoT Update`, phase: 'ORIGIN',
          humidity: rh, temp: isNaN(tp)?lot.warehouseTemp??20:tp, note: 'Automated IoT sensor reading',
        })
        updatedLots.push(lot.id)
      }
    }
    return c.json({ ok: true, vendorId, humidity: rh, temp: isNaN(tp)?undefined:tp,
      scaGoldBadge: rh>=50&&rh<=60, updatedLots })
  } catch { return c.json({ error: 'Invalid request' }, 400) }
})

// ── GET /exchange/climate/:lotId — Digital Climate Passport Detail Page ───────
app.get('/exchange/climate/:lotId', (c) => {
  const lot = globalLots.find(l => l.id === c.req.param('lotId'))
  if (!lot) return c.html(exchangeLayout('Climate Passport', 'catalog',
    `<div class="alert al-red"><i class="fa fa-warning"></i>Lot not found.</div>
     <a href="/exchange/catalog" class="btn btn-blue">← Catalog</a>`))

  const vendor = globalVendors.find(v => v.id === lot.vendorId)
  const rhOk   = lot.warehouseHumidity != null && lot.warehouseHumidity >= 50 && lot.warehouseHumidity <= 60
  const rhClr  = !lot.warehouseHumidity ? 'var(--muted)'
                 : rhOk ? 'var(--cyan)'
                 : lot.warehouseHumidity > 70 ? 'var(--red)' : 'var(--amber)'

  // Build phase summary
  const phases = ['ORIGIN','TRANSIT','PORT','ARRIVAL'] as const
  const phaseSummary = phases.map(ph => {
    const logs = lot.climateLog.filter(cl => cl.phase === ph)
    if (!logs.length) return ''
    const avgRH   = Math.round(logs.reduce((s,l)=>s+l.humidity,0)/logs.length*10)/10
    const avgTemp = Math.round(logs.reduce((s,l)=>s+l.temp,0)/logs.length*10)/10
    const phaseIcon = ph==='ORIGIN'?'fa-seedling':ph==='TRANSIT'?'fa-ship':ph==='PORT'?'fa-anchor':'fa-warehouse'
    const phaseClr  = ph==='ORIGIN'?'var(--green)':ph==='TRANSIT'?'var(--amber)':ph==='PORT'?'var(--blue)':'var(--cyan)'
    const scaOk     = avgRH >= 50 && avgRH <= 60
    return `
    <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:6px;padding:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <i class="fa ${phaseIcon}" style="color:${phaseClr}"></i>
        <span style="font-size:10px;font-family:var(--mono);font-weight:700;color:${phaseClr};letter-spacing:.1em">${ph}</span>
        ${scaOk?`<span class="badge b-cyan" style="margin-left:auto">✓ SCA Range</span>`:`<span class="badge b-amber" style="margin-left:auto">RH ${avgRH}%</span>`}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;font-family:var(--mono)">
        <div><span style="color:var(--muted)">Avg RH:</span><br>
          <strong style="color:${scaOk?'var(--cyan)':'var(--amber)'};font-size:18px">${avgRH}%</strong></div>
        <div><span style="color:var(--muted)">Avg Temp:</span><br>
          <strong style="font-size:18px">${avgTemp}°C</strong></div>
        <div style="grid-column:1/-1"><span style="color:var(--muted)">Readings:</span> ${logs.length} log entries</div>
      </div>
    </div>`
  }).filter(Boolean).join('')

  const content = `
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;flex-wrap:wrap">
    <div class="pg-title"><i class="fa fa-passport" style="color:${lot.scaGoldStorage?'var(--cyan)':'var(--muted)'}"></i>Digital Climate Passport</div>
    ${lot.scaGoldStorage
      ? `<span class="badge b-cyan" style="font-size:11px;padding:4px 10px"><i class="fa fa-certificate"></i> SCA GOLD STORAGE CERTIFIED</span>`
      : `<span class="badge b-muted" style="font-size:11px;padding:4px 10px">STANDARD STORAGE</span>`}
  </div>
  <div class="pg-sub" style="font-family:var(--mono)">${lot.id} · ${lot.origin} · ${lot.variety} · ${vendor?.companyName??''}</div>

  <!-- Summary Strip -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px">
    <div class="stat-card" style="border-color:${rhOk?'rgba(34,211,238,.3)':'rgba(245,158,11,.2)'}">
      <div class="stat-lbl">Current RH</div>
      <div class="stat-val" style="color:${rhClr}">${lot.warehouseHumidity??'—'}%</div>
      <div class="stat-sub">${rhOk?'✓ SCA Gold threshold (50–60%)':'Outside SCA optimal range'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Current Temp</div>
      <div class="stat-val">${lot.warehouseTemp??'—'}°C</div>
      <div class="stat-sub">Origin warehouse</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Climate Logs</div>
      <div class="stat-val" style="color:var(--blue)">${lot.climateLog.length}</div>
      <div class="stat-sub">Sensor readings total</div>
    </div>
    <div class="stat-card" style="border-color:rgba(74,222,128,.2)">
      <div class="stat-lbl">Certified</div>
      <div class="stat-val" style="font-size:13px;color:var(--green)">${lot.climateCertifiedAt?.slice(0,10)??'—'}</div>
      <div class="stat-sub">${lot.scaGoldStorage?'SCA Gold verified':'Not certified'}</div>
    </div>
  </div>

  ${lot.scaGoldStorage ? `
  <div class="alert al-green" style="margin-bottom:20px">
    <i class="fa fa-certificate"></i>
    <div>
      <strong>SCA Gold Storage Certification Active</strong><br>
      <span style="font-size:11px;font-family:var(--mono)">
        IoT sensors confirm warehouse humidity remains within the SCA optimal range of 50–60% RH.
        This certification ensures maximum bean integrity, flavour preservation, and green coffee longevity.
        Certified: ${lot.climateCertifiedAt?.replace('T',' ').slice(0,16) ?? '—'}
      </span>
    </div>
  </div>` : `
  <div class="alert al-amber" style="margin-bottom:20px">
    <i class="fa fa-triangle-exclamation"></i>
    <div>
      <strong>Standard Storage</strong> — Not SCA Gold certified.<br>
      <span style="font-size:11px;font-family:var(--mono)">
        Current RH of ${lot.warehouseHumidity??'unknown'}% is outside the 50–60% optimal range.
        SCA Gold Storage badge is awarded automatically when IoT sensors report 50–60% RH.
      </span>
    </div>
  </div>`}

  <!-- Phase Summary Grid -->
  <div class="card" style="margin-bottom:18px">
    <div class="card-hdr"><i class="fa fa-chart-line" style="color:var(--cyan)"></i>Phase-by-Phase Summary</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">
      ${phaseSummary}
      ${!phaseSummary?`<div style="color:var(--muted);font-size:12px">No phase data yet.</div>`:''}
    </div>
  </div>

  <!-- Full Climate Timeline -->
  <div class="card">
    <div class="card-hdr"><i class="fa fa-timeline" style="color:var(--cyan)"></i>Full Climate Log Timeline
      <span style="margin-left:auto;font-size:10px;color:var(--muted);font-family:var(--mono)">${lot.climateLog.length} entries</span>
    </div>
    ${lot.climateLog.length === 0
      ? `<div style="font-size:12px;color:var(--muted)">No climate log entries yet.</div>`
      : `<div class="climate-timeline">
        ${[...lot.climateLog].reverse().map((cl, i) => {
          const isOk   = cl.humidity >= 50 && cl.humidity <= 60
          const isWarm = cl.humidity > 70
          const rhClrCl = isOk ? 'var(--cyan)' : isWarm ? 'var(--red)' : 'var(--amber)'
          const phClr   = cl.phase==='ORIGIN'?'cl-origin':cl.phase==='TRANSIT'?'cl-transit':cl.phase==='PORT'?'cl-port':'cl-arrival'
          return `<div class="cl-row ${phClr}">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-weight:600;font-size:12px">${cl.location}</span>
              <span class="badge b-muted" style="font-size:9px">${cl.phase}</span>
              ${isOk?`<span class="badge b-cyan" style="font-size:9px">✓ SCA Gold</span>`:''}
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;color:var(--muted);font-family:var(--mono);font-size:10px;margin-top:3px">
              <span>${cl.ts.replace('T',' ').slice(0,16)}</span>
              <span>RH: <strong style="color:${rhClrCl}">${cl.humidity}%</strong></span>
              <span>Temp: <strong style="color:var(--text)">${cl.temp}°C</strong></span>
              ${cl.note?`<span style="font-style:italic;color:var(--muted)">${cl.note}</span>`:''}
            </div>
          </div>`
        }).join('')}
      </div>`}
  </div>

  <!-- SCA Reference -->
  <div class="card" style="border-color:rgba(34,211,238,.2)">
    <div class="card-hdr"><i class="fa fa-info-circle" style="color:var(--cyan)"></i>SCA Storage Standards Reference</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;font-size:11px;font-family:var(--mono)">
      <div style="padding:10px;background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.2);border-radius:5px">
        <div style="color:var(--green);font-weight:700;margin-bottom:4px">✓ SCA Gold (50–60% RH)</div>
        <div style="color:var(--muted)">Maximum bean integrity. Flavour locked. Eligible for SCA Gold Storage badge.</div>
      </div>
      <div style="padding:10px;background:rgba(245,158,11,.05);border:1px solid rgba(245,158,11,.2);border-radius:5px">
        <div style="color:var(--amber);font-weight:700;margin-bottom:4px">⚠ Acceptable (40–70% RH)</div>
        <div style="color:var(--muted)">Acceptable storage. Some flavour degradation risk over time.</div>
      </div>
      <div style="padding:10px;background:rgba(248,113,113,.05);border:1px solid rgba(248,113,113,.2);border-radius:5px">
        <div style="color:var(--red);font-weight:700;margin-bottom:4px">✗ Risk (>70% or <30% RH)</div>
        <div style="color:var(--muted)">High mould risk (&gt;70%) or excessive drying (&lt;30%). Recall recommended.</div>
      </div>
    </div>
  </div>

  <!-- SFDA Sack Label Photo -->
  ${lot.sfdaLabelUrl ? `
  <div class="card" style="border-color:rgba(96,165,250,.3);margin-top:18px">
    <div class="card-hdr"><i class="fa fa-shield-halved" style="color:var(--blue)"></i>SFDA Audit Shield — Sack Label Photo
      <span class="badge b-blue" style="margin-left:8px;font-size:9px">Article 18 Compliant</span>
    </div>
    <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
      <img src="${lot.sfdaLabelUrl}" alt="SFDA Sack Label" onclick="window.open(this.src,'_blank')"
           style="width:160px;height:110px;object-fit:cover;border-radius:8px;border:1px solid rgba(96,165,250,.3);cursor:pointer"/>
      <div style="flex:1;font-size:11px;font-family:var(--mono)">
        <div style="color:var(--green);font-weight:700;margin-bottom:6px"><i class="fa fa-check-circle"></i> Sack label photo on record</div>
        <div style="color:var(--muted);line-height:1.8">
          <div>Lot ID: <strong style="color:var(--text)">${lot.id}</strong></div>
          <div>Origin: <strong style="color:var(--text)">${lot.origin}</strong></div>
          <div>HS Code: <strong style="color:var(--text)">${lot.customsHsCode??'0901.11'}</strong></div>
          <div>Stored as: <strong style="color:var(--blue)">sfdaLabelUrl (Label_Image_URL)</strong></div>
        </div>
        <div style="margin-top:8px;font-size:10px;color:var(--blue)">
          <i class="fa fa-info-circle"></i> SFDA Article 18 requires traceability of imported food products.
          This photo confirms the physical sack label is on record for audit purposes.
        </div>
      </div>
    </div>
  </div>` : `
  <div class="card" style="border-color:rgba(245,158,11,.2);margin-top:18px">
    <div class="card-hdr"><i class="fa fa-shield-halved" style="color:var(--amber)"></i>SFDA Audit Shield — Sack Label Photo
      <span class="badge b-amber" style="margin-left:8px;font-size:9px">No photo on record</span>
    </div>
    <div style="font-size:11px;font-family:var(--mono);color:var(--muted)">
      No sack label photo has been uploaded for this lot.
      Vendors can add an SFDA-compliant label photo via <a href="/vendor/lots/new" style="color:var(--blue)">List New Lot</a>.
    </div>
  </div>`}

  <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
    <a href="/exchange/catalog" class="btn btn-blue">← Global Catalog</a>
    <a href="/buyer/contract?lotId=${lot.id}" class="btn ${lot.marketplaceType==='SPOT'?'btn-green':'btn-amber'}">
      <i class="fa fa-file-contract"></i>${lot.marketplaceType==='SPOT'?'Order Spot':'Pre-order Forward'}
    </a>
    ${lot.shipTracker?`<a href="/exchange/shiptrack/${lot.id}" class="btn btn-blue"><i class="fa fa-ship"></i>Ship Tracker</a>`:''}
  </div>`

  return c.html(exchangeLayout(`Climate Passport — ${lot.id}`, 'catalog', content))
})

// ── GET /exchange/shiptrack/:lotId — Flexport Live Ship Tracker ───────────────
app.get('/exchange/shiptrack/:lotId', (c) => {
  const lot = globalLots.find(l => l.id === c.req.param('lotId'))
  if (!lot) return c.html(exchangeLayout('Ship Tracker', 'catalog',
    `<div class="alert al-red"><i class="fa fa-warning"></i>Lot not found.</div>
     <a href="/exchange/catalog" class="btn btn-blue">← Catalog</a>`))

  const vendor = globalVendors.find(v => v.id === lot.vendorId)
  const tracker = lot.shipTracker

  const content = `
  <div class="pg-title"><i class="fa fa-ship" style="color:var(--blue)"></i>Live Ship Tracker</div>
  <div class="pg-sub" style="font-family:var(--mono)">${lot.id} · ${lot.origin} · ${lot.variety} · ${vendor?.companyName??''}</div>

  ${!tracker ? `
  <div class="alert al-amber">
    <i class="fa fa-satellite-dish"></i>
    <div>
      <strong>No live shipment data yet</strong><br>
      <span style="font-size:11px;font-family:var(--mono)">
        Flexport tracking activates after contract signing and B/L (Bill of Lading) upload.
        Estimated transit time: ~${lot.shipmentEstimateDays} days to KSA.
      </span>
    </div>
  </div>
  <div class="card">
    <div class="card-hdr"><i class="fa fa-route" style="color:var(--amber)"></i>Estimated Shipment Plan</div>
    <div style="font-size:11px;font-family:var(--mono);line-height:2.2">
      <div><i class="fa fa-circle-dot" style="color:var(--green)"></i> <strong>Origin:</strong> ${lot.origin}</div>
      <div style="padding-left:14px;border-left:1px dashed rgba(255,255,255,.1);margin-left:6px">
        <div><i class="fa fa-anchor" style="color:var(--blue)"></i> Transit port of loading</div>
        <div><i class="fa fa-ship" style="color:var(--amber)"></i> Ocean freight (~${Math.round((lot.shipmentEstimateDays??21)*0.6)} days at sea)</div>
        <div><i class="fa fa-anchor" style="color:var(--cyan)"></i> Port of Jeddah / Dammam (KSA)</div>
      </div>
      <div><i class="fa fa-warehouse" style="color:var(--cyan)"></i> <strong>KSA Warehouse</strong> · Est. ${lot.shipmentEstimateDays??21} days total</div>
    </div>
  </div>` : `
  <!-- Live Tracker Banner -->
  <div class="card" style="border-color:rgba(96,165,250,.3);margin-bottom:18px">
    <div class="card-hdr"><i class="fa fa-satellite-dish" style="color:var(--blue)"></i>Flexport Live Tracking
      <span class="badge b-blue" style="margin-left:8px;font-size:9px">LIVE</span>
      <span style="margin-left:auto;font-size:10px;font-family:var(--mono);color:var(--muted)">${tracker.status}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px;font-size:11px;font-family:var(--mono)">
      <div><span style="color:var(--muted)">Vessel:</span><br><strong style="color:var(--text)">${tracker.vessel}</strong></div>
      <div><span style="color:var(--muted)">Voyage:</span><br><strong>${tracker.voyageNumber}</strong></div>
      <div><span style="color:var(--muted)">Flexport ID:</span><br><strong style="color:var(--blue)">${lot.flexportShipmentId??'Simulated'}</strong></div>
      <div><span style="color:var(--muted)">HS Code:</span><br><strong>${lot.customsHsCode}</strong></div>
      <div><span style="color:var(--muted)">ETD:</span><br><strong>${tracker.etd}</strong></div>
      <div><span style="color:var(--muted)">ETA:</span><br><strong style="color:var(--green)">${tracker.eta}</strong></div>
      <div><span style="color:var(--muted)">Current Position:</span><br><strong style="color:var(--amber)">${tracker.currentLocation}</strong></div>
      <div><span style="color:var(--muted)">Progress:</span><br><strong style="color:var(--cyan);font-size:18px">${tracker.progressPct}%</strong></div>
    </div>

    <!-- Progress Bar -->
    <div style="margin-bottom:6px;font-size:10px;font-family:var(--mono);color:var(--muted)">
      <span>${lot.origin}</span>
      <span style="float:right">Jeddah / Dammam, KSA</span>
    </div>
    <div class="tracker-bar">
      <div class="tracker-fill" style="width:${tracker.progressPct}%"></div>
    </div>
    <div style="font-size:10px;color:var(--muted);font-family:var(--mono);margin-top:4px;text-align:center">
      ${tracker.currentLocation} · ${tracker.progressPct}% of journey complete
    </div>
  </div>

  <!-- Events Timeline -->
  <div class="card">
    <div class="card-hdr"><i class="fa fa-list-check" style="color:var(--blue)"></i>Shipment Events</div>
    <div class="tracker-events">
      ${tracker.events.map(ev => `
      <div class="tracker-event">
        <div style="font-weight:600;font-size:12px">${ev.location}</div>
        <div style="color:var(--muted);font-size:10px;font-family:var(--mono);margin-top:2px">${ev.ts.replace('T',' ').slice(0,16)} · ${ev.description}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- Documents -->
  <div class="card">
    <div class="card-hdr"><i class="fa fa-folder-open" style="color:var(--amber)"></i>Shipment Documents</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;font-size:11px;font-family:var(--mono)">
      <div style="padding:10px;background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.2);border-radius:5px">
        <div style="color:var(--green);font-weight:700;margin-bottom:4px"><i class="fa fa-file-pdf"></i> Bill of Lading</div>
        <div style="color:var(--muted)">B/L #${tracker.voyageNumber}-BL001</div>
        <div style="color:var(--muted);font-size:9px">Auto-linked on vessel departure</div>
      </div>
      <div style="padding:10px;background:rgba(96,165,250,.05);border:1px solid rgba(96,165,250,.2);border-radius:5px">
        <div style="color:var(--blue);font-weight:700;margin-bottom:4px"><i class="fa fa-certificate"></i> Certificate of Origin</div>
        <div style="color:var(--muted)">HS: ${lot.customsHsCode}</div>
        <div style="color:var(--muted);font-size:9px">Saudi Customs compliance</div>
      </div>
      <div style="padding:10px;background:rgba(34,211,238,.05);border:1px solid rgba(34,211,238,.2);border-radius:5px">
        <div style="color:var(--cyan);font-weight:700;margin-bottom:4px"><i class="fa fa-passport"></i> Climate Passport</div>
        <div style="color:var(--muted)">${lot.scaGoldStorage?'SCA Gold Certified':'Standard'}</div>
        <a href="/exchange/climate/${lot.id}" style="color:var(--cyan);font-size:9px">View →</a>
      </div>
    </div>
  </div>`}

  <!-- Saudi Customs Info -->
  <div class="card" style="border-color:rgba(245,158,11,.2)">
    <div class="card-hdr"><i class="fa fa-shield-halved" style="color:var(--amber)"></i>Saudi Customs & ZATCA</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;font-size:11px;font-family:var(--mono)">
      <div><span style="color:var(--muted)">HS Code:</span><br><strong>${lot.customsHsCode}</strong></div>
      <div><span style="color:var(--muted)">Customs Duty:</span><br><strong>5% of CIF value</strong></div>
      <div><span style="color:var(--muted)">ZATCA VAT:</span><br><strong style="color:var(--red)">15% on CIF + Customs</strong></div>
      <div><span style="color:var(--muted)">Est. Transit:</span><br><strong>${lot.shipmentEstimateDays??21} days</strong></div>
    </div>
  </div>

  <div style="display:flex;gap:10px;margin-top:6px;flex-wrap:wrap">
    <a href="/exchange/catalog" class="btn btn-blue">← Catalog</a>
    <a href="/exchange/climate/${lot.id}" class="btn btn-blue"><i class="fa fa-passport"></i>Climate Passport</a>
    ${lot.status==='AVAILABLE'?`<a href="/buyer/contract?lotId=${lot.id}" class="btn ${lot.marketplaceType==='SPOT'?'btn-green':'btn-amber'}">
      <i class="fa fa-file-contract"></i>${lot.marketplaceType==='SPOT'?'Order Spot':'Pre-order Forward'}
    </a>`:''}
  </div>`

  return c.html(exchangeLayout(`Ship Tracker — ${lot.id}`, 'catalog', content))
})

// ── GET /exchange/forward/:contractId — Forward Contract Milestone Dashboard ──
app.get('/exchange/forward/:contractId', (c) => {
  const fc      = forwardContracts.find(f => f.id === c.req.param('contractId'))
  if (!fc) return c.html(exchangeLayout('Forward Contract', 'buyer',
    `<div class="alert al-red"><i class="fa fa-warning"></i>Contract not found.</div>
     <a href="/buyer" class="btn btn-blue">← Buyer Portal</a>`))

  const lot    = globalLots.find(l => l.id === fc.lotId)
  const buyer  = globalBuyers.find(b => b.id === fc.buyerId)
  const invoice = zatcaInvoices.find(i => i.lotId === fc.lotId)
  const landed  = lot ? calcLandedPrice(lot, fc.quantityKg) : null

  const milestoneTotal = landed?.landedPriceSar ?? 0
  const paidTotal = fc.milestones
    .filter(m => m.status === 'PAID')
    .reduce((s, m) => s + Math.round(milestoneTotal * m.pct / 100 * 100) / 100, 0)

  const sasColor = fc.sasStatus==='SAMPLE_APPROVED'?'var(--green)':
                   fc.sasStatus==='SAMPLE_REJECTED'?'var(--red)':
                   fc.sasStatus==='WAIVED'?'var(--muted)':'var(--amber)'
  const sasBadge = fc.sasStatus==='SAMPLE_APPROVED'?'<span class="badge b-green">APPROVED</span>':
                   fc.sasStatus==='SAMPLE_REJECTED'?'<span class="badge b-red">REJECTED</span>':
                   fc.sasStatus==='WAIVED'?'<span class="badge b-muted">WAIVED</span>':
                   '<span class="badge b-amber">PENDING SAMPLE</span>'

  const content = `
  <div class="pg-title"><i class="fa fa-seedling" style="color:var(--amber)"></i>Forward Pre-order Dashboard</div>
  <div class="pg-sub" style="font-family:var(--mono)">${fc.id} · ${lot?.origin??fc.lotId} · ${buyer?.roasteryName??fc.buyerId}</div>

  <!-- Status Overview -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px">
    <div class="stat-card" style="border-color:rgba(245,158,11,.3)">
      <div class="stat-lbl">Contract Status</div>
      <div class="stat-val" style="font-size:14px;color:var(--amber)">${fc.status}</div>
      <div class="stat-sub">${fc.contractedAt.slice(0,10)}</div>
    </div>
    <div class="stat-card" style="border-color:${sasColor===`var(--green)`?'rgba(74,222,128,.3)':'rgba(245,158,11,.2)'}">
      <div class="stat-lbl">SAS Status</div>
      <div class="stat-val" style="font-size:12px;color:${sasColor}">${fc.sasStatus.replace('_',' ')}</div>
      <div class="stat-sub">Sample approval clause</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Quantity</div>
      <div class="stat-val">${fc.quantityKg.toLocaleString()}</div>
      <div class="stat-sub">kg green coffee</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Paid So Far</div>
      <div class="stat-val" style="color:var(--green);font-size:15px">${paidTotal.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR</div>
      <div class="stat-sub">of ${milestoneTotal.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR total</div>
    </div>
  </div>

  <!-- SAS Clause Banner -->
  ${fc.sasStatus !== 'WAIVED' ? `
  <div class="sas-box" style="margin-bottom:18px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <i class="fa fa-file-signature" style="color:var(--purple)"></i>
      <strong style="color:var(--purple)">Subject to Approval of Sample (SAS) Clause</strong>
      ${sasBadge}
    </div>
    <div style="font-size:11px;line-height:1.8;font-family:var(--mono)">
      ${fc.sasStatus==='SAMPLE_APPROVED'
        ? `✓ Physical sample approved by buyer's Q.C. team. Contract is now fully binding.`
        : fc.sasStatus==='SAMPLE_REJECTED'
        ? `✗ Physical sample rejected. Lot renegotiation or cancellation required.`
        : `⏳ Awaiting physical sample dispatch and buyer Q.C. approval. Contract binding upon approval.
           Sample to be dispatched within 7 days of contract signing (${fc.contractedAt.slice(0,10)}).`}
    </div>
  </div>` : ''}

  <!-- 4-Step Milestone Stepper -->
  <div class="card" style="margin-bottom:18px">
    <div class="card-hdr"><i class="fa fa-route" style="color:var(--amber)"></i>4-Step Forward Contract Milestone Flow</div>

    <!-- Visual stepper connector -->
    <div style="display:flex;align-items:flex-start;gap:0;margin-bottom:20px;overflow-x:auto;padding-bottom:4px">
      <!-- Step 1: Deposit -->
      <div style="flex:1;min-width:100px;text-align:center;position:relative">
        <div style="width:40px;height:40px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;
            background:${fc.milestones[0]?.status==='PAID'?'rgba(74,222,128,.25)':'rgba(245,158,11,.2)'};
            border:2px solid ${fc.milestones[0]?.status==='PAID'?'var(--green)':'var(--amber)'};
            color:${fc.milestones[0]?.status==='PAID'?'var(--green)':'var(--amber)'}">
          ${fc.milestones[0]?.status==='PAID'?'✓':'①'}
        </div>
        <div style="font-size:10px;font-weight:700;color:${fc.milestones[0]?.status==='PAID'?'var(--green)':'var(--amber)'}">DEPOSIT</div>
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono);margin-top:2px">${fc.milestones[0]?.pct??fc.depositPct}% on signing</div>
        <div style="font-size:10px;font-family:var(--mono);margin-top:4px;color:var(--text)">${Math.round(milestoneTotal*(fc.milestones[0]?.pct??fc.depositPct)/100).toLocaleString()} SAR</div>
        <div style="margin-top:4px"><span class="badge ${fc.milestones[0]?.status==='PAID'?'b-green':'b-amber'}" style="font-size:8px">${fc.milestones[0]?.status??'PENDING'}</span></div>
        <!-- connector line right -->
        <div style="position:absolute;top:20px;left:calc(50% + 20px);right:-50%;height:2px;background:${fc.milestones[0]?.status==='PAID'?'rgba(74,222,128,.4)':'rgba(255,255,255,.08)'}"></div>
      </div>

      <!-- Step 2: Sample Approval -->
      <div style="flex:1;min-width:100px;text-align:center;position:relative">
        <div style="width:40px;height:40px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;
            background:${fc.sasStatus==='SAMPLE_APPROVED'?'rgba(74,222,128,.25)':fc.sasStatus==='SAMPLE_REJECTED'?'rgba(248,113,113,.2)':'rgba(167,139,250,.15)'};
            border:2px solid ${fc.sasStatus==='SAMPLE_APPROVED'?'var(--green)':fc.sasStatus==='SAMPLE_REJECTED'?'var(--red)':'var(--purple)'};
            color:${fc.sasStatus==='SAMPLE_APPROVED'?'var(--green)':fc.sasStatus==='SAMPLE_REJECTED'?'var(--red)':'var(--purple)'}">
          ${fc.sasStatus==='SAMPLE_APPROVED'?'✓':fc.sasStatus==='SAMPLE_REJECTED'?'✗':fc.sasStatus==='WAIVED'?'—':'②'}
        </div>
        <div style="font-size:10px;font-weight:700;color:var(--purple)">SAMPLE</div>
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono);margin-top:2px">${fc.sasClause?'SAS clause':'No payment'}</div>
        <div style="font-size:10px;font-family:var(--mono);margin-top:4px;color:var(--muted)">Q.C. review</div>
        <div style="margin-top:4px"><span class="badge b-purple" style="font-size:8px">${fc.sasStatus.replace('_',' ')}</span></div>
        <div style="position:absolute;top:20px;left:calc(50% + 20px);right:-50%;height:2px;background:${fc.sasStatus==='SAMPLE_APPROVED'?'rgba(74,222,128,.4)':'rgba(255,255,255,.08)'}"></div>
      </div>

      <!-- Step 3: Transit (Pre-shipment payment) -->
      <div style="flex:1;min-width:100px;text-align:center;position:relative">
        ${(()=>{
          const ms = fc.milestones[1]
          const isPaid = ms?.status === 'PAID'
          const pct = ms?.pct ?? Math.round((100-fc.depositPct)*0.4)
          return `
        <div style="width:40px;height:40px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;
            background:${isPaid?'rgba(74,222,128,.25)':'rgba(96,165,250,.15)'};
            border:2px solid ${isPaid?'var(--green)':'var(--blue)'};
            color:${isPaid?'var(--green)':'var(--blue)'}">
          ${isPaid?'✓':'③'}
        </div>
        <div style="font-size:10px;font-weight:700;color:${isPaid?'var(--green)':'var(--blue)'}">TRANSIT</div>
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono);margin-top:2px">${pct}% pre-ship</div>
        <div style="font-size:10px;font-family:var(--mono);margin-top:4px;color:var(--text)">${Math.round(milestoneTotal*pct/100).toLocaleString()} SAR</div>
        <div style="margin-top:4px"><span class="badge ${isPaid?'b-green':'b-blue'}" style="font-size:8px">${ms?.status??'PENDING'}</span></div>`
        })()}
        <div style="position:absolute;top:20px;left:calc(50% + 20px);right:-50%;height:2px;background:${fc.milestones[1]?.status==='PAID'?'rgba(74,222,128,.4)':'rgba(255,255,255,.08)'}"></div>
      </div>

      <!-- Step 4: Landing (final payment) -->
      <div style="flex:1;min-width:100px;text-align:center">
        ${(()=>{
          const ms = fc.milestones[2]
          const isPaid = ms?.status === 'PAID'
          const pct = ms?.pct ?? Math.round((100-fc.depositPct)*0.6)
          return `
        <div style="width:40px;height:40px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;
            background:${isPaid?'rgba(74,222,128,.3)':'rgba(74,222,128,.1)'};
            border:2px solid ${isPaid?'var(--green)':'rgba(74,222,128,.4)'};
            color:${isPaid?'var(--green)':'rgba(74,222,128,.7)'}">
          ${isPaid?'✓':'④'}
        </div>
        <div style="font-size:10px;font-weight:700;color:var(--green)">LANDING</div>
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono);margin-top:2px">${pct}% on arrival</div>
        <div style="font-size:10px;font-family:var(--mono);margin-top:4px;color:var(--text)">${Math.round(milestoneTotal*pct/100).toLocaleString()} SAR</div>
        <div style="margin-top:4px"><span class="badge ${isPaid?'b-green':'b-muted'}" style="font-size:8px">${ms?.status??'PENDING'}</span></div>`
        })()}
      </div>
    </div>

    <!-- Milestone detail rows -->
    <div style="font-size:10px;font-family:var(--mono);color:var(--muted);margin-bottom:12px;padding:8px 10px;background:rgba(255,255,255,.02);border-radius:5px">
      <strong style="color:var(--text)">Milestone Detail</strong>
      ${fc.milestones.map((ms, i) => {
        const amt = Math.round(milestoneTotal * ms.pct / 100 * 100) / 100
        const isPaid = ms.status === 'PAID'
        return `
      <div class="milestone-step" style="${isPaid?'border-color:rgba(74,222,128,.25);background:rgba(74,222,128,.03)':''}">
        <div class="ms-dot" style="${isPaid?'background:rgba(74,222,128,.3);color:var(--green)':'background:rgba(255,255,255,.05);color:var(--muted)'}">${isPaid?'✓':(i+1)}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:var(--text)">${ms.label}</div>
          <div style="font-size:10px;color:var(--muted)">Due: ${ms.dueEvent}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--mono);font-size:13px;color:${isPaid?'var(--green)':'var(--text)'}">${amt.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR</div>
          <span class="badge ${isPaid?'b-green':'b-amber'}" style="font-size:8px">${ms.status}</span>
        </div>
      </div>`
      }).join('')}
    </div>

    <div style="border-top:1px solid var(--border);padding-top:12px;display:flex;justify-content:space-between;font-family:var(--mono);font-size:13px">
      <span style="color:var(--muted)">Total Contract Value</span>
      <strong style="color:var(--green)">${milestoneTotal.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR</strong>
    </div>
    <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;margin-top:6px">
      <span style="color:var(--muted)">Paid So Far</span>
      <strong style="color:var(--green)">${paidTotal.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR (${milestoneTotal>0?Math.round(paidTotal/milestoneTotal*100):0}%)</strong>
    </div>
  </div>

  <!-- Landed Price Full Breakdown -->
  ${landed ? `
  <div class="card" style="margin-bottom:18px">
    <div class="card-hdr"><i class="fa fa-receipt" style="color:var(--amber)"></i>Cost Transparency — Full Price Breakdown</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;font-size:11px;font-family:var(--mono);margin-bottom:16px">
      <div style="padding:10px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:6px">
        <div style="color:var(--muted);font-size:9px">FOB PRICE (USD/kg)</div>
        <div style="color:var(--text);font-weight:700;margin-top:3px">$${landed.fobPriceUsd.toFixed(2)}</div>
        <div style="color:var(--muted);font-size:9px">= ${landed.fobPriceSar.toFixed(2)} SAR/kg</div>
      </div>
      <div style="padding:10px;background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.2);border-radius:6px">
        <div style="color:var(--muted);font-size:9px">LOGISTICS (SEA FREIGHT)</div>
        <div style="color:var(--amber);font-weight:700;margin-top:3px">${landed.shippingEstimateSar.toLocaleString()} SAR</div>
        <div style="color:var(--muted);font-size:9px">Port-to-port to KSA</div>
      </div>
      <div style="padding:10px;background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.2);border-radius:6px">
        <div style="color:var(--muted);font-size:9px">SAUDI CUSTOMS (5%)</div>
        <div style="color:var(--amber);font-weight:700;margin-top:3px">${landed.customsFeesSar.toLocaleString()} SAR</div>
        <div style="color:var(--muted);font-size:9px">HS 0901.11</div>
      </div>
      <div style="padding:10px;background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.2);border-radius:6px">
        <div style="color:var(--muted);font-size:9px">QABBAN PLATFORM FEE (1.5%)</div>
        <div style="color:var(--cyan);font-weight:700;margin-top:3px">${landed.qabbanFeeSar.toLocaleString()} SAR</div>
        <div style="color:var(--muted);font-size:9px">Exchange service fee</div>
      </div>
      <div style="padding:10px;background:rgba(248,113,113,.04);border:1px solid rgba(248,113,113,.2);border-radius:6px">
        <div style="color:var(--muted);font-size:9px">ZATCA VAT 15% (Phase 2)</div>
        <div style="color:var(--red);font-weight:700;margin-top:3px">${landed.vatSar.toLocaleString()} SAR</div>
        <div style="color:var(--muted);font-size:9px">Applied on CIF + fees</div>
      </div>
      <div style="padding:10px;background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.3);border-radius:6px">
        <div style="color:var(--muted);font-size:9px">TOTAL LANDED (${fc.quantityKg}kg)</div>
        <div style="color:var(--green);font-weight:800;font-size:16px;margin-top:3px">${landed.landedPriceSar.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR</div>
        <div style="color:var(--green);font-size:9px">${landed.landedPricePerKg.toFixed(2)} SAR/kg</div>
      </div>
    </div>
    <div style="font-size:10px;color:var(--muted);font-family:var(--mono);padding:8px;background:rgba(245,158,11,.04);border-radius:5px;border:1px solid rgba(245,158,11,.15)">
      <i class="fa fa-coins" style="color:var(--amber)"></i>
      Effective Rate: <strong style="color:var(--amber)">${landed.effectiveRate.toFixed(4)} SAR/USD</strong>
      (SAMA ${samaReferenceRate.toFixed(4)} + ${exchangeRateBuffer}% buffer) ·
      All amounts in SAR incl. 15% ZATCA Phase-2 VAT
    </div>
  </div>` : ''}

  <!-- Climate Passport Summary -->
  ${lot ? `
  <div class="card" style="margin-bottom:18px;border-color:${lot.scaGoldStorage?'rgba(34,211,238,.25)':'var(--border)'}">
    <div class="card-hdr">
      <i class="fa fa-passport" style="color:${lot.scaGoldStorage?'var(--cyan)':'var(--muted)'}"></i>
      Climate Passport
      ${lot.scaGoldStorage?`<span class="badge b-cyan" style="margin-left:8px">SCA GOLD</span>`:''}
      <a href="/exchange/climate/${lot.id}" class="btn btn-blue" style="margin-left:auto;font-size:9px;padding:3px 8px">View Full Passport →</a>
    </div>
    <div style="font-size:11px;font-family:var(--mono)">
      Current RH: <strong style="color:${lot.scaGoldStorage?'var(--cyan)':'var(--amber)'}">${lot.warehouseHumidity??'—'}%</strong> ·
      Temp: <strong>${lot.warehouseTemp??'—'}°C</strong> ·
      ${lot.climateLog.length} sensor readings
    </div>
  </div>` : ''}

  <!-- ZATCA Invoice Link -->
  ${invoice ? `
  <div class="card" style="border-color:rgba(74,222,128,.2)">
    <div class="card-hdr"><i class="fa fa-receipt" style="color:var(--green)"></i>ZATCA Phase-2 E-Invoice</div>
    <div style="font-size:11px;font-family:var(--mono);margin-bottom:10px">
      Invoice #: <strong>${invoice.invoiceNumber}</strong> ·
      Total: <strong style="color:var(--green)">${invoice.totalSar.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR</strong> ·
      VAT: <strong style="color:var(--red)">${invoice.vatAmountSar.toLocaleString('en-SA',{minimumFractionDigits:2})} SAR</strong>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <a href="/buyer/invoice/${invoice.uuid}" class="btn btn-green"><i class="fa fa-receipt"></i>View Invoice</a>
      <a href="/buyer/invoice/${invoice.uuid}/xml" class="btn btn-blue"><i class="fa fa-download"></i>Download XML</a>
    </div>
  </div>` : ''}

  <div style="display:flex;gap:10px;margin-top:6px;flex-wrap:wrap">
    <a href="/buyer" class="btn btn-blue">← Buyer Portal</a>
    ${lot?.shipTracker?`<a href="/exchange/shiptrack/${lot.id}" class="btn btn-blue"><i class="fa fa-ship"></i>Ship Tracker</a>`:''}
  </div>`

  return c.html(exchangeLayout(`Forward Contract — ${fc.id}`, 'buyer', content))
})

// ── GET /exchange/analytics — Global Exchange Analytics ───────────────────────
app.get('/exchange/analytics', (c) => {
  const effRate   = lastKnownUsdToSar * (1 + exchangeRateBuffer / 100)
  const spotLots  = globalLots.filter(l => l.marketplaceType === 'SPOT')
  const fwdLots   = globalLots.filter(l => l.marketplaceType === 'FORWARD')
  const availLots = globalLots.filter(l => l.status === 'AVAILABLE')
  const contLots  = globalLots.filter(l => l.status === 'CONTRACTED')

  // Volume by origin
  const originVol: Record<string, {kg: number, usd: number, lots: number}> = {}
  for (const lot of globalLots) {
    const o = lot.origin.split(' ')[0]
    if (!originVol[o]) originVol[o] = {kg:0, usd:0, lots:0}
    originVol[o].kg   += lot.greenWeightKg
    originVol[o].usd  += lot.greenWeightKg * lot.fobPriceUsd
    originVol[o].lots += 1
  }
  const topOrigins = Object.entries(originVol).sort((a,b)=>b[1].kg-a[1].kg)

  // Financial metrics
  const totalFobUsd = globalLots.reduce((s,l)=>s+l.greenWeightKg*l.fobPriceUsd, 0)
  const totalLandedSar = globalLots.reduce((s,l)=>{
    const lp = calcLandedPrice(l); return s + lp.landedPriceSar
  }, 0)
  const scaBadged  = globalLots.filter(l=>l.scaGoldStorage).length
  const avgGrade   = Math.round(globalLots.reduce((s,l)=>s+l.gradeScore,0)/Math.max(globalLots.length,1)*10)/10

  const content = `
  <div class="pg-title"><i class="fa fa-chart-bar" style="color:var(--amber)"></i>Exchange Analytics</div>
  <div class="pg-sub">Portfolio intelligence · Financial pulse · Origin breakdown</div>

  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px">
    <div class="stat-card" style="border-color:rgba(74,222,128,.25)">
      <div class="stat-lbl">Total Volume</div>
      <div class="stat-val" style="color:var(--green)">${globalLots.reduce((s,l)=>s+l.greenWeightKg,0).toLocaleString()}</div>
      <div class="stat-sub">kg total (all lots)</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Total FOB Value</div>
      <div class="stat-val" style="font-size:15px;color:var(--amber)">$${Math.round(totalFobUsd/1000)}k</div>
      <div class="stat-sub">USD (all lots)</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Total Landed (SAR)</div>
      <div class="stat-val" style="font-size:13px;color:var(--green)">${Math.round(totalLandedSar/1000).toLocaleString()}k</div>
      <div class="stat-sub">SAR incl. VAT</div>
    </div>
    <div class="stat-card" style="border-color:rgba(34,211,238,.25)">
      <div class="stat-lbl">SCA Gold Lots</div>
      <div class="stat-val" style="color:var(--cyan)">${scaBadged} / ${globalLots.length}</div>
      <div class="stat-sub">${Math.round(scaBadged/Math.max(globalLots.length,1)*100)}% certified</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Avg SCA Grade</div>
      <div class="stat-val" style="color:var(--blue)">${avgGrade}</div>
      <div class="stat-sub">Specialty threshold 80+</div>
    </div>
    <div class="stat-card" style="border-color:rgba(245,158,11,.2)">
      <div class="stat-lbl">Effective Rate</div>
      <div class="stat-val" style="color:var(--amber);font-size:16px">${effRate.toFixed(4)}</div>
      <div class="stat-sub">SAR/USD (SAMA+${exchangeRateBuffer}%)</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Contracts</div>
      <div class="stat-val">${globalContracts.length + forwardContracts.length}</div>
      <div class="stat-sub">${globalContracts.length} spot · ${forwardContracts.length} fwd</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">ZATCA Invoices</div>
      <div class="stat-val" style="color:var(--purple)">${zatcaInvoices.length}</div>
      <div class="stat-sub">Phase-2 compliant</div>
    </div>
  </div>

  <!-- Dual-Track Distribution -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div class="card" style="border-color:rgba(74,222,128,.2)">
      <div class="card-hdr"><span class="track-spot">⚡ SPOT MARKET</span></div>
      <div style="font-size:11px;font-family:var(--mono);margin-bottom:12px;color:var(--muted)">Immediate dispatch from origin warehouses</div>
      <div style="font-size:24px;font-weight:700;color:var(--green);margin-bottom:4px">${spotLots.length}</div>
      <div style="font-size:11px;color:var(--muted)">${spotLots.filter(l=>l.status==='AVAILABLE').length} available · ${spotLots.reduce((s,l)=>s+l.greenWeightKg,0).toLocaleString()} kg</div>
      <div style="margin-top:10px;font-family:var(--mono);font-size:11px">Avg FOB: <strong>$${spotLots.length?Math.round(spotLots.reduce((s,l)=>s+l.fobPriceUsd,0)/spotLots.length*100)/100:0}/kg</strong></div>
    </div>
    <div class="card" style="border-color:rgba(245,158,11,.2)">
      <div class="card-hdr"><span class="track-fwd">🌱 FORWARD MARKET</span></div>
      <div style="font-size:11px;font-family:var(--mono);margin-bottom:12px;color:var(--muted)">Pre-harvest orders · 30% deposit · SAS clause</div>
      <div style="font-size:24px;font-weight:700;color:var(--amber);margin-bottom:4px">${fwdLots.length}</div>
      <div style="font-size:11px;color:var(--muted)">${fwdLots.filter(l=>l.status==='AVAILABLE').length} available · ${fwdLots.reduce((s,l)=>s+l.greenWeightKg,0).toLocaleString()} kg</div>
      <div style="margin-top:10px;font-family:var(--mono);font-size:11px">Active fwd contracts: <strong>${forwardContracts.length}</strong></div>
    </div>
  </div>

  <!-- Origin Breakdown -->
  <div class="card">
    <div class="card-hdr"><i class="fa fa-earth-africa" style="color:var(--green)"></i>Volume by Origin</div>
    <table class="tbl">
      <thead><tr><th>Origin</th><th>Lots</th><th>Volume (kg)</th><th>FOB Value (USD)</th><th>Landed (SAR)</th></tr></thead>
      <tbody>
        ${topOrigins.map(([origin, data]) => `
        <tr>
          <td><strong>${origin}</strong></td>
          <td style="font-family:var(--mono)">${data.lots}</td>
          <td style="font-family:var(--mono)">${data.kg.toLocaleString()} kg</td>
          <td style="font-family:var(--mono);color:var(--amber)">$${Math.round(data.usd).toLocaleString()}</td>
          <td style="font-family:var(--mono);color:var(--green)">${Math.round(data.usd * effRate).toLocaleString()} SAR</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Financial Pulse: Exchange Rate -->
  <div class="card" style="border-color:rgba(245,158,11,.25)">
    <div class="card-hdr"><i class="fa fa-coins" style="color:var(--amber)"></i>Financial Pulse — SAMA Rates + XE Buffer</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:12px">
      <div style="text-align:center;padding:14px;background:rgba(245,158,11,.05);border:1px solid rgba(245,158,11,.15);border-radius:6px">
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono)">SAMA REFERENCE</div>
        <div style="font-size:24px;font-weight:700;color:var(--amber)">${samaReferenceRate.toFixed(4)}</div>
        <div style="font-size:10px;color:var(--muted)">SAR per 1 USD (official peg)</div>
      </div>
      <div style="text-align:center;padding:14px;background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.15);border-radius:6px">
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono)">WITH +${exchangeRateBuffer}% BUFFER</div>
        <div style="font-size:24px;font-weight:700;color:var(--green)">${effRate.toFixed(4)}</div>
        <div style="font-size:10px;color:var(--muted)">Effective rate used in pricing</div>
      </div>
      <div style="text-align:center;padding:14px;background:rgba(96,165,250,.05);border:1px solid rgba(96,165,250,.15);border-radius:6px">
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono)">EUR → SAR (effective)</div>
        <div style="font-size:24px;font-weight:700;color:var(--blue)">${(lastKnownEurToSar*(1+exchangeRateBuffer/100)).toFixed(4)}</div>
        <div style="font-size:10px;color:var(--muted)">SAR per 1 EUR</div>
      </div>
      <div style="text-align:center;padding:14px;background:rgba(167,139,250,.05);border:1px solid rgba(167,139,250,.15);border-radius:6px">
        <div style="font-size:9px;color:var(--muted);font-family:var(--mono)">RATE LOCK WINDOW</div>
        <div style="font-size:24px;font-weight:700;color:var(--purple)">60s</div>
        <div style="font-size:10px;color:var(--muted)">Execution lock for buyers</div>
      </div>
    </div>
    <div style="font-family:var(--mono);font-size:10px;color:var(--muted)">
      ${exchangeRateUpdatedAt?`XE API last refresh: ${exchangeRateUpdatedAt}`:'Using SAMA peg fallback (3.75 SAR/USD · XE_API_ID + XE_API_KEY not configured)'} ·
      <a href="/admin/finance" style="color:var(--amber)">Configure in Finance →</a>
    </div>
  </div>

  <a href="/exchange" class="btn btn-blue" style="margin-top:6px">← Exchange Hub</a>`

  return c.html(exchangeLayout('Analytics', 'hub', content))
})

// ── POST /api/exchange/forward/:id/milestone — Update milestone status ─────────
app.post('/api/exchange/forward/:id/milestone', async (c) => {
  try {
    const fc = forwardContracts.find(f => f.id === c.req.param('id'))
    if (!fc) return c.json({ error: 'Contract not found' }, 404)
    const { milestoneId, status } = await c.req.json()
    const ms = fc.milestones.find(m => m.id === milestoneId)
    if (!ms) return c.json({ error: 'Milestone not found' }, 404)
    const valid = ['PENDING','PAID','OVERDUE']
    if (!valid.includes(status)) return c.json({ error: 'Invalid status' }, 400)
    ms.status = status
    return c.json({ ok: true, milestone: ms, contract: fc })
  } catch { return c.json({ error: 'Invalid request' }, 400) }
})

// ── POST /api/exchange/forward/:id/sas — Update SAS status ───────────────────
app.post('/api/exchange/forward/:id/sas', async (c) => {
  try {
    const fc = forwardContracts.find(f => f.id === c.req.param('id'))
    if (!fc) return c.json({ error: 'Contract not found' }, 404)
    const { sasStatus } = await c.req.json()
    const valid = ['PENDING_SAMPLE','SAMPLE_APPROVED','SAMPLE_REJECTED','WAIVED']
    if (!valid.includes(sasStatus)) return c.json({ error: 'Invalid sasStatus' }, 400)
    fc.sasStatus = sasStatus
    return c.json({ ok: true, sasStatus: fc.sasStatus, contract: fc })
  } catch { return c.json({ error: 'Invalid request' }, 400) }
})

// ── GET /api/exchange/analytics — Analytics snapshot ─────────────────────────
app.get('/api/exchange/analytics', (c) => {
  const effRate  = lastKnownUsdToSar * (1 + exchangeRateBuffer / 100)
  const spotLots = globalLots.filter(l => l.marketplaceType === 'SPOT')
  const fwdLots  = globalLots.filter(l => l.marketplaceType === 'FORWARD')
  return c.json({
    totals: {
      lots: globalLots.length,
      spotLots: spotLots.length,
      forwardLots: fwdLots.length,
      availableLots: globalLots.filter(l=>l.status==='AVAILABLE').length,
      vendors: globalVendors.length,
      verifiedVendors: globalVendors.filter(v=>v.status==='VERIFIED').length,
      buyers: globalBuyers.length,
      spotContracts: globalContracts.length,
      forwardContracts: forwardContracts.length,
      zatcaInvoices: zatcaInvoices.length,
      scaGoldLots: globalLots.filter(l=>l.scaGoldStorage).length,
      totalVolumeKg: globalLots.reduce((s,l)=>s+l.greenWeightKg,0),
    },
    rates: {
      samaReference: samaReferenceRate,
      usdSpot: lastKnownUsdToSar,
      eurSpot: lastKnownEurToSar,
      buffer: exchangeRateBuffer,
      effectiveUsd: effRate,
      effectiveEur: lastKnownEurToSar*(1+exchangeRateBuffer/100),
      updatedAt: exchangeRateUpdatedAt || 'fallback',
      rateLockWindowSecs: 60,
    },
    invoiceTotals: {
      totalSar: Math.round(zatcaInvoices.reduce((s,i)=>s+i.totalSar,0)*100)/100,
      totalVat:  Math.round(zatcaInvoices.reduce((s,i)=>s+i.vatAmountSar,0)*100)/100,
    }
  })
})

// ── GET /manual — User Manual ──────────────────────────────────────
// wrangler pages dev serves public/static/manual.html at /static/manual
app.get('/manual', (c) => c.redirect('/static/manual', 301))

// ══════════════════════════════════════════════════════════════════
//  QABBAN PULSE — Barista Waste Tracking Module
//  Routes:
//    GET  /admin/pulse              — Dashboard UI
//    POST /api/pulse/waste-log      — Append Acaia scale reading
//    GET  /api/pulse/logs           — Fetch waste logs (filter by branchId/sessionId)
//    POST /api/pulse/sync           — Foodics POS sync + reconciliation
//    GET  /api/pulse/reconciliations— List past reconciliations
// ══════════════════════════════════════════════════════════════════

// ── POST /api/pulse/waste-log ─────────────────────────────────────
// Body: { branchId, sessionId, weightGrams, stable }
app.post('/api/pulse/waste-log', async (c) => {
  try {
    const body = await c.req.json() as {
      branchId    : string
      sessionId   : string
      weightGrams : number
      stable?     : boolean
    }
    if (!body.branchId || !body.sessionId || typeof body.weightGrams !== 'number') {
      return c.json({ error: 'branchId, sessionId, and weightGrams are required' }, 400)
    }
    const log: WasteLog = {
      id          : pulseId('WL'),
      sessionId   : body.sessionId,
      branchId    : body.branchId,
      weightGrams : Math.round(body.weightGrams * 10) / 10,
      stable      : body.stable ?? true,
      loggedAt    : new Date().toISOString(),
    }
    wasteLogs.push(log)
    return c.json({ ok: true, log })
  } catch (e) {
    return c.json({ error: String(e) }, 400)
  }
})

// ── GET /api/pulse/logs ───────────────────────────────────────────
// Query: ?branchId=BR-001&sessionId=DI-xxx&limit=200
app.get('/api/pulse/logs', (c) => {
  const branchId  = c.req.query('branchId')
  const sessionId = c.req.query('sessionId')
  const limit     = Math.min(parseInt(c.req.query('limit') ?? '200'), 1000)

  let list = [...wasteLogs]
  if (branchId)  list = list.filter(l => l.branchId  === branchId)
  if (sessionId) list = list.filter(l => l.sessionId === sessionId)

  // Most-recent first
  list.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
  list = list.slice(0, limit)

  const totalGrams = list.reduce((s, l) => s + l.weightGrams, 0)
  return c.json({ count: list.length, totalGrams: Math.round(totalGrams * 10) / 10, logs: list })
})

// ── POST /api/pulse/sync ──────────────────────────────────────────
// Pulls Foodics POS orders for a branch+date, computes reconciliation,
// optionally pushes inventory adjustment back to Foodics.
//
// Body: {
//   branchId        : string      — e.g. "BR-001"
//   periodDate      : string      — ISO "YYYY-MM-DD"
//   foodicsApiKey   : string      — Foodics API key (passed from client)
//   pushAdjustment  : boolean     — whether to push inventory adj to Foodics
//   sessionId?      : string      — filter wasteLogs to this session only
// }
app.post('/api/pulse/sync', async (c) => {
  try {
    const body = await c.req.json() as {
      branchId       : string
      periodDate     : string
      foodicsApiKey  : string
      pushAdjustment?: boolean
      sessionId?     : string
    }
    const { branchId, periodDate, foodicsApiKey, pushAdjustment = false, sessionId } = body

    if (!branchId || !periodDate || !foodicsApiKey) {
      return c.json({ error: 'branchId, periodDate, and foodicsApiKey are required' }, 400)
    }

    // ── 1. Pull Foodics orders for the day ──────────────────────────
    // Foodics Orders API v2: GET /orders?filters[business_date]={date}&filters[branch_id]={id}
    // We request the first page (up to 50 orders), following pagination if needed.
    const FOODICS_BASE = 'https://api.foodics.com/api/v5'
    const orderItems: { productName: string; quantity: number }[] = []
    let foodicsOrderCount = 0
    let adjustmentId      = 'N/A'

    try {
      const foodicsRes = await fetch(
        `${FOODICS_BASE}/orders?filters[business_date]=${periodDate}&filters[branch_id]=${branchId}&per_page=100`,
        {
          headers: {
            Authorization : `Bearer ${foodicsApiKey}`,
            'Content-Type': 'application/json',
            Accept        : 'application/json',
          },
        }
      )
      if (foodicsRes.ok) {
        const payload = await foodicsRes.json() as {
          data?: {
            products?: { name: string; quantity: number }[]
          }[]
        }
        const orders = payload.data ?? []
        foodicsOrderCount = orders.length
        for (const order of orders) {
          for (const product of (order.products ?? [])) {
            // Only espresso-based drinks
            const g = PULSE_BEAN_MAP[product.name]
            if (g !== undefined) {
              orderItems.push({ productName: product.name, quantity: product.quantity ?? 1 })
            }
          }
        }
      }
    } catch {
      // Network/auth error — continue with zero theoretical usage so we still save IoT data
    }

    // ── 2. Compute theoretical usage ────────────────────────────────
    const theoreticalUsage = calcTheoreticalUsage(orderItems)

    // ── 3. Sum actual IoT readings ───────────────────────────────────
    let iotLogs = wasteLogs.filter(l => l.branchId === branchId)
    if (sessionId) iotLogs = iotLogs.filter(l => l.sessionId === sessionId)
    // Filter to same day if loggedAt date matches periodDate
    iotLogs = iotLogs.filter(l => l.loggedAt.startsWith(periodDate))
    const actualUsageIot = Math.round(iotLogs.reduce((s, l) => s + l.weightGrams, 0) * 10) / 10

    // ── 4. Variance & financial loss ────────────────────────────────
    const variance = Math.round((actualUsageIot - theoreticalUsage) * 10) / 10

    // Get cost per kg from the branch's active coffee lot (first available lot)
    const activeLot    = coffeeLots.find(l => l.status === 'OPTIMAL' || l.status === 'MONITOR') ?? coffeeLots[0]
    const costPerKgSar = activeLot
      ? Math.round((activeLot.costPerKg ?? 48) * (lastKnownUsdToSar || 3.75) * 100) / 100
      : 180   // SAR fallback

    const financialLossSar = calcFinancialLoss(variance, costPerKgSar)

    // ── 5. Push inventory adjustment to Foodics (if requested) ──────
    if (pushAdjustment && variance !== 0 && foodicsApiKey) {
      try {
        // Foodics Quantity Adjustment endpoint:
        // POST /inventory_transactions with type = "waste" and quantity in kg
        const adjRes = await fetch(`${FOODICS_BASE}/inventory_transactions`, {
          method : 'POST',
          headers: {
            Authorization : `Bearer ${foodicsApiKey}`,
            'Content-Type': 'application/json',
            Accept        : 'application/json',
          },
          body: JSON.stringify({
            type         : 'waste',
            branch_id    : branchId,
            reference    : `PULSE-${periodDate}`,
            quantity     : Math.abs(variance) / 1000,  // grams → kg
            unit         : 'kg',
            notes        : `Qabban Pulse reconciliation — variance: ${variance > 0 ? '+' : ''}${variance}g`,
          }),
        })
        if (adjRes.ok) {
          const adjPayload = await adjRes.json() as { data?: { id?: string } }
          adjustmentId = adjPayload?.data?.id ?? 'ADJ-OK'
        }
      } catch {
        adjustmentId = 'ADJ-FAILED'
      }
    }

    // ── 6. Save reconciliation record ───────────────────────────────
    const recon: PulseReconciliation = {
      id               : pulseId('PR'),
      branchId,
      periodDate,
      theoreticalUsage,
      actualUsageIot,
      variance,
      financialLossSar,
      costPerKgSar,
      foodicsOrderCount,
      adjustmentPushed : pushAdjustment && variance !== 0,
      adjustmentId,
      createdAt        : new Date().toISOString(),
    }
    pulseRecons.push(recon)

    return c.json({ ok: true, reconciliation: recon })
  } catch (e) {
    return c.json({ error: String(e) }, 400)
  }
})

// ── GET /api/pulse/reconciliations ───────────────────────────────
// Query: ?branchId=BR-001&limit=50
app.get('/api/pulse/reconciliations', (c) => {
  const branchId = c.req.query('branchId')
  const limit    = Math.min(parseInt(c.req.query('limit') ?? '50'), 200)

  let list = [...pulseRecons]
  if (branchId) list = list.filter(r => r.branchId === branchId)
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  list = list.slice(0, limit)

  const totalLoss = list.reduce((s, r) => s + r.financialLossSar, 0)
  return c.json({ count: list.length, totalFinancialLossSar: Math.round(totalLoss * 100) / 100, reconciliations: list })
})

// ── GET /admin/pulse — Pulse Dashboard ───────────────────────────
app.get('/admin/pulse', (c) => {
  // Snapshot numbers for the top cards
  const totalWasteLogs = wasteLogs.length
  const totalIotGrams  = Math.round(wasteLogs.reduce((s, l) => s + l.weightGrams, 0) * 10) / 10
  const lastRecon      = pulseRecons.length > 0 ? pulseRecons[pulseRecons.length - 1] : null

  const recentLogs = [...wasteLogs]
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
    .slice(0, 30)

  const recentRecons = [...pulseRecons]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)

  const branchOptions = branches.map(b =>
    `<option value="${b.id}">${b.name}</option>`
  ).join('')

  const logsTableRows = recentLogs.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">No waste logs yet — connect scale and start Dial-in Mode</td></tr>`
    : recentLogs.map(l => `
      <tr>
        <td style="font-family:var(--font-mono);font-size:11px">${l.id}</td>
        <td>${l.branchId}</td>
        <td>${l.sessionId}</td>
        <td style="font-family:var(--font-mono);color:var(--amber);font-weight:600">${l.weightGrams.toFixed(1)} g</td>
        <td style="color:${l.stable ? 'var(--green)' : 'var(--red)'}">${l.stable ? '✔ Stable' : '~ Live'}</td>
        <td style="font-size:11px;color:var(--text-muted)">${new Date(l.loggedAt).toLocaleString('en-SA')}</td>
      </tr>`).join('')

  const reconTableRows = recentRecons.length === 0
    ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">No reconciliations yet</td></tr>`
    : recentRecons.map(r => {
        const varClass = r.variance > 50 ? 'var(--red)' : r.variance < -50 ? '#60a5fa' : 'var(--green)'
        return `<tr>
          <td style="font-size:11px;color:var(--text-muted)">${r.periodDate}</td>
          <td>${r.branchId}</td>
          <td style="font-family:var(--font-mono)">${r.theoreticalUsage.toFixed(0)} g</td>
          <td style="font-family:var(--font-mono);color:var(--amber)">${r.actualUsageIot.toFixed(1)} g</td>
          <td style="font-family:var(--font-mono);font-weight:700;color:${varClass}">${r.variance > 0 ? '+' : ''}${r.variance.toFixed(1)} g</td>
          <td style="font-family:var(--font-mono);color:var(--red)">${r.financialLossSar > 0 ? `${r.financialLossSar.toFixed(2)} SAR` : '—'}</td>
          <td style="color:${r.adjustmentPushed ? 'var(--green)' : 'var(--text-muted)'}">
            ${r.adjustmentPushed ? `<i class="fa fa-check-circle"></i> ${r.adjustmentId}` : '—'}
          </td>
        </tr>`
      }).join('')

  const content = `
<!-- ── QABBAN PULSE STYLES ─────────────────────────────────────── -->
<style>
  .pulse-gauge {
    position:relative; width:220px; height:220px; margin:0 auto;
  }
  .gauge-svg { width:220px; height:220px; }
  .gauge-bg { fill:none; stroke:#1e293b; stroke-width:18; }
  .gauge-arc {
    fill:none; stroke:var(--amber); stroke-width:18;
    stroke-linecap:round;
    stroke-dasharray: 565; /* circumference of r=90: 2π×90 ≈ 565 */
    stroke-dashoffset: 565;
    transition: stroke-dashoffset 0.4s ease;
    transform-origin: center;
    transform: rotate(-90deg);
  }
  .gauge-center {
    position:absolute; top:50%; left:50%;
    transform:translate(-50%,-50%);
    text-align:center; pointer-events:none;
  }
  .gauge-weight {
    font-family:var(--font-mono); font-size:34px; font-weight:700;
    color:var(--amber); line-height:1;
  }
  .gauge-unit { font-size:13px; color:var(--text-muted); margin-top:2px; }
  .gauge-stable { font-size:11px; margin-top:4px; }
  .pulse-ring {
    display:inline-block; width:8px; height:8px; border-radius:50%;
    background:var(--green); animation: pulseRing 1.2s ease-in-out infinite;
    vertical-align:middle; margin-right:4px;
  }
  @keyframes pulseRing { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
  .dial-active { border-color:var(--red) !important; }
  .btn-bluetooth { background:linear-gradient(135deg,#1d4ed8,#3b82f6); }
  .btn-dialing    { background:linear-gradient(135deg,#b91c1c,#ef4444); }
  .btn-foodics    { background:linear-gradient(135deg,#065f46,#10b981); }
  .weight-history { display:flex; gap:3px; align-items:flex-end; height:40px; margin-top:8px; }
  .wh-bar {
    flex:1; background:var(--amber); border-radius:2px 2px 0 0; opacity:0.7;
    min-width:4px; transition:height 0.2s;
  }
  .sim-hint { font-size:10px; color:var(--text-muted); text-align:center; margin-top:6px; }
</style>

<!-- ── TOP STAT CARDS ─────────────────────────────────────────── -->
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
  <div class="card" style="padding:20px">
    <div class="card-label" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Scale Readings</div>
    <div style="font-size:28px;font-weight:700;font-family:var(--font-mono);color:var(--amber)">${totalWasteLogs}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${totalIotGrams.toFixed(1)} g total logged</div>
  </div>
  <div class="card" style="padding:20px">
    <div class="card-label" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Reconciliations</div>
    <div style="font-size:28px;font-weight:700;font-family:var(--font-mono);color:var(--green)">${pulseRecons.length}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${lastRecon ? `Last: ${lastRecon.periodDate}` : 'None yet'}</div>
  </div>
  <div class="card" style="padding:20px">
    <div class="card-label" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Last Variance</div>
    <div style="font-size:28px;font-weight:700;font-family:var(--font-mono);color:${lastRecon && lastRecon.variance > 50 ? 'var(--red)' : 'var(--green)'}">
      ${lastRecon ? `${lastRecon.variance > 0 ? '+' : ''}${lastRecon.variance.toFixed(1)}g` : '—'}
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${lastRecon && lastRecon.financialLossSar > 0 ? `≈ ${lastRecon.financialLossSar.toFixed(2)} SAR lost` : 'No loss recorded'}</div>
  </div>
  <div class="card" style="padding:20px">
    <div class="card-label" style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Foodics Adjustments</div>
    <div style="font-size:28px;font-weight:700;font-family:var(--font-mono);color:#60a5fa">
      ${pulseRecons.filter(r => r.adjustmentPushed).length}
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Pushed to Foodics POS</div>
  </div>
</div>

<!-- ── MAIN TWO-COLUMN LAYOUT ─────────────────────────────────── -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">

  <!-- LEFT: Live Scale / Dial-in Mode -->
  <div class="card" id="scale-card" style="padding:24px">
    <div class="card-hdr" style="margin-bottom:18px">
      <i class="fa fa-scale-balanced" style="color:var(--amber)"></i>
      Acaia Scale — Live Weight
      <span id="bt-status" style="margin-left:auto;font-size:11px;font-family:var(--font-mono);color:var(--text-muted)">
        <i class="fa fa-circle" style="font-size:8px"></i> Disconnected
      </span>
    </div>

    <!-- Gauge -->
    <div class="pulse-gauge" id="gauge-wrap">
      <svg class="gauge-svg" viewBox="0 0 220 220">
        <circle class="gauge-bg" cx="110" cy="110" r="90"/>
        <circle class="gauge-arc" id="gauge-arc" cx="110" cy="110" r="90"/>
      </svg>
      <div class="gauge-center">
        <div class="gauge-weight" id="gauge-weight">0.0</div>
        <div class="gauge-unit">grams</div>
        <div class="gauge-stable" id="gauge-stable" style="color:var(--text-muted)">—</div>
      </div>
    </div>

    <!-- Mini bar-chart history -->
    <div class="weight-history" id="wh-bars"></div>
    <div class="sim-hint" id="sim-hint">Connect Acaia scale via Bluetooth · Chrome/Edge required</div>

    <!-- Controls -->
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button id="btn-bt-connect" class="btn btn-bluetooth" onclick="pulseConnectBt()" style="flex:1;min-width:120px">
        <i class="fa fa-bluetooth"></i> Connect Scale
      </button>
      <button id="btn-bt-tare" class="btn" onclick="pulseTare()" disabled style="flex:1;min-width:80px;background:#334155">
        <i class="fa fa-arrows-to-dot"></i> Tare
      </button>
      <button id="btn-simulate" class="btn" onclick="pulseSimulate()" style="flex:1;min-width:100px;background:#334155;font-size:11px">
        <i class="fa fa-flask"></i> Simulate
      </button>
    </div>

    <!-- Branch selector & Dial-in -->
    <div style="margin-top:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <select id="pulse-branch" style="flex:1;background:#0f172a;color:var(--text);border:1px solid var(--border);border-radius:4px;padding:6px 10px;font-family:var(--font-mono);font-size:12px">
        ${branchOptions}
      </select>
      <button id="btn-dialin" class="btn btn-dialing" onclick="pulseToggleDialIn()" style="flex:1;min-width:120px">
        <i class="fa fa-record-vinyl"></i> Dial-in Mode
      </button>
    </div>

    <!-- Session stats -->
    <div id="session-stats" style="margin-top:12px;padding:10px;background:#0f172a;border-radius:6px;font-size:12px;display:none">
      <span style="color:var(--text-muted)">Session:</span>
      <span id="sess-id" style="font-family:var(--font-mono);color:var(--amber);font-size:11px"></span><br/>
      <span style="color:var(--text-muted)">Readings:</span>
      <span id="sess-count" style="font-family:var(--font-mono);font-weight:700">0</span>
      <span style="margin-left:12px;color:var(--text-muted)">Total:</span>
      <span id="sess-total" style="font-family:var(--font-mono);font-weight:700;color:var(--amber)">0.0 g</span>
    </div>
  </div>

  <!-- RIGHT: Foodics Sync -->
  <div class="card" style="padding:24px">
    <div class="card-hdr" style="margin-bottom:18px">
      <i class="fa fa-rotate" style="color:var(--green)"></i>
      Foodics POS Sync
    </div>

    <div style="display:flex;flex-direction:column;gap:12px">
      <div>
        <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Foodics API Key</label>
        <input id="foodics-key" type="password" placeholder="Bearer token from Foodics Console"
          style="width:100%;box-sizing:border-box;background:#0f172a;color:var(--text);border:1px solid var(--border);border-radius:4px;padding:8px 12px;font-family:var(--font-mono);font-size:12px"/>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Branch ID</label>
          <select id="sync-branch" style="width:100%;box-sizing:border-box;background:#0f172a;color:var(--text);border:1px solid var(--border);border-radius:4px;padding:6px 10px;font-family:var(--font-mono);font-size:12px">
            ${branchOptions}
          </select>
        </div>
        <div>
          <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Date</label>
          <input id="sync-date" type="date" value="${new Date().toISOString().slice(0, 10)}"
            style="width:100%;box-sizing:border-box;background:#0f172a;color:var(--text);border:1px solid var(--border);border-radius:4px;padding:6px 10px;font-family:var(--font-mono);font-size:12px"/>
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
        <input id="push-adj" type="checkbox"/>
        <span>Push inventory adjustment to Foodics after sync</span>
      </label>

      <button id="btn-sync" class="btn btn-foodics" onclick="pulseFoodicsSync()" style="width:100%;padding:12px">
        <i class="fa fa-rotate"></i> Sync with Foodics
      </button>

      <!-- Sync result -->
      <div id="sync-result" style="display:none;padding:14px;background:#0f172a;border-radius:6px;font-size:12px;border:1px solid var(--border)">
        <div style="font-weight:600;color:var(--green);margin-bottom:8px"><i class="fa fa-check-circle"></i> Reconciliation Complete</div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:var(--text-muted);padding:3px 0">Theoretical Usage:</td><td id="sr-theoretical" style="text-align:right;font-family:var(--font-mono)">—</td></tr>
          <tr><td style="color:var(--text-muted);padding:3px 0">Actual IoT Usage:</td><td id="sr-actual" style="text-align:right;font-family:var(--font-mono);color:var(--amber)">—</td></tr>
          <tr style="border-top:1px solid var(--border)"><td style="color:var(--text-muted);padding:3px 0">Variance:</td><td id="sr-variance" style="text-align:right;font-family:var(--font-mono);font-weight:700">—</td></tr>
          <tr><td style="color:var(--text-muted);padding:3px 0">Financial Loss:</td><td id="sr-loss" style="text-align:right;font-family:var(--font-mono);color:var(--red)">—</td></tr>
          <tr><td style="color:var(--text-muted);padding:3px 0">Foodics Orders:</td><td id="sr-orders" style="text-align:right;font-family:var(--font-mono)">—</td></tr>
          <tr><td style="color:var(--text-muted);padding:3px 0">Adjustment:</td><td id="sr-adj" style="text-align:right;font-family:var(--font-mono)">—</td></tr>
        </table>
      </div>

      <!-- Drink map reference -->
      <details style="margin-top:8px">
        <summary style="font-size:11px;color:var(--text-muted);cursor:pointer">
          <i class="fa fa-coffee"></i> Bean-to-Drink Map (${Object.keys(PULSE_BEAN_MAP).length - 1} drinks)
        </summary>
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">
          ${Object.entries(PULSE_BEAN_MAP).filter(([k]) => k !== 'default').map(([name, g]) =>
            `<div style="display:flex;justify-content:space-between;padding:3px 6px;background:#0f172a;border-radius:3px">
              <span>${name}</span><span style="font-family:var(--font-mono);color:var(--amber)">${g}g</span>
            </div>`
          ).join('')}
        </div>
      </details>
    </div>
  </div>
</div>

<!-- ── WASTE LOGS TABLE ────────────────────────────────────────── -->
<div class="card" style="padding:24px;margin-bottom:20px">
  <div class="card-hdr" style="margin-bottom:16px">
    <i class="fa fa-list-ul" style="color:var(--amber)"></i>
    Recent Waste Logs
    <span style="margin-left:auto;font-size:11px;font-family:var(--font-mono);color:var(--text-muted)">${totalWasteLogs} total</span>
    <button onclick="location.reload()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;margin-left:8px" title="Refresh">
      <i class="fa fa-refresh"></i>
    </button>
  </div>
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">ID</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Branch</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Session</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Weight</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Status</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Logged At</th>
        </tr>
      </thead>
      <tbody id="logs-tbody">
        ${logsTableRows}
      </tbody>
    </table>
  </div>
</div>

<!-- ── RECONCILIATION HISTORY TABLE ──────────────────────────── -->
<div class="card" style="padding:24px">
  <div class="card-hdr" style="margin-bottom:16px">
    <i class="fa fa-chart-bar" style="color:var(--green)"></i>
    Reconciliation History
  </div>
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Date</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Branch</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Theoretical</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Actual IoT</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Variance</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Loss (SAR)</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">Foodics Adj</th>
        </tr>
      </thead>
      <tbody>${reconTableRows}</tbody>
    </table>
  </div>
</div>

<!-- ── CLIENT-SIDE PULSE ENGINE ─────────────────────────────── -->
<script>
// ════════════════════════════════════════════════════════════════
//  Qabban Pulse — Browser Engine
//  Uses the AcaiaLink protocol inline (no module bundler needed).
// ════════════════════════════════════════════════════════════════

const ACAIA_SERVICE_UUID        = '0000ffe0-0000-1000-8000-00805f9b34fb'
const ACAIA_CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb'
const ACAIA_MSG_WEIGHT    = 0x0b
const ACAIA_HEADER_1      = 0xef
const ACAIA_HEADER_2      = 0xdd
const HEARTBEAT_CMD = new Uint8Array([0xef,0xdd,0x00,0x02,0x00,0x02,0x00,0x05,0x0f])
const TARE_CMD      = new Uint8Array([0xef,0xdd,0x04,0x02,0x00,0x00,0x00,0x05,0x0b])
const MAX_GAUGE_GRAMS = 200   // full-scale = 200 g

let _btDevice=null, _btChar=null, _btConnected=false, _hbTimer=null
let _parseBuffer=[], _lastWeightTs=0
const MIN_INTERVAL_MS = 200

// Dial-in state
let _dialIn=false, _dialInSession='', _dialInCount=0, _dialInTotal=0.0

// Weight history (last 20 readings)
let _history=[]

// ─ Gauge update ──────────────────────────────────────────────────
function updateGauge(grams, stable) {
  document.getElementById('gauge-weight').textContent = grams.toFixed(1)
  const pct = Math.min(Math.max(grams / MAX_GAUGE_GRAMS, 0), 1)
  const circumference = 2 * Math.PI * 90  // ≈ 565
  const offset = circumference * (1 - pct)
  const arc = document.getElementById('gauge-arc')
  if (arc) arc.style.strokeDashoffset = offset.toFixed(1)
  const color = grams > 150 ? 'var(--red)' : grams > 80 ? 'var(--amber)' : 'var(--green)'
  if (arc) arc.style.stroke = color
  document.getElementById('gauge-weight').style.color = color
  const stEl = document.getElementById('gauge-stable')
  if (stEl) {
    stEl.textContent = stable ? '✔ Stable' : '~ Settling...'
    stEl.style.color = stable ? 'var(--green)' : 'var(--amber)'
  }
  // history bars
  _history.push(grams)
  if (_history.length > 20) _history.shift()
  const maxH = Math.max(..._history, 1)
  const barsEl = document.getElementById('wh-bars')
  if (barsEl) {
    barsEl.innerHTML = _history.map(h => {
      const pctH = (h / maxH * 100).toFixed(0)
      return '<div class="wh-bar" style="height:' + pctH + '%"></div>'
    }).join('')
  }
}

// ─ BT Status badge ───────────────────────────────────────────────
function setBtStatus(connected) {
  const el = document.getElementById('bt-status')
  const scaleCard = document.getElementById('scale-card')
  if (connected) {
    el.innerHTML = '<span class="pulse-ring"></span> Connected'
    el.style.color = 'var(--green)'
    document.getElementById('btn-bt-connect').textContent = '⎋ Disconnect'
    document.getElementById('btn-bt-tare').disabled = false
    if (scaleCard) scaleCard.style.borderColor = 'rgba(16,185,129,0.4)'
    document.getElementById('sim-hint').style.display = 'none'
  } else {
    el.innerHTML = '<i class="fa fa-circle" style="font-size:8px"></i> Disconnected'
    el.style.color = 'var(--text-muted)'
    document.getElementById('btn-bt-connect').innerHTML = '<i class="fa fa-bluetooth"></i> Connect Scale'
    document.getElementById('btn-bt-tare').disabled = true
    if (scaleCard) scaleCard.style.borderColor = ''
    document.getElementById('sim-hint').style.display = 'block'
  }
}

// ─ Packet parser ─────────────────────────────────────────────────
function drainBuffer() {
  while (_parseBuffer.length >= 7) {
    const h1 = _parseBuffer.indexOf(ACAIA_HEADER_1)
    if (h1 === -1) { _parseBuffer = []; return }
    if (h1 > 0) _parseBuffer.splice(0, h1)
    if (_parseBuffer.length < 4) return
    if (_parseBuffer[1] !== ACAIA_HEADER_2) { _parseBuffer.splice(0,1); continue }
    const msgType = _parseBuffer[2]
    const payloadLen = _parseBuffer[3]
    const totalLen = 4 + payloadLen + 1
    if (_parseBuffer.length < totalLen) return
    const packet = new Uint8Array(_parseBuffer.splice(0, totalLen))
    if (msgType === ACAIA_MSG_WEIGHT && packet.length >= 9) parseWeightPacket(packet)
  }
}

function parseWeightPacket(packet) {
  const now = performance.now()
  if (now - _lastWeightTs < MIN_INTERVAL_MS) return
  _lastWeightTs = now
  const rawInt = (packet[5] << 8) | packet[4]
  const signed = rawInt > 0x7FFF ? rawInt - 0x10000 : rawInt
  const grams  = Math.round(signed) / 10
  const stable = Boolean(packet[7] & 0x01)
  updateGauge(grams, stable)

  // Dial-in: log stable positive readings
  if (_dialIn && stable && grams > 0) {
    _dialInCount++
    _dialInTotal = Math.round((_dialInTotal + grams) * 10) / 10
    updateSessionStats()
    // POST to backend
    const branchId = document.getElementById('pulse-branch').value
    fetch('/api/pulse/waste-log', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ branchId, sessionId: _dialInSession, weightGrams: grams, stable: true })
    }).catch(()=>{})
  }
}

function onCharChanged(ev) {
  const view = ev.target.value
  if (!view) return
  const raw = []
  for (let i=0;i<view.byteLength;i++) raw.push(view.getUint8(i))
  _parseBuffer.push(...raw)
  drainBuffer()
}

function startHeartbeat() {
  stopHeartbeat()
  _hbTimer = setInterval(async () => {
    if (!_btChar || !_btConnected) return
    try { await _btChar.writeValue(HEARTBEAT_CMD) } catch(e){}
  }, 2800)
}
function stopHeartbeat() { if (_hbTimer) { clearInterval(_hbTimer); _hbTimer=null } }

// ─ Public: Connect BT ────────────────────────────────────────────
async function pulseConnectBt() {
  if (_btConnected) { await pulseDisconnectBt(); return }
  if (!navigator.bluetooth) {
    alert('Web Bluetooth is not available.\\nUse Google Chrome or Edge on a supported OS (not iOS/Firefox).')
    return
  }
  try {
    _btDevice = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [ACAIA_SERVICE_UUID] },
        { namePrefix: 'ACAIA' }, { namePrefix: 'Acaia' },
        { namePrefix: 'LUNAR' }, { namePrefix: 'PEARL' },
      ],
      optionalServices: [ACAIA_SERVICE_UUID],
    })
    _btDevice.addEventListener('gattserverdisconnected', () => {
      stopHeartbeat(); _btConnected=false; _btChar=null; setBtStatus(false)
    })
    const server  = await _btDevice.gatt.connect()
    const service = await server.getPrimaryService(ACAIA_SERVICE_UUID)
    _btChar       = await service.getCharacteristic(ACAIA_CHARACTERISTIC_UUID)
    await _btChar.startNotifications()
    _btChar.addEventListener('characteristicvaluechanged', onCharChanged)
    startHeartbeat()
    _btConnected = true
    setBtStatus(true)
  } catch(e) {
    if (!e.message.includes('cancelled')) alert('Bluetooth error: ' + e.message)
  }
}

async function pulseDisconnectBt() {
  stopHeartbeat()
  if (_btChar) { try { await _btChar.stopNotifications() } catch(e){} ; _btChar=null }
  if (_btDevice && _btDevice.gatt.connected) _btDevice.gatt.disconnect()
  _btDevice=null; _btConnected=false; setBtStatus(false)
}

async function pulseTare() {
  if (!_btChar) return
  try { await _btChar.writeValue(TARE_CMD) } catch(e){}
}

// ─ Simulate weight (dev/demo) ────────────────────────────────────
let _simTimer=null
function pulseSimulate() {
  if (_simTimer) { clearInterval(_simTimer); _simTimer=null; document.getElementById('btn-simulate').innerHTML='<i class="fa fa-flask"></i> Simulate'; return }
  document.getElementById('btn-simulate').innerHTML='<i class="fa fa-stop"></i> Stop Sim'
  let t=0
  _simTimer = setInterval(() => {
    t += 0.2
    // Simulate a shot curve: 0→18g in 25s, then stable at 18g, then reset
    const cycle = t % 40
    let g = cycle < 25 ? (cycle/25)*18 : cycle < 30 ? 18 : 0
    g = Math.round((g + (Math.random()-0.5)*0.4)*10)/10
    const stable = cycle >= 23 && cycle < 30
    parseWeightPacket(buildFakePacket(g, stable))
  }, 200)
}

function buildFakePacket(grams, stable) {
  const raw10 = Math.round(grams * 10)
  const lo = raw10 & 0xff, hi = (raw10 >> 8) & 0xff
  const status = stable ? 0x01 : 0x00
  let xor = 0x0b ^ 0x06 ^ lo ^ hi ^ 0x02 ^ status
  return new Uint8Array([0xef, 0xdd, 0x0b, 0x06, lo, hi, 0x02, status, 0x00, 0x00, xor])
}

// ─ Dial-in Mode ──────────────────────────────────────────────────
function pulseToggleDialIn() {
  const btn = document.getElementById('btn-dialin')
  const statsEl = document.getElementById('session-stats')
  if (!_dialIn) {
    _dialIn = true
    _dialInSession = 'DI-' + Date.now()
    _dialInCount   = 0
    _dialInTotal   = 0.0
    btn.innerHTML = '<i class="fa fa-stop-circle"></i> Stop Dial-in'
    btn.style.background = 'linear-gradient(135deg,#7f1d1d,#dc2626)'
    statsEl.style.display = 'block'
    document.getElementById('sess-id').textContent = _dialInSession
    updateSessionStats()
  } else {
    _dialIn = false
    btn.innerHTML = '<i class="fa fa-record-vinyl"></i> Dial-in Mode'
    btn.style.background = 'linear-gradient(135deg,#b91c1c,#ef4444)'
  }
}

function updateSessionStats() {
  document.getElementById('sess-count').textContent = _dialInCount
  document.getElementById('sess-total').textContent = _dialInTotal.toFixed(1) + ' g'
}

// ─ Foodics Sync ──────────────────────────────────────────────────
async function pulseFoodicsSync() {
  const key       = document.getElementById('foodics-key').value.trim()
  const branchId  = document.getElementById('sync-branch').value
  const date      = document.getElementById('sync-date').value
  const pushAdj   = document.getElementById('push-adj').checked
  const btn       = document.getElementById('btn-sync')
  const resultEl  = document.getElementById('sync-result')

  if (!key) { alert('Please enter your Foodics API key.'); return }
  if (!date) { alert('Please select a date.'); return }

  btn.disabled = true
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Syncing...'

  try {
    const res = await fetch('/api/pulse/sync', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        branchId, periodDate: date, foodicsApiKey: key,
        pushAdjustment: pushAdj,
        sessionId: _dialInSession || undefined
      })
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error || 'Sync failed')
    const r = data.reconciliation
    const varianceColor = r.variance > 50 ? '#ef4444' : r.variance < -50 ? '#60a5fa' : '#10b981'
    document.getElementById('sr-theoretical').textContent = r.theoreticalUsage.toFixed(0) + ' g'
    document.getElementById('sr-actual').textContent      = r.actualUsageIot.toFixed(1) + ' g'
    document.getElementById('sr-variance').textContent    = (r.variance > 0 ? '+' : '') + r.variance.toFixed(1) + ' g'
    document.getElementById('sr-variance').style.color    = varianceColor
    document.getElementById('sr-loss').textContent        = r.financialLossSar > 0 ? r.financialLossSar.toFixed(2) + ' SAR' : '—'
    document.getElementById('sr-orders').textContent      = r.foodicsOrderCount + ' orders'
    document.getElementById('sr-adj').textContent         = r.adjustmentPushed ? '✔ ' + r.adjustmentId : 'Not pushed'
    document.getElementById('sr-adj').style.color         = r.adjustmentPushed ? 'var(--green)' : 'var(--text-muted)'
    resultEl.style.display = 'block'
  } catch(e) {
    alert('Sync error: ' + e.message)
  } finally {
    btn.disabled = false
    btn.innerHTML = '<i class="fa fa-rotate"></i> Sync with Foodics'
  }
}
</script>
`
  const pendingCountAdmin = beanRequests.filter(r => r.status === 'PENDING').length
  return c.html(adminLayout('Qabban Pulse — Waste Tracking', 'pulse', content, pendingCountAdmin))
})

// ══════════════════════════════════════════════════════════════════
//  HYBRID HUMIDITY MODEL — IoT Telemetry & Source Toggle
// ══════════════════════════════════════════════════════════════════

// ── POST /api/iot/telemetry ───────────────────────────────────────
// Receives a telemetry pulse from a physical ESP32/DHT22 sensor.
//
// Payload: { device_key: string, humidity: number, temperature: number }
//
// Flow:
//  1. Validate device_key → find matching branch
//  2. Update branch iot_humidity, iot_temperature, last_iot_reading_at
//  3. Re-run Sponge Effect on all lots in that branch → return updated yields
//  4. If branch source is WEATHER_API, reading is stored but not yet active
//     (admin must toggle source to IOT_SENSOR to activate)
app.post('/api/iot/telemetry', async (c) => {
  try {
    const body = await c.req.json() as {
      device_key  : string
      humidity    : number
      temperature : number
    }

    const { device_key, humidity, temperature } = body

    // ── Validate payload ──────────────────────────────────────────
    if (!device_key || typeof device_key !== 'string') {
      return c.json({ error: 'device_key is required' }, 400)
    }
    if (typeof humidity !== 'number' || humidity < 0 || humidity > 100) {
      return c.json({ error: 'humidity must be a number 0–100' }, 400)
    }
    if (typeof temperature !== 'number' || temperature < -20 || temperature > 80) {
      return c.json({ error: 'temperature must be a number -20–80' }, 400)
    }

    // ── Authenticate device_key → look up branch ──────────────────
    const branch = branches.find(b => b.iot_device_key === device_key)
    if (!branch) {
      return c.json({ error: 'Unknown device_key — no branch configured for this sensor' }, 401)
    }

    const now = new Date().toISOString()

    // ── Persist IoT reading ───────────────────────────────────────
    branch.iot_humidity         = Math.round(humidity * 10) / 10
    branch.iot_temperature      = Math.round(temperature * 10) / 10
    branch.last_iot_reading_at  = now

    // ── Determine active RH and run hybrid Sponge ─────────────────
    const { rh: activeRH, source: resolvedSource, stale } = resolveActiveRH(branch)
    const spongeResult = calcSpongeCoefficientForBranch(branch)

    // ── Recalculate roasted weight for all lots in this branch ────
    const affectedLots = coffeeLots.filter(l => l.branch === branch.name && l.status !== 'RECALLED')
    const lotUpdates = affectedLots.map(lot => {
      const newRoasted = Math.round(lot.greenWeightKg * spongeResult.coefficient * 10) / 10
      lot.roastedWeightKg = newRoasted
      return {
        lotId          : lot.id,
        origin         : lot.origin,
        greenWeightKg  : lot.greenWeightKg,
        roastedWeightKg: newRoasted,
        spongeCoeff    : spongeResult.coefficient,
      }
    })

    return c.json({
      ok           : true,
      branchId     : branch.id,
      branchName   : branch.name,
      receivedAt   : now,
      iotReading   : { humidity: branch.iot_humidity, temperature: branch.iot_temperature },
      activeSource : resolvedSource,
      autoFallback : stale,
      sponge       : {
        activeRH,
        coefficient  : spongeResult.coefficient,
        rule         : spongeResult.rule,
        label        : spongeResult.label,
        pct          : spongeResult.pct,
        delta        : spongeResult.delta,
      },
      lotsRecalculated: lotUpdates.length,
      lotUpdates,
    })

  } catch (e) {
    return c.json({ error: String(e) }, 400)
  }
})

// ── POST /api/iot/source-toggle ───────────────────────────────────
// Switches a branch between WEATHER_API and IOT_SENSOR data source.
// Body: { branchId: string, source: 'WEATHER_API' | 'IOT_SENSOR' }
app.post('/api/iot/source-toggle', async (c) => {
  try {
    const body = await c.req.json() as { branchId: string; source: HumiditySource }
    const { branchId, source } = body

    if (!branchId) return c.json({ error: 'branchId is required' }, 400)
    if (source !== 'WEATHER_API' && source !== 'IOT_SENSOR') {
      return c.json({ error: 'source must be WEATHER_API or IOT_SENSOR' }, 400)
    }

    const branch = branches.find(b => b.id === branchId)
    if (!branch) return c.json({ error: `Branch ${branchId} not found` }, 404)

    const hasIotData = branch.iot_humidity !== null && branch.last_iot_reading_at !== null
    const ageMs      = hasIotData
      ? Date.now() - new Date(branch.last_iot_reading_at!).getTime()
      : null
    const isStale    = ageMs !== null && ageMs > IOT_STALE_THRESHOLD_MS

    branch.humidity_source = source

    const { rh: activeRH, stale } = resolveActiveRH(branch)
    const sponge = calcSpongeCoefficientForBranch(branch)

    return c.json({
      ok            : true,
      branchId      : branch.id,
      branchName    : branch.name,
      newSource     : source,
      activeRH,
      autoFallback  : stale,
      warning       : source === 'IOT_SENSOR' && !hasIotData
        ? 'No IoT reading received yet — will use WEATHER_API until first pulse arrives'
        : source === 'IOT_SENSOR' && isStale
        ? `IoT data is stale (${Math.round((ageMs! / 60000))} min old) — auto-fallback to WEATHER_API until fresh pulse`
        : null,
      sponge: {
        coefficient: sponge.coefficient,
        rule       : sponge.rule,
        label      : sponge.label,
        pct        : sponge.pct,
      },
      iotStatus: {
        hasData            : hasIotData,
        iot_humidity       : branch.iot_humidity,
        iot_temperature    : branch.iot_temperature,
        last_iot_reading_at: branch.last_iot_reading_at,
        stale              : isStale,
        iot_device_key     : branch.iot_device_key,
      },
    })
  } catch (e) {
    return c.json({ error: String(e) }, 400)
  }
})

// ── GET /api/iot/status ───────────────────────────────────────────
// Returns IoT status for all branches — useful for a monitoring dashboard.
app.get('/api/iot/status', (c) => {
  const now = Date.now()
  const statuses = branches.map(b => {
    const hasData = b.iot_humidity !== null && b.last_iot_reading_at !== null
    const ageMs   = hasData ? now - new Date(b.last_iot_reading_at!).getTime() : null
    const stale   = ageMs !== null && ageMs > IOT_STALE_THRESHOLD_MS
    const { rh: activeRH, source: resolvedSource } = resolveActiveRH(b)
    const sponge  = calcSpongeCoefficientForBranch(b)
    return {
      branchId            : b.id,
      branchName          : b.name,
      humidity_source     : b.humidity_source,
      resolvedSource,
      autoFallback        : b.humidity_source === 'IOT_SENSOR' && stale,
      iot_device_key      : b.iot_device_key,
      iot_humidity        : b.iot_humidity,
      iot_temperature     : b.iot_temperature,
      last_iot_reading_at : b.last_iot_reading_at,
      iot_age_min         : ageMs !== null ? Math.round(ageMs / 60000) : null,
      stale,
      weather_humidity    : b.humidity,
      weather_temperature : b.temperature,
      activeRH,
      sponge: {
        coefficient: sponge.coefficient,
        rule       : sponge.rule,
        pct        : sponge.pct,
        label      : sponge.label,
      },
    }
  })
  return c.json({ branches: statuses })
})

export default app
