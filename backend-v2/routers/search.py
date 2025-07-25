"""
Global Search API endpoints for BookedBarber V2.

Provides unified search across appointments, clients, services, and other entities.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from datetime import datetime

from db import get_db
from dependencies import get_current_user
from models import User, Appointment, Service
from utils.role_permissions import Permission, get_permission_checker, PermissionChecker


router = APIRouter(prefix="/search", tags=["search"])


class SearchResult(BaseModel):
    """Individual search result item"""
    id: int
    type: str  # "appointment", "client", "service", etc.
    title: str
    subtitle: Optional[str] = None
    url: str
    metadata: Dict[str, Any] = {}
    score: float = 0.0


class SearchResponse(BaseModel):
    """Search response with results and metadata"""
    query: str
    results: List[SearchResult]
    total: int
    categories: Dict[str, int]
    took_ms: int


@router.get("/", response_model=SearchResponse)
async def global_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    category: Optional[str] = Query(None, description="Filter by category: appointments, clients, services"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Global search across user's data.
    
    Searches through appointments, clients, services based on user permissions.
    Returns unified results with relevance scoring.
    """
    start_time = datetime.now()
    
    results = []
    categories = {
        "appointments": 0,
        "clients": 0, 
        "services": 0
    }
    
    search_query = f"%{q.lower()}%"
    
    try:
        # Search Appointments (if user has permission)
        if (not category or category == "appointments") and \
           permission_checker.has_permission(Permission.VIEW_OWN_APPOINTMENTS):
            
            appointment_query = db.query(Appointment).filter(
                Appointment.client_id == current_user.id if current_user.unified_role == "CLIENT"
                else Appointment.barber_id == current_user.id if current_user.unified_role == "BARBER"
                else True  # Admin/Owner can see all
            ).filter(
                or_(
                    func.lower(Appointment.service_name).like(search_query),
                    func.lower(Appointment.notes).like(search_query),
                    func.lower(Appointment.status).like(search_query)
                )
            ).limit(limit // 3)
            
            for appointment in appointment_query.all():
                results.append(SearchResult(
                    id=appointment.id,
                    type="appointment",
                    title=f"{appointment.service_name}",
                    subtitle=f"{appointment.appointment_date.strftime('%B %d, %Y')} at {appointment.appointment_time}",
                    url=f"/calendar?appointment={appointment.id}",
                    metadata={
                        "date": appointment.appointment_date.isoformat(),
                        "time": str(appointment.appointment_time),
                        "status": appointment.status,
                    },
                    score=1.0 if q.lower() in appointment.service_name.lower() else 0.5
                ))
                categories["appointments"] += 1
        
        # Search Clients (if user has permission)
        if (not category or category == "clients") and \
           permission_checker.has_permission(Permission.VIEW_ALL_CLIENTS):
            
            client_query = db.query(User).filter(
                User.unified_role == "CLIENT"
            ).filter(
                or_(
                    func.lower(User.first_name).like(search_query),
                    func.lower(User.last_name).like(search_query),
                    func.lower(User.email).like(search_query),
                    func.lower(func.concat(User.first_name, ' ', User.last_name)).like(search_query)
                )
            ).limit(limit // 3)
            
            for client in client_query.all():
                full_name = f"{client.first_name} {client.last_name}".strip()
                results.append(SearchResult(
                    id=client.id,
                    type="client",
                    title=full_name or client.email,
                    subtitle=client.email if full_name else "Client",
                    url=f"/clients/{client.id}",
                    metadata={
                        "email": client.email,
                        "phone": getattr(client, 'phone', None),
                        "last_appointment": None  # Could add this with a subquery
                    },
                    score=1.0 if q.lower() in full_name.lower() else 0.7
                ))
                categories["clients"] += 1
        
        # Search Services (if user has permission)
        if (not category or category == "services") and \
           permission_checker.has_permission(Permission.VIEW_SERVICES):
            
            service_query = db.query(Service).filter(
                or_(
                    func.lower(Service.name).like(search_query),
                    func.lower(Service.description).like(search_query),
                    func.lower(Service.category).like(search_query)
                )
            ).limit(limit // 3)
            
            for service in service_query.all():
                results.append(SearchResult(
                    id=service.id,
                    type="service",
                    title=service.name,
                    subtitle=f"${service.price} - {service.duration} min",
                    url=f"/services/{service.id}",
                    metadata={
                        "price": float(service.price),
                        "duration": service.duration,
                        "category": service.category,
                        "description": service.description
                    },
                    score=1.0 if q.lower() in service.name.lower() else 0.6
                ))
                categories["services"] += 1
        
        # Sort results by score (highest first)
        results.sort(key=lambda x: x.score, reverse=True)
        
        # Limit total results
        results = results[:limit]
        total = len(results)
        
        # Calculate search time
        end_time = datetime.now()
        took_ms = int((end_time - start_time).total_seconds() * 1000)
        
        return SearchResponse(
            query=q,
            results=results,
            total=total,
            categories=categories,
            took_ms=took_ms
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/suggestions", response_model=List[str])
async def search_suggestions(
    q: str = Query(..., min_length=1, max_length=50, description="Partial search query"),
    limit: int = Query(5, ge=1, le=10, description="Maximum number of suggestions"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Get search suggestions/autocomplete for the given query.
    
    Returns common search terms that start with the query.
    """
    suggestions = []
    search_query = f"{q.lower()}%"
    
    try:
        # Service name suggestions
        if permission_checker.has_permission(Permission.VIEW_SERVICES):
            service_names = db.query(Service.name).filter(
                func.lower(Service.name).like(search_query)
            ).distinct().limit(limit).all()
            
            suggestions.extend([name[0] for name in service_names])
        
        # Client name suggestions  
        if permission_checker.has_permission(Permission.VIEW_ALL_CLIENTS):
            client_names = db.query(
                func.concat(User.first_name, ' ', User.last_name).label('full_name')
            ).filter(
                User.unified_role == "CLIENT"
            ).filter(
                func.lower(func.concat(User.first_name, ' ', User.last_name)).like(search_query)
            ).distinct().limit(limit).all()
            
            suggestions.extend([name[0] for name in client_names if name[0]])
        
        # Remove duplicates and limit
        suggestions = list(set(suggestions))[:limit]
        
        return suggestions
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get suggestions: {str(e)}"
        )


@router.get("/recent", response_model=List[SearchResult])
async def recent_searches(
    limit: int = Query(10, ge=1, le=20, description="Maximum number of recent items"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Get recently accessed items for quick search suggestions.
    
    Returns recent appointments, clients, etc. based on user activity.
    """
    results = []
    
    try:
        # Recent appointments
        if permission_checker.has_permission(Permission.VIEW_OWN_APPOINTMENTS):
            recent_appointments = db.query(Appointment).filter(
                Appointment.client_id == current_user.id if current_user.unified_role == "CLIENT"
                else Appointment.barber_id == current_user.id if current_user.unified_role == "BARBER"
                else True
            ).order_by(Appointment.created_at.desc()).limit(limit // 2).all()
            
            for appointment in recent_appointments:
                results.append(SearchResult(
                    id=appointment.id,
                    type="appointment",
                    title=f"{appointment.service_name}",
                    subtitle=f"{appointment.appointment_date.strftime('%B %d, %Y')}",
                    url=f"/calendar?appointment={appointment.id}",
                    metadata={"recent": True},
                    score=0.9
                ))
        
        # Recent clients (for barbers/owners)
        if permission_checker.has_permission(Permission.VIEW_ALL_CLIENTS):
            # Get clients with recent appointments
            recent_clients = db.query(User).join(
                Appointment, User.id == Appointment.client_id
            ).filter(
                User.unified_role == "CLIENT"
            ).order_by(Appointment.created_at.desc()).distinct().limit(limit // 2).all()
            
            for client in recent_clients:
                full_name = f"{client.first_name} {client.last_name}".strip()
                results.append(SearchResult(
                    id=client.id,
                    type="client",
                    title=full_name or client.email,
                    subtitle="Recent client",
                    url=f"/clients/{client.id}",
                    metadata={"recent": True},
                    score=0.8
                ))
        
        # Sort by score and limit
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get recent items: {str(e)}"
        )