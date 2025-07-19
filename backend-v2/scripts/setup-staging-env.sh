#!/bin/bash

# BookedBarber V2 Agent System - Staging Environment Setup Script
# This script helps configure the staging environment for agent system deployment

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ENV_TEMPLATE="$BACKEND_DIR/.env.staging.template"
ENV_FILE="$BACKEND_DIR/.env.staging"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}"
    echo "=============================================================="
    echo " BookedBarber V2 Agent System - Staging Environment Setup"
    echo "=============================================================="
    echo -e "${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -f "$BACKEND_DIR/main.py" ]]; then
        log_error "Please run this script from the backend-v2 directory or its scripts subdirectory"
        exit 1
    fi
    
    # Check if template exists
    if [[ ! -f "$ENV_TEMPLATE" ]]; then
        log_error "Environment template file not found: $ENV_TEMPLATE"
        exit 1
    fi
    
    # Check for required tools
    command -v python3 >/dev/null 2>&1 || {
        log_error "python3 is required but not installed"
        exit 1
    }
    
    command -v psql >/dev/null 2>&1 || {
        log_warning "psql not found - database connectivity testing will be limited"
    }
    
    log_success "Prerequisites check passed"
}

create_staging_env() {
    log_info "Creating staging environment file..."
    
    if [[ -f "$ENV_FILE" ]]; then
        log_warning "Staging environment file already exists: $ENV_FILE"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping environment file creation"
            return 0
        fi
    fi
    
    # Copy template to staging env file
    cp "$ENV_TEMPLATE" "$ENV_FILE"
    log_success "Created staging environment file: $ENV_FILE"
    
    echo
    log_warning "IMPORTANT: You must now edit $ENV_FILE and update the following:"
    echo "  1. DATABASE_URL - Your staging PostgreSQL connection string"
    echo "  2. OPENAI_API_KEY - Your OpenAI API key for agent responses"
    echo "  3. JWT_SECRET_KEY - Generate a secure JWT secret"
    echo "  4. STRIPE_SECRET_KEY - Your Stripe test/staging API key"
    echo "  5. SENDGRID_API_KEY - Your SendGrid API key for emails"
    echo "  6. SENTRY_DSN - Your Sentry DSN for error tracking"
    echo
}

generate_secrets() {
    log_info "Generating secure secrets..."
    
    # Generate JWT secret
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
    log_success "Generated JWT secret: ${JWT_SECRET:0:20}..."
    
    # Generate other secrets
    API_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    log_success "Generated API secret: ${API_SECRET:0:15}..."
    
    echo
    log_info "Add these to your $ENV_FILE:"
    echo "JWT_SECRET_KEY=$JWT_SECRET"
    echo "API_SECRET_KEY=$API_SECRET"
    echo
}

validate_environment() {
    log_info "Validating staging environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Staging environment file not found: $ENV_FILE"
        return 1
    fi
    
    # Source the environment file
    source "$ENV_FILE"
    
    # Check required variables
    local required_vars=(
        "DATABASE_URL"
        "OPENAI_API_KEY"
        "JWT_SECRET_KEY"
        "AGENT_SYSTEM_ENABLED"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    # Validate specific configurations
    if [[ "$AGENT_SYSTEM_ENABLED" != "true" ]]; then
        log_warning "Agent system is disabled (AGENT_SYSTEM_ENABLED=$AGENT_SYSTEM_ENABLED)"
    fi
    
    if [[ "$DATABASE_URL" == *"postgresql"* ]]; then
        log_success "PostgreSQL database configured"
    else
        log_warning "Database URL doesn't appear to be PostgreSQL"
    fi
    
    if [[ "$OPENAI_API_KEY" == "sk-"* ]]; then
        log_success "OpenAI API key format appears valid"
    else
        log_error "OpenAI API key format appears invalid (should start with 'sk-')"
        return 1
    fi
    
    log_success "Environment validation passed"
    return 0
}

test_database_connection() {
    log_info "Testing database connection..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file not found - cannot test database"
        return 1
    fi
    
    # Source environment
    source "$ENV_FILE"
    
    if [[ -z "$DATABASE_URL" ]]; then
        log_error "DATABASE_URL not configured"
        return 1
    fi
    
    # Test database connection using Python
    python3 -c "
import os
import sys
from sqlalchemy import create_engine, text

try:
    engine = create_engine('$DATABASE_URL')
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1 as test'))
        test_value = result.scalar()
        if test_value == 1:
            print('✅ Database connection successful')
        else:
            print('❌ Database connection failed - unexpected result')
            sys.exit(1)
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    sys.exit(1)
" || {
        log_error "Database connection test failed"
        return 1
    }
    
    log_success "Database connection test passed"
    return 0
}

