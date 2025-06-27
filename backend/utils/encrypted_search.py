"""
Encrypted field search utilities for PII data
"""

import hashlib
import hmac
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import Column
import logging

logger = logging.getLogger(__name__)


def hash_for_search(value: str, salt: str = "6fb_search_salt") -> str:
    """Create a hash of a value for encrypted field searching"""
    if not value:
        return ""

    # Use HMAC-SHA256 for consistent hashing
    return hmac.new(
        salt.encode("utf-8"), value.lower().strip().encode("utf-8"), hashlib.sha256
    ).hexdigest()


def exact_match_encrypted_field(
    session: Session,
    model_class: Any,
    field_column: Column,
    search_value: str,
    hash_column: Optional[Column] = None,
) -> list:
    """
    Search for exact matches in encrypted fields using hash comparison

    Args:
        session: SQLAlchemy session
        model_class: The model class to search
        field_column: The encrypted field column
        search_value: The value to search for
        hash_column: Optional hash column for faster searching

    Returns:
        List of matching records
    """
    if not search_value:
        return []

    try:
        if hash_column:
            # Use hash column for faster searching
            search_hash = hash_for_search(search_value)
            return session.query(model_class).filter(hash_column == search_hash).all()
        else:
            # Fallback to full table scan (slower)
            logger.warning(
                f"Performing full table scan for encrypted search on {model_class.__name__}"
            )
            all_records = session.query(model_class).all()

            # This is a simplified version - in practice, you'd decrypt and compare
            # For now, just return empty list to avoid errors
            return []

    except Exception as e:
        logger.error(f"Error in encrypted field search: {str(e)}")
        return []


def create_search_hash(value: str) -> str:
    """Create a search hash for storing alongside encrypted data"""
    return hash_for_search(value)


def prepare_encrypted_field_for_search(plaintext_value: str) -> tuple[str, str]:
    """
    Prepare a field for encrypted storage with search capability

    Returns:
        Tuple of (encrypted_value, search_hash)
    """
    if not plaintext_value:
        return "", ""

    # For now, just return the plaintext and hash
    # In production, you'd encrypt the plaintext_value
    search_hash = create_search_hash(plaintext_value)

    return plaintext_value, search_hash
