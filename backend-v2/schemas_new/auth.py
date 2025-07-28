"""
Authentication schemas for BookedBarber V2.
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class UserLogin(BaseModel):
    """Schema for user login request."""
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    """Schema for user registration request."""
    email: EmailStr
    password: str
    name: str
    role: str = "client"

class Token(BaseModel):
    """Schema for token response."""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"

class TokenRefresh(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str

class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str

class PasswordResetRequest(BaseModel):
    """Schema for password reset request."""
    email: EmailStr

class PasswordReset(BaseModel):
    """Schema for password reset."""
    token: str
    new_password: str

class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    email: str
    name: str
    role: str
    is_active: bool

    model_config = ConfigDict(
        from_attributes = True
)

class UserCreate(BaseModel):
    """Schema for user creation."""
    email: EmailStr
    password: str
    name: str
    role: str = "client"

class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation."""
    token: str
    new_password: str

class PasswordResetResponse(BaseModel):
    """Schema for password reset response."""
    message: str
    detail: Optional[str] = None

class User(BaseModel):
    """Schema for user data."""
    id: int
    email: str
    name: str
    role: str = "client"
    is_active: bool = True

    model_config = ConfigDict(
        from_attributes = True
)

class RegistrationResponse(BaseModel):
    """Schema for registration response."""
    message: str
    user: User

class ChangePasswordRequest(BaseModel):
    """Schema for change password request."""
    current_password: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    """Schema for change password request."""
    current_password: str
    new_password: str

class ChangePasswordResponse(BaseModel):
    """Schema for change password response."""
    message: str

class TimezoneUpdateRequest(BaseModel):
    """Schema for timezone update request.""" 
    timezone: str

class TimezoneUpdateResponse(BaseModel):
    """Schema for timezone update response."""
    message: str