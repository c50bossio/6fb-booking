#!/usr/bin/env python3
"""
Customer Database Relationship Validation
Validates that customer-appointment relationships are working correctly
"""

import sqlite3
import logging
from pathlib import Path
import json
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class CustomerDatabaseValidator:
    def __init__(self):
        self.db_path = Path("6fb_booking.db")
        self.validation_results = {}

    def validate_schema(self):
        """Validate that required tables and columns exist"""

        logger.info("🔍 Validating database schema...")

        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()

            # Check customers table
            cursor.execute("PRAGMA table_info(customers)")
            customer_columns = {row[1]: row[2] for row in cursor.fetchall()}

            required_customer_columns = [
                "id",
                "email",
                "first_name",
                "last_name",
                "hashed_password",
            ]
            missing_customer_columns = [
                col for col in required_customer_columns if col not in customer_columns
            ]

            # Check appointments table
            cursor.execute("PRAGMA table_info(appointments)")
            appointment_columns = {row[1]: row[2] for row in cursor.fetchall()}

            required_appointment_columns = [
                "id",
                "customer_id",
                "barber_id",
                "client_id",
                "appointment_date",
                "appointment_time",
                "status",
            ]
            missing_appointment_columns = [
                col
                for col in required_appointment_columns
                if col not in appointment_columns
            ]

            self.validation_results["schema"] = {
                "customers_table_ok": len(missing_customer_columns) == 0,
                "appointments_table_ok": len(missing_appointment_columns) == 0,
                "missing_customer_columns": missing_customer_columns,
                "missing_appointment_columns": missing_appointment_columns,
                "customer_columns": customer_columns,
                "appointment_columns": appointment_columns,
            }

            if missing_customer_columns:
                logger.error(f"❌ Missing customer columns: {missing_customer_columns}")
            else:
                logger.info("✅ Customers table schema is valid")

            if missing_appointment_columns:
                logger.error(
                    f"❌ Missing appointment columns: {missing_appointment_columns}"
                )
            else:
                logger.info("✅ Appointments table schema is valid")

            conn.close()

        except Exception as e:
            logger.error(f"❌ Schema validation error: {e}")
            self.validation_results["schema"] = {"error": str(e)}

    def validate_customer_data(self):
        """Validate customer data integrity"""

        logger.info("🔍 Validating customer data...")

        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()

            # Count customers
            cursor.execute("SELECT COUNT(*) FROM customers")
            total_customers = cursor.fetchone()[0]

            # Count active customers
            cursor.execute("SELECT COUNT(*) FROM customers WHERE is_active = 1")
            active_customers = cursor.fetchone()[0]

            # Check for customers with appointments
            cursor.execute(
                """
                SELECT COUNT(DISTINCT c.id)
                FROM customers c
                JOIN appointments a ON c.id = a.customer_id
            """
            )
            customers_with_appointments = cursor.fetchone()[0]

            # Get sample customer data
            cursor.execute(
                """
                SELECT id, email, first_name, last_name, is_active, created_at
                FROM customers
                LIMIT 5
            """
            )
            sample_customers = cursor.fetchall()

            self.validation_results["customer_data"] = {
                "total_customers": total_customers,
                "active_customers": active_customers,
                "customers_with_appointments": customers_with_appointments,
                "sample_customers": [
                    {
                        "id": row[0],
                        "email": row[1][:20] + "..." if len(row[1]) > 20 else row[1],
                        "name": f"{row[2]} {row[3]}",
                        "is_active": bool(row[4]),
                        "created_at": row[5],
                    }
                    for row in sample_customers
                ],
            }

            logger.info(
                f"✅ Found {total_customers} total customers ({active_customers} active)"
            )
            logger.info(f"✅ {customers_with_appointments} customers have appointments")

            conn.close()

        except Exception as e:
            logger.error(f"❌ Customer data validation error: {e}")
            self.validation_results["customer_data"] = {"error": str(e)}

    def validate_appointment_relationships(self):
        """Validate appointment-customer relationships"""

        logger.info("🔍 Validating appointment relationships...")

        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()

            # Count appointments
            cursor.execute("SELECT COUNT(*) FROM appointments")
            total_appointments = cursor.fetchone()[0]

            # Count appointments with customer_id
            cursor.execute(
                "SELECT COUNT(*) FROM appointments WHERE customer_id IS NOT NULL"
            )
            linked_appointments = cursor.fetchone()[0]

            # Count appointments without customer_id
            cursor.execute(
                "SELECT COUNT(*) FROM appointments WHERE customer_id IS NULL"
            )
            unlinked_appointments = cursor.fetchone()[0]

            # Get appointment status distribution
            cursor.execute(
                """
                SELECT status, COUNT(*)
                FROM appointments
                WHERE customer_id IS NOT NULL
                GROUP BY status
            """
            )
            status_distribution = dict(cursor.fetchall())

            # Test specific customer relationships
            cursor.execute(
                """
                SELECT
                    c.email,
                    c.first_name,
                    c.last_name,
                    COUNT(a.id) as appointment_count,
                    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN a.status = 'confirmed' THEN 1 END) as upcoming,
                    SUM(a.service_revenue + COALESCE(a.tip_amount, 0) + COALESCE(a.product_revenue, 0)) as total_spent
                FROM customers c
                LEFT JOIN appointments a ON c.id = a.customer_id
                WHERE c.is_active = 1
                GROUP BY c.id
                ORDER BY appointment_count DESC
                LIMIT 5
            """
            )

            customer_stats = []
            for row in cursor.fetchall():
                customer_stats.append(
                    {
                        "email": row[0][:25] + "..." if len(row[0]) > 25 else row[0],
                        "name": f"{row[1]} {row[2]}",
                        "appointment_count": row[3],
                        "completed": row[4],
                        "upcoming": row[5],
                        "total_spent": float(row[6]) if row[6] else 0.0,
                    }
                )

            self.validation_results["appointment_relationships"] = {
                "total_appointments": total_appointments,
                "linked_appointments": linked_appointments,
                "unlinked_appointments": unlinked_appointments,
                "link_percentage": (
                    (linked_appointments / total_appointments * 100)
                    if total_appointments > 0
                    else 0
                ),
                "status_distribution": status_distribution,
                "customer_stats": customer_stats,
            }

            logger.info(
                f"✅ {linked_appointments}/{total_appointments} appointments linked to customers ({(linked_appointments/total_appointments*100):.1f}%)"
            )

            if unlinked_appointments > 0:
                logger.warning(
                    f"⚠️  {unlinked_appointments} appointments not linked to customers"
                )

            logger.info(f"✅ Status distribution: {status_distribution}")

            conn.close()

        except Exception as e:
            logger.error(f"❌ Appointment relationship validation error: {e}")
            self.validation_results["appointment_relationships"] = {"error": str(e)}

    def validate_data_consistency(self):
        """Validate data consistency across related tables"""

        logger.info("🔍 Validating data consistency...")

        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()

            # Check for orphaned appointments (customer_id doesn't exist)
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM appointments a
                LEFT JOIN customers c ON a.customer_id = c.id
                WHERE a.customer_id IS NOT NULL AND c.id IS NULL
            """
            )
            orphaned_appointments = cursor.fetchone()[0]

            # Check for invalid barber references
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM appointments a
                LEFT JOIN users u ON a.barber_id = u.id
                WHERE u.id IS NULL
            """
            )
            invalid_barber_refs = cursor.fetchone()[0]

            # Check appointment date validity
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM appointments
                WHERE appointment_date IS NULL OR appointment_time IS NULL
            """
            )
            invalid_dates = cursor.fetchone()[0]

            # Check for duplicate appointments (same customer, date, time)
            cursor.execute(
                """
                SELECT customer_id, appointment_date, appointment_time, COUNT(*)
                FROM appointments
                WHERE customer_id IS NOT NULL
                GROUP BY customer_id, appointment_date, appointment_time
                HAVING COUNT(*) > 1
            """
            )
            duplicates = cursor.fetchall()

            self.validation_results["data_consistency"] = {
                "orphaned_appointments": orphaned_appointments,
                "invalid_barber_refs": invalid_barber_refs,
                "invalid_dates": invalid_dates,
                "duplicate_appointments": len(duplicates),
                "duplicate_details": duplicates[:5],  # First 5 duplicates
            }

            issues = []
            if orphaned_appointments > 0:
                issues.append(f"{orphaned_appointments} orphaned appointments")
            if invalid_barber_refs > 0:
                issues.append(f"{invalid_barber_refs} invalid barber references")
            if invalid_dates > 0:
                issues.append(f"{invalid_dates} appointments with invalid dates")
            if duplicates:
                issues.append(f"{len(duplicates)} duplicate appointments")

            if issues:
                logger.warning(f"⚠️  Data consistency issues found: {', '.join(issues)}")
            else:
                logger.info("✅ Data consistency validation passed")

            conn.close()

        except Exception as e:
            logger.error(f"❌ Data consistency validation error: {e}")
            self.validation_results["data_consistency"] = {"error": str(e)}

    def test_customer_queries(self):
        """Test the actual queries used by the customer API"""

        logger.info("🔍 Testing customer API queries...")

        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()

            # Get a test customer
            cursor.execute(
                "SELECT id, email FROM customers WHERE is_active = 1 LIMIT 1"
            )
            test_customer = cursor.fetchone()

            if not test_customer:
                logger.error("❌ No active customers found for query testing")
                return

            customer_id, customer_email = test_customer

            # Test appointments query (similar to API)
            cursor.execute(
                """
                SELECT
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    a.service_name,
                    a.status,
                    u.first_name as barber_first_name,
                    u.last_name as barber_last_name
                FROM appointments a
                LEFT JOIN users u ON a.barber_id = u.id
                WHERE a.customer_id = ?
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
                LIMIT 10
            """,
                (customer_id,),
            )

            appointments_result = cursor.fetchall()

            # Test stats query (similar to API)
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_appointments,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'confirmed' AND appointment_date >= date('now') THEN 1 END) as upcoming,
                    SUM(CASE WHEN status = 'completed' THEN service_revenue + COALESCE(tip_amount, 0) + COALESCE(product_revenue, 0) ELSE 0 END) as total_spent
                FROM appointments
                WHERE customer_id = ?
            """,
                (customer_id,),
            )

            stats_result = cursor.fetchone()

            # Test favorite barber query
            cursor.execute(
                """
                SELECT u.first_name, u.last_name, COUNT(a.id) as appointment_count
                FROM appointments a
                JOIN users u ON a.barber_id = u.id
                WHERE a.customer_id = ? AND a.status = 'completed'
                GROUP BY u.id
                ORDER BY appointment_count DESC
                LIMIT 1
            """,
                (customer_id,),
            )

            favorite_barber = cursor.fetchone()

            self.validation_results["api_queries"] = {
                "test_customer_id": customer_id,
                "test_customer_email": (
                    customer_email[:25] + "..."
                    if len(customer_email) > 25
                    else customer_email
                ),
                "appointments_query_results": len(appointments_result),
                "stats_query_success": stats_result is not None,
                "stats_data": {
                    "total": stats_result[0] if stats_result else 0,
                    "completed": stats_result[1] if stats_result else 0,
                    "upcoming": stats_result[2] if stats_result else 0,
                    "total_spent": (
                        float(stats_result[3])
                        if stats_result and stats_result[3]
                        else 0.0
                    ),
                },
                "favorite_barber": (
                    f"{favorite_barber[0]} {favorite_barber[1]}"
                    if favorite_barber
                    else "None"
                ),
                "sample_appointments": [
                    {
                        "id": row[0],
                        "date": row[1],
                        "time": str(row[2]) if row[2] else None,
                        "service": row[3],
                        "status": row[4],
                        "barber": (
                            f"{row[5]} {row[6]}" if row[5] and row[6] else "Unknown"
                        ),
                    }
                    for row in appointments_result[:3]
                ],
            }

            logger.info(
                f"✅ API queries tested successfully for customer {customer_id}"
            )
            logger.info(f"   - Found {len(appointments_result)} appointments")
            logger.info(
                f"   - Stats: {stats_result[0] if stats_result else 0} total, {stats_result[1] if stats_result else 0} completed"
            )

            conn.close()

        except Exception as e:
            logger.error(f"❌ API query testing error: {e}")
            self.validation_results["api_queries"] = {"error": str(e)}

    def run_all_validations(self):
        """Run all database validation tests"""

        logger.info("🚀 Starting customer database validation")
        logger.info("=" * 60)

        if not self.db_path.exists():
            logger.error(f"❌ Database file not found: {self.db_path}")
            return False

        self.validate_schema()
        self.validate_customer_data()
        self.validate_appointment_relationships()
        self.validate_data_consistency()
        self.test_customer_queries()

        return True

    def generate_validation_report(self):
        """Generate validation report"""

        report = {
            "validation_timestamp": datetime.now().isoformat(),
            "database_path": str(self.db_path),
            "validation_results": self.validation_results,
        }

        # Save to file
        report_filename = f"customer_database_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(report_filename, "w") as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(f"📊 Validation report saved to: {report_filename}")

        # Print summary
        logger.info(f"\n{'='*60}")
        logger.info("📊 DATABASE VALIDATION SUMMARY")
        logger.info(f"{'='*60}")

        # Schema validation
        schema = self.validation_results.get("schema", {})
        if schema.get("customers_table_ok") and schema.get("appointments_table_ok"):
            logger.info("✅ Schema validation: PASSED")
        else:
            logger.error("❌ Schema validation: FAILED")

        # Data validation
        customer_data = self.validation_results.get("customer_data", {})
        if customer_data.get("total_customers", 0) > 0:
            logger.info(
                f"✅ Customer data: {customer_data.get('total_customers')} customers found"
            )
        else:
            logger.error("❌ Customer data: No customers found")

        # Relationship validation
        relationships = self.validation_results.get("appointment_relationships", {})
        link_percentage = relationships.get("link_percentage", 0)
        if link_percentage >= 80:
            logger.info(f"✅ Relationships: {link_percentage:.1f}% appointments linked")
        else:
            logger.warning(
                f"⚠️  Relationships: Only {link_percentage:.1f}% appointments linked"
            )

        # Consistency validation
        consistency = self.validation_results.get("data_consistency", {})
        issues = (
            consistency.get("orphaned_appointments", 0)
            + consistency.get("invalid_barber_refs", 0)
            + consistency.get("invalid_dates", 0)
        )
        if issues == 0:
            logger.info("✅ Data consistency: PASSED")
        else:
            logger.warning(f"⚠️  Data consistency: {issues} issues found")

        return report_filename


def main():
    """Main function to run database validation"""

    logger.info("🎯 Customer Database Relationship Validation")
    logger.info("=" * 60)

    validator = CustomerDatabaseValidator()

    if validator.run_all_validations():
        report_file = validator.generate_validation_report()
        logger.info("🎉 Database validation completed!")
        return True
    else:
        logger.error("❌ Database validation failed!")
        return False


if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)
