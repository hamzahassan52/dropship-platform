# Dropship SaaS Platform

> AI-Powered Multi-Store Dropshipping Automation Platform

---

## Tech Stack

| Layer               | Technology                                                |
| ------------------- | --------------------------------------------------------- |
| **Backend**         | NestJS + TypeScript + Prisma + PostgreSQL                 |
| **Frontend**        | Next.js 14 (App Router, Server Components)                |
| **Auth (Backend)**  | JWT (Passport.js + bcryptjs)                              |
| **Auth (Frontend)** | NextAuth.js (Google, Apple, Facebook, Credentials)        |
| **AI**              | Groq (llama-3.3-70b-versatile - FREE, FAST, Tool Calling) |
| **Integrations**    | WooCommerce, Shopify, CJ Dropshipping                     |
| **Scheduler**       | @nestjs/schedule (Cron Jobs)                              |
| **Email**           | Nodemailer (Professional HTML Templates)                  |
| **Monorepo**        | Turborepo + pnpm                                          |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     AUTHENTICATION FLOW                              │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────────┐│     │
│  │  │  Google   │  │   Apple   │  │  Facebook │  │  Email/Password   ││     │
│  │  │   OAuth   │  │   OAuth   │  │   OAuth   │  │   (Credentials)   ││     │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────────┬─────────┘│     │
│  │        └──────────────┴──────────────┴───────────────────┘          │    │
│  │                              ↓                                       │   │
│  │                     NextAuth.js Session                              │   │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Login/Signup│  │  Dashboard  │  │ Stores Page │  │    AI Chat Widget   │ │
│  │   /login    │  │     /       │  │  /stores    │  │  (Floating Bubble)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│  │Store Detail │  │   Orders    │  │Failed Orders│                          │
│  │/stores/[id] │  │  /orders    │  │/orders/failed│                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST + JWT Token
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (NestJS :4000)                            │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │   Chat   │  │  Stores  │  │  Orders  │  │ Webhooks │       │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │  │  Module  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │             │             │
│       │             ▼             │             │             │             │
│       │    ┌────────────────┐     │             │             │             │
│       │    │   MCP Service  │◄────┴─────────────┴─────────────┘             │
│       │    │  (19 AI Tools) │                                               │
│       │    └───────┬────────┘                                               │
│       │            │                                                        │
│       │    ┌────────────────┐                                               │
│       │    │   Scheduler    │ ← Auto-fulfill, Tracking Sync, Retries        │
│       │    │  (Cron Jobs)   │                                               │
│       │    └───────┬────────┘                                               │
│       │            │                                                        │
│       ▼            ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         INTEGRATIONS                                │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐             │    │
│  │  │WooCommerce │  │  Shopify   │  │  CJ Dropshipping   │             │    │
│  │  │    API     │  │    API     │  │     (Supplier)     │             │    │
│  │  │ + Webhooks │  │ + Webhooks │  │  + Simulation Mode │             │    │
│  │  └────────────┘  └────────────┘  └────────────────────┘             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ PostgreSQL │  │   Groq     │  │   SMTP     │  │ Store APIs │             │
│  │  Database  │  │ Llama 3.3  │  │   Email    │  │ WC/Shopify │             │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Order Retry System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORDER RETRY SYSTEM                                  │
│                                                                             │
│  Order Fulfillment Failed                                                   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐    15 min     ┌─────────────┐    1 hour    ┌─────────────┐ │
│  │   RETRY_1   │ ────────────► │   RETRY_2   │ ───────────► │   RETRY_3   │ │
│  │  (1st try)  │               │  (2nd try)  │              │  (3rd try)  │ │
│  └─────────────┘               └─────────────┘              └─────────────┘ │
│                                                                      │      │
│                                                              4 hours │      │
│                                                                      ▼      │
│                                                            ┌─────────────┐  │
│                                                            │   FAILED    │  │
│                                                            │(Manual Only)│  │
│                                                            └─────────────┘  │
│                                                                             │
│  Cron Job: Every 5 minutes checks for orders ready to retry                 │
│  Manual Retry: Available via UI or API at any state                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Webhook Auto-Setup Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AUTOMATIC WEBHOOK SETUP                                │
│                                                                             │
│  User Adds Store                                                            │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  WebhookSetupService.setupStoreWebhooks(storeId)                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │                                                                   │
│         ├──── WooCommerce ────►  Creates webhooks via REST API              │
│         │     - order.created    POST /wp-json/wc/v3/webhooks               │
│         │     - order.updated                                               │
│         │                                                                   │
│         └──── Shopify ────────►  Creates webhooks via GraphQL               │
│               - orders/create    POST /admin/api/webhooks.json              │
│               - orders/updated                                              │
│               - orders/cancelled                                            │
│                                                                             │
│  Webhook URL: https://api.yoursite.com/api/webhooks/{platform}/{storeId}    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Order Journey Flow (Immediate Fulfillment)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    IMMEDIATE ORDER FULFILLMENT FLOW                         │
│                                                                             │
│  ⚡ Orders are processed IMMEDIATELY via webhook - NO cron job wait!         │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: Customer Places Order
┌─────────────────────────────────────────────────────────────────────────────┐
│  Customer → WooCommerce/Shopify Store → Order #1001 ($24.99)              │
│  Order Status: 'processing' (payment received)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
PHASE 2: Webhook Triggers Backend (IMMEDIATE)
┌─────────────────────────────────────────────────────────────────────────────┐
│  WooCommerce/Shopify sends webhook to:                                      │
│  POST /api/webhooks/woocommerce/:storeId                                    │
│                                                                             │
│  Backend Actions (SYNCHRONOUS - NO DELAY):                                  │
│  ├─ WebhooksService.handleOrderCreated()                                    │
│  ├─ Validates order status === 'processing'                                 │
│  ├─ Creates Order in database (status: processing)                          │
│  └─ Sends "Order Received" email to customer                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
PHASE 3: IMMEDIATE CJ Fulfillment (NO CRON WAIT!)
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚡ OrdersService.fulfillOrderFromWebhook() - Called IMMEDIATELY             │
│                                                                             │
│  ├─ Prepares CJ order data from webhook payload                             │
│  ├─ Calls cjDropshipping.placeOrder() → Foran CJ ko order bhejta hai        │
│  │                                                                          │
│  ├─ SUCCESS PATH:                                                           │
│  │   ├─ Order status: PROCESSING                                            │
│  │   ├─ Supplier Order ID: CJ123456                                         │
│  │   ├─ Sends "Thank You" email to customer                                 │
│  │   └─ Updates WooCommerce order status                                    │
│  │                                                                          │
│  └─ FAILURE PATH:                                                           │
│      ├─ Saves order with fulfillmentStatus: PENDING                         │
│      ├─ Schedules automatic retry (15 min → 1 hr → 4 hrs)                   │
│      └─ Cron job (every 5 min) will retry failed orders                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
PHASE 4: CJ Confirms Order
┌─────────────────────────────────────────────────────────────────────────────┐
│  CJ Dropshipping processes and confirms order                               │
│  ├─ Order Status: FULFILLED                                                 │
│  └─ Supplier Order ID: CJ123456                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
PHASE 5: Tracking Sync (Every 2 Hours - Cron)
┌─────────────────────────────────────────────────────────────────────────────┐
│  Scheduler: syncTrackingNumbers() runs every 2 hours                        │
│  ├─ Gets tracking from CJ: TRACK789                                         │
│  ├─ Updates Order status: SHIPPED                                           │
│  ├─ Sends "Order Shipped" email with tracking link                          │
│  └─ Updates WooCommerce/Shopify order with tracking                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
PHASE 6: Delivery Complete
┌─────────────────────────────────────────────────────────────────────────────┐
│  Customer receives product                                                  │
│  ├─ Order Status: DELIVERED                                                 │
│  ├─ Profit calculated: $22.99 (92% margin)                                  │
│  └─ Sends "Order Delivered" email                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Code References

