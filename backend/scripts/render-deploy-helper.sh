#!/bin/bash
# Render Deployment Helper Script for 6FB Booking Platform
# This script helps with common Render deployment tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $1 in
        "success") echo -e "${GREEN}✅ $2${NC}" ;;
        "error") echo -e "${RED}❌ $2${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $2${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $2${NC}" ;;
    esac
}

# Function to check if running on Render
check_render_env() {
    if [ -z "$RENDER" ]; then
        print_status "warning" "Not running on Render environment"
        return 1
    else
        print_status "success" "Running on Render"
        return 0
    fi
}

# Function to run database migrations
run_migrations() {
    print_status "info" "Running database migrations..."
    cd /opt/render/project/src/backend
    
    if alembic upgrade head; then
        print_status "success" "Database migrations completed"
    else
        print_status "error" "Database migrations failed"
        exit 1
    fi
}

# Function to create initial admin user
create_admin() {
    print_status "info" "Creating admin user..."
    cd /opt/render/project/src/backend
    
    if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
        print_status "error" "ADMIN_EMAIL and ADMIN_PASSWORD environment variables required"
        exit 1
    fi
    
    python scripts/admin/create_admin_user.py \
        --email "$ADMIN_EMAIL" \
        --password "$ADMIN_PASSWORD" \
        --name "${ADMIN_NAME:-Admin User}"
}

# Function to populate test data
populate_data() {
    print_status "info" "Populating test data..."
    cd /opt/render/project/src/backend
    
    python scripts/admin/populate_test_data.py --type all
}

# Function to run health check
health_check() {
    print_status "info" "Running health check..."
    
    # Wait for service to be ready
    sleep 5
    
    # Use internal URL on Render
    if [ -n "$RENDER_INTERNAL_HOSTNAME" ]; then
        URL="http://${RENDER_INTERNAL_HOSTNAME}:10000"
    else
        URL="${HEALTH_CHECK_URL:-http://localhost:8000}"
    fi
    
    cd /opt/render/project/src/backend
    python scripts/health-check.py --url "$URL"
}

# Function to setup cron jobs on Render
setup_cron() {
    print_status "info" "Setting up cron jobs..."
    
    # Create cron directory
    mkdir -p /opt/render/project/src/cron
    
    # Create health check cron
    cat > /opt/render/project/src/cron/health-check.sh << 'EOF'
#!/bin/bash
cd /opt/render/project/src/backend
python scripts/health-check.py --url "$HEALTH_CHECK_URL" --save --output "/tmp/health-check-$(date +%Y%m%d-%H%M%S).json"
EOF
    
    chmod +x /opt/render/project/src/cron/health-check.sh
    print_status "success" "Cron jobs configured"
}

# Main menu
show_menu() {
    echo ""
    echo "🚀 6FB Booking Platform - Render Deployment Helper"
    echo "=================================================="
    echo "1. Run database migrations"
    echo "2. Create admin user"
    echo "3. Populate test data"
    echo "4. Run health check"
    echo "5. Setup cron jobs"
    echo "6. Full setup (all of the above)"
    echo "7. Exit"
    echo ""
}

# Parse command line arguments
if [ $# -gt 0 ]; then
    case $1 in
        "migrate") run_migrations ;;
        "admin") create_admin ;;
        "populate") populate_data ;;
        "health") health_check ;;
        "cron") setup_cron ;;
        "setup")
            run_migrations
            create_admin
            populate_data
            health_check
            setup_cron
            ;;
        *)
            echo "Usage: $0 [migrate|admin|populate|health|cron|setup]"
            exit 1
            ;;
    esac
else
    # Interactive mode
    while true; do
        show_menu
        read -p "Select an option: " choice
        
        case $choice in
            1) run_migrations ;;
            2) create_admin ;;
            3) populate_data ;;
            4) health_check ;;
            5) setup_cron ;;
            6)
                run_migrations
                create_admin
                populate_data
                health_check
                setup_cron
                ;;
            7)
                print_status "info" "Exiting..."
                exit 0
                ;;
            *)
                print_status "error" "Invalid option"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
fi