# Dropship SaaS Platform

> AI-Powered Multi-Store Dropshipping Automation Platform

---

## Tech Stack

| Layer               | Technology                                         |
| ------------------- | -------------------------------------------------- |
| **Backend**         | NestJS + TypeScript + Prisma + PostgreSQL          |
| **Frontend**        | Next.js 14 (App Router, Server Components)         |
| **Auth (Backend)**  | JWT (Passport.js + bcryptjs)                       |
| **Auth (Frontend)** | NextAuth.js (Google, Apple, Facebook, Credentials) |
| **AI**              | Ollama (FREE llama-3.3-70b-versatile)              |
| **Integrations**    | WooCommerce, Shopify, CJ Dropshipping              |
| **Scheduler**       | @nestjs/schedule (Cron Jobs)                       |
| **Email**           | Nodemailer                                         |
| **Monorepo**        | Turborepo + pnpm                                   |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     AUTHENTICATION FLOW                              │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────────┐│    │
│  │  │  Google   │  │   Apple   │  │  Facebook │  │  Email/Password   ││    │
│  │  │   OAuth   │  │   OAuth   │  │   OAuth   │  │   (Credentials)   ││    │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────────┬─────────┘│    │
│  │        └──────────────┴──────────────┴───────────────────┘          │    │
│  │                              ↓                                       │    │
│  │                     NextAuth.js Session                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Login/Signup│  │  Dashboard  │  │ Stores Page │  │    AI Chat Widget   │ │
│  │   /login    │  │     /       │  │  /stores    │  │  (Floating Bubble)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST + JWT Token
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (NestJS :4000)                             │
│                                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   Auth   │  │   Chat   │  │  Stores  │  │  Orders  │  │ Scheduler│      │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │  │  Module  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │             │             │             │             │
│       │             ▼             │             │             │             │
│       │    ┌────────────────┐     │             │             │             │
│       │    │   MCP Service  │◄────┴─────────────┴─────────────┘             │
│       │    │  (19 AI Tools) │                                               │
│       │    └───────┬────────┘                                               │
│       │            │                                                        │
│       ▼            ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         INTEGRATIONS                                 │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐             │   │
│  │  │WooCommerce │  │  Shopify   │  │  CJ Dropshipping   │             │   │
│  │  │    API     │  │    API     │  │     (Supplier)     │             │   │
│  │  └────────────┘  └────────────┘  └────────────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ PostgreSQL │  │   ollama   │  │   SMTP     │  │ Store APIs │            │
│  │  Database  │  │lma3.2 (FREE)│  │   Email    │  │ WC/Shopify │            │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

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
│   │   │   │   ├── stores/               # Store Management
│   │   │   │   ├── orders/               # Order Processing
│   │   │   │   ├── dashboard/            # Stats & Analytics
│   │   │   │   ├── inventory/            # Stock Sync
│   │   │   │   ├── scheduler/            # Cron Jobs
│   │   │   │   └── refunds/              # Refund Handling
│   │   │   ├── integrations/
│   │   │   │   ├── woocommerce/
│   │   │   │   ├── shopify/
│   │   │   │   ├── cj-dropshipping/
│   │   │   │   └── platform/
│   │   │   └── common/
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   └── web/                              # Next.js Frontend
│       └── src/
│           ├── app/
│           │   ├── layout.tsx            # Root Layout + Providers
│           │   ├── globals.css
│           │   ├── api/auth/[...nextauth]/  # NextAuth API Routes
│           │   │   └── route.ts
│           │   ├── (auth)/               # Auth Pages (no sidebar)
│           │   │   ├── layout.tsx
│           │   │   ├── login/page.tsx    # Login with Social Buttons
│           │   │   └── signup/page.tsx   # Signup with Social Buttons
│           │   └── (dashboard)/          # Protected Dashboard
│           │       ├── layout.tsx        # Sidebar + ChatWidget
│           │       ├── page.tsx          # Dashboard Home
│           │       ├── stores/
│           │       └── orders/
│           ├── components/
│           │   ├── Sidebar.tsx           # Collapsible Sidebar
│           │   ├── ChatWidget.tsx        # AI Chat Bubble
│           │   ├── Providers.tsx         # NextAuth SessionProvider
│           │   ├── StoreCard.tsx
│           │   └── SalesChart.tsx
│           ├── lib/
│           │   ├── api.ts
│           │   ├── actions.ts
│           │   └── mock-data.ts
│           └── middleware.ts             # Auth Route Protection
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
| **Email/Password Signup** | ✅     | First Name, Last Name, Email, Password |
| **Email/Password Login**  | ✅     | Email, Password with validation        |
| **Google OAuth**          | ✅     | Continue with Google button            |
| **Apple OAuth**           | ✅     | Continue with Apple button             |
| **Facebook OAuth**        | ✅     | Continue with Facebook button          |
| **NextAuth.js**           | ✅     | Session management, JWT tokens         |
| **Route Protection**      | ✅     | Middleware redirects to /login         |
| **JWT Backend Auth**      | ✅     | Passport.js + bcryptjs                 |

