#!/usr/bin/env python3
"""
BookedBarber V2 Security Specialist Agent
Automated security analysis, vulnerability scanning, and compliance validation
"""

import os
import sys
import json
import logging
import hashlib
import re
import subprocess
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
import argparse


@dataclass
class SecurityVulnerability:
    """Security vulnerability detection result"""
    severity: str  # critical, high, medium, low
    category: str  # auth, payment, data, input, config
    title: str
    description: str
    file_path: str
    line_number: Optional[int] = None
    recommendation: str = ""
    cwe_id: Optional[str] = None
    compliance_impact: List[str] = None


@dataclass
class SecurityAnalysisResult:
    """Security analysis result container"""
    timestamp: str
    trigger_type: str
    files_analyzed: List[str]
    vulnerabilities: List[SecurityVulnerability]
    compliance_status: Dict[str, str]
    risk_score: int  # 0-100
    recommendations: List[str]
    emergency_actions_needed: bool = False


class BookedBarberSecurityAgent:
    """Security specialist agent for BookedBarber V2 platform"""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or "/Users/bossio/6fb-booking")
        self.backend_v2_path = self.project_root / "backend-v2"
        self.frontend_v2_path = self.backend_v2_path / "frontend-v2"
        
        # Setup logging
        self.logger = self._setup_logging()
        
        # Security patterns for BookedBarber V2
        self.security_patterns = self._load_security_patterns()
        
        # Compliance frameworks for barbershop business
        self.compliance_frameworks = {
            "GDPR": ["user data", "client information", "appointment data", "personal information"],
            "PCI_DSS": ["payment", "stripe", "billing", "card", "financial"],
            "CCPA": ["california", "privacy", "data collection", "personal info"],
            "HIPAA": ["health", "medical", "wellness", "health information"],
            "SOC2": ["admin", "configuration", "security controls", "access management"]
        }
        
        # BookedBarber V2 specific security requirements
        self.bookedbarber_security_rules = self._load_bookedbarber_security_rules()

    def _setup_logging(self) -> logging.Logger:
        """Setup security agent logging"""
        log_file = self.project_root / ".claude" / "security-agent.log"
        log_file.parent.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        return logging.getLogger("SecurityAgent")

    def _load_security_patterns(self) -> Dict[str, List[re.Pattern]]:
        """Load security vulnerability detection patterns"""
        return {
            "sql_injection": [
                re.compile(r"query\s*=\s*['\"].*\{.*\}.*['\"]", re.IGNORECASE),
                re.compile(r"execute\s*\(\s*['\"].*\+.*['\"]", re.IGNORECASE),
                re.compile(r"cursor\.execute\s*\(\s*f['\"]", re.IGNORECASE),
                re.compile(r"db\.session\.execute\s*\(\s*text\s*\(\s*f['\"]", re.IGNORECASE),
            ],
            "hardcoded_secrets": [
                re.compile(r"(api_key|secret_key|password)\s*=\s*['\"][^'\"]{10,}['\"]", re.IGNORECASE),
                re.compile(r"stripe_secret_key\s*=\s*['\"]sk_", re.IGNORECASE),
                re.compile(r"jwt_secret\s*=\s*['\"][^'\"]{20,}['\"]", re.IGNORECASE),
                re.compile(r"(access_token|refresh_token)\s*=\s*['\"][^'\"]{20,}['\"]", re.IGNORECASE),
            ],
            "weak_crypto": [
                re.compile(r"hashlib\.md5\(", re.IGNORECASE),
                re.compile(r"hashlib\.sha1\(", re.IGNORECASE),
                re.compile(r"random\.random\(\)", re.IGNORECASE),
                re.compile(r"Math\.random\(\)", re.IGNORECASE),
            ],
            "xss_vulnerabilities": [
                re.compile(r"innerHTML\s*=\s*.*\+", re.IGNORECASE),
                re.compile(r"dangerouslySetInnerHTML", re.IGNORECASE),
                re.compile(r"document\.write\s*\(", re.IGNORECASE),
                re.compile(r"eval\s*\(", re.IGNORECASE),
            ],
            "auth_bypass": [
                re.compile(r"if\s+not\s+auth\s*:", re.IGNORECASE),
                re.compile(r"auth\s*=\s*False", re.IGNORECASE),
                re.compile(r"skip_auth\s*=\s*True", re.IGNORECASE),
                re.compile(r"\\*\\*kwargs", re.IGNORECASE),  # Potential parameter pollution
            ],
            "insecure_direct_object_reference": [
                re.compile(r"user_id\s*=\s*request\.", re.IGNORECASE),
                re.compile(r"id\s*=\s*params\[", re.IGNORECASE),
                re.compile(r"DELETE.*WHERE.*id\s*=\s*\{", re.IGNORECASE),
            ],
            "improper_error_handling": [
                re.compile(r"except\s*:\s*pass", re.IGNORECASE),
                re.compile(r"except\s+Exception\s*:\s*return", re.IGNORECASE),
                re.compile(r"console\.log\s*\(\s*error", re.IGNORECASE),
                re.compile(r"print\s*\(\s*e\)", re.IGNORECASE),
            ]
        }

    def _load_bookedbarber_security_rules(self) -> Dict[str, Dict]:
        """Load BookedBarber V2 specific security rules"""
        return {
            "payment_security": {
                "required_patterns": [
                    r"stripe_signature_verification",
                    r"idempotency_key",
                    r"amount_validation"
                ],
                "forbidden_patterns": [
                    r"stripe_secret_key.*=.*['\"][^'\"]+['\"]",  # Hardcoded Stripe keys
                    r"amount\s*=\s*request\.",  # Direct amount from request
                ],
                "compliance": ["PCI_DSS"]
            },
            "auth_security": {
                "required_patterns": [
                    r"verify_password",
                    r"check_password_hash",
                    r"@require_auth",
                    r"JWT.*verify"
                ],
                "forbidden_patterns": [
                    r"password.*==.*request\.",  # Direct password comparison
                    r"user\.password\s*=\s*request\.",  # Direct password assignment
                ],
                "compliance": ["SOC2", "GDPR"]
            },
            "client_data_security": {
                "required_patterns": [
                    r"data_encryption",
                    r"anonymize",
                    r"consent_validation"
                ],
                "forbidden_patterns": [
                    r"client\.email.*print",  # Logging client email
                    r"client\.phone.*log",  # Logging client phone
                ],
                "compliance": ["GDPR", "CCPA"]
            },
            "appointment_security": {
                "required_patterns": [
                    r"authorization_check",
                    r"owner_validation",
                    r"time_slot_validation"
                ],
                "forbidden_patterns": [
                    r"appointment_id\s*=\s*request\.",  # Direct appointment ID from request
                ],
                "compliance": ["GDPR"]
            }
        }

    async def analyze_security_changes(self, changed_files: List[str], trigger_type: str) -> SecurityAnalysisResult:
        """Main security analysis entry point"""
        self.logger.info(f"Starting security analysis for {len(changed_files)} files (trigger: {trigger_type})")
        
        vulnerabilities = []
        compliance_status = {}
        risk_score = 0
        recommendations = []
        
        # Analyze each changed file
        for file_path in changed_files:
            if self._is_security_relevant_file(file_path):
                file_vulnerabilities = await self._analyze_file_security(file_path)
                vulnerabilities.extend(file_vulnerabilities)
        
        # Calculate overall risk score
        risk_score = self._calculate_risk_score(vulnerabilities)
        
        # Check compliance status
        compliance_status = self._check_compliance_status(vulnerabilities, changed_files)
        
        # Generate recommendations
        recommendations = self._generate_security_recommendations(vulnerabilities, compliance_status)
        
        # Check if emergency actions are needed
        emergency_actions_needed = any(v.severity == "critical" for v in vulnerabilities)
        
        result = SecurityAnalysisResult(
            timestamp=datetime.now(timezone.utc).isoformat(),
            trigger_type=trigger_type,
            files_analyzed=changed_files,
            vulnerabilities=vulnerabilities,
            compliance_status=compliance_status,
            risk_score=risk_score,
            recommendations=recommendations,
            emergency_actions_needed=emergency_actions_needed
        )
        
        # Log and save results
        await self._save_analysis_result(result)
        
        # Take automated actions if needed
        if emergency_actions_needed:
            await self._handle_emergency_security_issues(result)
        
        return result

    def _is_security_relevant_file(self, file_path: str) -> bool:
        """Check if file is security-relevant for BookedBarber V2"""
        security_patterns = [
            r"auth",
            r"login",
            r"password",
            r"payment",
            r"stripe",
            r"billing",
            r"user",
            r"client",
            r"appointment",
            r"security",
            r"middleware",
            r"jwt",
            r"session",
            r"api.*key",
            r"webhook",
            r"oauth"
        ]
        
        file_lower = file_path.lower()
        return any(re.search(pattern, file_lower) for pattern in security_patterns)

    async def _analyze_file_security(self, file_path: str) -> List[SecurityVulnerability]:
        """Analyze individual file for security vulnerabilities"""
        vulnerabilities = []
        
        try:
            full_path = self.project_root / file_path
            if not full_path.exists():
                return vulnerabilities
            
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
            
            # Check for each vulnerability category
            for category, patterns in self.security_patterns.items():
                for pattern in patterns:
                    for line_num, line in enumerate(lines, 1):
                        if pattern.search(line):
                            vulnerability = self._create_vulnerability(
                                category, file_path, line_num, line, pattern
                            )
                            vulnerabilities.append(vulnerability)
            
            # Check BookedBarber V2 specific security rules
            vulnerabilities.extend(self._check_bookedbarber_security_rules(file_path, content, lines))
            
        except Exception as e:
            self.logger.error(f"Error analyzing file {file_path}: {e}")
        
        return vulnerabilities

    def _create_vulnerability(self, category: str, file_path: str, line_num: int, 
                            line: str, pattern: re.Pattern) -> SecurityVulnerability:
        """Create a vulnerability object from detected pattern"""
        severity_map = {
            "sql_injection": "critical",
            "hardcoded_secrets": "critical",
            "auth_bypass": "high",
            "xss_vulnerabilities": "high",
            "weak_crypto": "medium",
            "insecure_direct_object_reference": "high",
            "improper_error_handling": "low"
        }
        
        cwe_map = {
            "sql_injection": "CWE-89",
            "hardcoded_secrets": "CWE-798",
            "auth_bypass": "CWE-287",
            "xss_vulnerabilities": "CWE-79",
            "weak_crypto": "CWE-327",
            "insecure_direct_object_reference": "CWE-639",
            "improper_error_handling": "CWE-209"
        }
        
        recommendations = {
            "sql_injection": "Use parameterized queries or ORM methods. Never concatenate user input into SQL.",
            "hardcoded_secrets": "Move secrets to environment variables or secure key management system.",
            "auth_bypass": "Implement proper authentication checks on all protected endpoints.",
            "xss_vulnerabilities": "Sanitize all user input and use safe DOM manipulation methods.",
            "weak_crypto": "Use strong cryptographic functions (SHA-256, bcrypt, or better).",
            "insecure_direct_object_reference": "Validate user authorization before accessing objects.",
            "improper_error_handling": "Implement proper error handling without exposing sensitive information."
        }
        
        return SecurityVulnerability(
            severity=severity_map.get(category, "medium"),
            category=category,
            title=f"{category.replace('_', ' ').title()} Detected",
            description=f"Potential {category.replace('_', ' ')} vulnerability detected in line: {line.strip()}",
            file_path=file_path,
            line_number=line_num,
            recommendation=recommendations.get(category, "Review and remediate this security issue."),
            cwe_id=cwe_map.get(category),
            compliance_impact=self._get_compliance_impact(category)
        )

    def _check_bookedbarber_security_rules(self, file_path: str, content: str, 
                                         lines: List[str]) -> List[SecurityVulnerability]:
        """Check BookedBarber V2 specific security rules"""
        vulnerabilities = []
        
        for rule_name, rule_config in self.bookedbarber_security_rules.items():
            # Check if this rule applies to this file
            if not self._rule_applies_to_file(rule_name, file_path):
                continue
            
            # Check forbidden patterns
            for forbidden_pattern in rule_config.get("forbidden_patterns", []):
                pattern = re.compile(forbidden_pattern, re.IGNORECASE)
                for line_num, line in enumerate(lines, 1):
                    if pattern.search(line):
                        vulnerability = SecurityVulnerability(
                            severity="high",
                            category="bookedbarber_security",
                            title=f"BookedBarber Security Rule Violation: {rule_name}",
                            description=f"Forbidden pattern detected: {line.strip()}",
                            file_path=file_path,
                            line_number=line_num,
                            recommendation=f"Review BookedBarber V2 security guidelines for {rule_name}",
                            compliance_impact=rule_config.get("compliance", [])
                        )
                        vulnerabilities.append(vulnerability)
        
        return vulnerabilities

    def _rule_applies_to_file(self, rule_name: str, file_path: str) -> bool:
        """Check if a security rule applies to the given file"""
        rule_file_patterns = {
            "payment_security": [r"payment", r"stripe", r"billing", r"checkout"],
            "auth_security": [r"auth", r"login", r"session", r"jwt", r"middleware"],
            "client_data_security": [r"client", r"user", r"models", r"user"],
            "appointment_security": [r"appointment", r"booking", r"calendar"]
        }
        
        patterns = rule_file_patterns.get(rule_name, [])
        file_lower = file_path.lower()
        return any(re.search(pattern, file_lower) for pattern in patterns)

    def _get_compliance_impact(self, category: str) -> List[str]:
        """Get compliance frameworks impacted by vulnerability category"""
        compliance_impact_map = {
            "sql_injection": ["PCI_DSS", "SOC2"],
            "hardcoded_secrets": ["PCI_DSS", "SOC2", "GDPR"],
            "auth_bypass": ["PCI_DSS", "SOC2", "GDPR", "HIPAA"],
            "xss_vulnerabilities": ["SOC2"],
            "weak_crypto": ["PCI_DSS", "GDPR", "HIPAA"],
            "insecure_direct_object_reference": ["GDPR", "SOC2"],
            "improper_error_handling": ["PCI_DSS", "SOC2"]
        }
        return compliance_impact_map.get(category, [])

    def _calculate_risk_score(self, vulnerabilities: List[SecurityVulnerability]) -> int:
        """Calculate overall risk score (0-100)"""
        if not vulnerabilities:
            return 0
        
        severity_weights = {
            "critical": 40,
            "high": 20,
            "medium": 10,
            "low": 5
        }
        
        total_score = sum(severity_weights.get(v.severity, 5) for v in vulnerabilities)
        # Cap at 100
        return min(total_score, 100)

    def _check_compliance_status(self, vulnerabilities: List[SecurityVulnerability], 
                                files_analyzed: List[str]) -> Dict[str, str]:
        """Check compliance status for each framework"""
        compliance_status = {}
        
        for framework in self.compliance_frameworks:
            impacted_vulnerabilities = [
                v for v in vulnerabilities 
                if v.compliance_impact and framework in v.compliance_impact
            ]
            
            if not impacted_vulnerabilities:
                compliance_status[framework] = "COMPLIANT"
            elif any(v.severity in ["critical", "high"] for v in impacted_vulnerabilities):
                compliance_status[framework] = "NON_COMPLIANT"
            else:
                compliance_status[framework] = "AT_RISK"
        
        return compliance_status

    def _generate_security_recommendations(self, vulnerabilities: List[SecurityVulnerability], 
                                         compliance_status: Dict[str, str]) -> List[str]:
        """Generate security recommendations based on analysis"""
        recommendations = []
        
        # Critical vulnerability recommendations
        critical_vulns = [v for v in vulnerabilities if v.severity == "critical"]
        if critical_vulns:
            recommendations.append("URGENT: Address critical security vulnerabilities immediately")
            recommendations.append("Consider rolling back changes until vulnerabilities are fixed")
        
        # Category-specific recommendations
        vuln_categories = set(v.category for v in vulnerabilities)
        
        if "sql_injection" in vuln_categories:
            recommendations.append("Implement parameterized queries across all database operations")
        
        if "hardcoded_secrets" in vuln_categories:
            recommendations.append("Migrate all secrets to environment variables or AWS Secrets Manager")
        
        if "auth_bypass" in vuln_categories:
            recommendations.append("Review authentication middleware and ensure proper authorization checks")
        
        # Compliance recommendations
        non_compliant = [f for f, status in compliance_status.items() if status == "NON_COMPLIANT"]
        if non_compliant:
            recommendations.append(f"Address compliance violations for: {', '.join(non_compliant)}")
        
        # BookedBarber V2 specific recommendations
        recommendations.extend([
            "Ensure all payment endpoints use Stripe's secure APIs with proper validation",
            "Verify client data is properly encrypted and anonymized per GDPR requirements",
            "Implement proper session management for barbershop staff accounts",
            "Validate appointment booking authorization to prevent unauthorized access"
        ])
        
        return recommendations

    async def _save_analysis_result(self, result: SecurityAnalysisResult):
        """Save security analysis result"""
        results_dir = self.project_root / ".claude" / "security-results"
        results_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = results_dir / f"security_analysis_{timestamp}.json"
        
        # Convert to dict for JSON serialization
        result_dict = asdict(result)
        
        try:
            with open(result_file, 'w') as f:
                json.dump(result_dict, f, indent=2, default=str)
            
            self.logger.info(f"Security analysis result saved to {result_file}")
        except Exception as e:
            self.logger.error(f"Failed to save security analysis result: {e}")

    async def _handle_emergency_security_issues(self, result: SecurityAnalysisResult):
        """Handle emergency security issues"""
        self.logger.critical("EMERGENCY: Critical security vulnerabilities detected!")
        
        # Create emergency notification
        emergency_file = self.project_root / ".claude" / "SECURITY_EMERGENCY"
        with open(emergency_file, 'w') as f:
            f.write(f"CRITICAL SECURITY ISSUES DETECTED AT {result.timestamp}\n")
            f.write("=" * 60 + "\n")
            for vuln in result.vulnerabilities:
                if vuln.severity == "critical":
                    f.write(f"- {vuln.title} in {vuln.file_path}:{vuln.line_number}\n")
                    f.write(f"  {vuln.description}\n")
                    f.write(f"  Recommendation: {vuln.recommendation}\n\n")
        
        # Log emergency actions
        self.logger.critical("Emergency security file created. Manual review required.")

    async def run_comprehensive_security_audit(self) -> SecurityAnalysisResult:
        """Run comprehensive security audit of entire BookedBarber V2 codebase"""
        self.logger.info("Starting comprehensive security audit of BookedBarber V2")
        
        # Find all relevant files
        security_files = []
        
        # Backend V2 files
        backend_patterns = ["*.py"]
        for pattern in backend_patterns:
            security_files.extend(str(p.relative_to(self.project_root)) 
                                for p in self.backend_v2_path.rglob(pattern))
        
        # Frontend V2 files
        frontend_patterns = ["*.ts", "*.tsx", "*.js", "*.jsx"]
        for pattern in frontend_patterns:
            security_files.extend(str(p.relative_to(self.project_root)) 
                                for p in self.frontend_v2_path.rglob(pattern))
        
        # Filter to security-relevant files only
        relevant_files = [f for f in security_files if self._is_security_relevant_file(f)]
        
        return await self.analyze_security_changes(relevant_files, "comprehensive_audit")

    def generate_security_report(self) -> Dict[str, Any]:
        """Generate comprehensive security report"""
        return {
            "agent_info": {
                "name": "BookedBarber V2 Security Specialist Agent",
                "version": "1.0.0",
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "security_capabilities": [
                "SQL injection detection",
                "Hardcoded secrets scanning",
                "Authentication bypass detection",
                "XSS vulnerability scanning",
                "Weak cryptography detection",
                "IDOR vulnerability detection",
                "Error handling analysis",
                "BookedBarber V2 specific security rules",
                "GDPR compliance validation",
                "PCI DSS compliance checking",
                "SOC2 security controls verification"
            ],
            "supported_compliance_frameworks": list(self.compliance_frameworks.keys()),
            "bookedbarber_security_domains": list(self.bookedbarber_security_rules.keys()),
            "monitoring_file_patterns": [
                "auth*", "login*", "password*", "payment*", "stripe*",
                "user*", "client*", "appointment*", "security*", "jwt*"
            ]
        }


async def main():
    """Main entry point for security agent"""
    parser = argparse.ArgumentParser(description="BookedBarber V2 Security Specialist Agent")
    parser.add_argument("--audit", action="store_true", help="Run comprehensive security audit")
    parser.add_argument("--files", nargs="+", help="Analyze specific files")
    parser.add_argument("--trigger", default="manual", help="Trigger type for analysis")
    parser.add_argument("--report", action="store_true", help="Generate security report")
    
    args = parser.parse_args()
    
    agent = BookedBarberSecurityAgent()
    
    if args.report:
        report = agent.generate_security_report()
        print(json.dumps(report, indent=2))
        return
    
    if args.audit:
        result = await agent.run_comprehensive_security_audit()
    elif args.files:
        result = await agent.analyze_security_changes(args.files, args.trigger)
    else:
        print("No action specified. Use --audit, --files, or --report")
        return
    
    # Output results
    print(f"\nSecurity Analysis Complete")
    print(f"Risk Score: {result.risk_score}/100")
    print(f"Vulnerabilities Found: {len(result.vulnerabilities)}")
    print(f"Emergency Actions Needed: {result.emergency_actions_needed}")
    
    if result.vulnerabilities:
        print(f"\nTop Vulnerabilities:")
        for vuln in sorted(result.vulnerabilities, 
                          key=lambda x: {"critical": 4, "high": 3, "medium": 2, "low": 1}[x.severity],
                          reverse=True)[:5]:
            print(f"- [{vuln.severity.upper()}] {vuln.title} in {vuln.file_path}")
    
    if result.recommendations:
        print(f"\nKey Recommendations:")
        for rec in result.recommendations[:3]:
            print(f"- {rec}")


if __name__ == "__main__":
    asyncio.run(main())