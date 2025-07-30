"""
Service Level Objectives (SLO) Management Service
Comprehensive SLO definition, monitoring, and alerting system for 99.9%+ uptime
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import json
from decimal import Decimal

from services.redis_service import cache_service
from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity


class SLOType(Enum):
    AVAILABILITY = "availability"
    LATENCY = "latency"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"
    BUSINESS_METRIC = "business_metric"


class SLOStatus(Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    BREACH = "breach"
    CRITICAL = "critical"


@dataclass
class SLOTarget:
    """Service Level Objective target definition"""
    name: str
    service: str
    slo_type: SLOType
    target_percentage: float  # e.g., 99.9 for 99.9% uptime
    measurement_window_hours: int  # e.g., 24 for 24-hour window
    alert_threshold_percentage: float  # e.g., 99.5 to alert before breach
    description: str
    business_impact: str  # low, medium, high, critical
    
    # Error budget calculation
    @property
    def error_budget_percentage(self) -> float:
        return 100.0 - self.target_percentage
    
    @property
    def error_budget_minutes_per_day(self) -> float:
        return (self.error_budget_percentage / 100) * 24 * 60


@dataclass
class SLOMeasurement:
    """Individual SLO measurement point"""
    slo_name: str
    timestamp: datetime
    value: float
    success_count: int
    total_count: int
    response_time_ms: Optional[float] = None
    error_count: int = 0
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SLOStatus:
    """Current SLO status and compliance"""
    slo_name: str
    current_percentage: float
    target_percentage: float
    status: str  # healthy, warning, breach, critical
    error_budget_remaining_percentage: float
    error_budget_burn_rate: float  # rate of error budget consumption
    time_to_breach_hours: Optional[float]
    breach_count_24h: int
    last_measurement: datetime
    compliance_trend: str  # improving, stable, degrading


class SLOManagementService:
    """Comprehensive SLO management and monitoring service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # SLO definitions and targets
        self.slo_targets = self._create_default_slos()
        self.measurements = defaultdict(lambda: deque(maxlen=10000))
        self.slo_status_cache = {}
        
        # Error budget tracking
        self.error_budget_tracking = defaultdict(dict)
        self.breach_history = defaultdict(list)
        
        # Alert management
        self.alert_history = deque(maxlen=1000)
        self.alert_cooldowns = {}
        
        # Background monitoring
        self._monitoring_task = None
        self._stop_monitoring = False
        
        self.logger.info("🎯 SLO Management Service initialized with enterprise-grade monitoring")
    
    def _create_default_slos(self) -> Dict[str, SLOTarget]:
        """Create default SLO targets for the 6fb-booking platform"""
        return {
            # Core API Availability SLOs
            "api_availability": SLOTarget(
                name="api_availability",
                service="api_gateway",
                slo_type=SLOType.AVAILABILITY,
                target_percentage=99.9,  # 99.9% uptime = 8.77 hours downtime/year
                measurement_window_hours=24,
                alert_threshold_percentage=99.5,
                description="Core API availability for booking and payment operations",
                business_impact="critical"
            ),
            
            # Payment System Availability (Higher requirement)
            "payment_availability": SLOTarget(
                name="payment_availability",
                service="payment_system",
                slo_type=SLOType.AVAILABILITY,
                target_percentage=99.95,  # 99.95% uptime = 4.38 hours downtime/year
                measurement_window_hours=24,
                alert_threshold_percentage=99.8,
                description="Payment processing system availability",
                business_impact="critical"
            ),
            
            # Booking System Availability
            "booking_availability": SLOTarget(
                name="booking_availability",
                service="booking_system",
                slo_type=SLOType.AVAILABILITY,
                target_percentage=99.9,
                measurement_window_hours=24,
                alert_threshold_percentage=99.5,
                description="Appointment booking system availability",
                business_impact="critical"
            ),
            
            # API Response Time SLOs
            "api_latency_p95": SLOTarget(
                name="api_latency_p95",
                service="api_gateway",
                slo_type=SLOType.LATENCY,
                target_percentage=95.0,  # 95% of requests < 400ms
                measurement_window_hours=1,
                alert_threshold_percentage=90.0,
                description="95% of API requests complete within 400ms",
                business_impact="high"
            ),
            
            "api_latency_p99": SLOTarget(
                name="api_latency_p99",
                service="api_gateway",
                slo_type=SLOType.LATENCY,
                target_percentage=99.0,  # 99% of requests < 2000ms
                measurement_window_hours=1,
                alert_threshold_percentage=95.0,
                description="99% of API requests complete within 2000ms",
                business_impact="high"
            ),
            
            # Error Rate SLOs
            "api_error_rate": SLOTarget(
                name="api_error_rate",
                service="api_gateway",
                slo_type=SLOType.ERROR_RATE,
                target_percentage=99.9,  # <0.1% error rate
                measurement_window_hours=24,
                alert_threshold_percentage=99.5,  # Alert at 0.5% error rate
                description="API error rate below 0.1%",
                business_impact="high"
            ),
            
            "payment_error_rate": SLOTarget(
                name="payment_error_rate",
                service="payment_system",
                slo_type=SLOType.ERROR_RATE,
                target_percentage=99.95,  # <0.05% error rate for payments
                measurement_window_hours=24,
                alert_threshold_percentage=99.8,
                description="Payment processing error rate below 0.05%",
                business_impact="critical"
            ),
            
            # Frontend Performance SLOs
            "frontend_availability": SLOTarget(
                name="frontend_availability",
                service="frontend",
                slo_type=SLOType.AVAILABILITY,
                target_percentage=99.8,
                measurement_window_hours=24,
                alert_threshold_percentage=99.0,
                description="Frontend application availability",
                business_impact="high"
            ),
            
            # Database Performance SLOs
            "database_latency": SLOTarget(
                name="database_latency",
                service="database",
                slo_type=SLOType.LATENCY,
                target_percentage=95.0,  # 95% of queries < 100ms
                measurement_window_hours=1,
                alert_threshold_percentage=90.0,
                description="95% of database queries complete within 100ms",
                business_impact="high"
            ),
            
            # Business-Critical SLOs
            "booking_success_rate": SLOTarget(
                name="booking_success_rate",
                service="booking_system",
                slo_type=SLOType.BUSINESS_METRIC,
                target_percentage=99.5,  # 99.5% booking success rate
                measurement_window_hours=24,
                alert_threshold_percentage=98.0,
                description="Successful booking completion rate",
                business_impact="critical"
            ),
            
            "payment_success_rate": SLOTarget(
                name="payment_success_rate",
                service="payment_system",
                slo_type=SLOType.BUSINESS_METRIC,
                target_percentage=99.8,  # 99.8% payment success rate
                measurement_window_hours=24,
                alert_threshold_percentage=99.0,
                description="Successful payment processing rate",
                business_impact="critical"
            ),
            
            # Authentication System SLOs
            "auth_availability": SLOTarget(
                name="auth_availability",
                service="authentication",
                slo_type=SLOType.AVAILABILITY,
                target_percentage=99.9,
                measurement_window_hours=24,
                alert_threshold_percentage=99.5,
                description="User authentication system availability",
                business_impact="high"
            ),
            
            "auth_latency": SLOTarget(
                name="auth_latency",
                service="authentication",
                slo_type=SLOType.LATENCY,
                target_percentage=98.0,  # 98% of auth requests < 500ms
                measurement_window_hours=1,
                alert_threshold_percentage=95.0,
                description="98% of authentication requests complete within 500ms",
                business_impact="high"
            )
        }
    
    async def start_monitoring(self):
        """Start SLO monitoring and alerting"""
        try:
            self.logger.info("🎯 Starting comprehensive SLO monitoring...")
            
            # Start background monitoring tasks
            tasks = [
                self._slo_monitoring_loop(),
                self._error_budget_tracking_loop(),
                self._breach_detection_loop(),
                self._compliance_reporting_loop()
            ]
            
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            self.logger.error(f"❌ SLO monitoring startup failed: {e}")
            await enhanced_sentry.capture_exception(e, {"context": "slo_monitoring_startup"})
    
    async def record_measurement(self, 
                               slo_name: str, 
                               success_count: int, 
                               total_count: int,
                               response_time_ms: Optional[float] = None,
                               context: Dict[str, Any] = None):
        """Record an SLO measurement"""
        
        if slo_name not in self.slo_targets:
            self.logger.warning(f"Unknown SLO: {slo_name}")
            return
        
        # Calculate success percentage
        success_percentage = (success_count / total_count * 100) if total_count > 0 else 100.0
        error_count = total_count - success_count
        
        # Create measurement
        measurement = SLOMeasurement(
            slo_name=slo_name,
            timestamp=datetime.utcnow(),
            value=success_percentage,
            success_count=success_count,
            total_count=total_count,
            response_time_ms=response_time_ms,
            error_count=error_count,
            context=context or {}
        )
        
        # Store measurement
        self.measurements[slo_name].append(measurement)
        
        # Update real-time SLO status
        await self._update_slo_status(slo_name)
        
        # Check for immediate breach
        await self._check_immediate_breach(slo_name, measurement)
    
    async def record_latency_measurement(self, 
                                       slo_name: str, 
                                       response_times_ms: List[float],
                                       context: Dict[str, Any] = None):
        """Record latency-based SLO measurement"""
        
        if slo_name not in self.slo_targets:
            self.logger.warning(f"Unknown SLO: {slo_name}")
            return
        
        slo_target = self.slo_targets[slo_name]
        
        # Determine threshold based on SLO name
        threshold_ms = 400.0  # Default
        if "p99" in slo_name:
            threshold_ms = 2000.0
        elif "p95" in slo_name:
            threshold_ms = 400.0
        elif "database" in slo_name:
            threshold_ms = 100.0
        elif "auth" in slo_name:
            threshold_ms = 500.0
        
        # Calculate compliance
        total_requests = len(response_times_ms)
        compliant_requests = sum(1 for rt in response_times_ms if rt <= threshold_ms)
        
        await self.record_measurement(
            slo_name=slo_name,
            success_count=compliant_requests,
            total_count=total_requests,
            response_time_ms=sum(response_times_ms) / len(response_times_ms) if response_times_ms else 0,
            context={
                **(context or {}),
                "threshold_ms": threshold_ms,
                "p50_ms": self._percentile(response_times_ms, 50),
                "p95_ms": self._percentile(response_times_ms, 95),
                "p99_ms": self._percentile(response_times_ms, 99)
            }
        )
    
    async def get_slo_status(self, slo_name: str) -> Optional[Dict[str, Any]]:
        """Get current status for a specific SLO"""
        
        if slo_name not in self.slo_targets:
            return None
        
        slo_target = self.slo_targets[slo_name]
        recent_measurements = self._get_recent_measurements(slo_name, slo_target.measurement_window_hours)
        
        if not recent_measurements:
            return {
                "slo_name": slo_name,
                "status": "no_data",
                "message": "No recent measurements available"
            }
        
        # Calculate current compliance
        current_percentage = self._calculate_compliance_percentage(recent_measurements, slo_target)
        
        # Calculate error budget
        error_budget_remaining = self._calculate_error_budget_remaining(slo_name, recent_measurements)
        error_budget_burn_rate = self._calculate_burn_rate(slo_name)
        
        # Determine status
        status = self._determine_slo_status(current_percentage, slo_target)
        
        # Calculate time to breach if current trend continues
        time_to_breach = self._calculate_time_to_breach(slo_name, error_budget_burn_rate)
        
        return {
            "slo_name": slo_name,
            "service": slo_target.service,
            "slo_type": slo_target.slo_type.value,
            "target_percentage": slo_target.target_percentage,
            "current_percentage": current_percentage,
            "status": status,
            "error_budget_remaining_percentage": error_budget_remaining,
            "error_budget_burn_rate": error_budget_burn_rate,
            "time_to_breach_hours": time_to_breach,
            "breach_count_24h": len([
                b for b in self.breach_history[slo_name]
                if b.get("timestamp", datetime.min) > datetime.utcnow() - timedelta(hours=24)
            ]),
            "last_measurement": recent_measurements[-1].timestamp.isoformat() if recent_measurements else None,
            "measurement_window_hours": slo_target.measurement_window_hours,
            "business_impact": slo_target.business_impact,
            "description": slo_target.description
        }
    
    async def get_all_slo_status(self) -> Dict[str, Any]:
        """Get status for all SLOs"""
        
        all_status = {}
        summary = {
            "total_slos": len(self.slo_targets),
            "healthy": 0,
            "warning": 0,
            "breach": 0,
            "critical": 0,
            "no_data": 0
        }
        
        for slo_name in self.slo_targets:
            status = await self.get_slo_status(slo_name)
            if status:
                all_status[slo_name] = status
                summary[status["status"]] = summary.get(status["status"], 0) + 1
        
        # Calculate overall health score
        total_weighted_score = 0
        total_weight = 0
        
        for slo_name, status in all_status.items():
            if status["status"] != "no_data":
                weight = self._get_slo_weight(slo_name)
                score = status["current_percentage"]
                total_weighted_score += score * weight
                total_weight += weight
        
        overall_health_percentage = total_weighted_score / total_weight if total_weight > 0 else 0
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_health_percentage": overall_health_percentage,
            "overall_status": self._determine_overall_status(summary, overall_health_percentage),
            "summary": summary,
            "slos": all_status,
            "error_budget_summary": await self._get_error_budget_summary()
        }
    
    async def get_slo_trends(self, slo_name: str, hours: int = 24) -> Dict[str, Any]:
        """Get SLO compliance trends over time"""
        
        if slo_name not in self.slo_targets:
            return {"error": "SLO not found"}
        
        slo_target = self.slo_targets[slo_name]
        measurements = self._get_recent_measurements(slo_name, hours)
        
        if not measurements:
            return {"error": "No measurements available"}
        
        # Group measurements by hour
        hourly_data = defaultdict(list)
        for measurement in measurements:
            hour_key = measurement.timestamp.replace(minute=0, second=0, microsecond=0)
            hourly_data[hour_key].append(measurement)
        
        # Calculate hourly compliance
        trend_data = []
        for hour, hour_measurements in sorted(hourly_data.items()):
            compliance = self._calculate_compliance_percentage(hour_measurements, slo_target)
            trend_data.append({
                "timestamp": hour.isoformat(),
                "compliance_percentage": compliance,
                "measurement_count": len(hour_measurements),
                "error_budget_consumed": max(0, slo_target.target_percentage - compliance)
            })
        
        # Calculate trend direction
        if len(trend_data) >= 2:
            recent_avg = sum(d["compliance_percentage"] for d in trend_data[-3:]) / min(3, len(trend_data))
            earlier_avg = sum(d["compliance_percentage"] for d in trend_data[-6:-3]) / min(3, len(trend_data[:-3]))
            
            if recent_avg > earlier_avg + 0.1:
                trend_direction = "improving"
            elif recent_avg < earlier_avg - 0.1:
                trend_direction = "degrading"
            else:
                trend_direction = "stable"
        else:
            trend_direction = "insufficient_data"
        
        return {
            "slo_name": slo_name,
            "time_range_hours": hours,
            "trend_direction": trend_direction,
            "data_points": len(trend_data),
            "hourly_compliance": trend_data,
            "average_compliance": sum(d["compliance_percentage"] for d in trend_data) / len(trend_data),
            "min_compliance": min(d["compliance_percentage"] for d in trend_data),
            "max_compliance": max(d["compliance_percentage"] for d in trend_data)
        }
    
    async def create_custom_slo(self, 
                              name: str, 
                              service: str, 
                              slo_type: str,
                              target_percentage: float,
                              measurement_window_hours: int,
                              alert_threshold_percentage: float,
                              description: str,
                              business_impact: str = "medium") -> bool:
        """Create a custom SLO"""
        
        try:
            slo_target = SLOTarget(
                name=name,
                service=service,
                slo_type=SLOType(slo_type),
                target_percentage=target_percentage,
                measurement_window_hours=measurement_window_hours,
                alert_threshold_percentage=alert_threshold_percentage,
                description=description,
                business_impact=business_impact
            )
            
            self.slo_targets[name] = slo_target
            
            self.logger.info(f"✅ Created custom SLO: {name}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to create custom SLO {name}: {e}")
            return False
    
    async def _slo_monitoring_loop(self):
        """Main SLO monitoring loop"""
        while not self._stop_monitoring:
            try:
                # Update all SLO statuses
                for slo_name in self.slo_targets:
                    await self._update_slo_status(slo_name)
                
                # Clean up old measurements
                self._cleanup_old_measurements()
                
                # Sleep for monitoring interval
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"❌ SLO monitoring loop error: {e}")
                await asyncio.sleep(60)
    
    async def _error_budget_tracking_loop(self):
        """Track error budget consumption and burn rates"""
        while not self._stop_monitoring:
            try:
                for slo_name in self.slo_targets:
                    await self._update_error_budget_tracking(slo_name)
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"❌ Error budget tracking error: {e}")
                await asyncio.sleep(300)
    
    async def _breach_detection_loop(self):
        """Detect and alert on SLO breaches"""
        while not self._stop_monitoring:
            try:
                for slo_name in self.slo_targets:
                    await self._check_for_breach(slo_name)
                
                await asyncio.sleep(30)  # Check every 30 seconds for fast detection
                
            except Exception as e:
                self.logger.error(f"❌ Breach detection error: {e}")
                await asyncio.sleep(30)
    
    async def _compliance_reporting_loop(self):
        """Generate compliance reports and store metrics"""
        while not self._stop_monitoring:
            try:
                # Generate compliance report
                compliance_data = await self._generate_compliance_report()
                
                # Store in cache for dashboard access
                await cache_service.set("slo_compliance_report", json.dumps(compliance_data), ttl=3600)
                
                await asyncio.sleep(3600)  # Generate report every hour
                
            except Exception as e:
                self.logger.error(f"❌ Compliance reporting error: {e}")
                await asyncio.sleep(3600)
    
    def _get_recent_measurements(self, slo_name: str, hours: int) -> List[SLOMeasurement]:
        """Get recent measurements within the specified time window"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        return [
            m for m in self.measurements[slo_name]
            if m.timestamp > cutoff_time
        ]
    
    def _calculate_compliance_percentage(self, measurements: List[SLOMeasurement], slo_target: SLOTarget) -> float:
        """Calculate compliance percentage from measurements"""
        if not measurements:
            return 100.0
        
        if slo_target.slo_type == SLOType.LATENCY:
            # For latency SLOs, calculate percentage of requests meeting threshold
            total_successes = sum(m.success_count for m in measurements)
            total_requests = sum(m.total_count for m in measurements)
            return (total_successes / total_requests * 100) if total_requests > 0 else 100.0
        
        elif slo_target.slo_type == SLOType.ERROR_RATE:
            # For error rate SLOs, calculate success rate
            total_successes = sum(m.success_count for m in measurements)
            total_requests = sum(m.total_count for m in measurements)
            return (total_successes / total_requests * 100) if total_requests > 0 else 100.0
        
        elif slo_target.slo_type == SLOType.AVAILABILITY:
            # For availability SLOs, calculate uptime percentage
            total_successes = sum(m.success_count for m in measurements)
            total_checks = sum(m.total_count for m in measurements)
            return (total_successes / total_checks * 100) if total_checks > 0 else 100.0
        
        else:
            # For business metrics, use weighted average
            total_weight = sum(m.total_count for m in measurements)
            weighted_sum = sum(m.value * m.total_count for m in measurements)
            return (weighted_sum / total_weight) if total_weight > 0 else 100.0
    
    def _calculate_error_budget_remaining(self, slo_name: str, measurements: List[SLOMeasurement]) -> float:
        """Calculate remaining error budget percentage"""
        slo_target = self.slo_targets[slo_name]
        current_compliance = self._calculate_compliance_percentage(measurements, slo_target)
        
        # Error budget = (100 - target_percentage)
        # Remaining budget = max(0, current_compliance - target_percentage) / (100 - target_percentage) * 100
        if current_compliance >= slo_target.target_percentage:
            return 100.0  # Full budget available
        else:
            consumed_budget = slo_target.target_percentage - current_compliance
            total_budget = 100.0 - slo_target.target_percentage
            remaining_percentage = max(0, (total_budget - consumed_budget) / total_budget * 100)
            return remaining_percentage
    
    def _calculate_burn_rate(self, slo_name: str) -> float:
        """Calculate error budget burn rate (budget consumed per hour)"""
        # Compare last 1 hour with previous 1 hour
        now = datetime.utcnow()
        last_hour_start = now - timedelta(hours=1)
        prev_hour_start = now - timedelta(hours=2)
        
        last_hour_measurements = [
            m for m in self.measurements[slo_name]
            if last_hour_start <= m.timestamp <= now
        ]
        
        prev_hour_measurements = [
            m for m in self.measurements[slo_name]
            if prev_hour_start <= m.timestamp <= last_hour_start
        ]
        
        slo_target = self.slo_targets[slo_name]
        
        if not last_hour_measurements or not prev_hour_measurements:
            return 0.0
        
        last_hour_budget = self._calculate_error_budget_remaining(slo_name, last_hour_measurements)
        prev_hour_budget = self._calculate_error_budget_remaining(slo_name, prev_hour_measurements)
        
        burn_rate = prev_hour_budget - last_hour_budget  # Budget consumed in last hour
        return max(0, burn_rate)
    
    def _calculate_time_to_breach(self, slo_name: str, burn_rate: float) -> Optional[float]:
        """Calculate hours until SLO breach at current burn rate"""
        if burn_rate <= 0:
            return None
        
        measurements = self._get_recent_measurements(slo_name, 24)
        current_budget = self._calculate_error_budget_remaining(slo_name, measurements)
        
        if current_budget <= 0:
            return 0.0  # Already breached
        
        return current_budget / burn_rate if burn_rate > 0 else None
    
    def _determine_slo_status(self, current_percentage: float, slo_target: SLOTarget) -> str:
        """Determine SLO status based on current performance"""
        if current_percentage < slo_target.target_percentage:
            return "breach"
        elif current_percentage < slo_target.alert_threshold_percentage:
            return "critical"
        elif current_percentage < slo_target.target_percentage + 0.5:
            return "warning"
        else:
            return "healthy"
    
    def _determine_overall_status(self, summary: Dict[str, int], health_percentage: float) -> str:
        """Determine overall system status from SLO summary"""
        if summary.get("breach", 0) > 0 or summary.get("critical", 0) > 2:
            return "critical"
        elif summary.get("critical", 0) > 0 or summary.get("warning", 0) > 3:
            return "degraded"
        elif health_percentage >= 99.0:
            return "healthy"
        else:
            return "warning"
    
    def _get_slo_weight(self, slo_name: str) -> float:
        """Get weight for SLO in overall health calculation"""
        slo_target = self.slo_targets[slo_name]
        
        weights = {
            "critical": 5.0,
            "high": 3.0,
            "medium": 2.0,
            "low": 1.0
        }
        
        return weights.get(slo_target.business_impact, 2.0)
    
    async def _update_slo_status(self, slo_name: str):
        """Update cached SLO status"""
        status = await self.get_slo_status(slo_name)
        if status:
            self.slo_status_cache[slo_name] = status
    
    async def _check_immediate_breach(self, slo_name: str, measurement: SLOMeasurement):
        """Check for immediate SLO breach"""
        slo_target = self.slo_targets[slo_name]
        
        if measurement.value < slo_target.alert_threshold_percentage:
            await self._trigger_slo_alert(slo_name, "immediate_breach", {
                "measurement_value": measurement.value,
                "threshold": slo_target.alert_threshold_percentage,
                "measurement_time": measurement.timestamp.isoformat()
            })
    
    async def _check_for_breach(self, slo_name: str):
        """Check for SLO breach and trigger alerts"""
        status = self.slo_status_cache.get(slo_name)
        if not status:
            return
        
        current_status = status["status"]
        slo_target = self.slo_targets[slo_name]
        
        # Check for new breaches
        if current_status in ["breach", "critical"]:
            # Check if we've already alerted recently
            cooldown_key = f"{slo_name}_{current_status}"
            last_alert = self.alert_cooldowns.get(cooldown_key)
            
            if not last_alert or (datetime.utcnow() - last_alert).total_seconds() > 900:  # 15 min cooldown
                await self._trigger_slo_alert(slo_name, current_status, status)
                self.alert_cooldowns[cooldown_key] = datetime.utcnow()
        
        # Record breaches
        if current_status == "breach":
            self.breach_history[slo_name].append({
                "timestamp": datetime.utcnow(),
                "compliance_percentage": status["current_percentage"],
                "target_percentage": status["target_percentage"]
            })
    
    async def _trigger_slo_alert(self, slo_name: str, alert_type: str, context: Dict[str, Any]):
        """Trigger SLO alert"""
        slo_target = self.slo_targets[slo_name]
        
        # Determine alert severity
        severity_map = {
            "breach": AlertSeverity.CRITICAL,
            "critical": AlertSeverity.HIGH,
            "warning": AlertSeverity.MEDIUM,
            "immediate_breach": AlertSeverity.CRITICAL
        }
        
        severity = severity_map.get(alert_type, AlertSeverity.MEDIUM)
        
        alert_message = f"SLO {alert_type}: {slo_name} - {slo_target.description}"
        
        # Send to monitoring systems
        await enhanced_sentry.capture_business_event(
            f"slo_{alert_type}",
            alert_message,
            {
                "slo_name": slo_name,
                "service": slo_target.service,
                "business_impact": slo_target.business_impact,
                "alert_type": alert_type,
                **context
            },
            severity=severity
        )
        
        # Log alert
        self.logger.error(f"🚨 SLO ALERT: {alert_message}")
        
        # Record in alert history
        self.alert_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "slo_name": slo_name,
            "alert_type": alert_type,
            "severity": severity.value,
            "context": context
        })
    
    async def _update_error_budget_tracking(self, slo_name: str):
        """Update error budget tracking data"""
        measurements = self._get_recent_measurements(slo_name, 24)
        if not measurements:
            return
        
        error_budget_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "remaining_percentage": self._calculate_error_budget_remaining(slo_name, measurements),
            "burn_rate_per_hour": self._calculate_burn_rate(slo_name),
            "total_measurements_24h": len(measurements)
        }
        
        self.error_budget_tracking[slo_name] = error_budget_data
    
    async def _get_error_budget_summary(self) -> Dict[str, Any]:
        """Get error budget summary for all SLOs"""
        summary = {
            "total_slos": len(self.slo_targets),
            "budgets_healthy": 0,
            "budgets_warning": 0,
            "budgets_critical": 0,
            "budgets_exhausted": 0
        }
        
        budget_details = {}
        
        for slo_name in self.slo_targets:
            budget_data = self.error_budget_tracking.get(slo_name, {})
            remaining = budget_data.get("remaining_percentage", 100)
            
            if remaining > 50:
                summary["budgets_healthy"] += 1
                status = "healthy"
            elif remaining > 20:
                summary["budgets_warning"] += 1
                status = "warning"
            elif remaining > 0:
                summary["budgets_critical"] += 1
                status = "critical"
            else:
                summary["budgets_exhausted"] += 1
                status = "exhausted"
            
            budget_details[slo_name] = {
                "remaining_percentage": remaining,
                "status": status,
                "burn_rate": budget_data.get("burn_rate_per_hour", 0)
            }
        
        summary["budget_details"] = budget_details
        return summary
    
    async def _generate_compliance_report(self) -> Dict[str, Any]:
        """Generate comprehensive compliance report"""
        all_status = await self.get_all_slo_status()
        
        # Calculate compliance statistics
        compliant_slos = [s for s in all_status["slos"].values() if s["status"] == "healthy"]
        total_slos = len(all_status["slos"])
        
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_compliance_percentage": (len(compliant_slos) / total_slos * 100) if total_slos > 0 else 0,
            "total_slos": total_slos,
            "compliant_slos": len(compliant_slos),
            "slo_breakdown": all_status["summary"],
            "critical_slos": [
                {"name": name, "status": status["status"], "current_percentage": status["current_percentage"]}
                for name, status in all_status["slos"].items()
                if status["status"] in ["breach", "critical"]
            ],
            "error_budget_summary": all_status["error_budget_summary"],
            "recommendations": self._generate_compliance_recommendations(all_status)
        }
        
        return report
    
    def _generate_compliance_recommendations(self, all_status: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate recommendations based on SLO compliance"""
        recommendations = []
        
        # Analyze breached SLOs
        breached_slos = [
            (name, status) for name, status in all_status["slos"].items()
            if status["status"] == "breach"
        ]
        
        if breached_slos:
            for slo_name, status in breached_slos:
                recommendations.append({
                    "type": "breach_remediation",
                    "priority": "critical",
                    "slo_name": slo_name,
                    "description": f"SLO {slo_name} is currently breached",
                    "current_percentage": status["current_percentage"],
                    "target_percentage": status["target_percentage"],
                    "action": f"Immediate investigation required for {status['service']} service"
                })
        
        # Analyze error budget consumption
        error_budget_summary = all_status.get("error_budget_summary", {})
        critical_budgets = error_budget_summary.get("budgets_critical", 0)
        
        if critical_budgets > 0:
            recommendations.append({
                "type": "error_budget_management",
                "priority": "high",
                "description": f"{critical_budgets} SLO(s) have critically low error budgets",
                "action": "Review deployment practices and implement additional monitoring"
            })
        
        # Analyze overall health
        overall_health = all_status.get("overall_health_percentage", 100)
        if overall_health < 95:
            recommendations.append({
                "type": "system_health",
                "priority": "high",
                "description": f"Overall system health is {overall_health:.1f}%",
                "action": "Comprehensive system review and optimization required"
            })
        
        return recommendations
    
    def _percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile of values"""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]
    
    def _cleanup_old_measurements(self):
        """Clean up measurements older than retention period"""
        retention_hours = 72  # Keep 72 hours of data
        cutoff_time = datetime.utcnow() - timedelta(hours=retention_hours)
        
        for slo_name in self.measurements:
            while (self.measurements[slo_name] and 
                   self.measurements[slo_name][0].timestamp < cutoff_time):
                self.measurements[slo_name].popleft()
    
    async def stop_monitoring(self):
        """Stop SLO monitoring"""
        self._stop_monitoring = True
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass


# Global SLO management instance
slo_manager = SLOManagementService()