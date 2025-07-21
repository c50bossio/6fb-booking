#!/usr/bin/env python3
"""
Test Coverage Analysis Script for 6FB Booking V2
===============================================

This script analyzes the current test coverage and identifies critical
untested code that needs immediate attention to reach the 80%+ coverage target.

Usage:
    python scripts/analyze-test-coverage.py
    python scripts/analyze-test-coverage.py --detailed
    python scripts/analyze-test-coverage.py --fix-plan
"""

import os
import sys
import json
import subprocess
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class CoverageItem:
    """Represents a code coverage item"""
    file_path: str
    line_number: int
    function_name: str
    coverage_percentage: float
    priority: str  # 'critical', 'high', 'medium', 'low'
    category: str  # 'auth', 'payment', 'booking', 'api', 'service', 'model'

@dataclass
class TestGap:
    """Represents a gap in test coverage"""
    module: str
    missing_tests: List[str]
    priority: str
    estimated_hours: int
    dependencies: List[str]

class CoverageAnalyzer:
    """Analyzes test coverage and generates remediation plans"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.backend_path = self.project_root / "backend-v2"
        self.critical_modules = {
            'auth', 'payment', 'booking', 'appointment', 'user', 'stripe',
            'calendar', 'notification', 'sms', 'email', 'webhook'
        }
        self.coverage_data = None
        self.gaps = []
        
    def run_coverage_analysis(self) -> Dict:
        """Run pytest with coverage and return results"""
        print("🔍 Running coverage analysis...")
        
        os.chdir(self.backend_path)
        
        try:
            # Run pytest with coverage in JSON format
            cmd = [
                "python", "-m", "pytest", 
                "--cov=.", 
                "--cov-report=json",
                "--cov-report=term-missing",
                "--tb=no",
                "-q"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # Load JSON coverage report
            coverage_file = self.backend_path / "coverage.json"
            if coverage_file.exists():
                with open(coverage_file, 'r') as f:
                    self.coverage_data = json.load(f)
                    
                print(f"✅ Coverage analysis complete")
                return self.coverage_data
            else:
                print("❌ Coverage file not generated")
                return {}
                
        except Exception as e:
            print(f"❌ Error running coverage: {e}")
            return {}
    
    def identify_critical_gaps(self) -> List[CoverageItem]:
        """Identify critical code that needs testing"""
        if not self.coverage_data:
            return []
            
        critical_items = []
        files = self.coverage_data.get('files', {})
        
        for file_path, file_data in files.items():
            # Skip test files and __init__.py files
            if 'test' in file_path or '__init__.py' in file_path:
                continue
                
            coverage_pct = file_data.get('summary', {}).get('percent_covered', 0)
            missing_lines = file_data.get('missing_lines', [])
            
            # Determine priority based on module and coverage
            priority = self._determine_priority(file_path, coverage_pct)
            category = self._categorize_file(file_path)
            
            if priority in ['critical', 'high'] or coverage_pct < 50:
                critical_items.append(CoverageItem(
                    file_path=file_path,
                    line_number=len(missing_lines),
                    function_name=self._get_main_functions(file_path),
                    coverage_percentage=coverage_pct,
                    priority=priority,
                    category=category
                ))
        
        # Sort by priority and coverage percentage
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        critical_items.sort(key=lambda x: (priority_order[x.priority], x.coverage_percentage))
        
        return critical_items
    
    def _determine_priority(self, file_path: str, coverage_pct: float) -> str:
        """Determine priority based on file path and coverage"""
        file_lower = file_path.lower()
        
        # Critical modules with any missing coverage
        if any(module in file_lower for module in self.critical_modules):
            if coverage_pct < 95:
                return 'critical'
            else:
                return 'high'
        
        # API endpoints and routers
        if 'router' in file_lower or 'api' in file_lower:
            if coverage_pct < 80:
                return 'high'
            else:
                return 'medium'
        
        # Services and models
        if 'service' in file_lower or 'model' in file_lower:
            if coverage_pct < 70:
                return 'high'
            else:
                return 'medium'
        
        # Everything else
        if coverage_pct < 50:
            return 'high'
        elif coverage_pct < 70:
            return 'medium'
        else:
            return 'low'
    
    def _categorize_file(self, file_path: str) -> str:
        """Categorize file by its purpose"""
        file_lower = file_path.lower()
        
        if any(auth in file_lower for auth in ['auth', 'login', 'token', 'jwt']):
            return 'auth'
        elif any(pay in file_lower for pay in ['payment', 'stripe', 'billing']):
            return 'payment'
        elif any(book in file_lower for book in ['booking', 'appointment', 'schedule']):
            return 'booking'
        elif any(api in file_lower for api in ['router', 'endpoint', 'api']):
            return 'api'
        elif 'service' in file_lower:
            return 'service'
        elif 'model' in file_lower:
            return 'model'
        else:
            return 'other'
    
    def _get_main_functions(self, file_path: str) -> str:
        """Extract main function names from a file"""
        try:
            full_path = self.backend_path / file_path
            if full_path.exists():
                with open(full_path, 'r') as f:
                    content = f.read()
                    
                # Simple regex to find function definitions
                import re
                functions = re.findall(r'def (\w+)', content)
                if functions:
                    return ', '.join(functions[:3])  # First 3 functions
                    
        except Exception:
            pass
            
        return "unknown"
    
    def generate_test_gaps(self) -> List[TestGap]:
        """Generate a list of test gaps that need to be filled"""
        critical_items = self.identify_critical_gaps()
        gaps = []
        
        # Group by category for better organization
        by_category = {}
        for item in critical_items:
            if item.category not in by_category:
                by_category[item.category] = []
            by_category[item.category].append(item)
        
        for category, items in by_category.items():
            missing_tests = []
            total_priority = 0
            
            for item in items:
                missing_tests.append(f"{item.file_path} ({item.coverage_percentage:.1f}% covered)")
                total_priority += {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}[item.priority]
            
            # Estimate hours based on number of files and complexity
            estimated_hours = len(items) * 2  # 2 hours per file average
            if category in ['auth', 'payment', 'booking']:
                estimated_hours *= 1.5  # More complex modules
                
            # Determine dependencies
            dependencies = self._get_dependencies(category)
            
            # Determine overall priority
            avg_priority = total_priority / len(items)
            if avg_priority >= 3.5:
                priority = 'critical'
            elif avg_priority >= 2.5:
                priority = 'high'
            elif avg_priority >= 1.5:
                priority = 'medium'
            else:
                priority = 'low'
            
            gaps.append(TestGap(
                module=category,
                missing_tests=missing_tests,
                priority=priority,
                estimated_hours=int(estimated_hours),
                dependencies=dependencies
            ))
        
        return gaps
    
    def _get_dependencies(self, category: str) -> List[str]:
        """Get dependencies for a test category"""
        dependencies = {
            'auth': ['database', 'jwt_tokens', 'password_hashing'],
            'payment': ['stripe_test_keys', 'webhook_endpoints', 'database'],
            'booking': ['database', 'calendar_api', 'auth'],
            'api': ['auth', 'database'],
            'service': ['database', 'external_apis'],
            'model': ['database']
        }
        return dependencies.get(category, ['database'])
    
    def generate_remediation_plan(self) -> str:
        """Generate a detailed remediation plan"""
        self.gaps = self.generate_test_gaps()
        
        plan = f"""
