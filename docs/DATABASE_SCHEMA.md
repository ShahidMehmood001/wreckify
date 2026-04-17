# Wreckify — Database Schema

**Version:** 1.0  
**Last Updated:** 2026-04-17  
**Database:** PostgreSQL (Supabase)  
**ORM:** Prisma  

---

## Entity Relationship Overview

```
User ─────────── UserProfile        (1:1)
User ─────────── UserSubscription   (1:1)
User ─────────── UserAIConfig       (1:1)
User ─────────── Vehicle[]          (1:N)
User ─────────── Scan[]             (1:N)
User ─────────── Workshop           (1:1, Mechanic role)
User ─────────── InsuranceAgent     (1:1, Insurance role)
User ─────────── RepairInquiry[]    (1:N, as sender)

Vehicle ──────── Scan[]             (1:N)

Scan ──────────── ScanImage[]       (1:N)
Scan ──────────── DetectedPart[]    (1:N)
Scan ──────────── CostEstimate      (1:1)
Scan ──────────── Report            (1:1)

Workshop ──────── WorkshopService[] (1:N)
Workshop ──────── RepairInquiry[]   (1:N, as receiver)

Plan ──────────── UserSubscription[] (1:N)
```

---

## Prisma Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ─── Enums ────────────────────────────────────────────────────

enum UserRole {
  GUEST
  OWNER
  MECHANIC
  INSURANCE_AGENT
  ADMIN
}

enum PlanName {
  FREE
  PRO
  WORKSHOP
  INSURANCE
  ENTERPRISE
}

enum ScanStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum DamageSeverity {
  MINOR
  MODERATE
  SEVERE
}

enum InquiryStatus {
  PENDING
  RESPONDED
  CLOSED
}

