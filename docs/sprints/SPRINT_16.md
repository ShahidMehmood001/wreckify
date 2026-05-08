# Sprint 16 — Vehicle-First Scan Flow

**Status:** CLOSED ✅  
**Start date:** 2026-05-08  
**Sprint type:** Feature — Make vehicle required; inject vehicle context into AI

---

## Sprint Goal

Every scan must know the car it is analysing. No vehicle = no scan. This sprint enforces that rule end-to-end (owner and guest flows) and feeds the vehicle make/model/year into the AI detection prompt so estimates are car-specific from the first interaction.

---

## Context

Defined by PRICING_FLOW.md §3 (Vehicle Selection) and §4 (Corrected Scan Flow). The two core gaps:

1. Vehicle selection on scan creation is currently optional — owners can skip it; guests never see it.
2. The AI detection prompt has no vehicle context. A Suzuki Mehran and a Toyota Land Cruiser get the same per-part descriptions for identical damage.

The estimation narrative already uses vehicle data when present (agent.py), so that path just needs guest coverage.

---

## Stories

---

### S16-001 — Require vehicle on scan creation

**Estimate:** 5 SP  
**Status:** ✅ Done

#### Backend

- [ ] Add `guestVehicleMake String?`, `guestVehicleModel String?`, `guestVehicleYear Int?` to `Scan` in `schema.prisma`
- [ ] Run Prisma migration
- [ ] `CreateGuestScanDto` — add required `make: string`, `model: string`, `year: number` fields
- [ ] `createGuestScan()` — validate all three vehicle fields are present; store on scan record
- [ ] `CreateScanDto` — make `vehicleId` required (remove `@IsOptional`)
- [ ] `create()` in scans.service — throw `BadRequestException` if no `vehicleId`

#### Frontend — Owner (`/scan`)

- [ ] Move vehicle selection to the top of the upload card, labelled as required (remove the "optional" label)
- [ ] If user has no registered vehicles: show inline compact registration form — Make (select, Pakistan list), Model (select, filtered by make), Year (select 2000–current)
- [ ] Inline form calls `POST /vehicles`; on success, sets `selectedVehicleId` to new vehicle id
- [ ] "Detect Damage" button disabled/hidden until a vehicle is selected
- [ ] If user has vehicles: show required dropdown (no blank "No vehicle" option; default to first vehicle)

#### Frontend — Guest (`/`)

- [ ] Add vehicle step above image upload section: Make, Model, Year dropdowns (same Pakistan list)
- [ ] Image upload section renders only after all three fields are filled
- [ ] Pass `{ make, model, year }` with `POST /scans/guest`

---

### S16-002 — Inject vehicle into AI prompt

**Estimate:** 3 SP  
**Status:** ✅ Done

#### API (NestJS)

- [ ] `AiClientService.detect()` — add optional `vehicle?: { make, model, year }` parameter; forward to AI service
- [ ] `triggerDetection()` in scans.service — pass `scan.vehicle` (owner) or build vehicle object from `scan.guestVehicleMake/Model/Year` (guest)
- [ ] `triggerEstimation()` — for guest scans, build `vehicle` object from stored guest fields before calling `aiClient.estimate()`

#### AI Service (Python)

- [ ] `DetectRequest` schema — add `vehicle: Optional[VehicleInfo]` field
- [ ] Detect route — forward `vehicle` to detection pipeline (or store for per-part description calls)
- [ ] `BaseVisionProvider.describe_damage()` — add `vehicle_str` parameter
- [ ] All providers (Gemini, OpenAI, Zhipu) — update `describe_damage()` to include vehicle in prompt:
  `"Vehicle: {vehicle_str}. Analyze the {severity} damage to the {part_name}..."`
- [ ] Detection service — pass vehicle through to `describe_damage()` calls

---

## Sprint Commitment Summary

| ID | Story | Estimate | Status |
|----|-------|----------|--------|
| S16-001 | Require vehicle on scan creation | 5 SP | ✅ Done |
| S16-002 | Inject vehicle into AI prompt | 3 SP | ✅ Done |
| **Total** | | **8 SP** | |
