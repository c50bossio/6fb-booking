"""
Commission calculation and payout service for retail sales and services.
Extends the existing payout system to include product sales commissions.
Updated to use the unified commission framework.
"""

from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
import logging
from utils.audit_logger_bypass import get_audit_logger

from models import Payment
from models.product import Order, OrderItem, POSTransaction
from services.payment_service import PaymentService
from services.base_commission import UnifiedCommissionService, CommissionType
from services.commission_rate_manager import CommissionRateManager

logger = logging.getLogger(__name__)
commission_audit_logger = get_audit_logger()


class CommissionService:
    """Service for calculating and managing commissions across services and retail sales."""
    
    def __init__(self, db: Session):
        self.db = db
        self.payment_service = PaymentService(db)
        self.unified_commission = UnifiedCommissionService()
        self.rate_manager = CommissionRateManager(db)
    
    def calculate_order_commissions(self, order: Order) -> Decimal:
        """Calculate total commission for an order and update individual items using unified framework."""
        total_commission = Decimal("0.00")
        
        # Get the order items with their commission details
        order_items = self.db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        
        for item in order_items:
            # Calculate commission if not already calculated
            if item.commission_amount == Decimal("0.00") and item.commission_rate > 0:
                # Use unified commission service for retail calculation
                commission_result = self.unified_commission.calculate_commission(
                    commission_type=CommissionType.RETAIL,
                    amount=item.line_total,
                    rate=item.commission_rate,
                    quantity=item.quantity or 1
                )
                
                item.commission_amount = commission_result['commission_amount']
                total_commission += commission_result['commission_amount']
                
                # Log commission calculation
                commission_audit_logger.log_commission_calculation(
                    user_id=str(order.commission_barber_id) if order.commission_barber_id else None,
                    order_id=f"order_item_{item.id}",
                    commission_amount=float(commission_result['commission_amount']),
                    commission_rate=float(item.commission_rate),
                    base_amount=float(item.line_total),
                    calculation_method="unified_retail",
                    success=True,
                    details={
                        "order_id": order.id,
                        "item_id": item.id,
                        "product_title": item.title,
                        "quantity": item.quantity,
                        "commission_type": "retail"
                    }
                )
                
                logger.info(f"Calculated commission for order item {item.id}: {commission_result['commission_amount']}")
            else:
                total_commission += item.commission_amount
        
        self.db.commit()
        return total_commission
    
    def process_order_payment_commission(self, order: Order) -> bool:
        """Process commission calculation when an order is paid."""
        try:
            # Calculate commissions for all order items
            total_commission = self.calculate_order_commissions(order)
            
            # Mark commissions as ready for payout if barber is assigned
            if order.commission_barber_id and total_commission > 0:
                # Mark all order items as having commission calculated
                order_items = self.db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
                for item in order_items:
                    if item.commission_amount > 0:
                        # Don't mark as paid yet - that happens during payout processing
                        logger.info(f"Commission ready for payout: Order {order.id}, Item {item.id}")
                
                self.db.commit()
                
                logger.info(f"Processed order payment commission: Order {order.id}, Barber: {order.commission_barber_id}")
                return True
            else:
                logger.warning(f"No barber assigned or zero commission for order {order.id}")
                return False
                
        except Exception as e:
            logger.error(f"Error processing order payment commission: {str(e)}")
            self.db.rollback()
            return False
    
    def calculate_pos_transaction_commission(self, transaction: POSTransaction) -> Decimal:
        """Calculate commission for a POS transaction using unified framework."""
        # Use unified commission service for POS calculation
        commission_result = self.unified_commission.calculate_commission(
            commission_type=CommissionType.POS,
            amount=transaction.subtotal,
            rate=transaction.commission_rate,
            transaction_type='standard'
        )
        
        transaction.commission_amount = commission_result['commission_amount']
        
        # Log POS commission calculation
        commission_audit_logger.log_commission_calculation(
            user_id=str(transaction.barber_id) if transaction.barber_id else None,
            order_id=f"pos_transaction_{transaction.id}",
            commission_amount=float(commission_result['commission_amount']),
            commission_rate=float(transaction.commission_rate),
            base_amount=float(transaction.subtotal),
            calculation_method="unified_pos",
            success=True,
            details={
                "transaction_id": transaction.id,
                "transaction_number": transaction.transaction_number,
                "commission_type": "pos"
            }
        )
        
        self.db.commit()
        
        logger.info(f"Calculated POS commission: Transaction {transaction.id}, Amount: {commission_result['commission_amount']}")
        return commission_result['commission_amount']
    
    def calculate_comprehensive_commission(
        self, 
        barber_id: int, 
        commission_type: CommissionType,
        amount: Decimal,
        product_id: Optional[int] = None,
        location_id: Optional[int] = None
    ) -> Dict[str, Decimal]:
        """
        Calculate commission using the unified framework with dynamic rate determination.
        
        Args:
            barber_id: ID of the barber
            commission_type: Type of commission to calculate
            amount: Base amount for calculation
            product_id: Optional product ID for product-specific rates
            location_id: Optional location ID for location-specific rates
            
        Returns:
            Commission calculation results
        """
        # Get appropriate commission rate using the rate manager
        commission_rate = self.rate_manager.get_barber_commission_rate(
            barber_id=barber_id,
            commission_type=commission_type,
            amount=amount,
            product_id=product_id,
            location_id=location_id
        )
        
        # Calculate commission using unified service
        result = self.unified_commission.calculate_commission(
            commission_type=commission_type,
            amount=amount,
            rate=commission_rate
        )
        
        # Add barber and context information
        result['barber_id'] = barber_id
        result['calculated_at'] = datetime.utcnow()
        
        # Log comprehensive commission calculation
        commission_audit_logger.log_commission_calculation(
            user_id=str(barber_id),
            order_id=f"comprehensive_{commission_type.value}_{barber_id}",
            commission_amount=float(result['commission_amount']),
            commission_rate=float(commission_rate),
            base_amount=float(amount),
            calculation_method="comprehensive_unified",
            success=True,
            details={
                "commission_type": commission_type.value,
                "product_id": product_id,
                "location_id": location_id,
                "platform_fee": float(result.get('platform_fee', 0)),
                "barber_amount": float(result.get('barber_amount', 0)),
                "calculation_framework": "unified"
            }
        )
        
        logger.info(f"Comprehensive commission calculated for barber {barber_id}: {result}")
        return result
    
    def get_barber_retail_commissions(
        self, 
        barber_id: int, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        unpaid_only: bool = False
    ) -> Dict[str, Any]:
        """Get retail commissions for a barber in a date range."""
        
        # Set default date range if not provided
        if not start_date:
            start_date = datetime.utcnow().replace(day=1)  # First day of current month
        if not end_date:
            end_date = datetime.utcnow()
        
        # Get commissions from orders
        order_query = self.db.query(OrderItem).join(Order).filter(
            Order.commission_barber_id == barber_id,
            Order.financial_status == "paid",
            Order.processed_at >= start_date,
            Order.processed_at <= end_date
        )
        
        if unpaid_only:
            order_query = order_query.filter(OrderItem.commission_paid == False)
        
        order_items = order_query.all()
        
        # Get commissions from POS transactions
        pos_query = self.db.query(POSTransaction).filter(
            POSTransaction.barber_id == barber_id,
            POSTransaction.transacted_at >= start_date,
            POSTransaction.transacted_at <= end_date
        )
        
        if unpaid_only:
            pos_query = pos_query.filter(POSTransaction.commission_paid == False)
        
        pos_transactions = pos_query.all()
        
        # Calculate totals
        order_commission = sum(item.commission_amount for item in order_items)
        pos_commission = sum(trans.commission_amount for trans in pos_transactions)
        total_commission = order_commission + pos_commission
        
        return {
            "barber_id": barber_id,
            "period_start": start_date,
            "period_end": end_date,
            "order_commission": order_commission,
            "pos_commission": pos_commission,
            "total_retail_commission": total_commission,
            "order_items_count": len(order_items),
            "pos_transactions_count": len(pos_transactions),
            "order_items": [
                {
                    "id": item.id,
                    "order_id": item.order_id,
                    "title": item.title,
                    "commission_amount": item.commission_amount,
                    "commission_rate": item.commission_rate,
                    "line_total": item.line_total,
                    "commission_paid": item.commission_paid
                } for item in order_items
            ],
            "pos_transactions": [
                {
                    "id": trans.id,
                    "transaction_number": trans.transaction_number,
                    "commission_amount": trans.commission_amount,
                    "commission_rate": trans.commission_rate,
                    "subtotal": trans.subtotal,
                    "commission_paid": trans.commission_paid,
                    "transacted_at": trans.transacted_at
                } for trans in pos_transactions
            ]
        }
    
    def get_total_barber_commissions(
        self, 
        barber_id: int, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        unpaid_only: bool = False
    ) -> Dict[str, Any]:
        """Get total commissions for a barber including services and retail."""
        
        # Set default date range if not provided
        if not start_date:
            start_date = datetime.utcnow().replace(day=1)  # First day of current month
        if not end_date:
            end_date = datetime.utcnow()
        
        # Get service commissions from payments
        service_query = self.db.query(Payment).filter(
            Payment.barber_id == barber_id,
            Payment.status == "succeeded",
            Payment.created_at >= start_date,
            Payment.created_at <= end_date
        )
        
        if unpaid_only:
            # For services, check if there's an associated payout
            # This is more complex and might need adjustment based on payout tracking
            pass
        
        service_payments = service_query.all()
        service_commission = sum(payment.platform_fee or Decimal("0.00") for payment in service_payments)
        
        # Get retail commissions
        retail_data = self.get_barber_retail_commissions(
            barber_id, start_date, end_date, unpaid_only
        )
        
        total_commission = service_commission + retail_data["total_retail_commission"]
        
        return {
            "barber_id": barber_id,
            "period_start": start_date,
            "period_end": end_date,
            "service_commission": service_commission,
            "retail_commission": retail_data["total_retail_commission"],
            "total_commission": total_commission,
            "service_payments_count": len(service_payments),
            "retail_items_count": retail_data["order_items_count"] + retail_data["pos_transactions_count"],
            "retail_breakdown": retail_data
        }
    
    def mark_retail_commissions_paid(
        self, 
        barber_id: int, 
        payout_id: int,
        order_item_ids: List[int] = None,
        pos_transaction_ids: List[int] = None
    ) -> bool:
        """Mark retail commissions as paid when payout is processed."""
        try:
            # Mark order item commissions as paid
            if order_item_ids:
                order_items = self.db.query(OrderItem).filter(
                    OrderItem.id.in_(order_item_ids),
                    OrderItem.commission_paid == False
                ).all()
                
                for item in order_items:
                    item.commission_paid = True
                    item.commission_paid_at = datetime.utcnow()
                    # Could add payout_id field to track which payout included this commission
                
                logger.info(f"Marked {len(order_items)} order item commissions as paid for barber {barber_id}")
            
            # Mark POS transaction commissions as paid
            if pos_transaction_ids:
                pos_transactions = self.db.query(POSTransaction).filter(
                    POSTransaction.id.in_(pos_transaction_ids),
                    POSTransaction.commission_paid == False
                ).all()
                
                for trans in pos_transactions:
                    trans.commission_paid = True
                    trans.commission_paid_at = datetime.utcnow()
                    # Could add payout_id field to track which payout included this commission
                
                logger.info(f"Marked {len(pos_transactions)} POS transaction commissions as paid for barber {barber_id}")
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error marking retail commissions as paid: {str(e)}")
            self.db.rollback()
            return False
    
    def calculate_barber_payout_amount(
        self, 
        barber_id: int, 
        include_retail: bool = True,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Calculate total payout amount for a barber including optional retail commissions."""
        
        # Get service payout amount using existing payment service logic
        # This includes the barber_amount from completed payments
        service_query = self.db.query(Payment).filter(
            Payment.barber_id == barber_id,
            Payment.status == "succeeded"
        )
        
        if start_date:
            service_query = service_query.filter(Payment.created_at >= start_date)
        if end_date:
            service_query = service_query.filter(Payment.created_at <= end_date)
        
        # Filter out payments that have already been paid out
        # This logic might need to be enhanced based on how payouts are tracked
        service_payments = service_query.all()
        service_amount = sum(payment.barber_amount or Decimal("0.00") for payment in service_payments)
        
        retail_amount = Decimal("0.00")
        retail_breakdown = None
        
        if include_retail:
            retail_breakdown = self.get_barber_retail_commissions(
                barber_id, start_date, end_date, unpaid_only=True
            )
            retail_amount = retail_breakdown["total_retail_commission"]
        
        total_payout = service_amount + retail_amount
        
        return {
            "barber_id": barber_id,
            "service_amount": service_amount,
            "retail_amount": retail_amount,
            "total_payout": total_payout,
            "service_payments_count": len(service_payments),
            "retail_breakdown": retail_breakdown
        }
    
    def calculate_paid_amount(
        self, 
        barber_id: int, 
        start_date: Optional[datetime] = None, 
        end_date: Optional[datetime] = None
    ) -> float:
        """Calculate total amount already paid out to barber in specified period."""
        from models import Payout
        
        # Query completed payouts for the barber in the specified period
        query = self.db.query(Payout).filter(
            Payout.barber_id == barber_id,
            Payout.status == "completed"
        )
        
        if start_date:
            query = query.filter(Payout.period_start >= start_date)
        if end_date:
            query = query.filter(Payout.period_end <= end_date)
        
        payouts = query.all()
        total_paid = sum(payout.amount or 0 for payout in payouts)
        
        logger.info(f"Calculated paid amount for barber {barber_id}: ${total_paid:.2f} from {len(payouts)} completed payouts")
        
        return float(total_paid)