---
description: Apply System Exploration Protocol before writing tests - trace route to component to hooks to storage layer to understand data flow.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Before writing tests for an unfamiliar system, follow the System Exploration Protocol (SEP) to understand the code path from route to storage layer. This ensures tests are written with correct data seeding and assertions.

## Rationale (ROOT-CAUSE-TRACING)

Root cause analysis requires understanding the full system. The System Exploration Protocol ensures AI agents understand the complete data flow before writing tests or debugging issues. This prevents superficial fixes and ensures tests validate actual behavior.

## Core Principles (NON-NEGOTIABLE)

### System Exploration Protocol

For every route, AI agents MUST trace the code path:

**Route → Component → Hooks → Storage**

This trace reveals:
- What data entities the route displays
- What fields are required for each entity
- What relationships exist between entities
- What localStorage key to use for seeding

## Execution Steps

### Step 1: Read Route Definitions

Explore `src/routes/` directory structure:

```bash
# List all route files
find src/routes -name "*.tsx" | head -50

# Or use list_dir on src/routes/
```

Note:
- Route file paths (e.g., `_authenticated/products/index.tsx`)
- Route parameters (e.g., `$id` in `products/$id.tsx`)
- Authentication requirements (e.g., `_authenticated` folder)

### Step 2: Trace Code to Storage Layer (NON-NEGOTIABLE)

For each route, trace the full code path:

1. **Read the route file** to find which component it renders
2. **Read the component** to find which hooks/data fetching it uses
3. **Read the hooks** to find which API endpoints or storage keys it accesses
4. **Read the MSW handlers or storage layer** to understand the data schema

### Step 3: Document the Code Trace

Document the trace as a comment in the test file:

```typescript
// ─────────────────────────────────────────────────────────────
// Products (SEP: /products)
// Code Trace:
//   src/routes/_authenticated/products/index.tsx
//     → renders Products component
//       → src/features/products/index.tsx
//         → uses useProducts() hook
//           → src/features/products/hooks/use-products.ts
//             → calls useListProductsGenerated()
//               → HTTP GET /api/products
//                 → MSW handler reads from mockDb.products
//                   → src/lib/mock-db/store.ts (key: 'pim-mock-db')
//                     → state.products: Product[]
// ─────────────────────────────────────────────────────────────
```

### Step 4: Identify Required Test Data

From the storage layer trace, identify:

| Question | How to Find |
|----------|-------------|
| What entities? | Look at state arrays in store.ts |
| What fields required? | Check TypeScript types in src/types/ |
| What relationships? | Look for `*Id` or `*Ids` fields |
| What localStorage key? | Check `name` in persist config |

### Step 5: Identify Data Scenarios to Test

For each route, plan tests for these scenarios:

| Scenario | Test Data | Expected Behavior |
|----------|-----------|-------------------|
| Empty state | `[]` | Shows empty state message |
| Single item | `[{...}]` | Shows single item correctly |
| Multiple items | `[{...}, {...}]` | Shows all items |

### Step 6: Write Tests with Seeded Data

Use the traced information to write tests:

```typescript
test.describe('Products', () => {
  // Create typed test data based on Product type from src/types/product.ts
  const createTestProduct = (id: string, sku: string, name: string) => ({
    id,
    sku,
    name: { en: name },
    // ... all required fields from Product type
  });

  test('should display products with seeded data', async ({ page }) => {
    const testProducts = [createTestProduct('1', 'SKU-001', 'Test Product')];
    
    await page.goto('/');
    await page.evaluate((products) => {
      // Use correct localStorage key from trace
      const data = { state: { products, isSeeded: true } };
      localStorage.setItem('pim-mock-db', JSON.stringify(data));
    }, testProducts);
    
    await page.reload();
    await page.goto('/products');
    
    // Assert on seeded data
    await expect(page.getByText('Test Product')).toBeVisible();
  });
});
```

## Example Code Trace

### Route: `/products`

```
src/routes/_authenticated/products/index.tsx
  → renders Products component
    → src/features/products/index.tsx
      → uses useProducts() hook
        → src/features/products/hooks/use-products.ts
          → calls useListProductsGenerated() from @/lib/api/generated/index
            → HTTP GET /api/products
              → MSW handler reads from mockDb.products
                → src/lib/mock-db/store.ts (localStorage key: 'pim-mock-db')
                  → state.products: Product[]
```

### Route: `/workflows`

```
src/routes/_authenticated/workflows/index.tsx
  → renders WorkflowsPage (inline component)
    → uses WorkflowList component
      → src/features/workflows/components/workflow-list.tsx
        → uses useWorkflows() hook
          → src/features/workflows/hooks/use-workflows.ts
            → calls workflowsApi.getAll()
              → src/lib/api/workflows.ts
                → reads from mockDb.workflows
                  → src/lib/mock-db/store.ts (localStorage key: 'pim-mock-db')
                    → state.workflows: Workflow[]
```

## CRITICAL: AI agents MUST NOT

- Guess what data exists in the system
- Write tests that pass regardless of data
- Use generic assertions that don't verify actual content
- Skip the storage layer trace step
- Implement fixes without understanding the full code path

## AI Agent Requirements

- AI agents MUST complete System Exploration Protocol before writing tests for unfamiliar routes
- AI agents MUST document the code trace in test files
- AI agents MUST use correct localStorage keys from store configuration
- AI agents MUST apply Root Cause Tracing (ROOT-CAUSE-TRACING) when tests fail
- AI agents MUST verify data flow matches OpenAPI spec (OPENAPI-FIRST)

## Integration with Other Workflows

- **theplant.test-data-seeding**: Use traced localStorage keys for data seeding
- **theplant.openapi-first**: Verify API calls match OpenAPI spec
- **theplant.msw-mock-backend**: Verify MSW handlers implement traced endpoints
- **theplant.root-cause-tracing**: Use code trace for debugging

## Context

$ARGUMENTS
