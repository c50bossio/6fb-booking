#!/usr/bin/env python3
"""
Credential Security Validation Script

Scans the codebase for exposed credentials and sensitive information.
Run this before any deployment to ensure no secrets are committed.
"""
import os
import re
import json
from pathlib import Path
from typing import List, Dict
import argparse


class CredentialScanner:
    """Scanner for detecting exposed credentials in code."""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.violations = []
        
        # Patterns for detecting credentials
        self.credential_patterns = {
            'api_key': [
                r'api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}',
                r'apikey["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}',
                r'key_[a-zA-Z0-9_]{20,}'
            ],
            'secret_key': [
                r'secret[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}',
                r'SECRET_KEY["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}',
                r'sk_[a-zA-Z0-9_]{20,}'
            ],
            'access_token': [
                r'access[_-]?token["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}',
                r'bearer["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}',
                r'token["\s]*[:=]["\s]*[a-zA-Z0-9_-]{32,}'
            ],
            'database_url': [
                r'postgresql://[^:\s]+:[^@\s]+@[^/\s]+',
                r'mysql://[^:\s]+:[^@\s]+@[^/\s]+',
                r'mongodb://[^:\s]+:[^@\s]+@[^/\s]+',
                r'DATABASE_URL["\s]*[:=]["\s]*["\'][^"\']+["\']'
            ],
            'password': [
                r'password["\s]*[:=]["\s]*["\'][^"\']{8,}["\']',
                r'PASSWORD["\s]*[:=]["\s]*["\'][^"\']{8,}["\']',
                r'pwd["\s]*[:=]["\s]*["\'][^"\']{8,}["\']'
            ],
            'private_key': [
                r'-----BEGIN PRIVATE KEY-----',
                r'-----BEGIN RSA PRIVATE KEY-----',
                r'private[_-]?key["\s]*[:=]'
            ],
            'stripe_key': [
                r'sk_live_[a-zA-Z0-9]{24}',
                r'pk_live_[a-zA-Z0-9]{24}',
                r'rk_live_[a-zA-Z0-9]{24}',
                r'STRIPE_SECRET_KEY["\s]*[:=]["\s]*sk_'
            ],
            'google_credentials': [
                r'"type":\s*"service_account"',
                r'GOOGLE_APPLICATION_CREDENTIALS',
                r'"private_key_id":\s*"[a-zA-Z0-9]+"'
            ],
            'jwt_secret': [
                r'JWT_SECRET["\s]*[:=]["\s]*[a-zA-Z0-9_-]{32,}',
                r'jwt[_-]?secret["\s]*[:=]["\s]*[a-zA-Z0-9_-]{32,}'
            ]
        }
        
        # Files and directories to exclude
        self.exclude_patterns = [
            r'\.git/',
            r'node_modules/',
            r'__pycache__/',
            r'\.pytest_cache/',
            r'venv/',
            r'env/',
            r'\.env\.template',
            r'\.env\.example',
            r'test_.*\.py$',
            r'.*_test\.py$',
            r'validate_no_credentials\.py$',
            r'\.md$',
            r'\.lock$',
            r'package-lock\.json$'
        ]
        
        # Allow certain patterns in specific files
        self.allowed_exceptions = {
            'config/settings.py': [
                'os.getenv',
                'environ.get',
                'SECRET_KEY = os.getenv'
            ],
            '.env.template': ['.*'],  # Templates are OK
            '.env.example': ['.*'],   # Examples are OK
            'docker-compose.yml': [
                'POSTGRES_PASSWORD:',
                'POSTGRES_USER:'
            ]
        }
    
    def should_exclude_file(self, file_path: str) -> bool:
        """Check if file should be excluded from scanning."""
        for pattern in self.exclude_patterns:
            if re.search(pattern, file_path):
                return True
        return False
    
    def is_allowed_exception(self, file_path: str, line: str) -> bool:
        """Check if detected credential is an allowed exception."""
        rel_path = str(Path(file_path).relative_to(self.base_path))
        
        for allowed_file, patterns in self.allowed_exceptions.items():
            if allowed_file in rel_path:
                for pattern in patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        return True
        return False
    
    def scan_file(self, file_path: Path) -> List[Dict]:
        """Scan a single file for credentials."""
        violations = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
                
                for line_num, line in enumerate(lines, 1):
                    # Skip comments and empty lines
                    stripped_line = line.strip()
                    if not stripped_line or stripped_line.startswith('#'):
                        continue
                    
                    # Check each pattern type
                    for cred_type, patterns in self.credential_patterns.items():
                        for pattern in patterns:
                            matches = re.finditer(pattern, line, re.IGNORECASE)
                            for match in matches:
                                # Check if this is an allowed exception
                                if self.is_allowed_exception(str(file_path), line):
                                    continue
                                
                                violations.append({
                                    'file': str(file_path.relative_to(self.base_path)),
                                    'line': line_num,
                                    'type': cred_type,
                                    'pattern': pattern,
                                    'content': line.strip(),
                                    'match': match.group(),
                                    'severity': self.get_severity(cred_type)
                                })
        
        except Exception as e:
            print(f"Error scanning {file_path}: {e}")
        
        return violations
    
    def get_severity(self, cred_type: str) -> str:
        """Get severity level for credential type."""
        high_severity = ['private_key', 'stripe_key', 'database_url']
        medium_severity = ['secret_key', 'api_key', 'jwt_secret']
        
        if cred_type in high_severity:
            return 'HIGH'
        elif cred_type in medium_severity:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def scan_directory(self) -> List[Dict]:
        """Scan entire directory for credentials."""
        all_violations = []
        
        # Get all files to scan
        for file_path in self.base_path.rglob('*'):
            if not file_path.is_file():
                continue
            
            if self.should_exclude_file(str(file_path)):
                continue
            
            # Only scan text files
            try:
                # Check if file is binary
                with open(file_path, 'rb') as f:
                    chunk = f.read(1024)
                    if b'\0' in chunk:
                        continue  # Skip binary files
            except:
                continue
            
            violations = self.scan_file(file_path)
            all_violations.extend(violations)
        
        return all_violations
    
    def check_environment_files(self) -> List[Dict]:
        """Check for production environment files."""
        env_violations = []
        
        dangerous_env_files = [
            '.env',
            '.env.local',
            '.env.production',
            'credentials.json',
            'service-account.json',
            'config.json'
        ]
        
        for env_file in dangerous_env_files:
            env_path = self.base_path / env_file
            if env_path.exists():
                env_violations.append({
                    'file': str(env_path.relative_to(self.base_path)),
                    'line': 0,
                    'type': 'environment_file',
                    'pattern': 'file_exists',
                    'content': f'{env_file} exists in repository',
                    'match': env_file,
                    'severity': 'HIGH'
                })
        
        return env_violations
    
    def generate_report(self, violations: List[Dict]) -> Dict:
        """Generate a comprehensive report."""
        if not violations:
            return {
                'status': 'PASS',
                'total_violations': 0,
                'summary': 'No credentials found in codebase.',
                'violations': []
            }
        
        # Group by severity
        by_severity = {'HIGH': [], 'MEDIUM': [], 'LOW': []}
        for violation in violations:
            by_severity[violation['severity']].append(violation)
        
        # Group by file
        by_file = {}
        for violation in violations:
            file_path = violation['file']
            if file_path not in by_file:
                by_file[file_path] = []
            by_file[file_path].append(violation)
        
        status = 'FAIL' if any(by_severity['HIGH']) else 'WARN' if violations else 'PASS'
        
        return {
            'status': status,
            'total_violations': len(violations),
            'high_severity': len(by_severity['HIGH']),
            'medium_severity': len(by_severity['MEDIUM']),
            'low_severity': len(by_severity['LOW']),
            'affected_files': len(by_file),
            'by_severity': by_severity,
            'by_file': by_file,
            'violations': violations,
            'summary': self.generate_summary(violations, by_severity)
        }
    
    def generate_summary(self, violations: List[Dict], by_severity: Dict) -> str:
        """Generate a summary of findings."""
        if not violations:
            return "✅ No credentials found - repository is clean!"
        
        summary = []
        
        if by_severity['HIGH']:
            summary.append(f"🚨 {len(by_severity['HIGH'])} HIGH severity issues found!")
        
        if by_severity['MEDIUM']:
            summary.append(f"⚠️  {len(by_severity['MEDIUM'])} MEDIUM severity issues found")
        
        if by_severity['LOW']:
            summary.append(f"ℹ️  {len(by_severity['LOW'])} LOW severity issues found")
        
        # Most common types
        type_counts = {}
        for violation in violations:
            vtype = violation['type']
            type_counts[vtype] = type_counts.get(vtype, 0) + 1
        
        common_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        if common_types:
            summary.append(f"Most common: {', '.join([f'{t}({c})' for t, c in common_types])}")
        
        return ' | '.join(summary)


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Scan for exposed credentials')
    parser.add_argument('--path', default='.', help='Path to scan (default: current directory)')
    parser.add_argument('--output', choices=['json', 'text'], default='text', help='Output format')
    parser.add_argument('--strict', action='store_true', help='Fail on any violations')
    parser.add_argument('--save', help='Save report to file')
    
    args = parser.parse_args()
    
    print("🔍 Scanning for exposed credentials...")
    print(f"📁 Scanning path: {os.path.abspath(args.path)}")
    
    scanner = CredentialScanner(args.path)
    
    # Scan for credentials
    violations = scanner.scan_directory()
    
    # Check for environment files
    env_violations = scanner.check_environment_files()
    violations.extend(env_violations)
    
    # Generate report
    report = scanner.generate_report(violations)
    
    # Output results
    if args.output == 'json':
        if args.save:
            with open(args.save, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"💾 Report saved to {args.save}")
        else:
            print(json.dumps(report, indent=2))
    else:
        print_text_report(report)
        
        if args.save:
            with open(args.save, 'w') as f:
                f.write(format_text_report(report))
            print(f"💾 Report saved to {args.save}")
    
    # Exit with appropriate code
    if report['status'] == 'FAIL':
        print("\n❌ CREDENTIAL SCAN FAILED - High severity issues found!")
        exit(1)
    elif report['status'] == 'WARN' and args.strict:
        print("\n⚠️  CREDENTIAL SCAN WARNING - Issues found (strict mode)")
        exit(1)
    elif report['status'] == 'WARN':
        print("\n⚠️  CREDENTIAL SCAN WARNING - Review issues found")
        exit(0)
    else:
        print("\n✅ CREDENTIAL SCAN PASSED - No issues found!")
        exit(0)


