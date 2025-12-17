---
description: Apply test data seeding patterns for Zustand persist stores - seed localStorage with typed test data and reload page for re-hydration.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Ensure E2E tests properly seed test data into Zustand persist stores via localStorage. This workflow guides the correct pattern for data seeding that works with Zustand's persist middleware.

## Core Principles (NON-NEGOTIABLE)

### Test Data MUST Use TypeScript Types

Test data MUST be typed using TypeScript types from `src/types/`. This ensures:
- Compile-time validation of test data schema
- Automatic detection of schema changes
- Consistent data structure between tests and application

### Seeding Pattern for Zustand Persist Stores

When the app uses Zustand with persist middleware, follow this exact pattern:

1. Navigate to app first to access localStorage
2. Seed data with correct localStorage key (check `store.ts` for `name` in persist config)
3. Call `page.reload()` to force Zustand to re-hydrate from localStorage
4. Navigate to target route

## Execution Steps

### 1. Identify the localStorage Key

Find the correct localStorage key in the Zustand store configuration:

```bash
# Search for persist middleware configuration
grep -r "persist(" src/lib/
```

Look for the `name` property in the persist config:

```typescript
// Example from src/lib/mock-db/store.ts
persist(
  (set, get) => ({ ... }),
  {
    name: 'pim-mock-db',  // ← This is the localStorage key
    ...
  }
)
```

### 2. Create Typed Test Data Helper

Create helper functions with proper TypeScript types:

```typescript
import type { Product } from '@/types/product';

const createTestProduct = (
  id: string,
  sku: string,
  name: string,
  price: number,
  status: Product['status'] = 'active'
): Product => ({
  id,
  sku,
  name: { en: name },
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  description: { en: `Description for ${name}` },
  shortDescription: { en: `Short desc for ${name}` },
  status,
  categoryIds: [],
  tags: [],
  attributes: [],
  variants: [],
  pricing: { price, currency: 'USD' },
  mediaIds: [],
  media: [],
  seo: { slug: name.toLowerCase().replace(/\s+/g, '-') },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

### 3. Seed Data in Test (Correct Pattern)

```typescript
test('should display products with seeded data', async ({ page }) => {
  const testProducts = [
    createTestProduct('1', 'SKU-001', 'Test Product 1', 99.99, 'active'),
    createTestProduct('2', 'SKU-002', 'Test Product 2', 149.99, 'draft'),
  ];

  // 1. Navigate to app first to access localStorage
  await page.goto('/');

  // 2. Seed test data with correct localStorage key
  await page.evaluate((products) => {
    const existingData = localStorage.getItem('pim-mock-db');
    const data = existingData ? JSON.parse(existingData) : { state: {} };
    data.state = data.state || {};
    data.state.products = products;
    data.state.isSeeded = true;
    localStorage.setItem('pim-mock-db', JSON.stringify(data));
  }, testProducts);

  // 3. CRITICAL: Full page reload to force Zustand to re-hydrate
  await page.reload();

  // 4. Navigate to target route
  await page.goto('/products');

  // 5. Assert on the ACTUAL seeded data
  await expect(page.getByText('Test Product 1')).toBeVisible();
  await expect(page.getByText('SKU-001')).toBeVisible();
});
```

### 4. Test All Data Scenarios (NON-NEGOTIABLE)

For each route, write tests for these data scenarios:

| Scenario | Test Data | Expected Behavior |
|----------|-----------|-------------------|
| Empty state | `[]` | Shows empty state message/illustration |
| Single item | `[{...}]` | Shows single item correctly |
| Multiple items | `[{...}, {...}, {...}]` | Shows all items, pagination if applicable |

Example:

```typescript
test.describe('Products - Data Scenarios', () => {
  test('should show empty state when no products exist', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const data = { state: { products: [], isSeeded: true } };
      localStorage.setItem('pim-mock-db', JSON.stringify(data));
    });
    await page.reload();
    await page.goto('/products');
    await expect(page.getByText(/no products/i)).toBeVisible();
  });

  test('should display single product', async ({ page }) => {
    const singleProduct = [createTestProduct('1', 'ONLY-001', 'Only Product', 50.00)];
    await page.goto('/');
    await page.evaluate((products) => {
      const data = { state: { products, isSeeded: true } };
      localStorage.setItem('pim-mock-db', JSON.stringify(data));
    }, singleProduct);
    await page.reload();
    await page.goto('/products');
    await expect(page.getByText('Only Product')).toBeVisible();
  });

  test('should display multiple products', async ({ page }) => {
    const multipleProducts = [
      createTestProduct('1', 'A-001', 'Product A', 10.00),
      createTestProduct('2', 'B-001', 'Product B', 20.00),
      createTestProduct('3', 'C-001', 'Product C', 30.00),
    ];
    await page.goto('/');
    await page.evaluate((products) => {
      const data = { state: { products, isSeeded: true } };
      localStorage.setItem('pim-mock-db', JSON.stringify(data));
    }, multipleProducts);
    await page.reload();
    await page.goto('/products');
    await expect(page.getByText('Product A')).toBeVisible();
    await expect(page.getByText('Product B')).toBeVisible();
    await expect(page.getByText('Product C')).toBeVisible();
  });
});
```

### 5. Assert on Seeded Data (NON-NEGOTIABLE)

Assertions MUST reference the actual test data that was seeded:

```typescript
// ❌ BAD: Doesn't verify data
await expect(page.getByRole('table')).toBeVisible();

// ✅ GOOD: Verifies seeded data appears
await expect(page.getByText('Test Product 1')).toBeVisible();
await expect(page.getByText('SKU-001')).toBeVisible();
await expect(page.getByText('$99.99')).toBeVisible();
```

## Common Mistakes

### Wrong localStorage Key

```typescript
// ❌ BAD: Wrong key
localStorage.setItem('mock-db-storage', JSON.stringify(data));

// ✅ GOOD: Correct key from store.ts
localStorage.setItem('pim-mock-db', JSON.stringify(data));
```

### Missing Page Reload

```typescript
// ❌ BAD: No reload - Zustand won't re-hydrate
await page.evaluate((products) => {
  localStorage.setItem('pim-mock-db', JSON.stringify({ state: { products } }));
}, testProducts);
await page.goto('/products');  // Data won't appear!

// ✅ GOOD: Reload forces re-hydration
await page.evaluate((products) => {
  localStorage.setItem('pim-mock-db', JSON.stringify({ state: { products } }));
}, testProducts);
await page.reload();  // ← Critical!
await page.goto('/products');
```

### Untyped Test Data

```typescript
// ❌ BAD: Untyped object may miss required fields
const badProduct = { id: '1', name: 'Test', price: 99 };

// ✅ GOOD: Typed helper ensures all required fields
const goodProduct = createTestProduct('1', 'SKU-001', 'Test', 99);
```

## Context

$ARGUMENTS
