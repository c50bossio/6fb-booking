"""
Hybrid Payment Router
Dynamic payment routing logic based on barber payment mode
"""

import logging
from typing import Dict, List, Optional, Any, Tuple, Union
from decimal import Decimal
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from models.hybrid_payment import (
    PaymentMode, ExternalPaymentProcessor, ConnectionStatus,
    PaymentProcessorConnection, HybridPaymentConfig
)
from models import User, Appointment, Payment
from services.external_payment_service import ExternalPaymentService
from services.payment_service import PaymentService
from services.payment_gateways.base_gateway import PaymentResult, PaymentIntent, GatewayError
from config import settings

logger = logging.getLogger(__name__)


class PaymentRoutingDecision(Enum):
    """Payment routing decision types."""
    CENTRALIZED = "centralized"          # Use platform payment processing
    EXTERNAL = "external"                # Use barber's external processor
    FALLBACK_TO_PLATFORM = "fallback"   # Fallback to platform when external fails
    SPLIT = "split"                      # Split payment between platform and external


class PaymentRoutingError(Exception):
    """Exception raised when payment routing fails"""
    pass


class HybridPaymentRouter:
    """
    Core payment routing service for the hybrid payment system.
    
    Determines whether payments should be processed through:
    1. Centralized platform payment processing (Stripe Connect)
    2. Barber's external payment processor (Stripe, Square, PayPal, etc.)
    3. Fallback scenarios when external processors fail
    4. Split payment scenarios for complex fee structures
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.external_payment_service = ExternalPaymentService(db_session)
        self.platform_payment_service = PaymentService()  # Existing centralized service
    
    def route_payment(
        self,
        appointment_id: int,
        amount: Decimal,
        currency: str = "USD",
        payment_method_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        client_preference: Optional[str] = None
    ) -> Tuple[PaymentRoutingDecision, Dict[str, Any]]:
        """
        Route a payment based on barber's payment mode and system configuration.
        
        Args:
            appointment_id: ID of the appointment being paid for
            amount: Payment amount
            currency: Currency code
            payment_method_data: Payment method information
            metadata: Additional payment metadata
            client_preference: Client's payment preference (if any)
            
        Returns:
            Tuple[PaymentRoutingDecision, Dict]: Routing decision and routing details
        """
        
        try:
            # Get appointment and barber information
            appointment = self._get_appointment_with_barber(appointment_id)
            if not appointment:
                raise PaymentRoutingError(f"Appointment {appointment_id} not found")
            
            barber_id = appointment.barber_id
            
            # Get barber's payment configuration
            payment_config = self._get_payment_configuration(barber_id)
            
            # Make routing decision based on configuration
            routing_decision = self._determine_routing(
                payment_config=payment_config,
                amount=amount,
                currency=currency,
                client_preference=client_preference,
                metadata=metadata
            )
            
            # Get routing details based on decision
            routing_details = self._get_routing_details(
                routing_decision=routing_decision,
                barber_id=barber_id,
                payment_config=payment_config,
                amount=amount,
                currency=currency
            )
            
            logger.info(
                f"Payment routing decision for appointment {appointment_id}: "
                f"{routing_decision.value} (barber_id: {barber_id}, amount: ${amount})"
            )
            
            return routing_decision, routing_details
            
        except Exception as e:
            logger.error(f"Payment routing failed for appointment {appointment_id}: {str(e)}")
            raise PaymentRoutingError(f"Payment routing failed: {str(e)}")
    
    def process_routed_payment(
        self,
        routing_decision: PaymentRoutingDecision,
        routing_details: Dict[str, Any],
        appointment_id: int,
        amount: Decimal,
        currency: str = "USD",
        payment_method_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a payment using the determined routing strategy.
        
        Args:
            routing_decision: How the payment should be routed
            routing_details: Routing configuration details
            appointment_id: ID of the appointment
            amount: Payment amount
            currency: Currency code
            payment_method_data: Payment method information
            metadata: Additional metadata
            
        Returns:
            Dict: Payment processing result
        """
        
        try:
            if routing_decision == PaymentRoutingDecision.CENTRALIZED:
                return self._process_centralized_payment(
                    appointment_id=appointment_id,
                    amount=amount,
                    currency=currency,
                    payment_method_data=payment_method_data,
                    metadata=metadata,
                    routing_details=routing_details
                )
            
            elif routing_decision == PaymentRoutingDecision.EXTERNAL:
                return self._process_external_payment(
                    appointment_id=appointment_id,
                    amount=amount,
                    currency=currency,
                    payment_method_data=payment_method_data,
                    metadata=metadata,
                    routing_details=routing_details
                )
            
            elif routing_decision == PaymentRoutingDecision.FALLBACK_TO_PLATFORM:
                # Try external first, fallback to platform if it fails
                try:
                    return self._process_external_payment(
                        appointment_id=appointment_id,
                        amount=amount,
                        currency=currency,
                        payment_method_data=payment_method_data,
                        metadata=metadata,
                        routing_details=routing_details
                    )
                except Exception as external_error:
                    logger.warning(
                        f"External payment failed, falling back to platform: {str(external_error)}"
                    )
                    return self._process_centralized_payment(
                        appointment_id=appointment_id,
                        amount=amount,
                        currency=currency,
                        payment_method_data=payment_method_data,
                        metadata={**(metadata or {}), 'fallback_reason': str(external_error)},
                        routing_details=routing_details
                    )
            
            elif routing_decision == PaymentRoutingDecision.SPLIT:
                return self._process_split_payment(
                    appointment_id=appointment_id,
                    amount=amount,
                    currency=currency,
                    payment_method_data=payment_method_data,
                    metadata=metadata,
                    routing_details=routing_details
                )
            
            else:
                raise PaymentRoutingError(f"Unsupported routing decision: {routing_decision}")
                
        except Exception as e:
            logger.error(f"Payment processing failed for routing {routing_decision.value}: {str(e)}")
            raise PaymentRoutingError(f"Payment processing failed: {str(e)}")
    
    def get_payment_options(
        self,
        barber_id: int,
        appointment_id: Optional[int] = None,
        amount: Optional[Decimal] = None
    ) -> Dict[str, Any]:
        """
        Get available payment options for a barber/appointment.
        
        Args:
            barber_id: ID of the barber
            appointment_id: Optional appointment ID for context
            amount: Optional amount for fee calculations
            
        Returns:
            Dict: Available payment options and configurations
        """
        
        try:
            # Get barber's payment configuration
            payment_config = self._get_payment_configuration(barber_id)
            
            # Get active external connections
            external_connections = self.external_payment_service.get_barber_connections(
                barber_id=barber_id,
                active_only=True
            )
            
            # Determine available payment methods
            payment_options = {
                "barber_id": barber_id,
                "payment_mode": payment_config["payment_mode"],
                "available_methods": [],
                "default_method": None,
                "fallback_enabled": payment_config.get("fallback_to_platform", False),
                "external_connections": []
            }
            
            # Add platform payment option (always available)
            platform_option = {
                "type": "platform",
                "processor": "stripe_connect",
                "display_name": "Platform Payment",
                "supports_cards": True,
                "supports_ach": True,
                "processing_fee_rate": 0.029,  # 2.9% + 30¢
                "instant_transfer": True,
                "default": payment_config["payment_mode"] == PaymentMode.CENTRALIZED
            }
            payment_options["available_methods"].append(platform_option)
            
            # Add external payment options
            for connection in external_connections:
                external_option = {
                    "type": "external",
                    "processor": connection.processor_type.value,
                    "connection_id": connection.id,
                    "display_name": connection.account_name,
                    "supports_cards": connection.supports_payments,
                    "supports_refunds": connection.supports_refunds,
                    "supports_recurring": connection.supports_recurring,
                    "default_currency": connection.default_currency,
                    "processing_fees": connection.processing_fees,
                    "default": (
                        payment_config["payment_mode"] == PaymentMode.DECENTRALIZED and
                        connection.processor_type == payment_config.get("primary_processor")
                    )
                }
                payment_options["available_methods"].append(external_option)
                payment_options["external_connections"].append({
                    "id": connection.id,
                    "processor_type": connection.processor_type.value,
                    "account_name": connection.account_name,
                    "status": connection.status.value,
                    "total_transactions": connection.total_transactions,
                    "total_volume": float(connection.total_volume)
                })
            
            # Set default method
            default_methods = [method for method in payment_options["available_methods"] if method["default"]]
            if default_methods:
                payment_options["default_method"] = default_methods[0]["type"]
            else:
                payment_options["default_method"] = "platform"  # Fallback to platform
            
            # Add fee calculations if amount provided
            if amount:
                payment_options["fee_breakdown"] = self._calculate_fee_breakdown(
                    payment_config=payment_config,
                    amount=amount,
                    external_connections=external_connections
                )
            
            return payment_options
            
        except Exception as e:
            logger.error(f"Failed to get payment options for barber {barber_id}: {str(e)}")
            raise PaymentRoutingError(f"Failed to get payment options: {str(e)}")
    
    # Private helper methods
    
    def _get_appointment_with_barber(self, appointment_id: int) -> Optional[Appointment]:
        """Get appointment with barber information."""
        result = self.db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        return result.scalar_one_or_none()
    
    def _get_payment_configuration(self, barber_id: int) -> Dict[str, Any]:
        """Get comprehensive payment configuration for a barber."""
        
        # Get barber user record
        result = self.db.execute(
            select(User).where(User.id == barber_id)
        )
        barber = result.scalar_one_or_none()
        
        if not barber:
            raise PaymentRoutingError(f"Barber {barber_id} not found")
        
        # Get hybrid payment config
        result = self.db.execute(
            select(HybridPaymentConfig).where(
                HybridPaymentConfig.barber_id == barber_id
            )
        )
        hybrid_config = result.scalar_one_or_none()
        
        # Build comprehensive configuration
        config = {
            "barber_id": barber_id,
            "payment_mode": PaymentMode(barber.payment_mode) if barber.payment_mode else PaymentMode.CENTRALIZED,
            "external_payment_processor": barber.external_payment_processor,
            "external_account_config": barber.external_account_config or {},
            "collection_preferences": barber.collection_preferences or {},
        }
        
        # Add hybrid config if available
        if hybrid_config:
            config.update({
                "primary_processor": hybrid_config.primary_processor,
                "fallback_to_platform": hybrid_config.fallback_to_platform,
                "collection_method": hybrid_config.collection_method,
                "collection_frequency": hybrid_config.collection_frequency,
                "auto_collection": hybrid_config.auto_collection,
                "minimum_collection_amount": hybrid_config.minimum_collection_amount,
                "maximum_outstanding": hybrid_config.maximum_outstanding,
                "notify_before_collection": hybrid_config.notify_before_collection,
                "notification_days_ahead": hybrid_config.notification_days_ahead
            })
        else:
            # Default hybrid config
            config.update({
                "primary_processor": None,
                "fallback_to_platform": True,
                "collection_method": "ach",
                "collection_frequency": "weekly",
                "auto_collection": True,
                "minimum_collection_amount": Decimal("10.0"),
                "maximum_outstanding": Decimal("1000.0"),
                "notify_before_collection": True,
                "notification_days_ahead": 2
            })
        
        return config
    
    def _determine_routing(
        self,
        payment_config: Dict[str, Any],
        amount: Decimal,
        currency: str,
        client_preference: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> PaymentRoutingDecision:
        """Determine how to route the payment based on configuration."""
        
        payment_mode = payment_config["payment_mode"]
        
        # Centralized mode: always use platform
        if payment_mode == PaymentMode.CENTRALIZED:
            return PaymentRoutingDecision.CENTRALIZED
        
        # Decentralized mode: use external processor
        elif payment_mode == PaymentMode.DECENTRALIZED:
            # Check if barber has active external connections
            barber_id = payment_config["barber_id"]
            connections = self.external_payment_service.get_barber_connections(
                barber_id=barber_id,
                active_only=True
            )
            
            if not connections:
                # No external connections, fallback to platform if enabled
                if payment_config.get("fallback_to_platform", True):
                    return PaymentRoutingDecision.FALLBACK_TO_PLATFORM
                else:
                    raise PaymentRoutingError(
                        f"Barber {barber_id} is in decentralized mode but has no active payment processor connections"
                    )
            
            return PaymentRoutingDecision.EXTERNAL
        
        # Hybrid mode: intelligent routing based on rules
        elif payment_mode == PaymentMode.HYBRID:
            return self._determine_hybrid_routing(
                payment_config=payment_config,
                amount=amount,
                currency=currency,
                client_preference=client_preference,
                metadata=metadata
            )
        
        else:
            raise PaymentRoutingError(f"Unknown payment mode: {payment_mode}")
    
    def _determine_hybrid_routing(
        self,
        payment_config: Dict[str, Any],
        amount: Decimal,
        currency: str,
        client_preference: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> PaymentRoutingDecision:
        """Determine routing for hybrid payment mode using business rules."""
        
        # Hybrid mode routing rules (can be customized per barber)
        
        # Rule 1: Client preference
        if client_preference == "platform":
            return PaymentRoutingDecision.CENTRALIZED
        elif client_preference == "external":
            return PaymentRoutingDecision.EXTERNAL
        
        # Rule 2: Amount-based routing
        minimum_external_amount = payment_config.get("minimum_external_amount", Decimal("50.0"))
        if amount < minimum_external_amount:
            return PaymentRoutingDecision.CENTRALIZED  # Small amounts go through platform
        
        # Rule 3: Service type routing (if metadata contains service info)
        if metadata and metadata.get("service_type"):
            service_type = metadata["service_type"]
            premium_services = ["premium_cut", "wedding_package", "consultation"]
            if service_type in premium_services:
                return PaymentRoutingDecision.EXTERNAL  # Premium services through external
        
        # Rule 4: Time-based routing (business hours vs after hours)
        current_hour = datetime.now().hour
        if 9 <= current_hour <= 17:  # Business hours
            return PaymentRoutingDecision.EXTERNAL
        else:
            return PaymentRoutingDecision.CENTRALIZED  # After hours through platform
        
        # Default: Use primary processor or external
        if payment_config.get("primary_processor"):
            return PaymentRoutingDecision.EXTERNAL
        else:
            return PaymentRoutingDecision.CENTRALIZED
    
    def _get_routing_details(
        self,
        routing_decision: PaymentRoutingDecision,
        barber_id: int,
        payment_config: Dict[str, Any],
        amount: Decimal,
        currency: str
    ) -> Dict[str, Any]:
        """Get detailed routing configuration for the payment."""
        
        routing_details = {
            "routing_decision": routing_decision.value,
            "barber_id": barber_id,
            "amount": amount,
            "currency": currency,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if routing_decision in [PaymentRoutingDecision.EXTERNAL, PaymentRoutingDecision.FALLBACK_TO_PLATFORM]:
            # Get primary external connection
            connections = self.external_payment_service.get_barber_connections(
                barber_id=barber_id,
                active_only=True
            )
            
            primary_connection = None
            if payment_config.get("primary_processor"):
                # Find connection for primary processor
                primary_connection = next(
                    (conn for conn in connections if conn.processor_type == payment_config["primary_processor"]),
                    None
                )
            
            if not primary_connection and connections:
                # Use first available connection
                primary_connection = connections[0]
            
            if primary_connection:
                routing_details.update({
                    "external_connection_id": primary_connection.id,
                    "external_processor": primary_connection.processor_type.value,
                    "external_account_id": primary_connection.account_id,
                    "supports_refunds": primary_connection.supports_refunds,
                    "default_currency": primary_connection.default_currency,
                    "processing_fees": primary_connection.processing_fees
                })
            else:
                raise PaymentRoutingError(f"No external payment processor available for barber {barber_id}")
        
        if routing_decision in [PaymentRoutingDecision.CENTRALIZED, PaymentRoutingDecision.FALLBACK_TO_PLATFORM]:
            routing_details.update({
                "platform_processor": "stripe_connect",
                "platform_account": settings.stripe_account_id if hasattr(settings, 'stripe_account_id') else None,
                "centralized_processing": True
            })
        
        # Add commission information
        commission_rate = self._calculate_commission_rate(barber_id, amount)
        commission_amount = amount * (commission_rate / 100)
        
        routing_details.update({
            "commission_rate": commission_rate,
            "commission_amount": commission_amount,
            "net_amount": amount - commission_amount
        })
        
        return routing_details
    
    def _process_centralized_payment(
        self,
        appointment_id: int,
        amount: Decimal,
        currency: str,
        payment_method_data: Optional[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]],
        routing_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process payment through centralized platform."""
        
        # Use existing platform payment service
        try:
            # This would integrate with the existing PaymentService
            # For now, return a mock successful result
            result = {
                "payment_type": "centralized",
                "status": "succeeded",
                "platform_payment_id": f"pi_mock_{datetime.now().timestamp()}",
                "amount": amount,
                "currency": currency,
                "processing_fee": amount * Decimal("0.029") + Decimal("0.30"),  # Stripe fees
                "net_amount": amount - (amount * Decimal("0.029") + Decimal("0.30")),
                "routing_details": routing_details,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Centralized payment processed for appointment {appointment_id}: ${amount}")
            return result
            
        except Exception as e:
            logger.error(f"Centralized payment failed for appointment {appointment_id}: {str(e)}")
            raise PaymentRoutingError(f"Centralized payment failed: {str(e)}")
    
    def _process_external_payment(
        self,
        appointment_id: int,
        amount: Decimal,
        currency: str,
        payment_method_data: Optional[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]],
        routing_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process payment through external payment processor."""
        
        try:
            # Use external payment service
            external_transaction = self.external_payment_service.process_external_payment(
                appointment_id=appointment_id,
                amount=amount,
                currency=currency,
                payment_method_data=payment_method_data,
                metadata=metadata
            )
            
            result = {
                "payment_type": "external",
                "status": external_transaction.status,
                "external_transaction_id": external_transaction.external_transaction_id,
                "external_processor": routing_details.get("external_processor"),
                "amount": external_transaction.amount,
                "currency": external_transaction.currency,
                "processing_fee": external_transaction.processing_fee,
                "net_amount": external_transaction.net_amount,
                "commission_amount": external_transaction.commission_amount,
                "commission_collected": external_transaction.commission_collected,
                "routing_details": routing_details,
                "processed_at": external_transaction.processed_at.isoformat() if external_transaction.processed_at else None
            }
            
            logger.info(
                f"External payment processed for appointment {appointment_id}: "
                f"${amount} via {routing_details.get('external_processor')}"
            )
            return result
            
        except Exception as e:
            logger.error(f"External payment failed for appointment {appointment_id}: {str(e)}")
            raise PaymentRoutingError(f"External payment failed: {str(e)}")
    
    def _process_split_payment(
        self,
        appointment_id: int,
        amount: Decimal,
        currency: str,
        payment_method_data: Optional[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]],
        routing_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process split payment (external + platform for fees)."""
        
        # Split payment implementation would go here
        # This is a complex scenario for future enhancement
        raise PaymentRoutingError("Split payment processing not yet implemented")
    
    def _calculate_commission_rate(self, barber_id: int, amount: Decimal) -> Decimal:
        """Calculate commission rate for a barber."""
        # Default commission rate based on Six Figure Barber methodology
        default_rate = Decimal("15.0")  # 15% platform commission
        
        # This could be enhanced to use dynamic commission rates based on:
        # - Barber tier/performance
        # - Service type
        # - Volume discounts
        # - Promotional rates
        
        return default_rate
    
    def _calculate_fee_breakdown(
        self,
        payment_config: Dict[str, Any],
        amount: Decimal,
        external_connections: List[PaymentProcessorConnection]
    ) -> Dict[str, Any]:
        """Calculate fee breakdown for different payment options."""
        
        fee_breakdown = {
            "amount": amount,
            "currency": "USD",
            "options": []
        }
        
        # Platform fees
        platform_processing_fee = amount * Decimal("0.029") + Decimal("0.30")  # Stripe fees
        platform_commission = amount * self._calculate_commission_rate(payment_config["barber_id"], amount) / 100
        
        fee_breakdown["options"].append({
            "type": "platform",
            "processing_fee": platform_processing_fee,
            "commission_fee": platform_commission,
            "total_fees": platform_processing_fee + platform_commission,
            "net_amount": amount - platform_processing_fee - platform_commission
        })
        
        # External processor fees
        for connection in external_connections:
            processing_fees = connection.processing_fees or {}
            processing_fee_rate = Decimal(str(processing_fees.get("rate", 0.029)))  # Default 2.9%
            processing_fee_fixed = Decimal(str(processing_fees.get("fixed", 0.30)))  # Default 30¢
            
            external_processing_fee = amount * processing_fee_rate + processing_fee_fixed
            external_commission = amount * self._calculate_commission_rate(payment_config["barber_id"], amount) / 100
            
            fee_breakdown["options"].append({
                "type": "external",
                "processor": connection.processor_type.value,
                "connection_id": connection.id,
                "processing_fee": external_processing_fee,
                "commission_fee": external_commission,
                "total_fees": external_processing_fee + external_commission,
                "net_amount": amount - external_processing_fee - external_commission
            })
        
        return fee_breakdown