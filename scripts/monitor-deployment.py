#!/usr/bin/env python3
"""
Deployment Monitoring Script for 6FB Booking Platform
Monitors the health and performance of the deployed application
"""

import requests
import time
import json
import logging
from datetime import datetime
from typing import Dict, List, Tuple
import sys
import os

# Configuration
BACKEND_URL = "https://sixfb-backend.onrender.com"
HEALTH_ENDPOINT = f"{BACKEND_URL}/health"
DOCS_ENDPOINT = f"{BACKEND_URL}/docs"
API_BASE = f"{BACKEND_URL}/api/v1"

# Critical endpoints to monitor
CRITICAL_ENDPOINTS = [
    {
        "path": "/health",
        "method": "GET",
        "expected_status": 200,
        "name": "Health Check",
    },
    {
        "path": "/docs",
        "method": "GET",
        "expected_status": 200,
        "name": "API Documentation",
    },
    {
        "path": "/api/v1/services",
        "method": "GET",
        "expected_status": 200,
        "name": "Services List",
    },
    {
        "path": "/api/v1/auth/login",
        "method": "POST",
        "expected_status": 422,
        "name": "Auth Endpoint",
    },  # 422 expected without body
]

# Monitoring configuration
INITIAL_INTERVAL = 30  # seconds for first 5 minutes
REGULAR_INTERVAL = 60  # seconds after initial period
INITIAL_DURATION = 300  # 5 minutes
TIMEOUT = 10  # seconds for each request
ALERT_THRESHOLD = 3  # consecutive failures before alert

