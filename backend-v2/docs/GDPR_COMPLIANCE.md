# GDPR Compliance Documentation

## Overview

BookedBarber V2 is designed with privacy-first principles and full GDPR (General Data Protection Regulation) compliance. Our comprehensive privacy framework ensures user rights are protected while maintaining business functionality and providing transparency in data processing.

## Key Features

### 🛡️ Privacy by Design
- **Data Minimization**: Only necessary data is collected and processed
- **Purpose Limitation**: Data used only for stated purposes
- **Storage Limitation**: Automatic data retention policies
- **Accountability**: Comprehensive audit trails for all data processing

### 📋 Consent Management
- **Granular Consent**: Individual consent for each processing purpose
- **Easy Withdrawal**: One-click consent withdrawal
- **Consent Audit Trail**: Complete history of consent changes
- **Legal Basis Tracking**: Documentation of lawful basis for processing

### 🔒 Data Subject Rights
- **Right to Access**: Complete data export functionality
- **Right to Rectification**: Easy data correction tools
- **Right to Erasure**: Comprehensive data deletion ("Right to be Forgotten")
- **Right to Portability**: Machine-readable data export
- **Right to Object**: Opt-out of specific processing activities

### 🍪 Cookie Management
- **Cookie Consent Banner**: GDPR-compliant cookie consent interface
- **Cookie Preferences**: Granular control over cookie categories
- **Consent Storage**: Secure storage of cookie preferences
- **Regular Consent Refresh**: Periodic consent renewal requests

## API Endpoints

### Base URL
All privacy endpoints are prefixed with `/api/v2/privacy`

### Authentication
All endpoints require valid JWT authentication except where noted.

## Consent Management

### 1. Get User Consents

```http
GET /api/v2/privacy/consents
```

Retrieve all consent statuses for the current user.

**Response:**
```json
{
  "user_id": 123,
  "consents": [
    {
      "consent_type": "terms_of_service",
      "status": "granted",
      "granted_at": "2024-01-15T10:30:00Z",
      "expires_at": null,
      "version": "1.2",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0..."
    },
    {
      "consent_type": "marketing_emails",
      "status": "granted",
      "granted_at": "2024-01-15T10:30:00Z",
      "expires_at": "2025-01-15T10:30:00Z",
      "version": "1.0",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0..."
    },
    {
      "consent_type": "aggregate_analytics",
      "status": "denied",
      "granted_at": null,
      "expires_at": null,
      "version": "1.0",
      "ip_address": null,
      "user_agent": null
    }
  ],
  "last_updated": "2024-01-15T10:30:00Z"
}
```

### 2. Update Consent

```http
PUT /api/v2/privacy/consents
```

Update user consent for specific purposes.

**Request Body:**
```json
{
  "consents": [
    {
      "consent_type": "marketing_emails",
      "status": "granted",
      "reason": "User opted in to receive promotional emails"
    },
    {
      "consent_type": "aggregate_analytics",
      "status": "denied",
      "reason": "User declined cross-user analytics participation"
    }
  ],
  "consent_context": {
    "source": "settings_page",
    "campaign_id": null,
    "form_version": "2.1"
  }
}
```

**Response:**
```json
{
  "updated_consents": [
    {
      "consent_type": "marketing_emails",
      "previous_status": "denied",
      "new_status": "granted",
      "effective_immediately": true
    },
    {
      "consent_type": "aggregate_analytics", 
      "previous_status": "pending",
      "new_status": "denied",
      "effective_immediately": true
    }
  ],
  "audit_log_entries": [
    {
      "id": "audit_12345",
      "timestamp": "2024-07-03T10:15:00Z",
      "action": "consent_updated"
    }
  ]
}
```

### 3. Bulk Consent Update

```http
POST /api/v2/privacy/consents/bulk
```

Update multiple consents in a single request (useful for initial consent collection).

