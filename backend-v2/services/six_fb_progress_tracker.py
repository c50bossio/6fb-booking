"""
6FB Progress Tracker Service

This service tracks progress toward Six Figure Barber goals and provides detailed
milestone tracking, achievement systems, and progress analytics.

Integrates with existing analytics infrastructure and provides structured progress data
for the 6FB coaching system.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import logging

from models import User, Appointment, Payment, Client, Service
from services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

class MilestoneType(Enum):
    REVENUE = "revenue"
    CLIENTS = "clients"
    RETENTION = "retention"
    EFFICIENCY = "efficiency"
    PRICING = "pricing"

class MilestoneLevel(Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"
    MASTER = "master"

@dataclass
class ProgressOverview:
    current_annual_pace: float
    target_annual_income: float
    progress_percentage: float
    months_to_goal: Optional[float]
    daily_target: float
    weekly_target: float
    monthly_target: float
    days_ahead_behind: int
    trend_direction: str  # "up", "down", "stable"

@dataclass
class Milestone:
    id: str
    type: MilestoneType
    level: MilestoneLevel
    title: str
    description: str
    target_value: float
    current_value: float
    progress_percentage: float
    achieved: bool
    achieved_date: Optional[datetime]
    reward_message: str
    next_milestone_hint: str

class SixFBProgressTracker:
    """
    6FB Progress Tracker implementing Six Figure Barber methodology milestones
    
    Integrates with existing analytics service to provide structured progress tracking
    and achievement systems for barbers working toward their income goals.
    """
    
    def __init__(self, db: Session, user_id: int, target_annual_income: float = 100000.0):
        self.db = db
        self.user_id = user_id
        self.target_annual_income = target_annual_income
        self.analytics_service = AnalyticsService(db)
        
        # Cache current metrics for efficiency
        self._current_metrics = None
        self._load_current_metrics()
    
    def _load_current_metrics(self):
        """Load current analytics metrics for the user"""
        try:
            # Get the real metrics from analytics service
            self._current_metrics = self.analytics_service.calculate_six_figure_barber_metrics(
                self.user_id, 
                self.target_annual_income
            )
        except Exception as e:
            logger.warning(f"Failed to load analytics metrics for user {self.user_id}: {e}")
            # Fallback to basic calculations
            self._current_metrics = self._calculate_basic_metrics()
    
    def _calculate_basic_metrics(self) -> Dict[str, Any]:
        """Calculate basic metrics as fallback"""
        try:
            # Get recent revenue data
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            recent_payments = self.db.query(Payment).join(Appointment).filter(
                Appointment.barber_id == self.user_id,
                Payment.created_at >= thirty_days_ago,
                Payment.status == "completed"
            ).all()
            
            monthly_revenue = sum(p.amount for p in recent_payments)
            annual_pace = monthly_revenue * 12
            
            # Get client count
            client_count = self.db.query(Client).filter(
                Client.created_by_id == self.user_id
            ).count()
            
            # Get appointment count
            appointment_count = self.db.query(Appointment).filter(
                Appointment.barber_id == self.user_id,
                Appointment.created_at >= thirty_days_ago
            ).count()
            
            avg_ticket = monthly_revenue / max(appointment_count, 1)
            
            return {
                'current_performance': {
                    'monthly_revenue': monthly_revenue,
                    'annual_pace': annual_pace,
                    'average_ticket': avg_ticket,
                    'total_clients': client_count,
                    'monthly_appointments': appointment_count
                },
                'targets': {
                    'annual_income_target': self.target_annual_income,
                    'monthly_target': self.target_annual_income / 12,
                    'daily_target': self.target_annual_income / 365
                }
            }
        except Exception as e:
            logger.error(f"Failed to calculate basic metrics: {e}")
            return self._get_default_metrics()
    
    def _get_default_metrics(self) -> Dict[str, Any]:
        """Get default metrics when calculations fail"""
        return {
            'current_performance': {
                'monthly_revenue': 0,
                'annual_pace': 0,
                'average_ticket': 0,
                'total_clients': 0,
                'monthly_appointments': 0
            },
            'targets': {
                'annual_income_target': self.target_annual_income,
                'monthly_target': self.target_annual_income / 12,
                'daily_target': self.target_annual_income / 365
            }
        }
    
    def get_progress_overview(self) -> ProgressOverview:
        """Get comprehensive progress overview"""
        current_perf = self._current_metrics.get('current_performance', {})
        targets = self._current_metrics.get('targets', {})
        
        annual_pace = current_perf.get('annual_pace', 0)
        progress_percentage = (annual_pace / self.target_annual_income) * 100 if self.target_annual_income > 0 else 0
        
        # Calculate months to goal based on current pace
        monthly_revenue = current_perf.get('monthly_revenue', 0)
        if monthly_revenue > 0:
            monthly_target = self.target_annual_income / 12
            months_to_goal = max(0, (self.target_annual_income - annual_pace) / monthly_revenue) if monthly_revenue > 0 else None
        else:
            months_to_goal = None
        
        # Calculate trend direction (simplified - would need historical data for real trend)
        trend_direction = "stable"
        if progress_percentage > 75:
            trend_direction = "up"
        elif progress_percentage < 25:
            trend_direction = "down"
        
        # Calculate days ahead/behind (simplified calculation)
        expected_daily_progress = self.target_annual_income / 365
        current_daily_pace = annual_pace / 365
        days_ahead_behind = int((current_daily_pace - expected_daily_progress) * 30 / expected_daily_progress) if expected_daily_progress > 0 else 0
        
        return ProgressOverview(
            current_annual_pace=annual_pace,
            target_annual_income=self.target_annual_income,
            progress_percentage=min(progress_percentage, 100),
            months_to_goal=months_to_goal,
            daily_target=self.target_annual_income / 365,
            weekly_target=self.target_annual_income / 52,
            monthly_target=self.target_annual_income / 12,
            days_ahead_behind=days_ahead_behind,
            trend_direction=trend_direction
        )
    
    def get_milestone_progress(self) -> List[Milestone]:
        """Get all milestone progress for the user"""
        milestones = []
        current_perf = self._current_metrics.get('current_performance', {})
        
        # Revenue milestones
        milestones.extend(self._generate_revenue_milestones(current_perf))
        
        # Client milestones
        milestones.extend(self._generate_client_milestones(current_perf))
        
        # Pricing milestones
        milestones.extend(self._generate_pricing_milestones(current_perf))
        
        # Efficiency milestones
        milestones.extend(self._generate_efficiency_milestones(current_perf))
        
        # Retention milestones (basic implementation)
        milestones.extend(self._generate_retention_milestones(current_perf))
        
        return milestones
    
    def _generate_revenue_milestones(self, current_perf: Dict[str, Any]) -> List[Milestone]:
        """Generate revenue-based milestones"""
        annual_pace = current_perf.get('annual_pace', 0)
        
        revenue_targets = [
            (10000, MilestoneLevel.BEGINNER, "First $10K Year"),
            (25000, MilestoneLevel.BEGINNER, "Quarter Way There"),
            (50000, MilestoneLevel.INTERMEDIATE, "Halfway to Six Figures"),
            (75000, MilestoneLevel.INTERMEDIATE, "Three Quarters Strong"),
            (100000, MilestoneLevel.ADVANCED, "Six Figure Barber Achievement"),
            (150000, MilestoneLevel.EXPERT, "Six Figure Barber Elite"),
            (200000, MilestoneLevel.MASTER, "Six Figure Barber Master")
        ]
        
        milestones = []
        for target, level, title in revenue_targets:
            progress = (annual_pace / target) * 100 if target > 0 else 0
            achieved = annual_pace >= target
            
            milestones.append(Milestone(
                id=f"revenue_{target}",
                type=MilestoneType.REVENUE,
                level=level,
                title=title,
                description=f"Reach ${target:,} in annual revenue",
                target_value=target,
                current_value=annual_pace,
                progress_percentage=min(progress, 100),
                achieved=achieved,
                achieved_date=datetime.utcnow() if achieved else None,
                reward_message=f"🎉 Congratulations! You've achieved ${target:,} in annual revenue!" if achieved else "",
                next_milestone_hint=self._get_next_revenue_hint(target, annual_pace)
            ))
        
        return milestones
    
    def _generate_client_milestones(self, current_perf: Dict[str, Any]) -> List[Milestone]:
        """Generate client-based milestones"""
        total_clients = current_perf.get('total_clients', 0)
        
        client_targets = [
            (25, MilestoneLevel.BEGINNER, "Building Client Base"),
            (50, MilestoneLevel.BEGINNER, "Growing Clientele"),
            (100, MilestoneLevel.INTERMEDIATE, "Established Client Base"),
            (200, MilestoneLevel.ADVANCED, "Thriving Business"),
            (300, MilestoneLevel.EXPERT, "Client Magnet"),
            (500, MilestoneLevel.MASTER, "Community Leader")
        ]
        
        milestones = []
        for target, level, title in client_targets:
            progress = (total_clients / target) * 100 if target > 0 else 0
            achieved = total_clients >= target
            
            milestones.append(Milestone(
                id=f"clients_{target}",
                type=MilestoneType.CLIENTS,
                level=level,
                title=title,
                description=f"Build a client base of {target} clients",
                target_value=target,
                current_value=total_clients,
                progress_percentage=min(progress, 100),
                achieved=achieved,
                achieved_date=datetime.utcnow() if achieved else None,
                reward_message=f"🌟 Amazing! You now serve {target} clients!" if achieved else "",
                next_milestone_hint=self._get_next_client_hint(target, total_clients)
            ))
        
        return milestones
    
    def _generate_pricing_milestones(self, current_perf: Dict[str, Any]) -> List[Milestone]:
        """Generate pricing-based milestones"""
        avg_ticket = current_perf.get('average_ticket', 0)
        
        pricing_targets = [
            (30, MilestoneLevel.BEGINNER, "Professional Pricing"),
            (50, MilestoneLevel.INTERMEDIATE, "Premium Services"),
            (75, MilestoneLevel.ADVANCED, "Luxury Experience"),
            (100, MilestoneLevel.EXPERT, "Master Craftsman"),
            (150, MilestoneLevel.MASTER, "Elite Barber Status")
        ]
        
        milestones = []
        for target, level, title in pricing_targets:
            progress = (avg_ticket / target) * 100 if target > 0 else 0
            achieved = avg_ticket >= target
            
            milestones.append(Milestone(
                id=f"pricing_{target}",
                type=MilestoneType.PRICING,
                level=level,
                title=title,
                description=f"Achieve ${target} average ticket value",
                target_value=target,
                current_value=avg_ticket,
                progress_percentage=min(progress, 100),
                achieved=achieved,
                achieved_date=datetime.utcnow() if achieved else None,
                reward_message=f"💰 Excellent! Your average ticket is now ${target}!" if achieved else "",
                next_milestone_hint=self._get_next_pricing_hint(target, avg_ticket)
            ))
        
        return milestones
    
    def _generate_efficiency_milestones(self, current_perf: Dict[str, Any]) -> List[Milestone]:
        """Generate efficiency-based milestones"""
        monthly_appointments = current_perf.get('monthly_appointments', 0)
        
        efficiency_targets = [
            (50, MilestoneLevel.BEGINNER, "Consistent Bookings"),
            (100, MilestoneLevel.INTERMEDIATE, "Busy Schedule"),
            (150, MilestoneLevel.ADVANCED, "High Volume Efficiency"),
            (200, MilestoneLevel.EXPERT, "Scheduling Master"),
            (250, MilestoneLevel.MASTER, "Maximum Efficiency")
        ]
        
        milestones = []
        for target, level, title in efficiency_targets:
            progress = (monthly_appointments / target) * 100 if target > 0 else 0
            achieved = monthly_appointments >= target
            
            milestones.append(Milestone(
                id=f"efficiency_{target}",
                type=MilestoneType.EFFICIENCY,
                level=level,
                title=title,
                description=f"Complete {target} appointments per month",
                target_value=target,
                current_value=monthly_appointments,
                progress_percentage=min(progress, 100),
                achieved=achieved,
                achieved_date=datetime.utcnow() if achieved else None,
                reward_message=f"⚡ Outstanding efficiency! {target} appointments completed!" if achieved else "",
                next_milestone_hint=self._get_next_efficiency_hint(target, monthly_appointments)
            ))
        
        return milestones
    
    def _generate_retention_milestones(self, current_perf: Dict[str, Any]) -> List[Milestone]:
        """Generate retention-based milestones (simplified)"""
        # Note: Real retention would require historical appointment data analysis
        # For now, providing aspirational milestones based on 6FB methodology
        
        retention_targets = [
            (70, MilestoneLevel.BEGINNER, "Building Loyalty"),
            (80, MilestoneLevel.INTERMEDIATE, "Strong Relationships"),
            (85, MilestoneLevel.ADVANCED, "Client Advocate"),
            (90, MilestoneLevel.EXPERT, "Retention Expert"),
            (95, MilestoneLevel.MASTER, "Client Loyalty Master")
        ]
        
        # Simplified retention estimate based on client base growth
        estimated_retention = 75.0  # Default assumption
        total_clients = current_perf.get('total_clients', 0)
        if total_clients > 50:
            estimated_retention = min(85, 70 + (total_clients / 100) * 10)
        
        milestones = []
        for target, level, title in retention_targets:
            progress = (estimated_retention / target) * 100 if target > 0 else 0
            achieved = estimated_retention >= target
            
            milestones.append(Milestone(
                id=f"retention_{target}",
                type=MilestoneType.RETENTION,
                level=level,
                title=title,
                description=f"Achieve {target}% client retention rate",
                target_value=target,
                current_value=estimated_retention,
                progress_percentage=min(progress, 100),
                achieved=achieved,
                achieved_date=datetime.utcnow() if achieved else None,
                reward_message=f"🤝 Incredible! {target}% client retention achieved!" if achieved else "",
                next_milestone_hint=self._get_next_retention_hint(target, estimated_retention)
            ))
        
        return milestones
    
    def _get_next_revenue_hint(self, current_target: float, current_value: float) -> str:
        """Get hint for next revenue milestone"""
        if current_value >= current_target:
            return "Milestone achieved! Keep growing toward the next level."
        
        gap = current_target - current_value
        monthly_needed = gap / 12
        
        return f"Focus on increasing monthly revenue by ${monthly_needed:,.0f} to reach this milestone."
    
    def _get_next_client_hint(self, current_target: int, current_value: int) -> str:
        """Get hint for next client milestone"""
        if current_value >= current_target:
            return "Milestone achieved! Continue building your client community."
        
        gap = current_target - current_value
        return f"Acquire {gap} more clients through referrals and marketing to reach this milestone."
    
    def _get_next_pricing_hint(self, current_target: float, current_value: float) -> str:
        """Get hint for next pricing milestone"""
        if current_value >= current_target:
            return "Milestone achieved! Consider adding premium service tiers."
        
        gap = current_target - current_value
        increase_pct = (gap / current_value) * 100 if current_value > 0 else 0
        
        return f"Increase average ticket by ${gap:.0f} ({increase_pct:.0f}%) through premium services and value communication."
    
    def _get_next_efficiency_hint(self, current_target: int, current_value: int) -> str:
        """Get hint for next efficiency milestone"""
        if current_value >= current_target:
            return "Milestone achieved! Optimize for maximum productivity."
        
        gap = current_target - current_value
        return f"Increase monthly appointments by {gap} through better scheduling and reduced no-shows."
    
    def _get_next_retention_hint(self, current_target: float, current_value: float) -> str:
        """Get hint for next retention milestone"""
        if current_value >= current_target:
            return "Milestone achieved! You're building lasting client relationships."
        
        gap = current_target - current_value
        return f"Improve retention by {gap:.1f}% through follow-up systems and exceptional client experience."
    
    def get_achievement_summary(self) -> Dict[str, Any]:
        """Get summary of achievements and progress"""
        milestones = self.get_milestone_progress()
        
        total_milestones = len(milestones)
        achieved_milestones = len([m for m in milestones if m.achieved])
        
        # Group by category
        by_category = {}
        for milestone in milestones:
            category = milestone.type.value
            if category not in by_category:
                by_category[category] = {'total': 0, 'achieved': 0}
            by_category[category]['total'] += 1
            if milestone.achieved:
                by_category[category]['achieved'] += 1
        
        # Get next priority milestones (closest to completion)
        unachieved = [m for m in milestones if not m.achieved]
        priority_milestones = sorted(unachieved, key=lambda m: -m.progress_percentage)[:3]
        
        return {
            'total_milestones': total_milestones,
            'achieved_milestones': achieved_milestones,
            'achievement_percentage': (achieved_milestones / total_milestones) * 100 if total_milestones > 0 else 0,
            'by_category': by_category,
            'priority_milestones': [
                {
                    'id': m.id,
                    'title': m.title,
                    'type': m.type.value,
                    'progress_percentage': m.progress_percentage,
                    'next_hint': m.next_milestone_hint
                }
                for m in priority_milestones
            ],
            'recent_achievements': [
                {
                    'id': m.id,
                    'title': m.title,
                    'type': m.type.value,
                    'reward_message': m.reward_message
                }
                for m in milestones if m.achieved
            ][-5:]  # Last 5 achievements
        }
    
    def get_milestones_by_type(self, milestone_type: str) -> List[Milestone]:
        """Get milestones filtered by type"""
        all_milestones = self.get_milestone_progress()
        return [m for m in all_milestones if m.type.value == milestone_type]