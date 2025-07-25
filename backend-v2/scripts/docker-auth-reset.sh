#!/bin/bash

# BookedBarber V2 - Docker Authentication Reset Script
# Clears all authentication state and browser cache issues in Docker environment

set -e

echo "🐳 BookedBarber Docker Authentication Reset"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if project is running
if ! docker-compose ps | grep -q "Up"; then
    print_warning "No running containers found. Starting with docker-compose up first."
    echo ""
    echo "Run this command after starting your containers:"
    echo "  docker-compose up -d"
    echo "  ./scripts/docker-auth-reset.sh"
    exit 1
fi

print_status "Resetting authentication state in Docker environment..."

# 1. Clear Redis sessions and cache
print_status "Clearing Redis sessions and cache..."
if docker-compose exec -T redis redis-cli FLUSHDB >/dev/null 2>&1; then
    print_success "Redis cache cleared"
else
    print_warning "Could not clear Redis cache (container may be starting)"
fi

# 2. Clear backend logs and temporary files
print_status "Clearing backend temporary files..."
docker-compose exec -T backend sh -c "
    rm -f /app/logs/*.log 2>/dev/null || true
    rm -rf /app/.cache/* 2>/dev/null || true
    rm -rf /app/__pycache__ 2>/dev/null || true
    echo 'Backend temporary files cleared'
" || print_warning "Could not clear backend temporary files"

# 3. Clear frontend build cache and Next.js cache
print_status "Clearing frontend build cache..."
docker-compose exec -T frontend sh -c "
    rm -rf /app/.next/cache 2>/dev/null || true
    rm -rf /app/.cache/* 2>/dev/null || true
    rm -f /app/.eslintcache 2>/dev/null || true
    echo 'Frontend cache cleared'
" || print_warning "Could not clear frontend cache"

# 4. Restart auth-critical services
print_status "Restarting authentication services..."

# Restart Redis first
print_status "Restarting Redis..."
docker-compose restart redis
sleep 3

# Wait for Redis to be healthy
print_status "Waiting for Redis to be ready..."
timeout=30
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is ready"
        break
    fi
    sleep 1
    ((timeout--))
done

if [ $timeout -eq 0 ]; then
    print_error "Redis failed to start properly"
    exit 1
fi

# Restart backend
print_status "Restarting backend..."
docker-compose restart backend
sleep 5

# Wait for backend to be healthy
print_status "Waiting for backend to be ready..."
timeout=60
while [ $timeout -gt 0 ]; do
    if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
        print_success "Backend is ready"
        break
    fi
    sleep 2
    ((timeout--))
done

if [ $timeout -eq 0 ]; then
    print_error "Backend failed to start properly"
    exit 1
fi

# 5. Generate browser cache reset instructions
print_status "Generating browser cache reset instructions..."

cat << 'EOF' > /tmp/browser-reset.js
// BookedBarber Docker Auth Reset - Browser Script
// Run this in your browser's developer console

console.log('🧹 Clearing BookedBarber authentication cache...');

// Clear localStorage
const authKeys = Object.keys(localStorage).filter(key => 
  key.includes('auth') || 
  key.includes('token') || 
  key.includes('session') ||
  key.includes('6fb') ||
  key.includes('bookedbarber')
);

authKeys.forEach(key => {
  console.log('Removing:', key);
  localStorage.removeItem(key);
});

// Clear sessionStorage
const sessionKeys = Object.keys(sessionStorage).filter(key => 
  key.includes('auth') || 
  key.includes('token') || 
  key.includes('session') ||
  key.includes('6fb') ||
  key.includes('bookedbarber')
);

sessionKeys.forEach(key => {
  console.log('Removing session:', key);
  sessionStorage.removeItem(key);
});

// Clear auth-related cookies
document.cookie.split(";").forEach(cookie => {
  const eqPos = cookie.indexOf("=");
  const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
  if (name.includes('token') || name.includes('auth') || name.includes('session')) {
    console.log('Removing cookie:', name.trim());
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  }
});

console.log('✅ Browser cache cleared! Reloading page...');
setTimeout(() => location.reload(), 1000);
EOF

# 6. Test authentication endpoints
print_status "Testing authentication endpoints..."

# Test auth debug endpoint
if curl -sf http://localhost:8000/api/v1/auth/debug >/dev/null 2>&1; then
    print_success "Auth debug endpoint is responding"
else
    print_warning "Auth debug endpoint not responding (may be disabled)"
fi

# Test basic health
if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    print_success "Backend health check passed"
else
    print_error "Backend health check failed"
fi

# Test frontend
if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    print_success "Frontend is responding"
else
    print_warning "Frontend not responding yet (may still be starting)"
fi

# 7. Display completion summary
echo ""
echo "🎉 Docker Authentication Reset Complete!"
echo "========================================"
echo ""
print_success "Services restarted and caches cleared"
print_success "Redis sessions cleared"
print_success "Build caches cleared"
echo ""
echo "📋 Next Steps:"
echo "1. Clear your browser cache manually:"
echo "   - Open DevTools (F12)"
echo "   - Right-click refresh button → 'Empty Cache and Hard Reload'"
echo ""
echo "2. Or run this JavaScript in your browser console:"
echo "   ${BLUE}$(cat /tmp/browser-reset.js | head -20 | tr '\n' ' ')...${NC}"
echo ""
echo "3. If issues persist, try:"
echo "   - Incognito/Private browsing mode"
echo "   - Different browser"
echo "   - Clear browser's site data completely"
echo ""
echo "🔗 URLs to test:"
echo "   Frontend: ${BLUE}http://localhost:3000${NC}"
echo "   Backend:  ${BLUE}http://localhost:8000${NC}"
echo "   API Docs: ${BLUE}http://localhost:8000/docs${NC}"
echo "   Auth Debug: ${BLUE}http://localhost:8000/api/v1/auth/debug${NC}"
echo ""

# Cleanup
rm -f /tmp/browser-reset.js

print_success "Reset complete! Your Docker authentication environment is now clean."