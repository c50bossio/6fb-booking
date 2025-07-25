#!/usr/bin/env python3
"""
Development Environment Setup Script for BookedBarber V2

This script helps developers set up a complete development environment
with proper secrets, database initialization, and service validation.
"""

import sys
import subprocess
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from utils.secret_management import SecretManager


class DevEnvironmentSetup:
    """Development environment setup and validation."""
    
    def __init__(self):
        self.backend_dir = backend_dir
        self.env_file = self.backend_dir / ".env"
        self.secret_manager = SecretManager()
        
    def generate_secure_keys(self):
        """Generate secure keys for development."""
        print("🔑 Generating secure development keys...")
        
        keys = {
            'SECRET_KEY': self.secret_manager.generate_secure_key(64),
            'JWT_SECRET_KEY': self.secret_manager.generate_secure_key(64),
        }
        
        print("✅ Generated secure keys for development")
        return keys
        
    def setup_environment_file(self):
        """Set up the main .env file for development."""
        print("📄 Setting up .env file...")
        
        # Check if .env already exists
        if self.env_file.exists():
            response = input("⚠️  .env file already exists. Overwrite? (y/N): ")
            if response.lower() != 'y':
                print("📄 Using existing .env file")
                return
                
        # Copy from secure development template
        secure_template = self.backend_dir / ".env.development.secure"
        if secure_template.exists():
            import shutil
            shutil.copy2(secure_template, self.env_file)
            print("✅ Copied development template to .env")
        else:
            print("❌ Development template not found, creating basic .env")
            self.create_basic_env()
            
    def create_basic_env(self):
        """Create a basic .env file with generated secrets."""
        keys = self.generate_secure_keys()
        
        env_content = f"""# Development Environment Configuration
# Generated automatically by setup_dev_environment.py

# Core Secrets
SECRET_KEY={keys['SECRET_KEY']}
JWT_SECRET_KEY={keys['JWT_SECRET_KEY']}

# Stripe Configuration (Replace with your test keys)
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_TEST_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Database
DATABASE_URL=sqlite:///./6fb_booking.db

# Server Settings
ENVIRONMENT=development
DEBUG=true
HOST=0.0.0.0
PORT=8000

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:3001"]
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
"""
        
        with open(self.env_file, 'w') as f:
            f.write(env_content)
            
        print("✅ Created basic .env file with generated secrets")
        
    def validate_secrets(self):
        """Validate that all required secrets are properly configured."""
        print("🔍 Validating secret configuration...")
        
        results = self.secret_manager.validate_secrets()
        
        print("\nSecret validation results:")
        for secret_name, is_valid in results.items():
            status = "✅" if is_valid else "❌"
            print(f"  {status} {secret_name}")
            
        if not all(results.values()):
            print("\n⚠️  Some secrets need attention:")
            print("  1. Replace Stripe test keys with your actual test keys")
            print("  2. Get test keys from: https://dashboard.stripe.com/test/apikeys")
            print("  3. Configure optional services (SendGrid, Twilio) if needed")
            return False
            
        print("✅ All secrets are properly configured")
        return True
        
    def test_database_connection(self):
        """Test database connectivity and schema."""
        print("🗄️  Testing database connection...")
        
        try:
            # Import database components
            from database import SessionLocal
            from models import User
            
            # Test connection
            db = SessionLocal()
            user_count = db.query(User).count()
            db.close()
            
            print(f"✅ Database connected successfully ({user_count} users found)")
            return True
            
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            print("💡 Try running: alembic upgrade head")
            return False
            
    def test_api_health(self):
        """Test API health endpoints."""
        print("🏥 Testing API health...")
        
        try:
            import requests
            import time
            
            # Start server in background for testing
            print("  Starting development server...")
            server_process = subprocess.Popen([
                sys.executable, "-m", "uvicorn", "main:app", 
                "--host", "0.0.0.0", "--port", "8000"
            ], cwd=self.backend_dir, capture_output=True)
            
            # Wait for server to start
            time.sleep(3)
            
            # Test health endpoint
            response = requests.get("http://localhost:8000/health", timeout=5)
            
            if response.status_code == 200:
                print("✅ API health check passed")
                health_data = response.json()
                print(f"  Status: {health_data.get('status', 'unknown')}")
                result = True
            else:
                print(f"❌ API health check failed: {response.status_code}")
                result = False
                
            # Clean up
            server_process.terminate()
            server_process.wait(timeout=5)
            
            return result
            
        except Exception as e:
            print(f"❌ API health test failed: {e}")
            return False
            
    def setup_development_data(self):
        """Set up development test data."""
        print("👥 Setting up development test data...")
        
        try:
            from database import SessionLocal
            from models import User, Service, ServiceCategoryEnum
            from utils.auth import get_password_hash
            
            db = SessionLocal()
            
            # Check if test data already exists
            if db.query(User).filter(User.email == "admin@bookedbarber.dev").first():
                print("✅ Development test data already exists")
                db.close()
                return True
                
            # Create development users
            dev_users = [
                User(
                    email="admin@bookedbarber.dev",
                    name="Dev Admin",
                    phone="+1234567890",
                    hashed_password=get_password_hash("dev123"),
                    role="admin",
                    is_active=True,
                    is_test_data=True
                ),
                User(
                    email="barber@bookedbarber.dev", 
                    name="Dev Barber",
                    phone="+1234567891",
                    hashed_password=get_password_hash("dev123"),
                    role="barber",
                    is_active=True,
                    is_test_data=True
                ),
                User(
                    email="customer@bookedbarber.dev",
                    name="Dev Customer", 
                    phone="+1234567892",
                    hashed_password=get_password_hash("dev123"),
                    role="user",
                    is_active=True,
                    is_test_data=True
                )
            ]
            
            db.add_all(dev_users)
            
            # Create development services
            dev_services = [
                Service(
                    name="Dev Haircut",
                    description="Development test haircut service",
                    category=ServiceCategoryEnum.HAIRCUT,
                    base_price=25.0,
                    duration_minutes=30,
                    is_active=True,
                    is_test_data=True
                ),
                Service(
                    name="Dev Beard Trim",
                    description="Development test beard trim service", 
                    category=ServiceCategoryEnum.BEARD,
                    base_price=15.0,
                    duration_minutes=15,
                    is_active=True,
                    is_test_data=True
                )
            ]
            
            db.add_all(dev_services)
            db.commit()
            
            print("✅ Created development test data")
            print("  📧 Login credentials:")
            print("    Admin: admin@bookedbarber.dev / dev123")
            print("    Barber: barber@bookedbarber.dev / dev123") 
            print("    Customer: customer@bookedbarber.dev / dev123")
            
            db.close()
            return True
            
        except Exception as e:
            print(f"❌ Failed to create development test data: {e}")
            return False
            
    def run_setup(self):
        """Run the complete development environment setup."""
        print("🚀 Setting up BookedBarber V2 Development Environment")
        print("=" * 55)
        
        steps = [
            ("Environment File", self.setup_environment_file),
            ("Secret Validation", self.validate_secrets),
            ("Database Connection", self.test_database_connection),
            ("Development Data", self.setup_development_data),
            ("API Health Check", self.test_api_health),
        ]
        
        results = []
        for step_name, step_func in steps:
            print(f"\n🔄 {step_name}...")
            try:
                result = step_func()
                results.append((step_name, result))
            except Exception as e:
                print(f"❌ {step_name} failed: {e}")
                results.append((step_name, False))
                
        # Summary
        print("\n" + "=" * 55)
        print("📊 SETUP SUMMARY")
        print("=" * 55)
        
        for step_name, success in results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"  {status} {step_name}")
            
        successful_steps = sum(1 for _, success in results if success)
        total_steps = len(results)
        
        if successful_steps == total_steps:
            print(f"\n🎉 Setup completed successfully! ({successful_steps}/{total_steps})")
            print("\n📝 Next steps:")
            print("  1. Replace Stripe test keys in .env with your actual test keys")
            print("  2. Start development server: uvicorn main:app --reload")
            print("  3. Access API docs: http://localhost:8000/docs")
            print("  4. Test payment endpoints with valid Stripe keys")
        else:
            print(f"\n⚠️  Setup partially completed ({successful_steps}/{total_steps})")
            print("   Please review the failed steps above and resolve any issues.")
            
        return successful_steps == total_steps


def main():
    """Main entry point for the setup script."""
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "validate":
            # Just validate existing setup
            setup = DevEnvironmentSetup()
            setup.validate_secrets()
        elif command == "keys":
            # Generate new keys only
            setup = DevEnvironmentSetup()
            keys = setup.generate_secure_keys()
            print("Generated keys:")
            for key, value in keys.items():
                print(f"  {key}={value}")
        elif command == "help":
            print("BookedBarber V2 Development Setup")
            print("Usage:")
            print("  python setup_dev_environment.py          # Full setup")
            print("  python setup_dev_environment.py validate # Validate existing setup")
            print("  python setup_dev_environment.py keys     # Generate new keys")
            print("  python setup_dev_environment.py help     # Show this help")
        else:
            print(f"Unknown command: {command}")
            print("Use 'help' for usage information")
    else:
        # Full setup
        setup = DevEnvironmentSetup()
        success = setup.run_setup()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()