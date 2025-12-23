---
description: Refactor all code to apply E2E testing discipline following ThePlant's testing principles
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

### Step 1: Critical Rules and ARIA Snapshot Setup

**IMPORTANT: Read and follow ALL rules in this step before writing any tests.**

#### Critical Rules (NEVER Violate)

1. **ONLY use `toMatchAriaSnapshot` for assertions** - NEVER use `toBeVisible()`, `toHaveText()`, `toBeChecked()`, or any other expect methods. ALL assertions MUST use `toMatchAriaSnapshot`.

2. **ALWAYS use `body` locator** - Never use `getByRole('main')` as some pages don't have a main role element (auth pages, error pages, etc.)

3. **ALWAYS use `--update-source-method=overwrite`** - Without this flag, Playwright creates patch files instead of updating source directly. Command: `pnpm test:e2e --update-snapshots --update-source-method=overwrite`

4. **ALWAYS review generated snapshots** - After generation, simplify to partial matches by removing dev tools, notifications, and non-essential elements

5. **NEVER modify `playwright.config.ts`** - This configuration file controls test infrastructure and should remain stable. Do not change timeouts, reporters, or any other settings to fix test failures.

6. **NEVER use `--reporter` CLI flag** - The project has a custom AI reporter configured in `playwright.config.ts`.

7. **Fix tests by fixing selectors or app code** - If tests timeout or fail, the solution is ALWAYS to fix incorrect selectors or fix missing app behavior. NEVER adjust timeouts or config.

**Reference:** https://playwright.dev/docs/aria-snapshots

#### Workflow for Writing Tests with ARIA Snapshots

**1. Write failing test with empty snapshot using `body` locator:**

```typescript
test("US1-AS1: User can view items page", async ({ page }) => {
  await page.goto("/items");
  // ALWAYS use body locator - some pages don't have main role
  await expect(page.locator("body")).toMatchAriaSnapshot(``);
});
```

**2. Run test to generate snapshot (MUST use --update-source-method=overwrite):**

```bash
pnpm test:e2e --update-snapshots --update-source-method=overwrite
```

**3. Review generated snapshot** - The snapshot will include everything on the page. You MUST:

- Remove dev tools buttons (TanStack Query, Router devtools)
- Remove notification regions
- Keep only the essential page structure elements
- Simplify to partial match (only key elements)

**4. Simplify to partial match with essential elements only:**

```typescript
test("US1-AS1: User can view items page", async ({ page }) => {
  await page.goto("/items");
  // Simplified partial match - only essential elements
  await expect(page.locator("body")).toMatchAriaSnapshot(`
    - heading "Items" [level=1]
    - button "Add Item"
    - table
  `);
});
```

#### ARIA Snapshot Syntax

| Element          | Syntax                    | Example                       |
| ---------------- | ------------------------- | ----------------------------- |
| Exact text       | `"text"`                  | `- heading "Items"`           |
| Regex pattern    | `/pattern/`               | `- heading /Items \d+/`       |
| Level attribute  | `[level=N]`               | `- heading "Title" [level=1]` |
| State attributes | `[checked]`, `[disabled]` | `- checkbox [checked]`        |
| Partial match    | Omit children             | `- table` (matches any table) |
| Nested elements  | Indentation               | See examples below            |

#### READ Path Tests (Data Display)

| Scenario       | Test Data        | Expected                  |
| -------------- | ---------------- | ------------------------- |
| Empty state    | `[]`             | Empty message in snapshot |
| Single item    | `[{...}]`        | Item details in snapshot  |
| Multiple items | `[{...}, {...}]` | All items in snapshot     |

```typescript
test("US1-AS1: User can view empty list", async ({ page }) => {
  await seedAndNavigate(page, "/items", { items: [] });
  await expect(page.locator("body")).toMatchAriaSnapshot(`
    - heading "Items" [level=1]
    - text: /no items/i
  `);
});

test("US1-AS2: User can view items list", async ({ page }) => {
  const testItems = [createTestItem("1", "First Item")];
  await seedAndNavigate(page, "/items", { items: testItems });
  await expect(page.locator("body")).toMatchAriaSnapshot(`
    - heading "Items" [level=1]
    - table:
      - rowgroup:
        - row:
          - cell "First Item"
  `);
});
```

