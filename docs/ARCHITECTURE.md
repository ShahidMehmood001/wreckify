# Wreckify — System Architecture

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-04-17  

---

## 1. System Overview

Wreckify is a microservices-based monorepo with 4 independent apps communicating over internal HTTP. The NestJS API is the single entry point for all client requests — it orchestrates calls to the Python AI service and scraper. Clients never communicate directly with Python services.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│                    Next.js 14 (App Router)                      │
│              Tailwind CSS + shadcn/ui + NextAuth.js             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (REST)
┌──────────────────────────▼──────────────────────────────────────┐
│                        API GATEWAY                              │
│                    NestJS + Prisma ORM                          │
│         Auth │ RBAC │ Business Logic │ PDF (Puppeteer)          │
└────┬─────────────────────────────────────┬───────────────────────┘
     │ Internal HTTP                        │ Internal HTTP
┌────▼───────────────┐          ┌──────────▼────────────────────┐
│   Python FastAPI   │          │     Python Scraper Service    │
│   AI Microservice  │          │   Scrapy + APScheduler        │
│  YOLOv8 + LangGraph│          │   OLX Pakistan + PakWheels    │
│  Multi-provider LLM│          │   → PostgreSQL (every 12h)    │
└────────────────────┘          └───────────────────────────────┘
          │                                  │
┌─────────▼──────────────────────────────────▼───────────────────┐
│                        DATA LAYER                               │
│           PostgreSQL (Supabase)  +  Redis (Upstash)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Services

### 2.1 apps/web — Next.js Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth:** NextAuth.js (email/password + Google OAuth)
- **State:** Zustand (client state) + React Query (server state)
- **Responsibilities:** UI, routing, authentication session, calls NestJS API only

### 2.2 apps/api — NestJS Backend
- **Framework:** NestJS
- **ORM:** Prisma → PostgreSQL
- **Responsibilities:**
  - All business logic
  - RBAC enforcement (Role Guards)
  - Scan quota enforcement
  - Orchestrating calls to AI service
  - PDF generation (Puppeteer)
  - Report storage
  - Workshop and inquiry management
  - Admin operations
  - Proxying scraper status

### 2.3 apps/ai-service — Python FastAPI
- **Framework:** FastAPI
- **Responsibilities:**
  - YOLOv8/YOLO11 damage detection
  - Multi-provider LLM (Gemini, OpenAI, ZhipuAI) via LangChain
  - LangGraph agentic cost estimation pipeline
  - Internal only — not exposed to public internet

### 2.4 apps/scraper — Python Scraper
- **Framework:** Scrapy + APScheduler
- **Responsibilities:**
  - Scrape OLX Pakistan and PakWheels every 12 hours
  - Parse and normalize spare parts listings
  - Write structured records to PostgreSQL
  - Log run status to scraper_logs table
  - Internal only — no HTTP API exposed

---

## 3. Folder Structure

