# Pricing Plan Review — gari.pk Multi-Tier Approach

**Status:** FINAL ✅  
**Date:** 2026-05-08  
**Purpose:** Multi-role planning review of the proposed gari.pk scraping strategy before Sprint 17 begins.  
**Background:** Previous plan (PakWheels scraping with generic queries) was scrapped — it produced listings with no car context. New plan: scrape gari.pk which already organizes spare parts prices by make, model, and condition tier.

---

## What Is Being Reviewed

The proposed approach:
- Scrape `gari.pk/new-cars/{make}/{model}/spare-parts-price/` — one URL per car model
- gari.pk organizes prices into 3 tiers: **Genuine**, **Duplicate**, **Second-hand**
- Store all 3 tiers per part per model in the database
- Display 3-tier price table on the scan result page after each damaged part is identified

---

## Role Reviews

---

### Business Analyst

**Overall verdict: Correct direction. Three decisions must be made before development starts.**

---

**Issue BA-01 — gari.pk Legal Risk Is Unmitigated**

gari.pk is a commercial platform. Scraping their pricing data to power a competing product — without a partnership agreement — is a legal risk. Their Terms of Service and robots.txt have not been reviewed.

*Decision required:*
- Before Sprint 17 is coded: manually check `gari.pk/robots.txt` and their ToS
- Accept the risk for MVP (scraping is common practice in Pakistani market) and add a note to revisit with a data partnership offer once Wreckify has traction
- If robots.txt disallows scraping: discuss alternatives (manual seed table, direct outreach to gari.pk)

**Accepted risk for MVP. Must be re-evaluated before Series A or commercial launch.**

---

**Issue BA-02 — gari.pk Has 3 Tiers, Not 4**

The original proposal mentioned 4 tiers (Genuine, Chinese, Local, Used). gari.pk provides exactly 3:
- **Genuine** — brand new OEM parts from authorized dealers
- **Duplicate** — covers both Chinese imports AND locally made parts (gari.pk does not separate these)
- **Second-hand** — used parts from salvage or private sellers

The "Chinese vs Local" split does not exist in gari.pk's data. Attempting to split "Duplicate" into sub-tiers would require manual research and maintenance — not justified at this stage.

*Decision: Use 3 tiers. Rename for better UX:*

| gari.pk label | Our label | Who uses it |
|---|---|---|
| Genuine | **Genuine OEM** | New car owners, insurance claims, high-end vehicles |
| Duplicate | **Aftermarket** | Middle-income owners, budget repairs (most common in Pakistan) |
| Second-hand | **Used / Salvage** | Tight budgets, older rare-model cars |

---

**Issue BA-03 — City-Specific Pricing**

gari.pk may provide city-specific prices (Lahore, Karachi, Islamabad differ due to transport costs and supply). If we scrape a single city, we misrepresent prices for users in other cities.

*Decision for MVP:* Scrape without city filter (national average/listing), label as "Pakistan market average." Revisit city-level pricing in a future sprint once we have user location data.

---

**Issue BA-04 — Aftermarket Tier Is the Core Value Proposition**

In Pakistan's market, 70–80% of repairs use Aftermarket (Duplicate) parts. Genuine is for the minority (new cars, insurance). Used is the last resort. Our product's primary value to most users is the **Aftermarket price** — that should be the default highlighted tier.

*Decision: Aftermarket tier is visually primary in the UI. Genuine and Used are shown but de-emphasized.*

---

**Issue BA-05 — This Creates a Proprietary Data Asset**

gari.pk is the source now. But as workshops in our network submit quotes through the inquiry system, we start collecting real workshop repair prices from Pakistan. Over time, our own network data becomes more valuable and more accurate than gari.pk's listings. Sprint 17 should be designed so workshop-sourced prices can be added to the same pricing table later.

---

### Product Manager

**Overall verdict: Strong plan. UI design decisions need to be locked before development.**

---

**Issue PM-01 — Terminology Directly Affects User Trust**

"Duplicate" sounds like counterfeit. "Second-hand" sounds unreliable. Users need to understand what they're looking at to trust the numbers.

*Decision — final labels and descriptions:*

| Tier | Label | Tooltip shown to user |
|---|---|---|
| Genuine | Genuine OEM | Brand new, manufacturer-approved. Longest lasting. Required for warranty repairs. |
| Duplicate | Aftermarket | Imported or locally produced alternative. Quality varies — most popular choice in Pakistan. |
| Second-hand | Used / Salvage | Removed from a wrecked vehicle. Cheapest option; condition not guaranteed. |

---

**Issue PM-02 — Combined Total Must Show Per-Tier Totals**

The PRICING_FLOW.md design shows a combined total in the collapsed view. With 3 tiers, there are now 3 possible totals. The user needs to see: "If I go Aftermarket for everything, my total is PKR 28,000."

