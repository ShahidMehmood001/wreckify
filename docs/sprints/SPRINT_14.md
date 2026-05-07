# Sprint 14 — Workshop Profile Editing + Scraper Fixes

**Status:** IN PROGRESS 🔄  
**Start date:** 2026-05-07  
**Target end date:** TBD  
**Sprint type:** Bug Fixes (Scraper) + Feature (Workshop Profile)

---

## Sprint Goal

Fix the scraper so it actually collects price data, and give mechanics the ability to edit their workshop profile after registration.

---

## Part A — Scraper Debugging (COMPLETED ✅)

The scraper had never successfully written a single record to the database since it was first implemented. Six separate bugs were identified and fixed across two sessions.

### Bugs Fixed

#### Bug 1 — `ROBOTSTXT_OBEY = True` (Sprint 13 session)
**File:** `apps/scraper/app/settings.py`  
**Symptom:** All requests silently dropped — Scrapy obeyed robots.txt which disallows crawlers on both OLX and PakWheels.  
**Fix:** Set `ROBOTSTXT_OBEY = False` in global settings and in each spider's `custom_settings`.

---

#### Bug 2 — User-Agent wiped by `custom_settings`
**File:** `apps/scraper/app/spiders/pakwheels_spider.py`, `olx_spider.py`  
**Symptom:** Requests sent with no User-Agent header.  
**Cause:** In Scrapy, `custom_settings.DEFAULT_REQUEST_HEADERS` **completely replaces** the global setting (no merge). The spider-level dict only had `Accept` and `Accept-Language`, so the global `User-Agent` was discarded.  
**Fix:** Added `User-Agent: Chrome/124` explicitly inside each spider's `custom_settings`.

---

#### Bug 3 — `records_added` always logged as 0
**File:** `apps/scraper/app/scheduler/jobs.py`  
**Symptom:** Scraper logs showed `records=0` for every run regardless of actual output.  
**Cause:** Code tried to walk `crawler.engine.scraper.itemproc.middlewares` — a private internal path that doesn't hold pipeline item counts.  
**Fix:** Used `crawler.stats.get_value("item_scraped_count", 0)` — the correct Scrapy stats API.

---

#### Bug 4 — Run status always logged as `success`
**File:** `apps/scraper/app/scheduler/jobs.py`  
**Symptom:** Every run logged as `success` even when spiders crashed or were blocked.  
**Cause:** Spider close `reason` parameter was never checked.  
**Fix:** Added `if reason != "finished": meta[src]["error"] = f"Spider closed with reason: {reason}"`.

---

#### Bug 5 — Wrong URLs for both spiders
**Files:** `apps/scraper/app/spiders/pakwheels_spider.py`, `olx_spider.py`

**PakWheels:** Previous URL paths (`/classifieds/spare-parts/`, `/classifieds/?q=`) all 301-redirect to homepage. User confirmed correct URL: `https://www.pakwheels.com/accessories-spare-parts/search/-/?q=bumper`.

**OLX:** Spider was calling `https://www.olx.com.pk/api/relevance/v4/search` (returns 404). OLX Pakistan is a React SPA — listing data is fetched client-side via Algolia (`ll8iz711cs-dsn.algolia.net`); the server HTML is a 1.8MB JS bundle with no embedded listings. Correct category base URL is `https://www.olx.com.pk/spare-parts_c82?q={query}` but `__NEXT_DATA__` doesn't exist. OLX spider disabled pending Algolia API key discovery (see below).

---

#### Bug 6 — INSERT using snake_case column names against camelCase Prisma columns
**File:** `apps/scraper/app/core/db.py`  
**Symptom:** Every item scraped by PakWheels spider was silently dropped at the pipeline — the DB table had zero rows.  
**Cause:** Raw SQL used `part_name`, `car_make`, `price_min`, etc. Prisma generates camelCase PostgreSQL columns: `partName`, `carMake`, `priceMin`. PostgreSQL column names with uppercase require double-quoted identifiers in SQL.  
**Fix:** Updated INSERT to use `"partName"`, `"carMake"`, `"carModel"`, `"carYear"`, `"priceMin"`, `"priceMax"`, `"sourceUrl"`, `"scrapedAt"`.

---

#### Bug 7 — PakWheels title/price CSS selectors never matched
**File:** `apps/scraper/app/spiders/pakwheels_spider.py`  
**Symptom:** Cards were found (`li.classified-listing` matched correctly) but 0 items extracted per page.  
**Cause 1 (title):** Spider tried `h3 a::text` which returns a whitespace text node as the first result; `.get("")` grabbed the whitespace, `.strip()` gave `""`. The title is not in `h3 a` in the spare parts section anyway.  
**Cause 2 (price):** Spider tried `strong.price-detail`, `.price-details strong`, etc. — none of these exist in the spare parts listing structure. Price is in `strong.generic-white.fs18`.  
**Fix:** Switched to text-node extraction. PakWheels spare parts cards have a predictable text-node sequence:  
  - `[PKR price, (optional orig price,) 'See', 'N', 'photo(s)', TITLE, category, subcategory, PKR price, 'Buy Now', ...]`  
  - Title = `all_texts[see_idx + 3]`  
  - Prices = all unique `PKR X` values; `min = sale price`, `max = original price` (for discounted items)  
  - URL = `a[href*="/{listing_id}/"]` using `data-listing-id` attribute on the `li`

