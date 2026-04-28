# Sprint 10 — MVP Completion & UX Polish

**Status:** CLOSED ✅  
**Start date:** 2026-04-28  
**Target end date:** 2026-04-28  
**Actual end date:** 2026-04-28  
**Velocity:** 30 SP (8 stories delivered)
**Sprint type:** Feature completion + UX improvements

---

## Sprint Goal

Complete the remaining PRD MVP features (admin panel, workshop inquiry flow, guest scan), fix outstanding UX gaps discovered during Sprint 9 testing, and leave the product in a fully demo-ready state.

---

## Sprint Planning

**Team capacity:** 1 developer  
**Carry-over from Sprint 9 action items:** A9-2 (document env vars) and A9-3 (update DoD) to be addressed during this sprint

### Story Estimates & Acceptance Criteria

#### S10-001 — Custom AI Provider Settings UX ✅ DONE

**Estimate:** 3 SP  
**Commit:** `f554a70`

**Acceptance criteria:**
- [x] FREE plan users see a locked card with an upgrade message — no API key form shown
- [x] PRO+ users see a form pre-filled with their saved `provider` and `model` from `GET /users/ai-config`
- [x] `apiKey` field shows a "API key configured ✓" badge if `hasKey: true`; otherwise shows a placeholder input
- [x] `PATCH /users/ai-config` accepts `apiKey` as optional — omitting it does not clear the stored key
- [x] `GET /users/ai-config` endpoint exists and returns `{ provider, model, hasKey }` without exposing the raw key
- [x] Section heading uses plain-English label ("Custom AI Provider"), not the acronym "BYOK"

---

#### S10-002 — Profile View / Edit Mode ✅ DONE

**Estimate:** 2 SP  
**Commit:** `b7f8f59`

**Acceptance criteria:**
- [x] Profile section shows read-only values (`firstName`, `lastName`, `phone`) by default
- [x] "Edit" button switches to an editable form
- [x] "Cancel" discards unsaved changes and reverts to last saved values
- [x] "Save" calls `PATCH /users/profile` and shows a success toast
- [x] Form is pre-filled from `GET /users/profile` on mount (reads `data.profile.firstName`, not `data.firstName`)

---

#### S10-003 — Google OAuth Callback Redirect ✅ DONE

**Estimate:** 2 SP  
**Commit:** `9c0970a`

**Acceptance criteria:**
- [x] After Google consent, browser lands on `/callback?accessToken=...&refreshToken=...`, not a JSON response
- [x] `/callback` page stores tokens in `localStorage`, calls `GET /auth/me`, stores user in Zustand, redirects to `/dashboard`
- [x] If tokens are missing or `/auth/me` fails, `/callback` redirects to `/login`
- [x] No `useSearchParams()` hydration error — component wrapped in `<Suspense>`

---

#### S10-004 — Dashboard: Fix Total Scans Stat Card

**Estimate:** 1 SP  
**Status:** ✅ DONE  
**Commit:** `2526531`

**Acceptance criteria:**
- [x] Full scan list fetched on mount; `totalScans` state holds true lifetime count
- [x] Recent Scans list still sliced to 5 items
- [x] Total Scans card shows `—` while loading, then the correct count
- [x] No extra network request — reuses the existing `GET /scans` call

---

#### S10-005 — Dashboard: Greet User by First Name

**Estimate:** 1 SP  
**Status:** ✅ DONE  
**Commit:** `2526531`

**Acceptance criteria:**
- [x] Dashboard greeting shows `profile.firstName` when available
- [x] Falls back to `user.email.split("@")[0]` if `firstName` is not set
- [x] First name loaded via `GET /users/profile` on dashboard mount — not assumed to be in Zustand store

---

#### S10-006 — Admin Panel: Audit and Complete

**Estimate:** 5 SP  
**Status:** ✅ DONE  
**Commit:** `3bdf529`

**Acceptance criteria:**
- [x] User list loads correctly — fixed critical bug where `listUsers` returns `{ users, total }` but frontend was reading `r.data` as an array
- [x] Admin can change a user's role and activate/deactivate users
- [x] Workshop approval queue shows all workshops with approve/reject dropdown
- [x] Scraper monitoring shows last 10 runs with timestamp, record count, and error message
- [x] Analytics stat cards show accurate numbers from `GET /admin/analytics` (users, scans, reports, workshops)
- [x] Loading skeletons shown while data loads; empty states shown when lists are empty
- [x] Non-admin users redirected to `/dashboard` on mount (frontend guard); backend `RolesGuard` already required `ADMIN` role

---

#### S10-007 — Workshop Inquiry Flow

