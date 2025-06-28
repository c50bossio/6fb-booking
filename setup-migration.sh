#!/bin/bash

# Make migration scripts executable
chmod +x migration-analyzer.js
chmod +x migrate-to-monorepo.js

echo "🚀 6FB Booking Monorepo Migration Tools Setup"
echo "==========================================="
echo ""
echo "Migration tools are now ready to use!"
echo ""
echo "Available commands:"
echo ""
echo "1. Analyze current codebase:"
echo "   node migration-analyzer.js"
echo ""
echo "2. Perform dry-run migration:"
echo "   node migrate-to-monorepo.js"
echo ""
echo "3. Execute actual migration:"
echo "   node migrate-to-monorepo.js --execute"
echo ""
echo "4. Analyze and migrate in one step:"
echo "   node migrate-to-monorepo.js --analyze --execute"
echo ""
echo "Options:"
echo "  --analyze    Run analysis before migration"
echo "  --execute    Perform actual migration (default is dry-run)"
echo "  --verbose    Show detailed output"
echo ""
echo "⚠️  IMPORTANT: Always run analysis or dry-run first!"
echo ""
