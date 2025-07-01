#!/bin/bash

# Cleanup Script for Untracked Files
# This script helps clean up temporary files identified in the analysis

echo "=== Untracked Files Cleanup Script ==="
echo "This script will help clean up temporary files."
echo "Please review each action before confirming."
echo ""

# Function to prompt for confirmation
confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# 1. Update .gitignore
echo "=== Step 1: Update .gitignore ==="
if confirm "Add recommended patterns to .gitignore?"; then
    cat >> .gitignore << 'EOF'

# Test artifacts
*.coverage
.coverage
coverage/
test-results/
*_report.json
*_results.json
contrast-screenshots/
verification_results.json
apple-design-verification-report.json
simple-design-report.json
app-issues-report.json
integration_analysis_report.json

# Temporary test scripts
test_*.py
test_*.js
*_test.js
*_test.sh
test_*.html
simple_*.js
check_*.js
debug_*.js
verify_*.py
analyze_*.py
investigate_*.js
crawl_*.js

# Setup scripts
create_test_*.py
setup_test_*.py
add_*.py
force_*.py
find_*.py

# Generated reports
*_REPORT.md
*_SUMMARY.md
*_STATUS.md
*_PROGRESS.md
*_FIX.md

# Environment validation
environment_validation_report_*.json
conflict_analysis_report.json
api_validation_report.json
DATABASE_PERFORMANCE_ANALYSIS_REPORT.json
advanced_api_validation_report.json

# Crawler results
crawler-results/

# Browser test files
test-browser.html
test_*.html
open_*.html
quick_*.html
!**/templates/**/*.html
!**/public/**/*.html
EOF
    echo "✓ .gitignore updated"
fi

# 2. Delete temporary report files
echo -e "\n=== Step 2: Delete Temporary Reports ==="
if confirm "Delete temporary report markdown files?"; then
    # List files first
    echo "Files to be deleted:"
    find backend-v2 -maxdepth 1 -name "*_REPORT.md" -o -name "*_SUMMARY.md" -o -name "*_STATUS.md" -o -name "*_PROGRESS.md" -o -name "*_FIX.md" | grep -v "DEPLOYMENT" | grep -v "RATE_LIMITING" | grep -v "SENDGRID"
    
    if confirm "Proceed with deletion?"; then
        find backend-v2 -maxdepth 1 \( -name "*_REPORT.md" -o -name "*_SUMMARY.md" -o -name "*_STATUS.md" -o -name "*_PROGRESS.md" -o -name "*_FIX.md" \) \
            | grep -v "DEPLOYMENT" | grep -v "RATE_LIMITING" | grep -v "SENDGRID" \
            | xargs rm -f
        echo "✓ Temporary reports deleted"
    fi
fi

# 3. Delete temporary test scripts
echo -e "\n=== Step 3: Delete Temporary Test Scripts ==="
if confirm "Delete temporary test scripts?"; then
    echo "Files to be deleted:"
    find backend-v2 -maxdepth 1 \( -name "test_*.py" -o -name "test_*.js" -o -name "*_test.js" -o -name "simple_*.js" -o -name "check_*.js" -o -name "debug_*.js" \) | grep -v "tests/"
    
    if confirm "Proceed with deletion?"; then
        find backend-v2 -maxdepth 1 \( -name "test_*.py" -o -name "test_*.js" -o -name "*_test.js" -o -name "simple_*.js" -o -name "check_*.js" -o -name "debug_*.js" \) | grep -v "tests/" | xargs rm -f
        echo "✓ Temporary test scripts deleted"
    fi
fi

# 4. Delete temporary setup scripts
echo -e "\n=== Step 4: Delete Temporary Setup Scripts ==="
if confirm "Delete temporary setup scripts?"; then
    echo "Files to be deleted:"
    find backend-v2 -maxdepth 1 \( -name "create_test_*.py" -o -name "setup_test_*.py" -o -name "add_*.py" -o -name "verify_*.py" -o -name "analyze_*.py" -o -name "find_*.py" -o -name "force_*.py" \) | grep -v "generate_production_keys.py"
    
    if confirm "Proceed with deletion?"; then
        find backend-v2 -maxdepth 1 \( -name "create_test_*.py" -o -name "setup_test_*.py" -o -name "add_*.py" -o -name "verify_*.py" -o -name "analyze_*.py" -o -name "find_*.py" -o -name "force_*.py" \) | grep -v "generate_production_keys.py" | xargs rm -f
        echo "✓ Temporary setup scripts deleted"
    fi
