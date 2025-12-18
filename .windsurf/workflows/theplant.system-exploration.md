---
description: Apply System Exploration Protocol before writing tests - trace BOTH read paths (storage → UI) AND write paths (UI → storage) to understand complete data flow.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Before writing tests for an unfamiliar system, follow the System Exploration Protocol (SEP) to understand **BOTH** the read path (storage → UI) **AND** the write path (UI → storage). This ensures tests cover both data display AND data mutation (forms, CRUD operations).

## Rationale (ROOT-CAUSE-TRACING)

Root cause analysis requires understanding the full system. The System Exploration Protocol ensures AI agents understand the **complete bidirectional data flow** before writing tests or debugging issues. This prevents superficial fixes and ensures tests validate actual behavior for both viewing AND modifying data.

## Core Principles (NON-NEGOTIABLE)

### System Exploration Protocol - Two Directions

For every feature, AI agents MUST trace **BOTH** code paths:

**READ Path (Data Display):**
```
Route → Component → Query Hook → GET API → MSW Handler → Storage
```

**WRITE Path (Data Mutation):**
```
Form/Button → Submit Handler → Mutation Hook → POST/PUT/DELETE API → MSW Handler → Storage
```

The READ trace reveals:
- What data entities the route displays
- What fields are required for each entity
- What relationships exist between entities
- What localStorage key to use for seeding

The WRITE trace reveals:
- What forms exist and what fields they contain
- What validation is applied (client-side and server-side)
- What mutation hooks are used (useCreateX, useUpdateX, useDeleteX)
- What API endpoints handle mutations (POST, PUT, DELETE)
- How MSW handlers persist data to localStorage
- What cache invalidation happens after mutation

## Execution Steps

### Step 1: Read Route Definitions

Explore `src/routes/` directory structure:

```bash
# List all route files
find src/routes -name "*.tsx" | head -50

# Or use list_dir on src/routes/
```

Note:
- Route file paths (e.g., `_authenticated/products/index.tsx`)
- Route parameters (e.g., `$id` in `products/$id.tsx`)
- Authentication requirements (e.g., `_authenticated` folder)

### Step 2: Trace READ Path (Data Display) (NON-NEGOTIABLE)

For each route, trace the full READ code path:

1. **Read the route file** to find which component it renders
2. **Read the component** to find which query hooks it uses (useListX, useGetX)
3. **Read the hooks** to find which GET API endpoints it calls
4. **Read the MSW handlers** to understand how data is read from storage

### Step 3: Trace WRITE Path (Data Mutation) (NON-NEGOTIABLE)

For each feature, trace the full WRITE code path:

1. **Find forms/dialogs** in the component (look for `<form>`, `<Dialog>`, modal components)
2. **Find submit handlers** (onSubmit, onClick for save/delete buttons)
3. **Find mutation hooks** (useCreateX, useUpdateX, useDeleteX)
4. **Read the mutation hooks** to find which POST/PUT/DELETE API endpoints they call
5. **Read the MSW handlers** to understand how data is persisted to storage
6. **Check cache invalidation** (queryClient.invalidateQueries after mutation)

**Common patterns to look for:**
```typescript
// Form with react-hook-form
const form = useForm<CreateUserRequest>({ ... })
const createUser = useCreateUser()
const onSubmit = (data) => createUser.mutate({ data })

// Delete button
const deleteUser = useDeleteUser()
onClick={() => deleteUser.mutate({ userId: user.id })}

// Inline edit
const updateTask = useUpdateTask()
onBlur={(e) => updateTask.mutate({ taskId, data: { title: e.target.value } })}
```

### Step 4: Document the Code Trace (Both Directions)

Document BOTH traces as comments in the test file:

```typescript
// ─────────────────────────────────────────────────────────────
// Users (SEP: /users)
// 
// READ Path (Data Display):
//   src/routes/_authenticated/users/index.tsx
//     → renders Users component
//       → src/features/users/index.tsx
//         → uses useListUsers() hook
//           → HTTP GET /api/v1/users
//             → MSW handler reads from localStorage
//               → key: 'iam-console-users'
//
// WRITE Path (Create User):
//   UsersDialogs component
//     → UsersActionDialog (type="add")
//       → UserForm with react-hook-form
//         → onSubmit calls useCreateUser().mutate()
//           → HTTP POST /api/v1/users
//             → MSW handler writes to localStorage
//               → key: 'iam-console-users'
//             → Returns created user
//         → queryClient.invalidateQueries(['users'])
//
// WRITE Path (Update User):
//   UsersActionDialog (type="edit")
//     → UserForm pre-filled with user data
//       → onSubmit calls useUpdateUser().mutate()
//         → HTTP PUT /api/v1/users/:userId
//           → MSW handler updates localStorage
//
// WRITE Path (Delete User):
//   UsersDeleteDialog
//     → onConfirm calls useDeleteUser().mutate()
//       → HTTP DELETE /api/v1/users/:userId
//         → MSW handler removes from localStorage
// ─────────────────────────────────────────────────────────────
```

### Step 5: Identify Required Test Data

From the storage layer trace, identify:

| Question | How to Find |
|----------|-------------|
| What entities? | Look at state arrays in store.ts |
| What fields required? | Check TypeScript types in src/types/ |
| What relationships? | Look for `*Id` or `*Ids` fields |
| What localStorage key? | Check `name` in persist config |

### Step 6: Identify Data Scenarios to Test

For each route, plan tests for these scenarios:

**READ Tests (Data Display):**
| Scenario | Test Data | Expected Behavior |
|----------|-----------|-------------------|
| Empty state | `[]` | Shows empty state message |
| Single item | `[{...}]` | Shows single item correctly |
| Multiple items | `[{...}, {...}]` | Shows all items |

**WRITE Tests (Data Mutation):**
| Scenario | Action | Expected Behavior |
|----------|--------|-------------------|
| Create | Fill form, submit | New item appears in list, localStorage updated |
| Update | Edit existing item | Changes reflected in list, localStorage updated |
| Delete | Confirm delete | Item removed from list, localStorage updated |
| Validation | Submit invalid data | Error messages shown, no API call made |
| Optimistic update | Mutate with slow network | UI updates immediately, reverts on error |

### Step 7: Write Tests for Both Paths

Use the traced information to write tests:

```typescript
test.describe('Users CRUD', () => {
  // ─────────────────────────────────────────────────────────────
  // READ Tests
  // ─────────────────────────────────────────────────────────────
  
  test('should display users with seeded data', async ({ page }) => {
    await page.goto('/users');
    // Assert on default seed data
    await expect(page.getByText('johndoe')).toBeVisible();
  });

  test('should show empty state when no users exist', async ({ page }) => {
    await seedAndNavigate(page, '/users', { users: [] });
    await expect(page.getByText(/no results/i)).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // WRITE Tests (Create)
  // ─────────────────────────────────────────────────────────────
  
  test('should create new user via form', async ({ page }) => {
    await page.goto('/users');
    
    // Open create dialog
    await page.getByRole('button', { name: /add user/i }).click();
    
    // Fill form
    await page.getByLabel(/username/i).fill('newuser');
    await page.getByLabel(/email/i).fill('new@example.com');
    await page.getByLabel(/first name/i).fill('New');
    await page.getByLabel(/last name/i).fill('User');
    
    // Submit
    await page.getByRole('button', { name: /save|create|submit/i }).click();
    
    // Verify new user appears in list
    await expect(page.getByText('newuser')).toBeVisible();
    
    // Verify localStorage was updated
    const users = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('iam-console-users') || '[]');
    });
    expect(users.some((u: any) => u.username === 'newuser')).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────
  // WRITE Tests (Update)
  // ─────────────────────────────────────────────────────────────
  
  test('should update existing user', async ({ page }) => {
    await page.goto('/users');
    
    // Click edit on first user
    await page.getByRole('button', { name: /open menu/i }).first().click();
    await page.getByRole('menuitem', { name: /edit/i }).click();
    
    // Modify form
    await page.getByLabel(/first name/i).fill('Updated');
    
    // Submit
    await page.getByRole('button', { name: /save|update/i }).click();
    
    // Verify change appears
    await expect(page.getByText('Updated')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // WRITE Tests (Delete)
  // ─────────────────────────────────────────────────────────────
  
  test('should delete user', async ({ page }) => {
    await page.goto('/users');
    
    // Get initial count
    const initialRows = await page.getByRole('row').count();
    
    // Click delete on first user
    await page.getByRole('button', { name: /open menu/i }).first().click();
    await page.getByRole('menuitem', { name: /delete/i }).click();
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm|delete/i }).click();
    
    // Verify row count decreased
    await expect(page.getByRole('row')).toHaveCount(initialRows - 1);
  });

  // ─────────────────────────────────────────────────────────────
  // WRITE Tests (Validation)
  // ─────────────────────────────────────────────────────────────
  
  test('should show validation errors for invalid form', async ({ page }) => {
    await page.goto('/users');
    
    // Open create dialog
    await page.getByRole('button', { name: /add user/i }).click();
    
    // Submit empty form
    await page.getByRole('button', { name: /save|create/i }).click();
    
    // Verify validation errors shown
    await expect(page.getByText(/required|invalid/i)).toBeVisible();
  });
});

## Example Code Traces (Both Directions)

### Feature: Users (`/users`)

**READ Path:**
```
src/routes/_authenticated/users/index.tsx
  → renders Users component
    → src/features/users/index.tsx
      → uses useListUsers() hook (from @/api/generated/endpoints/users)
        → HTTP GET /api/v1/users
          → MSW handler (src/mocks/handlers.ts)
            → reads from localStorage key: 'iam-console-users'
```

**WRITE Paths:**
```
CREATE:
  UsersActionDialog (type="add")
    → UserForm component with react-hook-form
      → onSubmit calls useCreateUser().mutate()
        → HTTP POST /api/v1/users
          → MSW handler writes to localStorage
          → queryClient.invalidateQueries(['listUsers'])

UPDATE:
  UsersActionDialog (type="edit")
    → UserForm pre-filled with existing user data
      → onSubmit calls useUpdateUser().mutate()
        → HTTP PUT /api/v1/users/:userId
          → MSW handler updates localStorage

DELETE:
  UsersDeleteDialog
    → onConfirm calls useDeleteUser().mutate()
      → HTTP DELETE /api/v1/users/:userId
        → MSW handler removes from localStorage
```

### Feature: Tasks (`/tasks`)

**READ Path:**
```
src/routes/_authenticated/tasks/index.tsx
  → renders Tasks component
    → src/features/tasks/index.tsx
      → uses useListTasks() hook
        → HTTP GET /api/v1/tasks
          → MSW handler reads from localStorage key: 'iam-console-tasks'
```

**WRITE Paths:**
```
UPDATE (inline):
  DataTableRowActions component
    → Dropdown menu with status/priority options
      → onClick calls useUpdateTask().mutate()
        → HTTP PUT /api/v1/tasks/:taskId
          → MSW handler updates localStorage

DELETE:
  DataTableRowActions → Delete menu item
    → onClick calls useDeleteTask().mutate()
      → HTTP DELETE /api/v1/tasks/:taskId
        → MSW handler removes from localStorage
```

## CRITICAL: AI agents MUST NOT

- Guess what data exists in the system
- Write tests that pass regardless of data
- Use generic assertions that don't verify actual content
- Skip the storage layer trace step
- Implement fixes without understanding the full code path
- **Trace only READ paths and ignore WRITE paths** (forms, mutations, CRUD)
- **Write only display tests without mutation tests** (create, update, delete)

## AI Agent Requirements

- AI agents MUST complete System Exploration Protocol before writing tests for unfamiliar routes
- AI agents MUST trace **BOTH** READ and WRITE paths for every feature
- AI agents MUST document the code trace in test files (both directions)
- AI agents MUST use correct localStorage keys from store configuration
- AI agents MUST apply Root Cause Tracing (ROOT-CAUSE-TRACING) when tests fail
- AI agents MUST verify data flow matches OpenAPI spec (OPENAPI-FIRST)
- AI agents MUST write tests for CRUD operations (create, update, delete), not just display
- AI agents MUST find forms/dialogs and trace their submit handlers to mutation hooks

## Integration with Other Workflows

- **theplant.test-data-seeding**: Use traced localStorage keys for data seeding
- **theplant.openapi-first**: Verify API calls match OpenAPI spec
- **theplant.msw-mock-backend**: Verify MSW handlers implement traced endpoints
- **theplant.root-cause-tracing**: Use code trace for debugging

## Context

$ARGUMENTS
