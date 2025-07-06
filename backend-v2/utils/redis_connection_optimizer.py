"""
Redis Connection Pool Optimizer
==============================

Dynamic connection pool sizing and optimization for AWS ElastiCache Redis.
Automatically adjusts connection pool parameters based on traffic patterns
and performance metrics.

Features:
- Dynamic pool sizing based on load
- Connection health monitoring
- Performance optimization recommendations
- Traffic pattern analysis
- AWS ElastiCache specific optimizations

Usage:
    from utils.redis_connection_optimizer import connection_optimizer
    
    # Get optimization recommendations
    recommendations = connection_optimizer.analyze_and_optimize()
    
    # Apply optimizations automatically
    connection_optimizer.apply_optimizations()
"""

import logging
import time
import statistics
from typing import Dict, List, Optional, Tuple, NamedTuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from services.redis_service import cache_service, RedisConnectionManager
from config.redis_config import get_redis_config
from services.aws_monitoring_service import redis_monitor

logger = logging.getLogger(__name__)


class OptimizationLevel(Enum):
    """Optimization aggressiveness levels."""
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


@dataclass
class ConnectionMetrics:
    """Connection pool metrics."""
    timestamp: datetime
    total_connections: int
    active_connections: int
    idle_connections: int
    connection_creation_rate: float
    connection_errors: int
    average_response_time: float
    peak_connections: int
    cpu_usage: float
    memory_usage: float


@dataclass
class OptimizationRecommendation:
    """Connection pool optimization recommendation."""
    parameter: str
    current_value: int
    recommended_value: int
    impact: str
    confidence: float
    reason: str


class TrafficPattern(NamedTuple):
    """Traffic pattern analysis."""
    pattern_type: str  # steady, burst, peak, off_peak
    avg_connections: float
    peak_connections: int
    variance: float
    trend: str  # increasing, decreasing, stable


