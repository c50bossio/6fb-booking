#!/usr/bin/env python3
"""
Security Scan Results Aggregator
Aggregates results from multiple security scanning tools into a unified report
"""

import json
import os
import sys
import glob
from typing import Dict, List, Any
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class SecurityFinding:
    """Represents a security finding"""
    tool: str
    severity: str
    category: str
    title: str
    description: str
    file_path: str = ""
    line_number: int = 0
    cve_id: str = ""
    cvss_score: float = 0.0
    remediation: str = ""

@dataclass
class SecuritySummary:
    """Summary of security scan results"""
    total_findings: int
    critical: int
    high: int
    medium: int
    low: int
    info: int
    tools_used: List[str]
    scan_timestamp: str
    overall_risk: str

class SecurityAggregator:
    """Aggregates security scan results from multiple tools"""
    
    def __init__(self, scan_results_dir: str):
        self.scan_results_dir = scan_results_dir
        self.findings: List[SecurityFinding] = []
        self.summary = SecuritySummary(
            total_findings=0,
            critical=0,
            high=0,
            medium=0,
            low=0,
            info=0,
            tools_used=[],
            scan_timestamp=datetime.now().isoformat(),
            overall_risk="UNKNOWN"
        )
    
    def aggregate_all_results(self) -> Dict[str, Any]:
        """Aggregate results from all security tools"""
        
        # Process different types of scan results
        self._process_dependency_scans()
        self._process_code_scans()
        self._process_container_scans()
        self._process_secrets_scans()
        self._process_compliance_scans()
        
        # Generate summary
        self._generate_summary()
        
        # Create final report
        report = {
            "summary": asdict(self.summary),
            "findings": [asdict(f) for f in self.findings],
            "dependencies": self._categorize_findings("dependency"),
            "code": self._categorize_findings("code"),
            "containers": self._categorize_findings("container"),
            "secrets": self._categorize_findings("secrets"),
            "compliance": self._categorize_findings("compliance"),
            "critical_findings": [
                f.title for f in self.findings if f.severity.lower() == "critical"
            ][:10],  # Top 10 critical findings
            "recommendations": self._generate_recommendations()
        }
        
        return report
    
    def _process_dependency_scans(self):
        """Process dependency scan results"""
        
        # Safety (Python)
        safety_files = glob.glob(f"{self.scan_results_dir}/**/safety-report.json", recursive=True)
        for file_path in safety_files:
            self._process_safety_results(file_path)
        
        # npm audit (Node.js)
        npm_files = glob.glob(f"{self.scan_results_dir}/**/npm-audit-report.json", recursive=True)
        for file_path in npm_files:
            self._process_npm_audit_results(file_path)
        
        # Snyk
        snyk_files = glob.glob(f"{self.scan_results_dir}/**/snyk-report.json", recursive=True)
        for file_path in snyk_files:
            self._process_snyk_results(file_path)
    
    def _process_code_scans(self):
        """Process code security scan results"""
        
        # Bandit (Python)
        bandit_files = glob.glob(f"{self.scan_results_dir}/**/bandit-report.json", recursive=True)
        for file_path in bandit_files:
            self._process_bandit_results(file_path)
        
        # Semgrep
        semgrep_files = glob.glob(f"{self.scan_results_dir}/**/semgrep-report.json", recursive=True)
        for file_path in semgrep_files:
            self._process_semgrep_results(file_path)
        
        # ESLint Security
        eslint_files = glob.glob(f"{self.scan_results_dir}/**/eslint-security-report.json", recursive=True)
        for file_path in eslint_files:
            self._process_eslint_security_results(file_path)
    
    def _process_container_scans(self):
        """Process container security scan results"""
        
        # Trivy
        trivy_files = glob.glob(f"{self.scan_results_dir}/**/*trivy-report.json", recursive=True)
        for file_path in trivy_files:
            self._process_trivy_results(file_path)
        
        # Grype
        grype_files = glob.glob(f"{self.scan_results_dir}/**/*grype-report.json", recursive=True)
        for file_path in grype_files:
            self._process_grype_results(file_path)
    
    def _process_secrets_scans(self):
        """Process secrets detection results"""
        
        # TruffleHog
        trufflehog_files = glob.glob(f"{self.scan_results_dir}/**/trufflehog-report.json", recursive=True)
        for file_path in trufflehog_files:
            self._process_trufflehog_results(file_path)
        
        # GitLeaks
        gitleaks_files = glob.glob(f"{self.scan_results_dir}/**/gitleaks-report.json", recursive=True)
        for file_path in gitleaks_files:
            self._process_gitleaks_results(file_path)
    
    def _process_compliance_scans(self):
        """Process compliance scan results"""
        
        # Checkov
        checkov_files = glob.glob(f"{self.scan_results_dir}/**/checkov-report.json", recursive=True)
        for file_path in checkov_files:
            self._process_checkov_results(file_path)
    
    def _process_safety_results(self, file_path: str):
        """Process Safety scan results"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                return
            
            for vulnerability in data:
                finding = SecurityFinding(
                    tool="safety",
                    severity=self._map_severity(vulnerability.get('severity', 'medium')),
                    category="dependency",
                    title=f"Vulnerable package: {vulnerability.get('package_name', 'unknown')}",
                    description=vulnerability.get('advisory', 'No description available'),
                    cve_id=vulnerability.get('cve', ''),
                    remediation=f"Update to version {vulnerability.get('safe_versions', ['latest'])[0] if vulnerability.get('safe_versions') else 'latest'}"
                )
                self.findings.append(finding)
            
            if "safety" not in self.summary.tools_used:
                self.summary.tools_used.append("safety")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process Safety results from {file_path}: {e}")
    
    def _process_npm_audit_results(self, file_path: str):
        """Process npm audit results"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            vulnerabilities = data.get('vulnerabilities', {})
            
            for package_name, vuln_data in vulnerabilities.items():
                severity = vuln_data.get('severity', 'medium')
                
                finding = SecurityFinding(
                    tool="npm-audit",
                    severity=self._map_severity(severity),
                    category="dependency",
                    title=f"Vulnerable npm package: {package_name}",
                    description=vuln_data.get('via', [{}])[0].get('title', 'No description available') if isinstance(vuln_data.get('via'), list) else str(vuln_data.get('via', '')),
                    remediation=f"Run 'npm audit fix' or update package manually"
                )
                self.findings.append(finding)
            
            if "npm-audit" not in self.summary.tools_used:
                self.summary.tools_used.append("npm-audit")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process npm audit results from {file_path}: {e}")
    
    def _process_bandit_results(self, file_path: str):
        """Process Bandit scan results"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            results = data.get('results', [])
            
            for result in results:
                finding = SecurityFinding(
                    tool="bandit",
                    severity=self._map_bandit_severity(result.get('issue_severity', 'MEDIUM')),
                    category="code",
                    title=result.get('test_name', 'Security issue'),
                    description=result.get('issue_text', 'No description available'),
                    file_path=result.get('filename', ''),
                    line_number=result.get('line_number', 0),
                    remediation=result.get('more_info', 'Review and fix the security issue')
                )
                self.findings.append(finding)
            
            if "bandit" not in self.summary.tools_used:
                self.summary.tools_used.append("bandit")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process Bandit results from {file_path}: {e}")
    
    def _process_semgrep_results(self, file_path: str):
        """Process Semgrep scan results"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            results = data.get('results', [])
            
            for result in results:
                extra = result.get('extra', {})
                
                finding = SecurityFinding(
                    tool="semgrep",
                    severity=self._map_severity(extra.get('severity', 'medium')),
                    category="code",
                    title=result.get('check_id', 'Security issue'),
                    description=extra.get('message', 'No description available'),
                    file_path=result.get('path', ''),
                    line_number=result.get('start', {}).get('line', 0),
                    remediation="Review and fix the security issue"
                )
                self.findings.append(finding)
            
            if "semgrep" not in self.summary.tools_used:
                self.summary.tools_used.append("semgrep")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process Semgrep results from {file_path}: {e}")
    
    def _process_trivy_results(self, file_path: str):
        """Process Trivy container scan results"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            results = data.get('Results', [])
            
            for result in results:
                vulnerabilities = result.get('Vulnerabilities', [])
                
                for vuln in vulnerabilities:
                    finding = SecurityFinding(
                        tool="trivy",
                        severity=self._map_severity(vuln.get('Severity', 'medium')),
                        category="container",
                        title=f"Container vulnerability: {vuln.get('VulnerabilityID', 'unknown')}",
                        description=vuln.get('Description', 'No description available'),
                        cve_id=vuln.get('VulnerabilityID', ''),
                        cvss_score=float(vuln.get('CVSS', {}).get('nvd', {}).get('V3Score', 0)),
                        remediation=f"Update package {vuln.get('PkgName', 'unknown')} to version {vuln.get('FixedVersion', 'latest')}" if vuln.get('FixedVersion') else "No fix available"
                    )
                    self.findings.append(finding)
            
            if "trivy" not in self.summary.tools_used:
                self.summary.tools_used.append("trivy")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process Trivy results from {file_path}: {e}")
    
    def _process_trufflehog_results(self, file_path: str):
        """Process TruffleHog secrets scan results"""
        try:
            with open(file_path, 'r') as f:
                content = f.read().strip()
                if not content:
                    return
                
                # TruffleHog outputs JSONL format
                for line in content.split('\n'):
                    if line.strip():
                        data = json.loads(line)
                        
                        finding = SecurityFinding(
                            tool="trufflehog",
                            severity="HIGH",  # Secrets are always high severity
                            category="secrets",
                            title=f"Secret detected: {data.get('DetectorName', 'unknown')}",
                            description=f"Potential secret found in {data.get('SourceName', 'unknown source')}",
                            file_path=data.get('SourceMetadata', {}).get('Data', {}).get('Filesystem', {}).get('file', ''),
                            line_number=data.get('SourceMetadata', {}).get('Data', {}).get('Filesystem', {}).get('line', 0),
                            remediation="Remove or rotate the exposed secret immediately"
                        )
                        self.findings.append(finding)
            
            if "trufflehog" not in self.summary.tools_used:
                self.summary.tools_used.append("trufflehog")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process TruffleHog results from {file_path}: {e}")
    
    def _categorize_findings(self, category: str) -> Dict[str, int]:
        """Categorize findings by severity for a specific category"""
        category_findings = [f for f in self.findings if f.category == category]
        
        return {
            "critical": len([f for f in category_findings if f.severity.lower() == "critical"]),
            "high": len([f for f in category_findings if f.severity.lower() == "high"]),
            "medium": len([f for f in category_findings if f.severity.lower() == "medium"]),
            "low": len([f for f in category_findings if f.severity.lower() == "low"]),
            "info": len([f for f in category_findings if f.severity.lower() == "info"])
        }
    
    def _generate_summary(self):
        """Generate summary statistics"""
        severity_counts = {}
        for finding in self.findings:
            severity = finding.severity.lower()
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        self.summary.total_findings = len(self.findings)
        self.summary.critical = severity_counts.get("critical", 0)
        self.summary.high = severity_counts.get("high", 0)
        self.summary.medium = severity_counts.get("medium", 0)
        self.summary.low = severity_counts.get("low", 0)
        self.summary.info = severity_counts.get("info", 0)
        
        # Determine overall risk
        if self.summary.critical > 0:
            self.summary.overall_risk = "CRITICAL"
        elif self.summary.high > 5:
            self.summary.overall_risk = "HIGH"
        elif self.summary.high > 0 or self.summary.medium > 10:
            self.summary.overall_risk = "MEDIUM"
        elif self.summary.medium > 0 or self.summary.low > 20:
            self.summary.overall_risk = "LOW"
        else:
            self.summary.overall_risk = "MINIMAL"
    
    def _generate_recommendations(self) -> List[Dict[str, Any]]:
        """Generate security recommendations based on findings"""
        recommendations = []
        
        # Critical findings recommendations
        if self.summary.critical > 0:
            recommendations.append({
                "priority": "IMMEDIATE",
                "category": "Critical Vulnerabilities",
                "recommendation": "Address all critical security vulnerabilities immediately before deployment",
                "details": f"Found {self.summary.critical} critical vulnerabilities that require immediate attention"
            })
        
        # Dependency recommendations
        dep_findings = [f for f in self.findings if f.category == "dependency"]
        if len(dep_findings) > 0:
            recommendations.append({
                "priority": "HIGH",
                "category": "Dependency Management",
                "recommendation": "Update vulnerable dependencies and implement automated dependency scanning",
                "details": f"Found {len(dep_findings)} dependency vulnerabilities"
            })
        
        # Secrets recommendations
        secret_findings = [f for f in self.findings if f.category == "secrets"]
        if len(secret_findings) > 0:
            recommendations.append({
                "priority": "IMMEDIATE",
                "category": "Secrets Management",
                "recommendation": "Remove exposed secrets and implement proper secrets management",
                "details": f"Found {len(secret_findings)} potential secrets in codebase"
            })
        
        # Code security recommendations
        code_findings = [f for f in self.findings if f.category == "code"]
        if len(code_findings) > 10:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Code Security",
                "recommendation": "Implement secure coding practices and regular code security reviews",
                "details": f"Found {len(code_findings)} code security issues"
            })
        
        return recommendations
    
    def _map_severity(self, severity: str) -> str:
        """Map various severity formats to standard format"""
        severity = severity.upper()
        
        mapping = {
            "CRITICAL": "CRITICAL",
            "HIGH": "HIGH",
            "MEDIUM": "MEDIUM",
            "MODERATE": "MEDIUM",
            "LOW": "LOW",
            "INFO": "INFO",
            "INFORMATIONAL": "INFO",
            "WARNING": "MEDIUM",
            "ERROR": "HIGH"
        }
        
        return mapping.get(severity, "MEDIUM")
    
    def _map_bandit_severity(self, severity: str) -> str:
        """Map Bandit severity to standard format"""
        severity = severity.upper()
        
        mapping = {
            "HIGH": "HIGH",
            "MEDIUM": "MEDIUM",
            "LOW": "LOW"
        }
        
        return mapping.get(severity, "MEDIUM")
    
    # Additional processing methods for other tools would go here...
    def _process_snyk_results(self, file_path: str):
        """Process Snyk results - placeholder implementation"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            if "snyk" not in self.summary.tools_used:
                self.summary.tools_used.append("snyk")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process Snyk results from {file_path}: {e}")
    
    def _process_eslint_security_results(self, file_path: str):
        """Process ESLint security results - placeholder implementation"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            if "eslint-security" not in self.summary.tools_used:
                self.summary.tools_used.append("eslint-security")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process ESLint security results from {file_path}: {e}")
    
    def _process_grype_results(self, file_path: str):
        """Process Grype results - placeholder implementation"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            if "grype" not in self.summary.tools_used:
                self.summary.tools_used.append("grype")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process Grype results from {file_path}: {e}")
    
    def _process_gitleaks_results(self, file_path: str):
        """Process GitLeaks results - placeholder implementation"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            if "gitleaks" not in self.summary.tools_used:
                self.summary.tools_used.append("gitleaks")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process GitLeaks results from {file_path}: {e}")
    
    def _process_checkov_results(self, file_path: str):
        """Process Checkov results - placeholder implementation"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            if "checkov" not in self.summary.tools_used:
                self.summary.tools_used.append("checkov")
                
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Warning: Could not process Checkov results from {file_path}: {e}")

def main():
    """Main execution function"""
    if len(sys.argv) != 2:
        print("Usage: python3 aggregate-scan-results.py <scan-results-directory>")
        sys.exit(1)
    
    scan_results_dir = sys.argv[1]
    
    if not os.path.exists(scan_results_dir):
        print(f"Error: Scan results directory '{scan_results_dir}' does not exist")
        sys.exit(1)
    
    aggregator = SecurityAggregator(scan_results_dir)
    report = aggregator.aggregate_all_results()
    
    # Output JSON report
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()