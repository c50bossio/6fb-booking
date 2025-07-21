# Barber Profile Testing Suite Documentation

This comprehensive testing suite validates the barber profile enhancement system for BookedBarber V2. The suite covers all aspects of the system from API endpoints to database migrations.

## 🎯 Test Coverage Overview

### Test Categories

| Category | Purpose | Test File | Coverage |
|----------|---------|-----------|-----------|
| **API Tests** | REST endpoint validation | `test_barber_profiles.py` | CRUD operations, authentication, validation |
| **Service Tests** | Business logic validation | `test_barber_profiles.py::TestBarberProfileService` | Service layer methods and logic |
| **Migration Tests** | Database schema validation | `test_barber_profile_migrations.py` | Schema creation, rollback, data integrity |
| **Integration Tests** | End-to-end workflows | `test_barber_profile_integration.py` | Complete user journeys |
| **Documentation Tests** | API documentation validation | `test_openapi_documentation.py` | OpenAPI/Swagger generation |

## 🚀 Quick Start

### Running All Tests
```bash
# From backend-v2 directory
python run_barber_profile_tests.py

# With verbose output
python run_barber_profile_tests.py --verbose

# Save detailed report
python run_barber_profile_tests.py --report
```

### Running Specific Categories
```bash
# API endpoint tests only
python run_barber_profile_tests.py --category api

# Service layer tests only  
python run_barber_profile_tests.py --category service

# Database migration tests only
python run_barber_profile_tests.py --category migration

# Integration tests only
python run_barber_profile_tests.py --category integration

# Documentation tests only
python run_barber_profile_tests.py --category documentation
```

### Running Individual Test Files
```bash
# Run specific test file
pytest tests/test_barber_profiles.py -v

# Run specific test class
pytest tests/test_barber_profiles.py::TestBarberProfileAPI -v

# Run specific test method
pytest tests/test_barber_profiles.py::TestBarberProfileAPI::test_create_barber_profile_success -v
```

## 📋 Detailed Test Documentation

### 1. API Endpoint Tests (`test_barber_profiles.py`)

#### TestBarberProfileAPI
- **Profile Creation**: Tests successful creation, validation, duplicate prevention
- **Profile Retrieval**: Tests getting profiles by ID, with user data, not found scenarios
- **Profile Updates**: Tests partial updates, authorization, admin privileges
- **Profile Deletion**: Tests soft delete functionality
- **Profile Listing**: Tests pagination, filtering, search functionality
- **Statistics**: Tests admin-only profile statistics endpoint

#### TestBarberProfileImageUpload
- **Image Upload**: Tests successful image upload with validation
- **File Validation**: Tests file type restrictions, size limits, content validation
- **Error Handling**: Tests invalid file types, oversized files

#### TestBarberProfileValidation
- **Schema Validation**: Tests Pydantic schema validation rules
- **Field Constraints**: Tests bio length, experience range, URL format validation
- **List Validation**: Tests specialties and certifications array validation

#### TestBarberProfilePermissions
- **Authentication**: Tests that endpoints require proper authentication
- **Authorization**: Tests role-based access control
- **Cross-User Access**: Tests that users cannot access others' profiles without permission

### 2. Service Layer Tests

#### TestBarberProfileService
- **CRUD Operations**: Tests service layer methods for create, read, update, delete
- **Business Logic**: Tests Instagram handle cleaning, authorization checks
- **Data Validation**: Tests service-level validation and error handling
- **Statistics**: Tests profile statistics calculation

### 3. Database Migration Tests (`test_barber_profile_migrations.py`)

#### TestBarberProfileMigrations
- **Migration Application**: Tests that migrations apply successfully
- **Table Creation**: Verifies correct table structure, columns, data types
- **Index Creation**: Verifies all required indexes are created
- **Constraint Validation**: Tests foreign keys, unique constraints
- **Rollback Functionality**: Tests that migrations can be rolled back
- **Data Integrity**: Tests that existing data is preserved during migrations
- **JSON Field Support**: Tests that JSON fields work correctly

### 4. Integration Tests (`test_barber_profile_integration.py`)

#### TestBarberProfileEndToEndIntegration
- **Complete Workflows**: Tests full user journeys from creation to deletion
- **Multi-User Scenarios**: Tests multiple users operating simultaneously
- **Admin Operations**: Tests bulk operations and administrative tasks
- **Search and Filtering**: Tests comprehensive search functionality
- **Performance**: Tests system behavior under concurrent load
- **Error Propagation**: Tests error handling across all system layers

#### TestBarberProfileDataConsistency
- **Relationship Integrity**: Tests user-profile relationship consistency
- **Transaction Safety**: Tests rollback on errors

### 5. Documentation Tests (`test_openapi_documentation.py`)