---

### OLX Status

OLX is **disabled** in the scheduler. The spider code is preserved in `apps/scraper/app/spiders/olx_spider.py`.

**Root cause:** OLX Pakistan is a pure React SPA. Listing data is loaded client-side by Algolia. To scrape it, we need the Algolia Search API Key embedded in the JS bundle.

**To re-enable:**
1. Wait for IP block to clear (Cloudflare rate limit — typically 24h)
2. Open Chrome DevTools → Network → filter `algolia`  
3. Navigate to `https://www.olx.com.pk/bumpers_c709XXX` (relevant sub-category page)
4. Capture the POST request to `ll8iz711cs-dsn.algolia.net` — copy the `X-Algolia-API-Key` header and request body shape
5. Update `olx_spider.py` to call the Algolia API directly with the correct key and index
6. Re-add `OlxSpider` to `SPIDER_CLASSES` in `jobs.py`

**Alternative:** OLX exposes specific sub-category pages (Bumpers, Lights, Windscreen, Mirrors, Doors, Fenders, Bonnets — each with its own `_cXXXXXX` URL). These may also be queryable via Algolia with a category filter.

---

### Scraper Current State

| Spider | Status | Records in DB |
|--------|--------|---------------|
| PakWheels | ✅ Working — runs every 12h | 66 records (6 part types) |
| OLX | ⏸ Disabled — needs Algolia API key | 0 |

**Part types collected so far:** `bonnet` (20), `bumper_front` (4), `bumper_rear` (6), `headlight` (20), `taillight` (4), `windscreen` (12)

---

### Commits

| Commit | Description |
|--------|-------------|
| `0d66fd5` | fix(scraper): use correct PakWheels spare parts URL |
| `1176615` | fix(scraper): correct URLs for both OLX and PakWheels spiders |
| `39dac98` | debug(scraper): log first PakWheels card HTML |
| `7b3b89a` | debug(scraper): log card text nodes |
| `aef2174` | fix(scraper): correct PakWheels title and price CSS selectors |
| `70a73d5` | fix(scraper): extract PakWheels title and price from text nodes |
| `f3975d2` | fix(scraper): use quoted camelCase column names in INSERT |

---

## Part B — Workshop Profile Editing (PLANNED)

**Background:** Mechanics register their workshop during sign-up (Sprint 13). After registration they have no way to update their workshop details — name, city, address, phone, or services.

### Stories

---

#### S14-001 — Backend: PATCH /workshops/my endpoint

**Estimate:** 3 SP  
**Status:** 🔲 Not started

**Acceptance criteria:**
- [ ] `PATCH /workshops/my` endpoint added to `WorkshopsController`
- [ ] Requires `MECHANIC` role (JWT guard + role guard)
- [ ] Accepts a `UpdateWorkshopDto` with all fields optional: `name`, `city`, `address`, `phone`
- [ ] Returns the updated workshop object
- [ ] If the authenticated user has no workshop, returns 404
- [ ] Swagger documented with `@ApiBody`, `@ApiOkResponse`

---

#### S14-002 — Backend: Workshop Services Management

**Estimate:** 2 SP  
**Status:** 🔲 Not started

**Acceptance criteria:**
- [ ] `PUT /workshops/my/services` endpoint replaces the workshop's full services list
- [ ] Accepts `{ services: string[] }` — replaces existing services, not appends
- [ ] Services are stored in `WorkshopService` table linked to the workshop
- [ ] Returns the updated list of services
- [ ] Requires `MECHANIC` role

---

#### S14-003 — Frontend: Workshop Profile Edit Page

**Estimate:** 5 SP  
**Status:** 🔲 Not started

**Acceptance criteria:**
- [ ] New page at `/mechanic/profile` — "Edit Workshop Profile"
- [ ] Pre-populated form with current workshop data fetched from `GET /workshops/my`
- [ ] Fields: Workshop Name, City, Address, Phone
- [ ] Services section: add/remove service tags (e.g. "Engine Repair", "Body Work", "Painting")
- [ ] Save button calls `PATCH /workshops/my` — shows success toast on save
- [ ] Link to this page from the mechanic dashboard (e.g. "Edit Profile" button in header or sidebar)
- [ ] Validation: name and city required; address and phone optional
- [ ] Loading state while fetching existing data

---

### Sprint Commitment Summary

| ID | Story | Estimate | Status |
|----|-------|----------|--------|
| S14-001 | Backend: PATCH /workshops/my | 3 SP | 🔲 Not started |
| S14-002 | Backend: Workshop Services Management | 2 SP | 🔲 Not started |
| S14-003 | Frontend: Workshop Profile Edit Page | 5 SP | 🔲 Not started |
| **Total** | | **10 SP** | |
