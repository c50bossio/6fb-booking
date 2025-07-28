#!/usr/bin/env python3
"""
Test the critical database performance indexes migration
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from alembic import op
from alembic.migration import MigrationContext
from alembic.operations import Operations

# Read and execute the migration file to get the functions
migration_file = '/Users/bossio/6fb-booking/backend-v2/alembic/versions/7f6a84ba137c_add_critical_database_performance_.py'
migration_globals = {}
with open(migration_file, 'r') as f:
    exec(f.read(), migration_globals)

def test_migration():
    """Test the migration by running upgrade and then checking if indexes exist."""
    print("🧪 Testing Critical Database Performance Indexes Migration")
    print("-" * 60)
    
    # Create test database connection
    engine = create_engine('sqlite:///./test_migration.db')
    
    # Create basic tables for testing (simplified versions)
    with engine.connect() as conn:
        # Create basic tables
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                email VARCHAR(255),
                is_active BOOLEAN,
                unified_role VARCHAR(50),
                created_at DATETIME
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                barber_id INTEGER,
                client_id INTEGER,
                service_id INTEGER,
                organization_id INTEGER,
                start_time DATETIME,
                status VARCHAR(50),
                created_at DATETIME
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                appointment_id INTEGER,
                barber_id INTEGER,
                organization_id INTEGER,
                status VARCHAR(50),
                stripe_payment_intent_id VARCHAR(255),
                created_at DATETIME
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS barber_availability (
                id INTEGER PRIMARY KEY,
                barber_id INTEGER,
                day_of_week INTEGER,
                is_active BOOLEAN,
                start_time TIME,
                end_time TIME
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY,
                barber_id INTEGER,
                email VARCHAR(255),
                phone VARCHAR(20),
                created_at DATETIME
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY,
                barber_id INTEGER,
                is_active BOOLEAN,
                name VARCHAR(255)
            )
        """))
        
        conn.commit()
        print("✓ Created test tables")
    
    # Test the upgrade function
    print("\n📈 Testing migration upgrade...")
    try:
        with engine.connect() as conn:
            ctx = MigrationContext.configure(conn)
            op = Operations(ctx)
            
            # Run our upgrade function
            migration_globals['upgrade']()
            
        print("✓ Migration upgrade completed successfully")
        
        # Check if indexes were created
        with engine.connect() as conn:
            # Get list of indexes
            indexes = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index'")).fetchall()
            index_names = [idx[0] for idx in indexes]
            
            critical_indexes = [
                'idx_appointments_barber_start',
                'idx_users_email_active',
                'idx_payments_user_status',
                'idx_barber_availability_barber_day'
            ]
            
            created_count = 0
            for idx_name in critical_indexes:
                if idx_name in index_names:
                    print(f"  ✓ {idx_name}")
                    created_count += 1
                else:
                    print(f"  ✗ {idx_name} - NOT FOUND")
            
            print(f"\n📊 Created {created_count}/{len(critical_indexes)} critical indexes")
        
        # Test the downgrade function
        print("\n📉 Testing migration downgrade...")
        with engine.connect() as conn:
            ctx = MigrationContext.configure(conn)
            op = Operations(ctx)
            
            # Run our downgrade function
            migration_globals['downgrade']()
            
        print("✓ Migration downgrade completed successfully")
        
    except Exception as e:
        print(f"✗ Migration test failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Cleanup
    if os.path.exists('./test_migration.db'):
        os.remove('./test_migration.db')
        print("🧹 Cleaned up test database")

if __name__ == '__main__':
    test_migration()