| Phase    | File                         | Function                    |
| -------- | ---------------------------- | --------------------------- |
| 2        | `webhooks.service.ts`        | `handleOrderCreated()`      |
| 3        | `orders.service.ts`          | `fulfillOrderFromWebhook()` |
| 3        | `cj-dropshipping.service.ts` | `placeOrder()`              |
| 3 (fail) | `orders.service.ts`          | `saveFailedOrderForRetry()` |
| 5        | `scheduler.service.ts`       | `syncTrackingNumbers()`     |

### Important Notes

1. **IMMEDIATE Processing**: Orders are processed the moment webhook is received - NO hourly cron wait
2. **Cron Jobs are BACKUP only**:
   - Every 5 min: Retries failed orders
   - Every hour: Catches any missed webhook orders (backup)
   - Every 2 hours: Syncs tracking numbers
3. **Status Check**: Only orders with status `'processing'` (paid) are auto-fulfilled
4. **Retry System**: If immediate fulfillment fails, automatic retry kicks in (15min → 1hr → 4hrs)

---

## Project Structure

```
dropship-platform/
├── apps/
│   ├── api/                              # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/                 # JWT Authentication
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   └── get-user.decorator.ts
│   │   │   │   ├── chat/                 # AI Chat with Groq
│   │   │   │   │   ├── chat.controller.ts
│   │   │   │   │   └── chat.service.ts
│   │   │   │   ├── mcp/                  # 19 Automation Tools
│   │   │   │   │   ├── mcp.controller.ts
│   │   │   │   │   ├── mcp.service.ts
│   │   │   │   │   └── tools/
│   │   │   │   │       ├── search-products.tool.ts
│   │   │   │   │       ├── get-pending-orders.tool.ts
│   │   │   │   │       ├── fulfill-orders.tool.ts
│   │   │   │   │       ├── get-business-stats.tool.ts
│   │   │   │   │       ├── sync-tracking.tool.ts
│   │   │   │   │       ├── import-product.tool.ts
│   │   │   │   │       ├── sync-inventory.tool.ts
│   │   │   │   │       ├── calculate-profit.tool.ts
│   │   │   │   │       ├── process-refund.tool.ts
│   │   │   │   │       ├── manage-store.tool.ts
│   │   │   │   │       ├── get-all-stores-orders.tool.ts
│   │   │   │   │       ├── get-products.tool.ts
│   │   │   │   │       ├── update-product-price.tool.ts
│   │   │   │   │       ├── get-customers.tool.ts
│   │   │   │   │       ├── send-notification.tool.ts
│   │   │   │   │       ├── create-coupon.tool.ts
│   │   │   │   │       ├── get-shipping-rates.tool.ts
│   │   │   │   │       ├── bulk-import-products.tool.ts
│   │   │   │   │       └── analytics-report.tool.ts
│   │   │   │   ├── stores/               # Store Management
│   │   │   │   │   ├── stores.controller.ts
│   │   │   │   │   └── stores.service.ts
│   │   │   │   ├── orders/               # Order Processing + Retry
│   │   │   │   │   ├── orders.controller.ts
│   │   │   │   │   ├── orders.service.ts
│   │   │   │   │   └── order-retry.service.ts
│   │   │   │   ├── webhooks/             # Auto Webhook Management
│   │   │   │   │   ├── webhooks.controller.ts
│   │   │   │   │   ├── webhooks.service.ts
│   │   │   │   │   └── webhook-setup.service.ts
│   │   │   │   ├── dashboard/            # Stats & Analytics
│   │   │   │   ├── inventory/            # Stock Sync
│   │   │   │   ├── scheduler/            # Cron Jobs
│   │   │   │   ├── refunds/              # Refund Handling
│   │   │   │   └── test/                 # E2E Testing
│   │   │   ├── integrations/
│   │   │   │   ├── woocommerce/
│   │   │   │   │   └── woocommerce.service.ts
│   │   │   │   ├── shopify/
│   │   │   │   │   └── shopify.service.ts
│   │   │   │   └── cj-dropshipping/
│   │   │   │       └── cj-dropshipping.service.ts
│   │   │   └── common/
│   │   │       ├── prisma.service.ts
│   │   │       └── email/
│   │   │           ├── email.service.ts
│   │   │           └── templates/
│   │   │               ├── order-received.ts
│   │   │               ├── order-processing.ts
│   │   │               ├── order-shipped.ts
│   │   │               ├── order-delivered.ts
│   │   │               └── welcome.ts
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   └── web/                              # Next.js Frontend
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── globals.css
│           │   ├── api/auth/[...nextauth]/
│           │   │   └── route.ts
│           │   ├── (auth)/               # Auth Pages
│           │   │   ├── layout.tsx
│           │   │   ├── login/page.tsx
│           │   │   └── signup/page.tsx
│           │   └── (dashboard)/          # Protected Dashboard
│           │       ├── layout.tsx
│           │       ├── page.tsx          # Dashboard Home
│           │       ├── stores/
│           │       │   ├── page.tsx      # Store List
│           │       │   └── [storeId]/
│           │       │       └── page.tsx  # Store Detail (Tabs)
│           │       └── orders/
│           │           ├── page.tsx      # Orders List
│           │           └── failed/
│           │               └── page.tsx  # Failed Orders
│           ├── components/
│           │   ├── Sidebar.tsx
│           │   ├── ChatWidget.tsx
│           │   ├── Providers.tsx
│           │   └── stores/
│           │       ├── StoreCard.tsx
│           │       ├── AddStoreModal.tsx
│           │       ├── SyncButton.tsx
│           │       └── tabs/
│           │           ├── OverviewTab.tsx
│           │           ├── OrdersTab.tsx
│           │           ├── ProductsTab.tsx
│           │           └── SettingsTab.tsx
│           ├── lib/
│           │   ├── api.ts
│           │   └── actions.ts
│           └── middleware.ts
│
├── CLAUDE.md                             # This Documentation
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Features Implemented

### Authentication System

| Feature                   | Status | Description                            |
| ------------------------- | ------ | -------------------------------------- |
| **Email/Password Signup** | DONE   | First Name, Last Name, Email, Password |
| **Email/Password Login**  | DONE   | Email, Password with validation        |
| **Google OAuth**          | DONE   | Continue with Google button            |
| **Apple OAuth**           | DONE   | Continue with Apple button             |
| **Facebook OAuth**        | DONE   | Continue with Facebook button          |
| **NextAuth.js**           | DONE   | Session management, JWT tokens         |
| **Route Protection**      | DONE   | Middleware redirects to /login         |
| **JWT Backend Auth**      | DONE   | Passport.js + bcryptjs                 |
| **Welcome Email**         | DONE   | Sent on signup with WELCOME10 code     |

### Frontend Pages

| Page              | Route            | Features                                      |
| ----------------- | ---------------- | --------------------------------------------- |
| **Login**         | `/login`         | Social login, email/password, forgot password |
| **Signup**        | `/signup`        | Social buttons, form validation, terms link   |
| **Dashboard**     | `/`              | Stats cards, revenue chart, recent orders     |
| **Stores**        | `/stores`        | Store grid, add modal, sync buttons, status   |
| **Store Detail**  | `/stores/[id]`   | 4 tabs: Overview, Orders, Products, Settings  |
| **Orders**        | `/orders`        | Order list, filters, fulfill buttons          |
| **Failed Orders** | `/orders/failed` | Retry queue, manual/bulk retry, schedule info |

### UI Components

| Component         | Description                                     |
| ----------------- | ----------------------------------------------- |
| **Sidebar**       | Collapsible with smooth animation, nav links    |
| **ChatWidget**    | Floating AI chat bubble (Roman Urdu support)    |
| **StoreCard**     | Platform icon, status badge, stats, sync button |
| **AddStoreModal** | Step wizard: platform → credentials → test      |
| **SyncButton**    | Dropdown: Full/Orders/Products sync             |
| **OverviewTab**   | Store stats, charts, recent activity            |
| **OrdersTab**     | Orders table, bulk actions, filters             |
| **ProductsTab**   | Products grid, import from CJ                   |
| **SettingsTab**   | Credentials, auto settings, webhook repair      |

### Backend API Endpoints

#### Auth Module

| Method | Endpoint           | Description          |
| ------ | ------------------ | -------------------- |
| POST   | `/api/auth/signup` | Create new user      |
| POST   | `/api/auth/login`  | Login, get JWT token |
| POST   | `/api/auth/social` | OAuth login          |
| GET    | `/api/auth/me`     | Get current user     |

#### Stores Module

| Method | Endpoint                          | Description          |
| ------ | --------------------------------- | -------------------- |
| GET    | `/api/stores`                     | List all stores      |
| POST   | `/api/stores`                     | Add new store        |
| GET    | `/api/stores/:id`                 | Get store details    |
| PUT    | `/api/stores/:id`                 | Update store         |
| DELETE | `/api/stores/:id`                 | Remove store         |
| POST   | `/api/stores/:id/toggle`          | Toggle active status |
| GET    | `/api/stores/:id/stats`           | Get store statistics |
| POST   | `/api/stores/test-connection`     | Test credentials     |
| POST   | `/api/stores/:id/sync`            | Full sync            |
| POST   | `/api/stores/:id/sync/orders`     | Sync orders only     |
| POST   | `/api/stores/:id/sync/products`   | Sync products only   |
| GET    | `/api/stores/:id/webhooks`        | Get webhook status   |
| POST   | `/api/stores/:id/webhooks/repair` | Repair webhooks      |

#### Orders Module

| Method | Endpoint                            | Description               |
| ------ | ----------------------------------- | ------------------------- |
| GET    | `/api/orders`                       | List all orders           |
| GET    | `/api/orders/pending`               | Get pending orders        |
| GET    | `/api/orders/failed`                | Get failed orders         |
| GET    | `/api/orders/stats`                 | Order statistics          |
| POST   | `/api/orders/fulfill/:orderId`      | Fulfill single order      |
| POST   | `/api/orders/fulfill/bulk`          | Bulk fulfill orders       |
| POST   | `/api/orders/fulfill-all`           | Fulfill all pending       |
| POST   | `/api/orders/:orderId/retry`        | Manual retry failed order |
| POST   | `/api/orders/:orderId/cancel-retry` | Cancel retry queue        |
| POST   | `/api/orders/sync-tracking`         | Sync tracking numbers     |
| GET    | `/api/orders/report/daily`          | Daily report data         |

#### Webhooks Module

| Method | Endpoint                             | Description         |
| ------ | ------------------------------------ | ------------------- |
| POST   | `/api/webhooks/woocommerce/:storeId` | WooCommerce webhook |
| POST   | `/api/webhooks/shopify/:storeId`     | Shopify webhook     |
| POST   | `/api/webhooks/test/:storeId`        | Test webhook        |

#### MCP Module

| Method | Endpoint           | Description        |
| ------ | ------------------ | ------------------ |
| GET    | `/api/mcp/tools`   | List all 19 tools  |
| POST   | `/api/mcp/run`     | Execute a tool     |
| POST   | `/api/mcp/execute` | Execute (with DTO) |
| GET    | `/api/mcp/health`  | MCP health check   |

#### Chat Module

| Method | Endpoint            | Description         |
| ------ | ------------------- | ------------------- |
| POST   | `/api/chat`         | Send message to AI  |
| GET    | `/api/chat/history` | Get chat history    |
| DELETE | `/api/chat/history` | Clear chat history  |
| POST   | `/api/chat/test`    | Test chat (no auth) |

---

### AI Chat Service Architecture (Production-Ready)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI CHAT SERVICE FLOW                                 │
│                                                                              │
│  User Message                                                               │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │   Rate      │────►│  Sanitize   │────►│   Smart     │                   │
│  │   Limit     │     │   Input     │     │   Tool      │                   │
│  │  (30/min)   │     │             │     │  Selection  │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                 │                            │
│                                                 ▼                            │
│                                          ┌─────────────┐                    │
│                                          │  Groq API   │                    │
│                                          │ llama-3.3   │                    │
│                                          │  70b-vers   │                    │
│                                          └─────────────┘                    │
│                                                 │                            │
│                            ┌────────────────────┴────────────────────┐      │
│                            │                                         │      │
│                            ▼                                         ▼      │
│                   ┌─────────────────┐                      ┌─────────────┐ │
│                   │   Tool Calls?   │                      │   Direct    │ │
│                   │   - Clean Name  │                      │   Response  │ │
│                   │   - Validate    │                      │             │ │
│                   │   - Coerce Args │                      └─────────────┘ │
│                   └─────────────────┘                                       │
│                            │                                                 │
│                            ▼                                                 │
│                   ┌─────────────────┐                                       │
│                   │  MCP Service    │                                       │
│                   │  Execute Tools  │                                       │
│                   │  (19 tools)     │                                       │
│                   └─────────────────┘                                       │
│                            │                                                 │
│                            ▼                                                 │
│                   ┌─────────────────┐                                       │
│                   │ Format Response │                                       │
│                   │ 📊💰📦🏪🛍️   │                                       │
│                   └─────────────────┘                                       │
│                            │                                                 │
│                            ▼                                                 │
│                      User Response                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**

| Feature                  | Implementation                                  |
| ------------------------ | ----------------------------------------------- |
| **Rate Limiting**        | 30 requests/minute per user                     |
| **Retry Logic**          | 3 retries with exponential backoff              |
| **Timeout**              | 25s API timeout, 20s tool execution timeout     |
| **Tool Name Cleaning**   | Strips malformed names (`name={args}` → `name`) |
| **Type Coercion**        | Converts `"10"` (string) → `10` (number)        |
| **Smart Tool Selection** | Selects 1-5 relevant tools based on message     |
| **Bilingual Responses**  | Roman Urdu + English with emojis                |
| **Contextual Errors**    | Specific error messages for each failure type   |
| **Debug Logging**        | Comprehensive logs for empty data debugging     |

**Smart Tool Selection Keywords:**

| Query Type            | Tools Selected                                                |
| --------------------- | ------------------------------------------------------------- |
| "overview", "summary" | `get_business_stats`, `manage_store`, `get_all_stores_orders` |
| "orders", "pending"   | `get_pending_orders`, `get_all_stores_orders`                 |
| "stats", "revenue"    | `get_business_stats`                                          |
| "store", "dukan"      | `manage_store`                                                |
| "products", "search"  | `search_products`, `get_products`                             |

---

#### Dashboard Module

| Method | Endpoint                       | Description          |
| ------ | ------------------------------ | -------------------- |
| GET    | `/api/dashboard`               | Overview stats       |
| GET    | `/api/dashboard/recent-orders` | Recent orders        |
| GET    | `/api/dashboard/sales-chart`   | Sales chart data     |
| GET    | `/api/dashboard/top-products`  | Top selling products |
| GET    | `/api/dashboard/alerts`        | System alerts        |

---

### 19 AI Tools (MCP Service)

**Core Automation Tools:**

| #   | Tool                    | Description                    |
| --- | ----------------------- | ------------------------------ |
| 1   | `search_products`       | Search CJ Dropshipping catalog |
| 2   | `get_pending_orders`    | Get orders needing fulfillment |
| 3   | `fulfill_orders`        | Send orders to supplier        |
| 4   | `get_business_stats`    | Revenue, profit, order stats   |
| 5   | `sync_tracking`         | Sync tracking from supplier    |
| 6   | `import_product`        | Import product to store        |
| 7   | `sync_inventory`        | Sync stock levels              |
| 8   | `calculate_profit`      | Calculate profit margin        |
| 9   | `process_refund`        | Handle refund/cancellation     |
| 10  | `manage_store`          | Add/remove/list/test stores    |
| 11  | `get_all_stores_orders` | Orders across all stores       |

**Store Management Tools:**

| #   | Tool                   | Description                      |
| --- | ---------------------- | -------------------------------- |
| 12  | `get_products`         | List products with filters       |
| 13  | `update_product_price` | Update regular/sale price        |
| 14  | `get_customers`        | Customer list, top buyers        |
| 15  | `send_notification`    | Send email notifications         |
| 16  | `create_coupon`        | Create discount codes            |
| 17  | `get_shipping_rates`   | CJ shipping rates by country     |
| 18  | `bulk_import_products` | Import multiple products from CJ |
| 19  | `analytics_report`     | Sales, profit, trends reports    |

---

### Automated Cron Jobs

| Schedule                      | Task            | Description             |
| ----------------------------- | --------------- | ----------------------- |
| `0 * * * *` (Every hour)      | Auto-Fulfill    | Fulfill pending orders  |
| `0 */2 * * *` (Every 2 hours) | Sync Tracking   | Update tracking from CJ |
| `0 */6 * * *` (Every 6 hours) | Sync Inventory  | Update stock levels     |
| `*/5 * * * *` (Every 5 min)   | Process Retries | Retry failed orders     |
| `0 9 * * *` (Daily 9 AM)      | Daily Report    | Email summary           |

---

### Order Retry System

| Status       | Retry Delay | Description            |
| ------------ | ----------- | ---------------------- |
| `PENDING`    | -           | Initial state          |
| `PROCESSING` | -           | Being fulfilled        |
| `RETRY_1`    | 15 minutes  | First retry attempt    |
| `RETRY_2`    | 1 hour      | Second retry attempt   |
| `RETRY_3`    | 4 hours     | Third retry attempt    |
| `FAILED`     | Manual only | Max retries reached    |
| `FULFILLED`  | -           | Successfully fulfilled |
| `SHIPPED`    | -           | Tracking received      |

---

### Webhook System (Auto-Created)

| Event              | Platform    | Description            |
| ------------------ | ----------- | ---------------------- |
| `order.created`    | WooCommerce | New order notification |
| `order.updated`    | WooCommerce | Order status change    |
| `orders/create`    | Shopify     | New order notification |
| `orders/updated`   | Shopify     | Order status change    |
| `orders/cancelled` | Shopify     | Order cancellation     |

---

## Database Schema

```prisma
enum UserPlan {
  FREE
  PRO
  ENTERPRISE
}

