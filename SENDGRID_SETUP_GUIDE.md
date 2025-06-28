# SendGrid Email Setup Guide for 6FB Platform

## Step 1: Create SendGrid Account

1. Go to https://sendgrid.com and click "Start for Free"
2. Fill out the registration form:
   - Use a business email (not gmail/yahoo)
   - Select "Website" as your sending method
   - Choose your monthly email volume

## Step 2: Complete SendGrid Verification

SendGrid requires account verification:
1. Confirm your email address
2. Complete the account setup form
3. Wait for account approval (usually instant, can take up to 24 hours)

## Step 3: Create API Key

1. **Navigate to API Keys**
   - Login to SendGrid Dashboard
   - Go to Settings → API Keys
   - Click "Create API Key"

2. **Configure API Key**
   - Name: "6FB Platform Production" (or similar)
   - API Key Permissions: Select "Restricted Access"
   - Enable these specific permissions:
     - **Mail Send**: Full Access ✓
     - **Mail Settings**: Read Access ✓
     - **Tracking**: Read Access ✓
     - **Stats**: Read Access ✓

3. **Save Your API Key**
   - Copy the API key immediately (shown only once!)
   - It will look like: `SG.xxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 4: Set Up Sender Authentication

### Option A: Single Sender Verification (Quick Start)

1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Fill in:
   - From Name: "6FB Platform" (or your business name)
   - From Email: noreply@yourdomain.com
   - Reply To: support@yourdomain.com
   - Company Address (required by law)
4. Check your email and click the verification link

### Option B: Domain Authentication (Recommended for Production)

1. Go to Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Add DNS records to your domain:
   ```
   CNAME em1234.yourdomain.com -> sendgrid.net
   CNAME s1._domainkey.yourdomain.com -> s1.domainkey.u1234.wl.sendgrid.net
   CNAME s2._domainkey.yourdomain.com -> s2.domainkey.u1234.wl.sendgrid.net
   ```
4. Verify DNS propagation (can take up to 48 hours)

## Step 5: Configure 6FB Platform

### Update your `.env` file:

```bash
# SendGrid Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_NAME=6FB Platform
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Optional: SendGrid-specific settings
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important Notes:**
- Username is literally the word "apikey" (not your email)
- Password is your full SendGrid API key
- EMAIL_FROM_ADDRESS must match your verified sender

## Step 6: Test Your Configuration

### Create test script: `backend/test_sendgrid.py`

```python
import os
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from database import SessionLocal
from services.email_service import email_service
from core.config import settings

def test_sendgrid():
    """Test SendGrid email configuration"""
    print("=== SendGrid Configuration Test ===\n")

    # Check configuration
    print("📧 Email Configuration:")
    print(f"  - Email enabled: {settings.email_enabled}")
    print(f"  - SMTP Host: {settings.SMTP_HOST}")
    print(f"  - SMTP Port: {settings.SMTP_PORT}")
    print(f"  - SMTP Username: {settings.SMTP_USERNAME}")
    print(f"  - From Address: {settings.EMAIL_FROM_ADDRESS}")
    print(f"  - From Name: {settings.EMAIL_FROM_NAME}")

    if not settings.email_enabled:
        print("\n❌ Email is not configured. Please check your .env file.")
        print("\nRequired variables:")
        print("  - SMTP_HOST")
        print("  - SMTP_USERNAME")
        print("  - SMTP_PASSWORD")
        return

    # Test connection
    print("\n🔌 Testing SMTP Connection...")
    try:
        server = email_service._get_smtp_connection()
        server.quit()
        print("✅ Successfully connected to SendGrid SMTP")
    except Exception as e:
        print(f"❌ Failed to connect: {str(e)}")
        return

    # Send test email
    test_email = input("\n📬 Enter email address to send test to: ")

    db = SessionLocal()
    try:
        print(f"\n📤 Sending test email to {test_email}...")

        # Test 1: Welcome email
        success = email_service.send_welcome_email(
            db=db,
            to_email=test_email,
            user_data={
                "name": "Test User",
                "email": test_email,
                "created_at": datetime.now()
            }
        )

        if success:
            print("✅ Welcome email sent successfully!")
        else:
            print("❌ Failed to send welcome email")
            return

        # Test 2: Appointment confirmation
        print("\n📤 Sending appointment confirmation...")
        success = email_service.send_appointment_confirmation(
            db=db,
            to_email=test_email,
            appointment_data={
                "id": "test-123",
                "service_name": "Premium Haircut",
                "date": "Tomorrow",
                "time": "2:00 PM",
                "barber_name": "John Doe",
                "location": "Main Street Barbershop",
                "price": 45.00
            }
        )

        if success:
            print("✅ Appointment confirmation sent successfully!")
        else:
            print("❌ Failed to send appointment confirmation")

        print(f"\n✨ All tests completed! Check {test_email} for the test emails.")
        print("\n📊 You can view email statistics in your SendGrid dashboard:")
        print("   https://app.sendgrid.com/statistics")

    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    test_sendgrid()
```

