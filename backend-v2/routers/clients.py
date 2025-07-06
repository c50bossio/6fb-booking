from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime, timezone

from database import get_db
from models import Client, User, Appointment
from schemas import ClientCreate, ClientUpdate, Client as ClientSchema, ClientList, ClientHistory
from utils.auth import get_current_user
from services import client_service

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("/", response_model=ClientSchema)
async def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new client"""
    # Check if client with email already exists
    existing_client = db.query(Client).filter(Client.email == client_data.email).first()
    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client with this email already exists"
        )
    
    try:
        new_client = client_service.create_client(
            db=db,
            client_data=client_data.model_dump(),
            created_by_id=current_user.id
        )
        return new_client
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/", response_model=ClientList)
async def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    customer_type: Optional[str] = None,
    tags: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List clients with pagination and filtering"""
    query = db.query(Client)
    
    # Search by name, email, or phone
    if search:
        search_filter = or_(
            Client.first_name.ilike(f"%{search}%"),
            Client.last_name.ilike(f"%{search}%"),
            Client.email.ilike(f"%{search}%"),
            Client.phone.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Filter by customer type
    if customer_type:
        query = query.filter(Client.customer_type == customer_type)
    
    # Filter by tags
    if tags:
        query = query.filter(Client.tags.ilike(f"%{tags}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    clients = query.offset(offset).limit(page_size).all()
    
    return {
        "clients": clients,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/{client_id}", response_model=ClientSchema)
async def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific client by ID"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    return client


@router.put("/{client_id}", response_model=ClientSchema)
async def update_client(
    client_id: int,
    client_update: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update client information"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Update only provided fields
    update_data = client_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    # Update the updated_at timestamp
    client.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(client)
    
    return client


@router.delete("/{client_id}")
async def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a client (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete clients"
        )
    
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    db.delete(client)
    db.commit()
    
    return {"message": "Client deleted successfully"}


@router.get("/{client_id}/history", response_model=ClientHistory)
async def get_client_history(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get client appointment history and statistics"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    try:
        # Update client metrics automatically
        client_service.update_client_metrics(db, client_id)
        
        # Get all appointments for this client
        appointments = db.query(Appointment).filter(
            Appointment.client_id == client_id
        ).order_by(Appointment.start_time.desc()).all()
        
        # Get analytics
        analytics = client_service.get_client_analytics(db, client_id)
        
        return {
            "appointments": appointments,
            "total_appointments": analytics["total_scheduled"],
            "total_spent": analytics["total_spent"],
            "average_ticket": analytics["average_ticket"],
            "no_shows": analytics["no_show_count"],
            "cancellations": analytics["cancellation_count"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{client_id}/customer-type")
async def update_customer_type(
    client_id: int,
    customer_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update customer type (new, returning, vip, at_risk)"""
    if customer_type not in ["new", "returning", "vip", "at_risk"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid customer type"
        )
    
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    client.customer_type = customer_type
    client.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {"message": f"Customer type updated to {customer_type}"}


@router.post("/search")
async def search_clients(
    query: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Quick search for clients (for autocomplete)"""
    try:
        clients = client_service.search_clients_advanced(
            db=db,
            query=query,
            limit=limit
        )
        
        # Return simplified data for autocomplete
        return [
            {
                "id": client.id,
                "name": f"{client.first_name} {client.last_name}",
                "email": client.email,
                "phone": client.phone,
                "customer_type": client.customer_type
            }
            for client in clients
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{client_id}/analytics")
async def get_client_analytics(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics for a client"""
    try:
        analytics = client_service.get_client_analytics(db, client_id)
        return analytics
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{client_id}/recommendations")
async def get_client_recommendations(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get personalized recommendations for a client"""
    try:
        recommendations = client_service.get_client_recommendations(db, client_id)
        return recommendations
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{client_id}/communication-preferences")
async def get_client_communication_preferences(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get client communication preferences"""
    try:
        preferences = client_service.get_client_communication_preferences(db, client_id)
        return preferences
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{client_id}/communication-preferences")
async def update_client_communication_preferences(
    client_id: int,
    preferences: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update client communication preferences"""
    try:
        updated_client = client_service.update_client_communication_preferences(
            db, client_id, preferences
        )
        return {"message": "Communication preferences updated successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{client_id}/notes")
async def add_client_note(
    client_id: int,
    note_data: dict,  # {"note": str, "note_type": str}
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a note to a client's record"""
    try:
        note_result = client_service.add_client_note(
            db=db,
            client_id=client_id,
            note=note_data.get("note", ""),
            added_by_id=current_user.id,
            note_type=note_data.get("note_type", "general")
        )
        return note_result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{client_id}/tags")
async def update_client_tags(
    client_id: int,
    tag_data: dict,  # {"tags": List[str]}
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update client tags"""
    try:
        updated_client = client_service.update_client_tags(
            db, client_id, tag_data.get("tags", [])
        )
        return {"message": "Tags updated successfully", "tags": updated_client.tags}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/dashboard/metrics")
async def get_client_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard metrics for client management"""
    try:
        metrics = client_service.get_client_dashboard_metrics(db)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/advanced-search")
async def advanced_client_search(
    query: Optional[str] = Query(None),
    customer_type: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    min_visits: Optional[int] = Query(None),
    max_days_since_visit: Optional[int] = Query(None),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Advanced client search with multiple filters"""
    try:
        clients = client_service.search_clients_advanced(
            db=db,
            query=query,
            customer_type=customer_type,
            tags=tags,
            min_visits=min_visits,
            max_days_since_visit=max_days_since_visit,
            limit=limit
        )
        return clients
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )