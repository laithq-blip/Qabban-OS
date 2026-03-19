/**
 * ManagementHQ.tsx — Qabban OS "God View"
 * ─────────────────────────────────────────────────────────────────────────────
 * STANDALONE component: zero imports from Roaster/Cafe portals.
 * All values are hardcoded dummy JSON for Sprint 1.
 * Styles are scoped via the `.hq-` prefix and an inline <style id="hq-css">
 * block so they cannot leak into the customer view.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Dummy Data ─────────────────────────────────────────────────────────────

const DUMMY_KPI = {
  mrr          : 60_000,
  mrrTrend     : '+5.2%',
  mrrTrendUp   : true,
  commission   : 25_750,
  commTrend    : '+2.1%',
  commTrendUp  : true,
  roasteries   : 52,
  pulseBranches: 140,
  churnRate    : '1.8%',
  nrr          : '108%',
  arpu         : 1_154,
  cac          : 850,
}

const DUMMY_CHART_MONTHS = [
  { month: 'Oct', sub: 42_000, txn: 18_200 },
  { month: 'Nov', sub: 45_500, txn: 20_100 },
  { month: 'Dec', sub: 49_000, txn: 22_400 },
  { month: 'Jan', sub: 51_200, txn: 23_850 },
  { month: 'Feb', sub: 56_000, txn: 24_900 },
  { month: 'Mar', sub: 60_000, txn: 25_750 },
]

const DUMMY_CLIENTS: {
  id       : string
  name     : string
  city     : string
  plan     : 'ROASTER_PRO' | 'IOT_PULSE' | 'FREE'
  status   : 'ACTIVE' | 'TRIAL' | 'SUSPENDED'
  sponge   : number   // kg delta this month
  pulse    : number   // sync rate %
  zatca    : number   // compliance score %
  mrr      : number
  locked   : boolean
  since    : string
}[] = [
  { id:'C-001', name:'Namq Coffee',        city:'Riyadh',   plan:'ROASTER_PRO', status:'ACTIVE',    sponge:+8.4,  pulse:99.1, zatca:100, mrr:1_200, locked:false, since:'2023-08' },
  { id:'C-002', name:'Brew92',             city:'Jeddah',   plan:'IOT_PULSE',   status:'ACTIVE',    sponge:+3.2,  pulse:97.4, zatca:98,  mrr:1_700, locked:false, since:'2023-11' },
  { id:'C-003', name:'Camel Step',         city:'Dammam',   plan:'ROASTER_PRO', status:'ACTIVE',    sponge:-1.1,  pulse:94.7, zatca:96,  mrr:1_200, locked:false, since:'2024-01' },
  { id:'C-004', name:'Qahwa Collective',   city:'Abha',     plan:'IOT_PULSE',   status:'TRIAL',     sponge:+0.0,  pulse:88.2, zatca:91,  mrr:500,   locked:false, since:'2024-06' },
  { id:'C-005', name:'Origin Roasters',    city:'Riyadh',   plan:'ROASTER_PRO', status:'ACTIVE',    sponge:+5.9,  pulse:99.8, zatca:100, mrr:1_200, locked:false, since:'2023-09' },
  { id:'C-006', name:'Dukhoon Specialty',  city:'Riyadh',   plan:'ROASTER_PRO', status:'ACTIVE',    sponge:+2.3,  pulse:96.1, zatca:99,  mrr:1_200, locked:false, since:'2024-02' },
  { id:'C-007', name:'Al-Rawda Beans',     city:'Medina',   plan:'FREE',        status:'TRIAL',     sponge:+0.0,  pulse:0.0,  zatca:72,  mrr:0,     locked:false, since:'2024-07' },
  { id:'C-008', name:'Kaffiyeh Roasting',  city:'Tabuk',    plan:'IOT_PULSE',   status:'SUSPENDED', sponge:-4.2,  pulse:12.3, zatca:55,  mrr:0,     locked:true,  since:'2023-12' },
  { id:'C-009', name:'Verde Micro-Lot',    city:'Jeddah',   plan:'ROASTER_PRO', status:'ACTIVE',    sponge:+6.7,  pulse:98.0, zatca:100, mrr:1_200, locked:false, since:'2024-03' },
  { id:'C-010', name:'Hijaz Heritage',     city:'Mecca',    plan:'ROASTER_PRO', status:'ACTIVE',    sponge:+1.8,  pulse:91.5, zatca:97,  mrr:1_200, locked:false, since:'2024-04' },
]

const DUMMY_ALERTS = [
  { type:'warn',  msg:'Kaffiyeh Roasting — pulse sync dropped below 15% threshold', time:'2 h ago' },
  { type:'info',  msg:'ZATCA compliance batch completed — 48/52 roasteries at 100%', time:'5 h ago' },
  { type:'ok',    msg:'Webhook payment.captured processed — Hijaz Heritage → ERP Pro', time:'9 h ago' },
  { type:'warn',  msg:'Al-Rawda Beans trial expires in 3 days', time:'12 h ago' },
  { type:'ok',    msg:'MRR milestone crossed: SAR 60,000 — highest in platform history', time:'1 d ago' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-SA')
}

function spongeBadge(kg: number): string {
  if (kg > 4)  return `<span class="hq-badge hq-badge-green">+${kg.toFixed(1)} kg ▲</span>`
  if (kg > 0)  return `<span class="hq-badge hq-badge-amber">+${kg.toFixed(1)} kg</span>`
  if (kg === 0) return `<span class="hq-badge hq-badge-muted">—</span>`
  return `<span class="hq-badge hq-badge-red">${kg.toFixed(1)} kg ▼</span>`
}

function pulseBar(pct: number): string {
  const color = pct >= 95 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'
  return `
    <div style="display:flex;align-items:center;gap:8px">
      <div style="flex:1;height:5px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width .4s"></div>
      </div>
      <span style="font-family:monospace;font-size:11px;color:${color};min-width:36px;text-align:right">${pct}%</span>
    </div>`
}

function zatcaScore(pct: number): string {
  const color = pct === 100 ? '#10b981' : pct >= 90 ? '#f59e0b' : '#ef4444'
  return `<span style="font-weight:700;color:${color}">${pct}%</span>`
}

function planBadge(plan: string, status: string): string {
  if (status === 'SUSPENDED')  return `<span class="hq-badge hq-badge-red">SUSPENDED</span>`
  if (plan === 'ROASTER_PRO')  return `<span class="hq-badge hq-badge-purple">Roaster Pro</span>`
  if (plan === 'IOT_PULSE')    return `<span class="hq-badge hq-badge-sky">IoT Pulse</span>`
  return `<span class="hq-badge hq-badge-muted">Free</span>`
}

function alertIcon(type: string): string {
  if (type === 'ok')   return `<span style="color:#10b981">✔</span>`
  if (type === 'warn') return `<span style="color:#f59e0b">⚠</span>`
  return `<span style="color:#60a5fa">ℹ</span>`
}

// ── Stacked Bar Chart (pure SVG, no external lib) ──────────────────────────

function stackedBarChart(): string {
  const W = 520, H = 180, PADDING_L = 52, PADDING_B = 30, PADDING_TOP = 18, PADDING_R = 20
  const chartW = W - PADDING_L - PADDING_R
  const chartH = H - PADDING_B - PADDING_TOP

  const maxVal = Math.max(...DUMMY_CHART_MONTHS.map(d => d.sub + d.txn))
  const barW   = Math.floor(chartW / DUMMY_CHART_MONTHS.length) - 8
  const yScale = (v: number) => chartH - (v / maxVal) * chartH

  const bars = DUMMY_CHART_MONTHS.map((d, i) => {
    const x    = PADDING_L + i * (chartW / DUMMY_CHART_MONTHS.length) + 4
    const hSub = (d.sub / maxVal) * chartH
    const hTxn = (d.txn / maxVal) * chartH
    const ySub = PADDING_TOP + yScale(d.sub + d.txn)
    const yTxn = PADDING_TOP + yScale(d.txn)
    return `
      <rect x="${x}" y="${ySub.toFixed(1)}" width="${barW}" height="${hSub.toFixed(1)}" fill="#f59e0b" rx="2" opacity=".9"/>
      <rect x="${x}" y="${(PADDING_TOP + chartH - hTxn).toFixed(1)}" width="${barW}" height="${hTxn.toFixed(1)}" fill="#ca8a04" rx="2" opacity=".8"/>
      <text x="${(x + barW / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" fill="#6b7280" font-size="11" font-family="monospace">${d.month}</text>`
  }).join('')

  // Y-axis gridlines
  const grids = [0, 0.25, 0.5, 0.75, 1].map(frac => {
    const y   = PADDING_TOP + chartH * (1 - frac)
    const val = Math.round(maxVal * frac / 1000)
    return `
      <line x1="${PADDING_L}" y1="${y.toFixed(1)}" x2="${W - PADDING_R}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
      <text x="${PADDING_L - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#4b5563" font-size="10" font-family="monospace">${val}k</text>`
  }).join('')

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible">
      ${grids}
      ${bars}
    </svg>`
}

// ── Mini Sparkline ──────────────────────────────────────────────────────────

function sparkline(data: number[], color: string): string {
  const w = 80, h = 28
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
  </svg>`
}

const MRR_SPARK  = DUMMY_CHART_MONTHS.map(d => d.sub)
const COMM_SPARK = DUMMY_CHART_MONTHS.map(d => d.txn)

// ── Main HTML Builder ──────────────────────────────────────────────────────

export function renderManagementHQ(): string {

  const clientRows = DUMMY_CLIENTS.map((c, idx) => {
    const rowBg = c.status === 'SUSPENDED' ? 'background:rgba(239,68,68,.04)' : ''
    return `
    <tr class="hq-tr" data-idx="${idx}" style="${rowBg}">
      <td class="hq-td" style="font-weight:600;color:#e2e8f0">
        <span class="hq-client-name">${c.name}</span>
        <span class="hq-city">${c.city}</span>
      </td>
      <td class="hq-td" style="font-family:monospace;font-size:11px;color:#6b7280">${c.id}</td>
      <td class="hq-td">${planBadge(c.plan, c.status)}</td>
      <td class="hq-td">${spongeBadge(c.sponge)}</td>
      <td class="hq-td" style="min-width:120px">${pulseBar(c.pulse)}</td>
      <td class="hq-td">${zatcaScore(c.zatca)}</td>
      <td class="hq-td" style="font-weight:700;color:#10b981;font-family:monospace">
        ${c.mrr > 0 ? `SAR ${fmt(c.mrr)}` : '<span style="color:#4b5563">—</span>'}
      </td>
      <td class="hq-td" style="white-space:nowrap">
        <button
          class="hq-lock-btn ${c.locked ? 'hq-lock-btn--locked' : 'hq-lock-btn--open'}"
          onclick="hqToggleLock(${idx})"
          title="${c.locked ? 'Unlock client' : 'Lock client'}"
        >
          <i class="fa ${c.locked ? 'fa-lock' : 'fa-lock-open'}"></i>
          ${c.locked ? 'Locked' : 'Active'}
        </button>
      </td>
    </tr>`
  }).join('')

  const alertItems = DUMMY_ALERTS.map(a => `
    <div class="hq-alert hq-alert-${a.type}">
      <span style="margin-right:8px">${alertIcon(a.type)}</span>
      <span class="hq-alert-msg">${a.msg}</span>
      <span class="hq-alert-time">${a.time}</span>
    </div>`).join('')

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>God View — Qabban OS Management</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"/>
  <style id="hq-css">
/* ── Founder's Dashboard — Scoped CSS Module ── */
/* All selectors are prefixed with .hq- to prevent leakage into customer views */

