"""
Pydantic schemas for product and e-commerce functionality.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

from models.product import ProductType, ProductStatus, OrderStatus, OrderSource
from utils.validators import (
    currency_validator,
    financial_amount_validator
)

class ProductBase(BaseModel):
    """Base product schema"""
    name: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    product_type: ProductType
    vendor: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    price: Decimal = Field(..., ge=0)
    compare_at_price: Optional[Decimal] = Field(None, ge=0)
    cost_per_item: Optional[Decimal] = Field(None, ge=0)
    
    sku: Optional[str] = None
    published: bool = True
    requires_shipping: bool = True
    taxable: bool = True
    commission_rate: Decimal = Field(default=Decimal("0.0000"), ge=0, le=1)
    
    @field_validator('compare_at_price')
    @classmethod
    def validate_compare_at_price(cls, v, values):
        if v is not None and 'price' in values and v <= values['price']:
            raise ValueError('Compare at price must be greater than price')
        return v

class ProductCreate(ProductBase):
    """Schema for creating a product"""
    location_id: Optional[int] = None

class ProductUpdate(BaseModel):
    """Schema for updating a product"""
    name: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    product_type: Optional[ProductType] = None
    vendor: Optional[str] = None
    tags: Optional[List[str]] = None
    price: Optional[Decimal] = Field(None, ge=0)
    compare_at_price: Optional[Decimal] = Field(None, ge=0)
    cost_per_item: Optional[Decimal] = Field(None, ge=0)
    
    sku: Optional[str] = None
    status: Optional[ProductStatus] = None
    published: Optional[bool] = None
    requires_shipping: Optional[bool] = None
    taxable: Optional[bool] = None
    commission_rate: Optional[Decimal] = Field(None, ge=0, le=1)
    location_id: Optional[int] = None

class ProductVariantBase(BaseModel):
    """Base product variant schema"""
    title: str = Field(..., min_length=1, max_length=255)
    option1: Optional[str] = None
    option2: Optional[str] = None
    option3: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    compare_at_price: Optional[Decimal] = Field(None, ge=0)
    cost_per_item: Optional[Decimal] = Field(None, ge=0)

    sku: Optional[str] = None
    weight: Optional[Decimal] = Field(None, ge=0)
    weight_unit: str = "g"
    requires_shipping: bool = True
    taxable: bool = True
    inventory_quantity: int = Field(default=0, ge=0)
    available: bool = True
    barcode: Optional[str] = None

class ProductVariantCreate(ProductVariantBase):
    """Schema for creating a product variant"""
    product_id: int

class ProductVariantUpdate(BaseModel):
    """Schema for updating a product variant"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    option1: Optional[str] = None
    option2: Optional[str] = None
    option3: Optional[str] = None
    price: Optional[Decimal] = Field(None, ge=0)
    compare_at_price: Optional[Decimal] = Field(None, ge=0)
    cost_per_item: Optional[Decimal] = Field(None, ge=0)

    sku: Optional[str] = None
    weight: Optional[Decimal] = Field(None, ge=0)
    weight_unit: Optional[str] = None
    requires_shipping: Optional[bool] = None
    taxable: Optional[bool] = None
    inventory_quantity: Optional[int] = Field(None, ge=0)
    available: Optional[bool] = None
    barcode: Optional[str] = None

class ProductVariantResponse(ProductVariantBase):
    """Schema for product variant response"""
    id: int
    product_id: int
    external_id: Optional[str] = None
    position: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        from_attributes = True
)

class ProductResponse(ProductBase):
    """Schema for product response"""
    id: int
    external_id: Optional[str] = None
    status: ProductStatus
    handle: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    sync_status: str
    last_synced_at: Optional[datetime] = None
    location_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    variants: List[ProductVariantResponse] = Field(default_factory=list)
    
    model_config = ConfigDict(
        from_attributes = True
)

