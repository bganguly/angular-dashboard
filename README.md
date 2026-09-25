# angular-dashboard — Angular 19 + TypeScript + Azure Container Apps

Production-grade **Angular 19 / TypeScript** orders dashboard with sub-second search and chart responses across 4 M+ orders. Built as a multi-stage Docker image (Angular → Nginx), deployed to **Azure Container Apps** via **Terraform IaC**. Nginx serves the compiled SPA and proxies `/api/*` to the Spring Boot backend.

---

## Live Service

| Endpoint | URL |
|---|---|
| **Dashboard** | Available on demand via `deploy.sh` |
| **Portfolio demo** | https://bganguly.github.io |

> Azure Container Apps scales to zero when idle; run `deploy.sh` to provision infrastructure and start the service.

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
│   Azure Container Registry                                               │
│   ┌──────────────────┐    ◄── ACR build (deploy.sh)                      │
│   │  frontend image  │         Angular → Nginx multi-stage               │
│   └──────────────────┘                                                   │
│           │ image pull                                                   │
│           ▼                                                              │
│   Container Apps Environment                                             │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  Container App: angular-dashboard                                │  │
│   │  • Nginx (port 80) serves Angular dist + proxies /api/*         │  │
│   │  • Scales to zero when idle                                      │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                              │ HTTPS (/api/*)                            │
│   ┌──────────────────────────▼───────────────────────────────────────┐  │
│   │  Spring Boot Backend (separate repo / deployment)               │  │
│   │  • REST /api/orders, /api/aggregates, /api/regions              │  │
│   │  • 4 M+ orders, GIN trigram index, pre-agg summary tables       │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│   Terraform (infra/) manages Container Apps environment + app            │
└──────────────────────────────────────────────────────────────────────────┘

Deploy flow
───────────
local machine
  └─ deploy.sh
       ├─ [1] local   → ng serve on :4200
       └─ [2] Azure   → az acr build → ACR
                        → terraform apply (Container Apps)
```

### Key design decisions

| Concern | Approach |
|---|---|
| **BFF proxy** | Nginx forwards `/api/*` to `BACKEND_URL` env var; browser sees a single origin, no CORS. |
| **Image build** | `az acr build` — remote build in Azure, no local Docker required. |
| **Search** | Backend GIN trigram index on denormalized `search_text` column; sub-second on 4 M+ rows. |
| **Aggregates** | Pre-aggregated summary tables — chart queries never hit raw `orders`. |
| **Pagination** | Cursor-based navigation (Customers), offset pagination (Orders). |
| **IaC** | Terraform (`infra/`) — Container Apps environment, app, ACR, Log Analytics declared as code. |
| **Dark mode** | Tailwind `dark:` class strategy; ThemeToggle component persists preference to `localStorage`. |

---

## Stack

| Component | Implementation |
|---|---|
| **Angular / TypeScript front-end** | Angular 19, TypeScript, Tailwind CSS, ng2-charts (Chart.js) |
| **BFF layer** | Nginx reverse proxy — `/api/*` → Spring Boot backend |
| **Serverless / cloud-native** | Azure Container Apps — scales to zero, no node management |
| **IaC** | Terraform (`infra/`) — Container Apps environment, app, ACR, Log Analytics |
| **Image build** | `az acr build` — remote Azure build, no local Docker |
| **Performance** | Sub-second chart from pre-aggregated tables; sub-second search via GIN trigram index |

---

## Deployment / Running

```bash
./scripts/deploy.sh      # [1] local dev · [2] Azure (Container Apps)
./scripts/infra-down.sh  # [1] stop local · [2] destroy Azure stack
```

| Action | Script | Prompt |
|---|---|---|
| Start local dev server (port 4200) | `./scripts/deploy.sh` | `[1]` |
| Deploy to Azure Container Apps | `./scripts/deploy.sh` | `[2]` |
| Stop local dev server | `./scripts/infra-down.sh` | `[1]` |
| Teardown Azure stack | `./scripts/infra-down.sh` | `[2]` |

Deploy the Spring Boot backend first — `deploy.sh` reads the backend URL from Terraform outputs to configure Nginx.

### Cost

| Resource | Cost |
|---|---|
| **Container Apps** | Scale-to-zero — ~$0 when idle |
| **Azure Container Registry** | Basic tier — ~$5/mo |
| **Log Analytics** | Pay-per-GB — negligible at demo volume |

---

## Scale & Performance

> **4 M+ orders** served with sub-second search and chart responses. Full-text search hits a single GIN trigram index on `search_text`; chart aggregates hit pre-aggregated summary tables — neither touches the raw `orders` table on the hot path.

```
Browser ──HTTPS──► Nginx / Container App ──proxy /api/*──► Spring Boot ──JDBC──► PostgreSQL
                   angular-dashboard                        backend               4 M+ rows
                   scales to zero                                                 GIN trigram index
```

---

## Features

- **Overview chart** — stacked bar chart of daily revenue by product category; date range picker filters the data
- **Orders table** — paginated (offset), sortable (customer / status / total / date), filter bar (status, region, date range)
- **Full-text search** — multi-token search across all visible columns via backend GIN trigram index; sub-second on 4 M+ rows
- **Customers table** — cursor-based pagination (keyset), filter by name/email and region
- **Dark mode** — system-preference detection; light / dark / system toggle persisted to `localStorage`
- **BFF proxy** — Nginx forwards `/api/*` to Spring Boot; browser sees a single origin, no CORS
