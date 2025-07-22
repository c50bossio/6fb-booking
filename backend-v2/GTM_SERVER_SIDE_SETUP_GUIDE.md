# GTM Server-Side Container Setup Guide ✅

## 🎯 **Overview**

BookedBarber V2 includes comprehensive Google Tag Manager (GTM) server-side container support for enhanced conversion tracking, improved data privacy, and better attribution accuracy.

### **Benefits of Server-Side GTM**
- **Enhanced Privacy**: Data processing happens on your server, not the client
- **Improved Accuracy**: Bypass ad blockers and tracking prevention
- **Better Attribution**: Server-side events are more reliable than client-side
- **GDPR/CCPA Compliance**: More control over data collection and sharing
- **iOS 14.5+ Compatibility**: Reduced impact from Apple's tracking restrictions

## 🚀 **Setup Process**

### **Step 1: Create GTM Server Container**

1. **Go to Google Tag Manager**:
   - Visit https://tagmanager.google.com
   - Select your existing account or create new one

2. **Create Server Container**:
   - Click "Create Container"
   - Choose "Server" as container type
   - Enter container name: "BookedBarber Server Container"
   - Select "Manually provision tagging server"

3. **Get Container Configuration**:
   - Note your **Container ID** (format: `GTM-XXXXXXX`)
   - Note your **Config URL** (format: `https://config.gtm.googletagmanager.com/...`)

### **Step 2: Configure BookedBarber Backend**

Add the following to your `.env` file:

```bash
# GTM Server-Side Container
GTM_SERVER_CONTAINER_URL="https://your-subdomain.gtm.live"  # Your server container URL
GTM_MEASUREMENT_ID="G-XXXXXXXXXX"                          # Your GA4 Measurement ID
GTM_API_SECRET="your-api-secret"                           # GA4 Measurement Protocol API secret

# Optional: Server container configuration
GTM_SERVER_SIDE_TAGGING=true
GTM_SERVER_SIDE_ENDPOINT="https://your-subdomain.gtm.live/gtm/collect"
GTM_SERVER_SIDE_CONTAINER_ID="GTM-XXXXXXX"
```

### **Step 3: Deploy Server Container**

#### **Option A: Google Cloud Run (Recommended)**

1. **Enable Cloud Run API** in Google Cloud Console
2. **Deploy Container**:
   ```bash
   gcloud run deploy gtm-server \
     --image=gcr.io/gtm-server-side/gtm-server-side:latest \
     --platform=managed \
     --region=us-central1 \
     --allow-unauthenticated \
     --port=8080 \
     --set-env-vars="CONTAINER_CONFIG=your-config-url"
   ```

3. **Configure Custom Domain** (Optional):
   - Map a custom domain to your Cloud Run service
   - Update `GTM_SERVER_CONTAINER_URL` with your custom domain

#### **Option B: App Engine Deployment**

1. **Create `app.yaml`**:
   ```yaml
   runtime: nodejs16
   env: standard
   env_variables:
     CONTAINER_CONFIG: "your-config-url"
   ```

2. **Deploy**:
   ```bash
   gcloud app deploy app.yaml
   ```

### **Step 4: Configure GTM Server Container**

1. **Access Server Container**:
   - Go to https://tagmanager.google.com
   - Select your server container

2. **Create GA4 Tag**:
   - Tag Type: "Google Analytics: GA4"
   - Configuration Tag: Create new GA4 Configuration
   - Measurement ID: Your GA4 measurement ID
   - Triggers: All Pages, Appointment Events

3. **Create Custom Events**:
   - Tag Type: "Google Analytics: GA4"
   - Event Name: `appointment_scheduled`
   - Event Parameters:
     ```
     currency: USD
     value: {{Event Value}}
     transaction_id: {{Appointment ID}}
     ```

4. **Set Up Conversion Tracking**:
   - Tag Type: "Google Ads Conversion Tracking"
   - Conversion ID: Your Google Ads conversion ID
   - Conversion Label: Your conversion label
   - Trigger: Appointment Scheduled

### **Step 5: Test Server Container**

Run the BookedBarber GTM test script:

```bash
cd backend-v2
python test_gtm_server_container.py
```

Expected output:
```
✅ GTM Server Container Test PASSED
✅ Server container responding correctly
✅ Events processed successfully
✅ GA4 integration working
✅ Conversion tracking active
```

## 🔧 **Configuration Options**

### **Environment Variables**

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `GTM_SERVER_CONTAINER_URL` | Server container endpoint | `https://gtm.example.com` | Yes |
| `GTM_MEASUREMENT_ID` | GA4 measurement ID | `G-XXXXXXXXXX` | Yes |
| `GTM_API_SECRET` | GA4 API secret | `abc123...` | Yes |
| `GTM_SERVER_SIDE_TAGGING` | Enable server-side tagging | `true` | No |
| `GTM_SERVER_SIDE_ENDPOINT` | Custom endpoint URL | `/gtm/collect` | No |
| `GTM_DEBUG_MODE` | Enable debug logging | `true` | No |

### **BookedBarber Integration Settings**

```python
# config.py settings
gtm_server_container_url: str = ""  # Primary server URL
gtm_server_side_tagging: bool = False  # Enable server-side
gtm_debug_mode: bool = False  # Debug logging
gtm_batch_events: bool = True  # Batch events for performance
gtm_batch_size: int = 10  # Events per batch
gtm_batch_timeout: int = 5000  # Batch timeout (ms)
```

## 📊 **Event Tracking**

### **Automatic Events**

BookedBarber automatically sends these events to your GTM server container:

