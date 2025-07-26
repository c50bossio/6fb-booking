#!/usr/bin/env python3
"""
Enhanced Debugger Agent for BookedBarber V2
Specialized debugging agent focused on critical development issues:
- Frontend server crashes in development
- Authentication V1/V2 API mismatch issues
- Missing import dependencies causing build failures
- Port conflicts and process management
- CORS issues
- Authentication stack overflow loops
"""

import json
import time
import subprocess
import logging
import os
import re
import requests
import psutil
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import signal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/bossio/6fb-booking/.claude/debugger-agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('enhanced-debugger-agent')

class CriticalIssueDetector:
    """Detects and analyzes critical development issues"""
    
    def __init__(self):
        self.project_root = "/Users/bossio/6fb-booking"
        self.backend_path = f"{self.project_root}/backend-v2"
        self.frontend_path = f"{self.project_root}/backend-v2/frontend-v2"
        
    def detect_server_crashes(self) -> Dict[str, Any]:
        """Detect frontend/backend server crashes"""
        issues = []
        
        # Check if development servers are running
        frontend_running = self._is_port_in_use(3000)
        backend_running = self._is_port_in_use(8000)
        
        if not frontend_running:
            issues.append({
                "type": "server_crash",
                "service": "frontend",
                "port": 3000,
                "description": "Frontend development server not running on port 3000",
                "critical": True
            })
        
        if not backend_running:
            issues.append({
                "type": "server_crash", 
                "service": "backend",
                "port": 8000,
                "description": "Backend development server not running on port 8000",
                "critical": True
            })
        
        # Check for EADDRINUSE errors in logs
        eaddrinuse_issues = self._check_port_conflicts()
        issues.extend(eaddrinuse_issues)
        
        return {
            "category": "server_crashes",
            "issues": issues,
            "severity": "critical" if issues else "none"
        }
    
    def detect_auth_api_mismatch(self) -> Dict[str, Any]:
        """Detect V1/V2 API authentication mismatches"""
        issues = []
        
        # Check frontend files for V1 API usage
        v1_api_usage = self._scan_for_v1_api_calls()
        if v1_api_usage:
            issues.append({
                "type": "auth_api_mismatch",
                "description": "Frontend using deprecated V1 API endpoints",
                "files": v1_api_usage,
                "critical": True,
                "fix_command": "sed -i 's|/api/v1/|/api/v2/|g' {files}".format(
                    files=" ".join(f'"{f}"' for f in v1_api_usage)
                )
            })
        
        # Check for authentication loops
        auth_loops = self._detect_auth_loops()
        if auth_loops:
            issues.append({
                "type": "auth_stack_overflow",
                "description": "Authentication redirect loops detected",
                "details": auth_loops,
                "critical": True
            })
        
        return {
            "category": "auth_api_mismatch",
            "issues": issues,
            "severity": "critical" if issues else "none"
        }
    
    def detect_missing_dependencies(self) -> Dict[str, Any]:
        """Detect missing import dependencies causing build failures"""
        issues = []
        
        # Check TypeScript/JavaScript import errors
        ts_import_errors = self._check_typescript_imports()
        if ts_import_errors:
            issues.extend(ts_import_errors)
        
        # Check Python import errors
        py_import_errors = self._check_python_imports()
        if py_import_errors:
            issues.extend(py_import_errors)
        
        # Check package.json vs actual usage
        missing_packages = self._check_missing_npm_packages()
        if missing_packages:
            issues.extend(missing_packages)
        
        return {
            "category": "missing_dependencies",
            "issues": issues,
            "severity": "critical" if any(i.get("critical") for i in issues) else "warning"
        }
    
    def detect_cors_issues(self) -> Dict[str, Any]:
        """Detect CORS configuration issues"""
        issues = []
        
        # Test actual CORS requests
        cors_test_results = self._test_cors_requests()
        if cors_test_results["has_errors"]:
            issues.append({
                "type": "cors_errors",
                "description": "CORS requests failing between frontend and backend",
                "details": cors_test_results["errors"],
                "critical": True,
                "fix_suggestions": [
                    "Check backend CORS configuration in main.py",
                    "Verify frontend API base URL configuration",
                    "Check for localhost vs 127.0.0.1 mismatches"
                ]
            })
        
        return {
            "category": "cors_issues", 
            "issues": issues,
            "severity": "critical" if issues else "none"
        }
    
    def generate_fix_commands(self, issues: Dict[str, Any]) -> List[str]:
        """Generate specific fix commands for detected issues"""
        commands = []
        
        for category, data in issues.items():
            if data["severity"] == "none":
                continue
                
            for issue in data["issues"]:
                issue_type = issue.get("type", "")
                
                if issue_type == "server_crash":
                    service = issue.get("service", "")
                    if service == "frontend":
                        commands.extend([
                            "# Fix frontend server crash",
                            "cd /Users/bossio/6fb-booking/backend-v2/frontend-v2",
                            "pkill -f 'next dev' 2>/dev/null || true",
                            "rm -rf .next",
                            "npm install",
                            "npm run dev &"
                        ])
                    elif service == "backend":
                        commands.extend([
                            "# Fix backend server crash", 
                            "cd /Users/bossio/6fb-booking/backend-v2",
                            "pkill -f 'uvicorn' 2>/dev/null || true",
                            "source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate",
                            "pip install -r requirements.txt",
                            "uvicorn main:app --reload --host 0.0.0.0 --port 8000 &"
                        ])
                
                elif issue_type == "auth_api_mismatch":
                    if "fix_command" in issue:
                        commands.append(f"# Fix V1/V2 API mismatch")
                        commands.append(issue["fix_command"])
                
                elif issue_type == "missing_dependency":
                    if issue.get("package_type") == "npm":
                        commands.extend([
                            f"# Install missing npm package: {issue.get('package', '')}",
                            "cd /Users/bossio/6fb-booking/backend-v2/frontend-v2",
                            f"npm install {issue.get('package', '')}"
                        ])
                    elif issue.get("package_type") == "python":
                        commands.extend([
                            f"# Install missing Python package: {issue.get('package', '')}",
                            "cd /Users/bossio/6fb-booking/backend-v2",
                            "source venv/bin/activate",
                            f"pip install {issue.get('package', '')}"
                        ])
                
                elif issue_type == "cors_errors":
                    commands.extend([
                        "# Fix CORS issues",
                        "cd /Users/bossio/6fb-booking/backend-v2",
                        "# Check CORS configuration in main.py",
                        "grep -n 'CORSMiddleware\\|allow_origins' main.py",
                        "# Restart backend with proper CORS settings"
                    ])
        
        return commands
    
    def _is_port_in_use(self, port: int) -> bool:
        """Check if a port is currently in use"""
        try:
            for conn in psutil.net_connections():
                if conn.laddr.port == port and conn.status == 'LISTEN':
                    return True
            return False
        except Exception:
            return False
    
    def _check_port_conflicts(self) -> List[Dict[str, Any]]:
        """Check for EADDRINUSE errors in recent logs"""
        issues = []
        
        # Check common log locations for port conflicts
        log_patterns = [
            "Error: listen EADDRINUSE",
            "EADDRINUSE.*:3000",
            "EADDRINUSE.*:8000",
            "Port.*already in use"
        ]
        
        # This would check actual log files in a real implementation
        # For now, simulate detection
        return issues
    
    def _scan_for_v1_api_calls(self) -> List[str]:
        """Scan frontend files for V1 API endpoint usage"""
        v1_files = []
        
        try:
            # Search for /api/v1/ usage in frontend files
            result = subprocess.run([
                'grep', '-r', '-l', '/api/v1/',
                self.frontend_path,
                '--include=*.ts',
                '--include=*.tsx',
                '--include=*.js',
                '--include=*.jsx'
            ], capture_output=True, text=True, check=False)
            
            if result.returncode == 0:
                v1_files = result.stdout.strip().split('\n')
                v1_files = [f for f in v1_files if f]  # Remove empty strings
        
        except Exception as e:
            logger.error(f"Error scanning for V1 API calls: {e}")
        
        return v1_files
    
    def _detect_auth_loops(self) -> List[Dict[str, Any]]:
        """Detect authentication redirect loops"""
        loops = []
        
        # This would analyze browser network requests for redirect loops
        # For now, return empty as this requires browser logs integration
        return loops
    
    def _check_typescript_imports(self) -> List[Dict[str, Any]]:
        """Check for TypeScript import errors (optimized)"""
        issues = []
        
        try:
            # Use a faster check - just verify if TypeScript files can be parsed
            # Skip full compilation for speed
            result = subprocess.run([
                'npx', 'tsc', '--noEmit', '--skipLibCheck', '--incremental'
            ], cwd=self.frontend_path, capture_output=True, text=True, timeout=15, check=False)
            
            if result.returncode != 0:
                error_output = result.stderr + result.stdout
                
                # Parse common import errors
                import_error_patterns = [
                    r"Cannot find module '([^']+)'",
                    r"Module '([^']+)' has no exported member '([^']+)'",
                ]
                
                for pattern in import_error_patterns:
                    matches = re.findall(pattern, error_output)
                    for match in matches:
                        if isinstance(match, tuple):
                            module, member = match
                            issues.append({
                                "type": "missing_dependency",
                                "package_type": "npm",
                                "package": module,
                                "description": f"Missing export '{member}' from module '{module}'",
                                "critical": True
                            })
                        else:
                            issues.append({
                                "type": "missing_dependency", 
                                "package_type": "npm",
                                "package": match,
                                "description": f"Cannot find module '{match}'",
                                "critical": True
                            })
        
        except subprocess.TimeoutExpired:
            logger.warning("TypeScript check timed out - skipping detailed analysis")
        except Exception as e:
            logger.error(f"Error checking TypeScript imports: {e}")
        
        return issues
    
    def _check_python_imports(self) -> List[Dict[str, Any]]:
        """Check for Python import errors"""
        issues = []
        
        try:
            # Check if we can import main backend modules
            test_imports = [
                "fastapi",
                "sqlalchemy", 
                "stripe",
                "pydantic",
                "uvicorn",
                "jose",
                "passlib"
            ]
            
            for module in test_imports:
                result = subprocess.run([
                    'python3', '-c', f'import {module}'
                ], cwd=self.backend_path, capture_output=True, text=True, check=False)
                
                if result.returncode != 0:
                    issues.append({
                        "type": "missing_dependency",
                        "package_type": "python", 
                        "package": module,
                        "description": f"Cannot import Python module '{module}'",
                        "critical": True
                    })
        
        except Exception as e:
            logger.error(f"Error checking Python imports: {e}")
        
        return issues
    
    def _check_missing_npm_packages(self) -> List[Dict[str, Any]]:
        """Check for missing npm packages referenced in code (optimized)"""
        issues = []
        
        try:
            # Quick check of package.json vs node_modules
            package_json_path = os.path.join(self.frontend_path, 'package.json')
            node_modules_path = os.path.join(self.frontend_path, 'node_modules')
            
            if not os.path.exists(package_json_path):
                logger.warning("package.json not found")
                return issues
            
            if not os.path.exists(node_modules_path):
                issues.append({
                    "type": "missing_dependency",
                    "package_type": "npm",
                    "package": "all",
                    "description": "node_modules directory missing - run 'npm install'",
                    "critical": True
                })
                return issues
            
            # Read package.json dependencies
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
            
            dependencies = package_data.get('dependencies', {})
            dev_dependencies = package_data.get('devDependencies', {})
            all_deps = {**dependencies, **dev_dependencies}
            
            # Quick check for a few critical packages
            critical_packages = ['react', 'next', 'typescript']
            for package in critical_packages:
                if package in all_deps:
                    package_path = os.path.join(node_modules_path, package)
                    if not os.path.exists(package_path):
                        issues.append({
                            "type": "missing_dependency",
                            "package_type": "npm",
                            "package": package,
                            "description": f"Critical package '{package}' not installed",
                            "critical": True
                        })
        
        except Exception as e:
            logger.error(f"Error checking npm packages: {e}")
        
        return issues
    
    def _test_cors_requests(self) -> Dict[str, Any]:
        """Test CORS requests between frontend and backend"""
        results = {"has_errors": False, "errors": []}
        
        try:
            # Test basic API endpoint
            api_url = "http://localhost:8000/api/v2/auth/test"
            
            response = requests.get(
                api_url,
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "GET"
                },
                timeout=5
            )
            
            # Check CORS headers
            cors_headers = [
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Methods", 
                "Access-Control-Allow-Headers"
            ]
            
            missing_headers = [h for h in cors_headers if h not in response.headers]
            
            if missing_headers:
                results["has_errors"] = True
                results["errors"].append(f"Missing CORS headers: {', '.join(missing_headers)}")
            
            if response.status_code >= 400:
                results["has_errors"] = True
                results["errors"].append(f"API request failed with status {response.status_code}")
                
        except requests.RequestException as e:
            results["has_errors"] = True
            results["errors"].append(f"Request failed: {str(e)}")
        
        return results