def print_text_report(report: Dict):
    """Print formatted text report."""
    print("\n" + "="*50)
    print("  CREDENTIAL SECURITY SCAN REPORT")
    print("="*50)
    
    print(f"\nStatus: {report['status']}")
    print(f"Total violations: {report['total_violations']}")
    
    if report['total_violations'] > 0:
        print(f"High severity: {report['high_severity']}")
        print(f"Medium severity: {report['medium_severity']}")
        print(f"Low severity: {report['low_severity']}")
        print(f"Affected files: {report['affected_files']}")
    
    print(f"\nSummary: {report['summary']}")
    
    if report['violations']:
        print("\n" + "-"*50)
        print("DETAILED VIOLATIONS:")
        print("-"*50)
        
        for file_path, file_violations in report['by_file'].items():
            print(f"\n📄 {file_path}")
            for violation in file_violations:
                severity_icon = "🚨" if violation['severity'] == 'HIGH' else "⚠️" if violation['severity'] == 'MEDIUM' else "ℹ️"
                print(f"  {severity_icon} Line {violation['line']}: {violation['type']}")
                print(f"     Content: {violation['content'][:80]}{'...' if len(violation['content']) > 80 else ''}")
                print(f"     Match: {violation['match']}")
    
    print("\n" + "="*50)


def format_text_report(report: Dict) -> str:
    """Format text report for file output."""
    lines = []
    lines.append("CREDENTIAL SECURITY SCAN REPORT")
    lines.append("=" * 50)
    lines.append(f"Status: {report['status']}")
    lines.append(f"Total violations: {report['total_violations']}")
    lines.append(f"Summary: {report['summary']}")
    
    if report['violations']:
        lines.append("\nDETAILED VIOLATIONS:")
        lines.append("-" * 50)
        
        for violation in report['violations']:
            lines.append(f"File: {violation['file']}")
            lines.append(f"Line: {violation['line']}")
            lines.append(f"Type: {violation['type']}")
            lines.append(f"Severity: {violation['severity']}")
            lines.append(f"Content: {violation['content']}")
            lines.append("")
    
    return "\n".join(lines)


if __name__ == "__main__":
    main()