#!/usr/bin/env python3
"""
Create admin account directly - for local testing
"""
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Test login credentials
test_email = "c50bossio@gmail.com"
test_password = "admin123"

print("Test login command:")
print(f"""
curl -X POST https://sixfb-backend.onrender.com/api/v1/auth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "username={test_email}&password={test_password}"
""")

print("\nOr try in browser:")
print("1. Go to: https://sixfb-frontend-paby.onrender.com/login")
print(f"2. Email: {test_email}")
print(f"3. Password: {test_password}")

print("\nIf login fails, you need to run this SQL in Render PostgreSQL:")
print("""
-- Create or update admin user
INSERT INTO users (email, hashed_password, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
    'c50bossio@gmail.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQaXUIpaPE4q',
    'Admin',
    'User', 
    'admin',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    hashed_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQaXUIpaPE4q',
    is_active = true,
    updated_at = NOW();
""")