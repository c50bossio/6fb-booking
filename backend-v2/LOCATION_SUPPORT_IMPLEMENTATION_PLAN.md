# Location/Multi-Shop Support Implementation Plan

## Current State Analysis

### What's Already In Place:
1. **Organization Model** (`models/organization.py`):
   - Comprehensive organization hierarchy with parent/child relationships
   - Organization types: headquarters, location, franchise, independent
   - Address fields for each organization (street, city, state, zip, country)
   - Business hours and timezone support per organization
   - Billing plan and subscription management
   - Multi-location support via `parent_organization_id`

2. **Organization Router** (`routers/organizations.py`):
   - Complete CRUD operations for organizations
   - User-organization relationship management
   - Permissions and role management
   - Organization statistics and analytics

3. **Incomplete Location Router** (`routers/locations.py`):
   - Skeleton implementation referencing non-existent models
   - Needs to be refactored to use Organization model

## Implementation Strategy

Since the Organization model already has all the necessary fields for location support, we should:
1. **Use Organization model as the location entity** (no separate Location model needed)
2. **Refactor the locations router** to work with Organization model
3. **Add location-specific schemas**
4. **Enhance appointment booking** to be location-aware
5. **Update analytics** to support location filtering
6. **Add location selection** to the booking flow

## Tasks to Complete

### 1. Create Location-Specific Schemas
```python
# In schemas.py
class LocationResponse(BaseModel):
    """Response model for location (organization) data"""
    id: int
    name: str
    slug: str
    street_address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    country: str = 'US'
    phone: Optional[str]
    email: Optional[str]
    timezone: str
    business_hours: Optional[dict]
    chairs_count: int
    organization_type: str
    parent_organization_id: Optional[int]
    is_active: bool
    
class LocationListResponse(BaseModel):
    """Response for location list with metadata"""
    locations: List[LocationResponse]
    total: int
    has_multiple_locations: bool
```

### 2. Refactor Locations Router
- Remove references to non-existent BarbershopLocation model
- Use Organization model with location-specific filtering
- Add location-aware endpoints for appointments

### 3. Make Appointments Location-Aware
- Add `organization_id` to Appointment model (if not already present)
- Update appointment creation to accept location_id
- Filter appointments by location in queries
- Update availability checks to be location-specific

### 4. Enhance Barber-Location Relationships
- Barbers can work at multiple locations
- Availability per location
- Schedule management per location

### 5. Location-Aware Analytics
- Filter all analytics by location
- Aggregate analytics for multi-location enterprises
- Location comparison reports

### 6. Frontend Updates
- Location selector in booking flow
- Location switcher in dashboard
- Location-specific URLs/routes

## Benefits of Using Organization Model as Location

1. **No data duplication** - Organizations already have all location fields
2. **Built-in hierarchy** - Parent/child relationships for enterprises
3. **Existing permissions** - User-organization relationships already defined
4. **Billing integration** - Each location can have its own billing
5. **Less complexity** - One model instead of two

## Migration Path

For existing single-location users:
1. Their existing data continues to work (organization_type = 'independent')
2. No migration needed unless they want multi-location
3. Can upgrade to multi-location by creating child organizations

## Next Steps

1. Create location schemas
2. Refactor locations router to use Organization model
3. Add organization_id to appointments
4. Update booking flow to be location-aware
5. Test multi-location scenarios