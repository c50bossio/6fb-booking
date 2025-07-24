"""
Barber Profile Schemas for V2 API

This module contains Pydantic schemas for barber profile management,
portfolio images, and specialties in the BookedBarber V2 system.
"""

from pydantic import BaseModel, Field, HttpUrl, validator
from typing import List, Optional, Union
from datetime import datetime
from enum import Enum


class SpecialtyCategory(str, Enum):
    """Enum for barber specialty categories."""
    CUTS = "cuts"
    STYLING = "styling"
    COLORING = "coloring"
    BEARD = "beard"
    SPECIALTY_CUTS = "specialty_cuts"
    TREATMENTS = "treatments"
    OTHER = "other"


class ExperienceLevel(str, Enum):
    """Enum for experience levels."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


# Portfolio Image Schemas
class BarberPortfolioImageBase(BaseModel):
    """Base schema for portfolio images."""
    title: Optional[str] = Field(None, max_length=100, description="Title of the portfolio image")
    description: Optional[str] = Field(None, description="Description of the work shown")
    is_featured: bool = Field(default=False, description="Whether this image is featured in the portfolio")


class BarberPortfolioImageCreate(BarberPortfolioImageBase):
    """Schema for creating a new portfolio image."""
    image_url: HttpUrl = Field(..., description="URL of the uploaded image")
    display_order: int = Field(default=0, ge=0, description="Display order in the portfolio")


class BarberPortfolioImageUpdate(BaseModel):
    """Schema for updating a portfolio image."""
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = Field(None, ge=0)


class BarberPortfolioImageResponse(BarberPortfolioImageBase):
    """Schema for portfolio image response."""
    id: int
    barber_id: int
    image_url: str
    display_order: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Specialty Schemas
class BarberSpecialtyBase(BaseModel):
    """Base schema for barber specialties."""
    specialty_name: str = Field(..., max_length=100, description="Name of the specialty")
    category: Optional[SpecialtyCategory] = Field(None, description="Category of the specialty")
    experience_level: Optional[ExperienceLevel] = Field(None, description="Experience level with this specialty")
    is_primary: bool = Field(default=False, description="Whether this is a primary specialty")


class BarberSpecialtyCreate(BarberSpecialtyBase):
    """Schema for creating a new specialty."""
    pass


class BarberSpecialtyUpdate(BaseModel):
    """Schema for updating a specialty."""
    specialty_name: Optional[str] = Field(None, max_length=100)
    category: Optional[SpecialtyCategory] = None
    experience_level: Optional[ExperienceLevel] = None
    is_primary: Optional[bool] = None


class BarberSpecialtyResponse(BarberSpecialtyBase):
    """Schema for specialty response."""
    id: int
    barber_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Social Links Schema
class SocialLinks(BaseModel):
    """Schema for social media links."""
    instagram: Optional[HttpUrl] = None
    facebook: Optional[HttpUrl] = None
    tiktok: Optional[HttpUrl] = None
    twitter: Optional[HttpUrl] = None
    website: Optional[HttpUrl] = None


# Main Barber Profile Schemas
class BarberProfileBase(BaseModel):
    """Base schema for barber profiles."""
    bio: Optional[str] = Field(None, max_length=1000, description="Professional bio/description")
    years_experience: Optional[int] = Field(None, ge=0, le=50, description="Years of professional experience")
    social_links: Optional[SocialLinks] = Field(None, description="Social media links")


class BarberProfileCreate(BarberProfileBase):
    """Schema for creating a barber profile."""
    specialties: Optional[List[str]] = Field(default=[], description="List of specialty names")


class BarberProfileUpdate(BaseModel):
    """Schema for updating a barber profile."""
    bio: Optional[str] = Field(None, max_length=1000)
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    social_links: Optional[SocialLinks] = None
    specialties: Optional[List[str]] = Field(None, description="List of specialty names to replace current ones")
    profile_image_url: Optional[HttpUrl] = None


class BarberProfileResponse(BarberProfileBase):
    """Schema for barber profile response."""
    id: int
    name: str
    email: str
    profile_image_url: Optional[str] = None
    # profile_slug removed - BookedBarber V2 is NOT a marketplace
    profile_completed: bool
    specialties: List[BarberSpecialtyResponse] = Field(default=[], description="List of barber specialties")
    portfolio_images: List[BarberPortfolioImageResponse] = Field(default=[], description="Portfolio images")
    created_at: datetime

    class Config:
        from_attributes = True

    @validator('specialties', pre=True, always=True)
    def set_specialties(cls, v):
        """Handle specialties relationship."""
        if v is None:
            return []
        return v

    @validator('portfolio_images', pre=True, always=True)
    def set_portfolio_images(cls, v):
        """Handle portfolio images relationship."""
        if v is None:
            return []
        return v


# Note: Public barber discovery schemas removed - BookedBarber V2 is NOT a marketplace
# Barber profiles are used within the context of specific barbershops only


# Profile Completion Schema
class ProfileCompletionStatus(BaseModel):
    """Schema for profile completion status."""
    completion_percentage: int = Field(..., ge=0, le=100, description="Profile completion percentage")
    missing_fields: List[str] = Field(default=[], description="List of missing required fields")
    suggestions: List[str] = Field(default=[], description="Suggestions for improving the profile")
    is_public_ready: bool = Field(..., description="Whether profile is ready for public display")

    class Config:
        from_attributes = True


# File Upload Schema
class ImageUploadResponse(BaseModel):
    """Schema for image upload response."""
    image_url: HttpUrl = Field(..., description="URL of the uploaded image")
    image_id: Optional[str] = Field(None, description="Unique identifier for the image")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    mime_type: Optional[str] = Field(None, description="MIME type of the uploaded file")

    class Config:
        from_attributes = True