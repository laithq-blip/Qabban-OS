import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { cors } from 'hono/cors'
import {
  coffeeLots,
  branches,
  cafeClients,
  beanRequests,
  BeanRequest,
  applyRoastShrinkage,
  classifyHumidityRisk,
} from './data'

const ADMIN_USER = 'admin'
const ADMIN_PASS = 'qabban2026'
// Simple secret for HMAC signing — change in production
const COOKIE_SECRET = 'qabban-os-secret-2026'

// ─── Stateless signed-cookie session (survives Worker isolate restarts) ───
// Cookie value format:  base64(payload) + '.' + base64(hmac)
// payload: JSON { role, cafeId?, iat }

async function signPayload(payload: object): Promise<string> {
  const data = btoa(JSON.stringify(payload))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(COOKIE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return data + '.' + sigB64
}

async function verifyPayload(token: string): Promise<{ role: 'admin' | 'cafe'; cafeId?: string } | null> {
  try {
    const [data, sigB64] = token.split('.')
    if (!data || !sigB64) return null
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(COOKIE_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data))
    if (!valid) return null
    return JSON.parse(atob(data))
  } catch {
    return null
  
  }
}

function cookieOpts(secure: boolean) {
  return {
    path: '/',
    maxAge: 86400,
    httpOnly: true,
    sameSite: secure ? ('None' as const) : ('Lax' as const),
    ...(secure ? { secure: true } : {}),
  }
}

const app = new Hono()
app.use('*', cors())

// ══════════════════════════════════════════════════════════════════
//  SHARED LAYOUT HELPERS
// ══════════════════════════════════════════════════════════════════

