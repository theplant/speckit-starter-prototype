---
description: Apply OpenAPI-First API Architecture - define API spec before implementation, generate types and React Query hooks with Orval, use generated hooks for all data access.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Ensure all API development follows OpenAPI-First principles. Define the API contract before implementation, generate TypeScript types and React Query hooks using Orval, and use generated hooks for all data access.

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:
- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.openapi-first
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.



## Steps

### Step 1: Install Orval

**Why:** Orval generates TypeScript types and React Query hooks from OpenAPI spec, ensuring type safety and eliminating manual API code.

```bash
pnpm add -D orval
```

### Step 2: Create `orval.config.ts`

**Why:** This configuration tells Orval where to find the OpenAPI spec and where to output generated code. Setting `mock: false` ensures we use MSW with localStorage instead of faker.js.

Create `orval.config.ts` at project root:

```typescript
import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    output: {
      mode: 'tags-split',
      target: 'src/api/generated/endpoints',
      schemas: 'src/api/generated/models',
      client: 'react-query',
      mock: false,  // IMPORTANT: Do NOT use faker.js mocks - use MSW with localStorage instead
      baseUrl: '/api',
    },
    input: {
      target: './src/api/openapi.yaml',
    },
  },
})
```

### Step 3: Add Scripts to `package.json`

**Why:** A single command to regenerate types ensures consistency. Run this after any OpenAPI spec change.

```json
{
  "scripts": {
    "api:generate": "orval"
  }
}
```

### Step 4: Create `src/api/openapi.yaml`

**Why:** The OpenAPI spec is the single source of truth for API contracts. It enables code generation for both frontend (Orval) and backend (oapi-codegen), ensuring type safety across the stack.

Create the OpenAPI specification file.


**OpenAPI Spec Requirements:**
- Every endpoint MUST have `operationId` (Orval uses this to generate hook names)
- All request/response schemas MUST be defined in `components/schemas`
- The spec MUST be complete enough to hand to backend developers

### Step 5: Generate TypeScript Types and Hooks

**Why:** Generated code is always in sync with the API contract. Manual edits to generated files will be overwritten.

```bash
pnpm api:generate
```

This generates:
- `src/api/generated/models/` - TypeScript interfaces
- `src/api/generated/endpoints/` - React Query hooks

**NEVER edit files in `src/api/generated/`**

### Step 6: Create `src/api/custom-fetch.ts`

**Why:** Custom fetch wrapper enables consistent error handling, auth headers, and logging across all API calls.

For custom fetch logic (auth headers, error handling):

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const customFetch = async <T>(
  url: string,
  options: RequestInit
): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      errorBody.error?.code || 'UNKNOWN_ERROR',
      errorBody.error?.message || `HTTP ${response.status}`,
      errorBody.error?.details
    )
  }
  
  return response.json()
}
```

Then update `orval.config.ts`:

```typescript
override: {
  mutator: {
    path: './src/api/custom-fetch.ts',
    name: 'customFetch',
  },
},
```


### Step 7: Migrate Components to Use Orval Hooks

**Why:** Orval hooks have different interfaces than manual hooks. Systematic migration ensures all components use the correct patterns. Additional features like toast notifications should be added inside components, not in wrapper hooks.

<!-- runner:loop:FILE -->
```bash
grep -rln "from '@/services/\|from '@/hooks/use-\|from '@/types/" src/ --include="*.ts" --include="*.tsx" | grep -v generated | grep -v node_modules
```

**Refactor `$FILE`:**

MANDATORY: Replace all manual API code with Orval hooks. Never Give up with /theplant.root-cause-tracing.md

1. **Replace imports:**
```typescript
// ❌ BEFORE
import { workflowService } from '@/services/workflow-api';
import { useWorkflows } from '@/hooks/use-workflows';
import type { Workflow } from '@/types/workflow';
import { WorkflowStatus } from '@/types/workflow';

// ✅ AFTER
import { useListWorkflows, useCreateWorkflow } from '@/api/generated/endpoints/workflows/workflows';
import type { Workflow } from '@/api/generated/models';
import { WorkflowStatus } from '@/api/generated/models';
```

2. **Update enum values (Orval uses full prefixes):**
```typescript
// ❌ BEFORE
WorkflowStatus.DRAFT
TriggerType.MANUAL

// ✅ AFTER
WorkflowStatus.WORKFLOW_STATUS_DRAFT
TriggerType.TRIGGER_TYPE_MANUAL
```

3. **Update mutation calls (Orval wraps body in `{ data: ... }`):**
```typescript
// ❌ BEFORE
createMutation.mutate({ name: 'New' });

// ✅ AFTER
createMutation.mutate({ data: { name: 'New' } });
```


4. Run `pnpm tsc --noEmit` after each file.

### Step 8: Delete Manual Code Files

**Why:** Keeping manual files causes confusion and potential import conflicts. Delete them after migration is complete.

```bash
rm -f src/services/*-api.ts
rm -f src/hooks/use-workflows.ts  # Keep non-API hooks like use-mobile.ts
rm -f src/types/workflow.ts
```

### Step 9: Final Verification

**Why:** Verify that all manual API code has been replaced and the project compiles without errors.

```bash
# 1. No manual API imports
grep -rn "from '@/services/\|from '@/hooks/use-workflows\|from '@/types/workflow'" src/ --include="*.ts" --include="*.tsx" && echo "FAIL" || echo "PASS"

# 2. TypeScript compiles
pnpm tsc --noEmit

# 3. Tests pass
pnpm test:e2e
```
