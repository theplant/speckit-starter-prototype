<!--
SYNC IMPACT REPORT - 2025-12-15
================================
Version change: 2.2.0 → 2.3.0 (MINOR)

Modified Principles:
- Principle IX (OpenAPI-First API Architecture): Added code generation requirements
  - Added openapi-typescript for type generation
  - Added openapi-fetch for typed API client
  - Added NON-NEGOTIABLE rule: AI must not edit generated files
  - Updated code organization with generated types location

Added Sections:
- None

Removed Sections:
- None

Templates Updated:
- ✅ plan-template.md - Updated to include code generation step
- ✅ tasks-template.md - Updated with code generation tasks
- ✅ spec-template.md - No changes needed

Follow-up TODOs: None
================================
-->

# Clickable Prototype Constitution

## Core Principles

### I. E2E Testing Discipline (NON-NEGOTIABLE)

All testing MUST be done exclusively with Playwright end-to-end tests.

**Testing Approach**
- Every feature MUST have corresponding E2E tests before it is considered complete
- Tests MUST simulate real user behavior through the browser
- Tests MUST cover the full user journey, not isolated components
- No unit tests, no integration tests in isolation

**Coverage Requirements**
- All routes (public, error) MUST have E2E test coverage
- All user interactions (buttons, forms, modals, navigation, CRUD) MUST be tested
- All loading states and error states MUST be verified
- Route parameters and query strings MUST be tested for edge cases

**Local Storage Data**
- All data persistence MUST use browser localStorage
- Tests MUST be able to seed localStorage with test data
- Tests MUST clear localStorage before each test run for isolation

**Test Independence**
- Tests MUST NOT depend on execution order of other tests
- Tests MUST clean up any data they create (or use isolated test data)
- Tests MUST be able to run in parallel without conflicts

**AI-Driven Execution**
- Tests MUST run non-interactively without waiting for human review
- The test-fix cycle MUST be autonomous: run tests → read errors → fix code → re-run
- Playwright MUST use only the `'list'` reporter for clean, parseable AI output

**Console Error Capture (NON-NEGOTIABLE)**
- All browser console errors MUST be captured and output during test execution
- React/JavaScript errors (e.g., context errors, runtime exceptions) MUST be visible in test output
- Tests MUST listen to `page.on('console')` and `page.on('pageerror')` events
- Console errors MUST be printed immediately when they occur, not just on test failure
- This ensures application bugs (like missing context providers) are immediately visible
- **All console errors MUST cause the test to fail** - a successful test MUST have zero console errors
- Tests MUST collect console errors and assert that the error list is empty at test completion
- When tests fail due to console errors, AI agents MUST apply Root Cause Tracing to fix the underlying issue

**LocalStorage Transparency (NON-NEGOTIABLE)**
- Create a simple wrapper (`src/lib/storage.ts`) for localStorage read/write operations
- Wrapper MUST log key and value on every read/write when running in test mode
- This enables AI agents to see data flow when debugging test failures

**Configuration**
- Playwright MUST only include the `chromium` project (no Firefox/WebKit)
- Playwright MUST NOT start its own dev server - tests MUST connect to an existing, separately running dev server
- The dev server MUST be started manually before running tests (e.g., `pnpm dev` in a separate terminal)
- Playwright config MUST use `webServer: undefined` or omit the webServer config entirely
- Tests MUST use `baseURL` pointing to the existing dev server (e.g., `http://localhost:5173`)
- Test files MUST be in `tests/e2e/` with naming `{route-or-feature}.spec.ts`
- Page objects MUST be used for reusable page interactions
- Test utilities MUST be in `tests/e2e/utils/`

**Quality Gates**
- All E2E tests MUST pass before merge
- New routes/interactions MUST have corresponding E2E tests
- No flaky tests allowed - tests MUST be deterministic

**Test Description Alignment (NON-NEGOTIABLE)**
- Test expectations MUST directly verify what the test description claims to test
- If a test is named "should display activities", it MUST assert that activities are visible, not just a header
- Test descriptions are contracts - the assertions MUST fulfill that contract
- Avoid proxy assertions: testing a header exists does NOT prove the feature works
- Each test MUST have at least one assertion that directly validates the described behavior
- Example violation: `test('should display activities')` with only `expect(header).toBeVisible()` - this tests the header, not activities
- Example correct: `test('should display activities')` with `expect(activityItems.count()).toBeGreaterThan(0)`

### II. Spec Evolution and Test Maintenance

When new specifications are written that conflict with previous specs, the following rules apply:

