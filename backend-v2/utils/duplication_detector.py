"""
Duplication Detection System for BookedBarber.com Migration
Prevents duplicate features, code, and conflicts during migration
"""

import os
import ast
import json
import hashlib
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict


class DuplicationDetector:
    """Detects and prevents duplicate features during migration"""
    
    def __init__(self, project_root: str = "/Users/bossio/6fb-booking"):
        self.project_root = Path(project_root)
        self.v2_backend = self.project_root / "backend-v2"
        self.v2_frontend = self.project_root / "backend-v2" / "frontend-v2"
        self.original_backend = self.project_root / "backend"
        self.original_frontend = self.project_root / "frontend"
        
        # Feature registry to track what's already migrated
        self.registry_path = self.v2_backend / "feature_registry.json"
        self.feature_registry = self._load_registry()
        
        # Code signature cache to detect duplicates
        self.code_signatures = {}
        
    def _load_registry(self) -> Dict:
        """Load existing feature registry or create new one"""
        if self.registry_path.exists():
            with open(self.registry_path, 'r') as f:
                return json.load(f)
        return {
            "features": {},
            "models": {},
            "endpoints": {},
            "components": {},
            "services": {}
        }
    
    def _save_registry(self):
        """Save feature registry to disk"""
        with open(self.registry_path, 'w') as f:
            json.dump(self.feature_registry, f, indent=2)
    
    def check_feature_exists(self, feature_name: str, feature_type: str = "features") -> bool:
        """Check if a feature already exists in v2"""
        return feature_name in self.feature_registry.get(feature_type, {})
    
    def register_feature(self, feature_name: str, feature_type: str, metadata: Dict):
        """Register a newly migrated feature"""
        if feature_type not in self.feature_registry:
            self.feature_registry[feature_type] = {}
        
        self.feature_registry[feature_type][feature_name] = {
            "migrated_from": metadata.get("source_path", ""),
            "migrated_to": metadata.get("target_path", ""),
            "timestamp": metadata.get("timestamp", ""),
            "description": metadata.get("description", "")
        }
        self._save_registry()
    
    def find_duplicate_models(self) -> List[Tuple[str, List[str]]]:
        """Find duplicate model definitions across the codebase"""
        models = defaultdict(list)
        
        # Scan v2 models
        v2_models = self.v2_backend / "models.py"
        if v2_models.exists():
            models.update(self._extract_models_from_file(v2_models))
        
        # Check for duplicates
        duplicates = []
        for model_name, locations in models.items():
            if len(locations) > 1:
                duplicates.append((model_name, locations))
        
        return duplicates
    
    def _extract_models_from_file(self, file_path: Path) -> Dict[str, List[str]]:
        """Extract model class names from a Python file"""
        models = defaultdict(list)
        try:
            with open(file_path, 'r') as f:
                tree = ast.parse(f.read())
            
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    # Check if it's a SQLAlchemy model
                    for base in node.bases:
                        if isinstance(base, ast.Name) and base.id in ['Base', 'db.Model']:
                            models[node.name].append(str(file_path))
                        elif isinstance(base, ast.Attribute) and base.attr == 'Model':
                            models[node.name].append(str(file_path))
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
        
        return models
    
    def find_duplicate_endpoints(self) -> List[Tuple[str, List[str]]]:
        """Find duplicate API endpoints"""
        endpoints = defaultdict(list)
        
        # Scan v2 routers
        routers_dir = self.v2_backend / "routers"
        if routers_dir.exists():
            for router_file in routers_dir.glob("*.py"):
                endpoints.update(self._extract_endpoints_from_file(router_file))
        
        # Check main.py for routes
        main_file = self.v2_backend / "main.py"
        if main_file.exists():
            endpoints.update(self._extract_endpoints_from_file(main_file))
        
        # Find duplicates
        duplicates = []
        for endpoint, locations in endpoints.items():
            if len(locations) > 1:
                duplicates.append((endpoint, locations))
        
        return duplicates
    
    def _extract_endpoints_from_file(self, file_path: Path) -> Dict[str, List[str]]:
        """Extract API endpoints from a Python file"""
        endpoints = defaultdict(list)
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Simple pattern matching for FastAPI decorators
            import re
            patterns = [
                r'@\w+\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']',
                r'@app\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for method, path in matches:
                    endpoint_key = f"{method.upper()} {path}"
                    endpoints[endpoint_key].append(str(file_path))
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
        
        return endpoints
    
    def find_duplicate_components(self) -> List[Tuple[str, List[str]]]:
        """Find duplicate React components"""
        components = defaultdict(list)
        
        # Scan v2 frontend components
        if self.v2_frontend.exists():
            src_dir = self.v2_frontend / "src"
            if src_dir.exists():
                for tsx_file in src_dir.rglob("*.tsx"):
                    components.update(self._extract_components_from_file(tsx_file))
        
        # Find duplicates
        duplicates = []
        for component_name, locations in components.items():
            if len(locations) > 1:
                duplicates.append((component_name, locations))
        
        return duplicates
    
    def _extract_components_from_file(self, file_path: Path) -> Dict[str, List[str]]:
        """Extract React component names from a TypeScript file"""
        components = defaultdict(list)
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Pattern for function components and class components
            import re
            patterns = [
                r'export\s+(?:default\s+)?function\s+(\w+)',
                r'export\s+(?:default\s+)?const\s+(\w+)\s*[:=]\s*(?:\([^)]*\)|[^=]+)\s*=>',
                r'export\s+(?:default\s+)?class\s+(\w+)\s+extends\s+(?:React\.)?Component',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for component_name in matches:
                    components[component_name].append(str(file_path))
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
        
        return components
    
    def calculate_code_similarity(self, code1: str, code2: str) -> float:
        """Calculate similarity between two code snippets (0-1)"""
        # Simple approach using set similarity of tokens
        tokens1 = set(code1.split())
        tokens2 = set(code2.split())
        
        if not tokens1 or not tokens2:
            return 0.0
        
        intersection = tokens1.intersection(tokens2)
        union = tokens1.union(tokens2)
        
        return len(intersection) / len(union) if union else 0.0
    
    def check_before_migration(self, feature_name: str, feature_type: str) -> Dict[str, any]:
        """Comprehensive check before migrating a feature"""
        issues = {
            "already_exists": False,
            "has_duplicates": False,
            "conflicts": [],
            "warnings": [],
            "can_proceed": True
        }
        
        # Check if feature already registered
        if self.check_feature_exists(feature_name, feature_type):
            issues["already_exists"] = True
            issues["can_proceed"] = False
            issues["conflicts"].append(f"{feature_type} '{feature_name}' already migrated")
        
        # Check for duplicates based on type
        if feature_type == "models":
            duplicates = self.find_duplicate_models()
            for model_name, locations in duplicates:
                if model_name.lower() == feature_name.lower():
                    issues["has_duplicates"] = True
                    issues["conflicts"].append(f"Model '{model_name}' found in multiple locations: {locations}")
        
        elif feature_type == "endpoints":
            duplicates = self.find_duplicate_endpoints()
            for endpoint, locations in duplicates:
                if feature_name in endpoint:
                    issues["has_duplicates"] = True
                    issues["conflicts"].append(f"Endpoint '{endpoint}' found in multiple locations: {locations}")
        
        elif feature_type == "components":
            duplicates = self.find_duplicate_components()
            for component_name, locations in duplicates:
                if component_name.lower() == feature_name.lower():
                    issues["has_duplicates"] = True
                    issues["conflicts"].append(f"Component '{component_name}' found in multiple locations: {locations}")
        
        # Add warnings for similar names
        similar_features = self._find_similar_names(feature_name, feature_type)
        if similar_features:
            issues["warnings"].append(f"Similar {feature_type} found: {similar_features}")
        
        # Determine if safe to proceed
        if issues["already_exists"] or issues["has_duplicates"]:
            issues["can_proceed"] = False
        
        return issues
    
    def _find_similar_names(self, name: str, feature_type: str) -> List[str]:
        """Find features with similar names that might be duplicates"""
        similar = []
        registry = self.feature_registry.get(feature_type, {})
        
        name_lower = name.lower()
        for existing_name in registry:
            existing_lower = existing_name.lower()
            
            # Check for common duplicate patterns
            if (name_lower in existing_lower or 
                existing_lower in name_lower or
                name_lower.replace('enhanced', '') == existing_lower.replace('enhanced', '') or
                name_lower.replace('simple', '') == existing_lower.replace('simple', '') or
                name_lower.replace('v2', '') == existing_lower.replace('v2', '')):
                similar.append(existing_name)
        
        return similar
    
    def generate_report(self) -> str:
        """Generate a comprehensive duplication report"""
        report = ["=== Duplication Detection Report ===\n"]
        
        # Check models
        model_duplicates = self.find_duplicate_models()
        report.append(f"Models: {len(model_duplicates)} duplicates found")
        for model_name, locations in model_duplicates:
            report.append(f"  - {model_name}: {', '.join(locations)}")
        
        # Check endpoints
        endpoint_duplicates = self.find_duplicate_endpoints()
        report.append(f"\nEndpoints: {len(endpoint_duplicates)} duplicates found")
        for endpoint, locations in endpoint_duplicates:
            report.append(f"  - {endpoint}: {', '.join(locations)}")
        
        # Check components
        component_duplicates = self.find_duplicate_components()
        report.append(f"\nComponents: {len(component_duplicates)} duplicates found")
        for component_name, locations in component_duplicates:
            report.append(f"  - {component_name}: {', '.join(locations)}")
        
        # Registry summary
        report.append(f"\n=== Feature Registry Summary ===")
        for feature_type, features in self.feature_registry.items():
            if features:
                report.append(f"{feature_type}: {len(features)} registered")
        
        return "\n".join(report)


# Helper functions for use in migration scripts
def check_before_adding(feature_name: str, feature_type: str = "features") -> bool:
    """Quick check function for migration scripts"""
    detector = DuplicationDetector()
    result = detector.check_before_migration(feature_name, feature_type)
    
    if not result["can_proceed"]:
        print(f"❌ Cannot migrate {feature_type} '{feature_name}':")
        for conflict in result["conflicts"]:
            print(f"   - {conflict}")
        return False
    
    if result["warnings"]:
        print(f"⚠️  Warnings for {feature_type} '{feature_name}':")
        for warning in result["warnings"]:
            print(f"   - {warning}")
    
    print(f"✅ Safe to migrate {feature_type} '{feature_name}'")
    return True


if __name__ == "__main__":
    # Test the duplication detector
    detector = DuplicationDetector()
    print(detector.generate_report())