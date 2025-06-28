"""
Automation API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from config.database import get_db
from models.user import User
from models.automation import AutomationRule, WorkflowLog
from services.automation_engine import AutomationEngine
from services.rbac_service import RBACService, Permission
from .auth import get_current_user
from pydantic import BaseModel

router = APIRouter()


# Pydantic models
class AutomationRuleCreate(BaseModel):
    name: str
    description: str
    rule_type: str
    trigger_event: str
    trigger_conditions: Dict[str, Any]
    action_type: str
    action_config: Dict[str, Any]
    is_active: bool = True
    priority: int = 10


class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_conditions: Optional[Dict[str, Any]] = None
    action_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None


class AutomationRuleResponse(BaseModel):
    id: int
    name: str
    description: str
    rule_type: str
    trigger_event: str
    trigger_conditions: Dict[str, Any]
    action_type: str
    action_config: Dict[str, Any]
    is_active: bool
    priority: int
    execution_count: int
    last_executed: Optional[datetime]
    created_at: datetime
    created_by: int

    class Config:
        from_attributes = True


class WorkflowLogResponse(BaseModel):
    id: int
    rule_id: int
    rule_name: str
    execution_time: datetime
    status: str
    trigger_data: Dict[str, Any]
    action_result: Optional[Dict[str, Any]]
    error_message: Optional[str]

    class Config:
        from_attributes = True


# API Endpoints
@router.get("/rules", response_model=List[AutomationRuleResponse])
async def get_automation_rules(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    rule_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of automation rules"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_AUTOMATION_LOGS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view automation rules",
        )

    query = db.query(AutomationRule)

    # Apply filters
    if rule_type:
        query = query.filter(AutomationRule.rule_type == rule_type)
    if is_active is not None:
        query = query.filter(AutomationRule.is_active == is_active)

    rules = (
        query.order_by(AutomationRule.priority.desc()).offset(skip).limit(limit).all()
    )

    return rules


@router.post("/rules", response_model=AutomationRuleResponse)
async def create_automation_rule(
    rule_data: AutomationRuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create new automation rule"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.CONFIGURE_WORKFLOWS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to create automation rules",
        )

    # Validate rule type and trigger
    valid_rule_types = ["client_follow_up", "performance_alert", "reminder", "campaign"]
    if rule_data.rule_type not in valid_rule_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid rule type. Must be one of: {', '.join(valid_rule_types)}",
        )

    # Create rule
    new_rule = AutomationRule(**rule_data.dict(), created_by=current_user.id)

    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    return new_rule


@router.get("/rules/{rule_id}", response_model=AutomationRuleResponse)
async def get_automation_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get specific automation rule"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_AUTOMATION_LOGS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view automation rules",
        )

    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found"
        )

    return rule


@router.put("/rules/{rule_id}", response_model=AutomationRuleResponse)
async def update_automation_rule(
    rule_id: int,
    rule_update: AutomationRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update automation rule"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.CONFIGURE_WORKFLOWS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to update automation rules",
        )

    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found"
        )

    # Update fields
    update_data = rule_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)

    rule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rule)

    return rule


@router.delete("/rules/{rule_id}")
async def delete_automation_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete automation rule"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.CONFIGURE_WORKFLOWS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to delete automation rules",
        )

    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found"
        )

    db.delete(rule)
    db.commit()

    return {"message": "Automation rule deleted successfully"}


@router.get("/logs", response_model=List[WorkflowLogResponse])
async def get_automation_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    rule_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get automation execution logs"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_AUTOMATION_LOGS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view automation logs",
        )

    query = db.query(WorkflowLog)

    # Apply filters
    if rule_id:
        query = query.filter(WorkflowLog.rule_id == rule_id)
    if status:
        query = query.filter(WorkflowLog.status == status)
    if start_date:
        query = query.filter(WorkflowLog.execution_time >= start_date)
    if end_date:
        query = query.filter(WorkflowLog.execution_time <= end_date)

    logs = (
        query.order_by(WorkflowLog.execution_time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Build response with rule names
    result = []
    for log in logs:
        rule = db.query(AutomationRule).filter(AutomationRule.id == log.rule_id).first()
        result.append(
            WorkflowLogResponse(
                id=log.id,
                rule_id=log.rule_id,
                rule_name=rule.name if rule else "Unknown",
                execution_time=log.execution_time,
                status=log.status,
                trigger_data=log.trigger_data or {},
                action_result=log.action_result,
                error_message=log.error_message,
            )
        )

    return result


@router.post("/rules/{rule_id}/test")
async def test_automation_rule(
    rule_id: int,
    test_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Test automation rule with sample data"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.CONFIGURE_WORKFLOWS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to test automation rules",
        )

    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Automation rule not found"
        )

    # Test rule execution
    engine = AutomationEngine(db)

    try:
        # Check if trigger conditions match
        matches = engine._check_trigger_conditions(rule.trigger_conditions, test_data)

        if not matches:
            return {
                "status": "no_match",
                "message": "Test data does not match trigger conditions",
                "trigger_conditions": rule.trigger_conditions,
                "test_data": test_data,
            }

        # Simulate action execution (without actually executing)
        return {
            "status": "would_execute",
            "message": "Rule would execute with this data",
            "action_type": rule.action_type,
            "action_config": rule.action_config,
            "test_data": test_data,
        }

    except Exception as e:
        return {"status": "error", "message": str(e), "test_data": test_data}


@router.get("/stats")
async def get_automation_stats(
    period_days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get automation statistics"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_AUTOMATION_LOGS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view automation statistics",
        )

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period_days)

    # Get stats
    total_rules = db.query(AutomationRule).count()
    active_rules = (
        db.query(AutomationRule).filter(AutomationRule.is_active == True).count()
    )

    total_executions = (
        db.query(WorkflowLog).filter(WorkflowLog.execution_time >= start_date).count()
    )

    successful_executions = (
        db.query(WorkflowLog)
        .filter(
            WorkflowLog.execution_time >= start_date, WorkflowLog.status == "success"
        )
        .count()
    )

    failed_executions = (
        db.query(WorkflowLog)
        .filter(
            WorkflowLog.execution_time >= start_date, WorkflowLog.status == "failed"
        )
        .count()
    )

    # Get most active rules
    most_active = (
        db.query(
            WorkflowLog.rule_id, func.count(WorkflowLog.id).label("execution_count")
        )
        .filter(WorkflowLog.execution_time >= start_date)
        .group_by(WorkflowLog.rule_id)
        .order_by(desc("execution_count"))
        .limit(5)
        .all()
    )

    most_active_rules = []
    for rule_id, count in most_active:
        rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
        if rule:
            most_active_rules.append(
                {"rule_id": rule_id, "rule_name": rule.name, "execution_count": count}
            )

    return {
        "period_days": period_days,
        "rule_stats": {
            "total_rules": total_rules,
            "active_rules": active_rules,
            "inactive_rules": total_rules - active_rules,
        },
        "execution_stats": {
            "total_executions": total_executions,
            "successful_executions": successful_executions,
            "failed_executions": failed_executions,
            "success_rate": (
                (successful_executions / total_executions * 100)
                if total_executions > 0
                else 0
            ),
        },
        "most_active_rules": most_active_rules,
    }


@router.post("/trigger/{event_type}")
async def trigger_automation_event(
    event_type: str,
    event_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually trigger automation event"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.MANAGE_AUTOMATION):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to trigger automation events",
        )

    # Process event
    engine = AutomationEngine(db)
    results = await engine.process_event(event_type, event_data)

    return {
        "event_type": event_type,
        "event_data": event_data,
        "rules_evaluated": results["rules_evaluated"],
        "rules_executed": results["rules_executed"],
        "execution_results": results["results"],
    }
