#!/usr/bin/env python3
"""
6FB Booking Platform - Staging Data Seeder
Seeds the staging database with realistic test data for development and testing
"""

import os
import sys
import logging
from datetime import datetime, timedelta, time
from typing import List, Dict, Any
import uuid
import random
from decimal import Decimal

# Add the parent directory to the path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from faker import Faker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Import models
from models.user import User
from models.location import Location
from models.barber import Barber
from models.client import Client
from models.appointment import Appointment
from models.payment import Payment
from models.notification import Notification
from models.analytics import Analytics

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize Faker
fake = Faker()


class StagingDataSeeder:
    """Seeds staging database with test data"""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_engine(database_url)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.session.close()

    def clear_existing_data(self):
        """Clear existing test data from staging database"""
        logger.info("Clearing existing test data...")

        try:
            # Clear in reverse order of dependencies
            tables = [
                "analytics",
                "notifications",
                "payments",
                "appointments",
                "clients",
                "barbers",
                "locations",
                "users",
            ]

            for table in tables:
                # Only delete test data (created in last 30 days for staging)
                result = self.session.execute(
                    text(
                        f"""
                    DELETE FROM {table}
                    WHERE created_at > NOW() - INTERVAL '30 days'
                    OR (email IS NOT NULL AND email LIKE '%staging%')
                    OR (name IS NOT NULL AND name LIKE '%Test%')
                """
                    )
                )
                deleted_count = result.rowcount
                logger.info(f"Cleared {deleted_count} records from {table}")

            self.session.commit()
            logger.info("Existing test data cleared successfully")

        except Exception as e:
            logger.error(f"Error clearing existing data: {e}")
            self.session.rollback()
            raise

    def create_test_users(self, count: int = 25) -> List[User]:
        """Create test users"""
        logger.info(f"Creating {count} test users...")

        users = []
        roles = ["admin", "barber", "client", "manager"]

        # Create admin user first
        admin_user = User(
            id=str(uuid.uuid4()),
            email="staging-admin@6fbplatform.com",
            name="Staging Admin",
            phone=fake.phone_number(),
            role="admin",
            is_active=True,
            is_verified=True,
            created_at=fake.date_time_between(start_date="-30d", end_date="now"),
        )
        users.append(admin_user)

        # Create regular test users
        for i in range(count - 1):
            user = User(
                id=str(uuid.uuid4()),
                email=f"test-user-{i+1}@staging.6fbplatform.com",
                name=fake.name(),
                phone=fake.phone_number(),
                role=random.choice(roles),
                is_active=random.choice([True, True, True, False]),  # 75% active
                is_verified=random.choice([True, True, False]),  # 66% verified
                created_at=fake.date_time_between(start_date="-90d", end_date="now"),
            )
            users.append(user)

        self.session.add_all(users)
        self.session.commit()

        logger.info(f"Created {len(users)} test users")
        return users

    def create_test_locations(self, count: int = 5) -> List[Location]:
        """Create test locations"""
        logger.info(f"Creating {count} test locations...")

        locations = []
        business_types = ["Barbershop", "Salon", "Spa", "Grooming Lounge"]

        for i in range(count):
            location = Location(
                id=str(uuid.uuid4()),
                name=f"{fake.company()} {random.choice(business_types)}",
                address=fake.street_address(),
                city=fake.city(),
                state=fake.state_abbr(),
                zip_code=fake.zipcode(),
                phone=fake.phone_number(),
                email=f"location-{i+1}@staging.6fbplatform.com",
                is_active=random.choice([True, True, True, False]),  # 75% active
                business_hours={
                    "monday": {"open": "09:00", "close": "18:00"},
                    "tuesday": {"open": "09:00", "close": "18:00"},
                    "wednesday": {"open": "09:00", "close": "18:00"},
                    "thursday": {"open": "09:00", "close": "19:00"},
                    "friday": {"open": "09:00", "close": "19:00"},
                    "saturday": {"open": "08:00", "close": "16:00"},
                    "sunday": {"open": "10:00", "close": "15:00"},
                },
                created_at=fake.date_time_between(start_date="-180d", end_date="now"),
            )
            locations.append(location)

        self.session.add_all(locations)
        self.session.commit()

        logger.info(f"Created {len(locations)} test locations")
        return locations

    def create_test_barbers(
        self, users: List[User], locations: List[Location], count: int = 10
    ) -> List[Barber]:
        """Create test barbers"""
        logger.info(f"Creating {count} test barbers...")

        barbers = []
        barber_users = [u for u in users if u.role in ["barber", "admin"]]

        specialties = [
            "Classic Cuts",
            "Beard Styling",
            "Fade Specialist",
            "Hot Towel Shaves",
            "Hair Washing",
            "Mustache Grooming",
            "Scalp Treatments",
            "Kids Cuts",
        ]

        for i in range(min(count, len(barber_users))):
            user = barber_users[i]
            location = random.choice(locations)

            barber = Barber(
                id=str(uuid.uuid4()),
                user_id=user.id,
                location_id=location.id,
                specialties=random.sample(specialties, random.randint(2, 4)),
                years_experience=random.randint(1, 15),
                hourly_rate=Decimal(str(random.uniform(25.0, 75.0))),
                commission_rate=Decimal(str(random.uniform(0.4, 0.6))),
                is_active=random.choice([True, True, True, False]),  # 75% active
                bio=fake.text(max_nb_chars=200),
                created_at=fake.date_time_between(start_date="-120d", end_date="now"),
            )
            barbers.append(barber)

        self.session.add_all(barbers)
        self.session.commit()

        logger.info(f"Created {len(barbers)} test barbers")
        return barbers

    def create_test_clients(self, users: List[User], count: int = 50) -> List[Client]:
        """Create test clients"""
        logger.info(f"Creating {count} test clients...")

        clients = []
        client_users = [u for u in users if u.role == "client"]

        # Create additional client users if needed
        while len(client_users) < count:
            user = User(
                id=str(uuid.uuid4()),
                email=f"test-client-{len(client_users)+1}@staging.6fbplatform.com",
                name=fake.name(),
                phone=fake.phone_number(),
                role="client",
                is_active=True,
                is_verified=True,
                created_at=fake.date_time_between(start_date="-60d", end_date="now"),
            )
            self.session.add(user)
            client_users.append(user)

        self.session.commit()

        for i, user in enumerate(client_users[:count]):
            client = Client(
                id=str(uuid.uuid4()),
                user_id=user.id,
                preferred_barber_id=None,  # Will be set later
                notes=(
                    fake.text(max_nb_chars=150)
                    if random.choice([True, False])
                    else None
                ),
                created_at=fake.date_time_between(start_date="-60d", end_date="now"),
            )
            clients.append(client)

        self.session.add_all(clients)
        self.session.commit()

        logger.info(f"Created {len(clients)} test clients")
        return clients

    def create_test_appointments(
        self,
        clients: List[Client],
        barbers: List[Barber],
        locations: List[Location],
        count: int = 200,
    ) -> List[Appointment]:
        """Create test appointments"""
        logger.info(f"Creating {count} test appointments...")

        appointments = []
        services = [
            {"name": "Classic Haircut", "price": 35.00, "duration": 60},
            {"name": "Beard Trim", "price": 20.00, "duration": 30},
            {"name": "Full Service", "price": 55.00, "duration": 90},
            {"name": "Hot Towel Shave", "price": 25.00, "duration": 45},
            {"name": "Kids Cut", "price": 25.00, "duration": 30},
            {"name": "Wash & Style", "price": 30.00, "duration": 45},
            {"name": "Mustache Trim", "price": 15.00, "duration": 20},
        ]

        statuses = ["scheduled", "completed", "cancelled", "no_show"]
        status_weights = [0.3, 0.5, 0.15, 0.05]  # Most are completed or scheduled

        for i in range(count):
            client = random.choice(clients)
            barber = random.choice(barbers)
            service = random.choice(services)

            # Create appointments spanning last 6 months to next month
            start_time = fake.date_time_between(start_date="-180d", end_date="+30d")
            end_time = start_time + timedelta(minutes=service["duration"])

            status = random.choices(statuses, weights=status_weights)[0]

            appointment = Appointment(
                id=str(uuid.uuid4()),
                client_id=client.id,
                barber_id=barber.id,
                location_id=barber.location_id,
                service_name=service["name"],
                start_time=start_time,
                end_time=end_time,
                status=status,
                price=Decimal(str(service["price"])),
                notes=(
                    fake.text(max_nb_chars=100)
                    if random.choice([True, False])
                    else None
                ),
                created_at=fake.date_time_between(
                    start_date=start_time - timedelta(days=30), end_date=start_time
                ),
            )
            appointments.append(appointment)

        self.session.add_all(appointments)
        self.session.commit()

        logger.info(f"Created {len(appointments)} test appointments")
        return appointments

    def create_test_payments(
        self, appointments: List[Appointment], count: int = 150
    ) -> List[Payment]:
        """Create test payments for completed appointments"""
        logger.info(f"Creating test payments...")

        payments = []
        completed_appointments = [a for a in appointments if a.status == "completed"]

        payment_methods = ["stripe", "cash", "card"]
        payment_statuses = ["completed", "pending", "failed", "refunded"]
        status_weights = [0.8, 0.1, 0.05, 0.05]

        for appointment in completed_appointments[:count]:
            if random.choice(
                [True, True, False]
            ):  # 66% of completed appointments have payments
                payment_method = random.choice(payment_methods)
                status = random.choices(payment_statuses, weights=status_weights)[0]

                payment = Payment(
                    id=str(uuid.uuid4()),
                    appointment_id=appointment.id,
                    amount=appointment.price,
                    payment_method=payment_method,
                    status=status,
                    stripe_payment_intent_id=(
                        f"pi_test_{fake.random_int(min=100000, max=999999)}"
                        if payment_method == "stripe"
                        else None
                    ),
                    created_at=appointment.end_time
                    + timedelta(minutes=random.randint(1, 30)),
                )
                payments.append(payment)

        self.session.add_all(payments)
        self.session.commit()

        logger.info(f"Created {len(payments)} test payments")
        return payments

    def create_test_notifications(
        self, users: List[User], appointments: List[Appointment], count: int = 100
    ) -> List[Notification]:
        """Create test notifications"""
        logger.info(f"Creating test notifications...")

        notifications = []
        notification_types = [
            "appointment_reminder",
            "appointment_confirmation",
            "appointment_cancellation",
            "payment_confirmation",
            "system_announcement",
        ]

        for i in range(count):
            user = random.choice(users)
            notification_type = random.choice(notification_types)
            appointment = (
                random.choice(appointments)
                if notification_type.startswith("appointment")
                else None
            )

            notification = Notification(
                id=str(uuid.uuid4()),
                user_id=user.id,
                appointment_id=appointment.id if appointment else None,
                type=notification_type,
                title=f"Test {notification_type.replace('_', ' ').title()}",
                message=fake.text(max_nb_chars=200),
                is_read=random.choice([True, False]),
                sent_at=fake.date_time_between(start_date="-30d", end_date="now"),
                created_at=fake.date_time_between(start_date="-30d", end_date="now"),
            )
            notifications.append(notification)

        self.session.add_all(notifications)
        self.session.commit()

        logger.info(f"Created {len(notifications)} test notifications")
        return notifications

    def create_test_analytics(
        self, locations: List[Location], count: int = 300
    ) -> List[Analytics]:
        """Create test analytics data"""
        logger.info(f"Creating test analytics data...")

        analytics = []
        metrics = [
            "daily_revenue",
            "appointment_count",
            "client_count",
            "cancellation_rate",
            "average_service_time",
            "barber_utilization",
        ]

        for i in range(count):
            location = random.choice(locations)
            metric = random.choice(metrics)
            date = fake.date_between(start_date="-90d", end_date="now")

            # Generate realistic values based on metric type
            if metric == "daily_revenue":
                value = random.uniform(200.0, 2000.0)
            elif metric == "appointment_count":
                value = random.randint(5, 50)
            elif metric == "client_count":
                value = random.randint(3, 45)
            elif metric == "cancellation_rate":
                value = random.uniform(0.05, 0.25)
            elif metric == "average_service_time":
                value = random.uniform(30.0, 120.0)
            elif metric == "barber_utilization":
                value = random.uniform(0.4, 0.95)
            else:
                value = random.uniform(1.0, 100.0)

            analytic = Analytics(
                id=str(uuid.uuid4()),
                location_id=location.id,
                metric_name=metric,
                metric_value=Decimal(str(round(value, 2))),
                date=date,
                created_at=fake.date_time_between(start_date=date, end_date="now"),
            )
            analytics.append(analytic)

        self.session.add_all(analytics)
        self.session.commit()

        logger.info(f"Created {len(analytics)} test analytics records")
        return analytics

    def update_relationships(self, clients: List[Client], barbers: List[Barber]):
        """Update relationships between entities"""
        logger.info("Updating entity relationships...")

        # Assign preferred barbers to some clients
        for client in random.sample(
            clients, len(clients) // 3
        ):  # 33% of clients have preferred barbers
            client.preferred_barber_id = random.choice(barbers).id

        self.session.commit()
        logger.info("Entity relationships updated")

    def seed_all_data(
        self,
        user_count: int = 25,
        location_count: int = 5,
        appointment_count: int = 200,
    ):
        """Seed all test data"""
        logger.info("Starting staging data seeding process...")

        try:
            # Clear existing data
            self.clear_existing_data()

            # Create entities in dependency order
            users = self.create_test_users(user_count)
            locations = self.create_test_locations(location_count)
            barbers = self.create_test_barbers(users, locations, 10)
            clients = self.create_test_clients(users, 50)
            appointments = self.create_test_appointments(
                clients, barbers, locations, appointment_count
            )
            payments = self.create_test_payments(appointments, 150)
            notifications = self.create_test_notifications(users, appointments, 100)
            analytics = self.create_test_analytics(locations, 300)

            # Update relationships
            self.update_relationships(clients, barbers)

            logger.info("Staging data seeding completed successfully!")
            logger.info(
                f"Created: {len(users)} users, {len(locations)} locations, "
                f"{len(barbers)} barbers, {len(clients)} clients, "
                f"{len(appointments)} appointments, {len(payments)} payments, "
                f"{len(notifications)} notifications, {len(analytics)} analytics"
            )

        except Exception as e:
            logger.error(f"Error seeding data: {e}")
            self.session.rollback()
            raise


def main():
    """Main entry point"""
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)

    # Check if we're in staging environment
    environment = os.getenv("ENVIRONMENT", "").lower()
    if environment != "staging":
        logger.warning(f"Current environment is '{environment}', not 'staging'")
        response = input("Continue with data seeding? (y/N): ")
        if response.lower() != "y":
            logger.info("Data seeding cancelled")
            sys.exit(0)

    # Seed staging data
    try:
        with StagingDataSeeder(database_url) as seeder:
            seeder.seed_all_data()

        logger.info("Staging data seeding process completed successfully!")

    except Exception as e:
        logger.error(f"Failed to seed staging data: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
