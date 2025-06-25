"""
Database migration to add payout scheduler tables
Run this script to create the necessary tables for the payout scheduler service
"""

from sqlalchemy import create_engine, text
from config.settings import Settings

settings = Settings()


def create_payout_scheduler_tables():
    """Create tables for payout scheduler if they don't exist"""

    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # Create payout_schedules table
        conn.execute(
            text(
                """
            CREATE TABLE IF NOT EXISTS payout_schedules (
                id SERIAL PRIMARY KEY,
                barber_id INTEGER NOT NULL REFERENCES barbers(id),
                frequency VARCHAR(20) NOT NULL DEFAULT 'weekly',
                day_of_week INTEGER,
                day_of_month INTEGER,
                custom_interval_days INTEGER,
                minimum_payout_amount DECIMAL(10,2) DEFAULT 25.00,
                auto_payout_enabled BOOLEAN DEFAULT TRUE,
                email_notifications BOOLEAN DEFAULT TRUE,
                sms_notifications BOOLEAN DEFAULT FALSE,
                advance_notice_days INTEGER DEFAULT 1,
                preferred_payment_method VARCHAR(50) DEFAULT 'stripe',
                backup_payment_method VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                last_payout_date TIMESTAMP,
                next_payout_date TIMESTAMP,
                total_payouts_sent INTEGER DEFAULT 0,
                total_amount_paid DECIMAL(12,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """
            )
        )

        # Create scheduled_payouts table
        conn.execute(
            text(
                """
            CREATE TABLE IF NOT EXISTS scheduled_payouts (
                id SERIAL PRIMARY KEY,
                schedule_id INTEGER NOT NULL REFERENCES payout_schedules(id),
                barber_id INTEGER NOT NULL REFERENCES barbers(id),
                payout_type VARCHAR(50) NOT NULL DEFAULT 'commission',
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                period_start TIMESTAMP NOT NULL,
                period_end TIMESTAMP NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                scheduled_date TIMESTAMP NOT NULL,
                processed_date TIMESTAMP,
                payment_method VARCHAR(50),
                platform_payout_id VARCHAR(255),
                platform_transfer_id VARCHAR(255),
                platform_fee DECIMAL(8,2) DEFAULT 0.00,
                net_amount DECIMAL(10,2),
                failure_reason TEXT,
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                next_retry_date TIMESTAMP,
                notification_sent BOOLEAN DEFAULT FALSE,
                notification_sent_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """
            )
        )

        # Create payout_earnings table
        conn.execute(
            text(
                """
            CREATE TABLE IF NOT EXISTS payout_earnings (
                id SERIAL PRIMARY KEY,
                scheduled_payout_id INTEGER NOT NULL REFERENCES scheduled_payouts(id),
                appointment_id INTEGER REFERENCES appointments(id),
                payment_id INTEGER REFERENCES payments(id),
                earning_type VARCHAR(50),
                gross_amount DECIMAL(10,2) NOT NULL,
                commission_rate DECIMAL(5,4),
                commission_amount DECIMAL(10,2) NOT NULL,
                earned_date TIMESTAMP NOT NULL,
                service_name VARCHAR(200),
                customer_name VARCHAR(200),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """
            )
        )

        # Create payout_notifications table
        conn.execute(
            text(
                """
            CREATE TABLE IF NOT EXISTS payout_notifications (
                id SERIAL PRIMARY KEY,
                scheduled_payout_id INTEGER NOT NULL REFERENCES scheduled_payouts(id),
                barber_id INTEGER NOT NULL REFERENCES barbers(id),
                notification_type VARCHAR(50),
                channel VARCHAR(20),
                recipient VARCHAR(255),
                subject VARCHAR(255),
                message TEXT,
                template_used VARCHAR(100),
                sent_at TIMESTAMP,
                delivery_status VARCHAR(20),
                delivery_error TEXT,
                opened_at TIMESTAMP,
                clicked_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """
            )
        )

        # Create indexes for performance
        conn.execute(
            text(
                """
            CREATE INDEX IF NOT EXISTS idx_payout_schedules_barber_id ON payout_schedules(barber_id);
            CREATE INDEX IF NOT EXISTS idx_payout_schedules_active ON payout_schedules(is_active);
            CREATE INDEX IF NOT EXISTS idx_payout_schedules_next_date ON payout_schedules(next_payout_date);

            CREATE INDEX IF NOT EXISTS idx_scheduled_payouts_schedule_id ON scheduled_payouts(schedule_id);
            CREATE INDEX IF NOT EXISTS idx_scheduled_payouts_barber_id ON scheduled_payouts(barber_id);
            CREATE INDEX IF NOT EXISTS idx_scheduled_payouts_status ON scheduled_payouts(status);
            CREATE INDEX IF NOT EXISTS idx_scheduled_payouts_scheduled_date ON scheduled_payouts(scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_scheduled_payouts_retry ON scheduled_payouts(status, retry_count, next_retry_date);

            CREATE INDEX IF NOT EXISTS idx_payout_earnings_payout_id ON payout_earnings(scheduled_payout_id);
            CREATE INDEX IF NOT EXISTS idx_payout_earnings_appointment_id ON payout_earnings(appointment_id);
            CREATE INDEX IF NOT EXISTS idx_payout_earnings_payment_id ON payout_earnings(payment_id);

            CREATE INDEX IF NOT EXISTS idx_payout_notifications_payout_id ON payout_notifications(scheduled_payout_id);
            CREATE INDEX IF NOT EXISTS idx_payout_notifications_barber_id ON payout_notifications(barber_id);
        """
            )
        )

        # Add trigger to update updated_at timestamp
        conn.execute(
            text(
                """
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_payout_schedules_updated_at ON payout_schedules;
            CREATE TRIGGER update_payout_schedules_updated_at BEFORE UPDATE ON payout_schedules
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS update_scheduled_payouts_updated_at ON scheduled_payouts;
            CREATE TRIGGER update_scheduled_payouts_updated_at BEFORE UPDATE ON scheduled_payouts
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
            )
        )

        conn.commit()

    print("✅ Payout scheduler tables created successfully!")
    print("Tables created:")
    print("  - payout_schedules")
    print("  - scheduled_payouts")
    print("  - payout_earnings")
    print("  - payout_notifications")
    print("\nIndexes and triggers also created for optimal performance.")


if __name__ == "__main__":
    try:
        create_payout_scheduler_tables()
    except Exception as e:
        print(f"❌ Error creating tables: {str(e)}")
        print("Make sure the database is running and accessible.")
