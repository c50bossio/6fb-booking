"""
Square Sales Sync Background Tasks
Automatically syncs product sales from Square POS
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config.database import SessionLocal
from models.barber_payment import BarberPaymentModel, ProductSale, PaymentIntegration
from services.square_service import SquareService


class SquareSyncScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.square_service = None  # Initialize lazily to avoid startup issues

    def _ensure_square_service(self):
        """Ensure Square service is initialized"""
        if self.square_service is None:
            try:
                self.square_service = SquareService()
            except Exception as e:
                print(f"Failed to initialize Square service: {e}")
                return False
        return True

    def start(self):
        """Start the scheduler with configured jobs"""
        # Sync sales every hour
        self.scheduler.add_job(
            self.sync_all_locations,
            CronTrigger(minute=0),  # Run at the top of every hour
            id="hourly_square_sync",
            name="Sync Square sales hourly",
            misfire_grace_time=300,  # 5 minutes grace period
        )

        # Daily reconciliation at 2 AM
        self.scheduler.add_job(
            self.daily_reconciliation,
            CronTrigger(hour=2, minute=0),
            id="daily_square_reconciliation",
            name="Daily Square sales reconciliation",
            misfire_grace_time=3600,  # 1 hour grace period
        )

        self.scheduler.start()

    async def sync_all_locations(self):
        """Sync sales from all Square locations"""
        if not self._ensure_square_service():
            print("Square service not available, skipping sync")
            return

        db = SessionLocal()

        try:
            # Get all active Square integrations
            payment_integration = db.query(PaymentIntegration).first()
            if not payment_integration or not payment_integration.square_access_token:
                return

            # Get all unique Square locations
            locations = (
                db.query(BarberPaymentModel.square_location_id)
                .filter(
                    BarberPaymentModel.active == True,
                    BarberPaymentModel.square_location_id.isnot(None),
                )
                .distinct()
                .all()
            )

            # Sync last 2 hours of sales (with overlap for safety)
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(hours=2)

            for location in locations:
                await self.sync_location_sales(
                    db, location.square_location_id, start_date, end_date
                )

            # Update last sync timestamp
            payment_integration.last_sync_at = datetime.utcnow()
            db.commit()

        except Exception as e:
            print(f"Square sync error: {str(e)}")
            db.rollback()
        finally:
            db.close()

    async def sync_location_sales(
        self, db: Session, location_id: str, start_date: datetime, end_date: datetime
    ):
        """Sync sales for a specific location"""
        try:
            # Get all orders for the location
            orders = self.square_service.get_sales_by_period(
                location_id, start_date, end_date
            )

            # Process each order
            for order in orders:
                if order.get("state") != "COMPLETED":
                    continue

                employee_id = order.get("employee_id")
                if not employee_id:
                    continue

                # Find barber by Square employee ID
                payment_model = (
                    db.query(BarberPaymentModel)
                    .filter(
                        BarberPaymentModel.square_employee_id == employee_id,
                        BarberPaymentModel.active == True,
                    )
                    .first()
                )

                if not payment_model:
                    continue

                # Process order items
                for item in order.get("items", []):
                    # Skip if already processed
                    existing = (
                        db.query(ProductSale)
                        .filter(
                            ProductSale.square_transaction_id == order["id"],
                            ProductSale.product_name == item["name"],
                            ProductSale.barber_id == payment_model.barber_id,
                        )
                        .first()
                    )

                    if existing:
                        continue

                    # Calculate commission
                    total_amount = item["total_price"]
                    commission_amount = (
                        total_amount * payment_model.product_commission_rate
                    )

                    # Create product sale record
                    product_sale = ProductSale(
                        barber_id=payment_model.barber_id,
                        product_name=item["name"],
                        product_sku=item.get("sku"),
                        sale_price=item["unit_price"],
                        quantity=item["quantity"],
                        total_amount=total_amount,
                        commission_rate=payment_model.product_commission_rate,
                        commission_amount=commission_amount,
                        square_transaction_id=order["id"],
                        square_payment_id=order["id"],
                        square_location_id=location_id,
                        sale_date=datetime.fromisoformat(
                            order["created_at"].replace("Z", "+00:00")
                        ),
                    )

                    db.add(product_sale)

            db.commit()

        except Exception as e:
            print(f"Location sync error for {location_id}: {str(e)}")
            db.rollback()

    async def daily_reconciliation(self):
        """Daily reconciliation to catch any missed sales"""
        db = SessionLocal()

        try:
            # Sync last 24 hours for all locations
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=1)

            locations = (
                db.query(BarberPaymentModel.square_location_id)
                .filter(
                    BarberPaymentModel.active == True,
                    BarberPaymentModel.square_location_id.isnot(None),
                )
                .distinct()
                .all()
            )

            for location in locations:
                await self.sync_location_sales(
                    db, location.square_location_id, start_date, end_date
                )

            # Clean up duplicate entries
            await self.remove_duplicate_sales(db)

        except Exception as e:
            print(f"Daily reconciliation error: {str(e)}")
            db.rollback()
        finally:
            db.close()

    async def remove_duplicate_sales(self, db: Session):
        """Remove any duplicate sales entries"""
        # This query finds and keeps only the first entry for each unique combination
        duplicates = db.execute(
            """
            WITH duplicates AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY square_transaction_id, product_name, barber_id
                           ORDER BY created_at ASC
                       ) AS row_num
                FROM product_sales
            )
            DELETE FROM product_sales
            WHERE id IN (
                SELECT id FROM duplicates WHERE row_num > 1
            )
        """
        )

        if duplicates.rowcount > 0:
            print(f"Removed {duplicates.rowcount} duplicate sales entries")
            db.commit()


# Initialize scheduler - moved to function to avoid startup issues
square_sync_scheduler = None


def get_square_sync_scheduler():
    """Get or create the Square sync scheduler"""
    global square_sync_scheduler
    if square_sync_scheduler is None:
        square_sync_scheduler = SquareSyncScheduler()
    return square_sync_scheduler


def start_square_sync():
    """Start the Square sync scheduler"""
    scheduler = get_square_sync_scheduler()
    scheduler.start()
    print("Square sync scheduler started")


def stop_square_sync():
    """Stop the Square sync scheduler"""
    if square_sync_scheduler is not None and square_sync_scheduler.scheduler.running:
        square_sync_scheduler.scheduler.shutdown()
        print("Square sync scheduler stopped")
