"""
Shopify Integration Service

Handles Shopify webhook processing, order synchronization, and commission calculation
for product sales made through Shopify online store.
"""

import logging
import hmac
import hashlib
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal

import requests
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models.barber_payment import ProductSale, SalesSource, PaymentIntegration
from models.barber import Barber
from models.appointment import Appointment
from config.database import get_db

logger = logging.getLogger(__name__)


class ShopifyService:
    """Service for Shopify integration and webhook processing"""

    def __init__(self, db: Session):
        self.db = db
        self.integration = self._get_integration_settings()

    def _get_integration_settings(self) -> Optional[PaymentIntegration]:
        """Get Shopify integration settings from database"""
        return self.db.query(PaymentIntegration).first()

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        """Verify Shopify webhook signature"""
        if not self.integration or not self.integration.shopify_webhook_secret:
            logger.warning("Shopify webhook secret not configured")
            return False

        computed_hmac = hmac.new(
            self.integration.shopify_webhook_secret.encode("utf-8"),
            body,
            hashlib.sha256,
        )
        return hmac.compare_digest(
            computed_hmac.hexdigest(), signature.replace("sha256=", "")
        )

    def process_order_webhook(self, order_data: Dict[str, Any]) -> List[ProductSale]:
        """
        Process Shopify order webhook and create product sales records

        Args:
            order_data: Shopify order webhook payload

        Returns:
            List of created ProductSale records
        """
        logger.info(
            f"Processing Shopify order webhook for order {order_data.get('id')}"
        )

        try:
            order_id = str(order_data.get("id"))
            order_number = order_data.get("order_number", order_data.get("name", ""))
            customer = order_data.get("customer", {})
            line_items = order_data.get("line_items", [])

            # Extract customer info
            customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
            customer_email = customer.get("email")

            # Try to match customer to existing appointments/barbers
            barber = self._find_barber_for_order(customer_email, customer_name)

            if not barber:
                logger.warning(
                    f"No barber found for Shopify order {order_number}, using default commission settings"
                )
                barber = self._get_default_barber()

            if not barber:
                logger.error(f"No barber available for Shopify order {order_number}")
                return []

            created_sales = []

            for item in line_items:
                product_sale = self._create_product_sale_from_line_item(
                    item, order_data, barber, customer_name, customer_email
                )
                if product_sale:
                    created_sales.append(product_sale)

            self.db.commit()
            logger.info(
                f"Created {len(created_sales)} product sales from Shopify order {order_number}"
            )
            return created_sales

        except Exception as e:
            logger.error(f"Error processing Shopify order webhook: {str(e)}")
            self.db.rollback()
            raise HTTPException(
                status_code=500, detail=f"Error processing Shopify order: {str(e)}"
            )

    def _find_barber_for_order(
        self, customer_email: str, customer_name: str
    ) -> Optional[Barber]:
        """Find the barber associated with this customer order"""
        if not customer_email:
            return None

        # Try to find recent appointment with this customer email
        recent_appointment = (
            self.db.query(Appointment)
            .join(Barber)
            .filter(Appointment.client_email == customer_email)
            .filter(Appointment.start_time >= datetime.utcnow() - timedelta(days=30))
            .order_by(Appointment.start_time.desc())
            .first()
        )

        if recent_appointment:
            return recent_appointment.barber

        return None

    def _get_default_barber(self) -> Optional[Barber]:
        """Get the default barber for product sales (first active barber)"""
        return self.db.query(Barber).filter(Barber.is_active == True).first()

    def _create_product_sale_from_line_item(
        self,
        line_item: Dict[str, Any],
        order_data: Dict[str, Any],
        barber: Barber,
        customer_name: str,
        customer_email: str,
    ) -> Optional[ProductSale]:
        """Create a ProductSale record from a Shopify line item"""
        try:
            product_name = line_item.get("name", "")
            product_id = str(line_item.get("product_id", ""))
            variant_id = str(line_item.get("variant_id", ""))
            sku = line_item.get("sku", "")

            quantity = int(line_item.get("quantity", 1))
            price = Decimal(str(line_item.get("price", "0")))
            total_amount = price * quantity

            # Get commission rate (default to barber's product commission rate or 15%)
            commission_rate = getattr(barber, "product_commission_rate", 0.15)
            commission_amount = total_amount * Decimal(str(commission_rate))

            # Check if this sale already exists
            existing_sale = (
                self.db.query(ProductSale)
                .filter(
                    ProductSale.shopify_order_id == str(order_data.get("id")),
                    ProductSale.shopify_variant_id == variant_id,
                )
                .first()
            )

            if existing_sale:
                logger.info(
                    f"Product sale already exists for Shopify order {order_data.get('id')} variant {variant_id}"
                )
                return existing_sale

            # Create new product sale
            product_sale = ProductSale(
                barber_id=barber.id,
                product_name=product_name,
                product_sku=sku,
                sale_price=price,
                quantity=quantity,
                total_amount=total_amount,
                commission_rate=commission_rate,
                commission_amount=commission_amount,
                sales_source=SalesSource.SHOPIFY,
                shopify_order_id=str(order_data.get("id")),
                shopify_order_number=order_data.get(
                    "order_number", order_data.get("name", "")
                ),
                shopify_product_id=product_id,
                shopify_variant_id=variant_id,
                shopify_fulfillment_status=order_data.get("fulfillment_status"),
                customer_name=customer_name,
                customer_email=customer_email,
                sale_date=datetime.fromisoformat(
                    order_data.get("created_at", "").replace("Z", "+00:00")
                ),
                sync_status="synced",
            )

            self.db.add(product_sale)
            return product_sale

        except Exception as e:
            logger.error(f"Error creating product sale from line item: {str(e)}")
            return None

    def sync_orders(self, days_back: int = 7) -> Dict[str, Any]:
        """
        Sync orders from Shopify API for the last N days

        Args:
            days_back: Number of days to sync back

        Returns:
            Sync results summary
        """
        if not self.integration or not self.integration.shopify_access_token:
            raise HTTPException(
                status_code=400, detail="Shopify integration not configured"
            )

        try:
            since_date = datetime.utcnow() - timedelta(days=days_back)
            orders = self._fetch_orders_from_api(since_date)

            synced_orders = 0
            created_sales = 0
            errors = []

            for order in orders:
                try:
                    sales = self.process_order_webhook(order)
                    created_sales += len(sales)
                    synced_orders += 1
                except Exception as e:
                    error_msg = f"Error syncing order {order.get('id')}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

            # Update last sync time
            if self.integration:
                self.integration.shopify_last_sync = datetime.utcnow()
                self.db.commit()

            return {
                "synced_orders": synced_orders,
                "created_sales": created_sales,
                "errors": errors,
                "sync_date": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error syncing Shopify orders: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Error syncing orders: {str(e)}"
            )

    def _fetch_orders_from_api(self, since_date: datetime) -> List[Dict[str, Any]]:
        """Fetch orders from Shopify API"""
        if not self.integration:
            return []

        shop_domain = self.integration.shopify_shop_domain
        access_token = self.integration.shopify_access_token

        if not shop_domain or not access_token:
            logger.error("Shopify shop domain or access token not configured")
            return []

        url = f"https://{shop_domain}/admin/api/2023-10/orders.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        }

        params = {
            "status": "any",
            "created_at_min": since_date.isoformat(),
            "limit": 250,  # Shopify's max per request
        }

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()
            orders = data.get("orders", [])

            logger.info(f"Fetched {len(orders)} orders from Shopify API")
            return orders

        except requests.RequestException as e:
            logger.error(f"Error fetching orders from Shopify API: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Error fetching Shopify orders: {str(e)}"
            )

    def get_sales_analytics(
        self, barber_id: Optional[int] = None, days: int = 30
    ) -> Dict[str, Any]:
        """Get Shopify sales analytics for dashboard"""
        query = self.db.query(ProductSale).filter(
            ProductSale.sales_source == SalesSource.SHOPIFY,
            ProductSale.sale_date >= datetime.utcnow() - timedelta(days=days),
        )

        if barber_id:
            query = query.filter(ProductSale.barber_id == barber_id)

        sales = query.all()

        total_sales = sum(sale.total_amount for sale in sales)
        total_commissions = sum(sale.commission_amount for sale in sales)
        total_orders = len(
            set(sale.shopify_order_id for sale in sales if sale.shopify_order_id)
        )

        # Top products
        product_sales = {}
        for sale in sales:
            if sale.product_name not in product_sales:
                product_sales[sale.product_name] = {
                    "quantity": 0,
                    "revenue": Decimal("0"),
                    "commission": Decimal("0"),
                }
            product_sales[sale.product_name]["quantity"] += sale.quantity
            product_sales[sale.product_name]["revenue"] += sale.total_amount
            product_sales[sale.product_name]["commission"] += sale.commission_amount

        top_products = sorted(
            [
                {
                    "product_name": name,
                    "quantity_sold": data["quantity"],
                    "total_revenue": float(data["revenue"]),
                    "total_commission": float(data["commission"]),
                }
                for name, data in product_sales.items()
            ],
            key=lambda x: x["total_revenue"],
            reverse=True,
        )[:5]

        return {
            "total_sales": float(total_sales),
            "total_commissions": float(total_commissions),
            "total_orders": total_orders,
            "sales_count": len(sales),
            "average_order_value": (
                float(total_sales / total_orders) if total_orders > 0 else 0
            ),
            "top_products": top_products,
            "source": "shopify",
        }

    def update_integration_settings(
        self, settings: Dict[str, Any]
    ) -> PaymentIntegration:
        """Update Shopify integration settings"""
        integration = self.integration or PaymentIntegration()

        if "shop_domain" in settings:
            integration.shopify_shop_domain = settings["shop_domain"]
        if "access_token" in settings:
            integration.shopify_access_token = settings["access_token"]
        if "webhook_secret" in settings:
            integration.shopify_webhook_secret = settings["webhook_secret"]
        if "environment" in settings:
            integration.shopify_environment = settings["environment"]

        integration.updated_at = datetime.utcnow()

        if not self.integration:
            self.db.add(integration)

        self.db.commit()
        return integration

    def get_products_from_api(self, limit: int = 250) -> List[Dict[str, Any]]:
        """Get products from Shopify API for catalog sync"""
        if not self.integration:
            return []

        shop_domain = self.integration.shopify_shop_domain
        access_token = self.integration.shopify_access_token

        if not shop_domain or not access_token:
            logger.error("Shopify shop domain or access token not configured")
            return []

        url = f"https://{shop_domain}/admin/api/2023-10/products.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        }

        params = {
            "limit": min(limit, 250),  # Shopify's max per request
            "fields": "id,title,handle,body_html,vendor,product_type,created_at,updated_at,published_at,tags,variants,options,images",
        }

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()
            products = data.get("products", [])

            logger.info(f"Fetched {len(products)} products from Shopify API")
            return products

        except requests.RequestException as e:
            logger.error(f"Error fetching products from Shopify API: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Error fetching Shopify products: {str(e)}"
            )

    def create_product_in_shopify(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a product in Shopify"""
        if not self.integration:
            raise HTTPException(
                status_code=400, detail="Shopify integration not configured"
            )

        shop_domain = self.integration.shopify_shop_domain
        access_token = self.integration.shopify_access_token

        url = f"https://{shop_domain}/admin/api/2023-10/products.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        }

        # Prepare product data for Shopify format
        shopify_product = {
            "product": {
                "title": product_data["name"],
                "body_html": product_data.get("description", ""),
                "vendor": product_data.get("brand", ""),
                "product_type": product_data.get("category", ""),
                "handle": product_data.get("handle", ""),
                "tags": ",".join(product_data.get("tags", [])),
                "variants": [
                    {
                        "price": str(product_data["price"]),
                        "sku": product_data.get("sku", ""),
                        "inventory_management": (
                            "shopify"
                            if product_data.get("track_inventory", True)
                            else None
                        ),
                        "inventory_quantity": product_data.get("inventory_quantity", 0),
                        "weight": 0,
                        "weight_unit": "lb",
                    }
                ],
            }
        }

        try:
            response = requests.post(
                url, headers=headers, json=shopify_product, timeout=30
            )
            response.raise_for_status()

            return response.json()["product"]

        except requests.RequestException as e:
            logger.error(f"Error creating product in Shopify: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Error creating Shopify product: {str(e)}"
            )

    def update_product_in_shopify(
        self, product_id: str, product_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a product in Shopify"""
        if not self.integration:
            raise HTTPException(
                status_code=400, detail="Shopify integration not configured"
            )

        shop_domain = self.integration.shopify_shop_domain
        access_token = self.integration.shopify_access_token

        url = f"https://{shop_domain}/admin/api/2023-10/products/{product_id}.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        }

        # Prepare update data
        update_data = {"product": {"id": int(product_id)}}

        if "name" in product_data:
            update_data["product"]["title"] = product_data["name"]
        if "description" in product_data:
            update_data["product"]["body_html"] = product_data["description"]
        if "brand" in product_data:
            update_data["product"]["vendor"] = product_data["brand"]
        if "category" in product_data:
            update_data["product"]["product_type"] = product_data["category"]
        if "tags" in product_data:
            update_data["product"]["tags"] = ",".join(product_data["tags"])

        try:
            response = requests.put(url, headers=headers, json=update_data, timeout=30)
            response.raise_for_status()

            return response.json()["product"]

        except requests.RequestException as e:
            logger.error(f"Error updating product in Shopify: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Error updating Shopify product: {str(e)}"
            )

    def get_collections_from_api(self) -> List[Dict[str, Any]]:
        """Get collections (categories) from Shopify API"""
        if not self.integration:
            return []

        shop_domain = self.integration.shopify_shop_domain
        access_token = self.integration.shopify_access_token

        if not shop_domain or not access_token:
            return []

        url = f"https://{shop_domain}/admin/api/2023-10/custom_collections.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        }

        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()

            data = response.json()
            return data.get("custom_collections", [])

        except requests.RequestException as e:
            logger.error(f"Error fetching collections from Shopify API: {str(e)}")
            return []


# Utility functions for Shopify webhook validation
def validate_shopify_webhook(request_body: bytes, signature: str, secret: str) -> bool:
    """Validate Shopify webhook signature"""
    computed_hmac = hmac.new(secret.encode("utf-8"), request_body, hashlib.sha256)
    return hmac.compare_digest(
        computed_hmac.hexdigest(), signature.replace("sha256=", "")
    )
