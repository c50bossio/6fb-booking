#!/usr/bin/env python3
"""
Direct test of analytics service to identify 500 errors
"""
import sys
import traceback
from database import get_db
from services.analytics_service import AnalyticsService
from models import User

def test_analytics_service():
    """Test analytics service methods directly"""
    try:
        print("1. Getting database session...")
        db = next(get_db())
        
        print("2. Getting test user...")
        user = db.query(User).filter(User.role == "admin").first()
        if not user:
            print("No admin user found")
            return
        print(f"Using user: {user.email} (ID: {user.id})")
        
        print("3. Creating analytics service...")
        analytics_service = AnalyticsService(db)
        
        # Test each analytics method that might cause 500 errors
        test_methods = [
            ("dashboard_summary", lambda: analytics_service.get_advanced_dashboard_summary(user_id=user.id)),
            ("revenue_analytics", lambda: analytics_service.get_revenue_analytics(user_id=user.id)),
            ("appointment_analytics", lambda: analytics_service.get_appointment_analytics(user_id=user.id)),
            ("client_retention", lambda: analytics_service.get_client_retention_metrics(user.id)),
            ("barber_performance", lambda: analytics_service.get_barber_performance_metrics(user.id)),
        ]
        
        for method_name, method_call in test_methods:
            try:
                print(f"\n4. Testing {method_name}...")
                result = method_call()
                if result:
                    print(f"   SUCCESS: {method_name} returned data")
                    # Check for any float conversion issues
                    result_str = str(result)
                    if 'toFixed' in result_str:
                        print(f"   WARNING: Found 'toFixed' in result - this could cause frontend JS errors")
                else:
                    print(f"   WARNING: {method_name} returned empty/None")
                    
            except Exception as e:
                print(f"   ERROR in {method_name}: {e}")
                print(f"   Traceback: {traceback.format_exc()}")
        
        print("\n5. Testing Six Figure Barber metrics (known problematic)...")
        try:
            # This is the one we know has issues
            sfb_result = analytics_service.calculate_six_figure_barber_metrics(user.id, 100000.0)
            print("   Six Figure Barber metrics: SUCCESS")
        except Exception as e:
            print(f"   Six Figure Barber metrics ERROR: {e}")
            print(f"   Traceback: {traceback.format_exc()}")
        
        db.close()
        
    except Exception as e:
        print(f"Script error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_analytics_service()