---
description: Apply E2E testing discipline following ThePlant's testing principles - Playwright-only testing with console error capture, HTML dump on failure, and strict selector hierarchy.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Ensure all E2E tests follow ThePlant's testing discipline principles. This workflow guides writing, reviewing, and fixing Playwright E2E tests.

## Prerequisites

Before running E2E tests, ensure the following workflows have been executed:

1. **`/theplant.openapi-first`** - OpenAPI spec defined and Orval types generated
2. **`/theplant.msw-mock-backend`** - MSW handlers implemented for all API endpoints
3. **`/theplant.test-data-seeding`** - Test data seeding utilities created

**AI agents MUST verify these prerequisites exist before writing E2E tests.** If any are missing, inform the user that the prerequisite workflow should be run first.

## Rationale (E2E-TESTING)

E2E tests catch real-world issues that unit tests cannot. Testing through the full stack (browser → API → storage) validates actual user behavior. This aligns with the E2E-TESTING principle adapted for frontend prototype development.

## Core Principles (NON-NEGOTIABLE)

### Testing Approach (E2E-TESTING)

- Every feature MUST have corresponding E2E tests before it is considered complete
- Tests MUST simulate real user behavior through the browser
- Tests MUST cover the full user journey, not isolated components
- Tests MUST use real HTTP calls (via MSW) - NOT mocked fetch responses
- No unit tests, no integration tests in isolation - E2E only for prototype phase

### Coverage Requirements

- All routes (public, error) MUST have E2E test coverage
- All user interactions (buttons, forms, modals, navigation, CRUD) MUST be tested
- All loading states and error states MUST be verified
- Route parameters and query strings MUST be tested for edge cases
- **BOTH read paths (data display) AND write paths (forms, mutations) MUST be tested**
- Create, Update, Delete operations MUST have corresponding tests
- Form validation (client-side errors) MUST be tested

### Test Independence (E2E-TESTING)

- Tests MUST NOT depend on execution order of other tests
- Tests MUST clean up any data they create (or use isolated test data via localStorage seeding)
- Tests MUST be able to run in parallel without conflicts
- Test data MUST be seeded via localStorage (see theplant.test-data-seeding workflow)

### Test Naming Convention (ACCEPTANCE-COVERAGE)

Test names MUST reference acceptance scenarios or bug IDs:

```typescript
// ✅ GOOD: References acceptance scenario
test('US1-AS1: New user can view empty product list', async ({ page }) => { ... });

// ✅ GOOD: References bug ID
test('BUG-123: Product count shows correct value after delete', async ({ page }) => { ... });

// ❌ BAD: Generic name
test('should work', async ({ page }) => { ... });
```

## Execution Steps

### 1. Verify Test Infrastructure

Check that the project has proper test setup:

```bash
# Verify Playwright is configured
ls playwright.config.ts

# Verify test helpers exist
ls tests/e2e/utils/test-helpers.ts

# Verify MSW handlers exist
ls src/mocks/handlers.ts
ls src/mocks/browser.ts
```

### 1.1 Running E2E Tests

E2E tests require MSW mock backend to be running. See `/theplant.msw-mock-backend` for setup details.

```bash
# Step 1: Start dev server (MSW enabled by default when API URL env var is not set)
pnpm dev

# Step 2: Run E2E tests (in another terminal)
pnpm test:e2e
```

#### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `net::ERR_FAILED` on API calls | MSW not enabled | Ensure API URL env var is NOT set (see `/theplant.msw-mock-backend`) |
| Empty data in tests | localStorage not seeded | Use test data seeding (see `/theplant.test-data-seeding`) |
| Playwright `webServer` timeout | Dev server already running | Use `reuseExistingServer: true` or disable `webServer` |

### 2. Console Error Capture (NON-NEGOTIABLE)

All tests MUST use console error capture. Verify `tests/e2e/utils/test-helpers.ts` contains:

```typescript
import { test as base, Page } from '@playwright/test';

export function setupConsoleErrorCapture(page: Page, failTest: (error: Error) => void): void {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      process.stderr.write(`[Console Error] ${text}\n`);
      failTest(new Error(`Console error: ${text}`));
    }
  });

  page.on('pageerror', (error) => {
    process.stderr.write(`[Page Error] ${error.message}\n`);
    failTest(new Error(`Page error: ${error.message}`));
  });
}

export const test = base.extend<{}>({});

test.beforeEach(async ({ page }, testInfo) => {
  setupConsoleErrorCapture(page, (error) => {
    testInfo.annotations.push({ type: 'console-error', description: error.message });
    throw error;
  });
});

export { expect } from '@playwright/test';
```

### 3. HTML Dump on Failure (NON-NEGOTIABLE)

Verify tests dump HTML on failure for debugging:

```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    const html = await page.content();
    console.log('=== PAGE HTML ON FAILURE ===');
    console.log(html);
    console.log('=== END PAGE HTML ===');
  }
});
```

### 4. Selector Strategy Hierarchy (NON-NEGOTIABLE)

When writing tests, use selectors in this priority order:

1. **`data-testid`** - Most stable, explicitly added for testing
2. **`role`** - Semantic, accessible, follows ARIA patterns
3. **`text`** - Human-readable but fragile
4. **CSS** - Last resort, most fragile

