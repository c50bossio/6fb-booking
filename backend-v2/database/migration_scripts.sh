#!/bin/bash

# PostgreSQL Migration Scripts for BookedBarber V2
# This script provides convenient commands for the migration process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SQLITE_DB="6fb_booking.db"
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-bookedbarber_app}"
PG_DATABASE="${PG_DATABASE:-bookedbarber_v2}"

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

check_requirements() {
    log_info "Checking requirements..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL client (psql) is required but not installed"
        exit 1
    fi
    
    # Check Python packages
    python3 -c "import psycopg2, sqlalchemy, alembic, tqdm" 2>/dev/null || {
        log_error "Required Python packages not installed. Run: pip install psycopg2-binary sqlalchemy alembic tqdm"
        exit 1
    }
    
    # Check SQLite database exists
    if [ ! -f "$PROJECT_DIR/$SQLITE_DB" ]; then
        log_error "SQLite database not found: $PROJECT_DIR/$SQLITE_DB"
        exit 1
    fi
    
    log_success "All requirements met"
}

get_password() {
    if [ -z "$PG_PASSWORD" ]; then
        echo -n "Enter PostgreSQL password for user $PG_USER: "
        read -s PG_PASSWORD
        echo
        export PG_PASSWORD
    fi
}

test_pg_connection() {
    log_info "Testing PostgreSQL connection..."
    get_password
    
    PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT version();" &>/dev/null || {
        log_error "Cannot connect to PostgreSQL database"
        log_error "Host: $PG_HOST:$PG_PORT, User: $PG_USER, Database: $PG_DATABASE"
        exit 1
    }
    
    log_success "PostgreSQL connection successful"
}

backup_sqlite() {
    log_info "Creating SQLite backup..."
    
    local backup_dir="backup_$(date +%Y%m%d_%H%M%S)"
    
    cd "$PROJECT_DIR"
    python3 database/backup_sqlite.py --backup-dir "$backup_dir" || {
        log_error "SQLite backup failed"
        exit 1
    }
    
    log_success "SQLite backup created in: $backup_dir"
    echo "$backup_dir" > .last_backup_dir
}

setup_postgresql() {
    log_info "Setting up PostgreSQL database..."
    get_password
    
    # Check if setup script exists
    if [ ! -f "$SCRIPT_DIR/postgresql_setup.sql" ]; then
        log_error "PostgreSQL setup script not found: $SCRIPT_DIR/postgresql_setup.sql"
        exit 1
    fi
    
    # Run setup script (requires superuser access)
    log_warning "This step requires PostgreSQL superuser access"
    echo -n "Enter PostgreSQL superuser password: "
    read -s POSTGRES_PASSWORD
    echo
    
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U postgres -f "$SCRIPT_DIR/postgresql_setup.sql" || {
        log_error "PostgreSQL setup failed"
        exit 1
    }
    
    log_success "PostgreSQL database setup completed"
}

test_postgresql_setup() {
    log_info "Testing PostgreSQL setup..."
    get_password
    
    cd "$PROJECT_DIR"
    python3 database/test_postgresql_setup.py \
        --pg-host "$PG_HOST" \
        --pg-port "$PG_PORT" \
        --pg-database "$PG_DATABASE" \
        --pg-user "$PG_USER" \
        --pg-password "$PG_PASSWORD" \
        --report-file "postgresql_setup_test_$(date +%Y%m%d_%H%M%S).json" || {
        log_error "PostgreSQL setup test failed"
        exit 1
    }
    
    log_success "PostgreSQL setup test passed"
}

