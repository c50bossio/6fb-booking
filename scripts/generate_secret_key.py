#!/usr/bin/env python3
"""
Generate a secure secret key for production
"""
import secrets
import string


def generate_secret_key(length=64):
    """Generate a cryptographically secure secret key"""
    # Use a mix of letters, digits, and some special characters
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def main():
    print("=== 6FB Platform Secret Key Generator ===\n")

    # Generate multiple keys for different purposes
    keys = {
        "SECRET_KEY": generate_secret_key(64),
        "JWT_SECRET": generate_secret_key(32),
        "STRIPE_WEBHOOK_SECRET": f"whsec_{generate_secret_key(32)}",
    }

    print("Generated secure keys for production:\n")

    for key_name, key_value in keys.items():
        print(f"{key_name}={key_value}")

    print("\n⚠️  IMPORTANT:")
    print("1. Copy these keys to your .env.production file")
    print("2. Never commit these keys to version control")
    print("3. Store them securely (password manager, secrets manager)")
    print("4. Use different keys for different environments")

    print("\n📝 Example .env.production entry:")
    print(f"SECRET_KEY={keys['SECRET_KEY']}")


if __name__ == "__main__":
    main()
