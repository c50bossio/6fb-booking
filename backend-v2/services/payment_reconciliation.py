"""
Payment Reconciliation Service for BookedBarber V2

Provides automated daily reconciliation between local database records and Stripe records.
Essential for detecting discrepancies, failed payments, and ensuring financial accuracy.

CRITICAL FEATURES:
- Daily automated reconciliation with Stripe
- Discrepancy detection and alerting  
- Manual reconciliation tools
- Comprehensive audit logging
- Real-time monitoring capabilities
"""

import stripe
import logging
from sqlalchemy.orm import Session
from models import Payment, Refund, Payout
from config import settings
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from decimal import Decimal
from dataclasses import dataclass, asdict
from utils.logging_config import get_audit_logger
from services.payment_security import audit_logger

# Configure Stripe
stripe.api_key = settings.stripe_secret_key

logger = logging.getLogger(__name__)
financial_audit_logger = get_audit_logger()


@dataclass
class ReconciliationResult:
    """Result of payment reconciliation check"""
    local_payment_id: int
    stripe_payment_intent_id: str
    local_status: str
    stripe_status: str
    local_amount: Decimal
    stripe_amount: Decimal
    matches: bool
    discrepancies: List[str]
    action_required: str  # none, review, urgent
    last_updated: datetime


@dataclass
class ReconciliationSummary:
    """Summary of reconciliation run"""
    total_payments_checked: int
    matches: int
    discrepancies: int
    critical_issues: int
    processing_time_seconds: float
    reconciliation_date: datetime
    date_range_start: datetime
    date_range_end: datetime
    stripe_api_calls: int
    errors_encountered: int


