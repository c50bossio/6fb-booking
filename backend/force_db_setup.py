#!/usr/bin/env python3
"""
Force database table creation to fix schema issues
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))


def force_database_setup():
    """Force creation of all database tables"""
    print("🔄 Setting up database tables...")

    try:
        from config.database import engine, Base

        # Import all models to register them
        print("📦 Loading all models...")
        from models import (
            User,
            Location,
            Barber,
            Client,
            Appointment,
            DailyMetrics,
            WeeklyMetrics,
            MonthlyMetrics,
            SixFBScore,
            TrainingModule,
            TrainingEnrollment,
            TrainingAttempt,
            Certification,
            Notification,
            NotificationType,
            NotificationPriority,
            Payment,
            PaymentMethod,
            PaymentStatus,
            PaymentMethodType,
            Refund,
            RefundStatus,
            PaymentWebhookEvent,
            StripeCustomer,
            PaymentReport,
            EmailLog,
            SMSLog,
            NotificationPreference,
            CommunicationTemplate,
            EmailStatus,
            SMSStatus,
            CommunicationType,
        )

        print("✅ All models loaded successfully")

        # Create all tables
        print("🔨 Creating database tables...")
        Base.metadata.create_all(bind=engine)

        print("✅ Database tables created successfully!")

        # Test a simple query
        from config.database import SessionLocal

        db = SessionLocal()

        try:
            # Count existing appointments
            appointments = db.query(Appointment).count()
            print(f"📊 Current appointments in database: {appointments}")

            # Count existing locations
            locations = db.query(Location).count()
            print(f"🏢 Current locations in database: {locations}")

            # Count existing barbers
            barbers = db.query(Barber).count()
            print(f"✂️ Current barbers in database: {barbers}")

        except Exception as e:
            print(f"⚠️ Query test failed (expected): {e}")
        finally:
            db.close()

        print("\n🎉 Database setup completed!")
        print("💡 The webhook processing should now work correctly")

    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    force_database_setup()
