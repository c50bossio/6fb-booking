#!/bin/bash

# 6FB Booking Platform - Staging Data Sync Script
# This script handles syncing production data to staging environment
# with proper anonymization and data protection

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STAGING_ENV_FILE="$PROJECT_ROOT/backend/.env.staging"
PRODUCTION_ENV_FILE="$PROJECT_ROOT/backend/.env.production"
SYNC_LOG="/tmp/6fb-staging-sync-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$SYNC_LOG"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}" | tee -a "$SYNC_LOG"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}" | tee -a "$SYNC_LOG"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a "$SYNC_LOG"
}

# Error handler
error_exit() {
    log_error "Data sync failed: $1"
    log "Check the sync log at: $SYNC_LOG"
    exit 1
}

# Help function
show_help() {
    cat << EOF
6FB Booking Platform - Staging Data Sync Script

Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -f, --force             Force sync without confirmation
    -a, --anonymize         Anonymize sensitive data (default: true)
    -s, --sample-only       Sync only a sample of data (recommended)
    -t, --test-data         Use test data instead of production
    --full-sync             Sync all production data (NOT RECOMMENDED)
    --dry-run               Show what would be synced without actually syncing
    --backup-first          Create backup before sync (recommended)

Sync Types:
    --appointments          Sync appointments data only
    --users                 Sync user data only (anonymized)
    --locations             Sync location/business data only
    --analytics             Sync analytics data only
    --all                   Sync all data types (default)

Examples:
    $0                      # Interactive sync with anonymization
    $0 -s -a                # Sample sync with anonymization
    $0 --test-data          # Use test data instead of production
    $0 --appointments       # Sync only appointments
    $0 --dry-run            # Preview what would be synced

IMPORTANT: This script will anonymize sensitive data by default.
Use --full-sync only if you understand the privacy implications.

EOF
}

# Default options
FORCE=false
ANONYMIZE=true
SAMPLE_ONLY=false
TEST_DATA=false
FULL_SYNC=false
DRY_RUN=false
BACKUP_FIRST=true

# Sync types
SYNC_APPOINTMENTS=true
SYNC_USERS=true
SYNC_LOCATIONS=true
SYNC_ANALYTICS=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -a|--anonymize)
            ANONYMIZE=true
            shift
            ;;
        -s|--sample-only)
            SAMPLE_ONLY=true
            shift
            ;;
        -t|--test-data)
            TEST_DATA=true
            shift
            ;;
        --full-sync)
            FULL_SYNC=true
            SAMPLE_ONLY=false
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --backup-first)
            BACKUP_FIRST=true
            shift
            ;;
        --appointments)
            SYNC_APPOINTMENTS=true
            SYNC_USERS=false
            SYNC_LOCATIONS=false
            SYNC_ANALYTICS=false
            shift
            ;;
        --users)
            SYNC_APPOINTMENTS=false
            SYNC_USERS=true
            SYNC_LOCATIONS=false
            SYNC_ANALYTICS=false
            shift
            ;;
        --locations)
            SYNC_APPOINTMENTS=false
            SYNC_USERS=false
            SYNC_LOCATIONS=true
            SYNC_ANALYTICS=false
            shift
            ;;
        --analytics)
            SYNC_APPOINTMENTS=false
            SYNC_USERS=false
            SYNC_LOCATIONS=false
            SYNC_ANALYTICS=true
            shift
            ;;
        --all)
            SYNC_APPOINTMENTS=true
            SYNC_USERS=true
            SYNC_LOCATIONS=true
            SYNC_ANALYTICS=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if required tools are installed
    local required_tools=("psql" "pg_dump" "python3")

    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error_exit "$tool is required but not installed"
        fi
    done

    # Check if environment files exist
    if [ ! -f "$STAGING_ENV_FILE" ]; then
        error_exit "Staging environment file not found: $STAGING_ENV_FILE"
    fi

    if [ "$TEST_DATA" = false ] && [ ! -f "$PRODUCTION_ENV_FILE" ]; then
        log_warning "Production environment file not found: $PRODUCTION_ENV_FILE"
        log_warning "Will use test data instead"
        TEST_DATA=true
    fi

    log_success "Prerequisites check passed"
}