# Test Coverage Remediation Plan
## Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 📊 Current Coverage Summary
"""
        
        if self.coverage_data:
            summary = self.coverage_data.get('totals', {})
            plan += f"""
- **Total Lines**: {summary.get('num_statements', 'N/A')}
- **Covered Lines**: {summary.get('covered_lines', 'N/A')}
- **Missing Lines**: {summary.get('missing_lines', 'N/A')}
- **Current Coverage**: {summary.get('percent_covered', 0):.1f}%
- **Target Coverage**: 80%+ (95%+ for critical paths)
- **Gap to Close**: {max(0, 80 - summary.get('percent_covered', 0)):.1f} percentage points

"""
        
        plan += """## 🎯 Remediation Strategy

### Phase 1: Critical Path Testing (Week 1)
Focus on authentication, payment, and booking modules that are essential for platform functionality.

### Phase 2: API and Service Testing (Week 2)  
Complete testing for all API endpoints and service layer components.

### Phase 3: Model and Integration Testing (Week 3)
Add comprehensive model tests and integration tests for complete workflows.

## 📋 Detailed Remediation Tasks

"""
        
        # Sort gaps by priority
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        self.gaps.sort(key=lambda x: priority_order[x.priority])
        
        total_hours = 0
        for i, gap in enumerate(self.gaps, 1):
            total_hours += gap.estimated_hours
            
            plan += f"""### {i}. {gap.module.upper()} Module - {gap.priority.upper()} Priority

**Estimated Time**: {gap.estimated_hours} hours
**Dependencies**: {', '.join(gap.dependencies)}

**Files Needing Tests**:
"""
            for test in gap.missing_tests:
                plan += f"- {test}\n"
            
            plan += f"""
**Recommended Approach**:
- Start with unit tests for core functions
- Add integration tests for API endpoints
- Include edge case and error handling tests
- Ensure 95%+ coverage for critical paths

"""
        
        plan += f"""
## ⏱️ Timeline Summary