class PaymentReconciliationService:
    """Automated payment reconciliation with Stripe"""
    
    def __init__(self, db: Session):
        self.db = db
        
    async def run_daily_reconciliation(
        self, 
        date: Optional[datetime] = None,
        max_payments: int = 1000
    ) -> ReconciliationSummary:
        """
        Run comprehensive daily reconciliation
        
        Args:
            date: Date to reconcile (defaults to yesterday)
            max_payments: Maximum payments to check (safety limit)
            
        Returns:
            ReconciliationSummary with results
        """
        start_time = datetime.utcnow()
        
        # Default to yesterday's payments
        if not date:
            date = datetime.utcnow() - timedelta(days=1)
        
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        logger.info(f"Starting daily reconciliation for {date_start.date()}")
        
        # Get payments to reconcile
        payments_to_check = self.db.query(Payment).filter(
            Payment.created_at >= date_start,
            Payment.created_at <= date_end,
            Payment.stripe_payment_intent_id.isnot(None)
        ).limit(max_payments).all()
        
        summary = ReconciliationSummary(
            total_payments_checked=len(payments_to_check),
            matches=0,
            discrepancies=0,
            critical_issues=0,
            processing_time_seconds=0,
            reconciliation_date=datetime.utcnow(),
            date_range_start=date_start,
            date_range_end=date_end,
            stripe_api_calls=0,
            errors_encountered=0
        )
        
        results = []
        
        try:
            for payment in payments_to_check:
                try:
                    result = await self.reconcile_single_payment(payment)
                    results.append(result)
                    
                    if result.matches:
                        summary.matches += 1
                    else:
                        summary.discrepancies += 1
                        if result.action_required == "urgent":
                            summary.critical_issues += 1
                    
                    summary.stripe_api_calls += 1
                    
                except Exception as e:
                    logger.error(f"Error reconciling payment {payment.id}: {e}")
                    summary.errors_encountered += 1
            
            # Calculate processing time
            end_time = datetime.utcnow()
            summary.processing_time_seconds = (end_time - start_time).total_seconds()
            
            # Log summary
            self._log_reconciliation_summary(summary, results)
            
            # Send alerts if needed
            await self._handle_critical_discrepancies(results)
            
            logger.info(f"Reconciliation complete: {summary.matches} matches, {summary.discrepancies} discrepancies")
            
            return summary
            
        except Exception as e:
            logger.error(f"Critical error in daily reconciliation: {e}")
            summary.errors_encountered += 1
            raise
    
    async def reconcile_single_payment(self, payment: Payment) -> ReconciliationResult:
        """
        Reconcile a single payment with Stripe records
        
        Args:
            payment: Local payment record
            
        Returns:
            ReconciliationResult with comparison details
        """
        try:
            # Fetch Stripe payment intent
            stripe_intent = stripe.PaymentIntent.retrieve(payment.stripe_payment_intent_id)
            
            # Convert Stripe amount from cents to dollars
            stripe_amount = Decimal(str(stripe_intent.amount)) / Decimal('100')
            local_amount = Decimal(str(payment.amount))
            
            # Check for discrepancies
            discrepancies = []
            matches = True
            action_required = "none"
            
            # Status comparison
            if payment.status != self._map_stripe_status(stripe_intent.status):
                discrepancies.append(f"Status mismatch: local='{payment.status}', stripe='{stripe_intent.status}'")
                matches = False
                action_required = "review"
            
            # Amount comparison (allow for small rounding differences)
            amount_diff = abs(local_amount - stripe_amount)
            if amount_diff > Decimal('0.01'):  # More than 1 cent difference
                discrepancies.append(f"Amount mismatch: local={local_amount}, stripe={stripe_amount}")
                matches = False
                action_required = "urgent" if amount_diff > Decimal('1.00') else "review"
            
            # Check payment method
            expected_payment_method = stripe_intent.payment_method
            if not expected_payment_method and payment.status == "completed":
                discrepancies.append("Completed payment missing payment method in Stripe")
                matches = False
                action_required = "review"
            
            result = ReconciliationResult(
                local_payment_id=payment.id,
                stripe_payment_intent_id=payment.stripe_payment_intent_id,
                local_status=payment.status,
                stripe_status=stripe_intent.status,
                local_amount=local_amount,
                stripe_amount=stripe_amount,
                matches=matches,
                discrepancies=discrepancies,
                action_required=action_required,
                last_updated=datetime.utcnow()
            )
            
            # Log result if there are discrepancies
            if not matches:
                self._log_payment_discrepancy(payment, stripe_intent, discrepancies)
            
            return result
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe API error for payment {payment.id}: {e}")
            return ReconciliationResult(
                local_payment_id=payment.id,
                stripe_payment_intent_id=payment.stripe_payment_intent_id,
                local_status=payment.status,
                stripe_status="api_error",
                local_amount=Decimal(str(payment.amount)),
                stripe_amount=Decimal('0'),
                matches=False,
                discrepancies=[f"Stripe API error: {str(e)}"],
                action_required="urgent",
                last_updated=datetime.utcnow()
            )
    
    def _map_stripe_status(self, stripe_status: str) -> str:
        """Map Stripe payment intent status to our local status"""
        status_mapping = {
            'succeeded': 'completed',
            'processing': 'pending', 
            'requires_payment_method': 'pending',
            'requires_confirmation': 'pending',
            'requires_action': 'pending',
            'canceled': 'cancelled',
            'payment_failed': 'failed'
        }
        return status_mapping.get(stripe_status, stripe_status)
    
    def _log_payment_discrepancy(
        self, 
        payment: Payment, 
        stripe_intent: Any, 
        discrepancies: List[str]
    ):
        """Log payment discrepancy for audit trail"""
        financial_audit_logger.log_financial_transaction(
            user_id=str(payment.user_id),
            transaction_type="reconciliation_discrepancy",
            amount=float(payment.amount),
            currency="USD",
            payment_method="stripe",
            order_id=f"payment_{payment.id}",
            order_type="discrepancy_alert",
            metadata={
                "local_payment_id": payment.id,
                "stripe_intent_id": payment.stripe_payment_intent_id,
                "discrepancies": discrepancies,
                "local_status": payment.status,
                "stripe_status": stripe_intent.status,
                "local_amount": float(payment.amount),
                "stripe_amount": stripe_intent.amount / 100,
                "reconciliation_timestamp": datetime.utcnow().isoformat()
            }
        )
        
        # Also log as security event if amount discrepancy
        if any("Amount mismatch" in d for d in discrepancies):
            audit_logger.log_security_violation(
                payment.user_id, 
                "payment_amount_discrepancy",
                f"Payment {payment.id} amount mismatch with Stripe: {discrepancies}"
            )
    
    def _log_reconciliation_summary(
        self, 
        summary: ReconciliationSummary, 
        results: List[ReconciliationResult]
    ):
        """Log reconciliation summary for reporting"""
        critical_issues = [r for r in results if r.action_required == "urgent"]
        
        financial_audit_logger.log_financial_transaction(
            user_id="system",
            transaction_type="daily_reconciliation",
            amount=0.0,
            currency="USD",
            payment_method="reconciliation",
            order_id=f"reconciliation_{summary.reconciliation_date.strftime('%Y%m%d')}",
            order_type="system_reconciliation",
            metadata={
                **asdict(summary),
                "critical_issues_count": len(critical_issues),
                "critical_issues": [asdict(issue) for issue in critical_issues[:5]]  # First 5 critical issues
            }
        )
    
    async def _handle_critical_discrepancies(self, results: List[ReconciliationResult]):
        """Handle critical discrepancies that need immediate attention"""
        urgent_issues = [r for r in results if r.action_required == "urgent"]
        
        if urgent_issues:
            logger.critical(f"URGENT: {len(urgent_issues)} critical payment discrepancies found")
            
            # Log each urgent issue
            for issue in urgent_issues:
                logger.critical(
                    f"CRITICAL DISCREPANCY - Payment {issue.local_payment_id}: {issue.discrepancies}"
                )
                
                # Log security event for high-value discrepancies
                if issue.local_amount > Decimal('100.00'):
                    audit_logger.log_security_violation(
                        None, "high_value_payment_discrepancy",
                        f"High-value payment discrepancy detected: ${issue.local_amount}"
                    )
    
    async def reconcile_payments_by_date_range(
        self, 
        start_date: datetime, 
        end_date: datetime,
        max_payments: int = 500
    ) -> List[ReconciliationResult]:
        """
        Reconcile payments within a specific date range
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            max_payments: Maximum payments to process
            
        Returns:
            List of ReconciliationResults
        """
        payments = self.db.query(Payment).filter(
            Payment.created_at >= start_date,
            Payment.created_at <= end_date,
            Payment.stripe_payment_intent_id.isnot(None)
        ).limit(max_payments).all()
        
        results = []
        for payment in payments:
            try:
                result = await self.reconcile_single_payment(payment)
                results.append(result)
            except Exception as e:
                logger.error(f"Error reconciling payment {payment.id}: {e}")
        
        return results
    
    def get_unreconciled_payments(self, days_back: int = 7) -> List[Payment]:
        """
        Get payments that haven't been reconciled recently
        
        Args:
            days_back: How many days to look back
            
        Returns:
            List of payments needing reconciliation
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        return self.db.query(Payment).filter(
            Payment.created_at >= cutoff_date,
            Payment.stripe_payment_intent_id.isnot(None),
            Payment.status.in_(["pending", "completed", "failed"])
        ).all()


# Utility functions for manual reconciliation operations

async def run_emergency_reconciliation(db: Session, payment_ids: List[int]) -> List[ReconciliationResult]:
    """
    Run emergency reconciliation for specific payments
    
    Args:
        db: Database session
        payment_ids: List of payment IDs to reconcile
        
    Returns:
        List of reconciliation results
    """
    reconciliation_service = PaymentReconciliationService(db)
    results = []
    
    for payment_id in payment_ids:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if payment and payment.stripe_payment_intent_id:
            try:
                result = await reconciliation_service.reconcile_single_payment(payment)
                results.append(result)
            except Exception as e:
                logger.error(f"Emergency reconciliation failed for payment {payment_id}: {e}")
    
    return results


async def fix_payment_status_discrepancy(
    db: Session, 
    payment_id: int, 
    correct_status: str,
    initiated_by_user_id: int,
    reason: str
) -> bool:
    """
    Fix a payment status discrepancy after manual verification
    
    Args:
        db: Database session
        payment_id: ID of payment to fix
        correct_status: The correct status to set
        initiated_by_user_id: User making the correction
        reason: Reason for the manual correction
        
    Returns:
        True if successful, False otherwise
    """
    try:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            logger.error(f"Payment {payment_id} not found for status correction")
            return False
        
        old_status = payment.status
        payment.status = correct_status
        payment.updated_at = datetime.utcnow()
        
        # Log the manual correction
        financial_audit_logger.log_financial_transaction(
            user_id=str(initiated_by_user_id),
            transaction_type="manual_status_correction",
            amount=float(payment.amount),
            currency="USD",
            payment_method="manual_correction",
            order_id=f"correction_{payment_id}",
            order_type="manual_correction",
            metadata={
                "payment_id": payment_id,
                "old_status": old_status,
                "new_status": correct_status,
                "reason": reason,
                "initiated_by": initiated_by_user_id,
                "correction_timestamp": datetime.utcnow().isoformat()
            }
        )
        
        db.commit()
        logger.info(f"Payment {payment_id} status corrected: {old_status} → {correct_status}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to correct payment {payment_id} status: {e}")
        db.rollback()
        return False