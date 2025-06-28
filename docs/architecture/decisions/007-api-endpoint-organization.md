# 007. API Endpoint Organization

Date: 2025-06-28

## Status

Accepted

## Context

API endpoints were organized inconsistently:
- Mixed naming conventions: `/getUser`, `/users/list`, `/user-info`
- Unclear resource boundaries
- Actions mixed with resources: `/bookAppointment`, `/appointments/book`
- Version confusion: Some endpoints versioned, others not
- Duplicate endpoints serving similar purposes

This led to:
- Difficult API discovery
- Inconsistent client code
- Maintenance challenges
- Poor API documentation

## Decision

We adopt strict RESTful API organization:

1. **Resource-Based URLs**:
```
/api/v1/users          # User collection
/api/v1/users/{id}     # Specific user
/api/v1/appointments   # Appointment collection
/api/v1/appointments/{id}  # Specific appointment
```

2. **HTTP Methods for Actions**:
```
GET    /api/v1/appointments      # List appointments
POST   /api/v1/appointments      # Create appointment
GET    /api/v1/appointments/{id} # Get specific appointment
PUT    /api/v1/appointments/{id} # Update appointment
DELETE /api/v1/appointments/{id} # Cancel appointment
```

3. **Nested Resources When Logical**:
```
/api/v1/barbers/{id}/appointments    # Barber's appointments
/api/v1/barbers/{id}/availability    # Barber's availability
```

4. **Actions as Sub-resources**:
```
POST /api/v1/appointments/{id}/confirm   # Confirm appointment
POST /api/v1/appointments/{id}/cancel    # Cancel appointment
```

5. **Consistent Versioning**:
- All endpoints under `/api/v1/`
- Version in URL, not headers
- Clear deprecation strategy

## Consequences

### Positive
- Predictable API structure
- Self-documenting URLs
- Standard HTTP semantics
- Better caching strategies
- Easier client generation

### Negative
- Some actions don't fit REST perfectly
- Migration effort for existing endpoints
- May require multiple requests for complex operations

### Neutral
- Clients need to understand REST conventions
- Some business logic moves to orchestration layer

## References

- REST API Design: https://restfulapi.net/
- HTTP API Design Guide: https://github.com/interagent/http-api-design
- Microsoft REST Guidelines: https://github.com/Microsoft/api-guidelines
