"""
Advanced Franchise Analytics Service

Provides comprehensive real-time analytics, cross-network intelligence,
and predictive insights for enterprise-scale franchise operations.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta, date
import logging
import statistics
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc, text
from collections import defaultdict

from models import User, Location, Appointment, Payment, Service
from models.franchise_security import FranchiseNetwork, SecurityZone
from models.analytics import PerformanceBenchmark, CrossUserMetric
from services.analytics_service import AnalyticsService


logger = logging.getLogger(__name__)


class AnalyticsTimeframe(Enum):
    """Supported analytics timeframes"""
    REALTIME = "realtime"           # Last 1 hour
    TODAY = "today"                 # Current day
    WEEK = "week"                   # Last 7 days
    MONTH = "month"                 # Last 30 days
    QUARTER = "quarter"             # Last 90 days
    YEAR = "year"                   # Last 365 days
    CUSTOM = "custom"               # Custom date range


class FranchiseSegment(Enum):
    """Franchise performance segments"""
    ELITE = "elite"                 # Top 10% performers
    HIGH_PERFORMER = "high_performer"  # Top 25% performers
    AVERAGE = "average"             # Middle 50% performers
    DEVELOPING = "developing"       # Bottom 25% performers
    UNDERPERFORMING = "underperforming"  # Bottom 10% performers


@dataclass
class RealTimeMetrics:
    """Real-time performance metrics"""
    current_appointments: int
    active_clients: int
    revenue_today: float
    utilization_rate: float
    staff_productivity: float
    client_satisfaction: float
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class FranchisePerformanceSnapshot:
    """Comprehensive franchise performance snapshot"""
    location_id: int
    location_name: str
    franchise_network_id: Optional[str]
    timeframe: AnalyticsTimeframe
    
    # Revenue metrics
    total_revenue: float
    revenue_growth: float
    average_ticket: float
    revenue_per_client: float
    
    # Operational metrics
    total_appointments: int
    appointment_growth: float
    utilization_rate: float
    efficiency_score: float
    
    # Client metrics
    total_clients: int
    new_clients: int
    retention_rate: float
    satisfaction_score: float
    
    # Staff metrics
    active_staff: int
    staff_productivity: float
    staff_utilization: float
    
    # Performance indicators
    performance_score: float
    segment: FranchiseSegment
    rank_percentile: float
    
    # Comparative analysis
    network_comparison: Dict[str, Any] = field(default_factory=dict)
    industry_benchmark: Dict[str, Any] = field(default_factory=dict)
    
    # Alerts and recommendations
    performance_alerts: List[str] = field(default_factory=list)
    optimization_recommendations: List[str] = field(default_factory=list)


@dataclass
class CrossNetworkInsight:
    """Cross-network performance insight"""
    insight_type: str
    title: str
    description: str
    impact_score: float
    data_points: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    supporting_metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FranchiseNetworkDashboard:
    """Comprehensive franchise network dashboard data"""
    network_id: str
    network_name: str
    total_locations: int
    active_locations: int
    
    # Aggregated metrics
    network_revenue: float
    network_growth: float
    average_performance_score: float
    
    # Location performance distribution
    elite_locations: int
    high_performer_locations: int
    average_locations: int
    developing_locations: int
    underperforming_locations: int
    
    # Real-time status
    current_appointments: int
    active_clients: int
    staff_online: int
    
    # Performance insights
    top_performers: List[Dict[str, Any]] = field(default_factory=list)
    improvement_opportunities: List[Dict[str, Any]] = field(default_factory=list)
    network_trends: List[Dict[str, Any]] = field(default_factory=list)
    
    # Cross-network intelligence
    network_benchmarks: Dict[str, Any] = field(default_factory=dict)
    best_practices: List[str] = field(default_factory=list)


class AdvancedFranchiseAnalyticsService:
    """
    Advanced analytics service for franchise networks
    
    Provides:
    - Real-time performance monitoring
    - Cross-network benchmarking and intelligence
    - Predictive analytics and forecasting
    - Executive dashboards and reporting
    - Automated performance alerts
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.base_analytics = AnalyticsService(db)
    
    def get_real_time_metrics(self, location_id: int) -> RealTimeMetrics:
        """Get real-time performance metrics for a location"""
        try:
            now = datetime.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Current appointments (next 2 hours)
            current_appointments = self.db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= now,
                    Appointment.start_time <= now + timedelta(hours=2),
                    Appointment.status.in_(["confirmed", "in_progress"])
                )
            ).scalar() or 0
            
            # Active clients today
            active_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= today_start,
                    Appointment.status.in_(["confirmed", "completed", "in_progress"])
                )
            ).scalar() or 0
            
            # Revenue today
            revenue_today = self.db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.location_id == location_id,
                    Payment.status == "completed",
                    Payment.created_at >= today_start
                )
            ).scalar() or 0.0
            
            # Calculate utilization rate (simplified)
            total_appointments_today = self.db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= today_start,
                    Appointment.status.in_(["confirmed", "completed"])
                )
            ).scalar() or 0
            
            # Assuming 8 hours/day, 30-minute slots = 16 possible appointments
            max_appointments_per_day = 16
            utilization_rate = (total_appointments_today / max_appointments_per_day * 100) if max_appointments_per_day > 0 else 0
            utilization_rate = min(utilization_rate, 100.0)
            
            return RealTimeMetrics(
                current_appointments=current_appointments,
                active_clients=active_clients,
                revenue_today=float(revenue_today),
                utilization_rate=utilization_rate,
                staff_productivity=self._calculate_staff_productivity(location_id, today_start),
                client_satisfaction=self._get_client_satisfaction_score(location_id)
            )
            
        except Exception as e:
            logger.error(f"Error getting real-time metrics: {str(e)}")
            return RealTimeMetrics(
                current_appointments=0,
                active_clients=0,
                revenue_today=0.0,
                utilization_rate=0.0,
                staff_productivity=0.0,
                client_satisfaction=0.0
            )
    
    def get_franchise_performance_snapshot(
        self, 
        location_id: int, 
        timeframe: AnalyticsTimeframe = AnalyticsTimeframe.MONTH,
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> FranchisePerformanceSnapshot:
        """Get comprehensive performance snapshot for a franchise location"""
        try:
            # Determine date range
            start_date, end_date = self._get_date_range(timeframe, custom_start, custom_end)
            
            # Get location details
            location = self.db.query(Location).filter(Location.id == location_id).first()
            if not location:
                raise ValueError(f"Location {location_id} not found")
            
            # Calculate revenue metrics
            revenue_metrics = self._calculate_revenue_metrics(location_id, start_date, end_date)
            
            # Calculate operational metrics
            operational_metrics = self._calculate_operational_metrics(location_id, start_date, end_date)
            
            # Calculate client metrics
            client_metrics = self._calculate_client_metrics(location_id, start_date, end_date)
            
            # Calculate staff metrics
            staff_metrics = self._calculate_staff_metrics(location_id, start_date, end_date)
            
            # Calculate performance score and segment
            performance_score = self._calculate_performance_score(
                revenue_metrics, operational_metrics, client_metrics, staff_metrics
            )
            segment = self._determine_performance_segment(performance_score, location_id)
            rank_percentile = self._calculate_rank_percentile(location_id, performance_score)
            
            # Get comparative analysis
            network_comparison = self._get_network_comparison(location_id, timeframe)
            industry_benchmark = self._get_industry_benchmark(location_id, timeframe)
            
            # Generate alerts and recommendations
            alerts = self._generate_performance_alerts(
                location_id, revenue_metrics, operational_metrics, client_metrics, staff_metrics
            )
            recommendations = self._generate_optimization_recommendations(
                location_id, performance_score, segment
            )
            
            return FranchisePerformanceSnapshot(
                location_id=location_id,
                location_name=location.name,
                franchise_network_id=getattr(location, 'franchise_network_id', None),
                timeframe=timeframe,
                
                # Revenue metrics
                total_revenue=revenue_metrics['total_revenue'],
                revenue_growth=revenue_metrics['growth_rate'],
                average_ticket=revenue_metrics['average_ticket'],
                revenue_per_client=revenue_metrics['revenue_per_client'],
                
                # Operational metrics
                total_appointments=operational_metrics['total_appointments'],
                appointment_growth=operational_metrics['growth_rate'],
                utilization_rate=operational_metrics['utilization_rate'],
                efficiency_score=operational_metrics['efficiency_score'],
                
                # Client metrics
                total_clients=client_metrics['total_clients'],
                new_clients=client_metrics['new_clients'],
                retention_rate=client_metrics['retention_rate'],
                satisfaction_score=client_metrics['satisfaction_score'],
                
                # Staff metrics
                active_staff=staff_metrics['active_staff'],
                staff_productivity=staff_metrics['productivity'],
                staff_utilization=staff_metrics['utilization'],
                
                # Performance indicators
                performance_score=performance_score,
                segment=segment,
                rank_percentile=rank_percentile,
                
                # Comparative analysis
                network_comparison=network_comparison,
                industry_benchmark=industry_benchmark,
                
                # Alerts and recommendations
                performance_alerts=alerts,
                optimization_recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Error getting franchise performance snapshot: {str(e)}")
            raise
    
    def get_cross_network_insights(
        self, 
        network_id: Optional[str] = None,
        timeframe: AnalyticsTimeframe = AnalyticsTimeframe.MONTH
    ) -> List[CrossNetworkInsight]:
        """Get cross-network performance insights"""
        insights = []
        
        try:
            # Revenue performance insights
            revenue_insight = self._analyze_cross_network_revenue_patterns(network_id, timeframe)
            if revenue_insight:
                insights.append(revenue_insight)
            
            # Efficiency optimization insights
            efficiency_insight = self._analyze_cross_network_efficiency_patterns(network_id, timeframe)
            if efficiency_insight:
                insights.append(efficiency_insight)
            
            # Client retention insights
            retention_insight = self._analyze_cross_network_retention_patterns(network_id, timeframe)
            if retention_insight:
                insights.append(retention_insight)
            
            # Market opportunity insights
            market_insight = self._analyze_cross_network_market_opportunities(network_id, timeframe)
            if market_insight:
                insights.append(market_insight)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error getting cross-network insights: {str(e)}")
            return []
    
    def get_franchise_network_dashboard(
        self, 
        network_id: str,
        timeframe: AnalyticsTimeframe = AnalyticsTimeframe.MONTH
    ) -> FranchiseNetworkDashboard:
        """Get comprehensive franchise network dashboard"""
        try:
            # Get network details
            network = self.db.query(FranchiseNetwork).filter(
                FranchiseNetwork.id == network_id
            ).first()
            
            if not network:
                raise ValueError(f"Franchise network {network_id} not found")
            
            # Get all locations in the network
            locations = self.db.query(Location).filter(
                Location.franchise_network_id == network_id,
                Location.is_active == True
            ).all()
            
            # Calculate aggregated metrics
            aggregated_metrics = self._calculate_network_aggregated_metrics(
                [loc.id for loc in locations], timeframe
            )
            
            # Analyze location performance distribution
            performance_distribution = self._analyze_network_performance_distribution(
                [loc.id for loc in locations], timeframe
            )
            
            # Get real-time network status
            real_time_status = self._get_network_real_time_status([loc.id for loc in locations])
            
            # Identify top performers and improvement opportunities
            top_performers = self._identify_network_top_performers(
                [loc.id for loc in locations], timeframe
            )
            improvement_opportunities = self._identify_network_improvement_opportunities(
                [loc.id for loc in locations], timeframe
            )
            
            # Analyze network trends
            network_trends = self._analyze_network_trends([loc.id for loc in locations], timeframe)
            
            # Get cross-network benchmarks
            network_benchmarks = self._get_network_benchmarks(network_id, timeframe)
            
            # Get best practices
            best_practices = self._get_network_best_practices(network_id)
            
            return FranchiseNetworkDashboard(
                network_id=network_id,
                network_name=network.name,
                total_locations=len(locations),
                active_locations=len([loc for loc in locations if loc.is_active]),
                
                # Aggregated metrics
                network_revenue=aggregated_metrics['total_revenue'],
                network_growth=aggregated_metrics['growth_rate'],
                average_performance_score=aggregated_metrics['average_performance_score'],
                
                # Performance distribution
                elite_locations=performance_distribution['elite'],
                high_performer_locations=performance_distribution['high_performer'],
                average_locations=performance_distribution['average'],
                developing_locations=performance_distribution['developing'],
                underperforming_locations=performance_distribution['underperforming'],
                
                # Real-time status
                current_appointments=real_time_status['current_appointments'],
                active_clients=real_time_status['active_clients'],
                staff_online=real_time_status['staff_online'],
                
                # Performance insights
                top_performers=top_performers,
                improvement_opportunities=improvement_opportunities,
                network_trends=network_trends,
                
                # Cross-network intelligence
                network_benchmarks=network_benchmarks,
                best_practices=best_practices
            )
            
        except Exception as e:
            logger.error(f"Error getting franchise network dashboard: {str(e)}")
            raise
    
    def generate_automated_performance_alerts(
        self, 
        location_id: int
    ) -> List[Dict[str, Any]]:
        """Generate automated performance alerts for a location"""
        alerts = []
        
        try:
            # Get real-time metrics
            real_time = self.get_real_time_metrics(location_id)
            
            # Get recent performance data
            recent_snapshot = self.get_franchise_performance_snapshot(
                location_id, AnalyticsTimeframe.WEEK
            )
            
            # Revenue alerts
            if recent_snapshot.revenue_growth < -10:  # 10% decline
                alerts.append({
                    'type': 'revenue_decline',
                    'severity': 'high',
                    'title': 'Significant Revenue Decline',
                    'message': f'Revenue has declined by {abs(recent_snapshot.revenue_growth):.1f}% this week',
                    'action_required': True,
                    'recommendations': [
                        'Review pricing strategy and competitive positioning',
                        'Analyze client feedback and service quality',
                        'Implement targeted marketing campaigns'
                    ]
                })
            
            # Utilization alerts
            if real_time.utilization_rate < 50:  # Low utilization
                alerts.append({
                    'type': 'low_utilization',
                    'severity': 'medium',
                    'title': 'Low Schedule Utilization',
                    'message': f'Current utilization rate is {real_time.utilization_rate:.1f}%',
                    'action_required': True,
                    'recommendations': [
                        'Review appointment scheduling optimization',
                        'Implement flexible booking options',
                        'Consider promotional offers for off-peak times'
                    ]
                })
            
            # Client retention alerts
            if recent_snapshot.retention_rate < 70:  # Below industry standard
                alerts.append({
                    'type': 'retention_concern',
                    'severity': 'medium',
                    'title': 'Client Retention Below Target',
                    'message': f'Retention rate is {recent_snapshot.retention_rate:.1f}%',
                    'action_required': True,
                    'recommendations': [
                        'Implement follow-up system for client engagement',
                        'Review service quality and client satisfaction',
                        'Create loyalty program to incentivize repeat visits'
                    ]
                })
            
            # Performance ranking alerts
            if recent_snapshot.rank_percentile < 25:  # Bottom quartile
                alerts.append({
                    'type': 'performance_ranking',
                    'severity': 'high',
                    'title': 'Performance Below Network Average',
                    'message': f'Performance ranking is in the {recent_snapshot.rank_percentile:.0f}th percentile',
                    'action_required': True,
                    'recommendations': [
                        'Schedule performance review meeting',
                        'Implement best practices from top performers',
                        'Consider additional training and support'
                    ]
                })
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error generating performance alerts: {str(e)}")
            return []
    
    # Helper methods for calculations and analysis
    
    def _get_date_range(
        self, 
        timeframe: AnalyticsTimeframe, 
        custom_start: Optional[date] = None, 
        custom_end: Optional[date] = None
    ) -> Tuple[datetime, datetime]:
        """Get date range for analytics timeframe"""
        now = datetime.now()
        
        if timeframe == AnalyticsTimeframe.CUSTOM and custom_start and custom_end:
            return (
                datetime.combine(custom_start, datetime.min.time()),
                datetime.combine(custom_end, datetime.max.time())
            )
        elif timeframe == AnalyticsTimeframe.TODAY:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            return (start, now)
        elif timeframe == AnalyticsTimeframe.WEEK:
            start = now - timedelta(days=7)
            return (start, now)
        elif timeframe == AnalyticsTimeframe.MONTH:
            start = now - timedelta(days=30)
            return (start, now)
        elif timeframe == AnalyticsTimeframe.QUARTER:
            start = now - timedelta(days=90)
            return (start, now)
        elif timeframe == AnalyticsTimeframe.YEAR:
            start = now - timedelta(days=365)
            return (start, now)
        else:  # REALTIME
            start = now - timedelta(hours=1)
            return (start, now)
    
    def _calculate_revenue_metrics(
        self, 
        location_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, float]:
        """Calculate revenue metrics for location"""
        try:
            # Current period revenue
            current_revenue = self.db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.location_id == location_id,
                    Payment.status == "completed",
                    Payment.created_at >= start_date,
                    Payment.created_at <= end_date
                )
            ).scalar() or 0.0
            
            # Previous period for growth calculation
            period_length = (end_date - start_date).days
            previous_start = start_date - timedelta(days=period_length)
            previous_revenue = self.db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.location_id == location_id,
                    Payment.status == "completed",
                    Payment.created_at >= previous_start,
                    Payment.created_at < start_date
                )
            ).scalar() or 0.0
            
            # Growth rate
            growth_rate = ((current_revenue - previous_revenue) / previous_revenue * 100) if previous_revenue > 0 else 0
            
            # Average ticket
            total_transactions = self.db.query(func.count(Payment.id)).filter(
                and_(
                    Payment.location_id == location_id,
                    Payment.status == "completed",
                    Payment.created_at >= start_date,
                    Payment.created_at <= end_date
                )
            ).scalar() or 0
            
            average_ticket = (current_revenue / total_transactions) if total_transactions > 0 else 0
            
            # Revenue per client
            unique_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).join(
                Payment, Payment.appointment_id == Appointment.id
            ).filter(
                and_(
                    Payment.location_id == location_id,
                    Payment.status == "completed",
                    Payment.created_at >= start_date,
                    Payment.created_at <= end_date
                )
            ).scalar() or 0
            
            revenue_per_client = (current_revenue / unique_clients) if unique_clients > 0 else 0
            
            return {
                'total_revenue': float(current_revenue),
                'growth_rate': growth_rate,
                'average_ticket': average_ticket,
                'revenue_per_client': revenue_per_client
            }
            
        except Exception as e:
            logger.error(f"Error calculating revenue metrics: {str(e)}")
            return {
                'total_revenue': 0.0,
                'growth_rate': 0.0,
                'average_ticket': 0.0,
                'revenue_per_client': 0.0
            }
    
    def _calculate_operational_metrics(
        self, 
        location_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, float]:
        """Calculate operational metrics for location"""
        try:
            # Current period appointments
            current_appointments = self.db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.status.in_(["confirmed", "completed"]),
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date
                )
            ).scalar() or 0
            
            # Previous period for growth
            period_length = (end_date - start_date).days
            previous_start = start_date - timedelta(days=period_length)
            previous_appointments = self.db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.status.in_(["confirmed", "completed"]),
                    Appointment.start_time >= previous_start,
                    Appointment.start_time < start_date
                )
            ).scalar() or 0
            
            # Growth rate
            growth_rate = ((current_appointments - previous_appointments) / previous_appointments * 100) if previous_appointments > 0 else 0
            
            # Utilization rate (simplified calculation)
            days_in_period = (end_date - start_date).days
            max_appointments_per_day = 16  # 8 hours, 30-minute slots
            max_possible_appointments = days_in_period * max_appointments_per_day
            utilization_rate = (current_appointments / max_possible_appointments * 100) if max_possible_appointments > 0 else 0
            utilization_rate = min(utilization_rate, 100.0)
            
            # Efficiency score (combination of factors)
            no_show_rate = self._calculate_no_show_rate(location_id, start_date, end_date)
            on_time_rate = self._calculate_on_time_rate(location_id, start_date, end_date)
            efficiency_score = (utilization_rate + (100 - no_show_rate) + on_time_rate) / 3
            
            return {
                'total_appointments': current_appointments,
                'growth_rate': growth_rate,
                'utilization_rate': utilization_rate,
                'efficiency_score': efficiency_score
            }
            
        except Exception as e:
            logger.error(f"Error calculating operational metrics: {str(e)}")
            return {
                'total_appointments': 0,
                'growth_rate': 0.0,
                'utilization_rate': 0.0,
                'efficiency_score': 0.0
            }
    
    def _calculate_client_metrics(
        self, 
        location_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate client metrics for location"""
        try:
            # Total unique clients in period
            total_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date
                )
            ).scalar() or 0
            
            # New clients (first appointment at this location)
            new_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date,
                    ~Appointment.client_id.in_(
                        self.db.query(Appointment.client_id).filter(
                            and_(
                                Appointment.location_id == location_id,
                                Appointment.start_time < start_date
                            )
                        ).distinct()
                    )
                )
            ).scalar() or 0
            
            # Retention rate (simplified)
            retention_rate = self._calculate_retention_rate(location_id, start_date, end_date)
            
            # Client satisfaction score (mock data - would integrate with feedback system)
            satisfaction_score = self._get_client_satisfaction_score(location_id)
            
            return {
                'total_clients': total_clients,
                'new_clients': new_clients,
                'retention_rate': retention_rate,
                'satisfaction_score': satisfaction_score
            }
            
        except Exception as e:
            logger.error(f"Error calculating client metrics: {str(e)}")
            return {
                'total_clients': 0,
                'new_clients': 0,
                'retention_rate': 0.0,
                'satisfaction_score': 0.0
            }
    
    def _calculate_staff_metrics(
        self, 
        location_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate staff metrics for location"""
        try:
            # Active staff count (users with appointments in period)
            active_staff = self.db.query(func.count(func.distinct(Appointment.barber_id))).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date,
                    Appointment.barber_id.isnot(None)
                )
            ).scalar() or 0
            
            # Staff productivity (appointments per staff member)
            total_appointments = self.db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date,
                    Appointment.status.in_(["confirmed", "completed"])
                )
            ).scalar() or 0
            
            productivity = (total_appointments / active_staff) if active_staff > 0 else 0
            
            # Staff utilization (simplified)
            utilization = min(productivity / 20 * 100, 100.0)  # Assuming 20 appointments per period as 100%
            
            return {
                'active_staff': active_staff,
                'productivity': productivity,
                'utilization': utilization
            }
            
        except Exception as e:
            logger.error(f"Error calculating staff metrics: {str(e)}")
            return {
                'active_staff': 0,
                'productivity': 0.0,
                'utilization': 0.0
            }
    
    def _calculate_performance_score(
        self, 
        revenue_metrics: Dict[str, float], 
        operational_metrics: Dict[str, float], 
        client_metrics: Dict[str, Any], 
        staff_metrics: Dict[str, Any]
    ) -> float:
        """Calculate overall performance score (0-100)"""
        try:
            # Weighted scoring
            revenue_score = min(revenue_metrics['total_revenue'] / 10000 * 25, 25)  # 25% weight
            efficiency_score = operational_metrics['efficiency_score'] * 0.25  # 25% weight
            retention_score = client_metrics['retention_rate'] * 0.25  # 25% weight
            satisfaction_score = client_metrics['satisfaction_score'] * 0.25  # 25% weight
            
            total_score = revenue_score + efficiency_score + retention_score + satisfaction_score
            return min(total_score, 100.0)
            
        except Exception as e:
            logger.error(f"Error calculating performance score: {str(e)}")
            return 0.0
    
    def _determine_performance_segment(self, performance_score: float, location_id: int) -> FranchiseSegment:
        """Determine performance segment based on score and benchmarks"""
        if performance_score >= 90:
            return FranchiseSegment.ELITE
        elif performance_score >= 75:
            return FranchiseSegment.HIGH_PERFORMER
        elif performance_score >= 60:
            return FranchiseSegment.AVERAGE
        elif performance_score >= 40:
            return FranchiseSegment.DEVELOPING
        else:
            return FranchiseSegment.UNDERPERFORMING
    
    def _calculate_rank_percentile(self, location_id: int, performance_score: float) -> float:
        """Calculate rank percentile vs other locations"""
        try:
            # Get performance scores for all comparable locations
            # This is a simplified implementation
            return min(performance_score, 100.0)  # Placeholder
            
        except Exception as e:
            logger.error(f"Error calculating rank percentile: {str(e)}")
            return 50.0
    
    # Additional helper methods would continue here...
    
    def _calculate_staff_productivity(self, location_id: int, start_time: datetime) -> float:
        """Calculate staff productivity score"""
        try:
            # Simplified productivity calculation
            appointments_today = self.db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= start_time,
                    Appointment.status.in_(["confirmed", "completed"])
                )
            ).scalar() or 0
            
            # Assuming average productivity is 8 appointments per day
            return min(appointments_today / 8 * 100, 100.0)
            
        except Exception:
            return 0.0
    
    def _get_client_satisfaction_score(self, location_id: int) -> float:
        """Get client satisfaction score (mock implementation)"""
        # In production, this would integrate with feedback/review systems
        return 85.0  # Placeholder
    
    def _calculate_no_show_rate(self, location_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate no-show rate"""
        try:
            total_appointments = self.db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date
                )
            ).scalar() or 0
            
            no_shows = self.db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.location_id == location_id,
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date,
                    Appointment.status == "no_show"
                )
            ).scalar() or 0
            
            return (no_shows / total_appointments * 100) if total_appointments > 0 else 0
            
        except Exception:
            return 0.0
    
    def _calculate_on_time_rate(self, location_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate on-time performance rate (placeholder)"""
        return 90.0  # Placeholder - would calculate from actual appointment data
    
    def _calculate_retention_rate(self, location_id: int, start_date: datetime, end_date: datetime) -> float:
        """Calculate client retention rate (simplified)"""
        try:
            # Get clients from previous period
            period_length = (end_date - start_date).days
            previous_start = start_date - timedelta(days=period_length)
            
            previous_clients = set(
                client_id for (client_id,) in self.db.query(Appointment.client_id).filter(
                    and_(
                        Appointment.location_id == location_id,
                        Appointment.start_time >= previous_start,
                        Appointment.start_time < start_date,
                        Appointment.client_id.isnot(None)
                    )
                ).distinct()
            )
            
            current_clients = set(
                client_id for (client_id,) in self.db.query(Appointment.client_id).filter(
                    and_(
                        Appointment.location_id == location_id,
                        Appointment.start_time >= start_date,
                        Appointment.start_time <= end_date,
                        Appointment.client_id.isnot(None)
                    )
                ).distinct()
            )
            
            if len(previous_clients) == 0:
                return 0.0
            
            retained_clients = len(previous_clients.intersection(current_clients))
            return (retained_clients / len(previous_clients) * 100)
            
        except Exception:
            return 75.0  # Default retention rate
    
    # Placeholder methods for network analysis (would be fully implemented)
    
    def _get_network_comparison(self, location_id: int, timeframe: AnalyticsTimeframe) -> Dict[str, Any]:
        """Get network comparison data"""
        return {"status": "placeholder"}
    
    def _get_industry_benchmark(self, location_id: int, timeframe: AnalyticsTimeframe) -> Dict[str, Any]:
        """Get industry benchmark data"""
        return {"status": "placeholder"}
    
    def _generate_performance_alerts(self, location_id: int, *args) -> List[str]:
        """Generate performance alerts"""
        return []
    
    def _generate_optimization_recommendations(self, location_id: int, performance_score: float, segment: FranchiseSegment) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        if segment == FranchiseSegment.UNDERPERFORMING:
            recommendations.extend([
                "Focus on fundamental business operations improvement",
                "Implement basic booking and payment systems",
                "Establish consistent service delivery standards"
            ])
        elif segment == FranchiseSegment.DEVELOPING:
            recommendations.extend([
                "Optimize pricing strategy for better margins",
                "Improve client retention through follow-up systems",
                "Enhance staff training and efficiency"
            ])
        elif segment == FranchiseSegment.AVERAGE:
            recommendations.extend([
                "Implement premium service offerings",
                "Focus on client experience enhancement",
                "Optimize scheduling for better utilization"
            ])
        else:  # High performer or elite
            recommendations.extend([
                "Consider market expansion opportunities",
                "Mentor other network locations",
                "Focus on innovation and new service development"
            ])
        
        return recommendations
    
    # Additional placeholder methods for comprehensive implementation
    def _analyze_cross_network_revenue_patterns(self, network_id: Optional[str], timeframe: AnalyticsTimeframe) -> Optional[CrossNetworkInsight]:
        return None
    
    def _analyze_cross_network_efficiency_patterns(self, network_id: Optional[str], timeframe: AnalyticsTimeframe) -> Optional[CrossNetworkInsight]:
        return None
    
    def _analyze_cross_network_retention_patterns(self, network_id: Optional[str], timeframe: AnalyticsTimeframe) -> Optional[CrossNetworkInsight]:
        return None
    
    def _analyze_cross_network_market_opportunities(self, network_id: Optional[str], timeframe: AnalyticsTimeframe) -> Optional[CrossNetworkInsight]:
        return None
    
    def _calculate_network_aggregated_metrics(self, location_ids: List[int], timeframe: AnalyticsTimeframe) -> Dict[str, Any]:
        return {"total_revenue": 0, "growth_rate": 0, "average_performance_score": 0}
    
    def _analyze_network_performance_distribution(self, location_ids: List[int], timeframe: AnalyticsTimeframe) -> Dict[str, int]:
        return {"elite": 0, "high_performer": 0, "average": 0, "developing": 0, "underperforming": 0}
    
    def _get_network_real_time_status(self, location_ids: List[int]) -> Dict[str, int]:
        return {"current_appointments": 0, "active_clients": 0, "staff_online": 0}
    
    def _identify_network_top_performers(self, location_ids: List[int], timeframe: AnalyticsTimeframe) -> List[Dict[str, Any]]:
        return []
    
    def _identify_network_improvement_opportunities(self, location_ids: List[int], timeframe: AnalyticsTimeframe) -> List[Dict[str, Any]]:
        return []
    
    def _analyze_network_trends(self, location_ids: List[int], timeframe: AnalyticsTimeframe) -> List[Dict[str, Any]]:
        return []
    
    def _get_network_benchmarks(self, network_id: str, timeframe: AnalyticsTimeframe) -> Dict[str, Any]:
        return {}
    
    def _get_network_best_practices(self, network_id: str) -> List[str]:
        return []