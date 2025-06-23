from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, status
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from datetime import datetime, timedelta
import json

from config.database import get_db
from models import Client, Appointment, Barber, Service
from services.email_service import EmailService
from services.notification_service import NotificationService
from ..auth import get_current_user
from utils.rbac import rbac, Permission
from sqlalchemy import or_, and_, func
import io
import csv

router = APIRouter()


# Pydantic models for request/response
from pydantic import BaseModel, EmailStr
from typing import Dict, Any


class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    date_of_birth: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    sms_enabled: bool = True
    email_enabled: bool = True
    marketing_enabled: bool = True


class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    sms_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    marketing_enabled: Optional[bool] = None


class VIPStatusUpdate(BaseModel):
    is_vip: bool
    custom_rate: Optional[float] = None
    vip_benefits: Optional[Dict[str, Any]] = None


class ClientMessage(BaseModel):
    subject: str
    message: str
    send_email: bool = True
    send_sms: bool = False


class ClientResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    customer_type: str
    total_visits: int
    total_spent: float
    average_ticket: float
    last_visit_date: Optional[str]
    visit_frequency_days: Optional[int]
    no_show_count: int
    cancellation_count: int
    referral_count: int
    tags: List[str]
    notes: Optional[str]
    sms_enabled: bool
    email_enabled: bool
    marketing_enabled: bool
    created_at: str
    favorite_service: Optional[str]

    class Config:
        from_attributes = True


class ClientHistoryResponse(BaseModel):
    appointments: List[Dict[str, Any]]
    total_appointments: int
    total_spent: float
    services_breakdown: Dict[str, int]
    average_rating: Optional[float]
    last_review: Optional[Dict[str, Any]]


class ClientListResponse(BaseModel):
    clients: List[ClientResponse]
    total_clients: int
    total_pages: int
    current_page: int
    has_next: bool
    has_prev: bool


