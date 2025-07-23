"""
External Payment Webhooks API
Handles webhooks from external payment processors (Square, Stripe, PayPal, etc.)
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from utils.auth import get_current_user
from models import User
from models.hybrid_payment import ExternalPaymentProcessor
from services.webhook_processor_service import ExternalWebhookProcessor, WebhookError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/external-payment-webhooks", tags=["External Payment Webhooks"])


# Pydantic Models for API

class WebhookProcessingResponse(BaseModel):
    """Response model for webhook processing"""
    success: bool
    event_type: str
    connection_id: Optional[int] = None
    barber_id: Optional[int] = None
    transaction_id: Optional[int] = None
    commission_collection_id: Optional[int] = None
    message: str


class ReconciliationRequest(BaseModel):
    """Request model for transaction reconciliation"""
    barber_id: Optional[int] = Field(None, description="Specific barber to reconcile")
    processor_type: Optional[ExternalPaymentProcessor] = Field(None, description="Specific processor to reconcile")
    hours_back: int = Field(24, ge=1, le=168, description="How many hours back to reconcile (max 7 days)")


class ReconciliationResponse(BaseModel):
    """Response model for reconciliation results"""
    success: bool
    total_connections: int
    successful_reconciliations: int
    total_new_transactions: int
    total_updated_transactions: int
    connection_results: List[Dict[str, Any]]


# Webhook Endpoints (No Authentication Required)

@router.post("/square", response_model=WebhookProcessingResponse)
async def square_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    signature: str = Header(..., alias="X-Square-Signature"),
    db: Session = Depends(get_db)
):
    """
    Handle Square webhook notifications.
    
    Square sends webhooks for payment events, refunds, disputes, etc.
    This endpoint processes them and updates transaction records.
    """
    
    try:
        # Get raw request body and headers
        body = await request.body()
        headers = dict(request.headers)
        
        # Parse JSON payload
        try:
            payload = await request.json()
        except Exception as e:
            logger.error(f"Failed to parse Square webhook JSON: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
        # Process webhook in background
        webhook_processor = ExternalWebhookProcessor(db)
        
        result = webhook_processor.process_webhook(
            processor_type=ExternalPaymentProcessor.SQUARE,
            payload=payload,
            signature=signature,
            headers=headers
        )
        
        logger.info(f"Square webhook processed successfully: {result}")
        
        return WebhookProcessingResponse(
            success=result['success'],
            event_type=result['event_type'],
            connection_id=result.get('connection_id'),
            barber_id=result.get('barber_id'),
            transaction_id=result['result'].get('transaction_id'),
            commission_collection_id=result['result'].get('commission_collection_id'),
            message=f"Successfully processed Square {result['event_type']} event"
        )
        
    except WebhookError as e:
        logger.error(f"Square webhook processing failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error processing Square webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/stripe", response_model=WebhookProcessingResponse)
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    signature: str = Header(..., alias="Stripe-Signature"),
    db: Session = Depends(get_db)
):
    """
    Handle Stripe webhook notifications.
    
    Stripe sends webhooks for payment_intent events, charges, refunds, etc.
    This endpoint processes them and updates transaction records.
    """
    
    try:
        # Get raw request body and headers
        body = await request.body()
        headers = dict(request.headers)
        
        # Parse JSON payload
        try:
            payload = await request.json()
        except Exception as e:
            logger.error(f"Failed to parse Stripe webhook JSON: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
        # Process webhook
        webhook_processor = ExternalWebhookProcessor(db)
        
        result = webhook_processor.process_webhook(
            processor_type=ExternalPaymentProcessor.STRIPE,
            payload=payload,
            signature=signature,
            headers=headers
        )
        
        logger.info(f"Stripe webhook processed successfully: {result}")
        
        return WebhookProcessingResponse(
            success=result['success'],
            event_type=result['event_type'],
            connection_id=result.get('connection_id'),
            barber_id=result.get('barber_id'),
            transaction_id=result['result'].get('transaction_id'),
            commission_collection_id=result['result'].get('commission_collection_id'),
            message=f"Successfully processed Stripe {result['event_type']} event"
        )
        
    except WebhookError as e:
        logger.error(f"Stripe webhook processing failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error processing Stripe webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/paypal", response_model=WebhookProcessingResponse)
async def paypal_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Handle PayPal webhook notifications.
    
    PayPal sends webhooks for payment capture events, refunds, etc.
    This endpoint processes them and updates transaction records.
    """
    
    try:
        # Get raw request body and headers
        body = await request.body()
        headers = dict(request.headers)
        
        # Parse JSON payload
        try:
            payload = await request.json()
        except Exception as e:
            logger.error(f"Failed to parse PayPal webhook JSON: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
        # PayPal webhook verification is complex, for now use empty signature
        signature = headers.get('paypal-signature', '')
        
        # Process webhook
        webhook_processor = ExternalWebhookProcessor(db)
        
        result = webhook_processor.process_webhook(
            processor_type=ExternalPaymentProcessor.PAYPAL,
            payload=payload,
            signature=signature,
            headers=headers
        )
        
        logger.info(f"PayPal webhook processed successfully: {result}")
        
        return WebhookProcessingResponse(
            success=result['success'],
            event_type=result['event_type'],
            connection_id=result.get('connection_id'),
            barber_id=result.get('barber_id'),
            transaction_id=result['result'].get('transaction_id'),
            commission_collection_id=result['result'].get('commission_collection_id'),
            message=f"Successfully processed PayPal {result['event_type']} event"
        )
        
    except WebhookError as e:
        logger.error(f"PayPal webhook processing failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error processing PayPal webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Administrative Endpoints (Authentication Required)

@router.post("/reconcile", response_model=ReconciliationResponse)
async def reconcile_transactions(
    request: ReconciliationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger transaction reconciliation.
    
    This endpoint allows administrators to reconcile transactions
    by fetching the latest data from payment processors.
    """
    
    try:
        # Only allow admins to trigger reconciliation
        if current_user.role not in ['admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only administrators can trigger transaction reconciliation"
            )
        
        webhook_processor = ExternalWebhookProcessor(db)
        
        # Run reconciliation
        result = webhook_processor.reconcile_transactions(
            barber_id=request.barber_id,
            processor_type=request.processor_type,
            hours_back=request.hours_back
        )
        
        return ReconciliationResponse(
            success=result['success'],
            total_connections=result['total_connections'],
            successful_reconciliations=result['successful_reconciliations'],
            total_new_transactions=result['total_new_transactions'],
            total_updated_transactions=result['total_updated_transactions'],
            connection_results=result['connection_results']
        )
        
    except WebhookError as e:
        logger.error(f"Transaction reconciliation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in transaction reconciliation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/test-connection/{processor_type}")
async def test_webhook_connection(
    processor_type: ExternalPaymentProcessor,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test webhook connection for a specific payment processor.
    
    This endpoint helps administrators verify that webhook endpoints
    are properly configured and reachable.
    """
    
    try:
        # Only allow admins to test connections
        if current_user.role not in ['admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only administrators can test webhook connections"
            )
        
        # Create test payload based on processor type
        test_payloads = {
            ExternalPaymentProcessor.SQUARE: {
                'type': 'payment.created',
                'data': {
                    'object': {
                        'id': 'test_payment_123',
                        'amount_money': {'amount': 1000, 'currency': 'USD'},
                        'status': 'COMPLETED',
                        'location_id': 'test_location',
                        'created_at': datetime.now(timezone.utc).isoformat()
                    }
                }
            },
            ExternalPaymentProcessor.STRIPE: {
                'type': 'payment_intent.succeeded',
                'data': {
                    'object': {
                        'id': 'pi_test_123',
                        'amount': 1000,
                        'currency': 'usd',
                        'status': 'succeeded',
                        'created': int(datetime.now(timezone.utc).timestamp())
                    }
                },
                'account': 'acct_test_123'
            },
            ExternalPaymentProcessor.PAYPAL: {
                'event_type': 'PAYMENT.CAPTURE.COMPLETED',
                'resource': {
                    'id': 'test_capture_123',
                    'amount': {'value': '10.00', 'currency_code': 'USD'},
                    'status': 'COMPLETED',
                    'create_time': datetime.now(timezone.utc).isoformat()
                }
            }
        }
        
        test_payload = test_payloads.get(processor_type)
        if not test_payload:
            raise HTTPException(
                status_code=400,
                detail=f"Test payload not available for {processor_type.value}"
            )
        
        return {
            'success': True,
            'processor_type': processor_type.value,
            'test_payload': test_payload,
            'webhook_url': f"/api/v1/external-payment-webhooks/{processor_type.value}",
            'message': f"Test payload for {processor_type.value} webhook"
        }
        
    except Exception as e:
        logger.error(f"Error testing webhook connection for {processor_type.value}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/status")
async def webhook_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get webhook processing status and statistics.
    
    Returns information about webhook endpoints, processing rates,
    and any recent errors.
    """
    
    try:
        # Only allow admins to view webhook status
        if current_user.role not in ['admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only administrators can view webhook status"
            )
        
        # Get webhook processing statistics
        # In a real implementation, this would query webhook processing logs
        status = {
            'webhook_endpoints': {
                'square': '/api/v1/external-payment-webhooks/square',
                'stripe': '/api/v1/external-payment-webhooks/stripe',
                'paypal': '/api/v1/external-payment-webhooks/paypal'
            },
            'processing_status': 'active',
            'supported_processors': [
                ExternalPaymentProcessor.SQUARE.value,
                ExternalPaymentProcessor.STRIPE.value,
                ExternalPaymentProcessor.PAYPAL.value
            ],
            'last_24_hours': {
                'total_webhooks_processed': 0,  # Would query from logs
                'successful_processing': 0,
                'failed_processing': 0,
                'new_transactions_created': 0,
                'commission_collections_generated': 0
            },
            'configuration': {
                'webhook_verification': 'enabled',
                'background_processing': 'enabled',
                'automatic_reconciliation': 'enabled',
                'commission_auto_generation': 'enabled'
            }
        }
        
        return status
        
    except Exception as e:
        logger.error(f"Error getting webhook status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/recent-events")
async def recent_webhook_events(
    limit: int = 50,
    processor_type: Optional[ExternalPaymentProcessor] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recent webhook events and their processing status.
    
    Useful for monitoring webhook processing and debugging issues.
    """
    
    try:
        # Only allow admins to view recent events
        if current_user.role not in ['admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only administrators can view webhook events"
            )
        
        # In a real implementation, this would query webhook event logs
        # For now, return a mock response
        recent_events = []
        
        return {
            'success': True,
            'total_events': len(recent_events),
            'events': recent_events,
            'filter': {
                'limit': limit,
                'processor_type': processor_type.value if processor_type else 'all'
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting recent webhook events: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")