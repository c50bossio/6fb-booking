# Square Integration Setup Guide

This guide will help you set up Square POS integration for automatic product sales tracking and commission calculations.

## Prerequisites

1. Square account with POS system
2. Square Developer account
3. 6FB Booking system with barber payment models configured

## Step 1: Square Developer Setup

1. Go to [Square Developer](https://developer.squareup.com)
2. Create a new application
3. Get your credentials:
   - **Application ID**
   - **Access Token** (for production)
   - **Sandbox Access Token** (for testing)

## Step 2: Configure Environment Variables

Add these to your `.env` file:

```bash
# Square Configuration
SQUARE_APPLICATION_ID=your-square-app-id
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_ENVIRONMENT=sandbox  # Change to 'production' when ready
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-signature-key
```

## Step 3: Set Up Square Team Members

1. In Square Dashboard, go to **Team** > **Team Members**
2. Ensure each barber has a team member account with:
   - Unique email address
   - Proper permissions for sales
   - Active status

## Step 4: Link Barbers to Square Employees

### Via API:
```bash
POST /api/v1/square/link-barber
{
  "barber_id": 123,
  "square_location_id": "LOCATION_ID",
  "square_employee_email": "barber@example.com"
}
```

### What happens:
- System finds Square employee by email
- Links barber account to Square employee ID
- Enables automatic sales tracking for that barber

## Step 5: Configure Webhooks (Optional but Recommended)

For real-time sales updates:

1. In Square Developer Dashboard, go to **Webhooks**
2. Add webhook endpoint: `https://yourdomain.com/api/v1/square/webhook`
3. Subscribe to events:
   - `order.created`
   - `order.updated`
4. Copy the **Signature Key** to your `.env` file

## Step 6: Product Catalog Setup

### Option 1: Use Existing Square Products
Products already in Square will be tracked automatically.

### Option 2: Create Products via API
```bash
POST /api/v1/square/products?location_id=LOCATION_ID
{
  "name": "Premium Hair Pomade",
  "price": 25.00,
  "description": "High-hold matte finish pomade",
  "sku": "POMADE-001",
  "category": "Hair Products",
  "track_inventory": true,
  "initial_quantity": 50
}
```

## Step 7: Sales Tracking

### Automatic Tracking
- **Hourly Sync**: Runs every hour automatically
- **Daily Reconciliation**: Runs at 2 AM to catch any missed sales

### Manual Sync
```bash
POST /api/v1/square/sync-sales
{
  "location_id": "LOCATION_ID",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-07T23:59:59Z",
  "barber_id": 123  // Optional, syncs all if not provided
}
```

## Step 8: Commission Calculation

Product sales commissions are calculated automatically:
- Default: 15% commission on product sales
- Configurable per barber in payment models
- Tracked separately from service commissions

### View Sales Summary
```bash
GET /api/v1/square/sales/summary?start_date=2024-01-01&end_date=2024-01-07
```

Response includes:
- Total product sales
- Commission amounts
- Top-selling products
- Sales by barber

## Step 9: Testing the Integration

1. **Create Test Sale in Square POS**:
   - Log in as a specific team member
   - Create a sale with products
   - Complete the transaction

2. **Verify Sale Appears**:
   - Wait for hourly sync or trigger manual sync
   - Check sales summary endpoint
   - Verify commission calculations

3. **Test Payout Process**:
   ```bash
   GET /api/v1/barber-payments/commissions/summary?period_start=2024-01-01&period_end=2024-01-07
   ```

## Troubleshooting

### Sales Not Syncing
1. Verify Square employee is linked to barber
2. Check Square location ID is correct
3. Ensure sales are marked as "COMPLETED" in Square
4. Check API credentials are valid

### Wrong Commission Amounts
1. Verify barber's commission rate in payment model
2. Check product prices in Square match expected values
3. Ensure no duplicate sales entries

### Webhook Issues
1. Verify webhook URL is publicly accessible
2. Check signature key matches
3. Review webhook logs in Square dashboard

## Best Practices

1. **Regular Audits**: Compare Square reports with 6FB reports monthly
2. **Inventory Tracking**: Enable for accurate stock management
3. **Employee Training**: Ensure barbers log in to Square POS correctly
4. **Commission Transparency**: Share sales reports with barbers regularly
5. **Backup Sync**: Run manual sync if automatic sync fails

## Security Considerations

1. Keep API credentials secure and never commit to version control
2. Use webhook signatures to verify authenticity
3. Implement rate limiting on sync endpoints
4. Regular security audits of integration points
5. Monitor for unusual sales patterns

## Support

For issues with:
- **Square API**: Contact Square Developer Support
- **6FB Integration**: Check logs and contact system admin
- **Commission Calculations**: Review barber payment models
