#!/usr/bin/env python3
"""
Architecture Monitoring and Trigger System

This module provides comprehensive monitoring for architectural events
and automatically triggers the System Architect Agent when needed.
"""

import os
import sys
import json
import time
import logging
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import hashlib
import re
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import sqlite3

@dataclass
class ArchitecturalEvent:
    """Data structure for architectural events"""
    event_id: str
    event_type: str
    timestamp: str
    changed_files: List[str]
    new_files: List[str]
    deleted_files: List[str]
    file_changes_count: int
    error_patterns: List[str]
    performance_metrics: Dict[str, Any]
    git_branch: str
    git_commit: str
    trigger_score: float
    metadata: Dict[str, Any]

class ArchitecturalMonitor(FileSystemEventHandler):
    """
    File system monitor for detecting architectural changes
    """
    
    def __init__(self, project_root: Path):
        super().__init__()
        self.project_root = project_root
        self.monitoring_db = project_root / ".claude" / "architecture_monitoring.db"
        self.log_file = project_root / ".claude" / "architecture_monitoring.log"
        self.config_file = project_root / ".claude" / "architecture_monitoring_config.json"
        
        self.setup_logging()
        self.setup_database()
        self.load_config()
        
        # File change tracking
        self.file_changes = {}
        self.new_files = set()
        self.deleted_files = set()
        self.last_event_time = datetime.now()
        self.change_accumulation_window = timedelta(seconds=30)
        
        # Architectural patterns to monitor
        self.architectural_patterns = {
            "api_endpoints": [r".*api.*\.py$", r".*router.*\.py$", r".*endpoint.*\.py$"],
            "database_models": [r".*model.*\.py$", r".*schema.*\.py$"],
            "services": [r".*service.*\.py$"],
            "middleware": [r".*middleware.*\.py$"],
            "integrations": [r".*integration.*\.py$", r".*webhook.*\.py$"],
            "migrations": [r".*migration.*\.py$", r".*alembic.*\.py$"],
            "tests": [r".*test.*\.py$", r".*spec.*\.py$"],
            "frontend_components": [r".*component.*\.tsx?$", r".*page.*\.tsx?$"],
            "configuration": [r".*config.*\.py$", r".*settings.*\.py$", r".*\.env.*$"]
        }
        
        # Performance monitoring
        self.performance_baseline = {
            "api_response_time": 500,  # ms
            "database_query_time": 100,  # ms
            "page_load_time": 2000,  # ms
            "memory_usage": 512,  # MB
            "cpu_usage": 70  # percent
        }
        
        # Error patterns to monitor
        self.error_patterns = [
            r".*ImportError.*",
            r".*ModuleNotFoundError.*",
            r".*AttributeError.*",
            r".*TypeError.*",
            r".*500 Internal Server Error.*",
            r".*404 Not Found.*",
            r".*Connection.*refused.*",
            r".*Database.*error.*",
            r".*Authentication.*failed.*",
            r".*Permission.*denied.*"
        ]
    
    def setup_logging(self):
        """Setup logging for architectural monitoring"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger("ArchitecturalMonitor")
    
    def setup_database(self):
        """Setup SQLite database for tracking events"""
        with sqlite3.connect(self.monitoring_db) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS architectural_events (
                    id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    changed_files TEXT,
                    new_files TEXT,
                    deleted_files TEXT,
                    file_changes_count INTEGER,
                    error_patterns TEXT,
                    performance_metrics TEXT,
                    git_branch TEXT,
                    git_commit TEXT,
                    trigger_score REAL,
                    metadata TEXT,
                    processed BOOLEAN DEFAULT FALSE
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS monitoring_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    timestamp TEXT NOT NULL,
                    metadata TEXT
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_timestamp 
                ON architectural_events(timestamp)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_type 
                ON architectural_events(event_type)
            """)
    
    def load_config(self):
        """Load monitoring configuration"""
        default_config = {
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
                "performance_degradation": 20  # percent
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
        
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                self.config = {**default_config, **json.load(f)}
        else:
            self.config = default_config
            self.save_config()
    
    def save_config(self):
        """Save monitoring configuration"""
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def on_modified(self, event):
        """Handle file modification events"""
        if event.is_directory:
            return
        
        self._process_file_event("modified", event.src_path)
    
    def on_created(self, event):
        """Handle file creation events"""
        if event.is_directory:
            return
        
        self._process_file_event("created", event.src_path)
    
    def on_deleted(self, event):
        """Handle file deletion events"""
        if event.is_directory:
            return
        
        self._process_file_event("deleted", event.src_path)
    
    def on_moved(self, event):
        """Handle file move events"""
        if event.is_directory:
            return
        
        self._process_file_event("moved", event.dest_path)
    
    def _process_file_event(self, event_type: str, file_path: str):
        """Process individual file events"""
        try:
            # Convert to relative path
            rel_path = os.path.relpath(file_path, self.project_root)
            
            # Check if file should be monitored
            if not self._should_monitor_file(rel_path):
                return
            
            # Accumulate file changes
            if event_type == "created":
                self.new_files.add(rel_path)
            elif event_type == "deleted":
                self.deleted_files.add(rel_path)
            else:
                self.file_changes[rel_path] = event_type
            
            # Check if we should trigger analysis
            current_time = datetime.now()
            if current_time - self.last_event_time > self.change_accumulation_window:
                self._evaluate_trigger_conditions()
                self._reset_accumulation()
            
            self.last_event_time = current_time
            
        except Exception as e:
            self.logger.error(f"Error processing file event: {e}")
    
    def _should_monitor_file(self, file_path: str) -> bool:
        """Check if file should be monitored"""
        # Check exclusions
        for exclusion in self.config["exclusions"]:
            if exclusion in file_path:
                return False
        
        # Check if in monitoring paths
        for monitor_path in self.config["monitoring_paths"]:
            if file_path.startswith(monitor_path):
                return True
        
        return False
    
    def _evaluate_trigger_conditions(self):
        """Evaluate whether to trigger architectural analysis"""
        if not self.config["enabled"]:
            return
        
        # Calculate trigger score
        trigger_score = self._calculate_trigger_score()
        
        if trigger_score >= 0.7:  # Threshold for triggering
            self._create_architectural_event(trigger_score)
    
    def _calculate_trigger_score(self) -> float:
        """Calculate trigger score based on accumulated changes"""
        score = 0.0
        
        # File change score
        file_change_count = len(self.file_changes) + len(self.new_files) + len(self.deleted_files)
        if file_change_count >= self.config["trigger_thresholds"]["file_change_count"]:
            score += 0.3
        
        # New file score
        if len(self.new_files) >= self.config["trigger_thresholds"]["new_file_count"]:
            score += 0.2
        
        # Architectural pattern score
        architectural_score = self._calculate_architectural_pattern_score()
        score += architectural_score * 0.3
        
        # Error pattern score
        error_score = self._check_error_patterns()
        score += error_score * 0.2
        
        return min(score, 1.0)
    
    def _calculate_architectural_pattern_score(self) -> float:
        """Calculate score based on architectural patterns affected"""
        affected_patterns = set()
        all_files = list(self.file_changes.keys()) + list(self.new_files) + list(self.deleted_files)
        
        for file_path in all_files:
            for pattern_name, regexes in self.architectural_patterns.items():
                for regex in regexes:
                    if re.match(regex, file_path):
                        affected_patterns.add(pattern_name)
                        break
        
        # Score based on number of architectural patterns affected
        return min(len(affected_patterns) / 5.0, 1.0)
    
    def _check_error_patterns(self) -> float:
        """Check for error patterns in recent logs"""
        error_count = 0
        
        # Check application logs for error patterns
        log_files = [
            self.project_root / "backend-v2" / "app.log",
            self.project_root / ".claude" / "system-architect-agent.log",
            self.project_root / ".claude" / "debugger-agent.log"
        ]
        
        for log_file in log_files:
            if log_file.exists():
                error_count += self._scan_log_for_errors(log_file)
        
        return min(error_count / 10.0, 1.0)  # Normalize to 0-1
    
    def _scan_log_for_errors(self, log_file: Path) -> int:
        """Scan log file for error patterns"""
        error_count = 0
        
        try:
            # Only check recent entries (last 1000 lines)
            with open(log_file, 'r') as f:
                lines = f.readlines()[-1000:]
            
            for line in lines:
                for pattern in self.error_patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        error_count += 1
                        break
        
        except Exception as e:
            self.logger.warning(f"Error scanning log file {log_file}: {e}")
        
        return error_count
    
    def _create_architectural_event(self, trigger_score: float):
        """Create and store architectural event"""
        try:
            # Get git information
            git_info = self._get_git_info()
            
            # Create event
            event = ArchitecturalEvent(
                event_id=self._generate_event_id(),
                event_type=self._determine_event_type(),
                timestamp=datetime.now().isoformat(),
                changed_files=list(self.file_changes.keys()),
                new_files=list(self.new_files),
                deleted_files=list(self.deleted_files),
                file_changes_count=len(self.file_changes) + len(self.new_files) + len(self.deleted_files),
                error_patterns=self._get_recent_errors(),
                performance_metrics=self._get_performance_metrics(),
                git_branch=git_info.get("branch", "unknown"),
                git_commit=git_info.get("commit", "unknown"),
                trigger_score=trigger_score,
                metadata={
                    "architectural_patterns_affected": self._get_affected_patterns(),
                    "monitoring_config": self.config
                }
            )
            
            # Store event in database
            self._store_event(event)
            
            # Trigger system architect agent if enabled
            if self.config["agent_integration"]["auto_trigger"]:
                self._trigger_system_architect_agent(event)
            
            self.logger.info(f"Architectural event created: {event.event_id} (score: {trigger_score:.2f})")
            
        except Exception as e:
            self.logger.error(f"Error creating architectural event: {e}")
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        content = f"{datetime.now().isoformat()}{len(self.file_changes)}{len(self.new_files)}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def _determine_event_type(self) -> str:
        """Determine the type of architectural event"""
        if len(self.new_files) >= 3:
            return "major_feature_addition"
        elif any("api" in f for f in self.file_changes.keys() | self.new_files):
            return "api_design_review"
        elif any("model" in f or "migration" in f for f in self.file_changes.keys() | self.new_files):
            return "database_schema_change"
        elif any("integration" in f or "webhook" in f for f in self.file_changes.keys() | self.new_files):
            return "cross_system_integration"
        elif any("auth" in f or "security" in f for f in self.file_changes.keys() | self.new_files):
            return "security_architecture_review"
        else:
            return "system_refactoring"
    
    def _get_git_info(self) -> Dict[str, str]:
        """Get current git branch and commit"""
        try:
            # Get current branch
            branch_result = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            branch = branch_result.stdout.strip() if branch_result.returncode == 0 else "unknown"
            
            # Get current commit
            commit_result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            commit = commit_result.stdout.strip()[:8] if commit_result.returncode == 0 else "unknown"
            
            return {"branch": branch, "commit": commit}
        
        except Exception as e:
            self.logger.warning(f"Error getting git info: {e}")
            return {"branch": "unknown", "commit": "unknown"}
    
    def _get_recent_errors(self) -> List[str]:
        """Get recent error patterns found"""
        errors = []
        
        # Check recent logs for errors
        log_files = [
            self.project_root / "backend-v2" / "app.log",
            self.project_root / ".claude" / "system-architect-agent.log"
        ]
        
        for log_file in log_files:
            if log_file.exists():
                try:
                    with open(log_file, 'r') as f:
                        lines = f.readlines()[-100:]  # Last 100 lines
                    
                    for line in lines:
                        for pattern in self.error_patterns:
                            if re.search(pattern, line, re.IGNORECASE):
                                errors.append(line.strip())
                                break
                except Exception:
                    continue
        
        return errors[-10:]  # Return last 10 errors
    
    def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        # Placeholder for performance metrics
        # In a real implementation, this would collect actual metrics
        return {
            "timestamp": datetime.now().isoformat(),
            "file_change_velocity": len(self.file_changes) / max(1, (datetime.now() - self.last_event_time).seconds),
            "change_complexity_score": self._calculate_change_complexity()
        }
    
    def _calculate_change_complexity(self) -> float:
        """Calculate complexity score of changes"""
        complexity = 0.0
        all_files = list(self.file_changes.keys()) + list(self.new_files)
        
        # Weight based on file types
        for file_path in all_files:
            if any(pattern in file_path for pattern in ["model", "schema", "migration"]):
                complexity += 3.0  # Database changes are complex
            elif any(pattern in file_path for pattern in ["api", "endpoint", "router"]):
                complexity += 2.0  # API changes are moderately complex
            elif any(pattern in file_path for pattern in ["service", "middleware"]):
                complexity += 1.5  # Business logic changes
            else:
                complexity += 1.0  # Standard file changes
        
        return complexity
    
    def _get_affected_patterns(self) -> List[str]:
        """Get list of affected architectural patterns"""
        affected = []
        all_files = list(self.file_changes.keys()) + list(self.new_files) + list(self.deleted_files)
        
        for pattern_name, regexes in self.architectural_patterns.items():
            for file_path in all_files:
                for regex in regexes:
                    if re.match(regex, file_path):
                        if pattern_name not in affected:
                            affected.append(pattern_name)
                        break
        
        return affected
    
    def _store_event(self, event: ArchitecturalEvent):
        """Store event in database"""
        with sqlite3.connect(self.monitoring_db) as conn:
            conn.execute("""
                INSERT INTO architectural_events 
                (id, event_type, timestamp, changed_files, new_files, deleted_files,
                 file_changes_count, error_patterns, performance_metrics, git_branch,
                 git_commit, trigger_score, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id,
                event.event_type,
                event.timestamp,
                json.dumps(event.changed_files),
                json.dumps(event.new_files),
                json.dumps(event.deleted_files),
                event.file_changes_count,
                json.dumps(event.error_patterns),
                json.dumps(event.performance_metrics),
                event.git_branch,
                event.git_commit,
                event.trigger_score,
                json.dumps(event.metadata)
            ))
    
    def _trigger_system_architect_agent(self, event: ArchitecturalEvent):
        """Trigger the system architect agent"""
        try:
            # Check cooldown period
            if not self._check_agent_cooldown():
                self.logger.info("System architect agent on cooldown, skipping trigger")
                return
            
            # Prepare agent data
            agent_data = {
                "changed_files": event.changed_files,
                "new_files": event.new_files,
                "deleted_files": event.deleted_files,
                "error_patterns": event.error_patterns,
                "performance_metrics": event.performance_metrics,
                "event_type": event.event_type,
                "trigger_score": event.trigger_score,
                "git_info": {
                    "branch": event.git_branch,
                    "commit": event.git_commit
                }
            }
            
            # Execute system architect agent
            agent_script = self.project_root / ".claude" / "agents" / "system-architect-agent.py"
            if agent_script.exists():
                subprocess.run([
                    sys.executable,
                    str(agent_script),
                    json.dumps(agent_data)
                ], cwd=self.project_root)
                
                self.logger.info(f"Triggered system architect agent for event {event.event_id}")
                self._record_agent_trigger()
            else:
                self.logger.warning("System architect agent script not found")
        
        except Exception as e:
            self.logger.error(f"Error triggering system architect agent: {e}")
    
    def _check_agent_cooldown(self) -> bool:
        """Check if agent is within cooldown period"""
        try:
            with sqlite3.connect(self.monitoring_db) as conn:
                cursor = conn.execute("""
                    SELECT timestamp FROM architectural_events 
                    WHERE processed = TRUE 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                """)
                result = cursor.fetchone()
                
                if result:
                    last_trigger = datetime.fromisoformat(result[0])
                    cooldown_period = timedelta(minutes=self.config["agent_integration"]["cooldown_minutes"])
                    
                    if datetime.now() - last_trigger < cooldown_period:
                        return False
                
                # Check hourly limit
                hour_ago = datetime.now() - timedelta(hours=1)
                cursor = conn.execute("""
                    SELECT COUNT(*) FROM architectural_events 
                    WHERE processed = TRUE 
                    AND timestamp > ?
                """, (hour_ago.isoformat(),))
                
                count = cursor.fetchone()[0]
                if count >= self.config["agent_integration"]["max_triggers_per_hour"]:
                    return False
                
                return True
        
        except Exception as e:
            self.logger.error(f"Error checking agent cooldown: {e}")
            return False
    
    def _record_agent_trigger(self):
        """Record that agent was triggered"""
        with sqlite3.connect(self.monitoring_db) as conn:
            conn.execute("""
                UPDATE architectural_events 
                SET processed = TRUE 
                WHERE id = (SELECT id FROM architectural_events ORDER BY timestamp DESC LIMIT 1)
            """)
    
    def _reset_accumulation(self):
        """Reset file change accumulation"""
        self.file_changes.clear()
        self.new_files.clear()
        self.deleted_files.clear()
    
    def get_monitoring_stats(self) -> Dict[str, Any]:
        """Get monitoring statistics"""
        try:
            with sqlite3.connect(self.monitoring_db) as conn:
                # Get total events
                cursor = conn.execute("SELECT COUNT(*) FROM architectural_events")
                total_events = cursor.fetchone()[0]
                
                # Get events by type
                cursor = conn.execute("""
                    SELECT event_type, COUNT(*) 
                    FROM architectural_events 
                    GROUP BY event_type
                """)
                events_by_type = dict(cursor.fetchall())
                
                # Get recent activity
                week_ago = (datetime.now() - timedelta(days=7)).isoformat()
                cursor = conn.execute("""
                    SELECT COUNT(*) FROM architectural_events 
                    WHERE timestamp > ?
                """, (week_ago,))
                recent_events = cursor.fetchone()[0]
                
                # Get agent triggers
                cursor = conn.execute("SELECT COUNT(*) FROM architectural_events WHERE processed = TRUE")
                agent_triggers = cursor.fetchone()[0]
                
                return {
                    "total_events": total_events,
                    "events_by_type": events_by_type,
                    "recent_events_week": recent_events,
                    "agent_triggers": agent_triggers,
                    "monitoring_enabled": self.config["enabled"],
                    "last_activity": datetime.now().isoformat()
                }
        
        except Exception as e:
            self.logger.error(f"Error getting monitoring stats: {e}")
            return {"error": str(e)}

class ArchitecturalMonitoringService:
    """
    Service for managing architectural monitoring
    """
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.monitor = ArchitecturalMonitor(project_root)
        self.observer = Observer()
        self.running = False
    
    def start_monitoring(self):
        """Start file system monitoring"""
        if self.running:
            return
        
        # Setup monitoring for configured paths
        for monitor_path in self.monitor.config["monitoring_paths"]:
            full_path = self.project_root / monitor_path
            if full_path.exists():
                self.observer.schedule(self.monitor, str(full_path), recursive=True)
                self.monitor.logger.info(f"Monitoring path: {full_path}")
        
        self.observer.start()
        self.running = True
        self.monitor.logger.info("Architectural monitoring started")
    
    def stop_monitoring(self):
        """Stop file system monitoring"""
        if not self.running:
            return
        
        self.observer.stop()
        self.observer.join()
        self.running = False
        self.monitor.logger.info("Architectural monitoring stopped")
    
    def force_trigger_analysis(self, event_data: Optional[Dict[str, Any]] = None):
        """Force trigger architectural analysis"""
        if event_data is None:
            event_data = {
                "changed_files": [],
                "new_files": [],
                "deleted_files": [],
                "error_patterns": [],
                "performance_metrics": {},
                "event_type": "manual_trigger",
                "trigger_score": 1.0
            }
        
        self.monitor._trigger_system_architect_agent(
            ArchitecturalEvent(
                event_id=self.monitor._generate_event_id(),
                event_type=event_data.get("event_type", "manual_trigger"),
                timestamp=datetime.now().isoformat(),
                changed_files=event_data.get("changed_files", []),
                new_files=event_data.get("new_files", []),
                deleted_files=event_data.get("deleted_files", []),
                file_changes_count=len(event_data.get("changed_files", [])),
                error_patterns=event_data.get("error_patterns", []),
                performance_metrics=event_data.get("performance_metrics", {}),
                git_branch="unknown",
                git_commit="unknown",
                trigger_score=event_data.get("trigger_score", 1.0),
                metadata={}
            )
        )
    
    def get_status(self) -> Dict[str, Any]:
        """Get monitoring service status"""
        return {
            "running": self.running,
            "config": self.monitor.config,
            "stats": self.monitor.get_monitoring_stats()
        }

def main():
    """
    Main function for running architectural monitoring
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="Architectural Monitoring Service")
    parser.add_argument("--action", choices=["start", "stop", "status", "trigger"], 
                       default="start", help="Action to perform")
    parser.add_argument("--daemon", action="store_true", 
                       help="Run as daemon process")
    parser.add_argument("--project-root", type=Path, default=Path.cwd(),
                       help="Project root directory")
    
    args = parser.parse_args()
    
    # Initialize monitoring service
    service = ArchitecturalMonitoringService(args.project_root)
    
    if args.action == "start":
        print("Starting architectural monitoring...")
        service.start_monitoring()
        
        if args.daemon:
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\nStopping architectural monitoring...")
                service.stop_monitoring()
        else:
            print("Monitoring started. Press Ctrl+C to stop.")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\nStopping...")
                service.stop_monitoring()
    
    elif args.action == "stop":
        print("Stopping architectural monitoring...")
        service.stop_monitoring()
    
    elif args.action == "status":
        status = service.get_status()
        print(json.dumps(status, indent=2))
    
    elif args.action == "trigger":
        print("Forcing architectural analysis trigger...")
        service.force_trigger_analysis()
        print("Analysis triggered.")

if __name__ == "__main__":
    main()