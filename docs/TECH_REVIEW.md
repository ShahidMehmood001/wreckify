# Technical & Product Review — Full Audit

**Status:** OPEN  
**Date:** 2026-05-08  
**Scope:** All layers — backend API, AI service, frontend, database, product, project management  
**Trigger:** Pre-Sprint-17 review before building pricing features on top of the current codebase

---

## How to Read This Document

Each issue has a severity, an owner role, the exact file and location, and the required fix. Issues are grouped by severity so the team can triage quickly.

**Severity levels:**
- 🔴 **CRITICAL** — Security risk, data corruption, or user-facing breakage. Fix before next sprint.
- 🟠 **HIGH** — Will cause real problems as user count grows. Fix within 2 sprints.
- 🟡 **MEDIUM** — Important for production quality. Track in backlog, fix before launch.
- 🔵 **LOW / DESIGN** — UX or architectural improvements. Backlog.

---

## 🔴 CRITICAL — Fix Before Sprint 17

---

### C-01 — No Rate Limiting on Any Endpoint

**Role:** Senior Developer / Security  
**File:** `apps/api/src/main.ts`

No `@nestjs/throttler` is configured. Every endpoint — including guest scan creation and AI detection — is unprotected. A single script can spam `POST /scans/guest` indefinitely, triggering hundreds of AI jobs and exhausting LLM API quota in minutes.

**Fix:**
- Add `ThrottlerModule` globally in `app.module.ts`
- Apply tighter limits on guest and AI endpoints: e.g. 5 requests/minute on `/scans/guest`, 3/minute on `/detect`

---

### C-02 — Detection Is Not Idempotent (Duplicate Parts Possible)

**Role:** Senior Developer / QA  
**File:** `apps/api/src/modules/scans/scans.service.ts` — `triggerDetection()` lines 91–137

`triggerDetection()` sets status to `PROCESSING` but does NOT check whether detection already ran. If a client calls `POST /scans/:id/detect` twice (network retry, double-click), both requests proceed. If both complete, `detectedPart.createMany()` runs twice, doubling every detected part in the database. No unique constraint prevents this.

**Fix:**
```typescript
// Add at the start of triggerDetection():
if (scan.status === ScanStatus.PROCESSING || scan.status === ScanStatus.COMPLETED) {
  throw new BadRequestException('Detection already in progress or completed for this scan');
}
```

---

### C-03 — Guest Session Bypass (Unlimited Free Scans)

**Role:** Senior Developer / Security  
**File:** `apps/api/src/modules/scans/scans.service.ts` — `createGuestScan()` line 24

The quota check is wrapped in `if (dto.guestSessionId)`. If a client omits `guestSessionId`, the check is skipped entirely and unlimited free scans can be created. The field is currently optional in the DTO.

**Fix:**
- Make `guestSessionId` required in `CreateGuestScanDto`
- Generate a server-side UUID if none is provided (or reject the request)
- Remove the `if (dto.guestSessionId)` guard — always check

---

### C-04 — No Notifications for Inquiry Responses

**Role:** Product Manager / Developer  
**File:** `apps/api/src/modules/workshops/workshops.service.ts` — `createInquiry()`, `respondToInquiry()`

When a mechanic responds to an inquiry, the owner receives no email, no push notification, nothing. The owner must open the app and manually check. In a mobile-first market, this means inquiry responses are effectively invisible. The inquiry loop feature (Sprint 15) is functionally broken until this is fixed.

**Fix:**
- Integrate Resend (already in backlog for email verification)
- On `respondToInquiry()`: send templated email to `inquiry.sender.email`
- On `createInquiry()`: send confirmation email to sender

---

## 🟠 HIGH — Fix Within 2 Sprints

---

### H-01 — PROCESSING Scans Stuck Forever on AI Failure

**Role:** Senior Developer / QA  
**File:** `apps/api/src/modules/scans/scans.service.ts` — `triggerDetection()` line 103

