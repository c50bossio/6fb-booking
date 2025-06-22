"""
Database performance monitoring service for 6FB Booking Platform
Monitors query performance, connection health, and database metrics
"""

import logging
import time
import psutil
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass
from contextlib import contextmanager

from sqlalchemy import text, event
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
import sentry_sdk

logger = logging.getLogger(__name__)


@dataclass
class QueryMetric:
    """Database query performance metric"""

    query_hash: str
    query_type: str  # SELECT, INSERT, UPDATE, DELETE
    execution_time: float
    table_name: Optional[str]
    timestamp: datetime
    success: bool
    error_message: Optional[str] = None


@dataclass
class DatabaseAlert:
    """Database performance alert"""

    id: str
    severity: str  # info, warning, critical
    title: str
    message: str
    details: Dict[str, Any]
    timestamp: datetime
    resolved: bool = False


class DatabaseMonitoringService:
    """Service for monitoring database performance and health"""

    def __init__(self, engine: Engine):
        self.engine = engine
        self.query_metrics = deque(maxlen=1000)
        self.slow_queries = deque(maxlen=100)
        self.active_alerts = {}
        self.connection_count = 0
        self.total_queries = 0
        self.failed_queries = 0

        # Performance thresholds
        self.thresholds = {
            "slow_query_time": 1.0,  # 1 second
            "very_slow_query_time": 5.0,  # 5 seconds
            "connection_pool_usage": 80,  # 80% of pool
            "failed_query_rate": 5.0,  # 5% failure rate
            "avg_query_time": 0.5,  # 500ms average
        }

        # Setup SQLAlchemy event listeners
        self._setup_query_monitoring()

    def _setup_query_monitoring(self):
        """Setup SQLAlchemy event listeners for query monitoring"""

        @event.listens_for(self.engine, "before_cursor_execute")
        def before_cursor_execute(
            conn, cursor, statement, parameters, context, executemany
        ):
            context._query_start_time = time.time()
            context._query_statement = statement

        @event.listens_for(self.engine, "after_cursor_execute")
        def after_cursor_execute(
            conn, cursor, statement, parameters, context, executemany
        ):
            execution_time = time.time() - context._query_start_time

            # Parse query information
            query_type = self._extract_query_type(statement)
            table_name = self._extract_table_name(statement)
            query_hash = str(hash(statement.strip()[:200]))  # Hash first 200 chars

            # Record the metric
            metric = QueryMetric(
                query_hash=query_hash,
                query_type=query_type,
                execution_time=execution_time,
                table_name=table_name,
                timestamp=datetime.utcnow(),
                success=True,
            )

            self._record_query_metric(metric)

            # Check for slow queries
            if execution_time > self.thresholds["slow_query_time"]:
                self._handle_slow_query(metric, statement)

        @event.listens_for(self.engine, "handle_error")
        def handle_error(exception_context):
            """Handle database errors"""
            execution_time = 0
            if hasattr(exception_context, "_query_start_time"):
                execution_time = time.time() - exception_context._query_start_time

            statement = getattr(exception_context, "_query_statement", "Unknown")
            query_type = self._extract_query_type(statement)
            table_name = self._extract_table_name(statement)

            metric = QueryMetric(
                query_hash=str(hash(str(statement)[:200])),
                query_type=query_type,
                execution_time=execution_time,
                table_name=table_name,
                timestamp=datetime.utcnow(),
                success=False,
                error_message=str(exception_context.original_exception),
            )

            self._record_query_metric(metric)

            # Track failed queries
            self.failed_queries += 1

            # Check failure rate
            self._check_failure_rate()

    def _extract_query_type(self, statement: str) -> str:
        """Extract query type from SQL statement"""
        statement = statement.strip().upper()
        if statement.startswith("SELECT"):
            return "SELECT"
        elif statement.startswith("INSERT"):
            return "INSERT"
        elif statement.startswith("UPDATE"):
            return "UPDATE"
        elif statement.startswith("DELETE"):
            return "DELETE"
        elif statement.startswith("CREATE"):
            return "CREATE"
        elif statement.startswith("ALTER"):
            return "ALTER"
        elif statement.startswith("DROP"):
            return "DROP"
        else:
            return "OTHER"

    def _extract_table_name(self, statement: str) -> Optional[str]:
        """Extract main table name from SQL statement"""
        try:
            statement = statement.strip().upper()

            # Simple regex-free parsing for common patterns
            if "FROM " in statement:
                parts = statement.split("FROM ")[1].split()
                if parts:
                    table_name = parts[0].strip("`\"'")
                    # Remove schema prefix if present
                    if "." in table_name:
                        table_name = table_name.split(".")[-1]
                    return table_name
            elif "INTO " in statement:
                parts = statement.split("INTO ")[1].split()
                if parts:
                    table_name = parts[0].strip("`\"'")
                    if "." in table_name:
                        table_name = table_name.split(".")[-1]
                    return table_name
            elif "UPDATE " in statement:
                parts = statement.split("UPDATE ")[1].split()
                if parts:
                    table_name = parts[0].strip("`\"'")
                    if "." in table_name:
                        table_name = table_name.split(".")[-1]
                    return table_name

        except Exception:
            pass

        return None

    def _record_query_metric(self, metric: QueryMetric):
        """Record a query metric"""
        self.query_metrics.append(metric)
        self.total_queries += 1

        # Log slow queries
        if metric.execution_time > self.thresholds["slow_query_time"]:
            logger.warning(
                f"Slow query detected: {metric.query_type} on {metric.table_name} "
                f"took {metric.execution_time:.2f}s"
            )

        # Send to Sentry for very slow queries
        if metric.execution_time > self.thresholds["very_slow_query_time"]:
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("event_type", "slow_query")
                scope.set_tag("query_type", metric.query_type)
                scope.set_tag("table_name", metric.table_name or "unknown")
                scope.set_context(
                    "query",
                    {
                        "execution_time": metric.execution_time,
                        "query_hash": metric.query_hash,
                        "success": metric.success,
                    },
                )

                sentry_sdk.capture_message(
                    f"Very slow query: {metric.execution_time:.2f}s", level="warning"
                )

    def _handle_slow_query(self, metric: QueryMetric, statement: str):
        """Handle slow query detection"""
        self.slow_queries.append(
            {
                "metric": metric,
                "statement": statement[:500],  # First 500 chars only
                "timestamp": datetime.utcnow(),
            }
        )

        # Create alert for very slow queries
        if metric.execution_time > self.thresholds["very_slow_query_time"]:
            self._create_alert(
                f"very_slow_query_{metric.query_hash}",
                "warning",
                "Very Slow Database Query",
                f"{metric.query_type} query on {metric.table_name} took {metric.execution_time:.2f}s",
                {
                    "execution_time": metric.execution_time,
                    "query_type": metric.query_type,
                    "table_name": metric.table_name,
                    "statement_preview": statement[:200],
                },
            )

    def _check_failure_rate(self):
        """Check database query failure rate"""
        if self.total_queries < 10:
            return  # Not enough data

        failure_rate = (self.failed_queries / self.total_queries) * 100

        if failure_rate > self.thresholds["failed_query_rate"]:
            self._create_alert(
                "high_failure_rate",
                "critical",
                "High Database Query Failure Rate",
                f"Query failure rate is {failure_rate:.1f}% (threshold: {self.thresholds['failed_query_rate']}%)",
                {
                    "failure_rate": failure_rate,
                    "failed_queries": self.failed_queries,
                    "total_queries": self.total_queries,
                },
            )

    def _create_alert(
        self,
        alert_id: str,
        severity: str,
        title: str,
        message: str,
        details: Dict[str, Any],
    ):
        """Create a database performance alert"""
        if alert_id in self.active_alerts and not self.active_alerts[alert_id].resolved:
            return  # Alert already active

        alert = DatabaseAlert(
            id=alert_id,
            severity=severity,
            title=title,
            message=message,
            details=details,
            timestamp=datetime.utcnow(),
        )

        self.active_alerts[alert_id] = alert

        # Send to Sentry
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("alert_type", "database")
            scope.set_tag("alert_severity", severity)
            scope.set_context(
                "alert", {"id": alert_id, "title": title, "details": details}
            )

            if severity == "critical":
                sentry_sdk.capture_message(
                    f"CRITICAL: {title} - {message}", level="error"
                )
            else:
                sentry_sdk.capture_message(
                    f"{severity.upper()}: {title} - {message}", level="warning"
                )

        logger.warning(f"Database Alert [{severity}]: {title} - {message}")

    def get_connection_metrics(self) -> Dict[str, Any]:
        """Get database connection pool metrics"""
        try:
            pool = self.engine.pool

            return {
                "pool_size": pool.size(),
                "checked_in_connections": pool.checkedin(),
                "checked_out_connections": pool.checkedout(),
                "overflow_connections": pool.overflow(),
                "invalid_connections": pool.invalidated(),
                "total_connections": pool.size() + pool.overflow(),
                "pool_usage_percent": (
                    (pool.checkedout() / pool.size()) * 100 if pool.size() > 0 else 0
                ),
            }
        except Exception as e:
            logger.error(f"Error getting connection metrics: {str(e)}")
            return {"error": str(e)}

    def get_query_performance_summary(
        self, time_range_minutes: int = 60
    ) -> Dict[str, Any]:
        """Get query performance summary for specified time range"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=time_range_minutes)

        # Filter recent metrics
        recent_metrics = [m for m in self.query_metrics if m.timestamp >= cutoff_time]

        if not recent_metrics:
            return {
                "time_range_minutes": time_range_minutes,
                "total_queries": 0,
                "message": "No query data available for specified time range",
            }

        # Calculate statistics
        execution_times = [m.execution_time for m in recent_metrics if m.success]
        failed_queries = [m for m in recent_metrics if not m.success]

        # Group by query type
        query_types = defaultdict(list)
        for metric in recent_metrics:
            query_types[metric.query_type].append(metric.execution_time)

        # Group by table
        table_stats = defaultdict(list)
        for metric in recent_metrics:
            if metric.table_name:
                table_stats[metric.table_name].append(metric.execution_time)

        summary = {
            "time_range_minutes": time_range_minutes,
            "total_queries": len(recent_metrics),
            "successful_queries": len(execution_times),
            "failed_queries": len(failed_queries),
            "failure_rate_percent": (len(failed_queries) / len(recent_metrics)) * 100,
            "performance": {
                "avg_execution_time": (
                    sum(execution_times) / len(execution_times)
                    if execution_times
                    else 0
                ),
                "min_execution_time": min(execution_times) if execution_times else 0,
                "max_execution_time": max(execution_times) if execution_times else 0,
                "slow_queries": len(
                    [
                        t
                        for t in execution_times
                        if t > self.thresholds["slow_query_time"]
                    ]
                ),
                "very_slow_queries": len(
                    [
                        t
                        for t in execution_times
                        if t > self.thresholds["very_slow_query_time"]
                    ]
                ),
            },
            "by_query_type": {
                query_type: {
                    "count": len(times),
                    "avg_time": sum(times) / len(times),
                    "max_time": max(times),
                }
                for query_type, times in query_types.items()
            },
            "by_table": (
                {
                    table: {
                        "count": len(times),
                        "avg_time": sum(times) / len(times),
                        "max_time": max(times),
                    }
                    for table, times in table_stats.items()
                }
                if table_stats
                else {}
            ),
            "timestamp": datetime.utcnow().isoformat(),
        }

        return summary

    def get_slow_queries(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent slow queries"""
        return [
            {
                "execution_time": query["metric"].execution_time,
                "query_type": query["metric"].query_type,
                "table_name": query["metric"].table_name,
                "timestamp": query["timestamp"].isoformat(),
                "statement_preview": query["statement"],
            }
            for query in list(self.slow_queries)[-limit:]
        ]

    def get_database_health_summary(self) -> Dict[str, Any]:
        """Get overall database health summary"""
        connection_metrics = self.get_connection_metrics()
        query_summary = self.get_query_performance_summary(time_range_minutes=10)

        # Determine health status
        health_issues = []

        # Check connection pool usage
        pool_usage = connection_metrics.get("pool_usage_percent", 0)
        if pool_usage > self.thresholds["connection_pool_usage"]:
            health_issues.append(f"High connection pool usage: {pool_usage:.1f}%")

        # Check query failure rate
        failure_rate = query_summary.get("failure_rate_percent", 0)
        if failure_rate > self.thresholds["failed_query_rate"]:
            health_issues.append(f"High query failure rate: {failure_rate:.1f}%")

        # Check average query time
        avg_time = query_summary.get("performance", {}).get("avg_execution_time", 0)
        if avg_time > self.thresholds["avg_query_time"]:
            health_issues.append(f"Slow average query time: {avg_time:.2f}s")

        # Overall status
        if health_issues:
            status = "warning" if len(health_issues) == 1 else "critical"
        else:
            status = "healthy"

        return {
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "health_issues": health_issues,
            "connection_metrics": connection_metrics,
            "query_performance": query_summary,
            "active_alerts": len(
                [a for a in self.active_alerts.values() if not a.resolved]
            ),
        }

    def resolve_alert(self, alert_id: str):
        """Resolve an active alert"""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].resolved = True
            logger.info(f"Database alert resolved: {alert_id}")

    def get_active_alerts(self) -> List[DatabaseAlert]:
        """Get all active database alerts"""
        return [alert for alert in self.active_alerts.values() if not alert.resolved]

    def reset_counters(self):
        """Reset monitoring counters"""
        self.total_queries = 0
        self.failed_queries = 0
        logger.info("Database monitoring counters reset")


# Global instance
db_monitor = None


def get_database_monitor(engine: Engine) -> DatabaseMonitoringService:
    """Get or create database monitoring service instance"""
    global db_monitor
    if db_monitor is None:
        db_monitor = DatabaseMonitoringService(engine)
    return db_monitor
