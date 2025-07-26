"""
Token Blacklist Service for secure logout and token invalidation.

This service provides comprehensive token blacklisting functionality to ensure
that tokens can be properly invalidated when users log out or when security
incidents require token revocation.
"""

import redis
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Set
from fastapi import HTTPException, status
from jose import jwt, JWTError
from config import settings

logger = logging.getLogger(__name__)

class TokenBlacklistService:
    """Service for managing blacklisted JWT tokens."""
    
    def __init__(self):
        """Initialize the token blacklist service."""
        try:
            # Try to connect to Redis if available
            self.redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            self.use_redis = True
            logger.info("Token blacklist using Redis for storage")
        except (redis.ConnectionError, redis.TimeoutError, AttributeError):
            # Fallback to in-memory storage for development
            self.blacklist_memory: Set[str] = set()
            self.use_redis = False
            logger.warning("Redis unavailable, using in-memory token blacklist")
    
    def _get_token_jti(self, token: str) -> Optional[str]:
        """Extract the JWT ID (jti) from a token for blacklisting."""
        try:
            # Don't verify signature here, just extract claims
            payload = jwt.get_unverified_claims(token)
            return payload.get("jti") or payload.get("sub")  # Fallback to subject if no jti
        except JWTError:
            return None
    
    def _get_token_expiry(self, token: str) -> Optional[datetime]:
        """Get the expiry time of a token."""
        try:
            payload = jwt.get_unverified_claims(token)
            exp_timestamp = payload.get("exp")
            if exp_timestamp:
                return datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        except (JWTError, ValueError):
            pass
        return None
    
    def blacklist_token(self, token: str, reason: str = "logout") -> bool:
        """
        Add a token to the blacklist.
        
        Args:
            token: JWT token to blacklist
            reason: Reason for blacklisting (logout, security, etc.)
            
        Returns:
            True if successfully blacklisted, False otherwise
        """
        try:
            token_id = self._get_token_jti(token)
            if not token_id:
                logger.warning("Could not extract token ID for blacklisting")
                return False
            
            expiry = self._get_token_expiry(token)
            
            if self.use_redis:
                # Store in Redis with TTL matching token expiry
                key = f"blacklist:{token_id}"
                value = {
                    "reason": reason,
                    "blacklisted_at": datetime.now(timezone.utc).isoformat(),
                    "token_type": "access"  # Could be enhanced to detect type
                }
                
                if expiry:
                    # Set TTL to token expiry time
                    ttl_seconds = int((expiry - datetime.now(timezone.utc)).total_seconds())
                    if ttl_seconds > 0:
                        self.redis_client.setex(key, ttl_seconds, str(value))
                    else:
                        # Token already expired, no need to blacklist
                        return True
                else:
                    # Default TTL of 24 hours if we can't determine expiry
                    self.redis_client.setex(key, 86400, str(value))
                    
                logger.info(f"Token {token_id[:8]}... blacklisted via Redis: {reason}")
            else:
                # Store in memory
                self.blacklist_memory.add(token_id)
                logger.info(f"Token {token_id[:8]}... blacklisted in memory: {reason}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to blacklist token: {str(e)}")
            return False
    
    def is_blacklisted(self, token: str) -> bool:
        """
        Check if a token is blacklisted.
        
        Args:
            token: JWT token to check
            
        Returns:
            True if token is blacklisted, False otherwise
        """
        try:
            token_id = self._get_token_jti(token)
            if not token_id:
                return False
            
            if self.use_redis:
                key = f"blacklist:{token_id}"
                return self.redis_client.exists(key) > 0
            else:
                return token_id in self.blacklist_memory
                
        except Exception as e:
            logger.error(f"Error checking token blacklist: {str(e)}")
            # On error, assume not blacklisted to avoid blocking legitimate users
            return False
    
    def blacklist_user_tokens(self, user_email: str, reason: str = "security") -> int:
        """
        Blacklist all tokens for a specific user.
        
        This is useful for security incidents or when a user's account is compromised.
        
        Args:
            user_email: Email of the user whose tokens should be blacklisted
            reason: Reason for mass blacklisting
            
        Returns:
            Number of tokens blacklisted
        """
        try:
            if self.use_redis:
                # Add user to global blacklist
                key = f"user_blacklist:{user_email}"
                value = {
                    "reason": reason,
                    "blacklisted_at": datetime.now(timezone.utc).isoformat()
                }
                # Keep user blacklist for 7 days (covers refresh token lifetime)
                self.redis_client.setex(key, 604800, str(value))
                logger.info(f"All tokens for user {user_email} blacklisted: {reason}")
                return 1
            else:
                # For in-memory, we can't easily blacklist all user tokens
                logger.warning("User-level token blacklisting not supported with in-memory storage")
                return 0
                
        except Exception as e:
            logger.error(f"Failed to blacklist user tokens: {str(e)}")
            return 0
    
    def is_user_blacklisted(self, user_email: str) -> bool:
        """
        Check if all tokens for a user are blacklisted.
        
        Args:
            user_email: Email of the user to check
            
        Returns:
            True if user is globally blacklisted, False otherwise
        """
        try:
            if self.use_redis:
                key = f"user_blacklist:{user_email}"
                return self.redis_client.exists(key) > 0
            return False
        except Exception as e:
            logger.error(f"Error checking user blacklist: {str(e)}")
            return False
    
    def cleanup_expired(self) -> int:
        """
        Manually cleanup expired tokens from in-memory storage.
        
        Note: Redis automatically handles TTL expiration.
        
        Returns:
            Number of tokens cleaned up
        """
        if self.use_redis:
            return 0  # Redis handles cleanup automatically
        
        # For in-memory storage, we can't easily determine expiry without storing more data
        # This would require a more complex in-memory structure
        return 0
    
    def get_blacklist_stats(self) -> dict:
        """
        Get statistics about the token blacklist.
        
        Returns:
            Dictionary with blacklist statistics
        """
        try:
            if self.use_redis:
                # Count keys matching our blacklist pattern
                token_keys = self.redis_client.keys("blacklist:*")
                user_keys = self.redis_client.keys("user_blacklist:*")
                
                return {
                    "storage_type": "redis",
                    "blacklisted_tokens": len(token_keys),
                    "blacklisted_users": len(user_keys),
                    "redis_connected": True
                }
            else:
                return {
                    "storage_type": "memory",
                    "blacklisted_tokens": len(self.blacklist_memory),
                    "blacklisted_users": 0,
                    "redis_connected": False
                }
        except Exception as e:
            logger.error(f"Error getting blacklist stats: {str(e)}")
            return {
                "error": str(e),
                "storage_type": "unknown"
            }

# Global instance
_token_blacklist_service = None

def get_token_blacklist_service() -> TokenBlacklistService:
    """Get or create the global token blacklist service instance."""
    global _token_blacklist_service
    if _token_blacklist_service is None:
        _token_blacklist_service = TokenBlacklistService()
    return _token_blacklist_service

def is_token_blacklisted(token: str) -> bool:
    """
    Convenience function to check if a token is blacklisted.
    
    Args:
        token: JWT token to check
        
    Returns:
        True if token is blacklisted, False otherwise
    """
    service = get_token_blacklist_service()
    return service.is_blacklisted(token)

def blacklist_token(token: str, reason: str = "logout") -> bool:
    """
    Convenience function to blacklist a token.
    
    Args:
        token: JWT token to blacklist
        reason: Reason for blacklisting
        
    Returns:
        True if successfully blacklisted, False otherwise
    """
    service = get_token_blacklist_service()
    return service.blacklist_token(token, reason)