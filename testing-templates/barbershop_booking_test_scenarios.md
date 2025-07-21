# 💇‍♂️ Barbershop Booking Test Scenarios

**Industry-specific test scenarios for the 6FB Booking platform**

This document provides comprehensive testing scenarios specifically designed for barbershop booking functionality, incorporating the Six Figure Barber methodology and real-world barbershop operations.

---

## 🎯 **CORE BUSINESS LOGIC TEST SCENARIOS**

### **1. Appointment Booking Flow**

#### **Scenario: Standard Appointment Booking**
```python
def test_standard_appointment_booking():
    """Test complete appointment booking workflow"""
    # Given: A client wants to book a haircut
    client = create_test_client()
    barber = create_test_barber()
    service = create_test_service("Men's Haircut", duration=30, price=45.00)
    
    # When: Client books appointment
    booking_request = {
        "barber_id": barber.id,
        "service_id": service.id,
        "date": "2025-01-15",
        "time": "14:00",
        "client_notes": "Fade on sides, scissor cut on top"
    }
    
    response = client.post("/api/v1/appointments", json=booking_request)
    
    # Then: Appointment should be created successfully
    assert response.status_code == 201
    appointment = response.json()
    assert appointment["status"] == "pending"
    assert appointment["total_price"] == 45.00
    
    # And: Confirmation should be sent
    assert_sms_sent(client.phone, "Appointment confirmed")
    assert_email_sent(client.email, "booking_confirmation")
```

#### **Scenario: Double Booking Prevention**
```python
def test_double_booking_prevention():
    """Test that double bookings are prevented"""
    # Given: Barber has existing appointment
    barber = create_test_barber()
    existing_appointment = create_appointment(
        barber=barber,
        date="2025-01-15",
        time="14:00",
        duration=30
    )
    
    # When: Another client tries to book same time slot
    booking_request = {
        "barber_id": barber.id,
        "service_id": service.id,
        "date": "2025-01-15", 
        "time": "14:00"  # Conflicting time
    }
    
    response = client.post("/api/v1/appointments", json=booking_request)
    
    # Then: Booking should be rejected
    assert response.status_code == 409
    assert "time slot not available" in response.json()["detail"]
```

#### **Scenario: Timezone Handling**
```python
def test_timezone_appointment_booking():
    """Test appointment booking across different timezones"""
    # Given: Barber in EST, Client booking from PST
    barber = create_test_barber(timezone="America/New_York")
    client = create_test_client(timezone="America/Los_Angeles")
    
    # When: Client books 2 PM PST (5 PM EST)
    booking_request = {
        "barber_id": barber.id,
        "service_id": service.id,
        "date": "2025-01-15",
        "time": "14:00",  # PST
        "client_timezone": "America/Los_Angeles"
    }
    
    response = client.post("/api/v1/appointments", json=booking_request)
    
    # Then: Appointment stored in barber's timezone
    appointment = Appointment.get(response.json()["id"])
    assert appointment.start_time.hour == 17  # 5 PM EST
    
    # And: Client receives confirmation in their timezone
    sms_content = get_last_sms(client.phone)
    assert "2:00 PM PST" in sms_content
```

### **2. Payment Processing Test Scenarios**

#### **Scenario: Stripe Payment Processing**
```python
def test_stripe_payment_processing():
    """Test complete Stripe payment flow"""
    # Given: Client with valid payment method
    client = create_test_client()
    appointment = create_test_appointment(client=client, price=50.00)
    
    # When: Client pays for appointment
    payment_request = {
        "appointment_id": appointment.id,
        "payment_method_id": "pm_card_visa",  # Stripe test card
        "amount": 5000,  # $50.00 in cents
        "currency": "usd"
    }
    
    response = client.post("/api/v1/payments/process", json=payment_request)
    
    # Then: Payment should be processed
    assert response.status_code == 200
    payment = response.json()
    assert payment["status"] == "succeeded"
    
    # And: Appointment status updated
    updated_appointment = Appointment.get(appointment.id)
    assert updated_appointment.payment_status == "paid"
    assert updated_appointment.status == "confirmed"
```

