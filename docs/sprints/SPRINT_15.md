# Sprint 15 — Inquiry Response Loop

**Status:** CLOSED ✅  
**Start date:** 2026-05-07  
**Target end date:** TBD  
**Sprint type:** Feature — Close the owner-mechanic inquiry feedback loop

---

## Sprint Goal

Make the inquiry system fully usable end-to-end. Owners can currently send a repair inquiry but have no way to see it again or read any response. Mechanics can only "close" an inquiry — they can't send an actual reply. This sprint closes both gaps.

---

## Stories

---

### S15-001 — Backend: GET /workshops/inquiries/my (Owner's sent inquiries)

**Estimate:** 2 SP  
**Status:** ✅ Done

**Acceptance criteria:**
- [x] `GET /workshops/inquiries/my` endpoint added to `WorkshopsController`
- [x] Requires `OWNER` role (JWT guard + role guard)
- [x] Returns all `RepairInquiry` records where `senderId = userId`
- [x] Each record includes the workshop (id, name, city, phone) and the scan (if attached)
- [x] Ordered by `createdAt` desc
- [x] Swagger documented

---

### S15-002 — Frontend: Owner "My Inquiries" page

**Estimate:** 4 SP  
**Status:** ✅ Done

**Acceptance criteria:**
- [x] New page at `/inquiries` in the owner portal
- [x] "My Inquiries" nav item added to owner sidebar
- [x] Fetches from `GET /workshops/inquiries/my`
- [x] Shows workshop name, city, status badge, sent message, date
- [x] Filter tabs: All / Open / Closed
- [x] Empty state when no inquiries sent yet
- [x] Loading skeleton

---

### S15-003 — Frontend: Mechanic "Respond" action

**Estimate:** 2 SP  
**Status:** ✅ Done

**Acceptance criteria:**
- [x] "Respond" button added to each open inquiry on `/mechanic/inquiries`
- [x] Opens a dialog: textarea for reply message, two action buttons — "Mark as Responded" and "Close Inquiry"
- [x] Calls `PATCH /workshops/inquiries/:id` with `{ status, message }`
- [x] Optimistically updates inquiry status in the list on success
- [x] Existing "Close" quick-action button on the dashboard (`/mechanic`) remains unchanged

---

## Sprint Commitment Summary

| ID | Story | Estimate | Status |
|----|-------|----------|--------|
| S15-001 | Backend: GET /workshops/inquiries/my | 2 SP | ✅ Done |
| S15-002 | Frontend: Owner "My Inquiries" page | 4 SP | ✅ Done |
| S15-003 | Frontend: Mechanic "Respond" action | 2 SP | ✅ Done |
| **Total** | | **8 SP** | |
