---
description: Apply OpenAPI-First API Architecture - define API spec before implementation, generate types, use typed client for all data access.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Ensure all API development follows OpenAPI-First principles. Define the API contract before implementation, generate TypeScript types, and use type-safe clients for all data access.

## Core Principles (NON-NEGOTIABLE)

### OpenAPI Specification Requirements

- An OpenAPI 3.0+ spec MUST be defined in `src/api/openapi.yaml` (or `.json`)
- All API endpoints MUST be documented in the OpenAPI spec before implementation
- Request/response schemas MUST be defined in the OpenAPI spec
- The spec MUST be complete enough to hand to backend developers for implementation

### Code Generation (NON-NEGOTIABLE)

- TypeScript types MUST be generated from OpenAPI spec using `openapi-typescript`
- Generated files MUST be in `src/api/generated/` directory
- **AI agents MUST NOT directly edit files in `src/api/generated/`** - regenerate from OpenAPI spec instead
- Run `pnpm api:generate` after any OpenAPI spec changes

### HTTP Fetch Pattern (NON-NEGOTIABLE)

- Frontend code MUST use `openapi-fetch` client for all data operations
- Fetch calls MUST use proper HTTP methods (GET, POST, PUT, DELETE)
- Fetch calls MUST use proper URL paths matching OpenAPI spec
- NO direct localStorage access from React components - all data MUST flow through API client

## Execution Steps

### 1. Setup OpenAPI Tooling

```bash
# Install dependencies
pnpm add -D openapi-typescript
pnpm add openapi-fetch

# Add npm scripts to package.json
# "api:generate": "openapi-typescript src/api/openapi.yaml -o src/api/generated/schema.d.ts"
```

### 2. Define OpenAPI Specification

Create or update `src/api/openapi.yaml`:

```yaml
openapi: 3.0.3
info:
  title: Application API
  version: 1.0.0
paths:
  /api/products:
    get:
      summary: List all products
      responses:
        '200':
          description: List of products
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Product'
    post:
      summary: Create a product
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProductRequest'
      responses:
        '201':
          description: Created product
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
components:
  schemas:
    Product:
      type: object
      required:
        - id
        - sku
        - name
      properties:
        id:
          type: string
        sku:
          type: string
        name:
          type: object
          additionalProperties:
            type: string
        # ... other fields
```

### 3. Generate TypeScript Types

```bash
pnpm api:generate
```

This generates `src/api/generated/schema.d.ts` with all types.

### 4. Create Typed API Client

Create `src/api/client.ts`:

```typescript
import createClient from 'openapi-fetch';
import type { paths } from './generated/schema';

export const api = createClient<paths>({ baseUrl: '/api' });
```

### 5. Use Typed Client in Hooks

```typescript
// src/hooks/use-products.ts
import { api } from '@/api/client';
import { useQuery, useMutation } from '@tanstack/react-query';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/products');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: async (product: CreateProductRequest) => {
      const { data, error } = await api.POST('/api/products', {
        body: product,
      });
      if (error) throw error;
      return data;
    },
  });
}
```

### 6. Verify Types Are Up-to-Date

```bash
# Regenerate types and check for changes
pnpm api:generate

# Type check the project
pnpm tsc --noEmit
```

## Code Organization

```
src/api/
├── openapi.yaml          # OpenAPI 3.0+ specification (source of truth)
├── generated/            # Generated files - DO NOT EDIT
│   └── schema.d.ts       # Generated types from openapi-typescript
├── client.ts             # Typed API client using openapi-fetch
└── worker.ts             # Service Worker that mocks backend (if using MSW)
```

## Backend Migration Path

To migrate to real backend:
1. Disable Service Worker / MSW
2. Update `baseUrl` in client to point to real API
3. No frontend code changes required beyond configuration
4. Backend team receives complete OpenAPI spec with all endpoints documented

## Quality Gates

- Generated types MUST be up-to-date (`pnpm api:generate` produces no changes)
- Type checking MUST pass (`tsc --noEmit`)
- AI agents MUST NOT edit files in `src/api/generated/`
- All API calls MUST use the typed client

## Context

$ARGUMENTS
