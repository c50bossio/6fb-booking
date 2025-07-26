#!/usr/bin/env python3
"""
Security Compliance Validator for BookedBarber V2
Validates compliance with GDPR, PCI DSS, SOC2, and barbershop-specific security requirements
"""

import os
import sys
import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import hashlib


@dataclass
class ComplianceViolation:
    """Compliance violation details"""
    framework: str  # GDPR, PCI_DSS, SOC2, HIPAA, CCPA
    rule_id: str
    severity: str  # critical, high, medium, low
    title: str
    description: str
    file_path: str
    line_number: Optional[int] = None
    recommendation: str = ""
    remediation_effort: str = "medium"  # low, medium, high


@dataclass
class ComplianceReport:
    """Complete compliance validation report"""
    timestamp: str
    files_analyzed: List[str]
    violations: List[ComplianceViolation]
    compliance_status: Dict[str, str]  # framework -> status
    overall_compliance_score: int  # 0-100
    recommendations: List[str]
    next_audit_date: str


class BookedBarberComplianceValidator:
    """Compliance validator for BookedBarber V2 barbershop platform"""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or "/Users/bossio/6fb-booking")
        self.backend_v2_path = self.project_root / "backend-v2"
        self.frontend_v2_path = self.backend_v2_path / "frontend-v2"
        
        # Setup logging
        self.logger = self._setup_logging()
        
        # Load compliance rules
        self.compliance_rules = self._load_compliance_rules()
        
        # Barbershop-specific compliance requirements
        self.barbershop_compliance = self._load_barbershop_compliance_requirements()

    def _setup_logging(self) -> logging.Logger:
        """Setup compliance validator logging"""
        log_file = self.project_root / ".claude" / "compliance-validator.log"
        log_file.parent.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        return logging.getLogger("ComplianceValidator")

    def _load_compliance_rules(self) -> Dict[str, Dict]:
        """Load compliance rules for each framework"""
        return {
            "GDPR": {
                "data_processing_consent": {
                    "required_patterns": [
                        r"consent.*record",
                        r"data_processing_consent",
                        r"gdpr_consent",
                        r"explicit_consent"
                    ],
                    "forbidden_patterns": [
                        r"collect.*data.*without.*consent",
                        r"auto_consent\s*=\s*True",
                    ],
                    "file_types": ["models", "services", "routers"],
                    "severity": "critical"
                },
                "data_anonymization": {
                    "required_patterns": [
                        r"anonymize",
                        r"pseudonymize",
                        r"data_masking",
                        r"pii_encryption"
                    ],
                    "forbidden_patterns": [
                        r"store.*email.*plaintext",
                        r"log.*personal.*data",
                    ],
                    "file_types": ["models", "services"],
                    "severity": "high"
                },
                "right_to_deletion": {
                    "required_patterns": [
                        r"delete_user_data",
                        r"right_to_erasure",
                        r"gdpr_deletion",
                        r"cascade.*delete"
                    ],
                    "forbidden_patterns": [
                        r"prevent.*deletion",
                        r"no_delete\s*=\s*True",
                    ],
                    "file_types": ["models", "services", "routers"],
                    "severity": "high"
                },
                "data_portability": {
                    "required_patterns": [
                        r"export_user_data",
                        r"data_portability",
                        r"user_data_export",
                        r"gdpr_export"
                    ],
                    "file_types": ["services", "routers"],
                    "severity": "medium"
                }
            },
            "PCI_DSS": {
                "payment_data_encryption": {
                    "required_patterns": [
                        r"encrypt.*payment",
                        r"stripe.*encryption",
                        r"secure.*payment.*data",
                        r"tokenize.*card"
                    ],
                    "forbidden_patterns": [
                        r"store.*card.*number",
                        r"plaintext.*payment",
                        r"cvv.*storage",
                        r"card_number\s*=\s*request"
                    ],
                    "file_types": ["payment", "stripe", "billing"],
                    "severity": "critical"
                },
                "secure_transmission": {
                    "required_patterns": [
                        r"https.*only",
                        r"tls.*enforcement",
                        r"secure.*transport",
                        r"ssl.*redirect"
                    ],
                    "forbidden_patterns": [
                        r"http.*payment",
                        r"insecure.*transmission",
                    ],
                    "file_types": ["middleware", "config"],
                    "severity": "critical"
                },
                "access_control": {
                    "required_patterns": [
                        r"payment.*authorization",
                        r"financial.*access.*control",
                        r"payment.*permission",
                        r"stripe.*access.*validation"
                    ],
                    "forbidden_patterns": [
                        r"bypass.*payment.*auth",
                        r"skip.*payment.*validation",
                    ],
                    "file_types": ["payment", "middleware"],
                    "severity": "high"
                },
                "audit_logging": {
                    "required_patterns": [
                        r"payment.*audit",
                        r"financial.*log",
                        r"transaction.*trail",
                        r"payment.*event.*log"
                    ],
                    "file_types": ["payment", "middleware"],
                    "severity": "medium"
                }
            },
            "SOC2": {
                "authentication_controls": {
                    "required_patterns": [
                        r"multi.*factor.*auth",
                        r"mfa.*enforcement",
                        r"strong.*authentication",
                        r"biometric.*auth"
                    ],
                    "forbidden_patterns": [
                        r"weak.*password",
                        r"skip.*mfa",
                        r"bypass.*authentication"
                    ],
                    "file_types": ["auth", "middleware"],
                    "severity": "critical"
                },
                "session_management": {
                    "required_patterns": [
                        r"session.*timeout",
                        r"secure.*session",
                        r"session.*encryption",
                        r"session.*validation"
                    ],
                    "forbidden_patterns": [
                        r"infinite.*session",
                        r"session.*never.*expire",
                    ],
                    "file_types": ["auth", "middleware", "session"],
                    "severity": "high"
                },
                "administrative_controls": {
                    "required_patterns": [
                        r"admin.*audit",
                        r"privileged.*access.*monitoring",
                        r"admin.*session.*logging",
                        r"administrative.*control"
                    ],
                    "file_types": ["admin", "middleware"],
                    "severity": "medium"
                }
            },
            "HIPAA": {
                "health_data_protection": {
                    "required_patterns": [
                        r"phi.*protection",
                        r"health.*data.*encryption",
                        r"medical.*information.*security",
                        r"hipaa.*compliance"
                    ],
                    "forbidden_patterns": [
                        r"health.*data.*plaintext",
                        r"medical.*info.*log",
                    ],
                    "file_types": ["models", "health", "medical"],
                    "severity": "critical"
                }
            },
            "CCPA": {
                "privacy_rights": {
                    "required_patterns": [
                        r"california.*privacy",
                        r"ccpa.*compliance",
                        r"do_not_sell",
                        r"privacy.*opt.*out"
                    ],
                    "file_types": ["privacy", "models", "services"],
                    "severity": "medium"
                }
            }
        }

    def _load_barbershop_compliance_requirements(self) -> Dict[str, Dict]:
        """Load barbershop-specific compliance requirements"""
        return {
            "client_data_protection": {
                "description": "Protect barbershop client personal information",
                "requirements": [
                    "Client contact information must be encrypted",
                    "Appointment history requires access controls",
                    "Client photos/preferences need secure storage",
                    "Marketing consent must be explicit and recorded"
                ],
                "patterns": {
                    "required": [
                        r"client.*encryption",
                        r"appointment.*access.*control",
                        r"marketing.*consent"
                    ],
                    "forbidden": [
                        r"client.*info.*log",
                        r"plaintext.*client.*data"
                    ]
                }
            },
            "financial_compliance": {
                "description": "Barbershop financial transaction compliance",
                "requirements": [
                    "Commission calculations must be auditable",
                    "Payout records require retention policies",
                    "Tax information needs secure handling",
                    "Tip processing must follow regulations"
                ],
                "patterns": {
                    "required": [
                        r"commission.*audit",
                        r"payout.*retention",
                        r"tax.*secure.*handling"
                    ],
                    "forbidden": [
                        r"commission.*manipulation",
                        r"tax.*data.*exposure"
                    ]
                }
            },
            "appointment_security": {
                "description": "Secure appointment booking and management",
                "requirements": [
                    "Appointment modifications require authorization",
                    "Booking data must be validated",
                    "Time slot conflicts need prevention",
                    "Client-barber privacy must be maintained"
                ],
                "patterns": {
                    "required": [
                        r"appointment.*authorization",
                        r"booking.*validation",
                        r"conflict.*prevention"
                    ],
                    "forbidden": [
                        r"appointment.*bypass",
                        r"booking.*without.*validation"
                    ]
                }
            },
            "business_compliance": {
                "description": "General barbershop business compliance",
                "requirements": [
                    "Staff access controls must be implemented",
                    "Business hours enforcement",
                    "Service pricing transparency",
                    "License and certification tracking"
                ],
                "patterns": {
                    "required": [
                        r"staff.*access.*control",
                        r"business.*hours.*validation",
                        r"pricing.*transparency"
                    ],
                    "forbidden": [
                        r"unauthorized.*staff.*access",
                        r"hidden.*pricing"
                    ]
                }
            }
        }

    async def validate_compliance(self, files_to_analyze: Optional[List[str]] = None) -> ComplianceReport:
        """Main compliance validation entry point"""
        self.logger.info("Starting compliance validation for BookedBarber V2")
        
        if files_to_analyze is None:
            files_to_analyze = self._discover_relevant_files()
        
        violations = []
        
        # Validate each file against compliance rules
        for file_path in files_to_analyze:
            if self._is_compliance_relevant_file(file_path):
                file_violations = await self._validate_file_compliance(file_path)
                violations.extend(file_violations)
        
        # Calculate compliance status
        compliance_status = self._calculate_compliance_status(violations)
        
        # Calculate overall compliance score
        overall_score = self._calculate_compliance_score(violations)
        
        # Generate recommendations
        recommendations = self._generate_compliance_recommendations(violations, compliance_status)
        
        # Create report
        report = ComplianceReport(
            timestamp=datetime.now(timezone.utc).isoformat(),
            files_analyzed=files_to_analyze,
            violations=violations,
            compliance_status=compliance_status,
            overall_compliance_score=overall_score,
            recommendations=recommendations,
            next_audit_date=self._calculate_next_audit_date(overall_score)
        )
        
        # Save report
        await self._save_compliance_report(report)
        
        self.logger.info(f"Compliance validation complete. Score: {overall_score}/100")
        return report

    def _discover_relevant_files(self) -> List[str]:
        """Discover all compliance-relevant files in the project"""
        relevant_files = []
        
        # Backend V2 files
        backend_patterns = ["*.py"]
        for pattern in backend_patterns:
            relevant_files.extend(str(p.relative_to(self.project_root)) 
                                for p in self.backend_v2_path.rglob(pattern))
        
        # Frontend V2 files (for certain compliance aspects)
        frontend_patterns = ["*.ts", "*.tsx"]
        for pattern in frontend_patterns:
            relevant_files.extend(str(p.relative_to(self.project_root)) 
                                for p in self.frontend_v2_path.rglob(pattern))
        
        # Filter to compliance-relevant files
        return [f for f in relevant_files if self._is_compliance_relevant_file(f)]

    def _is_compliance_relevant_file(self, file_path: str) -> bool:
        """Check if file is relevant for compliance validation"""
        compliance_patterns = [
            r"auth", r"login", r"user", r"client", r"payment", r"stripe",
            r"billing", r"appointment", r"booking", r"session", r"privacy",
            r"consent", r"gdpr", r"admin", r"security", r"middleware",
            r"models", r"services", r"routers"
        ]
        
        file_lower = file_path.lower()
        return any(re.search(pattern, file_lower) for pattern in compliance_patterns)

    async def _validate_file_compliance(self, file_path: str) -> List[ComplianceViolation]:
        """Validate individual file for compliance violations"""
        violations = []
        
        try:
            full_path = self.project_root / file_path
            if not full_path.exists():
                return violations
            
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
            
            # Check each compliance framework
            for framework, rules in self.compliance_rules.items():
                if self._framework_applies_to_file(framework, file_path):
                    framework_violations = self._check_framework_compliance(
                        framework, rules, file_path, content, lines
                    )
                    violations.extend(framework_violations)
            
            # Check barbershop-specific compliance
            barbershop_violations = self._check_barbershop_compliance(file_path, content, lines)
            violations.extend(barbershop_violations)
            
        except Exception as e:
            self.logger.error(f"Error validating file {file_path}: {e}")
        
        return violations

    def _framework_applies_to_file(self, framework: str, file_path: str) -> bool:
        """Check if compliance framework applies to the given file"""
        framework_file_patterns = {
            "GDPR": [r"user", r"client", r"privacy", r"consent", r"models", r"data"],
            "PCI_DSS": [r"payment", r"stripe", r"billing", r"financial", r"commission"],
            "SOC2": [r"auth", r"admin", r"security", r"session", r"middleware"],
            "HIPAA": [r"health", r"medical", r"wellness"],
            "CCPA": [r"privacy", r"california", r"user", r"client"]
        }
        
        patterns = framework_file_patterns.get(framework, [])
        file_lower = file_path.lower()
        return any(re.search(pattern, file_lower) for pattern in patterns)

    def _check_framework_compliance(self, framework: str, rules: Dict, 
                                  file_path: str, content: str, 
                                  lines: List[str]) -> List[ComplianceViolation]:
        """Check compliance for a specific framework"""
        violations = []
        
        for rule_id, rule_config in rules.items():
            # Check if rule applies to this file type
            if not self._rule_applies_to_file_type(rule_config, file_path):
                continue
            
            # Check forbidden patterns
            for forbidden_pattern in rule_config.get("forbidden_patterns", []):
                pattern = re.compile(forbidden_pattern, re.IGNORECASE)
                for line_num, line in enumerate(lines, 1):
                    if pattern.search(line):
                        violation = ComplianceViolation(
                            framework=framework,
                            rule_id=rule_id,
                            severity=rule_config.get("severity", "medium"),
                            title=f"{framework} Violation: {rule_id}",
                            description=f"Forbidden pattern detected: {line.strip()}",
                            file_path=file_path,
                            line_number=line_num,
                            recommendation=f"Remove or modify pattern to comply with {framework} {rule_id}",
                            remediation_effort=self._estimate_remediation_effort(rule_config.get("severity", "medium"))
                        )
                        violations.append(violation)
            
            # Check for missing required patterns (simplified check)
            required_patterns = rule_config.get("required_patterns", [])
            if required_patterns and not any(
                re.search(pattern, content, re.IGNORECASE) 
                for pattern in required_patterns
            ):
                violation = ComplianceViolation(
                    framework=framework,
                    rule_id=rule_id,
                    severity=rule_config.get("severity", "medium"),
                    title=f"{framework} Missing Implementation: {rule_id}",
                    description=f"Required {framework} implementation missing for {rule_id}",
                    file_path=file_path,
                    recommendation=f"Implement {framework} compliance for {rule_id}",
                    remediation_effort=self._estimate_remediation_effort(rule_config.get("severity", "medium"))
                )
                violations.append(violation)
        
        return violations

    def _check_barbershop_compliance(self, file_path: str, content: str, 
                                   lines: List[str]) -> List[ComplianceViolation]:
        """Check barbershop-specific compliance requirements"""
        violations = []
        
        for requirement_id, requirement_config in self.barbershop_compliance.items():
            if not self._barbershop_rule_applies(requirement_id, file_path):
                continue
            
            patterns = requirement_config.get("patterns", {})
            
            # Check forbidden patterns
            for forbidden_pattern in patterns.get("forbidden", []):
                pattern = re.compile(forbidden_pattern, re.IGNORECASE)
                for line_num, line in enumerate(lines, 1):
                    if pattern.search(line):
                        violation = ComplianceViolation(
                            framework="BARBERSHOP",
                            rule_id=requirement_id,
                            severity="high",
                            title=f"Barbershop Compliance Violation: {requirement_id}",
                            description=f"Pattern violates barbershop security: {line.strip()}",
                            file_path=file_path,
                            line_number=line_num,
                            recommendation=requirement_config.get("description", ""),
                            remediation_effort="medium"
                        )
                        violations.append(violation)
        
        return violations

    def _rule_applies_to_file_type(self, rule_config: Dict, file_path: str) -> bool:
        """Check if rule applies to the file type"""
        file_types = rule_config.get("file_types", [])
        if not file_types:
            return True
        
        file_lower = file_path.lower()
        return any(file_type in file_lower for file_type in file_types)

    def _barbershop_rule_applies(self, requirement_id: str, file_path: str) -> bool:
        """Check if barbershop rule applies to file"""
        rule_file_patterns = {
            "client_data_protection": [r"client", r"user", r"models"],
            "financial_compliance": [r"payment", r"commission", r"payout", r"billing"],
            "appointment_security": [r"appointment", r"booking", r"calendar"],
            "business_compliance": [r"staff", r"business", r"admin", r"auth"]
        }
        
        patterns = rule_file_patterns.get(requirement_id, [])
        file_lower = file_path.lower()
        return any(re.search(pattern, file_lower) for pattern in patterns)

    def _estimate_remediation_effort(self, severity: str) -> str:
        """Estimate remediation effort based on severity"""
        effort_map = {
            "critical": "high",
            "high": "medium",
            "medium": "medium",
            "low": "low"
        }
        return effort_map.get(severity, "medium")

    def _calculate_compliance_status(self, violations: List[ComplianceViolation]) -> Dict[str, str]:
        """Calculate compliance status for each framework"""
        status = {}
        frameworks = set(v.framework for v in violations)
        frameworks.update(["GDPR", "PCI_DSS", "SOC2", "BARBERSHOP"])
        
        for framework in frameworks:
            framework_violations = [v for v in violations if v.framework == framework]
            
            if not framework_violations:
                status[framework] = "COMPLIANT"
            elif any(v.severity in ["critical", "high"] for v in framework_violations):
                status[framework] = "NON_COMPLIANT"
            else:
                status[framework] = "PARTIALLY_COMPLIANT"
        
        return status

    def _calculate_compliance_score(self, violations: List[ComplianceViolation]) -> int:
        """Calculate overall compliance score (0-100)"""
        if not violations:
            return 100
        
        severity_penalties = {
            "critical": 25,
            "high": 15,
            "medium": 5,
            "low": 2
        }
        
        total_penalty = sum(severity_penalties.get(v.severity, 5) for v in violations)
        score = max(0, 100 - total_penalty)
        return score

    def _generate_compliance_recommendations(self, violations: List[ComplianceViolation], 
                                           compliance_status: Dict[str, str]) -> List[str]:
        """Generate compliance recommendations"""
        recommendations = []
        
        # Framework-specific recommendations
        non_compliant = [f for f, status in compliance_status.items() if status == "NON_COMPLIANT"]
        if non_compliant:
            recommendations.append(f"URGENT: Address non-compliant frameworks: {', '.join(non_compliant)}")
        
        # Severity-based recommendations
        critical_violations = [v for v in violations if v.severity == "critical"]
        if critical_violations:
            recommendations.append("Address critical compliance violations immediately")
        
        # BookedBarber V2 specific recommendations
        recommendations.extend([
            "Implement comprehensive client data encryption for barbershop operations",
            "Ensure all payment processing follows PCI DSS requirements for Stripe integration",
            "Validate GDPR compliance for client appointment and personal data handling",
            "Implement proper access controls for barbershop staff and administrative functions",
            "Establish audit logging for all financial transactions and client data access"
        ])
        
        return recommendations

    def _calculate_next_audit_date(self, compliance_score: int) -> str:
        """Calculate next audit date based on compliance score"""
        from datetime import timedelta
        
        if compliance_score >= 90:
            next_audit = datetime.now() + timedelta(days=90)  # Quarterly
        elif compliance_score >= 70:
            next_audit = datetime.now() + timedelta(days=30)  # Monthly
        else:
            next_audit = datetime.now() + timedelta(days=7)   # Weekly
        
        return next_audit.isoformat()

    async def _save_compliance_report(self, report: ComplianceReport):
        """Save compliance report"""
        reports_dir = self.project_root / ".claude" / "compliance-reports"
        reports_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = reports_dir / f"compliance_report_{timestamp}.json"
        
        # Convert to dict for JSON serialization
        report_dict = asdict(report)
        
        try:
            with open(report_file, 'w') as f:
                json.dump(report_dict, f, indent=2, default=str)
            
            self.logger.info(f"Compliance report saved to {report_file}")
        except Exception as e:
            self.logger.error(f"Failed to save compliance report: {e}")

    def generate_compliance_summary(self) -> Dict[str, Any]:
        """Generate compliance summary for BookedBarber V2"""
        return {
            "validator_info": {
                "name": "BookedBarber V2 Compliance Validator",
                "version": "1.0.0",
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "supported_frameworks": list(self.compliance_rules.keys()),
            "barbershop_requirements": list(self.barbershop_compliance.keys()),
            "compliance_domains": [
                "Client data protection (GDPR)",
                "Payment processing security (PCI DSS)",
                "Administrative controls (SOC2)",
                "Health information (HIPAA)",
                "California privacy (CCPA)",
                "Barbershop-specific compliance"
            ],
            "validation_scope": [
                "Authentication and authorization",
                "Payment and financial processing",
                "Client data handling",
                "Appointment management",
                "Privacy and consent",
                "Access controls",
                "Audit logging"
            ]
        }


async def main():
    """Main entry point for compliance validator"""
    import argparse
    
    parser = argparse.ArgumentParser(description="BookedBarber V2 Compliance Validator")
    parser.add_argument("--audit", action="store_true", help="Run full compliance audit")
    parser.add_argument("--files", nargs="+", help="Validate specific files")
    parser.add_argument("--framework", help="Focus on specific framework")
    parser.add_argument("--summary", action="store_true", help="Generate compliance summary")
    
    args = parser.parse_args()
    
    validator = BookedBarberComplianceValidator()
    
    if args.summary:
        summary = validator.generate_compliance_summary()
        print(json.dumps(summary, indent=2))
        return
    
    if args.audit:
        report = await validator.validate_compliance()
    elif args.files:
        report = await validator.validate_compliance(args.files)
    else:
        print("No action specified. Use --audit, --files, or --summary")
        return
    
    # Output results
    print(f"\nCompliance Validation Complete")
    print(f"Overall Score: {report.overall_compliance_score}/100")
    print(f"Violations Found: {len(report.violations)}")
    
    # Show compliance status
    print(f"\nCompliance Status:")
    for framework, status in report.compliance_status.items():
        status_icon = "✅" if status == "COMPLIANT" else "⚠️" if status == "PARTIALLY_COMPLIANT" else "❌"
        print(f"  {status_icon} {framework}: {status}")
    
    # Show top violations
    if report.violations:
        print(f"\nTop Violations:")
        for violation in sorted(report.violations, 
                              key=lambda x: {"critical": 4, "high": 3, "medium": 2, "low": 1}[x.severity],
                              reverse=True)[:5]:
            print(f"- [{violation.severity.upper()}] {violation.title} in {violation.file_path}")
    
    # Show recommendations
    if report.recommendations:
        print(f"\nKey Recommendations:")
        for rec in report.recommendations[:3]:
            print(f"- {rec}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())