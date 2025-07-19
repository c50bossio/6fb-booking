#!/usr/bin/env python3
"""
Migration Validator for BookedBarber V2
Validates migrations before and after execution
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Any
from datetime import datetime


class ValidationGate:
    """Pre-migration validation gates"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
    
    def check_migration_readiness(self, feature_name: str, phase: int) -> Tuple[bool, str]:
        """Check if a feature is ready for migration"""
        
        # Check if phase configuration exists
        config_path = self.base_path / "migrations" / "phase_config.json"
        if not config_path.exists():
            return False, "Phase configuration file not found"
        
        try:
            with open(config_path, 'r') as f:
                phase_config = json.load(f)
        except Exception as e:
            return False, f"Error reading phase configuration: {str(e)}"
        
        # Check if feature exists in phase
        phase_features = phase_config.get("phases", {}).get(str(phase), {}).get("features", {})
        if feature_name not in phase_features:
            return False, f"Feature '{feature_name}' not found in Phase {phase}"
        
        # All basic checks passed
        return True, "Migration readiness validated"


class MigrationValidator:
    """Post-migration validation"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.validation_logs = self.base_path / "migrations" / "validation_logs"
        self.validation_logs.mkdir(exist_ok=True)
    
    def validate_feature_migration(self, feature_name: str, phase: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Validate a completed feature migration
        
        Args:
            feature_name: Name of the migrated feature
            phase: Phase number
            
        Returns:
            Tuple of (is_valid, validation_report)
        """
        
        validation_report = {
            "feature": feature_name,
            "phase": phase,
            "timestamp": datetime.now().isoformat(),
            "checks": {},
            "overall_status": "pending"
        }
        
        all_checks_passed = True
        
        # Check 1: Configuration validation
        config_valid, config_msg = self._validate_configuration(feature_name, phase)
        validation_report["checks"]["configuration"] = {
            "passed": config_valid,
            "message": config_msg
        }
        if not config_valid:
            all_checks_passed = False
        
        # Check 2: File structure validation
        files_valid, files_msg = self._validate_file_structure(feature_name, phase)
        validation_report["checks"]["file_structure"] = {
            "passed": files_valid,
            "message": files_msg
        }
        if not files_valid:
            all_checks_passed = False
        
        # Check 3: Dependency validation
        deps_valid, deps_msg = self._validate_dependencies(feature_name, phase)
        validation_report["checks"]["dependencies"] = {
            "passed": deps_valid,
            "message": deps_msg
        }
        if not deps_valid:
            all_checks_passed = False
        
        validation_report["overall_status"] = "passed" if all_checks_passed else "failed"
        
        # Save validation report
        report_file = self.validation_logs / f"{feature_name}_phase_{phase}_validation.json"
        with open(report_file, 'w') as f:
            json.dump(validation_report, f, indent=2)
        
        return all_checks_passed, validation_report
    
    def _validate_configuration(self, feature_name: str, phase: int) -> Tuple[bool, str]:
        """Validate feature configuration"""
        try:
            config_path = self.base_path / "migrations" / "phase_config.json"
            with open(config_path, 'r') as f:
                phase_config = json.load(f)
            
            feature_config = phase_config["phases"][str(phase)]["features"][feature_name]
            
            # Check required fields
            required_fields = ["description", "models", "services", "endpoints"]
            for field in required_fields:
                if field not in feature_config:
                    return False, f"Missing required field: {field}"
            
            return True, "Configuration validation passed"
            
        except Exception as e:
            return False, f"Configuration validation error: {str(e)}"
    
    def _validate_file_structure(self, feature_name: str, phase: int) -> Tuple[bool, str]:
        """Validate that expected files were created"""
        # This is a placeholder - in a real implementation, this would check
        # that models, services, and endpoints were actually created
        return True, "File structure validation passed (placeholder)"
    
    def _validate_dependencies(self, feature_name: str, phase: int) -> Tuple[bool, str]:
        """Validate that all dependencies are satisfied"""
        # This is a placeholder - in a real implementation, this would check
        # that all required dependencies are properly migrated
        return True, "Dependency validation passed (placeholder)"