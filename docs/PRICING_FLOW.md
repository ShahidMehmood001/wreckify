# Pricing Flow — Design Document

**Status:** FINAL ✅  
**Created:** 2026-05-07  
**Purpose:** Define the correct end-to-end flow for damage cost estimation and market price comparison before any code is written.

---

## 1. Problem Statement

The current system has three disconnected pieces that were built in isolation:

1. **AI cost estimation** — generates PKR estimates from photos alone, with no knowledge of the car make or model. A Suzuki Mehran and a Toyota Land Cruiser get the same estimate for the same damage photo, which is meaningless.

2. **Scraped price data** — PakWheels listings collected via `?q=bumper` generic queries. Most records have `carMake = null` because generic listings don't mention the car. The data exists in the DB but is displayed nowhere and matched to nothing.

3. **Vehicle profiles** — users can register their car (make, model, year) and link it to a scan. This data is never passed to the AI and never used for price lookup. It's collected and then ignored.

The result: the cost estimate shown to users is unreliable, the scraped data serves no purpose, and the vehicle profile the user filled in has no effect on anything they see.

---

## 2. Design Principles

- **No estimate without a car.** A cost estimate without knowing the vehicle is misleading. The system must know the car before producing numbers.
- **AI for damage detection, market data for pricing.** AI is good at identifying *what* is damaged and *how badly*. Real scraped listings are the ground truth for *what it costs* for a specific car.
- **Graceful fallback, honest labeling.** When exact model data is unavailable, fall back to broader data — but always tell the user exactly what the price range is based on.
- **Pakistan market focus.** Coverage targets the 20 most common cars on Pakistani roads. Luxury/rare cars get AI-only estimates with a clear note.

---

## 3. Vehicle Selection — Required, Not Optional

### Current State
Vehicle selection when creating a scan is optional. Many scans have no vehicle linked.

### New Rule
**Vehicle selection is mandatory before a scan can be submitted.** No vehicle = no scan.

### Implementation
- Scan creation page shows a vehicle selector as the first step.
- If the user has registered vehicles, they pick from a dropdown.
- If they have no vehicles yet, a compact inline form lets them register one (Make, Model, Year — minimum required fields) without leaving the scan page.
- The selected vehicle's `id`, `make`, `model`, and `year` are stored on the scan record and passed to the AI.

### Guest Scans
Guest users (1 free scan, no account) must provide Make, Model, Year **before** uploading images. These fields are stored on the scan but not persisted to a profile (no account = no saved vehicle).

**Decision (2026-05-07):** Require vehicle details before upload, not after. A guest who sees an accurate, car-specific estimate is the one who converts to a paid account. A guest who sees a generic estimate sees nothing impressive and leaves. Three dropdowns (Make, Model, Year) is low friction. It also gives us intent data on which models are being scanned most.

---

## 4. Corrected Scan + AI Flow

```
Step 1 — Vehicle Selection
  User picks or registers: Make, Model, Year
  e.g. Honda · Civic · 2019

Step 2 — Image Upload
  User uploads 1–5 photos of the damaged vehicle

Step 3 — AI Analysis (with vehicle context)
  Prompt includes:
    "Vehicle: 2019 Honda Civic
     Analyze the images for exterior damage.
     Identify each damaged part by name, assess severity (MINOR / MODERATE / SEVERE),
     and estimate repair and replacement costs in PKR for this specific vehicle."

  AI returns:
    - Detected parts with severity and confidence
    - Cost estimate: line items per part (parts cost + labor), total min/max

Step 4 — Market Price Lookup
  For each detected part, query scraped data:
    WHERE partName = 'bumper_front'
    AND carMake = 'Honda'
    AND carModel = 'Civic'
    ORDER BY scrapedAt DESC
  Apply fallback chain (Section 6.1) if no exact match

Step 5 — Scan Result Display
  Per damaged part:
    - Part name + severity badge
    - AI estimate range (parts + labor)
    - Market comparison: "Front Bumper for Honda Civic — PKR 8,000–22,000
      based on 14 PakWheels listings"
    - Data source and freshness ("Last updated: 3 days ago")

Step 6 — Workshop Inquiry
  Mechanic receives:
    - Vehicle: 2019 Honda Civic
    - Damaged parts with severity
    - AI cost estimate
    - Market price ranges
  Mechanic has full context to provide an accurate quote
```

---

