"""
Test script for Enterprise Analytics Service

This script demonstrates how to use the EnterpriseAnalyticsService
to get multi-location analytics and KPIs.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from db import SessionLocal
from services.enterprise_analytics_service import EnterpriseAnalyticsService
from schemas import DateRange


def test_enterprise_analytics():
    """Test the enterprise analytics service with sample queries"""
    
    # Create database session
    db: Session = SessionLocal()
    
    try:
        # Initialize the service
        analytics_service = EnterpriseAnalyticsService(db)
        
        # Define date range for last 30 days
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        date_range = DateRange(start_date=start_date, end_date=end_date)
        
        print("=" * 80)
        print("ENTERPRISE ANALYTICS TEST")
        print("=" * 80)
        print(f"Date Range: {start_date.date()} to {end_date.date()}")
        print()
        
        # Test 1: Get Enterprise Dashboard
        print("1. Enterprise Dashboard")
        print("-" * 40)
        dashboard = analytics_service.get_enterprise_dashboard(date_range=date_range)
        
        print(f"Total Locations: {dashboard['summary']['total_locations']}")
        print(f"Total Revenue: ${dashboard['summary']['total_revenue']:,.2f}")
        print(f"Average Revenue per Location: ${dashboard['summary']['average_revenue_per_location']:,.2f}")
        print(f"Total Appointments: {dashboard['summary']['total_appointments']}")
        print(f"Overall Chair Occupancy: {dashboard['summary']['overall_occupancy_rate']:.1f}%")
        print(f"Total Active Clients: {dashboard['summary']['total_active_clients']}")
        print()
        
        # Test 2: Location Performance Matrix
        print("2. Location Performance Matrix (by Revenue)")
        print("-" * 40)
        performance_matrix = analytics_service.get_location_performance_matrix(
            date_range=date_range,
            comparison_metric="revenue"
        )
        
        print(f"Locations Analyzed: {performance_matrix['total_locations']}")
        print("\nTop 3 Locations:")
        for i, location in enumerate(performance_matrix['performance_matrix'][:3]):
            print(f"  {i+1}. {location['location_name']} ({location['location_code']})")
            print(f"     Revenue: ${location['score']:,.2f}")
            print(f"     Compensation Model: {location['compensation_model']}")
            print(f"     Category: {location['category']}")
        print()
        
        # Test 3: Revenue Aggregation by Compensation Model
        print("3. Revenue by Compensation Model")
        print("-" * 40)
        revenue_by_model = analytics_service.get_aggregated_revenue(
            date_range=date_range,
            group_by="compensation_model"
        )
        
        for model, data in revenue_by_model['data'].items():
            print(f"\n{model.upper()}:")
            print(f"  Total Revenue: ${data['total_revenue']:,.2f}")
            print(f"  Barber Earnings: ${data['barber_earnings']:,.2f}")
            print(f"  Platform Fees: ${data['platform_fees']:,.2f}")
            print(f"  Transactions: {data['transaction_count']}")
        print()
        
        # Test 4: Chair Utilization
        print("4. Chair Utilization Analysis")
        print("-" * 40)
        chair_utilization = analytics_service.get_chair_utilization(date_range=date_range)
        
        print(f"Total Chairs: {chair_utilization['summary']['total_chairs']}")
        print(f"Occupied Chairs: {chair_utilization['summary']['occupied_chairs']}")
        print(f"Vacant Chairs: {chair_utilization['summary']['vacant_chairs']}")
        print(f"Overall Occupancy Rate: {chair_utilization['summary']['overall_occupancy_rate']:.1f}%")
        print(f"Average Revenue per Chair: ${chair_utilization['summary']['average_revenue_per_chair']:,.2f}")
        
        print("\nInsights:")
        for insight in chair_utilization['insights'][:3]:
            print(f"  - [{insight['priority'].upper()}] {insight['title']}")
            print(f"    {insight['description']}")
        print()
        
        # Test 5: Compensation Analytics
        print("5. Compensation Model Analytics")
        print("-" * 40)
        comp_analytics = analytics_service.get_compensation_analytics(date_range=date_range)
        
        print("Model Comparison:")
        for model in comp_analytics['model_comparison']:
            print(f"  {model['model']}: ${model['avg_revenue_per_barber']:,.2f} avg/barber ({model['total_locations']} locations)")
        
        print("\nInsights:")
        for insight in comp_analytics['insights'][:3]:
            print(f"  - [{insight['priority'].upper()}] {insight['title']}")
            print(f"    {insight['description']}")
        print()
        
        # Test 6: Weekly Revenue Breakdown
        print("6. Weekly Revenue Breakdown")
        print("-" * 40)
        weekly_revenue = analytics_service.get_aggregated_revenue(
            date_range=date_range,
            group_by="week"
        )
        
        print("Weekly Revenue:")
        for week, data in sorted(weekly_revenue['data'].items())[-4:]:  # Last 4 weeks
            print(f"  Week {week}: ${data['total_revenue']:,.2f} ({data['transaction_count']} transactions)")
        
        print(f"\nTotal Period Revenue: ${weekly_revenue['summary']['total_revenue']:,.2f}")
        print(f"Average Transaction Value: ${weekly_revenue['summary']['average_transaction_value']:,.2f}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()


def test_specific_location(location_id: int):
    """Test analytics for a specific location"""
    
    db: Session = SessionLocal()
    
    try:
        analytics_service = EnterpriseAnalyticsService(db)
        
        # Get last 30 days
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        date_range = DateRange(start_date=start_date, end_date=end_date)
        
        print(f"\nLocation-Specific Analytics (Location ID: {location_id})")
        print("-" * 50)
        
        # Get dashboard for single location
        dashboard = analytics_service.get_enterprise_dashboard(
            date_range=date_range,
            location_ids=[location_id]
        )
        
        if dashboard['locations']:
            loc = dashboard['locations'][0]
            print(f"Location: {loc['location_name']} ({loc['location_code']})")
            print(f"Status: {loc['status']}")
            print(f"Compensation Model: {loc['compensation_model']}")
            print(f"Revenue: ${loc['metrics']['revenue']:,.2f}")
            print(f"Appointments: {loc['metrics']['appointments']}")
            print(f"Chair Occupancy: {loc['metrics']['occupancy_rate']:.1f}%")
            print(f"Barbers: {loc['metrics']['barber_count']}")
            print(f"Revenue per Barber: ${loc['metrics']['revenue_per_barber']:,.2f}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
    
    finally:
        db.close()


if __name__ == "__main__":
    # Run main test
    test_enterprise_analytics()
    
    # Optionally test a specific location
    # test_specific_location(1)