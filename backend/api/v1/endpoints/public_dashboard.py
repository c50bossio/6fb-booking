"""
Public dashboard endpoints that work without authentication (demo mode)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, date, timedelta
from typing import Dict, Any, List
import random

from config.database import get_db

router = APIRouter()


@router.get("/dashboard/demo/appointments/today")
async def get_demo_todays_appointments(db: Session = Depends(get_db)):
    """Get demo today's appointments with realistic mock data"""
    today = date.today()

    # Generate realistic mock appointments
    barbers = ["DJ Williams", "Carlos Rodriguez", "Mike Thompson", "Tony Jackson"]
    services = [
        {"name": "Signature Cut + Beard Trim", "price": 65},
        {"name": "Classic Fade", "price": 35},
        {"name": "Beard Shape Up", "price": 25},
        {"name": "Full Service Cut + Wash", "price": 55},
        {"name": "Kids Cut", "price": 20},
        {"name": "Hot Towel Shave", "price": 40},
        {"name": "Edge Up", "price": 15},
        {"name": "Design Cut", "price": 45},
    ]

    clients = [
        {
            "name": "Marcus Johnson",
            "email": "marcus.j@email.com",
            "phone": "(555) 123-4567",
        },
        {
            "name": "DeAndre Williams",
            "email": "deandre.w@email.com",
            "phone": "(555) 234-5678",
        },
        {
            "name": "Jaylen Carter",
            "email": "jaylen.c@email.com",
            "phone": "(555) 345-6789",
        },
        {
            "name": "Isaiah Brooks",
            "email": "isaiah.b@email.com",
            "phone": "(555) 456-7890",
        },
        {
            "name": "Malik Johnson Jr.",
            "email": "malik.sr@email.com",
            "phone": "(555) 567-8901",
        },
        {
            "name": "Darius Thompson",
            "email": "darius.t@email.com",
            "phone": "(555) 678-9012",
        },
        {
            "name": "Jordan Mitchell",
            "email": "jordan.m@email.com",
            "phone": "(555) 789-0123",
        },
        {
            "name": "Xavier Davis",
            "email": "xavier.d@email.com",
            "phone": "(555) 890-1234",
        },
    ]

    times = [
        "09:00 AM",
        "09:30 AM",
        "10:00 AM",
        "10:30 AM",
        "11:00 AM",
        "11:30 AM",
        "12:00 PM",
        "12:30 PM",
        "01:00 PM",
        "01:30 PM",
        "02:00 PM",
        "02:30 PM",
        "03:00 PM",
        "03:30 PM",
        "04:00 PM",
        "04:30 PM",
        "05:00 PM",
        "05:30 PM",
    ]

    current_hour = datetime.now().hour

    appointments = []
    for i, time_slot in enumerate(times[:12]):  # Generate 12 appointments
        # Parse time to determine status
        hour = int(time_slot.split(":")[0])
        if "PM" in time_slot and hour != 12:
            hour += 12

        # Determine status based on current time
        if hour < current_hour:
            status = "completed"
        elif hour == current_hour:
            status = "in_progress"
        else:
            status = "upcoming"

        service = random.choice(services)
        client = random.choice(clients)
        barber = random.choice(barbers)

        appointments.append(
            {
                "id": 1000 + i,
                #                 "trafft_id": f"tfr_app_{12345 + i}",
                "date": today.isoformat(),
                "time": time_slot,
                "status": status,
                "display_status": status,
                "service": service,
                "client": client,
                "barber": {
                    "name": barber,
                    "email": f"{barber.lower().replace(' ', '.')}@headlines.com",
                },
                "location": "Headlines Barbershop - Downtown",
            }
        )

    # Calculate stats
    stats = {
        "total": len(appointments),
        "upcoming": len([a for a in appointments if a["status"] == "upcoming"]),
        "completed": len([a for a in appointments if a["status"] == "completed"]),
        "cancelled": 0,
        "revenue": sum(
            a["service"]["price"] for a in appointments if a["status"] != "cancelled"
        ),
    }

    return {"date": today.isoformat(), "appointments": appointments, "stats": stats}


