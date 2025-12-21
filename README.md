# Speckit Starter for Clickable Prototypes

A comprehensive template for building clickable prototypes with React, localStorage persistence, and E2E testing.

## Overview

This repository provides a battle-tested constitution and templates for building interactive prototypes with:

- ✅ **E2E Testing First** - Playwright tests with localStorage data
- ✅ **Local Storage Persistence** - No backend required
- ✅ **Component-Driven UI** - shadcn/ui + Tailwind CSS
- ✅ **Type-Safe Data** - TypeScript interfaces for all entities
- ✅ **AI-Driven Development** - Autonomous test-fix cycles

## Quick Start

### Option 1: Start a New Project with shadcn-admin Template

Use `tiged` to scaffold a new project from the excellent [shadcn-admin](https://github.com/theplant/shadcn-admin) template:

```bash
# Create new project from shadcn-admin template
npx tiged --mode=git theplant/shadcn-admin my-project
cd my-project
pnpm install

# Add speckit constitution and workflows
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/theplant/speckit-starter-prototype/HEAD/install.sh)"
```

This gives you:
- ✅ Full admin dashboard with sidebar, tables, forms, charts
- ✅ TanStack Router + React Query + Zustand already configured
- ✅ shadcn/ui components pre-installed
- ✅ Speckit constitution and AI workflows

### Option 2: Add to Existing Project (One-Liner)

Run this command in your existing project directory:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/theplant/speckit-starter-prototype/HEAD/install.sh)"
```

This will:
1. Install `uv` via Homebrew if not already installed
2. Initialize spec-kit with Windsurf AI configuration
3. Clone the prototype template
4. Merge `.specify` and `.windsurf` folders into your project

### After Installation

```bash
# Read the constitution for detailed principles
cat .specify/memory/constitution.md

