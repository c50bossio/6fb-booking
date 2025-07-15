"""
Business Metrics Tracker for BookedBarber V2
============================================

Comprehensive business metrics tracking system for monitoring KPIs,
revenue, user engagement, and operational metrics at scale.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import os
import aioredis
from sqlalchemy import text, func
from sqlalchemy.orm import Session


class MetricType(Enum):
    """Types of business metrics"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    RATE = "rate"


class MetricTimeframe(Enum):
    """Metric aggregation timeframes"""
    REAL_TIME = "real_time"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


@dataclass
class BusinessMetric:
    """Business metric data structure"""
    name: str
    value: float
    metric_type: MetricType
    timestamp: datetime
    tags: Dict[str, str] = None
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['metric_type'] = self.metric_type.value
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class KPIDashboardData:
    """KPI dashboard data structure"""
    timestamp: datetime
    revenue_metrics: Dict[str, float]
    booking_metrics: Dict[str, float]
    user_metrics: Dict[str, float]
    operational_metrics: Dict[str, float]
    performance_metrics: Dict[str, float]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


class BusinessMetricsTracker:
    """Enterprise business metrics tracking system"""
    
    def __init__(self, db_session_factory=None):
        self.logger = logging.getLogger(__name__)
        self.db_session_factory = db_session_factory
        self.redis = None
        self.metrics_cache = {}
        self.aggregation_intervals = {
            MetricTimeframe.HOURLY: timedelta(hours=1),
            MetricTimeframe.DAILY: timedelta(days=1),
            MetricTimeframe.WEEKLY: timedelta(weeks=1),
            MetricTimeframe.MONTHLY: timedelta(days=30),
        }
        
        # Metric definitions
        self.business_metrics_config = self._define_business_metrics()
        
    async def initialize(self):
        """Initialize the metrics tracking system"""
        try:
            # Initialize Redis connection
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self.redis = await aioredis.from_url(redis_url)
            
            # Start background tasks
            asyncio.create_task(self._metrics_aggregation_worker())
            asyncio.create_task(self._kpi_calculation_worker())
            
            self.logger.info("Business metrics tracker initialized")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize metrics tracker: {e}")
    
    def _define_business_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Define all business metrics configurations"""
        return {
            # Revenue Metrics
            "revenue_total": {
                "type": MetricType.GAUGE,
                "description": "Total revenue across all time",
                "unit": "USD",
                "category": "revenue",
                "critical_threshold": None,
                "warning_threshold": None,
            },
            "revenue_daily": {
                "type": MetricType.GAUGE,
                "description": "Daily revenue",
                "unit": "USD",
                "category": "revenue",
                "critical_threshold": 1000,  # Below $1000/day
                "warning_threshold": 2000,
            },
            "revenue_monthly": {
                "type": MetricType.GAUGE,
                "description": "Monthly revenue",
                "unit": "USD",
                "category": "revenue",
                "critical_threshold": 30000,
                "warning_threshold": 50000,
            },
            "average_booking_value": {
                "type": MetricType.GAUGE,
                "description": "Average value per booking",
                "unit": "USD",
                "category": "revenue",
                "critical_threshold": 20,
                "warning_threshold": 30,
            },
            "revenue_per_user": {
                "type": MetricType.GAUGE,
                "description": "Average revenue per user",
                "unit": "USD",
                "category": "revenue",
                "critical_threshold": 50,
                "warning_threshold": 100,
            },
            
            # Booking Metrics
            "bookings_total": {
                "type": MetricType.COUNTER,
                "description": "Total number of bookings",
                "unit": "count",
                "category": "bookings",
            },
            "bookings_daily": {
                "type": MetricType.GAUGE,
                "description": "Daily booking count",
                "unit": "count",
                "category": "bookings",
                "critical_threshold": 10,
                "warning_threshold": 20,
            },
            "bookings_completed": {
                "type": MetricType.COUNTER,
                "description": "Number of completed bookings",
                "unit": "count",
                "category": "bookings",
            },
            "bookings_cancelled": {
                "type": MetricType.COUNTER,
                "description": "Number of cancelled bookings",
                "unit": "count",
                "category": "bookings",
            },
            "bookings_no_show": {
                "type": MetricType.COUNTER,
                "description": "Number of no-show bookings",
                "unit": "count",
                "category": "bookings",
            },
            "booking_completion_rate": {
                "type": MetricType.GAUGE,
                "description": "Percentage of bookings completed",
                "unit": "percentage",
                "category": "bookings",
                "critical_threshold": 70,
                "warning_threshold": 80,
            },
            "booking_cancellation_rate": {
                "type": MetricType.GAUGE,
                "description": "Percentage of bookings cancelled",
                "unit": "percentage",
                "category": "bookings",
                "critical_threshold": 30,
                "warning_threshold": 20,
            },
            "booking_conversion_rate": {
                "type": MetricType.GAUGE,
                "description": "Rate of booking flow completion",
                "unit": "percentage",
                "category": "bookings",
                "critical_threshold": 60,
                "warning_threshold": 70,
            },
            
            # User Metrics
            "users_total": {
                "type": MetricType.GAUGE,
                "description": "Total registered users",
                "unit": "count",
                "category": "users",
            },
            "users_active_daily": {
                "type": MetricType.GAUGE,
                "description": "Daily active users",
                "unit": "count",
                "category": "users",
                "critical_threshold": 50,
                "warning_threshold": 100,
            },
            "users_active_monthly": {
                "type": MetricType.GAUGE,
                "description": "Monthly active users",
                "unit": "count",
                "category": "users",
                "critical_threshold": 500,
                "warning_threshold": 1000,
            },
            "user_registrations_daily": {
                "type": MetricType.COUNTER,
                "description": "Daily new user registrations",
                "unit": "count",
                "category": "users",
                "critical_threshold": 5,
                "warning_threshold": 10,
            },
            "user_retention_rate": {
                "type": MetricType.GAUGE,
                "description": "User retention rate (30-day)",
                "unit": "percentage",
                "category": "users",
                "critical_threshold": 40,
                "warning_threshold": 60,
            },
            "user_churn_rate": {
                "type": MetricType.GAUGE,
                "description": "User churn rate (monthly)",
                "unit": "percentage",
                "category": "users",
                "critical_threshold": 15,
                "warning_threshold": 10,
            },
            
            # Payment Metrics
            "payments_processed": {
                "type": MetricType.COUNTER,
                "description": "Number of processed payments",
                "unit": "count",
                "category": "payments",
            },
            "payments_failed": {
                "type": MetricType.COUNTER,
                "description": "Number of failed payments",
                "unit": "count",
                "category": "payments",
            },
            "payment_success_rate": {
                "type": MetricType.GAUGE,
                "description": "Payment success rate",
                "unit": "percentage",
                "category": "payments",
                "critical_threshold": 95,
                "warning_threshold": 98,
            },
            "payment_processing_time": {
                "type": MetricType.HISTOGRAM,
                "description": "Payment processing time",
                "unit": "milliseconds",
                "category": "payments",
                "critical_threshold": 5000,
                "warning_threshold": 3000,
            },
            "refunds_processed": {
                "type": MetricType.COUNTER,
                "description": "Number of refunds processed",
                "unit": "count",
                "category": "payments",
            },
            
            # Operational Metrics
            "barbers_active": {
                "type": MetricType.GAUGE,
                "description": "Number of active barbers",
                "unit": "count",
                "category": "operations",
            },
            "locations_active": {
                "type": MetricType.GAUGE,
                "description": "Number of active locations",
                "unit": "count",
                "category": "operations",
            },
            "services_offered": {
                "type": MetricType.GAUGE,
                "description": "Number of services offered",
                "unit": "count",
                "category": "operations",
            },
            "average_session_duration": {
                "type": MetricType.GAUGE,
                "description": "Average user session duration",
                "unit": "minutes",
                "category": "operations",
            },
            "support_tickets_open": {
                "type": MetricType.GAUGE,
                "description": "Number of open support tickets",
                "unit": "count",
                "category": "operations",
                "critical_threshold": 20,
                "warning_threshold": 10,
            },
            
            # Marketing Metrics
            "email_notifications_sent": {
                "type": MetricType.COUNTER,
                "description": "Email notifications sent",
                "unit": "count",
                "category": "marketing",
            },
            "sms_notifications_sent": {
                "type": MetricType.COUNTER,
                "description": "SMS notifications sent",
                "unit": "count",
                "category": "marketing",
            },
            "notification_delivery_rate": {
                "type": MetricType.GAUGE,
                "description": "Notification delivery success rate",
                "unit": "percentage",
                "category": "marketing",
                "critical_threshold": 90,
                "warning_threshold": 95,
            },
            "email_open_rate": {
                "type": MetricType.GAUGE,
                "description": "Email open rate",
                "unit": "percentage",
                "category": "marketing",
                "critical_threshold": 15,
                "warning_threshold": 20,
            },
            "email_click_rate": {
                "type": MetricType.GAUGE,
                "description": "Email click-through rate",
                "unit": "percentage",
                "category": "marketing",
                "critical_threshold": 2,
                "warning_threshold": 5,
            },
            
            # Performance Metrics
            "api_response_time_avg": {
                "type": MetricType.GAUGE,
                "description": "Average API response time",
                "unit": "milliseconds",
                "category": "performance",
                "critical_threshold": 2000,
                "warning_threshold": 1000,
            },
            "page_load_time_avg": {
                "type": MetricType.GAUGE,
                "description": "Average page load time",
                "unit": "milliseconds",
                "category": "performance",
                "critical_threshold": 5000,
                "warning_threshold": 3000,
            },
            "error_rate": {
                "type": MetricType.GAUGE,
                "description": "Application error rate",
                "unit": "percentage",
                "category": "performance",
                "critical_threshold": 5,
                "warning_threshold": 2,
            },
            "uptime_percentage": {
                "type": MetricType.GAUGE,
                "description": "System uptime percentage",
                "unit": "percentage",
                "category": "performance",
                "critical_threshold": 99.5,
                "warning_threshold": 99.9,
            },
        }
    
    async def track_metric(self, metric_name: str, value: float, tags: Dict[str, str] = None, metadata: Dict[str, Any] = None):
        """Track a business metric"""
        try:
            if metric_name not in self.business_metrics_config:
                self.logger.warning(f"Unknown metric: {metric_name}")
                return
            
            config = self.business_metrics_config[metric_name]
            
            metric = BusinessMetric(
                name=metric_name,
                value=value,
                metric_type=config["type"],
                timestamp=datetime.utcnow(),
                tags=tags or {},
                metadata=metadata or {},
            )
            
            # Store in Redis for real-time access
            if self.redis:
                await self._store_metric_in_redis(metric)
            
            # Cache for aggregation
            self._cache_metric(metric)
            
            # Check thresholds and trigger alerts if needed
            await self._check_metric_thresholds(metric, config)
            
            self.logger.debug(f"Tracked metric: {metric_name} = {value}")
            
        except Exception as e:
            self.logger.error(f"Failed to track metric {metric_name}: {e}")
    
    async def _store_metric_in_redis(self, metric: BusinessMetric):
        """Store metric in Redis"""
        try:
            # Store current value
            await self.redis.setex(
                f"metric:current:{metric.name}",
                3600,  # 1 hour TTL
                json.dumps(metric.to_dict())
            )
            
            # Add to time series
            timestamp = int(metric.timestamp.timestamp())
            await self.redis.zadd(
                f"metric:timeseries:{metric.name}",
                {json.dumps(metric.to_dict()): timestamp}
            )
            
            # Keep only last 24 hours of data
            cutoff = timestamp - (24 * 3600)
            await self.redis.zremrangebyscore(
                f"metric:timeseries:{metric.name}",
                0,
                cutoff
            )
            
        except Exception as e:
            self.logger.error(f"Failed to store metric in Redis: {e}")
    
    def _cache_metric(self, metric: BusinessMetric):
        """Cache metric for aggregation"""
        if metric.name not in self.metrics_cache:
            self.metrics_cache[metric.name] = []
        
        self.metrics_cache[metric.name].append(metric)
        
        # Keep only last 1000 entries per metric
        if len(self.metrics_cache[metric.name]) > 1000:
            self.metrics_cache[metric.name] = self.metrics_cache[metric.name][-1000:]
    
    async def _check_metric_thresholds(self, metric: BusinessMetric, config: Dict[str, Any]):
        """Check metric against thresholds and trigger alerts"""
        try:
            critical_threshold = config.get("critical_threshold")
            warning_threshold = config.get("warning_threshold")
            
            if critical_threshold is not None and metric.value < critical_threshold:
                await self._trigger_metric_alert(metric, "critical", critical_threshold)
            elif warning_threshold is not None and metric.value < warning_threshold:
                await self._trigger_metric_alert(metric, "warning", warning_threshold)
                
        except Exception as e:
            self.logger.error(f"Failed to check thresholds for {metric.name}: {e}")
    
    async def _trigger_metric_alert(self, metric: BusinessMetric, severity: str, threshold: float):
        """Trigger alert for metric threshold violation"""
        try:
            # Import here to avoid circular imports
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            severity_map = {
                "warning": AlertSeverity.WARNING,
                "critical": AlertSeverity.CRITICAL,
            }
            
            await send_alert(
                title=f"Business Metric Alert: {metric.name}",
                description=f"Metric {metric.name} value {metric.value} is below threshold {threshold}",
                severity=severity_map.get(severity, AlertSeverity.WARNING),
                source="business_metrics",
                category="business_kpi",
                metadata={
                    "metric_name": metric.name,
                    "current_value": metric.value,
                    "threshold": threshold,
                    "metric_type": metric.metric_type.value,
                },
                tags=["business_metrics", "kpi", severity],
            )
            
        except Exception as e:
            self.logger.error(f"Failed to trigger metric alert: {e}")
    
    async def get_current_metrics(self, category: str = None) -> Dict[str, BusinessMetric]:
        """Get current values for all metrics"""
        try:
            current_metrics = {}
            
            for metric_name, config in self.business_metrics_config.items():
                if category and config["category"] != category:
                    continue
                
                if self.redis:
                    # Get from Redis
                    metric_data = await self.redis.get(f"metric:current:{metric_name}")
                    if metric_data:
                        data = json.loads(metric_data)
                        current_metrics[metric_name] = BusinessMetric(
                            name=data["name"],
                            value=data["value"],
                            metric_type=MetricType(data["metric_type"]),
                            timestamp=datetime.fromisoformat(data["timestamp"]),
                            tags=data.get("tags"),
                            metadata=data.get("metadata"),
                        )
                else:
                    # Get from cache
                    if metric_name in self.metrics_cache and self.metrics_cache[metric_name]:
                        current_metrics[metric_name] = self.metrics_cache[metric_name][-1]
            
            return current_metrics
            
        except Exception as e:
            self.logger.error(f"Failed to get current metrics: {e}")
            return {}
    
    async def get_metric_history(self, metric_name: str, timeframe: MetricTimeframe, limit: int = 100) -> List[BusinessMetric]:
        """Get historical data for a metric"""
        try:
            if not self.redis:
                # Fallback to cache
                return self.metrics_cache.get(metric_name, [])[-limit:]
            
            # Get from Redis time series
            end_time = int(datetime.utcnow().timestamp())
            
            if timeframe == MetricTimeframe.HOURLY:
                start_time = end_time - (24 * 3600)  # Last 24 hours
            elif timeframe == MetricTimeframe.DAILY:
                start_time = end_time - (30 * 24 * 3600)  # Last 30 days
            elif timeframe == MetricTimeframe.WEEKLY:
                start_time = end_time - (12 * 7 * 24 * 3600)  # Last 12 weeks
            else:
                start_time = end_time - (7 * 24 * 3600)  # Default: last 7 days
            
            results = await self.redis.zrangebyscore(
                f"metric:timeseries:{metric_name}",
                start_time,
                end_time,
                withscores=False,
                start=0,
                num=limit
            )
            
            metrics = []
            for result in results:
                data = json.loads(result)
                metrics.append(BusinessMetric(
                    name=data["name"],
                    value=data["value"],
                    metric_type=MetricType(data["metric_type"]),
                    timestamp=datetime.fromisoformat(data["timestamp"]),
                    tags=data.get("tags"),
                    metadata=data.get("metadata"),
                ))
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to get metric history for {metric_name}: {e}")
            return []
    
    async def calculate_kpi_dashboard(self) -> KPIDashboardData:
        """Calculate comprehensive KPI dashboard data"""
        try:
            current_metrics = await self.get_current_metrics()
            
            # Extract metrics by category
            revenue_metrics = {
                name: metric.value for name, metric in current_metrics.items()
                if self.business_metrics_config[name]["category"] == "revenue"
            }
            
            booking_metrics = {
                name: metric.value for name, metric in current_metrics.items()
                if self.business_metrics_config[name]["category"] == "bookings"
            }
            
            user_metrics = {
                name: metric.value for name, metric in current_metrics.items()
                if self.business_metrics_config[name]["category"] == "users"
            }
            
            operational_metrics = {
                name: metric.value for name, metric in current_metrics.items()
                if self.business_metrics_config[name]["category"] == "operations"
            }
            
            performance_metrics = {
                name: metric.value for name, metric in current_metrics.items()
                if self.business_metrics_config[name]["category"] == "performance"
            }
            
            return KPIDashboardData(
                timestamp=datetime.utcnow(),
                revenue_metrics=revenue_metrics,
                booking_metrics=booking_metrics,
                user_metrics=user_metrics,
                operational_metrics=operational_metrics,
                performance_metrics=performance_metrics,
            )
            
        except Exception as e:
            self.logger.error(f"Failed to calculate KPI dashboard: {e}")
            return KPIDashboardData(
                timestamp=datetime.utcnow(),
                revenue_metrics={},
                booking_metrics={},
                user_metrics={},
                operational_metrics={},
                performance_metrics={},
            )
    
    async def refresh_metrics_from_database(self):
        """Refresh metrics by querying the database"""
        if not self.db_session_factory:
            self.logger.warning("No database session factory configured")
            return
        
        try:
            db = self.db_session_factory()
            
            # Revenue Metrics
            await self._calculate_revenue_metrics(db)
            
            # Booking Metrics
            await self._calculate_booking_metrics(db)
            
            # User Metrics
            await self._calculate_user_metrics(db)
            
            # Payment Metrics
            await self._calculate_payment_metrics(db)
            
            # Operational Metrics
            await self._calculate_operational_metrics(db)
            
            db.close()
            
            self.logger.info("Successfully refreshed metrics from database")
            
        except Exception as e:
            self.logger.error(f"Failed to refresh metrics from database: {e}")
    
    async def _calculate_revenue_metrics(self, db: Session):
        """Calculate revenue-related metrics"""
        try:
            # Total revenue
            total_revenue = db.execute(text("""
                SELECT COALESCE(SUM(amount), 0) as total_revenue
                FROM payments 
                WHERE status = 'completed'
            """)).scalar()
            
            await self.track_metric("revenue_total", total_revenue or 0)
            
            # Daily revenue
            daily_revenue = db.execute(text("""
                SELECT COALESCE(SUM(amount), 0) as daily_revenue
                FROM payments 
                WHERE status = 'completed' 
                AND DATE(created_at) = CURRENT_DATE
            """)).scalar()
            
            await self.track_metric("revenue_daily", daily_revenue or 0)
            
            # Monthly revenue
            monthly_revenue = db.execute(text("""
                SELECT COALESCE(SUM(amount), 0) as monthly_revenue
                FROM payments 
                WHERE status = 'completed' 
                AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
            """)).scalar()
            
            await self.track_metric("revenue_monthly", monthly_revenue or 0)
            
            # Average booking value
            avg_booking_value = db.execute(text("""
                SELECT COALESCE(AVG(amount), 0) as avg_booking_value
                FROM payments 
                WHERE status = 'completed'
                AND created_at >= CURRENT_DATE - INTERVAL '30 days'
            """)).scalar()
            
            await self.track_metric("average_booking_value", avg_booking_value or 0)
            
        except Exception as e:
            self.logger.error(f"Failed to calculate revenue metrics: {e}")
    
    async def _calculate_booking_metrics(self, db: Session):
        """Calculate booking-related metrics"""
        try:
            # Total bookings
            total_bookings = db.execute(text("""
                SELECT COUNT(*) as total_bookings FROM appointments
            """)).scalar()
            
            await self.track_metric("bookings_total", total_bookings or 0)
            
            # Daily bookings
            daily_bookings = db.execute(text("""
                SELECT COUNT(*) as daily_bookings 
                FROM appointments 
                WHERE DATE(created_at) = CURRENT_DATE
            """)).scalar()
            
            await self.track_metric("bookings_daily", daily_bookings or 0)
            
            # Booking status counts
            status_counts = db.execute(text("""
                SELECT 
                    status,
                    COUNT(*) as count
                FROM appointments 
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY status
            """)).fetchall()
            
            completed_bookings = 0
            cancelled_bookings = 0
            total_recent_bookings = 0
            
            for row in status_counts:
                total_recent_bookings += row.count
                if row.status == 'completed':
                    completed_bookings = row.count
                elif row.status == 'cancelled':
                    cancelled_bookings = row.count
            
            await self.track_metric("bookings_completed", completed_bookings)
            await self.track_metric("bookings_cancelled", cancelled_bookings)
            
            # Completion and cancellation rates
            if total_recent_bookings > 0:
                completion_rate = (completed_bookings / total_recent_bookings) * 100
                cancellation_rate = (cancelled_bookings / total_recent_bookings) * 100
                
                await self.track_metric("booking_completion_rate", completion_rate)
                await self.track_metric("booking_cancellation_rate", cancellation_rate)
            
        except Exception as e:
            self.logger.error(f"Failed to calculate booking metrics: {e}")
    
    async def _calculate_user_metrics(self, db: Session):
        """Calculate user-related metrics"""
        try:
            # Total users
            total_users = db.execute(text("""
                SELECT COUNT(*) as total_users FROM users
            """)).scalar()
            
            await self.track_metric("users_total", total_users or 0)
            
            # Daily active users (users who logged in today)
            daily_active = db.execute(text("""
                SELECT COUNT(DISTINCT user_id) as daily_active
                FROM user_sessions 
                WHERE DATE(created_at) = CURRENT_DATE
            """)).scalar()
            
            await self.track_metric("users_active_daily", daily_active or 0)
            
            # Monthly active users
            monthly_active = db.execute(text("""
                SELECT COUNT(DISTINCT user_id) as monthly_active
                FROM user_sessions 
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            """)).scalar()
            
            await self.track_metric("users_active_monthly", monthly_active or 0)
            
            # Daily registrations
            daily_registrations = db.execute(text("""
                SELECT COUNT(*) as daily_registrations 
                FROM users 
                WHERE DATE(created_at) = CURRENT_DATE
            """)).scalar()
            
            await self.track_metric("user_registrations_daily", daily_registrations or 0)
            
        except Exception as e:
            self.logger.error(f"Failed to calculate user metrics: {e}")
    
    async def _calculate_payment_metrics(self, db: Session):
        """Calculate payment-related metrics"""
        try:
            # Payment counts
            payment_stats = db.execute(text("""
                SELECT 
                    status,
                    COUNT(*) as count,
                    AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_processing_time
                FROM payments 
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY status
            """)).fetchall()
            
            processed_payments = 0
            failed_payments = 0
            avg_processing_time = 0
            
            for row in payment_stats:
                if row.status == 'completed':
                    processed_payments = row.count
                    avg_processing_time = row.avg_processing_time or 0
                elif row.status == 'failed':
                    failed_payments = row.count
            
            await self.track_metric("payments_processed", processed_payments)
            await self.track_metric("payments_failed", failed_payments)
            await self.track_metric("payment_processing_time", avg_processing_time)
            
            # Payment success rate
            total_payments = processed_payments + failed_payments
            if total_payments > 0:
                success_rate = (processed_payments / total_payments) * 100
                await self.track_metric("payment_success_rate", success_rate)
            
        except Exception as e:
            self.logger.error(f"Failed to calculate payment metrics: {e}")
    
    async def _calculate_operational_metrics(self, db: Session):
        """Calculate operational metrics"""
        try:
            # Active barbers
            active_barbers = db.execute(text("""
                SELECT COUNT(*) as active_barbers 
                FROM users 
                WHERE role = 'barber' AND is_active = true
            """)).scalar()
            
            await self.track_metric("barbers_active", active_barbers or 0)
            
            # Active locations
            active_locations = db.execute(text("""
                SELECT COUNT(*) as active_locations 
                FROM locations 
                WHERE is_active = true
            """)).scalar()
            
            await self.track_metric("locations_active", active_locations or 0)
            
            # Services offered
            services_count = db.execute(text("""
                SELECT COUNT(*) as services_count 
                FROM services 
                WHERE is_active = true
            """)).scalar()
            
            await self.track_metric("services_offered", services_count or 0)
            
        except Exception as e:
            self.logger.error(f"Failed to calculate operational metrics: {e}")
    
    async def _metrics_aggregation_worker(self):
        """Background worker for metrics aggregation"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                await self.refresh_metrics_from_database()
                
            except Exception as e:
                self.logger.error(f"Metrics aggregation worker error: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def _kpi_calculation_worker(self):
        """Background worker for KPI calculations"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                kpi_data = await self.calculate_kpi_dashboard()
                
                # Store KPI data in Redis
                if self.redis:
                    await self.redis.setex(
                        "kpi:dashboard:latest",
                        300,  # 5 minutes TTL
                        json.dumps(kpi_data.to_dict())
                    )
                
            except Exception as e:
                self.logger.error(f"KPI calculation worker error: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def get_business_insights(self) -> Dict[str, Any]:
        """Generate business insights from metrics"""
        try:
            current_metrics = await self.get_current_metrics()
            
            insights = {
                "revenue_health": "good",
                "booking_trends": "stable",
                "user_growth": "positive",
                "operational_efficiency": "optimal",
                "recommendations": [],
            }
            
            # Revenue insights
            daily_revenue = current_metrics.get("revenue_daily", {}).value if "revenue_daily" in current_metrics else 0
            if daily_revenue < 1000:
                insights["revenue_health"] = "concerning"
                insights["recommendations"].append("Consider promotional campaigns to boost daily revenue")
            
            # Booking insights
            cancellation_rate = current_metrics.get("booking_cancellation_rate", {}).value if "booking_cancellation_rate" in current_metrics else 0
            if cancellation_rate > 20:
                insights["booking_trends"] = "concerning"
                insights["recommendations"].append("High cancellation rate detected - review booking policies")
            
            # User growth insights
            daily_registrations = current_metrics.get("user_registrations_daily", {}).value if "user_registrations_daily" in current_metrics else 0
            if daily_registrations < 5:
                insights["user_growth"] = "slow"
                insights["recommendations"].append("Focus on user acquisition strategies")
            
            # Performance insights
            error_rate = current_metrics.get("error_rate", {}).value if "error_rate" in current_metrics else 0
            if error_rate > 2:
                insights["operational_efficiency"] = "needs_attention"
                insights["recommendations"].append("High error rate detected - investigate system issues")
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Failed to generate business insights: {e}")
            return {"error": "Failed to generate insights"}


# Global metrics tracker instance
business_metrics = BusinessMetricsTracker()

# Convenience functions
async def track_revenue(amount: float, tags: Dict[str, str] = None):
    """Track revenue metric"""
    await business_metrics.track_metric("revenue_total", amount, tags)

async def track_booking_created(tags: Dict[str, str] = None):
    """Track booking creation"""
    await business_metrics.track_metric("bookings_total", 1, tags)

async def track_user_registration(tags: Dict[str, str] = None):
    """Track user registration"""
    await business_metrics.track_metric("user_registrations_daily", 1, tags)

async def track_payment_processed(amount: float, processing_time_ms: float, tags: Dict[str, str] = None):
    """Track payment processing"""
    await business_metrics.track_metric("payments_processed", 1, tags)
    await business_metrics.track_metric("payment_processing_time", processing_time_ms, tags)

async def initialize_business_metrics():
    """Initialize business metrics system"""
    await business_metrics.initialize()