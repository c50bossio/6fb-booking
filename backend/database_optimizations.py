"""
Advanced Database Optimizations for 6FB Booking System
Comprehensive indexing, query optimization, and performance enhancements
"""

import logging
from sqlalchemy import (
    Index,
    text,
    func,
    inspect,
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    Float,
    Date,
    Time,
)
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from config.database import engine, SessionLocal
from models.base import BaseModel
import asyncio
import time
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class DatabaseOptimizer:
    """Advanced database optimization manager"""

    def __init__(self, db_engine: Engine):
        self.engine = db_engine
        self.session = SessionLocal()

    def __del__(self):
        if hasattr(self, "session"):
            self.session.close()

    def create_performance_indexes(self):
        """Create high-performance indexes for critical queries"""
        logger.info("Creating performance indexes...")

        indexes = [
            # === APPOINTMENT INDEXES ===
            # Primary lookup patterns
            Index(
                "idx_appointments_date_barber",
                "appointments.appointment_date",
                "appointments.barber_id",
            ),
            Index(
                "idx_appointments_date_client",
                "appointments.appointment_date",
                "appointments.client_id",
            ),
            Index(
                "idx_appointments_date_status",
                "appointments.appointment_date",
                "appointments.status",
            ),
            Index(
                "idx_appointments_barber_status",
                "appointments.barber_id",
                "appointments.status",
            ),
            # Revenue analysis queries
            Index(
                "idx_appointments_revenue_date",
                "appointments.service_revenue",
                "appointments.appointment_date",
            ),
            Index(
                "idx_appointments_completed_revenue",
                "appointments.is_completed",
                "appointments.service_revenue",
                "appointments.appointment_date",
            ),
            # Customer analysis
            Index(
                "idx_appointments_customer_type_date",
                "appointments.customer_type",
                "appointments.appointment_date",
            ),
            Index(
                "idx_appointments_booking_source",
                "appointments.booking_source",
                "appointments.appointment_date",
            ),
            # Payment processing
            Index(
                "idx_appointments_payment_status",
                "appointments.payment_status",
                "appointments.appointment_date",
            ),
            # === USER/AUTH INDEXES ===
            Index("idx_users_email_active", "users.email", "users.is_active"),
            Index("idx_users_role_active", "users.role", "users.is_active"),
            Index("idx_users_last_login", "users.last_login_at"),
            # === BARBER INDEXES ===
            Index(
                "idx_barbers_location_active",
                "barbers.location_id",
                "barbers.is_active",
            ),
            Index("idx_barbers_tier_active", "barbers.tier", "barbers.is_active"),
            Index("idx_barbers_user_id", "barbers.user_id"),
            # === CLIENT INDEXES ===
            Index("idx_clients_email", "clients.email"),
            Index("idx_clients_phone", "clients.phone"),
            Index("idx_clients_created", "clients.created_at"),
            Index(
                "idx_clients_location_created",
                "clients.preferred_location_id",
                "clients.created_at",
            ),
            # === BOOKING SYSTEM INDEXES ===
            # Service lookups
            Index(
                "idx_services_category_active",
                "services.category_id",
                "services.is_active",
            ),
            Index(
                "idx_services_location_active",
                "services.location_id",
                "services.is_active",
            ),
            Index(
                "idx_services_barber_active", "services.barber_id", "services.is_active"
            ),
            Index(
                "idx_services_price_range", "services.base_price", "services.is_active"
            ),
            # Booking slots optimization
            Index(
                "idx_booking_slots_date_barber",
                "booking_slots.slot_date",
                "booking_slots.barber_id",
                "booking_slots.is_available",
            ),
            Index(
                "idx_booking_slots_location_date",
                "booking_slots.location_id",
                "booking_slots.slot_date",
                "booking_slots.is_available",
            ),
            Index(
                "idx_booking_slots_service_date",
                "booking_slots.service_id",
                "booking_slots.slot_date",
                "booking_slots.is_available",
            ),
            # Barber availability
            Index(
                "idx_barber_availability_schedule",
                "barber_availability.barber_id",
                "barber_availability.day_of_week",
                "barber_availability.is_available",
            ),
            Index(
                "idx_barber_availability_location",
                "barber_availability.location_id",
                "barber_availability.day_of_week",
            ),
            # === PAYMENT INDEXES ===
            Index(
                "idx_payments_appointment_status",
                "payments.appointment_id",
                "payments.status",
            ),
            Index(
                "idx_payments_date_status", "payments.payment_date", "payments.status"
            ),
            Index(
                "idx_payments_method_date",
                "payments.payment_method",
                "payments.payment_date",
            ),
            Index(
                "idx_payments_amount_date", "payments.amount", "payments.payment_date"
            ),
            # === ANALYTICS INDEXES ===
            # Daily metrics
            Index(
                "idx_daily_metrics_date_barber",
                "daily_metrics.metric_date",
                "daily_metrics.barber_id",
            ),
            Index(
                "idx_daily_metrics_location_date",
                "daily_metrics.location_id",
                "daily_metrics.metric_date",
            ),
            # Weekly metrics
            Index(
                "idx_weekly_metrics_week_barber",
                "weekly_metrics.week_start_date",
                "weekly_metrics.barber_id",
            ),
            Index(
                "idx_weekly_metrics_location_week",
                "weekly_metrics.location_id",
                "weekly_metrics.week_start_date",
            ),
            # Monthly metrics
            Index(
                "idx_monthly_metrics_month_barber",
                "monthly_metrics.month_start_date",
                "monthly_metrics.barber_id",
            ),
            Index(
                "idx_monthly_metrics_location_month",
                "monthly_metrics.location_id",
                "monthly_metrics.month_start_date",
            ),
            # === COMMUNICATION INDEXES ===
            Index(
                "idx_email_logs_status_date", "email_logs.status", "email_logs.sent_at"
            ),
            Index("idx_sms_logs_status_date", "sms_logs.status", "sms_logs.sent_at"),
            Index(
                "idx_notifications_user_read",
                "notifications.user_id",
                "notifications.is_read",
                "notifications.created_at",
            ),
            # === COMPENSATION/PAYMENT SPLITS ===
            Index(
                "idx_compensation_plans_barber_active",
                "compensation_plans.barber_id",
                "compensation_plans.is_active",
            ),
            Index(
                "idx_payment_history_barber_date",
                "payment_history.barber_id",
                "payment_history.payment_date",
            ),
            Index(
                "idx_commission_calculations_date",
                "commission_calculations.calculation_date",
            ),
            # === REVIEWS INDEXES ===
            Index(
                "idx_reviews_barber_rating",
                "reviews.barber_id",
                "reviews.overall_rating",
                "reviews.created_at",
            ),
            Index(
                "idx_reviews_location_rating",
                "reviews.location_id",
                "reviews.overall_rating",
                "reviews.created_at",
            ),
            Index("idx_reviews_appointment_id", "reviews.appointment_id"),
            Index(
                "idx_reviews_verified_featured",
                "reviews.is_verified",
                "reviews.is_featured",
                "reviews.is_hidden",
            ),
            # === WAIT LIST INDEXES ===
            Index(
                "idx_wait_lists_preferred_date",
                "wait_lists.preferred_date",
                "wait_lists.status",
            ),
            Index(
                "idx_wait_lists_client_status",
                "wait_lists.client_id",
                "wait_lists.status",
            ),
            Index(
                "idx_wait_lists_service_date",
                "wait_lists.service_id",
                "wait_lists.preferred_date",
                "wait_lists.status",
            ),
        ]

        try:
            # Create indexes
            for index in indexes:
                try:
                    index.create(self.engine, checkfirst=True)
                    logger.info(f"Created index: {index.name}")
                except Exception as e:
                    logger.warning(f"Failed to create index {index.name}: {str(e)}")

            logger.info("Performance indexes created successfully")

        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
            raise

    def create_composite_indexes(self):
        """Create specialized composite indexes for complex queries"""
        logger.info("Creating composite indexes...")

        composite_indexes = [
            # Revenue analysis covering index
            "CREATE INDEX IF NOT EXISTS idx_appointments_revenue_analysis "
            "ON appointments (appointment_date, barber_id, is_completed, service_revenue, tip_amount, product_revenue)",
            # Customer journey analysis
            "CREATE INDEX IF NOT EXISTS idx_appointments_customer_journey "
            "ON appointments (client_id, appointment_date, customer_type, booking_source)",
            # Barber performance covering index
            "CREATE INDEX IF NOT EXISTS idx_appointments_barber_performance "
            "ON appointments (barber_id, appointment_date, status, service_revenue, client_satisfaction)",
            # Payment processing covering index
            "CREATE INDEX IF NOT EXISTS idx_payments_processing "
            "ON payments (payment_date, status, payment_method, amount, appointment_id)",
            # Booking availability covering index
            "CREATE INDEX IF NOT EXISTS idx_booking_availability "
            "ON booking_slots (slot_date, barber_id, location_id, service_id, is_available, start_time)",
            # Analytics dashboard covering index
            "CREATE INDEX IF NOT EXISTS idx_analytics_dashboard "
            "ON daily_metrics (metric_date, barber_id, location_id, total_revenue, appointment_count)",
        ]

        for sql in composite_indexes:
            try:
                self.session.execute(text(sql))
                logger.info(f"Created composite index")
            except Exception as e:
                logger.warning(f"Failed to create composite index: {str(e)}")

        self.session.commit()

    def optimize_database_settings(self):
        """Optimize database configuration settings"""
        logger.info("Optimizing database settings...")

        # SQLite optimizations
        if "sqlite" in str(self.engine.url).lower():
            sqlite_optimizations = [
                "PRAGMA journal_mode = WAL",
                "PRAGMA synchronous = NORMAL",
                "PRAGMA cache_size = 1000000",
                "PRAGMA temp_store = MEMORY",
                "PRAGMA mmap_size = 268435456",  # 256MB
                "PRAGMA optimize",
            ]

            for pragma in sqlite_optimizations:
                try:
                    self.session.execute(text(pragma))
                    logger.info(f"Applied SQLite optimization: {pragma}")
                except Exception as e:
                    logger.warning(f"Failed to apply optimization {pragma}: {str(e)}")

        # PostgreSQL optimizations
        elif "postgresql" in str(self.engine.url).lower():
            postgres_optimizations = [
                "SET shared_preload_libraries = 'pg_stat_statements'",
                "SET track_activity_query_size = 2048",
                "SET log_min_duration_statement = 1000",  # Log slow queries
            ]

            for setting in postgres_optimizations:
                try:
                    self.session.execute(text(setting))
                    logger.info(f"Applied PostgreSQL optimization: {setting}")
                except Exception as e:
                    logger.warning(f"Failed to apply optimization {setting}: {str(e)}")

        self.session.commit()

    def analyze_table_statistics(self):
        """Analyze table statistics for query optimization"""
        logger.info("Analyzing table statistics...")

        # Update table statistics for better query planning
        if "sqlite" in str(self.engine.url).lower():
            self.session.execute(text("ANALYZE"))
        elif "postgresql" in str(self.engine.url).lower():
            tables = [
                "appointments",
                "users",
                "barbers",
                "clients",
                "payments",
                "services",
                "booking_slots",
                "daily_metrics",
                "reviews",
            ]
            for table in tables:
                try:
                    self.session.execute(text(f"ANALYZE {table}"))
                    logger.info(f"Analyzed table: {table}")
                except Exception as e:
                    logger.warning(f"Failed to analyze table {table}: {str(e)}")

        self.session.commit()

    def create_materialized_views(self):
        """Create materialized views for common aggregate queries"""
        logger.info("Creating materialized views...")

        # Only for PostgreSQL (SQLite doesn't support materialized views)
        if "postgresql" not in str(self.engine.url).lower():
            logger.info("Materialized views only supported on PostgreSQL")
            return

        materialized_views = [
            # Barber performance summary
            """
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_barber_performance_summary AS
            SELECT
                b.id as barber_id,
                b.full_name,
                b.location_id,
                COUNT(a.id) as total_appointments,
                SUM(a.service_revenue + a.tip_amount + a.product_revenue) as total_revenue,
                AVG(a.service_revenue + a.tip_amount + a.product_revenue) as avg_appointment_value,
                AVG(CASE WHEN a.client_satisfaction IS NOT NULL THEN a.client_satisfaction END) as avg_satisfaction,
                COUNT(CASE WHEN a.customer_type = 'New' THEN 1 END) as new_customers,
                COUNT(CASE WHEN a.customer_type = 'Returning' THEN 1 END) as returning_customers
            FROM barbers b
            LEFT JOIN appointments a ON b.id = a.barber_id AND a.is_completed = true
            WHERE b.is_active = true
            GROUP BY b.id, b.full_name, b.location_id
            """,
            # Daily revenue summary
            """
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue_summary AS
            SELECT
                a.appointment_date,
                a.barber_id,
                l.id as location_id,
                l.name as location_name,
                COUNT(a.id) as appointment_count,
                SUM(a.service_revenue) as service_revenue,
                SUM(a.tip_amount) as tip_revenue,
                SUM(a.product_revenue) as product_revenue,
                SUM(a.service_revenue + a.tip_amount + a.product_revenue) as total_revenue,
                AVG(a.service_revenue + a.tip_amount + a.product_revenue) as avg_ticket,
                COUNT(CASE WHEN a.customer_type = 'New' THEN 1 END) as new_customers,
                COUNT(CASE WHEN a.customer_type = 'Returning' THEN 1 END) as returning_customers
            FROM appointments a
            JOIN barbers b ON a.barber_id = b.id
            JOIN locations l ON b.location_id = l.id
            WHERE a.is_completed = true
            GROUP BY a.appointment_date, a.barber_id, l.id, l.name
            """,
            # Service performance summary
            """
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_service_performance AS
            SELECT
                s.id as service_id,
                s.name as service_name,
                sc.name as category_name,
                COUNT(a.id) as booking_count,
                AVG(a.service_revenue) as avg_revenue,
                SUM(a.service_revenue) as total_revenue,
                AVG(a.duration_minutes) as avg_duration,
                AVG(CASE WHEN r.overall_rating IS NOT NULL THEN r.overall_rating END) as avg_rating
            FROM services s
            JOIN service_categories sc ON s.category_id = sc.id
            LEFT JOIN appointments a ON s.name = a.service_name AND a.is_completed = true
            LEFT JOIN reviews r ON a.id = r.appointment_id
            WHERE s.is_active = true
            GROUP BY s.id, s.name, sc.name
            """,
        ]

        for view_sql in materialized_views:
            try:
                self.session.execute(text(view_sql))
                logger.info("Created materialized view")
            except Exception as e:
                logger.warning(f"Failed to create materialized view: {str(e)}")

        self.session.commit()

    def get_index_usage_stats(self) -> Dict[str, Any]:
        """Get index usage statistics"""
        stats = {}

        try:
            if "postgresql" in str(self.engine.url).lower():
                # PostgreSQL index usage stats
                result = self.session.execute(
                    text(
                        """
                    SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
                    FROM pg_stat_user_indexes
                    ORDER BY idx_tup_read DESC
                    LIMIT 20
                """
                    )
                )
                stats["index_usage"] = [dict(row) for row in result]

            elif "sqlite" in str(self.engine.url).lower():
                # SQLite doesn't have detailed index stats, but we can check if indexes exist
                result = self.session.execute(
                    text(
                        """
                    SELECT name, tbl_name FROM sqlite_master
                    WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
                    ORDER BY name
                """
                    )
                )
                stats["indexes"] = [dict(row) for row in result]

        except Exception as e:
            logger.error(f"Error getting index stats: {str(e)}")
            stats["error"] = str(e)

        return stats

    def optimize_slow_queries(self):
        """Identify and optimize slow queries"""
        logger.info("Analyzing slow queries...")

        if "postgresql" in str(self.engine.url).lower():
            try:
                # Enable pg_stat_statements if available
                self.session.execute(
                    text("CREATE EXTENSION IF NOT EXISTS pg_stat_statements")
                )

                # Get slow queries
                result = self.session.execute(
                    text(
                        """
                    SELECT query, calls, total_time, rows, 100.0 * shared_blks_hit /
                           nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
                    FROM pg_stat_statements
                    WHERE query NOT LIKE '%pg_stat_statements%'
                    ORDER BY total_time DESC
                    LIMIT 10
                """
                    )
                )

                slow_queries = [dict(row) for row in result]
                logger.info(f"Found {len(slow_queries)} potentially slow queries")

                return slow_queries

            except Exception as e:
                logger.warning(f"Could not analyze slow queries: {str(e)}")

        return []

    def run_full_optimization(self):
        """Run complete database optimization suite"""
        logger.info("Starting comprehensive database optimization...")

        start_time = time.time()

        try:
            # 1. Create performance indexes
            self.create_performance_indexes()

            # 2. Create composite indexes
            self.create_composite_indexes()

            # 3. Optimize database settings
            self.optimize_database_settings()

            # 4. Update table statistics
            self.analyze_table_statistics()

            # 5. Create materialized views (PostgreSQL only)
            self.create_materialized_views()

            # 6. Analyze slow queries
            slow_queries = self.optimize_slow_queries()

            # 7. Get index usage stats
            index_stats = self.get_index_usage_stats()

            end_time = time.time()
            optimization_time = end_time - start_time

            logger.info(
                f"Database optimization completed in {optimization_time:.2f} seconds"
            )

            return {
                "success": True,
                "optimization_time": optimization_time,
                "slow_queries": slow_queries,
                "index_stats": index_stats,
                "message": "Database optimization completed successfully",
            }

        except Exception as e:
            logger.error(f"Database optimization failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Database optimization failed",
            }


def optimize_database():
    """Main function to run database optimizations"""
    optimizer = DatabaseOptimizer(engine)
    return optimizer.run_full_optimization()


if __name__ == "__main__":
    # Run optimization directly
    result = optimize_database()
    print(f"Optimization result: {result}")
