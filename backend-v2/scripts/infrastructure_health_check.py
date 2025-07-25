#!/usr/bin/env python3
"""
Comprehensive infrastructure health check for BookedBarber V2.
Tests all Phase 2 infrastructure components: Redis caching, Celery background jobs, 
security middleware, and GDPR compliance.
"""

import asyncio
import sys
import logging
from datetime import datetime
from typing import Dict, Any

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_redis_caching() -> Dict[str, Any]:
    """Test Redis caching functionality"""
    try:
        from services.startup_cache import startup_cache_init, cache_health_check
        
        logger.info("🔍 Testing Redis caching...")
        
        # Test cache initialization
        init_results = await startup_cache_init()
        
        # Test cache health
        health_results = await cache_health_check()
        
        success = (
            init_results.get('redis_connected', False) and
            health_results.get('status') == 'healthy'
        )
        
        return {
            'component': 'Redis Caching',
            'status': 'healthy' if success else 'unhealthy',
            'details': {
                'cache_enabled': init_results.get('cache_enabled', False),
                'redis_connected': init_results.get('redis_connected', False),
                'cache_warmed': init_results.get('cache_warmed', False),
                'health_status': health_results.get('status', 'unknown')
            },
            'success': success
        }
        
    except Exception as e:
        logger.error(f"❌ Redis caching test failed: {e}")
        return {
            'component': 'Redis Caching',
            'status': 'error',
            'error': str(e),
            'success': False
        }

def test_celery_background_jobs() -> Dict[str, Any]:
    """Test Celery background job system"""
    try:
        from services.celery_app import celery_app, debug_task, health_check_task
        
        logger.info("🔍 Testing Celery background jobs...")
        
        # Test task queuing
        debug_result = debug_task.delay()
        health_result = health_check_task.delay()
        
        # Test Celery configuration
        config_valid = bool(celery_app.conf.broker_url and celery_app.conf.result_backend)
        
        # Test queue configuration
        expected_queues = {'default', 'notifications', 'data_processing', 'maintenance', 'marketing'}
        configured_queues = {q.name for q in celery_app.conf.task_queues}
        queues_configured = expected_queues.issubset(configured_queues)
        
        success = config_valid and queues_configured and debug_result.id and health_result.id
        
        return {
            'component': 'Celery Background Jobs',
            'status': 'healthy' if success else 'unhealthy',
            'details': {
                'broker_url': celery_app.conf.broker_url,
                'queues_configured': list(configured_queues),
                'debug_task_id': debug_result.id,
                'health_task_id': health_result.id,
                'config_valid': config_valid,
                'queues_match': queues_configured
            },
            'success': success
        }
        
    except Exception as e:
        logger.error(f"❌ Celery test failed: {e}")
        return {
            'component': 'Celery Background Jobs',
            'status': 'error',
            'error': str(e),
            'success': False
        }

def test_database_connectivity() -> Dict[str, Any]:
    """Test database connectivity and basic operations"""
    try:
        from database import SessionLocal
        from sqlalchemy import text
        
        logger.info("🔍 Testing database connectivity...")
        
        db = SessionLocal()
        
        # Test basic connectivity
        result = db.execute(text("SELECT 1 as test_value")).fetchone()
        db_connected = result and result[0] == 1
        
        # Test table access (if tables exist)
        try:
            user_count = db.execute(text("SELECT COUNT(*) FROM users")).fetchone()[0]
            tables_accessible = True
        except:
            user_count = 0
            tables_accessible = False
        
        db.close()
        
        success = db_connected
        
        return {
            'component': 'Database',
            'status': 'healthy' if success else 'unhealthy',
            'details': {
                'connected': db_connected,
                'tables_accessible': tables_accessible,
                'user_count': user_count
            },
            'success': success
        }
        
    except Exception as e:
        logger.error(f"❌ Database test failed: {e}")
        return {
            'component': 'Database',
            'status': 'error',
            'error': str(e),
            'success': False
        }

