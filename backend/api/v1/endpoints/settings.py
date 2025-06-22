"""
Settings Management API Endpoints
Comprehensive settings system for enterprise booking calendar
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
import json

from config.database import get_db
from models.settings import (
    SettingsConfig,
    SettingsTemplate,
    UserPreferences,
    LocationSettings,
    NotificationSettings,
    AccessibilitySettings,
    IntegrationSettings,
    SettingsHistory,
    SettingsScope,
    SettingsCategory,
    ThemeMode,
    CalendarView,
    TimeFormat,
    DateFormat,
    DEFAULT_SETTINGS_TEMPLATES,
)
from models.user import User
from models.location import Location
from utils.auth import get_current_user, check_permission
from utils.encryption import encrypt_sensitive_field, decrypt_sensitive_field


router = APIRouter(prefix="/settings", tags=["settings"])


# Pydantic models for request/response
class SettingsTemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: str
    template_data: Dict[str, Any]
    is_system_template: bool
    usage_count: int
    version: str

    class Config:
        from_attributes = True


class SettingsConfigResponse(BaseModel):
    id: int
    scope: str
    scope_id: Optional[int]
    category: str
    setting_key: str
    setting_name: str
    description: Optional[str]
    setting_value: Any
    default_value: Optional[Any]
    data_type: str
    ui_component: Optional[str]
    ui_group: Optional[str]
    display_order: int
    is_advanced: bool
    is_user_configurable: bool

    class Config:
        from_attributes = True


class UserPreferencesResponse(BaseModel):
    user_id: int
    theme_mode: str
    theme_color: str
    font_size: str
    default_view: str
    show_weekends: bool
    time_format: str
    date_format: str
    timezone: str
    high_contrast_mode: bool
    desktop_notifications: bool
    keyboard_shortcuts: Dict[str, str]

    class Config:
        from_attributes = True


class LocationSettingsResponse(BaseModel):
    location_id: int
    business_hours: Dict[str, Any]
    booking_window: Dict[str, Any]
    default_slot_duration: int
    cancellation_policy: Dict[str, Any]
    payment_configuration: Dict[str, Any]
    automation_settings: Dict[str, Any]

    class Config:
        from_attributes = True


class SettingsUpdateRequest(BaseModel):
    setting_key: str
    setting_value: Any
    change_reason: Optional[str] = None


class BulkSettingsUpdateRequest(BaseModel):
    updates: List[SettingsUpdateRequest]
    apply_template: Optional[str] = None


class UserPreferencesUpdateRequest(BaseModel):
    theme_mode: Optional[str] = None
    theme_color: Optional[str] = None
    font_size: Optional[str] = None
    default_view: Optional[str] = None
    show_weekends: Optional[bool] = None
    time_format: Optional[str] = None
    date_format: Optional[str] = None
    timezone: Optional[str] = None
    high_contrast_mode: Optional[bool] = None
    desktop_notifications: Optional[bool] = None
    keyboard_shortcuts: Optional[Dict[str, str]] = None


# Settings Templates
@router.get("/templates", response_model=List[SettingsTemplateResponse])
async def get_settings_templates(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get available settings templates"""
    query = db.query(SettingsTemplate).filter(SettingsTemplate.is_active == True)

    if category:
        query = query.filter(SettingsTemplate.category == category)

    templates = query.order_by(SettingsTemplate.usage_count.desc()).all()
    return templates


