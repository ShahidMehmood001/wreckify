# Sprint 10 — MVP Completion & UX Polish

**Status:** IN PROGRESS 🔄  
**Start date:** 2026-04-28  
**Target end date:** TBD  
**Sprint type:** Feature completion + UX improvements

---

## Sprint Goal

Complete the remaining PRD MVP features (admin panel, workshop inquiry flow, guest scan), fix outstanding UX gaps discovered during Sprint 9 testing, and leave the product in a fully demo-ready state.

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