### Frontend Pages

| Page              | Route             | Features                                                        |
| ----------------- | ----------------- | --------------------------------------------------------------- |
| **Login**         | `/login`          | Social login buttons, email/password form, forgot password link |
| **Signup**        | `/signup`         | Social buttons, firstname/lastname/email/password, terms link   |
| **Dashboard**     | `/`               | Stats cards, revenue chart, recent orders, store overview       |
| **Stores**        | `/stores`         | Store list with grid layout, add store modal, sync buttons      |
| **Store Detail**  | `/stores/[id]`    | Overview, orders, products, settings tabs, webhook status       |
| **Orders**        | `/orders`         | Order list, filters, fulfill buttons                            |
| **Failed Orders** | `/orders/failed`  | Retry queue, manual retry, bulk retry, retry schedule info      |

### UI Components

| Component         | Description                                       |
| ----------------- | ------------------------------------------------- |
| **Sidebar**       | Collapsible with smooth animation, nav links      |
| **ChatWidget**    | Floating AI chat bubble, message history          |
| **StoreCard**     | Store info with platform icon, stats, sync button |
| **AddStoreModal** | Step wizard: platform select, credentials, test   |
| **SyncButton**    | Dropdown with full/orders/products sync options   |
| **SalesChart**    | Revenue visualization                             |
| **Providers**     | NextAuth SessionProvider wrapper                  |

### Backend Modules

| Module        | Endpoints                                               | Description                                       |
| ------------- | ------------------------------------------------------- | ------------------------------------------------- |
| **Auth**      | POST /auth/signup, POST /auth/login, GET /auth/me       | User authentication                               |
| **Chat**      | POST /chat, GET /chat/history, DELETE /chat/history     | AI chat with Groq                                 |
| **Stores**    | GET/POST /stores, DELETE /stores/:id, POST sync         | Store management + sync + webhooks                |
| **Orders**    | GET /orders, POST /orders/fulfill/:id, GET/POST retry   | Order processing + retry system                   |
| **Webhooks**  | Auto-setup on store add, verify, repair                 | WooCommerce & Shopify webhook management          |
| **Dashboard** | GET /dashboard                                          | Stats overview                                    |
| **Inventory** | POST /inventory/sync                                    | Stock synchronization                             |
| **Scheduler** | (Background)                                            | Auto-fulfill, tracking sync, inventory, retries   |

### 19 AI Tools (MCP Service)

**Original 11 Tools:**

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

**New 8 Tools (Added January 2026):**

| #   | Tool                    | Description                                                |
| --- | ----------------------- | ---------------------------------------------------------- |
| 12  | `get_products`          | List store products with filters (search, category, status)|
| 13  | `update_product_price`  | Update product regular/sale price                          |
| 14  | `get_customers`         | Get customer list, top buyers by orders/spending           |
| 15  | `send_notification`     | Send email (custom, order confirm, shipping, delivery)     |
| 16  | `create_coupon`         | Create discount coupons (%, fixed, free shipping)          |
| 17  | `get_shipping_rates`    | Get CJ shipping rates for product to country               |
| 18  | `bulk_import_products`  | Import multiple products from CJ (by search/category)      |
| 19  | `analytics_report`      | Sales, products, customers, profit, trends reports         |

### Automated Cron Jobs

| Schedule        | Task             | Description                          |
| --------------- | ---------------- | ------------------------------------ |
| Every Hour      | Auto-fulfill     | Fulfill pending orders automatically |
| Every 2 Hours   | Sync Tracking    | Update tracking numbers from CJ      |
| Every 6 Hours   | Sync Inventory   | Update stock levels                  |
| Every 5 Minutes | Process Retries  | Retry failed orders queue            |
| Daily 9 AM      | Daily Report     | Email summary report                 |

