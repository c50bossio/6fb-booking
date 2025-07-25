from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from dependencies import get_current_user
import models
import schemas

router = APIRouter(prefix="/barbers", tags=["barbers"])

@router.get("/")
def get_all_barbers(
    db: Session = Depends(get_db)
):
    """Get all active barbers (public endpoint for booking)"""
    barbers = db.query(models.User).filter(
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).all()
    
    # Return simple dict to avoid Pydantic schema issues
    return [
        {
            "id": barber.id,
            "name": barber.name,
            "email": barber.email,
            "role": barber.role,
            "created_at": str(barber.created_at) if barber.created_at else None
        }
        for barber in barbers
    ]

@router.get("/{barber_id}", response_model=schemas.UserResponse)
def get_barber(
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific barber by ID"""
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    return barber