#!/bin/bash
# Pre-commit security hook for BookedBarber V2
# This script runs security checks before allowing commits

set -e

echo "🔒 Running security checks before commit..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

# Check if we're in the right directory
if [ ! -f "backend-v2/config.py" ]; then
    print_status "❌ Error: Run this script from the project root directory" $RED
    exit 1
fi

VIOLATIONS=0

print_status "1. Checking for environment files in git..." $BLUE

# Check for environment files that shouldn't be committed
ENV_FILES=$(git diff --cached --name-only | grep -E "\.(env|local)(\.|$)" | grep -v -E "\.(example|template)$" || true)

if [ ! -z "$ENV_FILES" ]; then
    print_status "❌ Environment files detected in commit:" $RED
    echo "$ENV_FILES"
    print_status "   Remove these files from git tracking:" $YELLOW
    echo "$ENV_FILES" | sed 's/^/   git rm --cached /'
    VIOLATIONS=$((VIOLATIONS + 1))
fi

print_status "2. Scanning for hardcoded secrets..." $BLUE

# Define patterns for common secrets
SECRET_PATTERNS=(
    "sk_test_[a-zA-Z0-9]{24,}"          # Stripe test keys
    "sk_live_[a-zA-Z0-9]{24,}"          # Stripe live keys
    "pk_test_[a-zA-Z0-9]{24,}"          # Stripe publishable test keys
    "pk_live_[a-zA-Z0-9]{24,}"          # Stripe publishable live keys
    "whsec_[a-zA-Z0-9]{32,}"            # Stripe webhook secrets
    "SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}"  # SendGrid API keys
    "xoxb-[0-9]{11,}-[0-9]{11,}-[a-zA-Z0-9]{24}"  # Slack bot tokens
    "AIza[0-9A-Za-z\\-_]{35}"           # Google API keys
    "sk-ant-api03-[a-zA-Z0-9_-]{95}"    # Anthropic API keys
    "sk-[a-zA-Z0-9]{48}"                # OpenAI API keys
    "AC[a-fA-F0-9]{32}"                 # Twilio Account SID
    "[a-fA-F0-9]{32}"                   # Generic 32-char hex strings (potential secrets)
)

# Check staged files for secrets
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\.(py|js|ts|tsx|json|yaml|yml)$" || true)

if [ ! -z "$STAGED_FILES" ]; then
    for pattern in "${SECRET_PATTERNS[@]}"; do
        SECRET_MATCHES=$(git diff --cached | grep -E "^\+" | grep -E "$pattern" || true)
        if [ ! -z "$SECRET_MATCHES" ]; then
            print_status "❌ Potential secret detected in staged changes:" $RED
            echo "$SECRET_MATCHES" | head -3
            print_status "   Pattern: $pattern" $YELLOW
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    done
fi

print_status "3. Checking for weak configuration values..." $BLUE

# Check for common weak values in staged Python files
WEAK_PATTERNS=(
    "SECRET_KEY.*=.*['\"]your-secret-key-here['\"]"
    "JWT_SECRET_KEY.*=.*['\"]test-.*['\"]"
    "password.*=.*['\"]password['\"]"
    "secret.*=.*['\"]secret['\"]"
    "api_key.*=.*['\"]your.*key.*here['\"]"
)

for pattern in "${WEAK_PATTERNS[@]}"; do
    WEAK_MATCHES=$(git diff --cached | grep -E "^\+" | grep -iE "$pattern" || true)
    if [ ! -z "$WEAK_MATCHES" ]; then
        print_status "❌ Weak configuration detected:" $RED
        echo "$WEAK_MATCHES" | head -3
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
done

print_status "4. Validating environment variable usage..." $BLUE

# Check that critical files use environment variables, not hardcoded values
CRITICAL_FILES=(
    "backend-v2/config.py"
    "backend-v2/services/payment_service.py"
    "backend-v2/utils/auth.py"
)

for file in "${CRITICAL_FILES[@]}"; do
    if git diff --cached --name-only | grep -q "$file"; then
        # Check if the file has proper environment variable usage
        HARDCODED_STRIPE=$(git diff --cached "$file" | grep -E "^\+" | grep -E "sk_(test|live)_" | grep -v "settings\." || true)
        if [ ! -z "$HARDCODED_STRIPE" ]; then
            print_status "❌ Hardcoded Stripe key in $file:" $RED
            echo "$HARDCODED_STRIPE"
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    fi
done

print_status "5. Running environment variable validation..." $BLUE

# Run the environment validator if available
if [ -f "backend-v2/utils/env_validator.py" ]; then
    cd backend-v2
    if python utils/env_validator.py > /dev/null 2>&1; then
        print_status "✅ Environment validation passed" $GREEN
    else
        print_status "⚠️  Environment validation warnings (not blocking commit)" $YELLOW
        print_status "   Run 'python backend-v2/utils/env_validator.py' for details" $YELLOW
    fi
    cd ..
fi

print_status "6. Checking .gitignore patterns..." $BLUE

# Verify .gitignore has proper patterns
REQUIRED_PATTERNS=(
    "\.env$"
    "\.env\.\*"
    "\.env\.production"
    "\.env\.local"
    "\.env\.development"
)

for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if ! grep -q "$pattern" .gitignore; then
        print_status "❌ Missing .gitignore pattern: $pattern" $RED
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
done

# Summary
echo ""
print_status "🔒 Security check summary:" $BLUE

if [ $VIOLATIONS -eq 0 ]; then
    print_status "✅ All security checks passed!" $GREEN
    print_status "💡 Commit allowed" $GREEN
    exit 0
else
    print_status "❌ Security violations found: $VIOLATIONS" $RED
    print_status "🚫 Commit blocked for security" $RED
    echo ""
    print_status "To fix issues:" $YELLOW
    print_status "1. Remove any hardcoded secrets from staged files" $YELLOW
    print_status "2. Use environment variables in config.py instead" $YELLOW
    print_status "3. Ensure .env files are properly .gitignore'd" $YELLOW
    print_status "4. Run 'python backend-v2/utils/env_validator.py' to check configuration" $YELLOW
    echo ""
    print_status "To bypass (NOT RECOMMENDED): git commit --no-verify" $YELLOW
    exit 1
fi