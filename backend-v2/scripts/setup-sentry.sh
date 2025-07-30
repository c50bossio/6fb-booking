#!/bin/bash

# BookedBarber V2 - Sentry Integration Setup Script
# This script helps set up Sentry projects and configure DSNs

set -e

echo "🔍 BookedBarber V2 - Sentry Integration Setup"
echo "=============================================="

# Check if Sentry CLI is installed
if ! command -v sentry-cli &> /dev/null; then
    echo "❌ Sentry CLI not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install getsentry/tools/sentry-cli
    else
        curl -sL https://sentry.io/get-cli/ | bash
    fi
fi

echo "✅ Sentry CLI version: $(sentry-cli --version)"

# Check authentication
echo ""
echo "🔐 Checking Sentry Authentication..."
if sentry-cli projects list &> /dev/null; then
    echo "✅ Already authenticated with Sentry"
    
    # List existing projects
    echo ""
    echo "📋 Your existing Sentry projects:"
    sentry-cli projects list
    
    echo ""
    read -p "Do you want to use an existing project? (y/n): " use_existing
    
    if [[ $use_existing == "y" || $use_existing == "Y" ]]; then
        echo ""
        echo "📝 Please provide your project details:"
        read -p "Organization slug (from Sentry URL): " org_slug
        read -p "Project slug (from Sentry URL): " project_slug
        
        # Get the DSN
        echo ""
        echo "🔗 Fetching DSN for $org_slug/$project_slug..."
        dsn=$(sentry-cli projects info $org_slug $project_slug 2>/dev/null | grep "DSN:" | awk '{print $2}' || echo "")
        
        if [ -n "$dsn" ]; then
            echo "✅ Found DSN: $dsn"
        else
            echo "❌ Could not fetch DSN automatically. Please get it from Sentry dashboard."
            echo "   Go to: https://sentry.io/settings/$org_slug/projects/$project_slug/keys/"
            read -p "Enter your DSN: " dsn
        fi
    fi
else
    echo "❌ Not authenticated with Sentry"
    echo ""
    echo "🚀 To authenticate:"
    echo "1. Go to https://sentry.io/settings/auth-tokens/"
    echo "2. Create a new auth token with 'project:read' and 'project:write' permissions"
    echo "3. Run: sentry-cli login"
    echo "   OR"
    echo "4. Set SENTRY_AUTH_TOKEN environment variable"
    echo ""
    
    read -p "Do you have a Sentry auth token? (y/n): " has_token
    
    if [[ $has_token == "y" || $has_token == "Y" ]]; then
        read -p "Enter your auth token: " auth_token
        export SENTRY_AUTH_TOKEN="$auth_token"
        
        echo "Testing authentication..."
        if sentry-cli projects list &> /dev/null; then
            echo "✅ Authentication successful!"
        else
            echo "❌ Authentication failed. Please check your token."
            exit 1
        fi
    else
        echo "Please get an auth token from Sentry and run this script again."
        exit 1
    fi
fi

# Create new project if needed
if [[ $use_existing != "y" && $use_existing != "Y" ]]; then
    echo ""
    echo "🆕 Creating new Sentry projects for BookedBarber..."
    
    read -p "Organization slug (from your Sentry URL): " org_slug
    
    # Create backend project
    echo "Creating backend project..."
    sentry-cli projects create \
        --org "$org_slug" \
        --name "BookedBarber Backend" \
        --slug "bookedbarber-backend" \
        --platform "python-fastapi" \
        &> /dev/null || echo "Backend project may already exist"
    
    # Create frontend project
    echo "Creating frontend project..."
    sentry-cli projects create \
        --org "$org_slug" \
        --name "BookedBarber Frontend" \
        --slug "bookedbarber-frontend" \
        --platform "javascript-nextjs" \
        &> /dev/null || echo "Frontend project may already exist"
    
    # Get DSNs
    echo ""
    echo "🔗 Fetching project DSNs..."
    
    backend_dsn=$(sentry-cli projects info $org_slug bookedbarber-backend 2>/dev/null | grep "DSN:" | awk '{print $2}' || echo "")
    frontend_dsn=$(sentry-cli projects info $org_slug bookedbarber-frontend 2>/dev/null | grep "DSN:" | awk '{print $2}' || echo "")
    
    if [ -z "$backend_dsn" ]; then
        echo "❌ Could not fetch backend DSN. Please get it manually from:"
        echo "   https://sentry.io/settings/$org_slug/projects/bookedbarber-backend/keys/"
        read -p "Enter backend DSN: " backend_dsn
    fi
    
    if [ -z "$frontend_dsn" ]; then
        echo "❌ Could not fetch frontend DSN. Please get it manually from:"
        echo "   https://sentry.io/settings/$org_slug/projects/bookedbarber-frontend/keys/"
        read -p "Enter frontend DSN: " frontend_dsn
    fi
    
    dsn="$backend_dsn"
fi

# Update environment files
echo ""
echo "📝 Updating environment configuration..."

