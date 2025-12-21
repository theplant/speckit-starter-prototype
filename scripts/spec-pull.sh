#!/bin/bash

# Spec Pull Script
# Pulls .specify and .windsurf from speckit-starter-prototype repo

REMOTE_URL="git@github.com:theplant/speckit-starter-prototype.git"
TEMP_DIR=$(mktemp -d)

echo "=== Spec Pull from $REMOTE_URL ==="
echo ""

# Clone the repo to temp directory
echo "Cloning speckit-starter-prototype..."
git clone --depth 1 "$REMOTE_URL" "$TEMP_DIR" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "✗ Failed to clone repository"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Sync .specify directory
if [ -d "$TEMP_DIR/.specify" ]; then
    echo "Syncing .specify..."
    rsync -av --delete "$TEMP_DIR/.specify/" ".specify/"
fi

# Sync .windsurf directory
if [ -d "$TEMP_DIR/.windsurf" ]; then
    echo "Syncing .windsurf..."
    rsync -av --delete "$TEMP_DIR/.windsurf/" ".windsurf/"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✓ Successfully pulled specs"
echo ""
echo "Note: Review changes with 'git status' and commit if needed"
