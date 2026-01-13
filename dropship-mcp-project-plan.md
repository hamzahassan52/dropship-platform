# Dropship MCP Platform

> **Version:** 1.0
> **Last Updated:** January 9, 2026
> **Status:** Planning Phase

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Target Audience](#target-audience)
3. [Core Features](#core-features)
4. [Tech Stack](#tech-stack)
5. [System Architecture](#system-architecture)
6. [Data Sources](#data-sources)
7. [MCP Tools](#mcp-tools)
8. [REST API Endpoints](#rest-api-endpoints)
9. [Database Schema](#database-schema)
10. [Project Structure](#project-structure)
11. [AWS Deployment](#aws-deployment)
12. [Monetization](#monetization)
13. [Implementation Phases](#implementation-phases)

---

## Project Overview

### What is this?

An AI-powered MCP (Model Context Protocol) server for dropshipping automation. Users interact with Claude Code using natural language to search products, analyze suppliers, place orders, and manage their dropshipping business.

### Unique Value Proposition

```
Traditional Tools:  Click → Filter → Browse → Copy → Calculate → 30-60 min
Our MCP Server:     "Find trending phone cases under $5" → 5 seconds
```

### Key Differentiators

| Feature | Traditional | Our MCP |
|---------|-------------|---------|
| Product Search | 10+ filter clicks | Natural language |
| Supplier Analysis | Manual review reading | AI score 0-100 |
| Profit Calculation | Excel spreadsheet | Instant calculation |
| Bulk Operations | One by one | Single command |

---

## Target Audience

| Segment | Description | Primary Need |
|---------|-------------|--------------|
| **Solo Dropshippers** | Individual entrepreneurs | Time-saving automation |
| **Small Agencies** | 2-10 people teams | Multi-client management |
| **Power Sellers** | High volume sellers | Bulk operations |
| **E-commerce Developers** | Build stores for clients | Fast product research |

---

## Core Features

### MCP Tools (Claude Integration)

| Tool | Description | Example Command |
|------|-------------|-----------------|
| `search_products` | Natural language product search | "Find phone cases under $5" |
| `get_product_details` | Detailed product information | "Show details for this product" |
| `calculate_profit` | Profit margin calculator | "Profit if I sell at $15?" |
| `analyze_supplier` | AI supplier reliability score | "Is this supplier reliable?" |
| `place_order` | Automated order placement | "Place this order" |
| `track_shipment` | Real-time shipment tracking | "Where is order #123?" |

### Web Dashboard Features

- Product search & management
- Order tracking & history
- Supplier analytics
- Revenue reports
- Store integrations (Shopify, WooCommerce)

### Automation Workflows

```
Order Processing:
Customer Order → Auto Supplier Order → Tracking Update → Delivery Notification

Stock Management:
Low Stock Alert → Find Alternative Supplier → Price Compare → Auto Switch
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 + Tailwind + shadcn/ui | Web dashboard |
| **Backend** | NestJS + TypeScript | API + MCP Server |
| **MCP SDK** | @anthropic-ai/claude-agent-sdk | Claude integration |
| **Database** | PostgreSQL + Prisma | Primary data store |
| **Cache** | Redis | Caching + job queues |
| **Queue** | BullMQ | Background jobs |
| **Storage** | AWS S3 | Images & files |
| **Auth** | JWT + Passport | Authentication |
| **Hosting** | AWS ECS Fargate | Container hosting |
| **CDN** | CloudFront | Static assets |
| **CI/CD** | GitHub Actions | Automation |
| **Monorepo** | Turborepo + pnpm | Code management |
| **Mobile** | Flutter | Future mobile app |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DROPSHIP MCP PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CLIENT LAYER                                                                │
│  ┌───────────────┬───────────────┬───────────────┬───────────────┐         │
│  │    Next.js    │    Flutter    │  Claude Code  │  Third-party  │         │
│  │   (Web App)   │ (Mobile App)  │    (CLI)      │     Apps      │         │
│  └───────┬───────┴───────┬───────┴───────┬───────┴───────┬───────┘         │
│          │               │               │               │                  │
│          ▼               ▼               ▼               ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      API GATEWAY (AWS)                               │   │
│  │         Rate Limiting • JWT Auth • Routing • SSL                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  APPLICATION LAYER                 ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      NestJS + TypeScript                             │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐          │   │
│  │  │     REST API MODULE     │  │    MCP SERVER MODULE    │          │   │
│  │  │                         │  │                         │          │   │
│  │  │  • Auth Controller      │  │  • search_products      │          │   │
│  │  │  • Products Controller  │  │  • get_product_details  │          │   │
│  │  │  • Orders Controller    │  │  • calculate_profit     │          │   │
│  │  │  • Analytics Controller │  │  • analyze_supplier     │          │   │
│  │  │  • Stores Controller    │  │  • place_order          │          │   │
│  │  │  • Suppliers Controller │  │  • track_shipment       │          │   │
│  │  └─────────────────────────┘  └─────────────────────────┘          │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    SHARED SERVICES                           │   │   │
│  │  │  ProductService • OrderService • SupplierService • Pricing  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    INTEGRATIONS                              │   │   │
│  │  │  CJ Dropshipping • AliExpress • Shopify • Stripe            │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  DATA LAYER                        ▼                                        │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐                 │
│  │ PostgreSQL  │    Redis    │     S3      │Elasticsearch│                 │
│  │  (Primary)  │   (Cache)   │  (Storage)  │  (Search)   │                 │
│  └─────────────┴─────────────┴─────────────┴─────────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Sources

### Decision: Official APIs Only (No Web Scraping)

| Platform | API Type | Cost | Priority |
|----------|----------|------|----------|
| **CJ Dropshipping** | Official API | FREE | Primary |
| **AliExpress** | Affiliate API | FREE | Secondary |
| **Alibaba** | Open Platform | FREE | Future |
| **Amazon** | Rainforest API | $50/mo | Future |

### CJ Dropshipping API (Primary)

```
Features:
├── 500,000+ products
├── Real-time inventory
├── Auto order placement
├── Built-in tracking
└── FREE access

Endpoints:
├── POST /product/list         → Product search
├── GET  /product/query        → Product details
├── POST /shopping/order/create → Create order
└── GET  /logistics/tracking   → Track shipment
```

---

## MCP Tools

### Tool Specifications

| Tool | Parameters | Description |
|------|------------|-------------|
| `search_products` | query, minPrice, maxPrice, minRating, category, limit | Natural language product search |
| `get_product_details` | productId, includeSupplier | Get detailed product info |
| `calculate_profit` | productId, sellingPrice, shippingToCustomer | Calculate profit margins |
| `analyze_supplier` | supplierId | AI analysis of supplier reliability |
| `place_order` | productId, quantity, shippingAddress, variant | Place order with supplier |
| `track_shipment` | orderId | Track order shipment status |

---

## REST API Endpoints

```
BASE URL: /api/v1

AUTH
├── POST   /auth/register           Register new user
├── POST   /auth/login              Login user
├── POST   /auth/refresh            Refresh token
└── GET    /auth/me                 Get current user

PRODUCTS
├── POST   /products/search         Search products
├── GET    /products/:id            Get product details
├── GET    /products/trending       Get trending products
├── POST   /products/bulk-search    Bulk search
└── POST   /products/calculate      Calculate profit

SUPPLIERS
├── GET    /suppliers/:id           Get supplier details
├── GET    /suppliers/:id/analyze   AI analysis
└── GET    /suppliers/:id/products  Supplier products

ORDERS
├── GET    /orders                  List orders
├── POST   /orders                  Create order
├── GET    /orders/:id              Get order details
├── GET    /orders/:id/track        Track shipment
└── POST   /orders/:id/cancel       Cancel order

STORES
├── GET    /stores                  List stores
├── POST   /stores                  Connect store
├── GET    /stores/:id              Get store details
├── POST   /stores/:id/import       Import product
└── POST   /stores/:id/sync         Sync inventory

ANALYTICS
├── GET    /analytics/dashboard     Dashboard stats
├── GET    /analytics/revenue       Revenue reports
├── GET    /analytics/products      Product performance
└── GET    /analytics/trends        Market trends
```

---

## Database Schema

### Entity Relationship

```
USERS
├── id (PK)
├── email
├── password_hash
├── api_key
├── plan (FREE/PRO/AGENCY/ENTERPRISE)
└── created_at

STORES
├── id (PK)
├── user_id (FK → Users)
├── name
├── platform (SHOPIFY/WOOCOMMERCE/EBAY)
├── platform_api_key
└── store_url

PRODUCTS
├── id (PK)
├── external_id
├── source (CJ_DROPSHIPPING/ALIEXPRESS)
├── title
├── description
├── images[]
├── supplier_price
├── shipping_cost
├── category
├── supplier_id (FK → Suppliers)
├── rating
├── order_count
└── created_at

SUPPLIERS
├── id (PK)
├── external_id
├── source
├── name
├── rating
├── response_rate
├── ship_on_time
├── dispute_rate
└── trust_score (AI Generated 0-100)

STORE_PRODUCTS
├── id (PK)
├── store_id (FK → Stores)
├── product_id (FK → Products)
├── selling_price
├── compare_price
└── status (DRAFT/ACTIVE/PAUSED)

ORDERS
├── id (PK)
├── user_id (FK → Users)
├── store_id (FK → Stores)
├── customer_email
├── shipping_address (JSON)
├── subtotal
├── shipping_cost
├── total
├── profit
├── status (PENDING/PAID/SHIPPED/DELIVERED)
├── supplier_order_id
├── tracking_number
└── created_at

ORDER_ITEMS
├── id (PK)
├── order_id (FK → Orders)
├── product_title
├── quantity
├── unit_price
├── supplier_price
└── supplier_product_id
```

---

## Project Structure

```
dropship-platform/
│
├── apps/
│   ├── api/                              # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── products/
│   │   │   │   ├── orders/
│   │   │   │   ├── suppliers/
│   │   │   │   ├── stores/
│   │   │   │   ├── analytics/
│   │   │   │   └── mcp/
│   │   │   │       └── tools/
│   │   │   │           ├── search-products.tool.ts
│   │   │   │           ├── get-product-details.tool.ts
│   │   │   │           ├── calculate-profit.tool.ts
│   │   │   │           ├── analyze-supplier.tool.ts
│   │   │   │           ├── place-order.tool.ts
│   │   │   │           └── track-shipment.tool.ts
│   │   │   ├── integrations/
│   │   │   │   ├── cj-dropshipping/
│   │   │   │   ├── aliexpress/
│   │   │   │   ├── shopify/
│   │   │   │   └── stripe/
│   │   │   ├── database/
│   │   │   │   └── prisma/
│   │   │   └── common/
│   │   └── package.json
│   │
│   ├── web/                              # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   └── (dashboard)/
│   │   │   │       ├── products/
│   │   │   │       ├── orders/
│   │   │   │       ├── suppliers/
│   │   │   │       ├── analytics/
│   │   │   │       └── settings/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   ├── products/
│   │   │   │   ├── orders/
│   │   │   │   └── layout/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   └── mobile/                           # Flutter (Future)
│
├── packages/
│   ├── types/                            # Shared TypeScript types
│   ├── utils/                            # Shared utilities
│   └── config/                           # Shared configs
│
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## AWS Deployment

```
                              Route 53 (DNS)
                                   │
                              CloudFront (CDN)
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
               S3 Bucket     Application      S3 Bucket
              (Next.js)     Load Balancer     (Assets)
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
               ECS Task 1    ECS Task 2    ECS Task N
              (NestJS API)  (NestJS API)  (NestJS API)
                    │              │              │
                    └──────────────┼──────────────┘
                                   │
            ┌──────────────┬───────┴───────┬──────────────┐
            │              │               │              │
           RDS        ElastiCache         S3          Secrets
       (PostgreSQL)    (Redis)        (Storage)      Manager
```

### Estimated Monthly Costs

| Service | Cost |
|---------|------|
| ECS Fargate | $50-150 |
| RDS PostgreSQL | $30-100 |
| ElastiCache Redis | $20-50 |
| S3 + CloudFront | $15-50 |
| Other (ALB, Route53, etc.) | $30 |
| **Total** | **$150-400** |

---

## Monetization

### Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 50 searches/month, basic features |
| **Pro** | $29/mo | Unlimited searches, automation |
| **Agency** | $99/mo | Multi-store, team access, API |
| **Enterprise** | Custom | White-label, dedicated support |

### Revenue Streams

| Stream | Percentage |
|--------|------------|
| Subscriptions | 60% |
| Affiliate Commissions | 25% |
| API Access | 10% |
| Consulting | 5% |

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Monorepo setup (Turborepo + pnpm)
- [ ] NestJS backend scaffold
- [ ] CJ Dropshipping API integration
- [ ] `search_products` MCP tool
- [ ] `get_product_details` MCP tool
- [ ] PostgreSQL + Prisma setup

### Phase 2: Core Features (Week 3-4)
- [ ] `calculate_profit` tool
- [ ] `analyze_supplier` tool
- [ ] Redis caching
- [ ] Basic REST API endpoints
- [ ] JWT authentication

### Phase 3: Advanced Features (Week 5-6)
- [ ] `place_order` tool
- [ ] `track_shipment` tool
- [ ] Next.js dashboard (basic)
- [ ] Testing & documentation

### Phase 4: Launch Prep (Week 7-8)
- [ ] AWS deployment
- [ ] CI/CD pipeline
- [ ] Monitoring & logging
- [ ] Beta testing
- [ ] Documentation

---

## Quick Start (Future)

```bash
# Clone repository
git clone https://github.com/username/dropship-platform.git

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Start development
pnpm dev

# Add MCP server to Claude Code
claude mcp add dropship ./apps/api/dist/mcp
```

---

## Why This Project is Worth Building

### Market Assessment

| Factor | Score | Reason |
|--------|-------|--------|
| Market Size | 8/10 | Dropshipping $200B+ industry |
| Competition | 5/10 | No AI-powered CLI tool exists |
| Uniqueness | 9/10 | MCP + AI approach is completely new |
| Technical Feasibility | 9/10 | Skills match requirements |
| Time Investment | 6-8 weeks | MVP ready |
| Revenue Potential | 7/10 | Multiple streams possible |

### Key Differentiator

```
Traditional Tools (Oberlo, DSers, Spocket):
├── Manual product search (filters)
├── Manual supplier checking
├── Manual price calculation
├── Copy-paste product details
├── GUI-based (click click click)
└── TIME: 30-60 minutes per task

Our MCP Server:
├── Natural language search
├── AI supplier scoring
├── AI trend prediction
├── AI listing generation
├── CLI-based (developers love it)
└── TIME: 5-30 seconds per task
```

---

## AI-Powered Features (Game Changers)

### 1. Natural Language Product Search

```
Traditional: Open website → Click category → Set 10 filters → Browse pages
TIME: 15-20 minutes

AI-Powered:
User: "Find trending pet products under $10 with 4+ rating and free US shipping"
Claude: Here are 20 products matching your criteria...
TIME: 5 seconds
```

### 2. AI Supplier Reliability Score

```
Traditional: Read 50+ reviews manually, check metrics, make mental judgment
TIME: 10-15 minutes per supplier

AI-Powered:
User: "Is this supplier reliable?"
Claude:
├── Trust Score: 87/100 ✅
├── Strengths: 98% positive reviews, ships within 24 hours
├── Weaknesses: Slow response (48 hours avg)
└── Recommendation: SAFE TO USE
TIME: 3 seconds
```

### 3. AI Trend Prediction

```
Traditional: Guess based on feeling, check Google Trends manually
ACCURACY: Low

AI-Powered:
User: "What products will trend next month in US?"
Claude:
├── 🔥 HIGH: Winter accessories (+340% search increase)
├── 📈 RISING: Smart home devices
└── 📉 DECLINING: Summer items
Based on: Search trends, seasonal data, market analysis
```

### 4. AI Listing Generator

```
Traditional: Copy supplier description, rewrite manually, think about SEO
TIME: 20-30 minutes per product

AI-Powered:
User: "Generate listing for this phone case"
Claude:
├── SEO Title: "Premium Shockproof iPhone 15 Case | Military-Grade..."
├── Description: Professional copywriting
├── Bullet Points: Feature highlights
└── Keywords: SEO optimized
TIME: 5 seconds
```

### 5. AI Profit Optimizer

```
Traditional: Check competitor prices manually, use calculator, guess margin
ACCURACY: Often wrong

AI-Powered:
User: "What's the best price for this product?"
Claude:
├── Costs: $6.70 (supplier + shipping + fees)
├── Competitor prices: $12.99 - $15.99
├── Suggested price: $13.99
├── Your profit: $7.29 (52% margin)
└── Market position: Below average (competitive)
```

### 6. AI Bulk Operations

```
Traditional: Process one product at a time
TIME: 5-10 minutes per product (50 products = 4+ hours)

AI-Powered:
User: "Find 50 trending products in home decor, calculate profits, prepare Shopify import"
Claude:
├── Products found: 50
├── Avg profit: $5.67 per item
└── Shopify CSV ready
TIME: 30 seconds for 50 products
```

### 7. AI Market Research

```
Traditional: Google searches, multiple websites, manual data collection
TIME: Hours to days

AI-Powered:
User: "Analyze pet products market in Germany"
Claude:
├── Market Size: €5.2B
├── Growth: +8% YoY
├── Top Categories: Dog accessories (35%), Cat products (28%)
├── Trending: Smart pet feeders (+45% growth)
└── Recommendation: Focus on smart pet tech
TIME: 10 seconds
```

---

## Feature Comparison vs Competitors

| Feature | Oberlo/DSers | Spocket | Our MCP |
|---------|--------------|---------|---------|
| Natural Language Search | ❌ | ❌ | ✅ |
| AI Supplier Scoring | ❌ | Basic | ✅ Advanced |
| AI Trend Prediction | ❌ | ❌ | ✅ |
| AI Listing Generator | ❌ | ❌ | ✅ |
| AI Profit Optimizer | ❌ | Basic | ✅ Advanced |
| Bulk AI Operations | ❌ | ❌ | ✅ |
| AI Market Research | ❌ | ❌ | ✅ |
| CLI/Developer Friendly | ❌ | ❌ | ✅ |
| Claude Integration | ❌ | ❌ | ✅ |

---

## Time Savings Analysis

| Task | Traditional | Our MCP | Savings |
|------|-------------|---------|---------|
| Product Research | 30 min | 30 sec | 98% |
| Supplier Analysis | 15 min | 5 sec | 99% |
| Listing Creation | 25 min | 10 sec | 99% |
| Price Calculation | 10 min | 3 sec | 99% |
| Bulk Ops (50 items) | 4 hours | 2 min | 99% |
| **Daily Total** | **5+ hours** | **15 min** | **95%** |

---

## Target Users

| User Type | Why They'll Love It |
|-----------|---------------------|
| **Developers** | CLI-based, programmable, integrates with workflows |
| **Power Sellers** | Bulk operations, time savings, scale easily |
| **Agencies** | Multi-client management, automation, professional tool |
| **Data-Driven Sellers** | AI insights, market research, trend prediction |

---

*Document Version 1.0 - January 9, 2026*
