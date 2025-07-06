"""
Trial expiration monitoring service.

This service monitors trial periods and sends notifications to users
as their trials approach expiration and when they expire.
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

from models import User, Organization, UserOrganization
from models.organization import UserRole
from services.subscription_service import SubscriptionService
from utils.email import send_trial_expiration_email, send_trial_expired_email

logger = logging.getLogger(__name__)


class TrialMonitoringService:
    """Service for monitoring trial periods and sending notifications"""
    
    def __init__(self, db: Session):
        self.db = db
        self.subscription_service = SubscriptionService()
    
    def get_trials_expiring_soon(self, days_ahead: int = 3) -> List[Dict[str, Any]]:
        """
        Get trials expiring within specified days.
        
        Args:
            days_ahead: Number of days to look ahead for expiring trials
            
        Returns:
            List of organizations with trials expiring soon
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        cutoff_date = now + timedelta(days=days_ahead)
        
        # Find organizations with trials expiring soon
        expiring_orgs = self.db.query(Organization).filter(
            and_(
                Organization.subscription_status == 'trial',
                Organization.subscription_expires_at.isnot(None),
                Organization.subscription_expires_at <= cutoff_date,
                Organization.subscription_expires_at > now,
                Organization.is_active == True
            )
        ).all()
        
        results = []
        for org in expiring_orgs:
            # Get trial status details
            trial_status = self.subscription_service.check_trial_status(self.db, org.id)
            
            # Get primary owner for notifications
            owner_relationship = self.db.query(UserOrganization).filter(
                and_(
                    UserOrganization.organization_id == org.id,
                    UserOrganization.role == UserRole.OWNER.value,
                    UserOrganization.is_primary == True
                )
            ).first()
            
            if owner_relationship:
                owner = self.db.query(User).filter(User.id == owner_relationship.user_id).first()
                if owner:
                    results.append({
                        'organization': org,
                        'owner': owner,
                        'trial_status': trial_status,
                        'days_remaining': trial_status['days_remaining']
                    })
        
        return results
    
    def get_expired_trials(self) -> List[Dict[str, Any]]:
        """
        Get trials that have expired but subscription hasn't been updated.
        
        Returns:
            List of organizations with expired trials
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # Find organizations with expired trials still marked as 'trial'
        expired_orgs = self.db.query(Organization).filter(
            and_(
                Organization.subscription_status == 'trial',
                Organization.subscription_expires_at.isnot(None),
                Organization.subscription_expires_at <= now,
                Organization.is_active == True
            )
        ).all()
        
        results = []
        for org in expired_orgs:
            # Get primary owner for notifications
            owner_relationship = self.db.query(UserOrganization).filter(
                and_(
                    UserOrganization.organization_id == org.id,
                    UserOrganization.role == UserRole.OWNER.value,
                    UserOrganization.is_primary == True
                )
            ).first()
            
            if owner_relationship:
                owner = self.db.query(User).filter(User.id == owner_relationship.user_id).first()
                if owner:
                    results.append({
                        'organization': org,
                        'owner': owner,
                        'expired_date': org.subscription_expires_at
                    })
        
        return results
    
    def send_expiration_warnings(self, days_ahead: int = 3) -> Dict[str, Any]:
        """
        Send trial expiration warnings to organizations.
        
        Args:
            days_ahead: Send warnings for trials expiring within this many days
            
        Returns:
            Summary of notifications sent
        """
        expiring_trials = self.get_trials_expiring_soon(days_ahead)
        
        sent_count = 0
        failed_count = 0
        
        for trial_info in expiring_trials:
            try:
                organization = trial_info['organization']
                owner = trial_info['owner']
                days_remaining = trial_info['days_remaining']
                
                # Send expiration warning email
                send_trial_expiration_email(
                    email=owner.email,
                    name=owner.name,
                    organization_name=organization.name,
                    days_remaining=days_remaining,
                    chairs_count=organization.chairs_count
                )
                
                sent_count += 1
                logger.info(f"Trial expiration warning sent to {owner.email} for organization {organization.name}")
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to send trial expiration warning: {str(e)}")
        
        return {
            'total_trials_expiring': len(expiring_trials),
            'notifications_sent': sent_count,
            'notifications_failed': failed_count
        }
    
    def process_expired_trials(self) -> Dict[str, Any]:
        """
        Process expired trials by updating status and sending notifications.
        
        Returns:
            Summary of processed trials
        """
        expired_trials = self.get_expired_trials()
        
        processed_count = 0
        failed_count = 0
        
        for trial_info in expired_trials:
            try:
                organization = trial_info['organization']
                owner = trial_info['owner']
                
                # Update organization status to expired
                organization.subscription_status = 'expired'
                organization.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                
                # Send trial expired notification
                send_trial_expired_email(
                    email=owner.email,
                    name=owner.name,
                    organization_name=organization.name,
                    chairs_count=organization.chairs_count
                )
                
                processed_count += 1
                logger.info(f"Trial expired notification sent to {owner.email} for organization {organization.name}")
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to process expired trial: {str(e)}")
        
        # Commit all status updates
        if processed_count > 0:
            self.db.commit()
        
        return {
            'total_trials_expired': len(expired_trials),
            'trials_processed': processed_count,
            'processing_failed': failed_count
        }
    
    def get_trial_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about trial usage across the platform.
        
        Returns:
            Trial usage statistics
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # Active trials
        active_trials = self.db.query(Organization).filter(
            and_(
                Organization.subscription_status == 'trial',
                Organization.subscription_expires_at > now,
                Organization.is_active == True
            )
        ).count()
        
        # Expired trials
        expired_trials = self.db.query(Organization).filter(
            and_(
                Organization.subscription_status.in_(['trial', 'expired']),
                Organization.subscription_expires_at <= now,
                Organization.is_active == True
            )
        ).count()
        
        # Trials expiring in 1 day
        tomorrow = now + timedelta(days=1)
        expiring_tomorrow = self.db.query(Organization).filter(
            and_(
                Organization.subscription_status == 'trial',
                Organization.subscription_expires_at <= tomorrow,
                Organization.subscription_expires_at > now,
                Organization.is_active == True
            )
        ).count()
        
        # Trials expiring in 3 days
        three_days = now + timedelta(days=3)
        expiring_soon = self.db.query(Organization).filter(
            and_(
                Organization.subscription_status == 'trial',
                Organization.subscription_expires_at <= three_days,
                Organization.subscription_expires_at > now,
                Organization.is_active == True
            )
        ).count()
        
        return {
            'active_trials': active_trials,
            'expired_trials': expired_trials,
            'expiring_tomorrow': expiring_tomorrow,
            'expiring_in_3_days': expiring_soon,
            'timestamp': now.isoformat()
        }