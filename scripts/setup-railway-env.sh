#!/bin/bash

# Railway Environment Variables Setup Script for 6FB Booking Platform
# This script helps set up the required environment variables for Railway deployment

echo "🚀 Railway Environment Variables Setup for 6FB Booking Platform"
echo "==============================================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Login check
echo "🔐 Checking Railway login status..."
if ! railway whoami &> /dev/null; then
    echo "❌ Please login to Railway first:"
    echo "   railway login"
    exit 1
fi

echo "✅ Railway CLI is ready!"
echo ""

# Core Environment Variables
echo "🔧 Setting up core environment variables..."

# Ask user for service type
echo "Which service are you setting up?"
echo "1) Backend API"
echo "2) Frontend"
read -p "Enter choice (1 or 2): " service_choice

if [ "$service_choice" = "1" ]; then
    echo "🔧 Setting up Backend environment variables..."

    # Core settings
    railway variables set ENVIRONMENT=production
    railway variables set WORKERS=2
    railway variables set DB_POOL_SIZE=20
    railway variables set PYTHONPATH=/app/backend

    # Security keys (user needs to provide these)
    echo ""
    echo "🔐 Security Configuration"
    echo "You need to set these security variables manually:"
    echo ""
    echo "Generate secure keys with:"
    echo "python -c 'import secrets; print(\"SECRET_KEY:\", secrets.token_urlsafe(64))'"
    echo "python -c 'import secrets; print(\"JWT_SECRET_KEY:\", secrets.token_urlsafe(64))'"
    echo ""
    read -p "Enter SECRET_KEY: " secret_key
    read -p "Enter JWT_SECRET_KEY: " jwt_secret_key

    if [ ! -z "$secret_key" ]; then
        railway variables set SECRET_KEY="$secret_key"
    fi

    if [ ! -z "$jwt_secret_key" ]; then
        railway variables set JWT_SECRET_KEY="$jwt_secret_key"
    fi

    # Database URL (Railway provides this automatically if you add a database)
    echo ""
    echo "💾 Database Configuration"
    echo "If you haven't added a PostgreSQL database to your Railway project yet:"
    echo "1. Go to your Railway dashboard"
    echo "2. Click 'Add Service' -> 'Database' -> 'PostgreSQL'"
    echo "3. Railway will automatically set DATABASE_URL"

    # CORS Origins
    echo ""
    echo "🌐 CORS Configuration"
    read -p "Enter your Railway frontend domain (e.g., https://yourapp.up.railway.app): " frontend_url

    if [ ! -z "$frontend_url" ]; then
        railway variables set FRONTEND_URL="$frontend_url"
        railway variables set ALLOWED_ORIGINS="$frontend_url,https://localhost:3000,http://localhost:3000"
    fi

    # Payment configuration
    echo ""
    echo "💳 Payment Configuration (Stripe)"
    echo "Enter your Stripe keys (leave empty to skip):"
    read -p "Stripe Secret Key: " stripe_secret
    read -p "Stripe Publishable Key: " stripe_public
    read -p "Stripe Webhook Secret: " stripe_webhook

    if [ ! -z "$stripe_secret" ]; then
        railway variables set STRIPE_SECRET_KEY="$stripe_secret"
    fi

    if [ ! -z "$stripe_public" ]; then
        railway variables set STRIPE_PUBLISHABLE_KEY="$stripe_public"
    fi

    if [ ! -z "$stripe_webhook" ]; then
        railway variables set STRIPE_WEBHOOK_SECRET="$stripe_webhook"
    fi

    # Email configuration
    echo ""
    echo "📧 Email Configuration (SendGrid recommended)"
    read -p "SendGrid API Key (leave empty to skip): " sendgrid_key
    read -p "From Email Address: " from_email

    if [ ! -z "$sendgrid_key" ]; then
        railway variables set SENDGRID_API_KEY="$sendgrid_key"
    fi

    if [ ! -z "$from_email" ]; then
        railway variables set FROM_EMAIL="$from_email"
    fi

    echo "✅ Backend environment variables configured!"

elif [ "$service_choice" = "2" ]; then
    echo "🔧 Setting up Frontend environment variables..."

    # Core frontend settings
    railway variables set NODE_ENV=production
    railway variables set NEXT_PUBLIC_ENVIRONMENT=production

    # Ask for backend API URL
    read -p "Enter your Railway backend API URL (e.g., https://yourapi.up.railway.app): " api_url

    if [ ! -z "$api_url" ]; then
        railway variables set NEXT_PUBLIC_API_URL="$api_url"
        railway variables set NEXT_PUBLIC_BACKEND_URL="$api_url"
    fi

    # App configuration
    read -p "Enter your app name (default: 6FB Booking): " app_name
    app_name=${app_name:-"6FB Booking"}
    railway variables set NEXT_PUBLIC_APP_NAME="$app_name"

    echo "✅ Frontend environment variables configured!"

else
    echo "❌ Invalid choice. Please run the script again."
    exit 1
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Verify your environment variables: railway variables"
echo "2. Deploy your service: railway up"
echo "3. Check deployment logs: railway logs"
echo ""
echo "🔗 Useful Railway commands:"
echo "- railway variables: List all environment variables"
echo "- railway logs: View deployment logs"
echo "- railway status: Check service status"
echo "- railway open: Open your deployed service"
echo ""
echo "📚 For more help, visit: https://docs.railway.app"
