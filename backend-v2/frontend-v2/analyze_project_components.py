#!/usr/bin/env python3
"""
Project-Specific Component Analysis
===================================

Focus on actual project components, excluding node_modules and external libraries.
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict, Counter
from typing import Dict, List, Set, Tuple, Any, Optional
from dataclasses import dataclass, asdict

@dataclass
class ProjectComponent:
    """Project-specific component information"""
    name: str
    path: str
    category: str
    size_lines: int
    imports: List[str]
    exports: List[str]
    internal_dependencies: List[str]  # Other project components it uses
    usage_count: int
    is_duplicate_candidate: bool
    similar_components: List[str]
    consolidation_priority: str

class ProjectComponentAnalyzer:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.components: Dict[str, ProjectComponent] = {}
        self.import_relationships: Dict[str, Set[str]] = defaultdict(set)
        
        # Focus on project directories only
        self.project_dirs = [
            'components',
            'app',
            'lib', 
            'hooks',
            'contexts',
            'types'
        ]
        
        # UI component patterns for duplicate detection
        self.ui_component_patterns = {
            'Button': [r'Button', r'Btn'],
            'Modal': [r'Modal', r'Dialog', r'Popup', r'Overlay'],
            'Calendar': [r'Calendar', r'Cal', r'DatePicker'],
            'Input': [r'Input', r'TextField', r'Field'],
            'Select': [r'Select', r'Dropdown', r'Picker'],
            'Card': [r'Card', r'Panel', r'Container'],
            'Loading': [r'Loading', r'Spinner', r'Skeleton'],
            'Toast': [r'Toast', r'Notification', r'Alert'],
            'Form': [r'Form', r'Validated']
        }

    def analyze_project_components(self):
        """Analyze only project-specific components"""
        print("🎯 Analyzing project components...")
        
        for dir_name in self.project_dirs:
            dir_path = self.base_path / dir_name
            if dir_path.exists():
                self._scan_directory(dir_path)
        
        self._calculate_usage_and_relationships()
        self._identify_duplicates_and_similarities()
        
        return self._generate_project_report()

    def _scan_directory(self, directory: Path):
        """Scan a project directory for components"""
        for file_path in directory.rglob('*.tsx'):
            if self._is_project_file(file_path):
                self._analyze_project_file(file_path)
        
        for file_path in directory.rglob('*.ts'):
            if self._is_project_file(file_path) and not file_path.name.endswith('.d.ts'):
                self._analyze_project_file(file_path)

    def _is_project_file(self, file_path: Path) -> bool:
        """Check if this is a project file (not external dependency)"""
        path_str = str(file_path)
        
        # Exclude patterns
        exclude_patterns = [
            'node_modules',
            '.next',
            'dist',
            'build',
            'coverage',
            '.test.',
            '.spec.',
            'playwright-report',
            'test-results'
        ]
        
        return not any(pattern in path_str for pattern in exclude_patterns)

    def _analyze_project_file(self, file_path: Path):
        """Analyze a single project file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"⚠️  Error reading {file_path}: {e}")
            return

        relative_path = str(file_path.relative_to(self.base_path))
        component_name = self._extract_component_name(file_path, content)
        
        if not component_name:
            return

        # Extract imports and exports
        imports = self._extract_project_imports(content)
        exports = self._extract_exports(content)
        internal_deps = self._extract_internal_dependencies(content, relative_path)
        
        # Categorize component
        category = self._categorize_project_component(component_name, relative_path)
        
        component = ProjectComponent(
            name=component_name,
            path=relative_path,
            category=category,
            size_lines=len(content.splitlines()),
            imports=imports,
            exports=exports,
            internal_dependencies=internal_deps,
            usage_count=0,  # Will be calculated later
            is_duplicate_candidate=False,
            similar_components=[],
            consolidation_priority='low'
        )
        
        self.components[component_name] = component

    def _extract_component_name(self, file_path: Path, content: str) -> Optional[str]:
        """Extract main component name"""
        # Look for React component patterns
        patterns = [
            r'export\s+default\s+(?:function\s+)?(\w+)',
            r'export\s+const\s+(\w+)\s*=.*(?:React\.FC|forwardRef)',
            r'function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*return[^}]*<',
            r'const\s+(\w+)\s*=.*=>\s*\{[^}]*return[^}]*<',
            r'const\s+(\w+)\s*=.*=>\s*<'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.MULTILINE | re.DOTALL)
            if matches:
                # Filter out non-component names
                for match in matches:
                    if match[0].isupper():  # Component names start with uppercase
                        return match
        
        # Fallback to filename
        name = file_path.stem
        if name == 'index':
            return file_path.parent.name
        
        return name if name[0].isupper() else None

    def _extract_project_imports(self, content: str) -> List[str]:
        """Extract imports from project files only"""
        # Look for relative imports and @/ imports
        patterns = [
            r'import\s+.*?from\s+[\'"](\.[^\'\"]+)[\'"]',  # Relative imports
            r'import\s+.*?from\s+[\'"](@/[^\'\"]+)[\'"]'    # Absolute project imports
        ]
        
        imports = []
        for pattern in patterns:
            matches = re.findall(pattern, content)
            imports.extend(matches)
        
        return imports

    def _extract_exports(self, content: str) -> List[str]:
        """Extract all exports"""
        patterns = [
            r'export\s+(?:const\s+|function\s+|class\s+)?(\w+)',
            r'export\s+\{\s*([^}]+)\s*\}',
            r'export\s+default\s+(?:function\s+)?(\w+)'
        ]
        
        exports = []
        for pattern in patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                if ',' in match:  # Handle export { a, b, c }
                    items = [item.strip() for item in match.split(',')]
                    exports.extend(items)
                else:
                    exports.append(match)
        
        return exports

    def _extract_internal_dependencies(self, content: str, current_path: str) -> List[str]:
        """Extract dependencies on other project components"""
        # Look for component imports
        component_import_patterns = [
            r'import\s+\{([^}]+)\}\s+from\s+[\'"]@/components/[^\'\"]*[\'"]',
            r'import\s+(\w+)\s+from\s+[\'"]@/components/[^\'\"]*[\'"]',
            r'import\s+\{([^}]+)\}\s+from\s+[\'\"]\.\.?/[^\'\"]*[\'"]'
        ]
        
        dependencies = []
        for pattern in component_import_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                if ',' in match:
                    items = [item.strip() for item in match.split(',')]
                    dependencies.extend(items)
                else:
                    dependencies.append(match)
        
        return dependencies

    def _categorize_project_component(self, name: str, path: str) -> str:
        """Categorize project component"""
        if '/app/' in path and 'page.tsx' in path:
            return 'page'
        elif '/app/' in path and 'layout.tsx' in path:
            return 'layout'
        elif '/components/ui/' in path:
            return 'ui-component'
        elif '/components/' in path:
            return 'feature-component'
        elif '/hooks/' in path:
            return 'hook'
        elif '/lib/' in path:
            return 'utility'
        elif '/contexts/' in path:
            return 'context'
        elif '/types/' in path:
            return 'type-definition'
        else:
            return 'other'

    def _calculate_usage_and_relationships(self):
        """Calculate how components are used by each other"""
        print("📊 Calculating component relationships...")
        
        # Build usage graph
        usage_count = defaultdict(int)
        
        for comp_name, component in self.components.items():
            for dep in component.internal_dependencies:
                if dep in self.components:
                    self.import_relationships[comp_name].add(dep)
                    usage_count[dep] += 1
        
        # Update usage counts
        for comp_name in self.components:
            self.components[comp_name].usage_count = usage_count[comp_name]

    def _identify_duplicates_and_similarities(self):
        """Identify potential duplicates and similar components"""
        print("🔍 Identifying duplicates and similarities...")
        
        # Group components by similarity patterns
        for base_type, patterns in self.ui_component_patterns.items():
            matching_components = []
            
            for comp_name in self.components:
                for pattern in patterns:
                    if re.search(pattern, comp_name, re.IGNORECASE):
                        matching_components.append(comp_name)
                        break
            
            # If we found multiple similar components, mark them
            if len(matching_components) > 1:
                for comp_name in matching_components:
                    if comp_name in self.components:
                        component = self.components[comp_name]
                        component.is_duplicate_candidate = True
                        component.similar_components = [c for c in matching_components if c != comp_name]
                        
                        # Set consolidation priority based on usage and type
                        if base_type in ['Button', 'Modal', 'Calendar']:
                            component.consolidation_priority = 'high'
                        elif base_type in ['Input', 'Select', 'Form']:
                            component.consolidation_priority = 'medium'
                        else:
                            component.consolidation_priority = 'low'

    def _generate_project_report(self) -> Dict[str, Any]:
        """Generate focused project component report"""
        print("📋 Generating project-focused report...")
        
        # Category breakdown
        category_stats = defaultdict(lambda: {'count': 0, 'total_lines': 0, 'avg_usage': 0})
        total_lines = 0
        
        for component in self.components.values():
            cat = component.category
            category_stats[cat]['count'] += 1
            category_stats[cat]['total_lines'] += component.size_lines
            category_stats[cat]['avg_usage'] += component.usage_count
            total_lines += component.size_lines
        
        for cat_info in category_stats.values():
            if cat_info['count'] > 0:
                cat_info['avg_usage'] = cat_info['avg_usage'] / cat_info['count']
        
        # Duplicate analysis
        duplicates_by_priority = {
            'high': [],
            'medium': [],
            'low': []
        }
        
        for component in self.components.values():
            if component.is_duplicate_candidate:
                duplicates_by_priority[component.consolidation_priority].append({
                    'name': component.name,
                    'similar_to': component.similar_components,
                    'usage_count': component.usage_count,
                    'path': component.path,
                    'size_lines': component.size_lines
                })
        
        # Usage analysis
        most_used = sorted(
            [(name, comp.usage_count, comp.category) for name, comp in self.components.items()],
            key=lambda x: x[1],
            reverse=True
        )[:15]
        
        unused_components = [
            name for name, comp in self.components.items()
            if comp.usage_count == 0 and comp.category not in ['page', 'layout']
        ]
        
        # Large components that might need refactoring
        large_components = [
            {'name': name, 'lines': comp.size_lines, 'category': comp.category}
            for name, comp in self.components.items()
            if comp.size_lines > 300 and comp.category not in ['page']
        ]
        large_components.sort(key=lambda x: x['lines'], reverse=True)
        
        # Dependency analysis
        components_with_many_deps = sorted(
            [(name, len(comp.internal_dependencies), comp.category) 
             for name, comp in self.components.items()],
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return {
            'summary': {
                'total_project_components': len(self.components),
                'total_lines_of_code': total_lines,
                'duplicate_candidates': sum(1 for c in self.components.values() if c.is_duplicate_candidate),
                'unused_components': len(unused_components),
                'large_components': len(large_components),
                'average_component_size': total_lines // len(self.components) if self.components else 0
            },
            'category_breakdown': dict(category_stats),
            'duplicate_analysis': duplicates_by_priority,
            'usage_analysis': {
                'most_used_components': [
                    {'name': name, 'usage_count': usage, 'category': category}
                    for name, usage, category in most_used
                ],
                'unused_components': unused_components[:20],  # Show first 20
                'total_unused': len(unused_components)
            },
            'size_analysis': {
                'large_components': large_components[:15],
                'components_by_size': {
                    'small_0_100': sum(1 for c in self.components.values() if c.size_lines <= 100),
                    'medium_101_300': sum(1 for c in self.components.values() if 100 < c.size_lines <= 300),
                    'large_301_500': sum(1 for c in self.components.values() if 300 < c.size_lines <= 500),
                    'very_large_500plus': sum(1 for c in self.components.values() if c.size_lines > 500)
                }
            },
            'dependency_analysis': {
                'components_with_most_dependencies': [
                    {'name': name, 'dependency_count': dep_count, 'category': category}
                    for name, dep_count, category in components_with_many_deps
                ],
                'total_internal_imports': sum(len(comp.internal_dependencies) for comp in self.components.values())
            },
            'consolidation_recommendations': self._generate_specific_recommendations(duplicates_by_priority, unused_components, large_components),
            'detailed_components': {
                name: {
                    'path': comp.path,
                    'category': comp.category,
                    'size_lines': comp.size_lines,
                    'usage_count': comp.usage_count,
                    'internal_dependencies': comp.internal_dependencies,
                    'is_duplicate_candidate': comp.is_duplicate_candidate,
                    'similar_components': comp.similar_components,
                    'consolidation_priority': comp.consolidation_priority
                }
                for name, comp in self.components.items()
            }
        }

    def _generate_specific_recommendations(self, duplicates_by_priority, unused_components, large_components):
        """Generate specific, actionable recommendations"""
        recommendations = []
        
        # High priority duplicates
        if duplicates_by_priority['high']:
            high_priority_names = set()
            for dup in duplicates_by_priority['high']:
                high_priority_names.add(dup['name'])
                high_priority_names.update(dup['similar_to'])
            
            recommendations.append({
                'type': 'critical_duplicate_consolidation',
                'priority': 'HIGH',
                'title': 'Consolidate Critical UI Components',
                'components': list(high_priority_names),
                'description': f"Found {len(high_priority_names)} Button/Modal/Calendar variants that need immediate consolidation",
                'action_plan': [
                    '1. Create unified Button component with variant props',
                    '2. Create unified Modal component with size/position props',
                    '3. Consolidate Calendar components into single accessible implementation',
                    '4. Update all imports across the codebase',
                    '5. Remove duplicate files'
                ],
                'estimated_effort': '2-3 days',
                'impact': 'High - affects core UI consistency'
            })
        
        # Medium priority duplicates
        if duplicates_by_priority['medium']:
            medium_priority_names = set()
            for dup in duplicates_by_priority['medium']:
                medium_priority_names.add(dup['name'])
                medium_priority_names.update(dup['similar_to'])
            
            recommendations.append({
                'type': 'form_component_consolidation',
                'priority': 'MEDIUM',
                'title': 'Consolidate Form Components',
                'components': list(medium_priority_names),
                'description': f"Found {len(medium_priority_names)} Input/Select/Form variants",
                'action_plan': [
                    '1. Create unified form component library',
                    '2. Standardize validation patterns',
                    '3. Migrate components progressively',
                    '4. Update form usage patterns'
                ],
                'estimated_effort': '1-2 days',
                'impact': 'Medium - improves form consistency'
            })
        
        # Dead component removal
        if unused_components:
            recommendations.append({
                'type': 'dead_code_removal',
                'priority': 'LOW',
                'title': 'Remove Unused Components',
                'components': unused_components[:20],  # Show sample
                'description': f"Found {len(unused_components)} unused components safe for removal",
                'action_plan': [
                    '1. Verify components are truly unused (check for dynamic imports)',
                    '2. Remove component files',
                    '3. Clean up related test files',
                    '4. Update index exports if needed'
                ],
                'estimated_effort': '4-6 hours',
                'impact': 'Low - reduces bundle size and cognitive overhead'
            })
        
        # Large component refactoring
        if large_components:
            recommendations.append({
                'type': 'large_component_refactoring',
                'priority': 'LOW',
                'title': 'Refactor Large Components',
                'components': [comp['name'] for comp in large_components[:10]],
                'description': f"Found {len(large_components)} components over 300 lines",
                'action_plan': [
                    '1. Identify logical boundaries within large components',
                    '2. Extract reusable sub-components',
                    '3. Create custom hooks for complex logic',
                    '4. Maintain same external API during refactoring'
                ],
                'estimated_effort': '1-2 weeks (spread over time)',
                'impact': 'Medium - improves maintainability and testability'
            })
        
        return recommendations

def main():
    """Run project-specific component analysis"""
    base_path = "/Users/bossio/6fb-booking/backend-v2/frontend-v2"
    
    print("🎯 PROJECT COMPONENT DEPENDENCY ANALYSIS")
    print("=" * 45)
    
    analyzer = ProjectComponentAnalyzer(base_path)
    report = analyzer.analyze_project_components()
    
    # Save report
    report_path = Path(base_path) / "project_component_analysis.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, default=str)
    
    # Print detailed summary
    summary = report['summary']
    print(f"\n📊 PROJECT SUMMARY")
    print("-" * 20)
    print(f"Total Project Components: {summary['total_project_components']}")
    print(f"Total Lines of Code: {summary['total_lines_of_code']:,}")
    print(f"Duplicate Candidates: {summary['duplicate_candidates']}")
    print(f"Unused Components: {summary['unused_components']}")
    print(f"Large Components (>300 lines): {summary['large_components']}")
    print(f"Average Component Size: {summary['average_component_size']} lines")
    
    print(f"\n🏗️  COMPONENT CATEGORIES")
    print("-" * 25)
    for category, stats in report['category_breakdown'].items():
        print(f"{category.replace('-', ' ').title()}: {stats['count']} components ({stats['total_lines']:,} lines)")
    
    print(f"\n🚨 HIGH PRIORITY DUPLICATES")
    print("-" * 30)
    high_priority = report['duplicate_analysis']['high']
    if high_priority:
        for dup in high_priority[:5]:  # Show first 5
            print(f"• {dup['name']} → similar to: {', '.join(dup['similar_to'])}")
            print(f"  Used {dup['usage_count']} times, {dup['size_lines']} lines")
    else:
        print("✅ No high-priority duplicates found!")
    
    print(f"\n⚠️  MEDIUM PRIORITY DUPLICATES")
    print("-" * 32)
    medium_priority = report['duplicate_analysis']['medium']
    if medium_priority:
        for dup in medium_priority[:5]:
            print(f"• {dup['name']} → similar to: {', '.join(dup['similar_to'])}")
    else:
        print("✅ No medium-priority duplicates found!")
    
    print(f"\n📈 MOST USED COMPONENTS")
    print("-" * 25)
    for comp in report['usage_analysis']['most_used_components'][:10]:
        print(f"• {comp['name']}: {comp['usage_count']} uses ({comp['category']})")
    
    print(f"\n📦 COMPONENT SIZE DISTRIBUTION")
    print("-" * 30)
    size_dist = report['size_analysis']['components_by_size']
    print(f"Small (≤100 lines): {size_dist['small_0_100']} components")
    print(f"Medium (101-300 lines): {size_dist['medium_101_300']} components") 
    print(f"Large (301-500 lines): {size_dist['large_301_500']} components")
    print(f"Very Large (>500 lines): {size_dist['very_large_500plus']} components")
    
    print(f"\n🎯 ACTIONABLE RECOMMENDATIONS")
    print("-" * 32)
    for i, rec in enumerate(report['consolidation_recommendations'], 1):
        print(f"{i}. {rec['title']} ({rec['priority']} PRIORITY)")
        print(f"   Components: {len(rec['components'])} affected")
        print(f"   Effort: {rec['estimated_effort']}")
        print(f"   Impact: {rec['impact']}")
        print()
    
    print(f"✅ Analysis complete! Full report saved to:")
    print(f"📄 {report_path}")

if __name__ == "__main__":
    main()