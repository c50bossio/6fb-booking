"""
Security utilities for BookedBarber V2
Includes webhook signature verification and other security functions
"""

import hmac
import hashlib
import base64
import secrets
from typing import Optional


def verify_google_webhook_signature(
    payload: bytes,
    signature: str,
    secret: str
) -> bool:
    """
    Verify Google webhook signature using HMAC-SHA256.
    
    Args:
        payload: The raw request body as bytes
        signature: The signature from X-Goog-Signature header
        secret: The webhook secret key
        
    Returns:
        bool: True if signature is valid, False otherwise
    """
    if not signature or not secret:
        return False
    
    try:
        # Create HMAC hash of payload using secret
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Google may prefix signature with algorithm
        if signature.startswith('sha256='):
            signature = signature[7:]
        
        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(expected_signature, signature)
        
    except Exception:
        return False


def verify_stripe_webhook_signature(
    payload: bytes,
    signature: str,
    secret: str
) -> bool:
    """
    Verify Stripe webhook signature.
    
    Args:
        payload: The raw request body as bytes
        signature: The signature from Stripe-Signature header
        secret: The webhook endpoint secret
        
    Returns:
        bool: True if signature is valid, False otherwise
    """
    if not signature or not secret:
        return False
    
    try:
        # Parse signature header
        elements = signature.split(',')
        timestamp = None
        signatures = []
        
        for element in elements:
            key, value = element.split('=', 1)
            if key == 't':
                timestamp = value
            elif key == 'v1':
                signatures.append(value)
        
        if not timestamp or not signatures:
            return False
        
        # Create expected signature
        signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Compare with any provided signature
        return any(hmac.compare_digest(expected_signature, sig) for sig in signatures)
        
    except Exception:
        return False


def generate_webhook_token() -> str:
    """
    Generate a secure random token for webhook verification.
    
    Returns:
        str: A secure random token
    """
    return secrets.token_urlsafe(32)


def generate_api_key() -> str:
    """
    Generate a secure API key.
    
    Returns:
        str: A secure API key
    """
    return f"bb_{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key for secure storage.
    
    Args:
        api_key: The API key to hash
        
    Returns:
        str: The hashed API key
    """
    return hashlib.sha256(api_key.encode()).hexdigest()


def verify_api_key(api_key: str, hashed_key: str) -> bool:
    """
    Verify an API key against its hash.
    
    Args:
        api_key: The API key to verify
        hashed_key: The stored hash to verify against
        
    Returns:
        bool: True if API key is valid, False otherwise
    """
    try:
        return hmac.compare_digest(
            hashlib.sha256(api_key.encode()).hexdigest(),
            hashed_key
        )
    except Exception:
        return False