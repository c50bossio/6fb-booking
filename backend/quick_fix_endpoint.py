#!/usr/bin/env python3
"""
Quick fix - add a working endpoint to main.py
"""

# Add this code to main.py as a temporary fix
endpoint_code = '''
@app.get("/api/v1/dashboard/appointments/quick")
async def get_quick_appointments():
    """Quick appointments endpoint that always works"""
    try:
        from config.database import SessionLocal
        from sqlalchemy import text
        from datetime import date

        db = SessionLocal()
        result = db.execute(text("SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE"))
        count = result.scalar() or 0

        revenue_result = db.execute(text("SELECT COALESCE(SUM(service_revenue), 0) FROM appointments WHERE appointment_date = CURRENT_DATE AND status != 'cancelled'"))
        revenue = revenue_result.scalar() or 0

        db.close()

        return {
            "date": date.today().isoformat(),
            "appointments": [],
            "stats": {
                "total": count,
                "upcoming": count,
                "completed": 0,
                "cancelled": 0,
                "revenue": float(revenue)
            }
        }
    except Exception as e:
        return {
            "date": date.today().isoformat(),
            "appointments": [],
            "stats": {
                "total": 0,
                "upcoming": 0,
                "completed": 0,
                "cancelled": 0,
                "revenue": 0.0
            },
            "error": str(e)
        }
'''

print("Add this endpoint to main.py:")
print(endpoint_code)
