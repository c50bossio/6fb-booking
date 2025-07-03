#!/usr/bin/env python3
"""
Secure Key Generation Script for BookedBarber V2
Generates cryptographically secure keys for production use
"""

import secrets
import sys
from datetime import datetime

def generate_secure_keys():
    """Generate cryptographically secure keys"""
    print("🔐 BookedBarber V2 - Secure Key Generator")
    print("=" * 50)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    
    # Generate keys with 256 bits of entropy
    secret_key = secrets.token_urlsafe(64)
    jwt_secret_key = secrets.token_urlsafe(64)
    webhook_secret = secrets.token_urlsafe(32)
    
    print("# 🚨 CRITICAL: Copy these keys to your .env file immediately!")
    print("# 🚨 NEVER commit these keys to version control!")
    print("# 🚨 Rotate these keys quarterly for security!")
    print()
    print("# Core Security Keys")
    print(f"SECRET_KEY={secret_key}")
    print(f"JWT_SECRET_KEY={jwt_secret_key}")
    print()
    print("# Webhook Security")
    print(f"STRIPE_WEBHOOK_SECRET=whsec_{webhook_secret}")
    print()
    print("# Additional Security Keys")
    print(f"ENCRYPTION_KEY={secrets.token_urlsafe(32)}")
    print(f"CSRF_SECRET_KEY={secrets.token_urlsafe(32)}")
    print(f"SESSION_SECRET_KEY={secrets.token_urlsafe(32)}")
    print()
    print("# Test Environment Keys (INSECURE - FOR TESTING ONLY)")
    print(f"TEST_SECRET_KEY=TEST_{secrets.token_urlsafe(16)}")
    print()
    print("=" * 50)
    print("✅ Keys generated successfully!")
    print("🔒 Each key has 256+ bits of entropy")
    print("📋 Copy the keys above to your environment file")
    print("🗑️  Delete this output after copying keys")
    print("=" * 50)

def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] == "--confirm":
        generate_secure_keys()
    else:
        print("🚨 SECURITY WARNING: This will generate new production keys!")
        print("🚨 Using new keys will invalidate all existing sessions!")
        print()
        print("To confirm key generation, run:")
        print("python3 scripts/generate-secure-keys.py --confirm")
        print()
        print("Before running this script:")
        print("1. Ensure you have backup access to the system")
        print("2. Plan to update all production environments")
        print("3. Notify users of potential session expiration")

if __name__ == "__main__":
    main()