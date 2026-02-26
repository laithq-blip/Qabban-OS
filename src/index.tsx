import { Hono } from 'hono'
import {
  coffeeLots,
  branches,
  cafeClients,
  beanRequests,
  roastingInterests,
  applyRoastShrinkage,
  calcLiveBalance,
  getFifoLot,
  CATALOG_ORIGINS,
  CLIMATE_PRESETS,
  classifyRiskForPreset,
  type CoffeeLot,
  type Branch,
  type ClimateType,
  type RoastingInterest,
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
      margin-bottom:4px;
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
  </style>
</head>
<body>
${body}
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
        <div class="login-brand-name">QABBAN <span>OS</span></div>
        <div class="login-brand-sub">Roast Operations Platform</div>
        <div class="login-brand-rule"></div>
      </div>

      <div class="login-tabs">
        <button class="login-tab active" id="tabAdmin" onclick="switchTab('admin')">
          <i class="fa fa-shield-alt"></i> Roaster Admin
        </button>
        <button class="login-tab" id="tabCafe" onclick="switchTab('cafe')">
          <i class="fa fa-mug-hot"></i> Cafe Portal
        </button>
      </div>

      <div class="login-error" id="loginError">
        <i class="fa fa-exclamation-circle"></i>
        <span id="loginErrorMsg">Invalid credentials. Please try again.</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="username">Username</label>
        <input class="form-input" type="text" id="username"
               placeholder="admin" autocomplete="username" autocapitalize="none"/>
      </div>

      <div class="form-group">
        <label class="form-label" for="password">Password</label>
        <input class="form-input" type="password" id="password"
               placeholder="••••••••" autocomplete="current-password"/>
      </div>

      <button class="btn-primary" id="accessBtn" onclick="handleLogin()">
        <i class="fa fa-arrow-right-to-bracket"></i> &nbsp; ACCESS SYSTEM
      </button>

      <div class="login-hint">
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
            'Invalid credentials. Please try again.';
          errEl.style.display = 'flex';
          btn.disabled = false;
          btn.innerHTML = '<i class="fa fa-arrow-right-to-bracket"></i> &nbsp; ACCESS SYSTEM';
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
    { href: '/admin',           icon: 'fa-gauge',         label: 'Overview',      id: 'overview'   },
    { href: '/admin/inventory', icon: 'fa-boxes-stacked', label: 'Inventory',     id: 'inventory'  },
    { href: '/admin/branches',  icon: 'fa-building',      label: 'Branches',      id: 'branches'   },
    { href: '/admin/requests',  icon: 'fa-bell',          label: 'Bean Requests', id: 'requests'   },
  ]
  const body = `
  <header class="topbar">
    <div class="topbar-brand">
      <div class="topbar-logo">
        <img src="/static/qabban-logo-48.png" alt="Qabban OS" width="36" height="36"/>
      </div>
      <span class="topbar-title">QABBAN <span>OS</span></span>
    </div>
    <div class="topbar-right">
      <a href="/admin/requests" class="notif-btn" title="Bean Requests">
        <i class="fa fa-bell"></i>
        ${pendingCount > 0 ? `<span class="notif-count">${pendingCount}</span>` : ''}
      </a>
      <span class="topbar-badge badge-admin"><i class="fa fa-shield-alt"></i> Roaster Admin</span>
      <span class="topbar-user"><i class="fa fa-user-circle"></i> admin</span>
      <a href="/"><button class="btn-logout">LOGOUT</button></a>
    </div>
  </header>
  <div class="layout">
    <nav class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-label">Navigation</div>
        ${navLinks.map(l => `
        <a href="${l.href}" class="sidebar-link ${activeNav === l.id ? 'active' : ''}">
          <i class="fa ${l.icon}"></i> ${l.label}
          ${l.id === 'requests' && pendingCount > 0
            ? `<span style="margin-left:auto;background:var(--red);color:white;font-size:9px;padding:1px 5px;border-radius:9px;font-family:var(--font-mono)">${pendingCount}</span>`
            : ''}
        </a>`).join('')}
      </div>
      <div class="sidebar-section">
        <div class="sidebar-label">System</div>
        <div class="sidebar-link" style="font-size:11px;color:var(--text-muted)">
          <i class="fa fa-circle" style="color:var(--green);font-size:8px"></i> System Online
        </div>
        <div class="sidebar-link" style="font-size:11px;color:var(--text-muted)">
          <i class="fa fa-database"></i> ${branches.length} Branches Active
        </div>
      </div>
    </nav>
    <main class="main">
      <div class="page-header">
        <div class="page-title"><span>// </span>${pageTitle}</div>
        <div class="page-sub">Last sync: 2026-02-24 08:30 UTC+3</div>
      </div>
      ${content}
    </main>
  </div>
  <nav class="mobile-nav">
    <div class="mobile-nav-items">
      ${navLinks.map(l => `
      <a href="${l.href}" class="mobile-nav-item ${activeNav === l.id ? 'active' : ''}">
        <i class="fa ${l.icon}"></i> ${l.label}
      </a>`).join('')}
    </div>
  </nav>`
  return shell(pageTitle, body)
}

