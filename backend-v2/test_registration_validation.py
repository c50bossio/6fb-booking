#!/usr/bin/env python
"""Test registration validation requirements"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1/auth/register"

def test_registration(name, email, password, user_type, expected_status=201):
    """Test a registration request"""
    data = {
        "name": name,
        "email": email,
        "password": password,
        "user_type": user_type
    }
    
    try:
        response = requests.post(BASE_URL, json=data, timeout=5)
        result = {
            "status": response.status_code,
            "success": response.status_code == expected_status,
            "message": response.json() if response.content else "No content"
        }
        return result
    except requests.exceptions.Timeout:
        return {"status": "timeout", "success": False, "message": "Request timed out"}
    except Exception as e:
        return {"status": "error", "success": False, "message": str(e)}

def main():
    timestamp = int(datetime.now().timestamp())
    
    tests = [
        {
            "name": "Valid 8-char password",
            "data": ("Test User", f"valid{timestamp}@example.com", "Pass123!", "barber"),
            "expected": 201
        },
        {
            "name": "Too short password (7 chars)",
            "data": ("Test User", f"short{timestamp}@example.com", "Pass12!", "barber"),
            "expected": 422
        },
        {
            "name": "No special character",
            "data": ("Test User", f"nospecial{timestamp}@example.com", "Pass1234", "barber"),
            "expected": 422
        },
        {
            "name": "Client registration blocked",
            "data": ("Test Client", f"client{timestamp}@example.com", "Pass123!", "client"),
            "expected": 400
        },
        {
            "name": "Barbershop owner allowed",
            "data": ("Test Owner", f"owner{timestamp}@example.com", "Pass123!", "barbershop"),
            "expected": 201
        }
    ]
    
    print("\n=== Testing Registration Validation ===\n")
    
    for test in tests:
        print(f"Test: {test['name']}")
        result = test_registration(*test['data'], expected_status=test['expected'])
        
        if result['success']:
            print(f"✅ PASSED - Status: {result['status']}")
        else:
            print(f"❌ FAILED - Status: {result['status']}")
            
        if isinstance(result['message'], dict):
            if 'detail' in result['message']:
                print(f"   Detail: {result['message']['detail']}")
            elif 'message' in result['message']:
                print(f"   Message: {result['message']['message']}")
        else:
            print(f"   Message: {result['message']}")
            
        print()

if __name__ == "__main__":
    main()