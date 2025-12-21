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

## CRITICAL: NO SKIPPING ALLOWED

**⚠️ AI MUST NEVER skip any task or nested workflow, regardless of:**
- Whether the project appears to be "static" or "demo"
- Whether API endpoints don't exist yet
- Whether the task seems "not applicable"
- Whether similar functionality already exists

**For every task, AI MUST:**
1. **Actually create the files** specified in the task
2. **Actually run the commands** specified in the task
3. **Actually implement the code** even if it requires creating new infrastructure
4. If a task requires API endpoints that don't exist → **CREATE THEM**
5. If a task requires localStorage that isn't used → **ADD IT**
6. If a task requires MSW handlers → **CREATE THEM**

**Marking a task complete without doing the work is FORBIDDEN.**

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:
- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.reformat-architecture
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Steps

### Step 1: Configure `playwright.config.ts`

**Why:** Low timeouts enable fast feedback when selectors are wrong. AI agents cannot see the browser, so fast failure is critical for rapid fix-test-fix cycles.

- Low timeouts ensure fast failure when selectors are wrong
- `E2E_TARGET_URL` (not `BASE_URL`) avoids confusion with API base URL
- No `webServer` prevents Playwright from hanging
- Custom AI reporter provides clean, structured error output

```typescript
export default defineConfig({
  maxFailures: 3,
  reporter: './tests/e2e/utils/ai-reporter.ts',  // Custom AI-friendly reporter
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

### Step 1.5: Create Custom AI Reporter `tests/e2e/utils/ai-reporter.ts`

**Why:** AI agents cannot see the browser. A custom reporter provides clean, structured error output without overwhelming verbose dumps. This is more effective than multiple auto-fixtures that output independently.

```typescript
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as path from 'path';

type ConsoleMessage = {
  type: 'log' | 'warn' | 'info' | 'error' | 'pageerror';
  message: string;
  location?: string;
};

type HtmlContext = {
  formValidationMessages?: string;
  availableTestIds?: string;
  formStructure?: string;
  mainStructure?: string;
};

/**
 * AI-Friendly Playwright Reporter
 * 
 * Designed to provide rich context for AI debugging.
 * Captures console messages, HTML context, and actionable debugging hints.
 */
class AIReporter implements Reporter {
  private failedTests: Array<{
    title: string;
    file: string;
    line: number;
    error: string;
    consoleMessages: ConsoleMessage[];
    htmlContext: HtmlContext | null;
  }> = [];