enum Platform {
  WOOCOMMERCE
  SHOPIFY
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum FulfillmentStatus {
  PENDING
  PROCESSING
  RETRY_1
  RETRY_2
  RETRY_3
  FULFILLED
  FAILED
  CANCELLED
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String?
  firstName     String?
  lastName      String?
  avatar        String?
  apiKey        String    @unique @default(cuid())
  plan          UserPlan  @default(FREE)
  isVerified    Boolean   @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  stores        Store[]
  orders        Order[]
  chatMessages  ChatMessage[]
}

model Store {
  id             String    @id @default(cuid())
  userId         String
  name           String
  platform       Platform
  storeUrl       String
  consumerKey    String?   // WooCommerce
  consumerSecret String?   // WooCommerce
  accessToken    String?   // Shopify
  webhookSecret  String?
  isActive       Boolean   @default(true)
  settings       Json      @default("{}")
  lastSyncAt     DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  user           User      @relation(fields: [userId], references: [id])
  orders         Order[]
  productMappings ProductMapping[]
  webhookLogs    WebhookLog[]
}

model Order {
  id                   String            @id @default(cuid())
  userId               String
  storeId              String
  externalOrderId      String
  customerName         String?
  customerEmail        String?
  shippingAddress      Json?
  subtotal             Float
  shippingCost         Float             @default(0)
  total                Float
  profit               Float             @default(0)
  status               OrderStatus       @default(PENDING)
  fulfillmentStatus    FulfillmentStatus @default(PENDING)
  fulfillmentAttempts  Int               @default(0)
  lastFulfillmentError String?
  nextRetryAt          DateTime?
  supplierOrderId      String?
  trackingNumber       String?
  carrier              String?
  notes                String?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  user                 User              @relation(fields: [userId], references: [id])
  store                Store             @relation(fields: [storeId], references: [id])
  items                OrderItem[]
}

model OrderItem {
  id           String  @id @default(cuid())
  orderId      String
  productName  String
  sku          String?
  quantity     Int
  price        Float
  cjProductId  String?
  supplierCost Float?

  order        Order   @relation(fields: [orderId], references: [id])
}

model ProductMapping {
  id            String   @id @default(cuid())
  storeId       String
  wooProductId  Int
  wooSku        String
  cjProductId   String
  supplierPrice Float
  isTestProduct Boolean  @default(false)
  createdAt     DateTime @default(now())

  store         Store    @relation(fields: [storeId], references: [id])
}

model WebhookLog {
  id         String   @id @default(cuid())
  storeId    String
  topic      String
  deliveryId String
  payload    Json
  processed  Boolean  @default(false)
  error      String?
  createdAt  DateTime @default(now())

  store      Store    @relation(fields: [storeId], references: [id])
}

model FailedOrder {
  id              String   @id @default(cuid())
  orderId         String
  error           String
  retryCount      Int      @default(0)
  lastRetryAt     DateTime?
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())
}

