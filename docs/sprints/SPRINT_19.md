# Sprint 19 — High Priority Hardening

**Status:** CLOSED  
**Start date:** 2026-05-12  
**Closed date:** 2026-05-12  
**Sprint type:** Hardening — 4 high-priority reliability and data-integrity fixes

---

## Sprint Goal

Close the four highest-risk open items before onboarding real users: stuck scan recovery, scan quota race condition, AI response validation, and missing DB indexes.

---

## Stories

---

### S19-001 — H-06: Missing DB Indexes

**Status:** ✅ Done  
**File:** `apps/api/prisma/schema.prisma` + migration `20260511012743_add_missing_indexes`

**Problem:** Foreign key columns had no indexes. Every scan list query, guest session lookup, inquiry list, and workshop discovery did a full table scan.

**Fix:** Added 10 indexes via Prisma migration:

| Model | Index |
|-------|-------|
| `Scan` | `(userId)`, `(guestSessionId)`, `(status)` |
| `Vehicle` | `(userId)` |
| `DetectedPart` | `(scanId)` |
| `ScanImage` | `(scanId)` |
| `Workshop` | `(city, status)` |
| `WorkshopService` | `(workshopId)` |
| `RepairInquiry` | `(senderId)`, `(workshopId, status)` |

---

### S19-002 — H-04: AI Response Schema Validation

**Status:** ✅ Done  
**File:** `apps/api/src/modules/scans/ai-response.validator.ts`

**Problem:** AI service responses were cast as `any` and inserted directly into the DB. A malformed response (wrong severity value, negative prices, missing fields) would corrupt the data without any error.

**Fix:** `validateDetectResponse` and `validateEstimateResponse` functions validate the AI response before any DB write:

- **Detection:** Parts with invalid `severity` (not MINOR/MODERATE/SEVERE), invalid `confidence_score` (outside 0–1), or missing `bounding_box` are silently filtered out. The scan still completes with the valid subset of parts.
- **Estimation:** Invalid `total_min`/`total_max` (non-finite, negative, or `min > max`) throw `BadGatewayException` — the scan is marked FAILED rather than storing bad cost data. Line items with invalid prices are filtered out.
- All `any` casts on AI results removed — service now works with typed `ValidatedDetectResult` / `ValidatedEstimateResult`.
- Applied to all three detection/estimation paths: auth detect, guest detect, estimate.

---

### S19-003 — H-02: Scan Quota Race Condition

**Status:** ✅ Done  
**File:** `apps/api/src/modules/scans/scans.service.ts`

**Problem:** `PlansGuard` read `scansUsed`, checked `< scansPerMonth`, returned `true`. Then `ScansService.create()` incremented `scansUsed`. Two concurrent requests could both pass the guard at the same time (both seeing the same stale count) and both create scans — bypassing the quota limit.

**Fix:** `ScansService.create()` now wraps the quota check, increment, and scan creation in a single `$transaction` with a `FOR UPDATE` row lock:

```typescript
await this.prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw`
    SELECT s."scansUsed", p."scansPerMonth"
    FROM user_subscriptions s JOIN plans p ON s."planId" = p.id
    WHERE s."userId" = ${userId} FOR UPDATE
  `;
  // check quota, increment, create scan — all atomic
});
```

Concurrent requests queue at the `FOR UPDATE` lock and each sees the correct `scansUsed` value. `PlansGuard` is kept as a fast pre-flight check for the common case.

---

### S19-004 — H-01: Stuck Scan Recovery

**Status:** ✅ Done  
**Files:** `apps/api/src/modules/scans/scan-recovery.service.ts`, `scans.module.ts`, `app.module.ts`

**Problem:** If the AI service crashed mid-detection, the scan stayed in `PROCESSING` forever. Users had no way to retry, and the scan appeared permanently in-progress.

**Fix:** `ScanRecoveryService` runs a cron job every minute via `@nestjs/schedule`:

```typescript
@Cron(CronExpression.EVERY_MINUTE)
async recoverStuckScans() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const result = await this.prisma.scan.updateMany({
    where: { status: ScanStatus.PROCESSING, updatedAt: { lt: cutoff } },
    data: { status: ScanStatus.FAILED },
  });
  if (result.count > 0) this.logger.warn(`Recovered ${result.count} stuck scan(s)`);
}
```

- Threshold: 5 minutes (AI service timeout is 60s — 5 min is conservative)
- Resets to `FAILED` so the user sees the error state and can retry
- Logs a warning with count when recovery happens
- `ScheduleModule.forRoot()` added to `AppModule`

---

### S19-005 — M-04: FAILED Scan UI

