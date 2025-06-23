#!/usr/bin/env python3
"""
Seed test client data for development
"""

from datetime import datetime, timedelta, date
import random
from sqlalchemy.orm import Session

from config.database import SessionLocal, engine, Base
from models import Client, Barber, User, Appointment, Service
import sys

# Create all tables
Base.metadata.create_all(bind=engine)


def get_or_create_test_barber(db: Session):
    """Get or create a test barber"""
    # First check if we have any barber
    barber = db.query(Barber).first()
    if barber:
        return barber

    # Create a test user for the barber
    user = User(
        username="testbarber",
        email="testbarber@example.com",
        full_name="Test Barber",
        role="barber",
        is_active=True,
    )
    user.set_password("Test123!")
    db.add(user)
    db.commit()

    # Create barber profile
    barber = Barber(
        user_id=user.id,
        bio="Experienced barber specializing in modern cuts",
        years_experience=5,
        specialties=["Fades", "Beard Styling", "Hair Design"],
        instagram_handle="@testbarber",
        chair_rental_fee=500.0,
        commission_percentage=60.0,
    )
    db.add(barber)
    db.commit()

    return barber


def seed_clients():
    """Seed test client data"""
    db = SessionLocal()

    try:
        # Get or create a test barber
        barber = get_or_create_test_barber(db)
        print(f"Using barber: {barber.user.full_name} (ID: {barber.id})")

        # Test client data
        clients_data = [
            {
                "first_name": "John",
                "last_name": "Smith",
                "email": "john.smith@example.com",
                "phone": "(555) 123-4567",
                "date_of_birth": date(1985, 5, 15),
                "customer_type": "vip",
                "total_visits": 24,
                "total_spent": 2400.0,
                "average_ticket": 100.0,
                "visit_frequency_days": 14,
                "no_show_count": 0,
                "cancellation_count": 1,
                "referral_count": 5,
                "notes": "Prefers appointments before 10 AM. Always gets the premium fade with beard styling. Allergic to certain hair products.",
                "tags": "VIP,Early Bird,Regular",
                "favorite_service": "Premium Fade + Beard",
            },
            {
                "first_name": "Michael",
                "last_name": "Johnson",
                "email": "mike.j@example.com",
                "phone": "(555) 234-5678",
                "date_of_birth": date(1990, 8, 22),
                "customer_type": "returning",
                "total_visits": 12,
                "total_spent": 840.0,
                "average_ticket": 70.0,
                "visit_frequency_days": 21,
                "no_show_count": 1,
                "cancellation_count": 0,
                "referral_count": 2,
                "notes": "Works downtown, prefers lunch hour appointments.",
                "tags": "Lunch Hour,Professional",
                "favorite_service": "Business Cut",
            },
            {
                "first_name": "David",
                "last_name": "Williams",
                "email": "david.w@example.com",
                "phone": "(555) 345-6789",
                "date_of_birth": date(1988, 3, 10),
                "customer_type": "vip",
                "total_visits": 36,
                "total_spent": 3600.0,
                "average_ticket": 100.0,
                "visit_frequency_days": 10,
                "no_show_count": 0,
                "cancellation_count": 0,
                "referral_count": 8,
                "notes": "Great client, always on time. Tips generously. Referred his entire office.",
                "tags": "VIP,Referrer,Generous Tipper",
                "favorite_service": "Premium Fade",
            },
            {
                "first_name": "Robert",
                "last_name": "Brown",
                "email": "rob.brown@example.com",
                "phone": "(555) 456-7890",
                "date_of_birth": date(1995, 11, 5),
                "customer_type": "at_risk",
                "total_visits": 4,
                "total_spent": 200.0,
                "average_ticket": 50.0,
                "visit_frequency_days": 45,
                "no_show_count": 2,
                "cancellation_count": 3,
                "referral_count": 0,
                "notes": "Has missed several appointments. Send reminder texts.",
                "tags": "At Risk,Needs Reminders",
                "favorite_service": "Basic Cut",
            },
            {
                "first_name": "James",
                "last_name": "Davis",
                "email": "james.davis@example.com",
                "phone": "(555) 567-8901",
                "date_of_birth": date(1992, 7, 18),
                "customer_type": "new",
                "total_visits": 1,
                "total_spent": 85.0,
                "average_ticket": 85.0,
                "visit_frequency_days": None,
                "no_show_count": 0,
                "cancellation_count": 0,
                "referral_count": 0,
                "notes": "New client, referred by David Williams. Interested in regular appointments.",
                "tags": "New,Referral",
                "favorite_service": "Premium Fade",
            },
            {
                "first_name": "William",
                "last_name": "Garcia",
                "email": "will.garcia@example.com",
                "phone": "(555) 678-9012",
                "date_of_birth": date(1987, 1, 30),
                "customer_type": "returning",
                "total_visits": 8,
                "total_spent": 640.0,
                "average_ticket": 80.0,
                "visit_frequency_days": 28,
                "no_show_count": 0,
                "cancellation_count": 1,
                "referral_count": 1,
                "notes": "Likes trying new styles. Ask about latest trends.",
                "tags": "Trendy,Experimental",
                "favorite_service": "Designer Cut",
            },
            {
                "first_name": "Daniel",
                "last_name": "Martinez",
                "email": "dan.martinez@example.com",
                "phone": "(555) 789-0123",
                "date_of_birth": date(1983, 9, 12),
                "customer_type": "vip",
                "total_visits": 20,
                "total_spent": 2000.0,
                "average_ticket": 100.0,
                "visit_frequency_days": 14,
                "no_show_count": 0,
                "cancellation_count": 0,
                "referral_count": 4,
                "notes": "Executive client. Books standing appointment every 2 weeks.",
                "tags": "VIP,Standing Appointment,Executive",
                "favorite_service": "Executive Package",
            },
            {
                "first_name": "Christopher",
                "last_name": "Rodriguez",
                "email": "chris.r@example.com",
                "phone": "(555) 890-1234",
                "date_of_birth": date(1991, 6, 25),
                "customer_type": "returning",
                "total_visits": 6,
                "total_spent": 300.0,
                "average_ticket": 50.0,
                "visit_frequency_days": 35,
                "no_show_count": 0,
                "cancellation_count": 0,
                "referral_count": 0,
                "notes": "College student, appreciates student discount.",
                "tags": "Student,Budget Conscious",
                "favorite_service": "Student Special",
            },
            {
                "first_name": "Matthew",
                "last_name": "Lewis",
                "email": "matt.lewis@example.com",
                "phone": "(555) 901-2345",
                "date_of_birth": date(1986, 4, 8),
                "customer_type": "returning",
                "total_visits": 10,
                "total_spent": 850.0,
                "average_ticket": 85.0,
                "visit_frequency_days": 21,
                "no_show_count": 1,
                "cancellation_count": 1,
                "referral_count": 3,
                "notes": "Beard enthusiast. Always gets beard treatment.",
                "tags": "Beard Care,Regular",
                "favorite_service": "Beard Sculpting",
            },
            {
                "first_name": "Anthony",
                "last_name": "Walker",
                "email": "tony.walker@example.com",
                "phone": "(555) 012-3456",
                "date_of_birth": date(1994, 12, 3),
                "customer_type": "new",
                "total_visits": 2,
                "total_spent": 140.0,
                "average_ticket": 70.0,
                "visit_frequency_days": 30,
                "no_show_count": 0,
                "cancellation_count": 0,
                "referral_count": 0,
                "notes": "New to the area. Looking for regular barber.",
                "tags": "New,Potential Regular",
                "favorite_service": "Classic Fade",
            },
        ]

        # Add clients
        for client_data in clients_data:
            # Check if client already exists
            existing = (
                db.query(Client).filter(Client.email == client_data["email"]).first()
            )
            if existing:
                print(f"Client {client_data['email']} already exists, skipping...")
                continue

            # Calculate last visit date based on frequency
            if client_data["visit_frequency_days"] and client_data["total_visits"] > 0:
                last_visit = datetime.now().date() - timedelta(
                    days=random.randint(1, client_data["visit_frequency_days"])
                )
            else:
                last_visit = None

            # Create client
            client = Client(
                barber_id=barber.id,
                first_name=client_data["first_name"],
                last_name=client_data["last_name"],
                email=client_data["email"],
                phone=client_data["phone"],
                date_of_birth=client_data.get("date_of_birth"),
                customer_type=client_data["customer_type"],
                total_visits=client_data["total_visits"],
                total_spent=client_data["total_spent"],
                average_ticket=client_data["average_ticket"],
                last_visit_date=last_visit,
                visit_frequency_days=client_data["visit_frequency_days"],
                no_show_count=client_data["no_show_count"],
                cancellation_count=client_data["cancellation_count"],
                referral_count=client_data["referral_count"],
                notes=client_data.get("notes"),
                tags=client_data.get("tags"),
                preferred_services=client_data.get("favorite_service"),
                sms_enabled=True,
                email_enabled=True,
                marketing_enabled=client_data["customer_type"] != "at_risk",
            )

            db.add(client)
            print(
                f"✓ Added client: {client.first_name} {client.last_name} ({client.customer_type})"
            )

        db.commit()
        print(f"\n✅ Successfully seeded {len(clients_data)} clients!")

        # Show summary
        total_clients = db.query(Client).count()
        vip_clients = db.query(Client).filter(Client.customer_type == "vip").count()
        at_risk_clients = (
            db.query(Client).filter(Client.customer_type == "at_risk").count()
        )

        print(f"\n📊 Client Summary:")
        print(f"   Total Clients: {total_clients}")
        print(f"   VIP Clients: {vip_clients}")
        print(f"   At Risk Clients: {at_risk_clients}")

    except Exception as e:
        print(f"❌ Error seeding data: {str(e)}")
        db.rollback()
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("🌱 Starting client data seeding...")
    seed_clients()
    print("\n✨ Done!")
