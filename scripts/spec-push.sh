#!/bin/bash

# Spec Push Script
# Pushes .specify and .windsurf to speckit-starter-prototype repo

HISTORY_FILE=".spec-push-history"
REMOTE_URL="git@github.com:theplant/speckit-starter-prototype.git"
TEMP_DIR=$(mktemp -d)

# Read last used branch name
last_branch=""
if [ -f "$HISTORY_FILE" ]; then
    last_branch=$(cat "$HISTORY_FILE")
fi

# Display prompt
echo "=== Spec Push to $REMOTE_URL ==="
echo ""

if [ -n "$last_branch" ]; then
    echo "Last used branch: $last_branch"
    read -p "Enter branch name (press Enter to use '$last_branch'): " input_branch
    branch=${input_branch:-$last_branch}
else
    read -p "Enter branch name (e.g., feat/my-feature): " branch
fi

# Validate branch name is not empty
if [ -z "$branch" ]; then
    echo "Error: Branch name cannot be empty"
    exit 1
fi

# Save branch name to history
echo "$branch" > "$HISTORY_FILE"

echo ""
echo "Pushing specs to branch: $branch"
echo ""

# Clone the repo to temp directory
echo "Cloning speckit-starter-prototype..."
git clone "$REMOTE_URL" "$TEMP_DIR" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "✗ Failed to clone repository"
    rm -rf "$TEMP_DIR"
    exit 1
fi

cd "$TEMP_DIR"

# Checkout or create branch
git checkout "$branch" 2>/dev/null || git checkout -b "$branch"

# Sync .specify directory
if [ -d "$OLDPWD/.specify" ]; then
    echo "Syncing .specify..."
    rm -rf .specify
    cp -r "$OLDPWD/.specify" .specify
fi

# Sync .windsurf directory
if [ -d "$OLDPWD/.windsurf" ]; then
    echo "Syncing .windsurf..."
    rm -rf .windsurf
    cp -r "$OLDPWD/.windsurf" .windsurf
fi

# Function to create or show PR
create_or_show_pr() {
    echo ""
    echo "Creating PR to main branch..."
    pr_url=$(gh pr create --base main --head "$branch" --title "Update specs from $branch" --body "Automated spec sync from loyalty-console" 2>&1)
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ PR created successfully!"
        echo "🔗 PR URL: $pr_url"
    else
        # Check if PR already exists
        if echo "$pr_url" | grep -q "already exists"; then
            existing_pr=$(gh pr view "$branch" --json url --jq '.url' 2>/dev/null)
            echo ""
            echo "ℹ PR already exists for this branch"
            echo "🔗 PR URL: $existing_pr"
        else
            echo ""
            echo "⚠ Failed to create PR: $pr_url"
            echo "You can create it manually at: https://github.com/theplant/speckit-starter-prototype/pull/new/$branch"
        fi
    fi
}

# Commit and push
git add -A
git commit -m "Update specs from qortexjs" 2>/dev/null
commit_status=$?

if [ $commit_status -eq 0 ]; then
    git push origin "$branch"
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Successfully pushed to $branch"
        create_or_show_pr
    else
        echo ""
        echo "✗ Failed to push to $branch"
        cd "$OLDPWD"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
else
    echo ""
    echo "No changes to push"
    # Still create/show PR even if no new changes
    create_or_show_pr
fi

# Cleanup
cd "$OLDPWD"
rm -rf "$TEMP_DIR"
