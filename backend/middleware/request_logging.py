"""
Request logging middleware with performance tracking
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
import uuid
from typing import Callable

from utils.logging import log_api_request, log_performance_issue
from utils.security import get_client_ip
from api.v1.auth import get_current_user
from config.settings import settings


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Enhanced request logging with performance tracking"""

    async def dispatch(self, request: Request, call_next: Callable):
        # Skip logging for health checks and docs
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # Generate or get request ID
        request_id = getattr(request.state, "request_id", None)
        if not request_id:
            request_id = str(uuid.uuid4())
            request.state.request_id = request_id

        # Track request start time
        start_time = time.time()

        # Get client IP
        client_ip = get_client_ip(request)

        # Get user ID if authenticated (from token)
        user_id = None
        try:
            # This is a simplified check - in production, extract from JWT
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                # In real implementation, decode JWT to get user_id
                pass
        except:
            pass

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log the request
        log_api_request(
            method=request.method,
            path=str(request.url.path),
            status_code=response.status_code,
            duration=duration,
            user_id=user_id,
            ip_address=client_ip,
            request_id=request_id,
        )

        # Check for slow requests
        threshold = 1.0  # 1 second threshold
        if duration > threshold:
            log_performance_issue(
                operation=f"{request.method} {request.url.path}",
                duration=duration,
                threshold=threshold,
                details={
                    "request_id": request_id,
                    "ip_address": client_ip,
                    "user_id": user_id,
                },
            )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(duration)

        return response
