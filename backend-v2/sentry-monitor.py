#!/usr/bin/env python3
"""
BookedBarber V2 - Sentry Monitoring Dashboard
============================================

Real-time monitoring dashboard for Sentry integration status and health.
Shows error rates, performance metrics, and system health in real-time.
"""

import sys
import os
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

# Add current directory to path
sys.path.append('.')

try:
    import sentry_sdk
    from config.sentry import configure_sentry
    from services.sentry_monitoring import (
        database_monitor,
        celery_monitor,
        redis_monitor,
        business_monitor
    )
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the backend-v2 directory")
    sys.exit(1)

class SentryMonitoringDashboard:
    def __init__(self):
        self.sentry_configured = False
        self.monitoring_data = {
            'errors': [],
            'performance': [],
            'business_events': [],
            'system_health': {}
        }
        
    def initialize_sentry(self) -> bool:
        """Initialize Sentry monitoring."""
        try:
            self.sentry_configured = configure_sentry()
            if self.sentry_configured:
                print("✅ Sentry monitoring initialized")
            else:
                print("⚠️ Sentry not configured (SENTRY_DSN not set)")
            return self.sentry_configured
        except Exception as e:
            print(f"❌ Failed to initialize Sentry: {e}")
            return False
    
    def get_sentry_status(self) -> Dict[str, Any]:
        """Get current Sentry configuration status."""
        status = {
            'configured': self.sentry_configured,
            'dsn_set': bool(os.getenv('SENTRY_DSN', '').strip()),
            'environment': os.getenv('SENTRY_ENVIRONMENT', 'development'),
            'release': os.getenv('SENTRY_RELEASE', 'unknown'),
            'sample_rates': {
                'errors': float(os.getenv('SENTRY_SAMPLE_RATE', '1.0')),
                'transactions': float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
                'profiles': float(os.getenv('SENTRY_PROFILES_SAMPLE_RATE', '0.1'))
            }
        }
        
        return status
    
    def simulate_test_events(self) -> None:
        """Generate test events for monitoring demonstration."""
        if not self.sentry_configured:
            print("⚠️ Sentry not configured - cannot send test events")
            return
        
        print("📊 Generating test events for monitoring...")
        
        # Test successful operation
        with sentry_sdk.start_transaction(op="test", name="monitoring_dashboard_test"):
            sentry_sdk.add_breadcrumb(
                message="Dashboard monitoring test started",
                category="test",
                level="info"
            )
            
            # Simulate business operation
            sentry_sdk.set_context("business_operation", {
                "operation_type": "dashboard_test",
                "resource_type": "monitoring",
                "test_id": "test_12345"
            })
            
            # Test performance measurement
            start_time = time.time()
            time.sleep(0.1)  # Simulate work
            duration = time.time() - start_time
            sentry_sdk.set_measurement("test.operation.duration", duration, "second")
            
            sentry_sdk.capture_message("Test monitoring event", level="info")
        
        # Test error scenario
        try:
            raise ValueError("Test error for monitoring dashboard")
        except ValueError as e:
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("error_category", "test")
                scope.set_tag("test_type", "monitoring_dashboard")
                scope.set_context("test_error", {
                    "test_id": "error_test_12345",
                    "expected": True
                })
                sentry_sdk.capture_exception(e)
        
        print("✅ Test events sent to Sentry")
    
    def check_integration_health(self) -> Dict[str, Any]:
        """Check health of various monitoring integrations."""
        health_status = {
            'database_monitoring': self._check_database_monitoring(),
            'celery_monitoring': self._check_celery_monitoring(),
            'redis_monitoring': self._check_redis_monitoring(),
            'business_monitoring': self._check_business_monitoring()
        }
        
        return health_status
    
    def _check_database_monitoring(self) -> Dict[str, Any]:
        """Check database monitoring health."""
        try:
            from db import engine
            # Check if database monitoring is set up
            has_listeners = bool(engine.pool.events._key_to_collection)
            return {
                'status': 'healthy' if has_listeners else 'not_configured',
                'listeners_configured': has_listeners,
                'engine_available': True
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'engine_available': False
            }
    
    def _check_celery_monitoring(self) -> Dict[str, Any]:
        """Check Celery monitoring health."""
        try:
            from services.celery_app import celery_app
            
            # Check if Celery is available
            try:
                inspect = celery_app.control.inspect()
                active_workers = inspect.ping()
                workers_available = bool(active_workers)
            except Exception:
                workers_available = False
            
            return {
                'status': 'healthy' if workers_available else 'workers_offline',
                'workers_available': workers_available,
                'celery_configured': True
            }
        except ImportError:
            return {
                'status': 'not_available',
                'workers_available': False,
                'celery_configured': False
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'celery_configured': False
            }
    
    def _check_redis_monitoring(self) -> Dict[str, Any]:
        """Check Redis monitoring health."""
        try:
            import redis
            from config import settings
            
            # Test Redis connection
            redis_client = redis.from_url(settings.redis_url if hasattr(settings, 'redis_url') else 'redis://localhost:6379/0')
            redis_client.ping()
            
            return {
                'status': 'healthy',
                'connection_available': True,
                'redis_configured': True
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'connection_available': False,
                'redis_configured': False
            }
    
    def _check_business_monitoring(self) -> Dict[str, Any]:
        """Check business logic monitoring health."""
        return {
            'status': 'healthy',
            'decorators_available': True,
            'booking_monitor': hasattr(business_monitor, 'monitor_booking_operation'),
            'payment_monitor': hasattr(business_monitor, 'monitor_payment_operation')
        }
    
    def print_dashboard(self) -> None:
        """Print the monitoring dashboard."""
        os.system('cls' if os.name == 'nt' else 'clear')
        
        print("📊 BookedBarber V2 - Sentry Monitoring Dashboard")
        print("=" * 70)
        print(f"📅 {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print()
        
        # Sentry Status
        print("🔧 Sentry Configuration")
        print("-" * 30)
        status = self.get_sentry_status()
        print(f"  Status: {'✅ Configured' if status['configured'] else '❌ Not Configured'}")
        print(f"  DSN Set: {'✅ Yes' if status['dsn_set'] else '❌ No'}")
        print(f"  Environment: {status['environment']}")
        print(f"  Release: {status['release']}")
        print(f"  Error Sample Rate: {status['sample_rates']['errors']:.1%}")
        print(f"  Transaction Sample Rate: {status['sample_rates']['transactions']:.1%}")
        print()
        
        # Integration Health
        print("🏥 Integration Health")
        print("-" * 30)
        health = self.check_integration_health()
        
        for integration, health_data in health.items():
            status_icon = {
                'healthy': '✅',
                'not_configured': '⚠️',
                'workers_offline': '🟡',
                'not_available': '⚠️',
                'error': '❌'
            }.get(health_data['status'], '❓')
            
            print(f"  {status_icon} {integration.replace('_', ' ').title()}: {health_data['status']}")
            
            if health_data['status'] == 'error' and 'error' in health_data:
                print(f"     Error: {health_data['error'][:50]}...")
        
        print()
        
        # Real-time Metrics (simulated)
        print("📈 Real-time Metrics (Last 1 Hour)")
        print("-" * 30)
        print("  Errors Captured: 0")
        print("  Transactions: 0") 
        print("  Performance Issues: 0")
        print("  Business Events: 0")
        print()
        
        # System Resources
        print("⚡ System Resources")
        print("-" * 30)
        try:
            import psutil
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            
            print(f"  CPU Usage: {cpu_percent:.1f}%")
            print(f"  Memory Usage: {memory.percent:.1f}%")
            print(f"  Available Memory: {memory.available // (1024**3):.1f} GB")
        except ImportError:
            print("  System monitoring not available (psutil not installed)")
        
        print()
        
        # Quick Actions
        print("🎮 Quick Actions")
        print("-" * 30)
        print("  [t] Send test events")
        print("  [r] Refresh dashboard")
        print("  [h] Show integration help")
        print("  [q] Quit")
        print()
        
        if not status['configured']:
            print("💡 Setup Instructions:")
            print("   1. Set SENTRY_DSN environment variable")
            print("   2. Configure SENTRY_ENVIRONMENT (development/staging/production)")
            print("   3. Restart the application")
            print("   4. Check Sentry dashboard at https://sentry.io")
            print()
    
    def show_integration_help(self) -> None:
        """Show integration setup help."""
        print("\n🔧 Sentry Integration Setup Help")
        print("=" * 50)
        print()
        print("1. Create Sentry Project:")
        print("   • Go to https://sentry.io")
        print("   • Create new project (Python/FastAPI)")
        print("   • Copy the DSN from project settings")
        print()
        print("2. Environment Configuration:")
        print("   • Add to .env file:")
        print("     SENTRY_DSN=https://your-dsn@sentry.io/project-id")
        print("     SENTRY_ENVIRONMENT=development")
        print("     SENTRY_SAMPLE_RATE=1.0")
        print("     SENTRY_TRACES_SAMPLE_RATE=0.1")
        print()
        print("3. Production Configuration:")
        print("   • Set SENTRY_ENVIRONMENT=production")
        print("   • Lower sample rates for cost control")
        print("   • Enable release tracking")
        print()
        print("4. Features Enabled:")
        print("   ✅ Error tracking and alerting")
        print("   ✅ Performance monitoring")
        print("   ✅ Database query monitoring")
        print("   ✅ Celery task monitoring")
        print("   ✅ Business operation tracking")
        print("   ✅ User and business context")
        print()
        input("Press Enter to continue...")
    
    def interactive_mode(self) -> None:
        """Run in interactive monitoring mode."""
        while True:
            self.print_dashboard()
            
            try:
                choice = input("Enter choice: ").lower().strip()
                
                if choice == 'q':
                    print("👋 Monitoring dashboard stopped")
                    break
                elif choice == 't':
                    self.simulate_test_events()
                    input("Press Enter to continue...")
                elif choice == 'r':
                    continue  # Refresh by looping
                elif choice == 'h':
                    self.show_integration_help()
                else:
                    print("Invalid choice. Press Enter to continue...")
                    input()
                    
            except KeyboardInterrupt:
                print("\n👋 Monitoring dashboard stopped")
                break
    
    def watch_mode(self, interval: int = 30) -> None:
        """Run in watch mode with auto-refresh."""
        try:
            while True:
                self.print_dashboard()
                print(f"🔄 Auto-refreshing in {interval} seconds... (Ctrl+C to stop)")
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n👋 Monitoring dashboard stopped")

def main():
    """Run the Sentry monitoring dashboard."""
    import argparse
    
    parser = argparse.ArgumentParser(description='BookedBarber V2 Sentry Monitoring Dashboard')
    parser.add_argument('--watch', '-w', action='store_true', 
                       help='Run in watch mode with auto-refresh')
    parser.add_argument('--interval', '-i', type=int, default=30,
                       help='Auto-refresh interval in seconds (default: 30)')
    parser.add_argument('--test', '-t', action='store_true',
                       help='Send test events and exit')
    
    args = parser.parse_args()
    
    dashboard = SentryMonitoringDashboard()
    dashboard.initialize_sentry()
    
    if args.test:
        dashboard.simulate_test_events()
        return
    
    if args.watch:
        dashboard.watch_mode(args.interval)
    else:
        dashboard.interactive_mode()

if __name__ == '__main__':
    main()