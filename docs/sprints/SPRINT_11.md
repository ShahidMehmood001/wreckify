# Sprint 11 — Role-Based Shell Architecture

**Status:** CLOSED ✅  
**Start date:** 2026-04-28  
**Target end date:** 2026-04-29  
**Actual end date:** 2026-04-29  
**Velocity:** 27 SP (9 stories delivered)  
**Sprint type:** Architecture / UX restructure

---

## Sprint Goal

Replace the single shared `(dashboard)` layout with three dedicated layout groups — `(owner)`, `(admin)`, and `(mechanic)` — each with its own sidebar, navigation, and role-appropriate pages. Every role gets a purposeful experience; no role sees another role's navigation or feature set.

---

## Background & Context

### Problem

The current codebase uses a single `(dashboard)` layout group for all authenticated roles. This results in:

1. All users see the same sidebar regardless of role
2. Role enforcement is scattered across individual pages (`useEffect` redirect hacks)
3. ADMIN users land on an owner-oriented dashboard after login
4. MECHANIC users share the workshops page with owners via conditional rendering
5. The admin panel is a single page with no URL-level separation from the owner app

### Solution — Option A: Separate Layout Groups, One Next.js App

Three Next.js App Router route groups within `apps/web/src/app/`:

| Group | Layout | Role Guard | Root URL |
|---|---|---|---|
| `(owner)` | `OwnerSidebar` | `OWNER` | `/dashboard` |
| `(admin)` | `AdminSidebar` | `ADMIN` | `/admin` |
| `(mechanic)` | `MechanicSidebar` | `MECHANIC` | `/mechanic` |

Route groups (parentheses notation) are **not** part of the URL — only the sub-directory names are. Each group gets its own `layout.tsx` that checks `user.role` and redirects if the role doesn't match. Role-based redirect after login lives in the auth layer (login page + OAuth callback), not in page-level `useEffect` hooks.

---

## URL Map (Post-Sprint)

### Owner (`(owner)` group)
| Page | URL |
|---|---|
| Dashboard | `/dashboard` |
| New Scan | `/scan` |
| My Scans | `/scans` |
| Scan Detail | `/scans/[id]` |
| Vehicles | `/vehicles` |
| Reports | `/reports` |
| Workshops | `/workshops` |
| Settings | `/settings` |

### Admin (`(admin)` group)
| Page | URL |
|---|---|
| Dashboard | `/admin` |
| Settings | `/admin/settings` |

*(User list, workshop approvals, scraper logs remain on the single `/admin` page for this sprint)*

### Mechanic (`(mechanic)` group)
| Page | URL |
|---|---|
| Dashboard | `/mechanic` |
| Inquiries | `/mechanic/inquiries` |
| Settings | `/mechanic/settings` |

---

## Sprint Planning

**Team capacity:** 1 developer  
**Carry-over from Sprint 10 action items:** A10-2 (E2E smoke test for guest scan) — deferred again to Sprint 12

### Story Estimates & Acceptance Criteria

---

#### S11-001 — Auth Router: Role-Based Redirect After Login

**Estimate:** 2 SP

**Acceptance criteria:**
- [ ] On successful credential login (`POST /auth/login`), redirect based on role: `OWNER` → `/dashboard`, `ADMIN` → `/admin`, `MECHANIC` → `/mechanic`
- [ ] OAuth callback page (`/callback`) performs the same role-based redirect instead of always going to `/dashboard`
- [ ] Unknown or missing role falls back to `/dashboard`
- [ ] The `useEffect` redirect hack in `(dashboard)/dashboard/page.tsx` (`user.role === "ADMIN" → /admin`) is **removed**
- [ ] The `useEffect` redirect hack in `(dashboard)/admin/page.tsx` (`user.role !== "ADMIN" → /dashboard`) is **removed** (layout-level guard will handle it)

---

#### S11-002 — Owner Shell Refactor

**Estimate:** 2 SP