const html = (content: string, title = 'Qabban OS') => `<!DOCTYPE html>
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
    /* ── RESET & BASE ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg-0: #0a0a0a;
      --bg-1: #111111;
      --bg-2: #181818;
      --bg-3: #222222;
      --bg-4: #2a2a2a;
      --amber: #f59e0b;
      --amber-dim: #b45309;
      --amber-glow: rgba(245,158,11,0.12);
      --amber-glow2: rgba(245,158,11,0.25);
      --green: #10b981;
      --green-dim: rgba(16,185,129,0.15);
      --red: #ef4444;
      --red-dim: rgba(239,68,68,0.15);
      --orange: #f97316;
      --orange-dim: rgba(249,115,22,0.15);
      --blue: #3b82f6;
      --text-pri: #f5f5f5;
      --text-sec: #a3a3a3;
      --text-muted: #525252;
      --border: #2a2a2a;
      --border-amber: rgba(245,158,11,0.3);
      --font-mono: 'IBM Plex Mono', monospace;
      --font-sans: 'Inter', sans-serif;
      --radius: 4px;
      --radius-lg: 8px;
    }
    html { font-size: 16px; }
    body {
      background: var(--bg-0);
      color: var(--text-pri);
      font-family: var(--font-sans);
      min-height: 100vh;
      line-height: 1.6;
    }
    a { color: var(--amber); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ── SCROLLBAR ── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-1); }
    ::-webkit-scrollbar-thumb { background: var(--bg-4); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--amber-dim); }

    /* ── TOPBAR ── */
    .topbar {
      position: sticky; top: 0; z-index: 100;
      background: var(--bg-1);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; height: 58px;
    }
    .topbar-brand {
      display: flex; align-items: center; gap: 12px;
    }
    .topbar-logo {
      width: 32px; height: 32px;
      background: var(--amber); border-radius: var(--radius);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-mono); font-weight: 700; font-size: 14px;
      color: var(--bg-0); letter-spacing: -1px;
    }
    .topbar-title {
      font-family: var(--font-mono); font-size: 15px; font-weight: 700;
      color: var(--text-pri); letter-spacing: 1px;
    }
    .topbar-title span { color: var(--amber); }
    .topbar-right { display: flex; align-items: center; gap: 16px; }
    .topbar-badge {
      font-family: var(--font-mono); font-size: 10px; font-weight: 500;
      padding: 3px 8px; border-radius: 2px; text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-admin { background: var(--amber-glow); color: var(--amber); border: 1px solid var(--border-amber); }
    .badge-cafe  { background: rgba(59,130,246,0.12); color: var(--blue); border: 1px solid rgba(59,130,246,0.3); }
    .topbar-user {
      font-size: 13px; color: var(--text-sec);
      display: flex; align-items: center; gap: 6px;
    }
    .btn-logout {
      font-family: var(--font-mono); font-size: 11px;
      padding: 5px 12px; border-radius: var(--radius);
      background: transparent; color: var(--text-muted);
      border: 1px solid var(--border); cursor: pointer;
      transition: all .2s;
    }
    .btn-logout:hover { border-color: var(--red); color: var(--red); }

    /* ── MAIN LAYOUT ── */
    .layout { display: flex; min-height: calc(100vh - 58px); }
    .sidebar {
      width: 220px; min-width: 220px;
      background: var(--bg-1);
      border-right: 1px solid var(--border);
      padding: 20px 0;
    }
    .sidebar-section { margin-bottom: 24px; }
    .sidebar-label {
      font-family: var(--font-mono); font-size: 9px;
      text-transform: uppercase; letter-spacing: 1.5px;
      color: var(--text-muted); padding: 0 20px; margin-bottom: 6px;
    }
    .sidebar-link {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 20px; font-size: 13px; color: var(--text-sec);
      cursor: pointer; transition: all .2s; text-decoration: none;
      border-left: 2px solid transparent;
    }
    .sidebar-link:hover { color: var(--text-pri); background: var(--bg-2); text-decoration: none; }
    .sidebar-link.active {
      color: var(--amber); background: var(--amber-glow);
      border-left-color: var(--amber);
    }
    .sidebar-link i { width: 16px; text-align: center; font-size: 12px; }
    .main { flex: 1; padding: 28px; overflow-x: hidden; }
    .page-header { margin-bottom: 28px; }
    .page-title {
      font-family: var(--font-mono); font-size: 20px; font-weight: 700;
      color: var(--text-pri); letter-spacing: 0.5px;
    }
    .page-title span { color: var(--amber); }
    .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

    /* ── CARDS ── */
    .card {
      background: var(--bg-1); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 20px;
    }
    .card-title {
      font-family: var(--font-mono); font-size: 11px;
      text-transform: uppercase; letter-spacing: 1px;
      color: var(--text-muted); margin-bottom: 12px;
      display: flex; align-items: center; gap: 8px;
    }
    .card-title::after {
      content: ''; flex: 1; height: 1px; background: var(--border);
    }

    /* ── STAT GRID ── */
    .stat-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
    .stat-card {
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 18px;
      transition: border-color .2s;
    }
    .stat-card:hover { border-color: var(--border-amber); }
    .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
    .stat-value {
      font-family: var(--font-mono); font-size: 28px; font-weight: 700;
      color: var(--amber); margin: 6px 0 2px;
    }
    .stat-unit { font-size: 11px; color: var(--text-sec); }

    /* ── TABLE ── */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      text-align: left; padding: 10px 14px;
      font-family: var(--font-mono); font-size: 10px; font-weight: 500;
      text-transform: uppercase; letter-spacing: 1px;
      color: var(--text-muted); border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    td { padding: 12px 14px; border-bottom: 1px solid var(--bg-3); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg-2); }
    .mono { font-family: var(--font-mono); font-size: 12px; }

    /* ── STATUS BADGES ── */
    .badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-family: var(--font-mono); font-size: 10px; font-weight: 600;
      padding: 3px 8px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; }
    .badge-OPTIMAL  { background: var(--green-dim); color: var(--green); border: 1px solid rgba(16,185,129,.3); }
    .badge-OPTIMAL::before  { background: var(--green); }
    .badge-MONITOR  { background: var(--orange-dim); color: var(--orange); border: 1px solid rgba(249,115,22,.3); }
    .badge-MONITOR::before  { background: var(--orange); }
    .badge-CRITICAL { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239,68,68,.3); }
    .badge-CRITICAL::before { background: var(--red); animation: pulse 1.2s infinite; }
    .badge-LOW      { background: var(--green-dim); color: var(--green); border: 1px solid rgba(16,185,129,.3); }
    .badge-LOW::before      { background: var(--green); }
    .badge-MODERATE { background: var(--orange-dim); color: var(--orange); border: 1px solid rgba(249,115,22,.3); }
    .badge-MODERATE::before { background: var(--orange); }
    .badge-HIGH     { background: rgba(239,68,68,.1); color: #fb923c; border: 1px solid rgba(249,115,22,.4); }
    .badge-HIGH::before     { background: #fb923c; }
    .badge-PENDING    { background: rgba(59,130,246,.12); color: var(--blue); border: 1px solid rgba(59,130,246,.3); }
    .badge-PENDING::before  { background: var(--blue); }
    .badge-CONFIRMED  { background: var(--green-dim); color: var(--green); border: 1px solid rgba(16,185,129,.3); }
    .badge-CONFIRMED::before { background: var(--green); }
    .badge-DISPATCHED { background: var(--amber-glow); color: var(--amber); border: 1px solid var(--border-amber); }
    .badge-DISPATCHED::before { background: var(--amber); }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }

    /* ── BRANCH CARDS ── */
    .branch-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .branch-card {
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 20px;
      position: relative; overflow: hidden; transition: border-color .2s;
    }
    .branch-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    }
    .branch-card.risk-LOW::before      { background: var(--green); }
    .branch-card.risk-MODERATE::before { background: var(--orange); }
    .branch-card.risk-HIGH::before     { background: #fb923c; }
    .branch-card.risk-CRITICAL::before { background: var(--red); }
    .branch-card:hover { border-color: var(--border-amber); }
    .branch-name {
      font-family: var(--font-mono); font-size: 16px; font-weight: 700;
      color: var(--text-pri); margin-bottom: 4px;
    }
    .branch-id { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); margin-bottom: 14px; }
    .branch-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .branch-metric-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; }
    .branch-metric-value { font-family: var(--font-mono); font-size: 22px; font-weight: 700; margin-top: 2px; }
    .metric-humidity { color: var(--amber); }
    .metric-temp { color: var(--blue); }
    .branch-footer { display: flex; justify-content: space-between; align-items: center; }
    .branch-footer-info { font-size: 11px; color: var(--text-muted); }

    /* ── HUMIDITY BAR ── */
    .humidity-bar { margin-top: 8px; height: 4px; background: var(--bg-4); border-radius: 2px; overflow: hidden; }
    .humidity-fill { height: 100%; border-radius: 2px; transition: width .5s; }

    /* ── LOT CARDS (cafe view) ── */
    .lot-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    .lot-card {
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 20px;
      transition: all .25s; cursor: default;
    }
    .lot-card:hover { border-color: var(--border-amber); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,.4); }
    .lot-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .lot-id { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
    .lot-origin { font-size: 15px; font-weight: 600; color: var(--text-pri); margin-top: 2px; }
    .lot-variety { font-size: 12px; color: var(--text-sec); margin-top: 1px; }
    .lot-divider { height: 1px; background: var(--border); margin: 14px 0; }
    .lot-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .lot-metric-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; }
    .lot-metric-value { font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--amber); margin-top: 2px; }
    .lot-metric-sub { font-size: 10px; color: var(--text-muted); }
    .flavor-tags { display: flex; flex-wrap: wrap; gap: 5px; margin: 12px 0; }
    .flavor-tag {
      font-size: 10px; padding: 2px 7px;
      background: var(--bg-3); border: 1px solid var(--border);
      border-radius: 2px; color: var(--text-sec);
    }
    .lot-footer { margin-top: 14px; }
    .btn-request {
      width: 100%;
      font-family: var(--font-mono); font-size: 12px; font-weight: 600;
      padding: 10px 16px; border-radius: var(--radius);
      background: var(--amber-glow); color: var(--amber);
      border: 1px solid var(--border-amber);
      cursor: pointer; transition: all .2s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-request:hover { background: var(--amber); color: var(--bg-0); }

    /* ── WEIGHT DISPLAY ── */
    .weight-block {
      display: flex; align-items: center; gap: 6px;
      font-family: var(--font-mono); font-size: 12px;
    }
    .weight-green  { color: var(--text-sec); }
    .weight-arrow  { color: var(--text-muted); }
    .weight-roast  { color: var(--amber); font-weight: 600; }
    .weight-shrink { font-size: 9px; color: var(--text-muted); }

    /* ── LOGIN PAGE ── */
    .login-page {
      min-height: 100vh; display: flex;
      align-items: center; justify-content: center;
      background: var(--bg-0);
      background-image:
        repeating-linear-gradient(0deg, transparent, transparent 39px, var(--bg-2) 39px, var(--bg-2) 40px),
        repeating-linear-gradient(90deg, transparent, transparent 39px, var(--bg-2) 39px, var(--bg-2) 40px);
    }
    .login-box {
      background: var(--bg-1); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 40px 36px; width: 380px; max-width: 95vw;
    }
    .login-logo {
      display: flex; align-items: center; gap: 14px; margin-bottom: 32px;
    }
    .login-logo-icon {
      width: 48px; height: 48px;
      background: var(--amber); border-radius: var(--radius-lg);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-mono); font-weight: 700; font-size: 20px;
      color: var(--bg-0);
    }
    .login-brand-name {
      font-family: var(--font-mono); font-size: 22px; font-weight: 700;
      color: var(--text-pri);
    }
    .login-brand-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .login-tabs { display: flex; margin-bottom: 28px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .login-tab {
      flex: 1; padding: 8px; font-size: 12px; font-family: var(--font-mono);
      text-align: center; cursor: pointer; background: var(--bg-2); color: var(--text-muted);
      border: none; transition: all .2s; letter-spacing: .5px;
    }
    .login-tab.active { background: var(--amber-glow); color: var(--amber); }
    .form-group { margin-bottom: 16px; }
    .form-label { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; display: block; }
    .form-input {
      width: 100%; padding: 10px 14px;
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--text-pri);
      font-family: var(--font-mono); font-size: 13px;
      outline: none; transition: border-color .2s;
    }
    .form-input:focus { border-color: var(--amber); }
    .form-input::placeholder { color: var(--text-muted); }
    .btn-primary {
      width: 100%; padding: 12px;
      font-family: var(--font-mono); font-size: 13px; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase;
      background: var(--amber); color: var(--bg-0);
      border: none; border-radius: var(--radius); cursor: pointer;
      transition: all .2s; margin-top: 8px;
    }
    .btn-primary:hover { background: #d97706; }
    .login-error {
      background: var(--red-dim); border: 1px solid rgba(239,68,68,.3);
      border-radius: var(--radius); padding: 10px 14px;
      font-size: 12px; color: var(--red); margin-bottom: 16px;
    }
    .login-hint {
      margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);
      font-size: 11px; color: var(--text-muted); text-align: center;
    }
    .login-hint code {
      font-family: var(--font-mono); color: var(--amber);
      background: var(--amber-glow); padding: 2px 5px; border-radius: 2px;
    }

    /* ── ALERT BANNER ── */
    .alert {
      padding: 12px 16px; border-radius: var(--radius);
      font-size: 13px; margin-bottom: 16px;
      display: flex; align-items: center; gap: 10px;
    }
    .alert-warning {
      background: rgba(249,115,22,.1); border: 1px solid rgba(249,115,22,.3);
      color: #fb923c;
    }
    .alert-critical {
      background: var(--red-dim); border: 1px solid rgba(239,68,68,.3);
      color: var(--red);
    }
    .alert-success {
      background: var(--green-dim); border: 1px solid rgba(16,185,129,.3);
      color: var(--green);
    }

    /* ── MODAL ── */
    .modal-overlay {
      display: none; position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,.7); backdrop-filter: blur(4px);
      align-items: center; justify-content: center;
    }
    .modal-overlay.open { display: flex; }
    .modal {
      background: var(--bg-1); border: 1px solid var(--border-amber);
      border-radius: var(--radius-lg); padding: 28px;
      width: 440px; max-width: 95vw;
    }
    .modal-title {
      font-family: var(--font-mono); font-size: 14px; font-weight: 700;
      color: var(--text-pri); margin-bottom: 20px;
      display: flex; align-items: center; gap: 8px;
    }
    .modal-title i { color: var(--amber); }
    .modal-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--bg-3); font-size: 13px; }
    .modal-row:last-of-type { border-bottom: none; }
    .modal-row-label { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
    .modal-row-val { font-family: var(--font-mono); color: var(--text-pri); }
    .modal-actions { display: flex; gap: 10px; margin-top: 20px; }
    .btn-cancel {
      flex: 1; padding: 10px;
      font-family: var(--font-mono); font-size: 12px;
      background: transparent; color: var(--text-muted);
      border: 1px solid var(--border); border-radius: var(--radius);
      cursor: pointer; transition: all .2s;
    }
    .btn-cancel:hover { border-color: var(--red); color: var(--red); }
    .btn-confirm {
      flex: 2; padding: 10px;
      font-family: var(--font-mono); font-size: 12px; font-weight: 700;
      background: var(--amber); color: var(--bg-0);
      border: none; border-radius: var(--radius);
      cursor: pointer; transition: all .2s; letter-spacing: .5px;
    }
    .btn-confirm:hover { background: #d97706; }
    .form-textarea {
      width: 100%; padding: 10px 14px;
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--text-pri);
      font-family: var(--font-sans); font-size: 13px;
      outline: none; transition: border-color .2s;
      resize: vertical; min-height: 72px;
    }
    .form-textarea:focus { border-color: var(--amber); }
    .form-select {
      width: 100%; padding: 10px 14px;
      background: var(--bg-2); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--text-pri);
      font-family: var(--font-mono); font-size: 13px;
      outline: none; transition: border-color .2s; cursor: pointer;
    }
    .form-select:focus { border-color: var(--amber); }

    /* ── SCORE BAR ── */
    .score-bar { display: flex; align-items: center; gap: 8px; }
    .score-track { flex: 1; height: 4px; background: var(--bg-4); border-radius: 2px; overflow: hidden; }
    .score-fill { height: 100%; background: var(--amber); border-radius: 2px; }
    .score-num { font-family: var(--font-mono); font-size: 12px; color: var(--amber); min-width: 26px; }

    /* ── NOTIFICATION BELL ── */
    .notif-btn {
      position: relative; background: transparent; border: 1px solid var(--border);
      border-radius: var(--radius); padding: 7px 10px;
      color: var(--text-muted); cursor: pointer; transition: all .2s;
    }
    .notif-btn:hover { border-color: var(--border-amber); color: var(--amber); }
    .notif-count {
      position: absolute; top: -5px; right: -5px;
      background: var(--red); color: white;
      font-family: var(--font-mono); font-size: 9px; font-weight: 700;
      width: 16px; height: 16px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }

    /* ── RESPONSIVE ── */
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .main { padding: 16px; }
      .topbar { padding: 0 16px; }
      .topbar-title { font-size: 13px; }
      .branch-grid { grid-template-columns: 1fr; }
      .lot-grid { grid-template-columns: 1fr; }
      .stat-grid { grid-template-columns: repeat(2, 1fr); }
    }

    /* ── MOBILE NAV ── */
    .mobile-nav {
      display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
      background: var(--bg-1); border-top: 1px solid var(--border);
      padding: 8px 0;
    }
    .mobile-nav-items { display: flex; justify-content: space-around; }
    .mobile-nav-item {
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      font-size: 10px; color: var(--text-muted); padding: 4px 12px;
      background: transparent; border: none; cursor: pointer; text-decoration: none;
      transition: color .2s;
    }
    .mobile-nav-item.active { color: var(--amber); }
    .mobile-nav-item i { font-size: 18px; }
    @media (max-width: 768px) {
      .mobile-nav { display: block; }
      .main { padding-bottom: 72px; }
    }

    /* ── TOAST ── */
    .toast-container { position: fixed; top: 70px; right: 20px; z-index: 999; display: flex; flex-direction: column; gap: 8px; }
    .toast {
      min-width: 280px; max-width: 360px;
      background: var(--bg-2); border: 1px solid var(--border-amber);
      border-radius: var(--radius-lg); padding: 14px 16px;
      font-size: 13px; color: var(--text-pri);
      display: flex; align-items: flex-start; gap: 10px;
      animation: slideIn .3s ease;
    }
    .toast i { color: var(--amber); font-size: 16px; margin-top: 1px; }
    .toast-title { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--amber); }
    .toast-body  { font-size: 11px; color: var(--text-sec); margin-top: 2px; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    /* ── SECTION DIVIDER ── */
    .divider { height: 1px; background: var(--border); margin: 28px 0; }

    /* ── EMPTY STATE ── */
    .empty-state {
      text-align: center; padding: 48px 20px;
      color: var(--text-muted); font-size: 13px;
    }
    .empty-state i { font-size: 36px; color: var(--bg-4); margin-bottom: 12px; display: block; }
  </style>
</head>
<body>
${content}
</body>
</html>`

