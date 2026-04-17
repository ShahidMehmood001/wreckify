# Wreckify — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-04-17  

---

## 1. Product Overview

**Wreckify** is an AI-powered vehicle damage detection and repair cost estimation platform targeting the Pakistani automotive market. Users upload vehicle images, the system detects damaged parts using computer vision, estimates repair costs from real-time market data, and generates professional reports — all within a multi-role, extensible SaaS architecture.

---

## 2. Problem Statement

The vehicle repair industry in Pakistan suffers from:
- Inaccurate and inconsistent manual damage inspection
- Opaque, variable spare parts pricing
- No centralized, trusted source for repair cost benchmarks
- Difficulty finding qualified, trustworthy mechanics
- Insurance claim processes that lack standardized damage documentation

---

## 3. Goals & Objectives

| Goal | Metric |
|------|--------|
| Accurate damage detection | ≥85% mAP on test dataset |
| Cost estimation relevance | Prices sourced from OLX/PakWheels, refreshed every 12 hours |
| Report quality | Downloadable PDF with structured damage + cost breakdown |
| Multi-role platform | Vehicle owners, mechanics, insurance agents all served |
| Extensibility | Freemium architecture designed for future payment integration |

---

## 4. User Roles

### 4.1 Guest
- Unauthenticated visitor
- Limited to 1 free damage scan per session (no history saved)
- Prompted to register after scan to access full features

### 4.2 Vehicle Owner
- Primary user of the platform
- Uploads vehicle images, receives damage reports, manages repair history
- Freemium: limited scans on free plan, upgrades for full access

### 4.3 Mechanic / Workshop
- Registers workshop profile with location, services, and specializations
- Receives repair inquiries from vehicle owners
- Manages incoming jobs and responds to requests

### 4.4 Insurance Agent
- Registers as an insurance professional
- Accesses insurance-format damage reports submitted by vehicle owners
- Generates standardized claim documentation

### 4.5 Admin
- Full platform oversight
- Manages users, workshops, pricing plans, and scraper health
- Views analytics dashboard

---

## 5. Pricing Plans (Freemium — Designed for Future Payment Integration)

| Plan | Scans/Month | Report Download | BYOK (AI Provider) | Price History | Target Role |
|------|-------------|-----------------|---------------------|----------------|-------------|
| **Free** | 3 | Basic PDF | No (Gemini default) | No | Guest → Owner |
| **Pro** | Unlimited | Full PDF | Yes | Yes | Vehicle Owner |
| **Workshop** | Unlimited | Full PDF | Yes | Yes | Mechanic |
| **Insurance** | Unlimited | Insurance PDF | Yes | Yes | Insurance Agent |
| **Enterprise** | Unlimited + API | Custom | Yes | Yes | Future |

> **Note:** Payment gateway integration is out of scope for v1. Plans are modeled in the database and enforced via feature flags. Upgrade prompts are shown but no actual payment is processed.

---

## 6. Core Features (MVP — Phase 1)

### 6.1 Authentication & Authorization
- Email/password registration and login (NextAuth.js)
- Role-based access control (RBAC): Guest, Owner, Mechanic, Insurance, Admin
- OAuth login (Google) — extensible for more providers
- JWT-based session management

### 6.2 Vehicle Profile Management
- Vehicle owners can create and manage multiple vehicle profiles
- Fields: make, model, year, color, registration number (optional)
- Attach scans/reports to specific vehicle profiles

### 6.3 Damage Detection
- Upload single or multiple images of a vehicle (up to 5 angles)
- YOLOv8/YOLO11 model detects damaged parts:
  - Bumper (front/rear), door, bonnet, boot, headlights, taillights, windscreen, mirror, fender, roof
- Returns: detected parts, bounding boxes, confidence scores, severity (minor/moderate/severe)
- Gemini Vision (or user-selected provider) generates natural language damage description

### 6.4 AI Provider Selection (BYOK)
- Pro and above can select AI provider: Gemini, OpenAI, ZhipuAI
- User inputs their own API key (stored encrypted)
- System validates key and vision model support before use
- Free plan uses platform's default Gemini 1.5 Flash key

### 6.5 Cost Estimation
- LangGraph agentic pipeline:
  - Tool 1: Query spare parts price DB (sourced from scraper)
  - Tool 2: Query labor cost DB (manually curated, city-based)
  - Tool 3: Severity-to-repair-time calculator
  - Tool 4: Total cost range generator
- Output: itemized cost estimate per damaged part (min–max range)
- Prices shown in PKR

### 6.6 Spare Parts Price Database (Scraper)
- Python scraper runs on APScheduler every 12 hours
- Sources: OLX Pakistan, PakWheels
- Stores structured listings in PostgreSQL with timestamps
- Served from Redis cache (TTL: 6 hours)
- Admin dashboard shows scraper health and last run status

### 6.7 Report Generation
- NestJS + Puppeteer generates PDF from HTML/CSS template
- Report includes:
  - Vehicle details
  - Annotated damage images (bounding boxes)
  - Detected parts with severity
  - Itemized cost estimate (PKR)
  - Market price range per part
  - AI-generated repair narrative
  - Wreckify branding + timestamp
