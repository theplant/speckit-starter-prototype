---
description: Refactor all code to apply E2E testing discipline following ThePlant's testing principles - Playwright-only testing with console error capture, HTML dump on failure, and strict selector hierarchy.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Refactor all code and E2E tests follow ThePlant's testing discipline principles. This workflow guides writing, reviewing, and fixing Playwright E2E tests.

## Prerequisites

**AI agents MUST verify these prerequisites exist before writing E2E tests.** If any are missing, the workflow should automatically apply them.

### Prerequisite Verification Steps (NON-NEGOTIABLE)

AI agents MUST run these verification checks BEFORE proceeding with E2E test work:

```bash
# 1. Check OpenAPI spec exists
ls src/api/openapi.yaml 2>/dev/null || echo "MISSING: OpenAPI spec"

# 2. Check Orval config exists
ls orval.config.ts 2>/dev/null || echo "MISSING: Orval config"

# 3. Check MSW handlers exist
ls src/mocks/handlers.ts 2>/dev/null || echo "MISSING: MSW handlers"

# 4. Check MSW browser setup exists
ls src/mocks/browser.ts 2>/dev/null || echo "MISSING: MSW browser setup"

# 5. Check MSW service worker exists
ls public/mockServiceWorker.js 2>/dev/null || echo "MISSING: MSW service worker"

# 6. Check test data seeding utilities exist
ls tests/e2e/utils/seed-data/index.ts 2>/dev/null || echo "MISSING: Test data seeding"

# 7. Check MSW is enabled in main.tsx
grep -q "enableMocking" src/main.tsx && echo "OK: MSW enabled in main.tsx" || echo "MISSING: MSW enablement"
```

### Auto-Apply Missing Prerequisites

If ANY prerequisite is missing, AI agents MUST:

1. **Run `/theplant.system-exploration`** first to trace routes and API calls
2. **Run `/theplant.openapi-first`** to create OpenAPI spec and Orval config
3. **Run `/theplant.msw-mock-backend`** to create MSW handlers
4. **Run `/theplant.test-data-seeding`** to create seed utilities

After applying prerequisites, run the infrastructure verification test:

```bash
pnpm test:e2e --grep "Infrastructure"
```

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

### Page Objects Pattern (NON-NEGOTIABLE)

After completing System Exploration, **all read paths MUST have corresponding Page Objects** for test encapsulation and reusability:

```typescript
// tests/e2e/utils/page-objects/my-entity.page.ts
import type { Page, Locator } from '@playwright/test';

export class MyEntityListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly newButton: Locator;
  readonly entityCards: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /my entities/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.newButton = page.getByRole('button', { name: /new/i });
    this.entityCards = page.locator('[data-testid="entity-card"]');
  }
  
  async goto() {
    await this.page.goto('/my-entities');
    await this.page.waitForLoadState('networkidle');
  }
  
  async search(query: string) {
    await this.searchInput.fill(query);
  }
}
```

**Page Object Requirements:**
- One Page Object per major page/route
- Encapsulate all selectors as readonly Locator properties
- Provide navigation methods (e.g., `goto()`, `gotoNew()`)
- Provide action methods (e.g., `search()`, `filter()`, `save()`)
- Export from `tests/e2e/utils/index.ts` for easy importing

### Test Independence (E2E-TESTING)

- Tests MUST NOT depend on execution order of other tests
- Tests MUST clean up any data they create (or use isolated test data via localStorage seeding)
- Tests MUST be able to run in parallel without conflicts
- Test data MUST be seeded via localStorage (see theplant.test-data-seeding workflow)

### Never Weaken Tests (NON-NEGOTIABLE - ROOT-CAUSE-TRACING)

**⚠️ CRITICAL: Never remove or weaken test assertions to make tests pass!**

This violates the **ROOT-CAUSE-TRACING** principle from `theplant.root-cause-tracing.md`:

- If a test expects behavior that doesn't exist → **ADD THE BEHAVIOR TO THE CODE**
- If a test expects behavior that should NOT exist → **INVESTIGATE WHY THE TEST EXISTS**
- Tests MUST NOT be weakened to work around bugs or missing features
- Tests MUST NOT be weakened to avoid fixing underlying issues
- **Remove tests ONLY if the feature itself should be removed** (rare)

**Correct approach when tests fail:**
1. First, verify the test expectation is correct
2. If correct → Implement the missing behavior in the code
3. If incorrect → Remove the test entirely (not weaken it)
4. Never remove assertions to make tests pass

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