@router.get("/dashboard/demo/barbers")
async def get_demo_barbers(db: Session = Depends(get_db)):
    """Get demo barber list"""
    return [
        {
            "id": 1,
            "first_name": "DJ",
            "last_name": "Williams",
            "email": "dj.williams@headlines.com",
            "phone": "(555) 111-2222",
            "is_active": True,
            "stripe_account_connected": True,
            "commission_rate": 70,
            "specialties": ["Fades", "Designs", "Beard Grooming"],
        },
        {
            "id": 2,
            "first_name": "Carlos",
            "last_name": "Rodriguez",
            "email": "carlos.rodriguez@headlines.com",
            "phone": "(555) 222-3333",
            "is_active": True,
            "stripe_account_connected": True,
            "commission_rate": 65,
            "specialties": ["Classic Cuts", "Hot Shaves", "Hair Styling"],
        },
        {
            "id": 3,
            "first_name": "Mike",
            "last_name": "Thompson",
            "email": "mike.thompson@headlines.com",
            "phone": "(555) 333-4444",
            "is_active": True,
            "stripe_account_connected": False,
            "commission_rate": 60,
            "specialties": ["Kids Cuts", "Beard Trimming", "Edge Ups"],
        },
        {
            "id": 4,
            "first_name": "Tony",
            "last_name": "Jackson",
            "email": "tony.jackson@headlines.com",
            "phone": "(555) 444-5555",
            "is_active": True,
            "stripe_account_connected": True,
            "commission_rate": 70,
            "specialties": ["Designs", "Fades", "Locs Maintenance"],
        },
    ]


@router.get("/dashboard/demo/analytics/overview")
async def get_demo_analytics(db: Session = Depends(get_db)):
    """Get demo analytics data"""
    return {
        "revenue": {
            "today": 845.00,
            "this_week": 4225.00,
            "this_month": 16900.00,
            "growth_percentage": 12.5,
        },
        "appointments": {
            "today": 12,
            "this_week": 68,
            "this_month": 280,
            "completion_rate": 0.92,
        },
        "clients": {"new_this_week": 8, "returning_rate": 0.78, "total_active": 245},
        "performance": {
            "average_service_time": 45,  # minutes
            "busiest_hours": ["2:00 PM - 4:00 PM", "5:00 PM - 7:00 PM"],
            "top_services": [
                {"name": "Signature Cut + Beard Trim", "count": 89},
                {"name": "Classic Fade", "count": 76},
                {"name": "Full Service Cut + Wash", "count": 54},
            ],
        },
    }


@router.get("/dashboard/demo/calendar/events")
async def get_demo_calendar_events(
    start_date: str = None, end_date: str = None, db: Session = Depends(get_db)
):
    """Get demo calendar events for the calendar view"""
    # Default to current week if no dates provided
    if not start_date:
        start_date = date.today() - timedelta(days=date.today().weekday())
    else:
        start_date = datetime.fromisoformat(start_date).date()

    if not end_date:
        end_date = start_date + timedelta(days=6)
    else:
        end_date = datetime.fromisoformat(end_date).date()

    events = []
    barbers = ["DJ Williams", "Carlos Rodriguez", "Mike Thompson", "Tony Jackson"]
    services = [
        {
            "name": "Signature Cut + Beard Trim",
            "duration": 60,
            "price": 65,
            "color": "#8B5CF6",
        },
        {"name": "Classic Fade", "duration": 30, "price": 35, "color": "#3B82F6"},
        {"name": "Beard Shape Up", "duration": 20, "price": 25, "color": "#10B981"},
        {
            "name": "Full Service Cut + Wash",
            "duration": 45,
            "price": 55,
            "color": "#F59E0B",
        },
        {"name": "Kids Cut", "duration": 20, "price": 20, "color": "#EF4444"},
    ]

    # Generate events for each day
    current_date = start_date
    event_id = 1

    while current_date <= end_date:
        # Skip Sundays (closed)
        if current_date.weekday() != 6:
            # Generate 8-12 appointments per day
            num_appointments = random.randint(8, 12)

            for _ in range(num_appointments):
                barber = random.choice(barbers)
                service = random.choice(services)

                # Random time between 9 AM and 6 PM
                hour = random.randint(9, 17)
                minute = random.choice([0, 15, 30, 45])

                start_time = datetime.combine(
                    current_date, datetime.min.time().replace(hour=hour, minute=minute)
                )
                end_time = start_time + timedelta(minutes=service["duration"])

                events.append(
                    {
                        "id": event_id,
                        "title": service["name"],
                        "start": start_time.isoformat(),
                        "end": end_time.isoformat(),
                        "resource": barber,
                        "color": service["color"],
                        "extendedProps": {
                            "barber": barber,
                            "client": f"Client {event_id}",
                            "phone": f"(555) {random.randint(100, 999)}-{random.randint(1000, 9999)}",
                            "price": service["price"],
                            "status": (
                                "confirmed"
                                if current_date >= date.today()
                                else "completed"
                            ),
                        },
                    }
                )
                event_id += 1

        current_date += timedelta(days=1)

    return {
        "events": events,
        "resources": [{"id": barber, "title": barber} for barber in barbers],
    }
