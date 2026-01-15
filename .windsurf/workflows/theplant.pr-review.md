---
description: Review a GitHub PR, summarize changes, generate a well-structured PR description in markdown, and update it on GitHub.
---

## User Input

```text
$ARGUMENTS
```

The user input should be a **GitHub PR number** (e.g., `9`, `42`, `123`).

## Goal

Automate PR review workflow:

1. Fetch PR details and diff from GitHub
2. Review and analyze the code changes
3. Generate a comprehensive PR description in markdown
4. Update the PR description on GitHub

## Preconditions

- `gh` CLI must be installed and authenticated
- Must be in a git repository with a GitHub remote

## Execution Steps

### 1) Validate Input

Extract PR number from `$ARGUMENTS`. If empty or invalid, ask user for the PR number.

### 2) Fetch PR Information

Get basic PR info:

```bash
gh pr view $PR_NUMBER --json title,body,headRefName,baseRefName,author,additions,deletions,changedFiles,commits
```

### 3) Fetch PR Diff

Get the full diff for analysis:

```bash
gh pr diff $PR_NUMBER
```

### 4) Fetch Changed Files List

```bash
gh pr view $PR_NUMBER --json files --jq '.files[].path'
```

### 5) Analyze Changes

Review the diff and categorize changes:

- **New Features**: New functionality added
- **Bug Fixes**: Issues resolved
- **Refactoring**: Code improvements without behavior change
- **Documentation**: Doc updates
- **Tests**: Test additions or modifications
- **Dependencies**: Package updates
- **Configuration**: Config file changes

For each category, identify:

- What changed
- Why it matters
- Any potential concerns or suggestions

### 6) Generate PR Description

Create a well-structured markdown description following this template:

```markdown
## Summary

[Brief one-line summary of what this PR does]

## Changes

### [Category 1]

- [Change description]
- [Change description]

### [Category 2]

- [Change description]

## Technical Details

[Any important implementation details, architectural decisions, or technical notes]

## Testing

[How the changes were tested or should be tested]

## Related Issues

[Link to related issues if any, or "N/A"]

## Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated as needed
- [ ] Documentation updated if needed
```

### 7) Preview Description

Show the generated description to the user for review before updating.

### 8) Update PR Description

After user confirms (or automatically if user specified), update the PR:

```bash
gh pr edit $PR_NUMBER --body "$DESCRIPTION"
```

## Output Format

The workflow should:

1. Display a summary of the PR changes
2. Show the generated description
3. Ask for confirmation before updating (unless `--auto` flag is provided in arguments)
4. Report success/failure of the update

## Notes

- Keep descriptions concise but informative
- Use bullet points for readability
- Highlight breaking changes prominently
- Include migration notes if applicable
- Preserve any existing issue links or references
