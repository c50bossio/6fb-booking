# Authentication Features Migration Priorities for V2

## Immediate Value Features (High Impact, Low Complexity)

### 1. **Refresh Token System** ⭐⭐⭐⭐⭐
- **Current Gap**: V2 only has short-lived access tokens (15 min)
- **Value**: Better UX (no frequent re-logins), improved security
- **Implementation Effort**: Low (2-3 hours)
- **Original Implementation**: Lines 173-183 in original auth.py

### 2. **Password Reset Flow** ⭐⭐⭐⭐⭐
- **Current Gap**: No way for users to recover accounts
- **Value**: Essential for production systems
- **Implementation Effort**: Medium (4-6 hours including email)
- **Original Implementation**: Lines 977-1024, 1173-1232

### 3. **Rate Limiting** ⭐⭐⭐⭐⭐
- **Current Gap**: No protection against brute force
- **Value**: Critical security feature
- **Implementation Effort**: Low (1-2 hours with slowapi)
- **Original Implementation**: Uses check_login_rate_limit()

### 4. **Cookie-based Auth with CSRF** ⭐⭐⭐⭐
- **Current Gap**: Only header-based auth
- **Value**: Better security, works with SSR
- **Implementation Effort**: Medium (3-4 hours)
- **Original Implementation**: utils/cookie_auth.py

### 5. **Login Session Management** ⭐⭐⭐⭐
- **Current Gap**: No last_login tracking or session info
- **Value**: Audit trail, security monitoring
- **Implementation Effort**: Low (1-2 hours)
- **Original Implementation**: Updates last_login on login

## High Value Features (Significant Enhancement)

### 6. **Token Blacklisting/Logout** ⭐⭐⭐⭐
- **Current Gap**: No proper logout mechanism
- **Value**: Security compliance, proper session termination
- **Implementation Effort**: Medium (3-4 hours)
- **Original Implementation**: services/token_blacklist_service.py

### 7. **Change Password Endpoint** ⭐⭐⭐⭐
- **Current Gap**: Users can't change passwords
- **Value**: Basic security hygiene
- **Implementation Effort**: Low (1-2 hours)
- **Original Implementation**: Lines 915-974

### 8. **User Registration Endpoint** ⭐⭐⭐⭐
- **Current Gap**: No self-registration
- **Value**: Enables user growth
- **Implementation Effort**: Low (2-3 hours)
- **Original Implementation**: Lines 400-514

### 9. **Email Verification** ⭐⭐⭐
- **Current Gap**: No email validation
- **Value**: Prevents fake accounts
- **Implementation Effort**: Medium (3-4 hours)
- **Original Implementation**: Part of registration flow

## Advanced Features (Nice to Have)

### 10. **Multi-Factor Authentication** ⭐⭐⭐
- **Current Gap**: Single factor only
- **Value**: Enterprise-grade security
- **Implementation Effort**: High (8-10 hours)
- **Original Implementation**: services/mfa_service.py, lines 669-804

### 11. **Magic Link Login** ⭐⭐⭐
- **Current Gap**: Password-only login
- **Value**: Improved UX, passwordless option
- **Implementation Effort**: Medium (4-5 hours)
- **Original Implementation**: Lines 1026-1171

### 12. **OAuth Providers** ⭐⭐
- **Current Gap**: No social login
- **Value**: Easier onboarding
- **Implementation Effort**: High (6-8 hours per provider)
- **Original Implementation**: Google Calendar OAuth example

## Quick Win Implementation Order

### Phase 1: Essential Security (1-2 days)
1. **Refresh Tokens** (2 hours)
   ```python
   # Add to auth.py
   def create_refresh_token(data: dict, expires_delta: timedelta = None):
       # 7-day refresh tokens
   ```

2. **Rate Limiting** (1 hour)
   ```python
   # Add slowapi to requirements.txt
   # Apply @limiter.limit("5/minute") to login
   ```

3. **Change Password** (1 hour)
   ```python
   @router.post("/change-password")
   async def change_password(old_password: str, new_password: str, ...):
   ```

4. **User Registration** (2 hours)
   ```python
   @router.post("/register")
   async def register(user_data: UserCreate, ...):
   ```

### Phase 2: Recovery & Management (1-2 days)
5. **Password Reset** (4 hours)
   - Email integration required
   - Token generation and validation

6. **Token Blacklisting** (3 hours)
   - In-memory for MVP, Redis later

7. **Cookie Auth** (3 hours)
   - httpOnly cookies
   - CSRF protection

### Phase 3: Enhanced Features (2-3 days)
8. **Session Management** (2 hours)
   - Track login times, devices

9. **Email Verification** (3 hours)
   - Verification tokens
   - Email templates

10. **MFA (Optional)** (8 hours)
    - TOTP implementation
    - QR codes, backup codes

## Minimal MVP Authentication (1 day)

If you need the absolute minimum for a secure v2:

1. **Refresh Tokens** - 2 hours
2. **Rate Limiting** - 1 hour  
3. **Password Reset** - 4 hours
4. **User Registration** - 2 hours

Total: ~9 hours for essential auth features

## Code Snippets to Migrate

### Refresh Token (from original)
```python
def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)  # 7 days default
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

### Password Validation (from original)
```python
def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    return True, "Password is strong"
```

### Rate Limiting (simplified)
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")
async def login(...):
    # existing login logic
```

## Dependencies to Add

```txt
# Add to requirements.txt
slowapi==0.1.9  # Rate limiting
python-multipart==0.0.6  # Form data support
email-validator==2.1.0.1  # Email validation (if not present)
pyotp==2.9.0  # Only if implementing MFA
qrcode==7.4.2  # Only if implementing MFA
```