model ChatMessage {
  id        String   @id @default(cuid())
  userId    String
  role      String   // user, assistant
  content   String
  toolCalls Json?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
}
```

## Environment Variables

### Backend (`apps/api/.env`)

```env
# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dropship"

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Groq AI (FREE & FAST - with Tool Calling)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile

# CJ Dropshipping
CJ_EMAIL=your-cj-email
CJ_PASSWORD=your-cj-password
CJ_SIMULATION_MODE=true   # Set false for production

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=admin@yourstore.com

# Automation
AUTO_FULFILL_ENABLED=true
AUTO_SYNC_TRACKING_ENABLED=true
AUTO_SYNC_INVENTORY_ENABLED=true
```

### Frontend (`apps/web/.env.local`)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:4000

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-secret
APPLE_ID=your-apple-id
APPLE_SECRET=your-apple-secret
```

---

## Testing Results (January 17, 2026)

### Comprehensive E2E Test - All Phases Passed

| Phase | Component          | Status | Details                             |
| ----- | ------------------ | ------ | ----------------------------------- |
| 1     | System Status      | PASS   | Backend, Frontend, PostgreSQL, Groq |
| 2     | Authentication     | PASS   | Signup, Login, JWT, /me endpoint    |
| 3     | Dashboard & Stores | PASS   | Stats, Store list, Details, Sync    |
| 4     | Order Journey      | PASS   | Simulation, Fulfillment, Tracking   |
| 5     | Retry System       | PASS   | Failed orders, Retry, Cancel retry  |
| 6     | AI Chat & MCP      | PASS   | 19 tools available, Roman Urdu chat |
| 7     | Email System       | PASS   | Notifications, Daily reports        |
| 8     | Cron Jobs          | PASS   | All scheduled tasks running         |

