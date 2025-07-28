"""
File Processing Queue Worker for BookedBarber V2
Handles file uploads, image processing, and document management
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from celery import Celery
from datetime import datetime, timedelta
import logging
import hashlib
import tempfile
import shutil
from contextlib import contextmanager
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageOps
import magic
import requests

from db import SessionLocal
from config import settings
from models import User
from models.message_queue import MessageQueue, MessageStatus, MessageQueueType, MessagePriority
from services.sentry_monitoring import celery_monitor
from utils.file_security import scan_file_for_malware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import Sentry monitoring if available
try:
    SENTRY_MONITORING_AVAILABLE = True
except ImportError:
    SENTRY_MONITORING_AVAILABLE = False

# File processing configuration
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
ALLOWED_DOCUMENT_TYPES = {'application/pdf', 'text/plain', 'application/msword'}
THUMBNAIL_SIZES = [(150, 150), (300, 300), (600, 600)]
IMAGE_QUALITY = 85


@contextmanager
def get_db_session():
    """Context manager for database sessions"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def monitor_task(task_name: str):
    """Decorator for monitoring tasks with Sentry"""
    def decorator(func):
        if SENTRY_MONITORING_AVAILABLE:
            return celery_monitor.monitor_task_execution(task_name)(func)
        return func
    return decorator


# Import from main celery app
from celery_app import celery_app


