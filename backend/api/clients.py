from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional
from datetime import date, timedelta
from pydantic import BaseModel

from database import get_db
from models import Client, Appointment, Barber

router = APIRouter()

# Pydantic models for request/response
class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    notes: Optional[str] = None
    tags: Optional[str] = None

class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    customer_type: Optional[str] = None

@router.get("/")
async def get_clients(
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    customer_type: Optional[str] = Query(None, description="new, returning, vip, or at_risk"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get client list with optional search and filtering"""
    try:
        query = db.query(Client).filter(Client.barber_id == barber_id)
        
        # Apply search filter
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(Client.first_name).like(search_term),
                    func.lower(Client.last_name).like(search_term),
                    func.lower(Client.email).like(search_term),
                    Client.phone.like(search_term)
                )
            )
        
        # Apply customer type filter
        if customer_type:
            query = query.filter(Client.customer_type == customer_type)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination and ordering
        clients = query.order_by(Client.last_visit_date.desc().nullslast()).offset(skip).limit(limit).all()
        
        client_list = []
        for client in clients:
            # Calculate recent visit count (last 30 days)
            thirty_days_ago = date.today() - timedelta(days=30)
            recent_visits = db.query(Appointment).filter(
                and_(
                    Appointment.client_id == client.id,
                    Appointment.appointment_date >= thirty_days_ago,
                    Appointment.status == "completed"
                )
            ).count()
            
            client_list.append({
                "id": client.id,
                "full_name": client.full_name,
                "email": client.email,
                "phone": client.phone,
                "customer_type": client.customer_type,
                "total_visits": client.total_visits,
                "total_spent": client.total_spent,
                "average_ticket": client.average_ticket,
                "last_visit_date": client.last_visit_date,
                "recent_visits": recent_visits,
                "lifetime_value": client.lifetime_value,
                "tags": client.tags.split(",") if client.tags else []
            })
        
        return {
            "success": True,
            "data": {
                "clients": client_list,
                "pagination": {
                    "total": total_count,
                    "skip": skip,
                    "limit": limit,
                    "has_more": skip + limit < total_count
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching clients: {str(e)}")

@router.post("/")
async def create_client(
    client_data: ClientCreate,
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    db: Session = Depends(get_db)
):
    """Create a new client"""
    try:
        # Check if client with same email or phone already exists for this barber
        existing_client = None
        if client_data.email:
            existing_client = db.query(Client).filter(
                and_(Client.barber_id == barber_id, Client.email == client_data.email)
            ).first()
        if not existing_client and client_data.phone:
            existing_client = db.query(Client).filter(
                and_(Client.barber_id == barber_id, Client.phone == client_data.phone)
            ).first()
        
        if existing_client:
            raise HTTPException(status_code=400, detail="Client with this email or phone already exists")
        
        # Create new client
        new_client = Client(
            barber_id=barber_id,
            first_name=client_data.first_name,
            last_name=client_data.last_name,
            email=client_data.email,
            phone=client_data.phone,
            date_of_birth=client_data.date_of_birth,
            notes=client_data.notes,
            tags=client_data.tags,
            customer_type="new"  # Default to new customer
        )
        
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
        
        return {
            "success": True,
            "data": {
                "id": new_client.id,
                "message": "Client created successfully"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating client: {str(e)}")

@router.get("/{client_id}")
async def get_client_details(
    client_id: int,
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    db: Session = Depends(get_db)
):
    """Get detailed client profile with visit history"""
    try:
        # Find client belonging to this barber
        client = db.query(Client).filter(
            and_(Client.id == client_id, Client.barber_id == barber_id)
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Get visit history
        appointments = db.query(Appointment).filter(
            Appointment.client_id == client_id
        ).order_by(Appointment.appointment_date.desc()).all()
        
        # Calculate visit patterns
        completed_appointments = [apt for apt in appointments if apt.status == "completed"]
        
        # Monthly spending breakdown (last 12 months)
        monthly_spending = {}
        for apt in completed_appointments:
            if apt.appointment_date:
                month_key = f"{apt.appointment_date.year}-{apt.appointment_date.month:02d}"
                monthly_spending[month_key] = monthly_spending.get(month_key, 0) + apt.total_revenue
        
        # Service preferences
        service_counts = {}
        for apt in completed_appointments:
            service = apt.service_name or "Standard Cut"
            service_counts[service] = service_counts.get(service, 0) + 1
        
        client_details = {
            "id": client.id,
            "personal_info": {
                "full_name": client.full_name,
                "first_name": client.first_name,
                "last_name": client.last_name,
                "email": client.email,
                "phone": client.phone,
                "date_of_birth": client.date_of_birth,
                "customer_type": client.customer_type
            },
            "visit_stats": {
                "total_visits": len(completed_appointments),
                "total_spent": sum(apt.total_revenue for apt in completed_appointments),
                "average_ticket": sum(apt.total_revenue for apt in completed_appointments) / len(completed_appointments) if completed_appointments else 0,
                "first_visit_date": client.first_visit_date,
                "last_visit_date": client.last_visit_date,
                "visit_frequency_days": client.visit_frequency_days,
                "lifetime_value": client.lifetime_value
            },
            "engagement": {
                "no_show_count": client.no_show_count,
                "cancellation_count": client.cancellation_count,
                "referral_count": client.referral_count
            },
            "preferences": {
                "favorite_services": dict(sorted(service_counts.items(), key=lambda x: x[1], reverse=True)),
                "preferred_services": client.preferred_services,
                "tags": client.tags.split(",") if client.tags else []
            },
            "communication": {
                "sms_enabled": client.sms_enabled,
                "email_enabled": client.email_enabled,
                "marketing_enabled": client.marketing_enabled
            },
            "notes": client.notes,
            "monthly_spending": monthly_spending,
            "recent_appointments": [
                {
                    "id": apt.id,
                    "date": apt.appointment_date,
                    "time": apt.appointment_time.strftime("%H:%M") if apt.appointment_time else None,
                    "service": apt.service_name,
                    "revenue": apt.total_revenue,
                    "tip": apt.tip_amount,
                    "status": apt.status
                }
                for apt in appointments[:10]  # Last 10 appointments
            ]
        }
        
        return {"success": True, "data": client_details}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching client details: {str(e)}")

@router.put("/{client_id}")
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    db: Session = Depends(get_db)
):
    """Update client information and notes"""
    try:
        # Find client belonging to this barber
        client = db.query(Client).filter(
            and_(Client.id == client_id, Client.barber_id == barber_id)
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Update fields that are provided
        update_data = client_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(client, field, value)
        
        db.commit()
        db.refresh(client)
        
        return {
            "success": True,
            "data": {
                "id": client.id,
                "message": "Client updated successfully"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating client: {str(e)}")

@router.get("/{client_id}/visits")
async def get_client_visits(
    client_id: int,
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get client visit history and spending patterns"""
    try:
        # Verify client belongs to this barber
        client = db.query(Client).filter(
            and_(Client.id == client_id, Client.barber_id == barber_id)
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Get visit history with pagination
        appointments = db.query(Appointment).filter(
            Appointment.client_id == client_id
        ).order_by(Appointment.appointment_date.desc()).offset(offset).limit(limit).all()
        
        total_appointments = db.query(Appointment).filter(Appointment.client_id == client_id).count()
        
        visit_history = [
            {
                "id": apt.id,
                "appointment_date": apt.appointment_date,
                "appointment_time": apt.appointment_time,
                "service_name": apt.service_name,
                "service_revenue": apt.service_revenue,
                "tip_amount": apt.tip_amount,
                "product_revenue": apt.product_revenue,
                "total_revenue": apt.total_revenue,
                "status": apt.status,
                "reference_source": apt.reference_source,
                "barber_notes": apt.barber_notes
            }
            for apt in appointments
        ]
        
        return {
            "success": True,
            "data": {
                "client_id": client_id,
                "client_name": client.full_name,
                "visits": visit_history,
                "pagination": {
                    "total": total_appointments,
                    "offset": offset,
                    "limit": limit,
                    "has_more": offset + limit < total_appointments
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching client visits: {str(e)}")

@router.delete("/{client_id}")
async def delete_client(
    client_id: int,
    barber_id: int = Query(1, description="Barber ID - will be from auth in production"),
    db: Session = Depends(get_db)
):
    """Delete a client (this will also affect related appointments)"""
    try:
        client = db.query(Client).filter(
            and_(Client.id == client_id, Client.barber_id == barber_id)
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Check if client has appointments
        appointment_count = db.query(Appointment).filter(Appointment.client_id == client_id).count()
        
        if appointment_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete client with {appointment_count} appointments. Consider deactivating instead."
            )
        
        db.delete(client)
        db.commit()
        
        return {
            "success": True,
            "message": "Client deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting client: {str(e)}")