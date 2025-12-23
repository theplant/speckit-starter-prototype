---
description: Apply UI Reference Template pattern - use shadcn-admin template as reference for UI/UX implementation, ensuring consistent design patterns and component usage.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Ensure all UI/UX implementation follows the patterns and best practices from the shadcn-admin template project. This workflow guides developers to reference the template for consistent UI design, component usage, and UX patterns.

## Rationale (UI-CONSISTENCY)

Consistent UI/UX improves user experience and reduces development time. By referencing a well-designed template project, we ensure:
- Consistent component usage across the application
- Best practices for layout, navigation, and forms
- Proven UX patterns for common interactions
- Reduced decision fatigue for UI implementation

## Template Project Setup

### 1. Generate Template (One-time Setup)

The template project is generated using `tiged` and committed to the repository. If the template directory does not exist, generate it:

```bash
# Check if template exists
ls .reference/shadcn-admin

# If not exists, generate it
npx tiged --mode=git satnaing/shadcn-admin .reference/shadcn-admin
```

**IMPORTANT**: The `.reference/shadcn-admin` directory is committed to the repository. Do NOT regenerate if it already exists.

### 2. Verify Template Exclusions

The template directory MUST be excluded from all tooling checks. Verify these configurations:

#### knip.config.ts
```typescript
const config: KnipConfig = {
  ignore: [
    // ... existing ignores
    '.reference/**',
  ],
  // ...
}
```

#### eslint.config.js
```javascript
export default [
  {
    ignores: [
      // ... existing ignores
      '.reference/**',
    ],
  },
  // ...
]
```

#### tsconfig.json (if needed)
```json
{
  "exclude": [
    ".reference"
  ]
}
```

#### .prettierignore
```
.reference/
```

## Core Principles (NON-NEGOTIABLE)

### UI Implementation MUST Reference Template

When implementing any UI feature, you MUST:

1. **Search the template first** for similar components or patterns
2. **Study the implementation** in the template before writing new code
3. **Follow the same patterns** for consistency
4. **Adapt, don't copy blindly** - understand the pattern and apply it to your context

### Reference Lookup Process

```bash
# Find similar components in template
grep -r "DataTable" .reference/shadcn-admin/src/
grep -r "Dialog" .reference/shadcn-admin/src/
grep -r "Form" .reference/shadcn-admin/src/

# Read specific component implementation
cat .reference/shadcn-admin/src/components/data-table/data-table.tsx
```

## Execution Steps

### 1. Before Implementing UI

Before writing any UI code, search the template for similar patterns:

| UI Feature | Template Location to Check |
|------------|---------------------------|
| Data tables | `.reference/shadcn-admin/src/components/data-table/` |
| Forms | `.reference/shadcn-admin/src/features/*/components/` |
| Dialogs/Modals | Search for `Dialog` usage |
| Navigation | `.reference/shadcn-admin/src/components/layout/` |
| Dashboard | `.reference/shadcn-admin/src/features/dashboard/` |
| Authentication | `.reference/shadcn-admin/src/features/auth/` |
| Settings | `.reference/shadcn-admin/src/features/settings/` |

### 2. Study Template Patterns

When you find a relevant component in the template:

1. **Read the full implementation** - understand all props and behaviors
2. **Check the styling approach** - Tailwind classes, variants, responsive design
3. **Note the component composition** - how smaller components are combined
4. **Understand the data flow** - props, state, hooks usage

### 3. Apply Patterns Consistently

When implementing your feature:

```typescript
// ✅ GOOD: Follow template patterns
// If template uses shadcn/ui Button with specific variants, use the same
import { Button } from '@/components/ui/button'
<Button variant="outline" size="sm">Action</Button>

// ❌ BAD: Invent new patterns without checking template
<button className="custom-btn">Action</button>
```

### 4. Common UI Patterns from Template

#### Page Structure Pattern (CRITICAL)

**IMPORTANT**: Every feature page MUST follow the complete page structure from template. Do NOT only focus on the content area.

**ALWAYS reference the template file directly** - do NOT hardcode patterns:

```bash
# Step 1: Read the template's feature page structure
cat .reference/shadcn-admin/src/features/users/index.tsx

# Step 2: Identify the page structure components (Header, Main, etc.)
# Step 3: Apply the SAME structure to your feature page
```

