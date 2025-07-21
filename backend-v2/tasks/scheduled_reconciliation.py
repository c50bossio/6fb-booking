"""
Scheduled Payment Reconciliation Tasks

Provides automated background tasks for payment reconciliation with Stripe.
Should be run via cron jobs or task scheduler for production deployments.

Usage:
    python tasks/scheduled_reconciliation.py --daily
    python tasks/scheduled_reconciliation.py --weekly
    python tasks/scheduled_reconciliation.py --emergency
"""

import asyncio
import argparse
import logging
from datetime import datetime, timedelta
import sys
import os

# Add the parent directory to the path so we can import from services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from services.payment_reconciliation import PaymentReconciliationService, run_emergency_reconciliation
from config import settings
from utils.logging_config import get_audit_logger

logger = logging.getLogger(__name__)
financial_audit_logger = get_audit_logger()


async def daily_reconciliation_task():
    """
    Daily reconciliation task - should be run every day at 2 AM
    """
    logger.info("Starting daily payment reconciliation task")
    
    db = next(get_db())
    try:
        reconciliation_service = PaymentReconciliationService(db)
        
        # Run reconciliation for yesterday
        summary = await reconciliation_service.run_daily_reconciliation()
        
        logger.info(f"Daily reconciliation completed: {summary.matches} matches, {summary.discrepancies} discrepancies")
        
        # If there are critical issues, run emergency notification
        if summary.critical_issues > 0:
            logger.critical(f"URGENT: {summary.critical_issues} critical payment discrepancies found during daily reconciliation")
            await send_critical_alert(summary)
        
        return summary
        
    except Exception as e:
        logger.error(f"Daily reconciliation task failed: {e}")
        raise
    finally:
        db.close()


async def weekly_reconciliation_task():
    """
    Weekly comprehensive reconciliation task - run every Sunday
    """
    logger.info("Starting weekly comprehensive reconciliation task")
    
    db = next(get_db())
    try:
        reconciliation_service = PaymentReconciliationService(db)
        
        # Run reconciliation for the past 7 days
        end_date = datetime.utcnow() - timedelta(days=1)  # Yesterday
        start_date = end_date - timedelta(days=6)  # 7 days total
        
        results = await reconciliation_service.reconcile_payments_by_date_range(
            start_date=start_date,
            end_date=end_date,
            max_payments=5000  # Higher limit for weekly reconciliation
        )
        
        # Analyze results
        total_checked = len(results)
        discrepancies = [r for r in results if not r.matches]
        critical_issues = [r for r in results if r.action_required == "urgent"]
        
        logger.info(f"Weekly reconciliation completed: {total_checked} payments checked, {len(discrepancies)} discrepancies")
        
        # Log comprehensive summary
        financial_audit_logger.log_financial_transaction(
            user_id="system",
            transaction_type="weekly_reconciliation",
            amount=0.0,
            currency="USD",
            payment_method="scheduled_reconciliation",
            order_id=f"weekly_reconciliation_{datetime.utcnow().strftime('%Y%m%d')}",
            order_type="system_reconciliation",
            metadata={
                "total_payments_checked": total_checked,
                "discrepancies_found": len(discrepancies),
                "critical_issues": len(critical_issues),
                "date_range": f"{start_date.date()} to {end_date.date()}",
                "reconciliation_type": "weekly_comprehensive"
            }
        )
        
        if critical_issues:
            logger.critical(f"URGENT: {len(critical_issues)} critical issues found in weekly reconciliation")
            await send_critical_alert_weekly(critical_issues)
        
        return results
        
    except Exception as e:
        logger.error(f"Weekly reconciliation task failed: {e}")
        raise
    finally:
        db.close()


