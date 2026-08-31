# Dropship Platform

> AI-powered multi-store dropshipping automation — orders land in your store, get fulfilled at the supplier, and sync tracking back, without anyone touching them.

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white)

Running a dropshipping store means copying every order into a supplier portal by hand, then
chasing tracking numbers. This platform removes that loop entirely: a webhook fires the moment
a customer checks out, the order is placed with the supplier immediately, and tracking flows
back to the store on its own. An AI assistant sits on top with **19 tools**, so the operator can
just ask for what they need — pending orders, profit margins, a new coupon — in plain language.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | NestJS + TypeScript + Prisma + PostgreSQL |
| **Frontend** | Next.js 14 (App Router, Server Components) |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Auth** | JWT via Passport.js (API) · NextAuth.js — Google, Apple, Facebook, Credentials (web) |
| **AI** | Groq — `llama-3.3-70b-versatile` with tool calling |
| **Integrations** | WooCommerce · Shopify · CJ Dropshipping |
| **Scheduling** | `@nestjs/schedule` cron jobs |
| **Email** | Nodemailer with HTML templates |

---

## How an Order Flows

```
Customer checks out
        │
        ▼
WooCommerce / Shopify  ──webhook──►  API  ──►  CJ Dropshipping
        ▲                                            │
        └──────────── tracking number ◄──────────────┘
```

Orders are fulfilled **immediately on the webhook** — there is no cron-job wait in the happy path.
Cron jobs exist only as a safety net for retries and drift.

### Automatic retries

When fulfilment fails, the order walks a backoff ladder instead of silently dying:

| Status | Delay | |
| :--- | :--- | :--- |
| `RETRY_1` | 15 minutes | first retry |
| `RETRY_2` | 1 hour | second retry |
| `RETRY_3` | 4 hours | final retry |
| `FAILED` | — | manual intervention required |

A cron job sweeps every 5 minutes for orders that are due, and any order can be retried by hand
from the UI or API at any point.

### Scheduled jobs

| Schedule | Job |
| :--- | :--- |
| Every 5 minutes | Process due retries |
| Hourly | Auto-fulfil pending orders |
| Every 2 hours | Sync tracking numbers |
| Every 6 hours | Sync inventory levels |
| Daily, 9 AM | Email summary report |

### Webhooks, set up for you

Adding a store auto-registers its webhooks — WooCommerce via REST, Shopify via GraphQL —
covering order created, updated and cancelled. No manual dashboard configuration.

---

## The AI Assistant — 19 Tools

A floating chat widget backed by Groq tool-calling. Rather than answering questions about the
data, it operates on it.

**Fulfilment & operations**
`search_products` · `get_pending_orders` · `fulfill_orders` · `sync_tracking` · `sync_inventory` ·
`process_refund` · `get_all_stores_orders`

**Catalogue & pricing**
`import_product` · `bulk_import_products` · `get_products` · `update_product_price` ·
`get_shipping_rates` · `calculate_profit`

**Store & customers**
`manage_store` · `get_customers` · `create_coupon` · `send_notification`

**Reporting**
`get_business_stats` · `analytics_report`

---

## Getting Started

```bash
# 1. Install (pnpm workspaces)
pnpm install

# 2. Configure
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Set up the database
pnpm --filter api prisma migrate dev

# 4. Run everything
pnpm dev
```

| | |
| :--- | :--- |
| Web | http://localhost:3000 |
| API | http://localhost:3001 |

CJ Dropshipping ships with a **simulation mode**, so the full order pipeline can be exercised
end-to-end without placing real supplier orders.

---

## Project Structure

```
dropship-platform/
├── apps/
│   ├── api/          # NestJS — stores, orders, products, AI/MCP, webhooks, scheduler
│   └── web/          # Next.js 14 — dashboard, stores, orders, AI chat widget
├── packages/         # shared types and config
└── turbo.json
```

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the production checklist.