Key points when referencing the template:
- **Header section**: Check what components are included in `<Header>` (may include Search, ThemeSwitch, ConfigDrawer, ProfileDropdown, etc.)
- **Main section**: Check the className and layout structure
- **Provider pattern**: Check how the feature wraps its content
- **Dialogs placement**: Check where dialogs are rendered

**DO NOT copy code from this workflow file** - always read the actual template file to get the latest implementation.

#### Data Table Pattern
```typescript
// Reference: .reference/shadcn-admin/src/components/data-table/
// - Column definitions with sorting, filtering
// - Row actions with dropdown menu
// - Pagination controls
// - Toolbar with search and filters
```

#### Form Pattern
```typescript
// Reference: .reference/shadcn-admin/src/features/*/components/*-form.tsx
// - React Hook Form with Zod validation
// - Form field components with labels and errors
// - Submit button with loading state
// - Form layout and spacing
```

#### Dialog Pattern
```typescript
// Reference: Search for Dialog usage in template
// - Controlled open state
// - Header with title and description
// - Footer with action buttons
// - Form inside dialog pattern
```

#### Layout Pattern
```typescript
// Reference: .reference/shadcn-admin/src/components/layout/
// - Sidebar navigation
// - Header with user menu
// - Main content area
// - Responsive design
```

## Quality Gates

- UI implementation MUST reference template patterns before writing new code
- New components MUST follow template's component structure
- Styling MUST use Tailwind classes consistent with template
- Forms MUST follow template's form patterns (React Hook Form + Zod)
- Tables MUST follow template's data table patterns

## Feature Page Implementation Checklist

When implementing or refactoring a feature page, verify ALL items below by **comparing with the template**:

### Page Structure Checklist

**Reference**: `.reference/shadcn-admin/src/features/users/index.tsx`

- [ ] **Header component** - Page includes `<Header>` with the same children as template (read template to verify)
- [ ] **Main component** - Content wrapped in `<Main>` with same className as template
- [ ] **Page title section** - Follows same layout pattern as template
- [ ] **Primary buttons** - Positioned same as template (if applicable)

### Feature Components Checklist

**Reference**: `.reference/shadcn-admin/src/features/users/components/`

- [ ] **Provider** - Feature wrapped in context provider (check `users-provider.tsx`)
- [ ] **Table** - Uses `@tanstack/react-table` (check `users-table.tsx`)
  - [ ] Column definitions in separate file (check `users-columns.tsx`)
  - [ ] Row actions component (check `data-table-row-actions.tsx`)
  - [ ] Toolbar and pagination (check template's data-table components)
- [ ] **Dialogs** - Centralized dialog rendering (check `users-dialogs.tsx`)
- [ ] **Primary buttons** - Extracted to separate component (check `users-primary-buttons.tsx`)

### Common Mistakes to Avoid

| Mistake | Correct Approach |
|---------|------------------|
| Missing `Header` component | Read template's feature `index.tsx` and include the same Header structure |
| Only refactoring `Main` content | Check **complete** page structure from template's feature `index.tsx` |
| Hardcoding patterns from workflow | Always read the **actual template files** for latest implementation |
| Manual table implementation | Reference template's table components and patterns |
| Inline dialog state management | Check template's Provider pattern |
| Inline row actions | Check template's `data-table-row-actions.tsx` |

## AI Agent Requirements

- AI agents MUST search template before implementing UI features
- AI agents MUST read and understand template patterns before writing code
- AI agents MUST follow template's component composition patterns
- AI agents MUST use consistent styling with template
- AI agents MUST NOT invent new UI patterns without checking template first
- AI agents MUST cite template file paths when implementing similar features
- AI agents MUST check the **complete page structure** from template's feature `index.tsx`, not just the content area
- AI agents MUST verify the Feature Page Implementation Checklist before completing any UI refactoring task
- AI agents MUST read the actual template files to determine Header contents - do NOT assume or hardcode component names
- AI agents MUST NOT copy code patterns from this workflow file - always read the template source files directly

## Template Directory Structure

```
.reference/shadcn-admin/
├── src/
│   ├── components/
│   │   ├── data-table/     # Table components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # shadcn/ui components
│   ├── features/
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Dashboard components
│   │   ├── settings/       # Settings pages
│   │   ├── tasks/          # Task management
│   │   └── users/          # User management
│   └── hooks/              # Custom hooks
├── public/                 # Static assets
└── package.json           # Dependencies reference
```

## Context

$ARGUMENTS