**Spec Conflict Resolution**
- New specs take precedence over old specs for the same feature area
- Old tests MUST be updated to match new specs, NOT the other way around
- Tests MUST NOT be skipped to avoid fixing them - use Root Cause Tracing instead
- Duplicate tests covering the same behavior MUST be removed
- Tests from old specs that no longer apply MUST be deleted or rewritten

**Test Fix Discipline**
- NEVER use `test.skip()` to avoid fixing a complicated test
- ALWAYS trace the root cause of test failures before implementing fixes
- When UI changes break tests, update test selectors and assertions to match new UI
- When behavior changes, rewrite test assertions to validate new expected behavior
- Remove tests that test removed functionality

**Rationale**: Skipping tests creates hidden technical debt and masks real issues. Every skipped test is a gap in coverage that can allow bugs to ship. Root cause tracing ensures we understand why tests fail and fix them properly rather than hiding problems.

### III. Root Cause Tracing (Debugging Discipline)

When problems occur during development, root cause analysis MUST be performed before implementing fixes:
- Problems MUST be traced backward through the call chain to find the original trigger
- Symptoms MUST be distinguished from root causes
- Fixes MUST address the source of the problem, NOT work around symptoms
- Test cases MUST NOT be removed or weakened to make tests pass
- Debuggers and logging MUST be used to understand control flow
- Multiple potential causes MUST be systematically eliminated
- Documentation MUST be updated to prevent similar issues
- Root cause MUST be verified through testing before closing the issue

**Rationale**: Superficial fixes create technical debt and hide underlying architectural problems. Root cause analysis ensures problems are solved at their source, preventing recurrence and maintaining system integrity. This discipline transforms debugging from firefighting into systematic problem-solving that improves overall code quality.

**Debugging Process**:
1. **Reproduce**: Create reliable reproduction case
2. **Observe**: Gather evidence through logs, debugger, tests
3. **Hypothesize**: Form theories about root cause
4. **Test**: Design experiments to validate/invalidate hypotheses
5. **Fix**: Implement fix addressing root cause
6. **Verify**: Ensure fix works and doesn't break existing functionality
7. **Document**: Update docs/tests to prevent regression

**AI Implementation Requirement**:
- AI agents MUST perform root cause analysis before implementing fixes
- AI agents MUST NOT implement superficial workarounds
- AI agents MUST document the root cause analysis process
- AI agents MUST update tests to prevent regression of root causes

### IV. Local Storage Data Layer (Browser Worker Backend)

All data persistence MUST use browser localStorage, served via a browser worker that responds to OpenAPI-formatted HTTP requests. This architecture enables seamless future migration to a real backend API.

**Data Storage Rules**
- All data MUST be stored in localStorage with JSON serialization
- Each data entity type MUST have its own localStorage key (e.g., `prototype_users`, `prototype_projects`)
- Data operations MUST be synchronous and immediate within the worker
- CRUD operations MUST update localStorage directly

**Browser Worker Architecture**
- A Service Worker or Web Worker MUST intercept HTTP fetch requests
- Worker MUST respond to requests matching the OpenAPI spec format
- Worker MUST read/write localStorage to fulfill requests
- Worker MUST return proper HTTP status codes and JSON responses
- This enables the frontend to use real `fetch()` calls that work identically with a real backend

**Type Safety Requirements**
- Define TypeScript interfaces for all data entities in `src/types/`
- NEVER use `any` type for data operations
- All localStorage read/write operations MUST be type-safe
- Use Zod or similar for runtime validation when reading from localStorage

**Data Utilities**
- Create reusable hooks for localStorage operations (e.g., `useLocalStorage`)
- Implement helper functions for CRUD operations in `src/lib/storage.ts`
- Seed data MUST be available for demo/testing purposes

### V. Component-Driven UI

Build UI as a composition of reusable, isolated components.

- MUST use shadcn/ui as the component library foundation
- Components MUST be stateless where possible; lift state up
- Styling MUST use utility-first CSS (e.g., Tailwind CSS)
- Each component MUST have a single responsibility
- Prefer composition over prop drilling; use context sparingly

### VI. State Management

Use React state and context for data management with localStorage persistence.

- Use React Context for shared state across components
- Use custom hooks for localStorage read/write operations
- State updates MUST immediately persist to localStorage
- On app load, state MUST be hydrated from localStorage
- Minimal global state; prefer component-local state where possible
- Use React state for UI-only concerns (modals, forms, etc.)

### VII. Simplicity

Start simple. Add complexity only when proven necessary.

