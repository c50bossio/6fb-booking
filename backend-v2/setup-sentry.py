#!/usr/bin/env python3
"""
BookedBarber V2 - Sentry Setup Assistant
========================================

Interactive script to help configure Sentry for different environments.
Generates proper environment configuration and validates setup.
"""

import os
import sys
import re
from typing import Dict, Any

def print_header():
    """Print setup header."""
    print("🔧 BookedBarber V2 - Sentry Setup Assistant")
    print("=" * 60)
    print("This script will help you configure Sentry error tracking")
    print("for BookedBarber V2 in different environments.")
    print()

def get_user_input(prompt: str, default: str = "", required: bool = False) -> str:
    """Get user input with validation."""
    while True:
        if default:
            user_input = input(f"{prompt} [{default}]: ").strip()
            if not user_input:
                user_input = default
        else:
            user_input = input(f"{prompt}: ").strip()
        
        if required and not user_input:
            print("❌ This field is required. Please enter a value.")
            continue
        
        return user_input

def validate_dsn(dsn: str) -> bool:
    """Validate Sentry DSN format."""
    if not dsn:
        return False
    
    # Basic DSN format validation
    dsn_pattern = r'^https://[a-f0-9]+@[a-z0-9.-]+\.ingest\.sentry\.io/\d+$'
    return bool(re.match(dsn_pattern, dsn))

def get_sentry_config() -> Dict[str, Any]:
    """Get Sentry configuration from user."""
    print("📋 Sentry Configuration")
    print("-" * 30)
    
    config = {}
    
    # Get DSN
    print("1. Sentry DSN")
    print("   Get this from: https://sentry.io/settings/[org]/projects/[project]/keys/")
    print("   Format: https://key@org.ingest.sentry.io/project-id")
    print()
    
    while True:
        dsn = get_user_input("Enter your Sentry DSN", required=True)
        if validate_dsn(dsn):
            config['SENTRY_DSN'] = dsn
            break
        else:
            print("❌ Invalid DSN format. Please check and try again.")
            print("   Example: https://abc123@org.ingest.sentry.io/123456")
    
    # Get environment
    print("\n2. Environment Configuration")
    environments = ['development', 'staging', 'production']
    print(f"   Available: {', '.join(environments)}")
    
    while True:
        env = get_user_input("Environment", "development").lower()
        if env in environments:
            config['SENTRY_ENVIRONMENT'] = env
            break
        else:
            print(f"❌ Please choose from: {', '.join(environments)}")
    
    # Get sample rates based on environment
    print("\n3. Sampling Configuration")
    if config['SENTRY_ENVIRONMENT'] == 'production':
        print("   Production: Lower sample rates recommended for cost control")
        config['SENTRY_SAMPLE_RATE'] = get_user_input("Error sample rate (0.0-1.0)", "1.0")
        config['SENTRY_TRACES_SAMPLE_RATE'] = get_user_input("Performance sample rate (0.0-1.0)", "0.05")
        config['SENTRY_PROFILES_SAMPLE_RATE'] = get_user_input("Profiling sample rate (0.0-1.0)", "0.05")
    elif config['SENTRY_ENVIRONMENT'] == 'staging':
        print("   Staging: Moderate sample rates for testing")
        config['SENTRY_SAMPLE_RATE'] = get_user_input("Error sample rate (0.0-1.0)", "1.0")
        config['SENTRY_TRACES_SAMPLE_RATE'] = get_user_input("Performance sample rate (0.0-1.0)", "0.1")
        config['SENTRY_PROFILES_SAMPLE_RATE'] = get_user_input("Profiling sample rate (0.0-1.0)", "0.1")
    else:
        print("   Development: High sample rates for testing")
        config['SENTRY_SAMPLE_RATE'] = "1.0"
        config['SENTRY_TRACES_SAMPLE_RATE'] = "1.0"
        config['SENTRY_PROFILES_SAMPLE_RATE'] = "1.0"
    
    # Optional release tracking
    print("\n4. Release Tracking (Optional)")
    print("   Used for tracking deployments and associating errors with releases")
    release = get_user_input("Release version (optional, auto-detected from git if empty)")
    if release:
        config['SENTRY_RELEASE'] = release
    
    # Debug mode
    print("\n5. Debug Configuration")
    debug = get_user_input("Enable Sentry debug logging? (y/n)", "n").lower()
    config['SENTRY_DEBUG'] = "true" if debug.startswith('y') else "false"
    
    # PII settings
    print("\n6. Privacy Configuration")
    print("   GDPR/Privacy: Should Sentry capture personally identifiable information?")
    pii = get_user_input("Send PII to Sentry? (y/n)", "n").lower()
    config['SENTRY_SEND_DEFAULT_PII'] = "true" if pii.startswith('y') else "false"
    
    return config

