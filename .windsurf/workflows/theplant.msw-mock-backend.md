---
description: Apply MSW Mock Backend pattern - use Mock Service Worker to intercept HTTP requests and serve data from localStorage for prototype development.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Set up and maintain a Mock Service Worker (MSW) backend that intercepts HTTP requests and serves data from localStorage.

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:
- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.msw-mock-backend
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.


## Steps

### Step 1: Install MSW

**Why:** MSW intercepts HTTP requests at the network level, enabling real `fetch()` calls that work identically with a real backend.

```bash
pnpm add -D msw
pnpm dlx msw init public/ --save
```

### Step 2: Create `src/lib/storage.ts`

**Why:** All data must be stored in localStorage because in-memory data is lost on page navigation. The storage wrapper provides logging for debugging.

```typescript
export const STORAGE_KEYS = {
  PRODUCTS: 'prototype_products',
  USERS: 'prototype_users',
  // Add keys for each entity type
} as const;

const isTestMode = () => {
  return typeof window !== 'undefined' && 
    (window.location.search.includes('test=true') || 
     import.meta.env.MODE === 'test');
};

export const storage = {
  get<T>(key: string): T | null {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : null;
    if (isTestMode()) {
      console.log(`[Storage READ] ${key}:`, parsed);
    }
    return parsed;
  },

  set<T>(key: string, value: T): void {
    if (isTestMode()) {
      console.log(`[Storage WRITE] ${key}:`, value);
    }
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key: string): void {
    if (isTestMode()) {
      console.log(`[Storage DELETE] ${key}`);
    }
    localStorage.removeItem(key);
  },
};
```

**Storage Rules:**
- All data MUST be stored in localStorage (NOT in-memory variables)
- In-memory data is lost on page navigation
- localStorage persists across page navigations

### Step 3: Create `src/mocks/handlers.ts`

**Why:** MSW handlers implement the API contract locally. Using `crypto.randomUUID()` ensures IDs match the format expected by real backends.

```typescript
import { http, HttpResponse } from 'msw';
import { storage, STORAGE_KEYS } from '@/lib/storage';

export const handlers = [
  // GET all items
  http.get('/api/products', () => {
    const products = storage.get(STORAGE_KEYS.PRODUCTS) || [];
    return HttpResponse.json({ data: products });
  }),

  // GET single item
  http.get('/api/products/:id', ({ params }) => {
    const products = storage.get(STORAGE_KEYS.PRODUCTS) || [];
    const product = products.find((p: any) => p.id === params.id);
    if (!product) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Product not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json({ data: product });
  }),

  // POST create item
  http.post('/api/products', async ({ request }) => {
    const body = await request.json();
    const products = storage.get(STORAGE_KEYS.PRODUCTS) || [];
    const newProduct = {
      ...body,
      id: crypto.randomUUID(),  // MUST use UUID, not timestamp
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.push(newProduct);
    storage.set(STORAGE_KEYS.PRODUCTS, products);
    return HttpResponse.json({ data: newProduct }, { status: 201 });
  }),

  // PUT update item
  http.put('/api/products/:id', async ({ params, request }) => {
    const body = await request.json();
    const products = storage.get(STORAGE_KEYS.PRODUCTS) || [];
    const index = products.findIndex((p: any) => p.id === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Product not found' },
        { status: 404 }
      );
    }
    products[index] = {
      ...products[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.PRODUCTS, products);
    return HttpResponse.json({ data: products[index] });
  }),

  // DELETE item
  http.delete('/api/products/:id', ({ params }) => {
    const products = storage.get(STORAGE_KEYS.PRODUCTS) || [];
    const filtered = products.filter((p: any) => p.id !== params.id);
    storage.set(STORAGE_KEYS.PRODUCTS, filtered);
    return new HttpResponse(null, { status: 204 });
  }),
];
```

**Handler Rules:**
- Use `crypto.randomUUID()` for IDs (NOT timestamp-based)
- Handler paths MUST match OpenAPI spec exactly
- HTTP status codes MUST follow OpenAPI spec (201 for create, 404 for not found)

### Step 4: Create `src/mocks/browser.ts`

**Why:** This file sets up the MSW service worker that intercepts requests in the browser.

```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### Step 5: Update `src/main.tsx`

**Why:** MSW should only be enabled when no real backend is configured. This allows seamless switching between mock and real backends.

Find the project's API URL environment variable first:
```bash
grep -rn "VITE_.*API\|VITE_.*URL" .env* src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5
```

Then update `src/main.tsx`:

```typescript
async function enableMocking() {
  // Replace VITE_API_URL with actual env var found in project
  const hasRealBackend = !!import.meta.env.VITE_API_URL
  
  if (!hasRealBackend) {
    const { worker } = await import('./mocks/browser')
    console.log('[MSW] Mock Service Worker enabled')
    return worker.start({ onUnhandledRequest: 'bypass' })
  } else {
    console.log('[App] Using real backend:', import.meta.env.VITE_API_URL)
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

**MSW Logic:**
- API URL env var NOT set → MSW enabled
- API URL env var set → MSW disabled, use real backend

### Step 6: Verify Setup

**Why:** Verification ensures MSW is correctly configured and will intercept API requests.

```bash
# Check service worker exists
ls public/mockServiceWorker.js

# Check handlers exist
ls src/mocks/handlers.ts

# Check MSW enabled in main.tsx
grep -q "enableMocking" src/main.tsx && echo "OK" || echo "MISSING"

# Start dev server and verify MSW logs
pnpm dev
# Should see: [MSW] Mock Service Worker enabled
```

### Step 7: Add Types from Orval

**Why:** Importing types from Orval ensures MSW handlers match the OpenAPI spec exactly, catching type mismatches at compile time.

Import types from Orval-generated models for type safety:

```typescript
// src/mocks/handlers.ts
import type {
  ListProductsResponse,
  ProductItemResponse,
  Product,
} from '@/api/generated/models'

http.get('/api/v1/products', () => {
  const products = storage.get<Product[]>(STORAGE_KEYS.PRODUCTS) || []
  return HttpResponse.json<ListProductsResponse>({
    data: products,
    meta: { page: 1, limit: 20, total: products.length, totalPages: 1 },
  })
})
```
