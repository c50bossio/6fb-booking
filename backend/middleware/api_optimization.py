"""
Advanced API Optimization Middleware
Rate limiting, request batching, response compression, and pagination
"""
import time
import json
import gzip
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict, deque
import asyncio
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.types import ASGIApp
from fastapi import HTTPException, status
import redis
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

# Rate limiting configurations
class RateLimitConfig:
    """Rate limiting configuration"""
    # Default limits per endpoint type
    DEFAULT_LIMITS = {
        'anonymous': {'requests': 100, 'window': 3600},  # 100 requests per hour
        'authenticated': {'requests': 1000, 'window': 3600},  # 1000 requests per hour
        'premium': {'requests': 5000, 'window': 3600},  # 5000 requests per hour
        'admin': {'requests': 10000, 'window': 3600},  # 10000 requests per hour
    }
    
    # Endpoint-specific limits
    ENDPOINT_LIMITS = {
        '/api/v1/auth/login': {'requests': 10, 'window': 300},  # 10 login attempts per 5 minutes
        '/api/v1/booking-public': {'requests': 50, 'window': 3600},  # 50 bookings per hour
        '/api/v1/payments': {'requests': 100, 'window': 3600},  # 100 payment requests per hour
        '/api/v1/webhooks': {'requests': 1000, 'window': 60},  # 1000 webhooks per minute
    }
    
    # IP-based limits
    IP_LIMITS = {
        'default': {'requests': 200, 'window': 3600},  # 200 requests per hour per IP
        'strict': {'requests': 50, 'window': 3600},  # 50 requests per hour for suspicious IPs
    }


class RateLimiter:
    """Advanced rate limiter with Redis backend"""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.memory_store = defaultdict(lambda: defaultdict(deque))
        self.config = RateLimitConfig()
        
    async def is_allowed(self, key: str, limit: int, window: int) -> tuple[bool, dict]:
        """Check if request is allowed and return rate limit info"""
        now = time.time()
        window_start = now - window
        
        if self.redis_client:
            return await self._redis_rate_limit(key, limit, window, now, window_start)
        else:
            return await self._memory_rate_limit(key, limit, window, now, window_start)
    
    async def _redis_rate_limit(self, key: str, limit: int, window: int, now: float, window_start: float) -> tuple[bool, dict]:
        """Redis-based rate limiting"""
        try:
            # Use Redis sorted set for sliding window
            pipe = self.redis_client.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(now): now})
            
            # Set expiration
            pipe.expire(key, window)
            
            results = pipe.execute()
            current_count = results[1]
            
            is_allowed = current_count < limit
            
            return is_allowed, {
                'allowed': is_allowed,
                'limit': limit,
                'remaining': max(0, limit - current_count - 1),
                'reset_time': int(now + window),
                'window': window
            }
            
        except Exception as e:
            logger.error(f"Redis rate limiting error: {str(e)}")
            # Fall back to memory-based rate limiting
            return await self._memory_rate_limit(key, limit, window, now, window_start)
    
    async def _memory_rate_limit(self, key: str, limit: int, window: int, now: float, window_start: float) -> tuple[bool, dict]:
        """Memory-based rate limiting"""
        requests = self.memory_store[key]['requests']
        
        # Remove old requests
        while requests and requests[0] < window_start:
            requests.popleft()
        
        # Add current request
        requests.append(now)
        
        is_allowed = len(requests) <= limit
        
        return is_allowed, {
            'allowed': is_allowed,
            'limit': limit,
            'remaining': max(0, limit - len(requests)),
            'reset_time': int(now + window),
            'window': window
        }


class RequestBatcher:
    """Batch similar requests to reduce database load"""
    
    def __init__(self, batch_size: int = 10, batch_timeout: float = 0.1):
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self.batches = defaultdict(list)
        self.batch_timers = {}
        
    async def add_request(self, batch_key: str, request_data: dict) -> Any:
        """Add request to batch and return result when batch is processed"""
        # Create future for this request
        future = asyncio.Future()
        request_info = {
            'data': request_data,
            'future': future,
            'timestamp': time.time()
        }
        
        self.batches[batch_key].append(request_info)
        
        # Check if batch is ready
        if len(self.batches[batch_key]) >= self.batch_size:
            await self._process_batch(batch_key)
        else:
            # Set timer if not already set
            if batch_key not in self.batch_timers:
                self.batch_timers[batch_key] = asyncio.create_task(
                    self._batch_timer(batch_key)
                )
        
        return await future
    
    async def _batch_timer(self, batch_key: str):
        """Timer for batch processing"""
        await asyncio.sleep(self.batch_timeout)
        if batch_key in self.batches and self.batches[batch_key]:
            await self._process_batch(batch_key)
    
    async def _process_batch(self, batch_key: str):
        """Process a batch of requests"""
        batch = self.batches.pop(batch_key, [])
        if batch_key in self.batch_timers:
            self.batch_timers[batch_key].cancel()
            del self.batch_timers[batch_key]
        
        if not batch:
            return
        
        try:
            # Process batch based on batch_key type
            if batch_key.startswith('db_'):
                results = await self._process_database_batch(batch_key, batch)
            elif batch_key.startswith('api_'):
                results = await self._process_api_batch(batch_key, batch)
            else:
                results = [None] * len(batch)
            
            # Return results to futures
            for i, request_info in enumerate(batch):
                if i < len(results):
                    request_info['future'].set_result(results[i])
                else:
                    request_info['future'].set_result(None)
                    
        except Exception as e:
            # Set exception for all futures
            for request_info in batch:
                request_info['future'].set_exception(e)
    
    async def _process_database_batch(self, batch_key: str, batch: List[dict]) -> List[Any]:
        """Process database batch operations"""
        # This would integrate with your database operations
        # For now, return empty results
        return [None] * len(batch)
    
    async def _process_api_batch(self, batch_key: str, batch: List[dict]) -> List[Any]:
        """Process API batch operations"""
        # This would integrate with external API calls
        # For now, return empty results
        return [None] * len(batch)


