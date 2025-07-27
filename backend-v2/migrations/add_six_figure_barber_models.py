"""
Database migration script for Six Figure Barber methodology models.

This script creates the database tables for the Six Figure Barber core business logic,
supporting the five core principles:
1. Revenue Optimization Tracking
2. Client Value Maximization
3. Service Delivery Excellence
4. Business Efficiency Metrics
5. Professional Growth Tracking

Run this script to add the new tables to your existing database.
"""

import sys
import os
from pathlib import Path

# Add the backend-v2 directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from db import Base, engine
import logging

# Import the Six Figure Barber models to register them with SQLAlchemy
from models.six_figure_barber_core import (
    SixFBRevenueMetrics, SixFBRevenueGoals, SixFBClientValueProfile,
    SixFBClientJourney, SixFBServiceExcellenceMetrics, SixFBServiceStandards,
    SixFBEfficiencyMetrics, SixFBOperationalExcellence, SixFBGrowthMetrics,
    SixFBProfessionalDevelopmentPlan, SixFBMethodologyDashboard
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def check_table_exists(engine, table_name):
    """Check if a table exists in the database"""
    with engine.connect() as conn:
        # Check for table existence (PostgreSQL and SQLite compatible)
        if 'postgresql' in str(engine.url):
            # PostgreSQL query
            result = conn.execute(text(
                "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename=:table_name"
            ), {"table_name": table_name})
        else:
            # SQLite query
            result = conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=:table_name"
            ), {"table_name": table_name})
        return result.fetchone() is not None


def create_six_figure_barber_tables():
    """Create Six Figure Barber methodology tables"""
    
    logger.info("Starting Six Figure Barber methodology tables migration...")
    
    # List of tables to create
    six_fb_tables = [
        'six_fb_revenue_metrics',
        'six_fb_revenue_goals', 
        'six_fb_client_value_profiles',
        'six_fb_client_journeys',
        'six_fb_service_excellence_metrics',
        'six_fb_service_standards',
        'six_fb_efficiency_metrics',
        'six_fb_operational_excellence',
        'six_fb_growth_metrics',
        'six_fb_professional_development_plans',
        'six_fb_methodology_dashboards'
    ]
    
    # Check which tables already exist
    existing_tables = []
    missing_tables = []
    
    for table_name in six_fb_tables:
        if check_table_exists(engine, table_name):
            existing_tables.append(table_name)
            logger.info(f"✅ Table {table_name} already exists")
        else:
            missing_tables.append(table_name)
            logger.info(f"⏳ Table {table_name} needs to be created")
    
    if not missing_tables:
        logger.info("🎉 All Six Figure Barber tables already exist! No migration needed.")
        return True
    
    try:
        # Create the missing tables
        logger.info(f"Creating {len(missing_tables)} missing Six Figure Barber tables...")
        
        # This will create only the missing tables
        Base.metadata.create_all(bind=engine, checkfirst=True)
        
        # Verify tables were created
        created_tables = []
        for table_name in missing_tables:
            if check_table_exists(engine, table_name):
                created_tables.append(table_name)
                logger.info(f"✅ Successfully created table: {table_name}")
            else:
                logger.error(f"❌ Failed to create table: {table_name}")
        
        if len(created_tables) == len(missing_tables):
            logger.info("🎉 Successfully created all Six Figure Barber methodology tables!")
            logger.info("The following tables are now available:")
            for table in six_fb_tables:
                logger.info(f"  - {table}")
            return True
        else:
            logger.error(f"❌ Migration incomplete. Created {len(created_tables)}/{len(missing_tables)} tables")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error creating Six Figure Barber tables: {str(e)}")
        return False


def verify_migration():
    """Verify that the migration was successful"""
    logger.info("Verifying Six Figure Barber methodology migration...")
    
    test_queries = [
        "SELECT COUNT(*) FROM six_fb_revenue_metrics",
        "SELECT COUNT(*) FROM six_fb_client_value_profiles", 
        "SELECT COUNT(*) FROM six_fb_methodology_dashboards"
    ]
    
    try:
        with engine.connect() as conn:
            for query in test_queries:
                result = conn.execute(text(query))
                count = result.scalar()
                table_name = query.split("FROM ")[1]
                logger.info(f"✅ Table {table_name} is accessible (current rows: {count})")
        
        logger.info("🎉 Migration verification successful!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration verification failed: {str(e)}")
        return False


def create_sample_data(user_id: int = 1):
    """Create sample Six Figure Barber data for testing (optional)"""
    from datetime import date, timedelta
    from decimal import Decimal
    from sqlalchemy.orm import sessionmaker
    from models.six_figure_barber_core import (
        SixFBRevenueGoals, SixFBPrinciple, SixFBMethodologyDashboard
    )
    
    logger.info("Creating sample Six Figure Barber data...")
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Create a sample revenue goal
        sample_goal = SixFBRevenueGoals(
            user_id=user_id,
            goal_name="Six Figure Income Goal",
            target_annual_revenue=Decimal('100000.00'),
            target_monthly_revenue=Decimal('8333.33'),
            target_weekly_revenue=Decimal('1923.08'),
            target_daily_revenue=Decimal('274.00'),
            start_date=date.today() - timedelta(days=30),
            target_date=date.today() + timedelta(days=335),
            sfb_principle_focus=SixFBPrinciple.REVENUE_OPTIMIZATION
        )
        session.add(sample_goal)
        
        # Create a sample dashboard record
        sample_dashboard = SixFBMethodologyDashboard(
            user_id=user_id,
            dashboard_date=date.today(),
            overall_methodology_score=75.0,
            revenue_optimization_score=80.0,
            client_value_score=70.0,
            service_excellence_score=85.0,
            business_efficiency_score=72.0,
            professional_growth_score=68.0
        )
        session.add(sample_dashboard)
        
        session.commit()
        logger.info("✅ Sample Six Figure Barber data created successfully!")
        return True
        
    except Exception as e:
        session.rollback()
        logger.error(f"❌ Error creating sample data: {str(e)}")
        return False
    finally:
        session.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Six Figure Barber Methodology Database Migration")
    print("=" * 60)
    
    # Run the migration
    success = create_six_figure_barber_tables()
    
    if success:
        # Verify the migration
        verify_migration()
        
        # Optionally create sample data
        response = input("\nWould you like to create sample Six Figure Barber data? (y/n): ")
        if response.lower() == 'y':
            create_sample_data()
        
        print("\n" + "=" * 60)
        print("✅ Six Figure Barber methodology migration completed successfully!")
        print("The system is now ready for premium barbershop management.")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ Migration failed. Please check the logs and try again.")
        print("=" * 60)
        sys.exit(1)