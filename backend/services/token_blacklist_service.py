"""
Token blacklist service for JWT token invalidation
"""

import time
from typing import Set, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class TokenBlacklistService:
    """Service to manage blacklisted JWT tokens"""

    def __init__(self):
        self._blacklisted_tokens: Set[str] = set()
        self._token_expiry: dict[str, float] = {}

    def blacklist_token(
        self, token: str, expires_at: Optional[datetime] = None
    ) -> None:
        """Add a token to the blacklist"""
        self._blacklisted_tokens.add(token)

        if expires_at:
            self._token_expiry[token] = expires_at.timestamp()
        else:
            # Default to 24 hours if no expiry provided
            expiry = datetime.utcnow() + timedelta(hours=24)
            self._token_expiry[token] = expiry.timestamp()

        logger.info(f"Token blacklisted: {token[:10]}...")

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


# Global instance
token_blacklist_service = TokenBlacklistService()
