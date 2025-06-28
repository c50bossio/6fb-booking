# 008. Database Client Model

Date: 2025-06-28

## Status

Accepted

## Context

The database had evolved to have multiple representations of clients/customers:
- `Client` model for barber's clients
- `Customer` model for payment processing
- `User` model with `role='client'`
- `BookingGuest` for non-registered bookings

This duplication caused:
- Data synchronization issues
- Unclear which model to use
- Complex joins and queries
- Inconsistent client information
- Migration difficulties

## Decision

We will use a single `Client` model for all client-related data:

1. **Single Client Model**:
```python
class Client(Base):
    __tablename__ = "clients"
    
    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: str
    
    # Relations
    user_id: Optional[UUID]  # Link to User if registered
    appointments: List[Appointment]
    payments: List[Payment]
```

2. **User Relationship**:
   - Clients can exist without user accounts (guest bookings)
   - Registered clients link to User model
   - User model handles authentication only

3. **Data Migration**:
   - Merge existing Customer data into Client
   - Update foreign keys in related tables
   - Remove deprecated models

4. **Booking Flow**:
   - Guest bookings create Client record
   - Registration links Client to new User
   - Existing users auto-link to Client

## Consequences

### Positive
- Single source of truth for client data
- Simplified queries and joins
- Consistent client information
- Easier reporting and analytics
- Clear separation of concerns

### Negative
- Complex data migration required
- Need to update all client references
- Temporary backwards compatibility layer

### Neutral
- Guest and registered clients in same table
- Client exists independent of User

## References

- Database Normalization: https://en.wikipedia.org/wiki/Database_normalization
- Domain-Driven Design: https://martinfowler.com/tags/domain%20driven%20design.html
- PostgreSQL Best Practices: https://wiki.postgresql.org/wiki/Don%27t_Do_This