### API Endpoints Tested

| Endpoint                       | Method | Result |
| ------------------------------ | ------ | ------ |
| `/api/auth/signup`             | POST   | PASS   |
| `/api/auth/login`              | POST   | PASS   |
| `/api/auth/me`                 | GET    | PASS   |
| `/api/dashboard`               | GET    | PASS   |
| `/api/stores`                  | GET    | PASS   |
| `/api/stores/:id`              | GET    | PASS   |
| `/api/stores/:id/stats`        | GET    | PASS   |
| `/api/stores/:id/sync/orders`  | POST   | PASS   |
| `/api/orders`                  | GET    | PASS   |
| `/api/orders/pending`          | GET    | PASS   |
| `/api/orders/failed`           | GET    | PASS   |
| `/api/orders/:id/retry`        | POST   | PASS   |
| `/api/orders/:id/cancel-retry` | POST   | PASS   |
| `/api/orders/report/daily`     | GET    | PASS   |
| `/api/mcp/tools`               | GET    | PASS   |
| `/api/mcp/run`                 | POST   | PASS   |
| `/api/chat`                    | POST   | PASS   |
| `/api/test/status`             | GET    | PASS   |
| `/api/test/order/simulate`     | POST   | PASS   |
| `/api/test/sync/tracking`      | POST   | PASS   |