@router.get("/", response_model=ClientListResponse)
async def get_clients(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    customer_type: Optional[str] = None,
    barber_id: Optional[int] = None,
    sort_by: str = Query(
        "last_visit", regex="^(last_visit|total_spent|total_visits|created_at)$"
    ),
    order: str = Query("desc", regex="^(asc|desc)$"),
):
    """Get all clients with pagination and filtering"""

    # Base query with eager loading to prevent N+1 queries
    query = db.query(Client).options(
        joinedload(Client.barber),
        selectinload(Client.appointments).joinedload(Appointment.service),
    )

    # Filter by barber if not admin with optimized query
    if current_user.get("role") == "barber":
        barber = (
            db.query(Barber.id).filter(Barber.user_id == current_user["id"]).first()
        )
        if barber:
            query = query.filter(Client.barber_id == barber.id)
    elif barber_id:
        query = query.filter(Client.barber_id == barber_id)

    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Client.first_name.ilike(search_term),
                Client.last_name.ilike(search_term),
                Client.email.ilike(search_term),
                Client.phone.ilike(search_term),
            )
        )

    # Customer type filter
    if customer_type and customer_type != "all":
        query = query.filter(Client.customer_type == customer_type)

    # Get total count
    total_clients = query.count()

    # Apply sorting
    if sort_by == "last_visit":
        query = query.order_by(
            Client.last_visit_date.desc()
            if order == "desc"
            else Client.last_visit_date.asc()
        )
    elif sort_by == "total_spent":
        query = query.order_by(
            Client.total_spent.desc() if order == "desc" else Client.total_spent.asc()
        )
    elif sort_by == "total_visits":
        query = query.order_by(
            Client.total_visits.desc() if order == "desc" else Client.total_visits.asc()
        )
    else:
        query = query.order_by(
            Client.created_at.desc() if order == "desc" else Client.created_at.asc()
        )

    # Pagination
    offset = (page - 1) * limit
    clients = query.offset(offset).limit(limit).all()

    # Calculate favorite service for each client
    client_responses = []
    for client in clients:
        # Get most booked service
        favorite_service = None
        if client.appointments:
            service_counts = {}
            for appointment in client.appointments:
                if appointment.service:
                    service_name = appointment.service.name
                    service_counts[service_name] = (
                        service_counts.get(service_name, 0) + 1
                    )

            if service_counts:
                favorite_service = max(service_counts, key=service_counts.get)

        client_dict = {
            "id": client.id,
            "first_name": client.first_name,
            "last_name": client.last_name,
            "email": client.email,
            "phone": client.phone,
            "customer_type": client.customer_type,
            "total_visits": client.total_visits,
            "total_spent": client.total_spent,
            "average_ticket": client.average_ticket,
            "last_visit_date": (
                client.last_visit_date.isoformat() if client.last_visit_date else None
            ),
            "visit_frequency_days": client.visit_frequency_days,
            "no_show_count": client.no_show_count,
            "cancellation_count": client.cancellation_count,
            "referral_count": client.referral_count,
            "tags": client.tags.split(",") if client.tags else [],
            "notes": client.notes,
            "sms_enabled": client.sms_enabled,
            "email_enabled": client.email_enabled,
            "marketing_enabled": client.marketing_enabled,
            "created_at": client.created_at.isoformat(),
            "favorite_service": favorite_service,
        }
        client_responses.append(ClientResponse(**client_dict))

    total_pages = (total_clients + limit - 1) // limit

    return ClientListResponse(
        clients=client_responses,
        total_clients=total_clients,
        total_pages=total_pages,
        current_page=page,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.post("/", response_model=ClientResponse)
async def create_client(
    client_data: ClientCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new client"""

    # Check if client with email already exists
    existing_client = (
        db.query(Client.id).filter(Client.email == client_data.email).first()
    )
    if existing_client:
        raise HTTPException(
            status_code=400, detail="Client with this email already exists"
        )

    # Get barber ID with optimized query
    barber_id = None
    if current_user.get("role") == "barber":
        barber = (
            db.query(Barber.id).filter(Barber.user_id == current_user["id"]).first()
        )
        if barber:
            barber_id = barber.id
    else:
        # Admin can create clients for any barber, but we'll need to assign one
        # For now, we'll require barber_id in the request for admin users
        raise HTTPException(
            status_code=400, detail="Barber ID required for creating clients"
        )

    if not barber_id:
        raise HTTPException(
            status_code=400, detail="No barber associated with current user"
        )

    # Create new client
    new_client = Client(
        first_name=client_data.first_name,
        last_name=client_data.last_name,
        email=client_data.email,
        phone=client_data.phone,
        barber_id=barber_id,
        customer_type="new",
        total_visits=0,
        total_spent=0.0,
        average_ticket=0.0,
        no_show_count=0,
        cancellation_count=0,
        referral_count=0,
        notes=client_data.notes,
        tags=",".join(client_data.tags) if client_data.tags else None,
        sms_enabled=client_data.sms_enabled,
        email_enabled=client_data.email_enabled,
        marketing_enabled=client_data.marketing_enabled,
    )

    if client_data.date_of_birth:
        new_client.date_of_birth = datetime.fromisoformat(
            client_data.date_of_birth
        ).date()

    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    # Send welcome email if enabled
    if new_client.email_enabled:
        email_service = EmailService()
        await email_service.send_welcome_email(new_client.email, new_client.first_name)

    return ClientResponse(
        id=new_client.id,
        first_name=new_client.first_name,
        last_name=new_client.last_name,
        email=new_client.email,
        phone=new_client.phone,
        customer_type=new_client.customer_type,
        total_visits=new_client.total_visits,
        total_spent=new_client.total_spent,
        average_ticket=new_client.average_ticket,
        last_visit_date=None,
        visit_frequency_days=new_client.visit_frequency_days,
        no_show_count=new_client.no_show_count,
        cancellation_count=new_client.cancellation_count,
        referral_count=new_client.referral_count,
        tags=new_client.tags.split(",") if new_client.tags else [],
        notes=new_client.notes,
        sms_enabled=new_client.sms_enabled,
        email_enabled=new_client.email_enabled,
        marketing_enabled=new_client.marketing_enabled,
        created_at=new_client.created_at.isoformat(),
        favorite_service=None,
    )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific client by ID"""

    client = (
        db.query(Client)
        .options(
            joinedload(Client.barber),
            selectinload(Client.appointments).joinedload(Appointment.service),
        )
        .filter(Client.id == client_id)
        .first()
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check permissions with optimized query
    if current_user.get("role") == "barber":
        barber = (
            db.query(Barber.id).filter(Barber.user_id == current_user["id"]).first()
        )
        if not barber or client.barber_id != barber.id:
            raise HTTPException(
                status_code=403, detail="Not authorized to view this client"
            )

    # Get favorite service
    favorite_service = None
    if client.appointments:
        service_counts = {}
        for appointment in client.appointments:
            if appointment.service:
                service_name = appointment.service.name
                service_counts[service_name] = service_counts.get(service_name, 0) + 1

        if service_counts:
            favorite_service = max(service_counts, key=service_counts.get)

    return ClientResponse(
        id=client.id,
        first_name=client.first_name,
        last_name=client.last_name,
        email=client.email,
        phone=client.phone,
        customer_type=client.customer_type,
        total_visits=client.total_visits,
        total_spent=client.total_spent,
        average_ticket=client.average_ticket,
        last_visit_date=(
            client.last_visit_date.isoformat() if client.last_visit_date else None
        ),
        visit_frequency_days=client.visit_frequency_days,
        no_show_count=client.no_show_count,
        cancellation_count=client.cancellation_count,
        referral_count=client.referral_count,
        tags=client.tags.split(",") if client.tags else [],
        notes=client.notes,
        sms_enabled=client.sms_enabled,
        email_enabled=client.email_enabled,
        marketing_enabled=client.marketing_enabled,
        created_at=client.created_at.isoformat(),
        favorite_service=favorite_service,
    )


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a client's information"""

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check permissions
    if current_user.get("role") == "barber":
        barber = db.query(Barber).filter(Barber.user_id == current_user["id"]).first()
        if not barber or client.barber_id != barber.id:
            raise HTTPException(
                status_code=403, detail="Not authorized to update this client"
            )

    # Update fields
    update_data = client_data.dict(exclude_unset=True)

    if "tags" in update_data and update_data["tags"] is not None:
        update_data["tags"] = ",".join(update_data["tags"])

    if "date_of_birth" in update_data and update_data["date_of_birth"] is not None:
        update_data["date_of_birth"] = datetime.fromisoformat(
            update_data["date_of_birth"]
        ).date()

    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)

    # Get favorite service
    favorite_service = None
    if client.appointments:
        service_counts = {}
        for appointment in client.appointments:
            if appointment.service:
                service_name = appointment.service.name
                service_counts[service_name] = service_counts.get(service_name, 0) + 1

        if service_counts:
            favorite_service = max(service_counts, key=service_counts.get)

    return ClientResponse(
        id=client.id,
        first_name=client.first_name,
        last_name=client.last_name,
        email=client.email,
        phone=client.phone,
        customer_type=client.customer_type,
        total_visits=client.total_visits,
        total_spent=client.total_spent,
        average_ticket=client.average_ticket,
        last_visit_date=(
            client.last_visit_date.isoformat() if client.last_visit_date else None
        ),
        visit_frequency_days=client.visit_frequency_days,
        no_show_count=client.no_show_count,
        cancellation_count=client.cancellation_count,
        referral_count=client.referral_count,
        tags=client.tags.split(",") if client.tags else [],
        notes=client.notes,
        sms_enabled=client.sms_enabled,
        email_enabled=client.email_enabled,
        marketing_enabled=client.marketing_enabled,
        created_at=client.created_at.isoformat(),
        favorite_service=favorite_service,
    )


@router.get("/{client_id}/history", response_model=ClientHistoryResponse)
async def get_client_history(
    client_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a client's appointment history and statistics"""

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check permissions
    if current_user.get("role") == "barber":
        barber = db.query(Barber).filter(Barber.user_id == current_user["id"]).first()
        if not barber or client.barber_id != barber.id:
            raise HTTPException(
                status_code=403, detail="Not authorized to view this client's history"
            )

    # Get appointments
    appointments = []
    services_breakdown = {}
    total_spent = 0.0
    ratings = []

    for appointment in client.appointments:
        appointment_data = {
            "id": appointment.id,
            "date": appointment.appointment_date.isoformat(),
            "time": (
                appointment.appointment_time.isoformat()
                if appointment.appointment_time
                else None
            ),
            "service": appointment.service.name if appointment.service else "Unknown",
            "barber": (
                appointment.barber.user.full_name
                if appointment.barber and appointment.barber.user
                else "Unknown"
            ),
            "cost": float(appointment.cost) if appointment.cost else 0.0,
            "status": appointment.status,
            "notes": appointment.notes,
        }
        appointments.append(appointment_data)

        # Count services
        if appointment.service:
            service_name = appointment.service.name
            services_breakdown[service_name] = (
                services_breakdown.get(service_name, 0) + 1
            )

        # Sum total spent
        if appointment.cost and appointment.status == "completed":
            total_spent += float(appointment.cost)

        # Collect ratings if available
        if hasattr(appointment, "rating") and appointment.rating:
            ratings.append(appointment.rating)

    # Calculate average rating
    average_rating = sum(ratings) / len(ratings) if ratings else None

    # Get last review
    last_review = None
    if client.reviews:
        latest_review = max(client.reviews, key=lambda r: r.created_at)
        last_review = {
            "rating": latest_review.rating,
            "comment": latest_review.comment,
            "date": latest_review.created_at.isoformat(),
        }

    return ClientHistoryResponse(
        appointments=appointments,
        total_appointments=len(appointments),
        total_spent=total_spent,
        services_breakdown=services_breakdown,
        average_rating=average_rating,
        last_review=last_review,
    )


@router.post("/{client_id}/vip-status")
async def update_vip_status(
    client_id: int,
    vip_data: VIPStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a client's VIP status"""

    # Only admins can set VIP status
    if not rbac.has_permission(current_user, Permission.UPDATE_ALL_CLIENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can set VIP status",
        )

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Update customer type
    client.customer_type = "vip" if vip_data.is_vip else "returning"

    # Store VIP benefits in notes or create a separate field
    if vip_data.vip_benefits:
        vip_info = {
            "custom_rate": vip_data.custom_rate,
            "benefits": vip_data.vip_benefits,
        }
        # Append to notes as JSON
        existing_notes = client.notes or ""
        client.notes = existing_notes + f"\n[VIP_INFO]{json.dumps(vip_info)}[/VIP_INFO]"

    db.commit()

    # Send notification
    if client.email_enabled and vip_data.is_vip:
        email_service = EmailService()
        await email_service.send_vip_welcome_email(client.email, client.first_name)

    return {
        "message": "VIP status updated successfully",
        "client_id": client_id,
        "is_vip": vip_data.is_vip,
    }


@router.post("/{client_id}/message")
async def send_client_message(
    client_id: int,
    message_data: ClientMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message to a client"""

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check permissions
    if current_user.get("role") == "barber":
        barber = db.query(Barber).filter(Barber.user_id == current_user["id"]).first()
        if not barber or client.barber_id != barber.id:
            raise HTTPException(
                status_code=403, detail="Not authorized to message this client"
            )

    results = {"email_sent": False, "sms_sent": False}

    # Send email
    if message_data.send_email and client.email_enabled:
        email_service = EmailService()
        success = await email_service.send_custom_email(
            client.email, message_data.subject, message_data.message, client.first_name
        )
        results["email_sent"] = success

    # Send SMS
    if message_data.send_sms and client.sms_enabled:
        notification_service = NotificationService()
        success = await notification_service.send_sms(
            client.phone, message_data.message
        )
        results["sms_sent"] = success

    return {"message": "Message sent successfully", "client_id": client_id, **results}


@router.post("/export")
async def export_clients(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    format: str = Query("csv", regex="^(csv|json)$"),
    customer_type: Optional[str] = None,
):
    """Export clients data"""

    # Base query
    query = db.query(Client)

    # Filter by barber if not admin
    if current_user.get("role") == "barber":
        barber = db.query(Barber).filter(Barber.user_id == current_user["id"]).first()
        if barber:
            query = query.filter(Client.barber_id == barber.id)

    # Customer type filter
    if customer_type and customer_type != "all":
        query = query.filter(Client.customer_type == customer_type)

    clients = query.all()

    if format == "csv":
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow(
            [
                "ID",
                "First Name",
                "Last Name",
                "Email",
                "Phone",
                "Customer Type",
                "Total Visits",
                "Total Spent",
                "Average Ticket",
                "Last Visit",
                "No Shows",
                "Cancellations",
                "Tags",
                "Created At",
            ]
        )

        # Data
        for client in clients:
            writer.writerow(
                [
                    client.id,
                    client.first_name,
                    client.last_name,
                    client.email,
                    client.phone,
                    client.customer_type,
                    client.total_visits,
                    client.total_spent,
                    client.average_ticket,
                    (
                        client.last_visit_date.isoformat()
                        if client.last_visit_date
                        else ""
                    ),
                    client.no_show_count,
                    client.cancellation_count,
                    client.tags or "",
                    client.created_at.isoformat(),
                ]
            )

        output.seek(0)

        from fastapi.responses import StreamingResponse

        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=clients_export.csv"},
        )

    else:  # JSON format
        clients_data = []
        for client in clients:
            clients_data.append(
                {
                    "id": client.id,
                    "first_name": client.first_name,
                    "last_name": client.last_name,
                    "email": client.email,
                    "phone": client.phone,
                    "customer_type": client.customer_type,
                    "total_visits": client.total_visits,
                    "total_spent": client.total_spent,
                    "average_ticket": client.average_ticket,
                    "last_visit_date": (
                        client.last_visit_date.isoformat()
                        if client.last_visit_date
                        else None
                    ),
                    "no_show_count": client.no_show_count,
                    "cancellation_count": client.cancellation_count,
                    "tags": client.tags.split(",") if client.tags else [],
                    "created_at": client.created_at.isoformat(),
                }
            )

        return {"clients": clients_data, "total": len(clients_data)}


@router.delete("/{client_id}")
async def delete_client(
    client_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a client (admin only)"""

    # Only admins can delete clients
    if not rbac.has_permission(current_user, Permission.DELETE_ALL_CLIENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete clients",
        )

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Soft delete by setting a flag or actually delete
    db.delete(client)
    db.commit()

    return {"message": "Client deleted successfully", "client_id": client_id}
