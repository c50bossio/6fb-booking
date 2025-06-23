#!/usr/bin/env python3
"""
Validate production keys for 6FB Booking Platform.
This script validates that the generated keys are properly formatted and functional.
"""

import os
import sys
from cryptography.fernet import Fernet
from jose import jwt
import secrets


def validate_secret_key(secret_key):
    """Validate SECRET_KEY format and strength."""
    errors = []

    if not secret_key:
        errors.append("SECRET_KEY is empty")
        return errors

    if len(secret_key) < 86:
        errors.append(f"SECRET_KEY is too short ({len(secret_key)} chars, minimum 86)")

    # Check for URL-safe base64 characters
    valid_chars = set(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"  # pragma: allowlist secret
    )
    if not all(c in valid_chars for c in secret_key):
        errors.append(
            "SECRET_KEY contains invalid characters (must be URL-safe base64)"
        )

    return errors


def validate_jwt_secret(jwt_secret):
    """Validate JWT_SECRET_KEY format and functionality."""
    errors = []

    if not jwt_secret:
        errors.append("JWT_SECRET_KEY is empty")
        return errors

    if len(jwt_secret) < 86:
        errors.append(
            f"JWT_SECRET_KEY is too short ({len(jwt_secret)} chars, minimum 86)"
        )

    # Test JWT signing/verification
    try:
        test_payload = {"test": "data", "exp": 9999999999}
        token = jwt.encode(test_payload, jwt_secret, algorithm="HS256")
        decoded = jwt.decode(token, jwt_secret, algorithms=["HS256"])

        if decoded["test"] != "data":
            errors.append("JWT_SECRET_KEY failed functional test")
    except Exception as e:
        errors.append(f"JWT_SECRET_KEY failed functional test: {str(e)}")

    return errors


def validate_encryption_key(encryption_key):
    """Validate ENCRYPTION_KEY format and functionality."""
    errors = []

    if not encryption_key:
        errors.append("ENCRYPTION_KEY is empty")
        return errors

    # Test Fernet key functionality
    try:
        fernet = Fernet(encryption_key.encode())
        test_data = b"test encryption data"
        encrypted = fernet.encrypt(test_data)
        decrypted = fernet.decrypt(encrypted)

        if decrypted != test_data:
            errors.append("ENCRYPTION_KEY failed functional test")
    except Exception as e:
        errors.append(f"ENCRYPTION_KEY failed functional test: {str(e)}")

    return errors


def validate_from_env():
    """Validate keys from environment variables."""
    print("Validating keys from environment variables...")

    secret_key = os.getenv("SECRET_KEY")
    jwt_secret = os.getenv("JWT_SECRET_KEY")
    encryption_key = os.getenv("ENCRYPTION_KEY")

    all_errors = []

    # Validate each key
    errors = validate_secret_key(secret_key)
    if errors:
        all_errors.extend([f"SECRET_KEY: {error}" for error in errors])
    else:
        print("✓ SECRET_KEY is valid")

    errors = validate_jwt_secret(jwt_secret)
    if errors:
        all_errors.extend([f"JWT_SECRET_KEY: {error}" for error in errors])
    else:
        print("✓ JWT_SECRET_KEY is valid")

    errors = validate_encryption_key(encryption_key)
    if errors:
        all_errors.extend([f"ENCRYPTION_KEY: {error}" for error in errors])
    else:
        print("✓ ENCRYPTION_KEY is valid")

    return all_errors


def validate_from_args():
    """Validate keys from command line arguments."""
    if len(sys.argv) != 4:
        print(
            "Usage: python validate-production-keys.py <SECRET_KEY> <JWT_SECRET_KEY> <ENCRYPTION_KEY>"
        )
        return ["Invalid number of arguments"]

    secret_key = sys.argv[1]
    jwt_secret = sys.argv[2]
    encryption_key = sys.argv[3]

    print("Validating keys from command line arguments...")

    all_errors = []

    # Validate each key
    errors = validate_secret_key(secret_key)
    if errors:
        all_errors.extend([f"SECRET_KEY: {error}" for error in errors])
    else:
        print("✓ SECRET_KEY is valid")

    errors = validate_jwt_secret(jwt_secret)
    if errors:
        all_errors.extend([f"JWT_SECRET_KEY: {error}" for error in errors])
    else:
        print("✓ JWT_SECRET_KEY is valid")

    errors = validate_encryption_key(encryption_key)
    if errors:
        all_errors.extend([f"ENCRYPTION_KEY: {error}" for error in errors])
    else:
        print("✓ ENCRYPTION_KEY is valid")

    return all_errors


def main():
    """Main validation function."""
    print("=" * 80)
    print("6FB BOOKING PLATFORM - PRODUCTION KEY VALIDATOR")
    print("=" * 80)
    print()

    # Check if keys are provided as arguments or environment variables
    if len(sys.argv) > 1:
        errors = validate_from_args()
    else:
        errors = validate_from_env()

    print()
    if errors:
        print("❌ VALIDATION FAILED:")
        for error in errors:
            print(f"  - {error}")
        print()
        print("Please generate new keys using: python generate-production-keys.py")
        return 1
    else:
        print("✅ ALL KEYS VALIDATED SUCCESSFULLY!")
        print()
        print("Keys are ready for production deployment!")
        return 0


if __name__ == "__main__":
    exit(main())