### MCP Tools Tested

| Tool                    | Status | Output Sample                     |
| ----------------------- | ------ | --------------------------------- |
| `get_business_stats`    | PASS   | Revenue: $249.98, Profit: $229.98 |
| `manage_store`          | PASS   | 1 store (Welding Jacket)          |
| `get_all_stores_orders` | PASS   | 2 orders, both SHIPPED            |
| `search_products`       | PASS   | Empty (CJ simulation mode)        |
| `analytics_report`      | PASS   | Overview report with 92% margin   |
| `send_notification`     | PASS   | Email sent successfully           |

---

## Quick Start Guide

### 1. Clone and Install

```bash
git clone <repo>
cd dropship-platform
pnpm install
```

### 2. Setup Database

```bash
cd apps/api
# Create .env with DATABASE_URL
npx prisma migrate dev
npx prisma generate
```

### 3. Configure Environment

```bash
# Copy example env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit with your values
```

### 4. Start Development

```bash
# Terminal 1: Backend
cd apps/api && pnpm dev

# Terminal 2: Frontend
cd apps/web && pnpm dev

# Optional: Database GUI
cd apps/api && npx prisma studio
```

### 5. Test the System

```bash
# Check system status
curl http://localhost:4000/api/test/status

# Test MCP tools
curl -X POST http://localhost:4000/api/mcp/run \
  -H "Content-Type: application/json" \
  -d '{"tool":"get_business_stats","params":{"period":"today"}}'
```

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `CJ_SIMULATION_MODE=false`
- [ ] Configure real OAuth credentials
- [ ] Setup SSL certificates
- [ ] Configure webhook URLs with HTTPS
- [ ] Setup database backups
- [ ] Configure monitoring/logging
- [ ] Test all cron jobs
- [ ] Verify email delivery

