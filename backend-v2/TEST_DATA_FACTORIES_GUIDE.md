# Test Data Factories Guide

## Overview
Test data factories provide a consistent, maintainable way to create test data for the 6FB booking platform. They reduce boilerplate code, ensure data consistency, and make tests more readable and maintainable.

## Benefits

### 1. Consistency
- All test data follows the same patterns
- Default values are sensible and valid
- Relationships between models are properly maintained

### 2. Maintainability
- Central location for test data generation
- Easy to update when models change
- Reduces duplication across test files

### 3. Readability
- Tests focus on what's being tested, not data setup
- Clear intent with named factory methods
- Self-documenting test scenarios

### 4. Flexibility
- Override any default values as needed
- Create specific scenarios with helper methods
- Compose complex test scenarios easily

## Available Factories

### UserFactory
Creates User instances for authentication and authorization testing.

```python
# Basic user
user = UserFactory.create_user()

# Barber user
barber = UserFactory.create_barber(name="John Doe")

# Admin user
admin = UserFactory.create_admin()

# Custom user
custom_user = UserFactory.create_user(
    email="custom@example.com",
    role="user",
    is_active=False
)
```

### ClientFactory
Creates Client instances for customer management testing.

```python
# Basic client
client = ClientFactory.create_client()

# VIP client (high-value customer)
vip = ClientFactory.create_vip_client()

# At-risk client (needs attention)
at_risk = ClientFactory.create_at_risk_client()

# Custom client
client = ClientFactory.create_client(
    first_name="Jane",
    last_name="Smith",
    total_visits=5,
    customer_type="returning"
)
```

### AppointmentFactory
Creates Appointment instances for booking system testing.

```python
# Future appointment (scheduled)
appointment = AppointmentFactory.create_appointment()

# Completed appointment (past)
completed = AppointmentFactory.create_completed_appointment()

# No-show appointment
no_show = AppointmentFactory.create_no_show_appointment()

# Custom appointment
custom = AppointmentFactory.create_appointment(
    start_time=datetime.now(timezone.utc) + timedelta(hours=2),
    service_name="Premium Cut",
    price=55.0
)
```

### ServiceFactory
Creates Service instances for service management testing.

```python
# Basic service
service = ServiceFactory.create_service()

# Premium service (higher price/duration)
premium = ServiceFactory.create_premium_service()

# Custom service
custom = ServiceFactory.create_service(
    name="Beard Styling",
    category="addon",
    base_price=25.0,
    duration_minutes=20
)
```

### PaymentFactory
Creates Payment instances for payment processing testing.

```python
# Successful payment
payment = PaymentFactory.create_payment()

# Pending payment
pending = PaymentFactory.create_pending_payment()

# Failed payment
failed = PaymentFactory.create_failed_payment(
    failure_reason="Card expired"
)
```

### NotificationFactory
Creates notification-related instances for communication testing.

```python
# Email template
email_template = NotificationFactory.create_notification_template()

# SMS template
sms_template = NotificationFactory.create_notification_template(
    template_type="sms"
)

# User preferences
preferences = NotificationFactory.create_notification_preferences(
    sms_enabled=False,
    reminder_hours=[24, 2]
)
```

## Usage Patterns

### 1. Simple Test Data
Use factories with defaults when the specific values don't matter:

```python
def test_user_can_view_profile(db: Session):
    user = UserFactory.create_user()
    db.add(user)
    db.commit()
    
    # Test viewing profile...
```

### 2. Specific Scenarios
Override defaults when testing specific conditions:

```python
def test_vip_client_gets_priority(db: Session):
    vip_client = ClientFactory.create_vip_client(
        total_spent=1000.0,
        total_visits=20
    )
    regular_client = ClientFactory.create_client()
    
    # Test priority logic...
```

### 3. Related Data
Create complete scenarios with relationships:

```python
def test_appointment_workflow(db: Session):
    # Create all related entities
    barber = UserFactory.create_barber()
    client = ClientFactory.create_client()
    service = ServiceFactory.create_service()
    
    # Create appointment linking them
    appointment = AppointmentFactory.create_appointment(
        user_id=barber.id,
        client_id=client.id,
        service_id=service.id
    )
    
    db.add_all([barber, client, service, appointment])
    db.commit()
    
    # Test appointment workflow...
```

### 4. Bulk Creation
Create multiple instances efficiently:

