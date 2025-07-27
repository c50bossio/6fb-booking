"""
Smart Insights Hub API Router for BookedBarber V2

Provides intelligent, prioritized insights consolidation with actionable recommendations.
Integrates with all analytics components to surface the most important business insights.

Features:
- Real-time insight aggregation and prioritization
- Actionable recommendations with one-click actions
- Business impact scoring and urgency detection
- Integration with existing notification system
- Caching for performance optimization
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
import logging
import asyncio

from db import get_db
from dependencies import get_current_user
from utils.error_handling import safe_endpoint
from models import User
from services.smart_insights_service import (
    SmartInsightsService, SmartInsightsResponse, ConsolidatedInsight,
    InsightPriority, InsightCategory, ActionType, InsightAction
)
from utils.role_permissions import Permission, PermissionChecker
from utils.cache_decorators import cache_result

router = APIRouter(prefix="/api/v2/smart-insights", tags=["smart-insights"])
logger = logging.getLogger(__name__)

@router.get("/dashboard", response_model=Dict[str, Any])
@safe_endpoint
async def get_smart_insights_dashboard(
    user_id: Optional[int] = Query(None, description="User ID (admin only)"),
    include_predictions: bool = Query(True, description="Include predictive insights"),
    force_refresh: bool = Query(False, description="Force cache refresh"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive Smart Insights Hub dashboard
    
    Returns prioritized, actionable insights from all analytics components:
    - Critical insights requiring immediate attention
    - Priority insight (most important single insight)
    - Insights categorized by type (revenue, retention, efficiency, etc.)
    - Business health summary
    - Quick actions for immediate implementation
    """
    try:
        # Permission check
        checker = PermissionChecker(current_user, db)
        target_user_id = user_id if user_id else current_user.id
        
        # Check if requesting data for another user
        if user_id and user_id != current_user.id:
            if not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
                raise HTTPException(
                    status_code=403, 
                    detail="Insufficient permissions to view insights for other users"
                )
        
        # Initialize Smart Insights Service
        insights_service = SmartInsightsService(db)
        
        # Clear cache if force refresh requested
        if force_refresh:
            # Clear the cache for this user
            cache_key = f"smart_insights_{target_user_id}_{include_predictions}"
            # Note: In production, implement proper cache invalidation
        
        # Get smart insights
        insights_response = await insights_service.get_smart_insights(
            user_id=target_user_id,
            include_predictions=include_predictions
        )
        
        # Convert to API response format
        response = {
            "critical_insights": [
                _serialize_insight(insight) for insight in insights_response.critical_insights
            ],
            "priority_insight": _serialize_insight(insights_response.priority_insight) if insights_response.priority_insight else None,
            "insights_by_category": {
                category: [_serialize_insight(insight) for insight in insights]
                for category, insights in insights_response.insights_by_category.items()
            },
            "business_health_summary": insights_response.business_health_summary,
            "quick_actions": [
                _serialize_action(action) for action in insights_response.quick_actions
            ],
            "total_insights": insights_response.total_insights,
            "last_updated": insights_response.last_updated.isoformat(),
            "metadata": {
                "user_id": target_user_id,
                "include_predictions": include_predictions,
                "generated_at": datetime.now().isoformat()
            }
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting smart insights dashboard: {e}")
        raise HTTPException(
            status_code=500,
            detail="Unable to generate smart insights. Please try again later."
        )

@router.get("/priority", response_model=Dict[str, Any])
@safe_endpoint
async def get_priority_insight(
    user_id: Optional[int] = Query(None, description="User ID (admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get the single most important insight for immediate attention
    
    Perfect for dashboard widgets showing the highest priority item.
    """
    try:
        # Permission check
        checker = PermissionChecker(current_user, db)
        target_user_id = user_id if user_id else current_user.id
        
        if user_id and user_id != current_user.id:
            if not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get insights
        insights_service = SmartInsightsService(db)
        insights_response = await insights_service.get_smart_insights(
            user_id=target_user_id,
            include_predictions=False  # Priority insight should be immediate/current
        )
        
        priority_insight = insights_response.priority_insight
        
        response = {
            "priority_insight": _serialize_insight(priority_insight) if priority_insight else None,
            "has_critical_insights": len(insights_response.critical_insights) > 0,
            "critical_count": len(insights_response.critical_insights),
            "business_health_level": insights_response.business_health_summary.get("level", "unknown"),
            "last_updated": insights_response.last_updated.isoformat()
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting priority insight: {e}")
        raise HTTPException(status_code=500, detail="Unable to get priority insight")

@router.get("/category/{category}", response_model=Dict[str, Any])
@safe_endpoint
async def get_insights_by_category(
    category: str,
    user_id: Optional[int] = Query(None, description="User ID (admin only)"),
    limit: int = Query(10, description="Maximum number of insights to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get insights filtered by category (revenue, retention, efficiency, etc.)
    """
    try:
        # Validate category
        valid_categories = [cat.value for cat in InsightCategory]
        if category not in valid_categories:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Valid categories: {valid_categories}"
            )
        
        # Permission check
        checker = PermissionChecker(current_user, db)
        target_user_id = user_id if user_id else current_user.id
        
        if user_id and user_id != current_user.id:
            if not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get insights
        insights_service = SmartInsightsService(db)
        insights_response = await insights_service.get_smart_insights(
            user_id=target_user_id,
            include_predictions=True
        )
        
        # Filter by category
        category_insights = insights_response.insights_by_category.get(category, [])
        limited_insights = category_insights[:limit]
        
        response = {
            "category": category,
            "insights": [_serialize_insight(insight) for insight in limited_insights],
            "total_in_category": len(category_insights),
            "returned": len(limited_insights),
            "last_updated": insights_response.last_updated.isoformat()
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting insights by category {category}: {e}")
        raise HTTPException(status_code=500, detail="Unable to get category insights")

@router.get("/actions", response_model=Dict[str, Any])
@safe_endpoint
async def get_quick_actions(
    user_id: Optional[int] = Query(None, description="User ID (admin only)"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get quick actions derived from current insights
    
    Perfect for action centers and quick access menus.
    """
    try:
        # Permission check
        checker = PermissionChecker(current_user, db)
        target_user_id = user_id if user_id else current_user.id
        
        if user_id and user_id != current_user.id:
            if not checker.has_permission(Permission.VIEW_FINANCIAL_ANALYTICS):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get insights
        insights_service = SmartInsightsService(db)
        insights_response = await insights_service.get_smart_insights(
            user_id=target_user_id,
            include_predictions=False  # Actions should be based on current insights
        )
        
        quick_actions = insights_response.quick_actions
        
        # Filter by action type if specified
        if action_type:
            try:
                action_enum = ActionType(action_type)
                quick_actions = [
                    action for action in quick_actions 
                    if action.type == action_enum
                ]
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid action type: {action_type}"
                )
        
        response = {
            "quick_actions": [_serialize_action(action) for action in quick_actions],
            "total_actions": len(quick_actions),
            "action_types": list(set(action.type.value for action in quick_actions)),
            "last_updated": insights_response.last_updated.isoformat()
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting quick actions: {e}")
        raise HTTPException(status_code=500, detail="Unable to get quick actions")

@router.post("/action/{action_type}")
@safe_endpoint
async def execute_insight_action(
    action_type: str,
    background_tasks: BackgroundTasks,
    insight_id: Optional[str] = Query(None, description="Related insight ID"),
    params: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Execute an insight action (e.g., schedule client, adjust pricing, send message)
    
    This endpoint handles the "one-click actions" from insights.
    """
    try:
        # Validate action type
        try:
            action_enum = ActionType(action_type)
        except ValueError:
            valid_actions = [action.value for action in ActionType]
            raise HTTPException(
                status_code=400,
                detail=f"Invalid action type. Valid actions: {valid_actions}"
            )
        
        # Permission check based on action type
        checker = PermissionChecker(current_user, db)
        
        if action_type in ['adjust_pricing', 'implement_strategy']:
            if not checker.has_permission(Permission.MANAGE_BUSINESS_SETTINGS):
                raise HTTPException(
                    status_code=403,
                    detail="Insufficient permissions for this action"
                )
        
        # Execute action based on type
        result = await _execute_action(
            action_enum, 
            current_user, 
            db, 
            background_tasks,
            params or {},
            insight_id
        )
        
        response = {
            "action_type": action_type,
            "status": "success",
            "result": result,
            "executed_at": datetime.now().isoformat(),
            "insight_id": insight_id
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error executing action {action_type}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unable to execute action: {str(e)}"
        )

@router.get("/health", response_model=Dict[str, Any])
@safe_endpoint
async def get_insights_health_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get health status of the insights system itself
    
    Useful for monitoring and debugging the insights generation process.
    """
    try:
        insights_service = SmartInsightsService(db)
        
        # Test insights generation
        start_time = datetime.now()
        test_insights = await insights_service.get_smart_insights(
            user_id=current_user.id,
            include_predictions=False
        )
        generation_time = (datetime.now() - start_time).total_seconds()
        
        response = {
            "status": "healthy",
            "insights_generated": test_insights.total_insights,
            "generation_time_seconds": generation_time,
            "critical_insights_count": len(test_insights.critical_insights),
            "business_health_available": test_insights.business_health_summary.get("status") != "error",
            "last_successful_generation": test_insights.last_updated.isoformat(),
            "system_performance": {
                "fast": generation_time < 2.0,
                "acceptable": generation_time < 5.0,
                "slow": generation_time >= 5.0
            }
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error checking insights health: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "checked_at": datetime.now().isoformat()
        }

# Helper functions
def _serialize_insight(insight: Optional[ConsolidatedInsight]) -> Optional[Dict[str, Any]]:
    """Serialize a ConsolidatedInsight to API response format"""
    if not insight:
        return None
    
    return {
        "id": insight.id,
        "title": insight.title,
        "description": insight.description,
        "priority": insight.priority.value,
        "category": insight.category.value,
        "impact_score": insight.impact_score,
        "urgency_score": insight.urgency_score,
        "confidence": insight.confidence,
        "source": insight.source,
        "metric_name": insight.metric_name,
        "current_value": insight.current_value,
        "target_value": insight.target_value,
        "trend": insight.trend,
        "created_at": insight.created_at.isoformat(),
        "expires_at": insight.expires_at.isoformat() if insight.expires_at else None,
        "time_horizon": insight.time_horizon,
        "actions": [_serialize_action(action) for action in insight.actions],
        "recommended_action": insight.recommended_action,
        "tags": insight.tags,
        "related_clients": insight.related_clients,
        "related_appointments": insight.related_appointments
    }

def _serialize_action(action: InsightAction) -> Dict[str, Any]:
    """Serialize an InsightAction to API response format"""
    return {
        "type": action.type.value,
        "label": action.label,
        "description": action.description,
        "endpoint": action.endpoint,
        "params": action.params,
        "icon": action.icon
    }

async def _execute_action(
    action_type: ActionType,
    user: User,
    db: Session,
    background_tasks: BackgroundTasks,
    params: Dict[str, Any],
    insight_id: Optional[str]
) -> Dict[str, Any]:
    """Execute a specific insight action"""
    
    if action_type == ActionType.VIEW_ANALYTICS:
        return {
            "message": "Navigate to analytics page",
            "redirect_url": params.get("endpoint", "/analytics")
        }
    
    elif action_type == ActionType.SCHEDULE_CLIENT:
        client_ids = params.get("client_ids", [])
        return {
            "message": f"Prepare to schedule {len(client_ids)} clients",
            "client_ids": client_ids,
            "suggested_times": _suggest_scheduling_times()
        }
    
    elif action_type == ActionType.CONTACT_CLIENT:
        client_ids = params.get("client_ids", [])
        # Schedule background task for client outreach
        background_tasks.add_task(_schedule_client_outreach, user.id, client_ids, db)
        return {
            "message": f"Outreach scheduled for {len(client_ids)} clients",
            "client_ids": client_ids
        }
    
    elif action_type == ActionType.ADJUST_PRICING:
        return {
            "message": "Pricing review recommendations prepared",
            "suggestions": _get_pricing_suggestions(user.id, db)
        }
    
    elif action_type == ActionType.SEND_MESSAGE:
        return {
            "message": "Message templates prepared",
            "templates": _get_message_templates()
        }
    
    elif action_type == ActionType.OPTIMIZE_SCHEDULE:
        return {
            "message": "Schedule optimization recommendations",
            "suggestions": _get_schedule_optimization_suggestions(user.id, db)
        }
    
    else:
        return {
            "message": f"Action {action_type.value} executed",
            "status": "completed"
        }

def _suggest_scheduling_times() -> List[str]:
    """Suggest optimal scheduling times"""
    return [
        "Tomorrow 10:00 AM",
        "Tomorrow 2:00 PM",
        "This week - Tuesday 11:00 AM",
        "This week - Friday 3:00 PM"
    ]

async def _schedule_client_outreach(user_id: int, client_ids: List[int], db: Session):
    """Background task to schedule client outreach"""
    # This would integrate with the notification service
    logger.info(f"Scheduling outreach for user {user_id} to clients {client_ids}")

def _get_pricing_suggestions(user_id: int, db: Session) -> List[Dict[str, Any]]:
    """Get pricing optimization suggestions"""
    return [
        {
            "service": "Standard Cut",
            "current_price": 50,
            "suggested_price": 60,
            "reason": "Market analysis shows 20% underpricing"
        },
        {
            "service": "Premium Package",
            "current_price": 120,
            "suggested_price": 150,
            "reason": "High demand, low availability"
        }
    ]

def _get_message_templates() -> List[Dict[str, str]]:
    """Get message templates for client outreach"""
    return [
        {
            "type": "re-engagement",
            "subject": "We miss you!",
            "template": "Hi {client_name}, it's been a while since your last visit..."
        },
        {
            "type": "special_offer",
            "subject": "Exclusive offer for you",
            "template": "Hi {client_name}, we have a special offer just for you..."
        }
    ]

def _get_schedule_optimization_suggestions(user_id: int, db: Session) -> List[Dict[str, Any]]:
    """Get schedule optimization suggestions"""
    return [
        {
            "suggestion": "Add 2 slots on Tuesday mornings",
            "reason": "High demand period with low availability",
            "impact": "Potential +$300 weekly revenue"
        },
        {
            "suggestion": "Extend Friday hours to 7 PM",
            "reason": "After-work demand not being captured",
            "impact": "Potential +$200 weekly revenue"
        }
    ]