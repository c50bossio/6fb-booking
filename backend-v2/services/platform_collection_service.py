"""
Platform Collection Service
Handles automated collection of commissions and booth rent from decentralized barbers
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func, update
from sqlalchemy.orm import selectinload

from models.hybrid_payment import (
    PlatformCollection, ExternalTransaction, PaymentProcessorConnection,
    HybridPaymentConfig, CollectionType, CollectionStatus,
    PaymentMode, ExternalPaymentProcessor
)
from models import User, Appointment
from services.payment_gateways.gateway_factory import GatewayFactory
from services.payment_gateways.stripe_gateway import StripeGateway
from config import settings

logger = logging.getLogger(__name__)


class CollectionError(Exception):
    """Exception raised when collection processing fails"""
    pass


class PlatformCollectionService:
    """
    Service for automated collection of commissions and booth rent from barbers.
    
    Handles:
    - Commission collection from external payment processor transactions
    - Booth rental fee collection (weekly/monthly)
    - ACH collection via Stripe Connect
    - Collection scheduling and retry logic
    - Outstanding balance tracking
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.gateway_factory = GatewayFactory()
        # Use platform Stripe for ACH collections
        try:
            stripe_config = {
                'publishable_key': getattr(settings, 'stripe_publishable_key', ''),
                'secret_key': getattr(settings, 'stripe_secret_key', ''),
                'webhook_secret': getattr(settings, 'stripe_webhook_secret', ''),
                'api_key': getattr(settings, 'stripe_secret_key', '')  # Required by StripeGateway
            }
            # Only initialize if we have a valid API key
            if stripe_config['api_key']:
                self.platform_gateway = StripeGateway(stripe_config)
            else:
                logger.warning("Stripe API key not configured - platform collection service running in mock mode")
                self.platform_gateway = None
        except Exception as e:
            logger.warning(f"Failed to initialize Stripe gateway: {e} - running in mock mode")
            self.platform_gateway = None
    
    def calculate_outstanding_commission(
        self,
        barber_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Calculate outstanding commission for a barber from external transactions.
        
        Args:
            barber_id: ID of the barber
            start_date: Start date for calculation (defaults to last collection)
            end_date: End date for calculation (defaults to now)
            
        Returns:
            Dict with commission calculation details
        """
        
        try:
            # Get last collection date if start_date not provided
            if not start_date:
                last_collection = self._get_last_collection(barber_id, CollectionType.COMMISSION)
                start_date = last_collection.collected_at if last_collection else datetime.now(timezone.utc) - timedelta(days=30)
            
            if not end_date:
                end_date = datetime.now(timezone.utc)
            
            # Get uncollected external transactions
            uncollected_transactions = self.db.execute(
                select(ExternalTransaction)
                .join(PaymentProcessorConnection)
                .where(
                    and_(
                        PaymentProcessorConnection.barber_id == barber_id,
                        ExternalTransaction.processed_at >= start_date,
                        ExternalTransaction.processed_at <= end_date,
                        ExternalTransaction.commission_collected == False,
                        ExternalTransaction.status.in_(['succeeded', 'completed'])
                    )
                )
                .options(selectinload(ExternalTransaction.connection))
            ).scalars().all()
            
            total_commission = Decimal('0')
            transaction_count = 0
            total_transaction_volume = Decimal('0')
            transactions_detail = []
            
            for transaction in uncollected_transactions:
                commission = transaction.commission_amount or Decimal('0')
                total_commission += commission
                total_transaction_volume += transaction.amount
                transaction_count += 1
                
                transactions_detail.append({
                    'transaction_id': transaction.id,
                    'external_transaction_id': transaction.external_transaction_id,
                    'appointment_id': transaction.appointment_id,
                    'amount': float(transaction.amount),
                    'commission_rate': float(transaction.commission_rate),
                    'commission_amount': float(commission),
                    'processed_at': transaction.processed_at.isoformat() if transaction.processed_at else None,
                    'processor': transaction.connection.processor_type.value
                })
            
            # Get barber's collection configuration
            config = self._get_collection_config(barber_id)
            minimum_collection = config.minimum_collection_amount if config else Decimal('10.0')
            
            return {
                'barber_id': barber_id,
                'calculation_period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                },
                'commission_summary': {
                    'total_commission_owed': float(total_commission),
                    'transaction_count': transaction_count,
                    'total_transaction_volume': float(total_transaction_volume),
                    'average_commission_rate': float(total_commission / total_transaction_volume * 100) if total_transaction_volume > 0 else 0
                },
                'collection_eligibility': {
                    'meets_minimum_threshold': total_commission >= minimum_collection,
                    'minimum_collection_amount': float(minimum_collection),
                    'can_collect_now': total_commission >= minimum_collection
                },
                'transactions': transactions_detail
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate outstanding commission for barber {barber_id}: {str(e)}")
            raise CollectionError(f"Commission calculation failed: {str(e)}")
    
    def calculate_booth_rent(
        self,
        barber_id: int,
        rent_period_start: datetime,
        rent_period_end: datetime
    ) -> Dict[str, Any]:
        """
        Calculate booth rent for a specific period.
        
        Args:
            barber_id: ID of the barber
            rent_period_start: Start of rent period
            rent_period_end: End of rent period
            
        Returns:
            Dict with booth rent calculation details
        """
        
        try:
            # Get barber's collection configuration
            config = self._get_collection_config(barber_id)
            if not config or not config.booth_rent_amount:
                return {
                    'barber_id': barber_id,
                    'rent_period': {
                        'start': rent_period_start.isoformat(),
                        'end': rent_period_end.isoformat()
                    },
                    'booth_rent': {
                        'amount': 0,
                        'configured': False,
                        'reason': 'No booth rent configured for this barber'
                    }
                }
            
            # Calculate period length in days
            period_days = (rent_period_end - rent_period_start).days
            
            # Determine rent amount based on frequency
            if config.collection_frequency == 'weekly':
                # Weekly rent
                weeks = period_days / 7
                total_rent = config.booth_rent_amount * Decimal(str(weeks))
            elif config.collection_frequency == 'monthly':
                # Monthly rent (assume 30 days per month)
                months = period_days / 30
                total_rent = config.booth_rent_amount * Decimal(str(months))
            else:
                # Daily rent calculation
                total_rent = config.booth_rent_amount * Decimal(str(period_days))
            
            # Check if rent was already collected for this period
            existing_collection = self.db.execute(
                select(PlatformCollection)
                .where(
                    and_(
                        PlatformCollection.barber_id == barber_id,
                        PlatformCollection.collection_type == CollectionType.BOOTH_RENT,
                        PlatformCollection.period_start <= rent_period_start,
                        PlatformCollection.period_end >= rent_period_end,
                        PlatformCollection.status.in_([CollectionStatus.COLLECTED, CollectionStatus.PENDING])
                    )
                )
            ).scalar_one_or_none()
            
            already_collected = existing_collection is not None
            
            return {
                'barber_id': barber_id,
                'rent_period': {
                    'start': rent_period_start.isoformat(),
                    'end': rent_period_end.isoformat(),
                    'days': period_days
                },
                'booth_rent': {
                    'amount': float(total_rent),
                    'frequency': config.collection_frequency,
                    'base_amount': float(config.booth_rent_amount),
                    'already_collected': already_collected,
                    'existing_collection_id': existing_collection.id if existing_collection else None
                },
                'collection_config': {
                    'auto_collection': config.auto_collection,
                    'collection_method': config.collection_method,
                    'minimum_amount': float(config.minimum_collection_amount)
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate booth rent for barber {barber_id}: {str(e)}")
            raise CollectionError(f"Booth rent calculation failed: {str(e)}")
    
    def create_collection(
        self,
        barber_id: int,
        collection_type: CollectionType,
        amount: Decimal,
        description: str,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
        related_transaction_ids: Optional[List[int]] = None,
        auto_collect: bool = True
    ) -> PlatformCollection:
        """
        Create a new platform collection record.
        
        Args:
            barber_id: ID of the barber
            collection_type: Type of collection (commission, booth_rent, etc.)
            amount: Amount to collect
            description: Description of the collection
            period_start: Start of collection period
            period_end: End of collection period
            related_transaction_ids: IDs of related external transactions
            auto_collect: Whether to automatically attempt collection
            
        Returns:
            PlatformCollection: Created collection record
        """
        
        try:
            # Validate barber exists
            barber = self._get_barber(barber_id)
            if not barber:
                raise CollectionError(f"Barber {barber_id} not found")
            
            # Get collection configuration
            config = self._get_collection_config(barber_id)
            if not config:
                raise CollectionError(f"No collection configuration found for barber {barber_id}")
            
            # Create collection record
            collection = PlatformCollection(
                barber_id=barber_id,
                collection_type=collection_type,
                amount=amount,
                currency='USD',
                description=description,
                status=CollectionStatus.PENDING,
                collection_method=config.collection_method or 'ach',
                scheduled_date=datetime.now(timezone.utc) if auto_collect else None,
                period_start=period_start,
                period_end=period_end,
                related_external_transaction_ids=related_transaction_ids or [],
                collection_config={
                    'auto_collection': auto_collect,
                    'notification_sent': False,
                    'retry_count': 0,
                    'max_retries': 3
                }
            )
            
            self.db.add(collection)
            self.db.flush()
            
            # If auto-collect enabled, attempt immediate collection
            if auto_collect and config.auto_collection:
                try:
                    self._attempt_collection(collection.id)
                except Exception as e:
                    logger.warning(f"Auto-collection failed for collection {collection.id}: {str(e)}")
                    # Don't fail the entire operation if auto-collection fails
            
            self.db.commit()
            
            logger.info(
                f"Created {collection_type.value} collection for barber {barber_id}: "
                f"${amount} (ID: {collection.id})"
            )
            
            return collection
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create collection for barber {barber_id}: {str(e)}")
            raise CollectionError(f"Collection creation failed: {str(e)}")
    
    def process_scheduled_collections(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Process collections that are scheduled for today.
        
        Args:
            limit: Maximum number of collections to process
            
        Returns:
            List of processing results
        """
        
        try:
            # Get collections scheduled for processing
            today = datetime.now(timezone.utc).date()
            
            scheduled_collections = self.db.execute(
                select(PlatformCollection)
                .where(
                    and_(
                        PlatformCollection.status == CollectionStatus.PENDING,
                        PlatformCollection.scheduled_date <= datetime.now(timezone.utc),
                        or_(
                            PlatformCollection.collection_config['retry_count'].as_integer() < 3,
                            PlatformCollection.collection_config['retry_count'].is_(None)
                        )
                    )
                )
                .order_by(PlatformCollection.scheduled_date.asc())
                .limit(limit)
            ).scalars().all()
            
            results = []
            
            for collection in scheduled_collections:
                try:
                    result = self._attempt_collection(collection.id)
                    results.append({
                        'collection_id': collection.id,
                        'barber_id': collection.barber_id,
                        'amount': float(collection.amount),
                        'status': result['status'],
                        'success': result['success'],
                        'message': result.get('message', ''),
                        'transaction_id': result.get('transaction_id')
                    })
                    
                except Exception as e:
                    logger.error(f"Failed to process collection {collection.id}: {str(e)}")
                    results.append({
                        'collection_id': collection.id,
                        'barber_id': collection.barber_id,
                        'amount': float(collection.amount),
                        'status': 'failed',
                        'success': False,
                        'message': str(e),
                        'error': True
                    })
            
            logger.info(f"Processed {len(results)} scheduled collections")
            return results
            
        except Exception as e:
            logger.error(f"Failed to process scheduled collections: {str(e)}")
            raise CollectionError(f"Scheduled collection processing failed: {str(e)}")
    
    def retry_failed_collection(self, collection_id: int) -> Dict[str, Any]:
        """
        Retry a failed collection.
        
        Args:
            collection_id: ID of the collection to retry
            
        Returns:
            Dict with retry result
        """
        
        try:
            collection = self.db.execute(
                select(PlatformCollection).where(PlatformCollection.id == collection_id)
            ).scalar_one_or_none()
            
            if not collection:
                raise CollectionError(f"Collection {collection_id} not found")
            
            if collection.status not in [CollectionStatus.FAILED, CollectionStatus.PENDING]:
                raise CollectionError(f"Collection {collection_id} cannot be retried (status: {collection.status.value})")
            
            # Check retry limit
            retry_count = collection.collection_config.get('retry_count', 0) if collection.collection_config else 0
            max_retries = collection.collection_config.get('max_retries', 3) if collection.collection_config else 3
            
            if retry_count >= max_retries:
                raise CollectionError(f"Collection {collection_id} has exceeded maximum retry attempts ({max_retries})")
            
            # Attempt collection
            result = self._attempt_collection(collection_id)
            
            logger.info(f"Retried collection {collection_id}: {result['status']}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to retry collection {collection_id}: {str(e)}")
            raise CollectionError(f"Collection retry failed: {str(e)}")
    
    def generate_commission_collections(self, barber_id: Optional[int] = None) -> List[PlatformCollection]:
        """
        Generate commission collections for barbers with outstanding commissions.
        
        Args:
            barber_id: Optional specific barber ID (processes all barbers if None)
            
        Returns:
            List of created collection records
        """
        
        try:
            # Get barbers with decentralized payment mode
            query = select(User).where(
                and_(
                    User.role == 'barber',
                    User.payment_mode == PaymentMode.DECENTRALIZED.value
                )
            )
            
            if barber_id:
                query = query.where(User.id == barber_id)
            
            barbers = self.db.execute(query).scalars().all()
            
            created_collections = []
            
            for barber in barbers:
                try:
                    # Calculate outstanding commission
                    commission_data = self.calculate_outstanding_commission(barber.id)
                    
                    # Check if collection is eligible
                    if not commission_data['collection_eligibility']['can_collect_now']:
                        logger.debug(f"Skipping commission collection for barber {barber.id}: below minimum threshold")
                        continue
                    
                    total_commission = Decimal(str(commission_data['commission_summary']['total_commission_owed']))
                    transaction_ids = [t['transaction_id'] for t in commission_data['transactions']]
                    
                    # Create collection
                    collection = self.create_collection(
                        barber_id=barber.id,
                        collection_type=CollectionType.COMMISSION,
                        amount=total_commission,
                        description=f"Commission collection for {commission_data['commission_summary']['transaction_count']} transactions",
                        period_start=datetime.fromisoformat(commission_data['calculation_period']['start_date']),
                        period_end=datetime.fromisoformat(commission_data['calculation_period']['end_date']),
                        related_transaction_ids=transaction_ids,
                        auto_collect=True
                    )
                    
                    created_collections.append(collection)
                    
                except Exception as e:
                    logger.error(f"Failed to create commission collection for barber {barber.id}: {str(e)}")
                    continue
            
            logger.info(f"Generated {len(created_collections)} commission collections")
            return created_collections
            
        except Exception as e:
            logger.error(f"Failed to generate commission collections: {str(e)}")
            raise CollectionError(f"Commission collection generation failed: {str(e)}")
    
    # Private helper methods
    
    def _attempt_collection(self, collection_id: int) -> Dict[str, Any]:
        """Attempt to collect payment for a specific collection."""
        
        try:
            collection = self.db.execute(
                select(PlatformCollection).where(PlatformCollection.id == collection_id)
            ).scalar_one_or_none()
            
            if not collection:
                raise CollectionError(f"Collection {collection_id} not found")
            
            # Get barber information
            barber = self._get_barber(collection.barber_id)
            if not barber:
                raise CollectionError(f"Barber {collection.barber_id} not found")
            
            # Update retry count
            if not collection.collection_config:
                collection.collection_config = {}
            
            retry_count = collection.collection_config.get('retry_count', 0)
            collection.collection_config['retry_count'] = retry_count + 1
            collection.collection_config['last_attempt'] = datetime.now(timezone.utc).isoformat()
            
            # Update status to processing
            collection.status = CollectionStatus.PROCESSING
            collection.attempted_at = datetime.now(timezone.utc)
            
            self.db.flush()
            
            # Process collection based on method
            if collection.collection_method == 'ach':
                result = self._process_ach_collection(collection)
            elif collection.collection_method == 'card':
                result = self._process_card_collection(collection)
            else:
                raise CollectionError(f"Unsupported collection method: {collection.collection_method}")
            
            # Update collection with result
            if result['success']:
                collection.status = CollectionStatus.COLLECTED
                collection.collected_at = datetime.now(timezone.utc)
                collection.platform_transaction_id = result.get('transaction_id')
                collection.processing_fee = result.get('processing_fee', Decimal('0'))
                collection.net_amount = collection.amount - collection.processing_fee
                
                # Mark related external transactions as commission collected
                if collection.related_external_transaction_ids:
                    self.db.execute(
                        update(ExternalTransaction)
                        .where(ExternalTransaction.id.in_(collection.related_external_transaction_ids))
                        .values(commission_collected=True, commission_collected_at=datetime.now(timezone.utc))
                    )
                
            else:
                collection.status = CollectionStatus.FAILED
                collection.failure_reason = result.get('error_message', 'Unknown error')
                
                # Schedule retry if under limit
                max_retries = collection.collection_config.get('max_retries', 3)
                if retry_count < max_retries:
                    # Exponential backoff: 1 hour, 4 hours, 24 hours
                    retry_delay_hours = 2 ** retry_count
                    collection.scheduled_date = datetime.now(timezone.utc) + timedelta(hours=retry_delay_hours)
                    collection.status = CollectionStatus.PENDING
            
            self.db.commit()
            
            return result
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to attempt collection {collection_id}: {str(e)}")
            raise CollectionError(f"Collection attempt failed: {str(e)}")
    
    def _process_ach_collection(self, collection: PlatformCollection) -> Dict[str, Any]:
        """Process ACH collection via Stripe."""
        
        try:
            # Get barber's bank account information from collection config
            config = self._get_collection_config(collection.barber_id)
            if not config or not config.collection_bank_account:
                raise CollectionError("No bank account configured for ACH collection")
            
            bank_account = config.collection_bank_account
            
            # Create ACH debit via Stripe
            payment_result = self.platform_gateway.create_payment_intent(
                amount=collection.amount,
                currency=collection.currency,
                payment_method={
                    'type': 'ach_debit',
                    'bank_account': bank_account
                },
                metadata={
                    'collection_id': collection.id,
                    'barber_id': collection.barber_id,
                    'collection_type': collection.collection_type.value,
                    'platform': 'bookedbarber_collections'
                }
            )
            
            if payment_result.status.value == 'succeeded':
                return {
                    'success': True,
                    'status': 'succeeded',
                    'transaction_id': payment_result.gateway_transaction_id,
                    'processing_fee': payment_result.fees,
                    'net_amount': payment_result.net_amount
                }
            else:
                return {
                    'success': False,
                    'status': payment_result.status.value,
                    'error_message': getattr(payment_result, 'error_message', 'ACH collection failed')
                }
                
        except Exception as e:
            logger.error(f"ACH collection failed for collection {collection.id}: {str(e)}")
            return {
                'success': False,
                'status': 'failed',
                'error_message': str(e)
            }
    
    def _process_card_collection(self, collection: PlatformCollection) -> Dict[str, Any]:
        """Process card collection via Stripe."""
        
        try:
            # Get barber's saved payment method
            config = self._get_collection_config(collection.barber_id)
            if not config or not config.collection_payment_method:
                raise CollectionError("No payment method configured for card collection")
            
            # Create payment via Stripe
            payment_result = self.platform_gateway.create_payment_intent(
                amount=collection.amount,
                currency=collection.currency,
                payment_method_id=config.collection_payment_method,
                metadata={
                    'collection_id': collection.id,
                    'barber_id': collection.barber_id,
                    'collection_type': collection.collection_type.value,
                    'platform': 'bookedbarber_collections'
                }
            )
            
            if payment_result.status.value == 'succeeded':
                return {
                    'success': True,
                    'status': 'succeeded',
                    'transaction_id': payment_result.gateway_transaction_id,
                    'processing_fee': payment_result.fees,
                    'net_amount': payment_result.net_amount
                }
            else:
                return {
                    'success': False,
                    'status': payment_result.status.value,
                    'error_message': getattr(payment_result, 'error_message', 'Card collection failed')
                }
                
        except Exception as e:
            logger.error(f"Card collection failed for collection {collection.id}: {str(e)}")
            return {
                'success': False,
                'status': 'failed',
                'error_message': str(e)
            }
    
    def _get_barber(self, barber_id: int) -> Optional[User]:
        """Get barber user record."""
        result = self.db.execute(
            select(User).where(User.id == barber_id)
        )
        return result.scalar_one_or_none()
    
    def _get_collection_config(self, barber_id: int) -> Optional[HybridPaymentConfig]:
        """Get barber's collection configuration."""
        result = self.db.execute(
            select(HybridPaymentConfig).where(
                HybridPaymentConfig.barber_id == barber_id
            )
        )
        return result.scalar_one_or_none()
    
    def _get_last_collection(
        self,
        barber_id: int,
        collection_type: CollectionType
    ) -> Optional[PlatformCollection]:
        """Get the last successful collection for a barber and type."""
        result = self.db.execute(
            select(PlatformCollection)
            .where(
                and_(
                    PlatformCollection.barber_id == barber_id,
                    PlatformCollection.collection_type == collection_type,
                    PlatformCollection.status == CollectionStatus.COLLECTED
                )
            )
            .order_by(PlatformCollection.collected_at.desc())
        )
        return result.scalar_one_or_none()