### Webhook System (Auto-Created on Store Add)

| Event                      | Platform    | Description                         |
| -------------------------- | ----------- | ----------------------------------- |
| `order.created`            | WooCommerce | New order notification              |
| `order.updated`            | WooCommerce | Order status change                 |
| `orders/create`            | Shopify     | New order notification              |
| `orders/updated`           | Shopify     | Order status change                 |
| `orders/cancelled`         | Shopify     | Order cancellation                  |

### Order Retry System

| Status     | Retry Delay | Description                           |
| ---------- | ----------- | ------------------------------------- |
| `RETRY_1`  | 15 minutes  | First retry attempt                   |
| `RETRY_2`  | 1 hour      | Second retry attempt                  |
| `RETRY_3`  | 4 hours     | Third retry attempt                   |
| `FAILED`   | Manual      | Max retries reached, manual only      |

### Store Management Endpoints

| Method | Endpoint                           | Description                 |
| ------ | ---------------------------------- | --------------------------- |
| POST   | `/stores/:id/sync`                 | Full sync (orders+products) |
| POST   | `/stores/:id/sync/orders`          | Sync orders only            |
| POST   | `/stores/:id/sync/products`        | Sync products only          |
| GET    | `/stores/:id/webhooks`             | Get webhook status          |
| POST   | `/stores/:id/webhooks/repair`      | Repair missing webhooks     |
| GET    | `/orders/failed`                   | Get failed orders           |
| POST   | `/orders/:id/retry`                | Manual retry failed order   |
| POST   | `/orders/:id/cancel-retry`         | Cancel retry queue          |

---

## Database Schema

```prisma
// User Model
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // Hashed with bcryptjs
  name          String?
  firstName     String?
  lastName      String?
  avatar        String?
  apiKey        String    @unique @default(cuid())
  plan          UserPlan  @default(FREE)
  isVerified    Boolean   @default(false)
  lastLoginAt   DateTime?

  stores        Store[]
  orders        Order[]
  chatMessages  ChatMessage[]
}

// Store, Order, Product, ChatMessage models...
// See prisma/schema.prisma for full schema
```

---

## Commands

```bash
# Install all dependencies
pnpm install

# Start development (frontend + backend)
pnpm dev

# Start only frontend (port 3000)
pnpm dev:web

# Start only backend (port 4000)
pnpm dev:api

# Database commands
cd apps/api
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run migrations
npx prisma studio        # Open database GUI

# Build for production
pnpm build
```

---

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

# Ollama is installed on y computer i am using llama3.2 model please use it for ai chatting to mcp tools

# CJ Dropshipping
CJ_API_KEY=your-cj-api-key
CJ_EMAIL=your-cj-email

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Automation
AUTO_FULFILL_ENABLED=true
AUTO_SYNC_TRACKING_ENABLED=true
AUTO_SYNC_INVENTORY_ENABLED=true
```

### Frontend (`apps/web/.env.local`)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:4000

# Mock Mode
USE_MOCK=false

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

## OAuth Setup Guide

### Google OAuth

1. Go to https://console.developers.google.com
2. Create new project → OAuth consent screen
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID & Secret to `.env.local`

### Facebook OAuth

1. Go to https://developers.facebook.com
2. Create new app → Facebook Login
3. Add redirect URI: `http://localhost:3000/api/auth/callback/facebook`
4. Copy App ID & Secret to `.env.local`

### Apple OAuth

