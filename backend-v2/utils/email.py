"""
Email utility functions for trial notifications and other business emails.
"""

import logging
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)


def send_trial_expiration_email(
    email: str,
    name: str,
    organization_name: str,
    days_remaining: int,
    chairs_count: int
) -> bool:
    """
    Send trial expiration warning email.
    
    Args:
        email: Recipient email address
        name: Recipient name
        organization_name: Organization name
        days_remaining: Days until trial expires
        chairs_count: Number of chairs in organization
        
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        from services.notification_service import NotificationService
        from config import settings
        
        notification_service = NotificationService()
        
        # Calculate estimated monthly cost for context
        from utils.pricing import calculate_progressive_price
        pricing = calculate_progressive_price(chairs_count)
        monthly_cost = pricing['monthly_total']
        
        # Get frontend URL
        base_url = getattr(settings, 'frontend_url', "http://localhost:3000")
        billing_url = f"{base_url}/billing"
        
        # Prepare context for template
        context = {
            "user_name": name,
            "organization_name": organization_name,
            "days_remaining": days_remaining,
            "chairs_count": chairs_count,
            "monthly_cost": monthly_cost,
            "billing_url": billing_url,
            "trial_end_date": "in " + str(days_remaining) + " day" + ("s" if days_remaining != 1 else "")
        }
        
        # Use email templates
        template_dir = Path(__file__).parent.parent / "templates" / "notifications"
        
        # Try to read HTML template
        html_template = None
        html_path = template_dir / "trial_expiration_warning.html"
        if html_path.exists():
            html_template = html_path.read_text()
        
        # Fallback HTML template
        if not html_template:
            html_template = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Trial Expiring Soon - BookedBarber</title>
            </head>
            <body>
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <h2>Hi {{{{ user_name }}}},</h2>
                    
                    <p>Your BookedBarber trial for <strong>{{{{ organization_name }}}}</strong> expires {{{{ trial_end_date }}}}.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Your Current Setup:</h3>
                        <ul>
                            <li>{{{{ chairs_count }}}} chair{{{{ 's' if chairs_count != 1 else '' }}}}</li>
                            <li>Monthly cost after trial: ${{{{ monthly_cost }}}}</li>
                        </ul>
                    </div>
                    
                    <p>To continue using BookedBarber without interruption, please add your payment method:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{{{ billing_url }}}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                            Add Payment Method
                        </a>
                    </div>
                    
                    <p>Questions? Reply to this email and we'll help you out.</p>
                    
                    <p>Best regards,<br>The BookedBarber Team</p>
                </div>
            </body>
            </html>
            """
        
        # Send email
        notification_service.send_email(
            to_email=email,
            subject=f"Trial expires {context['trial_end_date']} - BookedBarber",
            html_content=html_template,
            template_data=context
        )
        
        logger.info(f"Trial expiration warning sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send trial expiration email to {email}: {str(e)}")
        return False