**Request Body:**
```json
{
  "consent_bundle": "essential_and_marketing",
  "consents": {
    "terms_of_service": "granted",
    "privacy_policy": "granted", 
    "data_processing": "granted",
    "marketing_emails": "granted",
    "marketing_sms": "denied",
    "third_party_sharing": "denied",
    "aggregate_analytics": "denied",
    "benchmarking": "denied"
  },
  "consent_metadata": {
    "consent_interface_version": "3.0",
    "presentation_method": "modal",
    "language": "en-US",
    "jurisdiction": "EU"
  }
}
```

## Cookie Management

### 1. Cookie Consent Preferences

```http
GET /api/v2/privacy/cookies
```

Get current cookie consent preferences.

**Response:**
```json
{
  "consent_id": "cookie_consent_12345",
  "preferences": {
    "essential": {
      "status": "granted",
      "description": "Required for basic website functionality",
      "can_decline": false,
      "cookies": ["session_id", "csrf_token", "auth_token"]
    },
    "functional": {
      "status": "granted",
      "description": "Enhance website functionality and user experience",
      "can_decline": true,
      "cookies": ["timezone", "language_preference", "booking_preferences"]
    },
    "analytics": {
      "status": "denied",
      "description": "Help us understand how users interact with the website",
      "can_decline": true,
      "cookies": ["google_analytics", "performance_tracking"]
    },
    "marketing": {
      "status": "denied",
      "description": "Used for targeted advertising and marketing campaigns",
      "can_decline": true,
      "cookies": ["facebook_pixel", "google_ads", "retargeting"]
    }
  },
  "last_updated": "2024-07-03T10:00:00Z",
  "consent_valid_until": "2025-07-03T10:00:00Z",
  "compliance_mode": "gdpr",
  "consent_version": "2.1"
}
```

### 2. Update Cookie Preferences

```http
PUT /api/v2/privacy/cookies
```

Update cookie consent preferences.

**Request Body:**
```json
{
  "preferences": {
    "essential": "granted",
    "functional": "granted", 
    "analytics": "granted",
    "marketing": "denied"
  },
  "consent_source": "cookie_banner",
  "renewal": false
}
```

**Response:**
```json
{
  "consent_id": "cookie_consent_12346",
  "updated_preferences": {
    "analytics": {
      "previous_status": "denied",
      "new_status": "granted",
      "effective_immediately": true
    }
  },
  "cookies_to_set": [
    "google_analytics"
  ],
  "cookies_to_remove": [],
  "expires_at": "2025-07-03T10:15:00Z"
}
```

## Data Subject Rights

### 1. Data Export (Right to Portability)

#### Request Data Export
```http
POST /api/v2/privacy/data-export
```

Request a complete export of user data.

**Request Body:**
```json
{
  "export_format": "json",
  "data_categories": [
    "profile_data",
    "booking_history",
    "payment_records", 
    "communication_logs",
    "consent_history",
    "analytics_data"
  ],
  "date_range": {
    "start_date": "2023-01-01",
    "end_date": "2024-07-03"
  },
  "include_metadata": true,
  "purpose": "personal_use"
}
```

**Response:**
```json
{
  "export_request_id": "GDPR-A1B2C3D4-20240703",
  "status": "processing",
  "estimated_completion": "2024-07-03T12:00:00Z",
  "download_available_until": "2024-07-10T12:00:00Z",
  "data_categories_included": [
    "profile_data",
    "booking_history", 
    "payment_records",
    "communication_logs",
    "consent_history"
  ],
  "estimated_size_mb": 15.6,
  "security_note": "Export will be encrypted and require password authentication"
}
```

#### Check Export Status
```http
GET /api/v2/privacy/data-export/{export_request_id}/status
```