@celery_app.task(bind=True, max_retries=2)
@monitor_task("process_image_upload")
def process_image_upload(self, file_path: str, user_id: int = None, metadata: Dict[str, Any] = None):
    """
    Process uploaded image file with validation and optimization
    """
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Validate file
        validation_result = _validate_uploaded_file(file_path)
        if not validation_result['valid']:
            return {
                "status": "error",
                "message": validation_result['reason'],
                "file_path": file_path
            }
        
        # Get file info
        file_info = _get_file_info(file_path)
        
        # Process the image
        processing_result = _process_image_file(file_path, file_info, metadata or {})
        
        # Store file metadata in database if user provided
        if user_id:
            with get_db_session() as db:
                _store_file_metadata(db, user_id, file_path, file_info, processing_result)
        
        logger.info(f"Image upload processed: {file_path}")
        return {
            "status": "completed",
            "file_path": file_path,
            "file_info": file_info,
            "processing_result": processing_result
        }
        
    except Exception as e:
        logger.error(f"Error processing image upload: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 120 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            # Move failed file to error directory
            _move_to_error_directory(file_path)
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("resize_and_optimize_image")
def resize_and_optimize_image(
    self, 
    file_path: str, 
    target_width: int = None, 
    target_height: int = None, 
    quality: int = IMAGE_QUALITY,
    output_format: str = None
):
    """
    Resize and optimize an existing image file
    """
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Validate it's an image
        mime_type = magic.from_file(file_path, mime=True)
        if mime_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError(f"Invalid image type: {mime_type}")
        
        # Process image
        optimization_result = _resize_and_optimize_image(
            file_path, target_width, target_height, quality, output_format
        )
        
        logger.info(f"Image resized and optimized: {file_path}")
        return {
            "status": "completed",
            "original_file": file_path,
            "optimization_result": optimization_result
        }
        
    except Exception as e:
        logger.error(f"Error resizing/optimizing image: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 120 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("generate_thumbnails")
def generate_thumbnails(self, file_path: str, sizes: List[Tuple[int, int]] = None):
    """
    Generate thumbnails for an image at different sizes
    """
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Use default sizes if none provided
        if not sizes:
            sizes = THUMBNAIL_SIZES
        
        # Validate it's an image
        mime_type = magic.from_file(file_path, mime=True)
        if mime_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError(f"Invalid image type: {mime_type}")
        
        # Generate thumbnails
        thumbnails = _generate_image_thumbnails(file_path, sizes)
        
        logger.info(f"Thumbnails generated for: {file_path}")
        return {
            "status": "completed",
            "original_file": file_path,
            "thumbnails": thumbnails
        }
        
    except Exception as e:
        logger.error(f"Error generating thumbnails: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 120 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("scan_for_malware")
def scan_for_malware(self, file_path: str, quarantine_on_detection: bool = True):
    """
    Scan uploaded file for malware and security threats
    """
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Perform malware scan
        scan_result = _perform_malware_scan(file_path)
        
        if scan_result['threat_detected']:
            logger.warning(f"Malware detected in file: {file_path}")
            
            if quarantine_on_detection:
                quarantine_result = _quarantine_file(file_path)
                scan_result['quarantined'] = quarantine_result
            
            # Alert administrators
            _alert_malware_detection(file_path, scan_result)
        
        logger.info(f"Malware scan completed: {file_path}")
        return {
            "status": "completed",
            "file_path": file_path,
            "scan_result": scan_result
        }
        
    except Exception as e:
        logger.error(f"Error scanning for malware: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 180 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=1)
@monitor_task("cleanup_temp_files")
def cleanup_temp_files(self, hours_old: int = 24):
    """
    Clean up temporary files older than specified hours
    """
    try:
        temp_directories = [
            tempfile.gettempdir(),
            '/tmp/file_uploads',
            '/tmp/image_processing',
            settings.temp_upload_directory if hasattr(settings, 'temp_upload_directory') else None
        ]
        
        cleaned_files = 0
        cleaned_size = 0
        
        for temp_dir in temp_directories:
            if not temp_dir or not os.path.exists(temp_dir):
                continue
            
            cutoff_time = datetime.now() - timedelta(hours=hours_old)
            
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    try:
                        # Check if file is old enough
                        file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                        
                        if file_mtime < cutoff_time:
                            file_size = os.path.getsize(file_path)
                            os.remove(file_path)
                            cleaned_files += 1
                            cleaned_size += file_size
                            
                    except (OSError, IOError) as e:
                        logger.warning(f"Could not clean up file {file_path}: {e}")
                        continue
        
        logger.info(f"Cleaned up {cleaned_files} temp files ({cleaned_size} bytes)")
        return {
            "status": "completed",
            "cleaned_files": cleaned_files,
            "cleaned_size_bytes": cleaned_size,
            "hours_old": hours_old
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up temp files: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 1800  # 30 minutes
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=2)
@monitor_task("process_document_upload")
def process_document_upload(self, file_path: str, user_id: int = None, metadata: Dict[str, Any] = None):
    """
    Process uploaded document file with validation and text extraction
    """
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Validate file
        validation_result = _validate_uploaded_document(file_path)
        if not validation_result['valid']:
            return {
                "status": "error",
                "message": validation_result['reason'],
                "file_path": file_path
            }
        
        # Get file info
        file_info = _get_file_info(file_path)
        
        # Extract text content if applicable
        text_content = _extract_document_text(file_path, file_info['mime_type'])
        
        # Process document metadata
        processing_result = {
            "text_extracted": text_content is not None,
            "text_length": len(text_content) if text_content else 0,
            "processed_at": datetime.utcnow().isoformat()
        }
        
        # Store document metadata in database if user provided
        if user_id:
            with get_db_session() as db:
                _store_document_metadata(db, user_id, file_path, file_info, processing_result, text_content)
        
        logger.info(f"Document upload processed: {file_path}")
        return {
            "status": "completed",
            "file_path": file_path,
            "file_info": file_info,
            "processing_result": processing_result
        }
        
    except Exception as e:
        logger.error(f"Error processing document upload: {e}")
        
        if self.request.retries < self.max_retries:
            countdown = 120 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            _move_to_error_directory(file_path)
            raise


# Helper functions
def _validate_uploaded_file(file_path: str) -> Dict[str, Any]:
    """Validate uploaded file for security and format"""
    
    try:
        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            return {
                "valid": False,
                "reason": f"File too large: {file_size} bytes (max: {MAX_FILE_SIZE})"
            }
        
        # Check MIME type
        mime_type = magic.from_file(file_path, mime=True)
        if mime_type not in ALLOWED_IMAGE_TYPES:
            return {
                "valid": False,
                "reason": f"Invalid file type: {mime_type}"
            }
        
        # Additional security checks
        if _has_suspicious_content(file_path):
            return {
                "valid": False,
                "reason": "File contains suspicious content"
            }
        
        return {"valid": True}
        
    except Exception as e:
        return {
            "valid": False,
            "reason": f"Validation error: {str(e)}"
        }


def _validate_uploaded_document(file_path: str) -> Dict[str, Any]:
    """Validate uploaded document file"""
    
    try:
        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            return {
                "valid": False,
                "reason": f"File too large: {file_size} bytes (max: {MAX_FILE_SIZE})"
            }
        
        # Check MIME type
        mime_type = magic.from_file(file_path, mime=True)
        if mime_type not in ALLOWED_DOCUMENT_TYPES:
            return {
                "valid": False,
                "reason": f"Invalid document type: {mime_type}"
            }
        
        return {"valid": True}
        
    except Exception as e:
        return {
            "valid": False,
            "reason": f"Validation error: {str(e)}"
        }


def _get_file_info(file_path: str) -> Dict[str, Any]:
    """Get comprehensive file information"""
    
    stat = os.stat(file_path)
    mime_type = magic.from_file(file_path, mime=True)
    
    # Calculate file hash
    with open(file_path, 'rb') as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    
    file_info = {
        "filename": os.path.basename(file_path),
        "size_bytes": stat.st_size,
        "mime_type": mime_type,
        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "file_hash": file_hash
    }
    
    # Add image-specific info
    if mime_type in ALLOWED_IMAGE_TYPES:
        try:
            with Image.open(file_path) as img:
                file_info.update({
                    "width": img.width,
                    "height": img.height,
                    "format": img.format,
                    "mode": img.mode
                })
        except Exception as e:
            logger.warning(f"Could not get image info for {file_path}: {e}")
    
    return file_info


def _process_image_file(file_path: str, file_info: Dict[str, Any], metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Process image file with optimization and validation"""
    
    result = {
        "optimized": False,
        "thumbnails_generated": False,
        "format_converted": False
    }
    
    try:
        with Image.open(file_path) as img:
            # Auto-rotate based on EXIF data
            img = ImageOps.exif_transpose(img)
            
            # Optimize image if it's large
            if file_info["size_bytes"] > 1024 * 1024:  # 1MB
                # Resize if too large
                max_dimension = 2048
                if img.width > max_dimension or img.height > max_dimension:
                    img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
                    result["optimized"] = True
                
                # Save optimized version
                if img.format in ['JPEG', 'PNG']:
                    img.save(file_path, format=img.format, quality=IMAGE_QUALITY, optimize=True)
                    result["optimized"] = True
            
            # Generate thumbnails
            thumbnails = _generate_image_thumbnails(file_path, THUMBNAIL_SIZES)
            result["thumbnails_generated"] = len(thumbnails) > 0
            result["thumbnails"] = thumbnails
            
    except Exception as e:
        logger.error(f"Error processing image {file_path}: {e}")
        result["error"] = str(e)
    
    return result


def _resize_and_optimize_image(
    file_path: str, 
    target_width: int = None, 
    target_height: int = None, 
    quality: int = IMAGE_QUALITY,
    output_format: str = None
) -> Dict[str, Any]:
    """Resize and optimize an image"""
    
    result = {}
    
    try:
        with Image.open(file_path) as img:
            original_size = img.size
            
            # Calculate new size
            if target_width and target_height:
                new_size = (target_width, target_height)
            elif target_width:
                ratio = target_width / img.width
                new_size = (target_width, int(img.height * ratio))
            elif target_height:
                ratio = target_height / img.height
                new_size = (int(img.width * ratio), target_height)
            else:
                new_size = original_size
            
            # Resize image
            if new_size != original_size:
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                result["resized"] = True
                result["new_size"] = new_size
            else:
                result["resized"] = False
            
            # Convert format if requested
            if output_format and output_format.upper() != img.format:
                # Handle format conversion
                if output_format.upper() == 'JPEG' and img.mode == 'RGBA':
                    # Convert RGBA to RGB for JPEG
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                
                result["format_converted"] = True
                result["new_format"] = output_format.upper()
            
            # Save optimized image
            save_kwargs = {"optimize": True}
            if img.format == 'JPEG' or (output_format and output_format.upper() == 'JPEG'):
                save_kwargs["quality"] = quality
            
            if output_format:
                # Create new filename with new format
                base_name = os.path.splitext(file_path)[0]
                new_file_path = f"{base_name}.{output_format.lower()}"
                img.save(new_file_path, format=output_format.upper(), **save_kwargs)
                result["output_file"] = new_file_path
            else:
                img.save(file_path, **save_kwargs)
                result["output_file"] = file_path
            
            result["optimized"] = True
            
    except Exception as e:
        logger.error(f"Error resizing/optimizing image {file_path}: {e}")
        result["error"] = str(e)
        result["optimized"] = False
    
    return result


def _generate_image_thumbnails(file_path: str, sizes: List[Tuple[int, int]]) -> List[Dict[str, Any]]:
    """Generate thumbnails at different sizes"""
    
    thumbnails = []
    
    try:
        with Image.open(file_path) as img:
            base_name = os.path.splitext(file_path)[0]
            
            for width, height in sizes:
                try:
                    # Create thumbnail
                    thumbnail = img.copy()
                    thumbnail.thumbnail((width, height), Image.Resampling.LANCZOS)
                    
                    # Save thumbnail
                    thumbnail_path = f"{base_name}_thumb_{width}x{height}.jpg"
                    thumbnail.save(thumbnail_path, "JPEG", quality=IMAGE_QUALITY, optimize=True)
                    
                    thumbnails.append({
                        "size": (width, height),
                        "file_path": thumbnail_path,
                        "actual_size": thumbnail.size
                    })
                    
                except Exception as e:
                    logger.error(f"Error creating thumbnail {width}x{height} for {file_path}: {e}")
                    continue
    
    except Exception as e:
        logger.error(f"Error generating thumbnails for {file_path}: {e}")
    
    return thumbnails


def _perform_malware_scan(file_path: str) -> Dict[str, Any]:
    """Perform malware scan on file"""
    
    result = {
        "threat_detected": False,
        "scan_engine": "basic",
        "threats": [],
        "scan_time": datetime.utcnow().isoformat()
    }
    
    try:
        # Basic security checks
        threats = []
        
        # Check file size (extremely large files could be suspicious)
        file_size = os.path.getsize(file_path)
        if file_size > 100 * 1024 * 1024:  # 100MB
            threats.append("Unusually large file size")
        
        # Check for suspicious file patterns
        if _has_suspicious_patterns(file_path):
            threats.append("Suspicious file patterns detected")
        
        # Check file header/magic bytes
        if _has_suspicious_headers(file_path):
            threats.append("Suspicious file headers")
        
        if threats:
            result["threat_detected"] = True
            result["threats"] = threats
        
        # If external malware scanner is available, use it
        if hasattr(settings, 'malware_scanner_api_key') and settings.malware_scanner_api_key:
            external_result = _scan_with_external_service(file_path)
            if external_result:
                result.update(external_result)
        
    except Exception as e:
        logger.error(f"Error during malware scan: {e}")
        result["error"] = str(e)
    
    return result


def _has_suspicious_content(file_path: str) -> bool:
    """Check for suspicious content in file"""
    
    try:
        # Read first 1KB of file to check for suspicious patterns
        with open(file_path, 'rb') as f:
            header = f.read(1024)
        
        # Check for executable patterns
        suspicious_patterns = [
            b'\x4d\x5a',  # PE executable
            b'\x7f\x45\x4c\x46',  # ELF executable
            b'<script',  # Script tags
            b'javascript:',  # JavaScript URLs
            b'eval(',  # Eval functions
        ]
        
        for pattern in suspicious_patterns:
            if pattern in header.lower():
                return True
        
        return False
        
    except Exception:
        return False


def _has_suspicious_patterns(file_path: str) -> bool:
    """Check for suspicious patterns in file content"""
    # Implementation would depend on specific security requirements
    return False


def _has_suspicious_headers(file_path: str) -> bool:
    """Check for suspicious file headers"""
    # Implementation would check file magic bytes against expected types
    return False


def _scan_with_external_service(file_path: str) -> Optional[Dict[str, Any]]:
    """Scan file with external malware detection service"""
    # Implementation would integrate with services like VirusTotal, ClamAV, etc.
    return None


def _quarantine_file(file_path: str) -> bool:
    """Move file to quarantine directory"""
    
    try:
        quarantine_dir = "/tmp/quarantine"
        os.makedirs(quarantine_dir, exist_ok=True)
        
        quarantine_path = os.path.join(quarantine_dir, os.path.basename(file_path))
        shutil.move(file_path, quarantine_path)
        
        logger.info(f"File quarantined: {file_path} -> {quarantine_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error quarantining file {file_path}: {e}")
        return False


def _alert_malware_detection(file_path: str, scan_result: Dict[str, Any]):
    """Alert administrators about malware detection"""
    logger.critical(f"MALWARE DETECTED: {file_path} - {scan_result}")
    # In production, this would send alerts to security team


def _extract_document_text(file_path: str, mime_type: str) -> Optional[str]:
    """Extract text content from document"""
    
    try:
        if mime_type == 'text/plain':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        elif mime_type == 'application/pdf':
            # Would use PyPDF2 or similar library
            return "PDF text extraction not implemented"
        else:
            return None
            
    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
        return None


def _store_file_metadata(db, user_id: int, file_path: str, file_info: Dict[str, Any], processing_result: Dict[str, Any]):
    """Store file metadata in database"""
    # Implementation would store file metadata in a files table
    logger.info(f"File metadata stored for user {user_id}: {file_path}")


def _store_document_metadata(db, user_id: int, file_path: str, file_info: Dict[str, Any], processing_result: Dict[str, Any], text_content: str):
    """Store document metadata in database"""
    # Implementation would store document metadata and text content
    logger.info(f"Document metadata stored for user {user_id}: {file_path}")


def _move_to_error_directory(file_path: str):
    """Move failed file to error directory"""
    
    try:
        error_dir = "/tmp/file_processing_errors"
        os.makedirs(error_dir, exist_ok=True)
        
        error_path = os.path.join(error_dir, os.path.basename(file_path))
        shutil.move(file_path, error_path)
        
        logger.info(f"File moved to error directory: {file_path} -> {error_path}")
        
    except Exception as e:
        logger.error(f"Error moving file to error directory: {e}")


# Health check task
@celery_app.task
def file_worker_health_check():
    """Health check for file worker"""
    
    # Check disk space
    disk_usage = shutil.disk_usage('/')
    free_space_gb = disk_usage.free / (1024**3)
    
    # Check temp directory
    temp_dir = tempfile.gettempdir()
    temp_exists = os.path.exists(temp_dir)
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "worker_type": "file_worker",
        "system_health": {
            "free_disk_space_gb": round(free_space_gb, 2),
            "temp_directory_exists": temp_exists,
            "temp_directory": temp_dir
        },
        "worker_id": os.getpid()
    }