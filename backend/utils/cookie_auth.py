"""
Cookie-based authentication utilities
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import jwt
from fastapi import Request, Response, HTTPException, status
from fastapi.security import HTTPBearer
import logging

logger = logging.getLogger(__name__)

# Cookie name constants
ACCESS_TOKEN_COOKIE_NAME = "access_token"
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"
SESSION_COOKIE_NAME = "session"
CSRF_TOKEN_COOKIE_NAME = "csrf_token"


class CookieAuthManager:
    """Manages cookie-based authentication"""

    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.cookie_name = "auth_token"
        self.cookie_max_age = 24 * 60 * 60  # 24 hours

    def create_auth_cookie(
        self,
        response: Response,
        user_data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
    ) -> None:
        """Create and set authentication cookie"""
        if not expires_delta:
            expires_delta = timedelta(hours=24)

        expire = datetime.utcnow() + expires_delta

        to_encode = user_data.copy()
        to_encode.update({"exp": expire})

        try:
            encoded_jwt = jwt.encode(
                to_encode, self.secret_key, algorithm=self.algorithm
            )

            response.set_cookie(
                key=self.cookie_name,
                value=encoded_jwt,
                max_age=self.cookie_max_age,
                expires=expire,
                path="/",
                domain=None,
                secure=False,  # Set to True in production with HTTPS
                httponly=True,
                samesite="lax",
            )

            logger.info(
                f"Auth cookie created for user: {user_data.get('user_id', 'unknown')}"
            )

        except Exception as e:
            logger.error(f"Failed to create auth cookie: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create authentication cookie",
            )

    def get_auth_data_from_cookie(self, request: Request) -> Optional[Dict[str, Any]]:
        """Extract authentication data from cookie"""
        token = request.cookies.get(self.cookie_name)

        if not token:
            return None

        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload

        except jwt.ExpiredSignatureError:
            logger.warning("Auth cookie expired")
            return None
        except jwt.JWTError as e:
            logger.warning(f"Invalid auth cookie: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Failed to decode auth cookie: {str(e)}")
            return None

    def clear_auth_cookie(self, response: Response) -> None:
        """Clear authentication cookie"""
        response.delete_cookie(key=self.cookie_name, path="/", domain=None)
        logger.info("Auth cookie cleared")

    def is_authenticated(self, request: Request) -> bool:
        """Check if request has valid authentication cookie"""
        auth_data = self.get_auth_data_from_cookie(request)
        return auth_data is not None


# Helper functions for backward compatibility
def create_secure_cookie(
    response: Response,
    name: str,
    value: str,
    max_age: int = 86400,
    secure: bool = False,
    httponly: bool = True,
    samesite: str = "lax",
) -> None:
    """Create a secure cookie with proper settings"""
    response.set_cookie(
        key=name,
        value=value,
        max_age=max_age,
        path="/",
        secure=secure,
        httponly=httponly,
        samesite=samesite,
    )


def clear_cookie(response: Response, name: str) -> None:
    """Clear a cookie"""
    response.delete_cookie(key=name, path="/")


def get_cookie_value(request: Request, name: str) -> Optional[str]:
    """Get cookie value from request"""
    return request.cookies.get(name)


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: Optional[str] = None,
    csrf_token: Optional[str] = None,
    max_age: int = 86400,
) -> None:
    """Set authentication cookies for tokens"""
    # Set access token cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=max_age,
        path="/",
        secure=False,  # Set to True in production with HTTPS
        httponly=True,
        samesite="lax",
    )

    # Set refresh token cookie if provided
    if refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=max_age * 7,  # Refresh token lasts 7x longer
            path="/",
            secure=False,  # Set to True in production with HTTPS
            httponly=True,
            samesite="lax",
        )

    # Set CSRF token cookie if provided
    if csrf_token:
        set_csrf_cookie(response, csrf_token)


def clear_auth_cookies(response: Response) -> None:
    """Clear all authentication cookies"""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="auth_token", path="/")


def get_token_from_cookie(
    request: Request, token_type: str = "access_token"
) -> Optional[str]:
    """Get token from cookie"""
    return request.cookies.get(token_type)


def set_session_cookie(
    response: Response, session_data: Dict[str, Any], max_age: int = 86400
) -> None:
    """Set session cookie with data"""
    import json

    session_json = json.dumps(session_data)
    response.set_cookie(
        key="session",
        value=session_json,
        max_age=max_age,
        path="/",
        secure=False,  # Set to True in production with HTTPS
        httponly=True,
        samesite="lax",
    )


def get_session_from_cookie(request: Request) -> Optional[Dict[str, Any]]:
    """Get session data from cookie"""
    import json

    session_json = request.cookies.get("session")
    if not session_json:
        return None

    try:
        return json.loads(session_json)
    except json.JSONDecodeError:
        return None


def generate_csrf_token() -> str:
    """Generate a CSRF token"""
    import secrets

    return secrets.token_urlsafe(32)


def set_csrf_cookie(response: Response, token: str) -> None:
    """Set CSRF token cookie"""
    response.set_cookie(
        key="csrf_token",
        value=token,
        max_age=86400,  # 24 hours
        path="/",
        secure=False,  # Set to True in production with HTTPS
        httponly=False,  # Allow JavaScript access for CSRF
        samesite="lax",
    )


def get_csrf_token_from_cookie(request: Request) -> Optional[str]:
    """Get CSRF token from cookie"""
    return request.cookies.get("csrf_token")


class CookieJWTBearer(HTTPBearer):
    """JWT Bearer authentication that checks cookies instead of headers"""

    def __init__(
        self, secret_key: str, algorithm: str = "HS256", auto_error: bool = True
    ):
        super().__init__(auto_error=auto_error)
        self.secret_key = secret_key
        self.algorithm = algorithm

    async def __call__(self, request: Request) -> Optional[str]:
        # First try to get token from Authorization header (standard)
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            return authorization.split(" ")[1]

        # Fallback to cookie
        token = get_token_from_cookie(request, "access_token")
        if not token:
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return None

        # Validate token
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return token
        except jwt.ExpiredSignatureError:
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return None
        except jwt.JWTError:
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return None
