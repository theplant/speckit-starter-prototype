---
description: Generate or update OpenAPI spec from spec.md and plan.md following RESTful API Design Guidelines - ensure API contracts match feature specifications.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Generate or update the OpenAPI specification (`openapi.yaml`) based on feature specifications (`spec.md`) and implementation plans (`plan.md`), ensuring full compliance with the team's RESTful API Design Guidelines.

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:

- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.openapi-spec-generation
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Steps

### Step 1: Read API Design Guidelines and Feature Specs

**IMPORTANT: Read and follow ALL rules in this step before proceeding.**

#### Critical Rules for OpenAPI Generation

1. **Identify feature spec and plan files**:
```bash
# Find spec.md and plan.md files
find specs/ -name "spec.md" -o -name "plan.md" 2>/dev/null | head -20
```

2. **Read the feature specification and plan**:
```bash
# Read the relevant spec.md
cat specs/[feature-name]/spec.md

# Read the relevant plan.md
cat specs/[feature-name]/plan.md
```

3. **Extract API requirements from specs**:
   - Identify all resources mentioned in the spec
   - Identify CRUD operations needed
   - Identify custom actions (non-CRUD operations)
   - Identify relationships between resources
   - Identify pagination requirements (offset-based vs cursor-based)

### Step 2: Locate Existing OpenAPI Spec

**Why:** Determine whether to create a new spec or update an existing one.

```bash
# Check for existing orval.config.ts to find spec location
cat orval.config.ts 2>/dev/null | grep -A5 "input:"

# Or find existing OpenAPI spec files
find . -name "openapi.yaml" -o -name "openapi.json" 2>/dev/null | grep -v node_modules | head -10
```

Decision matrix:

| Existing Spec | Action |
|---------------|--------|
| Found at configured path | **UPDATE** existing spec with new endpoints |
| Not found | **CREATE** new spec at `src/api/openapi.yaml` |

### Step 3: Generate/Update OpenAPI Spec Following Guidelines

**Why:** The OpenAPI spec must strictly follow the API Design Guidelines to ensure consistency across the team.

#### 3.1 Basic Structure (MUST follow)

```yaml
openapi: 3.0.3
info:
  title: [Project Name] API
  version: 1.0.0
  description: API for [project description]
servers:
  - url: /api/v1
    description: API v1
```

#### 3.2 Naming Conventions (MUST follow)

| Element | Convention | Example |
|---------|------------|---------|
| **Path** | Plural nouns, lowercase, kebab-case | `/users`, `/order-items` |
| **Field names** | camelCase | `firstName`, `createdAt` |
| **operationId** | camelCase verb + resource | `listUsers`, `createUser`, `getUser` |
| **Schema names** | PascalCase | `User`, `OrderItem` |
| **Enum values** | lowercase or kebab-case | `pending`, `in-progress` |

#### 3.3 Standard CRUD Operations (MUST follow)

For each resource, define these standard operations:

```yaml
paths:
  /resources:
    get:
      operationId: listResources
      summary: List resources
      # ... pagination parameters
    post:
      operationId: createResource
      summary: Create a resource
      # ... request body

  /resources/{id}:
    get:
      operationId: getResource
      summary: Get a resource by ID
    patch:
      operationId: updateResource
      summary: Update a resource
    delete:
      operationId: deleteResource
      summary: Delete a resource
```

#### 3.4 Pagination (MUST choose one per endpoint)

**Offset-based pagination** (for admin lists, random page jumps):

```yaml
parameters:
  - in: query
    name: page
    schema: { type: integer, minimum: 1, default: 1 }
    description: Page number (1-indexed)
  - in: query
    name: limit
    schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
    description: Items per page
  - in: query
    name: sort
    schema: { type: string, default: "-createdAt" }
    description: Sort field(s). `-` = descending

# Response meta:
components:
  schemas:
    OffsetPaginationMeta:
      type: object
      properties:
        page: { type: integer }
        limit: { type: integer }
        total: { type: integer, format: int64 }
        totalPages: { type: integer }
      required: [page, limit, total, totalPages]
```

**Cursor-based pagination** (for infinite scroll, dynamic datasets):

