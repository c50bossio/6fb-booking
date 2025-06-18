"""
Training and Certification Models
Tracks 6FB training progress, certifications, and skill development
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base

class TrainingModule(Base):
    __tablename__ = "training_modules"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Module Information
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100), nullable=False)  # basic, intermediate, advanced, specialty
    difficulty_level = Column(String(50), nullable=False)  # beginner, intermediate, advanced, expert
    
    # Content
    content_type = Column(String(50), nullable=False)  # video, document, interactive, exam
    content_url = Column(String(500))
    estimated_duration = Column(Integer, default=60)  # Minutes
    
    # Requirements
    prerequisites = Column(JSON)  # List of required module IDs
    required_for_certification = Column(String(100))  # bronze, silver, gold, platinum
    
    # Scoring
    passing_score = Column(Float, default=80.0)
    max_attempts = Column(Integer, default=3)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_mandatory = Column(Boolean, default=False)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    version = Column(String(20), default="1.0")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    enrollments = relationship("TrainingEnrollment", back_populates="module")
    creator = relationship("User", foreign_keys=[created_by])

class TrainingEnrollment(Base):
    __tablename__ = "training_enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Links
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("training_modules.id"), nullable=False)
    
    # Progress
    status = Column(String(50), default="enrolled")  # enrolled, in_progress, completed, failed
    progress_percentage = Column(Float, default=0.0)
    
    # Attempts and Scoring
    attempts = Column(Integer, default=0)
    best_score = Column(Float, default=0.0)
    latest_score = Column(Float, default=0.0)
    
    # Timing
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    time_spent = Column(Integer, default=0)  # Minutes
    
    # Certification
    contributes_to_certification = Column(String(100))
    certification_points = Column(Float, default=0.0)
    
    # Notes
    instructor_notes = Column(Text)
    student_feedback = Column(Text)
    
    # Relationships
    user = relationship("User")
    module = relationship("TrainingModule", back_populates="enrollments")
    attempts_log = relationship("TrainingAttempt", back_populates="enrollment")

class TrainingAttempt(Base):
    __tablename__ = "training_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Links
    enrollment_id = Column(Integer, ForeignKey("training_enrollments.id"), nullable=False)
    
    # Attempt Details
    attempt_number = Column(Integer, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Results
    score = Column(Float, default=0.0)
    passed = Column(Boolean, default=False)
    time_taken = Column(Integer, default=0)  # Minutes
    
    # Detailed Results
    answers = Column(JSON)  # Detailed answers for review
    feedback = Column(Text)
    areas_for_improvement = Column(JSON)  # List of topics to review
    
    # Relationships
    enrollment = relationship("TrainingEnrollment", back_populates="attempts_log")

class Certification(Base):
    __tablename__ = "certifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Certification Info
    name = Column(String(255), nullable=False)  # "6FB Bronze", "6FB Silver", etc.
    level = Column(String(50), nullable=False)  # bronze, silver, gold, platinum
    description = Column(Text)
    
    # Requirements
    required_modules = Column(JSON)  # List of required module IDs
    required_score_average = Column(Float, default=80.0)
    required_experience_months = Column(Integer, default=0)
    prerequisite_certifications = Column(JSON)  # List of required cert IDs
    
    # Validity
    validity_period = Column(Integer, default=24)  # Months before renewal required
    requires_renewal = Column(Boolean, default=True)
    
    # Benefits
    commission_bonus = Column(Float, default=0.0)  # Additional commission %
    mentor_eligibility = Column(Boolean, default=False)
    special_privileges = Column(JSON)  # List of special access/privileges
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user_certifications = relationship("UserCertification", back_populates="certification")

class UserCertification(Base):
    __tablename__ = "user_certifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Links
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    certification_id = Column(Integer, ForeignKey("certifications.id"), nullable=False)
    
    # Certification Details
    earned_date = Column(DateTime(timezone=True), nullable=False)
    expiry_date = Column(DateTime(timezone=True))
    
    # Achievement Details
    final_score = Column(Float, nullable=False)
    modules_completed = Column(JSON)  # List of module completion details
    mentor_id = Column(Integer, ForeignKey("users.id"))  # Certifying mentor
    
    # Status
    status = Column(String(50), default="active")  # active, expired, revoked, suspended
    
    # Renewal
    renewal_date = Column(DateTime(timezone=True))
    renewal_score = Column(Float)
    renewal_notes = Column(Text)
    
    # Recognition
    certificate_url = Column(String(500))  # URL to certificate document
    badge_earned = Column(Boolean, default=True)
    public_recognition = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    certification = relationship("Certification", back_populates="user_certifications")
    certifying_mentor = relationship("User", foreign_keys=[mentor_id])

class SkillAssessment(Base):
    __tablename__ = "skill_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Assessment Info
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assessor_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Mentor/admin
    
    # Assessment Details
    assessment_type = Column(String(100), nullable=False)  # practical, theoretical, observation
    skill_category = Column(String(100), nullable=False)  # cutting, customer_service, business, etc.
    
    # Scores (0-100)
    technical_skill = Column(Float, default=0.0)
    customer_interaction = Column(Float, default=0.0)
    business_acumen = Column(Float, default=0.0)
    sixfb_methodology = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)
    
    # Feedback
    strengths = Column(Text)
    areas_for_improvement = Column(Text)
    recommendations = Column(Text)
    follow_up_required = Column(Boolean, default=False)
    
    # Context
    assessment_date = Column(DateTime(timezone=True), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"))
    
    # Goals
    improvement_goals = Column(JSON)  # List of goals set during assessment
    next_assessment_date = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    assessor = relationship("User", foreign_keys=[assessor_id])
    location = relationship("Location")

class TrainingPath(Base):
    __tablename__ = "training_paths"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Path Info
    name = Column(String(255), nullable=False)
    description = Column(Text)
    target_certification = Column(String(100))  # Target certification level
    
    # Structure
    ordered_modules = Column(JSON, nullable=False)  # Ordered list of module IDs
    estimated_completion_time = Column(Integer, default=0)  # Hours
    
    # Requirements
    entry_requirements = Column(JSON)  # Prerequisites to start this path
    target_audience = Column(String(255))  # new_barbers, experienced, mentors, etc.
    
    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    path_enrollments = relationship("TrainingPathEnrollment", back_populates="path")

class TrainingPathEnrollment(Base):
    __tablename__ = "training_path_enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Links
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    path_id = Column(Integer, ForeignKey("training_paths.id"), nullable=False)
    
    # Progress
    current_module_index = Column(Integer, default=0)
    completed_modules = Column(JSON, default=list)  # List of completed module IDs
    overall_progress = Column(Float, default=0.0)
    
    # Timing
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    target_completion_date = Column(DateTime(timezone=True))
    actual_completion_date = Column(DateTime(timezone=True))
    
    # Status
    status = Column(String(50), default="active")  # active, completed, paused, dropped
    
    # Relationships
    user = relationship("User")
    path = relationship("TrainingPath", back_populates="path_enrollments")