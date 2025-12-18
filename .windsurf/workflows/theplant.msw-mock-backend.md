---
description: Apply MSW Mock Backend pattern - use Mock Service Worker to intercept HTTP requests and serve data from localStorage for prototype development.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Set up and maintain a Mock Service Worker (MSW) backend that intercepts HTTP requests and serves data from localStorage. This enables prototype development with real HTTP patterns that can seamlessly migrate to a real backend.

## Core Principles (NON-NEGOTIABLE)

### MSW Architecture

- MUST use Mock Service Worker (MSW) library for API mocking
- MSW handlers MUST be defined in `src/mocks/handlers.ts`
- MSW browser worker setup MUST be in `src/mocks/browser.ts`
- MSW MUST be started in development mode only (not in production builds)
- Handlers MUST use standard Fetch API Request/Response objects
- This enables the frontend to use real `fetch()` calls that work identically with a real backend

### Data Storage Rules

- All data MUST be stored in localStorage with JSON serialization
- Each data entity type MUST have its own localStorage key
- Data operations MUST be synchronous and immediate within handlers
- CRUD operations MUST update localStorage directly

## Execution Steps

### 1. Install MSW

```bash
pnpm add -D msw
pnpm dlx msw init public/ --save
```

### 2. Create MSW Handlers

Create `src/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';
import { storage, STORAGE_KEYS } from '@/lib/storage';

export const handlers = [
  // GET all items
  http.get('/api/products', () => {
    const products = storage.get(STORAGE_KEYS.PRODUCTS) || [];
    return HttpResponse.json(products);
  }),

  // GET single item
  http.get('/api/products/:id', ({ params }) => {
    const products = storage.get(STORAGE_KEYS.PRODUCTS) || [];
    const product = products.find((p: any) => p.id === params.id);
    if (!product) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(product);
  }),

  // POST create item
  http.post('/api/products', async ({ request }) => {
    const body = await request.json();
    const products = storage.get(STORAGE_KEYS.PRODUCTS) || [];
    const newProduct = {
      ...body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.push(newProduct);
    storage.set(STORAGE_KEYS.PRODUCTS, products);
    return HttpResponse.json(newProduct, { status: 201 });
  }),

  // PUT update item
  http.put('/api/products/:id', async ({ params, request }) => {
    const body = await request.json();
    const products = storage.get(STORAGE_KEYS.PRODUCTS) || [];
    const index = products.findIndex((p: any) => p.id === params.id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    products[index] = {
      ...products[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.PRODUCTS, products);
    return HttpResponse.json(products[index]);
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

### 3. Create MSW Browser Setup

Create `src/mocks/browser.ts`:

```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### 4. Initialize MSW in App

Update `src/main.tsx`:

```typescript
async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    return worker.start({ onUnhandledRequest: 'bypass' });
  }
}

enableMocking().then(() => {
  // Render app after MSW is ready
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

### 5. Create Storage Wrapper with Logging

Create `src/lib/storage.ts`:

```typescript
export const STORAGE_KEYS = {
  PRODUCTS: 'prototype_products',
  USERS: 'prototype_users',
  // ... other keys
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

## LocalStorage Transparency (NON-NEGOTIABLE)

- Storage wrapper MUST log key and value on every read/write when running in test mode
- This enables AI agents to see data flow when debugging test failures

## Playwright Configuration

Playwright MUST NOT start its own dev server:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: undefined, // Tests connect to existing dev server
});
```

The dev server MUST be started manually before running tests:
```bash
pnpm dev  # In one terminal
pnpm test:e2e  # In another terminal
```

## Backend Migration Path

To migrate to real backend:
1. Remove MSW initialization from `main.tsx`
2. Update API client `baseUrl` to point to real backend
3. No other frontend code changes required
4. OpenAPI spec serves as contract for backend implementation

## Context

$ARGUMENTS