```typescript
// ✅ Priority 1: data-testid (best)
page.getByTestId('submit-button')

// ✅ Priority 2: role (good)
page.getByRole('button', { name: /submit/i })

// ⚠️ Priority 3: text (acceptable)
page.getByText('Submit')

// ❌ Priority 4: CSS (avoid)
page.locator('.submit-btn')
```

### 4.1 Selector Precision Rules (NON-NEGOTIABLE)

**CRITICAL**: Avoid selectors that match multiple elements. Common pitfalls:

| Problem | Example | Solution |
|---------|---------|----------|
| Username matches email | `getByText('johndoe')` matches both `johndoe` and `johndoe@example.com` | Use `getByText('johndoe', { exact: true })` |
| Filter options with counts | `getByRole('option', { name: /active/i })` matches "Active 1" and "Inactive 1" | Use `getByRole('option', { name: /active/i }).first()` or more specific regex |
| "Connected" vs "Not Connected" | `getByRole('option', { name: /connected/i })` matches both | Use `getByRole('option', { name: /^connected$/i })` with anchors |
| Multiple headings | `getByRole('heading', { name: /tasks/i })` matches sidebar and page heading | Use more specific container or `first()` |

```typescript
// ❌ BAD: Matches multiple elements
await page.getByText('activeuser').toBeVisible()  // Matches username AND email

// ✅ GOOD: Exact match prevents partial matches
await page.getByText('activeuser', { exact: true }).toBeVisible()

// ❌ BAD: Regex matches "Active 1" and "Inactive 1"
await page.getByRole('option', { name: /active/i }).click()

// ✅ GOOD: Use first() when options show counts
await page.getByRole('option', { name: /active/i }).first().click()

// ❌ BAD: Matches "Connected" and "Not Connected"
await page.getByRole('option', { name: /connected/i }).click()

// ✅ GOOD: Anchor regex to match exact word
await page.getByRole('option', { name: /^connected$/i }).click()
```

### 5. Test Assertion Anti-Patterns (NON-NEGOTIABLE)

NEVER use these patterns:

| Anti-Pattern | Why Bad | Correct Pattern |
|--------------|---------|-----------------|
| `expect(body).toBeVisible()` | Tests nothing meaningful | Test specific feature elements |
| `expect(header).toBeVisible()` alone | Proxy assertion | Test actual feature content |
| Guessing selectors | Causes strict mode violations | Read code or HTML dump first |
| Using `.first()` without understanding | Masks selector issues | Make selector more specific |

### 6. Test Description Alignment (NON-NEGOTIABLE)

Test expectations MUST directly verify what the test description claims:

```typescript
// ❌ BAD: Tests nothing about products
test('should display products', async ({ page }) => {
  await page.goto('/products');
  await expect(page.locator('body')).toBeVisible();
});

// ✅ GOOD: Tests actual feature behavior
test('should display products', async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: /products/i })).toBeVisible();
  await expect(page.getByTestId('product-list')).toBeVisible();
});
```

### 7. Playwright Configuration

Verify `playwright.config.ts` has correct settings:

```typescript
export default defineConfig({
  timeout: 5000,
  expect: { timeout: 1000 },
  use: {
    actionTimeout: 1000,  // Fast fail for missing elements
    baseURL: 'http://localhost:5173',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // webServer: undefined - tests connect to existing dev server
});
```

### 8. Run Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific feature tests
pnpm test:e2e --grep "Products"
```

## Error Diagnosis Flowchart

When tests fail, follow this diagnosis process:

1. **"strict mode violation"** (multiple elements match)
   - Make selector more specific using `data-testid`
   - Use `{ exact: true }` for text selectors to prevent partial matches
   - Use regex anchors (`/^text$/i`) for option/filter selectors
   - Use `.first()` only if multiple matches are expected AND understood

2. **"element not found"**
   - Check HTML dump for actual element attributes
   - Update selector to match actual attributes
   - Check if default seed data is showing instead of test data (seeding issue)

3. **"timeout"**
   - Check if page shows loading state → add explicit wait
   - Check if page shows error boundary → fix application crash first
   - Check if page shows 500 error → look for missing module exports or runtime errors

4. **Console error captured**
   - Fix application error first, then re-run test
   - Do NOT modify test to ignore the error
   - Common cause: importing non-existent exports from generated files (e.g., `taskSchema` when Orval doesn't generate Zod schemas)

5. **500 Error Page showing**
   - Check console error for specific module/export errors
   - Verify all imports from `@/api/generated/models` actually exist
   - Orval generates TypeScript types, NOT Zod schemas - use `type` imports only
   - Run `pnpm tsc --noEmit` to catch import errors before running tests

## Quality Gates

- All E2E tests MUST pass before merge
- New routes/interactions MUST have corresponding E2E tests
- No flaky tests allowed - tests MUST be deterministic
- NEVER use `test.skip()` to avoid fixing tests
- Tests MUST be executed after every code change (TASK-VERIFICATION)

## AI Agent Requirements

- AI agents MUST run E2E tests after any code changes
- AI agents MUST treat test failures as blocking issues requiring immediate resolution
- AI agents MUST apply Root Cause Tracing (ROOT-CAUSE-TRACING) when tests fail
- AI agents MUST NOT remove or weaken tests to make them pass
- AI agents MUST write failing reproduction tests BEFORE fixing bugs
- AI agents MUST use typed test data helpers (see theplant.test-data-seeding workflow)

## Context

$ARGUMENTS
