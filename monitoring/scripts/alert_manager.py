#!/usr/bin/env python3
"""
Alert Manager for 6FB Booking Platform
Manages alerts, notifications, and escalation procedures
"""

import asyncio
import json
import logging
import smtplib
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import sqlite3

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("/Users/bossio/6fb-booking/logs/alert_manager.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


@dataclass
class Alert:
    id: str
    type: str
    severity: str  # 'critical', 'warning', 'info'
    title: str
    message: str
    source: str
    timestamp: str
    resolved: bool = False
    resolved_at: Optional[str] = None
    escalated: bool = False
    escalated_at: Optional[str] = None
    notification_sent: bool = False
    metadata: Optional[Dict] = None


@dataclass
class AlertRule:
    name: str
    metric: str
    condition: str  # 'greater_than', 'less_than', 'equals', 'not_equals'
    threshold: float
    severity: str
    duration: int  # minutes
    description: str
    enabled: bool = True


class AlertManager:
    def __init__(self):
        self.base_dir = Path("/Users/bossio/6fb-booking")
        self.monitoring_dir = self.base_dir / "monitoring"
        self.logs_dir = self.base_dir / "logs"
        self.alerts_dir = self.monitoring_dir / "alerts"
        self.db_path = self.alerts_dir / "alerts.db"

        # Create directories
        for dir_path in [self.monitoring_dir, self.logs_dir, self.alerts_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)

        # Initialize database
        self._init_database()

        # Load configuration
        self.config = {
            # Email settings
            "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
            "smtp_port": int(os.getenv("SMTP_PORT", "587")),
            "smtp_username": os.getenv("SMTP_USERNAME", ""),
            "smtp_password": os.getenv("SMTP_PASSWORD", ""),
            "from_email": os.getenv("ALERT_FROM_EMAIL", "alerts@6fb.com"),
            # Alert recipients
            "critical_email": os.getenv("CRITICAL_ALERT_EMAIL", "critical@6fb.com"),
            "warning_email": os.getenv("WARNING_ALERT_EMAIL", "warnings@6fb.com"),
            "info_email": os.getenv("INFO_ALERT_EMAIL", "info@6fb.com"),
            # Slack integration (optional)
            "slack_webhook": os.getenv("SLACK_WEBHOOK_URL", ""),
            "slack_channel": os.getenv("SLACK_CHANNEL", "#alerts"),
            # Escalation settings
            "escalation_delay": int(os.getenv("ESCALATION_DELAY_MINUTES", "30")),
            "max_escalation_level": int(os.getenv("MAX_ESCALATION_LEVEL", "3")),
            # Rate limiting
            "rate_limit_window": int(os.getenv("RATE_LIMIT_WINDOW_MINUTES", "15")),
            "max_alerts_per_window": int(os.getenv("MAX_ALERTS_PER_WINDOW", "10")),
        }

        # Define alert rules
        self.alert_rules = self._define_alert_rules()

        # Active alerts cache
        self.active_alerts = {}
        self.alert_history = []

    def _init_database(self):
        """Initialize SQLite database for alert storage"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    source TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    resolved INTEGER DEFAULT 0,
                    resolved_at TEXT,
                    escalated INTEGER DEFAULT 0,
                    escalated_at TEXT,
                    notification_sent INTEGER DEFAULT 0,
                    metadata TEXT
                )
            """
            )

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS alert_rules (
                    name TEXT PRIMARY KEY,
                    metric TEXT NOT NULL,
                    condition TEXT NOT NULL,
                    threshold REAL NOT NULL,
                    severity TEXT NOT NULL,
                    duration INTEGER NOT NULL,
                    description TEXT NOT NULL,
                    enabled INTEGER DEFAULT 1
                )
            """
            )

            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)
            """
            )

            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity)
            """
            )

    def _define_alert_rules(self) -> List[AlertRule]:
        """Define monitoring alert rules"""
        return [
            # API Performance Rules
            AlertRule(
                name="api_response_time_critical",
                metric="api_response_time",
                condition="greater_than",
                threshold=5000,  # 5 seconds
                severity="critical",
                duration=5,
                description="API response time exceeds 5 seconds",
            ),
            AlertRule(
                name="api_response_time_warning",
                metric="api_response_time",
                condition="greater_than",
                threshold=2000,  # 2 seconds
                severity="warning",
                duration=10,
                description="API response time exceeds 2 seconds",
            ),
            AlertRule(
                name="api_error_rate_critical",
                metric="api_error_rate",
                condition="greater_than",
                threshold=10.0,  # 10%
                severity="critical",
                duration=5,
                description="API error rate exceeds 10%",
            ),
            AlertRule(
                name="api_405_errors",
                metric="api_405_errors",
                condition="greater_than",
                threshold=0,  # Zero tolerance
                severity="critical",
                duration=1,
                description="405 Method Not Allowed errors detected",
            ),
            # Frontend Performance Rules
            AlertRule(
                name="frontend_load_time_critical",
                metric="frontend_load_time",
                condition="greater_than",
                threshold=5000,  # 5 seconds
                severity="critical",
                duration=5,
                description="Frontend load time exceeds 5 seconds",
            ),
            AlertRule(
                name="bundle_size_increase_critical",
                metric="bundle_size_increase",
                condition="greater_than",
                threshold=50.0,  # 50%
                severity="critical",
                duration=1,
                description="Bundle size increased by more than 50%",
            ),
            AlertRule(
                name="bundle_size_increase_warning",
                metric="bundle_size_increase",
                condition="greater_than",
                threshold=20.0,  # 20%
                severity="warning",
                duration=1,
                description="Bundle size increased by more than 20%",
            ),
            # System Resource Rules
            AlertRule(
                name="cpu_usage_critical",
                metric="cpu_usage",
                condition="greater_than",
                threshold=90.0,  # 90%
                severity="critical",
                duration=10,
                description="CPU usage exceeds 90%",
            ),
            AlertRule(
                name="memory_usage_critical",
                metric="memory_usage",
                condition="greater_than",
                threshold=95.0,  # 95%
                severity="critical",
                duration=5,
                description="Memory usage exceeds 95%",
            ),
            AlertRule(
                name="disk_usage_critical",
                metric="disk_usage",
                condition="greater_than",
                threshold=95.0,  # 95%
                severity="critical",
                duration=30,
                description="Disk usage exceeds 95%",
            ),
            # Database Rules
            AlertRule(
                name="database_connection_failure",
                metric="database_connection",
                condition="equals",
                threshold=0,  # Connection failed
                severity="critical",
                duration=1,
                description="Database connection failed",
            ),
            AlertRule(
                name="database_query_slow",
                metric="database_query_time",
                condition="greater_than",
                threshold=2000,  # 2 seconds
                severity="warning",
                duration=15,
                description="Database queries are slow",
            ),
            # Application Health Rules
            AlertRule(
                name="health_check_failure",
                metric="health_check",
                condition="equals",
                threshold=0,  # Health check failed
                severity="critical",
                duration=2,
                description="Application health check failed",
            ),
            AlertRule(
                name="authentication_failure_rate",
                metric="auth_failure_rate",
                condition="greater_than",
                threshold=20.0,  # 20%
                severity="warning",
                duration=10,
                description="High authentication failure rate",
            ),
        ]

    def save_alert_rules(self):
        """Save alert rules to database"""
        with sqlite3.connect(self.db_path) as conn:
            for rule in self.alert_rules:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO alert_rules
                    (name, metric, condition, threshold, severity, duration, description, enabled)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        rule.name,
                        rule.metric,
                        rule.condition,
                        rule.threshold,
                        rule.severity,
                        rule.duration,
                        rule.description,
                        rule.enabled,
                    ),
                )

    def create_alert(
        self,
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        source: str,
        metadata: Optional[Dict] = None,
    ) -> Alert:
        """Create a new alert"""
        alert_id = f"{alert_type}_{severity}_{int(datetime.utcnow().timestamp())}"

        alert = Alert(
            id=alert_id,
            type=alert_type,
            severity=severity,
            title=title,
            message=message,
            source=source,
            timestamp=datetime.utcnow().isoformat(),
            metadata=metadata or {},
        )

        # Save to database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO alerts
                (id, type, severity, title, message, source, timestamp, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    alert.id,
                    alert.type,
                    alert.severity,
                    alert.title,
                    alert.message,
                    alert.source,
                    alert.timestamp,
                    json.dumps(alert.metadata),
                ),
            )

        # Add to active alerts
        self.active_alerts[alert_id] = alert

        logger.info(f"Created {severity} alert: {title}")
        return alert

    def resolve_alert(self, alert_id: str, resolution_message: str = ""):
        """Resolve an alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.utcnow().isoformat()

            # Update database
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """
                    UPDATE alerts
                    SET resolved = 1, resolved_at = ?
                    WHERE id = ?
                """,
                    (alert.resolved_at, alert_id),
                )

            # Remove from active alerts
            del self.active_alerts[alert_id]

            logger.info(f"Resolved alert: {alert.title}")

            # Send resolution notification for critical alerts
            if alert.severity == "critical":
                asyncio.create_task(
                    self._send_resolution_notification(alert, resolution_message)
                )

    def evaluate_metric(
        self, metric_name: str, value: float, source: str
    ) -> List[Alert]:
        """Evaluate a metric against alert rules"""
        triggered_alerts = []

        for rule in self.alert_rules:
            if not rule.enabled or rule.metric != metric_name:
                continue

            # Check if condition is met
            condition_met = False
            if rule.condition == "greater_than" and value > rule.threshold:
                condition_met = True
            elif rule.condition == "less_than" and value < rule.threshold:
                condition_met = True
            elif rule.condition == "equals" and value == rule.threshold:
                condition_met = True
            elif rule.condition == "not_equals" and value != rule.threshold:
                condition_met = True

            if condition_met:
                # Check if we should create an alert (rate limiting)
                if self._should_create_alert(rule, source):
                    alert = self.create_alert(
                        alert_type=rule.name,
                        severity=rule.severity,
                        title=f"{rule.description}",
                        message=f"Metric '{metric_name}' value {value} triggered rule '{rule.name}' (threshold: {rule.threshold})",
                        source=source,
                        metadata={
                            "metric": metric_name,
                            "value": value,
                            "threshold": rule.threshold,
                            "condition": rule.condition,
                            "rule": rule.name,
                        },
                    )
                    triggered_alerts.append(alert)

        return triggered_alerts

    def _should_create_alert(self, rule: AlertRule, source: str) -> bool:
        """Check if we should create an alert based on rate limiting and duration"""
        # Check rate limiting
        window_start = datetime.utcnow() - timedelta(
            minutes=self.config["rate_limit_window"]
        )
        recent_alerts = [
            alert
            for alert in self.active_alerts.values()
            if (
                alert.type == rule.name
                and alert.source == source
                and datetime.fromisoformat(alert.timestamp) > window_start
            )
        ]

        if len(recent_alerts) >= self.config["max_alerts_per_window"]:
            return False

        # For critical alerts with zero tolerance (like 405 errors), always create
        if rule.severity == "critical" and rule.threshold == 0:
            return True

        # For other alerts, check if duration requirement is met
        # This would require keeping track of metric history
        # For now, we'll create the alert and let deduplication handle it
        return True

    async def send_alert_notification(self, alert: Alert):
        """Send alert notification via configured channels"""
        if alert.notification_sent:
            return

        try:
            # Determine recipients based on severity
            recipients = []
            if alert.severity == "critical":
                recipients.append(self.config["critical_email"])
            elif alert.severity == "warning":
                recipients.append(self.config["warning_email"])
            else:
                recipients.append(self.config["info_email"])

            # Send email notifications
            for recipient in recipients:
                if recipient:
                    await self._send_email_alert(alert, recipient)

            # Send Slack notification if configured
            if self.config["slack_webhook"]:
                await self._send_slack_alert(alert)

            # Mark as sent
            alert.notification_sent = True
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """
                    UPDATE alerts SET notification_sent = 1 WHERE id = ?
                """,
                    (alert.id,),
                )

            logger.info(f"Sent notifications for alert: {alert.title}")

        except Exception as e:
            logger.error(f"Failed to send alert notification: {e}")

    async def _send_email_alert(self, alert: Alert, recipient: str):
        """Send email alert notification"""
        try:
            msg = MIMEMultipart()
            msg["From"] = self.config["from_email"]
            msg["To"] = recipient
            msg["Subject"] = f"🚨 {alert.severity.upper()}: {alert.title}"

            # Create HTML email body
            severity_emoji = {"critical": "🔴", "warning": "🟡", "info": "🔵"}.get(
                alert.severity, "⚪"
            )

            body = f"""
            <html>
            <body>
                <h2>{severity_emoji} {alert.severity.upper()} Alert</h2>
                <p><strong>Title:</strong> {alert.title}</p>
                <p><strong>Message:</strong> {alert.message}</p>
                <p><strong>Source:</strong> {alert.source}</p>
                <p><strong>Time:</strong> {alert.timestamp}</p>

                {self._format_alert_metadata(alert)}

                <hr>
                <p><em>This alert was generated by the 6FB Booking Platform monitoring system.</em></p>
                <p><em>Alert ID: {alert.id}</em></p>
            </body>
            </html>
            """

            msg.attach(MIMEText(body, "html"))

            # Send email
            server = smtplib.SMTP(self.config["smtp_server"], self.config["smtp_port"])
            server.starttls()
            server.login(self.config["smtp_username"], self.config["smtp_password"])
            server.send_message(msg)
            server.quit()

        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")

    async def _send_slack_alert(self, alert: Alert):
        """Send Slack alert notification"""
        try:
            severity_color = {
                "critical": "danger",
                "warning": "warning",
                "info": "good",
            }.get(alert.severity, "good")

            payload = {
                "channel": self.config["slack_channel"],
                "attachments": [
                    {
                        "color": severity_color,
                        "title": f"{alert.severity.upper()}: {alert.title}",
                        "text": alert.message,
                        "fields": [
                            {"title": "Source", "value": alert.source, "short": True},
                            {"title": "Time", "value": alert.timestamp, "short": True},
                            {"title": "Alert ID", "value": alert.id, "short": True},
                        ],
                        "footer": "6FB Booking Platform Monitoring",
                    }
                ],
            }

            response = requests.post(
                self.config["slack_webhook"], json=payload, timeout=10
            )
            response.raise_for_status()

        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")

    def _format_alert_metadata(self, alert: Alert) -> str:
        """Format alert metadata for display"""
        if not alert.metadata:
            return ""

        metadata_html = "<h3>Details:</h3><ul>"
        for key, value in alert.metadata.items():
            metadata_html += f"<li><strong>{key}:</strong> {value}</li>"
        metadata_html += "</ul>"

        return metadata_html

    async def _send_resolution_notification(
        self, alert: Alert, resolution_message: str
    ):
        """Send alert resolution notification"""
        try:
            recipients = (
                [self.config["critical_email"]] if alert.severity == "critical" else []
            )

            for recipient in recipients:
                if not recipient:
                    continue

                msg = MIMEMultipart()
                msg["From"] = self.config["from_email"]
                msg["To"] = recipient
                msg["Subject"] = f"✅ RESOLVED: {alert.title}"

                body = f"""
                <html>
                <body>
                    <h2>✅ Alert Resolved</h2>
                    <p><strong>Original Alert:</strong> {alert.title}</p>
                    <p><strong>Severity:</strong> {alert.severity.upper()}</p>
                    <p><strong>Resolved At:</strong> {alert.resolved_at}</p>
                    {"<p><strong>Resolution:</strong> " + resolution_message + "</p>" if resolution_message else ""}

                    <hr>
                    <p><em>Alert ID: {alert.id}</em></p>
                </body>
                </html>
                """

                msg.attach(MIMEText(body, "html"))

                server = smtplib.SMTP(
                    self.config["smtp_server"], self.config["smtp_port"]
                )
                server.starttls()
                server.login(self.config["smtp_username"], self.config["smtp_password"])
                server.send_message(msg)
                server.quit()

        except Exception as e:
            logger.error(f"Failed to send resolution notification: {e}")

    def get_active_alerts(self, severity: Optional[str] = None) -> List[Alert]:
        """Get list of active alerts"""
        alerts = list(self.active_alerts.values())

        if severity:
            alerts = [a for a in alerts if a.severity == severity]

        # Sort by timestamp (newest first)
        alerts.sort(key=lambda x: x.timestamp, reverse=True)

        return alerts

    def get_alert_statistics(self) -> Dict:
        """Get alert statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Total alerts in last 24 hours
            yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
            cursor.execute(
                "SELECT COUNT(*) FROM alerts WHERE timestamp > ?", (yesterday,)
            )
            alerts_24h = cursor.fetchone()[0]

            # Alerts by severity in last 24 hours
            cursor.execute(
                """
                SELECT severity, COUNT(*)
                FROM alerts
                WHERE timestamp > ?
                GROUP BY severity
            """,
                (yesterday,),
            )
            severity_counts = dict(cursor.fetchall())

            # Resolution statistics
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total,
                    SUM(resolved) as resolved,
                    AVG(CASE WHEN resolved = 1 THEN
                        (julianday(resolved_at) - julianday(timestamp)) * 24 * 60
                        ELSE NULL END) as avg_resolution_time_minutes
                FROM alerts
                WHERE timestamp > ?
            """,
                (yesterday,),
            )

            total, resolved, avg_resolution_time = cursor.fetchone()

            return {
                "total_alerts_24h": alerts_24h,
                "active_alerts": len(self.active_alerts),
                "severity_breakdown": severity_counts,
                "resolution_rate": (resolved / total * 100) if total > 0 else 0,
                "avg_resolution_time_minutes": avg_resolution_time or 0,
                "critical_alerts": len(
                    [a for a in self.active_alerts.values() if a.severity == "critical"]
                ),
                "warning_alerts": len(
                    [a for a in self.active_alerts.values() if a.severity == "warning"]
                ),
            }

    def load_active_alerts(self):
        """Load active alerts from database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, type, severity, title, message, source, timestamp,
                       escalated, escalated_at, notification_sent, metadata
                FROM alerts
                WHERE resolved = 0
            """
            )

            for row in cursor.fetchall():
                alert = Alert(
                    id=row[0],
                    type=row[1],
                    severity=row[2],
                    title=row[3],
                    message=row[4],
                    source=row[5],
                    timestamp=row[6],
                    escalated=bool(row[7]),
                    escalated_at=row[8],
                    notification_sent=bool(row[9]),
                    metadata=json.loads(row[10]) if row[10] else {},
                )

                self.active_alerts[alert.id] = alert

    async def process_metrics_and_alerts(self, metrics: Dict):
        """Process metrics and generate alerts"""
        alerts_created = []

        # Process different types of metrics
        if "api_health" in metrics:
            api_alerts = await self._process_api_metrics(metrics["api_health"])
            alerts_created.extend(api_alerts)

        if "frontend_health" in metrics:
            frontend_alerts = await self._process_frontend_metrics(
                metrics["frontend_health"]
            )
            alerts_created.extend(frontend_alerts)

        if "database_health" in metrics:
            db_alerts = await self._process_database_metrics(metrics["database_health"])
            alerts_created.extend(db_alerts)

        if "system_health" in metrics:
            system_alerts = await self._process_system_metrics(metrics["system_health"])
            alerts_created.extend(system_alerts)

        # Send notifications for new alerts
        for alert in alerts_created:
            await self.send_alert_notification(alert)

        return alerts_created

    async def _process_api_metrics(self, api_health: Dict) -> List[Alert]:
        """Process API health metrics and create alerts"""
        alerts = []

        # Check for 405 errors
        if api_health.get("errors"):
            for error in api_health["errors"]:
                if "405" in str(error.get("error", "")):
                    alert_alerts = self.evaluate_metric(
                        "api_405_errors", 1, "api_monitor"
                    )
                    alerts.extend(alert_alerts)

        # Check response times
        for endpoint, response_time in api_health.get("response_times", {}).items():
            endpoint_alerts = self.evaluate_metric(
                "api_response_time", response_time, f"api_{endpoint}"
            )
            alerts.extend(endpoint_alerts)

        return alerts

    async def _process_frontend_metrics(self, frontend_health: Dict) -> List[Alert]:
        """Process frontend health metrics and create alerts"""
        alerts = []

        # Check load times
        for page, load_time in frontend_health.get("load_times", {}).items():
            page_alerts = self.evaluate_metric(
                "frontend_load_time", load_time, f"frontend_{page}"
            )
            alerts.extend(page_alerts)

        # Check bundle size changes
        bundle_analysis = frontend_health.get("bundle_analysis", {})
        for warning in bundle_analysis.get("warnings", []):
            if "increased" in warning:
                # Extract percentage from warning message
                import re

                match = re.search(r"(\d+\.?\d*)%", warning)
                if match:
                    increase_percent = float(match.group(1))
                    bundle_alerts = self.evaluate_metric(
                        "bundle_size_increase", increase_percent, "bundle_monitor"
                    )
                    alerts.extend(bundle_alerts)

        return alerts

    async def _process_database_metrics(self, db_health: Dict) -> List[Alert]:
        """Process database health metrics and create alerts"""
        alerts = []

        # Check connection
        if db_health.get("errors"):
            connection_alerts = self.evaluate_metric(
                "database_connection", 0, "database_monitor"
            )
            alerts.extend(connection_alerts)

        # Check query performance
        for query_name, query_data in db_health.get("query_performance", {}).items():
            if isinstance(query_data, dict) and "time" in query_data:
                query_alerts = self.evaluate_metric(
                    "database_query_time", query_data["time"], f"database_{query_name}"
                )
                alerts.extend(query_alerts)

        return alerts

    async def _process_system_metrics(self, system_health: Dict) -> List[Alert]:
        """Process system resource metrics and create alerts"""
        alerts = []

        # Check CPU usage
        cpu_usage = system_health.get("cpu_usage", 0)
        cpu_alerts = self.evaluate_metric("cpu_usage", cpu_usage, "system_monitor")
        alerts.extend(cpu_alerts)

        # Check memory usage
        memory_usage = system_health.get("memory_usage", 0)
        memory_alerts = self.evaluate_metric(
            "memory_usage", memory_usage, "system_monitor"
        )
        alerts.extend(memory_alerts)

        # Check disk usage
        disk_usage = system_health.get("disk_usage", 0)
        disk_alerts = self.evaluate_metric("disk_usage", disk_usage, "system_monitor")
        alerts.extend(disk_alerts)

        return alerts


# Initialize and save alert rules
def initialize_alert_manager():
    """Initialize alert manager and save default rules"""
    manager = AlertManager()
    manager.save_alert_rules()
    manager.load_active_alerts()
    return manager


async def main():
    """Test alert manager functionality"""
    manager = initialize_alert_manager()

    # Test alert creation
    test_alert = manager.create_alert(
        alert_type="test_alert",
        severity="warning",
        title="Test Alert",
        message="This is a test alert",
        source="test_script",
    )

    # Send notification
    await manager.send_alert_notification(test_alert)

    # Show statistics
    stats = manager.get_alert_statistics()
    print(f"Alert Statistics: {json.dumps(stats, indent=2)}")

    # Resolve the test alert
    manager.resolve_alert(test_alert.id, "Test completed successfully")


if __name__ == "__main__":
    asyncio.run(main())