# Review the templates
ls -la .specify/templates/
```

## Workflows

This starter includes Windsurf workflows for AI-driven development.

### ThePlant Discipline Workflows

These workflows enforce development discipline and best practices:

| Command | Description |
|---------|-------------|
| `/theplant.e2e-testing` | Apply E2E testing discipline - Playwright-only with console error capture and HTML dump |
| `/theplant.msw-mock-backend` | Set up MSW to intercept HTTP requests and serve data from localStorage |
| `/theplant.openapi-first` | Define API spec before implementation, generate types, use typed client |
| `/theplant.root-cause-tracing` | Trace problems backward through call chain, fix source not symptoms |
| `/theplant.system-exploration` | Trace route → component → hooks → storage to understand data flow |
| `/theplant.test-data-seeding` | Seed localStorage with typed test data for Zustand persist stores |

### Speckit Feature Workflows

These workflows guide the feature development lifecycle:

| Command | Description |
|---------|-------------|
| `/speckit.specify` | Create feature specification from natural language description |
| `/speckit.clarify` | Identify underspecified areas and ask clarification questions |
| `/speckit.plan` | Generate technical implementation plan with data models and contracts |
| `/speckit.tasks` | Break down plan into actionable, dependency-ordered tasks |
| `/speckit.implement` | Execute tasks with autonomous test-fix cycles |
| `/speckit.analyze` | Cross-artifact consistency and quality analysis |
| `/speckit.checklist` | Generate custom checklist for current feature |

### Typical Workflow

```
/speckit.specify → /speckit.plan → /speckit.tasks → /speckit.implement
```

## Constitution Principles

The constitution (`.specify/memory/constitution.md`) defines core development principles:

### E2E Testing Discipline
- **Playwright-only testing** - No unit tests, no integration tests in isolation
- **Console error capture** - Tests fail immediately on browser console errors
- **HTML dump on failure** - Page content dumped for AI debugging
- **1-second action timeout** - Fast failure for broken selectors

### MSW Mock Backend
- **Mock Service Worker** intercepts HTTP requests
- **localStorage persistence** - All data stored in browser
- **OpenAPI-first** - API contract defined before implementation
- **Type-safe client** - Generated types from OpenAPI spec

### Root Cause Tracing
- **No superficial fixes** - Trace problems to their source
- **No-give-up rule** - AI must continue investigating until root cause found
- **Test-fix cycles** - Autonomous debugging without human intervention

### OpenAPI-First Architecture
- **Schema-first design** - Define API in `openapi.yaml` before coding
- **Generated types** - TypeScript types from `openapi-typescript`
- **Typed API client** - `openapi-fetch` for compile-time safety
- **Backend-ready** - Swap MSW for real API with config change

## Technology Stack

| Category | Technology |
|----------|------------|
| **Language** | TypeScript (strict mode) |
| **Framework** | React with functional components and hooks |
| **Build Tool** | Vite |
| **Package Manager** | pnpm |
| **API Layer** | OpenAPI 3.0+ spec, Orval (types + React Query hooks) |
| **Mock Backend** | MSW (Mock Service Worker) + localStorage |
| **UI** | Tailwind CSS + shadcn/ui + Lucide icons |
| **Testing** | Playwright E2E only |
| **Routing** | TanStack Router (file-based) |

## Project Structure

```
my-prototype/
├── .specify/                    # Spec-kit configuration
│   ├── memory/
│   │   └── constitution.md      # Development principles
│   └── templates/               # Spec, plan, tasks templates
├── .windsurf/
│   └── workflows/               # AI workflow definitions
├── src/
│   ├── api/
│   │   ├── openapi.yaml         # API contract (source of truth)
│   │   ├── generated/           # Generated types (DO NOT EDIT)
│   │   └── client.ts            # Typed API client
│   ├── mocks/
│   │   ├── handlers.ts          # MSW request handlers
│   │   └── browser.ts           # MSW browser worker setup
│   ├── types/                   # TypeScript interfaces
│   ├── hooks/                   # Custom React hooks
│   ├── components/              # Reusable UI components
│   ├── pages/                   # Route-level components
│   └── lib/                     # Utilities (storage.ts, etc.)
└── tests/
    └── e2e/                     # Playwright E2E tests
        └── utils/               # Test helpers, fixtures
```

## Development Workflow

1. **Define API Contract** - Create/update `src/api/openapi.yaml`
2. **Generate Types** - Run `pnpm api:generate`
3. **Write E2E Tests** - Create failing tests in `tests/e2e/`
4. **Implement MSW Handlers** - Add handlers in `src/mocks/handlers.ts`
5. **Build Components** - Implement UI using typed API client
6. **Verify Tests Pass** - Run `pnpm test:e2e`

## Testing Guidelines

### Selector Priority (NON-NEGOTIABLE)
1. `data-testid` - Most stable, survives refactoring
2. `role` - Semantic, accessible (e.g., `getByRole('button')`)
3. `text` - Human-readable but fragile
4. `CSS` - Last resort, most fragile

### Test Data Seeding
```typescript
test('should display products', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((products) => {
    localStorage.setItem('pim-mock-db', JSON.stringify({
      state: { products, isSeeded: true }
    }));
  }, testProducts);
  await page.reload(); // Force Zustand re-hydration
  await page.goto('/products');
  await expect(page.getByText('Test Product')).toBeVisible();
});
```

### Console Error Capture
Tests automatically fail on console errors - no manual assertions needed.

## Command Execution

All CLI commands MUST run with default values:

```bash
# Project setup
pnpm create vite@latest my-app --template react-ts

# shadcn/ui initialization
pnpm dlx shadcn@latest init --defaults

# Playwright setup
pnpm create playwright --yes

# Generate API types
pnpm api:generate
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Links

- **Constitution**: `.specify/memory/constitution.md`
- **Spec-kit**: https://github.com/github/spec-kit
- **This template**: https://github.com/theplant/speckit-starter-prototype

---

**Version**: 2.7.0 | **Last Updated**: 2025-12-18
