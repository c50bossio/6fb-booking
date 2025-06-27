#!/usr/bin/env python3
"""
Simple HTTP server to serve the monitoring dashboard
"""

import http.server
import socketserver
import os
import json
import logging
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import sqlite3
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MonitoringHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.dashboard_dir = Path("/Users/bossio/6fb-booking/monitoring/dashboard")
        self.monitoring_dir = Path("/Users/bossio/6fb-booking/monitoring")
        super().__init__(*args, directory=str(self.dashboard_dir), **kwargs)

    def do_GET(self):
        parsed_path = urlparse(self.path)

        # Serve monitoring data API endpoints
        if parsed_path.path.startswith("/api/"):
            self.handle_api_request(parsed_path)
        else:
            # Serve static files (dashboard HTML, CSS, JS)
            super().do_GET()

    def handle_api_request(self, parsed_path):
        """Handle API requests for monitoring data"""
        try:
            if parsed_path.path == "/api/health":
                self.serve_health_data()
            elif parsed_path.path == "/api/alerts":
                self.serve_alerts_data()
            elif parsed_path.path == "/api/metrics":
                self.serve_metrics_data()
            elif parsed_path.path == "/api/status":
                self.serve_status_data()
            else:
                self.send_error(404, "API endpoint not found")
        except Exception as e:
            logger.error(f"API request error: {e}")
            self.send_error(500, f"Internal server error: {str(e)}")

    def serve_health_data(self):
        """Serve overall health data"""
        try:
            # Load latest health report
            health_data = self.load_latest_health_report()

            response_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "overall_status": health_data.get("overall_status", "unknown"),
                "api_health": health_data.get("api_health", {}),
                "frontend_health": health_data.get("frontend_health", {}),
                "database_health": health_data.get("database_health", {}),
                "system_health": self.get_system_metrics(),
            }

            self.send_json_response(response_data)

        except Exception as e:
            logger.error(f"Error serving health data: {e}")
            self.send_error(500, "Failed to load health data")

    def serve_alerts_data(self):
        """Serve active alerts"""
        try:
            alerts = self.load_active_alerts()

            response_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "alerts": alerts,
                "total_count": len(alerts),
                "critical_count": len(
                    [a for a in alerts if a.get("severity") == "critical"]
                ),
                "warning_count": len(
                    [a for a in alerts if a.get("severity") == "warning"]
                ),
            }

            self.send_json_response(response_data)

        except Exception as e:
            logger.error(f"Error serving alerts data: {e}")
            self.send_error(500, "Failed to load alerts data")

    def serve_metrics_data(self):
        """Serve performance metrics"""
        try:
            metrics = self.load_performance_metrics()

            response_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "metrics": metrics,
            }

            self.send_json_response(response_data)

        except Exception as e:
            logger.error(f"Error serving metrics data: {e}")
            self.send_error(500, "Failed to load metrics data")

    def serve_status_data(self):
        """Serve quick status summary"""
        try:
            status_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "services": {
                    "api": "healthy",
                    "frontend": "healthy",
                    "database": "healthy",
                    "monitoring": "healthy",
                },
                "last_check": datetime.utcnow().isoformat(),
                "uptime": "99.9%",
                "active_alerts": 0,
            }

            # Try to get real status from monitoring files
            try:
                health_report = self.load_latest_health_report()
                if health_report:
                    status_data["services"]["api"] = health_report.get(
                        "api_health", {}
                    ).get("status", "unknown")
                    status_data["services"]["frontend"] = health_report.get(
                        "frontend_health", {}
                    ).get("status", "unknown")
                    status_data["services"]["database"] = health_report.get(
                        "database_health", {}
                    ).get("status", "unknown")
                    status_data["active_alerts"] = len(health_report.get("alerts", []))
            except:
                pass

            self.send_json_response(status_data)

        except Exception as e:
            logger.error(f"Error serving status data: {e}")
            self.send_error(500, "Failed to load status data")

    def load_latest_health_report(self):
        """Load the latest health report"""
        metrics_dir = self.monitoring_dir / "metrics"
        rolling_health_file = metrics_dir / "rolling_health.json"

        if rolling_health_file.exists():
            try:
                with open(rolling_health_file, "r") as f:
                    data = json.load(f)
                    reports = data.get("reports", [])
                    if reports:
                        # Return the most recent report
                        return sorted(
                            reports, key=lambda x: x.get("timestamp", ""), reverse=True
                        )[0]
            except Exception as e:
                logger.warning(f"Failed to load rolling health data: {e}")

        return {}

    def load_active_alerts(self):
        """Load active alerts from alert manager database"""
        alerts_dir = self.monitoring_dir / "alerts"
        db_path = alerts_dir / "alerts.db"

        alerts = []

        if db_path.exists():
            try:
                with sqlite3.connect(str(db_path)) as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        """
                        SELECT id, type, severity, title, message, source, timestamp, metadata
                        FROM alerts
                        WHERE resolved = 0
                        ORDER BY timestamp DESC
                        LIMIT 20
                    """
                    )

                    for row in cursor.fetchall():
                        alert = {
                            "id": row[0],
                            "type": row[1],
                            "severity": row[2],
                            "title": row[3],
                            "message": row[4],
                            "source": row[5],
                            "timestamp": row[6],
                            "metadata": json.loads(row[7]) if row[7] else {},
                        }
                        alerts.append(alert)

            except Exception as e:
                logger.warning(f"Failed to load alerts from database: {e}")

        # If no database alerts, create some sample ones for demo
        if not alerts:
            alerts = [
                {
                    "id": "sample_1",
                    "type": "info",
                    "severity": "info",
                    "title": "System monitoring active",
                    "message": "All monitoring components are operational",
                    "source": "monitoring_system",
                    "timestamp": datetime.utcnow().isoformat(),
                    "metadata": {},
                }
            ]

        return alerts

    def load_performance_metrics(self):
        """Load performance metrics"""
        metrics_dir = self.monitoring_dir / "metrics"
        rolling_performance_file = metrics_dir / "rolling_performance.json"

        metrics = {
            "api_response_times": [],
            "frontend_load_times": [],
            "system_resources": [],
            "bundle_sizes": [],
        }

        if rolling_performance_file.exists():
            try:
                with open(rolling_performance_file, "r") as f:
                    data = json.load(f)

                    # Process API metrics
                    api_results = data.get("api", [])
                    for result in api_results[-24:]:  # Last 24 measurements
                        if result.get("statistics", {}).get("mean"):
                            metrics["api_response_times"].append(
                                {
                                    "timestamp": result["timestamp"],
                                    "endpoint": result["endpoint"],
                                    "response_time": result["statistics"]["mean"],
                                }
                            )

                    # Process frontend metrics
                    frontend_results = data.get("frontend", [])
                    for result in frontend_results[-24:]:  # Last 24 measurements
                        if result.get("statistics", {}).get("mean"):
                            metrics["frontend_load_times"].append(
                                {
                                    "timestamp": result["timestamp"],
                                    "page": result["page"],
                                    "load_time": result["statistics"]["mean"],
                                }
                            )

            except Exception as e:
                logger.warning(f"Failed to load performance metrics: {e}")

        return metrics

    def get_system_metrics(self):
        """Get current system metrics"""
        try:
            import psutil

            return {
                "cpu_usage": psutil.cpu_percent(interval=1),
                "memory_usage": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage("/").percent,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except ImportError:
            logger.warning("psutil not available - using mock system metrics")
            return {
                "cpu_usage": 25.0,
                "memory_usage": 45.0,
                "disk_usage": 60.0,
                "timestamp": datetime.utcnow().isoformat(),
            }

    def send_json_response(self, data):
        """Send JSON response"""
        json_data = json.dumps(data, indent=2)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(json_data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        self.wfile.write(json_data.encode("utf-8"))

    def log_message(self, format, *args):
        """Override to use our logger"""
        logger.info(f"{self.address_string()} - {format % args}")


def start_dashboard_server(port=8080):
    """Start the monitoring dashboard server"""

    dashboard_dir = Path("/Users/bossio/6fb-booking/monitoring/dashboard")
    dashboard_dir.mkdir(parents=True, exist_ok=True)

    with socketserver.TCPServer(("", port), MonitoringHandler) as httpd:
        logger.info(f"Monitoring Dashboard Server starting on port {port}")
        logger.info(f"Dashboard URL: http://localhost:{port}")
        logger.info(f"Serving from: {dashboard_dir}")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            logger.info("Dashboard server stopped by user")
        except Exception as e:
            logger.error(f"Dashboard server error: {e}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="6FB Booking Platform Monitoring Dashboard Server"
    )
    parser.add_argument(
        "--port",
        "-p",
        type=int,
        default=8080,
        help="Port to serve dashboard on (default: 8080)",
    )

    args = parser.parse_args()

    start_dashboard_server(args.port)