class InventoryItemBase(BaseModel):
    """Base inventory item schema"""
    quantity_available: int = Field(default=0, ge=0)
    quantity_reserved: int = Field(default=0, ge=0)
    quantity_committed: int = Field(default=0, ge=0)
    reorder_point: int = Field(default=0, ge=0)
    reorder_quantity: int = Field(default=0, ge=0)
    cost_per_item: Optional[Decimal] = Field(None, ge=0)
    currency: str = "USD"
    
    track_inventory: bool = True
    allow_oversell: bool = False

class InventoryItemCreate(InventoryItemBase):
    """Schema for creating inventory item"""
    product_id: int
    location_id: int

class InventoryItemUpdate(BaseModel):
    """Schema for updating inventory item"""
    quantity_available: Optional[int] = Field(None, ge=0)
    quantity_reserved: Optional[int] = Field(None, ge=0)
    quantity_committed: Optional[int] = Field(None, ge=0)
    reorder_point: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=0)
    cost_per_item: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = None
    
    track_inventory: Optional[bool] = None
    allow_oversell: Optional[bool] = None

class InventoryItemResponse(InventoryItemBase):
    """Schema for inventory item response"""
    id: int
    product_id: int
    location_id: int
    external_id: Optional[str] = None
    last_inventory_sync: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed properties
    quantity_on_hand: int
    needs_reorder: bool
    
    model_config = ConfigDict(
        from_attributes = True
)

class OrderItemBase(BaseModel):
    """Base order item schema"""
    title: str = Field(..., min_length=1, max_length=500)
    variant_title: Optional[str] = None
    sku: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    quantity: int = Field(..., gt=0)
    total_discount: Decimal = Field(default=Decimal("0.00"), ge=0)
    
    commission_rate: Decimal = Field(default=Decimal("0.0000"), ge=0, le=1)
    weight: Optional[Decimal] = Field(None, ge=0)
    requires_shipping: bool = True
    taxable: bool = True

class OrderItemCreate(OrderItemBase):
    """Schema for creating order item"""
    product_id: int
    variant_id: Optional[int] = None

class OrderItemResponse(OrderItemBase):
    """Schema for order item response"""
    id: int
    order_id: int
    product_id: int
    variant_id: Optional[int] = None
    external_id: Optional[str] = None
    line_total: Decimal
    commission_amount: Decimal
    commission_paid: bool
    fulfillment_status: str
    fulfillment_quantity: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        from_attributes = True
)

class OrderBase(BaseModel):
    """Base order schema"""
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    source: OrderSource
    subtotal: Decimal = Field(..., ge=0)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    shipping_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_amount: Decimal = Field(..., ge=0)
    currency: str = "USD"
    
    shipping_address: Optional[Dict[str, Any]] = None
    billing_address: Optional[Dict[str, Any]] = None
    shipping_method: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class OrderCreate(OrderBase):
    """Schema for creating order"""
    customer_id: Optional[int] = None
    location_id: Optional[int] = None
    commission_barber_id: Optional[int] = None
    order_items: List[OrderItemCreate] = Field(..., min_length=1)

class OrderUpdate(BaseModel):
    """Schema for updating order"""
    status: Optional[OrderStatus] = None
    financial_status: Optional[str] = None
    fulfillment_status: Optional[str] = None
    tracking_number: Optional[str] = None
    processed_by: Optional[int] = None
    commission_barber_id: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class OrderResponse(OrderBase):
    """Schema for order response"""
    id: int
    external_id: Optional[str] = None
    order_number: str
    customer_id: Optional[int] = None
    status: OrderStatus
    financial_status: str
    fulfillment_status: str
    location_id: Optional[int] = None
    processed_by: Optional[int] = None
    commission_barber_id: Optional[int] = None
    tracking_number: Optional[str] = None
    payment_gateway: Optional[str] = None
    payment_reference: Optional[str] = None
    ordered_at: datetime
    processed_at: Optional[datetime] = None
    fulfilled_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    order_items: List[OrderItemResponse] = Field(default_factory=list)
    
    model_config = ConfigDict(
        from_attributes = True
)

