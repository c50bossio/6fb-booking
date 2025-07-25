"""
Six Figure Barber Compliance API Router
Endpoints for compliance scoring and monitoring
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session

from db import get_db
from dependencies import get_current_user
from models import User
from services.six_fb_compliance_service import SixFBComplianceService
from schemas import BaseResponse


router = APIRouter(prefix="/six-fb-compliance", tags=["six-fb-compliance"])


@router.get("/score", response_model=BaseResponse)
async def get_compliance_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current 6FB compliance score for the authenticated user"""
    try:
        service = SixFBComplianceService(db)
        compliance_score = service.calculate_compliance_score(current_user.id)
        
        return BaseResponse(
            success=True,
            message="Compliance score retrieved successfully",
            data={
                "overall_score": compliance_score.overall_score,
                "tier_level": compliance_score.tier_level,
                "category_scores": {
                    "pricing_strategy": compliance_score.pricing_strategy_score,
                    "service_portfolio": compliance_score.service_portfolio_score,
                    "client_relationships": compliance_score.client_relationship_score,
                    "business_operations": compliance_score.business_operations_score,
                    "marketing_presence": compliance_score.marketing_presence_score,
                    "revenue_optimization": compliance_score.revenue_optimization_score
                },
                "last_calculated": compliance_score.last_calculated.isoformat(),
                "metrics": compliance_score.metrics
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard", response_model=BaseResponse)
async def get_compliance_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive compliance dashboard data"""
    try:
        service = SixFBComplianceService(db)
        dashboard_data = service.get_compliance_dashboard_data(current_user.id)
        
        return BaseResponse(
            success=True,
            message="Dashboard data retrieved successfully",
            data=dashboard_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recalculate", response_model=BaseResponse)
async def recalculate_compliance_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Force recalculation of compliance score"""
    try:
        service = SixFBComplianceService(db)
        compliance_score = service.calculate_compliance_score(current_user.id)
        
        return BaseResponse(
            success=True,
            message="Compliance score recalculated successfully",
            data={
                "overall_score": compliance_score.overall_score,
                "tier_level": compliance_score.tier_level,
                "previous_tier": compliance_score.metrics.get("previous_tier"),
                "score_change": compliance_score.metrics.get("score_change", 0)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/improvement-tasks", response_model=BaseResponse)
async def get_improvement_tasks(
    status: Optional[str] = Query(None, regex="^(pending|in_progress|completed|dismissed)$"),
    priority: Optional[str] = Query(None, regex="^(high|medium|low)$"),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get improvement tasks for the user"""
    try:
        from models.six_fb_compliance import SixFBComplianceScore, SixFBImprovementTask
        
        # Get user's compliance score
        compliance_score = db.query(SixFBComplianceScore).filter_by(
            user_id=current_user.id
        ).first()
        
        if not compliance_score:
            # Calculate if doesn't exist
            service = SixFBComplianceService(db)
            compliance_score = service.calculate_compliance_score(current_user.id)
        
        # Build query
        query = db.query(SixFBImprovementTask).filter_by(
            compliance_score_id=compliance_score.id
        )
        
        if status:
            query = query.filter_by(status=status)
        if priority:
            query = query.filter_by(priority=priority)
        if category:
            query = query.filter_by(category=category)
        
        tasks = query.order_by(SixFBImprovementTask.priority.desc()).all()
        
        return BaseResponse(
            success=True,
            message="Improvement tasks retrieved successfully",
            data={
                "tasks": [
                    {
                        "id": task.id,
                        "title": task.title,
                        "description": task.description,
                        "category": task.category,
                        "priority": task.priority,
                        "status": task.status,
                        "potential_score_improvement": task.potential_score_improvement,
                        "revenue_impact": task.revenue_impact,
                        "effort_required": task.effort_required,
                        "resources": task.resources,
                        "created_at": task.created_at.isoformat(),
                        "completed_at": task.completed_at.isoformat() if task.completed_at else None
                    }
                    for task in tasks
                ]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/improvement-tasks/{task_id}/complete", response_model=BaseResponse)
async def complete_improvement_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark an improvement task as complete"""
    try:
        from models.six_fb_compliance import SixFBImprovementTask
        
        # Verify task belongs to user
        task = db.query(SixFBImprovementTask).join(
            SixFBImprovementTask.compliance_score
        ).filter(
            SixFBImprovementTask.id == task_id,
            SixFBComplianceScore.user_id == current_user.id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        service = SixFBComplianceService(db)
        success = service.mark_task_complete(task_id)
        
        if success:
            return BaseResponse(
                success=True,
                message="Task marked as complete",
                data={"task_id": task_id, "new_status": "completed"}
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to complete task")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance-checks/{category}", response_model=BaseResponse)
async def get_compliance_checks_by_category(
    category: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed compliance checks for a specific category"""
    try:
        from models.six_fb_compliance import SixFBComplianceScore, SixFBComplianceCheck
        
        # Valid categories
        valid_categories = [
            'pricing_strategy', 'service_portfolio', 'client_relationships',
            'business_operations', 'marketing_presence', 'revenue_optimization'
        ]
        
        if category not in valid_categories:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
            )
        
        # Get user's compliance score
        compliance_score = db.query(SixFBComplianceScore).filter_by(
            user_id=current_user.id
        ).first()
        
        if not compliance_score:
            return BaseResponse(
                success=True,
                message="No compliance data found",
                data={"checks": []}
            )
        
        # Get checks for category
        checks = db.query(SixFBComplianceCheck).filter_by(
            compliance_score_id=compliance_score.id,
            category=category
        ).all()
        
        return BaseResponse(
            success=True,
            message=f"Compliance checks for {category} retrieved successfully",
            data={
                "category": category,
                "checks": [
                    {
                        "name": check.check_name,
                        "description": check.description,
                        "passed": check.passed,
                        "score": check.score,
                        "weight": check.weight,
                        "feedback": check.feedback,
                        "recommendation": check.recommendation,
                        "checked_at": check.checked_at.isoformat()
                    }
                    for check in checks
                ]
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=BaseResponse)
async def get_compliance_history(
    limit: int = Query(12, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get historical compliance scores"""
    try:
        from models.six_fb_compliance import SixFBComplianceHistory
        
        history = db.query(SixFBComplianceHistory).filter_by(
            user_id=current_user.id
        ).order_by(SixFBComplianceHistory.recorded_at.desc()).limit(limit).all()
        
        return BaseResponse(
            success=True,
            message="Compliance history retrieved successfully",
            data={
                "history": [
                    {
                        "date": h.recorded_at.isoformat(),
                        "overall_score": h.overall_score,
                        "tier_level": h.tier_level,
                        "category_scores": h.category_scores,
                        "score_change": h.score_change,
                        "period_start": h.period_start.isoformat(),
                        "period_end": h.period_end.isoformat(),
                        "improvements_made": h.improvements_made,
                        "challenges_faced": h.challenges_faced
                    }
                    for h in reversed(history)  # Chronological order
                ]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/benchmarks/{tier}", response_model=BaseResponse)
async def get_tier_benchmarks(
    tier: str = Path(..., regex="^(starter|professional|premium|luxury)$"),
    db: Session = Depends(get_db)
):
    """Get 6FB benchmarks for a specific tier"""
    try:
        service = SixFBComplianceService(db)
        benchmarks = service.get_benchmarks_for_tier(tier)
        
        return BaseResponse(
            success=True,
            message=f"Benchmarks for {tier} tier retrieved successfully",
            data={
                "tier": tier,
                "benchmarks": benchmarks
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/populate-benchmarks", response_model=BaseResponse)
async def populate_benchmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Populate default 6FB benchmarks (admin only)"""
    try:
        # Check if user is admin
        if current_user.role not in ['admin', 'super_admin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from models.six_fb_compliance import SixFBBenchmark
        
        # Define default benchmarks
        benchmarks = [
            # Pricing benchmarks
            {
                "metric_name": "average_service_price",
                "category": "pricing_strategy",
                "tier_level": "starter",
                "minimum_value": 25.0,
                "target_value": 35.0,
                "excellence_value": 45.0,
                "description": "Average price across all services",
                "unit": "dollars"
            },
            {
                "metric_name": "average_service_price",
                "category": "pricing_strategy",
                "tier_level": "professional",
                "minimum_value": 35.0,
                "target_value": 50.0,
                "excellence_value": 65.0,
                "description": "Average price across all services",
                "unit": "dollars"
            },
            {
                "metric_name": "average_service_price",
                "category": "pricing_strategy",
                "tier_level": "premium",
                "minimum_value": 50.0,
                "target_value": 75.0,
                "excellence_value": 95.0,
                "description": "Average price across all services",
                "unit": "dollars"
            },
            {
                "metric_name": "average_service_price",
                "category": "pricing_strategy",
                "tier_level": "luxury",
                "minimum_value": 75.0,
                "target_value": 100.0,
                "excellence_value": 150.0,
                "description": "Average price across all services",
                "unit": "dollars"
            },
            # Client retention benchmarks
            {
                "metric_name": "client_retention_rate",
                "category": "client_relationships",
                "tier_level": "starter",
                "minimum_value": 50.0,
                "target_value": 60.0,
                "excellence_value": 70.0,
                "description": "Percentage of clients who return within 6 weeks",
                "unit": "percentage"
            },
            {
                "metric_name": "client_retention_rate",
                "category": "client_relationships",
                "tier_level": "professional",
                "minimum_value": 60.0,
                "target_value": 70.0,
                "excellence_value": 80.0,
                "description": "Percentage of clients who return within 6 weeks",
                "unit": "percentage"
            },
            {
                "metric_name": "client_retention_rate",
                "category": "client_relationships",
                "tier_level": "premium",
                "minimum_value": 70.0,
                "target_value": 80.0,
                "excellence_value": 90.0,
                "description": "Percentage of clients who return within 6 weeks",
                "unit": "percentage"
            },
            {
                "metric_name": "client_retention_rate",
                "category": "client_relationships",
                "tier_level": "luxury",
                "minimum_value": 80.0,
                "target_value": 90.0,
                "excellence_value": 95.0,
                "description": "Percentage of clients who return within 6 weeks",
                "unit": "percentage"
            }
        ]
        
        # Add benchmarks to database
        added = 0
        for benchmark_data in benchmarks:
            # Check if already exists
            existing = db.query(SixFBBenchmark).filter_by(
                metric_name=benchmark_data["metric_name"],
                tier_level=benchmark_data["tier_level"]
            ).first()
            
            if not existing:
                benchmark = SixFBBenchmark(**benchmark_data)
                db.add(benchmark)
                added += 1
        
        db.commit()
        
        return BaseResponse(
            success=True,
            message=f"Added {added} benchmarks to database",
            data={"benchmarks_added": added}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))