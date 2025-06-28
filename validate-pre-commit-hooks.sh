#!/bin/bash
# Test script for pre-commit hooks

set -e

echo "🧪 Testing pre-commit hooks..."
echo ""

# Create a temporary directory for testing
TEST_DIR="test-pre-commit-temp"
mkdir -p "$TEST_DIR"

# Function to cleanup
cleanup() {
    echo "🧹 Cleaning up test files..."
    rm -rf "$TEST_DIR"
    git reset --hard HEAD 2>/dev/null || true
    git clean -fd 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

echo "📝 Test 1: Check test files in root"
echo "Creating test file in root..."
echo "import pytest" > test_example.py
git add test_example.py 2>/dev/null || true
if pre-commit run check-test-files 2>&1 | grep -q "ERROR"; then
    echo "✅ Hook correctly blocked test file in root"
else
    echo "❌ Hook failed to block test file in root"
fi
git reset HEAD test_example.py 2>/dev/null || true
rm -f test_example.py

echo ""
echo "📝 Test 2: Check file prefixes"
echo "Creating file with disallowed prefix..."
echo "console.log('test');" > "$TEST_DIR/test-component.js"
git add "$TEST_DIR/test-component.js" 2>/dev/null || true
if pre-commit run check-file-prefixes 2>&1 | grep -q "ERROR"; then
    echo "✅ Hook correctly blocked file with test- prefix"
else
    echo "❌ Hook failed to block file with test- prefix"
fi
git reset HEAD "$TEST_DIR/test-component.js" 2>/dev/null || true

echo ""
echo "📝 Test 3: Check database files"
echo "Creating database file..."
touch "$TEST_DIR/test.db"
git add "$TEST_DIR/test.db" 2>/dev/null || true
if pre-commit run check-database-files 2>&1 | grep -q "ERROR"; then
    echo "✅ Hook correctly blocked database file"
else
    echo "❌ Hook failed to block database file"
fi
git reset HEAD "$TEST_DIR/test.db" 2>/dev/null || true

echo ""
echo "📝 Test 4: Check file count"
echo "Creating many files..."
for i in {1..25}; do
    echo "content" > "$TEST_DIR/file$i.txt"
done
git add "$TEST_DIR"/*.txt 2>/dev/null || true
if pre-commit run check-file-count 2>&1 | grep -q "ERROR"; then
    echo "✅ Hook correctly blocked commit with too many files"
else
    echo "❌ Hook failed to block commit with too many files"
fi
git reset HEAD "$TEST_DIR"/*.txt 2>/dev/null || true

echo ""
echo "📝 Test 5: Running all hooks on current files"
echo "This will show any existing issues in the codebase..."
echo ""
pre-commit run --all-files || true

echo ""
echo "🎉 Pre-commit hook testing complete!"
echo ""
echo "Note: Some tests may show errors if there are existing issues in the codebase."
echo "The important thing is that the hooks are detecting issues correctly."
