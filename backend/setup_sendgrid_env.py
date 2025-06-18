#!/usr/bin/env python3
"""
Script to set up SendGrid configuration in .env file
"""
import os
from pathlib import Path

def setup_sendgrid_env():
    """Set up SendGrid configuration in .env file"""
    
    env_path = Path(__file__).parent / '.env'
    
    # SendGrid configuration
    sendgrid_config = """
# SendGrid Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=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
EMAIL_FROM_NAME=Chris Bossio - 6FB Mentorship
EMAIL_FROM_ADDRESS=support@em3014.6fbmentorship.com
"""
    
    # Check if .env exists
    if env_path.exists():
        print("📄 .env file found. Updating with SendGrid configuration...")
        
        # Read existing content
        with open(env_path, 'r') as f:
            content = f.read()
        
        # Check if SendGrid config already exists
        if 'SMTP_HOST' in content:
            print("⚠️  SendGrid configuration already exists in .env")
            response = input("Do you want to replace it? (y/n): ")
            if response.lower() != 'y':
                print("❌ Setup cancelled")
                return
            
            # Remove old email config
            lines = content.split('\n')
            new_lines = []
            skip = False
            for line in lines:
                if line.strip().startswith('# Email Configuration') or line.strip().startswith('# SendGrid'):
                    skip = True
                elif skip and line.strip() and not line.strip().startswith('#') and '=' in line:
                    key = line.split('=')[0].strip()
                    if key in ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'EMAIL_FROM_NAME', 'EMAIL_FROM_ADDRESS']:
                        continue
                else:
                    skip = False
                    new_lines.append(line)
            
            content = '\n'.join(new_lines)
        
        # Add SendGrid config
        with open(env_path, 'w') as f:
            f.write(content.rstrip() + '\n' + sendgrid_config)
        
        print("✅ SendGrid configuration added to .env file")
        
    else:
        print("📄 Creating new .env file with SendGrid configuration...")
        
        # Copy from .env.example if it exists
        example_path = Path(__file__).parent / '.env.example'
        if example_path.exists():
            with open(example_path, 'r') as f:
                content = f.read()
            
            # Replace the commented email section with actual config
            lines = content.split('\n')
            new_lines = []
            skip = False
            for line in lines:
                if '# Email Configuration' in line:
                    skip = True
                    new_lines.append(sendgrid_config.strip())
                elif skip and line.strip() and line.strip().startswith('#') and 'SMTP' in line:
                    continue
                else:
                    if skip and not line.strip().startswith('#'):
                        skip = False
                    if not skip or not line.strip().startswith('#'):
                        new_lines.append(line)
            
            content = '\n'.join(new_lines)
        else:
            # Create minimal .env
            content = """# Database
DATABASE_URL=sqlite:///./6fb_booking.db

# Security
SECRET_KEY=your-secret-key-here-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Frontend
FRONTEND_URL=http://localhost:3000

# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO
""" + sendgrid_config
        
        with open(env_path, 'w') as f:
            f.write(content)
        
        print("✅ .env file created with SendGrid configuration")
    
    print("\n📧 SendGrid configuration complete!")
    print("\n✅ EMAIL_FROM_ADDRESS is set to your verified SendGrid sender:")
    print("   From: support@em3014.6fbmentorship.com")
    print("   Reply-To: reply@em3014.6fbmentorship.com")
    
    print("\n🔒 Security reminder: Never commit .env file to git!")
    print("   Make sure .env is in your .gitignore file")
    
    print("\n📋 Next steps:")
    print("1. Update EMAIL_FROM_ADDRESS in .env with your verified sender")
    print("2. Run: python test_sendgrid.py")
    print("3. Check your email for test messages")

if __name__ == "__main__":
    setup_sendgrid_env()