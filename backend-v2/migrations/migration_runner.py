"""
Automated Migration Runner for V2 Migration
Orchestrates the migration process with safety checks
"""

import os
import sys
import json
import subprocess
import argparse
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from pathlib import Path
import importlib.util
import traceback

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from utils.duplication_detector import DuplicationDetector


class MigrationRunner:
    """Orchestrates feature migration with safety checks"""
    
    def __init__(self, phase: int, dry_run: bool = False):
        self.phase = phase
        self.dry_run = dry_run
        self.detector = DuplicationDetector()
        self.base_path = Path(__file__).parent.parent
        self.migrations_path = self.base_path / "migrations"
        self.log_path = self.migrations_path / "migration_logs"
        self.log_path.mkdir(exist_ok=True)
        
        # Load phase configuration
        self.phase_config = self._load_phase_config()
    
    def _load_phase_config(self) -> Dict:
        """Load configuration for migration phases"""
        config_path = self.migrations_path / "phase_config.json"
        
        if not config_path.exists():
            # Create default configuration
            default_config = {
                "phases": {
                    "1": {
                        "name": "Core Features",
                        "features": {
                            "enhanced_auth": {
                                "description": "Enhanced authentication with MFA and RBAC",
                                "dependencies": [],
                                "models": ["User", "MFASettings", "Role", "Permission"],
                                "services": ["AuthService", "RBACService", "MFAService"],
                                "endpoints": ["/auth/login", "/auth/register", "/auth/mfa"]
                            },
                            "advanced_booking": {
                                "description": "Advanced booking with rules and recurring appointments",
                                "dependencies": ["enhanced_auth"],
                                "models": ["Service", "ServiceCategory", "BookingRule", "RecurringAppointment"],
                                "services": ["BookingService", "AvailabilityService", "RecurringService"],
                                "endpoints": ["/bookings", "/services", "/availability"]
                            },
                            "client_management": {
                                "description": "Client profiles and preferences",
                                "dependencies": ["enhanced_auth"],
                                "models": ["Client", "ClientPreference", "ClientNote"],
                                "services": ["ClientService", "PreferenceService"],
                                "endpoints": ["/clients", "/clients/{id}/preferences"]
                            }
                        }
                    },
                    "2": {
                        "name": "Calendar & Scheduling",
                        "features": {
                            "unified_calendar": {
                                "description": "Unified calendar with drag-and-drop",
                                "dependencies": ["advanced_booking", "client_management"],
                                "models": ["CalendarEvent", "CalendarSettings"],
                                "services": ["CalendarService", "DragDropService"],
                                "endpoints": ["/calendar", "/calendar/events"]
                            },
                            "google_calendar": {
                                "description": "Google Calendar integration",
                                "dependencies": ["unified_calendar"],
                                "models": ["GoogleCalendarSettings", "SyncLog"],
                                "services": ["GoogleCalendarService", "SyncService"],
                                "endpoints": ["/calendar/google/auth", "/calendar/google/sync"]
                            }
                        }
                    }
                }
            }
            
            with open(config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            
            return default_config
        
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def run_migration(self, feature_name: str) -> Tuple[bool, str]:
        """
        Run migration for a specific feature
        Returns: (success, message)
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = self.log_path / f"migration_{feature_name}_{timestamp}.log"
        
        try:
            # Phase 1: Pre-migration checks
            print(f"\n{'='*60}")
            print(f"Starting migration for: {feature_name}")
            print(f"Phase: {self.phase}")
            print(f"Dry run: {self.dry_run}")
            print(f"{'='*60}\n")
            
            # Check if feature exists in phase
            phase_features = self.phase_config["phases"].get(str(self.phase), {}).get("features", {})
            if feature_name not in phase_features:
                return False, f"Feature '{feature_name}' not found in phase {self.phase}"
            
            feature_config = phase_features[feature_name]
            
            # Check for duplicates
            is_duplicate, existing_info = self.detector.check_feature(feature_name)
            if is_duplicate:
                return False, f"Feature '{feature_name}' already migrated on {existing_info['date']}"
            
            # Check dependencies
            deps_ok, missing_deps = self.detector.check_dependencies(
                feature_name, 
                feature_config.get("dependencies", [])
            )
            if not deps_ok:
                return False, f"Missing dependencies: {', '.join(missing_deps)}"
            
            # Phase 2: Load migration script
            migration_script = self.migrations_path / f"phase_{self.phase}" / f"{feature_name}_migration.py"
            if not migration_script.exists():
                # Create migration script template
                self._create_migration_template(feature_name, feature_config)
                return False, f"Migration script created at {migration_script}. Please implement and run again."
            
            # Phase 3: Run migration (if not dry run)
            if self.dry_run:
                print("DRY RUN - Would execute:")
                print(f"  - Migration script: {migration_script}")
                print(f"  - Models: {', '.join(feature_config['models'])}")
                print(f"  - Services: {', '.join(feature_config['services'])}")
                print(f"  - Endpoints: {', '.join(feature_config['endpoints'])}")
                return True, "Dry run completed successfully"
            
            # Execute migration
            print("\nExecuting migration...")
            
            # Import and run migration module
            spec = importlib.util.spec_from_file_location(f"{feature_name}_migration", migration_script)
            migration_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration_module)
            
            # Run the migration
            migrator = migration_module.FeatureMigrator()
            migrator.migrate()
            
            # Phase 4: Run tests
            print("\nRunning tests...")
            test_result = self._run_tests(feature_name)
            if not test_result:
                return False, "Tests failed"
            
            # Phase 5: Register feature
            self.detector.register_feature(feature_name, {
                "endpoints": feature_config["endpoints"],
                "models": feature_config["models"],
                "services": feature_config["services"],
                "dependencies": feature_config["dependencies"]
            })
            
            # Log success
            with open(log_file, 'w') as f:
                f.write(f"Migration successful for {feature_name}\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"Phase: {self.phase}\n")
                f.write(json.dumps(feature_config, indent=2))
            
            return True, f"Migration completed successfully. Log: {log_file}"
            
        except Exception as e:
            error_msg = f"Migration failed: {str(e)}\n{traceback.format_exc()}"
            
            # Log error
            with open(log_file, 'w') as f:
                f.write(f"Migration FAILED for {feature_name}\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"Error: {error_msg}\n")
            
            return False, error_msg
    
    def _create_migration_template(self, feature_name: str, feature_config: Dict):
        """Create a migration script template"""
        phase_dir = self.migrations_path / f"phase_{self.phase}"
        phase_dir.mkdir(exist_ok=True)
        
        template = f'''"""
Migration script for {feature_name}
Auto-generated on {datetime.now().isoformat()}
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from models import Base
from database import engine, SessionLocal
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship


class FeatureMigrator:
    """Migrator for {feature_name}"""
    
    def __init__(self):
        self.feature_name = "{feature_name}"
        self.models = {feature_config.get('models', [])}
        self.services = {feature_config.get('services', [])}
        self.endpoints = {feature_config.get('endpoints', [])}
    
    def migrate(self):
        """Execute the migration"""
        print(f"Migrating {{self.feature_name}}...")
        
        # Step 1: Create/update models
        self._migrate_models()
        
        # Step 2: Migrate services
        self._migrate_services()
        
        # Step 3: Create endpoints
        self._migrate_endpoints()
        
        print(f"{{self.feature_name}} migration completed!")
    
    def _migrate_models(self):
        """Migrate database models"""
        print("Creating models...")
        
        # TODO: Implement model creation
        # Example:
        # class NewModel(Base):
        #     __tablename__ = "new_models"
        #     id = Column(Integer, primary_key=True)
        #     name = Column(String)
        
        # Create tables
        Base.metadata.create_all(bind=engine)
    
    def _migrate_services(self):
        """Migrate service layer"""
        print("Creating services...")
        
        # TODO: Implement service creation
        # Copy and adapt services from original codebase
    
    def _migrate_endpoints(self):
        """Migrate API endpoints"""
        print("Creating endpoints...")
        
        # TODO: Implement endpoint creation
        # Create router files and register with main app


if __name__ == "__main__":
    migrator = FeatureMigrator()
    migrator.migrate()
'''
        
        migration_script = phase_dir / f"{feature_name}_migration.py"
        with open(migration_script, 'w') as f:
            f.write(template)
    
    def _run_tests(self, feature_name: str) -> bool:
        """Run tests for the migrated feature"""
        test_file = self.base_path / "tests" / f"test_{feature_name}.py"
        
        if not test_file.exists():
            print(f"Warning: No tests found for {feature_name}")
            return True  # Allow migration without tests (with warning)
        
        # Run pytest
        result = subprocess.run(
            ["python", "-m", "pytest", str(test_file), "-v"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("Tests passed!")
            return True
        else:
            print("Tests failed!")
            print(result.stdout)
            print(result.stderr)
            return False
    
    def migrate_phase(self) -> Dict[str, Tuple[bool, str]]:
        """Migrate all features in the current phase"""
        phase_features = self.phase_config["phases"].get(str(self.phase), {}).get("features", {})
        results = {}
        
        for feature_name in phase_features:
            success, message = self.run_migration(feature_name)
            results[feature_name] = (success, message)
            
            if not success and not self.dry_run:
                print(f"\nMigration failed for {feature_name}. Stopping phase migration.")
                break
        
        return results
    
    def get_phase_status(self) -> Dict:
        """Get status of all features in the phase"""
        phase_features = self.phase_config["phases"].get(str(self.phase), {}).get("features", {})
        status = {
            "phase": self.phase,
            "phase_name": self.phase_config["phases"].get(str(self.phase), {}).get("name", "Unknown"),
            "features": {}
        }
        
        for feature_name in phase_features:
            is_migrated, info = self.detector.check_feature(feature_name)
            status["features"][feature_name] = {
                "migrated": is_migrated,
                "info": info
            }
        
        return status


def main():
    """Main entry point for migration runner"""
    parser = argparse.ArgumentParser(description="V2 Migration Runner")
    parser.add_argument("--phase", type=int, required=True, help="Migration phase (1-5)")
    parser.add_argument("--feature", type=str, help="Specific feature to migrate")
    parser.add_argument("--dry-run", action="store_true", help="Perform dry run without actual migration")
    parser.add_argument("--status", action="store_true", help="Show phase status")
    
    args = parser.parse_args()
    
    runner = MigrationRunner(phase=args.phase, dry_run=args.dry_run)
    
    if args.status:
        status = runner.get_phase_status()
        print(json.dumps(status, indent=2))
        return
    
    if args.feature:
        # Migrate specific feature
        success, message = runner.run_migration(args.feature)
        print(f"\nResult: {'SUCCESS' if success else 'FAILED'}")
        print(f"Message: {message}")
    else:
        # Migrate entire phase
        results = runner.migrate_phase()
        
        print("\n" + "="*60)
        print("PHASE MIGRATION SUMMARY")
        print("="*60)
        
        for feature, (success, message) in results.items():
            status = "✓" if success else "✗"
            print(f"{status} {feature}: {message}")


if __name__ == "__main__":
    main()