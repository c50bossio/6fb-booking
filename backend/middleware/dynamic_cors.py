"""
Dynamic CORS middleware for handling Vercel's random deployment URLs
"""

from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Any, Sequence
import logging

logger = logging.getLogger(__name__)


class DynamicCORSMiddleware(CORSMiddleware):
    """
    Custom CORS middleware that dynamically validates origins
    to handle Vercel's random deployment URLs
    """

    def __init__(
        self,
        app: Any,
        allow_origins: Sequence[str] = (),
        allow_origin_regex: str = None,
        allow_methods: Sequence[str] = ("GET",),
        allow_headers: Sequence[str] = (),
        allow_credentials: bool = False,
        expose_headers: Sequence[str] = (),
        max_age: int = 600,
        settings=None,
    ) -> None:
        # Store settings reference for dynamic origin checking
        self.settings = settings

        # Call parent constructor
        super().__init__(
            app=app,
            allow_origins=allow_origins,
            allow_origin_regex=allow_origin_regex,
            allow_methods=allow_methods,
            allow_headers=allow_headers,
            allow_credentials=allow_credentials,
            expose_headers=expose_headers,
            max_age=max_age,
        )

    def is_allowed_origin(self, origin: str) -> bool:
        """
        Check if origin is allowed using both static list and dynamic patterns
        """
        # First check the parent's static origin checking
        if super().is_allowed_origin(origin):
            logger.info(f"Dynamic CORS: Allowed origin via parent: {origin}")
            return True

        # Quick Railway check before going to settings
        if self._is_railway_origin(origin):
            logger.info(f"Dynamic CORS: Allowed Railway origin: {origin}")
            return True

        # Then check our dynamic patterns if settings available
        if self.settings and hasattr(self.settings, "is_allowed_origin"):
            if self.settings.is_allowed_origin(origin):
                logger.info(f"Dynamic CORS: Allowed origin via settings: {origin}")
                return True

        logger.warning(f"Dynamic CORS: Rejected origin {origin}")
        return False

    def _is_railway_origin(self, origin: str) -> bool:
        """
        Quick check for Railway origins
        """
        if not origin:
            return False
            
        # Check for Railway domains
        if origin.startswith("https://") and (".railway.app" in origin or ".up.railway.app" in origin):
            return True
            
        # Check for specific known Railway URLs
        known_railway_urls = [
            "https://web-production-92a6c.up.railway.app",
            "https://6fb-booking-frontend.up.railway.app",
            "https://6fb-booking-backend.up.railway.app",
        ]
        return origin in known_railway_urls
