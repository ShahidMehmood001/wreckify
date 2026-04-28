# Sprint 10 — MVP Completion & UX Polish

**Status:** IN PROGRESS 🔄  
**Start date:** 2026-04-28  
**Target end date:** TBD  
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
**Status:** TODO

**Acceptance criteria:**
- [ ] A `guestSessionId` (UUID) is generated and persisted in `localStorage` on first visit to `/`
- [ ] Landing page upload form calls `POST /scans/guest`, then `POST /scans/:id/images`, then `POST /scans/:id/detect` in sequence
- [ ] Scan results (detected parts + cost estimate) are displayed inline on the landing page without navigating away
- [ ] After results, a prompt appears: "Register to save your report and get 3 free scans/month"
- [ ] If the guest has already used their 1 free scan (same `guestSessionId`), show a message and prompt to register
- [ ] No authenticated-only API calls are made — guest endpoints only

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
| S10-008 | Guest Scan Flow | 8 SP | TODO |
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

### S10-008 — Guest Scan Flow on Landing Page
**Status:** TODO  
**Assignee:** Full Stack Developer  
**Description:**  
Per PRD section 4.1 and 6, guests should be able to run 1 free scan per session without registering. The `POST /scans/guest` backend endpoint already exists and enforces 1 scan per `guestSessionId`. The landing page (`/`) exists but the guest scan upload UI is not wired to the backend.  
**Scope:**
- Generate a `guestSessionId` (UUID) and store in `localStorage` on first visit
- Wire the landing page upload form to `POST /scans/guest`, then `POST /scans/:id/images`, then `POST /scans/:id/detect`
- Show results inline on the landing page
- After results, show a prompt: "Register to save your report and get 3 free scans/month"

---

## Definition of Done (Sprint 10)

See [`docs/DEFINITION_OF_DONE.md`](../DEFINITION_OF_DONE.md) for the full project-wide checklist.

Sprint-specific requirements:
- [ ] All "In Progress / Planned" stories above are completed and tested
- [ ] No console errors on any page in Docker production build
- [ ] Admin panel fully functional for all three admin roles (user management, workshop approval, scraper health)
- [ ] Guest can complete a scan on the landing page without registering
- [ ] All API endpoints for new features documented in Swagger
- [ ] Sprint retrospective written and this document updated to CLOSED

---

## Notes for Developers

- All API responses are wrapped: `{ success: true, data: {...} }` — the axios interceptor in `apps/web/src/lib/api.ts` unwraps them automatically
- Docker volumes: `api_uploads` (images), `api_reports` (PDFs), `postgres_data`, `ai_weights`
- Run `docker-compose up --build` to rebuild all services; use `--no-cache` if source changes are not picked up
- See `docs/sprints/SPRINT_09.md` for the full list of environment variables and their purpose
- See `docs/DEFINITION_OF_DONE.md` for the full Definition of Done checklist
