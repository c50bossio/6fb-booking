"""
API Key management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from db import get_db
from dependencies import get_current_user
from models import User
from services.api_key_service import APIKeyService
from schemas_new.api_key import (
    APIKeyCreate, APIKeyResponse, APIKeyListResponse,
    APIKeyRevoke
)
from utils.audit_logger_bypass import get_audit_logger

router = APIRouter(
    prefix="/api-keys",
    tags=["api-keys"],
    dependencies=[Depends(get_current_user)]
)

audit_logger = get_audit_logger()

@router.post("", response_model=APIKeyResponse)
def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new API key.
    
    Only admins can create keys for other users.
    Regular users can only create keys for themselves.
    """
    # Check permissions
    if key_data.user_id and key_data.user_id != current_user.id:
        if current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to create API keys for other users"
            )
    
    user_id = key_data.user_id or current_user.id
    
    # Validate key type based on user role
    if key_data.key_type in ["internal", "partner"] and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not authorized to create {key_data.key_type} keys"
        )
    
    try:
        result = APIKeyService.create_api_key(
            user_id=user_id,
            name=key_data.name,
            key_type=key_data.key_type,
            permissions=key_data.permissions,
            expires_in_days=key_data.expires_in_days,
            metadata=key_data.metadata,
            db=db
        )
        
        return APIKeyResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create API key: {str(e)}"
        )

@router.get("", response_model=List[APIKeyListResponse])
def list_api_keys(
    include_revoked: bool = False,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List API keys.
    
    Users can list their own keys.
    Admins can list keys for any user.
    """
    # Determine which user's keys to list
    if user_id and user_id != current_user.id:
        if current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view other users' API keys"
            )
        target_user_id = user_id
    else:
        target_user_id = current_user.id
    
    keys = APIKeyService.list_api_keys(
        user_id=target_user_id,
        include_revoked=include_revoked,
        db=db
    )
    
    return [APIKeyListResponse(**key) for key in keys]

@router.post("/{key_id}/rotate", response_model=APIKeyResponse)
def rotate_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rotate an API key (revoke old, create new).
    
    Users can rotate their own keys.
    Admins can rotate any key.
    """
    try:
        # Verify ownership or admin status
        from models.api_key import APIKey
        existing_key = db.query(APIKey).filter(APIKey.id == key_id).first()
        
        if not existing_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        if existing_key.user_id != current_user.id and current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to rotate this API key"
            )
        
        result = APIKeyService.rotate_api_key(
            key_id=key_id,
            user_id=existing_key.user_id,
            db=db
        )
        
        return APIKeyResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rotate API key: {str(e)}"
        )

@router.post("/{key_id}/revoke")
def revoke_api_key(
    key_id: int,
    revoke_data: APIKeyRevoke,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke an API key.
    
    Users can revoke their own keys.
    Admins can revoke any key.
    """
    try:
        # Verify ownership or admin status
        from models.api_key import APIKey
        existing_key = db.query(APIKey).filter(APIKey.id == key_id).first()
        
        if not existing_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        if existing_key.user_id != current_user.id and current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to revoke this API key"
            )
        
        success = APIKeyService.revoke_api_key(
            key_id=key_id,
            user_id=existing_key.user_id,
            reason=revoke_data.reason,
            db=db
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to revoke API key"
            )
        
        return {"message": "API key revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke API key: {str(e)}"
        )

@router.get("/{key_id}", response_model=APIKeyListResponse)
def get_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific API key.
    
    Users can view their own keys.
    Admins can view any key.
    """
    from models.api_key import APIKey
    
    api_key = db.query(APIKey).filter(APIKey.id == key_id).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    if api_key.user_id != current_user.id and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this API key"
        )
    
    return APIKeyListResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        type=api_key.key_type,
        status=api_key.status.value,
        permissions=api_key.permissions,
        last_used_at=api_key.last_used_at,
        usage_count=api_key.usage_count,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
        revoked_at=api_key.revoked_at,
        revoked_reason=api_key.revoked_reason
    )

@router.get("/permissions/available")
def get_available_permissions(
    current_user: User = Depends(get_current_user)
):
    """
    Get list of available permissions for API keys.
    """
    # Define available permissions by category
    permissions = {
        "appointments": [
            "appointments:read",
            "appointments:write",
            "appointments:delete"
        ],
        "payments": [
            "payments:read",
            "payments:write",
            "payments:refund"
        ],
        "products": [
            "products:read",
            "products:write",
            "products:delete"
        ],
        "orders": [
            "orders:read",
            "orders:write",
            "orders:process"
        ],
        "inventory": [
            "inventory:read",
            "inventory:write",
            "inventory:adjust"
        ],
        "integrations": [
            "integrations:read",
            "integrations:write",
            "integrations:sync"
        ],
        "webhooks": [
            "webhook:receive",
            "webhook:send"
        ],
        "analytics": [
            "analytics:read",
            "reports:read",
            "reports:export"
        ],
        "admin": [
            "admin:users",
            "admin:settings",
            "admin:api_keys"
        ]
    }
    
    # Filter permissions based on user role
    if current_user.role not in ["admin", "super_admin"]:
        # Remove admin permissions for non-admin users
        permissions.pop("admin", None)
    
    return {
        "permissions": permissions,
        "wildcard_info": {
            "*": "All permissions",
            "category:*": "All permissions in a category (e.g., 'products:*')"
        }
    }