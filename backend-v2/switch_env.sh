#!/bin/bash
# Environment Switcher for BookedBarber V2 Backend
# Usage: ./switch_env.sh [development|production|staging]

set -e

ENVIRONMENT=${1:-development}
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Switching to $ENVIRONMENT environment..."

case $ENVIRONMENT in
    development)
        if [ -f "$BACKEND_DIR/.env.development" ]; then
            cp "$BACKEND_DIR/.env.development" "$BACKEND_DIR/.env"
        elif [ -f "$BACKEND_DIR/.env" ]; then
            echo "✅ Using existing .env file for development"
        else
            echo "❌ No development environment file found"
            exit 1
        fi
        ;;
    production)
        if [ -f "$BACKEND_DIR/.env.production" ]; then
            cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
            echo "⚠️  PRODUCTION MODE: Ensure all secrets are configured!"
        else
            echo "❌ No production environment file found"
            exit 1
        fi
        ;;
    staging)
        if [ -f "$BACKEND_DIR/.env.staging" ]; then
            cp "$BACKEND_DIR/.env.staging" "$BACKEND_DIR/.env"
        else
            echo "❌ No staging environment file found"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Valid options: development, production, staging"
        exit 1
        ;;
esac

echo "✅ Environment switched to: $ENVIRONMENT"
echo "📁 Active environment file: $BACKEND_DIR/.env"

# Validate the environment
if [ -f "$BACKEND_DIR/scripts/validate_environment.py" ]; then
    echo "🔍 Validating environment configuration..."
    python "$BACKEND_DIR/scripts/validate_environment.py"
fi
