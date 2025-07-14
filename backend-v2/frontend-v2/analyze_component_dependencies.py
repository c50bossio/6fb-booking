#!/usr/bin/env python3
"""
Component Dependency Map and Usage Analysis
=============================================

This script analyzes React/TypeScript component relationships, dependencies,
and usage patterns to guide consolidation efforts.
"""

import os
import re
import json
import ast
from pathlib import Path
from collections import defaultdict, Counter
from typing import Dict, List, Set, Tuple, Any, Optional
from dataclasses import dataclass, asdict
import subprocess

@dataclass
class ComponentInfo:
    """Information about a component"""
    name: str
    path: str
    file_type: str  # 'tsx', 'ts', 'js', 'jsx'
    size_lines: int
    imports: List[str]
    exports: List[str]
    dependencies: List[str]  # Components this component imports
    dependents: List[str]    # Components that import this component
    usage_count: int
    is_page: bool
    is_ui_component: bool
    category: str  # 'ui', 'feature', 'layout', 'page', 'utility'
    similarity_candidates: List[str]

@dataclass
class DuplicateGroup:
    """Group of similar/duplicate components"""
    name: str
    components: List[str]
    similarity_score: float
    consolidation_priority: str  # 'high', 'medium', 'low'
    consolidation_strategy: str
    impact_assessment: str