Scan status is set to `PROCESSING` before the AI call. If the AI service times out, crashes, or the network drops, the scan stays in `PROCESSING` forever. The user's quota is consumed, they see a spinner with no recovery path.

**Fix:**
- Cron job (every 5 minutes): reset scans stuck in `PROCESSING` for more than 5 minutes back to `FAILED`
- Frontend: poll scan status after triggering detection; show error state if status = `FAILED`

---

### H-02 — Scan Quota Not Transactional (Race Condition + Over-Count)

**Role:** Senior Developer / QA  
**File:** `apps/api/src/modules/scans/scans.service.ts` — `create()` lines 57–68

Two issues:
1. `scansUsed` is incremented as a separate DB call after scan creation. If the increment fails, quota is wrong. If the scan creation fails before increment, quota is fine — but that's luck, not design.
2. Race condition: two simultaneous requests both pass PlansGuard (both read the same `scansUsed` value), then both create scans, consuming two quota slots.

**Fix:**
- Wrap `scan.create` + `subscription.update` in a Prisma `$transaction`
- Or use `increment` with a conditional WHERE clause (optimistic lock)

---

### H-03 — No Pagination on List Endpoints

**Role:** Senior Developer / PM  
**Files:**
- `apps/api/src/modules/scans/scans.controller.ts` — `findAll()` line ~138
- `apps/api/src/modules/workshops/workshops.controller.ts` — `findAll()` line ~27

Both return all records with no `skip`/`take`. The admin endpoints correctly implement `page`/`limit` — apply the same pattern to user-facing endpoints.

**Fix:**
- Add `@Query('page') page = 1`, `@Query('limit') limit = 20` parameters
- Apply `skip: (page - 1) * limit`, `take: limit` in the service

---

### H-04 — AI Response Has No Schema Validation Before DB Insert

**Role:** Senior Developer / QA  
**File:** `apps/api/src/modules/scans/scans.service.ts` — `triggerDetection()` lines 120–132

```typescript
data: result.detected_parts.map((p: any) => ({ ... }))
```

The `any` type means a malformed AI response (wrong severity string, missing bounding box, confidence > 1) silently corrupts the database or throws an unhandled Prisma error.

**Fix:**
- Create a `DetectionResultDto` with Zod or class-validator
- Validate severity is `MINOR | MODERATE | SEVERE`
- Validate `confidence_score` in `[0, 1]`
- Validate `bounding_box` has x, y, width, height all > 0

---

### H-05 — No Error Monitoring

**Role:** Senior Developer / Project Manager  
**File:** `apps/api/src/main.ts`

No Sentry or equivalent. Production errors — AI service failures, DB timeouts, scan crashes — are completely invisible. The only visibility is server logs, which no one reads in real time.

**Fix:** Integrate Sentry free tier in both the NestJS API and Python AI service. 30-minute task.

---

### H-06 — Missing Database Indexes on High-Traffic Queries

**Role:** Senior Developer  
**File:** `apps/api/prisma/schema.prisma`

Missing indexes on columns used in every request:

| Table | Column | Used in |
|---|---|---|
| `Scan` | `userId` | Every scan list query |
| `Scan` | `guestSessionId` | Every guest request |
| `RepairInquiry` | `senderId` | Owner inquiry list |
| `RepairInquiry` | `workshopId` | Mechanic inbox |
| `Workshop` | `status` | Public workshop listing filter |

**Fix:** Add `@@index` directives and migrate.

---

## 🟡 MEDIUM — Backlog Before Launch

---

### M-01 — Synchronous AI Detection (No Job Queue)

AI detection is a synchronous HTTP call with a 60-second timeout. For production with concurrent users, this needs to be a background job (BullMQ + Redis) with the frontend polling for status. Not urgent now but is a scaling bottleneck.

---

### M-02 — Local Image Storage Is a Production Blocker

Already in backlog (Cloud Storage Migration). Images are stored on a Docker volume. Any container restart, redeployment, or cloud migration wipes all user images. Must be resolved before real users are onboarded.

