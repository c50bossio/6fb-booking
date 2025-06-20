#!/usr/bin/env python3
"""Direct insert into production database"""
import psycopg2
from datetime import date

# Direct connection
conn = psycopg2.connect(
    "postgresql://sixfb_backend_user:8dqe29qP09dmHnOLJcF3pbw6M3GwAV6L@dpg-d19lc6h5pdvs739sq850-a.oregon-postgres.render.com/sixfb_backend"
)

try:
    cur = conn.cursor()
    
    # Insert minimal test appointment
    cur.execute("""
        INSERT INTO appointments (
            trafft_appointment_id, 
            appointment_date, 
            appointment_time,
            service_name, 
            service_revenue, 
            status,
            created_at,
            updated_at
        ) VALUES (
            'DIRECT_TEST_' || extract(epoch from now())::text,
            CURRENT_DATE,
            '14:30:00',
            'Test Haircut',
            30.00,
            'confirmed',
            NOW(),
            NOW()
        )
        ON CONFLICT (trafft_appointment_id) DO NOTHING
    """)
    
    conn.commit()
    
    # Check count
    cur.execute("SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE")
    count = cur.fetchone()[0]
    print(f"✅ Success! Total appointments today: {count}")
    
except Exception as e:
    print(f"❌ Error: {e}")
finally:
    conn.close()