**Total Estimated Time**: {total_hours} hours ({total_hours // 8} working days)
**Recommended Schedule**: 
- Week 1: Critical modules ({sum(g.estimated_hours for g in self.gaps if g.priority == 'critical')} hours)
- Week 2: High priority modules ({sum(g.estimated_hours for g in self.gaps if g.priority == 'high')} hours)
- Week 3: Medium priority modules ({sum(g.estimated_hours for g in self.gaps if g.priority == 'medium')} hours)

## 🔧 Implementation Commands

### Setup Test Environment
```bash
cd backend-v2
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pytest-cov pytest-mock pytest-asyncio
```

### Run Coverage Analysis
```bash
python -m pytest --cov=. --cov-report=html --cov-report=term-missing
```

### Fix Broken Tests First
```bash
# Fix syntax errors in test files
python -m py_compile auth_debug_test.py
python -m py_compile test_calendar_view.py
# Continue for all broken test files
```

### Create Tests Using Templates
```bash
# Use the testing templates created earlier:
cp testing-templates/backend_test_template.py tests/unit/test_new_module.py
# Customize for specific module
```

## 📈 Success Metrics

- [ ] Overall coverage reaches 80%+
- [ ] Critical path coverage reaches 95%+
- [ ] All existing broken tests fixed
- [ ] Zero test failures or errors
- [ ] All linting passes
- [ ] Browser logs clean during testing

## 🔄 Continuous Monitoring

After implementation:
1. Set up automated coverage reporting
2. Add coverage checks to CI/CD pipeline
3. Create coverage badges for documentation
4. Schedule weekly coverage reviews

---

*This remediation plan is automatically generated based on current coverage analysis.*
*Update by running: `python scripts/analyze-test-coverage.py --fix-plan`*
"""
        
        return plan
    
    def print_summary(self):
        """Print a summary of the coverage analysis"""
        if not self.coverage_data:
            print("❌ No coverage data available. Run coverage analysis first.")
            return
            
        print("\n🎯 TEST COVERAGE ANALYSIS SUMMARY")
        print("=" * 50)
        
        # Overall coverage
        summary = self.coverage_data.get('totals', {})
        current_coverage = summary.get('percent_covered', 0)
        print(f"Current Coverage: {current_coverage:.1f}%")
        print(f"Target Coverage: 80%+")
        print(f"Gap to Target: {max(0, 80 - current_coverage):.1f} percentage points")
        
        # Critical gaps
        critical_items = self.identify_critical_gaps()
        print(f"\nCritical Files Needing Tests: {len(critical_items)}")
        
        # By category
        by_category = {}
        for item in critical_items:
            if item.category not in by_category:
                by_category[item.category] = []
            by_category[item.category].append(item)
        
        print("\n📊 Coverage by Category:")
        for category, items in by_category.items():
            avg_coverage = sum(item.coverage_percentage for item in items) / len(items)
            print(f"  {category.capitalize()}: {avg_coverage:.1f}% avg ({len(items)} files)")
        
        # Test gaps
        gaps = self.generate_test_gaps()
        total_hours = sum(gap.estimated_hours for gap in gaps)
        print(f"\n⏱️ Estimated Remediation Time: {total_hours} hours ({total_hours // 8} days)")
        
        print(f"\n📋 Next Steps:")
        print("1. Run: python scripts/analyze-test-coverage.py --fix-plan")
        print("2. Review generated remediation plan")
        print("3. Start with critical priority modules")
        print("4. Fix broken tests first")

def main():
    parser = argparse.ArgumentParser(description='Analyze test coverage and generate remediation plan')
    parser.add_argument('--detailed', action='store_true', help='Show detailed coverage information')
    parser.add_argument('--fix-plan', action='store_true', help='Generate detailed remediation plan')
    parser.add_argument('--json', action='store_true', help='Output results in JSON format')
    
    args = parser.parse_args()
    
    analyzer = CoverageAnalyzer()
    
    # Run coverage analysis
    coverage_data = analyzer.run_coverage_analysis()
    
    if not coverage_data:
        print("❌ Failed to generate coverage data")
        sys.exit(1)
    
    if args.json:
        # Output JSON for programmatic use
        gaps = analyzer.generate_test_gaps()
        output = {
            'timestamp': datetime.now().isoformat(),
            'coverage_summary': coverage_data.get('totals', {}),
            'test_gaps': [gap.__dict__ for gap in gaps],
            'critical_items': [item.__dict__ for item in analyzer.identify_critical_gaps()]
        }
        print(json.dumps(output, indent=2))
        
    elif args.fix_plan:
        # Generate and save remediation plan
        plan = analyzer.generate_remediation_plan()
        plan_file = Path(__file__).parent.parent / "TEST_COVERAGE_REMEDIATION_PLAN.md"
        
        with open(plan_file, 'w') as f:
            f.write(plan)
        
        print(f"📋 Remediation plan generated: {plan_file}")
        print("\nTo implement the plan:")
        print("1. Review the generated plan")
        print("2. Start with critical priority modules")  
        print("3. Use testing templates from testing-templates/")
        print("4. Run coverage checks frequently")
        
    else:
        # Print summary
        analyzer.print_summary()
        
        if args.detailed:
            critical_items = analyzer.identify_critical_gaps()
            print(f"\n📁 Critical Files Needing Tests:")
            for item in critical_items[:10]:  # Show first 10
                print(f"  {item.file_path} ({item.coverage_percentage:.1f}% - {item.priority})")

if __name__ == "__main__":
    main()