"""
Shopify Integration API Endpoints

Handles Shopify webhooks, order synchronization, and integration management
for product sales commission tracking.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    BackgroundTasks,
    Query,
    Body,
    status,
)
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from config.database import get_db
from api.v1.auth import get_current_user
from models.user import User
from models.barber_payment import ProductSale, SalesSource, PaymentIntegration
from services.shopify_service import ShopifyService
from services.rbac_service import RBACService, Permission

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic Models
class ShopifyIntegrationSettings(BaseModel):
    """Shopify integration configuration"""

    shop_domain: Optional[str] = Field(
        None, description="Shopify store domain (store.myshopify.com)"
    )
    access_token: Optional[str] = Field(
        None, description="Shopify private app access token"
    )
    webhook_secret: Optional[str] = Field(
        None, description="Shopify webhook secret for signature validation"
    )
    environment: str = Field(
        "development", description="Environment: development or production"
    )


class ShopifyOrderWebhook(BaseModel):
    """Shopify order webhook payload"""

    id: int
    order_number: Optional[str] = None
    name: Optional[str] = None
    created_at: str
    customer: Optional[Dict[str, Any]] = None
    line_items: List[Dict[str, Any]] = []
    fulfillment_status: Optional[str] = None


class ShopifySyncRequest(BaseModel):
    """Request to sync Shopify orders"""

    days_back: int = Field(7, ge=1, le=90, description="Number of days to sync back")


class ProductSaleResponse(BaseModel):
    """Product sale response model"""

    id: int
    barber_id: int
    barber_name: Optional[str] = None
    product_name: str
    product_sku: Optional[str] = None
    sale_price: float
    quantity: int
    total_amount: float
    commission_rate: float
    commission_amount: float
    sales_source: str
    shopify_order_id: Optional[str] = None
    shopify_order_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    sale_date: datetime
    sync_status: str


# Webhook Endpoints
@router.post("/webhook/order/create", status_code=status.HTTP_200_OK)
async def shopify_order_created_webhook(
    request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    """
    Handle Shopify order created webhook

    This endpoint receives order creation notifications from Shopify
    and processes them to create product sale commission records.
    """
    try:
        # Get raw body for signature verification
        body = await request.body()
        signature = request.headers.get("X-Shopify-Hmac-Sha256", "")

        # Verify webhook signature
        shopify_service = ShopifyService(db)
        if not shopify_service.verify_webhook_signature(body, signature):
            logger.warning("Invalid Shopify webhook signature")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

        # Parse order data
        order_data = await request.json()

        # Process order in background to avoid webhook timeout
        background_tasks.add_task(process_shopify_order_background, order_data, db)

        return {
            "status": "received",
            "message": "Order webhook received and queued for processing",
        }

    except Exception as e:
        logger.error(f"Error processing Shopify order webhook: {str(e)}")
        # Return 200 to prevent Shopify retries for non-recoverable errors
        return {"status": "error", "message": str(e)}


@router.post("/webhook/order/update", status_code=status.HTTP_200_OK)
async def shopify_order_updated_webhook(
    request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    """
    Handle Shopify order updated webhook

    Updates existing product sales when orders are modified.
    """
    try:
        body = await request.body()
        signature = request.headers.get("X-Shopify-Hmac-Sha256", "")

        shopify_service = ShopifyService(db)
        if not shopify_service.verify_webhook_signature(body, signature):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

        order_data = await request.json()

        # Process order update in background
        background_tasks.add_task(update_shopify_order_background, order_data, db)

        return {"status": "received", "message": "Order update webhook received"}

    except Exception as e:
        logger.error(f"Error processing Shopify order update webhook: {str(e)}")
        return {"status": "error", "message": str(e)}


# Management Endpoints
@router.get("/settings", response_model=Dict[str, Any])
async def get_shopify_settings(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get current Shopify integration settings"""
    # Check permissions
    rbac = RBACService(db)
    if not rbac.check_permission(current_user, Permission.MANAGE_INTEGRATIONS):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    integration = db.query(PaymentIntegration).first()

    if not integration:
        return {
            "configured": False,
            "shop_domain": None,
            "environment": "development",
            "last_sync": None,
        }

    return {
        "configured": bool(
            integration.shopify_access_token and integration.shopify_shop_domain
        ),
        "shop_domain": integration.shopify_shop_domain,
        "environment": integration.shopify_environment or "development",
        "last_sync": (
            integration.shopify_last_sync.isoformat()
            if integration.shopify_last_sync
            else None
        ),
    }


