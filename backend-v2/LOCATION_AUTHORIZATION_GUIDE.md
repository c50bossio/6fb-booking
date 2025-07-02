# Location-Based Authorization System

This document describes the location-based authorization system implemented for the BookedBarber V2 application.

## Overview

The authorization system ensures that users can only access location-specific data they are authorized to see. This is crucial for multi-location businesses where barbers, managers, and owners should only access their assigned locations.

## Files Created/Modified

### New Files
- `utils/authorization.py` - Core authorization utilities and decorators

### Modified Files
- `routers/locations.py` - Applied location authorization to location management endpoints
- `routers/products.py` - Applied authorization to inventory, orders, and POS endpoints
- `routers/enterprise.py` - Applied authorization to analytics endpoints

## Core Components

### 1. `verify_location_access` Decorator

This decorator can be applied to FastAPI endpoints to automatically verify location access:

```python
from utils.authorization import verify_location_access

@router.get("/data/{location_id}")
@verify_location_access()
async def get_location_data(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Endpoint logic here
```

**Parameters:**
- `location_id_param`: Parameter name containing location ID (default: "location_id")
- `allow_admin`: Whether admins have access to all locations (default: True)
- `allow_owner`: Whether location owners have access (default: True) 
- `allow_manager`: Whether location managers have access (default: True)
- `check_primary_location`: Check user's primary location_id (default: True)
- `check_barber_locations`: Check barber_locations table (default: True)

### 2. `has_location_access` Function

Core function that checks if a user has access to a specific location:

```python
from utils.authorization import has_location_access

if has_location_access(user, location_id, db):
    # User has access
    pass
```

### 3. `get_user_locations` Function

Returns all location IDs a user has access to:

```python
from utils.authorization import get_user_locations

accessible_locations = get_user_locations(user, db)
```

### 4. `filter_by_user_locations` Function

Filters SQLAlchemy queries to only include user-accessible locations:

```python
from utils.authorization import filter_by_user_locations

query = db.query(Order)
filtered_query = filter_by_user_locations(query, Order, user, db)
```

## Access Control Logic

Users gain location access through multiple pathways:

1. **Role-based Access:**
   - `super_admin`: Access to all locations
   - `admin`: Access to all locations (configurable)

2. **Ownership Access:**
   - Location owners (owner_id field) have full access
   - Location managers (manager_id field) have access (configurable)

3. **Assignment Access:**
   - Users with location_id field matching the location
   - Barbers assigned through barber_locations table (many-to-many)

## Applied Endpoints

### Location Management (`/locations`)
- `GET /{location_id}` - View specific location (with authorization)
- `PUT /{location_id}` - Update location (owners/managers only)
- `DELETE /{location_id}` - Delete location (owners only)

### Product Management (`/products`)
- `GET /inventory/report?location_id=X` - Inventory reports
- `GET /orders?location_id=X` - Order listing
- `GET /pos/transactions?location_id=X` - POS transaction listing

### Enterprise Analytics (`/enterprise`)
- `GET /occupancy?location_id=X` - Chair utilization analytics

## Database Relationships

The system leverages these database relationships:

1. **Users Table:**
   - `location_id` (optional) - Primary location assignment

2. **BarbershopLocation Table:**
   - `owner_id` - Location owner
   - `manager_id` - Location manager

3. **BarberLocation Table:** (Many-to-many)
   - `barber_id` - User ID
   - `location_id` - Location ID
   - `is_active` - Whether assignment is active

## Usage Examples

### Basic Endpoint Protection

```python
@router.get("/commission/{location_id}")
@verify_location_access()
async def get_commission_data(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only users with access to location_id can reach this point
    return get_commission_data_for_location(location_id)
```

### Custom Access Control

```python
@router.put("/location/{location_id}/settings")
@verify_location_access(allow_manager=False)  # Only owners and admins
async def update_location_settings(
    location_id: int,
    settings: LocationSettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only location owners/admins can modify settings
    return update_settings(location_id, settings)
```

### Query Filtering

```python
@router.get("/my-orders")
async def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    # Filter to only show orders from user's accessible locations
    filtered_query = filter_by_user_locations(query, Order, current_user, db)
    return filtered_query.all()
```

## Security Features

1. **Automatic Authorization:** Decorator handles access checking automatically
2. **Multiple Access Paths:** Users can gain access through various legitimate means
3. **Flexible Configuration:** Each endpoint can customize authorization behavior
4. **Query Filtering:** Automatic filtering prevents data leakage
5. **Role Hierarchy:** Admins maintain system-wide access when needed

## Error Handling

When authorization fails, the system returns:
- **HTTP 403 Forbidden** with message: "You do not have access to location {location_id}"
- **HTTP 500 Internal Server Error** if required dependencies are missing

## Best Practices

1. Always use the decorator for location-specific endpoints
2. Apply appropriate access level restrictions (owner vs manager)
3. Use query filtering for list endpoints
4. Test with different user roles and location assignments
5. Document any custom authorization logic clearly

This authorization system provides comprehensive, flexible location-based access control while maintaining security and usability.