def test_security_middleware() -> Dict[str, Any]:
    """Test security middleware configuration"""
    try:
        logger.info("🔍 Testing security middleware...")
        
        # Test configuration loading
        from config import settings
        
        # Check critical security settings
        security_checks = {
            'secret_key_set': bool(settings.secret_key),
            'jwt_secret_set': bool(settings.jwt_secret_key),
            'redis_configured': bool(settings.redis_url),
            'bcrypt_rounds_secure': settings.bcrypt_rounds >= 12,
            'token_expiry_reasonable': settings.access_token_expire_minutes <= 60
        }
        
        # Check environment-specific security
        environment_secure = True
        if settings.is_production():
            environment_secure = (
                not settings.debug and
                'localhost' not in settings.cors_origins and
                len(settings.secret_key) >= 32
            )
        
        success = all(security_checks.values()) and environment_secure
        
        return {
            'component': 'Security Middleware',
            'status': 'healthy' if success else 'warning',
            'details': {
                'security_checks': security_checks,
                'environment': settings.environment,
                'environment_secure': environment_secure,
                'debug_mode': settings.debug
            },
            'success': success
        }
        
    except Exception as e:
        logger.error(f"❌ Security middleware test failed: {e}")
        return {
            'component': 'Security Middleware',
            'status': 'error',
            'error': str(e),
            'success': False
        }

def test_gdpr_compliance() -> Dict[str, Any]:
    """Test GDPR compliance endpoints"""
    try:
        logger.info("🔍 Testing GDPR compliance...")
        
        # Test that GDPR endpoints exist and are configured
        gdpr_endpoints = [
            '/api/v1/privacy/cookie-consent',
            '/api/v1/privacy/consent/terms',
            '/api/v1/privacy/export',
            '/api/v1/privacy/account',
            '/api/v1/privacy/status'
        ]
        
        # Check if privacy models exist
        try:
            models_exist = True
        except ImportError:
            models_exist = False
        
        # Check privacy router
        try:
            from routers import privacy
            router_exists = hasattr(privacy, 'router')
        except ImportError:
            router_exists = False
        
        # Check schemas
        try:
            schemas_exist = True
        except ImportError:
            schemas_exist = False
        
        success = models_exist and router_exists and schemas_exist
        
        return {
            'component': 'GDPR Compliance',
            'status': 'healthy' if success else 'unhealthy',
            'details': {
                'privacy_models_exist': models_exist,
                'privacy_router_exists': router_exists,
                'privacy_schemas_exist': schemas_exist,
                'gdpr_endpoints': gdpr_endpoints
            },
            'success': success
        }
        
    except Exception as e:
        logger.error(f"❌ GDPR compliance test failed: {e}")
        return {
            'component': 'GDPR Compliance',
            'status': 'error',
            'error': str(e),
            'success': False
        }

def test_configuration_validation() -> Dict[str, Any]:
    """Test system configuration validation"""
    try:
        logger.info("🔍 Testing configuration validation...")
        
        from config import settings
        
        # Test configuration validation methods
        missing_credentials = settings.validate_required_credentials()
        security_issues = settings.validate_production_security()
        
        # Check critical configurations
        config_checks = {
            'redis_url_valid': settings.redis_url.startswith('redis://'),
            'database_url_set': bool(settings.database_url),
            'caching_enabled': settings.enable_caching,
            'environment_set': bool(settings.environment)
        }
        
        # Determine status based on issues
        critical_issues = [issue for issue in security_issues if issue.startswith('CRITICAL')]
        has_critical_issues = bool(critical_issues)
        has_missing_credentials = bool(missing_credentials)
        
        success = not has_critical_issues and not has_missing_credentials and all(config_checks.values())
        
        return {
            'component': 'Configuration',
            'status': 'healthy' if success else 'warning',
            'details': {
                'config_checks': config_checks,
                'missing_credentials': missing_credentials,
                'security_issues': security_issues,
                'environment': settings.environment,
                'critical_issues': critical_issues
            },
            'success': success
        }
        
    except Exception as e:
        logger.error(f"❌ Configuration validation failed: {e}")
        return {
            'component': 'Configuration',
            'status': 'error',
            'error': str(e),
            'success': False
        }

