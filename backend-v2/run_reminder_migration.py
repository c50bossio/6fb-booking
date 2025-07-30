#!/usr/bin/env python3
"""
Database Migration Script for Appointment Reminder System
Safely applies the reminder system database schema changes
"""

import sys
import os
from pathlib import Path

# Add the backend-v2 directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

import asyncio
from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, text
from core.config import settings
from core.database import engine, SessionLocal
from core.logging import get_logger

logger = get_logger(__name__)

def check_database_connection():
    """Verify database connection before running migration"""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1")).scalar()
            assert result == 1
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def check_existing_tables():
    """Check if reminder system tables already exist"""
    try:
        with engine.connect() as connection:
            # Check if reminder_preferences table exists
            result = connection.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'reminder_preferences'
                );
            """)).scalar()
            
            if result:
                print("⚠️  Reminder system tables already exist")
                return True
            else:
                print("✅ Ready to create reminder system tables")
                return False
                
    except Exception as e:
        # Might be SQLite, try a different approach
        try:
            with engine.connect() as connection:
                result = connection.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='reminder_preferences';
                """)).fetchone()
                
                if result:
                    print("⚠️  Reminder system tables already exist (SQLite)")
                    return True
                else:
                    print("✅ Ready to create reminder system tables (SQLite)")
                    return False
        except Exception as e2:
            print(f"❌ Could not check existing tables: {e2}")
            return False

def run_migration():
    """Run the Alembic migration for reminder system"""
    try:
        # Get the directory containing this script
        script_dir = Path(__file__).parent
        alembic_dir = script_dir / "alembic"
        
        # Configure Alembic
        alembic_cfg = Config(str(alembic_dir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(alembic_dir))
        
        print("🔄 Running database migration for reminder system...")
        
        # Run the migration
        command.upgrade(alembic_cfg, "head")
        
        print("✅ Database migration completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

def verify_tables_created():
    """Verify that all reminder system tables were created"""
    expected_tables = [
        'reminder_preferences',
        'reminder_schedules', 
        'reminder_templates',
        'reminder_deliveries',
        'reminder_analytics'
    ]
    
    try:
        with engine.connect() as connection:
            created_tables = []
            
            for table in expected_tables:
                try:
                    # Try PostgreSQL first
                    result = connection.execute(text(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = '{table}'
                        );
                    """)).scalar()
                    
                    if result:
                        created_tables.append(table)
                        
                except:
                    # Try SQLite
                    try:
                        result = connection.execute(text(f"""
                            SELECT name FROM sqlite_master 
                            WHERE type='table' AND name='{table}';
                        """)).fetchone()
                        
                        if result:
                            created_tables.append(table)
                    except:
                        pass
            
            print(f"\n📊 Migration Results:")
            for table in expected_tables:
                if table in created_tables:
                    print(f"   ✅ {table}")
                else:
                    print(f"   ❌ {table} - NOT CREATED")
            
            if len(created_tables) == len(expected_tables):
                print(f"\n🎉 All {len(expected_tables)} reminder system tables created successfully!")
                return True
            else:
                print(f"\n⚠️  Only {len(created_tables)}/{len(expected_tables)} tables created")
                return False
                
    except Exception as e:
        print(f"❌ Could not verify table creation: {e}")
        return False

def test_reminder_system():
    """Test basic reminder system functionality"""
    try:
        print("\n🧪 Testing reminder system functionality...")
        
        from models.reminder_models import ReminderPreference
        from sqlalchemy.orm import sessionmaker
        
        Session = sessionmaker(bind=engine)
        db = Session()
        
        # Try to create a test reminder preference
        test_preference = ReminderPreference(
            client_id=999999,  # Test client ID
            sms_enabled=True,
            email_enabled=True,
            advance_hours=24
        )
        
        db.add(test_preference)
        db.commit()
        
        # Try to query it back
        retrieved = db.query(ReminderPreference).filter(
            ReminderPreference.client_id == 999999
        ).first()
        
        if retrieved:
            print("   ✅ Database operations working")
            
            # Clean up test data
            db.delete(retrieved)
            db.commit()
            
            print("   ✅ Test data cleaned up")
        else:
            print("   ❌ Could not retrieve test data")
            return False
            
        db.close()
        print("✅ Reminder system functionality test passed")
        return True
        
    except Exception as e:
        print(f"❌ Functionality test failed: {e}")
        return False

def main():
    """Main migration execution function"""
    print("🚀 APPOINTMENT REMINDER SYSTEM - DATABASE MIGRATION")
    print("=" * 60)
    
    # Step 1: Check database connection
    if not check_database_connection():
        print("\n❌ MIGRATION ABORTED: Cannot connect to database")
        sys.exit(1)
    
    # Step 2: Check if tables already exist
    tables_exist = check_existing_tables()
    
    # Step 3: Run migration if needed
    if not tables_exist:
        if not run_migration():
            print("\n❌ MIGRATION FAILED")
            sys.exit(1)
    else:
        response = input("\nTables already exist. Force re-run migration? (y/N): ")
        if response.lower().startswith('y'):
            if not run_migration():
                print("\n❌ MIGRATION FAILED")
                sys.exit(1)
        else:
            print("✅ Skipping migration (tables already exist)")
    
    # Step 4: Verify tables were created
    if not verify_tables_created():
        print("\n❌ MIGRATION INCOMPLETE: Some tables missing")
        sys.exit(1)
    
    # Step 5: Test functionality
    if not test_reminder_system():
        print("\n⚠️  MIGRATION COMPLETED but functionality test failed")
        print("   Tables were created but there may be configuration issues")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("🎉 MIGRATION COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print("✅ All reminder system tables created")
    print("✅ Database operations tested and working")
    print("✅ System ready for appointment reminder functionality")
    print("\n🚀 Next steps:")
    print("   1. Configure Twilio, SendGrid, and Stripe API keys")
    print("   2. Test the admin interface at /admin/communication-plans")
    print("   3. Set up pilot program with first customers")
    print("   4. Monitor system performance and gather feedback")

if __name__ == "__main__":
    main()