fi

# 5. Delete JSON report files
echo -e "\n=== Step 5: Delete JSON Report Files ==="
if confirm "Delete JSON report files?"; then
    echo "Files to be deleted:"
    find backend-v2 -maxdepth 1 -name "*_report.json" -o -name "*_results.json"
    
    if confirm "Proceed with deletion?"; then
        find backend-v2 -maxdepth 1 \( -name "*_report.json" -o -name "*_results.json" \) | xargs rm -f
        echo "✓ JSON report files deleted"
    fi
fi

# 6. Clean frontend test files
echo -e "\n=== Step 6: Clean Frontend Test Files ==="
if confirm "Delete frontend temporary test files?"; then
    echo "Files to be deleted:"
    find backend-v2/frontend-v2 -maxdepth 1 \( -name "*_test.js" -o -name "test_*.js" -o -name "check_*.js" -o -name "debug_*.js" -o -name "investigate_*.js" -o -name "crawl_*.js" -o -name "simple_*.js" \)
    
    if confirm "Proceed with deletion?"; then
        find backend-v2/frontend-v2 -maxdepth 1 \( -name "*_test.js" -o -name "test_*.js" -o -name "check_*.js" -o -name "debug_*.js" -o -name "investigate_*.js" -o -name "crawl_*.js" -o -name "simple_*.js" \) | xargs rm -f
        echo "✓ Frontend test files deleted"
    fi
fi

# 7. Add essential files to git
echo -e "\n=== Step 7: Add Essential Files to Git ==="
echo "Files to add to git:"
echo "- Configuration templates"
echo "- Database migrations"
echo "- Essential documentation"
echo "- Production scripts"

if confirm "Add essential files to git?"; then
    # Configuration templates
    git add backend-v2/.env.template
    git add backend-v2/frontend-v2/.env.template
    git add backend-v2/.coveragerc
    git add backend-v2/.pre-commit-config.yaml
    
    # Database migrations
    git add backend-v2/alembic/versions/1e2bca78ae85_add_location_id_to_users_for_enterprise_.py
    git add backend-v2/alembic/versions/4df17937d4bb_add_marketing_suite_tables.py
    
    # Essential documentation
    git add backend-v2/DEPLOYMENT_CHECKLIST.md
    git add backend-v2/DEPLOYMENT_SUMMARY.md
    git add backend-v2/ENVIRONMENT_CONFIGURATION_REPORT.md
    git add backend-v2/RATE_LIMITING_DOCUMENTATION.md
    git add backend-v2/SENDGRID_SETUP.md
    git add backend-v2/STABLE_STARTUP_GUIDE.md
    git add backend-v2/TEST_DATA_FACTORIES_GUIDE.md
    git add backend-v2/CALENDAR_DEMO_INSTRUCTIONS.md
    git add backend-v2/CALENDAR_FEATURES_TEST_GUIDE.md
    git add RAILWAY_DEPLOY_COMMANDS.md
    
    # Production scripts
    git add backend-v2/generate_production_keys.py
    git add backend-v2/migrate.py
    git add backend-v2/scripts/populate_notification_templates.py
    git add backend-v2/scripts/populate_marketing_templates.py
    git add backend-v2/scripts/start_notification_services.sh
    
    # Shell scripts
    git add backend-v2/start-stable.sh
    git add backend-v2/stop_all.sh
    git add backend-v2/run_tests.sh
    git add backend-v2/monitor.sh
    git add backend-v2/deployment-check.sh
    git add backend-v2/quick_start_demo.sh
    
    echo "✓ Essential files added to git staging"
fi

# 8. Summary
echo -e "\n=== Cleanup Summary ==="
echo "Remaining untracked files:"
git status --porcelain | grep "^??" | wc -l
echo ""
echo "To see remaining files: git status --porcelain | grep '^??'"
echo "To commit staged files: git commit -m 'chore: add essential config and docs, update .gitignore'"
echo ""
echo "Cleanup complete!"