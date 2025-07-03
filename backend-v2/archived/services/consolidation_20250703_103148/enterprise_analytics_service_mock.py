"""
Mock enterprise analytics service for testing
"""
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

class EnterpriseAnalyticsService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_enterprise_dashboard(
        self, 
        date_range: Optional[Any] = None,
        owner_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Return mock enterprise dashboard data"""
        
        # Mock data that matches the expected format
        return {
            "summary": {
                "total_locations": 10,
                "active_locations": 8,
                "total_revenue": 457850.00,
                "revenue_by_period": {
                    "daily": [
                        {"date": "2025-06-20", "revenue": 15250.00},
                        {"date": "2025-06-21", "revenue": 16890.00},
                        {"date": "2025-06-22", "revenue": 18500.00},
                        {"date": "2025-06-23", "revenue": 14200.00},
                        {"date": "2025-06-24", "revenue": 17800.00},
                        {"date": "2025-06-25", "revenue": 19500.00},
                        {"date": "2025-06-26", "revenue": 16700.00}
                    ]
                },
                "average_revenue_per_location": 45785.00,
                "total_appointments": 3254,
                "completion_rate": 92.5,
                "total_chairs": 80,
                "occupied_chairs": 66,
                "overall_occupancy_rate": 82.5,
                "total_active_clients": 8456,
                "new_clients": 324,
                "retention_rate": 78.5,
                "average_ticket_size": 140.75
            },
            "locations": [
                {
                    "id": 1,
                    "name": "Downtown Barbershop",
                    "code": "LOC001",
                    "city": "New York",
                    "state": "NY",
                    "status": "active",
                    "compensation_model": "commission",
                    "active_barbers": 8,
                    "revenue_mtd": 65400.00,
                    "appointments_mtd": 456,
                    "occupancy_rate": 87.5,
                    "avg_ticket": 143.42
                },
                {
                    "id": 2,
                    "name": "Midtown Classic Cuts",
                    "code": "LOC002",
                    "city": "New York",
                    "state": "NY",
                    "status": "active",
                    "compensation_model": "booth_rental",
                    "active_barbers": 6,
                    "revenue_mtd": 48200.00,
                    "appointments_mtd": 380,
                    "occupancy_rate": 75.0,
                    "avg_ticket": 126.84
                },
                {
                    "id": 3,
                    "name": "Brooklyn Heights Barbers",
                    "code": "LOC003",
                    "city": "Brooklyn",
                    "state": "NY",
                    "status": "active",
                    "compensation_model": "hybrid",
                    "active_barbers": 10,
                    "revenue_mtd": 72300.00,
                    "appointments_mtd": 520,
                    "occupancy_rate": 90.0,
                    "avg_ticket": 139.04
                }
            ],
            "metrics": {
                "total_revenue": 457850.00,
                "total_appointments": 3254,
                "total_clients": 8456,
                "average_ticket": 140.75,
                "chair_utilization": 82.5,
                "staff_retention": 88.9,
                "client_retention": 78.5,
                "revenue_growth": 12.5,
                "appointment_growth": 8.3,
                "new_client_rate": 3.8
            },
            "revenue_trend": {
                "daily": [
                    {"date": "2025-06-20", "revenue": 15250.00},
                    {"date": "2025-06-21", "revenue": 16890.00},
                    {"date": "2025-06-22", "revenue": 18500.00},
                    {"date": "2025-06-23", "revenue": 14200.00},
                    {"date": "2025-06-24", "revenue": 17800.00},
                    {"date": "2025-06-25", "revenue": 19500.00},
                    {"date": "2025-06-26", "revenue": 16700.00}
                ],
                "weekly": [
                    {"week": "2025-W23", "revenue": 95600.00},
                    {"week": "2025-W24", "revenue": 102300.00},
                    {"week": "2025-W25", "revenue": 118700.00},
                    {"week": "2025-W26", "revenue": 141250.00}
                ],
                "monthly": [
                    {"month": "2025-03", "revenue": 385600.00},
                    {"month": "2025-04", "revenue": 412300.00},
                    {"month": "2025-05", "revenue": 438900.00},
                    {"month": "2025-06", "revenue": 457850.00}
                ]
            },
            "top_performers": {
                "locations": [
                    {
                        "id": 3,
                        "name": "Brooklyn Heights Barbers",
                        "revenue": 72300.00,
                        "growth": 18.5
                    },
                    {
                        "id": 1,
                        "name": "Downtown Barbershop",
                        "revenue": 65400.00,
                        "growth": 15.2
                    }
                ],
                "barbers": [
                    {
                        "id": 12,
                        "name": "Marcus Johnson",
                        "revenue": 12500.00,
                        "appointments": 85,
                        "rating": 4.9
                    },
                    {
                        "id": 23,
                        "name": "David Chen",
                        "revenue": 11800.00,
                        "appointments": 78,
                        "rating": 4.8
                    }
                ],
                "services": [
                    {
                        "name": "Premium Cut & Style",
                        "revenue": 45600.00,
                        "count": 320,
                        "avg_price": 142.50
                    },
                    {
                        "name": "Beard Trim & Shape",
                        "revenue": 28400.00,
                        "count": 568,
                        "avg_price": 50.00
                    }
                ]
            },
            "alerts": [
                {
                    "type": "success",
                    "message": "Revenue up 12.5% compared to last month",
                    "timestamp": datetime.utcnow().isoformat()
                },
                {
                    "type": "warning",
                    "message": "2 locations have chair utilization below 70%",
                    "timestamp": datetime.utcnow().isoformat()
                },
                {
                    "type": "info",
                    "message": "324 new clients acquired this month",
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }