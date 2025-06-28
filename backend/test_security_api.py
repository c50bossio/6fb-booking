#!/usr/bin/env python3
"""Test security features via API"""
import requests

BASE_URL = "http://localhost:8000"

# Test 1: Weak password registration
print("Testing weak password registration...")
response = requests.post(
    f"{BASE_URL}/api/v1/auth/register",
    json={
        "email": "weak@example.com",
        "password": "weak",
        "first_name": "Weak",
        "last_name": "Password",
        "role": "barber",
    },
)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

# Test 2: Strong password registration
print("Testing strong password registration...")
response = requests.post(
    f"{BASE_URL}/api/v1/auth/register",
    json={
        "email": "strong@example.com",
        "password": "StrongP@ssw0rd!",
        "first_name": "Strong",
        "last_name": "Password",
        "role": "barber",
    },
)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

# Test 3: Check security headers
print("Testing security headers...")
response = requests.get(f"{BASE_URL}/health")
print("Security headers:")
for header in [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "X-XSS-Protection",
    "Referrer-Policy",
    "X-Process-Time",
]:
    if header in response.headers:
        print(f"  {header}: {response.headers[header]}")

# Test 4: Rate limiting test (commented out to avoid blocking)
# print("\nTesting rate limiting...")
# for i in range(10):
#     response = requests.get(f"{BASE_URL}/api/v1/users")
#     print(f"Request {i+1}: Status {response.status_code}")
#     if response.status_code == 429:
#         print(f"Rate limited! Retry-After: {response.headers.get('Retry-After')} seconds")
#         break
