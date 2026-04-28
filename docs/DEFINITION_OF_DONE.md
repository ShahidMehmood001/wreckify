# Definition of Done — Wreckify

This checklist applies to **every story** before it can be marked complete. A story is not done until all applicable items are checked. Items marked *(if applicable)* may be skipped with a documented reason in the story card.

---

## Code Quality

- [ ] Code compiles with zero TypeScript errors (`tsc --noEmit`)
- [ ] No ESLint errors or warnings introduced
- [ ] No `console.log` / debug statements left in committed code
- [ ] No commented-out code blocks left in — remove or turn into a TODO ticket

## Testing

- [ ] Unit tests written for any new business logic (service methods, guards, utilities)
- [ ] Existing test suite passes (`npm test` / `pytest`) — no regressions
- [ ] New feature manually tested in the **Docker Compose** environment (not just local dev server)
- [ ] Edge cases tested: empty state, error state, loading state (frontend)

## API / Backend

- [ ] Endpoint documented in Swagger (`@ApiTags`, `@ApiOperation`, `@ApiResponse`)
- [ ] New endpoints protected with appropriate guard (`JwtAuthGuard`, `RolesGuard`, `@Public`)
- [ ] Input validated with a DTO and `class-validator` decorators
- [ ] Response follows the `{ success: true, data: {...} }` envelope via `ResponseInterceptor`
- [ ] Prisma migration created and tested (`prisma migrate dev`) *(if schema changed)*
- [ ] Seed script updated to reflect new required reference data *(if applicable)*

## Frontend

- [ ] No unhandled promise rejections or React hydration errors in browser console
- [ ] Loading and error states rendered for every async operation (spinner, toast, or inline message)
- [ ] API calls go through the shared `api` axios client in `apps/web/src/lib/api.ts`
- [ ] New pages added to the sidebar navigation *(if applicable)*
- [ ] Responsive layout verified at 375 px (mobile) and 1280 px (desktop) *(if applicable)*

## Git & Process

- [ ] Commit message follows Conventional Commits format: `type(scope): short description`
  - Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`
- [ ] Each logical change is its own commit — no "WIP" or "misc fixes" messages
- [ ] No secrets or `.env` values committed
- [ ] Sprint document updated: story status changed to `DONE`, commit hash recorded
- [ ] Acceptance criteria listed in the story card are each verified and ticked

## Definition of Ready (before a story enters a sprint)

A story is **ready** to be pulled into a sprint when:
- Acceptance criteria are written and unambiguous
- Dependencies on other stories or external services are identified
- Story is estimated (story points assigned)
- Designs or wireframes attached *(if UI work)*

---

*Last updated: Sprint 10 planning. Owner: Shahid Awan.*
