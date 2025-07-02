"""
Test Data API Router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from database import get_db
from dependencies import get_current_user
from services import test_data_service
import models
import schemas

router = APIRouter(
    prefix="/test-data",
    tags=["test-data"]
)

@router.post("/create", response_model=Dict[str, Any])
def create_test_data(
    include_enterprise: bool = False,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create test data for the current user
    
    Args:
        include_enterprise: If True, creates multi-location enterprise test data
    """
    result = test_data_service.create_test_data_for_user(db, current_user.id, include_enterprise=include_enterprise)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
        
    return result

@router.delete("", response_model=Dict[str, Any])
def delete_test_data(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all test data for the current user"""
    result = test_data_service.delete_test_data_for_user(db, current_user.id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
        
    return result

@router.post("/refresh", response_model=Dict[str, Any])
def refresh_test_data(
    include_enterprise: bool = False,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete and recreate test data (reset to default state)
    
    Args:
        include_enterprise: If True, creates multi-location enterprise test data
    """
    # First delete existing test data
    delete_result = test_data_service.delete_test_data_for_user(db, current_user.id)
    if not delete_result["success"]:
        raise HTTPException(status_code=400, detail=delete_result["message"])
    
    # Then create new test data
    create_result = test_data_service.create_test_data_for_user(db, current_user.id, include_enterprise=include_enterprise)
    if not create_result["success"]:
        raise HTTPException(status_code=400, detail=create_result["message"])
        
    return {
        "success": True,
        "deleted": delete_result["deleted"],
        "created": create_result["created"],
        "message": "Test data refreshed successfully"
    }

@router.get("/status", response_model=Dict[str, Any])
def get_test_data_status(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current test data status for the user"""
    return test_data_service.get_test_data_status(db, current_user.id)

@router.post("/create-enterprise", response_model=Dict[str, Any])
def create_enterprise_data_only(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create only enterprise (multi-location) test data for the current user
    
    This endpoint creates locations, chairs, and compensation plans without
    creating the base test data (barbers, clients, appointments).
    Use this if you already have test data and just want to add locations.
    """
    try:
        # Get existing barbers, clients, and services
        barbers = db.query(models.User).filter(
            models.User.role == "barber",
            models.User.is_test_data == True
        ).all()
        
        clients = db.query(models.Client).filter(
            models.Client.created_by_id == current_user.id,
            models.Client.is_test_data == True
        ).all()
        
        services = db.query(models.Service).all()
        
        # Create enterprise data
        enterprise_data = test_data_service.create_enterprise_data(
            db, current_user.id, barbers, clients, services
        )
        
        db.commit()
        
        return {
            "success": True,
            "created": {
                "locations": len(enterprise_data.get("locations", [])),
                "barber_locations": len(enterprise_data.get("barber_locations", [])),
                "chair_inventory": len(enterprise_data.get("chair_inventory", [])),
                "compensation_plans": len(enterprise_data.get("compensation_plans", [])),
                "location_appointments": sum(len(apps) for apps in enterprise_data.get("location_appointments", {}).values())
            },
            "message": f"Successfully created enterprise data: {len(enterprise_data.get('locations', []))} locations"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))