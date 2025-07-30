"""
Service Level Objectives (SLO) Monitoring Service
Comprehensive SLO tracking, error budget management, and reliability monitoring
for the 6fb-booking platform with business context awareness
"""

import asyncio
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, asdict, field
from collections import defaultdict, deque
from enum import Enum
import statistics
import json
import threading
from contextlib import asynccontextmanager

from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity
from services.performance_monitoring_service import performance_monitor


logger = logging.getLogger(__name__)


class SLOType(Enum):
    """Types of SLO measurements"""
    AVAILABILITY = "availability"
    LATENCY = "latency"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"
    BUSINESS_METRIC = "business_metric"


class SLOSeverity(Enum):
    """SLO violation severity levels"""
    BREACHED = "breached"          # SLO completely violated
    CRITICAL = "critical"          # Error budget nearly exhausted
    WARNING = "warning"            # Error budget consumption high
    HEALTHY = "healthy"            # SLO performing well


@dataclass
class SLOTarget:
    """SLO target definition"""
    name: str
    description: str
    slo_type: SLOType
    target_percentage: float       # e.g., 99.9 for 99.9% availability
    measurement_window_days: int   # e.g., 30 for rolling 30-day window
    business_impact: str          # 'critical', 'high', 'medium', 'low'
    service_component: str        # e.g., 'booking_api', 'payment_processing'
    measurement_query: str        # Query or logic to measure SLO
    threshold_values: Dict[str, float] = field(default_factory=dict)
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class SLOSample:
    """Individual SLO measurement sample"""
    timestamp: datetime
    service_component: str
    slo_name: str
    actual_value: float
    target_value: float
    measurement_window_minutes: int
    success: bool
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ErrorBudget:
    """Error budget tracking"""
    slo_name: str
    total_budget: float           # Total error budget for period
    consumed_budget: float        # Amount of budget consumed
    remaining_budget: float       # Remaining error budget
    consumption_rate: float       # Rate of budget consumption per day
    projected_exhaustion: Optional[datetime]  # When budget will be exhausted
    last_updated: datetime
    budget_alerts: List[str] = field(default_factory=list)


@dataclass
class SLOStatus:
    """Current SLO status and health"""
    slo_name: str
    current_performance: float
    target_performance: float
    status: SLOSeverity
    error_budget: ErrorBudget
    recent_violations: List[datetime]
    time_to_recovery: Optional[float]  # Minutes to recover SLO
    business_impact_score: float
    recommendations: List[str]


