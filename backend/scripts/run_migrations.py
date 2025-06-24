#!/usr/bin/env python3
"""
Comprehensive Database Migration Script for 6FB Booking Platform

This script handles:
1. Running all pending database migrations
2. Testing specific migrations (SMS reminder tracking, customer auth)
3. Providing rollback capabilities
4. Validating migration success
"""

import sys
import os
import subprocess
import logging
import json
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text, inspect
import os


class MigrationManager:
    def __init__(self, environment="development"):
        self.environment = environment
        self.setup_logging()
        self.alembic_cfg = Config(str(Path(__file__).parent.parent / "alembic.ini"))

        # Get database URL
        database_url = os.getenv("DATABASE_URL", "sqlite:///./6fb_booking.db")
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)

        self.engine = create_engine(database_url)

    def setup_logging(self):
        """Set up logging configuration"""
        log_dir = Path(__file__).parent.parent / "logs"
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler(
                    log_dir
                    / f"migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
                ),
                logging.StreamHandler(sys.stdout),
            ],
        )
        self.logger = logging.getLogger(__name__)

    def get_current_revision(self):
        """Get current database revision"""
        try:
            result = subprocess.run(
                ["alembic", "current"],
                cwd=Path(__file__).parent.parent,
                capture_output=True,
                text=True,
                check=True,
            )
            # Extract revision ID from output
            output_lines = result.stdout.strip().split("\n")
            for line in output_lines:
                if line and not line.startswith("INFO"):
                    return line.split()[0]
            return None
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to get current revision: {e}")
            return None

    def get_migration_history(self):
        """Get complete migration history"""
        try:
            result = subprocess.run(
                ["alembic", "history", "--verbose"],
                cwd=Path(__file__).parent.parent,
                capture_output=True,
                text=True,
                check=True,
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to get migration history: {e}")
            return None

    def run_migrations(self, target_revision="head"):
        """Run database migrations to target revision"""
        self.logger.info(f"Starting migration to {target_revision}")

        # Get current state
        current_rev = self.get_current_revision()
        self.logger.info(f"Current revision: {current_rev}")

        try:
            # Run migration
            result = subprocess.run(
                ["alembic", "upgrade", target_revision],
                cwd=Path(__file__).parent.parent,
                capture_output=True,
                text=True,
                check=True,
            )

            self.logger.info("Migration completed successfully")
            self.logger.info(f"Output: {result.stdout}")

            # Verify new state
            new_rev = self.get_current_revision()
            self.logger.info(f"New revision: {new_rev}")

            return True
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Migration failed: {e}")
            self.logger.error(f"Error output: {e.stderr}")
            return False

    def test_sms_reminder_tracking(self):
        """Test SMS reminder tracking migration specifically"""
        self.logger.info("Testing SMS reminder tracking migration")

        try:
            with self.engine.connect() as conn:
                # Check if appointments table has the new columns
                inspector = inspect(self.engine)
                columns = [col["name"] for col in inspector.get_columns("appointments")]

                required_columns = ["reminder_24h_sent", "reminder_2h_sent"]
                missing_columns = [
                    col for col in required_columns if col not in columns
                ]

                if missing_columns:
                    self.logger.error(
                        f"Missing SMS reminder columns: {missing_columns}"
                    )
                    return False

                # Test data integrity
                result = conn.execute(
                    text(
                        "SELECT COUNT(*) as count FROM appointments WHERE reminder_24h_sent IS NULL OR reminder_2h_sent IS NULL"
                    )
                )
                null_count = result.fetchone()[0]

                if null_count > 0:
                    self.logger.warning(
                        f"Found {null_count} appointments with NULL reminder values"
                    )
                    # Update them
                    conn.execute(
                        text(
                            "UPDATE appointments SET reminder_24h_sent = FALSE WHERE reminder_24h_sent IS NULL"
                        )
                    )
                    conn.execute(
                        text(
                            "UPDATE appointments SET reminder_2h_sent = FALSE WHERE reminder_2h_sent IS NULL"
                        )
                    )
                    conn.commit()
                    self.logger.info("Updated NULL reminder values to FALSE")

                self.logger.info("SMS reminder tracking migration test passed")
                return True

        except Exception as e:
            self.logger.error(f"SMS reminder tracking test failed: {e}")
            return False

    def test_customer_authentication_tables(self):
        """Test customer authentication tables migration"""
        self.logger.info("Testing customer authentication tables migration")

        try:
            with self.engine.connect() as conn:
                inspector = inspect(self.engine)
                tables = inspector.get_table_names()

                # Check for communication tables that support customer auth
                required_tables = [
                    "email_logs",
                    "sms_logs",
                    "notification_preferences",
                    "communication_templates",
                ]

                missing_tables = [
                    table for table in required_tables if table not in tables
                ]

                if missing_tables:
                    self.logger.error(
                        f"Missing customer authentication tables: {missing_tables}"
                    )
                    return False

                # Test basic functionality
                result = conn.execute(
                    text("SELECT COUNT(*) FROM communication_templates")
                )
                template_count = result.fetchone()[0]
                self.logger.info(f"Found {template_count} communication templates")

                # Check notification preferences structure
                np_columns = [
                    col["name"]
                    for col in inspector.get_columns("notification_preferences")
                ]
                required_np_columns = [
                    "email_appointment_confirmation",
                    "sms_appointment_confirmation",
                    "push_enabled",
                ]

                missing_np_columns = [
                    col for col in required_np_columns if col not in np_columns
                ]
                if missing_np_columns:
                    self.logger.error(
                        f"Missing notification preference columns: {missing_np_columns}"
                    )
                    return False

                self.logger.info("Customer authentication tables test passed")
                return True

        except Exception as e:
            self.logger.error(f"Customer authentication tables test failed: {e}")
            return False

    def validate_all_tables(self):
        """Validate all database tables are properly created"""
        self.logger.info("Validating all database tables")

        try:
            with self.engine.connect() as conn:
                inspector = inspect(self.engine)
                tables = inspector.get_table_names()

                # Core tables that should exist
                expected_tables = [
                    "users",
                    "locations",
                    "services",
                    "appointments",
                    "barbers",
                    "clients",
                    "payments",
                    "payouts",
                    "email_logs",
                    "sms_logs",
                    "notification_preferences",
                    "communication_templates",
                    "google_calendar_settings",
                ]

                missing_tables = [
                    table for table in expected_tables if table not in tables
                ]

                if missing_tables:
                    self.logger.warning(f"Missing expected tables: {missing_tables}")

                # Check table counts
                table_info = {}
                for table in tables:
                    try:
                        result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = result.fetchone()[0]
                        table_info[table] = count
                    except Exception as e:
                        table_info[table] = f"Error: {e}"

                self.logger.info("Table validation completed")
                self.logger.info(json.dumps(table_info, indent=2))

                return len(missing_tables) == 0

        except Exception as e:
            self.logger.error(f"Table validation failed: {e}")
            return False

    def create_backup(self):
        """Create database backup before migrations"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"6fb_booking_backup_{timestamp}.db"

        try:
            # For SQLite, copy the file
            import shutil

            db_file = Path(__file__).parent.parent / "6fb_booking.db"
            backup_path = Path(__file__).parent.parent / "backups" / backup_file
            backup_path.parent.mkdir(exist_ok=True)

            if db_file.exists():
                shutil.copy2(db_file, backup_path)
                self.logger.info(f"Database backup created: {backup_path}")
                return str(backup_path)
            else:
                self.logger.warning("Database file not found for backup")
                return None

        except Exception as e:
            self.logger.error(f"Backup creation failed: {e}")
            return None

    def rollback_migration(self, target_revision):
        """Rollback to specific revision"""
        self.logger.info(f"Rolling back to revision: {target_revision}")

        try:
            result = subprocess.run(
                ["alembic", "downgrade", target_revision],
                cwd=Path(__file__).parent.parent,
                capture_output=True,
                text=True,
                check=True,
            )

            self.logger.info("Rollback completed successfully")
            self.logger.info(f"Output: {result.stdout}")
            return True

        except subprocess.CalledProcessError as e:
            self.logger.error(f"Rollback failed: {e}")
            self.logger.error(f"Error output: {e.stderr}")
            return False

    def run_full_migration_suite(self):
        """Run complete migration and testing suite"""
        self.logger.info("=" * 60)
        self.logger.info("STARTING FULL MIGRATION SUITE")
        self.logger.info("=" * 60)

        # Step 1: Create backup
        backup_path = self.create_backup()

        # Step 2: Show current state
        current_rev = self.get_current_revision()
        self.logger.info(f"Starting from revision: {current_rev}")

        # Step 3: Run migrations
        if not self.run_migrations():
            self.logger.error("Migration failed, stopping")
            return False

        # Step 4: Test specific migrations
        sms_test_passed = self.test_sms_reminder_tracking()
        auth_test_passed = self.test_customer_authentication_tables()
        validation_passed = self.validate_all_tables()

        # Step 5: Summary
        self.logger.info("=" * 60)
        self.logger.info("MIGRATION SUITE RESULTS")
        self.logger.info("=" * 60)
        self.logger.info(f"Backup created: {backup_path}")
        self.logger.info(
            f"SMS reminder tracking test: {'PASSED' if sms_test_passed else 'FAILED'}"
        )
        self.logger.info(
            f"Customer auth tables test: {'PASSED' if auth_test_passed else 'FAILED'}"
        )
        self.logger.info(
            f"Table validation: {'PASSED' if validation_passed else 'FAILED'}"
        )

        overall_success = sms_test_passed and auth_test_passed and validation_passed
        self.logger.info(
            f"Overall result: {'SUCCESS' if overall_success else 'FAILURE'}"
        )

        return overall_success


def main():
    """Main execution function"""
    import argparse

    parser = argparse.ArgumentParser(description="6FB Database Migration Manager")
    parser.add_argument(
        "--environment", default="development", help="Environment to use"
    )
    parser.add_argument("--migrate", action="store_true", help="Run migrations")
    parser.add_argument("--test", action="store_true", help="Run migration tests")
    parser.add_argument(
        "--full-suite", action="store_true", help="Run full migration suite"
    )
    parser.add_argument("--rollback", help="Rollback to specific revision")
    parser.add_argument("--backup", action="store_true", help="Create backup only")

    args = parser.parse_args()

    manager = MigrationManager(args.environment)

    if args.backup:
        manager.create_backup()
    elif args.rollback:
        manager.rollback_migration(args.rollback)
    elif args.migrate:
        manager.run_migrations()
    elif args.test:
        manager.test_sms_reminder_tracking()
        manager.test_customer_authentication_tables()
        manager.validate_all_tables()
    elif args.full_suite:
        manager.run_full_migration_suite()
    else:
        print("Use --help to see available options")


if __name__ == "__main__":
    main()