**Status:** ✅ Done  
**Files:** `apps/web/src/app/(owner)/scan/page.tsx`, `apps/web/src/app/(owner)/scans/[id]/page.tsx`

**Problem:** When AI detection failed, the new scan flow silently reset to the upload step with only a toast message. The scan detail page showed no FAILED state at all — just an empty detected parts list.

**Fix:**
- **New scan flow** (`scan/page.tsx`): Added `"failed"` to the `Step` type. Detection catch block now sets `step = "failed"` and stores the error message in state. A new card is rendered with a destructive border, `AlertTriangle` icon, the server error message, and two actions: "Try Again" (resets to upload) and "Back to Scans".
- **Scan detail** (`scans/[id]/page.tsx`): When `scan.status === "FAILED"`, a prominent error card is rendered above the images section with a "Start New Assessment" CTA linking to `/scan`.

---

### S19-006 — H-03: Pagination

**Status:** ✅ Done  
**Files:** `apps/api/src/common/dto/pagination-query.dto.ts`, `apps/api/src/common/interfaces/paginated-result.interface.ts`, `apps/api/src/modules/workshops/dto/list-workshops-query.dto.ts`, `scans.controller.ts`, `scans.service.ts`, `workshops.controller.ts`, `workshops.service.ts`, `apps/web/src/app/(owner)/scans/page.tsx`, `apps/web/src/app/(owner)/workshops/page.tsx`

**Problem:** `GET /scans` and `GET /workshops` returned unbounded arrays — a user with hundreds of scans would receive the full list on every page load.

**Fix:** Offset-based pagination (`page` + `limit`, default 20, max 100) added to both endpoints. Response shape: `{ data, total, page, limit, totalPages }`.

- `PaginationQueryDto` — shared base DTO with `@Type(() => Number)` transform and `class-validator` guards; lives in `common/dto`
- `ListWorkshopsQueryDto` — extends pagination, adds `city` and `service` filters
- Controllers use `@Query() query: DTO` instead of multiple `@Query('param')` decorators
- `PaginatedResult<T>` interface in `common/interfaces` for service return types
- Frontend scans and workshops pages updated with Previous/Next controls
- Workshop inquiry dialog uses `limit=100` to fetch all completed scans regardless of pagination

---

## Sprint Commitment Summary

| ID | Story | Status |
|----|-------|--------|
| S19-001 | H-06: DB indexes | ✅ Done |
| S19-002 | H-04: AI response validation | ✅ Done |
| S19-003 | H-02: Scan quota race condition | ✅ Done |
| S19-004 | H-01: Stuck scan recovery cron | ✅ Done |
| S19-005 | M-04: FAILED scan UI | ✅ Done |
| S19-006 | H-03: Pagination | ✅ Done |

---

### S19-007 — H-05: Sentry Error Monitoring

**Status:** ✅ Done  
**Files:** `apps/api/src/instrument.ts`, `apps/api/src/main.ts`, `apps/api/src/common/filters/http-exception.filter.ts`, `apps/ai-service/app/main.py`, `apps/ai-service/app/core/config.py`, `apps/ai-service/requirements.txt`

**Problem:** Unhandled errors in both services were silently swallowed or only printed to stdout — no alerting, no aggregation, no stack traces in production.

**Fix:**
- **API (NestJS):** `@sentry/nestjs` installed. `instrument.ts` initialises Sentry as the very first import in `main.ts` (required by Sentry's SDK). `HttpExceptionFilter` upgraded to `@Catch()` (catches all exceptions) — any response ≥ 500 is forwarded to `Sentry.captureException()` before the JSON error is returned. 4xx client errors are intentionally not captured. Sentry is a no-op when `SENTRY_DSN` is unset (`enabled: false`).
- **AI Service (FastAPI):** `sentry-sdk[fastapi]` added to requirements. `sentry_sdk.init()` called in `main.py` before the FastAPI app is instantiated; the FastAPI integration hooks automatically capture 500 errors. Skipped entirely when `SENTRY_DSN` is empty.
- `SENTRY_DSN` added to both `.env.example` files.

---

## Sprint Commitment Summary

| ID | Story | Status |
|----|-------|--------|
| S19-001 | H-06: DB indexes | ✅ Done |
| S19-002 | H-04: AI response validation | ✅ Done |
| S19-003 | H-02: Scan quota race condition | ✅ Done |
| S19-004 | H-01: Stuck scan recovery cron | ✅ Done |
| S19-005 | M-04: FAILED scan UI | ✅ Done |
| S19-006 | H-03: Pagination | ✅ Done |
| S19-007 | H-05: Sentry error monitoring | ✅ Done |

---

## All High Priority items resolved. Sprint 19 CLOSED.