1. Go to https://developer.apple.com
2. Create App ID → Enable Sign in with Apple
3. Create Service ID with redirect URI
4. Copy identifiers to `.env.local`

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER AUTHENTICATION FLOW                            │
│                                                                              │
│  ┌─────────────┐                                                            │
│  │   User      │                                                            │
│  │   Opens     │                                                            │
│  │   App       │                                                            │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     MIDDLEWARE CHECK                                 │    │
│  │  Is user authenticated? (NextAuth session)                          │    │
│  └────────────────────────────┬────────────────────────────────────────┘    │
│                               │                                              │
│              ┌────────────────┴────────────────┐                            │
│              │                                 │                            │
│              ▼                                 ▼                            │
│     ┌─────────────────┐               ┌─────────────────┐                   │
│     │   NO SESSION    │               │   HAS SESSION   │                   │
│     │                 │               │                 │                   │
│     │  Redirect to    │               │  Show Dashboard │                   │
│     │    /login       │               │       /         │                   │
│     └────────┬────────┘               └─────────────────┘                   │
│              │                                                              │
│              ▼                                                              │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                      LOGIN OPTIONS                               │    │
│     │                                                                  │    │
│     │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │    │
│     │  │   Google    │  │    Apple    │  │  Facebook   │              │    │
│     │  └─────────────┘  └─────────────┘  └─────────────┘              │    │
│     │                                                                  │    │
│     │           ────── OR ──────                                       │    │
│     │                                                                  │    │
│     │  ┌─────────────────────────────────────────────────────────┐    │    │
│     │  │  Email: [________________]                               │    │    │
│     │  │  Password: [________________]                            │    │    │
│     │  │  [        Sign In        ]                               │    │    │
│     │  └─────────────────────────────────────────────────────────┘    │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                               │                                              │
│                               ▼                                              │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │              AUTHENTICATION SUCCESS                              │    │
│     │                                                                  │    │
│     │  1. NextAuth creates session                                    │    │
│     │  2. JWT token generated                                         │    │
│     │  3. Redirect to Dashboard (/)                                   │    │
│     └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

---

## 🚀 ORDER AUTOMATION SYSTEM (MVP)

### Goal

Fully automated dropshipping: Customer places order → System auto-fulfills to CJ → Tracking syncs back → Customer gets email.

### Complete Order Automation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     END-TO-END ORDER AUTOMATION FLOW                         │
│                                                                              │
│  PHASE 1: ORDER DETECTION                                                   │
│  ┌─────────────────┐         ┌─────────────────┐                           │
│  │  WooCommerce    │ ──────► │    Webhook      │ ──► Order detected        │
│  │  Order Created  │   OR    │   Endpoint      │                           │
│  └─────────────────┘         └─────────────────┘                           │
│                               ┌─────────────────┐                           │
│                               │  Cron Polling   │ ──► Every hour backup    │
│                               └─────────────────┘                           │
│                                        │                                     │
│                                        ▼                                     │
│  PHASE 2: VALIDATION & ENRICHMENT                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Validate shipping address                                         │   │
│  │  • Map WooCommerce SKU → CJ Product ID                              │   │
│  │  • Check product availability                                        │   │
│  │  • Calculate profit margins                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                        │                                     │
│                                        ▼                                     │
│  PHASE 3: CJ ORDER PLACEMENT                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CJ_SIMULATION_MODE=true  →  Simulated order (no payment)           │   │
│  │  CJ_SIMULATION_MODE=false →  Real CJ order (charges balance)        │   │
│  │                                                                      │   │
│  │  • Send order to CJ Dropshipping API                                │   │
│  │  • Receive CJ Order ID                                              │   │
│  │  • Save to database with status=PROCESSING                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                        │                                     │
│                                        ▼                                     │
│  PHASE 4: TRACKING SYNCHRONIZATION (Every 2 hours)                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Poll CJ API for tracking numbers                                 │   │
│  │  • Update database: status=SHIPPED, trackingNumber=xxx              │   │
│  │  • Push tracking to WooCommerce order                               │   │
│  │  • Update WooCommerce status to "completed"                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                        │                                     │
│                                        ▼                                     │
│  PHASE 5: CUSTOMER EMAIL NOTIFICATIONS                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📧 Order Confirmation  - When order received                       │   │
│  │  📧 Shipping Notification - When tracking available                 │   │
│  │  📧 Delivery Confirmation - When delivered                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### MCP Tools for Order Automation

The 19 MCP tools enable AI-assisted and manual control of the entire dropshipping operation:

**Core Automation Tools:**

| Tool                    | Purpose                     | Example Usage                        |
| ----------------------- | --------------------------- | ------------------------------------ |
| `manage_store`          | Add/remove/list/test stores | Connect WooCommerce or Shopify store |
| `search_products`       | Find products in CJ catalog | Search for trending products         |
| `import_product`        | Import CJ product to store  | Add product with custom price        |
| `get_pending_orders`    | Get unfulfilled orders      | See what needs processing            |
| `fulfill_orders`        | Send orders to CJ           | Auto-fulfill single or all orders    |
| `sync_tracking`         | Get tracking from CJ        | Update customers with shipping info  |
| `sync_inventory`        | Sync stock levels           | Keep store inventory accurate        |
| `get_business_stats`    | Revenue/profit analytics    | Daily, weekly, monthly stats         |
| `calculate_profit`      | Calculate margins           | Before importing a product           |
| `process_refund`        | Handle returns              | Refund or cancel orders              |
| `get_all_stores_orders` | Multi-store overview        | Aggregate order data                 |