### 1. Playwright Configuration (CRITICAL)

**⚠️ CRITICAL Configuration Requirements:**

1. **Low Timeouts** - Prevent tests from hanging
2. **Environment-based baseURL** - Allow flexible server switching
3. **No webServer startup** - Prevent Playwright from hanging on server startup

Verify `playwright.config.ts` has these settings:

```typescript
export default defineConfig({
  // Low timeouts for fast failure and rapid iteration
  timeout: 5000,           // 5s max per test - fail fast!
  expect: { timeout: 1000 }, // 1s for assertions - no waiting!
  use: {
    actionTimeout: 1000,   // 1s for actions - immediate feedback!
    // E2E_TARGET_URL is more explicit than BASE_URL (avoids confusion with API base URL)
    baseURL: process.env.E2E_TARGET_URL || 'http://localhost:5173',
  },
  webServer: undefined, // NEVER let Playwright start the server - it will hang!
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

**Why these settings matter:**
- **Low timeouts** (5s test, 1s assertions/actions) ensure fast failure when selectors are wrong
- **E2E_TARGET_URL** (not BASE_URL) clearly indicates this is the E2E test target, not API base URL
- **No webServer** prevents Playwright from hanging when trying to start dev server
- Fast feedback enables rapid fix-test-fix cycles for AI development

**Running tests with custom target:**
```bash
# Default: http://localhost:5173
pnpm test:e2e

# Custom target URL
E2E_TARGET_URL=http://localhost:5174 pnpm test:e2e
```

### 2. Test Helpers Setup (NON-NEGOTIABLE - CRITICAL FOR AI DEBUGGING)

**⚠️ CRITICAL: All tests MUST use unified test helpers with auto-fixtures!**

Create `tests/e2e/utils/test-helpers.ts` with three essential auto-fixtures:

1. **consoleErrorCapture** - Fails tests on console errors
2. **htmlDumpOnFailure** - Dumps HTML for AI debugging (AI cannot see browser!)
3. **apiLogs** - Logs API requests for debugging

```typescript
import { test as base } from '@playwright/test';