*Decision — collapsed view shows Aftermarket total by default:*
```
Damage Assessment — 2019 Honda Civic

AI Estimate          PKR 28,000 – 52,000    total
Aftermarket Market   PKR 22,000 – 41,000    total  ← default tier shown
[Switch to: Genuine · Used]

[View part-by-part breakdown ▾]
```

Expanded view shows all 3 tiers per part.

---

**Issue PM-03 — Guest Scan Must Show Prices After Sprint 17**

Currently guest scans show detection only. The 3-tier price table is the strongest conversion hook. After Sprint 17 data is live, the guest scan result should show Aftermarket prices with a "Get full PDF report — free account" CTA. No AI estimate needed — just a gari.pk lookup by detected parts and vehicle model.

*This is a requirement for Sprint 18, not optional.*

---

**Issue PM-04 — Mechanic Inquiry Context Must Include Tier**

When an owner sends a workshop inquiry after a scan, the mechanic should see which tier the owner is expecting. A mechanic quoting genuine parts to a customer who expects aftermarket prices will lose the business. The inquiry message should include: "Customer is interested in Aftermarket parts."

*Add tier preference to inquiry creation flow (future sprint).*

---

**Issue PM-05 — Missing Data Must Be Handled Gracefully**

gari.pk will not have every part for every model. The UI must never show a blank section with no explanation. Rules:
- If a tier has data → show it
- If a tier has no data → show "No data available" for that tier
- If ALL tiers have no data → show "Market data not yet available for this part" and show AI estimate only

---

### Senior Expert Developer

**Overall verdict: Technically sound. Four architecture decisions need resolving before a line of code is written.**

---

**Issue DEV-01 — Is gari.pk JavaScript-Rendered?**

This is the highest-risk unknown. If gari.pk renders price tables via JavaScript (React, Vue, etc.), `requests + BeautifulSoup` will return an empty HTML shell and the scraper will silently collect nothing.

*Must do before Sprint 17:*
- Manually visit `gari.pk/new-cars/honda/civic/spare-parts-price/`
- Disable JavaScript in browser (Chrome DevTools → Settings → Disable JavaScript)
- If prices disappear → JS-rendered → need Playwright (much more complex, slower)
- If prices remain → server-rendered → BeautifulSoup is enough

*If JS-rendered: Sprint 17 scope and timeline must be revised.*

---

**Issue DEV-02 — Schema Redesign Required**

Current `ScrapedPartPrice` schema has `priceMin`, `priceMax` as a single range. 3-tier data requires a structural change.

*Two options:*

**Option A — Add a `grade` enum column (recommended)**
```prisma
enum PartGrade {
  GENUINE
  AFTERMARKET
  USED
}

model ScrapedPartPrice {
  // existing fields
  grade    PartGrade
  // existing priceMin, priceMax stay the same
  // one row per tier per part per model
  @@unique([partName, carMake, carModel, grade])
  @@index([partName, carMake, carModel, grade])
}
```

One row per tier. Clean, queryable, easy to add new tiers later. Upsert on the unique key.

**Option B — Three price pair columns**
```prisma
model ScrapedPartPrice {
  genuineMin  Decimal?
  genuineMax  Decimal?
  aftermarketMin Decimal?
  aftermarketMax Decimal?
  usedMin     Decimal?
  usedMax     Decimal?
}
```

One row per part per model. Simpler queries but harder to extend.

*Decision: Option A (grade enum). Normalized, extensible, consistent with fallback chain querying by grade.*

---

**Issue DEV-03 — Part Name Mapping Dictionary Needed**

gari.pk uses human-readable names ("Front Bumper", "Headlight Assembly"). Our system uses canonical snake_case names ("bumper_front", "headlight"). A mapping dictionary must be defined before the scraper is coded — without it, scraped data cannot be linked to detected parts.

*Required mapping (to be expanded during Sprint 17):*

| gari.pk name | Our canonical name |
|---|---|
| Front Bumper | bumper_front |
| Rear Bumper | bumper_rear |
| Headlight / Headlamp | headlight |
| Tail Light / Taillight | taillight |
| Bonnet / Hood | bonnet |
| Boot Lid / Trunk | boot |
| Windscreen / Windshield | windscreen |
| Door | door_left / door_right (see note) |
| Fender / Mudguard | fender_left / fender_right (see note) |
| Side Mirror | mirror_left / mirror_right (see note) |
| Roof Panel | roof |

*Note: gari.pk lists "Door" generically, not left/right. Store under a single `door` key and apply to both `door_left` and `door_right` lookups.*

---

**Issue DEV-04 — URL Slug Mapping for All 17 Cars**

