# Sprint 21 — Architecture Hardening

**Status:** PLANNED  
**Sprint type:** Architectural — no new features, no DB schema changes, no frontend changes (except `/v1/` URL prefix)  
**Goal:** Evolve the NestJS API from a working monolith into a professionally structured, scalable codebase. Introduce repository pattern, domain events, retry mechanisms, SOLID service decomposition, strict DTO discipline, and API versioning. Every pattern introduced here directly addresses long-term maintainability and horizontal scalability.

---

## Context — Why This Sprint Exists

The NestJS API was built feature-first and works correctly. What it lacks is the structural discipline required for a production codebase that will grow, be maintained by more than one developer, and need to scale under traffic. Specific problems found during Sprint 21 planning review:

| Problem | Location | Impact |
|---------|----------|--------|
| Services import `PrismaService` directly | All services | Cannot cache, swap ORM, or mock data access without touching business logic |
| `ScansService` has 9 responsibilities | `scans.service.ts` | Any change to scan logic risks breaking unrelated concerns |
| No domain events | All modules | Adding notifications, analytics, or webhooks requires injecting new dependencies into existing services |
| No retry on external HTTP calls | `ai-client.service.ts` | One AI service blip permanently fails a scan |
| Multiple raw `@Query()` decorators in controllers | `admin.controller.ts` | Validation, transformation, and Swagger docs are fragmented — no single DTO owns the contract |
| DTOs defined inline in controller files | `admin.controller.ts` | DTOs are not reusable, not testable in isolation, violate file organisation convention |
| Services receive unwrapped primitives instead of typed interfaces | `workshops.service.ts`, others | Callers can pass arguments in wrong order; no single place documents the contract |
| No API versioning | `main.ts` | Cannot ship breaking changes without coordinating frontend simultaneously |

---

## SOLID Principles Reference

Each story below calls out which SOLID principle it demonstrates. By the end of this sprint, every principle will have a concrete, working example in the codebase.

| Principle | Full Name | Demonstrated In |
|-----------|-----------|-----------------|
| **S** | Single Responsibility | S21-003 (ScansService decomposition) |
| **O** | Open/Closed | S21-004 (Domain events — add handlers without modifying emitters) |
| **L** | Liskov Substitution | S21-002 (Repository — `PrismaUserRepository` substitutable for `IUserRepository`) |
| **I** | Interface Segregation | S21-002 (Narrow repository interfaces — services only see methods they need) |
| **D** | Dependency Inversion | S21-002 (Services depend on abstractions, not Prisma concretions) |

---

## Stories

---

### S21-001 — API Versioning

**Estimate:** 0.5 SP  
**SOLID:** — (infrastructure change)  
**Files:** `apps/api/src/main.ts`, `apps/web/src/lib/api.ts`

Enable NestJS URI versioning globally. All existing routes move from `/api/*` to `/api/v1/*`. Frontend `api.ts` client updated to append `/v1` to the base URL.

```typescript
// main.ts — after app creation
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
```

**Why first:** Lowest risk, zero functional change, unblocks the ability to ship future breaking changes without a coordinated frontend deploy. Do this before touching any other file.

**Acceptance criteria:**
- `GET /api/v1/auth/me` returns the same response as `GET /api/auth/me` did before
- `GET /api/auth/me` returns 404 (old prefix gone)
- Frontend login, scan, dashboard flows work end-to-end after the URL update

---

### S21-002 — Repository Pattern

**Estimate:** 5 SP  
**SOLID:** D (Dependency Inversion), L (Liskov Substitution), I (Interface Segregation)  
**Modules:** Users, Vehicles, Scans, Workshops, Auth

#### Rule

Services **never** import `PrismaService`. All data access goes through a repository interface. `PrismaService` is only known to repository implementations.

#### Structure per module

```
modules/users/
  repositories/
    user.repository.interface.ts    ← IUserRepository
    user.repository.ts              ← PrismaUserRepository implements IUserRepository
```

#### Injection pattern

```typescript
// constants
export const USER_REPOSITORY = 'USER_REPOSITORY';

// users.module.ts
providers: [
  { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  UsersService,
]

// users.service.ts
constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}
```

#### Interface design rule — Interface Segregation

