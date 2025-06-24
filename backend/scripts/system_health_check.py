#!/usr/bin/env python3
"""
System Health Check Script for 6FB Booking Platform

This script performs comprehensive health checks on all system components:
1. Database connectivity and performance
2. Redis connection and caching
3. SMS service configuration
4. Email service configuration
5. Environment variables validation
6. API endpoints availability
7. File system permissions
8. External service integrations
"""

import sys
import os
import time
import json
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging
import requests
from dataclasses import dataclass, asdict

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

try:
    from config.database import get_db_session, check_database_health
    from sqlalchemy import text
    import redis
except ImportError as e:
    print(f"Import error: {e}")
    print("Some health checks may not be available")

# Try to import services - they might not be fully implemented yet
try:
    from services.sms_service import SMSService
except ImportError:
    SMSService = None

try:
    from services.email_service import EmailService
except ImportError:
    EmailService = None

try:
    from services.redis_service import RedisService
except ImportError:
    RedisService = None


@dataclass
class HealthCheckResult:
    """Health check result structure"""

    service: str
    status: str  # "healthy", "unhealthy", "warning", "unknown"
    message: str
    details: Dict[str, Any]
    response_time_ms: float
    timestamp: datetime

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "service": self.service,
            "status": self.status,
            "message": self.message,
            "details": self.details,
            "response_time_ms": self.response_time_ms,
            "timestamp": self.timestamp.isoformat(),
        }


