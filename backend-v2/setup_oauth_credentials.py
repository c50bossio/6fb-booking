#!/usr/bin/env python3
"""
Setup OAuth credentials for marketing integrations.
This script helps configure OAuth credentials in the .env file.
"""

import os
import sys
from pathlib import Path

def setup_oauth_credentials():
    """Guide user through setting up OAuth credentials."""
    
    print("🔐 Marketing Integration OAuth Setup")
    print("=" * 50)
    print("\nThis script will help you configure OAuth credentials for:")
    print("1. Google My Business (GMB)")
    print("2. Meta Business (Facebook)")
    print("3. Apple Sign In")
    print("\n⚠️  Note: You'll need to create OAuth apps on each platform first.")
    
    # Check if .env exists
    env_path = Path(".env")
    if not env_path.exists():
        print("\n❌ .env file not found. Creating from template...")
        template_path = Path(".env.template")
        if template_path.exists():
            import shutil
            shutil.copy(".env.template", ".env")
            print("✅ Created .env from template")
        else:
            print("❌ .env.template not found!")
            return
    
    # Read current .env
    with open(".env", "r") as f:
        env_content = f.read()
    
    print("\n📋 Current OAuth Configuration Status:")
    print("-" * 40)
    
    # Check Google My Business
    if "GMB_CLIENT_ID=" in env_content and 'GMB_CLIENT_ID=""' not in env_content:
        print("✅ Google My Business credentials configured")
    else:
        print("❌ Google My Business credentials missing")
    
    # Check Meta Business
    if "META_CLIENT_ID=" in env_content and 'META_CLIENT_ID=""' not in env_content:
        print("✅ Meta Business credentials configured")
    else:
        print("❌ Meta Business credentials missing")
    
    print("\n📚 Setup Instructions:")
    print("=" * 50)
    
    print("\n1️⃣  Google My Business Setup:")
    print("   1. Go to https://console.cloud.google.com")
    print("   2. Create a new project or select existing")
    print("   3. Enable 'Google My Business API'")
    print("   4. Create OAuth 2.0 credentials:")
    print("      - Application type: Web application")
    print("      - Authorized redirect URIs:")
    print("        • http://localhost:8000/api/v2/integrations/gmb/callback")
    print("        • https://your-domain.com/api/v2/integrations/gmb/callback")
    print("   5. Copy Client ID and Client Secret")
    
    print("\n2️⃣  Meta Business Setup:")
    print("   1. Go to https://developers.facebook.com/apps/")
    print("   2. Create a new app (Business type)")
    print("   3. Add 'Facebook Login' product")
    print("   4. Configure OAuth Redirect URIs:")
    print("      • http://localhost:8000/api/v2/integrations/meta/callback")
    print("      • https://your-domain.com/api/v2/integrations/meta/callback")
    print("   5. Add required permissions:")
    print("      • pages_manage_posts")
    print("      • pages_read_engagement")
    print("      • business_management")
    print("   6. Copy App ID and App Secret")
    
    print("\n3️⃣  Apple Sign In Setup (Optional):")
    print("   1. Go to https://developer.apple.com")
    print("   2. Create an App ID with Sign In with Apple")
    print("   3. Create a Service ID")
    print("   4. Configure domains and redirect URLs")
    print("   5. Generate a private key")
    
    print("\n📝 Example .env Configuration:")
    print("-" * 40)
    print("""
# Google My Business
GMB_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GMB_CLIENT_SECRET="your-client-secret"
GMB_REDIRECT_URI=http://localhost:8000/api/v2/integrations/gmb/callback

# Meta Business
META_CLIENT_ID="your-app-id"
META_CLIENT_SECRET="your-app-secret"
META_REDIRECT_URI=http://localhost:8000/api/v2/integrations/meta/callback

# Apple Sign In (Optional)
APPLE_CLIENT_ID="com.yourcompany.bookedbarber"
APPLE_TEAM_ID="your-team-id"
APPLE_KEY_ID="your-key-id"
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour-private-key\\n-----END PRIVATE KEY-----"
""")
    
    print("\n✨ Quick Setup Commands:")
    print("-" * 40)
    print("# Open .env in your editor:")
    print("nano .env")
    print("\n# Or use VS Code:")
    print("code .env")
    
    print("\n⚠️  Important Security Notes:")
    print("1. Never commit .env to version control")
    print("2. Use different credentials for dev/staging/production")
    print("3. Rotate credentials regularly")
    print("4. Set restrictive OAuth scopes")
    
    print("\n🧪 Testing OAuth Flow:")
    print("-" * 40)
    print("After adding credentials, test with:")
    print("1. Start backend: uvicorn main:app --reload")
    print("2. Start frontend: cd frontend-v2 && npm run dev")
    print("3. Go to Settings > Integrations")
    print("4. Click 'Connect' for each service")
    
if __name__ == "__main__":
    setup_oauth_credentials()