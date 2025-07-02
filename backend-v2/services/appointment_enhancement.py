"""
Service to enhance appointment responses with related data (barber names, client names, etc.)
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import models

def enhance_appointment_response(appointment: models.Appointment, db: Session) -> Dict[str, Any]:
    """
    Enhance a single appointment with related data for frontend display.
    
    Args:
        appointment: The appointment model instance
        db: Database session
    
    Returns:
        Enhanced appointment dictionary with barber_name, client_name, etc.
    """
    # Start with basic appointment data
    enhanced = {
        "id": appointment.id,
        "user_id": appointment.user_id,
        "barber_id": appointment.barber_id,
        "client_id": appointment.client_id,
        "service_id": appointment.service_id,
        "service_name": appointment.service_name,
        "start_time": appointment.start_time.isoformat() if appointment.start_time else None,
        "duration_minutes": appointment.duration_minutes,
        "price": appointment.price,
        "status": appointment.status,
        "notes": appointment.notes,
        "recurring_pattern_id": appointment.recurring_pattern_id,
        "google_event_id": appointment.google_event_id,
        "created_at": appointment.created_at.isoformat() if appointment.created_at else None,
    }
    
    # Add barber name
    if appointment.barber_id and appointment.barber:
        enhanced["barber_name"] = appointment.barber.name or appointment.barber.email
    else:
        enhanced["barber_name"] = None
    
    # Add client name
    if appointment.client_id and appointment.client:
        enhanced["client_name"] = f"{appointment.client.first_name} {appointment.client.last_name}".strip()
        enhanced["client_email"] = appointment.client.email
        enhanced["client_phone"] = appointment.client.phone
    else:
        # Fallback to user if no client
        if appointment.user_id and appointment.user:
            enhanced["client_name"] = appointment.user.name or appointment.user.email
            enhanced["client_email"] = appointment.user.email
            enhanced["client_phone"] = None
        else:
            enhanced["client_name"] = None
            enhanced["client_email"] = None
            enhanced["client_phone"] = None
    
    # Calculate end_time from start_time and duration
    if appointment.start_time and appointment.duration_minutes:
        from datetime import timedelta
        end_time = appointment.start_time + timedelta(minutes=appointment.duration_minutes)
        enhanced["end_time"] = end_time.isoformat()
    else:
        enhanced["end_time"] = None
    
    return enhanced


def enhance_appointments_list(appointments: List[models.Appointment], db: Session) -> List[Dict[str, Any]]:
    """
    Enhance a list of appointments with related data.
    
    Args:
        appointments: List of appointment model instances
        db: Database session
    
    Returns:
        List of enhanced appointment dictionaries
    """
    # Pre-load all barbers and clients for efficiency
    barber_ids = {apt.barber_id for apt in appointments if apt.barber_id}
    client_ids = {apt.client_id for apt in appointments if apt.client_id}
    user_ids = {apt.user_id for apt in appointments if apt.user_id and not apt.client_id}
    
    # Fetch all barbers in one query
    barbers = {}
    if barber_ids:
        barber_query = db.query(models.User).filter(models.User.id.in_(barber_ids)).all()
        barbers = {b.id: b for b in barber_query}
    
    # Fetch all clients in one query
    clients = {}
    if client_ids:
        client_query = db.query(models.Client).filter(models.Client.id.in_(client_ids)).all()
        clients = {c.id: c for c in client_query}
    
    # Fetch all users in one query (for fallback)
    users = {}
    if user_ids:
        user_query = db.query(models.User).filter(models.User.id.in_(user_ids)).all()
        users = {u.id: u for u in user_query}
    
    # Enhance each appointment
    enhanced_appointments = []
    for appointment in appointments:
        enhanced = {
            "id": appointment.id,
            "user_id": appointment.user_id,
            "barber_id": appointment.barber_id,
            "client_id": appointment.client_id,
            "service_id": appointment.service_id,
            "service_name": appointment.service_name,
            "start_time": appointment.start_time.isoformat() if appointment.start_time else None,
            "duration_minutes": appointment.duration_minutes,
            "price": appointment.price,
            "status": appointment.status,
            "notes": appointment.notes,
            "recurring_pattern_id": appointment.recurring_pattern_id,
            "google_event_id": appointment.google_event_id,
            "created_at": appointment.created_at.isoformat() if appointment.created_at else None,
        }
        
        # Add barber name from cached data
        if appointment.barber_id and appointment.barber_id in barbers:
            barber = barbers[appointment.barber_id]
            enhanced["barber_name"] = barber.name or barber.email
        else:
            enhanced["barber_name"] = None
        
        # Add client name from cached data
        if appointment.client_id and appointment.client_id in clients:
            client = clients[appointment.client_id]
            enhanced["client_name"] = f"{client.first_name} {client.last_name}".strip()
            enhanced["client_email"] = client.email
            enhanced["client_phone"] = client.phone
        elif appointment.user_id and appointment.user_id in users:
            # Fallback to user if no client
            user = users[appointment.user_id]
            enhanced["client_name"] = user.name or user.email
            enhanced["client_email"] = user.email
            enhanced["client_phone"] = None
        else:
            enhanced["client_name"] = None
            enhanced["client_email"] = None
            enhanced["client_phone"] = None
        
        # Calculate end_time from start_time and duration
        if appointment.start_time and appointment.duration_minutes:
            from datetime import timedelta
            end_time = appointment.start_time + timedelta(minutes=appointment.duration_minutes)
            enhanced["end_time"] = end_time.isoformat()
        else:
            enhanced["end_time"] = None
        
        enhanced_appointments.append(enhanced)
    
    return enhanced_appointments