"""
Sales API Endpoints for POS System
Handles sales transactions from the point-of-sale system
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from config.database import get_db
from models.barber import Barber
from models.barber_payment import (
    ProductSale,
    BarberPaymentModel,
)
from models.product import Product
from api.v1.auth import get_current_user
from models.user import User
from services.rbac_service import RBACService, Permission


router = APIRouter()


# Pydantic Models
class SaleItem(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    commission_rate: float = 0.15


class SaleCreate(BaseModel):
    barber_id: int
    items: List[SaleItem]
    subtotal: float
    tax: float
    total: float
    payment_method: str
    payment_details: Dict[str, Any] = Field(default_factory=dict)
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None


class SaleResponse(BaseModel):
    id: int
    barber_id: int
    barber_name: str
    items: List[Dict[str, Any]]
    subtotal: float
    tax: float
    total: float
    payment_method: str
    transaction_date: datetime
    commission_total: float
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/", response_model=SaleResponse)
async def create_sale(
    sale: SaleCreate,
    db: Session = Depends(get_db),
):
    """Create a new sale transaction from POS"""

    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == sale.barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Get barber's payment model for commission tracking
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == sale.barber_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    # Process each item and create product sales records
    commission_total = 0.0
    sale_items = []

    for item in sale.items:
        # Verify product exists
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found",
            )

        # Calculate commission for this item
        item_total = item.unit_price * item.quantity
        item_commission = item_total * item.commission_rate
        commission_total += item_commission

        # Create product sale record if payment model exists
        if payment_model:
            product_sale = ProductSale(
                barber_id=sale.barber_id,
                payment_model_id=payment_model.id,
                product_name=product.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_amount=item_total,
                commission_rate=item.commission_rate * 100,  # Store as percentage
                commission_amount=item_commission,
                sale_date=datetime.utcnow(),
                sale_source="pos",
                customer_email=sale.customer_email,
                customer_phone=sale.customer_phone,
            )
            db.add(product_sale)

        # Add to response items
        sale_items.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": item_total,
                "commission": item_commission,
            }
        )

    # Commit the transaction
    db.commit()

    # Return the sale response
    # Using a mock ID since we don't have a dedicated sales table
    # In a real implementation, you might want to create a Sale model
    return SaleResponse(
        id=int(datetime.utcnow().timestamp()),  # Mock ID based on timestamp
        barber_id=barber.id,
        barber_name=f"{barber.first_name} {barber.last_name}",
        items=sale_items,
        subtotal=sale.subtotal,
        tax=sale.tax,
        total=sale.total,
        payment_method=sale.payment_method,
        transaction_date=datetime.utcnow(),
        commission_total=commission_total,
        customer_email=sale.customer_email,
        customer_phone=sale.customer_phone,
    )


@router.get("/recent")
async def get_recent_sales(
    barber_id: Optional[int] = None,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get recent sales transactions"""
    # Check permissions
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_REPORTS):
        # If not admin, can only view own sales
        if current_user.barber_id != barber_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own sales",
            )

    # Query recent product sales
    query = db.query(ProductSale)
    if barber_id:
        query = query.filter(ProductSale.barber_id == barber_id)

    recent_sales = query.order_by(ProductSale.sale_date.desc()).limit(limit).all()

    # Format response
    sales_data = []
    for sale in recent_sales:
        barber = db.query(Barber).filter(Barber.id == sale.barber_id).first()
        sales_data.append(
            {
                "id": sale.id,
                "barber_id": sale.barber_id,
                "barber_name": (
                    f"{barber.first_name} {barber.last_name}" if barber else "Unknown"
                ),
                "product_name": sale.product_name,
                "quantity": sale.quantity,
                "total_amount": float(sale.total_amount),
                "commission_amount": float(sale.commission_amount),
                "sale_date": sale.sale_date,
                "sale_source": sale.sale_source,
            }
        )

    return {"sales": sales_data, "total": len(sales_data)}
