#!/usr/bin/env python3
"""
BookedBarber V2 Code Reviewer Agent

Comprehensive automated code review agent that focuses on:
- Six Figure Barber methodology alignment
- Enterprise-grade code quality standards
- V2 API endpoint compliance
- Security best practices for barbershop business data
- Performance optimization for appointment booking systems
- FastAPI and Next.js best practices

Author: Claude Code
Version: 1.0.0
Last Updated: 2025-07-26
"""

import os
import sys
import json
import re
import subprocess
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import ast
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/bossio/6fb-booking/.claude/code-reviewer-agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('code-reviewer-agent')

@dataclass
class CodeReviewIssue:
    """Data class for code review issues"""
    category: str  # critical, warning, suggestion
    type: str  # security, performance, maintainability, six_figure_barber, etc.
    severity: str  # high, medium, low
    file_path: str
    line_number: Optional[int]
    title: str
    description: str
    recommendation: str
    six_figure_barber_aligned: bool = True

@dataclass
class CodeReviewResult:
    """Data class for complete code review results"""
    trigger_event: str
    files_analyzed: List[str]
    total_issues: int
    critical_issues: int
    warning_issues: int
    suggestion_issues: int
    issues: List[CodeReviewIssue]
    overall_score: int  # 0-100
    six_figure_barber_score: int  # 0-100
    security_score: int  # 0-100
    performance_score: int  # 0-100
    maintainability_score: int  # 0-100
    summary: str
    recommendations: List[str]
    timestamp: str

