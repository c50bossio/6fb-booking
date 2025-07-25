"""
Client management service with analytics and engagement tracking.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from models import Client, Appointment, User
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_client(
    db: Session,
    client_data: Dict[str, Any],
    created_by_id: int
) -> Client:
    """Create a new client with proper initialization."""
    client = Client(
        **client_data,
        created_by_id=created_by_id,
        customer_type="new",  # Always start as new
        total_visits=0,
        total_spent=0.0,
        average_ticket=0.0,
        no_show_count=0,
        cancellation_count=0,
        referral_count=0
    )
    
    db.add(client)
    db.commit()
    db.refresh(client)
    
    logger.info(f"Created new client: {client.first_name} {client.last_name} (ID: {client.id})")
    return client


def get_client_analytics(db: Session, client_id: int) -> Dict[str, Any]:
    """Get comprehensive analytics for a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise ValueError("Client not found")
    
    # Get all appointments for analytics
    appointments = db.query(Appointment).filter(
        Appointment.client_id == client_id
    ).order_by(Appointment.start_time.desc()).all()
    
    # Calculate visit metrics
    completed_appointments = [apt for apt in appointments if apt.status == "completed"]
    total_visits = len(completed_appointments)
    
    # Calculate revenue metrics
    total_spent = sum(apt.price for apt in completed_appointments)
    average_ticket = total_spent / total_visits if total_visits > 0 else 0.0
    
    # Calculate engagement metrics
    no_shows = sum(1 for apt in appointments if apt.status == "no_show")
    cancellations = sum(1 for apt in appointments if apt.status == "cancelled")
    total_scheduled = len(appointments)
    
    # Calculate visit frequency
    visit_frequency_days = None
    if len(completed_appointments) >= 2:
        visit_dates = [apt.start_time.date() for apt in completed_appointments]
        visit_dates.sort()
        intervals = [(visit_dates[i] - visit_dates[i-1]).days 
                    for i in range(1, len(visit_dates))]
        visit_frequency_days = sum(intervals) / len(intervals) if intervals else None
    
    # Determine customer lifecycle stage
    customer_type = determine_customer_type(
        total_visits, total_spent, no_shows, cancellations, 
        completed_appointments[-1].start_time if completed_appointments else None
    )
    
    # Calculate retention metrics
    last_visit_date = completed_appointments[0].start_time if completed_appointments else None
    days_since_last_visit = None
    if last_visit_date:
        # Handle timezone-naive datetime objects from database
        if last_visit_date.tzinfo is None:
            last_visit_date = last_visit_date.replace(tzinfo=timezone.utc)
        days_since_last_visit = (datetime.now(timezone.utc) - last_visit_date).days
    
    # Calculate booking patterns
    booking_patterns = analyze_booking_patterns(completed_appointments)
    
    return {
        "client_id": client_id,
        "total_visits": total_visits,
        "total_spent": total_spent,
        "average_ticket": average_ticket,
        "no_show_count": no_shows,
        "cancellation_count": cancellations,
        "visit_frequency_days": visit_frequency_days,
        "customer_type": customer_type,
        "last_visit_date": last_visit_date,
        "days_since_last_visit": days_since_last_visit,
        "total_scheduled": total_scheduled,
        "completion_rate": (total_visits / total_scheduled) if total_scheduled > 0 else 0,
        "booking_patterns": booking_patterns
    }


def determine_customer_type(
    total_visits: int, 
    total_spent: float, 
    no_shows: int, 
    cancellations: int,
    last_visit: Optional[datetime]
) -> str:
    """Determine customer type based on engagement metrics."""
    # VIP criteria: high value, frequent visits, low cancellations
    if total_spent > 500 and total_visits >= 10 and (no_shows + cancellations) / max(total_visits, 1) < 0.1:
        return "vip"
    
    # At risk criteria: recent no-shows/cancellations or long absence
    if last_visit:
        # Handle timezone-naive datetime objects from database
        if last_visit.tzinfo is None:
            last_visit = last_visit.replace(tzinfo=timezone.utc)
        days_since_visit = (datetime.now(timezone.utc) - last_visit).days
        if days_since_visit > 90 or (no_shows + cancellations) >= 3:
            return "at_risk"
    
    # Returning customer: at least 2 completed visits
    if total_visits >= 2:
        return "returning"
    
    # Default for new customers
    return "new"