## 5. Scraper Strategy — gari.pk (Revised 2026-05-08)

> **Previous plan (PakWheels generic queries) is retired.** PakWheels search results return listings with `carMake = null` because generic queries produce no car context in the title. See PRICING_PLAN_REVIEW.md for the full multi-role review that produced this revision.

### 5.1 Why gari.pk

gari.pk already organizes spare parts prices by make, model, and condition tier. Their URL pattern is clean and predictable, data is structured, and — critically — they already separate prices into 3 tiers that map directly to Pakistan's real parts market.

This replaces 170 PakWheels search queries with ~15 structured page scrapes.

### 5.2 Source and URL Pattern

```
https://gari.pk/new-cars/{make-slug}/{model-slug}/spare-parts-price/
```

Examples:
```
gari.pk/new-cars/honda/civic/spare-parts-price/
gari.pk/new-cars/suzuki/mehran/spare-parts-price/
gari.pk/new-cars/toyota/corolla/spare-parts-price/
```

One page per model. Each page contains prices for all major parts across 3 tiers.

### 5.3 The Three Price Tiers

Pakistan's parts market has exactly 3 meaningful tiers. gari.pk labels them; we relabel for better UX:

| gari.pk Label | Our Label | Description |
|---|---|---|
| Genuine | **Genuine OEM** | Brand new, manufacturer-approved. Required for warranty repairs. Most expensive. |
| Duplicate | **Aftermarket** | Chinese imports + locally produced alternatives. Most popular choice in Pakistan. |
| Second-hand | **Used / Salvage** | Removed from wrecked vehicles. Cheapest; condition not guaranteed. |

**Note:** gari.pk does not separate Chinese imports from locally made parts within "Duplicate." Both are stored under `AFTERMARKET` grade. This is intentional — the data does not support a finer split.

### 5.4 Database Schema — Grade Enum

The existing `ScrapedPartPrice` table gains a `grade` column. One row per part per model per tier:

```prisma
enum PartGrade {
  GENUINE
  AFTERMARKET
  USED
}

model ScrapedPartPrice {
  // existing fields remain
  grade    PartGrade           // NEW — replaces single price range
  @@unique([partName, carMake, carModel, grade])
  @@index([partName, carMake, carModel, grade])
}
```

Upsert strategy: on scrape run, upsert on the unique key `(partName, carMake, carModel, grade)`. This means re-running the scraper simply updates prices rather than creating duplicates.

### 5.5 Part Name Mapping

gari.pk uses human-readable names. Our system uses canonical snake_case. The scraper applies this mapping at parse time:

| gari.pk | Canonical |
|---|---|
| Front Bumper | bumper_front |
| Rear Bumper | bumper_rear |
| Headlight / Headlamp | headlight |
| Tail Light | taillight |
| Bonnet / Hood | bonnet |
| Boot Lid / Trunk | boot |
| Windscreen | windscreen |
| Door (generic) | door_left, door_right (same price applied to both) |
| Fender / Mudguard | fender_left, fender_right (same price applied to both) |
| Side Mirror | mirror_left, mirror_right (same price applied to both) |
| Roof Panel | roof |

### 5.6 Car Coverage

Models confirmed on gari.pk (verify manually before Sprint 17 coding):

| Brand | Models | Status |
|---|---|---|
| Suzuki | Mehran, Alto, Cultus, Wagon R, Swift | Confirmed |
| Toyota | Corolla, Yaris, Hilux, Fortuner, Prado | Confirm |
| Honda | Civic, City, HR-V, BR-V | Confirm |
| Kia | Sportage, Picanto | Verify |
| Hyundai | Tucson, Elantra | Verify |
| Changan | Alsvin | Likely not on gari.pk — AI estimate only |
| MG | HS | Likely not on gari.pk — AI estimate only |

Models not found on gari.pk fall back to AI estimate only with a note: "Market data not available for this model."

### 5.7 Data Quality Rules

A scraped record is saved only if:
- `partName` maps to a known canonical part (see §5.5)
- `grade` is one of GENUINE, AFTERMARKET, USED
- `priceMin > 0` and `priceMax >= priceMin`
- Price is in a sane range: PKR 500 – PKR 2,000,000
- `genuinePrice >= aftermarketPrice` (sanity check — log warning if violated, still save)

### 5.8 Scraper Behaviour