:root {
  --hq-obsidian  : #0D0D0D;
  --hq-surface   : #111111;
  --hq-surface-2 : #161616;
  --hq-border    : rgba(255, 179, 0, 0.10);
  --hq-border-hi : rgba(255, 179, 0, 0.25);
  --hq-amber     : #F59E0B;
  --hq-gold      : #CA8A04;
  --hq-green     : #10B981;
  --hq-red       : #EF4444;
  --hq-purple    : #7C3AED;
  --hq-sky       : #0EA5E9;
  --hq-text      : #E2E8F0;
  --hq-text-sec  : #94A3B8;
  --hq-text-muted: #4B5563;
  --hq-mono      : 'JetBrains Mono', 'Fira Code', monospace;
  --hq-radius    : 14px;
  --hq-glow-amber: 0 0 32px rgba(245,158,11,.18), 0 0 8px rgba(245,158,11,.10);
  --hq-glow-green: 0 0 32px rgba(16,185,129,.15), 0 0 8px rgba(16,185,129,.08);
  --hq-glow-purple:0 0 32px rgba(124,58,237,.15), 0 0 8px rgba(124,58,237,.08);
  --hq-glow-sky  : 0 0 32px rgba(14,165,233,.15), 0 0 8px rgba(14,165,233,.08);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--hq-obsidian);
  color: var(--hq-text);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  min-height: 100vh;
}

