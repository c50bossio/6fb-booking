"""
API Monitoring Service for BookedBarber V2

Provides comprehensive monitoring and alerting for API integrations:
- Real-time performance tracking
- Health check orchestration
- Alert management
- SLA monitoring
- Performance analytics
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import text

from services.enhanced_webhook_security import EnhancedWebhookSecurity
from services.enterprise_api_reliability import EnterpriseAPIReliability, APIProvider
from services.alert_service import AlertService
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class MetricType(Enum):
    """Types of metrics to track"""
    RESPONSE_TIME = "response_time"
    SUCCESS_RATE = "success_rate"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"
    AVAILABILITY = "availability"
    SECURITY_SCORE = "security_score"


@dataclass
class SLAThreshold:
    """Service Level Agreement thresholds"""
    response_time_ms: float
    success_rate_percent: float
    availability_percent: float
    error_rate_percent: float


@dataclass
class APIHealthStatus:
    """Comprehensive API health status"""
    provider: str
    status: str  # healthy, degraded, unhealthy, unknown
    response_time_ms: float
    success_rate: float
    error_rate: float
    availability: float
    circuit_breaker_state: str
    last_error: Optional[str]
    security_score: float
    last_updated: datetime
    sla_compliance: bool


@dataclass
class PerformanceMetric:
    """Individual performance metric"""
    provider: str
    operation: str
    metric_type: MetricType
    value: float
    timestamp: datetime
    metadata: Dict[str, Any]


class APIMonitoringService:
    """Comprehensive API monitoring and alerting service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.reliability = EnterpriseAPIReliability(db)
        self.webhook_security = EnhancedWebhookSecurity(db)
        self.alert_service = AlertService(db)
        
        # SLA thresholds for each provider
        self.sla_thresholds = {
            APIProvider.STRIPE: SLAThreshold(
                response_time_ms=2000.0,  # 2 seconds
                success_rate_percent=99.5,
                availability_percent=99.9,
                error_rate_percent=0.5
            ),
            APIProvider.TWILIO: SLAThreshold(
                response_time_ms=5000.0,  # 5 seconds
                success_rate_percent=99.0,
                availability_percent=99.5,
                error_rate_percent=1.0
            ),
            APIProvider.SENDGRID: SLAThreshold(
                response_time_ms=10000.0,  # 10 seconds
                success_rate_percent=98.0,
                availability_percent=99.0,
                error_rate_percent=2.0
            ),
            APIProvider.GOOGLE_CALENDAR: SLAThreshold(
                response_time_ms=3000.0,  # 3 seconds
                success_rate_percent=99.0,
                availability_percent=99.5,
                error_rate_percent=1.0
            )
        }
        
        # Alert thresholds
        self.alert_thresholds = {
            "response_time_warning": 1.5,  # 1.5x SLA threshold
            "response_time_critical": 2.0,  # 2x SLA threshold
            "success_rate_warning": 0.95,  # Below 95%
            "success_rate_critical": 0.90,  # Below 90%
            "error_rate_warning": 2.0,     # Above 2%
            "error_rate_critical": 5.0,    # Above 5%
            "security_score_warning": 0.7,  # Below 70%
            "security_score_critical": 0.5  # Below 50%
        }
    
    async def run_comprehensive_health_check(self) -> Dict[str, APIHealthStatus]:
        """Run comprehensive health check for all API providers"""
        
        health_statuses = {}
        providers = [APIProvider.STRIPE, APIProvider.TWILIO, APIProvider.SENDGRID, APIProvider.GOOGLE_CALENDAR]
        
        # Run health checks concurrently
        health_check_tasks = [
            self._check_provider_health(provider)
            for provider in providers
        ]
        
        results = await asyncio.gather(*health_check_tasks, return_exceptions=True)
        
        for provider, result in zip(providers, results):
            if isinstance(result, Exception):
                health_statuses[provider.value] = APIHealthStatus(
                    provider=provider.value,
                    status="error",
                    response_time_ms=0.0,
                    success_rate=0.0,
                    error_rate=100.0,
                    availability=0.0,
                    circuit_breaker_state="unknown",
                    last_error=str(result),
                    security_score=0.0,
                    last_updated=datetime.utcnow(),
                    sla_compliance=False
                )
            else:
                health_statuses[provider.value] = result
        
        # Check for alerts
        await self._check_and_send_alerts(health_statuses)
        
        return health_statuses
    
    async def _check_provider_health(self, provider: APIProvider) -> APIHealthStatus:
        """Check health for a specific provider"""
        
        try:
            # Get basic health check from reliability service
            health_check = await self.reliability.health_check(provider)
            
            # Get performance metrics from last 5 minutes
            performance_metrics = await self._get_recent_performance_metrics(provider, minutes=5)
            
            # Calculate aggregated metrics
            avg_response_time = self._calculate_average_response_time(performance_metrics)
            success_rate = self._calculate_success_rate(performance_metrics)
            error_rate = 1.0 - success_rate
            availability = self._calculate_availability(provider)
            security_score = await self._calculate_security_score(provider)
            
            # Determine overall status
            status = self._determine_health_status(
                provider, avg_response_time, success_rate, error_rate, availability
            )
            
            # Check SLA compliance
            sla_threshold = self.sla_thresholds.get(provider)
            sla_compliance = self._check_sla_compliance(
                avg_response_time, success_rate, availability, error_rate, sla_threshold
            )
            
            return APIHealthStatus(
                provider=provider.value,
                status=status,
                response_time_ms=avg_response_time,
                success_rate=success_rate,
                error_rate=error_rate,
                availability=availability,
                circuit_breaker_state=health_check.get("circuit_breaker_state", "unknown"),
                last_error=health_check.get("details", {}).get("error"),
                security_score=security_score,
                last_updated=datetime.utcnow(),
                sla_compliance=sla_compliance
            )
            
        except Exception as e:
            logger.error(f"Health check failed for {provider.value}: {e}")
            return APIHealthStatus(
                provider=provider.value,
                status="error",
                response_time_ms=0.0,
                success_rate=0.0,
                error_rate=100.0,
                availability=0.0,
                circuit_breaker_state="unknown",
                last_error=str(e),
                security_score=0.0,
                last_updated=datetime.utcnow(),
                sla_compliance=False
            )
    
    async def _get_recent_performance_metrics(self, provider: APIProvider, minutes: int = 5) -> List[PerformanceMetric]:
        """Get recent performance metrics from database"""
        
        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
            
            query = text("""
                SELECT provider, operation, response_time, success, recorded_at
                FROM api_performance_metrics
                WHERE provider = :provider
                AND recorded_at >= :cutoff_time
                ORDER BY recorded_at DESC
                LIMIT 1000
            """)
            
            result = self.db.execute(query, {
                "provider": provider.value,
                "cutoff_time": cutoff_time
            })
            
            metrics = []
            for row in result:
                metrics.append(PerformanceMetric(
                    provider=row.provider,
                    operation=row.operation,
                    metric_type=MetricType.RESPONSE_TIME,
                    value=float(row.response_time),
                    timestamp=row.recorded_at,
                    metadata={"success": row.success}
                ))
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get performance metrics for {provider.value}: {e}")
            return []
    
    def _calculate_average_response_time(self, metrics: List[PerformanceMetric]) -> float:
        """Calculate average response time from metrics"""
        if not metrics:
            return 0.0
        
        response_times = [m.value for m in metrics if m.metric_type == MetricType.RESPONSE_TIME]
        return sum(response_times) / len(response_times) if response_times else 0.0
    
    def _calculate_success_rate(self, metrics: List[PerformanceMetric]) -> float:
        """Calculate success rate from metrics"""
        if not metrics:
            return 0.0
        
        total_requests = len(metrics)
        successful_requests = sum(
            1 for m in metrics 
            if m.metadata.get("success", False)
        )
        
        return successful_requests / total_requests if total_requests > 0 else 0.0
    
    def _calculate_availability(self, provider: APIProvider) -> float:
        """Calculate availability percentage for provider"""
        try:
            # Check circuit breaker state and recent uptime
            performance_report = self.reliability.get_performance_report(provider)
            
            # Simple availability calculation based on recent success rate
            # In production, this would be more sophisticated
            provider_metrics = performance_report.get("providers", {}).get(provider.value, {})
            
            if not provider_metrics:
                return 100.0  # Assume available if no data
            
            # Calculate based on recent operations
            total_ops = sum(op.get("total_requests", 0) for op in provider_metrics.values())
            if total_ops == 0:
                return 100.0
            
            successful_ops = sum(
                op.get("total_requests", 0) * op.get("success_rate", 0.0)
                for op in provider_metrics.values()
            )
            
            return (successful_ops / total_ops) * 100.0 if total_ops > 0 else 100.0
            
        except Exception as e:
            logger.error(f"Failed to calculate availability for {provider.value}: {e}")
            return 0.0
    
    async def _calculate_security_score(self, provider: APIProvider) -> float:
        """Calculate security score for provider"""
        try:
            # Get webhook security metrics
            security_metrics = self.webhook_security.get_security_metrics()
            provider_security = security_metrics.get("by_provider", {}).get(provider.value, {})
            
            if not provider_security:
                return 1.0  # Default to good security score
            
            total_requests = provider_security.get("total_requests", 1)
            failed_signatures = provider_security.get("failed_signatures", 0)
            rate_limited = provider_security.get("rate_limited", 0)
            
            # Calculate security score (1.0 = perfect, 0.0 = terrible)
            security_issues = failed_signatures + rate_limited
            security_score = max(0.0, 1.0 - (security_issues / total_requests))
            
            return security_score
            
        except Exception as e:
            logger.error(f"Failed to calculate security score for {provider.value}: {e}")
            return 0.5  # Conservative default
    
    def _determine_health_status(
        self,
        provider: APIProvider,
        response_time: float,
        success_rate: float,
        error_rate: float,
        availability: float
    ) -> str:
        """Determine overall health status based on metrics"""
        
        sla_threshold = self.sla_thresholds.get(provider)
        if not sla_threshold:
            return "unknown"
        
        # Check for critical issues
        if (
            response_time > sla_threshold.response_time_ms * 2 or
            success_rate < 0.90 or
            error_rate > 10.0 or
            availability < 95.0
        ):
            return "unhealthy"
        
        # Check for degraded performance
        if (
            response_time > sla_threshold.response_time_ms * 1.5 or
            success_rate < 0.95 or
            error_rate > 5.0 or
            availability < 99.0
        ):
            return "degraded"
        
        # Everything looks good
        return "healthy"
    
    def _check_sla_compliance(
        self,
        response_time: float,
        success_rate: float,
        availability: float,
        error_rate: float,
        sla_threshold: Optional[SLAThreshold]
    ) -> bool:
        """Check if metrics meet SLA thresholds"""
        
        if not sla_threshold:
            return True  # No SLA defined, assume compliant
        
        return (
            response_time <= sla_threshold.response_time_ms and
            success_rate >= (sla_threshold.success_rate_percent / 100.0) and
            availability >= (sla_threshold.availability_percent / 100.0) and
            error_rate <= (sla_threshold.error_rate_percent / 100.0)
        )
    
    async def _check_and_send_alerts(self, health_statuses: Dict[str, APIHealthStatus]):
        """Check health statuses and send alerts if needed"""
        
        for provider_name, health_status in health_statuses.items():
            await self._check_provider_alerts(health_status)
    
    async def _check_provider_alerts(self, health_status: APIHealthStatus):
        """Check and send alerts for a specific provider"""
        
        provider = health_status.provider
        alerts_to_send = []
        
        # Response time alerts
        sla_threshold = self.sla_thresholds.get(APIProvider(provider))
        if sla_threshold:
            if health_status.response_time_ms > sla_threshold.response_time_ms * self.alert_thresholds["response_time_critical"]:
                alerts_to_send.append({
                    "severity": AlertSeverity.CRITICAL,
                    "title": f"{provider} Response Time Critical",
                    "message": f"Response time {health_status.response_time_ms:.0f}ms exceeds critical threshold",
                    "metrics": {"response_time_ms": health_status.response_time_ms}
                })
            elif health_status.response_time_ms > sla_threshold.response_time_ms * self.alert_thresholds["response_time_warning"]:
                alerts_to_send.append({
                    "severity": AlertSeverity.WARNING,
                    "title": f"{provider} Response Time Warning",
                    "message": f"Response time {health_status.response_time_ms:.0f}ms exceeds warning threshold",
                    "metrics": {"response_time_ms": health_status.response_time_ms}
                })
        
        # Success rate alerts
        if health_status.success_rate < self.alert_thresholds["success_rate_critical"]:
            alerts_to_send.append({
                "severity": AlertSeverity.CRITICAL,
                "title": f"{provider} Success Rate Critical",
                "message": f"Success rate {health_status.success_rate:.1%} below critical threshold",
                "metrics": {"success_rate": health_status.success_rate}
            })
        elif health_status.success_rate < self.alert_thresholds["success_rate_warning"]:
            alerts_to_send.append({
                "severity": AlertSeverity.WARNING,
                "title": f"{provider} Success Rate Warning",
                "message": f"Success rate {health_status.success_rate:.1%} below warning threshold",
                "metrics": {"success_rate": health_status.success_rate}
            })
        
        # Security score alerts
        if health_status.security_score < self.alert_thresholds["security_score_critical"]:
            alerts_to_send.append({
                "severity": AlertSeverity.CRITICAL,
                "title": f"{provider} Security Score Critical",
                "message": f"Security score {health_status.security_score:.1%} indicates potential security issues",
                "metrics": {"security_score": health_status.security_score}
            })
        elif health_status.security_score < self.alert_thresholds["security_score_warning"]:
            alerts_to_send.append({
                "severity": AlertSeverity.WARNING,
                "title": f"{provider} Security Score Warning",
                "message": f"Security score {health_status.security_score:.1%} below warning threshold",
                "metrics": {"security_score": health_status.security_score}
            })
        
        # Circuit breaker alerts
        if health_status.circuit_breaker_state == "open":
            alerts_to_send.append({
                "severity": AlertSeverity.ERROR,
                "title": f"{provider} Circuit Breaker Open",
                "message": f"Circuit breaker is open, requests are being blocked",
                "metrics": {"circuit_breaker_state": health_status.circuit_breaker_state}
            })
        
        # Send alerts
        for alert in alerts_to_send:
            try:
                await self.alert_service.send_alert(
                    title=alert["title"],
                    message=alert["message"],
                    severity=alert["severity"].value,
                    source=f"api_monitoring_{provider}",
                    metadata={
                        "provider": provider,
                        "health_status": asdict(health_status),
                        "alert_metrics": alert["metrics"]
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send alert for {provider}: {e}")
    
    async def get_performance_dashboard_data(self, hours: int = 24) -> Dict[str, Any]:
        """Get comprehensive performance data for dashboard"""
        
        try:
            # Get recent health status
            health_statuses = await self.run_comprehensive_health_check()
            
            # Get historical performance data
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            historical_metrics = await self._get_historical_metrics(cutoff_time)
            
            # Calculate summary statistics
            summary_stats = self._calculate_summary_statistics(historical_metrics)
            
            # Get SLA compliance report
            sla_compliance = self._calculate_sla_compliance_report(health_statuses)
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "current_health": {k: asdict(v) for k, v in health_statuses.items()},
                "historical_metrics": historical_metrics,
                "summary_statistics": summary_stats,
                "sla_compliance": sla_compliance,
                "alert_thresholds": self.alert_thresholds,
                "monitoring_period_hours": hours
            }
            
        except Exception as e:
            logger.error(f"Failed to get dashboard data: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _get_historical_metrics(self, cutoff_time: datetime) -> Dict[str, List[Dict]]:
        """Get historical metrics for dashboard"""
        
        try:
            query = text("""
                SELECT 
                    provider,
                    operation,
                    AVG(response_time) as avg_response_time,
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
                    DATE_TRUNC('hour', recorded_at) as hour_bucket
                FROM api_performance_metrics
                WHERE recorded_at >= :cutoff_time
                GROUP BY provider, operation, hour_bucket
                ORDER BY hour_bucket DESC
            """)
            
            result = self.db.execute(query, {"cutoff_time": cutoff_time})
            
            metrics_by_provider = {}
            for row in result:
                provider = row.provider
                if provider not in metrics_by_provider:
                    metrics_by_provider[provider] = []
                
                success_rate = (row.successful_requests / row.total_requests) if row.total_requests > 0 else 0.0
                
                metrics_by_provider[provider].append({
                    "operation": row.operation,
                    "hour": row.hour_bucket.isoformat(),
                    "avg_response_time": float(row.avg_response_time),
                    "total_requests": row.total_requests,
                    "success_rate": success_rate,
                    "error_rate": 1.0 - success_rate
                })
            
            return metrics_by_provider
            
        except Exception as e:
            logger.error(f"Failed to get historical metrics: {e}")
            return {}
    
    def _calculate_summary_statistics(self, historical_metrics: Dict) -> Dict[str, Any]:
        """Calculate summary statistics from historical data"""
        
        summary = {
            "total_providers": len(historical_metrics),
            "total_requests_24h": 0,
            "overall_success_rate": 0.0,
            "overall_avg_response_time": 0.0,
            "provider_summaries": {}
        }
        
        total_requests = 0
        total_successful = 0
        total_response_time = 0
        
        for provider, metrics in historical_metrics.items():
            provider_requests = sum(m["total_requests"] for m in metrics)
            provider_successful = sum(m["total_requests"] * m["success_rate"] for m in metrics)
            provider_avg_response_time = sum(m["avg_response_time"] for m in metrics) / len(metrics) if metrics else 0.0
            
            total_requests += provider_requests
            total_successful += provider_successful
            total_response_time += provider_avg_response_time
            
            summary["provider_summaries"][provider] = {
                "total_requests": provider_requests,
                "success_rate": (provider_successful / provider_requests) if provider_requests > 0 else 0.0,
                "avg_response_time": provider_avg_response_time
            }
        
        summary["total_requests_24h"] = total_requests
        summary["overall_success_rate"] = (total_successful / total_requests) if total_requests > 0 else 0.0
        summary["overall_avg_response_time"] = total_response_time / len(historical_metrics) if historical_metrics else 0.0
        
        return summary
    
    def _calculate_sla_compliance_report(self, health_statuses: Dict[str, APIHealthStatus]) -> Dict[str, Any]:
        """Calculate SLA compliance report"""
        
        compliance_report = {
            "overall_compliance": True,
            "compliant_providers": 0,
            "total_providers": len(health_statuses),
            "provider_compliance": {}
        }
        
        for provider_name, health_status in health_statuses.items():
            is_compliant = health_status.sla_compliance
            
            if is_compliant:
                compliance_report["compliant_providers"] += 1
            else:
                compliance_report["overall_compliance"] = False
            
            compliance_report["provider_compliance"][provider_name] = {
                "compliant": is_compliant,
                "response_time_compliant": True,  # Would need detailed calculation
                "success_rate_compliant": True,   # Would need detailed calculation
                "availability_compliant": True,   # Would need detailed calculation
                "current_metrics": {
                    "response_time_ms": health_status.response_time_ms,
                    "success_rate": health_status.success_rate,
                    "availability": health_status.availability,
                    "error_rate": health_status.error_rate
                }
            }
        
        compliance_report["compliance_percentage"] = (
            compliance_report["compliant_providers"] / compliance_report["total_providers"]
        ) * 100.0 if compliance_report["total_providers"] > 0 else 100.0
        
        return compliance_report


def get_api_monitoring_service(db: Session) -> APIMonitoringService:
    """Dependency to get API monitoring service"""
    return APIMonitoringService(db)
