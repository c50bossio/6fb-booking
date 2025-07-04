"""
API v1 module initialization
Exports all router modules for easy importing
"""

from . import (
    analytics,
    appointments,
    auth,
    automation,
    barbers,
    booking,
    calendar,
    clients,
    customer_auth,
    customer_booking,
    locations,
    notifications,
    payouts,
    revenue,
    services,
    training,
    users,
    websocket,
)

__all__ = [
    "analytics",
    "appointments",
    "auth",
    "automation",
    "barbers",
    "booking",
    "calendar",
    "clients",
    "customer_auth",
    "customer_booking",
    "locations",
    "notifications",
    "payouts",
    "revenue",
    "services",
    "training",
    "users",
    "websocket",
]
