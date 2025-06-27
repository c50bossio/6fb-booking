#!/usr/bin/env python3
"""
Test hash calculation
"""

from utils.encrypted_search import hash_for_search


def test_hash_calculation():
    # Test with the actual email
    test_email = "debug_1751052328@example.com"
    calculated_hash = hash_for_search(test_email)

    print(f"Test email: {test_email}")
    print(f"Calculated hash: {calculated_hash}")
    print(f"Database hash: f63cc2fd6b4951db")  # pragma: allowlist secret
    print(
        f"Hashes match: {calculated_hash == 'f63cc2fd6b4951db'}"
    )  # pragma: allowlist secret

    # Let's also check if the hash function is working correctly
    print(f"\nHash function test:")
    print(f"Hash of 'test@example.com': {hash_for_search('test@example.com')}")

    # Check if there's an issue with the hash format/length
    print(f"\nHash lengths:")
    print(f"Calculated hash length: {len(calculated_hash)}")
    print(f"Database hash length: {len('f63cc2fd6b4951db')}")  # pragma: allowlist secret


if __name__ == "__main__":
    test_hash_calculation()