class ResponseCompressor:
    """Compress responses based on content type and size"""
    
    def __init__(self, min_size: int = 1024, compression_level: int = 6):
        self.min_size = min_size
        self.compression_level = compression_level
        self.compressible_types = {
            'application/json',
            'text/html',
            'text/plain',
            'text/css',
            'text/javascript',
            'application/javascript',
            'application/xml',
            'text/xml'
        }
    
    def should_compress(self, content_type: str, content_length: int) -> bool:
        """Check if response should be compressed"""
        return (
            content_type in self.compressible_types and
            content_length >= self.min_size
        )
    
    def compress(self, content: bytes) -> bytes:
        """Compress content using gzip"""
        return gzip.compress(content, compresslevel=self.compression_level)


class PaginationHelper:
    """Advanced pagination with performance optimizations"""
    
    @staticmethod
    def validate_pagination_params(page: int = 1, size: int = 20, max_size: int = 100) -> tuple[int, int]:
        """Validate and normalize pagination parameters"""
        page = max(1, page)
        size = max(1, min(size, max_size))
        return page, size
    
    @staticmethod
    def create_pagination_response(
        items: List[Any],
        total: int,
        page: int,
        size: int,
        request: Request
    ) -> dict:
        """Create standardized pagination response"""
        total_pages = (total + size - 1) // size
        has_next = page < total_pages
        has_prev = page > 1
        
        # Build URLs
        base_url = str(request.url).split('?')[0]
        query_params = dict(request.query_params)
        
        def build_url(page_num: int) -> str:
            query_params['page'] = str(page_num)
            query_params['size'] = str(size)
            query_string = '&'.join([f"{k}={v}" for k, v in query_params.items()])
            return f"{base_url}?{query_string}"
        
        return {
            'items': items,
            'pagination': {
                'page': page,
                'size': size,
                'total': total,
                'total_pages': total_pages,
                'has_next': has_next,
                'has_prev': has_prev,
                'next_url': build_url(page + 1) if has_next else None,
                'prev_url': build_url(page - 1) if has_prev else None,
            }
        }