class SystemHealthChecker:
    """Comprehensive system health checker"""

    def __init__(self, environment: str = "development"):
        self.environment = environment
        self.results: List[HealthCheckResult] = []
        self.setup_logging()

    def setup_logging(self):
        """Setup logging configuration"""
        log_dir = Path(__file__).parent.parent / "logs"
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler(
                    log_dir
                    / f"health_check_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
                ),
                logging.StreamHandler(sys.stdout),
            ],
        )
        self.logger = logging.getLogger(__name__)

    def record_result(
        self,
        service: str,
        status: str,
        message: str,
        details: Dict[str, Any],
        response_time: float,
    ):
        """Record a health check result"""
        result = HealthCheckResult(
            service=service,
            status=status,
            message=message,
            details=details,
            response_time_ms=response_time * 1000,
            timestamp=datetime.now(),
        )
        self.results.append(result)

        # Log result
        log_level = (
            logging.ERROR
            if status == "unhealthy"
            else logging.WARNING if status == "warning" else logging.INFO
        )
        self.logger.log(log_level, f"{service}: {status} - {message}")

    def check_database_connectivity(self) -> HealthCheckResult:
        """Check database connectivity and performance"""
        start_time = time.time()

        try:
            # Test basic connectivity
            with get_db_session() as db:
                # Test basic query
                result = db.execute(text("SELECT 1")).fetchone()

                # Test table access
                table_count = db.execute(
                    text("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
                ).fetchone()[0]

                # Test write operation
                db.execute(text("CREATE TEMP TABLE health_test (id INTEGER)"))
                db.execute(text("INSERT INTO health_test VALUES (1)"))
                test_result = db.execute(
                    text("SELECT COUNT(*) FROM health_test")
                ).fetchone()[0]

                # Get database stats
                db_health = check_database_health()

                response_time = time.time() - start_time

                if test_result == 1:
                    self.record_result(
                        "database",
                        "healthy",
                        "Database connectivity and operations working",
                        {
                            "table_count": table_count,
                            "health_info": db_health,
                            "write_test": "passed",
                        },
                        response_time,
                    )
                else:
                    self.record_result(
                        "database",
                        "unhealthy",
                        "Database write test failed",
                        {"table_count": table_count, "write_test": "failed"},
                        response_time,
                    )

        except Exception as e:
            response_time = time.time() - start_time
            self.record_result(
                "database",
                "unhealthy",
                f"Database connectivity failed: {str(e)}",
                {"error": str(e), "traceback": traceback.format_exc()},
                response_time,
            )

    def check_redis_connection(self) -> HealthCheckResult:
        """Check Redis connectivity and performance"""
        start_time = time.time()

        try:
            # Try to connect to Redis
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

            # Test sync connection
            r = redis.from_url(redis_url)

            # Test basic operations
            test_key = f"health_check_{int(time.time())}"
            r.set(test_key, "test_value", ex=10)  # Expire in 10 seconds
            retrieved_value = r.get(test_key)
            r.delete(test_key)

            # Get Redis info
            redis_info = r.info()

            response_time = time.time() - start_time

            if retrieved_value == b"test_value":
                self.record_result(
                    "redis",
                    "healthy",
                    "Redis connectivity and operations working",
                    {
                        "version": redis_info.get("redis_version", "unknown"),
                        "connected_clients": redis_info.get("connected_clients", 0),
                        "used_memory": redis_info.get("used_memory_human", "unknown"),
                        "operations_test": "passed",
                    },
                    response_time,
                )
            else:
                self.record_result(
                    "redis",
                    "unhealthy",
                    "Redis operations test failed",
                    {"operations_test": "failed"},
                    response_time,
                )

        except Exception as e:
            response_time = time.time() - start_time
            self.record_result(
                "redis",
                "unhealthy",
                f"Redis connectivity failed: {str(e)}",
                {"error": str(e), "redis_url": redis_url},
                response_time,
            )

    def check_sms_service(self) -> HealthCheckResult:
        """Check SMS service configuration"""
        start_time = time.time()

        try:
            # Check environment variables
            twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
            twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
            twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")

            # Initialize SMS service if available
            config_status = "unknown"
            if SMSService:
                try:
                    sms_service = SMSService()
                    config_status = sms_service.check_configuration()
                except:
                    config_status = "service_unavailable"

            response_time = time.time() - start_time

            if twilio_sid and twilio_token and twilio_phone:
                self.record_result(
                    "sms_service",
                    "healthy",
                    "SMS service configuration complete",
                    {
                        "twilio_sid_configured": bool(twilio_sid),
                        "twilio_token_configured": bool(twilio_token),
                        "twilio_phone_configured": bool(twilio_phone),
                        "service_status": config_status,
                    },
                    response_time,
                )
            else:
                missing = []
                if not twilio_sid:
                    missing.append("TWILIO_ACCOUNT_SID")
                if not twilio_token:
                    missing.append("TWILIO_AUTH_TOKEN")
                if not twilio_phone:
                    missing.append("TWILIO_PHONE_NUMBER")

                self.record_result(
                    "sms_service",
                    "warning",
                    f"SMS service missing configuration: {', '.join(missing)}",
                    {"missing_env_vars": missing, "service_available": False},
                    response_time,
                )

        except Exception as e:
            response_time = time.time() - start_time
            self.record_result(
                "sms_service",
                "unknown",
                f"SMS service check failed: {str(e)}",
                {"error": str(e)},
                response_time,
            )

    def check_email_service(self) -> HealthCheckResult:
        """Check email service configuration"""
        start_time = time.time()

        try:
            # Check SendGrid configuration
            sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
            sendgrid_from_email = os.getenv("SENDGRID_FROM_EMAIL")

            # Check SMTP configuration
            smtp_server = os.getenv("SMTP_SERVER")
            smtp_port = os.getenv("SMTP_PORT")
            smtp_username = os.getenv("SMTP_USERNAME")
            smtp_password = os.getenv("SMTP_PASSWORD")

            # Initialize email service if available
            email_service = None
            if EmailService:
                try:
                    email_service = EmailService()
                except:
                    pass

            response_time = time.time() - start_time

            email_configs = []
            if sendgrid_api_key and sendgrid_from_email:
                email_configs.append("SendGrid")
            if smtp_server and smtp_port:
                email_configs.append("SMTP")

            if email_configs:
                self.record_result(
                    "email_service",
                    "healthy",
                    f"Email service configured: {', '.join(email_configs)}",
                    {
                        "sendgrid_configured": bool(
                            sendgrid_api_key and sendgrid_from_email
                        ),
                        "smtp_configured": bool(smtp_server and smtp_port),
                        "available_services": email_configs,
                    },
                    response_time,
                )
            else:
                self.record_result(
                    "email_service",
                    "warning",
                    "No email service configuration found",
                    {
                        "sendgrid_configured": False,
                        "smtp_configured": False,
                        "available_services": [],
                    },
                    response_time,
                )

        except Exception as e:
            response_time = time.time() - start_time
            self.record_result(
                "email_service",
                "unknown",
                f"Email service check failed: {str(e)}",
                {"error": str(e)},
                response_time,
            )

    def check_environment_variables(self) -> HealthCheckResult:
        """Check critical environment variables"""
        start_time = time.time()

        try:
            # Critical environment variables
            critical_vars = ["DATABASE_URL", "SECRET_KEY", "ENVIRONMENT"]

            # Optional but important variables
            optional_vars = [
                "REDIS_URL",
                "TWILIO_ACCOUNT_SID",
                "TWILIO_AUTH_TOKEN",
                "TWILIO_PHONE_NUMBER",
                "SENDGRID_API_KEY",
                "SENDGRID_FROM_EMAIL",
                "STRIPE_PUBLISHABLE_KEY",
                "STRIPE_SECRET_KEY",
                "GOOGLE_OAUTH_CLIENT_ID",
                "GOOGLE_OAUTH_CLIENT_SECRET",
            ]

            # Check critical variables
            missing_critical = []
            present_critical = []
            for var in critical_vars:
                if os.getenv(var):
                    present_critical.append(var)
                else:
                    missing_critical.append(var)

            # Check optional variables
            missing_optional = []
            present_optional = []
            for var in optional_vars:
                if os.getenv(var):
                    present_optional.append(var)
                else:
                    missing_optional.append(var)

            response_time = time.time() - start_time

            if not missing_critical:
                status = "healthy" if len(missing_optional) < 5 else "warning"
                message = "Environment variables configured"
                if missing_optional:
                    message += f" (missing {len(missing_optional)} optional vars)"

                self.record_result(
                    "environment_variables",
                    status,
                    message,
                    {
                        "critical_vars_present": present_critical,
                        "optional_vars_present": present_optional,
                        "missing_optional": missing_optional,
                        "environment": os.getenv("ENVIRONMENT", "unknown"),
                    },
                    response_time,
                )
            else:
                self.record_result(
                    "environment_variables",
                    "unhealthy",
                    f"Missing critical environment variables: {', '.join(missing_critical)}",
                    {
                        "missing_critical": missing_critical,
                        "present_critical": present_critical,
                        "missing_optional": missing_optional,
                        "environment": os.getenv("ENVIRONMENT", "unknown"),
                    },
                    response_time,
                )

        except Exception as e:
            response_time = time.time() - start_time
            self.record_result(
                "environment_variables",
                "unknown",
                f"Environment variable check failed: {str(e)}",
                {"error": str(e)},
                response_time,
            )

    def check_api_endpoints(self) -> HealthCheckResult:
        """Check critical API endpoints"""
        start_time = time.time()

        try:
            # Get base URL
            base_url = os.getenv("API_BASE_URL", "http://localhost:8000")

            # Critical endpoints to check
            endpoints = [
                "/api/v1/health",
                "/api/v1/appointments",
                "/api/v1/barbers",
                "/api/v1/services",
                "/api/v1/locations",
            ]

            endpoint_results = {}
            healthy_endpoints = 0

            for endpoint in endpoints:
                try:
                    url = f"{base_url}{endpoint}"
                    response = requests.get(url, timeout=5)

                    if response.status_code in [
                        200,
                        401,
                        403,
                    ]:  # 401/403 means endpoint exists but needs auth
                        endpoint_results[endpoint] = {
                            "status": "healthy",
                            "status_code": response.status_code,
                            "response_time": response.elapsed.total_seconds(),
                        }
                        healthy_endpoints += 1
                    else:
                        endpoint_results[endpoint] = {
                            "status": "unhealthy",
                            "status_code": response.status_code,
                            "response_time": response.elapsed.total_seconds(),
                        }

                except Exception as e:
                    endpoint_results[endpoint] = {
                        "status": "unreachable",
                        "error": str(e),
                    }

            response_time = time.time() - start_time

            if healthy_endpoints == len(endpoints):
                status = "healthy"
                message = "All API endpoints responding"
            elif healthy_endpoints > len(endpoints) / 2:
                status = "warning"
                message = f"{healthy_endpoints}/{len(endpoints)} API endpoints healthy"
            else:
                status = "unhealthy"
                message = (
                    f"Only {healthy_endpoints}/{len(endpoints)} API endpoints healthy"
                )

            self.record_result(
                "api_endpoints",
                status,
                message,
                {
                    "base_url": base_url,
                    "endpoints_checked": len(endpoints),
                    "healthy_endpoints": healthy_endpoints,
                    "endpoint_details": endpoint_results,
                },
                response_time,
            )

        except Exception as e:
            response_time = time.time() - start_time
            self.record_result(
                "api_endpoints",
                "unknown",
                f"API endpoint check failed: {str(e)}",
                {"error": str(e)},
                response_time,
            )

    def check_file_system_permissions(self) -> HealthCheckResult:
        """Check file system permissions"""
        start_time = time.time()

        try:
            # Check critical directories
            base_dir = Path(__file__).parent.parent
            directories_to_check = [
                base_dir / "logs",
                base_dir / "backups",
                base_dir / "static",
                base_dir / "templates",
            ]

            permission_results = {}

            for directory in directories_to_check:
                try:
                    # Check if directory exists
                    if not directory.exists():
                        directory.mkdir(exist_ok=True)

                    # Test write permissions
                    test_file = directory / f"health_check_{int(time.time())}.tmp"
                    test_file.write_text("test")
                    test_file.unlink()

                    permission_results[str(directory)] = {
                        "exists": True,
                        "writable": True,
                        "readable": True,
                    }

                except Exception as e:
                    permission_results[str(directory)] = {
                        "exists": directory.exists(),
                        "writable": False,
                        "readable": directory.exists(),
                        "error": str(e),
                    }

            response_time = time.time() - start_time

            # Check if all directories are accessible
            all_accessible = all(
                result.get("writable", False) and result.get("readable", False)
                for result in permission_results.values()
            )

            if all_accessible:
                self.record_result(
                    "file_system",
                    "healthy",
                    "File system permissions correct",
                    {"directories": permission_results},
                    response_time,
                )
            else:
                self.record_result(
                    "file_system",
                    "warning",
                    "Some file system permission issues detected",
                    {"directories": permission_results},
                    response_time,
                )

        except Exception as e:
            response_time = time.time() - start_time
            self.record_result(
                "file_system",
                "unknown",
                f"File system check failed: {str(e)}",
                {"error": str(e)},
                response_time,
            )

    def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks and return summary"""
        self.logger.info("=" * 60)
        self.logger.info("STARTING SYSTEM HEALTH CHECK")
        self.logger.info("=" * 60)

        start_time = time.time()

        # Run all health checks
        health_checks = [
            self.check_database_connectivity,
            self.check_redis_connection,
            self.check_sms_service,
            self.check_email_service,
            self.check_environment_variables,
            self.check_api_endpoints,
            self.check_file_system_permissions,
        ]

        for check in health_checks:
            try:
                check()
            except Exception as e:
                self.logger.error(f"Health check {check.__name__} failed: {e}")

        total_time = time.time() - start_time

        # Calculate summary
        healthy_count = sum(1 for r in self.results if r.status == "healthy")
        warning_count = sum(1 for r in self.results if r.status == "warning")
        unhealthy_count = sum(1 for r in self.results if r.status == "unhealthy")
        unknown_count = sum(1 for r in self.results if r.status == "unknown")

        overall_status = "healthy"
        if unhealthy_count > 0:
            overall_status = "unhealthy"
        elif warning_count > 0:
            overall_status = "warning"

        summary = {
            "overall_status": overall_status,
            "total_checks": len(self.results),
            "healthy": healthy_count,
            "warning": warning_count,
            "unhealthy": unhealthy_count,
            "unknown": unknown_count,
            "total_time_seconds": total_time,
            "timestamp": datetime.now().isoformat(),
            "environment": self.environment,
            "checks": [result.to_dict() for result in self.results],
        }

        # Log summary
        self.logger.info("=" * 60)
        self.logger.info("HEALTH CHECK SUMMARY")
        self.logger.info("=" * 60)
        self.logger.info(f"Overall Status: {overall_status.upper()}")
        self.logger.info(f"Total Checks: {len(self.results)}")
        self.logger.info(f"Healthy: {healthy_count}")
        self.logger.info(f"Warning: {warning_count}")
        self.logger.info(f"Unhealthy: {unhealthy_count}")
        self.logger.info(f"Unknown: {unknown_count}")
        self.logger.info(f"Total Time: {total_time:.2f}s")

        return summary

    def save_results(self, output_file: Optional[str] = None):
        """Save results to JSON file"""
        if not output_file:
            output_file = (
                f"health_check_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )

        output_path = Path(__file__).parent.parent / "logs" / output_file

        summary = self.run_all_checks()

        with open(output_path, "w") as f:
            json.dump(summary, f, indent=2)

        self.logger.info(f"Health check results saved to: {output_path}")
        return output_path


def main():
    """Main execution function"""
    import argparse

    parser = argparse.ArgumentParser(description="6FB System Health Check")
    parser.add_argument(
        "--environment", default="development", help="Environment to check"
    )
    parser.add_argument("--output", help="Output file for results")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument(
        "--continuous", type=int, help="Run continuously every N seconds"
    )

    args = parser.parse_args()

    if args.continuous:
        # Run continuously
        while True:
            checker = SystemHealthChecker(args.environment)
            summary = checker.run_all_checks()

            if args.json:
                print(json.dumps(summary, indent=2))

            print(f"\nNext check in {args.continuous} seconds...\n")
            time.sleep(args.continuous)
    else:
        # Run once
        checker = SystemHealthChecker(args.environment)

        if args.output:
            checker.save_results(args.output)
        else:
            summary = checker.run_all_checks()

            if args.json:
                print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
