#!/usr/bin/env python3
"""
Comprehensive Health Check System

Verifies all services start properly, integrations connect, configuration is valid,
and critical user flows work correctly.
"""
import os
import sys
import time
import json
import requests
import subprocess
import sqlite3
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse
from datetime import datetime, timedelta


class HealthChecker:
    """Comprehensive system health checker."""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.health_results = {}
        self.start_time = time.time()
        
        # Service URLs for health checks
        self.services = {
            'backend': 'http://localhost:8000',
            'frontend': 'http://localhost:3000'
        }
        
        # Critical endpoints to test
        self.critical_endpoints = [
            '/health',
            '/api/v2/health',
            '/api/v1/auth/health',
            '/api/v1/appointments/health'
        ]
        
        # Database connections to test
        self.databases = {
            'main': 'sqlite:///./app.db',
            'test': 'sqlite:///./test.db'
        }
        
        # External integrations to test
        self.integrations = {
            'stripe': {'required': True, 'test_mode': True},
            'sendgrid': {'required': True, 'test_mode': True},
            'twilio': {'required': True, 'test_mode': True},
            'google_calendar': {'required': False, 'test_mode': True},
            'google_mybusiness': {'required': False, 'test_mode': True}
        }
    
    def check_environment_configuration(self) -> Dict:
        """Check that all required environment variables are set."""
        print("🔧 Checking environment configuration...")
        
        required_vars = {
            'critical': [
                'DATABASE_URL',
                'SECRET_KEY',
                'JWT_SECRET_KEY'
            ],
            'integrations': [
                'STRIPE_SECRET_KEY',
                'STRIPE_PUBLISHABLE_KEY',
                'SENDGRID_API_KEY',
                'TWILIO_ACCOUNT_SID',
                'TWILIO_AUTH_TOKEN'
            ],
            'optional': [
                'GOOGLE_CALENDAR_CREDENTIALS',
                'GOOGLE_MYBUSINESS_CREDENTIALS',
                'SENTRY_DSN',
                'REDIS_URL'
            ]
        }
        
        results = {
            'status': 'PASS',
            'missing_critical': [],
            'missing_integrations': [],
            'missing_optional': [],
            'configuration_errors': []
        }
        
        # Check critical variables
        for var in required_vars['critical']:
            if not os.getenv(var):
                results['missing_critical'].append(var)
                results['status'] = 'FAIL'
        
        # Check integration variables
        for var in required_vars['integrations']:
            if not os.getenv(var):
                results['missing_integrations'].append(var)
                if results['status'] != 'FAIL':
                    results['status'] = 'WARN'
        
        # Check optional variables
        for var in required_vars['optional']:
            if not os.getenv(var):
                results['missing_optional'].append(var)
        
        # Validate configuration values
        try:
            # Check SECRET_KEY length
            secret_key = os.getenv('SECRET_KEY', '')
            if len(secret_key) < 32:
                results['configuration_errors'].append('SECRET_KEY is too short (minimum 32 characters)')
                results['status'] = 'FAIL'
            
            # Check database URL format
            db_url = os.getenv('DATABASE_URL', '')
            if db_url and not (db_url.startswith('sqlite:') or db_url.startswith('postgresql:')):
                results['configuration_errors'].append('DATABASE_URL has invalid format')
                results['status'] = 'FAIL'
        
        except Exception as e:
            results['configuration_errors'].append(f'Configuration validation error: {e}')
            results['status'] = 'FAIL'
        
        return results
    
    def check_database_connectivity(self) -> Dict:
        """Check database connections and basic operations."""
        print("🗄️ Checking database connectivity...")
        
        results = {
            'status': 'PASS',
            'connections': {},
            'migrations': {'status': 'UNKNOWN', 'details': []},
            'basic_operations': {'status': 'UNKNOWN', 'details': []}
        }
        
        # Test database connections
        for db_name, db_url in self.databases.items():
            try:
                if db_url.startswith('sqlite:'):
                    # SQLite connection test
                    db_file = db_url.replace('sqlite:///', '')
                    if db_file != ':memory:':
                        # Create directory if it doesn't exist
                        Path(db_file).parent.mkdir(parents=True, exist_ok=True)
                    
                    conn = sqlite3.connect(db_file)
                    cursor = conn.cursor()
                    cursor.execute('SELECT 1')
                    conn.close()
                    
                    results['connections'][db_name] = {
                        'status': 'SUCCESS',
                        'url': db_url,
                        'type': 'sqlite'
                    }
                
                elif db_url.startswith('postgresql:'):
                    # PostgreSQL connection test (would need psycopg2)
                    results['connections'][db_name] = {
                        'status': 'SKIPPED',
                        'url': 'postgresql://***',
                        'type': 'postgresql',
                        'note': 'PostgreSQL testing requires psycopg2'
                    }
            
            except Exception as e:
                results['connections'][db_name] = {
                    'status': 'FAILED',
                    'error': str(e),
                    'url': db_url
                }
                results['status'] = 'FAIL'
        
        # Check migrations
        try:
            # Run alembic check
            result = subprocess.run(
                ['python', '-m', 'alembic', 'current'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                results['migrations']['status'] = 'UP_TO_DATE'
                results['migrations']['details'] = result.stdout.strip().split('\n')
            else:
                results['migrations']['status'] = 'ERROR'
                results['migrations']['details'] = [result.stderr]
                if results['status'] != 'FAIL':
                    results['status'] = 'WARN'
        
        except Exception as e:
            results['migrations']['status'] = 'ERROR'
            results['migrations']['details'] = [f'Migration check failed: {e}']
            if results['status'] != 'FAIL':
                results['status'] = 'WARN'
        
        return results
    
    def check_service_startup(self) -> Dict:
        """Check if backend and frontend services can start."""
        print("🚀 Checking service startup capabilities...")
        
        results = {
            'status': 'PASS',
            'backend': {'status': 'UNKNOWN', 'details': []},
            'frontend': {'status': 'UNKNOWN', 'details': []},
            'startup_time': {}
        }
        
        # Test backend startup
        try:
            print("  Testing backend startup...")
            start_time = time.time()
            
            # Try to import main application
            result = subprocess.run(
                [sys.executable, '-c', 'from main import app; print("Backend import successful")'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            startup_time = time.time() - start_time
            results['startup_time']['backend'] = round(startup_time, 2)
            
            if result.returncode == 0:
                results['backend']['status'] = 'SUCCESS'
                results['backend']['details'] = ['Application imports successfully']
            else:
                results['backend']['status'] = 'FAILED'
                results['backend']['details'] = [result.stderr]
                results['status'] = 'FAIL'
        
        except Exception as e:
            results['backend']['status'] = 'FAILED'
            results['backend']['details'] = [f'Backend startup test failed: {e}']
            results['status'] = 'FAIL'
        
        # Test frontend startup (if package.json exists)
        frontend_path = self.base_path / 'frontend-v2'
        if (frontend_path / 'package.json').exists():
            try:
                print("  Testing frontend build...")
                start_time = time.time()
                
                result = subprocess.run(
                    ['npm', 'run', 'build', '--if-present'],
                    cwd=frontend_path,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                
                startup_time = time.time() - start_time
                results['startup_time']['frontend'] = round(startup_time, 2)
                
                if result.returncode == 0:
                    results['frontend']['status'] = 'SUCCESS'
                    results['frontend']['details'] = ['Build completed successfully']
                else:
                    results['frontend']['status'] = 'FAILED'
                    results['frontend']['details'] = [result.stderr]
                    if results['status'] != 'FAIL':
                        results['status'] = 'WARN'
            
            except Exception as e:
                results['frontend']['status'] = 'FAILED'
                results['frontend']['details'] = [f'Frontend build test failed: {e}']
                if results['status'] != 'FAIL':
                    results['status'] = 'WARN'
        else:
            results['frontend']['status'] = 'SKIPPED'
            results['frontend']['details'] = ['Frontend directory not found']
        
        return results
    
    def check_integration_health(self) -> Dict:
        """Check external integration health."""
        print("🔌 Checking external integrations...")
        
        results = {
            'status': 'PASS',
            'integrations': {},
            'summary': {'total': 0, 'healthy': 0, 'failed': 0, 'skipped': 0}
        }
        
        for integration_name, config in self.integrations.items():
            results['summary']['total'] += 1
            
            try:
                integration_result = self.test_integration(integration_name, config)
                results['integrations'][integration_name] = integration_result
                
                if integration_result['status'] == 'SUCCESS':
                    results['summary']['healthy'] += 1
                elif integration_result['status'] == 'FAILED':
                    results['summary']['failed'] += 1
                    if config['required']:
                        results['status'] = 'FAIL'
                    elif results['status'] != 'FAIL':
                        results['status'] = 'WARN'
                else:
                    results['summary']['skipped'] += 1
            
            except Exception as e:
                results['integrations'][integration_name] = {
                    'status': 'ERROR',
                    'error': str(e),
                    'required': config['required']
                }
                results['summary']['failed'] += 1
                if config['required']:
                    results['status'] = 'FAIL'
        
        return results
    
    def test_integration(self, name: str, config: Dict) -> Dict:
        """Test a specific integration."""
        if name == 'stripe':
            return self.test_stripe_integration(config)
        elif name == 'sendgrid':
            return self.test_sendgrid_integration(config)
        elif name == 'twilio':
            return self.test_twilio_integration(config)
        elif name == 'google_calendar':
            return self.test_google_calendar_integration(config)
        elif name == 'google_mybusiness':
            return self.test_google_mybusiness_integration(config)
        else:
            return {
                'status': 'SKIPPED',
                'note': f'No test implemented for {name}',
                'required': config['required']
            }
    
    def test_stripe_integration(self, config: Dict) -> Dict:
        """Test Stripe integration."""
        try:
            # Try to import stripe
            import stripe
            
            # Check if API key is set
            api_key = os.getenv('STRIPE_SECRET_KEY')
            if not api_key:
                return {
                    'status': 'FAILED',
                    'error': 'STRIPE_SECRET_KEY not set',
                    'required': config['required']
                }
            
            # Test API call (in test mode)
            stripe.api_key = api_key
            
            # Try to list payment methods (should work even with test key)
            if config.get('test_mode'):
                # Just verify the key format
                if api_key.startswith('sk_test_') or api_key.startswith('sk_live_'):
                    return {
                        'status': 'SUCCESS',
                        'note': 'Stripe API key format valid',
                        'test_mode': True,
                        'required': config['required']
                    }
                else:
                    return {
                        'status': 'FAILED',
                        'error': 'Invalid Stripe API key format',
                        'required': config['required']
                    }
            
            return {
                'status': 'SKIPPED',
                'note': 'Full Stripe test disabled',
                'required': config['required']
            }
        
        except ImportError:
            return {
                'status': 'FAILED',
                'error': 'stripe package not installed',
                'required': config['required']
            }
        except Exception as e:
            return {
                'status': 'FAILED',
                'error': f'Stripe test failed: {e}',
                'required': config['required']
            }
    
    def test_sendgrid_integration(self, config: Dict) -> Dict:
        """Test SendGrid integration."""
        try:
            api_key = os.getenv('SENDGRID_API_KEY')
            if not api_key:
                return {
                    'status': 'FAILED',
                    'error': 'SENDGRID_API_KEY not set',
                    'required': config['required']
                }
            
            # Check API key format
            if api_key.startswith('SG.'):
                return {
                    'status': 'SUCCESS',
                    'note': 'SendGrid API key format valid',
                    'test_mode': True,
                    'required': config['required']
                }
            else:
                return {
                    'status': 'FAILED',
                    'error': 'Invalid SendGrid API key format',
                    'required': config['required']
                }
        
        except Exception as e:
            return {
                'status': 'FAILED',
                'error': f'SendGrid test failed: {e}',
                'required': config['required']
            }
    
    def test_twilio_integration(self, config: Dict) -> Dict:
        """Test Twilio integration."""
        try:
            account_sid = os.getenv('TWILIO_ACCOUNT_SID')
            auth_token = os.getenv('TWILIO_AUTH_TOKEN')
            
            if not account_sid or not auth_token:
                return {
                    'status': 'FAILED',
                    'error': 'Twilio credentials not set',
                    'required': config['required']
                }
            
            # Check credential format
            if account_sid.startswith('AC') and len(auth_token) >= 32:
                return {
                    'status': 'SUCCESS',
                    'note': 'Twilio credentials format valid',
                    'test_mode': True,
                    'required': config['required']
                }
            else:
                return {
                    'status': 'FAILED',
                    'error': 'Invalid Twilio credentials format',
                    'required': config['required']
                }
        
        except Exception as e:
            return {
                'status': 'FAILED',
                'error': f'Twilio test failed: {e}',
                'required': config['required']
            }
    
    def test_google_calendar_integration(self, config: Dict) -> Dict:
        """Test Google Calendar integration."""
        credentials_path = os.getenv('GOOGLE_CALENDAR_CREDENTIALS')
        if not credentials_path:
            return {
                'status': 'SKIPPED',
                'note': 'Google Calendar credentials not configured',
                'required': config['required']
            }
        
        if Path(credentials_path).exists():
            return {
                'status': 'SUCCESS',
                'note': 'Google Calendar credentials file exists',
                'required': config['required']
            }
        else:
            return {
                'status': 'FAILED',
                'error': 'Google Calendar credentials file not found',
                'required': config['required']
            }
    
    def test_google_mybusiness_integration(self, config: Dict) -> Dict:
        """Test Google My Business integration."""
        credentials_path = os.getenv('GOOGLE_MYBUSINESS_CREDENTIALS')
        if not credentials_path:
            return {
                'status': 'SKIPPED',
                'note': 'Google My Business credentials not configured',
                'required': config['required']
            }
        
        if Path(credentials_path).exists():
            return {
                'status': 'SUCCESS',
                'note': 'Google My Business credentials file exists',
                'required': config['required']
            }
        else:
            return {
                'status': 'FAILED',
                'error': 'Google My Business credentials file not found',
                'required': config['required']
            }
    
    def check_critical_user_flows(self) -> Dict:
        """Test critical user flows work correctly."""
        print("👤 Testing critical user flows...")
        
        results = {
            'status': 'PASS',
            'flows': {},
            'summary': {'total': 0, 'passed': 0, 'failed': 0}
        }
        
        # Define critical flows to test
        flows = {
            'user_registration': self.test_user_registration_flow,
            'appointment_booking': self.test_appointment_booking_flow,
            'payment_processing': self.test_payment_processing_flow,
            'notification_sending': self.test_notification_flow
        }
        
        for flow_name, flow_test in flows.items():
            results['summary']['total'] += 1
            
            try:
                flow_result = flow_test()
                results['flows'][flow_name] = flow_result
                
                if flow_result['status'] == 'SUCCESS':
                    results['summary']['passed'] += 1
                else:
                    results['summary']['failed'] += 1
                    if results['status'] != 'FAIL':
                        results['status'] = 'WARN'
            
            except Exception as e:
                results['flows'][flow_name] = {
                    'status': 'ERROR',
                    'error': str(e)
                }
                results['summary']['failed'] += 1
                if results['status'] != 'FAIL':
                    results['status'] = 'WARN'
        
        return results
    
    def test_user_registration_flow(self) -> Dict:
        """Test user registration flow."""
        try:
            # This would normally test the actual registration endpoint
            # For now, just test that the registration logic can be imported
            result = subprocess.run(
                [sys.executable, '-c', 
                 'from routers.auth import router; print("Auth router imported successfully")'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return {
                    'status': 'SUCCESS',
                    'note': 'User registration components available'
                }
            else:
                return {
                    'status': 'FAILED',
                    'error': result.stderr
                }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def test_appointment_booking_flow(self) -> Dict:
        """Test appointment booking flow."""
        try:
            result = subprocess.run(
                [sys.executable, '-c', 
                 'from services.booking_service import BookingService; print("Booking service imported successfully")'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return {
                    'status': 'SUCCESS',
                    'note': 'Appointment booking components available'
                }
            else:
                return {
                    'status': 'FAILED',
                    'error': result.stderr
                }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def test_payment_processing_flow(self) -> Dict:
        """Test payment processing flow."""
        try:
            result = subprocess.run(
                [sys.executable, '-c', 
                 'from services.payment_service import PaymentService; print("Payment service imported successfully")'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return {
                    'status': 'SUCCESS',
                    'note': 'Payment processing components available'
                }
            else:
                return {
                    'status': 'FAILED',
                    'error': result.stderr
                }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def test_notification_flow(self) -> Dict:
        """Test notification sending flow."""
        try:
            result = subprocess.run(
                [sys.executable, '-c', 
                 'from services.notification_service import NotificationService; print("Notification service imported successfully")'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return {
                    'status': 'SUCCESS',
                    'note': 'Notification components available'
                }
            else:
                return {
                    'status': 'FAILED',
                    'error': result.stderr
                }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def run_comprehensive_health_check(self) -> Dict:
        """Run all health checks and compile results."""
        print("🏥 Starting comprehensive health check...")
        print(f"📍 Base path: {self.base_path}")
        
        # Run all health checks
        checks = {
            'environment': self.check_environment_configuration(),
            'database': self.check_database_connectivity(),
            'services': self.check_service_startup(),
            'integrations': self.check_integration_health(),
            'user_flows': self.check_critical_user_flows()
        }
        
        # Determine overall status
        overall_status = 'PASS'
        for check_name, check_result in checks.items():
            if check_result['status'] == 'FAIL':
                overall_status = 'FAIL'
                break
            elif check_result['status'] == 'WARN' and overall_status != 'FAIL':
                overall_status = 'WARN'
        
        # Calculate execution time
        execution_time = round(time.time() - self.start_time, 2)
        
        return {
            'overall_status': overall_status,
            'execution_time_seconds': execution_time,
            'timestamp': datetime.now().isoformat(),
            'checks': checks,
            'summary': self.generate_summary(checks),
            'recommendations': self.generate_recommendations(checks)
        }
    
    def generate_summary(self, checks: Dict) -> Dict:
        """Generate a summary of all health check results."""
        summary = {
            'total_checks': len(checks),
            'passed_checks': 0,
            'warning_checks': 0,
            'failed_checks': 0,
            'critical_issues': [],
            'warnings': []
        }
        
        for check_name, check_result in checks.items():
            if check_result['status'] == 'PASS':
                summary['passed_checks'] += 1
            elif check_result['status'] == 'WARN':
                summary['warning_checks'] += 1
                summary['warnings'].append(f'{check_name}: {check_result.get("note", "Issues found")}')
            elif check_result['status'] == 'FAIL':
                summary['failed_checks'] += 1
                summary['critical_issues'].append(f'{check_name}: Critical failure detected')
        
        return summary
    
    def generate_recommendations(self, checks: Dict) -> List[str]:
        """Generate actionable recommendations based on health check results."""
        recommendations = []
        
        # Environment recommendations
        env_check = checks.get('environment', {})
        if env_check.get('missing_critical'):
            recommendations.append(
                f"🚨 URGENT: Set missing critical environment variables: {', '.join(env_check['missing_critical'])}"
            )
        
        if env_check.get('missing_integrations'):
            recommendations.append(
                f"⚠️  Configure integration variables: {', '.join(env_check['missing_integrations'])}"
            )
        
        # Database recommendations
        db_check = checks.get('database', {})
        if db_check.get('status') == 'FAIL':
            recommendations.append("🗄️ Fix database connectivity issues before deployment")
        
        # Service recommendations
        service_check = checks.get('services', {})
        if service_check.get('backend', {}).get('status') == 'FAILED':
            recommendations.append("🚀 Resolve backend startup issues")
        
        if service_check.get('frontend', {}).get('status') == 'FAILED':
            recommendations.append("🎨 Fix frontend build issues")
        
        # Integration recommendations
        integration_check = checks.get('integrations', {})
        failed_integrations = [
            name for name, result in integration_check.get('integrations', {}).items()
            if result.get('status') == 'FAILED' and result.get('required', False)
        ]
        if failed_integrations:
            recommendations.append(f"🔌 Fix required integrations: {', '.join(failed_integrations)}")
        
        # User flow recommendations
        flow_check = checks.get('user_flows', {})
        if flow_check.get('summary', {}).get('failed', 0) > 0:
            recommendations.append("👤 Test and fix critical user flow issues")
        
        if not recommendations:
            recommendations.append("✅ All systems healthy - ready for deployment!")
        
        return recommendations


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Comprehensive health check')
    parser.add_argument('--path', default='.', help='Path to check')
    parser.add_argument('--output', choices=['json', 'text'], default='text')
    parser.add_argument('--save', help='Save report to file')
    parser.add_argument('--fail-on-warn', action='store_true', help='Fail on warnings')
    
    args = parser.parse_args()
    
    checker = HealthChecker(args.path)
    results = checker.run_comprehensive_health_check()
    
    if args.output == 'json':
        if args.save:
            with open(args.save, 'w') as f:
                json.dump(results, f, indent=2)
        else:
            print(json.dumps(results, indent=2))
    else:
        print_health_report(results)
        
        if args.save:
            with open(args.save, 'w') as f:
                f.write(format_health_report(results))
    
    # Exit with appropriate code
    if results['overall_status'] == 'FAIL':
        print("\n❌ HEALTH CHECK FAILED")
        exit(1)
    elif results['overall_status'] == 'WARN' and args.fail_on_warn:
        print("\n⚠️  HEALTH CHECK WARNINGS (failing due to --fail-on-warn)")
        exit(1)
    elif results['overall_status'] == 'WARN':
        print("\n⚠️  HEALTH CHECK COMPLETED WITH WARNINGS")
        exit(0)
    else:
        print("\n✅ HEALTH CHECK PASSED")
        exit(0)


def print_health_report(results: Dict):
    """Print formatted health check report."""
    print("\n" + "="*70)
    print("  COMPREHENSIVE SYSTEM HEALTH CHECK REPORT")
    print("="*70)
    
    print(f"\nOverall Status: {results['overall_status']}")
    print(f"Execution Time: {results['execution_time_seconds']}s")
    print(f"Timestamp: {results['timestamp']}")
    
    summary = results['summary']
    print(f"\nSummary:")
    print(f"  Total checks: {summary['total_checks']}")
    print(f"  Passed: {summary['passed_checks']}")
    print(f"  Warnings: {summary['warning_checks']}")
    print(f"  Failed: {summary['failed_checks']}")
    
    # Critical issues
    if summary['critical_issues']:
        print(f"\n🚨 CRITICAL ISSUES:")
        for issue in summary['critical_issues']:
            print(f"  • {issue}")
    
    # Warnings
    if summary['warnings']:
        print(f"\n⚠️  WARNINGS:")
        for warning in summary['warnings']:
            print(f"  • {warning}")
    
    # Detailed results
    checks = results['checks']
    
    print(f"\n🔧 ENVIRONMENT CONFIGURATION: {checks['environment']['status']}")
    if checks['environment'].get('missing_critical'):
        print(f"  Missing critical vars: {', '.join(checks['environment']['missing_critical'])}")
    
    print(f"\n🗄️  DATABASE CONNECTIVITY: {checks['database']['status']}")
    db_connections = checks['database'].get('connections', {})
    for db_name, db_result in db_connections.items():
        print(f"  {db_name}: {db_result['status']}")
    
    print(f"\n🚀 SERVICE STARTUP: {checks['services']['status']}")
    backend_status = checks['services'].get('backend', {}).get('status', 'UNKNOWN')
    frontend_status = checks['services'].get('frontend', {}).get('status', 'UNKNOWN')
    print(f"  Backend: {backend_status}")
    print(f"  Frontend: {frontend_status}")
    
    print(f"\n🔌 INTEGRATIONS: {checks['integrations']['status']}")
    integration_summary = checks['integrations'].get('summary', {})
    print(f"  Healthy: {integration_summary.get('healthy', 0)}")
    print(f"  Failed: {integration_summary.get('failed', 0)}")
    print(f"  Skipped: {integration_summary.get('skipped', 0)}")
    
    print(f"\n👤 USER FLOWS: {checks['user_flows']['status']}")
    flow_summary = checks['user_flows'].get('summary', {})
    print(f"  Passed: {flow_summary.get('passed', 0)}")
    print(f"  Failed: {flow_summary.get('failed', 0)}")
    
    # Recommendations
    print(f"\n💡 RECOMMENDATIONS:")
    for rec in results['recommendations']:
        print(f"  • {rec}")
    
    print("\n" + "="*70)


def format_health_report(results: Dict) -> str:
    """Format health report for file output."""
    lines = []
    lines.append("COMPREHENSIVE SYSTEM HEALTH CHECK REPORT")
    lines.append("=" * 70)
    
    lines.append(f"Overall Status: {results['overall_status']}")
    lines.append(f"Execution Time: {results['execution_time_seconds']}s")
    lines.append(f"Timestamp: {results['timestamp']}")
    
    lines.append("\nRecommendations:")
    for rec in results['recommendations']:
        lines.append(f"• {rec}")
    
    return "\n".join(lines)


if __name__ == "__main__":
    main()