"""
AI Business Calendar API Router for 6FB Booking V2

This router provides API endpoints for the AI-powered business calendar integration,
combining Google Calendar sync with business intelligence and coaching capabilities.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from db import get_db
from models import User, Appointment
from services.enhanced_google_calendar_service import EnhancedGoogleCalendarService
from services.business_calendar_metadata_service import BusinessCalendarMetadataService
from dependencies import get_current_user

# Create router
router = APIRouter(prefix="/api/v2/ai-business-calendar", tags=["AI Business Calendar"])

# Pydantic models for request/response
class BusinessInsightsResponse(BaseModel):
    total_appointments: int
    total_revenue: float
    average_service_price: float
    service_tier_distribution: Dict[str, int]
    client_value_distribution: Dict[str, int]
    coaching_opportunities: Dict[str, int]
    optimization_recommendations: List[str]
    six_fb_compliance_average: float
    calendar_utilization_rate: Optional[float] = None
    peak_hour: Optional[str] = None
    peak_day: Optional[str] = None

class CalendarSyncRequest(BaseModel):
    appointment_id: int
    include_business_metadata: bool = True

class CoachingTriggerRequest(BaseModel):
    coaching_type: str
    context: Dict[str, Any] = {}

class ComplianceReportResponse(BaseModel):
    average_compliance_score: float
    total_appointments_analyzed: int
    service_tier_distribution: Dict[str, int]
    recommendations: List[str]
    compliance_grade: str
    report_period: str

@router.get("/business-insights", response_model=BusinessInsightsResponse)
async def get_business_insights(
    days_back: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive business insights from calendar data.
    
    Analyzes appointment patterns, service tiers, client values, and generates
    AI-powered coaching recommendations based on Six Figure Barber methodology.
    """
    try:
        enhanced_calendar_service = EnhancedGoogleCalendarService(db)
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)
        
        # Get business insights
        insights = enhanced_calendar_service.get_business_insights_for_period(
            user=current_user,
            start_date=start_date,
            end_date=end_date
        )
        
        if not insights:
            raise HTTPException(status_code=404, detail="No insights available for the specified period")
        
        return BusinessInsightsResponse(**insights)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating business insights: {str(e)}")

