"""
Seed data script for 6FB Booking Platform
Creates initial users, locations, and sample data
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta, date, time
import random
import json
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from config.database import DATABASE_URL

# Import Base to ensure all models are registered
from config.database import Base
from models.user import User
from models.location import Location, LocationAnalytics
from models.barber import Barber
from models.client import Client
from models.appointment import Appointment
from models.analytics import SixFBScore
from models.training import (
    TrainingModule,
    Certification,
    TrainingEnrollment,
    UserCertification,
    TrainingPath,
)
from models.automation import AutomationRule
from models.revenue_share import RevenueShare, Commission

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password):
    return pwd_context.hash(password)


class DataSeeder:
    def __init__(self):
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        self.db = SessionLocal()

    def __del__(self):
        self.db.close()

    def seed_all(self):
        """Seed all data"""
        print("Starting data seeding...")

        # Order matters due to foreign key constraints
        users = self.seed_users()
        locations = self.seed_locations(users)
        barbers = self.seed_barbers(users, locations)
        clients = self.seed_clients(barbers, locations)
        appointments = self.seed_appointments(barbers, clients)
        self.seed_metrics(barbers, appointments)
        self.seed_training_data(users)
        self.seed_automation_rules(users)

        print("\nData seeding completed successfully!")
        self.print_summary()

    def seed_users(self):
        """Create initial users with different roles"""
        print("\nSeeding users...")

        users_data = [
            {
                "email": "admin@6fb.com",
                "hashed_password": get_password_hash("password123"),
                "first_name": "Admin",
                "last_name": "User",
                "role": "super_admin",
                "is_active": True,
                "phone": "(555) 100-0001",
            },
            {
                "email": "john.mentor@6fb.com",
                "hashed_password": get_password_hash("password123"),
                "first_name": "John",
                "last_name": "Mentor",
                "role": "mentor",
                "is_active": True,
                "phone": "(555) 200-0001",
                "sixfb_certification_level": "gold",
            },
            {
                "email": "jane.admin@6fb.com",
                "hashed_password": get_password_hash("password123"),
                "first_name": "Jane",
                "last_name": "Admin",
                "role": "admin",
                "is_active": True,
                "phone": "(555) 100-0002",
            },
            {
                "email": "mike.barber@6fb.com",
                "hashed_password": get_password_hash("password123"),
                "first_name": "Mike",
                "last_name": "Johnson",
                "role": "barber",
                "is_active": True,
                "phone": "(555) 300-0001",
                "sixfb_certification_level": "silver",
            },
            {
                "email": "sarah.barber@6fb.com",
                "hashed_password": get_password_hash("password123"),
                "first_name": "Sarah",
                "last_name": "Williams",
                "role": "barber",
                "is_active": True,
                "phone": "(555) 300-0002",
                "sixfb_certification_level": "bronze",
            },
            {
                "email": "david.barber@6fb.com",
                "hashed_password": get_password_hash("password123"),
                "first_name": "David",
                "last_name": "Chen",
                "role": "barber",
                "is_active": True,
                "phone": "(555) 300-0003",
                "sixfb_certification_level": "gold",
            },
            {
                "email": "lisa.barber@6fb.com",
                "hashed_password": get_password_hash("password123"),
                "first_name": "Lisa",
                "last_name": "Martinez",
                "role": "barber",
                "is_active": True,
                "phone": "(555) 300-0004",
            },
            {
                "email": "staff@6fb.com",
                "hashed_password": get_password_hash("password123"),
                "first_name": "Staff",
                "last_name": "Member",
                "role": "staff",
                "is_active": True,
                "phone": "(555) 400-0001",
            },
        ]

        created_users = []
        for user_data in users_data:
            user = User(**user_data)
            self.db.add(user)
            created_users.append(user)

        self.db.commit()
        print(f"Created {len(created_users)} users")
        return created_users

    def seed_locations(self, users):
        """Create initial locations"""
        print("\nSeeding locations...")

        # Find mentor user
        mentor = next((u for u in users if u.role == "mentor"), None)

        locations_data = [
            {
                "name": "Downtown Barbershop",
                "business_name": "6FB Downtown Premium Cuts",
                "location_code": "DTN001",
                "address": "123 Main Street",
                "city": "New York",
                "state": "NY",
                "zip_code": "10001",
                "phone": "(555) 123-4567",
                "email": "downtown@6fb.com",
                "franchise_type": "company_owned",
                "is_active": True,
                "mentor_id": mentor.id if mentor else None,
                "operating_hours": json.dumps(
                    {
                        "monday": "9:00 AM - 8:00 PM",
                        "tuesday": "9:00 AM - 8:00 PM",
                        "wednesday": "9:00 AM - 8:00 PM",
                        "thursday": "9:00 AM - 8:00 PM",
                        "friday": "9:00 AM - 9:00 PM",
                        "saturday": "8:00 AM - 9:00 PM",
                        "sunday": "10:00 AM - 6:00 PM",
                    }
                ),
            },
            {
                "name": "Uptown Premium Cuts",
                "business_name": "6FB Uptown Elite Barbershop",
                "location_code": "UPT002",
                "address": "456 Park Avenue",
                "city": "New York",
                "state": "NY",
                "zip_code": "10022",
                "phone": "(555) 234-5678",
                "email": "uptown@6fb.com",
                "franchise_type": "franchisee",
                "is_active": True,
                "operating_hours": json.dumps(
                    {
                        "monday": "10:00 AM - 7:00 PM",
                        "tuesday": "10:00 AM - 7:00 PM",
                        "wednesday": "10:00 AM - 7:00 PM",
                        "thursday": "10:00 AM - 7:00 PM",
                        "friday": "10:00 AM - 8:00 PM",
                        "saturday": "9:00 AM - 8:00 PM",
                        "sunday": "11:00 AM - 5:00 PM",
                    }
                ),
            },
            {
                "name": "Brooklyn Style Shop",
                "business_name": "6FB Brooklyn Barbershop & Grooming",
                "location_code": "BKL003",
                "address": "789 Atlantic Avenue",
                "city": "Brooklyn",
                "state": "NY",
                "zip_code": "11217",
                "phone": "(555) 345-6789",
                "email": "brooklyn@6fb.com",
                "franchise_type": "franchisee",
                "is_active": True,
                "operating_hours": json.dumps(
                    {
                        "monday": "9:00 AM - 7:00 PM",
                        "tuesday": "9:00 AM - 7:00 PM",
                        "wednesday": "9:00 AM - 7:00 PM",
                        "thursday": "9:00 AM - 7:00 PM",
                        "friday": "9:00 AM - 8:00 PM",
                        "saturday": "8:00 AM - 8:00 PM",
                        "sunday": "10:00 AM - 5:00 PM",
                    }
                ),
            },
        ]

        created_locations = []
        for location_data in locations_data:
            location = Location(**location_data)
            self.db.add(location)
            created_locations.append(location)

        self.db.commit()

        # Update users with primary locations
        barber_users = [u for u in users if u.role == "barber"]
        for i, user in enumerate(barber_users):
            user.primary_location_id = created_locations[i % len(created_locations)].id

        self.db.commit()

        print(f"Created {len(created_locations)} locations")
        return created_locations

    def seed_barbers(self, users, locations):
        """Create barber records linked to users"""
        print("\nSeeding barbers...")

        barber_users = [u for u in users if u.role == "barber"]
        created_barbers = []

        for i, user in enumerate(barber_users):
            barber_data = {
                "user_id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "phone": user.phone,
                "location_id": locations[i % len(locations)].id,
                "is_active": True,
                "is_verified": True,
            }

            barber = Barber(**barber_data)
            self.db.add(barber)
            created_barbers.append(barber)

        self.db.commit()
        print(f"Created {len(created_barbers)} barbers")
        return created_barbers

    def seed_clients(self, barbers, locations):
        """Create sample clients"""
        print("\nSeeding clients...")

        first_names = [
            "James",
            "Robert",
            "John",
            "Michael",
            "William",
            "David",
            "Richard",
            "Joseph",
            "Thomas",
            "Christopher",
            "Maria",
            "Jennifer",
            "Lisa",
            "Nancy",
            "Karen",
            "Betty",
            "Helen",
            "Sandra",
            "Donna",
            "Carol",
        ]
        last_names = [
            "Smith",
            "Johnson",
            "Williams",
            "Brown",
            "Jones",
            "Garcia",
            "Miller",
            "Davis",
            "Rodriguez",
            "Martinez",
            "Wilson",
            "Anderson",
            "Taylor",
            "Thomas",
            "Hernandez",
            "Moore",
            "Martin",
            "Jackson",
            "Thompson",
            "White",
        ]

        created_clients = []

        for i in range(50):  # Create 50 clients
            client_data = {
                "first_name": random.choice(first_names),
                "last_name": random.choice(last_names),
                "email": f"client{i+1}@email.com",
                "phone": f"(555) 555-{i+1000:04d}",
                "barber_id": random.choice(barbers).id,
                "customer_type": (
                    random.choice(["new", "returning", "vip"]) if i % 5 != 0 else "new"
                ),
                "total_visits": random.randint(1, 20) if i % 5 != 0 else 0,
                "notes": f"Regular client #{i+1}" if random.random() > 0.5 else None,
            }

            client = Client(**client_data)
            self.db.add(client)
            created_clients.append(client)

        self.db.commit()
        print(f"Created {len(created_clients)} clients")
        return created_clients

    def seed_appointments(self, barbers, clients):
        """Create sample appointments"""
        print("\nSeeding appointments...")

        services = [
            ("Haircut & Style", 30, 35.00),
            ("Beard Trim", 20, 20.00),
            ("Hot Towel Shave", 45, 45.00),
            ("Hair & Beard Combo", 50, 50.00),
            ("Kids Cut", 20, 25.00),
            ("Senior Cut", 25, 30.00),
            ("Design/Pattern", 45, 50.00),
            ("Hair Wash", 15, 10.00),
        ]

        created_appointments = []

        # Create appointments for the last 60 days
        for days_ago in range(60):
            appointment_date = date.today() - timedelta(days=days_ago)

            # Skip some days randomly to make it realistic
            if random.random() < 0.1:  # 10% chance to skip a day
                continue

            # Create 5-15 appointments per day
            num_appointments = random.randint(5, 15)

            for _ in range(num_appointments):
                barber = random.choice(barbers)
                client = random.choice(clients)
                service = random.choice(services)

                # Random appointment time between 9 AM and 7 PM
                hour = random.randint(9, 18)
                minute = random.choice([0, 30])
                appointment_time = datetime.combine(
                    appointment_date, time(hour, minute)
                )

                # Determine status based on date
                if appointment_date < date.today():
                    status = random.choices(
                        ["completed", "no_show", "cancelled"],
                        weights=[0.85, 0.10, 0.05],
                    )[0]
                elif appointment_date == date.today():
                    status = random.choices(
                        ["scheduled", "confirmed", "completed"], weights=[0.3, 0.3, 0.4]
                    )[0]
                else:
                    status = random.choices(
                        ["scheduled", "confirmed"], weights=[0.6, 0.4]
                    )[0]

                appointment_data = {
                    "barber_id": barber.id,
                    "client_id": client.id,
                    "appointment_date": appointment_date,
                    "appointment_time": appointment_time,
                    "status": status,
                    "service_name": service[0],
                    "duration_minutes": service[1],
                    "customer_type": random.choice(["new", "returning"]),
                    "reference_source": "platform",
                }

                # Add revenue data for completed appointments
                if status == "completed":
                    appointment_data["service_revenue"] = service[2]
                    appointment_data["tip_amount"] = (
                        random.choice([0, 5, 10, 15, 20])
                        if random.random() > 0.2
                        else 0
                    )
                    appointment_data["product_revenue"] = (
                        random.choice([0, 0, 0, 15, 25, 40])
                        if random.random() > 0.7
                        else 0
                    )

                appointment = Appointment(**appointment_data)
                self.db.add(appointment)
                created_appointments.append(appointment)

        self.db.commit()
        print(f"Created {len(created_appointments)} appointments")
        return created_appointments

    def seed_metrics(self, barbers, appointments):
        """Create 6FB metrics for barbers"""
        print("\nSeeding 6FB metrics...")

        created_metrics = []

        for barber in barbers:
            # Get barber's appointments
            barber_appointments = [a for a in appointments if a.barber_id == barber.id]
            completed_appointments = [
                a for a in barber_appointments if a.status == "completed"
            ]

            if not completed_appointments:
                continue

            # Calculate metrics
            total_revenue = sum(
                (a.service_revenue or 0)
                + (a.tip_amount or 0)
                + (a.product_revenue or 0)
                for a in completed_appointments
            )

            total_clients = len(set(a.client_id for a in completed_appointments))
            new_clients = len(
                [a for a in completed_appointments if a.customer_type == "new"]
            )
            returning_clients = len(
                [a for a in completed_appointments if a.customer_type == "returning"]
            )

            # Calculate scores
            booking_utilization = random.uniform(70, 90)
            revenue_growth = random.uniform(65, 95)
            retention_score = (
                (returning_clients / total_clients * 100) if total_clients > 0 else 0
            )
            avg_ticket = (
                float(total_revenue / len(completed_appointments))
                if completed_appointments
                else 0
            )
            service_quality = random.uniform(75, 95)

            # Calculate overall score
            overall = (
                booking_utilization * 0.25
                + revenue_growth * 0.20
                + retention_score * 0.20
                + (avg_ticket / 100 * 100) * 0.20  # Normalize to 0-100
                + service_quality * 0.15
            )

            # Determine grade
            if overall >= 90:
                grade = "A+"
            elif overall >= 85:
                grade = "A"
            elif overall >= 80:
                grade = "B+"
            elif overall >= 75:
                grade = "B"
            elif overall >= 70:
                grade = "C+"
            elif overall >= 65:
                grade = "C"
            elif overall >= 60:
                grade = "D"
            else:
                grade = "F"

            metrics_data = {
                "barber_id": barber.id,
                "calculation_date": date.today(),
                "period_type": "weekly",
                "booking_utilization_score": booking_utilization,
                "revenue_growth_score": revenue_growth,
                "customer_retention_score": retention_score,
                "average_ticket_score": min(avg_ticket, 100),  # Cap at 100
                "service_quality_score": service_quality,
                "overall_score": overall,
                "grade": grade,
                "peer_percentile": random.uniform(40, 90),
                "improvement_from_previous": random.uniform(-5, 10),
            }

            metric = SixFBScore(**metrics_data)
            self.db.add(metric)
            created_metrics.append(metric)

        self.db.commit()
        print(f"Created {len(created_metrics)} metric records")
        return created_metrics

    def seed_training_data(self, users):
        """Create training modules and certifications"""
        print("\nSeeding training data...")

        # Create training modules (from training_service.py defaults)
        modules_data = [
            {
                "title": "6FB Methodology Foundation",
                "description": "Introduction to the Six Figure Barber methodology and core principles",
                "category": "basic",
                "difficulty_level": "beginner",
                "content_type": "video",
                "estimated_duration": 90,
                "required_for_certification": "bronze",
                "is_mandatory": True,
                "passing_score": 85.0,
                "created_by": users[0].id,  # Admin user
            },
            {
                "title": "Booking Efficiency Mastery",
                "description": "Learn to optimize your schedule for maximum utilization and revenue",
                "category": "basic",
                "difficulty_level": "intermediate",
                "content_type": "interactive",
                "estimated_duration": 120,
                "required_for_certification": "bronze",
                "is_mandatory": True,
                "passing_score": 80.0,
                "created_by": users[0].id,
            },
            {
                "title": "Client Retention Strategies",
                "description": "Advanced techniques for building lasting client relationships",
                "category": "intermediate",
                "difficulty_level": "intermediate",
                "content_type": "video",
                "estimated_duration": 105,
                "required_for_certification": "silver",
                "passing_score": 82.0,
                "created_by": users[0].id,
            },
        ]

        created_modules = []
        for module_data in modules_data:
            module = TrainingModule(**module_data)
            self.db.add(module)
            created_modules.append(module)

        # Create certifications
        certifications_data = [
            {
                "name": "6FB Bronze Certification",
                "level": "bronze",
                "description": "Entry-level certification covering 6FB fundamentals",
                "required_score_average": 80.0,
                "required_experience_months": 0,
                "validity_period": 12,
                "commission_bonus": 0.5,
                "mentor_eligibility": False,
            },
            {
                "name": "6FB Silver Certification",
                "level": "silver",
                "description": "Intermediate certification demonstrating proficiency in 6FB techniques",
                "required_score_average": 82.0,
                "required_experience_months": 6,
                "validity_period": 18,
                "commission_bonus": 1.0,
                "mentor_eligibility": False,
            },
            {
                "name": "6FB Gold Certification",
                "level": "gold",
                "description": "Advanced certification for experienced practitioners",
                "required_score_average": 85.0,
                "required_experience_months": 12,
                "validity_period": 24,
                "commission_bonus": 2.0,
                "mentor_eligibility": True,
            },
        ]

        created_certs = []
        for cert_data in certifications_data:
            cert = Certification(**cert_data)
            self.db.add(cert)
            created_certs.append(cert)

        self.db.commit()

        # Create some enrollments for barber users
        barber_users = [u for u in users if u.role == "barber"]
        for user in barber_users[:2]:  # First two barbers
            enrollment = TrainingEnrollment(
                user_id=user.id,
                module_id=created_modules[0].id,
                status="completed",
                progress_percentage=100.0,
                attempts=1,
                best_score=90.0,
                enrolled_at=datetime.utcnow() - timedelta(days=30),
                completed_at=datetime.utcnow() - timedelta(days=25),
            )
            self.db.add(enrollment)

        self.db.commit()
        print(
            f"Created {len(created_modules)} training modules and {len(created_certs)} certifications"
        )

    def seed_automation_rules(self, users):
        """Create sample automation rules"""
        print("\nSeeding automation rules...")

        admin_user = next(u for u in users if u.role == "super_admin")

        rules_data = [
            {
                "name": "No-Show Follow-up",
                "description": "Send follow-up message to clients who missed appointments",
                "category": "client_followup",
                "trigger_type": "event_based",
                "trigger_config": {
                    "event": "appointment_no_show",
                    "conditions": {"status": "no_show"},
                },
                "action_type": "send_sms",
                "action_config": {"template": "followup_message", "delay_hours": 2},
                "is_active": True,
                "created_by": admin_user.id,
            },
            {
                "name": "Low Performance Alert",
                "description": "Alert when barber's 6FB score drops below 75",
                "category": "performance_alert",
                "trigger_type": "metric_based",
                "trigger_config": {
                    "metric": "overall_score",
                    "operator": "<",
                    "threshold": 75,
                },
                "action_type": "alert_manager",
                "action_config": {"alert_type": "performance", "notify_mentor": True},
                "is_active": True,
                "created_by": admin_user.id,
            },
        ]

        created_rules = []
        for rule_data in rules_data:
            rule = AutomationRule(**rule_data)
            self.db.add(rule)
            created_rules.append(rule)

        self.db.commit()
        print(f"Created {len(created_rules)} automation rules")
        return created_rules

    def print_summary(self):
        """Print summary of seeded data"""
        print("\n" + "=" * 50)
        print("SEED DATA SUMMARY")
        print("=" * 50)

        print(f"\nUsers: {self.db.query(User).count()}")
        print(
            f"  - Super Admins: {self.db.query(User).filter(User.role == 'super_admin').count()}"
        )
        print(f"  - Admins: {self.db.query(User).filter(User.role == 'admin').count()}")
        print(
            f"  - Mentors: {self.db.query(User).filter(User.role == 'mentor').count()}"
        )
        print(
            f"  - Barbers: {self.db.query(User).filter(User.role == 'barber').count()}"
        )
        print(f"  - Staff: {self.db.query(User).filter(User.role == 'staff').count()}")

        print(f"\nLocations: {self.db.query(Location).count()}")
        print(f"Barbers: {self.db.query(Barber).count()}")
        print(f"Clients: {self.db.query(Client).count()}")
        print(f"Appointments: {self.db.query(Appointment).count()}")
        print(
            f"  - Completed: {self.db.query(Appointment).filter(Appointment.status == 'completed').count()}"
        )
        print(
            f"  - Scheduled: {self.db.query(Appointment).filter(Appointment.status == 'scheduled').count()}"
        )

        print(f"\nTraining Modules: {self.db.query(TrainingModule).count()}")
        print(f"Certifications: {self.db.query(Certification).count()}")
        print(f"Automation Rules: {self.db.query(AutomationRule).count()}")

        print("\n" + "=" * 50)
        print("LOGIN CREDENTIALS")
        print("=" * 50)
        print("All passwords: password123")
        print("\nAdmin Users:")
        print("  - admin@6fb.com (Super Admin)")
        print("  - jane.admin@6fb.com (Admin)")
        print("\nMentor:")
        print("  - john.mentor@6fb.com")
        print("\nBarbers:")
        print("  - mike.barber@6fb.com")
        print("  - sarah.barber@6fb.com")
        print("  - david.barber@6fb.com")
        print("  - lisa.barber@6fb.com")
        print("\nStaff:")
        print("  - staff@6fb.com")
        print("=" * 50)


if __name__ == "__main__":
    seeder = DataSeeder()
    seeder.seed_all()
