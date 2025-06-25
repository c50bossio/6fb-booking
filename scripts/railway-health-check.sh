#!/bin/bash

# Railway Health Check Script for 6FB Booking Platform
# Monitors deployment health and provides diagnostics

set -e

echo "🏥 Railway Health Check for 6FB Booking Platform"
echo "=============================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check login status
if ! railway whoami &> /dev/null; then
    echo "❌ Please login to Railway first: railway login"
    exit 1
fi

echo "✅ Railway CLI is ready!"
echo ""

# Function to check service health
check_service_health() {
    local service_name=$1
    local url=$2
    local health_endpoint=$3

    echo "🔍 Checking $service_name health..."
    echo "URL: $url"

    if [ ! -z "$url" ] && [ "$url" != "URL not available yet" ]; then
        # Test basic connectivity
        echo "  📡 Testing connectivity..."
        if curl -s --head --fail "$url" >/dev/null 2>&1; then
            echo "  ✅ Basic connectivity: OK"
        else
            echo "  ❌ Basic connectivity: FAILED"
            return 1
        fi

        # Test health endpoint if provided
        if [ ! -z "$health_endpoint" ]; then
            echo "  🏥 Testing health endpoint..."
            health_url="$url$health_endpoint"

            response=$(curl -s "$health_url" 2>/dev/null || echo "FAILED")
            if [[ "$response" == *"healthy"* ]] || [[ "$response" == *"ok"* ]] || [[ "$response" == *"success"* ]]; then
                echo "  ✅ Health check: OK"
                echo "  📊 Response: $response"
            else
                echo "  ❌ Health check: FAILED"
                echo "  📊 Response: $response"
                return 1
            fi
        fi

        echo "  ✅ $service_name is healthy!"
        return 0
    else
        echo "  ❌ No URL available for $service_name"
        return 1
    fi
}

# Get current project info
echo "📋 Project Information:"
project_info=$(railway status 2>/dev/null || echo "No project info available")
echo "$project_info"
echo ""

# Check deployment status
echo "🚀 Deployment Status:"
railway ps
echo ""

# Get service URLs
echo "🔗 Getting service URLs..."

# Try to get backend URL
backend_url=""
frontend_url=""

# Check if we're in backend or frontend context
if [ -f "railway.toml" ]; then
    # In backend/project root
    backend_domain=$(railway domain 2>/dev/null || echo "")
    if [ ! -z "$backend_domain" ]; then
        backend_url="https://$backend_domain"
    fi
elif [ -f "frontend/railway.toml" ]; then
    # Check both services
    cd frontend 2>/dev/null || true
    frontend_domain=$(railway domain 2>/dev/null || echo "")
    if [ ! -z "$frontend_domain" ]; then
        frontend_url="https://$frontend_domain"
    fi

    cd .. 2>/dev/null || true
    backend_domain=$(railway domain 2>/dev/null || echo "")
    if [ ! -z "$backend_domain" ]; then
        backend_url="https://$backend_domain"
    fi
fi

# Health check results
echo "🏥 Health Check Results:"
echo "========================"

backend_healthy=false
frontend_healthy=false

# Check backend health
if [ ! -z "$backend_url" ]; then
    if check_service_health "Backend API" "$backend_url" "/api/v1/health"; then
        backend_healthy=true
    fi
else
    echo "🔍 Backend URL not found. Trying to detect..."
    echo "❌ Backend: URL not available"
fi

echo ""

# Check frontend health
if [ ! -z "$frontend_url" ]; then
    if check_service_health "Frontend" "$frontend_url" ""; then
        frontend_healthy=true
    fi
else
    echo "🔍 Frontend URL not found. Trying to detect..."
    echo "❌ Frontend: URL not available"
fi

echo ""
echo "📊 Summary:"
echo "==========="

if [ "$backend_healthy" = true ]; then
    echo "✅ Backend: Healthy"
    echo "   🔗 URL: $backend_url"
    echo "   📖 API Docs: $backend_url/docs"
    echo "   🏥 Health: $backend_url/api/v1/health"
else
    echo "❌ Backend: Issues detected"
fi

if [ "$frontend_healthy" = true ]; then
    echo "✅ Frontend: Healthy"
    echo "   🔗 URL: $frontend_url"
else
    echo "❌ Frontend: Issues detected"
fi

echo ""
echo "🔧 Troubleshooting Commands:"
echo "============================"
echo "- View logs: railway logs"
echo "- Check variables: railway variables"
echo "- Restart service: railway up --detach"
echo "- Open service: railway open"
echo ""

# Check recent logs for errors
echo "📝 Recent Logs (last 50 lines):"
echo "================================"
railway logs --tail 50 2>/dev/null || echo "No logs available"

echo ""
echo "🎯 Health check complete!"

# Exit with appropriate code
if [ "$backend_healthy" = true ] || [ "$frontend_healthy" = true ]; then
    exit 0
else
    echo "❌ No healthy services detected"
    exit 1
fi
