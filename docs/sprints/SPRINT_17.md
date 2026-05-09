# Sprint 17 — gari.pk Scraper

**Status:** IN PROGRESS  
**Start date:** 2026-05-09  
**Sprint type:** Data — scrape 3-tier spare parts prices from gari.pk

---

## Sprint Goal

Populate `scraped_part_prices` with real market pricing data for Pakistan's most common cars — 3 tiers per part per model (Genuine OEM / Aftermarket / Used Salvage) — sourced from gari.pk. No UI changes in this sprint. Sprint 18 builds the display on top of this data.

---

## Pre-Conditions Cleared

| Check | Status | Finding |
|-------|--------|---------|
| gari.pk server-rendered? | ✅ Confirmed | Prices visible with JS disabled. Carousel is JS-only UI; data is in HTML. |
| robots.txt | ✅ Reviewed | Non-standard content signals policy. No Disallow rules blocking `/new-cars/`. |
| Model page existence | ✅ Verified | 11 established models have price data. 7 newer models have pages but no data. 2 (HR-V, BR-V) redirect to home. |
| C-01/C-02/C-03 fixed | ✅ Done | Sprint 16.5 closed these before Sprint 17 started. |

---

## Confirmed Model List

### With price data (primary targets)
| Make | Model | gari.pk slug |
|------|-------|-------------|
| Suzuki | Mehran | `/suzuki/mehran/` |
| Suzuki | Alto | `/suzuki/alto/` |
| Suzuki | Cultus | `/suzuki/cultus/` |
| Suzuki | Swift | `/suzuki/swift/` |
| Toyota | Corolla | `/toyota/corolla/` |
| Toyota | Yaris | `/toyota/yaris/` |
| Toyota | Hilux | `/toyota/hilux/` |
| Toyota | Fortuner | `/toyota/fortuner/` |
| Toyota | Prado | `/toyota/prado/` |
| Honda | Civic | `/honda/civic/` |
| Honda | City | `/honda/city/` |

### Pages exist but no data (attempt, expect empty, log)
Suzuki Wagon R, Kia Sportage, Kia Picanto, Hyundai Tucson, Hyundai Elantra, Changan Alsvin, MG HS

### No page on gari.pk (excluded from scraper)
Honda HR-V, Honda BR-V → redirect to home page

---

## Stories

---

### S17-000 — Schema Migration

**Estimate:** 0.5 SP  
**Status:** ✅ Done

- Added `PartGrade` enum (`GENUINE`, `AFTERMARKET`, `USED`) to Prisma schema
- Added `grade PartGrade` column to `ScrapedPartPrice`
- Made `carMake` and `carModel` required (gari.pk always provides both)
- Removed `carYear` (gari.pk is model-level, not year-specific)
- Unique constraint: `@@unique([partName, carMake, carModel, grade])`
- Index: `@@index([partName, carMake, carModel, grade])`
- Migration truncates all existing PakWheels data (carMake=null, no grade — unusable)

**User action required:** run `npx prisma migrate dev --name add_part_grade` from `apps/api/`

---

### S17-001 — gari.pk Spider

**Estimate:** 5 SP  
**Status:** ✅ Done

- New `GariPkSpider` — replaces `PakWheelsSpider`
- Visits `gari.pk/new-cars/{slug}/spare-parts-price/` for all confirmed models
- Browser-like `User-Agent` + `Accept-Language` headers
- 2-second delay between requests (`DOWNLOAD_DELAY: 2`)
- Detects "No spare parts list available" — logs and skips cleanly
- Parses 3 grade sections per page (Genuine / Duplicate / Second-hand)
- Maps gari.pk part names → canonical names via `GARI_PK_PART_MAP`
- Upserts via unique key — safe to re-run without duplicating

---

### S17-002 — Part Name Mapping Dictionary

**Estimate:** 1 SP  
**Status:** ✅ Done

- `GARI_PK_PART_MAP` added to `part_mapper.py`
- Covers gari.pk-specific naming conventions and Pakistani market terminology
- Unmapped names → logged as warning, not inserted

---

### S17-003 — Coverage Report

**Estimate:** 1 SP  
**Status:** ✅ Done

- After each scraper run: counts models with data, parts per model, tier coverage %
- Written as structured JSON to `ScraperLog.errorMessage` field (repurposed as metadata)
- Run fails loudly if fewer than 8 models return any data

---

## Sprint Commitment Summary

| ID | Story | Estimate | Status |
|----|-------|----------|--------|
| S17-000 | Schema migration | 0.5 SP | ✅ Done |
| S17-001 | gari.pk spider | 5 SP | ✅ Done |
| S17-002 | Part name mapping | 1 SP | ✅ Done |
| S17-003 | Coverage report | 1 SP | ✅ Done |
| **Total** | | **7.5 SP** | |

---

## QA Acceptance Criteria

- [ ] `grade` column exists in DB with correct enum values
- [ ] Running scraper inserts rows with `grade IN ('GENUINE','AFTERMARKET','USED')`
- [ ] No row has `priceMin <= 0` or `priceMax < priceMin`
- [ ] "No spare parts list available" models logged — no crash, no empty rows
- [ ] HR-V and BR-V not in target list
- [ ] Re-running scraper does not duplicate rows (upsert working)
- [ ] Coverage report present in `ScraperLog` after run
- [ ] At least 8 models return data

---

## Gate: Sprint 18 Does Not Start Until

- Scraper has run at least once on the real database
- Coverage report reviewed and 8-model minimum confirmed
- If coverage < 8 models: assess before proceeding to Sprint 18
