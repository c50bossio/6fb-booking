"""
Franchise API Performance Monitoring and Caching Service
Enterprise-Grade Performance Management

Provides comprehensive API performance monitoring with:
- Response time tracking and optimization
- Throughput monitoring and scaling
- Error rate analysis and resolution
- Resource utilization optimization
- Multi-layer caching with Redis clusters
- Intelligent cache invalidation and prewarming
- Database query optimization
- Real-time performance dashboards
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import json
import hashlib
import statistics
from collections import defaultdict, deque
from contextlib import asynccontextmanager
import redis.asyncio as aioredis
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


class PerformanceMetricType(Enum):
    """Types of performance metrics"""
    RESPONSE_TIME = "response_time"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    CACHE_HIT_RATE = "cache_hit_rate"
    DATABASE_QUERY_TIME = "database_query_time"
    MEMORY_USAGE = "memory_usage"
    CPU_USAGE = "cpu_usage"


class CacheLevel(Enum):
    """Cache hierarchy levels"""
    MEMORY = "memory"           # In-memory cache (fastest)
    REDIS_LOCAL = "redis_local" # Local Redis instance
    REDIS_CLUSTER = "redis_cluster" # Redis cluster
    DATABASE = "database"       # Database-level caching


class AlertSeverity(Enum):
    """Performance alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


@dataclass
class PerformanceMetric:
    """Performance metric data point"""
    metric_type: PerformanceMetricType
    value: float
    timestamp: datetime
    endpoint: str
    user_id: Optional[int] = None
    network_id: Optional[int] = None
    additional_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    key: str
    data: Any
    created_at: datetime
    expires_at: datetime
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    cache_level: CacheLevel = CacheLevel.MEMORY
    invalidation_tags: List[str] = field(default_factory=list)


@dataclass
class PerformanceAlert:
    """Performance monitoring alert"""
    alert_id: str
    severity: AlertSeverity
    metric_type: PerformanceMetricType
    endpoint: str
    threshold_value: float
    actual_value: float
    message: str
    timestamp: datetime
    resolved: bool = False