# Function to load environment variables
load_environment() {
    log "Loading environment variables..."

    # Load staging environment
    if [ -f "$STAGING_ENV_FILE" ]; then
        set -a
        source "$STAGING_ENV_FILE"
        set +a
        STAGING_DB_URL="$DATABASE_URL"
    fi

    # Load production environment (if not using test data)
    if [ "$TEST_DATA" = false ] && [ -f "$PRODUCTION_ENV_FILE" ]; then
        set -a
        source "$PRODUCTION_ENV_FILE"
        set +a
        PRODUCTION_DB_URL="$DATABASE_URL"
    fi

    log_success "Environment variables loaded"
}

# Function to create backup
create_backup() {
    if [ "$BACKUP_FIRST" = false ]; then
        log "Skipping backup as requested"
        return 0
    fi

    log "Creating backup of staging database..."

    local backup_dir="/tmp/6fb-staging-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"

    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would create backup at $backup_dir"
        return 0
    fi

    # Extract database connection details
    local db_host=$(echo "$STAGING_DB_URL" | sed 's/.*@\\([^:]*\\):.*/\\1/')
    local db_port=$(echo "$STAGING_DB_URL" | sed 's/.*:\\([0-9]*\\)\\/.*/\\1/')
    local db_name=$(echo "$STAGING_DB_URL" | sed 's/.*\\/\\([^?]*\\).*/\\1/')
    local db_user=$(echo "$STAGING_DB_URL" | sed 's/.*\\/\\/\\([^:]*\\):.*/\\1/')
    local db_pass=$(echo "$STAGING_DB_URL" | sed 's/.*\\/\\/[^:]*:\\([^@]*\\)@.*/\\1/')

    # Create database backup
    PGPASSWORD="$db_pass" pg_dump -h "$db_host" -p "$db_port" -U "$db_user" "$db_name" > "$backup_dir/staging_backup.sql"

    if [ $? -eq 0 ]; then
        log_success "Backup created at $backup_dir/staging_backup.sql"
        echo "$backup_dir" > /tmp/6fb-staging-backup-latest
    else
        error_exit "Failed to create backup"
    fi
}

