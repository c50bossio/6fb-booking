
import secrets
import bcrypt
import pyotp
import qrcode
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer
import redis
import logging

logger = logging.getLogger(__name__)

class EnhancedAuthSecurity:
    """Enhanced authentication and authorization security"""
    
    def __init__(self, redis_url: str = None):
        self.redis_client = redis.from_url(redis_url) if redis_url else None
        self.security = HTTPBearer()
        
        # Security configuration
        self.PASSWORD_SALT_ROUNDS = 14
        self.SESSION_TIMEOUT = 1800  # 30 minutes
        self.ABSOLUTE_TIMEOUT = 28800  # 8 hours
        self.MAX_FAILED_ATTEMPTS = 5
        self.LOCKOUT_DURATION = 1800  # 30 minutes
        
        # JWT configuration
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
        self.JWT_ALGORITHM = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES = 15
        self.REFRESH_TOKEN_EXPIRE_DAYS = 7
    
    def hash_password(self, password: str) -> str:
        """Hash password with bcrypt"""
        salt = bcrypt.gensalt(rounds=self.PASSWORD_SALT_ROUNDS)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate cryptographically secure token"""
        return secrets.token_urlsafe(length)
    
    def create_access_token(self, data: Dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        
        encoded_jwt = jwt.encode(to_encode, self.JWT_SECRET_KEY, algorithm=self.JWT_ALGORITHM)
        return encoded_jwt
    
    def create_refresh_token(self, data: Dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        
        encoded_jwt = jwt.encode(to_encode, self.JWT_SECRET_KEY, algorithm=self.JWT_ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Dict:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.JWT_SECRET_KEY, algorithms=[self.JWT_ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    def check_account_lockout(self, user_id: str) -> bool:
        """Check if account is locked out"""
        if not self.redis_client:
            return False
        
        lockout_key = f"lockout:{user_id}"
        lockout_data = self.redis_client.get(lockout_key)
        
        if lockout_data:
            lockout_info = json.loads(lockout_data)
            lockout_until = datetime.fromisoformat(lockout_info["until"])
            
            if datetime.utcnow() < lockout_until:
                return True
            else:
                # Lockout expired, remove it
                self.redis_client.delete(lockout_key)
        
        return False
    
    def record_failed_attempt(self, user_id: str) -> None:
        """Record failed login attempt"""
        if not self.redis_client:
            return
        
        attempts_key = f"failed_attempts:{user_id}"
        current_attempts = self.redis_client.get(attempts_key)
        current_attempts = int(current_attempts) if current_attempts else 0
        
        current_attempts += 1
        
        if current_attempts >= self.MAX_FAILED_ATTEMPTS:
            # Lock account
            lockout_key = f"lockout:{user_id}"
            lockout_until = datetime.utcnow() + timedelta(seconds=self.LOCKOUT_DURATION)
            
            lockout_data = {
                "until": lockout_until.isoformat(),
                "attempts": current_attempts
            }
            
            self.redis_client.setex(
                lockout_key,
                self.LOCKOUT_DURATION,
                json.dumps(lockout_data)
            )
            
            # Clear failed attempts counter
            self.redis_client.delete(attempts_key)
            
            logger.warning(f"Account {user_id} locked due to {current_attempts} failed attempts")
        else:
            # Increment failed attempts counter
            self.redis_client.setex(attempts_key, 3600, current_attempts)  # 1 hour expiry
    
    def clear_failed_attempts(self, user_id: str) -> None:
        """Clear failed login attempts after successful login"""
        if not self.redis_client:
            return
        
        attempts_key = f"failed_attempts:{user_id}"
        self.redis_client.delete(attempts_key)
    
    def setup_mfa(self, user_id: str, user_email: str) -> Dict:
        """Set up Multi-Factor Authentication"""
        secret = pyotp.random_base32()
        
        # Create TOTP URI
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name="BookedBarber"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        # Generate backup codes
        backup_codes = [self.generate_secure_token(8) for _ in range(10)]
        
        return {
            "secret": secret,
            "qr_code_uri": totp_uri,
            "backup_codes": backup_codes
        }
    
    def verify_mfa_token(self, secret: str, token: str) -> bool:
        """Verify MFA token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)
    
    def create_secure_session(self, user_id: str, user_data: Dict) -> Dict:
        """Create secure session with rotation"""
        session_id = self.generate_secure_token()
        
        session_data = {
            "user_id": user_id,
            "user_data": user_data,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
            "ip_address": None,  # Set by middleware
            "user_agent": None   # Set by middleware
        }
        
        if self.redis_client:
            self.redis_client.setex(
                f"session:{session_id}",
                self.SESSION_TIMEOUT,
                json.dumps(session_data, default=str)
            )
        
        return {
            "session_id": session_id,
            "expires_in": self.SESSION_TIMEOUT
        }
    
    def validate_session(self, session_id: str) -> Optional[Dict]:
        """Validate and refresh session"""
        if not self.redis_client:
            return None
        
        session_data = self.redis_client.get(f"session:{session_id}")
        if not session_data:
            return None
        
        session_info = json.loads(session_data)
        
        # Check absolute timeout
        created_at = datetime.fromisoformat(session_info["created_at"])
        if datetime.utcnow() - created_at > timedelta(seconds=self.ABSOLUTE_TIMEOUT):
            self.redis_client.delete(f"session:{session_id}")
            return None
        
        # Update last activity and refresh session
        session_info["last_activity"] = datetime.utcnow().isoformat()
        self.redis_client.setex(
            f"session:{session_id}",
            self.SESSION_TIMEOUT,
            json.dumps(session_info, default=str)
        )
        
        return session_info
