#!/bin/bash
# Admin CLI for 6FB Booking Platform
# Simple wrapper for admin scripts

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Show usage
usage() {
    echo "6FB Booking Platform Admin CLI"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create-admin    Create an admin user"
    echo "  populate        Populate test data"
    echo "  health          Run health checks"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 create-admin --email admin@example.com --name \"Admin User\""
    echo "  $0 populate --type services"
    echo "  $0 health --url https://your-app.onrender.com"
}

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required${NC}"
    exit 1
fi

# Main command handling
case "${1:-help}" in
    create-admin)
        shift
        python3 scripts/admin/create_admin_user.py "$@"
        ;;
    populate)
        shift
        python3 scripts/admin/populate_test_data.py "$@"
        ;;
    health)
        shift
        python3 scripts/health-check.py "$@"
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        usage
        exit 1
        ;;
esac
