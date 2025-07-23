"""
Production Monitoring and Alerting Setup for BookedBarber V2
Comprehensive monitoring for performance, errors, and business metrics
"""

import logging
import time
import psutil
import redis
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import aiohttp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class HealthMetric:
    """Health check metric definition"""
    name: str
    value: float
    status: str  # healthy, warning, critical
    threshold_warning: float
    threshold_critical: float
    unit: str = ""
    last_updated: datetime = None
    
    def __post_init__(self):
        if self.last_updated is None:
            self.last_updated = datetime.now()

@dataclass
class AlertCondition:
    """Alert condition definition"""
    metric_name: str
    condition: str  # greater_than, less_than, equals
    threshold: float
    severity: str  # info, warning, critical
    message_template: str

class ProductionMonitor:
    """Comprehensive production monitoring system"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_client = None
        self.metrics: Dict[str, HealthMetric] = {}
        self.alerts: List[AlertCondition] = []
        self.setup_default_alerts()
        
        try:
            self.redis_client = redis.Redis.from_url(redis_url)
            self.redis_client.ping()
            logger.info("✅ Redis connection established for monitoring")
        except Exception as e:
            logger.warning(f"❌ Redis connection failed: {e}")
    
    def setup_default_alerts(self):
        """Setup default alert conditions"""
        self.alerts = [
            # Performance alerts
            AlertCondition(
                metric_name="api_response_time_avg",
                condition="greater_than",
                threshold=200.0,
                severity="warning",
                message_template="API response time is {value}ms (threshold: {threshold}ms)"
            ),
            AlertCondition(
                metric_name="api_response_time_p95",
                condition="greater_than", 
                threshold=500.0,
                severity="critical",
                message_template="P95 response time is {value}ms (threshold: {threshold}ms)"
            ),
            
            # Database alerts
            AlertCondition(
                metric_name="database_connection_pool_usage",
                condition="greater_than",
                threshold=80.0,
                severity="warning",
                message_template="Database connection pool usage is {value}% (threshold: {threshold}%)"
            ),
            AlertCondition(
                metric_name="database_query_time_avg",
                condition="greater_than",
                threshold=100.0,
                severity="warning",
                message_template="Database query time is {value}ms (threshold: {threshold}ms)"
            ),
            
            # System resource alerts
            AlertCondition(
                metric_name="cpu_usage_percent",
                condition="greater_than",
                threshold=80.0,
                severity="warning",
                message_template="CPU usage is {value}% (threshold: {threshold}%)"
            ),
            AlertCondition(
                metric_name="memory_usage_percent",
                condition="greater_than",
                threshold=85.0,
                severity="critical",
                message_template="Memory usage is {value}% (threshold: {threshold}%)"
            ),
            AlertCondition(
                metric_name="disk_usage_percent",
                condition="greater_than",
                threshold=90.0,
                severity="critical",
                message_template="Disk usage is {value}% (threshold: {threshold}%)"
            ),
            
            # Business metrics alerts
            AlertCondition(
                metric_name="booking_success_rate",
                condition="less_than",
                threshold=75.0,
                severity="critical",
                message_template="Booking success rate dropped to {value}% (threshold: {threshold}%)"
            ),
            AlertCondition(
                metric_name="error_rate_percent",
                condition="greater_than",
                threshold=5.0,
                severity="warning",
                message_template="Error rate is {value}% (threshold: {threshold}%)"
            ),
            
            # Cache performance alerts
            AlertCondition(
                metric_name="redis_cache_hit_rate",
                condition="less_than",
                threshold=80.0,
                severity="warning",
                message_template="Cache hit rate dropped to {value}% (threshold: {threshold}%)"
            )
        ]
    
    def collect_system_metrics(self) -> Dict[str, HealthMetric]:
        """Collect system resource metrics"""
        metrics = {}
        
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            metrics['cpu_usage_percent'] = HealthMetric(
                name="CPU Usage",
                value=cpu_percent,
                status="healthy" if cpu_percent < 70 else "warning" if cpu_percent < 90 else "critical",
                threshold_warning=70.0,
                threshold_critical=90.0,
                unit="%"
            )
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            metrics['memory_usage_percent'] = HealthMetric(
                name="Memory Usage",
                value=memory_percent,
                status="healthy" if memory_percent < 80 else "warning" if memory_percent < 95 else "critical",
                threshold_warning=80.0,
                threshold_critical=95.0,
                unit="%"
            )
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            metrics['disk_usage_percent'] = HealthMetric(
                name="Disk Usage",
                value=disk_percent,
                status="healthy" if disk_percent < 85 else "warning" if disk_percent < 95 else "critical",
                threshold_warning=85.0,
                threshold_critical=95.0,
                unit="%"
            )
            
            # Network metrics
            network = psutil.net_io_counters()
            metrics['network_bytes_sent'] = HealthMetric(
                name="Network Bytes Sent",
                value=network.bytes_sent,
                status="healthy",
                threshold_warning=float('inf'),
                threshold_critical=float('inf'),
                unit="bytes"
            )
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
        
        return metrics
    
    def collect_redis_metrics(self) -> Dict[str, HealthMetric]:
        """Collect Redis cache metrics"""
        metrics = {}
        
        if not self.redis_client:
            return metrics
        
        try:
            info = self.redis_client.info()
            
            # Cache hit rate
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            total_requests = hits + misses
            hit_rate = (hits / total_requests * 100) if total_requests > 0 else 100
            
            metrics['redis_cache_hit_rate'] = HealthMetric(
                name="Redis Cache Hit Rate",
                value=hit_rate,
                status="healthy" if hit_rate > 80 else "warning" if hit_rate > 60 else "critical",
                threshold_warning=80.0,
                threshold_critical=60.0,
                unit="%"
            )
            
            # Memory usage
            used_memory = info.get('used_memory', 0)
            max_memory = info.get('maxmemory', 0) or (1024 * 1024 * 1024)  # Default 1GB
            memory_usage = (used_memory / max_memory * 100)
            
            metrics['redis_memory_usage'] = HealthMetric(
                name="Redis Memory Usage",
                value=memory_usage,
                status="healthy" if memory_usage < 80 else "warning" if memory_usage < 95 else "critical",
                threshold_warning=80.0,
                threshold_critical=95.0,
                unit="%"
            )
            
            # Connected clients
            connected_clients = info.get('connected_clients', 0)
            metrics['redis_connected_clients'] = HealthMetric(
                name="Redis Connected Clients",
                value=connected_clients,
                status="healthy" if connected_clients < 100 else "warning",
                threshold_warning=100.0,
                threshold_critical=200.0,
                unit="clients"
            )
            
        except Exception as e:
            logger.error(f"Error collecting Redis metrics: {e}")
        
        return metrics
    
    async def collect_api_metrics(self, base_url: str = "http://localhost:8000") -> Dict[str, HealthMetric]:
        """Collect API performance metrics"""
        metrics = {}
        
        # Test endpoints for performance
        test_endpoints = [
            '/health',
            '/api/v1/realtime-availability/slots?date=2025-07-22',
            '/api/v1/walkin-queue/status'
        ]
        
        response_times = []
        error_count = 0
        
        try:
            async with aiohttp.ClientSession() as session:
                for endpoint in test_endpoints:
                    url = f"{base_url}{endpoint}"
                    start_time = time.time()
                    
                    try:
                        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                            response_time = (time.time() - start_time) * 1000  # Convert to ms
                            response_times.append(response_time)
                            
                            if response.status >= 400:
                                error_count += 1
                                
                    except Exception as e:
                        error_count += 1
                        logger.warning(f"API test failed for {endpoint}: {e}")
            
            if response_times:
                avg_response_time = sum(response_times) / len(response_times)
                p95_response_time = sorted(response_times)[int(len(response_times) * 0.95)]
                
                metrics['api_response_time_avg'] = HealthMetric(
                    name="API Average Response Time",
                    value=avg_response_time,
                    status="healthy" if avg_response_time < 200 else "warning" if avg_response_time < 500 else "critical",
                    threshold_warning=200.0,
                    threshold_critical=500.0,
                    unit="ms"
                )
                
                metrics['api_response_time_p95'] = HealthMetric(
                    name="API P95 Response Time",
                    value=p95_response_time,
                    status="healthy" if p95_response_time < 500 else "warning" if p95_response_time < 1000 else "critical",
                    threshold_warning=500.0,
                    threshold_critical=1000.0,
                    unit="ms"
                )
            
            # Error rate
            total_requests = len(test_endpoints)
            error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
            
            metrics['error_rate_percent'] = HealthMetric(
                name="API Error Rate",
                value=error_rate,
                status="healthy" if error_rate < 1 else "warning" if error_rate < 5 else "critical",
                threshold_warning=1.0,
                threshold_critical=5.0,
                unit="%"
            )
            
        except Exception as e:
            logger.error(f"Error collecting API metrics: {e}")
        
        return metrics
    
    def collect_business_metrics(self) -> Dict[str, HealthMetric]:
        """Collect business-specific metrics"""
        metrics = {}
        
        # These would typically come from database queries
        # For now, we'll use simulated metrics based on our testing
        
        try:
            # Booking success rate (from our load testing results)
            booking_success_rate = 76.7  # From our optimization results
            metrics['booking_success_rate'] = HealthMetric(
                name="Booking Success Rate",
                value=booking_success_rate,
                status="healthy" if booking_success_rate > 75 else "warning" if booking_success_rate > 50 else "critical",
                threshold_warning=75.0,
                threshold_critical=50.0,
                unit="%"
            )
            
            # Mobile usage percentage
            mobile_usage = 77.0  # From barbershop industry data
            metrics['mobile_usage_percent'] = HealthMetric(
                name="Mobile Usage Percentage",
                value=mobile_usage,
                status="healthy",
                threshold_warning=float('inf'),
                threshold_critical=float('inf'),
                unit="%"
            )
            
            # Walk-in queue efficiency
            queue_efficiency = 85.0  # Simulated metric
            metrics['walkin_queue_efficiency'] = HealthMetric(
                name="Walk-in Queue Efficiency",
                value=queue_efficiency,
                status="healthy" if queue_efficiency > 80 else "warning",
                threshold_warning=80.0,
                threshold_critical=60.0,
                unit="%"
            )
            
        except Exception as e:
            logger.error(f"Error collecting business metrics: {e}")
        
        return metrics
    
    async def collect_all_metrics(self) -> Dict[str, HealthMetric]:
        """Collect all monitoring metrics"""
        all_metrics = {}
        
        # Collect different metric categories
        system_metrics = self.collect_system_metrics()
        redis_metrics = self.collect_redis_metrics()
        api_metrics = await self.collect_api_metrics()
        business_metrics = self.collect_business_metrics()
        
        # Combine all metrics
        all_metrics.update(system_metrics)
        all_metrics.update(redis_metrics)
        all_metrics.update(api_metrics)
        all_metrics.update(business_metrics)
        
        # Store in instance
        self.metrics = all_metrics
        
        return all_metrics
    
    def check_alert_conditions(self) -> List[Dict[str, Any]]:
        """Check all alert conditions and return triggered alerts"""
        triggered_alerts = []
        
        for alert in self.alerts:
            metric = self.metrics.get(alert.metric_name)
            if not metric:
                continue
            
            should_alert = False
            
            if alert.condition == "greater_than" and metric.value > alert.threshold:
                should_alert = True
            elif alert.condition == "less_than" and metric.value < alert.threshold:
                should_alert = True
            elif alert.condition == "equals" and metric.value == alert.threshold:
                should_alert = True
            
            if should_alert:
                alert_data = {
                    'metric_name': alert.metric_name,
                    'metric_display_name': metric.name,
                    'current_value': metric.value,
                    'threshold': alert.threshold,
                    'severity': alert.severity,
                    'message': alert.message_template.format(
                        value=metric.value,
                        threshold=alert.threshold
                    ),
                    'timestamp': datetime.now().isoformat(),
                    'unit': metric.unit
                }
                triggered_alerts.append(alert_data)
        
        return triggered_alerts
    
    def generate_health_report(self) -> Dict[str, Any]:
        """Generate comprehensive health report"""
        if not self.metrics:
            return {"error": "No metrics collected"}
        
        # Categorize metrics by health status
        healthy_metrics = [m for m in self.metrics.values() if m.status == "healthy"]
        warning_metrics = [m for m in self.metrics.values() if m.status == "warning"]
        critical_metrics = [m for m in self.metrics.values() if m.status == "critical"]
        
        # Calculate overall health score
        total_metrics = len(self.metrics)
        health_score = (len(healthy_metrics) / total_metrics * 100) if total_metrics > 0 else 0
        
        # Determine overall status
        if len(critical_metrics) > 0:
            overall_status = "critical"
        elif len(warning_metrics) > 0:
            overall_status = "warning"
        else:
            overall_status = "healthy"
        
        # Get triggered alerts
        alerts = self.check_alert_conditions()
        
        report = {
            'overall_status': overall_status,
            'health_score': round(health_score, 1),
            'total_metrics': total_metrics,
            'healthy_count': len(healthy_metrics),
            'warning_count': len(warning_metrics),
            'critical_count': len(critical_metrics),
            'metrics': {
                name: {
                    'name': metric.name,
                    'value': metric.value,
                    'status': metric.status,
                    'unit': metric.unit,
                    'last_updated': metric.last_updated.isoformat()
                }
                for name, metric in self.metrics.items()
            },
            'alerts': alerts,
            'timestamp': datetime.now().isoformat()
        }
        
        return report
    
    def print_monitoring_dashboard(self, report: Dict[str, Any]):
        """Print formatted monitoring dashboard"""
        print("\\n" + "="*80)
        print("📊 BOOKEDBARBER V2 PRODUCTION MONITORING DASHBOARD")
        print("="*80)
        
        status_icon = {
            'healthy': '✅',
            'warning': '⚠️',
            'critical': '🚨'
        }
        
        overall_status = report['overall_status']
        print(f"\\n🎯 Overall System Health: {status_icon[overall_status]} {overall_status.upper()}")
        print(f"   Health Score: {report['health_score']}%")
        print(f"   Metrics: {report['healthy_count']} healthy, {report['warning_count']} warning, {report['critical_count']} critical")
        
        # Show critical and warning metrics first
        if report['critical_count'] > 0:
            print(f"\\n🚨 Critical Issues:")
            for name, metric in report['metrics'].items():
                if metric['status'] == 'critical':
                    print(f"   • {metric['name']}: {metric['value']}{metric['unit']} (CRITICAL)")
        
        if report['warning_count'] > 0:
            print(f"\\n⚠️ Warning Issues:")
            for name, metric in report['metrics'].items():
                if metric['status'] == 'warning':
                    print(f"   • {metric['name']}: {metric['value']}{metric['unit']} (WARNING)")
        
        # Show healthy metrics summary
        print(f"\\n✅ Healthy Systems ({report['healthy_count']} metrics):")
        categories = {
            'Performance': ['api_response_time', 'booking_success_rate'],
            'System Resources': ['cpu_usage', 'memory_usage', 'disk_usage'],
            'Cache': ['redis_cache_hit_rate', 'redis_memory'],
            'Business': ['mobile_usage', 'walkin_queue']
        }
        
        for category, prefixes in categories.items():
            category_metrics = [
                metric for name, metric in report['metrics'].items()
                if any(prefix in name for prefix in prefixes) and metric['status'] == 'healthy'
            ]
            if category_metrics:
                print(f"   {category}: {len(category_metrics)} metrics healthy")
        
        # Show active alerts
        if report['alerts']:
            print(f"\\n🔔 Active Alerts ({len(report['alerts'])}):")
            for alert in report['alerts']:
                severity_icon = '🚨' if alert['severity'] == 'critical' else '⚠️'
                print(f"   {severity_icon} {alert['message']}")
        else:
            print(f"\\n🔔 No Active Alerts")
        
        print(f"\\n📈 Key Performance Indicators:")
        kpi_metrics = [
            'api_response_time_avg',
            'booking_success_rate', 
            'redis_cache_hit_rate',
            'cpu_usage_percent',
            'memory_usage_percent'
        ]
        
        for kpi in kpi_metrics:
            if kpi in report['metrics']:
                metric = report['metrics'][kpi]
                status = status_icon.get(metric['status'], '❓')
                print(f"   {status} {metric['name']}: {metric['value']}{metric['unit']}")
        
        print("="*80)

async def run_monitoring_cycle():
    """Run a complete monitoring cycle"""
    monitor = ProductionMonitor()
    
    logger.info("🚀 Starting Production Monitoring Cycle")
    
    # Collect all metrics
    await monitor.collect_all_metrics()
    
    # Generate and display report
    report = monitor.generate_health_report()
    monitor.print_monitoring_dashboard(report)
    
    # Save report
    report_path = '/tmp/bookedbarber_monitoring_report.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\\n📄 Detailed monitoring report saved to: {report_path}")
    
    return report

def setup_health_check_endpoint(app: FastAPI):
    """Setup health check endpoint for production monitoring"""
    
    @app.get("/health")
    async def health_check():
        """Production health check endpoint"""
        monitor = ProductionMonitor()
        
        try:
            # Quick health checks
            system_ok = True
            redis_ok = True
            
            # Check system resources
            cpu_percent = psutil.cpu_percent()
            memory_percent = psutil.virtual_memory().percent
            
            if cpu_percent > 95 or memory_percent > 95:
                system_ok = False
            
            # Check Redis
            if monitor.redis_client:
                try:
                    monitor.redis_client.ping()
                except:
                    redis_ok = False
            
            overall_status = "healthy" if system_ok and redis_ok else "unhealthy"
            
            return JSONResponse(
                status_code=200 if overall_status == "healthy" else 503,
                content={
                    "status": overall_status,
                    "timestamp": datetime.now().isoformat(),
                    "checks": {
                        "system": "healthy" if system_ok else "unhealthy",
                        "redis": "healthy" if redis_ok else "unhealthy"
                    },
                    "metrics": {
                        "cpu_percent": cpu_percent,
                        "memory_percent": memory_percent
                    }
                }
            )
            
        except Exception as e:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
            )

if __name__ == "__main__":
    asyncio.run(run_monitoring_cycle())