---

## Notes

- **AI Chat**: Uses Groq (llama-3.3-70b-versatile) - FREE, FAST, responds in Roman Urdu
- **Simulation Mode**: `CJ_SIMULATION_MODE=true` for testing without payment
- **Multi-tenant**: Each user's data is isolated
- **Webhooks**: Auto-created when store is added
- **Retry System**: 3 automatic retries (15min → 1hr → 4hr)
- **Cron Jobs**: Start automatically with backend

---

## Changelog

### January 18, 2026 - E2E Testing System & Build Fixes

- **Complete E2E Order Journey Test**: 9-phase automated testing system
  - Phase 1: Authentication & Store Setup
  - Phase 2: Order Creation via Webhook
  - Phase 3: CJ Fulfillment (Simulated)
  - Phase 4: Tracking Sync
  - Phase 5: Delivery Confirmation
  - Phase 6: Dashboard Verification
  - Phase 7: Retry System Testing
  - Phase 8: AI Chat Integration
  - Phase 9: Cleanup
- **Build Command Fixed**: Changed from `nest build` to `tsc -p tsconfig.build.json`
- **Added `tsconfig.build.json`**: Proper TypeScript build configuration
- **ChatWidget Improvements**: Multi-line input with auto-expand, proper line breaks
- **Test Results**: 45/45 tests passing (100%)

