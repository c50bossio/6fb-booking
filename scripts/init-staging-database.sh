#!/bin/bash

# init-staging-database.sh - Initialize staging database with proper environment
# Usage: ./scripts/init-staging-database.sh

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

STAGING_PATH="/Users/bossio/6fb-booking-staging"

# Check if staging worktree exists
if [ ! -d "$STAGING_PATH" ]; then
    print_error "Staging worktree not found at: $STAGING_PATH"
    print_status "Run: ./scripts/setup-staging-worktree.sh"
    exit 1
fi

print_status "Initializing staging database..."

# Change to staging worktree and initialize database
(
    cd "$STAGING_PATH/backend-v2"
    
    # Generate a proper Fernet encryption key
    FERNET_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    
    # Update environment file with proper Fernet key
    if [ -f ".env.staging" ]; then
        # Replace the placeholder encryption key with a real Fernet key
        sed -i '' "s/ENCRYPTION_KEY=staging_encryption_key_generate_with_fernet_key_for_production/ENCRYPTION_KEY=$FERNET_KEY/g" .env.staging
        print_success "Updated encryption key in staging environment"
    else
        print_error "Staging environment file not found: .env.staging"
        exit 1
    fi
    
    # Set environment variable for alembic
    export ENV_FILE=.env.staging
    
    # Remove existing database if it exists
    if [ -f "staging_6fb_booking.db" ]; then
        rm staging_6fb_booking.db
        print_status "Removed existing staging database"
    fi
    
    # Run database migrations
    print_status "Running database migrations..."
    alembic upgrade head
    
    if [ $? -eq 0 ]; then
        print_success "Staging database initialized successfully"
    else
        print_error "Database migration failed"
        exit 1
    fi
    
    print_status "Database file: $(pwd)/staging_6fb_booking.db"
    if [ -f "staging_6fb_booking.db" ]; then
        SIZE=$(ls -lh staging_6fb_booking.db | awk '{print $5}')
        print_success "Database created successfully (Size: $SIZE)"
    fi
)

print_success "Staging database initialization complete!"
echo
print_status "Next steps:"
echo "  1. cd $STAGING_PATH"
echo "  2. ./start-staging.sh"
echo "  3. Test staging environment at http://localhost:3001"