#### **Scenario: Barber Payout Processing**
```python
def test_barber_payout_processing():
    """Test automated barber payout after service completion"""
    # Given: Completed and paid appointment
    barber = create_test_barber(commission_rate=0.70)  # 70% commission
    appointment = create_completed_appointment(
        barber=barber, 
        service_price=100.00,
        payment_status="paid"
    )
    
    # When: Daily payout processing runs
    response = admin_client.post("/api/v1/payouts/process-daily")
    
    # Then: Payout should be calculated correctly
    assert response.status_code == 200
    payout = Payout.filter(barber_id=barber.id).first()
    assert payout.amount == 70.00  # 70% of $100
    assert payout.status == "pending"
    
    # And: Stripe Connect transfer initiated
    stripe_transfer = get_stripe_transfer(payout.stripe_transfer_id)
    assert stripe_transfer.amount == 7000  # $70 in cents
```

### **3. Multi-Role User Scenarios**

#### **Scenario: Shop Owner Managing Multiple Barbers**
```python
def test_shop_owner_multi_barber_management():
    """Test shop owner managing multiple barbers"""
    # Given: Shop owner with multiple barbers
    shop_owner = create_test_user(role="SHOP_OWNER")
    shop = create_test_shop(owner=shop_owner)
    barber1 = create_test_barber(shop=shop)
    barber2 = create_test_barber(shop=shop)
    
    # When: Shop owner views dashboard
    response = client.get(
        "/api/v1/analytics/shop-dashboard",
        headers=auth_headers(shop_owner)
    )
    
    # Then: Should see aggregated data
    dashboard = response.json()
    assert len(dashboard["barbers"]) == 2
    assert dashboard["total_revenue"] >= 0
    assert "appointment_count" in dashboard
    
    # And: Can manage barber schedules
    schedule_update = {
        "barber_id": barber1.id,
        "working_hours": {
            "monday": {"start": "09:00", "end": "17:00"},
            "tuesday": {"start": "09:00", "end": "17:00"}
        }
    }
    
    response = client.put(
        f"/api/v1/barbers/{barber1.id}/schedule",
        json=schedule_update,
        headers=auth_headers(shop_owner)
    )
    assert response.status_code == 200
```

#### **Scenario: Enterprise Owner Multi-Location Management**
```python
def test_enterprise_owner_multi_location():
    """Test enterprise owner managing multiple shops"""
    # Given: Enterprise owner with multiple locations
    enterprise_owner = create_test_user(role="ENTERPRISE_OWNER")
    shop1 = create_test_shop(owner=enterprise_owner, name="Downtown Location")
    shop2 = create_test_shop(owner=enterprise_owner, name="Mall Location")
    
    # When: Enterprise owner views consolidated analytics
    response = client.get(
        "/api/v1/analytics/enterprise-dashboard",
        headers=auth_headers(enterprise_owner)
    )
    
    # Then: Should see all locations
    dashboard = response.json()
    assert len(dashboard["locations"]) == 2
    assert dashboard["total_locations_revenue"] >= 0
    
    # And: Can compare location performance
    comparison = dashboard["location_comparison"]
    assert shop1.name in [loc["name"] for loc in comparison]
    assert shop2.name in [loc["name"] for loc in comparison]
```

---

## 📱 **SMS/EMAIL NOTIFICATION TEST SCENARIOS**

#### **Scenario: Appointment Reminder Sequence**
```python
def test_appointment_reminder_sequence():
    """Test automated appointment reminder system"""
    # Given: Upcoming appointment
    appointment = create_appointment_in_future(hours=24)  # 24 hours from now
    client = appointment.client
    
    # When: Reminder job runs
    run_reminder_job()
    
    # Then: 24-hour reminder sent
    sms_24h = get_sms_by_template(client.phone, "24_hour_reminder")
    assert sms_24h is not None
    assert appointment.service.name in sms_24h.content
    
    # When: Time advances to 2 hours before
    advance_time(hours=22)
    run_reminder_job()
    
    # Then: 2-hour reminder sent
    sms_2h = get_sms_by_template(client.phone, "2_hour_reminder")
    assert sms_2h is not None
    assert "in 2 hours" in sms_2h.content
```