### January 18, 2026 - Production-Ready AI Chat Service

- **Malformed Tool Name Handling**: Added `cleanToolCallName()` to fix Groq sending names like `get_orders={"status":"PENDING"}` → `get_orders`
- **Comprehensive Debug Logging**: Added detailed logging in `executeToolSafe()` for debugging empty data issues
- **Stronger System Prompt**: Updated prompt with explicit "NEVER DO THIS" examples to stop AI writing `<function=name>` syntax
- **Emoji-Rich Responses**: Implemented `formatToolResultsAsResponse()` with proper formatting:
  - 📊 Business Stats with 💰 Revenue, 💵 Profit
  - 📦 Orders with status emojis (⏳ Pending, 🚚 Shipped, ✅ Delivered)
  - 🏪 Stores, 🛍️ Products, 👥 Customers
- **Contextual Error Messages**: Added `createContextualErrorResponse()` with bilingual messages (Roman Urdu + English)
- **Smart Tool Selection**: Improved `getRelevantTools()` for vague queries like "overview", "kya haal", "summary"
- **Type Coercion**: Fixed LLM sending `limit: "10"` (string) instead of `limit: 10` (number)
- **Rate Limiting**: 30 requests/minute per user
- **Retry Logic**: 3 automatic retries with exponential backoff

### January 17, 2026 - Store Management System

- Added automatic webhook setup on store creation
- Implemented order retry system (RETRY_1, RETRY_2, RETRY_3, FAILED)
- Created Store Detail page with 4 tabs (Overview, Orders, Products, Settings)
- Added Failed Orders page with manual/bulk retry
- Fixed circular dependency in WebhooksModule
- Fixed TypeScript errors in MCP tools
- Completed comprehensive E2E testing

### January 16, 2026 - Core Platform

- 19 MCP tools implemented
- AI Chat with Groq integration (llama-3.3-70b)
- Professional email templates
- WooCommerce & Shopify integrations
- Order automation with CJ Dropshipping
- Cron jobs for auto-processing

⏺ PM2 configuration added. Here's a summary:

Files Created/Modified
┌──────────────────────────────┬────────────────────────┐
│ File │ Description │
├──────────────────────────────┼────────────────────────┤
│ apps/api/ecosystem.config.js │ PM2 configuration file │
├──────────────────────────────┼────────────────────────┤
│ apps/api/logs/ │ Directory for PM2 logs │
├──────────────────────────────┼────────────────────────┤
│ apps/api/.gitignore │ Added logs/ │
├──────────────────────────────┼────────────────────────┤
│ apps/api/package.json │ Added PM2 scripts │
└──────────────────────────────┴────────────────────────┘
Available Commands

# Development (no PM2)

npm run dev

# Production (without PM2)

npm run build
npm run start:prod

# Production (with PM2) - optional

npm run pm2:start # Start with PM2
npm run pm2:start:prod # Start in production mode
npm run pm2:stop # Stop the app
npm run pm2:restart # Restart the app
npm run pm2:logs # View logs
npm run pm2:status # Check status

To Use PM2 (When Needed)

# Install PM2 globally (one time)

npm install -g pm2

# Then use the npm scripts

npm run build
npm run pm2:start:prod

# Or run directly

pm2 start ecosystem.config.js --env production