@router.put("/settings", response_model=Dict[str, str])
async def update_shopify_settings(
    settings: ShopifyIntegrationSettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update Shopify integration settings"""
    rbac = RBACService(db)
    if not rbac.check_permission(current_user, Permission.MANAGE_INTEGRATIONS):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    shopify_service = ShopifyService(db)
    integration = shopify_service.update_integration_settings(
        settings.dict(exclude_unset=True)
    )

    return {
        "status": "success",
        "message": "Shopify integration settings updated successfully",
    }


@router.post("/sync", response_model=Dict[str, Any])
async def sync_shopify_orders(
    sync_request: ShopifySyncRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually sync orders from Shopify"""
    rbac = RBACService(db)
    if not rbac.check_permission(current_user, Permission.MANAGE_INTEGRATIONS):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    shopify_service = ShopifyService(db)
    result = shopify_service.sync_orders(sync_request.days_back)

    return result


@router.get("/analytics", response_model=Dict[str, Any])
async def get_shopify_analytics(
    barber_id: Optional[int] = Query(None, description="Filter by specific barber"),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get Shopify sales analytics"""
    rbac = RBACService(db)
    if not rbac.check_permission(current_user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    shopify_service = ShopifyService(db)
    analytics = shopify_service.get_sales_analytics(barber_id, days)

    return analytics


@router.get("/sales", response_model=List[ProductSaleResponse])
async def get_shopify_sales(
    barber_id: Optional[int] = Query(None, description="Filter by barber"),
    days: int = Query(30, ge=1, le=365, description="Number of days to fetch"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of records"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get Shopify product sales records"""
    rbac = RBACService(db)
    if not rbac.check_permission(current_user, Permission.VIEW_PAYMENTS):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = db.query(ProductSale).filter(
        ProductSale.sales_source == SalesSource.SHOPIFY,
        ProductSale.sale_date >= datetime.utcnow() - timedelta(days=days),
    )

    if barber_id:
        query = query.filter(ProductSale.barber_id == barber_id)

    sales = query.order_by(ProductSale.sale_date.desc()).limit(limit).all()

    # Convert to response model
    return [
        ProductSaleResponse(
            id=sale.id,
            barber_id=sale.barber_id,
            barber_name=(
                getattr(sale.barber, "first_name", "")
                + " "
                + getattr(sale.barber, "last_name", "")
                if sale.barber
                else None
            ),
            product_name=sale.product_name,
            product_sku=sale.product_sku,
            sale_price=float(sale.sale_price),
            quantity=sale.quantity,
            total_amount=float(sale.total_amount),
            commission_rate=sale.commission_rate,
            commission_amount=float(sale.commission_amount),
            sales_source=sale.sales_source.value,
            shopify_order_id=sale.shopify_order_id,
            shopify_order_number=sale.shopify_order_number,
            customer_name=sale.customer_name,
            customer_email=sale.customer_email,
            sale_date=sale.sale_date,
            sync_status=sale.sync_status,
        )
        for sale in sales
    ]


@router.post("/test-connection", response_model=Dict[str, Any])
async def test_shopify_connection(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Test Shopify API connection"""
    rbac = RBACService(db)
    if not rbac.check_permission(current_user, Permission.MANAGE_INTEGRATIONS):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    shopify_service = ShopifyService(db)

    try:
        # Try to fetch a small number of orders to test connection
        orders = shopify_service._fetch_orders_from_api(
            datetime.utcnow() - timedelta(days=1)
        )

        return {
            "status": "success",
            "message": "Successfully connected to Shopify API",
            "orders_found": len(orders),
        }

    except Exception as e:
        logger.error(f"Shopify connection test failed: {str(e)}")
        return {"status": "error", "message": f"Connection failed: {str(e)}"}


# Background Tasks
async def process_shopify_order_background(order_data: Dict[str, Any], db: Session):
    """Background task to process Shopify order"""
    try:
        shopify_service = ShopifyService(db)
        sales = shopify_service.process_order_webhook(order_data)
        logger.info(
            f"Background processing created {len(sales)} product sales for order {order_data.get('id')}"
        )
    except Exception as e:
        logger.error(
            f"Background processing failed for order {order_data.get('id')}: {str(e)}"
        )


async def update_shopify_order_background(order_data: Dict[str, Any], db: Session):
    """Background task to update Shopify order"""
    try:
        shopify_service = ShopifyService(db)
        order_id = str(order_data.get("id"))

        # Find existing sales for this order
        existing_sales = (
            db.query(ProductSale).filter(ProductSale.shopify_order_id == order_id).all()
        )

        if existing_sales:
            # Update fulfillment status
            fulfillment_status = order_data.get("fulfillment_status")
            for sale in existing_sales:
                sale.shopify_fulfillment_status = fulfillment_status
                sale.last_sync_attempt = datetime.utcnow()

            db.commit()
            logger.info(
                f"Updated {len(existing_sales)} product sales for order {order_id}"
            )
        else:
            # If no existing sales, process as new order
            sales = shopify_service.process_order_webhook(order_data)
            logger.info(
                f"Created {len(sales)} new product sales for updated order {order_id}"
            )

    except Exception as e:
        logger.error(
            f"Background update failed for order {order_data.get('id')}: {str(e)}"
        )