- Insurance agents get an alternate insurance-format PDF template

### 6.8 Repair History Dashboard
- Vehicle owners see all past scans per vehicle
- Filter by date, vehicle, severity
- Re-download past reports
- Cost trends over time (if multiple scans)

### 6.9 Mechanic / Workshop Finder
- Workshop profiles: name, location (city), services, contact, ratings
- Vehicle owners can browse and filter workshops by city and service type
- Send repair inquiry to a workshop directly from a scan result
- Workshops receive and manage inquiries via their dashboard

### 6.10 Admin Panel
- User management (view, suspend, change role)
- Workshop approval/rejection workflow
- Pricing plan management (feature flag toggles per plan)
- Scraper monitoring (last run, records count, error logs)
- Basic analytics: total scans, registrations, report downloads

---

## 7. Stretch Goals (Phase 2+)

| Feature | Description |
|---------|-------------|
| Price trend charts | Historical spare parts price visualization per part/make/model |
| WhatsApp/email report sharing | Share PDF directly from scan result |
| Insurance claim submission | Submit report directly to integrated insurance providers |
| PWA / mobile optimization | Installable mobile experience |
| Multi-language support | Urdu language option |
| Workshop rating system | Vehicle owners rate workshops after repair |
| Bulk scan API | Enterprise plan — programmatic access via REST API |
| Real payment integration | Stripe/JazzCash for Pro plan upgrade |

---

## 8. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| AI inference response time | ≤ 10 seconds per scan |
| API response time (non-AI) | ≤ 500ms p95 |
| Scraper reliability | ≥ 95% successful runs per week |
| PDF generation time | ≤ 5 seconds |
| Mobile responsiveness | Full support (Tailwind responsive) |
| Data security | API keys encrypted at rest (AES-256) |
| RBAC enforcement | All endpoints protected by role guard |
| Scan quota enforcement | Enforced at API level, not just frontend |

---

## 9. User Stories

### Guest
- As a guest, I can upload a vehicle image and receive a damage detection result without registering
- As a guest, after my free scan I am prompted to register to save my report and access full features

### Vehicle Owner
- As a vehicle owner, I can register and create a profile
- As a vehicle owner, I can add multiple vehicle profiles (make, model, year)
- As a vehicle owner, I can upload up to 5 images of my damaged vehicle per scan
- As a vehicle owner, I can view detected damaged parts with confidence scores and severity
- As a vehicle owner, I can view an itemized repair cost estimate in PKR
- As a vehicle owner, I can download a PDF report of my scan
- As a vehicle owner, I can view my full scan history per vehicle
- As a vehicle owner, I can search for workshops by city and service type
- As a vehicle owner, I can send a repair inquiry to a workshop from my scan result
- As a vehicle owner (Pro), I can enter my own AI provider API key and select my preferred model
- As a vehicle owner, I can see how many free scans I have remaining this month

### Mechanic / Workshop
- As a workshop owner, I can register a workshop profile with services and location
- As a workshop owner, I can view and respond to repair inquiries from vehicle owners
- As a workshop owner, I can manage my workshop profile and availability

### Insurance Agent
- As an insurance agent, I can register with my company details
- As an insurance agent, I can access insurance-format damage reports
- As an insurance agent, I can generate standardized claim documentation PDFs

### Admin
- As an admin, I can view and manage all registered users
- As an admin, I can approve or reject workshop registrations
- As an admin, I can toggle feature flags per pricing plan
- As an admin, I can monitor scraper health and last run status
- As an admin, I can view platform analytics (scans, registrations, downloads)

---

## 10. Out of Scope (v1)

- Actual payment processing
- Mobile native app (iOS/Android)
- Live chat between owners and workshops
- Integration with external insurance provider APIs
- Vehicle VIN-based lookup
- Video damage assessment
- Multi-language (Urdu)

---

## 11. Assumptions & Constraints

- All prices displayed in PKR only (v1)
- Scraper targets OLX Pakistan and PakWheels only
- AI damage detection scoped to cars (sedans, hatchbacks, SUVs) — not motorcycles or trucks in v1
- Free plan quota enforced server-side (not bypassable via frontend)
- Workshop listings are admin-approved before going live
- AI provider API keys stored encrypted; never exposed in API responses

---

## 12. Open Questions (Resolved)

| Question | Answer |
|----------|--------|
| User roles | Owner, Mechanic, Insurance Agent, Admin |
| Guest access | 1 free scan, prompted to register |
| Monetization v1 | Freemium model, plans in DB, no payment gateway yet |
| Scraping approach | Scheduled cron → save to DB, serve from cache |
| PDF generation | NestJS + Puppeteer |
| AI provider | Multi-provider BYOK (Gemini default, OpenAI, ZhipuAI) |
| Primary DB | PostgreSQL (Supabase) + Redis (Upstash) |
| ORM | Prisma |