**New Store Management Tools:**

| Tool                    | Purpose                     | Example Usage                        |
| ----------------------- | --------------------------- | ------------------------------------ |
| `get_products`          | List store products         | Filter by status, category, search   |
| `update_product_price`  | Update product pricing      | Set regular/sale prices              |
| `get_customers`         | Customer analytics          | Top buyers, total customers          |
| `send_notification`     | Email customers             | Order confirm, shipping, custom      |
| `create_coupon`         | Create discount codes       | % off, fixed, free shipping          |
| `get_shipping_rates`    | CJ shipping rates           | Get rates for product to country     |
| `bulk_import_products`  | Bulk import from CJ         | Import by search query or category   |
| `analytics_report`      | Detailed reports            | Sales, profit, trends, overview      |

### Testing the Automation (Step by Step)

```bash
# 1. Start the backend server
cd apps/api
pnpm run dev

# 2. Check system status
curl http://localhost:4000/api/test/status

# 3. Add a WooCommerce store via MCP tool
curl -X POST http://localhost:4000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"manage_store","params":{"action":"add","name":"My Store","platform":"WOOCOMMERCE","storeUrl":"https://mystore.com","consumerKey":"ck_xxx","consumerSecret":"cs_xxx"}}'

# 4. Search for products
curl -X POST http://localhost:4000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"search_products","params":{"query":"wireless earbuds","limit":5}}'

# 5. Import a product to your store
curl -X POST http://localhost:4000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"import_product","params":{"cjProductId":"xxx","sellingPrice":29.99,"title":"Premium Wireless Earbuds"}}'

# 6. Get pending orders
curl -X POST http://localhost:4000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"get_pending_orders","params":{}}'

# 7. Fulfill orders (simulation mode)
curl -X POST http://localhost:4000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"fulfill_orders","params":{"all":true}}'

# 8. Sync tracking numbers
curl -X POST http://localhost:4000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"sync_tracking","params":{}}'

# 9. Get business stats
curl -X POST http://localhost:4000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"get_business_stats","params":{"period":"today"}}'
```

### Webhook Configuration (WooCommerce)

1. Go to WooCommerce → Settings → Advanced → Webhooks
2. Add new webhook:
   - **Name**: Order Created
   - **Status**: Active
   - **Topic**: Order created
   - **Delivery URL**: `https://your-api.com/api/webhooks/woocommerce/{storeId}`
   - **Secret**: Generate and save (used for signature verification)
3. Repeat for "Order updated" topic

### Environment Variables for Order Automation

```env
# CJ Dropshipping
CJ_API_KEY=your-cj-api-key
CJ_EMAIL=your-cj-email
CJ_PASSWORD=your-cj-password

# CRITICAL: Simulation Mode (for testing without real payments)
CJ_SIMULATION_MODE=true   # Set to 'false' for production

# Automation Control
AUTO_FULFILL_ENABLED=true        # Auto-fulfill every hour
AUTO_SYNC_TRACKING_ENABLED=true  # Sync tracking every 2 hours
AUTO_SYNC_INVENTORY_ENABLED=true # Sync stock every 6 hours

# Notifications
NOTIFICATION_EMAIL=admin@yourstore.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Database Models for Order Automation

```prisma
// Product mapping for SKU → CJ Product ID
model ProductMapping {
  id            String   @id
  storeId       String
  wooProductId  Int      // WooCommerce product ID
  wooSku        String   // WooCommerce SKU
  cjProductId   String   // CJ Product/Variant ID
  supplierPrice Float    // Cost from CJ
  isTestProduct Boolean  // Flag for test products
}

