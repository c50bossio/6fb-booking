#!/bin/bash

# create-feature-worktree.sh - Create a new feature worktree with proper configuration
# Usage: ./scripts/create-feature-worktree.sh [feature-name]

set -e

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

# Check if feature name is provided
if [ -z "$1" ]; then
    print_error "Feature name is required!"
    echo "Usage: $0 [feature-name]"
    echo "Example: $0 payment-improvements"
    exit 1
fi

FEATURE_NAME="$1"
BRANCH_NAME="feature/${FEATURE_NAME}"
WORKTREE_PATH="/Users/bossio/6fb-booking-features/${FEATURE_NAME}"
DATE=$(date +%Y%m%d)
FULL_BRANCH_NAME="feature/${FEATURE_NAME}-${DATE}"

print_status "Creating feature worktree for: $FEATURE_NAME"

# Check if worktree directory already exists
if [ -d "$WORKTREE_PATH" ]; then
    print_error "Worktree directory already exists: $WORKTREE_PATH"
    exit 1
fi

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" || git show-ref --verify --quiet "refs/heads/$FULL_BRANCH_NAME"; then
    print_warning "Branch $BRANCH_NAME or $FULL_BRANCH_NAME already exists"
    print_status "Using existing branch..."
    BRANCH_TO_USE=$(git branch --list "$BRANCH_NAME" "$FULL_BRANCH_NAME" | head -1 | sed 's/^[ *]*//')
    if [ -z "$BRANCH_TO_USE" ]; then
        BRANCH_TO_USE="$FULL_BRANCH_NAME"
    fi
else
    BRANCH_TO_USE="$FULL_BRANCH_NAME"
fi

# Create the worktree
print_status "Creating worktree with branch: $BRANCH_TO_USE"
git worktree add -b "$BRANCH_TO_USE" "$WORKTREE_PATH" main

# Navigate to the worktree
cd "$WORKTREE_PATH"

# Set up environment configuration
print_status "Setting up environment configuration..."

# Copy environment template if it exists
if [ -f "/Users/bossio/6fb-booking/.env.template" ]; then
    cp "/Users/bossio/6fb-booking/.env.template" ".env.local"
    print_success "Copied .env.template to .env.local"
else
    print_warning ".env.template not found, creating basic .env.local"
    cat > .env.local << EOF
# Feature Development Environment
DATABASE_URL=sqlite:///./feature_${FEATURE_NAME}.db
STRIPE_PUBLIC_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379/2

# Feature-specific settings
DEBUG=true
ENVIRONMENT=development
FEATURE_NAME=${FEATURE_NAME}
EOF
fi

# Set up backend environment if backend-v2 exists
if [ -d "backend-v2" ]; then
    cd backend-v2
    if [ -f "/Users/bossio/6fb-booking/backend-v2/.env.template" ]; then
        cp "/Users/bossio/6fb-booking/backend-v2/.env.template" ".env"
        # Modify for feature development
        sed -i '' "s/6fb_booking.db/feature_${FEATURE_NAME}.db/g" ".env"
        print_success "Created backend environment configuration"
    fi
    
    # Set up frontend environment if frontend-v2 exists
    if [ -d "frontend-v2" ]; then
        cd frontend-v2
        if [ -f "/Users/bossio/6fb-booking/backend-v2/frontend-v2/.env.local.example" ]; then
            cp "/Users/bossio/6fb-booking/backend-v2/frontend-v2/.env.local.example" ".env.local"
        elif [ -f "/Users/bossio/6fb-booking/backend-v2/frontend-v2/.env.template" ]; then
            cp "/Users/bossio/6fb-booking/backend-v2/frontend-v2/.env.template" ".env.local"
        else
            print_warning "No frontend environment template found, creating basic .env.local"
            cat > .env.local << EOF
# Feature Development Frontend Environment
NEXT_PUBLIC_API_URL=http://localhost:8002
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_FEATURE=${FEATURE_NAME}
EOF
        fi
        print_success "Created frontend environment configuration"
        cd ..
    fi
    cd ..
fi

# Find next available port (starting from 3002)
PORT_BASE=3002
BACKEND_PORT_BASE=8002
for i in {0..20}; do
    FRONTEND_PORT=$((PORT_BASE + i))
    BACKEND_PORT=$((BACKEND_PORT_BASE + i))
    if ! lsof -i :$FRONTEND_PORT > /dev/null 2>&1; then
        break
    fi
done

# Update port configuration in environment files
if [ -f ".env.local" ]; then
    sed -i '' "s/localhost:8000/localhost:${BACKEND_PORT}/g" ".env.local"
fi

if [ -d "backend-v2/frontend-v2" ] && [ -f "backend-v2/frontend-v2/.env.local" ]; then
    sed -i '' "s/localhost:8000/localhost:${BACKEND_PORT}/g" "backend-v2/frontend-v2/.env.local"
fi

print_success "Assigned ports - Frontend: $FRONTEND_PORT, Backend: $BACKEND_PORT"

# Create development scripts
print_status "Creating development helper scripts..."

cat > "start-feature-dev.sh" << EOF
#!/bin/bash
# Development startup script for $FEATURE_NAME

echo "Starting $FEATURE_NAME feature development environment..."
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend: http://localhost:$BACKEND_PORT"

# Start backend
cd backend-v2
uvicorn main:app --reload --port $BACKEND_PORT &
BACKEND_PID=\$!

# Start frontend  
cd frontend-v2
npm run dev -- --port $FRONTEND_PORT &
FRONTEND_PID=\$!

echo "Backend PID: \$BACKEND_PID"
echo "Frontend PID: \$FRONTEND_PID"

# Save PIDs for cleanup
echo \$BACKEND_PID > ../feature_backend.pid
echo \$FRONTEND_PID > ../feature_frontend.pid

wait
EOF

cat > "stop-feature-dev.sh" << EOF
#!/bin/bash
# Stop development servers for $FEATURE_NAME

if [ -f "feature_backend.pid" ]; then
    kill \$(cat feature_backend.pid) 2>/dev/null || true
    rm feature_backend.pid
    echo "Backend stopped"
fi

if [ -f "feature_frontend.pid" ]; then
    kill \$(cat feature_frontend.pid) 2>/dev/null || true
    rm feature_frontend.pid
    echo "Frontend stopped"
fi

# Kill any remaining processes on our ports
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true

echo "Feature development servers stopped"
EOF

chmod +x "start-feature-dev.sh"
chmod +x "stop-feature-dev.sh"

# Display setup information
print_success "Feature worktree created successfully!"
echo
print_status "Worktree Information:"
echo "  Location: $WORKTREE_PATH"
echo "  Branch: $BRANCH_TO_USE"
echo "  Frontend Port: $FRONTEND_PORT"
echo "  Backend Port: $BACKEND_PORT"
echo
print_status "Next Steps:"
echo "  1. cd $WORKTREE_PATH"
echo "  2. ./start-feature-dev.sh    # Start development servers"
echo "  3. Start developing your feature!"
echo "  4. ./stop-feature-dev.sh     # Stop servers when done"
echo
print_status "Development URLs:"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Backend: http://localhost:$BACKEND_PORT"
echo "  Backend API Docs: http://localhost:$BACKEND_PORT/docs"
echo
print_warning "Remember to:"
echo "  - Commit changes regularly"
echo "  - Push your branch when ready: git push -u origin $BRANCH_TO_USE"
echo "  - Merge to main when feature is complete"