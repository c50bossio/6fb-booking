#!/bin/bash
# Activate the duplication prevention system

echo "🚀 Activating Duplication Prevention System..."

# Check if pre-commit is installed
if ! command -v pre-commit &> /dev/null; then
    echo "📦 Installing pre-commit..."
    pip install pre-commit
fi

# Install pre-commit hooks
echo "🔧 Installing pre-commit hooks..."
cd /Users/bossio/6fb-booking
pre-commit install

# Run initial duplication check
echo "🔍 Running initial duplication check..."
cd backend-v2
python utils/duplication_detector.py

echo ""
echo "✅ Duplication Prevention System is now ACTIVE!"
echo ""
echo "📋 How it works:"
echo "  • Automatic checks on every commit"
echo "  • Manual checks: python utils/duplication_detector.py"
echo "  • Registry checks: python utils/registry_manager.py check <feature>"
echo ""
echo "🛡️ The system will now prevent:"
echo "  • Duplicate models, endpoints, components"
echo "  • Multiple implementations of the same feature"
echo "  • Enhanced/Simple/Demo variants"
echo ""
echo "Ready for clean migration! 🎯"