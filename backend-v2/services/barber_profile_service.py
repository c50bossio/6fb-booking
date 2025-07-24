"""
Barber Profile Service

This service handles barber profile management, including profile creation,
updates, portfolio management, and specialties management for the V2 API.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from datetime import datetime
import re
import logging

from models import User, BarberPortfolioImage, BarberSpecialty
from schemas_new.barber_profile import (
    BarberProfileCreate,
    BarberProfileUpdate, 
    BarberProfileResponse,
    BarberPortfolioImageCreate,
    BarberPortfolioImageUpdate,
    BarberPortfolioImageResponse,
    BarberSpecialtyCreate,
    BarberSpecialtyUpdate,
    BarberSpecialtyResponse,
    ProfileCompletionStatus,
    SocialLinks
)
# PublicBarberProfile removed - BookedBarber V2 is NOT a marketplace

logger = logging.getLogger(__name__)


class BarberProfileService:
    """Service for managing barber profiles and related data."""

    def __init__(self, db: Session):
        self.db = db

    def get_barber_profile(self, barber_id: int, include_relationships: bool = True) -> Optional[User]:
        """Get a barber profile by ID."""
        query = self.db.query(User).filter(
            User.id == barber_id,
            User.role.in_(["barber", "admin", "super_admin"]),
            User.is_active == True
        )
        
        if include_relationships:
            query = query.options(
                joinedload(User.portfolio_images),
                joinedload(User.specialties_rel)
            )
        
        return query.first()

    def create_barber_profile(self, barber_id: int, profile_data: BarberProfileCreate) -> User:
        """Create or update a barber profile."""
        barber = self.get_barber_profile(barber_id, include_relationships=False)
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Barber not found"
            )

        # Update profile fields
        barber.bio = profile_data.bio
        barber.years_experience = profile_data.years_experience
        
        if profile_data.social_links:
            barber.social_links = profile_data.social_links.dict()

        # Profile slug removed - BookedBarber V2 is NOT a marketplace
        # Barber profiles are used within the context of specific barbershops only

        # Handle specialties
        if profile_data.specialties:
            self._update_specialties(barber_id, profile_data.specialties)

        # Update profile completion status
        barber.profile_completed = self._calculate_profile_completion(barber)

        try:
            self.db.commit()
            self.db.refresh(barber)
            logger.info(f"Created/updated profile for barber {barber_id}")
            return barber
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Error creating profile for barber {barber_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile creation failed. Slug may already be taken."
            )

    def update_barber_profile(self, barber_id: int, profile_data: BarberProfileUpdate) -> User:
        """Update an existing barber profile."""
        barber = self.get_barber_profile(barber_id, include_relationships=False)
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Barber not found"
            )

        # Update only provided fields
        if profile_data.bio is not None:
            barber.bio = profile_data.bio
        
        if profile_data.years_experience is not None:
            barber.years_experience = profile_data.years_experience
        
        if profile_data.social_links is not None:
            barber.social_links = profile_data.social_links.dict() if profile_data.social_links else None
        
        if profile_data.profile_image_url is not None:
            barber.profile_image_url = str(profile_data.profile_image_url)

        # Handle specialties update
        if profile_data.specialties is not None:
            self._update_specialties(barber_id, profile_data.specialties)

        # Update profile completion status
        barber.profile_completed = self._calculate_profile_completion(barber)

        try:
            self.db.commit()
            self.db.refresh(barber)
            logger.info(f"Updated profile for barber {barber_id}")
            return barber
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Error updating profile for barber {barber_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile update failed"
            )

    # get_public_barber_profile method removed - BookedBarber V2 is NOT a marketplace
    # Barber profiles are used within the context of specific barbershops only

    def get_profile_completion_status(self, barber_id: int) -> ProfileCompletionStatus:
        """Get profile completion status for a barber."""
        barber = self.get_barber_profile(barber_id, include_relationships=True)
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Barber not found"
            )

        missing_fields = []
        suggestions = []
        
        # Check required/recommended fields
        if not barber.bio:
            missing_fields.append("bio")
            suggestions.append("Add a professional bio to showcase your experience")
        
        if not barber.profile_image_url:
            missing_fields.append("profile_image")
            suggestions.append("Upload a professional profile photo")
        
        if not barber.years_experience:
            missing_fields.append("years_experience")
            suggestions.append("Add your years of experience")
        
        if not barber.specialties_rel:
            missing_fields.append("specialties")
            suggestions.append("Add your specialties and skills")
        
        if not barber.portfolio_images:
            missing_fields.append("portfolio_images")
            suggestions.append("Upload photos of your work to showcase your skills")

        # Calculate completion percentage
        total_fields = 5  # bio, profile_image, years_experience, specialties, portfolio
        completed_fields = total_fields - len(missing_fields)
        completion_percentage = int((completed_fields / total_fields) * 100)

        # Profile is public-ready if at least 80% complete
        is_public_ready = completion_percentage >= 80 and barber.bio and barber.profile_image_url

        return ProfileCompletionStatus(
            completion_percentage=completion_percentage,
            missing_fields=missing_fields,
            suggestions=suggestions,
            is_public_ready=is_public_ready
        )

    # Portfolio Image Management
    def add_portfolio_image(self, barber_id: int, image_data: BarberPortfolioImageCreate) -> BarberPortfolioImage:
        """Add a new portfolio image for a barber."""
        barber = self.get_barber_profile(barber_id, include_relationships=False)
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Barber not found"
            )

        portfolio_image = BarberPortfolioImage(
            barber_id=barber_id,
            image_url=str(image_data.image_url),
            title=image_data.title,
            description=image_data.description,
            display_order=image_data.display_order,
            is_featured=image_data.is_featured,
            created_at=datetime.utcnow()
        )

        self.db.add(portfolio_image)
        
        try:
            self.db.commit()
            self.db.refresh(portfolio_image)
            logger.info(f"Added portfolio image for barber {barber_id}")
            return portfolio_image
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Error adding portfolio image for barber {barber_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to add portfolio image"
            )

    def update_portfolio_image(self, barber_id: int, image_id: int, image_data: BarberPortfolioImageUpdate) -> BarberPortfolioImage:
        """Update a portfolio image."""
        image = self.db.query(BarberPortfolioImage).filter(
            BarberPortfolioImage.id == image_id,
            BarberPortfolioImage.barber_id == barber_id
        ).first()

        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio image not found"
            )

        # Update only provided fields
        if image_data.title is not None:
            image.title = image_data.title
        
        if image_data.description is not None:
            image.description = image_data.description
        
        if image_data.is_featured is not None:
            image.is_featured = image_data.is_featured
        
        if image_data.display_order is not None:
            image.display_order = image_data.display_order

        image.updated_at = datetime.utcnow()

        try:
            self.db.commit()
            self.db.refresh(image)
            logger.info(f"Updated portfolio image {image_id} for barber {barber_id}")
            return image
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Error updating portfolio image {image_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update portfolio image"
            )

    def delete_portfolio_image(self, barber_id: int, image_id: int) -> bool:
        """Delete a portfolio image."""
        image = self.db.query(BarberPortfolioImage).filter(
            BarberPortfolioImage.id == image_id,
            BarberPortfolioImage.barber_id == barber_id
        ).first()

        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio image not found"
            )

        self.db.delete(image)
        self.db.commit()
        logger.info(f"Deleted portfolio image {image_id} for barber {barber_id}")
        return True

    def get_portfolio_images(self, barber_id: int) -> List[BarberPortfolioImage]:
        """Get all portfolio images for a barber."""
        return self.db.query(BarberPortfolioImage).filter(
            BarberPortfolioImage.barber_id == barber_id
        ).order_by(BarberPortfolioImage.display_order, BarberPortfolioImage.created_at).all()

    # Specialty Management
    def add_specialty(self, barber_id: int, specialty_data: BarberSpecialtyCreate) -> BarberSpecialty:
        """Add a new specialty for a barber."""
        barber = self.get_barber_profile(barber_id, include_relationships=False)
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Barber not found"
            )

        specialty = BarberSpecialty(
            barber_id=barber_id,
            specialty_name=specialty_data.specialty_name,
            category=specialty_data.category,
            experience_level=specialty_data.experience_level,
            is_primary=specialty_data.is_primary,
            created_at=datetime.utcnow()
        )

        self.db.add(specialty)
        
        try:
            self.db.commit()
            self.db.refresh(specialty)
            logger.info(f"Added specialty {specialty_data.specialty_name} for barber {barber_id}")
            return specialty
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Error adding specialty for barber {barber_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to add specialty"
            )

    def get_specialties(self, barber_id: int) -> List[BarberSpecialty]:
        """Get all specialties for a barber."""
        return self.db.query(BarberSpecialty).filter(
            BarberSpecialty.barber_id == barber_id
        ).order_by(BarberSpecialty.is_primary.desc(), BarberSpecialty.specialty_name).all()

    def delete_specialty(self, barber_id: int, specialty_id: int) -> bool:
        """Delete a specialty."""
        specialty = self.db.query(BarberSpecialty).filter(
            BarberSpecialty.id == specialty_id,
            BarberSpecialty.barber_id == barber_id
        ).first()

        if not specialty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialty not found"
            )

        self.db.delete(specialty)
        self.db.commit()
        logger.info(f"Deleted specialty {specialty_id} for barber {barber_id}")
        return True

    # Private helper methods
    # _generate_profile_slug method removed - BookedBarber V2 is NOT a marketplace
    # Profile slugs were used for public discovery, which is not needed in individual barbershop model

    def _update_specialties(self, barber_id: int, specialty_names: List[str]) -> None:
        """Update barber specialties by replacing all with new list."""
        # Delete existing specialties
        self.db.query(BarberSpecialty).filter(
            BarberSpecialty.barber_id == barber_id
        ).delete()

        # Add new specialties
        for i, specialty_name in enumerate(specialty_names):
            specialty = BarberSpecialty(
                barber_id=barber_id,
                specialty_name=specialty_name,
                is_primary=(i == 0),  # First specialty is primary
                created_at=datetime.utcnow()
            )
            self.db.add(specialty)

    def _calculate_profile_completion(self, barber: User) -> bool:
        """Calculate if profile is completed based on required fields."""
        required_fields = [
            barber.bio,
            barber.profile_image_url,
            barber.years_experience is not None,
        ]
        
        # Check if barber has at least one specialty and one portfolio image
        has_specialties = bool(self.db.query(BarberSpecialty).filter(
            BarberSpecialty.barber_id == barber.id
        ).first())
        
        has_portfolio = bool(self.db.query(BarberPortfolioImage).filter(
            BarberPortfolioImage.barber_id == barber.id
        ).first())
        
        # Profile is completed if at least 80% of requirements are met
        completion_score = sum([
            bool(barber.bio),
            bool(barber.profile_image_url), 
            barber.years_experience is not None,
            has_specialties,
            has_portfolio
        ])
        
        return completion_score >= 4  # 4 out of 5 requirements

    def get_active_profiles(self) -> List[User]:
        """Get all active barber profiles."""
        return self.db.query(User).filter(
            User.role.in_(["barber", "admin", "super_admin"]),
            User.is_active == True
        ).all()