class SLOMonitoringService:
    """Comprehensive SLO monitoring and error budget management"""
    
    def __init__(self, measurement_interval_seconds: int = 60):
        self.logger = logging.getLogger(__name__)
        self.measurement_interval = measurement_interval_seconds
        
        # SLO definitions for 6fb-booking platform
        self.slo_targets = self._create_default_slos()
        
        # Measurement storage
        self.slo_measurements = defaultdict(lambda: deque(maxlen=50000))  # ~35 days at 1-min intervals
        self.error_budgets = {}
        self.slo_statuses = {}
        
        # Alert tracking
        self.alert_history = deque(maxlen=1000)
        self.last_alert_times = {}
        
        # Background monitoring
        self._monitoring_task = None
        self._stop_monitoring = False
        self._lock = threading.RLock()
        
        # Business context
        self.business_critical_slos = {
            'booking_api_availability', 'payment_processing_availability',
            'appointment_creation_latency', 'stripe_payment_success_rate'
        }
        
        self._start_monitoring()
    
    def _create_default_slos(self) -> Dict[str, SLOTarget]:
        """Create default SLO targets for 6fb-booking platform"""
        
        slos = {}
        
        # API Availability SLOs
        slos['booking_api_availability'] = SLOTarget(
            name="booking_api_availability",
            description="Booking API must be available 99.9% of the time",
            slo_type=SLOType.AVAILABILITY,
            target_percentage=99.9,
            measurement_window_days=30,
            business_impact='critical',
            service_component='booking_api',
            measurement_query="success_rate_30d",
            threshold_values={'critical': 99.0, 'warning': 99.5},
            tags={'api': 'booking', 'revenue_impact': 'high'}
        )
        
        slos['payment_processing_availability'] = SLOTarget(
            name="payment_processing_availability",
            description="Payment processing must be available 99.95% of the time",
            slo_type=SLOType.AVAILABILITY,
            target_percentage=99.95,
            measurement_window_days=30,
            business_impact='critical',
            service_component='payment_api',
            measurement_query="payment_success_rate_30d",
            threshold_values={'critical': 99.5, 'warning': 99.8},
            tags={'api': 'payment', 'revenue_impact': 'critical'}
        )
        
        slos['user_authentication_availability'] = SLOTarget(
            name="user_authentication_availability", 
            description="User authentication must be available 99.5% of the time",
            slo_type=SLOType.AVAILABILITY,
            target_percentage=99.5,
            measurement_window_days=30,
            business_impact='high',
            service_component='auth_api',
            measurement_query="auth_success_rate_30d",
            threshold_values={'critical': 98.0, 'warning': 99.0},
            tags={'api': 'auth', 'user_impact': 'high'}
        )
        
        # Latency SLOs
        slos['appointment_creation_latency'] = SLOTarget(
            name="appointment_creation_latency",
            description="95% of appointment creation requests complete within 2 seconds",
            slo_type=SLOType.LATENCY,
            target_percentage=95.0,
            measurement_window_days=7,
            business_impact='critical',
            service_component='booking_api',
            measurement_query="p95_latency_under_2s",
            threshold_values={'critical': 5.0, 'warning': 3.0},  # seconds
            tags={'operation': 'appointment_creation', 'user_experience': 'critical'}
        )
        
        slos['payment_processing_latency'] = SLOTarget(
            name="payment_processing_latency",
            description="95% of payment requests complete within 5 seconds",
            slo_type=SLOType.LATENCY,
            target_percentage=95.0,
            measurement_window_days=7,
            business_impact='critical', 
            service_component='payment_api',
            measurement_query="p95_payment_latency_under_5s",
            threshold_values={'critical': 10.0, 'warning': 7.0},  # seconds
            tags={'operation': 'payment_processing', 'revenue_impact': 'critical'}
        )
        
        slos['api_response_time'] = SLOTarget(
            name="api_response_time",
            description="95% of API requests complete within 400ms",
            slo_type=SLOType.LATENCY,
            target_percentage=95.0,
            measurement_window_days=7,
            business_impact='high',
            service_component='all_apis',
            measurement_query="p95_api_latency_under_400ms",
            threshold_values={'critical': 2.0, 'warning': 1.0},  # seconds
            tags={'operation': 'api_requests', 'user_experience': 'high'}
        )
        
        # Error Rate SLOs
        slos['booking_error_rate'] = SLOTarget(
            name="booking_error_rate",
            description="Booking error rate must be below 0.1%",
            slo_type=SLOType.ERROR_RATE,
            target_percentage=99.9,  # 99.9% success = 0.1% error
            measurement_window_days=7,
            business_impact='critical',
            service_component='booking_api',
            measurement_query="booking_error_rate_7d",
            threshold_values={'critical': 1.0, 'warning': 0.5},  # percentage
            tags={'operation': 'booking', 'revenue_impact': 'high'}
        )
        
        slos['stripe_payment_success_rate'] = SLOTarget(
            name="stripe_payment_success_rate", 
            description="Payment success rate must be above 99.5%",
            slo_type=SLOType.ERROR_RATE,
            target_percentage=99.5,
            measurement_window_days=7,
            business_impact='critical',
            service_component='stripe_integration',
            measurement_query="stripe_success_rate_7d",
            threshold_values={'critical': 98.0, 'warning': 99.0},  # percentage
            tags={'integration': 'stripe', 'revenue_impact': 'critical'}
        )
        
        # Business Metrics SLOs
        slos['appointment_completion_rate'] = SLOTarget(
            name="appointment_completion_rate",
            description="95% of scheduled appointments should be completed successfully",
            slo_type=SLOType.BUSINESS_METRIC,
            target_percentage=95.0,
            measurement_window_days=30,
            business_impact='high',
            service_component='appointment_workflow',
            measurement_query="appointment_completion_rate_30d",
            threshold_values={'critical': 85.0, 'warning': 90.0},  # percentage
            tags={'workflow': 'appointments', 'six_figure_methodology': 'client_value'}
        )
        
        slos['revenue_processing_accuracy'] = SLOTarget(
            name="revenue_processing_accuracy",
            description="99.99% of revenue transactions must be processed accurately",
            slo_type=SLOType.BUSINESS_METRIC,
            target_percentage=99.99,
            measurement_window_days=30,
            business_impact='critical',
            service_component='payment_workflow',
            measurement_query="revenue_accuracy_30d", 
            threshold_values={'critical': 99.5, 'warning': 99.9},  # percentage
            tags={'workflow': 'payments', 'six_figure_methodology': 'revenue_optimization'}
        )
        
        return slos
    
    def _start_monitoring(self):
        """Start background SLO monitoring"""
        if self._monitoring_task is None:
            self._monitoring_task = asyncio.create_task(self._monitoring_loop())
    
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while not self._stop_monitoring:
            try:
                # Measure all SLOs
                await self._measure_all_slos()
                
                # Update error budgets
                await self._update_error_budgets()
                
                # Check SLO violations
                await self._check_slo_violations()
                
                # Clean up old measurements
                self._cleanup_old_measurements()
                
                # Wait for next measurement interval
                await asyncio.sleep(self.measurement_interval)
                
            except Exception as e:
                self.logger.error(f"SLO monitoring loop error: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _measure_all_slos(self):
        """Measure all defined SLOs"""
        
        current_time = datetime.utcnow()
        
        for slo_name, slo_target in self.slo_targets.items():
            try:
                # Measure SLO based on type
                measurement = await self._measure_slo(slo_target, current_time)
                
                if measurement:
                    with self._lock:
                        self.slo_measurements[slo_name].append(measurement)
                
            except Exception as e:
                self.logger.error(f"Failed to measure SLO {slo_name}: {e}")
    
    async def _measure_slo(self, slo_target: SLOTarget, timestamp: datetime) -> Optional[SLOSample]:
        """Measure a specific SLO"""
        
        try:
            if slo_target.slo_type == SLOType.AVAILABILITY:
                return await self._measure_availability_slo(slo_target, timestamp)
            elif slo_target.slo_type == SLOType.LATENCY:
                return await self._measure_latency_slo(slo_target, timestamp)
            elif slo_target.slo_type == SLOType.ERROR_RATE:
                return await self._measure_error_rate_slo(slo_target, timestamp)
            elif slo_target.slo_type == SLOType.BUSINESS_METRIC:
                return await self._measure_business_metric_slo(slo_target, timestamp)
            
        except Exception as e:
            self.logger.error(f"Error measuring SLO {slo_target.name}: {e}")
            return None
    
    async def _measure_availability_slo(self, slo_target: SLOTarget, timestamp: datetime) -> SLOSample:
        """Measure availability SLO"""
        
        # Get recent performance data from performance monitor
        lookback_minutes = 5  # Measure over last 5 minutes
        
        if slo_target.service_component == 'booking_api':
            # Calculate booking API availability from recent requests
            endpoint_performance = await performance_monitor.get_endpoint_performance(lookback_minutes)
            booking_endpoints = [ep for ep in endpoint_performance if 'booking' in ep.endpoint.lower()]
            
            if booking_endpoints:
                # Calculate availability as (total_requests - errors) / total_requests
                total_requests = sum(ep.requests_per_minute * lookback_minutes for ep in booking_endpoints)
                error_requests = sum(ep.error_rate * ep.requests_per_minute * lookback_minutes / 100 for ep in booking_endpoints)
                
                if total_requests > 0:
                    availability = ((total_requests - error_requests) / total_requests) * 100
                else:
                    availability = 100.0  # No requests = assume available
            else:
                availability = 100.0  # No data = assume available
        
        elif slo_target.service_component == 'payment_api':
            # Similar logic for payment API
            endpoint_performance = await performance_monitor.get_endpoint_performance(lookback_minutes)
            payment_endpoints = [ep for ep in endpoint_performance if 'payment' in ep.endpoint.lower()]
            
            if payment_endpoints:
                total_requests = sum(ep.requests_per_minute * lookback_minutes for ep in payment_endpoints)
                error_requests = sum(ep.error_rate * ep.requests_per_minute * lookback_minutes / 100 for ep in payment_endpoints)
                
                if total_requests > 0:
                    availability = ((total_requests - error_requests) / total_requests) * 100
                else:
                    availability = 100.0
            else:
                availability = 100.0
        
        else:
            # Default availability measurement
            availability = 100.0  # Placeholder
        
        return SLOSample(
            timestamp=timestamp,
            service_component=slo_target.service_component,
            slo_name=slo_target.name,
            actual_value=availability,
            target_value=slo_target.target_percentage,
            measurement_window_minutes=lookback_minutes,
            success=availability >= slo_target.target_percentage,
            context={'measurement_type': 'availability', 'requests_analyzed': True}
        )
    
    async def _measure_latency_slo(self, slo_target: SLOTarget, timestamp: datetime) -> SLOSample:
        """Measure latency SLO"""
        
        lookback_minutes = 5
        
        # Get performance data
        endpoint_performance = await performance_monitor.get_endpoint_performance(lookback_minutes)
        
        if slo_target.name == 'appointment_creation_latency':
            # Look for appointment/booking creation endpoints
            relevant_endpoints = [ep for ep in endpoint_performance 
                                if any(keyword in ep.endpoint.lower() 
                                      for keyword in ['appointment', 'booking', 'create'])]
            
            if relevant_endpoints:
                # Use P95 response time
                p95_times = [ep.p95_response_time for ep in relevant_endpoints]
                avg_p95_time = statistics.mean(p95_times)
                
                # Check if 95% of requests are under threshold
                threshold = slo_target.threshold_values.get('warning', 2.0)
                success_percentage = 95.0 if avg_p95_time <= threshold else 85.0  # Simplified
            else:
                avg_p95_time = 0.0
                success_percentage = 100.0
        
        elif slo_target.name == 'payment_processing_latency':
            # Look for payment endpoints
            payment_endpoints = [ep for ep in endpoint_performance 
                               if 'payment' in ep.endpoint.lower()]
            
            if payment_endpoints:
                p95_times = [ep.p95_response_time for ep in payment_endpoints]
                avg_p95_time = statistics.mean(p95_times)
                
                threshold = slo_target.threshold_values.get('warning', 5.0)
                success_percentage = 95.0 if avg_p95_time <= threshold else 85.0
            else:
                avg_p95_time = 0.0
                success_percentage = 100.0
        
        else:
            # General API latency
            if endpoint_performance:
                all_p95_times = [ep.p95_response_time for ep in endpoint_performance]
                avg_p95_time = statistics.mean(all_p95_times)
                
                threshold = slo_target.threshold_values.get('warning', 0.4)
                success_percentage = 95.0 if avg_p95_time <= threshold else 85.0
            else:
                avg_p95_time = 0.0
                success_percentage = 100.0
        
        return SLOSample(
            timestamp=timestamp,
            service_component=slo_target.service_component,
            slo_name=slo_target.name,
            actual_value=success_percentage,
            target_value=slo_target.target_percentage,
            measurement_window_minutes=lookback_minutes,
            success=success_percentage >= slo_target.target_percentage,
            context={'measurement_type': 'latency', 'avg_p95_ms': avg_p95_time * 1000}
        )
    
    async def _measure_error_rate_slo(self, slo_target: SLOTarget, timestamp: datetime) -> SLOSample:
        """Measure error rate SLO"""
        
        lookback_minutes = 5
        
        # Get performance data
        endpoint_performance = await performance_monitor.get_endpoint_performance(lookback_minutes)
        
        if slo_target.service_component == 'booking_api':
            booking_endpoints = [ep for ep in endpoint_performance 
                               if 'booking' in ep.endpoint.lower()]
            
            if booking_endpoints:
                # Calculate weighted average error rate
                total_requests = sum(ep.requests_per_minute * lookback_minutes for ep in booking_endpoints)
                total_errors = sum(ep.error_rate * ep.requests_per_minute * lookback_minutes / 100 
                                 for ep in booking_endpoints)
                
                if total_requests > 0:
                    error_rate = (total_errors / total_requests) * 100
                    success_rate = 100 - error_rate
                else:
                    success_rate = 100.0
            else:
                success_rate = 100.0
        
        elif slo_target.service_component == 'stripe_integration':
            # This would need integration with actual Stripe metrics
            # For now, simulate based on payment endpoint performance
            payment_endpoints = [ep for ep in endpoint_performance 
                               if 'payment' in ep.endpoint.lower()]
            
            if payment_endpoints:
                total_requests = sum(ep.requests_per_minute * lookback_minutes for ep in payment_endpoints)
                total_errors = sum(ep.error_rate * ep.requests_per_minute * lookback_minutes / 100 
                                 for ep in payment_endpoints)
                
                if total_requests > 0:
                    error_rate = (total_errors / total_requests) * 100
                    success_rate = 100 - error_rate
                else:
                    success_rate = 100.0
            else:
                success_rate = 100.0
        
        else:
            success_rate = 100.0  # Default
        
        return SLOSample(
            timestamp=timestamp,
            service_component=slo_target.service_component,
            slo_name=slo_target.name,
            actual_value=success_rate,
            target_value=slo_target.target_percentage,
            measurement_window_minutes=lookback_minutes,
            success=success_rate >= slo_target.target_percentage,
            context={'measurement_type': 'error_rate'}
        )
    
    async def _measure_business_metric_slo(self, slo_target: SLOTarget, timestamp: datetime) -> SLOSample:
        """Measure business metric SLO"""
        
        # These would need integration with actual business metrics
        # For now, provide simulated measurements
        
        if slo_target.name == 'appointment_completion_rate':
            # This would query actual appointment completion data
            completion_rate = 96.5  # Simulated - would come from database
        elif slo_target.name == 'revenue_processing_accuracy':
            # This would query actual revenue processing data
            completion_rate = 99.98  # Simulated - would come from financial reconciliation
        else:
            completion_rate = 100.0
        
        return SLOSample(
            timestamp=timestamp,
            service_component=slo_target.service_component,
            slo_name=slo_target.name,
            actual_value=completion_rate,
            target_value=slo_target.target_percentage,
            measurement_window_minutes=1440,  # Daily measurement
            success=completion_rate >= slo_target.target_percentage,
            context={'measurement_type': 'business_metric'}
        )
    
    async def _update_error_budgets(self):
        """Update error budgets for all SLOs"""
        
        current_time = datetime.utcnow()
        
        for slo_name, slo_target in self.slo_targets.items():
            try:
                error_budget = self._calculate_error_budget(slo_name, slo_target, current_time)
                
                with self._lock:
                    self.error_budgets[slo_name] = error_budget
                
            except Exception as e:
                self.logger.error(f"Failed to update error budget for {slo_name}: {e}")
    
    def _calculate_error_budget(self, slo_name: str, slo_target: SLOTarget, current_time: datetime) -> ErrorBudget:
        """Calculate error budget for an SLO"""
        
        # Define measurement window
        window_start = current_time - timedelta(days=slo_target.measurement_window_days)
        
        # Get measurements within window
        with self._lock:
            measurements = [
                m for m in self.slo_measurements[slo_name]
                if m.timestamp >= window_start
            ]
        
        if not measurements:
            # No measurements = assume healthy
            return ErrorBudget(
                slo_name=slo_name,
                total_budget=100.0 - slo_target.target_percentage,
                consumed_budget=0.0,
                remaining_budget=100.0 - slo_target.target_percentage,
                consumption_rate=0.0,
                projected_exhaustion=None,
                last_updated=current_time,
                budget_alerts=[]
            )
        
        # Calculate error budget consumption
        total_budget = 100.0 - slo_target.target_percentage  # e.g., 0.1% for 99.9% SLO
        
        # Calculate actual performance over window
        if slo_target.slo_type in [SLOType.AVAILABILITY, SLOType.ERROR_RATE, SLOType.BUSINESS_METRIC]:
            # For availability/error rate, use success rate
            success_rates = [m.actual_value for m in measurements]
            avg_performance = statistics.mean(success_rates)
            error_rate = 100.0 - avg_performance
        elif slo_target.slo_type == SLOType.LATENCY:
            # For latency, check percentage meeting SLO
            successful_measurements = [m for m in measurements if m.success]
            success_rate = (len(successful_measurements) / len(measurements)) * 100
            avg_performance = success_rate
            error_rate = 100.0 - avg_performance
        else:
            error_rate = 0.0
        
        # Calculate consumed budget
        if error_rate > total_budget:
            consumed_budget = total_budget  # Budget exhausted
        else:
            consumed_budget = error_rate
        
        remaining_budget = max(0.0, total_budget - consumed_budget)
        
        # Calculate consumption rate (per day)
        if len(measurements) > 1:
            time_span_days = (measurements[-1].timestamp - measurements[0].timestamp).total_seconds() / 86400
            consumption_rate = consumed_budget / max(time_span_days, 1)
        else:
            consumption_rate = 0.0
        
        # Project when budget will be exhausted
        projected_exhaustion = None
        if consumption_rate > 0 and remaining_budget > 0:
            days_to_exhaustion = remaining_budget / consumption_rate
            projected_exhaustion = current_time + timedelta(days=days_to_exhaustion)
        
        # Generate budget alerts
        budget_alerts = []
        budget_utilization = (consumed_budget / total_budget) * 100 if total_budget > 0 else 0
        
        if budget_utilization >= 100:
            budget_alerts.append("ERROR_BUDGET_EXHAUSTED")
        elif budget_utilization >= 90:
            budget_alerts.append("ERROR_BUDGET_CRITICAL")
        elif budget_utilization >= 75:
            budget_alerts.append("ERROR_BUDGET_WARNING")
        
        return ErrorBudget(
            slo_name=slo_name,
            total_budget=total_budget,
            consumed_budget=consumed_budget,
            remaining_budget=remaining_budget,
            consumption_rate=consumption_rate,
            projected_exhaustion=projected_exhaustion,
            last_updated=current_time,
            budget_alerts=budget_alerts
        )
    
    async def _check_slo_violations(self):
        """Check for SLO violations and trigger alerts"""
        
        current_time = datetime.utcnow()
        
        for slo_name, slo_target in self.slo_targets.items():
            try:
                # Get current SLO status
                slo_status = await self.get_slo_status(slo_name)
                
                if slo_status:
                    # Check for violations
                    await self._evaluate_slo_violation(slo_status, slo_target, current_time)
                
            except Exception as e:
                self.logger.error(f"Failed to check SLO violations for {slo_name}: {e}")
    
    async def _evaluate_slo_violation(self, slo_status: SLOStatus, slo_target: SLOTarget, current_time: datetime):
        """Evaluate if SLO violation requires alerting"""
        
        # Check cooldown period
        last_alert = self.last_alert_times.get(slo_status.slo_name, datetime.min)
        cooldown_minutes = 30 if slo_target.business_impact == 'critical' else 60
        
        if current_time - last_alert < timedelta(minutes=cooldown_minutes):
            return
        
        # Determine if alert is needed
        should_alert = False
        alert_severity = AlertSeverity.LOW
        alert_message = ""
        
        if slo_status.status == SLOSeverity.BREACHED:
            should_alert = True
            alert_severity = AlertSeverity.CRITICAL
            alert_message = f"SLO BREACHED: {slo_status.slo_name} - Performance: {slo_status.current_performance:.2f}% (Target: {slo_status.target_performance:.2f}%)"
        
        elif slo_status.status == SLOSeverity.CRITICAL:
            should_alert = True
            alert_severity = AlertSeverity.HIGH
            alert_message = f"SLO CRITICAL: {slo_status.slo_name} - Error budget nearly exhausted"
        
        elif slo_status.status == SLOSeverity.WARNING and slo_target.business_impact == 'critical':
            should_alert = True
            alert_severity = AlertSeverity.MEDIUM
            alert_message = f"SLO WARNING: {slo_status.slo_name} - High error budget consumption"
        
        if should_alert:
            # Record alert
            alert_record = {
                'slo_name': slo_status.slo_name,
                'severity': slo_status.status.value,
                'current_performance': slo_status.current_performance,
                'target_performance': slo_status.target_performance,
                'error_budget_remaining': slo_status.error_budget.remaining_budget,
                'business_impact': slo_target.business_impact,
                'timestamp': current_time.isoformat(),
                'recommendations': slo_status.recommendations
            }
            
            with self._lock:
                self.alert_history.append(alert_record)
                self.last_alert_times[slo_status.slo_name] = current_time
            
            # Send to monitoring system
            await enhanced_sentry.capture_business_event(
                "slo_violation",
                alert_message,
                {
                    'slo_name': slo_status.slo_name,
                    'severity': slo_status.status.value,
                    'business_impact': slo_target.business_impact,
                    'error_budget': asdict(slo_status.error_budget),
                    'recommendations': slo_status.recommendations
                }
            )
    
    async def get_slo_status(self, slo_name: str) -> Optional[SLOStatus]:
        """Get current status for an SLO"""
        
        if slo_name not in self.slo_targets:
            return None
        
        slo_target = self.slo_targets[slo_name]
        current_time = datetime.utcnow()
        
        # Get recent measurements
        lookback_time = current_time - timedelta(hours=1)  # Last hour for status
        
        with self._lock:
            recent_measurements = [
                m for m in self.slo_measurements[slo_name]
                if m.timestamp >= lookback_time
            ]
        
        if not recent_measurements:
            # No recent data
            return SLOStatus(
                slo_name=slo_name,
                current_performance=0.0,
                target_performance=slo_target.target_percentage,
                status=SLOSeverity.HEALTHY,
                error_budget=self.error_budgets.get(slo_name, ErrorBudget(
                    slo_name=slo_name,
                    total_budget=0.0,
                    consumed_budget=0.0,
                    remaining_budget=0.0,
                    consumption_rate=0.0,
                    projected_exhaustion=None,
                    last_updated=current_time
                )),
                recent_violations=[],
                time_to_recovery=None,
                business_impact_score=0.0,
                recommendations=["No recent measurement data available"]
            )
        
        # Calculate current performance
        current_performance = statistics.mean([m.actual_value for m in recent_measurements])
        
        # Get error budget
        error_budget = self.error_budgets.get(slo_name, ErrorBudget(
            slo_name=slo_name,
            total_budget=100.0 - slo_target.target_percentage,
            consumed_budget=0.0,
            remaining_budget=100.0 - slo_target.target_percentage,
            consumption_rate=0.0,
            projected_exhaustion=None,
            last_updated=current_time
        ))
        
        # Determine status
        if current_performance < slo_target.target_percentage:
            status = SLOSeverity.BREACHED
        elif error_budget.remaining_budget <= 0:
            status = SLOSeverity.CRITICAL
        elif (error_budget.consumed_budget / error_budget.total_budget) >= 0.75:
            status = SLOSeverity.WARNING
        else:
            status = SLOSeverity.HEALTHY
        
        # Calculate business impact score
        business_impact_score = self._calculate_business_impact_score(slo_target, current_performance, error_budget)
        
        # Generate recommendations
        recommendations = self._generate_slo_recommendations(slo_target, current_performance, error_budget, status)
        
        # Find recent violations
        violation_threshold = current_time - timedelta(hours=24)
        recent_violations = [
            m.timestamp for m in recent_measurements
            if not m.success and m.timestamp >= violation_threshold
        ]
        
        return SLOStatus(
            slo_name=slo_name,
            current_performance=current_performance,
            target_performance=slo_target.target_percentage,
            status=status,
            error_budget=error_budget,
            recent_violations=recent_violations,
            time_to_recovery=None,  # Would need more sophisticated calculation
            business_impact_score=business_impact_score,
            recommendations=recommendations
        )
    
    def _calculate_business_impact_score(self, slo_target: SLOTarget, current_performance: float, error_budget: ErrorBudget) -> float:
        """Calculate business impact score (0-100)"""
        
        # Base impact on business criticality
        base_impact = {
            'critical': 80,
            'high': 60,
            'medium': 40,
            'low': 20
        }.get(slo_target.business_impact, 20)
        
        # Adjust based on performance gap
        performance_gap = max(0, slo_target.target_percentage - current_performance)
        performance_impact = min(20, performance_gap * 5)  # Up to 20 points for performance gap
        
        # Adjust based on error budget consumption
        budget_utilization = (error_budget.consumed_budget / error_budget.total_budget) * 100 if error_budget.total_budget > 0 else 0
        budget_impact = min(20, budget_utilization / 5)  # Up to 20 points for budget consumption
        
        total_impact = base_impact + performance_impact + budget_impact
        return min(100, total_impact)
    
    def _generate_slo_recommendations(self, slo_target: SLOTarget, current_performance: float, error_budget: ErrorBudget, status: SLOSeverity) -> List[str]:
        """Generate recommendations for SLO improvement"""
        
        recommendations = []
        
        if status == SLOSeverity.BREACHED:
            recommendations.append("IMMEDIATE ACTION REQUIRED: SLO is currently being violated")
            
            if slo_target.slo_type == SLOType.AVAILABILITY:
                recommendations.extend([
                    "Check for active incidents affecting service availability",
                    "Review recent deployments that may have introduced issues",
                    "Scale infrastructure to handle current load",
                    "Implement emergency mitigation procedures"
                ])
            elif slo_target.slo_type == SLOType.LATENCY:
                recommendations.extend([
                    "Investigate slow database queries or external service calls",
                    "Check for resource contention (CPU, memory, network)",
                    "Review recent code changes for performance regressions",
                    "Consider implementing request timeout and circuit breakers"
                ])
            elif slo_target.slo_type == SLOType.ERROR_RATE:
                recommendations.extend([
                    "Investigate error patterns and root causes",
                    "Check external service dependencies",
                    "Review application logs for recurring errors",
                    "Implement error recovery and retry mechanisms"
                ])
        
        elif status == SLOSeverity.CRITICAL:
            recommendations.append("Error budget nearly exhausted - implement proactive measures")
            recommendations.extend([
                "Freeze non-critical feature deployments",
                "Focus engineering effort on reliability improvements",
                "Review and improve monitoring and alerting",
                "Conduct reliability analysis and improvement planning"
            ])
        
        elif status == SLOSeverity.WARNING:
            recommendations.extend([
                "Monitor error budget consumption closely",
                "Review trending issues that may lead to SLO violations",
                "Plan reliability improvements for next iteration",
                "Consider tightening change management processes"
            ])
        
        # Add SLO-specific recommendations
        if slo_target.name in self.business_critical_slos:
            recommendations.append("BUSINESS CRITICAL: Prioritize immediate resolution")
        
        if 'six_figure_methodology' in slo_target.tags:
            methodology_area = slo_target.tags['six_figure_methodology']
            recommendations.append(f"Six Figure Barber Impact: This affects {methodology_area}")
        
        return recommendations
    
    def _cleanup_old_measurements(self):
        """Clean up old SLO measurements"""
        
        # Keep measurements within retention window
        max_retention_days = max(slo.measurement_window_days for slo in self.slo_targets.values()) + 7
        cutoff_time = datetime.utcnow() - timedelta(days=max_retention_days)
        
        with self._lock:
            for slo_name in self.slo_measurements:
                while (self.slo_measurements[slo_name] and 
                       self.slo_measurements[slo_name][0].timestamp < cutoff_time):
                    self.slo_measurements[slo_name].popleft()
    
    async def get_slo_dashboard_data(self) -> Dict[str, Any]:
        """Get comprehensive SLO dashboard data"""
        
        dashboard_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'slos': {},
            'error_budgets': {},
            'overall_health': 'healthy',
            'critical_violations': [],
            'business_impact_summary': {},
            'recommendations': []
        }
        
        # Get status for all SLOs
        critical_violations = []
        business_critical_issues = []
        all_recommendations = []
        
        for slo_name in self.slo_targets:
            slo_status = await self.get_slo_status(slo_name)
            
            if slo_status:
                dashboard_data['slos'][slo_name] = asdict(slo_status)
                dashboard_data['error_budgets'][slo_name] = asdict(slo_status.error_budget)
                
                # Track critical issues
                if slo_status.status in [SLOSeverity.BREACHED, SLOSeverity.CRITICAL]:
                    critical_violations.append({
                        'slo_name': slo_name,
                        'status': slo_status.status.value,
                        'business_impact': self.slo_targets[slo_name].business_impact,
                        'performance': slo_status.current_performance
                    })
                    
                    if slo_name in self.business_critical_slos:
                        business_critical_issues.append(slo_name)
                
                all_recommendations.extend(slo_status.recommendations)
        
        # Determine overall health
        if business_critical_issues:
            dashboard_data['overall_health'] = 'critical'
        elif critical_violations:
            dashboard_data['overall_health'] = 'degraded'
        
        dashboard_data['critical_violations'] = critical_violations
        dashboard_data['business_critical_issues'] = business_critical_issues
        dashboard_data['recommendations'] = list(set(all_recommendations))  # Deduplicate
        
        # Business impact summary
        dashboard_data['business_impact_summary'] = {
            'six_figure_methodology_impact': self._assess_six_figure_methodology_impact(),
            'revenue_impact_score': self._calculate_revenue_impact_score(critical_violations),
            'user_experience_impact': self._calculate_ux_impact_score(critical_violations)
        }
        
        return dashboard_data
    
    def _assess_six_figure_methodology_impact(self) -> Dict[str, Any]:
        """Assess impact on Six Figure Barber methodology areas"""
        
        methodology_impact = {
            'revenue_optimization': 'healthy',
            'client_value_creation': 'healthy', 
            'business_efficiency': 'healthy',
            'professional_growth': 'healthy',
            'scalability': 'healthy'
        }
        
        # Check SLOs that impact each methodology area
        for slo_name, slo_target in self.slo_targets.items():
            if 'six_figure_methodology' in slo_target.tags:
                methodology_area = slo_target.tags['six_figure_methodology']
                
                # Get current status
                with self._lock:
                    error_budget = self.error_budgets.get(slo_name)
                
                if error_budget and error_budget.remaining_budget <= 0:
                    methodology_impact[methodology_area] = 'critical'
                elif error_budget and (error_budget.consumed_budget / error_budget.total_budget) >= 0.75:
                    if methodology_impact[methodology_area] != 'critical':
                        methodology_impact[methodology_area] = 'warning'
        
        return methodology_impact
    
    def _calculate_revenue_impact_score(self, critical_violations: List[Dict[str, Any]]) -> float:
        """Calculate revenue impact score (0-100)"""
        
        revenue_impact = 0.0
        
        for violation in critical_violations:
            if violation['business_impact'] == 'critical':
                revenue_impact += 30
            elif violation['business_impact'] == 'high':
                revenue_impact += 15
        
        return min(100, revenue_impact)
    
    def _calculate_ux_impact_score(self, critical_violations: List[Dict[str, Any]]) -> float:
        """Calculate user experience impact score (0-100)"""
        
        ux_impact = 0.0
        
        for violation in critical_violations:
            slo_target = self.slo_targets.get(violation['slo_name'])
            if slo_target and 'user_experience' in slo_target.tags:
                impact_level = slo_target.tags['user_experience']
                if impact_level == 'critical':
                    ux_impact += 25
                elif impact_level == 'high':
                    ux_impact += 15
        
        return min(100, ux_impact)
    
    async def stop_monitoring(self):
        """Stop SLO monitoring"""
        self._stop_monitoring = True
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass


# Global SLO monitoring instance
slo_monitor = SLOMonitoringService()