#### **Scenario: Cancellation and Rescheduling Notifications**
```python
def test_cancellation_rescheduling_notifications():
    """Test notifications for appointment changes"""
    # Given: Confirmed appointment
    appointment = create_confirmed_appointment()
    client = appointment.client
    barber = appointment.barber
    
    # When: Appointment is rescheduled
    reschedule_request = {
        "new_date": "2025-01-20",
        "new_time": "15:00",
        "reason": "Barber schedule change"
    }
    
    response = admin_client.put(
        f"/api/v1/appointments/{appointment.id}/reschedule",
        json=reschedule_request
    )
    
    # Then: Both parties notified
    client_sms = get_last_sms(client.phone)
    assert "rescheduled" in client_sms.content
    assert "Jan 20" in client_sms.content
    
    barber_notification = get_last_notification(barber.id)
    assert barber_notification.type == "appointment_rescheduled"
```

---

## 📅 **CALENDAR INTEGRATION TEST SCENARIOS**

#### **Scenario: Google Calendar Sync**
```python
def test_google_calendar_bidirectional_sync():
    """Test Google Calendar integration"""
    # Given: Barber with Google Calendar connected
    barber = create_test_barber()
    connect_google_calendar(barber, mock_calendar_service)
    
    # When: Appointment is booked
    appointment = create_test_appointment(barber=barber)
    
    # Then: Event created in Google Calendar
    calendar_events = mock_calendar_service.get_events(
        calendar_id=barber.google_calendar_id
    )
    booking_event = find_event_by_title(calendar_events, f"Appointment: {appointment.service.name}")
    assert booking_event is not None
    assert booking_event.start_time == appointment.start_time
    
    # When: Event is modified in Google Calendar
    mock_calendar_service.update_event(
        booking_event.id,
        {"start_time": appointment.start_time + timedelta(hours=1)}
    )
    
    trigger_calendar_sync()
    
    # Then: Appointment updated in system
    updated_appointment = Appointment.get(appointment.id)
    assert updated_appointment.start_time == appointment.start_time + timedelta(hours=1)
    
    # And: Client notified of change
    client_notification = get_last_sms(appointment.client.phone)
    assert "time changed" in client_notification.content
```

---

## 🔄 **BUSINESS WORKFLOW TEST SCENARIOS**

#### **Scenario: Peak Hour Booking Management**
```python
def test_peak_hour_booking_management():
    """Test system under peak booking load"""
    # Given: Popular barber during peak hours
    barber = create_test_barber(rating=4.9)
    peak_time_slots = generate_peak_time_slots("saturday", "10:00", "16:00")
    
    # When: Multiple clients try to book simultaneously
    booking_threads = []
    for i, time_slot in enumerate(peak_time_slots):
        thread = threading.Thread(
            target=attempt_booking,
            args=(create_test_client(f"client_{i}"), barber, time_slot)
        )
        booking_threads.append(thread)
    
    # Start all booking attempts simultaneously
    for thread in booking_threads:
        thread.start()
    
    # Wait for all threads to complete
    for thread in booking_threads:
        thread.join()
    
    # Then: No double bookings created
    saturday_appointments = Appointment.filter(
        barber_id=barber.id,
        date="2025-01-18"  # Assuming it's a Saturday
    ).all()
    
    time_slots_booked = set()
    for appointment in saturday_appointments:
        slot_key = f"{appointment.start_time}-{appointment.end_time}"
        assert slot_key not in time_slots_booked, "Double booking detected!"
        time_slots_booked.add(slot_key)
```

