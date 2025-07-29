from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import psutil
import time
from datetime import datetime, timedelta
import asyncio
import logging

from database.performance_config import get_db_health
from cache.redis_manager import get_cache_health
from middleware.performance_middleware import get_performance_metrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/monitoring", tags=["Performance Monitoring"])

class HealthCheckResponse(BaseModel):
    status: str
    timestamp: datetime
    database: Dict[str, Any]
    cache: Dict[str, Any]
    system: Dict[str, Any]
    api_performance: Dict[str, Any]

class SystemMetrics(BaseModel):
    cpu_percent: float
    memory_percent: float
    memory_available_gb: float
    disk_usage_percent: float
    disk_free_gb: float
    uptime_hours: float
    load_average: Optional[List[float]] = None

class DatabaseMetrics(BaseModel):
    connection_pool_status: Dict[str, Any]
    query_performance: Dict[str, Any]
    health_status: bool

class PerformanceAlert(BaseModel):
    severity: str  # 'warning', 'critical'
    metric: str
    current_value: float
    threshold: float
    message: str
    timestamp: datetime

class PerformanceMonitor:
    """Comprehensive performance monitoring system"""
    
    def __init__(self):
        self.thresholds = {
            'cpu_percent': {'warning': 70, 'critical': 85},
            'memory_percent': {'warning': 80, 'critical': 90},
            'disk_usage_percent': {'warning': 80, 'critical': 90},
            'avg_response_time': {'warning': 2.0, 'critical': 5.0},
            'error_rate': {'warning': 0.05, 'critical': 0.10},
        }
        self.alerts = []
        self.max_alerts = 100
    
    def get_system_metrics(self) -> SystemMetrics:
        """Get comprehensive system metrics"""
        try:
            # CPU and Memory
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_usage_percent = (disk.used / disk.total) * 100
            disk_free_gb = disk.free / (1024**3)
            
            # System uptime
            boot_time = psutil.boot_time()
            uptime_hours = (time.time() - boot_time) / 3600
            
            # Load average (Unix/Linux only)
            load_avg = None
            try:
                load_avg = list(psutil.getloadavg())
            except AttributeError:
                pass  # Windows doesn't have load average
            
            return SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_available_gb=memory.available / (1024**3),
                disk_usage_percent=disk_usage_percent,
                disk_free_gb=disk_free_gb,
                uptime_hours=uptime_hours,
                load_average=load_avg
            )
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            raise HTTPException(status_code=500, detail="Failed to get system metrics")
    
    def check_thresholds(self, metrics: Dict[str, Any]) -> List[PerformanceAlert]:
        """Check metrics against thresholds and generate alerts"""
        alerts = []
        current_time = datetime.now()
        
        for metric_name, value in metrics.items():
            if metric_name not in self.thresholds:
                continue
            
            thresholds = self.thresholds[metric_name]
            
            if value >= thresholds['critical']:
                alerts.append(PerformanceAlert(
                    severity='critical',
                    metric=metric_name,
                    current_value=value,
                    threshold=thresholds['critical'],
                    message=f"{metric_name} is critically high: {value:.2f}",
                    timestamp=current_time
                ))
            elif value >= thresholds['warning']:
                alerts.append(PerformanceAlert(
                    severity='warning',
                    metric=metric_name,
                    current_value=value,
                    threshold=thresholds['warning'],
                    message=f"{metric_name} is above warning threshold: {value:.2f}",
                    timestamp=current_time
                ))
        
        # Store alerts
        self.alerts.extend(alerts)
        if len(self.alerts) > self.max_alerts:
            self.alerts = self.alerts[-self.max_alerts:]
        
        return alerts
    
    def get_api_performance_summary(self) -> Dict[str, Any]:
        """Get API performance summary"""
        try:
            metrics = get_performance_metrics()
            
            if not metrics:
                return {
                    'total_endpoints': 0,
                    'overall_avg_response_time': 0,
                    'overall_error_rate': 0,
                    'slow_endpoints': []
                }
            
            # Calculate overall metrics
            total_requests = sum(m['total_requests'] for m in metrics.values())
            total_errors = sum(m['total_requests'] * m['error_rate'] for m in metrics.values())
            weighted_avg_response_time = sum(
                m['avg_response_time'] * m['total_requests'] 
                for m in metrics.values()
            ) / total_requests if total_requests > 0 else 0
            
            overall_error_rate = total_errors / total_requests if total_requests > 0 else 0
            
            # Find slow endpoints
            slow_endpoints = [
                {'endpoint': endpoint, 'avg_response_time': data['avg_response_time']}
                for endpoint, data in metrics.items()
                if data['avg_response_time'] > 2.0
            ]
            slow_endpoints.sort(key=lambda x: x['avg_response_time'], reverse=True)
            
            return {
                'total_endpoints': len(metrics),
                'total_requests': total_requests,
                'overall_avg_response_time': weighted_avg_response_time,
                'overall_error_rate': overall_error_rate,
                'slow_endpoints': slow_endpoints[:10]  # Top 10 slowest
            }
        except Exception as e:
            logger.error(f"Error getting API performance summary: {e}")
            return {
                'error': str(e),
                'total_endpoints': 0,
                'overall_avg_response_time': 0,
                'overall_error_rate': 0,
                'slow_endpoints': []
            }

# Global performance monitor instance
perf_monitor = PerformanceMonitor()