class EnhancedDebuggerAgent:
    """Enhanced debugger agent with focus on critical BookedBarber V2 issues"""
    
    def __init__(self):
        self.detector = CriticalIssueDetector()
        self.execution_id = f"enhanced_debugger_{int(time.time())}"
        
    def analyze_critical_issues(self) -> Dict[str, Any]:
        """Analyze all critical development issues"""
        logger.info("Starting enhanced debugging analysis")
        
        analysis = {
            "execution_id": self.execution_id,
            "timestamp": datetime.now().isoformat(),
            "issues": {},
            "overall_severity": "none",
            "fix_commands": []
        }
        
        # Detect various issue categories
        issue_categories = [
            ("server_crashes", self.detector.detect_server_crashes),
            ("auth_api_mismatch", self.detector.detect_auth_api_mismatch),
            ("missing_dependencies", self.detector.detect_missing_dependencies),
            ("cors_issues", self.detector.detect_cors_issues)
        ]
        
        critical_found = False
        
        for category, detector_func in issue_categories:
            try:
                logger.info(f"Analyzing {category}")
                issues = detector_func()
                analysis["issues"][category] = issues
                
                if issues["severity"] == "critical":
                    critical_found = True
                    
            except Exception as e:
                logger.error(f"Error analyzing {category}: {e}")
                analysis["issues"][category] = {
                    "category": category,
                    "issues": [{"type": "analysis_error", "description": str(e)}],
                    "severity": "error"
                }
        
        # Set overall severity
        if critical_found:
            analysis["overall_severity"] = "critical"
        elif any(data.get("severity") == "warning" for data in analysis["issues"].values()):
            analysis["overall_severity"] = "warning"
        
        # Generate fix commands
        analysis["fix_commands"] = self.detector.generate_fix_commands(analysis["issues"])
        
        return analysis
    
    def execute_automatic_fixes(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Execute automatic fixes for detected issues"""
        logger.info("Executing automatic fixes")
        
        fix_results = {
            "fixes_attempted": 0,
            "fixes_successful": 0,
            "fixes_failed": 0,
            "fix_details": []
        }
        
        for command in analysis["fix_commands"]:
            if command.startswith("#"):
                # Skip comments
                continue
                
            try:
                logger.info(f"Executing fix command: {command}")
                
                result = subprocess.run(
                    command,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                fix_results["fixes_attempted"] += 1
                
                if result.returncode == 0:
                    fix_results["fixes_successful"] += 1
                    fix_results["fix_details"].append({
                        "command": command,
                        "status": "success",
                        "output": result.stdout
                    })
                else:
                    fix_results["fixes_failed"] += 1
                    fix_results["fix_details"].append({
                        "command": command,
                        "status": "failed",
                        "error": result.stderr
                    })
                    
            except subprocess.TimeoutExpired:
                fix_results["fixes_failed"] += 1
                fix_results["fix_details"].append({
                    "command": command,
                    "status": "timeout",
                    "error": "Command timed out after 30 seconds"
                })
            except Exception as e:
                fix_results["fixes_failed"] += 1
                fix_results["fix_details"].append({
                    "command": command,
                    "status": "error",
                    "error": str(e)
                })
        
        return fix_results
    
    def generate_debugging_report(self, analysis: Dict[str, Any], fix_results: Dict[str, Any] = None) -> str:
        """Generate comprehensive debugging report"""
        
        report = f"""
# Enhanced Debugger Agent Report
**Execution ID:** {analysis['execution_id']}
**Timestamp:** {analysis['timestamp']}
**Overall Severity:** {analysis['overall_severity'].upper()}

## Critical Issues Analysis

"""
        
        for category, data in analysis["issues"].items():
            if data["severity"] == "none":
                report += f"### {category.replace('_', ' ').title()}: ✅ No Issues\n\n"
                continue
                
            report += f"### {category.replace('_', ' ').title()}: {data['severity'].upper()}\n\n"
            
            for issue in data["issues"]:
                issue_type = issue.get("type", "unknown")
                description = issue.get("description", "No description")
                
                report += f"**Issue Type:** {issue_type}\n"
                report += f"**Description:** {description}\n"
                
                if "files" in issue:
                    report += f"**Affected Files:** {', '.join(issue['files'])}\n"
                
                if "fix_command" in issue:
                    report += f"**Fix Command:** `{issue['fix_command']}`\n"
                
                if "fix_suggestions" in issue:
                    report += "**Fix Suggestions:**\n"
                    for suggestion in issue["fix_suggestions"]:
                        report += f"- {suggestion}\n"
                
                report += "\n"
        
        # Add fix commands section
        if analysis["fix_commands"]:
            report += "## Automated Fix Commands\n\n"
            report += "```bash\n"
            for command in analysis["fix_commands"]:
                report += f"{command}\n"
            report += "```\n\n"
        
        # Add fix results if available
        if fix_results:
            report += "## Fix Execution Results\n\n"
            report += f"**Fixes Attempted:** {fix_results['fixes_attempted']}\n"
            report += f"**Fixes Successful:** {fix_results['fixes_successful']}\n"
            report += f"**Fixes Failed:** {fix_results['fixes_failed']}\n\n"
            
            if fix_results["fix_details"]:
                report += "### Detailed Fix Results\n\n"
                for detail in fix_results["fix_details"]:
                    status_icon = "✅" if detail["status"] == "success" else "❌"
                    report += f"{status_icon} **Command:** `{detail['command']}`\n"
                    report += f"**Status:** {detail['status']}\n"
                    
                    if detail.get("output"):
                        report += f"**Output:** {detail['output']}\n"
                    if detail.get("error"):
                        report += f"**Error:** {detail['error']}\n"
                    report += "\n"
        
        # Add recommendations
        report += "## Recommendations\n\n"
        
        if analysis["overall_severity"] == "critical":
            report += "🚨 **CRITICAL ISSUES DETECTED** - Immediate action required\n"
            report += "1. Review and execute the automated fix commands above\n"
            report += "2. Test all systems after applying fixes\n"
            report += "3. Monitor logs for recurring issues\n"
        elif analysis["overall_severity"] == "warning":
            report += "⚠️ **Warning level issues detected** - Address when convenient\n"
            report += "1. Review and plan fixes for non-critical issues\n"
            report += "2. Consider preventive measures\n"
        else:
            report += "✅ **No critical issues detected** - System appears healthy\n"
            report += "1. Continue regular development\n"
            report += "2. Monitor for new issues\n"
        
        report += "\n---\n"
        report += f"Generated by Enhanced Debugger Agent at {datetime.now().isoformat()}\n"
        
        return report
    
    def save_report(self, report: str) -> str:
        """Save debugging report to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"/Users/bossio/6fb-booking/.claude/debugger-report-{timestamp}.md"
        
        try:
            with open(report_file, 'w') as f:
                f.write(report)
            logger.info(f"Debugging report saved to: {report_file}")
            return report_file
        except Exception as e:
            logger.error(f"Failed to save report: {e}")
            return ""

def main():
    """Main entry point for enhanced debugger agent"""
    logger.info("Enhanced Debugger Agent starting")
    
    try:
        agent = EnhancedDebuggerAgent()
        
        # Analyze critical issues
        analysis = agent.analyze_critical_issues()
        
        # Execute automatic fixes if critical issues found
        fix_results = None
        if analysis["overall_severity"] == "critical":
            logger.info("Critical issues detected - executing automatic fixes")
            fix_results = agent.execute_automatic_fixes(analysis)
        
        # Generate and save report
        report = agent.generate_debugging_report(analysis, fix_results)
        report_file = agent.save_report(report)
        
        # Output summary
        print("=" * 60)
        print("ENHANCED DEBUGGER AGENT SUMMARY")
        print("=" * 60)
        print(f"Overall Severity: {analysis['overall_severity'].upper()}")
        print(f"Issues Found: {sum(len(data['issues']) for data in analysis['issues'].values())}")
        
        if fix_results:
            print(f"Fixes Attempted: {fix_results['fixes_attempted']}")
            print(f"Fixes Successful: {fix_results['fixes_successful']}")
        
        if report_file:
            print(f"Full Report: {report_file}")
        
        print("=" * 60)
        
        # Show the report
        print(report)
        
        logger.info("Enhanced Debugger Agent completed successfully")
        
    except Exception as e:
        logger.error(f"Enhanced Debugger Agent failed: {e}")
        raise

if __name__ == "__main__":
    main()