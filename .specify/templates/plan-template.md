# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (strict mode)  
**Package Manager**: pnpm  
**Primary Dependencies**: React, Vite, React Router, shadcn/ui, Tailwind CSS, Lucide  
**Storage**: Browser localStorage via Service Worker (OpenAPI-compatible)  
**API Layer**: OpenAPI 3.0+ spec with Service Worker mock backend  
**Code Generation**: `openapi-typescript` for types, `openapi-fetch` for typed client  
**Testing**: Playwright E2E tests only  
**Target Platform**: Web browser (clickable prototype)  
**Project Type**: Single frontend application  
**Constraints**: Prototype uses real HTTP fetch - localStorage served via Service Worker for easy backend migration  
**AI Restriction**: AI agents MUST NOT edit files in `src/api/generated/` - regenerate from OpenAPI spec instead

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── api/           # OpenAPI spec, client, and Service Worker mock
│   ├── openapi.yaml   # OpenAPI 3.0+ specification (deliverable for backend)
│   ├── generated/     # Generated files - DO NOT EDIT (AI must not modify)
│   │   └── schema.d.ts  # Generated types from openapi-typescript
│   ├── client.ts      # Typed API client using openapi-fetch
│   └── worker.ts      # Service Worker that mocks backend via localStorage
├── hooks/         # Custom hooks wrapping typed API client
├── components/    # Reusable UI components (shadcn/ui based)
├── pages/         # Route-level components
├── lib/           # Utilities (storage.ts for worker, etc.)
└── data/          # Seed data for demo/testing

tests/
└── e2e/           # Playwright E2E tests only
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