@router.post("/templates/{template_id}/apply")
async def apply_settings_template(
    template_id: int,
    scope: SettingsScope,
    scope_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apply a settings template to a specific scope"""
    # Verify permission
    if scope == SettingsScope.LOCATION and not check_permission(
        current_user, "manage_locations"
    ):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    template = (
        db.query(SettingsTemplate)
        .filter(SettingsTemplate.id == template_id, SettingsTemplate.is_active == True)
        .first()
    )

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Apply template settings
    applied_count = 0
    for category_key, category_settings in template.template_data.items():
        if isinstance(category_settings, dict):
            for setting_key, setting_value in category_settings.items():
                # Create or update setting
                setting = (
                    db.query(SettingsConfig)
                    .filter(
                        SettingsConfig.scope == scope,
                        SettingsConfig.scope_id == scope_id,
                        SettingsConfig.setting_key == setting_key,
                    )
                    .first()
                )

                if setting:
                    old_value = setting.setting_value
                    setting.setting_value = setting_value

                    # Record history
                    history = SettingsHistory(
                        setting_id=setting.id,
                        old_value=old_value,
                        new_value=setting_value,
                        change_reason=f"Applied template: {template.name}",
                        changed_by_user_id=current_user.id,
                    )
                    db.add(history)
                else:
                    # Create new setting if it doesn't exist
                    setting = SettingsConfig(
                        scope=scope,
                        scope_id=scope_id,
                        category=SettingsCategory.BUSINESS_CONFIG,  # Default category
                        setting_key=setting_key,
                        setting_name=setting_key.replace("_", " ").title(),
                        setting_value=setting_value,
                        data_type=type(setting_value).__name__.lower(),
                    )
                    db.add(setting)

                applied_count += 1

    # Update template usage
    template.usage_count += 1
    template.last_used = func.now()

    db.commit()

    return {
        "message": f"Template '{template.name}' applied successfully",
        "settings_updated": applied_count,
    }


# Settings Configuration
@router.get("/config", response_model=List[SettingsConfigResponse])
async def get_settings_config(
    scope: SettingsScope,
    scope_id: Optional[int] = None,
    category: Optional[SettingsCategory] = None,
    include_advanced: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get settings configuration for a specific scope"""
    query = db.query(SettingsConfig).filter(
        SettingsConfig.scope == scope, SettingsConfig.is_active == True
    )

    if scope_id is not None:
        query = query.filter(SettingsConfig.scope_id == scope_id)

    if category:
        query = query.filter(SettingsConfig.category == category)

    if not include_advanced:
        query = query.filter(SettingsConfig.is_advanced == False)

    settings = query.order_by(
        SettingsConfig.ui_group,
        SettingsConfig.display_order,
        SettingsConfig.setting_name,
    ).all()

    return settings


@router.put("/config")
async def update_settings_config(
    scope: SettingsScope,
    scope_id: Optional[int] = None,
    updates: BulkSettingsUpdateRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update multiple settings in bulk"""
    # Verify permissions
    if scope == SettingsScope.LOCATION and not check_permission(
        current_user, "manage_locations"
    ):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    updated_count = 0
    errors = []

    for update in updates.updates:
        try:
            setting = (
                db.query(SettingsConfig)
                .filter(
                    SettingsConfig.scope == scope,
                    SettingsConfig.scope_id == scope_id,
                    SettingsConfig.setting_key == update.setting_key,
                    SettingsConfig.is_user_configurable == True,
                )
                .first()
            )

            if not setting:
                errors.append(
                    f"Setting '{update.setting_key}' not found or not configurable"
                )
                continue

            # Validate the new value based on data type and validation rules
            if not validate_setting_value(setting, update.setting_value):
                errors.append(f"Invalid value for setting '{update.setting_key}'")
                continue

            # Record history
            history = SettingsHistory(
                setting_id=setting.id,
                old_value=setting.setting_value,
                new_value=update.setting_value,
                change_reason=update.change_reason or "User update",
                changed_by_user_id=current_user.id,
            )
            db.add(history)

            # Update setting
            setting.setting_value = update.setting_value
            updated_count += 1

        except Exception as e:
            errors.append(f"Error updating '{update.setting_key}': {str(e)}")

    db.commit()

    return {"updated_count": updated_count, "errors": errors}


# User Preferences
@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_user_preferences(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get current user's preferences"""
    preferences = (
        db.query(UserPreferences)
        .filter(UserPreferences.user_id == current_user.id)
        .first()
    )

    if not preferences:
        # Create default preferences
        preferences = UserPreferences(user_id=current_user.id)
        db.add(preferences)
        db.commit()
        db.refresh(preferences)

    return preferences


@router.put("/preferences")
async def update_user_preferences(
    updates: UserPreferencesUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's preferences"""
    preferences = (
        db.query(UserPreferences)
        .filter(UserPreferences.user_id == current_user.id)
        .first()
    )

    if not preferences:
        preferences = UserPreferences(user_id=current_user.id)
        db.add(preferences)

    # Update only provided fields
    update_data = updates.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preferences, field, value)

    db.commit()
    return {"message": "Preferences updated successfully"}


# Location Settings
@router.get("/location/{location_id}", response_model=LocationSettingsResponse)
async def get_location_settings(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get settings for a specific location"""
    # Verify access to location
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    if (
        not check_permission(current_user, "view_location_data")
        and location_id not in current_user.accessible_locations
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    settings = (
        db.query(LocationSettings)
        .filter(LocationSettings.location_id == location_id)
        .first()
    )

    if not settings:
        # Create default settings
        settings = LocationSettings(location_id=location_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.put("/location/{location_id}")
async def update_location_settings(
    location_id: int,
    settings_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update settings for a specific location"""
    # Verify permissions
    if not check_permission(current_user, "manage_locations"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    settings = (
        db.query(LocationSettings)
        .filter(LocationSettings.location_id == location_id)
        .first()
    )

    if not settings:
        settings = LocationSettings(location_id=location_id)
        db.add(settings)

    # Update settings fields
    for field, value in settings_data.items():
        if hasattr(settings, field):
            setattr(settings, field, value)

    db.commit()
    return {"message": "Location settings updated successfully"}


# Notification Settings
@router.get("/notifications")
async def get_notification_settings(
    scope: SettingsScope,
    scope_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notification settings for a scope"""
    settings = (
        db.query(NotificationSettings)
        .filter(
            NotificationSettings.scope == scope,
            NotificationSettings.scope_id == scope_id,
        )
        .first()
    )

    if not settings:
        # Create default notification settings
        settings = NotificationSettings(scope=scope, scope_id=scope_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.put("/notifications")
async def update_notification_settings(
    scope: SettingsScope,
    scope_id: Optional[int] = None,
    settings_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update notification settings"""
    settings = (
        db.query(NotificationSettings)
        .filter(
            NotificationSettings.scope == scope,
            NotificationSettings.scope_id == scope_id,
        )
        .first()
    )

    if not settings:
        settings = NotificationSettings(scope=scope, scope_id=scope_id)
        db.add(settings)

    # Update settings fields
    for field, value in settings_data.items():
        if hasattr(settings, field):
            setattr(settings, field, value)

    db.commit()
    return {"message": "Notification settings updated successfully"}


# Accessibility Settings
@router.get("/accessibility", response_model=AccessibilitySettings)
async def get_accessibility_settings(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get accessibility settings for current user"""
    settings = (
        db.query(AccessibilitySettings)
        .filter(AccessibilitySettings.user_id == current_user.id)
        .first()
    )

    if not settings:
        settings = AccessibilitySettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.put("/accessibility")
async def update_accessibility_settings(
    settings_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update accessibility settings for current user"""
    settings = (
        db.query(AccessibilitySettings)
        .filter(AccessibilitySettings.user_id == current_user.id)
        .first()
    )

    if not settings:
        settings = AccessibilitySettings(user_id=current_user.id)
        db.add(settings)

    # Update settings fields
    for field, value in settings_data.items():
        if hasattr(settings, field):
            setattr(settings, field, value)

    db.commit()
    return {"message": "Accessibility settings updated successfully"}


# Integration Settings
@router.get("/integrations")
async def get_integration_settings(
    scope: SettingsScope,
    scope_id: Optional[int] = None,
    include_sensitive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get integration settings (sensitive data encrypted)"""
    if not check_permission(current_user, "manage_integrations"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    settings = (
        db.query(IntegrationSettings)
        .filter(
            IntegrationSettings.scope == scope, IntegrationSettings.scope_id == scope_id
        )
        .first()
    )

    if not settings:
        settings = IntegrationSettings(scope=scope, scope_id=scope_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    # Remove sensitive data unless specifically requested
    if not include_sensitive:
        settings_dict = settings.__dict__.copy()
        for key, value in settings_dict.items():
            if isinstance(value, dict):
                for subkey in value:
                    if any(
                        sensitive in subkey.lower()
                        for sensitive in ["secret", "key", "token", "password"]
                    ):
                        if value[subkey]:
                            value[subkey] = "***ENCRYPTED***"

    return settings


@router.put("/integrations")
async def update_integration_settings(
    scope: SettingsScope,
    scope_id: Optional[int] = None,
    settings_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update integration settings (encrypts sensitive data)"""
    if not check_permission(current_user, "manage_integrations"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    settings = (
        db.query(IntegrationSettings)
        .filter(
            IntegrationSettings.scope == scope, IntegrationSettings.scope_id == scope_id
        )
        .first()
    )

    if not settings:
        settings = IntegrationSettings(scope=scope, scope_id=scope_id)
        db.add(settings)

    # Encrypt sensitive fields before storing
    for field, value in settings_data.items():
        if hasattr(settings, field) and isinstance(value, dict):
            encrypted_value = {}
            for subkey, subvalue in value.items():
                if any(
                    sensitive in subkey.lower()
                    for sensitive in ["secret", "key", "token", "password"]
                ):
                    if subvalue and subvalue != "***ENCRYPTED***":
                        encrypted_value[subkey] = encrypt_sensitive_field(subvalue)
                    else:
                        # Keep existing encrypted value
                        existing_value = getattr(settings, field, {})
                        encrypted_value[subkey] = existing_value.get(subkey)
                else:
                    encrypted_value[subkey] = subvalue
            setattr(settings, field, encrypted_value)
        elif hasattr(settings, field):
            setattr(settings, field, value)

    db.commit()
    return {"message": "Integration settings updated successfully"}


# Settings History
@router.get("/history")
async def get_settings_history(
    setting_id: Optional[int] = Query(None),
    scope: Optional[SettingsScope] = Query(None),
    scope_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get settings change history"""
    if not check_permission(current_user, "view_audit_logs"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = db.query(SettingsHistory).join(SettingsConfig)

    if setting_id:
        query = query.filter(SettingsHistory.setting_id == setting_id)

    if scope:
        query = query.filter(SettingsConfig.scope == scope)

    if scope_id is not None:
        query = query.filter(SettingsConfig.scope_id == scope_id)

    history = query.order_by(SettingsHistory.created_at.desc()).limit(limit).all()

    return history


# Export/Import Settings
@router.get("/export")
async def export_settings(
    scope: SettingsScope,
    scope_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export settings configuration"""
    if not check_permission(current_user, "export_settings"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    settings = (
        db.query(SettingsConfig)
        .filter(
            SettingsConfig.scope == scope,
            SettingsConfig.scope_id == scope_id,
            SettingsConfig.is_active == True,
        )
        .all()
    )

    export_data = {
        "scope": scope.value,
        "scope_id": scope_id,
        "exported_at": func.now().isoformat(),
        "exported_by": current_user.email,
        "settings": [
            {
                "category": setting.category.value,
                "setting_key": setting.setting_key,
                "setting_value": setting.setting_value,
                "data_type": setting.data_type,
                "ui_group": setting.ui_group,
                "display_order": setting.display_order,
            }
            for setting in settings
        ],
    }

    return export_data


@router.post("/import")
async def import_settings(
    import_data: Dict[str, Any] = Body(...),
    overwrite_existing: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import settings configuration"""
    if not check_permission(current_user, "import_settings"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    scope = SettingsScope(import_data["scope"])
    scope_id = import_data.get("scope_id")

    imported_count = 0
    errors = []

    for setting_data in import_data.get("settings", []):
        try:
            existing_setting = (
                db.query(SettingsConfig)
                .filter(
                    SettingsConfig.scope == scope,
                    SettingsConfig.scope_id == scope_id,
                    SettingsConfig.setting_key == setting_data["setting_key"],
                )
                .first()
            )

            if existing_setting and not overwrite_existing:
                continue

            if existing_setting:
                # Update existing
                old_value = existing_setting.setting_value
                existing_setting.setting_value = setting_data["setting_value"]

                # Record history
                history = SettingsHistory(
                    setting_id=existing_setting.id,
                    old_value=old_value,
                    new_value=setting_data["setting_value"],
                    change_reason="Settings import",
                    changed_by_user_id=current_user.id,
                )
                db.add(history)
            else:
                # Create new
                new_setting = SettingsConfig(
                    scope=scope,
                    scope_id=scope_id,
                    category=SettingsCategory(setting_data["category"]),
                    setting_key=setting_data["setting_key"],
                    setting_name=setting_data["setting_key"].replace("_", " ").title(),
                    setting_value=setting_data["setting_value"],
                    data_type=setting_data["data_type"],
                    ui_group=setting_data.get("ui_group"),
                    display_order=setting_data.get("display_order", 0),
                )
                db.add(new_setting)

            imported_count += 1

        except Exception as e:
            errors.append(
                f"Error importing '{setting_data.get('setting_key', 'unknown')}': {str(e)}"
            )

    db.commit()

    return {"imported_count": imported_count, "errors": errors}


# Initialize default settings
@router.post("/initialize")
async def initialize_default_settings(
    scope: SettingsScope,
    scope_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Initialize default settings for a scope"""
    if not check_permission(current_user, "manage_settings"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Create default templates if they don't exist
    for template_data in DEFAULT_SETTINGS_TEMPLATES:
        existing = (
            db.query(SettingsTemplate)
            .filter(SettingsTemplate.name == template_data["name"])
            .first()
        )

        if not existing:
            template = SettingsTemplate(**template_data)
            db.add(template)

    # Initialize scope-specific settings based on scope type
    if scope == SettingsScope.USER and scope_id:
        # Initialize user preferences
        existing_prefs = (
            db.query(UserPreferences)
            .filter(UserPreferences.user_id == scope_id)
            .first()
        )

        if not existing_prefs:
            prefs = UserPreferences(user_id=scope_id)
            db.add(prefs)

    elif scope == SettingsScope.LOCATION and scope_id:
        # Initialize location settings
        existing_settings = (
            db.query(LocationSettings)
            .filter(LocationSettings.location_id == scope_id)
            .first()
        )

        if not existing_settings:
            settings = LocationSettings(location_id=scope_id)
            db.add(settings)

    db.commit()

    return {"message": f"Default settings initialized for {scope.value}"}


# Helper functions
def validate_setting_value(setting: SettingsConfig, value: Any) -> bool:
    """Validate a setting value against its data type and validation rules"""
    try:
        # Basic type validation
        if setting.data_type == "string" and not isinstance(value, str):
            return False
        elif setting.data_type == "number" and not isinstance(value, (int, float)):
            return False
        elif setting.data_type == "boolean" and not isinstance(value, bool):
            return False
        elif setting.data_type == "object" and not isinstance(value, dict):
            return False
        elif setting.data_type == "array" and not isinstance(value, list):
            return False

        # Validation rules (JSON Schema validation could be implemented here)
        if setting.validation_rules:
            # Implement JSON Schema validation
            pass

        # Options validation
        if setting.options and setting.data_type == "string":
            if value not in setting.options:
                return False

        return True

    except Exception:
        return False