class ComponentAnalyzer:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.components: Dict[str, ComponentInfo] = {}
        self.import_graph: Dict[str, Set[str]] = defaultdict(set)
        self.export_graph: Dict[str, Set[str]] = defaultdict(set)
        self.page_usage: Dict[str, Set[str]] = defaultdict(set)
        self.duplicate_groups: List[DuplicateGroup] = []
        
        # Pattern matching for different component types
        self.ui_patterns = [
            r'Button', r'Modal', r'Input', r'Select', r'Calendar', 
            r'Card', r'Badge', r'Toast', r'Dialog', r'Dropdown',
            r'Skeleton', r'Loading', r'Progress', r'Switch', r'Checkbox'
        ]
        
        self.layout_patterns = [
            r'Layout', r'Header', r'Footer', r'Sidebar', r'Navigation',
            r'Breadcrumb', r'Menu'
        ]
        
        self.feature_patterns = [
            r'Dashboard', r'Analytics', r'Booking', r'Payment', r'Calendar',
            r'Auth', r'Profile', r'Settings', r'Admin'
        ]

    def scan_files(self) -> None:
        """Scan all TypeScript/JavaScript files for components"""
        print(f"🔍 Scanning files in {self.base_path}")
        
        # Find all relevant files
        file_patterns = ['**/*.tsx', '**/*.ts', '**/*.jsx', '**/*.js']
        exclude_patterns = [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.next/**',
            '**/coverage/**',
            '**/*.test.*',
            '**/*.spec.*',
            '**/*.d.ts'
        ]
        
        files = []
        for pattern in file_patterns:
            for file_path in self.base_path.glob(pattern):
                # Skip excluded paths
                if any(file_path.match(exclude) for exclude in exclude_patterns):
                    continue
                files.append(file_path)
        
        print(f"📁 Found {len(files)} files to analyze")
        
        for file_path in files:
            self._analyze_file(file_path)
    
    def _analyze_file(self, file_path: Path) -> None:
        """Analyze a single file for component information"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"⚠️  Error reading {file_path}: {e}")
            return
        
        relative_path = str(file_path.relative_to(self.base_path))
        file_type = file_path.suffix[1:]  # Remove the dot
        
        # Extract component information
        component_name = self._extract_component_name(file_path, content)
        if not component_name:
            return
        
        imports = self._extract_imports(content)
        exports = self._extract_exports(content)
        dependencies = self._extract_component_dependencies(content)
        
        # Categorize component
        category = self._categorize_component(component_name, relative_path, content)
        is_page = '/app/' in relative_path and file_path.name == 'page.tsx'
        is_ui_component = '/ui/' in relative_path or category == 'ui'
        
        # Create component info
        component_info = ComponentInfo(
            name=component_name,
            path=relative_path,
            file_type=file_type,
            size_lines=len(content.splitlines()),
            imports=imports,
            exports=exports,
            dependencies=dependencies,
            dependents=[],  # Will be populated later
            usage_count=0,  # Will be calculated later
            is_page=is_page,
            is_ui_component=is_ui_component,
            category=category,
            similarity_candidates=[]
        )
        
        self.components[component_name] = component_info
        
        # Build import/export graphs
        for dep in dependencies:
            self.import_graph[component_name].add(dep)
            self.export_graph[dep].add(component_name)
    
    def _extract_component_name(self, file_path: Path, content: str) -> Optional[str]:
        """Extract the main component name from the file"""
        # Try to find export default component
        patterns = [
            r'export\s+default\s+(?:function\s+)?(\w+)',
            r'export\s+(?:const\s+|function\s+)?(\w+)',
            r'const\s+(\w+)\s*=.*forwardRef',
            r'function\s+(\w+)\s*\(',
            r'const\s+(\w+)\s*:\s*React\.FC'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                return match.group(1)
        
        # Fallback to filename
        name = file_path.stem
        if name != 'index':
            return name
        
        # If it's an index file, use the parent directory name
        return file_path.parent.name
    
    def _extract_imports(self, content: str) -> List[str]:
        """Extract all import statements"""
        import_pattern = r'import\s+.*?from\s+[\'"]([^\'"]+)[\'"]'
        return re.findall(import_pattern, content)
    
    def _extract_exports(self, content: str) -> List[str]:
        """Extract all export statements"""
        export_patterns = [
            r'export\s+(?:const\s+|function\s+|class\s+)?(\w+)',
            r'export\s+\{\s*([^}]+)\s*\}',
            r'export\s+default\s+(?:function\s+)?(\w+)'
        ]
        
        exports = []
        for pattern in export_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                if '{' in match:  # Handle export { a, b, c }
                    items = [item.strip() for item in match.split(',')]
                    exports.extend(items)
                else:
                    exports.append(match)
        
        return exports
    
    def _extract_component_dependencies(self, content: str) -> List[str]:
        """Extract React component dependencies (not npm packages)"""
        # Look for imports from relative paths or component directories
        component_imports = []
        
        import_patterns = [
            r'import\s+\{([^}]+)\}\s+from\s+[\'"]\.\.?/.*[\'"]',  # Relative imports
            r'import\s+(\w+)\s+from\s+[\'"]\.\.?/.*[\'"]',        # Default imports
            r'import\s+\{([^}]+)\}\s+from\s+[\'"]@/components/.*[\'"]',  # Component imports
        ]
        
        for pattern in import_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                if '{' in match or ',' in match:
                    # Multiple imports
                    items = [item.strip() for item in match.split(',')]
                    component_imports.extend(items)
                else:
                    component_imports.append(match)
        
        return component_imports
    
    def _categorize_component(self, name: str, path: str, content: str) -> str:
        """Categorize component based on name, path, and content"""
        if '/app/' in path and 'page.tsx' in path:
            return 'page'
        
        if '/ui/' in path:
            return 'ui'
        
        if any(re.search(pattern, name, re.IGNORECASE) for pattern in self.layout_patterns):
            return 'layout'
        
        if any(re.search(pattern, name, re.IGNORECASE) for pattern in self.ui_patterns):
            return 'ui'
        
        if any(re.search(pattern, name, re.IGNORECASE) for pattern in self.feature_patterns):
            return 'feature'
        
        if 'Hook' in name or name.startswith('use'):
            return 'hook'
        
        if any(keyword in content.lower() for keyword in ['utility', 'helper', 'util']):
            return 'utility'
        
        return 'feature'
    
    def calculate_usage_frequency(self) -> None:
        """Calculate how often each component is used"""
        print("📊 Calculating usage frequency...")
        
        # Count direct imports
        for component_name, component_info in self.components.items():
            usage_count = len(self.export_graph[component_name])
            component_info.usage_count = usage_count
            component_info.dependents = list(self.export_graph[component_name])
    
    def find_similar_components(self) -> None:
        """Find components with similar names or functionality"""
        print("🔍 Finding similar components...")
        
        # Group by similar names
        name_groups = defaultdict(list)
        
        for component_name in self.components.keys():
            # Normalize name for comparison
            base_name = re.sub(r'(Enhanced|Advanced|Simple|Basic|Mobile|Desktop|V2|New|Old)', '', component_name)
            base_name = re.sub(r'(Modal|Dialog|Popup)', 'Modal', base_name)
            base_name = re.sub(r'(Button|Btn)', 'Button', base_name)
            base_name = re.sub(r'(Calendar|Cal)', 'Calendar', base_name)
            
            name_groups[base_name.lower()].append(component_name)
        
        # Find groups with multiple components
        for base_name, components in name_groups.items():
            if len(components) > 1:
                similarity_score = self._calculate_similarity_score(components)
                
                if similarity_score > 0.7:  # High similarity threshold
                    priority = 'high'
                    strategy = 'Merge into single component with variant props'
                elif similarity_score > 0.5:
                    priority = 'medium'
                    strategy = 'Extract common functionality into shared component'
                else:
                    priority = 'low'
                    strategy = 'Review for potential consolidation'
                
                duplicate_group = DuplicateGroup(
                    name=base_name,
                    components=components,
                    similarity_score=similarity_score,
                    consolidation_priority=priority,
                    consolidation_strategy=strategy,
                    impact_assessment=self._assess_consolidation_impact(components)
                )
                
                self.duplicate_groups.append(duplicate_group)
                
                # Update similarity candidates for each component
                for component in components:
                    if component in self.components:
                        self.components[component].similarity_candidates = [
                            c for c in components if c != component
                        ]
    
    def _calculate_similarity_score(self, components: List[str]) -> float:
        """Calculate similarity score between components"""
        if len(components) < 2:
            return 0.0
        
        # Simple heuristic based on name similarity and usage patterns
        score = 0.0
        
        # Check if components have similar import patterns
        import_similarity = 0.0
        for i, comp1 in enumerate(components):
            for comp2 in components[i+1:]:
                if comp1 in self.components and comp2 in self.components:
                    imports1 = set(self.components[comp1].imports)
                    imports2 = set(self.components[comp2].imports)
                    
                    if imports1 or imports2:
                        intersection = len(imports1.intersection(imports2))
                        union = len(imports1.union(imports2))
                        import_similarity += intersection / union if union > 0 else 0
        
        # Average import similarity
        comparisons = len(components) * (len(components) - 1) / 2
        if comparisons > 0:
            score += (import_similarity / comparisons) * 0.6
        
        # Name similarity bonus
        base_names = [re.sub(r'[^a-zA-Z]', '', comp).lower() for comp in components]
        if len(set(base_names)) == 1:
            score += 0.4  # Same base name
        
        return min(score, 1.0)
    
    def _assess_consolidation_impact(self, components: List[str]) -> str:
        """Assess the impact of consolidating these components"""
        total_usage = sum(
            self.components[comp].usage_count 
            for comp in components 
            if comp in self.components
        )
        
        total_dependents = set()
        for comp in components:
            if comp in self.components:
                total_dependents.update(self.components[comp].dependents)
        
        if total_usage > 20 or len(total_dependents) > 10:
            return "HIGH IMPACT: Affects many components and requires careful migration"
        elif total_usage > 5 or len(total_dependents) > 3:
            return "MEDIUM IMPACT: Moderate refactoring required"
        else:
            return "LOW IMPACT: Safe to consolidate with minimal changes"
    
    def find_dead_components(self) -> List[str]:
        """Find components that are not used anywhere"""
        dead_components = []
        
        for component_name, component_info in self.components.items():
            if (component_info.usage_count == 0 and 
                not component_info.is_page and 
                component_name not in ['App', 'index', 'main']):
                dead_components.append(component_name)
        
        return dead_components
    
    def analyze_circular_dependencies(self) -> List[List[str]]:
        """Find circular dependencies in the component graph"""
        def dfs(node, path, visited):
            if node in path:
                # Found a cycle
                cycle_start = path.index(node)
                return [path[cycle_start:]]
            
            if node in visited:
                return []
            
            visited.add(node)
            path.append(node)
            
            cycles = []
            for neighbor in self.import_graph.get(node, []):
                if neighbor in self.components:  # Only consider actual components
                    cycles.extend(dfs(neighbor, path.copy(), visited))
            
            return cycles
        
        all_cycles = []
        visited = set()
        
        for component in self.components:
            if component not in visited:
                cycles = dfs(component, [], visited)
                all_cycles.extend(cycles)
        
        return all_cycles
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive analysis report"""
        print("📋 Generating comprehensive report...")
        
        dead_components = self.find_dead_components()
        circular_deps = self.analyze_circular_dependencies()
        
        # Component statistics by category
        category_stats = defaultdict(lambda: {'count': 0, 'total_usage': 0, 'avg_size': 0})
        total_lines = 0
        
        for comp_info in self.components.values():
            cat = comp_info.category
            category_stats[cat]['count'] += 1
            category_stats[cat]['total_usage'] += comp_info.usage_count
            category_stats[cat]['avg_size'] += comp_info.size_lines
            total_lines += comp_info.size_lines
        
        for cat_info in category_stats.values():
            if cat_info['count'] > 0:
                cat_info['avg_size'] = cat_info['avg_size'] // cat_info['count']
        
        # Most/least used components
        sorted_by_usage = sorted(
            self.components.items(), 
            key=lambda x: x[1].usage_count, 
            reverse=True
        )
        
        most_used = sorted_by_usage[:10]
        least_used = [item for item in sorted_by_usage if item[1].usage_count > 0][-10:]
        
        # Critical path components (most dependencies)
        critical_components = sorted(
            self.components.items(),
            key=lambda x: len(x[1].dependencies),
            reverse=True
        )[:10]
        
        return {
            'summary': {
                'total_components': len(self.components),
                'total_lines_of_code': total_lines,
                'dead_components_count': len(dead_components),
                'duplicate_groups_count': len(self.duplicate_groups),
                'circular_dependencies_count': len(circular_deps),
                'avg_component_size': total_lines // len(self.components) if self.components else 0
            },
            'category_breakdown': dict(category_stats),
            'duplicate_analysis': {
                'high_priority_groups': [
                    asdict(group) for group in self.duplicate_groups 
                    if group.consolidation_priority == 'high'
                ],
                'medium_priority_groups': [
                    asdict(group) for group in self.duplicate_groups 
                    if group.consolidation_priority == 'medium'
                ],
                'low_priority_groups': [
                    asdict(group) for group in self.duplicate_groups 
                    if group.consolidation_priority == 'low'
                ]
            },
            'usage_analysis': {
                'most_used_components': [
                    {'name': name, 'usage_count': info.usage_count, 'category': info.category}
                    for name, info in most_used
                ],
                'least_used_components': [
                    {'name': name, 'usage_count': info.usage_count, 'category': info.category}
                    for name, info in least_used
                ],
                'dead_components': dead_components
            },
            'dependency_analysis': {
                'critical_path_components': [
                    {
                        'name': name, 
                        'dependency_count': len(info.dependencies),
                        'dependent_count': len(info.dependents),
                        'category': info.category
                    }
                    for name, info in critical_components
                ],
                'circular_dependencies': circular_deps
            },
            'consolidation_recommendations': self._generate_consolidation_recommendations(),
            'detailed_components': {
                name: asdict(info) for name, info in self.components.items()
            }
        }
    
    def _generate_consolidation_recommendations(self) -> List[Dict[str, Any]]:
        """Generate specific consolidation recommendations"""
        recommendations = []
        
        # High-priority duplicates
        high_priority_groups = [g for g in self.duplicate_groups if g.consolidation_priority == 'high']
        
        for group in high_priority_groups:
            recommendations.append({
                'type': 'duplicate_consolidation',
                'priority': 'high',
                'title': f'Consolidate {group.name} variants',
                'description': f"Found {len(group.components)} similar components: {', '.join(group.components)}",
                'strategy': group.consolidation_strategy,
                'impact': group.impact_assessment,
                'components': group.components,
                'estimated_effort': 'Medium',
                'benefits': [
                    'Reduced bundle size',
                    'Improved maintainability',
                    'Consistent UI patterns',
                    'Single source of truth'
                ]
            })
        
        # Dead component removal
        dead_components = self.find_dead_components()
        if dead_components:
            recommendations.append({
                'type': 'dead_code_removal',
                'priority': 'medium',
                'title': 'Remove unused components',
                'description': f"Found {len(dead_components)} unused components",
                'strategy': 'Safe deletion after verification',
                'impact': 'LOW IMPACT: No breaking changes',
                'components': dead_components,
                'estimated_effort': 'Low',
                'benefits': [
                    'Reduced bundle size',
                    'Cleaner codebase',
                    'Faster builds',
                    'Less cognitive overhead'
                ]
            })
        
        # Large component refactoring
        large_components = [
            name for name, info in self.components.items()
            if info.size_lines > 500 and info.category != 'page'
        ]
        
        if large_components:
            recommendations.append({
                'type': 'large_component_refactoring',
                'priority': 'low',
                'title': 'Refactor large components',
                'description': f"Found {len(large_components)} components over 500 lines",
                'strategy': 'Break into smaller, focused components',
                'impact': 'MEDIUM IMPACT: Requires careful planning',
                'components': large_components,
                'estimated_effort': 'High',
                'benefits': [
                    'Better maintainability',
                    'Improved testability',
                    'Better separation of concerns',
                    'Easier code reviews'
                ]
            })
        
        return recommendations

