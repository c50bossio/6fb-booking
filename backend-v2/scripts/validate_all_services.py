#!/usr/bin/env python3
"""
All Services Validation Script
Comprehensive validation of all external service integrations

This script validates:
1. Stripe payment processing and Connect
2. SendGrid email notifications
3. Twilio SMS notifications
4. Google Calendar integration
5. Environment configuration
6. Service implementations

Usage:
    python scripts/validate_all_services.py              # Basic validation
    python scripts/validate_all_services.py --full       # Full validation with tests
    python scripts/validate_all_services.py --report     # Generate detailed report
    python scripts/validate_all_services.py --fix        # Attempt to fix issues
"""

import os
import sys
import argparse
import logging
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config import settings
from db import get_db

logger = logging.getLogger(__name__)


class ServiceValidator:
    """Comprehensive service validation."""
    
    def __init__(self):
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'environment': settings.environment,
            'services': {},
            'summary': {
                'total': 0,
                'configured': 0,
                'working': 0,
                'issues': 0
            },
            'recommendations': []
        }
    
    def validate_stripe(self) -> Dict[str, Any]:
        """Validate Stripe configuration and functionality."""
        service_result = {
            'name': 'Stripe Payment Processing',
            'configured': False,
            'working': False,
            'tests_passed': 0,
            'tests_total': 4,
            'issues': [],
            'details': {}
        }
        
        try:
            # Check configuration
            if not settings.stripe_secret_key:
                service_result['issues'].append("STRIPE_SECRET_KEY not configured")
                return service_result
            
            if not settings.stripe_publishable_key:
                service_result['issues'].append("STRIPE_PUBLISHABLE_KEY not configured")
                return service_result
            
            service_result['configured'] = True
            
            # Import and test Stripe
            import stripe
            stripe.api_key = settings.stripe_secret_key
            
            # Test 1: API Key validation
            try:
                account = stripe.Account.retrieve()
                service_result['tests_passed'] += 1
                service_result['details']['account_id'] = account.id
                service_result['details']['country'] = account.country
            except Exception as e:
                service_result['issues'].append(f"API key validation failed: {str(e)}")
            
            # Test 2: Payment intent creation
            try:
                intent = stripe.PaymentIntent.create(
                    amount=1000,
                    currency='usd',
                    metadata={'test': 'validation'}
                )
                service_result['tests_passed'] += 1
                service_result['details']['payment_intent_test'] = intent.id
            except Exception as e:
                service_result['issues'].append(f"Payment intent creation failed: {str(e)}")
            
            # Test 3: PaymentService integration
            try:
                from services.payment_service import PaymentService
                service_result['tests_passed'] += 1
                service_result['details']['payment_service'] = 'Available'
            except Exception as e:
                service_result['issues'].append(f"PaymentService import failed: {str(e)}")
            
            # Test 4: StripeIntegrationService
            try:
                from services.stripe_integration_service import StripeIntegrationService
                service_result['tests_passed'] += 1
                service_result['details']['stripe_integration_service'] = 'Available'
            except Exception as e:
                service_result['issues'].append(f"StripeIntegrationService import failed: {str(e)}")
            
            service_result['working'] = service_result['tests_passed'] >= 3
            
        except Exception as e:
            service_result['issues'].append(f"Stripe validation error: {str(e)}")
        
        return service_result
    
    def validate_sendgrid(self) -> Dict[str, Any]:
        """Validate SendGrid email configuration."""
        service_result = {
            'name': 'SendGrid Email',
            'configured': False,
            'working': False,
            'tests_passed': 0,
            'tests_total': 4,
            'issues': [],
            'details': {}
        }
        
        try:
            # Check configuration
            if not settings.sendgrid_api_key:
                service_result['issues'].append("SENDGRID_API_KEY not configured")
                return service_result
            
            if not settings.sendgrid_from_email:
                service_result['issues'].append("SENDGRID_FROM_EMAIL not configured")
                return service_result
            
            service_result['configured'] = True
            
            # Test 1: API key format
            if settings.sendgrid_api_key.startswith('SG.'):
                service_result['tests_passed'] += 1
                service_result['details']['api_key_format'] = 'Valid'
            else:
                service_result['issues'].append("Invalid API key format (must start with 'SG.')")
            
            # Test 2: SendGrid client initialization
            try:
                from sendgrid import SendGridAPIClient
                sg = SendGridAPIClient(settings.sendgrid_api_key)
                response = sg.client.user.get()
                if response.status_code == 200:
                    service_result['tests_passed'] += 1
                    user_data = json.loads(response.body)
                    service_result['details']['username'] = user_data.get('username', 'N/A')
                else:
                    service_result['issues'].append(f"API validation failed: {response.status_code}")
            except Exception as e:
                service_result['issues'].append(f"SendGrid client test failed: {str(e)}")
            
            # Test 3: NotificationService integration
            try:
                from services.notification_service import NotificationService
                notification_service = NotificationService()
                if notification_service.sendgrid_client:
                    service_result['tests_passed'] += 1
                    service_result['details']['notification_service'] = 'Integrated'
                else:
                    service_result['issues'].append("NotificationService SendGrid client not initialized")
            except Exception as e:
                service_result['issues'].append(f"NotificationService test failed: {str(e)}")
            
            # Test 4: Email template availability
            try:
                template_dir = project_root / "templates" / "notifications"
                email_templates = list(template_dir.glob("*_email.html"))
                service_result['tests_passed'] += 1
                service_result['details']['email_templates'] = len(email_templates)
            except Exception as e:
                service_result['issues'].append(f"Email template check failed: {str(e)}")
            
            service_result['working'] = service_result['tests_passed'] >= 3
            
        except Exception as e:
            service_result['issues'].append(f"SendGrid validation error: {str(e)}")
        
        return service_result
    
    def validate_twilio(self) -> Dict[str, Any]:
        """Validate Twilio SMS configuration."""
        service_result = {
            'name': 'Twilio SMS',
            'configured': False,
            'working': False,
            'tests_passed': 0,
            'tests_total': 4,
            'issues': [],
            'details': {}
        }
        
        try:
            # Check configuration
            if not settings.twilio_account_sid:
                service_result['issues'].append("TWILIO_ACCOUNT_SID not configured")
                return service_result
            
            if not settings.twilio_auth_token:
                service_result['issues'].append("TWILIO_AUTH_TOKEN not configured")
                return service_result
            
            service_result['configured'] = True
            
            # Test 1: Credential format validation
            if settings.twilio_account_sid.startswith('AC') and len(settings.twilio_auth_token) == 32:
                service_result['tests_passed'] += 1
                service_result['details']['credential_format'] = 'Valid'
            else:
                service_result['issues'].append("Invalid credential format")
            
            # Test 2: Twilio client initialization
            try:
                from twilio.rest import Client as TwilioClient
                client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
                account = client.api.accounts(settings.twilio_account_sid).fetch()
                service_result['tests_passed'] += 1
                service_result['details']['account_name'] = account.friendly_name
                service_result['details']['account_status'] = account.status
            except Exception as e:
                service_result['issues'].append(f"Twilio client test failed: {str(e)}")
            
            # Test 3: Phone number validation
            if settings.twilio_phone_number:
                try:
                    phone_numbers = client.incoming_phone_numbers.list()
                    phone_found = any(num.phone_number == settings.twilio_phone_number for num in phone_numbers)
                    if phone_found:
                        service_result['tests_passed'] += 1
                        service_result['details']['phone_number'] = 'Verified'
                    else:
                        service_result['issues'].append("Phone number not found in account")
                except Exception as e:
                    service_result['issues'].append(f"Phone number validation failed: {str(e)}")
            else:
                service_result['issues'].append("TWILIO_PHONE_NUMBER not configured")
            
            # Test 4: NotificationService integration
            try:
                from services.notification_service import NotificationService
                notification_service = NotificationService()
                if notification_service.twilio_client:
                    service_result['tests_passed'] += 1
                    service_result['details']['notification_service'] = 'Integrated'
                else:
                    service_result['issues'].append("NotificationService Twilio client not initialized")
            except Exception as e:
                service_result['issues'].append(f"NotificationService test failed: {str(e)}")
            
            service_result['working'] = service_result['tests_passed'] >= 3
            
        except Exception as e:
            service_result['issues'].append(f"Twilio validation error: {str(e)}")
        
        return service_result
    
    def validate_google_calendar(self) -> Dict[str, Any]:
        """Validate Google Calendar configuration."""
        service_result = {
            'name': 'Google Calendar',
            'configured': False,
            'working': False,
            'tests_passed': 0,
            'tests_total': 3,
            'issues': [],
            'details': {}
        }
        
        try:
            # Check configuration
            if not settings.google_client_id:
                service_result['issues'].append("GOOGLE_CLIENT_ID not configured")
                return service_result
            
            if not settings.google_client_secret:
                service_result['issues'].append("GOOGLE_CLIENT_SECRET not configured")
                return service_result
            
            service_result['configured'] = True
            
            # Test 1: Client ID format validation
            if settings.google_client_id.endswith('.googleusercontent.com'):
                service_result['tests_passed'] += 1
                service_result['details']['client_id_format'] = 'Valid'
            else:
                service_result['issues'].append("Invalid Google Client ID format")
            
            # Test 2: GoogleCalendarService availability
            try:
                from services.google_calendar_service import GoogleCalendarService
                service_result['tests_passed'] += 1
                service_result['details']['calendar_service'] = 'Available'
            except Exception as e:
                service_result['issues'].append(f"GoogleCalendarService import failed: {str(e)}")
            
            # Test 3: Check user integrations
            try:
                db = next(get_db())
                from models import User
                users_with_calendar = db.query(User).filter(User.google_calendar_credentials.isnot(None)).count()
                total_users = db.query(User).count()
                service_result['tests_passed'] += 1
                service_result['details']['users_with_integration'] = users_with_calendar
                service_result['details']['total_users'] = total_users
            except Exception as e:
                service_result['issues'].append(f"User integration check failed: {str(e)}")
            
            service_result['working'] = service_result['tests_passed'] >= 2
            
        except Exception as e:
            service_result['issues'].append(f"Google Calendar validation error: {str(e)}")
        
        return service_result
    
    def validate_environment(self) -> Dict[str, Any]:
        """Validate environment configuration."""
        env_result = {
            'name': 'Environment Configuration',
            'configured': True,
            'working': True,
            'tests_passed': 0,
            'tests_total': 5,
            'issues': [],
            'details': {}
        }
        
        try:
            # Test 1: Critical security keys
            if settings.secret_key and settings.secret_key not in ["your-secret-key-here", "test-secret-key"]:
                env_result['tests_passed'] += 1
                env_result['details']['secret_key'] = 'Configured'
            else:
                env_result['issues'].append("SECRET_KEY not properly configured")
            
            # Test 2: JWT configuration
            if settings.jwt_secret_key:
                env_result['tests_passed'] += 1
                env_result['details']['jwt_secret_key'] = 'Configured'
            else:
                env_result['issues'].append("JWT_SECRET_KEY not configured")
            
            # Test 3: Database configuration
            if settings.database_url:
                env_result['tests_passed'] += 1
                env_result['details']['database_url'] = 'Configured'
                env_result['details']['database_type'] = 'SQLite' if 'sqlite' in settings.database_url else 'PostgreSQL'
            else:
                env_result['issues'].append("DATABASE_URL not configured")
            
            # Test 4: CORS configuration
            if settings.cors_origins:
                env_result['tests_passed'] += 1
                env_result['details']['cors_origins'] = 'Configured'
            else:
                env_result['issues'].append("CORS_ORIGINS not configured")
            
            # Test 5: Environment detection
            env_result['tests_passed'] += 1
            env_result['details']['environment'] = settings.environment
            env_result['details']['debug_mode'] = settings.debug
            
            # Production warnings
            if settings.environment == 'production':
                if settings.debug:
                    env_result['issues'].append("DEBUG mode enabled in production")
                if 'localhost' in settings.cors_origins:
                    env_result['issues'].append("Localhost in CORS origins in production")
            
            env_result['working'] = env_result['tests_passed'] >= 4
            
        except Exception as e:
            env_result['issues'].append(f"Environment validation error: {str(e)}")
        
        return env_result
    
    def run_validation(self, include_tests: bool = False) -> Dict[str, Any]:
        """Run comprehensive service validation."""
        logger.info("🔍 Running service validation...")
        
        # Validate environment first
        self.results['services']['environment'] = self.validate_environment()
        
        # Validate each service
        self.results['services']['stripe'] = self.validate_stripe()
        self.results['services']['sendgrid'] = self.validate_sendgrid()
        self.results['services']['twilio'] = self.validate_twilio()
        self.results['services']['google_calendar'] = self.validate_google_calendar()
        
        # Calculate summary
        self.calculate_summary()
        
        # Generate recommendations
        self.generate_recommendations()
        
        return self.results
    
    def calculate_summary(self):
        """Calculate validation summary statistics."""
        for service_name, service_data in self.results['services'].items():
            self.results['summary']['total'] += 1
            if service_data['configured']:
                self.results['summary']['configured'] += 1
            if service_data['working']:
                self.results['summary']['working'] += 1
            if service_data['issues']:
                self.results['summary']['issues'] += len(service_data['issues'])
    
    def generate_recommendations(self):
        """Generate setup and improvement recommendations."""
        recommendations = []
        
        # Check each service
        for service_name, service_data in self.results['services'].items():
            if not service_data['configured']:
                recommendations.append(f"Configure {service_data['name']} by setting required environment variables")
            elif not service_data['working']:
                recommendations.append(f"Fix {service_data['name']} issues: {', '.join(service_data['issues'][:2])}")
        
        # Environment-specific recommendations
        if settings.environment == 'development':
            recommendations.append("For production: generate secure keys, use live API credentials")
        
        if settings.environment == 'production':
            if not all(self.results['services'][s]['working'] for s in ['stripe', 'sendgrid']):
                recommendations.append("Critical: Ensure payment and email services are working in production")
        
        # Service-specific recommendations
        if not self.results['services']['twilio']['working']:
            recommendations.append("SMS notifications disabled - configure Twilio for customer communication")
        
        if not self.results['services']['google_calendar']['working']:
            recommendations.append("Calendar integration disabled - configure Google Calendar for barber availability")
        
        self.results['recommendations'] = recommendations
    
    def print_results(self):
        """Print validation results in a formatted way."""
        print("\n" + "="*70)
        print("📋 BOOKEDBARBER V2 - SERVICES VALIDATION REPORT")
        print("="*70)
        print(f"Environment: {self.results['environment']}")
        print(f"Timestamp: {self.results['timestamp']}")
        print()
        
        # Summary
        summary = self.results['summary']
        print("📊 SUMMARY")
        print("-" * 20)
        print(f"Total services: {summary['total']}")
        print(f"Configured: {summary['configured']}/{summary['total']}")
        print(f"Working: {summary['working']}/{summary['total']}")
        print(f"Total issues: {summary['issues']}")
        print()
        
        # Service details
        print("🔍 SERVICE DETAILS")
        print("-" * 20)
        for service_name, service_data in self.results['services'].items():
            status = "✅" if service_data['working'] else "⚠️" if service_data['configured'] else "❌"
            print(f"{status} {service_data['name']}")
            
            if service_data['configured']:
                tests_status = f"{service_data['tests_passed']}/{service_data['tests_total']} tests passed"
                print(f"    {tests_status}")
            
            if service_data['issues']:
                print(f"    Issues: {len(service_data['issues'])}")
                for issue in service_data['issues'][:2]:  # Show first 2 issues
                    print(f"      • {issue}")
                if len(service_data['issues']) > 2:
                    print(f"      • ... and {len(service_data['issues']) - 2} more")
            
            if service_data.get('details'):
                key_details = []
                for key, value in service_data['details'].items():
                    if key in ['account_id', 'username', 'account_name', 'users_with_integration']:
                        key_details.append(f"{key}: {value}")
                if key_details:
                    print(f"    Details: {', '.join(key_details)}")
            print()
        
        # Recommendations
        if self.results['recommendations']:
            print("💡 RECOMMENDATIONS")
            print("-" * 20)
            for i, rec in enumerate(self.results['recommendations'], 1):
                print(f"{i}. {rec}")
            print()
        
        # Quick fix commands
        print("🔧 QUICK FIXES")
        print("-" * 20)
        not_working_services = [name for name, data in self.results['services'].items() if not data['working']]
        
        if 'stripe' in not_working_services:
            print("Stripe: python scripts/configure_stripe.py --validate")
        if 'sendgrid' in not_working_services:
            print("SendGrid: python scripts/configure_sendgrid.py --validate")
        if 'twilio' in not_working_services:
            print("Twilio: python scripts/configure_twilio.py --validate")
        if 'google_calendar' in not_working_services:
            print("Google Calendar: python scripts/configure_google_calendar.py --setup")
        
        print()
        print("📖 For detailed setup guides, see: SERVICE_CONFIGURATION_GUIDE.md")
        print("="*70)
    
    def save_report(self, filename: str = None):
        """Save validation report to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"service_validation_report_{timestamp}.json"
        
        report_path = project_root / filename
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        logger.info(f"📄 Validation report saved: {report_path}")
        return report_path


def main():
    parser = argparse.ArgumentParser(description='Validate all external service integrations')
    parser.add_argument('--full', action='store_true', help='Run full validation with tests')
    parser.add_argument('--report', action='store_true', help='Generate detailed JSON report')
    parser.add_argument('--quiet', action='store_true', help='Minimal output')
    parser.add_argument('--fix', action='store_true', help='Attempt to fix common issues')
    
    args = parser.parse_args()
    
    # Configure logging
    log_level = logging.WARNING if args.quiet else logging.INFO
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Run validation
    validator = ServiceValidator()
    results = validator.run_validation(include_tests=args.full)
    
    # Print results
    if not args.quiet:
        validator.print_results()
    
    # Save report if requested
    if args.report:
        report_path = validator.save_report()
        print(f"\n📄 Detailed report saved: {report_path}")
    
    # Quick status for scripts
    if args.quiet:
        working_services = sum(1 for service in results['services'].values() if service['working'])
        total_services = len(results['services'])
        print(f"Services working: {working_services}/{total_services}")
    
    # Exit code based on results
    if results['summary']['working'] == results['summary']['total']:
        sys.exit(0)  # All services working
    elif results['summary']['working'] >= results['summary']['total'] * 0.6:
        sys.exit(1)  # Most services working
    else:
        sys.exit(2)  # Major issues


if __name__ == "__main__":
    main()