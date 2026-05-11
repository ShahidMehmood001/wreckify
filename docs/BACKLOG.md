# Wreckify — Product & Technical Backlog

Items intentionally deferred. Each needs R&D, design work, or a dedicated sprint before implementation.  
For full audit details see `docs/TECH_REVIEW.md`.

---

## CRITICAL FIXES (must resolve before real user onboarding)

| ID | Issue | Ref | Status |
|----|-------|-----|--------|
| C-01 | Rate limiting on all endpoints (especially guest scan + AI detection) | TECH_REVIEW C-01 | ✅ Fixed — Sprint 16.5 |
| C-02 | Detection idempotency — duplicate detected parts on double-call | TECH_REVIEW C-02 | ✅ Fixed — Sprint 16.5 |
| C-03 | Guest session bypass — unlimited free scans by omitting sessionId | TECH_REVIEW C-03 | ✅ Fixed — Sprint 16.5 |
| C-04 | Inquiry response notifications — email owner when mechanic responds | TECH_REVIEW C-04 | Deferred — build as part of proper chat/notification system sprint; one-off email hack not worth the debt |

---

## HIGH PRIORITY (resolve within 2 sprints of going live)

| ID | Issue | Ref | Status |
|----|-------|-----|--------|
| H-01 | PROCESSING scan recovery — cron to reset stuck scans after 5 min | TECH_REVIEW H-01 | ✅ Fixed — Sprint 19 |
| H-02 | Scan quota transaction — atomic check + increment, race condition | TECH_REVIEW H-02 | ✅ Fixed — Sprint 19 |
| H-03 | Pagination on scan list and workshop list endpoints | TECH_REVIEW H-03 | ✅ Fixed — Sprint 19 |
| H-04 | AI response schema validation before DB insert | TECH_REVIEW H-04 | ✅ Fixed — Sprint 19 |
| H-05 | Error monitoring — Sentry integration (API + AI service) | TECH_REVIEW H-05 | Open |
| H-06 | Missing DB indexes — userId, guestSessionId, senderId, workshopId, status | TECH_REVIEW H-06 | ✅ Fixed — Sprint 19 |

---

## MEDIUM (before launch)

| ID | Issue | Ref |
|----|-------|-----|
| M-01 | Background job queue for AI detection (BullMQ + Redis) | TECH_REVIEW M-01 |
| M-02 | Cloud image storage — migrate from Docker volume to Cloudinary/S3 | TECH_REVIEW M-02 |
| M-03 | Server-side vehicle make/model validation against Pakistan cars list | TECH_REVIEW M-03 |
| M-04 | Scan frontend — handle FAILED status with error + retry UI | TECH_REVIEW M-04 | ✅ Fixed — Sprint 19 |
| M-05 | CORS_ORIGIN env var — set for production domain | TECH_REVIEW M-05 |

---

## PRODUCT / DESIGN (future sprints)

| ID | Issue | Notes |
|----|-------|-------|
| P-01 | Guest scan value prop — show market prices on scan result | ✅ Done — Sprint 18 |
| P-02 | Insurance agent product — build or remove the role | Decision needed |
| P-03 | Automated tests — integration tests for scan + auth + inquiry flows | Ongoing |
| P-04 | Analytics — PostHog or Mixpanel before real user onboarding | 2h to integrate |
| P-05 | Workshop discovery — ratings, response rate, photos | Future sprint |
| P-06 | Payment integration — billing for PRO/WORKSHOP/INSURANCE plans | Major sprint |
| P-07 | Email verification — Resend, Option B flow | Deferred Sprint 13 |

---

## FEATURE BACKLOG

---

### Workshop Spare Parts Inventory

**Status:** Needs R&D  
**Origin:** Sprint 14 retrospective

Workshops that sell spare parts should be able to list their inventory with prices and condition. This would complement the gari.pk scraped market prices by adding real, local, workshop-specific pricing — and create a unique data asset that competitors cannot replicate.

**Open questions:**
- Data model: separate `WorkshopPart` table? Parts have make/model/year compatibility, condition (new/used/Chinese/genuine), and stock quantity.
- Discovery UX: shown on workshop profile? On scan result? Both?
- Pricing display: "Market (gari.pk): PKR 12,000–20,000 · Available at Ali Motors Workshop: PKR 14,500"
- Does the mechanic manage stock counts, or just a price catalog?

**Likely scope:**
- `WorkshopPart` model (name, carMake, carModel, carYear, grade, price, inStock)
- Mechanic portal: inventory management page
- Owner portal: part availability shown on workshop profile and scan result page

---

### Email Verification

**Status:** Deferred (Sprint 13 retro)  
**Approach:** Resend (free tier), Option B — verify after registration, block features until verified

---

### Cloud Storage Migration

**Status:** Deferred (Sprint 13 retro)  
**Approach:** Migrate scan images from local Docker volume to Cloudinary or S3 (Option B)  
**Priority upgraded:** This is now a MEDIUM issue (M-02) — must resolve before any real user is onboarded
