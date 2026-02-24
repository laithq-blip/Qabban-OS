# Qabban OS — B2B Roastery Operations Platform

## Project Overview
- **Name**: Qabban OS
- **Goal**: Industrial-grade B2B web portal for specialty coffee roastery operations
- **Style**: Industrial Minimalist · Dark Theme · Amber Data Points

## Live URLs
- **Portal**: `https://3000-i9i5gwbdtx22p8f4adsiu-2e1b9533.sandbox.novita.ai/`

## Login Credentials
| Role | Username | Password |
|------|----------|----------|
| Roaster Admin | `admin` | `qabban2026` |
| Cafe Client (Gold) | `alnokhba` | `cafe123` |
| Cafe Client (Silver) | `qahwa_bahr` | `cafe123` |
| Cafe Client (Bronze) | `pearl_roast` | `cafe123` |

## Features

### ✅ Completed
- **Secure dual-role login** (Admin / Cafe portal, cookie-based sessions)
- **18% shrinkage formula** applied to all lots: `Roasted = Green × 0.82`
- **Roaster Admin Dashboard**: Overview stats, branch risk matrix, inventory summary
- **Branch Monitor**: Riyadh, Jeddah, Dammam with live humidity/temperature risk classification
- **Humidity Risk Alerts**: LOW (<50%) / MODERATE (50–61%) / HIGH (62–74%) / CRITICAL (≥75%)
- **Full Inventory Ledger**: All lots with green→roasted weights, shrinkage, grades
- **Cafe Portal**: Secure view showing ONLY `OPTIMAL` lots (MONITOR/CRITICAL hidden)
- **Request Beans Flow**: Modal with qty/notes → admin notification → confirm/dispatch workflow
- **Admin Bean Requests View**: Confirm and dispatch orders, pending count badge
- **REST API**: `/api/lots`, `/api/lots/optimal`, `/api/branches`, `/api/requests`
- **Mobile-responsive**: Sidebar collapses, bottom nav on mobile
- **Industrial dark theme**: IBM Plex Mono + Inter, amber #F59E0B data points

### 🏗️ Branches Monitored
| Branch | Humidity | Risk Status |
|--------|----------|-------------|
| Riyadh | 45% | 🟢 LOW |
| Jeddah | 68% | 🟠 HIGH |
| Dammam | 80% | 🔴 CRITICAL |

## Data Architecture
- **Data Models**: CoffeeLot, Branch, CafeClient, BeanRequest
- **Storage**: In-memory (edge-compatible, upgrade to Cloudflare D1 for persistence)
- **Shrinkage Logic**: `applyRoastShrinkage(greenKg)` → `greenKg × 0.82`
- **Risk Classifier**: `classifyHumidityRisk(humidity)` → LOW/MODERATE/HIGH/CRITICAL

## Tech Stack
- **Backend**: Hono v4 (TypeScript)
- **Runtime**: Cloudflare Pages / Workers
- **Build**: Vite + @hono/vite-build/cloudflare-pages
- **Fonts**: IBM Plex Mono (data) + Inter (UI)
- **Icons**: Font Awesome 6.5

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active (sandbox)
- **Build output**: `dist/_worker.js` (87kb)
- **Last Updated**: 2026-02-24
