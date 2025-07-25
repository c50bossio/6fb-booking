"""
Product models for e-commerce integration with Shopify and other platforms.
Handles products, variants, inventory, and orders for retail sales.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
import sys
import os

# Add parent directory to path to resolve imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import Base


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ProductStatus(enum.Enum):
    """Product status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"
    ARCHIVED = "archived"


class ProductType(enum.Enum):
    """Product type categorization for barbershops"""
    HAIR_CARE = "hair_care"  # Shampoo, conditioner, styling products
    TOOLS = "tools"  # Clippers, scissors, combs
    ACCESSORIES = "accessories"  # Capes, brushes, accessories
    MERCHANDISE = "merchandise"  # Branded items, gift cards
    SERVICES = "services"  # Service packages, gift certificates


class OrderStatus(enum.Enum):
    """Order processing status"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    FULFILLED = "fulfilled"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class OrderSource(enum.Enum):
    """Order source channel"""
    POS = "pos"  # Point of sale (in-person)
    ONLINE = "online"  # Online store
    SHOPIFY = "shopify"  # Shopify integration
    MANUAL = "manual"  # Manually created


class Product(Base):
    """
    Main product catalog. Supports integration with Shopify and other e-commerce platforms.
    """
    __tablename__ = "products"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), nullable=True, index=True)  # Shopify product ID
    sku = Column(String(255), nullable=True, unique=True, index=True)
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    
    # Categorization
    product_type = Column(SQLEnum(ProductType), nullable=False)
    vendor = Column(String(255), nullable=True)  # Brand/manufacturer
    tags = Column(JSON, default=list)  # Search tags
    
    # Pricing
    price = Column(Numeric(10, 2), nullable=False)
    compare_at_price = Column(Numeric(10, 2), nullable=True)  # Original price for sales
    cost_per_item = Column(Numeric(10, 2), nullable=True)  # Cost basis
    
    # Status and visibility
    status = Column(SQLEnum(ProductStatus), default=ProductStatus.ACTIVE)
    published = Column(Boolean, default=True)
    published_at = Column(DateTime, nullable=True)
    
    # SEO and organization
    seo_title = Column(String(255), nullable=True)
    seo_description = Column(Text, nullable=True)
    handle = Column(String(255), nullable=True, index=True)  # URL-friendly identifier
    
    # Integration metadata
    shopify_data = Column(JSON, default=dict)  # Store Shopify-specific data
    sync_status = Column(String(50), default="pending")  # sync, error, pending
    last_synced_at = Column(DateTime, nullable=True)
    
    # Business metadata
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=True)
    commission_rate = Column(Numeric(5, 4), default=0.0000)  # Commission rate for barbers
    requires_shipping = Column(Boolean, default=True)
    taxable = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    inventory_items = relationship("InventoryItem", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")
    
    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', sku='{self.sku}', status={self.status.value})>"


class ProductVariant(Base):
    """
    Product variants for size, color, style options.
    """
    __tablename__ = "product_variants"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    external_id = Column(String(255), nullable=True, index=True)  # Shopify variant ID
    sku = Column(String(255), nullable=True, unique=True, index=True)
    
    # Variant attributes
    title = Column(String(255), nullable=False)  # e.g., "Large / Red"
    option1 = Column(String(255), nullable=True)  # e.g., Size
    option2 = Column(String(255), nullable=True)  # e.g., Color
    option3 = Column(String(255), nullable=True)  # e.g., Style
    
    # Pricing (can override product price)
    price = Column(Numeric(10, 2), nullable=False)
    compare_at_price = Column(Numeric(10, 2), nullable=True)
    cost_per_item = Column(Numeric(10, 2), nullable=True)
    
    # Physical attributes
    weight = Column(Numeric(8, 2), nullable=True)  # in grams
    weight_unit = Column(String(10), default="g")
    requires_shipping = Column(Boolean, default=True)
    taxable = Column(Boolean, default=True)
    
    # Inventory
    inventory_quantity = Column(Integer, default=0)
    inventory_policy = Column(String(20), default="deny")  # deny or continue
    fulfillment_service = Column(String(50), default="manual")
    
    # Status
    available = Column(Boolean, default=True)
    position = Column(Integer, default=1)
    
    # Integration metadata
    shopify_data = Column(JSON, default=dict)
    barcode = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    product = relationship("Product", back_populates="variants")
    order_items = relationship("OrderItem", back_populates="variant")
    
    def __repr__(self):
        return f"<ProductVariant(id={self.id}, title='{self.title}', price={self.price})>"


class InventoryItem(Base):
    """
    Inventory tracking for products across multiple locations.
    """
    __tablename__ = "inventory_items"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=False)
    external_id = Column(String(255), nullable=True, index=True)  # Shopify inventory item ID
    
    # Inventory levels
    quantity_available = Column(Integer, default=0)
    quantity_reserved = Column(Integer, default=0)  # Reserved for orders
    quantity_committed = Column(Integer, default=0)  # Committed to orders
    reorder_point = Column(Integer, default=0)  # When to reorder
    reorder_quantity = Column(Integer, default=0)  # How much to reorder
    
    # Cost tracking
    cost_per_item = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="USD")
    
    # Tracking
    track_inventory = Column(Boolean, default=True)
    allow_oversell = Column(Boolean, default=False)
    
    # Integration metadata
    shopify_data = Column(JSON, default=dict)
    last_inventory_sync = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    product = relationship("Product", back_populates="inventory_items")
    
    @property
    def quantity_on_hand(self):
        """Total quantity on hand"""
        return self.quantity_available + self.quantity_reserved + self.quantity_committed
    
    @property
    def needs_reorder(self):
        """Check if inventory needs reordering"""
        return self.quantity_available <= self.reorder_point
    
    def __repr__(self):
        return f"<InventoryItem(product_id={self.product_id}, location_id={self.location_id}, available={self.quantity_available})>"


class Order(Base):
    """
    Retail orders for product sales (separate from service appointments).
    """
    __tablename__ = "orders"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), nullable=True, index=True)  # Shopify order ID
    order_number = Column(String(255), nullable=False, unique=True, index=True)
    
    # Customer information
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(50), nullable=True)
    
    # Order details
    source = Column(SQLEnum(OrderSource), nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING)
    financial_status = Column(String(50), default="pending")  # paid, pending, refunded, etc.
    fulfillment_status = Column(String(50), default="unfulfilled")
    
    # Pricing
    subtotal = Column(Numeric(10, 2), nullable=False, default=0.00)
    tax_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    shipping_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    
    # Fulfillment
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=True)
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Staff member
    commission_barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Barber for commission
    
    # Shipping information
    shipping_address = Column(JSON, nullable=True)
    billing_address = Column(JSON, nullable=True)
    shipping_method = Column(String(100), nullable=True)
    tracking_number = Column(String(255), nullable=True)
    
    # Payment information
    payment_gateway = Column(String(50), nullable=True)
    payment_reference = Column(String(255), nullable=True)
    
    # Integration metadata
    shopify_data = Column(JSON, default=dict)
    notes = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    
    # Timestamps
    ordered_at = Column(DateTime, default=utcnow)
    processed_at = Column(DateTime, nullable=True)
    fulfilled_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    customer = relationship("User", foreign_keys=[customer_id])
    processed_by_user = relationship("User", foreign_keys=[processed_by])
    commission_barber = relationship("User", foreign_keys=[commission_barber_id])
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Order(id={self.id}, number='{self.order_number}', total={self.total_amount}, status={self.status.value})>"


class OrderItem(Base):
    """
    Individual items within an order.
    """
    __tablename__ = "order_items"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    external_id = Column(String(255), nullable=True, index=True)  # Shopify line item ID
    
    # Item details
    title = Column(String(500), nullable=False)  # Product name at time of order
    variant_title = Column(String(255), nullable=True)
    sku = Column(String(255), nullable=True)
    
    # Pricing
    price = Column(Numeric(10, 2), nullable=False)  # Unit price
    quantity = Column(Integer, nullable=False)
    total_discount = Column(Numeric(10, 2), default=0.00)
    line_total = Column(Numeric(10, 2), nullable=False)  # price * quantity - discount
    
    # Commission
    commission_rate = Column(Numeric(5, 4), default=0.0000)
    commission_amount = Column(Numeric(10, 2), default=0.00)
    commission_paid = Column(Boolean, default=False)
    
    # Fulfillment
    fulfillment_status = Column(String(50), default="unfulfilled")
    fulfillment_quantity = Column(Integer, default=0)
    
    # Physical attributes
    weight = Column(Numeric(8, 2), nullable=True)
    requires_shipping = Column(Boolean, default=True)
    taxable = Column(Boolean, default=True)
    
    # Integration metadata
    shopify_data = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")
    variant = relationship("ProductVariant", back_populates="order_items")
    
    def __repr__(self):
        return f"<OrderItem(id={self.id}, title='{self.title}', quantity={self.quantity}, total={self.line_total})>"


class POSTransaction(Base):
    """
    Point of sale transactions for in-person retail sales.
    Tracks barber commissions and location-specific sales.
    """
    __tablename__ = "pos_transactions"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    transaction_number = Column(String(255), nullable=False, unique=True, index=True)
    
    # Location and staff
    location_id = Column(Integer, ForeignKey("barbershop_locations.id"), nullable=False)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Selling barber
    cashier_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Processing cashier
    
    # Customer
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_name = Column(String(255), nullable=True)
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(50), nullable=True)
    
    # Transaction details
    subtotal = Column(Numeric(10, 2), nullable=False)
    tax_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    tip_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(10, 2), nullable=False)
    
    # Payment
    payment_method = Column(String(50), nullable=False)  # cash, card, mixed
    payment_reference = Column(String(255), nullable=True)  # Transaction ID from processor
    
    # Commission tracking
    commission_rate = Column(Numeric(5, 4), nullable=False)
    commission_amount = Column(Numeric(10, 2), nullable=False)
    commission_paid = Column(Boolean, default=False)
    commission_paid_at = Column(DateTime, nullable=True)
    
    # Metadata
    notes = Column(Text, nullable=True)
    receipt_email_sent = Column(Boolean, default=False)
    
    # Timestamps
    transacted_at = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    barber = relationship("User", foreign_keys=[barber_id])
    cashier = relationship("User", foreign_keys=[cashier_id])
    customer = relationship("User", foreign_keys=[customer_id])
    
    def __repr__(self):
        return f"<POSTransaction(id={self.id}, number='{self.transaction_number}', total={self.total_amount}, barber_id={self.barber_id})>"