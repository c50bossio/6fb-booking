#!/bin/bash

# Security Remediation Script for Stripe Keys
# Created: 2025-06-25
# Purpose: Remove exposed production keys and secure environment

echo "🚨 STRIPE SECURITY REMEDIATION SCRIPT 🚨"
echo "=========================================="
echo ""

# Function to backup a file before modification
backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        cp "$file" "$file.backup.$(date +%Y%m%d_%H%M%S)"
        echo "✅ Backed up: $file"
    fi
}

# Function to remove keys from a file
secure_file() {
    local file="$1"
    if [ -f "$file" ]; then
        echo "🔒 Securing: $file"
        backup_file "$file"

        # Replace live keys with placeholders
        sed -i '' 's/sk_live_[a-zA-Z0-9]\{24,\}/sk_live_REPLACE_WITH_ACTUAL_KEY/g' "$file"
        sed -i '' 's/pk_live_[a-zA-Z0-9]\{24,\}/pk_live_REPLACE_WITH_ACTUAL_KEY/g' "$file"

        echo "✅ Secured: $file"
    else
        echo "⚠️  File not found: $file"
    fi
}

echo "1. SECURING PRODUCTION KEYS IN BOSSIO INVESTING MACHINE"
echo "------------------------------------------------------"

# Secure Bossio Investing Machine files
secure_file "/Users/bossio/Bossio Investing Machine/.env"
secure_file "/Users/bossio/Bossio Investing Machine/.env.production"
secure_file "/Users/bossio/Bossio Investing Machine/.env.prod"
secure_file "/Users/bossio/Bossio Investing Machine/portfolio-tracker/.env.production"

echo ""
echo "2. CLEANING CURSOR EXTENSION CACHE"
echo "-----------------------------------"

# Find and clean Cursor extension files containing keys
find "/Users/bossio/.cursor" -name "*env*" -type f 2>/dev/null | while read file; do
    if grep -q "sk_live\|pk_live" "$file" 2>/dev/null; then
        echo "🔒 Found keys in: $file"
        backup_file "$file"
        # Replace live keys with placeholders
        sed -i '' 's/sk_live_[a-zA-Z0-9]\{24,\}/sk_live_REPLACE_WITH_ACTUAL_KEY/g' "$file"
        sed -i '' 's/pk_live_[a-zA-Z0-9]\{24,\}/pk_live_REPLACE_WITH_ACTUAL_KEY/g' "$file"
        echo "✅ Secured: $file"
    fi
done

echo ""
echo "3. SECURITY RECOMMENDATIONS"
echo "----------------------------"
echo "⚠️  CRITICAL: You must now rotate your Stripe keys in the dashboard:"
echo "   1. Go to https://dashboard.stripe.com/apikeys"
echo "   2. Click 'Regenerate' on both Secret and Publishable keys"
echo "   3. Update your production environment variables"
echo "   4. Update any deployment configurations"
echo ""
echo "🔒 NEXT STEPS:"
echo "   1. Store production keys in secure environment variables only"
echo "   2. Use secrets management (AWS Secrets Manager, etc.)"
echo "   3. Never commit live keys to git repositories"
echo "   4. Review .gitignore to prevent future exposure"
echo ""
echo "📝 All original files have been backed up with timestamps"
echo "✅ Security remediation complete!"