gari.pk uses lowercase hyphenated slugs. Our Pakistan cars list uses proper case names. The scraper needs an explicit mapping — do not assume the slug is simply `make.toLowerCase()`.

*Required URL mapping:*

| Our make/model | gari.pk URL slug |
|---|---|
| Suzuki / Mehran | `/suzuki/mehran/` |
| Suzuki / Alto | `/suzuki/alto/` |
| Suzuki / Cultus | `/suzuki/cultus/` |
| Suzuki / Wagon R | `/suzuki/wagon-r/` |
| Suzuki / Swift | `/suzuki/swift/` |
| Toyota / Corolla | `/toyota/corolla/` |
| Toyota / Yaris | `/toyota/yaris/` |
| Toyota / Hilux | `/toyota/hilux/` |
| Toyota / Fortuner | `/toyota/fortuner/` |
| Toyota / Prado | `/toyota/prado/` |
| Honda / Civic | `/honda/civic/` |
| Honda / City | `/honda/city/` |
| Honda / HR-V | `/honda/hrv/` *(verify)* |
| Honda / BR-V | `/honda/brv/` *(verify)* |
| Kia / Sportage | `/kia/sportage/` *(verify — may not exist)* |
| Kia / Picanto | `/kia/picanto/` *(verify)* |
| Hyundai / Tucson | `/hyundai/tucson/` *(verify)* |
| Hyundai / Elantra | `/hyundai/elantra/` *(verify)* |
| Changan / Alsvin | *(likely not on gari.pk — newer model)* |
| MG / HS | *(likely not on gari.pk — newer model)* |

*Items marked "verify" must be manually confirmed before Sprint 17 coding. Items "likely not on gari.pk" need a fallback strategy.*

---

**Issue DEV-05 — Existing ScrapedPartPrice Data Is Unusable**

All existing records in `scraped_part_prices` were collected from generic PakWheels queries. They have:
- `carMake = null` on most records (car info not in listing titles)
- No `grade` column
- No car-model specificity

These records cannot be migrated to the new 3-tier structure. Sprint 17 migration should truncate the table before the new scraper runs.

*Migration plan: `TRUNCATE scraped_part_prices` in the Sprint 17 migration after adding the `grade` column.*

---

**Issue DEV-06 — Scraper Must Be Polite**

gari.pk is a small Pakistani platform. Hammering it with 17 rapid sequential requests will likely trigger IP-based blocking or put unnecessary load on their servers.

*Scraper rules:*
- Add `time.sleep(2)` between each model page request
- Set a proper `User-Agent` header identifying the scraper (transparent, not disguised)
- Run scraper maximum once per week (data changes slowly)
- Handle HTTP 429/503 responses with exponential backoff
- Log all requests in `ScraperLog`

---

### Senior Expert QA

**Overall verdict: Strong approach with clear validation requirements. Define acceptance criteria before Sprint 17 starts.**

---

**Issue QA-01 — Scraper Needs Automated Validation After Each Run**

A scraper that runs silently and collects 0 records (due to HTML structure change) is worse than no scraper — it looks like it's working but the database is empty.

*Required post-scrape assertions (logged in ScraperLog):*
- At least 15 of 17 models successfully scraped (allow 2 failures)
- At least 8 of 10 canonical parts found per model
- All 3 tiers present for at least 70% of model/part combinations
- Every price: `priceMin > 0`, `priceMax >= priceMin`, `priceMin >= 500 PKR`, `priceMax <= 2,000,000 PKR`

If any assertion fails: log error, alert (email to admin), do NOT commit partial data.

---

**Issue QA-02 — Price Sanity Cross-Check**

A genuine part should cost more than an aftermarket equivalent, which should cost more than a used one. If gari.pk has data where `genuineMin < aftermarketMin` for the same part and model, the data is likely wrong (mislabeled on gari.pk).

*Validation rule:* After scraping, flag records where `genuine.priceMin < aftermarket.priceMin` for same part/model. Log warning. Show data but mark as `flagged`.

---

**Issue QA-03 — Part Name Mapping Gaps Are Silent**

If gari.pk uses "Bonnet" but our mapping dictionary only has "Hood", the part is scraped but never linked to `bonnet` in our system. The lookup silently returns no data.

*QA test:* After scraping, assert that every row in `ScrapedPartPrice` has a `partName` that maps to one of our 11 canonical parts. Records with unmapped `partName` should be logged and flagged.

---

**Issue QA-04 — Coverage Report Is a Sprint 17 Deliverable**

Sprint 17 must not close until a coverage report has been reviewed:

```
Scrape run: 2026-XX-XX
Models scraped:       15/17 (Changan Alsvin, MG HS — not found on gari.pk)
Parts per model avg:  8.4/10
3-tier coverage:      72% of combinations have all 3 tiers
                      91% have at least Aftermarket tier
Flagged records:       3 (genuine < aftermarket price anomaly)
```