class POSTransactionBase(BaseModel):
    """Base POS transaction schema"""
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    subtotal: Decimal = Field(..., ge=0)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    tip_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_amount: Decimal = Field(..., ge=0)
    
    payment_method: str = Field(..., min_length=1)
    payment_reference: Optional[str] = None
    commission_rate: Decimal = Field(..., ge=0, le=1)
    notes: Optional[str] = None

class POSTransactionCreate(POSTransactionBase):
    """Schema for creating POS transaction"""
    location_id: int
    barber_id: int
    cashier_id: Optional[int] = None
    customer_id: Optional[int] = None

class POSTransactionResponse(POSTransactionBase):
    """Schema for POS transaction response"""
    id: int
    transaction_number: str
    location_id: int
    barber_id: int
    cashier_id: Optional[int] = None
    customer_id: Optional[int] = None
    commission_amount: Decimal
    commission_paid: bool
    commission_paid_at: Optional[datetime] = None
    receipt_email_sent: bool
    transacted_at: datetime
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        from_attributes = True
)

class ShopifyOAuthRequest(BaseModel):
    """Schema for Shopify OAuth initiation"""
    shop_domain: str = Field(..., min_length=1, pattern=r'^[a-zA-Z0-9\-]+\.myshopify\.com$')
    redirect_uri: Optional[str] = None

class ShopifyCallbackRequest(BaseModel):
    """Schema for Shopify OAuth callback"""
    code: str = Field(..., min_length=1)
    shop: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)

class ShopifyProductSyncRequest(BaseModel):
    """Schema for Shopify product sync request"""
    limit: int = Field(default=50, ge=1, le=250)
    since_id: Optional[int] = None

class ShopifyProductSyncResponse(BaseModel):
    """Schema for Shopify product sync response"""
    products_synced: int
    products_created: int
    products_updated: int
    errors: List[str] = Field(default_factory=list)
    status: str

class ShopifyWebhookRequest(BaseModel):
    """Schema for Shopify webhook requests"""
    topic: str = Field(..., min_length=1)
    data: Dict[str, Any] = Field(..., min_length=1)

class ProductCatalogFilter(BaseModel):
    """Schema for filtering product catalog"""
    product_type: Optional[ProductType] = None
    status: Optional[ProductStatus] = None
    vendor: Optional[str] = None
    location_id: Optional[int] = None
    published: Optional[bool] = None
    search: Optional[str] = None
    tags: Optional[List[str]] = None
    min_price: Optional[Decimal] = Field(None, ge=0)
    max_price: Optional[Decimal] = Field(None, ge=0)
    
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)

class ProductCatalogResponse(BaseModel):
    """Schema for product catalog response"""
    products: List[ProductResponse]
    total: int
    limit: int
    offset: int
    has_more: bool

class InventoryReport(BaseModel):
    """Schema for inventory reporting"""
    location_id: Optional[int] = None
    low_stock_items: List[InventoryItemResponse] = Field(default_factory=list)
    out_of_stock_items: List[InventoryItemResponse] = Field(default_factory=list)
    reorder_needed: List[InventoryItemResponse] = Field(default_factory=list)
    total_products: int
    total_variants: int
    total_value: Decimal
    last_updated: datetime

class SalesReport(BaseModel):
    """Schema for sales reporting"""
    period_start: datetime
    period_end: datetime
    location_id: Optional[int] = None
    barber_id: Optional[int] = None
    total_orders: int
    total_revenue: Decimal
    total_commission: Decimal
    avg_order_value: Decimal
    top_products: List[Dict[str, Any]] = Field(default_factory=list)
    sales_by_day: List[Dict[str, Any]] = Field(default_factory=list)
    commission_breakdown: List[Dict[str, Any]] = Field(default_factory=list)