/* ── Layout ── */
.hq-wrap  { max-width: 1320px; margin: 0 auto; padding: 0 24px 60px; }
.hq-main  { padding-top: 24px; }

/* ── Topbar ── */
.hq-topbar {
  background: rgba(13,13,13,.96);
  border-bottom: 1px solid var(--hq-border);
  padding: 0 28px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 20px;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
}
.hq-topbar-logo {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -.01em;
  color: var(--hq-amber);
  display: flex;
  align-items: center;
  gap: 8px;
}
.hq-topbar-logo i { font-size: 13px; opacity: .8; }
.hq-topbar-sep  { width: 1px; height: 20px; background: var(--hq-border-hi); }
.hq-topbar-tag  {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--hq-text-muted);
  border: 1px solid var(--hq-border-hi);
  border-radius: 6px;
  padding: 2px 8px;
}
.hq-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 16px; }
.hq-live-dot {
  width: 7px; height: 7px;
  background: var(--hq-green);
  border-radius: 50%;
  display: inline-block;
  margin-right: 5px;
  animation: hq-pulse 2s ease-in-out infinite;
}
@keyframes hq-pulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(16,185,129,.5)} 50%{opacity:.6;box-shadow:0 0 0 5px rgba(16,185,129,0)} }
.hq-date { font-size: 11px; color: var(--hq-text-muted); font-family: var(--hq-mono); }
.hq-admin-link {
  font-size: 12px;
  color: var(--hq-text-muted);
  text-decoration: none;
  padding: 5px 10px;
  border: 1px solid var(--hq-border);
  border-radius: 8px;
  transition: border-color .2s, color .2s;
}
.hq-admin-link:hover { border-color: var(--hq-border-hi); color: var(--hq-text-sec); }

