"""
Client Lifecycle Service
Provides Six Figure Barber methodology-based client relationship management and lifecycle tracking.
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum
import logging
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models import Client, Appointment

logger = logging.getLogger(__name__)

class ClientTier(Enum):
    PLATINUM = "platinum"  # $500+ lifetime value
    GOLD = "gold"          # $200-499 lifetime value
    SILVER = "silver"      # $100-199 lifetime value
    BRONZE = "bronze"      # $0-99 lifetime value

class LifecycleStage(Enum):
    NEW_CLIENT = "new_client"                    # First 30 days
    DEVELOPING_RELATIONSHIP = "developing"        # 30-90 days
    ESTABLISHED_CLIENT = "established"           # 90+ days, regular visits
    VIP_CLIENT = "vip"                          # High value, frequent visits
    AT_RISK = "at_risk"                         # Long absence, declining frequency
    DORMANT = "dormant"                         # No visits >90 days

@dataclass
class ClientLifecycleMilestone:
    """Client relationship milestone with Six Figure Barber methodology"""
    client_id: int
    client_name: str
    milestone_type: str
    milestone_date: datetime
    description: str
    six_fb_principle: str
    action_required: str
    priority: str  # 'high', 'medium', 'low'
    expected_impact: str
    follow_up_date: Optional[datetime] = None

@dataclass
class ClientRelationshipInsight:
    """AI-powered client relationship insight"""
    client_id: int
    insight_type: str
    confidence: float
    recommendation: str
    six_fb_methodology: str
    expected_revenue_impact: float
    implementation_difficulty: str

@dataclass
class ClientLifecycleAnalysis:
    """Comprehensive client lifecycle analysis"""
    client_id: int
    client_name: str
    current_tier: ClientTier
    lifecycle_stage: LifecycleStage
    days_since_first_visit: int
    days_since_last_visit: int
    total_visits: int
    total_spent: float
    average_ticket: float
    visit_frequency: float  # visits per month
    relationship_score: float  # 0-100
    churn_risk: float  # 0-100
    upsell_potential: float  # 0-100
    milestones: List[ClientLifecycleMilestone]
    insights: List[ClientRelationshipInsight]

class ClientLifecycleService:
    """
    Service for managing client lifecycle and relationship intelligence
    based on Six Figure Barber methodology.
    """
    
    # Six Figure Barber tier thresholds
    TIER_THRESHOLDS = {
        ClientTier.PLATINUM: 500,
        ClientTier.GOLD: 200,
        ClientTier.SILVER: 100,
        ClientTier.BRONZE: 0
    }
    
    # Lifecycle stage criteria
    LIFECYCLE_CRITERIA = {
        LifecycleStage.NEW_CLIENT: {"max_days": 30, "min_visits": 1},
        LifecycleStage.DEVELOPING_RELATIONSHIP: {"max_days": 90, "min_visits": 2},
        LifecycleStage.ESTABLISHED_CLIENT: {"min_days": 90, "min_visits": 3, "max_absence": 60},
        LifecycleStage.VIP_CLIENT: {"min_spent": 300, "min_frequency": 1.5},
        LifecycleStage.AT_RISK: {"min_absence": 60, "max_absence": 90, "min_visits": 2},
        LifecycleStage.DORMANT: {"min_absence": 90}
    }

    def __init__(self):
        self.six_figure_target = 100000
        self.monthly_target = self.six_figure_target / 12

    def analyze_client_lifecycle(self, db: Session, client_id: int) -> ClientLifecycleAnalysis:
        """
        Perform comprehensive client lifecycle analysis.
        
        Args:
            db: Database session
            client_id: ID of the client to analyze
            
        Returns:
            Complete lifecycle analysis with insights and milestones
        """
        try:
            # Get client and appointments
            client = db.query(Client).filter(Client.id == client_id).first()
            if not client:
                raise ValueError(f"Client {client_id} not found")
            
            appointments = db.query(Appointment).filter(
                Appointment.client_id == client_id
            ).order_by(Appointment.start_time.desc()).all()
            
            if not appointments:
                # Handle new client with no appointments yet
                return self._create_new_client_analysis(client)
            
            # Calculate basic metrics
            total_visits = len(appointments)
            total_spent = sum(apt.service_price or 0 for apt in appointments)
            average_ticket = total_spent / total_visits if total_visits > 0 else 0
            
            # Date calculations
            first_visit = min(apt.start_time for apt in appointments)
            last_visit = max(apt.start_time for apt in appointments)
            today = datetime.now()
            
            days_since_first_visit = (today - first_visit).days
            days_since_last_visit = (today - last_visit).days
            
            # Visit frequency (visits per month)
            months_active = max((today - first_visit).days / 30, 1)
            visit_frequency = total_visits / months_active
            
            # Determine tier and lifecycle stage
            current_tier = self._determine_client_tier(total_spent)
            lifecycle_stage = self._determine_lifecycle_stage(
                days_since_first_visit, days_since_last_visit, 
                total_visits, total_spent, visit_frequency
            )
            
            # Calculate relationship metrics
            relationship_score = self._calculate_relationship_score(
                visit_frequency, average_ticket, days_since_last_visit, total_visits
            )
            churn_risk = self._calculate_churn_risk(
                days_since_last_visit, visit_frequency, lifecycle_stage
            )
            upsell_potential = self._calculate_upsell_potential(
                current_tier, average_ticket, visit_frequency
            )
            
            # Generate milestones and insights
            milestones = self._generate_client_milestones(
                client, appointments, current_tier, lifecycle_stage
            )
            insights = self._generate_relationship_insights(
                client, current_tier, lifecycle_stage, relationship_score,
                churn_risk, upsell_potential
            )
            
            return ClientLifecycleAnalysis(
                client_id=client_id,
                client_name=f"{client.first_name} {client.last_name}",
                current_tier=current_tier,
                lifecycle_stage=lifecycle_stage,
                days_since_first_visit=days_since_first_visit,
                days_since_last_visit=days_since_last_visit,
                total_visits=total_visits,
                total_spent=total_spent,
                average_ticket=average_ticket,
                visit_frequency=visit_frequency,
                relationship_score=relationship_score,
                churn_risk=churn_risk,
                upsell_potential=upsell_potential,
                milestones=milestones,
                insights=insights
            )
            
        except Exception as e:
            logger.error(f"Error analyzing client lifecycle for {client_id}: {str(e)}")
            raise

    def get_calendar_client_insights(self, db: Session, barber_id: int, 
                                   start_date: date, end_date: date) -> List[Dict]:
        """
        Get client lifecycle insights for calendar integration.
        
        Args:
            db: Database session
            barber_id: ID of the barber
            start_date: Start date for analysis
            end_date: End date for analysis
            
        Returns:
            List of client insights for calendar display
        """
        try:
            # Get appointments in date range
            appointments = db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date
                )
            ).all()
            
            client_insights = []
            processed_clients = set()
            
            for appointment in appointments:
                if appointment.client_id and appointment.client_id not in processed_clients:
                    try:
                        analysis = self.analyze_client_lifecycle(db, appointment.client_id)
                        
                        # Create calendar-friendly insight
                        client_insights.append({
                            'client_id': appointment.client_id,
                            'client_name': analysis.client_name,
                            'client_tier': analysis.current_tier.value,
                            'lifecycle_stage': analysis.lifecycle_stage.value,
                            'relationship_score': analysis.relationship_score,
                            'churn_risk': analysis.churn_risk,
                            'priority_milestones': [
                                {
                                    'type': ms.milestone_type,
                                    'description': ms.description,
                                    'action': ms.action_required,
                                    'priority': ms.priority
                                }
                                for ms in analysis.milestones[:3]  # Top 3 milestones
                            ],
                            'key_insights': [
                                {
                                    'type': ins.insight_type,
                                    'recommendation': ins.recommendation,
                                    'confidence': ins.confidence
                                }
                                for ins in analysis.insights[:2]  # Top 2 insights
                            ]
                        })
                        
                        processed_clients.add(appointment.client_id)
                        
                    except Exception as e:
                        logger.warning(f"Error analyzing client {appointment.client_id}: {str(e)}")
                        continue
            
            # Sort by relationship score (highest first)
            client_insights.sort(key=lambda x: x['relationship_score'], reverse=True)
            
            return client_insights
            
        except Exception as e:
            logger.error(f"Error getting calendar client insights: {str(e)}")
            return []

    def _create_new_client_analysis(self, client: Client) -> ClientLifecycleAnalysis:
        """Create analysis for new client with no appointments"""
        return ClientLifecycleAnalysis(
            client_id=client.id,
            client_name=f"{client.first_name} {client.last_name}",
            current_tier=ClientTier.BRONZE,
            lifecycle_stage=LifecycleStage.NEW_CLIENT,
            days_since_first_visit=0,
            days_since_last_visit=0,
            total_visits=0,
            total_spent=0.0,
            average_ticket=0.0,
            visit_frequency=0.0,
            relationship_score=50.0,  # Neutral starting score
            churn_risk=0.0,
            upsell_potential=80.0,  # High potential for new clients
            milestones=[],
            insights=[]
        )

    def _determine_client_tier(self, total_spent: float) -> ClientTier:
        """Determine client tier based on lifetime spending"""
        if total_spent >= self.TIER_THRESHOLDS[ClientTier.PLATINUM]:
            return ClientTier.PLATINUM
        elif total_spent >= self.TIER_THRESHOLDS[ClientTier.GOLD]:
            return ClientTier.GOLD
        elif total_spent >= self.TIER_THRESHOLDS[ClientTier.SILVER]:
            return ClientTier.SILVER
        else:
            return ClientTier.BRONZE

    def _determine_lifecycle_stage(self, days_since_first: int, days_since_last: int,
                                 total_visits: int, total_spent: float,
                                 visit_frequency: float) -> LifecycleStage:
        """Determine client lifecycle stage based on behavior patterns"""
        
        # Dormant clients (no visits in 90+ days)
        if days_since_last >= self.LIFECYCLE_CRITERIA[LifecycleStage.DORMANT]['min_absence']:
            return LifecycleStage.DORMANT
        
        # At-risk clients (60-90 days absence)
        if (days_since_last >= self.LIFECYCLE_CRITERIA[LifecycleStage.AT_RISK]['min_absence'] and
            days_since_last < self.LIFECYCLE_CRITERIA[LifecycleStage.AT_RISK]['max_absence'] and
            total_visits >= self.LIFECYCLE_CRITERIA[LifecycleStage.AT_RISK]['min_visits']):
            return LifecycleStage.AT_RISK
        
        # VIP clients (high value and frequency)
        if (total_spent >= self.LIFECYCLE_CRITERIA[LifecycleStage.VIP_CLIENT]['min_spent'] and
            visit_frequency >= self.LIFECYCLE_CRITERIA[LifecycleStage.VIP_CLIENT]['min_frequency']):
            return LifecycleStage.VIP_CLIENT
        
        # Established clients (90+ days, regular visits)
        if (days_since_first >= self.LIFECYCLE_CRITERIA[LifecycleStage.ESTABLISHED_CLIENT]['min_days'] and
            total_visits >= self.LIFECYCLE_CRITERIA[LifecycleStage.ESTABLISHED_CLIENT]['min_visits'] and
            days_since_last <= self.LIFECYCLE_CRITERIA[LifecycleStage.ESTABLISHED_CLIENT]['max_absence']):
            return LifecycleStage.ESTABLISHED_CLIENT
        
        # Developing relationship (30-90 days)
        if (days_since_first <= self.LIFECYCLE_CRITERIA[LifecycleStage.DEVELOPING_RELATIONSHIP]['max_days'] and
            total_visits >= self.LIFECYCLE_CRITERIA[LifecycleStage.DEVELOPING_RELATIONSHIP]['min_visits']):
            return LifecycleStage.DEVELOPING_RELATIONSHIP
        
        # New client (first 30 days)
        return LifecycleStage.NEW_CLIENT

    def _calculate_relationship_score(self, visit_frequency: float, average_ticket: float,
                                    days_since_last: int, total_visits: int) -> float:
        """Calculate relationship strength score (0-100)"""
        score = 50.0  # Base score
        
        # Frequency bonus (0-25 points)
        frequency_score = min(visit_frequency * 10, 25)
        score += frequency_score
        
        # Ticket value bonus (0-15 points)
        ticket_score = min(average_ticket / 10, 15)
        score += ticket_score
        
        # Recency penalty (0-30 points deduction)
        recency_penalty = min(days_since_last / 2, 30)
        score -= recency_penalty
        
        # Loyalty bonus (0-10 points)
        loyalty_bonus = min(total_visits, 10)
        score += loyalty_bonus
        
        return max(0, min(100, score))

    def _calculate_churn_risk(self, days_since_last: int, visit_frequency: float,
                            lifecycle_stage: LifecycleStage) -> float:
        """Calculate churn risk percentage (0-100)"""
        risk = 0.0
        
        # Base risk by lifecycle stage
        stage_risk = {
            LifecycleStage.DORMANT: 90,
            LifecycleStage.AT_RISK: 70,
            LifecycleStage.NEW_CLIENT: 40,
            LifecycleStage.DEVELOPING_RELATIONSHIP: 30,
            LifecycleStage.ESTABLISHED_CLIENT: 15,
            LifecycleStage.VIP_CLIENT: 5
        }
        risk = stage_risk.get(lifecycle_stage, 25)
        
        # Adjust for recency
        if days_since_last > 30:
            risk += (days_since_last - 30) * 0.5
        
        # Adjust for frequency
        if visit_frequency < 0.5:  # Less than 0.5 visits per month
            risk += 20
        elif visit_frequency > 2:  # More than 2 visits per month
            risk -= 15
        
        return max(0, min(100, risk))

    def _calculate_upsell_potential(self, tier: ClientTier, average_ticket: float,
                                  visit_frequency: float) -> float:
        """Calculate upselling potential (0-100)"""
        potential = 30.0  # Base potential
        
        # Tier-based potential
        tier_potential = {
            ClientTier.BRONZE: 40,
            ClientTier.SILVER: 30,
            ClientTier.GOLD: 20,
            ClientTier.PLATINUM: 10
        }
        potential += tier_potential.get(tier, 30)
        
        # Frequency bonus (loyal clients more likely to upsell)
        if visit_frequency > 1:
            potential += 20
        
        # Ticket value consideration
        if average_ticket < 60:  # Below premium pricing
            potential += 25
        elif average_ticket > 120:  # Already premium
            potential -= 15
        
        return max(0, min(100, potential))

    def _generate_client_milestones(self, client: Client, appointments: List[Appointment],
                                  tier: ClientTier, stage: LifecycleStage) -> List[ClientLifecycleMilestone]:
        """Generate client milestones based on Six Figure Barber methodology"""
        milestones = []
        today = datetime.now()
        
        # First visit milestone
        if len(appointments) == 1 and stage == LifecycleStage.NEW_CLIENT:
            milestones.append(ClientLifecycleMilestone(
                client_id=client.id,
                client_name=f"{client.first_name} {client.last_name}",
                milestone_type="first_visit_experience",
                milestone_date=appointments[0].start_time,
                description="First visit - set the foundation for a six-figure relationship",
                six_fb_principle="First impressions create lifetime clients. Exceptional first visits generate referrals and loyalty.",
                action_required="Exceed expectations, collect preferences, schedule next visit",
                priority="high",
                expected_impact="Client retention and referral generation",
                follow_up_date=today + timedelta(days=3)
            ))
        
        # Tier upgrade milestone
        total_spent = sum(apt.service_price or 0 for apt in appointments)
        if tier == ClientTier.SILVER and total_spent >= 180:
            milestones.append(ClientLifecycleMilestone(
                client_id=client.id,
                client_name=f"{client.first_name} {client.last_name}",
                milestone_type="tier_upgrade_opportunity",
                milestone_date=today,
                description=f"Qualifies for Gold tier upgrade (${total_spent:.0f} invested)",
                six_fb_principle="Tier recognition strengthens loyalty and encourages continued premium investment.",
                action_required="Acknowledge milestone, offer tier benefits, provide VIP treatment",
                priority="medium",
                expected_impact="Increased loyalty and average ticket value"
            ))
        
        # At-risk intervention
        if stage == LifecycleStage.AT_RISK:
            last_visit = max(apt.start_time for apt in appointments)
            days_absent = (today - last_visit).days
            milestones.append(ClientLifecycleMilestone(
                client_id=client.id,
                client_name=f"{client.first_name} {client.last_name}",
                milestone_type="retention_intervention",
                milestone_date=today,
                description=f"At-risk client ({days_absent} days since last visit)",
                six_fb_principle="Proactive retention is more profitable than new client acquisition.",
                action_required="Personal outreach, feedback request, re-engagement offer",
                priority="high",
                expected_impact="Client retention and relationship recovery",
                follow_up_date=today + timedelta(days=1)
            ))
        
        # Loyalty celebration
        if len(appointments) > 0 and len(appointments) % 5 == 0 and len(appointments) >= 5:
            milestones.append(ClientLifecycleMilestone(
                client_id=client.id,
                client_name=f"{client.first_name} {client.last_name}",
                milestone_type="loyalty_celebration",
                milestone_date=today,
                description=f"Celebrate {len(appointments)} visit milestone",
                six_fb_principle="Milestone celebrations strengthen emotional connections and loyalty.",
                action_required="Acknowledge milestone, express gratitude, offer special recognition",
                priority="medium",
                expected_impact="Increased loyalty and word-of-mouth referrals"
            ))
        
        return milestones

    def _generate_relationship_insights(self, client: Client, tier: ClientTier,
                                      stage: LifecycleStage, relationship_score: float,
                                      churn_risk: float, upsell_potential: float) -> List[ClientRelationshipInsight]:
        """Generate AI-powered relationship insights"""
        insights = []
        
        # High upsell potential insight
        if upsell_potential > 70:
            insights.append(ClientRelationshipInsight(
                client_id=client.id,
                insight_type="upsell_opportunity",
                confidence=upsell_potential / 100,
                recommendation="Focus on premium service offerings and value-added experiences",
                six_fb_methodology="Price based on value, not time. Premium clients appreciate premium experiences.",
                expected_revenue_impact=50.0,
                implementation_difficulty="easy"
            ))
        
        # Churn risk insight
        if churn_risk > 50:
            insights.append(ClientRelationshipInsight(
                client_id=client.id,
                insight_type="retention_risk",
                confidence=churn_risk / 100,
                recommendation="Implement immediate re-engagement strategy with personal touch",
                six_fb_methodology="Client relationships are your most valuable asset. Proactive retention prevents loss.",
                expected_revenue_impact=-200.0,  # Negative impact if lost
                implementation_difficulty="medium"
            ))
        
        # VIP development insight
        if tier in [ClientTier.GOLD, ClientTier.SILVER] and relationship_score > 75:
            insights.append(ClientRelationshipInsight(
                client_id=client.id,
                insight_type="vip_development",
                confidence=0.8,
                recommendation="Develop VIP relationship with exclusive benefits and personal attention",
                six_fb_methodology="VIP clients generate the highest lifetime value and most referrals.",
                expected_revenue_impact=150.0,
                implementation_difficulty="medium"
            ))
        
        return insights