@router.post("/sync-appointment")
async def sync_appointment_with_business_intelligence(
    request: CalendarSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync an appointment to Google Calendar with business intelligence metadata.
    
    Creates or updates a Google Calendar event with AI-powered business insights,
    coaching opportunities, and Six Figure Barber compliance tracking.
    """
    try:
        # Get the appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == request.appointment_id,
            Appointment.barber_id == current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        enhanced_calendar_service = EnhancedGoogleCalendarService(db)
        
        # Sync appointment with business intelligence
        google_event_id = enhanced_calendar_service.sync_appointment_to_google_with_business_intelligence(
            appointment=appointment,
            include_business_metadata=request.include_business_metadata
        )
        
        if not google_event_id:
            raise HTTPException(status_code=400, detail="Failed to sync appointment to Google Calendar")
        
        return {
            "success": True,
            "google_event_id": google_event_id,
            "appointment_id": appointment.id,
            "business_metadata_included": request.include_business_metadata,
            "message": "Appointment synced successfully with business intelligence"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing appointment: {str(e)}")

@router.get("/compliance-report", response_model=ComplianceReportResponse)
async def get_six_figure_barber_compliance_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a Six Figure Barber methodology compliance report.
    
    Analyzes recent appointments to assess compliance with Six Figure Barber
    standards including pricing, service tiers, and overall methodology adherence.
    """
    try:
        enhanced_calendar_service = EnhancedGoogleCalendarService(db)
        
        # Get compliance report
        report = enhanced_calendar_service.get_six_figure_barber_compliance_report(current_user)
        
        if not report:
            raise HTTPException(status_code=404, detail="No compliance data available")
        
        return ComplianceReportResponse(**report)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating compliance report: {str(e)}")

@router.post("/trigger-coaching")
async def trigger_ai_coaching_session(
    request: CoachingTriggerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trigger an AI coaching session based on business insights.
    
    Initiates a targeted coaching conversation with AI agents specialized
    in different aspects of barbershop business optimization.
    """
    try:
        business_metadata_service = BusinessCalendarMetadataService(db)
        
        # Trigger coaching session
        success = business_metadata_service.trigger_ai_coaching_session(
            user_id=current_user.id,
            coaching_type=request.coaching_type,
            context=request.context
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to trigger coaching session")
        
        return {
            "success": True,
            "coaching_type": request.coaching_type,
            "user_id": current_user.id,
            "message": f"AI coaching session for {request.coaching_type} has been initiated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error triggering coaching session: {str(e)}")

@router.post("/analyze-calendar-patterns")
async def analyze_calendar_patterns_and_trigger_coaching(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze calendar patterns and automatically trigger appropriate coaching sessions.
    
    Reviews recent appointment patterns and identifies coaching opportunities
    such as pricing optimization, service mix improvement, and scheduling efficiency.
    """
    try:
        enhanced_calendar_service = EnhancedGoogleCalendarService(db)
        
        # Analyze patterns and trigger coaching
        triggered_sessions = enhanced_calendar_service.trigger_ai_coaching_from_calendar_patterns(current_user)
        
        return {
            "success": True,
            "triggered_sessions": triggered_sessions,
            "session_count": len(triggered_sessions),
            "message": f"Analyzed calendar patterns and triggered {len(triggered_sessions)} coaching sessions"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing calendar patterns: {str(e)}")

@router.post("/enable-smart-coaching")
async def enable_smart_calendar_coaching(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enable smart calendar-based coaching for continuous business optimization.
    
    Activates intelligent monitoring of calendar patterns with automatic
    coaching recommendations and business intelligence insights.
    """
    try:
        enhanced_calendar_service = EnhancedGoogleCalendarService(db)
        
        # Enable smart coaching
        success = enhanced_calendar_service.enable_smart_calendar_coaching(current_user)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to enable smart calendar coaching")
        
        return {
            "success": True,
            "user_id": current_user.id,
            "feature_enabled": "smart_calendar_coaching",
            "message": "Smart calendar coaching has been enabled for your account"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enabling smart coaching: {str(e)}")

@router.get("/metadata/{google_event_id}")
async def get_business_metadata_for_event(
    google_event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get business intelligence metadata for a specific Google Calendar event.
    
    Returns detailed business insights, coaching opportunities, and Six Figure Barber
    compliance information stored with the calendar event.
    """
    try:
        business_metadata_service = BusinessCalendarMetadataService(db)
        
        # Get metadata
        metadata = business_metadata_service.get_business_metadata(google_event_id)
        
        if not metadata:
            raise HTTPException(status_code=404, detail="Business metadata not found for this event")
        
        # Verify user owns this event (security check)
        if metadata.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this event's metadata")
        
        return {
            "google_event_id": metadata.google_event_id,
            "appointment_id": metadata.appointment_id,
            "service_category": metadata.service_category,
            "service_tier": metadata.service_tier,
            "client_value_tier": metadata.client_value_tier,
            "expected_revenue": metadata.expected_revenue,
            "actual_revenue": metadata.actual_revenue,
            "client_ltv": metadata.client_ltv,
            "client_frequency": metadata.client_frequency,
            "coaching_opportunities": metadata.coaching_opportunities,
            "optimization_flags": metadata.optimization_flags,
            "six_fb_compliance_score": metadata.six_fb_compliance_score,
            "created_at": metadata.created_at.isoformat(),
            "updated_at": metadata.updated_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving business metadata: {str(e)}")

@router.put("/metadata/{google_event_id}")
async def update_business_metadata_for_event(
    google_event_id: str,
    updates: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update business intelligence metadata for a Google Calendar event.
    
    Allows updating specific metadata fields such as actual revenue,
    coaching progress, or compliance scores.
    """
    try:
        business_metadata_service = BusinessCalendarMetadataService(db)
        
        # First verify the user owns this event
        existing_metadata = business_metadata_service.get_business_metadata(google_event_id)
        if not existing_metadata:
            raise HTTPException(status_code=404, detail="Business metadata not found")
        
        if existing_metadata.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this event's metadata")
        
        # Update metadata
        updated_metadata = business_metadata_service.update_business_metadata(
            google_event_id, updates
        )
        
        if not updated_metadata:
            raise HTTPException(status_code=400, detail="Failed to update business metadata")
        
        return {
            "success": True,
            "google_event_id": google_event_id,
            "updated_fields": list(updates.keys()),
            "updated_at": updated_metadata.updated_at.isoformat(),
            "message": "Business metadata updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating business metadata: {str(e)}")

@router.get("/dashboard-data")
async def get_ai_business_calendar_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard data for the AI Business Calendar.
    
    Returns all necessary data for rendering the AI Business Calendar dashboard
    including insights, compliance reports, and coaching opportunities.
    """
    try:
        enhanced_calendar_service = EnhancedGoogleCalendarService(db)
        business_metadata_service = BusinessCalendarMetadataService(db)
        
        # Get recent appointments
        since_date = datetime.utcnow() - timedelta(days=30)
        appointments = db.query(Appointment).filter(
            Appointment.barber_id == current_user.id,
            Appointment.start_time >= since_date
        ).all()
        
        # Get business insights
        insights = business_metadata_service.get_business_insights(current_user.id, 30)
        
        # Get compliance report
        compliance_report = enhanced_calendar_service.get_six_figure_barber_compliance_report(current_user)
        
        # Get calendar-specific insights
        calendar_insights = enhanced_calendar_service._generate_calendar_specific_insights(
            current_user, since_date, datetime.utcnow()
        )
        
        # Get recent coaching opportunities
        coaching_opportunities = []
        for appointment in appointments[:5]:  # Latest 5 appointments
            if hasattr(appointment, 'google_event_id') and appointment.google_event_id:
                metadata = business_metadata_service.get_business_metadata(appointment.google_event_id)
                if metadata and metadata.coaching_opportunities:
                    coaching_opportunities.extend([
                        {
                            "appointment_id": appointment.id,
                            "service_name": appointment.service_name,
                            "opportunity": opp,
                            "created_at": metadata.created_at.isoformat()
                        }
                        for opp in metadata.coaching_opportunities
                    ])
        
        return {
            "appointments": [
                {
                    "id": apt.id,
                    "service_name": apt.service_name,
                    "client_name": apt.client.name if apt.client else "Unknown",
                    "start_time": apt.start_time.isoformat(),
                    "price": apt.price,
                    "status": apt.status
                }
                for apt in appointments
            ],
            "business_insights": insights,
            "compliance_report": compliance_report,
            "calendar_insights": calendar_insights,
            "coaching_opportunities": coaching_opportunities[:10],  # Latest 10
            "summary": {
                "total_appointments": len(appointments),
                "total_revenue": sum(apt.price for apt in appointments),
                "avg_compliance_score": compliance_report.get('average_compliance_score', 0),
                "coaching_sessions_available": len(coaching_opportunities)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving dashboard data: {str(e)}")

# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check endpoint for the AI Business Calendar service."""
    return {
        "status": "healthy",
        "service": "AI Business Calendar",
        "version": "1.0.0",
        "features": [
            "Google Calendar Sync",
            "Business Intelligence Metadata",
            "AI Coaching Integration",
            "Six Figure Barber Compliance",
            "Calendar Pattern Analysis"
        ]
    }