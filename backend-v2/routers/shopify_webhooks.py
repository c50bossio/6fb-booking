"""
Shopify webhook handlers for real-time product and order synchronization.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models.integration import Integration, IntegrationType
from services.shopify_integration_service import ShopifyIntegrationService
from utils.idempotency import webhook_idempotent
import logging
import json
import hmac
import hashlib
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks/shopify", tags=["shopify-webhooks"])


def verify_shopify_webhook(data: bytes, signature: str, secret: str, timestamp: Optional[str] = None) -> bool:
    """Verify Shopify webhook signature and check for replay attacks"""
    try:
        # Shopify sends signature as "sha256=<hash>"
        if not signature.startswith("sha256="):
            return False
        
        signature_hash = signature[7:]  # Remove "sha256=" prefix
        
        # Calculate expected signature
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            data,
            hashlib.sha256
        ).hexdigest()
        
        # Compare signatures securely
        if not hmac.compare_digest(signature_hash, expected_signature):
            return False
        
        # Check timestamp to prevent replay attacks (if provided)
        if timestamp:
            try:
                webhook_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                current_time = datetime.utcnow()
                time_difference = abs((current_time - webhook_time).total_seconds())
                
                # Reject webhooks older than 5 minutes
                if time_difference > 300:
                    logger.warning(f"Webhook timestamp too old: {time_difference} seconds")
                    return False
            except Exception as e:
                logger.error(f"Error parsing webhook timestamp: {str(e)}")
                # Don't fail on timestamp parsing errors, just log
        
        return True
    except Exception as e:
        logger.error(f"Error verifying webhook signature: {str(e)}")
        return False


async def get_shopify_integration_from_shop(shop_domain: str, db: Session) -> Integration:
    """Get Shopify integration by shop domain"""
    integration = db.query(Integration).filter(
        Integration.integration_type == IntegrationType.SHOPIFY,
        Integration.config.contains({"shop_domain": shop_domain})
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shopify integration not found for shop: {shop_domain}"
        )
    
    return integration


@router.post("/products/create")
@webhook_idempotent(
    operation_type="shopify_product_create",
    ttl_hours=24,
    event_id_header="x-shopify-webhook-id"
)
async def handle_product_create(
    request: Request,
    x_shopify_signature: Optional[str] = Header(None),
    x_shopify_shop_domain: Optional[str] = Header(None),
    x_shopify_webhook_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Handle Shopify product create webhook"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        if not x_shopify_signature or not x_shopify_shop_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required Shopify headers"
            )
        
        # Get integration and verify webhook
        integration = await get_shopify_integration_from_shop(x_shopify_shop_domain, db)
        webhook_secret = integration.webhook_secret or integration.client_secret
        
        if not verify_shopify_webhook(body, x_shopify_signature, webhook_secret, x_shopify_webhook_timestamp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature or timestamp"
            )
        
        # Parse product data
        product_data = json.loads(body.decode('utf-8'))
        
        # Process webhook
        shopify_service = ShopifyIntegrationService(db)
        result = await shopify_service.handle_webhook("products/create", product_data, integration)
        
        logger.info(f"Processed product create webhook for shop {x_shopify_shop_domain}: {result}")
        
        return {"status": "success", "message": "Product created successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling product create webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


@router.post("/products/update")
async def handle_product_update(
    request: Request,
    x_shopify_signature: Optional[str] = Header(None),
    x_shopify_shop_domain: Optional[str] = Header(None),
    x_shopify_webhook_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Handle Shopify product update webhook"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        if not x_shopify_signature or not x_shopify_shop_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required Shopify headers"
            )
        
        # Get integration and verify webhook
        integration = await get_shopify_integration_from_shop(x_shopify_shop_domain, db)
        webhook_secret = integration.webhook_secret or integration.client_secret
        
        if not verify_shopify_webhook(body, x_shopify_signature, webhook_secret, x_shopify_webhook_timestamp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature or timestamp"
            )
        
        # Parse product data
        product_data = json.loads(body.decode('utf-8'))
        
        # Process webhook
        shopify_service = ShopifyIntegrationService(db)
        result = await shopify_service.handle_webhook("products/update", product_data, integration)
        
        logger.info(f"Processed product update webhook for shop {x_shopify_shop_domain}: {result}")
        
        return {"status": "success", "message": "Product updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling product update webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


@router.post("/products/delete")
async def handle_product_delete(
    request: Request,
    x_shopify_signature: Optional[str] = Header(None),
    x_shopify_shop_domain: Optional[str] = Header(None),
    x_shopify_webhook_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Handle Shopify product delete webhook"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        if not x_shopify_signature or not x_shopify_shop_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required Shopify headers"
            )
        
        # Get integration and verify webhook
        integration = await get_shopify_integration_from_shop(x_shopify_shop_domain, db)
        webhook_secret = integration.webhook_secret or integration.client_secret
        
        if not verify_shopify_webhook(body, x_shopify_signature, webhook_secret, x_shopify_webhook_timestamp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature or timestamp"
            )
        
        # Parse product data (for delete, this is just the product ID)
        product_data = json.loads(body.decode('utf-8'))
        
        # Mark product as deleted
        from models.product import Product, ProductStatus
        product = db.query(Product).filter(
            Product.external_id == str(product_data["id"])
        ).first()
        
        if product:
            product.status = ProductStatus.ARCHIVED
            product.published = False
            product.sync_status = "deleted"
            db.commit()
            
            logger.info(f"Marked product {product.id} as deleted from Shopify")
        
        return {"status": "success", "message": "Product deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling product delete webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


@router.post("/orders/create")
async def handle_order_create(
    request: Request,
    x_shopify_signature: Optional[str] = Header(None),
    x_shopify_shop_domain: Optional[str] = Header(None),
    x_shopify_webhook_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Handle Shopify order create webhook"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        if not x_shopify_signature or not x_shopify_shop_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required Shopify headers"
            )
        
        # Get integration and verify webhook
        integration = await get_shopify_integration_from_shop(x_shopify_shop_domain, db)
        webhook_secret = integration.webhook_secret or integration.client_secret
        
        if not verify_shopify_webhook(body, x_shopify_signature, webhook_secret, x_shopify_webhook_timestamp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature or timestamp"
            )
        
        # Parse order data
        order_data = json.loads(body.decode('utf-8'))
        
        # Process webhook
        shopify_service = ShopifyIntegrationService(db)
        result = await shopify_service.handle_webhook("orders/create", order_data, integration)
        
        logger.info(f"Processed order create webhook for shop {x_shopify_shop_domain}: {result}")
        
        return {"status": "success", "message": "Order created successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling order create webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


@router.post("/orders/updated")
async def handle_order_update(
    request: Request,
    x_shopify_signature: Optional[str] = Header(None),
    x_shopify_shop_domain: Optional[str] = Header(None),
    x_shopify_webhook_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Handle Shopify order update webhook"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        if not x_shopify_signature or not x_shopify_shop_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required Shopify headers"
            )
        
        # Get integration and verify webhook
        integration = await get_shopify_integration_from_shop(x_shopify_shop_domain, db)
        webhook_secret = integration.webhook_secret or integration.client_secret
        
        if not verify_shopify_webhook(body, x_shopify_signature, webhook_secret, x_shopify_webhook_timestamp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature or timestamp"
            )
        
        # Parse order data
        order_data = json.loads(body.decode('utf-8'))
        
        # Process webhook
        shopify_service = ShopifyIntegrationService(db)
        result = await shopify_service.handle_webhook("orders/updated", order_data, integration)
        
        logger.info(f"Processed order update webhook for shop {x_shopify_shop_domain}: {result}")
        
        return {"status": "success", "message": "Order updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling order update webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


@router.post("/orders/paid")
async def handle_order_paid(
    request: Request,
    x_shopify_signature: Optional[str] = Header(None),
    x_shopify_shop_domain: Optional[str] = Header(None),
    x_shopify_webhook_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Handle Shopify order paid webhook"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        if not x_shopify_signature or not x_shopify_shop_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required Shopify headers"
            )
        
        # Get integration and verify webhook
        integration = await get_shopify_integration_from_shop(x_shopify_shop_domain, db)
        webhook_secret = integration.webhook_secret or integration.client_secret
        
        if not verify_shopify_webhook(body, x_shopify_signature, webhook_secret, x_shopify_webhook_timestamp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature or timestamp"
            )
        
        # Parse order data
        order_data = json.loads(body.decode('utf-8'))
        
        # Update order payment status
        from models.product import Order
        from services.commission_service import CommissionService
        
        order = db.query(Order).filter(
            Order.external_id == str(order_data["id"])
        ).first()
        
        if order:
            order.financial_status = "paid"
            order.processed_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Marked order {order.id} as paid")
            
            # Process commission calculation for retail sales
            commission_service = CommissionService(db)
            commission_processed = commission_service.process_order_payment_commission(order)
            
            if commission_processed:
                logger.info(f"Successfully processed commissions for order {order.id}")
            else:
                logger.warning(f"Commission processing failed or not applicable for order {order.id}")
            
        return {"status": "success", "message": "Order payment processed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling order paid webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


@router.post("/inventory_levels/update")
async def handle_inventory_update(
    request: Request,
    x_shopify_signature: Optional[str] = Header(None),
    x_shopify_shop_domain: Optional[str] = Header(None),
    x_shopify_webhook_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Handle Shopify inventory level update webhook"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        if not x_shopify_signature or not x_shopify_shop_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required Shopify headers"
            )
        
        # Get integration and verify webhook
        integration = await get_shopify_integration_from_shop(x_shopify_shop_domain, db)
        webhook_secret = integration.webhook_secret or integration.client_secret
        
        if not verify_shopify_webhook(body, x_shopify_signature, webhook_secret, x_shopify_webhook_timestamp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature or timestamp"
            )
        
        # Parse inventory data
        inventory_data = json.loads(body.decode('utf-8'))
        
        # Update local inventory
        from models.product import InventoryItem, ProductVariant
        
        # Find inventory item by Shopify inventory item ID
        inventory_item = db.query(InventoryItem).filter(
            InventoryItem.external_id == str(inventory_data.get("inventory_item_id"))
        ).first()
        
        if inventory_item:
            inventory_item.quantity_available = inventory_data.get("available", 0)
            inventory_item.last_inventory_sync = datetime.utcnow()
            db.commit()
            
            logger.info(f"Updated inventory for item {inventory_item.id}")
        else:
            # Try to find by variant if inventory item not found
            variant = db.query(ProductVariant).filter(
                ProductVariant.external_id == str(inventory_data.get("inventory_item_id"))
            ).first()
            
            if variant:
                variant.inventory_quantity = inventory_data.get("available", 0)
                db.commit()
                
                logger.info(f"Updated variant inventory for {variant.id}")
        
        return {"status": "success", "message": "Inventory updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling inventory update webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


@router.get("/health")
async def webhook_health_check():
    """Health check endpoint for Shopify webhooks"""
    return {
        "status": "healthy",
        "service": "shopify-webhooks",
        "endpoints": [
            "/products/create",
            "/products/update", 
            "/products/delete",
            "/orders/create",
            "/orders/updated",
            "/orders/paid",
            "/inventory_levels/update"
        ]
    }