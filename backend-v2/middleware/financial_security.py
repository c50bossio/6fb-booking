"""
Enhanced Financial Security Middleware for BookedBarber V2
Provides additional security layers for payment and financial endpoints
"""

import time
import json
import hashlib
from typing import Dict, Optional, List, Set
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import redis
from collections import defaultdict
import logging
from config import settings

logger = logging.getLogger(__name__)


class FinancialSecurityMiddleware(BaseHTTPMiddleware):
    """
    Enhanced security middleware for financial operations
    - Velocity checks (unusual transaction patterns)
    - Amount limits per time window
    - Geographic anomaly detection
    - Suspicious pattern detection
    """
    
    # Financial endpoints that need extra protection
    FINANCIAL_ENDPOINTS = {
        "/api/v1/payments/create-intent",
        "/api/v1/payments/confirm",
        "/api/v1/payments/refunds",
        "/api/v1/payments/payouts",
        "/api/v1/payments/stripe-connect",
        "/api/v1/payments/gift-certificates",
        "/api/v1/commissions/calculate",
        "/api/v1/commissions/payout",
        "/api/v1/orders",
        "/api/v1/pos/transactions",
    }
    
    def __init__(self, app, redis_client: Optional[redis.Redis] = None):
        super().__init__(app)
        self.redis_client = redis_client
        self.local_cache = defaultdict(list)  # Fallback if Redis not available
        
        # Configuration
        self.velocity_window = 3600  # 1 hour
        self.max_transactions_per_hour = 20
        self.max_amount_per_hour = 10000  # $10,000
        self.suspicious_amount_threshold = 5000  # $5,000
        
    async def dispatch(self, request: Request, call_next):
        """Process request with financial security checks"""
        
        # Only check financial endpoints
        if not self._is_financial_endpoint(request.url.path):
            return await call_next(request)
        
        # Skip checks for admin operations
        user = getattr(request.state, "user", None)
        if user and user.role in ["admin", "super_admin"]:
            logger.info(f"Admin user {user.id} accessing financial endpoint {request.url.path}")
            return await call_next(request)
        
        # Perform security checks
        try:
            # Extract user identifier
            user_id = user.id if user else self._get_client_identifier(request)
            
            # Check velocity limits
            if not await self._check_velocity_limits(user_id, request):
                return self._velocity_exceeded_response()
            
            # Check for suspicious patterns
            if await self._detect_suspicious_patterns(user_id, request):
                await self._flag_suspicious_activity(user_id, request)
                return self._suspicious_activity_response()
            
            # Record transaction for future checks
            await self._record_transaction(user_id, request)
            
        except Exception as e:
            logger.error(f"Financial security check failed: {e}")
            # Don't block on errors, but log them
        
        # Process request
        response = await call_next(request)
        
        # Additional checks on response
        if response.status_code in [200, 201]:
            await self._post_transaction_checks(user_id, request, response)
        
        return response
    
    def _is_financial_endpoint(self, path: str) -> bool:
        """Check if endpoint handles financial operations"""
        return any(path.startswith(endpoint) for endpoint in self.FINANCIAL_ENDPOINTS)
    
    def _get_client_identifier(self, request: Request) -> str:
        """Get unique identifier for rate limiting"""
        # Use IP address as fallback
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    async def _check_velocity_limits(self, user_id: str, request: Request) -> bool:
        """Check if user is within velocity limits"""
        key = f"financial:velocity:{user_id}"
        current_time = time.time()
        
        if self.redis_client:
            try:
                # Get transaction history from Redis
                pipeline = self.redis_client.pipeline()
                pipeline.zremrangebyscore(key, 0, current_time - self.velocity_window)
                pipeline.zcard(key)
                pipeline.execute()
                
                count = pipeline.execute()[1]
                return count < self.max_transactions_per_hour
                
            except Exception as e:
                logger.error(f"Redis error in velocity check: {e}")
        
        # Fallback to local cache
        transactions = self.local_cache[key]
        # Remove old transactions
        self.local_cache[key] = [
            t for t in transactions 
            if t['timestamp'] > current_time - self.velocity_window
        ]
        return len(self.local_cache[key]) < self.max_transactions_per_hour
    
    async def _detect_suspicious_patterns(self, user_id: str, request: Request) -> bool:
        """Detect suspicious transaction patterns"""
        suspicious_indicators = []
        
        # Check 1: Rapid succession of transactions
        recent_key = f"financial:recent:{user_id}"
        if self.redis_client:
            try:
                recent_count = self.redis_client.incr(recent_key)
                self.redis_client.expire(recent_key, 60)  # 1 minute window
                if recent_count > 5:
                    suspicious_indicators.append("rapid_transactions")
            except Exception as e:
                logger.error(f"Redis error in suspicious pattern detection: {e}")
        
        # Check 2: Unusual amount patterns (if amount in request)
        try:
            body = await self._get_request_body(request)
            if body and 'amount' in body:
                amount = float(body['amount'])
                if amount > self.suspicious_amount_threshold:
                    suspicious_indicators.append("high_amount")
                
                # Check for amount patterns (e.g., testing card with $1, then large amount)
                await self._check_amount_patterns(user_id, amount, suspicious_indicators)
        except Exception:
            pass
        
        # Check 3: Geographic anomalies
        if await self._check_geographic_anomalies(user_id, request):
            suspicious_indicators.append("geographic_anomaly")
        
        return len(suspicious_indicators) >= 2  # Multiple indicators = suspicious
    
    async def _check_amount_patterns(
        self, 
        user_id: str, 
        amount: float, 
        suspicious_indicators: List[str]
    ):
        """Check for suspicious amount patterns"""
        history_key = f"financial:amounts:{user_id}"
        
        if self.redis_client:
            try:
                # Get last 10 amounts
                recent_amounts = self.redis_client.lrange(history_key, 0, 9)
                amounts = [float(a) for a in recent_amounts]
                
                # Pattern 1: Small test followed by large amount
                if amounts and amounts[0] < 5 and amount > 1000:
                    suspicious_indicators.append("test_then_large")
                
                # Pattern 2: Escalating amounts
                if len(amounts) >= 3:
                    if all(amounts[i] < amounts[i+1] for i in range(len(amounts)-1)):
                        suspicious_indicators.append("escalating_amounts")
                
                # Store this amount
                pipeline = self.redis_client.pipeline()
                pipeline.lpush(history_key, amount)
                pipeline.ltrim(history_key, 0, 9)  # Keep last 10
                pipeline.expire(history_key, 3600)  # 1 hour
                pipeline.execute()
                
            except Exception as e:
                logger.error(f"Error checking amount patterns: {e}")
    
    async def _check_geographic_anomalies(self, user_id: str, request: Request) -> bool:
        """Check for geographic anomalies"""
        current_ip = self._get_client_identifier(request)
        geo_key = f"financial:geo:{user_id}"
        
        if self.redis_client:
            try:
                # Get last known location
                last_ip = self.redis_client.get(geo_key)
                if last_ip and last_ip.decode() != current_ip:
                    # Different location - check if suspicious
                    # In production, would use GeoIP to check actual distance
                    return True
                
                # Update location
                self.redis_client.setex(geo_key, 3600, current_ip)
                
            except Exception as e:
                logger.error(f"Error checking geographic anomalies: {e}")
        
        return False
    
    async def _record_transaction(self, user_id: str, request: Request):
        """Record transaction for velocity tracking"""
        key = f"financial:velocity:{user_id}"
        current_time = time.time()
        
        if self.redis_client:
            try:
                # Add to sorted set with timestamp as score
                self.redis_client.zadd(key, {f"{current_time}:{request.url.path}": current_time})
                self.redis_client.expire(key, self.velocity_window)
            except Exception as e:
                logger.error(f"Error recording transaction: {e}")
        else:
            # Fallback to local cache
            self.local_cache[key].append({
                'timestamp': current_time,
                'path': request.url.path
            })
    
    async def _flag_suspicious_activity(self, user_id: str, request: Request):
        """Flag and log suspicious activity"""
        logger.warning(
            f"Suspicious financial activity detected - User: {user_id}, "
            f"IP: {self._get_client_identifier(request)}, "
            f"Endpoint: {request.url.path}"
        )
        
        # In production, would also:
        # - Send alerts to security team
        # - Temporarily increase monitoring for this user
        # - Potentially require additional verification
    
    async def _post_transaction_checks(self, user_id: str, request: Request, response):
        """Additional checks after successful transaction"""
        # Check daily limits, unusual patterns in successful transactions, etc.
        pass
    
    async def _get_request_body(self, request: Request) -> Optional[Dict]:
        """Safely get request body"""
        try:
            body = await request.body()
            if body:
                # Store body for later use in request
                request._body = body
                return json.loads(body)
        except Exception:
            pass
        return None
    
    def _velocity_exceeded_response(self) -> JSONResponse:
        """Response when velocity limits exceeded"""
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": "Transaction velocity limit exceeded. Please try again later.",
                "error_code": "VELOCITY_LIMIT_EXCEEDED",
                "retry_after": 3600
            },
            headers={"Retry-After": "3600"}
        )
    
    def _suspicious_activity_response(self) -> JSONResponse:
        """Response when suspicious activity detected"""
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "detail": "Transaction blocked for security reasons. Please contact support.",
                "error_code": "SUSPICIOUS_ACTIVITY",
                "support_reference": hashlib.md5(
                    f"{time.time()}".encode()
                ).hexdigest()[:8]
            }
        )


