#!/usr/bin/env python3
"""
Duplication Detector for BookedBarber V2 Migration
Prevents duplicate code creation during migration
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Any
from datetime import datetime


class DuplicationDetector:
    """Detects and prevents duplication during migration"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.registry_file = self.base_path / "migrations" / "feature_registry.json"
        self._ensure_registry()
    
    def _ensure_registry(self):
        """Ensure feature registry exists"""
        if not self.registry_file.exists():
            self.registry_file.parent.mkdir(exist_ok=True)
            initial_registry = {
                "features": {},
                "last_updated": datetime.now().isoformat(),
                "version": "1.0"
            }
            with open(self.registry_file, 'w') as f:
                json.dump(initial_registry, f, indent=2)
    
    def check_feature(self, feature_name: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if a feature already exists
        
        Args:
            feature_name: Name of the feature to check
            
        Returns:
            Tuple of (is_duplicate, feature_info)
        """
        with open(self.registry_file, 'r') as f:
            registry = json.load(f)
        
        if feature_name in registry["features"]:
            return True, registry["features"][feature_name]
        
        return False, {}
    
    def register_feature(self, feature_name: str, feature_info: Dict[str, Any]):
        """Register a migrated feature"""
        with open(self.registry_file, 'r') as f:
            registry = json.load(f)
        
        registry["features"][feature_name] = {
            **feature_info,
            "migrated_at": datetime.now().isoformat()
        }
        registry["last_updated"] = datetime.now().isoformat()
        
        with open(self.registry_file, 'w') as f:
            json.dump(registry, f, indent=2)
    
    def get_migration_status(self) -> Dict[str, Any]:
        """Get overall migration status"""
        with open(self.registry_file, 'r') as f:
            registry = json.load(f)
        
        features = registry.get("features", {})
        
        # Count different types of migrated components
        total_models = sum(len(f.get("models", [])) for f in features.values())
        total_services = sum(len(f.get("services", [])) for f in features.values())
        total_endpoints = sum(len(f.get("endpoints", [])) for f in features.values())
        
        return {
            "total_migrated": len(features),
            "total_models": total_models,
            "total_services": total_services,
            "total_endpoints": total_endpoints,
            "features": features,
            "last_updated": registry.get("last_updated", "never")
        }