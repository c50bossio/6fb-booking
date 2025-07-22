"""
Production Deployment Preparation for BookedBarber V2
Comprehensive checklist and automated deployment validation
"""

import os
import subprocess
import json
import sys
from datetime import datetime
from typing import Dict, List, Any, Tuple
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProductionDeploymentManager:
    """Manages production deployment preparation and validation"""
    
    def __init__(self, project_root: str = "/Users/bossio/6fb-booking/backend-v2"):
        self.project_root = Path(project_root)
        self.deployment_checks = []
        self.deployment_status = {
            'environment_config': False,
            'database_migrations': False,
            'security_validation': False,
            'performance_testing': False,
            'monitoring_setup': False,
            'backup_procedures': False,
            'documentation_complete': False
        }
    
    def check_environment_configuration(self) -> Tuple[bool, List[str]]:
        """Validate production environment configuration"""
        logger.info("🔧 Checking Environment Configuration...")
        
        issues = []
        required_env_vars = [
            'DATABASE_URL',
            'SECRET_KEY',
            'STRIPE_SECRET_KEY',
            'STRIPE_PUBLISHABLE_KEY',
            'REDIS_URL',
            'ENVIRONMENT'
        ]
        
        # Check for production environment template
        env_template = self.project_root / '.env.production.template'
        env_example = self.project_root / '.env.example'
        
        if not env_template.exists() and not env_example.exists():
            issues.append("Missing production environment template")
        
        # Check required environment variables are documented
        if env_template.exists():
            template_content = env_template.read_text()
            for var in required_env_vars:
                if var not in template_content:
                    issues.append(f"Environment variable {var} not documented in template")
        
        # Validate configuration files
        config_files = [
            'config.py',
            'database.py'
        ]
        
        for config_file in config_files:
            config_path = self.project_root / config_file
            if not config_path.exists():
                issues.append(f"Missing configuration file: {config_file}")
        
        # Check for secret management
        if not os.getenv('SECRET_KEY'):
            issues.append("SECRET_KEY not configured (required for production)")
        
        success = len(issues) == 0
        if success:
            logger.info("✅ Environment configuration validation passed")
        else:
            logger.warning(f"❌ Environment configuration issues: {len(issues)} found")
            for issue in issues:
                logger.warning(f"   • {issue}")
        
        return success, issues
    
    def check_database_readiness(self) -> Tuple[bool, List[str]]:
        """Validate database migrations and performance"""
        logger.info("🗄️ Checking Database Readiness...")
        
        issues = []
        
        # Check for migration files
        migrations_dir = self.project_root / 'alembic' / 'versions'
        if not migrations_dir.exists():
            issues.append("Alembic migrations directory not found")
        else:
            migration_files = list(migrations_dir.glob('*.py'))
            if len(migration_files) == 0:
                issues.append("No migration files found")
            else:
                logger.info(f"   Found {len(migration_files)} migration files")
        
        # Check for performance indexes
        performance_script = self.project_root / 'scripts' / 'apply_performance_indexes.py'
        if not performance_script.exists():
            issues.append("Performance indexes script not found")
        
        # Check alembic configuration
        alembic_ini = self.project_root / 'alembic.ini'
        if not alembic_ini.exists():
            issues.append("alembic.ini configuration file missing")
        
        # Validate database connection settings
        try:
            import database
            logger.info("   ✅ Database module imports successfully")
        except ImportError as e:
            issues.append(f"Database module import error: {e}")
        
        success = len(issues) == 0
        if success:
            logger.info("✅ Database readiness validation passed")
        else:
            logger.warning(f"❌ Database readiness issues: {len(issues)} found")
        
        return success, issues
    
    def check_security_configuration(self) -> Tuple[bool, List[str]]:
        """Validate security configuration for production"""
        logger.info("🔒 Checking Security Configuration...")
        
        issues = []
        
        # Check for HTTPS configuration
        security_headers_middleware = self.project_root / 'middleware' / '__init__.py'
        if security_headers_middleware.exists():
            logger.info("   ✅ Security middleware found")
        else:
            issues.append("Security middleware not configured")
        
        # Check for rate limiting
        rate_limit_utils = self.project_root / 'utils' / 'rate_limit.py'
        if not rate_limit_utils.exists():
            issues.append("Rate limiting not configured")
        
        # Check for authentication configuration
        auth_utils = self.project_root / 'utils' / 'auth.py'
        if not auth_utils.exists():
            issues.append("Authentication utilities missing")
        
        # Validate CORS settings
        main_py = self.project_root / 'main.py'
        if main_py.exists():
            main_content = main_py.read_text()
            if 'CORSMiddleware' not in main_content:
                issues.append("CORS middleware not configured")
            if 'localhost' in main_content:
                issues.append("Development CORS settings may still be active")
        
        # Check for sensitive data exposure
        sensitive_patterns = [
            'password=',
            'secret=',
            'key=',
            'token='
        ]
        
        for py_file in self.project_root.rglob('*.py'):
            if 'venv' in str(py_file) or '__pycache__' in str(py_file):
                continue
            try:
                content = py_file.read_text().lower()
                for pattern in sensitive_patterns:
                    if pattern in content and 'test' not in str(py_file):
                        # Check if it's actually hardcoded (not just variable names)
                        lines = content.split('\\n')
                        for line in lines:
                            if pattern in line and ('=' in line) and ('os.getenv' not in line):
                                if not line.strip().startswith('#'):
                                    issues.append(f"Potential hardcoded secret in {py_file.name}")
                                    break
            except:
                pass
        
        success = len(issues) == 0
        if success:
            logger.info("✅ Security configuration validation passed")
        else:
            logger.warning(f"❌ Security configuration issues: {len(issues)} found")
        
        return success, issues
    
    def check_performance_optimization(self) -> Tuple[bool, List[str]]:
        """Validate performance optimizations are in place"""
        logger.info("⚡ Checking Performance Optimizations...")
        
        issues = []
        
        # Check for optimized services
        optimized_booking = self.project_root / 'services' / 'optimized_booking_service.py'
        if not optimized_booking.exists():
            issues.append("Optimized booking service not found")
        
        # Check for caching implementation
        redis_service = self.project_root / 'services' / 'redis_service.py'
        if not redis_service.exists():
            issues.append("Redis caching service not configured")
        
        # Check for performance indexes
        index_script = self.project_root / 'scripts' / 'apply_performance_indexes.py'
        if not index_script.exists():
            issues.append("Performance indexes script missing")
        
        # Check for load testing
        load_test = self.project_root / 'tests' / 'load_testing' / 'load_test_suite.py'
        if not load_test.exists():
            issues.append("Load testing suite not available")
        
        # Check for monitoring endpoints
        main_py = self.project_root / 'main.py'
        if main_py.exists():
            main_content = main_py.read_text()
            if '/health' not in main_content:
                issues.append("Health check endpoint not configured")
        
        success = len(issues) == 0
        if success:
            logger.info("✅ Performance optimization validation passed")
        else:
            logger.warning(f"❌ Performance optimization issues: {len(issues)} found")
        
        return success, issues
    
    def check_monitoring_setup(self) -> Tuple[bool, List[str]]:
        """Validate monitoring and alerting configuration"""
        logger.info("📊 Checking Monitoring Setup...")
        
        issues = []
        
        # Check for Sentry configuration
        sentry_config = self.project_root / 'config' / 'sentry.py'
        if not sentry_config.exists():
            issues.append("Sentry error tracking not configured")
        
        # Check for logging configuration
        if not any((self.project_root / 'config').glob('*log*')):
            issues.append("Logging configuration not found")
        
        # Check for health check endpoints
        health_router = None
        for router_file in (self.project_root / 'routers').glob('*.py'):
            content = router_file.read_text()
            if 'health' in content.lower():
                health_router = router_file
                break
        
        if not health_router:
            issues.append("Health check router not implemented")
        
        # Check for metrics collection
        metrics_found = False
        for py_file in self.project_root.rglob('*.py'):
            if 'venv' in str(py_file):
                continue
            try:
                content = py_file.read_text()
                if 'prometheus' in content.lower() or 'metrics' in content.lower():
                    metrics_found = True
                    break
            except:
                pass
        
        if not metrics_found:
            issues.append("Application metrics not configured")
        
        success = len(issues) == 0
        if success:
            logger.info("✅ Monitoring setup validation passed")
        else:
            logger.warning(f"❌ Monitoring setup issues: {len(issues)} found")
        
        return success, issues
    
    def check_backup_procedures(self) -> Tuple[bool, List[str]]:
        """Validate backup and disaster recovery procedures"""
        logger.info("💾 Checking Backup Procedures...")
        
        issues = []
        
        # Check for backup scripts
        backup_scripts = list((self.project_root / 'scripts').glob('*backup*'))
        if not backup_scripts:
            issues.append("Database backup scripts not found")
        
        # Check for recovery documentation
        recovery_docs = list(self.project_root.glob('*RECOVERY*'))
        recovery_docs.extend(list((self.project_root / 'docs').glob('*recovery*')))
        if not recovery_docs:
            issues.append("Disaster recovery documentation missing")
        
        # Check for environment backup
        env_backup = self.project_root / 'deployment' / 'environment_backup.py'
        if not env_backup.exists():
            issues.append("Environment configuration backup not implemented")
        
        success = len(issues) == 0
        if success:
            logger.info("✅ Backup procedures validation passed")
        else:
            logger.warning(f"❌ Backup procedures issues: {len(issues)} found")
        
        return success, issues
    
    def check_documentation_completeness(self) -> Tuple[bool, List[str]]:
        """Validate documentation completeness"""
        logger.info("📚 Checking Documentation Completeness...")
        
        issues = []
        
        required_docs = [
            'README.md',
            'CLAUDE.md',
            'DEPLOYMENT.md'
        ]
        
        for doc in required_docs:
            doc_path = self.project_root / doc
            if not doc_path.exists():
                issues.append(f"Missing documentation: {doc}")
            elif doc_path.stat().st_size < 1000:  # Less than 1KB
                issues.append(f"Documentation incomplete: {doc} is too small")
        
        # Check for API documentation
        api_docs = list(self.project_root.glob('*API*'))
        api_docs.extend(list((self.project_root / 'docs').glob('*api*')))
        if not api_docs:
            issues.append("API documentation not found")
        
        # Check for deployment documentation
        deployment_docs = list((self.project_root / 'deployment').glob('*.md'))
        if not deployment_docs:
            issues.append("Deployment documentation missing")
        
        success = len(issues) == 0
        if success:
            logger.info("✅ Documentation completeness validation passed")
        else:
            logger.warning(f"❌ Documentation completeness issues: {len(issues)} found")
        
        return success, issues
    
    def run_comprehensive_deployment_check(self) -> Dict[str, Any]:
        """Run all deployment readiness checks"""
        logger.info("🚀 Starting Comprehensive Production Deployment Readiness Check")
        
        checks = [
            ('environment_config', self.check_environment_configuration),
            ('database_migrations', self.check_database_readiness),
            ('security_validation', self.check_security_configuration),
            ('performance_testing', self.check_performance_optimization),
            ('monitoring_setup', self.check_monitoring_setup),
            ('backup_procedures', self.check_backup_procedures),
            ('documentation_complete', self.check_documentation_completeness)
        ]
        
        results = {}
        all_issues = []
        
        for check_name, check_function in checks:
            try:
                success, issues = check_function()
                results[check_name] = {
                    'success': success,
                    'issues': issues
                }
                self.deployment_status[check_name] = success
                all_issues.extend(issues)
            except Exception as e:
                logger.error(f"Check {check_name} failed with error: {e}")
                results[check_name] = {
                    'success': False,
                    'issues': [f"Check failed with error: {e}"]
                }
                all_issues.append(f"{check_name}: {e}")
        
        # Calculate overall readiness
        passed_checks = sum(1 for result in results.values() if result['success'])
        total_checks = len(results)
        readiness_percentage = (passed_checks / total_checks) * 100
        
        deployment_ready = readiness_percentage >= 90  # 90% threshold
        
        report = {
            'deployment_ready': deployment_ready,
            'readiness_percentage': round(readiness_percentage, 1),
            'passed_checks': passed_checks,
            'total_checks': total_checks,
            'detailed_results': results,
            'all_issues': all_issues,
            'deployment_status': self.deployment_status,
            'timestamp': datetime.now().isoformat()
        }
        
        self.print_deployment_report(report)
        return report
    
    def print_deployment_report(self, report: Dict[str, Any]):
        """Print formatted deployment readiness report"""
        print("\\n" + "="*80)
        print("🚀 BOOKEDBARBER V2 PRODUCTION DEPLOYMENT READINESS REPORT")
        print("="*80)
        
        readiness = report['readiness_percentage']
        status = "✅ READY" if report['deployment_ready'] else "❌ NOT READY"
        
        print(f"\\n🎯 Overall Deployment Status: {status}")
        print(f"   Readiness: {readiness}% ({report['passed_checks']}/{report['total_checks']} checks passed)")
        
        print(f"\\n📋 Detailed Check Results:")
        for check_name, result in report['detailed_results'].items():
            status_icon = "✅" if result['success'] else "❌"
            check_display = check_name.replace('_', ' ').title()
            print(f"   {status_icon} {check_display}")
            
            if result['issues']:
                for issue in result['issues']:
                    print(f"      • {issue}")
        
        if not report['deployment_ready']:
            print(f"\\n💡 Deployment Blockers ({len(report['all_issues'])} total):")
            critical_issues = [issue for issue in report['all_issues'] if any(word in issue.lower() for word in ['secret', 'security', 'cors', 'hardcoded'])]
            
            if critical_issues:
                print("   🚨 Critical Security Issues:")
                for issue in critical_issues:
                    print(f"      • {issue}")
            
            non_critical = [issue for issue in report['all_issues'] if issue not in critical_issues]
            if non_critical:
                print(f"   ⚠️ Other Issues:")
                for issue in non_critical[:10]:  # Show first 10
                    print(f"      • {issue}")
                if len(non_critical) > 10:
                    print(f"      ... and {len(non_critical) - 10} more")
        
        else:
            print(f"\\n🎉 Deployment Pre-flight Complete!")
            print("   All critical systems validated for production deployment")
        
        print("="*80)
    
    def generate_deployment_checklist(self) -> List[str]:
        """Generate final deployment checklist"""
        checklist = [
            "Environment Configuration:",
            "  □ Production environment variables configured",
            "  □ Database connection string updated",
            "  □ Redis URL configured for production",
            "  □ Secret keys rotated for production",
            "  □ CORS origins updated for production domains",
            "",
            "Database Setup:",
            "  □ Production database created",
            "  □ Database migrations applied",
            "  □ Performance indexes created",
            "  □ Database backup schedule configured",
            "",
            "Security Configuration:",
            "  □ HTTPS certificates installed",
            "  □ Security headers middleware enabled",
            "  □ Rate limiting configured",
            "  □ Authentication tokens rotated",
            "  □ Sensitive data audit completed",
            "",
            "Performance Optimization:",
            "  □ Redis cache configured and tested",
            "  □ Database indexes applied",
            "  □ Load testing completed",
            "  □ CDN configured for static assets",
            "",
            "Monitoring & Alerting:",
            "  □ Error tracking (Sentry) configured",
            "  □ Application logs configured",
            "  □ Health check endpoints verified",
            "  □ Performance monitoring enabled",
            "  □ Alert thresholds configured",
            "",
            "Backup & Recovery:",
            "  □ Database backup automation configured",
            "  □ Application backup procedures tested",
            "  □ Disaster recovery plan documented",
            "  □ Recovery procedures tested",
            "",
            "Documentation:",
            "  □ Deployment documentation updated",
            "  □ API documentation current",
            "  □ Runbook for operations team",
            "  □ Emergency contact information updated",
            "",
            "Final Verification:",
            "  □ End-to-end testing in staging environment",
            "  □ Performance benchmarks met",
            "  □ Security scan completed",
            "  □ Team deployment approval obtained"
        ]
        
        return checklist

def main():
    """Run production deployment readiness check"""
    manager = ProductionDeploymentManager()
    report = manager.run_comprehensive_deployment_check()
    
    # Save detailed report
    report_path = '/tmp/bookedbarber_deployment_readiness.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\\n📄 Detailed deployment report saved to: {report_path}")
    
    # Generate deployment checklist
    checklist = manager.generate_deployment_checklist()
    checklist_path = '/tmp/bookedbarber_deployment_checklist.txt'
    with open(checklist_path, 'w') as f:
        f.write("BookedBarber V2 Production Deployment Checklist\\n")
        f.write("=" * 50 + "\\n\\n")
        f.write("\\n".join(checklist))
    
    print(f"📋 Deployment checklist saved to: {checklist_path}")
    
    return report['deployment_ready']

if __name__ == "__main__":
    deployment_ready = main()
    sys.exit(0 if deployment_ready else 1)