# Logging setup
log_dir = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(
    log_dir, f"deployment_monitor_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)


class DeploymentMonitor:
    def __init__(self):
        self.start_time = time.time()
        self.failure_counts = {}
        self.response_times = []
        self.monitoring_results = []

    def check_endpoint(self, endpoint: Dict) -> Tuple[bool, float, str]:
        """Check a single endpoint and return status, response time, and message"""
        url = BACKEND_URL + endpoint["path"]
        start_time = time.time()

        try:
            if endpoint["method"] == "GET":
                response = requests.get(url, timeout=TIMEOUT)
            elif endpoint["method"] == "POST":
                response = requests.post(url, json={}, timeout=TIMEOUT)
            else:
                return False, 0, f"Unsupported method: {endpoint['method']}"

            response_time = (time.time() - start_time) * 1000  # Convert to ms

            if response.status_code == endpoint["expected_status"]:
                return True, response_time, f"Status: {response.status_code}"
            else:
                return (
                    False,
                    response_time,
                    f"Unexpected status: {response.status_code} (expected {endpoint['expected_status']})",
                )

        except requests.exceptions.Timeout:
            return False, TIMEOUT * 1000, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, 0, "Connection error"
        except Exception as e:
            return False, 0, f"Error: {str(e)}"

    def check_database_connectivity(self) -> Tuple[bool, str]:
        """Check database connectivity through health endpoint"""
        try:
            response = requests.get(HEALTH_ENDPOINT, timeout=TIMEOUT)
            if response.status_code == 200:
                data = response.json()
                db_status = data.get("database", {}).get("status", "unknown")
                if db_status == "healthy":
                    return True, "Database connection healthy"
                else:
                    return False, f"Database status: {db_status}"
            else:
                return False, f"Health check failed with status: {response.status_code}"
        except Exception as e:
            return False, f"Health check error: {str(e)}"

    def send_alert(self, message: str, severity: str = "ERROR"):
        """Send alert for critical issues"""
        alert_msg = f"🚨 DEPLOYMENT ALERT - {severity}: {message}"
        logger.error(alert_msg)

        # Here you could add additional alerting mechanisms:
        # - Send email via SendGrid
        # - Send SMS via Twilio
        # - Post to Slack webhook
        # - Create PagerDuty incident

        # For now, we'll create an alert file
        alert_file = os.path.join(
            log_dir, f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        )
        with open(alert_file, "w") as f:
            f.write(f"{datetime.now().isoformat()}\n")
            f.write(f"Severity: {severity}\n")
            f.write(f"Message: {message}\n")
            f.write(f"Monitoring Duration: {self.get_elapsed_time()}\n")

    def get_elapsed_time(self) -> str:
        """Get elapsed time since monitoring started"""
        elapsed = time.time() - self.start_time
        minutes = int(elapsed // 60)
        seconds = int(elapsed % 60)
        return f"{minutes}m {seconds}s"

    def get_current_interval(self) -> int:
        """Get the current monitoring interval based on elapsed time"""
        elapsed = time.time() - self.start_time
        if elapsed < INITIAL_DURATION:
            return INITIAL_INTERVAL
        return REGULAR_INTERVAL

    def run_monitoring_cycle(self):
        """Run a single monitoring cycle"""
        cycle_results = {
            "timestamp": datetime.now().isoformat(),
            "elapsed_time": self.get_elapsed_time(),
            "checks": [],
        }

        logger.info(f"\n{'='*60}")
        logger.info(f"Monitoring Cycle - {cycle_results['timestamp']}")
        logger.info(f"Elapsed Time: {cycle_results['elapsed_time']}")
        logger.info(f"{'='*60}")

        all_healthy = True

        # Check each critical endpoint
        for endpoint in CRITICAL_ENDPOINTS:
            success, response_time, message = self.check_endpoint(endpoint)

            endpoint_name = endpoint["name"]
            status = "✅ PASS" if success else "❌ FAIL"

            logger.info(f"{status} {endpoint_name}: {message} ({response_time:.2f}ms)")

            # Track failures
            if not success:
                all_healthy = False
                self.failure_counts[endpoint_name] = (
                    self.failure_counts.get(endpoint_name, 0) + 1
                )

                # Send alert if threshold reached
                if self.failure_counts[endpoint_name] == ALERT_THRESHOLD:
                    self.send_alert(
                        f"{endpoint_name} has failed {ALERT_THRESHOLD} consecutive times. {message}",
                        "CRITICAL",
                    )
            else:
                # Reset failure count on success
                self.failure_counts[endpoint_name] = 0
                self.response_times.append(response_time)

            cycle_results["checks"].append(
                {
                    "endpoint": endpoint_name,
                    "success": success,
                    "response_time": response_time,
                    "message": message,
                }
            )

        # Check database connectivity
        db_healthy, db_message = self.check_database_connectivity()
        db_status = "✅ PASS" if db_healthy else "❌ FAIL"
        logger.info(f"{db_status} Database Connectivity: {db_message}")

        if not db_healthy:
            all_healthy = False
            self.failure_counts["database"] = self.failure_counts.get("database", 0) + 1
            if self.failure_counts["database"] == ALERT_THRESHOLD:
                self.send_alert(
                    f"Database connectivity failed {ALERT_THRESHOLD} times. {db_message}",
                    "CRITICAL",
                )
        else:
            self.failure_counts["database"] = 0

        cycle_results["checks"].append(
            {
                "endpoint": "Database Connectivity",
                "success": db_healthy,
                "message": db_message,
            }
        )

        # Calculate average response time
        if self.response_times:
            avg_response_time = sum(self.response_times[-100:]) / len(
                self.response_times[-100:]
            )
            logger.info(f"\n📊 Average Response Time: {avg_response_time:.2f}ms")

            # Alert if response times are too high
            if avg_response_time > 1000:  # 1 second
                logger.warning(
                    f"⚠️  High average response time: {avg_response_time:.2f}ms"
                )

        cycle_results["all_healthy"] = all_healthy
        self.monitoring_results.append(cycle_results)

        return all_healthy

    def save_summary_report(self):
        """Save a summary report of the monitoring session"""
        report_file = os.path.join(
            log_dir,
            f"deployment_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
        )

        total_cycles = len(self.monitoring_results)
        successful_cycles = sum(1 for r in self.monitoring_results if r["all_healthy"])

        summary = {
            "monitoring_duration": self.get_elapsed_time(),
            "total_cycles": total_cycles,
            "successful_cycles": successful_cycles,
            "success_rate": (
                f"{(successful_cycles/total_cycles*100):.2f}%"
                if total_cycles > 0
                else "0%"
            ),
            "average_response_time": (
                f"{sum(self.response_times)/len(self.response_times):.2f}ms"
                if self.response_times
                else "N/A"
            ),
            "failure_counts": self.failure_counts,
            "monitoring_results": self.monitoring_results,
        }

        with open(report_file, "w") as f:
            json.dump(summary, f, indent=2)

        logger.info(f"\n📄 Summary report saved to: {report_file}")
        return summary

    def run(self, duration_minutes: int = None):
        """Run the monitoring for a specified duration or indefinitely"""
        logger.info(f"\n🚀 Starting Deployment Monitoring for {BACKEND_URL}")
        logger.info(
            f"Initial monitoring interval: {INITIAL_INTERVAL}s for first {INITIAL_DURATION/60} minutes"
        )
        logger.info(
            f"Regular monitoring interval: {REGULAR_INTERVAL}s after initial period"
        )

        if duration_minutes:
            logger.info(f"Total monitoring duration: {duration_minutes} minutes")
            end_time = time.time() + (duration_minutes * 60)
        else:
            logger.info("Monitoring indefinitely. Press Ctrl+C to stop.")
            end_time = float("inf")

        try:
            while time.time() < end_time:
                self.run_monitoring_cycle()

                # Calculate next interval
                interval = self.get_current_interval()
                logger.info(f"\n⏱️  Next check in {interval} seconds...")

                # Check if we should continue
                if duration_minutes and time.time() + interval > end_time:
                    break

                time.sleep(interval)

        except KeyboardInterrupt:
            logger.info("\n\n🛑 Monitoring stopped by user")
        except Exception as e:
            logger.error(f"\n\n❌ Monitoring error: {str(e)}")
            self.send_alert(f"Monitoring script crashed: {str(e)}", "CRITICAL")
        finally:
            # Save summary report
            summary = self.save_summary_report()

            logger.info("\n" + "=" * 60)
            logger.info("MONITORING SUMMARY")
            logger.info("=" * 60)
            logger.info(f"Duration: {summary['monitoring_duration']}")
            logger.info(f"Total Cycles: {summary['total_cycles']}")
            logger.info(f"Successful Cycles: {summary['successful_cycles']}")
            logger.info(f"Success Rate: {summary['success_rate']}")
            logger.info(f"Average Response Time: {summary['average_response_time']}")

            if summary["failure_counts"]:
                logger.warning(f"\n⚠️  Failure Summary:")
                for endpoint, count in summary["failure_counts"].items():
                    if count > 0:
                        logger.warning(f"  - {endpoint}: {count} failures")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Monitor 6FB Booking Platform Deployment"
    )
    parser.add_argument(
        "--duration",
        type=int,
        help="Monitoring duration in minutes (default: indefinite)",
        default=None,
    )
    parser.add_argument(
        "--quick", action="store_true", help="Run a quick 5-minute check"
    )

    args = parser.parse_args()

    monitor = DeploymentMonitor()

    if args.quick:
        monitor.run(duration_minutes=5)
    else:
        monitor.run(duration_minutes=args.duration)


if __name__ == "__main__":
    main()