def write_env_config(config: Dict[str, Any], env_file: str = ".env") -> None:
    """Write configuration to environment file."""
    print(f"\n📝 Writing configuration to {env_file}")
    
    # Read existing .env file
    existing_config = {}
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    existing_config[key] = value
    
    # Update with Sentry config
    existing_config.update(config)
    
    # Write back to file
    try:
        with open(env_file, 'w') as f:
            f.write("# BookedBarber V2 Environment Configuration\n")
            f.write("# Generated by Sentry Setup Assistant\n")
            f.write(f"# Generated at: {os.popen('date').read().strip()}\n\n")
            
            # Write Sentry configuration
            f.write("# =============================================================================\n")
            f.write("# SENTRY MONITORING CONFIGURATION\n")
            f.write("# =============================================================================\n")
            
            sentry_keys = ['SENTRY_DSN', 'SENTRY_ENVIRONMENT', 'SENTRY_RELEASE', 
                          'SENTRY_SAMPLE_RATE', 'SENTRY_TRACES_SAMPLE_RATE', 
                          'SENTRY_PROFILES_SAMPLE_RATE', 'SENTRY_DEBUG', 'SENTRY_SEND_DEFAULT_PII']
            
            for key in sentry_keys:
                if key in existing_config:
                    f.write(f"{key}={existing_config[key]}\n")
            
            f.write("\n")
            
            # Write other configuration
            for key, value in existing_config.items():
                if not key.startswith('SENTRY_'):
                    f.write(f"{key}={value}\n")
        
        print(f"✅ Configuration written to {env_file}")
        
    except Exception as e:
        print(f"❌ Error writing configuration: {e}")
        return False
    
    return True

def test_configuration(config: Dict[str, Any]) -> None:
    """Test the Sentry configuration."""
    print("\n🧪 Testing Sentry Configuration")
    print("-" * 30)
    
    # Set environment variables for testing
    for key, value in config.items():
        os.environ[key] = value
    
    try:
        # Import and test configuration
        sys.path.append('.')
        from config.sentry import configure_sentry
        
        success = configure_sentry()
        
        if success:
            print("✅ Sentry configuration successful!")
            
            # Test basic functionality
            import sentry_sdk
            sentry_sdk.capture_message("Test message from Sentry setup assistant", level="info")
            print("✅ Test message sent to Sentry")
            
            print("\n🎉 Setup Complete!")
            print("Check your Sentry dashboard for the test message.")
            
        else:
            print("❌ Sentry configuration failed")
            print("Check your DSN and try again.")
            
    except Exception as e:
        print(f"❌ Error testing configuration: {e}")

def show_next_steps(config: Dict[str, Any]) -> None:
    """Show next steps after setup."""
    print("\n📋 Next Steps")
    print("-" * 30)
    print("1. Restart your FastAPI application to load the new configuration")
    print("2. Test error tracking:")
    print("   python test-sentry-integration.py")
    print("3. Monitor real-time with:")
    print("   python sentry-monitor.py")
    print("4. Check your Sentry dashboard:")
    print("   https://sentry.io/organizations/[org]/projects/[project]/")
    print()
    print("🔧 Environment Variables Set:")
    for key, value in config.items():
        if key == 'SENTRY_DSN':
            masked_value = value[:20] + "..." + value[-10:] if len(value) > 30 else value
            print(f"   {key}={masked_value}")
        else:
            print(f"   {key}={value}")

def main():
    """Main setup function."""
    print_header()
    
    try:
        # Get configuration
        config = get_sentry_config()
        
        # Confirm configuration
        print("\n📋 Configuration Summary")
        print("-" * 30)
        for key, value in config.items():
            if key == 'SENTRY_DSN':
                masked_value = value[:20] + "..." + value[-10:] if len(value) > 30 else value
                print(f"  {key}: {masked_value}")
            else:
                print(f"  {key}: {value}")
        
        print()
        confirm = get_user_input("Save this configuration? (y/n)", "y").lower()
        
        if not confirm.startswith('y'):
            print("❌ Setup cancelled")
            return
        
        # Write configuration
        if write_env_config(config):
            # Test configuration
            test_configuration(config)
            
            # Show next steps
            show_next_steps(config)
        
    except KeyboardInterrupt:
        print("\n❌ Setup cancelled by user")
    except Exception as e:
        print(f"❌ Setup error: {e}")

if __name__ == '__main__':
    main()