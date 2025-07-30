#!/bin/bash

# Demo Sentry Setup - Shows exactly what the CLI would do
# This demonstrates the complete process without requiring actual authentication

echo "🎯 DEMO: BookedBarber V2 - Sentry CLI Setup Process"
echo "=================================================="
echo ""

echo "📝 Step 1: Authentication (Demo)"
echo "Command that would run: sentry-cli login"
echo "Result: Would open browser to https://sentry.io/auth/login/"
echo ""

echo "📝 Step 2: Organization Discovery (Demo)"
echo "Command that would run: sentry-cli organizations list"
echo "Demo result:"
echo "  Organization: bookedbarber-org (bookedbarber-org)"
echo ""

echo "📝 Step 3: Create Backend Project (Demo)"
echo "Command that would run:"
echo "  sentry-cli projects create \\"
echo "    --org bookedbarber-org \\"
echo "    --name 'BookedBarber Backend' \\"
echo "    --slug 'bookedbarber-backend' \\"
echo "    --platform 'python-fastapi'"
echo ""
echo "Demo result: ✅ Project 'bookedbarber-backend' created successfully"
echo ""

echo "📝 Step 4: Create Frontend Project (Demo)"
echo "Command that would run:"
echo "  sentry-cli projects create \\"
echo "    --org bookedbarber-org \\"
echo "    --name 'BookedBarber Frontend' \\"
echo "    --slug 'bookedbarber-frontend' \\"
echo "    --platform 'javascript-nextjs'"
echo ""
echo "Demo result: ✅ Project 'bookedbarber-frontend' created successfully"
echo ""

echo "📝 Step 5: Get Backend DSN (Demo)"
echo "Command that would run: sentry-cli projects info bookedbarber-org bookedbarber-backend"
echo "Demo DSN (backend): https://1234567890abcdef@o1234567.ingest.sentry.io/1234567"
echo ""

echo "📝 Step 6: Get Frontend DSN (Demo)"
echo "Command that would run: sentry-cli projects info bookedbarber-org bookedbarber-frontend"
echo "Demo DSN (frontend): https://abcdef1234567890@o1234567.ingest.sentry.io/7654321"
echo ""

echo "📝 Step 7: Update Environment Files (Demo)"
echo "Files that would be updated:"
echo "  ✅ backend-v2/.env"
echo "  ✅ backend-v2/frontend-v2/.env.local"
echo ""

# Create demo environment files with placeholder DSNs
echo "📝 Creating demo environment configuration..."

# Update backend .env with demo DSN
if [ -f ".env" ]; then
    cp .env .env.backup.demo.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up current .env file"
fi

# Demo backend configuration
echo "# Demo Sentry Configuration (Replace with real DSN)" >> .env.demo
echo "SENTRY_DSN=\"https://demo1234567890abcdef@o1234567.ingest.sentry.io/1234567\"" >> .env.demo
echo "SENTRY_ENVIRONMENT=\"development\"" >> .env.demo
echo "SENTRY_RELEASE=\"bookedbarber@demo\"" >> .env.demo
echo "SENTRY_TRACES_SAMPLE_RATE=\"0.1\"" >> .env.demo
echo "SENTRY_PROFILES_SAMPLE_RATE=\"0.1\"" >> .env.demo

echo "✅ Created .env.demo with demo Sentry configuration"

# Demo frontend configuration
cd frontend-v2
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup.demo.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up current frontend .env.local file"
fi

echo "# Demo Sentry Configuration (Replace with real DSN)" >> .env.local.demo
echo "NEXT_PUBLIC_SENTRY_DSN=\"https://demoabcdef1234567890@o1234567.ingest.sentry.io/7654321\"" >> .env.local.demo
echo "NEXT_PUBLIC_SENTRY_ENVIRONMENT=\"development\"" >> .env.local.demo
echo "NEXT_PUBLIC_SENTRY_RELEASE=\"bookedbarber-frontend@demo\"" >> .env.local.demo

echo "✅ Created frontend-v2/.env.local.demo with demo Sentry configuration"
cd ..

echo ""
echo "📝 Step 8: Test Integration (Demo)"
echo "Command that would run: python3 -c \"from config.sentry import configure_sentry; configure_sentry()\""
echo "Demo result: ✅ Backend Sentry configured successfully"
echo ""

echo "🎉 DEMO COMPLETE!"
echo "================"
echo ""
echo "📋 TO USE WITH REAL SENTRY ACCOUNT:"
echo "1. Create account at https://sentry.io"
echo "2. Get auth token from https://sentry.io/settings/auth-tokens/"
echo "3. Run: sentry-cli login"
echo "4. Replace demo DSNs in .env.demo and .env.local.demo with real DSNs"
echo "5. Rename .env.demo to .env and .env.local.demo to .env.local"
echo ""
echo "📁 Demo files created:"
echo "  - .env.demo (backend configuration)"
echo "  - frontend-v2/.env.local.demo (frontend configuration)"
echo ""
echo "🔗 Sentry Dashboard URLs (with real account):"
echo "  Backend:  https://sentry.io/organizations/YOUR-ORG/projects/bookedbarber-backend/"
echo "  Frontend: https://sentry.io/organizations/YOUR-ORG/projects/bookedbarber-frontend/"