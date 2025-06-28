#!/bin/bash
# Installation script for 6fb-booking pre-commit hooks

set -e

echo "🔧 Installing pre-commit hooks for 6fb-booking project..."
echo ""

# Check if we're in the right directory
if [ ! -f ".pre-commit-config.yaml" ]; then
    echo "❌ Error: .pre-commit-config.yaml not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required but not installed."
    echo "Please install Python 3 and try again."
    exit 1
fi

# Install pre-commit if not already installed
if ! command -v pre-commit &> /dev/null; then
    echo "📦 Installing pre-commit framework..."
    pip3 install --user pre-commit
    echo "✅ pre-commit installed successfully"
else
    echo "✅ pre-commit is already installed"
fi

# Create hooks directory if it doesn't exist
if [ ! -d "hooks" ]; then
    echo "📁 Creating hooks directory..."
    mkdir -p hooks
fi

# Make hook scripts executable
echo "🔐 Setting executable permissions on hook scripts..."
chmod +x hooks/*.py

# Install the git hooks
echo "🎣 Installing git hooks..."
pre-commit install

# Create secrets baseline file if it doesn't exist
if [ ! -f ".secrets.baseline" ]; then
    echo "🔒 Creating secrets baseline..."
    # Install detect-secrets if needed
    if ! command -v detect-secrets &> /dev/null; then
        pip3 install --user detect-secrets
    fi
    detect-secrets scan > .secrets.baseline
    echo "✅ Secrets baseline created"
fi

# Run hooks on all files to check current state
echo ""
echo "🔍 Running hooks on all existing files to check current state..."
echo "This may take a moment..."
echo ""

# Run with --all-files but don't fail the installation
pre-commit run --all-files || true

echo ""
echo "✅ Pre-commit hooks installation complete!"
echo ""
echo "The hooks will now run automatically before each commit."
echo ""
echo "📋 Installed hooks:"
echo "  - Check for test files in root directory"
echo "  - Check for disallowed file prefixes"
echo "  - Check for duplicate component implementations"
echo "  - Check for duplicate authentication systems"
echo "  - Check for excessive file count in commits"
echo "  - Check for database files"
echo "  - Check for duplicate API endpoints"
echo "  - Prevent direct commits to main/master branches"
echo "  - Plus standard code quality checks (trailing whitespace, etc.)"
echo ""
echo "To manually run all hooks:"
echo "  pre-commit run --all-files"
echo ""
echo "To skip hooks for a single commit (use sparingly!):"
echo "  git commit --no-verify"
