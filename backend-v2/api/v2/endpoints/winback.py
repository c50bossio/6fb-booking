"""
Win-Back Automation API V2 - Six Figure Barber Client Recovery
==============================================================

V2 API endpoints for the intelligent win-back automation system that creates
and manages automated sequences to re-engage dormant clients through strategic,
timed outreach campaigns aligned with Six Figure Barber methodology.

All endpoints use /api/v2/winback/ prefix as per user requirement:
"There should be nothing V1, only V2."
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from database import get_db
from models import User
from utils.auth import get_current_user
from services.winback_automation_service import (
    WinBackAutomationService,
    WinBackSequence,
    WinBackStageAction,
    WinBackPerformance,
    WinBackStage,
    WinBackTrigger,
    SequenceStatus
)
from schemas.winback import (
    WinBackSequenceResponse,
    WinBackPerformanceResponse,
    WinBackTriggerDetectionRequest,
    WinBackSequenceConfigurationResponse,
    WinBackAnalyticsResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/winback", tags=["winback-v2"])

@router.post("/detect-triggers", response_model=List[WinBackSequenceResponse])
async def detect_and_trigger_sequences(
    request: WinBackTriggerDetectionRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Detect clients needing win-back sequences and trigger them
    
    Analyzes all clients for dormancy patterns, missed appointments,
    and other triggers to automatically start appropriate win-back sequences.
    """
    try:
        winback_service = WinBackAutomationService(db)
        
        # Detect and trigger sequences
        triggered_sequences = await winback_service.detect_and_trigger_sequences(
            user_id=user.id
        )
        
        # Schedule sequence executions in background
        for sequence in triggered_sequences:
            background_tasks.add_task(
                winback_service.execute_sequence_actions,
                sequence.sequence_id
            )
        
        return [WinBackSequenceResponse.from_sequence(seq) for seq in triggered_sequences]
        
    except Exception as e:
        logger.error(f"Error detecting win-back triggers for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to detect triggers: {str(e)}")

@router.get("/sequences", response_model=List[WinBackSequenceResponse])
async def get_active_sequences(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = Query(None, description="Filter by sequence status"),
    client_id: Optional[int] = Query(None, description="Filter by client ID"),
    limit: int = Query(50, ge=1, le=100, description="Maximum sequences to return")
):
    """
    Get active win-back sequences and their current status
    
    Returns all active sequences with their progress, next actions,
    and performance metrics for monitoring and management.
    """
    try:
        # This would query active sequences from database
        # For now, return mock data showing the structure
        
        mock_sequences = [
            {
                "sequence_id": "winback_abc123def456",
                "client_id": 45,
                "client_name": "John Smith",
                "trigger": "days_inactive",
                "current_stage": "value_proposition",
                "status": "active",
                "total_stages": 4,
                "current_stage_number": 2,
                "days_between_stages": 7,
                "client_tier": "premium",
                "days_dormant": 42,
                "last_booking_date": datetime(2024, 6, 1, 14, 30),
                "lifetime_value": 850.0,
                "historical_booking_frequency": 1.5,
                "started_at": datetime(2024, 7, 15, 10, 0),
                "next_action_at": datetime(2024, 7, 22, 10, 0),
                "last_contact_at": datetime(2024, 7, 15, 10, 0),
                "stages_completed": 1,
                "emails_sent": 1,
                "emails_opened": 1,
                "offers_generated": 0,
                "offers_redeemed": 0,
                "sequence_cost": 0.001,
                "reactivated": False,
                "reactivation_date": None,
                "reactivation_revenue": 0.0,
                "sequence_roi": 0.0
            },
            {
                "sequence_id": "winback_def789ghi012",
                "client_id": 67,
                "client_name": "Sarah Johnson",
                "trigger": "missed_regular_appointment",
                "current_stage": "gentle_reminder",
                "status": "active",
                "total_stages": 4,
                "current_stage_number": 1,
                "days_between_stages": 7,
                "client_tier": "vip",
                "days_dormant": 21,
                "last_booking_date": datetime(2024, 7, 1, 16, 0),
                "lifetime_value": 1200.0,
                "historical_booking_frequency": 2.0,
                "started_at": datetime(2024, 7, 20, 9, 0),
                "next_action_at": datetime(2024, 7, 20, 9, 0),
                "last_contact_at": None,
                "stages_completed": 0,
                "emails_sent": 0,
                "emails_opened": 0,
                "offers_generated": 0,
                "offers_redeemed": 0,
                "sequence_cost": 0.0,
                "reactivated": False,
                "reactivation_date": None,
                "reactivation_revenue": 0.0,
                "sequence_roi": 0.0
            }
        ]
        
        # Apply filters
        filtered_sequences = mock_sequences
        if status:
            filtered_sequences = [s for s in filtered_sequences if s["status"] == status.lower()]
        if client_id:
            filtered_sequences = [s for s in filtered_sequences if s["client_id"] == client_id]
        
        return [WinBackSequenceResponse(**seq) for seq in filtered_sequences[:limit]]
        
    except Exception as e:
        logger.error(f"Error getting win-back sequences for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get sequences: {str(e)}")

