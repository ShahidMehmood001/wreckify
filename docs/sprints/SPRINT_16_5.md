# Sprint 16.5 — Critical Hardening

**Status:** IN PROGRESS  
**Start date:** 2026-05-09  
**Sprint type:** Hardening — 3 critical security / data-integrity fixes before Sprint 17

---

## Sprint Goal

Fix the three critical issues identified in `docs/TECH_REVIEW.md` that represent real security vulnerabilities and data corruption paths. No new features — only making the existing system safe.

---

## Context

Sprint 16 delivered the vehicle-first scan flow. Before Sprint 17 builds the gari.pk pricing layer on top, three issues must be closed:

- The guest scan endpoint has no rate limiting — any script can create unlimited AI jobs.
- Detection can be triggered twice on the same scan — detected parts get duplicated in the DB.
- The guest quota check is bypassable by omitting `guestSessionId` — unlimited free scans.

---

## Stories

---

### S16.5-001 — Rate Limiting (C-01)

**Estimate:** 2h  
**Status:** ✅ Done

Add `@nestjs/throttler` globally. Stricter limits on the two highest-risk public endpoints.

**Global defaults:** 100 requests / 60 seconds (covers authenticated routes)  
**Guest scan create (`POST /scans/guest`):** 5 req / 60 sec  
**Guest detect (`POST /scans/:id/detect/guest`):** 3 req / 60 sec

**Files changed:**
- `apps/api/package.json` — added `@nestjs/throttler`
- `apps/api/src/app.module.ts` — `ThrottlerModule.forRoot`, `APP_GUARD → ThrottlerGuard`
- `apps/api/src/modules/scans/scans.controller.ts` — `@Throttle()` on two guest endpoints

---

### S16.5-002 — Detection Idempotency (C-02)

**Estimate:** 1h  
**Status:** ✅ Done

`triggerDetection()` and `triggerDetectionGuest()` now check `scan.status` before proceeding. If the scan is already `PROCESSING` or `COMPLETED`, a `BadRequestException` is thrown immediately — no second AI call, no duplicate parts.

**Files changed:**
- `apps/api/src/modules/scans/scans.service.ts` — status guard added to both detection methods

---

### S16.5-003 — Guest Session Bypass Fix (C-03)

**Estimate:** 1h  
**Status:** ✅ Done

`guestSessionId` is now required in `CreateGuestScanDto`. The `if (dto.guestSessionId)` guard is removed — quota is always checked. An omitted or invalid session ID returns a 400 validation error instead of bypassing the quota.

**Files changed:**
- `apps/api/src/modules/scans/dto/create-guest-scan.dto.ts` — `guestSessionId` made required
- `apps/api/src/modules/scans/scans.service.ts` — removed `if (dto.guestSessionId)` guard

---

## Sprint Commitment Summary

| ID | Story | Estimate | Status |
|----|-------|----------|--------|
| S16.5-001 | Rate limiting | 2h | ✅ Done |
| S16.5-002 | Detection idempotency | 1h | ✅ Done |
| S16.5-003 | Guest session bypass fix | 1h | ✅ Done |
| **Total** | | **4h** | |

---

## Post-Sprint State

- BACKLOG items C-01, C-02, C-03 are CLOSED.
- System is now safe to build Sprint 17 (gari.pk scraper) on top of.
- C-04 (inquiry notifications) remains open — deferred to a future sprint.