  onBegin(config: FullConfig, suite: Suite) {
    const totalTests = suite.allTests().length;
    console.log(`\n🧪 Running ${totalTests} tests...\n`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const status = result.status;
    const duration = result.duration;
    const title = test.title;
    const file = path.relative(process.cwd(), test.location.file);
    const line = test.location.line;

    if (status === 'passed') {
      console.log(`  ✓ ${title} (${duration}ms)`);
    } else if (status === 'skipped') {
      console.log(`  ⊘ ${title} (skipped)`);
    } else {
      console.log(`  ✘ ${title} (${duration}ms)`);
      
      // Collect failure info
      const errorMessage = result.error?.message || 'Unknown error';
      let consoleMessages: ConsoleMessage[] = [];
      let htmlContext: HtmlContext | null = null;
      
      // Extract console messages from attachments
      for (const attachment of result.attachments) {
        if (attachment.name === 'console-messages' && attachment.body) {
          try {
            consoleMessages = JSON.parse(attachment.body.toString());
          } catch {
            // Ignore parse errors
          }
        }
        
        // Extract HTML context from attachments
        if (attachment.name === 'html-context' && attachment.body) {
          try {
            htmlContext = JSON.parse(attachment.body.toString());
          } catch {
            // Ignore parse errors
          }
        }
      }

      this.failedTests.push({
        title,
        file,
        line,
        error: errorMessage,
        consoleMessages,
        htmlContext,
      });
    }
  }

  onEnd(result: FullResult) {
    console.log('\n' + '─'.repeat(60));
    
    if (this.failedTests.length === 0) {
      console.log(`\n✅ All tests passed!\n`);
      return;
    }

    console.log(`\n❌ ${this.failedTests.length} test(s) failed:\n`);

    for (let i = 0; i < this.failedTests.length; i++) {
      const test = this.failedTests[i];
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`FAILURE ${i + 1}: ${test.title}`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`📁 File: ${test.file}:${test.line}`);
      console.log(`\n🔴 Error:`);
      console.log(this.formatError(test.error));

      // Display console messages (all types: log, warn, info, error)
      if (test.consoleMessages.length > 0) {
        console.log(`\n📝 Console Output (${test.consoleMessages.length} messages):`);
        for (const msg of test.consoleMessages.slice(0, 10)) {
          const icon = msg.type === 'error' ? '❌' : msg.type === 'warn' ? '⚠️' : msg.type === 'info' ? 'ℹ️' : '📋';
          console.log(`   ${icon} [${msg.type}] ${msg.message.substring(0, 300)}`);
        }
        if (test.consoleMessages.length > 10) {
          console.log(`   ... and ${test.consoleMessages.length - 10} more messages`);
        }
      }

      // Display HTML context for debugging
      if (test.htmlContext) {
        console.log(`\n🔍 HTML Context:`);
        if (test.htmlContext.formValidationMessages) {
          console.log(`   📋 Form Validation Messages: ${test.htmlContext.formValidationMessages}`);
        }
        if (test.htmlContext.availableTestIds) {
          console.log(`   🏷️  Available data-testid: ${test.htmlContext.availableTestIds}`);
        }
        if (test.htmlContext.formStructure) {
          console.log(`   📄 Form Structure:`);
          console.log(this.formatHtmlSnippet(test.htmlContext.formStructure));
        } else if (test.htmlContext.mainStructure) {
          console.log(`   📄 Main Content Structure:`);
          console.log(this.formatHtmlSnippet(test.htmlContext.mainStructure));
        }
      }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`\n💡 AI Debugging Tips:`);
    console.log(`   1. Check if the selector matches the actual DOM`);
    console.log(`   2. Verify the page has fully loaded before assertions`);
    console.log(`   3. Look for console errors that might indicate app crashes`);
    console.log(`   4. Use { exact: true } for text that appears in multiple elements\n`);
  }

  private formatError(error: string): string {
    // Extract the most relevant part of the error
    const lines = error.split('\n');
    const relevantLines: string[] = [];
    
    for (const line of lines) {
      // Skip stack trace lines
      if (line.trim().startsWith('at ')) continue;
      // Skip empty lines
      if (!line.trim()) continue;
      // Include up to 10 relevant lines
      if (relevantLines.length < 10) {
        relevantLines.push(`   ${line}`);
      }
    }
    
    return relevantLines.join('\n');
  }

  private formatHtmlSnippet(html: string): string {
    // Format HTML for readable output, showing structure without overwhelming
    const lines = html.split('\n');
    const output: string[] = [];
    let lineCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Truncate very long lines
      const displayLine = trimmed.length > 120 ? trimmed.substring(0, 120) + '...' : trimmed;
      output.push(`      ${displayLine}`);
      lineCount++;
      
      // Limit to 15 lines for readability
      if (lineCount >= 15) {
        output.push('      ... (truncated)');
        break;
      }
    }
    
    return output.join('\n') || '      (no HTML captured)';
  }
}

export default AIReporter;
```

### Step 2: Create `tests/e2e/utils/test-helpers.ts`

**Why:** Console errors are captured and attached to test results. The custom AI reporter (Step 1.5) handles all error formatting and output. This keeps fixtures minimal and avoids verbose dumps.

```typescript
import { test as base, type Page, type TestInfo } from '@playwright/test';

type ConsoleMessage = {
  type: 'log' | 'warn' | 'info' | 'error' | 'pageerror';
  message: string;
  location?: string;
};

