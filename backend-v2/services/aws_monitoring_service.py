"""
AWS Monitoring Service for ElastiCache Redis
==========================================

Real-time monitoring service that integrates with AWS CloudWatch to provide
comprehensive Redis performance tracking and alerting.

Features:
- Real-time Redis metrics collection
- CloudWatch integration
- Performance anomaly detection
- Auto-scaling recommendations
- Health status monitoring
- Custom metric publishing

Usage:
    from services.aws_monitoring_service import redis_monitor
    
    # Get current Redis health
    health = redis_monitor.get_health_status()
    
    # Publish custom metrics
    redis_monitor.publish_custom_metric('booking_cache_hits', 150)
"""

import logging
import time
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from services.redis_service import cache_service
from config.redis_config import get_redis_config
from config import settings

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Health status enumeration."""
    HEALTHY = "healthy"
    WARNING = "warning" 
    CRITICAL = "critical"
    UNKNOWN = "unknown"


@dataclass
class RedisMetrics:
    """Redis performance metrics."""
    timestamp: datetime
    used_memory: int
    used_memory_human: str
    connected_clients: int
    total_connections_received: int
    total_commands_processed: int
    keyspace_hits: int
    keyspace_misses: int
    hit_rate: float
    cpu_usage: float
    network_bytes_in: int
    network_bytes_out: int
    evicted_keys: int
    expired_keys: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class PerformanceAlert:
    """Performance alert information."""
    level: HealthStatus
    metric: str
    value: float
    threshold: float
    message: str
    timestamp: datetime
    recommendations: List[str]


class AWSMonitoringService:
    """AWS CloudWatch integration for Redis monitoring."""
    
    def __init__(self):
        """Initialize AWS monitoring service."""
        self.redis_config = get_redis_config()
        self.cache = cache_service
        
        # CloudWatch configuration
        self.cloudwatch_enabled = getattr(settings, 'cloudwatch_enabled', False)
        self.cloudwatch_namespace = getattr(settings, 'cloudwatch_namespace', 'BookedBarber/Redis')
        self.region = getattr(settings, 'aws_region', 'us-east-1')
        
        # Initialize AWS clients
        self.cloudwatch = None
        self.elasticache = None
        
        if self.cloudwatch_enabled:
            self._initialize_aws_clients()
        
        # Performance thresholds
        self.thresholds = {
            'memory_usage_percent': 80.0,
            'cpu_usage_percent': 70.0,
            'hit_rate_percent': 85.0,
            'connection_count': 45,
            'response_time_ms': 10.0,
            'eviction_rate': 100  # evictions per minute
        }
        
        # Metric history for trend analysis
        self.metric_history: List[RedisMetrics] = []
        self.max_history_size = 1000
        
        logger.info("AWS monitoring service initialized")
    
    def _initialize_aws_clients(self) -> None:
        """Initialize AWS CloudWatch clients."""
        try:
            session = boto3.Session()
            self.cloudwatch = session.client('cloudwatch', region_name=self.region)
            self.elasticache = session.client('elasticache', region_name=self.region)
            
            # Test credentials
            self.cloudwatch.list_metrics(Namespace=self.cloudwatch_namespace)
            logger.info("AWS CloudWatch client initialized successfully")
            
        except NoCredentialsError:
            logger.warning("AWS credentials not configured - CloudWatch integration disabled")
            self.cloudwatch_enabled = False
        except Exception as e:
            logger.error(f"Error initializing AWS clients: {e}")
            self.cloudwatch_enabled = False
    
    def collect_redis_metrics(self) -> Optional[RedisMetrics]:
        """Collect current Redis metrics."""
        if not self.cache.is_available():
            logger.warning("Redis cache not available for metrics collection")
            return None
        
        try:
            # Get Redis info
            redis_info = self.cache.get_stats()
            
            if not redis_info.get('available', False):
                return None
            
            # Calculate derived metrics
            hits = redis_info.get('keyspace_hits', 0)
            misses = redis_info.get('keyspace_misses', 0)
            hit_rate = self._calculate_hit_rate(hits, misses)
            
            # Create metrics object
            metrics = RedisMetrics(
                timestamp=datetime.utcnow(),
                used_memory=redis_info.get('used_memory', 0),
                used_memory_human=redis_info.get('used_memory_human', '0B'),
                connected_clients=redis_info.get('connected_clients', 0),
                total_connections_received=redis_info.get('total_connections_received', 0),
                total_commands_processed=redis_info.get('total_commands_processed', 0),
                keyspace_hits=hits,
                keyspace_misses=misses,
                hit_rate=hit_rate,
                cpu_usage=0.0,  # Not available from Redis INFO
                network_bytes_in=0,  # Not available from Redis INFO
                network_bytes_out=0,  # Not available from Redis INFO
                evicted_keys=redis_info.get('evicted_keys', 0),
                expired_keys=redis_info.get('expired_keys', 0)
            )
            
            # Store in history
            self._store_metric_history(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting Redis metrics: {e}")
            return None
    
    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        """Calculate cache hit rate."""
        total = hits + misses
        if total == 0:
            return 0.0
        return round((hits / total) * 100, 2)
    
    def _store_metric_history(self, metrics: RedisMetrics) -> None:
        """Store metrics in history for trend analysis."""
        self.metric_history.append(metrics)
        
        # Limit history size
        if len(self.metric_history) > self.max_history_size:
            self.metric_history = self.metric_history[-self.max_history_size:]
    
    def publish_cloudwatch_metrics(self, metrics: RedisMetrics) -> bool:
        """Publish metrics to CloudWatch."""
        if not self.cloudwatch_enabled or not self.cloudwatch:
            return False
        
        try:
            # Prepare CloudWatch metric data
            metric_data = [
                {
                    'MetricName': 'CacheHitRate',
                    'Value': metrics.hit_rate,
                    'Unit': 'Percent',
                    'Timestamp': metrics.timestamp
                },
                {
                    'MetricName': 'ConnectedClients',
                    'Value': metrics.connected_clients,
                    'Unit': 'Count',
                    'Timestamp': metrics.timestamp
                },
                {
                    'MetricName': 'UsedMemory',
                    'Value': metrics.used_memory,
                    'Unit': 'Bytes',
                    'Timestamp': metrics.timestamp
                },
                {
                    'MetricName': 'TotalConnectionsReceived',
                    'Value': metrics.total_connections_received,
                    'Unit': 'Count',
                    'Timestamp': metrics.timestamp
                },
                {
                    'MetricName': 'TotalCommandsProcessed',
                    'Value': metrics.total_commands_processed,
                    'Unit': 'Count',
                    'Timestamp': metrics.timestamp
                },
                {
                    'MetricName': 'KeyspaceHits',
                    'Value': metrics.keyspace_hits,
                    'Unit': 'Count',
                    'Timestamp': metrics.timestamp
                },
                {
                    'MetricName': 'KeyspaceMisses',
                    'Value': metrics.keyspace_misses,
                    'Unit': 'Count',
                    'Timestamp': metrics.timestamp
                },
                {
                    'MetricName': 'EvictedKeys',
                    'Value': metrics.evicted_keys,
                    'Unit': 'Count',
                    'Timestamp': metrics.timestamp
                },
                {
                    'MetricName': 'ExpiredKeys',
                    'Value': metrics.expired_keys,
                    'Unit': 'Count',
                    'Timestamp': metrics.timestamp
                }
            ]
            
            # Add cluster dimension if available
            dimensions = []
            if self.redis_config.aws_elasticache_enabled and self.redis_config.aws_elasticache_cluster_id:
                dimensions.append({
                    'Name': 'CacheClusterId',
                    'Value': self.redis_config.aws_elasticache_cluster_id
                })
            
            # Add dimensions to all metrics
            for metric in metric_data:
                metric['Dimensions'] = dimensions
            
            # Publish to CloudWatch (max 20 metrics per call)
            batch_size = 20
            for i in range(0, len(metric_data), batch_size):
                batch = metric_data[i:i + batch_size]
                
                self.cloudwatch.put_metric_data(
                    Namespace=self.cloudwatch_namespace,
                    MetricData=batch
                )
            
            logger.debug(f"Published {len(metric_data)} metrics to CloudWatch")
            return True
            
        except Exception as e:
            logger.error(f"Error publishing CloudWatch metrics: {e}")
            return False
    
    def publish_custom_metric(self, metric_name: str, value: float, unit: str = 'Count',
                            dimensions: Optional[Dict[str, str]] = None) -> bool:
        """Publish custom metric to CloudWatch."""
        if not self.cloudwatch_enabled or not self.cloudwatch:
            return False
        
        try:
            metric_data = {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit,
                'Timestamp': datetime.utcnow()
            }
            
            # Add dimensions
            metric_dimensions = []
            if dimensions:
                for name, value in dimensions.items():
                    metric_dimensions.append({'Name': name, 'Value': value})
            
            # Add cluster dimension if available
            if self.redis_config.aws_elasticache_enabled and self.redis_config.aws_elasticache_cluster_id:
                metric_dimensions.append({
                    'Name': 'CacheClusterId',
                    'Value': self.redis_config.aws_elasticache_cluster_id
                })
            
            metric_data['Dimensions'] = metric_dimensions
            
            self.cloudwatch.put_metric_data(
                Namespace=self.cloudwatch_namespace,
                MetricData=[metric_data]
            )
            
            logger.debug(f"Published custom metric: {metric_name} = {value}")
            return True
            
        except Exception as e:
            logger.error(f"Error publishing custom metric {metric_name}: {e}")
            return False
    
    def analyze_performance(self, metrics: RedisMetrics) -> List[PerformanceAlert]:
        """Analyze performance and generate alerts."""
        alerts = []
        
        # Memory usage analysis
        if hasattr(metrics, 'memory_usage_percent'):
            memory_percent = getattr(metrics, 'memory_usage_percent', 0)
            if memory_percent > self.thresholds['memory_usage_percent']:
                alerts.append(PerformanceAlert(
                    level=HealthStatus.WARNING if memory_percent < 90 else HealthStatus.CRITICAL,
                    metric='memory_usage',
                    value=memory_percent,
                    threshold=self.thresholds['memory_usage_percent'],
                    message=f"High memory usage: {memory_percent:.1f}%",
                    timestamp=metrics.timestamp,
                    recommendations=[
                        "Consider increasing instance size",
                        "Review cache TTL settings", 
                        "Implement cache key expiration"
                    ]
                ))
        
        # Hit rate analysis
        if metrics.hit_rate < self.thresholds['hit_rate_percent']:
            alerts.append(PerformanceAlert(
                level=HealthStatus.WARNING if metrics.hit_rate > 70 else HealthStatus.CRITICAL,
                metric='hit_rate',
                value=metrics.hit_rate,
                threshold=self.thresholds['hit_rate_percent'],
                message=f"Low cache hit rate: {metrics.hit_rate:.1f}%",
                timestamp=metrics.timestamp,
                recommendations=[
                    "Review cache key patterns",
                    "Optimize TTL values",
                    "Check application caching logic"
                ]
            ))
        
        # Connection count analysis
        if metrics.connected_clients > self.thresholds['connection_count']:
            alerts.append(PerformanceAlert(
                level=HealthStatus.WARNING,
                metric='connection_count',
                value=metrics.connected_clients,
                threshold=self.thresholds['connection_count'],
                message=f"High connection count: {metrics.connected_clients}",
                timestamp=metrics.timestamp,
                recommendations=[
                    "Review connection pooling settings",
                    "Check for connection leaks",
                    "Consider increasing max connections"
                ]
            ))
        
        # Eviction analysis
        eviction_rate = self._calculate_eviction_rate(metrics)
        if eviction_rate > self.thresholds['eviction_rate']:
            alerts.append(PerformanceAlert(
                level=HealthStatus.WARNING,
                metric='eviction_rate',
                value=eviction_rate,
                threshold=self.thresholds['eviction_rate'],
                message=f"High eviction rate: {eviction_rate:.1f}/min",
                timestamp=metrics.timestamp,
                recommendations=[
                    "Increase memory allocation",
                    "Review maxmemory-policy setting",
                    "Optimize cache key TTL values"
                ]
            ))
        
        return alerts
    
    def _calculate_eviction_rate(self, metrics: RedisMetrics) -> float:
        """Calculate eviction rate per minute."""
        if len(self.metric_history) < 2:
            return 0.0
        
        # Get previous metrics (5 minutes ago)
        previous_metrics = None
        current_time = metrics.timestamp
        
        for historical_metrics in reversed(self.metric_history):
            time_diff = (current_time - historical_metrics.timestamp).total_seconds()
            if 240 <= time_diff <= 360:  # 4-6 minutes ago
                previous_metrics = historical_metrics
                break
        
        if not previous_metrics:
            return 0.0
        
        # Calculate rate
        eviction_diff = metrics.evicted_keys - previous_metrics.evicted_keys
        time_diff_minutes = (current_time - previous_metrics.timestamp).total_seconds() / 60
        
        if time_diff_minutes <= 0:
            return 0.0
        
        return eviction_diff / time_diff_minutes
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status."""
        # Collect current metrics
        metrics = self.collect_redis_metrics()
        
        if not metrics:
            return {
                'status': HealthStatus.UNKNOWN.value,
                'message': 'Unable to collect Redis metrics',
                'timestamp': datetime.utcnow().isoformat(),
                'alerts': [],
                'recommendations': ['Check Redis connectivity']
            }
        
        # Analyze performance
        alerts = self.analyze_performance(metrics)
        
        # Determine overall health status
        if any(alert.level == HealthStatus.CRITICAL for alert in alerts):
            overall_status = HealthStatus.CRITICAL
        elif any(alert.level == HealthStatus.WARNING for alert in alerts):
            overall_status = HealthStatus.WARNING
        else:
            overall_status = HealthStatus.HEALTHY
        
        # Generate recommendations
        recommendations = []
        for alert in alerts:
            recommendations.extend(alert.recommendations)
        
        # Remove duplicates
        recommendations = list(set(recommendations))
        
        return {
            'status': overall_status.value,
            'message': f"Redis cluster health: {overall_status.value}",
            'timestamp': metrics.timestamp.isoformat(),
            'metrics': metrics.to_dict(),
            'alerts': [
                {
                    'level': alert.level.value,
                    'metric': alert.metric,
                    'value': alert.value,
                    'threshold': alert.threshold,
                    'message': alert.message,
                    'timestamp': alert.timestamp.isoformat()
                }
                for alert in alerts
            ],
            'recommendations': recommendations,
            'cluster_info': {
                'cluster_id': self.redis_config.aws_elasticache_cluster_id,
                'enabled': self.redis_config.aws_elasticache_enabled,
                'endpoint': self.redis_config.aws_elasticache_primary_endpoint
            }
        }
    
    def get_performance_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance trends over specified time period."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Filter metrics within time range
        recent_metrics = [
            m for m in self.metric_history 
            if m.timestamp >= cutoff_time
        ]
        
        if not recent_metrics:
            return {'error': 'No metrics available for trend analysis'}
        
        # Calculate trends
        trends = {
            'hit_rate': {
                'current': recent_metrics[-1].hit_rate if recent_metrics else 0,
                'average': sum(m.hit_rate for m in recent_metrics) / len(recent_metrics),
                'min': min(m.hit_rate for m in recent_metrics),
                'max': max(m.hit_rate for m in recent_metrics)
            },
            'connected_clients': {
                'current': recent_metrics[-1].connected_clients if recent_metrics else 0,
                'average': sum(m.connected_clients for m in recent_metrics) / len(recent_metrics),
                'min': min(m.connected_clients for m in recent_metrics),
                'max': max(m.connected_clients for m in recent_metrics)
            },
            'memory_usage': {
                'current': recent_metrics[-1].used_memory if recent_metrics else 0,
                'average': sum(m.used_memory for m in recent_metrics) / len(recent_metrics),
                'min': min(m.used_memory for m in recent_metrics),
                'max': max(m.used_memory for m in recent_metrics)
            }
        }
        
        return {
            'time_range_hours': hours,
            'data_points': len(recent_metrics),
            'trends': trends,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def start_monitoring(self, interval_seconds: int = 60) -> None:
        """Start continuous monitoring (for background tasks)."""
        logger.info(f"Starting Redis monitoring with {interval_seconds}s interval")
        
        while True:
            try:
                # Collect metrics
                metrics = self.collect_redis_metrics()
                
                if metrics:
                    # Publish to CloudWatch
                    if self.cloudwatch_enabled:
                        self.publish_cloudwatch_metrics(metrics)
                    
                    # Analyze performance
                    alerts = self.analyze_performance(metrics)
                    
                    # Log critical alerts
                    for alert in alerts:
                        if alert.level == HealthStatus.CRITICAL:
                            logger.error(f"CRITICAL Redis Alert: {alert.message}")
                        elif alert.level == HealthStatus.WARNING:
                            logger.warning(f"Redis Warning: {alert.message}")
                
                # Wait for next iteration
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                logger.info("Monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(interval_seconds)


# Global monitoring service instance
redis_monitor = AWSMonitoringService()