// Webhook event logging
model WebhookLog {
  id         String   @id
  storeId    String
  topic      String   // order.created, order.updated
  deliveryId String   // Unique webhook delivery ID
  payload    Json     // Full webhook payload
  processed  Boolean  // Was it processed successfully?
  error      String?  // Error message if failed
}
```

### Cron Job Schedule

| Schedule                      | Job            | Function                                  |
| ----------------------------- | -------------- | ----------------------------------------- |
| `0 * * * *` (Every hour)      | Auto-Fulfill   | `ordersService.fulfillAllPendingOrders()` |
| `0 */2 * * *` (Every 2 hours) | Sync Tracking  | `ordersService.syncTrackingNumbers()`     |
| `0 */6 * * *` (Every 6 hours) | Sync Inventory | `inventoryService.syncAllInventory()`     |
| `0 9 * * *` (Daily 9 AM)      | Daily Report   | Email summary to admin                    |

---

## What's Next?

### ✅ Completed (Session: January 16, 2026)

1. [x] Database schema with Order, OrderItem, ProductMapping, WebhookLog
2. [x] CJ Dropshipping integration with simulation mode
3. [x] Webhook endpoints for WooCommerce
4. [x] Order fulfillment flow (webhook → CJ → tracking)
5. [x] Customer email notifications (Thank you + Shipping)
6. [x] **19 MCP tools total** (11 original + 8 new tools)
7. [x] Cron jobs for auto-processing
8. [x] **Fixed MCP tool execution endpoint** (JSON body parsing issue)
9. [x] **AI Chat with Ollama llama3.2** working
10. [x] **Store connection test** before adding (WooCommerce + Shopify)
11. [x] **Thank you email** sent to customer on order received
12. [x] **E2E test passed**: Order → CJ Fulfillment → Tracking Sync → Email
13. [x] **8 New MCP Tools Added**:
    - `get_products` - List products with filters
    - `update_product_price` - Update pricing
    - `get_customers` - Customer analytics
    - `send_notification` - Email notifications
    - `create_coupon` - Discount codes
    - `get_shipping_rates` - CJ shipping rates
    - `bulk_import_products` - Bulk import from CJ
    - `analytics_report` - Detailed business reports

### ✅ Bug Fixes & Testing (January 16, 2026 - Evening Session)

**Frontend-Backend Connection Fixes:**
1. [x] Fixed API URL prefix issue - Frontend was calling `/stores` instead of `/api/stores`
2. [x] Fixed `actions.ts` - Updated to use `NEXT_PUBLIC_API_URL` with `/api` prefix
3. [x] Fixed `api.ts` - `USE_MOCK` was hardcoded to `true`, now reads from env
4. [x] Added `Test Connection` button to Add Store form

**Missing Service Methods Added:**
5. [x] WooCommerce: `getCustomers()`, `createCoupon()`, `updateProduct()`
6. [x] CJ Dropshipping: `getShippingRates()`, `getProductsByCategory()`

**SMTP Email Configuration:**
7. [x] Configured Gmail SMTP with App Password
8. [x] Email sending tested and working

**All APIs Tested:**
- [x] Auth (signup/login) - Working
- [x] Dashboard - Working
- [x] Stores CRUD - Working
- [x] Test Connection - Working
- [x] AI Chat (Ollama) - Working
- [x] MCP Tools (19 tools) - All working
- [x] Email Notifications - Working

### ✅ Professional Email Notification System (January 16, 2026 - Night Session)

**Beautiful Email Templates Created:**
- [x] `Order Received` - Thank you email with order details, progress steps
- [x] `Order Processing` - "We're working on it" with visual progress tracker
- [x] `Order Shipped` - Tracking number, tracking link, carrier info
- [x] `Order Delivered` - Review request with star ratings, shop again CTA
- [x] `Welcome Email` - New user welcome with discount code WELCOME10

**Integration Points:**
- [x] Auth signup → Welcome email automatically sent
- [x] Order received → Order confirmation email to customer
- [x] Tracking synced → Shipping notification email
- [x] Social login → Welcome email for new users

**Email Features:**
- Professional Shopify/Amazon-style design
- Responsive for mobile devices
- Works on Gmail, Outlook, Apple Mail
- Progress trackers for order status
- Tracking links (17Track, Parcels)
- Review request with star rating buttons
- Discount code for new users

### 📋 Next Steps (Priority Order)

1. [x] **Test from Web Frontend** - Backend APIs tested via curl (all working)
2. [x] **Connect Real WooCommerce Store** - welding-jacket.com connected
3. [ ] **Configure WooCommerce Webhook** - Point to `/api/webhooks/woocommerce/{storeId}`
4. [ ] **Import Real Product** - Map CJ product to WooCommerce product
5. [ ] **Place Test Order** - Place real order and verify automation
6. [x] **Verify Customer Email** - SMTP configured and emails working
7. [ ] **Production Deployment** - Set CJ_SIMULATION_MODE=false

### 🔧 Features Added This Session

| Feature | Description | Files Changed |
|---------|-------------|---------------|
| **MCP Body Parsing Fix** | Fixed JSON body not parsing for /api/mcp/execute | `main.ts`, `mcp.controller.ts` |
| **Store Connection Test** | Test WooCommerce/Shopify credentials before adding store | `manage-store.tool.ts`, `woocommerce.service.ts`, `shopify.service.ts` |
| **Thank You Email** | Send order confirmation email to customer when order received | `orders.service.ts` |
| **AI Chat with Ollama** | Chat service integrated with local Ollama llama3.2 | `chat.service.ts` |
| **Test Chat Endpoint** | Public `/api/chat/test` for development testing | `chat.controller.ts` |
| **8 New MCP Tools** | Complete store management and analytics tools | See new tools below |

### 🛠 New MCP Tools Details

**get_products** - List store products
```bash
curl -X POST http://localhost:4000/api/mcp/run -H "Content-Type: application/json" \
  -d '{"tool":"get_products","params":{"search":"shirt","status":"publish","limit":10}}'