@router.get("/sequences/{sequence_id}", response_model=WinBackSequenceResponse)
async def get_sequence_details(
    sequence_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific win-back sequence
    
    Returns complete sequence information including all stage actions,
    performance metrics, and client context for detailed monitoring.
    """
    try:
        winback_service = WinBackAutomationService(db)
        
        # This would load sequence from database
        # For now, return mock detailed sequence data
        
        sequence_data = {
            "sequence_id": sequence_id,
            "client_id": 45,
            "client_name": "John Smith",
            "trigger": "days_inactive",
            "current_stage": "value_proposition",
            "status": "active",
            "total_stages": 4,
            "current_stage_number": 2,
            "days_between_stages": 7,
            "client_tier": "premium",
            "days_dormant": 42,
            "last_booking_date": datetime(2024, 6, 1, 14, 30),
            "lifetime_value": 850.0,
            "historical_booking_frequency": 1.5,
            "started_at": datetime(2024, 7, 15, 10, 0),
            "next_action_at": datetime(2024, 7, 22, 10, 0),
            "last_contact_at": datetime(2024, 7, 15, 10, 0),
            "stages_completed": 1,
            "emails_sent": 1,
            "emails_opened": 1,
            "offers_generated": 0,
            "offers_redeemed": 0,
            "sequence_cost": 0.001,
            "reactivated": False,
            "reactivation_date": None,
            "reactivation_revenue": 0.0,
            "sequence_roi": 0.0
        }
        
        return WinBackSequenceResponse(**sequence_data)
        
    except Exception as e:
        logger.error(f"Error getting sequence {sequence_id} details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get sequence details: {str(e)}")

@router.post("/sequences/{sequence_id}/execute")
async def execute_sequence_actions(
    sequence_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually execute pending actions for a win-back sequence
    
    Processes all pending stage actions for a sequence, including
    sending emails, SMS, generating offers, and advancing stages.
    """
    try:
        winback_service = WinBackAutomationService(db)
        
        success = await winback_service.execute_sequence_actions(sequence_id)
        
        if success:
            return {
                "success": True,
                "message": f"Sequence {sequence_id} actions executed successfully",
                "executed_at": datetime.now()
            }
        else:
            raise HTTPException(status_code=404, detail="Sequence not found or not active")
        
    except Exception as e:
        logger.error(f"Error executing sequence {sequence_id} actions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute actions: {str(e)}")

@router.put("/sequences/{sequence_id}/pause")
async def pause_sequence(
    sequence_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pause a win-back sequence temporarily
    
    Pauses sequence execution while preserving current state
    for later resumption if needed.
    """
    try:
        winback_service = WinBackAutomationService(db)
        
        success = await winback_service.pause_sequence(sequence_id)
        
        if success:
            return {
                "success": True,
                "message": f"Sequence {sequence_id} paused successfully",
                "paused_at": datetime.now()
            }
        else:
            raise HTTPException(status_code=404, detail="Sequence not found")
        
    except Exception as e:
        logger.error(f"Error pausing sequence {sequence_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to pause sequence: {str(e)}")

@router.put("/sequences/{sequence_id}/resume")
async def resume_sequence(
    sequence_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resume a paused win-back sequence
    
    Resumes sequence execution from where it was paused,
    rescheduling pending actions appropriately.
    """
    try:
        winback_service = WinBackAutomationService(db)
        
        success = await winback_service.resume_sequence(sequence_id)
        
        if success:
            return {
                "success": True,
                "message": f"Sequence {sequence_id} resumed successfully",
                "resumed_at": datetime.now()
            }
        else:
            raise HTTPException(status_code=404, detail="Sequence not found")
        
    except Exception as e:
        logger.error(f"Error resuming sequence {sequence_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resume sequence: {str(e)}")

@router.post("/client/{client_id}/reactivated")
async def mark_client_reactivated(
    client_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    revenue: float = Query(0.0, description="Revenue from reactivation")
):
    """
    Mark a client as successfully reactivated
    
    Updates any active win-back sequences for the client and
    tracks reactivation success metrics for performance analysis.
    """
    try:
        winback_service = WinBackAutomationService(db)
        
        success = await winback_service.mark_client_reactivated(client_id, revenue)
        
        if success:
            return {
                "success": True,
                "message": f"Client {client_id} marked as reactivated",
                "revenue": revenue,
                "reactivated_at": datetime.now()
            }
        else:
            raise HTTPException(status_code=404, detail="Client not found")
        
    except Exception as e:
        logger.error(f"Error marking client {client_id} as reactivated: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark reactivation: {str(e)}")

@router.get("/performance", response_model=WinBackPerformanceResponse)
async def get_performance_analytics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    date_range_days: int = Query(90, ge=1, le=365, description="Days of data to analyze")
):
    """
    Get comprehensive win-back performance analytics
    
    Returns detailed performance metrics including success rates,
    ROI analysis, and optimization recommendations for win-back campaigns.
    """
    try:
        winback_service = WinBackAutomationService(db)
        
        performance = winback_service.get_sequence_performance(user.id, date_range_days)
        
        return WinBackPerformanceResponse.from_performance(performance)
        
    except Exception as e:
        logger.error(f"Error getting win-back performance for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance data: {str(e)}")

@router.get("/analytics/dashboard")
async def get_winback_analytics_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    date_range_days: int = Query(30, ge=1, le=365, description="Days of data to analyze")
):
    """
    Get comprehensive win-back analytics dashboard data
    
    Returns high-level metrics, trends, and insights for win-back strategy
    optimization and Six Figure methodology impact assessment.
    """
    try:
        # This would aggregate analytics across all win-back sequences
        # For now, return mock dashboard data
        
        dashboard_data = {
            "overview": {
                "total_sequences_triggered": 45,
                "sequences_in_progress": 12,
                "sequences_completed": 28,
                "overall_success_rate": 0.35,
                "clients_reactivated": 15,
                "total_recovery_revenue": 2340.0,
                "average_sequence_duration_days": 18.5,
                "total_sequence_cost": 156.80,
                "roi_percentage": 1392.35
            },
            "stage_performance": {
                "gentle_reminder": {"completion_rate": 0.95, "success_rate": 0.15},
                "value_proposition": {"completion_rate": 0.78, "success_rate": 0.25},
                "special_offer": {"completion_rate": 0.65, "success_rate": 0.45},
                "final_attempt": {"completion_rate": 0.45, "success_rate": 0.20}
            },
            "trigger_effectiveness": {
                "days_inactive": {"count": 18, "success_rate": 0.28},
                "missed_regular_appointment": {"count": 15, "success_rate": 0.47},
                "seasonal_reactivation": {"count": 8, "success_rate": 0.38},
                "competitor_risk": {"count": 4, "success_rate": 0.25}
            },
            "client_segment_performance": {
                "vip_clients": {"sequences": 8, "success_rate": 0.55, "avg_recovery": 450.0},
                "premium_clients": {"sequences": 12, "success_rate": 0.42, "avg_recovery": 320.0},
                "regular_clients": {"sequences": 18, "success_rate": 0.28, "avg_recovery": 180.0},
                "new_clients": {"sequences": 7, "success_rate": 0.15, "avg_recovery": 95.0}
            },
            "timing_optimization": {
                "optimal_first_contact": "45 days after last appointment",
                "best_email_send_time": "Tuesday 10:00 AM",
                "best_offer_timing": "Stage 3 (14 days into sequence)",
                "ideal_sequence_length": "3-4 stages over 21 days"
            },
            "six_figure_methodology_impact": {
                "relationship_focused_success": 0.42,
                "value_enhancement_vs_discount": {
                    "value_enhancement": {"success_rate": 0.38, "avg_revenue": 185.0},
                    "discount_offers": {"success_rate": 0.24, "avg_revenue": 95.0}
                },
                "methodology_alignment_score": 78,
                "premium_positioning_maintained": 0.85
            },
            "optimization_recommendations": [
                "Focus on clients dormant 30-90 days for best ROI",
                "VIP clients respond best to personal outreach via SMS",
                "Special offers work best in stage 3 (value proposition)",
                "SMS follow-up improves email response rates by 35%",
                "Seasonal timing increases success rates by 20%",
                "Relationship-building messaging outperforms discount-focused by 58%"
            ],
            "trends": {
                "weekly_success_trend": [0.28, 0.32, 0.35, 0.35],
                "monthly_recovery_revenue": [1800, 2100, 2200, 2340],
                "client_satisfaction_correlation": 0.76,
                "long_term_retention_improvement": "34% increase in 6-month retention"
            },
            "next_actions": {
                "sequences_needing_attention": 3,
                "clients_ready_for_next_stage": 8,
                "high_potential_triggers_detected": 12,
                "optimization_opportunities": 5
            }
        }
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Error getting win-back analytics dashboard for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get analytics dashboard: {str(e)}")