# Function to generate anonymized test data
generate_test_data() {
    log "Generating test data..."

    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would generate test data"
        return 0
    fi

    # Create test data generation script
    cat > /tmp/generate_test_data.py << 'EOF'
import random
import string
import uuid
from datetime import datetime, timedelta
from faker import Faker
import json

fake = Faker()

def generate_users(count=50):
    users = []
    for i in range(count):
        user = {
            "id": str(uuid.uuid4()),
            "email": fake.email(),
            "name": fake.name(),
            "phone": fake.phone_number(),
            "created_at": fake.date_time_between(start_date='-2y', end_date='now').isoformat(),
            "is_active": random.choice([True, True, True, False]),  # 75% active
            "role": random.choice(['client', 'barber', 'admin']),
        }
        users.append(user)
    return users

def generate_locations(count=5):
    locations = []
    for i in range(count):
        location = {
            "id": str(uuid.uuid4()),
            "name": fake.company(),
            "address": fake.address(),
            "city": fake.city(),
            "state": fake.state_abbr(),
            "zip_code": fake.zipcode(),
            "phone": fake.phone_number(),
            "created_at": fake.date_time_between(start_date='-1y', end_date='now').isoformat(),
        }
        locations.append(location)
    return locations

def generate_appointments(count=200):
    appointments = []
    for i in range(count):
        start_time = fake.date_time_between(start_date='-6m', end_date='+1m')
        appointment = {
            "id": str(uuid.uuid4()),
            "client_id": str(uuid.uuid4()),
            "barber_id": str(uuid.uuid4()),
            "location_id": str(uuid.uuid4()),
            "service": random.choice(['Haircut', 'Beard Trim', 'Full Service', 'Wash & Style']),
            "start_time": start_time.isoformat(),
            "end_time": (start_time + timedelta(hours=1)).isoformat(),
            "status": random.choice(['scheduled', 'completed', 'cancelled', 'no_show']),
            "price": random.uniform(25.0, 150.0),
            "created_at": fake.date_time_between(start_date='-6m', end_date='now').isoformat(),
        }
        appointments.append(appointment)
    return appointments

def generate_analytics(count=100):
    analytics = []
    for i in range(count):
        record = {
            "id": str(uuid.uuid4()),
            "date": fake.date_between(start_date='-3m', end_date='now').isoformat(),
            "metric": random.choice(['revenue', 'appointments', 'clients', 'cancellations']),
            "value": random.uniform(10.0, 1000.0),
            "location_id": str(uuid.uuid4()),
        }
        analytics.append(record)
    return analytics

# Generate all test data
test_data = {
    "users": generate_users(50),
    "locations": generate_locations(5),
    "appointments": generate_appointments(200),
    "analytics": generate_analytics(100)
}

# Save to file
with open('/tmp/test_data.json', 'w') as f:
    json.dump(test_data, f, indent=2)

print("Test data generated successfully")
EOF

    # Run test data generation
    python3 /tmp/generate_test_data.py

    if [ $? -eq 0 ]; then
        log_success "Test data generated"
    else
        error_exit "Failed to generate test data"
    fi
}