update_alembic_config() {
    log_info "Updating Alembic configuration for PostgreSQL..."
    get_password
    
    cd "$PROJECT_DIR"
    
    # Backup current alembic.ini
    if [ ! -f "alembic.ini.sqlite.backup" ]; then
        cp alembic.ini alembic.ini.sqlite.backup
        log_info "Created backup: alembic.ini.sqlite.backup"
    fi
    
    # Update DATABASE_URL in alembic.ini
    local pg_url="postgresql://$PG_USER:$PG_PASSWORD@$PG_HOST:$PG_PORT/$PG_DATABASE"
    sed -i.bak "s|sqlalchemy.url = .*|sqlalchemy.url = $pg_url|" alembic.ini
    
    log_success "Alembic configuration updated for PostgreSQL"
}

run_alembic_migrations() {
    log_info "Running Alembic migrations..."
    
    cd "$PROJECT_DIR"
    alembic upgrade head || {
        log_error "Alembic migrations failed"
        exit 1
    }
    
    log_success "Alembic migrations completed"
}

migrate_data() {
    log_info "Starting data migration from SQLite to PostgreSQL..."
    get_password
    
    local batch_size="${BATCH_SIZE:-1000}"
    
    cd "$PROJECT_DIR"
    python3 database/migrate_sqlite_to_postgresql.py \
        --sqlite-path "$SQLITE_DB" \
        --pg-host "$PG_HOST" \
        --pg-port "$PG_PORT" \
        --pg-database "$PG_DATABASE" \
        --pg-user "$PG_USER" \
        --pg-password "$PG_PASSWORD" \
        --batch-size "$batch_size" || {
        log_error "Data migration failed"
        exit 1
    }
    
    log_success "Data migration completed"
}

dry_run_migration() {
    log_info "Running migration dry run..."
    get_password
    
    cd "$PROJECT_DIR"
    python3 database/migrate_sqlite_to_postgresql.py \
        --sqlite-path "$SQLITE_DB" \
        --pg-host "$PG_HOST" \
        --pg-port "$PG_PORT" \
        --pg-database "$PG_DATABASE" \
        --pg-user "$PG_USER" \
        --pg-password "$PG_PASSWORD" \
        --dry-run || {
        log_error "Migration dry run failed"
        exit 1
    }
    
    log_success "Migration dry run completed"
}

validate_migration() {
    log_info "Validating migration..."
    get_password
    
    cd "$PROJECT_DIR"
    python3 database/validate_migration.py \
        --sqlite-path "$SQLITE_DB" \
        --pg-host "$PG_HOST" \
        --pg-port "$PG_PORT" \
        --pg-database "$PG_DATABASE" \
        --pg-user "$PG_USER" \
        --pg-password "$PG_PASSWORD" \
        --report-file "migration_validation_$(date +%Y%m%d_%H%M%S).json" || {
        log_error "Migration validation failed"
        exit 1
    }
    
    log_success "Migration validation passed"
}

update_app_config() {
    log_info "Updating application configuration..."
    get_password
    
    cd "$PROJECT_DIR"
    
    # Backup current .env
    if [ -f ".env" ] && [ ! -f ".env.sqlite.backup" ]; then
        cp .env .env.sqlite.backup
        log_info "Created backup: .env.sqlite.backup"
    fi
    
    # Create PostgreSQL configuration
    if [ -f ".env.postgresql.template" ]; then
        cp .env.postgresql.template .env.production
        log_info "Created .env.production from template"
        log_warning "Please edit .env.production with your actual values"
    fi
    
    # Update DATABASE_URL in .env if it exists
    if [ -f ".env" ]; then
        local pg_url="postgresql://$PG_USER:$PG_PASSWORD@$PG_HOST:$PG_PORT/$PG_DATABASE"
        if grep -q "DATABASE_URL" .env; then
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=$pg_url|" .env
        else
            echo "DATABASE_URL=$pg_url" >> .env
        fi
        log_success "Updated DATABASE_URL in .env"
    fi
}

rollback_to_sqlite() {
    log_warning "Rolling back to SQLite configuration..."
    
    cd "$PROJECT_DIR"
    
    # Restore alembic.ini
    if [ -f "alembic.ini.sqlite.backup" ]; then
        cp alembic.ini.sqlite.backup alembic.ini
        log_info "Restored alembic.ini"
    fi
    
    # Restore .env
    if [ -f ".env.sqlite.backup" ]; then
        cp .env.sqlite.backup .env
        log_info "Restored .env"
    fi
    
    log_success "Rollback to SQLite completed"
}