/* ── Section headings ── */
.hq-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--hq-text-muted);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.hq-section-label i { color: var(--hq-amber); font-size: 11px; }
.hq-section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--hq-border);
  margin-left: 8px;
}

/* ── Cards ── */
.hq-card {
  background: var(--hq-surface);
  border: 1px solid var(--hq-border);
  border-radius: var(--hq-radius);
  padding: 24px;
  transition: border-color .25s;
}
.hq-card:hover { border-color: var(--hq-border-hi); }

/* ── KPI Grid ── */
.hq-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}
.hq-kpi-card {
  background: var(--hq-surface);
  border: 1px solid var(--hq-border);
  border-radius: var(--hq-radius);
  padding: 22px 24px 18px;
  position: relative;
  overflow: hidden;
  transition: border-color .25s, box-shadow .3s;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hq-kpi-card:hover  { border-color: var(--hq-border-hi); }
.hq-kpi-card--amber { box-shadow: var(--hq-glow-amber); border-color: rgba(245,158,11,.18); }
.hq-kpi-card--green { box-shadow: var(--hq-glow-green); border-color: rgba(16,185,129,.15); }
.hq-kpi-card--purple{ box-shadow: var(--hq-glow-purple); border-color: rgba(124,58,237,.15); }
.hq-kpi-card--sky   { box-shadow: var(--hq-glow-sky);   border-color: rgba(14,165,233,.12); }

.hq-kpi-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--hq-text-muted);
}
.hq-kpi-value {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  margin-top: 4px;
}
.hq-kpi-value--amber  { color: var(--hq-amber); }
.hq-kpi-value--green  { color: var(--hq-green); }
.hq-kpi-value--purple { color: var(--hq-purple); }
.hq-kpi-value--sky    { color: var(--hq-sky); }
.hq-kpi-value--white  { color: var(--hq-text); }

.hq-kpi-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.hq-trend {
  font-size: 11px;
  font-weight: 700;
  font-family: var(--hq-mono);
  padding: 2px 7px;
  border-radius: 6px;
}
.hq-trend--up   { background: rgba(16,185,129,.12); color: var(--hq-green); }
.hq-trend--down { background: rgba(239,68,68,.12);  color: var(--hq-red); }
.hq-kpi-sub { font-size: 11px; color: var(--hq-text-muted); }
.hq-kpi-spark { margin-top: 6px; }

.hq-kpi-icon {
  position: absolute;
  right: 18px;
  top: 18px;
  font-size: 22px;
  opacity: .06;
  color: #fff;
}

/* ── Secondary metrics row ── */
.hq-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 32px;
}
.hq-meta-box {
  background: var(--hq-surface-2);
  border: 1px solid var(--hq-border);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.hq-meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: var(--hq-text-muted); font-weight: 700; }
.hq-meta-value { font-size: 1.3rem; font-weight: 800; color: var(--hq-text); font-variant-numeric: tabular-nums; }
.hq-meta-note  { font-size: 10px; color: var(--hq-text-muted); }

/* ── Chart area ── */
.hq-chart-wrap {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 16px;
  margin-bottom: 32px;
}
@media (max-width: 820px) { .hq-chart-wrap { grid-template-columns: 1fr; } }
.hq-chart-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--hq-text-sec);
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.hq-chart-legend {
  display: flex;
  gap: 18px;
  margin-top: 10px;
}
.hq-legend-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; margin-top: 3px; }
.hq-legend-label { font-size: 11px; color: var(--hq-text-muted); }

/* ── Donut placeholder ── */
.hq-donut-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.hq-donut-legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.hq-donut-legend-bar {
  flex: 1;
  height: 3px;
  border-radius: 2px;
}
.hq-donut-legend-val { font-size: 12px; font-weight: 700; font-family: var(--hq-mono); }

/* ── License / Registry Table ── */
.hq-table-wrap {
  overflow-x: auto;
  border-radius: var(--hq-radius);
  border: 1px solid var(--hq-border);
}
table.hq-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--hq-surface);
}
.hq-th {
  text-align: left;
  padding: 11px 14px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--hq-text-muted);
  border-bottom: 1px solid var(--hq-border);
  white-space: nowrap;
  background: var(--hq-surface-2);
}
.hq-td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--hq-border);
  vertical-align: middle;
}
.hq-tr { transition: background .15s; }
.hq-tr:hover .hq-td { background: rgba(255,179,0,.02); }
.hq-tr:last-child .hq-td { border-bottom: none; }

.hq-client-name { display: block; font-size: 13px; }
.hq-city {
  display: block;
  font-size: 10px;
  color: var(--hq-text-muted);
  margin-top: 1px;
}