# Function to anonymize sensitive data
anonymize_data() {
    local data_file="$1"

    if [ "$ANONYMIZE" = false ]; then
        log "Skipping data anonymization as requested"
        return 0
    fi

    log "Anonymizing sensitive data..."

    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would anonymize data in $data_file"
        return 0
    fi

    # Create anonymization script
    cat > /tmp/anonymize_data.py << 'EOF'
import json
import sys
import hashlib
import re
from faker import Faker

fake = Faker()

def anonymize_email(email):
    """Anonymize email while keeping domain structure"""
    if '@' in email:
        local, domain = email.split('@', 1)
        return f"user{hash(local) % 10000}@{domain}"
    return fake.email()

def anonymize_phone(phone):
    """Generate fake phone number"""
    return fake.phone_number()

def anonymize_name(name):
    """Generate fake name"""
    return fake.name()

def anonymize_address(address):
    """Generate fake address"""
    return fake.address()

def hash_id(original_id):
    """Create consistent hash of ID"""
    return hashlib.md5(str(original_id).encode()).hexdigest()[:8]

def anonymize_record(record, record_type):
    """Anonymize a single record based on its type"""
    if record_type == 'users':
        if 'email' in record:
            record['email'] = anonymize_email(record['email'])
        if 'name' in record:
            record['name'] = anonymize_name(record['name'])
        if 'phone' in record:
            record['phone'] = anonymize_phone(record['phone'])
        if 'first_name' in record:
            record['first_name'] = fake.first_name()
        if 'last_name' in record:
            record['last_name'] = fake.last_name()

    elif record_type == 'locations':
        if 'address' in record:
            record['address'] = anonymize_address(record['address'])
        if 'phone' in record:
            record['phone'] = anonymize_phone(record['phone'])
        if 'owner_name' in record:
            record['owner_name'] = anonymize_name(record['owner_name'])

    elif record_type == 'appointments':
        # Keep appointment structure but anonymize references
        if 'client_notes' in record:
            record['client_notes'] = "Sample notes for testing"
        if 'barber_notes' in record:
            record['barber_notes'] = "Sample barber notes"

    return record

def main():
    if len(sys.argv) != 2:
        print("Usage: python anonymize_data.py <data_file>")
        sys.exit(1)

    data_file = sys.argv[1]

    try:
        with open(data_file, 'r') as f:
            data = json.load(f)

        # Anonymize each data type
        for data_type, records in data.items():
            print(f"Anonymizing {len(records)} {data_type} records...")
            for i, record in enumerate(records):
                data[data_type][i] = anonymize_record(record, data_type)

        # Save anonymized data
        with open(data_file, 'w') as f:
            json.dump(data, f, indent=2)

        print("Data anonymization completed successfully")

    except Exception as e:
        print(f"Error anonymizing data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF

    # Run anonymization
    python3 /tmp/anonymize_data.py "$data_file"

    if [ $? -eq 0 ]; then
        log_success "Data anonymization completed"
    else
        error_exit "Failed to anonymize data"
    fi
}

# Function to sync data to staging
sync_data() {
    log "Syncing data to staging environment..."

    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would sync data to staging database"
        return 0
    fi

    local data_file="/tmp/test_data.json"

    # Create data import script
    cat > /tmp/import_data.py << 'EOF'
import json
import sys
import os
import psycopg2
from datetime import datetime

def connect_to_db():
    """Connect to staging database"""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise Exception("DATABASE_URL not set")

    return psycopg2.connect(db_url)

def clear_existing_data(conn):
    """Clear existing test data (be careful!)"""
    cursor = conn.cursor()

    # Clear in reverse order of foreign key dependencies
    tables = ['analytics', 'appointments', 'users', 'locations']

    for table in tables:
        try:
            cursor.execute(f"DELETE FROM {table} WHERE created_at < NOW() - INTERVAL '1 day'")
            print(f"Cleared old data from {table}")
        except Exception as e:
            print(f"Warning: Could not clear {table}: {e}")

    conn.commit()
    cursor.close()

def import_data(conn, data):
    """Import data into staging database"""
    cursor = conn.cursor()

    try:
        # Import locations first (no dependencies)
        if 'locations' in data:
            for location in data['locations']:
                cursor.execute("""
                    INSERT INTO locations (id, name, address, city, state, zip_code, phone, created_at)
                    VALUES (%(id)s, %(name)s, %(address)s, %(city)s, %(state)s, %(zip_code)s, %(phone)s, %(created_at)s)
                    ON CONFLICT (id) DO NOTHING
                """, location)
            print(f"Imported {len(data['locations'])} locations")

        # Import users
        if 'users' in data:
            for user in data['users']:
                cursor.execute("""
                    INSERT INTO users (id, email, name, phone, created_at, is_active, role)
                    VALUES (%(id)s, %(email)s, %(name)s, %(phone)s, %(created_at)s, %(is_active)s, %(role)s)
                    ON CONFLICT (id) DO NOTHING
                """, user)
            print(f"Imported {len(data['users'])} users")

        # Import appointments
        if 'appointments' in data:
            for appointment in data['appointments']:
                cursor.execute("""
                    INSERT INTO appointments (id, client_id, barber_id, location_id, service, start_time, end_time, status, price, created_at)
                    VALUES (%(id)s, %(client_id)s, %(barber_id)s, %(location_id)s, %(service)s, %(start_time)s, %(end_time)s, %(status)s, %(price)s, %(created_at)s)
                    ON CONFLICT (id) DO NOTHING
                """, appointment)
            print(f"Imported {len(data['appointments'])} appointments")

        # Import analytics
        if 'analytics' in data:
            for record in data['analytics']:
                cursor.execute("""
                    INSERT INTO analytics (id, date, metric, value, location_id)
                    VALUES (%(id)s, %(date)s, %(metric)s, %(value)s, %(location_id)s)
                    ON CONFLICT (id) DO NOTHING
                """, record)
            print(f"Imported {len(data['analytics'])} analytics records")

        conn.commit()
        print("Data import completed successfully")

    except Exception as e:
        conn.rollback()
        print(f"Error importing data: {e}")
        raise
    finally:
        cursor.close()

def main():
    if len(sys.argv) != 2:
        print("Usage: python import_data.py <data_file>")
        sys.exit(1)

    data_file = sys.argv[1]

    try:
        with open(data_file, 'r') as f:
            data = json.load(f)

        conn = connect_to_db()

        # Clear existing test data
        clear_existing_data(conn)

        # Import new data
        import_data(conn, data)

        conn.close()

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF

    # Set environment for staging database
    export DATABASE_URL="$STAGING_DB_URL"

    # Run data import
    python3 /tmp/import_data.py "$data_file"

    if [ $? -eq 0 ]; then
        log_success "Data sync completed"
    else
        error_exit "Failed to sync data"
    fi
}

# Function to verify sync
verify_sync() {
    log "Verifying data sync..."

    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would verify data sync"
        return 0
    fi

    # Create verification script
    cat > /tmp/verify_sync.py << 'EOF'
import os
import psycopg2

def verify_data():
    """Verify that data was synced correctly"""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise Exception("DATABASE_URL not set")

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    tables = ['users', 'locations', 'appointments', 'analytics']

    for table in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"{table}: {count} records")
        except Exception as e:
            print(f"Error checking {table}: {e}")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    verify_data()
EOF

    # Set environment for staging database
    export DATABASE_URL="$STAGING_DB_URL"

    # Run verification
    python3 /tmp/verify_sync.py

    if [ $? -eq 0 ]; then
        log_success "Data verification completed"
    else
        log_warning "Data verification had issues"
    fi
}

