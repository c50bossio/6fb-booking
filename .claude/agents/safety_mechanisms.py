#!/usr/bin/env python3
"""
Safety Mechanisms and Resource Limits for System Architect Agent

This module provides comprehensive safety mechanisms, resource limits,
and protection systems for the System Architect Agent to ensure
safe and controlled operation within the BookedBarber V2 environment.
"""

import os
import sys
import json
import time
import psutil
import logging
import threading
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import signal
import resource
import sqlite3
from contextlib import contextmanager

class SafetyLevel(Enum):
    """Safety levels for different operations"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ResourceType(Enum):
    """Types of resources to monitor"""
    MEMORY = "memory"
    CPU = "cpu"
    DISK = "disk"
    NETWORK = "network"
    EXECUTION_TIME = "execution_time"
    FILE_OPERATIONS = "file_operations"

@dataclass
class ResourceLimit:
    """Resource limit configuration"""
    resource_type: ResourceType
    limit_value: float
    unit: str
    safety_level: SafetyLevel
    action: str  # "warn", "throttle", "stop"
    description: str

@dataclass
class SafetyViolation:
    """Safety violation record"""
    violation_id: str
    timestamp: str
    resource_type: ResourceType
    current_value: float
    limit_value: float
    safety_level: SafetyLevel
    action_taken: str
    context: Dict[str, Any]

class ResourceMonitor:
    """
    Real-time resource monitoring and enforcement
    """
    
    def __init__(self, limits: List[ResourceLimit]):
        self.limits = {limit.resource_type: limit for limit in limits}
        self.monitoring = False
        self.violations = []
        self.callbacks = {}
        
        self.logger = logging.getLogger("ResourceMonitor")
        
        # Process monitoring
        self.process = psutil.Process()
        self.start_time = time.time()
        self.start_memory = self.process.memory_info().rss
        
        # File operation tracking
        self.file_operations = 0
        self.max_file_operations = 1000
    
    def add_callback(self, resource_type: ResourceType, callback: Callable):
        """Add callback for resource violations"""
        if resource_type not in self.callbacks:
            self.callbacks[resource_type] = []
        self.callbacks[resource_type].append(callback)
    
    def start_monitoring(self):
        """Start resource monitoring"""
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        self.logger.info("Resource monitoring started")
    
    def stop_monitoring(self):
        """Stop resource monitoring"""
        self.monitoring = False
        if hasattr(self, 'monitor_thread'):
            self.monitor_thread.join(timeout=1.0)
        self.logger.info("Resource monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring:
            try:
                self._check_memory_usage()
                self._check_cpu_usage()
                self._check_execution_time()
                self._check_disk_usage()
                
                time.sleep(1.0)  # Check every second
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
    
    def _check_memory_usage(self):
        """Check memory usage against limits"""
        if ResourceType.MEMORY not in self.limits:
            return
        
        limit = self.limits[ResourceType.MEMORY]
        current_memory = self.process.memory_info().rss / (1024 * 1024)  # MB
        
        if current_memory > limit.limit_value:
            self._handle_violation(
                ResourceType.MEMORY,
                current_memory,
                limit,
                {"process_id": self.process.pid}
            )
    
    def _check_cpu_usage(self):
        """Check CPU usage against limits"""
        if ResourceType.CPU not in self.limits:
            return
        
        limit = self.limits[ResourceType.CPU]
        current_cpu = self.process.cpu_percent(interval=1.0)
        
        if current_cpu > limit.limit_value:
            self._handle_violation(
                ResourceType.CPU,
                current_cpu,
                limit,
                {"process_id": self.process.pid}
            )
    
    def _check_execution_time(self):
        """Check execution time against limits"""
        if ResourceType.EXECUTION_TIME not in self.limits:
            return
        
        limit = self.limits[ResourceType.EXECUTION_TIME]
        current_time = (time.time() - self.start_time) / 60.0  # minutes
        
        if current_time > limit.limit_value:
            self._handle_violation(
                ResourceType.EXECUTION_TIME,
                current_time,
                limit,
                {"start_time": self.start_time}
            )
    
    def _check_disk_usage(self):
        """Check disk usage against limits"""
        if ResourceType.DISK not in self.limits:
            return
        
        limit = self.limits[ResourceType.DISK]
        disk_usage = psutil.disk_usage('/').percent
        
        if disk_usage > limit.limit_value:
            self._handle_violation(
                ResourceType.DISK,
                disk_usage,
                limit,
                {"disk_path": "/"}
            )
    
    def check_file_operations(self):
        """Check file operations limit"""
        if ResourceType.FILE_OPERATIONS not in self.limits:
            return True
        
        limit = self.limits[ResourceType.FILE_OPERATIONS]
        self.file_operations += 1
        
        if self.file_operations > limit.limit_value:
            self._handle_violation(
                ResourceType.FILE_OPERATIONS,
                self.file_operations,
                limit,
                {"operations_count": self.file_operations}
            )
            return False
        
        return True
    
    def _handle_violation(self, resource_type: ResourceType, current_value: float, 
                         limit: ResourceLimit, context: Dict[str, Any]):
        """Handle resource limit violation"""
        violation = SafetyViolation(
            violation_id=f"{resource_type.value}_{int(time.time())}",
            timestamp=datetime.now().isoformat(),
            resource_type=resource_type,
            current_value=current_value,
            limit_value=limit.limit_value,
            safety_level=limit.safety_level,
            action_taken=limit.action,
            context=context
        )
        
        self.violations.append(violation)
        self.logger.warning(f"Resource violation: {resource_type.value} = {current_value:.2f} > {limit.limit_value} {limit.unit}")
        
        # Execute action
        if limit.action == "warn":
            self._warn_violation(violation)
        elif limit.action == "throttle":
            self._throttle_operation(violation)
        elif limit.action == "stop":
            self._stop_operation(violation)
        
        # Execute callbacks
        if resource_type in self.callbacks:
            for callback in self.callbacks[resource_type]:
                try:
                    callback(violation)
                except Exception as e:
                    self.logger.error(f"Error in violation callback: {e}")
    
    def _warn_violation(self, violation: SafetyViolation):
        """Warn about resource violation"""
        self.logger.warning(f"Resource limit exceeded: {violation.resource_type.value}")
    
    def _throttle_operation(self, violation: SafetyViolation):
        """Throttle operation due to resource violation"""
        self.logger.warning(f"Throttling due to {violation.resource_type.value} limit")
        time.sleep(2.0)  # Pause operation
    
    def _stop_operation(self, violation: SafetyViolation):
        """Stop operation due to critical resource violation"""
        self.logger.critical(f"Stopping operation due to {violation.resource_type.value} limit")
        if violation.safety_level == SafetyLevel.CRITICAL:
            os.kill(os.getpid(), signal.SIGTERM)
    
    def get_current_usage(self) -> Dict[str, float]:
        """Get current resource usage"""
        return {
            "memory_mb": self.process.memory_info().rss / (1024 * 1024),
            "cpu_percent": self.process.cpu_percent(),
            "execution_time_minutes": (time.time() - self.start_time) / 60.0,
            "disk_usage_percent": psutil.disk_usage('/').percent,
            "file_operations": self.file_operations
        }

class SafetyManager:
    """
    Comprehensive safety management for System Architect Agent
    """
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.safety_db = project_root / ".claude" / "safety_violations.db"
        self.config_file = project_root / ".claude" / "safety_config.json"
        self.emergency_stop_file = project_root / ".claude" / "EMERGENCY_STOP"
        
        self.setup_logging()
        self.setup_database()
        self.load_config()
        self.setup_resource_monitor()
        
        # Safety state
        self.emergency_stop = False
        self.safety_violations = []
        self.execution_stats = {}
        
        # Protected files and operations
        self.protected_paths = self._load_protected_paths()
        self.dangerous_operations = self._load_dangerous_operations()
    
    def setup_logging(self):
        """Setup safety logging"""
        self.logger = logging.getLogger("SafetyManager")
        
        # Create safety log file
        safety_log = self.project_root / ".claude" / "safety_manager.log"
        handler = logging.FileHandler(safety_log)
        handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
    
    def setup_database(self):
        """Setup safety violations database"""
        with sqlite3.connect(self.safety_db) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS safety_violations (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    resource_type TEXT NOT NULL,
                    current_value REAL NOT NULL,
                    limit_value REAL NOT NULL,
                    safety_level TEXT NOT NULL,
                    action_taken TEXT NOT NULL,
                    context TEXT,
                    resolved BOOLEAN DEFAULT FALSE
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS execution_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    execution_id TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    metadata TEXT
                )
            """)
    
    def load_config(self):
        """Load safety configuration"""
        default_config = {
            "enabled": True,
            "emergency_stop_enabled": True,
            "resource_limits": {
                "memory_mb": 1024,  # 1GB
                "cpu_percent": 60,
                "execution_time_minutes": 20,
                "disk_usage_percent": 90,
                "file_operations": 1000
            },
            "safety_levels": {
                "memory_mb": "high",
                "cpu_percent": "medium", 
                "execution_time_minutes": "high",
                "disk_usage_percent": "critical",
                "file_operations": "medium"
            },
            "actions": {
                "memory_mb": "throttle",
                "cpu_percent": "warn",
                "execution_time_minutes": "stop",
                "disk_usage_percent": "stop",
                "file_operations": "throttle"
            },
            "cooldown_periods": {
                "execution_failures": 30,  # minutes
                "resource_violations": 15,  # minutes
                "emergency_stops": 60  # minutes
            },
            "protection_rules": {
                "max_file_modifications": 50,
                "max_directory_changes": 10,
                "forbidden_file_patterns": [
                    "*.pyc", "*.log", ".git/*", "node_modules/*", "__pycache__/*"
                ],
                "protected_directories": [
                    ".git", "node_modules", "__pycache__", ".next", "coverage"
                ]
            }
        }
        
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                self.config = {**default_config, **json.load(f)}
        else:
            self.config = default_config
            self.save_config()
    
    def save_config(self):
        """Save safety configuration"""
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def setup_resource_monitor(self):
        """Setup resource monitoring"""
        limits = []
        
        for resource_name, limit_value in self.config["resource_limits"].items():
            if resource_name == "memory_mb":
                resource_type = ResourceType.MEMORY
                unit = "MB"
            elif resource_name == "cpu_percent":
                resource_type = ResourceType.CPU
                unit = "%"
            elif resource_name == "execution_time_minutes":
                resource_type = ResourceType.EXECUTION_TIME
                unit = "minutes"
            elif resource_name == "disk_usage_percent":
                resource_type = ResourceType.DISK
                unit = "%"
            elif resource_name == "file_operations":
                resource_type = ResourceType.FILE_OPERATIONS
                unit = "operations"
            else:
                continue
            
            safety_level = SafetyLevel(self.config["safety_levels"][resource_name])
            action = self.config["actions"][resource_name]
            
            limits.append(ResourceLimit(
                resource_type=resource_type,
                limit_value=limit_value,
                unit=unit,
                safety_level=safety_level,
                action=action,
                description=f"Limit for {resource_name}"
            ))
        
        self.resource_monitor = ResourceMonitor(limits)
        
        # Add violation callbacks
        self.resource_monitor.add_callback(ResourceType.MEMORY, self._handle_memory_violation)
        self.resource_monitor.add_callback(ResourceType.CPU, self._handle_cpu_violation)
        self.resource_monitor.add_callback(ResourceType.EXECUTION_TIME, self._handle_time_violation)
    
    def _load_protected_paths(self) -> List[str]:
        """Load protected file paths"""
        protected_file = self.project_root / "PROTECTED_FILES.md"
        protected_paths = []
        
        if protected_file.exists():
            try:
                with open(protected_file, 'r') as f:
                    content = f.read()
                    # Extract file paths from markdown
                    for line in content.split('\n'):
                        if line.strip().startswith('-') and ('/' in line or '\\' in line):
                            path = line.strip().lstrip('- ').strip()
                            protected_paths.append(path)
            except Exception as e:
                self.logger.warning(f"Error loading protected paths: {e}")
        
        # Add default protected paths
        protected_paths.extend([
            ".git/*",
            "node_modules/*",
            "__pycache__/*",
            "*.pyc",
            "*.log",
            ".next/*",
            "coverage/*"
        ])
        
        return protected_paths
    
    def _load_dangerous_operations(self) -> List[str]:
        """Load dangerous operations patterns"""
        return [
            "rm -rf",
            "del /f",
            "format",
            "DROP TABLE",
            "DELETE FROM",
            "TRUNCATE",
            "sudo rm",
            "chmod 777",
            "chown root"
        ]
    
    def check_emergency_stop(self) -> bool:
        """Check for emergency stop condition"""
        if self.emergency_stop_file.exists():
            self.emergency_stop = True
            self.logger.critical("Emergency stop file detected")
            return True
        
        return self.emergency_stop
    
    def trigger_emergency_stop(self, reason: str):
        """Trigger emergency stop"""
        self.emergency_stop = True
        self.emergency_stop_file.touch()
        
        with open(self.emergency_stop_file, 'w') as f:
            f.write(f"Emergency stop triggered: {reason}\nTimestamp: {datetime.now().isoformat()}\n")
        
        self.logger.critical(f"Emergency stop triggered: {reason}")
    
    def clear_emergency_stop(self):
        """Clear emergency stop condition"""
        if self.emergency_stop_file.exists():
            self.emergency_stop_file.unlink()
        
        self.emergency_stop = False
        self.logger.info("Emergency stop cleared")
    
    def is_path_protected(self, file_path: str) -> bool:
        """Check if file path is protected"""
        import fnmatch
        
        for pattern in self.protected_paths:
            if fnmatch.fnmatch(file_path, pattern):
                return True
        
        return False
    
    def is_operation_dangerous(self, operation: str) -> bool:
        """Check if operation is dangerous"""
        operation_lower = operation.lower()
        
        for dangerous_op in self.dangerous_operations:
            if dangerous_op.lower() in operation_lower:
                return True
        
        return False
    
    def validate_file_operation(self, operation: str, file_path: str) -> Tuple[bool, str]:
        """Validate file operation safety"""
        # Check emergency stop
        if self.check_emergency_stop():
            return False, "Emergency stop active"
        
        # Check if path is protected
        if self.is_path_protected(file_path):
            self.logger.warning(f"Attempted operation on protected path: {file_path}")
            return False, f"Path is protected: {file_path}"
        
        # Check if operation is dangerous
        if self.is_operation_dangerous(operation):
            self.logger.warning(f"Dangerous operation detected: {operation}")
            return False, f"Dangerous operation: {operation}"
        
        # Check file operation limits
        if not self.resource_monitor.check_file_operations():
            return False, "File operation limit exceeded"
        
        return True, "Operation approved"
    
    @contextmanager
    def safe_execution(self, execution_id: str, context: Dict[str, Any] = None):
        """Context manager for safe execution"""
        if context is None:
            context = {}
        
        # Pre-execution checks
        if self.check_emergency_stop():
            raise RuntimeError("Emergency stop active")
        
        if not self.config["enabled"]:
            self.logger.warning("Safety mechanisms disabled")
        
        # Start monitoring
        self.resource_monitor.start_monitoring()
        start_time = time.time()
        
        try:
            self.logger.info(f"Starting safe execution: {execution_id}")
            yield self
            
        except Exception as e:
            self.logger.error(f"Error in safe execution {execution_id}: {e}")
            self._record_execution_failure(execution_id, str(e))
            raise
        
        finally:
            # Stop monitoring
            self.resource_monitor.stop_monitoring()
            
            # Record execution stats
            execution_time = time.time() - start_time
            self._record_execution_stats(execution_id, execution_time, context)
            
            self.logger.info(f"Completed safe execution: {execution_id} ({execution_time:.2f}s)")
    
    def _record_execution_failure(self, execution_id: str, error: str):
        """Record execution failure"""
        with sqlite3.connect(self.safety_db) as conn:
            conn.execute("""
                INSERT INTO execution_stats 
                (timestamp, execution_id, metric_name, metric_value, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (
                datetime.now().isoformat(),
                execution_id,
                "execution_failure",
                1.0,
                json.dumps({"error": error})
            ))
    
    def _record_execution_stats(self, execution_id: str, execution_time: float, context: Dict[str, Any]):
        """Record execution statistics"""
        with sqlite3.connect(self.safety_db) as conn:
            # Record execution time
            conn.execute("""
                INSERT INTO execution_stats 
                (timestamp, execution_id, metric_name, metric_value, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (
                datetime.now().isoformat(),
                execution_id,
                "execution_time",
                execution_time,
                json.dumps(context)
            ))
            
            # Record resource usage
            usage = self.resource_monitor.get_current_usage()
            for metric, value in usage.items():
                conn.execute("""
                    INSERT INTO execution_stats 
                    (timestamp, execution_id, metric_name, metric_value, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    datetime.now().isoformat(),
                    execution_id,
                    metric,
                    value,
                    json.dumps(context)
                ))
    
    def _handle_memory_violation(self, violation: SafetyViolation):
        """Handle memory violation"""
        self.logger.warning(f"Memory limit exceeded: {violation.current_value:.2f} MB")
        
        if violation.safety_level == SafetyLevel.CRITICAL:
            self.trigger_emergency_stop("Critical memory limit exceeded")
    
    def _handle_cpu_violation(self, violation: SafetyViolation):
        """Handle CPU violation"""
        self.logger.warning(f"CPU limit exceeded: {violation.current_value:.2f}%")
    
    def _handle_time_violation(self, violation: SafetyViolation):
        """Handle execution time violation"""
        self.logger.warning(f"Execution time limit exceeded: {violation.current_value:.2f} minutes")
        
        if violation.safety_level in [SafetyLevel.HIGH, SafetyLevel.CRITICAL]:
            self.trigger_emergency_stop("Execution time limit exceeded")
    
    def get_safety_status(self) -> Dict[str, Any]:
        """Get comprehensive safety status"""
        return {
            "enabled": self.config["enabled"],
            "emergency_stop": self.emergency_stop,
            "resource_usage": self.resource_monitor.get_current_usage(),
            "violations_count": len(self.resource_monitor.violations),
            "recent_violations": [asdict(v) for v in self.resource_monitor.violations[-5:]],
            "protected_paths_count": len(self.protected_paths),
            "dangerous_operations_count": len(self.dangerous_operations),
            "last_check": datetime.now().isoformat()
        }
    
    def get_execution_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent execution history"""
        with sqlite3.connect(self.safety_db) as conn:
            cursor = conn.execute("""
                SELECT execution_id, metric_name, metric_value, timestamp, metadata
                FROM execution_stats 
                ORDER BY timestamp DESC 
                LIMIT ?
            """, (limit,))
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    "execution_id": row[0],
                    "metric_name": row[1],
                    "metric_value": row[2],
                    "timestamp": row[3],
                    "metadata": json.loads(row[4]) if row[4] else {}
                })
            
            return results
    
    def cleanup_old_data(self, days: int = 7):
        """Cleanup old safety data"""
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        with sqlite3.connect(self.safety_db) as conn:
            # Clean old violations
            cursor = conn.execute("""
                DELETE FROM safety_violations 
                WHERE timestamp < ? AND resolved = TRUE
            """, (cutoff_date,))
            
            violations_deleted = cursor.rowcount
            
            # Clean old execution stats
            cursor = conn.execute("""
                DELETE FROM execution_stats 
                WHERE timestamp < ?
            """, (cutoff_date,))
            
            stats_deleted = cursor.rowcount
            
            self.logger.info(f"Cleaned up {violations_deleted} violations and {stats_deleted} stats")

