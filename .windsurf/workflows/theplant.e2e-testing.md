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
```

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
  timeout: 10000,
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
   - Use `.first()` only if multiple matches are expected

2. **"element not found"**
   - Check HTML dump for actual element attributes
   - Update selector to match actual attributes

3. **"timeout"**
   - Check if page shows loading state → add explicit wait
   - Check if page shows error boundary → fix application crash first

4. **Console error captured**
   - Fix application error first, then re-run test
   - Do NOT modify test to ignore the error

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