show_help() {
    cat << EOF
PostgreSQL Migration Scripts for BookedBarber V2

Usage: $0 COMMAND [OPTIONS]

Commands:
  check               Check requirements and dependencies
  backup              Create SQLite database backup
  setup-pg            Setup PostgreSQL databases and users
  test-pg             Test PostgreSQL setup
  update-alembic      Update Alembic configuration for PostgreSQL
  migrate-schema      Run Alembic migrations
  dry-run             Run migration dry run (no actual data transfer)
  migrate             Migrate data from SQLite to PostgreSQL
  validate            Validate migration results
  update-config       Update application configuration
  full-migration      Run complete migration process
  rollback            Rollback to SQLite configuration
  help                Show this help message

Environment Variables:
  PG_HOST             PostgreSQL host (default: localhost)
  PG_PORT             PostgreSQL port (default: 5432)
  PG_USER             PostgreSQL user (default: bookedbarber_app)
  PG_DATABASE         PostgreSQL database (default: bookedbarber_v2)
  PG_PASSWORD         PostgreSQL password (will prompt if not set)
  BATCH_SIZE          Migration batch size (default: 1000)

Examples:
  $0 check                    # Check requirements
  $0 backup                   # Create SQLite backup
  $0 setup-pg                 # Setup PostgreSQL
  $0 dry-run                  # Test migration without transferring data
  $0 full-migration           # Run complete migration
  PG_HOST=prod.db.com $0 migrate  # Migrate to remote database
  
For detailed instructions, see: database/POSTGRESQL_MIGRATION_GUIDE.md
EOF
}

full_migration() {
    log_info "Starting full migration process..."
    
    echo "This will perform a complete migration from SQLite to PostgreSQL."
    echo "The following steps will be performed:"
    echo "1. Check requirements"
    echo "2. Create SQLite backup"
    echo "3. Test PostgreSQL connection"
    echo "4. Update Alembic configuration"
    echo "5. Run schema migrations"
    echo "6. Migrate data"
    echo "7. Validate migration"
    echo "8. Update application configuration"
    echo
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Migration cancelled by user"
        exit 0
    fi
    
    # Execute all steps
    check_requirements
    backup_sqlite
    test_pg_connection
    update_alembic_config
    run_alembic_migrations
    migrate_data
    validate_migration
    update_app_config
    
    log_success "Full migration completed successfully!"
    log_info "Next steps:"
    echo "1. Review .env.production configuration"
    echo "2. Test application with PostgreSQL"
    echo "3. Update production deployment"
    echo "4. Set up monitoring and backups"
    echo
    echo "For detailed post-migration steps, see: database/POSTGRESQL_MIGRATION_GUIDE.md"
}

# Main script logic
case "${1:-help}" in
    "check")
        check_requirements
        ;;
    "backup")
        check_requirements
        backup_sqlite
        ;;
    "setup-pg")
        check_requirements
        setup_postgresql
        ;;
    "test-pg")
        check_requirements
        test_postgresql_setup
        ;;
    "update-alembic")
        check_requirements
        update_alembic_config
        ;;
    "migrate-schema")
        check_requirements
        test_pg_connection
        run_alembic_migrations
        ;;
    "dry-run")
        check_requirements
        dry_run_migration
        ;;
    "migrate")
        check_requirements
        test_pg_connection
        migrate_data
        ;;
    "validate")
        check_requirements
        validate_migration
        ;;
    "update-config")
        check_requirements
        update_app_config
        ;;
    "full-migration")
        full_migration
        ;;
    "rollback")
        rollback_to_sqlite
        ;;
    "help"|*)
        show_help
        ;;
esac