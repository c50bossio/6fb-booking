# Query Optimization Guide

## Database Indexes

The following indexes have been added to improve query performance:

### User Queries
- `idx_users_email` - Fast user lookup by email (login)
- `idx_users_role` - Role-based filtering
- `idx_users_is_active` - Active user filtering
- `idx_users_primary_location_id` - Location-based user queries

### Appointment Queries
- `idx_appointments_barber_id` - Barber's appointments
- `idx_appointments_client_id` - Client's appointment history
- `idx_appointments_status` - Status filtering
- `idx_appointments_appointment_date` - Date range queries
- `idx_appointments_barber_date` - Composite index for barber schedule
- `idx_appointments_barber_status` - Composite index for barber's appointments by status

### Barber Queries
- `idx_barbers_user_id` - User to barber mapping
- `idx_barbers_location_id` - Location-based barber queries
- `idx_barbers_is_active` - Active barber filtering

### Client Queries
- `idx_clients_email` - Email search
- `idx_clients_phone` - Phone search
- `idx_clients_barber_id` - Barber's client list

### Analytics Queries
- Daily metrics: `idx_daily_metrics_barber_date`
- Weekly metrics: `idx_weekly_metrics_barber_week`
- Monthly metrics: `idx_monthly_metrics_barber_month`

## Query Optimization Best Practices

### 1. Use Indexed Columns in WHERE Clauses
```python
# Good - uses index
appointments = db.query(Appointment).filter(
    Appointment.barber_id == barber_id,
    Appointment.appointment_date >= start_date
).all()

# Bad - no index on notes
appointments = db.query(Appointment).filter(
    Appointment.notes.contains("urgent")
).all()
```

### 2. Use Eager Loading for Related Data
```python
# Good - single query with joins
appointments = db.query(Appointment).options(
    joinedload(Appointment.barber),
    joinedload(Appointment.client)
).filter(
    Appointment.appointment_date == today
).all()

# Bad - N+1 queries
appointments = db.query(Appointment).filter(
    Appointment.appointment_date == today
).all()
for appointment in appointments:
    print(appointment.barber.name)  # Additional query each time
```

### 3. Use Pagination for Large Result Sets
```python
# Good - limit results
appointments = db.query(Appointment).filter(
    Appointment.barber_id == barber_id
).offset(skip).limit(limit).all()

# Bad - loading all records
appointments = db.query(Appointment).filter(
    Appointment.barber_id == barber_id
).all()  # Could be thousands of records
```

### 4. Use Aggregation in Database
```python
# Good - aggregation in SQL
from sqlalchemy import func

revenue = db.query(
    func.sum(Appointment.total_revenue).label('total')
).filter(
    Appointment.barber_id == barber_id,
    Appointment.status == 'completed'
).scalar()

# Bad - aggregation in Python
appointments = db.query(Appointment).filter(
    Appointment.barber_id == barber_id,
    Appointment.status == 'completed'
).all()
revenue = sum(a.total_revenue for a in appointments)
```

### 5. Use Bulk Operations
```python
# Good - bulk insert
db.bulk_insert_mappings(Appointment, appointment_data)
db.commit()

# Bad - individual inserts
for data in appointment_data:
    appointment = Appointment(**data)
    db.add(appointment)
    db.commit()
```

### 6. Use Subqueries for Complex Filters
```python
# Good - subquery
barber_ids = db.query(Barber.id).filter(
    Barber.location_id == location_id
).subquery()

appointments = db.query(Appointment).filter(
    Appointment.barber_id.in_(barber_ids)
).all()

# Bad - loading all barbers first
barbers = db.query(Barber).filter(
    Barber.location_id == location_id
).all()
barber_ids = [b.id for b in barbers]
appointments = db.query(Appointment).filter(
    Appointment.barber_id.in_(barber_ids)
).all()
```

## Common Query Patterns

### Get Barber's Daily Schedule
```python
def get_barber_schedule(db: Session, barber_id: int, date: date):
    return db.query(Appointment).filter(
        Appointment.barber_id == barber_id,
        Appointment.appointment_date == date
    ).order_by(
        Appointment.appointment_time
    ).all()
```

### Get Location Analytics
```python
def get_location_analytics(db: Session, location_id: int, start_date: date, end_date: date):
    barber_ids = db.query(Barber.id).filter(
        Barber.location_id == location_id
    ).subquery()
    
    return db.query(
        func.count(Appointment.id).label('total_appointments'),
        func.sum(Appointment.total_revenue).label('total_revenue'),
        func.avg(Appointment.service_price).label('avg_ticket')
    ).filter(
        Appointment.barber_id.in_(barber_ids),
        Appointment.appointment_date.between(start_date, end_date),
        Appointment.status == 'completed'
    ).first()
```

### Search Clients
```python
def search_clients(db: Session, search_term: str, barber_id: Optional[int] = None):
    query = db.query(Client)
    
    # Use OR with indexed columns
    query = query.filter(
        or_(
            Client.email.ilike(f'%{search_term}%'),
            Client.phone.ilike(f'%{search_term}%')
        )
    )
    
    if barber_id:
        query = query.filter(Client.barber_id == barber_id)
    
    return query.limit(20).all()
```

## Monitoring Query Performance

### Enable Query Logging (Development)
```python
# In config/database.py
engine = create_engine(
    DATABASE_URL,
    echo=True  # Log all SQL queries
)
```

### Use EXPLAIN for Query Analysis
```python
# Check query execution plan
from sqlalchemy import text

result = db.execute(text("""
    EXPLAIN QUERY PLAN
    SELECT * FROM appointments
    WHERE barber_id = :barber_id
    AND appointment_date = :date
"""), {"barber_id": 1, "date": "2025-06-18"})

for row in result:
    print(row)
```

## Performance Monitoring

The application includes automatic performance monitoring:

1. **Slow Query Detection**: Queries taking longer than 1 second are logged to `logs/performance.log`
2. **API Response Times**: Available in the `X-Process-Time` header
3. **Request Logging**: All API requests are logged with duration in `logs/api.log`

## Regular Maintenance

1. **Run ANALYZE**: Update database statistics regularly
   ```bash
   python scripts/add_indexes.py
   ```

2. **Monitor Growth**: Check table sizes periodically
   ```sql
   SELECT name, COUNT(*) FROM sqlite_master 
   WHERE type='table' 
   GROUP BY name;
   ```

3. **Review Slow Queries**: Check performance logs weekly
   ```bash
   grep "Slow operation" logs/performance.log | tail -20
   ```