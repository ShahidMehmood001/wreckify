# Sprint 17 — gari.pk Scraper

**Status:** CLOSED  
**Start date:** 2026-05-09  
**Closed date:** 2026-05-09  
**Sprint type:** Data — scrape spare parts prices from gari.pk

---

## Sprint Goal

Populate `scraped_part_prices` with real market pricing data for Pakistan's most common cars sourced from gari.pk. No UI changes in this sprint. Sprint 18 builds the display on top of this data.

## Key Findings (discovered during sprint)

- **Only Honda Civic and Honda City have spare parts price data on gari.pk** as of 2026-05-09. All other model pages (Suzuki, Toyota, Kia, Hyundai, Changan, MG) return "no spare parts list available".
- **gari.pk has one grade only — no grade separation in HTML.** The page shows one market price per part (current aftermarket/market price). All data is stored as `AFTERMARKET`. The 3-tier assumption (Genuine / Aftermarket / Used) in the original design was wrong.
- **DB result:** 10 unique records — 5 canonical parts × 2 models. Parts: `headlight`, `windscreen`, `boot`, `taillight`, `mirror_left`.
- **Coverage threshold** corrected: `MIN_MODELS_THRESHOLD` lowered from 8 → 2 to reflect actual gari.pk data availability. Spider retains all 18 model URLs so new data is detected automatically on future runs.
- **PyDispatcher weak-reference bug** fixed in `jobs.py`: signal handlers must be held in a strong reference or GC collects them before signals fire.

---

## Pre-Conditions Cleared

| Check | Status | Finding |
|-------|--------|---------|
| gari.pk server-rendered? | ✅ Confirmed | Prices visible with JS disabled. Data is in HTML carousel. |
| robots.txt | ✅ Reviewed | No Disallow rules blocking `/new-cars/`. |
| Model page existence | ✅ Verified | 2 models have data (Honda Civic, Honda City). 16 pages exist but return empty. 2 (HR-V, BR-V) redirect to home. |
| C-01/C-02/C-03 fixed | ✅ Done | Sprint 16.5 closed these before Sprint 17 started. |

---

## Confirmed Model List (as of 2026-05-09)

### Have price data — confirmed by live scrape
| Make | Model | Parts scraped |
|------|-------|--------------|
| Honda | Civic | headlight, windscreen, boot, taillight, mirror_left |
| Honda | City | headlight, windscreen, boot, taillight, mirror_left |

### Pages exist, no data returned
Suzuki Mehran, Alto, Cultus, Swift, Wagon R · Toyota Corolla, Yaris, Hilux, Fortuner, Prado · Kia Sportage, Picanto · Hyundai Tucson, Elantra · Changan Alsvin · MG HS

All 18 URLs are kept in the spider's target list — scraper will automatically pick up new data if gari.pk adds it.

### Excluded (redirect to home)
Honda HR-V, Honda BR-V

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
- Visits `gari.pk/new-cars/{slug}/spare-parts-price/` for all 18 model slugs
- Browser-like `User-Agent` + `Accept-Language` + `Referer` headers (required — bare requests are blocked)
- 2-second delay between requests (`DOWNLOAD_DELAY: 2`, `CONCURRENT_REQUESTS: 1`)
- Redirect guard: skips models whose page redirects away from `/spare-parts-price/`
- "No spare parts list available" guard: logs INFO and skips — no crash, no empty rows
- HTML structure: `div.my_s_class` cards, part name in `div.bold a::text`, price in `div[style*='color: gray']::text`
- All prices stored as `AFTERMARKET` (gari.pk shows one market price per part — no grade separation)
- Maps gari.pk part labels → canonical names via `GARI_PK_PART_MAP` with longest-key partial match
- Upserts via `@@unique([partName, carMake, carModel, grade])` — safe to re-run

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

- After each scraper run: counts models with data, avg parts per model, tier coverage %
- Written as structured JSON to `ScraperLog.errorMessage` field (repurposed as run metadata)
- `MIN_MODELS_THRESHOLD = 2` — run marked `low_coverage` only if both Honda models go dark simultaneously
- Signal handler bug fixed: PyDispatcher uses weak refs by default; handlers stored in `run_meta` to prevent GC

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

## QA Results

| Criteria | Result |
|----------|--------|
| `grade` column exists with enum values | ✅ |
| Scraper inserts rows with `grade = 'AFTERMARKET'` | ✅ |
| No row has `priceMin <= 0` or `priceMax < priceMin` | ✅ |
| "No spare parts list available" models logged, no crash | ✅ |
| HR-V and BR-V not scraped (redirect guard) | ✅ |
| Re-run does not duplicate rows (upsert working) | ✅ |
| Coverage report present in `ScraperLog` after run | ✅ |
| `status = success` in latest scraper log | ✅ |
| 10 unique records in DB (5 parts × 2 models) | ✅ |

**Deviation from plan:** Only 2 models have data (not 8+). This is a gari.pk data limitation, not a spider bug. Threshold adjusted accordingly. Sprint 18 proceeded.