#### TestOpenAPIDocumentation
- **Schema Generation**: Tests that OpenAPI schema is generated correctly
- **Endpoint Documentation**: Verifies all endpoints are documented
- **Schema Documentation**: Verifies request/response schemas are complete
- **Validation Rules**: Tests that validation rules are documented
- **Error Responses**: Tests that error responses are documented
- **UI Accessibility**: Tests Swagger UI and ReDoc accessibility

## 🛠️ Test Infrastructure

### Test Database
- Uses in-memory SQLite for fast, isolated tests
- Each test gets a fresh database to ensure isolation
- Automatic cleanup after each test

### Test Fixtures
- **Database fixtures**: Provide clean database sessions
- **User fixtures**: Create test users with different roles
- **Authentication fixtures**: Provide auth headers for API calls
- **Data fixtures**: Provide sample profile data for testing

### Mock Services
- **Notification Service**: Mocked to prevent actual email/SMS sending
- **File Storage**: Mocked for image upload tests
- **External APIs**: Mocked to ensure test isolation

## 📊 Test Execution Patterns

### Test Isolation
- Each test method gets fresh database
- No shared state between tests
- Automatic cleanup of resources

### Async Testing
- Uses `pytest-asyncio` for async test support
- Proper async client handling
- Concurrent operation testing

### Error Testing
- Comprehensive error scenario coverage
- Validation error testing
- Authorization error testing
- System error handling

## 🔧 Configuration

### Environment Variables
- `TESTING=true`: Enables test mode
- `COVERAGE=true`: Enables coverage reporting
- Database URL automatically set for testing

### Dependencies
Required packages for testing:
- `pytest`: Test framework
- `pytest-asyncio`: Async test support
- `httpx`: Async HTTP client for API testing
- `PIL`: Image processing for upload tests

## 📈 Coverage Goals

| Component | Target Coverage | Status |
|-----------|----------------|---------|
| API Endpoints | 95%+ | ✅ Complete |
| Service Layer | 90%+ | ✅ Complete |
| Database Models | 85%+ | ✅ Complete |
| Error Handling | 95%+ | ✅ Complete |
| Integration Paths | 80%+ | ✅ Complete |

## 🐛 Debugging Test Failures

### Common Issues and Solutions

1. **Database Connection Issues**
   ```bash
   # Ensure you're in the right directory
   cd backend-v2
   
   # Check database configuration
   pytest tests/test_barber_profiles.py::TestBarberProfileService::test_create_profile_success -v -s
   ```

2. **Authentication Errors**
   ```bash
   # Test authentication directly
   pytest tests/test_barber_profiles.py::TestBarberProfileAPI::test_create_profile_unauthorized -v
   ```

3. **Migration Issues**
   ```bash
   # Test migration rollback
   pytest tests/test_barber_profile_migrations.py::TestBarberProfileMigrations::test_migration_rollback_functionality -v
   ```

4. **Performance Issues**
   ```bash
   # Run performance-specific tests
   pytest tests/test_barber_profile_integration.py::TestBarberProfileEndToEndIntegration::test_performance_under_load -v
   ```

### Debug Mode
```bash
# Run with full output
python run_barber_profile_tests.py --verbose

# Run single test with debug info
pytest tests/test_barber_profiles.py::test_name -v -s --tb=long
```

## 📋 Pre-Deployment Checklist

Before deploying the barber profile system:

- [ ] All API tests pass (100% success rate)
- [ ] All service layer tests pass
- [ ] Database migrations apply and rollback successfully
- [ ] Integration tests demonstrate working end-to-end flows
- [ ] Documentation is properly generated
- [ ] Performance tests show acceptable response times
- [ ] Error handling works across all layers
- [ ] Authentication and authorization function correctly

## 🔄 Continuous Integration

### Test Automation
The testing suite is designed for CI/CD integration:

```yaml
# Example GitHub Actions step
- name: Run Barber Profile Tests
  run: |
    cd backend-v2
    python run_barber_profile_tests.py --report
  env:
    TESTING: true
```

### Test Reports
- JSON reports generated for CI integration
- Coverage reports available with `COVERAGE=true`
- Performance metrics tracked

## 📚 Additional Resources

- **API Documentation**: Available at `/docs` when server is running
- **Database Schema**: See `alembic/versions/` for migration files
- **Service Documentation**: See docstrings in `services/barber_profile_service.py`
- **Model Documentation**: See `models.py` for database model definitions

## 🤝 Contributing to Tests

When adding new features to the barber profile system:

1. **Add API tests** for new endpoints
2. **Add service tests** for new business logic
3. **Update integration tests** for new workflows
4. **Add migration tests** for schema changes
5. **Update documentation tests** for API changes

### Test Writing Guidelines
- Use descriptive test names that explain the scenario
- Include docstrings explaining test purpose
- Test both success and failure scenarios
- Use appropriate fixtures for setup
- Keep tests isolated and independent