export const test = base.extend({
  // Auto-fixture 1: Console Error Capture
  consoleErrorCapture: [async ({ page }, use, testInfo) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        process.stderr.write(`[Console Error] ${text}\n`);
        const error = new Error(`Console error: ${text}`);
        testInfo.annotations.push({ type: 'console-error', description: error.message });
        throw error;
      }
    });

    page.on('pageerror', (error) => {
      process.stderr.write(`[Page Error] ${error.message}\n`);
      const err = new Error(`Page error: ${error.message}`);
      testInfo.annotations.push({ type: 'console-error', description: err.message });
      throw err;
    });

    await use();
  }, { auto: true }],

  // Auto-fixture 2: HTML Dump on Failure (CRITICAL FOR AI)
  htmlDumpOnFailure: [async ({ page }, use, testInfo) => {
    await use();
    
    // AI cannot see the browser - HTML dump is essential!
    if (testInfo.status !== 'passed') {
      try {
        const html = await page.content();
        process.stdout.write('\n=== PAGE HTML ON FAILURE ===\n');
        process.stdout.write(html);
        process.stdout.write('\n=== END PAGE HTML ===\n');
        
        await testInfo.attach('page-html', {
          body: html,
          contentType: 'text/html',
        });
      } catch (e) {
        process.stdout.write(`\n[HTML DUMP ERROR] ${e}\n`);
      }
    }
  }, { auto: true }],

  // Auto-fixture 3: API Request Logging (ONLY on failure)
  apiLogs: [async ({ page }, use, testInfo) => {
    const logs: string[] = [];
    
    page.on('request', (request) => {
      const url = request.url();
      // Filter: Only log API requests, exclude dev server source file requests
      // Dev server requests for .ts/.tsx files contain '/src/' in the URL
      if (url.includes('/api/') && !url.includes('/src/')) {
        logs.push(`[API REQUEST] ${request.method()} ${url}`);
      }
    });
    
    page.on('response', async (response) => {
      const url = response.url();
      // Filter: Only log API responses, exclude dev server source file requests
      if (url.includes('/api/') && !url.includes('/src/')) {
        try {
          const body = await response.text();
          logs.push(`[API RESPONSE] ${response.status()} ${url}\n  Body: ${body.substring(0, 500)}${body.length > 500 ? '...' : ''}`);
        } catch {
          logs.push(`[API RESPONSE] ${response.status()} ${url}`);
        }
      }
    });
    
    await use(logs);
    
    // ONLY show API logs on test failure - keep passing test output clean
    if (testInfo.status !== 'passed' && logs.length > 0) {
      process.stdout.write('\n=== API LOGS ON FAILURE ===\n');
      process.stdout.write(logs.join('\n'));
      process.stdout.write('\n=== END API LOGS ===\n');
      
      await testInfo.attach('api-logs', {
        body: logs.join('\n'),
        contentType: 'text/plain',
      });
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';
```

**Verify implementation:**
```bash
# Check if test helpers exist with all auto-fixtures
grep -A 5 "consoleErrorCapture\|htmlDumpOnFailure\|apiLogs" tests/e2e/utils/test-helpers.ts
```

### 3. Verify Test Infrastructure

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

### 4. Running E2E Tests

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
| API calls timeout waiting for response | MSW service worker not registered | See MSW + Playwright Troubleshooting below |
| `PUT /api/v1/entity/undefined` | Route param used without validation | Add explicit check before API calls (see below) |

### 4.1 MSW + Playwright Troubleshooting (CRITICAL)

MSW service worker registration in Playwright tests can fail silently. When tests timeout waiting for API responses:

**Step 1: Verify MSW service worker file is served**
```bash
# Check if service worker file exists
ls public/mockServiceWorker.js

# If missing, regenerate it
pnpm dlx msw init public/ --save

# Verify it's accessible from dev server
curl -s http://localhost:5173/mockServiceWorker.js | head -5
```

**Step 2: Verify MSW is enabled in the app**
```bash
# Check the MSW enablement condition in main entry file
grep -A 5 "enableMocking" src/main.tsx src/index.tsx 2>/dev/null
```

MSW should ONLY be disabled when a real API URL is configured:
```typescript
// ✅ CORRECT: Only disable when real API is configured
if (import.meta.env.VITE_API_URL) {
  return; // Real backend, skip MSW
}

// ❌ WRONG: This disables MSW during E2E tests!
if (import.meta.env.VITE_API_URL || process.env.NODE_ENV === 'test') {
  return;
}
```

**Step 3: Check for undefined route params in API calls**

A common cause of 404 errors is using route params without validation:
```typescript
// ❌ BAD: params.entityId could be 'new' or undefined
await updateMutation.mutateAsync({
  entityId: params.entityId,  // Could be 'new' or undefined!
  data: { ... }
});

// ✅ GOOD: Validate before using
if (isNew) {
  await createMutation.mutateAsync({ data: { ... } });
} else if (params.entityId && params.entityId !== 'new') {
  await updateMutation.mutateAsync({
    entityId: params.entityId,
    data: { ... }
  });
}
```

**Step 4: Debug API request flow**

The apiLogs auto-fixture (shown in step 2) automatically logs all API requests when tests fail.

### 5. Selector Strategy Hierarchy (NON-NEGOTIABLE)

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

### 6. Selector Precision Rules (NON-NEGOTIABLE)

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

### 7. Test Assertion Anti-Patterns (NON-NEGOTIABLE)

NEVER use these patterns:

| Anti-Pattern | Why Bad | Correct Pattern |
|--------------|---------|-----------------|
| `expect(body).toBeVisible()` | Tests nothing meaningful | Test specific feature elements |
| `expect(header).toBeVisible()` alone | Proxy assertion | Test actual feature content |
| Guessing selectors | Causes strict mode violations | Read code or HTML dump first |
| Using `.first()` without understanding | Masks selector issues | Make selector more specific |
| Assuming UI behavior without verification | Tests fail unexpectedly | Read component code to understand actual behavior |

### 8. Verify Actual UI Behavior (NON-NEGOTIABLE)

Before writing tests, AI agents MUST understand how the UI actually works:

```typescript
// ❌ BAD: Assuming search filters by service name
await searchInput.fill('CIAM');
await expect(page.getByText('CIAM')).toBeVisible();  // May fail if search only filters by activity name

// ✅ GOOD: Verify search behavior by reading component code first
// If search only filters by name/description, test accordingly:
await searchInput.fill('Update User');  // Search by actual activity operation
await expect(page.getByText('Update User')).toBeVisible();
```

**Before writing tests:**
1. Read the component code to understand what fields are searchable
2. Check if groups/sections are collapsed by default (may need to expand first)
3. Verify what text is actually rendered (operation name vs activity name vs service name)

### 9. Test Description Alignment (NON-NEGOTIABLE)

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

### 10. Run Tests

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