# Decorator for safe function execution
def safe_execution(safety_manager: SafetyManager, execution_id: str = None):
    """Decorator for safe function execution"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            exec_id = execution_id or func.__name__
            
            with safety_manager.safe_execution(exec_id, {"function": func.__name__}):
                return func(*args, **kwargs)
        
        return wrapper
    return decorator

def main():
    """
    Main function for safety manager testing
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="Safety Manager")
    parser.add_argument("--action", choices=["status", "emergency-stop", "clear-stop", "test"],
                       default="status", help="Action to perform")
    parser.add_argument("--project-root", type=Path, default=Path.cwd(),
                       help="Project root directory")
    
    args = parser.parse_args()
    
    # Initialize safety manager
    safety_manager = SafetyManager(args.project_root)
    
    if args.action == "status":
        status = safety_manager.get_safety_status()
        print(json.dumps(status, indent=2))
    
    elif args.action == "emergency-stop":
        safety_manager.trigger_emergency_stop("Manual emergency stop")
        print("Emergency stop triggered")
    
    elif args.action == "clear-stop":
        safety_manager.clear_emergency_stop()
        print("Emergency stop cleared")
    
    elif args.action == "test":
        print("Running safety mechanism test...")
        
        with safety_manager.safe_execution("test_execution"):
            print("Safe execution test completed")
        
        print("Test completed successfully")

if __name__ == "__main__":
    main()