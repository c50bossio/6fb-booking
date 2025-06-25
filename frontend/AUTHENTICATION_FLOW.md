# 6FB Authentication System Documentation

## API Endpoints

### 1. User Registration
- **Endpoint**: `POST /api/v1/auth/register`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123@",  // Must contain uppercase, lowercase, number, and special char
    "first_name": "First",
    "last_name": "Last",
    "role": "barber"  // Options: barber, admin, super_admin, mentor, staff
  }
  ```
- **Password Requirements**:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
  - Minimum length (appears to be 8 characters based on standard practice)

### 2. User Login (Form-based)
- **Endpoint**: `POST /api/v1/auth/token`
- **Content-Type**: `application/x-www-form-urlencoded`
- **Request Body**:
  ```
  username=user@example.com&password=Password123@
  ```
- **Response**: Returns JWT token

### 3. User Login (JSON)
- **Endpoint**: `POST /api/v1/auth/login`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123@"
  }
  ```
- **Response**: Returns user data with JWT token

### 4. Get Current User
- **Endpoint**: `GET /api/v1/auth/me`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response**: Returns current user details

### 5. Refresh Token
- **Endpoint**: `POST /api/v1/auth/refresh`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response**: Returns new JWT token

### 6. Logout
- **Endpoint**: `POST /api/v1/auth/logout`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`

## Rate Limiting
- The API has strict rate limiting on authentication endpoints
- After several failed attempts, you'll get a 429 error with message: "Rate limit exceeded for login requests. Please try again in X seconds."
- Rate limit appears to be around 2-4 minutes

## Test Users
Based on the seed scripts, these test users would exist in a development environment:
- `admin@6fb.com` / `password123` (super_admin)
- `mike.barber@6fb.com` / `password123` (barber)
- `sarah.barber@6fb.com` / `password123` (barber)

**Note**: These test users do NOT exist on the production system (https://sixfb-backend.onrender.com)

## Working Authentication Flow (TESTED AND CONFIRMED)

### Test Credentials Created
- **Email**: `testuser1@6fb.com`
- **Password**: `TestPass123@`
- **Role**: `barber`
- **User ID**: `6`

### 1. Register a New User (WORKING)
```bash
curl -X POST https://sixfb-backend.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser1@6fb.com",
    "password": "TestPass123@",
    "first_name": "Test",
    "last_name": "User",
    "role": "barber"
  }'
```

**Successful Response**:
```json
{
  "id": 6,
  "email": "testuser1@6fb.com",
  "first_name": "Test",
  "last_name": "User",
  "role": "barber",
  "is_active": true,
  "primary_location_id": null,
  "permissions": null,
  "created_at": "2025-06-25T04:12:34.676454Z"
}
```

### 2. Login to Get JWT Token (WORKING)
```bash
curl -X POST https://sixfb-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser1@6fb.com",
    "password": "TestPass123@"
  }'
```

**Successful Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 6,
    "email": "testuser1@6fb.com",
    "full_name": "Test User",
    "role": "barber",
    "permissions": [
      "appointments:manage_own",
      "clients:view_own",
      "analytics:view_own"
    ],
    "primary_location_id": null
  }
}
```

### 3. Use JWT Token for Authenticated Requests (WORKING)
```bash
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlcjFANmZiLmNvbSIsImV4cCI6MTc1MDkxMTE2OH0.xzMuxjVvbGI7l1ABeOex6wl-mM0Jof_-krOTX982jqQ"

curl -X GET https://sixfb-backend.onrender.com/api/v1/auth/me \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Successful Response**:
```json
{
  "id": 6,
  "email": "testuser1@6fb.com",
  "first_name": "Test",
  "last_name": "User",
  "role": "barber",
  "is_active": true,
  "primary_location_id": null,
  "permissions": null,
  "created_at": "2025-06-25T04:12:34.676454Z"
}
```

## Additional Notes
- The backend is deployed on Render at https://sixfb-backend.onrender.com
- API documentation is available at https://sixfb-backend.onrender.com/docs
- OpenAPI JSON spec at https://sixfb-backend.onrender.com/openapi.json
