"""
Six Figure Barber CRM Service

This service provides comprehensive client relationship management functionality
aligned with Six Figure Barber methodology principles. It handles:

1. Client value tier management and progression
2. Communication tracking and optimization
3. Client journey management with automated touchpoints
4. Relationship scoring and engagement analytics
5. Retention campaigns and churn prediction
6. Automated workflow execution

Key Features:
- Intelligent client scoring and tier progression
- Automated touchpoint sequences based on client behavior
- Predictive analytics for churn and growth opportunities
- ROI tracking for all CRM activities
- Six Figure Barber methodology compliance
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, date, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
import json
import logging
from dataclasses import dataclass

from models.six_figure_barber_crm import (
    SixFBClientCommunicationProfile,
    SixFBClientBehaviorAnalytics,
    SixFBClientCommunication,
    SixFBClientEngagementHistory,
    SixFBClientJourneyStage,
    SixFBClientTouchpointPlan,
    SixFBAutomatedWorkflow,
    SixFBWorkflowExecution,
    SixFBClientValueTierHistory,
    SixFBRetentionCampaign,
    SixFBClientAnalyticsSummary,
    CommunicationType,
    CommunicationStatus,
    EngagementType,
    ClientStage,
    TouchpointType,
    WorkflowTrigger
)
from models.six_figure_barber_core import (
    SixFBClientValueProfile,
    ClientValueTier,
    SixFBPrinciple
)
from models import Client, User, Appointment
from core.exceptions import UserError, ValidationError


logger = logging.getLogger(__name__)


@dataclass
class ClientScoreComponents:
    """Components that make up a client's overall score"""
    relationship_score: float
    engagement_score: float
    value_score: float
    consistency_score: float
    growth_potential: float
    overall_score: float


@dataclass
class TierProgression:
    """Client tier progression recommendation"""
    current_tier: ClientValueTier
    recommended_tier: ClientValueTier
    progression_score: float
    requirements_met: List[str]
    requirements_missing: List[str]
    estimated_timeline_days: Optional[int]


@dataclass
class ChurnRiskAssessment:
    """Client churn risk analysis"""
    risk_score: float
    risk_level: str  # low, medium, high, critical
    contributing_factors: List[str]
    recommended_interventions: List[str]
    intervention_priority: str