// ══════════════════════════════════════════════════════════════════
//  AUTH HELPERS
// ══════════════════════════════════════════════════════════════════

async function getSession(c: any): Promise<{ role: 'admin' | 'cafe'; cafeId?: string } | null> {
  const token = getCookie(c, 'qos_session')
  if (!token) return null
  return verifyPayload(token)
}

function isSecure(c: any): boolean {
  const proto = c.req.header('x-forwarded-proto') || ''
  return proto === 'https'
}

// ══════════════════════════════════════════════════════════════════
//  LOGIN PAGE
// ══════════════════════════════════════════════════════════════════

app.get('/', async (c) => {
  const sess = await getSession(c)
  if (sess) {
    if (sess.role === 'admin') return c.redirect('/admin')
    if (sess.role === 'cafe') return c.redirect('/cafe')
  }
  return c.html(html(loginPage('', ''), 'Login'))
})

function loginPage(error: string, tab: string) {
  const activeTab = tab || 'admin'
  return `
  <div class="login-page">
    <div class="login-box">
      <div class="login-logo">
        <div class="login-logo-icon">QO</div>
        <div>
          <div class="login-brand-name">Qabban OS</div>
          <div class="login-brand-sub">Roast Operations Platform</div>
        </div>
      </div>
      <div class="login-tabs">
        <button class="login-tab ${activeTab==='admin'?'active':''}" onclick="setTab('admin')">
          <i class="fa fa-shield-alt"></i> Roaster Admin
        </button>
        <button class="login-tab ${activeTab==='cafe'?'active':''}" onclick="setTab('cafe')">
          <i class="fa fa-mug-hot"></i> Cafe Portal
        </button>
      </div>
      <div class="login-error" id="loginError" style="display:none"><i class="fa fa-exclamation-circle"></i> <span id="loginErrorMsg">Invalid credentials.</span></div>
      <form id="loginForm">
        <input type="hidden" id="roleInput" value="${activeTab}"/>
        <div class="form-group">
          <label class="form-label" for="username">Username</label>
          <input class="form-input" type="text" id="username" placeholder="${activeTab==='admin'?'admin':'alnokhba'}" autocomplete="username"/>
        </div>
        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input class="form-input" type="password" id="password" placeholder="••••••••" autocomplete="current-password"/>
        </div>
        <button type="submit" class="btn-primary" id="submitBtn">
          <i class="fa fa-arrow-right-to-bracket"></i> &nbsp; ACCESS SYSTEM
        </button>
      </form>
      <div class="login-hint">
        Demo credentials &mdash; Admin: <code>admin</code> / <code>qabban2026</code><br/>
        Cafe: <code>alnokhba</code> / <code>cafe123</code>
      </div>
    </div>
  </div>
  <script>
    function setTab(tab) {
      document.querySelectorAll('.login-tab').forEach((t,i) => t.classList.toggle('active', (i===0&&tab==='admin')||(i===1&&tab==='cafe')));
      document.getElementById('roleInput').value = tab;
      document.getElementById('username').placeholder = tab==='admin' ? 'admin' : 'alnokhba';
    }
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = document.getElementById('submitBtn');
      var errEl = document.getElementById('loginError');
      var errMsg = document.getElementById('loginErrorMsg');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> &nbsp; AUTHENTICATING...';
      errEl.style.display = 'none';
      var role = document.getElementById('roleInput').value;
      var body = 'role=' + encodeURIComponent(role)
        + '&username=' + encodeURIComponent(document.getElementById('username').value.trim())
        + '&password=' + encodeURIComponent(document.getElementById('password').value);
      try {
        var res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body,
          redirect: 'manual',
          credentials: 'same-origin'
        });
        // status 0 = opaque redirect (cookie set) or 302
        if (res.status === 0 || res.status === 302) {
          window.location.href = role === 'admin' ? '/admin' : '/cafe';
        } else if (res.status === 200) {
          // Credentials wrong — server returned the login page again
          errMsg.textContent = role === 'admin' ? 'Invalid admin credentials.' : 'Invalid cafe credentials.';
          errEl.style.display = 'flex';
          btn.disabled = false;
          btn.innerHTML = '<i class="fa fa-arrow-right-to-bracket"></i> &nbsp; ACCESS SYSTEM';
        } else {
          window.location.href = role === 'admin' ? '/admin' : '/cafe';
        }
      } catch(err) {
        // Network error or CORS opaque — cookie likely set, navigate anyway
        window.location.href = role === 'admin' ? '/admin' : '/cafe';
      }
    });
  </script>`
}

