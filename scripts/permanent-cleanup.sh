#!/bin/bash

# PERMANENT CLEANUP SCRIPT - Makes cleanup stick
# This script removes clutter and sets up enforcement

set -e

echo "🧹 Starting PERMANENT cleanup..."

# Create necessary directories
echo "📁 Creating organized directory structure..."
mkdir -p docs/{deployment,setup,api,features,archive}
mkdir -p tests/{backend,frontend,integration,e2e}
mkdir -p data
mkdir -p logs
mkdir -p scripts/{development,deployment,maintenance}
mkdir -p archive/{old-tests,old-scripts,old-docs}

# Move documentation files
echo "📚 Moving documentation to /docs..."
# Move deployment docs
mv -f *deployment*.md docs/deployment/ 2>/dev/null || true
mv -f *deploy*.md docs/deployment/ 2>/dev/null || true
mv -f *railway*.md docs/deployment/ 2>/dev/null || true
mv -f *render*.md docs/deployment/ 2>/dev/null || true
mv -f *vercel*.md docs/deployment/ 2>/dev/null || true

# Move setup docs
mv -f *setup*.md docs/setup/ 2>/dev/null || true
mv -f *install*.md docs/setup/ 2>/dev/null || true
mv -f *configuration*.md docs/setup/ 2>/dev/null || true

# Move feature docs
mv -f *implementation*.md docs/features/ 2>/dev/null || true
mv -f *feature*.md docs/features/ 2>/dev/null || true
mv -f *integration*.md docs/features/ 2>/dev/null || true

# Archive old test files
echo "🗄️  Archiving test files..."
mv -f test_*.py archive/old-tests/ 2>/dev/null || true
mv -f backend/test_*.py archive/old-tests/backend/ 2>/dev/null || true
mv -f frontend/test_*.py archive/old-tests/frontend/ 2>/dev/null || true
mv -f *_test_*.json archive/old-tests/ 2>/dev/null || true
mv -f *_test_*.html archive/old-tests/ 2>/dev/null || true
mv -f test-*.js archive/old-tests/ 2>/dev/null || true

# Move database files
echo "💾 Moving database files to /data..."
mv -f *.db data/ 2>/dev/null || true
mv -f *.sqlite data/ 2>/dev/null || true
mv -f backend/*.db data/ 2>/dev/null || true
mv -f frontend/*.db data/ 2>/dev/null || true

# Move log files
echo "📋 Moving log files to /logs..."
mv -f *.log logs/ 2>/dev/null || true
mv -f backend/*.log logs/ 2>/dev/null || true
mv -f frontend/*.log logs/ 2>/dev/null || true

# Remove PID files
echo "🔄 Removing PID files..."
rm -f *.pid
rm -f backend/*.pid
rm -f frontend/*.pid

# Move scripts to proper locations
echo "🔧 Organizing scripts..."
mv -f start-*.sh scripts/development/ 2>/dev/null || true
mv -f deploy-*.sh scripts/deployment/ 2>/dev/null || true
mv -f create-*.sh scripts/maintenance/ 2>/dev/null || true
mv -f restore-*.sh scripts/maintenance/ 2>/dev/null || true

# Use the strict gitignore
echo "🚫 Applying strict .gitignore..."
cp .gitignore-strict .gitignore

# Remove files that should never have been tracked
echo "🗑️  Removing files that shouldn't be tracked..."
git rm --cached *.db 2>/dev/null || true
git rm --cached *.log 2>/dev/null || true
git rm --cached *.pid 2>/dev/null || true
git rm --cached backend/test_*.py 2>/dev/null || true
git rm --cached test_*.py 2>/dev/null || true
git rm --cached *_test_results.json 2>/dev/null || true
git rm --cached frontend/public/*test*.html 2>/dev/null || true
git rm --cached frontend/public/*debug*.html 2>/dev/null || true

# Create pre-commit hook to prevent future mess
echo "🔒 Installing pre-commit hook..."
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Pre-commit hook to prevent committing test files and clutter

# Check for test files in root
if git diff --cached --name-only | grep -E '^test_.*\.py$'; then
    echo "❌ Error: Test files detected in root directory"
    echo "Move test files to tests/ directory"
    exit 1
fi

# Check for database files
if git diff --cached --name-only | grep -E '\.(db|sqlite|sqlite3)$'; then
    echo "❌ Error: Database files should not be committed"
    exit 1
fi

# Check for log files
if git diff --cached --name-only | grep -E '\.log$'; then
    echo "❌ Error: Log files should not be committed"
    exit 1
fi

# Check for test result files
if git diff --cached --name-only | grep -E '_test_results?\.(json|md)$'; then
    echo "❌ Error: Test result files should not be committed"
    exit 1
fi

# Check for PID files
if git diff --cached --name-only | grep -E '\.pid$'; then
    echo "❌ Error: PID files should not be committed"
    exit 1
fi

echo "✅ Pre-commit checks passed"
EOF

chmod +x .git/hooks/pre-commit

# Create a cleanup reminder script
cat > scripts/maintenance/daily-cleanup.sh << 'EOF'
#!/bin/bash

# Daily cleanup script - run this regularly

echo "🧹 Running daily cleanup..."

# Remove test files created during development
find . -name "test_*.py" -not -path "./tests/*" -not -path "./*/tests/*" -delete
find . -name "*_test_results.*" -delete
find . -name "*_test_report.*" -delete

# Clean up logs older than 7 days
find logs/ -name "*.log" -mtime +7 -delete

# Remove temporary files
find . -name "*.tmp" -delete
find . -name "*.temp" -delete

# Remove PID files
find . -name "*.pid" -delete

echo "✅ Cleanup complete"
EOF

chmod +x scripts/maintenance/daily-cleanup.sh

# Summary
echo ""
echo "✅ PERMANENT CLEANUP COMPLETE!"
echo ""
echo "📊 What was done:"
echo "   - Created organized directory structure"
echo "   - Moved files to appropriate locations"
echo "   - Applied strict .gitignore"
echo "   - Installed pre-commit hook to prevent future clutter"
echo "   - Created daily cleanup script"
echo ""
echo "🔧 To maintain cleanliness:"
echo "   1. Run 'scripts/maintenance/daily-cleanup.sh' regularly"
echo "   2. Pre-commit hook will block bad commits"
echo "   3. Use proper directories for new files"
echo ""
echo "📝 Next steps:"
echo "   1. Review files in /archive directory"
echo "   2. Delete what's not needed"
echo "   3. Commit these changes"
echo ""
echo "Run 'git status' to see the cleanup results"