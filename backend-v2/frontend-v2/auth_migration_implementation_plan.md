# Authentication Migration Implementation Plan for V2

## Priority 1: Essential Security Features

### 1. Refresh Token System
**Why**: Improves security by limiting access token lifetime and enabling token rotation

**Implementation**:
```python
# Add to schemas.py
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

# Add to utils/auth.py
def create_refresh_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Add to routers/auth.py
@router.post("/refresh")
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    # Validate refresh token and issue new access token
```

### 2. Password Reset Flow
**Why**: Critical for user account recovery

**Implementation**:
```python
# Add to routers/auth.py
@router.post("/forgot-password")
async def forgot_password(email: EmailStr, db: Session = Depends(get_db)):
    # Generate reset token
    # Send email with reset link
    
@router.post("/reset-password")
async def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    # Validate token and update password
```

### 3. Cookie-based Authentication with CSRF
**Why**: More secure than localStorage, prevents XSS attacks

**Implementation**:
```python
# Add cookie utilities
def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # HTTPS only
        samesite="lax",
        max_age=1800  # 30 minutes
    )
    
# Update login endpoint to set cookies
```

### 4. Rate Limiting
**Why**: Prevents brute force attacks

**Implementation**:
```python
# Add to dependencies.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Apply to login endpoint
@router.post("/login")
@limiter.limit("5/minute")
async def login(...):
```

## Priority 2: Enhanced Security Features

### 5. Token Blacklisting
**Why**: Enables proper logout and token invalidation

**Implementation**:
```python
# Create services/token_blacklist.py
class TokenBlacklistService:
    def __init__(self):
        self.blacklist = set()  # Use Redis in production
        
    def blacklist_token(self, token: str, expiry: datetime):
        self.blacklist.add(token)
        
    def is_blacklisted(self, token: str) -> bool:
        return token in self.blacklist

# Update auth dependency to check blacklist
```

### 6. Multi-Factor Authentication (MFA)
**Why**: Significantly improves account security

**Implementation**:
```python
# Add to models
class UserMFA(Base):
    __tablename__ = "user_mfa"
    user_id: int
    secret: str
    backup_codes: JSON
    enabled: bool

# Add MFA endpoints
@router.post("/mfa/setup")
async def setup_mfa(current_user: User = Depends(get_current_user)):
    # Generate secret and QR code
    
@router.post("/mfa/verify")
async def verify_mfa(code: str, current_user: User = Depends(get_current_user)):
    # Verify TOTP code
```

### 7. Session Management
**Why**: Better control over user sessions

**Implementation**:
```python
# Add to models
class UserSession(Base):
    __tablename__ = "user_sessions"
    id: str
    user_id: int
    device_info: str
    ip_address: str
    created_at: datetime
    expires_at: datetime
    
# Track sessions on login
```

## Priority 3: User Experience Features

### 8. Magic Link Authentication
**Why**: Convenient passwordless login option

**Implementation**:
```python
@router.post("/magic-link")
async def send_magic_link(email: EmailStr, db: Session = Depends(get_db)):
    # Generate magic token
    # Send email with login link
    
@router.get("/magic-login")
async def magic_login(token: str, db: Session = Depends(get_db)):
    # Validate token and create session
```

## Implementation Timeline

### Week 1: Core Security
- Day 1-2: Refresh tokens + cookie auth
- Day 3-4: Password reset flow
- Day 5: Rate limiting + testing

### Week 2: Enhanced Security
- Day 1-2: Token blacklisting
- Day 3-5: MFA implementation

### Week 3: Polish & UX
- Day 1-2: Session management
- Day 3-4: Magic links
- Day 5: Testing & documentation

## Database Migrations Needed

```sql
-- Add MFA fields to users table
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN backup_codes JSON;

-- Create password reset tokens table
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

-- Create user sessions table
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    device_info TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);
```

## Required Dependencies

```txt
# Add to requirements.txt
pyotp==2.9.0  # For TOTP/MFA
qrcode==7.4.2  # For QR code generation
slowapi==0.1.9  # For rate limiting
python-multipart==0.0.6  # For form data
email-validator==2.1.0  # For email validation
```

## Frontend Changes Needed

1. **Auth Context Updates**: Handle refresh tokens
2. **Cookie Management**: Update API client for cookies
3. **MFA Components**: QR code display, code input
4. **Password Reset UI**: Reset request and confirmation forms
5. **Session Management UI**: Active sessions display

## Security Best Practices

1. Always use HTTPS in production
2. Set secure cookie flags appropriately
3. Implement proper CORS configuration
4. Use environment-specific settings
5. Log security events for monitoring
6. Regular token rotation
7. Implement account lockout after failed attempts

## Testing Strategy

1. **Unit Tests**: Each auth function
2. **Integration Tests**: Full auth flows
3. **Security Tests**: Rate limiting, token validation
4. **E2E Tests**: Complete user journeys
5. **Load Tests**: Performance under concurrent logins