def send_trial_expired_email(
    email: str,
    name: str,
    organization_name: str,
    chairs_count: int
) -> bool:
    """
    Send trial expired notification email.
    
    Args:
        email: Recipient email address
        name: Recipient name
        organization_name: Organization name
        chairs_count: Number of chairs in organization
        
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        from services.notification_service import NotificationService
        from config import settings
        
        notification_service = NotificationService()
        
        # Calculate monthly cost for context
        from utils.pricing import calculate_progressive_price
        pricing = calculate_progressive_price(chairs_count)
        monthly_cost = pricing['monthly_total']
        
        # Get frontend URL
        base_url = getattr(settings, 'frontend_url', "http://localhost:3000")
        billing_url = f"{base_url}/billing"
        
        # Prepare context for template
        context = {
            "user_name": name,
            "organization_name": organization_name,
            "chairs_count": chairs_count,
            "monthly_cost": monthly_cost,
            "billing_url": billing_url
        }
        
        # Use email templates
        template_dir = Path(__file__).parent.parent / "templates" / "notifications"
        
        # Try to read HTML template
        html_template = None
        html_path = template_dir / "trial_expired.html"
        if html_path.exists():
            html_template = html_path.read_text()
        
        # Fallback HTML template
        if not html_template:
            html_template = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Trial Expired - BookedBarber</title>
            </head>
            <body>
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <h2>Hi {{{{ user_name }}}},</h2>
                    
                    <p>Your BookedBarber trial for <strong>{{{{ organization_name }}}}</strong> has expired.</p>
                    
                    <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>⚠️ Account Temporarily Suspended</h3>
                        <p>Your booking system is temporarily unavailable. To reactivate your account and resume taking bookings:</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Reactivate Your Account:</h3>
                        <ul>
                            <li>{{{{ chairs_count }}}} chair{{{{ 's' if chairs_count != 1 else '' }}}}</li>
                            <li>Monthly cost: ${{{{ monthly_cost }}}}</li>
                            <li>Instant reactivation upon payment</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{{{ billing_url }}}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                            Reactivate Account
                        </a>
                    </div>
                    
                    <p><strong>All your data is safe</strong> - appointments, clients, and settings are preserved and will be immediately available when you reactivate.</p>
                    
                    <p>Questions? Reply to this email and we'll help you out.</p>
                    
                    <p>Best regards,<br>The BookedBarber Team</p>
                </div>
            </body>
            </html>
            """
        
        # Send email
        notification_service.send_email(
            to_email=email,
            subject=f"Trial Expired - Reactivate {organization_name} - BookedBarber",
            html_content=html_template,
            template_data=context
        )
        
        logger.info(f"Trial expired notification sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send trial expired email to {email}: {str(e)}")
        return False


def send_subscription_activated_email(
    email: str,
    name: str,
    organization_name: str,
    chairs_count: int,
    monthly_cost: float
) -> bool:
    """
    Send subscription activated confirmation email.
    
    Args:
        email: Recipient email address
        name: Recipient name
        organization_name: Organization name
        chairs_count: Number of chairs
        monthly_cost: Monthly subscription cost
        
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        from services.notification_service import NotificationService
        from config import settings
        
        notification_service = NotificationService()
        
        # Get frontend URL
        base_url = getattr(settings, 'frontend_url', "http://localhost:3000")
        dashboard_url = f"{base_url}/dashboard"
        
        # Prepare context for template
        context = {
            "user_name": name,
            "organization_name": organization_name,
            "chairs_count": chairs_count,
            "monthly_cost": monthly_cost,
            "dashboard_url": dashboard_url
        }
        
        # Fallback HTML template
        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Welcome to BookedBarber - Subscription Activated</title>
        </head>
        <body>
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <h2>Welcome to BookedBarber, {{{{ user_name }}}}!</h2>
                
                <p>🎉 Your subscription for <strong>{{{{ organization_name }}}}</strong> is now active!</p>
                
                <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>✅ Your Account is Active</h3>
                    <ul>
                        <li>{{{{ chairs_count }}}} chair{{{{ 's' if chairs_count != 1 else '' }}}} - ${{{{ monthly_cost }}}}/month</li>
                        <li>Online booking system active</li>
                        <li>All features unlocked</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{{{ dashboard_url }}}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        Go to Dashboard
                    </a>
                </div>
                
                <p>Your booking system is now live and ready to accept appointments. Start taking bookings today!</p>
                
                <p>Need help getting started? Reply to this email and we'll guide you through the setup.</p>
                
                <p>Best regards,<br>The BookedBarber Team</p>
            </div>
        </body>
        </html>
        """
        
        # Send email
        notification_service.send_email(
            to_email=email,
            subject=f"🎉 {organization_name} is now live on BookedBarber!",
            html_content=html_template,
            template_data=context
        )
        
        logger.info(f"Subscription activated email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send subscription activated email to {email}: {str(e)}")
        return False