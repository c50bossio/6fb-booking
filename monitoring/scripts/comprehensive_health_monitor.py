#!/usr/bin/env python3
"""
Comprehensive System Health Monitor for 6FB Booking Platform
Monitors backend API, frontend performance, database health, bundle sizes, and detects regressions
"""

import asyncio
import aiohttp
import json
import logging
import os
import psutil
import sqlite3
import subprocess
import time
import statistics
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import requests
from dataclasses import dataclass, asdict
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("/Users/bossio/6fb-booking/logs/health_monitor.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


@dataclass
class HealthMetric:
    name: str
    value: float
    threshold: float
    status: str  # 'healthy', 'warning', 'critical'
    message: str
    timestamp: str


@dataclass
class SystemHealthReport:
    timestamp: str
    overall_status: str
    api_health: Dict
    frontend_health: Dict
    database_health: Dict
    bundle_health: Dict
    alerts: List[Dict]
    recommendations: List[str]


class ComprehensiveHealthMonitor:
    def __init__(self):
        self.base_dir = Path("/Users/bossio/6fb-booking")
        self.monitoring_dir = self.base_dir / "monitoring"
        self.logs_dir = self.base_dir / "logs"
        self.metrics_dir = self.monitoring_dir / "metrics"

        # Create directories
        for dir_path in [self.monitoring_dir, self.logs_dir, self.metrics_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)

        self.health_history = []
        self.baseline_metrics = self._load_baseline_metrics()

        # Monitoring configuration
        self.config = {
            "api_base_url": os.getenv(
                "API_BASE_URL", "https://sixfb-backend.onrender.com"
            ),
            "frontend_url": os.getenv("FRONTEND_URL", "https://6fb-booking.vercel.app"),
            "database_path": str(self.base_dir / "backend" / "6fb_booking.db"),
            "monitoring_email": os.getenv("MONITORING_EMAIL", "monitoring@6fb.com"),
            "alert_email": os.getenv("ALERT_EMAIL", "alerts@6fb.com"),
            "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
            "smtp_port": int(os.getenv("SMTP_PORT", "587")),
            "smtp_username": os.getenv("SMTP_USERNAME", ""),
            "smtp_password": os.getenv("SMTP_PASSWORD", ""),
            "check_interval": int(os.getenv("CHECK_INTERVAL", "300")),  # 5 minutes
        }

        # Health thresholds
        self.thresholds = {
            "api_response_time": 2000,  # ms
            "frontend_load_time": 3000,  # ms
            "database_query_time": 100,  # ms
            "error_rate": 5,  # %
            "bundle_size_increase": 20,  # %
            "memory_usage": 80,  # %
            "cpu_usage": 80,  # %
            "disk_usage": 85,  # %
        }

    def _load_baseline_metrics(self) -> Dict:
        """Load baseline performance metrics"""
        baseline_file = self.metrics_dir / "baseline_metrics.json"
        if baseline_file.exists():
            try:
                with open(baseline_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load baseline metrics: {e}")

        # Default baseline metrics
        return {
            "bundle_sizes": {
                "main_js": 200000,  # bytes
                "main_css": 50000,  # bytes
                "vendor_js": 800000,  # bytes
            },
            "api_response_times": {
                "health": 200,
                "services": 500,
                "appointments": 800,
                "analytics": 1500,
            },
            "frontend_load_times": {
                "homepage": 2000,
                "booking": 1800,
                "dashboard": 2200,
            },
        }

    async def check_api_health(self) -> Dict:
        """Comprehensive API health check"""
        api_health = {
            "status": "healthy",
            "metrics": [],
            "errors": [],
            "response_times": {},
            "status_codes": {},
        }

        # Define critical API endpoints with expected behaviors
        endpoints = [
            {
                "path": "/health",
                "method": "GET",
                "expected_status": 200,
                "auth_required": False,
            },
            {
                "path": "/api/v1/services",
                "method": "GET",
                "expected_status": 200,
                "auth_required": False,
            },
            {
                "path": "/api/v1/appointments",
                "method": "GET",
                "expected_status": [200, 401],
                "auth_required": True,
            },
            {
                "path": "/api/v1/analytics/dashboard",
                "method": "GET",
                "expected_status": [200, 401],
                "auth_required": True,
            },
            {
                "path": "/api/v1/auth/login",
                "method": "POST",
                "expected_status": [200, 400, 422],
                "auth_required": False,
            },
            {
                "path": "/api/v1/customers",
                "method": "GET",
                "expected_status": [200, 401],
                "auth_required": True,
            },
            {
                "path": "/api/v1/barbers",
                "method": "GET",
                "expected_status": [200, 401],
                "auth_required": True,
            },
        ]

        async with aiohttp.ClientSession() as session:
            for endpoint in endpoints:
                url = f"{self.config['api_base_url']}{endpoint['path']}"

                try:
                    start_time = time.time()

                    # Prepare request
                    kwargs = {"timeout": aiohttp.ClientTimeout(total=10)}
                    if endpoint["method"] == "POST" and "login" in endpoint["path"]:
                        kwargs["json"] = {
                            "email": "test@example.com",
                            "password": "test",
                        }

                    async with session.request(
                        endpoint["method"], url, **kwargs
                    ) as response:
                        response_time = (time.time() - start_time) * 1000
                        status_code = response.status

                        # Check if status code is expected
                        expected_statuses = endpoint["expected_status"]
                        if not isinstance(expected_statuses, list):
                            expected_statuses = [expected_statuses]

                        is_status_ok = status_code in expected_statuses

                        # Special check for 405 errors (Method Not Allowed)
                        if status_code == 405:
                            api_health["errors"].append(
                                {
                                    "endpoint": endpoint["path"],
                                    "error": "405 Method Not Allowed - Route configuration issue",
                                    "severity": "critical",
                                }
                            )
                            api_health["status"] = "critical"

                        # Record metrics
                        api_health["response_times"][endpoint["path"]] = response_time
                        api_health["status_codes"][endpoint["path"]] = status_code

                        # Evaluate response time
                        time_threshold = self.thresholds["api_response_time"]
                        time_status = (
                            "healthy" if response_time < time_threshold else "warning"
                        )
                        if response_time > time_threshold * 2:
                            time_status = "critical"

                        api_health["metrics"].append(
                            HealthMetric(
                                name=f"api_response_time_{endpoint['path'].replace('/', '_')}",
                                value=response_time,
                                threshold=time_threshold,
                                status=time_status,
                                message=f"Response time: {response_time:.0f}ms",
                                timestamp=datetime.utcnow().isoformat(),
                            )
                        )

                        # Check for unexpected status codes
                        if not is_status_ok and not (
                            status_code == 401 and endpoint["auth_required"]
                        ):
                            api_health["errors"].append(
                                {
                                    "endpoint": endpoint["path"],
                                    "error": f"Unexpected status code: {status_code}",
                                    "severity": (
                                        "warning" if status_code < 500 else "critical"
                                    ),
                                }
                            )
                            if status_code >= 500:
                                api_health["status"] = "critical"

                except asyncio.TimeoutError:
                    api_health["errors"].append(
                        {
                            "endpoint": endpoint["path"],
                            "error": "Request timeout",
                            "severity": "critical",
                        }
                    )
                    api_health["status"] = "critical"
                except Exception as e:
                    api_health["errors"].append(
                        {
                            "endpoint": endpoint["path"],
                            "error": str(e),
                            "severity": "critical",
                        }
                    )
                    api_health["status"] = "critical"

        return api_health

    async def check_frontend_health(self) -> Dict:
        """Check frontend health and bundle sizes"""
        frontend_health = {
            "status": "healthy",
            "metrics": [],
            "errors": [],
            "load_times": {},
            "bundle_analysis": {},
        }

        # Pages to check
        pages = [
            {"path": "/", "name": "homepage"},
            {"path": "/book", "name": "booking"},
            {"path": "/login", "name": "login"},
            {"path": "/dashboard", "name": "dashboard"},
        ]

        async with aiohttp.ClientSession() as session:
            for page in pages:
                url = f"{self.config['frontend_url']}{page['path']}"

                try:
                    start_time = time.time()
                    async with session.get(
                        url, timeout=aiohttp.ClientTimeout(total=15)
                    ) as response:
                        load_time = (time.time() - start_time) * 1000
                        content = await response.text()

                        frontend_health["load_times"][page["name"]] = load_time

                        # Check if page loaded properly
                        if response.status != 200:
                            frontend_health["errors"].append(
                                {
                                    "page": page["name"],
                                    "error": f"HTTP {response.status}",
                                    "severity": "critical",
                                }
                            )
                            frontend_health["status"] = "critical"

                        # Check for basic page structure
                        if "</html>" not in content.lower():
                            frontend_health["errors"].append(
                                {
                                    "page": page["name"],
                                    "error": "Incomplete HTML response",
                                    "severity": "warning",
                                }
                            )

                        # Evaluate load time
                        time_threshold = self.thresholds["frontend_load_time"]
                        time_status = (
                            "healthy" if load_time < time_threshold else "warning"
                        )
                        if load_time > time_threshold * 2:
                            time_status = "critical"

                        frontend_health["metrics"].append(
                            HealthMetric(
                                name=f"frontend_load_time_{page['name']}",
                                value=load_time,
                                threshold=time_threshold,
                                status=time_status,
                                message=f"Load time: {load_time:.0f}ms",
                                timestamp=datetime.utcnow().isoformat(),
                            )
                        )

                except Exception as e:
                    frontend_health["errors"].append(
                        {"page": page["name"], "error": str(e), "severity": "critical"}
                    )
                    frontend_health["status"] = "critical"

        # Check bundle sizes
        bundle_health = await self._check_bundle_sizes()
        frontend_health["bundle_analysis"] = bundle_health

        return frontend_health

    async def _check_bundle_sizes(self) -> Dict:
        """Check frontend bundle sizes for regressions"""
        bundle_health = {
            "status": "healthy",
            "current_sizes": {},
            "baseline_sizes": self.baseline_metrics.get("bundle_sizes", {}),
            "size_changes": {},
            "warnings": [],
        }

        # Check if we can access the built frontend files
        frontend_dir = self.base_dir / "frontend"
        build_dir = frontend_dir / ".next"

        if not build_dir.exists():
            bundle_health["warnings"].append("No Next.js build directory found")
            return bundle_health

        try:
            # Run bundle analyzer to get current sizes
            result = subprocess.run(
                ["npx", "next", "build", "--no-lint"],
                cwd=str(frontend_dir),
                capture_output=True,
                text=True,
                timeout=120,
            )

            if result.returncode == 0:
                # Parse build output for bundle sizes
                output_lines = result.stdout.split("\n")
                for line in output_lines:
                    if ".js" in line and ("kB" in line or "MB" in line):
                        # Extract bundle info from Next.js build output
                        parts = line.split()
                        if len(parts) >= 3:
                            filename = parts[0]
                            size_str = parts[1]

                            # Convert size to bytes
                            if "kB" in size_str:
                                size_bytes = float(size_str.replace("kB", "")) * 1024
                            elif "MB" in size_str:
                                size_bytes = (
                                    float(size_str.replace("MB", "")) * 1024 * 1024
                                )
                            else:
                                continue

                            bundle_health["current_sizes"][filename] = size_bytes

            # Compare with baseline
            for bundle_name, current_size in bundle_health["current_sizes"].items():
                baseline_size = bundle_health["baseline_sizes"].get(bundle_name)
                if baseline_size:
                    size_change = ((current_size - baseline_size) / baseline_size) * 100
                    bundle_health["size_changes"][bundle_name] = size_change

                    if size_change > self.thresholds["bundle_size_increase"]:
                        bundle_health["warnings"].append(
                            f"Bundle {bundle_name} increased by {size_change:.1f}%"
                        )
                        bundle_health["status"] = "warning"

        except subprocess.TimeoutExpired:
            bundle_health["warnings"].append("Bundle size check timed out")
        except Exception as e:
            bundle_health["warnings"].append(f"Bundle size check failed: {str(e)}")

        return bundle_health

    def check_database_health(self) -> Dict:
        """Check database health and performance"""
        db_health = {
            "status": "healthy",
            "metrics": [],
            "errors": [],
            "connection_time": None,
            "query_performance": {},
        }

        try:
            # Test database connection and basic queries
            start_time = time.time()
            conn = sqlite3.connect(self.config["database_path"], timeout=10)
            connection_time = (time.time() - start_time) * 1000

            db_health["connection_time"] = connection_time

            # Test queries
            test_queries = [
                ("SELECT COUNT(*) FROM users", "users_count"),
                ("SELECT COUNT(*) FROM appointments", "appointments_count"),
                ("SELECT COUNT(*) FROM services", "services_count"),
                ("SELECT sqlite_version()", "sqlite_version"),
            ]

            cursor = conn.cursor()
            for query, name in test_queries:
                try:
                    start_time = time.time()
                    cursor.execute(query)
                    result = cursor.fetchone()
                    query_time = (time.time() - start_time) * 1000

                    db_health["query_performance"][name] = {
                        "time": query_time,
                        "result": result[0] if result else None,
                    }

                    # Check query performance
                    if query_time > self.thresholds["database_query_time"]:
                        db_health["metrics"].append(
                            HealthMetric(
                                name=f"db_query_time_{name}",
                                value=query_time,
                                threshold=self.thresholds["database_query_time"],
                                status="warning" if query_time < 500 else "critical",
                                message=f"Query time: {query_time:.1f}ms",
                                timestamp=datetime.utcnow().isoformat(),
                            )
                        )

                except sqlite3.Error as e:
                    db_health["errors"].append(
                        {"query": name, "error": str(e), "severity": "warning"}
                    )

            conn.close()

            # Check database file size and integrity
            db_path = Path(self.config["database_path"])
            if db_path.exists():
                db_size = db_path.stat().st_size
                db_health["database_size"] = db_size

                # Check for very large database
                if db_size > 1024 * 1024 * 1024:  # 1GB
                    db_health["metrics"].append(
                        HealthMetric(
                            name="database_size",
                            value=db_size / (1024 * 1024),  # MB
                            threshold=1024,  # 1GB in MB
                            status="warning",
                            message=f"Database size: {db_size / (1024 * 1024):.1f}MB",
                            timestamp=datetime.utcnow().isoformat(),
                        )
                    )

        except sqlite3.Error as e:
            db_health["errors"].append(
                {
                    "component": "database_connection",
                    "error": str(e),
                    "severity": "critical",
                }
            )
            db_health["status"] = "critical"
        except Exception as e:
            db_health["errors"].append(
                {
                    "component": "database_health_check",
                    "error": str(e),
                    "severity": "critical",
                }
            )
            db_health["status"] = "critical"

        return db_health

    def check_system_resources(self) -> Dict:
        """Check system resource usage"""
        resource_health = {
            "status": "healthy",
            "metrics": [],
            "cpu_usage": 0,
            "memory_usage": 0,
            "disk_usage": 0,
        }

        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            resource_health["cpu_usage"] = cpu_percent

            if cpu_percent > self.thresholds["cpu_usage"]:
                status = "critical" if cpu_percent > 90 else "warning"
                resource_health["metrics"].append(
                    HealthMetric(
                        name="cpu_usage",
                        value=cpu_percent,
                        threshold=self.thresholds["cpu_usage"],
                        status=status,
                        message=f"CPU usage: {cpu_percent:.1f}%",
                        timestamp=datetime.utcnow().isoformat(),
                    )
                )
                resource_health["status"] = status

            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            resource_health["memory_usage"] = memory_percent

            if memory_percent > self.thresholds["memory_usage"]:
                status = "critical" if memory_percent > 95 else "warning"
                resource_health["metrics"].append(
                    HealthMetric(
                        name="memory_usage",
                        value=memory_percent,
                        threshold=self.thresholds["memory_usage"],
                        status=status,
                        message=f"Memory usage: {memory_percent:.1f}%",
                        timestamp=datetime.utcnow().isoformat(),
                    )
                )
                if status == "critical":
                    resource_health["status"] = "critical"
                elif resource_health["status"] != "critical":
                    resource_health["status"] = "warning"

            # Disk usage
            disk = psutil.disk_usage("/")
            disk_percent = (disk.used / disk.total) * 100
            resource_health["disk_usage"] = disk_percent

            if disk_percent > self.thresholds["disk_usage"]:
                status = "critical" if disk_percent > 95 else "warning"
                resource_health["metrics"].append(
                    HealthMetric(
                        name="disk_usage",
                        value=disk_percent,
                        threshold=self.thresholds["disk_usage"],
                        status=status,
                        message=f"Disk usage: {disk_percent:.1f}%",
                        timestamp=datetime.utcnow().isoformat(),
                    )
                )
                if status == "critical":
                    resource_health["status"] = "critical"
                elif resource_health["status"] != "critical":
                    resource_health["status"] = "warning"

        except Exception as e:
            logger.error(f"Failed to check system resources: {e}")

        return resource_health

    async def generate_health_report(self) -> SystemHealthReport:
        """Generate comprehensive health report"""
        timestamp = datetime.utcnow().isoformat()

        # Run all health checks
        api_health = await self.check_api_health()
        frontend_health = await self.check_frontend_health()
        database_health = self.check_database_health()
        system_health = self.check_system_resources()

        # Determine overall status
        statuses = [
            api_health["status"],
            frontend_health["status"],
            database_health["status"],
            system_health["status"],
        ]

        if "critical" in statuses:
            overall_status = "critical"
        elif "warning" in statuses:
            overall_status = "warning"
        else:
            overall_status = "healthy"

        # Collect all alerts
        alerts = []

        # API alerts
        for error in api_health.get("errors", []):
            alerts.append(
                {
                    "type": "api_error",
                    "severity": error["severity"],
                    "message": f"API Error - {error['endpoint']}: {error['error']}",
                    "timestamp": timestamp,
                }
            )

        # Frontend alerts
        for error in frontend_health.get("errors", []):
            alerts.append(
                {
                    "type": "frontend_error",
                    "severity": error["severity"],
                    "message": f"Frontend Error - {error['page']}: {error['error']}",
                    "timestamp": timestamp,
                }
            )

        # Bundle size alerts
        for warning in frontend_health.get("bundle_analysis", {}).get("warnings", []):
            alerts.append(
                {
                    "type": "bundle_warning",
                    "severity": "warning",
                    "message": f"Bundle Size Warning: {warning}",
                    "timestamp": timestamp,
                }
            )

        # Database alerts
        for error in database_health.get("errors", []):
            alerts.append(
                {
                    "type": "database_error",
                    "severity": error["severity"],
                    "message": f"Database Error - {error.get('component', 'unknown')}: {error['error']}",
                    "timestamp": timestamp,
                }
            )

        # System resource alerts
        for metric in system_health.get("metrics", []):
            if metric.status in ["warning", "critical"]:
                alerts.append(
                    {
                        "type": "resource_alert",
                        "severity": metric.status,
                        "message": f"Resource Alert: {metric.message}",
                        "timestamp": timestamp,
                    }
                )

        # Generate recommendations
        recommendations = self._generate_recommendations(
            api_health, frontend_health, database_health, system_health
        )

        return SystemHealthReport(
            timestamp=timestamp,
            overall_status=overall_status,
            api_health=api_health,
            frontend_health=frontend_health,
            database_health=database_health,
            bundle_health=frontend_health.get("bundle_analysis", {}),
            alerts=alerts,
            recommendations=recommendations,
        )

    def _generate_recommendations(
        self, api_health, frontend_health, database_health, system_health
    ) -> List[str]:
        """Generate actionable recommendations based on health status"""
        recommendations = []

        # API recommendations
        if api_health["status"] != "healthy":
            if any(
                "405" in str(error.get("error", ""))
                for error in api_health.get("errors", [])
            ):
                recommendations.append(
                    "Fix 405 Method Not Allowed errors by checking route configurations in FastAPI"
                )

            slow_endpoints = [
                endpoint
                for endpoint, time in api_health.get("response_times", {}).items()
                if time > self.thresholds["api_response_time"]
            ]
            if slow_endpoints:
                recommendations.append(
                    f"Optimize slow API endpoints: {', '.join(slow_endpoints)}"
                )

        # Frontend recommendations
        if frontend_health["status"] != "healthy":
            slow_pages = [
                page
                for page, time in frontend_health.get("load_times", {}).items()
                if time > self.thresholds["frontend_load_time"]
            ]
            if slow_pages:
                recommendations.append(
                    f"Optimize slow frontend pages: {', '.join(slow_pages)}"
                )

        # Bundle size recommendations
        bundle_warnings = frontend_health.get("bundle_analysis", {}).get("warnings", [])
        if bundle_warnings:
            recommendations.append(
                "Bundle sizes have increased significantly - consider code splitting and dependency optimization"
            )

        # Database recommendations
        if database_health["status"] != "healthy":
            recommendations.append(
                "Review database performance and consider query optimization"
            )

        # System resource recommendations
        if system_health["cpu_usage"] > self.thresholds["cpu_usage"]:
            recommendations.append(
                "High CPU usage detected - consider scaling or optimization"
            )

        if system_health["memory_usage"] > self.thresholds["memory_usage"]:
            recommendations.append(
                "High memory usage detected - check for memory leaks or scale resources"
            )

        if system_health["disk_usage"] > self.thresholds["disk_usage"]:
            recommendations.append(
                "High disk usage detected - clean up logs or increase disk space"
            )

        return recommendations

    def save_health_report(self, report: SystemHealthReport):
        """Save health report to file"""
        # Save detailed report
        report_file = (
            self.metrics_dir
            / f"health_report_{report.timestamp.replace(':', '-')}.json"
        )
        with open(report_file, "w") as f:
            json.dump(asdict(report), f, indent=2, default=str)

        # Update rolling health data
        rolling_file = self.metrics_dir / "rolling_health.json"
        rolling_data = {"reports": []}

        if rolling_file.exists():
            try:
                with open(rolling_file, "r") as f:
                    rolling_data = json.load(f)
            except:
                pass

        # Add new report
        rolling_data["reports"].append(asdict(report))

        # Keep only last 24 hours
        cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        rolling_data["reports"] = [
            r for r in rolling_data["reports"] if r["timestamp"] > cutoff
        ]

        with open(rolling_file, "w") as f:
            json.dump(rolling_data, f, indent=2, default=str)

    async def send_alert_email(self, report: SystemHealthReport):
        """Send alert email for critical issues"""
        if not report.alerts or not self.config["alert_email"]:
            return

        critical_alerts = [a for a in report.alerts if a["severity"] == "critical"]
        if not critical_alerts:
            return

        try:
            msg = MIMEMultipart()
            msg["From"] = self.config["monitoring_email"]
            msg["To"] = self.config["alert_email"]
            msg["Subject"] = f"🚨 Critical Health Alert - 6FB Booking Platform"

            body = f"""
Critical health issues detected in 6FB Booking Platform:

Overall Status: {report.overall_status.upper()}

Critical Alerts:
"""
            for alert in critical_alerts:
                body += f"- {alert['message']}\n"

            if report.recommendations:
                body += f"\nRecommendations:\n"
                for rec in report.recommendations:
                    body += f"- {rec}\n"

            body += f"\nTimestamp: {report.timestamp}"

            msg.attach(MIMEText(body, "plain"))

            server = smtplib.SMTP(self.config["smtp_server"], self.config["smtp_port"])
            server.starttls()
            server.login(self.config["smtp_username"], self.config["smtp_password"])
            text = msg.as_string()
            server.sendmail(
                self.config["monitoring_email"], self.config["alert_email"], text
            )
            server.quit()

            logger.info(f"Alert email sent for {len(critical_alerts)} critical issues")

        except Exception as e:
            logger.error(f"Failed to send alert email: {e}")

    async def run_health_check(self) -> SystemHealthReport:
        """Run complete health check and return report"""
        logger.info("Starting comprehensive health check...")

        try:
            report = await self.generate_health_report()

            # Save report
            self.save_health_report(report)

            # Log summary
            logger.info(f"Health check complete - Status: {report.overall_status}")
            logger.info(f"API Health: {report.api_health['status']}")
            logger.info(f"Frontend Health: {report.frontend_health['status']}")
            logger.info(f"Database Health: {report.database_health['status']}")

            if report.alerts:
                logger.warning(f"Found {len(report.alerts)} alerts")
                for alert in report.alerts:
                    logger.log(
                        (
                            logging.ERROR
                            if alert["severity"] == "critical"
                            else logging.WARNING
                        ),
                        f"{alert['type']}: {alert['message']}",
                    )

            # Send alerts if needed
            await self.send_alert_email(report)

            return report

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            raise


async def main():
    """Main monitoring function"""
    monitor = ComprehensiveHealthMonitor()

    logger.info("Starting comprehensive health monitoring...")

    while True:
        try:
            report = await monitor.run_health_check()

            # Wait for next check
            await asyncio.sleep(monitor.config["check_interval"])

        except KeyboardInterrupt:
            logger.info("Health monitoring stopped by user")
            break
        except Exception as e:
            logger.error(f"Health monitoring error: {e}")
            await asyncio.sleep(60)  # Wait 1 minute on error


if __name__ == "__main__":
    asyncio.run(main())