class SixFigureBarberCRMService:
    """
    Comprehensive CRM service implementing Six Figure Barber methodology
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # Scoring weights for Six Figure Barber methodology
        self.scoring_weights = {
            "relationship": 0.25,
            "engagement": 0.20,
            "value": 0.30,
            "consistency": 0.15,
            "growth_potential": 0.10
        }
        
        # Tier progression thresholds
        self.tier_thresholds = {
            ClientValueTier.PREMIUM_VIP: 90,
            ClientValueTier.CORE_REGULAR: 75,
            ClientValueTier.DEVELOPING: 60,
            ClientValueTier.OCCASIONAL: 40,
            ClientValueTier.AT_RISK: 25
        }
    
    # ============================================================================
    # CLIENT PROFILE MANAGEMENT
    # ============================================================================
    
    def get_or_create_communication_profile(
        self, 
        user_id: int, 
        client_id: int
    ) -> SixFBClientCommunicationProfile:
        """Get or create a communication profile for a client"""
        
        profile = self.db.query(SixFBClientCommunicationProfile).filter(
            and_(
                SixFBClientCommunicationProfile.user_id == user_id,
                SixFBClientCommunicationProfile.client_id == client_id
            )
        ).first()
        
        if not profile:
            profile = SixFBClientCommunicationProfile(
                user_id=user_id,
                client_id=client_id,
                preferred_communication_method=CommunicationType.SMS,
                communication_frequency_preference="moderate",
                engagement_score=50.0,
                communication_sentiment=50.0
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(profile)
            
        return profile
    
    def update_client_behavior_analytics(
        self, 
        user_id: int, 
        client_id: int
    ) -> SixFBClientBehaviorAnalytics:
        """Update or create behavior analytics for a client"""
        
        today = date.today()
        
        # Get existing analytics or create new
        analytics = self.db.query(SixFBClientBehaviorAnalytics).filter(
            and_(
                SixFBClientBehaviorAnalytics.user_id == user_id,
                SixFBClientBehaviorAnalytics.client_id == client_id,
                SixFBClientBehaviorAnalytics.analysis_date == today
            )
        ).first()
        
        if not analytics:
            analytics = SixFBClientBehaviorAnalytics(
                user_id=user_id,
                client_id=client_id,
                analysis_date=today
            )
            self.db.add(analytics)
        
        # Calculate behavior metrics
        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise UserError("Client not found")
        
        # Get client's appointment history
        appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.client_id == client_id,
                Appointment.status == "completed"
            )
        ).order_by(desc(Appointment.start_time)).limit(20).all()
        
        if appointments:
            # Calculate visit pattern consistency
            visit_intervals = []
            for i in range(1, len(appointments)):
                interval = (appointments[i-1].start_time.date() - appointments[i].start_time.date()).days
                visit_intervals.append(interval)
            
            if visit_intervals:
                avg_interval = sum(visit_intervals) / len(visit_intervals)
                interval_variance = sum((x - avg_interval) ** 2 for x in visit_intervals) / len(visit_intervals)
                consistency_score = max(0, 100 - (interval_variance / avg_interval * 10))
            else:
                consistency_score = 50.0
            
            analytics.visit_pattern_consistency = consistency_score
            
            # Calculate average booking lead time
            booking_lead_times = []
            for apt in appointments:
                if apt.created_at and apt.start_time:
                    lead_time = (apt.start_time.date() - apt.created_at.date()).days
                    booking_lead_times.append(lead_time)
            
            if booking_lead_times:
                analytics.booking_lead_time_days = sum(booking_lead_times) / len(booking_lead_times)
        
        # Calculate churn risk score
        analytics.churn_risk_score = self._calculate_churn_risk(client, appointments)
        
        # Calculate upsell receptivity
        analytics.upsell_receptivity_score = self._calculate_upsell_receptivity(client, appointments)
        
        # Calculate growth potential
        analytics.growth_potential_score = self._calculate_growth_potential(client, appointments)
        
        # Calculate lifetime value projection
        if client.total_spent > 0 and client.total_visits > 0:
            avg_ticket = client.total_spent / client.total_visits
            visit_frequency = client.visit_frequency_days if client.visit_frequency_days else 30
            annual_visits = 365 / visit_frequency
            projected_ltv = avg_ticket * annual_visits * 3  # 3-year projection
            analytics.lifetime_value_projection = Decimal(str(projected_ltv))
        
        analytics.last_calculated = datetime.utcnow()
        self.db.commit()
        self.db.refresh(analytics)
        
        return analytics
    
    def calculate_client_score_components(
        self, 
        user_id: int, 
        client_id: int
    ) -> ClientScoreComponents:
        """Calculate comprehensive client score components"""
        
        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise UserError("Client not found")
        
        # Get or create profiles
        comm_profile = self.get_or_create_communication_profile(user_id, client_id)
        behavior_analytics = self.update_client_behavior_analytics(user_id, client_id)
        
        # Get Six Figure Barber value profile
        value_profile = self.db.query(SixFBClientValueProfile).filter(
            and_(
                SixFBClientValueProfile.user_id == user_id,
                SixFBClientValueProfile.client_id == client_id
            )
        ).first()
        
        # Calculate relationship score (0-100)
        relationship_score = (
            (comm_profile.engagement_score * 0.4) +
            (comm_profile.response_rate * 0.3) +
            (comm_profile.communication_sentiment * 0.3)
        )
        
        # Calculate engagement score (0-100)
        engagement_score = comm_profile.engagement_score
        
        # Calculate value score (0-100)
        if value_profile:
            value_score = (
                (min(value_profile.lifetime_value / 5000, 1) * 40) +  # Normalize to $5k
                (value_profile.loyalty_score * 0.3) +
                (value_profile.upsell_receptivity * 0.3)
            )
        else:
            # Fallback calculation based on client data
            ltv_normalized = min(client.total_spent / 2000, 1) * 40  # Normalize to $2k
            visit_score = min(client.total_visits / 20, 1) * 30  # Normalize to 20 visits
            frequency_score = 30 if client.visit_frequency_days and client.visit_frequency_days <= 45 else 15
            value_score = ltv_normalized + visit_score + frequency_score
        
        # Calculate consistency score (0-100)
        consistency_score = behavior_analytics.visit_pattern_consistency if behavior_analytics.visit_pattern_consistency else 50.0
        
        # Calculate growth potential (0-100)
        growth_potential = behavior_analytics.growth_potential_score if behavior_analytics.growth_potential_score else 50.0
        
        # Calculate overall score
        overall_score = (
            relationship_score * self.scoring_weights["relationship"] +
            engagement_score * self.scoring_weights["engagement"] +
            value_score * self.scoring_weights["value"] +
            consistency_score * self.scoring_weights["consistency"] +
            growth_potential * self.scoring_weights["growth_potential"]
        )
        
        return ClientScoreComponents(
            relationship_score=relationship_score,
            engagement_score=engagement_score,
            value_score=value_score,
            consistency_score=consistency_score,
            growth_potential=growth_potential,
            overall_score=overall_score
        )
    
    # ============================================================================
    # CLIENT JOURNEY MANAGEMENT
    # ============================================================================
    
    def get_or_create_client_journey_stage(
        self, 
        user_id: int, 
        client_id: int
    ) -> SixFBClientJourneyStage:
        """Get or create client journey stage tracking"""
        
        journey = self.db.query(SixFBClientJourneyStage).filter(
            and_(
                SixFBClientJourneyStage.user_id == user_id,
                SixFBClientJourneyStage.client_id == client_id
            )
        ).order_by(desc(SixFBClientJourneyStage.stage_entry_date)).first()
        
        if not journey:
            # Determine initial stage based on client data
            client = self.db.query(Client).filter(Client.id == client_id).first()
            if not client:
                raise UserError("Client not found")
            
            if client.total_visits == 0:
                initial_stage = ClientStage.PROSPECT
            elif client.total_visits == 1:
                initial_stage = ClientStage.FIRST_TIME_CLIENT
            elif client.total_visits <= 3:
                initial_stage = ClientStage.CONVERTING_CLIENT
            else:
                initial_stage = ClientStage.REGULAR_CLIENT
            
            journey = SixFBClientJourneyStage(
                user_id=user_id,
                client_id=client_id,
                current_stage=initial_stage,
                stage_entry_date=date.today(),
                days_in_current_stage=0
            )
            self.db.add(journey)
            self.db.commit()
            self.db.refresh(journey)
        
        return journey
    
    def update_client_journey_stage(
        self, 
        user_id: int, 
        client_id: int,
        force_recalculation: bool = False
    ) -> SixFBClientJourneyStage:
        """Update client journey stage based on current behavior and metrics"""
        
        journey = self.get_or_create_client_journey_stage(user_id, client_id)
        client = self.db.query(Client).filter(Client.id == client_id).first()
        
        if not client:
            raise UserError("Client not found")
        
        # Calculate current stage based on client metrics
        score_components = self.calculate_client_score_components(user_id, client_id)
        current_stage = self._determine_client_stage(client, score_components)
        
        # Update journey if stage has changed or forced recalculation
        if current_stage != journey.current_stage or force_recalculation:
            # Record stage history
            journey.previous_stage = journey.current_stage
            journey.current_stage = current_stage
            journey.stage_entry_date = date.today()
            journey.days_in_current_stage = 0
            
            # Calculate progression metrics
            journey.progression_score = score_components.overall_score
            journey.relationship_quality_score = score_components.relationship_score
            
            # Determine value tier alignment
            tier_progression = self.analyze_tier_progression(user_id, client_id)
            journey.value_tier_alignment = tier_progression.current_tier
            
            # Update readiness for premium positioning
            journey.premium_positioning_readiness = self._calculate_premium_readiness(score_components)
            
            journey.last_calculated = datetime.utcnow()
            self.db.commit()
            
            # Trigger automated touchpoints for new stage
            self._trigger_stage_transition_touchpoints(user_id, client_id, current_stage)
        
        else:
            # Update days in current stage
            journey.days_in_current_stage = (date.today() - journey.stage_entry_date).days
            self.db.commit()
        
        return journey
    
    def analyze_tier_progression(
        self, 
        user_id: int, 
        client_id: int
    ) -> TierProgression:
        """Analyze client's tier progression potential"""
        
        score_components = self.calculate_client_score_components(user_id, client_id)
        client = self.db.query(Client).filter(Client.id == client_id).first()
        
        # Get current tier from value profile
        value_profile = self.db.query(SixFBClientValueProfile).filter(
            and_(
                SixFBClientValueProfile.user_id == user_id,
                SixFBClientValueProfile.client_id == client_id
            )
        ).first()
        
        current_tier = value_profile.value_tier if value_profile else ClientValueTier.DEVELOPING
        
        # Determine recommended tier based on score
        recommended_tier = self._score_to_tier(score_components.overall_score)
        
        # Analyze requirements
        requirements_met = []
        requirements_missing = []
        
        # Check tier-specific requirements
        if recommended_tier == ClientValueTier.PREMIUM_VIP:
            if client.total_spent >= 5000:
                requirements_met.append("High lifetime value ($5000+)")
            else:
                requirements_missing.append(f"Increase spending (current: ${client.total_spent})")
            
            if score_components.relationship_score >= 85:
                requirements_met.append("Excellent relationship quality")
            else:
                requirements_missing.append("Improve relationship engagement")
        
        elif recommended_tier == ClientValueTier.CORE_REGULAR:
            if client.total_visits >= 5:
                requirements_met.append("Regular visit pattern")
            else:
                requirements_missing.append("Establish visit consistency")
        
        # Estimate timeline for progression
        score_gap = self.tier_thresholds[recommended_tier] - score_components.overall_score
        estimated_timeline = int(score_gap * 7) if score_gap > 0 else 0  # Rough estimate: 1 week per point
        
        return TierProgression(
            current_tier=current_tier,
            recommended_tier=recommended_tier,
            progression_score=score_components.overall_score,
            requirements_met=requirements_met,
            requirements_missing=requirements_missing,
            estimated_timeline_days=estimated_timeline if estimated_timeline > 0 else None
        )
    
    # ============================================================================
    # COMMUNICATION AND ENGAGEMENT TRACKING
    # ============================================================================
    
    def record_communication(
        self,
        user_id: int,
        client_id: int,
        communication_type: CommunicationType,
        subject: Optional[str] = None,
        message_content: Optional[str] = None,
        touchpoint_type: Optional[TouchpointType] = None,
        automation_triggered: bool = False,
        **kwargs
    ) -> SixFBClientCommunication:
        """Record a client communication"""
        
        communication = SixFBClientCommunication(
            user_id=user_id,
            client_id=client_id,
            communication_type=communication_type,
            subject=subject,
            message_content=message_content,
            touchpoint_type=touchpoint_type,
            automation_triggered=automation_triggered,
            sent_at=datetime.utcnow(),
            **kwargs
        )
        
        self.db.add(communication)
        self.db.commit()
        self.db.refresh(communication)
        
        # Update communication profile stats
        self._update_communication_stats(user_id, client_id)
        
        return communication
    
    def record_engagement(
        self,
        user_id: int,
        client_id: int,
        engagement_type: EngagementType,
        engagement_value: float = 1.0,
        appointment_id: Optional[int] = None,
        **kwargs
    ) -> SixFBClientEngagementHistory:
        """Record a client engagement activity"""
        
        engagement = SixFBClientEngagementHistory(
            user_id=user_id,
            client_id=client_id,
            engagement_type=engagement_type,
            engagement_date=datetime.utcnow(),
            engagement_value=engagement_value,
            appointment_id=appointment_id,
            **kwargs
        )
        
        self.db.add(engagement)
        self.db.commit()
        self.db.refresh(engagement)
        
        # Update engagement metrics
        self._update_engagement_metrics(user_id, client_id)
        
        return engagement
    
    def analyze_churn_risk(
        self, 
        user_id: int, 
        client_id: int
    ) -> ChurnRiskAssessment:
        """Analyze client's churn risk and recommend interventions"""
        
        behavior_analytics = self.update_client_behavior_analytics(user_id, client_id)
        client = self.db.query(Client).filter(Client.id == client_id).first()
        
        if not client:
            raise UserError("Client not found")
        
        risk_score = behavior_analytics.churn_risk_score
        
        # Determine risk level
        if risk_score >= 80:
            risk_level = "critical"
        elif risk_score >= 60:
            risk_level = "high"
        elif risk_score >= 40:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Identify contributing factors
        contributing_factors = []
        if client.last_visit_date:
            days_since_visit = (date.today() - client.last_visit_date).days
            if days_since_visit > 60:
                contributing_factors.append(f"No visit in {days_since_visit} days")
        
        if client.no_show_count > 2:
            contributing_factors.append(f"Multiple no-shows ({client.no_show_count})")
        
        if client.cancellation_count > client.total_visits * 0.3:
            contributing_factors.append("High cancellation rate")
        
        # Recommend interventions
        interventions = []
        if risk_level in ["high", "critical"]:
            interventions.append("Personal outreach call from barber")
            interventions.append("Special offer or incentive")
            interventions.append("Feedback survey to understand issues")
        
        if days_since_visit > 90:
            interventions.append("Win-back campaign sequence")
        
        intervention_priority = "urgent" if risk_level == "critical" else risk_level
        
        return ChurnRiskAssessment(
            risk_score=risk_score,
            risk_level=risk_level,
            contributing_factors=contributing_factors,
            recommended_interventions=interventions,
            intervention_priority=intervention_priority
        )
    
    # ============================================================================
    # AUTOMATED WORKFLOWS
    # ============================================================================
    
    def create_automated_workflow(
        self,
        user_id: int,
        workflow_name: str,
        workflow_type: str,
        trigger_event: WorkflowTrigger,
        workflow_steps: List[Dict[str, Any]],
        methodology_principle: SixFBPrinciple,
        **kwargs
    ) -> SixFBAutomatedWorkflow:
        """Create a new automated workflow"""
        
        workflow = SixFBAutomatedWorkflow(
            user_id=user_id,
            workflow_name=workflow_name,
            workflow_type=workflow_type,
            trigger_event=trigger_event,
            workflow_steps=workflow_steps,
            methodology_principle=methodology_principle,
            **kwargs
        )
        
        self.db.add(workflow)
        self.db.commit()
        self.db.refresh(workflow)
        
        return workflow
    
    def execute_workflow(
        self,
        workflow_id: int,
        client_id: int,
        trigger_data: Optional[Dict[str, Any]] = None
    ) -> SixFBWorkflowExecution:
        """Execute an automated workflow for a client"""
        
        workflow = self.db.query(SixFBAutomatedWorkflow).filter(
            SixFBAutomatedWorkflow.id == workflow_id
        ).first()
        
        if not workflow or not workflow.is_active:
            raise UserError("Workflow not found or inactive")
        
        # Create execution record
        execution_id = f"exec_{workflow_id}_{client_id}_{int(datetime.utcnow().timestamp())}"
        
        execution = SixFBWorkflowExecution(
            workflow_id=workflow_id,
            user_id=workflow.user_id,
            client_id=client_id,
            execution_id=execution_id,
            started_at=datetime.utcnow(),
            trigger_event_data=trigger_data,
            trigger_timestamp=datetime.utcnow(),
            total_steps=len(workflow.workflow_steps),
            status="running"
        )
        
        self.db.add(execution)
        self.db.commit()
        
        try:
            # Execute workflow steps
            for step_index, step in enumerate(workflow.workflow_steps):
                execution.current_step = step_index
                self.db.commit()
                
                success = self._execute_workflow_step(execution, step)
                if not success:
                    execution.status = "failed"
                    break
            else:
                execution.status = "completed"
                execution.completed_at = datetime.utcnow()
            
            # Update workflow statistics
            workflow.total_executions += 1
            if execution.status == "completed":
                workflow.successful_executions += 1
            else:
                workflow.failed_executions += 1
            
            workflow.average_success_rate = (
                workflow.successful_executions / workflow.total_executions * 100
            )
            
            self.db.commit()
            self.db.refresh(execution)
            
        except Exception as e:
            execution.status = "failed"
            execution.error_details = {"error": str(e)}
            workflow.failed_executions += 1
            self.db.commit()
            logger.error(f"Workflow execution failed: {e}")
        
        return execution
    
    def trigger_workflows_for_event(
        self,
        user_id: int,
        trigger_event: WorkflowTrigger,
        client_id: Optional[int] = None,
        event_data: Optional[Dict[str, Any]] = None
    ) -> List[SixFBWorkflowExecution]:
        """Trigger all active workflows for a specific event"""
        
        workflows = self.db.query(SixFBAutomatedWorkflow).filter(
            and_(
                SixFBAutomatedWorkflow.user_id == user_id,
                SixFBAutomatedWorkflow.trigger_event == trigger_event,
                SixFBAutomatedWorkflow.is_active == True
            )
        ).all()
        
        executions = []
        
        for workflow in workflows:
            # Determine target clients
            if client_id:
                target_clients = [client_id]
            else:
                target_clients = self._get_workflow_target_clients(workflow)
            
            # Execute workflow for each target client
            for target_client_id in target_clients:
                try:
                    execution = self.execute_workflow(
                        workflow.id, 
                        target_client_id, 
                        event_data
                    )
                    executions.append(execution)
                except Exception as e:
                    logger.error(f"Failed to execute workflow {workflow.id} for client {target_client_id}: {e}")
        
        return executions
    
    # ============================================================================
    # ANALYTICS AND REPORTING
    # ============================================================================
    
    def generate_crm_analytics_summary(
        self,
        user_id: int,
        summary_date: Optional[date] = None,
        period: str = "daily"
    ) -> SixFBClientAnalyticsSummary:
        """Generate comprehensive CRM analytics summary"""
        
        if not summary_date:
            summary_date = date.today()
        
        # Check if summary already exists
        existing_summary = self.db.query(SixFBClientAnalyticsSummary).filter(
            and_(
                SixFBClientAnalyticsSummary.user_id == user_id,
                SixFBClientAnalyticsSummary.summary_date == summary_date,
                SixFBClientAnalyticsSummary.summary_period == period
            )
        ).first()
        
        if existing_summary:
            return existing_summary
        
        # Calculate date range based on period
        if period == "daily":
            start_date = summary_date
            end_date = summary_date
        elif period == "weekly":
            start_date = summary_date - timedelta(days=7)
            end_date = summary_date
        elif period == "monthly":
            start_date = summary_date - timedelta(days=30)
            end_date = summary_date
        else:
            start_date = summary_date - timedelta(days=90)
            end_date = summary_date
        
        # Calculate metrics
        summary = SixFBClientAnalyticsSummary(
            user_id=user_id,
            summary_date=summary_date,
            summary_period=period
        )
        
        # Client base metrics
        total_clients = self.db.query(Client).filter(
            Client.created_by_id == user_id
        ).count()
        summary.total_clients = total_clients
        
        # Value tier distribution
        tier_distribution = self._calculate_tier_distribution(user_id)
        summary.premium_vip_clients = tier_distribution.get(ClientValueTier.PREMIUM_VIP, 0)
        summary.core_regular_clients = tier_distribution.get(ClientValueTier.CORE_REGULAR, 0)
        summary.developing_clients = tier_distribution.get(ClientValueTier.DEVELOPING, 0)
        summary.occasional_clients = tier_distribution.get(ClientValueTier.OCCASIONAL, 0)
        summary.at_risk_clients = tier_distribution.get(ClientValueTier.AT_RISK, 0)
        
        # Financial metrics
        client_ltv_data = self._calculate_client_ltv_metrics(user_id)
        summary.total_client_lifetime_value = client_ltv_data["total_ltv"]
        summary.average_client_lifetime_value = client_ltv_data["average_ltv"]
        summary.revenue_per_client = client_ltv_data["revenue_per_client"]
        
        # Communication metrics
        comm_metrics = self._calculate_communication_metrics(user_id, start_date, end_date)
        summary.total_communications_sent = comm_metrics["total_sent"]
        summary.communication_effectiveness_score = comm_metrics["effectiveness_score"]
        
        # Risk metrics
        risk_metrics = self._calculate_risk_metrics(user_id)
        summary.average_churn_risk_score = risk_metrics["average_risk"]
        summary.clients_at_high_churn_risk = risk_metrics["high_risk_count"]
        
        # Save summary
        self.db.add(summary)
        self.db.commit()
        self.db.refresh(summary)
        
        return summary
    
    # ============================================================================
    # PRIVATE HELPER METHODS
    # ============================================================================
    
    def _calculate_churn_risk(self, client: Client, appointments: List[Appointment]) -> float:
        """Calculate client churn risk score (0-100)"""
        
        risk_score = 0.0
        
        # Days since last visit
        if client.last_visit_date:
            days_since_visit = (date.today() - client.last_visit_date).days
            if days_since_visit > 90:
                risk_score += 40
            elif days_since_visit > 60:
                risk_score += 25
            elif days_since_visit > 30:
                risk_score += 10
        else:
            risk_score += 30
        
        # No-show pattern
        if client.total_visits > 0:
            no_show_rate = client.no_show_count / client.total_visits
            risk_score += no_show_rate * 30
        
        # Cancellation pattern
        if client.total_visits > 0:
            cancellation_rate = client.cancellation_count / client.total_visits
            risk_score += cancellation_rate * 20
        
        # Declining visit frequency
        if len(appointments) >= 3:
            recent_intervals = []
            older_intervals = []
            
            mid_point = len(appointments) // 2
            for i in range(1, mid_point):
                interval = (appointments[i-1].start_time.date() - appointments[i].start_time.date()).days
                recent_intervals.append(interval)
            
            for i in range(mid_point + 1, len(appointments)):
                interval = (appointments[i-1].start_time.date() - appointments[i].start_time.date()).days
                older_intervals.append(interval)
            
            if recent_intervals and older_intervals:
                recent_avg = sum(recent_intervals) / len(recent_intervals)
                older_avg = sum(older_intervals) / len(older_intervals)
                
                if recent_avg > older_avg * 1.5:  # Visits becoming less frequent
                    risk_score += 10
        
        return min(risk_score, 100.0)
    
    def _calculate_upsell_receptivity(self, client: Client, appointments: List[Appointment]) -> float:
        """Calculate client's receptivity to upsells (0-100)"""
        
        receptivity_score = 50.0  # Baseline
        
        # Average ticket growth over time
        if len(appointments) >= 3:
            recent_tickets = [apt.total_amount for apt in appointments[:3] if apt.total_amount]
            older_tickets = [apt.total_amount for apt in appointments[-3:] if apt.total_amount]
            
            if recent_tickets and older_tickets:
                recent_avg = sum(recent_tickets) / len(recent_tickets)
                older_avg = sum(older_tickets) / len(older_tickets)
                
                if recent_avg > older_avg * 1.1:  # 10% increase
                    receptivity_score += 20
                elif recent_avg < older_avg * 0.9:  # 10% decrease
                    receptivity_score -= 10
        
        # Consistency in higher-value services
        high_value_appointments = [apt for apt in appointments if apt.total_amount and apt.total_amount > client.average_ticket * 1.2]
        if high_value_appointments:
            high_value_rate = len(high_value_appointments) / len(appointments)
            receptivity_score += high_value_rate * 30
        
        return min(max(receptivity_score, 0.0), 100.0)
    
    def _calculate_growth_potential(self, client: Client, appointments: List[Appointment]) -> float:
        """Calculate client's growth potential (0-100)"""
        
        growth_score = 50.0  # Baseline
        
        # Visit frequency trend
        if client.visit_frequency_days:
            if client.visit_frequency_days <= 21:  # Very frequent
                growth_score += 20
            elif client.visit_frequency_days <= 45:  # Regular
                growth_score += 10
            elif client.visit_frequency_days > 90:  # Infrequent
                growth_score -= 15
        
        # Spending trend
        if client.total_spent > 0 and client.total_visits > 0:
            avg_ticket = client.total_spent / client.total_visits
            # Compare to industry benchmark (assume $50)
            if avg_ticket >= 100:
                growth_score += 15
            elif avg_ticket >= 75:
                growth_score += 10
            elif avg_ticket < 30:
                growth_score -= 10
        
        # Relationship indicators
        if client.referral_count > 0:
            growth_score += 15
        
        if client.no_show_count == 0 and client.total_visits > 3:
            growth_score += 10
        
        return min(max(growth_score, 0.0), 100.0)
    
    def _determine_client_stage(self, client: Client, score_components: ClientScoreComponents) -> ClientStage:
        """Determine appropriate client stage based on metrics"""
        
        if client.total_visits == 0:
            return ClientStage.PROSPECT
        elif client.total_visits == 1:
            return ClientStage.FIRST_TIME_CLIENT
        elif client.total_visits <= 3:
            return ClientStage.CONVERTING_CLIENT
        elif score_components.overall_score >= 90:
            return ClientStage.VIP_CLIENT
        elif score_components.relationship_score >= 80 and client.referral_count > 0:
            return ClientStage.ADVOCATE_CLIENT
        elif score_components.overall_score >= 75:
            return ClientStage.LOYAL_CLIENT
        elif score_components.overall_score >= 50:
            return ClientStage.REGULAR_CLIENT
        elif score_components.overall_score < 30:
            return ClientStage.AT_RISK_CLIENT
        else:
            # Check for inactivity
            if client.last_visit_date:
                days_since_visit = (date.today() - client.last_visit_date).days
                if days_since_visit > 90:
                    return ClientStage.INACTIVE_CLIENT
            
            return ClientStage.REGULAR_CLIENT
    
    def _calculate_premium_readiness(self, score_components: ClientScoreComponents) -> float:
        """Calculate readiness for premium positioning (0-100)"""
        
        readiness_score = (
            score_components.relationship_score * 0.3 +
            score_components.value_score * 0.4 +
            score_components.engagement_score * 0.3
        )
        
        return min(readiness_score, 100.0)
    
    def _score_to_tier(self, score: float) -> ClientValueTier:
        """Convert overall score to appropriate value tier"""
        
        if score >= self.tier_thresholds[ClientValueTier.PREMIUM_VIP]:
            return ClientValueTier.PREMIUM_VIP
        elif score >= self.tier_thresholds[ClientValueTier.CORE_REGULAR]:
            return ClientValueTier.CORE_REGULAR
        elif score >= self.tier_thresholds[ClientValueTier.DEVELOPING]:
            return ClientValueTier.DEVELOPING
        elif score >= self.tier_thresholds[ClientValueTier.OCCASIONAL]:
            return ClientValueTier.OCCASIONAL
        else:
            return ClientValueTier.AT_RISK
    
    def _trigger_stage_transition_touchpoints(
        self, 
        user_id: int, 
        client_id: int, 
        new_stage: ClientStage
    ):
        """Trigger appropriate touchpoints for stage transitions"""
        
        stage_touchpoints = {
            ClientStage.FIRST_TIME_CLIENT: [TouchpointType.WELCOME_SEQUENCE],
            ClientStage.CONVERTING_CLIENT: [TouchpointType.REVIEW_REQUEST],
            ClientStage.REGULAR_CLIENT: [TouchpointType.LOYALTY_REWARD],
            ClientStage.LOYAL_CLIENT: [TouchpointType.REFERRAL_REQUEST],
            ClientStage.VIP_CLIENT: [TouchpointType.VIP_RECOGNITION],
            ClientStage.AT_RISK_CLIENT: [TouchpointType.RETENTION_CAMPAIGN]
        }
        
        touchpoints = stage_touchpoints.get(new_stage, [])
        
        for touchpoint_type in touchpoints:
            # Create touchpoint plan
            touchpoint = SixFBClientTouchpointPlan(
                user_id=user_id,
                client_id=client_id,
                touchpoint_type=touchpoint_type,
                touchpoint_name=f"Stage Transition: {new_stage.value}",
                planned_date=datetime.utcnow() + timedelta(hours=1),  # Schedule for 1 hour from now
                automation_workflow=True,
                relationship_building_objective=f"Support transition to {new_stage.value} stage"
            )
            
            self.db.add(touchpoint)
        
        if touchpoints:
            self.db.commit()
    
    def _execute_workflow_step(
        self, 
        execution: SixFBWorkflowExecution, 
        step: Dict[str, Any]
    ) -> bool:
        """Execute a single workflow step"""
        
        try:
            step_type = step.get("type")
            
            if step_type == "send_communication":
                return self._execute_communication_step(execution, step)
            elif step_type == "create_touchpoint":
                return self._execute_touchpoint_step(execution, step)
            elif step_type == "update_client_data":
                return self._execute_data_update_step(execution, step)
            elif step_type == "wait":
                return self._execute_wait_step(execution, step)
            else:
                logger.warning(f"Unknown workflow step type: {step_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error executing workflow step: {e}")
            return False
    
    def _execute_communication_step(
        self, 
        execution: SixFBWorkflowExecution, 
        step: Dict[str, Any]
    ) -> bool:
        """Execute a communication workflow step"""
        
        try:
            communication_type = CommunicationType(step.get("communication_type", "email"))
            subject = step.get("subject")
            message = step.get("message")
            
            communication = self.record_communication(
                user_id=execution.user_id,
                client_id=execution.client_id,
                communication_type=communication_type,
                subject=subject,
                message_content=message,
                automation_triggered=True,
                automation_workflow_id=execution.execution_id
            )
            
            # Track in execution
            if not execution.completed_steps:
                execution.completed_steps = []
            execution.completed_steps.append({
                "step_type": "send_communication",
                "communication_id": communication.id,
                "completed_at": datetime.utcnow().isoformat()
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to execute communication step: {e}")
            return False
    
    def _execute_touchpoint_step(
        self, 
        execution: SixFBWorkflowExecution, 
        step: Dict[str, Any]
    ) -> bool:
        """Execute a touchpoint creation workflow step"""
        
        try:
            touchpoint_type = TouchpointType(step.get("touchpoint_type"))
            touchpoint_name = step.get("name")
            scheduled_delay_hours = step.get("delay_hours", 0)
            
            touchpoint = SixFBClientTouchpointPlan(
                user_id=execution.user_id,
                client_id=execution.client_id,
                touchpoint_type=touchpoint_type,
                touchpoint_name=touchpoint_name,
                planned_date=datetime.utcnow() + timedelta(hours=scheduled_delay_hours),
                automation_workflow=True,
                relationship_building_objective=step.get("objective")
            )
            
            self.db.add(touchpoint)
            self.db.commit()
            
            # Track in execution
            if not execution.completed_steps:
                execution.completed_steps = []
            execution.completed_steps.append({
                "step_type": "create_touchpoint",
                "touchpoint_id": touchpoint.id,
                "completed_at": datetime.utcnow().isoformat()
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to execute touchpoint step: {e}")
            return False
    
    def _execute_data_update_step(
        self, 
        execution: SixFBWorkflowExecution, 
        step: Dict[str, Any]
    ) -> bool:
        """Execute a data update workflow step"""
        
        try:
            # Update client engagement or profile data
            updates = step.get("updates", {})
            
            for field, value in updates.items():
                if field == "engagement_score":
                    self.record_engagement(
                        user_id=execution.user_id,
                        client_id=execution.client_id,
                        engagement_type=EngagementType.WORKFLOW_COMPLETION,
                        engagement_value=value
                    )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to execute data update step: {e}")
            return False
    
    def _execute_wait_step(
        self, 
        execution: SixFBWorkflowExecution, 
        step: Dict[str, Any]
    ) -> bool:
        """Execute a wait workflow step (placeholder for scheduling)"""
        
        # In a production system, this would schedule the next step
        # For now, we'll just log the wait duration
        wait_duration = step.get("duration_hours", 24)
        logger.info(f"Workflow step waiting {wait_duration} hours")
        
        return True
    
    def _update_communication_stats(self, user_id: int, client_id: int):
        """Update communication profile statistics"""
        
        profile = self.get_or_create_communication_profile(user_id, client_id)
        
        # Count total communications
        total_sent = self.db.query(SixFBClientCommunication).filter(
            and_(
                SixFBClientCommunication.user_id == user_id,
                SixFBClientCommunication.client_id == client_id
            )
        ).count()
        
        # Count responses
        total_responded = self.db.query(SixFBClientCommunication).filter(
            and_(
                SixFBClientCommunication.user_id == user_id,
                SixFBClientCommunication.client_id == client_id,
                SixFBClientCommunication.responded_at.isnot(None)
            )
        ).count()
        
        profile.total_communications_sent = total_sent
        profile.total_communications_responded = total_responded
        profile.response_rate = (total_responded / total_sent * 100) if total_sent > 0 else 0
        
        self.db.commit()
    
    def _update_engagement_metrics(self, user_id: int, client_id: int):
        """Update engagement metrics for a client"""
        
        # Calculate engagement score based on recent activities
        recent_engagements = self.db.query(SixFBClientEngagementHistory).filter(
            and_(
                SixFBClientEngagementHistory.user_id == user_id,
                SixFBClientEngagementHistory.client_id == client_id,
                SixFBClientEngagementHistory.engagement_date >= datetime.utcnow() - timedelta(days=30)
            )
        ).all()
        
        if recent_engagements:
            avg_engagement_value = sum(e.engagement_value for e in recent_engagements) / len(recent_engagements)
            engagement_frequency = len(recent_engagements) / 30  # Engagements per day
            
            # Update communication profile
            profile = self.get_or_create_communication_profile(user_id, client_id)
            profile.engagement_score = min(avg_engagement_value * engagement_frequency * 10, 100)
            self.db.commit()
    
    def _get_workflow_target_clients(self, workflow: SixFBAutomatedWorkflow) -> List[int]:
        """Get list of client IDs that match workflow target criteria"""
        
        # Basic implementation - in production, this would be more sophisticated
        query = self.db.query(Client.id).filter(Client.created_by_id == workflow.user_id)
        
        if workflow.target_client_criteria:
            criteria = workflow.target_client_criteria
            
            if "min_visits" in criteria:
                query = query.filter(Client.total_visits >= criteria["min_visits"])
            
            if "max_days_since_visit" in criteria:
                cutoff_date = date.today() - timedelta(days=criteria["max_days_since_visit"])
                query = query.filter(Client.last_visit_date >= cutoff_date)
        
        return [client_id for client_id, in query.all()]
    
    def _calculate_tier_distribution(self, user_id: int) -> Dict[ClientValueTier, int]:
        """Calculate distribution of clients across value tiers"""
        
        distribution = {}
        
        for tier in ClientValueTier:
            count = self.db.query(SixFBClientValueProfile).filter(
                and_(
                    SixFBClientValueProfile.user_id == user_id,
                    SixFBClientValueProfile.value_tier == tier
                )
            ).count()
            distribution[tier] = count
        
        return distribution
    
    def _calculate_client_ltv_metrics(self, user_id: int) -> Dict[str, Any]:
        """Calculate client lifetime value metrics"""
        
        clients = self.db.query(Client).filter(Client.created_by_id == user_id).all()
        
        if not clients:
            return {
                "total_ltv": Decimal("0"),
                "average_ltv": Decimal("0"),
                "revenue_per_client": Decimal("0")
            }
        
        total_ltv = sum(client.total_spent for client in clients)
        average_ltv = total_ltv / len(clients)
        revenue_per_client = average_ltv  # Simplified calculation
        
        return {
            "total_ltv": Decimal(str(total_ltv)),
            "average_ltv": Decimal(str(average_ltv)),
            "revenue_per_client": Decimal(str(revenue_per_client))
        }
    
    def _calculate_communication_metrics(
        self, 
        user_id: int, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, Any]:
        """Calculate communication effectiveness metrics"""
        
        communications = self.db.query(SixFBClientCommunication).filter(
            and_(
                SixFBClientCommunication.user_id == user_id,
                SixFBClientCommunication.sent_at >= start_date,
                SixFBClientCommunication.sent_at <= end_date
            )
        ).all()
        
        total_sent = len(communications)
        total_responded = sum(1 for c in communications if c.responded_at)
        
        effectiveness_score = (total_responded / total_sent * 100) if total_sent > 0 else 0
        
        return {
            "total_sent": total_sent,
            "effectiveness_score": effectiveness_score
        }
    
    def _calculate_risk_metrics(self, user_id: int) -> Dict[str, Any]:
        """Calculate client risk metrics"""
        
        behavior_analytics = self.db.query(SixFBClientBehaviorAnalytics).filter(
            SixFBClientBehaviorAnalytics.user_id == user_id
        ).all()
        
        if not behavior_analytics:
            return {
                "average_risk": 0.0,
                "high_risk_count": 0
            }
        
        risk_scores = [b.churn_risk_score for b in behavior_analytics if b.churn_risk_score]
        average_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        high_risk_count = sum(1 for score in risk_scores if score >= 60)
        
        return {
            "average_risk": average_risk,
            "high_risk_count": high_risk_count
        }