---
description: Apply root cause tracing debugging discipline - trace problems backward through call chain, fix source not symptoms, never give up on complex issues.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

When problems occur during development, apply systematic root cause analysis before implementing fixes. This workflow ensures problems are solved at their source, preventing recurrence and maintaining system integrity.

## Core Principles (NON-NEGOTIABLE)

### Root Cause Tracing

- Problems MUST be traced backward through the call chain to find the original trigger
- Symptoms MUST be distinguished from root causes
- Fixes MUST address the source of the problem, NOT work around symptoms
- Test cases MUST NOT be removed or weakened to make tests pass
- Debuggers and logging MUST be used to understand control flow
- Multiple potential causes MUST be systematically eliminated
- Documentation MUST be updated to prevent similar issues
- Root cause MUST be verified through testing before closing the issue

### No-Give-Up Rule (NON-NEGOTIABLE)

AI agents MUST NEVER abandon a problem by:
- Reverting to "simpler" approaches that avoid the actual issue
- Saying "this won't work easily with this architecture"
- Removing tests or features because they're "too complex"
- Giving up after initial failures without exhausting root cause analysis

Instead, AI agents MUST:
1. Continue investigating until the root cause is found
2. Try multiple hypotheses systematically
3. Read source code to understand the actual implementation
4. Document findings even if the fix requires architectural changes
5. Only escalate to the user when genuinely blocked after thorough investigation

## Debugging Process

### Step 1: Reproduce

Create a reliable reproduction case:
- Identify exact steps to trigger the issue
- Document environment conditions
- Create minimal test case if possible

### Step 2: Observe

Gather evidence through logs, debugger, tests:
- Add logging statements to trace execution flow
- Use browser DevTools for frontend issues
- Check network requests and responses
- Examine localStorage/state changes

### Step 3: Hypothesize

Form theories about root cause:
- List all possible causes
- Rank by likelihood based on evidence
- Consider recent changes that might have introduced the issue

### Step 4: Test

Design experiments to validate/invalidate hypotheses:
- Test one hypothesis at a time
- Use binary search to narrow down the problem
- Add temporary debug code to verify assumptions

### Step 5: Fix

Implement fix addressing root cause:
- Fix the source, not the symptom
- Ensure fix doesn't break existing functionality
- Keep fix minimal and focused

### Step 6: Verify

Ensure fix works and doesn't break existing functionality:
- Run all related tests
- Test edge cases
- Verify original reproduction case is fixed

### Step 7: Document

Update docs/tests to prevent regression:
- Add regression test for the bug
- Update documentation if needed
- Share learnings with team

## Example of Violation

```
❌ "The data seeding approach won't work easily with this architecture. 
    Let me revert to simpler tests that work with the existing seeded data."
```

This is a violation because it:
- Gives up without finding root cause
- Reverts to simpler approach that avoids the issue
- Doesn't investigate why seeding isn't working

## Example of Correct Behavior

```
✅ "The seeding isn't working. Let me trace the root cause:
    1. Reproduce: Data not appearing after seeding localStorage
    2. Observe: Check the actual localStorage key in store.ts
    3. Hypothesize: Maybe wrong key? Maybe Zustand not re-hydrating?
    4. Test: Found key is 'pim-mock-db' not 'mock-db-storage'
    5. Fix: Use correct key and add page.reload() for re-hydration
    6. Verify: Tests now pass
    7. Document: Added correct key to test helpers"
```

## Test Fix Discipline

When tests fail:

- NEVER use `test.skip()` to avoid fixing a complicated test
- ALWAYS trace the root cause of test failures before implementing fixes
- When UI changes break tests, update test selectors and assertions to match new UI
- When behavior changes, rewrite test assertions to validate new expected behavior
- Remove tests that test removed functionality

## Error Diagnosis for E2E Tests

When E2E tests fail, follow this diagnosis process:

### "strict mode violation" (multiple elements match)
- Read the error message for element count
- Make selector more specific using `data-testid`
- Use `.first()` only if multiple matches are expected

### "element not found"
- Check HTML dump for actual element attributes
- Element exists with different attributes → Update selector
- Element truly missing → Check if feature is implemented
- Page shows error boundary → Fix application bug first

### "timeout"
- Page loaded but element missing → Wrong selector or missing feature
- Page shows loading state → Add explicit wait for content
- Page shows error boundary → Fix application crash first

### Console error captured
- Fix application error first, then re-run test
- Do NOT modify test to ignore the error

## Context

$ARGUMENTS
