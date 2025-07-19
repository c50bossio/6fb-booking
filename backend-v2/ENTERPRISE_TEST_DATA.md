# Enterprise Test Data Documentation

## Overview
The test data service now supports creating multi-location enterprise data for testing the enterprise dashboard and location management features.

## Usage

### API Endpoints

1. **Create test data with enterprise data**:
   ```bash
   POST /api/v2/test-data/create?include_enterprise=true
   ```

2. **Create only enterprise data** (if you already have test data):
   ```bash
   POST /api/v2/test-data/create-enterprise
   ```

3. **Refresh test data with enterprise**:
   ```bash
   POST /api/v2/test-data/refresh?include_enterprise=true
   ```

4. **Check test data status** (includes enterprise counts):
   ```bash
   GET /api/v2/test-data/status
   ```

### What Gets Created

When `include_enterprise=true` or using the enterprise-only endpoint:

1. **3 Barbershop Locations**:
   - Downtown Flagship (New York) - 8 chairs, commission model
   - Westside Branch (Los Angeles) - 6 chairs, booth rental model
   - Airport Express (Chicago) - 4 chairs, hybrid model

2. **Chair Inventory**:
   - Premium and standard chairs for each location
   - Chair assignments to barbers
   - Rental rates for booth rental locations

3. **Barber Assignments**:
   - Barbers distributed across locations
   - Some barbers work at multiple locations (20% chance)
   - Primary and secondary location assignments

4. **Compensation Plans**:
   - Commission-based for Downtown Flagship (20% platform fee)
   - Booth rental for Westside Branch ($250/week or $900/month)
   - Hybrid for Airport Express ($150 base + 10% commission after $2000)

5. **Location-Specific Data**:
   - Services with location-based pricing (20% premium at flagship, 50% at airport)
   - Appointments distributed across locations
   - Analytics for each location

### Example Usage in Code

```python
from services.test_data_service import create_test_data_for_user, create_enterprise_data

# Create everything including enterprise data
result = create_test_data_for_user(db, user_id, include_enterprise=True)

# Or create just enterprise data if you already have barbers/clients
enterprise_data = create_enterprise_data(db, user_id, barbers, clients, services)
```

### Deletion

Enterprise data is automatically deleted when running the delete test data endpoint. The deletion handles all dependencies properly:
- Compensation plans
- Chair assignments
- Barber locations
- Chair inventory
- Locations

## Notes

- The Appointment model needs a `location_id` field for full location tracking (currently commented out, pending migration)
- Location-specific service pricing is stored in memory (would need a proper table in production)
- Analytics are generated with mock data for client retention and new client rates