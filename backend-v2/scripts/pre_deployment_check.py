#!/usr/bin/env python3
"""
Pre-Deployment Validation Script

Runs all validations before deployment to ensure system integrity.
This is the final gate before production deployment.
"""
import sys
import json
import subprocess
import time
from pathlib import Path
from typing import Dict
import argparse
from datetime import datetime


class PreDeploymentValidator:
    """Comprehensive pre-deployment validation system."""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.validation_results = {}
        self.start_time = time.time()
        self.critical_failures = []
        self.warnings = []
        
        # Validation stages
        self.validation_stages = [
            ('security', 'Security Validation', True),
            ('consolidation', 'Code Consolidation Check', False),
            ('coverage', 'Test Coverage Validation', True),
            ('imports', 'Import Validation', True),
            ('health', 'System Health Check', True),
            ('integration', 'Integration Tests', True),
            ('performance', 'Performance Validation', False),
            ('compatibility', 'Compatibility Check', False)
        ]
    
    def run_security_validation(self) -> Dict:
        """Run comprehensive security validation."""
        print("🔐 Running security validation...")
        
        result = {
            'status': 'PASS',
            'checks': {},
            'critical_issues': [],
            'details': []
        }
        
        try:
            # Run credential scanner
            cmd_result = subprocess.run(
                [sys.executable, 'scripts/validate_no_credentials.py', '--output', 'json'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if cmd_result.returncode == 0:
                try:
                    security_data = json.loads(cmd_result.stdout)
                    result['checks']['credentials'] = security_data
                    
                    if security_data.get('status') == 'FAIL':
                        result['status'] = 'FAIL'
                        result['critical_issues'].append('Exposed credentials detected')
                        self.critical_failures.append('Security: Exposed credentials found')
                    
                except json.JSONDecodeError:
                    result['status'] = 'WARN'
                    result['details'].append('Could not parse credential scan results')
            else:
                result['status'] = 'FAIL'
                result['critical_issues'].append('Credential scanner failed to run')
                self.critical_failures.append('Security: Credential scanner failure')
        
        except Exception as e:
            result['status'] = 'FAIL'
            result['critical_issues'].append(f'Security validation error: {e}')
            self.critical_failures.append(f'Security: {e}')
        
        # Additional security checks
        result['checks']['secrets_in_code'] = self.check_secrets_in_code()
        result['checks']['dependency_vulnerabilities'] = self.check_dependency_vulnerabilities()
        result['checks']['file_permissions'] = self.check_file_permissions()
        
        return result
    
    def check_secrets_in_code(self) -> Dict:
        """Check for hardcoded secrets in code."""
        try:
            # Search for common secret patterns
            secret_patterns = [
                r'password\s*=\s*["\'][^"\']{8,}["\']',
                r'api_key\s*=\s*["\'][^"\']{20,}["\']',
                r'secret\s*=\s*["\'][^"\']{20,}["\']'
            ]
            
            violations = []
            for pattern in secret_patterns:
                cmd = ['grep', '-r', '-n', '-i', pattern, '.', '--include=*.py']
                result = subprocess.run(cmd, cwd=self.base_path, capture_output=True, text=True)
                
                if result.returncode == 0 and result.stdout.strip():
                    violations.extend(result.stdout.strip().split('\n'))
            
            return {
                'status': 'FAIL' if violations else 'PASS',
                'violations': violations[:10],  # Limit output
                'total_violations': len(violations)
            }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def check_dependency_vulnerabilities(self) -> Dict:
        """Check for known vulnerabilities in dependencies."""
        try:
            # Check Python dependencies
            python_result = subprocess.run(
                ['python', '-m', 'pip', 'audit', '--format=json'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            vulnerabilities = []
            if python_result.returncode != 0:
                try:
                    audit_data = json.loads(python_result.stdout)
                    vulnerabilities = audit_data.get('vulnerabilities', [])
                except:
                    pass
            
            # Check Node.js dependencies
            frontend_path = self.base_path / 'frontend-v2'
            node_vulnerabilities = []
            if frontend_path.exists():
                node_result = subprocess.run(
                    ['npm', 'audit', '--json'],
                    cwd=frontend_path,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if node_result.returncode != 0:
                    try:
                        node_data = json.loads(node_result.stdout)
                        node_vulnerabilities = node_data.get('vulnerabilities', {})
                    except:
                        pass
            
            total_vulns = len(vulnerabilities) + len(node_vulnerabilities)
            
            return {
                'status': 'FAIL' if total_vulns > 0 else 'PASS',
                'python_vulnerabilities': len(vulnerabilities),
                'node_vulnerabilities': len(node_vulnerabilities),
                'total_vulnerabilities': total_vulns
            }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def check_file_permissions(self) -> Dict:
        """Check for insecure file permissions."""
        try:
            insecure_files = []
            
            # Check for world-writable files
            for file_path in self.base_path.rglob('*'):
                if file_path.is_file():
                    stat = file_path.stat()
                    # Check if world-writable (others have write permission)
                    if stat.st_mode & 0o002:
                        insecure_files.append(str(file_path.relative_to(self.base_path)))
            
            return {
                'status': 'FAIL' if insecure_files else 'PASS',
                'insecure_files': insecure_files[:10],
                'total_insecure': len(insecure_files)
            }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def run_consolidation_check(self) -> Dict:
        """Check code consolidation status."""
        print("🔄 Checking code consolidation...")
        
        try:
            cmd_result = subprocess.run(
                [sys.executable, 'scripts/validate_consolidation.py', '--output', 'json'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if cmd_result.returncode == 0:
                try:
                    return json.loads(cmd_result.stdout)
                except json.JSONDecodeError:
                    return {
                        'status': 'ERROR',
                        'error': 'Could not parse consolidation results'
                    }
            else:
                return {
                    'status': 'ERROR',
                    'error': 'Consolidation validator failed',
                    'stderr': cmd_result.stderr
                }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def run_coverage_validation(self) -> Dict:
        """Validate test coverage."""
        print("🧪 Validating test coverage...")
        
        try:
            cmd_result = subprocess.run(
                [sys.executable, 'scripts/validate_test_coverage.py', '--min-coverage', '75', '--output', 'json'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if cmd_result.returncode in [0, 1]:  # 1 might be warnings
                try:
                    coverage_data = json.loads(cmd_result.stdout)
                    
                    # Check if coverage meets minimum requirements
                    if coverage_data.get('status') == 'FAIL':
                        self.critical_failures.append('Test coverage below minimum requirements')
                    
                    return coverage_data
                except json.JSONDecodeError:
                    return {
                        'status': 'ERROR',
                        'error': 'Could not parse coverage results'
                    }
            else:
                return {
                    'status': 'ERROR',
                    'error': 'Coverage validator failed',
                    'stderr': cmd_result.stderr
                }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def run_import_validation(self) -> Dict:
        """Validate import statements."""
        print("📦 Validating imports...")
        
        try:
            cmd_result = subprocess.run(
                [sys.executable, 'scripts/validate_imports.py', '--output', 'json'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=180
            )
            
            if cmd_result.returncode == 0:
                try:
                    import_data = json.loads(cmd_result.stdout)
                    
                    if import_data.get('status') == 'FAIL':
                        self.critical_failures.append('Import validation failed')
                    
                    return import_data
                except json.JSONDecodeError:
                    return {
                        'status': 'ERROR',
                        'error': 'Could not parse import validation results'
                    }
            else:
                return {
                    'status': 'FAIL',
                    'error': 'Import validator failed',
                    'stderr': cmd_result.stderr
                }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def run_health_check(self) -> Dict:
        """Run comprehensive health check."""
        print("🏥 Running system health check...")
        
        try:
            cmd_result = subprocess.run(
                [sys.executable, 'scripts/health_check_all.py', '--output', 'json'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if cmd_result.returncode in [0, 1]:  # 1 might be warnings
                try:
                    health_data = json.loads(cmd_result.stdout)
                    
                    if health_data.get('overall_status') == 'FAIL':
                        self.critical_failures.append('System health check failed')
                    
                    return health_data
                except json.JSONDecodeError:
                    return {
                        'status': 'ERROR',
                        'error': 'Could not parse health check results'
                    }
            else:
                return {
                    'status': 'FAIL',
                    'error': 'Health check failed',
                    'stderr': cmd_result.stderr
                }
        
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def run_integration_tests(self) -> Dict:
        """Run integration tests."""
        print("🔗 Running integration tests...")
        
        try:
            # Run the integration test suite
            cmd_result = subprocess.run(
                [sys.executable, '-m', 'pytest', 'tests/integration/', '-v', '--tb=short'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=600
            )
            
            return {
                'status': 'PASS' if cmd_result.returncode == 0 else 'FAIL',
                'exit_code': cmd_result.returncode,
                'output': cmd_result.stdout[-1000:],  # Last 1000 chars
                'errors': cmd_result.stderr[-500:] if cmd_result.stderr else None
            }
        
        except subprocess.TimeoutExpired:
            return {
                'status': 'FAIL',
                'error': 'Integration tests timed out'
            }
        except Exception as e:
            return {
                'status': 'ERROR',
                'error': str(e)
            }
    
    def run_performance_validation(self) -> Dict:
        """Run performance validation."""
        print("⚡ Running performance validation...")
        
        result = {
            'status': 'PASS',
            'startup_time': None,
            'import_time': None,
            'database_time': None
        }
        
        try:
            # Test application startup time
            start_time = time.time()
            cmd_result = subprocess.run(
                [sys.executable, '-c', 'from main import app; print("Startup successful")'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            startup_time = time.time() - start_time
            result['startup_time'] = round(startup_time, 2)
            
            if startup_time > 10:  # 10 second threshold
                result['status'] = 'WARN'
                self.warnings.append(f'Slow startup time: {startup_time:.2f}s')
            
            # Test database query time
            start_time = time.time()
            db_result = subprocess.run(
                [sys.executable, '-c', 'from database import get_db; next(get_db()); print("DB connection successful")'],
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            db_time = time.time() - start_time
            result['database_time'] = round(db_time, 2)
            
            if db_time > 2:  # 2 second threshold
                result['status'] = 'WARN'
                self.warnings.append(f'Slow database connection: {db_time:.2f}s')
        
        except Exception as e:
            result['status'] = 'ERROR'
            result['error'] = str(e)
        
        return result
    
    def run_compatibility_check(self) -> Dict:
        """Check compatibility with existing systems."""
        print("🔄 Running compatibility checks...")
        
        result = {
            'status': 'PASS',
            'python_version': None,
            'dependencies': {},
            'database_compatibility': None
        }
        
        try:
            # Check Python version
            python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
            result['python_version'] = python_version
            
            if sys.version_info < (3, 9):
                result['status'] = 'WARN'
                self.warnings.append(f'Python version {python_version} may have compatibility issues')
            
            # Check critical dependencies
            critical_deps = ['fastapi', 'sqlalchemy', 'pydantic', 'stripe']
            for dep in critical_deps:
                try:
                    import_result = subprocess.run(
                        [sys.executable, '-c', f'import {dep}; print({dep}.__version__)'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    
                    if import_result.returncode == 0:
                        result['dependencies'][dep] = import_result.stdout.strip()
                    else:
                        result['dependencies'][dep] = 'NOT_FOUND'
                        result['status'] = 'FAIL'
                        self.critical_failures.append(f'Missing critical dependency: {dep}')
                
                except Exception:
                    result['dependencies'][dep] = 'ERROR'
        
        except Exception as e:
            result['status'] = 'ERROR'
            result['error'] = str(e)
        
        return result
    
    def run_all_validations(self) -> Dict:
        """Run all pre-deployment validations."""
        print("🚀 Starting pre-deployment validation...")
        print(f"📍 Base path: {self.base_path}")
        
        validation_functions = {
            'security': self.run_security_validation,
            'consolidation': self.run_consolidation_check,
            'coverage': self.run_coverage_validation,
            'imports': self.run_import_validation,
            'health': self.run_health_check,
            'integration': self.run_integration_tests,
            'performance': self.run_performance_validation,
            'compatibility': self.run_compatibility_check
        }
        
        results = {}
        overall_status = 'PASS'
        
        for stage_key, stage_name, is_critical in self.validation_stages:
            print(f"\n{'='*50}")
            print(f"Running {stage_name}...")
            
            try:
                stage_result = validation_functions[stage_key]()
                results[stage_key] = stage_result
                
                # Determine if this affects overall status
                stage_status = stage_result.get('status', 'ERROR')
                
                if stage_status == 'FAIL':
                    if is_critical:
                        overall_status = 'FAIL'
                    elif overall_status != 'FAIL':
                        overall_status = 'WARN'
                elif stage_status == 'WARN' and overall_status not in ['FAIL', 'WARN']:
                    overall_status = 'WARN'
                elif stage_status == 'ERROR':
                    if is_critical:
                        overall_status = 'FAIL'
                    elif overall_status not in ['FAIL']:
                        overall_status = 'WARN'
                
                print(f"✅ {stage_name}: {stage_status}")
            
            except Exception as e:
                results[stage_key] = {
                    'status': 'ERROR',
                    'error': str(e)
                }
                
                if is_critical:
                    overall_status = 'FAIL'
                    self.critical_failures.append(f'{stage_name}: {e}')
                
                print(f"❌ {stage_name}: ERROR - {e}")
        
        # Calculate execution time
        execution_time = round(time.time() - self.start_time, 2)
        
        return {
            'overall_status': overall_status,
            'execution_time_seconds': execution_time,
            'timestamp': datetime.now().isoformat(),
            'validations': results,
            'critical_failures': self.critical_failures,
            'warnings': self.warnings,
            'summary': self.generate_summary(results),
            'deployment_recommendation': self.generate_deployment_recommendation(overall_status)
        }
    
    def generate_summary(self, results: Dict) -> Dict:
        """Generate validation summary."""
        summary = {
            'total_validations': len(results),
            'passed': 0,
            'warnings': 0,
            'failed': 0,
            'errors': 0
        }
        
        for validation_name, validation_result in results.items():
            status = validation_result.get('status', 'ERROR')
            if status == 'PASS':
                summary['passed'] += 1
            elif status == 'WARN':
                summary['warnings'] += 1
            elif status == 'FAIL':
                summary['failed'] += 1
            else:
                summary['errors'] += 1
        
        return summary
    
    def generate_deployment_recommendation(self, overall_status: str) -> Dict:
        """Generate deployment recommendation."""
        if overall_status == 'PASS':
            return {
                'recommendation': 'DEPLOY',
                'confidence': 'HIGH',
                'message': '✅ All validations passed - safe to deploy'
            }
        elif overall_status == 'WARN':
            return {
                'recommendation': 'DEPLOY_WITH_CAUTION',
                'confidence': 'MEDIUM',
                'message': '⚠️ Some warnings found - deploy with monitoring'
            }
        else:
            return {
                'recommendation': 'DO_NOT_DEPLOY',
                'confidence': 'HIGH',
                'message': '❌ Critical issues found - fix before deployment'
            }


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Pre-deployment validation')
    parser.add_argument('--path', default='.', help='Path to validate')
    parser.add_argument('--output', choices=['json', 'text'], default='text')
    parser.add_argument('--save', help='Save report to file')
    parser.add_argument('--fail-fast', action='store_true', help='Stop on first critical failure')
    
    args = parser.parse_args()
    
    validator = PreDeploymentValidator(args.path)
    
    try:
        results = validator.run_all_validations()
        
        if args.output == 'json':
            if args.save:
                with open(args.save, 'w') as f:
                    json.dump(results, f, indent=2)
            else:
                print(json.dumps(results, indent=2))
        else:
            print_deployment_report(results)
            
            if args.save:
                with open(args.save, 'w') as f:
                    f.write(format_deployment_report(results))
        
        # Exit with appropriate code
        recommendation = results['deployment_recommendation']['recommendation']
        
        if recommendation == 'DO_NOT_DEPLOY':
            print(f"\n❌ PRE-DEPLOYMENT VALIDATION FAILED")
            print(f"💡 {results['deployment_recommendation']['message']}")
            exit(1)
        elif recommendation == 'DEPLOY_WITH_CAUTION':
            print(f"\n⚠️ PRE-DEPLOYMENT VALIDATION COMPLETED WITH WARNINGS")
            print(f"💡 {results['deployment_recommendation']['message']}")
            exit(0)
        else:
            print(f"\n✅ PRE-DEPLOYMENT VALIDATION PASSED")
            print(f"💡 {results['deployment_recommendation']['message']}")
            exit(0)
    
    except KeyboardInterrupt:
        print("\n⏹️ Pre-deployment validation interrupted")
        exit(130)
    except Exception as e:
        print(f"\n💥 Pre-deployment validation crashed: {e}")
        exit(2)


def print_deployment_report(results: Dict):
    """Print formatted deployment validation report."""
    print("\n" + "="*70)
    print("  PRE-DEPLOYMENT VALIDATION REPORT")
    print("="*70)
    
    print(f"\nOverall Status: {results['overall_status']}")
    print(f"Execution Time: {results['execution_time_seconds']}s")
    print(f"Timestamp: {results['timestamp']}")
    
    # Summary
    summary = results['summary']
    print(f"\nValidation Summary:")
    print(f"  Total: {summary['total_validations']}")
    print(f"  Passed: {summary['passed']}")
    print(f"  Warnings: {summary['warnings']}")
    print(f"  Failed: {summary['failed']}")
    print(f"  Errors: {summary['errors']}")
    
    # Critical failures
    if results['critical_failures']:
        print(f"\n🚨 CRITICAL FAILURES:")
        for failure in results['critical_failures']:
            print(f"  • {failure}")
    
    # Warnings
    if results['warnings']:
        print(f"\n⚠️ WARNINGS:")
        for warning in results['warnings']:
            print(f"  • {warning}")
    
    # Validation details
    print(f"\n📋 VALIDATION DETAILS:")
    for validation_name, validation_result in results['validations'].items():
        status = validation_result.get('status', 'ERROR')
        icon = "✅" if status == "PASS" else "⚠️" if status == "WARN" else "❌"
        print(f"  {icon} {validation_name.title()}: {status}")
        
        if validation_result.get('error'):
            print(f"    Error: {validation_result['error']}")
    
    # Deployment recommendation
    rec = results['deployment_recommendation']
    print(f"\n🚀 DEPLOYMENT RECOMMENDATION:")
    print(f"  Decision: {rec['recommendation']}")
    print(f"  Confidence: {rec['confidence']}")
    print(f"  Message: {rec['message']}")
    
    print("\n" + "="*70)


def format_deployment_report(results: Dict) -> str:
    """Format deployment report for file output."""
    lines = []
    lines.append("PRE-DEPLOYMENT VALIDATION REPORT")
    lines.append("=" * 70)
    
    lines.append(f"Overall Status: {results['overall_status']}")
    lines.append(f"Execution Time: {results['execution_time_seconds']}s")
    lines.append(f"Timestamp: {results['timestamp']}")
    
    rec = results['deployment_recommendation']
    lines.append(f"\nDeployment Recommendation: {rec['recommendation']}")
    lines.append(f"Message: {rec['message']}")
    
    if results['critical_failures']:
        lines.append("\nCritical Failures:")
        for failure in results['critical_failures']:
            lines.append(f"• {failure}")
    
    return "\n".join(lines)


if __name__ == "__main__":
    main()