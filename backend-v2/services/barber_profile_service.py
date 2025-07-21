"""
Barber Profile Service - Comprehensive barber profile management

This service handles CRUD operations for barber profiles, image uploads,
and business logic for profile management following the Six Figure Barber methodology.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc
from fastapi import HTTPException, UploadFile
import logging
import os
import uuid
from PIL import Image
import boto3
from botocore.exceptions import ClientError

# Import models and schemas
import models
import schemas

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BarberProfileService:
    """Service for managing barber profiles"""
    
    def __init__(self):
        # Configuration for image uploads
        self.max_image_size = 5 * 1024 * 1024  # 5MB
        self.allowed_image_types = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
        self.image_dimensions = (800, 800)  # Max dimensions
        
    def get_profile_by_user_id(
        self, 
        db: Session, 
        user_id: int,
        include_user: bool = True
    ) -> Optional[models.BarberProfile]:
        """Get barber profile by user ID"""
        try:
            query = db.query(models.BarberProfile).filter(
                models.BarberProfile.user_id == user_id
            )
            
            if include_user:
                query = query.options(joinedload(models.BarberProfile.user))
            
            profile = query.first()
            
            if profile:
                logger.info(f"Retrieved profile for user ID: {user_id}")
            else:
                logger.info(f"No profile found for user ID: {user_id}")
                
            return profile
            
        except Exception as e:
            logger.error(f"Error retrieving profile for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to retrieve barber profile")
    
    def get_profile_by_id(
        self, 
        db: Session, 
        profile_id: int,
        include_user: bool = True
    ) -> Optional[models.BarberProfile]:
        """Get barber profile by profile ID"""
        try:
            query = db.query(models.BarberProfile).filter(
                models.BarberProfile.id == profile_id
            )
            
            if include_user:
                query = query.options(joinedload(models.BarberProfile.user))
            
            profile = query.first()
            
            if profile:
                logger.info(f"Retrieved profile with ID: {profile_id}")
            else:
                logger.info(f"No profile found with ID: {profile_id}")
                
            return profile
            
        except Exception as e:
            logger.error(f"Error retrieving profile {profile_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to retrieve barber profile")
    
    def create_profile(
        self, 
        db: Session, 
        user_id: int, 
        profile_data: schemas.BarberProfileCreate
    ) -> models.BarberProfile:
        """Create a new barber profile"""
        try:
            # Check if user exists and is a barber
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Check if user has barber role (flexible role checking)
            valid_roles = ["barber", "admin", "super_admin", "shop_owner", "individual_barber"]
            if user.role not in valid_roles:
                raise HTTPException(
                    status_code=403, 
                    detail=f"User must have barber role to create profile. Current role: {user.role}"
                )
            
            # Check if profile already exists
            existing_profile = db.query(models.BarberProfile).filter(
                models.BarberProfile.user_id == user_id
            ).first()
            
            if existing_profile:
                raise HTTPException(
                    status_code=400, 
                    detail="Barber profile already exists for this user"
                )
            
            # Create new profile
            profile_dict = profile_data.dict()
            
            # Clean up Instagram handle (remove @ if present)
            if profile_dict.get('instagram_handle'):
                profile_dict['instagram_handle'] = profile_dict['instagram_handle'].lstrip('@')
            
            # Create profile instance
            profile = models.BarberProfile(
                user_id=user_id,
                **profile_dict
            )
            
            db.add(profile)
            db.commit()
            db.refresh(profile)
            
            logger.info(f"Created new profile for user {user_id} (profile ID: {profile.id})")
            return profile
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating profile for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create barber profile")
    
    def update_profile(
        self, 
        db: Session, 
        user_id: int, 
        profile_data: schemas.BarberProfileUpdate,
        current_user: models.User
    ) -> models.BarberProfile:
        """Update an existing barber profile"""
        try:
            # Get existing profile
            profile = self.get_profile_by_user_id(db, user_id, include_user=False)
            if not profile:
                raise HTTPException(status_code=404, detail="Barber profile not found")
            
            # Authorization check
            self._check_profile_access(current_user, user_id, profile)
            
            # Update profile with provided data
            update_data = profile_data.dict(exclude_unset=True)
            
            # Clean up Instagram handle (remove @ if present)
            if 'instagram_handle' in update_data and update_data['instagram_handle']:
                update_data['instagram_handle'] = update_data['instagram_handle'].lstrip('@')
            
            # Update fields
            for field, value in update_data.items():
                setattr(profile, field, value)
            
            # Update timestamp
            profile.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
            db.commit()
            db.refresh(profile)
            
            logger.info(f"Updated profile for user {user_id}")
            return profile
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating profile for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update barber profile")
    
    def delete_profile(
        self, 
        db: Session, 
        user_id: int, 
        current_user: models.User
    ) -> bool:
        """Delete a barber profile (soft delete by setting is_active=False)"""
        try:
            profile = self.get_profile_by_user_id(db, user_id, include_user=False)
            if not profile:
                raise HTTPException(status_code=404, detail="Barber profile not found")
            
            # Authorization check
            self._check_profile_access(current_user, user_id, profile)
            
            # Soft delete by setting is_active=False
            profile.is_active = False
            profile.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
            db.commit()
            
            logger.info(f"Deleted profile for user {user_id}")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting profile for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete barber profile")
    
    def list_profiles(
        self, 
        db: Session,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
        search: Optional[str] = None,
        specialties: Optional[List[str]] = None,
        min_experience: Optional[int] = None,
        max_hourly_rate: Optional[float] = None,
        order_by: str = "created_at",
        order_desc: bool = True
    ) -> Tuple[List[models.BarberProfile], int]:
        """List barber profiles with filtering and pagination"""
        try:
            query = db.query(models.BarberProfile).options(
                joinedload(models.BarberProfile.user)
            )
            
            # Apply filters
            if active_only:
                query = query.filter(models.BarberProfile.is_active == True)
            
            if search:
                search_term = f"%{search}%"
                query = query.join(models.User).filter(
                    or_(
                        models.User.name.ilike(search_term),
                        models.BarberProfile.bio.ilike(search_term),
                        models.BarberProfile.specialties.ilike(search_term)
                    )
                )
            
            if specialties:
                # Filter by specialties (JSON array contains any of the specified specialties)
                for specialty in specialties:
                    query = query.filter(
                        models.BarberProfile.specialties.contains([specialty])
                    )
            
            if min_experience is not None:
                query = query.filter(
                    models.BarberProfile.years_experience >= min_experience
                )
            
            if max_hourly_rate is not None:
                query = query.filter(
                    models.BarberProfile.hourly_rate <= max_hourly_rate
                )
            
            # Count total before pagination
            total = query.count()
            
            # Apply ordering
            if order_by == "name":
                order_field = models.User.name
            elif order_by == "experience":
                order_field = models.BarberProfile.years_experience
            elif order_by == "hourly_rate":
                order_field = models.BarberProfile.hourly_rate
            elif order_by == "updated_at":
                order_field = models.BarberProfile.updated_at
            else:  # default to created_at
                order_field = models.BarberProfile.created_at
            
            if order_desc:
                query = query.order_by(desc(order_field))
            else:
                query = query.order_by(asc(order_field))
            
            # Apply pagination
            profiles = query.offset(skip).limit(limit).all()
            
            logger.info(f"Retrieved {len(profiles)} profiles (total: {total})")
            return profiles, total
            
        except Exception as e:
            logger.error(f"Error listing profiles: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to retrieve barber profiles")
    
    def upload_profile_image(
        self, 
        db: Session, 
        user_id: int, 
        image_file: UploadFile,
        current_user: models.User
    ) -> Dict[str, Any]:
        """Upload and process profile image"""
        try:
            profile = self.get_profile_by_user_id(db, user_id, include_user=False)
            if not profile:
                raise HTTPException(status_code=404, detail="Barber profile not found")
            
            # Authorization check
            self._check_profile_access(current_user, user_id, profile)
            
            # Validate image file
            self._validate_image_file(image_file)
            
            # Process and save image
            image_url = self._process_and_save_image(image_file, user_id)
            
            # Update profile with new image URL
            old_image_url = profile.profile_image_url
            profile.profile_image_url = image_url
            profile.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
            db.commit()
            
            # Clean up old image if exists
            if old_image_url:
                self._cleanup_old_image(old_image_url)
            
            logger.info(f"Uploaded new profile image for user {user_id}")
            
            return {
                "success": True,
                "message": "Profile image uploaded successfully",
                "image_url": image_url,
                "file_size": len(image_file.file.read()),
                "content_type": image_file.content_type
            }
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error uploading image for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to upload profile image")
    
    def _check_profile_access(
        self, 
        current_user: models.User, 
        target_user_id: int,
        profile: Optional[models.BarberProfile] = None
    ) -> None:
        """Check if current user can access/modify the target profile"""
        # Admin users can access any profile
        admin_roles = ["admin", "super_admin", "shop_owner", "enterprise_owner"]
        if current_user.role in admin_roles:
            return
        
        # Users can only access their own profile
        if current_user.id != target_user_id:
            raise HTTPException(
                status_code=403, 
                detail="You can only access your own profile"
            )
    
    def _validate_image_file(self, image_file: UploadFile) -> None:
        """Validate uploaded image file"""
        # Check content type
        if image_file.content_type not in self.allowed_image_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image type. Allowed types: {', '.join(self.allowed_image_types)}"
            )
        
        # Check file size
        image_file.file.seek(0, 2)  # Seek to end
        file_size = image_file.file.tell()
        image_file.file.seek(0)  # Reset to beginning
        
        if file_size > self.max_image_size:
            raise HTTPException(
                status_code=400,
                detail=f"Image file too large. Maximum size: {self.max_image_size // (1024*1024)}MB"
            )
        
        # Check if file is actually an image
        try:
            image_file.file.seek(0)
            with Image.open(image_file.file) as img:
                img.verify()
            image_file.file.seek(0)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid image file"
            )
    
    def _process_and_save_image(self, image_file: UploadFile, user_id: int) -> str:
        """Process image and save to storage"""
        try:
            # Generate unique filename
            file_extension = image_file.filename.split('.')[-1].lower()
            unique_filename = f"barber_profile_{user_id}_{uuid.uuid4().hex}.{file_extension}"
            
            # Process image
            image_file.file.seek(0)
            with Image.open(image_file.file) as img:
                # Convert to RGB if necessary (for JPEG)
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                
                # Resize image while maintaining aspect ratio
                img.thumbnail(self.image_dimensions, Image.Resampling.LANCZOS)
                
                # Save to local storage or cloud storage
                if self._use_cloud_storage():
                    return self._save_to_cloud(img, unique_filename)
                else:
                    return self._save_to_local(img, unique_filename)
                    
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to process image")
    
    def _use_cloud_storage(self) -> bool:
        """Check if cloud storage is configured"""
        return bool(os.getenv('AWS_S3_BUCKET'))
    
    def _save_to_cloud(self, img: Image.Image, filename: str) -> str:
        """Save image to AWS S3"""
        try:
            s3_client = boto3.client('s3')
            bucket_name = os.getenv('AWS_S3_BUCKET')
            
            # Save image to memory buffer
            from io import BytesIO
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=85, optimize=True)
            buffer.seek(0)
            
            # Upload to S3
            key = f"barber-profiles/{filename}"
            s3_client.upload_fileobj(
                buffer,
                bucket_name,
                key,
                ExtraArgs={
                    'ContentType': 'image/jpeg',
                    'ACL': 'public-read'
                }
            )
            
            # Return public URL
            return f"https://{bucket_name}.s3.amazonaws.com/{key}"
            
        except ClientError as e:
            logger.error(f"Error uploading to S3: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to upload image to cloud storage")
    
    def _save_to_local(self, img: Image.Image, filename: str) -> str:
        """Save image to local storage"""
        try:
            # Create uploads directory if it doesn't exist
            upload_dir = "uploads/barber-profiles"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Save image
            file_path = os.path.join(upload_dir, filename)
            img.save(file_path, format='JPEG', quality=85, optimize=True)
            
            # Return relative URL
            return f"/uploads/barber-profiles/{filename}"
            
        except Exception as e:
            logger.error(f"Error saving image locally: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save image")
    
    def _cleanup_old_image(self, image_url: str) -> None:
        """Clean up old image file"""
        try:
            if image_url.startswith('http'):
                # Cloud storage - extract key and delete from S3
                if 's3.amazonaws.com' in image_url:
                    key = image_url.split('amazonaws.com/')[-1]
                    s3_client = boto3.client('s3')
                    bucket_name = os.getenv('AWS_S3_BUCKET')
                    s3_client.delete_object(Bucket=bucket_name, Key=key)
            else:
                # Local storage - delete file
                if image_url.startswith('/uploads/'):
                    file_path = image_url[1:]  # Remove leading slash
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        
        except Exception as e:
            logger.warning(f"Failed to cleanup old image {image_url}: {str(e)}")
    
    def get_profile_stats(self, db: Session) -> Dict[str, int]:
        """Get statistics about barber profiles"""
        try:
            total_profiles = db.query(models.BarberProfile).count()
            active_profiles = db.query(models.BarberProfile).filter(
                models.BarberProfile.is_active == True
            ).count()
            inactive_profiles = total_profiles - active_profiles
            
            # Profiles with complete information
            complete_profiles = db.query(models.BarberProfile).filter(
                and_(
                    models.BarberProfile.is_active == True,
                    models.BarberProfile.bio.isnot(None),
                    models.BarberProfile.years_experience.isnot(None),
                    models.BarberProfile.specialties.isnot(None)
                )
            ).count()
            
            return {
                "total": total_profiles,
                "active": active_profiles,
                "inactive": inactive_profiles,
                "complete": complete_profiles
            }
            
        except Exception as e:
            logger.error(f"Error getting profile stats: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to retrieve profile statistics")


# Global service instance
barber_profile_service = BarberProfileService()