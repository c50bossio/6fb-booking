#!/usr/bin/env python3
"""
Comprehensive Code Duplication and Conflict Analysis
Analyzes the 6FB booking system for duplicates, conflicts, and architecture issues
"""

import os
import json
import re
import ast
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict
from dataclasses import dataclass, asdict
import hashlib

@dataclass
class ConflictItem:
    name: str
    type: str  # 'duplicate', 'conflict', 'version_mismatch', 'architectural'
    severity: str  # 'low', 'medium', 'high', 'critical'
    locations: List[str]
    description: str
    impact: str
    resolution: str
    estimated_effort: str

class ComprehensiveAnalyzer:
    def __init__(self, project_root: str = "/Users/bossio/6fb-booking"):
        self.project_root = Path(project_root)
        self.backend_v1 = self.project_root / "backend"
        self.backend_v2 = self.project_root / "backend-v2"
        self.frontend_v1 = self.project_root / "frontend"
        self.frontend_v2 = self.project_root / "backend-v2" / "frontend-v2"
        
        self.conflicts = []
        self.duplicates = []
        self.architecture_issues = []
        self.version_conflicts = []
        
    def run_analysis(self) -> Dict:
        """Run comprehensive analysis"""
        print("🔍 Running comprehensive conflict analysis...")
        
        # 1. Duplicate Code Detection
        self.analyze_duplicate_models()
        self.analyze_duplicate_endpoints()
        self.analyze_duplicate_components()
        self.analyze_duplicate_services()
        
        # 2. Naming Conflicts
        self.analyze_naming_conflicts()
        
        # 3. Database Conflicts
        self.analyze_database_conflicts()
        
        # 4. Route Conflicts
        self.analyze_route_conflicts()
        
        # 5. Dependency Conflicts
        self.analyze_dependency_conflicts()
        
        # 6. Architecture Issues
        self.analyze_circular_dependencies()
        self.analyze_coupling_issues()
        
        # 7. Configuration Conflicts
        self.analyze_config_conflicts()
        
        return self.generate_report()
    
    def analyze_duplicate_models(self):
        """Analyze for duplicate database models"""
        models_v1 = self._extract_models_from_directory(self.backend_v1)
        models_v2 = self._extract_models_from_directory(self.backend_v2)
        
        # Find exact duplicates
        for model_name in models_v1:
            if model_name in models_v2:
                self.conflicts.append(ConflictItem(
                    name=f"Model: {model_name}",
                    type="duplicate",
                    severity="high",
                    locations=models_v1[model_name] + models_v2[model_name],
                    description=f"Model '{model_name}' exists in both v1 and v2 backend",
                    impact="Database migration conflicts, model import confusion",
                    resolution="Consolidate into single model definition",
                    estimated_effort="2-4 hours"
                ))
    
    def analyze_duplicate_endpoints(self):
        """Analyze for duplicate API endpoints"""
        endpoints_v1 = self._extract_endpoints_from_directory(self.backend_v1)
        endpoints_v2 = self._extract_endpoints_from_directory(self.backend_v2)
        
        for endpoint in endpoints_v1:
            if endpoint in endpoints_v2:
                self.conflicts.append(ConflictItem(
                    name=f"Endpoint: {endpoint}",
                    type="duplicate",
                    severity="critical",
                    locations=endpoints_v1[endpoint] + endpoints_v2[endpoint],
                    description=f"API endpoint '{endpoint}' implemented in both backends",
                    impact="API conflicts, unclear routing, client confusion",
                    resolution="Choose one implementation and remove the other",
                    estimated_effort="1-3 hours"
                ))
    
    def analyze_duplicate_components(self):
        """Analyze for duplicate React components"""
        components_v1 = self._extract_components_from_directory(self.frontend_v1)
        components_v2 = self._extract_components_from_directory(self.frontend_v2)
        
        for component in components_v1:
            if component in components_v2:
                self.conflicts.append(ConflictItem(
                    name=f"Component: {component}",
                    type="duplicate",
                    severity="medium",
                    locations=components_v1[component] + components_v2[component],
                    description=f"React component '{component}' exists in both frontends",
                    impact="Component confusion, maintenance overhead",
                    resolution="Consolidate into shared component library",
                    estimated_effort="2-6 hours"
                ))
    
    def analyze_duplicate_services(self):
        """Analyze for duplicate service implementations"""
        services_v1 = self._extract_services_from_directory(self.backend_v1 / "services")
        services_v2 = self._extract_services_from_directory(self.backend_v2 / "services")
        
        for service in services_v1:
            if service in services_v2:
                # Check if they're similar implementations
                similarity = self._calculate_file_similarity(
                    services_v1[service][0], services_v2[service][0]
                )
                if similarity > 0.7:
                    self.conflicts.append(ConflictItem(
                        name=f"Service: {service}",
                        type="duplicate",
                        severity="high",
                        locations=services_v1[service] + services_v2[service],
                        description=f"Service '{service}' has similar implementations ({similarity:.1%} similar)",
                        impact="Redundant business logic, maintenance overhead",
                        resolution="Consolidate service implementations",
                        estimated_effort="4-8 hours"
                    ))
    
    def analyze_naming_conflicts(self):
        """Analyze for naming conflicts across the system"""
        # Check for conflicting function/class names
        all_python_files = list(self.backend_v1.rglob("*.py")) + list(self.backend_v2.rglob("*.py"))
        all_python_files = [f for f in all_python_files if "venv" not in str(f)]
        
        function_names = defaultdict(list)
        class_names = defaultdict(list)
        
        for file_path in all_python_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    tree = ast.parse(f.read())
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        function_names[node.name].append(str(file_path))
                    elif isinstance(node, ast.ClassDef):
                        class_names[node.name].append(str(file_path))
            except:
                continue
        
        # Check for suspicious duplicates
        for name, files in function_names.items():
            if len(files) > 2 and any("backend-v2" in f for f in files) and any("backend-v2/" in f for f in files):
                self.conflicts.append(ConflictItem(
                    name=f"Function: {name}",
                    type="conflict",
                    severity="medium",
                    locations=files,
                    description=f"Function '{name}' defined in multiple locations across v1/v2",
                    impact="Potential import conflicts, confusion",
                    resolution="Rename or consolidate functions",
                    estimated_effort="1-2 hours"
                ))
    
    def analyze_database_conflicts(self):
        """Analyze for database table and migration conflicts"""
        # Check for table name conflicts
        v1_tables = self._extract_table_names(self.backend_v1)
        v2_tables = self._extract_table_names(self.backend_v2)
        
        common_tables = set(v1_tables.keys()) & set(v2_tables.keys())
        for table in common_tables:
            self.conflicts.append(ConflictItem(
                name=f"Table: {table}",
                type="conflict",
                severity="critical",
                locations=v1_tables[table] + v2_tables[table],
                description=f"Database table '{table}' defined in both systems",
                impact="Migration conflicts, data corruption risk",
                resolution="Align table schemas or use different table names",
                estimated_effort="4-12 hours"
            ))
        
        # Check for migration conflicts
        v1_migrations = self._get_migration_files(self.backend_v1)
        v2_migrations = self._get_migration_files(self.backend_v2)
        
        if v1_migrations and v2_migrations:
            self.architecture_issues.append(ConflictItem(
                name="Migration Systems",
                type="architectural",
                severity="high",
                locations=[str(self.backend_v1 / "alembic"), str(self.backend_v2 / "alembic")],
                description="Two separate migration systems running concurrently",
                impact="Database state conflicts, migration ordering issues",
                resolution="Consolidate migration systems",
                estimated_effort="8-16 hours"
            ))
    
    def analyze_route_conflicts(self):
        """Analyze for frontend route conflicts"""
        v1_routes = self._extract_routes(self.frontend_v1)
        v2_routes = self._extract_routes(self.frontend_v2)
        
        common_routes = set(v1_routes.keys()) & set(v2_routes.keys())
        for route in common_routes:
            self.conflicts.append(ConflictItem(
                name=f"Route: {route}",
                type="conflict",
                severity="medium",
                locations=v1_routes[route] + v2_routes[route],
                description=f"Frontend route '{route}' exists in both systems",
                impact="User confusion, SEO conflicts",
                resolution="Consolidate routes or use different paths",
                estimated_effort="2-4 hours"
            ))
    
    def analyze_dependency_conflicts(self):
        """Analyze for dependency version conflicts"""
        v1_deps = self._extract_dependencies(self.backend_v1 / "requirements.txt")
        v2_deps = self._extract_dependencies(self.backend_v2 / "requirements.txt")
        
        for dep_name in v1_deps:
            if dep_name in v2_deps and v1_deps[dep_name] != v2_deps[dep_name]:
                self.version_conflicts.append(ConflictItem(
                    name=f"Dependency: {dep_name}",
                    type="version_mismatch",
                    severity="medium",
                    locations=[str(self.backend_v1 / "requirements.txt"), str(self.backend_v2 / "requirements.txt")],
                    description=f"Different versions: v1={v1_deps[dep_name]}, v2={v2_deps[dep_name]}",
                    impact="Compatibility issues, deployment conflicts",
                    resolution="Align dependency versions",
                    estimated_effort="1-3 hours"
                ))
        
        # Check frontend dependencies
        v1_frontend_deps = self._extract_npm_dependencies(self.frontend_v1 / "package.json")
        v2_frontend_deps = self._extract_npm_dependencies(self.frontend_v2 / "package.json")
        
        for dep_name in v1_frontend_deps:
            if dep_name in v2_frontend_deps and v1_frontend_deps[dep_name] != v2_frontend_deps[dep_name]:
                self.version_conflicts.append(ConflictItem(
                    name=f"NPM Dependency: {dep_name}",
                    type="version_mismatch",
                    severity="medium",
                    locations=[str(self.frontend_v1 / "package.json"), str(self.frontend_v2 / "package.json")],
                    description=f"Different versions: v1={v1_frontend_deps[dep_name]}, v2={v2_frontend_deps[dep_name]}",
                    impact="Build conflicts, feature discrepancies",
                    resolution="Align dependency versions",
                    estimated_effort="1-2 hours"
                ))
    
    def analyze_circular_dependencies(self):
        """Check for circular import dependencies"""
        # This is a simplified check - would need more sophisticated analysis for full detection
        python_files = list(self.backend_v2.rglob("*.py"))
        python_files = [f for f in python_files if "venv" not in str(f)]
        
        import_graph = defaultdict(set)
        
        for file_path in python_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract imports
                imports = re.findall(r'^from\s+([^\s]+)\s+import', content, re.MULTILINE)
                imports += re.findall(r'^import\s+([^\s]+)', content, re.MULTILINE)
                
                file_module = self._path_to_module(file_path, self.backend_v2)
                for imp in imports:
                    if imp.startswith('.') or 'backend' in imp:
                        import_graph[file_module].add(imp)
            except:
                continue
        
        # Simple cycle detection (would need more sophisticated algorithm for complete analysis)
        for module, imports in import_graph.items():
            for imp in imports:
                if imp in import_graph and module in import_graph[imp]:
                    self.architecture_issues.append(ConflictItem(
                        name=f"Circular Import: {module} ↔ {imp}",
                        type="architectural",
                        severity="high",
                        locations=[module, imp],
                        description=f"Circular import between {module} and {imp}",
                        impact="Import errors, initialization issues",
                        resolution="Refactor to remove circular dependency",
                        estimated_effort="2-6 hours"
                    ))
    
    def analyze_coupling_issues(self):
        """Analyze for tight coupling between components"""
        # Check for cross-system imports
        v2_files = list(self.backend_v2.rglob("*.py"))
        v2_files = [f for f in v2_files if "venv" not in str(f)]
        
        for file_path in v2_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check for imports from v1 backend
                if re.search(r'from\s+backend\.', content) or re.search(r'import\s+backend\.', content):
                    self.architecture_issues.append(ConflictItem(
                        name=f"Cross-system Import: {file_path.name}",
                        type="architectural",
                        severity="critical",
                        locations=[str(file_path)],
                        description=f"v2 system importing from v1 backend",
                        impact="Tight coupling, deployment issues",
                        resolution="Remove cross-system dependencies",
                        estimated_effort="2-8 hours"
                    ))
            except:
                continue
    
    def analyze_config_conflicts(self):
        """Analyze for configuration conflicts"""
        config_files = [
            "docker-compose.yml",
            ".env.example",
            "railway.toml",
            "render.yaml",
            "vercel.json"
        ]
        
        for config_file in config_files:
            v1_config = self.project_root / config_file
            v2_config = self.backend_v2 / config_file
            
            if v1_config.exists() and v2_config.exists():
                self.conflicts.append(ConflictItem(
                    name=f"Config: {config_file}",
                    type="conflict",
                    severity="medium",
                    locations=[str(v1_config), str(v2_config)],
                    description=f"Configuration file '{config_file}' exists in both locations",
                    impact="Deployment confusion, environment conflicts",
                    resolution="Consolidate configuration files",
                    estimated_effort="1-2 hours"
                ))
    
    def generate_report(self) -> Dict:
        """Generate comprehensive conflict analysis report"""
        total_conflicts = len(self.conflicts) + len(self.duplicates) + len(self.architecture_issues) + len(self.version_conflicts)
        
        # Categorize by severity
        critical_issues = [item for item in self.conflicts + self.architecture_issues if item.severity == "critical"]
        high_issues = [item for item in self.conflicts + self.architecture_issues + self.version_conflicts if item.severity == "high"]
        medium_issues = [item for item in self.conflicts + self.architecture_issues + self.version_conflicts if item.severity == "medium"]
        low_issues = [item for item in self.conflicts + self.architecture_issues + self.version_conflicts if item.severity == "low"]
        
        # Calculate estimated effort
        effort_mapping = {
            "1-2 hours": 1.5,
            "1-3 hours": 2,
            "2-4 hours": 3,
            "2-6 hours": 4,
            "4-8 hours": 6,
            "4-12 hours": 8,
            "8-16 hours": 12
        }
        
        total_effort = sum(
            effort_mapping.get(item.estimated_effort, 4) 
            for item in self.conflicts + self.architecture_issues + self.version_conflicts
        )
        
        return {
            "summary": {
                "total_conflicts": total_conflicts,
                "critical_issues": len(critical_issues),
                "high_issues": len(high_issues),
                "medium_issues": len(medium_issues),
                "low_issues": len(low_issues),
                "estimated_effort_hours": total_effort,
                "priority_recommendations": self._generate_priorities()
            },
            "conflicts": [asdict(item) for item in self.conflicts],
            "architecture_issues": [asdict(item) for item in self.architecture_issues],
            "version_conflicts": [asdict(item) for item in self.version_conflicts],
            "critical_issues": [asdict(item) for item in critical_issues],
            "recommended_actions": self._generate_recommendations()
        }
    
    def _generate_priorities(self) -> List[str]:
        """Generate priority recommendations"""
        priorities = []
        
        critical_count = len([item for item in self.conflicts + self.architecture_issues if item.severity == "critical"])
        if critical_count > 0:
            priorities.append(f"URGENT: Address {critical_count} critical issues immediately")
        
        db_conflicts = len([item for item in self.conflicts if "Table:" in item.name])
        if db_conflicts > 0:
            priorities.append(f"HIGH: Resolve {db_conflicts} database conflicts before deployment")
        
        endpoint_conflicts = len([item for item in self.conflicts if "Endpoint:" in item.name])
        if endpoint_conflicts > 0:
            priorities.append(f"HIGH: Fix {endpoint_conflicts} API endpoint conflicts")
        
        return priorities
    
    def _generate_recommendations(self) -> List[str]:
        """Generate consolidation recommendations"""
        return [
            "1. Consolidate database models into backend-v2, remove from backend",
            "2. Choose single API implementation (recommend v2), deprecate v1 endpoints",
            "3. Merge frontend components into unified component library",
            "4. Align dependency versions across all projects",
            "5. Establish single source of truth for configuration",
            "6. Create migration plan for production deployment"
        ]
    
    # Helper methods
    def _extract_models_from_directory(self, directory: Path) -> Dict[str, List[str]]:
        """Extract model definitions from directory"""
        models = defaultdict(list)
        if not directory.exists():
            return models
            
        for py_file in directory.rglob("*.py"):
            if "venv" in str(py_file):
                continue
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find class definitions that look like models
                class_matches = re.findall(r'class\s+(\w+)\s*\([^)]*Base[^)]*\)', content)
                for class_name in class_matches:
                    models[class_name].append(str(py_file))
            except:
                continue
        return models
    
    def _extract_endpoints_from_directory(self, directory: Path) -> Dict[str, List[str]]:
        """Extract API endpoints from directory"""
        endpoints = defaultdict(list)
        if not directory.exists():
            return endpoints
            
        for py_file in directory.rglob("*.py"):
            if "venv" in str(py_file):
                continue
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find FastAPI route decorators
                patterns = [
                    r'@\w+\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']',
                    r'@app\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']',
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, content)
                    for method, path in matches:
                        endpoint_key = f"{method.upper()} {path}"
                        endpoints[endpoint_key].append(str(py_file))
            except:
                continue
        return endpoints
    
    def _extract_components_from_directory(self, directory: Path) -> Dict[str, List[str]]:
        """Extract React components from directory"""
        components = defaultdict(list)
        if not directory.exists():
            return components
            
        for tsx_file in directory.rglob("*.tsx"):
            try:
                with open(tsx_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find component exports
                patterns = [
                    r'export\s+(?:default\s+)?function\s+(\w+)',
                    r'export\s+(?:default\s+)?const\s+(\w+)\s*[:=]\s*(?:\([^)]*\)|[^=]+)\s*=>',
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, content)
                    for component_name in matches:
                        components[component_name].append(str(tsx_file))
            except:
                continue
        return components
    
    def _extract_services_from_directory(self, directory: Path) -> Dict[str, List[str]]:
        """Extract service files from directory"""
        services = defaultdict(list)
        if not directory.exists():
            return services
            
        for py_file in directory.glob("*_service.py"):
            service_name = py_file.stem.replace("_service", "")
            services[service_name].append(str(py_file))
        return services
    
    def _extract_table_names(self, directory: Path) -> Dict[str, List[str]]:
        """Extract database table names"""
        tables = defaultdict(list)
        if not directory.exists():
            return tables
            
        for py_file in directory.rglob("*.py"):
            if "venv" in str(py_file):
                continue
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find __tablename__ declarations
                matches = re.findall(r'__tablename__\s*=\s*["\']([^"\']+)["\']', content)
                for table_name in matches:
                    tables[table_name].append(str(py_file))
            except:
                continue
        return tables
    
    def _get_migration_files(self, directory: Path) -> List[str]:
        """Get migration files"""
        alembic_dir = directory / "alembic" / "versions"
        if alembic_dir.exists():
            return [str(f) for f in alembic_dir.glob("*.py")]
        return []
    
    def _extract_routes(self, directory: Path) -> Dict[str, List[str]]:
        """Extract frontend routes"""
        routes = defaultdict(list)
        if not directory.exists():
            return routes
            
        # Look for Next.js app directory structure
        app_dir = directory / "src" / "app"
        if not app_dir.exists():
            app_dir = directory / "app"
        
        if app_dir.exists():
            for page_file in app_dir.rglob("page.tsx"):
                # Convert file path to route
                relative_path = page_file.relative_to(app_dir)
                route_parts = []
                for part in relative_path.parts[:-1]:  # Exclude page.tsx
                    if part.startswith('[') and part.endswith(']'):
                        route_parts.append(':' + part[1:-1])  # Convert [id] to :id
                    else:
                        route_parts.append(part)
                
                route = '/' + '/'.join(route_parts) if route_parts else '/'
                routes[route].append(str(page_file))
        
        return routes
    
    def _extract_dependencies(self, req_file: Path) -> Dict[str, str]:
        """Extract Python dependencies"""
        deps = {}
        if not req_file.exists():
            return deps
            
        try:
            with open(req_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if '==' in line:
                            name, version = line.split('==', 1)
                            deps[name] = version
        except:
            pass
        return deps
    
    def _extract_npm_dependencies(self, package_file: Path) -> Dict[str, str]:
        """Extract NPM dependencies"""
        deps = {}
        if not package_file.exists():
            return deps
            
        try:
            with open(package_file, 'r') as f:
                package_data = json.load(f)
                if 'dependencies' in package_data:
                    deps.update(package_data['dependencies'])
                if 'devDependencies' in package_data:
                    deps.update(package_data['devDependencies'])
        except:
            pass
        return deps
    
    def _calculate_file_similarity(self, file1: str, file2: str) -> float:
        """Calculate similarity between two files"""
        try:
            with open(file1, 'r', encoding='utf-8') as f1, open(file2, 'r', encoding='utf-8') as f2:
                content1 = set(f1.read().split())
                content2 = set(f2.read().split())
                
                if not content1 or not content2:
                    return 0.0
                
                intersection = content1.intersection(content2)
                union = content1.union(content2)
                return len(intersection) / len(union) if union else 0.0
        except:
            return 0.0
    
    def _path_to_module(self, file_path: Path, base_path: Path) -> str:
        """Convert file path to module name"""
        relative_path = file_path.relative_to(base_path)
        return str(relative_path).replace('/', '.').replace('.py', '')

def main():
    analyzer = ComprehensiveAnalyzer()
    report = analyzer.run_analysis()
    
    # Save detailed report
    with open('/Users/bossio/6fb-booking/backend-v2/conflict_analysis_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print(f"\n{'='*60}")
    print("🚨 COMPREHENSIVE CONFLICT ANALYSIS REPORT")
    print(f"{'='*60}")
    
    summary = report['summary']
    print(f"📊 Total Issues Found: {summary['total_conflicts']}")
    print(f"🔥 Critical Issues: {summary['critical_issues']}")
    print(f"⚠️  High Priority: {summary['high_issues']}")
    print(f"📝 Medium Priority: {summary['medium_issues']}")
    print(f"ℹ️  Low Priority: {summary['low_issues']}")
    print(f"⏱️  Estimated Effort: {summary['estimated_effort_hours']} hours")
    
    print(f"\n{'='*40}")
    print("🎯 PRIORITY RECOMMENDATIONS:")
    for priority in summary['priority_recommendations']:
        print(f"  • {priority}")
    
    print(f"\n{'='*40}")
    print("🔧 CRITICAL ISSUES:")
    for issue in report['critical_issues']:
        print(f"  🚨 {issue['name']}: {issue['description']}")
        print(f"     Impact: {issue['impact']}")
        print(f"     Fix: {issue['resolution']}")
        print()
    
    print(f"{'='*60}")
    print("📋 Full report saved to: conflict_analysis_report.json")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()