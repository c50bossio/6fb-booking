"""
Square Service for Product Sales and Inventory Tracking
Handles POS integration, product catalog, and sales tracking
"""

import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from square.client import Client

# For now, comment out Square-specific models to get server running
# We'll implement these when needed
# from square.models import ...

from config.settings import Settings


class SquareService:
    def __init__(self):
        self.settings = Settings()

        # Initialize Square client
        self.client = Client(
            access_token=os.getenv("SQUARE_ACCESS_TOKEN"),
            environment=os.getenv("SQUARE_ENVIRONMENT", "sandbox"),
        )

        self.locations_api = self.client.locations
        self.catalog_api = self.client.catalog
        self.inventory_api = self.client.inventory
        self.orders_api = self.client.orders
        self.payments_api = self.client.payments
        self.team_api = self.client.team
        self.webhooks_api = self.client.webhooks

    def get_locations(self) -> List[Dict]:
        """Get all Square locations for the business"""
        try:
            result = self.locations_api.list_locations()

            if result.is_success():
                return [
                    location.to_dict() for location in result.body.get("locations", [])
                ]
            else:
                raise Exception(f"Failed to get locations: {result.errors}")
        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def create_product(self, product_data: Dict) -> Dict:
        """Create a product in Square catalog"""
        try:
            # Create item variation (pricing)
            item_variation = CatalogItemVariation(
                item_variation_data={
                    "name": product_data.get("variation_name", "Regular"),
                    "pricing_type": "FIXED_PRICING",
                    "price_money": {
                        "amount": int(Decimal(str(product_data["price"])) * 100),
                        "currency": "USD",
                    },
                    "sku": product_data.get("sku"),
                    "track_inventory": product_data.get("track_inventory", True),
                }
            )

            # Create catalog item
            catalog_item = CatalogItem(
                name=product_data["name"],
                description=product_data.get("description"),
                category_id=product_data.get("category_id"),
                variations=[item_variation],
            )

            # Create catalog object
            catalog_object = CatalogObject(
                type="ITEM",
                id=f"#{product_data.get('external_id', '')}",
                item_data=catalog_item,
            )

            request = CreateCatalogObjectRequest(
                idempotency_key=product_data.get("idempotency_key"),
                object=catalog_object,
            )

            result = self.catalog_api.upsert_catalog_object(request)

            if result.is_success():
                return result.body["catalog_object"]
            else:
                raise Exception(f"Failed to create product: {result.errors}")

        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def get_products(self, category: Optional[str] = None) -> List[Dict]:
        """Get all products from Square catalog"""
        try:
            types = "ITEM"
            result = self.catalog_api.list_catalog(types=types)

            if result.is_success():
                items = result.body.get("objects", [])

                if category:
                    # Filter by category if provided
                    items = [
                        item
                        for item in items
                        if item.get("item_data", {}).get("category_id") == category
                    ]

                return [item.to_dict() for item in items]
            else:
                raise Exception(f"Failed to get products: {result.errors}")

        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def get_sales_by_period(
        self, location_id: str, start_date: datetime, end_date: datetime
    ) -> List[Dict]:
        """Get all sales/orders for a specific period"""
        try:
            # Create time range filter
            date_time_filter = SearchOrdersDateTimeFilter(
                created_at=TimeRange(
                    start_at=start_date.isoformat() + "Z",
                    end_at=end_date.isoformat() + "Z",
                )
            )

            # Create search filter
            filter = SearchOrdersFilter(date_time_filter=date_time_filter)

            # Create search request
            request = SearchOrdersRequest(
                location_ids=[location_id], filter=filter, limit=500
            )

            result = self.orders_api.search_orders(request)

            if result.is_success():
                orders = result.body.get("orders", [])
                return [self._process_order(order) for order in orders]
            else:
                raise Exception(f"Failed to get sales: {result.errors}")

        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def _process_order(self, order: Dict) -> Dict:
        """Process Square order into our format"""
        processed_items = []

        for line_item in order.get("line_items", []):
            # Skip non-product items (services, discounts, etc.)
            if line_item.get("item_type") != "ITEM":
                continue

            processed_items.append(
                {
                    "catalog_object_id": line_item.get("catalog_object_id"),
                    "name": line_item.get("name"),
                    "quantity": int(line_item.get("quantity", "1")),
                    "base_price": float(
                        line_item.get("base_price_money", {}).get("amount", 0)
                    )
                    / 100,
                    "total_price": float(
                        line_item.get("total_money", {}).get("amount", 0)
                    )
                    / 100,
                    "variation_name": line_item.get("variation_name"),
                    "sku": line_item.get("catalog_version"),
                    "modifiers": line_item.get("modifiers", []),
                }
            )

        return {
            "id": order.get("id"),
            "location_id": order.get("location_id"),
            "created_at": order.get("created_at"),
            "updated_at": order.get("updated_at"),
            "state": order.get("state"),
            "total_amount": float(order.get("total_money", {}).get("amount", 0)) / 100,
            "items": processed_items,
            "customer_id": order.get("customer_id"),
            "employee_id": order.get("employee_id"),  # This could be the barber
            "source": order.get("source", {}).get("name", "Square POS"),
        }

    def get_team_members(self, location_id: Optional[str] = None) -> List[Dict]:
        """Get all team members (employees/barbers)"""
        try:
            result = self.team_api.search_team_members(
                body={
                    "query": {
                        "filter": {
                            "location_ids": [location_id] if location_id else None,
                            "status": "ACTIVE",
                        }
                    }
                }
            )

            if result.is_success():
                team_members = result.body.get("team_members", [])
                return [
                    {
                        "id": member.get("id"),
                        "given_name": member.get("given_name"),
                        "family_name": member.get("family_name"),
                        "email": member.get("email_address"),
                        "phone": member.get("phone_number"),
                        "is_owner": member.get("is_owner", False),
                        "status": member.get("status"),
                        "created_at": member.get("created_at"),
                        "assigned_locations": member.get("assigned_locations", {}).get(
                            "location_ids", []
                        ),
                    }
                    for member in team_members
                ]
            else:
                raise Exception(f"Failed to get team members: {result.errors}")

        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def link_barber_to_square_employee(self, barber_email: str) -> Optional[str]:
        """Find Square employee ID by email to link with barber"""
        try:
            team_members = self.get_team_members()

            for member in team_members:
                if member.get("email") == barber_email:
                    return member.get("id")

            return None

        except Exception as e:
            raise Exception(f"Failed to link barber: {str(e)}")

    def create_webhook_subscription(
        self, notification_url: str, event_types: List[str]
    ) -> Dict:
        """Create webhook subscription for real-time updates"""
        try:
            subscription = WebhookSubscription(
                name="6FB Product Sales Webhook",
                notification_url=notification_url,
                event_types=event_types,  # ['order.created', 'order.updated']
                enabled=True,
            )

            request = CreateWebhookSubscriptionRequest(
                subscription=subscription,
                idempotency_key=str(datetime.utcnow().timestamp()),
            )

            result = self.webhooks_api.create_webhook_subscription(request)

            if result.is_success():
                return result.body["subscription"]
            else:
                raise Exception(f"Failed to create webhook: {result.errors}")

        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def verify_webhook_signature(
        self, signature: str, body: str, webhook_signature_key: str
    ) -> bool:
        """Verify webhook signature for security"""
        import hmac
        import hashlib
        import base64

        # Create HMAC signature
        hmac_signature = hmac.new(
            webhook_signature_key.encode("utf-8"), body.encode("utf-8"), hashlib.sha256
        ).digest()

        # Base64 encode and compare
        expected_signature = base64.b64encode(hmac_signature).decode("utf-8")
        return hmac.compare_digest(expected_signature, signature)

    def get_inventory_count(self, catalog_object_id: str, location_id: str) -> int:
        """Get current inventory count for a product"""
        try:
            result = self.inventory_api.retrieve_inventory_count(
                catalog_object_id=catalog_object_id, location_id=location_id
            )

            if result.is_success():
                counts = result.body.get("counts", [])
                if counts:
                    return int(counts[0].get("quantity", "0"))
                return 0
            else:
                raise Exception(f"Failed to get inventory: {result.errors}")

        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def sync_sales_for_barber(
        self,
        square_employee_id: str,
        location_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict]:
        """Get all sales made by a specific barber/employee"""
        try:
            # Get all orders for the period
            all_orders = self.get_sales_by_period(location_id, start_date, end_date)

            # Filter orders by employee
            barber_orders = [
                order
                for order in all_orders
                if order.get("employee_id") == square_employee_id
            ]

            # Extract product sales
            product_sales = []
            for order in barber_orders:
                for item in order.get("items", []):
                    product_sales.append(
                        {
                            "order_id": order["id"],
                            "square_employee_id": square_employee_id,
                            "product_name": item["name"],
                            "sku": item.get("sku"),
                            "quantity": item["quantity"],
                            "unit_price": item["base_price"],
                            "total_price": item["total_price"],
                            "sale_date": order["created_at"],
                            "catalog_object_id": item.get("catalog_object_id"),
                        }
                    )

            return product_sales

        except Exception as e:
            raise Exception(f"Failed to sync sales: {str(e)}")