#### WRITE Path Tests (CRUD Operations)

| Operation  | Action            | Expected                   |
| ---------- | ----------------- | -------------------------- |
| Create     | Fill form, submit | New item in snapshot       |
| Update     | Edit, save        | Changes in snapshot        |
| Delete     | Confirm delete    | Item removed from snapshot |
| Validation | Submit invalid    | Error messages in snapshot |

```typescript
test("US1-W1: User can create item", async ({ page }) => {
  await page.goto("/items");
  await page.getByRole("button", { name: /add/i }).click();

  // Verify form structure with ARIA snapshot (dialog is an exception - use specific locator)
  await expect(page.getByRole("dialog")).toMatchAriaSnapshot(`
    - dialog:
      - heading "Add Item"
      - textbox "Name"
      - button "Save"
  `);

  await page.getByRole("textbox", { name: "Name" }).fill("New Item");
  await page.getByRole("button", { name: "Save" }).click();

  // Verify item appears in list
  await expect(page.locator("body")).toMatchAriaSnapshot(`
    - table:
      - rowgroup:
        - row:
          - cell "New Item"
  `);
});

test("US1-W2: User can delete item", async ({ page }) => {
  await seedAndNavigate(page, "/items", { items: [testItem] });
  await page.getByRole("button", { name: /delete/i }).click();
  await page.getByRole("button", { name: /confirm/i }).click();

  // Verify item removed - use partial match
  await expect(page.locator("body")).toMatchAriaSnapshot(`
    - heading "Items" [level=1]
    - text: /no items/i
  `);
});
```

#### Discovering Page Structure

Use `locator.ariaSnapshot()` to programmatically discover the accessibility tree:

```typescript
test("discover page structure", async ({ page }) => {
  await page.goto("/items");
  // ALWAYS use body locator for discovery
  const snapshot = await page.locator("body").ariaSnapshot();
  console.log(snapshot);
  // Copy relevant parts to your test assertion
});
```

#### Partial Matching (Recommended)

ARIA snapshots support partial matching - only specified elements need to match:

```typescript
// ✅ GOOD: Partial match - flexible, only checks key elements
await expect(page.locator("body")).toMatchAriaSnapshot(`
  - heading "Items" [level=1]
  - button "Add Item"
`);

// ❌ AVOID: Full match - brittle, breaks on any UI change
await expect(page.locator("body")).toMatchAriaSnapshot(`
  - heading "Items" [level=1]
  - text: "Manage your items here"
  - button "Add Item"
  - button "Export"
  - table:
    - rowgroup:
      - row:
        - columnheader "Name"
        - columnheader "Status"
        - columnheader "Actions"
`);
```

#### Test Naming Convention

```typescript
// ✅ GOOD: References acceptance scenario or bug ID
test('US1-AS1: User can view empty list', ...);
test('US1-W1: User can create item', ...);
test('BUG-123: Count updates after delete', ...);

// ❌ BAD: Generic name
test('should work', ...);
test('empty state', ...);
```

#### Selector Precision Rules (CRITICAL)

**IMPORTANT**: Avoid selectors that match multiple elements. Common pitfalls:

| Problem                        | Example                                                                        | Solution                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Username matches email         | `getByText('johndoe')` matches both `johndoe` and `johndoe@example.com`        | Use `getByText('johndoe', { exact: true })`                                   |
| Filter options with counts     | `getByRole('option', { name: /active/i })` matches "Active 1" and "Inactive 1" | Use `getByRole('option', { name: /active/i }).first()` or more specific regex |
| "Connected" vs "Not Connected" | `getByRole('option', { name: /connected/i })` matches both                     | Use `getByRole('option', { name: /^connected$/i })` with anchors              |
| Multiple headings              | `getByRole('heading', { name: /tasks/i })` matches sidebar and page heading    | Use more specific container or `first()`                                      |

