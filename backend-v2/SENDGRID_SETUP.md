# SendGrid Setup Guide for 6FB Marketing Suite

## Overview
This guide walks you through setting up SendGrid for email marketing campaigns in the 6FB Booking platform.

## Prerequisites
- A SendGrid account (sign up at https://sendgrid.com)
- Access to your 6FB backend environment variables

## Step 1: Create SendGrid Account

1. Go to https://sendgrid.com and sign up for an account
2. Choose the **Free** plan to start (100 emails/day forever free)
3. Verify your email address

## Step 2: Verify Your Sender Identity

SendGrid requires sender verification for security:

1. Navigate to **Settings** → **Sender Authentication**
2. Choose one of these options:
   - **Domain Authentication** (Recommended for production)
   - **Single Sender Verification** (Quick setup for testing)

### Domain Authentication (Recommended)
1. Click **Authenticate Your Domain**
2. Select your DNS provider
3. Add the provided DNS records to your domain
4. Click **Verify** once DNS propagates (5-48 hours)

### Single Sender Verification (For Testing)
1. Click **Verify a Single Sender**
2. Fill in:
   - From Name: Your Business Name
   - From Email: noreply@yourdomain.com
   - Reply To: support@yourdomain.com
3. Verify the email sent to your address

## Step 3: Generate API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Give it a name: "6FB Marketing Suite"
4. Select **Full Access** permissions
5. Click **Create & View**
6. **IMPORTANT**: Copy the API key immediately (shown only once!)

## Step 4: Configure 6FB Backend

Add these to your `.env` file:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourbusiness.com
SENDGRID_FROM_NAME="Your Business Name"

# Optional: For advanced features
SENDGRID_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxx  # For dynamic templates
SENDGRID_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx  # For event webhooks
```

## Step 5: Set Up Email Templates (Optional)

Create professional email templates in SendGrid:

1. Go to **Email API** → **Dynamic Templates**
2. Click **Create a Dynamic Template**
3. Name it (e.g., "Marketing Campaign")
4. Design your template with drag-and-drop editor
5. Use variables like `{{customer_name}}`, `{{offer_details}}`
6. Copy the Template ID for use in campaigns

## Step 6: Configure Webhooks (Optional)

Track email opens, clicks, and bounces:

1. Go to **Settings** → **Mail Settings** → **Event Webhook**
2. Set HTTP Post URL: `https://yourapi.com/api/v1/webhooks/sendgrid`
3. Select events to track:
   - ✓ Opened
   - ✓ Clicked
   - ✓ Bounced
   - ✓ Spam Reports
   - ✓ Unsubscribe
4. Enable **Webhook Verification** and copy the verification key

## Step 7: Test Your Configuration

Run this test script to verify setup:

```python
# test_sendgrid.py
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Load from .env
sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))

message = Mail(
    from_email=os.environ.get('SENDGRID_FROM_EMAIL'),
    to_emails='test@example.com',
    subject='Test Email from 6FB',
    html_content='<p>If you receive this, SendGrid is configured correctly!</p>'
)

try:
    response = sg.send(message)
    print(f"Success! Status: {response.status_code}")
except Exception as e:
    print(f"Error: {e}")
```

## Pricing & Limits

### Free Plan
- 100 emails/day forever
- Perfect for testing and small shops

### Essentials Plan ($19.95/month)
- 50,000 emails/month
- Then $0.001 per email
- Email validation
- Webhooks

### Pro Plan (Custom pricing)
- 100,000+ emails/month
- Dedicated IP
- Advanced analytics

## Best Practices

1. **Warm Up Your IP**: Start with small batches, gradually increase
2. **Clean Your Lists**: Remove bounced/unsubscribed emails
3. **Authenticate Everything**: SPF, DKIM, and DMARC
4. **Monitor Reputation**: Check sender score regularly
5. **Use Templates**: Consistent branding and easier management

## Troubleshooting

### "Unauthorized" Error
- Verify API key is correct
- Check key has proper permissions
- Ensure no extra spaces in .env file

### Emails Going to Spam
- Complete domain authentication
- Avoid spam trigger words
- Include unsubscribe link
- Maintain good sender reputation

### Rate Limiting
- Free tier: 3 requests/second
- Implement exponential backoff
- Use batch sending for large campaigns

## Compliance

Always include in marketing emails:
- Unsubscribe link
- Physical mailing address
- Clear identification of sender
- Honest subject lines

## Support

- SendGrid Docs: https://docs.sendgrid.com
- Status Page: https://status.sendgrid.com
- Support: https://support.sendgrid.com