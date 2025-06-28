"""
Prometheus metrics endpoint
"""

from fastapi import APIRouter, Response
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from sqlalchemy.orm import Session
from datetime import datetime
import time

from config.database import get_db
from models.appointment import Appointment
from models.user import User
from models.barber import Barber

router = APIRouter()

# Define metrics
request_count = Counter(
    "fastapi_requests_total",
    "Total number of requests",
    ["method", "endpoint", "status"],
)

request_duration = Histogram(
    "fastapi_request_duration_seconds",
    "Request duration in seconds",
    ["method", "endpoint"],
)

active_users = Gauge("sixfb_active_users", "Number of active users", ["role"])

appointments_total = Gauge(
    "sixfb_appointments_total", "Total number of appointments", ["status"]
)

revenue_total = Gauge("sixfb_revenue_total", "Total revenue", ["period"])


class MetricsMiddleware:
    """Middleware to collect metrics"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            start_time = time.time()

            # Extract path and method
            path = scope["path"]
            method = scope["method"]

            # Process request
            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    status = message["status"]
                    duration = time.time() - start_time

                    # Record metrics
                    request_count.labels(
                        method=method, endpoint=path, status=status
                    ).inc()

                    request_duration.labels(method=method, endpoint=path).observe(
                        duration
                    )

                await send(message)

            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)


def update_business_metrics(db: Session):
    """Update business metrics"""
    try:
        # Active users by role
        for role in ["barber", "receptionist", "mentor", "admin"]:
            count = (
                db.query(User).filter(User.role == role, User.is_active == True).count()
            )
            active_users.labels(role=role).set(count)

        # Appointments by status
        for status in ["scheduled", "confirmed", "completed", "cancelled", "no_show"]:
            count = db.query(Appointment).filter(Appointment.status == status).count()
            appointments_total.labels(status=status).set(count)

        # Revenue metrics (example - adjust based on your model)
        today_revenue = (
            db.query(func.sum(Appointment.total_revenue))
            .filter(
                Appointment.status == "completed",
                Appointment.appointment_date == datetime.now().date(),
            )
            .scalar()
            or 0
        )

        revenue_total.labels(period="today").set(float(today_revenue))

    except Exception as e:
        print(f"Error updating business metrics: {e}")


@router.get("/metrics", response_class=Response)
async def get_metrics(db: Session = Depends(get_db)):
    """Prometheus metrics endpoint"""

    # Update business metrics
    update_business_metrics(db)

    # Generate metrics
    metrics = generate_latest()

    return Response(content=metrics, media_type=CONTENT_TYPE_LATEST)
