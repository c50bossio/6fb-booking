"""
Token blacklist service for JWT token invalidation
"""

import time
from typing import Set, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class TokenBlacklistService:
    """Service to manage blacklisted JWT tokens"""

    def __init__(self):
        self._blacklisted_tokens: Set[str] = set()
        self._token_expiry: dict[str, float] = {}
        self._user_token_invalidation: dict[int, datetime] = {}

    def blacklist_token(
        self,
        token: str,
        expires_at: Optional[datetime] = None,
        reason: str = "logout",
        user_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Add a token to the blacklist"""
        try:
            self._blacklisted_tokens.add(token)

            if expires_at:
                self._token_expiry[token] = expires_at.timestamp()
            else:
                # Default to 24 hours if no expiry provided
                expiry = datetime.utcnow() + timedelta(hours=24)
                self._token_expiry[token] = expiry.timestamp()

            logger.info(f"Token blacklisted for user {user_id}, reason: {reason}")
            return True
        except Exception as e:
            logger.error(f"Failed to blacklist token: {str(e)}")
            return False

    def is_blacklisted(self, token: str) -> bool:
        """Check if a token is blacklisted"""
        # Clean up expired tokens first
        self._cleanup_expired_tokens()

        return token in self._blacklisted_tokens

    def _cleanup_expired_tokens(self) -> None:
        """Remove expired tokens from the blacklist"""
        current_time = time.time()
        expired_tokens = [
            token
            for token, expiry in self._token_expiry.items()
            if expiry < current_time
        ]

        for token in expired_tokens:
            self._blacklisted_tokens.discard(token)
            del self._token_expiry[token]

        if expired_tokens:
            logger.info(f"Cleaned up {len(expired_tokens)} expired tokens")

    def clear_all(self) -> None:
        """Clear all blacklisted tokens (for testing)"""
        self._blacklisted_tokens.clear()
        self._token_expiry.clear()
        logger.info("All blacklisted tokens cleared")

    def get_blacklist_size(self) -> int:
        """Get the current size of the blacklist"""
        self._cleanup_expired_tokens()
        return len(self._blacklisted_tokens)

    def is_user_tokens_invalidated(
        self, user_id: int, token_issued_at: datetime
    ) -> bool:
        """Check if user's tokens have been invalidated after the token was issued"""
        if user_id not in self._user_token_invalidation:
            return False

        invalidation_time = self._user_token_invalidation[user_id]
        return token_issued_at < invalidation_time

    def blacklist_all_user_tokens(
        self, user_id: int, reason: str = "security", except_token: Optional[str] = None
    ) -> None:
        """Mark all tokens for a user as invalidated"""
        self._user_token_invalidation[user_id] = datetime.utcnow()
        logger.info(f"All tokens invalidated for user {user_id}, reason: {reason}")


# Global instance
token_blacklist_service = TokenBlacklistService()
