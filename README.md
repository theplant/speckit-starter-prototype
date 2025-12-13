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

### Step 1: Initialize Your Project with Spec-Kit

```bash
# Create and initialize your new project
uvx --from git+https://github.com/github/spec-kit.git specify init my-prototype

# Navigate to your project
cd my-prototype
```

### Step 2: Overlay the Prototype Template

```bash
git clone --depth 1 git@github.com:theplant/speckit-starter-prototype.git /tmp/speckit-starter-prototype-$$ && cp -r /tmp/speckit-starter-prototype-$$/.specify . && rm -rf /tmp/speckit-starter-prototype-$$
```

### Step 3: Review and Customize

```bash
# Read the constitution for detailed principles
cat .specify/memory/constitution.md

# Review the templates
ls -la .specify/templates/
```

## What You Get

### Constitution (Version 2.0.0)

See [`.specify/memory/constitution.md`](.specify/memory/constitution.md) for the complete set of principles.

### Templates

- `spec-template.md` - Feature specification with user stories
- `plan-template.md` - Implementation planning
- `tasks-template.md` - Task breakdown
- `checklist-template.md` - Development checklist

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Framework**: React with functional components and hooks
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Data Layer**: Browser localStorage + React Context
- **UI**: Tailwind CSS + shadcn/ui + Lucide icons
- **Testing**: Playwright E2E only
- **Routing**: React Router

## Project Structure

```
my-prototype/
├── .specify/              # Spec-kit configuration
│   ├── memory/
│   │   └── constitution.md
│   └── templates/
├── src/
│   ├── types/             # TypeScript interfaces for data entities
│   ├── hooks/             # Custom hooks (useLocalStorage, etc.)
│   ├── components/        # Reusable UI components
│   ├── pages/             # Route-level components
│   ├── lib/               # Utilities (storage.ts, etc.)
│   └── data/              # Seed data for demo/testing
└── tests/
    └── e2e/               # Playwright E2E tests
        └── utils/         # Test utilities
```

## Development Workflow

1. **Define Types**: Create TypeScript interfaces in `src/types/`
2. **Write E2E Tests**: Create failing tests in `tests/e2e/`
3. **Verify Tests Fail**: `pnpm test:e2e` - new tests MUST fail
4. **Implement Storage**: Create localStorage hooks/utilities
5. **Implement Components**: Build UI components consuming hooks
6. **Verify Tests Pass**: Run full test suite - all tests MUST pass

## Testing Requirements

All testing is done with Playwright E2E tests:

- ✅ Tests use localStorage for data persistence
- ✅ All routes and user interactions covered
- ✅ Console errors captured and visible in output
- ✅ Tests are independent and can run in parallel
- ✅ Playwright runs on port 5199 to avoid dev server conflicts
- ✅ AI-driven autonomous test-fix cycles

## Command Execution

All CLI commands MUST run with default values - never wait for user input:

```bash
# Project setup
pnpm create vite@latest my-app --template react-ts

# shadcn/ui initialization
pnpm dlx shadcn@latest init --defaults

# Playwright setup
pnpm create playwright --yes
```

## Contributing

This template is designed to be forked and customized. Feel free to:

- Modify the constitution for your specific prototype needs
- Add organization-specific UI principles
- Customize templates
- Share improvements back to the community

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- Constitution: See `.specify/memory/constitution.md`
- Spec-kit base: https://github.com/github/spec-kit
- This template: https://github.com/theplant/speckit-starter-prototype

---

**Version**: 2.0.0 | **Last Updated**: 2025-12-13
