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

## Rationale (OPENAPI-FIRST)

By using Orval with MSW, the prototype behaves identically to a production app with a real backend. Code generation ensures types and hooks stay in sync with the API contract. Orval provides compile-time type safety for all API calls and generates React Query hooks automatically. This eliminates the common problem of prototypes that "work" but require complete rewrites when connecting to real APIs.

## Core Principles (NON-NEGOTIABLE)

### OpenAPI Specification Requirements (OPENAPI-FIRST)

- An OpenAPI 3.0+ spec MUST be defined in `src/api/openapi.yaml` (or `.json`)
- All API endpoints MUST be documented in the OpenAPI spec before implementation
- Request/response schemas MUST be defined in the OpenAPI spec
- The spec MUST be complete enough to hand to backend developers for implementation
- The spec is the **single source of truth** for API contracts

### Code Generation with Orval (NON-NEGOTIABLE)

- TypeScript types and React Query hooks MUST be generated from OpenAPI spec using `orval`
- Install: `pnpm add -D orval`
- Generated files MUST be in `src/api/generated/` directory
- **AI agents MUST NOT directly edit files in `src/api/generated/`** - regenerate from OpenAPI spec instead
- Run `pnpm api:generate` after any OpenAPI spec changes

### Orval Output Structure

- `src/api/generated/models/` - TypeScript interfaces for all schemas
- `src/api/generated/endpoints/` - React Query hooks and fetch functions
- MSW handlers are manually written in `src/mocks/handlers.ts` (NOT generated)

### HTTP Fetch Pattern (NON-NEGOTIABLE)

- Frontend code MUST use Orval-generated hooks/functions for all data operations
- Generated code uses proper HTTP methods (GET, POST, PUT, DELETE) automatically
- Generated code uses proper URL paths matching OpenAPI spec automatically
- NO direct localStorage access from React components - all data MUST flow through generated API client

### Backend Code Generation (Go Projects)

For Go backend projects, the same OpenAPI spec can generate server code:

- Use `oapi-codegen` (github.com/oapi-codegen/oapi-codegen) for Go type and server generation
- Generated `StrictServerInterface` provides type-safe request/response handling
- Backend implements the generated interface directly (NO separate service interface)

## Prerequisites

Before defining the OpenAPI spec, AI agents MUST run `/theplant.system-exploration` to understand:
- What routes exist in the application
- What API endpoints each route calls
- What data entities are used
- What CRUD operations are needed

This ensures the OpenAPI spec covers all actual API usage in the codebase.

## Execution Steps

### 0. System Exploration (NON-NEGOTIABLE)

Before writing or updating the OpenAPI spec, AI agents MUST:

1. **Run `/theplant.system-exploration`** to trace all routes and their API calls
2. **Document all API endpoints** discovered during exploration
3. **Identify any manually-written API calls** that should use Orval-generated hooks instead

```bash
# List all route files
find src/routes -name "*.tsx" | head -50

# Search for manual fetch/axios calls that should be replaced
grep -r "fetch\(" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v generated
grep -r "axios\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v generated

# Search for manual React Query hooks that should be replaced with Orval
grep -r "useQuery\|useMutation" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v generated
```

**If manual API calls are found**, they MUST be:
1. Added to the OpenAPI spec
2. Regenerated with Orval
3. Replaced with Orval-generated hooks

### 1. Setup Orval

```bash
# Install orval
pnpm add -D orval
```

### 2. Create Orval Configuration

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
      mock: false,  // IMPORTANT: Do NOT use faker.js mocks
      baseUrl: '/api',
    },
    input: {
      target: './src/api/openapi.yaml',
    },
  },
})
```

Add npm script to `package.json`:

```json
{
  "scripts": {
    "api:generate": "orval"
  }
}
```

### 3. Define OpenAPI Specification

Create or update `src/api/openapi.yaml`:

```yaml
openapi: 3.0.3
info:
  title: Application API
  version: 1.0.0
paths:
  /api/v1/users:
    get:
      operationId: listUsers
      tags:
        - users
      summary: List all users
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ListUsersResponse'
    post:
      operationId: createUser
      tags:
        - users
      summary: Create a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: Created user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserItemResponse'
components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - name
      properties:
        id:
          type: string
        email:
          type: string
        name:
          type: string
        createdAt:
          type: string
          format: date-time
    ListUsersResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        meta:
          $ref: '#/components/schemas/PaginationMeta'
    UserItemResponse:
      type: object
      properties:
        data:
          $ref: '#/components/schemas/User'
    CreateUserRequest:
      type: object
      required:
        - email
        - name
      properties:
        email:
          type: string
        name:
          type: string
    PaginationMeta:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
