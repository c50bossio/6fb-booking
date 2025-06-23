#!/usr/bin/env python3
"""
Generate secure production keys for 6FB Booking Platform.
This script generates all required cryptographic keys for production deployment.
"""

import secrets
import base64
import json
from datetime import datetime
from cryptography.fernet import Fernet


def generate_secret_key():
    """Generate a secure SECRET_KEY for Django/FastAPI."""
    return secrets.token_urlsafe(64)


def generate_jwt_secret():
    """Generate a secure JWT_SECRET_KEY for JWT token signing."""
    return secrets.token_urlsafe(64)


def generate_encryption_key():
    """Generate a Fernet encryption key for database field encryption."""
    return Fernet.generate_key().decode("utf-8")


def validate_keys(keys):
    """Validate that all generated keys meet security requirements."""
    errors = []

    # Validate SECRET_KEY
    if len(keys["SECRET_KEY"]) < 86:  # Base64 URL-safe encoding of 64 bytes
        errors.append("SECRET_KEY is too short")

    # Validate JWT_SECRET_KEY
    if len(keys["JWT_SECRET_KEY"]) < 86:
        errors.append("JWT_SECRET_KEY is too short")

    # Validate ENCRYPTION_KEY (Fernet key)
    try:
        Fernet(keys["ENCRYPTION_KEY"].encode())
    except Exception as e:
        errors.append(f"ENCRYPTION_KEY is invalid: {str(e)}")

    return errors


def format_for_render(keys):
    """Format keys for easy copy-paste into Render dashboard."""
    render_format = []
    render_format.append(
        "# Copy and paste these environment variables into Render dashboard"
    )
    render_format.append(
        "# Generated on: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    )
    render_format.append("")

    for key, value in keys.items():
        render_format.append(f"{key}={value}")

    return "\n".join(render_format)


def format_as_json(keys):
    """Format keys as JSON for programmatic use."""
    return json.dumps(keys, indent=2)


def format_as_dotenv(keys):
    """Format keys as .env file content."""
    dotenv_format = []
    dotenv_format.append(
        "# Production keys generated on "
        + datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    )
    dotenv_format.append(
        "# SECURITY WARNING: Never commit these keys to version control!"
    )
    dotenv_format.append("")

    for key, value in keys.items():
        dotenv_format.append(f'{key}="{value}"')

    return "\n".join(dotenv_format)


def main():
    """Generate and display all required production keys."""
    print("=" * 80)
    print("6FB BOOKING PLATFORM - PRODUCTION KEY GENERATOR")
    print("=" * 80)
    print()

    # Generate all keys
    keys = {
        "SECRET_KEY": generate_secret_key(),
        "JWT_SECRET_KEY": generate_jwt_secret(),
        "ENCRYPTION_KEY": generate_encryption_key(),
    }

    # Validate keys
    errors = validate_keys(keys)
    if errors:
        print("ERROR: Key generation failed validation:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("✓ All keys generated successfully!")
    print("✓ All keys passed validation!")
    print()

    # Display keys in multiple formats
    print("=" * 80)
    print("RENDER DASHBOARD FORMAT (Copy and paste into Environment Variables)")
    print("=" * 80)
    print(format_for_render(keys))
    print()

    print("=" * 80)
    print("JSON FORMAT (For programmatic use)")
    print("=" * 80)
    print(format_as_json(keys))
    print()

    print("=" * 80)
    print(".ENV FILE FORMAT (For local development)")
    print("=" * 80)
    print(format_as_dotenv(keys))
    print()

    print("=" * 80)
    print("INDIVIDUAL KEYS")
    print("=" * 80)
    for key, value in keys.items():
        print(f"{key}:")
        print(f"  Value: {value}")
        print(f"  Length: {len(value)} characters")
        print()

    print("=" * 80)
    print("SECURITY REMINDERS:")
    print("=" * 80)
    print("1. NEVER commit these keys to version control")
    print("2. Store these keys securely (password manager recommended)")
    print("3. Use different keys for each environment (dev, staging, prod)")
    print("4. Rotate keys periodically (recommended: every 90 days)")
    print("5. Enable audit logging for key usage in production")
    print()

    # Save to file option (check for --save-to-file argument)
    import sys

    save_to_file = "--save-to-file" in sys.argv

    if save_to_file:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"production_keys_{timestamp}.txt"

        with open(filename, "w") as f:
            f.write("6FB BOOKING PLATFORM - PRODUCTION KEYS\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
            f.write("=" * 80 + "\n\n")
            f.write("RENDER FORMAT:\n")
            f.write("-" * 40 + "\n")
            f.write(format_for_render(keys))
            f.write("\n\n" + "=" * 80 + "\n\n")
            f.write(".ENV FORMAT:\n")
            f.write("-" * 40 + "\n")
            f.write(format_as_dotenv(keys))
            f.write("\n\n" + "=" * 80 + "\n")
            f.write("SECURITY: Delete this file after copying the keys!\n")

        print(f"\n✓ Keys saved to: {filename}")
        print(
            "⚠️  IMPORTANT: Delete this file after copying the keys to a secure location!"
        )
    else:
        print(
            "\nTo save keys to a file, run: python generate-production-keys.py --save-to-file"
        )

    return 0


if __name__ == "__main__":
    exit(main())
