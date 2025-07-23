"""
Product management API endpoints for e-commerce functionality.
Handles products, variants, inventory, and Shopify integration.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from db import get_db
from models import User
from utils.idempotency import idempotent_operation, get_current_user_id
from models.product import Product, ProductVariant, InventoryItem, Order, POSTransaction
from models.integration import Integration, IntegrationType
from schemas_new.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductCatalogFilter, ProductCatalogResponse,
    ProductVariantCreate, ProductVariantUpdate, ProductVariantResponse,
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse, InventoryReport,
    OrderCreate, OrderUpdate, OrderResponse,
    POSTransactionCreate, POSTransactionResponse,
    ShopifyOAuthRequest, ShopifyCallbackRequest, ShopifyProductSyncRequest, ShopifyProductSyncResponse,
    SalesReport
)
from services.shopify_integration_service import ShopifyIntegrationService
from services.integration_service import IntegrationServiceFactory
from utils.auth import get_current_user
from utils.authorization import verify_location_access
from utils.sanitization import sanitize_html, sanitize_plain_text, sanitize_decimal
from schemas_new.commission import (
    CommissionReportBarber, CommissionReportAdmin, 
    PayoutPreviewBarber, PayoutPreviewAdmin,
    filter_commission_response
)
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/products", tags=["products"])


# Product management endpoints
@router.get("/", response_model=ProductCatalogResponse)
async def list_products(
    filters: ProductCatalogFilter = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List products with filtering and pagination"""
    try:
        query = db.query(Product)
        
        # Apply filters
        if filters.product_type:
            query = query.filter(Product.product_type == filters.product_type)
        if filters.status:
            query = query.filter(Product.status == filters.status)
        if filters.vendor:
            query = query.filter(Product.vendor.ilike(f"%{filters.vendor}%"))
        if filters.location_id:
            query = query.filter(Product.location_id == filters.location_id)
        if filters.published is not None:
            query = query.filter(Product.published == filters.published)
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                Product.name.ilike(search_term) |
                Product.description.ilike(search_term) |
                Product.sku.ilike(search_term)
            )
        if filters.min_price is not None:
            query = query.filter(Product.price >= filters.min_price)
        if filters.max_price is not None:
            query = query.filter(Product.price <= filters.max_price)
        if filters.tags:
            # JSON array contains any of the specified tags
            for tag in filters.tags:
                query = query.filter(Product.tags.contains([tag]))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        products = query.offset(filters.offset).limit(filters.limit).all()
        
        return ProductCatalogResponse(
            products=products,
            total=total,
            limit=filters.limit,
            offset=filters.offset,
            has_more=(filters.offset + filters.limit) < total
        )
        
    except Exception as e:
        logger.error(f"Error listing products: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve products"
        )


@router.post("/", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product"""
    try:
        # Sanitize inputs
        sanitized_name = sanitize_plain_text(product_data.name)
        sanitized_description = sanitize_html(product_data.description) if product_data.description else None
        sanitized_vendor = sanitize_plain_text(product_data.vendor) if product_data.vendor else None
        sanitized_price = sanitize_decimal(product_data.price)
        sanitized_compare_price = sanitize_decimal(product_data.compare_at_price) if product_data.compare_at_price else None
        sanitized_cost = sanitize_decimal(product_data.cost_per_item) if product_data.cost_per_item else None
        sanitized_commission = sanitize_decimal(product_data.commission_rate) if product_data.commission_rate else 0.0
        
        product = Product(
            name=sanitized_name,
            description=sanitized_description,
            product_type=product_data.product_type,
            vendor=sanitized_vendor,
            tags=product_data.tags,
            price=sanitized_price,
            compare_at_price=sanitized_compare_price,
            cost_per_item=sanitized_cost,
            sku=product_data.sku,
            published=product_data.published,
            requires_shipping=product_data.requires_shipping,
            taxable=product_data.taxable,
            commission_rate=sanitized_commission,
            location_id=product_data.location_id
        )
        
        db.add(product)
        db.commit()
        db.refresh(product)
        
        logger.info(f"Created product {product.id} for user {current_user.id}")
        return product
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating product: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product"
        )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a product by ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    try:
        # Update fields that were provided
        update_data = product_data.dict(exclude_unset=True)
        
        # Sanitize specific fields before updating
        if 'name' in update_data:
            update_data['name'] = sanitize_plain_text(update_data['name'])
        if 'description' in update_data:
            update_data['description'] = sanitize_html(update_data['description'])
        if 'vendor' in update_data:
            update_data['vendor'] = sanitize_plain_text(update_data['vendor'])
        if 'price' in update_data:
            update_data['price'] = sanitize_decimal(update_data['price'])
        if 'compare_at_price' in update_data:
            update_data['compare_at_price'] = sanitize_decimal(update_data['compare_at_price'])
        if 'cost_per_item' in update_data:
            update_data['cost_per_item'] = sanitize_decimal(update_data['cost_per_item'])
        if 'commission_rate' in update_data:
            update_data['commission_rate'] = sanitize_decimal(update_data['commission_rate'])
        
        for field, value in update_data.items():
            setattr(product, field, value)
        
        db.commit()
        db.refresh(product)
        
        logger.info(f"Updated product {product_id} for user {current_user.id}")
        return product
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product"
        )


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    try:
        db.delete(product)
        db.commit()
        
        logger.info(f"Deleted product {product_id} for user {current_user.id}")
        return {"message": "Product deleted successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete product"
        )


# Product variants endpoints
@router.post("/{product_id}/variants", response_model=ProductVariantResponse)
async def create_product_variant(
    product_id: int,
    variant_data: ProductVariantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a product variant"""
    # Verify product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    try:
        variant = ProductVariant(
            product_id=product_id,
            title=variant_data.title,
            option1=variant_data.option1,
            option2=variant_data.option2,
            option3=variant_data.option3,
            price=variant_data.price,
            compare_at_price=variant_data.compare_at_price,
            cost_per_item=variant_data.cost_per_item,
            sku=variant_data.sku,
            weight=variant_data.weight,
            weight_unit=variant_data.weight_unit,
            requires_shipping=variant_data.requires_shipping,
            taxable=variant_data.taxable,
            inventory_quantity=variant_data.inventory_quantity,
            available=variant_data.available,
            barcode=variant_data.barcode
        )
        
        db.add(variant)
        db.commit()
        db.refresh(variant)
        
        logger.info(f"Created variant {variant.id} for product {product_id}")
        return variant
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating variant: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create variant"
        )


