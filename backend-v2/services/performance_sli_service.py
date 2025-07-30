"""
Performance SLI (Service Level Indicator) Service
Comprehensive performance tracking with business context for 6FB Booking Platform

This service implements advanced performance monitoring with:
- Response time percentile tracking (P50, P90, P95, P99)
- Throughput and error rate measurement
- Business metric correlation
- Resource utilization monitoring
- Performance trend analysis
- Six Figure Barber methodology compliance
"""

import asyncio
import logging
import statistics
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any
import json
import redis
import aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SLIType(Enum):
    """Types of Service Level Indicators"""
    LATENCY = "latency"
    AVAILABILITY = "availability"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    BUSINESS_METRIC = "business_metric"
    RESOURCE_UTILIZATION = "resource_utilization"

class PerformanceContext(Enum):
    """Business contexts for performance measurement"""
    BOOKING_FLOW = "booking_flow"
    PAYMENT_PROCESSING = "payment_processing"
    AI_DASHBOARD = "ai_dashboard"
    AUTHENTICATION = "authentication"
    SIX_FIGURE_METHODOLOGY = "six_figure_methodology"
    MOBILE_APP = "mobile_app"
    CUSTOMER_EXPERIENCE = "customer_experience"

@dataclass
class PerformanceMetric:
    """Individual performance measurement"""
    timestamp: datetime
    value: float
    context: PerformanceContext
    endpoint: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    business_impact: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class SLIDefinition:
    """Service Level Indicator definition"""
    name: str
    sli_type: SLIType
    context: PerformanceContext
    target_value: float
    measurement_window: timedelta
    calculation_method: str  # "percentile", "average", "rate", "sum"
    percentile: Optional[float] = None  # For percentile calculations
    business_weight: float = 1.0  # Impact on business metrics
    alert_threshold: float = 0.1  # Threshold for alerting
    description: str = ""

@dataclass
class PerformanceTrend:
    """Performance trend analysis"""
    metric_name: str
    current_value: float
    previous_value: float
    trend_direction: str  # "improving", "degrading", "stable"
    change_percentage: float
    confidence: float
    analysis_period: timedelta

