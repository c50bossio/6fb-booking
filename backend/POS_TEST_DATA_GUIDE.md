# POS System Test Data Guide

This guide explains how to use the POS system test data seeding script for development and testing.

## Quick Start

From the backend directory, run:

```bash
python seed_pos_test_data.py
```

Or using the scripts directory:

```bash
python scripts/seed_pos_data.py
```

## What Gets Created

### 1. Barber PIN Authentication
- Updates existing barbers with PIN codes
- Creates test barbers if none exist
- Each barber gets a 4-digit PIN for POS login

**Test Barber PINs:**
- Mike Johnson (mike.barber@6fb.com): **1234**
- Sarah Williams (sarah.barber@6fb.com): **5678**
- David Chen (david.barber@6fb.com): **9012**
- Lisa Martinez (lisa.barber@6fb.com): **3456**
- Test Barber 1 (test.barber1@6fb.com): **1111**
- Test Barber 2 (test.barber2@6fb.com): **2222**
- Test Barber 3 (test.barber3@6fb.com): **3333**

### 2. Product Categories
- **Hair Care**: Shampoos, conditioners, treatments
- **Styling Products**: Pomades, gels, waxes, sprays
- **Beard Care**: Oils, balms, washes
- **Tools & Equipment**: Clippers, scissors, trimmers
- **Accessories**: Combs, brushes, capes
- **Skin Care**: Aftershaves, moisturizers
- **Gift Sets**: Curated bundles

### 3. Products (20+ items)
Each product includes:
- Realistic pricing ($9.99 - $149.99)
- Cost prices for profit calculation
- Inventory tracking with quantities
- Low stock thresholds
- Commission rates (10-25%)
- SKUs for scanning/lookup

### 4. POS Sessions
- Active sessions for currently logged-in barbers
- Historical sessions showing login/logout patterns
- Device and location information
- Session tokens and expiration times

### 5. Sales Transactions
- 30 days of sales history
- Random distribution across barbers
- Varied quantities and products
- Commission calculations
- Payment status tracking
- Square integration data (for Square sales)

## Sample Product Inventory

### Hair Care
- Premium Shampoo ($24.99) - 25 units
- Moisturizing Conditioner ($26.99) - 20 units

### Styling Products
- Classic Pomade ($19.99) - 40 units
- Matte Clay ($22.99) - 35 units
- Texture Spray ($18.99) - 30 units
- Hair Gel - Strong Hold ($14.99) - 45 units

### Beard Care
- Beard Oil - Sandalwood ($24.99) - 20 units
- Beard Balm ($19.99) - 25 units
- Beard Wash ($16.99) - 15 units

### Tools & Equipment
- Professional Hair Clipper ($149.99) - 5 units
- Barber Scissors Set ($89.99) - 8 units
- Detail Trimmer ($59.99) - 10 units

### Accessories
- Carbon Fiber Comb ($12.99) - 50 units
- Boar Bristle Brush ($24.99) - 30 units
- Barber Cape - Black ($29.99) - 15 units
- Neck Duster Brush ($9.99) - 40 units

## Testing Scenarios

### 1. POS Login
```
1. Go to POS login screen
2. Select a barber or enter barber ID
3. Enter PIN (e.g., 1234 for Mike Johnson)
4. System creates new POS session
```

### 2. Product Sale
```
1. Login to POS
2. Search/scan products (use SKUs like HC-001, SP-001)
3. Add to cart with quantities
4. Complete sale
5. Commission automatically calculated
```

### 3. Inventory Management
```
- Some products are low stock (yellow warning)
- Some products are out of stock (red)
- Track inventory changes after sales
```

### 4. Sales Reports
```
- View daily/weekly/monthly sales
- Commission reports by barber
- Product performance metrics
- Inventory alerts
```

## Database Queries for Testing

### Check Barber PINs
```sql
SELECT id, first_name, last_name, email, pin_hash IS NOT NULL as has_pin
FROM barbers
WHERE pin_hash IS NOT NULL;
```

### View Active POS Sessions
```sql
SELECT b.first_name, b.last_name, ps.device_info, ps.expires_at
FROM pos_sessions ps
JOIN barbers b ON ps.barber_id = b.id
WHERE ps.is_active = true;
```

### Check Product Inventory
```sql
SELECT name, sku, price, inventory_quantity, low_stock_threshold,
       CASE
         WHEN inventory_quantity = 0 THEN 'Out of Stock'
         WHEN inventory_quantity <= low_stock_threshold THEN 'Low Stock'
         ELSE 'In Stock'
       END as status
FROM products
ORDER BY category, name;
```

### Recent Sales Summary
```sql
SELECT
  DATE(sale_date) as date,
  COUNT(*) as sales_count,
  SUM(total_amount) as total_revenue,
  SUM(commission_amount) as total_commission
FROM product_sales
WHERE sale_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(sale_date)
ORDER BY date DESC;
```

## Troubleshooting

### No Locations Found
If you see "No locations found", run the main seed script first:
```bash
python scripts/seed_data.py
```

### PIN Login Failed
- Check if barber exists in database
- Verify PIN matches (case sensitive)
- Check if account is not locked (too many attempts)

### Product Not Found
- Verify SKU is correct
- Check if product is active
- Ensure product category exists

## Resetting Test Data

To reset and recreate all POS test data:

```bash
# Clear existing POS data (be careful in production!)
python -c "
from config.database import get_db
from models.product import Product, ProductCategory
from models.pos_session import POSSession
from models.barber_payment import ProductSale

db = next(get_db())
db.query(ProductSale).delete()
db.query(POSSession).delete()
db.query(Product).delete()
db.query(ProductCategory).delete()
db.commit()
"

# Re-seed
python seed_pos_test_data.py
```

## Integration with Frontend

The seeded data is designed to work with the POS frontend components:
- Barber selection and PIN entry
- Product catalog with categories
- Shopping cart functionality
- Inventory tracking
- Commission calculation
- Sales reporting

Make sure your frontend is configured to:
1. Use the correct API endpoints
2. Handle PIN authentication
3. Display inventory status
4. Calculate totals and commissions