class BookedBarberCodeReviewer:
    """Main code reviewer class for BookedBarber V2"""
    
    def __init__(self):
        self.project_root = Path("/Users/bossio/6fb-booking")
        self.backend_v2_path = self.project_root / "backend-v2"
        self.frontend_v2_path = self.backend_v2_path / "frontend-v2"
        
        # Six Figure Barber methodology principles
        self.six_figure_barber_principles = [
            "revenue_optimization",
            "client_value_creation", 
            "business_efficiency",
            "professional_growth",
            "scalability"
        ]
        
        # Security patterns for barbershop business
        self.security_patterns = {
            "authentication": ["jwt", "oauth", "session", "token", "password"],
            "payments": ["stripe", "commission", "payout", "billing", "financial"],
            "user_data": ["client", "barber", "appointment", "booking", "personal"],
            "api_security": ["validation", "rate_limit", "cors", "csrf", "injection"]
        }
        
        # Performance critical areas for booking systems
        self.performance_critical_areas = [
            "appointment_booking",
            "calendar_operations", 
            "payment_processing",
            "search_filtering",
            "real_time_notifications",
            "analytics_queries"
        ]

    def analyze_changed_files(self, trigger_data: Dict[str, Any]) -> List[str]:
        """Get list of changed files from trigger data or git"""
        changed_files = []
        
        # Prioritize files from trigger data
        if 'files_changed' in trigger_data and trigger_data['files_changed']:
            changed_files = trigger_data['files_changed']
            logger.info(f"Using files from trigger data: {changed_files}")
        else:
            # Fallback to git diff
            try:
                result = subprocess.run(
                    ["git", "diff", "--name-only", "HEAD~1"],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    changed_files = [
                        f for f in result.stdout.strip().split('\n') 
                        if f and (f.endswith(('.py', '.ts', '.tsx', '.js', '.jsx')))
                    ]
                    logger.info(f"Using files from git diff: {changed_files}")
            except Exception as e:
                logger.warning(f"Could not get git diff: {e}")
        
        # Filter to only include V2 system files and ensure files exist
        v2_files = []
        for file_path in changed_files:
            full_path = self.project_root / file_path
            if full_path.exists() and (self.backend_v2_path in full_path.parents or 
                full_path.is_relative_to(self.backend_v2_path)):
                v2_files.append(file_path)
        
        return v2_files

    def analyze_python_file(self, file_path: str) -> List[CodeReviewIssue]:
        """Analyze Python file for code quality issues"""
        issues = []
        full_path = self.project_root / file_path
        
        if not full_path.exists():
            return issues
            
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Parse AST for deeper analysis
            try:
                tree = ast.parse(content)
                issues.extend(self._analyze_python_ast(tree, file_path))
            except SyntaxError as e:
                issues.append(CodeReviewIssue(
                    category="critical",
                    type="syntax",
                    severity="high",
                    file_path=file_path,
                    line_number=e.lineno,
                    title="Syntax Error",
                    description=f"Python syntax error: {e.msg}",
                    recommendation="Fix syntax error to ensure code compiles correctly",
                    six_figure_barber_aligned=False
                ))
            
            # Check for security issues
            issues.extend(self._check_python_security(content, file_path))
            
            # Check for performance issues
            issues.extend(self._check_python_performance(content, file_path))
            
            # Check for FastAPI best practices
            if "fastapi" in content.lower() or "api/v2" in file_path:
                issues.extend(self._check_fastapi_best_practices(content, file_path))
            
            # Check for Six Figure Barber methodology alignment
            issues.extend(self._check_six_figure_barber_alignment(content, file_path))
            
        except Exception as e:
            logger.error(f"Error analyzing Python file {file_path}: {e}")
            
        return issues

    def analyze_typescript_file(self, file_path: str) -> List[CodeReviewIssue]:
        """Analyze TypeScript/JavaScript file for code quality issues"""
        issues = []
        full_path = self.project_root / file_path
        
        if not full_path.exists():
            return issues
            
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for TypeScript strict mode compliance
            issues.extend(self._check_typescript_compliance(content, file_path))
            
            # Check for React/Next.js best practices
            if any(ext in file_path for ext in ['.tsx', '.jsx']):
                issues.extend(self._check_react_best_practices(content, file_path))
            
            # Check for security issues
            issues.extend(self._check_frontend_security(content, file_path))
            
            # Check for performance issues
            issues.extend(self._check_frontend_performance(content, file_path))
            
            # Check for accessibility issues
            issues.extend(self._check_accessibility(content, file_path))
            
        except Exception as e:
            logger.error(f"Error analyzing TypeScript file {file_path}: {e}")
            
        return issues

    def _analyze_python_ast(self, tree: ast.AST, file_path: str) -> List[CodeReviewIssue]:
        """Analyze Python AST for code quality issues"""
        issues = []
        
        class CodeAnalyzer(ast.NodeVisitor):
            def __init__(self):
                self.issues = []
                self.function_complexity = {}
                self.imports = []
                
            def visit_FunctionDef(self, node):
                # Check function complexity
                complexity = self._calculate_complexity(node)
                if complexity > 10:
                    self.issues.append(CodeReviewIssue(
                        category="warning",
                        type="maintainability",
                        severity="medium",
                        file_path=file_path,
                        line_number=node.lineno,
                        title="High Function Complexity",
                        description=f"Function '{node.name}' has complexity of {complexity}",
                        recommendation="Consider breaking down this function into smaller, more manageable pieces",
                        six_figure_barber_aligned=False
                    ))
                
                # Check for missing docstrings in public methods
                if not ast.get_docstring(node) and not node.name.startswith('_'):
                    self.issues.append(CodeReviewIssue(
                        category="suggestion",
                        type="documentation",
                        severity="low",
                        file_path=file_path,
                        line_number=node.lineno,
                        title="Missing Docstring",
                        description=f"Public function '{node.name}' lacks documentation",
                        recommendation="Add docstring explaining the function's purpose, parameters, and return value"
                    ))
                
                self.generic_visit(node)
                
            def visit_Import(self, node):
                for alias in node.names:
                    self.imports.append(alias.name)
                self.generic_visit(node)
                
            def visit_ImportFrom(self, node):
                if node.module:
                    self.imports.append(node.module)
                self.generic_visit(node)
                
            def _calculate_complexity(self, node):
                """Calculate cyclomatic complexity"""
                complexity = 1
                for child in ast.walk(node):
                    if isinstance(child, (ast.If, ast.While, ast.For, ast.Try, ast.With)):
                        complexity += 1
                    elif isinstance(child, ast.BoolOp):
                        complexity += len(child.values) - 1
                    elif isinstance(child, (ast.ExceptHandler, ast.comprehension)):
                        complexity += 1
                return complexity
        
        analyzer = CodeAnalyzer()
        analyzer.visit(tree)
        return analyzer.issues

    def _check_python_security(self, content: str, file_path: str) -> List[CodeReviewIssue]:
        """Check for Python security issues"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            # Check for hardcoded secrets
            if re.search(r'(password|secret|key|token)\s*=\s*["\'][^"\']+["\']', line, re.IGNORECASE):
                issues.append(CodeReviewIssue(
                    category="critical",
                    type="security",
                    severity="high",
                    file_path=file_path,
                    line_number=i,
                    title="Hardcoded Secret",
                    description="Potential hardcoded secret or sensitive data",
                    recommendation="Move sensitive data to environment variables or secure configuration",
                    six_figure_barber_aligned=False
                ))
            
            # Check for SQL injection vulnerabilities
            if (re.search(r'(execute|query)\s*\(\s*[^?].*\+.*\)', line) or
                re.search(r'(SELECT|INSERT|UPDATE|DELETE).*\+.*str\(', line) or
                re.search(r'(SELECT|INSERT|UPDATE|DELETE).*\+.*format\(', line) or
                re.search(r'(SELECT|INSERT|UPDATE|DELETE).*\+.*\{', line)):
                issues.append(CodeReviewIssue(
                    category="critical",
                    type="security",
                    severity="high",
                    file_path=file_path,
                    line_number=i,
                    title="Potential SQL Injection",
                    description="String concatenation in SQL query detected",
                    recommendation="Use parameterized queries or ORM methods to prevent SQL injection",
                    six_figure_barber_aligned=False
                ))
            
            # Check for unsafe eval usage
            if 'eval(' in line or 'exec(' in line:
                issues.append(CodeReviewIssue(
                    category="critical",
                    type="security",
                    severity="high",
                    file_path=file_path,
                    line_number=i,
                    title="Unsafe Code Execution",
                    description="Use of eval() or exec() detected",
                    recommendation="Avoid dynamic code execution; use safer alternatives",
                    six_figure_barber_aligned=False
                ))
        
        return issues

    def _check_python_performance(self, content: str, file_path: str) -> List[CodeReviewIssue]:
        """Check for Python performance issues"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            # Check for inefficient database queries
            if re.search(r'\.all\(\).*for.*in', line):
                issues.append(CodeReviewIssue(
                    category="warning",
                    type="performance",
                    severity="medium",
                    file_path=file_path,
                    line_number=i,
                    title="Potential N+1 Query",
                    description="Loading all records then iterating may cause performance issues",
                    recommendation="Consider using database-level filtering, pagination, or eager loading"
                ))
            
            # Check for inefficient string operations
            if '+=' in line and 'str' in line.lower():
                issues.append(CodeReviewIssue(
                    category="suggestion",
                    type="performance",
                    severity="low",
                    file_path=file_path,
                    line_number=i,
                    title="Inefficient String Concatenation",
                    description="String concatenation with += can be inefficient for large strings",
                    recommendation="Consider using join() for multiple string concatenations"
                ))
        
        return issues

    def _check_fastapi_best_practices(self, content: str, file_path: str) -> List[CodeReviewIssue]:
        """Check for FastAPI best practices specific to BookedBarber V2"""
        issues = []
        lines = content.split('\n')
        
        # Check for V2 API compliance
        if ('/api/v1/' in content or 
            'fetch(\'/api/v1/' in content or
            'axios.get(\'/api/v1/' in content or
            'post(\'/api/v1/' in content):
            issues.append(CodeReviewIssue(
                category="critical",
                type="api_compliance",
                severity="high",
                file_path=file_path,
                line_number=None,
                title="V1 API Usage Detected",
                description="Code is using deprecated V1 API endpoints",
                recommendation="Migrate to V2 API endpoints (/api/v2/) as V1 is completely deprecated",
                six_figure_barber_aligned=False
            ))
        
        for i, line in enumerate(lines, 1):
            # Check for missing response models
            if '@router.' in line and 'response_model=' not in line and 'get(' in line:
                issues.append(CodeReviewIssue(
                    category="warning",
                    type="api_design",
                    severity="medium",
                    file_path=file_path,
                    line_number=i,
                    title="Missing Response Model",
                    description="API endpoint lacks explicit response model",
                    recommendation="Add response_model parameter for better API documentation and validation"
                ))
            
            # Check for missing input validation
            if 'async def' in line and 'Depends(' not in line and ('post(' in line or 'put(' in line):
                issues.append(CodeReviewIssue(
                    category="warning",
                    type="security",
                    severity="medium",
                    file_path=file_path,
                    line_number=i,
                    title="Missing Input Validation",
                    description="POST/PUT endpoint may lack proper input validation",
                    recommendation="Add Depends() for validation and security checks"
                ))
        
        return issues

    def _check_six_figure_barber_alignment(self, content: str, file_path: str) -> List[CodeReviewIssue]:
        """Check if code aligns with Six Figure Barber methodology"""
        issues = []
        
        # Check for revenue optimization features
        revenue_keywords = ['commission', 'payout', 'pricing', 'upsell', 'revenue', 'profit']
        if any(keyword in content.lower() for keyword in revenue_keywords):
            if 'optimization' not in content.lower() and 'calculate' not in content.lower():
                issues.append(CodeReviewIssue(
                    category="suggestion",
                    type="six_figure_barber",
                    severity="medium",
                    file_path=file_path,
                    line_number=None,
                    title="Revenue Optimization Opportunity",
                    description="Code handles revenue-related functionality but may lack optimization",
                    recommendation="Consider adding revenue optimization logic aligned with Six Figure Barber principles"
                ))
        
        # Check for client value creation features
        client_keywords = ['client', 'customer', 'experience', 'satisfaction', 'feedback']
        if any(keyword in content.lower() for keyword in client_keywords):
            if 'value' not in content.lower() and 'enhance' not in content.lower():
                issues.append(CodeReviewIssue(
                    category="suggestion",
                    type="six_figure_barber",
                    severity="low",
                    file_path=file_path,
                    line_number=None,
                    title="Client Value Enhancement Opportunity",
                    description="Code handles client functionality but may miss value creation opportunities",
                    recommendation="Consider adding features that enhance client experience and perceived value"
                ))
        
        return issues

    def _check_typescript_compliance(self, content: str, file_path: str) -> List[CodeReviewIssue]:
        """Check TypeScript strict mode compliance"""
        issues = []
        
        # Check for 'any' type usage
        any_count = len(re.findall(r':\s*any\b', content))
        if any_count > 0:
            issues.append(CodeReviewIssue(
                category="warning",
                type="type_safety",
                severity="medium",
                file_path=file_path,
                line_number=None,
                title="Excessive 'any' Type Usage",
                description=f"Found {any_count} instances of 'any' type",
                recommendation="Replace 'any' with specific types for better type safety"
            ))
        
        # Check for missing type annotations on function parameters
        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            if re.search(r'function\s+\w+\s*\([^)]*[^:)]\)', line):
                issues.append(CodeReviewIssue(
                    category="suggestion",
                    type="type_safety",
                    severity="low",
                    file_path=file_path,
                    line_number=i,
                    title="Missing Type Annotations",
                    description="Function parameters lack type annotations",
                    recommendation="Add type annotations to function parameters for better type safety"
                ))
        
        return issues

    def _check_react_best_practices(self, content: str, file_path: str) -> List[CodeReviewIssue]:
        """Check React/Next.js best practices"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            # Check for missing key props in lists
            if ('map(' in line and 'key=' not in line and ('<' in line or 'React.createElement' in line)) or \
               ('{' in line and 'map(' in line and 'key=' not in line and ('div' in line or 'span' in line or 'li' in line)):
                issues.append(CodeReviewIssue(
                    category="warning",
                    type="react_performance",
                    severity="medium",
                    file_path=file_path,
                    line_number=i,
                    title="Missing Key Prop",
                    description="React element in map() lacks unique key prop",
                    recommendation="Add unique key prop to improve React rendering performance"
                ))
            
            # Check for inline object/function definitions in JSX
            if re.search(r'(onClick|onChange|onSubmit)=\{.*=>.*\}', line):
                issues.append(CodeReviewIssue(
                    category="suggestion",
                    type="react_performance",
                    severity="low",
                    file_path=file_path,
                    line_number=i,
                    title="Inline Function in JSX",
                    description="Inline function definition may cause unnecessary re-renders",
                    recommendation="Consider using useCallback or defining function outside JSX"
                ))
        
        return issues

    def _check_frontend_security(self, content: str, file_path: str) -> List[CodeReviewIssue]:
        """Check for frontend security issues"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            # Check for dangerouslySetInnerHTML usage
            if 'dangerouslySetInnerHTML' in line:
                issues.append(CodeReviewIssue(
                    category="critical",
                    type="security",
                    severity="high",
                    file_path=file_path,
                    line_number=i,
                    title="XSS Vulnerability Risk",
                    description="Use of dangerouslySetInnerHTML detected",
                    recommendation="Sanitize HTML content or use safer alternatives to prevent XSS attacks",
                    six_figure_barber_aligned=False
                ))
            
            # Check for localStorage usage with sensitive data
            if 'localStorage.setItem' in line and any(keyword in line.lower() for keyword in ['token', 'password', 'secret']):
                issues.append(CodeReviewIssue(
                    category="warning",
                    type="security",
                    severity="medium",
                    file_path=file_path,
                    line_number=i,
                    title="Sensitive Data in localStorage",
                    description="Storing sensitive data in localStorage",
                    recommendation="Consider using secure, httpOnly cookies for sensitive data storage"
                ))
        
        return issues

    def _check_frontend_performance(self, content: str, file_path: str) -> List[CodeReviewIssue]:
        """Check for frontend performance issues"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            # Check for missing useMemo for expensive calculations
            if re.search(r'(sort|filter|map).*\(.*\).*\(.*\)', line) and 'useMemo' not in content:
                issues.append(CodeReviewIssue(
                    category="suggestion",
                    type="performance",
                    severity="low",
                    file_path=file_path,
                    line_number=i,
                    title="Expensive Operation Without Memoization",
                    description="Complex array operation detected without memoization",
                    recommendation="Consider using useMemo for expensive calculations to improve performance"
                ))
            
            # Check for large bundle imports
            if re.search(r'import.*from.*["\']lodash["\']', line):
                issues.append(CodeReviewIssue(
                    category="warning",
                    type="performance",
                    severity="medium",
                    file_path=file_path,
                    line_number=i,
                    title="Large Bundle Import",
                    description="Importing entire lodash library",
                    recommendation="Import specific functions instead: import { debounce } from 'lodash/debounce'"
                ))
        
        return issues

    def _check_accessibility(self, content: str, file_path: str) -> List[CodeReviewIssue]:
        """Check for accessibility issues"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            # Check for missing alt attributes on images
            if '<img' in line and 'alt=' not in line:
                issues.append(CodeReviewIssue(
                    category="warning",
                    type="accessibility",
                    severity="medium",
                    file_path=file_path,
                    line_number=i,
                    title="Missing Alt Attribute",
                    description="Image element lacks alt attribute",
                    recommendation="Add descriptive alt attribute for screen readers"
                ))
            
            # Check for missing labels on form inputs
            if '<input' in line and 'aria-label=' not in line and 'id=' not in line:
                issues.append(CodeReviewIssue(
                    category="warning",
                    type="accessibility",
                    severity="medium",
                    file_path=file_path,
                    line_number=i,
                    title="Missing Input Label",
                    description="Form input lacks proper labeling",
                    recommendation="Add aria-label or associate with a label element"
                ))
        
        return issues

    def calculate_scores(self, issues: List[CodeReviewIssue]) -> Dict[str, int]:
        """Calculate various quality scores"""
        total_issues = len(issues)
        critical_count = len([i for i in issues if i.category == "critical"])
        warning_count = len([i for i in issues if i.category == "warning"])
        
        # Overall score (100 = perfect, 0 = terrible)
        if total_issues == 0:
            overall_score = 100
        else:
            # Deduct points based on issue severity
            deductions = (critical_count * 25) + (warning_count * 10) + ((total_issues - critical_count - warning_count) * 5)
            overall_score = max(0, 100 - deductions)
        
        # Six Figure Barber methodology score
        six_figure_issues = [i for i in issues if not i.six_figure_barber_aligned]
        six_figure_score = max(0, 100 - len(six_figure_issues) * 15)
        
        # Security score
        security_issues = [i for i in issues if i.type == "security"]
        security_score = max(0, 100 - len(security_issues) * 20)
        
        # Performance score
        performance_issues = [i for i in issues if i.type == "performance"]
        performance_score = max(0, 100 - len(performance_issues) * 15)
        
        # Maintainability score
        maintainability_issues = [i for i in issues if i.type in ["maintainability", "documentation", "type_safety"]]
        maintainability_score = max(0, 100 - len(maintainability_issues) * 10)
        
        return {
            "overall": overall_score,
            "six_figure_barber": six_figure_score,
            "security": security_score,
            "performance": performance_score,
            "maintainability": maintainability_score
        }

    def generate_summary_and_recommendations(self, issues: List[CodeReviewIssue], scores: Dict[str, int]) -> Tuple[str, List[str]]:
        """Generate summary and actionable recommendations"""
        critical_count = len([i for i in issues if i.category == "critical"])
        warning_count = len([i for i in issues if i.category == "warning"])
        suggestion_count = len([i for i in issues if i.category == "suggestion"])
        
        summary = f"""Code Review Summary:
- Found {len(issues)} total issues ({critical_count} critical, {warning_count} warnings, {suggestion_count} suggestions)
- Overall Quality Score: {scores['overall']}/100
- Six Figure Barber Alignment: {scores['six_figure_barber']}/100
- Security Score: {scores['security']}/100
- Performance Score: {scores['performance']}/100
- Maintainability Score: {scores['maintainability']}/100"""
        
        recommendations = []
        
        if critical_count > 0:
            recommendations.append("🚨 CRITICAL: Address all critical issues before deployment")
        
        if scores['security'] < 80:
            recommendations.append("🔒 SECURITY: Review and fix security vulnerabilities immediately")
        
        if scores['six_figure_barber'] < 70:
            recommendations.append("💰 BUSINESS: Align code better with Six Figure Barber methodology for revenue optimization")
        
        if scores['performance'] < 75:
            recommendations.append("⚡ PERFORMANCE: Optimize code for better appointment booking system performance")
        
        if warning_count > 5:
            recommendations.append("⚠️ CODE QUALITY: Address warnings to improve code maintainability")
        
        return summary, recommendations

    def run_review(self, trigger_data: Dict[str, Any]) -> CodeReviewResult:
        """Run complete code review process"""
        logger.info(f"Starting code review for trigger: {trigger_data.get('trigger_name', 'unknown')}")
        
        start_time = time.time()
        
        # Get changed files
        changed_files = self.analyze_changed_files(trigger_data)
        logger.info(f"Analyzing {len(changed_files)} changed files: {changed_files}")
        
        all_issues = []
        
        # Analyze each file
        for file_path in changed_files:
            try:
                if file_path.endswith('.py'):
                    issues = self.analyze_python_file(file_path)
                elif file_path.endswith(('.ts', '.tsx', '.js', '.jsx')):
                    issues = self.analyze_typescript_file(file_path)
                else:
                    continue
                
                all_issues.extend(issues)
                logger.info(f"Found {len(issues)} issues in {file_path}")
                
            except Exception as e:
                logger.error(f"Error analyzing {file_path}: {e}")
        
        # Calculate scores
        scores = self.calculate_scores(all_issues)
        
        # Generate summary and recommendations
        summary, recommendations = self.generate_summary_and_recommendations(all_issues, scores)
        
        # Create result
        result = CodeReviewResult(
            trigger_event=trigger_data.get('trigger_name', 'unknown'),
            files_analyzed=changed_files,
            total_issues=len(all_issues),
            critical_issues=len([i for i in all_issues if i.category == "critical"]),
            warning_issues=len([i for i in all_issues if i.category == "warning"]),
            suggestion_issues=len([i for i in all_issues if i.category == "suggestion"]),
            issues=all_issues,
            overall_score=scores['overall'],
            six_figure_barber_score=scores['six_figure_barber'],
            security_score=scores['security'],
            performance_score=scores['performance'],
            maintainability_score=scores['maintainability'],
            summary=summary,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
        
        execution_time = time.time() - start_time
        logger.info(f"Code review completed in {execution_time:.2f} seconds")
        
        return result

    def save_review_report(self, result: CodeReviewResult) -> str:
        """Save detailed review report to file"""
        report_dir = Path("/Users/bossio/6fb-booking/.claude/logs")
        report_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = report_dir / f"code_review_{timestamp}.json"
        
        # Save as JSON for programmatic access
        with open(report_file, 'w') as f:
            json.dump(asdict(result), f, indent=2, default=str)
        
        # Create human-readable markdown report
        md_report_file = report_dir / f"code_review_{timestamp}.md"
        self._create_markdown_report(result, md_report_file)
        
        logger.info(f"Review report saved to {report_file} and {md_report_file}")
        return str(md_report_file)

    def _create_markdown_report(self, result: CodeReviewResult, report_file: Path):
        """Create human-readable markdown report"""
        with open(report_file, 'w') as f:
            f.write(f"""# BookedBarber V2 Code Review Report

**Trigger Event:** {result.trigger_event}  
**Timestamp:** {result.timestamp}  
**Files Analyzed:** {len(result.files_analyzed)}

## Quality Scores

| Metric | Score | Status |
|--------|-------|--------|
| Overall Quality | {result.overall_score}/100 | {'✅ Good' if result.overall_score >= 80 else '⚠️ Needs Improvement' if result.overall_score >= 60 else '🚨 Critical'} |
| Six Figure Barber Alignment | {result.six_figure_barber_score}/100 | {'✅ Aligned' if result.six_figure_barber_score >= 80 else '⚠️ Partially Aligned' if result.six_figure_barber_score >= 60 else '🚨 Not Aligned'} |
| Security | {result.security_score}/100 | {'✅ Secure' if result.security_score >= 80 else '⚠️ Some Issues' if result.security_score >= 60 else '🚨 Vulnerable'} |
| Performance | {result.performance_score}/100 | {'✅ Optimized' if result.performance_score >= 80 else '⚠️ Some Issues' if result.performance_score >= 60 else '🚨 Poor'} |
| Maintainability | {result.maintainability_score}/100 | {'✅ Maintainable' if result.maintainability_score >= 80 else '⚠️ Some Issues' if result.maintainability_score >= 60 else '🚨 Hard to Maintain'} |

## Issues Summary

- **🚨 Critical Issues:** {result.critical_issues}
- **⚠️ Warning Issues:** {result.warning_issues}
- **💡 Suggestion Issues:** {result.suggestion_issues}
- **📊 Total Issues:** {result.total_issues}

## Key Recommendations

""")
            
            for rec in result.recommendations:
                f.write(f"- {rec}\n")
            
            f.write("\n## Detailed Issues\n\n")
            
            # Group issues by category
            critical_issues = [i for i in result.issues if i.category == "critical"]
            warning_issues = [i for i in result.issues if i.category == "warning"]
            suggestion_issues = [i for i in result.issues if i.category == "suggestion"]
            
            if critical_issues:
                f.write("### 🚨 Critical Issues\n\n")
                for issue in critical_issues:
                    f.write(f"**{issue.title}** ({issue.type})\n")
                    f.write(f"- **File:** `{issue.file_path}`\n")
                    if issue.line_number:
                        f.write(f"- **Line:** {issue.line_number}\n")
                    f.write(f"- **Description:** {issue.description}\n")
                    f.write(f"- **Recommendation:** {issue.recommendation}\n")
                    f.write(f"- **Six Figure Barber Aligned:** {'✅' if issue.six_figure_barber_aligned else '❌'}\n\n")
            
            if warning_issues:
                f.write("### ⚠️ Warning Issues\n\n")
                for issue in warning_issues:
                    f.write(f"**{issue.title}** ({issue.type})\n")
                    f.write(f"- **File:** `{issue.file_path}`\n")
                    if issue.line_number:
                        f.write(f"- **Line:** {issue.line_number}\n")
                    f.write(f"- **Description:** {issue.description}\n")
                    f.write(f"- **Recommendation:** {issue.recommendation}\n\n")
            
            if suggestion_issues:
                f.write("### 💡 Suggestions\n\n")
                for issue in suggestion_issues:
                    f.write(f"**{issue.title}** ({issue.type})\n")
                    f.write(f"- **File:** `{issue.file_path}`\n")
                    if issue.line_number:
                        f.write(f"- **Line:** {issue.line_number}\n")
                    f.write(f"- **Description:** {issue.description}\n")
                    f.write(f"- **Recommendation:** {issue.recommendation}\n\n")
            
            f.write(f"\n## Files Analyzed\n\n")
            for file_path in result.files_analyzed:
                f.write(f"- `{file_path}`\n")
            
            f.write(f"\n---\n*Generated by BookedBarber V2 Code Reviewer Agent*\n")

def main():
    """Main entry point for the code reviewer agent"""
    if len(sys.argv) < 2:
        logger.error("Usage: code-reviewer-agent.py <trigger_data_json>")
        sys.exit(1)
    
    try:
        # Parse trigger data
        trigger_data = json.loads(sys.argv[1])
        
        # Create reviewer instance
        reviewer = BookedBarberCodeReviewer()
        
        # Run review
        result = reviewer.run_review(trigger_data)
        
        # Save report
        report_file = reviewer.save_review_report(result)
        
        # Print summary for Claude
        print(f"\n=== BookedBarber V2 Code Review Complete ===")
        print(f"Trigger: {result.trigger_event}")
        print(f"Files Analyzed: {len(result.files_analyzed)}")
        print(f"Issues Found: {result.total_issues} ({result.critical_issues} critical)")
        print(f"Overall Score: {result.overall_score}/100")
        print(f"Six Figure Barber Alignment: {result.six_figure_barber_score}/100")
        print(f"Security Score: {result.security_score}/100")
        print(f"Report: {report_file}")
        
        if result.critical_issues > 0:
            print("\n🚨 CRITICAL ISSUES FOUND - Review immediately before deployment!")
            
        if result.recommendations:
            print("\nKey Recommendations:")
            for rec in result.recommendations:
                print(f"  {rec}")
        
        # Exit with error code if critical issues found
        sys.exit(1 if result.critical_issues > 0 else 0)
        
    except Exception as e:
        logger.error(f"Code review failed: {e}")
        print(f"\n=== Code Review Failed ===")
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()