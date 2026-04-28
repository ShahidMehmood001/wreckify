# Sprint 9 — DevOps, CI/CD & Stabilisation

**Status:** CLOSED ✅  
**Start date:** 2026-04-20  
**End date:** 2026-04-28  
**Sprint type:** DevOps + Bug Bash

---

## Sprint Goal

Containerise all five services with Docker, wire them together with Docker Compose, set up GitHub Actions CI, and validate the full end-to-end product flow in a production-like environment.

---

## Stories Delivered

| ID | Story | Commit |
|----|-------|--------|
| S9-001 | Docker Compose with all 5 services (postgres, api, ai-service, scraper, web) | `7b5cfc7` |
| S9-002 | Dockerfile for NestJS API (Alpine, Prisma migrate on start, seed on start) | `7b5cfc7` |
| S9-003 | Dockerfile for Next.js web (multi-stage, standalone output) | `7b5cfc7` |
| S9-004 | Dockerfile for Python AI service (CPU-only PyTorch, Debian Trixie fixes) | `7b5cfc7` |
| S9-005 | Dockerfile for Scrapy scraper | `7b5cfc7` |
| S9-006 | GitHub Actions CI pipeline (lint, build, test on push/PR to master) | `7b5cfc7` |
| S9-007 | NestJS health check endpoint (`GET /api/health`) via `@nestjs/terminus` | `bdb0482` |
| S9-008 | Fix all API calls in frontend to use `/api` global prefix | `5ae6334` |

---

## Bugs Found & Fixed During End-to-End Testing

All bugs below were discovered during post-sprint testing of the full Docker environment.

| ID | Description | Root Cause | Fix | Commit |
|----|-------------|------------|-----|--------|
| BUG-001 | API container unhealthy — no health endpoint existed | Missing `/api/health` route | Added `@nestjs/terminus` health module | `bdb0482` |
| BUG-002 | Auto-login broken after register — API calls returned 401 | `ResponseInterceptor` wraps all responses; frontend was reading `res.data.user` instead of `res.data.data.user` | Added response envelope unwrapper to axios interceptor | `bdb0482` |
| BUG-003 | Token refresh stored `undefined` — user logged out after 15 min | Refresh response also envelope-wrapped; code read `data.accessToken` instead of `data.data.accessToken` | Fixed refresh handler to use `data.data ?? data` | `bdb0482` |
| BUG-004 | Dashboard redirected to login on hard refresh | Zustand `persist` hydration is async; auth check ran before store was ready | Added `_hasHydrated` flag + `onRehydrateStorage` callback; dashboard waits for hydration | `bdb0482` |
| BUG-005 | Stale tokens stored in Zustand `persist` | `accessToken`/`refreshToken` were in the persisted store but should only live in `localStorage` | Removed tokens from Zustand interface entirely | `bdb0482` |
| BUG-006 | Image upload returned 500 | Controller expected JSON body with image URLs; should accept `multipart/form-data` | Added `FilesInterceptor` with multer `diskStorage`; API serves uploads via `NestExpressApplication` + `useStaticAssets` | `efd9992` |
| BUG-007 | AI detection returned 500 — could not fetch images | AI service ran inside Docker and tried to fetch images from `localhost` (itself), not the API container | Added `APP_INTERNAL_URL=http://api:3001`; `triggerDetection` rewrites image URLs to internal URL before passing to AI service | `efd9992` |
| BUG-008 | Cost estimate returned 400 on retry; line items showed wrong field names; estimate response missing relations | Three issues: early return returned bare `costEstimate` not full scan; line items stored as snake_case from AI response but DB expects camelCase; final return was `prisma.costEstimate.create` not full scan | Fixed early return to call `getScanOrThrow`; mapped snake_case → camelCase for line items; changed final return to `getScanOrThrow` | `efd9992` |
| BUG-009 | Scan wizard crashed with `TypeError: Cannot read properties of undefined (reading 'length')` | `scan.detectedParts` was accessed without null guard; could be `undefined` if API response omitted the field | Added `?? []` fallback on all three access sites in `scan/page.tsx` | `a2bfc0e` |
| BUG-010 | Images not displaying on scan detail page | `img.url` is stored as an absolute URL (`http://localhost:3001/uploads/...`) but the frontend was prepending `NEXT_PUBLIC_API_URL` again | Changed `src` to use `img.url` directly | `a2bfc0e` |
| BUG-011 | Report generation returned 500 | Puppeteer bundled Chrome requires glibc; Alpine uses musl libc | Installed `chromium` via `apk` in Dockerfile runner stage; set `PUPPETEER_SKIP_DOWNLOAD=true`; wired `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser` via docker-compose | `0f33d7b` |
| BUG-012 | Cost line items showed `NaN` in generated PDF | Report template read `item.parts_min` (snake_case) but DB stores `partsMin` (camelCase) after BUG-008 fix | Fixed field names in `report.template.ts` | `0f33d7b` |
| BUG-013 | Report download returned 404 — wrong URL | Frontend built download URL without `/api` prefix (`/reports/files/...` instead of `/api/reports/files/...`) | Added `/api` segment to the `window.open` URL | `232bd52` |
| BUG-014 | Report download returned 401 | `window.open` opens a plain browser tab with no `Authorization` header; JWT guard rejected it | Replaced `window.open` with `api.get(..., { responseType: 'blob' })` + temporary object-URL anchor click on scan detail page | `173541d` |
| BUG-015 | Generated PDF disappeared after API container rebuild | `generated-reports/` directory was ephemeral (not in a Docker volume) | Added `api_reports:/app/generated-reports` named volume to docker-compose | `4260a5a` |
| BUG-016 | Reports list page download also returned 401/404 | Same `window.open` pattern as BUG-014 on `reports/page.tsx` | Same blob download fix applied to Reports page; added per-report loading spinner | `b4057cf` |
| BUG-017 | Google OAuth callback showed raw JSON in browser | `googleCallback` returned service result which passed through `ResponseInterceptor` as JSON | Changed to `@Res()` redirect to `${FRONTEND_URL}/callback?accessToken=...&refreshToken=...`; created `/callback` Next.js page to consume tokens and redirect to dashboard | `9c0970a` |

---

## Sprint Review

**What was planned:** Containerisation and CI/CD.  
**What was discovered:** 17 bugs across the full end-to-end flow that were not visible before Docker integration testing.  
**Outcome:** All bugs resolved. Full flow validated — register → login → scan → detect → estimate → report → download. Google OAuth login working.

---

## Sprint Retrospective

| | Notes |
|--|-------|
| **What went well** | Docker Compose structure was solid; service communication pattern (internal vs external URLs) was correctly designed |
| **What went wrong** | No end-to-end test suite existed; bugs had to be found manually by testing the UI |
| **Actions for Sprint 10** | Add E2E smoke test script; document all environment variables explicitly |

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
