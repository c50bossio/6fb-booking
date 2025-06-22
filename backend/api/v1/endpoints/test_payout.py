"""
Test endpoints for automated payout system
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from config.database import get_db
from models.compensation_plan import CompensationPlan, CommissionCalculation
from models.barber import Barber
from services.payout_scheduler import payout_scheduler
from api.v1.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/trigger-payout/{plan_id}")
async def trigger_test_payout(
    plan_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually trigger a payout for testing purposes"""
    try:
        # Get the compensation plan
        plan = db.query(CompensationPlan).filter(CompensationPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Compensation plan not found")
        
        # Verify plan has payout settings enabled
        if not plan.payout_settings or not plan.payout_settings.get('enabled'):
            raise HTTPException(
                status_code=400, 
                detail="Automated payouts not enabled for this plan"
            )
        
        # Trigger the payout manually
        payout_scheduler.process_payout(plan_id)
        
        return {
            "message": f"Test payout triggered for plan {plan_id}",
            "plan_name": plan.plan_name,
            "barber_id": plan.barber_id
        }
        
    except Exception as e:
        logger.error(f"Error triggering test payout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-test-commission/{plan_id}")
async def create_test_commission(
    plan_id: int,
    amount: float = 100.0,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a test commission entry for testing payouts"""
    try:
        # Get the compensation plan
        plan = db.query(CompensationPlan).filter(CompensationPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Compensation plan not found")
        
        # Create a test commission calculation
        commission = CommissionCalculation(
            compensation_plan_id=plan_id,
            barber_id=plan.barber_id,
            calculation_date=datetime.utcnow(),
            service_type="test_service",
            service_amount=amount,
            commission_rate=60.0,  # 60% commission
            commission_amount=amount * 0.6,
            bonus_amount=0,
            deduction_amount=amount * 0.029,  # 2.9% processing fee
            gross_commission=amount * 0.6,
            net_commission=(amount * 0.6) - (amount * 0.029),
            is_paid=False
        )
        
        db.add(commission)
        db.commit()
        db.refresh(commission)
        
        return {
            "message": "Test commission created successfully",
            "commission_id": commission.id,
            "net_commission": commission.net_commission,
            "ready_for_payout": True
        }
        
    except Exception as e:
        logger.error(f"Error creating test commission: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payout-status/{plan_id}")
async def get_payout_status(
    plan_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get payout status and unpaid commissions for a plan"""
    try:
        # Get the compensation plan
        plan = db.query(CompensationPlan).filter(CompensationPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Compensation plan not found")
        
        # Get barber details
        barber = db.query(Barber).filter(Barber.id == plan.barber_id).first()
        
        # Get unpaid commissions
        unpaid_commissions = db.query(CommissionCalculation).filter(
            CommissionCalculation.compensation_plan_id == plan_id,
            CommissionCalculation.is_paid == False
        ).all()
        
        total_unpaid = sum(c.net_commission for c in unpaid_commissions)
        
        return {
            "plan_id": plan_id,
            "plan_name": plan.plan_name,
            "barber_name": barber.name if barber else "Unknown",
            "payout_enabled": plan.payout_settings.get('enabled', False) if plan.payout_settings else False,
            "payout_method": plan.payout_settings.get('method') if plan.payout_settings else None,
            "payout_frequency": plan.payout_settings.get('frequency') if plan.payout_settings else None,
            "unpaid_commissions_count": len(unpaid_commissions),
            "total_unpaid_amount": total_unpaid,
            "stripe_connected": bool(barber.stripe_account_id) if barber else False,
            "ready_for_payout": total_unpaid > 0 and plan.payout_settings.get('enabled', False)
        }
        
    except Exception as e:
        logger.error(f"Error getting payout status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduler-status")
async def get_scheduler_status(
    current_user=Depends(get_current_user)
):
    """Get the status of the payout scheduler"""
    try:
        is_running = payout_scheduler.scheduler.running if payout_scheduler.scheduler else False
        
        # Get scheduled jobs
        jobs = []
        if payout_scheduler.scheduler:
            for job in payout_scheduler.scheduler.get_jobs():
                jobs.append({
                    "id": job.id,
                    "name": job.name,
                    "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
                    "trigger": str(job.trigger)
                })
        
        return {
            "scheduler_running": is_running,
            "scheduled_jobs_count": len(jobs),
            "scheduled_jobs": jobs
        }
        
    except Exception as e:
        logger.error(f"Error getting scheduler status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-email")
async def test_email_configuration(
    test_data: dict,  # {"email": "test@example.com"}
    current_user=Depends(get_current_user)
):
    """Test email configuration by sending a test email"""
    try:
        from services.notification_service import NotificationService
        
        notification_service = NotificationService()
        test_email = test_data.get("email", "test@example.com")
        
        subject = "6FB Test Email - Payout System Configuration"
        message = f"""
Hi there!

This is a test email from your 6FB automated payout system.

If you're receiving this email, your SMTP configuration is working correctly! ✅

Test Details:
- Sent at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
- From: {notification_service.from_email}
- SMTP Server: {notification_service.smtp_server}
- SMTP Port: {notification_service.smtp_port}

Your automated payout notifications will be sent from this email address.

Best regards,
6FB Automated Payout System
        """
        
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">6FB Test Email</h1>
                <p style="color: white; margin: 5px 0 0 0;">Payout System Configuration</p>
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd; border-radius: 0 0 10px 10px;">
                <p>Hi there!</p>
                
                <p>This is a test email from your <strong>6FB automated payout system</strong>.</p>
                
                <div style="background: #f0f8ff; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #2e7d32;">
                        ✅ <strong>Success!</strong> If you're receiving this email, your SMTP configuration is working correctly!
                    </p>
                </div>
                
                <h3>Test Details:</h3>
                <ul>
                    <li><strong>Sent at:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</li>
                    <li><strong>From:</strong> {notification_service.from_email}</li>
                    <li><strong>SMTP Server:</strong> {notification_service.smtp_server}</li>
                    <li><strong>SMTP Port:</strong> {notification_service.smtp_port}</li>
                </ul>
                
                <p>Your automated payout notifications will be sent from this email address.</p>
                
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="color: #666; font-size: 14px;">
                    Best regards,<br>
                    <strong>6FB Automated Payout System</strong>
                </p>
            </div>
        </body>
        </html>
        """
        
        success = notification_service.send_email(
            to_email=test_email,
            subject=subject,
            message=message,
            html_message=html_message
        )
        
        if success:
            return {
                "success": True,
                "message": f"Test email sent successfully to {test_email}",
                "smtp_server": notification_service.smtp_server,
                "from_email": notification_service.from_email
            }
        else:
            return {
                "success": False,
                "message": "Failed to send test email. Check your SMTP configuration.",
                "smtp_configured": bool(notification_service.smtp_username and notification_service.smtp_password)
            }
        
    except Exception as e:
        logger.error(f"Error testing email configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/configuration-status")
async def get_configuration_status(
    current_user=Depends(get_current_user)
):
    """Get the status of all system configurations"""
    try:
        import os
        from services.notification_service import NotificationService
        
        notification_service = NotificationService()
        
        # Check environment variables
        config_status = {
            "database": {
                "configured": bool(os.getenv("DATABASE_URL")),
                "url": os.getenv("DATABASE_URL", "Not configured")[:50] + "..." if os.getenv("DATABASE_URL") else "Not configured"
            },
            "jwt": {
                "configured": bool(os.getenv("SECRET_KEY")),
                "algorithm": os.getenv("ALGORITHM", "HS256")
            },
            "stripe": {
                "secret_key_configured": bool(os.getenv("STRIPE_SECRET_KEY")),
                "publishable_key_configured": bool(os.getenv("STRIPE_PUBLISHABLE_KEY")),
                "connect_client_id_configured": bool(os.getenv("STRIPE_CONNECT_CLIENT_ID")),
                "webhook_secret_configured": bool(os.getenv("STRIPE_WEBHOOK_SECRET")),
                "environment": "live" if os.getenv("STRIPE_SECRET_KEY", "").startswith("sk_live_") else "test"
            },
            "email": {
                "smtp_server": notification_service.smtp_server,
                "smtp_port": notification_service.smtp_port,
                "username_configured": bool(notification_service.smtp_username),
                "password_configured": bool(notification_service.smtp_password),
                "from_email": notification_service.from_email
            },
            "scheduler": {
                "running": payout_scheduler.scheduler.running if payout_scheduler.scheduler else False,
                "jobs_count": len(payout_scheduler.scheduler.get_jobs()) if payout_scheduler.scheduler else 0
            },
            "environment": {
                "env": os.getenv("ENVIRONMENT", "development"),
                "debug": os.getenv("DEBUG", "true").lower() == "true"
            }
        }
        
        # Calculate overall readiness
        critical_configs = [
            config_status["database"]["configured"],
            config_status["jwt"]["configured"],
            config_status["stripe"]["secret_key_configured"],
            config_status["stripe"]["connect_client_id_configured"]
        ]
        
        optional_configs = [
            config_status["email"]["username_configured"],
            config_status["stripe"]["webhook_secret_configured"]
        ]
        
        readiness = {
            "production_ready": all(critical_configs + optional_configs),
            "basic_ready": all(critical_configs),
            "missing_critical": [name for name, status in zip(
                ["Database", "JWT Secret", "Stripe Secret Key", "Stripe Connect ID"], 
                critical_configs
            ) if not status],
            "missing_optional": [name for name, status in zip(
                ["Email SMTP", "Stripe Webhooks"], 
                optional_configs
            ) if not status]
        }
        
        return {
            "configuration": config_status,
            "readiness": readiness
        }
        
    except Exception as e:
        logger.error(f"Error getting configuration status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))