// ── POST /login ─────────────────────────────────────────────────
app.post('/login', async (c) => {
  const form = await c.req.formData()
  const role = form.get('role') as string
  const username = (form.get('username') as string || '').trim()
  const password = (form.get('password') as string || '').trim()
  const secure = isSecure(c)

  if (role === 'admin') {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = await signPayload({ role: 'admin', iat: Date.now() })
      setCookie(c, 'qos_session', token, cookieOpts(secure))
      return c.redirect('/admin')
    }
    return c.html(html(loginPage('Invalid admin credentials.', 'admin'), 'Login'))
  }

  if (role === 'cafe') {
    const client = cafeClients.find(
      (cl) => cl.username === username && cl.password === password
    )
    if (client) {
      const token = await signPayload({ role: 'cafe', cafeId: client.id, iat: Date.now() })
      setCookie(c, 'qos_session', token, cookieOpts(secure))
      return c.redirect('/cafe')
    }
    return c.html(html(loginPage('Invalid cafe credentials.', 'cafe'), 'Login'))
  }

  return c.redirect('/')
})

// ── GET /logout ─────────────────────────────────────────────────
app.get('/logout', (c) => {
  deleteCookie(c, 'qos_session', { path: '/' })
  return c.redirect('/')
})

// ══════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════

