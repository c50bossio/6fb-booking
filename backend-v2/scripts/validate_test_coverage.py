#!/usr/bin/env python3
"""
Test Coverage Validation Script

Ensures test coverage meets minimum requirements across all modules.
Identifies areas lacking test coverage and validates test quality.
"""
import os
import sys
import subprocess
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import argparse
import xml.etree.ElementTree as ET


class TestCoverageValidator:
    """Validates test coverage across the codebase."""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.min_coverage = 80  # Default minimum coverage
        self.critical_modules = [
            'services/',
            'api/',
            'models/',
            'utils/',
            'routers/'
        ]
        
        # Coverage requirements by module type
        self.coverage_requirements = {
            'services/': 90,      # Business logic - high coverage
            'api/': 85,           # API endpoints - high coverage
            'models/': 75,        # Data models - medium coverage
            'utils/': 85,         # Utilities - high coverage
            'routers/': 80,       # FastAPI routers - medium-high
            'middleware/': 75,    # Middleware - medium coverage
            'default': 70         # Default for other modules
        }
    
    def run_coverage_analysis(self) -> Dict:
        """Run pytest with coverage analysis."""
        print("🧪 Running test coverage analysis...")
        
        try:
            # Run pytest with coverage
            cmd = [
                sys.executable, '-m', 'pytest',
                '--cov=.',
                '--cov-report=xml:coverage.xml',
                '--cov-report=json:coverage.json',
                '--cov-report=html:htmlcov/',
                '--cov-report=term-missing',
                '-v'
            ]
            
            result = subprocess.run(
                cmd,
                cwd=self.base_path,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            coverage_data = {
                'exit_code': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'xml_report': self.parse_xml_coverage(),
                'json_report': self.parse_json_coverage(),
                'missing_lines': self.extract_missing_lines(result.stdout)
            }
            
            return coverage_data
            
        except subprocess.TimeoutExpired:
            return {
                'error': 'Test execution timed out',
                'exit_code': -1
            }
        except Exception as e:
            return {
                'error': f'Failed to run coverage analysis: {e}',
                'exit_code': -1
            }
    
    def parse_xml_coverage(self) -> Optional[Dict]:
        """Parse XML coverage report."""
        xml_path = self.base_path / 'coverage.xml'
        if not xml_path.exists():
            return None
        
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
            
            coverage_data = {
                'overall': {},
                'packages': [],
                'classes': []
            }
            
            # Overall coverage
            if 'line-rate' in root.attrib:
                coverage_data['overall'] = {
                    'line_rate': float(root.attrib['line-rate']) * 100,
                    'branch_rate': float(root.attrib.get('branch-rate', 0)) * 100,
                    'lines_covered': int(root.attrib.get('lines-covered', 0)),
                    'lines_valid': int(root.attrib.get('lines-valid', 0))
                }
            
            # Package-level coverage
            for package in root.findall('.//package'):
                package_data = {
                    'name': package.attrib.get('name', ''),
                    'line_rate': float(package.attrib.get('line-rate', 0)) * 100,
                    'branch_rate': float(package.attrib.get('branch-rate', 0)) * 100,
                    'complexity': float(package.attrib.get('complexity', 0))
                }
                coverage_data['packages'].append(package_data)
            
            # Class-level coverage
            for cls in root.findall('.//class'):
                class_data = {
                    'name': cls.attrib.get('name', ''),
                    'filename': cls.attrib.get('filename', ''),
                    'line_rate': float(cls.attrib.get('line-rate', 0)) * 100,
                    'branch_rate': float(cls.attrib.get('branch-rate', 0)) * 100
                }
                coverage_data['classes'].append(class_data)
            
            return coverage_data
            
        except Exception as e:
            print(f"Error parsing XML coverage: {e}")
            return None
    
    def parse_json_coverage(self) -> Optional[Dict]:
        """Parse JSON coverage report."""
        json_path = self.base_path / 'coverage.json'
        if not json_path.exists():
            return None
        
        try:
            with open(json_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error parsing JSON coverage: {e}")
            return None
    
    def extract_missing_lines(self, output: str) -> Dict[str, List[int]]:
        """Extract missing line numbers from coverage output."""
        missing_lines = {}
        
        # Parse coverage output for missing lines
        lines = output.split('\n')
        current_file = None
        
        for line in lines:
            # Look for file coverage lines
            if 'TOTAL' in line:
                break
            
            # Pattern: filename.py    statements  missing  excluded  coverage  missing_lines
            match = re.match(r'^([^.]+\.py)\s+\d+\s+(\d+)\s+\d+\s+\d+%\s+(.+)?$', line.strip())
            if match:
                filename = match.group(1)
                missing_count = int(match.group(2))
                missing_line_ranges = match.group(3) if match.group(3) else ""
                
                if missing_count > 0 and missing_line_ranges:
                    missing_lines[filename] = self.parse_line_ranges(missing_line_ranges)
        
        return missing_lines
    
    def parse_line_ranges(self, ranges_str: str) -> List[int]:
        """Parse line range strings like '10-15, 20, 25-30' into line numbers."""
        lines = []
        
        if not ranges_str or ranges_str == '--':
            return lines
        
        for part in ranges_str.split(','):
            part = part.strip()
            if '-' in part:
                # Range like "10-15"
                start, end = map(int, part.split('-'))
                lines.extend(range(start, end + 1))
            else:
                # Single line
                try:
                    lines.append(int(part))
                except ValueError:
                    continue
        
        return sorted(list(set(lines)))
    
    def analyze_module_coverage(self, coverage_data: Dict) -> Dict:
        """Analyze coverage by module and identify problem areas."""
        analysis = {
            'overall_status': 'PASS',
            'module_analysis': {},
            'critical_issues': [],
            'warnings': [],
            'uncovered_critical_files': [],
            'low_coverage_modules': []
        }
        
        if not coverage_data.get('json_report'):
            analysis['overall_status'] = 'FAIL'
            analysis['critical_issues'].append('No coverage data available')
            return analysis
        
        json_report = coverage_data['json_report']
        files = json_report.get('files', {})
        
        # Analyze each file
        for file_path, file_data in files.items():
            rel_path = str(Path(file_path).relative_to(self.base_path))
            
            # Determine module type and required coverage
            required_coverage = self.get_required_coverage(rel_path)
            
            summary = file_data.get('summary', {})
            coverage_percent = summary.get('percent_covered', 0)
            
            module_info = {
                'file': rel_path,
                'coverage': coverage_percent,
                'required': required_coverage,
                'status': 'PASS' if coverage_percent >= required_coverage else 'FAIL',
                'lines_total': summary.get('num_statements', 0),
                'lines_covered': summary.get('covered_lines', 0),
                'lines_missing': summary.get('missing_lines', 0),
                'excluded_lines': summary.get('excluded_lines', 0)
            }
            
            analysis['module_analysis'][rel_path] = module_info
            
            # Check for critical issues
            if coverage_percent < required_coverage:
                if self.is_critical_module(rel_path):
                    analysis['critical_issues'].append(
                        f"Critical module {rel_path} has {coverage_percent:.1f}% coverage (requires {required_coverage}%)"
                    )
                    analysis['uncovered_critical_files'].append(rel_path)
                else:
                    analysis['warnings'].append(
                        f"Module {rel_path} has {coverage_percent:.1f}% coverage (requires {required_coverage}%)"
                    )
                
                analysis['low_coverage_modules'].append({
                    'file': rel_path,
                    'coverage': coverage_percent,
                    'required': required_coverage,
                    'deficit': required_coverage - coverage_percent
                })
        
        # Determine overall status
        if analysis['critical_issues']:
            analysis['overall_status'] = 'FAIL'
        elif analysis['warnings']:
            analysis['overall_status'] = 'WARN'
        
        return analysis
    
    def get_required_coverage(self, file_path: str) -> int:
        """Get required coverage percentage for a file based on its module."""
        for module_pattern, coverage in self.coverage_requirements.items():
            if module_pattern in file_path:
                return coverage
        return self.coverage_requirements['default']
    
    def is_critical_module(self, file_path: str) -> bool:
        """Check if a file belongs to a critical module."""
        return any(pattern in file_path for pattern in self.critical_modules)
    
    def check_test_quality(self) -> Dict:
        """Analyze test quality and completeness."""
        quality_analysis = {
            'test_files_found': 0,
            'test_functions_found': 0,
            'test_patterns': {
                'unit_tests': 0,
                'integration_tests': 0,
                'edge_case_tests': 0,
                'error_handling_tests': 0
            },
            'missing_test_types': [],
            'recommendations': []
        }
        
        # Find all test files
        test_files = list(self.base_path.rglob('test_*.py')) + list(self.base_path.rglob('*_test.py'))
        quality_analysis['test_files_found'] = len(test_files)
        
        # Analyze test content
        for test_file in test_files:
            try:
                with open(test_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Count test functions
                    test_functions = re.findall(r'def test_\w+', content)
                    quality_analysis['test_functions_found'] += len(test_functions)
                    
                    # Analyze test patterns
                    if 'integration' in str(test_file).lower():
                        quality_analysis['test_patterns']['integration_tests'] += len(test_functions)
                    else:
                        quality_analysis['test_patterns']['unit_tests'] += len(test_functions)
                    
                    # Look for edge case tests
                    edge_case_indicators = ['edge', 'boundary', 'limit', 'invalid', 'empty', 'null']
                    for indicator in edge_case_indicators:
                        if indicator in content.lower():
                            quality_analysis['test_patterns']['edge_case_tests'] += 1
                            break
                    
                    # Look for error handling tests
                    error_indicators = ['exception', 'error', 'raise', 'pytest.raises', 'assertRaises']
                    for indicator in error_indicators:
                        if indicator in content.lower():
                            quality_analysis['test_patterns']['error_handling_tests'] += 1
                            break
            
            except Exception as e:
                continue
        
        # Generate recommendations
        total_tests = quality_analysis['test_functions_found']
        if total_tests < 50:
            quality_analysis['recommendations'].append(
                f"Consider adding more tests (currently {total_tests}, recommended 50+)"
            )
        
        if quality_analysis['test_patterns']['integration_tests'] < 5:
            quality_analysis['recommendations'].append(
                "Add more integration tests to verify component interactions"
            )
        
        if quality_analysis['test_patterns']['error_handling_tests'] < 10:
            quality_analysis['recommendations'].append(
                "Add more error handling and exception tests"
            )
        
        return quality_analysis
    
    def identify_untested_functions(self, coverage_data: Dict) -> List[Dict]:
        """Identify functions that have no test coverage."""
        untested_functions = []
        
        if not coverage_data.get('json_report'):
            return untested_functions
        
        json_report = coverage_data['json_report']
        files = json_report.get('files', {})
        
        for file_path, file_data in files.items():
            rel_path = str(Path(file_path).relative_to(self.base_path))
            
            # Skip test files themselves
            if 'test' in rel_path.lower():
                continue
            
            # Get missing lines
            missing_lines = set(file_data.get('missing_lines', []))
            
            if missing_lines:
                # Try to identify functions on missing lines
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        
                        for line_num in missing_lines:
                            if line_num <= len(lines):
                                line = lines[line_num - 1].strip()
                                
                                # Check if line is a function definition
                                if line.startswith('def ') and not line.startswith('def _'):
                                    func_match = re.match(r'def (\w+)\(', line)
                                    if func_match:
                                        untested_functions.append({
                                            'file': rel_path,
                                            'function': func_match.group(1),
                                            'line': line_num,
                                            'code': line
                                        })
                
                except Exception:
                    continue
        
        return untested_functions
    
    def generate_report(self, coverage_data: Dict, module_analysis: Dict, test_quality: Dict) -> Dict:
        """Generate comprehensive test coverage report."""
        overall_coverage = 0
        if coverage_data.get('json_report'):
            overall_coverage = coverage_data['json_report'].get('totals', {}).get('percent_covered', 0)
        
        untested_functions = self.identify_untested_functions(coverage_data)
        
        # Determine overall status
        status = 'PASS'
        if module_analysis['overall_status'] == 'FAIL' or overall_coverage < self.min_coverage:
            status = 'FAIL'
        elif module_analysis['overall_status'] == 'WARN' or overall_coverage < self.min_coverage + 10:
            status = 'WARN'
        
        return {
            'status': status,
            'overall_coverage': overall_coverage,
            'minimum_required': self.min_coverage,
            'tests_passed': coverage_data.get('exit_code', -1) == 0,
            'module_analysis': module_analysis,
            'test_quality': test_quality,
            'untested_functions': untested_functions[:10],  # Limit for readability
            'summary': {
                'total_files_analyzed': len(module_analysis.get('module_analysis', {})),
                'files_below_threshold': len(module_analysis.get('low_coverage_modules', [])),
                'critical_files_uncovered': len(module_analysis.get('uncovered_critical_files', [])),
                'total_test_functions': test_quality.get('test_functions_found', 0),
                'untested_functions_found': len(untested_functions)
            },
            'recommendations': self.generate_recommendations(module_analysis, test_quality, untested_functions)
        }
    
    def generate_recommendations(self, module_analysis: Dict, test_quality: Dict, untested_functions: List) -> List[str]:
        """Generate actionable recommendations for improving test coverage."""
        recommendations = []
        
        # Coverage-based recommendations
        critical_files = module_analysis.get('uncovered_critical_files', [])
        if critical_files:
            recommendations.append(
                f"🚨 URGENT: Add tests for {len(critical_files)} critical modules: {', '.join(critical_files[:3])}"
            )
        
        low_coverage = module_analysis.get('low_coverage_modules', [])
        if low_coverage:
            # Sort by deficit
            sorted_low = sorted(low_coverage, key=lambda x: x['deficit'], reverse=True)
            recommendations.append(
                f"📈 Improve coverage for {len(sorted_low)} modules, starting with: {sorted_low[0]['file']}"
            )
        
        # Test quality recommendations
        recommendations.extend(test_quality.get('recommendations', []))
        
        # Specific function recommendations
        if untested_functions:
            recommendations.append(
                f"🎯 Add tests for {len(untested_functions)} untested functions, prioritize: {untested_functions[0]['function']}()"
            )
        
        # General recommendations
        if not recommendations:
            recommendations.append("✅ Test coverage meets all requirements!")
        
        return recommendations


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Validate test coverage')
    parser.add_argument('--path', default='.', help='Path to analyze')
    parser.add_argument('--min-coverage', type=int, default=80, help='Minimum coverage percentage')
    parser.add_argument('--output', choices=['json', 'text'], default='text')
    parser.add_argument('--save', help='Save report to file')
    parser.add_argument('--strict', action='store_true', help='Fail on warnings')
    
    args = parser.parse_args()
    
    validator = TestCoverageValidator(args.path)
    validator.min_coverage = args.min_coverage
    
    print(f"🧪 Validating test coverage (minimum: {args.min_coverage}%)")
    
    # Run coverage analysis
    coverage_data = validator.run_coverage_analysis()
    
    if coverage_data.get('error'):
        print(f"❌ Error: {coverage_data['error']}")
        exit(1)
    
    # Analyze coverage by module
    module_analysis = validator.analyze_module_coverage(coverage_data)
    
    # Check test quality
    test_quality = validator.check_test_quality()
    
    # Generate report
    report = validator.generate_report(coverage_data, module_analysis, test_quality)
    
    if args.output == 'json':
        if args.save:
            with open(args.save, 'w') as f:
                json.dump(report, f, indent=2)
        else:
            print(json.dumps(report, indent=2))
    else:
        print_coverage_report(report)
        
        if args.save:
            with open(args.save, 'w') as f:
                f.write(format_coverage_report(report))
    
    # Exit with appropriate code
    if report['status'] == 'FAIL':
        print("\n❌ TEST COVERAGE VALIDATION FAILED")
        exit(1)
    elif report['status'] == 'WARN' and args.strict:
        print("\n⚠️  TEST COVERAGE WARNINGS (strict mode)")
        exit(1)
    else:
        print("\n✅ TEST COVERAGE VALIDATION PASSED")
        exit(0)


def print_coverage_report(report: Dict):
    """Print formatted coverage report."""
    print("\n" + "="*60)
    print("  TEST COVERAGE VALIDATION REPORT")
    print("="*60)
    
    print(f"\nOverall Status: {report['status']}")
    print(f"Overall Coverage: {report['overall_coverage']:.1f}% (required: {report['minimum_required']}%)")
    print(f"Tests Passed: {'✅' if report['tests_passed'] else '❌'}")
    
    summary = report['summary']
    print(f"\nSummary:")
    print(f"  Files analyzed: {summary['total_files_analyzed']}")
    print(f"  Files below threshold: {summary['files_below_threshold']}")
    print(f"  Critical files uncovered: {summary['critical_files_uncovered']}")
    print(f"  Test functions found: {summary['total_test_functions']}")
    print(f"  Untested functions: {summary['untested_functions_found']}")
    
    # Module analysis
    module_analysis = report['module_analysis']
    if module_analysis.get('critical_issues'):
        print(f"\n🚨 CRITICAL ISSUES:")
        for issue in module_analysis['critical_issues'][:5]:
            print(f"  • {issue}")
    
    if module_analysis.get('low_coverage_modules'):
        print(f"\n📊 LOW COVERAGE MODULES (top 5):")
        sorted_modules = sorted(
            module_analysis['low_coverage_modules'], 
            key=lambda x: x['deficit'], 
            reverse=True
        )
        for i, module in enumerate(sorted_modules[:5]):
            print(f"  {i+1}. {module['file']}: {module['coverage']:.1f}% (needs {module['required']}%)")
    
    # Test quality
    test_quality = report['test_quality']
    print(f"\n🧪 TEST QUALITY ANALYSIS:")
    patterns = test_quality['test_patterns']
    print(f"  Unit tests: {patterns['unit_tests']}")
    print(f"  Integration tests: {patterns['integration_tests']}")
    print(f"  Edge case tests: {patterns['edge_case_tests']}")
    print(f"  Error handling tests: {patterns['error_handling_tests']}")
    
    # Untested functions
    if report['untested_functions']:
        print(f"\n🎯 UNTESTED FUNCTIONS (sample):")
        for func in report['untested_functions'][:5]:
            print(f"  • {func['function']}() in {func['file']}:{func['line']}")
    
    # Recommendations
    print(f"\n💡 RECOMMENDATIONS:")
    for rec in report['recommendations']:
        print(f"  • {rec}")
    
    print("\n" + "="*60)


def format_coverage_report(report: Dict) -> str:
    """Format coverage report for file output."""
    lines = []
    lines.append("TEST COVERAGE VALIDATION REPORT")
    lines.append("=" * 60)
    
    lines.append(f"Status: {report['status']}")
    lines.append(f"Overall Coverage: {report['overall_coverage']:.1f}%")
    lines.append(f"Required: {report['minimum_required']}%")
    
    lines.append("\nRecommendations:")
    for rec in report['recommendations']:
        lines.append(f"• {rec}")
    
    return "\n".join(lines)


if __name__ == "__main__":
    main()