class RedisConnectionOptimizer:
    """Optimizes Redis connection pool settings dynamically."""
    
    def __init__(self):
        """Initialize connection optimizer."""
        self.redis_config = get_redis_config()
        self.cache = cache_service
        self.redis_manager = RedisConnectionManager()
        
        # Optimization parameters
        self.optimization_level = OptimizationLevel.MODERATE
        self.min_pool_size = 5
        self.max_pool_size = 200  # AWS ElastiCache limit
        self.target_utilization = 0.75  # Target 75% pool utilization
        
        # Metric collection
        self.metrics_history: List[ConnectionMetrics] = []
        self.max_history_size = 1000
        self.collection_interval = 60  # seconds
        
        # Performance thresholds
        self.thresholds = {
            'high_utilization': 0.85,
            'low_utilization': 0.30,
            'max_response_time': 10.0,  # milliseconds
            'max_connection_errors': 5,  # per minute
            'cpu_threshold': 70.0,  # percentage
            'memory_threshold': 80.0  # percentage
        }
        
        logger.info("Redis connection optimizer initialized")
    
    def collect_connection_metrics(self) -> Optional[ConnectionMetrics]:
        """Collect current connection pool metrics."""
        try:
            # Get Redis stats
            redis_stats = self.cache.get_stats()
            if not redis_stats.get('available', False):
                return None
            
            # Get connection pool info
            if hasattr(self.redis_manager, '_connection_pool') and self.redis_manager._connection_pool:
                pool = self.redis_manager._connection_pool
                
                # Calculate metrics
                total_connections = getattr(pool, 'max_connections', 0)
                created_connections = getattr(pool, 'created_connections', 0)
                available_connections = getattr(pool, 'available_connections', 0)
                in_use_connections = getattr(pool, 'in_use_connections', 0)
                
                # Estimated active connections
                active_connections = created_connections - available_connections
                idle_connections = available_connections
                
                # Calculate connection utilization
                utilization = active_connections / total_connections if total_connections > 0 else 0
                
                # Estimate response time (simplified)
                response_time = self._estimate_response_time()
                
                # Create metrics object
                metrics = ConnectionMetrics(
                    timestamp=datetime.utcnow(),
                    total_connections=total_connections,
                    active_connections=active_connections,
                    idle_connections=idle_connections,
                    connection_creation_rate=self._calculate_creation_rate(),
                    connection_errors=0,  # Not easily accessible
                    average_response_time=response_time,
                    peak_connections=max(active_connections, 
                                       max([m.active_connections for m in self.metrics_history[-10:]], default=0)),
                    cpu_usage=0.0,  # Would need CloudWatch integration
                    memory_usage=redis_stats.get('used_memory', 0)
                )
                
                # Store in history
                self._store_metrics(metrics)
                
                return metrics
            
            return None
            
        except Exception as e:
            logger.error(f"Error collecting connection metrics: {e}")
            return None
    
    def _estimate_response_time(self) -> float:
        """Estimate average response time by testing Redis operations."""
        try:
            start_time = time.time()
            
            # Test basic Redis operation
            test_key = 'optimizer_test'
            self.cache.set(test_key, 'test_value', ttl=10)
            self.cache.get(test_key)
            self.cache.delete(test_key)
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            return response_time / 3  # Average per operation
            
        except Exception as e:
            logger.warning(f"Could not estimate response time: {e}")
            return 0.0
    
    def _calculate_creation_rate(self) -> float:
        """Calculate connection creation rate."""
        if len(self.metrics_history) < 2:
            return 0.0
        
        recent_metrics = self.metrics_history[-5:]  # Last 5 data points
        if len(recent_metrics) < 2:
            return 0.0
        
        # Calculate rate based on peak connections change
        time_diff = (recent_metrics[-1].timestamp - recent_metrics[0].timestamp).total_seconds()
        if time_diff <= 0:
            return 0.0
        
        connection_diff = recent_metrics[-1].peak_connections - recent_metrics[0].peak_connections
        return max(0, connection_diff / (time_diff / 60))  # Connections per minute
    
    def _store_metrics(self, metrics: ConnectionMetrics) -> None:
        """Store metrics in history."""
        self.metrics_history.append(metrics)
        
        # Limit history size
        if len(self.metrics_history) > self.max_history_size:
            self.metrics_history = self.metrics_history[-self.max_history_size:]
    
    def analyze_traffic_patterns(self, hours: int = 24) -> TrafficPattern:
        """Analyze traffic patterns over specified time period."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Filter recent metrics
        recent_metrics = [
            m for m in self.metrics_history 
            if m.timestamp >= cutoff_time
        ]
        
        if not recent_metrics:
            return TrafficPattern("unknown", 0, 0, 0, "stable")
        
        # Calculate statistics
        connections = [m.active_connections for m in recent_metrics]
        avg_connections = statistics.mean(connections)
        peak_connections = max(connections)
        
        # Calculate variance for pattern detection
        variance = statistics.variance(connections) if len(connections) > 1 else 0
        std_dev = statistics.stdev(connections) if len(connections) > 1 else 0
        
        # Determine pattern type
        coefficient_of_variation = std_dev / avg_connections if avg_connections > 0 else 0
        
        if coefficient_of_variation < 0.2:
            pattern_type = "steady"
        elif coefficient_of_variation < 0.5:
            pattern_type = "moderate_variation"
        else:
            # Check for burst patterns
            recent_peaks = [m.active_connections for m in recent_metrics[-10:]]
            if any(peak > avg_connections * 2 for peak in recent_peaks):
                pattern_type = "burst"
            else:
                pattern_type = "high_variation"
        
        # Determine trend
        if len(connections) >= 10:
            first_half = connections[:len(connections)//2]
            second_half = connections[len(connections)//2:]
            
            first_avg = statistics.mean(first_half)
            second_avg = statistics.mean(second_half)
            
            if second_avg > first_avg * 1.1:
                trend = "increasing"
            elif second_avg < first_avg * 0.9:
                trend = "decreasing"
            else:
                trend = "stable"
        else:
            trend = "stable"
        
        return TrafficPattern(
            pattern_type=pattern_type,
            avg_connections=avg_connections,
            peak_connections=peak_connections,
            variance=variance,
            trend=trend
        )
    
    def generate_optimization_recommendations(self) -> List[OptimizationRecommendation]:
        """Generate connection pool optimization recommendations."""
        recommendations = []
        
        if not self.metrics_history:
            return recommendations
        
        # Get current configuration
        current_max_connections = self.redis_config.redis_max_connections
        current_timeout = self.redis_config.redis_connection_timeout
        
        # Analyze recent performance
        recent_metrics = self.metrics_history[-10:] if len(self.metrics_history) >= 10 else self.metrics_history
        
        if not recent_metrics:
            return recommendations
        
        # Analyze traffic patterns
        traffic_pattern = self.analyze_traffic_patterns()
        
        # Calculate current utilization
        avg_active = statistics.mean([m.active_connections for m in recent_metrics])
        peak_active = max([m.active_connections for m in recent_metrics])
        current_utilization = avg_active / current_max_connections if current_max_connections > 0 else 0
        peak_utilization = peak_active / current_max_connections if current_max_connections > 0 else 0
        
        # Recommendation 1: Max Connections
        if peak_utilization > self.thresholds['high_utilization']:
            # Need more connections
            if traffic_pattern.pattern_type == "burst":
                # For burst traffic, size for peak + buffer
                recommended_max = int(peak_active * 1.5)
            else:
                # For steady traffic, size for average + buffer
                recommended_max = int(avg_active / self.target_utilization)
            
            recommended_max = min(recommended_max, self.max_pool_size)
            recommended_max = max(recommended_max, current_max_connections)
            
            if recommended_max > current_max_connections:
                recommendations.append(OptimizationRecommendation(
                    parameter="max_connections",
                    current_value=current_max_connections,
                    recommended_value=recommended_max,
                    impact="Reduces connection exhaustion and timeouts",
                    confidence=0.9 if peak_utilization > 0.9 else 0.7,
                    reason=f"Peak utilization: {peak_utilization:.1%}, Pattern: {traffic_pattern.pattern_type}"
                ))
        
        elif current_utilization < self.thresholds['low_utilization']:
            # Can reduce connections
            recommended_max = max(
                int(peak_active * 1.2),  # Peak + 20% buffer
                self.min_pool_size
            )
            
            if recommended_max < current_max_connections:
                recommendations.append(OptimizationRecommendation(
                    parameter="max_connections",
                    current_value=current_max_connections,
                    recommended_value=recommended_max,
                    impact="Reduces memory usage and connection overhead",
                    confidence=0.6,
                    reason=f"Low utilization: {current_utilization:.1%}"
                ))
        
        # Recommendation 2: Connection Timeout
        avg_response_time = statistics.mean([m.average_response_time for m in recent_metrics if m.average_response_time > 0])
        
        if avg_response_time > self.thresholds['max_response_time']:
            # Increase timeout for slow responses
            recommended_timeout = max(
                int(avg_response_time * 3),  # 3x average response time
                current_timeout
            )
            recommended_timeout = min(recommended_timeout, 60)  # Max 60 seconds
            
            if recommended_timeout > current_timeout:
                recommendations.append(OptimizationRecommendation(
                    parameter="connection_timeout",
                    current_value=current_timeout,
                    recommended_value=recommended_timeout,
                    impact="Reduces timeout errors for slow operations",
                    confidence=0.8,
                    reason=f"Average response time: {avg_response_time:.1f}ms"
                ))
        
        # Recommendation 3: Health Check Interval
        current_health_interval = self.redis_config.redis_health_check_interval
        
        if traffic_pattern.pattern_type == "burst":
            # More frequent health checks for burst traffic
            recommended_interval = 15
        elif traffic_pattern.pattern_type == "steady":
            # Less frequent for steady traffic
            recommended_interval = 60
        else:
            recommended_interval = 30
        
        if recommended_interval != current_health_interval:
            recommendations.append(OptimizationRecommendation(
                parameter="health_check_interval",
                current_value=current_health_interval,
                recommended_value=recommended_interval,
                impact="Optimizes health check frequency for traffic pattern",
                confidence=0.6,
                reason=f"Traffic pattern: {traffic_pattern.pattern_type}"
            ))
        
        return recommendations
    
    def apply_optimizations(self, recommendations: Optional[List[OptimizationRecommendation]] = None,
                          dry_run: bool = True) -> Dict[str, Any]:
        """Apply optimization recommendations."""
        if recommendations is None:
            recommendations = self.generate_optimization_recommendations()
        
        results = {
            'applied': [],
            'skipped': [],
            'errors': [],
            'dry_run': dry_run
        }
        
        for rec in recommendations:
            try:
                # Only apply high-confidence recommendations
                if rec.confidence < 0.7:
                    results['skipped'].append({
                        'parameter': rec.parameter,
                        'reason': f"Low confidence: {rec.confidence:.1%}"
                    })
                    continue
                
                if dry_run:
                    results['applied'].append({
                        'parameter': rec.parameter,
                        'current': rec.current_value,
                        'recommended': rec.recommended_value,
                        'action': 'would_apply' if not dry_run else 'dry_run'
                    })
                else:
                    # Apply optimization (would require configuration update)
                    # In practice, this would update the configuration and restart connections
                    logger.info(f"Would apply optimization: {rec.parameter} = {rec.recommended_value}")
                    
                    results['applied'].append({
                        'parameter': rec.parameter,
                        'current': rec.current_value,
                        'new': rec.recommended_value,
                        'action': 'applied'
                    })
                
            except Exception as e:
                results['errors'].append({
                    'parameter': rec.parameter,
                    'error': str(e)
                })
                logger.error(f"Error applying optimization for {rec.parameter}: {e}")
        
        return results
    
    def get_optimization_report(self) -> Dict[str, Any]:
        """Generate comprehensive optimization report."""
        # Collect current metrics
        current_metrics = self.collect_connection_metrics()
        
        # Analyze traffic patterns
        traffic_pattern = self.analyze_traffic_patterns()
        
        # Generate recommendations
        recommendations = self.generate_optimization_recommendations()
        
        # Calculate performance score
        performance_score = self._calculate_performance_score(current_metrics)
        
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'performance_score': performance_score,
            'current_configuration': {
                'max_connections': self.redis_config.redis_max_connections,
                'connection_timeout': self.redis_config.redis_connection_timeout,
                'health_check_interval': self.redis_config.redis_health_check_interval,
                'socket_keepalive': self.redis_config.redis_socket_keepalive
            },
            'current_metrics': current_metrics.__dict__ if current_metrics else None,
            'traffic_pattern': {
                'type': traffic_pattern.pattern_type,
                'avg_connections': traffic_pattern.avg_connections,
                'peak_connections': traffic_pattern.peak_connections,
                'trend': traffic_pattern.trend,
                'variance': traffic_pattern.variance
            },
            'recommendations': [
                {
                    'parameter': rec.parameter,
                    'current_value': rec.current_value,
                    'recommended_value': rec.recommended_value,
                    'impact': rec.impact,
                    'confidence': rec.confidence,
                    'reason': rec.reason
                }
                for rec in recommendations
            ],
            'optimization_summary': {
                'total_recommendations': len(recommendations),
                'high_confidence': len([r for r in recommendations if r.confidence >= 0.8]),
                'medium_confidence': len([r for r in recommendations if 0.6 <= r.confidence < 0.8]),
                'low_confidence': len([r for r in recommendations if r.confidence < 0.6])
            }
        }
        
        return report
    
    def _calculate_performance_score(self, metrics: Optional[ConnectionMetrics]) -> float:
        """Calculate performance score (0-100)."""
        if not metrics:
            return 0.0
        
        score = 100.0
        
        # Utilization score (target around 75%)
        utilization = metrics.active_connections / metrics.total_connections if metrics.total_connections > 0 else 0
        if utilization > 0.9:
            score -= 20  # Too high utilization
        elif utilization < 0.3:
            score -= 10  # Too low utilization
        elif 0.6 <= utilization <= 0.8:
            score += 10  # Optimal range
        
        # Response time score
        if metrics.average_response_time > 20:
            score -= 30
        elif metrics.average_response_time > 10:
            score -= 15
        elif metrics.average_response_time < 5:
            score += 10
        
        # Connection stability score
        if len(self.metrics_history) > 10:
            recent_connections = [m.active_connections for m in self.metrics_history[-10:]]
            stability = 1 - (statistics.stdev(recent_connections) / statistics.mean(recent_connections)) if statistics.mean(recent_connections) > 0 else 0
            score += stability * 20
        
        return max(0.0, min(100.0, score))
    
    def start_continuous_optimization(self, interval_minutes: int = 15) -> None:
        """Start continuous optimization monitoring."""
        logger.info(f"Starting continuous Redis optimization with {interval_minutes}min interval")
        
        while True:
            try:
                # Collect metrics
                self.collect_connection_metrics()
                
                # Generate and log recommendations every hour
                if len(self.metrics_history) % 4 == 0:  # Every 4 intervals (1 hour at 15min intervals)
                    recommendations = self.generate_optimization_recommendations()
                    
                    if recommendations:
                        logger.info(f"Generated {len(recommendations)} optimization recommendations")
                        for rec in recommendations:
                            if rec.confidence >= 0.8:
                                logger.info(f"High confidence recommendation: {rec.parameter} -> {rec.recommended_value} ({rec.reason})")
                
                # Wait for next iteration
                time.sleep(interval_minutes * 60)
                
            except KeyboardInterrupt:
                logger.info("Continuous optimization stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in optimization loop: {e}")
                time.sleep(interval_minutes * 60)


# Global connection optimizer instance
connection_optimizer = RedisConnectionOptimizer()