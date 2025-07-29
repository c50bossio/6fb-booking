"""
Business Calendar Metadata Service for 6FB Booking V2

This service manages business intelligence metadata linked to Google Calendar events,
enabling AI-powered business insights and coaching based on calendar data.

Features:
- Business metadata storage linked to Google Calendar events
- Six Figure Barber methodology metrics tracking
- AI agent coaching triggers based on calendar patterns
- Revenue optimization insights from appointment data
- Client journey tracking and business intelligence
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc

from models import (
    User, Appointment, GoogleCalendarSyncLog, 
    SixFBRevenueMetrics, AgentConversation, Agent
)
from services.google_calendar_service import GoogleCalendarService, CalendarEvent
from utils.timezone import get_user_timezone

logger = logging.getLogger(__name__)


@dataclass
class BusinessCalendarMetadata:
    """Business intelligence metadata for calendar events."""
    google_event_id: str
    appointment_id: Optional[int]
    user_id: int
    
    # Six Figure Barber methodology metrics
    service_category: str
    service_tier: str  # basic, premium, luxury
    client_value_tier: str  # new, regular, vip, six_figure
    expected_revenue: float
    actual_revenue: Optional[float]
    
    # Business intelligence data
    client_ltv: Optional[float]  # Lifetime value
    client_frequency: int  # Appointments per month
    referral_source: Optional[str]
    service_add_ons: List[str]
    
    # AI coaching triggers
    coaching_opportunities: List[str]
    optimization_flags: List[str]
    six_fb_compliance_score: Optional[float]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON storage."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BusinessCalendarMetadata':
        """Create from dictionary loaded from JSON."""
        # Handle datetime fields
        if isinstance(data.get('created_at'), str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if isinstance(data.get('updated_at'), str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
            
        return cls(**data)


class BusinessCalendarMetadataService:
    """Service for managing business metadata linked to Google Calendar events."""
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.google_calendar_service = GoogleCalendarService(db)
    
    def create_business_metadata(
        self, 
        appointment: Appointment,
        google_event_id: str,
        additional_metadata: Optional[Dict[str, Any]] = None
    ) -> BusinessCalendarMetadata:
        """Create business metadata for a calendar event."""
        try:
            # Calculate client metrics
            client_ltv = self._calculate_client_ltv(appointment.client_id) if appointment.client else None
            client_frequency = self._calculate_client_frequency(appointment.client_id) if appointment.client else 0
            client_value_tier = self._determine_client_value_tier(client_ltv, client_frequency)
            
            # Determine service tier and category
            service_tier = self._determine_service_tier(appointment.service_name, appointment.price)
            service_category = self._categorize_service(appointment.service_name)
            
            # Calculate Six Figure Barber compliance
            six_fb_score = self._calculate_six_fb_compliance(appointment)
            
            # Identify coaching opportunities
            coaching_opportunities = self._identify_coaching_opportunities(appointment, client_value_tier)
            optimization_flags = self._identify_optimization_flags(appointment, service_tier)
            
            # Create metadata object
            metadata = BusinessCalendarMetadata(
                google_event_id=google_event_id,
                appointment_id=appointment.id,
                user_id=appointment.barber_id,
                service_category=service_category,
                service_tier=service_tier,
                client_value_tier=client_value_tier,
                expected_revenue=appointment.price,
                actual_revenue=None,  # To be updated after completion
                client_ltv=client_ltv,
                client_frequency=client_frequency,
                referral_source=appointment.notes if 'referral' in (appointment.notes or '').lower() else None,
                service_add_ons=self._extract_add_ons(appointment.notes),
                coaching_opportunities=coaching_opportunities,
                optimization_flags=optimization_flags,
                six_fb_compliance_score=six_fb_score,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Merge any additional metadata
            if additional_metadata:
                metadata.__dict__.update(additional_metadata)
            
            # Store metadata in Google Calendar event description
            self._store_metadata_in_calendar_event(appointment.barber, google_event_id, metadata)
            
            # Log the creation
            self.logger.info(f"Created business metadata for event {google_event_id}, appointment {appointment.id}")
            
            # Trigger AI coaching if opportunities identified
            if coaching_opportunities:
                self._trigger_ai_coaching(appointment.barber, metadata)
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Error creating business metadata: {str(e)}")
            raise
    
    def get_business_metadata(self, google_event_id: str) -> Optional[BusinessCalendarMetadata]:
        """Retrieve business metadata from Google Calendar event."""
        try:
            # Find the sync log to get user info
            sync_log = self.db.query(GoogleCalendarSyncLog).filter(
                GoogleCalendarSyncLog.google_event_id == google_event_id
            ).first()
            
            if not sync_log:
                return None
            
            user = self.db.query(User).filter(User.id == sync_log.user_id).first()
            if not user:
                return None
            
            # Get the Google Calendar event
            service = self.google_calendar_service.get_calendar_service(user)
            event = service.events().get(
                calendarId=user.google_calendar_id or 'primary',
                eventId=google_event_id
            ).execute()
            
            # Extract metadata from event description
            description = event.get('description', '')
            metadata_json = self._extract_metadata_from_description(description)
            
            if metadata_json:
                return BusinessCalendarMetadata.from_dict(metadata_json)
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error retrieving business metadata: {str(e)}")
            return None
    
    def update_business_metadata(
        self, 
        google_event_id: str, 
        updates: Dict[str, Any]
    ) -> Optional[BusinessCalendarMetadata]:
        """Update business metadata for a calendar event."""
        try:
            metadata = self.get_business_metadata(google_event_id)
            if not metadata:
                return None
            
            # Apply updates
            for key, value in updates.items():
                if hasattr(metadata, key):
                    setattr(metadata, key, value)
            
            metadata.updated_at = datetime.utcnow()
            
            # Update in Google Calendar
            sync_log = self.db.query(GoogleCalendarSyncLog).filter(
                GoogleCalendarSyncLog.google_event_id == google_event_id
            ).first()
            
            if sync_log:
                user = self.db.query(User).filter(User.id == sync_log.user_id).first()
                if user:
                    self._store_metadata_in_calendar_event(user, google_event_id, metadata)
            
            self.logger.info(f"Updated business metadata for event {google_event_id}")
            return metadata
            
        except Exception as e:
            self.logger.error(f"Error updating business metadata: {str(e)}")
            return None
    
    def get_business_insights(self, user_id: int, days_back: int = 30) -> Dict[str, Any]:
        """Generate business insights from calendar metadata."""
        try:
            # Get recent appointments
            since_date = datetime.utcnow() - timedelta(days=days_back)
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= since_date
                )
            ).all()
            
            # Collect metadata for analysis
            metadata_list = []
            for appointment in appointments:
                if hasattr(appointment, 'google_event_id') and appointment.google_event_id:
                    metadata = self.get_business_metadata(appointment.google_event_id)
                    if metadata:
                        metadata_list.append(metadata)
            
            # Calculate insights
            insights = {
                'total_appointments': len(appointments),
                'total_revenue': sum(apt.price for apt in appointments),
                'average_service_price': sum(apt.price for apt in appointments) / len(appointments) if appointments else 0,
                'service_tier_distribution': self._calculate_service_tier_distribution(metadata_list),
                'client_value_distribution': self._calculate_client_value_distribution(metadata_list),
                'coaching_opportunities': self._aggregate_coaching_opportunities(metadata_list),
                'optimization_recommendations': self._generate_optimization_recommendations(metadata_list),
                'six_fb_compliance_average': self._calculate_average_compliance(metadata_list),
                'revenue_trends': self._calculate_revenue_trends(appointments),
                'top_services': self._calculate_top_services(appointments),
                'client_retention_metrics': self._calculate_retention_metrics(user_id, days_back)
            }
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Error generating business insights: {str(e)}")
            return {}
    
    def trigger_ai_coaching_session(self, user_id: int, coaching_type: str, context: Dict[str, Any]) -> bool:
        """Trigger an AI coaching session based on calendar insights."""
        try:
            # Find appropriate AI agent
            agent = self.db.query(Agent).filter(
                and_(
                    Agent.name.ilike(f'%{coaching_type}%'),
                    Agent.status == 'active'
                )
            ).first()
            
            if not agent:
                # Create a generic business coach agent entry
                agent = Agent(
                    name=f"{coaching_type.title()} Coach",
                    type='business_coach',
                    description=f"AI coach specializing in {coaching_type} optimization",
                    system_prompt=f"You are an expert business coach specializing in {coaching_type} for barbershops.",
                    status='active'
                )
                self.db.add(agent)
                self.db.commit()
            
            # Create coaching conversation
            coaching_message = self._generate_coaching_message(coaching_type, context)
            
            conversation = AgentConversation(
                agent_id=agent.id,
                user_id=user_id,
                title=f"{coaching_type.title()} Coaching Session",
                initial_message=coaching_message,
                status='active'
            )
            
            self.db.add(conversation)
            self.db.commit()
            
            self.logger.info(f"Triggered AI coaching session for user {user_id}: {coaching_type}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error triggering AI coaching session: {str(e)}")
            return False
    
    # Private helper methods
    
    def _calculate_client_ltv(self, client_id: Optional[int]) -> Optional[float]:
        """Calculate client lifetime value."""
        if not client_id:
            return None
        
        appointments = self.db.query(Appointment).filter(
            Appointment.client_id == client_id
        ).all()
        
        return sum(apt.price for apt in appointments)
    
    def _calculate_client_frequency(self, client_id: Optional[int]) -> int:
        """Calculate client appointment frequency (appointments per month)."""
        if not client_id:
            return 0
        
        three_months_ago = datetime.utcnow() - timedelta(days=90)
        appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.client_id == client_id,
                Appointment.start_time >= three_months_ago
            )
        ).count()
        
        return int(appointments / 3)  # Monthly average
    
    def _determine_client_value_tier(self, ltv: Optional[float], frequency: int) -> str:
        """Determine client value tier based on LTV and frequency."""
        if not ltv:
            return 'new'
        
        if ltv >= 1000 and frequency >= 2:
            return 'six_figure'
        elif ltv >= 500 and frequency >= 1:
            return 'vip'
        elif frequency >= 1:
            return 'regular'
        else:
            return 'new'
    
    def _determine_service_tier(self, service_name: str, price: float) -> str:
        """Determine service tier based on name and price."""
        service_lower = service_name.lower()
        
        if price >= 100 or 'luxury' in service_lower or 'premium' in service_lower:
            return 'luxury'
        elif price >= 60 or 'premium' in service_lower:
            return 'premium'
        else:
            return 'basic'
    
    def _categorize_service(self, service_name: str) -> str:
        """Categorize service type."""
        service_lower = service_name.lower()
        
        if 'beard' in service_lower:
            return 'beard_service'
        elif 'cut' in service_lower or 'hair' in service_lower:
            return 'haircut'
        elif 'wash' in service_lower or 'shampoo' in service_lower:
            return 'hair_care'
        elif 'color' in service_lower or 'dye' in service_lower:
            return 'coloring'
        else:
            return 'other'
    
    def _calculate_six_fb_compliance(self, appointment: Appointment) -> float:
        """Calculate Six Figure Barber methodology compliance score."""
        score = 80.0  # Base score
        
        # Adjust based on pricing
        if appointment.price >= 80:
            score += 10
        elif appointment.price < 40:
            score -= 10
        
        # Adjust based on service quality indicators
        if appointment.notes and len(appointment.notes) > 20:
            score += 5  # Detailed notes indicate good service
        
        return min(100.0, max(0.0, score))
    
    def _identify_coaching_opportunities(self, appointment: Appointment, client_tier: str) -> List[str]:
        """Identify coaching opportunities based on appointment data."""
        opportunities = []
        
        if appointment.price < 60:
            opportunities.append('pricing_optimization')
        
        if client_tier == 'new':
            opportunities.append('client_retention_strategy')
        
        if not appointment.notes or len(appointment.notes) < 10:
            opportunities.append('service_documentation')
        
        return opportunities
    
    def _identify_optimization_flags(self, appointment: Appointment, service_tier: str) -> List[str]:
        """Identify optimization flags for business improvement."""
        flags = []
        
        if service_tier == 'basic' and appointment.price > 40:
            flags.append('upselling_opportunity')
        
        if appointment.duration_minutes > 90:
            flags.append('efficiency_review')
        
        return flags
    
    def _extract_add_ons(self, notes: Optional[str]) -> List[str]:
        """Extract add-on services from appointment notes."""
        if not notes:
            return []
        
        add_ons = []
        notes_lower = notes.lower()
        
        if 'beard' in notes_lower:
            add_ons.append('beard_service')
        if 'wash' in notes_lower:
            add_ons.append('hair_wash')
        if 'style' in notes_lower:
            add_ons.append('styling')
        
        return add_ons
    
    def _store_metadata_in_calendar_event(
        self, 
        user: User, 
        google_event_id: str, 
        metadata: BusinessCalendarMetadata
    ):
        """Store business metadata in Google Calendar event description."""
        try:
            service = self.google_calendar_service.get_calendar_service(user)
            
            # Get existing event
            event = service.events().get(
                calendarId=user.google_calendar_id or 'primary',
                eventId=google_event_id
            ).execute()
            
            # Update description with metadata
            existing_description = event.get('description', '')
            metadata_marker = "<!-- BUSINESS_METADATA: "
            metadata_end = " -->"
            
            # Remove existing metadata if present
            if metadata_marker in existing_description:
                start_idx = existing_description.find(metadata_marker)
                end_idx = existing_description.find(metadata_end, start_idx)
                if end_idx != -1:
                    existing_description = (
                        existing_description[:start_idx] + 
                        existing_description[end_idx + len(metadata_end):]
                    ).strip()
            
            # Add new metadata
            metadata_json = json.dumps(metadata.to_dict(), default=str)
            new_description = f"{existing_description}\n\n{metadata_marker}{metadata_json}{metadata_end}"
            
            # Update event
            event['description'] = new_description
            service.events().update(
                calendarId=user.google_calendar_id or 'primary',
                eventId=google_event_id,
                body=event
            ).execute()
            
        except Exception as e:
            self.logger.error(f"Error storing metadata in calendar event: {str(e)}")
    
    def _extract_metadata_from_description(self, description: str) -> Optional[Dict[str, Any]]:
        """Extract business metadata from calendar event description."""
        try:
            metadata_marker = "<!-- BUSINESS_METADATA: "
            metadata_end = " -->"
            
            if metadata_marker in description:
                start_idx = description.find(metadata_marker) + len(metadata_marker)
                end_idx = description.find(metadata_end, start_idx)
                
                if end_idx != -1:
                    metadata_json = description[start_idx:end_idx]
                    return json.loads(metadata_json)
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error extracting metadata from description: {str(e)}")
            return None
    
    def _trigger_ai_coaching(self, user: User, metadata: BusinessCalendarMetadata):
        """Trigger AI coaching based on identified opportunities."""
        for opportunity in metadata.coaching_opportunities:
            context = {
                'service_tier': metadata.service_tier,
                'client_value_tier': metadata.client_value_tier,
                'expected_revenue': metadata.expected_revenue,
                'six_fb_score': metadata.six_fb_compliance_score
            }
            
            self.trigger_ai_coaching_session(user.id, opportunity, context)
    
    def _generate_coaching_message(self, coaching_type: str, context: Dict[str, Any]) -> str:
        """Generate initial coaching message based on type and context."""
        messages = {
            'pricing_optimization': f"""
                I've noticed an opportunity to optimize your pricing strategy. Based on your recent appointment data:
                
                - Current service tier: {context.get('service_tier', 'Unknown')}
                - Expected revenue: ${context.get('expected_revenue', 0)}
                - Six Figure Barber compliance: {context.get('six_fb_score', 0)}%
                
                Let's discuss strategies to increase your average ticket while maintaining client satisfaction.
            """,
            'client_retention_strategy': f"""
                I see you have new clients that could benefit from a retention strategy. Here's what I've observed:
                
                - Client tier: {context.get('client_value_tier', 'Unknown')}
                - Service quality score: {context.get('six_fb_score', 0)}%
                
                Let's work on converting these new clients into regulars with targeted follow-up strategies.
            """,
            'service_documentation': f"""
                I noticed your service documentation could be enhanced. Better documentation helps with:
                
                - Client relationship building
                - Service consistency
                - Upselling opportunities
                
                Would you like tips on improving your appointment notes and client communication?
            """
        }
        
        return messages.get(coaching_type, f"Let's discuss {coaching_type} optimization strategies for your business.")
    
    # Analytics helper methods
    
    def _calculate_service_tier_distribution(self, metadata_list: List[BusinessCalendarMetadata]) -> Dict[str, int]:
        """Calculate distribution of service tiers."""
        distribution = {}
        for metadata in metadata_list:
            tier = metadata.service_tier
            distribution[tier] = distribution.get(tier, 0) + 1
        return distribution
    
    def _calculate_client_value_distribution(self, metadata_list: List[BusinessCalendarMetadata]) -> Dict[str, int]:
        """Calculate distribution of client value tiers."""
        distribution = {}
        for metadata in metadata_list:
            tier = metadata.client_value_tier
            distribution[tier] = distribution.get(tier, 0) + 1
        return distribution
    
    def _aggregate_coaching_opportunities(self, metadata_list: List[BusinessCalendarMetadata]) -> Dict[str, int]:
        """Aggregate coaching opportunities across appointments."""
        opportunities = {}
        for metadata in metadata_list:
            for opportunity in metadata.coaching_opportunities:
                opportunities[opportunity] = opportunities.get(opportunity, 0) + 1
        return opportunities
    
    def _generate_optimization_recommendations(self, metadata_list: List[BusinessCalendarMetadata]) -> List[str]:
        """Generate optimization recommendations based on metadata analysis."""
        recommendations = []
        
        # Analyze pricing patterns
        avg_price = sum(m.expected_revenue for m in metadata_list) / len(metadata_list) if metadata_list else 0
        if avg_price < 65:
            recommendations.append("Consider raising average service prices to align with Six Figure Barber standards")
        
        # Analyze client value distribution
        new_client_ratio = sum(1 for m in metadata_list if m.client_value_tier == 'new') / len(metadata_list) if metadata_list else 0
        if new_client_ratio > 0.4:
            recommendations.append("Focus on client retention strategies to convert new clients to regulars")
        
        # Analyze service tiers
        basic_service_ratio = sum(1 for m in metadata_list if m.service_tier == 'basic') / len(metadata_list) if metadata_list else 0
        if basic_service_ratio > 0.6:
            recommendations.append("Increase premium service offerings to boost average revenue per client")
        
        return recommendations
    
    def _calculate_average_compliance(self, metadata_list: List[BusinessCalendarMetadata]) -> float:
        """Calculate average Six Figure Barber compliance score."""
        if not metadata_list:
            return 0.0
        
        scores = [m.six_fb_compliance_score for m in metadata_list if m.six_fb_compliance_score is not None]
        return sum(scores) / len(scores) if scores else 0.0
    
    def _calculate_revenue_trends(self, appointments: List[Appointment]) -> Dict[str, Any]:
        """Calculate revenue trends from appointments."""
        if not appointments:
            return {'trend': 'stable', 'growth_rate': 0}
        
        # Sort by date
        sorted_appointments = sorted(appointments, key=lambda x: x.start_time)
        
        # Calculate weekly revenue
        weekly_revenue = {}
        for appointment in sorted_appointments:
            week_key = appointment.start_time.strftime('%Y-W%U')
            weekly_revenue[week_key] = weekly_revenue.get(week_key, 0) + appointment.price
        
        # Determine trend
        weeks = list(weekly_revenue.keys())
        if len(weeks) >= 2:
            recent_avg = sum(weekly_revenue[w] for w in weeks[-2:]) / 2
            earlier_avg = sum(weekly_revenue[w] for w in weeks[:-2]) / max(1, len(weeks) - 2)
            growth_rate = ((recent_avg - earlier_avg) / earlier_avg * 100) if earlier_avg > 0 else 0
            
            if growth_rate > 10:
                trend = 'growing'
            elif growth_rate < -10:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'
            growth_rate = 0
        
        return {
            'trend': trend,
            'growth_rate': growth_rate,
            'weekly_revenue': weekly_revenue
        }
    
    def _calculate_top_services(self, appointments: List[Appointment]) -> List[Dict[str, Any]]:
        """Calculate top services by frequency and revenue."""
        service_stats = {}
        
        for appointment in appointments:
            service_name = appointment.service_name
            if service_name not in service_stats:
                service_stats[service_name] = {'count': 0, 'revenue': 0}
            
            service_stats[service_name]['count'] += 1
            service_stats[service_name]['revenue'] += appointment.price
        
        # Sort by revenue
        top_services = sorted(
            service_stats.items(),
            key=lambda x: x[1]['revenue'],
            reverse=True
        )[:5]
        
        return [
            {
                'name': name,
                'count': stats['count'],
                'revenue': stats['revenue'],
                'avg_price': stats['revenue'] / stats['count']
            }
            for name, stats in top_services
        ]
    
    def _calculate_retention_metrics(self, user_id: int, days_back: int) -> Dict[str, Any]:
        """Calculate client retention metrics."""
        # Get unique clients in the period
        since_date = datetime.utcnow() - timedelta(days=days_back)
        appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == user_id,
                Appointment.start_time >= since_date,
                Appointment.client_id.isnot(None)
            )
        ).all()
        
        client_appointment_counts = {}
        for appointment in appointments:
            client_id = appointment.client_id
            client_appointment_counts[client_id] = client_appointment_counts.get(client_id, 0) + 1
        
        total_clients = len(client_appointment_counts)
        repeat_clients = sum(1 for count in client_appointment_counts.values() if count > 1)
        
        return {
            'total_unique_clients': total_clients,
            'repeat_clients': repeat_clients,
            'retention_rate': (repeat_clients / total_clients * 100) if total_clients > 0 else 0,
            'avg_appointments_per_client': sum(client_appointment_counts.values()) / total_clients if total_clients > 0 else 0
        }