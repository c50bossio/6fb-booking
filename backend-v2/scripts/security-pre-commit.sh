#!/bin/bash

# Pre-commit security hook for 6FB Booking Platform
# Prevents committing files with exposed credentials
# 
# Install: ln -s ../../backend-v2/scripts/security-pre-commit.sh .git/hooks/pre-commit
# Usage: Runs automatically before each commit

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔒 Running security pre-commit checks...${NC}"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Cannot run security checks.${NC}"
    exit 1
fi

# Change to project root
cd "$(git rev-parse --show-toplevel)/backend-v2"

# Run credential validator if it exists
if [ -f "security/credential_validator.py" ]; then
    echo "Running credential validator..."
    
    if python3 security/credential_validator.py; then
        echo -e "${GREEN}✅ No exposed credentials found${NC}"
    else
        exit_code=$?
        echo -e "${RED}❌ SECURITY VIOLATION: Exposed credentials detected!${NC}"
        echo -e "${RED}Commit blocked to prevent credential exposure.${NC}"
        echo -e "${YELLOW}Please remove hardcoded credentials and use environment variables.${NC}"
        exit $exit_code
    fi
else
    echo -e "${YELLOW}⚠️  Credential validator not found, skipping scan${NC}"
fi

# Check for .env files being committed
staged_files=$(git diff --cached --name-only)

for file in $staged_files; do
    if [[ "$file" == *.env ]] && [[ "$file" != *.env.template ]] && [[ "$file" != *.env.example ]]; then
        echo -e "${RED}❌ SECURITY VIOLATION: Attempting to commit .env file: $file${NC}"
        echo -e "${RED}Environment files should never be committed!${NC}"
        echo -e "${YELLOW}Add $file to .gitignore and remove from staging.${NC}"
        exit 1
    fi
done

# Check for common credential patterns in staged files
echo "Checking staged files for credential patterns..."

# Define patterns to check for
patterns=(
    "SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}"  # SendGrid API key
    "AC[a-f0-9]{32}"                              # Twilio Account SID
    "sk_(test|live)_[A-Za-z0-9]{24,}"            # Stripe Secret Key
    "password.*=.*[\"\'][^\"\']{8,}"              # Passwords
    "secret.*=.*[\"\'][^\"\']{20,}"               # Secrets
)

violation_found=false

for file in $staged_files; do
    # Skip binary files and certain extensions
    if [[ "$file" == *.pyc ]] || [[ "$file" == *.jpg ]] || [[ "$file" == *.png ]] || [[ "$file" == *.gif ]]; then
        continue
    fi
    
    # Skip if file doesn't exist (deleted files)
    if [ ! -f "$file" ]; then
        continue
    fi
    
    for pattern in "${patterns[@]}"; do
        if grep -qE "$pattern" "$file" 2>/dev/null; then
            # Check if it's a safe placeholder
            if grep -qE "(your-.*-here|test-.*-key|placeholder|example|template)" "$file" 2>/dev/null; then
                continue
            fi
            
            echo -e "${RED}❌ POTENTIAL CREDENTIAL in $file${NC}"
            echo -e "${RED}   Pattern matched: $pattern${NC}"
            violation_found=true
        fi
    done
done

if $violation_found; then
    echo -e "${RED}❌ SECURITY VIOLATION: Potential credentials found in staged files!${NC}"
    echo -e "${YELLOW}Please review the files above and remove any hardcoded credentials.${NC}"
    exit 1
fi

# Check for TODO/FIXME security comments
security_todos=$(git diff --cached | grep -i "TODO.*security\|FIXME.*security\|XXX.*security" || true)
if [ ! -z "$security_todos" ]; then
    echo -e "${YELLOW}⚠️  Security TODOs found in staged changes:${NC}"
    echo "$security_todos"
    echo -e "${YELLOW}Consider resolving security TODOs before committing.${NC}"
fi

echo -e "${GREEN}✅ Security pre-commit checks passed!${NC}"
exit 0