```python
def test_analytics_with_multiple_appointments(db: Session):
    barber = UserFactory.create_barber()
    
    # Create 10 completed appointments
    appointments = [
        AppointmentFactory.create_completed_appointment(
            user_id=barber.id,
            start_time=datetime.now(timezone.utc) - timedelta(days=i)
        )
        for i in range(10)
    ]
    
    db.add_all([barber] + appointments)
    db.commit()
    
    # Test analytics calculations...
```

### 5. Full Integration Scenarios
Use the helper function for complete test setups:

```python
def test_complete_booking_flow(db: Session):
    # Creates barber, client, service, availability, and appointment
    scenario = create_full_test_scenario(db)
    
    barber = scenario['barber']
    client = scenario['client']
    appointment = scenario['appointment']
    
    # Test complete flow...
```

## Best Practices

### 1. Use Factories in Fixtures
Create reusable fixtures using factories:

```python
@pytest.fixture
def barber_with_availability(db: Session):
    barber = UserFactory.create_barber()
    availability = AvailabilityFactory.create_weekly_availability(barber.id)
    db.add_all([barber] + availability)
    db.commit()
    return barber
```

### 2. Keep Tests Focused
Only create the data you need for each test:

```python
# Good: Only creates what's needed
def test_client_email_validation():
    client = ClientFactory.create_client_schema(email="invalid-email")
    # Test validation...

# Avoid: Creating unnecessary data
def test_client_email_validation(db: Session):
    create_full_test_scenario(db)  # Too much for simple validation
    # Test validation...
```

### 3. Use Descriptive Variable Names
Make test intent clear with good naming:

```python
# Good: Clear intent
new_customer = ClientFactory.create_client()
loyal_customer = ClientFactory.create_vip_client()
inactive_customer = ClientFactory.create_at_risk_client()

# Avoid: Generic names
client1 = ClientFactory.create_client()
client2 = ClientFactory.create_client()
```

### 4. Maintain Test Isolation
Each test should create its own data:

```python
# Good: Isolated test data
def test_appointment_creation(db: Session):
    appointment = AppointmentFactory.create_appointment()
    db.add(appointment)
    db.commit()
    # Test...

# Avoid: Sharing data between tests
shared_client = ClientFactory.create_client()  # Don't do this at module level
```

### 5. Document Special Cases
Add comments when using non-obvious factory configurations:

```python
# Create client who hasn't visited in 6 months to test re-engagement
dormant_client = ClientFactory.create_client(
    last_visit_date=datetime.now(timezone.utc) - timedelta(days=180),
    customer_type="at_risk"
)
```

## Migration from Old Patterns

### Before (Without Factories):
```python
def test_appointment(db: Session):
    # Lots of boilerplate
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="$2b$12$...",
        role="barber",
        is_active=True
    )
    client = Client(
        first_name="Test",
        last_name="Client",
        email="client@example.com",
        # ... many more fields
    )
    # ... more setup
```

### After (With Factories):
```python
def test_appointment(db: Session):
    # Clean and focused
    barber = UserFactory.create_barber()
    client = ClientFactory.create_client()
    appointment = AppointmentFactory.create_appointment(
        user_id=barber.id,
        client_id=client.id
    )
```

## Extending Factories

To add new factory methods or customize existing ones:

1. Add to the appropriate factory class in `tests/factories.py`
2. Follow the existing naming patterns
3. Provide sensible defaults
4. Document any special behavior

Example:
```python
@classmethod
def create_holiday_service(cls, **kwargs):
    """Create a special holiday service with premium pricing."""
    kwargs.update({
        'name': kwargs.get('name', 'Holiday Special'),
        'category': 'premium',
        'base_price': kwargs.get('base_price', 85.0),
        'is_bookable_online': False  # In-person booking only
    })
    return cls.create_service(**kwargs)
```

## Troubleshooting

### Issue: Unique constraint violations
**Solution**: Factories use incrementing IDs and random values to avoid conflicts

### Issue: Missing relationships
**Solution**: Always create and save parent objects before referencing them

### Issue: Test data not persisting
**Solution**: Remember to add objects to session and commit:
```python
db.add(object)
db.commit()
```

### Issue: Datetime timezone issues
**Solution**: Factories use timezone-aware datetimes by default

## Summary

Test data factories are a powerful tool for creating maintainable, readable tests. They:
- Reduce boilerplate code
- Ensure consistency across tests
- Make tests more readable
- Simplify test maintenance
- Enable rapid test development

Start using factories in your tests today to improve test quality and developer productivity!