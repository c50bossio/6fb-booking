"""
Seed data script for POS system testing
Creates barbers with PINs, products, categories, POS sessions, and sales transactions
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
import random
import json
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from config.database import DATABASE_URL
from config.database import Base
from models.barber import Barber
from models.product import Product, ProductCategory, ProductSource, ProductStatus
from models.pos_session import POSSession
from models.barber_payment import ProductSale, SalesSource
from models.location import Location

# Password/PIN hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_pin_hash(pin):
    """Hash a PIN for secure storage"""
    return pwd_context.hash(pin)


class POSDataSeeder:
    def __init__(self):
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        self.db = SessionLocal()

    def __del__(self):
        self.db.close()

    def seed_all(self):
        """Seed all POS-related data"""
        print("Starting POS data seeding...")

        # Check if we have locations first
        locations = self.db.query(Location).all()
        if not locations:
            print("No locations found. Please run the main seed_data.py script first.")
            return

        # Order matters due to dependencies
        barbers = self.update_barber_pins()
        categories = self.seed_product_categories()
        products = self.seed_products(categories)
        sessions = self.seed_pos_sessions(barbers)
        sales = self.seed_product_sales(barbers, products, sessions)

        print("\nPOS data seeding completed successfully!")
        self.print_summary()

    def update_barber_pins(self):
        """Update existing barbers with PIN codes"""
        print("\nUpdating barbers with PIN authentication...")

        barbers = self.db.query(Barber).all()

        if not barbers:
            print("No barbers found. Creating sample barbers...")
            barbers = self.create_sample_barbers()

        # Assign PINs to barbers
        pins = {
            "mike.barber@6fb.com": "1234",
            "sarah.barber@6fb.com": "5678",
            "david.barber@6fb.com": "9012",
            "lisa.barber@6fb.com": "3456",
            "test.barber1@6fb.com": "1111",
            "test.barber2@6fb.com": "2222",
            "test.barber3@6fb.com": "3333",
        }

        updated_count = 0
        for barber in barbers:
            if barber.email in pins:
                barber.pin_hash = get_pin_hash(pins[barber.email])
                barber.pin_attempts = 0
                barber.pin_locked_until = None
                print(
                    f"  - {barber.first_name} {barber.last_name}: PIN {pins[barber.email]}"
                )
                updated_count += 1
            else:
                # Assign a random 4-digit PIN
                random_pin = str(random.randint(1000, 9999))
                barber.pin_hash = get_pin_hash(random_pin)
                barber.pin_attempts = 0
                barber.pin_locked_until = None
                print(f"  - {barber.first_name} {barber.last_name}: PIN {random_pin}")
                updated_count += 1

        self.db.commit()
        print(f"Updated {updated_count} barbers with PIN authentication")
        return barbers

    def create_sample_barbers(self):
        """Create sample barbers if none exist"""
        locations = self.db.query(Location).all()

        barbers_data = [
            {
                "email": "test.barber1@6fb.com",
                "first_name": "Test",
                "last_name": "Barber One",
                "business_name": "Test Barber 1 Studio",
                "phone": "(555) 111-1111",
                "location_id": locations[0].id if locations else None,
                "is_active": True,
                "is_verified": True,
                "hourly_rate": 50.0,
                "target_booking_capacity": 35,
                "monthly_revenue_goal": 8000.0,
                "weekly_appointment_goal": 35,
                "average_ticket_goal": 65.0,
            },
            {
                "email": "test.barber2@6fb.com",
                "first_name": "Test",
                "last_name": "Barber Two",
                "business_name": "Test Barber 2 Cuts",
                "phone": "(555) 222-2222",
                "location_id": (
                    locations[1].id
                    if len(locations) > 1
                    else locations[0].id if locations else None
                ),
                "is_active": True,
                "is_verified": True,
                "hourly_rate": 45.0,
                "target_booking_capacity": 40,
                "monthly_revenue_goal": 7500.0,
                "weekly_appointment_goal": 40,
                "average_ticket_goal": 55.0,
            },
            {
                "email": "test.barber3@6fb.com",
                "first_name": "Test",
                "last_name": "Barber Three",
                "business_name": "Test Barber 3 Shop",
                "phone": "(555) 333-3333",
                "location_id": (
                    locations[2].id
                    if len(locations) > 2
                    else locations[0].id if locations else None
                ),
                "is_active": True,
                "is_verified": True,
                "hourly_rate": 40.0,
                "target_booking_capacity": 45,
                "monthly_revenue_goal": 7000.0,
                "weekly_appointment_goal": 45,
                "average_ticket_goal": 50.0,
            },
        ]

        created_barbers = []
        for barber_data in barbers_data:
            barber = Barber(**barber_data)
            self.db.add(barber)
            created_barbers.append(barber)

        self.db.commit()
        return created_barbers

    def seed_product_categories(self):
        """Create product categories"""
        print("\nSeeding product categories...")

        categories_data = [
            {
                "name": "Hair Care",
                "description": "Professional hair care products including shampoos, conditioners, and treatments",
                "sort_order": 1,
                "is_active": True,
            },
            {
                "name": "Styling Products",
                "description": "Hair styling products including pomades, gels, waxes, and sprays",
                "sort_order": 2,
                "is_active": True,
            },
            {
                "name": "Beard Care",
                "description": "Beard oils, balms, washes, and grooming products",
                "sort_order": 3,
                "is_active": True,
            },
            {
                "name": "Tools & Equipment",
                "description": "Professional barber tools, clippers, scissors, and accessories",
                "sort_order": 4,
                "is_active": True,
            },
            {
                "name": "Accessories",
                "description": "Combs, brushes, capes, and other barbershop accessories",
                "sort_order": 5,
                "is_active": True,
            },
            {
                "name": "Skin Care",
                "description": "Aftershaves, moisturizers, and skin treatments",
                "sort_order": 6,
                "is_active": True,
            },
            {
                "name": "Gift Sets",
                "description": "Curated product bundles and gift packages",
                "sort_order": 7,
                "is_active": True,
            },
        ]

        created_categories = []
        for cat_data in categories_data:
            # Check if category already exists
            existing = (
                self.db.query(ProductCategory).filter_by(name=cat_data["name"]).first()
            )
            if not existing:
                category = ProductCategory(**cat_data)
                self.db.add(category)
                created_categories.append(category)
            else:
                created_categories.append(existing)

        self.db.commit()
        print(f"Created/verified {len(created_categories)} product categories")
        return created_categories

    def seed_products(self, categories):
        """Create sample products with realistic prices and inventory"""
        print("\nSeeding products...")

        # Map category names to their objects
        cat_map = {cat.name: cat for cat in categories}

        products_data = [
            # Hair Care Products
            {
                "name": "Premium Shampoo",
                "description": "Professional-grade clarifying shampoo for all hair types",
                "sku": "HC-001",
                "price": Decimal("24.99"),
                "cost_price": Decimal("12.00"),
                "category": "Hair Care",
                "brand": "6FB Professional",
                "inventory_quantity": 25,
                "low_stock_threshold": 5,
                "commission_rate": Decimal("0.15"),
            },
            {
                "name": "Moisturizing Conditioner",
                "description": "Deep conditioning treatment for dry and damaged hair",
                "sku": "HC-002",
                "price": Decimal("26.99"),
                "cost_price": Decimal("13.00"),
                "category": "Hair Care",
                "brand": "6FB Professional",
                "inventory_quantity": 20,
                "low_stock_threshold": 5,
                "commission_rate": Decimal("0.15"),
            },
            # Styling Products
            {
                "name": "Classic Pomade",
                "description": "Medium hold, high shine pomade for classic styles",
                "sku": "SP-001",
                "price": Decimal("19.99"),
                "cost_price": Decimal("8.00"),
                "category": "Styling Products",
                "brand": "Barber's Choice",
                "inventory_quantity": 40,
                "low_stock_threshold": 10,
                "commission_rate": Decimal("0.20"),
            },
            {
                "name": "Matte Clay",
                "description": "Strong hold, matte finish clay for textured styles",
                "sku": "SP-002",
                "price": Decimal("22.99"),
                "cost_price": Decimal("10.00"),
                "category": "Styling Products",
                "brand": "Barber's Choice",
                "inventory_quantity": 35,
                "low_stock_threshold": 8,
                "commission_rate": Decimal("0.20"),
            },
            {
                "name": "Texture Spray",
                "description": "Lightweight spray for volume and texture",
                "sku": "SP-003",
                "price": Decimal("18.99"),
                "cost_price": Decimal("7.50"),
                "category": "Styling Products",
                "brand": "6FB Professional",
                "inventory_quantity": 30,
                "low_stock_threshold": 8,
                "commission_rate": Decimal("0.20"),
            },
            {
                "name": "Hair Gel - Strong Hold",
                "description": "Maximum hold gel for all-day style control",
                "sku": "SP-004",
                "price": Decimal("14.99"),
                "cost_price": Decimal("5.00"),
                "category": "Styling Products",
                "brand": "Classic Barber",
                "inventory_quantity": 45,
                "low_stock_threshold": 10,
                "commission_rate": Decimal("0.20"),
            },
            # Beard Care
            {
                "name": "Beard Oil - Sandalwood",
                "description": "Nourishing beard oil with sandalwood scent",
                "sku": "BC-001",
                "price": Decimal("24.99"),
                "cost_price": Decimal("10.00"),
                "category": "Beard Care",
                "brand": "Gentleman's Beard Co",
                "inventory_quantity": 20,
                "low_stock_threshold": 5,
                "commission_rate": Decimal("0.20"),
            },
            {
                "name": "Beard Balm",
                "description": "Conditioning balm for beard styling and health",
                "sku": "BC-002",
                "price": Decimal("19.99"),
                "cost_price": Decimal("8.00"),
                "category": "Beard Care",
                "brand": "Gentleman's Beard Co",
                "inventory_quantity": 25,
                "low_stock_threshold": 5,
                "commission_rate": Decimal("0.20"),
            },
            {
                "name": "Beard Wash",
                "description": "Gentle cleansing wash specifically for beards",
                "sku": "BC-003",
                "price": Decimal("16.99"),
                "cost_price": Decimal("7.00"),
                "category": "Beard Care",
                "brand": "6FB Professional",
                "inventory_quantity": 15,
                "low_stock_threshold": 5,
                "commission_rate": Decimal("0.15"),
            },
            # Tools & Equipment
            {
                "name": "Professional Hair Clipper",
                "description": "Cordless professional clipper with multiple guards",
                "sku": "TE-001",
                "price": Decimal("149.99"),
                "cost_price": Decimal("75.00"),
                "category": "Tools & Equipment",
                "brand": "ProCut",
                "inventory_quantity": 5,
                "low_stock_threshold": 2,
                "commission_rate": Decimal("0.10"),
            },
            {
                "name": "Barber Scissors Set",
                "description": "Professional scissors set with case",
                "sku": "TE-002",
                "price": Decimal("89.99"),
                "cost_price": Decimal("40.00"),
                "category": "Tools & Equipment",
                "brand": "SharpEdge",
                "inventory_quantity": 8,
                "low_stock_threshold": 3,
                "commission_rate": Decimal("0.10"),
            },
            {
                "name": "Detail Trimmer",
                "description": "Precision trimmer for edges and details",
                "sku": "TE-003",
                "price": Decimal("59.99"),
                "cost_price": Decimal("25.00"),
                "category": "Tools & Equipment",
                "brand": "ProCut",
                "inventory_quantity": 10,
                "low_stock_threshold": 3,
                "commission_rate": Decimal("0.10"),
            },
            # Accessories
            {
                "name": "Carbon Fiber Comb",
                "description": "Anti-static professional styling comb",
                "sku": "AC-001",
                "price": Decimal("12.99"),
                "cost_price": Decimal("4.00"),
                "category": "Accessories",
                "brand": "6FB Professional",
                "inventory_quantity": 50,
                "low_stock_threshold": 15,
                "commission_rate": Decimal("0.25"),
            },
            {
                "name": "Boar Bristle Brush",
                "description": "Natural bristle brush for smooth styling",
                "sku": "AC-002",
                "price": Decimal("24.99"),
                "cost_price": Decimal("10.00"),
                "category": "Accessories",
                "brand": "Classic Barber",
                "inventory_quantity": 30,
                "low_stock_threshold": 8,
                "commission_rate": Decimal("0.20"),
            },
            {
                "name": "Barber Cape - Black",
                "description": "Professional waterproof barber cape",
                "sku": "AC-003",
                "price": Decimal("29.99"),
                "cost_price": Decimal("12.00"),
                "category": "Accessories",
                "brand": "6FB Professional",
                "inventory_quantity": 15,
                "low_stock_threshold": 5,
                "commission_rate": Decimal("0.15"),
            },
            {
                "name": "Neck Duster Brush",
                "description": "Soft bristle neck duster",
                "sku": "AC-004",
                "price": Decimal("9.99"),
                "cost_price": Decimal("3.00"),
                "category": "Accessories",
                "brand": "Classic Barber",
                "inventory_quantity": 40,
                "low_stock_threshold": 10,
                "commission_rate": Decimal("0.25"),
            },
            # Skin Care
            {
                "name": "After Shave Balm",
                "description": "Soothing balm for post-shave care",
                "sku": "SC-001",
                "price": Decimal("18.99"),
                "cost_price": Decimal("7.00"),
                "category": "Skin Care",
                "brand": "6FB Professional",
                "inventory_quantity": 25,
                "low_stock_threshold": 8,
                "commission_rate": Decimal("0.20"),
            },
            {
                "name": "Face Moisturizer",
                "description": "Daily moisturizer for men",
                "sku": "SC-002",
                "price": Decimal("24.99"),
                "cost_price": Decimal("10.00"),
                "category": "Skin Care",
                "brand": "Gentleman's Care",
                "inventory_quantity": 20,
                "low_stock_threshold": 5,
                "commission_rate": Decimal("0.20"),
            },
            # Gift Sets
            {
                "name": "Ultimate Grooming Kit",
                "description": "Complete grooming set with pomade, beard oil, and comb",
                "sku": "GS-001",
                "price": Decimal("59.99"),
                "cost_price": Decimal("25.00"),
                "category": "Gift Sets",
                "brand": "6FB Professional",
                "inventory_quantity": 10,
                "low_stock_threshold": 3,
                "commission_rate": Decimal("0.15"),
            },
            {
                "name": "Beard Care Bundle",
                "description": "Beard oil, balm, and wash combo pack",
                "sku": "GS-002",
                "price": Decimal("49.99"),
                "cost_price": Decimal("20.00"),
                "category": "Gift Sets",
                "brand": "Gentleman's Beard Co",
                "inventory_quantity": 12,
                "low_stock_threshold": 3,
                "commission_rate": Decimal("0.15"),
            },
        ]

        created_products = []
        for prod_data in products_data:
            # Check if product already exists
            existing = self.db.query(Product).filter_by(sku=prod_data["sku"]).first()
            if not existing:
                # Set category field
                category_name = prod_data.pop("category")
                product = Product(**prod_data)
                product.category = category_name
                product.status = ProductStatus.ACTIVE
                product.source = ProductSource.MANUAL
                product.track_inventory = True
                product.is_featured = (
                    random.choice([True, False]) if random.random() > 0.7 else False
                )

                self.db.add(product)
                created_products.append(product)
            else:
                created_products.append(existing)

        self.db.commit()
        print(f"Created/verified {len(created_products)} products")
        return created_products

    def seed_pos_sessions(self, barbers):
        """Create sample POS sessions"""
        print("\nSeeding POS sessions...")

        created_sessions = []

        # Create some active sessions
        active_barbers = random.sample(barbers, min(3, len(barbers)))
        for barber in active_barbers:
            session_data = {
                "session_token": f"pos_session_{barber.id}_{datetime.utcnow().timestamp()}",
                "barber_id": barber.id,
                "device_info": random.choice(
                    [
                        "iPad Pro 12.9 / Safari 15.0",
                        "Surface Pro 8 / Edge 96.0",
                        "iPad Air / Safari 14.0",
                        "Chrome 96.0 / Windows 10",
                    ]
                ),
                "ip_address": f"192.168.1.{random.randint(100, 200)}",
                "location_info": f"Register {random.randint(1, 3)}",
                "is_active": True,
                "expires_at": datetime.utcnow() + timedelta(hours=8),
                "login_method": "pin",
            }

            session = POSSession(**session_data)
            self.db.add(session)
            created_sessions.append(session)

        # Create some expired/logged out sessions
        for i in range(5):
            barber = random.choice(barbers)
            session_data = {
                "session_token": f"pos_session_old_{barber.id}_{i}",
                "barber_id": barber.id,
                "device_info": "iPad / Safari",
                "ip_address": f"192.168.1.{random.randint(50, 99)}",
                "is_active": False,
                "expires_at": datetime.utcnow() - timedelta(days=random.randint(1, 7)),
                "login_method": "pin",
                "logout_reason": random.choice(["manual", "timeout", "security"]),
            }

            session = POSSession(**session_data)
            self.db.add(session)
            created_sessions.append(session)

        self.db.commit()
        print(
            f"Created {len(created_sessions)} POS sessions ({len(active_barbers)} active)"
        )
        return created_sessions

    def seed_product_sales(self, barbers, products, sessions):
        """Create sample product sales transactions"""
        print("\nSeeding product sales...")

        created_sales = []

        # Create sales for the last 30 days
        for days_ago in range(30):
            sale_date = datetime.utcnow() - timedelta(days=days_ago)

            # 2-10 sales per day
            num_sales = random.randint(2, 10)

            for _ in range(num_sales):
                barber = random.choice(barbers)
                product = random.choice(products)
                quantity = random.randint(1, 3) if product.price < 50 else 1

                # Calculate commission based on product commission rate or default
                commission_rate = (
                    float(product.commission_rate) if product.commission_rate else 0.15
                )
                total_amount = product.price * quantity
                commission_amount = total_amount * Decimal(str(commission_rate))

                sale_data = {
                    "barber_id": barber.id,
                    "product_id": product.id,
                    "product_name": product.name,
                    "product_sku": product.sku,
                    "category": product.category,
                    "sale_price": product.price,
                    "cost_price": product.cost_price,
                    "quantity": quantity,
                    "total_amount": total_amount,
                    "commission_rate": commission_rate,
                    "commission_amount": commission_amount,
                    "commission_paid": days_ago > 7,  # Older sales marked as paid
                    "sales_source": random.choice(
                        [SalesSource.IN_PERSON, SalesSource.SQUARE]
                    ),
                    "customer_name": f"Customer {random.randint(1000, 9999)}",
                    "sale_date": sale_date,
                    "sync_status": "synced" if days_ago > 1 else "pending",
                }

                # Add Square transaction IDs for Square sales
                if sale_data["sales_source"] == SalesSource.SQUARE:
                    sale_data["square_transaction_id"] = (
                        f"sq_trans_{random.randint(100000, 999999)}"
                    )
                    sale_data["square_payment_id"] = (
                        f"sq_pay_{random.randint(100000, 999999)}"
                    )

                sale = ProductSale(**sale_data)
                self.db.add(sale)
                created_sales.append(sale)

                # Update product inventory
                if product.track_inventory:
                    product.inventory_quantity = max(
                        0, product.inventory_quantity - quantity
                    )

        self.db.commit()

        # Simulate some low stock situations
        low_stock_products = random.sample(products, min(3, len(products)))
        for product in low_stock_products:
            if product.track_inventory:
                product.inventory_quantity = random.randint(
                    1, product.low_stock_threshold
                )

        # Simulate some out of stock products
        out_of_stock = random.sample(products, min(2, len(products)))
        for product in out_of_stock:
            if product.track_inventory and product not in low_stock_products:
                product.inventory_quantity = 0
                product.status = ProductStatus.OUT_OF_STOCK

        self.db.commit()
        print(f"Created {len(created_sales)} product sales")
        return created_sales

    def print_summary(self):
        """Print summary of seeded POS data"""
        print("\n" + "=" * 60)
        print("POS SEED DATA SUMMARY")
        print("=" * 60)

        print(
            f"\nBarbers with PINs: {self.db.query(Barber).filter(Barber.pin_hash != None).count()}"
        )

        print(f"\nProduct Categories: {self.db.query(ProductCategory).count()}")
        for cat in self.db.query(ProductCategory).order_by(ProductCategory.sort_order):
            product_count = (
                self.db.query(Product).filter(Product.category == cat.name).count()
            )
            print(f"  - {cat.name}: {product_count} products")

        print(f"\nTotal Products: {self.db.query(Product).count()}")
        print(
            f"  - Active: {self.db.query(Product).filter(Product.status == ProductStatus.ACTIVE).count()}"
        )
        print(
            f"  - Out of Stock: {self.db.query(Product).filter(Product.status == ProductStatus.OUT_OF_STOCK).count()}"
        )
        print(
            f"  - Low Stock: {self.db.query(Product).filter(Product.inventory_quantity <= Product.low_stock_threshold, Product.inventory_quantity > 0).count()}"
        )

        print(f"\nPOS Sessions: {self.db.query(POSSession).count()}")
        print(
            f"  - Active: {self.db.query(POSSession).filter(POSSession.is_active == True).count()}"
        )
        print(
            f"  - Expired: {self.db.query(POSSession).filter(POSSession.is_active == False).count()}"
        )

        print(f"\nProduct Sales: {self.db.query(ProductSale).count()}")
        total_revenue = (
            self.db.query(ProductSale).with_entities(ProductSale.total_amount).all()
        )
        total_commission = (
            self.db.query(ProductSale)
            .with_entities(ProductSale.commission_amount)
            .all()
        )

        print(f"  - Total Revenue: ${sum(r[0] for r in total_revenue if r[0]):.2f}")
        print(
            f"  - Total Commissions: ${sum(c[0] for c in total_commission if c[0]):.2f}"
        )
        print(
            f"  - Commissions Paid: {self.db.query(ProductSale).filter(ProductSale.commission_paid == True).count()}"
        )
        print(
            f"  - Commissions Pending: {self.db.query(ProductSale).filter(ProductSale.commission_paid == False).count()}"
        )

        print("\n" + "=" * 60)
        print("TEST BARBER PINS")
        print("=" * 60)
        print("Use these PINs to test POS login:")

        barbers = self.db.query(Barber).filter(Barber.pin_hash != None).limit(7).all()
        test_pins = {
            "mike.barber@6fb.com": "1234",
            "sarah.barber@6fb.com": "5678",
            "david.barber@6fb.com": "9012",
            "lisa.barber@6fb.com": "3456",
            "test.barber1@6fb.com": "1111",
            "test.barber2@6fb.com": "2222",
            "test.barber3@6fb.com": "3333",
        }

        for barber in barbers:
            if barber.email in test_pins:
                print(
                    f"  - {barber.first_name} {barber.last_name} ({barber.email}): PIN {test_pins[barber.email]}"
                )

        print("\n" + "=" * 60)
        print("SAMPLE PRODUCTS BY CATEGORY")
        print("=" * 60)

        categories = (
            self.db.query(ProductCategory).order_by(ProductCategory.sort_order).all()
        )
        for cat in categories:
            print(f"\n{cat.name}:")
            products = (
                self.db.query(Product)
                .filter(Product.category == cat.name)
                .limit(3)
                .all()
            )
            for product in products:
                stock_status = "In Stock" if product.is_in_stock else "OUT OF STOCK"
                if product.is_low_stock and product.is_in_stock:
                    stock_status = f"Low Stock ({product.inventory_quantity})"
                print(f"  - {product.name} (${product.price}) - {stock_status}")

        print("=" * 60)


if __name__ == "__main__":
    seeder = POSDataSeeder()
    seeder.seed_all()