Interfaces must be narrow. A service that only reads users should not be forced to depend on an interface that also exposes `delete` and `updateRole`. Split by use case if needed:

```typescript
export interface IUserReader {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

export interface IUserWriter {
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
}

// Full repository extends both — implementations satisfy all
export interface IUserRepository extends IUserReader, IUserWriter {}
```

#### Modules to cover

| Module | Repository | Methods |
|--------|-----------|---------|
| Users | `IUserRepository` | findById, findByEmail, create, update, getSubscription, getAIConfig, updateAIConfig, upsertProfile |
| Vehicles | `IVehicleRepository` | findById, findAllByUser, create, update, delete |
| Scans | `IScanRepository` | findById, findByIdGuest, findAllByUser, create, updateStatus, addImages, createDetectedParts, createCostEstimate |
| Workshops | `IWorkshopRepository` | findById, findAll, findByOwner, create, update, createInquiry, findInquiriesByWorkshop, findInquiriesBySender, respondToInquiry |
| Auth | uses `IUserRepository` from Users module | no separate repository |

#### Acceptance criteria

- Zero direct `this.prisma.*` calls in any service file
- `PrismaService` import appears only in `*.repository.ts` files and `PrismaModule`
- `tsc --noEmit` passes

---

### S21-003 — SOLID: Decompose ScansService

**Estimate:** 3 SP  
**SOLID:** S (Single Responsibility), O (Open/Closed)  
**File:** `apps/api/src/modules/scans/`

`ScansService` currently owns: guest scan creation, auth scan creation, quota enforcement, image upload, detection queueing, estimation triggering, read queries, market price enrichment, and AI config resolution. Nine responsibilities.

#### Split

| New Service | Single Responsibility | Injected Into |
|-------------|----------------------|---------------|
| `ScanCommandService` | Write operations: create scan, add images, queue detection, trigger estimation | `ScansController` |
| `ScanQueryService` | Read operations: list scans, get by ID, guest queries | `ScansController` |
| `ScanQuotaService` | Quota enforcement — the `FOR UPDATE` transaction lock and increment live here exclusively | `ScanCommandService` |
| `MarketPriceService` | Enrich detected parts with scraped prices | `ScanQueryService`, `ScanCommandService` |

`ScansController` injects `ScanCommandService` and `ScanQueryService`. No service imports another service in the same module except through the command/query boundary.

**Why `ScanQuotaService` is the most important isolation:**  
The quota logic contains a pessimistic lock (`FOR UPDATE`). If estimation logic, image upload logic, or any other concern were to accidentally call this code path, we'd double-count usage. Isolating it behind its own service makes the boundary explicit and makes future testing trivial — mock `ScanQuotaService` to test detection without affecting quota.

**Open/Closed example:**  
When we add a new scan operation (e.g., bulk scan, scan clone), we add a new method to `ScanCommandService` or create a `ScanBulkService` — we do not modify `ScanQuotaService` or `ScanQueryService`. Existing behaviour is closed for modification, the system is open for extension.

#### Acceptance criteria

- `ScansService` file is deleted — does not exist
- Each new service has exactly one clear stated responsibility in its JSDoc
- `ScansController` correctly routes to the right service per operation
- All scan flows (guest, auth, detection, estimation, list, detail) pass manual QA

---

### S21-004 — Domain Events

**Estimate:** 2 SP  
**SOLID:** O (Open/Closed) — new subscribers never require changes to emitters  
**Package:** `@nestjs/event-emitter` (install via `npm install @nestjs/event-emitter --workspace=apps/api`)

#### Event definitions

```
common/events/
  user-registered.event.ts
  scan-created.event.ts
  scan-completed.event.ts
  scan-failed.event.ts
  inquiry-created.event.ts
```

Each event is a plain class with readonly properties — no methods, no dependencies:

```typescript
export class ScanCompletedEvent {
  constructor(
    public readonly scanId: string,
    public readonly userId: string | null,   // null for guest scans
    public readonly isGuest: boolean,
    public readonly detectedPartsCount: number,
  ) {}
}
```

#### Emit points

| Event | Emitted from | When |
|-------|-------------|------|
| `user.registered` | `AuthService.register()` | After user row created |
| `scan.created` | `ScanCommandService.create()` | After scan row created |
| `scan.completed` | Detection queue processor | After parts saved, status → COMPLETED |
| `scan.failed` | Detection queue processor | After status → FAILED |
| `inquiry.created` | `WorkshopService.createInquiry()` | After inquiry row created |