def analyze_booking_patterns(appointments: List[Appointment]) -> Dict[str, Any]:
    """Analyze customer booking patterns for insights."""
    if not appointments:
        return {}
    
    # Preferred days of week
    day_counts = {}
    for apt in appointments:
        day = apt.start_time.strftime("%A")
        day_counts[day] = day_counts.get(day, 0) + 1
    
    preferred_day = max(day_counts, key=day_counts.get) if day_counts else None
    
    # Preferred times
    hour_counts = {}
    for apt in appointments:
        hour = apt.start_time.hour
        hour_counts[hour] = hour_counts.get(hour, 0) + 1
    
    preferred_hour = max(hour_counts, key=hour_counts.get) if hour_counts else None
    
    # Service preferences
    service_counts = {}
    for apt in appointments:
        service = apt.service_name
        service_counts[service] = service_counts.get(service, 0) + 1
    
    preferred_service = max(service_counts, key=service_counts.get) if service_counts else None
    
    return {
        "preferred_day": preferred_day,
        "preferred_hour": preferred_hour,
        "preferred_service": preferred_service,
        "day_distribution": day_counts,
        "hour_distribution": hour_counts,
        "service_distribution": service_counts
    }


def update_client_metrics(db: Session, client_id: int) -> Client:
    """Update client metrics based on latest appointment data."""
    analytics = get_client_analytics(db, client_id)
    
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise ValueError("Client not found")
    
    # Update metrics
    client.total_visits = analytics["total_visits"]
    client.total_spent = analytics["total_spent"]
    client.average_ticket = analytics["average_ticket"]
    client.no_show_count = analytics["no_show_count"]
    client.cancellation_count = analytics["cancellation_count"]
    client.visit_frequency_days = analytics["visit_frequency_days"]
    client.customer_type = analytics["customer_type"]
    client.last_visit_date = analytics["last_visit_date"]
    client.updated_at = datetime.now(timezone.utc)
    
    # Set first visit date if this is the first completed appointment
    if analytics["total_visits"] == 1 and analytics["last_visit_date"]:
        client.first_visit_date = analytics["last_visit_date"]
    
    db.commit()
    db.refresh(client)
    
    logger.info(f"Updated metrics for client {client.id}: {analytics['customer_type']}, {analytics['total_visits']} visits")
    return client


def get_client_recommendations(db: Session, client_id: int) -> Dict[str, Any]:
    """Get personalized recommendations for a client."""
    analytics = get_client_analytics(db, client_id)
    recommendations = []
    
    # Recommend based on patterns
    patterns = analytics.get("booking_patterns", {})
    
    if patterns.get("preferred_day"):
        recommendations.append({
            "type": "scheduling",
            "title": "Preferred Day",
            "message": f"This client usually books on {patterns['preferred_day']}s",
            "action": "Consider suggesting this day for future appointments"
        })
    
    if patterns.get("preferred_service"):
        recommendations.append({
            "type": "service",
            "title": "Favorite Service",
            "message": f"Usually books: {patterns['preferred_service']}",
            "action": "Consider offering upgrades or related services"
        })
    
    # Risk-based recommendations
    if analytics["customer_type"] == "at_risk":
        recommendations.append({
            "type": "retention",
            "title": "At-Risk Client",
            "message": "This client may need special attention",
            "action": "Consider outreach or special offers"
        })
    
    if analytics["customer_type"] == "vip":
        recommendations.append({
            "type": "vip",
            "title": "VIP Client",
            "message": "High-value client deserving premium treatment",
            "action": "Ensure excellent service and consider exclusive offers"
        })
    
    # Frequency recommendations
    if analytics.get("days_since_last_visit", 0) > analytics.get("visit_frequency_days", 30):
        recommendations.append({
            "type": "follow_up",
            "title": "Overdue Visit",
            "message": "Client is overdue for their usual appointment",
            "action": "Consider sending a friendly reminder"
        })
    
    return {
        "client_id": client_id,
        "recommendations": recommendations,
        "analytics_summary": {
            "customer_type": analytics["customer_type"],
            "total_visits": analytics["total_visits"],
            "average_ticket": analytics["average_ticket"],
            "completion_rate": analytics["completion_rate"]
        }
    }


def search_clients_advanced(
    db: Session, 
    query: str = None, 
    customer_type: str = None,
    tags: str = None,
    min_visits: int = None,
    max_days_since_visit: int = None,
    limit: int = 50
) -> List[Client]:
    """Advanced client search with multiple filters."""
    query_obj = db.query(Client)
    
    # Text search
    if query:
        search_filter = or_(
            Client.first_name.ilike(f"%{query}%"),
            Client.last_name.ilike(f"%{query}%"),
            Client.email.ilike(f"%{query}%"),
            Client.phone.ilike(f"%{query}%")
        )
        query_obj = query_obj.filter(search_filter)
    
    # Customer type filter
    if customer_type:
        query_obj = query_obj.filter(Client.customer_type == customer_type)
    
    # Tags filter
    if tags:
        query_obj = query_obj.filter(Client.tags.ilike(f"%{tags}%"))
    
    # Visit count filter
    if min_visits is not None:
        query_obj = query_obj.filter(Client.total_visits >= min_visits)
    
    # Recent activity filter
    if max_days_since_visit is not None:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=max_days_since_visit)
        query_obj = query_obj.filter(Client.last_visit_date >= cutoff_date)
    
    return query_obj.limit(limit).all()


