"""
Location Management Service
Handles multi-location operations, analytics, and business management
"""
import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models.location import Location, LocationAnalytics
from models.barber import Barber
from models.appointment import Appointment
from models.client import Client
from models.user import User
from config.database import get_db
from .sixfb_calculator import SixFBCalculator

logger = logging.getLogger(__name__)

class LocationManagementService:
    """Service for managing multiple barbershop locations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # Location CRUD Operations
    async def create_location(self, location_data: Dict[str, Any]) -> Location:
        """Create new barbershop location"""
        try:
            # Generate unique location code if not provided
            if 'location_code' not in location_data:
                location_data['location_code'] = self._generate_location_code(location_data.get('name', ''))
            
            location = Location(**location_data)
            self.db.add(location)
            self.db.commit()
            self.db.refresh(location)
            
            logger.info(f"Created location: {location.name} ({location.location_code})")
            return location
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating location: {e}")
            raise
    
    def get_location(self, location_id: int) -> Optional[Location]:
        """Get location by ID"""
        return self.db.query(Location).filter(Location.id == location_id).first()
    
    def get_location_by_code(self, location_code: str) -> Optional[Location]:
        """Get location by unique code"""
        return self.db.query(Location).filter(Location.location_code == location_code).first()
    
    def get_all_locations(self, include_inactive: bool = False) -> List[Location]:
        """Get all locations"""
        query = self.db.query(Location)
        if not include_inactive:
            query = query.filter(Location.is_active == True)
        return query.order_by(Location.name).all()
    
    def get_user_accessible_locations(self, user: User) -> List[Location]:
        """Get locations accessible to specific user"""
        if user.role in ["super_admin", "admin"]:
            return self.get_all_locations()
        
        elif user.role == "mentor":
            # Mentors can access their assigned locations
            return self.db.query(Location).filter(Location.mentor_id == user.id).all()
        
        elif user.role in ["barber", "staff"]:
            # Barbers/staff can access their primary location and any additional assigned locations
            accessible_location_ids = user.accessible_locations or []
            if user.primary_location_id:
                accessible_location_ids.append(user.primary_location_id)
            
            if accessible_location_ids:
                return self.db.query(Location).filter(Location.id.in_(accessible_location_ids)).all()
        
        return []
    
    async def update_location(self, location_id: int, update_data: Dict[str, Any]) -> Location:
        """Update location information"""
        try:
            location = self.get_location(location_id)
            if not location:
                raise ValueError(f"Location {location_id} not found")
            
            for key, value in update_data.items():
                if hasattr(location, key):
                    setattr(location, key, value)
            
            location.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(location)
            
            logger.info(f"Updated location: {location.name}")
            return location
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating location {location_id}: {e}")
            raise
    
    async def deactivate_location(self, location_id: int) -> bool:
        """Deactivate location (soft delete)"""
        try:
            location = self.get_location(location_id)
            if not location:
                return False
            
            location.is_active = False
            location.updated_at = datetime.utcnow()
            self.db.commit()
            
            logger.info(f"Deactivated location: {location.name}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deactivating location {location_id}: {e}")
            return False
    
    # Analytics and Performance
    async def calculate_location_analytics(self, location_id: int, period_type: str = "weekly", 
                                         start_date: Optional[date] = None, 
                                         end_date: Optional[date] = None) -> Dict[str, Any]:
        """Calculate comprehensive analytics for location"""
        try:
            location = self.get_location(location_id)
            if not location:
                raise ValueError(f"Location {location_id} not found")
            
            # Set default date range
            if not end_date:
                end_date = date.today()
            
            if not start_date:
                if period_type == "daily":
                    start_date = end_date
                elif period_type == "weekly":
                    start_date = end_date - timedelta(days=7)
                elif period_type == "monthly":
                    start_date = end_date - timedelta(days=30)
                else:
                    start_date = end_date - timedelta(days=7)
            
            # Get location barbers
            barbers = self.db.query(Barber).filter(Barber.location_id == location_id).all()
            barber_ids = [b.id for b in barbers]
            
            if not barber_ids:
                return self._empty_analytics_response(location, period_type, start_date, end_date)
            
            # Get appointments for the period
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id.in_(barber_ids),
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date
                )
            ).all()
            
            completed_appointments = [a for a in appointments if a.status == 'completed']
            
            # Calculate metrics
            analytics = await self._calculate_comprehensive_metrics(
                location, barbers, appointments, completed_appointments, start_date, end_date
            )
            
            # Save analytics to database
            await self._save_location_analytics(location_id, period_type, start_date, end_date, analytics)
            
            return analytics
            
        except Exception as e:
            logger.error(f"Error calculating location analytics for {location_id}: {e}")
            raise
    
    async def _calculate_comprehensive_metrics(self, location: Location, barbers: List[Barber], 
                                             appointments: List[Appointment], 
                                             completed_appointments: List[Appointment],
                                             start_date: date, end_date: date) -> Dict[str, Any]:
        """Calculate comprehensive metrics for location"""
        
        # Basic revenue metrics
        total_revenue = sum(
            (a.service_revenue or 0) + (a.tip_amount or 0) + (a.product_revenue or 0)
            for a in completed_appointments
        )
        
        service_revenue = sum(a.service_revenue or 0 for a in completed_appointments)
        tip_revenue = sum(a.tip_amount or 0 for a in completed_appointments)
        product_revenue = sum(a.product_revenue or 0 for a in completed_appointments)
        
        # Appointment metrics
        total_appointments = len(appointments)
        completed_count = len(completed_appointments)
        completion_rate = (completed_count / total_appointments * 100) if total_appointments > 0 else 0
        
        # Client metrics
        unique_clients = len(set(a.client_id for a in completed_appointments if a.client_id))
        new_clients = len([a for a in completed_appointments if a.customer_type == 'new'])
        returning_clients = len([a for a in completed_appointments if a.customer_type == 'returning'])
        
        # Calculate average ticket
        average_ticket = total_revenue / completed_count if completed_count > 0 else 0
        
        # Calculate 6FB scores for all barbers
        total_6fb_score = 0
        barber_scores = {}
        
        for barber in barbers:
            calculator = SixFBCalculator(self.db)
            barber_score = calculator.calculate_sixfb_score(barber.id, "weekly", start_date, end_date)
            barber_scores[barber.id] = barber_score
            total_6fb_score += barber_score.get('overall_score', 0)
        
        average_6fb_score = total_6fb_score / len(barbers) if barbers else 0
        
        # Operational metrics
        no_shows = len([a for a in appointments if a.status == 'no_show'])
        cancellations = len([a for a in appointments if a.status == 'cancelled'])
        
        no_show_rate = (no_shows / total_appointments * 100) if total_appointments > 0 else 0
        cancellation_rate = (cancellations / total_appointments * 100) if total_appointments > 0 else 0
        
        # Team metrics
        active_barbers = len(barbers)
        revenue_per_barber = total_revenue / active_barbers if active_barbers > 0 else 0
        appointments_per_barber = completed_count / active_barbers if active_barbers > 0 else 0
        
        # Target achievement
        days_in_period = (end_date - start_date).days + 1
        
        # Calculate monthly target achievement (assuming targets are monthly)
        monthly_revenue_target = location.monthly_revenue_target or 0
        monthly_appointment_target = location.monthly_appointment_target or 0
        
        # Prorate targets based on period length
        period_revenue_target = (monthly_revenue_target / 30) * days_in_period
        period_appointment_target = (monthly_appointment_target / 30) * days_in_period
        
        revenue_target_achievement = (total_revenue / period_revenue_target * 100) if period_revenue_target > 0 else 0
        appointment_target_achievement = (completed_count / period_appointment_target * 100) if period_appointment_target > 0 else 0
        
        # Client retention calculation
        retention_rate = (returning_clients / (new_clients + returning_clients) * 100) if (new_clients + returning_clients) > 0 else 0
        
        return {
            'location_id': location.id,
            'location_name': location.name,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days_in_period
            },
            'revenue': {
                'total': total_revenue,
                'service': service_revenue,
                'tips': tip_revenue,
                'products': product_revenue,
                'average_ticket': average_ticket,
                'target_achievement': revenue_target_achievement
            },
            'appointments': {
                'total': total_appointments,
                'completed': completed_count,
                'completion_rate': completion_rate,
                'target_achievement': appointment_target_achievement
            },
            'clients': {
                'unique': unique_clients,
                'new': new_clients,
                'returning': returning_clients,
                'retention_rate': retention_rate
            },
            'performance': {
                'average_6fb_score': average_6fb_score,
                'no_show_rate': no_show_rate,
                'cancellation_rate': cancellation_rate
            },
            'team': {
                'active_barbers': active_barbers,
                'revenue_per_barber': revenue_per_barber,
                'appointments_per_barber': appointments_per_barber,
                'barber_scores': barber_scores
            },
            'targets': {
                'revenue_target': period_revenue_target,
                'appointment_target': period_appointment_target,
                'sixfb_target': location.target_6fb_score or 85.0
            }
        }
    
    def _empty_analytics_response(self, location: Location, period_type: str, 
                                 start_date: date, end_date: date) -> Dict[str, Any]:
        """Return empty analytics response when no barbers/data"""
        return {
            'location_id': location.id,
            'location_name': location.name,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': (end_date - start_date).days + 1
            },
            'revenue': {'total': 0, 'service': 0, 'tips': 0, 'products': 0, 'average_ticket': 0, 'target_achievement': 0},
            'appointments': {'total': 0, 'completed': 0, 'completion_rate': 0, 'target_achievement': 0},
            'clients': {'unique': 0, 'new': 0, 'returning': 0, 'retention_rate': 0},
            'performance': {'average_6fb_score': 0, 'no_show_rate': 0, 'cancellation_rate': 0},
            'team': {'active_barbers': 0, 'revenue_per_barber': 0, 'appointments_per_barber': 0, 'barber_scores': {}},
            'targets': {
                'revenue_target': location.monthly_revenue_target or 0,
                'appointment_target': location.monthly_appointment_target or 0,
                'sixfb_target': location.target_6fb_score or 85.0
            }
        }
    
    async def _save_location_analytics(self, location_id: int, period_type: str, 
                                     start_date: date, end_date: date, analytics: Dict[str, Any]):
        """Save calculated analytics to database"""
        try:
            # Check if analytics already exist for this period
            existing = self.db.query(LocationAnalytics).filter(
                and_(
                    LocationAnalytics.location_id == location_id,
                    LocationAnalytics.period_type == period_type,
                    LocationAnalytics.period_start == start_date,
                    LocationAnalytics.period_end == end_date
                )
            ).first()
            
            analytics_data = {
                'location_id': location_id,
                'period_type': period_type,
                'period_start': datetime.combine(start_date, datetime.min.time()),
                'period_end': datetime.combine(end_date, datetime.max.time()),
                'total_revenue': analytics['revenue']['total'],
                'total_appointments': analytics['appointments']['completed'],
                'total_clients': analytics['clients']['unique'],
                'new_clients': analytics['clients']['new'],
                'returning_clients': analytics['clients']['returning'],
                'average_6fb_score': analytics['performance']['average_6fb_score'],
                'client_retention_rate': analytics['clients']['retention_rate'],
                'average_ticket': analytics['revenue']['average_ticket'],
                'active_barbers': analytics['team']['active_barbers'],
                'revenue_per_barber': analytics['team']['revenue_per_barber'],
                'no_show_rate': analytics['performance']['no_show_rate'],
                'cancellation_rate': analytics['performance']['cancellation_rate'],
                'revenue_target_achievement': analytics['revenue']['target_achievement'],
                'calculated_at': datetime.utcnow()
            }
            
            if existing:
                # Update existing record
                for key, value in analytics_data.items():
                    if hasattr(existing, key):
                        setattr(existing, key, value)
            else:
                # Create new record
                location_analytics = LocationAnalytics(**analytics_data)
                self.db.add(location_analytics)
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error saving location analytics: {e}")
    
    # Network-wide Analytics
    async def get_network_overview(self) -> Dict[str, Any]:
        """Get overview of entire 6FB network"""
        try:
            locations = self.get_all_locations()
            
            network_stats = {
                'total_locations': len(locations),
                'active_locations': len([l for l in locations if l.is_active]),
                'total_revenue': 0,
                'total_appointments': 0,
                'total_barbers': 0,
                'average_6fb_score': 0,
                'top_performing_locations': [],
                'locations_needing_attention': []
            }
            
            location_performance = []
            
            for location in locations:
                if not location.is_active:
                    continue
                
                # Get recent analytics for each location
                analytics = await self.calculate_location_analytics(location.id, "weekly")
                
                location_performance.append({
                    'location': location,
                    'analytics': analytics
                })
                
                # Aggregate network stats
                network_stats['total_revenue'] += analytics['revenue']['total']
                network_stats['total_appointments'] += analytics['appointments']['completed']
                network_stats['total_barbers'] += analytics['team']['active_barbers']
            
            # Calculate averages
            if location_performance:
                network_stats['average_6fb_score'] = sum(
                    lp['analytics']['performance']['average_6fb_score'] for lp in location_performance
                ) / len(location_performance)
                
                # Sort by performance
                location_performance.sort(
                    key=lambda x: x['analytics']['performance']['average_6fb_score'], 
                    reverse=True
                )
                
                # Top performers (top 25%)
                top_count = max(1, len(location_performance) // 4)
                network_stats['top_performing_locations'] = [
                    {
                        'location_id': lp['location'].id,
                        'name': lp['location'].name,
                        'sixfb_score': lp['analytics']['performance']['average_6fb_score'],
                        'revenue': lp['analytics']['revenue']['total']
                    }
                    for lp in location_performance[:top_count]
                ]
                
                # Locations needing attention (bottom 25% or score < 70)
                attention_threshold = 70.0
                network_stats['locations_needing_attention'] = [
                    {
                        'location_id': lp['location'].id,
                        'name': lp['location'].name,
                        'sixfb_score': lp['analytics']['performance']['average_6fb_score'],
                        'issues': self._identify_location_issues(lp['analytics'])
                    }
                    for lp in location_performance
                    if lp['analytics']['performance']['average_6fb_score'] < attention_threshold
                ]
            
            return network_stats
            
        except Exception as e:
            logger.error(f"Error getting network overview: {e}")
            raise
    
    def _identify_location_issues(self, analytics: Dict[str, Any]) -> List[str]:
        """Identify issues with location performance"""
        issues = []
        
        if analytics['performance']['average_6fb_score'] < 70:
            issues.append("Low 6FB Score")
        
        if analytics['revenue']['target_achievement'] < 80:
            issues.append("Missing Revenue Target")
        
        if analytics['performance']['no_show_rate'] > 15:
            issues.append("High No-Show Rate")
        
        if analytics['clients']['retention_rate'] < 60:
            issues.append("Low Client Retention")
        
        if analytics['appointments']['completion_rate'] < 85:
            issues.append("Low Appointment Completion")
        
        return issues
    
    # Location Comparison
    async def compare_locations(self, location_ids: List[int], period_type: str = "weekly") -> Dict[str, Any]:
        """Compare performance across multiple locations"""
        try:
            comparison_data = {
                'period_type': period_type,
                'locations': [],
                'comparison_metrics': {}
            }
            
            all_analytics = []
            
            for location_id in location_ids:
                location = self.get_location(location_id)
                if not location:
                    continue
                
                analytics = await self.calculate_location_analytics(location_id, period_type)
                all_analytics.append(analytics)
                comparison_data['locations'].append(analytics)
            
            if not all_analytics:
                return comparison_data
            
            # Calculate comparison metrics
            comparison_data['comparison_metrics'] = {
                'revenue': {
                    'highest': max(a['revenue']['total'] for a in all_analytics),
                    'lowest': min(a['revenue']['total'] for a in all_analytics),
                    'average': sum(a['revenue']['total'] for a in all_analytics) / len(all_analytics)
                },
                'sixfb_score': {
                    'highest': max(a['performance']['average_6fb_score'] for a in all_analytics),
                    'lowest': min(a['performance']['average_6fb_score'] for a in all_analytics),
                    'average': sum(a['performance']['average_6fb_score'] for a in all_analytics) / len(all_analytics)
                },
                'appointments': {
                    'highest': max(a['appointments']['completed'] for a in all_analytics),
                    'lowest': min(a['appointments']['completed'] for a in all_analytics),
                    'average': sum(a['appointments']['completed'] for a in all_analytics) / len(all_analytics)
                }
            }
            
            return comparison_data
            
        except Exception as e:
            logger.error(f"Error comparing locations: {e}")
            raise
    
    # Utility Methods
    def _generate_location_code(self, name: str) -> str:
        """Generate unique location code from name"""
        import re
        import secrets
        
        # Clean and abbreviate name
        clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', name)
        words = clean_name.upper().split()
        
        if len(words) >= 2:
            code_base = words[0][:2] + words[1][:2]
        else:
            code_base = words[0][:4] if words else "LOC"
        
        # Add random suffix to ensure uniqueness
        suffix = secrets.token_hex(2).upper()
        location_code = f"{code_base}{suffix}"
        
        # Ensure uniqueness
        counter = 1
        while self.get_location_by_code(location_code):
            location_code = f"{code_base}{suffix}{counter:02d}"
            counter += 1
        
        return location_code
    
    async def get_location_rankings(self) -> Dict[str, Any]:
        """Get location rankings across various metrics"""
        try:
            locations = self.get_all_locations()
            rankings = {
                'revenue': [],
                'sixfb_score': [],
                'growth': [],
                'efficiency': []
            }
            
            for location in locations:
                analytics = await self.calculate_location_analytics(location.id, "monthly")
                
                rankings['revenue'].append({
                    'location_id': location.id,
                    'name': location.name,
                    'value': analytics['revenue']['total'],
                    'target_achievement': analytics['revenue']['target_achievement']
                })
                
                rankings['sixfb_score'].append({
                    'location_id': location.id,
                    'name': location.name,
                    'value': analytics['performance']['average_6fb_score'],
                    'target_achievement': (analytics['performance']['average_6fb_score'] / 85.0) * 100
                })
                
                rankings['efficiency'].append({
                    'location_id': location.id,
                    'name': location.name,
                    'value': analytics['team']['revenue_per_barber'],
                    'metric': 'Revenue per Barber'
                })
            
            # Sort rankings
            for metric in rankings:
                rankings[metric].sort(key=lambda x: x['value'], reverse=True)
                
                # Add rank numbers
                for i, item in enumerate(rankings[metric]):
                    item['rank'] = i + 1
            
            return rankings
            
        except Exception as e:
            logger.error(f"Error getting location rankings: {e}")
            raise

# Convenience functions for API endpoints
async def get_location_management_service() -> LocationManagementService:
    """Get location management service instance"""
    db = next(get_db())
    return LocationManagementService(db)