function adminLayout(pageTitle: string, activeNav: string, content: string, pendingCount = 0) {
  const navLinks = [
    { href: '/admin', icon: 'fa-gauge', label: 'Overview', id: 'overview' },
    { href: '/admin/inventory', icon: 'fa-boxes-stacked', label: 'Inventory', id: 'inventory' },
    { href: '/admin/branches', icon: 'fa-building', label: 'Branches', id: 'branches' },
    { href: '/admin/requests', icon: 'fa-bell', label: 'Bean Requests', id: 'requests' },
  ]
  return html(`
  <div class="toast-container" id="toastContainer"></div>
  <header class="topbar">
    <div class="topbar-brand">
      <div class="topbar-logo">QO</div>
      <span class="topbar-title">QABBAN <span>OS</span></span>
    </div>
    <div class="topbar-right">
      <a href="/admin/requests" class="notif-btn" title="Bean Requests">
        <i class="fa fa-bell"></i>
        ${pendingCount > 0 ? `<span class="notif-count">${pendingCount}</span>` : ''}
      </a>
      <span class="topbar-badge badge-admin"><i class="fa fa-shield-alt"></i> Roaster Admin</span>
      <span class="topbar-user"><i class="fa fa-user-circle"></i> admin</span>
      <a href="/logout"><button class="btn-logout">LOGOUT</button></a>
    </div>
  </header>
  <div class="layout">
    <nav class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-label">Navigation</div>
        ${navLinks.map(l => `
        <a href="${l.href}" class="sidebar-link ${activeNav===l.id?'active':''}">
          <i class="fa ${l.icon}"></i> ${l.label}
          ${l.id==='requests' && pendingCount > 0 ? `<span style="margin-left:auto;background:var(--red);color:white;font-size:9px;padding:1px 5px;border-radius:9px;font-family:var(--font-mono)">${pendingCount}</span>` : ''}
        </a>`).join('')}
      </div>
      <div class="sidebar-section">
        <div class="sidebar-label">System</div>
        <div class="sidebar-link" style="font-size:11px;color:var(--text-muted)">
          <i class="fa fa-circle" style="color:var(--green);font-size:8px"></i> System Online
        </div>
        <div class="sidebar-link" style="font-size:11px;color:var(--text-muted)">
          <i class="fa fa-database"></i> 3 Branches Active
        </div>
      </div>
    </nav>
    <main class="main">
      <div class="page-header">
        <div class="page-title"><span>// </span>${pageTitle}</div>
        <div class="page-sub">Last sync: 2026-02-24 08:30 UTC+3 &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-SA')}</div>
      </div>
      ${content}
    </main>
  </div>
  <nav class="mobile-nav">
    <div class="mobile-nav-items">
      ${navLinks.map(l => `
      <a href="${l.href}" class="mobile-nav-item ${activeNav===l.id?'active':''}">
        <i class="fa ${l.icon}"></i> ${l.label}
      </a>`).join('')}
    </div>
  </nav>`, pageTitle)
}

// ── GET /admin ──────────────────────────────────────────────────
app.get('/admin', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'admin') return c.redirect('/')

  const pendingCount = beanRequests.filter(r => r.status === 'PENDING').length
  const totalGreenKg  = coffeeLots.reduce((s, l) => s + l.greenWeightKg, 0)
  const totalRoastedKg = coffeeLots.reduce((s, l) => s + l.roastedWeightKg, 0)
  const optimalLots   = coffeeLots.filter(l => l.status === 'OPTIMAL').length
  const criticalBranches = branches.filter(b => b.riskStatus === 'CRITICAL' || b.riskStatus === 'HIGH').length

  const content = `
  ${criticalBranches > 0 ? `
  <div class="alert alert-critical">
    <i class="fa fa-triangle-exclamation"></i>
    <div><strong>${criticalBranches} branch${criticalBranches>1?'es':''} require immediate attention</strong> — Humidity levels exceed safe thresholds.</div>
  </div>` : ''}

  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label">Total Green Stock</div>
      <div class="stat-value">${totalGreenKg.toLocaleString()}</div>
      <div class="stat-unit">kg green beans</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Roasted Yield</div>
      <div class="stat-value">${totalRoastedKg.toLocaleString()}</div>
      <div class="stat-unit">kg after −18% shrinkage</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">OPTIMAL Lots</div>
      <div class="stat-value">${optimalLots}</div>
      <div class="stat-unit">of ${coffeeLots.length} total lots</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending Orders</div>
      <div class="stat-value" style="color:${pendingCount>0?'var(--red)':'var(--green)'}">
        ${pendingCount}
      </div>
      <div class="stat-unit">awaiting confirmation</div>
    </div>
  </div>

  <div style="display:grid;gap:20px;grid-template-columns:1fr 1fr;margin-bottom:28px">
    <div class="card">
      <div class="card-title">Branch Risk Matrix</div>
      ${branches.map(b => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bg-3)">
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${b.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${b.activeLots} lots · ${b.totalGreenKg} kg green</div>
          <div class="humidity-bar">
            <div class="humidity-fill" style="width:${b.humidity}%;background:${b.riskStatus==='LOW'?'var(--green)':b.riskStatus==='MODERATE'?'var(--orange)':b.riskStatus==='HIGH'?'#fb923c':'var(--red)'}"></div>
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
      ${beanRequests.slice(-4).reverse().map(r => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bg-3)">
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${r.cafeName}</div>
          <div style="font-size:11px;color:var(--text-muted)">${r.lotOrigin} · ${r.quantityKg} kg</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${r.requestedAt}</div>
        </div>
        <span class="badge badge-${r.status}">${r.status}</span>
      </div>`).join('')}
      ${beanRequests.length === 0 ? '<div class="empty-state"><i class="fa fa-inbox"></i>No requests yet</div>' : ''}
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
            <th>Lot ID</th>
            <th>Origin</th>
            <th>Branch</th>
            <th>Green (kg)</th>
            <th>Roasted (kg)</th>
            <th>Shrinkage</th>
            <th>Status</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${coffeeLots.map(l => `
          <tr>
            <td class="mono" style="color:var(--amber)">${l.id}</td>
            <td style="font-weight:500">${l.origin}</td>
            <td style="font-size:12px;color:var(--text-sec)">${l.branch}</td>
            <td class="mono">${l.greenWeightKg} kg</td>
            <td class="mono" style="color:var(--amber)">${l.roastedWeightKg} kg</td>
            <td>
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">
                −${(l.greenWeightKg - l.roastedWeightKg).toFixed(1)} kg (18%)
              </span>
            </td>
            <td><span class="badge badge-${l.status}">${l.status}</span></td>
            <td>
              <div class="score-bar">
                <div class="score-track"><div class="score-fill" style="width:${l.gradeScore}%"></div></div>
                <span class="score-num">${l.gradeScore}</span>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`

  return c.html(adminLayout('Overview Dashboard', 'overview', content, pendingCount))
})