class PerformanceSLIService:
    """Advanced Performance SLI Service"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.Redis(host='localhost', port=6379, db=0)
        self.metrics_buffer: Dict[str, deque] = defaultdict(lambda: deque(maxlen=10000))
        self.sli_definitions: Dict[str, SLIDefinition] = {}
        self.performance_cache: Dict[str, Any] = {}
        self._initialize_default_slis()
        
    def _initialize_default_slis(self):
        """Initialize default SLI definitions for 6FB platform"""
        default_slis = [
            # API Response Time SLIs
            SLIDefinition(
                name="api_response_time_p50",
                sli_type=SLIType.LATENCY,
                context=PerformanceContext.BOOKING_FLOW,
                target_value=200.0,  # 200ms P50
                measurement_window=timedelta(minutes=5),
                calculation_method="percentile",
                percentile=50.0,
                business_weight=2.0,
                description="API response time 50th percentile"
            ),
            SLIDefinition(
                name="api_response_time_p95",
                sli_type=SLIType.LATENCY,
                context=PerformanceContext.BOOKING_FLOW,
                target_value=800.0,  # 800ms P95
                measurement_window=timedelta(minutes=5),
                calculation_method="percentile",
                percentile=95.0,
                business_weight=3.0,
                description="API response time 95th percentile"
            ),
            SLIDefinition(
                name="api_response_time_p99",
                sli_type=SLIType.LATENCY,
                context=PerformanceContext.BOOKING_FLOW,
                target_value=2000.0,  # 2s P99
                measurement_window=timedelta(minutes=5),
                calculation_method="percentile",
                percentile=99.0,
                business_weight=1.5,
                description="API response time 99th percentile"
            ),
            
            # Payment Processing SLIs
            SLIDefinition(
                name="payment_processing_latency",
                sli_type=SLIType.LATENCY,
                context=PerformanceContext.PAYMENT_PROCESSING,
                target_value=3000.0,  # 3s for payment processing
                measurement_window=timedelta(minutes=10),
                calculation_method="percentile",
                percentile=95.0,
                business_weight=5.0,  # Critical for revenue
                description="Payment processing response time"
            ),
            SLIDefinition(
                name="payment_success_rate",
                sli_type=SLIType.AVAILABILITY,
                context=PerformanceContext.PAYMENT_PROCESSING,
                target_value=99.5,  # 99.5% success rate
                measurement_window=timedelta(hours=1),
                calculation_method="rate",
                business_weight=10.0,  # Extremely critical
                description="Payment transaction success rate"
            ),
            
            # AI Dashboard Performance
            SLIDefinition(
                name="ai_dashboard_load_time",
                sli_type=SLIType.LATENCY,
                context=PerformanceContext.AI_DASHBOARD,
                target_value=1500.0,  # 1.5s dashboard load
                measurement_window=timedelta(minutes=5),
                calculation_method="percentile",
                percentile=90.0,
                business_weight=3.0,
                description="AI Dashboard initial load time"
            ),
            SLIDefinition(
                name="ai_query_response_time",
                sli_type=SLIType.LATENCY,
                context=PerformanceContext.AI_DASHBOARD,
                target_value=5000.0,  # 5s for AI queries
                measurement_window=timedelta(minutes=10),
                calculation_method="percentile",
                percentile=95.0,
                business_weight=2.5,
                description="AI query processing time"
            ),
            
            # Authentication SLIs
            SLIDefinition(
                name="auth_login_latency",
                sli_type=SLIType.LATENCY,
                context=PerformanceContext.AUTHENTICATION,
                target_value=500.0,  # 500ms login
                measurement_window=timedelta(minutes=5),
                calculation_method="percentile",
                percentile=95.0,
                business_weight=2.0,
                description="User authentication response time"
            ),
            SLIDefinition(
                name="auth_success_rate",
                sli_type=SLIType.AVAILABILITY,
                context=PerformanceContext.AUTHENTICATION,
                target_value=99.9,  # 99.9% auth success
                measurement_window=timedelta(hours=1),
                calculation_method="rate",
                business_weight=4.0,
                description="Authentication success rate"
            ),
            
            # Throughput SLIs
            SLIDefinition(
                name="booking_creation_throughput",
                sli_type=SLIType.THROUGHPUT,
                context=PerformanceContext.BOOKING_FLOW,
                target_value=100.0,  # 100 bookings/minute
                measurement_window=timedelta(minutes=5),
                calculation_method="rate",
                business_weight=3.0,
                description="Booking creation throughput"
            ),
            SLIDefinition(
                name="api_request_throughput",
                sli_type=SLIType.THROUGHPUT,
                context=PerformanceContext.CUSTOMER_EXPERIENCE,
                target_value=1000.0,  # 1000 requests/minute
                measurement_window=timedelta(minutes=5),
                calculation_method="rate",
                business_weight=2.0,
                description="Overall API request throughput"
            ),
            
            # Error Rate SLIs
            SLIDefinition(
                name="overall_error_rate",
                sli_type=SLIType.ERROR_RATE,
                context=PerformanceContext.CUSTOMER_EXPERIENCE,
                target_value=0.1,  # 0.1% error rate
                measurement_window=timedelta(minutes=10),
                calculation_method="rate",
                business_weight=4.0,
                description="Overall system error rate"
            ),
            SLIDefinition(
                name="critical_error_rate",
                sli_type=SLIType.ERROR_RATE,
                context=PerformanceContext.SIX_FIGURE_METHODOLOGY,
                target_value=0.01,  # 0.01% critical error rate
                measurement_window=timedelta(hours=1),
                calculation_method="rate",
                business_weight=8.0,
                description="Critical system error rate"
            ),
            
            # Business Metrics
            SLIDefinition(
                name="revenue_per_minute",
                sli_type=SLIType.BUSINESS_METRIC,
                context=PerformanceContext.SIX_FIGURE_METHODOLOGY,
                target_value=50.0,  # $50/minute during business hours
                measurement_window=timedelta(hours=1),
                calculation_method="average",
                business_weight=10.0,
                description="Revenue generation rate"
            ),
            SLIDefinition(
                name="conversion_rate",
                sli_type=SLIType.BUSINESS_METRIC,
                context=PerformanceContext.BOOKING_FLOW,
                target_value=15.0,  # 15% conversion rate
                measurement_window=timedelta(hours=4),
                calculation_method="rate",
                business_weight=6.0,
                description="Visitor to booking conversion rate"
            ),
            
            # Mobile App Performance
            SLIDefinition(
                name="mobile_app_crash_rate",
                sli_type=SLIType.ERROR_RATE,
                context=PerformanceContext.MOBILE_APP,
                target_value=0.05,  # 0.05% crash rate
                measurement_window=timedelta(hours=2),
                calculation_method="rate",
                business_weight=3.0,
                description="Mobile application crash rate"
            ),
            SLIDefinition(
                name="mobile_app_load_time",
                sli_type=SLIType.LATENCY,
                context=PerformanceContext.MOBILE_APP,
                target_value=2000.0,  # 2s app load time
                measurement_window=timedelta(minutes=10),
                calculation_method="percentile",
                percentile=90.0,
                business_weight=2.5,
                description="Mobile app initialization time"
            )
        ]
        
        for sli in default_slis:
            self.sli_definitions[sli.name] = sli
            
    async def record_metric(self, metric: PerformanceMetric) -> bool:
        """Record a performance metric"""
        try:
            # Add to local buffer
            buffer_key = f"{metric.context.value}_{metric.endpoint or 'general'}"
            self.metrics_buffer[buffer_key].append(metric)
            
            # Store in Redis with expiration
            redis_key = f"performance_metric:{metric.context.value}:{int(metric.timestamp.timestamp())}"
            metric_data = {
                'timestamp': metric.timestamp.isoformat(),
                'value': metric.value,
                'context': metric.context.value,
                'endpoint': metric.endpoint,
                'user_id': metric.user_id,
                'session_id': metric.session_id,
                'business_impact': metric.business_impact,
                'metadata': json.dumps(metric.metadata)
            }
            
            await self._redis_setex(redis_key, 86400, json.dumps(metric_data))  # 24h expiry
            
            logger.debug(f"Recorded performance metric: {metric.context.value} = {metric.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to record performance metric: {e}")
            return False
            
    async def calculate_sli_value(self, sli_name: str, end_time: Optional[datetime] = None) -> Optional[float]:
        """Calculate current SLI value"""
        if sli_name not in self.sli_definitions:
            logger.error(f"Unknown SLI: {sli_name}")
            return None
            
        sli_def = self.sli_definitions[sli_name]
        end_time = end_time or datetime.utcnow()
        start_time = end_time - sli_def.measurement_window
        
        try:
            # Get metrics from the measurement window
            metrics = await self._get_metrics_in_window(sli_def.context, start_time, end_time)
            
            if not metrics:
                logger.warning(f"No metrics found for SLI {sli_name}")
                return None
                
            # Calculate based on method
            if sli_def.calculation_method == "percentile" and sli_def.percentile:
                values = [m.value for m in metrics]
                if values:
                    return self._calculate_percentile(values, sli_def.percentile)
                    
            elif sli_def.calculation_method == "average":
                values = [m.value for m in metrics]
                if values:
                    return statistics.mean(values)
                    
            elif sli_def.calculation_method == "rate":
                # For success rates, error rates, etc.
                total_requests = len(metrics)
                if total_requests == 0:
                    return 0.0
                    
                if sli_def.sli_type == SLIType.ERROR_RATE:
                    # Count errors (assume value > 0 indicates error)
                    error_count = sum(1 for m in metrics if m.value > 0)
                    return (error_count / total_requests) * 100
                    
                elif sli_def.sli_type == SLIType.AVAILABILITY:
                    # Count successes (assume value == 1 indicates success)
                    success_count = sum(1 for m in metrics if m.value == 1)
                    return (success_count / total_requests) * 100
                    
                elif sli_def.sli_type == SLIType.THROUGHPUT:
                    # Calculate rate per minute
                    window_minutes = sli_def.measurement_window.total_seconds() / 60
                    return total_requests / window_minutes
                    
            elif sli_def.calculation_method == "sum":
                values = [m.value for m in metrics]
                return sum(values) if values else 0.0
                
            return None
            
        except Exception as e:
            logger.error(f"Failed to calculate SLI {sli_name}: {e}")
            return None
            
    async def get_performance_summary(self, context: Optional[PerformanceContext] = None) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        try:
            summary = {
                'timestamp': datetime.utcnow().isoformat(),
                'sli_values': {},
                'performance_trends': {},
                'business_impact': {},
                'alerts': [],
                'overall_health': 'healthy'
            }
            
            # Calculate all SLI values
            slis_to_check = [name for name, sli in self.sli_definitions.items() 
                           if context is None or sli.context == context]
                           
            for sli_name in slis_to_check:
                current_value = await self.calculate_sli_value(sli_name)
                if current_value is not None:
                    sli_def = self.sli_definitions[sli_name]
                    
                    # Check if SLI meets target
                    meets_target = self._check_sli_target(current_value, sli_def)
                    
                    summary['sli_values'][sli_name] = {
                        'current_value': current_value,
                        'target_value': sli_def.target_value,
                        'meets_target': meets_target,
                        'business_weight': sli_def.business_weight,
                        'context': sli_def.context.value,
                        'type': sli_def.sli_type.value
                    }
                    
                    # Generate alert if target not met
                    if not meets_target:
                        summary['alerts'].append({
                            'sli_name': sli_name,
                            'current_value': current_value,
                            'target_value': sli_def.target_value,
                            'severity': self._calculate_alert_severity(sli_def),
                            'description': f"SLI {sli_name} not meeting target"
                        })
                        
            # Calculate performance trends
            summary['performance_trends'] = await self._calculate_performance_trends(context)
            
            # Calculate business impact
            summary['business_impact'] = await self._calculate_business_impact(summary['sli_values'])
            
            # Determine overall health
            summary['overall_health'] = self._determine_overall_health(summary['sli_values'], summary['alerts'])
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get performance summary: {e}")
            return {'error': str(e)}
            
    async def get_resource_utilization(self) -> Dict[str, Any]:
        """Get current resource utilization metrics"""
        try:
            import psutil
            
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_available = memory.available / (1024**3)  # GB
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            disk_free = disk.free / (1024**3)  # GB
            
            # Network metrics
            network = psutil.net_io_counters()
            
            utilization = {
                'timestamp': datetime.utcnow().isoformat(),
                'cpu': {
                    'percent': cpu_percent,
                    'count': cpu_count,
                    'load_avg': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
                },
                'memory': {
                    'percent': memory_percent,
                    'available_gb': memory_available,
                    'total_gb': memory.total / (1024**3)
                },
                'disk': {
                    'percent': disk_percent,
                    'free_gb': disk_free,
                    'total_gb': disk.total / (1024**3)
                },
                'network': {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv
                },
                'health_status': 'healthy' if all([
                    cpu_percent < 80,
                    memory_percent < 85,
                    disk_percent < 90
                ]) else 'degraded'
            }
            
            return utilization
            
        except Exception as e:
            logger.error(f"Failed to get resource utilization: {e}")
            return {'error': str(e)}
            
    async def analyze_performance_bottlenecks(self, context: Optional[PerformanceContext] = None) -> Dict[str, Any]:
        """Analyze current performance bottlenecks"""
        try:
            analysis = {
                'timestamp': datetime.utcnow().isoformat(),
                'bottlenecks': [],
                'recommendations': [],
                'impact_analysis': {},
                'context': context.value if context else 'all'
            }
            
            # Get current performance summary
            performance_summary = await self.get_performance_summary(context)
            
            # Analyze SLI violations
            for sli_name, sli_data in performance_summary.get('sli_values', {}).items():
                if not sli_data['meets_target']:
                    sli_def = self.sli_definitions[sli_name]
                    
                    bottleneck = {
                        'type': 'sli_violation',
                        'sli_name': sli_name,
                        'current_value': sli_data['current_value'],
                        'target_value': sli_data['target_value'],
                        'deviation': abs(sli_data['current_value'] - sli_data['target_value']),
                        'business_weight': sli_data['business_weight'],
                        'severity': self._calculate_alert_severity(sli_def)
                    }
                    
                    analysis['bottlenecks'].append(bottleneck)
                    
                    # Generate recommendations
                    recommendations = self._generate_performance_recommendations(sli_def, sli_data)
                    analysis['recommendations'].extend(recommendations)
                    
            # Analyze resource utilization
            resource_util = await self.get_resource_utilization()
            if resource_util.get('health_status') == 'degraded':
                resource_bottlenecks = self._analyze_resource_bottlenecks(resource_util)
                analysis['bottlenecks'].extend(resource_bottlenecks)
                
            # Calculate business impact
            analysis['impact_analysis'] = await self._calculate_bottleneck_business_impact(analysis['bottlenecks'])
            
            # Sort bottlenecks by business impact
            analysis['bottlenecks'].sort(key=lambda x: x.get('business_weight', 0), reverse=True)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze performance bottlenecks: {e}")
            return {'error': str(e)}
            
    def _calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile value"""
        if not values:
            return 0.0
        sorted_values = sorted(values)
        k = (len(sorted_values) - 1) * (percentile / 100)
        f = int(k)
        c = k - f
        if f == len(sorted_values) - 1:
            return sorted_values[f]
        return sorted_values[f] * (1 - c) + sorted_values[f + 1] * c
        
    def _check_sli_target(self, current_value: float, sli_def: SLIDefinition) -> bool:
        """Check if SLI meets its target"""
        if sli_def.sli_type in [SLIType.LATENCY]:
            # For latency, lower is better
            return current_value <= sli_def.target_value
        elif sli_def.sli_type in [SLIType.AVAILABILITY, SLIType.THROUGHPUT, SLIType.BUSINESS_METRIC]:
            # For availability, throughput, business metrics, higher is better
            return current_value >= sli_def.target_value
        elif sli_def.sli_type in [SLIType.ERROR_RATE]:
            # For error rates, lower is better
            return current_value <= sli_def.target_value
        else:
            # Default: check if within threshold
            deviation = abs(current_value - sli_def.target_value) / sli_def.target_value
            return deviation <= sli_def.alert_threshold
            
    def _calculate_alert_severity(self, sli_def: SLIDefinition) -> str:
        """Calculate alert severity based on business weight and SLI type"""
        if sli_def.business_weight >= 8.0:
            return "critical"
        elif sli_def.business_weight >= 5.0:
            return "high"
        elif sli_def.business_weight >= 3.0:
            return "medium"
        else:
            return "low"
            
    async def _get_metrics_in_window(self, context: PerformanceContext, start_time: datetime, end_time: datetime) -> List[PerformanceMetric]:
        """Get metrics within time window"""
        metrics = []
        
        # Check local buffer first
        for buffer_key, buffer in self.metrics_buffer.items():
            if context.value in buffer_key:
                for metric in buffer:
                    if start_time <= metric.timestamp <= end_time:
                        metrics.append(metric)
                        
        # If not enough metrics in buffer, check Redis
        if len(metrics) < 10:
            try:
                # Get from Redis
                start_ts = int(start_time.timestamp())
                end_ts = int(end_time.timestamp())
                
                for ts in range(start_ts, end_ts + 1):
                    redis_key = f"performance_metric:{context.value}:{ts}"
                    data = await self._redis_get(redis_key)
                    if data:
                        metric_data = json.loads(data)
                        metric = PerformanceMetric(
                            timestamp=datetime.fromisoformat(metric_data['timestamp']),
                            value=float(metric_data['value']),
                            context=PerformanceContext(metric_data['context']),
                            endpoint=metric_data.get('endpoint'),
                            user_id=metric_data.get('user_id'),
                            session_id=metric_data.get('session_id'),
                            business_impact=metric_data.get('business_impact'),
                            metadata=json.loads(metric_data.get('metadata', '{}'))
                        )
                        metrics.append(metric)
                        
            except Exception as e:
                logger.warning(f"Failed to get metrics from Redis: {e}")
                
        return metrics
        
    async def _calculate_performance_trends(self, context: Optional[PerformanceContext] = None) -> Dict[str, PerformanceTrend]:
        """Calculate performance trends"""
        trends = {}
        
        try:
            current_time = datetime.utcnow()
            
            slis_to_analyze = [name for name, sli in self.sli_definitions.items() 
                             if context is None or sli.context == context]
                             
            for sli_name in slis_to_analyze:
                # Get current value
                current_value = await self.calculate_sli_value(sli_name, current_time)
                
                # Get previous value (1 hour ago)
                previous_time = current_time - timedelta(hours=1)
                previous_value = await self.calculate_sli_value(sli_name, previous_time)
                
                if current_value is not None and previous_value is not None:
                    # Calculate trend
                    change_percentage = ((current_value - previous_value) / previous_value) * 100 if previous_value != 0 else 0
                    
                    # Determine trend direction
                    sli_def = self.sli_definitions[sli_name]
                    if sli_def.sli_type in [SLIType.LATENCY, SLIType.ERROR_RATE]:
                        # For latency and error rates, lower is better
                        if change_percentage < -5:
                            trend_direction = "improving"
                        elif change_percentage > 5:
                            trend_direction = "degrading"
                        else:
                            trend_direction = "stable"
                    else:
                        # For other metrics, higher is generally better
                        if change_percentage > 5:
                            trend_direction = "improving"
                        elif change_percentage < -5:
                            trend_direction = "degrading"
                        else:
                            trend_direction = "stable"
                            
                    trends[sli_name] = PerformanceTrend(
                        metric_name=sli_name,
                        current_value=current_value,
                        previous_value=previous_value,
                        trend_direction=trend_direction,
                        change_percentage=change_percentage,
                        confidence=0.8,  # Default confidence
                        analysis_period=timedelta(hours=1)
                    )
                    
        except Exception as e:
            logger.error(f"Failed to calculate performance trends: {e}")
            
        return trends
        
    async def _calculate_business_impact(self, sli_values: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate business impact of current performance"""
        try:
            impact = {
                'revenue_impact_score': 0.0,
                'customer_experience_score': 0.0,
                'six_figure_methodology_compliance': 0.0,
                'overall_business_health': 'healthy'
            }
            
            total_revenue_weight = 0.0
            total_cx_weight = 0.0
            total_sfb_weight = 0.0
            
            for sli_name, sli_data in sli_values.items():
                sli_def = self.sli_definitions[sli_name]
                weight = sli_data['business_weight']
                meets_target = sli_data['meets_target']
                
                # Calculate impact based on context
                if sli_def.context in [PerformanceContext.PAYMENT_PROCESSING, PerformanceContext.SIX_FIGURE_METHODOLOGY]:
                    total_revenue_weight += weight
                    if meets_target:
                        impact['revenue_impact_score'] += weight
                        
                if sli_def.context in [PerformanceContext.CUSTOMER_EXPERIENCE, PerformanceContext.BOOKING_FLOW]:
                    total_cx_weight += weight
                    if meets_target:
                        impact['customer_experience_score'] += weight
                        
                if sli_def.context == PerformanceContext.SIX_FIGURE_METHODOLOGY:
                    total_sfb_weight += weight
                    if meets_target:
                        impact['six_figure_methodology_compliance'] += weight
                        
            # Normalize scores
            if total_revenue_weight > 0:
                impact['revenue_impact_score'] = (impact['revenue_impact_score'] / total_revenue_weight) * 100
                
            if total_cx_weight > 0:
                impact['customer_experience_score'] = (impact['customer_experience_score'] / total_cx_weight) * 100
                
            if total_sfb_weight > 0:
                impact['six_figure_methodology_compliance'] = (impact['six_figure_methodology_compliance'] / total_sfb_weight) * 100
                
            # Determine overall business health
            avg_score = (impact['revenue_impact_score'] + impact['customer_experience_score'] + impact['six_figure_methodology_compliance']) / 3
            
            if avg_score >= 95:
                impact['overall_business_health'] = 'excellent'
            elif avg_score >= 85:
                impact['overall_business_health'] = 'healthy'
            elif avg_score >= 70:
                impact['overall_business_health'] = 'concerning'
            else:
                impact['overall_business_health'] = 'critical'
                
            return impact
            
        except Exception as e:
            logger.error(f"Failed to calculate business impact: {e}")
            return {'error': str(e)}
            
    def _determine_overall_health(self, sli_values: Dict[str, Any], alerts: List[Dict[str, Any]]) -> str:
        """Determine overall system health"""
        if not sli_values:
            return 'unknown'
            
        # Count SLIs meeting targets
        total_slis = len(sli_values)
        meeting_targets = sum(1 for sli in sli_values.values() if sli['meets_target'])
        
        target_percentage = (meeting_targets / total_slis) * 100
        
        # Check for critical alerts
        critical_alerts = [alert for alert in alerts if alert.get('severity') == 'critical']
        
        if critical_alerts:
            return 'critical'
        elif target_percentage >= 95:
            return 'healthy'
        elif target_percentage >= 85:
            return 'degraded'
        else:
            return 'unhealthy'
            
    def _generate_performance_recommendations(self, sli_def: SLIDefinition, sli_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate performance improvement recommendations"""
        recommendations = []
        
        current_value = sli_data['current_value']
        target_value = sli_data['target_value']
        
        if sli_def.sli_type == SLIType.LATENCY:
            if current_value > target_value:
                recommendations.append({
                    'type': 'latency_optimization',
                    'priority': 'high' if sli_def.business_weight >= 5.0 else 'medium',
                    'description': f"Optimize {sli_def.context.value} latency",
                    'suggestions': [
                        'Implement caching for frequently accessed data',
                        'Optimize database queries and add indexes',
                        'Consider CDN for static assets',
                        'Implement connection pooling',
                        'Review and optimize code execution paths'
                    ]
                })
                
        elif sli_def.sli_type == SLIType.ERROR_RATE:
            if current_value > target_value:
                recommendations.append({
                    'type': 'error_reduction',
                    'priority': 'critical' if sli_def.business_weight >= 8.0 else 'high',
                    'description': f"Reduce {sli_def.context.value} error rate",
                    'suggestions': [
                        'Implement comprehensive error handling',
                        'Add input validation and sanitization',
                        'Improve monitoring and alerting',
                        'Implement circuit breakers for external services',
                        'Review and fix known bug reports'
                    ]
                })
                
        elif sli_def.sli_type == SLIType.THROUGHPUT:
            if current_value < target_value:
                recommendations.append({
                    'type': 'throughput_improvement',
                    'priority': 'medium',
                    'description': f"Increase {sli_def.context.value} throughput",
                    'suggestions': [
                        'Scale horizontally by adding more instances',
                        'Optimize resource utilization',
                        'Implement asynchronous processing',
                        'Review and optimize bottleneck operations',
                        'Consider load balancing improvements'
                    ]
                })
                
        return recommendations
        
    def _analyze_resource_bottlenecks(self, resource_util: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze resource utilization for bottlenecks"""
        bottlenecks = []
        
        cpu_data = resource_util.get('cpu', {})
        memory_data = resource_util.get('memory', {})
        disk_data = resource_util.get('disk', {})
        
        if cpu_data.get('percent', 0) > 80:
            bottlenecks.append({
                'type': 'cpu_bottleneck',
                'severity': 'high',
                'current_value': cpu_data['percent'],
                'threshold': 80,
                'business_weight': 6.0,
                'description': 'High CPU utilization detected'
            })
            
        if memory_data.get('percent', 0) > 85:
            bottlenecks.append({
                'type': 'memory_bottleneck',
                'severity': 'high',
                'current_value': memory_data['percent'],
                'threshold': 85,
                'business_weight': 7.0,
                'description': 'High memory utilization detected'
            })
            
        if disk_data.get('percent', 0) > 90:
            bottlenecks.append({
                'type': 'disk_bottleneck',
                'severity': 'critical',
                'current_value': disk_data['percent'],
                'threshold': 90,
                'business_weight': 5.0,
                'description': 'High disk utilization detected'
            })
            
        return bottlenecks
        
    async def _calculate_bottleneck_business_impact(self, bottlenecks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate business impact of performance bottlenecks"""
        try:
            total_impact_score = 0.0
            critical_count = 0
            high_count = 0
            
            for bottleneck in bottlenecks:
                weight = bottleneck.get('business_weight', 1.0)
                severity = bottleneck.get('severity', 'low')
                
                if severity == 'critical':
                    total_impact_score += weight * 3
                    critical_count += 1
                elif severity == 'high':
                    total_impact_score += weight * 2
                    high_count += 1
                else:
                    total_impact_score += weight
                    
            impact_analysis = {
                'total_impact_score': total_impact_score,
                'critical_bottlenecks': critical_count,
                'high_impact_bottlenecks': high_count,
                'estimated_revenue_impact': self._estimate_revenue_impact(total_impact_score),
                'estimated_customer_impact': self._estimate_customer_impact(bottlenecks),
                'priority_order': sorted(bottlenecks, key=lambda x: x.get('business_weight', 0), reverse=True)
            }
            
            return impact_analysis
            
        except Exception as e:
            logger.error(f"Failed to calculate bottleneck business impact: {e}")
            return {'error': str(e)}
            
    def _estimate_revenue_impact(self, impact_score: float) -> Dict[str, Any]:
        """Estimate revenue impact based on performance issues"""
        # Basic revenue impact estimation
        # In a real implementation, this would use historical data and ML models
        
        base_revenue_per_hour = 500.0  # $500/hour baseline
        impact_percentage = min(impact_score / 100.0, 0.5)  # Cap at 50% impact
        
        estimated_hourly_loss = base_revenue_per_hour * impact_percentage
        estimated_daily_loss = estimated_hourly_loss * 24
        
        return {
            'estimated_hourly_loss': estimated_hourly_loss,
            'estimated_daily_loss': estimated_daily_loss,
            'impact_percentage': impact_percentage * 100,
            'confidence': 0.7
        }
        
    def _estimate_customer_impact(self, bottlenecks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Estimate customer experience impact"""
        total_customers_affected = 0
        severity_weights = {'critical': 0.8, 'high': 0.5, 'medium': 0.3, 'low': 0.1}
        
        avg_users_per_hour = 100  # Baseline users per hour
        
        for bottleneck in bottlenecks:
            severity = bottleneck.get('severity', 'low')
            weight = severity_weights.get(severity, 0.1)
            total_customers_affected += avg_users_per_hour * weight
            
        return {
            'estimated_customers_affected_per_hour': int(total_customers_affected),
            'estimated_satisfaction_impact': min(total_customers_affected / avg_users_per_hour, 1.0),
            'potential_churn_risk': 'high' if total_customers_affected > 50 else 'medium' if total_customers_affected > 20 else 'low'
        }
        
    async def _redis_get(self, key: str) -> Optional[str]:
        """Redis get with error handling"""
        try:
            return self.redis_client.get(key)
        except Exception as e:
            logger.warning(f"Redis get failed for key {key}: {e}")
            return None
            
    async def _redis_setex(self, key: str, timeout: int, value: str) -> bool:
        """Redis setex with error handling"""
        try:
            return self.redis_client.setex(key, timeout, value)
        except Exception as e:
            logger.warning(f"Redis setex failed for key {key}: {e}")
            return False

# Global service instance
performance_sli_service = PerformanceSLIService()