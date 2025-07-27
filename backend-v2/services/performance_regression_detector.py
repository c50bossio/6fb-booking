"""
Performance Regression Detection System
Automatically detects performance degradations and provides intelligent alerting.
"""

import asyncio
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import statistics
import numpy as np
from collections import deque

from services.performance_monitoring import performance_tracker, PerformanceLevel
from services.redis_cache import cache_service

logger = logging.getLogger(__name__)

class RegressionSeverity(Enum):
    MINOR = "minor"         # 10-20% degradation
    MODERATE = "moderate"   # 20-40% degradation
    MAJOR = "major"         # 40-80% degradation
    CRITICAL = "critical"   # >80% degradation

class RegressionType(Enum):
    RESPONSE_TIME = "response_time"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    DATABASE_PERFORMANCE = "database_performance"
    CACHE_EFFICIENCY = "cache_efficiency"

@dataclass
class PerformanceBaseline:
    """Performance baseline for comparison"""
    metric_name: str
    baseline_value: float
    standard_deviation: float
    sample_count: int
    created_at: datetime
    confidence_interval: Tuple[float, float]
    percentiles: Dict[str, float]  # P50, P95, P99

@dataclass
class RegressionAlert:
    """Performance regression alert"""
    id: str
    regression_type: RegressionType
    severity: RegressionSeverity
    metric_name: str
    baseline_value: float
    current_value: float
    degradation_percent: float
    detected_at: datetime
    context: Dict[str, Any]
    recommendations: List[str]
    acknowledged: bool = False
    resolved: bool = False

class StatisticalAnalyzer:
    """Statistical analysis utilities for performance data"""
    
    @staticmethod
    def calculate_baseline(values: List[float]) -> PerformanceBaseline:
        """Calculate statistical baseline from historical data"""
        if len(values) < 10:
            raise ValueError("Insufficient data points for baseline calculation")
        
        values = np.array(values)
        mean_val = np.mean(values)
        std_dev = np.std(values)
        
        # Calculate confidence interval (95%)
        confidence_margin = 1.96 * (std_dev / np.sqrt(len(values)))
        confidence_interval = (mean_val - confidence_margin, mean_val + confidence_margin)
        
        # Calculate percentiles
        percentiles = {
            "p50": np.percentile(values, 50),
            "p75": np.percentile(values, 75),
            "p90": np.percentile(values, 90),
            "p95": np.percentile(values, 95),
            "p99": np.percentile(values, 99)
        }
        
        return PerformanceBaseline(
            metric_name="",
            baseline_value=mean_val,
            standard_deviation=std_dev,
            sample_count=len(values),
            created_at=datetime.now(),
            confidence_interval=confidence_interval,
            percentiles=percentiles
        )
    
    @staticmethod
    def detect_anomaly(current_value: float, baseline: PerformanceBaseline, z_threshold: float = 2.0) -> bool:
        """Detect if current value is anomalous compared to baseline"""
        if baseline.standard_deviation == 0:
            return False
        
        z_score = abs((current_value - baseline.baseline_value) / baseline.standard_deviation)
        return z_score > z_threshold
    
    @staticmethod
    def calculate_trend(values: List[float], window_size: int = 10) -> str:
        """Calculate trend direction using moving averages"""
        if len(values) < window_size * 2:
            return "insufficient_data"
        
        recent_avg = np.mean(values[-window_size:])
        previous_avg = np.mean(values[-window_size*2:-window_size])
        
        change_percent = ((recent_avg - previous_avg) / previous_avg) * 100
        
        if change_percent > 5:
            return "increasing"
        elif change_percent < -5:
            return "decreasing"
        else:
            return "stable"