async def emergency_reconciliation_task(payment_ids: list = None):
    """
    Emergency reconciliation task - run immediately for specific payments or recent failures
    """
    logger.info("Starting emergency reconciliation task")
    
    db = next(get_db())
    try:
        if payment_ids:
            # Reconcile specific payments
            results = await run_emergency_reconciliation(db, payment_ids)
            logger.info(f"Emergency reconciliation completed for {len(results)} specific payments")
        else:
            # Reconcile unreconciled payments from last 24 hours
            reconciliation_service = PaymentReconciliationService(db)
            unreconciled = reconciliation_service.get_unreconciled_payments(days_back=1)
            
            if not unreconciled:
                logger.info("No unreconciled payments found for emergency reconciliation")
                return []
            
            results = []
            for payment in unreconciled:
                result = await reconciliation_service.reconcile_single_payment(payment)
                results.append(result)
            
            discrepancies = [r for r in results if not r.matches]
            logger.info(f"Emergency reconciliation completed: {len(results)} payments, {len(discrepancies)} discrepancies")
        
        return results
        
    except Exception as e:
        logger.error(f"Emergency reconciliation task failed: {e}")
        raise
    finally:
        db.close()


async def send_critical_alert(summary):
    """Send critical alert for daily reconciliation issues"""
    try:
        # Log critical alert
        logger.critical(f"CRITICAL PAYMENT ALERT: {summary.critical_issues} urgent discrepancies found")
        
        # In production, this would send email/SMS alerts to finance team
        # For now, just log the alert details
        financial_audit_logger.log_financial_transaction(
            user_id="system",
            transaction_type="critical_payment_alert",
            amount=0.0,
            currency="USD",
            payment_method="alert_system",
            order_id=f"critical_alert_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            order_type="critical_alert",
            metadata={
                "alert_type": "daily_reconciliation_critical",
                "critical_issues_count": summary.critical_issues,
                "total_discrepancies": summary.discrepancies,
                "total_payments_checked": summary.total_payments_checked,
                "reconciliation_date": summary.reconciliation_date.isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to send critical alert: {e}")


async def send_critical_alert_weekly(critical_issues):
    """Send critical alert for weekly reconciliation issues"""
    try:
        logger.critical(f"WEEKLY CRITICAL ALERT: {len(critical_issues)} urgent payment discrepancies")
        
        # Log first few critical issues for immediate attention
        for issue in critical_issues[:3]:  # First 3 critical issues
            logger.critical(f"Payment {issue.local_payment_id}: {issue.discrepancies}")
        
    except Exception as e:
        logger.error(f"Failed to send weekly critical alert: {e}")


def setup_logging():
    """Setup logging for scheduled tasks"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(f'logs/reconciliation_{datetime.now().strftime("%Y%m%d")}.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )


async def main():
    """Main entry point for scheduled reconciliation tasks"""
    parser = argparse.ArgumentParser(description='Run payment reconciliation tasks')
    parser.add_argument('--daily', action='store_true', help='Run daily reconciliation')
    parser.add_argument('--weekly', action='store_true', help='Run weekly comprehensive reconciliation')
    parser.add_argument('--emergency', action='store_true', help='Run emergency reconciliation')
    parser.add_argument('--payment-ids', nargs='+', type=int, help='Specific payment IDs for emergency reconciliation')
    
    args = parser.parse_args()
    
    setup_logging()
    
    if not any([args.daily, args.weekly, args.emergency]):
        logger.error("No reconciliation type specified. Use --daily, --weekly, or --emergency")
        sys.exit(1)
    
    try:
        if args.daily:
            summary = await daily_reconciliation_task()
            print(f"✅ Daily reconciliation completed: {summary.matches} matches, {summary.discrepancies} discrepancies")
            
        elif args.weekly:
            results = await weekly_reconciliation_task()
            discrepancies = len([r for r in results if not r.matches])
            print(f"✅ Weekly reconciliation completed: {len(results)} payments, {discrepancies} discrepancies")
            
        elif args.emergency:
            results = await emergency_reconciliation_task(args.payment_ids)
            discrepancies = len([r for r in results if not r.matches])
            print(f"✅ Emergency reconciliation completed: {len(results)} payments, {discrepancies} discrepancies")
    
    except Exception as e:
        logger.error(f"Reconciliation task failed: {e}")
        print(f"❌ Reconciliation task failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())