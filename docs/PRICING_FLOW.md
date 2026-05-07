# Pricing Flow — Design Document

**Status:** DRAFT  
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
Guest users (1 free scan, no account) still get a scan, but they must provide Make, Model, Year before uploading images. These fields are stored on the scan but not persisted to a profile.

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

## 5. Scraper Strategy Redesign

### 5.1 The Core Problem with Current Queries

Searching `?q=bumper` returns:
> "Front Bumper for Sale" — price: PKR 5,000

No car info. `carMake = null`. Useless for per-model lookup.

Searching `?q=honda+civic+bumper` returns:
> "Honda Civic 2016–2021 Front Bumper Original" — price: PKR 12,000

Car info is in the title. `carMake = Honda`, `carModel = Civic`. Useful.

### 5.2 New Search Query Matrix

Replace single-part queries with `make + model + part` combinations.

**Formula:** `{model} {part_keyword}` — e.g., `"civic bumper"`, `"mehran headlight"`

This keeps queries short and natural while ensuring the listing title will contain the car model.

**Coverage — Pakistan Top Models:**

| Brand | Models |
|-------|--------|
| Suzuki | Mehran, Alto, Cultus, Wagon R, Swift |
| Toyota | Corolla, Yaris, Hilux, Fortuner, Prado |
| Honda | Civic, City, HR-V, BR-V |
| Kia | Sportage, Picanto |
| Hyundai | Tucson, Elantra |
| Changan | Alsvin |
| MG | HS |

**17 models × 10 part keywords = 170 targeted search queries**

Part keywords: `bumper`, `headlight`, `taillight`, `bonnet`, `windscreen`, `door`, `fender`, `side mirror`, `tailgate`, `roof`

### 5.3 Data Quality Rules

A scraped record is only saved if:
- `partName` is not null (mapped to a known canonical part)
- `carMake` OR `carModel` is not null (at least one extracted from title)
- `priceMin` > 0 and `priceMax` > 0
- Price is in a sane range: PKR 500 – PKR 2,000,000

Records with `carMake = null AND carModel = null` are still saved but flagged as generic and ranked lower in fallback lookups.

### 5.4 Deduplication

Same part + make + model appearing in multiple runs should not produce duplicate rows indefinitely. Insert rule: if a record with the same `partName`, `carMake`, `carModel`, and `sourceUrl` was scraped within the last 7 days, skip it.

---

## 6. Price Display Logic

### 6.1 Fallback Chain

When looking up market prices for a detected part on a given vehicle, apply these levels in order. Stop at the first level that returns ≥ 3 records.

```
Level 1 — Exact model + year range
  partName = X AND carMake = M AND carModel = Mo AND carYear BETWEEN (year-3) AND (year+1)
  Label: "for [Make] [Model] [Year range]"

Level 2 — Model, any year
  partName = X AND carMake = M AND carModel = Mo
  Label: "for [Make] [Model] (all years)"

Level 3 — Make only, any model
  partName = X AND carMake = M
  Label: "for [Make] vehicles"

Level 4 — All makes (generic market range)
  partName = X
  Label: "market average — vehicle not matched"

Level 0 — No data
  No records found at any level
  Display: "No market data yet for this part"
```

### 6.2 Minimum Record Threshold

Show a price range only if there are **≥ 3 records** at that fallback level. Fewer than 3 listings is not statistically meaningful.

### 6.3 Staleness

Records older than **30 days** are excluded from active price lookup. Scraper runs every 12 hours, so data should stay fresh for covered models.

### 6.4 UI Placement in Scan Result

Each damaged part card shows two price rows:

```
┌─────────────────────────────────────────────────┐
│  Front Bumper                    ● MODERATE      │
│                                                  │
│  AI Estimate       PKR 10,000 – 18,000           │
│  Market Range      PKR 8,500 – 22,000            │
│  └─ Honda Civic (all years) · 14 listings        │
│     via PakWheels · updated 2 days ago           │
└─────────────────────────────────────────────────┘
```

If no market data exists for the part:
```
│  Market Range      No data yet for this model    │
```

If only generic (Level 4) data available:
```
│  Market Range      PKR 5,000 – 30,000            │
│  └─ market average — vehicle not matched         │
```

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
- Market range: per part, with fallback level indicated

This gives the mechanic everything they need to provide an accurate counter-quote without seeing the car in person first.

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

## 9. Open Questions (Resolve Before Development)

| # | Question | Options |
|---|---|---|
| Q1 | Should the vehicle year field drive Level 1 lookup, or is model-level (Level 2) good enough for v1? | Level 2 is simpler and more likely to have data. Level 1 is more accurate for facelift models with different part shapes. |
| Q2 | For guest scans, should Make/Model/Year be a required step before image upload, or can they proceed and add it after? | Requiring it before upload is cleaner — the AI needs it anyway. |
| Q3 | Should the scan detail page show a combined total market range or per-part? | Per-part is more useful — a bumper and a headlight are independent purchases. |
| Q4 | Should we show the source URL (PakWheels listing link) to the user? | Useful as a trust signal and lets users browse actual listings. Low effort to add. |

---

## 10. Implementation Sequence

Development must happen in this order — each step depends on the one before it.

| Sprint | Stories | Why this order |
|--------|---------|----------------|
| **S16** | Require vehicle on scan creation (inline vehicle registration) | AI can't be fixed until vehicle data reliably reaches the scan |
| **S16** | Inject vehicle into AI prompt | Depends on vehicle always being present |
| **S17** | Redesign scraper queries (make × model × part matrix) | Build good data before building display |
| **S17** | Add deduplication + data quality rules to scraper pipeline | Needed before data volume grows |
| **S18** | Price lookup API endpoint with fallback chain | Depends on clean scraper data existing |
| **S18** | Market price display in scan detail page | Depends on lookup endpoint |
| **S18** | Market price context in workshop inquiry view | Depends on lookup endpoint |
