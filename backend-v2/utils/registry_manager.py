#!/usr/bin/env python3
"""
Feature Registry Manager - Helps track migrated features
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional


class RegistryManager:
    """Manages the feature registry for tracking migrations"""
    
    def __init__(self):
        self.registry_path = Path(__file__).parent.parent / "feature_registry.json"
        self.registry = self._load_registry()
    
    def _load_registry(self) -> dict:
        """Load the feature registry"""
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
        """Save the registry to disk"""
        with open(self.registry_path, 'w') as f:
            json.dump(self.registry, f, indent=2)
    
    def list_features(self, feature_type: Optional[str] = None):
        """List all registered features"""
        if feature_type:
            features = self.registry.get(feature_type, {})
            print(f"\n=== {feature_type.title()} ===")
            for name, details in features.items():
                print(f"  • {name}: {details['description']}")
        else:
            for f_type, features in self.registry.items():
                if features:
                    print(f"\n=== {f_type.title()} ===")
                    for name, details in features.items():
                        print(f"  • {name}: {details['description']}")
    
    def check_feature(self, name: str, feature_type: Optional[str] = None):
        """Check if a feature exists in the registry"""
        found = False
        
        if feature_type:
            if name in self.registry.get(feature_type, {}):
                details = self.registry[feature_type][name]
                print(f"\n✅ Found in {feature_type}: {name}")
                print(f"   Description: {details['description']}")
                print(f"   Location: {details['migrated_to']}")
                print(f"   Migrated: {details['timestamp']}")
                found = True
        else:
            # Search all types
            for f_type, features in self.registry.items():
                if name in features:
                    details = features[name]
                    print(f"\n✅ Found in {f_type}: {name}")
                    print(f"   Description: {details['description']}")
                    print(f"   Location: {details['migrated_to']}")
                    print(f"   Migrated: {details['timestamp']}")
                    found = True
        
        if not found:
            print(f"\n❌ Feature '{name}' not found in registry")
            print("   This feature has not been migrated yet.")
        
        return found
    
    def add_feature(self, name: str, feature_type: str, location: str, description: str):
        """Add a new feature to the registry"""
        if feature_type not in self.registry:
            print(f"❌ Invalid feature type: {feature_type}")
            print(f"   Valid types: {', '.join(self.registry.keys())}")
            return False
        
        if name in self.registry[feature_type]:
            print(f"❌ Feature '{name}' already exists in {feature_type}")
            return False
        
        self.registry[feature_type][name] = {
            "migrated_from": "original",
            "migrated_to": location,
            "timestamp": datetime.now().strftime("%Y-%m-%d"),
            "description": description
        }
        
        self._save_registry()
        print(f"✅ Added {feature_type} '{name}' to registry")
        return True
    
    def search_similar(self, search_term: str):
        """Search for features with similar names"""
        results = []
        search_lower = search_term.lower()
        
        for f_type, features in self.registry.items():
            for name in features:
                name_lower = name.lower()
                if (search_lower in name_lower or 
                    name_lower in search_lower or
                    name_lower.replace('_', '') == search_lower.replace('_', '')):
                    results.append((f_type, name))
        
        if results:
            print(f"\n🔍 Similar features found for '{search_term}':")
            for f_type, name in results:
                details = self.registry[f_type][name]
                print(f"  • {f_type}/{name}: {details['description']}")
        else:
            print(f"\n❌ No similar features found for '{search_term}'")
        
        return results


def main():
    """CLI interface for registry management"""
    manager = RegistryManager()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python registry_manager.py list [type]")
        print("  python registry_manager.py check <name> [type]")
        print("  python registry_manager.py add <name> <type> <location> <description>")
        print("  python registry_manager.py search <term>")
        return
    
    command = sys.argv[1]
    
    if command == "list":
        feature_type = sys.argv[2] if len(sys.argv) > 2 else None
        manager.list_features(feature_type)
    
    elif command == "check":
        if len(sys.argv) < 3:
            print("Error: Please provide a feature name")
            return
        name = sys.argv[2]
        feature_type = sys.argv[3] if len(sys.argv) > 3 else None
        manager.check_feature(name, feature_type)
    
    elif command == "add":
        if len(sys.argv) < 6:
            print("Error: Please provide name, type, location, and description")
            return
        name = sys.argv[2]
        feature_type = sys.argv[3]
        location = sys.argv[4]
        description = " ".join(sys.argv[5:])
        manager.add_feature(name, feature_type, location, description)
    
    elif command == "search":
        if len(sys.argv) < 3:
            print("Error: Please provide a search term")
            return
        search_term = sys.argv[2]
        manager.search_similar(search_term)
    
    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()