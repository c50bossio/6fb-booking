"""
Mentor Oversight Service
Provides tools for 6FB mentors to monitor and guide their mentees
"""
import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from dataclasses import dataclass

from models.location import Location, LocationAnalytics
from models.barber import Barber
from models.appointment import Appointment
from models.client import Client
from models.user import User
from config.database import get_db
from .location_management import LocationManagementService
from .sixfb_calculator import SixFBCalculator

logger = logging.getLogger(__name__)

@dataclass
class MenteeProgress:
    """Data structure for tracking mentee progress"""
    barber_id: int
    barber_name: str
    location_id: int
    location_name: str
    current_6fb_score: float
    previous_6fb_score: float
    score_trend: str  # improving, declining, stable
    goals_met: int
    total_goals: int
    areas_for_improvement: List[str]
    strengths: List[str]
    next_actions: List[str]

@dataclass
class MentorshipGoal:
    """Mentorship goal tracking"""
    goal_id: str
    barber_id: int
    goal_type: str  # revenue, score, retention, efficiency
    target_value: float
    current_value: float
    target_date: date
    status: str  # not_started, in_progress, achieved, missed
    created_by_mentor_id: int
    notes: str

class MentorOversightService:
    """Service for mentor oversight and mentee management"""
    
    def __init__(self, db: Session):
        self.db = db
        self.location_service = LocationManagementService(db)
    
    # Mentor Dashboard
    async def get_mentor_dashboard(self, mentor_id: int) -> Dict[str, Any]:
        """Get comprehensive mentor dashboard data"""
        try:
            mentor = self.db.query(User).filter(User.id == mentor_id).first()
            if not mentor or mentor.role != "mentor":
                raise ValueError(f"User {mentor_id} is not a mentor")
            
            # Get mentor's assigned locations
            assigned_locations = self.db.query(Location).filter(Location.mentor_id == mentor_id).all()
            
            dashboard_data = {
                'mentor_info': {
                    'id': mentor.id,
                    'name': mentor.full_name,
                    'email': mentor.email,
                    'certification_level': mentor.sixfb_certification_level,
                    'mentor_since': mentor.mentor_since.isoformat() if mentor.mentor_since else None
                },
                'overview': {
                    'total_locations': len(assigned_locations),
                    'total_barbers': 0,
                    'average_network_score': 0,
                    'locations_above_target': 0,
                    'locations_needing_attention': 0
                },
                'location_performance': [],
                'mentee_progress': [],
                'recent_alerts': [],
                'upcoming_goals': []
            }
            
            total_score = 0
            total_barbers = 0
            
            for location in assigned_locations:
                location_analytics = await self.location_service.calculate_location_analytics(location.id, "weekly")
                
                # Get location barbers
                location_barbers = self.db.query(Barber).filter(Barber.location_id == location.id).all()
                total_barbers += len(location_barbers)
                
                avg_score = location_analytics['performance']['average_6fb_score']
                total_score += avg_score
                
                # Check if location meets targets
                if avg_score >= (location.target_6fb_score or 85.0):
                    dashboard_data['overview']['locations_above_target'] += 1
                else:
                    dashboard_data['overview']['locations_needing_attention'] += 1
                
                dashboard_data['location_performance'].append({
                    'location_id': location.id,
                    'name': location.name,
                    'barber_count': len(location_barbers),
                    'avg_6fb_score': avg_score,
                    'revenue': location_analytics['revenue']['total'],
                    'target_achievement': location_analytics['revenue']['target_achievement'],
                    'status': 'above_target' if avg_score >= (location.target_6fb_score or 85.0) else 'needs_attention'
                })
                
                # Get mentee progress for this location
                for barber in location_barbers:
                    mentee_progress = await self._get_mentee_progress(barber)
                    dashboard_data['mentee_progress'].append(mentee_progress)
            
            # Calculate overview metrics
            dashboard_data['overview']['total_barbers'] = total_barbers
            dashboard_data['overview']['average_network_score'] = total_score / len(assigned_locations) if assigned_locations else 0
            
            # Get recent alerts and upcoming goals
            dashboard_data['recent_alerts'] = await self._get_mentor_alerts(mentor_id)
            dashboard_data['upcoming_goals'] = await self._get_upcoming_goals(mentor_id)
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Error getting mentor dashboard for {mentor_id}: {e}")
            raise
    
    async def _get_mentee_progress(self, barber: Barber) -> MenteeProgress:
        """Get detailed progress for individual mentee"""
        try:
            calculator = SixFBCalculator(self.db)
            
            # Current score
            current_score = calculator.calculate_sixfb_score(barber.id, "weekly")
            current_overall = current_score.get('overall_score', 0)
            
            # Previous score (last week)
            prev_start = date.today() - timedelta(days=14)
            prev_end = date.today() - timedelta(days=7)
            previous_score = calculator.calculate_sixfb_score(barber.id, "weekly", prev_start, prev_end)
            previous_overall = previous_score.get('overall_score', 0)
            
            # Determine trend
            score_diff = current_overall - previous_overall
            if score_diff > 2:
                trend = "improving"
            elif score_diff < -2:
                trend = "declining"
            else:
                trend = "stable"
            
            # Analyze strengths and areas for improvement
            strengths, areas_for_improvement = self._analyze_barber_performance(current_score)
            
            # Generate next actions
            next_actions = self._generate_next_actions(current_score, trend)
            
            # Get goal progress (mock for now)
            goals_met, total_goals = await self._get_goal_progress(barber.id)
            
            return MenteeProgress(
                barber_id=barber.id,
                barber_name=f"{barber.first_name} {barber.last_name}",
                location_id=barber.location_id or 0,
                location_name=barber.location.name if barber.location else "No Location",
                current_6fb_score=current_overall,
                previous_6fb_score=previous_overall,
                score_trend=trend,
                goals_met=goals_met,
                total_goals=total_goals,
                areas_for_improvement=areas_for_improvement,
                strengths=strengths,
                next_actions=next_actions
            )
            
        except Exception as e:
            logger.error(f"Error getting mentee progress for barber {barber.id}: {e}")
            raise
    
    def _analyze_barber_performance(self, score_data: Dict[str, Any]) -> tuple[List[str], List[str]]:
        """Analyze barber performance to identify strengths and improvement areas"""
        strengths = []
        areas_for_improvement = []
        
        components = score_data.get('components', {})
        
        # Analyze each component
        for component, value in components.items():
            component_name = component.replace('_', ' ').title()
            
            if value >= 90:
                strengths.append(f"Excellent {component_name} ({value:.1f})")
            elif value >= 80:
                strengths.append(f"Strong {component_name} ({value:.1f})")
            elif value < 70:
                areas_for_improvement.append(f"{component_name} needs improvement ({value:.1f})")
            elif value < 80:
                areas_for_improvement.append(f"{component_name} has room for growth ({value:.1f})")
        
        return strengths, areas_for_improvement
    
    def _generate_next_actions(self, score_data: Dict[str, Any], trend: str) -> List[str]:
        """Generate specific next actions for mentee"""
        actions = []
        components = score_data.get('components', {})
        
        # Find lowest performing component
        if components:
            lowest_component = min(components.items(), key=lambda x: x[1])
            component_name = lowest_component[0].replace('_', ' ').title()
            
            if lowest_component[1] < 70:
                actions.append(f"Priority: Focus on {component_name} - schedule training session")
            
            # Specific actions based on component
            if 'booking_utilization' in lowest_component[0] and lowest_component[1] < 75:
                actions.append("Optimize schedule to reduce gaps between appointments")
                actions.append("Review booking policies and availability windows")
            
            if 'customer_retention' in lowest_component[0] and lowest_component[1] < 75:
                actions.append("Implement follow-up calls for recent clients")
                actions.append("Review service quality and client satisfaction")
            
            if 'revenue_growth' in lowest_component[0] and lowest_component[1] < 75:
                actions.append("Focus on upselling premium services")
                actions.append("Increase product sales during appointments")
        
        # Trend-based actions
        if trend == "declining":
            actions.append("Urgent: Schedule one-on-one coaching session")
            actions.append("Review recent changes in process or approach")
        elif trend == "stable":
            actions.append("Identify opportunities for breakthrough improvement")
        
        if not actions:
            actions.append("Continue current excellent performance")
            actions.append("Consider mentoring junior barbers")
        
        return actions[:5]  # Limit to top 5 actions
    
    async def _get_goal_progress(self, barber_id: int) -> tuple[int, int]:
        """Get goal progress for barber (mock implementation)"""
        # In a real implementation, this would query a goals table
        # For now, return mock data
        return 3, 5  # 3 out of 5 goals met
    
    async def _get_mentor_alerts(self, mentor_id: int) -> List[Dict[str, Any]]:
        """Get recent alerts for mentor's locations"""
        alerts = []
        
        # Get mentor's locations
        locations = self.db.query(Location).filter(Location.mentor_id == mentor_id).all()
        
        for location in locations:
            location_analytics = await self.location_service.calculate_location_analytics(location.id, "weekly")
            
            # Check for alerts
            if location_analytics['performance']['average_6fb_score'] < 70:
                alerts.append({
                    'type': 'performance',
                    'severity': 'high',
                    'message': f"{location.name} has low 6FB score ({location_analytics['performance']['average_6fb_score']:.1f})",
                    'location_id': location.id,
                    'created_at': datetime.utcnow() - timedelta(hours=2)
                })
            
            if location_analytics['revenue']['target_achievement'] < 80:
                alerts.append({
                    'type': 'revenue',
                    'severity': 'medium',
                    'message': f"{location.name} is behind on revenue targets ({location_analytics['revenue']['target_achievement']:.1f}%)",
                    'location_id': location.id,
                    'created_at': datetime.utcnow() - timedelta(hours=4)
                })
        
        # Sort by created_at (most recent first)
        alerts.sort(key=lambda x: x['created_at'], reverse=True)
        return alerts[:10]  # Return last 10 alerts
    
    async def _get_upcoming_goals(self, mentor_id: int) -> List[Dict[str, Any]]:
        """Get upcoming goals for mentor's mentees"""
        # Mock implementation - in real app, query goals table
        return [
            {
                'goal_id': 'goal_1',
                'barber_name': 'John Smith',
                'goal_type': 'revenue',
                'target_value': 3000,
                'current_value': 2750,
                'target_date': (date.today() + timedelta(days=7)).isoformat(),
                'progress_percentage': 91.7
            },
            {
                'goal_id': 'goal_2',
                'barber_name': 'Mike Johnson',
                'goal_type': 'score',
                'target_value': 85,
                'current_value': 79,
                'target_date': (date.today() + timedelta(days=14)).isoformat(),
                'progress_percentage': 92.9
            }
        ]
    
    # Mentee Management
    async def get_mentee_detailed_report(self, mentor_id: int, barber_id: int) -> Dict[str, Any]:
        """Get detailed report for specific mentee"""
        try:
            # Verify mentor has access to this barber
            barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
            if not barber:
                raise ValueError(f"Barber {barber_id} not found")
            
            location = self.db.query(Location).filter(
                and_(Location.id == barber.location_id, Location.mentor_id == mentor_id)
            ).first()
            
            if not location:
                raise ValueError(f"Mentor {mentor_id} does not have access to barber {barber_id}")
            
            # Get comprehensive data
            calculator = SixFBCalculator(self.db)
            
            report = {
                'barber_info': {
                    'id': barber.id,
                    'name': f"{barber.first_name} {barber.last_name}",
                    'email': barber.email,
                    'location': location.name,
                    'business_name': barber.business_name
                },
                'current_performance': calculator.calculate_sixfb_score(barber.id, "weekly"),
                'monthly_performance': calculator.calculate_sixfb_score(barber.id, "monthly"),
                'performance_trend': await self._get_performance_trend(barber.id),
                'goals': await self._get_barber_goals(barber.id),
                'recent_appointments': await self._get_recent_appointments(barber.id),
                'client_feedback': await self._get_client_feedback(barber.id),
                'training_history': await self._get_training_history(barber.id),
                'mentor_notes': await self._get_mentor_notes(mentor_id, barber.id)
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error getting detailed report for barber {barber_id}: {e}")
            raise
    
    async def _get_performance_trend(self, barber_id: int) -> Dict[str, Any]:
        """Get performance trend over last 8 weeks"""
        calculator = SixFBCalculator(self.db)
        trend_data = []
        
        for week in range(8):
            week_start = date.today() - timedelta(days=(week + 1) * 7)
            week_end = week_start + timedelta(days=6)
            
            score = calculator.calculate_sixfb_score(barber_id, "weekly", week_start, week_end)
            
            trend_data.append({
                'week_start': week_start.isoformat(),
                'overall_score': score.get('overall_score', 0),
                'components': score.get('components', {})
            })
        
        # Reverse to get chronological order
        trend_data.reverse()
        
        return {
            'weekly_scores': trend_data,
            'trend_direction': self._calculate_trend_direction(trend_data),
            'best_week': max(trend_data, key=lambda x: x['overall_score']),
            'improvement_rate': self._calculate_improvement_rate(trend_data)
        }
    
    def _calculate_trend_direction(self, trend_data: List[Dict[str, Any]]) -> str:
        """Calculate overall trend direction"""
        if len(trend_data) < 2:
            return "insufficient_data"
        
        scores = [week['overall_score'] for week in trend_data]
        recent_avg = sum(scores[-3:]) / 3 if len(scores) >= 3 else scores[-1]
        older_avg = sum(scores[:3]) / 3 if len(scores) >= 3 else scores[0]
        
        diff = recent_avg - older_avg
        
        if diff > 2:
            return "improving"
        elif diff < -2:
            return "declining"
        else:
            return "stable"
    
    def _calculate_improvement_rate(self, trend_data: List[Dict[str, Any]]) -> float:
        """Calculate weekly improvement rate"""
        if len(trend_data) < 2:
            return 0.0
        
        first_score = trend_data[0]['overall_score']
        last_score = trend_data[-1]['overall_score']
        weeks = len(trend_data) - 1
        
        return (last_score - first_score) / weeks if weeks > 0 else 0.0
    
    async def _get_barber_goals(self, barber_id: int) -> List[Dict[str, Any]]:
        """Get goals for specific barber"""
        # Mock implementation
        return [
            {
                'goal_id': f'goal_{barber_id}_1',
                'type': 'revenue',
                'description': 'Achieve $3000 monthly revenue',
                'target_value': 3000,
                'current_value': 2750,
                'target_date': (date.today() + timedelta(days=15)).isoformat(),
                'status': 'in_progress',
                'progress_percentage': 91.7
            },
            {
                'goal_id': f'goal_{barber_id}_2',
                'type': 'score',
                'description': 'Reach 85+ 6FB Score',
                'target_value': 85,
                'current_value': 79,
                'target_date': (date.today() + timedelta(days=30)).isoformat(),
                'status': 'in_progress',
                'progress_percentage': 92.9
            }
        ]
    
    async def _get_recent_appointments(self, barber_id: int) -> List[Dict[str, Any]]:
        """Get recent appointments for analysis"""
        appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.appointment_date >= date.today() - timedelta(days=7)
            )
        ).order_by(desc(Appointment.appointment_date)).limit(20).all()
        
        appointment_data = []
        for apt in appointments:
            appointment_data.append({
                'id': apt.id,
                'date': apt.appointment_date.isoformat(),
                'time': apt.appointment_time.strftime('%H:%M') if apt.appointment_time else None,
                'client_name': apt.client_name,
                'service': apt.service_name,
                'revenue': (apt.service_revenue or 0) + (apt.tip_amount or 0) + (apt.product_revenue or 0),
                'status': apt.status,
                'customer_type': apt.customer_type
            })
        
        return appointment_data
    
    async def _get_client_feedback(self, barber_id: int) -> List[Dict[str, Any]]:
        """Get recent client feedback (mock implementation)"""
        return [
            {
                'client_name': 'John D.',
                'rating': 5,
                'comment': 'Excellent service, very professional',
                'date': (date.today() - timedelta(days=2)).isoformat()
            },
            {
                'client_name': 'Mike S.',
                'rating': 4,
                'comment': 'Great cut, will definitely return',
                'date': (date.today() - timedelta(days=5)).isoformat()
            }
        ]
    
    async def _get_training_history(self, barber_id: int) -> List[Dict[str, Any]]:
        """Get training and certification history"""
        # Mock implementation
        return [
            {
                'training_id': 'train_1',
                'title': '6FB Advanced Techniques',
                'completed_date': (date.today() - timedelta(days=30)).isoformat(),
                'score': 92,
                'certification': 'Silver Level'
            },
            {
                'training_id': 'train_2',
                'title': 'Customer Retention Mastery',
                'completed_date': (date.today() - timedelta(days=60)).isoformat(),
                'score': 88,
                'certification': None
            }
        ]
    
    async def _get_mentor_notes(self, mentor_id: int, barber_id: int) -> List[Dict[str, Any]]:
        """Get mentor's notes for specific barber"""
        # Mock implementation - in real app, query mentor_notes table
        return [
            {
                'note_id': 'note_1',
                'date': (date.today() - timedelta(days=7)).isoformat(),
                'note': 'Showed great improvement in booking efficiency. Need to work on upselling.',
                'type': 'coaching_session'
            },
            {
                'note_id': 'note_2',
                'date': (date.today() - timedelta(days=14)).isoformat(),
                'note': 'Client retention improving. Keep focusing on follow-up calls.',
                'type': 'weekly_review'
            }
        ]
    
    # Goal Management
    async def create_mentee_goal(self, mentor_id: int, barber_id: int, goal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new goal for mentee"""
        try:
            # Verify mentor has access
            barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
            if not barber or not barber.location or barber.location.mentor_id != mentor_id:
                raise ValueError("Mentor does not have access to this barber")
            
            # In real implementation, save to goals table
            goal = {
                'goal_id': f"goal_{barber_id}_{int(datetime.utcnow().timestamp())}",
                'barber_id': barber_id,
                'mentor_id': mentor_id,
                'goal_type': goal_data['goal_type'],
                'description': goal_data['description'],
                'target_value': goal_data['target_value'],
                'target_date': goal_data['target_date'],
                'status': 'not_started',
                'created_at': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Created goal for barber {barber_id} by mentor {mentor_id}")
            return goal
            
        except Exception as e:
            logger.error(f"Error creating goal for barber {barber_id}: {e}")
            raise
    
    async def add_mentor_note(self, mentor_id: int, barber_id: int, note_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add mentor note for barber"""
        try:
            # Verify access
            barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
            if not barber or not barber.location or barber.location.mentor_id != mentor_id:
                raise ValueError("Mentor does not have access to this barber")
            
            # In real implementation, save to mentor_notes table
            note = {
                'note_id': f"note_{barber_id}_{int(datetime.utcnow().timestamp())}",
                'barber_id': barber_id,
                'mentor_id': mentor_id,
                'note': note_data['note'],
                'note_type': note_data.get('note_type', 'general'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Added note for barber {barber_id} by mentor {mentor_id}")
            return note
            
        except Exception as e:
            logger.error(f"Error adding note for barber {barber_id}: {e}")
            raise
    
    # Network Overview for Mentors
    async def get_mentor_network_analytics(self, mentor_id: int) -> Dict[str, Any]:
        """Get network-wide analytics for mentor"""
        try:
            locations = self.db.query(Location).filter(Location.mentor_id == mentor_id).all()
            
            network_data = {
                'summary': {
                    'total_locations': len(locations),
                    'total_barbers': 0,
                    'total_revenue': 0,
                    'average_score': 0,
                    'improvement_opportunities': 0
                },
                'location_comparison': [],
                'top_performers': [],
                'needs_attention': [],
                'trends': {
                    'score_trend': 'improving',
                    'revenue_trend': 'stable',
                    'monthly_growth': 5.2
                }
            }
            
            location_performances = []
            total_score = 0
            total_revenue = 0
            total_barbers = 0
            
            for location in locations:
                analytics = await self.location_service.calculate_location_analytics(location.id, "weekly")
                barber_count = analytics['team']['active_barbers']
                
                total_barbers += barber_count
                total_revenue += analytics['revenue']['total']
                total_score += analytics['performance']['average_6fb_score']
                
                location_perf = {
                    'location_id': location.id,
                    'name': location.name,
                    'barber_count': barber_count,
                    'avg_score': analytics['performance']['average_6fb_score'],
                    'revenue': analytics['revenue']['total'],
                    'target_achievement': analytics['revenue']['target_achievement']
                }
                
                location_performances.append(location_perf)
                
                # Check for improvement opportunities
                if analytics['performance']['average_6fb_score'] < 80:
                    network_data['summary']['improvement_opportunities'] += 1
            
            # Calculate summary
            network_data['summary']['total_barbers'] = total_barbers
            network_data['summary']['total_revenue'] = total_revenue
            network_data['summary']['average_score'] = total_score / len(locations) if locations else 0
            
            # Sort and categorize locations
            location_performances.sort(key=lambda x: x['avg_score'], reverse=True)
            network_data['location_comparison'] = location_performances
            
            # Top performers (score >= 85)
            network_data['top_performers'] = [
                loc for loc in location_performances if loc['avg_score'] >= 85
            ]
            
            # Needs attention (score < 75)
            network_data['needs_attention'] = [
                loc for loc in location_performances if loc['avg_score'] < 75
            ]
            
            return network_data
            
        except Exception as e:
            logger.error(f"Error getting mentor network analytics for {mentor_id}: {e}")
            raise

# Convenience function for API endpoints
async def get_mentor_oversight_service() -> MentorOversightService:
    """Get mentor oversight service instance"""
    db = next(get_db())
    return MentorOversightService(db)