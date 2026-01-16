---
description: Add Hybrid MSW Traffic Switch - allow per-endpoint passthrough to real backend while keeping MSW mock for the rest.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Retrofit an existing MSW-mocked frontend project (similar to iam-console) to support **three routing modes**:

- `mock`: all API requests handled by MSW
- `real`: MSW disabled or bypassed; all API requests go to real backend
- `hybrid`: MSW stays enabled, but **specific endpoints** are configured to passthrough to real backend

This enables “partially open real interfaces” while keeping the rest mocked.

## Preconditions

- Project is a browser SPA (Vite/React or similar)
- MSW is already installed or can be installed
- There is a single API prefix (e.g. `/iam/api/v1`) and a single fetch layer (Orval or custom fetch)

## Hard Constraints (NON-NEGOTIABLE)

- **Do NOT edit files in `src/api/generated/`** (if Orval or similar generator is used). Update OpenAPI / generator config instead.
- **Hybrid mode MUST be configuration-only** (env + a single overrides config file). Switching modes MUST NOT require code edits.
- **Passthrough must win by handler order**: passthrough handlers must be registered BEFORE mock handlers.

## How to Execute This Workflow

**MANDATORY: run the workflow-runner and follow its output.**

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.msw-hybrid-traffic-switch
```

## Architecture Overview (What you are building)

### Core types

- `RoutingMode`: `'mock' | 'real' | 'hybrid'`
- `RoutingSource`: `'mock' | 'real'`
- `RoutingConfig`: `{ mode, overrides? }`

### Required modules

- `src/config/routing-types.ts`: routing types
- `src/config/routing-config.ts`: load routing config from env (and merge overrides in hybrid)
- `src/mocks/catalog.ts`: endpoint catalog (authoritative list of known endpoints)
- `src/mocks/routing-overrides.ts`: user-editable per-endpoint overrides (type-safe keys)
- `src/mocks/policy.ts`: compute effective routing source per endpoint
- `src/mocks/create-handlers.ts`: assemble handlers based on policy; add passthrough for real endpoints in hybrid
- `src/lib/logger.ts` + `src/mocks/diagnostics.ts`: debug logging and diagnostics hooks

## Steps

### Step 1: Establish single source of truth for API paths

1. Create/confirm a central API config module (example: `src/config/api.ts`) with:
   - `API_PREFIX` (e.g. `/iam/api/v1`)
   - helper `apiPath(relativePath)` if needed
2. Ensure **all MSW handlers and passthrough handlers** use the same prefix source.

**Pitfall**: Do not concatenate API prefix twice. If an endpoint catalog stores full paths, passthrough must use it directly.

### Step 2: Add routing core types

Create `src/config/routing-types.ts` containing:

- `RoutingMode`
- `RoutingSource`
- `RoutingConfig`
- `LoadedRoutingConfig` (include `source: 'build-time' | 'default' | 'runtime'` if used)
- `EndpointEntry` for catalog

### Step 3: Implement config loading

Create/update `src/config/routing-config.ts`:

- Read mode from `import.meta.env.VITE_ROUTING_MODE`
- Validate against allowed modes
- Default to `mock` for dev if absent
- Accept overrides as an optional parameter and include them only when mode is `hybrid`

**Invariant**: Only hybrid mode should apply overrides.

### Step 4: Create endpoint catalog (authoritative ID list)

Create `src/mocks/catalog.ts`:

- Define `endpointCatalog` as an object literal with stable keys (e.g. `'auth.me'`)
- Each entry contains `{ id, method, path, defaultSource, tags }`
- Export `EndpointId` **derived from keys**:
  - `export type EndpointId = keyof typeof endpointCatalog`

**CRITICAL**: Do NOT annotate `endpointCatalog` as `Record<string, ...>`.

- Bad: `const endpointCatalog: Record<string, EndpointEntry> = { ... }` (breaks literal key inference)
- Good: `export const endpointCatalog = { ... } as const`

### Step 5: Add type-safe routing overrides configuration

Create `src/mocks/routing-overrides.ts`:

- Define type:
  - `export type RoutingOverrides = Partial<Record<EndpointId, RoutingSource>>`
- Export editable `routingOverrides` object
- Export `getRoutingOverrides(): Record<string, RoutingSource>` that filters out `undefined`

**Goal**: invalid IDs like `'invalid.id'` MUST fail at compile-time.

### Step 6: Compute effective policy

Create/update `src/mocks/policy.ts`:

- Load config via `loadRoutingConfig(getRoutingOverrides())`
- `getEffectiveSource(endpointId: EndpointId, config: RoutingConfig): RoutingSource`
  - `mock` mode: return `'mock'`
  - `real` mode: return `'real'`
  - `hybrid` mode:
    - if override exists: return it
    - else return catalog default

### Step 7: Assemble handlers (the core hybrid behavior)

Create `src/mocks/create-handlers.ts`:

- If mode = `real`: return `[]` or disable MSW entirely (project decision)
- If mode = `mock`: return all mock handlers
- If mode = `hybrid`:
  - iterate over `endpointCatalog`
  - for endpoints resolved to `real`: add a passthrough handler
  - return `[...passthroughHandlers, ...mockHandlers]`

**Invariant**: passthrough handlers must be first.

**Pitfall**: passthrough handler path must match the actual request path:

- If catalog stores full path (recommended): passthrough uses `entry.path` directly
- If catalog stores relative path: passthrough must build full path once (via `API_PREFIX`)

### Step 8: Hook into app startup

Ensure MSW worker starts in dev/prod according to your strategy:

- Option A: always start MSW (recommended for hybrid), but allow bypass by mode
- Option B: don’t start MSW in `real` mode

### Step 9: Diagnostics logging (repeatable debugging)

1. Create `src/lib/logger.ts` with namespaces (e.g. `iam:routing`, `iam:msw`)
2. Add `src/mocks/diagnostics.ts` helpers to print:
   - effective mode
   - config source
   - overrides
   - handler registration summary

**Enable in browser console**:

```javascript
localStorage.setItem('debug', 'iam:*')
location.reload()
```

Disable:

```javascript
localStorage.removeItem('debug')
location.reload()
```

### Step 10: Documentation

Update docs so other developers can use it without reading code:

- Root `README.md`:
  - env vars (`VITE_ROUTING_MODE`, optional `VITE_API_BASE_URL`)
  - debug logging instructions
- `src/mocks/README.md`:
  - hybrid behavior
  - where to configure per-endpoint overrides
  - how to verify an endpoint is passthrough

### Step 11: Verification

1. Type-safety check:
   - Add `'invalid.id': 'real'` in overrides and confirm TypeScript error
2. Runtime check:
   - Set `VITE_ROUTING_MODE=hybrid`
   - Set one endpoint override to `real`
   - Confirm network request hits real backend (not MSW response)
3. Run quality gates:
   - Use `/theplant.quality-gates`

## Common Failure Modes (Root Cause Tracing)

- **Overrides “don’t work”**:
  - Mode not `hybrid` (env not loaded / dev server not restarted)
  - Passthrough handler path mismatch (prefix duplicated or missing)
  - Handler ordering wrong (passthrough registered after mock)

- **Invalid endpoint ID does not error**:
  - `endpointCatalog` keys widened to `string` due to `Record<string, ...>` annotation

- **Policy indexing errors**:
  - `endpointId` typed as `string` instead of `EndpointId` when indexing `endpointCatalog`

## Deliverables Checklist

- `VITE_ROUTING_MODE` supports `mock|real|hybrid`
- `routing-overrides.ts` exists and is type-safe
- Hybrid mode routes per endpoint as configured
- Debug logging documented and working
- Quality gates pass
