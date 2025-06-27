"""
Product Catalog API Endpoints

Handles product catalog synchronization, management, and POS integration endpoints.
Provides unified access to products from Square, Shopify, or manual entry.
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Body,
    BackgroundTasks,
    status,
)
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from config.database import get_db
from api.v1.auth import get_current_user
from models.user import User
from models.product import Product, ProductSource, ProductStatus, SyncStatus
from services.rbac_service import RBACService, Permission
from services.product_catalog_service import get_product_catalog_service

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic Models
class ProductResponse(BaseModel):
    """Product response model"""

    id: int
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    price: float
    cost_price: Optional[float] = None
    compare_at_price: Optional[float] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    tags: List[str] = []
    track_inventory: bool
    inventory_quantity: int
    low_stock_threshold: int
    is_in_stock: bool
    is_low_stock: bool
    status: str
    source: str
    sync_status: str
    last_sync_at: Optional[datetime] = None
    commission_rate: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class ProductCreate(BaseModel):
    """Product creation model"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    price: float = Field(..., gt=0)
    cost_price: Optional[float] = Field(None, ge=0)
    compare_at_price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, max_length=100)
    subcategory: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    tags: List[str] = []
    track_inventory: bool = True
    inventory_quantity: int = Field(0, ge=0)
    low_stock_threshold: int = Field(5, ge=0)
    commission_rate: Optional[float] = Field(None, ge=0, le=1)


