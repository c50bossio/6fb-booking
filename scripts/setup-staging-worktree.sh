#!/bin/bash

# setup-staging-worktree.sh - Set up the staging worktree with proper configuration
# Usage: ./scripts/setup-staging-worktree.sh

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

STAGING_WORKTREE_PATH="/Users/bossio/6fb-booking-staging"
STAGING_PORT=3001
STAGING_BACKEND_PORT=8001

print_status "Setting up staging worktree..."

# Check if staging worktree already exists
if [ -d "$STAGING_WORKTREE_PATH" ]; then
    print_warning "Staging worktree already exists at: $STAGING_WORKTREE_PATH"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing existing staging worktree..."
        git worktree remove "$STAGING_WORKTREE_PATH" --force 2>/dev/null || true
        rm -rf "$STAGING_WORKTREE_PATH"
    else
        print_status "Using existing staging worktree"
        exit 0
    fi
fi

# Check if staging branch exists
if ! git show-ref --verify --quiet "refs/heads/staging"; then
    print_error "Staging branch does not exist!"
    print_status "Creating staging branch from develop..."
    git branch staging develop
    print_success "Created staging branch"
fi

# Create the staging worktree
print_status "Creating staging worktree from staging branch..."
git worktree add "$STAGING_WORKTREE_PATH" staging

# Navigate to the staging worktree
cd "$STAGING_WORKTREE_PATH"

print_status "Setting up staging environment configuration..."

# Set up backend staging environment
if [ -d "backend-v2" ]; then
    cd backend-v2
    
    # Create staging environment file
    print_status "Creating backend staging environment..."
    if [ -f "/Users/bossio/6fb-booking/backend-v2/.env.template" ]; then
        cp "/Users/bossio/6fb-booking/backend-v2/.env.template" ".env.staging"
    else
        print_warning "No backend .env.template found, creating staging environment from scratch"
    fi
    
    # Customize staging environment
    cat > ".env.staging" << EOF
# Staging Environment Configuration
ENVIRONMENT=staging
DEBUG=false
PORT=$STAGING_BACKEND_PORT

# Database
DATABASE_URL=sqlite:///./staging_6fb_booking.db

# Redis
REDIS_URL=redis://localhost:6379/1

# API Configuration
API_V1_PREFIX=/api/v1
BACKEND_CORS_ORIGINS=["http://localhost:$STAGING_PORT","https://staging.bookedbarber.com"]

# Security
SECRET_KEY=staging_secret_key_$(openssl rand -hex 32)
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email Configuration (staging)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587

# Stripe Configuration (test keys for staging)
STRIPE_SECRET_KEY=sk_test_staging_key
STRIPE_WEBHOOK_SECRET=whsec_staging_webhook_secret

# Google Calendar (staging credentials)
GOOGLE_CLIENT_ID=staging_google_client_id
GOOGLE_CLIENT_SECRET=staging_google_client_secret

# Feature Flags
ENABLE_REAL_PAYMENTS=false
ENABLE_EMAIL_SENDING=false
ENABLE_SMS_SENDING=false

# Logging
LOG_LEVEL=INFO
LOG_FILE=staging_backend.log
EOF
    
    print_success "Created backend staging environment"
    
    # Set up frontend staging environment
    if [ -d "frontend-v2" ]; then
        cd frontend-v2
        
        print_status "Creating frontend staging environment..."
        cat > ".env.local" << EOF
# Frontend Staging Environment
NEXT_PUBLIC_API_URL=http://localhost:$STAGING_BACKEND_PORT
NEXT_PUBLIC_ENVIRONMENT=staging

# Stripe (test keys for staging)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_staging_key

# Google Analytics (staging)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-STAGING123

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_CHAT_SUPPORT=false
NEXT_PUBLIC_DEBUG_MODE=true

# App Configuration
NEXT_PUBLIC_APP_NAME=BookedBarber Staging
NEXT_PUBLIC_APP_DESCRIPTION=Staging environment for BookedBarber platform
NEXT_PUBLIC_CONTACT_EMAIL=staging@bookedbarber.com

# SEO Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:$STAGING_PORT
NEXT_PUBLIC_CANONICAL_URL=https://staging.bookedbarber.com
EOF
        
        print_success "Created frontend staging environment"
        cd ..
    fi
    cd ..
fi

# Create staging development scripts
print_status "Creating staging helper scripts..."

cat > "start-staging.sh" << EOF
#!/bin/bash
# Start staging environment

echo "Starting BookedBarber staging environment..."
echo "Frontend: http://localhost:$STAGING_PORT"
echo "Backend: http://localhost:$STAGING_BACKEND_PORT"

# Check if ports are available
if lsof -i :$STAGING_PORT > /dev/null 2>&1; then
    echo "Warning: Port $STAGING_PORT is already in use"
    exit 1
fi

if lsof -i :$STAGING_BACKEND_PORT > /dev/null 2>&1; then
    echo "Warning: Port $STAGING_BACKEND_PORT is already in use" 
    exit 1
fi

# Start backend
cd backend-v2
echo "Starting staging backend on port $STAGING_BACKEND_PORT..."
uvicorn main:app --reload --port $STAGING_BACKEND_PORT --env-file .env.staging &
BACKEND_PID=\$!