#### Handlers — NotificationsModule (placeholder)

```
modules/notifications/
  notifications.module.ts
  notifications.listener.ts
```

```typescript
@OnEvent('scan.completed')
handleScanCompleted(event: ScanCompletedEvent) {
  this.logger.log(`[Notification] Scan ${event.scanId} completed — ${event.detectedPartsCount} parts detected`);
  // future: send push notification / email via Resend
}
```

Handlers are placeholders with a logger. The wiring is real — when the email/notification sprint runs, only the handler body changes. Zero changes to `ScanCommandService` or any other emitter.

**Why this matters for scale:**  
When analytics, webhooks, and notifications are added, they subscribe to events. The scan module never grows new dependencies. Modules become independently deployable units — the definition of microservice-readiness without prematurely extracting services.

#### Acceptance criteria

- `EventEmitterModule.forRoot()` registered in `AppModule`
- All 5 events emitted from correct call sites
- `NotificationsListener` logs each event — visible in local dev console
- Adding a new `@OnEvent('scan.completed')` handler in any module requires zero changes to `ScanCommandService`

---

### S21-005 — Retry + Circuit Breaker on AiClientService

**Estimate:** 1.5 SP  
**SOLID:** S (Single Responsibility — retry utility is its own concern)  
**File:** `apps/api/src/modules/ai-client/ai-client.service.ts`, `apps/api/src/common/utils/retry.util.ts`

#### Retry utility

```
common/utils/retry.util.ts
```

```typescript
// Exponential backoff with jitter — retryable errors only
retryWithBackoff<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>

interface RetryOptions {
  maxAttempts: number;      // default: 3
  baseDelayMs: number;      // default: 1000
  maxDelayMs: number;       // default: 10000
  retryableStatuses: number[]; // default: [502, 503, 504]
}
```

Delay formula: `min(baseDelay * 2^attempt + jitter, maxDelay)` where `jitter = random(0, 200)ms`.

Not retried: 400, 401, 422, 429 — retrying these cannot produce a different result.

#### Circuit breaker — simple state machine

```
States: CLOSED → OPEN → HALF_OPEN → CLOSED

CLOSED:    all requests pass through
OPEN:      fast-fail immediately (throw CircuitOpenException), no calls to AI service
HALF_OPEN: allow one probe request
           → success: back to CLOSED
           → failure: back to OPEN (reset timer)

Threshold: 3 consecutive failures → OPEN
Open timeout: 30 seconds → HALF_OPEN
```

Emits `ai-service.circuit-opened` domain event when circuit opens — visible in Sentry and logs.

#### Why this teaches the payment retry pattern

The `retryWithBackoff` utility, combined with idempotency keys (already in place on scan creation), is exactly the pattern used for payment retries. When JazzCash/Stripe integration is added:
```typescript
await retryWithBackoff(
  () => this.paymentProvider.charge({ idempotencyKey: chargeId, amount }),
  { retryableStatuses: [502, 503], maxAttempts: 3 }
);
```
Same utility, same pattern, payment-safe because the idempotency key prevents double-charges on retry.

#### Acceptance criteria

- AI service call with simulated 502 retries 3 times with increasing delay, then throws
- AI service returning 422 (bad request) does NOT retry — fails immediately
- After 3 consecutive failures, subsequent calls fail immediately with `CircuitOpenException` (no network call made)
- After 30 seconds, circuit allows one probe request

---

### S21-006 — Controller DTO Discipline + Interface Typing

**Estimate:** 2 SP  
**SOLID:** S (controllers have one job: receive HTTP input, delegate to service), I (Interface Segregation on service boundaries)

#### Rule 1 — No raw multi-`@Query()` in controllers

Every query string that has more than one field becomes a DTO:

```typescript
// Before — fragmented, no validation, manual Number() casting
listUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
  return this.adminService.listUsers(Number(page), Number(limit));
}

// After — single DTO, validation + transformation declared once
listUsers(@Query() query: AdminListQueryDto) {
  return this.adminService.listUsers(query);
}
```

#### Rule 2 — DTOs live in dedicated files, never inline

