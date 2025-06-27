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
    """Create a hash of a value for encrypted field searching - matches EncryptionManager"""
    if not value:
        return ""

    # Use same hashing as EncryptionManager.hash_for_search
    # Must be exactly the same to match database storage
    return hashlib.sha256(value.lower().encode()).hexdigest()[:16]


def exact_match_encrypted_field(
    query, field_name: str, search_value: str, model_class: Any
):
    """
    Filter a query for exact matches in SearchableEncryptedString fields
    These fields store data as "encrypted_value|search_hash", so we need to
    search using the hash portion for performance and security.

    Args:
        query: SQLAlchemy query object to filter
        field_name: Name of the field to search (e.g., "email")
        search_value: The value to search for
        model_class: The model class being searched

    Returns:
        Modified query object
    """
    if not search_value:
        return query

    try:
        # Import here to avoid circular imports
        from sqlalchemy import text

        # Create search hash for the value
        search_hash = hash_for_search(search_value)

        # For SearchableEncryptedString fields, we search using the hash portion
        # The database stores: "encrypted_value|search_hash"
        # We search for records where the field ends with "|{search_hash}"
        #
        # IMPORTANT: We must use text() to avoid SQLAlchemy automatically
        # processing the LIKE pattern through process_bind_param, which would
        # encrypt our search pattern instead of using it as a raw pattern
        like_pattern = f"%|{search_hash}"

        logger.debug(
            f"Searching for {field_name} with hash {search_hash}, pattern: {like_pattern}"
        )

        # Use raw SQL comparison to avoid SQLAlchemy type processing
        return query.filter(
            text(f"{model_class.__tablename__}.{field_name} LIKE :pattern")
        ).params(pattern=like_pattern)

    except Exception as e:
        logger.error(f"Error in encrypted field search: {str(e)}")
        # Fallback to direct comparison in case of error
        field = getattr(model_class, field_name)
        return query.filter(field == search_value)


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