# Wait for backend to start
sleep 3

# Start frontend
cd frontend-v2
echo "Starting staging frontend on port $STAGING_PORT..."
npm run dev -- --port $STAGING_PORT &
FRONTEND_PID=\$!

echo "Backend PID: \$BACKEND_PID"
echo "Frontend PID: \$FRONTEND_PID"

# Save PIDs for cleanup
echo \$BACKEND_PID > ../staging_backend.pid
echo \$FRONTEND_PID > ../staging_frontend.pid

echo
echo "Staging environment started successfully!"
echo "Frontend: http://localhost:$STAGING_PORT"
echo "Backend API: http://localhost:$STAGING_BACKEND_PORT"
echo "Backend Docs: http://localhost:$STAGING_BACKEND_PORT/docs"
echo
echo "To stop: ./stop-staging.sh"

wait
EOF

cat > "stop-staging.sh" << EOF
#!/bin/bash
# Stop staging environment

echo "Stopping BookedBarber staging environment..."

if [ -f "staging_backend.pid" ]; then
    kill \$(cat staging_backend.pid) 2>/dev/null || true
    rm staging_backend.pid
    echo "Staging backend stopped"
fi

if [ -f "staging_frontend.pid" ]; then
    kill \$(cat staging_frontend.pid) 2>/dev/null || true
    rm staging_frontend.pid  
    echo "Staging frontend stopped"
fi

# Kill any remaining processes on staging ports
lsof -ti:$STAGING_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$STAGING_BACKEND_PORT | xargs kill -9 2>/dev/null || true

echo "Staging environment stopped"
EOF

cat > "reset-staging.sh" << EOF
#!/bin/bash
# Reset staging environment data

echo "Resetting staging environment data..."

# Stop staging servers if running
./stop-staging.sh 2>/dev/null || true

# Remove staging database
if [ -f "backend-v2/staging_6fb_booking.db" ]; then
    rm backend-v2/staging_6fb_booking.db
    echo "Removed staging database"
fi

# Run migrations to recreate database
cd backend-v2
ENV_FILE=.env.staging alembic upgrade head
echo "Database migrations applied"

# Optionally populate with test data
if [ -f "scripts/populate_staging_data.py" ]; then
    ENV_FILE=.env.staging python scripts/populate_staging_data.py
    echo "Staging test data populated"
fi

cd ..

echo "Staging environment reset complete"
echo "Run ./start-staging.sh to start the staging environment"
EOF

cat > "deploy-to-staging.sh" << EOF
#!/bin/bash
# Deploy current staging branch to staging environment

echo "Deploying to staging environment..."

# Ensure we're on staging branch
current_branch=\$(git branch --show-current)
if [ "\$current_branch" != "staging" ]; then
    echo "Error: Not on staging branch. Current branch: \$current_branch"
    exit 1
fi

# Pull latest changes
git pull origin staging

# Install/update dependencies
cd backend-v2
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    echo "Backend dependencies updated"
fi

if [ -d "frontend-v2" ]; then
    cd frontend-v2
    npm install
    echo "Frontend dependencies updated"
    cd ..
fi

cd ..

# Reset and restart staging environment
echo "Resetting staging environment..."
./reset-staging.sh

echo "Starting staging environment..."
./start-staging.sh

echo "Deployment to staging complete!"
EOF

chmod +x "start-staging.sh"
chmod +x "stop-staging.sh"
chmod +x "reset-staging.sh"
chmod +x "deploy-to-staging.sh"

# Initialize staging database
if [ -d "backend-v2" ]; then
    cd backend-v2
    if [ -f "alembic.ini" ]; then
        print_status "Initializing staging database..."
        ENV_FILE=.env.staging alembic upgrade head
        print_success "Staging database initialized"
    fi
    cd ..
fi

# Display setup information
print_success "Staging worktree setup complete!"
echo
print_status "Staging Worktree Information:"
echo "  Location: $STAGING_WORKTREE_PATH"
echo "  Branch: staging"
echo "  Frontend Port: $STAGING_PORT"
echo "  Backend Port: $STAGING_BACKEND_PORT"
echo
print_status "Available Scripts:"
echo "  ./start-staging.sh       # Start staging environment"
echo "  ./stop-staging.sh        # Stop staging environment"
echo "  ./reset-staging.sh       # Reset staging data"
echo "  ./deploy-to-staging.sh   # Deploy to staging"
echo
print_status "Staging URLs:"
echo "  Frontend: http://localhost:$STAGING_PORT"
echo "  Backend: http://localhost:$STAGING_BACKEND_PORT"
echo "  Backend API Docs: http://localhost:$STAGING_BACKEND_PORT/docs"
echo
print_status "Next Steps:"
echo "  1. cd $STAGING_WORKTREE_PATH"
echo "  2. ./start-staging.sh    # Test the staging environment"
echo "  3. Use for pre-deployment testing with staging configs"
echo
print_warning "Remember:"
echo "  - Staging uses separate database and Redis DB"
echo "  - Use staging for testing with production-like settings"
echo "  - Merge develop -> staging -> production for deployments"