**Response:**
```json
{
  "export_request_id": "GDPR-A1B2C3D4-20240703",
  "status": "completed",
  "created_at": "2024-07-03T10:00:00Z", 
  "completed_at": "2024-07-03T10:45:00Z",
  "download_url": "https://secure-exports.bookedbarber.com/download/encrypted_export_12345.zip",
  "download_expires_at": "2024-07-10T10:45:00Z",
  "file_size_mb": 14.2,
  "security": {
    "encryption": "AES-256",
    "password_required": true,
    "download_attempts_remaining": 3
  }
}
```

#### Download Export Data
```http
GET /api/v2/privacy/data-export/{export_request_id}/download
```

**Query Parameters:**
- `password`: Decryption password (provided separately via secure channel)

Returns encrypted ZIP file containing:
```
data_export_user_123/
├── profile/
│   ├── user_profile.json
│   ├── preferences.json
│   └── settings.json
├── bookings/
│   ├── appointments.json
│   ├── recurring_patterns.json
│   └── cancellations.json
├── payments/
│   ├── transactions.json
│   ├── invoices.json
│   └── refunds.json
├── communications/
│   ├── emails_sent.json
│   ├── sms_sent.json
│   └── notifications.json
├── consent/
│   ├── consent_history.json
│   ├── cookie_preferences.json
│   └── audit_trail.json
├── analytics/
│   ├── anonymized_insights.json
│   └── usage_statistics.json
└── metadata/
    ├── export_manifest.json
    ├── data_lineage.json
    └── retention_policies.json
```

### 2. Account Deletion (Right to Erasure)

```http
POST /api/v2/privacy/delete-account
```

Request complete account and data deletion.

**Request Body:**
```json
{
  "confirmation_phrase": "I understand this action is irreversible",
  "deletion_reason": "no_longer_using_service",
  "retain_anonymized_analytics": false,
  "final_data_export": true,
  "deletion_date": "immediate"
}
```

**Response:**
```json
{
  "deletion_request_id": "DEL-E5F6G7H8-20240703",
  "status": "scheduled",
  "scheduled_deletion_date": "2024-07-10T00:00:00Z",
  "grace_period_ends": "2024-07-10T00:00:00Z",
  "cancellation_possible_until": "2024-07-09T23:59:59Z",
  "data_export": {
    "included": true,
    "available_until": "2024-07-17T00:00:00Z",
    "download_url": "Will be provided when ready"
  },
  "what_will_be_deleted": [
    "User profile and account data",
    "Booking history and preferences", 
    "Payment information (except legally required records)",
    "Communication history",
    "Uploaded files and photos",
    "Analytics data linked to account"
  ],
  "what_will_be_retained": [
    "Anonymized analytics data (if consent granted)",
    "Financial records (as required by law for 7 years)",
    "Dispute/legal records (if applicable)"
  ],
  "support_contact": "privacy@bookedbarber.com"
}
```

#### Cancel Deletion Request
```http
DELETE /api/v2/privacy/delete-account/{deletion_request_id}
```

**Response:**
```json
{
  "deletion_request_id": "DEL-E5F6G7H8-20240703",
  "status": "cancelled",
  "cancelled_at": "2024-07-05T14:30:00Z",
  "account_restored": true,
  "note": "Account deletion cancelled successfully. All data remains intact."
}
```

## Privacy Settings Management

### 1. Get Privacy Settings

```http
GET /api/v2/privacy/settings
```

**Response:**
```json
{
  "user_id": 123,
  "privacy_settings": {
    "profile_visibility": "private",
    "show_in_search": false,
    "allow_booking_links": true,
    "share_reviews_publicly": false,
    "marketing_communication": {
      "email": true,
      "sms": false,
      "push_notifications": true
    },
    "data_processing": {
      "analytics_participation": false,
      "improvement_feedback": true,
      "third_party_integrations": false
    },
    "communication_preferences": {
      "booking_confirmations": "email",
      "reminders": "sms",
      "promotional": "none",
      "service_updates": "email"
    }
  },
  "privacy_level": "high",
  "last_updated": "2024-07-03T10:00:00Z"
}
```

