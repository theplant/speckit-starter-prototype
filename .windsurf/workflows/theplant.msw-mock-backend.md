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

## Rationale

MSW enables frontend development with real `fetch()` calls that work identically with a real backend. This aligns with the **OPENAPI-FIRST** principle where the API contract is defined first, and implementation follows. MSW handlers implement the contract locally while the backend team implements the same contract on the server.

## Core Principles (NON-NEGOTIABLE)

### MSW Architecture

- MUST use Mock Service Worker (MSW) library for API mocking
- MSW handlers MUST be defined in `src/mocks/handlers.ts`
- MSW browser worker setup MUST be in `src/mocks/browser.ts`
- MSW MUST be started in development mode only (not in production builds)
- Handlers MUST use standard Fetch API Request/Response objects
- Handlers MUST implement endpoints defined in OpenAPI spec (single source of truth)
- This enables the frontend to use real `fetch()` calls that work identically with a real backend

### OpenAPI Contract Alignment (OPENAPI-FIRST)

- MSW handlers MUST match the OpenAPI specification exactly
- Request/response schemas MUST match OpenAPI definitions
- HTTP status codes MUST follow OpenAPI spec (201 for create, 404 for not found, etc.)
- Error responses MUST follow a consistent structure (code, message, details)

### Data Storage Rules (NON-NEGOTIABLE)

- All data MUST be stored in localStorage with JSON serialization
- **NEVER use in-memory variables** for data storage - data will be lost on page navigation
- Each data entity type MUST have its own localStorage key (or use Zustand persist store)
- Data operations MUST be synchronous and immediate within handlers
- CRUD operations MUST update localStorage directly
- Storage keys MUST be documented for test data seeding (see theplant.test-data-seeding workflow)

**Why localStorage is required:**
- MSW runs in the browser's service worker context
- Page navigations cause the main page to reload, but service worker persists
- In-memory data in handlers is lost when the page reloads
- localStorage persists across page navigations, enabling multi-page test flows

### ID Generation Rules (NON-NEGOTIABLE)

- All entity IDs MUST use UUID format via `crypto.randomUUID()`
- NEVER use timestamp-based IDs like `entity-${Date.now()}`
- Mock data IDs MUST match the format expected by the real backend (typically UUID)
- This ensures tests can use consistent ID patterns (e.g., `/[a-f0-9-]+$/` regex)
- Example: `id: crypto.randomUUID()` → `"550e8400-e29b-41d4-a716-446655440000"`

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

AI agents MUST discover the project's API URL environment variable by searching for patterns like:
- `VITE_*_API_URL` or `VITE_*_BASE_URL` in `.env.example`, `.env`, or service files
- API base URL configuration in service files (e.g., `src/services/*.ts`)

**MSW Logic (project-agnostic):**
- If the API URL env var is **NOT set** → MSW enabled, app uses relative paths
- If the API URL env var is **set** → MSW disabled, app uses real backend

Update `src/main.tsx`:

```typescript
// AI: Replace VITE_API_URL with the actual env var found in the project
async function enableMocking() {
  const hasRealBackend = !!import.meta.env.VITE_API_URL  // e.g., VITE_WORKFLOW_API_URL
  
  if (!hasRealBackend) {
    const { worker } = await import('./mocks/browser')
    console.log('[MSW] Mock Service Worker enabled - API calls will be intercepted')
    return worker.start({ onUnhandledRequest: 'bypass' })
  } else {
    console.log('[App] Using real backend API:', import.meta.env.VITE_API_URL)
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
- Logging MUST include operation type (READ/WRITE/DELETE) for traceability

## Error Handling

MSW handlers MUST implement consistent error responses:

```typescript
// Error response structure (matches backend contract)
interface ErrorResponse {
  code: string;     // e.g., "PRODUCT_NOT_FOUND"
  message: string;  // e.g., "Product not found"
  details?: string; // Optional debug info (dev mode only)
}

// Example error handler
http.get('/api/products/:id', ({ params }) => {
  const products = storage.get(STORAGE_KEYS.PRODUCTS) || [];
  const product = products.find((p: any) => p.id === params.id);
  if (!product) {
    return HttpResponse.json(
      { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
      { status: 404 }
    );
  }
  return HttpResponse.json(product);
});
```

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
5. Backend team implements the same OpenAPI spec using oapi-codegen (Go) or equivalent

## AI Agent Requirements

- AI agents MUST verify MSW handlers match OpenAPI spec before adding new endpoints
- AI agents MUST use consistent error response structure
- AI agents MUST document localStorage keys for test data seeding
- AI agents MUST NOT hardcode data - use storage layer for all data access
- AI agents MUST apply Root Cause Tracing (ROOT-CAUSE-TRACING) when debugging MSW issues

## Context

$ARGUMENTS
