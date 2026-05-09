# Sprint 18 — Market Price Display

**Status:** CLOSED  
**Start date:** 2026-05-09  
**Closed date:** 2026-05-09  
**Sprint type:** Feature — surface scraped market prices on scan result page

---

## Sprint Goal

Display gari.pk market prices alongside each detected part on the scan result page. Sprint 17 put price data in the DB; Sprint 18 surfaces it to users — the direct user-facing payoff of the scraper work.

---

## Stories

---

### S18-001 — API: Market Price Enrichment on Scan Detail

**Estimate:** 2 SP  
**Status:** ✅ Done

**What was built:**
- `enrichWithMarketPrices()` private method in `ScansService`
- Queries `scraped_part_prices` by vehicle make/model (case-insensitive) and returns prices for each detected part name
- Attached as `marketPrice: { min, max, currency, grade } | null` on each detected part
- Applied to both auth path (`getScanOrThrow`) and guest path (`triggerDetectionGuest`)
- No new endpoint — enrichment piggybacks on existing `GET /scans/:id` response
- Parts with no price data in DB get no `marketPrice` field — backward-compatible

**File:** `apps/api/src/modules/scans/scans.service.ts`

---

### S18-002 — Frontend: Market Price Row on Scan Result

**Estimate:** 1 SP  
**Status:** ✅ Done

**What was built:**
- Each detected part row in the scan result page shows a green price line when data is available
- Format: `Market (AFTERMARKET): Rs 1,984 – Rs 2,976 · gari.pk`
- Source attribution inline (no logo, no link — just "· gari.pk" text)
- Rows with no price data render exactly as before — no placeholder, no empty line
- `MarketPrice` interface added to `apps/web/src/types/index.ts`

**File:** `apps/web/src/app/(owner)/scans/[id]/page.tsx`

---

## Sprint Commitment Summary

| ID | Story | Estimate | Status |
|----|-------|----------|--------|
| S18-001 | API enrichment | 2 SP | ✅ Done |
| S18-002 | Frontend display | 1 SP | ✅ Done |
| **Total** | | **3 SP** | |

---

## QA Results

| Criteria | Result |
|----------|--------|
| Honda Civic scan — `headlight` shows `marketPrice` with correct PKR range | ✅ |
| Honda Civic scan — `windscreen` shows `marketPrice` with correct PKR range | ✅ |
| Honda Civic scan — `door_left` (not in DB) has no `marketPrice` field | ✅ |
| Non-Honda vehicle — all parts get no price, rows render unchanged | ✅ |
| TypeScript: `tsc --noEmit` on both API and web | ✅ |

---

## Scope Boundaries

**In scope:**
- Market price display on the scan detail page (auth + guest paths)

**Out of scope (future):**
- Cost estimate using scraped prices instead of AI numbers
- Price display on the scan list page
- Price comparison across grades (only AFTERMARKET in DB currently)
- Prices for non-Honda vehicles (gari.pk limitation — no data yet)