class ProductUpdate(BaseModel):
    """Product update model"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    price: Optional[float] = Field(None, gt=0)
    cost_price: Optional[float] = Field(None, ge=0)
    compare_at_price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, max_length=100)
    subcategory: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None
    track_inventory: Optional[bool] = None
    inventory_quantity: Optional[int] = Field(None, ge=0)
    low_stock_threshold: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    commission_rate: Optional[float] = Field(None, ge=0, le=1)


class SyncRequest(BaseModel):
    """Sync request model"""

    platform: str = Field(..., pattern="^(square|shopify)$")
    sync_type: str = Field("incremental", pattern="^(full|incremental)$")
    location_id: Optional[str] = None  # Required for Square


class InventoryUpdate(BaseModel):
    """Inventory update model"""

    quantity_delta: int = Field(..., description="Change in inventory (+/- quantity)")
    reason: Optional[str] = Field(None, description="Reason for inventory change")


class POSProductResponse(BaseModel):
    """Simplified product response for POS"""

    id: int
    name: str
    sku: Optional[str] = None
    price: float
    category: Optional[str] = None
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    in_stock: bool
    quantity: Optional[int] = None
    low_stock: bool
    commission_rate: Optional[float] = None
    barcode: Optional[str] = None


class CatalogListResponse(BaseModel):
    """Product catalog list response"""

    products: List[ProductResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class SyncStatusResponse(BaseModel):
    """Sync status response"""

    last_sync: Dict[str, Optional[str]]
    product_counts: Dict[str, int]
    recent_syncs: List[Dict[str, Any]]


# Catalog Management Endpoints
@router.get("/products", response_model=CatalogListResponse)
async def get_product_catalog(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in name, description, SKU"),
    source: Optional[str] = Query(None, pattern="^(manual|square|shopify)$"),
    status: Optional[str] = Query(
        None, pattern="^(active|inactive|out_of_stock|discontinued)$"
    ),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get product catalog with filtering and pagination"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_PRODUCTS):
        raise HTTPException(status_code=403, detail="Permission denied")

    catalog_service = get_product_catalog_service(db)

    # Convert string enums
    source_enum = ProductSource(source) if source else None
    status_enum = ProductStatus(status) if status else None

    result = catalog_service.get_product_catalog(
        category=category,
        search=search,
        source=source_enum,
        status=status_enum,
        limit=limit,
        offset=offset,
    )

    return CatalogListResponse(**result)


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get specific product by ID"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_PRODUCTS):
        raise HTTPException(status_code=403, detail="Permission denied")

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    catalog_service = get_product_catalog_service(db)
    product_dict = catalog_service._product_to_dict(product)

    return ProductResponse(**product_dict)


@router.post(
    "/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED
)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new manual product"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PRODUCTS):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Check for duplicate SKU
    if product_data.sku:
        existing_product = (
            db.query(Product).filter(Product.sku == product_data.sku).first()
        )
        if existing_product:
            raise HTTPException(
                status_code=400, detail="Product with this SKU already exists"
            )

    # Create product
    import json

    new_product = Product(
        name=product_data.name,
        description=product_data.description,
        sku=product_data.sku,
        price=product_data.price,
        cost_price=product_data.cost_price,
        compare_at_price=product_data.compare_at_price,
        category=product_data.category,
        subcategory=product_data.subcategory,
        brand=product_data.brand,
        tags=json.dumps(product_data.tags) if product_data.tags else None,
        track_inventory=product_data.track_inventory,
        inventory_quantity=product_data.inventory_quantity,
        low_stock_threshold=product_data.low_stock_threshold,
        commission_rate=product_data.commission_rate,
        source=ProductSource.MANUAL,
        status=ProductStatus.ACTIVE,
        sync_status=SyncStatus.MANUAL,
        created_by=current_user.id,
        updated_by=current_user.id,
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    catalog_service = get_product_catalog_service(db)
    product_dict = catalog_service._product_to_dict(new_product)

    return ProductResponse(**product_dict)


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing product"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PRODUCTS):
        raise HTTPException(status_code=403, detail="Permission denied")

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if updating synced product
    if product.source != ProductSource.MANUAL and product_data.dict(exclude_unset=True):
        logger.warning(
            f"Manual update to synced product {product_id} from {product.source}"
        )

    # Update fields
    import json

    update_data = product_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "tags" and value is not None:
            setattr(product, field, json.dumps(value))
        elif field == "status" and value is not None:
            setattr(product, field, ProductStatus(value))
        else:
            setattr(product, field, value)

    product.updated_by = current_user.id
    product.updated_at = datetime.utcnow()

    # If this was a synced product, mark as needing manual review
    if product.source != ProductSource.MANUAL:
        product.sync_status = SyncStatus.MANUAL

    db.commit()
    db.refresh(product)

    catalog_service = get_product_catalog_service(db)
    product_dict = catalog_service._product_to_dict(product)

    return ProductResponse(**product_dict)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a product (soft delete by setting status to discontinued)"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PRODUCTS):
        raise HTTPException(status_code=403, detail="Permission denied")

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Soft delete
    product.status = ProductStatus.DISCONTINUED
    product.updated_by = current_user.id
    product.updated_at = datetime.utcnow()

    db.commit()


# Synchronization Endpoints
@router.post("/sync", response_model=Dict[str, Any])
async def sync_catalog(
    sync_request: SyncRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually trigger catalog synchronization"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_INTEGRATIONS):
        raise HTTPException(status_code=403, detail="Permission denied")

    catalog_service = get_product_catalog_service(db)

    try:
        if sync_request.platform == "square":
            if not sync_request.location_id:
                raise HTTPException(
                    status_code=400, detail="location_id required for Square sync"
                )

            result = await catalog_service.sync_from_square(
                location_id=sync_request.location_id,
                user_id=current_user.id,
                sync_type=sync_request.sync_type,
            )
        elif sync_request.platform == "shopify":
            result = await catalog_service.sync_from_shopify(
                user_id=current_user.id, sync_type=sync_request.sync_type
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid platform")

        return {
            "status": "completed",
            "platform": sync_request.platform,
            "sync_type": sync_request.sync_type,
            "results": result,
        }

    except Exception as e:
        logger.error(f"Sync failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/sync/status", response_model=SyncStatusResponse)
async def get_sync_status(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get synchronization status for all platforms"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_INTEGRATIONS):
        raise HTTPException(status_code=403, detail="Permission denied")

    catalog_service = get_product_catalog_service(db)
    status_data = catalog_service.get_sync_status()

    return SyncStatusResponse(**status_data)


# Inventory Management
@router.put("/products/{product_id}/inventory", response_model=Dict[str, Any])
async def update_inventory(
    product_id: int,
    inventory_update: InventoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update product inventory"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_INVENTORY):
        raise HTTPException(status_code=403, detail="Permission denied")

    catalog_service = get_product_catalog_service(db)

    try:
        result = catalog_service.update_inventory(
            product_id, inventory_update.quantity_delta
        )

        # Log inventory change
        logger.info(
            f"Inventory updated for product {product_id}: "
            f"delta={inventory_update.quantity_delta}, "
            f"reason={inventory_update.reason}, "
            f"user={current_user.id}"
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Inventory update failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Inventory update failed")


# POS Integration Endpoints
@router.get("/pos/products", response_model=List[POSProductResponse])
async def get_pos_products(
    search: Optional[str] = Query(None, description="Search products"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get products formatted for POS system"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.USE_POS):
        raise HTTPException(status_code=403, detail="Permission denied")

    catalog_service = get_product_catalog_service(db)

    if search:
        products = catalog_service.search_products_for_pos(search, category, limit)
    else:
        # Get active products for browsing
        result = catalog_service.get_product_catalog(
            category=category, status=ProductStatus.ACTIVE, limit=limit
        )
        products = [POSProductResponse(**product) for product in result["products"]]

    return products


@router.get("/pos/products/{product_id}", response_model=POSProductResponse)
async def get_pos_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get specific product for POS"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.USE_POS):
        raise HTTPException(status_code=403, detail="Permission denied")

    catalog_service = get_product_catalog_service(db)

    try:
        product_data = catalog_service.get_product_for_pos(product_id)
        return POSProductResponse(**product_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting POS product: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving product")


@router.get("/categories", response_model=List[str])
async def get_categories(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get all product categories"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_PRODUCTS):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Get distinct categories from products
    categories = (
        db.query(Product.category).filter(Product.category.isnot(None)).distinct().all()
    )

    return [category[0] for category in categories if category[0]]


@router.get("/low-stock", response_model=List[ProductResponse])
async def get_low_stock_products(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get products that are low in stock"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_INVENTORY):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Get products where inventory <= low_stock_threshold
    low_stock_products = (
        db.query(Product)
        .filter(
            Product.track_inventory == True,
            Product.status == ProductStatus.ACTIVE,
            Product.inventory_quantity <= Product.low_stock_threshold,
        )
        .order_by(Product.inventory_quantity.asc())
        .all()
    )

    catalog_service = get_product_catalog_service(db)

    return [
        ProductResponse(**catalog_service._product_to_dict(product))
        for product in low_stock_products
    ]


# Analytics
@router.get("/analytics/summary", response_model=Dict[str, Any])
async def get_catalog_analytics(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get product catalog analytics summary"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Get counts by status
    status_counts = {}
    for status in ProductStatus:
        count = db.query(Product).filter(Product.status == status).count()
        status_counts[status.value] = count

    # Get counts by source
    source_counts = {}
    for source in ProductSource:
        count = db.query(Product).filter(Product.source == source).count()
        source_counts[source.value] = count

    # Get low stock count
    low_stock_count = (
        db.query(Product)
        .filter(
            Product.track_inventory == True,
            Product.status == ProductStatus.ACTIVE,
            Product.inventory_quantity <= Product.low_stock_threshold,
        )
        .count()
    )

    # Get total inventory value
    total_value = (
        db.query(db.func.sum(Product.price * Product.inventory_quantity))
        .filter(Product.track_inventory == True)
        .scalar()
        or 0
    )

    return {
        "total_products": db.query(Product).count(),
        "status_breakdown": status_counts,
        "source_breakdown": source_counts,
        "low_stock_count": low_stock_count,
        "total_inventory_value": float(total_value),
    }


# Include in main router
def include_router(app):
    app.include_router(
        router, prefix="/api/v1/product-catalog", tags=["product-catalog"]
    )
