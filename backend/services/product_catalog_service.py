"""
Product Catalog Synchronization Service

Handles synchronization of product catalogs between external platforms (Square/Shopify)
and the local 6FB product catalog for POS integration and commission tracking.
"""

import logging
import json
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException

from models.product import (
    Product,
    ProductSource,
    ProductStatus,
    SyncStatus,
    ProductSyncLog,
    ProductCategory,
)
from models.barber_payment import ProductSale, SalesSource, PaymentIntegration
from models.user import User
from services.square_service import SquareService
from services.shopify_service import ShopifyService
from config.settings import get_settings

logger = logging.getLogger(__name__)


class ProductCatalogService:
    """Service for managing unified product catalog and synchronization"""

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.square_service = SquareService()

    async def sync_from_square(
        self,
        location_id: str,
        user_id: Optional[int] = None,
        sync_type: str = "incremental",
    ) -> Dict[str, Any]:
        """
        Sync products from Square catalog

        Args:
            location_id: Square location ID to sync from
            user_id: User initiating the sync
            sync_type: "full" or "incremental"

        Returns:
            Sync results summary
        """
        logger.info(f"Starting Square product sync for location {location_id}")

        sync_log = ProductSyncLog(
            sync_type=sync_type,
            source_platform=ProductSource.SQUARE,
            sync_direction="import",
            status=SyncStatus.PENDING,
            initiated_by=user_id,
        )
        self.db.add(sync_log)
        self.db.commit()

        try:
            # Get Square products
            square_products = await self._fetch_square_products(location_id)

            results = {"created": 0, "updated": 0, "failed": 0, "errors": []}

            for square_product in square_products:
                try:
                    # Process each product variation
                    variations = square_product.get("item_data", {}).get(
                        "variations", []
                    )

                    for variation in variations:
                        result = await self._process_square_product(
                            square_product, variation, location_id, user_id
                        )

                        if result["action"] == "created":
                            results["created"] += 1
                        elif result["action"] == "updated":
                            results["updated"] += 1
                        elif result["action"] == "failed":
                            results["failed"] += 1
                            results["errors"].append(
                                result.get("error", "Unknown error")
                            )

                except Exception as e:
                    logger.error(
                        f"Error processing Square product {square_product.get('id')}: {str(e)}"
                    )
                    results["failed"] += 1
                    results["errors"].append(str(e))

            # Update sync log
            sync_log.status = SyncStatus.SYNCED
            sync_log.records_processed = len(square_products)
            sync_log.records_created = results["created"]
            sync_log.records_updated = results["updated"]
            sync_log.records_failed = results["failed"]
            sync_log.completed_at = datetime.utcnow()

            self.db.commit()

            logger.info(f"Square sync completed: {results}")
            return results

        except Exception as e:
            logger.error(f"Square sync failed: {str(e)}")
            sync_log.status = SyncStatus.ERROR
            sync_log.error_message = str(e)
            sync_log.completed_at = datetime.utcnow()
            self.db.commit()
            raise HTTPException(status_code=500, detail=f"Square sync failed: {str(e)}")

    async def sync_from_shopify(
        self, user_id: Optional[int] = None, sync_type: str = "incremental"
    ) -> Dict[str, Any]:
        """
        Sync products from Shopify catalog

        Args:
            user_id: User initiating the sync
            sync_type: "full" or "incremental"

        Returns:
            Sync results summary
        """
        logger.info("Starting Shopify product sync")

        # Get integration settings
        integration = self.db.query(PaymentIntegration).first()
        if not integration or not integration.shopify_access_token:
            raise HTTPException(
                status_code=400, detail="Shopify integration not configured"
            )

        sync_log = ProductSyncLog(
            sync_type=sync_type,
            source_platform=ProductSource.SHOPIFY,
            sync_direction="import",
            status=SyncStatus.PENDING,
            initiated_by=user_id,
        )
        self.db.add(sync_log)
        self.db.commit()

        try:
            # Get Shopify products
            shopify_products = await self._fetch_shopify_products()

            results = {"created": 0, "updated": 0, "failed": 0, "errors": []}

            for shopify_product in shopify_products:
                try:
                    # Process each product variant
                    variants = shopify_product.get("variants", [])

                    for variant in variants:
                        result = await self._process_shopify_product(
                            shopify_product, variant, user_id
                        )

                        if result["action"] == "created":
                            results["created"] += 1
                        elif result["action"] == "updated":
                            results["updated"] += 1
                        elif result["action"] == "failed":
                            results["failed"] += 1
                            results["errors"].append(
                                result.get("error", "Unknown error")
                            )

                except Exception as e:
                    logger.error(
                        f"Error processing Shopify product {shopify_product.get('id')}: {str(e)}"
                    )
                    results["failed"] += 1
                    results["errors"].append(str(e))

            # Update sync log
            sync_log.status = SyncStatus.SYNCED
            sync_log.records_processed = len(shopify_products)
            sync_log.records_created = results["created"]
            sync_log.records_updated = results["updated"]
            sync_log.records_failed = results["failed"]
            sync_log.completed_at = datetime.utcnow()

            # Update last sync time
            integration.shopify_last_sync = datetime.utcnow()

            self.db.commit()

            logger.info(f"Shopify sync completed: {results}")
            return results

        except Exception as e:
            logger.error(f"Shopify sync failed: {str(e)}")
            sync_log.status = SyncStatus.ERROR
            sync_log.error_message = str(e)
            sync_log.completed_at = datetime.utcnow()
            self.db.commit()
            raise HTTPException(
                status_code=500, detail=f"Shopify sync failed: {str(e)}"
            )

    async def _fetch_square_products(self, location_id: str) -> List[Dict[str, Any]]:
        """Fetch products from Square Catalog API"""
        try:
            # This would use the Square API client
            # For now, returning mock data structure
            headers = {
                "Authorization": f"Bearer {self.settings.SQUARE_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.square_service.api_base_url}/v2/catalog/list",
                    headers=headers,
                    params={"types": "ITEM"},
                )

                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Square API error: {response.text}",
                    )

                data = response.json()
                return data.get("objects", [])

        except Exception as e:
            logger.error(f"Error fetching Square products: {str(e)}")
            raise

    async def _fetch_shopify_products(self) -> List[Dict[str, Any]]:
        """Fetch products from Shopify API"""
        try:
            integration = self.db.query(PaymentIntegration).first()
            shop_domain = integration.shopify_shop_domain
            access_token = integration.shopify_access_token

            url = f"https://{shop_domain}/admin/api/2023-10/products.json"
            headers = {
                "X-Shopify-Access-Token": access_token,
                "Content-Type": "application/json",
            }

            params = {
                "limit": 250,  # Shopify's max per request
                "fields": "id,title,handle,body_html,vendor,product_type,created_at,updated_at,published_at,tags,variants,options,images",
            }

            all_products = []

            async with httpx.AsyncClient() as client:
                while url:
                    response = await client.get(url, headers=headers, params=params)

                    if response.status_code != 200:
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=f"Shopify API error: {response.text}",
                        )

                    data = response.json()
                    products = data.get("products", [])
                    all_products.extend(products)

                    # Check for pagination
                    link_header = response.headers.get("Link", "")
                    if 'rel="next"' in link_header:
                        # Extract next URL from Link header
                        next_url = self._extract_next_url(link_header)
                        url = next_url
                        params = {}  # Clear params as they're in the URL
                    else:
                        break

            return all_products

        except Exception as e:
            logger.error(f"Error fetching Shopify products: {str(e)}")
            raise

    def _extract_next_url(self, link_header: str) -> Optional[str]:
        """Extract next URL from Shopify Link header"""
        links = link_header.split(",")
        for link in links:
            if 'rel="next"' in link:
                url = link.split(";")[0].strip("<>")
                return url
        return None

    async def _process_square_product(
        self,
        square_product: Dict[str, Any],
        variation: Dict[str, Any],
        location_id: str,
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Process a single Square product variation"""
        try:
            item_data = square_product.get("item_data", {})
            variation_data = variation.get("item_variation_data", {})

            # Extract product data
            name = item_data.get("name", "Unknown Product")
            description = item_data.get("description", "")
            sku = variation_data.get("sku", "")

            # Get price
            price_money = variation_data.get("price_money", {})
            price = (
                Decimal(str(price_money.get("amount", 0))) / 100
                if price_money.get("amount")
                else Decimal("0")
            )

            # Get category
            category_id = item_data.get("category_id")
            category = (
                await self._get_square_category_name(category_id)
                if category_id
                else None
            )

            # Check if product already exists
            existing_product = (
                self.db.query(Product)
                .filter(
                    Product.square_catalog_id == square_product["id"],
                    Product.square_variation_id == variation["id"],
                )
                .first()
            )

            if existing_product:
                # Update existing product
                existing_product.name = name
                existing_product.description = description
                existing_product.sku = sku
                existing_product.price = price
                existing_product.category = category
                existing_product.square_location_id = location_id
                existing_product.last_sync_at = datetime.utcnow()
                existing_product.sync_status = SyncStatus.SYNCED
                existing_product.updated_by = user_id

                return {"action": "updated", "product_id": existing_product.id}
            else:
                # Create new product
                new_product = Product(
                    name=name,
                    description=description,
                    sku=sku,
                    price=price,
                    category=category,
                    source=ProductSource.SQUARE,
                    status=ProductStatus.ACTIVE,
                    square_catalog_id=square_product["id"],
                    square_variation_id=variation["id"],
                    square_location_id=location_id,
                    last_sync_at=datetime.utcnow(),
                    sync_status=SyncStatus.SYNCED,
                    created_by=user_id,
                    updated_by=user_id,
                )

                self.db.add(new_product)
                self.db.flush()  # Get ID without committing

                return {"action": "created", "product_id": new_product.id}

        except Exception as e:
            logger.error(f"Error processing Square product: {str(e)}")
            return {"action": "failed", "error": str(e)}

    async def _process_shopify_product(
        self,
        shopify_product: Dict[str, Any],
        variant: Dict[str, Any],
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Process a single Shopify product variant"""
        try:
            # Extract product data
            name = shopify_product.get("title", "Unknown Product")
            if variant.get("title") != "Default Title":
                name += f" - {variant.get('title')}"

            description = shopify_product.get("body_html", "")
            sku = variant.get("sku", "")
            handle = shopify_product.get("handle", "")

            # Get price
            price = Decimal(str(variant.get("price", "0")))
            compare_at_price = (
                Decimal(str(variant.get("compare_at_price", "0")))
                if variant.get("compare_at_price")
                else None
            )

            # Get category/product type
            category = shopify_product.get("product_type") or shopify_product.get(
                "vendor"
            )

            # Get inventory
            inventory_quantity = variant.get("inventory_quantity", 0)
            track_inventory = variant.get("inventory_management") == "shopify"

            # Get tags
            tags = (
                json.dumps(shopify_product.get("tags", "").split(","))
                if shopify_product.get("tags")
                else None
            )

            # Check if product already exists
            existing_product = (
                self.db.query(Product)
                .filter(
                    Product.shopify_product_id == str(shopify_product["id"]),
                    Product.shopify_variant_id == str(variant["id"]),
                )
                .first()
            )

            if existing_product:
                # Update existing product
                existing_product.name = name
                existing_product.description = description
                existing_product.sku = sku
                existing_product.price = price
                existing_product.compare_at_price = compare_at_price
                existing_product.category = category
                existing_product.shopify_handle = handle
                existing_product.inventory_quantity = inventory_quantity
                existing_product.track_inventory = track_inventory
                existing_product.tags = tags
                existing_product.last_sync_at = datetime.utcnow()
                existing_product.sync_status = SyncStatus.SYNCED
                existing_product.updated_by = user_id

                # Update status based on availability
                if not variant.get("available", True):
                    existing_product.status = ProductStatus.OUT_OF_STOCK

                return {"action": "updated", "product_id": existing_product.id}
            else:
                # Create new product
                new_product = Product(
                    name=name,
                    description=description,
                    sku=sku,
                    price=price,
                    compare_at_price=compare_at_price,
                    category=category,
                    tags=tags,
                    track_inventory=track_inventory,
                    inventory_quantity=inventory_quantity,
                    source=ProductSource.SHOPIFY,
                    status=(
                        ProductStatus.ACTIVE
                        if variant.get("available", True)
                        else ProductStatus.OUT_OF_STOCK
                    ),
                    shopify_product_id=str(shopify_product["id"]),
                    shopify_variant_id=str(variant["id"]),
                    shopify_handle=handle,
                    last_sync_at=datetime.utcnow(),
                    sync_status=SyncStatus.SYNCED,
                    created_by=user_id,
                    updated_by=user_id,
                )

                self.db.add(new_product)
                self.db.flush()  # Get ID without committing

                return {"action": "created", "product_id": new_product.id}

        except Exception as e:
            logger.error(f"Error processing Shopify product: {str(e)}")
            return {"action": "failed", "error": str(e)}

    async def _get_square_category_name(self, category_id: str) -> Optional[str]:
        """Get Square category name by ID"""
        try:
            # This would fetch from Square API
            # For now, return a placeholder
            return f"Category_{category_id}"
        except Exception:
            return None

    def get_product_catalog(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
        source: Optional[ProductSource] = None,
        status: Optional[ProductStatus] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get products from local catalog with filters

        Args:
            category: Filter by category
            search: Search in name, description, SKU
            source: Filter by source platform
            status: Filter by status
            limit: Maximum results
            offset: Pagination offset

        Returns:
            Paginated product results
        """
        query = self.db.query(Product)

        # Apply filters
        if category:
            query = query.filter(Product.category == category)

        if search:
            search_filter = or_(
                Product.name.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%"),
            )
            query = query.filter(search_filter)

        if source:
            query = query.filter(Product.source == source)

        if status:
            query = query.filter(Product.status == status)

        # Get total count
        total = query.count()

        # Apply pagination and ordering
        products = query.order_by(Product.name).offset(offset).limit(limit).all()

        return {
            "products": [self._product_to_dict(product) for product in products],
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }

    def get_product_for_pos(self, product_id: int) -> Dict[str, Any]:
        """Get product formatted for POS system"""
        product = self.db.query(Product).filter(Product.id == product_id).first()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        return product.to_pos_dict()

    def search_products_for_pos(
        self, query: str, category: Optional[str] = None, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Search products for POS system"""
        search_query = self.db.query(Product).filter(
            Product.status == ProductStatus.ACTIVE,
            or_(Product.name.ilike(f"%{query}%"), Product.sku.ilike(f"%{query}%")),
        )

        if category:
            search_query = search_query.filter(Product.category == category)

        products = search_query.limit(limit).all()

        return [product.to_pos_dict() for product in products]

    def update_inventory(self, product_id: int, quantity_delta: int) -> Dict[str, Any]:
        """Update product inventory after sale/restock"""
        product = self.db.query(Product).filter(Product.id == product_id).first()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        success = product.update_inventory(quantity_delta)

        if not success:
            raise HTTPException(status_code=400, detail="Insufficient inventory")

        self.db.commit()

        return {
            "success": True,
            "new_quantity": product.inventory_quantity,
            "is_low_stock": product.is_low_stock,
        }

    def get_sync_status(self) -> Dict[str, Any]:
        """Get synchronization status for all platforms"""
        # Get last sync times
        integration = self.db.query(PaymentIntegration).first()

        # Get recent sync logs
        recent_logs = (
            self.db.query(ProductSyncLog)
            .filter(ProductSyncLog.started_at >= datetime.utcnow() - timedelta(days=7))
            .order_by(ProductSyncLog.started_at.desc())
            .limit(10)
            .all()
        )

        # Get product counts by source
        square_count = (
            self.db.query(Product)
            .filter(Product.source == ProductSource.SQUARE)
            .count()
        )
        shopify_count = (
            self.db.query(Product)
            .filter(Product.source == ProductSource.SHOPIFY)
            .count()
        )
        manual_count = (
            self.db.query(Product)
            .filter(Product.source == ProductSource.MANUAL)
            .count()
        )

        return {
            "last_sync": {
                "shopify": (
                    integration.shopify_last_sync.isoformat()
                    if integration and integration.shopify_last_sync
                    else None
                ),
                "square": None,  # Would need to add this field to integration
            },
            "product_counts": {
                "square": square_count,
                "shopify": shopify_count,
                "manual": manual_count,
                "total": square_count + shopify_count + manual_count,
            },
            "recent_syncs": [
                {
                    "id": log.id,
                    "platform": log.source_platform.value,
                    "type": log.sync_type,
                    "status": log.status.value,
                    "created": log.records_created,
                    "updated": log.records_updated,
                    "failed": log.records_failed,
                    "started_at": log.started_at.isoformat(),
                    "completed_at": (
                        log.completed_at.isoformat() if log.completed_at else None
                    ),
                }
                for log in recent_logs
            ],
        }

    def _product_to_dict(self, product: Product) -> Dict[str, Any]:
        """Convert Product model to dictionary"""
        return {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "sku": product.sku,
            "price": float(product.price),
            "cost_price": float(product.cost_price) if product.cost_price else None,
            "compare_at_price": (
                float(product.compare_at_price) if product.compare_at_price else None
            ),
            "category": product.category,
            "subcategory": product.subcategory,
            "brand": product.brand,
            "tags": json.loads(product.tags) if product.tags else [],
            "track_inventory": product.track_inventory,
            "inventory_quantity": product.inventory_quantity,
            "low_stock_threshold": product.low_stock_threshold,
            "is_in_stock": product.is_in_stock,
            "is_low_stock": product.is_low_stock,
            "status": product.status.value,
            "source": product.source.value,
            "sync_status": product.sync_status.value,
            "last_sync_at": (
                product.last_sync_at.isoformat() if product.last_sync_at else None
            ),
            "commission_rate": (
                float(product.commission_rate) if product.commission_rate else None
            ),
            "created_at": product.created_at.isoformat(),
            "updated_at": product.updated_at.isoformat(),
        }


# Helper function to create service instance
def get_product_catalog_service(db: Session) -> ProductCatalogService:
    """Get ProductCatalogService instance"""
    return ProductCatalogService(db)
