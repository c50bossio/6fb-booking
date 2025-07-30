#!/bin/bash

# Complete Sentry Setup for BookedBarber V2
# This script handles the full Sentry CLI integration

set -e

echo "🚀 BookedBarber V2 - Complete Sentry Setup"
echo "=========================================="
echo ""

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
echo ""

# Function to setup Sentry with auth token
setup_with_auth_token() {
    local auth_token="$1"
    export SENTRY_AUTH_TOKEN="$auth_token"
    
    echo "🔐 Testing authentication..."
    if sentry-cli projects list &> /dev/null; then
        echo "✅ Authentication successful!"
        
        # Get organization info
        echo ""
        echo "📋 Your Sentry organizations:"
        orgs=$(sentry-cli organizations list)
        echo "$orgs"
        
        # Get the first organization slug
        org_slug=$(echo "$orgs" | head -n 1 | awk '{print $1}')
        echo ""
        echo "🎯 Using organization: $org_slug"
        
        # Create or get backend project
        echo ""
        echo "📦 Setting up backend project..."
        backend_exists=$(sentry-cli projects list -o "$org_slug" | grep -q "bookedbarber-backend" && echo "yes" || echo "no")
        
        if [ "$backend_exists" = "no" ]; then
            echo "Creating backend project..."
            sentry-cli projects create \
                --org "$org_slug" \
                --name "BookedBarber Backend" \
                --slug "bookedbarber-backend" \
                --platform "python-fastapi" || echo "Project may already exist"
        else
            echo "✅ Backend project already exists"
        fi
        
        # Create or get frontend project
        echo "📦 Setting up frontend project..."
        frontend_exists=$(sentry-cli projects list -o "$org_slug" | grep -q "bookedbarber-frontend" && echo "yes" || echo "no")
        
        if [ "$frontend_exists" = "no" ]; then
            echo "Creating frontend project..."
            sentry-cli projects create \
                --org "$org_slug" \
                --name "BookedBarber Frontend" \
                --slug "bookedbarber-frontend" \
                --platform "javascript-nextjs" || echo "Project may already exist"
        else
            echo "✅ Frontend project already exists"
        fi
        
        # Get DSNs
        echo ""
        echo "🔗 Retrieving project DSNs..."
        
        backend_dsn=$(sentry-cli projects info "$org_slug" "bookedbarber-backend" 2>/dev/null | grep "DSN:" | awk '{print $2}' || echo "")
        frontend_dsn=$(sentry-cli projects info "$org_slug" "bookedbarber-frontend" 2>/dev/null | grep "DSN:" | awk '{print $2}' || echo "")
        
        if [ -z "$backend_dsn" ]; then
            echo "⚠️  Could not retrieve backend DSN automatically"
            echo "   Please get it from: https://sentry.io/settings/$org_slug/projects/bookedbarber-backend/keys/"
            read -p "Enter backend DSN: " backend_dsn
        else
            echo "✅ Backend DSN: $backend_dsn"
        fi
        
        if [ -z "$frontend_dsn" ]; then
            echo "⚠️  Could not retrieve frontend DSN automatically"
            echo "   Please get it from: https://sentry.io/settings/$org_slug/projects/bookedbarber-frontend/keys/"
            read -p "Enter frontend DSN: " frontend_dsn
        else
            echo "✅ Frontend DSN: $frontend_dsn"
        fi
        
        # Update environment files
        echo ""
        echo "📝 Updating environment files..."
        
        # Update backend .env
        if [ -f ".env" ]; then
            cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
            echo "✅ Backed up .env file"
        fi
        
        # Update or add Sentry configuration to .env
        if grep -q "SENTRY_DSN=" .env 2>/dev/null; then
            sed -i.bak "s|SENTRY_DSN=.*|SENTRY_DSN=\"$backend_dsn\"|" .env
            rm .env.bak
        else
            echo "" >> .env
            echo "# Sentry Configuration" >> .env
            echo "SENTRY_DSN=\"$backend_dsn\"" >> .env
            echo "SENTRY_ENVIRONMENT=\"development\"" >> .env
            echo "SENTRY_RELEASE=\"bookedbarber@$(date +%Y%m%d)\"" >> .env
            echo "SENTRY_TRACES_SAMPLE_RATE=\"0.1\"" >> .env
            echo "SENTRY_PROFILES_SAMPLE_RATE=\"0.1\"" >> .env
        fi
        echo "✅ Updated backend .env with Sentry DSN"
        
        # Update frontend .env.local
        cd frontend-v2
        if [ -f ".env.local" ]; then
            cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
            echo "✅ Backed up frontend .env.local file"
        fi
        
        # Update or add Sentry configuration to frontend
        if [ -n "$frontend_dsn" ]; then
            if grep -q "NEXT_PUBLIC_SENTRY_DSN=" .env.local 2>/dev/null; then
                sed -i.bak "s|NEXT_PUBLIC_SENTRY_DSN=.*|NEXT_PUBLIC_SENTRY_DSN=\"$frontend_dsn\"|" .env.local
                rm .env.local.bak
            else
                echo "" >> .env.local
                echo "# Sentry Configuration" >> .env.local
                echo "NEXT_PUBLIC_SENTRY_DSN=\"$frontend_dsn\"" >> .env.local
                echo "NEXT_PUBLIC_SENTRY_ENVIRONMENT=\"development\"" >> .env.local
                echo "NEXT_PUBLIC_SENTRY_RELEASE=\"bookedbarber-frontend@$(date +%Y%m%d)\"" >> .env.local
            fi
            echo "✅ Updated frontend .env.local with Sentry DSN"
        else
            echo "⚠️  Using backend DSN for frontend (single project setup)"
            if grep -q "NEXT_PUBLIC_SENTRY_DSN=" .env.local 2>/dev/null; then
                sed -i.bak "s|NEXT_PUBLIC_SENTRY_DSN=.*|NEXT_PUBLIC_SENTRY_DSN=\"$backend_dsn\"|" .env.local
                rm .env.local.bak
            else
                echo "" >> .env.local
                echo "# Sentry Configuration" >> .env.local
                echo "NEXT_PUBLIC_SENTRY_DSN=\"$backend_dsn\"" >> .env.local
                echo "NEXT_PUBLIC_SENTRY_ENVIRONMENT=\"development\"" >> .env.local
                echo "NEXT_PUBLIC_SENTRY_RELEASE=\"bookedbarber@$(date +%Y%m%d)\"" >> .env.local
            fi
        fi
        
        cd ..
        
        # Test Sentry integration
        echo ""
        echo "🧪 Testing Sentry integration..."
        
        python3 -c "
import os
import sys
sys.path.append('.')
os.environ['SENTRY_DSN'] = '$backend_dsn'

try:
    from config.sentry import configure_sentry
    import sentry_sdk
    
    if configure_sentry():
        print('✅ Backend Sentry configured successfully')
        # Send test event
        sentry_sdk.capture_message('BookedBarber V2 - Sentry Setup Test', level='info')
        print('✅ Test event sent to Sentry')
    else:
        print('❌ Backend Sentry configuration failed')
except Exception as e:
    print(f'❌ Sentry test failed: {e}')
" || echo "❌ Backend Sentry test failed"
        
        # Final summary
        echo ""
        echo "🎉 Sentry Setup Complete!"
        echo "========================"
        echo ""
        echo "📋 Configuration Summary:"
        echo "Organization: $org_slug"
        echo "Backend DSN: $backend_dsn"
        if [ -n "$frontend_dsn" ]; then
            echo "Frontend DSN: $frontend_dsn"
        fi
        echo ""
        echo "🚀 Next Steps:"
        echo "1. Restart your development servers:"
        echo "   uvicorn main:app --reload"
        echo "   cd frontend-v2 && npm run dev"
        echo ""
        echo "2. Check Sentry dashboard for events:"
        echo "   Backend: https://sentry.io/organizations/$org_slug/projects/bookedbarber-backend/"
        if [ -n "$frontend_dsn" ]; then
            echo "   Frontend: https://sentry.io/organizations/$org_slug/projects/bookedbarber-frontend/"
        fi
        echo ""
        echo "3. Trigger a test error:"
        echo "   curl http://localhost:8000/api/v2/test-sentry"
        
    else
        echo "❌ Authentication failed. Please check your auth token."
        return 1
    fi
}

# Main execution
echo "🔐 Sentry Authentication Options:"
echo "1. Interactive login (opens browser)"
echo "2. Provide auth token directly"
echo ""

read -p "Choose option (1 or 2): " auth_choice

case $auth_choice in
    1)
        echo "🌐 Opening browser for Sentry login..."
        if sentry-cli login; then
            echo "✅ Authentication successful!"
            # Get auth info and proceed with setup
            if sentry-cli projects list &> /dev/null; then
                setup_with_auth_token "$(sentry-cli info 2>/dev/null | grep 'Auth Token' | awk '{print $3}' || echo 'authenticated')"
            fi
        else
            echo "❌ Browser authentication failed"
            exit 1
        fi
        ;;
    2)
        echo "📝 Get your auth token from: https://sentry.io/settings/auth-tokens/"
        echo "   Required permissions: project:read, project:write, org:read"
        echo ""
        read -p "Enter your Sentry auth token: " auth_token
        
        if [ -n "$auth_token" ]; then
            setup_with_auth_token "$auth_token"
        else
            echo "❌ No auth token provided"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid option. Please choose 1 or 2."
        exit 1
        ;;
esac

echo ""
echo "📚 For more help, see: SENTRY_SETUP_INSTRUCTIONS.md"