**Estimate:** 8 SP  
**Status:** ✅ DONE  
**Commit:** `87f35f7`

**Acceptance criteria:**
- [x] `RepairInquiry` model already in Prisma schema (`repair_inquiries` table) with `id`, `workshopId`, `senderId`, `scanId?`, `message`, `status`, `createdAt`
- [x] `POST /workshops/:id/inquiries` — OWNER role sends inquiry; already implemented in backend
- [x] `GET /workshops/my/inquiries` — MECHANIC gets incoming inquiries for their workshop; already implemented
- [x] "Send Inquiry" button on each workshop card, visible to OWNER role users only
- [x] Dialog opens with optional scan selector (filtered to COMPLETED scans) and message textarea
- [x] Success toast after submit; button shows "Sending…" and is disabled during request
- [x] MECHANIC users see "Incoming Inquiries" section at top of workshops page with status badges and Close action
- [x] Fixed `RespondInquiryDto.message` to be optional — closing an inquiry should not require a message

---

#### S10-008 — Guest Scan Flow on Landing Page

**Estimate:** 8 SP  
**Status:** ✅ DONE  
**Commit:** `95d0936`

**Acceptance criteria:**
- [x] `guestSessionId` generated via `crypto.randomUUID()` and persisted in `localStorage` on first visit
- [x] Landing page calls `POST /scans/guest` → `POST /scans/:id/images/guest` → `POST /scans/:id/detect/guest` in sequence
- [x] Backend: added `addImagesGuest` and `triggerDetectionGuest` service methods with `getGuestScanOrThrow` validating `isGuest + guestSessionId` ownership
- [x] Backend: two new `@Public()` endpoints in controller — multipart image upload and JSON detect
- [x] Detected parts shown inline with part name, severity badge, and confidence percentage
- [x] Post-result CTA: "Create Free Account" links to `/register`; "Scan another photo" resets the flow
- [x] 403 / limit-reached response shows dedicated screen: "You've used your free guest scan" with register prompt
- [x] All calls use guest-only endpoints — no JWT required

---

### Sprint Commitment Summary

| ID | Story | Estimate | Status |
|----|-------|----------|--------|
| S10-001 | Custom AI Provider Settings UX | 3 SP | ✅ Done |
| S10-002 | Profile View / Edit Mode | 2 SP | ✅ Done |
| S10-003 | Google OAuth Callback Redirect | 2 SP | ✅ Done |
| S10-004 | Dashboard: Fix Total Scans Stat | 1 SP | ✅ Done |
| S10-005 | Dashboard: Greet by First Name | 1 SP | ✅ Done |
| S10-006 | Admin Panel Audit | 5 SP | ✅ Done |
| S10-007 | Workshop Inquiry Flow | 8 SP | ✅ Done |
| S10-008 | Guest Scan Flow | 8 SP | ✅ Done |
| **Total** | | **30 SP** | |

---

## Stories Completed

| ID | Story | Description | Commit |
|----|-------|-------------|--------|
| S10-001 | Custom AI Provider settings UX | Renamed BYOK section to plain English; FREE plan users see locked card with upgrade prompt; PRO+ see form pre-filled from saved config; green "API key configured ✓" badge; key field adapts based on `hasKey` state. Added `GET /users/ai-config` backend endpoint. Made `apiKey` optional on update. | `f554a70` |
| S10-002 | Profile view/edit mode | Profile card now shows read-only values by default with an Edit button; switches to editable form on click; Cancel resets to last saved values; fixed pre-existing bug where profile data was read from wrong response path (`r.data.firstName` → `r.data.profile.firstName`) | `b7f8f59` |
| S10-003 | Google OAuth callback redirect | Fixed OAuth flow returning raw JSON in browser; API now redirects to `${FRONTEND_URL}/callback?accessToken=...&refreshToken=...`; new `/callback` page stores tokens, fetches user via `/auth/me`, and navigates to dashboard | `9c0970a` |

---

## Stories In Progress / Planned

### S10-004 — Dashboard: Fix Total Scans stat card ✅
**Status:** DONE — `2526531`

---

### S10-005 — Dashboard: Greet user by first name ✅
**Status:** DONE — `2526531`

---

### S10-006 — Admin Panel: Audit and complete ✅
**Status:** DONE — `3bdf529`

---

### S10-007 — Workshop Inquiry Flow ✅
**Status:** DONE — `87f35f7`

---

### S10-008 — Guest Scan Flow on Landing Page ✅
**Status:** DONE — `95d0936`

---

## Definition of Done (Sprint 10)

See [`docs/DEFINITION_OF_DONE.md`](../DEFINITION_OF_DONE.md) for the full project-wide checklist.

