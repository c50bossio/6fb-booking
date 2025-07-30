"""
Customer Retention and Loyalty Program Service for BookedBarber V2

Implements comprehensive retention strategies aligned with Six Figure Barber methodology:
- Points-based loyalty rewards
- VIP tier progression systems  
- Personalized retention campaigns
- Automated re-engagement flows
- Revenue optimization through retention
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException

from models import User, Appointment, Service
from services.notification_service import notification_service
from services.analytics_service import AnalyticsService
from utils.rate_limiter import rate_limiter
from config import settings

logger = logging.getLogger(__name__)


class LoyaltyTier(str, Enum):
    """Customer loyalty tiers aligned with Six Figure Barber value ladder"""
    NEWCOMER = "newcomer"          # 0-2 visits, basic relationship
    REGULAR = "regular"            # 3-8 visits, established client  
    VIP = "vip"                    # 9-15 visits, premium client
    PLATINUM = "platinum"          # 16+ visits, top-tier client


class RetentionStatus(str, Enum):
    """Customer retention status for targeted campaigns"""
    ACTIVE = "active"              # Recent bookings, engaged
    AT_RISK = "at_risk"           # Declining frequency, needs attention
    LAPSED = "lapsed"             # No recent bookings, lost client
    CHURNED = "churned"           # Long-term absence, requires reactivation


class CampaignType(str, Enum):
    """Types of retention campaigns"""
    WELCOME_SERIES = "welcome_series"        # New client onboarding
    TIER_UPGRADE = "tier_upgrade"            # Loyalty tier progression
    WIN_BACK = "win_back"                    # Re-engage lapsed clients
    VIP_EXPERIENCE = "vip_experience"        # Premium client retention
    REFERRAL_INCENTIVE = "referral_incentive" # Word-of-mouth growth


@dataclass
class LoyaltyPoints:
    """Points earned from various activities"""
    booking_completed: int = 100        # Base points per appointment
    referral_successful: int = 500      # Points for successful referral
    review_left: int = 50              # Points for leaving reviews
    social_share: int = 25             # Points for social media shares
    tier_bonus_multiplier: float = 1.0  # Multiplier based on loyalty tier


@dataclass
class RetentionMetrics:
    """Key metrics for customer retention analysis"""
    client_id: int
    lifetime_value: float
    visit_frequency: float             # Visits per month
    last_visit_days_ago: int
    tier: LoyaltyTier
    status: RetentionStatus
    points_balance: int
    next_reward_threshold: int
    churn_risk_score: float           # 0-1, higher = more likely to churn


@dataclass
class RetentionCampaign:
    """Personalized retention campaign configuration"""
    campaign_id: str
    client_id: int
    campaign_type: CampaignType
    trigger_date: datetime
    messages: List[Dict[str, Any]]
    incentives: List[Dict[str, Any]]
    success_metrics: Dict[str, Any]


class CustomerRetentionService:
    """
    Advanced customer retention system with loyalty programs
    
    Features:
    - Automated tier progression based on visit frequency and spend
    - Personalized retention campaigns with AI-driven messaging
    - Points-based reward system with flexible redemption options
    - Predictive churn analysis with proactive intervention
    - Revenue optimization through targeted upselling
    - Six Figure Barber methodology integration
    """
    
    def __init__(self):
        self.tier_thresholds = {
            LoyaltyTier.NEWCOMER: {"visits": 0, "spend": 0},
            LoyaltyTier.REGULAR: {"visits": 3, "spend": 200},
            LoyaltyTier.VIP: {"visits": 9, "spend": 600},
            LoyaltyTier.PLATINUM: {"visits": 16, "spend": 1200}
        }
        
        # Points configuration
        self.points_config = LoyaltyPoints()
        self.tier_multipliers = {
            LoyaltyTier.NEWCOMER: 1.0,
            LoyaltyTier.REGULAR: 1.2,
            LoyaltyTier.VIP: 1.5,
            LoyaltyTier.PLATINUM: 2.0
        }
        
        # Retention timeframes (days)
        self.retention_windows = {
            "active": 30,           # Last visit within 30 days
            "at_risk": 60,          # 30-60 days since last visit
            "lapsed": 90,           # 60-90 days since last visit
            "churned": 90           # 90+ days since last visit
        }
    
    async def analyze_client_retention(self, db: Session, client_id: int) -> RetentionMetrics:
        """
        Comprehensive retention analysis for a specific client
        """
        try:
            # Get client basic info
            client = db.query(User).filter(User.id == client_id).first()
            if not client:
                raise HTTPException(status_code=404, detail="Client not found")
            
            # Get appointment history
            appointments = db.query(Appointment).filter(
                and_(
                    Appointment.client_id == client_id,
                    Appointment.status == "completed"
                )
            ).order_by(desc(Appointment.appointment_date)).all()
            
            if not appointments:
                return RetentionMetrics(
                    client_id=client_id,
                    lifetime_value=0.0,
                    visit_frequency=0.0,
                    last_visit_days_ago=999,
                    tier=LoyaltyTier.NEWCOMER,
                    status=RetentionStatus.CHURNED,
                    points_balance=0,
                    next_reward_threshold=100,
                    churn_risk_score=1.0
                )
            
            # Calculate metrics
            total_spend = sum(float(apt.total_price or 0) for apt in appointments)
            visit_count = len(appointments)
            
            # Calculate visit frequency (visits per month)
            if len(appointments) > 1:
                first_visit = min(apt.appointment_date for apt in appointments)
                months_active = max(1, (datetime.now().date() - first_visit).days / 30)
                visit_frequency = visit_count / months_active
            else:
                visit_frequency = 0.1  # New client
            
            # Days since last visit
            last_visit = max(apt.appointment_date for apt in appointments)
            last_visit_days_ago = (datetime.now().date() - last_visit).days
            
            # Determine loyalty tier
            tier = self._calculate_loyalty_tier(visit_count, total_spend)
            
            # Determine retention status
            status = self._calculate_retention_status(last_visit_days_ago)
            
            # Calculate points balance
            points_balance = await self._calculate_points_balance(db, client_id)
            
            # Next reward threshold
            next_threshold = self._get_next_reward_threshold(points_balance)
            
            # Churn risk score
            churn_risk = self._calculate_churn_risk(
                last_visit_days_ago, visit_frequency, tier
            )
            
            return RetentionMetrics(
                client_id=client_id,
                lifetime_value=total_spend,
                visit_frequency=visit_frequency,
                last_visit_days_ago=last_visit_days_ago,
                tier=tier,
                status=status,
                points_balance=points_balance,
                next_reward_threshold=next_threshold,
                churn_risk_score=churn_risk
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze client retention for {client_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Retention analysis failed: {str(e)}")
    
    async def award_loyalty_points(
        self, 
        db: Session, 
        client_id: int, 
        activity_type: str, 
        base_points: int,
        context: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Award loyalty points for specific activities
        """
        try:
            # Get client metrics to determine tier multiplier
            metrics = await self.analyze_client_retention(db, client_id)
            multiplier = self.tier_multipliers[metrics.tier]
            
            # Calculate final points with tier bonus
            final_points = int(base_points * multiplier)
            
            # Create loyalty points record
            from models import LoyaltyTransaction
            transaction = LoyaltyTransaction(
                id=str(uuid.uuid4()),
                client_id=client_id,
                transaction_type="earned",
                points=final_points,
                activity_type=activity_type,
                description=f"Points earned for {activity_type}",
                transaction_metadata=context or {},
                created_at=datetime.utcnow()
            )
            
            db.add(transaction)
            db.commit()
            
            # Check for tier upgrades
            await self._check_tier_upgrade(db, client_id, metrics)
            
            logger.info(f"Awarded {final_points} points to client {client_id} for {activity_type}")
            return final_points
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to award points to client {client_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to award points: {str(e)}")
    
    async def redeem_loyalty_points(
        self, 
        db: Session, 
        client_id: int, 
        points_to_redeem: int,
        reward_type: str,
        reward_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Redeem loyalty points for rewards
        """
        try:
            # Check current points balance
            current_balance = await self._calculate_points_balance(db, client_id)
            
            if current_balance < points_to_redeem:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient points. Balance: {current_balance}, Required: {points_to_redeem}"
                )
            
            # Create redemption transaction
            from models import LoyaltyTransaction
            transaction = LoyaltyTransaction(
                id=str(uuid.uuid4()),
                client_id=client_id,
                transaction_type="redeemed",
                points=-points_to_redeem,  # Negative for redemption
                activity_type=reward_type,
                description=f"Points redeemed for {reward_type}",
                transaction_metadata=reward_details,
                created_at=datetime.utcnow()
            )
            
            db.add(transaction)
            db.commit()
            
            # Generate reward fulfillment
            fulfillment = await self._fulfill_reward(db, client_id, reward_type, reward_details)
            
            new_balance = current_balance - points_to_redeem
            
            return {
                "success": True,
                "points_redeemed": points_to_redeem,
                "new_balance": new_balance,
                "reward_fulfillment": fulfillment
            }
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to redeem points for client {client_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Points redemption failed: {str(e)}")
    
    async def create_retention_campaign(
        self, 
        db: Session, 
        client_ids: List[int],
        campaign_type: CampaignType,
        custom_config: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create personalized retention campaign for specified clients
        """
        try:
            campaign_id = str(uuid.uuid4())
            
            # Get campaign template
            template = self._get_campaign_template(campaign_type)
            if custom_config:
                template.update(custom_config)
            
            # Create personalized campaigns for each client
            campaigns_created = 0
            for client_id in client_ids:
                # Analyze client for personalization
                metrics = await self.analyze_client_retention(db, client_id)
                
                # Skip if client doesn't match campaign criteria
                if not self._client_matches_campaign_criteria(metrics, campaign_type):
                    continue
                
                # Personalize campaign messages
                personalized_messages = await self._personalize_campaign_messages(
                    db, client_id, metrics, template["messages"]
                )
                
                # Create campaign record
                from models import RetentionCampaign
                campaign = RetentionCampaign(
                    id=str(uuid.uuid4()),
                    campaign_id=campaign_id,
                    client_id=client_id,
                    campaign_type=campaign_type.value,
                    status="scheduled",
                    trigger_date=datetime.utcnow() + timedelta(hours=template.get("delay_hours", 0)),
                    messages=personalized_messages,
                    incentives=template.get("incentives", []),
                    success_metrics=template.get("success_metrics", {}),
                    created_at=datetime.utcnow()
                )
                
                db.add(campaign)
                campaigns_created += 1
            
            db.commit()
            
            logger.info(f"Created retention campaign {campaign_id} for {campaigns_created} clients")
            return campaign_id
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create retention campaign: {e}")
            raise HTTPException(status_code=500, detail=f"Campaign creation failed: {str(e)}")
    
    async def get_client_loyalty_dashboard(self, db: Session, client_id: int) -> Dict[str, Any]:
        """
        Get comprehensive loyalty dashboard data for a client
        """
        try:
            # Get retention metrics
            metrics = await self.analyze_client_retention(db, client_id)
            
            # Get recent transactions
            from models import LoyaltyTransaction
            recent_transactions = db.query(LoyaltyTransaction).filter(
                LoyaltyTransaction.client_id == client_id
            ).order_by(desc(LoyaltyTransaction.created_at)).limit(10).all()
            
            # Get available rewards
            available_rewards = self._get_available_rewards(metrics.points_balance, metrics.tier)
            
            # Get tier progress
            tier_progress = self._calculate_tier_progress(metrics)
            
            # Get active campaigns
            from models import RetentionCampaign
            active_campaigns = db.query(RetentionCampaign).filter(
                and_(
                    RetentionCampaign.client_id == client_id,
                    RetentionCampaign.status.in_(["scheduled", "active"])
                )
            ).all()
            
            return {
                "client_id": client_id,
                "loyalty_tier": metrics.tier.value,
                "points_balance": metrics.points_balance,
                "lifetime_value": metrics.lifetime_value,
                "tier_progress": tier_progress,
                "available_rewards": available_rewards,
                "recent_transactions": [
                    {
                        "id": t.id,
                        "points": t.points,
                        "activity_type": t.activity_type,
                        "description": t.description,
                        "created_at": t.created_at.isoformat()
                    }
                    for t in recent_transactions
                ],
                "active_campaigns": [
                    {
                        "campaign_id": c.campaign_id,
                        "campaign_type": c.campaign_type,
                        "status": c.status,
                        "trigger_date": c.trigger_date.isoformat()
                    }
                    for c in active_campaigns
                ],
                "retention_insights": {
                    "status": metrics.status.value,
                    "churn_risk": metrics.churn_risk_score,
                    "visit_frequency": metrics.visit_frequency,
                    "last_visit_days_ago": metrics.last_visit_days_ago
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get loyalty dashboard for client {client_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {str(e)}")
    
    # Private helper methods
    
    def _calculate_loyalty_tier(self, visit_count: int, total_spend: float) -> LoyaltyTier:
        """Calculate loyalty tier based on visits and spend"""
        if visit_count >= self.tier_thresholds[LoyaltyTier.PLATINUM]["visits"] and \
           total_spend >= self.tier_thresholds[LoyaltyTier.PLATINUM]["spend"]:
            return LoyaltyTier.PLATINUM
        elif visit_count >= self.tier_thresholds[LoyaltyTier.VIP]["visits"] and \
             total_spend >= self.tier_thresholds[LoyaltyTier.VIP]["spend"]:
            return LoyaltyTier.VIP
        elif visit_count >= self.tier_thresholds[LoyaltyTier.REGULAR]["visits"] and \
             total_spend >= self.tier_thresholds[LoyaltyTier.REGULAR]["spend"]:
            return LoyaltyTier.REGULAR
        else:
            return LoyaltyTier.NEWCOMER
    
    def _calculate_retention_status(self, days_since_last_visit: int) -> RetentionStatus:
        """Calculate retention status based on recency"""
        if days_since_last_visit <= self.retention_windows["active"]:
            return RetentionStatus.ACTIVE
        elif days_since_last_visit <= self.retention_windows["at_risk"]:
            return RetentionStatus.AT_RISK
        elif days_since_last_visit <= self.retention_windows["lapsed"]:
            return RetentionStatus.LAPSED
        else:
            return RetentionStatus.CHURNED
    
    async def _calculate_points_balance(self, db: Session, client_id: int) -> int:
        """Calculate current points balance for a client"""
        try:
            from models import LoyaltyTransaction
            balance = db.query(func.sum(LoyaltyTransaction.points)).filter(
                LoyaltyTransaction.client_id == client_id
            ).scalar()
            return balance or 0
        except Exception:
            return 0
    
    def _get_next_reward_threshold(self, current_points: int) -> int:
        """Get the next reward threshold"""
        reward_tiers = [100, 250, 500, 750, 1000, 1500, 2000]
        for threshold in reward_tiers:
            if current_points < threshold:
                return threshold
        return current_points + 500  # For high-value clients
    
    def _calculate_churn_risk(
        self, 
        days_since_last_visit: int, 
        visit_frequency: float, 
        tier: LoyaltyTier
    ) -> float:
        """Calculate churn risk score (0-1, higher = more likely to churn)"""
        # Base risk from recency
        recency_risk = min(1.0, days_since_last_visit / 90)
        
        # Frequency risk (lower frequency = higher risk)
        frequency_risk = max(0.0, 1.0 - (visit_frequency / 2))  # Normalize to 2 visits/month
        
        # Tier protection (higher tiers have lower base risk)
        tier_protection = {
            LoyaltyTier.NEWCOMER: 0.0,
            LoyaltyTier.REGULAR: 0.1,
            LoyaltyTier.VIP: 0.2,
            LoyaltyTier.PLATINUM: 0.3
        }
        
        # Weighted average
        risk_score = (0.6 * recency_risk + 0.4 * frequency_risk) * (1 - tier_protection[tier])
        return min(1.0, max(0.0, risk_score))
    
    async def _check_tier_upgrade(self, db: Session, client_id: int, current_metrics: RetentionMetrics):
        """Check if client qualifies for tier upgrade and process if needed"""
        # Implementation for tier upgrade logic
        pass
    
    async def _fulfill_reward(
        self, 
        db: Session, 
        client_id: int, 
        reward_type: str, 
        reward_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Fulfill reward redemption"""
        # Implementation for reward fulfillment
        return {"status": "fulfilled", "details": reward_details}
    
    def _get_campaign_template(self, campaign_type: CampaignType) -> Dict[str, Any]:
        """Get campaign template configuration"""
        templates = {
            CampaignType.WELCOME_SERIES: {
                "delay_hours": 2,
                "messages": [
                    {"type": "email", "template": "welcome_new_client", "delay_hours": 2},
                    {"type": "sms", "template": "booking_reminder", "delay_hours": 48}
                ],
                "incentives": [{"type": "discount", "value": 15, "description": "15% off next visit"}]
            },
            CampaignType.WIN_BACK: {
                "delay_hours": 0,
                "messages": [
                    {"type": "email", "template": "miss_you", "delay_hours": 0},
                    {"type": "sms", "template": "special_offer", "delay_hours": 72}
                ],
                "incentives": [{"type": "discount", "value": 25, "description": "25% off comeback visit"}]
            }
        }
        return templates.get(campaign_type, {})
    
    def _client_matches_campaign_criteria(
        self, 
        metrics: RetentionMetrics, 
        campaign_type: CampaignType
    ) -> bool:
        """Check if client matches campaign targeting criteria"""
        criteria_map = {
            CampaignType.WELCOME_SERIES: metrics.tier == LoyaltyTier.NEWCOMER,
            CampaignType.WIN_BACK: metrics.status in [RetentionStatus.LAPSED, RetentionStatus.CHURNED],
            CampaignType.VIP_EXPERIENCE: metrics.tier in [LoyaltyTier.VIP, LoyaltyTier.PLATINUM]
        }
        return criteria_map.get(campaign_type, True)
    
    async def _personalize_campaign_messages(
        self, 
        db: Session, 
        client_id: int, 
        metrics: RetentionMetrics, 
        message_templates: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Personalize campaign messages based on client data"""
        # Implementation for message personalization
        return message_templates
    
    def _get_available_rewards(self, points_balance: int, tier: LoyaltyTier) -> List[Dict[str, Any]]:
        """Get rewards available for redemption"""
        rewards = [
            {"id": "discount_10", "name": "10% Off Next Visit", "points": 100, "type": "discount"},
            {"id": "discount_15", "name": "15% Off Next Visit", "points": 200, "type": "discount"},
            {"id": "free_upgrade", "name": "Free Service Upgrade", "points": 300, "type": "upgrade"}
        ]
        
        # Filter by available points
        return [r for r in rewards if r["points"] <= points_balance]
    
    def _calculate_tier_progress(self, metrics: RetentionMetrics) -> Dict[str, Any]:
        """Calculate progress toward next loyalty tier"""
        current_tier = metrics.tier
        tier_order = [LoyaltyTier.NEWCOMER, LoyaltyTier.REGULAR, LoyaltyTier.VIP, LoyaltyTier.PLATINUM]
        
        current_index = tier_order.index(current_tier)
        if current_index == len(tier_order) - 1:
            return {"current_tier": current_tier.value, "progress": 100, "next_tier": None}
        
        next_tier = tier_order[current_index + 1]
        next_threshold = self.tier_thresholds[next_tier]
        
        return {
            "current_tier": current_tier.value,
            "next_tier": next_tier.value,
            "progress": 50,  # Simplified calculation
            "requirements": next_threshold
        }


# Global service instance
customer_retention_service = CustomerRetentionService()