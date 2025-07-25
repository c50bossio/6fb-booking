#!/usr/bin/env python3
"""
Code Consolidation Validation Script

Checks for remaining code duplication after consolidation efforts.
Identifies duplicate functions, classes, and logic that should be consolidated.
"""
import ast
import hashlib
import json
from pathlib import Path
from typing import Dict, List
from collections import defaultdict
import argparse
import difflib


class CodeAnalyzer:
    """Analyzes code for duplication and consolidation opportunities."""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.duplicate_functions = []
        self.duplicate_classes = []
        self.similar_blocks = []
        self.import_duplicates = []
        
        # Exclude patterns
        self.exclude_patterns = [
            r'\.git/',
            r'node_modules/',
            r'__pycache__/',
            r'\.pytest_cache/',
            r'venv/',
            r'env/',
            r'build/',
            r'dist/',
            r'test_.*\.py$',
            r'.*_test\.py$',
            r'migrations/',
            r'alembic/versions/'
        ]
    
    def extract_functions(self, file_path: Path) -> List[Dict]:
        """Extract function definitions from Python file."""
        functions = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        # Get function signature and body
                        func_start = node.lineno
                        func_name = node.name
                        
                        # Get function source
                        lines = content.split('\n')
                        func_lines = []
                        
                        # Find function end (rough estimation)
                        indent_level = None
                        for i in range(func_start - 1, len(lines)):
                            line = lines[i]
                            if line.strip() == '':
                                continue
                            
                            if indent_level is None:
                                indent_level = len(line) - len(line.lstrip())
                            
                            current_indent = len(line) - len(line.lstrip())
                            if current_indent <= indent_level and i > func_start - 1:
                                break
                            
                            func_lines.append(line)
                        
                        func_source = '\n'.join(func_lines)
                        
                        # Create normalized version for comparison
                        normalized = self.normalize_code(func_source)
                        
                        functions.append({
                            'name': func_name,
                            'file': str(file_path.relative_to(self.base_path)),
                            'line': func_start,
                            'source': func_source,
                            'normalized': normalized,
                            'hash': hashlib.md5(normalized.encode()).hexdigest(),
                            'args': [arg.arg for arg in node.args.args],
                            'returns': node.returns is not None
                        })
        
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
        
        return functions
    
    def extract_classes(self, file_path: Path) -> List[Dict]:
        """Extract class definitions from Python file."""
        classes = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        class_start = node.lineno
                        class_name = node.name
                        
                        # Get class methods
                        methods = []
                        for item in node.body:
                            if isinstance(item, ast.FunctionDef):
                                methods.append(item.name)
                        
                        # Get class source (rough estimation)
                        lines = content.split('\n')
                        class_lines = []
                        
                        indent_level = None
                        for i in range(class_start - 1, len(lines)):
                            line = lines[i]
                            if line.strip() == '':
                                continue
                            
                            if indent_level is None:
                                indent_level = len(line) - len(line.lstrip())
                            
                            current_indent = len(line) - len(line.lstrip())
                            if current_indent <= indent_level and i > class_start - 1:
                                break
                            
                            class_lines.append(line)
                        
                        class_source = '\n'.join(class_lines)
                        normalized = self.normalize_code(class_source)
                        
                        classes.append({
                            'name': class_name,
                            'file': str(file_path.relative_to(self.base_path)),
                            'line': class_start,
                            'source': class_source,
                            'normalized': normalized,
                            'hash': hashlib.md5(normalized.encode()).hexdigest(),
                            'methods': methods,
                            'bases': [base.id for base in node.bases if hasattr(base, 'id')]
                        })
        
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
        
        return classes
    
    def extract_imports(self, file_path: Path) -> List[Dict]:
        """Extract import statements from Python file."""
        imports = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.append({
                                'type': 'import',
                                'module': alias.name,
                                'alias': alias.asname,
                                'file': str(file_path.relative_to(self.base_path)),
                                'line': node.lineno
                            })
                    
                    elif isinstance(node, ast.ImportFrom):
                        module = node.module or ''
                        for alias in node.names:
                            imports.append({
                                'type': 'from_import',
                                'module': module,
                                'name': alias.name,
                                'alias': alias.asname,
                                'file': str(file_path.relative_to(self.base_path)),
                                'line': node.lineno
                            })
        
        except Exception as e:
            print(f"Error parsing imports from {file_path}: {e}")
        
        return imports
    
    def normalize_code(self, code: str) -> str:
        """Normalize code for comparison by removing formatting differences."""
        # Remove comments and docstrings
        lines = []
        for line in code.split('\n'):
            line = line.strip()
            if line and not line.startswith('#'):
                # Remove inline comments
                if '#' in line:
                    line = line[:line.index('#')].strip()
                if line:
                    lines.append(line)
        
        # Join and normalize whitespace
        normalized = ' '.join(lines)
        
        # Remove variable names for better comparison
        # This is a simple approach - more sophisticated AST comparison would be better
        normalized = normalized.replace('  ', ' ')
        
        return normalized
    
    def find_duplicate_functions(self, functions: List[Dict]) -> List[Dict]:
        """Find duplicate functions based on normalized content."""
        duplicates = []
        hash_to_functions = defaultdict(list)
        
        # Group functions by hash
        for func in functions:
            hash_to_functions[func['hash']].append(func)
        
        # Find groups with multiple functions
        for func_hash, func_group in hash_to_functions.items():
            if len(func_group) > 1:
                # Calculate similarity scores
                similarities = []
                for i, func1 in enumerate(func_group):
                    for j, func2 in enumerate(func_group[i+1:], i+1):
                        similarity = self.calculate_similarity(
                            func1['source'], func2['source']
                        )
                        if similarity > 0.8:  # 80% similarity threshold
                            similarities.append({
                                'func1': func1,
                                'func2': func2,
                                'similarity': similarity
                            })
                
                if similarities:
                    duplicates.append({
                        'hash': func_hash,
                        'functions': func_group,
                        'similarities': similarities,
                        'count': len(func_group)
                    })
        
        return duplicates
    
    def find_duplicate_classes(self, classes: List[Dict]) -> List[Dict]:
        """Find duplicate classes based on structure and methods."""
        duplicates = []
        
        # Group by method signatures
        for i, class1 in enumerate(classes):
            for j, class2 in enumerate(classes[i+1:], i+1):
                if class1['file'] == class2['file']:
                    continue
                
                # Compare method names
                methods1 = set(class1['methods'])
                methods2 = set(class2['methods'])
                
                if len(methods1) > 0 and len(methods2) > 0:
                    method_similarity = len(methods1.intersection(methods2)) / len(methods1.union(methods2))
                    
                    if method_similarity > 0.7:  # 70% method similarity
                        code_similarity = self.calculate_similarity(
                            class1['source'], class2['source']
                        )
                        
                        if code_similarity > 0.6:  # 60% code similarity
                            duplicates.append({
                                'class1': class1,
                                'class2': class2,
                                'method_similarity': method_similarity,
                                'code_similarity': code_similarity
                            })
        
        return duplicates
    
    def find_import_duplicates(self, imports: List[Dict]) -> List[Dict]:
        """Find redundant import patterns."""
        duplicates = []
        
        # Group imports by file
        by_file = defaultdict(list)
        for imp in imports:
            by_file[imp['file']].extend(imports)
        
        # Find unused or redundant imports
        # This is a simplified check - would need symbol usage analysis for accuracy
        for file_path, file_imports in by_file.items():
            module_counts = defaultdict(int)
            for imp in file_imports:
                if imp['file'] == file_path:
                    module_counts[imp['module']] += 1
            
            for module, count in module_counts.items():
                if count > 1:
                    duplicates.append({
                        'file': file_path,
                        'module': module,
                        'count': count,
                        'type': 'multiple_imports'
                    })
        
        return duplicates
    
    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two text blocks."""
        # Use difflib to calculate similarity
        matcher = difflib.SequenceMatcher(None, text1, text2)
        return matcher.ratio()
    
    def find_similar_blocks(self, files: List[Path]) -> List[Dict]:
        """Find similar code blocks across files."""
        similar_blocks = []
        
        # This is a simplified implementation
        # In practice, you'd want more sophisticated analysis
        
        for i, file1 in enumerate(files):
            for j, file2 in enumerate(files[i+1:], i+1):
                try:
                    with open(file1, 'r', encoding='utf-8') as f1:
                        content1 = f1.read()
                    with open(file2, 'r', encoding='utf-8') as f2:
                        content2 = f2.read()
                    
                    # Split into blocks (functions, classes, etc.)
                    blocks1 = self.extract_code_blocks(content1)
                    blocks2 = self.extract_code_blocks(content2)
                    
                    for block1 in blocks1:
                        for block2 in blocks2:
                            if len(block1) > 50 and len(block2) > 50:  # Only check substantial blocks
                                similarity = self.calculate_similarity(block1, block2)
                                if similarity > 0.7:
                                    similar_blocks.append({
                                        'file1': str(file1.relative_to(self.base_path)),
                                        'file2': str(file2.relative_to(self.base_path)),
                                        'block1': block1[:100] + '...',
                                        'block2': block2[:100] + '...',
                                        'similarity': similarity
                                    })
                
                except Exception as e:
                    continue
        
        return similar_blocks
    
    def extract_code_blocks(self, content: str) -> List[str]:
        """Extract meaningful code blocks from content."""
        blocks = []
        lines = content.split('\n')
        current_block = []
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith(('def ', 'class ', 'if ', 'for ', 'while ', 'try:')):
                if current_block:
                    blocks.append('\n'.join(current_block))
                current_block = [line]
            elif current_block:
                current_block.append(line)
            
            # End block on dedent or empty line after content
            if stripped == '' and current_block:
                blocks.append('\n'.join(current_block))
                current_block = []
        
        if current_block:
            blocks.append('\n'.join(current_block))
        
        return [block for block in blocks if len(block.strip()) > 20]
    
    def should_exclude_file(self, file_path: Path) -> bool:
        """Check if file should be excluded from analysis."""
        import re
        file_str = str(file_path)
        
        for pattern in self.exclude_patterns:
            if re.search(pattern, file_str):
                return True
        return False
    
    def analyze_directory(self) -> Dict:
        """Analyze entire directory for code duplication."""
        print("🔍 Analyzing code for duplication...")
        
        all_functions = []
        all_classes = []
        all_imports = []
        python_files = []
        
        # Collect all Python files
        for file_path in self.base_path.rglob('*.py'):
            if self.should_exclude_file(file_path):
                continue
            
            python_files.append(file_path)
            
            # Extract functions, classes, and imports
            functions = self.extract_functions(file_path)
            classes = self.extract_classes(file_path)
            imports = self.extract_imports(file_path)
            
            all_functions.extend(functions)
            all_classes.extend(classes)
            all_imports.extend(imports)
        
        print(f"📊 Analyzed {len(python_files)} Python files")
        print(f"🔧 Found {len(all_functions)} functions, {len(all_classes)} classes")
        
        # Find duplicates
        duplicate_functions = self.find_duplicate_functions(all_functions)
        duplicate_classes = self.find_duplicate_classes(all_classes)
        import_duplicates = self.find_import_duplicates(all_imports)
        similar_blocks = self.find_similar_blocks(python_files[:10])  # Limit for performance
        
        return {
            'files_analyzed': len(python_files),
            'total_functions': len(all_functions),
            'total_classes': len(all_classes),
            'total_imports': len(all_imports),
            'duplicate_functions': duplicate_functions,
            'duplicate_classes': duplicate_classes,
            'import_duplicates': import_duplicates,
            'similar_blocks': similar_blocks
        }
    
    def generate_report(self, analysis: Dict) -> Dict:
        """Generate consolidation report."""
        total_duplicates = (
            len(analysis['duplicate_functions']) +
            len(analysis['duplicate_classes']) +
            len(analysis['import_duplicates']) +
            len(analysis['similar_blocks'])
        )
        
        status = 'PASS' if total_duplicates == 0 else 'WARN' if total_duplicates < 5 else 'FAIL'
        
        # Calculate consolidation opportunities
        function_opportunities = sum(
            dup['count'] - 1 for dup in analysis['duplicate_functions']
        )
        
        class_opportunities = len(analysis['duplicate_classes'])
        
        return {
            'status': status,
            'total_duplicates': total_duplicates,
            'consolidation_opportunities': {
                'functions': function_opportunities,
                'classes': class_opportunities,
                'imports': len(analysis['import_duplicates']),
                'blocks': len(analysis['similar_blocks'])
            },
            'analysis': analysis,
            'recommendations': self.generate_recommendations(analysis)
        }
    
    def generate_recommendations(self, analysis: Dict) -> List[str]:
        """Generate specific recommendations for consolidation."""
        recommendations = []
        
        if analysis['duplicate_functions']:
            recommendations.append(
                f"Consolidate {len(analysis['duplicate_functions'])} duplicate function groups"
            )
            
            # Specific recommendations
            for dup in analysis['duplicate_functions'][:3]:  # Top 3
                func_names = [f['name'] for f in dup['functions']]
                files = [f['file'] for f in dup['functions']]
                recommendations.append(
                    f"  • Merge {', '.join(func_names[:2])} functions from {files[0]} and {files[1] if len(files) > 1 else 'other files'}"
                )
        
        if analysis['duplicate_classes']:
            recommendations.append(
                f"Review {len(analysis['duplicate_classes'])} similar class pairs for consolidation"
            )
        
        if analysis['import_duplicates']:
            recommendations.append(
                f"Clean up {len(analysis['import_duplicates'])} redundant import patterns"
            )
        
        if analysis['similar_blocks']:
            recommendations.append(
                f"Extract common functionality from {len(analysis['similar_blocks'])} similar code blocks"
            )
        
        if not recommendations:
            recommendations.append("✅ No significant duplication found - code is well consolidated!")
        
        return recommendations


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Validate code consolidation')
    parser.add_argument('--path', default='.', help='Path to analyze')
    parser.add_argument('--output', choices=['json', 'text'], default='text')
    parser.add_argument('--save', help='Save report to file')
    parser.add_argument('--strict', action='store_true', help='Fail on any duplicates')
    
    args = parser.parse_args()
    
    analyzer = CodeAnalyzer(args.path)
    analysis = analyzer.analyze_directory()
    report = analyzer.generate_report(analysis)
    
    if args.output == 'json':
        if args.save:
            with open(args.save, 'w') as f:
                json.dump(report, f, indent=2)
        else:
            print(json.dumps(report, indent=2))
    else:
        print_consolidation_report(report)
        
        if args.save:
            with open(args.save, 'w') as f:
                f.write(format_consolidation_report(report))
    
    # Exit codes
    if report['status'] == 'FAIL':
        print("\n❌ CONSOLIDATION VALIDATION FAILED")
        exit(1)
    elif report['status'] == 'WARN' and args.strict:
        print("\n⚠️  CONSOLIDATION WARNINGS (strict mode)")
        exit(1)
    else:
        print("\n✅ CONSOLIDATION VALIDATION PASSED")
        exit(0)


def print_consolidation_report(report: Dict):
    """Print formatted consolidation report."""
    print("\n" + "="*60)
    print("  CODE CONSOLIDATION VALIDATION REPORT")
    print("="*60)
    
    analysis = report['analysis']
    
    print(f"\nStatus: {report['status']}")
    print(f"Files analyzed: {analysis['files_analyzed']}")
    print(f"Total duplicates found: {report['total_duplicates']}")
    
    # Consolidation opportunities
    opps = report['consolidation_opportunities']
    print(f"\nConsolidation Opportunities:")
    print(f"  Functions: {opps['functions']}")
    print(f"  Classes: {opps['classes']}")
    print(f"  Imports: {opps['imports']}")
    print(f"  Similar blocks: {opps['blocks']}")
    
    # Detailed findings
    if analysis['duplicate_functions']:
        print(f"\n🔧 DUPLICATE FUNCTIONS ({len(analysis['duplicate_functions'])} groups):")
        for i, dup in enumerate(analysis['duplicate_functions'][:5]):
            print(f"  {i+1}. {dup['count']} functions with same logic:")
            for func in dup['functions'][:3]:
                print(f"     • {func['name']}() in {func['file']}:{func['line']}")
    
    if analysis['duplicate_classes']:
        print(f"\n🏗️  SIMILAR CLASSES ({len(analysis['duplicate_classes'])}):")
        for i, dup in enumerate(analysis['duplicate_classes'][:5]):
            print(f"  {i+1}. {dup['class1']['name']} ↔ {dup['class2']['name']}")
            print(f"     Files: {dup['class1']['file']} ↔ {dup['class2']['file']}")
            print(f"     Similarity: {dup['code_similarity']:.1%}")
    
    # Recommendations
    print(f"\n💡 RECOMMENDATIONS:")
    for rec in report['recommendations']:
        print(f"  • {rec}")
    
    print("\n" + "="*60)


def format_consolidation_report(report: Dict) -> str:
    """Format consolidation report for file output."""
    lines = []
    lines.append("CODE CONSOLIDATION VALIDATION REPORT")
    lines.append("=" * 60)
    
    analysis = report['analysis']
    
    lines.append(f"Status: {report['status']}")
    lines.append(f"Files analyzed: {analysis['files_analyzed']}")
    lines.append(f"Total duplicates: {report['total_duplicates']}")
    
    lines.append("\nRecommendations:")
    for rec in report['recommendations']:
        lines.append(f"• {rec}")
    
    return "\n".join(lines)


if __name__ == "__main__":
    main()