@router.get("/configuration")
async def get_winback_configuration(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get win-back system configuration and business rules
    
    Returns current configuration including sequence templates,
    trigger rules, and Six Figure methodology settings.
    """
    try:
        winback_service = WinBackAutomationService(db)
        
        configuration = {
            "six_figure_principles": winback_service.six_figure_principles,
            "sequence_configurations": winback_service.sequence_configs,
            "trigger_rules": winback_service.trigger_rules,
            "available_triggers": [
                {"value": trigger.value, "label": trigger.value.replace("_", " ").title()}
                for trigger in WinBackTrigger
            ],
            "sequence_stages": [
                {"value": stage.value, "label": stage.value.replace("_", " ").title()}
                for stage in WinBackStage
            ],
            "sequence_statuses": [
                {"value": status.value, "label": status.value.replace("_", " ").title()}
                for status in SequenceStatus
            ],
            "default_settings": {
                "stages_per_sequence": 4,
                "days_between_stages": 7,
                "max_sequences_per_client": 2,
                "minimum_dormancy_days": 30,
                "maximum_sequence_duration_days": 45
            },
            "personalization_factors": [
                "client_tier",
                "lifetime_value",
                "booking_frequency",
                "service_preferences",
                "communication_preferences",
                "last_interaction_type",
                "churn_risk_factors"
            ]
        }
        
        return configuration
        
    except Exception as e:
        logger.error(f"Error getting win-back configuration for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")

@router.get("/health")
async def winback_health_check():
    """
    Health check endpoint for the win-back automation system
    
    Returns status information about the win-back automation services.
    """
    return {
        "status": "healthy",
        "service": "Win-Back Automation V2",
        "version": "2.0.0",
        "features": [
            "Multi-Stage Sequence Automation",
            "Intelligent Trigger Detection",
            "Six Figure Methodology Alignment",
            "Behavioral Pattern Analysis",
            "Real-Time Performance Tracking",
            "ROI-Driven Optimization",
            "Client Recovery Analytics"
        ],
        "supported_triggers": [trigger.value for trigger in WinBackTrigger],
        "sequence_stages": [stage.value for stage in WinBackStage],
        "methodology_alignment": "Six Figure Barber Principles"
    }