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
    query, field_name: str, search_value: str, model_class: Any
):
    """
    Filter a query for exact matches in encrypted fields
    For now, this is a simplified version that just searches the plain field
    since email encryption is handled by the EncryptedString type itself.

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
        # Get the field from the model
        field = getattr(model_class, field_name)

        # For encrypted fields, we'll use direct comparison
        # The EncryptedString type should handle the encryption/decryption
        return query.filter(field == search_value)

    except Exception as e:
        logger.error(f"Error in encrypted field search: {str(e)}")
        return query


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
