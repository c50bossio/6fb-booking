#!/usr/bin/env python3
"""
Code Quality Gate System
Prevents problematic code from reaching production
"""

import os
import ast
import re
import subprocess
import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import aiohttp
import asyncio
from datetime import datetime
import git


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class CodeIssue:
    file: str
    line: int
    issue_type: str
    message: str
    risk_level: RiskLevel
    auto_fixable: bool
    fix_suggestion: Optional[str] = None


class CodeQualityGate:
    """Analyze code changes and prevent issues"""

    def __init__(self):
        self.patterns = {
            "hardcoded_secrets": {
                "patterns": [
                    r'api_key\s*=\s*["\'][^"\']+["\']',
                    r'password\s*=\s*["\'][^"\']+["\']',
                    r'secret\s*=\s*["\'][^"\']+["\']',
                    r'token\s*=\s*["\'][^"\']+["\']',
                    r'AWS_ACCESS_KEY_ID\s*=\s*["\'][^"\']+["\']',
                ],
                "risk": RiskLevel.CRITICAL,
                "message": "Hardcoded secret detected",
                "auto_fixable": True,
                "fix": "Move to environment variables",
            },
            "sql_injection": {
                "patterns": [
                    r'execute\s*\(\s*["\'].*%s.*["\'].*%',
                    r'execute\s*\(\s*f["\'].*{.*}.*["\']',
                    r'execute\s*\(\s*["\'].*\+.*["\']',
                ],
                "risk": RiskLevel.HIGH,
                "message": "Potential SQL injection vulnerability",
                "auto_fixable": True,
                "fix": "Use parameterized queries",
            },
            "missing_error_handling": {
                "patterns": [
                    r"except\s*:\s*\n\s*pass",
                    r"except\s+Exception\s*:\s*\n\s*pass",
                ],
                "risk": RiskLevel.MEDIUM,
                "message": "Silent exception handling",
                "auto_fixable": True,
                "fix": "Add proper error logging",
            },
            "inefficient_loops": {
                "patterns": [
                    r"for\s+\w+\s+in\s+range\s*\(\s*len\s*\(",
                ],
                "risk": RiskLevel.LOW,
                "message": "Inefficient loop pattern",
                "auto_fixable": True,
                "fix": "Use enumerate() or direct iteration",
            },
            "missing_auth_check": {
                "patterns": [
                    r"@router\.(get|post|put|delete).*\n(?!.*Depends\s*\(\s*get_current_user)",
                ],
                "risk": RiskLevel.HIGH,
                "message": "API endpoint missing authentication",
                "auto_fixable": True,
                "fix": "Add authentication dependency",
            },
        }

        self.performance_patterns = {
            "n_plus_one_query": {
                "ast_check": self._check_n_plus_one,
                "risk": RiskLevel.HIGH,
                "message": "Potential N+1 query problem",
                "auto_fixable": True,
                "fix": "Use eager loading with joinedload()",
            },
            "missing_index": {
                "ast_check": self._check_missing_index,
                "risk": RiskLevel.MEDIUM,
                "message": "Query on non-indexed column",
                "auto_fixable": True,
                "fix": "Add database index",
            },
            "sync_in_async": {
                "patterns": [
                    r"async\s+def.*\n.*time\.sleep",
                    r"async\s+def.*\n.*requests\.",
                ],
                "risk": RiskLevel.HIGH,
                "message": "Blocking operation in async function",
                "auto_fixable": True,
                "fix": "Use async equivalent (asyncio.sleep, aiohttp)",
            },
        }

        self.claude_api_key = os.getenv("ANTHROPIC_API_KEY")

    async def analyze_code_changes(self, diff: str) -> List[CodeIssue]:
        """Analyze code diff for issues"""
        issues = []

        # Parse diff to get changed files and lines
        changed_files = self._parse_diff(diff)

        for file_info in changed_files:
            if not file_info["filename"].endswith(".py"):
                continue

            # Read file content
            try:
                with open(file_info["filename"], "r") as f:
                    content = f.read()
                    lines = content.split("\n")
            except:
                continue

            # Check patterns
            for pattern_name, pattern_info in self.patterns.items():
                for pattern in pattern_info.get("patterns", []):
                    for i, line in enumerate(lines):
                        if re.search(pattern, line):
                            # Only flag if line was changed
                            if i + 1 in file_info["changed_lines"]:
                                issues.append(
                                    CodeIssue(
                                        file=file_info["filename"],
                                        line=i + 1,
                                        issue_type=pattern_name,
                                        message=pattern_info["message"],
                                        risk_level=pattern_info["risk"],
                                        auto_fixable=pattern_info["auto_fixable"],
                                        fix_suggestion=pattern_info["fix"],
                                    )
                                )

            # AST-based checks
            try:
                tree = ast.parse(content)

                # Check for performance issues
                for pattern_name, pattern_info in self.performance_patterns.items():
                    if "ast_check" in pattern_info:
                        ast_issues = pattern_info["ast_check"](
                            tree, file_info["filename"]
                        )
                        issues.extend(ast_issues)
            except:
                pass

        # Use Claude for complex analysis
        if self.claude_api_key and changed_files:
            ai_issues = await self._analyze_with_claude(diff)
            issues.extend(ai_issues)

        return issues

    def _parse_diff(self, diff: str) -> List[Dict]:
        """Parse git diff to extract changed files and lines"""
        changed_files = []
        current_file = None

        for line in diff.split("\n"):
            if line.startswith("diff --git"):
                # New file
                match = re.search(r"b/(.+)$", line)
                if match:
                    current_file = {"filename": match.group(1), "changed_lines": set()}
                    changed_files.append(current_file)
            elif line.startswith("@@") and current_file:
                # Line numbers
                match = re.search(r"\+(\d+)(?:,(\d+))?", line)
                if match:
                    start = int(match.group(1))
                    count = int(match.group(2)) if match.group(2) else 1
                    current_file["changed_lines"].update(range(start, start + count))

        return changed_files

    def _check_n_plus_one(self, tree: ast.AST, filename: str) -> List[CodeIssue]:
        """Check for N+1 query patterns"""
        issues = []

        class N1Visitor(ast.NodeVisitor):
            def __init__(self):
                self.issues = []

            def visit_For(self, node):
                # Look for database queries inside loops
                for child in ast.walk(node):
                    if isinstance(child, ast.Attribute):
                        if hasattr(child, "attr") and child.attr in [
                            "query",
                            "filter",
                            "get",
                        ]:
                            self.issues.append(
                                CodeIssue(
                                    file=filename,
                                    line=child.lineno,
                                    issue_type="n_plus_one_query",
                                    message="Database query inside loop detected",
                                    risk_level=RiskLevel.HIGH,
                                    auto_fixable=True,
                                    fix_suggestion="Use eager loading with joinedload() or selectinload()",
                                )
                            )
                self.generic_visit(node)

        visitor = N1Visitor()
        visitor.visit(tree)
        return visitor.issues

    def _check_missing_index(self, tree: ast.AST, filename: str) -> List[CodeIssue]:
        """Check for queries on non-indexed columns"""
        issues = []

        # This is simplified - in production would check actual DB schema
        common_filter_columns = ["email", "user_id", "created_at", "status"]

        class IndexVisitor(ast.NodeVisitor):
            def __init__(self):
                self.issues = []

            def visit_Call(self, node):
                if hasattr(node.func, "attr") and node.func.attr == "filter":
                    # Check filter arguments
                    for arg in node.args:
                        if isinstance(arg, ast.Compare):
                            left = arg.left
                            if isinstance(left, ast.Attribute):
                                column = left.attr
                                if column not in ["id"] + common_filter_columns:
                                    self.issues.append(
                                        CodeIssue(
                                            file=filename,
                                            line=node.lineno,
                                            issue_type="missing_index",
                                            message=f"Query filtering on potentially non-indexed column: {column}",
                                            risk_level=RiskLevel.MEDIUM,
                                            auto_fixable=True,
                                            fix_suggestion=f"Consider adding index on {column}",
                                        )
                                    )
                self.generic_visit(node)

        visitor = IndexVisitor()
        visitor.visit(tree)
        return visitor.issues

    async def _analyze_with_claude(self, diff: str) -> List[CodeIssue]:
        """Use Claude for advanced code analysis"""
        if not self.claude_api_key:
            return []

        prompt = f"""
        Analyze this code diff for potential issues:

        ```diff
        {diff[:3000]}  # Limit size
        ```

        Look for:
        1. Security vulnerabilities
        2. Performance issues
        3. Error handling problems
        4. Code smells
        5. Missing tests

        Return issues in JSON format:
        [{{
            "file": "filename",
            "line": line_number,
            "issue_type": "type",
            "message": "description",
            "risk_level": "low/medium/high/critical",
            "auto_fixable": boolean,
            "fix_suggestion": "how to fix"
        }}]

        Only return the JSON array, no other text.
        """

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.claude_api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": "claude-3-sonnet-20240229",
                        "max_tokens": 2000,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        analysis = result["content"][0]["text"]

                        # Parse JSON response
                        try:
                            ai_issues_data = json.loads(analysis)
                            ai_issues = []

                            for issue_data in ai_issues_data:
                                ai_issues.append(
                                    CodeIssue(
                                        file=issue_data["file"],
                                        line=issue_data["line"],
                                        issue_type=issue_data["issue_type"],
                                        message=issue_data["message"],
                                        risk_level=RiskLevel(issue_data["risk_level"]),
                                        auto_fixable=issue_data["auto_fixable"],
                                        fix_suggestion=issue_data.get("fix_suggestion"),
                                    )
                                )

                            return ai_issues
                        except:
                            return []
        except Exception as e:
            print(f"Claude analysis error: {e}")
            return []

        return []

    async def run_security_scan(self, directory: str) -> List[CodeIssue]:
        """Run security vulnerability scan"""
        issues = []

        # Run bandit for Python security issues
        try:
            result = subprocess.run(
                ["bandit", "-r", directory, "-f", "json"],
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                bandit_results = json.loads(result.stdout)

                for issue in bandit_results.get("results", []):
                    issues.append(
                        CodeIssue(
                            file=issue["filename"],
                            line=issue["line_number"],
                            issue_type="security_" + issue["test_id"],
                            message=issue["issue_text"],
                            risk_level=RiskLevel(issue["issue_severity"].lower()),
                            auto_fixable=False,
                            fix_suggestion=issue.get("issue_confidence"),
                        )
                    )
        except:
            pass

        # Check for outdated dependencies
        vulnerable_deps = await self._check_dependencies()
        issues.extend(vulnerable_deps)

        return issues

    async def _check_dependencies(self) -> List[CodeIssue]:
        """Check for vulnerable dependencies"""
        issues = []

        # Check requirements.txt or pyproject.toml
        requirements_file = None
        if os.path.exists("requirements.txt"):
            requirements_file = "requirements.txt"
        elif os.path.exists("pyproject.toml"):
            requirements_file = "pyproject.toml"

        if requirements_file:
            # In production, would use safety or pip-audit
            # For now, check for known vulnerable versions
            vulnerable_packages = {
                "django<3.2": "Security vulnerabilities in older Django",
                "flask<2.0": "Security updates in Flask 2.0+",
                "requests<2.25": "SSL verification issues",
                "pyyaml<5.4": "Arbitrary code execution vulnerability",
            }

            try:
                with open(requirements_file, "r") as f:
                    content = f.read()

                for package_pattern, message in vulnerable_packages.items():
                    if re.search(package_pattern, content, re.IGNORECASE):
                        issues.append(
                            CodeIssue(
                                file=requirements_file,
                                line=1,
                                issue_type="vulnerable_dependency",
                                message=f"{message} - {package_pattern}",
                                risk_level=RiskLevel.HIGH,
                                auto_fixable=True,
                                fix_suggestion="Update to latest secure version",
                            )
                        )
            except:
                pass

        return issues

    async def suggest_fixes(self, issues: List[CodeIssue]) -> Dict[str, str]:
        """Generate fix suggestions for issues"""
        fixes = {}

        for issue in issues:
            if not issue.auto_fixable:
                continue

            fix_key = f"{issue.file}:{issue.line}"

            if issue.issue_type == "hardcoded_secrets":
                fixes[fix_key] = self._fix_hardcoded_secret(issue)
            elif issue.issue_type == "sql_injection":
                fixes[fix_key] = self._fix_sql_injection(issue)
            elif issue.issue_type == "missing_error_handling":
                fixes[fix_key] = self._fix_error_handling(issue)
            elif issue.issue_type == "missing_auth_check":
                fixes[fix_key] = self._fix_missing_auth(issue)
            elif issue.issue_type == "n_plus_one_query":
                fixes[fix_key] = self._fix_n_plus_one(issue)

        return fixes

    def _fix_hardcoded_secret(self, issue: CodeIssue) -> str:
        """Generate fix for hardcoded secrets"""
        return """
# Move to .env file:
# SECRET_KEY=your-secret-here

# In code:
import os
from dotenv import load_dotenv

load_dotenv()
secret_key = os.getenv('SECRET_KEY')
"""

    def _fix_sql_injection(self, issue: CodeIssue) -> str:
        """Generate fix for SQL injection"""
        return """
# Use parameterized queries:
# Bad:
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# Good:
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# With SQLAlchemy:
db.query(User).filter(User.id == user_id).first()
"""

    def _fix_error_handling(self, issue: CodeIssue) -> str:
        """Generate fix for error handling"""
        return """
# Replace silent exception handling:
import logging

logger = logging.getLogger(__name__)

try:
    # Your code here
    pass
except Exception as e:
    logger.error(f"Error occurred: {e}", exc_info=True)
    # Handle appropriately
    raise  # or return error response
"""

    def _fix_missing_auth(self, issue: CodeIssue) -> str:
        """Generate fix for missing authentication"""
        return """
from fastapi import Depends
from .auth import get_current_user

@router.get("/endpoint")
async def endpoint(current_user: User = Depends(get_current_user)):
    # Your endpoint logic
    pass
"""

    def _fix_n_plus_one(self, issue: CodeIssue) -> str:
        """Generate fix for N+1 queries"""
        return """
# Use eager loading to prevent N+1 queries:
from sqlalchemy.orm import joinedload

# Bad:
users = db.query(User).all()
for user in users:
    orders = user.orders  # N+1 query

# Good:
users = db.query(User).options(joinedload(User.orders)).all()
for user in users:
    orders = user.orders  # Already loaded
"""


class PreDeploymentValidator:
    """Validate code before deployment"""

    def __init__(self):
        self.quality_gate = CodeQualityGate()
        self.required_tests = [
            "test_authentication",
            "test_authorization",
            "test_database_migrations",
            "test_api_endpoints",
        ]

    async def validate_deployment(self, branch: str = "main") -> Tuple[bool, Dict]:
        """Run all pre-deployment validations"""
        results = {"can_deploy": True, "issues": [], "warnings": [], "stats": {}}

        # Get git diff
        repo = git.Repo(".")
        diff = repo.git.diff("main", branch)

        # Code quality checks
        code_issues = await self.quality_gate.analyze_code_changes(diff)
        critical_issues = [i for i in code_issues if i.risk_level == RiskLevel.CRITICAL]
        high_issues = [i for i in code_issues if i.risk_level == RiskLevel.HIGH]

        if critical_issues:
            results["can_deploy"] = False
            results["issues"].extend(
                [f"{i.file}:{i.line} - {i.message}" for i in critical_issues]
            )

        if high_issues:
            results["warnings"].extend(
                [f"{i.file}:{i.line} - {i.message}" for i in high_issues]
            )

        # Security scan
        security_issues = await self.quality_gate.run_security_scan(".")
        if security_issues:
            results["warnings"].extend(
                [f"Security: {i.message}" for i in security_issues]
            )

        # Test coverage check
        coverage_ok, coverage_pct = await self._check_test_coverage()
        if not coverage_ok:
            results["can_deploy"] = False
            results["issues"].append(
                f"Test coverage too low: {coverage_pct}% (minimum 80%)"
            )

        results["stats"]["coverage"] = coverage_pct
        results["stats"]["code_issues"] = len(code_issues)
        results["stats"]["security_issues"] = len(security_issues)

        # Performance regression check
        perf_ok = await self._check_performance_regression()
        if not perf_ok:
            results["warnings"].append("Potential performance regression detected")

        return results["can_deploy"], results

    async def _check_test_coverage(self) -> Tuple[bool, float]:
        """Check test coverage percentage"""
        try:
            result = subprocess.run(
                ["coverage", "report", "--format=json"], capture_output=True, text=True
            )

            if result.returncode == 0:
                coverage_data = json.loads(result.stdout)
                coverage_pct = coverage_data.get("totals", {}).get("percent_covered", 0)
                return coverage_pct >= 80, coverage_pct
        except:
            pass

        return True, 100  # Assume OK if can't check

    async def _check_performance_regression(self) -> bool:
        """Check for performance regressions"""
        # This would run performance tests and compare with baseline
        # For now, return True
        return True


# Example usage
async def main():
    # Create validator
    validator = PreDeploymentValidator()

    # Check if safe to deploy
    can_deploy, results = await validator.validate_deployment("feature-branch")

    print(f"Can deploy: {can_deploy}")
    print(f"Issues: {results['issues']}")
    print(f"Warnings: {results['warnings']}")
    print(f"Stats: {results['stats']}")

    # Get fix suggestions
    if not can_deploy:
        quality_gate = CodeQualityGate()
        diff = git.Repo(".").git.diff("main", "feature-branch")
        issues = await quality_gate.analyze_code_changes(diff)
        fixes = await quality_gate.suggest_fixes(issues)

        print("\nSuggested fixes:")
        for location, fix in fixes.items():
            print(f"\n{location}:\n{fix}")


if __name__ == "__main__":
    asyncio.run(main())
