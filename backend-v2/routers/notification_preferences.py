from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import secrets
import hashlib
import logging

from database import get_db
from models import (
    NotificationPreferences, NotificationPreferenceAudit, UnsubscribeRequest,
    NotificationChannel
)
from models import User
from utils.auth import get_current_user
from schemas import NotificationPreferencesResponse, NotificationPreferencesUpdate
import pytz

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/notification-preferences", tags=["notification-preferences"])

def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def get_user_agent(request: Request) -> str:
    """Get user agent from request"""
    return request.headers.get("User-Agent", "unknown")

def audit_preference_change(
    db: Session, 
    preferences: NotificationPreferences, 
    field_name: str, 
    old_value: Any, 
    new_value: Any,
    reason: str = "user_update",
    ip_address: str = None,
    user_agent: str = None
):
    """Log preference changes for audit trail"""
    audit_log = NotificationPreferenceAudit(
        preferences_id=preferences.id,
        user_id=preferences.user_id,
        field_changed=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        change_reason=reason,
        changed_by_ip=ip_address,
        user_agent=user_agent
    )
    db.add(audit_log)

@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's notification preferences"""
    try:
        preferences = db.query(NotificationPreferences).filter(
            NotificationPreferences.user_id == current_user.id
        ).first()
        
        if not preferences:
            # Create default preferences for user
            preferences = NotificationPreferences(
                user_id=current_user.id,
                timezone=current_user.timezone or 'UTC',
                email_enabled=True,
                sms_enabled=bool(current_user.phone),  # Enable SMS only if phone number exists
                marketing_consent=False  # Default to false for GDPR compliance
            )
            db.add(preferences)
            db.commit()
            db.refresh(preferences)
            
            logger.info(f"Created default notification preferences for user {current_user.id}")
        
        return NotificationPreferencesResponse(**preferences.to_dict())
        
    except Exception as e:
        logger.error(f"Error fetching notification preferences for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notification preferences"
        )

@router.put("/preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    preferences_update: NotificationPreferencesUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's notification preferences"""
    try:
        preferences = db.query(NotificationPreferences).filter(
            NotificationPreferences.user_id == current_user.id
        ).first()
        
        if not preferences:
            # Create new preferences
            preferences = NotificationPreferences(user_id=current_user.id)
            db.add(preferences)
            db.flush()  # Get ID for audit logging
        
        # Get client info for audit
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)
        
        # Track changes for audit
        changes_made = []
        
        # Update preferences and log changes
        update_data = preferences_update.dict(exclude_unset=True)
        
        for field, new_value in update_data.items():
            if hasattr(preferences, field):
                old_value = getattr(preferences, field)
                if old_value != new_value:
                    setattr(preferences, field, new_value)
                    audit_preference_change(
                        db, preferences, field, old_value, new_value,
                        "user_update", ip_address, user_agent
                    )
                    changes_made.append(field)
        
        # Update timestamp
        preferences.last_updated_at = datetime.utcnow()
        
        # Special handling for nested preferences
        if hasattr(preferences_update, 'email_preferences') and preferences_update.email_preferences:
            for field, new_value in preferences_update.email_preferences.dict(exclude_unset=True).items():
                attr_name = f"email_{field}"
                if hasattr(preferences, attr_name):
                    old_value = getattr(preferences, attr_name)
                    if old_value != new_value:
                        setattr(preferences, attr_name, new_value)
                        audit_preference_change(
                            db, preferences, attr_name, old_value, new_value,
                            "user_update", ip_address, user_agent
                        )
                        changes_made.append(attr_name)
        
        if hasattr(preferences_update, 'sms_preferences') and preferences_update.sms_preferences:
            for field, new_value in preferences_update.sms_preferences.dict(exclude_unset=True).items():
                attr_name = f"sms_{field}"
                if hasattr(preferences, attr_name):
                    old_value = getattr(preferences, attr_name)
                    if old_value != new_value:
                        setattr(preferences, attr_name, new_value)
                        audit_preference_change(
                            db, preferences, attr_name, old_value, new_value,
                            "user_update", ip_address, user_agent
                        )
                        changes_made.append(attr_name)
        
        if hasattr(preferences_update, 'advanced_settings') and preferences_update.advanced_settings:
            for field, new_value in preferences_update.advanced_settings.dict(exclude_unset=True).items():
                if hasattr(preferences, field):
                    old_value = getattr(preferences, field)
                    if old_value != new_value:
                        setattr(preferences, field, new_value)
                        audit_preference_change(
                            db, preferences, field, old_value, new_value,
                            "user_update", ip_address, user_agent
                        )
                        changes_made.append(field)
        
        db.commit()
        db.refresh(preferences)
        
        logger.info(f"Updated notification preferences for user {current_user.id}, fields changed: {changes_made}")
        
        return NotificationPreferencesResponse(**preferences.to_dict())
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating notification preferences for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification preferences"
        )

