---
description: Download a reference UI implementation (shadcn-admin) for AI to use as a guide when building UI/UX components.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

This workflow downloads the [shadcn-admin](https://github.com/theplant/shadcn-admin) project as a reference implementation for UI/UX patterns. The AI should use this codebase as a guide when building user interfaces.

## Steps

1. **Check if reference already exists**:

   ```bash
   ls -la .reference/shadcn-admin 2>/dev/null || echo "NOT_EXISTS"
   ```

   - If the directory exists and contains files, skip to step 4
   - If not exists, proceed to step 2

2. **Create reference directory**:

   ```bash
   mkdir -p .reference
   ```

3. **Download reference implementation**:

   // turbo
   ```bash
   npx tiged --mode=git theplant/shadcn-admin .reference/shadcn-admin
   ```

   This downloads the shadcn-admin template which includes:
   - Modern React + TypeScript setup
   - shadcn/ui components
   - TailwindCSS styling
   - Dashboard layouts and patterns
   - Authentication UI patterns
   - Data table implementations
   - Form patterns with validation
   - Responsive design patterns

4. **Add to .gitignore** (if not already present):

   Check if `.reference/` is in `.gitignore`:
   ```bash
   grep -q "^\.reference/" .gitignore 2>/dev/null || echo ".reference/" >> .gitignore
   ```

5. **Report completion**:

   Confirm the reference UI has been downloaded and is ready for use. Provide a summary of key directories:

   ```
   .reference/shadcn-admin/
   ├── src/
   │   ├── components/    # Reusable UI components
   │   ├── pages/         # Page layouts and patterns
   │   ├── hooks/         # Custom React hooks
   │   └── lib/           # Utility functions
   └── ...
   ```

## Usage Guidelines

When building UI/UX for this project, the AI should:

1. **Reference component patterns** from `.reference/shadcn-admin/src/components/`
2. **Follow layout conventions** from `.reference/shadcn-admin/src/pages/`
3. **Adopt styling patterns** using TailwindCSS classes as demonstrated
4. **Use similar UX patterns** for:
   - Navigation and sidebars
   - Data tables with sorting/filtering
   - Forms with validation feedback
   - Modal dialogs and sheets
   - Toast notifications
   - Loading states and skeletons

## Key Rules

- The `.reference/` directory is for AI reference only, not for direct code copying
- Always adapt patterns to fit the project's specific needs and architecture
- Maintain consistency with existing project conventions when they differ