```typescript
// ❌ BAD: Matches multiple elements
await page.getByText("activeuser").toBeVisible(); // Matches username AND email

// ✅ GOOD: Exact match prevents partial matches
await page.getByText("activeuser", { exact: true }).toBeVisible();

// ❌ BAD: Regex matches "Active 1" and "Inactive 1"
await page.getByRole("option", { name: /active/i }).click();

// ✅ GOOD: Use first() when options show counts
await page
  .getByRole("option", { name: /active/i })
  .first()
  .click();

// ❌ BAD: Matches "Connected" and "Not Connected"
await page.getByRole("option", { name: /connected/i }).click();

// ✅ GOOD: Anchor regex to match exact word
await page.getByRole("option", { name: /^connected$/i }).click();
```

#### Test Assertion Anti-Patterns (NON-NEGOTIABLE)

NEVER use these patterns:

| Anti-Pattern                           | Why Bad                       | Correct Pattern                |
| -------------------------------------- | ----------------------------- | ------------------------------ |
| `expect(body).toBeVisible()`           | Tests nothing meaningful      | Test specific feature elements |
| `expect(header).toBeVisible()` alone   | Proxy assertion               | Test actual feature content    |
| Guessing selectors                     | Causes strict mode violations | Read code or HTML dump first   |
| Using `.first()` without understanding | Masks selector issues         | Make selector more specific    |

#### Spec-Critical Invariants MUST Have Explicit Assertions (NON-NEGOTIABLE)

Some behaviors are **spec-critical invariants** and MUST NOT be tested via proxy assertions like "redirected away from page" or "sidebar is visible".

- For these invariants, tests MUST include at least one explicit assertion on the authoritative state, such as:
  - The authenticated session payload (e.g., permissions list, roles list)
  - The underlying persisted storage state (when applicable in this prototype)
  - A server-enforced denial/allow check that cannot be satisfied unless the invariant holds

Examples:

- Initial setup: after creating the first admin and signing in, MUST assert session includes `iam_admin` role AND includes all IAM permission codes.

#### Test Independence

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

| Error                   | Cause                   | Solution                                               |
| ----------------------- | ----------------------- | ------------------------------------------------------ |
| "strict mode violation" | Multiple elements match | Use `{ exact: true }`, regex anchors, or `data-testid` |
| "element not found"     | Wrong selector          | Check HTML dump, update selector                       |
| "timeout"               | Loading/error state     | Add wait or fix app crash                              |
| Console error           | App error               | Fix app first, don't modify test                       |
| 500 Error Page          | Missing imports         | Run `pnpm tsc --noEmit` to find import errors          |

**NEVER weaken tests:**

- If test expects behavior that doesn't exist → **ADD THE BEHAVIOR**
- If test expects wrong behavior → **REMOVE THE TEST ENTIRELY** (not weaken it)
- Never remove assertions to make tests pass

**Handling Timeouts (Strict Rule):**

- **Do Not Adjust Timeouts**: Never increase timeout values to bypass test failures. Timeouts often indicate elements are not found or the UI isn't ready, and extending timeouts masks the root cause.
- **Correct Approach**: Revisit the component code to ensure selector accuracy. If the UI is slow, investigate app performance issues or use explicit waits for specific conditions (e.g., `await page.waitForLoadState('networkidle')`).

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

| Data                     | Why                                        | How                                       |
| ------------------------ | ------------------------------------------ | ----------------------------------------- |
| All console messages     | Developers add `console.log` for debugging | Capture all `msg.type()` not just `error` |
| Form validation messages | Shows actual vs expected validation text   | Query `[data-slot="form-message"]`        |
| Form/Main HTML structure | Shows available selectors and structure    | Capture `form` or `main` innerHTML        |
| Available test IDs       | Quick selector alternatives                | Query `[data-testid]` attributes          |

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
test("debug example", async ({ page }) => {
  await page.goto("/settings");

  // These will appear in reporter output on failure
  await page.evaluate(() => {
    console.log("DEBUG: Current form state");
  });

  const formMessages = await page
    .locator('[data-slot="form-message"]')
    .allTextContents();
  console.log("Form messages:", formMessages); // Also captured

  await expect(page.getByText(/expected text/i)).toBeVisible();
});
```
