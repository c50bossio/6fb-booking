#!/usr/bin/env python3
"""
Quick Fix for SendGrid Configuration
Updates config to use verified sender
"""

import os
import re
from pathlib import Path

def update_config_file():
    """Update config.py with verified sender"""
    config_path = Path("config.py")
    
    if not config_path.exists():
        print("❌ config.py not found")
        return False
    
    print("📝 Updating config.py...")
    
    # Read current config
    with open(config_path, 'r') as f:
        content = f.read()
    
    # Update sendgrid_from_email
    content = re.sub(
        r'sendgrid_from_email:\s*str\s*=\s*["\'][^"\']*["\']',
        'sendgrid_from_email: str = "support@em3014.6fbmentorship.com"',
        content
    )
    
    # Update sendgrid_from_name
    content = re.sub(
        r'sendgrid_from_name:\s*str\s*=\s*["\'][^"\']*["\']',
        'sendgrid_from_name: str = "BookedBarber"',
        content
    )
    
    # Write updated config
    with open(config_path, 'w') as f:
        f.write(content)
    
    print("✅ config.py updated successfully")
    return True

def create_env_file():
    """Create/update .env file with verified sender"""
    env_path = Path(".env")
    
    # Read existing .env if it exists
    env_vars = {}
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    
    # Update SendGrid settings
    env_vars['SENDGRID_FROM_EMAIL'] = 'support@em3014.6fbmentorship.com'
    env_vars['SENDGRID_FROM_NAME'] = 'BookedBarber'
    
    # Write updated .env
    with open(env_path, 'w') as f:
        f.write("# SendGrid Configuration - Updated for verified sender\n")
        for key, value in env_vars.items():
            # Add quotes if value contains spaces
            if ' ' in value and not (value.startswith('"') and value.endswith('"')):
                value = f'"{value}"'
            f.write(f"{key}={value}\n")
    
    print(f"✅ .env file {'updated' if env_path.exists() else 'created'}")
    return True

def test_updated_config():
    """Test the updated configuration"""
    print("\n🧪 Testing updated configuration...")
    
    try:
        # Import and test
        from config import settings
        
        print(f"✓ From Email: {settings.sendgrid_from_email}")
        print(f"✓ From Name: {settings.sendgrid_from_name}")
        
        if settings.sendgrid_from_email == "support@em3014.6fbmentorship.com":
            print("✅ Configuration updated successfully!")
            return True
        else:
            print("❌ Configuration not updated properly")
            return False
            
    except Exception as e:
        print(f"❌ Error testing config: {e}")
        return False

def main():
    """Main function"""
    print("🔧 SendGrid Configuration Fix")
    print("=" * 40)
    print("This will update your SendGrid configuration to use the verified sender.")
    print()
    
    # Show current status
    try:
        from config import settings
        print(f"Current From Email: {settings.sendgrid_from_email}")
        print(f"Current From Name: {settings.sendgrid_from_name}")
    except:
        print("Current configuration could not be loaded")
    
    print()
    proceed = input("Proceed with update? (y/N): ").lower()
    
    if proceed != 'y':
        print("❌ Update cancelled")
        return
    
    print("\n🔄 Applying fix...")
    
    # Update config file
    config_updated = update_config_file()
    
    # Create/update .env file
    env_updated = create_env_file()
    
    if config_updated and env_updated:
        print("\n🎉 Fix applied successfully!")
        print()
        print("📋 What was changed:")
        print("• config.py updated to use verified sender")
        print("• .env file updated with new sender settings")
        print()
        print("🚀 Next steps:")
        print("1. Restart your application server")
        print("2. Test email notifications")
        print("3. Monitor for successful email delivery")
        print()
        print("✅ Your notification system should now work!")
    else:
        print("\n❌ Fix could not be applied completely")
        print("Please check the error messages above")

if __name__ == "__main__":
    main()