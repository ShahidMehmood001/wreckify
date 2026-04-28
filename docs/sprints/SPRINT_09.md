# Sprint 9 — DevOps, CI/CD & Stabilisation

**Status:** CLOSED ✅  
**Start date:** 2026-04-20  
**End date:** 2026-04-28  
**Sprint type:** DevOps + Bug Bash  
**Team capacity:** 1 developer × 8 days  
**Planned velocity:** 21 SP (planned stories only)  
**Actual velocity:** 55 SP (planned + 17 unplanned bug fixes)

---

## Sprint Goal

Containerise all five services with Docker, wire them together with Docker Compose, set up GitHub Actions CI, and validate the full end-to-end product flow in a production-like environment.

---

## Sprint Planning

### Committed Stories

| ID | Story | Estimate |
|----|-------|----------|
| S9-001 | Docker Compose with all 5 services | 5 SP |
| S9-002 | Dockerfile for NestJS API | 3 SP |
| S9-003 | Dockerfile for Next.js web | 3 SP |
| S9-004 | Dockerfile for Python AI service | 3 SP |
| S9-005 | Dockerfile for Scrapy scraper | 2 SP |
| S9-006 | GitHub Actions CI pipeline | 3 SP |
| S9-007 | NestJS health check endpoint | 1 SP |
| S9-008 | Fix all API calls to use `/api` prefix | 1 SP |
| **Total** | | **21 SP** |

### Story Point Scale

| Points | Effort |
|--------|--------|
| 1 | Trivial — single file change |
| 2 | Small — well-understood change, ~1 hour |
| 3 | Medium — a few files, ~half a day |
| 5 | Large — cross-service, ~1 day |
| 8 | XL — complex, ~2 days |

---

## Stories Delivered

| ID | Story | Estimate | Commit |
|----|-------|----------|--------|
| S9-001 | Docker Compose with all 5 services (postgres, api, ai-service, scraper, web) | 5 SP | `7b5cfc7` |
| S9-002 | Dockerfile for NestJS API (Alpine, Prisma migrate on start, seed on start) | 3 SP | `7b5cfc7` |
| S9-003 | Dockerfile for Next.js web (multi-stage, standalone output) | 3 SP | `7b5cfc7` |
| S9-004 | Dockerfile for Python AI service (CPU-only PyTorch, Debian Trixie fixes) | 3 SP | `7b5cfc7` |
| S9-005 | Dockerfile for Scrapy scraper | 2 SP | `7b5cfc7` |
| S9-006 | GitHub Actions CI pipeline (lint, build, test on push/PR to master) | 3 SP | `7b5cfc7` |
| S9-007 | NestJS health check endpoint (`GET /api/health`) via `@nestjs/terminus` | 1 SP | `bdb0482` |
| S9-008 | Fix all API calls in frontend to use `/api` global prefix | 1 SP | `5ae6334` |

---

## Unplanned Work — Bugs Found During End-to-End Testing

All 17 bugs below were discovered during post-sprint validation of the full Docker environment. They were not in the sprint commitment but were resolved within the sprint window before closure.

| ID | Description | Root Cause | Fix | Estimate | Commit |
|----|-------------|------------|-----|----------|--------|
| BUG-001 | API container unhealthy | Missing `/api/health` route | Added `@nestjs/terminus` health module | 1 SP | `bdb0482` |
| BUG-002 | Auto-login broken after register — 401 | `ResponseInterceptor` wraps all responses; frontend read `res.data.user` not `res.data.data.user` | Added response envelope unwrapper to axios interceptor | 2 SP | `bdb0482` |
| BUG-003 | Token refresh stored `undefined` — logout after 15 min | Refresh response also envelope-wrapped; code read `data.accessToken` not `data.data.accessToken` | Fixed refresh handler to use `data.data ?? data` | 1 SP | `bdb0482` |
| BUG-004 | Dashboard redirected to login on hard refresh | Zustand `persist` hydration is async; auth check ran before store was ready | Added `_hasHydrated` flag + `onRehydrateStorage` callback | 2 SP | `bdb0482` |
| BUG-005 | Stale tokens stored in Zustand `persist` | `accessToken`/`refreshToken` were in the persisted store | Removed tokens from Zustand interface; localStorage only | 1 SP | `bdb0482` |
| BUG-006 | Image upload returned 500 | Controller expected JSON but should accept `multipart/form-data` | Added `FilesInterceptor` + multer `diskStorage`; static asset serving | 3 SP | `efd9992` |
| BUG-007 | AI detection 500 — could not fetch images | AI service fetched from `localhost` (itself), not `api` container | Added `APP_INTERNAL_URL`; `triggerDetection` rewrites image URLs | 2 SP | `efd9992` |
| BUG-008 | Cost estimate 400 on retry; NaN line items; missing relations | Three issues: wrong early return, snake_case vs camelCase in line items, wrong final return | Fixed all three in `scans.service.ts` | 3 SP | `efd9992` |
| BUG-009 | Scan wizard crashed with `TypeError: Cannot read properties of undefined (reading 'length')` | `scan.detectedParts` accessed without null guard | Added `?? []` fallback on 3 sites in `scan/page.tsx` | 1 SP | `a2bfc0e` |
| BUG-010 | Images not displaying on scan detail page | Frontend prepended `NEXT_PUBLIC_API_URL` to `img.url` which was already absolute | Use `img.url` directly | 1 SP | `a2bfc0e` |
| BUG-011 | Report generation returned 500 | Puppeteer bundled Chrome requires glibc; Alpine uses musl libc | Installed system `chromium` via apk; set `PUPPETEER_SKIP_DOWNLOAD=true` | 3 SP | `0f33d7b` |
| BUG-012 | Cost line items showed `NaN` in PDF | Template used `item.parts_min` (snake_case) but DB stores `partsMin` (camelCase) | Fixed field names in `report.template.ts` | 1 SP | `0f33d7b` |
| BUG-013 | Report download 404 — wrong URL | Download URL missing `/api` prefix | Added `/api` segment | 1 SP | `232bd52` |
| BUG-014 | Report download 401 | `window.open` sends no `Authorization` header | Replaced with `api.get(..., { responseType: 'blob' })` + object-URL download | 2 SP | `173541d` |
| BUG-015 | PDF disappeared after API container rebuild | `generated-reports/` not in a Docker volume | Added `api_reports` named volume to docker-compose | 1 SP | `4260a5a` |
| BUG-016 | Reports list page download 401/404 | Same `window.open` pattern as BUG-014 | Same blob download fix; added per-report loading spinner | 2 SP | `b4057cf` |
| BUG-017 | Google OAuth callback showed raw JSON | `googleCallback` returned through `ResponseInterceptor` | Changed to `@Res()` redirect to `${FRONTEND_URL}/callback`; created `/callback` Next.js page | 3 SP | `9c0970a` |
| **Unplanned total** | | | | **30 SP** | |

