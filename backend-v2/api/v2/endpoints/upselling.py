"""
Upselling Tracking API Endpoints V2
Provides comprehensive upselling attempt and conversion tracking following Six Figure Barber methodology.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from db import get_db
from utils.auth import get_current_user
from models import User
from models.upselling import UpsellAttempt, UpsellConversion, UpsellStatus, UpsellChannel
from services.upselling_automation_service import UpsellAutomationService
import logging

logger = logging.getLogger(__name__)

# Initialize automation service
automation_service = UpsellAutomationService()

router = APIRouter(prefix="/upselling", tags=["Upselling Tracking"])

# Pydantic models for API requests/responses
class UpsellAttemptRequest(BaseModel):
    client_id: int
    current_service: str
    suggested_service: str
    potential_revenue: float
    confidence_score: float
    channel: UpsellChannel
    client_tier: Optional[str] = None
    relationship_score: Optional[float] = None
    reasons: Optional[List[str]] = None
    methodology_alignment: Optional[str] = None
    implementation_notes: Optional[str] = None
    opportunity_id: Optional[str] = None
    source_analysis: Optional[Dict[str, Any]] = None
    expires_in_hours: Optional[int] = 72  # Default 3 days

class UpsellAttemptResponse(BaseModel):
    id: int
    barber_id: int
    client_id: int
    current_service: str
    suggested_service: str
    potential_revenue: float
    confidence_score: float
    client_tier: Optional[str]
    relationship_score: Optional[float]
    status: UpsellStatus
    channel: UpsellChannel
    opportunity_id: Optional[str]
    implemented_at: datetime
    expires_at: Optional[datetime]
    automation_triggered: bool
    
    class Config:
        from_attributes = True

class UpsellConversionRequest(BaseModel):
    attempt_id: int
    converted: bool
    conversion_channel: Optional[UpsellChannel] = None
    actual_service_booked: Optional[str] = None
    actual_revenue: Optional[float] = None
    appointment_id: Optional[int] = None
    client_satisfaction_score: Optional[float] = None
    client_feedback: Optional[str] = None
    conversion_notes: Optional[str] = None

class UpsellConversionResponse(BaseModel):
    id: int
    attempt_id: int
    converted: bool
    conversion_channel: Optional[UpsellChannel]
    actual_service_booked: Optional[str]
    actual_revenue: Optional[float]
    revenue_difference: Optional[float]
    appointment_id: Optional[int]
    time_to_conversion: Optional[int]
    converted_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class UpsellAnalyticsResponse(BaseModel):
    period_start: datetime
    period_end: datetime
    total_attempts: int
    total_conversions: int
    conversion_rate: float
    total_potential_revenue: float
    total_actual_revenue: float
    revenue_realization_rate: float
    average_upsell_value: float
    average_time_to_conversion: float
    best_performing_channel: Optional[UpsellChannel]
    methodology_compliance_score: float

@router.post("/attempt", response_model=UpsellAttemptResponse)
async def record_upsell_attempt(
    attempt_data: UpsellAttemptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record a new upselling attempt when barber clicks 'Implement'.
    Triggers automation and tracking for the upselling opportunity.
    """
    try:
        # Validate client exists
        client = db.query(User).filter(User.id == attempt_data.client_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        
        # Calculate expiration time
        expires_at = datetime.utcnow() + timedelta(hours=attempt_data.expires_in_hours)
        
        # Create upsell attempt record
        attempt = UpsellAttempt(
            barber_id=current_user.id,
            client_id=attempt_data.client_id,
            current_service=attempt_data.current_service,
            suggested_service=attempt_data.suggested_service,
            potential_revenue=attempt_data.potential_revenue,
            confidence_score=attempt_data.confidence_score,
            client_tier=attempt_data.client_tier,
            relationship_score=attempt_data.relationship_score,
            reasons=attempt_data.reasons or [],
            methodology_alignment=attempt_data.methodology_alignment,
            status=UpsellStatus.IMPLEMENTED,
            channel=attempt_data.channel,
            implementation_notes=attempt_data.implementation_notes,
            opportunity_id=attempt_data.opportunity_id,
            source_analysis=attempt_data.source_analysis or {},
            expires_at=expires_at,
            automation_triggered=False  # Will be updated when automation runs
        )
        
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        
        # Trigger automation (email/SMS/follow-up) based on channel
        try:
            automation_result = await automation_service.trigger_upsell_automation(attempt, db)
            logger.info(f"Upsell attempt recorded: {attempt.id} for client {client.email}")
            logger.info(f"Automation result: {automation_result}")
        except Exception as automation_error:
            # Don't fail the main request if automation fails
            logger.error(f"Automation failed for attempt {attempt.id}: {str(automation_error)}")
        
        return attempt
        
    except Exception as e:
        logger.error(f"Error recording upsell attempt: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record upsell attempt"
        )

@router.post("/conversion", response_model=UpsellConversionResponse)
async def record_upsell_conversion(
    conversion_data: UpsellConversionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record the outcome of an upselling attempt.
    Called when client responds to upselling offer (accepts or declines).
    """
    try:
        # Validate attempt exists and belongs to current user
        attempt = db.query(UpsellAttempt).filter(
            and_(
                UpsellAttempt.id == conversion_data.attempt_id,
                UpsellAttempt.barber_id == current_user.id
            )
        ).first()
        
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upsell attempt not found"
            )
        
        # Calculate metrics
        revenue_difference = None
        time_to_conversion = None
        converted_at = None
        
        if conversion_data.converted:
            converted_at = datetime.utcnow()
            time_to_conversion = int((converted_at - attempt.implemented_at).total_seconds() / 3600)  # Hours
            
            if conversion_data.actual_revenue:
                revenue_difference = conversion_data.actual_revenue - float(attempt.potential_revenue)
        
        # Create conversion record
        conversion = UpsellConversion(
            attempt_id=conversion_data.attempt_id,
            converted=conversion_data.converted,
            conversion_channel=conversion_data.conversion_channel,
            actual_service_booked=conversion_data.actual_service_booked,
            actual_revenue=conversion_data.actual_revenue,
            revenue_difference=revenue_difference,
            appointment_id=conversion_data.appointment_id,
            time_to_conversion=time_to_conversion,
            client_satisfaction_score=conversion_data.client_satisfaction_score,
            client_feedback=conversion_data.client_feedback,
            conversion_notes=conversion_data.conversion_notes,
            converted_at=converted_at
        )
        
        db.add(conversion)
        
        # Update attempt status
        if conversion_data.converted:
            attempt.status = UpsellStatus.CONVERTED
        else:
            attempt.status = UpsellStatus.DECLINED
            
        db.commit()
        db.refresh(conversion)
        
        logger.info(f"Upsell conversion recorded: {conversion.id} - {'SUCCESS' if conversion_data.converted else 'DECLINED'}")
        
        return conversion
        
    except Exception as e:
        logger.error(f"Error recording upsell conversion: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record upsell conversion"
        )

@router.get("/attempts", response_model=List[UpsellAttemptResponse])
async def get_upsell_attempts(
    client_id: Optional[int] = Query(None, description="Filter by client ID"),
    status: Optional[UpsellStatus] = Query(None, description="Filter by status"),
    days_back: int = Query(30, description="Number of days to look back"),
    limit: int = Query(50, description="Maximum number of results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get upselling attempts for the current barber.
    Supports filtering by client, status, and date range.
    """
    try:
        query = db.query(UpsellAttempt).filter(UpsellAttempt.barber_id == current_user.id)
        
        # Apply filters
        if client_id:
            query = query.filter(UpsellAttempt.client_id == client_id)
        
        if status:
            query = query.filter(UpsellAttempt.status == status)
        
        # Date filter
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        query = query.filter(UpsellAttempt.implemented_at >= cutoff_date)
        
        # Order and limit
        attempts = query.order_by(desc(UpsellAttempt.implemented_at)).limit(limit).all()
        
        return attempts
        
    except Exception as e:
        logger.error(f"Error fetching upsell attempts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch upsell attempts"
        )

@router.get("/analytics", response_model=UpsellAnalyticsResponse)
async def get_upsell_analytics(
    period_days: int = Query(30, description="Analysis period in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive upselling analytics for the current barber.
    Calculates conversion rates, revenue metrics, and performance insights.
    """
    try:
        period_start = datetime.utcnow() - timedelta(days=period_days)
        period_end = datetime.utcnow()
        
        # Get attempts in period
        attempts_query = db.query(UpsellAttempt).filter(
            and_(
                UpsellAttempt.barber_id == current_user.id,
                UpsellAttempt.implemented_at >= period_start,
                UpsellAttempt.implemented_at <= period_end
            )
        )
        
        attempts = attempts_query.all()
        total_attempts = len(attempts)
        
        if total_attempts == 0:
            return UpsellAnalyticsResponse(
                period_start=period_start,
                period_end=period_end,
                total_attempts=0,
                total_conversions=0,
                conversion_rate=0.0,
                total_potential_revenue=0.0,
                total_actual_revenue=0.0,
                revenue_realization_rate=0.0,
                average_upsell_value=0.0,
                average_time_to_conversion=0.0,
                best_performing_channel=None,
                methodology_compliance_score=0.0
            )
        
        # Get conversions
        conversion_query = db.query(UpsellConversion).join(UpsellAttempt).filter(
            and_(
                UpsellAttempt.barber_id == current_user.id,
                UpsellAttempt.implemented_at >= period_start,
                UpsellAttempt.implemented_at <= period_end
            )
        )
        
        conversions = conversion_query.all()
        successful_conversions = [c for c in conversions if c.converted]
        total_conversions = len(successful_conversions)
        
        # Calculate metrics
        conversion_rate = (total_conversions / total_attempts) * 100 if total_attempts > 0 else 0.0
        
        total_potential = sum(float(a.potential_revenue) for a in attempts)
        total_actual = sum(float(c.actual_revenue or 0) for c in successful_conversions)
        
        revenue_realization_rate = (total_actual / total_potential) * 100 if total_potential > 0 else 0.0
        average_upsell_value = total_actual / total_conversions if total_conversions > 0 else 0.0
        
        # Average time to conversion
        conversion_times = [c.time_to_conversion for c in successful_conversions if c.time_to_conversion]
        average_time_to_conversion = sum(conversion_times) / len(conversion_times) if conversion_times else 0.0
        
        # Best performing channel
        channel_stats = {}
        for attempt in attempts:
            channel = attempt.channel
            if channel not in channel_stats:
                channel_stats[channel] = {'attempts': 0, 'conversions': 0}
            channel_stats[channel]['attempts'] += 1
        
        for conversion in successful_conversions:
            channel = conversion.attempt.channel
            if channel in channel_stats:
                channel_stats[channel]['conversions'] += 1
        
        best_channel = None
        best_rate = 0.0
        for channel, stats in channel_stats.items():
            rate = stats['conversions'] / stats['attempts'] if stats['attempts'] > 0 else 0.0
            if rate > best_rate:
                best_rate = rate
                best_channel = channel
        
        # Six Figure Barber methodology compliance score
        # This is a simplified calculation - could be expanded with more criteria
        methodology_score = min(100.0, (conversion_rate * 0.6) + (revenue_realization_rate * 0.4))
        
        return UpsellAnalyticsResponse(
            period_start=period_start,
            period_end=period_end,
            total_attempts=total_attempts,
            total_conversions=total_conversions,
            conversion_rate=conversion_rate,
            total_potential_revenue=total_potential,
            total_actual_revenue=total_actual,
            revenue_realization_rate=revenue_realization_rate,
            average_upsell_value=average_upsell_value,
            average_time_to_conversion=average_time_to_conversion,
            best_performing_channel=best_channel,
            methodology_compliance_score=methodology_score
        )
        
    except Exception as e:
        logger.error(f"Error calculating upsell analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate upsell analytics"
        )

@router.patch("/attempt/{attempt_id}/status")
async def update_attempt_status(
    attempt_id: int,
    status: UpsellStatus,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the status of an upselling attempt.
    Used for tracking automation progress and manual updates.
    """
    try:
        attempt = db.query(UpsellAttempt).filter(
            and_(
                UpsellAttempt.id == attempt_id,
                UpsellAttempt.barber_id == current_user.id
            )
        ).first()
        
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upsell attempt not found"
            )
        
        attempt.status = status
        if notes:
            attempt.implementation_notes = notes
        
        # Update automation status based on status
        if status == UpsellStatus.AUTOMATION_SENT:
            attempt.automation_triggered = True
            attempt.automation_sent_at = datetime.utcnow()
        elif status == UpsellStatus.CLIENT_CONTACTED:
            attempt.follow_up_completed_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": "Attempt status updated successfully", "status": status}
        
    except Exception as e:
        logger.error(f"Error updating attempt status: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update attempt status"
        )

@router.post("/attempt/{attempt_id}/trigger-automation")
async def trigger_manual_automation(
    attempt_id: int,
    channel_override: Optional[UpsellChannel] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger automation for an existing upselling attempt.
    Useful for re-sending notifications or trying different channels.
    """
    try:
        # Validate attempt exists and belongs to current user
        attempt = db.query(UpsellAttempt).filter(
            and_(
                UpsellAttempt.id == attempt_id,
                UpsellAttempt.barber_id == current_user.id
            )
        ).first()
        
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upsell attempt not found"
            )
        
        # Trigger automation
        automation_result = await automation_service.trigger_upsell_automation(
            attempt, db, channel_override
        )
        
        return {
            "message": "Automation triggered successfully",
            "attempt_id": attempt_id,
            "automation_result": automation_result
        }
        
    except Exception as e:
        logger.error(f"Error triggering manual automation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger automation"
        )

@router.get("/attempt/{attempt_id}/automation-status")
async def get_automation_status(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the automation status for a specific upselling attempt.
    Shows whether automation was triggered and its results.
    """
    try:
        # Validate attempt exists and belongs to current user
        attempt = db.query(UpsellAttempt).filter(
            and_(
                UpsellAttempt.id == attempt_id,
                UpsellAttempt.barber_id == current_user.id
            )
        ).first()
        
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upsell attempt not found"
            )
        
        # Get automation status
        status_result = await automation_service.get_automation_status(attempt_id, db)
        
        return status_result
        
    except Exception as e:
        logger.error(f"Error getting automation status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get automation status"
        )

# Additional endpoints for analytics page compatibility

class UpsellingOverview(BaseModel):
    """Overview data structure expected by the frontend"""
    date_range: Dict[str, str]
    summary: Dict[str, Any]
    revenue: Dict[str, Any]

class UpsellingPerformance(BaseModel):
    """Performance data structure expected by the frontend"""
    avg_time_to_conversion_hours: float
    top_services: List[Dict[str, Any]]
    channel_performance: List[Dict[str, Any]]

@router.get("/overview", response_model=UpsellingOverview)
async def get_upselling_overview(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get upselling overview data for the analytics dashboard.
    Provides summary and revenue metrics in the format expected by the frontend.
    """
    try:
        period_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        period_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Get attempts in period
        attempts_query = db.query(UpsellAttempt).filter(
            and_(
                UpsellAttempt.barber_id == current_user.id,
                UpsellAttempt.implemented_at >= period_start,
                UpsellAttempt.implemented_at <= period_end
            )
        )
        
        attempts = attempts_query.all()
        total_attempts = len(attempts)
        implemented_attempts = len([a for a in attempts if a.status in [UpsellStatus.CLIENT_CONTACTED, UpsellStatus.FOLLOW_UP_SCHEDULED]])
        
        # Get conversions
        conversions = db.query(UpsellConversion).join(UpsellAttempt).filter(
            and_(
                UpsellAttempt.barber_id == current_user.id,
                UpsellConversion.converted_at >= period_start,
                UpsellConversion.converted_at <= period_end
            )
        ).all()
        
        total_conversions = len(conversions)
        
        # Calculate metrics
        implementation_rate = (implemented_attempts / total_attempts * 100) if total_attempts > 0 else 0
        conversion_rate = (total_conversions / implemented_attempts * 100) if implemented_attempts > 0 else 0
        overall_success_rate = (total_conversions / total_attempts * 100) if total_attempts > 0 else 0
        
        # Revenue calculations
        potential_revenue = sum(attempt.potential_revenue or 0 for attempt in attempts)
        actual_revenue = sum(conversion.actual_revenue or 0 for conversion in conversions)
        revenue_realization_rate = (actual_revenue / potential_revenue * 100) if potential_revenue > 0 else 0
        
        avg_potential_revenue = potential_revenue / total_attempts if total_attempts > 0 else 0
        avg_actual_revenue = actual_revenue / total_conversions if total_conversions > 0 else 0
        
        return UpsellingOverview(
            date_range={
                "start": start_date,
                "end": end_date
            },
            summary={
                "total_attempts": total_attempts,
                "implemented_attempts": implemented_attempts,
                "total_conversions": total_conversions,
                "implementation_rate": implementation_rate,
                "conversion_rate": conversion_rate,
                "overall_success_rate": overall_success_rate
            },
            revenue={
                "potential_revenue": potential_revenue,
                "actual_revenue": actual_revenue,
                "revenue_realization_rate": revenue_realization_rate,
                "avg_potential_revenue": avg_potential_revenue,
                "avg_actual_revenue": avg_actual_revenue
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting upselling overview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get upselling overview"
        )

@router.get("/performance", response_model=UpsellingPerformance)
async def get_upselling_performance(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    group_by: str = Query("service", description="Group performance data by service or channel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get upselling performance data for the analytics dashboard.
    Provides detailed performance metrics and service analysis.
    """
    try:
        period_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        period_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Get conversions with time data
        conversions = db.query(UpsellConversion).join(UpsellAttempt).filter(
            and_(
                UpsellAttempt.barber_id == current_user.id,
                UpsellConversion.converted_at >= period_start,
                UpsellConversion.converted_at <= period_end
            )
        ).all()
        
        # Calculate average time to conversion
        conversion_times = []
        for conversion in conversions:
            if conversion.attempt.implemented_at and conversion.converted_at:
                time_diff = conversion.converted_at - conversion.attempt.implemented_at
                conversion_times.append(time_diff.total_seconds() / 3600)  # Convert to hours
        
        avg_time_to_conversion_hours = sum(conversion_times) / len(conversion_times) if conversion_times else 0
        
        # Top services analysis
        service_performance = {}
        for conversion in conversions:
            service = conversion.target_service_name or "Unknown Service"
            if service not in service_performance:
                service_performance[service] = {"conversions": 0, "revenue": 0}
            service_performance[service]["conversions"] += 1
            service_performance[service]["revenue"] += conversion.actual_revenue or 0
        
        top_services = [
            {
                "service": service,
                "conversions": data["conversions"],
                "revenue": data["revenue"]
            }
            for service, data in sorted(service_performance.items(), key=lambda x: x[1]["revenue"], reverse=True)
        ][:5]  # Top 5 services
        
        # Channel performance analysis
        channel_performance = {}
        attempts = db.query(UpsellAttempt).filter(
            and_(
                UpsellAttempt.barber_id == current_user.id,
                UpsellAttempt.implemented_at >= period_start,
                UpsellAttempt.implemented_at <= period_end
            )
        ).all()
        
        for attempt in attempts:
            channel = attempt.channel.value if attempt.channel else "UNKNOWN"
            if channel not in channel_performance:
                channel_performance[channel] = {"attempts": 0, "conversions": 0, "revenue": 0}
            channel_performance[channel]["attempts"] += 1
            
            # Check if this attempt has conversions
            attempt_conversions = [c for c in conversions if c.attempt_id == attempt.id]
            if attempt_conversions:
                channel_performance[channel]["conversions"] += len(attempt_conversions)
                channel_performance[channel]["revenue"] += sum(c.actual_revenue or 0 for c in attempt_conversions)
        
        channel_performance_list = [
            {
                "channel": channel,
                "attempts": data["attempts"],
                "conversions": data["conversions"],
                "revenue": data["revenue"],
                "conversion_rate": (data["conversions"] / data["attempts"] * 100) if data["attempts"] > 0 else 0
            }
            for channel, data in channel_performance.items()
        ]
        
        return UpsellingPerformance(
            avg_time_to_conversion_hours=avg_time_to_conversion_hours,
            top_services=top_services,
            channel_performance=channel_performance_list
        )
        
    except Exception as e:
        logger.error(f"Error getting upselling performance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get upselling performance"
        )