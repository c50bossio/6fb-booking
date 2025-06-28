# Simple JWT Authentication for Backend-v2

## Overview
This is a simple JWT authentication implementation with:
- Standard JWT with HS256 algorithm
- 15-minute access tokens
- Password hashing with bcrypt
- Two endpoints: POST /auth/login and GET /auth/me
- Simple role field on User model (user/admin)

## Setup

1. **Install dependencies** (already in requirements.txt):
   ```bash
   pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose[cryptography] passlib[bcrypt] python-multipart
   ```

2. **Create admin user**:
   ```bash
   python create_admin_user.py
   ```
   This creates a user with:
   - Email: admin@6fb.com
   - Password: admin123
   - Role: admin

3. **Run the server**:
   ```bash
   uvicorn main:app --reload
   ```

## API Endpoints

### 1. Login - `POST /auth/login`
Authenticates a user and returns a JWT token.

**Request**:
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@6fb.com", "password": "admin123"}'
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2. Get Current User - `GET /auth/me`
Returns information about the authenticated user.

**Request**:
```bash
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response**:
```json
{
  "id": 1,
  "email": "admin@6fb.com",
  "name": "Admin User",
  "role": "admin",
  "created_at": "2024-01-01T00:00:00"
}
```

## Testing

Run the test script:
```bash
python test_auth.py
```

This will test:
- Unauthorized access (should return 403)
- Login with correct credentials
- Accessing protected endpoint with valid token

## Using Authentication in Other Endpoints

To protect any endpoint, add the `get_current_user` dependency:

```python
from utils.auth import get_current_user
from models import User

@app.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.name}! Your role is {current_user.role}"}
```

## Security Notes

1. **Change the secret key** in production! Update in `config.py` or use environment variables.
2. Tokens expire after 15 minutes
3. Passwords are hashed with bcrypt
4. No refresh tokens implemented (keeping it simple)
5. No password reset, email verification, or MFA