class PerformanceRegressionDetector:
    """Main regression detection system"""
    
    def __init__(self):
        self.baselines: Dict[str, PerformanceBaseline] = {}
        self.active_alerts: Dict[str, RegressionAlert] = {}
        self.historical_data: Dict[str, deque] = {}
        self.detection_enabled = True
        
        # Configuration
        self.baseline_window_hours = 24  # Use last 24 hours for baseline
        self.min_samples_for_baseline = 30
        self.detection_thresholds = {
            RegressionSeverity.MINOR: 10.0,      # 10% degradation
            RegressionSeverity.MODERATE: 20.0,   # 20% degradation  
            RegressionSeverity.MAJOR: 40.0,      # 40% degradation
            RegressionSeverity.CRITICAL: 80.0    # 80% degradation
        }
        
        # Metric configurations
        self.metric_configs = {
            "api_response_time": {
                "type": RegressionType.RESPONSE_TIME,
                "unit": "ms",
                "threshold_multiplier": 1.0,
                "direction": "lower_is_better"
            },
            "cpu_usage": {
                "type": RegressionType.CPU_USAGE,
                "unit": "percent",
                "threshold_multiplier": 1.0,
                "direction": "lower_is_better"
            },
            "memory_usage": {
                "type": RegressionType.MEMORY_USAGE,
                "unit": "percent", 
                "threshold_multiplier": 1.0,
                "direction": "lower_is_better"
            },
            "error_rate": {
                "type": RegressionType.ERROR_RATE,
                "unit": "percent",
                "threshold_multiplier": 2.0,  # More sensitive to error increases
                "direction": "lower_is_better"
            },
            "database_response_time": {
                "type": RegressionType.DATABASE_PERFORMANCE,
                "unit": "ms",
                "threshold_multiplier": 1.0,
                "direction": "lower_is_better"
            },
            "cache_hit_rate": {
                "type": RegressionType.CACHE_EFFICIENCY,
                "unit": "percent",
                "threshold_multiplier": 1.0,
                "direction": "higher_is_better"
            }
        }
        
        self._start_monitoring()
    
    async def add_measurement(self, metric_name: str, value: float, context: Dict[str, Any] = None):
        """Add a new performance measurement"""
        if not self.detection_enabled:
            return
        
        # Store in historical data
        if metric_name not in self.historical_data:
            self.historical_data[metric_name] = deque(maxlen=1000)  # Keep last 1000 measurements
        
        self.historical_data[metric_name].append({
            "value": value,
            "timestamp": datetime.now(),
            "context": context or {}
        })
        
        # Update baseline if we have enough data
        await self._update_baseline(metric_name)
        
        # Check for regressions
        await self._check_for_regression(metric_name, value, context or {})
    
    async def _update_baseline(self, metric_name: str):
        """Update baseline for a metric using recent historical data"""
        if metric_name not in self.historical_data:
            return
        
        # Get recent data points for baseline calculation
        cutoff_time = datetime.now() - timedelta(hours=self.baseline_window_hours)
        recent_data = [
            point for point in self.historical_data[metric_name]
            if point["timestamp"] > cutoff_time
        ]
        
        if len(recent_data) < self.min_samples_for_baseline:
            return
        
        values = [point["value"] for point in recent_data]
        
        try:
            baseline = StatisticalAnalyzer.calculate_baseline(values)
            baseline.metric_name = metric_name
            self.baselines[metric_name] = baseline
            
            # Cache the baseline
            await cache_service.set(
                f"baseline:{metric_name}",
                asdict(baseline),
                ttl=3600  # Cache for 1 hour
            )
            
            logger.debug(f"Updated baseline for {metric_name}: {baseline.baseline_value:.2f} ± {baseline.standard_deviation:.2f}")
            
        except Exception as e:
            logger.warning(f"Failed to update baseline for {metric_name}: {e}")
    
    async def _check_for_regression(self, metric_name: str, current_value: float, context: Dict[str, Any]):
        """Check if current value indicates a performance regression"""
        if metric_name not in self.baselines:
            return
        
        baseline = self.baselines[metric_name]
        metric_config = self.metric_configs.get(metric_name, {})
        
        # Calculate degradation percentage
        baseline_value = baseline.baseline_value
        degradation_percent = self._calculate_degradation_percent(
            baseline_value, current_value, metric_config.get("direction", "lower_is_better")
        )
        
        # Determine severity
        severity = self._determine_severity(degradation_percent)
        
        if severity is None:
            # No significant degradation
            return
        
        # Check if this is a new alert or existing one
        alert_key = f"{metric_name}_{severity.value}"
        
        if alert_key not in self.active_alerts:
            # Create new alert
            alert = RegressionAlert(
                id=f"reg_{int(time.time())}_{metric_name}",
                regression_type=metric_config.get("type", RegressionType.RESPONSE_TIME),
                severity=severity,
                metric_name=metric_name,
                baseline_value=baseline_value,
                current_value=current_value,
                degradation_percent=degradation_percent,
                detected_at=datetime.now(),
                context=context,
                recommendations=self._generate_recommendations(metric_name, severity, degradation_percent)
            )
            
            self.active_alerts[alert_key] = alert
            
            # Send alert
            await self._send_regression_alert(alert)
            
            logger.warning(f"Performance regression detected: {metric_name} degraded by {degradation_percent:.1f}%")
    
    def _calculate_degradation_percent(self, baseline: float, current: float, direction: str) -> float:
        """Calculate percentage degradation based on metric direction"""
        if baseline == 0:
            return 0
        
        if direction == "lower_is_better":
            # For metrics where lower is better (response time, CPU usage)
            degradation = ((current - baseline) / baseline) * 100
        else:
            # For metrics where higher is better (cache hit rate, throughput)
            degradation = ((baseline - current) / baseline) * 100
        
        return max(0, degradation)  # Only positive degradations are regressions
    
    def _determine_severity(self, degradation_percent: float) -> Optional[RegressionSeverity]:
        """Determine regression severity based on degradation percentage"""
        if degradation_percent >= self.detection_thresholds[RegressionSeverity.CRITICAL]:
            return RegressionSeverity.CRITICAL
        elif degradation_percent >= self.detection_thresholds[RegressionSeverity.MAJOR]:
            return RegressionSeverity.MAJOR
        elif degradation_percent >= self.detection_thresholds[RegressionSeverity.MODERATE]:
            return RegressionSeverity.MODERATE
        elif degradation_percent >= self.detection_thresholds[RegressionSeverity.MINOR]:
            return RegressionSeverity.MINOR
        else:
            return None
    
    def _generate_recommendations(self, metric_name: str, severity: RegressionSeverity, degradation_percent: float) -> List[str]:
        """Generate performance improvement recommendations"""
        recommendations = []
        
        base_recommendations = {
            "api_response_time": [
                "Review recent code changes for performance impact",
                "Check database query performance and add indexes if needed",
                "Verify cache hit rates and optimize caching strategy",
                "Monitor CPU and memory usage for resource constraints"
            ],
            "cpu_usage": [
                "Identify CPU-intensive operations and optimize algorithms",
                "Check for inefficient loops or recursive functions",
                "Consider horizontal scaling if consistently high",
                "Review background job scheduling and resource allocation"
            ],
            "memory_usage": [
                "Check for memory leaks in application code",
                "Review cache sizes and memory allocation",
                "Optimize data structures and object lifecycle",
                "Consider increasing memory allocation or horizontal scaling"
            ],
            "error_rate": [
                "Investigate error logs for root cause analysis",
                "Check external service dependencies and timeouts",
                "Review input validation and error handling",
                "Verify database connectivity and query performance"
            ],
            "database_response_time": [
                "Analyze slow query logs and optimize problematic queries",
                "Add missing indexes for frequently queried columns",
                "Consider database connection pooling optimization",
                "Review database server resources and scaling options"
            ],
            "cache_hit_rate": [
                "Review cache key patterns and TTL settings",
                "Optimize cache warming strategies for common data",
                "Check cache memory limits and eviction policies",
                "Analyze cache access patterns and adjust strategies"
            ]
        }
        
        if metric_name in base_recommendations:
            recommendations.extend(base_recommendations[metric_name])
        
        # Add severity-specific recommendations
        if severity in [RegressionSeverity.MAJOR, RegressionSeverity.CRITICAL]:
            recommendations.extend([
                "Consider immediate rollback if recent deployment caused regression",
                "Implement emergency scaling measures",
                "Alert on-call engineering team for immediate investigation"
            ])
        
        return recommendations
    
    async def _send_regression_alert(self, alert: RegressionAlert):
        """Send regression alert through configured channels"""
        alert_data = {
            "alert_id": alert.id,
            "severity": alert.severity.value,
            "metric": alert.metric_name,
            "degradation_percent": alert.degradation_percent,
            "baseline_value": alert.baseline_value,
            "current_value": alert.current_value,
            "detected_at": alert.detected_at.isoformat(),
            "recommendations": alert.recommendations,
            "context": alert.context
        }
        
        # Log the alert
        logger.error(f"PERFORMANCE REGRESSION ALERT [{alert.severity.value.upper()}]: {alert.metric_name} degraded by {alert.degradation_percent:.1f}%")
        
        # Store alert in cache for dashboard
        await cache_service.set(
            f"regression_alert:{alert.id}",
            alert_data,
            ttl=86400  # Keep for 24 hours
        )
        
        # Send to external alerting systems (implement as needed)
        await self._send_external_alert(alert_data)
    
    async def _send_external_alert(self, alert_data: Dict[str, Any]):
        """Send alert to external systems (Slack, PagerDuty, etc.)"""
        # Placeholder for external alerting integration
        # Example implementations:
        
        # Slack webhook
        # await self._send_slack_alert(alert_data)
        
        # PagerDuty
        # await self._send_pagerduty_alert(alert_data)
        
        # Email
        # await self._send_email_alert(alert_data)
        
        pass
    
    def _start_monitoring(self):
        """Start continuous performance monitoring"""
        async def monitoring_loop():
            while self.detection_enabled:
                try:
                    await self._collect_system_metrics()
                    await self._cleanup_old_alerts()
                    await asyncio.sleep(60)  # Run every minute
                except Exception as e:
                    logger.error(f"Regression detection monitoring error: {e}")
                    await asyncio.sleep(30)  # Short retry delay
        
        asyncio.create_task(monitoring_loop())
        logger.info("Performance regression detection started")
    
    async def _collect_system_metrics(self):
        """Collect current system metrics for regression detection"""
        try:
            # Get current system health
            health_snapshot = await performance_tracker.track_system_health()
            
            # Add measurements for regression detection
            await self.add_measurement("cpu_usage", health_snapshot.cpu_percent)
            await self.add_measurement("memory_usage", health_snapshot.memory_percent)
            await self.add_measurement("database_response_time", health_snapshot.database_response_time_ms)
            await self.add_measurement("cache_hit_rate", health_snapshot.cache_hit_rate)
            await self.add_measurement("error_rate", health_snapshot.error_rate)
            
            # Calculate overall API response time
            api_stats = performance_tracker._calculate_api_statistics()
            overall_stats = api_stats.get("overall", {})
            if overall_stats.get("avg_response_time", 0) > 0:
                await self.add_measurement("api_response_time", overall_stats["avg_response_time"])
                
        except Exception as e:
            logger.warning(f"Failed to collect system metrics for regression detection: {e}")
    
    async def _cleanup_old_alerts(self):
        """Clean up resolved or old alerts"""
        try:
            current_time = datetime.now()
            alerts_to_remove = []
            
            for alert_key, alert in self.active_alerts.items():
                # Remove alerts older than 24 hours
                if (current_time - alert.detected_at).total_seconds() > 86400:
                    alerts_to_remove.append(alert_key)
                # Remove resolved alerts older than 1 hour
                elif alert.resolved and (current_time - alert.detected_at).total_seconds() > 3600:
                    alerts_to_remove.append(alert_key)
            
            for alert_key in alerts_to_remove:
                del self.active_alerts[alert_key]
                
        except Exception as e:
            logger.error(f"Alert cleanup error: {e}")
    
    async def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all active regression alerts"""
        return [asdict(alert) for alert in self.active_alerts.values()]
    
    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge a regression alert"""
        for alert in self.active_alerts.values():
            if alert.id == alert_id:
                alert.acknowledged = True
                logger.info(f"Regression alert {alert_id} acknowledged")
                return True
        return False
    
    async def resolve_alert(self, alert_id: str) -> bool:
        """Mark a regression alert as resolved"""
        for alert in self.active_alerts.values():
            if alert.id == alert_id:
                alert.resolved = True
                logger.info(f"Regression alert {alert_id} resolved")
                return True
        return False
    
    async def get_performance_trends(self, metric_name: str, hours: int = 24) -> Dict[str, Any]:
        """Get performance trends for a specific metric"""
        if metric_name not in self.historical_data:
            return {"error": "Metric not found"}
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_data = [
            point for point in self.historical_data[metric_name]
            if point["timestamp"] > cutoff_time
        ]
        
        if len(recent_data) < 2:
            return {"error": "Insufficient data"}
        
        values = [point["value"] for point in recent_data]
        timestamps = [point["timestamp"] for point in recent_data]
        
        # Calculate statistics
        current_value = values[-1]
        avg_value = statistics.mean(values)
        min_value = min(values)
        max_value = max(values)
        trend = StatisticalAnalyzer.calculate_trend(values)
        
        # Calculate percentiles
        p50 = statistics.median(values)
        p95 = values[int(len(values) * 0.95)] if len(values) > 20 else max_value
        
        baseline = self.baselines.get(metric_name)
        
        return {
            "metric_name": metric_name,
            "time_range_hours": hours,
            "data_points": len(recent_data),
            "current_value": current_value,
            "statistics": {
                "average": avg_value,
                "minimum": min_value,
                "maximum": max_value,
                "p50": p50,
                "p95": p95
            },
            "trend": trend,
            "baseline": asdict(baseline) if baseline else None,
            "last_updated": timestamps[-1].isoformat()
        }
    
    def enable_detection(self):
        """Enable regression detection"""
        self.detection_enabled = True
        logger.info("Performance regression detection enabled")
    
    def disable_detection(self):
        """Disable regression detection"""
        self.detection_enabled = False
        logger.info("Performance regression detection disabled")

# Global regression detector instance
regression_detector = PerformanceRegressionDetector()

# Export main components
__all__ = [
    "PerformanceRegressionDetector",
    "RegressionSeverity",
    "RegressionType", 
    "RegressionAlert",
    "regression_detector"
]