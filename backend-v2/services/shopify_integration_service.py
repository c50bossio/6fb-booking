"""
Shopify integration service for e-commerce functionality.
Handles OAuth, product sync, order management, and inventory tracking.
"""

import os
import httpx
import asyncio
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging

from models.integration import Integration, IntegrationType, IntegrationStatus
from models.product import Product, ProductVariant, InventoryItem, Order, OrderItem
from services.integration_service import BaseIntegrationService
from utils.encryption import encrypt_data, decrypt_data

logger = logging.getLogger(__name__)


class ShopifyIntegrationService(BaseIntegrationService):
    """
    Shopify integration service for managing e-commerce functionality.
    Supports OAuth, product catalog sync, order processing, and inventory management.
    """
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.api_version = "2024-01"
        
    @property
    def integration_type(self) -> IntegrationType:
        return IntegrationType.SHOPIFY
    
    @property
    def oauth_authorize_url(self) -> str:
        # Shopify uses shop-specific OAuth URLs
        return "https://{shop}.myshopify.com/admin/oauth/authorize"
    
    @property
    def oauth_token_url(self) -> str:
        return "https://{shop}.myshopify.com/admin/oauth/access_token"
    
    @property
    def required_scopes(self) -> List[str]:
        return [
            "read_products",
            "write_products",
            "read_orders",
            "write_orders",
            "read_inventory",
            "write_inventory",
            "read_locations",
            "read_customers",
            "write_customers"
        ]
    
    @property
    def client_id(self) -> str:
        return os.getenv("SHOPIFY_CLIENT_ID", "")
    
    @property
    def client_secret(self) -> str:
        return os.getenv("SHOPIFY_CLIENT_SECRET", "")
    
    @property
    def default_redirect_uri(self) -> str:
        return os.getenv("SHOPIFY_REDIRECT_URI", "http://localhost:8000/api/v1/integrations/shopify/callback")
    
    def build_oauth_url(self, shop_domain: str, state: str, redirect_uri: Optional[str] = None) -> str:
        """Build Shopify OAuth authorization URL for specific shop"""
        redirect_uri = redirect_uri or self.default_redirect_uri
        scopes = ",".join(self.required_scopes)
        
        return (
            f"https://{shop_domain}/admin/oauth/authorize"
            f"?client_id={self.client_id}"
            f"&scope={scopes}"
            f"&redirect_uri={redirect_uri}"
            f"&state={state}"
        )
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str, shop_domain: str = None) -> Dict[str, Any]:
        """Exchange authorization code for access token with Shopify"""
        if not shop_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Shop domain is required for Shopify OAuth"
            )
        
        token_url = f"https://{shop_domain}/admin/oauth/access_token"
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(token_url, json=data)
                response.raise_for_status()
                token_data = response.json()
                
                # Shopify returns permanent access tokens (no refresh needed)
                return {
                    "access_token": token_data["access_token"],
                    "scope": token_data["scope"],
                    "shop_domain": shop_domain
                }
                
            except httpx.HTTPError as e:
                logger.error(f"Shopify token exchange failed: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to exchange code for tokens: {str(e)}"
                )
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Shopify tokens don't expire, so refresh is not needed"""
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shopify access tokens do not require refresh"
        )
    
    async def verify_connection(self, integration: Integration) -> Tuple[bool, Optional[str]]:
        """Verify Shopify connection by making a simple API call"""
        try:
            shop_domain = integration.config.get("shop_domain")
            if not shop_domain:
                return False, "Shop domain not configured"
            
            headers = {
                "X-Shopify-Access-Token": integration.access_token,
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://{shop_domain}/admin/api/{self.api_version}/shop.json",
                    headers=headers
                )
                
                if response.status_code == 200:
                    shop_data = response.json()
                    # Update integration with shop info
                    integration.config = {
                        **integration.config,
                        "shop_data": shop_data["shop"]
                    }
                    return True, None
                else:
                    return False, f"API call failed with status {response.status_code}"
                    
        except Exception as e:
            logger.error(f"Shopify connection verification failed: {str(e)}")
            return False, str(e)
    
    async def sync_products(self, integration: Integration, limit: int = 50) -> Dict[str, Any]:
        """Sync products from Shopify to local database"""
        try:
            shop_domain = integration.config.get("shop_domain")
            headers = {
                "X-Shopify-Access-Token": integration.access_token,
                "Content-Type": "application/json"
            }
            
            products_synced = 0
            products_updated = 0
            products_created = 0
            errors = []
            
            async with httpx.AsyncClient() as client:
                # Fetch products from Shopify
                response = await client.get(
                    f"https://{shop_domain}/admin/api/{self.api_version}/products.json",
                    headers=headers,
                    params={"limit": limit}
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Failed to fetch products from Shopify: {response.text}"
                    )
                
                shopify_products = response.json()["products"]
                
                for shopify_product in shopify_products:
                    try:
                        # Check if product exists locally
                        existing_product = self.db.query(Product).filter(
                            Product.external_id == str(shopify_product["id"])
                        ).first()
                        
                        if existing_product:
                            # Update existing product
                            self._update_product_from_shopify(existing_product, shopify_product)
                            products_updated += 1
                        else:
                            # Create new product
                            self._create_product_from_shopify(shopify_product, integration.user_id)
                            products_created += 1
                        
                        products_synced += 1
                        
                    except Exception as e:
                        error_msg = f"Failed to sync product {shopify_product.get('id', 'unknown')}: {str(e)}"
                        logger.error(error_msg)
                        errors.append(error_msg)
                
                # Update sync timestamp
                integration.last_sync_at = datetime.utcnow()
                integration.sync_status = "completed" if not errors else "partial"
                self.db.commit()
                
                return {
                    "products_synced": products_synced,
                    "products_created": products_created,
                    "products_updated": products_updated,
                    "errors": errors,
                    "status": "success" if not errors else "partial"
                }
                
        except Exception as e:
            logger.error(f"Product sync failed: {str(e)}")
            integration.sync_status = "error"
            integration.last_error = str(e)
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Product sync failed: {str(e)}"
            )
    
    def _create_product_from_shopify(self, shopify_product: Dict[str, Any], user_id: int) -> Product:
        """Create a new product from Shopify data"""
        from models.product import ProductType, ProductStatus
        
        # Map Shopify product type to our enum
        product_type_mapping = {
            "Hair Care": ProductType.HAIR_CARE,
            "Tools": ProductType.TOOLS,
            "Accessories": ProductType.ACCESSORIES,
            "Merchandise": ProductType.MERCHANDISE,
        }
        
        product_type = product_type_mapping.get(
            shopify_product.get("product_type", ""),
            ProductType.MERCHANDISE
        )
        
        product = Product(
            external_id=str(shopify_product["id"]),
            name=shopify_product["title"],
            description=shopify_product.get("body_html", ""),
            product_type=product_type,
            vendor=shopify_product.get("vendor", ""),
            tags=shopify_product.get("tags", "").split(",") if shopify_product.get("tags") else [],
            status=ProductStatus.ACTIVE if shopify_product["status"] == "active" else ProductStatus.INACTIVE,
            published=shopify_product["status"] == "active",
            handle=shopify_product.get("handle", ""),
            seo_title=shopify_product.get("seo", {}).get("title"),
            seo_description=shopify_product.get("seo", {}).get("description"),
            shopify_data=shopify_product,
            sync_status="synced",
            last_synced_at=datetime.utcnow()
        )
        
        # Set price from first variant
        if shopify_product.get("variants"):
            first_variant = shopify_product["variants"][0]
            product.price = float(first_variant.get("price", 0))
            product.compare_at_price = float(first_variant.get("compare_at_price", 0)) if first_variant.get("compare_at_price") else None
            product.sku = first_variant.get("sku")
        
        self.db.add(product)
        self.db.flush()  # Get product ID
        
        # Create variants
        for variant_data in shopify_product.get("variants", []):
            variant = ProductVariant(
                product_id=product.id,
                external_id=str(variant_data["id"]),
                sku=variant_data.get("sku"),
                title=variant_data["title"],
                option1=variant_data.get("option1"),
                option2=variant_data.get("option2"),
                option3=variant_data.get("option3"),
                price=float(variant_data["price"]),
                compare_at_price=float(variant_data["compare_at_price"]) if variant_data.get("compare_at_price") else None,
                weight=float(variant_data.get("weight", 0)) if variant_data.get("weight") else None,
                weight_unit=variant_data.get("weight_unit", "g"),
                inventory_quantity=variant_data.get("inventory_quantity", 0),
                inventory_policy=variant_data.get("inventory_policy", "deny"),
                available=variant_data.get("available", True),
                position=variant_data.get("position", 1),
                shopify_data=variant_data,
                barcode=variant_data.get("barcode")
            )
            self.db.add(variant)
        
        return product
    
    def _update_product_from_shopify(self, product: Product, shopify_product: Dict[str, Any]):
        """Update existing product with Shopify data"""
        from models.product import ProductStatus
        
        product.name = shopify_product["title"]
        product.description = shopify_product.get("body_html", "")
        product.vendor = shopify_product.get("vendor", "")
        product.tags = shopify_product.get("tags", "").split(",") if shopify_product.get("tags") else []
        product.status = ProductStatus.ACTIVE if shopify_product["status"] == "active" else ProductStatus.INACTIVE
        product.published = shopify_product["status"] == "active"
        product.handle = shopify_product.get("handle", "")
        product.shopify_data = shopify_product
        product.sync_status = "synced"
        product.last_synced_at = datetime.utcnow()
        
        # Update price from first variant
        if shopify_product.get("variants"):
            first_variant = shopify_product["variants"][0]
            product.price = float(first_variant.get("price", 0))
            product.compare_at_price = float(first_variant.get("compare_at_price", 0)) if first_variant.get("compare_at_price") else None
        
        # Update variants (simplified - in production you'd want more sophisticated sync)
        existing_variant_ids = {v.external_id for v in product.variants}
        shopify_variant_ids = {str(v["id"]) for v in shopify_product.get("variants", [])}
        
        # Remove variants that no longer exist in Shopify
        for variant in product.variants:
            if variant.external_id not in shopify_variant_ids:
                self.db.delete(variant)
        
        # Update or create variants
        for variant_data in shopify_product.get("variants", []):
            variant_id = str(variant_data["id"])
            existing_variant = next(
                (v for v in product.variants if v.external_id == variant_id),
                None
            )
            
            if existing_variant:
                # Update existing variant
                existing_variant.title = variant_data["title"]
                existing_variant.price = float(variant_data["price"])
                existing_variant.compare_at_price = float(variant_data["compare_at_price"]) if variant_data.get("compare_at_price") else None
                existing_variant.inventory_quantity = variant_data.get("inventory_quantity", 0)
                existing_variant.available = variant_data.get("available", True)
                existing_variant.shopify_data = variant_data
            else:
                # Create new variant
                variant = ProductVariant(
                    product_id=product.id,
                    external_id=variant_id,
                    sku=variant_data.get("sku"),
                    title=variant_data["title"],
                    option1=variant_data.get("option1"),
                    option2=variant_data.get("option2"),
                    option3=variant_data.get("option3"),
                    price=float(variant_data["price"]),
                    compare_at_price=float(variant_data["compare_at_price"]) if variant_data.get("compare_at_price") else None,
                    weight=float(variant_data.get("weight", 0)) if variant_data.get("weight") else None,
                    weight_unit=variant_data.get("weight_unit", "g"),
                    inventory_quantity=variant_data.get("inventory_quantity", 0),
                    inventory_policy=variant_data.get("inventory_policy", "deny"),
                    available=variant_data.get("available", True),
                    position=variant_data.get("position", 1),
                    shopify_data=variant_data,
                    barcode=variant_data.get("barcode")
                )
                self.db.add(variant)
    
    async def create_webhook(self, integration: Integration, topic: str, endpoint: str) -> Dict[str, Any]:
        """Create a webhook in Shopify for real-time updates"""
        try:
            shop_domain = integration.config.get("shop_domain")
            headers = {
                "X-Shopify-Access-Token": integration.access_token,
                "Content-Type": "application/json"
            }
            
            webhook_data = {
                "webhook": {
                    "topic": topic,
                    "address": endpoint,
                    "format": "json"
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://{shop_domain}/admin/api/{self.api_version}/webhooks.json",
                    headers=headers,
                    json=webhook_data
                )
                
                if response.status_code == 201:
                    webhook = response.json()["webhook"]
                    logger.info(f"Created Shopify webhook {webhook['id']} for topic {topic}")
                    return webhook
                else:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Failed to create webhook: {response.text}"
                    )
                    
        except Exception as e:
            logger.error(f"Webhook creation failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create webhook: {str(e)}"
            )
    
    async def handle_webhook(self, topic: str, data: Dict[str, Any], integration: Integration) -> Dict[str, Any]:
        """Handle incoming Shopify webhooks"""
        try:
            if topic == "products/create" or topic == "products/update":
                return await self._handle_product_webhook(data, integration)
            elif topic == "orders/create":
                return await self._handle_order_webhook(data, integration)
            elif topic == "orders/updated":
                return await self._handle_order_update_webhook(data, integration)
            else:
                logger.warning(f"Unhandled webhook topic: {topic}")
                return {"status": "ignored", "topic": topic}
                
        except Exception as e:
            logger.error(f"Webhook handling failed: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def _handle_product_webhook(self, product_data: Dict[str, Any], integration: Integration) -> Dict[str, Any]:
        """Handle product create/update webhook"""
        try:
            existing_product = self.db.query(Product).filter(
                Product.external_id == str(product_data["id"])
            ).first()
            
            if existing_product:
                self._update_product_from_shopify(existing_product, product_data)
                action = "updated"
            else:
                self._create_product_from_shopify(product_data, integration.user_id)
                action = "created"
            
            self.db.commit()
            return {"status": "success", "action": action, "product_id": product_data["id"]}
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    async def _handle_order_webhook(self, order_data: Dict[str, Any], integration: Integration) -> Dict[str, Any]:
        """Handle new order webhook"""
        try:
            # Check if order already exists
            existing_order = self.db.query(Order).filter(
                Order.external_id == str(order_data["id"])
            ).first()
            
            if existing_order:
                return {"status": "duplicate", "order_id": order_data["id"]}
            
            # Create new order
            from models.product import OrderSource, OrderStatus
            
            order = Order(
                external_id=str(order_data["id"]),
                order_number=order_data["order_number"],
                customer_email=order_data.get("customer", {}).get("email"),
                source=OrderSource.SHOPIFY,
                status=OrderStatus.CONFIRMED,
                financial_status=order_data.get("financial_status", "pending"),
                fulfillment_status=order_data.get("fulfillment_status", "unfulfilled"),
                subtotal=float(order_data.get("subtotal_price", 0)),
                tax_amount=float(order_data.get("total_tax", 0)),
                total_amount=float(order_data["total_price"]),
                currency=order_data.get("currency", "USD"),
                shipping_address=order_data.get("shipping_address"),
                billing_address=order_data.get("billing_address"),
                shopify_data=order_data,
                ordered_at=datetime.fromisoformat(order_data["created_at"].replace("Z", "+00:00"))
            )
            
            self.db.add(order)
            self.db.flush()
            
            # Create order items
            for line_item in order_data.get("line_items", []):
                order_item = OrderItem(
                    order_id=order.id,
                    external_id=str(line_item["id"]),
                    title=line_item["title"],
                    variant_title=line_item.get("variant_title"),
                    sku=line_item.get("sku"),
                    price=float(line_item["price"]),
                    quantity=line_item["quantity"],
                    line_total=float(line_item["price"]) * line_item["quantity"],
                    shopify_data=line_item
                )
                
                # Try to link to local product
                if line_item.get("product_id"):
                    local_product = self.db.query(Product).filter(
                        Product.external_id == str(line_item["product_id"])
                    ).first()
                    if local_product:
                        order_item.product_id = local_product.id
                
                if line_item.get("variant_id"):
                    local_variant = self.db.query(ProductVariant).filter(
                        ProductVariant.external_id == str(line_item["variant_id"])
                    ).first()
                    if local_variant:
                        order_item.variant_id = local_variant.id
                
                self.db.add(order_item)
            
            self.db.commit()
            return {"status": "success", "action": "created", "order_id": order_data["id"]}
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    async def _handle_order_update_webhook(self, order_data: Dict[str, Any], integration: Integration) -> Dict[str, Any]:
        """Handle order update webhook"""
        try:
            existing_order = self.db.query(Order).filter(
                Order.external_id == str(order_data["id"])
            ).first()
            
            if not existing_order:
                # Order doesn't exist, create it
                return await self._handle_order_webhook(order_data, integration)
            
            # Update order status
            from models.product import OrderStatus
            
            status_mapping = {
                "pending": OrderStatus.PENDING,
                "open": OrderStatus.CONFIRMED,
                "closed": OrderStatus.FULFILLED,
                "cancelled": OrderStatus.CANCELLED
            }
            
            existing_order.status = status_mapping.get(order_data.get("status"), OrderStatus.PENDING)
            existing_order.financial_status = order_data.get("financial_status", "pending")
            existing_order.fulfillment_status = order_data.get("fulfillment_status", "unfulfilled")
            existing_order.shopify_data = order_data
            
            if order_data.get("cancelled_at"):
                existing_order.cancelled_at = datetime.fromisoformat(order_data["cancelled_at"].replace("Z", "+00:00"))
            
            self.db.commit()
            return {"status": "success", "action": "updated", "order_id": order_data["id"]}
            
        except Exception as e:
            self.db.rollback()
            raise e