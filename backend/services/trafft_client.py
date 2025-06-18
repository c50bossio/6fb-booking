"""
Trafft API Client
Handles authentication and API calls to Trafft booking system
"""
import httpx
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging
from config.settings import settings

logger = logging.getLogger(__name__)

class TrafftAPIError(Exception):
    """Custom exception for Trafft API errors"""
    pass

class TrafftClient:
    """Client for interacting with Trafft API"""
    
    def __init__(self, api_key: str, base_url: str = "https://api.trafft.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = None
        self._authenticated = False
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )
        await self.authenticate()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.aclose()
    
    async def authenticate(self) -> bool:
        """Authenticate with Trafft API"""
        try:
            response = await self.session.get(f"{self.base_url}/auth/me")
            response.raise_for_status()
            self._authenticated = True
            logger.info("Successfully authenticated with Trafft API")
            return True
        except httpx.HTTPError as e:
            logger.error(f"Trafft authentication failed: {e}")
            self._authenticated = False
            raise TrafftAPIError(f"Authentication failed: {e}")
    
    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make authenticated request to Trafft API"""
        if not self._authenticated:
            await self.authenticate()
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            response = await self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Trafft API request failed: {method} {url} - {e}")
            raise TrafftAPIError(f"API request failed: {e}")
    
    # APPOINTMENT METHODS
    async def get_appointments(self, start_date: datetime, end_date: datetime, 
                             employee_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get appointments for date range"""
        params = {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat()
        }
        if employee_id:
            params["employeeId"] = employee_id
        
        response = await self._make_request("GET", "/appointments", params=params)
        return response.get("data", [])
    
    async def get_appointment(self, appointment_id: int) -> Dict[str, Any]:
        """Get single appointment by ID"""
        response = await self._make_request("GET", f"/appointments/{appointment_id}")
        return response.get("data", {})
    
    async def create_appointment(self, appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new appointment"""
        response = await self._make_request("POST", "/appointments", json=appointment_data)
        return response.get("data", {})
    
    async def update_appointment(self, appointment_id: int, 
                               appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing appointment"""
        response = await self._make_request(
            "PUT", f"/appointments/{appointment_id}", json=appointment_data
        )
        return response.get("data", {})
    
    async def cancel_appointment(self, appointment_id: int, reason: str = "") -> bool:
        """Cancel appointment"""
        data = {"status": "cancelled", "cancellationReason": reason}
        response = await self._make_request(
            "PUT", f"/appointments/{appointment_id}/status", json=data
        )
        return response.get("success", False)
    
    # CUSTOMER METHODS
    async def get_customers(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get customer list"""
        params = {"limit": limit, "offset": offset}
        response = await self._make_request("GET", "/customers", params=params)
        return response.get("data", [])
    
    async def get_customer(self, customer_id: int) -> Dict[str, Any]:
        """Get single customer by ID"""
        response = await self._make_request("GET", f"/customers/{customer_id}")
        return response.get("data", {})
    
    async def create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new customer"""
        response = await self._make_request("POST", "/customers", json=customer_data)
        return response.get("data", {})
    
    # SERVICE METHODS
    async def get_services(self) -> List[Dict[str, Any]]:
        """Get all services"""
        response = await self._make_request("GET", "/services")
        return response.get("data", [])
    
    async def get_service(self, service_id: int) -> Dict[str, Any]:
        """Get single service by ID"""
        response = await self._make_request("GET", f"/services/{service_id}")
        return response.get("data", {})
    
    # EMPLOYEE METHODS
    async def get_employees(self) -> List[Dict[str, Any]]:
        """Get all employees/barbers"""
        response = await self._make_request("GET", "/employees")
        return response.get("data", [])
    
    async def get_employee(self, employee_id: int) -> Dict[str, Any]:
        """Get single employee by ID"""
        response = await self._make_request("GET", f"/employees/{employee_id}")
        return response.get("data", {})
    
    # WEBHOOK METHODS
    async def register_webhook(self, webhook_url: str, events: List[str]) -> Dict[str, Any]:
        """Register webhook for real-time updates"""
        data = {
            "url": webhook_url,
            "events": events,
            "active": True
        }
        response = await self._make_request("POST", "/webhooks", json=data)
        return response.get("data", {})
    
    async def get_webhooks(self) -> List[Dict[str, Any]]:
        """Get registered webhooks"""
        response = await self._make_request("GET", "/webhooks")
        return response.get("data", [])
    
    async def delete_webhook(self, webhook_id: int) -> bool:
        """Delete webhook"""
        response = await self._make_request("DELETE", f"/webhooks/{webhook_id}")
        return response.get("success", False)
    
    # ANALYTICS METHODS
    async def get_revenue_report(self, start_date: datetime, end_date: datetime,
                               employee_id: Optional[int] = None) -> Dict[str, Any]:
        """Get revenue analytics for period"""
        params = {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "type": "revenue"
        }
        if employee_id:
            params["employeeId"] = employee_id
        
        response = await self._make_request("GET", "/reports", params=params)
        return response.get("data", {})
    
    async def get_appointment_stats(self, start_date: datetime, end_date: datetime,
                                  employee_id: Optional[int] = None) -> Dict[str, Any]:
        """Get appointment statistics for period"""
        params = {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "type": "appointments"
        }
        if employee_id:
            params["employeeId"] = employee_id
        
        response = await self._make_request("GET", "/reports", params=params)
        return response.get("data", {})

# Singleton instance for global use
trafft_client = None

async def get_trafft_client() -> TrafftClient:
    """Get configured Trafft client instance"""
    global trafft_client
    
    if not trafft_client:
        api_key = getattr(settings, 'TRAFFT_API_KEY', None)
        if not api_key:
            raise TrafftAPIError("TRAFFT_API_KEY not configured")
        
        trafft_client = TrafftClient(api_key)
    
    return trafft_client

# Webhook event types that we want to listen for
WEBHOOK_EVENTS = [
    "appointment.created",
    "appointment.updated", 
    "appointment.cancelled",
    "appointment.completed",
    "customer.created",
    "customer.updated",
    "payment.completed"
]