```yaml
parameters:
  - in: query
    name: after
    schema: { type: string }
    description: Opaque cursor (exclusive). Mutually exclusive with `before`.
  - in: query
    name: before
    schema: { type: string }
    description: Opaque cursor (exclusive). Mutually exclusive with `after`.
  - in: query
    name: limit
    schema: { type: integer, minimum: 1, maximum: 100, default: 20 }

# Response meta:
components:
  schemas:
    CursorPaginationMeta:
      type: object
      properties:
        limit: { type: integer }
        hasNext: { type: boolean }
        hasPrev: { type: boolean }
        nextCursor: { type: string, nullable: true }
        prevCursor: { type: string, nullable: true }
      required: [limit, hasNext, hasPrev, nextCursor, prevCursor]
```

#### 3.5 Filtering (MUST follow)

Use `filter[field][operator]` syntax:

```yaml
parameters:
  - in: query
    name: filter[status]
    schema: { type: string }
    description: Filter by status (eq operator implied)
  - in: query
    name: filter[createdAt][gte]
    schema: { type: string, format: date-time }
    description: Filter createdAt >= value
  - in: query
    name: filter[createdAt][lte]
    schema: { type: string, format: date-time }
    description: Filter createdAt <= value
```

#### 3.6 Response Format (MUST follow)

**List response**:

```yaml
ListResourcesResponse:
  type: object
  properties:
    data:
      type: array
      items: { $ref: '#/components/schemas/Resource' }
    meta:
      $ref: '#/components/schemas/OffsetPaginationMeta'  # or CursorPaginationMeta
  required: [data, meta]
```

**Single resource response**:

```yaml
GetResourceResponse:
  type: object
  properties:
    data:
      $ref: '#/components/schemas/Resource'
  required: [data]
```

**Error response**:

```yaml
ErrorResponse:
  type: object
  properties:
    error:
      type: object
      properties:
        code: { type: string, description: "Machine-readable error code (UPPER_SNAKE_CASE)" }
        message: { type: string, description: "Human-readable error message" }
        details: { type: object, additionalProperties: true }
      required: [code, message]
  required: [error]
```

#### 3.7 ID and Field Conventions (MUST follow)

```yaml
Resource:
  type: object
  properties:
    id:
      type: string
      description: Resource ID (always string)
    userId:
      type: string
      description: Foreign key to User (always string, named <resource>Id)
    status:
      type: string
      enum: [pending, active, inactive]
      description: Status (lowercase enum values)
    createdAt:
      type: string
      format: date-time
      description: Creation timestamp (ISO8601 UTC)
    updatedAt:
      type: string
      format: date-time
      description: Last update timestamp (ISO8601 UTC)
  required: [id, status, createdAt, updatedAt]
```

#### 3.8 Custom Actions (MUST follow)

For non-CRUD operations, use `/actions/{action-name}`:

```yaml
paths:
  /resources/{id}/actions/disable:
    post:
      operationId: disableResource
      summary: Disable a resource
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                reason: { type: string }
      responses:
        '200':
          description: Resource disabled
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetResourceResponse'
```

#### 3.9 Bulk Operations (MUST follow)

```yaml
paths:
  /resources/bulk:
    post:
      operationId: bulkCreateResources
      summary: Bulk create resources
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                items:
                  type: array
                  items: { $ref: '#/components/schemas/CreateResourceRequest' }
              required: [items]

  /resources/actions/bulk-delete:
    post:
      operationId: bulkDeleteResources
      summary: Bulk delete resources (use POST, not DELETE with body)
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                ids:
                  type: array
                  items: { type: string }
              required: [ids]
```

### Step 4: Validate OpenAPI Spec

**Why:** Ensure the generated spec is valid and follows conventions.

```bash
# Install spectral if not present
pnpm add -D @stoplight/spectral-cli

# Validate OpenAPI spec
pnpm exec spectral lint src/api/openapi.yaml
```

If validation fails, fix the issues before proceeding.

### Step 5: Generate TypeScript Types and Hooks

**Why:** After updating the OpenAPI spec, regenerate the client code.

```bash
pnpm api:generate
```

Verify generation succeeded:

```bash
# Check generated files exist
ls -la src/api/generated/models/
ls -la src/api/generated/endpoints/
```

### Step 6: Update MSW Handlers (if applicable)

**Why:** MSW handlers must match the updated API spec.

If the project uses MSW for mocking:

```bash
# Check if MSW handlers exist
ls -la src/mocks/handlers.ts 2>/dev/null
```

