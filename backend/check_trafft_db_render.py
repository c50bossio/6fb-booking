#!/usr/bin/env python3
"""
Check Trafft data in database - Run this in Render Shell
"""
from sqlalchemy import create_engine, text
import os
from datetime import datetime

# Get database URL
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print("🔍 Checking Trafft Integration Data")
print("=" * 50)

try:
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # 1. Count Trafft appointments
        result = conn.execute(text("""
            SELECT COUNT(*) as count 
            FROM appointments 
            WHERE trafft_appointment_id IS NOT NULL
        """))
        trafft_count = result.scalar()
        print(f"\n✅ Total Trafft Appointments: {trafft_count}")
        
        # 2. Recent appointments
        print("\n📅 Recent Trafft Appointments:")
        result = conn.execute(text("""
            SELECT 
                trafft_appointment_id,
                appointment_date,
                service_name,
                service_revenue,
                status,
                trafft_sync_status,
                created_at
            FROM appointments 
            WHERE trafft_appointment_id IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 5
        """))
        
        for row in result:
            print(f"\n  ID: {row.trafft_appointment_id}")
            print(f"  Date: {row.appointment_date}")
            print(f"  Service: {row.service_name} (${row.service_revenue})")
            print(f"  Status: {row.status} | Sync: {row.trafft_sync_status}")
            print(f"  Created: {row.created_at}")
        
        # 3. Check barbers
        print("\n👨‍💈 Barbers from Trafft:")
        result = conn.execute(text("""
            SELECT 
                first_name,
                last_name,
                email,
                trafft_employee_email
            FROM barbers
            WHERE trafft_employee_email IS NOT NULL
        """))
        
        for row in result:
            print(f"  - {row.first_name} {row.last_name} ({row.trafft_employee_email})")
        
        # 4. Recent clients
        print("\n👥 Recent Clients:")
        result = conn.execute(text("""
            SELECT 
                first_name,
                last_name,
                email,
                created_at
            FROM clients
            ORDER BY created_at DESC
            LIMIT 5
        """))
        
        for row in result:
            print(f"  - {row.first_name} {row.last_name} ({row.email}) - Created: {row.created_at}")
        
        # 5. Summary
        print("\n📊 Summary Statistics:")
        result = conn.execute(text("""
            SELECT 
                COUNT(DISTINCT a.id) as appointments,
                COUNT(DISTINCT a.barber_id) as barbers,
                COUNT(DISTINCT a.client_id) as clients
            FROM appointments a
            WHERE a.trafft_appointment_id IS NOT NULL
        """))
        
        row = result.fetchone()
        print(f"  Trafft Appointments: {row.appointments}")
        print(f"  Unique Barbers: {row.barbers}")
        print(f"  Unique Clients: {row.clients}")
        
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    print("\nMake sure to run this in Render Shell with DATABASE_URL set")

print("\n" + "=" * 50)
print("✅ Check complete!")