/* ── Badges ── */
.hq-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 8px;
  white-space: nowrap;
  letter-spacing: .03em;
}
.hq-badge-green  { background: rgba(16,185,129,.12);  color: #10b981; border: 1px solid rgba(16,185,129,.25); }
.hq-badge-amber  { background: rgba(245,158,11,.12);  color: #f59e0b; border: 1px solid rgba(245,158,11,.25); }
.hq-badge-red    { background: rgba(239,68,68,.12);   color: #ef4444; border: 1px solid rgba(239,68,68,.25); }
.hq-badge-muted  { background: rgba(107,114,128,.10); color: #6b7280; border: 1px solid rgba(107,114,128,.2); }
.hq-badge-purple { background: rgba(124,58,237,.12);  color: #a78bfa; border: 1px solid rgba(124,58,237,.25); }
.hq-badge-sky    { background: rgba(14,165,233,.12);  color: #38bdf8; border: 1px solid rgba(14,165,233,.25); }

/* ── Lock/Unlock toggle ── */
.hq-lock-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: opacity .2s, box-shadow .2s;
}
.hq-lock-btn--open   { background: rgba(16,185,129,.12); color: #10b981; border: 1px solid rgba(16,185,129,.22); }
.hq-lock-btn--locked { background: rgba(239,68,68,.12);  color: #ef4444; border: 1px solid rgba(239,68,68,.22); }
.hq-lock-btn:hover   { opacity: .8; }

/* ── Alert feed ── */
.hq-alert {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 10px 0;
  border-bottom: 1px solid var(--hq-border);
  font-size: 12px;
}
.hq-alert:last-child  { border-bottom: none; }
.hq-alert-msg  { flex: 1; color: var(--hq-text-sec); }
.hq-alert-time { font-family: var(--hq-mono); font-size: 10px; color: var(--hq-text-muted); margin-left: 12px; white-space: nowrap; }
.hq-alert-ok   {}
.hq-alert-warn {}
.hq-alert-info {}

/* ── Scrollbar ── */
::-webkit-scrollbar             { width: 5px; height: 5px; }
::-webkit-scrollbar-track       { background: var(--hq-obsidian); }
::-webkit-scrollbar-thumb       { background: rgba(255,179,0,.18); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,179,0,.35); }

/* ── Tooltip ── */
[title] { position: relative; }

/* ── Utility ── */
.hq-mb32 { margin-bottom: 32px; }
.hq-mb16 { margin-bottom: 16px; }
.hq-flex-between { display: flex; align-items: center; justify-content: space-between; }
  </style>
</head>
<body>

<!-- ════════════════════════════════════════════════════════════════ TOPBAR -->
<header class="hq-topbar">
  <div class="hq-topbar-logo">
    <i class="fa fa-eye"></i>
    Qabban HQ
  </div>
  <div class="hq-topbar-sep"></div>
  <span class="hq-topbar-tag">God View</span>
  <div class="hq-topbar-right">
    <span class="hq-date" id="hq-clock">—</span>
    <span style="font-size:12px;color:var(--hq-text-muted)">
      <span class="hq-live-dot"></span>Live Platform Feed
    </span>
    <a href="/admin" class="hq-admin-link"><i class="fa fa-arrow-left" style="margin-right:4px;font-size:10px"></i>Admin Portal</a>
  </div>
</header>

<!-- ══════════════════════════════════════════════════════════════════ MAIN -->
<div class="hq-wrap">
<main class="hq-main">

  <!-- ── KPI Cards ─────────────────────────────────────────────────────── -->
  <div class="hq-section-label hq-mb16">
    <i class="fa fa-bolt"></i> Platform KPIs — Sprint 1 (Dummy Values)
  </div>

  <div class="hq-kpi-grid">

    <!-- MRR -->
    <div class="hq-kpi-card hq-kpi-card--amber">
      <i class="fa fa-coins hq-kpi-icon"></i>
      <div class="hq-kpi-label">SaaS MRR</div>
      <div class="hq-kpi-value hq-kpi-value--amber">SAR ${fmt(DUMMY_KPI.mrr)}</div>
      <div class="hq-kpi-meta">
        <span class="hq-trend hq-trend--up">${DUMMY_KPI.mrrTrend} MoM</span>
        <span class="hq-kpi-sub">Subscription revenue</span>
      </div>
      <div class="hq-kpi-spark">${sparkline(MRR_SPARK, '#f59e0b')}</div>
    </div>

    <!-- Commission -->
    <div class="hq-kpi-card hq-kpi-card--green">
      <i class="fa fa-handshake hq-kpi-icon"></i>
      <div class="hq-kpi-label">Marketplace Commission</div>
      <div class="hq-kpi-value hq-kpi-value--green">SAR ${fmt(DUMMY_KPI.commission)}</div>
      <div class="hq-kpi-meta">
        <span class="hq-trend hq-trend--up">${DUMMY_KPI.commTrend} MoM</span>
        <span class="hq-kpi-sub">1.5% platform fee on CIF</span>
      </div>
      <div class="hq-kpi-spark">${sparkline(COMM_SPARK, '#10b981')}</div>
    </div>

    <!-- Active Licenses -->
    <div class="hq-kpi-card hq-kpi-card--purple">
      <i class="fa fa-id-card hq-kpi-icon"></i>
      <div class="hq-kpi-label">Active Licenses</div>
      <div class="hq-kpi-value hq-kpi-value--purple" style="font-size:1.55rem;line-height:1.2">
        ${DUMMY_KPI.roasteries} Roasteries
        <span style="font-size:1rem;color:var(--hq-sky);display:block;font-weight:700;margin-top:2px">${DUMMY_KPI.pulseBranches} Pulse Branches</span>
      </div>
      <div class="hq-kpi-meta">
        <span class="hq-kpi-sub" style="margin-top:2px">ERP Pro + IoT Pulse add-ons</span>
      </div>
    </div>

    <!-- NRR -->
    <div class="hq-kpi-card hq-kpi-card--sky">
      <i class="fa fa-arrow-trend-up hq-kpi-icon"></i>
      <div class="hq-kpi-label">Net Revenue Retention</div>
      <div class="hq-kpi-value hq-kpi-value--sky">${DUMMY_KPI.nrr}</div>
      <div class="hq-kpi-meta">
        <span class="hq-trend hq-trend--up">Expansion > Churn</span>
      </div>
    </div>

  </div>

  <!-- ── Secondary Metrics ──────────────────────────────────────────────── -->
  <div class="hq-meta-grid hq-mb32">
    <div class="hq-meta-box">
      <div class="hq-meta-label">ARPU</div>
      <div class="hq-meta-value" style="color:var(--hq-amber)">SAR ${fmt(DUMMY_KPI.arpu)}</div>
      <div class="hq-meta-note">Avg Revenue Per Unit/mo</div>
    </div>
    <div class="hq-meta-box">
      <div class="hq-meta-label">CAC</div>
      <div class="hq-meta-value" style="color:var(--hq-text)">SAR ${fmt(DUMMY_KPI.cac)}</div>
      <div class="hq-meta-note">Customer Acquisition Cost</div>
    </div>
    <div class="hq-meta-box">
      <div class="hq-meta-label">Churn Rate</div>
      <div class="hq-meta-value" style="color:var(--hq-green)">${DUMMY_KPI.churnRate}</div>
      <div class="hq-meta-note">Monthly</div>
    </div>
    <div class="hq-meta-box">
      <div class="hq-meta-label">LTV : CAC</div>
      <div class="hq-meta-value" style="color:var(--hq-purple)">16.2×</div>
      <div class="hq-meta-note">Healthy > 3×</div>
    </div>
    <div class="hq-meta-box">
      <div class="hq-meta-label">Total Revenue</div>
      <div class="hq-meta-value" style="color:var(--hq-text)">SAR ${fmt(DUMMY_KPI.mrr + DUMMY_KPI.commission)}</div>
      <div class="hq-meta-note">SaaS + Commission</div>
    </div>
    <div class="hq-meta-box">
      <div class="hq-meta-label">ZATCA Compliance</div>
      <div class="hq-meta-value" style="color:var(--hq-green)">92.3%</div>
      <div class="hq-meta-note">48 / 52 roasteries 100%</div>
    </div>
  </div>

  <!-- ── Monetization Chart ─────────────────────────────────────────────── -->
  <div class="hq-section-label hq-mb16">
    <i class="fa fa-chart-bar"></i> Platform Monetization Health
  </div>

  <div class="hq-chart-wrap hq-mb32">

    <!-- Stacked Bar Chart -->
    <div class="hq-card">
      <div class="hq-chart-title">
        <i class="fa fa-layer-group" style="color:var(--hq-amber)"></i>
        Monthly Revenue Split — Subscription vs Transaction Fees
        <span style="font-size:10px;color:var(--hq-text-muted);margin-left:auto">Oct 2025 → Mar 2026</span>
      </div>
      ${stackedBarChart()}
      <div class="hq-chart-legend" style="margin-top:14px">
        <div style="display:flex;align-items:center;gap:7px">
          <div class="hq-legend-dot" style="background:#f59e0b"></div>
          <span class="hq-legend-label">Subscription Revenue (Roaster Pro + IoT Pulse)</span>
        </div>
        <div style="display:flex;align-items:center;gap:7px">
          <div class="hq-legend-dot" style="background:#ca8a04"></div>
          <span class="hq-legend-label">Transaction Fees (1.5% Exchange Commission)</span>
        </div>
      </div>
    </div>

    <!-- Revenue Mix Donut (SVG) -->
    <div class="hq-card">
      <div class="hq-chart-title">
        <i class="fa fa-circle-half-stroke" style="color:var(--hq-amber)"></i>
        Revenue Mix
      </div>
      <div class="hq-donut-wrap">
        <svg viewBox="0 0 120 120" width="120" height="120">
          <!-- Sub 70% -->
          <circle cx="60" cy="60" r="46" fill="none" stroke="#1a1a1a" stroke-width="18"/>
          <circle cx="60" cy="60" r="46" fill="none" stroke="#f59e0b" stroke-width="18"
                  stroke-dasharray="${(0.70 * 2 * Math.PI * 46).toFixed(1)} ${(2 * Math.PI * 46).toFixed(1)}"
                  stroke-dashoffset="${(0.25 * 2 * Math.PI * 46).toFixed(1)}"
                  opacity=".9"/>
          <!-- Txn 30% -->
          <circle cx="60" cy="60" r="46" fill="none" stroke="#ca8a04" stroke-width="18"
                  stroke-dasharray="${(0.30 * 2 * Math.PI * 46).toFixed(1)} ${(2 * Math.PI * 46).toFixed(1)}"
                  stroke-dashoffset="${(-0.45 * 2 * Math.PI * 46).toFixed(1)}"
                  opacity=".85"/>
          <text x="60" y="56" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="800" font-family="monospace">70%</text>
          <text x="60" y="70" text-anchor="middle" fill="#6b7280" font-size="9" font-family="monospace">SaaS</text>
        </svg>
        <div style="width:100%">
          <div class="hq-donut-legend-row">
            <div class="hq-donut-legend-bar" style="background:#f59e0b"></div>
            <span class="hq-donut-legend-val" style="color:#f59e0b">70%</span>
            <span style="font-size:11px;color:var(--hq-text-muted);margin-left:4px">Subscriptions</span>
          </div>
          <div class="hq-donut-legend-row" style="margin-top:8px">
            <div class="hq-donut-legend-bar" style="background:#ca8a04"></div>
            <span class="hq-donut-legend-val" style="color:#ca8a04">30%</span>
            <span style="font-size:11px;color:var(--hq-text-muted);margin-left:4px">Commission</span>
          </div>
        </div>
        <div style="text-align:center;width:100%;padding-top:6px;border-top:1px solid var(--hq-border)">
          <div style="font-size:10px;color:var(--hq-text-muted)">Total MRR</div>
          <div style="font-size:1.2rem;font-weight:800;color:var(--hq-amber);font-family:monospace">SAR ${fmt(DUMMY_KPI.mrr + DUMMY_KPI.commission)}</div>
        </div>
      </div>
    </div>

  </div>

  <!-- ── Triple-Lock Registry ──────────────────────────────────────────── -->
  <div class="hq-section-label hq-mb16">
    <i class="fa fa-lock"></i> Triple-Lock Client Registry — License &amp; Compliance
  </div>

  <div class="hq-table-wrap hq-mb32">
    <table class="hq-table">
      <thead>
        <tr>
          <th class="hq-th">Client</th>
          <th class="hq-th">ID</th>
          <th class="hq-th">Plan / Status</th>
          <th class="hq-th">Sponge Δ Analytics</th>
          <th class="hq-th" style="min-width:130px">Pulse Sync Rate</th>
          <th class="hq-th">ZATCA Score</th>
          <th class="hq-th">MRR</th>
          <th class="hq-th">Lock Control</th>
        </tr>
      </thead>
      <tbody id="hq-registry-tbody">
        ${clientRows}
      </tbody>
    </table>
  </div>

  <!-- ── Two-column bottom ──────────────────────────────────────────────── -->
  <div style="display:grid;grid-template-columns:1fr 340px;gap:16px;margin-bottom:32px" class="hq-bottom-grid">

    <!-- Alert Feed -->
    <div class="hq-card">
      <div class="hq-flex-between" style="margin-bottom:14px">
        <div class="hq-chart-title" style="margin-bottom:0">
          <i class="fa fa-bell" style="color:var(--hq-amber)"></i>
          Platform Alerts
        </div>
        <span style="font-size:10px;color:var(--hq-text-muted);font-family:monospace">Last 24 h</span>
      </div>
      ${alertItems}
    </div>

    <!-- Platform Health Score -->
    <div class="hq-card" style="display:flex;flex-direction:column;gap:16px">
      <div class="hq-chart-title">
        <i class="fa fa-shield-halved" style="color:var(--hq-green)"></i>
        Platform Health Score
      </div>

      ${[
        { label: 'Sponge Engine Uptime',   val: 99.8,  color: '#10b981' },
        { label: 'ZATCA Compliance Avg',   val: 92.3,  color: '#f59e0b' },
        { label: 'IoT Pulse Sync Avg',     val: 88.6,  color: '#0ea5e9' },
        { label: 'Payment Capture Rate',   val: 97.2,  color: '#a78bfa' },
        { label: 'API Availability',       val: 99.95, color: '#10b981' },
      ].map(m => `
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:11px;color:var(--hq-text-sec)">${m.label}</span>
            <span style="font-size:11px;font-weight:700;color:${m.color};font-family:monospace">${m.val}%</span>
          </div>
          <div style="height:4px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${m.val}%;background:${m.color};border-radius:3px;opacity:.85"></div>
          </div>
        </div>`).join('')}

      <div style="margin-top:auto;padding-top:12px;border-top:1px solid var(--hq-border);text-align:center">
        <div style="font-size:10px;color:var(--hq-text-muted);text-transform:uppercase;letter-spacing:.08em">Composite Score</div>
        <div style="font-size:2.2rem;font-weight:800;color:var(--hq-green);font-family:monospace;margin-top:4px">95.6</div>
        <div style="font-size:10px;color:var(--hq-green);opacity:.7">Excellent</div>
      </div>
    </div>

  </div>

  <!-- ── Footer ─────────────────────────────────────────────────────────── -->
  <div style="text-align:center;padding:20px 0;border-top:1px solid var(--hq-border)">
    <span style="font-size:10px;color:var(--hq-text-muted);font-family:monospace">
      QABBAN HQ · God View · Sprint 1 — Decorative / Dummy Data Only ·
      <span id="hq-footer-ts">—</span>
    </span>
  </div>

</main>
</div>

<!-- ══════════════════════════════════════════════════════════════ SCRIPTS -->
<script>
(function() {
  'use strict'

  /* ── Clock ── */
  function tick() {
    var now = new Date()
    var ts  = now.toLocaleString('en-SA', {
      year:'numeric', month:'short', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit',
      hour12: false
    })
    var el = document.getElementById('hq-clock')
    var ft = document.getElementById('hq-footer-ts')
    if (el) el.textContent = ts
    if (ft) ft.textContent = 'Generated: ' + ts + ' AST'
  }
  tick()
  setInterval(tick, 1000)

  /* ── Lock / Unlock toggle ── */
  // Dummy client data mirrored from server (decorative only)
  var clients = ${JSON.stringify(DUMMY_CLIENTS.map(c => ({ id: c.id, name: c.name, locked: c.locked })))}

  window.hqToggleLock = function(idx) {
    var c   = clients[idx]
    var btn = document.querySelector('[data-idx="' + idx + '"] .hq-lock-btn')
    if (!btn || !c) return

    // Optimistic toggle (purely decorative)
    c.locked = !c.locked

    if (c.locked) {
      btn.className = 'hq-lock-btn hq-lock-btn--locked'
      btn.innerHTML = '<i class="fa fa-lock"></i> Locked'
      // Dim the row
      var tds = document.querySelectorAll('[data-idx="' + idx + '"] .hq-td')
      tds.forEach(function(td) { td.style.opacity = '.45' })
      btn.style.opacity = '1'
    } else {
      btn.className = 'hq-lock-btn hq-lock-btn--open'
      btn.innerHTML = '<i class="fa fa-lock-open"></i> Active'
      var tds2 = document.querySelectorAll('[data-idx="' + idx + '"] .hq-td')
      tds2.forEach(function(td) { td.style.opacity = '' })
    }

    // Toast
    hqToast(c.locked ? c.name + ' access locked' : c.name + ' access restored', c.locked ? 'warn' : 'ok')
  }

  /* ── Toast ── */
  function hqToast(msg, type) {
    var colors = { ok: '#10b981', warn: '#f59e0b', err: '#ef4444' }
    var t = document.createElement('div')
    t.style.cssText = [
      'position:fixed;bottom:28px;right:28px;z-index:9999',
      'background:#161616;border:1px solid ' + (colors[type] || '#f59e0b'),
      'color:' + (colors[type] || '#f59e0b'),
      'padding:10px 18px;border-radius:10px;font-size:12px;font-weight:600',
      'box-shadow:0 8px 32px rgba(0,0,0,.5);opacity:0;transition:opacity .25s'
    ].join(';')
    t.textContent = msg
    document.body.appendChild(t)
    requestAnimationFrame(function() { t.style.opacity = '1' })
    setTimeout(function() {
      t.style.opacity = '0'
      setTimeout(function() { t.remove() }, 300)
    }, 2800)
  }

  /* ── Bar chart hover tooltip ── */
  var svgBars = document.querySelectorAll('.hq-card rect[fill="#f59e0b"], .hq-card rect[fill="#ca8a04"]')
  svgBars.forEach(function(bar) {
    bar.style.cursor = 'pointer'
    bar.addEventListener('mouseenter', function(e) {
      bar.style.opacity = '1'
      bar.style.filter  = 'brightness(1.3)'
    })
    bar.addEventListener('mouseleave', function() {
      bar.style.opacity = ''
      bar.style.filter  = ''
    })
  })

})()
</script>

</body>
</html>`
}
