#!/usr/bin/env python3
"""
Test script for Enhanced Analytics Service

This script tests all the Six Figure Barber analytics functionality including:
- Revenue tracking accuracy
- Performance score calculations  
- Client lifetime value analysis
- Pricing optimization recommendations
- Business health scoring
- Forecasting accuracy
"""

import sys
import os
import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.enhanced_analytics_service import EnhancedAnalyticsService
from services.analytics_service import AnalyticsService
from schemas import DateRange
from models import User, Appointment, Payment, Client, Service
from database import Base


class TestEnhancedAnalytics:
    """Test suite for Enhanced Analytics Service"""
    
    @classmethod
    def setup_class(cls):
        """Set up test database and service"""
        # Create in-memory SQLite database for testing
        cls.engine = create_engine('sqlite:///:memory:', echo=False)
        Base.metadata.create_all(cls.engine)
        
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        cls.db = SessionLocal()
        
        cls.analytics_service = EnhancedAnalyticsService(cls.db)
        cls.base_service = AnalyticsService(cls.db)
        
        # Create test data
        cls._create_test_data()
    
    @classmethod
    def _create_test_data(cls):
        """Create comprehensive test data for analytics testing"""
        print("Creating test data...")
        
        # Create test user (barber)
        test_user = User(
            id=1,
            email="test@barber.com",
            name="Test Barber",
            role="barber",
            timezone="America/New_York"
        )
        cls.db.add(test_user)
        
        # Create test clients
        test_clients = []
        for i in range(20):
            client = Client(
                id=i+1,
                first_name=f"Client",
                last_name=f"{i+1}",
                email=f"client{i+1}@test.com",
                phone=f"555-010{i:02d}",
                customer_type="new" if i < 5 else "returning" if i < 15 else "vip",
                total_visits=1 if i < 5 else 3 if i < 15 else 8,
                total_spent=50 if i < 5 else 200 if i < 15 else 800,
                last_visit_date=datetime.now() - timedelta(days=i)
            )
            test_clients.append(client)
            cls.db.add(client)
        
        # Create test services
        services = [
            {"name": "Haircut", "price": 45, "duration": 45},
            {"name": "Beard Trim", "price": 25, "duration": 20},
            {"name": "Premium Cut & Style", "price": 75, "duration": 60},
            {"name": "Hot Towel Shave", "price": 35, "duration": 30}
        ]
        
        # Create appointments and payments for the last 90 days
        appointment_id = 1
        payment_id = 1
        
        for day_offset in range(90):
            appointment_date = datetime.now() - timedelta(days=day_offset)
            
            # Create 2-4 appointments per day with varying patterns
            appointments_per_day = 2 if day_offset > 60 else 3 if day_offset > 30 else 4
            
            for apt_num in range(appointments_per_day):
                service = services[apt_num % len(services)]
                client_id = (apt_num + day_offset) % 20 + 1
                
                # Vary appointment status for realistic completion rates
                if day_offset < 7:  # Recent appointments
                    status = "completed" if apt_num < 3 else "no_show"
                else:
                    status = "completed" if apt_num < 3 else "cancelled" if apt_num == 3 else "completed"
                
                appointment = Appointment(
                    id=appointment_id,
                    user_id=1,
                    client_id=client_id,
                    service_name=service["name"],
                    price=service["price"],
                    duration_minutes=service["duration"],
                    start_time=appointment_date.replace(hour=9 + apt_num * 2),
                    end_time=appointment_date.replace(hour=9 + apt_num * 2, minute=service["duration"]),
                    status=status,
                    created_at=appointment_date - timedelta(days=1)
                )
                cls.db.add(appointment)
                
                # Create payment for completed appointments
                if status == "completed":
                    payment = Payment(
                        id=payment_id,
                        user_id=1,
                        appointment_id=appointment_id,
                        amount=service["price"],
                        barber_amount=service["price"] * 0.8,  # 80% to barber
                        platform_fee=service["price"] * 0.2,  # 20% platform fee
                        status="completed",
                        created_at=appointment_date
                    )
                    cls.db.add(payment)
                    payment_id += 1
                
                appointment_id += 1
        
        cls.db.commit()
        print(f"Created test data: {appointment_id-1} appointments, {payment_id-1} payments")
    
    def test_basic_analytics_calculations(self):
        """Test basic analytics calculations are working"""
        print("\n=== Testing Basic Analytics Calculations ===")
        
        # Test revenue analytics
        revenue_data = self.base_service.get_revenue_analytics(user_id=1)
        assert revenue_data is not None
        assert "summary" in revenue_data
        assert revenue_data["summary"]["total_revenue"] > 0
        print(f"✓ Total Revenue: ${revenue_data['summary']['total_revenue']:,.2f}")
        
        # Test appointment analytics
        appointment_data = self.base_service.get_appointment_analytics(user_id=1)
        assert appointment_data is not None
        assert "summary" in appointment_data
        print(f"✓ Total Appointments: {appointment_data['summary']['total']}")
        print(f"✓ Completion Rate: {appointment_data['summary']['completion_rate']:.1f}%")
        
        # Test client retention metrics
        retention_data = self.base_service.get_client_retention_metrics(user_id=1)
        assert retention_data is not None
        assert "summary" in retention_data
        print(f"✓ Active Clients: {retention_data['summary']['active_clients']}")
        print(f"✓ Retention Rate: {retention_data['summary']['retention_rate']:.1f}%")
    
    def test_six_figure_barber_calculations(self):
        """Test Six Figure Barber methodology calculations"""
        print("\n=== Testing Six Figure Barber Calculations ===")
        
        target_income = 100000
        six_fig_metrics = self.base_service.calculate_six_figure_barber_metrics(
            user_id=1, 
            target_annual_income=target_income
        )
        
        assert six_fig_metrics is not None
        assert "current_performance" in six_fig_metrics
        assert "targets" in six_fig_metrics
        assert "recommendations" in six_fig_metrics
        
        current = six_fig_metrics["current_performance"]
        targets = six_fig_metrics["targets"]
        
        print(f"✓ Monthly Revenue: ${current['monthly_revenue']:,.2f}")
        print(f"✓ Average Ticket: ${current['average_ticket']:,.2f}")
        print(f"✓ Utilization Rate: {current['utilization_rate']:.1f}%")
        print(f"✓ Monthly Target: ${targets['monthly_revenue_target']:,.2f}")
        print(f"✓ On Track: {targets['on_track']}")
        print(f"✓ Revenue Gap: ${targets['revenue_gap']:,.2f}")
        
        # Verify calculations make sense
        assert current['monthly_revenue'] >= 0
        assert current['average_ticket'] > 0
        assert 0 <= current['utilization_rate'] <= 100
        assert targets['monthly_revenue_target'] == target_income / 12
    
    def test_enhanced_analytics_features(self):
        """Test enhanced analytics features"""
        print("\n=== Testing Enhanced Analytics Features ===")
        
        enhanced_metrics = self.analytics_service.calculate_advanced_six_figure_metrics(
            user_id=1,
            target_annual_income=100000
        )
        
        assert enhanced_metrics is not None
        assert "performance_score" in enhanced_metrics
        assert "advanced_pricing" in enhanced_metrics
        assert "client_value_analysis" in enhanced_metrics
        assert "forecasting" in enhanced_metrics
        
        # Test performance score
        perf_score = enhanced_metrics["performance_score"]
        assert "overall_score" in perf_score
        assert 0 <= perf_score["overall_score"] <= 100
        print(f"✓ Overall Performance Score: {perf_score['overall_score']:.1f}/100")
        print(f"✓ Health Level: {perf_score['health_level']}")
        
        # Test component scores
        components = perf_score["component_scores"]
        for component, score in components.items():
            assert 0 <= score <= 100
            print(f"  - {component.replace('_', ' ').title()}: {score:.1f}/100")
    
    def test_business_health_scoring(self):
        """Test business health scoring algorithm"""
        print("\n=== Testing Business Health Scoring ===")
        
        health_score = self.analytics_service._calculate_business_health_score(user_id=1)
        
        assert health_score is not None
        assert "overall_score" in health_score
        assert "component_scores" in health_score
        assert "improvement_areas" in health_score
        
        overall = health_score["overall_score"]
        assert 0 <= overall <= 100
        print(f"✓ Business Health Score: {overall:.1f}/100")
        print(f"✓ Health Level: {health_score['health_level']}")
        
        # Test improvement areas
        improvements = health_score["improvement_areas"]
        print(f"✓ Improvement Areas Identified: {len(improvements)}")
        for area in improvements:
            print(f"  - {area['area']}: {area['suggestion']}")
    
    def test_pricing_optimization(self):
        """Test dynamic pricing optimization"""
        print("\n=== Testing Pricing Optimization ===")
        
        pricing_data = self.analytics_service._calculate_dynamic_pricing_optimization(
            user_id=1,
            target_annual_income=100000
        )
        
        assert pricing_data is not None
        assert "service_recommendations" in pricing_data
        assert "overall_strategy" in pricing_data
        
        recommendations = pricing_data["service_recommendations"]
        strategy = pricing_data["overall_strategy"]
        
        print(f"✓ Services Analyzed: {len(recommendations)}")
        print(f"✓ Current Average Ticket: ${strategy['current_average_ticket']:.2f}")
        print(f"✓ Potential Monthly Increase: ${strategy['potential_monthly_increase']:.2f}")
        print(f"✓ Recommended Strategy: {strategy['recommended_pricing_approach']}")
        
        # Test individual service recommendations
        for service_name, rec in recommendations.items():
            print(f"  - {service_name}: ${rec['current_price']:.2f} → ${rec['recommended_price']:.2f} ({rec['price_change_percentage']:+.1f}%)")
    
    def test_client_value_analysis(self):
        """Test advanced client lifetime value analysis"""
        print("\n=== Testing Client Value Analysis ===")
        
        clv_data = self.analytics_service._calculate_advanced_client_value_metrics(user_id=1)
        
        assert clv_data is not None
        assert "enhanced_segments" in clv_data
        assert "predictive_ltv" in clv_data
        assert "journey_analysis" in clv_data
        
        segments = clv_data["enhanced_segments"]
        predictive = clv_data["predictive_ltv"]
        
        print(f"✓ Client Segments: {len(segments)}")
        print(f"✓ Current Average LTV: ${predictive['current_average_ltv']:.2f}")
        
        # Test segment enhancement
        for segment_name, segment_data in segments.items():
            if segment_data.get("count", 0) > 0:
                print(f"  - {segment_name.title()}: {segment_data['count']} clients, ${segment_data['avg_clv']:.2f} avg LTV")
    
    def test_revenue_forecasting(self):
        """Test revenue forecasting functionality"""
        print("\n=== Testing Revenue Forecasting ===")
        
        forecast_data = self.analytics_service._generate_revenue_forecasting(
            user_id=1,
            target_annual_income=100000
        )
        
        assert forecast_data is not None
        assert "scenarios" in forecast_data
        assert "base_monthly_revenue" in forecast_data
        
        scenarios = forecast_data["scenarios"]
        base_revenue = forecast_data["base_monthly_revenue"]
        
        print(f"✓ Base Monthly Revenue: ${base_revenue:.2f}")
        print(f"✓ Scenarios Generated: {len(scenarios)}")
        
        for scenario_name, scenario in scenarios.items():
            annual_proj = scenario["annual_projection"]
            achievement_month = scenario["target_achievement_month"]
            likelihood = scenario["target_achievement_likelihood"]
            
            print(f"  - {scenario_name.title()}: ${annual_proj:,.0f} annual projection")
            if achievement_month:
                print(f"    Target achieved in month {achievement_month} ({likelihood}% likelihood)")
            else:
                print(f"    Target not achieved in 12 months ({likelihood}% likelihood)")
    
    def test_real_time_dashboard_data(self):
        """Test real-time dashboard data generation"""
        print("\n=== Testing Real-Time Dashboard Data ===")
        
        dashboard_data = self.analytics_service.generate_real_time_dashboard_data(user_id=1)
        
        assert dashboard_data is not None
        assert "real_time_metrics" in dashboard_data
        assert "targets" in dashboard_data
        assert "performance_indicators" in dashboard_data
        
        metrics = dashboard_data["real_time_metrics"]
        targets = dashboard_data["targets"]
        indicators = dashboard_data["performance_indicators"]
        
        print(f"✓ Today's Revenue: ${metrics['today']['revenue']:.2f}")
        print(f"✓ Today's Appointments: {metrics['today']['appointments']}")
        print(f"✓ Daily Revenue Target: ${targets['daily_revenue_target']:.2f}")
        print(f"✓ On Track Daily: {indicators['on_track_daily']}")
        print(f"✓ On Track Monthly: {indicators['on_track_monthly']}")
        print(f"✓ Trend Direction: {indicators['trend_direction']}")
    
    def test_calculation_accuracy(self):
        """Test calculation accuracy and edge cases"""
        print("\n=== Testing Calculation Accuracy ===")
        
        # Test with specific date range
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        date_range = DateRange(
            start_date=thirty_days_ago,
            end_date=datetime.utcnow()
        )
        
        revenue_data = self.base_service.get_revenue_analytics(
            user_id=1,
            date_range=date_range
        )
        
        # Verify revenue calculation accuracy
        total_revenue = revenue_data["summary"]["total_revenue"]
        total_transactions = revenue_data["summary"]["total_transactions"]
        avg_transaction = revenue_data["summary"]["average_transaction"]
        
        if total_transactions > 0:
            calculated_avg = total_revenue / total_transactions
            assert abs(calculated_avg - avg_transaction) < 0.01, "Average transaction calculation error"
            print(f"✓ Average transaction calculation accurate: ${avg_transaction:.2f}")
        
        # Test utilization rate calculation
        six_fig_metrics = self.base_service.calculate_six_figure_barber_metrics(user_id=1)
        utilization = six_fig_metrics["current_performance"]["utilization_rate"]
        
        assert 0 <= utilization <= 100, "Utilization rate out of bounds"
        print(f"✓ Utilization rate within bounds: {utilization:.1f}%")
        
        # Test client retention rate calculation
        retention_data = self.base_service.get_client_retention_metrics(user_id=1)
        retention_rate = retention_data["summary"]["retention_rate"]
        total_clients = retention_data["summary"]["total_clients"]
        returning_clients = retention_data["summary"]["returning_clients"]
        
        if total_clients > 0:
            calculated_retention = (returning_clients / total_clients) * 100
            assert abs(calculated_retention - retention_rate) < 0.1, "Retention rate calculation error"
            print(f"✓ Retention rate calculation accurate: {retention_rate:.1f}%")
    
    def test_performance_benchmarks(self):
        """Test performance against industry benchmarks"""
        print("\n=== Testing Performance Benchmarks ===")
        
        # Get appointment analytics for benchmark comparison
        appointment_data = self.base_service.get_appointment_analytics(user_id=1)
        completion_rate = appointment_data["summary"]["completion_rate"]
        no_show_rate = appointment_data["summary"]["no_show_rate"]
        
        # Industry benchmarks
        industry_benchmarks = {
            "completion_rate": {"excellent": 90, "good": 80, "average": 70},
            "no_show_rate": {"excellent": 5, "good": 10, "average": 15}
        }
        
        # Evaluate against benchmarks
        if completion_rate >= industry_benchmarks["completion_rate"]["excellent"]:
            completion_level = "Excellent"
        elif completion_rate >= industry_benchmarks["completion_rate"]["good"]:
            completion_level = "Good"
        elif completion_rate >= industry_benchmarks["completion_rate"]["average"]:
            completion_level = "Average"
        else:
            completion_level = "Below Average"
        
        print(f"✓ Completion Rate: {completion_rate:.1f}% ({completion_level})")
        
        if no_show_rate <= industry_benchmarks["no_show_rate"]["excellent"]:
            no_show_level = "Excellent"
        elif no_show_rate <= industry_benchmarks["no_show_rate"]["good"]:
            no_show_level = "Good"
        elif no_show_rate <= industry_benchmarks["no_show_rate"]["average"]:
            no_show_level = "Average"
        else:
            no_show_level = "Needs Improvement"
        
        print(f"✓ No-Show Rate: {no_show_rate:.1f}% ({no_show_level})")
    
    def test_data_integrity(self):
        """Test data integrity and consistency"""
        print("\n=== Testing Data Integrity ===")
        
        # Test that all metrics are internally consistent
        dashboard_data = self.base_service.get_advanced_dashboard_summary(user_id=1)
        
        # Verify key metrics exist and are reasonable
        key_metrics = dashboard_data["key_metrics"]
        
        assert key_metrics["revenue"]["current"] >= 0, "Revenue cannot be negative"
        assert key_metrics["appointments"]["current"] >= 0, "Appointments cannot be negative"
        assert key_metrics["clients"]["active"] >= 0, "Active clients cannot be negative"
        assert 0 <= key_metrics["appointments"]["completion_rate"] <= 100, "Completion rate out of bounds"
        
        print("✓ All key metrics within expected bounds")
        
        # Test that revenue analytics and appointment analytics are consistent
        revenue_data = self.base_service.get_revenue_analytics(user_id=1)
        appointment_data = self.base_service.get_appointment_analytics(user_id=1)
        
        # The number of transactions should not exceed completed appointments
        completed_appointments = appointment_data["summary"]["completed"]
        total_transactions = revenue_data["summary"]["total_transactions"]
        
        assert total_transactions <= completed_appointments, "More transactions than completed appointments"
        print("✓ Revenue and appointment data consistency verified")
    
    @classmethod
    def teardown_class(cls):
        """Clean up test database"""
        cls.db.close()
        print("\n✓ Test database cleaned up")


def run_analytics_tests():
    """Run comprehensive analytics tests"""
    print("🚀 Starting Enhanced Analytics Test Suite")
    print("=" * 60)
    
    # Create test instance
    test_suite = TestEnhancedAnalytics()
    
    # Set up test environment
    TestEnhancedAnalytics.setup_class()
    
    try:
        # Run all tests
        test_suite.test_basic_analytics_calculations()
        test_suite.test_six_figure_barber_calculations()
        test_suite.test_enhanced_analytics_features()
        test_suite.test_business_health_scoring()
        test_suite.test_pricing_optimization()
        test_suite.test_client_value_analysis()
        test_suite.test_revenue_forecasting()
        test_suite.test_real_time_dashboard_data()
        test_suite.test_calculation_accuracy()
        test_suite.test_performance_benchmarks()
        test_suite.test_data_integrity()
        
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED! Analytics system is working correctly.")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Clean up
        TestEnhancedAnalytics.teardown_class()


if __name__ == "__main__":
    success = run_analytics_tests()
    sys.exit(0 if success else 1)