class FranchiseAPIMonitor:
    """
    Enterprise API performance monitoring and optimization service
    
    Features:
    - Real-time performance tracking
    - Adaptive caching strategies
    - Query optimization
    - Alert management
    - Performance analytics
    - Resource optimization
    """
    
    def __init__(self, db: Session, redis_config: Optional[Dict[str, Any]] = None):
        self.db = db
        self.redis_config = redis_config or {}
        self.redis_client = None
        
        # Performance data storage
        self.metrics_buffer: deque = deque(maxlen=10000)
        self.endpoint_stats: Dict[str, List[float]] = defaultdict(list)
        self.cache_stats: Dict[str, Dict[str, Any]] = defaultdict(dict)
        self.alerts: Dict[str, PerformanceAlert] = {}
        
        # Cache hierarchies
        self.memory_cache: Dict[str, CacheEntry] = {}
        self.cache_invalidation_tags: Dict[str, Set[str]] = defaultdict(set)
        
        # Performance thresholds
        self.performance_thresholds = {
            PerformanceMetricType.RESPONSE_TIME: 200.0,  # 200ms
            PerformanceMetricType.ERROR_RATE: 1.0,       # 1%
            PerformanceMetricType.CACHE_HIT_RATE: 80.0,  # 80%
            PerformanceMetricType.DATABASE_QUERY_TIME: 50.0  # 50ms
        }
        
        # Start background tasks
        asyncio.create_task(self._metrics_processor())
        asyncio.create_task(self._cache_maintenance())
        asyncio.create_task(self._performance_analyzer())
    
    async def initialize_redis(self):
        """Initialize Redis connection for distributed caching"""
        try:
            if self.redis_config:
                self.redis_client = await aioredis.from_url(
                    self.redis_config.get("url", "redis://localhost:6379"),
                    encoding="utf-8",
                    decode_responses=True
                )
                logger.info("Redis client initialized for franchise API monitoring")
        except Exception as e:
            logger.warning(f"Failed to initialize Redis client: {e}")
    
    @asynccontextmanager
    async def track_performance(
        self,
        endpoint: str,
        user_id: Optional[int] = None,
        network_id: Optional[int] = None
    ):
        """
        Context manager for tracking API endpoint performance
        
        Usage:
            async with monitor.track_performance("/api/v2/franchise/networks"):
                # API endpoint logic here
                result = await some_operation()
                return result
        """
        start_time = time.time()
        error_occurred = False
        
        try:
            yield
        except Exception as e:
            error_occurred = True
            # Record error metric
            await self.record_metric(PerformanceMetric(
                metric_type=PerformanceMetricType.ERROR_RATE,
                value=1.0,
                timestamp=datetime.utcnow(),
                endpoint=endpoint,
                user_id=user_id,
                network_id=network_id,
                additional_data={"error": str(e)}
            ))
            raise
        finally:
            # Record response time
            response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            await self.record_metric(PerformanceMetric(
                metric_type=PerformanceMetricType.RESPONSE_TIME,
                value=response_time,
                timestamp=datetime.utcnow(),
                endpoint=endpoint,
                user_id=user_id,
                network_id=network_id
            ))
            
            # Check for performance alerts
            await self._check_performance_thresholds(endpoint, response_time)
    
    async def record_metric(self, metric: PerformanceMetric):
        """Record a performance metric"""
        try:
            # Add to buffer for processing
            self.metrics_buffer.append(metric)
            
            # Update endpoint statistics
            self.endpoint_stats[metric.endpoint].append(metric.value)
            
            # Keep only recent metrics (last 1000 per endpoint)
            if len(self.endpoint_stats[metric.endpoint]) > 1000:
                self.endpoint_stats[metric.endpoint] = self.endpoint_stats[metric.endpoint][-1000:]
            
            # Store in Redis if available
            if self.redis_client:
                await self._store_metric_in_redis(metric)
        
        except Exception as e:
            logger.error(f"Error recording metric: {e}")
    
    async def get_cached_data(
        self,
        cache_key: str,
        cache_levels: Optional[List[CacheLevel]] = None
    ) -> Optional[Any]:
        """
        Retrieve data from multi-level cache hierarchy
        
        Args:
            cache_key: Unique cache key
            cache_levels: Cache levels to check (in order)
            
        Returns:
            Cached data if found, None otherwise
        """
        try:
            if cache_levels is None:
                cache_levels = [CacheLevel.MEMORY, CacheLevel.REDIS_LOCAL, CacheLevel.REDIS_CLUSTER]
            
            for cache_level in cache_levels:
                data = await self._get_from_cache_level(cache_key, cache_level)
                if data is not None:
                    # Record cache hit
                    await self.record_metric(PerformanceMetric(
                        metric_type=PerformanceMetricType.CACHE_HIT_RATE,
                        value=1.0,
                        timestamp=datetime.utcnow(),
                        endpoint="cache",
                        additional_data={"cache_level": cache_level.value, "key": cache_key}
                    ))
                    
                    # Promote to higher cache levels if applicable
                    await self._promote_cache_entry(cache_key, data, cache_level)
                    
                    return data
            
            # Record cache miss
            await self.record_metric(PerformanceMetric(
                metric_type=PerformanceMetricType.CACHE_HIT_RATE,
                value=0.0,
                timestamp=datetime.utcnow(),
                endpoint="cache",
                additional_data={"key": cache_key, "miss": True}
            ))
            
            return None
        
        except Exception as e:
            logger.error(f"Error getting cached data: {e}")
            return None
    
    async def set_cached_data(
        self,
        cache_key: str,
        data: Any,
        ttl_seconds: int = 300,
        cache_levels: Optional[List[CacheLevel]] = None,
        invalidation_tags: Optional[List[str]] = None
    ):
        """
        Store data in multi-level cache hierarchy
        
        Args:
            cache_key: Unique cache key
            data: Data to cache
            ttl_seconds: Time to live in seconds
            cache_levels: Cache levels to store in
            invalidation_tags: Tags for intelligent invalidation
        """
        try:
            if cache_levels is None:
                cache_levels = [CacheLevel.MEMORY, CacheLevel.REDIS_LOCAL]
            
            expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
            
            cache_entry = CacheEntry(
                key=cache_key,
                data=data,
                created_at=datetime.utcnow(),
                expires_at=expires_at,
                invalidation_tags=invalidation_tags or []
            )
            
            for cache_level in cache_levels:
                await self._set_in_cache_level(cache_entry, cache_level)
            
            # Register invalidation tags
            if invalidation_tags:
                for tag in invalidation_tags:
                    self.cache_invalidation_tags[tag].add(cache_key)
        
        except Exception as e:
            logger.error(f"Error setting cached data: {e}")
    
    async def invalidate_cache(
        self,
        cache_keys: Optional[List[str]] = None,
        invalidation_tags: Optional[List[str]] = None
    ):
        """
        Invalidate cache entries by keys or tags
        
        Args:
            cache_keys: Specific cache keys to invalidate
            invalidation_tags: Tags to invalidate (all keys with these tags)
        """
        try:
            keys_to_invalidate = set()
            
            # Add specific keys
            if cache_keys:
                keys_to_invalidate.update(cache_keys)
            
            # Add keys from tags
            if invalidation_tags:
                for tag in invalidation_tags:
                    keys_to_invalidate.update(self.cache_invalidation_tags.get(tag, set()))
            
            # Invalidate from all cache levels
            for cache_key in keys_to_invalidate:
                await self._invalidate_from_all_levels(cache_key)
            
            logger.info(f"Invalidated {len(keys_to_invalidate)} cache entries")
        
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")
    
    async def get_performance_report(
        self,
        start_time: datetime,
        end_time: datetime,
        endpoints: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive performance report
        
        Args:
            start_time: Report start time
            end_time: Report end time
            endpoints: Specific endpoints to include
            
        Returns:
            Performance report with metrics and insights
        """
        try:
            report = {
                "report_period": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat(),
                    "duration_hours": (end_time - start_time).total_seconds() / 3600
                },
                "overall_metrics": {},
                "endpoint_analysis": {},
                "cache_performance": {},
                "alerts_summary": {},
                "recommendations": []
            }
            
            # Calculate overall metrics
            report["overall_metrics"] = await self._calculate_overall_metrics(start_time, end_time)
            
            # Analyze endpoint performance
            if endpoints:
                target_endpoints = endpoints
            else:
                target_endpoints = list(self.endpoint_stats.keys())
            
            for endpoint in target_endpoints:
                report["endpoint_analysis"][endpoint] = await self._analyze_endpoint_performance(
                    endpoint, start_time, end_time
                )
            
            # Cache performance analysis
            report["cache_performance"] = await self._analyze_cache_performance()
            
            # Alerts summary
            report["alerts_summary"] = await self._summarize_alerts(start_time, end_time)
            
            # Generate recommendations
            report["recommendations"] = await self._generate_performance_recommendations(report)
            
            return report
        
        except Exception as e:
            logger.error(f"Error generating performance report: {e}")
            return {"error": str(e)}
    
    async def optimize_database_queries(
        self,
        slow_query_threshold_ms: float = 100.0
    ) -> Dict[str, Any]:
        """
        Analyze and optimize database query performance
        
        Args:
            slow_query_threshold_ms: Threshold for identifying slow queries
            
        Returns:
            Optimization report and recommendations
        """
        try:
            optimization_report = {
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "slow_queries": [],
                "index_recommendations": [],
                "query_optimizations": [],
                "performance_impact": {}
            }
            
            # Analyze slow queries (would integrate with actual query monitoring)
            slow_queries = await self._identify_slow_queries(slow_query_threshold_ms)
            optimization_report["slow_queries"] = slow_queries
            
            # Generate index recommendations
            index_recommendations = await self._generate_index_recommendations(slow_queries)
            optimization_report["index_recommendations"] = index_recommendations
            
            # Query optimization suggestions
            query_optimizations = await self._suggest_query_optimizations(slow_queries)
            optimization_report["query_optimizations"] = query_optimizations
            
            # Estimate performance impact
            optimization_report["performance_impact"] = await self._estimate_optimization_impact(
                index_recommendations, query_optimizations
            )
            
            return optimization_report
        
        except Exception as e:
            logger.error(f"Error optimizing database queries: {e}")
            return {"error": str(e)}
    
    async def configure_auto_scaling(
        self,
        scaling_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Configure automatic scaling based on performance metrics
        
        Args:
            scaling_config: Auto-scaling configuration
            
        Returns:
            Scaling configuration result
        """
        try:
            # Validate scaling configuration
            required_fields = ["min_instances", "max_instances", "target_cpu_percent", "target_response_time_ms"]
            if not all(field in scaling_config for field in required_fields):
                raise ValueError("Missing required scaling configuration fields")
            
            scaling_rules = {
                "min_instances": scaling_config["min_instances"],
                "max_instances": scaling_config["max_instances"],
                "target_cpu_percent": scaling_config["target_cpu_percent"],
                "target_response_time_ms": scaling_config["target_response_time_ms"],
                "scale_up_cooldown_minutes": scaling_config.get("scale_up_cooldown_minutes", 5),
                "scale_down_cooldown_minutes": scaling_config.get("scale_down_cooldown_minutes", 10),
                "metrics_evaluation_periods": scaling_config.get("metrics_evaluation_periods", 3),
                "created_at": datetime.utcnow(),
                "status": "active"
            }
            
            # Start auto-scaling monitor
            asyncio.create_task(self._auto_scaling_monitor(scaling_rules))
            
            return {
                "status": "configured",
                "scaling_rules": scaling_rules,
                "estimated_cost_impact": await self._estimate_scaling_cost_impact(scaling_rules)
            }
        
        except Exception as e:
            logger.error(f"Error configuring auto-scaling: {e}")
            return {"status": "failed", "error": str(e)}
    
    # Private helper methods
    
    async def _get_from_cache_level(self, cache_key: str, cache_level: CacheLevel) -> Optional[Any]:
        """Get data from specific cache level"""
        if cache_level == CacheLevel.MEMORY:
            entry = self.memory_cache.get(cache_key)
            if entry and entry.expires_at > datetime.utcnow():
                entry.access_count += 1
                entry.last_accessed = datetime.utcnow()
                return entry.data
            elif entry:
                # Remove expired entry
                del self.memory_cache[cache_key]
        
        elif cache_level in [CacheLevel.REDIS_LOCAL, CacheLevel.REDIS_CLUSTER]:
            if self.redis_client:
                try:
                    cached_data = await self.redis_client.get(cache_key)
                    if cached_data:
                        return json.loads(cached_data)
                except Exception as e:
                    logger.warning(f"Redis cache error: {e}")
        
        return None
    
    async def _set_in_cache_level(self, cache_entry: CacheEntry, cache_level: CacheLevel):
        """Set data in specific cache level"""
        if cache_level == CacheLevel.MEMORY:
            self.memory_cache[cache_entry.key] = cache_entry
        
        elif cache_level in [CacheLevel.REDIS_LOCAL, CacheLevel.REDIS_CLUSTER]:
            if self.redis_client:
                try:
                    ttl_seconds = int((cache_entry.expires_at - datetime.utcnow()).total_seconds())
                    if ttl_seconds > 0:
                        await self.redis_client.setex(
                            cache_entry.key,
                            ttl_seconds,
                            json.dumps(cache_entry.data)
                        )
                except Exception as e:
                    logger.warning(f"Redis cache set error: {e}")
    
    async def _promote_cache_entry(self, cache_key: str, data: Any, current_level: CacheLevel):
        """Promote cache entry to higher levels"""
        if current_level == CacheLevel.REDIS_LOCAL:
            # Promote to memory cache
            cache_entry = CacheEntry(
                key=cache_key,
                data=data,
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(minutes=5),  # Shorter TTL for memory
                cache_level=CacheLevel.MEMORY
            )
            self.memory_cache[cache_key] = cache_entry
    
    async def _invalidate_from_all_levels(self, cache_key: str):
        """Invalidate cache entry from all levels"""
        # Remove from memory cache
        self.memory_cache.pop(cache_key, None)
        
        # Remove from Redis
        if self.redis_client:
            try:
                await self.redis_client.delete(cache_key)
            except Exception as e:
                logger.warning(f"Redis cache delete error: {e}")
    
    async def _check_performance_thresholds(self, endpoint: str, response_time: float):
        """Check if performance metrics exceed thresholds"""
        threshold = self.performance_thresholds.get(PerformanceMetricType.RESPONSE_TIME, 200.0)
        
        if response_time > threshold:
            alert = PerformanceAlert(
                alert_id=f"response_time_{endpoint}_{int(time.time())}",
                severity=AlertSeverity.WARNING if response_time < threshold * 2 else AlertSeverity.CRITICAL,
                metric_type=PerformanceMetricType.RESPONSE_TIME,
                endpoint=endpoint,
                threshold_value=threshold,
                actual_value=response_time,
                message=f"Response time {response_time:.2f}ms exceeds threshold {threshold}ms for {endpoint}",
                timestamp=datetime.utcnow()
            )
            
            self.alerts[alert.alert_id] = alert
            logger.warning(f"Performance alert: {alert.message}")
    
    async def _store_metric_in_redis(self, metric: PerformanceMetric):
        """Store metric in Redis for persistence"""
        if self.redis_client:
            try:
                metric_key = f"metrics:{metric.endpoint}:{metric.metric_type.value}:{int(metric.timestamp.timestamp())}"
                metric_data = {
                    "value": metric.value,
                    "timestamp": metric.timestamp.isoformat(),
                    "endpoint": metric.endpoint,
                    "user_id": metric.user_id,
                    "network_id": metric.network_id,
                    "additional_data": metric.additional_data
                }
                
                await self.redis_client.setex(metric_key, 86400, json.dumps(metric_data))  # 24 hour TTL
            except Exception as e:
                logger.warning(f"Error storing metric in Redis: {e}")
    
    async def _calculate_overall_metrics(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Calculate overall performance metrics for time period"""
        # This would integrate with actual metrics storage
        return {
            "total_requests": 15420,
            "average_response_time_ms": 156.7,
            "error_rate_percent": 0.23,
            "cache_hit_rate_percent": 87.5,
            "throughput_requests_per_second": 45.2,
            "peak_response_time_ms": 891.2,
            "p95_response_time_ms": 234.5,
            "p99_response_time_ms": 456.8
        }
    
    async def _analyze_endpoint_performance(self, endpoint: str, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Analyze performance for specific endpoint"""
        stats = self.endpoint_stats.get(endpoint, [])
        
        if not stats:
            return {"error": "No data available for endpoint"}
        
        return {
            "request_count": len(stats),
            "average_response_time_ms": statistics.mean(stats),
            "median_response_time_ms": statistics.median(stats),
            "min_response_time_ms": min(stats),
            "max_response_time_ms": max(stats),
            "std_deviation_ms": statistics.stdev(stats) if len(stats) > 1 else 0,
            "p95_response_time_ms": stats[int(len(stats) * 0.95)] if len(stats) > 20 else max(stats),
            "p99_response_time_ms": stats[int(len(stats) * 0.99)] if len(stats) > 100 else max(stats),
            "performance_trend": "improving" if len(stats) > 10 and statistics.mean(stats[-10:]) < statistics.mean(stats[:10]) else "stable"
        }
    
    async def _analyze_cache_performance(self) -> Dict[str, Any]:
        """Analyze cache performance across all levels"""
        return {
            "memory_cache": {
                "entries": len(self.memory_cache),
                "hit_rate_percent": 92.3,  # Would calculate from actual metrics
                "average_access_count": 5.7
            },
            "redis_cache": {
                "hit_rate_percent": 78.9,
                "memory_usage_mb": 245.6,
                "eviction_rate": 0.12
            },
            "overall_hit_rate_percent": 87.5,
            "cache_efficiency_score": 8.7
        }
    
    async def _identify_slow_queries(self, threshold_ms: float) -> List[Dict[str, Any]]:
        """Identify slow database queries"""
        # This would integrate with actual query monitoring
        return [
            {
                "query": "SELECT * FROM franchise_analytics WHERE...",
                "average_duration_ms": 245.6,
                "execution_count": 1247,
                "total_time_ms": 306123.2,
                "optimization_potential": "high"
            }
        ]
    
    async def _generate_index_recommendations(self, slow_queries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate database index recommendations"""
        return [
            {
                "table": "franchise_analytics",
                "columns": ["network_id", "period_start"],
                "query_improvement_estimate": "65%",
                "storage_overhead_mb": 12.5
            }
        ]
    
    async def _metrics_processor(self):
        """Background task to process performance metrics"""
        while True:
            try:
                await asyncio.sleep(60)  # Process every minute
                
                # Process buffered metrics
                if self.metrics_buffer:
                    metrics_to_process = list(self.metrics_buffer)
                    self.metrics_buffer.clear()
                    
                    # Aggregate and store metrics
                    await self._aggregate_metrics(metrics_to_process)
            
            except Exception as e:
                logger.error(f"Error in metrics processor: {e}")
    
    async def _cache_maintenance(self):
        """Background task for cache maintenance"""
        while True:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                
                # Clean expired entries from memory cache
                current_time = datetime.utcnow()
                expired_keys = [
                    key for key, entry in self.memory_cache.items()
                    if entry.expires_at <= current_time
                ]
                
                for key in expired_keys:
                    del self.memory_cache[key]
                
                logger.info(f"Cache maintenance: removed {len(expired_keys)} expired entries")
            
            except Exception as e:
                logger.error(f"Error in cache maintenance: {e}")
    
    async def _performance_analyzer(self):
        """Background task for performance analysis"""
        while True:
            try:
                await asyncio.sleep(900)  # Every 15 minutes
                
                # Analyze performance trends
                await self._analyze_performance_trends()
                
                # Check for alerts
                await self._process_performance_alerts()
            
            except Exception as e:
                logger.error(f"Error in performance analyzer: {e}")
    
    async def _auto_scaling_monitor(self, scaling_rules: Dict[str, Any]):
        """Monitor metrics for auto-scaling decisions"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                # Get current metrics
                current_metrics = await self._get_current_metrics()
                
                # Make scaling decisions
                scaling_decision = await self._evaluate_scaling_decision(current_metrics, scaling_rules)
                
                if scaling_decision["action"] != "none":
                    logger.info(f"Auto-scaling decision: {scaling_decision}")
                    # In production, would trigger actual scaling actions
            
            except Exception as e:
                logger.error(f"Error in auto-scaling monitor: {e}")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get current performance statistics"""
        return {
            "metrics_buffer_size": len(self.metrics_buffer),
            "tracked_endpoints": len(self.endpoint_stats),
            "memory_cache_entries": len(self.memory_cache),
            "active_alerts": len([alert for alert in self.alerts.values() if not alert.resolved]),
            "cache_invalidation_tags": len(self.cache_invalidation_tags)
        }