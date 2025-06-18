"""
Training and certification API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from config.database import get_db
from models.user import User
from models.training import (
    TrainingModule, TrainingEnrollment, TrainingAttempt,
    Certification, UserCertification, SkillAssessment
)
from services.training_service import TrainingService
from services.rbac_service import RBACService, Permission
from .auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

# Pydantic models
class ModuleResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    difficulty_level: str
    content_type: str
    estimated_duration: int
    passing_score: float
    required_for_certification: Optional[str]
    is_mandatory: bool
    can_access: bool
    enrollment_status: str
    progress: float
    best_score: float

class EnrollmentResponse(BaseModel):
    id: int
    user_id: int
    module_id: int
    status: str
    progress_percentage: float
    attempts: int
    best_score: float
    enrolled_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

class AttemptCreate(BaseModel):
    answers: Dict[str, Any]

class AttemptResponse(BaseModel):
    id: int
    enrollment_id: int
    attempt_number: int
    score: float
    passed: bool
    started_at: datetime
    completed_at: Optional[datetime]
    time_taken: Optional[int]

    class Config:
        from_attributes = True

class CertificationResponse(BaseModel):
    id: int
    name: str
    level: str
    description: str
    required_score_average: float
    required_experience_months: int
    validity_period: int
    commission_bonus: float
    mentor_eligibility: bool
    is_active: bool

    class Config:
        from_attributes = True

class UserCertificationResponse(BaseModel):
    id: int
    certification_id: int
    certification_name: str
    certification_level: str
    earned_date: datetime
    expiry_date: Optional[datetime]
    final_score: float
    status: str

class SkillAssessmentCreate(BaseModel):
    user_id: int
    assessment_type: str
    skill_category: str
    technical_skill: float
    customer_interaction: float
    business_acumen: float
    sixfb_methodology: float
    strengths: str
    areas_for_improvement: str
    recommendations: str
    follow_up_required: bool = False
    location_id: Optional[int] = None

class ProgressResponse(BaseModel):
    user_info: Dict[str, Any]
    overall_progress: Dict[str, Any]
    module_progress: List[Dict[str, Any]]
    certifications: List[Dict[str, Any]]
    skill_assessments: List[Dict[str, Any]]

# API Endpoints
@router.get("/modules", response_model=List[ModuleResponse])
async def get_available_modules(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available training modules for current user"""
    service = TrainingService(db)
    modules = await service.get_available_modules(current_user)
    
    # Apply filters
    if category:
        modules = [m for m in modules if m['category'] == category]
    if difficulty:
        modules = [m for m in modules if m['difficulty_level'] == difficulty]
    
    return [ModuleResponse(**module) for module in modules]

