# Sprint 13 — Improved Registration Flow

**Status:** CLOSED ✅  
**Start date:** 2026-04-30  
**Target end date:** 2026-04-30  
**Actual end date:** 2026-04-29  
**Velocity:** 13 SP (5 stories delivered)  
**Sprint type:** Feature + Security — Registration UX overhaul

---

## Sprint Goal

Replace the single generic registration form with a professional, role-specific flow: a role selection landing page at `/register`, a dedicated car owner path at `/register/owner`, and a 2-step workshop owner registration at `/register/workshop` that atomically creates a MECHANIC user and a PENDING workshop. Close the server-side security gap that currently lets any client self-assign a role.

---

## Background & Context

### Problem

The current registration experience has three issues:

1. **Security gap** — `RegisterDto` accepts a `role` field from the client body; `auth.service.ts` uses `dto.role || UserRole.OWNER`. Any user can self-promote to `ADMIN` or `MECHANIC` by sending the field directly.
2. **UX mismatch** — `/register` is a single generic form. Workshop owners (who become `MECHANIC` users in the DB) have no guided path to also register their workshop at sign-up time. They land on a dashboard with an empty mechanic portal and no clear next step.
3. **Wrong redirect** — after successful registration the page hardcodes `router.push("/dashboard")` instead of using `roleHome()`, so future role-specific registrants would land on the wrong page.

### Solution

| Path | Who | What happens |
|---|---|---|
| `/register` | Everyone | Role selection cards: "I'm a Car Owner" / "I'm a Workshop Owner" |
| `/register/owner` | Car owners | Existing registration form, creates `OWNER` user |
| `/register/workshop` | Workshop owners | 2-step form: Step 1 personal details, Step 2 workshop details; creates `MECHANIC` user + `PENDING` workshop atomically |

On the backend:
- Remove `role` from `RegisterDto` — server always assigns `OWNER` for the existing endpoint
- New `POST /auth/register/workshop` endpoint — always assigns `MECHANIC` + `WORKSHOP` plan, creates workshop record in a Prisma transaction

Mechanic dashboard gains a status banner so workshop owners know their workshop is pending admin approval.

### Existing State

| File | Relevant detail |
|---|---|
| `apps/api/src/modules/auth/dto/register.dto.ts` | Has `@IsOptional() role?: string` — must be removed |
| `apps/api/src/modules/auth/auth.service.ts` | `register()` uses `dto.role \|\| UserRole.OWNER` — must hardcode `OWNER` |
| `apps/web/src/app/(auth)/register/page.tsx` | Hardcodes `router.push("/dashboard")` — needs `roleHome()` |
| `apps/api/src/modules/auth/auth.controller.ts` | Single `POST /auth/register` — needs second route added |
| `apps/web/src/app/(mechanic)/mechanic/page.tsx` | No pending/rejected state banner |

---

## Sprint Planning

**Team capacity:** 1 developer  
**Carry-over action items:** A11-1 (Docker smoke test), A12-1 (Docker admin pages), A12-2 (E2E smoke tests) — deferred again, post-sprint

### Story Estimates & Acceptance Criteria

---

#### S13-001 — Security Fix: Remove Role from RegisterDto + Fix Redirect

**Estimate:** 1 SP

**Acceptance criteria:**
- [ ] `role` field removed from `RegisterDto` (both the property and any `@ApiProperty`/decorator)
- [ ] `auth.service.ts` `register()` no longer references `dto.role` — always creates user with `UserRole.OWNER`
- [ ] `apps/web/src/app/(auth)/register/page.tsx` redirect after success changed from `router.push("/dashboard")` to `router.push(roleHome(res.data.user.role))` using the same `roleHome()` helper as login
- [ ] `roleHome` helper defined in register page (same pattern as login/callback pages — not a shared module, keep it local)
- [ ] Existing car-owner registration flow still works end-to-end (can still register, lands on `/dashboard`)

---

#### S13-002 — Role Selection Page + Move Owner Form

**Estimate:** 2 SP

**Acceptance criteria:**
- [ ] `/register` page replaced with a role selection screen — two cards side by side (stacked on mobile):
  - **Car Owner** — icon, one-line description ("Manage your vehicles and track repair history"), "Get Started →" links to `/register/owner`
  - **Workshop Owner** — icon, one-line description ("Register your workshop and receive customer inquiries"), "Get Started →" links to `/register/workshop`
