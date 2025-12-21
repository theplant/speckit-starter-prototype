---
description: Summarize conversation issues and blockers, then improve existing ThePlant workflows or create new ones with generalized learnings to prevent future problems.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Analyze conversation issues and update workflows with generalized learnings.

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:
- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.workflow-improvement
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.


## Steps

### Step 1: Identify Issues from Conversation

**Why:** Systematic issue identification ensures no learnings are lost. Each issue becomes a potential workflow improvement.

Analyze the current conversation and document:

```markdown
## Issues Identified

### Issue 1: [Brief description]
- **What happened**: [Description]
- **Root cause**: [Why it happened]
- **Solution applied**: [How it was fixed]
- **Generalized learning**: [What to document]
- **Target workflow**: [Which theplant.*.md to update]

### Issue 2: ...
```

### Step 2: Categorize Issues

**Why:** Categorization ensures learnings go to the right workflow file, avoiding duplication and keeping workflows focused.

| Issue Type | Target Workflow |
|------------|-----------------|
| API/Type mismatches, Orval hooks | `theplant.openapi-first.md` |
| Selector strategies, test patterns | `theplant.e2e-testing.md` |
| Handler patterns, data persistence | `theplant.msw-mock-backend.md` |
| Investigation strategies, debugging | `theplant.root-cause-tracing.md` |
| Data flow tracing | `theplant.system-exploration.md` |
| Test data patterns | `theplant.test-data-seeding.md` |

### Step 3: Read Target Workflow Files

**Why:** Reading existing content prevents duplication and helps identify the right section for new learnings.

```bash
# Read the workflow file to update
cat .windsurf/workflows/theplant.[target].md
```

Check:
1. Current content structure
2. Appropriate section to add learning
3. Whether similar guidance already exists (avoid duplication)

### Step 4: Generalize the Learning

**Why:** Workflows are shared across projects. Project-specific content makes workflows less useful for other teams.

**Generalization Rules:**
- Use generic names (`MyEntity`, `myField`) NOT project names
- Use conventional paths (`src/mocks/handlers.ts`) NOT absolute paths
- Focus on underlying principle, not specific instance
- Include both problem pattern AND solution

**Path Generalization:**
```bash
# ✅ GOOD: Standard paths
src/mocks/handlers.ts
tests/e2e/utils/test-helpers.ts
playwright.config.ts

# ❌ BAD: Absolute paths
/Users/john/projects/my-app/src/...

# ✅ GOOD: Discovery commands for variable paths
grep -rn "API_URL" src/ --include="*.ts"
```

### Step 5: Propose Updates

**Why:** Proposing before applying allows review and prevents accidental overwrites.

For each update, document:
- Target file
- Section to update
- Proposed addition (generalized)

**Example:**
```markdown
**Target**: `theplant.openapi-first.md`
**Section**: Step 9: Migrate Components

**Add**:
When migrating enums:
- Manual: `EntityStatus.ACTIVE`
- Orval: `EntityStatus.ENTITY_STATUS_ACTIVE`

Find all usages:
```bash
grep -rn "EntityStatus\." src/ --include="*.ts"
```
```

### Step 6: Apply Updates to Workflow Files

**Why:** Applying updates immediately captures learnings while context is fresh.

Edit the target workflow files with the generalized learnings.

If Needed, Create New Workflow

If learning represents a new discipline, create `theplant.[discipline-name].md`:

```markdown
---
description: [One-line description]
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

[What this workflow achieves]

## Steps

### Step 1: [First deterministic file change]

[Specific file to create/modify with exact content]

### Step 2: [Next file change]

...

### Step N: [Verification]

[How to verify the workflow worked]
```

**New Workflow Criteria:**
- Doesn't fit naturally into existing workflows
- Addresses recurring pattern across projects
- Has enough depth for its own file
- Follows naming: `theplant.[discipline-name].md`

### Step 8: Verify No Duplication

**Why:** Duplicate content makes workflows harder to maintain and can lead to inconsistencies.

```bash
# Check for similar content in existing workflows
grep -rn "[key phrase from learning]" .windsurf/workflows/
```

**Rules:**
- NEVER add project-specific content
- NEVER duplicate existing guidance
- ALWAYS generalize before adding
- ALWAYS propose updates before applying