#### **Scenario: Service Package Booking**
```python
def test_service_package_booking():
    """Test booking service packages (multiple services)"""
    # Given: Barber offering package deal
    barber = create_test_barber()
    haircut = create_test_service("Haircut", duration=30, price=45)
    beard_trim = create_test_service("Beard Trim", duration=15, price=25)
    
    package = create_service_package(
        name="Haircut + Beard Package",
        services=[haircut, beard_trim],
        total_duration=45,
        package_price=60.00  # $10 discount
    )
    
    # When: Client books package
    booking_request = {
        "barber_id": barber.id,
        "package_id": package.id,
        "date": "2025-01-15",
        "time": "14:00"
    }
    
    response = client.post("/api/v1/appointments/package", json=booking_request)
    
    # Then: Single appointment with package details
    assert response.status_code == 201
    appointment = response.json()
    assert appointment["total_duration"] == 45
    assert appointment["total_price"] == 60.00
    assert len(appointment["services"]) == 2
    
    # And: Barber calendar blocked for full duration
    assert_barber_unavailable(barber.id, "2025-01-15", "14:00", "14:45")
```

---

## 📊 **SIX FIGURE BARBER METHODOLOGY TESTS**

#### **Scenario: Revenue Tracking and Analytics**
```python
def test_six_figure_revenue_tracking():
    """Test revenue tracking aligned with 6FB methodology"""
    # Given: Barber with various completed services
    barber = create_test_barber()
    
    # Create completed appointments with different service types
    premium_service = create_test_service("Premium Cut", price=85.00)
    standard_service = create_test_service("Standard Cut", price=45.00)
    addon_service = create_test_service("Styling", price=20.00)
    
    appointments = [
        create_completed_appointment(barber, premium_service, date="2025-01-01"),
        create_completed_appointment(barber, standard_service, date="2025-01-02"),
        create_completed_appointment(barber, addon_service, date="2025-01-02"),
        create_completed_appointment(barber, premium_service, date="2025-01-03")
    ]
    
    # When: Requesting 6FB analytics
    response = client.get(
        f"/api/v1/analytics/six-figure-metrics/{barber.id}",
        params={"month": "2025-01"}
    )
    
    # Then: Should return 6FB-specific metrics
    metrics = response.json()
    assert metrics["total_revenue"] == 235.00  # Sum of all services
    assert metrics["average_service_price"] == 58.75  # 235/4
    assert metrics["premium_service_ratio"] == 0.50  # 2 premium out of 4
    assert metrics["upsell_success_rate"] > 0  # Addon service counts as upsell
    
    # And: Progress toward six-figure goal
    assert "annual_projection" in metrics
    assert "six_figure_progress" in metrics
```

#### **Scenario: Client Lifetime Value Tracking**
```python
def test_client_lifetime_value_tracking():
    """Test CLV tracking for client relationship building"""
    # Given: Client with appointment history
    client = create_test_client()
    barber = create_test_barber()
    
    # Create appointment history over time
    appointments = [
        create_completed_appointment(client, barber, service_price=50.00, date="2024-12-01"),
        create_completed_appointment(client, barber, service_price=55.00, date="2024-12-15"),
        create_completed_appointment(client, barber, service_price=60.00, date="2025-01-01"),
        create_completed_appointment(client, barber, service_price=65.00, date="2025-01-15")
    ]
    
    # When: Calculating client lifetime value
    response = client.get(f"/api/v1/analytics/client-ltv/{client.id}")
    
    # Then: Should show increasing value trend
    ltv_data = response.json()
    assert ltv_data["total_spent"] == 230.00
    assert ltv_data["average_visit_value"] == 57.50
    assert ltv_data["visit_frequency_days"] <= 15  # Regular client
    assert ltv_data["value_trend"] == "increasing"  # Prices going up
    
    # And: Should suggest retention strategies
    assert "retention_suggestions" in ltv_data
```

---

## 🧪 **TESTING UTILITIES**