- Run **once per week** (parts prices change slowly)
- `time.sleep(2)` between model page requests — polite crawling
- Proper `User-Agent` header (transparent, not disguised as a browser)
- Handle HTTP 429/503 with exponential backoff
- Log every run in `ScraperLog` with records added/failed per model
- Post-run assertion: alert if fewer than 12 models or fewer than 7 parts per model scraped

### 5.9 Migration from PakWheels Data

All existing `scraped_part_prices` records collected from PakWheels are unusable (most have `carMake = null`, no grade). The Sprint 17 migration will truncate the table before the gari.pk scraper runs for the first time.

---

## 6. Price Display Logic (Revised 2026-05-08)

### 6.1 Fallback Chain

gari.pk is scraped per model — data either exists for a model or it doesn't. The fallback chain applies per tier independently:

```
For each tier (GENUINE, AFTERMARKET, USED):

  Level 1 — Exact model match
    partName = X AND carMake = M AND carModel = Mo AND grade = T
    Label: "for [Make] [Model]"

  Level 2 — Make only (if model not found on gari.pk)
    partName = X AND carMake = M AND grade = T
    Label: "for [Make] vehicles"

  Level 0 — No data for this tier
    Display: "—" (dash) in that tier's column
    If ALL tiers are Level 0: "Market data not yet available for this part"
```

**Year-level matching is removed.** gari.pk provides model-level data without year ranges. This is sufficient — gari.pk's editors already account for generation differences in their pricing. If a part has meaningfully different prices across generations, gari.pk lists them separately by model variant.

### 6.2 Staleness

Records older than **14 days** are excluded from active price lookup. Scraper runs weekly, so 14 days provides one missed-run buffer.

### 6.3 UI Layout in Scan Result — Three Tiers

**Decision (2026-05-08):** Aftermarket is the primary highlighted tier (most users) with Genuine and Used shown as alternatives.

**Collapsed view (default):**
```
┌──────────────────────────────────────────────────────┐
│  Damage Assessment — 2019 Honda Civic                │
│                                                      │
│  AI Estimate        PKR 28,000 – 52,000  total       │
│                                                      │
│  Parts Market — Aftermarket (most popular)           │
│  PKR 18,000 – 35,000  total                          │
│  [Also: Genuine OEM · Used/Salvage]                  │
│  Source: gari.pk                                     │
│                                                      │
│  [View part-by-part breakdown ▾]                     │
└──────────────────────────────────────────────────────┘
```

**Expanded view (on click):**
```
┌──────────────────────────────────────────────────────┐
│  Front Bumper                         ● MODERATE     │
│  AI Estimate       PKR 10,000 – 18,000               │
│                                                      │
│  Genuine OEM       PKR 32,000 – 45,000               │
│  Aftermarket       PKR  8,500 – 14,000   ← default   │
│  Used / Salvage    PKR  2,000 –  5,000               │
│  Source: gari.pk · Honda Civic                       │
│                                                      │
│  Left Headlight                        ● SEVERE      │
│  AI Estimate       PKR  8,000 – 15,000               │
│                                                      │
│  Genuine OEM       PKR 22,000 – 35,000               │
│  Aftermarket       PKR  6,000 – 10,000   ← default   │
│  Used / Salvage    PKR  1,500 –  4,000               │
│  Source: gari.pk · Honda Civic                       │
└──────────────────────────────────────────────────────┘
```

**Source display:** Show `"Source: gari.pk · [Make] [Model]"` as plain text. No clickable link — linking sends users off-platform and away from the workshop inquiry flow.

### 6.4 Missing Tier Handling

Not every tier will have data for every part and model:

| Situation | Display |
|---|---|
| All 3 tiers available | Show all 3 rows |
| Only Aftermarket available | Show Aftermarket row, other rows show "—" |
| No tiers available, model in DB | "Market data not yet available for this part" |
| Model not in gari.pk coverage | "Market data not available for this model" |

---

## 7. Workshop Inquiry Context

When a mechanic receives an inquiry, they currently see:
- Sender name/email
- Optional message
- "Scan attached" badge

After this feature is implemented, they will see:
- Vehicle: Make, Model, Year
- Damaged parts: list with severity per part
- AI estimate: total range + line items
- Market price per part: all 3 tiers (Genuine OEM / Aftermarket / Used) from gari.pk

This gives the mechanic everything needed to provide an accurate counter-quote. The tier breakdown is especially useful — a mechanic can see what the owner can realistically expect to pay for each parts option and price their quote accordingly.

