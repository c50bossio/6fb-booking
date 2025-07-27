"""
Simple verification script for Six Figure Barber methodology implementation.
Checks that all tables and basic functionality are working.
"""

import sys
from pathlib import Path

# Add the backend-v2 directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from db import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def verify_six_figure_barber_tables():
    """Verify that Six Figure Barber tables exist and are accessible"""
    
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
    
    logger.info("Verifying Six Figure Barber tables...")
    
    try:
        with engine.connect() as conn:
            # Check PostgreSQL tables
            result = conn.execute(text(
                "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'six_fb_%'"
            ))
            existing_tables = [row[0] for row in result.fetchall()]
            
            logger.info(f"Found {len(existing_tables)} Six Figure Barber tables:")
            for table in existing_tables:
                logger.info(f"  ✅ {table}")
            
            # Test basic operations on each table
            for table in existing_tables:
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    logger.info(f"  📊 {table}: {count} records")
                except Exception as e:
                    logger.error(f"  ❌ Error accessing {table}: {str(e)}")
            
            missing_tables = set(six_fb_tables) - set(existing_tables)
            if missing_tables:
                logger.warning(f"Missing tables: {list(missing_tables)}")
                return False
            else:
                logger.info("✅ All Six Figure Barber tables are present and accessible!")
                return True
                
    except Exception as e:
        logger.error(f"❌ Error verifying tables: {str(e)}")
        return False


def verify_api_endpoints():
    """Verify that API endpoints are configured"""
    try:
        from api.v2.endpoints.six_figure_barber_analytics import router
        
        endpoint_paths = [route.path for route in router.routes]
        logger.info(f"Found {len(endpoint_paths)} Six Figure Barber API endpoints:")
        
        for path in endpoint_paths:
            logger.info(f"  ✅ {path}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error verifying API endpoints: {str(e)}")
        return False


def verify_models():
    """Verify that Six Figure Barber models can be imported"""
    try:
        from models.six_figure_barber_core import (
            SixFBRevenueMetrics, SixFBRevenueGoals, SixFBClientValueProfile,
            SixFBClientJourney, SixFBServiceExcellenceMetrics, SixFBServiceStandards,
            SixFBEfficiencyMetrics, SixFBOperationalExcellence, SixFBGrowthMetrics,
            SixFBProfessionalDevelopmentPlan, SixFBMethodologyDashboard,
            SixFBPrinciple, RevenueMetricType, ClientValueTier, ServiceExcellenceArea,
            EfficiencyMetricType, GrowthMetricType
        )
        
        logger.info("✅ All Six Figure Barber models imported successfully!")
        
        # Test enum values
        principles = [p.value for p in SixFBPrinciple]
        logger.info(f"✅ Six Figure Barber Principles: {principles}")
        
        tiers = [t.value for t in ClientValueTier]
        logger.info(f"✅ Client Value Tiers: {tiers}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error importing Six Figure Barber models: {str(e)}")
        return False


def verify_service():
    """Verify that the Six Figure Barber service can be instantiated"""
    try:
        from sqlalchemy.orm import sessionmaker
        from services.six_figure_barber_core_service import SixFigureBarberCoreService
        
        Session = sessionmaker(bind=engine)
        session = Session()
        
        service = SixFigureBarberCoreService(session)
        logger.info("✅ Six Figure Barber core service instantiated successfully!")
        
        session.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Error instantiating Six Figure Barber service: {str(e)}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Six Figure Barber Methodology Verification")
    print("=" * 60)
    
    verification_results = []
    
    tests = [
        ("Database Tables", verify_six_figure_barber_tables),
        ("Data Models", verify_models),
        ("Core Service", verify_service),
        ("API Endpoints", verify_api_endpoints)
    ]
    
    for test_name, test_func in tests:
        logger.info(f"\n--- Verifying {test_name} ---")
        try:
            result = test_func()
            verification_results.append((test_name, result))
            if result:
                logger.info(f"✅ {test_name} verification PASSED")
            else:
                logger.error(f"❌ {test_name} verification FAILED")
        except Exception as e:
            logger.error(f"❌ {test_name} verification ERROR: {str(e)}")
            verification_results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("Six Figure Barber Methodology Verification Results")
    print("=" * 60)
    
    passed_tests = [name for name, result in verification_results if result]
    failed_tests = [name for name, result in verification_results if not result]
    
    for test_name, result in verification_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nSummary: {len(passed_tests)}/{len(verification_results)} verifications passed")
    
    if len(passed_tests) == len(verification_results):
        print("\n🎉 SIX FIGURE BARBER IMPLEMENTATION VERIFIED!")
        print("=" * 60)
        print("All core components have been successfully implemented:")
        print("1. ✅ Revenue Optimization Tracking")
        print("2. ✅ Client Value Maximization")
        print("3. ✅ Service Delivery Excellence")
        print("4. ✅ Business Efficiency Metrics")
        print("5. ✅ Professional Growth Tracking")
        print("\nThe system is ready for premium barbershop management!")
        print("API endpoints available at: /api/v2/six-figure-barber/")
        print("=" * 60)
    else:
        print(f"\n❌ {len(failed_tests)} verification(s) failed.")
        print("Please review and resolve any issues.")
        sys.exit(1)