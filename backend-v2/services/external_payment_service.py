"""
External Payment Service
Manages external payment processors for decentralized payment mode barbers
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from models.hybrid_payment import (
    PaymentProcessorConnection, ExternalTransaction, HybridPaymentConfig,
    PaymentMode, ExternalPaymentProcessor, ConnectionStatus, PaymentModeHistory
)
from models import User, Appointment, Payment
from services.payment_gateways.gateway_factory import GatewayFactory
from services.payment_gateways.base_gateway import PaymentGateway, GatewayError
from config import settings

logger = logging.getLogger(__name__)


class PaymentProcessingError(Exception):
    """Exception raised when payment processing fails"""
    pass


class ExternalPaymentService:
    """
    Service for managing external payment processors in hybrid payment system.
    
    Handles barber payment processor connections, transaction tracking,
    and integration with various payment gateways (Stripe, Square, PayPal, etc.)
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.gateway_factory = GatewayFactory()
    
    def connect_payment_processor(
        self,
        barber_id: int,
        processor_type: ExternalPaymentProcessor,
        connection_config: Dict[str, Any],
        account_name: Optional[str] = None
    ) -> PaymentProcessorConnection:
        """
        Connect a barber to an external payment processor.
        
        Args:
            barber_id: ID of the barber
            processor_type: Type of payment processor (stripe, square, etc.)
            connection_config: Configuration data for the connection
            account_name: Optional account name/description
            
        Returns:
            PaymentProcessorConnection: Created connection record
        """
        
        try:
            # Validate barber exists and can connect external processors
            barber = self._get_barber(barber_id)
            if not barber:
                raise PaymentProcessingError(f"Barber {barber_id} not found")
            
            # Check if connection already exists
            existing_connection = self._get_active_connection(barber_id, processor_type)
            if existing_connection:
                raise PaymentProcessingError(
                    f"Barber {barber_id} already has an active {processor_type.value} connection"
                )
            
            # Create gateway instance to validate connection
            gateway = self.gateway_factory.create_gateway(processor_type.value, connection_config)
            
            # Test connection with health check
            health_check = gateway.health_check()
            if health_check.get("status") != "healthy":
                raise PaymentProcessingError(
                    f"Failed to connect to {processor_type.value}: {health_check.get('error', 'Unknown error')}"
                )
            
            # Extract account information
            account_id = connection_config.get('account_id') or connection_config.get('merchant_id')
            if not account_id:
                # Generate account ID from gateway if not provided
                if processor_type == ExternalPaymentProcessor.STRIPE:
                    account_id = connection_config.get('publishable_key', '').split('_')[1] if '_' in connection_config.get('publishable_key', '') else 'stripe_account'
                elif processor_type == ExternalPaymentProcessor.SQUARE:
                    account_id = connection_config.get('location_id', 'square_location')
                else:
                    account_id = f"{processor_type.value}_account_{barber_id}"
            
            # Create connection record
            connection = PaymentProcessorConnection(
                barber_id=barber_id,
                processor_type=processor_type,
                account_id=account_id,
                account_name=account_name or f"{processor_type.value.title()} Account",
                status=ConnectionStatus.CONNECTED,
                connection_data=connection_config,
                webhook_url=f"{getattr(settings, 'api_base_url', 'http://localhost:8000')}/api/v1/webhooks/external-payment/{processor_type.value}",
                webhook_secret=connection_config.get('webhook_secret'),
                supports_payments=True,
                supports_refunds=True,
                supports_recurring=processor_type in [ExternalPaymentProcessor.STRIPE, ExternalPaymentProcessor.SQUARE],
                default_currency=connection_config.get('default_currency', 'USD'),
                processing_fees=connection_config.get('processing_fees', {}),
                connected_at=datetime.now(timezone.utc)
            )
            
            self.db.add(connection)
            self.db.flush()
            
            # Update barber's payment mode if this is their first external connection
            if barber.payment_mode == PaymentMode.CENTRALIZED:
                self._update_barber_payment_mode(
                    barber_id, 
                    PaymentMode.DECENTRALIZED,
                    f"Connected {processor_type.value} payment processor"
                )
            
            # Create or update hybrid payment configuration
            self._ensure_hybrid_config(barber_id, processor_type)
            
            self.db.commit()
            
            logger.info(f"Successfully connected barber {barber_id} to {processor_type.value}")
            return connection
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to connect payment processor for barber {barber_id}: {str(e)}")
            raise PaymentProcessingError(f"Connection failed: {str(e)}")
    
    def disconnect_payment_processor(
        self,
        barber_id: int,
        processor_type: ExternalPaymentProcessor,
        reason: Optional[str] = None
    ) -> bool:
        """
        Disconnect a barber from an external payment processor.
        
        Args:
            barber_id: ID of the barber
            processor_type: Type of payment processor to disconnect
            reason: Optional reason for disconnection
            
        Returns:
            bool: True if disconnection was successful
        """
        
        try:
            connection = self._get_active_connection(barber_id, processor_type)
            if not connection:
                raise PaymentProcessingError(
                    f"No active {processor_type.value} connection found for barber {barber_id}"
                )
            
            # Update connection status
            connection.status = ConnectionStatus.DISCONNECTED
            connection.disconnected_at = datetime.now(timezone.utc)
            connection.last_error = reason
            
            # Check if barber has any other active connections
            other_connections = self.db.execute(
                select(PaymentProcessorConnection)
                .where(
                    and_(
                        PaymentProcessorConnection.barber_id == barber_id,
                        PaymentProcessorConnection.status == ConnectionStatus.CONNECTED,
                        PaymentProcessorConnection.id != connection.id
                    )
                )
            )
            
            has_other_connections = other_connections.first() is not None
            
            # If no other connections, revert to centralized payment mode
            if not has_other_connections:
                self._update_barber_payment_mode(
                    barber_id,
                    PaymentMode.CENTRALIZED,
                    f"Disconnected last external payment processor ({processor_type.value})"
                )
            
            self.db.commit()
            
            logger.info(f"Successfully disconnected barber {barber_id} from {processor_type.value}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to disconnect payment processor for barber {barber_id}: {str(e)}")
            raise PaymentProcessingError(f"Disconnection failed: {str(e)}")
    
    def process_external_payment(
        self,
        appointment_id: int,
        amount: Decimal,
        currency: str = "USD",
        payment_method_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ExternalTransaction:
        """
        Process a payment through a barber's external payment processor.
        
        Args:
            appointment_id: ID of the appointment being paid for
            amount: Payment amount
            currency: Currency code
            payment_method_data: Payment method information
            metadata: Additional payment metadata
            
        Returns:
            ExternalTransaction: Created transaction record
        """
        
        try:
            # Get appointment and barber information
            appointment = self._get_appointment_with_barber(appointment_id)
            if not appointment:
                raise PaymentProcessingError(f"Appointment {appointment_id} not found")
            
            barber_id = appointment.barber_id
            
            # Get barber's primary payment processor connection
            connection = self._get_primary_connection(barber_id)
            if not connection:
                raise PaymentProcessingError(f"No active payment processor for barber {barber_id}")
            
            # Create gateway instance
            gateway = self.gateway_factory.create_gateway(
                connection.processor_type.value,
                connection.connection_data
            )
            
            # Create payment intent
            payment_intent = gateway.create_payment_intent(
                amount=amount,
                currency=currency,
                metadata={
                    **(metadata or {}),
                    'appointment_id': appointment_id,
                    'barber_id': barber_id,
                    'platform': 'bookedbarber'
                }
            )
            
            # Confirm payment if payment method provided
            payment_result = None
            if payment_method_data:
                payment_result = gateway.confirm_payment(
                    payment_intent.id,
                    payment_method=payment_method_data,
                    metadata=metadata
                )
            
            # Calculate commission
            commission_rate = self._get_commission_rate(barber_id, amount)
            commission_amount = amount * (commission_rate / 100)
            
            # Create external transaction record
            external_transaction = ExternalTransaction(
                connection_id=connection.id,
                appointment_id=appointment_id,
                external_transaction_id=payment_intent.id,
                external_charge_id=payment_result.gateway_transaction_id if payment_result else None,
                amount=amount,
                currency=currency.upper(),
                processing_fee=payment_result.fees if payment_result else Decimal('0'),
                net_amount=payment_result.net_amount if payment_result else amount,
                payment_method=payment_result.payment_method.type if payment_result and payment_result.payment_method else None,
                last_four=payment_result.payment_method.card_last4 if payment_result and payment_result.payment_method else None,
                brand=payment_result.payment_method.card_brand if payment_result and payment_result.payment_method else None,
                status=payment_result.status.value if payment_result else payment_intent.status.value,
                processed_at=datetime.now(timezone.utc) if payment_result else None,
                commission_rate=commission_rate,
                commission_amount=commission_amount,
                commission_collected=False,
                external_metadata={
                    'payment_intent': payment_intent.gateway_data,
                    'payment_result': payment_result.gateway_data if payment_result else None,
                    'original_metadata': metadata or {}
                }
            )
            
            self.db.add(external_transaction)
            
            # Update connection stats
            connection.total_transactions += 1
            connection.total_volume += amount
            connection.last_transaction_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
            logger.info(
                f"Processed external payment for appointment {appointment_id}: "
                f"${amount} via {connection.processor_type.value}"
            )
            
            return external_transaction
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to process external payment for appointment {appointment_id}: {str(e)}")
            raise PaymentProcessingError(f"Payment processing failed: {str(e)}")
    
    def get_barber_connections(
        self,
        barber_id: int,
        active_only: bool = True
    ) -> List[PaymentProcessorConnection]:
        """Get all payment processor connections for a barber."""
        
        query = select(PaymentProcessorConnection).where(
            PaymentProcessorConnection.barber_id == barber_id
        )
        
        if active_only:
            query = query.where(
                PaymentProcessorConnection.status == ConnectionStatus.CONNECTED
            )
        
        result = self.db.execute(query.order_by(PaymentProcessorConnection.connected_at.desc()))
        return result.scalars().all()
    
    def get_external_transactions(
        self,
        barber_id: Optional[int] = None,
        appointment_id: Optional[int] = None,
        connection_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ExternalTransaction]:
        """Get external transactions with optional filtering."""
        
        query = select(ExternalTransaction).options(
            selectinload(ExternalTransaction.connection),
            selectinload(ExternalTransaction.appointment)
        )
        
        if barber_id:
            query = query.join(PaymentProcessorConnection).where(
                PaymentProcessorConnection.barber_id == barber_id
            )
        
        if appointment_id:
            query = query.where(ExternalTransaction.appointment_id == appointment_id)
        
        if connection_id:
            query = query.where(ExternalTransaction.connection_id == connection_id)
        
        query = query.order_by(ExternalTransaction.created_at.desc()).limit(limit).offset(offset)
        
        result = self.db.execute(query)
        return result.scalars().all()
    
    def sync_external_transaction(
        self,
        external_transaction_id: int
    ) -> ExternalTransaction:
        """
        Sync an external transaction with the payment processor to get latest status.
        
        Args:
            external_transaction_id: ID of the external transaction to sync
            
        Returns:
            ExternalTransaction: Updated transaction record
        """
        
        try:
            # Get transaction with connection
            result = self.db.execute(
                select(ExternalTransaction)
                .options(selectinload(ExternalTransaction.connection))
                .where(ExternalTransaction.id == external_transaction_id)
            )
            transaction = result.scalar_one_or_none()
            
            if not transaction:
                raise PaymentProcessingError(f"External transaction {external_transaction_id} not found")
            
            # Create gateway instance
            gateway = self.gateway_factory.create_gateway(
                transaction.connection.processor_type.value,
                transaction.connection.connection_data
            )
            
            # Get latest payment status from gateway
            payment_result = gateway.get_payment(transaction.external_transaction_id)
            
            # Update transaction with latest information
            transaction.status = payment_result.status.value
            transaction.processing_fee = payment_result.fees or transaction.processing_fee
            transaction.net_amount = payment_result.net_amount or transaction.net_amount
            
            if payment_result.status.value in ['succeeded', 'completed'] and not transaction.processed_at:
                transaction.processed_at = datetime.now(timezone.utc)
            
            # Update external metadata with latest gateway data
            if transaction.external_metadata:
                transaction.external_metadata['last_sync'] = datetime.now(timezone.utc).isoformat()
                transaction.external_metadata['gateway_data'] = payment_result.gateway_data
            
            self.db.commit()
            
            logger.info(f"Synced external transaction {external_transaction_id}: status = {transaction.status}")
            return transaction
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to sync external transaction {external_transaction_id}: {str(e)}")
            raise PaymentProcessingError(f"Transaction sync failed: {str(e)}")
    
    # Private helper methods
    
    def _get_barber(self, barber_id: int) -> Optional[User]:
        """Get barber user record."""
        result = self.db.execute(
            select(User).where(User.id == barber_id)
        )
        return result.scalar_one_or_none()
    
    def _get_active_connection(
        self,
        barber_id: int,
        processor_type: ExternalPaymentProcessor
    ) -> Optional[PaymentProcessorConnection]:
        """Get active connection for barber and processor type."""
        result = self.db.execute(
            select(PaymentProcessorConnection).where(
                and_(
                    PaymentProcessorConnection.barber_id == barber_id,
                    PaymentProcessorConnection.processor_type == processor_type,
                    PaymentProcessorConnection.status == ConnectionStatus.CONNECTED
                )
            )
        )
        return result.scalar_one_or_none()
    
    def _get_primary_connection(self, barber_id: int) -> Optional[PaymentProcessorConnection]:
        """Get primary active connection for a barber."""
        # Get barber's hybrid config to determine primary processor
        result = self.db.execute(
            select(HybridPaymentConfig).where(
                HybridPaymentConfig.barber_id == barber_id
            )
        )
        config = result.scalar_one_or_none()
        
        if config and config.primary_processor:
            # Try to get connection for primary processor
            connection = self._get_active_connection(barber_id, config.primary_processor)
            if connection:
                return connection
        
        # Fallback to any active connection
        result = self.db.execute(
            select(PaymentProcessorConnection)
            .where(
                and_(
                    PaymentProcessorConnection.barber_id == barber_id,
                    PaymentProcessorConnection.status == ConnectionStatus.CONNECTED
                )
            )
            .order_by(PaymentProcessorConnection.connected_at.desc())
        )
        return result.scalar_one_or_none()
    
    def _get_appointment_with_barber(self, appointment_id: int) -> Optional[Appointment]:
        """Get appointment with barber information."""
        result = self.db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        return result.scalar_one_or_none()
    
    def _get_commission_rate(self, barber_id: int, amount: Decimal) -> Decimal:
        """Get commission rate for barber."""
        # Get from hybrid config or use default
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
    
    def _update_barber_payment_mode(
        self,
        barber_id: int,
        new_mode: PaymentMode,
        reason: str
    ) -> None:
        """Update barber's payment mode and record history."""
        
        # Get current barber record
        barber = self._get_barber(barber_id)
        if not barber:
            raise PaymentProcessingError(f"Barber {barber_id} not found")
        
        previous_mode = PaymentMode(barber.payment_mode) if barber.payment_mode else PaymentMode.CENTRALIZED
        
        # Update payment mode
        barber.payment_mode = new_mode.value
        
        # Record payment mode change history
        history = PaymentModeHistory(
            barber_id=barber_id,
            previous_mode=previous_mode,
            new_mode=new_mode,
            change_reason=reason,
            changed_by_id=barber_id,  # Self-initiated change
            effective_date=datetime.now(timezone.utc)
        )
        
        self.db.add(history)
    
    def _ensure_hybrid_config(
        self,
        barber_id: int,
        primary_processor: ExternalPaymentProcessor
    ) -> HybridPaymentConfig:
        """Ensure hybrid payment config exists for barber."""
        
        result = self.db.execute(
            select(HybridPaymentConfig).where(
                HybridPaymentConfig.barber_id == barber_id
            )
        )
        config = result.scalar_one_or_none()
        
        if not config:
            config = HybridPaymentConfig(
                barber_id=barber_id,
                payment_mode=PaymentMode.DECENTRALIZED,
                primary_processor=primary_processor,
                fallback_to_platform=True,
                collection_method='ach',
                collection_frequency='weekly',
                auto_collection=True,
                minimum_collection_amount=Decimal('10.0'),
                maximum_outstanding=Decimal('1000.0'),
                notify_before_collection=True,
                notification_days_ahead=2
            )
            self.db.add(config)
        else:
            # Update primary processor if not set
            if not config.primary_processor:
                config.primary_processor = primary_processor
        
        return config