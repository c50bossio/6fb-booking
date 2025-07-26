#!/usr/bin/env python3
"""
Security Trigger Handler for BookedBarber V2
Handles automated security analysis triggers based on file changes
"""

import os
import sys
import json
import subprocess
import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime, timezone


class SecurityTriggerHandler:
    """Handles security triggers for BookedBarber V2"""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or "/Users/bossio/6fb-booking")
        self.logger = self._setup_logging()
        
        # Security-sensitive file patterns for BookedBarber V2
        self.security_patterns = {
            "authentication": [
                "*auth*", "*login*", "*session*", "*jwt*", "*oauth*",
                "*middleware/auth*", "*middleware/security*"
            ],
            "payment": [
                "*payment*", "*stripe*", "*billing*", "*checkout*",
                "*commission*", "*payout*", "*financial*"
            ],
            "user_data": [
                "*user*", "*client*", "*appointment*", "*booking*",
                "*models/user*", "*models/client*", "*models/appointment*"
            ],
            "api_security": [
                "*api/v2/auth*", "*api/v2/payments*", "*routers/auth*",
                "*routers/payments*", "*middleware/*"
            ],
            "configuration": [
                "*.env*", "*config*", "*settings*", "*secrets*",
                "*credentials*", "*keys*"
            ]
        }
        
        # Cooldown tracking
        self.cooldown_file = self.project_root / ".claude" / "security-cooldown.json"
        self.default_cooldown_minutes = 30
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for security trigger handler"""
        log_file = self.project_root / ".claude" / "security-triggers.log"
        log_file.parent.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        return logging.getLogger("SecurityTriggerHandler")

    def should_trigger_security_analysis(self, changed_files: List[str], 
                                       trigger_type: str = "file_change") -> bool:
        """Determine if security analysis should be triggered"""
        
        # Check cooldown
        if self._is_in_cooldown(trigger_type):
            self.logger.info(f"Security trigger in cooldown for {trigger_type}")
            return False
        
        # Check if any files match security patterns
        security_relevant_files = []
        for file_path in changed_files:
            if self._is_security_relevant_file(file_path):
                security_relevant_files.append(file_path)
        
        if not security_relevant_files:
            self.logger.debug("No security-relevant files changed")
            return False
        
        self.logger.info(f"Security trigger activated for {len(security_relevant_files)} files")
        return True

    def _is_security_relevant_file(self, file_path: str) -> bool:
        """Check if file is security-relevant"""
        file_path_lower = file_path.lower()
        
        # Check all security patterns
        for category, patterns in self.security_patterns.items():
            for pattern in patterns:
                # Simple pattern matching (could be enhanced with fnmatch)
                pattern_clean = pattern.replace("*", "")
                if pattern_clean in file_path_lower:
                    self.logger.debug(f"File {file_path} matches {category} pattern {pattern}")
                    return True
        
        # Check file extensions for configuration files
        config_extensions = ['.env', '.yaml', '.yml', '.json', '.conf', '.config']
        file_ext = Path(file_path).suffix.lower()
        if file_ext in config_extensions and any(
            keyword in file_path_lower 
            for keyword in ['secret', 'key', 'password', 'token', 'credential']
        ):
            return True
        
        return False

    def _is_in_cooldown(self, trigger_type: str) -> bool:
        """Check if trigger is in cooldown period"""
        try:
            if not self.cooldown_file.exists():
                return False
            
            with open(self.cooldown_file, 'r') as f:
                cooldown_data = json.load(f)
            
            last_trigger = cooldown_data.get(trigger_type)
            if not last_trigger:
                return False
            
            last_trigger_time = datetime.fromisoformat(last_trigger)
            current_time = datetime.now(timezone.utc)
            
            cooldown_minutes = cooldown_data.get(f"{trigger_type}_cooldown", self.default_cooldown_minutes)
            time_diff = (current_time - last_trigger_time).total_seconds() / 60
            
            return time_diff < cooldown_minutes
            
        except Exception as e:
            self.logger.error(f"Error checking cooldown: {e}")
            return False

    def _update_cooldown(self, trigger_type: str, cooldown_minutes: int = None):
        """Update cooldown timestamp"""
        try:
            cooldown_data = {}
            if self.cooldown_file.exists():
                with open(self.cooldown_file, 'r') as f:
                    cooldown_data = json.load(f)
            
            cooldown_data[trigger_type] = datetime.now(timezone.utc).isoformat()
            if cooldown_minutes:
                cooldown_data[f"{trigger_type}_cooldown"] = cooldown_minutes
            
            with open(self.cooldown_file, 'w') as f:
                json.dump(cooldown_data, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Error updating cooldown: {e}")

    async def trigger_security_analysis(self, changed_files: List[str], 
                                      trigger_type: str = "file_change",
                                      priority: str = "high") -> Dict[str, Any]:
        """Trigger security analysis with the security specialist agent"""
        
        self.logger.info(f"Triggering security analysis for {trigger_type}")
        
        # Update cooldown
        cooldown_minutes = self._get_cooldown_for_trigger(trigger_type)
        self._update_cooldown(trigger_type, cooldown_minutes)
        
        try:
            # Prepare command for security specialist agent
            agent_script = self.project_root / ".claude" / "scripts" / "security-specialist-agent.py"
            
            cmd = [
                sys.executable,
                str(agent_script),
                "--files"
            ] + changed_files + [
                "--trigger", trigger_type
            ]
            
            # Run security analysis
            self.logger.info(f"Executing security analysis: {' '.join(cmd)}")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(self.project_root),
                timeout=600  # 10 minute timeout
            )
            
            # Parse results
            analysis_result = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "trigger_type": trigger_type,
                "files_analyzed": changed_files,
                "exit_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "success": result.returncode == 0
            }
            
            if result.returncode == 0:
                self.logger.info("Security analysis completed successfully")
            else:
                self.logger.error(f"Security analysis failed with exit code {result.returncode}")
                self.logger.error(f"Error output: {result.stderr}")
            
            # Save trigger result
            await self._save_trigger_result(analysis_result)
            
            return analysis_result
            
        except subprocess.TimeoutExpired:
            self.logger.error("Security analysis timed out")
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "trigger_type": trigger_type,
                "files_analyzed": changed_files,
                "error": "Analysis timed out",
                "success": False
            }
        except Exception as e:
            self.logger.error(f"Error running security analysis: {e}")
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "trigger_type": trigger_type,
                "files_analyzed": changed_files,
                "error": str(e),
                "success": False
            }

    def _get_cooldown_for_trigger(self, trigger_type: str) -> int:
        """Get appropriate cooldown period for trigger type"""
        cooldown_map = {
            "file_change": 15,  # 15 minutes for regular file changes
            "auth_change": 5,   # 5 minutes for auth changes (more frequent)
            "payment_change": 10,  # 10 minutes for payment changes
            "critical_security": 30,  # 30 minutes for critical security events
            "compliance_check": 60,  # 1 hour for compliance checks
            "manual_trigger": 0   # No cooldown for manual triggers
        }
        return cooldown_map.get(trigger_type, self.default_cooldown_minutes)

    async def _save_trigger_result(self, result: Dict[str, Any]):
        """Save trigger result for audit and monitoring"""
        results_dir = self.project_root / ".claude" / "security-triggers"
        results_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = results_dir / f"trigger_result_{timestamp}.json"
        
        try:
            with open(result_file, 'w') as f:
                json.dump(result, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Failed to save trigger result: {e}")

    def get_security_trigger_status(self) -> Dict[str, Any]:
        """Get current status of security triggers"""
        status = {
            "security_patterns": self.security_patterns,
            "cooldown_status": {},
            "last_triggers": {}
        }
        
        # Check cooldown status for each trigger type
        trigger_types = ["file_change", "auth_change", "payment_change", "critical_security"]
        for trigger_type in trigger_types:
            status["cooldown_status"][trigger_type] = self._is_in_cooldown(trigger_type)
        
        # Get last trigger times
        try:
            if self.cooldown_file.exists():
                with open(self.cooldown_file, 'r') as f:
                    cooldown_data = json.load(f)
                    for trigger_type in trigger_types:
                        if trigger_type in cooldown_data:
                            status["last_triggers"][trigger_type] = cooldown_data[trigger_type]
        except Exception as e:
            self.logger.error(f"Error reading cooldown data: {e}")
        
        return status


def main():
    """Main entry point for security trigger handler"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Security Trigger Handler for BookedBarber V2")
    parser.add_argument("--files", nargs="+", help="Files that changed")
    parser.add_argument("--trigger", default="file_change", help="Trigger type")
    parser.add_argument("--check-only", action="store_true", help="Only check if trigger should fire")
    parser.add_argument("--status", action="store_true", help="Show trigger status")
    
    args = parser.parse_args()
    
    handler = SecurityTriggerHandler()
    
    if args.status:
        status = handler.get_security_trigger_status()
        print(json.dumps(status, indent=2))
        return
    
    if not args.files:
        print("Error: --files argument required unless using --status")
        return
    
    should_trigger = handler.should_trigger_security_analysis(args.files, args.trigger)
    
    if args.check_only:
        print(json.dumps({"should_trigger": should_trigger}))
        return
    
    if should_trigger:
        import asyncio
        result = asyncio.run(handler.trigger_security_analysis(args.files, args.trigger))
        print(json.dumps(result, indent=2))
    else:
        print(json.dumps({"triggered": False, "reason": "Not security relevant or in cooldown"}))


if __name__ == "__main__":
    main()