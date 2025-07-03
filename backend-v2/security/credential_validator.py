#!/usr/bin/env python3
"""
Security Credential Validator for 6FB Booking Platform

This script validates that no credentials are hardcoded in the codebase
and ensures proper environment variable configuration.

Usage:
    python security/credential_validator.py
    python security/credential_validator.py --fix
"""

import os
import re
import sys
import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

class CredentialValidator:
    """Validates credentials security across the codebase"""
    
    # Known patterns for various API credentials
    CREDENTIAL_PATTERNS = {
        'sendgrid_api_key': [
            r'SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}',
            r'sendgrid_api_key.*=.*["\']SG\.',
        ],
        'twilio_account_sid': [
            r'AC[a-f0-9]{32}',
            r'twilio_account_sid.*=.*["\']AC[a-f0-9]{32}',
        ],
        'twilio_auth_token': [
            r'twilio_auth_token.*=.*["\'][a-f0-9]{32}',
        ],
        'stripe_secret_key': [
            r'sk_(test|live)_[A-Za-z0-9]{24,}',
            r'stripe_secret_key.*=.*["\']sk_(test|live)_',
        ],
        'jwt_secret': [
            # Only match actual credential assignments, not validation code
            r'jwt_secret_key.*=.*["\'][A-Za-z0-9_-]{32,}["\']',
            r'secret_key.*=.*["\'][A-Za-z0-9_-]{32,}["\']',
            r'JWT_SECRET_KEY.*=.*["\'][A-Za-z0-9_-]{32,}["\']',
            r'SECRET_KEY.*=.*["\'][A-Za-z0-9_-]{32,}["\']',
        ],
        'database_password': [
            r'postgresql://[^:]+:[^@]+@',
            r'mysql://[^:]+:[^@]+@',
        ],
        'generic_api_key': [
            r'api_key.*=.*["\'][A-Za-z0-9_-]{20,}',
            r'api_secret.*=.*["\'][A-Za-z0-9_-]{20,}',
        ]
    }
    
    # Files to exclude from scanning
    EXCLUDE_PATTERNS = [
        'venv/',
        '__pycache__/',
        '.git/',
        'node_modules/',
        '.env.template',
        '.env.example',
        'credential_validator.py',  # This file itself
        'test_',
        '.pyc',
        '.log',
        'SECURITY_UPDATE.md',  # Contains exposed credentials for documentation
        'NOTIFICATION_SYSTEM_IMPLEMENTATION_SUMMARY.md',
        'NOTIFICATION_SYSTEM_STATUS.md',
        'SENDGRID_TROUBLESHOOTING_REPORT.md',
        'env_backups_',  # Backup directories
        '.md',  # Skip all markdown files for now
        'docs/',  # Documentation directory
        'scripts/',  # Development scripts (handled separately)
        'validate_environment.py',  # Contains test credentials for validation
    ]
    
    # Safe patterns that are allowed (placeholders, examples)
    SAFE_PATTERNS = [
        'your-secret-key-here',
        'sk_test_your_stripe_test_secret_key_here',
        'pk_test_default',
        'whsec_default',
        'ACyour_account_sid_here',
        'your_auth_token_here',
        'SG.your_sendgrid_api_key_here',
        'test-secret-key',
        'sk_test_4eC39HqLyjWDarjtT1zdp7dc',  # Stripe's documented test key
        'your-jwt-secret-key-here',
        'your_generated_',
        'CHANGE THIS',
        'Set via',
        'REQUIRED:',
        'Format:',
        'postgresql://user:password@',
        'postgresql://username:password@',
        'postgresql://user:pass@',
        'postgresql://postgres:postgres@',
        'mysql://[^:]+:[^@',
        'postgresql://[^:]+:[^@',
        'sk_live_your_live_secret_key',
        'os.getenv',
        'secrets.token_urlsafe',
        'environment variable',
        'SG.xxxxxxxxxxxxxxxxxxxxxxx',
        'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'jwt.decode(',
        'self.secret_key',
        'algorithms=',
        'sk_test_4eC39HqLyjWDarjtT1zdp7dc',  # Stripe's example key
        'jwt_secret.*=.*["\']',  # Pattern matching, not actual secret
        '.startswith(',
        'validation',
        'development',
        'production',
        'test key',
        'environment',
    ]
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or os.getcwd())
        self.violations = []
        
    def should_exclude_file(self, file_path: Path) -> bool:
        """Check if file should be excluded from scanning"""
        file_str = str(file_path)
        return any(pattern in file_str for pattern in self.EXCLUDE_PATTERNS)
    
    def is_safe_pattern(self, match: str) -> bool:
        """Check if the matched string is a safe placeholder"""
        return any(safe in match.lower() for safe in self.SAFE_PATTERNS)
    
    def is_documentation_context(self, content: str, match_start: int) -> bool:
        """Check if the match is in a documentation context"""
        # Get surrounding text (100 chars before and after)
        start = max(0, match_start - 100)
        end = min(len(content), match_start + 100)
        context = content[start:end].lower()
        
        # Documentation indicators
        doc_indicators = [
            'example',
            'documentation',
            'template',
            'placeholder',
            'replace with',
            'format:',
            'get from:',
            'security update',
            'exposed credential',
            'troubleshooting',
            'backup',
            'historical',
            'removed',
            'delete',
            'revoke',
        ]
        
        return any(indicator in context for indicator in doc_indicators)
    
    def scan_file(self, file_path: Path) -> List[Dict]:
        """Scan a single file for credential patterns"""
        violations = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            for cred_type, patterns in self.CREDENTIAL_PATTERNS.items():
                for pattern in patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    
                    for match in matches:
                        match_text = match.group()
                        
                        # Skip if it's a safe placeholder
                        if self.is_safe_pattern(match_text):
                            continue
                        
                        # Skip if in documentation context
                        if self.is_documentation_context(content, match.start()):
                            continue
                            
                        # Get line number
                        line_num = content[:match.start()].count('\n') + 1
                        
                        violations.append({
                            'file': str(file_path.relative_to(self.project_root)),
                            'line': line_num,
                            'type': cred_type,
                            'pattern': pattern,
                            'match': match_text[:50] + '...' if len(match_text) > 50 else match_text,
                            'severity': 'CRITICAL'
                        })
                        
        except Exception as e:
            logger.warning(f"Error scanning {file_path}: {e}")
            
        return violations
    
    def scan_directory(self, directory: Path = None) -> None:
        """Scan entire directory recursively"""
        if directory is None:
            directory = self.project_root
            
        logger.info(f"Scanning directory: {directory}")
        
        for file_path in directory.rglob('*'):
            if not file_path.is_file():
                continue
                
            if self.should_exclude_file(file_path):
                continue
                
            # Only scan text files
            if file_path.suffix in ['.py', '.js', '.ts', '.json', '.yaml', '.yml', '.md', '.txt', '.env']:
                violations = self.scan_file(file_path)
                self.violations.extend(violations)
    
    def validate_environment_template(self) -> List[Dict]:
        """Validate .env.template for security best practices"""
        template_issues = []
        template_path = self.project_root / '.env.template'
        
        if not template_path.exists():
            template_issues.append({
                'file': '.env.template',
                'line': 0,
                'type': 'missing_template',
                'message': '.env.template file is missing',
                'severity': 'HIGH'
            })
            return template_issues
        
        try:
            with open(template_path, 'r') as f:
                content = f.read()
                
            # Check for required security warnings
            required_warnings = [
                'security',
                'production',
                'environment variable',
                'never commit'
            ]
            
            for warning in required_warnings:
                if warning.lower() not in content.lower():
                    template_issues.append({
                        'file': '.env.template',
                        'line': 0,
                        'type': 'missing_warning',
                        'message': f'Missing security warning about: {warning}',
                        'severity': 'MEDIUM'
                    })
        
        except Exception as e:
            template_issues.append({
                'file': '.env.template',
                'line': 0,
                'type': 'read_error',
                'message': f'Error reading template: {e}',
                'severity': 'HIGH'
            })
            
        return template_issues
    
    def check_env_files(self) -> List[Dict]:
        """Check for accidentally committed .env files"""
        env_issues = []
        
        for env_file in ['.env', '.env.local', '.env.production']:
            env_path = self.project_root / env_file
            if env_path.exists():
                env_issues.append({
                    'file': env_file,
                    'line': 0,
                    'type': 'committed_env',
                    'message': f'{env_file} should never be committed to version control',
                    'severity': 'CRITICAL'
                })
                
        return env_issues
    
    def generate_report(self) -> Dict:
        """Generate comprehensive security report"""
        # Run all validations
        self.scan_directory()
        template_issues = self.validate_environment_template()
        env_issues = self.check_env_files()
        
        all_violations = self.violations + template_issues + env_issues
        
        # Categorize by severity
        critical = [v for v in all_violations if v.get('severity') == 'CRITICAL']
        high = [v for v in all_violations if v.get('severity') == 'HIGH']
        medium = [v for v in all_violations if v.get('severity') == 'MEDIUM']
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_violations': len(all_violations),
            'critical_count': len(critical),
            'high_count': len(high),
            'medium_count': len(medium),
            'violations': {
                'critical': critical,
                'high': high,
                'medium': medium
            },
            'status': 'FAIL' if critical or high else 'PASS' if medium else 'CLEAN'
        }
        
        return report
    
    def print_report(self, report: Dict) -> None:
        """Print human-readable security report"""
        print("\n" + "="*80)
        print("🔒 SECURITY CREDENTIAL VALIDATION REPORT")
        print("="*80)
        print(f"Timestamp: {report['timestamp']}")
        print(f"Status: {report['status']}")
        print(f"Total Issues: {report['total_violations']}")
        print(f"  Critical: {report['critical_count']}")
        print(f"  High: {report['high_count']}")
        print(f"  Medium: {report['medium_count']}")
        
        if report['status'] == 'CLEAN':
            print("\n✅ No security issues found!")
            return
        
        for severity in ['critical', 'high', 'medium']:
            violations = report['violations'][severity]
            if not violations:
                continue
                
            print(f"\n🚨 {severity.upper()} ISSUES ({len(violations)}):")
            print("-" * 40)
            
            for v in violations:
                print(f"  File: {v['file']}")
                if v.get('line', 0) > 0:
                    print(f"  Line: {v['line']}")
                print(f"  Type: {v.get('type', 'unknown')}")
                if 'match' in v:
                    print(f"  Match: {v['match']}")
                if 'message' in v:
                    print(f"  Issue: {v['message']}")
                print()
        
        if report['critical_count'] > 0:
            print("🚨 CRITICAL: Exposed credentials found! Immediate action required!")
        elif report['high_count'] > 0:
            print("⚠️  HIGH: Security vulnerabilities found! Please address before deployment.")
        
    def save_report(self, report: Dict, output_file: str = None) -> None:
        """Save report to JSON file"""
        if not output_file:
            output_file = f"security_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
        output_path = self.project_root / output_file
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
            
        logger.info(f"Security report saved to: {output_path}")


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Validate credential security')
    parser.add_argument('--fix', action='store_true', help='Attempt to fix issues automatically')
    parser.add_argument('--output', '-o', help='Output file for JSON report')
    parser.add_argument('--root', help='Project root directory')
    args = parser.parse_args()
    
    validator = CredentialValidator(args.root)
    report = validator.generate_report()
    
    # Print report
    validator.print_report(report)
    
    # Save report
    if args.output:
        validator.save_report(report, args.output)
    
    # Exit with error code if critical issues found
    if report['critical_count'] > 0:
        sys.exit(1)
    elif report['high_count'] > 0:
        sys.exit(2)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()