# Update backend .env
if [ -f ".env" ]; then
    # Backup current .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update SENTRY_DSN
    if grep -q "SENTRY_DSN=" .env; then
        sed -i.bak "s|SENTRY_DSN=.*|SENTRY_DSN=\"$dsn\"|" .env
        rm .env.bak
        echo "✅ Updated backend .env with Sentry DSN"
    else
        echo "" >> .env
        echo "# Sentry Configuration" >> .env
        echo "SENTRY_DSN=\"$dsn\"" >> .env
        echo "SENTRY_ENVIRONMENT=\"development\"" >> .env
        echo "SENTRY_RELEASE=\"bookedbarber@dev\"" >> .env
        echo "SENTRY_TRACES_SAMPLE_RATE=\"0.1\"" >> .env
        echo "SENTRY_PROFILES_SAMPLE_RATE=\"0.1\"" >> .env
        echo "✅ Added Sentry configuration to backend .env"
    fi
else
    echo "❌ Backend .env file not found. Please create it from .env.template"
fi

# Update frontend .env.local
cd frontend-v2
if [ -f ".env.local" ]; then
    # Backup current .env.local
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update or add Sentry configuration
    if [ -n "$frontend_dsn" ]; then
        if grep -q "NEXT_PUBLIC_SENTRY_DSN=" .env.local; then
            sed -i.bak "s|NEXT_PUBLIC_SENTRY_DSN=.*|NEXT_PUBLIC_SENTRY_DSN=\"$frontend_dsn\"|" .env.local
            rm .env.local.bak
        else
            echo "" >> .env.local
            echo "# Sentry Configuration" >> .env.local
            echo "NEXT_PUBLIC_SENTRY_DSN=\"$frontend_dsn\"" >> .env.local
            echo "NEXT_PUBLIC_SENTRY_ENVIRONMENT=\"development\"" >> .env.local
            echo "NEXT_PUBLIC_SENTRY_RELEASE=\"bookedbarber-frontend@dev\"" >> .env.local
        fi
        echo "✅ Updated frontend .env.local with Sentry DSN"
    else
        echo "⚠️  Using backend DSN for frontend (single project setup)"
        if grep -q "NEXT_PUBLIC_SENTRY_DSN=" .env.local; then
            sed -i.bak "s|NEXT_PUBLIC_SENTRY_DSN=.*|NEXT_PUBLIC_SENTRY_DSN=\"$dsn\"|" .env.local
            rm .env.local.bak
        else
            echo "" >> .env.local
            echo "# Sentry Configuration" >> .env.local
            echo "NEXT_PUBLIC_SENTRY_DSN=\"$dsn\"" >> .env.local
            echo "NEXT_PUBLIC_SENTRY_ENVIRONMENT=\"development\"" >> .env.local
            echo "NEXT_PUBLIC_SENTRY_RELEASE=\"bookedbarber@dev\"" >> .env.local
        fi
    fi
else
    echo "❌ Frontend .env.local file not found. Please create it from .env.example"
fi

cd ..

# Test Sentry integration
echo ""
echo "🧪 Testing Sentry Integration..."

echo "Testing backend Sentry..."
python3 -c "
import os
os.environ['SENTRY_DSN'] = '$dsn'
from config.sentry import configure_sentry
import sentry_sdk

if configure_sentry():
    print('✅ Backend Sentry configured successfully')
    # Send test event
    sentry_sdk.capture_message('BookedBarber V2 - Backend Sentry Setup Test', level='info')
    print('✅ Test event sent to backend Sentry')
else:
    print('❌ Backend Sentry configuration failed')
" 2>/dev/null || echo "❌ Backend Sentry test failed"

# Final instructions
echo ""
echo "🎉 Sentry Setup Complete!"
echo "========================"
echo ""
echo "📋 Configuration Summary:"
echo "Backend DSN: $dsn"
if [ -n "$frontend_dsn" ]; then
    echo "Frontend DSN: $frontend_dsn"
fi
echo ""
echo "🚀 Next Steps:"
echo "1. Restart your development servers:"
echo "   cd backend-v2 && uvicorn main:app --reload"
echo "   cd frontend-v2 && npm run dev"
echo ""
echo "2. Check Sentry dashboard for test events:"
if [ -n "$org_slug" ]; then
    echo "   Backend: https://sentry.io/organizations/$org_slug/projects/bookedbarber-backend/"
    if [ -n "$frontend_dsn" ]; then
        echo "   Frontend: https://sentry.io/organizations/$org_slug/projects/bookedbarber-frontend/"
    fi
fi
echo ""
echo "3. Trigger a test error to verify monitoring:"
echo "   curl http://localhost:8000/api/v2/test-sentry"
echo ""
echo "📚 Monitoring Features Now Active:"
echo "   ✅ Error tracking and alerting"
echo "   ✅ Performance monitoring"
echo "   ✅ Business context tracking"
echo "   ✅ User session tracking"
echo "   ✅ Integration monitoring (Stripe, SendGrid, etc.)"
echo ""
echo "🔍 View logs with: tail -f .claude/logs/sentry.log"