#!/bin/bash

# 6FB Development Restart Script
# Restart individual servers or both

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    echo -e "${BLUE}6FB Development Restart Script${NC}"
    echo "=============================="
    echo ""
    echo "Usage: bash dev-restart.sh [service]"
    echo ""
    echo "Services:"
    echo "  backend, be    Restart backend server only"
    echo "  frontend, fe   Restart frontend server only"
    echo "  all, both      Restart both servers (default)"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  bash dev-restart.sh backend"
    echo "  bash dev-restart.sh fe"
    echo "  bash dev-restart.sh"
}

restart_backend() {
    echo -e "${BLUE}🔄 Restarting Backend Server${NC}"
    echo "=============================="
    bash dev-manager.sh restart-backend
}

restart_frontend() {
    echo -e "${BLUE}🔄 Restarting Frontend Server${NC}"
    echo "==============================="
    bash dev-manager.sh restart-frontend
}

restart_all() {
    echo -e "${BLUE}🔄 Restarting All Servers${NC}"
    echo "=========================="
    bash dev-manager.sh restart
}

case "${1:-all}" in
    "backend"|"be")
        restart_backend
        ;;
    "frontend"|"fe")
        restart_frontend
        ;;
    "all"|"both"|"")
        restart_all
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown service: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