```

### 3.1. Validate OpenAPI Specification

Before generating code, validate the OpenAPI spec to catch errors early:

```bash
# Install OpenAPI validator
pnpm add -D @redocly/openapi-cli

# Add validation script to package.json
{
  "scripts": {
    "api:validate": "openapi lint src/api/openapi.yaml",
    "api:generate": "pnpm api:validate && orval"
  }
}

# Run validation
pnpm api:validate
```

Common validation errors to fix:
- Missing `operationId` (required for Orval to generate hook names)
- Undefined schema references in `$ref`
- Missing required fields in request/response schemas
- Invalid HTTP status codes
- Duplicate operationIds across endpoints

### 4. Generate TypeScript Types and Hooks

```bash
pnpm api:generate
```

This generates:
- `src/api/generated/models/` - TypeScript interfaces
- `src/api/generated/endpoints/users/` - `useListUsers`, `useCreateUser`, etc.

### 5. Use Generated Hooks in Components

```typescript
// Import generated hooks directly
import {
  useListUsers,
  useGetUser,
  useCreateUser,
} from '@/api/generated/endpoints/users'

function UserList() {
  const { data, isLoading, error } = useListUsers()
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <ul>
      {data?.data?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}

function CreateUserForm() {
  const createUser = useCreateUser()
  
  const handleSubmit = (data: CreateUserRequest) => {
    createUser.mutate({ data })
  }
  
  // ...
}
```

### 5.1. Query Parameters and Filtering

Define query parameters in OpenAPI spec:

```yaml
paths:
  /api/v1/users:
    get:
      operationId: listUsers
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [active, inactive]
        - name: search
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
```

Orval generates hooks with typed parameters:

```typescript
import { useListUsers } from '@/api/generated/endpoints/users'

function UserList() {
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [search, setSearch] = useState('')
  
  // Orval hook accepts params object with type safety
  const { data, isLoading } = useListUsers({
    status,
    search,
    page: 1,
    limit: 20,
  })
  
  // ...
}
```

### 5.2. Pagination Patterns

**Consistent pagination structure** across all list endpoints:

```yaml
components:
  schemas:
    PaginationMeta:
      type: object
      required:
        - page
        - limit
        - total
        - totalPages
      properties:
        page:
          type: integer
          minimum: 1
        limit:
          type: integer
          minimum: 1
          maximum: 100
        total:
          type: integer
          minimum: 0
        totalPages:
          type: integer
          minimum: 0
    
    # Generic list response pattern
    UserListResponse:
      type: object
      required:
        - data
        - meta
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        meta:
          $ref: '#/components/schemas/PaginationMeta'
```

Component usage with pagination:

```typescript
import { useListUsers } from '@/api/generated/endpoints/users'

function PaginatedUserList() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useListUsers({ page, limit: 20 })
  
  const users = data?.data?.data || []
  const meta = data?.data?.meta
  
  return (
    <>
      <UserTable users={users} />
      {meta && (
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </>
  )
}
```

### 6. Custom Fetch Wrapper (Optional)

For custom fetch logic (auth headers, error handling), use Orval's mutator option:

```typescript
// orval.config.ts
export default defineConfig({
  api: {
    output: {
      // ... other options
      override: {
        mutator: {
          path: './src/api/custom-fetch.ts',
          name: 'customFetch',
        },
      },
    },
    // ...
  },
})
```

```typescript
// src/api/custom-fetch.ts
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
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}
```

### 6.1. Error Handling Patterns

Extend custom fetch wrapper with comprehensive error handling:

```typescript
// src/api/custom-fetch.ts
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
  try {
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
  } catch (error) {
    if (error instanceof ApiError) throw error
    
    // Network errors, timeouts, etc.
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    )
  }
}
```

Handle errors in components:

```typescript
import { useCreateUser } from '@/api/generated/endpoints/users'
import { ApiError } from '@/api/custom-fetch'
import { toast } from 'sonner'

function CreateUserForm() {
  const createMutation = useCreateUser({
    mutation: {
      onError: (error) => {
        if (error instanceof ApiError) {
          switch (error.code) {
            case 'VALIDATION_ERROR':
              toast.error('Invalid input: ' + error.message)
              break
            case 'DUPLICATE_EMAIL':
              toast.error('Email already exists')
              break
            default:
              toast.error('Failed to create user')
          }
        } else {
          toast.error('Network error')
        }
      },
    },
  })
}
```

### 7. Verify Types Are Up-to-Date

```bash
# Regenerate types and check for changes
pnpm api:generate

