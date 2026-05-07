# Wreckify — Future Backlog

Items that are intentionally deferred. Each needs R&D or design work before sprint planning.

---

## Workshop Spare Parts Pricing

**Status:** Needs R&D  
**Origin:** Sprint 14 retrospective

Workshops that also sell spare parts should be able to list their inventory with prices. This complements the scraped PakWheels price data by adding real, local, workshop-specific pricing.

**Open questions to resolve before planning:**
- Data model: is this a separate `WorkshopPart` table, or do we extend `WorkshopService`? Parts have make/model/year compatibility, condition (new/used), and quantity — quite different from services.
- Discovery UX: do owners see workshop part prices when browsing workshops? When viewing a scan result? Both?
- Pricing display: should workshop-listed prices appear alongside scraped market prices as a comparison? (e.g., "Market range: PKR 8,000–12,000 · Available at Ali Auto: PKR 9,500")
- Inventory management: does the mechanic manage stock counts, or is this just a price catalog?
- Search/filter: owners may want to search workshops *by part availability*, not just city/service.

**Likely scope when ready:**
- Backend: `WorkshopPart` model (name, carMake, carModel, carYear, condition, price, inStock)
- Admin: approve/flag suspicious listings
- Mechanic portal: parts inventory management page
- Owner portal: part prices shown on workshop profile and scan result page

---

## Email Verification

**Status:** Deferred (Sprint 13 retro)  
**Approach:** Resend (free tier), Option B flow (verify after registration, block features until verified)

---

## Cloud Storage Migration

**Status:** Deferred (Sprint 13 retro)  
**Approach:** Migrate scan images from local Docker volume to Cloudinary or S3 (Option B)
