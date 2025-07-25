from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta, timezone
import logging
import csv
import io
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc
from jinja2 import Template

from models import (
    Client, MarketingCampaign, MarketingTemplate, ContactList, ContactSegment, 
    ContactListMember, CampaignAnalytics, MarketingUsage
)
from schemas import (
    MarketingCampaignCreate, MarketingCampaignUpdate,
    MarketingTemplateCreate, MarketingTemplateUpdate,
    ContactListCreate, ContactSegmentCreate
)
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class MarketingService:
    def __init__(self):
        self.notification_service = NotificationService()
        
    # Campaign Management
    def create_campaign(self, db: Session, campaign_data: MarketingCampaignCreate, created_by_id: int) -> MarketingCampaign:
        """Create a new marketing campaign"""
        campaign = MarketingCampaign(
            name=campaign_data.name,
            description=campaign_data.description,
            campaign_type=campaign_data.campaign_type,
            template_id=campaign_data.template_id,
            subject=campaign_data.subject,
            content=campaign_data.content,
            recipient_list_id=campaign_data.recipient_list_id,
            recipient_segment_id=campaign_data.recipient_segment_id,
            scheduled_for=campaign_data.scheduled_for,
            tags=campaign_data.tags or [],
            status='draft',
            created_by_id=created_by_id
        )
        
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        
        logger.info(f"Created campaign '{campaign.name}' with ID {campaign.id}")
        return campaign
    
    def list_campaigns(self, db: Session, skip: int = 0, limit: int = 20, 
                      status: Optional[str] = None, campaign_type: Optional[str] = None,
                      search: Optional[str] = None) -> Tuple[List[MarketingCampaign], int]:
        """List campaigns with filters and pagination"""
        query = db.query(MarketingCampaign)
        
        if status:
            query = query.filter(MarketingCampaign.status == status)
        
        if campaign_type:
            query = query.filter(MarketingCampaign.campaign_type == campaign_type)
        
        if search:
            query = query.filter(
                or_(
                    MarketingCampaign.name.ilike(f"%{search}%"),
                    MarketingCampaign.description.ilike(f"%{search}%")
                )
            )
        
        total = query.count()
        campaigns = query.order_by(desc(MarketingCampaign.created_at)).offset(skip).limit(limit).all()
        
        # Load analytics for each campaign
        for campaign in campaigns:
            self._load_campaign_analytics(db, campaign)
        
        return campaigns, total
    
    def get_campaign(self, db: Session, campaign_id: int) -> Optional[MarketingCampaign]:
        """Get a specific campaign by ID"""
        campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
        if campaign:
            self._load_campaign_analytics(db, campaign)
        return campaign
    
    def update_campaign(self, db: Session, campaign_id: int, campaign_data: MarketingCampaignUpdate) -> MarketingCampaign:
        """Update a marketing campaign"""
        campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
        if not campaign:
            raise ValueError("Campaign not found")
        
        if campaign.status != 'draft':
            raise ValueError("Only draft campaigns can be updated")
        
        # Update fields
        update_data = campaign_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(campaign, field, value)
        
        campaign.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(campaign)
        
        return campaign
    
    def delete_campaign(self, db: Session, campaign_id: int) -> bool:
        """Delete a campaign (only if not sent)"""
        campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
        if not campaign:
            return False
        
        if campaign.status in ['sending', 'sent']:
            raise ValueError("Cannot delete a campaign that has been sent")
        
        db.delete(campaign)
        db.commit()
        return True
    
    def send_campaign(self, db: Session, campaign_id: int, test_mode: bool = False, 
                     test_recipients: Optional[List[str]] = None) -> Dict[str, Any]:
        """Send a marketing campaign"""
        campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
        if not campaign:
            raise ValueError("Campaign not found")
        
        if campaign.status != 'draft':
            raise ValueError(f"Campaign is already {campaign.status}")
        
        # Update campaign status
        campaign.status = 'sending'
        campaign.sent_at = datetime.now(timezone.utc)
        db.commit()
        
        try:
            # Get recipients
            recipients = self._get_campaign_recipients(db, campaign, test_mode, test_recipients)
            
            if not recipients:
                campaign.status = 'failed'
                db.commit()
                raise ValueError("No valid recipients found")
            
            # Initialize analytics
            analytics = self._init_campaign_analytics(db, campaign.id, len(recipients))
            
            # Send to each recipient
            sent_count = 0
            failed_count = 0
            
            for recipient in recipients:
                try:
                    # Render content with recipient data
                    rendered_content = self._render_content(campaign, recipient, db)
                    
                    # Send via notification service
                    if campaign.campaign_type == 'email':
                        result = self.notification_service.send_email(
                            to_email=recipient.get('email'),
                            subject=campaign.subject,
                            body=rendered_content,
                            retry_count=2
                        )
                    else:  # SMS
                        result = self.notification_service.send_sms(
                            to_phone=recipient.get('phone'),
                            message=rendered_content,
                            retry_count=2
                        )
                    
                    if result.get('success'):
                        sent_count += 1
                        # Track delivery
                        self._track_delivery(db, campaign.id, recipient.get('id'), 'delivered')
                    else:
                        failed_count += 1
                        self._track_delivery(db, campaign.id, recipient.get('id'), 'failed', result.get('error'))
                        
                except Exception as e:
                    logger.error(f"Error sending to recipient {recipient.get('id')}: {e}")
                    failed_count += 1
                    self._track_delivery(db, campaign.id, recipient.get('id'), 'failed', str(e))
            
            # Update campaign status
            campaign.status = 'sent' if sent_count > 0 else 'failed'
            db.commit()
            
            # Update analytics
            analytics.sent_count = sent_count
            analytics.delivered_count = sent_count  # Will be updated by webhooks
            db.commit()
            
            # Update usage statistics
            self._update_usage_stats(db, campaign.campaign_type, sent_count)
            
            logger.info(f"Campaign {campaign_id} sent to {sent_count} recipients ({failed_count} failed)")
            
            return {
                'success': True,
                'sent_count': sent_count,
                'failed_count': failed_count,
                'total_recipients': len(recipients)
            }
            
        except Exception as e:
            campaign.status = 'failed'
            db.commit()
            logger.error(f"Error sending campaign {campaign_id}: {e}")
            raise
    
    # Template Management
    def create_template(self, db: Session, template_data: MarketingTemplateCreate, created_by_id: int) -> MarketingTemplate:
        """Create a new marketing template"""
        template = MarketingTemplate(
            name=template_data.name,
            description=template_data.description,
            template_type=template_data.template_type,
            category=template_data.category,
            subject=template_data.subject,
            content=template_data.content,
            variables=template_data.variables or [],
            preview_data=template_data.preview_data or {},
            created_by_id=created_by_id,
            is_active=True
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        logger.info(f"Created template '{template.name}' with ID {template.id}")
        return template
    
    def list_templates(self, db: Session, template_type: Optional[str] = None, 
                      category: Optional[str] = None) -> List[MarketingTemplate]:
        """List all marketing templates"""
        query = db.query(MarketingTemplate).filter(MarketingTemplate.is_active == True)
        
        if template_type:
            query = query.filter(MarketingTemplate.template_type == template_type)
        
        if category:
            query = query.filter(MarketingTemplate.category == category)
        
        return query.order_by(MarketingTemplate.name).all()
    
    def get_template(self, db: Session, template_id: int) -> Optional[MarketingTemplate]:
        """Get a specific template by ID"""
        return db.query(MarketingTemplate).filter(MarketingTemplate.id == template_id).first()
    
    def update_template(self, db: Session, template_id: int, template_data: MarketingTemplateUpdate) -> MarketingTemplate:
        """Update a marketing template"""
        template = db.query(MarketingTemplate).filter(MarketingTemplate.id == template_id).first()
        if not template:
            raise ValueError("Template not found")
        
        # Update fields
        update_data = template_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)
        
        template.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(template)
        
        return template
    
    def preview_template(self, db: Session, template_id: int, sample_data: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
        """Preview a template with sample data"""
        template = self.get_template(db, template_id)
        if not template:
            return None
        
        # Use provided sample data or template's preview data
        data = sample_data or template.preview_data or {}
        
        # Add default values for common variables
        data.setdefault('client_name', 'John Doe')
        data.setdefault('business_name', 'Six Figure Barber Shop')
        data.setdefault('current_year', datetime.now().year)
        
        # Render template
        try:
            content_template = Template(template.content)
            rendered_content = content_template.render(**data)
            
            result = {'content': rendered_content}
            
            if template.subject and template.template_type == 'email':
                subject_template = Template(template.subject)
                result['subject'] = subject_template.render(**data)
            
            return result
        except Exception as e:
            logger.error(f"Error rendering template {template_id}: {e}")
            return {'error': str(e)}
    
    # Contact Management
    def list_contacts(self, db: Session, skip: int = 0, limit: int = 20,
                     list_id: Optional[int] = None, segment_id: Optional[int] = None,
                     search: Optional[str] = None, subscribed_only: bool = True) -> Tuple[List[Dict], int]:
        """List contacts with filters"""
        query = db.query(Client)
        
        if subscribed_only:
            query = query.filter(
                or_(
                    Client.email_opt_in == True,
                    Client.sms_opt_in == True
                )
            )
        
        if list_id:
            # Join with ContactListMember
            query = query.join(ContactListMember).filter(ContactListMember.list_id == list_id)
        
        if segment_id:
            # Apply segment criteria
            segment = db.query(ContactSegment).filter(ContactSegment.id == segment_id).first()
            if segment:
                query = self._apply_segment_criteria(query, segment.criteria)
        
        if search:
            query = query.filter(
                or_(
                    Client.name.ilike(f"%{search}%"),
                    Client.email.ilike(f"%{search}%"),
                    Client.phone.ilike(f"%{search}%")
                )
            )
        
        total = query.count()
        contacts = query.offset(skip).limit(limit).all()
        
        # Convert to dict format
        contact_list = []
        for contact in contacts:
            contact_dict = {
                'id': contact.id,
                'name': contact.name,
                'email': contact.email,
                'phone': contact.phone,
                'email_opt_in': contact.email_opt_in,
                'sms_opt_in': contact.sms_opt_in,
                'created_at': contact.created_at,
                'last_appointment': contact.appointments[-1].start_time if contact.appointments else None,
                'total_appointments': len(contact.appointments),
                'subscribed': contact.email_opt_in or contact.sms_opt_in
            }
            contact_list.append(contact_dict)
        
        return contact_list, total
    
    def import_contacts(self, db: Session, csv_reader, list_id: Optional[int] = None,
                       update_existing: bool = False, imported_by_id: int = None) -> Dict[str, Any]:
        """Import contacts from CSV"""
        imported = 0
        updated = 0
        skipped = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=1):
            try:
                # Validate required fields
                email = row.get('email', '').strip()
                if not email:
                    errors.append({'row': row_num, 'error': 'Email is required'})
                    skipped += 1
                    continue
                
                # Check if contact exists
                existing = db.query(Client).filter(Client.email == email).first()
                
                if existing and not update_existing:
                    skipped += 1
                    continue
                
                if existing:
                    # Update existing contact
                    if row.get('name'):
                        existing.name = row['name']
                    if row.get('phone'):
                        existing.phone = row['phone']
                    if row.get('email_opt_in') is not None:
                        existing.email_opt_in = row['email_opt_in'].lower() in ['true', '1', 'yes']
                    if row.get('sms_opt_in') is not None:
                        existing.sms_opt_in = row['sms_opt_in'].lower() in ['true', '1', 'yes']
                    
                    updated += 1
                    contact = existing
                else:
                    # Create new contact
                    contact = Client(
                        email=email,
                        name=row.get('name', ''),
                        phone=row.get('phone', ''),
                        email_opt_in=row.get('email_opt_in', 'true').lower() in ['true', '1', 'yes'],
                        sms_opt_in=row.get('sms_opt_in', 'false').lower() in ['true', '1', 'yes'],
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(contact)
                    imported += 1
                
                # Add to list if specified
                if list_id and contact:
                    existing_member = db.query(ContactListMember).filter(
                        ContactListMember.list_id == list_id,
                        ContactListMember.contact_id == contact.id
                    ).first()
                    
                    if not existing_member:
                        list_member = ContactListMember(
                            list_id=list_id,
                            contact_id=contact.id,
                            added_at=datetime.now(timezone.utc)
                        )
                        db.add(list_member)
                
            except Exception as e:
                errors.append({'row': row_num, 'error': str(e)})
                skipped += 1
        
        db.commit()
        
        # Update contact count for list
        if list_id:
            self._update_list_contact_count(db, list_id)
        
        return {
            'imported': imported,
            'updated': updated,
            'skipped': skipped,
            'errors': errors,
            'total_processed': imported + updated + skipped
        }
    
    def export_contacts(self, db: Session, list_id: Optional[int] = None,
                       segment_id: Optional[int] = None, fields: Optional[List[str]] = None) -> str:
        """Export contacts to CSV"""
        query = db.query(Client)
        
        if list_id:
            query = query.join(ContactListMember).filter(ContactListMember.list_id == list_id)
        
        if segment_id:
            segment = db.query(ContactSegment).filter(ContactSegment.id == segment_id).first()
            if segment:
                query = self._apply_segment_criteria(query, segment.criteria)
        
        contacts = query.all()
        
        # Default fields
        if not fields:
            fields = ['name', 'email', 'phone', 'email_opt_in', 'sms_opt_in', 'created_at']
        
        # Create CSV
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        
        for contact in contacts:
            row = {}
            for field in fields:
                if field == 'subscribed':
                    row[field] = contact.email_opt_in or contact.sms_opt_in
                else:
                    row[field] = getattr(contact, field, '')
            writer.writerow(row)
        
        return output.getvalue()
    
    def bulk_contact_action(self, db: Session, contact_ids: List[int], action: str,
                           action_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Perform bulk action on contacts"""
        affected = 0
        
        if action == 'subscribe':
            affected = db.query(Client).filter(Client.id.in_(contact_ids)).update({
                'email_opt_in': True,
                'sms_opt_in': True
            })
        
        elif action == 'unsubscribe':
            affected = db.query(Client).filter(Client.id.in_(contact_ids)).update({
                'email_opt_in': False,
                'sms_opt_in': False
            })
        
        elif action == 'add_to_list' and action_data and 'list_id' in action_data:
            list_id = action_data['list_id']
            for contact_id in contact_ids:
                existing = db.query(ContactListMember).filter(
                    ContactListMember.list_id == list_id,
                    ContactListMember.contact_id == contact_id
                ).first()
                
                if not existing:
                    member = ContactListMember(
                        list_id=list_id,
                        contact_id=contact_id,
                        added_at=datetime.now(timezone.utc)
                    )
                    db.add(member)
                    affected += 1
        
        elif action == 'remove_from_list' and action_data and 'list_id' in action_data:
            list_id = action_data['list_id']
            affected = db.query(ContactListMember).filter(
                ContactListMember.list_id == list_id,
                ContactListMember.contact_id.in_(contact_ids)
            ).delete()
        
        elif action == 'delete':
            affected = db.query(Client).filter(Client.id.in_(contact_ids)).delete()
        
        else:
            raise ValueError(f"Invalid action: {action}")
        
        db.commit()
        
        # Update list counts if needed
        if action in ['add_to_list', 'remove_from_list'] and action_data and 'list_id' in action_data:
            self._update_list_contact_count(db, action_data['list_id'])
        
        return {
            'success': True,
            'affected': affected,
            'action': action
        }
    
    # Contact Lists
    def create_contact_list(self, db: Session, list_data: ContactListCreate, created_by_id: int) -> ContactList:
        """Create a new contact list"""
        contact_list = ContactList(
            name=list_data.name,
            description=list_data.description,
            created_by_id=created_by_id
        )
        
        db.add(contact_list)
        db.commit()
        db.refresh(contact_list)
        
        return contact_list
    
    def list_contact_lists(self, db: Session) -> List[ContactList]:
        """List all contact lists"""
        lists = db.query(ContactList).order_by(ContactList.name).all()
        
        # Update contact counts
        for lst in lists:
            lst.contact_count = db.query(ContactListMember).filter(
                ContactListMember.list_id == lst.id
            ).count()
        
        return lists
    
    # Segments
    def create_segment(self, db: Session, segment_data: ContactSegmentCreate, created_by_id: int) -> ContactSegment:
        """Create a new contact segment"""
        segment = ContactSegment(
            name=segment_data.name,
            description=segment_data.description,
            criteria=segment_data.criteria,
            created_by_id=created_by_id
        )
        
        db.add(segment)
        db.commit()
        db.refresh(segment)
        
        # Calculate initial contact count
        self._update_segment_contact_count(db, segment.id)
        
        return segment
    
    def list_segments(self, db: Session) -> List[ContactSegment]:
        """List all segments"""
        segments = db.query(ContactSegment).order_by(ContactSegment.name).all()
        
        # Update contact counts
        for segment in segments:
            self._update_segment_contact_count(db, segment.id)
        
        return segments
    
    # Analytics
    def get_campaign_analytics(self, db: Session, campaign_id: int) -> Optional[CampaignAnalytics]:
        """Get detailed analytics for a campaign"""
        analytics = db.query(CampaignAnalytics).filter(
            CampaignAnalytics.campaign_id == campaign_id
        ).first()
        
        if analytics:
            # Calculate rates
            if analytics.total_recipients > 0:
                analytics.delivery_rate = (analytics.delivered_count / analytics.total_recipients) * 100
                analytics.open_rate = (analytics.opened_count / analytics.delivered_count) * 100 if analytics.delivered_count > 0 else 0
                analytics.click_rate = (analytics.clicked_count / analytics.delivered_count) * 100 if analytics.delivered_count > 0 else 0
                analytics.bounce_rate = (analytics.bounced_count / analytics.total_recipients) * 100
                analytics.unsubscribe_rate = (analytics.unsubscribed_count / analytics.delivered_count) * 100 if analytics.delivered_count > 0 else 0
                
                if analytics.opened_count > 0:
                    analytics.click_to_open_rate = (analytics.clicked_count / analytics.opened_count) * 100
        
        return analytics
    
    def get_overall_analytics(self, db: Session, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get overall marketing analytics for a date range"""
        # Campaign stats
        campaigns_query = db.query(MarketingCampaign).filter(
            MarketingCampaign.created_at.between(start_date, end_date)
        )
        
        total_campaigns = campaigns_query.count()
        sent_campaigns = campaigns_query.filter(MarketingCampaign.status == 'sent').count()
        
        # Email stats
        email_analytics = db.query(
            func.sum(CampaignAnalytics.sent_count).label('total_sent'),
            func.sum(CampaignAnalytics.delivered_count).label('total_delivered'),
            func.sum(CampaignAnalytics.opened_count).label('total_opened'),
            func.sum(CampaignAnalytics.clicked_count).label('total_clicked'),
            func.sum(CampaignAnalytics.bounced_count).label('total_bounced'),
            func.sum(CampaignAnalytics.unsubscribed_count).label('total_unsubscribed')
        ).join(MarketingCampaign).filter(
            MarketingCampaign.campaign_type == 'email',
            MarketingCampaign.sent_at.between(start_date, end_date)
        ).first()
        
        # SMS stats
        sms_analytics = db.query(
            func.sum(CampaignAnalytics.sent_count).label('total_sent'),
            func.sum(CampaignAnalytics.delivered_count).label('total_delivered')
        ).join(MarketingCampaign).filter(
            MarketingCampaign.campaign_type == 'sms',
            MarketingCampaign.sent_at.between(start_date, end_date)
        ).first()
        
        # Contact growth
        new_contacts = db.query(Client).filter(
            Client.created_at.between(start_date, end_date)
        ).count()
        
        total_contacts = db.query(Client).filter(
            or_(Client.email_opt_in == True, Client.sms_opt_in == True)
        ).count()
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'campaigns': {
                'total': total_campaigns,
                'sent': sent_campaigns,
                'draft': total_campaigns - sent_campaigns
            },
            'email': {
                'sent': email_analytics.total_sent or 0 if email_analytics else 0,
                'delivered': email_analytics.total_delivered or 0 if email_analytics else 0,
                'opened': email_analytics.total_opened or 0 if email_analytics else 0,
                'clicked': email_analytics.total_clicked or 0 if email_analytics else 0,
                'bounced': email_analytics.total_bounced or 0 if email_analytics else 0,
                'unsubscribed': email_analytics.total_unsubscribed or 0 if email_analytics else 0,
                'open_rate': ((email_analytics.total_opened or 0) / (email_analytics.total_delivered or 1)) * 100 if email_analytics and email_analytics.total_delivered else 0,
                'click_rate': ((email_analytics.total_clicked or 0) / (email_analytics.total_delivered or 1)) * 100 if email_analytics and email_analytics.total_delivered else 0
            },
            'sms': {
                'sent': sms_analytics.total_sent or 0 if sms_analytics else 0,
                'delivered': sms_analytics.total_delivered or 0 if sms_analytics else 0,
                'delivery_rate': ((sms_analytics.total_delivered or 0) / (sms_analytics.total_sent or 1)) * 100 if sms_analytics and sms_analytics.total_sent else 0
            },
            'contacts': {
                'total': total_contacts,
                'new': new_contacts,
                'growth_rate': (new_contacts / max(total_contacts - new_contacts, 1)) * 100
            }
        }
    
    # Usage/Billing
    def get_usage_stats(self, db: Session, period: str = 'current',
                       start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Get usage statistics for billing"""
        # Determine date range
        if period == 'current':
            now = datetime.now(timezone.utc)
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif period == 'last_month':
            now = datetime.now(timezone.utc)
            last_month = now.replace(day=1) - timedelta(days=1)
            start_date = last_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_date = last_month.replace(day=1) + timedelta(days=32)
            end_date = end_date.replace(day=1) - timedelta(days=1)
        elif period == 'custom' and start_date and end_date:
            pass
        else:
            raise ValueError("Invalid period or missing dates for custom period")
        
        # Get or create usage record
        usage = db.query(MarketingUsage).filter(
            MarketingUsage.period_start == start_date.date(),
            MarketingUsage.period_end == end_date.date()
        ).first()
        
        if not usage:
            # Calculate usage from campaign analytics
            email_stats = db.query(
                func.sum(CampaignAnalytics.sent_count).label('total')
            ).join(MarketingCampaign).filter(
                MarketingCampaign.campaign_type == 'email',
                MarketingCampaign.sent_at.between(start_date, end_date)
            ).first()
            
            sms_stats = db.query(
                func.sum(CampaignAnalytics.sent_count).label('total')
            ).join(MarketingCampaign).filter(
                MarketingCampaign.campaign_type == 'sms',
                MarketingCampaign.sent_at.between(start_date, end_date)
            ).first()
            
            campaigns_created = db.query(MarketingCampaign).filter(
                MarketingCampaign.created_at.between(start_date, end_date)
            ).count()
            
            campaigns_sent = db.query(MarketingCampaign).filter(
                MarketingCampaign.sent_at.between(start_date, end_date)
            ).count()
            
            # Contact stats
            total_contacts = db.query(Client).filter(
                or_(Client.email_opt_in == True, Client.sms_opt_in == True)
            ).count()
            
            new_contacts = db.query(Client).filter(
                Client.created_at.between(start_date, end_date)
            ).count()
            
            # TODO: Get actual limits from billing/subscription service
            email_limit = 10000  # Example limit
            sms_limit = 1000     # Example limit
            
            emails_sent = email_stats.total or 0 if email_stats else 0
            sms_sent = sms_stats.total or 0 if sms_stats else 0
            
            return {
                'period': period,
                'start_date': start_date,
                'end_date': end_date,
                'emails_sent': emails_sent,
                'email_limit': email_limit,
                'email_usage_percentage': (emails_sent / email_limit) * 100 if email_limit else 0,
                'sms_sent': sms_sent,
                'sms_limit': sms_limit,
                'sms_usage_percentage': (sms_sent / sms_limit) * 100 if sms_limit else 0,
                'campaigns_created': campaigns_created,
                'campaigns_sent': campaigns_sent,
                'total_contacts': total_contacts,
                'new_contacts': new_contacts,
                'unsubscribed_contacts': 0,  # TODO: Track unsubscribes
                'estimated_cost': self._estimate_cost(emails_sent, sms_sent),
                'cost_breakdown': {
                    'email': emails_sent * 0.001,  # Example: $0.001 per email
                    'sms': sms_sent * 0.01         # Example: $0.01 per SMS
                }
            }
        
        return {
            'period': period,
            'start_date': start_date,
            'end_date': end_date,
            'emails_sent': usage.emails_sent,
            'email_limit': usage.email_limit,
            'email_usage_percentage': (usage.emails_sent / usage.email_limit) * 100 if usage.email_limit else 0,
            'sms_sent': usage.sms_sent,
            'sms_limit': usage.sms_limit,
            'sms_usage_percentage': (usage.sms_sent / usage.sms_limit) * 100 if usage.sms_limit else 0,
            'campaigns_created': usage.campaigns_created,
            'campaigns_sent': usage.campaigns_sent,
            'total_contacts': usage.total_contacts,
            'new_contacts': usage.new_contacts,
            'unsubscribed_contacts': usage.unsubscribed_contacts,
            'estimated_cost': usage.estimated_cost,
            'cost_breakdown': usage.cost_breakdown
        }
    
    def get_usage_limits(self, db: Session) -> Dict[str, Any]:
        """Get current usage limits and remaining quota"""
        # TODO: Get from billing/subscription service
        now = datetime.now(timezone.utc)
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        current_usage = self.get_usage_stats(db, 'current')
        
        return {
            'email': {
                'limit': current_usage['email_limit'],
                'used': current_usage['emails_sent'],
                'remaining': max(0, current_usage['email_limit'] - current_usage['emails_sent']),
                'reset_date': (start_date + timedelta(days=32)).replace(day=1).isoformat()
            },
            'sms': {
                'limit': current_usage['sms_limit'],
                'used': current_usage['sms_sent'],
                'remaining': max(0, current_usage['sms_limit'] - current_usage['sms_sent']),
                'reset_date': (start_date + timedelta(days=32)).replace(day=1).isoformat()
            },
            'contacts': {
                'limit': 50000,  # Example limit
                'used': current_usage['total_contacts'],
                'remaining': max(0, 50000 - current_usage['total_contacts'])
            }
        }
    
    def send_quick_message(self, db: Session, message_type: str, recipients: List[str],
                          subject: Optional[str], content: str, sent_by_id: int) -> Dict[str, Any]:
        """Send a quick marketing message without creating a campaign"""
        sent_count = 0
        failed_count = 0
        errors = []
        
        for recipient in recipients:
            try:
                if message_type == 'email':
                    result = self.notification_service.send_email(
                        to_email=recipient,
                        subject=subject,
                        body=content
                    )
                else:  # SMS
                    result = self.notification_service.send_sms(
                        to_phone=recipient,
                        message=content
                    )
                
                if result.get('success'):
                    sent_count += 1
                else:
                    failed_count += 1
                    errors.append({'recipient': recipient, 'error': result.get('error')})
                    
            except Exception as e:
                failed_count += 1
                errors.append({'recipient': recipient, 'error': str(e)})
        
        # Update usage stats
        self._update_usage_stats(db, message_type, sent_count)
        
        return {
            'success': sent_count > 0,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'errors': errors[:10]  # Limit error details
        }
    
    # Helper methods
    def _get_campaign_recipients(self, db: Session, campaign: MarketingCampaign,
                                test_mode: bool, test_recipients: Optional[List[str]]) -> List[Dict]:
        """Get recipients for a campaign"""
        if test_mode and test_recipients:
            # Test mode - convert test recipients to contact format
            recipients = []
            for recipient in test_recipients:
                if '@' in recipient:  # Email
                    recipients.append({'id': 0, 'email': recipient, 'name': 'Test User'})
                else:  # Phone
                    recipients.append({'id': 0, 'phone': recipient, 'name': 'Test User'})
            return recipients
        
        # Get contacts based on list or segment
        query = db.query(Client)
        
        if campaign.campaign_type == 'email':
            query = query.filter(Client.email_opt_in == True, Client.email.isnot(None))
        else:  # SMS
            query = query.filter(Client.sms_opt_in == True, Client.phone.isnot(None))
        
        if campaign.recipient_list_id:
            query = query.join(ContactListMember).filter(
                ContactListMember.list_id == campaign.recipient_list_id
            )
        
        if campaign.recipient_segment_id:
            segment = db.query(ContactSegment).filter(
                ContactSegment.id == campaign.recipient_segment_id
            ).first()
            if segment:
                query = self._apply_segment_criteria(query, segment.criteria)
        
        contacts = query.all()
        
        # Convert to recipient format
        recipients = []
        for contact in contacts:
            recipient = {
                'id': contact.id,
                'name': contact.name,
                'email': contact.email,
                'phone': contact.phone
            }
            recipients.append(recipient)
        
        return recipients
    
    def _apply_segment_criteria(self, query, criteria: Dict[str, Any]):
        """Apply segment criteria to a query"""
        # Example criteria structure:
        # {
        #   "conditions": [
        #     {"field": "last_appointment", "operator": "within_days", "value": 30},
        #     {"field": "total_spent", "operator": "greater_than", "value": 100}
        #   ],
        #   "logic": "AND"  # or "OR"
        # }
        
        if not criteria or 'conditions' not in criteria:
            return query
        
        conditions = criteria.get('conditions', [])
        logic = criteria.get('logic', 'AND')
        
        # TODO: Implement dynamic criteria application based on conditions
        # This is a simplified example
        for condition in conditions:
            field = condition.get('field')
            operator = condition.get('operator')
            value = condition.get('value')
            
            if field == 'last_appointment' and operator == 'within_days':
                cutoff_date = datetime.now(timezone.utc) - timedelta(days=value)
                # This would require joining with appointments table
                # query = query.filter(...)
        
        return query
    
    def _render_content(self, campaign: MarketingCampaign, recipient: Dict[str, Any], db: Session = None) -> str:
        """Render campaign content with recipient data"""
        content = campaign.content
        
        if campaign.template_id and db:
            template = db.query(MarketingTemplate).filter(
                MarketingTemplate.id == campaign.template_id
            ).first()
            if template:
                content = template.content
        
        # Render with Jinja2
        template_obj = Template(content)
        return template_obj.render(
            client_name=recipient.get('name', 'Valued Customer'),
            email=recipient.get('email', ''),
            phone=recipient.get('phone', ''),
            business_name='Six Figure Barber Shop',
            current_year=datetime.now().year
        )
    
    def _init_campaign_analytics(self, db: Session, campaign_id: int, recipient_count: int) -> CampaignAnalytics:
        """Initialize campaign analytics"""
        analytics = CampaignAnalytics(
            campaign_id=campaign_id,
            total_recipients=recipient_count,
            sent_count=0,
            delivered_count=0,
            opened_count=0,
            clicked_count=0,
            bounced_count=0,
            unsubscribed_count=0,
            spam_reports=0
        )
        db.add(analytics)
        db.commit()
        return analytics
    
    def _track_delivery(self, db: Session, campaign_id: int, recipient_id: int,
                       status: str, error: Optional[str] = None):
        """Track delivery status for a recipient"""
        # TODO: Implement delivery tracking table
    
    def _update_usage_stats(self, db: Session, message_type: str, count: int):
        """Update usage statistics"""
        now = datetime.now(timezone.utc)
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        usage = db.query(MarketingUsage).filter(
            MarketingUsage.period_start == start_date.date(),
            MarketingUsage.period_end == end_date.date()
        ).first()
        
        if not usage:
            usage = MarketingUsage(
                period_start=start_date.date(),
                period_end=end_date.date(),
                emails_sent=0,
                sms_sent=0,
                campaigns_created=0,
                campaigns_sent=0
            )
            db.add(usage)
        
        if message_type == 'email':
            usage.emails_sent += count
        else:
            usage.sms_sent += count
        
        db.commit()
    
    def _estimate_cost(self, emails_sent: int, sms_sent: int) -> float:
        """Estimate cost based on usage"""
        # Example pricing
        email_cost = emails_sent * 0.001  # $0.001 per email
        sms_cost = sms_sent * 0.01        # $0.01 per SMS
        return email_cost + sms_cost
    
    def _update_list_contact_count(self, db: Session, list_id: int):
        """Update contact count for a list"""
        count = db.query(ContactListMember).filter(
            ContactListMember.list_id == list_id
        ).count()
        
        contact_list = db.query(ContactList).filter(ContactList.id == list_id).first()
        if contact_list:
            contact_list.contact_count = count
            db.commit()
    
    def _update_segment_contact_count(self, db: Session, segment_id: int):
        """Update contact count for a segment"""
        segment = db.query(ContactSegment).filter(ContactSegment.id == segment_id).first()
        if segment:
            query = db.query(Client).filter(
                or_(Client.email_opt_in == True, Client.sms_opt_in == True)
            )
            query = self._apply_segment_criteria(query, segment.criteria)
            segment.contact_count = query.count()
            db.commit()
    
    def _load_campaign_analytics(self, db: Session, campaign: MarketingCampaign):
        """Load analytics data into campaign object"""
        analytics = db.query(CampaignAnalytics).filter(
            CampaignAnalytics.campaign_id == campaign.id
        ).first()
        
        if analytics:
            campaign.total_recipients = analytics.total_recipients
            campaign.sent_count = analytics.sent_count
            campaign.delivered_count = analytics.delivered_count
            campaign.opened_count = analytics.opened_count
            campaign.clicked_count = analytics.clicked_count
            campaign.bounced_count = analytics.bounced_count
            campaign.unsubscribed_count = analytics.unsubscribed_count