def main():
    """Main analysis function"""
    base_path = "/Users/bossio/6fb-booking/backend-v2/frontend-v2"
    
    print("🚀 Starting Component Dependency Analysis")
    print("=" * 50)
    
    analyzer = ComponentAnalyzer(base_path)
    
    # Run analysis steps
    analyzer.scan_files()
    analyzer.calculate_usage_frequency()
    analyzer.find_similar_components()
    
    # Generate report
    report = analyzer.generate_report()
    
    # Save detailed report
    report_path = Path(base_path) / "component_dependency_analysis.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"💾 Detailed report saved to: {report_path}")
    
    # Print summary
    print("\n📊 ANALYSIS SUMMARY")
    print("=" * 50)
    print(f"Total Components: {report['summary']['total_components']}")
    print(f"Total Lines of Code: {report['summary']['total_lines_of_code']:,}")
    print(f"Dead Components: {report['summary']['dead_components_count']}")
    print(f"Duplicate Groups: {report['summary']['duplicate_groups_count']}")
    print(f"Circular Dependencies: {report['summary']['circular_dependencies_count']}")
    print(f"Average Component Size: {report['summary']['avg_component_size']} lines")
    
    print("\n🏷️  COMPONENT CATEGORIES")
    print("-" * 30)
    for category, stats in report['category_breakdown'].items():
        print(f"{category.title()}: {stats['count']} components, {stats['total_usage']} total usage")
    
    print("\n🔥 HIGH PRIORITY CONSOLIDATION TARGETS")
    print("-" * 40)
    high_priority = report['duplicate_analysis']['high_priority_groups']
    if high_priority:
        for group in high_priority:
            print(f"• {group['name']}: {', '.join(group['components'])}")
            print(f"  Strategy: {group['consolidation_strategy']}")
            print(f"  Impact: {group['impact_assessment']}")
    else:
        print("No high-priority duplicates found!")
    
    print("\n💀 DEAD COMPONENTS (Safe to Remove)")
    print("-" * 35)
    dead_components = report['usage_analysis']['dead_components']
    if dead_components:
        for component in dead_components[:10]:  # Show first 10
            print(f"• {component}")
        if len(dead_components) > 10:
            print(f"  ... and {len(dead_components) - 10} more")
    else:
        print("No dead components found!")
    
    print("\n🔄 CIRCULAR DEPENDENCIES")
    print("-" * 25)
    circular_deps = report['dependency_analysis']['circular_dependencies']
    if circular_deps:
        for cycle in circular_deps[:5]:  # Show first 5
            print(f"• {' → '.join(cycle)} → {cycle[0]}")
    else:
        print("No circular dependencies found!")
    
    print("\n📈 TOP USED COMPONENTS")
    print("-" * 22)
    most_used = report['usage_analysis']['most_used_components'][:10]
    for comp in most_used:
        print(f"• {comp['name']}: {comp['usage_count']} uses ({comp['category']})")
    
    print("\n🎯 CONSOLIDATION RECOMMENDATIONS")
    print("-" * 35)
    recommendations = report['consolidation_recommendations']
    for i, rec in enumerate(recommendations[:5], 1):
        print(f"{i}. {rec['title']} ({rec['priority'].upper()} PRIORITY)")
        print(f"   {rec['description']}")
        print(f"   Strategy: {rec['strategy']}")
        print(f"   Effort: {rec['estimated_effort']}")
        print()
    
    print("✅ Analysis Complete!")
    print(f"📄 Full report available at: {report_path}")

if __name__ == "__main__":
    main()