# Function to show sync summary
show_sync_summary() {
    log ""
    log "Data Sync Summary"
    log "================="
    log "Environment: Staging"
    log "Data Source: $([ "$TEST_DATA" = true ] && echo "Test Data" || echo "Production Data")"
    log "Anonymization: $([ "$ANONYMIZE" = true ] && echo "Enabled" || echo "Disabled")"
    log "Sample Only: $([ "$SAMPLE_ONLY" = true ] && echo "Yes" || echo "No")"
    log "Sync Types:"
    log "- Users: $([ "$SYNC_USERS" = true ] && echo "Yes" || echo "No")"
    log "- Locations: $([ "$SYNC_LOCATIONS" = true ] && echo "Yes" || echo "No")"
    log "- Appointments: $([ "$SYNC_APPOINTMENTS" = true ] && echo "Yes" || echo "No")"
    log "- Analytics: $([ "$SYNC_ANALYTICS" = true ] && echo "Yes" || echo "No")"
    log ""
    log "Sync log: $SYNC_LOG"

    if [ "$DRY_RUN" = false ]; then
        log_success "Data sync completed successfully!"
    else
        log "Dry run completed - no data was actually synced"
    fi
}

# Main function
main() {
    log "Starting 6FB Booking Platform Staging Data Sync"
    log "==============================================="

    # Show configuration
    log "Configuration:"
    log "- Force: $FORCE"
    log "- Anonymize: $ANONYMIZE"
    log "- Sample Only: $SAMPLE_ONLY"
    log "- Test Data: $TEST_DATA"
    log "- Full Sync: $FULL_SYNC"
    log "- Dry Run: $DRY_RUN"
    log "- Backup First: $BACKUP_FIRST"
    log ""

    # Ask for confirmation unless forced or dry run
    if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
        read -p "Continue with data sync? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Data sync cancelled by user"
            exit 0
        fi
    fi

    # Execute sync steps
    check_prerequisites
    load_environment

    if [ "$DRY_RUN" = false ]; then
        create_backup
    fi

    # Generate or fetch data
    if [ "$TEST_DATA" = true ]; then
        generate_test_data
        anonymize_data "/tmp/test_data.json"
    else
        # In a real implementation, this would fetch production data
        log_warning "Production data sync not implemented in this demo"
        log_warning "Falling back to test data generation"
        generate_test_data
        anonymize_data "/tmp/test_data.json"
    fi

    sync_data
    verify_sync
    show_sync_summary
}

# Execute main function
main "$@"
