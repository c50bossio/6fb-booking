"""
Request validation middleware to enforce size limits and validate JSON depth.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import json
from utils.input_validation import validate_json_depth, ValidationError

class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Middleware to validate incoming requests."""
    
    def __init__(self, app, max_body_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_body_size = max_body_size
    
    async def dispatch(self, request: Request, call_next):
        # Check content length
        content_length = request.headers.get('content-length')
        if content_length and int(content_length) > self.max_body_size:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={"error": "Request body too large"}
            )
        
        # For JSON requests, validate depth
        if request.headers.get('content-type') == 'application/json':
            try:
                # Read body
                body = await request.body()
                if body:
                    # Parse JSON and validate depth
                    data = json.loads(body)
                    validate_json_depth(data)
                    
                    # Store the parsed data for use in endpoint
                    request.state.json_data = data
            except json.JSONDecodeError:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Invalid JSON"}
                )
            except ValidationError as e:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": str(e)}
                )
        
        response = await call_next(request)
        return response