# Type check the project
pnpm tsc --noEmit
```

### 7.1. TypeScript Configuration for Orval

Recommended `tsconfig.json` settings for optimal type safety:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,  // Orval generates optional fields
    "skipLibCheck": true  // Skip checking generated .d.ts files for performance
  }
}
```

**Handle optional fields from generated types:**

```typescript
import type { User } from '@/api/generated/models'

function UserProfile({ user }: { user: User }) {
  // ✅ CORRECT: Check optional fields before use
  const displayName = user.displayName ?? user.name
  const avatar = user.avatarUrl ?? '/default-avatar.png'
  
  // ❌ WRONG: Assuming optional field exists
  const initials = user.displayName.substring(0, 2)  // Type error if displayName is optional
}
```

## MSW Integration with Orval (NON-NEGOTIABLE)

- Orval config MUST set `mock: false` - faker.js mock data is NOT used
- **All data MUST come from localStorage** - this is the only data source for clickable prototypes
- MSW handlers MUST be manually written in `src/mocks/handlers.ts` using `http` from msw
- Handlers MUST import types from orval-generated models for type safety

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import { storage, STORAGE_KEYS } from '@/lib/storage'
// Import types from orval-generated models for type safety
import type {
  ListUsersResponse,
  UserItemResponse,
  User,
} from '@/api/generated/models'

