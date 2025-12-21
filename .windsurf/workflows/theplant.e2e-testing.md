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

## Note

Don't use --reporter option when running test, since we have a customized reporter in config for AI to easily understand failures

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

### Step 1: Write E2E Tests for All Read and Write Paths

**Why:** E2E tests validate real user behavior through the full stack (browser → API → storage). Testing BOTH read paths (data display) AND write paths (forms, mutations) ensures the entire user journey works correctly.

```bash
find src/routes -name "*.tsx" | grep -v "_" | head -20
```

**For route `$ROUTE`, write tests covering:**

**1. Create READ Path Tests (Data Display) in @.system-exploration.md:**

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

**2. CreateWRITE Path Tests (CRUD Operations) in @.system-exploration.md:**

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

**Avoiding Strict Mode Violations:**

When text appears in multiple elements (e.g., status "active" in username, email, and badge):

```typescript
// ❌ BAD: Matches username "active_user", email "active@example.com", badge "active"
page.getByText('active')

// ✅ GOOD: Exact match for status badge only
page.getByText('active', { exact: true })

// ✅ GOOD: Regex anchor for option elements
page.getByRole('option', { name: /^active$/i })
```

**Verify Selector Text Before Writing Tests:**

```typescript
// ❌ BAD: Assumed text without reading component
await expect(page.getByText(/sign up/i)).toBeVisible();

// ✅ GOOD: Verified against actual component source
// After reading component: CardTitle shows "Create an account"
await expect(page.getByText('Create an account', { exact: true })).toBeVisible();
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

### Step 2: Run E2E Tests

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

#### AI Reporter Infrastructure

**Why:** When tests fail, AI agents need rich context to debug effectively. The standard Playwright output lacks the detail needed for AI-assisted debugging.

**Required Files:**

1. **`tests/e2e/utils/test-helpers.ts`** - Extended test fixture that captures:
   - All console messages (log, warn, info, error) - not just errors
   - HTML snapshot of the page on failure
   - Form validation messages (`[data-slot="form-message"]`)
   - Available `data-testid` attributes

2. **`tests/e2e/utils/ai-reporter.ts`** - Custom reporter that outputs:
   - Failed test location and error message
   - All captured console messages (for debugging output)
   - Relevant HTML context (form structure, available selectors)
   - Actionable debugging tips

**What Gets Captured on Test Failure:**

| Data | Why | How |
|------|-----|-----|
| All console messages | Developers add `console.log` for debugging | Capture all `msg.type()` not just `error` |
| Form validation messages | Shows actual vs expected validation text | Query `[data-slot="form-message"]` |
| Form/Main HTML structure | Shows available selectors and structure | Capture `form` or `main` innerHTML |
| Available test IDs | Quick selector alternatives | Query `[data-testid]` attributes |

**Example Reporter Output:**

```
📁 File: tests/e2e/settings.spec.ts:93

🔴 Error:
   Error: expect(locator).toBeVisible() failed
   Locator: getByText(/at least 2 characters/i)

📝 Console Output (3 messages):
   📋 [log] DEBUG: Form submitted
   ⚠️ [warn] Validation triggered
   ℹ️ [info] Form state: invalid

🔍 HTML Context:
   📋 Form Validation Messages: Please enter your username., Please select an email.
   📄 Form Structure:
      <div data-slot="form-item">...</div>
```

**Debugging with Console Logs:**

When debugging failing tests, add `console.log` in your test - they will appear in the reporter output:

```typescript
test('debug example', async ({ page }) => {
  await page.goto('/settings');
  
  // These will appear in reporter output on failure
  await page.evaluate(() => {
    console.log('DEBUG: Current form state');
  });
  
  const formMessages = await page.locator('[data-slot="form-message"]').allTextContents();
  console.log('Form messages:', formMessages);  // Also captured
  
  await expect(page.getByText(/expected text/i)).toBeVisible();
});
```