```typescript
// Before — DTO defined at top of controller file
class ChangeRoleDto {
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
}

// After — moved to dto/change-role.dto.ts, imported
import { ChangeRoleDto } from './dto/change-role.dto';
```

#### Rule 3 — Services accept interfaces, not unwrapped primitives

When a service method takes more than two related arguments, they become a typed interface:

```typescript
// Before — four positional primitives, wrong-order bugs possible
findAll(city?: string, service?: string, page = 1, limit = 20)

// After — interface owns the contract
interface WorkshopListQuery {
  city?: string;
  service?: string;
  page: number;
  limit: number;
}
findAll(query: WorkshopListQuery): Promise<PaginatedResult<Workshop>>
```

Interfaces for service boundaries live in `interfaces/` folders per module, not in DTO files (DTOs are for HTTP boundary validation; interfaces are for internal contracts).

#### Rule 4 — Response types are not `any`

`getScanOrThrow`, `enrichWithMarketPrices`, and similar private methods currently return `any`. Each gets a proper return type interface.

#### Controllers to fix

| Controller | Issues |
|-----------|--------|
| `AdminController` | 3 inline DTO classes, 3 sets of raw `@Query()` decorators, manual `Number()` casts |
| `ScansController` | `@Body('guestSessionId')` raw string extractions should be DTOs |
| `WorkshopsController` | Service called with 4 positional primitives unwrapped from query DTO |

#### Acceptance criteria

- Zero inline DTO class definitions in any controller file
- Zero raw `@Query('param')` decorators where a DTO covers multiple query fields
- Zero service methods with more than 2 positional primitive arguments where an interface applies
- Zero `any` return types on service public methods
- `tsc --noEmit` passes

---

## Implementation Order

Dependencies flow downward — each story must complete before the next starts.

```
Day 1 AM   S21-001  API versioning        (30 min — no risk, do first)
Day 1 PM   S21-005  Retry + circuit       (self-contained, no dependencies)
Day 2–4    S21-002  Repository pattern    (foundational — services must be clean before splitting)
Day 4–5    S21-006  DTO discipline        (easier after repositories reduce service complexity)
Day 5–6    S21-003  ScansService split    (easiest after repository pattern is in place)
Day 7      S21-004  Domain events         (emitted from the newly refactored services)
Day 8      QA       tsc, integration run, manual flow verification
```

---

## Scope Boundaries

**In scope:**
- NestJS API refactor only
- Frontend: one-line URL change for `/v1/` prefix

**Out of scope:**
- New features of any kind
- DB schema changes
- Docker / CI changes
- CQRS read models (candidate for Sprint 22)
- Distributed tracing (candidate for Sprint 22)
- Microservice extraction (candidate when traffic justifies it)
- Frontend refactor

---

## What the Codebase Looks Like After This Sprint

- Services never import `PrismaService` — any module can be extracted to a microservice by swapping its repository implementation
- Adding notifications, analytics, or webhooks requires zero changes to `ScanCommandService` — subscribe to the event
- AI service failures are handled with observable, logged retry behaviour — the same utility ready for payment retries
- Controllers are thin HTTP adapters — receive DTO, call service, return result
- Service method signatures are self-documenting typed interfaces — no positional primitive guessing
- The API is versioned — v2 can be introduced without breaking v1 clients

---

## Acceptance Criteria (Sprint Level)

- [ ] `GET /api/v1/scans` returns correct response (versioning works)
- [ ] `tsc --noEmit` on `apps/api` passes with zero errors
- [ ] Zero `this.prisma.*` calls in any `*.service.ts` file
- [ ] Zero inline DTO definitions in any `*.controller.ts` file
- [ ] Zero raw multi-`@Query('param')` patterns in controllers
- [ ] `ScansService` file deleted — `ScanCommandService`, `ScanQueryService`, `ScanQuotaService`, `MarketPriceService` exist
- [ ] Domain events fire and appear in dev console logs for: register, scan create, scan complete, scan fail, inquiry create
- [ ] AI service retry fires on 502/503, does not retry on 422
- [ ] Circuit breaker fast-fails after 3 consecutive AI service failures
- [ ] All existing flows (guest scan, auth scan, detection, estimation, workshop inquiry) work end-to-end