@router.post("/modules/{module_id}/enroll", response_model=EnrollmentResponse)
async def enroll_in_module(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enroll current user in a training module"""
    service = TrainingService(db)
    
    # Check if module exists
    module = db.query(TrainingModule).filter(TrainingModule.id == module_id).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    try:
        enrollment = await service.enroll_user_in_module(current_user.id, module_id)
        return enrollment
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/modules/{module_id}/start-attempt", response_model=AttemptResponse)
async def start_module_attempt(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new attempt at a training module"""
    service = TrainingService(db)
    
    try:
        attempt = await service.start_module_attempt(current_user.id, module_id)
        return attempt
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/attempts/{attempt_id}/complete", response_model=AttemptResponse)
async def complete_module_attempt(
    attempt_id: int,
    attempt_data: AttemptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete a training module attempt"""
    # Verify attempt belongs to user
    attempt = db.query(TrainingAttempt).filter(TrainingAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )
    
    if attempt.enrollment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot complete another user's attempt"
        )
    
    # Calculate score (simplified - in real system would validate answers)
    score = 85.0  # Mock score
    
    service = TrainingService(db)
    completed_attempt = await service.complete_module_attempt(
        attempt_id, score, attempt_data.answers
    )
    
    return completed_attempt

@router.get("/certifications", response_model=List[CertificationResponse])
async def get_certifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available certifications"""
    certifications = db.query(Certification).filter(Certification.is_active == True).all()
    return certifications

@router.get("/my-certifications", response_model=List[UserCertificationResponse])
async def get_my_certifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's certifications"""
    user_certs = db.query(UserCertification).filter(
        UserCertification.user_id == current_user.id
    ).all()
    
    return [
        UserCertificationResponse(
            id=uc.id,
            certification_id=uc.certification_id,
            certification_name=uc.certification.name,
            certification_level=uc.certification.level,
            earned_date=uc.earned_date,
            expiry_date=uc.expiry_date,
            final_score=uc.final_score,
            status=uc.status
        )
        for uc in user_certs
    ]

@router.get("/progress/{user_id}", response_model=ProgressResponse)
async def get_user_training_progress(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get training progress for a user"""
    rbac = RBACService(db)
    
    # Check permissions
    if user_id != current_user.id:
        if not rbac.has_permission(current_user, Permission.VIEW_MENTEE_DATA):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to view this user's training progress"
            )
    
    service = TrainingService(db)
    progress = await service.get_user_training_progress(user_id)
    
    return ProgressResponse(**progress)

@router.post("/skill-assessment", response_model=Dict[str, Any])
async def create_skill_assessment(
    assessment_data: SkillAssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a skill assessment for a user"""
    rbac = RBACService(db)
    
    # Check permissions
    if not rbac.has_permission(current_user, Permission.MANAGE_TRAINING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to create skill assessments"
        )
    
    # Verify assessor can assess this user
    if assessment_data.location_id:
        accessible_locations = rbac.get_accessible_locations(current_user)
        if assessment_data.location_id not in accessible_locations:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to assess users at this location"
            )
    
    service = TrainingService(db)
    
    assessment_dict = assessment_data.dict()
    assessment_dict['assessor_id'] = current_user.id
    assessment_dict['assessment_date'] = datetime.utcnow()
    
    assessment = await service.create_skill_assessment(assessment_dict)
    
    return {
        "id": assessment.id,
        "user_id": assessment.user_id,
        "overall_score": assessment.overall_score,
        "assessment_date": assessment.assessment_date.isoformat()
    }

@router.get("/recommended-path")
async def get_recommended_training_path(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recommended training path for current user"""
    service = TrainingService(db)
    path = await service.get_recommended_training_path(current_user.id)
    
    if not path:
        return {"message": "No recommended path available"}
    
    return path

@router.get("/mentor-overview")
async def get_mentor_training_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get training overview for mentor's mentees"""
    rbac = RBACService(db)
    
    if not rbac.has_permission(current_user, Permission.VIEW_MENTEE_DATA):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view mentee training data"
        )
    
    # Get mentor's locations
    from models.location import Location
    mentor_locations = db.query(Location).filter(Location.mentor_id == current_user.id).all()
    
    if not mentor_locations:
        return {"mentees": [], "total_mentees": 0}
    
    # Get barbers from mentor's locations
    from models.barber import Barber
    mentee_data = []
    
    for location in mentor_locations:
        barbers = db.query(Barber).filter(Barber.location_id == location.id).all()
        
        for barber in barbers:
            if barber.user_id:
                user = db.query(User).filter(User.id == barber.user_id).first()
                if user:
                    # Get training progress summary
                    enrollments = db.query(TrainingEnrollment).filter(
                        TrainingEnrollment.user_id == user.id
                    ).all()
                    
                    completed_modules = len([e for e in enrollments if e.status == 'completed'])
                    in_progress_modules = len([e for e in enrollments if e.status == 'in_progress'])
                    
                    mentee_data.append({
                        "user_id": user.id,
                        "name": user.full_name,
                        "location": location.name,
                        "certification_level": user.sixfb_certification_level,
                        "modules_completed": completed_modules,
                        "modules_in_progress": in_progress_modules,
                        "last_activity": max([e.enrolled_at for e in enrollments]).isoformat() if enrollments else None
                    })
    
    return {
        "mentees": mentee_data,
        "total_mentees": len(mentee_data)
    }