**Future:** When the owner selects a preferred tier (e.g. "I want Aftermarket parts"), that preference travels with the inquiry. The mechanic sees "Customer prefers: Aftermarket" at the top of the inquiry. *(This is a post-Sprint 18 enhancement.)*

---

## 8. Edge Cases

| Scenario | Handling |
|---|---|
| Scan has no vehicle linked (old scans) | Show AI estimate only, no market section. Note: "Link a vehicle to see market prices." |
| Vehicle make is luxury (BMW, Mercedes, Audi) | Not in scraper matrix. Show AI estimate only. Note: "Market data not available for this brand." |
| Vehicle is very old (pre-2000) | Parts are rare, prices highly variable. Show AI estimate only. Note: "Market data unavailable for older vehicles." |
| AI detects a part we don't scrape (e.g., engine mount) | No market data row for that part. AI estimate still shown. |
| Scraper has data but all records > 30 days old | Treat as no data. Trigger a note in the admin scraper dashboard. |
| Multiple severity levels for same part (AI returns left + right headlight separately) | Look up `headlight` once, show same market range for both parts. |
| User scans the same car model twice | Market data is the same. No duplication issue. |

---

## 9. Decisions Log

| # | Question | Decision | Date | Rationale |
|---|---|---|---|---|
| Q1 | Year-level vs model-level lookup? | **Model-level only (gari.pk structure)** | 2026-05-08 | gari.pk provides model-level data. Year-level matching removed — gari.pk editors handle generation differences internally. |
| Q2 | Guest vehicle details before or after image upload? | **Before upload** | 2026-05-07 | Accurate first impression converts guests to paid users. Low friction (3 dropdowns). |
| Q3 | Combined total or per-part breakdown? | **Combined total (Aftermarket) + expandable per-part** | 2026-05-08 | Aftermarket is the primary tier for 70–80% of users. Per-part breakdown shows all 3 tiers. |
| Q4 | Show source URL as clickable link? | **No link — text label only** | 2026-05-07 | Links send users off-platform, bypassing the workshop inquiry flow. `"Source: gari.pk"` as plain text. |
| Q5 | PakWheels scraping vs gari.pk? | **gari.pk — retired PakWheels plan** | 2026-05-08 | PakWheels generic queries produce listings with no car context (carMake=null). gari.pk has structured model-level, tier-organized data. See PRICING_PLAN_REVIEW.md. |
| Q6 | 3 tiers or 4? | **3 tiers: Genuine OEM / Aftermarket / Used Salvage** | 2026-05-08 | gari.pk does not separate Chinese from Local in Duplicate tier. Splitting without data source is speculation. |
| Q7 | Schema: grade column or 3 price pair columns? | **Grade enum, one row per tier** | 2026-05-08 | More normalized, queryable by tier, extensible. |

---

## 10. Implementation Sequence

Development must happen in this order — each step depends on the one before it.

| Sprint | Stories | Status | Why this order |
|--------|---------|--------|----------------|
| **S16** | Require vehicle on scan creation (inline registration) | ✅ Done | AI can't be fixed until vehicle data reliably reaches the scan |
| **S16** | Inject vehicle into AI prompt | ✅ Done | Depends on vehicle always being present |
| **S16.5** | Critical hardening — C-01 rate limiting, C-02 idempotency, C-03 guest bypass | Recommended next | Security and data integrity issues must be fixed before more features are built on top |
| **S17** | Add `grade` enum to ScrapedPartPrice schema + migrate | Planned | Schema must exist before scraper writes data |
| **S17** | Verify gari.pk coverage + build URL/part-name mapping | Planned | Must verify site is scrapable before coding the spider |
| **S17** | Build gari.pk spider (3-tier, per-model structured scrape) | Planned | Good data before display |
| **S17** | Run scraper, review coverage report | Planned | Gate: Sprint 18 does not start until coverage ≥ 70% |
| **S18** | Price lookup API endpoint (3-tier, model-level fallback) | Planned | Depends on clean gari.pk data existing |
| **S18** | Market price display in scan detail page (3 tiers, collapsed/expanded) | Planned | Depends on lookup endpoint |
| **S18** | Market price context in workshop inquiry view | Planned | Depends on lookup endpoint |
| **S18** | Guest scan shows Aftermarket prices post-detection | Planned | Strongest conversion hook — guests see real prices |