---

### M-03 — Vehicle Make/Model Not Validated Server-Side

`POST /vehicles` accepts any string for `make` and `model`. A user can register "fakemake/fakemodel" via API. The AI prompt then says "Vehicle: 2022 fakemake fakemodel" — producing meaningless output. The Pakistan cars list defined in `apps/web/src/lib/pakistan-cars.ts` should be enforced on the backend too.

---

### M-04 — Scan Frontend Does Not Handle FAILED Status

If backend detection fails, scan status becomes `FAILED` but the frontend scan page has no polling and no error state for FAILED. The user sees the "Detecting damage…" spinner forever.

---

### M-05 — CORS Not Set for Production

`apps/api/src/main.ts` defaults to `http://localhost:3000` if `CORS_ORIGIN` env var is not set. Production deployment must explicitly set this or the API will reject requests from the real frontend domain.

---

## 🔵 PRODUCT / DESIGN

---

### P-01 — Guest Scan Shows Wrong Thing

Guest scans show damage detection only — no cost estimate. The question that drives conversion is "how much will it cost?" A guest who sees part names is mildly interested. A guest who sees tiered price ranges converts. After Sprint 17 builds the pricing data, add a basic price lookup to the guest scan result.

---

### P-02 — Insurance Agent Role Has No Product

The `INSURANCE_AGENT` role exists in the DB schema and auth guards but there is no page, flow, or feature for it. Either build a minimal product for it or remove the role to reduce confusion and attack surface.

---

### P-03 — No Automated Tests

Zero unit, integration, or E2E tests. Every sprint changes untested code. Minimum viable test coverage: integration tests for the auth flow, scan creation flow, and workshop inquiry flow.

---

### P-04 — No Analytics

There is no user behaviour tracking. The team cannot measure which features are used, where users drop off, or what converts. Add PostHog or Mixpanel (both have free tiers) before onboarding real users.

---

### P-05 — Workshop Discovery Is Undifferentiated

Workshops are listed with name, city, services. No ratings, no response rate, no inquiry count, no photos. All workshops look identical. Users have no basis to choose between them.

---

## Summary Table

| ID | Issue | Severity | Fix Effort |
|----|-------|----------|------------|
| C-01 | No rate limiting | 🔴 CRITICAL | 2h |
| C-02 | Detection not idempotent | 🔴 CRITICAL | 1h |
| C-03 | Guest session bypass | 🔴 CRITICAL | 1h |
| C-04 | No inquiry notifications | 🔴 CRITICAL | 1 day |
| H-01 | PROCESSING scan stuck forever | 🟠 HIGH | 2h + cron |
| H-02 | Quota not transactional | 🟠 HIGH | 2h |
| H-03 | No pagination on list endpoints | 🟠 HIGH | 2h |
| H-04 | AI response not validated | 🟠 HIGH | 2h |
| H-05 | No error monitoring | 🟠 HIGH | 30min |
| H-06 | Missing DB indexes | 🟠 HIGH | 1h |
| M-01 | Synchronous AI, no job queue | 🟡 MEDIUM | 1 sprint |
| M-02 | Local image storage | 🟡 MEDIUM | 1 sprint |
| M-03 | Vehicle not validated server-side | 🟡 MEDIUM | 2h |
| M-04 | Frontend no FAILED state handling | 🟡 MEDIUM | 2h |
| M-05 | CORS not production-configured | 🟡 MEDIUM | 30min |
| P-01 | Guest scan shows wrong value prop | 🔵 DESIGN | 1 sprint |
| P-02 | Insurance agent role unused | 🔵 DESIGN | Decision needed |
| P-03 | No automated tests | 🔵 DESIGN | Ongoing |
| P-04 | No analytics | 🔵 DESIGN | 2h to integrate |
| P-05 | Workshop discovery undifferentiated | 🔵 DESIGN | Future sprint |
