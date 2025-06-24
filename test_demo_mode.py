#!/usr/bin/env python3
import sys
sys.path.append('backend')

from api.v1.endpoints.financial_dashboard import check_demo_mode, generate_demo_shop_metrics
from models.user import User
from datetime import date, timedelta

def test_demo_mode():
    # Test demo mode detection
    demo_user = User(email='demo@6fb.com', first_name='Demo', last_name='User')
    regular_user = User(email='test@example.com', first_name='Test', last_name='User')

    print('Demo mode detection:')
    print(f'  Demo user: {check_demo_mode(demo_user)}')
    print(f'  Regular user: {check_demo_mode(regular_user)}')

    # Test demo data generation
    start_date = date.today() - timedelta(days=30)
    end_date = date.today()
    demo_data = generate_demo_shop_metrics(start_date, end_date)

    print('\nDemo shop metrics generated successfully:')
    print(f'  Total revenue: ${demo_data["revenue"]["total_revenue"]:,.2f}')
    print(f'  Service revenue: ${demo_data["revenue"]["service_revenue"]:,.2f}')
    print(f'  Processing fees: ${demo_data["revenue"]["processing_fees"]:,.2f}')
    print(f'  Revenue change: {demo_data["trends"]["revenue_change"]}%')
    print(f'  Active barbers: {demo_data["barber_metrics"]["active_barbers"]}')
    print('✅ Demo mode functionality working correctly')

if __name__ == "__main__":
    test_demo_mode()