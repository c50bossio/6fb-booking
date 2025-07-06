from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional
import pytz
from datetime import datetime
import schemas
import models
from dependencies import get_current_user

router = APIRouter(prefix="/timezones", tags=["timezones"])

# Common timezones for quick selection
COMMON_TIMEZONES = [
    "UTC",
    "US/Eastern",
    "US/Central", 
    "US/Mountain",
    "US/Pacific",
    "US/Alaska",
    "US/Hawaii",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Dubai",
    "Australia/Sydney",
    "Australia/Melbourne",
    "Pacific/Auckland",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "America/Vancouver",
    "America/Mexico_City",
    "America/Sao_Paulo",
    "America/Buenos_Aires",
]

def get_timezone_info(tz_name: str) -> schemas.TimezoneInfo:
    """Get timezone information including current offset"""
    try:
        tz = pytz.timezone(tz_name)
        now = datetime.now(tz)
        offset = now.strftime('%z')
        
        # Format offset as +HH:MM or -HH:MM
        if offset:
            offset = f"{offset[:3]}:{offset[3:]}"
        else:
            offset = "+00:00"
        
        # Create display name
        display_name = tz_name.replace('_', ' ').replace('/', ' - ')
        
        # Add offset to display name
        display_name = f"{display_name} ({offset})"
        
        return schemas.TimezoneInfo(
            name=tz_name,
            offset=offset,
            display_name=display_name
        )
    except Exception:
        # Fallback for any timezone issues
        return schemas.TimezoneInfo(
            name=tz_name,
            offset="+00:00",
            display_name=tz_name
        )

@router.get("", response_model=schemas.TimezoneListResponse)
def list_all_timezones(
    search: Optional[str] = Query(None, description="Search timezones by name"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: models.User = Depends(get_current_user)
):
    """
    List all available timezones with search and pagination.
    Returns timezone names, current UTC offsets, and display names.
    """
    # Get all timezones
    all_timezones = list(pytz.all_timezones)
    
    # Apply search filter if provided
    if search:
        search_lower = search.lower()
        all_timezones = [
            tz for tz in all_timezones 
            if search_lower in tz.lower()
        ]
    
    # Sort timezones alphabetically
    all_timezones.sort()
    
    # Apply pagination
    total = len(all_timezones)
    paginated_timezones = all_timezones[offset:offset + limit]
    
    # Get timezone info for each
    timezone_infos = [get_timezone_info(tz) for tz in paginated_timezones]
    
    return schemas.TimezoneListResponse(
        timezones=timezone_infos,
        total=total
    )

@router.get("/common", response_model=schemas.TimezoneListResponse)
def list_common_timezones(
    current_user: models.User = Depends(get_current_user)
):
    """
    List commonly used timezones for quick selection.
    Includes major cities and regions.
    """
    # Get timezone info for common timezones
    timezone_infos = [get_timezone_info(tz) for tz in COMMON_TIMEZONES]
    
    # Sort by offset, then by name
    timezone_infos.sort(key=lambda x: (x.offset, x.name))
    
    return schemas.TimezoneListResponse(
        timezones=timezone_infos,
        total=len(timezone_infos)
    )

@router.get("/{timezone_name:path}", response_model=schemas.TimezoneInfo)
def get_timezone_details(
    timezone_name: str,
    current_user: models.User = Depends(get_current_user)
):
    """
    Get details for a specific timezone.
    Timezone name should be URL-encoded if it contains slashes (e.g., America%2FNew_York).
    """
    # Validate timezone exists
    if timezone_name not in pytz.all_timezones:
        # Try with underscores replaced by spaces (common mistake)
        alt_name = timezone_name.replace(' ', '_')
        if alt_name not in pytz.all_timezones:
            raise HTTPException(
                status_code=404,
                detail=f"Timezone '{timezone_name}' not found"
            )
        timezone_name = alt_name
    
    return get_timezone_info(timezone_name)