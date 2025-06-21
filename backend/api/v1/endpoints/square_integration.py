"""
Square Integration API Endpoints
Handles product catalog sync, sales tracking, and barber linking
"""

from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
    BackgroundTasks,
    Request,
)
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from config.database import get_db
from models.barber import Barber
from models.barber_payment import BarberPaymentModel, ProductSale, PaymentIntegration
from api.v1.auth import get_current_user
from models.user import User
from services.rbac_service import RBACService, Permission
from services.square_service import SquareService


router = APIRouter()


# Pydantic Models
class SquareLocationResponse(BaseModel):
    id: str
    name: str
    address: Optional[dict]
    timezone: Optional[str]
    status: str


class SquareProductCreate(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    track_inventory: bool = True
    initial_quantity: Optional[int] = 0


class SquareProductResponse(BaseModel):
    id: str
    name: str
    price: float
    sku: Optional[str]
    category: Optional[str]
    in_stock: Optional[bool]
    quantity: Optional[int]


class BarberSquareLinkRequest(BaseModel):
    barber_id: int
    square_location_id: str
    square_employee_email: Optional[str] = None
    square_employee_id: Optional[str] = None


class SalesSyncRequest(BaseModel):
    location_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    barber_id: Optional[int] = None


class SquareWebhookRequest(BaseModel):
    merchant_id: str
    type: str
    event_id: str
    created_at: str
    data: dict


# API Endpoints
@router.get("/locations", response_model=List[SquareLocationResponse])
async def get_square_locations(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get all Square locations for the business"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    square_service = SquareService()

    try:
        locations = square_service.get_locations()

        return [
            SquareLocationResponse(
                id=loc["id"],
                name=loc["name"],
                address=loc.get("address"),
                timezone=loc.get("timezone"),
                status=loc["status"],
            )
            for loc in locations
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Square locations: {str(e)}",
        )


@router.post("/products", response_model=SquareProductResponse)
async def create_square_product(
    product: SquareProductCreate,
    location_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a product in Square catalog"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PRODUCTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    square_service = SquareService()

    try:
        # Create product in Square
        product_data = {
            "name": product.name,
            "price": product.price,
            "description": product.description,
            "sku": product.sku,
            "category": product.category,
            "track_inventory": product.track_inventory,
        }

        square_product = square_service.create_product(product_data)

        return SquareProductResponse(
            id=square_product["id"],
            name=square_product["item_data"]["name"],
            price=float(
                square_product["item_data"]["variations"][0]["item_variation_data"][
                    "price_money"
                ]["amount"]
            )
            / 100,
            sku=square_product["item_data"]["variations"][0]["item_variation_data"].get(
                "sku"
            ),
            category=product.category,
            in_stock=True,
            quantity=product.initial_quantity,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create product: {str(e)}",
        )


@router.get("/products", response_model=List[SquareProductResponse])
async def get_square_products(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all products from Square catalog"""
    square_service = SquareService()

    try:
        products = square_service.get_products(category)

        response_products = []
        for product in products:
            if "item_data" in product and product["item_data"].get("variations"):
                variation = product["item_data"]["variations"][0]["item_variation_data"]

                response_products.append(
                    SquareProductResponse(
                        id=product["id"],
                        name=product["item_data"]["name"],
                        price=float(variation["price_money"]["amount"]) / 100,
                        sku=variation.get("sku"),
                        category=category,
                        in_stock=True,  # Would need inventory API call for real status
                    )
                )

        return response_products

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get products: {str(e)}",
        )


@router.post("/link-barber")
async def link_barber_to_square(
    link_request: BarberSquareLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Link a barber to their Square employee account"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get barber's payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == link_request.barber_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment model not found for barber",
        )

    square_service = SquareService()

    try:
        # If email provided, find Square employee ID
        if link_request.square_employee_email and not link_request.square_employee_id:
            square_employee_id = square_service.link_barber_to_square_employee(
                link_request.square_employee_email
            )
            if not square_employee_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Square employee not found with that email",
                )
        else:
            square_employee_id = link_request.square_employee_id

        # Update payment model
        payment_model.square_location_id = link_request.square_location_id
        payment_model.square_employee_id = square_employee_id

        db.commit()

        return {
            "success": True,
            "message": "Barber linked to Square successfully",
            "square_employee_id": square_employee_id,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to link barber: {str(e)}",
        )


@router.post("/sync-sales")
async def sync_square_sales(
    sync_request: SalesSyncRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sync sales from Square for commission calculation"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Default to last 7 days if no dates provided
    if not sync_request.start_date:
        sync_request.start_date = datetime.utcnow() - timedelta(days=7)
    if not sync_request.end_date:
        sync_request.end_date = datetime.utcnow()

    # Add background task to sync sales
    background_tasks.add_task(
        sync_sales_task,
        db,
        sync_request.location_id,
        sync_request.start_date,
        sync_request.end_date,
        sync_request.barber_id,
    )

    return {
        "success": True,
        "message": "Sales sync started in background",
        "period": f"{sync_request.start_date.date()} to {sync_request.end_date.date()}",
    }


async def sync_sales_task(
    db: Session,
    location_id: str,
    start_date: datetime,
    end_date: datetime,
    barber_id: Optional[int] = None,
):
    """Background task to sync Square sales"""
    square_service = SquareService()

    try:
        # Get barbers to sync
        query = db.query(BarberPaymentModel).filter(
            BarberPaymentModel.active == True,
            BarberPaymentModel.square_location_id == location_id,
            BarberPaymentModel.square_employee_id.isnot(None),
        )

        if barber_id:
            query = query.filter(BarberPaymentModel.barber_id == barber_id)

        payment_models = query.all()

        for model in payment_models:
            # Get sales for this barber
            sales = square_service.sync_sales_for_barber(
                model.square_employee_id, location_id, start_date, end_date
            )

            # Process each sale
            for sale in sales:
                # Check if sale already exists
                existing_sale = (
                    db.query(ProductSale)
                    .filter(
                        ProductSale.square_transaction_id == sale["order_id"],
                        ProductSale.barber_id == model.barber_id,
                    )
                    .first()
                )

                if not existing_sale:
                    # Calculate commission
                    total_amount = sale["total_price"]
                    commission_amount = total_amount * model.product_commission_rate

                    # Create product sale record
                    product_sale = ProductSale(
                        barber_id=model.barber_id,
                        product_name=sale["product_name"],
                        product_sku=sale.get("sku"),
                        sale_price=sale["unit_price"],
                        quantity=sale["quantity"],
                        total_amount=total_amount,
                        commission_rate=model.product_commission_rate,
                        commission_amount=commission_amount,
                        square_transaction_id=sale["order_id"],
                        sale_date=datetime.fromisoformat(
                            sale["sale_date"].replace("Z", "+00:00")
                        ),
                    )

                    db.add(product_sale)

            db.commit()

    except Exception as e:
        db.rollback()
        # Log error - in production, you'd use proper logging
        print(f"Failed to sync sales: {str(e)}")


@router.post("/webhook", include_in_schema=False)
async def handle_square_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Square webhooks for real-time sales updates"""
    # Get webhook signature
    signature = request.headers.get("X-Square-Hmacsha256-Signature")

    # Get raw body
    body = await request.body()
    body_str = body.decode("utf-8")

    # Verify signature
    payment_integration = db.query(PaymentIntegration).first()
    if payment_integration and payment_integration.square_webhook_signature_key:
        square_service = SquareService()
        if not square_service.verify_webhook_signature(
            signature, body_str, payment_integration.square_webhook_signature_key
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )

    # Parse webhook data
    webhook_data = await request.json()

    # Handle different event types
    if (
        webhook_data["type"] == "order.created"
        or webhook_data["type"] == "order.updated"
    ):
        order = webhook_data["data"]["object"]["order"]

        # Find barber by Square employee ID
        if "employee_id" in order:
            payment_model = (
                db.query(BarberPaymentModel)
                .filter(
                    BarberPaymentModel.square_employee_id == order["employee_id"],
                    BarberPaymentModel.active == True,
                )
                .first()
            )

            if payment_model:
                # Process order items
                for line_item in order.get("line_items", []):
                    if line_item.get("item_type") != "ITEM":
                        continue

                    # Check if sale already exists
                    existing_sale = (
                        db.query(ProductSale)
                        .filter(
                            ProductSale.square_transaction_id == order["id"],
                            ProductSale.product_name == line_item["name"],
                        )
                        .first()
                    )

                    if not existing_sale and order["state"] == "COMPLETED":
                        # Create product sale
                        total_amount = float(line_item["total_money"]["amount"]) / 100
                        commission_amount = (
                            total_amount * payment_model.product_commission_rate
                        )

                        product_sale = ProductSale(
                            barber_id=payment_model.barber_id,
                            product_name=line_item["name"],
                            product_sku=line_item.get("catalog_version"),
                            sale_price=float(line_item["base_price_money"]["amount"])
                            / 100,
                            quantity=int(line_item["quantity"]),
                            total_amount=total_amount,
                            commission_rate=payment_model.product_commission_rate,
                            commission_amount=commission_amount,
                            square_transaction_id=order["id"],
                            sale_date=datetime.fromisoformat(
                                order["created_at"].replace("Z", "+00:00")
                            ),
                        )

                        db.add(product_sale)

                db.commit()

    return {"status": "ok"}


@router.get("/sales/summary")
async def get_sales_summary(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get product sales summary for barbers"""
    rbac = RBACService(db)

    # Build query
    query = db.query(ProductSale).filter(
        ProductSale.sale_date >= start_date, ProductSale.sale_date <= end_date
    )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not a barber account"
            )
        query = query.filter(ProductSale.barber_id == barber.id)
    elif barber_id:
        query = query.filter(ProductSale.barber_id == barber_id)

    sales = query.all()

    # Calculate summary
    total_sales = sum(sale.total_amount for sale in sales)
    total_commission = sum(sale.commission_amount for sale in sales)
    product_count = len(set(sale.product_name for sale in sales))

    # Group by product
    products_summary = {}
    for sale in sales:
        if sale.product_name not in products_summary:
            products_summary[sale.product_name] = {
                "name": sale.product_name,
                "quantity_sold": 0,
                "total_revenue": 0,
                "total_commission": 0,
            }

        products_summary[sale.product_name]["quantity_sold"] += sale.quantity
        products_summary[sale.product_name]["total_revenue"] += sale.total_amount
        products_summary[sale.product_name][
            "total_commission"
        ] += sale.commission_amount

    return {
        "period": {"start": start_date, "end": end_date},
        "summary": {
            "total_sales": float(total_sales),
            "total_commission": float(total_commission),
            "product_count": product_count,
            "transaction_count": len(sales),
        },
        "products": list(products_summary.values()),
        "top_sellers": sorted(
            products_summary.values(), key=lambda x: x["total_revenue"], reverse=True
        )[:10],
    }


# Include in main router
def include_router(app):
    app.include_router(router, prefix="/api/v1/square", tags=["square-integration"])
