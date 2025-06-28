"""
Automation API Endpoints
Provides API endpoints for managing automation workflows, scheduling, and monitoring
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime, date, timedelta

from ..services.automation_engine import (
    AutomationEngine,
    get_automation_engine,
    AutomationRule,
    TriggerType,
    ActionType,
)
from ..services.client_followup import (
    ClientFollowUpService,
    process_client_followups,
    FollowUpCampaign,
)
from ..services.performance_alerts import (
    PerformanceAlertsService,
    monitor_performance,
    AlertThreshold,
    PerformanceAlert,
)
from ..services.automated_reporting import (
    AutomatedReportingService,
    generate_automated_reports,
    ReportConfig,
    ReportType,
)
from ..services.smart_scheduling import (
    SmartSchedulingService,
    generate_scheduling_recommendations,
    SchedulingRecommendation,
)
from ..config.database import get_db
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/automation", tags=["automation"])


# Automation Engine Endpoints
@router.get("/status")
async def get_automation_status(db: Session = Depends(get_db)):
    """Get overall automation system status"""
    try:
        automation_engine = AutomationEngine(db)
        followup_service = ClientFollowUpService(db)
        alerts_service = PerformanceAlertsService(db)
        reporting_service = AutomatedReportingService(db)

        # Get rule counts
        all_rules = automation_engine.get_rules()
        active_rules = [r for r in all_rules if r.is_active]

        # Get campaign counts
        campaigns = followup_service.get_campaigns()
        active_campaigns = [c for c in campaigns if c.is_active]

        # Get alert counts
        active_alerts = alerts_service.get_active_alerts()

        # Get report configs
        report_configs = reporting_service.get_report_configs()
        active_reports = [r for r in report_configs if r.is_active]

        return {
            "status": "active",
            "workflows": {
                "active": len(active_rules),
                "total": len(all_rules),
                "triggered_today": 8,  # Mock for now
            },
            "client_followup": {
                "campaigns_active": len(active_campaigns),
                "messages_sent_today": 23,  # Mock
                "response_rate": 15.2,
            },
            "performance_alerts": {
                "alerts_today": len(active_alerts),
                "resolved": 8,  # Mock
                "pending": len([a for a in active_alerts if not a.is_resolved]),
            },
            "reporting": {
                "scheduled_reports": len(active_reports),
                "generated_today": 3,  # Mock
                "delivery_success_rate": 98.5,
            },
            "last_updated": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error getting automation status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Workflow Management
@router.get("/workflows")
async def get_workflows(db: Session = Depends(get_db)):
    """Get all automation workflows"""
    try:
        automation_engine = AutomationEngine(db)
        rules = automation_engine.get_rules()

        workflow_data = []
        for rule in rules:
            workflow_data.append(
                {
                    "id": rule.id,
                    "name": rule.name,
                    "description": rule.description,
                    "type": rule.trigger_type.value,
                    "status": "active" if rule.is_active else "paused",
                    "triggered_count": 0,  # Mock for now
                    "success_rate": 85.0,  # Mock
                    "last_triggered": (
                        rule.last_triggered.isoformat()
                        if rule.last_triggered
                        else "Never"
                    ),
                    "barber_specific": rule.barber_id is not None,
                }
            )

        return {"workflows": workflow_data}

    except Exception as e:
        logger.error(f"Error getting workflows: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/workflows/{workflow_id}/toggle")
async def toggle_workflow(workflow_id: str, db: Session = Depends(get_db)):
    """Toggle workflow active state"""
    try:
        automation_engine = AutomationEngine(db)
        rules = automation_engine.get_rules()

        # Find the rule
        target_rule = next((r for r in rules if r.id == workflow_id), None)
        if not target_rule:
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Toggle state
        new_state = not target_rule.is_active
        automation_engine.toggle_rule(workflow_id, new_state)

        return {
            "workflow_id": workflow_id,
            "status": "active" if new_state else "paused",
            "message": f"Workflow {'activated' if new_state else 'paused'}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling workflow {workflow_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Client Follow-up Endpoints
@router.get("/followup/campaigns")
async def get_followup_campaigns(db: Session = Depends(get_db)):
    """Get all follow-up campaigns"""
    try:
        service = ClientFollowUpService(db)
        campaigns = service.get_campaigns()

        campaign_data = []
        for campaign in campaigns:
            campaign_data.append(
                {
                    "id": campaign.id,
                    "name": campaign.name,
                    "type": campaign.followup_type.value,
                    "target_segment": campaign.target_segment.value,
                    "is_active": campaign.is_active,
                    "trigger_conditions": campaign.trigger_conditions,
                    "schedule": campaign.schedule,
                }
            )

        return {"campaigns": campaign_data}

    except Exception as e:
        logger.error(f"Error getting follow-up campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/followup/campaigns/{campaign_id}/toggle")
async def toggle_followup_campaign(campaign_id: str, db: Session = Depends(get_db)):
    """Toggle follow-up campaign active state"""
    try:
        service = ClientFollowUpService(db)
        campaigns = service.get_campaigns()

        target_campaign = next((c for c in campaigns if c.id == campaign_id), None)
        if not target_campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        new_state = not target_campaign.is_active
        service.toggle_campaign(campaign_id, new_state)

        return {
            "campaign_id": campaign_id,
            "status": "active" if new_state else "paused",
            "message": f"Campaign {'activated' if new_state else 'paused'}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling campaign {campaign_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/followup/process")
async def trigger_followup_processing(background_tasks: BackgroundTasks):
    """Manually trigger follow-up processing"""
    try:
        background_tasks.add_task(process_client_followups)

        return {
            "status": "started",
            "message": "Follow-up processing started in background",
        }

    except Exception as e:
        logger.error(f"Error triggering follow-up processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Performance Alerts Endpoints
@router.get("/alerts")
async def get_performance_alerts(
    barber_id: Optional[int] = None, db: Session = Depends(get_db)
):
    """Get performance alerts"""
    try:
        service = PerformanceAlertsService(db)
        alerts = service.get_active_alerts(barber_id)

        alert_data = []
        for alert in alerts:
            alert_data.append(
                {
                    "id": alert.id,
                    "title": alert.title,
                    "message": alert.message,
                    "severity": alert.severity.value,
                    "alert_type": alert.alert_type.value,
                    "current_value": alert.current_value,
                    "threshold_value": alert.threshold_value,
                    "triggered_at": alert.triggered_at.isoformat(),
                    "is_resolved": alert.is_resolved,
                    "barber_id": alert.barber_id,
                }
            )

        return {"alerts": alert_data}

    except Exception as e:
        logger.error(f"Error getting performance alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, db: Session = Depends(get_db)):
    """Mark alert as resolved"""
    try:
        service = PerformanceAlertsService(db)
        service.resolve_alert(alert_id)

        return {
            "alert_id": alert_id,
            "status": "resolved",
            "resolved_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error resolving alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/thresholds")
async def get_alert_thresholds(db: Session = Depends(get_db)):
    """Get alert thresholds configuration"""
    try:
        service = PerformanceAlertsService(db)
        thresholds = service.get_thresholds()

        threshold_data = []
        for threshold in thresholds:
            threshold_data.append(
                {
                    "id": threshold.id,
                    "name": threshold.name,
                    "alert_type": threshold.alert_type.value,
                    "metric_path": threshold.metric_path,
                    "operator": threshold.operator,
                    "threshold_value": threshold.threshold_value,
                    "severity": threshold.severity.value,
                    "is_active": threshold.is_active,
                    "cooldown_hours": threshold.cooldown_hours,
                }
            )

        return {"thresholds": threshold_data}

    except Exception as e:
        logger.error(f"Error getting alert thresholds: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/monitor")
async def trigger_performance_monitoring(background_tasks: BackgroundTasks):
    """Manually trigger performance monitoring"""
    try:
        background_tasks.add_task(monitor_performance)

        return {
            "status": "started",
            "message": "Performance monitoring started in background",
        }

    except Exception as e:
        logger.error(f"Error triggering performance monitoring: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Automated Reporting Endpoints
@router.get("/reports/configs")
async def get_report_configs(db: Session = Depends(get_db)):
    """Get report configurations"""
    try:
        service = AutomatedReportingService(db)
        configs = service.get_report_configs()

        config_data = []
        for config in configs:
            config_data.append(
                {
                    "id": config.id,
                    "name": config.name,
                    "report_type": config.report_type.value,
                    "frequency": config.frequency.value,
                    "format": config.format.value,
                    "recipients": config.recipients,
                    "is_active": config.is_active,
                    "schedule_time": config.schedule_time,
                    "last_generated": (
                        config.last_generated.isoformat()
                        if config.last_generated
                        else None
                    ),
                }
            )

        return {"report_configs": config_data}

    except Exception as e:
        logger.error(f"Error getting report configs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reports/generate")
async def generate_on_demand_report(
    report_type: str,
    barber_id: Optional[int] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    """Generate report on demand"""
    try:
        service = AutomatedReportingService(db)

        # Validate report type
        try:
            report_type_enum = ReportType(report_type)
        except ValueError:
            raise HTTPException(
                status_code=400, detail=f"Invalid report type: {report_type}"
            )

        # Generate report
        report_data = await service.generate_on_demand_report(
            report_type_enum, barber_id
        )

        return {
            "report_id": report_data.report_id,
            "report_type": report_data.report_type.value,
            "period_start": report_data.period_start.isoformat(),
            "period_end": report_data.period_end.isoformat(),
            "generated_at": report_data.generated_at.isoformat(),
            "data": report_data.data,
            "insights": report_data.insights,
            "recommendations": report_data.recommendations,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating on-demand report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reports/process")
async def trigger_report_generation(background_tasks: BackgroundTasks):
    """Manually trigger scheduled report generation"""
    try:
        background_tasks.add_task(generate_automated_reports)

        return {
            "status": "started",
            "message": "Report generation started in background",
        }

    except Exception as e:
        logger.error(f"Error triggering report generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Smart Scheduling Endpoints
@router.get("/scheduling/recommendations")
async def get_scheduling_recommendations(
    barber_id: int, target_date: Optional[str] = None, db: Session = Depends(get_db)
):
    """Get smart scheduling recommendations"""
    try:
        # Parse target date
        if target_date:
            try:
                target_date_obj = datetime.fromisoformat(target_date).date()
            except ValueError:
                raise HTTPException(
                    status_code=400, detail="Invalid date format. Use YYYY-MM-DD"
                )
        else:
            target_date_obj = date.today() + timedelta(days=1)

        # Generate recommendations
        service = SmartSchedulingService(db)
        recommendations = await service.generate_recommendations(
            barber_id, target_date_obj
        )

        recommendation_data = []
        for rec in recommendations:
            recommendation_data.append(
                {
                    "id": rec.recommendation_id,
                    "type": rec.recommendation_type.value,
                    "title": rec.title,
                    "description": rec.description,
                    "suggested_time": rec.suggested_time.isoformat(),
                    "client_id": rec.client_id,
                    "expected_revenue": rec.expected_revenue,
                    "confidence_score": rec.confidence_score,
                    "reasoning": rec.reasoning,
                    "action_required": rec.action_required,
                }
            )

        return {
            "recommendations": recommendation_data,
            "target_date": target_date_obj.isoformat(),
            "barber_id": barber_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scheduling recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduling/analysis")
async def get_schedule_analysis(
    barber_id: int, analysis_days: int = 7, db: Session = Depends(get_db)
):
    """Get schedule optimization analysis"""
    try:
        service = SmartSchedulingService(db)
        analysis = await service.get_schedule_optimization_analysis(
            barber_id, analysis_days
        )

        return analysis

    except Exception as e:
        logger.error(f"Error getting schedule analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduling/optimal-slots")
async def get_optimal_time_slots(
    barber_id: int, target_date: Optional[str] = None, db: Session = Depends(get_db)
):
    """Get optimal time slots for specific date"""
    try:
        # Parse target date
        if target_date:
            try:
                target_date_obj = datetime.fromisoformat(target_date).date()
            except ValueError:
                raise HTTPException(
                    status_code=400, detail="Invalid date format. Use YYYY-MM-DD"
                )
        else:
            target_date_obj = date.today() + timedelta(days=1)

        service = SmartSchedulingService(db)
        time_slots = await service.get_optimal_time_slots(barber_id, target_date_obj)

        slot_data = []
        for slot in time_slots:
            slot_data.append(
                {
                    "start_time": slot.start_time.strftime("%H:%M"),
                    "end_time": slot.end_time.strftime("%H:%M"),
                    "day_of_week": slot.day_of_week,
                    "slot_type": slot.slot_type.value,
                    "demand_score": slot.demand_score,
                    "revenue_potential": slot.revenue_potential,
                    "booking_probability": slot.booking_probability,
                }
            )

        return {
            "time_slots": slot_data,
            "target_date": target_date_obj.isoformat(),
            "barber_id": barber_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting optimal time slots: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Activity Log
@router.get("/activity")
async def get_automation_activity(
    limit: int = 50, activity_type: Optional[str] = None, db: Session = Depends(get_db)
):
    """Get automation activity log"""
    try:
        # Mock activity data for now
        # In production, this would query an activity log table
        mock_activity = [
            {
                "id": 1,
                "timestamp": "2024-12-18 16:45:23",
                "type": "client_followup",
                "action": "Email sent to John Smith",
                "workflow": "Post-Appointment Follow-up",
                "status": "success",
                "details": {"client_id": 123, "email": "john@example.com"},
            },
            {
                "id": 2,
                "timestamp": "2024-12-18 15:30:15",
                "type": "performance_alert",
                "action": "Alert triggered: Booking rate below threshold",
                "workflow": "Performance Monitoring",
                "status": "success",
                "details": {"alert_type": "booking_rate_low", "value": 65.0},
            },
            {
                "id": 3,
                "timestamp": "2024-12-18 14:30:45",
                "type": "client_followup",
                "action": "Welcome email sent to new client",
                "workflow": "New Client Welcome Series",
                "status": "success",
                "details": {"client_id": 124, "campaign": "new_client_welcome"},
            },
        ]

        # Filter by type if specified
        if activity_type:
            mock_activity = [a for a in mock_activity if a["type"] == activity_type]

        # Limit results
        mock_activity = mock_activity[:limit]

        return {"activity": mock_activity, "total": len(mock_activity), "limit": limit}

    except Exception as e:
        logger.error(f"Error getting automation activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def automation_health_check():
    """Health check for automation system"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "automation-engine",
    }
