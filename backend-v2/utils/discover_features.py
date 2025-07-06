#!/usr/bin/env python3
"""
Feature Discovery Tool - Analyzes the entire codebase to populate the feature registry
This helps prevent duplication by cataloging all existing features
"""

import os
import re
import ast
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple
from datetime import datetime
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from registry_manager import RegistryManager


class FeatureDiscovery:
    """Discovers and catalogs features in the BookedBarber V2 codebase"""
    
    def __init__(self):
        self.backend_root = Path(__file__).parent.parent
        self.frontend_root = self.backend_root / "frontend-v2"
        self.registry_manager = RegistryManager()
        self.discovered_features = {
            "features": {},
            "models": {},
            "endpoints": {},
            "components": {},
            "services": {}
        }
        
    def discover_all(self):
        """Run all discovery processes"""
        print("🔍 Starting comprehensive feature discovery...")
        print("=" * 60)
        
        # Discover backend features
        self.discover_models()
        self.discover_services()
        self.discover_endpoints()
        
        # Discover frontend features
        self.discover_components()
        
        # Analyze and report
        self.analyze_features()
        self.update_registry()
        
    def discover_models(self):
        """Discover all database models"""
        print("\n📊 Discovering Models...")
        models_dir = self.backend_root / "models"
        
        if not models_dir.exists():
            print("  ⚠️  Models directory not found")
            return
            
        for py_file in models_dir.glob("*.py"):
            if py_file.name.startswith("__"):
                continue
                
            try:
                with open(py_file, 'r') as f:
                    content = f.read()
                    
                # Parse AST to find class definitions
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        # Check if it's a SQLAlchemy model
                        if any(base.id == 'Base' for base in node.bases if hasattr(base, 'id')):
                            model_name = node.name
                            # Extract docstring
                            docstring = ast.get_docstring(node) or f"{model_name} model"
                            
                            self.discovered_features["models"][model_name] = {
                                "file": str(py_file.relative_to(self.backend_root)),
                                "description": docstring.split('\n')[0],
                                "fields": self._extract_model_fields(node)
                            }
                            print(f"  ✓ Found model: {model_name}")
                            
            except Exception as e:
                print(f"  ❌ Error parsing {py_file.name}: {e}")
                
    def discover_services(self):
        """Discover all service classes"""
        print("\n🔧 Discovering Services...")
        services_dir = self.backend_root / "services"
        
        if not services_dir.exists():
            print("  ⚠️  Services directory not found")
            return
            
        for py_file in services_dir.glob("*.py"):
            if py_file.name.startswith("__"):
                continue
                
            try:
                with open(py_file, 'r') as f:
                    content = f.read()
                    
                # Parse AST to find service classes
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        if 'Service' in node.name or 'Manager' in node.name:
                            service_name = node.name
                            docstring = ast.get_docstring(node) or f"{service_name} service"
                            
                            # Extract key methods
                            methods = []
                            for item in node.body:
                                if isinstance(item, ast.FunctionDef) and not item.name.startswith('_'):
                                    methods.append(item.name)
                            
                            self.discovered_features["services"][service_name] = {
                                "file": str(py_file.relative_to(self.backend_root)),
                                "description": docstring.split('\n')[0],
                                "methods": methods[:5]  # First 5 public methods
                            }
                            print(f"  ✓ Found service: {service_name}")
                            
            except Exception as e:
                print(f"  ❌ Error parsing {py_file.name}: {e}")
                
    def discover_endpoints(self):
        """Discover all API endpoints"""
        print("\n🌐 Discovering API Endpoints...")
        routers_dir = self.backend_root / "routers"
        api_dir = self.backend_root / "api" / "v1" / "endpoints"
        
        for search_dir in [routers_dir, api_dir]:
            if not search_dir.exists():
                continue
                
            for py_file in search_dir.glob("*.py"):
                if py_file.name.startswith("__"):
                    continue
                    
                try:
                    with open(py_file, 'r') as f:
                        content = f.read()
                        
                    # Find router definitions
                    router_match = re.search(r'router\s*=\s*APIRouter\s*\([^)]*prefix\s*=\s*["\']([^"\']+)', content)
                    if router_match:
                        prefix = router_match.group(1)
                        
                        # Find all endpoint decorators
                        endpoint_pattern = r'@router\.(get|post|put|delete|patch)\s*\(["\']([^"\']+)'
                        endpoints = re.findall(endpoint_pattern, content)
                        
                        for method, path in endpoints:
                            full_path = f"{prefix}{path}" if path != "/" else prefix
                            endpoint_key = f"{method.upper()} {full_path}"
                            
                            # Try to find the function name and docstring
                            func_pattern = rf'@router\.{method}\s*\([^)]*\)\s*(?:@[^\n]*\n)*def\s+(\w+)'
                            func_match = re.search(func_pattern, content)
                            func_name = func_match.group(1) if func_match else "unknown"
                            
                            self.discovered_features["endpoints"][endpoint_key] = {
                                "file": str(py_file.relative_to(self.backend_root)),
                                "method": method.upper(),
                                "path": full_path,
                                "function": func_name
                            }
                            
                        print(f"  ✓ Found router: {prefix} with {len(endpoints)} endpoints")
                        
                except Exception as e:
                    print(f"  ❌ Error parsing {py_file.name}: {e}")
                    
    def discover_components(self):
        """Discover all React components"""
        print("\n⚛️  Discovering Frontend Components...")
        components_dir = self.frontend_root / "components"
        app_dir = self.frontend_root / "app"
        
        for search_dir in [components_dir, app_dir]:
            if not search_dir.exists():
                continue
                
            for tsx_file in search_dir.rglob("*.tsx"):
                if "node_modules" in str(tsx_file):
                    continue
                    
                try:
                    with open(tsx_file, 'r') as f:
                        content = f.read()
                        
                    # Find React component definitions
                    # Function components
                    func_pattern = r'(?:export\s+)?(?:const|function)\s+(\w+)(?::\s*\w+)?\s*=?\s*(?:\([^)]*\)|[^=]*)\s*(?:=>|{)'
                    components = re.findall(func_pattern, content)
                    
                    # Filter to likely component names (PascalCase)
                    components = [c for c in components if c[0].isupper()]
                    
                    for component in components:
                        self.discovered_features["components"][component] = {
                            "file": str(tsx_file.relative_to(self.frontend_root)),
                            "type": "React Component"
                        }
                        
                    if components:
                        print(f"  ✓ Found {len(components)} components in {tsx_file.name}")
                        
                except Exception as e:
                    print(f"  ❌ Error parsing {tsx_file.name}: {e}")
                    
    def _extract_model_fields(self, class_node: ast.ClassDef) -> List[str]:
        """Extract field names from a SQLAlchemy model"""
        fields = []
        for node in class_node.body:
            if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
                fields.append(node.target.id)
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        # Check if it's a Column definition
                        if isinstance(node.value, ast.Call) and hasattr(node.value.func, 'id'):
                            if node.value.func.id == 'Column' or 'relationship' in str(node.value.func):
                                fields.append(target.id)
        return fields[:10]  # First 10 fields
        
    def analyze_features(self):
        """Analyze discovered features for patterns and duplicates"""
        print("\n📊 Analysis Summary:")
        print("=" * 60)
        
        # Count features
        for category, features in self.discovered_features.items():
            if features:
                print(f"\n{category.upper()}:")
                print(f"  Total: {len(features)}")
                
                # Look for potential duplicates
                names = list(features.keys())
                duplicates = self._find_similar_names(names)
                if duplicates:
                    print(f"  ⚠️  Potential duplicates:")
                    for orig, similar in duplicates:
                        print(f"    - {orig} ≈ {similar}")
                        
    def _find_similar_names(self, names: List[str]) -> List[Tuple[str, str]]:
        """Find potentially duplicate names"""
        duplicates = []
        normalized = {}
        
        for name in names:
            # Normalize name
            norm = name.lower().replace('_', '').replace('-', '')
            if norm in normalized:
                duplicates.append((normalized[norm], name))
            else:
                normalized[norm] = name
                
        return duplicates
        
    def update_registry(self):
        """Update the feature registry with discovered features"""
        print("\n💾 Updating Feature Registry...")
        
        added_count = 0
        
        # Models
        for model_name, details in self.discovered_features["models"].items():
            if not self.registry_manager.check_feature(model_name, "models"):
                success = self.registry_manager.add_feature(
                    model_name,
                    "models",
                    details["file"],
                    details["description"]
                )
                if success:
                    added_count += 1
                    
        # Services
        for service_name, details in self.discovered_features["services"].items():
            if not self.registry_manager.check_feature(service_name, "services"):
                success = self.registry_manager.add_feature(
                    service_name,
                    "services",
                    details["file"],
                    details["description"]
                )
                if success:
                    added_count += 1
                    
        # Components (sample - don't add all)
        component_count = 0
        for component_name, details in self.discovered_features["components"].items():
            if component_count < 20:  # Only register first 20 components
                if not self.registry_manager.check_feature(component_name, "components"):
                    success = self.registry_manager.add_feature(
                        component_name,
                        "components",
                        details["file"],
                        details["type"]
                    )
                    if success:
                        added_count += 1
                        component_count += 1
                        
        print(f"\n✅ Added {added_count} new features to registry")
        
    def export_discovery(self, filename: str = "feature_discovery.json"):
        """Export discovered features to a JSON file"""
        output_path = self.backend_root / filename
        
        with open(output_path, 'w') as f:
            json.dump({
                "discovery_date": datetime.now().isoformat(),
                "features": self.discovered_features
            }, f, indent=2)
            
        print(f"\n📁 Discovery results exported to: {output_path}")


def main():
    """Run feature discovery"""
    discovery = FeatureDiscovery()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "models":
            discovery.discover_models()
        elif sys.argv[1] == "services":
            discovery.discover_services()
        elif sys.argv[1] == "endpoints":
            discovery.discover_endpoints()
        elif sys.argv[1] == "components":
            discovery.discover_components()
        elif sys.argv[1] == "export":
            discovery.discover_all()
            discovery.export_discovery()
        else:
            print(f"Unknown command: {sys.argv[1]}")
            print("Usage: python discover_features.py [models|services|endpoints|components|export]")
    else:
        discovery.discover_all()


if __name__ == "__main__":
    main()