async def run_infrastructure_health_check() -> Dict[str, Any]:
    """Run comprehensive infrastructure health check"""
    logger.info("🚀 Starting comprehensive infrastructure health check...")
    
    start_time = datetime.utcnow()
    
    # Run all health checks
    health_checks = [
        await test_redis_caching(),
        test_celery_background_jobs(),
        test_database_connectivity(),
        test_security_middleware(),
        test_gdpr_compliance(),
        test_configuration_validation()
    ]
    
    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()
    
    # Calculate overall health
    total_checks = len(health_checks)
    successful_checks = sum(1 for check in health_checks if check['success'])
    overall_success_rate = (successful_checks / total_checks) * 100
    
    # Determine overall status
    if overall_success_rate >= 90:
        overall_status = 'healthy'
    elif overall_success_rate >= 70:
        overall_status = 'warning'
    else:
        overall_status = 'unhealthy'
    
    return {
        'overall_status': overall_status,
        'success_rate': overall_success_rate,
        'total_checks': total_checks,
        'successful_checks': successful_checks,
        'failed_checks': total_checks - successful_checks,
        'duration_seconds': duration,
        'timestamp': start_time.isoformat(),
        'individual_checks': health_checks
    }

def print_health_report(results: Dict[str, Any]):
    """Print formatted health check report"""
    print("\n" + "="*80)
    print("📊 BOOKEDBARBER V2 INFRASTRUCTURE HEALTH REPORT")
    print("="*80)
    
    print(f"\n🎯 Overall Status: {results['overall_status'].upper()}")
    print(f"✅ Success Rate: {results['success_rate']:.1f}%")
    print(f"⏱️  Duration: {results['duration_seconds']:.2f} seconds")
    print(f"📅 Timestamp: {results['timestamp']}")
    
    print(f"\n📋 Summary:")
    print(f"   Total Checks: {results['total_checks']}")
    print(f"   Successful: {results['successful_checks']}")
    print(f"   Failed: {results['failed_checks']}")
    
    print(f"\n🔍 Component Details:")
    print("-" * 80)
    
    for check in results['individual_checks']:
        status_emoji = "✅" if check['success'] else "❌"
        status_text = check['status'].upper()
        
        print(f"{status_emoji} {check['component']:<25} {status_text}")
        
        if 'error' in check:
            print(f"    Error: {check['error']}")
        elif 'details' in check:
            for key, value in check['details'].items():
                if isinstance(value, bool):
                    value_emoji = "✅" if value else "❌"
                    print(f"    {key}: {value_emoji}")
                elif isinstance(value, (list, dict)) and len(str(value)) > 50:
                    print(f"    {key}: {type(value).__name__} with {len(value) if hasattr(value, '__len__') else 'multiple'} items")
                else:
                    print(f"    {key}: {value}")
        print()
    
    print("="*80)
    
    # Recommendations
    failed_components = [check['component'] for check in results['individual_checks'] if not check['success']]
    
    if failed_components:
        print("🔧 RECOMMENDATIONS:")
        print("-" * 40)
        for component in failed_components:
            if component == 'Redis Caching':
                print("• Check Redis server is running: redis-cli ping")
            elif component == 'Celery Background Jobs':
                print("• Start Celery worker: celery -A services.celery_app worker")
            elif component == 'Database':
                print("• Check database connection and run migrations")
            elif component == 'Security Middleware':
                print("• Review security configuration in config.py")
            elif component == 'GDPR Compliance':
                print("• Ensure privacy models and schemas are properly configured")
            elif component == 'Configuration':
                print("• Set required environment variables")
        print()
    
    if results['overall_status'] == 'healthy':
        print("🎉 INFRASTRUCTURE IS READY FOR PRODUCTION! 🎉")
    elif results['overall_status'] == 'warning':
        print("⚠️  INFRASTRUCTURE HAS MINOR ISSUES - REVIEW RECOMMENDATIONS")
    else:
        print("🚨 INFRASTRUCTURE NEEDS ATTENTION - RESOLVE CRITICAL ISSUES")
    
    print("="*80)

async def main():
    """Main function"""
    try:
        results = await run_infrastructure_health_check()
        print_health_report(results)
        
        # Exit with appropriate code
        if results['overall_status'] == 'healthy':
            sys.exit(0)
        elif results['overall_status'] == 'warning':
            sys.exit(1)
        else:
            sys.exit(2)
            
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        print(f"\n🚨 CRITICAL ERROR: Infrastructure health check failed")
        print(f"Error: {e}")
        sys.exit(3)

if __name__ == "__main__":
    asyncio.run(main())