### **Test Data Factories**
```python
def create_test_client(**kwargs):
    """Create a test client with realistic data"""
    defaults = {
        "email": f"client_{uuid4()}@example.com",
        "phone": "+1555" + "".join(random.choices("0123456789", k=7)),
        "first_name": random.choice(["John", "Mike", "David", "Chris", "Alex"]),
        "last_name": random.choice(["Smith", "Johnson", "Williams", "Brown", "Davis"]),
        "preferences": {
            "reminder_preference": "sms",
            "preferred_appointment_time": "afternoon"
        }
    }
    return Client.create(**{**defaults, **kwargs})

def create_test_barber(**kwargs):
    """Create a test barber with realistic barbershop data"""
    defaults = {
        "email": f"barber_{uuid4()}@example.com",
        "first_name": random.choice(["Tony", "Mike", "Carlos", "James", "Marcus"]),
        "specialties": ["fade", "beard_trim", "scissor_cut"],
        "experience_years": random.randint(2, 15),
        "commission_rate": 0.70,  # 70% commission
        "working_hours": {
            "monday": {"start": "09:00", "end": "18:00"},
            "tuesday": {"start": "09:00", "end": "18:00"},
            "wednesday": {"start": "09:00", "end": "18:00"},
            "thursday": {"start": "09:00", "end": "19:00"},
            "friday": {"start": "09:00", "end": "19:00"},
            "saturday": {"start": "08:00", "end": "17:00"},
            "sunday": {"closed": True}
        }
    }
    return Barber.create(**{**defaults, **kwargs})

def create_test_service(name, **kwargs):
    """Create a test service with barbershop-specific details"""
    defaults = {
        "duration": 30,  # 30 minutes default
        "price": 45.00,
        "description": f"Professional {name.lower()} service",
        "category": "haircut"
    }
    return Service.create(name=name, **{**defaults, **kwargs})
```

### **Assertion Helpers**
```python
def assert_sms_sent(phone_number, expected_content):
    """Assert that SMS was sent with expected content"""
    sms_messages = get_test_sms_messages(phone_number)
    assert any(expected_content in msg.content for msg in sms_messages), \
           f"SMS with content '{expected_content}' not found for {phone_number}"

def assert_email_sent(email, template_name):
    """Assert that email was sent using specific template"""
    emails = get_test_emails(email)
    assert any(email.template == template_name for email in emails), \
           f"Email with template '{template_name}' not sent to {email}"

def assert_barber_unavailable(barber_id, date, start_time, end_time):
    """Assert that barber is unavailable during specified time"""
    available_slots = get_available_time_slots(barber_id, date)
    requested_slot = (start_time, end_time)
    assert requested_slot not in available_slots, \
           f"Barber {barber_id} should be unavailable {start_time}-{end_time}"
```

---

## 🚀 **INTEGRATION WITH EXISTING TESTING FRAMEWORK**

### **Usage with Testing Templates**
```python
# In your test files, import these scenarios:
from testing_templates.barbershop_booking_test_scenarios import (
    test_standard_appointment_booking,
    test_stripe_payment_processing,
    create_test_client,
    create_test_barber
)

# Customize for your specific test needs:
class TestAppointmentBooking:
    def test_my_specific_scenario(self):
        # Use the provided test factories
        client = create_test_client(preferred_barber="Tony")
        barber = create_test_barber(name="Tony", specialties=["fade"])
        
        # Follow the established patterns
        # ... your test implementation
```

### **Running Barbershop-Specific Tests**
```bash
# Run only barbershop booking tests
pytest tests/ -k "booking" -v

# Run payment-related tests
pytest tests/ -k "payment or stripe" -v

# Run multi-role tests
pytest tests/ -k "role or owner" -v

# Run Six Figure Barber methodology tests
pytest tests/ -k "six_figure or revenue or analytics" -v
```

---

**These scenarios provide comprehensive coverage of barbershop-specific functionality while integrating with the broader testing framework. Use them as templates for creating thorough, realistic tests that cover the unique aspects of the barbershop booking industry.**