@router.get("/{product_id}/variants", response_model=List[ProductVariantResponse])
async def list_product_variants(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List variants for a product"""
    # Verify product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    variants = db.query(ProductVariant).filter(ProductVariant.product_id == product_id).all()
    return variants


# Inventory management endpoints
@router.get("/inventory/report", response_model=InventoryReport)
@verify_location_access(location_id_param="location_id")
async def get_inventory_report(
    location_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get inventory report"""
    try:
        query = db.query(InventoryItem)
        
        if location_id:
            query = query.filter(InventoryItem.location_id == location_id)
        
        inventory_items = query.all()
        
        # Categorize items
        low_stock_items = [item for item in inventory_items if item.needs_reorder]
        out_of_stock_items = [item for item in inventory_items if item.quantity_available == 0]
        reorder_needed = [item for item in inventory_items if item.needs_reorder]
        
        # Calculate totals
        total_products = db.query(Product).count()
        total_variants = db.query(ProductVariant).count()
        total_value = sum(
            (item.quantity_on_hand * (item.cost_per_item or 0)) for item in inventory_items
        )
        
        return InventoryReport(
            location_id=location_id,
            low_stock_items=low_stock_items,
            out_of_stock_items=out_of_stock_items,
            reorder_needed=reorder_needed,
            total_products=total_products,
            total_variants=total_variants,
            total_value=total_value,
            last_updated=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error generating inventory report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate inventory report"
        )


@router.post("/inventory", response_model=InventoryItemResponse)
async def create_inventory_item(
    inventory_data: InventoryItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update inventory for a product at a location"""
    try:
        # Check if inventory item already exists
        existing_item = db.query(InventoryItem).filter(
            InventoryItem.product_id == inventory_data.product_id,
            InventoryItem.location_id == inventory_data.location_id
        ).first()
        
        if existing_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inventory item already exists for this product and location"
            )
        
        inventory_item = InventoryItem(
            product_id=inventory_data.product_id,
            location_id=inventory_data.location_id,
            quantity_available=inventory_data.quantity_available,
            quantity_reserved=inventory_data.quantity_reserved,
            quantity_committed=inventory_data.quantity_committed,
            reorder_point=inventory_data.reorder_point,
            reorder_quantity=inventory_data.reorder_quantity,
            cost_per_item=inventory_data.cost_per_item,
            currency=inventory_data.currency,
            track_inventory=inventory_data.track_inventory,
            allow_oversell=inventory_data.allow_oversell
        )
        
        db.add(inventory_item)
        db.commit()
        db.refresh(inventory_item)
        
        logger.info(f"Created inventory item {inventory_item.id}")
        return inventory_item
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating inventory item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create inventory item"
        )


# Shopify integration endpoints
@router.post("/shopify/oauth/initiate")
async def initiate_shopify_oauth(
    oauth_request: ShopifyOAuthRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate Shopify OAuth flow"""
    try:
        shopify_service = ShopifyIntegrationService(db)
        
        # Generate OAuth state
        state = shopify_service.generate_oauth_state(current_user.id)
        
        # Build OAuth URL
        oauth_url = shopify_service.build_oauth_url(
            oauth_request.shop_domain,
            state,
            oauth_request.redirect_uri
        )
        
        return {
            "oauth_url": oauth_url,
            "state": state,
            "shop_domain": oauth_request.shop_domain
        }
        
    except Exception as e:
        logger.error(f"Error initiating Shopify OAuth: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate OAuth"
        )


@router.post("/shopify/oauth/callback")
async def handle_shopify_oauth_callback(
    callback_request: ShopifyCallbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Handle Shopify OAuth callback"""
    try:
        shopify_service = ShopifyIntegrationService(db)
        
        # Handle OAuth callback
        integration = await shopify_service.handle_oauth_callback(
            callback_request.code,
            callback_request.state,
            shopify_service.default_redirect_uri
        )
        
        # Store shop domain in integration config
        integration.config = {
            **integration.config,
            "shop_domain": callback_request.shop
        }
        db.commit()
        
        return {
            "message": "Shopify integration connected successfully",
            "integration_id": integration.id,
            "shop_domain": callback_request.shop
        }
        
    except Exception as e:
        logger.error(f"Error handling Shopify OAuth callback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete OAuth"
        )


@router.post("/shopify/sync", response_model=ShopifyProductSyncResponse)
async def sync_shopify_products(
    sync_request: ShopifyProductSyncRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync products from Shopify"""
    try:
        # Get Shopify integration
        integration = db.query(Integration).filter(
            Integration.user_id == current_user.id,
            Integration.integration_type == IntegrationType.SHOPIFY
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shopify integration not found"
            )
        
        shopify_service = ShopifyIntegrationService(db)
        
        # Sync products
        sync_result = await shopify_service.sync_products(integration, sync_request.limit)
        
        return ShopifyProductSyncResponse(**sync_result)
        
    except Exception as e:
        logger.error(f"Error syncing Shopify products: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync products"
        )


# Order management endpoints
@router.get("/orders", response_model=List[OrderResponse])
@verify_location_access(location_id_param="location_id")
async def list_orders(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    location_id: Optional[int] = Query(None),
    barber_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List orders with filtering"""
    try:
        query = db.query(Order)
        
        if location_id:
            query = query.filter(Order.location_id == location_id)
        if barber_id:
            query = query.filter(Order.commission_barber_id == barber_id)
        
        orders = query.offset(offset).limit(limit).all()
        return orders
        
    except Exception as e:
        logger.error(f"Error listing orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve orders"
        )


@router.post("/orders", response_model=OrderResponse)
@idempotent_operation(
    operation_type="order_create",
    ttl_hours=24,
    extract_user_id=get_current_user_id
)
def create_order(
    request: Request,
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new order"""
    try:
        # Generate order number
        import uuid
        order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        
        # Calculate totals
        subtotal = sum(item.price * item.quantity for item in order_data.order_items)
        total_amount = subtotal + order_data.tax_amount + order_data.shipping_amount - order_data.discount_amount
        
        order = Order(
            order_number=order_number,
            customer_id=order_data.customer_id,
            customer_email=order_data.customer_email,
            customer_phone=order_data.customer_phone,
            source=order_data.source,
            subtotal=subtotal,
            tax_amount=order_data.tax_amount,
            shipping_amount=order_data.shipping_amount,
            discount_amount=order_data.discount_amount,
            total_amount=total_amount,
            currency=order_data.currency,
            location_id=order_data.location_id,
            commission_barber_id=order_data.commission_barber_id,
            shipping_address=order_data.shipping_address,
            billing_address=order_data.billing_address,
            shipping_method=order_data.shipping_method,
            notes=order_data.notes,
            tags=order_data.tags
        )
        
        db.add(order)
        db.flush()  # Get order ID
        
        # Create order items
        from models.product import OrderItem
        for item_data in order_data.order_items:
            line_total = item_data.price * item_data.quantity - item_data.total_discount
            commission_amount = line_total * item_data.commission_rate
            
            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data.product_id,
                variant_id=item_data.variant_id,
                title=item_data.title,
                variant_title=item_data.variant_title,
                sku=item_data.sku,
                price=item_data.price,
                quantity=item_data.quantity,
                total_discount=item_data.total_discount,
                line_total=line_total,
                commission_rate=item_data.commission_rate,
                commission_amount=commission_amount,
                weight=item_data.weight,
                requires_shipping=item_data.requires_shipping,
                taxable=item_data.taxable
            )
            db.add(order_item)
        
        db.commit()
        db.refresh(order)
        
        logger.info(f"Created order {order.id} for user {current_user.id}")
        return order
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order"
        )


# POS transaction endpoints
@router.post("/pos/transactions", response_model=POSTransactionResponse)
@idempotent_operation(
    operation_type="pos_transaction",
    ttl_hours=24,
    extract_user_id=get_current_user_id
)
def create_pos_transaction(
    request: Request,
    transaction_data: POSTransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a POS transaction"""
    try:
        # Generate transaction number
        import uuid
        transaction_number = f"POS-{uuid.uuid4().hex[:8].upper()}"
        
        # Calculate commission
        commission_amount = transaction_data.subtotal * transaction_data.commission_rate
        
        transaction = POSTransaction(
            transaction_number=transaction_number,
            location_id=transaction_data.location_id,
            barber_id=transaction_data.barber_id,
            cashier_id=transaction_data.cashier_id,
            customer_id=transaction_data.customer_id,
            customer_name=transaction_data.customer_name,
            customer_email=transaction_data.customer_email,
            customer_phone=transaction_data.customer_phone,
            subtotal=transaction_data.subtotal,
            tax_amount=transaction_data.tax_amount,
            discount_amount=transaction_data.discount_amount,
            tip_amount=transaction_data.tip_amount,
            total_amount=transaction_data.total_amount,
            payment_method=transaction_data.payment_method,
            payment_reference=transaction_data.payment_reference,
            commission_rate=transaction_data.commission_rate,
            commission_amount=commission_amount,
            notes=transaction_data.notes
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        logger.info(f"Created POS transaction {transaction.id}")
        return transaction
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating POS transaction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create transaction"
        )


@router.get("/pos/transactions", response_model=List[POSTransactionResponse])
@verify_location_access(location_id_param="location_id")
async def list_pos_transactions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    location_id: Optional[int] = Query(None),
    barber_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List POS transactions"""
    try:
        query = db.query(POSTransaction)
        
        if location_id:
            query = query.filter(POSTransaction.location_id == location_id)
        if barber_id:
            query = query.filter(POSTransaction.barber_id == barber_id)
        
        transactions = query.offset(offset).limit(limit).all()
        return transactions
        
    except Exception as e:
        logger.error(f"Error listing POS transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve transactions"
        )


# Commission reporting endpoints
@router.get("/commissions/barber/{barber_id}", response_model=dict)
async def get_barber_commission_report(
    barber_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    unpaid_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get commission report for a barber"""
    # Check authorization - admins can view any barber's data, barbers can only view their own
    if current_user.role not in ["admin", "super_admin"]:
        if current_user.id != barber_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view other barbers' commission data"
            )
    
    try:
        from services.commission_service import CommissionService
        
        commission_service = CommissionService(db)
        
        # Get retail commissions
        retail_data = commission_service.get_barber_retail_commissions(
            barber_id, start_date, end_date, unpaid_only
        )
        
        # Get total commissions including services
        total_data = commission_service.get_total_barber_commissions(
            barber_id, start_date, end_date, unpaid_only
        )
        
        # Filter response based on user role
        response_data = {
            "barber_id": barber_id,
            "period_start": start_date,
            "period_end": end_date,
            "unpaid_only": unpaid_only,
            "retail_commissions": retail_data,
            "total_commissions": total_data
        }
        
        # Apply role-based filtering
        filtered_response = filter_commission_response(
            response_data, 
            current_user.role, 
            current_user.id, 
            barber_id
        )
        
        return filtered_response
        
    except Exception as e:
        logger.error(f"Error generating commission report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate commission report"
        )


@router.get("/commissions/payout-preview/{barber_id}", response_model=PayoutPreviewAdmin)
async def get_payout_preview(
    barber_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    include_retail: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview payout amount for a barber including retail commissions"""
    # Check authorization
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to preview payouts"
        )
    
    try:
        from services.commission_service import CommissionService
        
        commission_service = CommissionService(db)
        
        payout_preview = commission_service.calculate_barber_payout_amount(
            barber_id, include_retail, start_date, end_date
        )
        
        # Return appropriate response based on role
        if current_user.role in ["admin", "super_admin"]:
            return PayoutPreviewAdmin(
                barber_id=barber_id,
                include_retail=include_retail,
                service_amount=payout_preview["service_amount"],
                retail_amount=payout_preview["retail_amount"],
                total_payout=payout_preview["total_payout"],
                service_payments_count=payout_preview["service_payments_count"],
                retail_items_count=payout_preview.get("retail_breakdown", {}).get("order_items_count", 0) + 
                                  payout_preview.get("retail_breakdown", {}).get("pos_transactions_count", 0),
                retail_breakdown=payout_preview.get("retail_breakdown")
            )
        else:
            # This endpoint is admin-only, but in case of future changes
            return PayoutPreviewBarber(
                barber_id=barber_id,
                include_retail=include_retail,
                total_payout=payout_preview["total_payout"]
            )
        
    except Exception as e:
        logger.error(f"Error generating payout preview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate payout preview"
        )