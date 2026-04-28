# Product Backlog

Items here are approved for future sprints but not yet scheduled. Each item includes the PRD reference, priority, and enough context for a developer to pick it up without prior knowledge.

---

## Sprint 11 Candidates

### Email Verification
**Priority:** High  
**PRD ref:** Section 6.1  
**Background:** Currently users register and are immediately active — no email is verified. This was deferred from Sprint 9 to avoid scope creep.  
**Agreed approach (Option B):** Send verification email on first login attempt if email is unverified, block access until verified.  
**Provider:** Resend (free tier, no credit card required).  
**Scope:**
- Add `emailVerified: boolean` and `emailVerificationToken: string?` to `User` model (Prisma migration)
- `POST /auth/verify-email` — accepts token, marks user verified
- `POST /auth/resend-verification` — resends email
- Login endpoint: if `!emailVerified`, send verification email and return 403 with message "Please verify your email"
- Email template: simple branded HTML with a verify button
- Frontend: show "Check your email" screen after register; show "Email not verified" error on login with resend button

---

### Cloud Storage Migration (Images)
**Priority:** Medium  
**PRD ref:** Section 6.3  
**Background:** Uploaded images are currently stored on a Docker named volume (`api_uploads`). This is ephemeral relative to infrastructure — if the server is reprovisioned the volume is lost. Also does not scale horizontally.  
**Agreed approach (Option B — Cloudinary or S3):**
- Add `CLOUDINARY_URL` (or `AWS_S3_BUCKET` + credentials) to environment
- Replace multer `diskStorage` in `scans.controller.ts` with a cloud upload adapter
- `img.url` in the DB would then store the CDN URL (already absolute, so frontend code needs no changes)
- Keep local `diskStorage` as a fallback for development (`NODE_ENV !== 'production'`)

---

## Sprint 12 Candidates

### Price Trend Charts
**Priority:** Low  
**PRD ref:** Section 7 (Stretch Goals)  
**Description:** Show historical spare parts price charts per make/model on the scan result and workshop pages. Data is already being scraped and stored — this is purely a frontend visualisation feature using a charting library (Recharts or Chart.js).

---

### WhatsApp / Email Report Sharing
**Priority:** Low  
**PRD ref:** Section 7 (Stretch Goals)  
**Description:** Add a "Share" button on the scan result page that either generates a WhatsApp deep link with a summary message, or sends the PDF to an email address via Resend. Resend integration would already be in place after the email verification sprint.

---

### Real Payment Integration
**Priority:** Low (Post-v1)  
**PRD ref:** Section 10 (Out of Scope for v1)  
**Description:** Integrate JazzCash or Stripe for Pro plan upgrades. The plan model and feature-flag enforcement are already fully implemented — payment is the only missing piece. The "Upgrade Plan" button on the BYOK locked card is already in place as a placeholder.

---

### PWA / Mobile Optimisation
**Priority:** Low (Post-v1)  
**PRD ref:** Section 7 (Stretch Goals)  
**Description:** Add a `manifest.json`, service worker, and install prompt to make the app installable on mobile. Next.js has first-class PWA support via `next-pwa`.

---

## Deferred / On Hold

| Item | Reason deferred | Revisit when |
|------|----------------|--------------|
| Multi-language (Urdu) | Significant i18n effort; not in v1 scope | Post-v1 |
| Insurance claim submission | Requires third-party API partnerships | Post-v1 |
| Bulk scan API (Enterprise) | No enterprise customers yet | When first enterprise deal is signed |
| Workshop rating system | Requires inquiry flow to be complete first | After S10-007 ships |
| Video damage assessment | Different ML model pipeline needed | Post-v1 research spike |
