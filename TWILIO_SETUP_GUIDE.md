# Twilio SMS Setup Guide

## Your Twilio Credentials (Already Configured)

✅ **Account SID**: ACe5b803b2dee8cfeffbfc19330838d25f
✅ **Auth Token**: 77f1ccd4514e2d608e72f603b9fe926b
✅ **API SID**: SKc54c6f963de83ab2d145a552915b0f50
✅ **API Secret**: S2IQOoKvre8tw08zAFEMYbRqhN8mFWGV

## ❗ Still Need: Phone Number

### Get a Twilio Phone Number:

1. **Log into Twilio Console**: https://console.twilio.com

2. **Buy a Phone Number** (if you don't have one):
   - Navigate to: Phone Numbers → Manage → Buy a number
   - Choose a number with SMS capabilities
   - Select your country/region
   - Cost: Usually $1-2/month

3. **Or Use Existing Number**:
   - Go to: Phone Numbers → Manage → Active Numbers
   - Copy any number you already own

4. **Update Your Configuration**:
   ```bash
   cd /Users/bossio/6fb-booking/backend
   open -e .env
   ```
   
   Update this line:
   ```
   TWILIO_PHONE_NUMBER=+1234567890  # Replace with your actual Twilio number
   ```

## Test Your SMS Setup

Once you have your phone number configured:

1. **Restart the backend server** (to load new environment variables)

2. **Test SMS sending**:
   - Go to: http://localhost:3002/communications
   - Click on "Test Notifications" tab (admin only)
   - Enter your phone number
   - Click "Send Test SMS"

3. **Check Twilio Console** for delivery status:
   - Go to: Monitor → Logs → Message Logs
   - See sent messages and their status

## SMS Features Available

With Twilio configured, you can now:

- ✅ Send appointment confirmation SMS
- ✅ Send appointment reminder SMS (24h and 2h before)
- ✅ Send appointment cancellation notifications
- ✅ Send payment confirmations
- ✅ Bulk SMS for promotions
- ✅ Two-way SMS (with webhook configuration)

## Cost Considerations

- **Phone Number**: ~$1-2/month
- **SMS (US)**: ~$0.0075 per message
- **SMS (International)**: Varies by country
- **MMS**: ~$0.02 per message

## Best Practices

1. **Message Format**:
   - Keep under 160 characters for single SMS
   - Include opt-out instructions: "Reply STOP to unsubscribe"
   - Use shortlinks for URLs

2. **Compliance**:
   - Get explicit consent before sending SMS
   - Honor opt-out requests immediately
   - Follow TCPA regulations (US)
   - Follow GDPR (EU)

3. **Testing**:
   - Always test with your own number first
   - Use Twilio test credentials for unit tests
   - Monitor delivery rates

## Troubleshooting

### "Invalid Phone Number" Error
- Ensure number includes country code (e.g., +1 for US)
- Format: +1234567890 (no spaces or dashes)

### "Authentication Failed"
- Check Account SID and Auth Token are correct
- Ensure no extra spaces in .env file
- Restart backend server after changes

### "From number not found"
- Verify TWILIO_PHONE_NUMBER is set correctly
- Ensure the number is active in your Twilio account
- Check the number has SMS capabilities

## Next Steps

1. Get your Twilio phone number
2. Update .env file
3. Restart backend server
4. Test SMS functionality
5. Configure user notification preferences

## Resources

- [Twilio Console](https://console.twilio.com)
- [Twilio SMS API Docs](https://www.twilio.com/docs/sms)
- [Phone Number Best Practices](https://www.twilio.com/docs/phone-numbers)
- [SMS Compliance Guide](https://www.twilio.com/docs/sms/compliance)