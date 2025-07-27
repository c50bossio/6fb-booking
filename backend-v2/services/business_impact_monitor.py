"""
Business Impact Monitoring Service
Monitors and assesses the business impact of errors on Six Figure Barber workflows
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging

from services.error_monitoring_service import (
    error_monitoring_service,
    ErrorEvent,
    ErrorSeverity,
    ErrorCategory,
    BusinessImpact
)


class WorkflowType(Enum):
    """Six Figure Barber workflow types"""
    BOOKING_FLOW = "booking_flow"
    PAYMENT_PROCESSING = "payment_processing"
    CLIENT_MANAGEMENT = "client_management"
    REVENUE_TRACKING = "revenue_tracking"
    BRAND_BUILDING = "brand_building"
    EFFICIENCY_OPTIMIZATION = "efficiency_optimization"
    PROFESSIONAL_GROWTH = "professional_growth"


class ImpactLevel(Enum):
    """Impact severity levels"""
    CRITICAL = "critical"      # Complete workflow breakdown
    SEVERE = "severe"          # Major functionality compromised
    MODERATE = "moderate"      # Some functionality affected
    MINOR = "minor"           # Minimal impact
    NONE = "none"             # No business impact


@dataclass
class WorkflowImpact:
    """Workflow impact assessment"""
    workflow: WorkflowType
    impact_level: ImpactLevel
    affected_functions: List[str]
    revenue_impact_hourly: float
    user_impact_count: int
    first_detected: datetime
    last_updated: datetime
    mitigation_actions: List[str]
    estimated_resolution_time: Optional[int] = None  # minutes


@dataclass
class BusinessMetrics:
    """Business performance metrics"""
    booking_success_rate: float
    payment_completion_rate: float
    user_satisfaction_score: float
    revenue_per_hour: float
    error_induced_churn: float
    six_figure_methodology_compliance: float


class BusinessImpactMonitor:
    """Monitor business impact of errors on Six Figure Barber workflows"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.workflow_impacts: Dict[WorkflowType, WorkflowImpact] = {}
        self.baseline_metrics: Optional[BusinessMetrics] = None
        self.current_metrics: Optional[BusinessMetrics] = None
        
        # Six Figure Barber methodology mappings
        self.workflow_endpoints = {
            WorkflowType.BOOKING_FLOW: [
                "/book", "/appointment", "/calendar", "/availability"
            ],
            WorkflowType.PAYMENT_PROCESSING: [
                "/payment", "/stripe", "/billing", "/payout"
            ],
            WorkflowType.CLIENT_MANAGEMENT: [
                "/client", "/customer", "/contact", "/relationship"
            ],
            WorkflowType.REVENUE_TRACKING: [
                "/analytics", "/revenue", "/earnings", "/commission"
            ],
            WorkflowType.BRAND_BUILDING: [
                "/profile", "/portfolio", "/social", "/marketing"
            ],
            WorkflowType.EFFICIENCY_OPTIMIZATION: [
                "/dashboard", "/schedule", "/automation", "/workflow"
            ],
            WorkflowType.PROFESSIONAL_GROWTH: [
                "/learning", "/certification", "/progress", "/goals"
            ]
        }
        
        # Monitoring task
        self._monitoring_task = None
        self._monitoring_enabled = False
    
    async def start_monitoring(self):
        """Start business impact monitoring"""
        if self._monitoring_task is None and not self._monitoring_enabled:
            self._monitoring_enabled = True
            self._monitoring_task = asyncio.create_task(self._monitor_business_impact())
    
    async def _monitor_business_impact(self):
        """Continuous business impact monitoring"""
        while True:
            try:
                await self._assess_workflow_impacts()
                await self._calculate_business_metrics()
                await self._check_six_figure_methodology_compliance()
                await self._generate_impact_alerts()
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Business impact monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def _assess_workflow_impacts(self):
        """Assess impact on each Six Figure Barber workflow"""
        current_time = datetime.utcnow()
        
        for workflow_type in WorkflowType:
            workflow_errors = self._get_workflow_errors(workflow_type)
            
            if workflow_errors:
                impact = await self._calculate_workflow_impact(workflow_type, workflow_errors)
                self.workflow_impacts[workflow_type] = impact
            elif workflow_type in self.workflow_impacts:
                # Check if impact has been resolved
                if self._is_workflow_restored(workflow_type):
                    del self.workflow_impacts[workflow_type]
    
    def _get_workflow_errors(self, workflow_type: WorkflowType) -> List[ErrorEvent]:
        """Get active errors affecting a specific workflow"""
        workflow_endpoints = self.workflow_endpoints[workflow_type]
        active_errors = []
        
        for error in error_monitoring_service.active_errors.values():
            if error.resolved:
                continue
                
            # Check if error affects this workflow
            if error.endpoint:
                endpoint_lower = error.endpoint.lower()
                if any(pattern in endpoint_lower for pattern in workflow_endpoints):
                    active_errors.append(error)
            
            # Check error category mapping
            if self._is_error_affecting_workflow(error, workflow_type):
                active_errors.append(error)
        
        return active_errors
    
    def _is_error_affecting_workflow(self, error: ErrorEvent, workflow: WorkflowType) -> bool:
        """Check if error affects specific workflow based on category and context"""
        category_mappings = {
            WorkflowType.BOOKING_FLOW: [ErrorCategory.BOOKING, ErrorCategory.BUSINESS_LOGIC],
            WorkflowType.PAYMENT_PROCESSING: [ErrorCategory.PAYMENT, ErrorCategory.EXTERNAL_API],
            WorkflowType.CLIENT_MANAGEMENT: [ErrorCategory.DATABASE, ErrorCategory.BUSINESS_LOGIC],
            WorkflowType.REVENUE_TRACKING: [ErrorCategory.PERFORMANCE, ErrorCategory.DATABASE],
            WorkflowType.BRAND_BUILDING: [ErrorCategory.EXTERNAL_API, ErrorCategory.USER_EXPERIENCE],
            WorkflowType.EFFICIENCY_OPTIMIZATION: [ErrorCategory.PERFORMANCE, ErrorCategory.INFRASTRUCTURE],
            WorkflowType.PROFESSIONAL_GROWTH: [ErrorCategory.USER_EXPERIENCE, ErrorCategory.BUSINESS_LOGIC]
        }
        
        return error.category in category_mappings.get(workflow, [])
    
    async def _calculate_workflow_impact(
        self, 
        workflow_type: WorkflowType, 
        errors: List[ErrorEvent]
    ) -> WorkflowImpact:
        """Calculate business impact for a specific workflow"""
        
        # Determine impact level based on error severity and count
        critical_errors = [e for e in errors if e.severity == ErrorSeverity.CRITICAL]
        high_errors = [e for e in errors if e.severity == ErrorSeverity.HIGH]
        
        if critical_errors:
            impact_level = ImpactLevel.CRITICAL
        elif len(high_errors) >= 3:
            impact_level = ImpactLevel.SEVERE
        elif len(high_errors) >= 1 or len(errors) >= 5:
            impact_level = ImpactLevel.MODERATE
        else:
            impact_level = ImpactLevel.MINOR
        
        # Calculate affected functions
        affected_functions = self._identify_affected_functions(workflow_type, errors)
        
        # Estimate revenue impact
        revenue_impact = self._calculate_revenue_impact(workflow_type, impact_level, len(errors))
        
        # Estimate user impact
        user_impact = self._calculate_user_impact(workflow_type, errors)
        
        # Generate mitigation actions
        mitigation_actions = self._generate_mitigation_actions(workflow_type, errors)
        
        # Estimate resolution time
        estimated_resolution = self._estimate_resolution_time(workflow_type, impact_level)
        
        # Get earliest error time
        first_detected = min(error.timestamp for error in errors)
        
        return WorkflowImpact(
            workflow=workflow_type,
            impact_level=impact_level,
            affected_functions=affected_functions,
            revenue_impact_hourly=revenue_impact,
            user_impact_count=user_impact,
            first_detected=first_detected,
            last_updated=datetime.utcnow(),
            mitigation_actions=mitigation_actions,
            estimated_resolution_time=estimated_resolution
        )
    
    def _identify_affected_functions(
        self, 
        workflow_type: WorkflowType, 
        errors: List[ErrorEvent]
    ) -> List[str]:
        """Identify specific functions affected within a workflow"""
        
        function_mappings = {
            WorkflowType.BOOKING_FLOW: [
                "appointment_scheduling", "calendar_integration", "availability_checking",
                "booking_confirmation", "payment_collection", "client_communication"
            ],
            WorkflowType.PAYMENT_PROCESSING: [
                "payment_capture", "stripe_integration", "commission_calculation",
                "payout_processing", "refund_handling", "invoice_generation"
            ],
            WorkflowType.CLIENT_MANAGEMENT: [
                "client_profiles", "appointment_history", "communication_tracking",
                "preference_management", "loyalty_programs", "feedback_collection"
            ],
            WorkflowType.REVENUE_TRACKING: [
                "earnings_calculation", "performance_analytics", "goal_tracking",
                "commission_reporting", "financial_insights", "growth_metrics"
            ],
            WorkflowType.BRAND_BUILDING: [
                "portfolio_management", "social_media_integration", "review_management",
                "marketing_campaigns", "client_testimonials", "brand_analytics"
            ],
            WorkflowType.EFFICIENCY_OPTIMIZATION: [
                "schedule_optimization", "workflow_automation", "time_tracking",
                "resource_management", "performance_monitoring", "bottleneck_identification"
            ],
            WorkflowType.PROFESSIONAL_GROWTH: [
                "skill_assessment", "learning_modules", "certification_tracking",
                "goal_setting", "progress_monitoring", "mentor_connections"
            ]
        }
        
        workflow_functions = function_mappings.get(workflow_type, [])
        affected = []
        
        for error in errors:
            if error.endpoint:
                endpoint_lower = error.endpoint.lower()
                for function in workflow_functions:
                    function_keywords = function.split('_')
                    if any(keyword in endpoint_lower for keyword in function_keywords):
                        if function not in affected:
                            affected.append(function)
        
        return affected or ["core_functionality"]
    
    def _calculate_revenue_impact(
        self, 
        workflow_type: WorkflowType, 
        impact_level: ImpactLevel, 
        error_count: int
    ) -> float:
        """Calculate estimated hourly revenue impact"""
        
        # Base revenue impact multipliers for Six Figure Barber methodology
        base_revenue_multipliers = {
            WorkflowType.BOOKING_FLOW: 150.0,      # Direct booking revenue impact
            WorkflowType.PAYMENT_PROCESSING: 200.0, # Payment failures
            WorkflowType.CLIENT_MANAGEMENT: 75.0,   # Client retention impact
            WorkflowType.REVENUE_TRACKING: 25.0,    # Analytics/insights impact
            WorkflowType.BRAND_BUILDING: 50.0,      # Marketing ROI impact
            WorkflowType.EFFICIENCY_OPTIMIZATION: 100.0, # Productivity impact
            WorkflowType.PROFESSIONAL_GROWTH: 30.0  # Long-term growth impact
        }
        
        impact_multipliers = {
            ImpactLevel.CRITICAL: 1.0,
            ImpactLevel.SEVERE: 0.7,
            ImpactLevel.MODERATE: 0.4,
            ImpactLevel.MINOR: 0.1,
            ImpactLevel.NONE: 0.0
        }
        
        base_impact = base_revenue_multipliers.get(workflow_type, 50.0)
        impact_multiplier = impact_multipliers.get(impact_level, 0.1)
        error_multiplier = min(1.0 + (error_count * 0.1), 2.0)  # Cap at 2x
        
        return base_impact * impact_multiplier * error_multiplier
    
    def _calculate_user_impact(self, workflow_type: WorkflowType, errors: List[ErrorEvent]) -> int:
        """Calculate estimated number of users impacted"""
        
        # Estimate user impact based on error patterns and workflow
        base_user_impact = {
            WorkflowType.BOOKING_FLOW: 50,         # High user interaction
            WorkflowType.PAYMENT_PROCESSING: 30,   # Transaction-specific
            WorkflowType.CLIENT_MANAGEMENT: 20,    # Admin/barber specific
            WorkflowType.REVENUE_TRACKING: 10,     # Analytics users
            WorkflowType.BRAND_BUILDING: 15,       # Marketing features
            WorkflowType.EFFICIENCY_OPTIMIZATION: 25, # Workflow users
            WorkflowType.PROFESSIONAL_GROWTH: 12   # Learning features
        }
        
        base_impact = base_user_impact.get(workflow_type, 20)
        
        # Factor in error severity and unique users
        unique_users = len(set(e.user_id for e in errors if e.user_id))
        severity_multiplier = sum(
            2.0 if e.severity == ErrorSeverity.CRITICAL else
            1.5 if e.severity == ErrorSeverity.HIGH else
            1.0 if e.severity == ErrorSeverity.MEDIUM else 0.5
            for e in errors
        )
        
        estimated_impact = int(base_impact * severity_multiplier)
        
        # Use actual user count if higher
        return max(estimated_impact, unique_users)
    
    def _generate_mitigation_actions(
        self, 
        workflow_type: WorkflowType, 
        errors: List[ErrorEvent]
    ) -> List[str]:
        """Generate actionable mitigation steps"""
        
        actions = []
        
        # Common actions based on error categories
        error_categories = set(e.category for e in errors)
        
        if ErrorCategory.PAYMENT in error_categories:
            actions.extend([
                "Enable manual payment processing",
                "Activate backup payment gateway",
                "Send payment failure notifications to customers"
            ])
        
        if ErrorCategory.BOOKING in error_categories:
            actions.extend([
                "Enable phone booking fallback",
                "Display booking system maintenance notice",
                "Activate manual booking confirmation process"
            ])
        
        if ErrorCategory.DATABASE in error_categories:
            actions.extend([
                "Switch to read-only mode if safe",
                "Enable database connection retry",
                "Activate data backup verification"
            ])
        
        if ErrorCategory.EXTERNAL_API in error_categories:
            actions.extend([
                "Enable circuit breaker for external services",
                "Activate cached data fallback",
                "Switch to backup service providers"
            ])
        
        # Workflow-specific actions
        workflow_specific_actions = {
            WorkflowType.BOOKING_FLOW: [
                "Display clear booking status messages",
                "Enable appointment waitlist",
                "Activate SMS booking confirmation"
            ],
            WorkflowType.PAYMENT_PROCESSING: [
                "Enable partial payment capture",
                "Activate fraud detection bypass for known customers",
                "Send payment retry instructions"
            ],
            WorkflowType.CLIENT_MANAGEMENT: [
                "Enable offline client data access",
                "Activate backup client communication channels",
                "Switch to manual client record updates"
            ]
        }
        
        workflow_actions = workflow_specific_actions.get(workflow_type, [])
        actions.extend(workflow_actions)
        
        return list(set(actions))  # Remove duplicates
    
    def _estimate_resolution_time(
        self, 
        workflow_type: WorkflowType, 
        impact_level: ImpactLevel
    ) -> int:
        """Estimate resolution time in minutes based on workflow and impact"""
        
        base_resolution_times = {
            ImpactLevel.CRITICAL: 15,   # 15 minutes for critical
            ImpactLevel.SEVERE: 30,     # 30 minutes for severe
            ImpactLevel.MODERATE: 60,   # 1 hour for moderate
            ImpactLevel.MINOR: 120,     # 2 hours for minor
            ImpactLevel.NONE: 0
        }
        
        workflow_multipliers = {
            WorkflowType.BOOKING_FLOW: 1.2,         # High priority
            WorkflowType.PAYMENT_PROCESSING: 1.5,   # Highest priority
            WorkflowType.CLIENT_MANAGEMENT: 1.0,    # Standard
            WorkflowType.REVENUE_TRACKING: 0.8,     # Lower priority
            WorkflowType.BRAND_BUILDING: 0.7,       # Lower priority
            WorkflowType.EFFICIENCY_OPTIMIZATION: 1.0, # Standard
            WorkflowType.PROFESSIONAL_GROWTH: 0.6   # Lowest priority
        }
        
        base_time = base_resolution_times.get(impact_level, 60)
        multiplier = workflow_multipliers.get(workflow_type, 1.0)
        
        return int(base_time * multiplier)
    
    def _is_workflow_restored(self, workflow_type: WorkflowType) -> bool:
        """Check if workflow has been restored to normal operation"""
        workflow_errors = self._get_workflow_errors(workflow_type)
        return len(workflow_errors) == 0
    
    async def _calculate_business_metrics(self):
        """Calculate current business performance metrics"""
        try:
            # This would integrate with actual business metrics collection
            # For now, simulate based on error patterns
            
            current_time = datetime.utcnow()
            last_hour = current_time - timedelta(hours=1)
            
            recent_errors = [
                e for e in error_monitoring_service.active_errors.values()
                if e.timestamp > last_hour and not e.resolved
            ]
            
            # Calculate metrics based on error impact
            booking_errors = len([e for e in recent_errors if e.category == ErrorCategory.BOOKING])
            payment_errors = len([e for e in recent_errors if e.category == ErrorCategory.PAYMENT])
            ux_errors = len([e for e in recent_errors if e.category == ErrorCategory.USER_EXPERIENCE])
            
            # Simulate baseline if not set
            if not self.baseline_metrics:
                self.baseline_metrics = BusinessMetrics(
                    booking_success_rate=0.95,
                    payment_completion_rate=0.98,
                    user_satisfaction_score=4.5,
                    revenue_per_hour=200.0,
                    error_induced_churn=0.02,
                    six_figure_methodology_compliance=0.90
                )
            
            # Calculate current metrics with error impact
            self.current_metrics = BusinessMetrics(
                booking_success_rate=max(0.70, self.baseline_metrics.booking_success_rate - (booking_errors * 0.05)),
                payment_completion_rate=max(0.75, self.baseline_metrics.payment_completion_rate - (payment_errors * 0.03)),
                user_satisfaction_score=max(2.0, self.baseline_metrics.user_satisfaction_score - (ux_errors * 0.1)),
                revenue_per_hour=max(50.0, self.baseline_metrics.revenue_per_hour - sum(
                    impact.revenue_impact_hourly for impact in self.workflow_impacts.values()
                )),
                error_induced_churn=min(0.20, self.baseline_metrics.error_induced_churn + (len(recent_errors) * 0.005)),
                six_figure_methodology_compliance=self._calculate_methodology_compliance()
            )
            
        except Exception as e:
            self.logger.error(f"Failed to calculate business metrics: {e}")
    
    def _calculate_methodology_compliance(self) -> float:
        """Calculate Six Figure Barber methodology compliance score"""
        
        # Check compliance for each workflow
        workflow_scores = {}
        
        for workflow_type in WorkflowType:
            if workflow_type in self.workflow_impacts:
                impact = self.workflow_impacts[workflow_type]
                
                # Score based on impact level
                impact_scores = {
                    ImpactLevel.CRITICAL: 0.0,
                    ImpactLevel.SEVERE: 0.3,
                    ImpactLevel.MODERATE: 0.6,
                    ImpactLevel.MINOR: 0.8,
                    ImpactLevel.NONE: 1.0
                }
                
                workflow_scores[workflow_type] = impact_scores.get(impact.impact_level, 1.0)
            else:
                workflow_scores[workflow_type] = 1.0  # No impact = full compliance
        
        # Calculate weighted average (booking and payment have higher weight)
        weights = {
            WorkflowType.BOOKING_FLOW: 0.25,
            WorkflowType.PAYMENT_PROCESSING: 0.25,
            WorkflowType.CLIENT_MANAGEMENT: 0.15,
            WorkflowType.REVENUE_TRACKING: 0.10,
            WorkflowType.BRAND_BUILDING: 0.10,
            WorkflowType.EFFICIENCY_OPTIMIZATION: 0.10,
            WorkflowType.PROFESSIONAL_GROWTH: 0.05
        }
        
        weighted_score = sum(
            workflow_scores[workflow] * weights[workflow]
            for workflow in WorkflowType
        )
        
        return weighted_score
    
    async def _check_six_figure_methodology_compliance(self):
        """Check compliance with Six Figure Barber methodology"""
        
        if not self.current_metrics:
            return
        
        compliance_score = self.current_metrics.six_figure_methodology_compliance
        
        # Alert on low compliance
        if compliance_score < 0.75:  # Below 75% compliance
            await error_monitoring_service.capture_error(
                message=f"Six Figure Barber methodology compliance low: {compliance_score:.1%}",
                severity=ErrorSeverity.HIGH if compliance_score < 0.5 else ErrorSeverity.MEDIUM,
                category=ErrorCategory.BUSINESS_LOGIC,
                business_impact=BusinessImpact.REVENUE_BLOCKING,
                context={
                    "compliance_score": compliance_score,
                    "impacted_workflows": [
                        {
                            "workflow": impact.workflow.value,
                            "impact_level": impact.impact_level.value,
                            "revenue_impact": impact.revenue_impact_hourly
                        }
                        for impact in self.workflow_impacts.values()
                    ]
                }
            )
    
    async def _generate_impact_alerts(self):
        """Generate alerts for significant business impact"""
        
        for workflow_type, impact in self.workflow_impacts.items():
            
            # Alert on critical or severe impact
            if impact.impact_level in [ImpactLevel.CRITICAL, ImpactLevel.SEVERE]:
                
                severity = ErrorSeverity.CRITICAL if impact.impact_level == ImpactLevel.CRITICAL else ErrorSeverity.HIGH
                
                await error_monitoring_service.capture_error(
                    message=f"Business Impact Alert: {workflow_type.value} - {impact.impact_level.value}",
                    severity=severity,
                    category=ErrorCategory.BUSINESS_LOGIC,
                    business_impact=BusinessImpact.REVENUE_BLOCKING,
                    context={
                        "workflow": workflow_type.value,
                        "impact_level": impact.impact_level.value,
                        "affected_functions": impact.affected_functions,
                        "revenue_impact_hourly": impact.revenue_impact_hourly,
                        "user_impact_count": impact.user_impact_count,
                        "estimated_resolution_minutes": impact.estimated_resolution_time,
                        "mitigation_actions": impact.mitigation_actions,
                        "duration_minutes": (datetime.utcnow() - impact.first_detected).total_seconds() / 60
                    }
                )
    
    def get_business_impact_summary(self) -> Dict[str, Any]:
        """Get comprehensive business impact summary"""
        
        return {
            "workflow_impacts": {
                workflow.value: {
                    "impact_level": impact.impact_level.value,
                    "affected_functions": impact.affected_functions,
                    "revenue_impact_hourly": impact.revenue_impact_hourly,
                    "user_impact_count": impact.user_impact_count,
                    "duration_minutes": (datetime.utcnow() - impact.first_detected).total_seconds() / 60,
                    "estimated_resolution_minutes": impact.estimated_resolution_time,
                    "mitigation_actions": impact.mitigation_actions
                }
                for workflow, impact in self.workflow_impacts.items()
            },
            "business_metrics": {
                "current": {
                    "booking_success_rate": self.current_metrics.booking_success_rate if self.current_metrics else 0.95,
                    "payment_completion_rate": self.current_metrics.payment_completion_rate if self.current_metrics else 0.98,
                    "user_satisfaction_score": self.current_metrics.user_satisfaction_score if self.current_metrics else 4.5,
                    "revenue_per_hour": self.current_metrics.revenue_per_hour if self.current_metrics else 200.0,
                    "error_induced_churn": self.current_metrics.error_induced_churn if self.current_metrics else 0.02,
                    "six_figure_methodology_compliance": self.current_metrics.six_figure_methodology_compliance if self.current_metrics else 0.90
                },
                "baseline": {
                    "booking_success_rate": self.baseline_metrics.booking_success_rate if self.baseline_metrics else 0.95,
                    "payment_completion_rate": self.baseline_metrics.payment_completion_rate if self.baseline_metrics else 0.98,
                    "user_satisfaction_score": self.baseline_metrics.user_satisfaction_score if self.baseline_metrics else 4.5,
                    "revenue_per_hour": self.baseline_metrics.revenue_per_hour if self.baseline_metrics else 200.0,
                    "error_induced_churn": self.baseline_metrics.error_induced_churn if self.baseline_metrics else 0.02,
                    "six_figure_methodology_compliance": self.baseline_metrics.six_figure_methodology_compliance if self.baseline_metrics else 0.90
                }
            },
            "total_revenue_impact_hourly": sum(
                impact.revenue_impact_hourly for impact in self.workflow_impacts.values()
            ),
            "total_users_impacted": sum(
                impact.user_impact_count for impact in self.workflow_impacts.values()
            ),
            "critical_workflows": len([
                impact for impact in self.workflow_impacts.values()
                if impact.impact_level == ImpactLevel.CRITICAL
            ]),
            "six_figure_methodology_health": {
                "compliance_score": self.current_metrics.six_figure_methodology_compliance if self.current_metrics else 0.90,
                "impacted_workflows": len(self.workflow_impacts),
                "revenue_optimization_impact": "high" if any(
                    w in self.workflow_impacts for w in [
                        WorkflowType.BOOKING_FLOW, 
                        WorkflowType.PAYMENT_PROCESSING,
                        WorkflowType.REVENUE_TRACKING
                    ]
                ) else "low"
            }
        }


# Global business impact monitor instance
business_impact_monitor = BusinessImpactMonitor()