def get_client_communication_preferences(db: Session, client_id: int) -> Dict[str, Any]:
    """Get client communication preferences."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise ValueError("Client not found")
    
    # Default preferences if not set
    default_prefs = {
        "sms": True,
        "email": True,
        "marketing": False,
        "reminders": True,
        "confirmations": True
    }
    
    prefs = client.communication_preferences or default_prefs
    
    return {
        "client_id": client_id,
        "preferences": prefs,
        "contact_info": {
            "email": client.email,
            "phone": client.phone,
            "email_enabled": client.email_enabled,
            "sms_enabled": client.sms_enabled,
            "marketing_enabled": client.marketing_enabled
        }
    }


def update_client_communication_preferences(
    db: Session, 
    client_id: int, 
    preferences: Dict[str, Any]
) -> Client:
    """Update client communication preferences."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise ValueError("Client not found")
    
    # Update communication preferences
    current_prefs = client.communication_preferences or {}
    current_prefs.update(preferences)
    client.communication_preferences = current_prefs
    
    # Update boolean flags for backward compatibility
    if "sms" in preferences:
        client.sms_enabled = preferences["sms"]
    if "email" in preferences:
        client.email_enabled = preferences["email"]
    if "marketing" in preferences:
        client.marketing_enabled = preferences["marketing"]
    
    client.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(client)
    
    logger.info(f"Updated communication preferences for client {client.id}")
    return client


def add_client_note(
    db: Session, 
    client_id: int, 
    note: str, 
    added_by_id: int,
    note_type: str = "general"
) -> Dict[str, Any]:
    """Add a note to a client's record."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise ValueError("Client not found")
    
    # Get current notes (stored as text in the model)
    current_notes = client.notes or ""
    
    # Create timestamp and user info
    user = db.query(User).filter(User.id == added_by_id).first()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    author = user.name if user else f"User {added_by_id}"
    
    # Format new note
    new_note = f"[{timestamp}] ({note_type.upper()}) {author}: {note}"
    
    # Append to existing notes
    if current_notes:
        client.notes = f"{current_notes}\n{new_note}"
    else:
        client.notes = new_note
    
    client.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(client)
    
    logger.info(f"Added note to client {client.id} by user {added_by_id}")
    return {
        "client_id": client_id,
        "note": new_note,
        "timestamp": timestamp,
        "author": author
    }


def update_client_tags(
    db: Session, 
    client_id: int, 
    tags: List[str]
) -> Client:
    """Update client tags."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise ValueError("Client not found")
    
    # Store tags as comma-separated string
    client.tags = ", ".join(tags) if tags else None
    client.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(client)
    
    logger.info(f"Updated tags for client {client.id}: {client.tags}")
    return client


def get_client_dashboard_metrics(db: Session) -> Dict[str, Any]:
    """Get dashboard metrics for client management."""
    total_clients = db.query(func.count(Client.id)).scalar()
    
    # Client type distribution
    type_distribution = db.query(
        Client.customer_type, 
        func.count(Client.id)
    ).group_by(Client.customer_type).all()
    
    # Recent activity
    recent_clients = db.query(Client).filter(
        Client.created_at >= datetime.now(timezone.utc) - timedelta(days=30)
    ).count()
    
    # At-risk clients
    at_risk_count = db.query(Client).filter(
        Client.customer_type == "at_risk"
    ).count()
    
    # VIP clients
    vip_count = db.query(Client).filter(
        Client.customer_type == "vip"
    ).count()
    
    # Average metrics
    avg_metrics = db.query(
        func.avg(Client.total_visits),
        func.avg(Client.total_spent),
        func.avg(Client.average_ticket)
    ).first()
    
    return {
        "total_clients": total_clients,
        "recent_new_clients": recent_clients,
        "at_risk_clients": at_risk_count,
        "vip_clients": vip_count,
        "type_distribution": dict(type_distribution),
        "average_visits": round(avg_metrics[0] or 0, 1),
        "average_total_spent": round(avg_metrics[1] or 0, 2),
        "average_ticket": round(avg_metrics[2] or 0, 2)
    }