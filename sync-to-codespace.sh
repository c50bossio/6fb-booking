#!/bin/bash

# BookedBarber V2 - Sync Local Changes to GitHub Codespace
# Usage: ./sync-to-codespace.sh [optional-commit-message]

set -e

# Configuration
REPO_NAME="6fb-barber-onboarding"
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
COMMIT_MESSAGE="${1:-Sync development files from Claude Code session}"

echo "🚀 BookedBarber V2 - Syncing to GitHub Codespace"
echo "📁 Repository: $REPO_NAME"
echo "🌿 Branch: $BRANCH_NAME"
echo "💬 Commit Message: $COMMIT_MESSAGE"
echo ""

# Step 1: Stage all changes
echo "📋 Step 1: Staging all changes..."
git add .

# Step 2: Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit. Everything is up to date."
    exit 0
fi

# Step 3: Show what will be committed
echo "📝 Changes to be committed:"
git diff --staged --name-status
echo ""

# Step 4: Commit changes
echo "💾 Step 2: Committing changes..."
git commit -m "$COMMIT_MESSAGE

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Step 5: Push to GitHub
echo "⬆️  Step 3: Pushing to GitHub..."
git push origin $BRANCH_NAME

# Step 6: Provide Codespace instructions
echo ""
echo "✅ Changes successfully synced to GitHub!"
echo ""
echo "🔄 To update your Codespace:"
echo "1. Go to your GitHub Codespace"
echo "2. Run: git pull origin $BRANCH_NAME"
echo "3. Restart containers if needed: docker-compose down && docker-compose -f docker-compose.dev.yml up -d"
echo ""
echo "🌐 Codespace will be available at:"
echo "   Frontend: https://[codespace-name]-3000.app.github.dev"
echo "   Backend:  https://[codespace-name]-8000.app.github.dev"
echo ""
echo "🎯 Development workflow complete!"