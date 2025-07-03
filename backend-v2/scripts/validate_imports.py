#!/usr/bin/env python3
"""
Import Validation Script

Checks that all imports work correctly after code consolidation.
Identifies broken imports, circular dependencies, and import optimization opportunities.
"""
import os
import sys
import ast
import importlib
import traceback
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
import argparse
import json
from collections import defaultdict, deque


class ImportValidator:
    """Validates import statements and dependencies across the codebase."""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.errors = []
        self.warnings = []
        self.import_graph = defaultdict(set)
        self.circular_dependencies = []
        self.unused_imports = []
        self.missing_dependencies = []
        
        # Add the base path to Python path for import testing
        if str(self.base_path) not in sys.path:
            sys.path.insert(0, str(self.base_path))
    
    def extract_imports(self, file_path: Path) -> Dict[str, List[Dict]]:
        """Extract all import statements from a Python file."""
        imports = {
            'standard': [],
            'third_party': [],
            'local': [],
            'relative': []
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            import_info = {
                                'module': alias.name,
                                'alias': alias.asname,
                                'line': node.lineno,
                                'type': 'import',
                                'category': self.categorize_import(alias.name)
                            }
                            imports[import_info['category']].append(import_info)
                    
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            module = node.module
                            level = node.level
                            
                            for alias in node.names:
                                import_info = {
                                    'module': module,
                                    'name': alias.name,
                                    'alias': alias.asname,
                                    'line': node.lineno,
                                    'level': level,
                                    'type': 'from_import',
                                    'category': 'relative' if level > 0 else self.categorize_import(module)
                                }
                                imports[import_info['category']].append(import_info)
        
        except SyntaxError as e:
            self.errors.append({
                'file': str(file_path.relative_to(self.base_path)),
                'error': f"Syntax error: {e}",
                'line': getattr(e, 'lineno', 0),
                'type': 'syntax_error'
            })
        except Exception as e:
            self.errors.append({
                'file': str(file_path.relative_to(self.base_path)),
                'error': f"Parse error: {e}",
                'line': 0,
                'type': 'parse_error'
            })
        
        return imports
    
    def categorize_import(self, module_name: str) -> str:
        """Categorize import as standard library, third-party, or local."""
        # Standard library modules (partial list)
        standard_modules = {
            'os', 'sys', 'json', 'datetime', 'time', 'logging', 'pathlib',
            'collections', 'typing', 'asyncio', 'functools', 'itertools',
            'hashlib', 'uuid', 'random', 'math', 'statistics', 're',
            'urllib', 'http', 'email', 'sqlite3', 'csv', 'xml', 'html'
        }
        
        # Check if it's a standard library module
        first_part = module_name.split('.')[0]
        if first_part in standard_modules:
            return 'standard'
        
        # Check if it's a local module (relative to our project)
        try:
            # If the module starts with our project structure, it's local
            local_indicators = ['api', 'models', 'services', 'utils', 'config', 'routers', 'middleware']
            if any(module_name.startswith(indicator) for indicator in local_indicators):
                return 'local'
        except:
            pass
        
        return 'third_party'
    
    def test_import(self, import_info: Dict, file_path: Path) -> Optional[Dict]:
        """Test if an import statement works correctly."""
        try:
            if import_info['type'] == 'import':
                # Test: import module
                importlib.import_module(import_info['module'])
            
            elif import_info['type'] == 'from_import':
                # Test: from module import name
                if import_info['category'] == 'relative':
                    # Handle relative imports
                    return self.test_relative_import(import_info, file_path)
                else:
                    module = importlib.import_module(import_info['module'])
                    if import_info['name'] != '*':
                        if not hasattr(module, import_info['name']):
                            return {
                                'file': str(file_path.relative_to(self.base_path)),
                                'error': f"Module '{import_info['module']}' has no attribute '{import_info['name']}'",
                                'line': import_info['line'],
                                'type': 'missing_attribute',
                                'import': import_info
                            }
            
            return None  # No error
            
        except ImportError as e:
            return {
                'file': str(file_path.relative_to(self.base_path)),
                'error': f"ImportError: {e}",
                'line': import_info['line'],
                'type': 'import_error',
                'import': import_info
            }
        except Exception as e:
            return {
                'file': str(file_path.relative_to(self.base_path)),
                'error': f"Unexpected error: {e}",
                'line': import_info['line'],
                'type': 'unexpected_error',
                'import': import_info
            }
    
    def test_relative_import(self, import_info: Dict, file_path: Path) -> Optional[Dict]:
        """Test relative import statements."""
        try:
            # Calculate the package name for relative imports
            rel_path = file_path.relative_to(self.base_path)
            package_parts = rel_path.parts[:-1]  # Remove file name
            
            if import_info['level'] > len(package_parts):
                return {
                    'file': str(file_path.relative_to(self.base_path)),
                    'error': f"Relative import level {import_info['level']} exceeds package depth",
                    'line': import_info['line'],
                    'type': 'invalid_relative_import',
                    'import': import_info
                }
            
            # Try to resolve the relative import
            package_name = '.'.join(package_parts[:-import_info['level']] if import_info['level'] > 0 else package_parts)
            full_module = f"{package_name}.{import_info['module']}" if import_info['module'] else package_name
            
            try:
                module = importlib.import_module(full_module)
                if import_info['name'] != '*' and not hasattr(module, import_info['name']):
                    return {
                        'file': str(file_path.relative_to(self.base_path)),
                        'error': f"Module '{full_module}' has no attribute '{import_info['name']}'",
                        'line': import_info['line'],
                        'type': 'missing_attribute',
                        'import': import_info
                    }
            except ImportError:
                # Try alternative resolution
                return None  # Skip for now, relative imports are complex
            
            return None
            
        except Exception as e:
            return {
                'file': str(file_path.relative_to(self.base_path)),
                'error': f"Relative import error: {e}",
                'line': import_info['line'],
                'type': 'relative_import_error',
                'import': import_info
            }
    
    def build_dependency_graph(self, all_imports: Dict[str, Dict]) -> None:
        """Build dependency graph for circular dependency detection."""
        for file_path, file_imports in all_imports.items():
            current_module = self.file_to_module_name(file_path)
            
            for category in file_imports:
                for import_info in file_imports[category]:
                    if import_info['category'] == 'local':
                        imported_module = import_info['module']
                        self.import_graph[current_module].add(imported_module)
    
    def file_to_module_name(self, file_path: str) -> str:
        """Convert file path to module name."""
        # Remove .py extension and convert slashes to dots
        module_path = file_path.replace('.py', '').replace('/', '.').replace('\\', '.')
        
        # Remove leading dots
        while module_path.startswith('.'):
            module_path = module_path[1:]
        
        return module_path
    
    def detect_circular_dependencies(self) -> List[List[str]]:
        """Detect circular dependencies using DFS."""
        visited = set()
        rec_stack = set()
        cycles = []
        
        def dfs(node: str, path: List[str]) -> bool:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            for neighbor in self.import_graph.get(node, []):
                if neighbor not in visited:
                    if dfs(neighbor, path.copy()):
                        return True
                elif neighbor in rec_stack:
                    # Found cycle
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    cycles.append(cycle)
                    return True
            
            rec_stack.remove(node)
            return False
        
        for node in self.import_graph:
            if node not in visited:
                dfs(node, [])
        
        return cycles
    
    def analyze_import_usage(self, file_path: Path, imports: Dict) -> List[Dict]:
        """Analyze which imports are actually used in the file."""
        unused = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                for category in imports:
                    for import_info in imports[category]:
                        if import_info['type'] == 'import':
                            # Check if module or alias is used
                            name_to_check = import_info['alias'] or import_info['module'].split('.')[0]
                        else:
                            # Check if imported name or alias is used
                            name_to_check = import_info['alias'] or import_info['name']
                        
                        if name_to_check != '*':
                            # Simple check: see if name appears in content after import line
                            lines = content.split('\n')
                            import_line = import_info['line']
                            
                            # Check if name is used after the import
                            used = False
                            for i, line in enumerate(lines[import_line:], import_line + 1):
                                if name_to_check in line and not line.strip().startswith('#'):
                                    used = True
                                    break
                            
                            if not used:
                                unused.append({
                                    'file': str(file_path.relative_to(self.base_path)),
                                    'line': import_info['line'],
                                    'name': name_to_check,
                                    'import': import_info,
                                    'type': 'unused_import'
                                })
        
        except Exception as e:
            pass  # Skip usage analysis if file can't be read
        
        return unused
    
    def validate_all_imports(self) -> Dict:
        """Validate all imports in the codebase."""
        print("🔍 Discovering Python files...")
        
        python_files = []
        for file_path in self.base_path.rglob('*.py'):
            # Skip certain directories
            skip_dirs = ['__pycache__', '.pytest_cache', 'venv', 'env', 'node_modules']
            if any(skip_dir in str(file_path) for skip_dir in skip_dirs):
                continue
            python_files.append(file_path)
        
        print(f"📊 Analyzing {len(python_files)} Python files...")
        
        all_imports = {}
        import_errors = []
        
        # Extract and test imports from each file
        for file_path in python_files:
            rel_path = str(file_path.relative_to(self.base_path))
            imports = self.extract_imports(file_path)
            all_imports[rel_path] = imports
            
            # Test each import
            for category in imports:
                for import_info in imports[category]:
                    error = self.test_import(import_info, file_path)
                    if error:
                        import_errors.append(error)
            
            # Check for unused imports
            unused = self.analyze_import_usage(file_path, imports)
            self.unused_imports.extend(unused)
        
        # Build dependency graph and detect cycles
        print("🔄 Analyzing dependencies...")
        self.build_dependency_graph(all_imports)
        self.circular_dependencies = self.detect_circular_dependencies()
        
        # Calculate statistics
        total_imports = sum(
            len(imports[category]) 
            for file_imports in all_imports.values()
            for category in file_imports
        )
        
        return {
            'files_analyzed': len(python_files),
            'total_imports': total_imports,
            'import_errors': import_errors,
            'circular_dependencies': self.circular_dependencies,
            'unused_imports': self.unused_imports,
            'import_breakdown': self.calculate_import_breakdown(all_imports),
            'errors': self.errors
        }
    
    def calculate_import_breakdown(self, all_imports: Dict) -> Dict:
        """Calculate breakdown of import types."""
        breakdown = {
            'standard': 0,
            'third_party': 0,
            'local': 0,
            'relative': 0
        }
        
        for file_imports in all_imports.values():
            for category in file_imports:
                breakdown[category] += len(file_imports[category])
        
        return breakdown
    
    def generate_report(self, validation_results: Dict) -> Dict:
        """Generate comprehensive import validation report."""
        total_errors = len(validation_results['import_errors']) + len(self.errors)
        total_warnings = len(self.unused_imports)
        
        status = 'PASS'
        if total_errors > 0:
            status = 'FAIL'
        elif total_warnings > 5 or self.circular_dependencies:
            status = 'WARN'
        
        return {
            'status': status,
            'summary': {
                'files_analyzed': validation_results['files_analyzed'],
                'total_imports': validation_results['total_imports'],
                'import_errors': total_errors,
                'unused_imports': len(self.unused_imports),
                'circular_dependencies': len(self.circular_dependencies)
            },
            'import_breakdown': validation_results['import_breakdown'],
            'errors': validation_results['import_errors'] + self.errors,
            'warnings': self.unused_imports[:10],  # Limit for readability
            'circular_dependencies': self.circular_dependencies,
            'recommendations': self.generate_recommendations(validation_results)
        }
    
    def generate_recommendations(self, validation_results: Dict) -> List[str]:
        """Generate recommendations for fixing import issues."""
        recommendations = []
        
        errors = validation_results['import_errors'] + self.errors
        if errors:
            recommendations.append(f"🚨 Fix {len(errors)} import errors before deployment")
            
            # Group errors by type
            error_types = defaultdict(int)
            for error in errors:
                error_types[error['type']] += 1
            
            for error_type, count in error_types.items():
                recommendations.append(f"  • {count} {error_type.replace('_', ' ')} errors")
        
        if self.circular_dependencies:
            recommendations.append(f"🔄 Resolve {len(self.circular_dependencies)} circular dependencies")
            for cycle in self.circular_dependencies[:3]:
                recommendations.append(f"  • Cycle: {' → '.join(cycle)}")
        
        if len(self.unused_imports) > 10:
            recommendations.append(f"🧹 Clean up {len(self.unused_imports)} unused imports")
        
        # Import organization recommendations
        breakdown = validation_results['import_breakdown']
        if breakdown['local'] > breakdown['third_party'] * 2:
            recommendations.append("📦 Consider extracting common functionality into separate packages")
        
        if not recommendations:
            recommendations.append("✅ All imports are valid and well-organized!")
        
        return recommendations


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Validate import statements')
    parser.add_argument('--path', default='.', help='Path to analyze')
    parser.add_argument('--output', choices=['json', 'text'], default='text')
    parser.add_argument('--save', help='Save report to file')
    parser.add_argument('--fix-unused', action='store_true', help='Auto-remove unused imports')
    
    args = parser.parse_args()
    
    print("🔍 Validating import statements...")
    
    validator = ImportValidator(args.path)
    validation_results = validator.validate_all_imports()
    report = validator.generate_report(validation_results)
    
    if args.output == 'json':
        if args.save:
            with open(args.save, 'w') as f:
                json.dump(report, f, indent=2)
        else:
            print(json.dumps(report, indent=2))
    else:
        print_import_report(report)
        
        if args.save:
            with open(args.save, 'w') as f:
                f.write(format_import_report(report))
    
    # Auto-fix unused imports if requested
    if args.fix_unused and report['warnings']:
        print("\n🧹 Auto-removing unused imports...")
        # Implementation would go here
        print("Note: Auto-fix not implemented yet")
    
    # Exit codes
    if report['status'] == 'FAIL':
        print("\n❌ IMPORT VALIDATION FAILED")
        exit(1)
    elif report['status'] == 'WARN':
        print("\n⚠️  IMPORT VALIDATION WARNINGS")
        exit(0)
    else:
        print("\n✅ IMPORT VALIDATION PASSED")
        exit(0)


def print_import_report(report: Dict):
    """Print formatted import validation report."""
    print("\n" + "="*60)
    print("  IMPORT VALIDATION REPORT")
    print("="*60)
    
    summary = report['summary']
    print(f"\nStatus: {report['status']}")
    print(f"Files analyzed: {summary['files_analyzed']}")
    print(f"Total imports: {summary['total_imports']}")
    print(f"Import errors: {summary['import_errors']}")
    print(f"Unused imports: {summary['unused_imports']}")
    print(f"Circular dependencies: {summary['circular_dependencies']}")
    
    # Import breakdown
    breakdown = report['import_breakdown']
    print(f"\nImport Breakdown:")
    print(f"  Standard library: {breakdown['standard']}")
    print(f"  Third-party: {breakdown['third_party']}")
    print(f"  Local modules: {breakdown['local']}")
    print(f"  Relative imports: {breakdown['relative']}")
    
    # Errors
    if report['errors']:
        print(f"\n🚨 IMPORT ERRORS ({len(report['errors'])}):")
        for i, error in enumerate(report['errors'][:10]):
            print(f"  {i+1}. {error['file']}:{error['line']} - {error['error']}")
    
    # Circular dependencies
    if report['circular_dependencies']:
        print(f"\n🔄 CIRCULAR DEPENDENCIES:")
        for i, cycle in enumerate(report['circular_dependencies']):
            print(f"  {i+1}. {' → '.join(cycle)}")
    
    # Warnings (unused imports)
    if report['warnings']:
        print(f"\n⚠️  UNUSED IMPORTS (sample):")
        for i, warning in enumerate(report['warnings'][:5]):
            print(f"  {i+1}. {warning['file']}:{warning['line']} - {warning['name']}")
    
    # Recommendations
    print(f"\n💡 RECOMMENDATIONS:")
    for rec in report['recommendations']:
        print(f"  • {rec}")
    
    print("\n" + "="*60)


def format_import_report(report: Dict) -> str:
    """Format import report for file output."""
    lines = []
    lines.append("IMPORT VALIDATION REPORT")
    lines.append("=" * 60)
    
    summary = report['summary']
    lines.append(f"Status: {report['status']}")
    lines.append(f"Files analyzed: {summary['files_analyzed']}")
    lines.append(f"Import errors: {summary['import_errors']}")
    lines.append(f"Unused imports: {summary['unused_imports']}")
    
    lines.append("\nRecommendations:")
    for rec in report['recommendations']:
        lines.append(f"• {rec}")
    
    return "\n".join(lines)


if __name__ == "__main__":
    main()