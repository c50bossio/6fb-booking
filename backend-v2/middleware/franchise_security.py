"""
Franchise Security Middleware for Enterprise-Scale BookedBarber V2
Enhances existing security middleware with franchise network capabilities
"""

from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Optional, List, Any, Tuple
import time
import json
import logging
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse

from models.franchise_security import (
    FranchiseNetwork, FranchiseRegion, FranchiseGroup, FranchiseSecurityPolicy,
    FranchiseSecurityContext, FranchiseSecurityEvent, SecurityZone, 
    ComplianceStandard, DataClassification, create_franchise_security_context,
    get_effective_security_policy, validate_compliance_requirements
)
from models import User, UnifiedUserRole
from database import SessionLocal
from utils.auth_simple import get_current_user_from_token

logger = logging.getLogger(__name__)


class FranchiseSecurityContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to establish franchise security context for requests
    Integrates with existing multi-tenancy middleware
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.exempt_paths = {
            "/docs", "/redoc", "/openapi.json", "/health",
            "/api/v2/auth/login", "/api/v2/auth/register",
            "/api/v2/auth/refresh", "/api/v2/auth/forgot-password"
        }
    
    async def dispatch(self, request: Request, call_next):
        """Establish franchise security context for request"""
        
        # Skip context establishment for exempt paths
        if self._is_exempt_path(request.url.path):
            return await call_next(request)
        
        # Detect franchise context from request
        franchise_context = await self._detect_franchise_context(request)
        
        # Attach franchise context to request state
        request.state.franchise_context = franchise_context
        
        # Log franchise context establishment
        logger.debug(f"Franchise context established: {franchise_context}")
        
        response = await call_next(request)
        return response
    
    def _is_exempt_path(self, path: str) -> bool:
        """Check if path is exempt from franchise context"""
        return any(path.startswith(exempt) for exempt in self.exempt_paths)
    
    async def _detect_franchise_context(self, request: Request) -> Dict[str, Any]:
        """Detect franchise context from request headers, domain, or user"""
        
        # Try to detect from custom headers first
        franchise_network_id = request.headers.get("X-Franchise-Network-ID")
        franchise_region_id = request.headers.get("X-Franchise-Region-ID")
        franchise_group_id = request.headers.get("X-Franchise-Group-ID")
        
        # Try to detect from subdomain
        if not franchise_network_id:
            franchise_network_id = await self._detect_from_domain(request)
        
        # Try to detect from user context
        if not franchise_network_id:
            franchise_network_id, franchise_region_id, franchise_group_id = await self._detect_from_user(request)
        
        # Get location_id from existing multi-tenancy system
        location_id = getattr(request.state, "location_id", None)
        user = getattr(request.state, "user", None)
        if user and hasattr(user, "location_id"):
            location_id = user.location_id
        
        # Determine security zone based on available context
        security_zone = self._determine_security_zone(
            franchise_network_id, franchise_region_id, franchise_group_id, location_id
        )
        
        # Get compliance requirements
        compliance_requirements = await self._get_compliance_requirements(
            franchise_network_id, franchise_region_id
        )
        
        return create_franchise_security_context(
            franchise_network_id=franchise_network_id,
            franchise_region_id=franchise_region_id,
            franchise_group_id=franchise_group_id,
            location_id=location_id,
            security_zone=security_zone,
            compliance_requirements=compliance_requirements,
            data_classification=DataClassification.INTERNAL
        )
    
    async def _detect_from_domain(self, request: Request) -> Optional[str]:
        """Detect franchise network from domain/subdomain"""
        
        host = request.headers.get("host", "")
        if not host:
            return None
        
        # Parse subdomain (e.g., franchise1.bookedbarber.com)
        parts = host.split(".")
        if len(parts) >= 3 and parts[-2] == "bookedbarber":
            subdomain = parts[0]
            
            # Look up franchise network by subdomain
            db = SessionLocal()
            try:
                franchise = db.query(FranchiseNetwork).filter(
                    FranchiseNetwork.slug == subdomain,
                    FranchiseNetwork.is_active == True
                ).first()
                
                if franchise:
                    return str(franchise.id)
            finally:
                db.close()
        
        return None
    
    async def _detect_from_user(self, request: Request) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """Detect franchise context from authenticated user"""
        
        # Try to get user from existing auth system
        user = getattr(request.state, "user", None)
        
        if not user:
            # Try to extract from authorization header
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                try:
                    user = await get_current_user_from_token(token)
                except:
                    pass
        
        if not user:
            return None, None, None
        
        # For enterprise owners, look up their franchise network
        if user.unified_role == UnifiedUserRole.ENTERPRISE_OWNER.value:
            db = SessionLocal()
            try:
                # This would require a relationship between users and franchise networks
                # For now, return None - this would be implemented based on business logic
                pass
            finally:
                db.close()
        
        return None, None, None
    
    def _determine_security_zone(self, franchise_network_id: Optional[str],
                               franchise_region_id: Optional[str],
                               franchise_group_id: Optional[str],
                               location_id: Optional[int]) -> SecurityZone:
        """Determine appropriate security zone based on context"""
        
        if location_id:
            return SecurityZone.LOCAL
        elif franchise_group_id:
            return SecurityZone.GROUP
        elif franchise_region_id:
            return SecurityZone.REGIONAL
        elif franchise_network_id:
            return SecurityZone.NETWORK
        else:
            return SecurityZone.GLOBAL
    
    async def _get_compliance_requirements(self, franchise_network_id: Optional[str],
                                         franchise_region_id: Optional[str]) -> List[ComplianceStandard]:
        """Get applicable compliance requirements for franchise context"""
        
        compliance_reqs = []
        
        if not franchise_network_id:
            return compliance_reqs
        
        db = SessionLocal()
        try:
            # Get network-level compliance requirements
            franchise_network = db.query(FranchiseNetwork).filter(
                FranchiseNetwork.id == franchise_network_id
            ).first()
            
            if franchise_network and franchise_network.compliance_requirements:
                network_reqs = franchise_network.compliance_requirements
                compliance_reqs.extend([
                    ComplianceStandard(req) for req in network_reqs 
                    if req in [std.value for std in ComplianceStandard]
                ])
            
            # Get regional compliance requirements
            if franchise_region_id:
                franchise_region = db.query(FranchiseRegion).filter(
                    FranchiseRegion.id == franchise_region_id
                ).first()
                
                if franchise_region and franchise_region.compliance_standards:
                    regional_reqs = franchise_region.compliance_standards
                    compliance_reqs.extend([
                        ComplianceStandard(req) for req in regional_reqs 
                        if req in [std.value for std in ComplianceStandard]
                    ])
        
        finally:
            db.close()
        
        return list(set(compliance_reqs))  # Remove duplicates


class FranchiseAuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Enhanced authentication middleware with franchise-aware SSO support
    Integrates with existing authentication system
    """
    
    def __init__(self, app, sso_providers: Optional[Dict[str, Any]] = None):
        super().__init__(app)
        self.sso_providers = sso_providers or {}
        
    async def dispatch(self, request: Request, call_next):
        """Handle franchise-aware authentication"""
        
        # Get franchise context established by previous middleware
        franchise_context = getattr(request.state, "franchise_context", {})
        
        # Check if franchise requires SSO
        if await self._requires_sso_authentication(franchise_context):
            return await self._handle_sso_authentication(request, franchise_context)
        
        # Continue with standard authentication
        response = await call_next(request)
        return response
    
    async def _requires_sso_authentication(self, franchise_context: Dict[str, Any]) -> bool:
        """Check if franchise network requires SSO authentication"""
        
        franchise_network_id = franchise_context.get("franchise_network_id")
        if not franchise_network_id:
            return False
        
        db = SessionLocal()
        try:
            franchise = db.query(FranchiseNetwork).filter(
                FranchiseNetwork.id == franchise_network_id
            ).first()
            
            if franchise and franchise.sso_provider_config:
                return franchise.sso_provider_config.get("enabled", False)
        
        finally:
            db.close()
        
        return False
    
    async def _handle_sso_authentication(self, request: Request, 
                                       franchise_context: Dict[str, Any]) -> Response:
        """Handle SSO authentication for franchise network"""
        
        # This would implement SAML/OAuth SSO flow
        # For now, return a placeholder response
        logger.info(f"SSO authentication required for franchise: {franchise_context.get('franchise_network_id')}")
        
        # Check for SSO token in headers
        sso_token = request.headers.get("X-SSO-Token")
        if not sso_token:
            raise HTTPException(
                status_code=401,
                detail="SSO authentication required",
                headers={"WWW-Authenticate": "SSO"}
            )
        
        # Validate SSO token (implementation would go here)
        # For now, assume valid and continue
        return await self.app(request.scope, request.receive, request._send)


class FranchiseComplianceMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce compliance requirements for franchise operations
    """
    
    def __init__(self, app):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next):
        """Enforce compliance requirements for request"""
        
        # Get franchise context
        franchise_context = getattr(request.state, "franchise_context", {})
        
        if not franchise_context.get("compliance_requirements"):
            return await call_next(request)
        
        # Validate compliance requirements
        compliance_violations = await self._validate_compliance(request, franchise_context)
        
        if compliance_violations:
            logger.warning(f"Compliance violations detected: {compliance_violations}")
            raise HTTPException(
                status_code=403,
                detail=f"Operation violates compliance requirements: {', '.join(compliance_violations)}"
            )
        
        response = await call_next(request)
        
        # Log compliance-relevant operations
        await self._log_compliance_operation(request, response, franchise_context)
        
        return response
    
    async def _validate_compliance(self, request: Request, 
                                 franchise_context: Dict[str, Any]) -> List[str]:
        """Validate compliance requirements for request"""
        
        violations = []
        
        # Determine operation type and data types involved
        operation = self._classify_operation(request.url.path, request.method)
        data_types = await self._classify_data_types(request)
        
        # Validate using utility function from models
        violations = validate_compliance_requirements(
            franchise_context, operation, data_types
        )
        
        return violations
    
    def _classify_operation(self, path: str, method: str) -> str:
        """Classify the type of operation being performed"""
        
        if "/admin/" in path or "/configuration/" in path:
            return "admin"
        elif "/payments/" in path:
            return "financial"
        elif method in ["POST", "PUT", "PATCH"]:
            if "/users/" in path or "/clients/" in path:
                return "pii_update"
            return "create_update"
        elif method == "DELETE":
            return "delete"
        else:
            return "read"
    
    async def _classify_data_types(self, request: Request) -> List[DataClassification]:
        """Classify data types involved in request"""
        
        data_types = [DataClassification.INTERNAL]  # Default
        
        path = request.url.path
        
        # Classify based on endpoint
        if "/payments/" in path or "/billing/" in path:
            data_types.append(DataClassification.FINANCIAL)
        
        if "/users/" in path or "/clients/" in path:
            data_types.append(DataClassification.PII)
        
        if "/health/" in path or "/medical/" in path:
            data_types.append(DataClassification.HEALTH)
        
        return data_types
    
    async def _log_compliance_operation(self, request: Request, response: Response,
                                      franchise_context: Dict[str, Any]):
        """Log operations for compliance audit trail"""
        
        # Create audit log entry
        audit_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "franchise_network_id": franchise_context.get("franchise_network_id"),
            "operation": f"{request.method} {request.url.path}",
            "status_code": response.status_code,
            "compliance_requirements": franchise_context.get("compliance_requirements", []),
            "user_id": getattr(request.state, "user", {}).get("id") if hasattr(request.state, "user") else None,
            "client_ip": request.client.host,
            "user_agent": request.headers.get("user-agent", "")
        }
        
        # Store in database for compliance reporting
        db = SessionLocal()
        try:
            security_event = FranchiseSecurityEvent(
                franchise_network_id=franchise_context.get("franchise_network_id"),
                event_type="compliance_audit",
                event_category="compliance",
                severity="low",
                event_description=f"Compliance audit: {request.method} {request.url.path}",
                event_data=audit_entry,
                source_ip=request.client.host,
                user_id=getattr(request.state, "user", {}).get("id") if hasattr(request.state, "user") else None
            )
            db.add(security_event)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to log compliance operation: {e}")
        finally:
            db.close()


class FranchiseRateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Enhanced rate limiting middleware with franchise network awareness
    Builds on existing EnhancedSecurityMiddleware rate limiting
    """
    
    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self.redis_client = redis_client
        
        # Franchise-aware rate limits
        self.franchise_rate_limits = {
            "enterprise": {
                "api_general": 1000,      # requests per minute
                "api_auth": 100,
                "api_payments": 200,
                "api_admin": 50
            },
            "premium": {
                "api_general": 500,
                "api_auth": 50,
                "api_payments": 100,
                "api_admin": 25
            },
            "standard": {
                "api_general": 200,
                "api_auth": 20,
                "api_payments": 50,
                "api_admin": 10
            },
            "basic": {
                "api_general": 100,
                "api_auth": 10,
                "api_payments": 25,
                "api_admin": 5
            }
        }
    
    async def dispatch(self, request: Request, call_next):
        """Apply franchise-aware rate limiting"""
        
        # Get franchise context
        franchise_context = getattr(request.state, "franchise_context", {})
        
        # Apply franchise-specific rate limiting
        if not await self._check_franchise_rate_limit(request, franchise_context):
            raise HTTPException(
                status_code=429,
                detail="Franchise rate limit exceeded",
                headers={"Retry-After": "60"}
            )
        
        return await call_next(request)
    
    async def _check_franchise_rate_limit(self, request: Request, 
                                        franchise_context: Dict[str, Any]) -> bool:
        """Check franchise-specific rate limits"""
        
        franchise_network_id = franchise_context.get("franchise_network_id")
        if not franchise_network_id:
            return True  # No franchise context, allow request
        
        # Get franchise tier
        franchise_tier = await self._get_franchise_tier(franchise_network_id)
        
        # Classify endpoint
        endpoint_class = self._classify_endpoint_for_rate_limiting(request.url.path)
        
        # Get rate limit for this franchise tier and endpoint
        rate_limit = self.franchise_rate_limits.get(franchise_tier, {}).get(endpoint_class, 100)
        
        # Create rate limiting key
        rate_limit_key = f"franchise_rate_limit:{franchise_network_id}:{endpoint_class}"
        
        # Check rate limit (implementation would use Redis or memory store)
        return await self._check_rate_limit_key(rate_limit_key, rate_limit)
    
    async def _get_franchise_tier(self, franchise_network_id: str) -> str:
        """Get franchise subscription tier"""
        
        # This would query the franchise network's subscription tier
        # For now, return a default tier
        return "standard"
    
    def _classify_endpoint_for_rate_limiting(self, path: str) -> str:
        """Classify endpoint for rate limiting purposes"""
        
        if "/auth/" in path:
            return "api_auth"
        elif "/payments/" in path or "/billing/" in path:
            return "api_payments"
        elif "/admin/" in path or "/enterprise/" in path:
            return "api_admin"
        else:
            return "api_general"
    
    async def _check_rate_limit_key(self, key: str, limit: int) -> bool:
        """Check rate limit for specific key"""
        
        if self.redis_client:
            try:
                current = self.redis_client.incr(key)
                if current == 1:
                    self.redis_client.expire(key, 60)  # 1 minute window
                return current <= limit
            except Exception as e:
                logger.error(f"Redis rate limiting error: {e}")
                return True  # Fail open
        
        # Fallback to allowing request if no Redis
        return True


def create_franchise_middleware_stack(app, redis_client=None, sso_providers=None):
    """
    Create franchise security middleware stack
    Integrates with existing middleware in main.py
    """
    
    # Add franchise middleware in correct order
    app.add_middleware(FranchiseRateLimitingMiddleware, redis_client=redis_client)
    app.add_middleware(FranchiseComplianceMiddleware)
    app.add_middleware(FranchiseAuthenticationMiddleware, sso_providers=sso_providers)
    app.add_middleware(FranchiseSecurityContextMiddleware)
    
    logger.info("Franchise security middleware stack configured")
    
    return app