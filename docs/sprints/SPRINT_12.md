# Sprint 12 — Admin Panel: Dedicated Management Pages

**Status:** CLOSED ✅  
**Start date:** 2026-04-29  
**Target end date:** 2026-04-29  
**Actual end date:** 2026-04-29  
**Velocity:** 18 SP (7 stories delivered)  
**Sprint type:** Feature — Admin UX improvement

---

## Sprint Goal

Move the admin management tables off the dashboard onto their own dedicated pages (`/admin/users`, `/admin/workshops`, `/admin/scraper`), each with server-side pagination. The dashboard at `/admin` becomes a lean overview only — KPI cards, a capped action widget, and live system health.

---

## Background & Context

### Problem

Sprint 11 delivered a professional admin dashboard but kept the full management tables (user list, workshop list, scraper logs) on the same page as the overview stats. This causes:

1. Infinite scroll on a single page — the tables grow unboundedly
2. No pagination — all records loaded at once
3. No deep-linking — can't share a URL directly to the users list or a filtered view

### Solution

Split the admin panel into purpose-specific pages:

| URL | Purpose |
|---|---|
| `/admin` | Platform overview — KPI cards, pending approvals widget (max 5), recent registrations (5), system health |
| `/admin/users` | Paginated user list with role/status management |
| `/admin/workshops` | Paginated workshop list with status filter tabs, deep-linkable via `?filter=PENDING` |
| `/admin/scraper` | Paginated scraper log history with success/failed filter |
| `/admin/settings` | Profile (unchanged from Sprint 11) |

### Backend State

| Endpoint | Pagination support |
|---|---|
| `GET /admin/users` | ✅ Already paginated — returns `{ users, total, page, limit }` |
| `GET /admin/workshops` | ❌ Returns flat array — needs page/limit added |
| `GET /admin/scraper/logs` | ❌ Hardcoded `limit=50` — needs proper pagination |

---

## Sprint Planning

**Team capacity:** 1 developer  
**Carry-over from Sprint 11:** A11-1 (Docker smoke test) — to be done after this sprint

### Story Estimates & Acceptance Criteria

---

#### S12-001 — Admin Dashboard Cleanup

**Estimate:** 2 SP

**Acceptance criteria:**
- [ ] Pending approvals widget shows a maximum of 5 items; if more exist, a `"View all {N} pending →"` link appears below the list pointing to `/admin/workshops?filter=PENDING`
- [ ] Recent registrations remains capped at 5 (no change needed — already correct)
- [ ] The "Management" divider section (full user list, full workshop list, full scraper log table) is **removed** from `/admin/page.tsx`
- [ ] `/admin` page fetches only `GET /admin/analytics` and `GET /admin/workshops` (for pending widget) and `GET /admin/users` (for recent registrations widget) and `GET /admin/scraper/logs?limit=1` (for system health) — no longer fetches full datasets

---

#### S12-002 — Expand AdminSidebar Navigation

**Estimate:** 1 SP

**Acceptance criteria:**
- [ ] AdminSidebar nav order: Dashboard, Users, Workshops, Scraper, Settings
- [ ] Users → `/admin/users`
- [ ] Workshops → `/admin/workshops`
- [ ] Scraper → `/admin/scraper`
- [ ] All three new items use `exact: false` matching so sub-paths stay highlighted

---

#### S12-003 — Backend: Pagination for Workshops & Scraper Endpoints

**Estimate:** 2 SP

**Acceptance criteria:**
- [ ] `GET /admin/workshops` accepts `page` and `limit` query params (default `page=1`, `limit=20`); response shape changes to `{ workshops, total, page, limit }`
- [ ] `GET /admin/workshops?status=PENDING&page=1&limit=20` combines filter + pagination correctly
- [ ] `GET /admin/scraper/logs` accepts `page` and `limit` query params (default `page=1`, `limit=20`); response shape changes to `{ logs, total, page, limit }`
- [ ] Both endpoints documented with `@ApiQuery` in the controller
- [ ] Existing frontend call `GET /admin/workshops` on the dashboard page updated to use the new response shape (`r.data.workshops ?? r.data` for backwards safety)

---

#### S12-004 — Shared Pagination Component

**Estimate:** 1 SP

**Acceptance criteria:**
- [ ] `components/ui/pagination-controls.tsx` created — accepts `page`, `totalPages`, `onPageChange` props
- [ ] Renders: `← Previous` button, `Page X of Y`, `Next →` button
- [ ] Previous disabled on page 1; Next disabled on last page
- [ ] Shows `"Showing {from}–{to} of {total}"` summary line above the controls when `total` prop provided
- [ ] Stateless — caller owns page state

---

#### S12-005 — Admin Users Page

**Estimate:** 5 SP

**Acceptance criteria:**
- [ ] `(admin)/admin/users/page.tsx` created at URL `/admin/users`
- [ ] Fetches `GET /admin/users?page={page}&limit=20` on mount and on page change
- [ ] Displays `PaginationControls` with correct page/totalPages derived from `{ total, limit }`
- [ ] Each row shows: name (or email if no profile), email, role badge, active/inactive badge, joined date
- [ ] Inline role change via `Select` — calls `PATCH /admin/users/:id/role`
- [ ] Inline activate/deactivate button — calls `PATCH /admin/users/:id/status`
- [ ] Search input (client-side, filters the current page by name or email)
- [ ] Loading skeletons (5 rows) while fetching; empty state if no users
- [ ] Page state resets to 1 when search term is changed

---

#### S12-006 — Admin Workshops Page

**Estimate:** 4 SP

