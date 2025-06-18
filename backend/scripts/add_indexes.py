#!/usr/bin/env python3
"""
Add database indexes for performance optimization
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from config.settings import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create engine
engine = create_engine(settings.DATABASE_URL)

# Index definitions
INDEXES = [
    # User indexes
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
    "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);",
    "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);",
    "CREATE INDEX IF NOT EXISTS idx_users_primary_location_id ON users(primary_location_id);",
    
    # Appointment indexes
    "CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);",
    "CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);",
    "CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);",
    "CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON appointments(appointment_date);",
    "CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, appointment_date);",
    "CREATE INDEX IF NOT EXISTS idx_appointments_barber_status ON appointments(barber_id, status);",
    
    # Barber indexes
    "CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON barbers(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_barbers_location_id ON barbers(location_id);",
    "CREATE INDEX IF NOT EXISTS idx_barbers_is_active ON barbers(is_active);",
    
    # Client indexes
    "CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);",
    "CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);",
    "CREATE INDEX IF NOT EXISTS idx_clients_barber_id ON clients(barber_id);",
    "CREATE INDEX IF NOT EXISTS idx_clients_location_id ON clients(location_id);",
    
    # Location indexes
    "CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);",
    "CREATE INDEX IF NOT EXISTS idx_locations_mentor_id ON locations(mentor_id);",
    
    # Analytics indexes
    "CREATE INDEX IF NOT EXISTS idx_daily_metrics_barber_id ON daily_metrics(barber_id);",
    "CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);",
    "CREATE INDEX IF NOT EXISTS idx_daily_metrics_barber_date ON daily_metrics(barber_id, date);",
    
    "CREATE INDEX IF NOT EXISTS idx_weekly_metrics_barber_id ON weekly_metrics(barber_id);",
    "CREATE INDEX IF NOT EXISTS idx_weekly_metrics_week_start ON weekly_metrics(week_start_date);",
    "CREATE INDEX IF NOT EXISTS idx_weekly_metrics_barber_week ON weekly_metrics(barber_id, week_start_date);",
    
    "CREATE INDEX IF NOT EXISTS idx_monthly_metrics_barber_id ON monthly_metrics(barber_id);",
    "CREATE INDEX IF NOT EXISTS idx_monthly_metrics_month ON monthly_metrics(month, year);",
    "CREATE INDEX IF NOT EXISTS idx_monthly_metrics_barber_month ON monthly_metrics(barber_id, month, year);",
    
    "CREATE INDEX IF NOT EXISTS idx_sixfb_scores_barber_id ON sixfb_scores(barber_id);",
    "CREATE INDEX IF NOT EXISTS idx_sixfb_scores_calculated_at ON sixfb_scores(calculated_at);",
    
    # Training indexes
    "CREATE INDEX IF NOT EXISTS idx_training_enrollments_user_id ON training_enrollments(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_training_enrollments_module_id ON training_enrollments(module_id);",
    "CREATE INDEX IF NOT EXISTS idx_training_enrollments_status ON training_enrollments(status);",
    
    "CREATE INDEX IF NOT EXISTS idx_training_attempts_enrollment_id ON training_attempts(enrollment_id);",
    "CREATE INDEX IF NOT EXISTS idx_training_attempts_user_id ON training_attempts(user_id);",
    
    # User session tracking
    "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);",
    "CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);",
    
    "CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp);",
]


def add_indexes():
    """Add all indexes to the database"""
    logger.info("Starting index creation...")
    
    with engine.connect() as conn:
        for index_sql in INDEXES:
            try:
                conn.execute(text(index_sql))
                conn.commit()
                logger.info(f"Created index: {index_sql.split('idx_')[1].split(' ')[0]}")
            except Exception as e:
                logger.error(f"Failed to create index: {e}")
                logger.error(f"SQL: {index_sql}")
    
    logger.info("Index creation completed!")


def analyze_tables():
    """Run ANALYZE on all tables to update statistics"""
    logger.info("Analyzing tables...")
    
    tables = [
        "users", "appointments", "barbers", "clients", "locations",
        "daily_metrics", "weekly_metrics", "monthly_metrics", "sixfb_scores",
        "training_modules", "training_enrollments", "training_attempts",
        "user_sessions", "user_activities"
    ]
    
    with engine.connect() as conn:
        for table in tables:
            try:
                conn.execute(text(f"ANALYZE {table};"))
                conn.commit()
                logger.info(f"Analyzed table: {table}")
            except Exception as e:
                logger.warning(f"Failed to analyze table {table}: {e}")
    
    logger.info("Table analysis completed!")


if __name__ == "__main__":
    add_indexes()
    analyze_tables()