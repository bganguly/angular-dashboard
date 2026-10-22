# fastapi-angular-dashboard-frontend — Angular 19 + FastAPI + Azure

Production-grade **Angular 19 / TypeScript** orders dashboard with sub-second search and chart responses across 4 M+ orders. The Angular SPA is deployed to **Azure Static Web Apps**; the REST API is a **Python FastAPI** backend deployed to **Azure Container Apps**.

---

## Live Service

| Endpoint | URL |
|---|---|
| **Dashboard** | https://salmon-wave-01f721c0f.6.azurestaticapps.net |
| **Portfolio demo** | https://bganguly.github.io/#angular_dashboard |

> Azure Container Apps scales to zero when idle; the first request after a period of inactivity may have a slight delay.

---

## Using the App

1. **Overview chart** — stacked bar chart of daily revenue by product category; date range picker narrows the window.
2. **Orders** — search orders across all columns (name, email, notes, status, region) via the backend's full-text index; sub-second on 4 M+ rows. Filter by status, region, and date range.
3. **Customers** — paginated customer list with cursor-based navigation; filter by name, email, or region.
4. **Dark mode** — toggle between light / dark / system via the top-right control; preference persisted to `localStorage`.

---

## Architecture

### Topology

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Azure Subscription                             │
│                                                                          │
│   Azure Static Web Apps                                                  │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  fastapi-angular-dashboard-frontend (SWA)                                         │  │
│   │  • Compiled Angular SPA served from Azure CDN                    │  │
│   │  • Free tier — always-on, global edge                            │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                              │ HTTPS (/api/*)                            │
│   ┌──────────────────────────▼───────────────────────────────────────┐  │
│   │  Azure Container Apps: fastapi-dashboard-backend                 │  │
│   │  • FastAPI (Python 3.12) — uvicorn                               │  │
│   │  • REST: /api/orders, /api/aggregates, /api/customers, /api/regions│  │
│   │  • 4 M+ orders, ILIKE search on search_text, pre-agg summary tables│  │
│   │  • Scales to zero when idle                                      │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

Deploy flow
───────────
local machine
  ├─ fastapi-angular-dashboard-frontend/scripts/deploy.sh       → Azure SWA (frontend)
  └─ fastapi-dashboard-backend/scripts/deploy.sh → Azure Container Apps (API)
```

### Key design decisions

| Concern | Approach |
|---|---|
| **Frontend hosting** | Azure Static Web Apps — free tier CDN, no server to manage. |
| **API backend** | FastAPI on Azure Container Apps — scales to zero, ~$0 when idle. |
| **Search** | ILIKE on denormalized `search_text` column backed by a GIN trigram index; sub-second on 4 M+ rows. |
| **Aggregates** | Pre-aggregated `daily_summary` table — chart queries never hit raw `orders`. |
| **Pagination** | Cursor-based (Customers), offset (Orders). |
| **Dark mode** | Tailwind `dark:` class strategy; ThemeToggle persists preference to `localStorage`. |

---

## Stack

| Component | Implementation |
|---|---|
| **Frontend** | Angular 19, TypeScript, Tailwind CSS, ng2-charts (Chart.js) |
| **Backend API** | Python 3.12, FastAPI, uvicorn, psycopg2 |
| **Frontend hosting** | Azure Static Web Apps — free tier CDN |
| **Backend hosting** | Azure Container Apps — scales to zero |
| **Performance** | Sub-second chart from pre-aggregated tables; sub-second search via GIN trigram index |

---

## Repos

| Service | Location |
|---|---|
| **Angular frontend** | `angular-implementations/fastapi-angular-dashboard-frontend/` |
| **FastAPI backend** | `angular-implementations/fastapi-dashboard-backend/` |

---

## Deployment / Running

```bash
# Frontend (Azure Static Web Apps)
fastapi-angular-dashboard-frontend/scripts/deploy.sh      # [1] local ng serve · [2] Azure SWA
fastapi-angular-dashboard-frontend/scripts/infra-down.sh  # [1] stop local · [2] destroy Azure stack

# Backend (Azure Container Apps)
fastapi-dashboard-backend/scripts/deploy.sh      # [1] local uvicorn :8000 · [2] Azure Container Apps
fastapi-dashboard-backend/scripts/infra-down.sh  # [1] kill :8000 · [2] destroy Azure stack
```

Deploy the FastAPI backend first, then set `apiBase` in `src/environments/environment.prod.ts` to the backend URL before deploying the frontend.

### Cost

| Resource | Cost |
|---|---|
| **Azure Static Web Apps** | Free tier — $0 |
| **Azure Container Apps** | Scale-to-zero — ~$0 when idle |

---

## Scale & Performance

> **4 M+ orders** served with sub-second search and chart responses. Full-text search hits a GIN trigram index on `search_text`; chart aggregates hit pre-aggregated summary tables — neither touches the raw `orders` table on the hot path.

```
Browser ──HTTPS──► Angular SPA (Azure SWA) ──HTTPS /api/*──► FastAPI (Container Apps) ──psycopg2──► PostgreSQL
                   CDN edge                                    scales to zero               4 M+ rows
                                                                                            GIN trigram index
```

---

## Features

- **Overview chart** — stacked bar chart of daily revenue by product category; date range picker filters the data
- **Orders table** — paginated (offset), sortable (customer / status / total / date), filter bar (status, region, date range)
- **Full-text search** — multi-token search across all visible columns via ILIKE on `search_text`; sub-second on 4 M+ rows
- **Customers table** — cursor-based pagination (keyset), filter by name/email and region
- **Dark mode** — system-preference detection; light / dark / system toggle persisted to `localStorage`
- **API Explorer** — live endpoint runner built into the Angular app
