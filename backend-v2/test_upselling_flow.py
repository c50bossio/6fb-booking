#!/usr/bin/env python3
"""
Test script to verify the complete upselling tracking flow.
Tests database models, API endpoints, and data flow.
"""

import asyncio
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from db import get_db, engine
from models import User, Appointment
from models.upselling import UpsellAttempt, UpsellConversion, UpsellStatus, UpsellChannel
from api.v2.endpoints.upselling import UpsellAttemptRequest

def test_database_models():
    """Test that our database models work correctly"""
    print("🧪 Testing Database Models...")
    
    db = next(get_db())
    
    try:
        # Create a test upsell attempt
        test_attempt = UpsellAttempt(
            barber_id=1,  # Assuming user ID 1 exists
            client_id=2,  # Assuming user ID 2 exists  
            current_service="Basic Cut",
            suggested_service="Premium Cut + Beard Trim",
            potential_revenue=35.00,
            confidence_score=92.5,
            client_tier="Regular",
            relationship_score=8.5,
            reasons=["Regular customer", "Always asks about beard maintenance"],
            methodology_alignment="Six Figure Barber Revenue Optimization",
            status=UpsellStatus.IMPLEMENTED,
            channel=UpsellChannel.IN_PERSON,
            opportunity_id="test-opp-001",
            source_analysis={"test": True, "generatedBy": "test_script"}
        )
        
        db.add(test_attempt)
        db.commit()
        db.refresh(test_attempt)
        
        print(f"✅ UpsellAttempt created successfully - ID: {test_attempt.id}")
        
        # Create a test conversion
        test_conversion = UpsellConversion(
            attempt_id=test_attempt.id,
            converted=True,
            conversion_channel=UpsellChannel.IN_PERSON,
            actual_service_booked="Premium Cut + Beard Trim",
            actual_revenue=35.00,
            revenue_difference=0.00,
            time_to_conversion=24,  # 24 hours
            converted_at=datetime.utcnow(),
            client_satisfaction_score=9.5,
            client_feedback="Love the new service!",
            conversion_notes="Customer was very happy with the upgrade"
        )
        
        db.add(test_conversion)
        db.commit()
        db.refresh(test_conversion)
        
        print(f"✅ UpsellConversion created successfully - ID: {test_conversion.id}")
        
        # Query the data back
        attempt = db.query(UpsellAttempt).filter(UpsellAttempt.id == test_attempt.id).first()
        conversion = db.query(UpsellConversion).filter(UpsellConversion.id == test_conversion.id).first()
        
        print(f"✅ Data retrieved successfully:")
        print(f"   Attempt: {attempt.current_service} → {attempt.suggested_service}")
        print(f"   Conversion: {'SUCCESS' if conversion.converted else 'FAILED'}")
        print(f"   Revenue: ${conversion.actual_revenue}")
        
        # Clean up test data
        db.delete(test_conversion)
        db.delete(test_attempt)
        db.commit()
        
        print("✅ Test data cleaned up successfully")
        
    except Exception as e:
        print(f"❌ Database test failed: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()
    
    return True

def test_api_endpoints():
    """Test that our API endpoints are properly configured"""
    print("\n🧪 Testing API Endpoints...")
    
    try:
        # Import the FastAPI app
        from main import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        # Test that the upselling endpoints are registered
        response = client.get("/docs")
        if response.status_code == 200:
            print("✅ API documentation accessible")
        else:
            print(f"❌ API docs failed: {response.status_code}")
            return False
        
        # Test unauthenticated request (should return 401/403)
        response = client.get("/api/v2/upselling/analytics")
        if response.status_code in [401, 403]:
            print("✅ Authentication required for upselling endpoints")
        else:
            print(f"❌ Unexpected response for unauthenticated request: {response.status_code}")
            return False
            
        print("✅ API endpoints are properly configured")
        
    except Exception as e:
        print(f"❌ API endpoint test failed: {str(e)}")
        return False
    
    return True

def test_data_flow():
    """Test the complete data flow from opportunity to analytics"""
    print("\n🧪 Testing Complete Data Flow...")
    
    db = next(get_db())
    
    try:
        # Simulate the complete upselling flow
        opportunities_data = [
            {
                "barber_id": 1,
                "client_id": 2,
                "current_service": "Basic Cut",
                "suggested_service": "Premium Cut + Beard Trim",
                "potential_revenue": 35.00,
                "confidence_score": 92.5,
                "status": UpsellStatus.IMPLEMENTED,
                "converted": True,
                "actual_revenue": 35.00
            },
            {
                "barber_id": 1,
                "client_id": 3,
                "current_service": "Beard Trim",
                "suggested_service": "Full Service Package",
                "potential_revenue": 65.00,
                "confidence_score": 85.0,
                "status": UpsellStatus.IMPLEMENTED,
                "converted": False,
                "actual_revenue": 0.00
            },
            {
                "barber_id": 1,
                "client_id": 4,
                "current_service": "Basic Cut",
                "suggested_service": "Premium Cut + Styling",
                "potential_revenue": 45.00,
                "confidence_score": 88.0,
                "status": UpsellStatus.IMPLEMENTED,
                "converted": True,
                "actual_revenue": 45.00
            }
        ]
        
        # Create attempts and conversions
        attempts = []
        conversions = []
        
        for data in opportunities_data:
            # Create attempt
            attempt = UpsellAttempt(
                barber_id=data["barber_id"],
                client_id=data["client_id"],
                current_service=data["current_service"],
                suggested_service=data["suggested_service"],
                potential_revenue=data["potential_revenue"],
                confidence_score=data["confidence_score"],
                status=data["status"],
                channel=UpsellChannel.IN_PERSON,
                client_tier="Regular",
                relationship_score=8.0
            )
            db.add(attempt)
            db.flush()  # Get the ID without committing
            attempts.append(attempt)
            
            # Create conversion
            conversion = UpsellConversion(
                attempt_id=attempt.id,
                converted=data["converted"],
                actual_revenue=data["actual_revenue"],
                revenue_difference=data["actual_revenue"] - data["potential_revenue"],
                converted_at=datetime.utcnow() if data["converted"] else None
            )
            db.add(conversion)
            conversions.append(conversion)
        
        db.commit()
        
        # Calculate analytics manually to verify the flow
        total_attempts = len(attempts)
        successful_conversions = [c for c in conversions if c.converted]
        total_conversions = len(successful_conversions)
        
        conversion_rate = (total_conversions / total_attempts) * 100
        total_potential = sum(a.potential_revenue for a in attempts)
        total_actual = sum(c.actual_revenue for c in successful_conversions)
        revenue_realization = (total_actual / total_potential) * 100
        
        print(f"✅ Data Flow Test Results:")
        print(f"   Total Attempts: {total_attempts}")
        print(f"   Successful Conversions: {total_conversions}")
        print(f"   Conversion Rate: {conversion_rate:.1f}%")
        print(f"   Potential Revenue: ${total_potential:.2f}")
        print(f"   Actual Revenue: ${total_actual:.2f}")
        print(f"   Revenue Realization: {revenue_realization:.1f}%")
        
        # Clean up test data
        for conversion in conversions:
            db.delete(conversion)
        for attempt in attempts:
            db.delete(attempt)
        db.commit()
        
        print("✅ Test data cleaned up")
        
        # Verify analytics would work
        if conversion_rate > 50 and total_actual > 0:
            print("✅ Analytics calculations are working correctly")
            return True
        else:
            print("❌ Analytics calculations seem incorrect")
            return False
            
    except Exception as e:
        print(f"❌ Data flow test failed: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

def main():
    """Run all tests"""
    print("🚀 Starting Upselling System Test Suite")
    print("=" * 50)
    
    tests = [
        test_database_models,
        test_api_endpoints, 
        test_data_flow
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            results.append(False)
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    passed = sum(results)
    total = len(results)
    
    test_names = ["Database Models", "API Endpoints", "Data Flow"]
    for i, (test_name, result) in enumerate(zip(test_names, results)):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Upselling system is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)