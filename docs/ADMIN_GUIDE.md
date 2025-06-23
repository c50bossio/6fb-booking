# 6FB Booking Platform - Admin Guide

This comprehensive guide covers all administrative functions for managing the 6FB Booking Platform.

## Table of Contents

- [Admin Dashboard Overview](#admin-dashboard-overview)
- [User Management](#user-management)
- [Location Management](#location-management)
- [Service Management](#service-management)
- [Payment Management](#payment-management)
- [Analytics and Reporting](#analytics-and-reporting)
- [System Configuration](#system-configuration)
- [Security Management](#security-management)
- [Troubleshooting](#troubleshooting)
- [Maintenance Tasks](#maintenance-tasks)

---

## Admin Dashboard Overview

### Accessing Admin Panel
1. Log in with admin credentials
2. Navigate to `/admin` or click "Admin Panel" in the main menu
3. Enter 2FA code if enabled

### Dashboard Widgets
- **Today's Overview**: Appointments, revenue, active users
- **System Health**: Server status, database performance, error rates
- **Recent Activity**: Latest bookings, payments, user registrations
- **Quick Actions**: Add barber, create location, system announcements

---

## User Management

### Managing Barbers

#### Adding New Barbers
1. Navigate to "Users" → "Barbers"
2. Click "Add New Barber"
3. Fill required information:
   - **Personal Details**:
     - Full name
     - Email address
     - Phone number
     - Profile photo
   - **Professional Info**:
     - License number
     - Years of experience
     - Specialties
     - Bio description
   - **Location Assignment**:
     - Primary location
     - Secondary locations (if applicable)
   - **Payment Setup**:
     - Default commission rate
     - Payout preferences
4. Send invitation email
5. Monitor onboarding progress

#### Managing Barber Accounts
- **Profile Updates**: Edit contact info, specialties, photos
- **Status Changes**: Active, inactive, suspended
- **Permission Management**: Service permissions, location access
- **Performance Monitoring**: View metrics, client feedback

#### Barber Verification Process
1. **Identity Verification**:
   - Government ID upload
   - License verification
   - Background check (if required)
2. **Skill Assessment**:
   - Portfolio review
   - Reference checks
   - Trial period setup
3. **Platform Training**:
   - System walkthrough
   - Booking process training
   - Payment handling instruction

### Managing Clients

#### Client Account Overview
- View all registered clients
- Search by name, email, or phone
- Filter by registration date, activity level
- Export client lists

#### Client Support Actions
- **Password Resets**: Generate secure reset links
- **Account Restoration**: Recover deleted accounts
- **Dispute Resolution**: Handle booking/payment disputes
- **Communication**: Send system messages or announcements

### User Roles and Permissions

#### Available Roles
1. **Super Admin**: Full system access
2. **Location Admin**: Location-specific management
3. **Barber**: Service provider access
4. **Client**: Booking and payment access
5. **Support Staff**: Limited admin functions

#### Permission Matrix
| Function | Super Admin | Location Admin | Barber | Client | Support |
|----------|-------------|----------------|--------|--------|---------|
| User Management | ✅ | Location Only | ❌ | ❌ | View Only |
| Financial Reports | ✅ | Location Only | Own Only | Own Only | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Booking Management | ✅ | ✅ | Own Only | Own Only | ✅ |

---

## Location Management

### Adding New Locations
1. Go to "Locations" → "Add Location"
2. Enter location details:
   - **Basic Information**:
     - Location name
     - Address (with GPS coordinates)
     - Phone number
     - Email address
   - **Operating Hours**:
     - Days of operation
     - Opening/closing times
     - Holiday schedules
   - **Services Available**:
     - Select available services
     - Location-specific pricing
   - **Staff Assignment**:
     - Assign barbers
     - Set location manager

### Location Configuration
- **Booking Rules**: Advance booking limits, cancellation policies
- **Capacity Management**: Maximum concurrent bookings
- **Special Features**: Parking info, accessibility options
- **Marketing**: Photos, descriptions, promotional offers

### Multi-Location Management
- **Centralized Scheduling**: View all locations
- **Staff Mobility**: Cross-location barber assignments
- **Unified Reporting**: Combined analytics
- **Brand Consistency**: Standardized services and pricing

---

## Service Management

### Service Categories

#### Default Categories
1. **Haircuts**
   - Men's cuts
   - Women's cuts
   - Children's cuts
   - Specialty cuts

2. **Beard Services**
   - Beard trims
   - Straight razor shaves
   - Beard styling
   - Mustache grooming

3. **Hair Color**
   - Full color
   - Highlights
   - Touch-ups
   - Color correction

4. **Special Treatments**
   - Hair washing
   - Scalp treatments
   - Hair styling
   - Wedding/event services

#### Managing Categories
- Add new categories
- Reorder category display
- Set category-specific rules
- Configure pricing structures

### Individual Services

#### Service Configuration
```
Service Name: "Premium Men's Haircut"
Category: Haircuts
Duration: 45 minutes
Base Price: $65
Description: "Complete haircut with consultation, wash, cut, style"
Requirements:
  - Advance booking: 24 hours
  - Cancellation notice: 4 hours
  - Barber skill level: Intermediate+
Add-ons Available:
  - Beard trim (+$15)
  - Hot towel treatment (+$10)
  - Premium products (+$20)
```

#### Service Pricing
- **Base Pricing**: Standard service cost
- **Dynamic Pricing**: Peak hour surcharges
- **Barber-Specific Pricing**: Premium barber rates
- **Package Deals**: Multi-service discounts
- **Seasonal Adjustments**: Holiday/special event pricing

### Service Availability Rules
- **Time-based**: Different services available at different times
- **Barber-specific**: Services available per barber skill level
- **Location-specific**: Services available per location
- **Seasonal**: Holiday or special event services

---

## Payment Management

### Payment Configuration

#### Stripe Connect Setup
1. **Platform Account**:
   - Register Stripe Connect account
   - Configure webhook endpoints
   - Set up Express dashboard access

2. **Commission Structure**:
   ```
   Revenue Split Configuration:
   - Platform fee: 5-15%
   - Location fee: 10-20%
   - Barber commission: 65-85%
   - Processing fee: 2.9% + $0.30
   ```

3. **Payout Schedules**:
   - Daily: Automatic (default)
   - Weekly: Every Friday
   - Monthly: First business day
   - On-demand: Manual triggers

#### Payment Method Management
- **Accepted Cards**: Visa, MC, Amex, Discover
- **Digital Wallets**: Apple Pay, Google Pay, Samsung Pay
- **International**: Currency conversion settings
- **Failed Payments**: Retry logic and notifications

### Financial Reporting

#### Revenue Analytics
1. **Daily Reports**:
   - Total revenue
   - Transaction count
   - Average ticket value
   - Payment method breakdown

2. **Commission Tracking**:
   - Platform earnings
   - Location earnings
   - Barber earnings
   - Processing costs

3. **Financial Exports**:
   - CSV/Excel exports
   - Tax report generation
   - Accounting software integration
   - Audit trail maintenance

#### Dispute Management
- **Chargeback Handling**: Automated response system
- **Refund Processing**: Partial and full refunds
- **Documentation**: Maintain dispute records
- **Prevention**: Fraud detection rules

---

## Analytics and Reporting

### Business Intelligence Dashboard

#### Key Performance Indicators (KPIs)
1. **Revenue Metrics**:
   - Total revenue (daily/weekly/monthly)
   - Revenue per barber
   - Revenue per client
   - Average transaction value

2. **Operational Metrics**:
   - Booking volume
   - Cancellation rates
   - No-show rates
   - Capacity utilization

3. **Customer Metrics**:
   - New client acquisition
   - Client retention rate
   - Lifetime value
   - Satisfaction scores

#### 6FB Score Analytics
- **Platform-wide Score**: Aggregated performance
- **Location Scores**: Individual location performance
- **Barber Scores**: Individual barber performance
- **Trend Analysis**: Score progression over time

### Custom Reports

#### Report Builder
1. **Data Sources**:
   - Bookings and appointments
   - Financial transactions
   - User activity
   - Review and ratings

2. **Filters Available**:
   - Date ranges
   - Locations
   - Barbers
   - Service types
   - Client demographics

3. **Export Options**:
   - PDF reports
   - Excel spreadsheets
   - CSV data files
   - Email automation

#### Scheduled Reports
- **Daily Operations**: Sent each morning
- **Weekly Summary**: Sent Monday mornings
- **Monthly Performance**: Sent first of month
- **Custom Schedules**: User-defined timing

---

## System Configuration

### Platform Settings

#### General Configuration
```json
{
  "platform_name": "6FB Booking Platform",
  "default_timezone": "America/New_York",
  "booking_window_days": 60,
  "cancellation_window_hours": 4,
  "no_show_window_minutes": 15,
  "auto_remind_hours": [24, 2],
  "session_timeout_minutes": 1440
}
```

#### Security Settings
- **Password Policy**: Minimum requirements
- **Two-Factor Authentication**: Mandatory for admins
- **API Rate Limiting**: Request throttling
- **IP Whitelisting**: Admin access restrictions
- **Session Management**: Timeout and concurrent login rules

#### Email Configuration
1. **SMTP Settings**:
   - Server: smtp.sendgrid.net (recommended)
   - Port: 587
   - Authentication: Username/Password
   - Encryption: TLS

2. **Email Templates**:
   - Booking confirmations
   - Reminders
   - Cancellation notices
   - Payment receipts
   - Password resets

### Notification System

#### Push Notifications
- **Web Push**: Browser notifications
- **Mobile Push**: PWA notifications
- **Email Notifications**: Transactional emails
- **SMS Notifications**: Optional text messages

#### Notification Rules
```yaml
booking_confirmation:
  triggers: ["booking_created"]
  recipients: ["client", "barber"]
  delay: "immediate"
  channels: ["email", "push"]

appointment_reminder:
  triggers: ["appointment_upcoming"]
  recipients: ["client"]
  delay: "24_hours_before"
  channels: ["email", "sms"]
```

---

## Security Management

### Access Control

#### Authentication Methods
1. **Standard Login**: Email/password
2. **Two-Factor Authentication**: SMS or authenticator app
3. **Single Sign-On**: Google, Apple ID integration
4. **API Authentication**: JWT tokens

#### Authorization Framework
- **Role-Based Access Control (RBAC)**
- **Permission granularity**: Feature-level permissions
- **Resource-based access**: Location/barber-specific access
- **Temporary access**: Time-limited permissions

### Data Protection

#### Privacy Compliance
- **GDPR Compliance**: EU data protection
- **CCPA Compliance**: California privacy rights
- **PIPEDA Compliance**: Canadian privacy laws
- **Data Retention**: Automated deletion policies

#### Encryption Standards
- **Data at Rest**: AES-256 encryption
- **Data in Transit**: TLS 1.3
- **Payment Data**: PCI DSS Level 1
- **API Communications**: OAuth 2.0 + JWT

### Security Monitoring

#### Threat Detection
- **Login Anomalies**: Unusual access patterns
- **API Abuse**: Rate limit violations
- **Payment Fraud**: Transaction monitoring
- **Data Breaches**: Automated detection

#### Security Auditing
- **Access Logs**: Complete audit trail
- **System Changes**: Configuration tracking
- **Data Modifications**: Change logging
- **Regular Audits**: Quarterly security reviews

---

## Troubleshooting

### Common Issues

#### Payment Problems
1. **Failed Transactions**:
   - Check card validity
   - Verify billing address
   - Review fraud detection settings
   - Contact payment processor

2. **Payout Issues**:
   - Verify bank account details
   - Check account verification status
   - Review payout schedules
   - Contact Stripe support

#### Booking Issues
1. **Scheduling Conflicts**:
   - Check barber availability
   - Verify time zone settings
   - Review booking rules
   - Update calendar sync

2. **Notification Failures**:
   - Verify email/SMS settings
   - Check template configurations
   - Review delivery logs
   - Test notification systems

### System Health Monitoring

#### Performance Metrics
- **Response Times**: API endpoint performance
- **Database Performance**: Query execution times
- **Server Resources**: CPU, memory, disk usage
- **Error Rates**: Application and system errors

#### Automated Alerts
```yaml
alerts:
  high_error_rate:
    threshold: "5% over 5 minutes"
    notification: ["admin@email.com", "slack-channel"]

  slow_response:
    threshold: "2 seconds average"
    notification: ["ops-team@email.com"]

  payment_failures:
    threshold: "10 failures in 1 hour"
    notification: ["finance@email.com", "admin@email.com"]
```

---

## Maintenance Tasks

### Daily Maintenance
- [ ] Review system health dashboard
- [ ] Check payment processing status
- [ ] Monitor booking volumes
- [ ] Review error logs
- [ ] Verify backup completion

### Weekly Maintenance
- [ ] Analyze performance metrics
- [ ] Review user feedback
- [ ] Update service availability
- [ ] Check security alerts
- [ ] Test backup restoration

### Monthly Maintenance
- [ ] Generate financial reports
- [ ] Review and update pricing
- [ ] Audit user permissions
- [ ] Update system documentation
- [ ] Plan capacity scaling

### Quarterly Maintenance
- [ ] Comprehensive security audit
- [ ] Performance optimization review
- [ ] User satisfaction survey
- [ ] Technology stack updates
- [ ] Disaster recovery testing

---

## Emergency Procedures

### System Downtime
1. **Immediate Actions**:
   - Post status page update
   - Notify key stakeholders
   - Initiate incident response
   - Document issue details

2. **Communication Plan**:
   - Update website banner
   - Send email to active users
   - Post social media updates
   - Contact major clients directly

### Data Security Incidents
1. **Immediate Response**:
   - Isolate affected systems
   - Preserve evidence
   - Contact security team
   - Document incident timeline

2. **Legal Compliance**:
   - Notify regulatory bodies (if required)
   - Prepare breach notifications
   - Contact legal counsel
   - Coordinate with insurance

---

*This guide should be reviewed and updated quarterly to reflect system changes and new features.*

*Last Updated: January 2025*
*Version: 1.0*