**Sprint total (planned + unplanned): 51 SP**

---

## Sprint Review

**Date:** 2026-04-28  
**Attendees:** Shahid Awan (Developer / Product Owner)

**What was planned:** Containerisation and CI/CD pipeline (21 SP).  
**What actually shipped:** Containerisation + CI/CD + 17 production bugs resolved (51 SP total).  
**Outcome:** Full end-to-end flow validated — register → login → scan → detect → estimate → report → download. Google OAuth login working. All five services healthy in Docker.

### Demo checklist (all passed ✅)

- [x] `docker-compose up --build` brings all 5 services up cleanly
- [x] Register new user → auto-login → land on dashboard
- [x] Upload vehicle image → trigger AI detection → view detected parts
- [x] Trigger cost estimate → view line items in PKR
- [x] Generate PDF report → download report from scan detail page
- [x] Download report from Reports list page
- [x] Login via Google OAuth → land on dashboard
- [x] API health check returns `{ status: "ok" }` at `GET /api/health`
- [x] GitHub Actions CI runs on push to master

---

## Sprint Retrospective

### What Went Well

- Docker Compose service structure was correctly designed from the start — internal vs external URL pattern (`APP_URL` vs `APP_INTERNAL_URL`) solved inter-service image fetching cleanly
- Systematic bug-bash approach: each fix was isolated to its own commit, making the root cause traceable
- All 17 bugs were found and fixed within the sprint window without carrying anything forward

### What Went Wrong

- No end-to-end test suite existed before Docker integration — all 17 bugs had to be found manually by walking through the UI
- Unplanned bug work consumed ~60% of the sprint (30 of 51 SP) — initial estimates did not account for integration testing time
- Environment variable documentation was incomplete; `APP_INTERNAL_URL`, `PUPPETEER_EXECUTABLE_PATH`, and `FRONTEND_URL` were undiscovered until integration failures surfaced them

### Action Items

| # | Action | Owner | Target Sprint |
|---|--------|-------|---------------|
| A9-1 | Write an E2E smoke test script that covers the critical path (register → scan → estimate → report download) to catch regressions before they reach manual testing | Shahid Awan | Sprint 11 |
| A9-2 | Document all required environment variables in `.env.example` with descriptions — no variable should be undiscovered at runtime | Shahid Awan | Sprint 10 (before next Docker build) |
| A9-3 | Add integration testing guidelines to `docs/DEFINITION_OF_DONE.md` — all new endpoints must be tested in Docker before the story is closed | Shahid Awan | Sprint 10 |

---

## Environment Variables Introduced This Sprint

| Variable | Service | Purpose | Default |
|----------|---------|---------|---------|
| `APP_URL` | API | External base URL for stored image paths | `http://localhost:3001` |
| `APP_INTERNAL_URL` | API | Docker-internal URL for AI service to fetch images | `http://api:3001` |
| `FRONTEND_URL` | API | Frontend URL for OAuth redirect | `http://localhost:3000` |
| `PUPPETEER_EXECUTABLE_PATH` | API | Path to system Chromium binary | `/usr/bin/chromium-browser` |
| `PUPPETEER_SKIP_DOWNLOAD` | API | Prevent Puppeteer bundling its own Chrome | `true` |
| `AI_SERVICE_INTERNAL_KEY` | API + AI | Shared secret for internal API calls | `wreckify_internal_key_change_me` |