// ── GET /admin/branches ─────────────────────────────────────────
app.get('/admin/branches', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'admin') return c.redirect('/')
  const pendingCount = beanRequests.filter(r => r.status === 'PENDING').length

  const content = `
  ${branches.some(b => b.riskStatus === 'CRITICAL') ? `
  <div class="alert alert-critical">
    <i class="fa fa-triangle-exclamation"></i>
    <strong>CRITICAL ALERT:</strong>&nbsp; Dammam branch humidity at ${branches.find(b=>b.name==='Dammam')?.humidity}% — immediate dehumidification required.
  </div>` : ''}
  ${branches.some(b => b.riskStatus === 'HIGH') ? `
  <div class="alert alert-warning">
    <i class="fa fa-exclamation-triangle"></i>
    <strong>HIGH RISK:</strong>&nbsp; Jeddah branch humidity elevated — monitor closely.
  </div>` : ''}

  <div class="branch-grid" style="margin-bottom:28px">
    ${branches.map(b => `
    <div class="branch-card risk-${b.riskStatus}">
      <div class="branch-name">${b.name}</div>
      <div class="branch-id">${b.id}</div>
      <div class="branch-metrics">
        <div>
          <div class="branch-metric-label">Humidity</div>
          <div class="branch-metric-value metric-humidity">${b.humidity}<span style="font-size:14px">%</span></div>
        </div>
        <div>
          <div class="branch-metric-label">Temperature</div>
          <div class="branch-metric-value metric-temp">${b.temperature}<span style="font-size:14px">°C</span></div>
        </div>
      </div>
      <div class="humidity-bar" style="margin-bottom:12px">
        <div class="humidity-fill" style="width:${b.humidity}%;background:${b.riskStatus==='LOW'?'var(--green)':b.riskStatus==='MODERATE'?'var(--orange)':b.riskStatus==='HIGH'?'#fb923c':'var(--red)'}"></div>
      </div>
      <div class="branch-footer">
        <div>
          <div class="branch-footer-info">${b.activeLots} active lots</div>
          <div class="branch-footer-info">${b.totalGreenKg} kg green / ${applyRoastShrinkage(b.totalGreenKg)} kg roasted</div>
          <div class="branch-footer-info">Checked: ${b.lastChecked}</div>
        </div>
        <span class="badge badge-${b.riskStatus}">${b.riskStatus}</span>
      </div>
    </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-title">Humidity Risk Thresholds</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding-top:8px">
      ${[
        {label:'LOW',range:'< 50%',color:'var(--green)',desc:'Ideal storage conditions'},
        {label:'MODERATE',range:'50–61%',color:'var(--orange)',desc:'Monitor weekly'},
        {label:'HIGH',range:'62–74%',color:'#fb923c',desc:'Dehumidify within 48h'},
        {label:'CRITICAL',range:'≥ 75%',color:'var(--red)',desc:'Immediate action required'},
      ].map(t=>`
      <div style="padding:14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-lg)">
        <span class="badge badge-${t.label}">${t.label}</span>
        <div style="font-family:var(--font-mono);font-size:18px;color:${t.color};margin:8px 0 2px">${t.range}</div>
        <div style="font-size:11px;color:var(--text-muted)">${t.desc}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="divider"></div>

  <div class="card">
    <div class="card-title">Lots by Branch</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Lot ID</th><th>Origin</th><th>Green</th><th>Roasted</th><th>Roast Date</th><th>Status</th><th>Grade</th></tr>
        </thead>
        <tbody>
          ${branches.flatMap(b => coffeeLots.filter(l=>l.branch===b.name).map(l=>`
          <tr>
            <td class="mono" style="color:var(--amber)">${l.id}</td>
            <td><div style="font-weight:500;font-size:13px">${l.origin}</div><div style="font-size:11px;color:var(--amber)">${b.name}</div></td>
            <td class="mono">${l.greenWeightKg} kg</td>
            <td class="mono" style="color:var(--amber)">${l.roastedWeightKg} kg</td>
            <td class="mono" style="font-size:11px;color:var(--text-muted)">${l.roastDate}</td>
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
  </div>`

  return c.html(adminLayout('Branch Monitor', 'branches', content, pendingCount))
})

// ── GET /admin/inventory ────────────────────────────────────────
app.get('/admin/inventory', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'admin') return c.redirect('/')
  const pendingCount = beanRequests.filter(r => r.status === 'PENDING').length

  const totalGreen = coffeeLots.reduce((s,l)=>s+l.greenWeightKg,0)
  const totalRoasted = coffeeLots.reduce((s,l)=>s+l.roastedWeightKg,0)
  const totalShrinkage = totalGreen - totalRoasted

  const content = `
  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label">Total Green</div>
      <div class="stat-value">${totalGreen.toLocaleString()}</div>
      <div class="stat-unit">kg raw green beans</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Roasted</div>
      <div class="stat-value">${totalRoasted.toLocaleString()}</div>
      <div class="stat-unit">kg after roasting</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Shrinkage</div>
      <div class="stat-value" style="color:var(--red)">${totalShrinkage.toLocaleString()}</div>
      <div class="stat-unit">kg lost (18% formula)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Yield Rate</div>
      <div class="stat-value">82%</div>
      <div class="stat-unit">Roasted = Green × 0.82</div>
    </div>
  </div>

  <div class="card" style="margin-bottom:20px">
    <div class="card-title">Shrinkage Formula Reference</div>
    <div style="padding:16px;background:var(--bg-2);border-radius:var(--radius);font-family:var(--font-mono);font-size:14px;letter-spacing:0.5px">
      <span style="color:var(--amber)">Roasted_kg</span>
      <span style="color:var(--text-muted)"> = </span>
      <span style="color:var(--text-pri)">Green_kg</span>
      <span style="color:var(--text-muted)"> × </span>
      <span style="color:var(--green)">0.82</span>
      <span style="color:var(--text-muted)"> &nbsp;// 18% moisture loss during roasting</span>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Full Inventory Ledger</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lot ID</th>
            <th>Origin</th>
            <th>Variety / Process</th>
            <th>Branch</th>
            <th>Green → Roasted</th>
            <th>Shrinkage</th>
            <th>Roast Date</th>
            <th>Expiry</th>
            <th>Status</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${coffeeLots.map(l=>`
          <tr>
            <td class="mono" style="color:var(--amber)">${l.id}</td>
            <td>
              <div style="font-weight:500">${l.origin}</div>
              <div class="flavor-tags" style="margin:4px 0 0">
                ${l.flavorNotes.slice(0,2).map(f=>`<span class="flavor-tag">${f}</span>`).join('')}
              </div>
            </td>
            <td style="font-size:12px;color:var(--text-sec)">${l.variety}<br/><span style="color:var(--text-muted)">${l.process}</span></td>
            <td style="font-size:12px">${l.branch}</td>
            <td>
              <div class="weight-block">
                <span class="weight-green">${l.greenWeightKg} kg</span>
                <span class="weight-arrow">→</span>
                <span class="weight-roast">${l.roastedWeightKg} kg</span>
              </div>
            </td>
            <td class="mono" style="color:var(--red);font-size:11px">−${(l.greenWeightKg-l.roastedWeightKg).toFixed(1)} kg</td>
            <td class="mono" style="font-size:11px;color:var(--text-muted)">${l.roastDate}</td>
            <td class="mono" style="font-size:11px;color:var(--text-muted)">${l.expiryDate}</td>
            <td><span class="badge badge-${l.status}">${l.status}</span></td>
            <td>
              <div class="score-bar">
                <div class="score-track"><div class="score-fill" style="width:${l.gradeScore}%"></div></div>
                <span class="score-num">${l.gradeScore}</span>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`

  return c.html(adminLayout('Inventory Ledger', 'inventory', content, pendingCount))
})

// ── GET /admin/requests ─────────────────────────────────────────
app.get('/admin/requests', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'admin') return c.redirect('/')
  const pendingCount = beanRequests.filter(r => r.status === 'PENDING').length

  const content = `
  ${pendingCount > 0 ? `
  <div class="alert alert-warning">
    <i class="fa fa-bell"></i>
    <div><strong>${pendingCount} request${pendingCount>1?'s':''} awaiting your confirmation</strong> — Review and action below.</div>
  </div>` : ''}

  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label">Pending</div>
      <div class="stat-value" style="color:var(--blue)">${beanRequests.filter(r=>r.status==='PENDING').length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Confirmed</div>
      <div class="stat-value" style="color:var(--green)">${beanRequests.filter(r=>r.status==='CONFIRMED').length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Dispatched</div>
      <div class="stat-value" style="color:var(--amber)">${beanRequests.filter(r=>r.status==='DISPATCHED').length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Requests</div>
      <div class="stat-value">${beanRequests.length}</div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">All Bean Requests</div>
    ${beanRequests.length === 0 ? '<div class="empty-state"><i class="fa fa-inbox"></i><p>No bean requests yet</p></div>' : `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Req ID</th><th>Cafe</th><th>Lot</th><th>Qty</th><th>Notes</th><th>Submitted</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${beanRequests.map(r=>`
          <tr>
            <td class="mono" style="color:var(--amber)">${r.id}</td>
            <td><div style="font-weight:500">${r.cafeName}</div><div style="font-size:11px;color:var(--text-muted)">${r.cafeId}</div></td>
            <td><div style="font-weight:500;font-size:13px">${r.lotOrigin}</div><div class="mono" style="font-size:10px;color:var(--text-muted)">${r.lotId}</div></td>
            <td class="mono" style="color:var(--amber)">${r.quantityKg} kg</td>
            <td style="font-size:12px;color:var(--text-sec);max-width:160px">${r.notes || '—'}</td>
            <td class="mono" style="font-size:10px;color:var(--text-muted)">${r.requestedAt}</td>
            <td><span class="badge badge-${r.status}">${r.status}</span></td>
            <td>
              ${r.status === 'PENDING' ? `
              <form method="POST" action="/admin/requests/${r.id}/confirm" style="display:inline">
                <button type="submit" style="font-family:var(--font-mono);font-size:10px;padding:5px 10px;background:var(--green-dim);color:var(--green);border:1px solid rgba(16,185,129,.3);border-radius:var(--radius);cursor:pointer;margin-right:4px">CONFIRM</button>
              </form>` : ''}
              ${r.status === 'CONFIRMED' ? `
              <form method="POST" action="/admin/requests/${r.id}/dispatch" style="display:inline">
                <button type="submit" style="font-family:var(--font-mono);font-size:10px;padding:5px 10px;background:var(--amber-glow);color:var(--amber);border:1px solid var(--border-amber);border-radius:var(--radius);cursor:pointer">DISPATCH</button>
              </form>` : ''}
              ${r.status === 'DISPATCHED' ? `<span style="font-size:11px;color:var(--text-muted)">Completed</span>` : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
  </div>`

  return c.html(adminLayout('Bean Requests', 'requests', content, pendingCount))
})

// ── POST /admin/requests/:id/confirm ───────────────────────────
app.post('/admin/requests/:id/confirm', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'admin') return c.redirect('/')
  const req = beanRequests.find(r => r.id === c.req.param('id'))
  if (req) req.status = 'CONFIRMED'
  return c.redirect('/admin/requests')
})