### 3.1 apps/web
```
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── scans/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── vehicles/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   ├── workshops/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx
│   │   │       ├── users/
│   │   │       ├── workshops/
│   │   │       └── scraper/
│   │   ├── (guest)/
│   │   │   └── scan/
│   │   │       └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/               ← shadcn/ui components
│   │   ├── forms/
│   │   ├── scan/
│   │   ├── dashboard/
│   │   ├── workshop/
│   │   └── shared/
│   ├── lib/
│   │   ├── api.ts            ← API client (axios/fetch wrapper)
│   │   ├── auth.ts           ← NextAuth config
│   │   └── utils.ts
│   ├── hooks/
│   ├── store/                ← Zustand stores
│   └── types/                ← Shared TypeScript types (from @wreckify/shared)
├── public/
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### 3.2 apps/api
```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── google.strategy.ts
│   │   │   └── dto/
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   ├── vehicles/
│   │   ├── scans/
│   │   ├── reports/
│   │   ├── workshops/
│   │   ├── insurance/
│   │   ├── plans/
│   │   ├── ai-config/
│   │   └── admin/
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   ├── config/
│   │   └── configuration.ts
│   ├── prisma/
│   │   └── prisma.service.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── test/
├── .env.example
├── package.json
└── tsconfig.json
```

### 3.3 apps/ai-service
```
apps/ai-service/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── detect.py
│   │   │   ├── estimate.py
│   │   │   └── health.py
│   │   └── deps.py
│   ├── core/
│   │   ├── config.py
│   │   └── security.py        ← internal API key validation
│   ├── services/
│   │   ├── detection/
│   │   │   ├── yolo_service.py
│   │   │   └── preprocessor.py
│   │   ├── estimation/
│   │   │   ├── agent.py       ← LangGraph pipeline
│   │   │   └── tools.py       ← agent tools
│   │   └── providers/
│   │       ├── base.py        ← abstract provider
│   │       ├── factory.py     ← get_model() factory
│   │       ├── gemini.py
│   │       ├── openai.py
│   │       └── zhipu.py
│   ├── schemas/
│   │   ├── detect.py
│   │   └── estimate.py
│   └── main.py
├── weights/                   ← YOLOv8 model weights (.pt files)
├── requirements.txt
├── .env.example
└── Dockerfile
```

### 3.4 apps/scraper
```
apps/scraper/
├── app/
│   ├── spiders/
│   │   ├── olx_spider.py
│   │   └── pakwheels_spider.py
│   ├── pipelines/
│   │   └── postgres_pipeline.py
│   ├── scheduler/
│   │   └── jobs.py            ← APScheduler cron jobs
│   ├── core/
│   │   ├── config.py
│   │   └── db.py              ← SQLAlchemy session
│   └── main.py
├── scrapy.cfg
├── requirements.txt
├── .env.example
└── Dockerfile
```

---

## 4. Inter-Service Communication

### NestJS → Python AI Service
- **Protocol:** Internal HTTP (REST)
- **Auth:** Shared internal API key (`X-Internal-Key` header)
- **Base URL:** `http://ai-service:8000` (Docker) or `http://localhost:8000` (dev)
- **Timeout:** 30 seconds (AI inference can be slow)

### NestJS → Scraper
- NestJS does NOT call the scraper directly
- Scraper writes to the shared PostgreSQL database
- NestJS reads scraper data from PostgreSQL
- NestJS reads scraper logs via the `scraper_logs` table only

### Client → NestJS
- **Protocol:** HTTPS (REST)
- **Auth:** JWT Bearer token (NextAuth.js session)
- **Base URL:** `http://localhost:3001` (dev) / `https://api.wreckify.com` (prod)

---

## 5. API Contracts

### 5.1 NestJS REST API (Public)

#### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login with email/password | Public |
| POST | `/auth/google` | Google OAuth | Public |
| POST | `/auth/logout` | Invalidate session | JWT |
| GET | `/auth/me` | Current user profile | JWT |
| POST | `/auth/refresh` | Refresh JWT token | JWT |

#### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/profile` | Get own profile | JWT |
| PATCH | `/users/profile` | Update own profile | JWT |
| GET | `/users/subscription` | Get current plan + usage | JWT |
| PATCH | `/users/ai-config` | Update BYOK AI config | JWT (Pro+) |

#### Vehicles
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/vehicles` | List own vehicles | JWT |
| POST | `/vehicles` | Create vehicle profile | JWT |
| GET | `/vehicles/:id` | Get vehicle details | JWT |
| PATCH | `/vehicles/:id` | Update vehicle | JWT |
| DELETE | `/vehicles/:id` | Delete vehicle | JWT |

#### Scans
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/scans/guest` | Guest scan (1 free) | Public |
| POST | `/scans` | Create new scan | JWT |
| POST | `/scans/:id/images` | Upload images to scan | JWT |
| POST | `/scans/:id/detect` | Trigger AI detection | JWT |
| POST | `/scans/:id/estimate` | Trigger cost estimation | JWT |
| GET | `/scans` | List own scans | JWT |
| GET | `/scans/:id` | Get scan details | JWT |

#### Reports
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/reports/:scanId` | Generate PDF report | JWT |
| GET | `/reports/:scanId` | Download report | JWT |
| GET | `/reports` | List own reports | JWT |

#### Workshops
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/workshops` | Browse workshops (filter: city, service) | Public |
| GET | `/workshops/:id` | Get workshop profile | Public |
| POST | `/workshops` | Register workshop | JWT (Mechanic) |
| PATCH | `/workshops/:id` | Update workshop | JWT (Mechanic) |
| POST | `/workshops/:id/inquiries` | Send repair inquiry | JWT (Owner) |
| GET | `/workshops/:id/inquiries` | Get workshop inquiries | JWT (Mechanic) |
| PATCH | `/workshops/inquiries/:id` | Respond to inquiry | JWT (Mechanic) |