1. **Page Views**: All booking page visits
2. **Appointment Booked**: When customer initiates booking
3. **Appointment Confirmed**: When booking is confirmed (PRIMARY CONVERSION)
4. **Payment Completed**: When payment is processed
5. **User Registration**: When new account is created

### **Event Data Structure**

```javascript
{
  "event": "appointment_scheduled",
  "event_type": "appointment_booked",
  "client_id": "1234567890.1234567890",
  "user_id": "user_123",
  "timestamp": "2025-07-22T10:30:00Z",
  "ecommerce": {
    "items": [{
      "item_id": "appointment_456",
      "item_name": "Classic Haircut",
      "item_category": "Appointment",
      "price": 35.00,
      "quantity": 1,
      "item_variant": "barber_789"
    }]
  },
  "custom_dimensions": {
    "barber_id": "barber_789",
    "service_id": "service_123",
    "location_id": "location_456"
  }
}
```

### **Custom Event Tracking**

```python
# Python backend example
from services.gtm_service import track_gtm_custom_event

await track_gtm_custom_event(
    event_name="special_promotion_clicked",
    client_id="client_123",
    event_parameters={
        "promotion_name": "Summer Special",
        "discount_amount": 10.00,
        "valid_until": "2025-08-01"
    }
)
```

## 🛡️ **Security & Privacy**

### **Data Privacy Features**

- **IP Anonymization**: Server-side IP masking
- **PII Filtering**: Automatic removal of personally identifiable information
- **Consent Management**: Respect user tracking preferences
- **Data Minimization**: Only collect necessary data for conversions

### **GDPR Compliance**

```python
# Respect user consent
await track_gtm_event(
    event=appointment_event,
    consent_granted={
        "analytics_storage": True,
        "ad_storage": False,  # User declined ad tracking
        "ad_user_data": False,
        "ad_personalization": False
    }
)
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Server Container Not Responding**:
   - Check `GTM_SERVER_CONTAINER_URL` is correct
   - Verify server container is deployed and running
   - Check Cloud Run service logs

2. **Events Not Appearing in GA4**:
   - Verify `GTM_MEASUREMENT_ID` matches your GA4 property
   - Check `GTM_API_SECRET` is valid
   - Enable debug mode to see event logs

3. **Conversion Tracking Not Working**:
   - Ensure Google Ads conversion tag is configured in GTM
   - Check conversion ID and label are correct
   - Verify tag firing triggers are set up properly

### **Debug Commands**

```bash
# Test server container connectivity
curl -X POST "https://your-subdomain.gtm.live/gtm/collect" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check BookedBarber GTM configuration
python -c "from config import settings; print(f'GTM URL: {settings.gtm_server_container_url}')"

# View GTM service logs
tail -f logs/gtm_service.log
```

### **Performance Monitoring**

```python
# Monitor GTM service health
from services.gtm_service import gtm_service

container_info = gtm_service.get_container_info()
print(f"Events in batch: {container_info['events_in_batch']}")
print(f"Batch enabled: {container_info['batch_events']}")
```

## 📈 **Advanced Features**

### **Enhanced Ecommerce Tracking**

```python
# Track complete purchase funnel
from services.gtm_service import GTMEcommerceItem, track_gtm_appointment_booked

appointment_item = GTMEcommerceItem(
    item_id="apt_123",
    item_name="Premium Haircut",
    item_category="Premium Services",
    price=75.00,
    quantity=1,
    item_variant="master_barber",
    affiliation="Downtown Location",
    promotion_name="VIP Discount"
)

await track_gtm_appointment_booked(
    client_id="client_456",
    appointment_id="apt_123",
    barber_id="barber_789",
    service_id="premium_cut",
    appointment_value=75.00,
    custom_dimensions={
        "customer_tier": "VIP",
        "booking_source": "mobile_app",
        "referral_code": "FRIEND25"
    }
)
```

### **Custom Dimensions & Metrics**

```bash
# Configure custom dimensions in .env
GTM_CUSTOM_DIMENSIONS='{"customer_tier": "dimension1", "booking_source": "dimension2"}'
GTM_CUSTOM_METRICS='{"lifetime_value": "metric1", "visit_count": "metric2"}'
```

### **Cross-Domain Tracking**

```python
# Track across multiple domains
await track_gtm_page_view(
    client_id="client_123",
    page_url="https://book.barbershop.com/appointment",
    page_title="Book Appointment",
    custom_dimensions={
        "linker_param": "client_id.timestamp",
        "source_domain": "barbershop.com"
    }
)
```

## 🎉 **Production Checklist**

- [ ] Server container deployed to production environment
- [ ] Custom domain configured (recommended)
- [ ] SSL certificate installed
- [ ] GTM server container published (not preview mode)
- [ ] GA4 property configured with correct measurement ID
- [ ] Google Ads conversion tracking tags configured
- [ ] Event debugging verified in GTM preview mode
- [ ] Production environment variables configured
- [ ] Monitoring and alerts set up
- [ ] Performance optimization settings applied

## 📚 **Additional Resources**

- [Google Tag Manager Server-Side Documentation](https://developers.google.com/tag-platform/tag-manager/server-side)
- [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [Google Cloud Run Deployment Guide](https://cloud.google.com/run/docs/deploying)
- [GTM Server-Side Best Practices](https://support.google.com/tagmanager/answer/9442095)

---

## 🚀 **Status: Configuration Ready**

✅ **GTM Service**: Fully implemented with server-side support  
✅ **Event Tracking**: All appointment and payment events configured  
✅ **Configuration**: Environment variables and settings ready  
✅ **Documentation**: Complete setup and troubleshooting guide  
✅ **Testing**: Verification scripts available  

**Next Steps**: Deploy GTM server container and configure environment variables

Last Updated: 2025-07-22