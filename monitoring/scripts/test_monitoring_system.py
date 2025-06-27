#!/usr/bin/env python3
"""
Test suite for the comprehensive monitoring system
Tests all monitoring components to ensure they work correctly
"""

import asyncio
import json
import logging
import os
import sys
import time
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
import sqlite3

# Add monitoring scripts to path
sys.path.append(str(Path(__file__).parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("/Users/bossio/6fb-booking/logs/monitoring_tests.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class MonitoringSystemTester:
    def __init__(self):
        self.base_dir = Path("/Users/bossio/6fb-booking")
        self.monitoring_dir = self.base_dir / "monitoring"
        self.scripts_dir = self.monitoring_dir / "scripts"
        self.logs_dir = self.base_dir / "logs"

        # Test results
        self.test_results = {
            "timestamp": datetime.utcnow().isoformat(),
            "tests": [],
            "passed": 0,
            "failed": 0,
            "total": 0,
        }

    def log_test_result(
        self, test_name: str, passed: bool, message: str = "", details: Dict = None
    ):
        """Log a test result"""
        result = {
            "test_name": test_name,
            "passed": passed,
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat(),
        }

        self.test_results["tests"].append(result)
        self.test_results["total"] += 1

        if passed:
            self.test_results["passed"] += 1
            logger.info(f"✅ {test_name}: PASSED - {message}")
        else:
            self.test_results["failed"] += 1
            logger.error(f"❌ {test_name}: FAILED - {message}")

    async def test_comprehensive_health_monitor(self) -> bool:
        """Test the comprehensive health monitoring script"""
        test_name = "Comprehensive Health Monitor"

        try:
            # Import and test the health monitor
            from comprehensive_health_monitor import ComprehensiveHealthMonitor

            monitor = ComprehensiveHealthMonitor()

            # Test initialization
            if not monitor.monitoring_dir.exists():
                self.log_test_result(
                    test_name, False, "Monitoring directory not created"
                )
                return False

            # Test health check run (with short timeout)
            try:
                # Run a quick health check
                logger.info("Running health check...")
                report = await asyncio.wait_for(
                    monitor.run_health_check(), timeout=60  # 1 minute timeout
                )

                # Verify report structure
                required_fields = [
                    "timestamp",
                    "overall_status",
                    "api_health",
                    "frontend_health",
                    "database_health",
                ]
                for field in required_fields:
                    if field not in report.__dict__:
                        self.log_test_result(
                            test_name, False, f"Missing field in report: {field}"
                        )
                        return False

                # Check if metrics directory was created and contains files
                metrics_dir = monitor.metrics_dir
                if not metrics_dir.exists():
                    self.log_test_result(
                        test_name, False, "Metrics directory not created"
                    )
                    return False

                # Check for health report files
                health_files = list(metrics_dir.glob("health_report_*.json"))
                if not health_files:
                    self.log_test_result(
                        test_name, False, "No health report files generated"
                    )
                    return False

                self.log_test_result(
                    test_name,
                    True,
                    f"Health check completed with status: {report.overall_status}",
                    {
                        "overall_status": report.overall_status,
                        "alerts_count": len(report.alerts),
                        "recommendations_count": len(report.recommendations),
                    },
                )
                return True

            except asyncio.TimeoutError:
                self.log_test_result(test_name, False, "Health check timed out")
                return False

        except ImportError as e:
            self.log_test_result(test_name, False, f"Failed to import: {e}")
            return False
        except Exception as e:
            self.log_test_result(test_name, False, f"Unexpected error: {e}")
            return False

    async def test_api_endpoint_validator(self) -> bool:
        """Test the API endpoint validator"""
        test_name = "API Endpoint Validator"

        try:
            from api_endpoint_validator import APIEndpointValidator

            validator = APIEndpointValidator()

            # Test initialization
            if not validator.results_dir.exists():
                self.log_test_result(test_name, False, "Results directory not created")
                return False

            # Test endpoint validation (with limited scope for testing)
            try:
                logger.info("Running API endpoint validation...")

                # Just test a few basic endpoints to avoid overloading
                validator.endpoint_tests = validator.endpoint_tests[
                    :5
                ]  # Limit to first 5 tests

                results = await asyncio.wait_for(
                    validator.run_validation(), timeout=30  # 30 second timeout
                )

                # Verify results structure
                required_fields = [
                    "timestamp",
                    "total_endpoints",
                    "results",
                    "analysis",
                ]
                for field in required_fields:
                    if field not in results:
                        self.log_test_result(
                            test_name, False, f"Missing field in results: {field}"
                        )
                        return False

                # Check if results files were created
                validation_files = list(
                    validator.results_dir.glob("api_validation_*.json")
                )
                if not validation_files:
                    self.log_test_result(
                        test_name, False, "No validation result files generated"
                    )
                    return False

                analysis = results["analysis"]
                summary = analysis["summary"]

                self.log_test_result(
                    test_name,
                    True,
                    f"Validated {summary['total_endpoints']} endpoints with {summary['success_rate']:.1f}% success rate",
                    {
                        "total_endpoints": summary["total_endpoints"],
                        "success_rate": summary["success_rate"],
                        "405_errors": summary["method_not_allowed_count"],
                    },
                )
                return True

            except asyncio.TimeoutError:
                self.log_test_result(test_name, False, "API validation timed out")
                return False

        except ImportError as e:
            self.log_test_result(test_name, False, f"Failed to import: {e}")
            return False
        except Exception as e:
            self.log_test_result(test_name, False, f"Unexpected error: {e}")
            return False

    async def test_bundle_size_monitor(self) -> bool:
        """Test the bundle size monitor"""
        test_name = "Bundle Size Monitor"

        try:
            from bundle_size_monitor import BundleSizeMonitor

            monitor = BundleSizeMonitor()

            # Test initialization
            if not monitor.bundle_data_dir.exists():
                self.log_test_result(
                    test_name, False, "Bundle data directory not created"
                )
                return False

            # Test baseline metrics loading
            baseline_metrics = monitor._load_baseline_metrics()
            if not baseline_metrics:
                self.log_test_result(
                    test_name, False, "Failed to load baseline metrics"
                )
                return False

            # Test bundle analysis (this might fail if frontend isn't built, which is okay)
            try:
                logger.info("Testing bundle analysis...")
                results = await asyncio.wait_for(
                    monitor.run_bundle_analysis(), timeout=120  # 2 minute timeout
                )

                # Check if bundle data files were created
                bundle_files = list(
                    monitor.bundle_data_dir.glob("bundle_metrics_*.json")
                )

                # Even if build fails, the monitor should handle it gracefully
                if "error" in results.get("metrics", {}):
                    self.log_test_result(
                        test_name,
                        True,
                        "Bundle analysis handled build failure gracefully",
                        {"build_error": results["metrics"]["error"]},
                    )
                else:
                    self.log_test_result(
                        test_name,
                        True,
                        "Bundle analysis completed successfully",
                        {"metrics_files": len(bundle_files)},
                    )

                return True

            except asyncio.TimeoutError:
                self.log_test_result(test_name, False, "Bundle analysis timed out")
                return False

        except ImportError as e:
            self.log_test_result(test_name, False, f"Failed to import: {e}")
            return False
        except Exception as e:
            self.log_test_result(test_name, False, f"Unexpected error: {e}")
            return False

    def test_alert_manager(self) -> bool:
        """Test the alert manager"""
        test_name = "Alert Manager"

        try:
            from alert_manager import AlertManager, initialize_alert_manager

            manager = initialize_alert_manager()

            # Test database initialization
            if not manager.db_path.exists():
                self.log_test_result(test_name, False, "Alert database not created")
                return False

            # Test alert creation
            test_alert = manager.create_alert(
                alert_type="test_alert",
                severity="info",
                title="Test Alert",
                message="This is a test alert for monitoring system validation",
                source="monitoring_test",
            )

            if not test_alert:
                self.log_test_result(test_name, False, "Failed to create test alert")
                return False

            # Test alert retrieval
            active_alerts = manager.get_active_alerts()
            if not any(a.id == test_alert.id for a in active_alerts):
                self.log_test_result(
                    test_name, False, "Test alert not found in active alerts"
                )
                return False

            # Test alert resolution
            manager.resolve_alert(test_alert.id, "Test completed")

            # Verify alert was resolved
            active_alerts_after = manager.get_active_alerts()
            if any(a.id == test_alert.id for a in active_alerts_after):
                self.log_test_result(
                    test_name, False, "Test alert not properly resolved"
                )
                return False

            # Test statistics
            stats = manager.get_alert_statistics()
            if "total_alerts_24h" not in stats:
                self.log_test_result(
                    test_name, False, "Alert statistics not properly generated"
                )
                return False

            self.log_test_result(
                test_name,
                True,
                "Alert manager functionality verified",
                {
                    "database_exists": True,
                    "alert_creation": True,
                    "alert_resolution": True,
                    "statistics": True,
                },
            )
            return True

        except ImportError as e:
            self.log_test_result(test_name, False, f"Failed to import: {e}")
            return False
        except Exception as e:
            self.log_test_result(test_name, False, f"Unexpected error: {e}")
            return False

    def test_dashboard_server(self) -> bool:
        """Test the dashboard server functionality"""
        test_name = "Dashboard Server"

        try:
            # Test dashboard files exist
            dashboard_dir = self.monitoring_dir / "dashboard"
            dashboard_html = dashboard_dir / "monitoring_dashboard.html"
            dashboard_server = dashboard_dir / "serve_dashboard.py"

            if not dashboard_html.exists():
                self.log_test_result(test_name, False, "Dashboard HTML file not found")
                return False

            if not dashboard_server.exists():
                self.log_test_result(
                    test_name, False, "Dashboard server script not found"
                )
                return False

            # Test that dashboard HTML is valid
            with open(dashboard_html, "r") as f:
                html_content = f.read()
                if "6FB Booking Platform - Monitoring Dashboard" not in html_content:
                    self.log_test_result(
                        test_name, False, "Dashboard HTML content invalid"
                    )
                    return False

            # Test dashboard server import
            try:
                import sys

                sys.path.append(str(dashboard_dir))
                from serve_dashboard import MonitoringHandler

                # Test handler initialization
                handler_class = MonitoringHandler
                if not hasattr(handler_class, "handle_api_request"):
                    self.log_test_result(
                        test_name, False, "Dashboard server missing API handling"
                    )
                    return False

            except ImportError as e:
                self.log_test_result(
                    test_name, False, f"Dashboard server import failed: {e}"
                )
                return False

            self.log_test_result(
                test_name,
                True,
                "Dashboard server components verified",
                {"html_file": True, "server_script": True, "api_handler": True},
            )
            return True

        except Exception as e:
            self.log_test_result(test_name, False, f"Unexpected error: {e}")
            return False

    def test_monitoring_directories(self) -> bool:
        """Test that all monitoring directories are properly created"""
        test_name = "Monitoring Directory Structure"

        try:
            required_dirs = [
                self.monitoring_dir,
                self.monitoring_dir / "scripts",
                self.monitoring_dir / "dashboard",
                self.monitoring_dir / "metrics",
                self.monitoring_dir / "alerts",
                self.logs_dir,
            ]

            missing_dirs = []
            for dir_path in required_dirs:
                if not dir_path.exists():
                    missing_dirs.append(str(dir_path))

            if missing_dirs:
                self.log_test_result(
                    test_name, False, f"Missing directories: {', '.join(missing_dirs)}"
                )
                return False

            self.log_test_result(
                test_name,
                True,
                "All monitoring directories exist",
                {"directories_checked": len(required_dirs)},
            )
            return True

        except Exception as e:
            self.log_test_result(test_name, False, f"Unexpected error: {e}")
            return False

    def test_monitoring_scripts_exist(self) -> bool:
        """Test that all monitoring scripts exist"""
        test_name = "Monitoring Scripts Existence"

        try:
            required_scripts = [
                "comprehensive_health_monitor.py",
                "api_endpoint_validator.py",
                "bundle_size_monitor.py",
                "alert_manager.py",
                "test_monitoring_system.py",
            ]

            missing_scripts = []
            for script_name in required_scripts:
                script_path = self.scripts_dir / script_name
                if not script_path.exists():
                    missing_scripts.append(script_name)

            if missing_scripts:
                self.log_test_result(
                    test_name, False, f"Missing scripts: {', '.join(missing_scripts)}"
                )
                return False

            self.log_test_result(
                test_name,
                True,
                "All monitoring scripts exist",
                {"scripts_checked": len(required_scripts)},
            )
            return True

        except Exception as e:
            self.log_test_result(test_name, False, f"Unexpected error: {e}")
            return False

    def test_baseline_documentation(self) -> bool:
        """Test that baseline documentation exists"""
        test_name = "Baseline Documentation"

        try:
            doc_file = self.monitoring_dir / "PERFORMANCE_BASELINE_DOCUMENTATION.md"

            if not doc_file.exists():
                self.log_test_result(
                    test_name, False, "Baseline documentation file not found"
                )
                return False

            # Test documentation content
            with open(doc_file, "r") as f:
                content = f.read()

                required_sections = [
                    "Performance Baseline Documentation",
                    "API Performance Baselines",
                    "Frontend Performance Baselines",
                    "Database Performance Baselines",
                    "System Resource Baselines",
                ]

                missing_sections = []
                for section in required_sections:
                    if section not in content:
                        missing_sections.append(section)

                if missing_sections:
                    self.log_test_result(
                        test_name,
                        False,
                        f"Missing documentation sections: {', '.join(missing_sections)}",
                    )
                    return False

            self.log_test_result(
                test_name,
                True,
                "Baseline documentation is complete",
                {
                    "file_size": len(content),
                    "sections_verified": len(required_sections),
                },
            )
            return True

        except Exception as e:
            self.log_test_result(test_name, False, f"Unexpected error: {e}")
            return False

    async def run_all_tests(self) -> Dict:
        """Run all monitoring system tests"""
        logger.info("🧪 Starting comprehensive monitoring system tests...")

        # Test directory structure
        self.test_monitoring_directories()

        # Test script existence
        self.test_monitoring_scripts_exist()

        # Test documentation
        self.test_baseline_documentation()

        # Test dashboard components
        self.test_dashboard_server()

        # Test alert manager
        self.test_alert_manager()

        # Test bundle size monitor
        await self.test_bundle_size_monitor()

        # Test API endpoint validator
        await self.test_api_endpoint_validator()

        # Test comprehensive health monitor (last as it's most resource intensive)
        await self.test_comprehensive_health_monitor()

        # Generate test summary
        self.generate_test_summary()

        return self.test_results

    def generate_test_summary(self):
        """Generate and save test summary"""
        summary = {
            "test_run": {
                "timestamp": self.test_results["timestamp"],
                "total_tests": self.test_results["total"],
                "passed": self.test_results["passed"],
                "failed": self.test_results["failed"],
                "success_rate": (
                    (self.test_results["passed"] / self.test_results["total"] * 100)
                    if self.test_results["total"] > 0
                    else 0
                ),
            },
            "results": self.test_results["tests"],
        }

        # Save detailed results
        results_file = (
            self.monitoring_dir
            / f"test_results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(results_file, "w") as f:
            json.dump(summary, f, indent=2)

        # Save latest results
        latest_file = self.monitoring_dir / "latest_test_results.json"
        with open(latest_file, "w") as f:
            json.dump(summary, f, indent=2)

        # Log summary
        logger.info(f"\n{'='*60}")
        logger.info(f"🧪 MONITORING SYSTEM TEST SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"Total Tests: {summary['test_run']['total_tests']}")
        logger.info(f"Passed: {summary['test_run']['passed']} ✅")
        logger.info(f"Failed: {summary['test_run']['failed']} ❌")
        logger.info(f"Success Rate: {summary['test_run']['success_rate']:.1f}%")
        logger.info(f"{'='*60}")

        if summary["test_run"]["failed"] > 0:
            logger.warning("❌ Some tests failed. Check the logs for details.")
            logger.info(f"Detailed results saved to: {results_file}")
        else:
            logger.info("✅ All monitoring system tests passed!")

        return summary


async def main():
    """Run monitoring system tests"""
    tester = MonitoringSystemTester()

    try:
        results = await tester.run_all_tests()

        # Exit with appropriate code
        if results["failed"] > 0:
            sys.exit(1)  # Exit with error if any tests failed
        else:
            sys.exit(0)  # Success

    except Exception as e:
        logger.error(f"Test runner failed: {e}")
        sys.exit(2)


if __name__ == "__main__":
    asyncio.run(main())
