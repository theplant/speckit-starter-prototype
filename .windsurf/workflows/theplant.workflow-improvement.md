---
description: Summarize conversation issues and blockers, then improve existing ThePlant workflows or create new ones with generalized learnings to prevent future problems.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

After completing a task or encountering difficulties during development, analyze the conversation to identify:
1. Problems that caused delays or confusion
2. Patterns that led to mistakes
3. Missing documentation or unclear guidance
4. Workarounds that should become standard practices

Then either:
- **Update existing ThePlant workflow files** with generalized learnings, OR
- **Create new ThePlant workflow files** if the learnings represent a distinct discipline not covered by existing workflows

## Rationale (WORKFLOW-IMPROVEMENT)

Workflows are shared across multiple projects and teams. By systematically capturing learnings from real development sessions, we continuously improve the guidance available to AI agents and developers. This creates a positive feedback loop where each project benefits from lessons learned in previous projects.

## Core Principles (NON-NEGOTIABLE)

### Generalization Rule (NON-NEGOTIABLE)

- Learnings MUST be generalized and NOT project-specific
- Examples MUST use generic names (e.g., `MyEntity`, `myField`) NOT actual project names
- Patterns MUST be applicable to any similar technology stack
- Avoid referencing specific file paths from the current project
- Focus on the **underlying principle**, not the specific instance

### Analysis Process

1. **Review the conversation** for:
   - Tasks that took multiple attempts to complete
   - TypeScript/lint errors that required investigation
   - Misunderstandings about API patterns or conventions
   - Missing information that caused delays
   - Workarounds or patterns that worked well

2. **Categorize issues** by which workflow they relate to:
   - `theplant.openapi-first.md` - API generation, Orval hooks, type mismatches
   - `theplant.e2e-testing.md` - Playwright tests, MSW handlers, test patterns
   - `theplant.msw-mock-backend.md` - Mock data, localStorage, API mocking
   - `theplant.root-cause-tracing.md` - Debugging strategies, investigation patterns
   - `theplant.system-exploration.md` - Understanding data flow, tracing paths
   - `theplant.test-data-seeding.md` - Test data patterns, Zustand stores
   - `theplant.reference-ui.md` - UI patterns, component design
   - **OR** identify if a new workflow is needed for a distinct discipline

3. **Decide: Update or Create**:
   - **Update existing workflow** if the learning fits within an existing discipline
   - **Create new workflow** if the learning represents a new, distinct discipline that:
     - Doesn't fit naturally into existing workflows
     - Addresses a recurring pattern across multiple projects
     - Has enough depth to warrant its own workflow file
     - Follows the naming convention: `theplant.[discipline-name].md`

4. **Formulate updates/new content** that are:
   - Clear and actionable
   - Include both the problem pattern AND the solution
   - Provide code examples where helpful (using generic names)
   - Add to existing sections rather than creating redundant content
   - For new workflows, follow the standard structure (see Example New Workflow below)

## Execution Steps

### Step 1: Identify Issues from Conversation

Analyze the current conversation and list:

```markdown
## Issues Identified

### Issue 1: [Brief description]
- **What happened**: [Description of the problem]
- **Root cause**: [Why it happened]
- **Solution applied**: [How it was fixed]
- **Generalized learning**: [What should be documented]
- **Target workflow**: [Which theplant.*.md file to update]

### Issue 2: ...
```

### Step 2: Review Target Workflows

For each target workflow identified:
1. Read the current content of the workflow file
2. Identify the appropriate section to add the learning
3. Check if similar guidance already exists (avoid duplication)

### Step 3: Propose Updates or New Workflows

For each update to existing workflow, show:
- The target file
- The section to update
- The proposed addition (generalized, not project-specific)

For each new workflow, show:
- The proposed filename: `theplant.[discipline-name].md`
- The complete workflow content following the standard structure
- Rationale for why this needs to be a separate workflow

### Step 4: Apply Updates

Apply the updates to existing workflow files or create new workflow files.

## Example Issue Analysis

### Example: Enum Migration Issues

**What happened**: When migrating from manual types to Orval-generated types, enum values had different naming conventions (e.g., `Status.ACTIVE` vs `Status.STATUS_ACTIVE`).

**Root cause**: Orval generates enum values with full prefixes based on the OpenAPI spec, while manual types often use short names.

**Solution applied**: Systematically replaced all short enum names with full Orval-generated names using grep and replace_all.

**Generalized learning**: Document the enum naming pattern difference and provide a migration checklist.

**Target workflow**: `theplant.openapi-first.md`

**Proposed update** (generalized):
```markdown
### Enum Migration Pattern

When migrating from manual types to Orval-generated types:
- Manual: `EntityStatus.ACTIVE`
- Orval: `EntityStatus.ENTITY_STATUS_ACTIVE`

Use grep to find all usages:
```bash
grep -rn "EntityStatus\." src/ --include="*.tsx" --include="*.ts"
```
```

## Common Issue Categories

### API/Type Issues → `theplant.openapi-first.md`
- Type mismatches between manual and generated types
- Hook interface differences (e.g., mutation argument structure)
- Response wrapper patterns (AxiosResponse)
- Enum naming conventions

### Testing Issues → `theplant.e2e-testing.md`
- Selector strategies that failed
- Timing/flakiness patterns
- Console error handling
- Test data setup problems

### Mock Backend Issues → `theplant.msw-mock-backend.md`
- Handler patterns that didn't work
- Data persistence issues
- Request/response format mismatches

### Debugging Issues → `theplant.root-cause-tracing.md`
- Investigation strategies that worked
- Common false leads to avoid
- Effective logging patterns

## Example New Workflow Structure

When creating a new ThePlant workflow, follow this structure:

```markdown
---
description: [One-line description of the discipline]
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

[Clear statement of what this workflow helps achieve]

## Rationale ([DISCIPLINE-NAME])

[Why this discipline is important and how it improves development]

## Core Principles (NON-NEGOTIABLE)

### [Principle Name] (NON-NEGOTIABLE)

- [Specific requirements and rules]
- [More requirements]

## [Process/Steps Section]

[Detailed guidance on how to apply this discipline]

## AI Agent Requirements

- [Specific requirements for AI agents using this workflow]
```

## AI Agent Requirements

- AI agents MUST automatically run this workflow after completing complex tasks with multiple issues or blockers
- AI agents SHOULD detect when a task required multiple attempts, debugging sessions, or workarounds
- AI agents MUST run this workflow when explicitly requested by the user
- AI agents MUST NOT add project-specific content to workflows
- AI agents MUST verify updates don't duplicate existing content
- AI agents MUST generalize all learnings before adding to workflows
- When creating new workflows, AI agents MUST follow the standard structure and naming convention
- AI agents MUST propose updates/new workflows before applying them
