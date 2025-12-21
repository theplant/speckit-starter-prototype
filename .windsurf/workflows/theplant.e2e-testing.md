---
description: Refactor all code to apply E2E testing discipline following ThePlant's testing principles - Playwright-only testing with console error capture, HTML dump on failure, and strict selector hierarchy.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Refactor all code and E2E tests to follow ThePlant's testing discipline principles.

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:
- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.e2e-testing
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Steps

### Step 1: Configure `playwright.config.ts`

**Why:** Low timeouts enable fast feedback when selectors are wrong. AI agents cannot see the browser, so fast failure is critical for rapid fix-test-fix cycles.

- Low timeouts ensure fast failure when selectors are wrong
- `E2E_TARGET_URL` (not `BASE_URL`) avoids confusion with API base URL
- No `webServer` prevents Playwright from hanging

```typescript
export default defineConfig({
  maxFailures: 3,
  timeout: 5000,              // 5s max per test - fail fast
  expect: { timeout: 1000 },  // 1s for assertions
  use: {
    actionTimeout: 1000,      // 1s for actions
    baseURL: process.env.E2E_TARGET_URL || 'http://localhost:5173',
  },
  webServer: undefined,       // NEVER let Playwright start the server
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

### Step 2: Create `tests/e2e/utils/test-helpers.ts`

**Why:** AI agents cannot see the browser. These auto-fixtures provide essential debugging information: console errors, HTML dump on failure, and API logs. Without these, AI agents are blind when tests fail.

Create test helpers with three essential auto-fixtures:

```typescript
import { test as base } from '@playwright/test';

export const test = base.extend({
  // Auto-fixture 1: Console Error Capture
  // Collects all errors during test and outputs them only when test fails
  consoleErrorCapture: [async ({ page }, use, testInfo) => {
    const errors: { type: string; message: string; stack?: string }[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const location = msg.location();
        errors.push({
          type: 'console',
          message: text,
          stack: location ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : undefined,
        });
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push({
        type: 'pageerror',
        message: error.message,
        stack: error.stack,
      });
    });
    
    await use();
    
    // Only output errors when test fails
    if (testInfo.status !== 'passed' && errors.length > 0) {
      process.stderr.write('\n=== CONSOLE ERRORS DURING TEST ===\n');
      errors.forEach((err, i) => {
        process.stderr.write(`\n[${i + 1}] ${err.type.toUpperCase()}: ${err.message}\n`);
        if (err.stack) {
          process.stderr.write(`    Stack: ${err.stack}\n`);
        }
      });
      process.stderr.write('\n=== END CONSOLE ERRORS ===\n');
      
      // Attach to test report
      await testInfo.attach('console-errors', {
        body: JSON.stringify(errors, null, 2),
        contentType: 'application/json',
      });
    }
  }, { auto: true }],

    // Auto-fixture: Print error-context.md on test failure (CRITICAL FOR AI)
  // Playwright generates error-context.md with page snapshot - essential for debugging
  errorContextOnFailure: [async ({}, use, testInfo) => {
    await use();
    
    if (testInfo.status !== 'passed') {
      // Find the error-context.md file in test results
      const outputDir = testInfo.outputDir;
      const errorContextPath = path.join(outputDir, 'error-context.md');
      
      if (fs.existsSync(errorContextPath)) {
        const content = fs.readFileSync(errorContextPath, 'utf-8');
        process.stdout.write('\n=== ERROR CONTEXT (Page Snapshot) ===\n');
        process.stdout.write(content);
        process.stdout.write('\n=== END ERROR CONTEXT ===\n');
      }
    }
  }, { auto: true }],

  // Auto-fixture 2: HTML Dump on Failure (CRITICAL FOR AI)
  htmlDumpOnFailure: [async ({ page }, use, testInfo) => {
    await use();
    if (testInfo.status !== 'passed') {
      try {
        const html = await page.content();
        process.stdout.write('\n=== PAGE HTML ON FAILURE ===\n');
        process.stdout.write(html);
        process.stdout.write('\n=== END PAGE HTML ===\n');
        await testInfo.attach('page-html', { body: html, contentType: 'text/html' });
      } catch (e) {
        process.stdout.write(`\n[HTML DUMP ERROR] ${e}\n`);
      }
    }
  }, { auto: true }],

  // Auto-fixture 3: API Request Logging
  apiLogs: [async ({ page }, use, testInfo) => {
    const logs: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/') && !url.includes('/src/')) {
        logs.push(`[API REQUEST] ${request.method()} ${url}`);
      }
    });
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/') && !url.includes('/src/')) {
        try {
          const body = await response.text();
          logs.push(`[API RESPONSE] ${response.status()} ${url}\n  Body: ${body.substring(0, 500)}`);
        } catch {
          logs.push(`[API RESPONSE] ${response.status()} ${url}`);
        }
      }
    });
    await use(logs);
    if (testInfo.status !== 'passed' && logs.length > 0) {
      process.stdout.write('\n=== API LOGS ON FAILURE ===\n');
      process.stdout.write(logs.join('\n'));
      process.stdout.write('\n=== END API LOGS ===\n');
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';
```

### Step 4: Run System Exploration Workflow

<!-- runner:workflow:theplant.system-exploration -->

### Step 5: Create Page Objects in `tests/e2e/utils/page-objects/`

**Why:** Page Objects encapsulate selectors and actions, making tests more maintainable. When UI changes, only the Page Object needs updating, not every test.

- One Page Object per major page/route
- Encapsulate all selectors as readonly Locator properties
- Provide navigation methods (`goto()`, `gotoNew()`)
- Provide action methods (`search()`, `filter()`, `save()`)

With each READ path in @.system-exploration.md, create a Page Object with:

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

### Step 4: Run OpenAPI-First Workflow

<!-- runner:workflow:theplant.openapi-first -->

### Step 5: Run MSW Mock Backend Workflow

<!-- runner:workflow:theplant.msw-mock-backend -->

### Step 6: Run Test Data Seeding Workflow

<!-- runner:workflow:theplant.test-data-seeding -->


### Step 7: Write E2E Tests for All Read and Write Paths

**Why:** E2E tests validate real user behavior through the full stack (browser → API → storage). Testing BOTH read paths (data display) AND write paths (forms, mutations) ensures the entire user journey works correctly.

<!-- runner:loop:ROUTE -->
```bash
find src/routes -name "*.tsx" | grep -v "_" | head -20
```

**For route `$ROUTE`, write tests covering:**

**1. READ Path Tests (Data Display) in @.system-exploration.md:**

| Scenario | Test Data | Expected |
|----------|-----------|----------|
| Empty state | `[]` | Empty message visible |
| Single item | `[{...}]` | Item details visible |
| Multiple items | `[{...}, {...}]` | All items visible |

```typescript
test('should display items with seeded data', async ({ page }) => {
  await seedAndNavigate(page, '/items', { items: testItems });
  // Assert on ACTUAL seeded data, not generic elements
  await expect(page.getByText(testItems[0].name)).toBeVisible();
});

test('should show empty state', async ({ page }) => {
  await seedAndNavigate(page, '/items', { items: [] });
  await expect(page.getByText(/no items/i)).toBeVisible();
});
```

**2. WRITE Path Tests (CRUD Operations) in @.system-exploration.md:**

| Operation | Action | Expected |
|-----------|--------|----------|
| Create | Fill form, submit | New item in list |
| Update | Edit, save | Changes reflected |
| Delete | Confirm delete | Item removed |
| Validation | Submit invalid | Error messages |

```typescript
test('should create new item', async ({ page }) => {
  await page.goto('/items');
  await page.getByRole('button', { name: /add/i }).click();
  await page.getByLabel(/name/i).fill('New Item');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('New Item')).toBeVisible();
});