enum WorkshopStatus {
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

enum AIProvider {
  GEMINI
  OPENAI
  ZHIPU
}

// ─── Users ────────────────────────────────────────────────────

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String?
  role      UserRole @default(OWNER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile        UserProfile?
  subscription   UserSubscription?
  aiConfig       UserAIConfig?
  vehicles       Vehicle[]
  scans          Scan[]
  workshop       Workshop?
  insuranceAgent InsuranceAgent?
  inquiriesSent  RepairInquiry[] @relation("InquirySender")

  @@map("users")
}

model UserProfile {
  id        String  @id @default(cuid())
  userId    String  @unique
  firstName String?
  lastName  String?
  phone     String?
  city      String?
  avatarUrl String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}

// ─── Plans & Subscriptions ─────────────────────────────────────

model Plan {
  id            String   @id @default(cuid())
  name          PlanName @unique
  displayName   String
  scansPerMonth Int      // -1 = unlimited
  features      Json     // { byok, priceHistory, insurancePdf, apiAccess, ... }
  priceMonthly  Decimal? // null = free
  isActive      Boolean  @default(true)

  subscriptions UserSubscription[]

  @@map("plans")
}

model UserSubscription {
  id         String   @id @default(cuid())
  userId     String   @unique
  planId     String
  scansUsed  Int      @default(0)
  resetAt    DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan Plan @relation(fields: [planId], references: [id])

  @@map("user_subscriptions")
}

// ─── AI Config (BYOK) ─────────────────────────────────────────

model UserAIConfig {
  id         String     @id @default(cuid())
  userId     String     @unique
  provider   AIProvider @default(GEMINI)
  model      String?
  apiKeyHash String     // AES-256 encrypted
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_ai_configs")
}

// ─── Vehicles ─────────────────────────────────────────────────

model Vehicle {
  id             String   @id @default(cuid())
  userId         String
  make           String
  model          String
  year           Int
  color          String?
  registrationNo String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  scans Scan[]

  @@map("vehicles")
}

// ─── Scans ────────────────────────────────────────────────────

model Scan {
  id             String     @id @default(cuid())
  userId         String?
  vehicleId      String?
  status         ScanStatus @default(PENDING)
  isGuest        Boolean    @default(false)
  guestSessionId String?
  aiProvider     AIProvider @default(GEMINI)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  user          User?          @relation(fields: [userId], references: [id], onDelete: SetNull)
  vehicle       Vehicle?       @relation(fields: [vehicleId], references: [id], onDelete: SetNull)
  images        ScanImage[]
  detectedParts DetectedPart[]
  costEstimate  CostEstimate?
  report        Report?

  @@map("scans")
}

model ScanImage {
  id     String  @id @default(cuid())
  scanId String
  url    String
  angle  String? // front | rear | left | right | detail
  order  Int     @default(0)

  scan Scan @relation(fields: [scanId], references: [id], onDelete: Cascade)

  @@map("scan_images")
}

model DetectedPart {
  id              String         @id @default(cuid())
  scanId          String
  partName        String
  severity        DamageSeverity
  confidenceScore Float
  boundingBox     Json           // { x, y, width, height }
  description     String?

  scan Scan @relation(fields: [scanId], references: [id], onDelete: Cascade)

  @@map("detected_parts")
}

model CostEstimate {
  id          String   @id @default(cuid())
  scanId      String   @unique
  totalMin    Decimal
  totalMax    Decimal
  currency    String   @default("PKR")
  lineItems   Json
  narrative   String?
  generatedAt DateTime @default(now())

  scan Scan @relation(fields: [scanId], references: [id], onDelete: Cascade)

  @@map("cost_estimates")
}

model Report {
  id          String   @id @default(cuid())
  scanId      String   @unique
  type        String   @default("standard") // standard | insurance
  fileUrl     String
  fileSize    Int?
  generatedAt DateTime @default(now())

  scan Scan @relation(fields: [scanId], references: [id], onDelete: Cascade)

  @@map("reports")
}

// ─── Workshops ────────────────────────────────────────────────

model Workshop {
  id          String         @id @default(cuid())
  userId      String         @unique
  name        String
  city        String
  address     String?
  phone       String?
  description String?
  status      WorkshopStatus @default(PENDING)
  rating      Float?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  services  WorkshopService[]
  inquiries RepairInquiry[]

  @@map("workshops")
}

model WorkshopService {
  id         String @id @default(cuid())
  workshopId String
  name       String

  workshop Workshop @relation(fields: [workshopId], references: [id], onDelete: Cascade)

  @@map("workshop_services")
}

model RepairInquiry {
  id         String        @id @default(cuid())
  scanId     String?
  senderId   String
  workshopId String
  message    String?
  status     InquiryStatus @default(PENDING)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  sender   User     @relation("InquirySender", fields: [senderId], references: [id], onDelete: Cascade)
  workshop Workshop @relation(fields: [workshopId], references: [id], onDelete: Cascade)

  @@map("repair_inquiries")
}

// ─── Insurance ────────────────────────────────────────────────

model InsuranceAgent {
  id        String   @id @default(cuid())
  userId    String   @unique
  company   String
  licenseNo String?
  city      String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("insurance_agents")
}

// ─── Scraper Data ─────────────────────────────────────────────

model ScrapedPartPrice {
  id        String   @id @default(cuid())
  partName  String
  carMake   String?
  carModel  String?
  carYear   Int?
  priceMin  Decimal
  priceMax  Decimal
  currency  String   @default("PKR")
  source    String   // olx | pakwheels
  sourceUrl String?
  scrapedAt DateTime @default(now())

  @@index([partName, carMake])
  @@map("scraped_part_prices")
}

model LaborCost {
  id        String   @id @default(cuid())
  partName  String
  city      String
  laborMin  Decimal
  laborMax  Decimal
  currency  String   @default("PKR")
  updatedAt DateTime @updatedAt

  @@unique([partName, city])
  @@map("labor_costs")
}

// ─── Scraper Logs ─────────────────────────────────────────────

model ScraperLog {
  id           String    @id @default(cuid())
  source       String    // olx | pakwheels
  status       String    // success | failed
  recordsAdded Int       @default(0)
  errorMessage String?
  startedAt    DateTime
  finishedAt   DateTime?

  @@map("scraper_logs")
}
```

---

## Seed Data

On first run, the following seed data is required:

### Plans
```json
[
  { "name": "FREE",       "displayName": "Free",      "scansPerMonth": 3,  "priceMonthly": null },
  { "name": "PRO",        "displayName": "Pro",       "scansPerMonth": -1, "priceMonthly": 999 },
  { "name": "WORKSHOP",   "displayName": "Workshop",  "scansPerMonth": -1, "priceMonthly": 1499 },
  { "name": "INSURANCE",  "displayName": "Insurance", "scansPerMonth": -1, "priceMonthly": 1999 },
  { "name": "ENTERPRISE", "displayName": "Enterprise","scansPerMonth": -1, "priceMonthly": null }
]
```

### Plan Features (JSON)
```json
{
  "FREE":       { "byok": false, "priceHistory": false, "insurancePdf": false, "apiAccess": false },
  "PRO":        { "byok": true,  "priceHistory": true,  "insurancePdf": false, "apiAccess": false },
  "WORKSHOP":   { "byok": true,  "priceHistory": true,  "insurancePdf": false, "apiAccess": false },
  "INSURANCE":  { "byok": true,  "priceHistory": true,  "insurancePdf": true,  "apiAccess": false },
  "ENTERPRISE": { "byok": true,  "priceHistory": true,  "insurancePdf": true,  "apiAccess": true  }
}
```

### Labor Costs (sample — manually curated)
```json
[
  { "partName": "bumper_front",   "city": "Lahore",    "laborMin": 2000, "laborMax": 5000 },
  { "partName": "bumper_front",   "city": "Karachi",   "laborMin": 2500, "laborMax": 6000 },
  { "partName": "bumper_front",   "city": "Islamabad", "laborMin": 3000, "laborMax": 7000 },
  { "partName": "door_left",      "city": "Lahore",    "laborMin": 3000, "laborMax": 8000 },
  { "partName": "bonnet",         "city": "Lahore",    "laborMin": 2500, "laborMax": 6000 },
  { "partName": "windscreen",     "city": "Lahore",    "laborMin": 1500, "laborMax": 3000 }
]
```
