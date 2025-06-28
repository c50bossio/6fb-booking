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
