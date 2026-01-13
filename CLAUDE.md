# Dropship SaaS Platform

> AI-Powered Multi-Store Dropshipping Automation Platform

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS + TypeScript + Prisma + PostgreSQL |
| **Frontend** | Next.js 14 (App Router, Server Components) |
| **Auth (Backend)** | JWT (Passport.js + bcryptjs) |
| **Auth (Frontend)** | NextAuth.js (Google, Apple, Facebook, Credentials) |
| **AI** | Groq SDK (FREE llama-3.3-70b-versatile) |
| **Integrations** | WooCommerce, Shopify, CJ Dropshipping |
| **Scheduler** | @nestjs/schedule (Cron Jobs) |
| **Email** | Nodemailer |
| **Monorepo** | Turborepo + pnpm |

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
│       │    │  (11 AI Tools) │                                               │
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
│  │ PostgreSQL │  │   Groq AI  │  │   SMTP     │  │ Store APIs │            │
│  │  Database  │  │   (FREE)   │  │   Email    │  │ WC/Shopify │            │
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
│   │   │   │   ├── mcp/                  # 11 Automation Tools
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

| Feature | Status | Description |
|---------|--------|-------------|
| **Email/Password Signup** | ✅ | First Name, Last Name, Email, Password |
| **Email/Password Login** | ✅ | Email, Password with validation |
| **Google OAuth** | ✅ | Continue with Google button |
| **Apple OAuth** | ✅ | Continue with Apple button |
| **Facebook OAuth** | ✅ | Continue with Facebook button |
| **NextAuth.js** | ✅ | Session management, JWT tokens |
| **Route Protection** | ✅ | Middleware redirects to /login |
| **JWT Backend Auth** | ✅ | Passport.js + bcryptjs |

### Frontend Pages

| Page | Route | Features |
|------|-------|----------|
| **Login** | `/login` | Social login buttons, email/password form, forgot password link |
| **Signup** | `/signup` | Social buttons, firstname/lastname/email/password, terms link |
| **Dashboard** | `/` | Stats cards, revenue chart, recent orders, store overview |
| **Stores** | `/stores` | Store list, add store button, store cards |
| **Store Detail** | `/stores/[id]` | Store stats, orders, products, settings tabs |
| **Orders** | `/orders` | Order list, filters, fulfill buttons |

### UI Components

| Component | Description |
|-----------|-------------|
| **Sidebar** | Collapsible with smooth animation, nav links |
| **ChatWidget** | Floating AI chat bubble, message history |
| **StoreCard** | Store info with platform icon, stats |
| **SalesChart** | Revenue visualization |
| **Providers** | NextAuth SessionProvider wrapper |

### Backend Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | POST /auth/signup, POST /auth/login, GET /auth/me | User authentication |
| **Chat** | POST /chat, GET /chat/history, DELETE /chat/history | AI chat with Groq |
| **Stores** | GET/POST /stores, DELETE /stores/:id | Store management |
| **Orders** | GET /orders, POST /orders/fulfill/:id | Order processing |
| **Dashboard** | GET /dashboard | Stats overview |
| **Inventory** | POST /inventory/sync | Stock synchronization |
| **Scheduler** | (Background) | Auto-fulfill, tracking sync, inventory sync |

### 11 AI Tools (MCP Service)

| # | Tool | Description |
|---|------|-------------|
| 1 | `search_products` | Search CJ Dropshipping catalog |
| 2 | `get_pending_orders` | Get orders needing fulfillment |
| 3 | `fulfill_orders` | Send orders to supplier |
| 4 | `get_business_stats` | Revenue, profit, order stats |
| 5 | `sync_tracking` | Sync tracking from supplier |
| 6 | `import_product` | Import product to store |
| 7 | `sync_inventory` | Sync stock levels |
| 8 | `calculate_profit` | Calculate profit margin |
| 9 | `process_refund` | Handle refund/cancellation |
| 10 | `manage_store` | Add/remove/list stores |
| 11 | `get_all_stores_orders` | Orders across all stores |

### Automated Cron Jobs

| Schedule | Task | Description |
|----------|------|-------------|
| Every Hour | Auto-fulfill | Fulfill pending orders automatically |
| Every 2 Hours | Sync Tracking | Update tracking numbers from CJ |
| Every 6 Hours | Sync Inventory | Update stock levels |
| Daily 9 AM | Daily Report | Email summary report |

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

# Groq AI (FREE)
GROQ_API_KEY=gsk_xxxxx

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

## What's Next?

### Immediate (To Test)
1. [ ] Setup PostgreSQL database
2. [ ] Run Prisma migrations
3. [ ] Start backend server
4. [ ] Test signup/login flow
5. [ ] Test AI chat functionality

### High Priority
1. [ ] Add OAuth credentials (Google, Facebook, Apple)
2. [ ] Connect real WooCommerce/Shopify store
3. [ ] Test order fulfillment flow
4. [ ] Add auth guards to all backend routes

### Medium Priority
1. [ ] Product import page (CJ → Store)
2. [ ] Detailed analytics page
3. [ ] User settings page
4. [ ] Password reset flow

### Nice to Have
1. [ ] Dark mode toggle
2. [ ] Export data (CSV/PDF)
3. [ ] In-app notifications
4. [ ] Mobile responsive improvements

---

## Notes

- Roman Urdu mein baat karo (AI supports it)
- Groq API FREE hai: 6000 requests/day
- USE_MOCK=true for testing without backend
- Each user's data is isolated (multi-tenant)
- Cron jobs run automatically when backend starts