// ── POST /admin/requests/:id/dispatch ──────────────────────────
app.post('/admin/requests/:id/dispatch', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'admin') return c.redirect('/')
  const req = beanRequests.find(r => r.id === c.req.param('id'))
  if (req) req.status = 'DISPATCHED'
  return c.redirect('/admin/requests')
})

// ══════════════════════════════════════════════════════════════════
//  CAFE PORTAL
// ══════════════════════════════════════════════════════════════════

function cafeLayout(pageTitle: string, activeNav: string, content: string, client: { name: string; tier: string; branch: string }) {
  const navLinks = [
    { href: '/cafe', icon: 'fa-mug-hot', label: 'Available Lots', id: 'lots' },
    { href: '/cafe/orders', icon: 'fa-clock-rotate-left', label: 'My Orders', id: 'orders' },
  ]
  const tierColor = client.tier === 'Gold' ? 'var(--amber)' : client.tier === 'Silver' ? '#94a3b8' : '#cd7f32'
  return html(`
  <div class="toast-container" id="toastContainer"></div>
  <header class="topbar">
    <div class="topbar-brand">
      <div class="topbar-logo">QO</div>
      <span class="topbar-title">QABBAN <span>OS</span></span>
    </div>
    <div class="topbar-right">
      <span style="font-family:var(--font-mono);font-size:11px;color:${tierColor};padding:3px 8px;border:1px solid ${tierColor}40;border-radius:2px">
        ★ ${client.tier}
      </span>
      <span class="topbar-badge badge-cafe"><i class="fa fa-mug-hot"></i> Cafe Portal</span>
      <span class="topbar-user"><i class="fa fa-store"></i> ${client.name}</span>
      <a href="/logout"><button class="btn-logout">LOGOUT</button></a>
    </div>
  </header>
  <div class="layout">
    <nav class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-label">Cafe Portal</div>
        ${navLinks.map(l => `
        <a href="${l.href}" class="sidebar-link ${activeNav===l.id?'active':''}">
          <i class="fa ${l.icon}"></i> ${l.label}
        </a>`).join('')}
      </div>
      <div class="sidebar-section">
        <div class="sidebar-label">Account</div>
        <div style="padding:12px 20px">
          <div style="font-size:12px;font-weight:600;color:var(--text-pri)">${client.name}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${client.branch} Branch</div>
          <div style="font-size:11px;color:${tierColor};margin-top:4px">★ ${client.tier} Client</div>
        </div>
      </div>
    </nav>
    <main class="main">
      <div class="page-header">
        <div class="page-title"><span>// </span>${pageTitle}</div>
        <div class="page-sub">Showing OPTIMAL lots only · ${client.branch} region</div>
      </div>
      ${content}
    </main>
  </div>
  <nav class="mobile-nav">
    <div class="mobile-nav-items">
      ${navLinks.map(l => `
      <a href="${l.href}" class="mobile-nav-item ${activeNav===l.id?'active':''}">
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
  </script>`, pageTitle)
}

// ── GET /cafe ────────────────────────────────────────────────────
app.get('/cafe', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'cafe') return c.redirect('/')
  const cafeId = sess.cafeId!
  const client = cafeClients.find(cl => cl.id === cafeId)!

  // SECURITY: Show ONLY lots marked OPTIMAL
  const optimalLots = coffeeLots.filter(l => l.status === 'OPTIMAL')

  const content = `
  <div class="alert alert-success" style="margin-bottom:24px">
    <i class="fa fa-circle-check"></i>
    <div>Showing <strong>${optimalLots.length} OPTIMAL lots</strong> available for ordering. All lots have passed quality and humidity checks.</div>
  </div>

  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label">Available Lots</div>
      <div class="stat-value">${optimalLots.length}</div>
      <div class="stat-unit">OPTIMAL status only</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Roasted Stock</div>
      <div class="stat-value">${optimalLots.reduce((s,l)=>s+l.roastedWeightKg,0).toLocaleString()}</div>
      <div class="stat-unit">kg available</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Your Orders</div>
      <div class="stat-value">${beanRequests.filter(r=>r.cafeId===cafeId).length}</div>
      <div class="stat-unit">total requests</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg. Grade Score</div>
      <div class="stat-value">${Math.round(optimalLots.reduce((s,l)=>s+l.gradeScore,0)/optimalLots.length)}</div>
      <div class="stat-unit">quality points</div>
    </div>
  </div>

  <div class="lot-grid">
    ${optimalLots.map(l => `
    <div class="lot-card">
      <div class="lot-header">
        <div>
          <div class="lot-id">${l.id}</div>
          <div class="lot-origin">${l.origin}</div>
          <div class="lot-variety">${l.variety} · ${l.process}</div>
        </div>
        <span class="badge badge-OPTIMAL">OPTIMAL</span>
      </div>
      <div class="flavor-tags">
        ${l.flavorNotes.map(f=>`<span class="flavor-tag">${f}</span>`).join('')}
      </div>
      <div class="lot-divider"></div>
      <div class="lot-metrics">
        <div>
          <div class="lot-metric-label">Roasted Stock</div>
          <div class="lot-metric-value">${l.roastedWeightKg} kg</div>
          <div class="lot-metric-sub">from ${l.greenWeightKg} kg green</div>
        </div>
        <div>
          <div class="lot-metric-label">Grade Score</div>
          <div class="lot-metric-value">${l.gradeScore}</div>
          <div class="lot-metric-sub">
            <div class="score-bar"><div class="score-track"><div class="score-fill" style="width:${l.gradeScore}%"></div></div></div>
          </div>
        </div>
        <div>
          <div class="lot-metric-label">Roasted</div>
          <div class="lot-metric-value" style="font-size:13px">${l.roastDate}</div>
        </div>
        <div>
          <div class="lot-metric-label">Expires</div>
          <div class="lot-metric-value" style="font-size:13px">${l.expiryDate}</div>
        </div>
      </div>
      <div class="lot-footer">
        <button class="btn-request" onclick="openModal('${l.id}','${l.origin.replace("'", "\\x27")}',${l.roastedWeightKg})">
          <i class="fa fa-basket-shopping"></i> REQUEST BEANS
        </button>
      </div>
    </div>`).join('')}
  </div>`

  return c.html(cafeLayout('Available Coffee Lots', 'lots', content, { name: client.name, tier: client.tier, branch: client.branch }))
})

// ── POST /cafe/request ──────────────────────────────────────────
app.post('/cafe/request', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'cafe') return c.redirect('/')
  const cafeId = sess.cafeId!
  const client = cafeClients.find(cl => cl.id === cafeId)!

  const form = await c.req.formData()
  const lotId = form.get('lotId') as string
  const quantity = parseInt(form.get('quantity') as string, 10)
  const notes = form.get('notes') as string

  const lot = coffeeLots.find(l => l.id === lotId && l.status === 'OPTIMAL')
  if (!lot || isNaN(quantity) || quantity <= 0) {
    return c.redirect('/cafe')
  }

  const reqId = `REQ-${String(beanRequests.length + 1).padStart(3, '0')}`
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16)
  beanRequests.push({
    id: reqId,
    cafeId: client.id,
    cafeName: client.name,
    lotId,
    lotOrigin: lot.origin,
    quantityKg: quantity,
    requestedAt: now,
    status: 'PENDING',
    notes: notes || '',
  })

  return c.redirect('/cafe/orders?success=1')
})

// ── GET /cafe/orders ─────────────────────────────────────────────
app.get('/cafe/orders', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'cafe') return c.redirect('/')
  const cafeId = sess.cafeId!
  const client = cafeClients.find(cl => cl.id === cafeId)!
  const myOrders = beanRequests.filter(r => r.cafeId === cafeId)
  const success = c.req.query('success')

  const content = `
  ${success ? `<div class="alert alert-success"><i class="fa fa-circle-check"></i><div><strong>Request sent!</strong> Your bean request has been submitted. The roaster admin will review and confirm shortly.</div></div>` : ''}
  
  <div class="stat-grid" style="margin-bottom:28px">
    <div class="stat-card">
      <div class="stat-label">Total Orders</div>
      <div class="stat-value">${myOrders.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending</div>
      <div class="stat-value" style="color:var(--blue)">${myOrders.filter(r=>r.status==='PENDING').length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Confirmed</div>
      <div class="stat-value" style="color:var(--green)">${myOrders.filter(r=>r.status==='CONFIRMED').length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Dispatched</div>
      <div class="stat-value" style="color:var(--amber)">${myOrders.filter(r=>r.status==='DISPATCHED').length}</div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Order History</div>
    ${myOrders.length === 0 ? `
    <div class="empty-state">
      <i class="fa fa-basket-shopping"></i>
      <p>No orders yet — browse available lots and request beans.</p>
      <a href="/cafe" style="display:inline-block;margin-top:12px;font-family:var(--font-mono);font-size:12px">Browse Lots →</a>
    </div>` : `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Request ID</th><th>Lot</th><th>Origin</th><th>Qty</th><th>Notes</th><th>Submitted</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${myOrders.map(r=>`
          <tr>
            <td class="mono" style="color:var(--amber)">${r.id}</td>
            <td class="mono" style="font-size:11px">${r.lotId}</td>
            <td style="font-weight:500">${r.lotOrigin}</td>
            <td class="mono" style="color:var(--amber)">${r.quantityKg} kg</td>
            <td style="font-size:12px;color:var(--text-sec);max-width:140px">${r.notes||'—'}</td>
            <td class="mono" style="font-size:10px;color:var(--text-muted)">${r.requestedAt}</td>
            <td><span class="badge badge-${r.status}">${r.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
  </div>`

  return c.html(cafeLayout('My Orders', 'orders', content, { name: client.name, tier: client.tier, branch: client.branch }))
})

// ══════════════════════════════════════════════════════════════════
//  API ENDPOINTS (JSON)
// ══════════════════════════════════════════════════════════════════

app.get('/api/lots', (c) => c.json(coffeeLots))
app.get('/api/lots/optimal', (c) => c.json(coffeeLots.filter(l => l.status === 'OPTIMAL')))
app.get('/api/branches', (c) => c.json(branches))
app.get('/api/requests', (c) => c.json(beanRequests))

export default app
