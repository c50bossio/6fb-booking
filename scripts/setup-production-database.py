#!/usr/bin/env python3
"""
6FB Booking Platform - Production Database Setup Script
This script prepares the database for production deployment
"""

import os
import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

try:
    from alembic.config import Config
    from alembic import command
    from sqlalchemy import create_engine, text
    from config.settings import settings
    from config.database import Base, engine
    import models  # This imports all models
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running from the project root and dependencies are installed")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_database_connection():
    """Test database connection"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

def run_migrations():
    """Run Alembic migrations"""
    try:
        # Configure Alembic
        alembic_cfg = Config(str(backend_dir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
        
        # Run migrations
        logger.info("🔄 Running database migrations...")
        command.upgrade(alembic_cfg, "head")
        logger.info("✅ Database migrations completed successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False

def verify_tables():
    """Verify all required tables exist"""
    required_tables = [
        'users', 'locations', 'barbers', 'clients', 'appointments',
        'services', 'service_categories', 'barber_availability',
        'booking_rules', 'reviews', 'booking_slots', 'payments',
        'compensation_plans', 'barber_payments'
    ]
    
    try:
        with engine.connect() as conn:
            # Get list of existing tables
            if 'postgresql' in str(engine.url):
                result = conn.execute(text("""
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """))
            else:  # SQLite
                result = conn.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                """))
            
            existing_tables = {row[0] for row in result}
            
            missing_tables = set(required_tables) - existing_tables
            
            if missing_tables:
                logger.warning(f"⚠️ Missing tables: {missing_tables}")
                return False
            else:
                logger.info(f"✅ All {len(required_tables)} required tables present")
                return True
                
    except Exception as e:
        logger.error(f"❌ Table verification failed: {e}")
        return False

def create_indexes():
    """Create performance indexes"""
    performance_indexes = [
        # Appointments table indexes
        "CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments (barber_id, appointment_date)",
        "CREATE INDEX IF NOT EXISTS idx_appointments_client_date ON appointments (client_id, appointment_date)",
        "CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments (status, appointment_date)",
        
        # Clients table indexes  
        "CREATE INDEX IF NOT EXISTS idx_clients_barber_id ON clients (barber_id)",
        "CREATE INDEX IF NOT EXISTS idx_clients_customer_type ON clients (customer_type)",
        
        # Barbers table indexes
        "CREATE INDEX IF NOT EXISTS idx_barbers_location_id ON barbers (location_id)",
        "CREATE INDEX IF NOT EXISTS idx_barbers_is_active ON barbers (is_active)",
        
        # Users table indexes
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)",
        
        # Services table indexes
        "CREATE INDEX IF NOT EXISTS idx_services_category_id ON services (category_id)",
        "CREATE INDEX IF NOT EXISTS idx_services_is_active ON services (is_active)",
    ]
    
    try:
        with engine.connect() as conn:
            for index_sql in performance_indexes:
                try:
                    conn.execute(text(index_sql))
                    conn.commit()
                except Exception as e:
                    logger.warning(f"Index creation warning: {e}")
                    
        logger.info("✅ Performance indexes created/verified")
        return True
    except Exception as e:
        logger.error(f"❌ Index creation failed: {e}")
        return False

def seed_production_data():
    """Seed essential production data"""
    try:
        with engine.connect() as conn:
            # Check if data already exists
            result = conn.execute(text("SELECT COUNT(*) FROM service_categories"))
            if result.scalar() > 0:
                logger.info("✅ Production data already exists")
                return True
            
            # Seed service categories
            categories_sql = """
            INSERT INTO service_categories (name, description, display_order, is_active)
            VALUES 
                ('Haircut', 'Professional haircuts and styling', 1, true),
                ('Beard', 'Beard trimming and grooming', 2, true),
                ('Color', 'Hair coloring and highlights', 3, true),
                ('Special', 'Special occasion styling', 4, true)
            """
            conn.execute(text(categories_sql))
            
            # Seed basic services
            services_sql = """
            INSERT INTO services (category_id, name, description, duration_minutes, price, is_active)
            SELECT 
                sc.id,
                CASE sc.name
                    WHEN 'Haircut' THEN 'Classic Cut'
                    WHEN 'Beard' THEN 'Beard Trim'
                    WHEN 'Color' THEN 'Hair Color'
                    WHEN 'Special' THEN 'Event Styling'
                END,
                'Professional service',
                CASE sc.name
                    WHEN 'Haircut' THEN 45
                    WHEN 'Beard' THEN 30
                    WHEN 'Color' THEN 90
                    WHEN 'Special' THEN 60
                END,
                CASE sc.name
                    WHEN 'Haircut' THEN 50.00
                    WHEN 'Beard' THEN 25.00
                    WHEN 'Color' THEN 75.00
                    WHEN 'Special' THEN 100.00
                END,
                true
            FROM service_categories sc
            """
            conn.execute(text(services_sql))
            
            conn.commit()
            logger.info("✅ Production data seeded successfully")
            
    except Exception as e:
        logger.error(f"❌ Data seeding failed: {e}")
        return False
    
    return True

def main():
    """Main setup function"""
    logger.info("🚀 Starting production database setup...")
    
    # Check environment
    if settings.ENVIRONMENT != "production":
        logger.warning(f"⚠️ Current environment: {settings.ENVIRONMENT}")
        logger.warning("For production deployment, set ENVIRONMENT=production")
    
    # Step 1: Check database connection
    if not check_database_connection():
        logger.error("❌ Cannot proceed without database connection")
        return False
    
    # Step 2: Run migrations
    if not run_migrations():
        logger.error("❌ Migration failure blocks setup")
        return False
    
    # Step 3: Verify tables
    if not verify_tables():
        logger.error("❌ Missing required tables")
        return False
    
    # Step 4: Create performance indexes
    if not create_indexes():
        logger.warning("⚠️ Index creation had issues but continuing...")
    
    # Step 5: Seed production data
    if not seed_production_data():
        logger.warning("⚠️ Data seeding had issues but continuing...")
    
    logger.info("🎉 Production database setup completed successfully!")
    logger.info(f"Database URL: {str(engine.url)[:50]}...")
    logger.info("The database is ready for production deployment.")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)