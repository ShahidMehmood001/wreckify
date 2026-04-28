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
**Status:** TODO

**Acceptance criteria:**
- [ ] "Total Scans" card shows `subscription.scansUsed` (monthly count) — not `scans.length` which is capped at 5
- [ ] The number displayed matches what the API reports for the current billing period
- [ ] No additional network request required if `subscription` is already loaded on the dashboard

---

#### S10-005 — Dashboard: Greet User by First Name

**Estimate:** 1 SP  
**Status:** TODO

**Acceptance criteria:**
- [ ] Dashboard greeting shows `profile.firstName` when available
- [ ] Falls back to `user.email.split("@")[0]` if `firstName` is not set
- [ ] First name is loaded via `GET /users/profile` on dashboard mount — not assumed to be in the Zustand `user` object
- [ ] No visible flash of email-derived name before first name loads (show nothing or a skeleton)

---

#### S10-006 — Admin Panel: Audit and Complete

**Estimate:** 5 SP  
**Status:** TODO

**Acceptance criteria:**
- [ ] User list loads and displays all registered users with their role
- [ ] Admin can change a user's role from the user list
- [ ] Workshop approval queue shows pending workshops; approve/reject buttons work end-to-end
- [ ] Scraper monitoring section shows last run timestamp and total record count from `scraper_logs`
- [ ] Platform analytics numbers (total users, total scans, total workshops) are correct
- [ ] No 4xx/5xx errors in browser Network tab when navigating the admin panel
- [ ] All admin API endpoints covered by a `RolesGuard` requiring `ADMIN` role

---

#### S10-007 — Workshop Inquiry Flow

**Estimate:** 8 SP  
**Status:** TODO

**Acceptance criteria:**
- [ ] `WorkshopInquiry` model added to Prisma schema with fields: `id`, `workshopId`, `userId`, `scanId?`, `message`, `createdAt`
- [ ] `POST /workshops/:id/inquiries` — authenticated vehicle owner sends an inquiry; returns created inquiry
- [ ] `GET /workshops/:id/inquiries` — workshop owner (or admin) retrieves incoming inquiries for their workshop
- [ ] "Send Inquiry" button appears on workshop cards on the Workshops directory page
- [ ] Clicking "Send Inquiry" opens a modal with a message field and optional scan selector
- [ ] Success toast shown after inquiry submitted; button disabled while submitting
- [ ] Workshop owner can view their inquiries on a dedicated page or within their dashboard

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
| S10-004 | Dashboard: Fix Total Scans Stat | 1 SP | TODO |
| S10-005 | Dashboard: Greet by First Name | 1 SP | TODO |
| S10-006 | Admin Panel Audit | 5 SP | TODO |
| S10-007 | Workshop Inquiry Flow | 8 SP | TODO |
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

### S10-004 — Dashboard: Fix Total Scans stat card
**Status:** TODO  
**Assignee:** Frontend Developer  
**Description:**  
The "Total Scans" stat card on the dashboard shows `scans.length` which is capped at 5 because the same array is sliced for the "Recent Scans" list. The number shown is meaningless for users with more than 5 scans.  
**Fix:** Use `subscription.scansUsed` for the monthly count (already loaded), and either add a `GET /scans/count` endpoint or fetch all scans without slicing for the stat.

---

### S10-005 — Dashboard: Greet user by first name
**Status:** TODO  
**Assignee:** Frontend Developer  
**Description:**  
Dashboard greeting shows `user.email.split("@")[0]` (e.g. `shahid.ceative`) because `user` in the Zustand store only contains `{ id, email, role }`. The user's first name is not loaded on the dashboard.  
**Fix:** On dashboard mount, call `GET /users/profile` and use `profile.firstName` if available, otherwise fall back to the email prefix.

---

### S10-006 — Admin Panel: Audit and complete
**Status:** TODO  
**Assignee:** Full Stack Developer  
**Description:**  
The admin page (`/admin`) was implemented in Sprint 8 but has not been tested since Docker integration. Needs a full audit:
- User list and role management — does it load and work?
- Workshop approval/rejection workflow — does it function end-to-end?
- Scraper monitoring section — does it show last run status and record counts?
- Platform analytics — are the numbers correct?
- Any API endpoints missing or returning errors?

---

### S10-007 — Workshop Inquiry Flow
**Status:** TODO  
**Assignee:** Full Stack Developer  
**Description:**  
Per PRD section 6.9, vehicle owners should be able to send a repair inquiry to a workshop directly from a scan result. Currently the workshops page only displays listings — there is no inquiry button, no inquiry data model, and no backend endpoint.  
**Scope:**
- Add `WorkshopInquiry` model to Prisma schema
- `POST /workshops/:id/inquiries` — owner sends inquiry (scan ID + message)
- `GET /workshops/:id/inquiries` — workshop owner sees incoming inquiries
- Frontend: "Send Inquiry" button on workshop card (visible after completing a scan)

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