- YAGNI: Do not build features "just in case"
- Prefer fewer dependencies over many
- Avoid premature abstraction; wait for patterns to emerge
- Configuration over code where possible
- Delete code that is not used

### VIII. Acceptance Scenario Coverage (Spec-to-Test Mapping)

Every user scenario in specifications MUST have corresponding automated tests.

**Test Case Requirements**
- Each acceptance scenario (US#-AS#) in spec.md MUST have a test case
- Test case names MUST reference source scenarios (e.g., "US1-AS1: New customer enrolls")
- Test functions MUST use table-driven design with test case structs where applicable
- Each test case struct MUST include `name` field with scenario ID
- Tests MUST validate complete "Then" clause, not partial behavior

**Coverage Enforcement**
- No untested scenarios MUST exist (or be explicitly deferred with justification)
- Test coverage analysis MUST verify all scenarios are tested
- AI agents MUST flag any scenarios that cannot be tested with justification
- AI agents MUST update tests when specifications change to add/modify scenarios

**Rationale**: Specifications define expected behavior, but only automated tests guarantee that behavior is maintained. Acceptance scenario coverage bridges the gap between business requirements and implementation, ensuring the system actually does what the specifications claim. Without this mapping, specifications become documentation that drifts from reality, leading to false assumptions and undetected regressions.

**Code Review Checklist**:
- [ ] Every acceptance scenario in spec.md has a corresponding test case
- [ ] Test case names reference source scenarios (e.g., "US1-AS1: New customer enrolls")
- [ ] Test function uses table-driven design with test case structs (where applicable)
- [ ] Test case struct includes `name` field with scenario ID (US#-AS#)
- [ ] No untested scenarios exist (or are explicitly deferred with justification)
- [ ] Test validates complete "Then" clause, not partial behavior
- [ ] Traceability matrix is up to date (optional but recommended)

### IX. OpenAPI-First API Architecture (Backend-Ready Design)

All data access MUST go through an API layer defined by OpenAPI specification. This ensures the prototype can be easily migrated to a real backend.

**OpenAPI Specification Requirements**
- An OpenAPI 3.0+ spec MUST be defined in `src/api/openapi.yaml` (or `.json`)
- All API endpoints MUST be documented in the OpenAPI spec before implementation
- Request/response schemas MUST be defined in the OpenAPI spec
- The spec MUST be complete enough to hand to backend developers for implementation

**Code Generation (NON-NEGOTIABLE)**
- TypeScript types MUST be generated from OpenAPI spec using `openapi-typescript`
- Install: `pnpm add -D openapi-typescript`
- Generate: `npx openapi-typescript src/api/openapi.yaml -o src/api/generated/schema.d.ts`
- Add npm script: `"api:generate": "openapi-typescript src/api/openapi.yaml -o src/api/generated/schema.d.ts"`
- Generated files MUST be in `src/api/generated/` directory
- **AI agents MUST NOT directly edit files in `src/api/generated/`** - regenerate from OpenAPI spec instead
- Run `pnpm api:generate` after any OpenAPI spec changes

**Typed API Client (openapi-fetch)**
- Use `openapi-fetch` for type-safe API calls: `pnpm add openapi-fetch`
- Create client in `src/api/client.ts` using generated types:
  ```typescript
  import createClient from 'openapi-fetch';
  import type { paths } from './generated/schema';
  
  export const api = createClient<paths>({ baseUrl: '/api' });
  ```
- All API calls MUST use the typed client (e.g., `api.GET('/users/{id}', { params: { path: { id } } })`)
- React hooks MUST wrap typed client calls, NOT raw fetch

**HTTP Fetch Pattern (NON-NEGOTIABLE)**
- Frontend code MUST use `openapi-fetch` client for all data operations
- Fetch calls MUST use proper HTTP methods (GET, POST, PUT, DELETE)
- Fetch calls MUST use proper URL paths matching OpenAPI spec (e.g., `/api/users`, `/api/projects/{id}`)
- NO direct localStorage access from React components - all data MUST flow through API client

**Browser Worker Implementation**
- A Service Worker MUST intercept fetch requests to `/api/*` endpoints
- Worker MUST parse requests according to OpenAPI spec format
- Worker MUST read/write localStorage to fulfill the request
- Worker MUST return proper HTTP responses (status codes, headers, JSON body)
- Worker implementation lives in `src/api/worker.ts` (or `src/api/mock-server.ts`)

**Backend Migration Path**
- To migrate to real backend: disable Service Worker, update `baseUrl` in client
- OpenAPI spec serves as contract for backend implementation
- No frontend code changes required beyond configuration
- Backend team receives complete OpenAPI spec with all endpoints documented

**Rationale**: By using real HTTP fetch patterns with a browser worker mock, the prototype behaves identically to a production app with a real backend. Code generation ensures types stay in sync with the API contract. The `openapi-fetch` library provides compile-time type safety for all API calls. This eliminates the common problem of prototypes that "work" but require complete rewrites when connecting to real APIs.

**Code Organization**:
```
src/api/
├── openapi.yaml          # OpenAPI 3.0+ specification (source of truth)
├── generated/            # Generated files - DO NOT EDIT
│   └── schema.d.ts       # Generated types from openapi-typescript
├── client.ts             # Typed API client using openapi-fetch
└── worker.ts             # Service Worker that mocks backend
```

## Technology Stack

**Core Framework:**
- TypeScript (strict mode enabled)
- React with functional components and hooks
- Vite for build tooling
- pnpm as package manager

**Data Layer:**
- Browser localStorage for data persistence (via Service Worker)
- OpenAPI 3.0+ specification for API contract
- `openapi-typescript` for generating TypeScript types from OpenAPI spec
- `openapi-fetch` for type-safe API client
- Service Worker to intercept fetch and respond from localStorage
- React Context for shared state
- Custom hooks wrapping typed API client

**UI Layer:**
- Tailwind CSS for styling
- shadcn/ui components
- Lucide for icons

**Testing:**
- Playwright for E2E tests
- E2E tests: test all user journeys with localStorage

**Routing:**
- React Router
- Route structure mirrors resource hierarchy

**Command Execution (NON-NEGOTIABLE)**
- All CLI commands MUST run with default values - NEVER wait for user input
- Use `--yes`, `--default`, `-y`, or equivalent flags to auto-accept defaults
- Example: `pnpm create vite@latest my-app --template react-ts`
- Example: `pnpm dlx shadcn@latest init --defaults`
- If a command has no auto-accept flag, pipe `yes` or use expect scripts

## Development Workflow

### Implementation Order (MANDATORY)

For each user story, tasks MUST be executed in this exact order:

1. **Define OpenAPI Spec**: Add endpoints/schemas to `src/api/openapi.yaml`
2. **Generate Types**: Run `pnpm api:generate` to regenerate TypeScript types
3. **Write E2E Tests**: Create failing tests in `tests/e2e/`
4. **Verify Tests Fail**: Run `pnpm test:e2e` - all new tests MUST fail
5. **Implement Worker Handlers**: Add localStorage handlers in `src/api/worker.ts`
6. **Implement Hooks**: Create hooks wrapping typed API client
7. **Implement Components**: Build UI components consuming hooks
8. **Verify Tests Pass**: Run full test suite - all tests MUST pass
9. **Refactor**: Clean up code while keeping tests green

**⚠️ VIOLATION**: Implementing code before tests exist is a constitution violation.

### Code Organization

```
src/
├── api/           # API layer
│   ├── openapi.yaml      # OpenAPI spec (source of truth)
│   ├── generated/        # Generated files - DO NOT EDIT
│   │   └── schema.d.ts   # Generated types
│   ├── client.ts         # Typed API client
│   └── worker.ts         # Service Worker mock backend
├── hooks/         # Custom hooks wrapping API client
├── components/    # Reusable UI components
├── pages/         # Route-level components
├── lib/           # Utilities (storage.ts for worker, etc.)
└── data/          # Seed data for demo/testing
tests/
└── e2e/           # End-to-end user journey tests (Playwright)
```

### Quality Gates

- All tests MUST pass before merge
- Type checking MUST pass (`tsc --noEmit`)
- Generated types MUST be up-to-date (`pnpm api:generate` produces no changes)
- Linting MUST pass (ESLint)
- Format MUST be consistent (Prettier)
- No `any` types without explicit justification
- AI agents MUST NOT edit files in `src/api/generated/`





## Governance

This constitution supersedes all other development practices for this clickable prototype project.

**Amendment Process:**
1. Propose change with rationale
2. Review impact on existing code
3. Update constitution with version bump
4. Communicate changes to team

**Compliance:**
- All PRs MUST verify compliance with these principles
- Complexity MUST be justified in PR description
- Violations require explicit exception with documented reasoning

**Version Policy:**
- MAJOR: Principle removal or fundamental change
- MINOR: New principle or significant guidance addition
- PATCH: Clarifications and minor refinements

**Version**: 2.3.0 | **Ratified**: 2025-12-13 | **Last Amended**: 2025-12-15