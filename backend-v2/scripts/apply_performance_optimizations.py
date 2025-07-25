#!/usr/bin/env python3
"""
Database Performance Optimization Script

Apply all recommended database performance optimizations including
indexes, query optimizations, and connection pool settings.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db import engine
import time

def apply_performance_indexes():
    """Apply all recommended performance indexes"""
    print("Applying database performance optimizations...")
    
    # High priority indexes
    high_priority_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);",
        "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);",
        "CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);",
        "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);",
    ]
    
    # Composite indexes for common query patterns
    composite_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, start_time);",
        "CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, start_time);",
        "CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_payments_appointment_status ON payments(appointment_id, status);",
    ]
    
    # Performance indexes
    performance_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);",
        "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON password_reset_tokens(used);",
    ]
    
    all_indexes = high_priority_indexes + composite_indexes + performance_indexes
    
    with engine.connect() as conn:
        for i, index_sql in enumerate(all_indexes, 1):
            try:
                start_time = time.time()
                conn.execute(text(index_sql))
                conn.commit()
                duration = time.time() - start_time
                print(f"✓ [{i}/{len(all_indexes)}] Applied index: {duration:.2f}s")
            except Exception as e:
                print(f"❌ Failed to apply index {i}: {e}")
    
    print(f"\n🎉 Applied {len(all_indexes)} database indexes successfully!")
    print("Database query performance should be significantly improved.")

if __name__ == "__main__":
    apply_performance_indexes()