export const handlers = [
  // GET /api/v1/users - read from localStorage
  http.get('/api/v1/users', () => {
    const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
    return HttpResponse.json<ListUsersResponse>({
      data: users,
      meta: { page: 1, limit: 20, total: users.length, totalPages: 1 },
    })
  }),

  // GET /api/v1/users/:userId - read from localStorage
  http.get('/api/v1/users/:userId', ({ params }) => {
    const { userId } = params
    const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
    const user = users.find((u) => u.id === userId)
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }
    return HttpResponse.json<UserItemResponse>({ data: user })
  }),

  // POST /api/v1/users - persist to localStorage
  http.post('/api/v1/users', async ({ request }) => {
    const body = await request.json()
    const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
    const newUser = {
      id: `user-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    }
    storage.set(STORAGE_KEYS.USERS, [...users, newUser])
    return HttpResponse.json<UserItemResponse>(
      { data: newUser },
      { status: 201 }
    )
  }),
]
```

**Key principle**: Orval generates types and React Query hooks; MSW handlers use localStorage for data.

## Code Organization

```
src/api/
├── openapi.yaml              # OpenAPI 3.0+ specification (source of truth)
├── generated/                # Generated files - DO NOT EDIT
│   ├── models/               # Generated TypeScript interfaces
│   │   ├── index.ts
│   │   └── ...
│   └── endpoints/            # Generated React Query hooks
│       ├── users/            # useListUsers, useGetUser, etc.
│       └── ...
├── custom-fetch.ts           # Optional custom fetch wrapper
orval.config.ts               # Orval configuration (at project root)
```

## Backend Migration Path

To migrate to real backend:
1. Disable MSW (remove initialization from `main.tsx`)
2. Update `baseUrl` in `orval.config.ts` and regenerate
3. No frontend code changes required beyond configuration
4. Backend team receives complete OpenAPI spec with all endpoints documented
5. Backend implements using oapi-codegen (Go) or equivalent code generator
6. Both frontend and backend use the same OpenAPI spec as source of truth

## Quality Gates

- Generated types MUST be up-to-date (`pnpm api:generate` produces no changes)
- Type checking MUST pass (`tsc --noEmit`)
- AI agents MUST NOT edit files in `src/api/generated/`
- All API calls MUST use the generated hooks
- OpenAPI spec MUST be validated before code generation
- MSW handler paths MUST match OpenAPI spec paths exactly

## Common Pitfalls When Refactoring to OpenAPI-First

### Orval Does NOT Generate Zod Schemas

Orval generates TypeScript types and React Query hooks, but NOT Zod schemas. If existing code uses Zod schemas for validation:

```typescript
// ❌ WRONG: Importing non-existent Zod schema from generated models
import { taskSchema } from '@/api/generated/models'
const task = taskSchema.parse(row.original)  // Runtime error!

// ✅ CORRECT: Use TypeScript type and trust the data
import type { Task } from '@/api/generated/models'
const task = row.original as Task  // Or just use row.original directly
```

### Type-Only Imports for Generated Models

When importing from generated models, prefer `import type` to make it clear these are types, not runtime values:

```typescript
// ✅ GOOD: Clear that this is a type import
import type { User, Task, App } from '@/api/generated/models'

// ⚠️ ACCEPTABLE: Works but less clear
import { User, Task, App } from '@/api/generated/models'

// ❌ BAD: Trying to import runtime values that don't exist
import { userSchema, taskSchema } from '@/api/generated/models'  // These don't exist!
```

### Verify Imports After Refactoring

After switching from local schemas to generated types, run TypeScript check to catch missing exports:

```bash
# ALWAYS run after refactoring imports
pnpm tsc --noEmit

# If you see "does not provide an export named 'X'" errors:
# 1. Check what's actually exported: cat src/api/generated/models/index.ts
# 2. Use type imports only, not runtime values
# 3. Remove any Zod schema imports - they don't exist in generated code
```

## AI Agent Requirements

- AI agents MUST check if OpenAPI spec exists before generating code
- AI agents MUST regenerate types whenever OpenAPI files change
- AI agents MUST use generated hooks (NO manual React Query hooks for API data)
- AI agents MUST import types from `@/api/generated/models` for MSW handlers
- AI agents MUST verify MSW handlers match OpenAPI spec
- AI agents MUST apply Root Cause Tracing (ROOT-CAUSE-TRACING) when debugging type mismatches
- When OpenAPI spec changes, AI agents MUST run `pnpm api:generate` then update MSW handlers to match

### Migration Difficulty - Root Cause Tracing (NON-NEGOTIABLE)

When migrating existing code to use Orval-generated hooks and encountering significant difficulties:

1. **DO NOT give up or revert to manual hooks/types**
2. **Apply `/theplant.root-cause-tracing` workflow** to systematically trace the issue
3. **Common migration issues and their root causes:**
   - **Enum name mismatches**: Orval generates full names like `WORKFLOW_STATUS_DRAFT` instead of `DRAFT`. Fix ALL references.
   - **Hook interface changes**: Orval hooks expect `{ data: RequestType }` wrapper. Update all mutation calls.
   - **Response type changes**: Orval hooks return `AxiosResponse<T>`, access `.data` to get the actual data.
   - **Type incompatibilities**: Generated types may have optional fields where manual types had required fields. Add null checks.

4. **Systematic approach:**
   ```bash
   # Find all enum usages that need updating
   grep -rn "TriggerType\.\|WorkflowStatus\.\|StepType\." src/ --include="*.tsx" --include="*.ts"
   
   # Find all imports from deleted files
   grep -rn "from '@/types/workflow'\|from '@/hooks/use-workflows'\|from '@/services/" src/
   
   # Run TypeScript check to see all errors
   pnpm tsc --noEmit 2>&1 | head -100
   ```

5. **Fix pattern for enum migrations:**
   - `TriggerType.MANUAL` → `TriggerType.TRIGGER_TYPE_MANUAL`
   - `WorkflowStatus.DRAFT` → `WorkflowStatus.WORKFLOW_STATUS_DRAFT`
   - `StepType.ACTIVITY` → `StepType.STEP_TYPE_ACTIVITY`
   - `ActivityCategory.DATA` → `ActivityCategory.ACTIVITY_CATEGORY_DATA`
   - `ComparisonOperator.EQUALS` → `ComparisonOperator.COMPARISON_OPERATOR_EQUALS`

6. **Persist until all tests pass** - run `pnpm tsc --noEmit` and `pnpm test:e2e` after each batch of fixes

## Frontend Component Requirements (NON-NEGOTIABLE)

### Orval-Generated Hooks Usage

**All frontend components MUST use Orval-generated React Query hooks directly.** Manual API service files and custom hooks that wrap fetch/axios are FORBIDDEN.

#### Required Pattern

```typescript
// ✅ CORRECT: Import directly from Orval-generated endpoints
import { useListWorkflows, useCreateWorkflow } from '@/api/generated/endpoints/workflows/workflows';
import { useListUsers } from '@/api/generated/endpoints/users/users';
import type { Workflow, User } from '@/api/generated/models';

function MyComponent() {
  // Use Orval hooks directly - they return AxiosResponse<T>
  const { data, isLoading } = useListWorkflows();
  const workflows = data?.data; // Access .data from AxiosResponse
  
  const createMutation = useCreateWorkflow();
  // Mutation expects { data: CreateWorkflowRequest }
  createMutation.mutate({ data: { name: 'New Workflow', triggerType: 'TRIGGER_TYPE_MANUAL' } });
}
```

#### Forbidden Patterns

```typescript
// ❌ FORBIDDEN: Manual service files with fetch/axios
import { workflowService } from '@/services/workflow-api';

// ❌ FORBIDDEN: Custom wrapper hooks around manual services
import { useWorkflows, useCreateWorkflow } from '@/hooks/use-workflows';

// ❌ FORBIDDEN: Manual types instead of generated ones
import type { Workflow } from '@/types/workflow';
```

#### Adding Toast Notifications and Cache Invalidation

Components that need toast notifications or cache invalidation should handle them directly in the component:

```typescript
// ✅ CORRECT: Handle side effects in the component
import { useCreateWorkflow, getListWorkflowsQueryKey } from '@/api/generated/endpoints/workflows/workflows';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function CreateWorkflowButton() {
  const queryClient = useQueryClient();
  const createMutation = useCreateWorkflow({
    mutation: {
      onSuccess: (response) => {
        queryClient.invalidateQueries({ queryKey: getListWorkflowsQueryKey() });
        toast.success('Workflow created successfully');
      },
      onError: () => {
        toast.error('Failed to create workflow');
      },
    },
  });

  return (
    <Button onClick={() => createMutation.mutate({ data: { name: 'New', triggerType: 'TRIGGER_TYPE_MANUAL' } })}>
      Create
    </Button>
  );
}
```

### Type Imports

**All types MUST come from `@/api/generated/models`:**

```typescript
// ✅ CORRECT: Import types from generated models
import type { 
  Workflow, 
  WorkflowStatus, 
  TriggerType,
  CreateWorkflowRequest,
  ListWorkflowsResponse,
} from '@/api/generated/models';

// ✅ CORRECT: Import const enums for runtime use
import { WorkflowStatus, TriggerType } from '@/api/generated/models';

// ❌ FORBIDDEN: Manual type definitions
import type { Workflow } from '@/types/workflow';
```

### Utility Functions

For utility functions like `getWorkflowStatusLabel()` or `getWorkflowStatusVariant()`, define them in a separate utils file that imports from generated models:

```typescript
// src/features/workflows/utils/workflow-utils.ts
import { WorkflowStatus, TriggerType } from '@/api/generated/models';

export function getWorkflowStatusLabel(status: WorkflowStatus): string {
  switch (status) {
    case WorkflowStatus.WORKFLOW_STATUS_DRAFT: return 'Draft';
    case WorkflowStatus.WORKFLOW_STATUS_ACTIVE: return 'Active';
    case WorkflowStatus.WORKFLOW_STATUS_PAUSED: return 'Paused';
    case WorkflowStatus.WORKFLOW_STATUS_ARCHIVED: return 'Archived';
    default: return 'Unknown';
  }
}

export function getWorkflowStatusVariant(status: WorkflowStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case WorkflowStatus.WORKFLOW_STATUS_DRAFT: return 'secondary';
    case WorkflowStatus.WORKFLOW_STATUS_ACTIVE: return 'default';
    case WorkflowStatus.WORKFLOW_STATUS_PAUSED: return 'outline';
    case WorkflowStatus.WORKFLOW_STATUS_ARCHIVED: return 'destructive';
    default: return 'secondary';
  }
}
```

### Migration Checklist

When migrating existing code or writing new features:

1. **Delete manual files:**
   - `src/services/*-api.ts` (manual fetch services)
   - `src/hooks/use-*.ts` (manual React Query hooks)
   - `src/types/*.ts` (manual type definitions)

2. **Update imports in components:**
   - Replace `@/services/*` → use Orval-generated hooks directly
   - Replace `@/hooks/*` → use Orval-generated hooks directly
   - Replace `@/types/*` → `@/api/generated/models`

3. **Handle side effects in components:**
   - Toast notifications → use `onSuccess`/`onError` callbacks
   - Cache invalidation → use `queryClient.invalidateQueries()`

4. **Update MSW handlers:**
   - Import types from `@/api/generated/models`
   - Ensure handler responses match generated types exactly

5. **Verify with TypeScript:**
   ```bash
   pnpm tsc --noEmit
   ```

6. **Run E2E tests:**
   ```bash
   pnpm test:e2e
   ```

## Context

$ARGUMENTS