- [ ] `/register/owner/page.tsx` created — contains the existing registration form (name, email, password fields) moved verbatim from `/register/page.tsx`
- [ ] `/register/page.tsx` becomes the selection screen only — no form fields
- [ ] Both cards have a hover state; active card is visually distinct
- [ ] "Already have an account? Sign in" link present on the selection page and the owner registration page
- [ ] Navigation: clicking a card routes to the relevant sub-path; browser back from `/register/owner` returns to `/register`

---

#### S13-003 — Backend: Workshop Registration Endpoint

**Estimate:** 3 SP

**Acceptance criteria:**
- [ ] `RegisterWorkshopDto` created with fields:
  - Personal: `firstName`, `lastName`, `email`, `password` (all required, same validators as `RegisterDto`)
  - Workshop: `workshopName`, `city`, `address`, `phone` (all required strings, non-empty)
- [ ] `POST /auth/register/workshop` controller route added — calls new `auth.service.registerWorkshop(dto)`
- [ ] `registerWorkshop()` service method runs inside a Prisma `$transaction`:
  1. Hash password
  2. Create `User` with `role: MECHANIC`, `plan: WORKSHOP`, `isActive: true`
  3. Create `Workshop` linked to that user with `status: PENDING`, populated from DTO fields
  4. Return same shape as existing `register()` — `{ user, accessToken, refreshToken }`
- [ ] If email already exists, throws `ConflictException` (same as regular register)
- [ ] Endpoint documented with `@ApiBody`, `@ApiCreatedResponse` in Swagger
- [ ] `refreshToken` stored / access token issued identically to regular registration

---

#### S13-004 — Frontend: 2-Step Workshop Registration Form

**Estimate:** 5 SP

**Acceptance criteria:**
- [ ] `/register/workshop/page.tsx` created — 2-step form with a step indicator (Step 1 of 2 / Step 2 of 2)
- [ ] **Step 1 — Personal Details:** First name, Last name, Email, Password fields; "Continue →" button validates all fields before advancing
- [ ] **Step 2 — Workshop Details:** Workshop name, City, Address, Phone fields; "← Back" returns to Step 1 without clearing Step 1 data; "Register Workshop" submits
- [ ] Step indicator clearly shows which step is active and which is complete (e.g. filled circle vs outline)
- [ ] On submit, calls `POST /auth/register/workshop` with all fields from both steps
- [ ] On success: stores tokens (same as regular register), redirects to `roleHome("MECHANIC")` → `/mechanic`
- [ ] On error: shows toast with server error message; stays on Step 2
- [ ] Password field has show/hide toggle (same as existing register form)
- [ ] "Already have an account? Sign in" link visible on both steps
- [ ] Form is fully responsive — single column on mobile

---

#### S13-005 — Mechanic Dashboard: Workshop Approval Banner

**Estimate:** 2 SP

**Acceptance criteria:**
- [ ] `apps/web/src/app/(mechanic)/mechanic/page.tsx` enhanced with a prominent banner below the page heading for the following workshop states:
  - **No workshop** (404 from `GET /workshops/my`): yellow/warning banner — "You haven't registered a workshop yet. Register now →" (links to `/register/workshop`)
  - **PENDING** status: blue/info banner — "Your workshop is pending admin approval. We'll notify you once it's reviewed."
  - **REJECTED** status: red/destructive banner — "Your workshop registration was rejected. Please contact support or re-register." with a "Register new workshop →" link
  - **APPROVED**: no banner (existing behaviour — KPI cards and inquiries shown)
  - **SUSPENDED**: red banner — "Your workshop has been suspended. Contact support for assistance."