@router.get("/health", response_model=HealthCheckResponse)
async def comprehensive_health_check():
    """Comprehensive health check endpoint"""
    try:
        # Get all health metrics
        db_health = get_db_health()
        cache_health = get_cache_health()
        system_metrics = perf_monitor.get_system_metrics()
        api_performance = perf_monitor.get_api_performance_summary()
        
        # Determine overall status
        status = "healthy"
        if not db_health.get('healthy', False):
            status = "degraded"
        if not cache_health.get('connected', False):
            status = "degraded" if status == "healthy" else "unhealthy"
        if system_metrics.cpu_percent > 85 or system_metrics.memory_percent > 90:
            status = "degraded" if status == "healthy" else "unhealthy"
        
        return HealthCheckResponse(
            status=status,
            timestamp=datetime.now(),
            database=db_health,
            cache=cache_health,
            system=system_metrics.dict(),
            api_performance=api_performance
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")

@router.get("/metrics/system")
async def get_system_metrics():
    """Get detailed system metrics"""
    return perf_monitor.get_system_metrics()

@router.get("/metrics/database")
async def get_database_metrics():
    """Get database performance metrics"""
    return get_db_health()

@router.get("/metrics/cache")
async def get_cache_metrics():
    """Get cache performance metrics"""
    return get_cache_health()

@router.get("/metrics/api")
async def get_api_metrics():
    """Get API performance metrics"""
    metrics = get_performance_metrics()
    summary = perf_monitor.get_api_performance_summary()
    
    return {
        'summary': summary,
        'detailed_metrics': metrics
    }

@router.get("/alerts")
async def get_performance_alerts():
    """Get current performance alerts"""
    return {
        'alerts': perf_monitor.alerts[-20:],  # Last 20 alerts
        'alert_count': len(perf_monitor.alerts)
    }

@router.post("/alerts/check")
async def check_performance_thresholds():
    """Manually trigger performance threshold checks"""
    try:
        system_metrics = perf_monitor.get_system_metrics()
        api_summary = perf_monitor.get_api_performance_summary()
        
        # Combine metrics for threshold checking
        combined_metrics = {
            'cpu_percent': system_metrics.cpu_percent,
            'memory_percent': system_metrics.memory_percent,
            'disk_usage_percent': system_metrics.disk_usage_percent,
            'avg_response_time': api_summary.get('overall_avg_response_time', 0),
            'error_rate': api_summary.get('overall_error_rate', 0),
        }
        
        alerts = perf_monitor.check_thresholds(combined_metrics)
        
        return {
            'new_alerts': alerts,
            'metrics_checked': combined_metrics
        }
    except Exception as e:
        logger.error(f"Alert check failed: {e}")
        raise HTTPException(status_code=500, detail="Alert check failed")

@router.get("/performance-report")
async def get_performance_report():
    """Get comprehensive performance report"""
    try:
        system_metrics = perf_monitor.get_system_metrics()
        db_health = get_db_health()
        cache_health = get_cache_health()
        api_metrics = perf_monitor.get_api_performance_summary()
        recent_alerts = perf_monitor.alerts[-10:]  # Last 10 alerts
        
        # Performance recommendations
        recommendations = []
        
        if system_metrics.cpu_percent > 70:
            recommendations.append("High CPU usage detected. Consider scaling or optimizing CPU-intensive operations.")
        
        if system_metrics.memory_percent > 80:
            recommendations.append("High memory usage detected. Review memory usage patterns and consider increasing available memory.")
        
        if api_metrics.get('overall_avg_response_time', 0) > 2.0:
            recommendations.append("High API response times detected. Review slow endpoints and optimize database queries.")
        
        if api_metrics.get('overall_error_rate', 0) > 0.05:
            recommendations.append("High API error rate detected. Review error logs and fix failing endpoints.")
        
        if not cache_health.get('connected', False):
            recommendations.append("Cache system not available. This may impact performance significantly.")
        
        return {
            'timestamp': datetime.now(),
            'system': system_metrics.dict(),
            'database': db_health,
            'cache': cache_health,
            'api': api_metrics,
            'recent_alerts': recent_alerts,
            'recommendations': recommendations,
            'overall_health_score': calculate_health_score(
                system_metrics, db_health, cache_health, api_metrics
            )
        }
    except Exception as e:
        logger.error(f"Performance report generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate performance report")

def calculate_health_score(system_metrics, db_health, cache_health, api_metrics) -> float:
    """Calculate overall health score (0-100)"""
    score = 100.0
    
    # System health impact
    score -= max(0, system_metrics.cpu_percent - 50) * 0.5  # CPU over 50%
    score -= max(0, system_metrics.memory_percent - 60) * 0.4  # Memory over 60%
    score -= max(0, system_metrics.disk_usage_percent - 70) * 0.3  # Disk over 70%
    
    # Database health impact
    if not db_health.get('healthy', False):
        score -= 20
    
    # Cache health impact
    if not cache_health.get('connected', False):
        score -= 10
    
    # API performance impact
    response_time = api_metrics.get('overall_avg_response_time', 0)
    if response_time > 1.0:
        score -= min(20, (response_time - 1.0) * 10)
    
    error_rate = api_metrics.get('overall_error_rate', 0)
    if error_rate > 0.01:
        score -= min(15, error_rate * 100 * 15)
    
    return max(0, score)

@router.get("/live-metrics")
async def get_live_metrics():
    """Get real-time metrics for monitoring dashboards"""
    return {
        'timestamp': datetime.now(),
        'cpu_percent': psutil.cpu_percent(),
        'memory_percent': psutil.virtual_memory().percent,
        'active_connections': get_db_health().get('connections', {}).get('checked_out', 0),
        'cache_connected': get_cache_health().get('connected', False),
        'response_time_avg': perf_monitor.get_api_performance_summary().get('overall_avg_response_time', 0),
    }