Sprint 18 display design depends on this coverage data. If coverage is below 50%, Sprint 18 UI must emphasize fallback messaging.

---

**Issue QA-05 — Regression Testing Scan Results Page**

When market price section is added to the scan detail page in Sprint 18, existing scans (which have no market data) must not show broken UI. Test:
- Scan with no vehicle → AI estimate only, no market section shown
- Scan with vehicle but no gari.pk data → "Market data not yet available"
- Scan with vehicle and partial data → shows available tiers, hides missing ones
- Scan with vehicle and full data → shows all 3 tiers

---

### Project Manager

**Overall verdict: Dependencies are clear. Three gates must be enforced.**

---

**Issue PM-01 — Gate 1: Confirm gari.pk Is Scrapable Before Sprint 17 Starts**

Before writing a single line of Sprint 17 code, a developer must manually:
1. Visit `gari.pk/new-cars/honda/civic/spare-parts-price/`
2. Disable JavaScript, confirm data is visible (server-rendered)
3. Check `gari.pk/robots.txt`
4. Confirm at least 10 of 17 target models have pages on gari.pk

If the site is JS-rendered: reassess scope. Playwright adds significant complexity and Sprint 17 timeline must be extended.
If <10 models found: decide whether to supplement with manual seed data.

*This gate must be cleared as the first task of Sprint 17 — before any code is written.*

---

**Issue PM-02 — Gate 2: Data Review Before Sprint 18 Starts**

Sprint 18 (market price display) depends entirely on Sprint 17 producing clean, usable data. Sprint 18 must NOT start until:
- Sprint 17 scraper has run at least once on the real database
- The coverage report (QA-04) has been reviewed and accepted
- Minimum threshold: 70% coverage across model/part/tier combinations

If coverage is below threshold: Sprint 18 scope must be adjusted (display shows partial data gracefully, not as a feature gap).

---

**Issue PM-03 — Gate 3: Critical Fixes Before Sprint 17**

The TECH_REVIEW.md identifies 4 critical issues (C-01 through C-04). These must be resolved before Sprint 17 adds more complexity to the codebase. Recommended: dedicate 2–3 days at the start of Sprint 17 to closing C-01, C-02, C-03. C-04 (notifications) can be its own small sprint after Sprint 17.

---

**Issue PM-04 — Sprint 17 Scope Is Bounded and Measurable**

Sprint 17 is complete when:
1. `grade` enum column added and migrated on `ScrapedPartPrice`
2. gari.pk URL slug mapping defined for all confirmed models
3. Part name mapping dictionary implemented
4. Scraper runs successfully on all confirmed models
5. Coverage report produced and reviewed
6. ScraperLog records the run result

Sprint 17 does NOT include UI changes. Those are Sprint 18.

---

## Decisions Log

| # | Question | Decision | Rationale |
|---|---|---|---|
| D1 | 3 tiers or 4? | **3 tiers** (Genuine OEM, Aftermarket, Used/Salvage) | gari.pk does not separate Chinese from Local in Duplicate tier. Splitting without data is speculation. |
| D2 | DB schema: grade column or 3 price pairs? | **Grade enum column, one row per tier** | More normalized, easier to query by tier, extensible for future tiers (e.g. workshop-sourced). |
| D3 | City-specific pricing? | **National average for MVP** | No user location data yet. Revisit when city-level data is valuable. |
| D4 | Which tier is default in UI? | **Aftermarket** | 70–80% of Pakistani car owners use aftermarket. This is the most relevant number for most users. |
| D5 | What to do with existing PakWheels data? | **Truncate before Sprint 17 scraper runs** | Existing data is useless (carMake=null, no grade). Mixing it with clean gari.pk data would corrupt queries. |
| D6 | gari.pk legal risk? | **Accept for MVP, document risk** | Scraping is common practice in Pakistan's market. Revisit with a data partnership proposal post-launch. |
| D7 | Models not on gari.pk (Changan, MG)? | **AI estimate only for those models, no market section** | Consistent with PRICING_FLOW.md luxury/rare car handling. Document which models are excluded. |

---

## Sprint 17 Pre-Conditions Checklist

Before any Sprint 17 code is written:

- [ ] Manually verify gari.pk is server-rendered (disable JS, confirm prices visible)
- [ ] Check `gari.pk/robots.txt`
- [ ] Confirm which of the 17 models have pages on gari.pk
- [ ] Finalize URL slug mapping for all confirmed models
- [ ] Finalize part name mapping dictionary (gari.pk names → canonical names)
- [ ] Close TECH_REVIEW issues C-01, C-02, C-03
- [ ] Get product sign-off on tier labels (Genuine OEM / Aftermarket / Used Salvage)