#### Plans
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/plans` | List all plans | Public |

#### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/users` | List all users | JWT (Admin) |
| PATCH | `/admin/users/:id/role` | Change user role | JWT (Admin) |
| PATCH | `/admin/users/:id/status` | Suspend/activate user | JWT (Admin) |
| GET | `/admin/workshops` | List all workshops | JWT (Admin) |
| PATCH | `/admin/workshops/:id/status` | Approve/reject workshop | JWT (Admin) |
| GET | `/admin/scraper/logs` | View scraper logs | JWT (Admin) |
| GET | `/admin/analytics` | Platform analytics | JWT (Admin) |

---

### 5.2 Python FastAPI (Internal Only)

#### Detection
```
POST /detect
Headers: X-Internal-Key: <secret>
Body: {
  scan_id: string,
  image_urls: string[],
  provider: "gemini" | "openai" | "zhipu",
  api_key?: string,        // BYOK (decrypted by NestJS before sending)
  model?: string
}
Response: {
  scan_id: string,
  detected_parts: [
    {
      part_name: string,
      severity: "minor" | "moderate" | "severe",
      confidence_score: float,
      bounding_box: { x, y, width, height },
      description: string
    }
  ]
}
```

#### Estimation
```
POST /estimate
Headers: X-Internal-Key: <secret>
Body: {
  scan_id: string,
  detected_parts: DetectedPart[],
  vehicle: { make, model, year },
  provider: string,
  api_key?: string
}
Response: {
  scan_id: string,
  total_min: float,
  total_max: float,
  currency: "PKR",
  line_items: [
    {
      part: string,
      parts_min: float,
      parts_max: float,
      labor_min: float,
      labor_max: float
    }
  ],
  narrative: string
}
```

#### Health
```
GET /health
Response: { status: "ok", model_loaded: bool, uptime: float }
```

---

## 6. Authentication & Authorization Flow

```
1. User registers/logs in → NestJS issues JWT (access + refresh tokens)
2. JWT payload: { sub: userId, email, role, plan }
3. Every protected request → JwtAuthGuard validates token
4. Role-protected routes → RolesGuard checks payload.role
5. Scan quota check → PlansGuard reads subscription from DB before scan
6. BYOK keys → stored AES-256 encrypted in DB, decrypted in memory only when needed, 
               never returned in API responses
```

---

## 7. Scan Quota Enforcement

```
Guest:         1 scan per session (tracked by guestSessionId cookie)
Free Plan:     3 scans/month (reset monthly, enforced server-side)
Pro+:          Unlimited
Enforcement:   NestJS PlansGuard checks scans_used < plan.scans_per_month
               before allowing POST /scans — not bypassable via frontend
```

---

## 8. Environment Variables

### apps/api (.env)
```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_INTERNAL_KEY=
ENCRYPTION_KEY=              # AES-256 key for BYOK storage
PUPPETEER_EXECUTABLE_PATH=
```

### apps/web (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### apps/ai-service (.env)
```
INTERNAL_API_KEY=
DEFAULT_GEMINI_API_KEY=      # platform default for free plan users
YOLO_MODEL_PATH=./weights/best.pt
```

### apps/scraper (.env)
```
DATABASE_URL=
OLX_BASE_URL=https://www.olx.com.pk
PAKWHEELS_BASE_URL=https://www.pakwheels.com
SCRAPER_INTERVAL_HOURS=12
```

---

## 9. Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Single API gateway | NestJS only | Python services never exposed publicly |
| BYOK decryption | In NestJS memory only | Keys never stored or sent in plaintext |
| Scraper → DB (not real-time) | PostgreSQL via cron | Reliability over freshness |
| PDF on NestJS | Puppeteer | Presentation concern, not AI concern |
| Scan quota | Server-side only | Cannot be bypassed via client |
| Internal service auth | Shared API key | Simple, sufficient for internal network |
