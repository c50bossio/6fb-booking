"""
Privacy Data Export Service for GDPR Compliance.

Implements background task processing for user data export requests
as required by GDPR Article 20 (Right to data portability).
"""

import logging
import asyncio
import json
import zipfile
import io
import tempfile
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
# import aiofiles  # Not needed for this implementation
import boto3
from botocore.exceptions import ClientError

from models.consent import DataExportRequest, ExportStatus, DataProcessingLog, DataProcessingPurpose
from models import User, Client, Appointment, Payment
# Service and Review models might need to be imported differently
try:
    from models import Service, Review
except ImportError:
    # Fallback if these models are in different modules
    Service = None
    Review = None
from services.export_service import export_service
from services.notification_service import notification_service
from config import settings

logger = logging.getLogger(__name__)


class PrivacyDataExportService:
    """
    Service for processing GDPR data export requests as background tasks.
    
    Features:
    - Asynchronous processing of export requests
    - Comprehensive data collection from all user tables
    - Secure file generation and storage
    - Automatic cleanup of expired downloads
    - Email notifications to users
    - Full audit trail for compliance
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.export_retention_hours = 48  # How long export files are available
        self.max_export_size_mb = 100  # Maximum export file size
        
        # Initialize AWS S3 client for secure file storage (if configured)
        self.s3_client = None
        if hasattr(settings, 'AWS_ACCESS_KEY_ID') and settings.AWS_ACCESS_KEY_ID:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=getattr(settings, 'AWS_REGION', 'us-east-1')
            )
            self.s3_bucket = getattr(settings, 'GDPR_EXPORTS_BUCKET', 'bookedbarber-gdpr-exports')
    
    async def process_export_request(self, request_id: str) -> bool:
        """
        Process a data export request in the background.
        
        Args:
            request_id: Unique request identifier
            
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"Starting processing of export request: {request_id}")
        
        try:
            # Get the export request
            export_request = self.db.query(DataExportRequest).filter(
                DataExportRequest.request_id == request_id
            ).first()
            
            if not export_request:
                logger.error(f"Export request not found: {request_id}")
                return False
            
            if export_request.status != ExportStatus.PENDING:
                logger.warning(f"Export request {request_id} is not pending (status: {export_request.status})")
                return False
            
            # Mark as processing
            export_request.mark_processing()
            self.db.commit()
            
            # Log data processing activity
            self._log_data_processing(
                export_request.user_id,
                "data_export_started",
                ["all_user_data"]
            )
            
            # Collect all user data
            user_data = await self._collect_user_data(export_request.user_id)
            
            # Generate export file
            file_path, file_size = await self._generate_export_file(
                user_data, 
                export_request.format,
                request_id
            )
            
            # Store file securely
            secure_url = await self._store_export_file(file_path, request_id)
            
            # Mark as completed
            export_request.mark_completed(
                secure_url, 
                file_size, 
                expiry_hours=self.export_retention_hours
            )
            
            # Update data categories that were exported
            export_request.data_categories = list(user_data.keys())
            self.db.commit()
            
            # Send notification email to user
            await self._notify_user_export_ready(export_request)
            
            # Log completion
            self._log_data_processing(
                export_request.user_id,
                "data_export_completed",
                list(user_data.keys())
            )
            
            # Clean up local file
            if os.path.exists(file_path):
                os.remove(file_path)
            
            logger.info(f"Successfully processed export request: {request_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to process export request {request_id}: {str(e)}")
            
            # Mark as failed
            if 'export_request' in locals():
                export_request.mark_failed(str(e))
                self.db.commit()
                
                # Notify user of failure
                await self._notify_user_export_failed(export_request, str(e))
            
            return False
    
    async def _collect_user_data(self, user_id: int) -> Dict[str, Any]:
        """
        Collect all personal data for a user from all relevant tables.
        
        Args:
            user_id: ID of the user requesting data export
            
        Returns:
            Dictionary containing all user data organized by category
        """
        logger.info(f"Collecting user data for user_id: {user_id}")
        
        user_data = {}
        
        try:
            # User profile data
            user = self.db.query(User).filter(User.id == user_id).first()
            if user:
                user_data['profile'] = {
                    'id': user.id,
                    'name': user.name,
                    'email': str(user.email) if user.email else None,
                    'phone': str(user.phone) if user.phone else None,
                    'role': user.role,
                    'timezone': user.timezone,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'updated_at': user.updated_at.isoformat() if user.updated_at else None,
                    'last_login': user.last_login.isoformat() if user.last_login else None,
                    'is_active': user.is_active,
                    'business_info': {
                        'business_name': user.business_name,
                        'business_address': user.business_address,
                        'business_phone': str(user.business_phone) if user.business_phone else None,
                        'business_email': str(user.business_email) if user.business_email else None,
                    }
                }
            
            # Client data (if user is also a client)
            client = self.db.query(Client).filter(Client.user_id == user_id).first()
            if client:
                user_data['client_profile'] = {
                    'id': client.id,
                    'first_name': client.first_name,
                    'last_name': client.last_name,
                    'email': str(client.email) if client.email else None,
                    'phone': str(client.phone) if client.phone else None,
                    'customer_type': client.customer_type,
                    'total_visits': client.total_visits,
                    'total_spent': float(client.total_spent) if client.total_spent else 0.0,
                    'average_ticket': float(client.average_ticket) if client.average_ticket else 0.0,
                    'visit_frequency_days': client.visit_frequency_days,
                    'no_show_count': client.no_show_count,
                    'cancellation_count': client.cancellation_count,
                    'referral_count': client.referral_count,
                    'first_visit_date': client.first_visit_date.isoformat() if client.first_visit_date else None,
                    'last_visit_date': client.last_visit_date.isoformat() if client.last_visit_date else None,
                    'tags': client.tags,
                    'notes': client.notes,
                    'preferred_barber_id': client.preferred_barber_id,
                    'created_at': client.created_at.isoformat() if client.created_at else None,
                    'updated_at': client.updated_at.isoformat() if client.updated_at else None
                }
            
            # Appointments data
            appointments = self.db.query(Appointment).filter(
                or_(Appointment.user_id == user_id, Appointment.client_id == client.id if client else False)
            ).all()
            
            user_data['appointments'] = []
            for appointment in appointments:
                user_data['appointments'].append({
                    'id': appointment.id,
                    'service_name': appointment.service_name,
                    'start_time': appointment.start_time.isoformat(),
                    'duration_minutes': appointment.duration_minutes,
                    'price': float(appointment.price) if appointment.price else 0.0,
                    'status': appointment.status,
                    'notes': appointment.notes,
                    'barber_id': appointment.barber_id,
                    'buffer_time_before': appointment.buffer_time_before,
                    'buffer_time_after': appointment.buffer_time_after,
                    'google_event_id': appointment.google_event_id,
                    'created_at': appointment.created_at.isoformat(),
                    'updated_at': appointment.updated_at.isoformat() if appointment.updated_at else None
                })
            
            # Payment data
            payments = self.db.query(Payment).filter(Payment.user_id == user_id).all()
            user_data['payments'] = []
            for payment in payments:
                user_data['payments'].append({
                    'id': payment.id,
                    'amount': float(payment.amount),
                    'currency': payment.currency,
                    'status': payment.status,
                    'stripe_payment_intent_id': payment.stripe_payment_intent_id,
                    'description': payment.description,
                    'payment_method': payment.payment_method,
                    'created_at': payment.created_at.isoformat(),
                    'updated_at': payment.updated_at.isoformat() if payment.updated_at else None
                })
            
            # Reviews data
            reviews = self.db.query(Review).filter(
                or_(Review.user_id == user_id, Review.client_id == client.id if client else False)
            ).all()
            
            user_data['reviews'] = []
            for review in reviews:
                user_data['reviews'].append({
                    'id': review.id,
                    'rating': review.rating,
                    'review_text': review.review_text,
                    'platform': review.platform,
                    'platform_review_id': review.platform_review_id,
                    'response_text': review.response_text,
                    'response_posted': review.response_posted,
                    'created_at': review.created_at.isoformat(),
                    'updated_at': review.updated_at.isoformat() if review.updated_at else None
                })
            
            # Consent and privacy data
            user_data['consent_history'] = []
            for consent in user.consents:
                user_data['consent_history'].append({
                    'consent_type': consent.consent_type.value,
                    'status': consent.status.value,
                    'consent_date': consent.consent_date.isoformat(),
                    'withdrawal_date': consent.withdrawal_date.isoformat() if consent.withdrawal_date else None,
                    'version': consent.version,
                    'created_at': consent.created_at.isoformat()
                })
            
            # Cookie consent data
            user_data['cookie_consents'] = []
            for cookie_consent in user.cookie_consents:
                user_data['cookie_consents'].append({
                    'session_id': cookie_consent.session_id,
                    'functional': cookie_consent.functional,
                    'analytics': cookie_consent.analytics,
                    'marketing': cookie_consent.marketing,
                    'preferences': cookie_consent.preferences,
                    'consent_date': cookie_consent.consent_date.isoformat(),
                    'expiry_date': cookie_consent.expiry_date.isoformat(),
                    'created_at': cookie_consent.created_at.isoformat()
                })
            
            # Data processing logs
            processing_logs = self.db.query(DataProcessingLog).filter(
                DataProcessingLog.user_id == user_id
            ).order_by(DataProcessingLog.created_at.desc()).limit(100).all()
            
            user_data['data_processing_history'] = []
            for log in processing_logs:
                user_data['data_processing_history'].append({
                    'purpose': log.purpose.value,
                    'operation': log.operation,
                    'data_categories': log.data_categories,
                    'legal_basis': log.legal_basis,
                    'third_party_involved': log.third_party_involved,
                    'third_party_details': log.third_party_details,
                    'processing_date': log.processing_date.isoformat(),
                    'created_at': log.created_at.isoformat()
                })
            
            # Add export metadata
            user_data['export_metadata'] = {
                'export_date': datetime.utcnow().isoformat(),
                'format_version': '1.0',
                'total_categories': len([k for k in user_data.keys() if k != 'export_metadata']),
                'data_controller': 'BookedBarber',
                'legal_basis': 'GDPR Article 20 - Right to data portability',
                'retention_policy': 'Data is retained according to our Privacy Policy',
                'contact_info': 'privacy@bookedbarber.com'
            }
            
            logger.info(f"Collected {len(user_data)} data categories for user {user_id}")
            return user_data
            
        except Exception as e:
            logger.error(f"Error collecting user data for user {user_id}: {str(e)}")
            raise
    
    async def _generate_export_file(self, user_data: Dict[str, Any], format: str, request_id: str) -> Tuple[str, int]:
        """
        Generate the export file in the requested format.
        
        Args:
            user_data: Collected user data
            format: Requested format (json, csv, xml)
            request_id: Unique request identifier
            
        Returns:
            Tuple of (file_path, file_size_bytes)
        """
        logger.info(f"Generating export file for request {request_id} in format {format}")
        
        # Create temporary file
        temp_dir = tempfile.gettempdir()
        file_name = f"gdpr_export_{request_id}.{format}"
        file_path = os.path.join(temp_dir, file_name)
        
        try:
            if format.lower() == 'json':
                # Generate JSON export
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(user_data, f, indent=2, ensure_ascii=False, default=str)
            
            elif format.lower() == 'csv':
                # Generate CSV export (multiple files in a ZIP)
                zip_path = file_path.replace('.csv', '.zip')
                
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    for category, data in user_data.items():
                        if isinstance(data, list) and data:
                            # Convert list data to CSV
                            csv_content = await self._convert_to_csv(data, category)
                            zip_file.writestr(f"{category}.csv", csv_content)
                        elif isinstance(data, dict):
                            # Convert dict data to JSON file in ZIP
                            json_content = json.dumps(data, indent=2, default=str)
                            zip_file.writestr(f"{category}.json", json_content)
                
                file_path = zip_path
            
            elif format.lower() == 'xml':
                # Generate XML export
                xml_content = await self._convert_to_xml(user_data)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(xml_content)
            
            else:
                raise ValueError(f"Unsupported format: {format}")
            
            # Get file size
            file_size = os.path.getsize(file_path)
            
            # Check file size limit
            max_size_bytes = self.max_export_size_mb * 1024 * 1024
            if file_size > max_size_bytes:
                raise ValueError(f"Export file too large: {file_size} bytes (max: {max_size_bytes})")
            
            logger.info(f"Generated export file: {file_path} ({file_size} bytes)")
            return file_path, file_size
            
        except Exception as e:
            logger.error(f"Error generating export file: {str(e)}")
            if os.path.exists(file_path):
                os.remove(file_path)
            raise
    
    async def _convert_to_csv(self, data: List[Dict], category: str) -> str:
        """Convert list data to CSV format"""
        if not data:
            return ""
        
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        
        return output.getvalue()
    
    async def _convert_to_xml(self, data: Dict[str, Any]) -> str:
        """Convert data to XML format"""
        try:
            import xml.etree.ElementTree as ET
            
            root = ET.Element("user_data_export")
            
            for category, content in data.items():
                category_elem = ET.SubElement(root, category)
                
                if isinstance(content, list):
                    for item in content:
                        item_elem = ET.SubElement(category_elem, "item")
                        for key, value in item.items():
                            child_elem = ET.SubElement(item_elem, key)
                            child_elem.text = str(value) if value is not None else ""
                
                elif isinstance(content, dict):
                    for key, value in content.items():
                        child_elem = ET.SubElement(category_elem, key)
                        child_elem.text = str(value) if value is not None else ""
            
            return ET.tostring(root, encoding='unicode', method='xml')
            
        except Exception as e:
            logger.error(f"Error converting to XML: {str(e)}")
            raise
    
    async def _store_export_file(self, file_path: str, request_id: str) -> str:
        """
        Store the export file securely and return access URL.
        
        Args:
            file_path: Local path to the export file
            request_id: Unique request identifier
            
        Returns:
            Secure URL for file download
        """
        logger.info(f"Storing export file for request {request_id}")
        
        try:
            if self.s3_client:
                # Upload to S3
                file_name = f"gdpr_exports/{request_id}/{os.path.basename(file_path)}"
                
                self.s3_client.upload_file(
                    file_path,
                    self.s3_bucket,
                    file_name,
                    ExtraArgs={
                        'ServerSideEncryption': 'AES256',
                        'Metadata': {
                            'request_id': request_id,
                            'export_type': 'gdpr_data_export'
                        }
                    }
                )
                
                # Generate presigned URL valid for 48 hours
                url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.s3_bucket, 'Key': file_name},
                    ExpiresIn=self.export_retention_hours * 3600
                )
                
                logger.info(f"File uploaded to S3: {file_name}")
                return url
            
            else:
                # Local storage fallback (for development)
                local_dir = os.path.join(tempfile.gettempdir(), 'gdpr_exports')
                os.makedirs(local_dir, exist_ok=True)
                
                local_file_path = os.path.join(local_dir, f"{request_id}_{os.path.basename(file_path)}")
                
                # Copy file to secure location
                import shutil
                shutil.copy2(file_path, local_file_path)
                
                # Return local file URL (this would need to be served by the application)
                return f"/api/v1/privacy/download/{request_id}"
                
        except Exception as e:
            logger.error(f"Error storing export file: {str(e)}")
            raise
    
    def _log_data_processing(self, user_id: int, operation: str, data_categories: List[str]):
        """Log data processing activity for GDPR compliance"""
        try:
            log_entry = DataProcessingLog(
                user_id=user_id,
                purpose=DataProcessingPurpose.DATA_EXPORT,
                operation=operation,
                data_categories=data_categories,
                legal_basis="consent",
                processing_date=datetime.utcnow()
            )
            self.db.add(log_entry)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error logging data processing: {str(e)}")
    
    async def _notify_user_export_ready(self, export_request: DataExportRequest):
        """Send email notification when export is ready"""
        try:
            user = export_request.user
            
            if notification_service and user.email:
                await notification_service.send_email(
                    to_email=str(user.email),
                    subject="Your Data Export is Ready",
                    template="gdpr_export_ready",
                    template_data={
                        'user_name': user.name,
                        'request_id': export_request.request_id,
                        'download_url': export_request.file_url,
                        'expires_at': export_request.expires_at.strftime('%Y-%m-%d %H:%M UTC'),
                        'file_size_mb': round(export_request.file_size_bytes / (1024 * 1024), 2)
                    }
                )
                logger.info(f"Export ready notification sent to user {user.id}")
                
        except Exception as e:
            logger.error(f"Error sending export ready notification: {str(e)}")
    
    async def _notify_user_export_failed(self, export_request: DataExportRequest, error_message: str):
        """Send email notification when export fails"""
        try:
            user = export_request.user
            
            if notification_service and user.email:
                await notification_service.send_email(
                    to_email=str(user.email),
                    subject="Data Export Failed",
                    template="gdpr_export_failed",
                    template_data={
                        'user_name': user.name,
                        'request_id': export_request.request_id,
                        'error_message': error_message,
                        'support_email': 'privacy@bookedbarber.com'
                    }
                )
                logger.info(f"Export failed notification sent to user {user.id}")
                
        except Exception as e:
            logger.error(f"Error sending export failed notification: {str(e)}")
    
    async def cleanup_expired_exports(self):
        """Clean up expired export files and mark requests as expired"""
        logger.info("Starting cleanup of expired exports")
        
        try:
            # Find expired requests
            expired_requests = self.db.query(DataExportRequest).filter(
                DataExportRequest.status == ExportStatus.COMPLETED,
                DataExportRequest.expires_at < datetime.utcnow()
            ).all()
            
            for request in expired_requests:
                try:
                    # Delete file from S3 if using S3
                    if self.s3_client and request.file_url:
                        # Extract S3 key from URL
                        if 'gdpr_exports' in request.file_url:
                            s3_key = f"gdpr_exports/{request.request_id}/"
                            
                            # List and delete all objects with this prefix
                            objects = self.s3_client.list_objects_v2(
                                Bucket=self.s3_bucket,
                                Prefix=s3_key
                            )
                            
                            if 'Contents' in objects:
                                for obj in objects['Contents']:
                                    self.s3_client.delete_object(
                                        Bucket=self.s3_bucket,
                                        Key=obj['Key']
                                    )
                    
                    # Mark as expired
                    request.status = ExportStatus.EXPIRED
                    request.file_url = None
                    request.updated_at = datetime.utcnow()
                    
                    logger.info(f"Cleaned up expired export: {request.request_id}")
                    
                except Exception as e:
                    logger.error(f"Error cleaning up export {request.request_id}: {str(e)}")
            
            self.db.commit()
            logger.info(f"Cleanup completed. Processed {len(expired_requests)} expired exports")
            
        except Exception as e:
            logger.error(f"Error during export cleanup: {str(e)}")
    
    async def get_export_status(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of an export request"""
        try:
            export_request = self.db.query(DataExportRequest).filter(
                DataExportRequest.request_id == request_id
            ).first()
            
            if not export_request:
                return None
            
            return {
                'request_id': export_request.request_id,
                'status': export_request.status.value,
                'requested_at': export_request.requested_at.isoformat(),
                'completed_at': export_request.completed_at.isoformat() if export_request.completed_at else None,
                'expires_at': export_request.expires_at.isoformat() if export_request.expires_at else None,
                'file_size_bytes': export_request.file_size_bytes,
                'format': export_request.format,
                'download_url': export_request.file_url if not export_request.is_expired() else None,
                'error_message': export_request.error_message
            }
            
        except Exception as e:
            logger.error(f"Error getting export status for {request_id}: {str(e)}")
            return None


# Global service instance
privacy_data_export_service = PrivacyDataExportService