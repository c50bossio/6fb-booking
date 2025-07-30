"""
Enhanced Google Calendar Service with Business Intelligence Integration

This service extends the existing Google Calendar integration with:
- Business metadata storage in calendar events
- AI coaching triggers based on calendar patterns
- Six Figure Barber methodology compliance tracking
- Advanced business intelligence linked to calendar data
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from services.google_calendar_service import GoogleCalendarService, CalendarEvent
from services.business_calendar_metadata_service import (
    BusinessCalendarMetadataService, 
    BusinessCalendarMetadata
)
from models import User, Appointment

logger = logging.getLogger(__name__)


class EnhancedGoogleCalendarService(GoogleCalendarService):
    """Enhanced Google Calendar service with business intelligence integration."""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.business_metadata_service = BusinessCalendarMetadataService(db)
    
    def sync_appointment_to_google_with_business_intelligence(
        self, 
        appointment: Appointment,
        include_business_metadata: bool = True
    ) -> Optional[str]:
        """
        Sync appointment to Google Calendar with business intelligence metadata.
        
        This enhanced version:
        1. Creates the Google Calendar event
        2. Generates business intelligence metadata
        3. Stores metadata in the event description
        4. Triggers AI coaching if opportunities are identified
        5. Logs comprehensive sync information
        """
        if not appointment.barber or not appointment.barber.google_calendar_credentials:
            return None
        
        try:
            # First, sync the appointment using the standard method
            google_event_id = self.sync_appointment_to_google(appointment)
            
            if not google_event_id:
                return None
            
            # If business metadata is enabled, create and store it
            if include_business_metadata:
                try:
                    # Create business metadata
                    metadata = self.business_metadata_service.create_business_metadata(
                        appointment=appointment,
                        google_event_id=google_event_id
                    )
                    
                    self.logger.info(
                        f"Created business metadata for appointment {appointment.id}, "
                        f"Google event {google_event_id}. "
                        f"Coaching opportunities: {len(metadata.coaching_opportunities)}"
                    )
                    
                    # Update the calendar event with enhanced description
                    self._update_event_with_business_context(
                        appointment.barber, 
                        google_event_id, 
                        appointment, 
                        metadata
                    )
                    
                except Exception as e:
                    self.logger.warning(
                        f"Failed to create business metadata for appointment {appointment.id}: {str(e)}. "
                        f"Calendar sync completed successfully."
                    )
            
            return google_event_id
            
        except Exception as e:
            self.logger.error(f"Error in enhanced calendar sync for appointment {appointment.id}: {str(e)}")
            return None
    
    def update_appointment_in_google_with_business_intelligence(
        self, 
        appointment: Appointment,
        include_business_metadata: bool = True
    ) -> bool:
        """Update appointment in Google Calendar with updated business intelligence."""
        if not appointment.barber or not appointment.barber.google_calendar_credentials:
            return False
        
        if not hasattr(appointment, 'google_event_id') or not appointment.google_event_id:
            # No Google event ID, try to create instead
            return self.sync_appointment_to_google_with_business_intelligence(
                appointment, include_business_metadata
            ) is not None
        
        try:
            # Update the calendar event using standard method
            result = self.update_appointment_in_google(appointment)
            
            if not result:
                return False
            
            # Update business metadata if enabled
            if include_business_metadata:
                try:
                    # Get existing metadata
                    existing_metadata = self.business_metadata_service.get_business_metadata(
                        appointment.google_event_id
                    )
                    
                    if existing_metadata:
                        # Update metadata with any changes
                        updates = {
                            'expected_revenue': appointment.price,
                            'updated_at': datetime.utcnow()
                        }
                        
                        # Recalculate coaching opportunities
                        client_ltv = self.business_metadata_service._calculate_client_ltv(
                            appointment.client_id
                        ) if appointment.client else None
                        client_frequency = self.business_metadata_service._calculate_client_frequency(
                            appointment.client_id
                        ) if appointment.client else 0
                        client_value_tier = self.business_metadata_service._determine_client_value_tier(
                            client_ltv, client_frequency
                        )
                        
                        updates['coaching_opportunities'] = self.business_metadata_service._identify_coaching_opportunities(
                            appointment, client_value_tier
                        )
                        
                        updated_metadata = self.business_metadata_service.update_business_metadata(
                            appointment.google_event_id, updates
                        )
                        
                        if updated_metadata:
                            # Update the calendar event description
                            self._update_event_with_business_context(
                                appointment.barber,
                                appointment.google_event_id,
                                appointment,
                                updated_metadata
                            )
                    else:
                        # Create new metadata if none exists
                        self.business_metadata_service.create_business_metadata(
                            appointment=appointment,
                            google_event_id=appointment.google_event_id
                        )
                        
                except Exception as e:
                    self.logger.warning(
                        f"Failed to update business metadata for appointment {appointment.id}: {str(e)}. "
                        f"Calendar update completed successfully."
                    )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error in enhanced calendar update for appointment {appointment.id}: {str(e)}")
            return False
    
    def get_business_insights_for_period(
        self, 
        user: User, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get comprehensive business insights for a specific period."""
        try:
            days_back = (datetime.utcnow() - start_date).days
            insights = self.business_metadata_service.get_business_insights(
                user_id=user.id,
                days_back=days_back
            )
            
            # Add calendar-specific insights
            calendar_insights = self._generate_calendar_specific_insights(user, start_date, end_date)
            insights.update(calendar_insights)
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Error generating business insights for user {user.id}: {str(e)}")
            return {}
    
    def trigger_ai_coaching_from_calendar_patterns(self, user: User) -> List[str]:
        """Analyze calendar patterns and trigger appropriate AI coaching sessions."""
        try:
            # Get recent appointments
            since_date = datetime.utcnow() - timedelta(days=30)
            appointments = self.db.query(Appointment).filter(
                Appointment.barber_id == user.id,
                Appointment.start_time >= since_date
            ).all()
            
            triggered_sessions = []
            
            if not appointments:
                return triggered_sessions
            
            # Analyze patterns and trigger coaching
            patterns = self._analyze_calendar_patterns(appointments)
            
            for pattern, context in patterns.items():
                if self.business_metadata_service.trigger_ai_coaching_session(
                    user.id, pattern, context
                ):
                    triggered_sessions.append(pattern)
            
            return triggered_sessions
            
        except Exception as e:
            self.logger.error(f"Error triggering AI coaching from calendar patterns: {str(e)}")
            return []
    
    def get_six_figure_barber_compliance_report(self, user: User) -> Dict[str, Any]:
        """Generate Six Figure Barber methodology compliance report."""
        try:
            # Get recent appointments with metadata
            since_date = datetime.utcnow() - timedelta(days=30)
            appointments = self.db.query(Appointment).filter(
                Appointment.barber_id == user.id,
                Appointment.start_time >= since_date
            ).all()
            
            compliance_scores = []
            service_tier_distribution = {}
            pricing_analysis = []
            
            for appointment in appointments:
                if hasattr(appointment, 'google_event_id') and appointment.google_event_id:
                    metadata = self.business_metadata_service.get_business_metadata(
                        appointment.google_event_id
                    )
                    
                    if metadata:
                        compliance_scores.append(metadata.six_fb_compliance_score or 0)
                        
                        tier = metadata.service_tier
                        service_tier_distribution[tier] = service_tier_distribution.get(tier, 0) + 1
                        
                        pricing_analysis.append({
                            'service': appointment.service_name,
                            'price': appointment.price,
                            'tier': metadata.service_tier,
                            'compliance_score': metadata.six_fb_compliance_score
                        })
            
            avg_compliance = sum(compliance_scores) / len(compliance_scores) if compliance_scores else 0
            
            # Generate recommendations
            recommendations = []
            if avg_compliance < 85:
                recommendations.append("Focus on premium service delivery to improve compliance score")
            
            luxury_ratio = service_tier_distribution.get('luxury', 0) / len(appointments) if appointments else 0
            if luxury_ratio < 0.3:
                recommendations.append("Increase luxury service offerings to align with Six Figure Barber standards")
            
            avg_price = sum(apt.price for apt in appointments) / len(appointments) if appointments else 0
            if avg_price < 75:
                recommendations.append("Consider pricing optimization to reach Six Figure Barber targets")
            
            return {
                'average_compliance_score': avg_compliance,
                'total_appointments_analyzed': len(appointments),
                'service_tier_distribution': service_tier_distribution,
                'pricing_analysis': pricing_analysis,
                'recommendations': recommendations,
                'compliance_grade': self._calculate_compliance_grade(avg_compliance),
                'report_period': f"{since_date.strftime('%Y-%m-%d')} to {datetime.utcnow().strftime('%Y-%m-%d')}"
            }
            
        except Exception as e:
            self.logger.error(f"Error generating compliance report for user {user.id}: {str(e)}")
            return {}
    
    def enable_smart_calendar_coaching(self, user: User) -> bool:
        """Enable smart calendar-based coaching for a user."""
        try:
            # Create a recurring task to analyze calendar patterns
            # This would typically be handled by a background job scheduler
            
            success = self.business_metadata_service.trigger_ai_coaching_session(
                user_id=user.id,
                coaching_type='calendar_optimization',
                context={
                    'feature': 'smart_calendar_coaching',
                    'enabled_at': datetime.utcnow().isoformat()
                }
            )
            
            if success:
                self.logger.info(f"Enabled smart calendar coaching for user {user.id}")
            
            return success
            
        except Exception as e:
            self.logger.error(f"Error enabling smart calendar coaching for user {user.id}: {str(e)}")
            return False
    
    # Private helper methods
    
    def _update_event_with_business_context(
        self,
        user: User,
        google_event_id: str,
        appointment: Appointment,
        metadata: BusinessCalendarMetadata
    ):
        """Update Google Calendar event with enhanced business context."""
        try:
            service = self.get_calendar_service(user)
            
            # Get existing event
            event = service.events().get(
                calendarId=user.google_calendar_id or 'primary',
                eventId=google_event_id
            ).execute()
            
            # Create enhanced description
            base_description = f"""
Appointment: {appointment.service_name}
Client: {appointment.client.name if appointment.client else 'Unknown'}
Service: {appointment.service_name}
Duration: {appointment.duration_minutes} minutes
Price: ${appointment.price}
Notes: {appointment.notes or 'None'}

Six Figure Barber Analysis:
✓ Service Tier: {metadata.service_tier.title()}
✓ Client Value Tier: {metadata.client_value_tier.title()}
✓ Compliance Score: {metadata.six_fb_compliance_score or 0}%
✓ Expected Revenue: ${metadata.expected_revenue}
""".strip()
            
            # Add coaching opportunities if any
            if metadata.coaching_opportunities:
                base_description += "\n\nCoaching Opportunities:"
                for opportunity in metadata.coaching_opportunities:
                    base_description += f"\n• {opportunity.replace('_', ' ').title()}"
            
            # Add optimization flags if any
            if metadata.optimization_flags:
                base_description += "\n\nOptimization Flags:"
                for flag in metadata.optimization_flags:
                    base_description += f"\n• {flag.replace('_', ' ').title()}"
            
            base_description += f"\n\nBookedBarber ID: {appointment.id}"
            
            # Update event
            event['description'] = base_description
            service.events().update(
                calendarId=user.google_calendar_id or 'primary',
                eventId=google_event_id,
                body=event
            ).execute()
            
        except Exception as e:
            self.logger.error(f"Error updating event with business context: {str(e)}")
    
    def _generate_calendar_specific_insights(
        self, 
        user: User, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Generate insights specific to calendar patterns."""
        try:
            # Get appointments in the period
            appointments = self.db.query(Appointment).filter(
                Appointment.barber_id == user.id,
                Appointment.start_time >= start_date,
                Appointment.start_time <= end_date
            ).all()
            
            if not appointments:
                return {}
            
            # Analyze time patterns
            hour_distribution = {}
            day_distribution = {}
            
            for appointment in appointments:
                hour = appointment.start_time.hour
                day = appointment.start_time.strftime('%A')
                
                hour_distribution[hour] = hour_distribution.get(hour, 0) + 1
                day_distribution[day] = day_distribution.get(day, 0) + 1
            
            # Find peak hours and days
            peak_hour = max(hour_distribution.items(), key=lambda x: x[1]) if hour_distribution else (0, 0)
            peak_day = max(day_distribution.items(), key=lambda x: x[1]) if day_distribution else ('Monday', 0)
            
            # Calculate utilization rate (appointments per available hour)
            business_hours = 8  # Assume 8-hour workday
            work_days = (end_date - start_date).days
            total_available_hours = work_days * business_hours
            total_appointment_hours = sum(apt.duration_minutes / 60 for apt in appointments)
            utilization_rate = (total_appointment_hours / total_available_hours * 100) if total_available_hours > 0 else 0
            
            return {
                'calendar_utilization_rate': utilization_rate,
                'peak_hour': f"{peak_hour[0]}:00 ({peak_hour[1]} appointments)",
                'peak_day': f"{peak_day[0]} ({peak_day[1]} appointments)",
                'hour_distribution': hour_distribution,
                'day_distribution': day_distribution,
                'average_appointment_duration': sum(apt.duration_minutes for apt in appointments) / len(appointments),
                'booking_frequency': len(appointments) / max(1, (end_date - start_date).days),
                'schedule_efficiency_score': min(100, utilization_rate * 1.2)  # Bonus for high utilization
            }
            
        except Exception as e:
            self.logger.error(f"Error generating calendar-specific insights: {str(e)}")
            return {}
    
    def _analyze_calendar_patterns(self, appointments: List[Appointment]) -> Dict[str, Dict[str, Any]]:
        """Analyze calendar patterns to identify coaching opportunities."""
        patterns = {}
        
        if not appointments:
            return patterns
        
        # Analyze pricing patterns
        avg_price = sum(apt.price for apt in appointments) / len(appointments)
        if avg_price < 60:
            patterns['pricing_optimization'] = {
                'current_avg_price': avg_price,
                'target_price': 75,
                'appointments_analyzed': len(appointments)
            }
        
        # Analyze service mix
        service_counts = {}
        for appointment in appointments:
            service_counts[appointment.service_name] = service_counts.get(appointment.service_name, 0) + 1
        
        total_services = len(appointments)
        basic_services = sum(count for service, count in service_counts.items() 
                           if any(word in service.lower() for word in ['basic', 'simple', 'quick']))
        
        if basic_services / total_services > 0.7:
            patterns['service_mix_optimization'] = {
                'basic_service_ratio': basic_services / total_services,
                'recommendation': 'increase_premium_services',
                'current_service_mix': service_counts
            }
        
        # Analyze scheduling efficiency
        appointment_durations = [apt.duration_minutes for apt in appointments]
        avg_duration = sum(appointment_durations) / len(appointment_durations)
        
        if avg_duration > 75:
            patterns['scheduling_efficiency'] = {
                'avg_duration': avg_duration,
                'recommendation': 'optimize_service_time',
                'longest_services': sorted(appointment_durations, reverse=True)[:3]
            }
        
        # Analyze client retention patterns
        client_counts = {}
        for appointment in appointments:
            if appointment.client_id:
                client_counts[appointment.client_id] = client_counts.get(appointment.client_id, 0) + 1
        
        new_clients = sum(1 for count in client_counts.values() if count == 1)
        repeat_clients = len(client_counts) - new_clients
        
        if new_clients / len(client_counts) > 0.6:
            patterns['client_retention_strategy'] = {
                'new_client_ratio': new_clients / len(client_counts),
                'repeat_clients': repeat_clients,
                'total_unique_clients': len(client_counts)
            }
        
        return patterns
    
    def _calculate_compliance_grade(self, avg_compliance: float) -> str:
        """Calculate compliance grade based on average score."""
        if avg_compliance >= 95:
            return 'A+'
        elif avg_compliance >= 90:
            return 'A'
        elif avg_compliance >= 85:
            return 'B+'
        elif avg_compliance >= 80:
            return 'B'
        elif avg_compliance >= 75:
            return 'C+'
        elif avg_compliance >= 70:
            return 'C'
        else:
            return 'D'