@router.post("/unsubscribe", response_model=Dict[str, str])
async def one_click_unsubscribe(
    token: str,
    unsubscribe_type: str = "marketing_only",  # marketing_only, email_all, sms_all, all
    request: Request = None,
    db: Session = Depends(get_db)
):
    """One-click unsubscribe using token"""
    try:
        # Find preferences by unsubscribe token
        preferences = db.query(NotificationPreferences).filter(
            NotificationPreferences.unsubscribe_token == token
        ).first()
        
        if not preferences:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid unsubscribe token"
            )
        
        # Get user for email/phone
        user = db.query(User).filter(User.id == preferences.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get client info
        ip_address = get_client_ip(request) if request else None
        user_agent = get_user_agent(request) if request else None
        
        # Record unsubscribe request
        unsubscribe_request = UnsubscribeRequest(
            user_id=user.id,
            email_address=user.email,
            phone_number=user.phone,
            unsubscribe_type=unsubscribe_type,
            token_used=token,
            method="one_click",
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(unsubscribe_request)
        
        # Apply unsubscribe changes
        changes_made = []
        
        if unsubscribe_type == "marketing_only":
            if preferences.email_marketing:
                preferences.email_marketing = False
                changes_made.append("email_marketing")
            if preferences.sms_marketing:
                preferences.sms_marketing = False
                changes_made.append("sms_marketing")
            if preferences.email_promotional:
                preferences.email_promotional = False
                changes_made.append("email_promotional")
            if preferences.sms_promotional:
                preferences.sms_promotional = False
                changes_made.append("sms_promotional")
            if preferences.email_news_updates:
                preferences.email_news_updates = False
                changes_made.append("email_news_updates")
            preferences.marketing_consent = False
            changes_made.append("marketing_consent")
            
        elif unsubscribe_type == "email_all":
            preferences.email_enabled = False
            changes_made.append("email_enabled")
            
        elif unsubscribe_type == "sms_all":
            preferences.sms_enabled = False
            changes_made.append("sms_enabled")
            
        elif unsubscribe_type == "all":
            preferences.email_enabled = False
            preferences.sms_enabled = False
            preferences.marketing_consent = False
            changes_made.extend(["email_enabled", "sms_enabled", "marketing_consent"])
        
        # Audit the changes
        for field in changes_made:
            audit_preference_change(
                db, preferences, field, True, False,
                f"one_click_unsubscribe_{unsubscribe_type}", ip_address, user_agent
            )
        
        preferences.last_updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Processed one-click unsubscribe for user {user.id}, type: {unsubscribe_type}")
        
        return {
            "status": "success",
            "message": f"Successfully unsubscribed from {unsubscribe_type.replace('_', ' ')}",
            "unsubscribe_type": unsubscribe_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing unsubscribe for token {token}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process unsubscribe request"
        )

@router.get("/preference-center/{token}", response_class=HTMLResponse)
async def preference_center(
    token: str,
    db: Session = Depends(get_db)
):
    """Public preference center page"""
    try:
        # Find preferences by token
        preferences = db.query(NotificationPreferences).filter(
            NotificationPreferences.unsubscribe_token == token
        ).first()
        
        if not preferences:
            return HTMLResponse(
                content="""
                <html>
                <head><title>Invalid Link</title></head>
                <body>
                <h1>Invalid Link</h1>
                <p>The link you clicked is invalid or has expired.</p>
                </body>
                </html>
                """,
                status_code=404
            )
        
        # Get user info
        user = db.query(User).filter(User.id == preferences.user_id).first()
        if not user:
            return HTMLResponse(content="User not found", status_code=404)
        
        # Generate preference center HTML
        html_content = generate_preference_center_html(user, preferences, token)
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"Error serving preference center for token {token}: {str(e)}")
        return HTMLResponse(
            content="""
            <html>
            <head><title>Error</title></head>
            <body>
            <h1>Error</h1>
            <p>An error occurred while loading the preference center.</p>
            </body>
            </html>
            """,
            status_code=500
        )

@router.post("/preference-center/{token}")
async def update_preferences_public(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update preferences from public preference center"""
    try:
        # Find preferences by token
        preferences = db.query(NotificationPreferences).filter(
            NotificationPreferences.unsubscribe_token == token
        ).first()
        
        if not preferences:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid token"
            )
        
        # Get form data
        form_data = await request.form()
        
        # Get client info
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)
        
        # Update preferences based on form data
        changes_made = []
        
        # Email preferences
        email_enabled = form_data.get("email_enabled") == "on"
        if preferences.email_enabled != email_enabled:
            audit_preference_change(
                db, preferences, "email_enabled", preferences.email_enabled, email_enabled,
                "preference_center", ip_address, user_agent
            )
            preferences.email_enabled = email_enabled
            changes_made.append("email_enabled")
        
        # SMS preferences
        sms_enabled = form_data.get("sms_enabled") == "on"
        if preferences.sms_enabled != sms_enabled:
            audit_preference_change(
                db, preferences, "sms_enabled", preferences.sms_enabled, sms_enabled,
                "preference_center", ip_address, user_agent
            )
            preferences.sms_enabled = sms_enabled
            changes_made.append("sms_enabled")
        
        # Marketing consent
        marketing_consent = form_data.get("marketing_consent") == "on"
        if preferences.marketing_consent != marketing_consent:
            audit_preference_change(
                db, preferences, "marketing_consent", preferences.marketing_consent, marketing_consent,
                "preference_center", ip_address, user_agent
            )
            preferences.marketing_consent = marketing_consent
            changes_made.append("marketing_consent")
        
        # Update individual notification types
        notification_types = [
            "email_marketing", "email_promotional", "email_news_updates",
            "sms_marketing", "sms_promotional"
        ]
        
        for notification_type in notification_types:
            new_value = form_data.get(notification_type) == "on"
            old_value = getattr(preferences, notification_type, False)
            if old_value != new_value:
                audit_preference_change(
                    db, preferences, notification_type, old_value, new_value,
                    "preference_center", ip_address, user_agent
                )
                setattr(preferences, notification_type, new_value)
                changes_made.append(notification_type)
        
        preferences.last_updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Updated preferences via preference center for user {preferences.user_id}, changes: {changes_made}")
        
        # Redirect to success page
        return RedirectResponse(
            url=f"/api/v2/notification-preferences/preference-center/{token}?updated=true",
            status_code=303
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating preferences from preference center: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update preferences"
        )

@router.get("/channels", response_model=List[Dict[str, Any]])
async def get_notification_channels(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available notification channels"""
    try:
        channels = db.query(NotificationChannel).filter(
            NotificationChannel.is_active == True
        ).all()
        
        return [
            {
                "name": channel.name,
                "display_name": channel.display_name,
                "description": channel.description,
                "supports_marketing": channel.supports_marketing,
                "supports_transactional": channel.supports_transactional,
                "requires_consent": channel.requires_consent
            }
            for channel in channels
        ]
        
    except Exception as e:
        logger.error(f"Error fetching notification channels: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notification channels"
        )

@router.get("/audit-log")
async def get_preference_audit_log(
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's preference change audit log"""
    try:
        audit_logs = db.query(NotificationPreferenceAudit).filter(
            NotificationPreferenceAudit.user_id == current_user.id
        ).order_by(
            NotificationPreferenceAudit.changed_at.desc()
        ).limit(limit).all()
        
        return [
            {
                "field_changed": log.field_changed,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "change_reason": log.change_reason,
                "changed_at": log.changed_at.isoformat(),
                "changed_by_ip": log.changed_by_ip
            }
            for log in audit_logs
        ]
        
    except Exception as e:
        logger.error(f"Error fetching audit log for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch audit log"
        )

def generate_preference_center_html(user: User, preferences: NotificationPreferences, token: str) -> str:
    """Generate HTML for the preference center"""
    updated = "?updated=true" in token  # Simple check for update confirmation
    
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notification Preferences - BookedBarber</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }}
            .container {{
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid #eee;
            }}
            .logo {{
                width: 150px;
                height: auto;
                margin-bottom: 20px;
            }}
            h1 {{
                color: #333;
                margin: 0;
                font-size: 28px;
            }}
            .subtitle {{
                color: #666;
                margin: 10px 0 0 0;
                font-size: 16px;
            }}
            .section {{
                margin: 30px 0;
            }}
            .section h2 {{
                color: #333;
                font-size: 20px;
                margin-bottom: 15px;
                border-bottom: 2px solid #007bff;
                padding-bottom: 5px;
            }}
            .checkbox-group {{
                margin: 15px 0;
            }}
            .checkbox-item {{
                display: flex;
                align-items: center;
                margin: 10px 0;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 5px;
            }}
            .checkbox-item input[type="checkbox"] {{
                margin-right: 12px;
                transform: scale(1.2);
            }}
            .checkbox-item label {{
                cursor: pointer;
                flex: 1;
            }}
            .checkbox-item .description {{
                font-size: 14px;
                color: #666;
                margin-top: 5px;
            }}
            .button-group {{
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }}
            .btn {{
                background: #007bff;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin: 0 10px;
                text-decoration: none;
                display: inline-block;
            }}
            .btn:hover {{
                background: #0056b3;
            }}
            .btn-secondary {{
                background: #6c757d;
            }}
            .btn-secondary:hover {{
                background: #545b62;
            }}
            .alert {{
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }}
            .gdpr-notice {{
                background: #e9ecef;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                font-size: 14px;
                color: #495057;
            }}
            .quick-actions {{
                text-align: center;
                margin: 20px 0;
            }}
            .quick-actions a {{
                color: #007bff;
                text-decoration: none;
                margin: 0 10px;
                font-size: 14px;
            }}
            .quick-actions a:hover {{
                text-decoration: underline;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Notification Preferences</h1>
                <p class="subtitle">Manage how BookedBarber communicates with you</p>
                <p><strong>Email:</strong> {user.email}</p>
                {f'<p><strong>Phone:</strong> {user.phone}</p>' if user.phone else ''}
            </div>

            {'''<div class="alert">
                ✅ Your preferences have been updated successfully!
            </div>''' if updated else ''}

            <form method="POST" action="/api/v2/notification-preferences/preference-center/{token}">
                
                <div class="section">
                    <h2>Communication Channels</h2>
                    <div class="checkbox-group">
                        <div class="checkbox-item">
                            <input type="checkbox" id="email_enabled" name="email_enabled" 
                                   {'checked' if preferences.email_enabled else ''}>
                            <label for="email_enabled">
                                <strong>Email Notifications</strong>
                                <div class="description">Receive notifications via email</div>
                            </label>
                        </div>
                        {'<div class="checkbox-item"><input type="checkbox" id="sms_enabled" name="sms_enabled" ' + 
                         ('checked' if preferences.sms_enabled else '') + 
                         '><label for="sms_enabled"><strong>SMS Notifications</strong><div class="description">Receive notifications via text message</div></label></div>' 
                         if user.phone else ''}
                    </div>
                </div>

                <div class="section">
                    <h2>Marketing Communications</h2>
                    <div class="checkbox-group">
                        <div class="checkbox-item">
                            <input type="checkbox" id="marketing_consent" name="marketing_consent" 
                                   {'checked' if preferences.marketing_consent else ''}>
                            <label for="marketing_consent">
                                <strong>Marketing Consent</strong>
                                <div class="description">I consent to receive marketing communications</div>
                            </label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="email_marketing" name="email_marketing" 
                                   {'checked' if preferences.email_marketing else ''}>
                            <label for="email_marketing">
                                <strong>Marketing Emails</strong>
                                <div class="description">Promotions, special offers, and new services</div>
                            </label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="email_promotional" name="email_promotional" 
                                   {'checked' if preferences.email_promotional else ''}>
                            <label for="email_promotional">
                                <strong>Promotional Emails</strong>
                                <div class="description">Discounts and limited-time offers</div>
                            </label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="email_news_updates" name="email_news_updates" 
                                   {'checked' if preferences.email_news_updates else ''}>
                            <label for="email_news_updates">
                                <strong>News & Updates</strong>
                                <div class="description">Company news and feature updates</div>
                            </label>
                        </div>
                        {'''<div class="checkbox-item">
                            <input type="checkbox" id="sms_marketing" name="sms_marketing" ''' + 
                         ('checked' if preferences.sms_marketing else '') + 
                         '''>
                            <label for="sms_marketing">
                                <strong>Marketing SMS</strong>
                                <div class="description">Promotional text messages</div>
                            </label>
                        </div>''' if user.phone else ''}
                    </div>
                </div>

                <div class="quick-actions">
                    <a href="/api/v2/notification-preferences/unsubscribe?token={token}&unsubscribe_type=marketing_only">
                        Unsubscribe from marketing only
                    </a>
                    <a href="/api/v2/notification-preferences/unsubscribe?token={token}&unsubscribe_type=email_all">
                        Unsubscribe from all emails
                    </a>
                    <a href="/api/v2/notification-preferences/unsubscribe?token={token}&unsubscribe_type=all">
                        Unsubscribe from everything
                    </a>
                </div>

                <div class="gdpr-notice">
                    <strong>Your Privacy Rights:</strong> You can update these preferences at any time. 
                    We will only send you notifications you've consented to receive. 
                    Transactional messages (appointment confirmations, payment receipts) may still be sent 
                    as they are necessary for our service. For questions about our privacy practices, 
                    contact us at privacy@bookedbarber.com.
                </div>

                <div class="button-group">
                    <button type="submit" class="btn">Save Preferences</button>
                    <a href="https://app.bookedbarber.com" class="btn btn-secondary">Back to Dashboard</a>
                </div>
            </form>
        </div>
    </body>
    </html>
    """