setup_agent_tables() {
    log_info "Setting up agent system database tables..."
    
    if [[ ! -f "$BACKEND_DIR/create_agent_tables.py" ]]; then
        log_error "Agent table creation script not found"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Set environment for staging
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    # Run agent table creation
    python3 create_agent_tables.py || {
        log_error "Failed to create agent tables"
        return 1
    }
    
    log_success "Agent tables created successfully"
    return 0
}

run_integration_tests() {
    log_info "Running integration tests..."
    
    if [[ ! -f "$BACKEND_DIR/test_real_data_integration.py" ]]; then
        log_error "Integration test script not found"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Set environment for staging
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    # Run integration tests
    python3 test_real_data_integration.py --staging --output="staging_test_report.md" || {
        log_warning "Integration tests failed - check staging_test_report.md for details"
        return 1
    }
    
    log_success "Integration tests passed"
    return 0
}

print_next_steps() {
    echo
    log_info "Next steps for staging deployment:"
    echo
    echo "1. 📝 Review and update environment configuration:"
    echo "   nano $ENV_FILE"
    echo
    echo "2. 🔐 Ensure all API keys and secrets are configured"
    echo
    echo "3. 🗄️  Set up staging database (if not already done):"
    echo "   ./scripts/setup-staging-env.sh --database-only"
    echo
    echo "4. 🧪 Run comprehensive tests:"
    echo "   ./scripts/setup-staging-env.sh --test-only"
    echo
    echo "5. 🚀 Deploy to staging environment:"
    echo "   Follow the deployment checklist in STAGING_DEPLOYMENT_CHECKLIST.md"
    echo
    echo "6. 📊 Monitor staging deployment:"
    echo "   Check Sentry, application logs, and performance metrics"
    echo
}

main() {
    local database_only=false
    local test_only=false
    local skip_tests=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --database-only)
                database_only=true
                shift
                ;;
            --test-only)
                test_only=true
                shift
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --database-only   Only set up database tables"
                echo "  --test-only       Only run integration tests"
                echo "  --skip-tests      Skip integration tests"
                echo "  -h, --help        Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    print_header
    check_prerequisites
    
    if [[ "$test_only" == true ]]; then
        validate_environment && \
        test_database_connection && \
        run_integration_tests
        exit $?
    fi
    
    if [[ "$database_only" == true ]]; then
        validate_environment && \
        test_database_connection && \
        setup_agent_tables
        exit $?
    fi
    
    # Full setup process
    create_staging_env
    generate_secrets
    
    echo
    log_info "Please edit $ENV_FILE with your staging configuration, then run:"
    echo "  $0 --database-only  # To set up database"
    echo "  $0 --test-only      # To run tests"
    echo
    
    read -p "Have you updated the environment file? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        validate_environment && \
        test_database_connection && \
        setup_agent_tables
        
        if [[ "$skip_tests" != true ]]; then
            run_integration_tests
        fi
        
        print_next_steps
    else
        log_info "Please update $ENV_FILE and run this script again"
    fi
}

# Run main function with all arguments
main "$@"