If handlers exist, update them to match new endpoints. See `/theplant.msw-mock-backend` workflow.

### Step 7: Final Verification

**Why:** Ensure everything is in sync.

```bash
# 1. TypeScript compiles
pnpm tsc --noEmit

# 2. Check API generation is up to date
pnpm api:generate && git diff --exit-code src/api/generated/ || echo "Generated files changed - commit them"

# 3. Run tests if available
pnpm test:e2e 2>/dev/null || echo "No e2e tests configured"
```

## OpenAPI Spec Checklist

Before completing, verify the spec follows these rules:

### Naming
- [ ] Paths use plural nouns, lowercase, kebab-case (`/users`, `/order-items`)
- [ ] Field names use camelCase (`firstName`, `createdAt`)
- [ ] Schema names use PascalCase (`User`, `OrderItem`)
- [ ] Enum values use lowercase or kebab-case (`pending`, `in-progress`)
- [ ] Every endpoint has an `operationId`

### Structure
- [ ] All IDs are `type: string`
- [ ] Foreign keys named `<resource>Id` (e.g., `userId`, `storeId`)
- [ ] Timestamps use `format: date-time` (ISO8601 UTC)
- [ ] List responses wrap data in `{ data: [], meta: {} }`
- [ ] Single responses wrap data in `{ data: {} }`
- [ ] Error responses use `{ error: { code, message, details? } }`

### Pagination
- [ ] Each list endpoint uses ONLY ONE pagination style (offset OR cursor)
- [ ] Offset-based: `page`, `limit`, `sort` params; `OffsetPaginationMeta` response
- [ ] Cursor-based: `after`, `before`, `limit` params; `CursorPaginationMeta` response
- [ ] Default sort includes unique tie-breaker for cursor-based (`-createdAt,id`)

### Operations
- [ ] Standard CRUD: GET (list), POST (create), GET (single), PATCH (update), DELETE
- [ ] Custom actions use `POST /resources/{id}/actions/{action-name}`
- [ ] Bulk delete uses `POST /resources/actions/bulk-delete` (NOT DELETE with body)

### HTTP Status Codes
- [ ] 200 OK - successful fetch/update/delete
- [ ] 201 Created - successful creation
- [ ] 400 Bad Request - validation errors (`VALIDATION_ERROR`)
- [ ] 401 Unauthorized - not authenticated (`UNAUTHORIZED`)
- [ ] 403 Forbidden - no permission (`FORBIDDEN`)
- [ ] 404 Not Found - resource not found (`RESOURCE_NOT_FOUND`)
- [ ] 409 Conflict - resource conflict (`CONFLICT`)
- [ ] 422 Unprocessable Entity - business logic error (`BUSINESS_LOGIC_ERROR`)

## Common Mistakes to Avoid

### ❌ Wrong Path Naming
```yaml
# WRONG
/api/v1/getUsers        # verb in path
/api/v1/user            # singular
/api/v1/UserProfiles    # PascalCase
/api/v1/user_profiles   # snake_case

# CORRECT
/api/v1/users
/api/v1/user-profiles
```

### ❌ Wrong Field Naming
```yaml
# WRONG
first_name: { type: string }  # snake_case
FirstName: { type: string }   # PascalCase

# CORRECT
firstName: { type: string }   # camelCase
```

### ❌ Wrong ID Type
```yaml
# WRONG
id: { type: integer }

# CORRECT
id: { type: string }
```

### ❌ Missing Response Wrapper
```yaml
# WRONG - bare array
responses:
  '200':
    content:
      application/json:
        schema:
          type: array
          items: { $ref: '#/components/schemas/User' }

# CORRECT - wrapped in data
responses:
  '200':
    content:
      application/json:
        schema:
          type: object
          properties:
            data:
              type: array
              items: { $ref: '#/components/schemas/User' }
            meta:
              $ref: '#/components/schemas/OffsetPaginationMeta'
          required: [data, meta]
```

### ❌ DELETE with Request Body
```yaml
# WRONG
/resources/bulk:
  delete:
    requestBody:
      content:
        application/json:
          schema:
            properties:
              ids: { type: array }

# CORRECT - use POST action
/resources/actions/bulk-delete:
  post:
    requestBody:
      content:
        application/json:
          schema:
            properties:
              ids: { type: array }
```