### 2. Update Privacy Settings

```http
PUT /api/v2/privacy/settings
```

**Request Body:**
```json
{
  "privacy_settings": {
    "profile_visibility": "limited",
    "show_in_search": true,
    "marketing_communication": {
      "email": false,
      "sms": false
    },
    "data_processing": {
      "analytics_participation": true
    }
  }
}
```

## Audit and Compliance

### 1. Consent Audit Log

```http
GET /api/v2/privacy/audit/consents
```

View audit trail of consent changes (available to data subjects).

**Query Parameters:**
- `start_date`: Filter from date
- `end_date`: Filter to date  
- `consent_type`: Filter by specific consent type

**Response:**
```json
{
  "audit_entries": [
    {
      "id": "audit_67890",
      "timestamp": "2024-07-03T10:15:00Z",
      "action": "consent_granted",
      "consent_type": "marketing_emails",
      "previous_status": "denied",
      "new_status": "granted",
      "reason": "User updated preferences in settings",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "legal_basis": "consent",
      "initiated_by": "user"
    },
    {
      "id": "audit_67891",
      "timestamp": "2024-06-15T14:20:00Z",
      "action": "consent_withdrawn",
      "consent_type": "aggregate_analytics",
      "previous_status": "granted",
      "new_status": "withdrawn", 
      "reason": "User clicked opt-out link in email",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "legal_basis": "consent",
      "initiated_by": "user"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 23,
    "pages": 1
  }
}
```

### 2. Data Processing Activities

```http
GET /api/v2/privacy/processing-activities
```

View all data processing activities for transparency (public endpoint).

**Response:**
```json
{
  "processing_activities": [
    {
      "activity_id": "booking_management",
      "purpose": "Manage customer appointments and bookings",
      "legal_basis": "contract",
      "data_categories": [
        "Contact information",
        "Booking preferences", 
        "Service history"
      ],
      "retention_period": "7 years after last booking",
      "recipients": [
        "Booking system",
        "Payment processor (Stripe)",
        "Email service (SendGrid)"
      ],
      "international_transfers": "No",
      "automated_decision_making": "No"
    },
    {
      "activity_id": "marketing_communications",
      "purpose": "Send promotional emails and SMS campaigns",
      "legal_basis": "consent",
      "data_categories": [
        "Email address",
        "Phone number",
        "Communication preferences"
      ],
      "retention_period": "Until consent is withdrawn",
      "recipients": [
        "Email service (SendGrid)",
        "SMS service (Twilio)"
      ],
      "international_transfers": "US (adequate protection)",
      "automated_decision_making": "Campaign targeting algorithms"
    }
  ],
  "last_updated": "2024-07-01T00:00:00Z",
  "data_protection_officer": "dpo@bookedbarber.com"
}
```

## Implementation Guidelines

### Frontend Integration

#### Cookie Consent Banner
```typescript
import { CookieConsentBanner } from '@/components/privacy/CookieConsentBanner';

function Layout({ children }) {
  return (
    <div>
      {children}
      <CookieConsentBanner
        complianceMode="gdpr"
        showDeclineAll={true}
        granularControls={true}
        autoShow={true}
      />
    </div>
  );
}
```

#### Privacy Settings Component
```typescript
import { PrivacySettings } from '@/components/privacy/PrivacySettings';

function PrivacyPage() {
  const { settings, updateSettings, isLoading } = usePrivacySettings();
  
  return (
    <PrivacySettings
      settings={settings}
      onUpdate={updateSettings}
      loading={isLoading}
      showExportOptions={true}
      showDeletionOptions={true}
    />
  );
}
```

### Backend Service Usage