function cafeLayout(pageTitle: string, activeNav: string, content: string, clientInfo: { name: string; tier: string; branch: string; id: string }) {
  const cid = clientInfo.id  // e.g. "CAF-001"
  const navLinks = [
    { href: `/cafe?cid=${cid}`,        icon: 'fa-mug-hot',           label: 'Coffee Catalog', id: 'lots'   },
    { href: `/cafe/orders?cid=${cid}`, icon: 'fa-clock-rotate-left', label: 'My Orders',      id: 'orders' },
  ]
  const tierColor = clientInfo.tier === 'Gold' ? 'var(--amber)' : clientInfo.tier === 'Silver' ? '#94a3b8' : '#cd7f32'
  const body = `
  <header class="topbar">
    <div class="topbar-brand">
      <div class="topbar-logo">
        <img src="/static/qabban-logo-48.png" alt="Qabban OS" width="36" height="36"/>
      </div>
      <span class="topbar-title">QABBAN <span>OS</span></span>
    </div>
    <div class="topbar-right">
      <span style="font-family:var(--font-mono);font-size:11px;color:${tierColor};padding:3px 8px;border:1px solid ${tierColor}40;border-radius:2px">
        ★ ${clientInfo.tier}
      </span>
      <span class="topbar-badge badge-cafe"><i class="fa fa-mug-hot"></i> Cafe Portal</span>
      <span class="topbar-user"><i class="fa fa-store"></i> ${clientInfo.name}</span>
      <a href="/"><button class="btn-logout">LOGOUT</button></a>
    </div>
  </header>
  <div class="layout">
    <nav class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-label">Cafe Portal</div>
        ${navLinks.map(l => `
        <a href="${l.href}" class="sidebar-link ${activeNav === l.id ? 'active' : ''}">
          <i class="fa ${l.icon}"></i> ${l.label}
        </a>`).join('')}
      </div>
      <div class="sidebar-section">
        <div class="sidebar-label">Account</div>
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
        <i class="fa ${l.icon}"></i> ${l.label}
      </a>`).join('')}
    </div>
  </nav>

  <!-- Request Beans Modal -->
  <div class="modal-overlay" id="requestModal">
    <div class="modal">
      <div class="modal-title"><i class="fa fa-basket-shopping"></i> Request Beans</div>
      <div id="modalContent"></div>
      <form method="POST" action="/cafe/request" id="requestForm">
        <input type="hidden" name="cafeId" value="${cid}"/>
        <input type="hidden" name="lotId" id="modalLotId"/>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Quantity (kg)</label>
          <input class="form-input" type="number" name="quantity" id="modalQty" min="1" max="500" placeholder="Enter kg" required/>
        </div>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Notes (optional)</label>
          <textarea class="form-textarea" name="notes" placeholder="Delivery instructions, special requirements..."></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" onclick="closeModal()">CANCEL</button>
          <button type="submit" class="btn-confirm"><i class="fa fa-paper-plane"></i> &nbsp;SEND REQUEST</button>
        </div>
      </form>
    </div>
  </div>
  <script>
    function openModal(lotId, origin, available) {
      document.getElementById('modalLotId').value = lotId;
      document.getElementById('modalQty').max = available;
      document.getElementById('modalContent').innerHTML =
        '<div class="modal-row"><span class="modal-row-label">Lot</span><span class="modal-row-val">' + lotId + '</span></div>' +
        '<div class="modal-row"><span class="modal-row-label">Origin</span><span class="modal-row-val">' + origin + '</span></div>' +
        '<div class="modal-row" style="margin-bottom:16px"><span class="modal-row-label">Available</span><span class="modal-row-val" style="color:var(--amber)">' + available + ' kg</span></div>';
      document.getElementById('requestModal').classList.add('open');
    }
    function closeModal() {
      document.getElementById('requestModal').classList.remove('open');
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
      banner.innerHTML =
        '<i class="fa fa-triangle-exclamation recall-banner-icon"></i>' +
        '<div class="recall-banner-body">' +
          '<div class="recall-banner-title">⚠ URGENT RECALL — SFDA AUDIT SHIELD</div>' +
          '<div class="recall-banner-lot">Lot: ' + recall.lotId + ' · ' + recall.lotOrigin + ' · Initiated: ' + recall.initiatedAt + '</div>' +
          '<div class="recall-banner-instructions"><strong>Instructions from Roaster:</strong> ' + recall.instructions + '</div>' +
        '</div>' +
        '<button class="recall-banner-close" onclick="dismissRecallBanner(\'' + recall.lotId + '\')">ACKNOWLEDGE</button>';
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
  const bal = calcLiveBalance(coffeeLots, beanRequests)

  const content = `
  ${criticalBranches > 0 ? `
  <div class="alert alert-critical">
    <i class="fa fa-triangle-exclamation"></i>
    <div><strong>${criticalBranches} branch${criticalBranches > 1 ? 'es' : ''} require immediate attention</strong> — Humidity levels exceed safe thresholds.</div>
  </div>` : ''}

  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label">Live Green Stock</div>
      <div class="stat-value">${bal.liveGreenKg.toLocaleString()}</div>
      <div class="stat-unit">kg available</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Live Roasted Balance</div>
      <div class="stat-value">${bal.liveRoastedKg.toLocaleString()}</div>
      <div class="stat-unit">kg available</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">OPTIMAL Lots</div>
      <div class="stat-value">${optimalLots}</div>
      <div class="stat-unit">of ${coffeeLots.length} total lots</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending Orders</div>
      <div class="stat-value" style="color:${pendingCount > 0 ? 'var(--red)' : 'var(--green)'}">
        ${pendingCount}
      </div>
      <div class="stat-unit">awaiting confirmation</div>
    </div>
  </div>

  <!-- Live balance breakdown banner -->
  <div style="background:var(--bg-2);border:1px solid var(--border);border-left:3px solid var(--amber);border-radius:var(--radius);padding:12px 16px;margin-bottom:24px;display:flex;flex-wrap:wrap;gap:24px;align-items:center">
    <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;flex-shrink:0">
      <i class="fa fa-scale-balanced" style="color:var(--amber)"></i>&nbsp; Live Balance Formula
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
    <div class="card-title">Inventory Shrinkage Summary — All Branches</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lot ID</th><th>Origin</th><th>Branch</th>
            <th>Purchased Green</th><th>Purchased Roasted</th>
            <th>Dispatched</th>
            <th>Live Green Balance</th><th>Live Roasted Balance</th>
            <th>Status</th><th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${coffeeLots.map(l => {
            const lb = bal.byLot.get(l.id)!
            const hasDispatch = lb.dispatchedRoastedKg > 0
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
  const bal = calcLiveBalance(coffeeLots, beanRequests)

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
      border-radius:var(--radius-lg); padding:28px; width:420px; max-width:95vw;
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
        <button class="btn-edit-sensor" onclick="openSensorModal('${b.id}','${b.name}',${b.humidity},${b.temperature})">
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
  function openSensorModal(id, name, humidity, temperature) {
    document.getElementById('sensorBranchName').textContent = name
    document.getElementById('sensorBranchId').value         = id
    document.getElementById('sensorHumidity').value         = humidity
    document.getElementById('sensorTemperature').value      = temperature
    document.getElementById('sensorOverlay').classList.add('open')
  }
  function closeSensorModal() {
    document.getElementById('sensorOverlay').classList.remove('open')
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
  const bal            = calcLiveBalance(coffeeLots, beanRequests)
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
    <div class="stat-card">
      <div class="stat-label">Live Roasted Balance</div>
      <div class="stat-value">${bal.liveRoastedKg.toLocaleString()}</div>
      <div class="stat-unit">kg available</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Dispatched</div>
      <div class="stat-value" style="color:var(--red)">${bal.dispatchedRoastedKg.toLocaleString()}</div>
      <div class="stat-unit">kg roasted sent out</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Yield Rate</div>
      <div class="stat-value">82%</div>
      <div class="stat-unit">Roasted = Green × 0.82</div>
    </div>
  </div>

  <!-- Balance equation card -->
  <div class="card" style="margin-bottom:20px">
    <div class="card-title">Live Balance Formula</div>
    <div style="padding:16px;background:var(--bg-2);border-radius:var(--radius);font-family:var(--font-mono);font-size:13px;letter-spacing:0.4px;line-height:2">
      <div>
        <span style="color:var(--text-muted)">Purchased Green:    </span>
        <span style="color:var(--text-pri)">${bal.purchasedGreenKg.toLocaleString()} kg</span>
      </div>
      <div>
        <span style="color:var(--text-muted)">Dispatched (roasted): </span>
        <span style="color:var(--red)">− ${bal.dispatchedRoastedKg.toLocaleString()} kg roasted</span>
        <span style="color:var(--text-muted);font-size:11px"> (÷ 0.82 = ${bal.dispatchedGreenEquiv.toLocaleString()} kg green equiv.)</span>
      </div>
      <div style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px">
        <span style="color:var(--amber)">Live Green Balance: </span>
        <span style="color:var(--amber);font-weight:700">${bal.liveGreenKg.toLocaleString()} kg</span>
        <span style="color:var(--text-muted);font-size:11px"> × 0.82 = </span>
        <span style="color:var(--amber)">${bal.liveRoastedKg.toLocaleString()} kg roasted</span>
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
  return c.redirect('/admin/requests')
})

// ── POST /admin/requests/:id/dispatch ──────────────────────────
app.post('/admin/requests/:id/dispatch', (c) => {
  const req = beanRequests.find(r => r.id === c.req.param('id'))
  if (req) req.status = 'DISPATCHED'
  return c.redirect('/admin/requests')
})

// ── POST /admin/requests/:id/cancel ────────────────────────────
// Sets status to CANCELLED. calcLiveBalance() only counts DISPATCHED,
// so the deducted weight is immediately restored to live stock totals.
app.post('/admin/requests/:id/cancel', (c) => {
  const req = beanRequests.find(r => r.id === c.req.param('id'))
  if (req) req.status = 'CANCELLED'
  return c.redirect('/admin/requests')
})

// ── POST /admin/interests/:id/seen ─────────────────────────────
app.post('/admin/interests/:id/seen', (c) => {
  const ri = roastingInterests.find(r => r.id === c.req.param('id'))
  if (ri) ri.status = 'SEEN'
  return c.redirect('/admin/requests')
})

// ── POST /admin/interests/:id/schedule ─────────────────────────
app.post('/admin/interests/:id/schedule', (c) => {
  const ri = roastingInterests.find(r => r.id === c.req.param('id'))
  if (ri) ri.status = 'SCHEDULED'
  return c.redirect('/admin/requests')
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
  const bal         = calcLiveBalance(coffeeLots, beanRequests)

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

  const inStockCount  = CATALOG_ORIGINS.filter(c => (originBalanceMap.get(c.key) ?? 0) > 0).length
  const outOfStockCount = CATALOG_ORIGINS.length - inStockCount

  const content = `
  <!-- NOTE: Recall alerts are injected dynamically by checkRecalls() polling every 4s.
       No static server-rendered recall alert here — banners only appear when admin
       has explicitly clicked INITIATE RECALL in the Inventory tab. -->

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

      return `
    <div class="lot-card${isInStock ? '' : ' oos'}" style="position:relative">
      <!-- Header row: origin name + stock badge -->
      <div class="lot-header">
        <div>
          <div class="lot-id">${cat.variety} · ${cat.process}</div>
          <div class="lot-origin">${cat.displayName}</div>
        </div>
        ${isInStock
          ? `<span class="badge badge-OPTIMAL">IN STOCK</span>`
          : `<span class="badge badge-OOS">OUT OF STOCK</span>`
        }
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
      <div class="lot-footer">
        <button class="btn-request"
          onclick="openModal('${bestLot.id}','${cat.displayName.replace(/'/g, "\\'")}',${liveRoasted})">
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
  </script>`

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

  if (!lot || isNaN(quantity) || quantity <= 0) return c.redirect('/cafe')

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

  return c.redirect('/cafe/orders?success=1&cid=' + client.id)
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

  if (!origin || isNaN(interestedKg) || interestedKg <= 0) return c.redirect('/cafe')

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

  return c.redirect('/cafe/orders?preorder=1&cid=' + client.id)
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

export default app