**Acceptance criteria:**
- [ ] `(admin)/admin/workshops/page.tsx` created at URL `/admin/workshops`
- [ ] Reads `?filter` query param on mount to set initial filter tab (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`, or `ALL` if absent)
- [ ] Filter tabs: All / Pending / Approved / Rejected / Suspended — changing tab updates URL query param and resets to page 1
- [ ] Fetches `GET /admin/workshops?status={filter}&page={page}&limit=20` (omits `status` param when filter is "All")
- [ ] Displays `PaginationControls`
- [ ] Each row shows: workshop name, city, owner email, inquiry count (from `_count.inquiries`), status badge
- [ ] Inline status change via `Select` — calls `PATCH /admin/workshops/:id/status`
- [ ] Loading skeletons (5 rows); empty state per filter tab

---

#### S12-007 — Admin Scraper Logs Page

**Estimate:** 3 SP

**Acceptance criteria:**
- [ ] `(admin)/admin/scraper/page.tsx` created at URL `/admin/scraper`
- [ ] Fetches `GET /admin/scraper/logs?page={page}&limit=20` on mount and on page change
- [ ] Displays `PaginationControls`
- [ ] Filter tabs: All / Success / Failed — client-side filter on the current page
- [ ] Each row shows: source (capitalised), status badge (green/red), records added, started at, finished at (if set), error message (if set, shown in red below the row)
- [ ] Loading skeletons (5 rows); empty state if no runs recorded

---

### Sprint Commitment Summary

| ID | Story | Estimate | Status |
|----|-------|----------|--------|
| S12-001 | Admin Dashboard Cleanup | 2 SP | ✅ Done · `188f420` |
| S12-002 | Expand AdminSidebar Navigation | 1 SP | ✅ Done · `79fbbc7` |
| S12-003 | Backend: Pagination for Workshops & Scraper | 2 SP | ✅ Done · `79fbbc7` |
| S12-004 | Shared Pagination Component | 1 SP | ✅ Done · `79fbbc7` |
| S12-005 | Admin Users Page | 5 SP | ✅ Done · `c632994` |
| S12-006 | Admin Workshops Page | 4 SP | ✅ Done · `4459566` |
| S12-007 | Admin Scraper Logs Page | 3 SP | ✅ Done · `4ae7164` |
| **Total** | | **18 SP** | |

---

## Definition of Done (Sprint 12)

See [`docs/DEFINITION_OF_DONE.md`](../DEFINITION_OF_DONE.md) for the full project-wide checklist.

Sprint-specific requirements:
- [x] `/admin` page fetches only what the overview needs — no full dataset loads
- [x] All three management pages paginate correctly — navigating to page 2 loads the next set from the API
- [x] `/admin/workshops?filter=PENDING` deep-link from the dashboard pending widget opens the workshops page pre-filtered to Pending tab
- [x] No management tables remain on the `/admin` dashboard page
- [x] `PaginationControls` component is reused across users, workshops, and scraper pages

## Sprint Review

**Date:** 2026-04-29
**Attendees:** Shahid Awan (Developer / Product Owner)

**Sprint goal:** Move management tables to dedicated pages with server-side pagination, scope dashboard to overview only.
**Result:** ✅ Goal met — all 7 stories delivered, 18 SP.

### Demo checklist

- [x] `/admin` — loads fast, only 4 small API calls; no management tables
- [x] `/admin` — pending approvals widget shows max 5, "View all pending →" link appears when more exist
- [x] `/admin/users` — paginated list, search filters current page, role/status inline controls work
- [x] `/admin/workshops` — filter tabs update URL, deep-link `?filter=PENDING` pre-selects tab, inline status control works
- [x] `/admin/scraper` — paginated log history, All/Success/Failed tabs, error messages highlighted
- [x] AdminSidebar — all 5 nav items present and highlight correctly on active route
- [x] `PaginationControls` renders null when total fits on one page (no unnecessary pagination UI)

## Sprint Retrospective

### What Went Well

- Backend already had pagination for users; workshops and scraper needed one extra service method change each — minimal backend work
- The limit=6 trick for the pending approvals widget avoided an extra count API call
- `PaginationControls` as a shared stateless component kept all three management pages clean
- Deep-linkable workshops filter via URL query params required `Suspense` wrapping — caught and handled correctly

### What Went Wrong

- None

### Action Items

| # | Action | Owner | Target Sprint |
|---|--------|-------|---------------|
| A12-1 | Docker smoke test all admin pages: pagination, filters, inline controls | Shahid Awan | Before Sprint 13 |
| A12-2 | Carry-over: E2E smoke tests for each role home page (from A11-2) | Shahid Awan | Sprint 13 |

---

## File Change Map

### New files
```
apps/web/src/components/ui/pagination-controls.tsx
apps/web/src/app/(admin)/admin/users/page.tsx
apps/web/src/app/(admin)/admin/workshops/page.tsx
apps/web/src/app/(admin)/admin/scraper/page.tsx
```

### Modified files
```
apps/api/src/modules/admin/admin.service.ts      (pagination for workshops + scraper)
apps/api/src/modules/admin/admin.controller.ts   (query params + response shape)
apps/web/src/components/shared/admin-sidebar.tsx (add Users, Workshops, Scraper nav)
apps/web/src/app/(admin)/admin/page.tsx          (remove management section, cap pending widget)
```

---

## Notes for Developers

- `GET /admin/users` already returns `{ users, total, page, limit }` — no backend change needed for users.
- `totalPages` derivation: `Math.ceil(total / limit)`.
- Workshop filter uses the existing `status` query param on the backend — the frontend filter tab maps directly to the `WorkshopStatus` enum values (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`) or omits the param entirely for "All".
- The dashboard pending approvals widget should fetch `GET /admin/workshops?status=PENDING&limit=6` (6 so we know if there are more than 5 without a separate count call — show first 5, display "View all" if result length === 6).
- Scraper logs are read-only — no inline actions on the scraper page.