test('should delete item', async ({ page }) => {
  await seedAndNavigate(page, '/items', { items: [testItem] });
  await page.getByRole('button', { name: /delete/i }).click();
  await page.getByRole('button', { name: /confirm/i }).click();
  await expect(page.getByText(testItem.name)).not.toBeVisible();
});
```

**Selector Rules (apply in every test):**

1. **Priority order:** `data-testid` > `role` > `text` > CSS
2. **Exact match for text:** `{ exact: true }` prevents partial matches
3. **Anchor regex for options:** `/^connected$/i` prevents "Not Connected" matching
4. **Never guess selectors:** Read HTML dump or component code first

```typescript
// ✅ GOOD
page.getByTestId('submit-button')
page.getByRole('button', { name: /submit/i })
page.getByText('username', { exact: true })
page.getByRole('option', { name: /^active$/i })

// ❌ BAD
page.locator('.submit-btn')
page.getByText('user')  // Matches "user" and "username"
```

**Test Naming (apply to every test):**
```typescript
// ✅ GOOD: References acceptance scenario or bug ID
test('US1-AS1: New user can view empty list', ...);
test('BUG-123: Count updates after delete', ...);

// ❌ BAD: Generic name
test('should work', ...);
```

**Test Independence (apply to every test):**
- Tests MUST NOT depend on execution order
- Use `seedAndNavigate()` to set up isolated test data
- Each test cleans up or uses unique data

### Step 8: Run E2E Tests

**Why:** Running tests after each change ensures immediate feedback. Fast failure with low timeouts enables rapid iteration.

```bash
# Start dev server (MSW enabled when API URL env var is NOT set)
pnpm dev

# Run tests in another terminal
pnpm test:e2e

# Run specific tests
pnpm test:e2e --grep "Products"
```

**Diagnosis Table:**

| Error | Cause | Solution |
|-------|-------|----------|
| "strict mode violation" | Multiple elements match | Use `{ exact: true }`, regex anchors, or `data-testid` |
| "element not found" | Wrong selector | Check HTML dump, update selector |
| "timeout" | Loading/error state | Add wait or fix app crash |
| Console error | App error | Fix app first, don't modify test |
| 500 Error Page | Missing imports | Run `pnpm tsc --noEmit` to find import errors |

**NEVER weaken tests:**
- If test expects behavior that doesn't exist → **ADD THE BEHAVIOR**
- If test expects wrong behavior → **REMOVE THE TEST ENTIRELY** (not weaken it)
- Never remove assertions to make tests pass

**Before writing tests, verify UI behavior:**
1. Read component code to understand what fields are searchable
2. Check if groups/sections are collapsed by default
3. Verify what text is actually rendered

