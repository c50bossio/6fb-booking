#!/usr/bin/env python3
"""
Check current appointments in database
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

from config.database import SessionLocal
from models.appointment import Appointment
from models.client import Client
from models.barber import Barber


def check_appointments():
    """Check current appointments in database"""
    print("🔍 Checking current appointments...")

    db = SessionLocal()

    try:
        # Get all appointments
        appointments = db.query(Appointment).all()
        print(f"📊 Total appointments in database: {len(appointments)}")

        if appointments:
            print("\n📋 Recent appointments:")
            for apt in appointments[-5:]:  # Last 5
                print(
                    f"  • ID {apt.id}: {apt.client_name if hasattr(apt, 'client_name') else 'Unknown'} - {apt.start_time}"
                )
                if hasattr(apt, "trafft_appointment_id") and apt.trafft_appointment_id:
                    print(f"    🔗 Trafft ID: {apt.trafft_appointment_id}")

        # Check for Trafft appointments specifically
        trafft_appointments = (
            db.query(Appointment)
            .filter(Appointment.trafft_appointment_id.isnot(None))
            .all()
        )
        print(f"🎯 Trafft synced appointments: {len(trafft_appointments)}")

        # Check clients and barbers
        clients = db.query(Client).all()
        barbers = db.query(Barber).all()
        print(f"👥 Total clients: {len(clients)}")
        print(f"✂️ Total barbers: {len(barbers)}")

    except Exception as e:
        print(f"❌ Database error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    check_appointments()
