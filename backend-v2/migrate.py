#!/usr/bin/env python3
"""
Main Migration Orchestrator for BookedBarber.com V2
Coordinates the entire migration process with safety checks
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Tuple

# Add utils to path
sys.path.append(str(Path(__file__).parent))

from utils.duplication_detector import DuplicationDetector
from utils.migration_validator import MigrationValidator, ValidationGate
from utils.sub_agent_manager import SubAgentManager
from migrations.migration_runner import MigrationRunner


class MigrationOrchestrator:
    """Main orchestrator for the V2 migration process"""
    
    def __init__(self):
        self.detector = DuplicationDetector()
        self.validator = MigrationValidator()
        self.validation_gate = ValidationGate()
        self.agent_manager = SubAgentManager(max_agents=3)
        self.base_path = Path(__file__).parent
        self.reports_path = self.base_path / "migrations" / "reports"
        self.reports_path.mkdir(exist_ok=True)
    
    def status(self) -> Dict:
        """Get current migration status"""
        status = self.detector.get_migration_status()
        
        # Add phase information
        config_path = self.base_path / "migrations" / "phase_config.json"
        with open(config_path, 'r') as f:
            phase_config = json.load(f)
        
        phase_status = {}
        for phase_num, phase_data in phase_config["phases"].items():
            phase_features = phase_data["features"]
            migrated = sum(1 for f in phase_features if f in status["features"])
            phase_status[f"Phase {phase_num}"] = {
                "name": phase_data["name"],
                "progress": f"{migrated}/{len(phase_features)}",
                "percentage": round((migrated / len(phase_features)) * 100, 2)
            }
        
        status["phases"] = phase_status
        return status
    
    def check_duplication(self, feature_name: str) -> Tuple[bool, Dict]:
        """Check for potential duplications"""
        is_dup, info = self.detector.check_feature(feature_name)
        
        if is_dup:
            return True, {
                "status": "duplicate",
                "existing_feature": info,
                "message": f"Feature '{feature_name}' already migrated"
            }
        
        # Check for code similarity
        # This would need actual file paths to check
        return False, {"status": "clear", "message": "No duplications found"}
    
    def validate_feature(self, feature_name: str, phase: int) -> Tuple[bool, Dict]:
        """Validate a feature before/after migration"""
        return self.validator.validate_feature_migration(feature_name, phase)
    
    def plan_phase(self, phase: int) -> Dict:
        """Generate execution plan for a phase"""
        plan = self.agent_manager.get_parallel_execution_plan(phase)
        
        # Save plan report
        report_file = self.reports_path / f"phase_{phase}_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(plan, f, indent=2)
        
        return plan
    
    def migrate_feature(self, feature_name: str, phase: int, dry_run: bool = False) -> Tuple[bool, str]:
        """Migrate a single feature with all checks"""
        print(f"\n{'='*60}")
        print(f"Migrating Feature: {feature_name}")
        print(f"{'='*60}\n")
        
        # Step 1: Pre-migration validation
        print("Step 1: Pre-migration checks...")
        
        # Check duplication
        is_dup, dup_info = self.check_duplication(feature_name)
        if is_dup:
            return False, dup_info["message"]
        
        # Check migration readiness
        can_proceed, reason = self.validation_gate.check_migration_readiness(feature_name, phase)
        if not can_proceed:
            return False, f"Pre-validation failed: {reason}"
        
        # Step 2: Run migration
        print("\nStep 2: Running migration...")
        runner = MigrationRunner(phase=phase, dry_run=dry_run)
        success, message = runner.run_migration(feature_name)
        
        if not success:
            return False, f"Migration failed: {message}"
        
        # Step 3: Post-migration validation
        if not dry_run:
            print("\nStep 3: Post-migration validation...")
            is_valid, validation_report = self.validate_feature(feature_name, phase)
            
            if not is_valid:
                # Rollback would happen here
                return False, "Post-migration validation failed"
        
        return True, "Migration completed successfully"
    
    def migrate_phase(self, phase: int, dry_run: bool = False) -> Dict[str, Tuple[bool, str]]:
        """Migrate an entire phase"""
        print(f"\n{'='*60}")
        print(f"Starting Phase {phase} Migration")
        print(f"{'='*60}\n")
        
        # Generate execution plan
        plan = self.plan_phase(phase)
        print(f"Execution plan generated: {len(plan['agents'])} agents, {plan['total_tasks']} tasks\n")
        
        # Get features for the phase
        config_path = self.base_path / "migrations" / "phase_config.json"
        with open(config_path, 'r') as f:
            phase_config = json.load(f)
        
        phase_features = phase_config["phases"].get(str(phase), {}).get("features", {})
        results = {}
        
        # Migrate features in dependency order
        for feature_name in phase_features:
            success, message = self.migrate_feature(feature_name, phase, dry_run)
            results[feature_name] = (success, message)
            
            if not success and not dry_run:
                print(f"\nStopping phase migration due to failure in {feature_name}")
                break
        
        # Generate phase report
        self._generate_phase_report(phase, results)
        
        return results
    
    def _generate_phase_report(self, phase: int, results: Dict[str, Tuple[bool, str]]):
        """Generate a comprehensive phase migration report"""
        report = {
            "phase": phase,
            "timestamp": datetime.now().isoformat(),
            "results": {},
            "summary": {
                "total": len(results),
                "succeeded": sum(1 for s, _ in results.values() if s),
                "failed": sum(1 for s, _ in results.values() if not s)
            }
        }
        
        for feature, (success, message) in results.items():
            report["results"][feature] = {
                "success": success,
                "message": message
            }
        
        # Save report
        report_file = self.reports_path / f"phase_{phase}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Also create a markdown summary
        self._generate_markdown_report(phase, report)
    
    def _generate_markdown_report(self, phase: int, report: Dict):
        """Generate a human-readable markdown report"""
        md_content = f"# Phase {phase} Migration Report\n\n"
        md_content += f"**Generated**: {report['timestamp']}\n\n"
        
        md_content += "## Summary\n\n"
        md_content += f"- Total Features: {report['summary']['total']}\n"
        md_content += f"- Succeeded: {report['summary']['succeeded']}\n"
        md_content += f"- Failed: {report['summary']['failed']}\n\n"
        
        md_content += "## Feature Results\n\n"
        for feature, result in report["results"].items():
            status = "✅" if result["success"] else "❌"
            md_content += f"### {status} {feature}\n"
            md_content += f"- Status: {'Success' if result['success'] else 'Failed'}\n"
            md_content += f"- Message: {result['message']}\n\n"
        
        # Save markdown report
        md_file = self.reports_path / f"phase_{phase}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(md_file, 'w') as f:
            f.write(md_content)
    
    def generate_migration_dashboard(self):
        """Generate an overall migration dashboard"""
        status = self.status()
        
        dashboard = "# BookedBarber.com V2 Migration Dashboard\n\n"
        dashboard += f"**Last Updated**: {datetime.now().isoformat()}\n\n"
        
        dashboard += "## Overall Progress\n\n"
        dashboard += f"- Total Migrated Features: {status['total_migrated']}\n"
        dashboard += f"- Total Endpoints: {status['total_endpoints']}\n"
        dashboard += f"- Total Models: {status['total_models']}\n"
        dashboard += f"- Total Services: {status['total_services']}\n\n"
        
        dashboard += "## Phase Progress\n\n"
        for phase_name, phase_info in status["phases"].items():
            dashboard += f"### {phase_name}: {phase_info['name']}\n"
            dashboard += f"- Progress: {phase_info['progress']} ({phase_info['percentage']}%)\n"
            dashboard += f"- Status: {'✅ Complete' if phase_info['percentage'] == 100 else '🔄 In Progress'}\n\n"
        
        dashboard += "## Recent Migrations\n\n"
        # List recent migrations from the registry
        recent_features = sorted(
            status["features"].items(),
            key=lambda x: x[1]["date"],
            reverse=True
        )[:5]
        
        for feature, info in recent_features:
            dashboard += f"- **{feature}**: {info['date']}\n"
        
        # Save dashboard
        dashboard_file = self.base_path / "migrations" / "MIGRATION_DASHBOARD.md"
        with open(dashboard_file, 'w') as f:
            f.write(dashboard)
        
        return dashboard


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="BookedBarber.com V2 Migration Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check migration status
  python migrate.py status
  
  # Plan phase 1 migration
  python migrate.py plan --phase 1
  
  # Migrate a single feature (dry run)
  python migrate.py migrate --phase 1 --feature enhanced_auth --dry-run
  
  # Migrate entire phase
  python migrate.py migrate --phase 1
  
  # Validate a feature
  python migrate.py validate --phase 1 --feature enhanced_auth
  
  # Generate migration dashboard
  python migrate.py dashboard
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Show migration status")
    
    # Plan command
    plan_parser = subparsers.add_parser("plan", help="Generate execution plan")
    plan_parser.add_argument("--phase", type=int, required=True, help="Phase number (1-5)")
    
    # Migrate command
    migrate_parser = subparsers.add_parser("migrate", help="Run migration")
    migrate_parser.add_argument("--phase", type=int, required=True, help="Phase number (1-5)")
    migrate_parser.add_argument("--feature", type=str, help="Specific feature to migrate")
    migrate_parser.add_argument("--dry-run", action="store_true", help="Perform dry run")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate migration")
    validate_parser.add_argument("--phase", type=int, required=True, help="Phase number")
    validate_parser.add_argument("--feature", type=str, required=True, help="Feature to validate")
    
    # Dashboard command
    dashboard_parser = subparsers.add_parser("dashboard", help="Generate migration dashboard")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    orchestrator = MigrationOrchestrator()
    
    if args.command == "status":
        status = orchestrator.status()
        print(json.dumps(status, indent=2))
    
    elif args.command == "plan":
        plan = orchestrator.plan_phase(args.phase)
        print(f"\nExecution plan for Phase {args.phase}:")
        print(json.dumps(plan, indent=2))
        print(f"\nDetailed plans saved to: {orchestrator.agent_manager.task_log_path}")
    
    elif args.command == "migrate":
        if args.feature:
            # Migrate single feature
            success, message = orchestrator.migrate_feature(
                args.feature, args.phase, args.dry_run
            )
            print(f"\nResult: {'SUCCESS' if success else 'FAILED'}")
            print(f"Message: {message}")
        else:
            # Migrate entire phase
            results = orchestrator.migrate_phase(args.phase, args.dry_run)
            print("\n" + "="*60)
            print("MIGRATION SUMMARY")
            print("="*60)
            for feature, (success, message) in results.items():
                status = "✅" if success else "❌"
                print(f"{status} {feature}: {message}")
    
    elif args.command == "validate":
        is_valid, report = orchestrator.validate_feature(args.feature, args.phase)
        print(f"\nValidation Result: {'PASSED' if is_valid else 'FAILED'}")
        print("\nValidation Report:")
        print(json.dumps(report, indent=2))
    
    elif args.command == "dashboard":
        dashboard = orchestrator.generate_migration_dashboard()
        print(dashboard)
        print(f"\nDashboard saved to: {orchestrator.base_path / 'migrations' / 'MIGRATION_DASHBOARD.md'}")


if __name__ == "__main__":
    main()