type TestFixtures = {
  aiDebugCapture: void;
};

/**
 * Extended Playwright test with AI-friendly debug capture.
 * 
 * Captures ALL console messages (not just errors) and HTML context on failure.
 * The custom AI reporter (ai-reporter.ts) formats this for AI debugging.
 */
export const test = base.extend<TestFixtures>({
  // Auto-fixture: AI Debug Capture
  // Captures all console messages, page errors, and HTML context on failure
  aiDebugCapture: [async ({ page }: { page: Page }, use: () => Promise<void>, testInfo: TestInfo) => {
    const consoleMessages: ConsoleMessage[] = [];
    
    // Capture ALL console message types (log, warn, info, error)
    page.on('console', (msg) => {
      const msgType = msg.type();
      if (['log', 'warn', 'info', 'error'].includes(msgType)) {
        const location = msg.location();
        consoleMessages.push({
          type: msgType as ConsoleMessage['type'],
          message: msg.text(),
          location: location ? `${location.url}:${location.lineNumber}` : undefined,
        });
      }
    });
    
    // Capture uncaught page errors
    page.on('pageerror', (error) => {
      consoleMessages.push({
        type: 'pageerror',
        message: error.message,
        location: error.stack?.split('\n')[1]?.trim(),
      });
    });
    
    await use();
    
    // On test failure, attach debug context
    if (testInfo.status !== 'passed') {
      // Attach all console messages
      if (consoleMessages.length > 0) {
        await testInfo.attach('console-messages', {
          body: JSON.stringify(consoleMessages, null, 2),
          contentType: 'application/json',
        });
      }
      
      // Capture HTML context for debugging
      try {
        const htmlContext: Record<string, string> = {};
        
        // Get form validation messages if any
        const formMessages = await page.locator('[data-slot="form-message"]').allTextContents();
        if (formMessages.length > 0) {
          htmlContext.formValidationMessages = formMessages.join(', ');
        }
        
        // Get available data-testid attributes (useful for selector hints)
        const testIds = await page.locator('[data-testid]').evaluateAll(
          (elements) => elements.map(el => el.getAttribute('data-testid')).filter(Boolean).slice(0, 20)
        );
        if (testIds.length > 0) {
          htmlContext.availableTestIds = testIds.join(', ');
        }
        
        // Get form structure if on a form page
        const formHtml = await page.locator('form').first().innerHTML().catch(() => null);
        if (formHtml) {
          // Truncate to reasonable size for AI context
          htmlContext.formStructure = formHtml.length > 2000 
            ? formHtml.substring(0, 2000) + '... (truncated)'
            : formHtml;
        }
        
        // Get main content area structure
        const mainHtml = await page.locator('main').first().innerHTML().catch(() => null);
        if (mainHtml && !formHtml) {
          htmlContext.mainStructure = mainHtml.length > 2000
            ? mainHtml.substring(0, 2000) + '... (truncated)'
            : mainHtml;
        }
        
        if (Object.keys(htmlContext).length > 0) {
          await testInfo.attach('html-context', {
            body: JSON.stringify(htmlContext, null, 2),
            contentType: 'application/json',
          });
        }
      } catch {
        // Ignore errors when capturing HTML context
      }
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

**⚠️ MANDATORY: Do NOT skip this workflow. If the project has no API, CREATE one.**

<!-- runner:workflow:theplant.openapi-first -->

### Step 5: Run MSW Mock Backend Workflow

**⚠️ MANDATORY: Do NOT skip this workflow. If the project has no MSW, SET IT UP.**

<!-- runner:workflow:theplant.msw-mock-backend -->

### Step 6: Run Test Data Seeding Workflow

**⚠️ MANDATORY: Do NOT skip this workflow. If the project has no localStorage persistence, ADD IT.**

<!-- runner:workflow:theplant.test-data-seeding -->


### Step 7: Write E2E Tests for All Read and Write Paths

<!-- runner:workflow:theplant.e2e-testing -->

