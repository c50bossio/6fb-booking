#!/bin/bash

# BookBarber Frontend Deployment to Vercel
# Run this script after completing: npx vercel login

echo "🚀 Starting BookBarber Frontend Deployment to Vercel..."
echo ""

# Check if user is logged in
if ! npx vercel whoami > /dev/null 2>&1; then
    echo "❌ Error: Please run 'npx vercel login' first"
    exit 1
fi

echo "✅ Vercel authentication verified"
echo ""

# Deploy to production
echo "🏗️  Deploying to production..."
npx vercel --prod \
    --env NEXT_PUBLIC_API_URL=https://api.bookbarber.com \
    --env NEXT_PUBLIC_APP_URL=https://app.bookbarber.com \
    --env NEXT_PUBLIC_DOMAIN=bookbarber.com \
    --env NEXT_PUBLIC_ENVIRONMENT=production \
    --env NEXT_PUBLIC_APP_NAME=BookBarber \
    --env NEXT_PUBLIC_COMPANY_NAME="BookBarber Platform" \
    --env NEXT_PUBLIC_APP_DESCRIPTION="Professional booking platform for barbers and clients" \
    --env NEXT_PUBLIC_ENABLE_ANALYTICS=true \
    --env NEXT_PUBLIC_ENABLE_WEBSOCKET=true \
    --env NEXT_PUBLIC_ENABLE_PAYMENTS=true \
    --env NEXT_PUBLIC_ENABLE_DEMO_MODE=true \
    --env NEXT_PUBLIC_ENABLE_CSP=true \
    --env NEXT_PUBLIC_ENABLE_SECURITY_HEADERS=true \
    --env NEXT_PUBLIC_CACHE_TTL=600000 \
    --env NEXT_PUBLIC_IMAGE_OPTIMIZATION=true \
    --env NEXT_PUBLIC_IMAGE_DOMAINS="bookbarber.com,stripe.com,images.unsplash.com" \
    --env NEXT_PUBLIC_SUPPORT_EMAIL=support@bookbarber.com \
    --env NEXT_PUBLIC_CONTACT_EMAIL=hello@bookbarber.com \
    --env NEXT_PUBLIC_WS_URL=wss://bookbarber.com/ws \
    --env NEXT_PUBLIC_SOCIAL_TWITTER=https://twitter.com/bookbarber \
    --env NEXT_PUBLIC_SOCIAL_LINKEDIN=https://linkedin.com/company/bookbarber \
    --env NEXT_PUBLIC_SOCIAL_INSTAGRAM=https://instagram.com/bookbarber

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "⚠️  IMPORTANT: You still need to:"
echo "1. Set your production Stripe publishable key in Vercel dashboard"
echo "2. Configure custom domain: app.bookbarber.com"
echo "3. Test the deployed site"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Find your project and go to Settings > Environment Variables"
echo "3. Add: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_KEY"
echo "4. Go to Settings > Domains and add: app.bookbarber.com"
echo ""