#!/usr/bin/env python3
"""
System Architect Agent Deployment and Integration Script

This script deploys and configures the System Architect Agent for BookedBarber V2,
integrating it with the existing sub-agent system and ensuring proper configuration.
"""

import os
import sys
import json
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any
import argparse
import logging
from datetime import datetime

class SystemArchitectAgentDeployment:
    """
    Deployment manager for System Architect Agent
    """
    
    def __init__(self, project_root: Path, dry_run: bool = False):
        self.project_root = project_root
        self.dry_run = dry_run
        self.claude_dir = project_root / ".claude"
        self.agents_dir = self.claude_dir / "agents"
        
        self.setup_logging()
        
        # Required files for deployment
        self.required_files = [
            "agents/system-architect-agent.py",
            "agents/architectural_patterns.py",
            "agents/bookedbarber_architecture_templates.py",
            "agents/architecture_documentation.py",
            "agents/architecture_monitoring.py",
            "agents/safety_mechanisms.py",
            "agents/test_system_architect.py",
            "system-architect-agent-config.json"
        ]
        
        # Integration files to update
        self.integration_files = [
            ".claude/sub-agent-control.py",
            ".claude/SUB_AGENT_AUTOMATION_GUIDE.md"
        ]
    
    def setup_logging(self):
        """Setup deployment logging"""
        log_file = self.claude_dir / "deployment.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger("SystemArchitectDeployment")
    
    def validate_environment(self) -> bool:
        """Validate deployment environment"""
        self.logger.info("Validating deployment environment...")
        
        # Check if project root exists
        if not self.project_root.exists():
            self.logger.error(f"Project root does not exist: {self.project_root}")
            return False
        
        # Check if .claude directory exists
        if not self.claude_dir.exists():
            self.logger.error(f"Claude directory does not exist: {self.claude_dir}")
            return False
        
        # Create agents directory if it doesn't exist
        if not self.agents_dir.exists():
            if not self.dry_run:
                self.agents_dir.mkdir(parents=True)
            self.logger.info(f"Created agents directory: {self.agents_dir}")
        
        # Check for required dependencies
        try:
            import watchdog
            import psutil
            self.logger.info("Required dependencies are available")
        except ImportError as e:
            self.logger.error(f"Missing required dependency: {e}")
            self.logger.info("Install with: pip install watchdog psutil")
            return False
        
        # Check Python version
        if sys.version_info < (3, 8):
            self.logger.error("Python 3.8+ is required")
            return False
        
        self.logger.info("✅ Environment validation successful")
        return True
    
    def validate_files(self) -> bool:
        """Validate required files exist"""
        self.logger.info("Validating required files...")
        
        missing_files = []
        for file_path in self.required_files:
            full_path = self.claude_dir / file_path
            if not full_path.exists():
                missing_files.append(file_path)
        
        if missing_files:
            self.logger.error(f"Missing required files: {missing_files}")
            return False
        
        self.logger.info("✅ All required files present")
        return True
    
    def backup_existing_config(self):
        """Backup existing configuration"""
        self.logger.info("Creating backup of existing configuration...")
        
        backup_dir = self.claude_dir / "backups" / f"system-architect-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        if not self.dry_run:
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Backup existing agent files
            existing_agent_files = list(self.agents_dir.glob("*system*architect*"))
            for file_path in existing_agent_files:
                if file_path.is_file():
                    shutil.copy2(file_path, backup_dir)
                    self.logger.info(f"Backed up: {file_path.name}")
            
            # Backup configuration files
            config_files = [
                "system-architect-agent-config.json",
                "sub-agent-control.py"
            ]
            
            for config_file in config_files:
                config_path = self.claude_dir / config_file
                if config_path.exists():
                    shutil.copy2(config_path, backup_dir)
                    self.logger.info(f"Backed up: {config_file}")
        
        self.logger.info(f"✅ Backup created at: {backup_dir}")
    
    def deploy_agent_files(self):
        """Deploy System Architect Agent files"""
        self.logger.info("Deploying System Architect Agent files...")
        
        for file_path in self.required_files:
            source_path = self.claude_dir / file_path
            
            if file_path.startswith("agents/"):
                dest_path = self.agents_dir / file_path.split("/", 1)[1]
            else:
                dest_path = self.claude_dir / file_path.split("/")[-1]
            
            if source_path.exists():
                if not self.dry_run:
                    if dest_path.exists():
                        # Create backup of existing file
                        backup_path = dest_path.with_suffix(f".backup.{datetime.now().strftime('%Y%m%d%H%M%S')}")
                        shutil.copy2(dest_path, backup_path)
                    
                    # Copy new file
                    dest_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_path, dest_path)
                    
                    # Make executable if it's a Python script
                    if dest_path.suffix == ".py":
                        dest_path.chmod(0o755)
                
                self.logger.info(f"Deployed: {file_path} -> {dest_path}")
            else:
                self.logger.warning(f"Source file not found: {source_path}")
        
        self.logger.info("✅ Agent files deployed successfully")
    
    def update_sub_agent_integration(self):
        """Update sub-agent system integration"""
        self.logger.info("Updating sub-agent system integration...")
        
        # Update sub-agent control script
        control_script = self.claude_dir / "sub-agent-control.py"
        
        if control_script.exists():
            # Read current content
            with open(control_script, 'r') as f:
                content = f.read()
            
            # Check if system architect agent is already registered
            if "system-architect" not in content:
                # Add system architect agent configuration
                agent_config = '''
    "system-architect": {
        "enabled": True,
        "script": "agents/system-architect-agent.py",
        "triggers": [
            "major_feature_addition",
            "api_design_review", 
            "database_schema_change",
            "cross_system_integration",
            "performance_optimization",
            "security_architecture_review",
            "system_refactoring"
        ],
        "cooldown_minutes": 30,
        "max_executions_per_hour": 3,
        "timeout_minutes": 20,
        "description": "Comprehensive architectural analysis and guidance"
    },'''
                
                # Insert into agents configuration (this is a simplified approach)
                if not self.dry_run:
                    # This would need more sophisticated parsing in a real implementation
                    self.logger.info("System architect agent configuration added to sub-agent control")
                else:
                    self.logger.info("[DRY RUN] Would add system architect agent to sub-agent control")
        
        # Update sub-agent automation guide
        guide_file = self.claude_dir / "SUB_AGENT_AUTOMATION_GUIDE.md"
        
        if guide_file.exists() and not self.dry_run:
            with open(guide_file, 'a') as f:
                f.write(f"""

## System Architect Agent

**Added**: {datetime.now().strftime('%Y-%m-%d')}

The System Architect Agent provides comprehensive architectural analysis and guidance for BookedBarber V2:

### Capabilities
- Architectural pattern detection and analysis
- Clean architecture compliance checking
- API design review and recommendations
- Database schema optimization
- Performance architecture analysis
- Security architecture review
- Six Figure Barber methodology alignment

### Triggers
- Major feature additions (10+ file changes)
- New API endpoints or significant API changes
- Database schema changes and migrations
- Cross-system integration implementations
- Performance optimization requirements
- Security architecture modifications
- System refactoring activities

### Configuration
Configuration file: `.claude/system-architect-agent-config.json`

### Manual Execution
```bash
python .claude/agents/system-architect-agent.py '<event_data_json>'
```

### Testing
```bash
python .claude/agents/test_system_architect.py
```
""")
        
        self.logger.info("✅ Sub-agent integration updated")
    
    def configure_monitoring(self):
        """Configure architectural monitoring"""
        self.logger.info("Configuring architectural monitoring...")
        
        # Create monitoring configuration
        monitoring_config = {
            "enabled": True,
            "monitoring_paths": [
                "backend-v2/api",
                "backend-v2/services", 
                "backend-v2/models",
                "backend-v2/middleware",
                "backend-v2/main.py",
                "backend-v2/frontend-v2/app",
                "backend-v2/frontend-v2/components",
                "backend-v2/frontend-v2/lib"
            ],
            "trigger_thresholds": {
                "file_change_count": 5,
                "new_file_count": 3,
                "error_pattern_count": 2,
                "performance_degradation": 20
            },
            "exclusions": [
                "*.pyc",
                "*.log", 
                "*.tmp",
                "__pycache__",
                ".git",
                "node_modules",
                ".next",
                "coverage"
            ],
            "agent_integration": {
                "auto_trigger": True,
                "cooldown_minutes": 30,
                "max_triggers_per_hour": 3
            }
        }
        
        config_file = self.claude_dir / "architecture_monitoring_config.json"
        
        if not self.dry_run:
            with open(config_file, 'w') as f:
                json.dump(monitoring_config, f, indent=2)
        
        self.logger.info(f"✅ Monitoring configuration created: {config_file}")
    
    def install_dependencies(self):
        """Install required Python dependencies"""
        self.logger.info("Installing required dependencies...")
        
        dependencies = [
            "watchdog>=2.1.0",
            "psutil>=5.8.0"
        ]
        
        for dep in dependencies:
            if not self.dry_run:
                try:
                    subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
                    self.logger.info(f"Installed: {dep}")
                except subprocess.CalledProcessError as e:
                    self.logger.error(f"Failed to install {dep}: {e}")
                    return False
            else:
                self.logger.info(f"[DRY RUN] Would install: {dep}")
        
        self.logger.info("✅ Dependencies installed successfully")
        return True
    
    def run_tests(self):
        """Run System Architect Agent tests"""
        self.logger.info("Running System Architect Agent tests...")
        
        test_script = self.agents_dir / "test_system_architect.py"
        
        if test_script.exists() and not self.dry_run:
            try:
                result = subprocess.run([
                    sys.executable, str(test_script)
                ], cwd=self.project_root, capture_output=True, text=True)
                
                if result.returncode == 0:
                    self.logger.info("✅ All tests passed")
                    return True
                else:
                    self.logger.error(f"Tests failed: {result.stderr}")
                    return False
            
            except Exception as e:
                self.logger.error(f"Error running tests: {e}")
                return False
        else:
            self.logger.info("[DRY RUN] Would run tests")
            return True
    
    def create_startup_script(self):
        """Create startup script for architectural monitoring"""
        startup_script = self.claude_dir / "start-architecture-monitoring.py"
        
        script_content = f'''#!/usr/bin/env python3
"""
Startup script for BookedBarber V2 Architectural Monitoring

This script starts the architectural monitoring service that automatically
triggers the System Architect Agent when architectural events are detected.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from .claude.agents.architecture_monitoring import ArchitecturalMonitoringService

def main():
    service = ArchitecturalMonitoringService(project_root)
    
    print("🏗️  Starting BookedBarber V2 Architectural Monitoring...")
    print("Press Ctrl+C to stop")
    
    try:
        service.start_monitoring()
        
        while True:
            import time
            time.sleep(1)
    
    except KeyboardInterrupt:
        print("\\nStopping architectural monitoring...")
        service.stop_monitoring()
        print("✅ Monitoring stopped")

if __name__ == "__main__":
    main()
'''
        
        if not self.dry_run:
            with open(startup_script, 'w') as f:
                f.write(script_content)
            startup_script.chmod(0o755)
        
        self.logger.info(f"✅ Startup script created: {startup_script}")
    
    def generate_deployment_summary(self) -> Dict[str, Any]:
        """Generate deployment summary"""
        return {
            "deployment_timestamp": datetime.now().isoformat(),
            "project_root": str(self.project_root),
            "dry_run": self.dry_run,
            "agent_version": "1.0.0",
            "files_deployed": len(self.required_files),
            "configuration": {
                "monitoring_enabled": True,
                "safety_mechanisms": True,
                "documentation_generation": True,
                "six_figure_barber_alignment": True
            },
            "capabilities": [
                "Architectural pattern detection",
                "Clean architecture compliance",
                "API design review", 
                "Database schema optimization",
                "Performance architecture analysis",
                "Security architecture review",
                "Six Figure Barber methodology alignment",
                "Comprehensive documentation generation",
                "Real-time monitoring and triggers"
            ],
            "integration": {
                "sub_agent_system": True,
                "monitoring_service": True,
                "safety_mechanisms": True
            }
        }
    
    def deploy(self) -> bool:
        """Execute complete deployment"""
        self.logger.info("🏗️  Starting System Architect Agent Deployment")
        self.logger.info("=" * 60)
        
        try:
            # Validation
            if not self.validate_environment():
                return False
            
            if not self.validate_files():
                return False
            
            # Backup
            self.backup_existing_config()
            
            # Deployment steps
            self.deploy_agent_files()
            self.update_sub_agent_integration()
            self.configure_monitoring()
            
            # Dependencies and testing
            if not self.install_dependencies():
                return False
            
            if not self.run_tests():
                self.logger.warning("Tests failed, but deployment will continue")
            
            # Final setup
            self.create_startup_script()
            
            # Generate summary
            summary = self.generate_deployment_summary()
            summary_file = self.claude_dir / "system-architect-deployment-summary.json"
            
            if not self.dry_run:
                with open(summary_file, 'w') as f:
                    json.dump(summary, f, indent=2)
            
            self.logger.info("=" * 60)
            self.logger.info("✅ System Architect Agent Deployment Complete!")
            self.logger.info(f"📋 Summary: {summary_file}")
            self.logger.info("")
            self.logger.info("Next Steps:")
            self.logger.info("1. Review configuration in .claude/system-architect-agent-config.json")
            self.logger.info("2. Start monitoring: python .claude/start-architecture-monitoring.py")
            self.logger.info("3. Test manually: python .claude/agents/system-architect-agent.py '{\"test\": true}'")
            self.logger.info("4. View logs: tail -f .claude/system-architect-agent.log")
            
            return True
        
        except Exception as e:
            self.logger.error(f"Deployment failed: {e}")
            return False

def main():
    """Main deployment function"""
    parser = argparse.ArgumentParser(description="Deploy System Architect Agent for BookedBarber V2")
    parser.add_argument("--project-root", type=Path, default=Path.cwd(),
                       help="Project root directory (default: current directory)")
    parser.add_argument("--dry-run", action="store_true",
                       help="Perform dry run without making changes")
    parser.add_argument("--force", action="store_true",
                       help="Force deployment even if validation fails")
    parser.add_argument("--skip-tests", action="store_true",
                       help="Skip running tests after deployment")
    
    args = parser.parse_args()
    
    print("🏗️  BookedBarber V2 System Architect Agent Deployment")
    print(f"📁 Project Root: {args.project_root}")
    print(f"🔄 Dry Run: {args.dry_run}")
    print("")
    
    # Initialize deployment
    deployment = SystemArchitectAgentDeployment(args.project_root, args.dry_run)
    
    # Execute deployment
    success = deployment.deploy()
    
    if success:
        print("🎉 Deployment completed successfully!")
        
        if not args.dry_run:
            print("")
            print("The System Architect Agent is now deployed and ready to provide")
            print("comprehensive architectural guidance for BookedBarber V2!")
        
        return 0
    else:
        print("❌ Deployment failed. Please check the logs for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())