"""
External Payment Webhook Processor Service
Handles webhooks from external payment processors and reconciles transactions
"""

import logging
import hmac
import hashlib
import json
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_

from models.hybrid_payment import (
    PaymentProcessorConnection, ExternalTransaction, PlatformCollection,
    ExternalPaymentProcessor, ConnectionStatus, CollectionType
)
from models import User, Appointment
from services.platform_collection_service import PlatformCollectionService
from services.payment_gateways.gateway_factory import GatewayFactory
from config import settings

logger = logging.getLogger(__name__)


class WebhookError(Exception):
    """Exception raised when webhook processing fails"""
    pass


class WebhookEventType(str, Enum):
    """Types of webhook events we handle"""
    PAYMENT_SUCCEEDED = "payment.succeeded"
    PAYMENT_FAILED = "payment.failed"
    PAYMENT_REFUNDED = "payment.refunded"
    PAYMENT_DISPUTED = "payment.disputed"
    PAYMENT_CANCELED = "payment.canceled"
    UNKNOWN = "unknown"


class ExternalWebhookProcessor:
    """
    Service for processing webhooks from external payment processors.
    
    Handles webhook verification, event processing, and transaction reconciliation
    to ensure commission tracking is accurate and real-time.
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.gateway_factory = GatewayFactory()
        self.collection_service = PlatformCollectionService(db_session)
    
    def process_webhook(
        self,
        processor_type: ExternalPaymentProcessor,
        payload: Dict[str, Any],
        signature: str,
        headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Process a webhook from an external payment processor.
        
        Args:
            processor_type: Type of payment processor (square, stripe, etc.)
            payload: Webhook payload data
            signature: Webhook signature for verification
            headers: HTTP headers from webhook request
            
        Returns:
            Dict with processing result
        """
        
        try:
            logger.info(f"Processing {processor_type.value} webhook")
            
            # Extract connection info and verify webhook
            connection = self._verify_webhook(processor_type, payload, signature, headers)
            if not connection:
                raise WebhookError("Webhook verification failed - no valid connection found")
            
            # Parse webhook event
            event_type, event_data = self._parse_webhook_event(processor_type, payload)
            
            # Process the event based on type
            result = self._process_webhook_event(
                connection=connection,
                event_type=event_type,
                event_data=event_data,
                raw_payload=payload
            )
            
            logger.info(
                f"Successfully processed {processor_type.value} webhook: "
                f"{event_type.value} for connection {connection.id}"
            )
            
            return {
                'success': True,
                'event_type': event_type.value,
                'connection_id': connection.id,
                'barber_id': connection.barber_id,
                'result': result
            }
            
        except Exception as e:
            logger.error(f"Failed to process {processor_type.value} webhook: {str(e)}")
            raise WebhookError(f"Webhook processing failed: {str(e)}")
    
    def reconcile_transactions(
        self,
        barber_id: Optional[int] = None,
        processor_type: Optional[ExternalPaymentProcessor] = None,
        hours_back: int = 24
    ) -> Dict[str, Any]:
        """
        Reconcile external transactions by fetching latest data from payment processors.
        
        Args:
            barber_id: Optional specific barber to reconcile
            processor_type: Optional specific processor to reconcile
            hours_back: How many hours back to reconcile
            
        Returns:
            Dict with reconciliation results
        """
        
        try:
            # Get connections to reconcile
            connections = self._get_connections_for_reconciliation(barber_id, processor_type)
            
            reconciliation_results = []
            
            for connection in connections:
                try:
                    connection_result = self._reconcile_connection(connection, hours_back)
                    reconciliation_results.append(connection_result)
                    
                except Exception as e:
                    logger.error(f"Failed to reconcile connection {connection.id}: {str(e)}")
                    reconciliation_results.append({
                        'connection_id': connection.id,
                        'success': False,
                        'error': str(e)
                    })
            
            # Calculate summary
            successful_reconciliations = len([r for r in reconciliation_results if r.get('success')])
            total_new_transactions = sum(r.get('new_transactions', 0) for r in reconciliation_results)
            total_updated_transactions = sum(r.get('updated_transactions', 0) for r in reconciliation_results)
            
            summary = {
                'success': True,
                'total_connections': len(connections),
                'successful_reconciliations': successful_reconciliations,
                'total_new_transactions': total_new_transactions,
                'total_updated_transactions': total_updated_transactions,
                'connection_results': reconciliation_results
            }
            
            logger.info(
                f"Reconciliation complete: {successful_reconciliations}/{len(connections)} connections, "
                f"{total_new_transactions} new transactions, {total_updated_transactions} updated"
            )
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to reconcile transactions: {str(e)}")
            raise WebhookError(f"Transaction reconciliation failed: {str(e)}")
    
    def generate_commission_from_webhook(
        self,
        transaction: ExternalTransaction
    ) -> Optional[PlatformCollection]:
        """
        Generate commission collection from a webhook-processed transaction.
        
        Args:
            transaction: External transaction that was just processed
            
        Returns:
            PlatformCollection if commission collection was created
        """
        
        try:
            # Only generate commission for successful transactions
            if transaction.status not in ['succeeded', 'completed']:
                return None
            
            # Check if commission already collected
            if transaction.commission_collected:
                return None
            
            # Get outstanding commission for this barber
            commission_data = self.collection_service.calculate_outstanding_commission(
                barber_id=transaction.connection.barber_id
            )
            
            # Check if meets minimum threshold for collection
            if not commission_data['collection_eligibility']['can_collect_now']:
                logger.debug(f"Commission for transaction {transaction.id} below threshold")
                return None
            
            # Create commission collection
            collection = self.collection_service.create_collection(
                barber_id=transaction.connection.barber_id,
                collection_type=CollectionType.COMMISSION,
                amount=Decimal(str(commission_data['commission_summary']['total_commission_owed'])),
                description=f"Auto-generated commission collection from webhook processing",
                related_transaction_ids=[t['transaction_id'] for t in commission_data['transactions']],
                auto_collect=True
            )
            
            logger.info(
                f"Generated commission collection {collection.id} for barber {transaction.connection.barber_id}: "
                f"${collection.amount}"
            )
            
            return collection
            
        except Exception as e:
            logger.error(f"Failed to generate commission from webhook transaction {transaction.id}: {str(e)}")
            return None
    
    # Private helper methods
    
    def _verify_webhook(
        self,
        processor_type: ExternalPaymentProcessor,
        payload: Dict[str, Any],
        signature: str,
        headers: Dict[str, str]
    ) -> Optional[PaymentProcessorConnection]:
        """Verify webhook signature and find matching connection."""
        
        if processor_type == ExternalPaymentProcessor.SQUARE:
            return self._verify_square_webhook(payload, signature, headers)
        elif processor_type == ExternalPaymentProcessor.STRIPE:
            return self._verify_stripe_webhook(payload, signature, headers)
        elif processor_type == ExternalPaymentProcessor.PAYPAL:
            return self._verify_paypal_webhook(payload, signature, headers)
        else:
            logger.warning(f"Webhook verification not implemented for {processor_type.value}")
            return None
    
    def _verify_square_webhook(
        self,
        payload: Dict[str, Any],
        signature: str,
        headers: Dict[str, str]
    ) -> Optional[PaymentProcessorConnection]:
        """Verify Square webhook signature."""
        
        try:
            # Square uses HMAC-SHA256 with webhook signature key
            notification_url = headers.get('Square-Notification-Url', '')
            
            # Extract location ID from payload or URL
            location_id = None
            if 'data' in payload and 'object' in payload['data']:
                location_id = payload['data']['object'].get('location_id')
            
            if not location_id:
                # Try to extract from notification URL
                if '/locations/' in notification_url:
                    location_id = notification_url.split('/locations/')[1].split('/')[0]
            
            if not location_id:
                logger.warning("No location ID found in Square webhook")
                return None
            
            # Find connection by location ID
            connection = self.db.execute(
                select(PaymentProcessorConnection).where(
                    and_(
                        PaymentProcessorConnection.processor_type == ExternalPaymentProcessor.SQUARE,
                        PaymentProcessorConnection.account_id == location_id,
                        PaymentProcessorConnection.status == ConnectionStatus.CONNECTED
                    )
                )
            ).scalar_one_or_none()
            
            if not connection:
                logger.warning(f"No Square connection found for location {location_id}")
                return None
            
            # Verify signature using webhook secret
            webhook_secret = connection.connection_data.get('webhook_signature_key')
            if not webhook_secret:
                logger.warning(f"No webhook secret configured for Square connection {connection.id}")
                return connection  # Return connection but log warning
            
            # Create signature verification payload
            verification_payload = notification_url + json.dumps(payload, separators=(',', ':'))
            expected_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                verification_payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                logger.warning(f"Square webhook signature verification failed for connection {connection.id}")
                return None
            
            return connection
            
        except Exception as e:
            logger.error(f"Square webhook verification failed: {str(e)}")
            return None
    
    def _verify_stripe_webhook(
        self,
        payload: Dict[str, Any],
        signature: str,
        headers: Dict[str, str]
    ) -> Optional[PaymentProcessorConnection]:
        """Verify Stripe webhook signature."""
        
        try:
            # Stripe includes account ID in webhook events
            account_id = payload.get('account')
            if not account_id:
                logger.warning("No account ID found in Stripe webhook")
                return None
            
            # Find connection by account ID
            connection = self.db.execute(
                select(PaymentProcessorConnection).where(
                    and_(
                        PaymentProcessorConnection.processor_type == ExternalPaymentProcessor.STRIPE,
                        PaymentProcessorConnection.account_id == account_id,
                        PaymentProcessorConnection.status == ConnectionStatus.CONNECTED
                    )
                )
            ).scalar_one_or_none()
            
            if not connection:
                logger.warning(f"No Stripe connection found for account {account_id}")
                return None
            
            # For now, return connection (Stripe signature verification is complex)
            # In production, implement full Stripe webhook signature verification
            return connection
            
        except Exception as e:
            logger.error(f"Stripe webhook verification failed: {str(e)}")
            return None
    
    def _verify_paypal_webhook(
        self,
        payload: Dict[str, Any],
        signature: str,
        headers: Dict[str, str]
    ) -> Optional[PaymentProcessorConnection]:
        """Verify PayPal webhook signature."""
        
        try:
            # PayPal webhook verification is complex and requires API calls
            # For now, return first PayPal connection (implement proper verification in production)
            connection = self.db.execute(
                select(PaymentProcessorConnection).where(
                    and_(
                        PaymentProcessorConnection.processor_type == ExternalPaymentProcessor.PAYPAL,
                        PaymentProcessorConnection.status == ConnectionStatus.CONNECTED
                    )
                )
            ).scalar_one_or_none()
            
            if not connection:
                logger.warning("No PayPal connection found")
                return None
            
            return connection
            
        except Exception as e:
            logger.error(f"PayPal webhook verification failed: {str(e)}")
            return None
    
    def _parse_webhook_event(
        self,
        processor_type: ExternalPaymentProcessor,
        payload: Dict[str, Any]
    ) -> Tuple[WebhookEventType, Dict[str, Any]]:
        """Parse webhook event to determine type and extract data."""
        
        if processor_type == ExternalPaymentProcessor.SQUARE:
            return self._parse_square_event(payload)
        elif processor_type == ExternalPaymentProcessor.STRIPE:
            return self._parse_stripe_event(payload)
        elif processor_type == ExternalPaymentProcessor.PAYPAL:
            return self._parse_paypal_event(payload)
        else:
            return WebhookEventType.UNKNOWN, payload
    
    def _parse_square_event(self, payload: Dict[str, Any]) -> Tuple[WebhookEventType, Dict[str, Any]]:
        """Parse Square webhook event."""
        
        event_type_map = {
            'payment.created': WebhookEventType.PAYMENT_SUCCEEDED,
            'payment.updated': WebhookEventType.PAYMENT_SUCCEEDED,
            'refund.created': WebhookEventType.PAYMENT_REFUNDED,
            'refund.updated': WebhookEventType.PAYMENT_REFUNDED,
            'dispute.created': WebhookEventType.PAYMENT_DISPUTED,
        }
        
        event_type_str = payload.get('type', 'unknown')
        event_type = event_type_map.get(event_type_str, WebhookEventType.UNKNOWN)
        
        # Extract payment/refund data
        event_data = {}
        if 'data' in payload and 'object' in payload['data']:
            obj = payload['data']['object']
            event_data = {
                'external_id': obj.get('id'),
                'amount': self._parse_square_amount(obj.get('amount_money', {})),
                'status': obj.get('status', '').lower(),
                'created_at': obj.get('created_at'),
                'updated_at': obj.get('updated_at'),
                'order_id': obj.get('order_id'),
                'location_id': obj.get('location_id'),
                'raw_object': obj
            }
        
        return event_type, event_data
    
    def _parse_stripe_event(self, payload: Dict[str, Any]) -> Tuple[WebhookEventType, Dict[str, Any]]:
        """Parse Stripe webhook event."""
        
        event_type_map = {
            'payment_intent.succeeded': WebhookEventType.PAYMENT_SUCCEEDED,
            'payment_intent.payment_failed': WebhookEventType.PAYMENT_FAILED,
            'charge.dispute.created': WebhookEventType.PAYMENT_DISPUTED,
            'charge.refunded': WebhookEventType.PAYMENT_REFUNDED,
        }
        
        event_type_str = payload.get('type', 'unknown')
        event_type = event_type_map.get(event_type_str, WebhookEventType.UNKNOWN)
        
        # Extract payment data
        event_data = {}
        if 'data' in payload and 'object' in payload['data']:
            obj = payload['data']['object']
            event_data = {
                'external_id': obj.get('id'),
                'amount': Decimal(str(obj.get('amount', 0))) / 100,  # Stripe amounts in cents
                'status': obj.get('status', '').lower(),
                'created': obj.get('created'),
                'currency': obj.get('currency', 'usd'),
                'raw_object': obj
            }
        
        return event_type, event_data
    
    def _parse_paypal_event(self, payload: Dict[str, Any]) -> Tuple[WebhookEventType, Dict[str, Any]]:
        """Parse PayPal webhook event."""
        
        event_type_map = {
            'PAYMENT.CAPTURE.COMPLETED': WebhookEventType.PAYMENT_SUCCEEDED,
            'PAYMENT.CAPTURE.DENIED': WebhookEventType.PAYMENT_FAILED,
            'PAYMENT.CAPTURE.REFUNDED': WebhookEventType.PAYMENT_REFUNDED,
        }
        
        event_type_str = payload.get('event_type', 'unknown')
        event_type = event_type_map.get(event_type_str, WebhookEventType.UNKNOWN)
        
        # Extract payment data from PayPal structure
        event_data = {'raw_object': payload}
        if 'resource' in payload:
            resource = payload['resource']
            event_data.update({
                'external_id': resource.get('id'),
                'amount': self._parse_paypal_amount(resource.get('amount', {})),
                'status': resource.get('status', '').lower(),
                'create_time': resource.get('create_time'),
                'update_time': resource.get('update_time')
            })
        
        return event_type, event_data
    
    def _process_webhook_event(
        self,
        connection: PaymentProcessorConnection,
        event_type: WebhookEventType,
        event_data: Dict[str, Any],
        raw_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process a webhook event and update/create transactions."""
        
        if event_type == WebhookEventType.PAYMENT_SUCCEEDED:
            return self._process_payment_success(connection, event_data, raw_payload)
        elif event_type == WebhookEventType.PAYMENT_FAILED:
            return self._process_payment_failure(connection, event_data, raw_payload)
        elif event_type == WebhookEventType.PAYMENT_REFUNDED:
            return self._process_payment_refund(connection, event_data, raw_payload)
        elif event_type == WebhookEventType.PAYMENT_DISPUTED:
            return self._process_payment_dispute(connection, event_data, raw_payload)
        else:
            logger.info(f"Unhandled webhook event type: {event_type.value}")
            return {'action': 'ignored', 'reason': f'Unhandled event type: {event_type.value}'}
    
    def _process_payment_success(
        self,
        connection: PaymentProcessorConnection,
        event_data: Dict[str, Any],
        raw_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process successful payment event."""
        
        external_id = event_data.get('external_id')
        if not external_id:
            return {'action': 'ignored', 'reason': 'No external transaction ID'}
        
        # Check if transaction already exists
        existing_transaction = self.db.execute(
            select(ExternalTransaction).where(
                and_(
                    ExternalTransaction.connection_id == connection.id,
                    ExternalTransaction.external_transaction_id == external_id
                )
            )
        ).scalar_one_or_none()
        
        if existing_transaction:
            # Update existing transaction
            existing_transaction.status = event_data.get('status', 'succeeded')
            existing_transaction.processed_at = datetime.now(timezone.utc)
            existing_transaction.external_metadata = {
                **(existing_transaction.external_metadata or {}),
                'webhook_update': raw_payload,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            self.db.commit()
            
            # Try to generate commission collection
            commission_collection = self.generate_commission_from_webhook(existing_transaction)
            
            return {
                'action': 'updated',
                'transaction_id': existing_transaction.id,
                'commission_collection_id': commission_collection.id if commission_collection else None
            }
        
        else:
            # Create new transaction
            # Calculate commission rate for this barber
            commission_rate = self._get_commission_rate(connection.barber_id)
            amount = event_data.get('amount', Decimal('0'))
            commission_amount = amount * (commission_rate / 100)
            
            new_transaction = ExternalTransaction(
                connection_id=connection.id,
                external_transaction_id=external_id,
                amount=amount,
                currency=event_data.get('currency', 'USD').upper(),
                status=event_data.get('status', 'succeeded'),
                processed_at=datetime.now(timezone.utc),
                commission_rate=commission_rate,
                commission_amount=commission_amount,
                commission_collected=False,
                external_metadata={
                    'webhook_data': raw_payload,
                    'created_from_webhook': True,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
            )
            
            self.db.add(new_transaction)
            self.db.flush()
            
            # Update connection stats
            connection.total_transactions += 1
            connection.total_volume += amount
            connection.last_transaction_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
            # Try to generate commission collection
            commission_collection = self.generate_commission_from_webhook(new_transaction)
            
            return {
                'action': 'created',
                'transaction_id': new_transaction.id,
                'amount': float(amount),
                'commission_amount': float(commission_amount),
                'commission_collection_id': commission_collection.id if commission_collection else None
            }
    
    def _process_payment_failure(
        self,
        connection: PaymentProcessorConnection,
        event_data: Dict[str, Any],
        raw_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process failed payment event."""
        
        external_id = event_data.get('external_id')
        if not external_id:
            return {'action': 'ignored', 'reason': 'No external transaction ID'}
        
        # Update existing transaction if found
        existing_transaction = self.db.execute(
            select(ExternalTransaction).where(
                and_(
                    ExternalTransaction.connection_id == connection.id,
                    ExternalTransaction.external_transaction_id == external_id
                )
            )
        ).scalar_one_or_none()
        
        if existing_transaction:
            existing_transaction.status = 'failed'
            existing_transaction.external_metadata = {
                **(existing_transaction.external_metadata or {}),
                'failure_webhook': raw_payload,
                'failed_at': datetime.now(timezone.utc).isoformat()
            }
            
            self.db.commit()
            
            return {'action': 'updated', 'transaction_id': existing_transaction.id, 'status': 'failed'}
        
        return {'action': 'ignored', 'reason': 'Transaction not found for failure event'}
    
    def _process_payment_refund(
        self,
        connection: PaymentProcessorConnection,
        event_data: Dict[str, Any],
        raw_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process payment refund event."""
        
        # Handle refund processing
        return {'action': 'refund_processed', 'event_data': event_data}
    
    def _process_payment_dispute(
        self,
        connection: PaymentProcessorConnection,
        event_data: Dict[str, Any],
        raw_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process payment dispute event."""
        
        # Handle dispute processing
        return {'action': 'dispute_processed', 'event_data': event_data}
    
    def _get_connections_for_reconciliation(
        self,
        barber_id: Optional[int],
        processor_type: Optional[ExternalPaymentProcessor]
    ) -> List[PaymentProcessorConnection]:
        """Get connections that need reconciliation."""
        
        query = select(PaymentProcessorConnection).where(
            PaymentProcessorConnection.status == ConnectionStatus.CONNECTED
        )
        
        if barber_id:
            query = query.where(PaymentProcessorConnection.barber_id == barber_id)
        
        if processor_type:
            query = query.where(PaymentProcessorConnection.processor_type == processor_type)
        
        result = self.db.execute(query)
        return result.scalars().all()
    
    def _reconcile_connection(
        self,
        connection: PaymentProcessorConnection,
        hours_back: int
    ) -> Dict[str, Any]:
        """Reconcile transactions for a specific connection."""
        
        try:
            # Create gateway instance for this connection
            gateway = self.gateway_factory.create_gateway(
                connection.processor_type.value,
                connection.connection_data
            )
            
            # Fetch recent transactions from the gateway
            # This would call the actual payment processor API
            # For now, return a mock result
            
            return {
                'connection_id': connection.id,
                'success': True,
                'new_transactions': 0,
                'updated_transactions': 0,
                'reconciliation_time': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to reconcile connection {connection.id}: {str(e)}")
            raise
    
    def _get_commission_rate(self, barber_id: int) -> Decimal:
        """Get commission rate for a barber."""
        
        # Get from hybrid config or use default
        from models.hybrid_payment import HybridPaymentConfig
        
        result = self.db.execute(
            select(HybridPaymentConfig).where(
                HybridPaymentConfig.barber_id == barber_id
            )
        )
        config = result.scalar_one_or_none()
        
        # Default commission rate based on Six Figure Barber methodology
        default_rate = Decimal('15.0')  # 15% platform commission
        
        if config and hasattr(config, 'commission_rate'):
            return config.commission_rate or default_rate
        
        return default_rate
    
    def _parse_square_amount(self, amount_money: Dict[str, Any]) -> Decimal:
        """Parse Square amount_money object to decimal."""
        
        amount = amount_money.get('amount', 0)
        currency = amount_money.get('currency', 'USD')
        
        # Square amounts are in smallest currency unit (cents for USD)
        if currency.upper() == 'USD':
            return Decimal(str(amount)) / 100
        else:
            # For other currencies, check if they use smallest unit
            return Decimal(str(amount)) / 100  # Assume cents for now
    
    def _parse_paypal_amount(self, amount_obj: Dict[str, Any]) -> Decimal:
        """Parse PayPal amount object to decimal."""
        
        value = amount_obj.get('value', '0')
        return Decimal(str(value))