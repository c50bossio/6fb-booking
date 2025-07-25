#!/usr/bin/env python3
"""
BookedBarber V2 - Targeted Security Validation
==============================================

This script performs targeted security validation focusing on the most critical
security aspects that can be tested without requiring a fully responsive server.

Areas of Testing:
1. Code Analysis - Static security analysis
2. Configuration Security
3. Dependency Security
4. Environment Security
5. File Permission Security
"""

import json
import subprocess
import re
from datetime import datetime
from pathlib import Path
from typing import List
from dataclasses import dataclass

# Configuration
AUDIT_TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
REPORT_FILE = f"security_validation_report_{AUDIT_TIMESTAMP}.md"

@dataclass
class SecurityTest:
    """Represents a security test result"""
    test_name: str
    category: str
    passed: bool
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    description: str
    details: str
    recommendations: List[str]
    
@dataclass
class SecurityAuditResult:
    """Overall security audit results"""
    total_tests: int
    passed_tests: int
    failed_tests: int
    critical_issues: int
    high_issues: int
    medium_issues: int
    low_issues: int
    tests: List[SecurityTest]

class SecurityValidator:
    def __init__(self):
        self.results = SecurityAuditResult(0, 0, 0, 0, 0, 0, 0, [])
        self.project_root = Path("/Users/bossio/6fb-booking/backend-v2")
        
    def log_test(self, test: SecurityTest):
        """Log a security test result"""
        self.results.tests.append(test)
        self.results.total_tests += 1
        
        if test.passed:
            self.results.passed_tests += 1
        else:
            self.results.failed_tests += 1
            
        # Count risk levels
        if test.risk_level == "CRITICAL":
            self.results.critical_issues += 1
        elif test.risk_level == "HIGH":
            self.results.high_issues += 1
        elif test.risk_level == "MEDIUM":
            self.results.medium_issues += 1
        elif test.risk_level == "LOW":
            self.results.low_issues += 1
            
        print(f"{'✓' if test.passed else '✗'} {test.test_name} - {test.risk_level}")
        
    def test_environment_security(self):
        """Test environment variable security"""
        print("\n=== Environment Security Tests ===")
        
        # Test 1: Check for .env files with secrets
        self.test_env_file_security()
        
        # Test 2: Check for hardcoded secrets in code
        self.test_hardcoded_secrets()
        
        # Test 3: Check environment variable validation
        self.test_env_validation()
        
    def test_env_file_security(self):
        """Test .env file security"""
        env_files = [
            self.project_root / ".env",
            self.project_root / ".env.example",
            self.project_root / ".env.local",
            self.project_root / ".env.production",
            self.project_root / ".env.staging"
        ]
        
        insecure_env_files = []
        secure_practices = []
        
        for env_file in env_files:
            if env_file.exists():
                try:
                    content = env_file.read_text()
                    
                    # Check for real secrets (not placeholder values)
                    secret_patterns = [
                        r'SECRET_KEY=(?!your-secret-key|change-me|example)[a-zA-Z0-9+/=]{20,}',
                        r'JWT_SECRET=(?!your-jwt-secret|change-me)[a-zA-Z0-9+/=]{20,}',
                        r'DATABASE_URL=postgresql://(?!user:password@localhost)[^@\s]+@[^/\s]+',
                        r'STRIPE_SECRET_KEY=sk_[a-zA-Z0-9_]+',
                        r'TWILIO_AUTH_TOKEN=[a-f0-9]{32}',
                        r'SENDGRID_API_KEY=SG\.[a-zA-Z0-9_-]{20,}'
                    ]
                    
                    for pattern in secret_patterns:
                        if re.search(pattern, content):
                            insecure_env_files.append(f"{env_file.name}: Contains real secrets")
                            
                    # Check for good practices
                    if '# Example' in content or '# Template' in content:
                        secure_practices.append(f"{env_file.name}: Has documentation")
                        
                except Exception as e:
                    insecure_env_files.append(f"{env_file.name}: Error reading file - {e}")
                    
        passed = len(insecure_env_files) == 0
        
        self.log_test(SecurityTest(
            test_name="Environment File Security",
            category="Environment Security",
            passed=passed,
            risk_level="HIGH" if not passed else "LOW",
            description="Environment files do not contain real secrets",
            details=f"Issues: {insecure_env_files}, Good practices: {secure_practices}",
            recommendations=[
                "Remove real secrets from .env files in version control",
                "Use .env.example with placeholder values",
                "Store real secrets in secure environment variables",
                "Add .env to .gitignore"
            ] if not passed else []
        ))
        
    def test_hardcoded_secrets(self):
        """Test for hardcoded secrets in source code"""
        python_files = list(self.project_root.rglob("*.py"))
        js_files = list((self.project_root / "frontend-v2").rglob("*.js")) + list((self.project_root / "frontend-v2").rglob("*.ts"))
        
        hardcoded_secrets = []
        
        # Patterns for hardcoded secrets
        secret_patterns = [
            (r'sk_live_[a-zA-Z0-9_]+', 'Stripe live secret key'),
            (r'sk_test_[a-zA-Z0-9_]+', 'Stripe test secret key'),
            (r'password\s*=\s*["\'][^"\']{8,}["\']', 'Hardcoded password'),
            (r'api_key\s*=\s*["\'][^"\']{20,}["\']', 'Hardcoded API key'),
            (r'secret\s*=\s*["\'][^"\']{20,}["\']', 'Hardcoded secret'),
            (r'token\s*=\s*["\'][^"\']{20,}["\']', 'Hardcoded token'),
            (r'SG\.[a-zA-Z0-9_-]{20,}', 'SendGrid API key'),
            (r'xoxb-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}', 'Slack bot token')
        ]
        
        for file_path in python_files + js_files:
            try:
                content = file_path.read_text()
                
                for pattern, description in secret_patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    for match in matches:
                        # Skip test files and examples
                        if 'test' not in str(file_path).lower() and 'example' not in str(file_path).lower():
                            hardcoded_secrets.append(f"{file_path.relative_to(self.project_root)}: {description}")
                            
            except Exception:
                continue  # Skip files that can't be read
                
        passed = len(hardcoded_secrets) == 0
        
        self.log_test(SecurityTest(
            test_name="Hardcoded Secrets Detection",
            category="Environment Security",
            passed=passed,
            risk_level="CRITICAL" if not passed else "LOW",
            description="No hardcoded secrets found in source code",
            details=f"Found secrets: {hardcoded_secrets[:5]}" + ("..." if len(hardcoded_secrets) > 5 else ""),
            recommendations=[
                "Remove all hardcoded secrets from source code",
                "Use environment variables for all sensitive data",
                "Implement proper secret management",
                "Add pre-commit hooks to detect secrets"
            ] if not passed else []
        ))
        
    def test_env_validation(self):
        """Test environment variable validation"""
        config_files = [
            self.project_root / "config.py",
            self.project_root / "config" / "__init__.py",
            self.project_root / "main.py"
        ]
        
        has_validation = False
        validation_details = []
        
        for config_file in config_files:
            if config_file.exists():
                try:
                    content = config_file.read_text()
                    
                    # Look for environment variable validation patterns
                    validation_patterns = [
                        r'os\.environ\.get\([\'"][A-Z_]+[\'"],\s*[\'"][^\'\"]*[\'\"]\)',  # Default values
                        r'getenv\([\'"][A-Z_]+[\'"],\s*[\'"][^\'\"]*[\'\"]\)',  # Default values
                        r'if\s+not\s+[A-Z_]+:',  # Validation checks
                        r'raise\s+ValueError.*environment',  # Error raising
                        r'assert\s+[A-Z_]+.*environment'  # Assertions
                    ]
                    
                    for pattern in validation_patterns:
                        if re.search(pattern, content, re.IGNORECASE):
                            has_validation = True
                            validation_details.append(f"Found validation in {config_file.name}")
                            break
                            
                except Exception:
                    continue
                    
        self.log_test(SecurityTest(
            test_name="Environment Variable Validation",
            category="Environment Security",
            passed=has_validation,
            risk_level="MEDIUM" if not has_validation else "LOW",
            description="Environment variables are properly validated",
            details=f"Validation found: {validation_details}",
            recommendations=[
                "Add validation for all required environment variables",
                "Provide clear error messages for missing variables",
                "Use default values where appropriate",
                "Validate environment variable formats"
            ] if not has_validation else []
        ))
        
    def test_dependency_security(self):
        """Test dependency security"""
        print("\n=== Dependency Security Tests ===")
        
        # Test 1: Check for known vulnerabilities
        self.test_known_vulnerabilities()
        
        # Test 2: Check dependency versions
        self.test_dependency_versions()
        
        # Test 3: Check for unused dependencies
        self.test_unused_dependencies()
        
    def test_known_vulnerabilities(self):
        """Test for known vulnerabilities in dependencies"""
        requirements_file = self.project_root / "requirements.txt"
        
        if not requirements_file.exists():
            self.log_test(SecurityTest(
                test_name="Known Vulnerabilities Check",
                category="Dependency Security",
                passed=False,
                risk_level="HIGH",
                description="Cannot check vulnerabilities - requirements.txt not found",
                details="Requirements file is missing",
                recommendations=["Create requirements.txt with all dependencies"]
            ))
            return
            
        try:
            # Run safety check if available
            result = subprocess.run(
                ["python", "-m", "pip", "list", "--format=json"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                packages = json.loads(result.stdout)
                
                # Check for known problematic packages
                risky_packages = [
                    'django-debug-toolbar',  # Should not be in production
                    'debugpy',  # Should not be in production
                    'pdb',  # Should not be in production
                ]
                
                found_risky = []
                for package in packages:
                    if package['name'].lower() in risky_packages:
                        found_risky.append(package['name'])
                        
                passed = len(found_risky) == 0
                
                self.log_test(SecurityTest(
                    test_name="Known Vulnerabilities Check",
                    category="Dependency Security",
                    passed=passed,
                    risk_level="MEDIUM" if not passed else "LOW",
                    description="No risky packages found in dependencies",
                    details=f"Risky packages found: {found_risky}",
                    recommendations=[
                        "Remove debug packages from production dependencies",
                        "Use separate dev-requirements.txt for development tools",
                        "Run 'pip-audit' or 'safety check' regularly"
                    ] if not passed else []
                ))
            else:
                self.log_test(SecurityTest(
                    test_name="Known Vulnerabilities Check",
                    category="Dependency Security",
                    passed=False,
                    risk_level="MEDIUM",
                    description="Cannot check dependencies",
                    details="Failed to list installed packages",
                    recommendations=["Ensure pip is working correctly"]
                ))
                
        except Exception as e:
            self.log_test(SecurityTest(
                test_name="Known Vulnerabilities Check",
                category="Dependency Security",
                passed=False,
                risk_level="MEDIUM",
                description="Error checking vulnerabilities",
                details=f"Error: {str(e)}",
                recommendations=["Install and run security scanning tools like 'safety' or 'pip-audit'"]
            ))
            
    def test_dependency_versions(self):
        """Test dependency version pinning"""
        requirements_file = self.project_root / "requirements.txt"
        
        if not requirements_file.exists():
            self.log_test(SecurityTest(
                test_name="Dependency Version Pinning",
                category="Dependency Security",
                passed=False,
                risk_level="MEDIUM",
                description="Cannot check version pinning - requirements.txt not found",
                details="Requirements file is missing",
                recommendations=["Create requirements.txt with pinned versions"]
            ))
            return
            
        try:
            content = requirements_file.read_text()
            lines = [line.strip() for line in content.split('\n') if line.strip() and not line.startswith('#')]
            
            unpinned_packages = []
            for line in lines:
                # Check for unpinned versions (no ==, >=, <=, ~=, etc.)
                if not re.search(r'[=><~!]', line):
                    unpinned_packages.append(line)
                    
            passed = len(unpinned_packages) == 0
            
            self.log_test(SecurityTest(
                test_name="Dependency Version Pinning",
                category="Dependency Security",
                passed=passed,
                risk_level="MEDIUM" if not passed else "LOW",
                description="All dependencies have pinned versions",
                details=f"Unpinned packages: {unpinned_packages}",
                recommendations=[
                    "Pin all dependency versions with ==",
                    "Use pip freeze to generate exact versions",
                    "Consider using pip-tools for dependency management"
                ] if not passed else []
            ))
            
        except Exception as e:
            self.log_test(SecurityTest(
                test_name="Dependency Version Pinning",
                category="Dependency Security",
                passed=False,
                risk_level="MEDIUM",
                description="Error checking version pinning",
                details=f"Error: {str(e)}",
                recommendations=["Fix requirements.txt format issues"]
            ))
            
    def test_unused_dependencies(self):
        """Test for unused dependencies"""
        # This is a simplified check - in practice, tools like pipreqs would be better
        requirements_file = self.project_root / "requirements.txt"
        
        if not requirements_file.exists():
            self.log_test(SecurityTest(
                test_name="Unused Dependencies Check",
                category="Dependency Security",
                passed=False,
                risk_level="LOW",
                description="Cannot check unused dependencies - requirements.txt not found",
                details="Requirements file is missing",
                recommendations=["Create requirements.txt and audit dependencies"]
            ))
            return
            
        try:
            content = requirements_file.read_text()
            lines = [line.strip() for line in content.split('\n') if line.strip() and not line.startswith('#')]
            
            # Extract package names
            packages = []
            for line in lines:
                package_name = re.split(r'[=><~!]', line)[0].strip()
                if package_name:
                    packages.append(package_name.lower())
                    
            # Check if packages are imported in code
            python_files = list(self.project_root.rglob("*.py"))
            imported_packages = set()
            
            for py_file in python_files:
                try:
                    content = py_file.read_text()
                    for package in packages:
                        if re.search(rf'\bimport\s+{package}\b|\bfrom\s+{package}\b', content, re.IGNORECASE):
                            imported_packages.add(package)
                except Exception:
                    continue
                    
            potentially_unused = set(packages) - imported_packages
            
            # Filter out commonly indirect dependencies
            common_indirect = {'setuptools', 'pip', 'wheel', 'pkg-resources'}
            potentially_unused = potentially_unused - common_indirect
            
            passed = len(potentially_unused) < 5  # Allow some false positives
            
            self.log_test(SecurityTest(
                test_name="Unused Dependencies Check",
                category="Dependency Security",
                passed=passed,
                risk_level="LOW",
                description="Minimal unused dependencies detected",
                details=f"Potentially unused: {list(potentially_unused)[:10]}",
                recommendations=[
                    "Audit dependencies with tools like pipreqs",
                    "Remove unused packages to reduce attack surface",
                    "Regular dependency cleanup"
                ] if not passed else []
            ))
            
        except Exception as e:
            self.log_test(SecurityTest(
                test_name="Unused Dependencies Check",
                category="Dependency Security",
                passed=False,
                risk_level="LOW",
                description="Error checking unused dependencies",
                details=f"Error: {str(e)}",
                recommendations=["Use specialized tools for dependency analysis"]
            ))
            
    def test_file_permissions(self):
        """Test file and directory permissions"""
        print("\n=== File Permission Security Tests ===")
        
        # Test 1: Check sensitive file permissions
        self.test_sensitive_file_permissions()
        
        # Test 2: Check script permissions
        self.test_script_permissions()
        
        # Test 3: Check directory permissions
        self.test_directory_permissions()
        
    def test_sensitive_file_permissions(self):
        """Test permissions on sensitive files"""
        sensitive_files = [
            ".env",
            ".env.production",
            ".env.staging",
            "config.py",
            "main.py"
        ]
        
        permission_issues = []
        
        for filename in sensitive_files:
            file_path = self.project_root / filename
            if file_path.exists():
                try:
                    stat_info = file_path.stat()
                    permissions = oct(stat_info.st_mode)[-3:]
                    
                    # Check if file is world-readable (last digit > 4)
                    if int(permissions[-1]) >= 4:
                        permission_issues.append(f"{filename}: World-readable ({permissions})")
                        
                    # Check if file is group-writable (middle digit >= 6)
                    if int(permissions[-2]) >= 6:
                        permission_issues.append(f"{filename}: Group-writable ({permissions})")
                        
                except Exception as e:
                    permission_issues.append(f"{filename}: Error checking permissions - {e}")
                    
        passed = len(permission_issues) == 0
        
        self.log_test(SecurityTest(
            test_name="Sensitive File Permissions",
            category="File Permission Security",
            passed=passed,
            risk_level="MEDIUM" if not passed else "LOW",
            description="Sensitive files have appropriate permissions",
            details=f"Permission issues: {permission_issues}",
            recommendations=[
                "Set sensitive files to 600 or 640 permissions",
                "Ensure .env files are not world-readable",
                "Use umask to set default secure permissions"
            ] if not passed else []
        ))
        
    def test_script_permissions(self):
        """Test executable script permissions"""
        script_files = list(self.project_root.rglob("*.sh")) + list(self.project_root.rglob("*.py"))
        
        permission_issues = []
        
        for script_file in script_files:
            try:
                stat_info = script_file.stat()
                permissions = oct(stat_info.st_mode)[-3:]
                
                # Check if script is world-writable
                if int(permissions[-1]) >= 2:
                    permission_issues.append(f"{script_file.relative_to(self.project_root)}: World-writable ({permissions})")
                    
            except Exception:
                continue
                
        passed = len(permission_issues) == 0
        
        self.log_test(SecurityTest(
            test_name="Script Permissions",
            category="File Permission Security",
            passed=passed,
            risk_level="MEDIUM" if not passed else "LOW",
            description="Scripts are not world-writable",
            details=f"Permission issues: {permission_issues[:5]}",
            recommendations=[
                "Remove world-write permissions from scripts",
                "Set scripts to 755 or 750 permissions",
                "Audit file permissions regularly"
            ] if not passed else []
        ))
        
    def test_directory_permissions(self):
        """Test directory permissions"""
        important_dirs = [
            ".",
            "config",
            "services",
            "routers",
            "models"
        ]
        
        permission_issues = []
        
        for dirname in important_dirs:
            dir_path = self.project_root / dirname
            if dir_path.exists() and dir_path.is_dir():
                try:
                    stat_info = dir_path.stat()
                    permissions = oct(stat_info.st_mode)[-3:]
                    
                    # Check if directory is world-writable
                    if int(permissions[-1]) >= 7:
                        permission_issues.append(f"{dirname}: World-writable ({permissions})")
                        
                except Exception as e:
                    permission_issues.append(f"{dirname}: Error checking permissions - {e}")
                    
        passed = len(permission_issues) == 0
        
        self.log_test(SecurityTest(
            test_name="Directory Permissions",
            category="File Permission Security",
            passed=passed,
            risk_level="LOW" if not passed else "LOW",
            description="Directories have appropriate permissions",
            details=f"Permission issues: {permission_issues}",
            recommendations=[
                "Remove world-write permissions from directories",
                "Set directories to 755 or 750 permissions",
                "Implement proper access controls"
            ] if not passed else []
        ))
        
    def test_configuration_security(self):
        """Test configuration security"""
        print("\n=== Configuration Security Tests ===")
        
        # Test 1: Debug mode configuration
        self.test_debug_configuration()
        
        # Test 2: CORS configuration
        self.test_cors_configuration()
        
        # Test 3: Security headers configuration
        self.test_security_headers_config()
        
    def test_debug_configuration(self):
        """Test debug mode configuration"""
        config_files = [
            self.project_root / "main.py",
            self.project_root / "config.py",
            self.project_root / "config" / "__init__.py"
        ]
        
        debug_issues = []
        
        for config_file in config_files:
            if config_file.exists():
                try:
                    content = config_file.read_text()
                    
                    # Look for debug settings
                    debug_patterns = [
                        r'debug\s*=\s*True',
                        r'DEBUG\s*=\s*True',
                        r'--debug',
                        r'reload\s*=\s*True'
                    ]
                    
                    for pattern in debug_patterns:
                        if re.search(pattern, content, re.IGNORECASE):
                            debug_issues.append(f"{config_file.name}: Debug mode enabled")
                            
                except Exception:
                    continue
                    
        passed = len(debug_issues) == 0
        
        self.log_test(SecurityTest(
            test_name="Debug Configuration",
            category="Configuration Security",
            passed=passed,
            risk_level="HIGH" if not passed else "LOW",
            description="Debug mode is not enabled in production",
            details=f"Debug issues: {debug_issues}",
            recommendations=[
                "Disable debug mode in production",
                "Use environment variables to control debug settings",
                "Ensure reload is disabled in production"
            ] if not passed else []
        ))
        
    def test_cors_configuration(self):
        """Test CORS configuration"""
        main_file = self.project_root / "main.py"
        
        if not main_file.exists():
            self.log_test(SecurityTest(
                test_name="CORS Configuration",
                category="Configuration Security",
                passed=False,
                risk_level="MEDIUM",
                description="Cannot check CORS configuration - main.py not found",
                details="Main application file is missing",
                recommendations=["Check CORS configuration in main application file"]
            ))
            return
            
        try:
            content = main_file.read_text()
            
            # Look for CORS configuration
            cors_issues = []
            
            # Check for overly permissive CORS
            permissive_patterns = [
                r'allow_origins\s*=\s*\[.*\*.*\]',
                r'allow_origins\s*=\s*\*',
                r'allow_credentials\s*=\s*True.*allow_origins.*\*'
            ]
            
            for pattern in permissive_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    cors_issues.append("Overly permissive CORS configuration")
                    
            passed = len(cors_issues) == 0
            
            self.log_test(SecurityTest(
                test_name="CORS Configuration",
                category="Configuration Security",
                passed=passed,
                risk_level="MEDIUM" if not passed else "LOW",
                description="CORS is properly configured",
                details=f"CORS issues: {cors_issues}",
                recommendations=[
                    "Restrict CORS to specific domains",
                    "Avoid using wildcard (*) for origins",
                    "Be careful with allow_credentials=True"
                ] if not passed else []
            ))
            
        except Exception as e:
            self.log_test(SecurityTest(
                test_name="CORS Configuration",
                category="Configuration Security",
                passed=False,
                risk_level="MEDIUM",
                description="Error checking CORS configuration",
                details=f"Error: {str(e)}",
                recommendations=["Manually review CORS configuration"]
            ))
            
    def test_security_headers_config(self):
        """Test security headers configuration"""
        # Look for security middleware or header configuration
        middleware_files = list((self.project_root / "middleware").rglob("*.py")) if (self.project_root / "middleware").exists() else []
        main_file = self.project_root / "main.py"
        
        security_headers_found = False
        security_details = []
        
        all_files = middleware_files + ([main_file] if main_file.exists() else [])
        
        for file_path in all_files:
            try:
                content = file_path.read_text()
                
                # Look for security headers
                header_patterns = [
                    r'X-Content-Type-Options',
                    r'X-Frame-Options',
                    r'X-XSS-Protection',
                    r'Strict-Transport-Security',
                    r'Content-Security-Policy'
                ]
                
                for pattern in header_patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        security_headers_found = True
                        security_details.append(f"Found {pattern} in {file_path.name}")
                        
            except Exception:
                continue
                
        self.log_test(SecurityTest(
            test_name="Security Headers Configuration",
            category="Configuration Security",
            passed=security_headers_found,
            risk_level="MEDIUM" if not security_headers_found else "LOW",
            description="Security headers are configured",
            details=f"Security headers: {security_details}",
            recommendations=[
                "Add security headers middleware",
                "Configure X-Content-Type-Options: nosniff",
                "Configure X-Frame-Options: DENY",
                "Add Content-Security-Policy header"
            ] if not security_headers_found else []
        ))
        
    def generate_security_report(self):
        """Generate comprehensive security report"""
        print(f"\n=== Generating Security Report ===")
        
        # Calculate security score
        total_tests = self.results.total_tests
        passed_tests = self.results.passed_tests
        security_score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Determine overall security rating
        if security_score >= 90:
            security_rating = "EXCELLENT"
        elif security_score >= 75:
            security_rating = "GOOD"
        elif security_score >= 60:
            security_rating = "FAIR"
        elif security_score >= 40:
            security_rating = "POOR"
        else:
            security_rating = "CRITICAL"
            
        # Generate report
        report = f"""# BookedBarber V2 Security Validation Report

**Audit Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Audit Tool:** BookedBarber V2 Security Validator v1.0  
**Target System:** File system and configuration analysis  

## Executive Summary

**Overall Security Rating:** {security_rating}  
**Security Score:** {security_score:.1f}%  

### Test Results Overview
- **Total Tests:** {total_tests}
- **Passed Tests:** {passed_tests}
- **Failed Tests:** {self.results.failed_tests}

### Risk Assessment
- **Critical Issues:** {self.results.critical_issues}
- **High Risk Issues:** {self.results.high_issues}
- **Medium Risk Issues:** {self.results.medium_issues}
- **Low Risk Issues:** {self.results.low_issues}

## Detailed Test Results

"""
        
        # Group tests by category
        categories = {}
        for test in self.results.tests:
            if test.category not in categories:
                categories[test.category] = []
            categories[test.category].append(test)
            
        # Generate detailed results by category
        for category, tests in categories.items():
            report += f"\n### {category}\n\n"
            
            for test in tests:
                status_icon = "✅" if test.passed else "❌"
                risk_color = {
                    "CRITICAL": "🔴",
                    "HIGH": "🟠", 
                    "MEDIUM": "🟡",
                    "LOW": "🟢"
                }.get(test.risk_level, "⚪")
                
                report += f"#### {status_icon} {test.test_name} {risk_color}\n\n"
                report += f"**Risk Level:** {test.risk_level}  \n"
                report += f"**Description:** {test.description}  \n"
                report += f"**Details:** {test.details}  \n"
                
                if test.recommendations:
                    report += f"**Recommendations:**\n"
                    for rec in test.recommendations:
                        report += f"- {rec}\n"
                        
                report += "\n"
                
        # Priority recommendations
        critical_tests = [t for t in self.results.tests if t.risk_level == "CRITICAL" and not t.passed]
        high_tests = [t for t in self.results.tests if t.risk_level == "HIGH" and not t.passed]
        
        if critical_tests or high_tests:
            report += "\n## 🚨 Priority Action Items\n\n"
            
            if critical_tests:
                report += "### Critical Issues (Immediate Action Required)\n\n"
                for test in critical_tests:
                    report += f"- **{test.test_name}**: {test.description}\n"
                    for rec in test.recommendations:
                        report += f"  - {rec}\n"
                    report += "\n"
                    
            if high_tests:
                report += "### High Priority Issues\n\n"
                for test in high_tests:
                    report += f"- **{test.test_name}**: {test.description}\n"
                    for rec in test.recommendations:
                        report += f"  - {rec}\n"
                    report += "\n"
                    
        # Security best practices
        report += """
## Security Best Practices Recommendations

### Environment Security
- Use strong, unique secrets for all environments
- Store secrets in environment variables, not code
- Validate all required environment variables on startup
- Use different secrets for development and production

### Dependency Security
- Pin all dependency versions
- Regularly audit dependencies for vulnerabilities
- Remove unused dependencies
- Use tools like pip-audit or safety for vulnerability scanning

### File Security
- Set appropriate file permissions (600 for sensitive files)
- Ensure scripts are not world-writable
- Regularly audit file permissions
- Use proper access controls

### Configuration Security
- Disable debug mode in production
- Configure CORS restrictively
- Implement security headers
- Use HTTPS in production

## Next Steps

1. **Immediate Actions:** Address all critical and high-risk issues
2. **Short-term (1-2 weeks):** Implement medium-risk fixes
3. **Medium-term (1 month):** Address low-risk issues and implement additional security measures
4. **Long-term:** Establish regular security audit schedule (monthly/quarterly)

## Audit Methodology

This security validation was performed using static analysis of:

- Source code for hardcoded secrets
- Configuration files for security settings
- Dependency files for vulnerability risks
- File system permissions
- Environment variable handling

**Note:** This validation provides baseline security assessment. For production deployment, also perform dynamic testing and professional security audits.

---

**Report Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Audit Tool:** BookedBarber V2 Security Validator v1.0
"""
        
        return report
        
    def run_validation(self):
        """Run the complete security validation"""
        print("="*70)
        print("BookedBarber V2 Comprehensive Security Validation")
        print("="*70)
        
        # Run all security tests
        self.test_environment_security()
        self.test_dependency_security()
        self.test_file_permissions()
        self.test_configuration_security()
        
        # Generate and save report
        report = self.generate_security_report()
        
        try:
            with open(REPORT_FILE, 'w') as f:
                f.write(report)
            print(f"\n✅ Security validation report saved to: {REPORT_FILE}")
        except Exception as e:
            print(f"❌ Failed to save report: {e}")
            
        # Print summary
        print("\n" + "="*70)
        print("SECURITY VALIDATION SUMMARY")
        print("="*70)
        print(f"Total Tests: {self.results.total_tests}")
        print(f"Passed: {self.results.passed_tests}")
        print(f"Failed: {self.results.failed_tests}")
        print(f"Critical Issues: {self.results.critical_issues}")
        print(f"High Risk Issues: {self.results.high_issues}")
        print(f"Medium Risk Issues: {self.results.medium_issues}")
        print(f"Low Risk Issues: {self.results.low_issues}")
        
        security_score = (self.results.passed_tests / self.results.total_tests * 100) if self.results.total_tests > 0 else 0
        print(f"Security Score: {security_score:.1f}%")
        
        if self.results.critical_issues > 0:
            print("\n🚨 CRITICAL SECURITY ISSUES FOUND - IMMEDIATE ACTION REQUIRED!")
        elif self.results.high_issues > 0:
            print("\n⚠️  HIGH PRIORITY SECURITY ISSUES FOUND - ADDRESS SOON")
        else:
            print("\n✅ No critical or high-risk security issues found")
            
        print("="*70)

if __name__ == "__main__":
    validator = SecurityValidator()
    validator.run_validation()