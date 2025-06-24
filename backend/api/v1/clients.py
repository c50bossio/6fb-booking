"""
Client management API router
Handles client CRUD operations and analytics
"""

from fastapi import APIRouter
from .endpoints.clients import router as clients_router

router = APIRouter()

# Include all client endpoints
router.include_router(clients_router, prefix="/clients", tags=["clients"])
