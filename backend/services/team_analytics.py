"""
Team Performance Analytics Service
Advanced analytics for multi-barber teams and cross-location comparisons
"""
import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from dataclasses import dataclass
import statistics

from models.location import Location, LocationAnalytics
from models.barber import Barber
from models.appointment import Appointment
from models.client import Client
from models.user import User
from config.database import get_db
from .sixfb_calculator import SixFBCalculator
from .location_management import LocationManagementService

logger = logging.getLogger(__name__)

@dataclass
class BarberPerformanceMetrics:
    """Comprehensive barber performance metrics"""
    barber_id: int
    name: str
    location_id: int
    location_name: str
    sixfb_score: float
    revenue: float
    appointments: int
    client_retention: float
    average_ticket: float
    booking_efficiency: float
    growth_rate: float
    rank_in_location: int
    rank_in_network: int
    percentile: float

@dataclass
class TeamComparisonData:
    """Team comparison analytics"""
    location_id: int
    location_name: str
    team_size: int
    avg_sixfb_score: float
    total_revenue: float
    revenue_per_barber: float
    top_performer: str
    improvement_opportunities: int
    team_cohesion_score: float

class TeamAnalyticsService:
    """Service for team performance analytics and comparisons"""
    
    def __init__(self, db: Session):
        self.db = db
        self.calculator = SixFBCalculator(db)
        self.location_service = LocationManagementService(db)
    
    # Individual Barber Analytics
    async def get_barber_detailed_analytics(self, barber_id: int, period_days: int = 30) -> Dict[str, Any]:
        """Get comprehensive analytics for individual barber"""
        try:
            barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
            if not barber:
                raise ValueError(f"Barber {barber_id} not found")
            
            end_date = date.today()
            start_date = end_date - timedelta(days=period_days)
            
            # Calculate 6FB scores
            current_score = self.calculator.calculate_sixfb_score(barber_id, "weekly")
            monthly_score = self.calculator.calculate_sixfb_score(barber_id, "monthly")
            
            # Get appointments for period
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date
                )
            ).all()
            
            completed_appointments = [a for a in appointments if a.status == 'completed']
            
            # Calculate detailed metrics
            analytics = {
                'barber_info': {
                    'id': barber.id,
                    'name': f"{barber.first_name} {barber.last_name}",
                    'email': barber.email,
                    'location_id': barber.location_id,
                    'location_name': barber.location.name if barber.location else "No Location"
                },
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': period_days
                },
                'performance_scores': {
                    'current_6fb': current_score,
                    'monthly_6fb': monthly_score,
                    'score_trend': await self._calculate_score_trend(barber_id)
                },
                'revenue_analysis': await self._analyze_barber_revenue(barber_id, completed_appointments),
                'client_analysis': await self._analyze_barber_clients(barber_id, completed_appointments),
                'efficiency_metrics': await self._calculate_efficiency_metrics(barber_id, appointments),
                'comparative_rankings': await self._get_barber_rankings(barber_id),
                'improvement_recommendations': await self._generate_improvement_recommendations(barber_id, current_score)
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Error getting barber analytics for {barber_id}: {e}")
            raise
    
    async def _calculate_score_trend(self, barber_id: int, weeks: int = 8) -> Dict[str, Any]:
        """Calculate 6FB score trend over time"""
        trend_data = []
        
        for week in range(weeks):
            week_start = date.today() - timedelta(days=(week + 1) * 7)
            week_end = week_start + timedelta(days=6)
            
            score = self.calculator.calculate_sixfb_score(barber_id, "weekly", week_start, week_end)
            trend_data.append({
                'week_start': week_start.isoformat(),
                'score': score.get('overall_score', 0)
            })
        
        trend_data.reverse()  # Chronological order
        
        # Calculate trend direction
        if len(trend_data) >= 4:
            recent_avg = statistics.mean([w['score'] for w in trend_data[-4:]])
            older_avg = statistics.mean([w['score'] for w in trend_data[:4]])
            trend_direction = "improving" if recent_avg > older_avg + 2 else "declining" if recent_avg < older_avg - 2 else "stable"
        else:
            trend_direction = "insufficient_data"
        
        return {
            'weekly_scores': trend_data,
            'trend_direction': trend_direction,
            'best_week_score': max(trend_data, key=lambda x: x['score']) if trend_data else None,
            'average_score': statistics.mean([w['score'] for w in trend_data]) if trend_data else 0
        }
    
    async def _analyze_barber_revenue(self, barber_id: int, appointments: List[Appointment]) -> Dict[str, Any]:
        """Analyze barber revenue patterns"""
        if not appointments:
            return self._empty_revenue_analysis()
        
        total_revenue = sum(
            (a.service_revenue or 0) + (a.tip_amount or 0) + (a.product_revenue or 0)
            for a in appointments
        )
        
        service_revenue = sum(a.service_revenue or 0 for a in appointments)
        tip_revenue = sum(a.tip_amount or 0 for a in appointments)
        product_revenue = sum(a.product_revenue or 0 for a in appointments)
        
        average_ticket = total_revenue / len(appointments) if appointments else 0
        
        # Revenue by day of week
        revenue_by_day = {}
        for appointment in appointments:
            day = appointment.appointment_date.strftime('%A')
            revenue_by_day[day] = revenue_by_day.get(day, 0) + (
                (appointment.service_revenue or 0) + 
                (appointment.tip_amount or 0) + 
                (appointment.product_revenue or 0)
            )
        
        # Revenue trend (weekly)
        weekly_revenue = {}
        for appointment in appointments:
            week_start = appointment.appointment_date - timedelta(days=appointment.appointment_date.weekday())
            week_key = week_start.isoformat()
            weekly_revenue[week_key] = weekly_revenue.get(week_key, 0) + (
                (appointment.service_revenue or 0) + 
                (appointment.tip_amount or 0) + 
                (appointment.product_revenue or 0)
            )
        
        return {
            'total_revenue': total_revenue,
            'revenue_breakdown': {
                'service': service_revenue,
                'tips': tip_revenue,
                'products': product_revenue
            },
            'average_ticket': average_ticket,
            'revenue_per_appointment': total_revenue / len(appointments),
            'revenue_by_day': revenue_by_day,
            'weekly_revenue_trend': weekly_revenue,
            'best_revenue_day': max(revenue_by_day.items(), key=lambda x: x[1]) if revenue_by_day else None
        }
    
    def _empty_revenue_analysis(self) -> Dict[str, Any]:
        """Return empty revenue analysis"""
        return {
            'total_revenue': 0,
            'revenue_breakdown': {'service': 0, 'tips': 0, 'products': 0},
            'average_ticket': 0,
            'revenue_per_appointment': 0,
            'revenue_by_day': {},
            'weekly_revenue_trend': {},
            'best_revenue_day': None
        }
    
    async def _analyze_barber_clients(self, barber_id: int, appointments: List[Appointment]) -> Dict[str, Any]:
        """Analyze barber client patterns"""
        if not appointments:
            return {
                'total_clients': 0, 'new_clients': 0, 'returning_clients': 0,
                'retention_rate': 0, 'client_frequency': {}, 'top_clients': []
            }
        
        unique_clients = len(set(a.client_id for a in appointments if a.client_id))
        new_clients = len([a for a in appointments if a.customer_type == 'new'])
        returning_clients = len([a for a in appointments if a.customer_type == 'returning'])
        
        retention_rate = (returning_clients / (new_clients + returning_clients) * 100) if (new_clients + returning_clients) > 0 else 0
        
        # Client frequency analysis
        client_frequency = {}
        for appointment in appointments:
            if appointment.client_id:
                client_frequency[appointment.client_id] = client_frequency.get(appointment.client_id, 0) + 1
        
        # Top clients by visits and revenue
        client_revenue = {}
        for appointment in appointments:
            if appointment.client_id:
                revenue = (appointment.service_revenue or 0) + (appointment.tip_amount or 0) + (appointment.product_revenue or 0)
                client_revenue[appointment.client_id] = client_revenue.get(appointment.client_id, 0) + revenue
        
        top_clients = sorted(client_revenue.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            'total_clients': unique_clients,
            'new_clients': new_clients,
            'returning_clients': returning_clients,
            'retention_rate': retention_rate,
            'client_frequency': dict(sorted(client_frequency.items(), key=lambda x: x[1], reverse=True)[:10]),
            'top_clients': [{'client_id': cid, 'revenue': rev} for cid, rev in top_clients]
        }
    
    async def _calculate_efficiency_metrics(self, barber_id: int, appointments: List[Appointment]) -> Dict[str, Any]:
        """Calculate barber efficiency metrics"""
        if not appointments:
            return {
                'booking_efficiency': 0, 'no_show_rate': 0, 'cancellation_rate': 0,
                'average_gap_time': 0, 'utilization_rate': 0
            }
        
        total_appointments = len(appointments)
        completed = len([a for a in appointments if a.status == 'completed'])
        no_shows = len([a for a in appointments if a.status == 'no_show'])
        cancellations = len([a for a in appointments if a.status == 'cancelled'])
        
        completion_rate = (completed / total_appointments * 100) if total_appointments > 0 else 0
        no_show_rate = (no_shows / total_appointments * 100) if total_appointments > 0 else 0
        cancellation_rate = (cancellations / total_appointments * 100) if total_appointments > 0 else 0
        
        # Calculate booking efficiency (how well time slots are utilized)
        booking_efficiency = completion_rate  # Simplified calculation
        
        return {
            'booking_efficiency': booking_efficiency,
            'completion_rate': completion_rate,
            'no_show_rate': no_show_rate,
            'cancellation_rate': cancellation_rate,
            'utilization_rate': booking_efficiency  # Simplified
        }
    
    async def _get_barber_rankings(self, barber_id: int) -> Dict[str, Any]:
        """Get barber rankings within location and network"""
        try:
            barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
            if not barber:
                return {'location_rank': 0, 'network_rank': 0, 'percentile': 0}
            
            # Get all barbers in same location
            location_barbers = self.db.query(Barber).filter(Barber.location_id == barber.location_id).all()
            
            # Get all barbers in network
            all_barbers = self.db.query(Barber).all()
            
            # Calculate scores for ranking
            barber_scores = {}
            for b in all_barbers:
                score = self.calculator.calculate_sixfb_score(b.id, "weekly")
                barber_scores[b.id] = score.get('overall_score', 0)
            
            # Location ranking
            location_scores = [(b.id, barber_scores[b.id]) for b in location_barbers]
            location_scores.sort(key=lambda x: x[1], reverse=True)
            location_rank = next((i + 1 for i, (bid, _) in enumerate(location_scores) if bid == barber_id), 0)
            
            # Network ranking
            network_scores = sorted(barber_scores.items(), key=lambda x: x[1], reverse=True)
            network_rank = next((i + 1 for i, (bid, _) in enumerate(network_scores) if bid == barber_id), 0)
            
            # Percentile calculation
            current_score = barber_scores.get(barber_id, 0)
            lower_scores = sum(1 for score in barber_scores.values() if score < current_score)
            percentile = (lower_scores / len(barber_scores) * 100) if barber_scores else 0
            
            return {
                'location_rank': location_rank,
                'location_total': len(location_barbers),
                'network_rank': network_rank,
                'network_total': len(all_barbers),
                'percentile': percentile,
                'current_score': current_score
            }
            
        except Exception as e:
            logger.error(f"Error calculating barber rankings: {e}")
            return {'location_rank': 0, 'network_rank': 0, 'percentile': 0}
    
    async def _generate_improvement_recommendations(self, barber_id: int, current_score: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate personalized improvement recommendations"""
        recommendations = []
        components = current_score.get('components', {})
        
        # Analyze each component and suggest improvements
        for component, score in components.items():
            if score < 75:  # Needs improvement
                rec = self._get_component_recommendation(component, score)
                if rec:
                    recommendations.append(rec)
        
        # Add general recommendations based on overall score
        overall_score = current_score.get('overall_score', 0)
        if overall_score < 70:
            recommendations.append({
                'priority': 'high',
                'category': 'overall_performance',
                'title': 'Schedule Mentor Session',
                'description': 'Book a one-on-one session with your 6FB mentor to address performance gaps',
                'action_items': ['Contact mentor', 'Review recent changes', 'Create improvement plan']
            })
        
        return recommendations[:5]  # Return top 5 recommendations
    
    def _get_component_recommendation(self, component: str, score: float) -> Optional[Dict[str, Any]]:
        """Get specific recommendation for component"""
        recommendations_map = {
            'booking_utilization': {
                'priority': 'high',
                'category': 'scheduling',
                'title': 'Improve Booking Efficiency',
                'description': 'Optimize your schedule to reduce gaps and increase utilization',
                'action_items': ['Review schedule gaps', 'Implement walk-in policies', 'Adjust availability windows']
            },
            'customer_retention': {
                'priority': 'high',
                'category': 'client_relations',
                'title': 'Enhance Client Retention',
                'description': 'Focus on building stronger client relationships and follow-up',
                'action_items': ['Implement follow-up calls', 'Improve service quality', 'Gather client feedback']
            },
            'revenue_growth': {
                'priority': 'medium',
                'category': 'revenue',
                'title': 'Increase Revenue Performance',
                'description': 'Focus on upselling and premium service offerings',
                'action_items': ['Promote premium services', 'Increase product sales', 'Review pricing strategy']
            }
        }
        
        return recommendations_map.get(component)
    
    # Team Comparison Analytics
    async def get_team_comparison_analytics(self, location_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """Get comprehensive team comparison analytics"""
        try:
            # Get locations to analyze
            if location_ids:
                locations = self.db.query(Location).filter(Location.id.in_(location_ids)).all()
            else:
                locations = self.db.query(Location).filter(Location.is_active == True).all()
            
            comparison_data = {
                'summary': {
                    'total_locations': len(locations),
                    'total_barbers': 0,
                    'avg_team_size': 0,
                    'avg_network_score': 0,
                    'total_network_revenue': 0
                },
                'location_comparisons': [],
                'top_performing_teams': [],
                'improvement_opportunities': [],
                'network_benchmarks': {}
            }
            
            team_data = []
            total_barbers = 0
            total_revenue = 0
            all_scores = []
            
            for location in locations:
                team_analytics = await self._get_location_team_analytics(location.id)
                team_data.append(team_analytics)
                
                total_barbers += team_analytics['team_size']
                total_revenue += team_analytics['total_revenue']
                all_scores.append(team_analytics['avg_sixfb_score'])
            
            # Calculate summary metrics
            comparison_data['summary']['total_barbers'] = total_barbers
            comparison_data['summary']['avg_team_size'] = total_barbers / len(locations) if locations else 0
            comparison_data['summary']['avg_network_score'] = statistics.mean(all_scores) if all_scores else 0
            comparison_data['summary']['total_network_revenue'] = total_revenue
            
            # Sort teams by performance
            team_data.sort(key=lambda x: x['avg_sixfb_score'], reverse=True)
            comparison_data['location_comparisons'] = team_data
            
            # Top performing teams (top 25%)
            top_count = max(1, len(team_data) // 4)
            comparison_data['top_performing_teams'] = team_data[:top_count]
            
            # Teams needing improvement (bottom 25% or score < 75)
            comparison_data['improvement_opportunities'] = [
                team for team in team_data 
                if team['avg_sixfb_score'] < 75 or team['improvement_opportunities'] > 2
            ]
            
            # Network benchmarks
            comparison_data['network_benchmarks'] = {
                'top_quartile_score': statistics.quantiles(all_scores, n=4)[2] if len(all_scores) >= 4 else 0,
                'median_score': statistics.median(all_scores) if all_scores else 0,
                'bottom_quartile_score': statistics.quantiles(all_scores, n=4)[0] if len(all_scores) >= 4 else 0,
                'revenue_per_barber_benchmark': total_revenue / total_barbers if total_barbers > 0 else 0
            }
            
            return comparison_data
            
        except Exception as e:
            logger.error(f"Error getting team comparison analytics: {e}")
            raise
    
    async def _get_location_team_analytics(self, location_id: int) -> Dict[str, Any]:
        """Get analytics for specific location team"""
        try:
            location = self.db.query(Location).filter(Location.id == location_id).first()
            if not location:
                return self._empty_team_analytics(location_id)
            
            # Get location barbers
            barbers = self.db.query(Barber).filter(Barber.location_id == location_id).all()
            
            if not barbers:
                return self._empty_team_analytics(location_id, location.name)
            
            # Calculate team metrics
            team_scores = []
            team_revenue = 0
            improvement_count = 0
            
            barber_performances = []
            
            for barber in barbers:
                score = self.calculator.calculate_sixfb_score(barber.id, "weekly")
                overall_score = score.get('overall_score', 0)
                team_scores.append(overall_score)
                
                # Calculate barber revenue (last 30 days)
                end_date = date.today()
                start_date = end_date - timedelta(days=30)
                
                barber_appointments = self.db.query(Appointment).filter(
                    and_(
                        Appointment.barber_id == barber.id,
                        Appointment.appointment_date >= start_date,
                        Appointment.appointment_date <= end_date,
                        Appointment.status == 'completed'
                    )
                ).all()
                
                barber_revenue = sum(
                    (a.service_revenue or 0) + (a.tip_amount or 0) + (a.product_revenue or 0)
                    for a in barber_appointments
                )
                
                team_revenue += barber_revenue
                
                # Count improvement opportunities
                if overall_score < 80:
                    improvement_count += 1
                
                barber_performances.append({
                    'barber_id': barber.id,
                    'name': f"{barber.first_name} {barber.last_name}",
                    'score': overall_score,
                    'revenue': barber_revenue
                })
            
            # Calculate team cohesion (how close scores are to each other)
            score_std_dev = statistics.stdev(team_scores) if len(team_scores) > 1 else 0
            team_cohesion = max(0, 100 - (score_std_dev * 2))  # Higher cohesion = lower standard deviation
            
            # Find top performer
            top_performer = max(barber_performances, key=lambda x: x['score']) if barber_performances else None
            
            return {
                'location_id': location_id,
                'location_name': location.name,
                'team_size': len(barbers),
                'avg_sixfb_score': statistics.mean(team_scores) if team_scores else 0,
                'total_revenue': team_revenue,
                'revenue_per_barber': team_revenue / len(barbers) if barbers else 0,
                'team_cohesion_score': team_cohesion,
                'improvement_opportunities': improvement_count,
                'top_performer': top_performer['name'] if top_performer else "N/A",
                'score_range': {
                    'highest': max(team_scores) if team_scores else 0,
                    'lowest': min(team_scores) if team_scores else 0,
                    'std_deviation': score_std_dev
                },
                'barber_performances': barber_performances
            }
            
        except Exception as e:
            logger.error(f"Error getting team analytics for location {location_id}: {e}")
            return self._empty_team_analytics(location_id)
    
    def _empty_team_analytics(self, location_id: int, location_name: str = "Unknown") -> Dict[str, Any]:
        """Return empty team analytics"""
        return {
            'location_id': location_id,
            'location_name': location_name,
            'team_size': 0,
            'avg_sixfb_score': 0,
            'total_revenue': 0,
            'revenue_per_barber': 0,
            'team_cohesion_score': 0,
            'improvement_opportunities': 0,
            'top_performer': "N/A",
            'score_range': {'highest': 0, 'lowest': 0, 'std_deviation': 0},
            'barber_performances': []
        }
    
    # Network-wide Analytics
    async def get_network_performance_insights(self) -> Dict[str, Any]:
        """Get network-wide performance insights and trends"""
        try:
            all_barbers = self.db.query(Barber).all()
            all_locations = self.db.query(Location).filter(Location.is_active == True).all()
            
            # Calculate network metrics
            network_scores = []
            network_revenue = 0
            
            for barber in all_barbers:
                score = self.calculator.calculate_sixfb_score(barber.id, "weekly")
                network_scores.append(score.get('overall_score', 0))
                
                # Calculate revenue (last 30 days)
                end_date = date.today()
                start_date = end_date - timedelta(days=30)
                
                barber_appointments = self.db.query(Appointment).filter(
                    and_(
                        Appointment.barber_id == barber.id,
                        Appointment.appointment_date >= start_date,
                        Appointment.appointment_date <= end_date,
                        Appointment.status == 'completed'
                    )
                ).all()
                
                barber_revenue = sum(
                    (a.service_revenue or 0) + (a.tip_amount or 0) + (a.product_revenue or 0)
                    for a in barber_appointments
                )
                network_revenue += barber_revenue
            
            insights = {
                'network_overview': {
                    'total_locations': len(all_locations),
                    'total_barbers': len(all_barbers),
                    'avg_network_score': statistics.mean(network_scores) if network_scores else 0,
                    'total_network_revenue': network_revenue,
                    'revenue_per_barber': network_revenue / len(all_barbers) if all_barbers else 0
                },
                'performance_distribution': {
                    'excellent_performers': len([s for s in network_scores if s >= 90]),  # A grade
                    'good_performers': len([s for s in network_scores if 80 <= s < 90]),  # B grade
                    'average_performers': len([s for s in network_scores if 70 <= s < 80]),  # C grade
                    'needs_improvement': len([s for s in network_scores if s < 70])  # Below C
                },
                'benchmarks': {
                    'top_10_percent_score': statistics.quantiles(network_scores, n=10)[8] if len(network_scores) >= 10 else 0,
                    'median_score': statistics.median(network_scores) if network_scores else 0,
                    'bottom_10_percent_score': statistics.quantiles(network_scores, n=10)[0] if len(network_scores) >= 10 else 0
                },
                'trends': await self._calculate_network_trends(),
                'improvement_opportunities': await self._identify_network_improvement_opportunities()
            }
            
            return insights
            
        except Exception as e:
            logger.error(f"Error getting network performance insights: {e}")
            raise
    
    async def _calculate_network_trends(self) -> Dict[str, Any]:
        """Calculate network performance trends"""
        # Simplified trend calculation - in real implementation, would analyze historical data
        return {
            'score_trend': 'improving',  # Mock data
            'revenue_trend': 'stable',
            'barber_growth': 5.2,  # Percentage growth
            'location_growth': 2.1
        }
    
    async def _identify_network_improvement_opportunities(self) -> List[Dict[str, Any]]:
        """Identify network-wide improvement opportunities"""
        opportunities = []
        
        # Analyze common pain points across network
        all_barbers = self.db.query(Barber).all()
        low_retention_count = 0
        low_efficiency_count = 0
        low_revenue_count = 0
        
        for barber in all_barbers[:10]:  # Sample for performance
            score = self.calculator.calculate_sixfb_score(barber.id, "weekly")
            components = score.get('components', {})
            
            if components.get('customer_retention', 100) < 70:
                low_retention_count += 1
            if components.get('booking_utilization', 100) < 70:
                low_efficiency_count += 1
            if score.get('overall_score', 100) < 70:
                low_revenue_count += 1
        
        if low_retention_count > len(all_barbers) * 0.3:  # 30% of barbers
            opportunities.append({
                'category': 'client_retention',
                'title': 'Network-wide Client Retention Issue',
                'description': f'{low_retention_count} barbers showing low retention rates',
                'suggested_action': 'Implement retention training program'
            })
        
        if low_efficiency_count > len(all_barbers) * 0.25:  # 25% of barbers
            opportunities.append({
                'category': 'booking_efficiency',
                'title': 'Booking Efficiency Optimization',
                'description': f'{low_efficiency_count} barbers with low booking utilization',
                'suggested_action': 'Review scheduling policies and training'
            })
        
        return opportunities

# Convenience function for API endpoints
async def get_team_analytics_service() -> TeamAnalyticsService:
    """Get team analytics service instance"""
    db = next(get_db())
    return TeamAnalyticsService(db)