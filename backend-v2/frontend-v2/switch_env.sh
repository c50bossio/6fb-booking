#!/bin/bash
# Environment Switcher for BookedBarber V2 Frontend
# Usage: ./switch_env.sh [development|production|staging]

set -e

ENVIRONMENT=${1:-development}
FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Switching frontend to $ENVIRONMENT environment..."

case $ENVIRONMENT in
    development)
        if [ -f "$FRONTEND_DIR/.env.local" ]; then
            echo "✅ Using existing .env.local for development"
        else
            echo "❌ No development environment file (.env.local) found"
            exit 1
        fi
        ;;
    production)
        if [ -f "$FRONTEND_DIR/.env.production" ]; then
            # Copy to .env.local for Next.js
            cp "$FRONTEND_DIR/.env.production" "$FRONTEND_DIR/.env.local"
            echo "⚠️  PRODUCTION MODE: Frontend configured for production!"
        else
            echo "❌ No production environment file found"
            exit 1
        fi
        ;;
    staging)
        if [ -f "$FRONTEND_DIR/.env.staging" ]; then
            cp "$FRONTEND_DIR/.env.staging" "$FRONTEND_DIR/.env.local"
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

echo "✅ Frontend environment switched to: $ENVIRONMENT"
echo "📁 Active environment file: $FRONTEND_DIR/.env.local"
