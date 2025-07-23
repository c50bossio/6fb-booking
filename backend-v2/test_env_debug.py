#!/usr/bin/env python3
"""
Environment Variables Debug Test

Check if OAuth credentials are properly loaded.
"""

import os
from pathlib import Path
import sys

def load_env_file():
    """Load .env file manually"""
    env_path = Path(".env")
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"\'')
                    os.environ[key] = value
        print("✅ .env file loaded successfully")
    else:
        print("❌ .env file not found")

def test_environment_variables():
    """Test OAuth environment variables"""
    print("🔧 Environment Variables Debug Test")
    print("=" * 50)
    
    # Load .env manually
    load_env_file()
    
    # Test variables
    variables = [
        'GMB_CLIENT_ID',
        'GMB_CLIENT_SECRET', 
        'GMB_REDIRECT_URI',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'META_CLIENT_ID',
        'META_CLIENT_SECRET'
    ]
    
    print("\n📋 Environment Variables Status:")
    for var in variables:
        value = os.getenv(var)
        if value and value.strip():
            # Show first 20 chars for security
            display_value = value[:20] + "..." if len(value) > 20 else value
            print(f"✅ {var}: {display_value}")
        else:
            print(f"❌ {var}: Not set")
    
    # Test GMB service initialization
    print(f"\n🏢 GMB Service Test:")
    try:
        from services.gmb_service import GMBService
        gmb_service = GMBService()
        
        if gmb_service.client_id:
            print(f"✅ GMB Service initialized successfully")
            print(f"   Client ID: {gmb_service.client_id[:20]}...")
            print(f"   Has Secret: {'Yes' if gmb_service.client_secret else 'No'}")
            print(f"   Redirect URI: {gmb_service.redirect_uri}")
        else:
            print(f"❌ GMB Service failed to initialize")
            print(f"   Fallback to GOOGLE_CLIENT_ID: {os.getenv('GOOGLE_CLIENT_ID')}")
            
    except Exception as e:
        print(f"❌ Error testing GMB service: {e}")

if __name__ == "__main__":
    test_environment_variables()