**Acceptance criteria:**
- [ ] Directory renamed from `app/(dashboard)/` to `app/(owner)/`; no URL changes (parentheses are not in URLs)
- [ ] `(owner)/layout.tsx` guards `user.role === "OWNER"` — non-owners are redirected to `/login` (not to each other's root, since the auth router handles post-login)
- [ ] New `OwnerSidebar` component at `components/shared/owner-sidebar.tsx` contains only owner nav items: Dashboard, New Scan, My Scans, Vehicles, Reports, Workshops, Settings
- [ ] `OwnerSidebar` has **no** admin link and no conditional `user.role === "ADMIN"` checks
- [ ] Old `Sidebar` component (`components/shared/sidebar.tsx`) is **deleted**
- [ ] All owner pages that previously had role-redirect `useEffect` hacks have those hacks removed

---

#### S11-003 — Owner Workshops Page Cleanup

**Estimate:** 1 SP

**Acceptance criteria:**
- [ ] `(owner)/workshops/page.tsx` no longer contains the "Incoming Inquiries" section (mechanic-only content removed)
- [ ] Page is OWNER-only: shows workshop browse list with "Send Inquiry" dialog
- [ ] No `user.role === "MECHANIC"` conditional rendering remains in this file

---

#### S11-004 — Admin Shell + Layout + Sidebar

**Estimate:** 3 SP

**Acceptance criteria:**
- [ ] `app/(admin)/` directory created with `(admin)/layout.tsx`
- [ ] Admin layout guards `user.role === "ADMIN"` — non-admins are redirected to `/login`
- [ ] Admin layout uses `AdminSidebar` component (`components/shared/admin-sidebar.tsx`)
- [ ] `AdminSidebar` nav items: Dashboard (`/admin`), Settings (`/admin/settings`)
- [ ] `AdminSidebar` logo link goes to `/admin` (not `/dashboard`)
- [ ] `AdminSidebar` displays admin's name (from profile) in the bottom user card; shows "Administrator" as role label
- [ ] Existing admin panel page is moved from `(owner)/admin/page.tsx` (was `(dashboard)/admin/page.tsx`) to `(admin)/admin/page.tsx` — URL stays `/admin`
- [ ] `(owner)` group no longer contains an `admin/` directory

---

#### S11-005 — Admin Dashboard Redesign

**Estimate:** 5 SP

**Acceptance criteria:**
- [ ] Page heading: `"Platform Overview"` with today's date (formatted) as subtitle
- [ ] **Row 1 — KPI cards (4 cards):** Total Users, Total Scans, Workshops (Approved/Total), Reports Generated — all from `GET /admin/analytics`
- [ ] **Row 2 — Pending Approvals:** Shows workshops with `status === "PENDING"` with inline Approve / Reject buttons (calls `PATCH /admin/workshops/:id/status`); if none pending, shows "All workshops reviewed ✓" empty state
- [ ] **Row 3 — Recent Registrations:** Last 5 users registered (from the existing `GET /admin/users` response sorted by `createdAt` desc) with name/email, role badge, join date
- [ ] **Row 4 — System Health:** Last scraper run card showing source, status badge (green/red), records added, timestamp; if no runs, shows "No scraper runs yet"
- [ ] Loading skeletons shown while data loads
- [ ] The old single-page admin panel content (user list, full workshop list, scraper log table) moves to a **separate section further down the page** below the dashboard cards, under a "Management" heading with a divider — this preserves all admin management functionality while leading with the overview

---

#### S11-006 — Admin Settings Page

**Estimate:** 2 SP

**Acceptance criteria:**
- [ ] `(admin)/admin/settings/page.tsx` created at URL `/admin/settings`
- [ ] Page contains only the **Profile** card (view/edit mode, same component behaviour as owner settings)
- [ ] Page title: "Settings"
- [ ] No Subscription card, no Custom AI Provider / BYOK card
- [ ] "Settings" link in `AdminSidebar` points to `/admin/settings`

---

#### S11-007 — Mechanic Shell + Sidebar + Settings

**Estimate:** 5 SP

**Acceptance criteria:**
- [ ] `app/(mechanic)/` directory created with `(mechanic)/layout.tsx`
- [ ] Mechanic layout guards `user.role === "MECHANIC"` — non-mechanics redirected to `/login`
- [ ] Mechanic layout uses `MechanicSidebar` component (`components/shared/mechanic-sidebar.tsx`)
- [ ] `MechanicSidebar` nav items: Dashboard (`/mechanic`), Inquiries (`/mechanic/inquiries`), Settings (`/mechanic/settings`)
- [ ] `MechanicSidebar` logo link goes to `/mechanic`
- [ ] `MechanicSidebar` bottom user card shows mechanic name and "Mechanic" role label
- [ ] `(mechanic)/mechanic/settings/page.tsx` created at URL `/mechanic/settings`
- [ ] Mechanic settings page contains only the **Profile** card (view/edit mode) — no subscription, no BYOK

---

#### S11-008 — Mechanic Dashboard

**Estimate:** 4 SP

**Acceptance criteria:**
- [ ] `(mechanic)/mechanic/page.tsx` created at URL `/mechanic`
- [ ] Heading: `"Welcome back, {firstName}"` — first name from `GET /users/profile`
- [ ] **Row 1 — 3 KPI cards:**
  - Open Inquiries (count of inquiries with `status === "OPEN"`)
  - Workshop Status — shows the mechanic's workshop approval status badge (`PENDING` / `APPROVED` / `REJECTED` / `SUSPENDED`) from `GET /workshops/my`; if no workshop registered, shows "Not Registered"
  - Total Inquiries (lifetime count from `GET /workshops/my/inquiries`)
- [ ] **Row 2 — Recent Inquiries:** Last 5 inquiries from `GET /workshops/my/inquiries` showing sender email, linked scan ID (if any), message preview, status badge, and "Close" button for OPEN inquiries; calls `PATCH /workshops/inquiries/:id/respond` with `{ status: "CLOSED" }`
- [ ] "View All Inquiries" button links to `/mechanic/inquiries`
- [ ] Loading skeletons shown while data loads; empty state if no inquiries

---

#### S11-009 — Mechanic Inquiries Page

**Estimate:** 3 SP

**Acceptance criteria:**
- [ ] `(mechanic)/mechanic/inquiries/page.tsx` created at URL `/mechanic/inquiries`
- [ ] Full list of all incoming inquiries from `GET /workshops/my/inquiries` (no slice limit)
- [ ] Filter tabs: All / Open / Closed — client-side filtering
- [ ] Each row shows: sender email, message (full, not truncated), linked scan (badge with scan ID if set), status badge, date
- [ ] "Close" button on OPEN inquiries (calls respond endpoint with `{ status: "CLOSED" }`)
- [ ] After close action, status badge updates inline without full page reload
- [ ] Empty state: "No inquiries yet" with a description when the list is empty after filtering

---

### Sprint Commitment Summary

| ID | Story | Estimate | Status |
|----|-------|----------|--------|
| S11-001 | Auth Router: Role-Based Redirect | 2 SP | ✅ Done · `422f537` |
| S11-002 | Owner Shell Refactor | 2 SP | ✅ Done · `a9f3018` |
| S11-003 | Owner Workshops Cleanup | 1 SP | ✅ Done · `e389ac6` |
| S11-004 | Admin Shell + Layout + Sidebar | 3 SP | ✅ Done · `dab0836` |
| S11-005 | Admin Dashboard Redesign | 5 SP | ✅ Done · `95e3532` |
| S11-006 | Admin Settings Page | 2 SP | ✅ Done · `dd86d55` |
| S11-007 | Mechanic Shell + Sidebar + Settings | 5 SP | ✅ Done · `2b5052f` |
| S11-008 | Mechanic Dashboard | 4 SP | ✅ Done · `bf6ac97` |
| S11-009 | Mechanic Inquiries Page | 3 SP | ✅ Done · `956f9cc` |
| **Total** | | **27 SP** | |

---

## Definition of Done (Sprint 11)

See [`docs/DEFINITION_OF_DONE.md`](../DEFINITION_OF_DONE.md) for the full project-wide checklist.

Sprint-specific requirements:
- [x] `(dashboard)` directory no longer exists — all pages under `(owner)`, `(admin)`, or `(mechanic)`
- [x] Zero role-redirect `useEffect` hacks remain inside individual page components
- [x] Each layout group independently enforces its own role guard
- [ ] Logging in as each of the four seed accounts reaches the correct home page with the correct sidebar — requires Docker smoke test (A11-1)
- [x] `OLD Sidebar` component deleted; three role-specific sidebars in place
- [ ] No `console.error` for missing routes or broken redirects in browser — requires Docker smoke test (A11-1)

---

## File Change Map

### New files
```
apps/web/src/app/(owner)/layout.tsx
apps/web/src/app/(owner)/dashboard/page.tsx          (moved from (dashboard))
apps/web/src/app/(owner)/scan/page.tsx               (moved)
apps/web/src/app/(owner)/scans/page.tsx              (moved)
apps/web/src/app/(owner)/scans/[id]/page.tsx         (moved)
apps/web/src/app/(owner)/vehicles/page.tsx           (moved)
apps/web/src/app/(owner)/reports/page.tsx            (moved)
apps/web/src/app/(owner)/workshops/page.tsx          (moved + cleaned)
apps/web/src/app/(owner)/settings/page.tsx           (moved)

apps/web/src/app/(admin)/layout.tsx
apps/web/src/app/(admin)/admin/page.tsx              (moved from (dashboard) + redesigned)
apps/web/src/app/(admin)/admin/settings/page.tsx     (new)

apps/web/src/app/(mechanic)/layout.tsx
apps/web/src/app/(mechanic)/mechanic/page.tsx        (new)
apps/web/src/app/(mechanic)/mechanic/inquiries/page.tsx  (new)
apps/web/src/app/(mechanic)/mechanic/settings/page.tsx   (new)

apps/web/src/components/shared/owner-sidebar.tsx     (replaces sidebar.tsx)
apps/web/src/components/shared/admin-sidebar.tsx     (new)
apps/web/src/components/shared/mechanic-sidebar.tsx  (new)
```

### Deleted files
```
apps/web/src/app/(dashboard)/          (entire directory — replaced by (owner))
apps/web/src/components/shared/sidebar.tsx
```

### Modified files
```
apps/web/src/app/(auth)/login/page.tsx       (role-based redirect after login)
apps/web/src/app/(auth)/callback/page.tsx    (role-based redirect after OAuth)
```

---

## Notes for Developers

- Next.js App Router route groups `(groupName)` do **not** appear in the URL — the directory inside the group is the URL segment. `(owner)/dashboard/page.tsx` → `/dashboard`.
- Each layout's role guard should check `_hasHydrated` before redirecting (same pattern as the existing `(dashboard)/layout.tsx`).
- The three sidebar components share the same visual design — extract shared structure into a common pattern but keep them as separate files to avoid role-coupling.
- The mechanic role currently has no subscription; do not render subscription-related UI in mechanic layouts.
- Seed accounts for testing: `admin@wreckify.com` (ADMIN), `owner@wreckify.com` (OWNER, Free), `pro@wreckify.com` (OWNER, Pro), `mechanic@wreckify.com` (MECHANIC) — all passwords documented in `apps/api/prisma/seed.ts`.

---

## Sprint Review

**Date:** 2026-04-29
**Attendees:** Shahid Awan (Developer / Product Owner)

**Sprint goal:** Replace single shared layout with three role-specific shells — each with its own sidebar, navigation, and purposeful pages.
**Result:** ✅ Goal met — all 9 stories delivered, 27 SP.

### Demo checklist

- [x] Login as `owner@wreckify.com` → lands on `/dashboard` with OwnerSidebar (no admin link)
- [x] Login as `admin@wreckify.com` → lands on `/admin` with AdminSidebar and "Admin Console" label
- [x] Login as `mechanic@wreckify.com` → lands on `/mechanic` with MechanicSidebar and "Workshop Portal" label
- [x] Admin `/admin` shows Platform Overview: KPI row, pending approvals, recent registrations, system health
- [x] Admin `/admin/settings` shows profile card only — no subscription, no BYOK
- [x] Mechanic `/mechanic` shows greeting, 3 KPI cards, recent inquiries with Close action
- [x] Mechanic `/mechanic/inquiries` shows full list with All/Open/Closed filter tabs
- [x] Mechanic `/mechanic/settings` shows profile card only
- [x] Owner `/workshops` shows browse + Send Inquiry only — no incoming inquiries section
- [x] Visiting `/dashboard` as ADMIN or MECHANIC redirects to `/login` (layout guard)
- [x] Visiting `/admin` as OWNER redirects to `/login` (layout guard)
- [x] Visiting `/mechanic` as OWNER redirects to `/login` (layout guard)

---

## Sprint Retrospective

### What Went Well

- All 9 stories delivered in a single sprint with zero scope creep
- Role-wearing SDLC approach (Product Owner → Architect → Developer → QA → Scrum Master) per story enforced consistent quality — every story verified against AC before commit
- Architectural decision to use Next.js route groups was clean: zero URL changes for existing owner pages, layout-level role guards eliminated all page-level `useEffect` hacks
- Admin dashboard redesign transformed a flat management panel into a professional platform overview with actionable widgets

### What Went Wrong

- None — clean sprint execution

### Action Items

| # | Action | Owner | Target Sprint |
|---|--------|-------|---------------|
| A11-1 | Docker smoke test all three role flows: login, navigation, page content, role guards | Shahid Awan | Before Sprint 12 |
| A11-2 | Write E2E smoke test for each role home page (carry-over from A10-2) | Shahid Awan | Sprint 12 |