```python
from services.privacy_service import PrivacyService
from services.consent_service import ConsentService

async def handle_consent_update(user_id: int, consents: dict, db: Session):
    consent_service = ConsentService(db)
    privacy_service = PrivacyService(db)
    
    # Update consents with audit trail
    result = await consent_service.update_user_consents(
        user_id=user_id,
        consents=consents,
        audit_context={
            "source": "user_settings",
            "ip_address": request.client.host,
            "user_agent": request.headers.get("user-agent")
        }
    )
    
    # Check if any processing activities need to be updated
    await privacy_service.update_processing_activities(user_id, consents)
    
    return result
```

## Data Protection Impact Assessment (DPIA)

### High-Risk Processing Activities

1. **Cross-User AI Analytics**
   - **Risk**: Potential re-identification through data aggregation
   - **Mitigation**: k-anonymity, differential privacy, consent requirement

2. **Marketing Attribution Tracking**
   - **Risk**: Extensive behavioral profiling
   - **Mitigation**: Data minimization, retention limits, granular consent

3. **Payment Processing**
   - **Risk**: Financial data exposure
   - **Mitigation**: PCI DSS compliance, tokenization, minimal retention

### Technical and Organizational Measures

#### Security Measures
- **Encryption**: AES-256 for data at rest, TLS 1.3 for data in transit
- **Access Control**: Role-based access with multi-factor authentication
- **Pseudonymization**: Automated pseudonymization of personal identifiers
- **Data Loss Prevention**: Automated scanning for sensitive data exposure

#### Organizational Measures
- **Data Protection Officer**: Dedicated DPO for privacy oversight
- **Privacy Training**: Regular training for all staff handling personal data
- **Incident Response**: 72-hour breach notification procedures
- **Regular Audits**: Quarterly privacy compliance audits

## International Compliance

### GDPR (EU) Compliance
- **Legal Basis Documentation**: Clear lawful basis for all processing
- **Data Subject Rights**: Full implementation of all GDPR rights
- **Consent Management**: Granular, withdrawable consent system
- **Data Transfers**: Adequate protection for international transfers

### CCPA (California) Compliance
- **Right to Know**: Data category and source transparency
- **Right to Delete**: Comprehensive deletion capabilities
- **Right to Opt-Out**: Sale of personal information opt-out
- **Non-Discrimination**: Equal service regardless of privacy choices

### Additional Jurisdictions
- **PIPEDA (Canada)**: Privacy policy transparency and consent requirements
- **LGPD (Brazil)**: Data protection impact assessments and consent
- **Privacy Act (Australia)**: Notifiable data breach scheme compliance

## Monitoring and Alerting

### Privacy Metrics
- **Consent Rates**: Track consent grant/denial rates by type
- **Data Export Requests**: Monitor volume and processing times
- **Deletion Requests**: Track deletion request patterns
- **Cookie Consent**: Analyze cookie consent preferences

### Automated Alerts
- **Data Breach Detection**: Immediate alerts for potential breaches
- **Consent Anomalies**: Unusual consent patterns or mass withdrawals
- **Export Delays**: Alerts if export requests exceed SLA
- **Retention Violations**: Automated detection of data retention policy violations

## Support and Resources

### User Support
- **Privacy Help Center**: Self-service privacy tools and information
- **Data Protection Officer**: Direct contact for privacy concerns
- **Consent Help**: Guidance on consent choices and implications
- **Export Assistance**: Support for data export and deletion requests

### Developer Resources
- **Privacy SDK**: Tools for privacy-compliant development
- **API Documentation**: Complete privacy API reference
- **Compliance Checklists**: Step-by-step compliance verification
- **Training Materials**: Privacy-first development practices

### Contacts
- **Data Protection Officer**: dpo@bookedbarber.com
- **Privacy Support**: privacy@bookedbarber.com
- **Security Incidents**: security@bookedbarber.com
- **Legal Requests**: legal@bookedbarber.com

---

*Last Updated: 2025-07-03*
*Version: 2.0.0*
*Compliance: GDPR, CCPA, PIPEDA, LGPD*