```

**update_product_price** - Update pricing
```bash
curl -X POST http://localhost:4000/api/mcp/run -H "Content-Type: application/json" \
  -d '{"tool":"update_product_price","params":{"productId":123,"regularPrice":29.99,"salePrice":19.99}}'
```

**get_customers** - Customer analytics
```bash
curl -X POST http://localhost:4000/api/mcp/run -H "Content-Type: application/json" \
  -d '{"tool":"get_customers","params":{"orderBy":"spent","limit":10}}'
```

**send_notification** - Email notifications
```bash
curl -X POST http://localhost:4000/api/mcp/run -H "Content-Type: application/json" \
  -d '{"tool":"send_notification","params":{"orderId":"order-id","type":"shipping_update","trackingNumber":"TRK123"}}'
```

**create_coupon** - Discount codes
```bash
curl -X POST http://localhost:4000/api/mcp/run -H "Content-Type: application/json" \
  -d '{"tool":"create_coupon","params":{"code":"SAVE20","discountType":"percent","amount":20,"expiryDate":"2026-12-31"}}'
```

**get_shipping_rates** - CJ shipping rates
```bash
curl -X POST http://localhost:4000/api/mcp/run -H "Content-Type: application/json" \
  -d '{"tool":"get_shipping_rates","params":{"productId":"cj-product-id","country":"US","quantity":2}}'
```

**bulk_import_products** - Bulk import from CJ
```bash
curl -X POST http://localhost:4000/api/mcp/run -H "Content-Type: application/json" \
  -d '{"tool":"bulk_import_products","params":{"searchQuery":"wireless earbuds","limit":10,"priceMultiplier":2.5,"status":"draft"}}'
```

**analytics_report** - Detailed reports
```bash
curl -X POST http://localhost:4000/api/mcp/run -H "Content-Type: application/json" \
  -d '{"tool":"analytics_report","params":{"reportType":"overview","period":"month"}}'
```

### 📊 Testing Commands

```bash
# Test store connection
curl -X POST http://localhost:4000/api/mcp/run -H "Content-Type: application/json" \
  -d '{"tool":"manage_store","params":{"action":"test","platform":"WOOCOMMERCE","storeUrl":"https://yourstore.com","consumerKey":"ck_xxx","consumerSecret":"cs_xxx"}}'

# Chat with AI
curl -X POST http://localhost:4000/api/chat/test -H "Content-Type: application/json" \
  -d '{"message":"Show me pending orders"}'

# Run E2E test
curl -X POST http://localhost:4000/api/test/e2e/full-flow -H "Content-Type: application/json" \
  -d '{"storeId":"your-store-id"}'
```

---

## Notes

CJ Dropshipping API Documentation:
https://developers.cjdropshipping.com/en/api/introduction.html

- Roman Urdu mein baat karo (AI supports it)
- Ollama with llama3.2 for local AI chat
- CJ_SIMULATION_MODE=true for testing without payment
- Each user's data is isolated (multi-tenant)
- Cron jobs run automatically when backend starts
- Simulated orders get tracking after 2+ minutes
