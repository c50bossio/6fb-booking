#!/usr/bin/env python3
"""
Test login with an email that should match existing hash
"""

import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.encrypted_search import hash_for_search


def test_common_emails():
    """Test common email addresses to see if any produce the known hash"""

    known_hash = "aa5cd624198bfb87"  # pragma: allowlist secret

    # Common test emails
    test_emails = [
        "admin@6fb.com",
        "admin@sixfb.com",
        "test@example.com",
        "user@example.com",
        "test@6fb.com",
        "test@sixfb.com",
        "barber@example.com",
        "client@example.com",
        "demo@6fb.com",
        "demo@sixfb.com",
        "admin@example.com",
        "owner@6fb.com",
        "owner@sixfb.com",
        "manager@6fb.com",
        "manager@sixfb.com",
    ]

    print(f"Looking for email that produces hash: {known_hash}")
    print()

    for email in test_emails:
        calculated_hash = hash_for_search(email)
        match = calculated_hash == known_hash
        print(f"{email:<25} -> {calculated_hash} {'✅ MATCH!' if match else ''}")

        if match:
            print(f"\n🎯 FOUND MATCH: {email} produces hash {known_hash}")
            return email

    print(f"\nNo match found among test emails.")
    return None


if __name__ == "__main__":
    test_common_emails()
