"""
Pydantic schemas for API key management.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class APIKeyCreate(BaseModel):
    """Schema for creating a new API key."""
    name: str = Field(..., min_length=1, max_length=255, description="Name for the API key")
    key_type: str = Field(..., description="Type of key: webhook, integration, internal, partner, test")
    permissions: List[str] = Field(..., min_items=1, description="List of permissions for the key")
    expires_in_days: Optional[int] = Field(None, gt=0, le=3650, description="Days until expiration (max 10 years)")
    user_id: Optional[int] = Field(None, description="User ID (admin only)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    @validator('key_type')
    def validate_key_type(cls, v):
        valid_types = ["webhook", "integration", "internal", "partner", "test"]
        if v not in valid_types:
            raise ValueError(f"Invalid key type. Must be one of: {', '.join(valid_types)}")
        return v
    
    @validator('permissions')
    def validate_permissions(cls, v):
        # Basic permission format validation
        for perm in v:
            if not perm or not isinstance(perm, str):
                raise ValueError("Invalid permission format")
            
            # Check format (should be category:action or wildcard)
            if perm not in ["*"] and ":" not in perm:
                raise ValueError(f"Invalid permission format: {perm}. Use 'category:action' format.")
        
        return v


class APIKeyResponse(BaseModel):
    """Schema for API key creation response."""
    id: int
    key: str = Field(..., description="The actual API key (only shown once)")
    name: str
    type: str
    permissions: List[str]
    expires_at: Optional[datetime]
    created_at: datetime
    message: str = Field(..., description="Important message about key storage")
    
    class Config:
        from_attributes = True


class APIKeyListResponse(BaseModel):
    """Schema for API key list response (no actual key shown)."""
    id: int
    name: str
    key_prefix: str = Field(..., description="Key prefix for identification")
    type: str
    status: str
    permissions: List[str]
    last_used_at: Optional[datetime]
    usage_count: int
    expires_at: Optional[datetime]
    created_at: datetime
    revoked_at: Optional[datetime]
    revoked_reason: Optional[str]
    
    class Config:
        from_attributes = True


class APIKeyRotate(BaseModel):
    """Schema for API key rotation request."""
    # No additional fields needed - key_id is in URL


class APIKeyRevoke(BaseModel):
    """Schema for API key revocation request."""
    reason: str = Field(..., min_length=1, max_length=500, description="Reason for revocation")


class APIKeyValidation(BaseModel):
    """Schema for API key validation response."""
    valid: bool
    key_id: Optional[int]
    user_id: Optional[int]
    permissions: Optional[List[str]]
    metadata: Optional[Dict[str, Any]]
    error: Optional[str]