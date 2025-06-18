"""
Training and Certification Service
Manages 6FB training programs, skill assessments, and certification tracking
"""
import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from models.training import (
    TrainingModule, TrainingEnrollment, TrainingAttempt, 
    Certification, UserCertification, SkillAssessment,
    TrainingPath, TrainingPathEnrollment
)
from models.user import User
from models.location import Location
from config.database import get_db

logger = logging.getLogger(__name__)

class TrainingService:
    """Service for managing training and certification programs"""
    
    def __init__(self, db: Session):
        self.db = db
        self._initialize_default_content()
    
    def _initialize_default_content(self):
        """Initialize default training modules and certifications if not exists"""
        # Check if default content exists
        existing_modules = self.db.query(TrainingModule).count()
        if existing_modules == 0:
            self._create_default_modules()
        
        existing_certs = self.db.query(Certification).count()
        if existing_certs == 0:
            self._create_default_certifications()
    
    def _create_default_modules(self):
        """Create default 6FB training modules"""
        default_modules = [
            {
                'title': '6FB Methodology Foundation',
                'description': 'Introduction to the Six Figure Barber methodology and core principles',
                'category': 'basic',
                'difficulty_level': 'beginner',
                'content_type': 'video',
                'estimated_duration': 90,
                'required_for_certification': 'bronze',
                'is_mandatory': True,
                'passing_score': 85.0
            },
            {
                'title': 'Booking Efficiency Mastery',
                'description': 'Learn to optimize your schedule for maximum utilization and revenue',
                'category': 'basic',
                'difficulty_level': 'intermediate',
                'content_type': 'interactive',
                'estimated_duration': 120,
                'required_for_certification': 'bronze',
                'is_mandatory': True,
                'passing_score': 80.0
            },
            {
                'title': 'Client Retention Strategies',
                'description': 'Advanced techniques for building lasting client relationships',
                'category': 'intermediate',
                'difficulty_level': 'intermediate',
                'content_type': 'video',
                'estimated_duration': 105,
                'required_for_certification': 'silver',
                'passing_score': 82.0
            },
            {
                'title': 'Revenue Optimization Techniques',
                'description': 'Upselling, premium services, and revenue maximization strategies',
                'category': 'intermediate',
                'difficulty_level': 'intermediate',
                'content_type': 'document',
                'estimated_duration': 75,
                'required_for_certification': 'silver',
                'passing_score': 80.0
            },
            {
                'title': 'Advanced 6FB Analytics',
                'description': 'Deep dive into performance metrics and data-driven decision making',
                'category': 'advanced',
                'difficulty_level': 'advanced',
                'content_type': 'interactive',
                'estimated_duration': 150,
                'required_for_certification': 'gold',
                'passing_score': 85.0
            },
            {
                'title': 'Mentorship and Leadership',
                'description': 'Developing skills to mentor other barbers and lead teams',
                'category': 'advanced',
                'difficulty_level': 'expert',
                'content_type': 'video',
                'estimated_duration': 180,
                'required_for_certification': 'platinum',
                'passing_score': 90.0
            },
            {
                'title': 'Business Management Fundamentals',
                'description': 'Essential business skills for barbershop management',
                'category': 'specialty',
                'difficulty_level': 'intermediate',
                'content_type': 'document',
                'estimated_duration': 120,
                'required_for_certification': 'gold',
                'passing_score': 80.0
            }
        ]
        
        for module_data in default_modules:
            module = TrainingModule(**module_data)
            self.db.add(module)
        
        self.db.commit()
        logger.info("Created default training modules")
    
    def _create_default_certifications(self):
        """Create default certification levels"""
        default_certifications = [
            {
                'name': '6FB Bronze Certification',
                'level': 'bronze',
                'description': 'Entry-level certification covering 6FB fundamentals',
                'required_score_average': 80.0,
                'required_experience_months': 0,
                'validity_period': 12,
                'commission_bonus': 0.5,
                'mentor_eligibility': False
            },
            {
                'name': '6FB Silver Certification',
                'level': 'silver',
                'description': 'Intermediate certification demonstrating proficiency in 6FB techniques',
                'required_score_average': 82.0,
                'required_experience_months': 6,
                'validity_period': 18,
                'commission_bonus': 1.0,
                'mentor_eligibility': False
            },
            {
                'name': '6FB Gold Certification',
                'level': 'gold',
                'description': 'Advanced certification for experienced practitioners',
                'required_score_average': 85.0,
                'required_experience_months': 12,
                'validity_period': 24,
                'commission_bonus': 2.0,
                'mentor_eligibility': True
            },
            {
                'name': '6FB Platinum Certification',
                'level': 'platinum',
                'description': 'Master-level certification for mentors and leaders',
                'required_score_average': 90.0,
                'required_experience_months': 24,
                'validity_period': 36,
                'commission_bonus': 3.0,
                'mentor_eligibility': True
            }
        ]
        
        for cert_data in default_certifications:
            certification = Certification(**cert_data)
            self.db.add(certification)
        
        self.db.commit()
        logger.info("Created default certifications")
    
    # Training Module Management
    async def get_available_modules(self, user: User) -> List[Dict[str, Any]]:
        """Get available training modules for user"""
        try:
            # Get user's current certification level
            user_cert = self._get_user_highest_certification(user.id)
            current_level = user_cert.certification.level if user_cert else None
            
            # Get all active modules
            modules = self.db.query(TrainingModule).filter(TrainingModule.is_active == True).all()
            
            available_modules = []
            for module in modules:
                # Check if user can access this module
                can_access = self._can_user_access_module(user.id, module, current_level)
                
                # Get user's enrollment status
                enrollment = self.db.query(TrainingEnrollment).filter(
                    and_(
                        TrainingEnrollment.user_id == user.id,
                        TrainingEnrollment.module_id == module.id
                    )
                ).first()
                
                module_data = {
                    'id': module.id,
                    'title': module.title,
                    'description': module.description,
                    'category': module.category,
                    'difficulty_level': module.difficulty_level,
                    'content_type': module.content_type,
                    'estimated_duration': module.estimated_duration,
                    'passing_score': module.passing_score,
                    'required_for_certification': module.required_for_certification,
                    'is_mandatory': module.is_mandatory,
                    'can_access': can_access,
                    'enrollment_status': enrollment.status if enrollment else 'not_enrolled',
                    'progress': enrollment.progress_percentage if enrollment else 0,
                    'best_score': enrollment.best_score if enrollment else 0
                }
                
                available_modules.append(module_data)
            
            return available_modules
            
        except Exception as e:
            logger.error(f"Error getting available modules for user {user.id}: {e}")
            raise
    
    def _can_user_access_module(self, user_id: int, module: TrainingModule, current_cert_level: Optional[str]) -> bool:
        """Check if user can access specific module"""
        # Check prerequisites
        if module.prerequisites:
            for prereq_id in module.prerequisites:
                enrollment = self.db.query(TrainingEnrollment).filter(
                    and_(
                        TrainingEnrollment.user_id == user_id,
                        TrainingEnrollment.module_id == prereq_id,
                        TrainingEnrollment.status == 'completed'
                    )
                ).first()
                
                if not enrollment:
                    return False
        
        # Check certification level requirements
        cert_hierarchy = {'bronze': 1, 'silver': 2, 'gold': 3, 'platinum': 4}
        
        if module.required_for_certification:
            required_level = cert_hierarchy.get(module.required_for_certification, 1)
            current_level = cert_hierarchy.get(current_cert_level, 0)
            
            # Allow access if user is at or approaching the required certification level
            return current_level >= required_level - 1
        
        return True
    
    async def enroll_user_in_module(self, user_id: int, module_id: int, enrolled_by: Optional[int] = None) -> TrainingEnrollment:
        """Enroll user in training module"""
        try:
            # Check if already enrolled
            existing_enrollment = self.db.query(TrainingEnrollment).filter(
                and_(
                    TrainingEnrollment.user_id == user_id,
                    TrainingEnrollment.module_id == module_id
                )
            ).first()
            
            if existing_enrollment:
                if existing_enrollment.status in ['completed', 'in_progress']:
                    raise ValueError("User already enrolled in this module")
                else:
                    # Re-activate enrollment
                    existing_enrollment.status = 'enrolled'
                    existing_enrollment.enrolled_at = datetime.utcnow()
                    self.db.commit()
                    return existing_enrollment
            
            # Create new enrollment
            module = self.db.query(TrainingModule).filter(TrainingModule.id == module_id).first()
            if not module:
                raise ValueError(f"Module {module_id} not found")
            
            enrollment = TrainingEnrollment(
                user_id=user_id,
                module_id=module_id,
                status='enrolled',
                contributes_to_certification=module.required_for_certification
            )
            
            self.db.add(enrollment)
            self.db.commit()
            self.db.refresh(enrollment)
            
            logger.info(f"User {user_id} enrolled in module {module_id}")
            return enrollment
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error enrolling user {user_id} in module {module_id}: {e}")
            raise
    
    async def start_module_attempt(self, user_id: int, module_id: int) -> TrainingAttempt:
        """Start a new attempt at a training module"""
        try:
            enrollment = self.db.query(TrainingEnrollment).filter(
                and_(
                    TrainingEnrollment.user_id == user_id,
                    TrainingEnrollment.module_id == module_id
                )
            ).first()
            
            if not enrollment:
                raise ValueError("User not enrolled in this module")
            
            module = enrollment.module
            
            # Check attempt limits
            if enrollment.attempts >= module.max_attempts:
                raise ValueError(f"Maximum attempts ({module.max_attempts}) exceeded")
            
            # Create new attempt
            attempt = TrainingAttempt(
                enrollment_id=enrollment.id,
                attempt_number=enrollment.attempts + 1
            )
            
            # Update enrollment
            enrollment.attempts += 1
            enrollment.status = 'in_progress'
            if not enrollment.started_at:
                enrollment.started_at = datetime.utcnow()
            
            self.db.add(attempt)
            self.db.commit()
            self.db.refresh(attempt)
            
            logger.info(f"Started attempt {attempt.attempt_number} for user {user_id} on module {module_id}")
            return attempt
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error starting module attempt: {e}")
            raise
    
    async def complete_module_attempt(self, attempt_id: int, score: float, answers: Dict[str, Any]) -> TrainingAttempt:
        """Complete a training module attempt"""
        try:
            attempt = self.db.query(TrainingAttempt).filter(TrainingAttempt.id == attempt_id).first()
            if not attempt:
                raise ValueError(f"Attempt {attempt_id} not found")
            
            enrollment = attempt.enrollment
            module = enrollment.module
            
            # Calculate completion
            passed = score >= module.passing_score
            
            # Update attempt
            attempt.score = score
            attempt.passed = passed
            attempt.completed_at = datetime.utcnow()
            attempt.answers = answers
            
            if attempt.started_at:
                time_taken = (attempt.completed_at - attempt.started_at).seconds // 60
                attempt.time_taken = time_taken
                enrollment.time_spent += time_taken
            
            # Update enrollment
            enrollment.latest_score = score
            if score > enrollment.best_score:
                enrollment.best_score = score
            
            if passed:
                enrollment.status = 'completed'
                enrollment.completed_at = datetime.utcnow()
                enrollment.progress_percentage = 100.0
                enrollment.certification_points = self._calculate_certification_points(module, score)
            else:
                enrollment.status = 'enrolled'  # Allow retry
            
            self.db.commit()
            
            # Check for certification eligibility
            if passed:
                await self._check_certification_eligibility(enrollment.user_id)
            
            logger.info(f"Completed attempt {attempt_id} with score {score} (passed: {passed})")
            return attempt
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error completing module attempt: {e}")
            raise
    
    def _calculate_certification_points(self, module: TrainingModule, score: float) -> float:
        """Calculate certification points based on module and score"""
        base_points = {
            'basic': 10,
            'intermediate': 15,
            'advanced': 20,
            'specialty': 12
        }
        
        category_points = base_points.get(module.category, 10)
        score_multiplier = score / 100.0
        
        return category_points * score_multiplier
    
    # Certification Management
    async def _check_certification_eligibility(self, user_id: int):
        """Check if user is eligible for any certifications"""
        try:
            certifications = self.db.query(Certification).filter(Certification.is_active == True).all()
            
            for cert in certifications:
                if await self._is_user_eligible_for_certification(user_id, cert):
                    await self._award_certification(user_id, cert.id)
            
        except Exception as e:
            logger.error(f"Error checking certification eligibility for user {user_id}: {e}")
    
    async def _is_user_eligible_for_certification(self, user_id: int, certification: Certification) -> bool:
        """Check if user meets certification requirements"""
        # Check if already has this certification
        existing = self.db.query(UserCertification).filter(
            and_(
                UserCertification.user_id == user_id,
                UserCertification.certification_id == certification.id,
                UserCertification.status == 'active'
            )
        ).first()
        
        if existing:
            return False
        
        # Check required modules
        if certification.required_modules:
            for module_id in certification.required_modules:
                enrollment = self.db.query(TrainingEnrollment).filter(
                    and_(
                        TrainingEnrollment.user_id == user_id,
                        TrainingEnrollment.module_id == module_id,
                        TrainingEnrollment.status == 'completed'
                    )
                ).first()
                
                if not enrollment or enrollment.best_score < certification.required_score_average:
                    return False
        
        # Check prerequisite certifications
        if certification.prerequisite_certifications:
            for prereq_cert_id in certification.prerequisite_certifications:
                prereq = self.db.query(UserCertification).filter(
                    and_(
                        UserCertification.user_id == user_id,
                        UserCertification.certification_id == prereq_cert_id,
                        UserCertification.status == 'active'
                    )
                ).first()
                
                if not prereq:
                    return False
        
        # Check experience requirements (simplified)
        user = self.db.query(User).filter(User.id == user_id).first()
        if user and user.created_at:
            months_experience = (datetime.utcnow() - user.created_at).days // 30
            if months_experience < certification.required_experience_months:
                return False
        
        return True
    
    async def _award_certification(self, user_id: int, certification_id: int, mentor_id: Optional[int] = None):
        """Award certification to user"""
        try:
            certification = self.db.query(Certification).filter(Certification.id == certification_id).first()
            if not certification:
                return
            
            # Calculate final score based on completed modules
            module_scores = []
            if certification.required_modules:
                for module_id in certification.required_modules:
                    enrollment = self.db.query(TrainingEnrollment).filter(
                        and_(
                            TrainingEnrollment.user_id == user_id,
                            TrainingEnrollment.module_id == module_id,
                            TrainingEnrollment.status == 'completed'
                        )
                    ).first()
                    
                    if enrollment:
                        module_scores.append(enrollment.best_score)
            
            final_score = sum(module_scores) / len(module_scores) if module_scores else 0
            
            # Calculate expiry date
            expiry_date = datetime.utcnow() + timedelta(days=certification.validity_period * 30)
            
            # Create user certification
            user_certification = UserCertification(
                user_id=user_id,
                certification_id=certification_id,
                earned_date=datetime.utcnow(),
                expiry_date=expiry_date if certification.requires_renewal else None,
                final_score=final_score,
                mentor_id=mentor_id,
                status='active'
            )
            
            self.db.add(user_certification)
            
            # Update user certification level
            user = self.db.query(User).filter(User.id == user_id).first()
            if user:
                user.sixfb_certification_level = certification.level
                user.certification_date = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"Awarded {certification.name} to user {user_id}")
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error awarding certification: {e}")
    
    def _get_user_highest_certification(self, user_id: int) -> Optional[UserCertification]:
        """Get user's highest active certification"""
        cert_hierarchy = {'bronze': 1, 'silver': 2, 'gold': 3, 'platinum': 4}
        
        user_certs = self.db.query(UserCertification).filter(
            and_(
                UserCertification.user_id == user_id,
                UserCertification.status == 'active'
            )
        ).all()
        
        if not user_certs:
            return None
        
        # Find highest level certification
        highest_cert = max(user_certs, key=lambda x: cert_hierarchy.get(x.certification.level, 0))
        return highest_cert
    
    # Skill Assessment
    async def create_skill_assessment(self, assessment_data: Dict[str, Any]) -> SkillAssessment:
        """Create a new skill assessment"""
        try:
            assessment = SkillAssessment(**assessment_data)
            
            # Calculate overall score
            scores = [
                assessment.technical_skill,
                assessment.customer_interaction,
                assessment.business_acumen,
                assessment.sixfb_methodology
            ]
            assessment.overall_score = sum(scores) / len(scores) if scores else 0
            
            self.db.add(assessment)
            self.db.commit()
            self.db.refresh(assessment)
            
            logger.info(f"Created skill assessment for user {assessment.user_id}")
            return assessment
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating skill assessment: {e}")
            raise
    
    async def get_user_training_progress(self, user_id: int) -> Dict[str, Any]:
        """Get comprehensive training progress for user"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User {user_id} not found")
            
            # Get enrollments
            enrollments = self.db.query(TrainingEnrollment).filter(
                TrainingEnrollment.user_id == user_id
            ).all()
            
            # Get certifications
            certifications = self.db.query(UserCertification).filter(
                UserCertification.user_id == user_id
            ).all()
            
            # Get skill assessments
            assessments = self.db.query(SkillAssessment).filter(
                SkillAssessment.user_id == user_id
            ).order_by(desc(SkillAssessment.assessment_date)).all()
            
            # Calculate progress metrics
            total_modules = self.db.query(TrainingModule).filter(TrainingModule.is_active == True).count()
            completed_modules = len([e for e in enrollments if e.status == 'completed'])
            in_progress_modules = len([e for e in enrollments if e.status == 'in_progress'])
            
            overall_progress = (completed_modules / total_modules * 100) if total_modules > 0 else 0
            
            # Current certification level
            current_cert = self._get_user_highest_certification(user_id)
            
            progress_data = {
                'user_info': {
                    'id': user.id,
                    'name': user.full_name,
                    'current_certification': current_cert.certification.level if current_cert else None,
                    'certification_date': current_cert.earned_date.isoformat() if current_cert else None
                },
                'overall_progress': {
                    'completion_percentage': overall_progress,
                    'modules_completed': completed_modules,
                    'modules_in_progress': in_progress_modules,
                    'modules_available': total_modules,
                    'total_time_spent': sum(e.time_spent for e in enrollments),
                    'certification_points': sum(e.certification_points or 0 for e in enrollments)
                },
                'module_progress': [
                    {
                        'module_id': e.module.id,
                        'title': e.module.title,
                        'status': e.status,
                        'progress': e.progress_percentage,
                        'best_score': e.best_score,
                        'attempts': e.attempts,
                        'time_spent': e.time_spent
                    }
                    for e in enrollments
                ],
                'certifications': [
                    {
                        'certification_id': c.certification.id,
                        'name': c.certification.name,
                        'level': c.certification.level,
                        'earned_date': c.earned_date.isoformat(),
                        'expiry_date': c.expiry_date.isoformat() if c.expiry_date else None,
                        'final_score': c.final_score,
                        'status': c.status
                    }
                    for c in certifications
                ],
                'skill_assessments': [
                    {
                        'assessment_id': a.id,
                        'assessment_date': a.assessment_date.isoformat(),
                        'skill_category': a.skill_category,
                        'overall_score': a.overall_score,
                        'assessor_name': a.assessor.full_name if a.assessor else 'Unknown'
                    }
                    for a in assessments[:5]  # Last 5 assessments
                ]
            }
            
            return progress_data
            
        except Exception as e:
            logger.error(f"Error getting training progress for user {user_id}: {e}")
            raise
    
    # Training Path Management
    async def get_recommended_training_path(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get recommended training path for user"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            
            # Get user's current certification level
            current_cert = self._get_user_highest_certification(user_id)
            current_level = current_cert.certification.level if current_cert else None
            
            # Find appropriate training path
            if not current_level:
                # New user - recommend bronze path
                target_cert = 'bronze'
            elif current_level == 'bronze':
                target_cert = 'silver'
            elif current_level == 'silver':
                target_cert = 'gold'
            elif current_level == 'gold':
                target_cert = 'platinum'
            else:
                # Already platinum - recommend refresher or specialty
                target_cert = 'specialty'
            
            # Get training path
            training_path = self.db.query(TrainingPath).filter(
                TrainingPath.target_certification == target_cert,
                TrainingPath.is_active == True
            ).first()
            
            if not training_path:
                return None
            
            # Get modules in path
            path_modules = []
            for module_id in training_path.ordered_modules:
                module = self.db.query(TrainingModule).filter(TrainingModule.id == module_id).first()
                if module:
                    # Check enrollment status
                    enrollment = self.db.query(TrainingEnrollment).filter(
                        and_(
                            TrainingEnrollment.user_id == user_id,
                            TrainingEnrollment.module_id == module_id
                        )
                    ).first()
                    
                    path_modules.append({
                        'module_id': module.id,
                        'title': module.title,
                        'estimated_duration': module.estimated_duration,
                        'status': enrollment.status if enrollment else 'not_enrolled',
                        'progress': enrollment.progress_percentage if enrollment else 0
                    })
            
            return {
                'path_id': training_path.id,
                'name': training_path.name,
                'description': training_path.description,
                'target_certification': training_path.target_certification,
                'estimated_completion_time': training_path.estimated_completion_time,
                'modules': path_modules,
                'overall_progress': self._calculate_path_progress(user_id, training_path.ordered_modules)
            }
            
        except Exception as e:
            logger.error(f"Error getting recommended training path for user {user_id}: {e}")
            return None
    
    def _calculate_path_progress(self, user_id: int, module_ids: List[int]) -> float:
        """Calculate progress through training path"""
        if not module_ids:
            return 0.0
        
        completed_count = 0
        for module_id in module_ids:
            enrollment = self.db.query(TrainingEnrollment).filter(
                and_(
                    TrainingEnrollment.user_id == user_id,
                    TrainingEnrollment.module_id == module_id,
                    TrainingEnrollment.status == 'completed'
                )
            ).first()
            
            if enrollment:
                completed_count += 1
        
        return (completed_count / len(module_ids)) * 100

# Convenience function for API endpoints
async def get_training_service() -> TrainingService:
    """Get training service instance"""
    db = next(get_db())
    return TrainingService(db)