Sprint-specific requirements:
- [x] All stories completed and tested
- [x] Admin panel functional (user management, workshop approval, scraper health, analytics)
- [x] Guest can complete a scan on the landing page without registering
- [x] New API endpoints documented in Swagger (`GET /users/ai-config`, guest image + detect endpoints)
- [ ] No console errors on any page in Docker production build — requires rebuild to verify
- [x] Sprint retrospective written and document updated to CLOSED

---

## Sprint Review

**Date:** 2026-04-28  
**Attendees:** Shahid Awan (Developer / Product Owner)

**Sprint goal:** Complete remaining PRD MVP features and leave product demo-ready.  
**Result:** ✅ Goal met — all 8 stories delivered, 30 SP.

### Demo checklist (all passed ✅)

- [x] Settings → Custom AI Provider: FREE plan shows locked card; PRO shows form with key badge
- [x] Settings → Profile: read-only by default, edit mode on click, cancel resets
- [x] Google OAuth: consent → `/callback` → dashboard (no raw JSON)
- [x] Dashboard: Total Scans shows true lifetime count; greeting uses first name
- [x] Admin panel: user list, role change, activate/deactivate, workshop approval, scraper logs, analytics
- [x] Workshops page: "Send Inquiry" button → dialog → OWNER submits inquiry
- [x] Workshops page: MECHANIC sees incoming inquiries with Close action
- [x] Landing page: upload photo → AI detects damage → results shown inline → register CTA
- [x] Landing page: repeat guest visit shows "used your free scan" screen with register prompt

---

## Sprint Retrospective

### What Went Well

- All 8 planned stories delivered in a single sprint day — clean scope and clear acceptance criteria made execution fast
- Backend was more complete than expected: inquiry endpoints, guest scan endpoint, and the full admin service were all already implemented from Sprint 8, reducing S10-007 and S10-006 to mostly frontend + bug fix work
- Sprint documentation (DoD, acceptance criteria, story points) written before code — made the work measurable

### What Went Wrong

- Two bugs found during story work: `listUsers` returning `{ users, total }` object instead of array (crashed admin panel), and `RespondInquiryDto.message` being required (blocked inquiry close action)
- The guest scan needed two new backend endpoints not originally scoped — `POST :id/images/guest` and `POST :id/detect/guest` — because the existing image/detect endpoints require JWT

### Action Items

| # | Action | Owner | Target Sprint |
|---|--------|-------|---------------|
| A10-1 | Rebuild Docker and smoke-test all Sprint 10 features in the containerised environment | Shahid Awan | Before Sprint 11 |
| A10-2 | Write E2E smoke test covering guest scan flow (from Sprint 9 action item A9-1) | Shahid Awan | Sprint 11 |

---

## Post-Sprint Bugs (found during A10-1 smoke test)

These bugs were found after the sprint was closed, during Docker smoke testing. They were raised, approved, and fixed before Sprint 11 began.

| ID | Description | Root Cause | Fix | Commit |
|----|-------------|------------|-----|--------|
| BUG-018 | ADMIN user lands on owner scan dashboard after login — irrelevant scan stats, "New Scan" CTA | No role-based redirect on `/dashboard`; all authenticated users went to the same page | Added `user.role === "ADMIN"` check in dashboard `useEffect` that redirects to `/admin` | `0636da7` |
| BUG-019 | Unlimited plans (Pro, Workshop, Insurance, Enterprise) show `-1 scans/month` and `0/-1` in dashboard and settings | DB uses `-1` as sentinel for unlimited; UI rendered it raw | Added `unlimited = scansTotal === -1` flag; replaced raw values with "Unlimited" / "Unlimited scans/month"; hidden progress bar for unlimited plans | `0636da7` |
| BUG-020 | Role dropdown in admin user list is transparent — text unreadable against page background | `popover` colour token missing from `tailwind.config.ts`; `bg-popover` and `text-popover-foreground` generated no CSS, leaving `SelectContent` background transparent | Added `popover` and `popover.foreground` to Tailwind theme colours | `e55be60` |

---

## Notes for Developers

- All API responses are wrapped: `{ success: true, data: {...} }` — the axios interceptor in `apps/web/src/lib/api.ts` unwraps them automatically
- Docker volumes: `api_uploads` (images), `api_reports` (PDFs), `postgres_data`, `ai_weights`
- Run `docker-compose up --build` to rebuild all services; use `--no-cache` if source changes are not picked up
- See `docs/sprints/SPRINT_09.md` for the full list of environment variables and their purpose
- See `docs/DEFINITION_OF_DONE.md` for the full Definition of Done checklist
