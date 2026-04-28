# Sprints 1–8 — Historical Record

> These sprints were completed before formal sprint documentation was adopted.
> This file is a retrospective reconstruction from git history and the PRD.
> All sprints are **CLOSED**.

---

## Sprint 1 — Project Foundation
**Dates:** 2026-04-17  
**Status:** CLOSED ✅

### Goal
Establish the monorepo, tooling, and product direction.

### Delivered
- Turborepo monorepo initialised (`apps/api`, `apps/web`, `apps/ai-service`, `apps/scraper`)
- Git configuration (LF line endings via `.gitattributes`)
- Product Requirements Document (PRD v1.0)
- Architecture decision records

---

## Sprint 2 — Architecture Setup
**Dates:** 2026-04-17  
**Status:** CLOSED ✅

### Goal
Lay the technical foundation: database schema, ORM, shared config.

### Delivered
- PostgreSQL schema designed and implemented via Prisma
- Prisma client generated and seed script created
- NestJS project bootstrapped with global config, CORS, validation pipe
- Database schema documented (`docs/DATABASE_SCHEMA.md`)
- Architecture documented (`docs/ARCHITECTURE.md`)

---

## Sprint 3 — Authentication Module
**Dates:** 2026-04-17  
**Status:** CLOSED ✅

### Goal
Secure user registration, login, and Google OAuth.

### Delivered
- Email/password registration and login with bcrypt hashing
- JWT access token (15 min) + refresh token (7 days) rotation
- Google OAuth 2.0 strategy via Passport
- Role-based access control (RBAC) foundation
- JWT auth guard and `@CurrentUser` decorator
- `@Public` decorator for unauthenticated endpoints

---

## Sprint 4 — Core API Modules: Users, Vehicles, Scans
**Dates:** 2026-04-20  
**Status:** CLOSED ✅

### Goal
Build the primary domain entities users interact with daily.

### Delivered
- **Users module:** profile CRUD, subscription retrieval, BYOK AI config (encrypted with AES-256)
- **Vehicles module:** full CRUD for vehicle profiles per user
- **Scans module:** scan lifecycle — create, upload images (URL-based at this point), trigger detection, trigger estimation, list, get
- Plans guard enforcing monthly scan quota per plan

---

## Sprint 5 — Extended API Modules: Workshops, Reports, Admin, Plans
**Dates:** 2026-04-20  
**Status:** CLOSED ✅

### Goal
Complete the backend feature surface for all user roles.

### Delivered
- **Workshops module:** list approved workshops, admin approval workflow
- **Reports module:** PDF generation via Puppeteer, file download endpoint
- **Admin module:** user management, workshop moderation, platform analytics
- **Plans module:** seed data for FREE / PRO / WORKSHOP / INSURANCE / ENTERPRISE plans
- Plan features stored as JSON flags (`byok`, `priceHistory`, etc.)

---

## Sprint 6 — Python AI Service
**Dates:** 2026-04-20  
**Status:** CLOSED ✅

### Goal
Implement the AI damage detection and cost estimation pipeline.

### Delivered
- FastAPI-based AI service with internal API key authentication
- `POST /detect` — YOLOv8 damage detection + Gemini Vision description
- `POST /estimate` — LangChain agentic cost estimation pipeline (PKR, city-based labour)
- `GET /health` — health check endpoint
- `AiClientService` in NestJS wires API ↔ AI service over HTTP
- AI service integrated with NestJS scans workflow

---

## Sprint 7 — Scrapy Scraper Service
**Dates:** 2026-04-20  
**Status:** CLOSED ✅

### Goal
Populate the spare parts price database with real market data.

### Delivered
- Python Scrapy spiders for OLX Pakistan and PakWheels
- APScheduler runs spiders every 12 hours (configurable via `SCRAPER_INTERVAL_HOURS`)
- Parsed listings stored in `scraper_logs` and `part_prices` PostgreSQL tables
- Fixed column mapping bug (`scraper_logs` camelCase mismatch) and `ReactorNotRestartable` bug

---

## Sprint 8 — Next.js Frontend + Unit Tests
**Dates:** 2026-04-20  
**Status:** CLOSED ✅

### Goal
Build the complete user-facing frontend and validate critical logic with tests.

### Delivered
**Frontend (Next.js 14 App Router):**
- Authentication pages: Login, Register (email/password + Google OAuth button)
- Dashboard: scan usage stats, recent scans, quick action cards
- New Scan wizard: upload → detect → estimate → generate report (multi-step)
- Scan detail page: full scan view with detected parts, cost estimate, report download
- Scans list page
- Vehicles management page (full CRUD)
- Workshops directory with search
- Reports list page
- Settings page: subscription info, profile form, AI provider config
- Admin panel page
- Shared sidebar navigation, auth layout, dashboard layout
- Zustand auth store with `persist` middleware
- Axios `api` client with JWT attachment and token refresh interceptor

**Unit Tests:**
- NestJS: `AuthService`, `PlansGuard`, `EncryptionUtil`
- Python AI service: detect, estimate, health, security endpoints

---

## Notes for Future Developers

- Sprints 1–8 were completed in a rapid prototyping phase before CI/CD was in place
- No Docker setup existed until Sprint 9
- The frontend was built against a fully working backend (all modules tested via Swagger before UI)
- All API endpoints use a global `/api` prefix and a `ResponseInterceptor` that wraps responses as `{ success: true, data: {...} }`
