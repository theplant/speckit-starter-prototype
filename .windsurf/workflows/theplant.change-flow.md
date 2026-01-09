---
description: Enforce spec → plan → OpenAPI → MSW → E2E → implementation → quality-gates change workflow for every new modification.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Provide a repeatable workflow that keeps **spec.md**, **plan.md**, **openapi.yaml**, **MSW mock backend**, and **E2E tests** consistent for every change, and finishes with all tests + quality gates passing.

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:

- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.change-flow
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Steps

### Step 1: Decide whether to update `spec.md` and/or `plan.md`

**IMPORTANT: Read and follow ALL rules in this step before updating any files.**

#### Critical Rules (NON-NEGOTIABLE)

1. **Spec/Plan come first**
   - If behavior, scope, user flows, permissions, entities, constraints changed → update `spec.md` first.
   - If architecture, libraries, folder layout, scripts, verification strategy changed → update `plan.md`.

2. **Use `.specify/scripts/bash/check-prerequisites.sh` to locate files**
   - Always derive the spec/plan paths from the script output, not by guessing.

3. **Follow existing update rules**
   - `spec.md` update rules must follow `.windsurf/workflows/speckit.specify.md`.
   - `plan.md` update rules must follow `.windsurf/workflows/speckit.plan.md`.

4. **Do not skip downstream synchronization**
   - If `spec.md` / `plan.md` changes imply API/contract changes → you MUST update `openapi.yaml`.
   - If `openapi.yaml` changes → you MUST update MSW handlers.
   - If `spec.md` / `plan.md` / `openapi.yaml` changes affect user journeys → you MUST add/update E2E tests.

#### 1.1 Get paths (MUST)

From repo root:

```bash
# Required by this workflow (feature directory + document availability)
.specify/scripts/bash/check-prerequisites.sh --json

# Also get explicit paths for spec/plan/tasks (still uses the same script)
.specify/scripts/bash/check-prerequisites.sh --json --paths-only
```

From the `--json --paths-only` output, read:

- `FEATURE_SPEC` → the feature's `spec.md`
- `IMPL_PLAN` → the feature's `plan.md`
- `FEATURE_DIR` → directory containing design artifacts

Define:

- `OPENAPI_SPEC="src/api/openapi.yaml"`

#### 1.2 Decide if `spec.md` needs an update

Update `spec.md` when user input implies any of the following changed:

- **User scenarios**
  - New/removed/changed acceptance scenarios
  - New pages, dialogs, or flows
- **Functional requirements**
  - New/changed permissions required
  - New validation rules
  - New error cases / edge cases
  - Auth/session behavior changes
- **Domain model**
  - New/changed entities, fields, relationships

If a `spec.md` update is needed:

- Update it using the structure discipline described in `speckit.specify.md`.
- Ensure requirements remain **testable** and **unambiguous**.

#### 1.3 Decide if `plan.md` needs an update

Update `plan.md` when user input implies any of the following changed:

- **Technical choices** (libraries, frameworks, storage strategy)
- **Project structure** (paths, ownership boundaries)
- **Contract/tooling pipeline** (OpenAPI generation, Orval setup, scripts)
- **Testing strategy** (what must be covered in E2E, what needs seeding)

If a `plan.md` update is needed:

- Keep it aligned with the latest `spec.md`.
- Follow the planning discipline in `speckit.plan.md`.

---

### Step 2: Decide whether to update `openapi.yaml` (OpenAPI-first)

<!-- runner:workflow:theplant.openapi-first -->

---

### Step 3: Decide whether to update MSW mock backend

<!-- runner:workflow:theplant.msw-mock-backend -->

---

### Step 4: Decide whether to add/update E2E tests

<!-- runner:workflow:theplant.e2e-testing -->

---

### Step 5: Implement changes and make tests pass

<!-- runner:workflow:theplant.root-cause-tracing -->

---

### Step 6: Run quality gates (final)

<!-- runner:workflow:theplant.quality-gates -->