### Run the test:

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python test_sendgrid.py
```

## Step 7: Monitor Email Delivery

### SendGrid Dashboard Features:

1. **Activity Feed** (https://app.sendgrid.com/email_activity)
   - Real-time email status
   - Delivery confirmations
   - Bounce/block reasons

2. **Statistics** (https://app.sendgrid.com/statistics)
   - Delivery rates
   - Open/click tracking
   - Geographic data

3. **Suppressions** (https://app.sendgrid.com/suppressions)
   - Bounced emails
   - Blocked addresses
   - Unsubscribes

## Troubleshooting

### Common Issues:

1. **"Authentication failed"**
   - Ensure username is exactly "apikey"
   - Verify API key is copied correctly
   - Check API key has Mail Send permission

2. **"Sender address not verified"**
   - Complete sender verification (Step 4)
   - EMAIL_FROM_ADDRESS must match verified sender

3. **"Account under review"**
   - New SendGrid accounts may be reviewed
   - Check email for additional verification requests

4. **Rate Limits**
   - Free tier: 100 emails/day
   - Essentials plan: 50,000-100,000 emails/month

### Debug Commands:

```bash
# Check environment variables
cd backend
python -c "from core.config import settings; print(f'Email enabled: {settings.email_enabled}')"

# View logs
tail -f backend/logs/app.log | grep -i email
```

## Production Best Practices

### 1. Use Templates (Optional)
SendGrid supports dynamic templates:
```python
# In email_service.py, you can add:
def send_with_template(self, template_id: str, to_email: str, dynamic_data: dict):
    # Use SendGrid's template API
    pass
```

### 2. Set Up Webhooks
Configure webhooks for email events:
- Settings → Mail Settings → Event Webhook
- Point to: `https://yourdomain.com/api/webhooks/sendgrid`

### 3. Enable Click Tracking
- Settings → Tracking → Click Tracking
- Helps measure engagement

### 4. Configure IP Pools (Advanced)
For high volume sending:
- Settings → IP Addresses
- Dedicated IPs improve deliverability

## Email Types in 6FB Platform

The platform will send these emails automatically:

1. **Appointment Emails**
   - Confirmation (immediate)
   - Reminder (24 hours before)
   - Cancellation notices
   - Rescheduling confirmations

2. **Payment Emails**
   - Payment receipts
   - Failed payment notices
   - Refund confirmations

3. **Account Emails**
   - Welcome email
   - Password reset
   - Account verification

4. **Marketing Emails** (if enabled)
   - Promotional offers
   - Newsletter
   - Re-engagement campaigns

## Next Steps

1. ✅ Complete SendGrid account setup
2. ✅ Create and save API key
3. ✅ Verify sender or domain
4. ✅ Update .env file
5. ✅ Run test script
6. 🔲 Monitor first production emails
7. 🔲 Set up domain authentication for better deliverability
8. 🔲 Configure webhooks for email events

## Support

- SendGrid Support: https://support.sendgrid.com
- API Documentation: https://docs.sendgrid.com
- Status Page: https://status.sendgrid.com
