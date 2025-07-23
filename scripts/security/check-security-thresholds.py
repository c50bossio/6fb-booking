#!/usr/bin/env python3
"""
Security Threshold Checker
Checks if security scan results meet acceptable thresholds
"""

import json
import sys
from typing import Dict, Any

# Security thresholds configuration
THRESHOLDS = {
    "critical": {
        "max_allowed": 0,
        "fail_build": True
    },
    "high": {
        "max_allowed": 5,
        "fail_build": True
    },
    "medium": {
        "max_allowed": 20,
        "fail_build": False
    },
    "low": {
        "max_allowed": 50,
        "fail_build": False
    },
    "secrets": {
        "max_allowed": 0,
        "fail_build": True
    }
}

def check_thresholds(assessment_data: Dict[str, Any]) -> bool:
    """
    Check if security findings exceed configured thresholds
    Returns True if all thresholds pass, False otherwise
    """
    
    summary = assessment_data.get('summary', {})
    secrets = assessment_data.get('secrets', {})
    
    violations = []
    should_fail = False
    
    # Check severity thresholds
    for severity, config in THRESHOLDS.items():
        if severity == "secrets":
            # Special handling for secrets
            total_secrets = sum(secrets.values())
            if total_secrets > config["max_allowed"]:
                violations.append(f"Found {total_secrets} secrets (max allowed: {config['max_allowed']})")
                if config["fail_build"]:
                    should_fail = True
        else:
            # Regular severity checks
            count = summary.get(severity, 0)
            if count > config["max_allowed"]:
                violations.append(f"{severity.upper()}: {count} findings (max allowed: {config['max_allowed']})")
                if config["fail_build"]:
                    should_fail = True
    
    # Output results
    if violations:
        print("❌ Security Threshold Violations:")
        for violation in violations:
            print(f"  - {violation}")
    else:
        print("✅ All security thresholds passed")
    
    # Additional checks for critical issues
    critical_findings = assessment_data.get('critical_findings', [])
    if critical_findings:
        print("\n⚠️  Critical Issues Found:")
        for finding in critical_findings[:10]:  # Show top 10
            print(f"  - {finding}")
    
    # Overall risk assessment
    overall_risk = summary.get('overall_risk', 'UNKNOWN')
    print(f"\n📊 Overall Risk Level: {overall_risk}")
    
    # Recommendations summary
    recommendations = assessment_data.get('recommendations', [])
    if recommendations:
        print("\n📋 Top Recommendations:")
        for rec in recommendations[:3]:  # Show top 3
            print(f"  - [{rec.get('priority', 'MEDIUM')}] {rec.get('category', 'General')}: {rec.get('recommendation', '')}")
    
    # Statistics
    print(f"\n📈 Scan Statistics:")
    print(f"  - Total findings: {summary.get('total_findings', 0)}")
    print(f"  - Tools used: {', '.join(summary.get('tools_used', []))}")
    print(f"  - Scan timestamp: {summary.get('scan_timestamp', 'Unknown')}")
    
    return not should_fail

def main():
    """Main execution function"""
    if len(sys.argv) != 2:
        print("Usage: python3 check-security-thresholds.py <assessment-json-file>", file=sys.stderr)
        sys.exit(1)
    
    assessment_file = sys.argv[1]
    
    try:
        with open(assessment_file, 'r') as f:
            assessment_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error reading assessment file: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Check thresholds
    passed = check_thresholds(assessment_data)
    
    # Exit with appropriate code
    if passed:
        print("\n✅ Security check passed - build can continue")
        sys.exit(0)
    else:
        print("\n❌ Security check failed - blocking build")
        sys.exit(1)

if __name__ == "__main__":
    main()