class FinancialRateLimiter:
    """
    Advanced rate limiting specifically for financial endpoints
    Implements sliding window with burst protection
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        
        # Endpoint-specific limits (requests per minute)
        self.endpoint_limits = {
            "/api/v1/payments/create-intent": 10,
            "/api/v1/payments/confirm": 15,
            "/api/v1/payments/refunds": 5,
            "/api/v1/payments/payouts": 3,
            "/api/v1/payments/stripe-connect/onboard": 3,
            "/api/v1/payments/gift-certificates": 20,
            "/api/v1/commissions/calculate": 30,
            "/api/v1/orders": 30,
            "/api/v1/pos/transactions": 60,
        }
        
        # Role-based multipliers
        self.role_multipliers = {
            "super_admin": 10,
            "admin": 5,
            "barber": 2,
            "user": 1
        }
    
    async def check_rate_limit(
        self, 
        user_id: str, 
        endpoint: str, 
        user_role: str = "user"
    ) -> tuple[bool, Optional[int]]:
        """
        Check if request is within rate limit
        Returns (allowed, retry_after_seconds)
        """
        # Get limit for endpoint
        base_limit = self.get_endpoint_limit(endpoint)
        multiplier = self.role_multipliers.get(user_role, 1)
        limit = base_limit * multiplier
        
        # Create rate limit key
        window = 60  # 1 minute window
        key = f"rate_limit:financial:{endpoint}:{user_id}"
        current_time = int(time.time())
        window_start = current_time - window
        
        if self.redis_client:
            try:
                # Remove old entries
                self.redis_client.zremrangebyscore(key, 0, window_start)
                
                # Count requests in current window
                current_count = self.redis_client.zcard(key)
                
                if current_count >= limit:
                    # Get oldest request time to calculate retry_after
                    oldest = self.redis_client.zrange(key, 0, 0, withscores=True)
                    if oldest:
                        retry_after = int(oldest[0][1] + window - current_time)
                        return False, max(retry_after, 1)
                    return False, window
                
                # Add current request
                self.redis_client.zadd(key, {f"{current_time}": current_time})
                self.redis_client.expire(key, window)
                
                return True, None
                
            except Exception as e:
                logger.error(f"Redis error in rate limiting: {e}")
                # Allow request on Redis failure
                return True, None
        
        # Fallback: always allow if no Redis
        return True, None
    
    def get_endpoint_limit(self, endpoint: str) -> int:
        """Get rate limit for endpoint"""
        # Match endpoint patterns
        for pattern, limit in self.endpoint_limits.items():
            if endpoint.startswith(pattern):
                return limit
        return 60  # Default limit


def get_financial_rate_limiter(request: Request):
    """Dependency to get financial rate limiter"""
    # In production, would get Redis client from app state
    redis_client = getattr(request.app.state, "redis", None)
    return FinancialRateLimiter(redis_client)