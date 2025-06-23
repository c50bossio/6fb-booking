# 6FB Booking Platform - Getting Started Guide

Welcome to the Six Figure Barber (6FB) Booking Platform! This guide will help you get up and running quickly, whether you're a barber, client, or administrator.

## Table of Contents

- [Quick Start](#quick-start)
- [For New Clients](#for-new-clients)
- [For New Barbers](#for-new-barbers)
- [For Administrators](#for-administrators)
- [Common Setup Steps](#common-setup-steps)
- [First Booking Walkthrough](#first-booking-walkthrough)
- [Mobile Setup](#mobile-setup)
- [Troubleshooting First Steps](#troubleshooting-first-steps)

---

## Quick Start

### What You Need to Get Started
- **Email address** for account creation
- **Phone number** for notifications and verification
- **Payment method** (credit/debit card) for booking services
- **5 minutes** to complete setup

### Platform Access
- **Website**: [Your Shop's 6FB URL]
- **Mobile Web App**: Works on any smartphone browser
- **Support**: support@6fbbooking.com | 1-800-6FB-BOOK

### System Requirements
```
Supported Browsers:
✅ Chrome 90+
✅ Safari 14+
✅ Firefox 88+
✅ Edge 90+

Mobile Devices:
✅ iOS 12+ (iPhone/iPad)
✅ Android 8+ (Chrome browser)
✅ Any device with modern web browser

Internet Connection:
✅ Broadband recommended
✅ Mobile data compatible
✅ Offline viewing available (limited features)
```

---

## For New Clients

### Step 1: Create Your Account

#### Sign Up Process
1. **Visit the Platform**
   - Go to your barber shop's 6FB booking URL
   - Click "Sign Up" or "Create Account"

2. **Enter Your Information**
   ```
   Required Information:
   - First and Last Name
   - Email Address
   - Phone Number
   - Secure Password (8+ characters)

   Optional Information:
   - Date of Birth (for age-appropriate services)
   - Preferred Communication Method (email/SMS)
   ```

3. **Verify Your Email**
   - Check your inbox for verification email
   - Click the verification link
   - Check spam/junk folder if not received within 5 minutes

4. **Complete Your Profile**
   - Add profile photo (optional)
   - Set communication preferences
   - Add any service notes or preferences

### Step 2: Make Your First Booking

#### Booking Walkthrough
1. **Choose Your Service**
   - Browse available services
   - Read service descriptions and pricing
   - Select your desired service

2. **Select Your Barber**
   - View barber profiles and specialties
   - Check ratings and reviews
   - Choose based on your preferences

3. **Pick Date and Time**
   - Use the calendar to select your preferred date
   - Choose from available time slots
   - Consider travel time to the location

4. **Review and Confirm**
   - Double-check all details
   - Add any special requests or notes
   - Review cancellation policy

5. **Make Payment**
   - Enter payment information securely
   - Save payment method for future bookings
   - Receive confirmation email immediately

### Step 3: Prepare for Your Appointment

#### What to Expect
```
Before Your Appointment:
- Confirmation email with all details
- Reminder notifications (24 hours and 2 hours before)
- Directions and parking information
- Contact information for the location

Day of Appointment:
- Arrive 5-10 minutes early
- Bring your phone for check-in
- Payment is already processed (no need to pay again)
- Any add-on services can be added during visit
```

#### Helpful Tips
- **Download the app**: Add the mobile web app to your home screen
- **Set notifications**: Enable push notifications for updates
- **Save preferences**: Complete your profile for personalized recommendations
- **Leave reviews**: Help other clients and support your barber

---

## For New Barbers

### Step 1: Account Setup

#### Invitation Process
1. **Receive Invitation**
   - Shop owner/admin sends invitation email
   - Click the invitation link to begin setup
   - Link expires in 48 hours

2. **Create Your Account**
   ```
   Professional Information:
   - Full name and professional name
   - Contact information
   - Professional email address
   - Secure password

   License and Credentials:
   - Barber license number
   - State of licensure
   - License expiration date
   - Any additional certifications
   ```

3. **Complete Your Profile**
   - Upload professional headshot
   - Write compelling bio (2-3 sentences)
   - List your specialties and experience
   - Add portfolio photos (before/after shots)

### Step 2: Service Configuration

#### Set Up Your Services
1. **Select Services You Offer**
   - Choose from pre-configured service menu
   - Request new services if needed
   - Set your specific pricing (if applicable)

2. **Configure Service Details**
   ```yaml
   For Each Service:
     Duration: How long you typically take
     Pricing: Your rate (if different from standard)
     Description: Your personal approach/style
     Requirements: Any special preparation needed
     Add-ons: Additional services you offer
   ```

3. **Set Availability**
   - Define your working hours for each day
   - Block out break times and lunch
   - Set up recurring schedule
   - Add time off and vacation dates

### Step 3: Payment Setup

#### Connect Your Payment Account
1. **Choose Payment Method**
   ```
   Stripe Connect (Recommended):
   ✅ Fastest payouts (daily)
   ✅ Lowest fees
   ✅ Best reporting
   ✅ International support

   Square:
   ✅ Familiar interface
   ✅ POS integration
   ✅ Next-day deposits

   Tremendous:
   ✅ Flexible payout options
   ✅ Gift card rewards
   ✅ Tax document handling
   ```

2. **Complete Verification**
   - Provide business/personal information
   - Upload required documents (ID, bank details)
   - Verify bank account information
   - Complete tax information (W-9 or equivalent)

3. **Test Your Setup**
   - Process a test booking
   - Verify payment flows correctly
   - Check payout schedule and methods
   - Confirm dashboard access

### Step 4: Start Taking Bookings

#### Go Live Checklist
- [ ] Profile complete with photo and bio
- [ ] Services configured with accurate pricing
- [ ] Schedule set up with availability
- [ ] Payment account verified and active
- [ ] Test booking completed successfully
- [ ] Mobile app added to home screen
- [ ] Notification preferences set

#### First Week Tips
- **Check your schedule daily**: Stay on top of bookings
- **Respond quickly**: Address client messages promptly
- **Be punctual**: Start strong with on-time service
- **Ask for reviews**: Encourage satisfied clients to leave feedback
- **Track your 6FB Score**: Monitor your performance metrics

---

## For Administrators

### Step 1: Platform Setup

#### Initial Configuration
1. **System Access**
   - Log in with admin credentials
   - Navigate to Admin Dashboard
   - Complete 2FA setup for security

2. **Location Setup**
   ```yaml
   Location Configuration:
     Basic Information:
       - Business name and address
       - Contact information
       - Operating hours
       - Holiday schedules

     Services Setup:
       - Define service categories
       - Set base pricing structure
       - Configure booking rules
       - Set cancellation policies

     Staff Management:
       - Add barber accounts
       - Set permission levels
       - Configure commission rates
       - Assign locations to barbers
   ```

3. **Payment Configuration**
   - Set up platform Stripe account
   - Configure webhook endpoints
   - Set commission structures
   - Test payment processing

### Step 2: User Management

#### Add Your Team
1. **Invite Barbers**
   - Use the "Add Barber" function
   - Send invitation emails
   - Track onboarding progress
   - Approve completed profiles

2. **Set Permissions**
   ```yaml
   Permission Levels:
     Barber:
       - Manage own schedule
       - View own bookings
       - Process payments
       - Communicate with clients

     Location Manager:
       - Manage location settings
       - Oversee location barbers
       - View location analytics
       - Handle local customer service

     Super Admin:
       - Full system access
       - Financial oversight
       - User management
       - System configuration
   ```

### Step 3: Launch Preparation

#### Pre-Launch Checklist
- [ ] All locations configured correctly
- [ ] Barber accounts set up and verified
- [ ] Payment processing tested
- [ ] Email notifications working
- [ ] Mobile app functionality verified
- [ ] Staff training completed
- [ ] Backup and monitoring configured

#### Soft Launch Strategy
1. **Week 1**: Internal testing with staff
2. **Week 2**: Limited client beta (trusted regulars)
3. **Week 3**: Full launch with marketing push
4. **Week 4**: Monitor performance and optimize

---

## Common Setup Steps

### Email Configuration

#### Set Up Notifications
```yaml
Email Preferences:
  Booking Confirmations: ✅ Enabled
  Appointment Reminders: ✅ Enabled (24hr, 2hr)
  Payment Receipts: ✅ Enabled
  Marketing Updates: ❌ Optional
  System Announcements: ✅ Enabled

Notification Timing:
  - 24 hours before appointment
  - 2 hours before appointment
  - Immediate booking confirmations
  - Payment confirmations
```

#### Whitelist Our Emails
Add these email addresses to your contacts:
- `noreply@6fbbooking.com` - System notifications
- `support@6fbbooking.com` - Customer support
- `billing@6fbbooking.com` - Payment notifications

### Mobile App Installation

#### Add to Home Screen (iOS)
1. Open Safari and navigate to the platform
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Customize the name if desired
5. Tap "Add" to install

#### Add to Home Screen (Android)
1. Open Chrome and navigate to the platform
2. Tap the menu button (three dots)
3. Select "Add to Home Screen"
4. Confirm the app name
5. Tap "Add" to install

### Security Setup

#### Enable Two-Factor Authentication
1. Go to Account Settings → Security
2. Click "Enable 2FA"
3. Choose SMS or authenticator app
4. Follow setup instructions
5. Save backup codes in secure location

#### Password Security
```
Strong Password Requirements:
✅ Minimum 8 characters
✅ At least one uppercase letter
✅ At least one lowercase letter
✅ At least one number
✅ At least one special character
❌ No common passwords
❌ No personal information
```

---

## First Booking Walkthrough

### Complete Booking Demo

#### Scenario: New client booking haircut
1. **Landing Page**
   - Client visits platform URL
   - Sees "Book Now" call-to-action
   - Clicks to start booking process

2. **Service Selection**
   - Views service categories
   - Selects "Haircuts" category
   - Chooses "Men's Premium Haircut - $65"
   - Reads service description and duration

3. **Barber Selection**
   - Sees available barbers with photos
   - Reads bio: "Mike - 8 years experience, modern cuts specialist"
   - Views rating: 4.9 stars (127 reviews)
   - Clicks "Select Mike"

4. **Date and Time Selection**
   - Calendar shows current week
   - Green slots indicate availability
   - Selects "Tomorrow, 2:00 PM"
   - System shows 45-minute appointment ending at 2:45 PM

5. **Account Creation** (for new clients)
   - Enters: John Smith, john@email.com, (555) 123-4567
   - Creates password: SecurePass123!
   - Agrees to terms and privacy policy
   - Receives verification email

6. **Booking Details**
   - Reviews appointment summary
   - Adds note: "First time client, prefer shorter style"
   - Sees total cost: $65 + tax = $69.88

7. **Payment Processing**
   - Enters card information securely
   - Chooses to save card for future bookings
   - Payment processes successfully
   - Receives confirmation email immediately

8. **Confirmation**
   - Booking reference: 6FB-1234-2024
   - Calendar event automatically created
   - SMS confirmation sent
   - Reminder notifications scheduled

### What Happens Next

#### Automated Process
```
Immediately:
- Confirmation email sent to client
- Booking appears in barber's schedule
- Payment processed and recorded
- Calendar sync updated

24 Hours Before:
- Reminder email sent
- SMS reminder sent (if enabled)
- Final instructions provided

2 Hours Before:
- Final reminder sent
- Weather and traffic updates
- Contact information provided

Day of Appointment:
- Check-in capability activated
- No-show tracking begins
- Service completion tracking ready
```

---

## Mobile Setup

### Mobile Web App Benefits
- **Faster Access**: Quick booking from home screen
- **Push Notifications**: Real-time updates even when not using app
- **Offline Viewing**: See appointments without internet
- **Better Performance**: Optimized for mobile devices
- **Native Feel**: App-like experience in browser

### Mobile-Specific Features
```yaml
Quick Actions:
  - One-tap rebooking
  - Swipe to reschedule
  - Quick cancellation
  - Emergency contact

Location Services:
  - GPS directions to location
  - Arrival notifications
  - Parking information
  - Local weather updates

Camera Integration:
  - Profile photo upload
  - Before/after photos
  - ID verification (barbers)
  - Receipt capture
```

### Mobile Optimization Tips
- **Enable Notifications**: Allow push notifications for best experience
- **Use WiFi for Setup**: Initial setup uses more data
- **Update Regularly**: Browser updates improve performance
- **Clear Cache**: Monthly cache clearing recommended

---

## Troubleshooting First Steps

### Common Issues and Solutions

#### Can't Receive Email Verification
```
Problem: Email verification not arriving
Solutions:
1. Check spam/junk folder
2. Add noreply@6fbbooking.com to contacts
3. Try different email address
4. Wait 10 minutes and request new verification
5. Contact support if still not received
```

#### Payment Card Declined
```
Problem: Credit card not accepted
Solutions:
1. Verify card details (number, expiry, CVV)
2. Check billing address matches card
3. Ensure sufficient funds available
4. Try different card
5. Contact bank to authorize online transaction
```

#### No Available Time Slots
```
Problem: Calendar shows no availability
Solutions:
1. Try selecting different date range
2. Check if looking too far in advance
3. Try different barber
4. Consider different service
5. Join wait list for preferred times
```

#### Mobile App Won't Install
```
Problem: Can't add app to home screen
Solutions:
1. Use Safari on iOS (not Chrome)
2. Use Chrome on Android
3. Check if already installed
4. Clear browser cache and try again
5. Update browser to latest version
```

### Getting Help

#### Self-Service Resources
- **Help Center**: In-app help articles and FAQs
- **Video Tutorials**: Step-by-step video guides
- **Community Forum**: User community discussions
- **Knowledge Base**: Comprehensive documentation

#### Contact Support
- **Live Chat**: Available 9 AM - 6 PM EST
- **Email**: support@6fbbooking.com
- **Phone**: 1-800-6FB-BOOK
- **Emergency**: After-hours support for critical issues

#### What to Include in Support Requests
```
For Faster Resolution:
- Your name and email address
- Booking reference number (if applicable)
- Device and browser information
- Screenshots of any error messages
- Steps you've already tried
- Specific question or issue description
```

---

## Success Tips

### For Clients
- **Complete Your Profile**: Better recommendations and service
- **Book in Advance**: Get preferred times and barbers
- **Set Preferences**: Faster booking experience
- **Leave Reviews**: Help barbers and other clients
- **Enable Notifications**: Never miss appointments

### For Barbers
- **Professional Photos**: Quality photos increase bookings
- **Complete Bio**: Detailed profiles convert better
- **Respond Quickly**: Fast communication builds trust
- **Be Consistent**: Regular availability patterns help clients
- **Track Performance**: Monitor your 6FB Score for improvement

### For Administrators
- **Train Your Team**: Ensure everyone knows the system
- **Monitor Analytics**: Use data to make informed decisions
- **Regular Updates**: Keep information current and accurate
- **Client Feedback**: Regularly review and act on feedback
- **Stay Informed**: Keep up with new features and updates

---

## Next Steps

After completing this getting started guide:

1. **Explore Advanced Features**: Discover additional capabilities
2. **Join the Community**: Connect with other users
3. **Provide Feedback**: Help us improve the platform
4. **Stay Updated**: Subscribe to feature announcements
5. **Maximize Your Success**: Use analytics to grow your business

---

*Welcome to the 6FB Booking Platform! We're here to help you succeed.*

*For additional support, visit our Help Center or contact support@6fbbooking.com*

*Last Updated: January 2025*
*Version: 1.0*