class APIOptimizationMiddleware(BaseHTTPMiddleware):
    """Comprehensive API optimization middleware"""
    
    def __init__(
        self,
        app: ASGIApp,
        redis_client=None,
        enable_rate_limiting: bool = True,
        enable_compression: bool = True,
        enable_batching: bool = True
    ):
        super().__init__(app)
        self.redis_client = redis_client
        self.enable_rate_limiting = enable_rate_limiting
        self.enable_compression = enable_compression
        self.enable_batching = enable_batching
        
        # Initialize components
        self.rate_limiter = RateLimiter(redis_client) if enable_rate_limiting else None
        self.compressor = ResponseCompressor() if enable_compression else None
        self.batcher = RequestBatcher() if enable_batching else None
        
        # Performance metrics
        self.metrics = {
            'requests_total': 0,
            'requests_rate_limited': 0,
            'responses_compressed': 0,
            'requests_batched': 0,
            'avg_response_time': 0,
            'slow_requests': 0
        }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Main middleware dispatch"""
        start_time = time.time()
        self.metrics['requests_total'] += 1
        
        try:
            # Rate limiting
            if self.enable_rate_limiting and self.rate_limiter:
                rate_limit_result = await self._apply_rate_limiting(request)
                if not rate_limit_result['allowed']:
                    self.metrics['requests_rate_limited'] += 1
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            'error': 'Rate limit exceeded',
                            'limit': rate_limit_result['limit'],
                            'remaining': rate_limit_result['remaining'],
                            'reset_time': rate_limit_result['reset_time']
                        },
                        headers={
                            'X-RateLimit-Limit': str(rate_limit_result['limit']),
                            'X-RateLimit-Remaining': str(rate_limit_result['remaining']),
                            'X-RateLimit-Reset': str(rate_limit_result['reset_time']),
                            'Retry-After': str(rate_limit_result['window'])
                        }
                    )
            
            # Process request
            response = await call_next(request)
            
            # Response compression
            if self.enable_compression and self.compressor:
                response = await self._apply_compression(request, response)
            
            # Add performance headers
            response_time = time.time() - start_time
            response.headers['X-Response-Time'] = f"{response_time:.3f}s"
            
            # Update metrics
            self._update_metrics(response_time)
            
            return response
            
        except Exception as e:
            logger.error(f"API optimization middleware error: {str(e)}")
            response_time = time.time() - start_time
            self._update_metrics(response_time)
            raise
    
    async def _apply_rate_limiting(self, request: Request) -> dict:
        """Apply rate limiting to request"""
        # Get client identifier
        client_ip = self._get_client_ip(request)
        user_id = self._get_user_id(request)
        endpoint = request.url.path
        
        # Determine rate limit key and limits
        if user_id:
            user_type = self._get_user_type(request)
            limits = self.rate_limiter.config.DEFAULT_LIMITS.get(user_type, 
                    self.rate_limiter.config.DEFAULT_LIMITS['authenticated'])
            key = f"user:{user_id}:{endpoint}"
        else:
            limits = self.rate_limiter.config.DEFAULT_LIMITS['anonymous']
            key = f"ip:{client_ip}:{endpoint}"
        
        # Check endpoint-specific limits
        if endpoint in self.rate_limiter.config.ENDPOINT_LIMITS:
            endpoint_limits = self.rate_limiter.config.ENDPOINT_LIMITS[endpoint]
            limits = endpoint_limits
        
        # Apply rate limiting
        return await self.rate_limiter.is_allowed(
            key, limits['requests'], limits['window']
        )[1]
    
    async def _apply_compression(self, request: Request, response: Response) -> Response:
        """Apply response compression if appropriate"""
        # Check if client accepts gzip
        accept_encoding = request.headers.get('accept-encoding', '')
        if 'gzip' not in accept_encoding.lower():
            return response
        
        # Get response content
        content = b''
        async for chunk in response.body_iterator:
            content += chunk
        
        # Check if should compress
        content_type = response.headers.get('content-type', '')
        if not self.compressor.should_compress(content_type, len(content)):
            # Return original response
            return Response(
                content=content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        
        # Compress content
        compressed_content = self.compressor.compress(content)
        
        # Update metrics
        self.metrics['responses_compressed'] += 1
        
        # Create compressed response
        headers = dict(response.headers)
        headers['content-encoding'] = 'gzip'
        headers['content-length'] = str(len(compressed_content))
        headers['vary'] = 'Accept-Encoding'
        
        return Response(
            content=compressed_content,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check for forwarded headers first
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else 'unknown'
    
    def _get_user_id(self, request: Request) -> Optional[str]:
        """Extract user ID from request (if authenticated)"""
        # This would integrate with your authentication system
        auth_header = request.headers.get('authorization')
        if auth_header and auth_header.startswith('Bearer '):
            # Extract user ID from JWT token or session
            # For now, return None
            pass
        return None
    
    def _get_user_type(self, request: Request) -> str:
        """Determine user type for rate limiting"""
        # This would check user roles/permissions
        # For now, return default
        return 'authenticated'
    
    def _update_metrics(self, response_time: float):
        """Update performance metrics"""
        # Update average response time
        current_avg = self.metrics['avg_response_time']
        total_requests = self.metrics['requests_total']
        self.metrics['avg_response_time'] = (
            (current_avg * (total_requests - 1) + response_time) / total_requests
        )
        
        # Track slow requests
        if response_time > 2.0:  # Requests taking more than 2 seconds
            self.metrics['slow_requests'] += 1
    
    def get_metrics(self) -> dict:
        """Get current performance metrics"""
        return {
            **self.metrics,
            'rate_limit_hit_rate': (
                self.metrics['requests_rate_limited'] / 
                max(1, self.metrics['requests_total']) * 100
            ),
            'compression_rate': (
                self.metrics['responses_compressed'] / 
                max(1, self.metrics['requests_total']) * 100
            ),
            'timestamp': time.time()
        }


# Utility functions for pagination
async def paginate_query(query, page: int, size: int, count_query=None):
    """Paginate SQLAlchemy query with performance optimization"""
    from sqlalchemy.orm import Query
    
    # Validate parameters
    page, size = PaginationHelper.validate_pagination_params(page, size)
    
    # Calculate offset
    offset = (page - 1) * size
    
    # Get total count efficiently
    if count_query is not None:
        total = count_query.scalar()
    else:
        # Create count query from main query
        total = query.order_by(None).count()
    
    # Get items with limit and offset
    items = query.offset(offset).limit(size).all()
    
    return items, total, page, size


# Export main components
__all__ = [
    'APIOptimizationMiddleware',
    'RateLimiter',
    'RequestBatcher',
    'ResponseCompressor',
    'PaginationHelper',
    'paginate_query'
]