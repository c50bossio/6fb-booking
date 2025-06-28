#!/usr/bin/env python3
"""Quick insert test data for dashboard"""
import os

os.environ["DATABASE_URL"] = (
    "postgresql://sixfb_backend_user:8dqe29qP09dmHnOLJcF3pbw6M3GwAV6L@dpg-d19lc6h5pdvs739sq850-a.oregon-postgres.render.com/sixfb_backend"
)

from sqlalchemy import create_engine, text
from datetime import datetime, date
import sys

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        # Quick insert appointment for today
        result = conn.execute(
            text(
                """
            INSERT INTO appointments (
                trafft_appointment_id, location_id, barber_id, client_id,
                appointment_date, appointment_time, end_time,
                service_name, service_duration, service_revenue,
                status, trafft_status, trafft_location_name,
                created_at, updated_at
            ) VALUES (
                'QUICKTEST123', 1, 1, 1,
                CURRENT_DATE, '14:30:00', '15:00:00',
                'Haircut Only', 30, 30.00,
                'confirmed', 'Approved', 'Headlines Barbershop',
                NOW(), NOW()
            )
            ON CONFLICT (trafft_appointment_id) DO NOTHING
            RETURNING id
        """
            )
        )

        if result.rowcount > 0:
            print("✅ Test appointment inserted!")
        else:
            print("⚠️ Appointment already exists")

        conn.commit()

        # Check count
        count_result = conn.execute(
            text(
                "SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE"
            )
        )
        count = count_result.scalar()
        print(f"📊 Total appointments today: {count}")

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