- [ ] Banner is visually distinct — uses a coloured left border or background tint, not just a text paragraph
- [ ] KPI cards and inquiries section still render below the banner in all states (they may show zeros/empty for unapproved workshops — that's acceptable)
- [ ] Loading state while workshop status is being fetched — banner area shows a skeleton

---

### Sprint Commitment Summary

| ID | Story | Estimate | Status |
|----|-------|----------|--------|
| S13-001 | Security Fix: Remove Role from RegisterDto + Fix Redirect | 1 SP | ✅ Done · `784d831` |
| S13-002 | Role Selection Page + Move Owner Form | 2 SP | ✅ Done · `1271bcd` |
| S13-003 | Backend: Workshop Registration Endpoint | 3 SP | ✅ Done · `7e373ac` |
| S13-004 | Frontend: 2-Step Workshop Registration Form | 5 SP | ✅ Done · `84cfe75` |
| S13-005 | Mechanic Dashboard: Workshop Approval Banner | 2 SP | ✅ Done · `34172c4` |
| **Total** | | **13 SP** | |

---

## Definition of Done (Sprint 13)

See [`docs/DEFINITION_OF_DONE.md`](../DEFINITION_OF_DONE.md) for the full project-wide checklist.

Sprint-specific requirements:
- [ ] `role` field is absent from `RegisterDto` — verified by attempting `POST /auth/register` with `"role":"ADMIN"` in body; server ignores it
- [ ] Workshop registration creates user AND workshop in a single DB transaction — verified by simulating a DB error mid-transaction and confirming neither record is persisted
- [ ] `/register` shows role selection, not a form
- [ ] `/register/owner` and `/register/workshop` both complete successfully in a browser test
- [ ] Mechanic who registers via `/register/workshop` sees the PENDING banner on `/mechanic` immediately after login
- [ ] Admin can see the new workshop in `/admin/workshops` with PENDING status

---

## File Change Map

### New files
```
apps/web/src/app/(auth)/register/page.tsx               (role selection — replaces existing form)
apps/web/src/app/(auth)/register/owner/page.tsx         (existing form, moved here)
apps/web/src/app/(auth)/register/workshop/page.tsx      (2-step workshop form)
apps/api/src/modules/auth/dto/register-workshop.dto.ts  (new DTO)
```

### Modified files
```
apps/api/src/modules/auth/dto/register.dto.ts           (remove role field)
apps/api/src/modules/auth/auth.service.ts               (remove dto.role, add registerWorkshop())
apps/api/src/modules/auth/auth.controller.ts            (add POST /auth/register/workshop route)
apps/web/src/app/(mechanic)/mechanic/page.tsx           (add workshop status banner)
```

---

## Notes for Developers

- `roleHome()` is intentionally duplicated in each auth page (login, callback, register, register/owner, register/workshop) — it's a trivial 3-line helper; a shared module is premature abstraction here.
- The Prisma transaction in `registerWorkshop()` should use `prisma.$transaction([...])` sequential API (not interactive), since both operations are independent writes with no inter-dependency on their return values beyond the user ID.
- Workshop `phone` field: if the Prisma schema `Workshop` model doesn't have a `phone` column yet, add a nullable `String?` field and generate a migration. Check schema before assuming.
- Step 2 "← Back" must not reset Step 1 state — use `useState` to hold all form values at the page level and pass them down, or use a single form state object.
- The mechanic dashboard already handles the `false` (404) state from `GET /workshops/my` — `workshop === false` means no workshop registered. The banner logic should branch on `workshop === null` (loading), `workshop === false` (none), and `workshop.status` for the status cases.

---

## Sprint Review

**Date:** 2026-04-29  
**Attendees:** Shahid Awan (Developer / Product Owner)

**Sprint goal:** Replace the generic registration form with a professional role-specific flow, close the server-side security gap, and surface workshop approval state on the mechanic dashboard.  
**Result:** ✅ Goal met — all 5 stories delivered, 13 SP.

### Demo checklist

- [x] `POST /auth/register` with `"role":"ADMIN"` in body — server ignores the field, user created as OWNER
- [x] `/register` — role selection page with Car Owner and Workshop Owner cards
- [x] `/register/owner` — car owner form completes, redirects to `/dashboard`
- [x] `/register/workshop` — Step 1 validates before advancing; Back returns to Step 1 with data intact; Step 2 submits and redirects to `/mechanic`
- [x] Newly registered workshop owner sees the PENDING banner on `/mechanic` immediately
- [x] Admin sees the new workshop in `/admin/workshops` with PENDING status
- [x] Workshop REJECTED → red banner with re-register link; SUSPENDED → red banner with support message

---

## Sprint Retrospective

### What Went Well

- Security fix was surgical — 3 file edits, no migration, no downtime risk
- Nested Prisma create (`workshop: { create: {...} }` inside `user.create`) made the atomic registration clean and concise — no multi-step transaction logic needed
- Single shared `form` state object for the 2-step form kept the Back navigation trivially correct
- `WorkshopBanner` as an inline component (not a separate file) kept the mechanic dashboard self-contained

### What Went Wrong

- None

### Action Items

| # | Action | Owner | Target Sprint |
|---|--------|-------|---------------|
| A13-1 | Docker smoke test all registration paths: `/register`, `/register/owner`, `/register/workshop` | Shahid Awan | Before Sprint 14 |
| A13-2 | Carry-over: E2E smoke tests for each role home page (from A12-2) | Shahid Awan | Sprint 14 |
