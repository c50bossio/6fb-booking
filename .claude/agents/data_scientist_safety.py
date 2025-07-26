#!/usr/bin/env python3
"""
Safety mechanisms and resource monitoring for the Data Scientist Agent
Ensures the agent operates within defined limits and doesn't impact system performance
"""

import time
import psutil
import threading
import logging
import json
import signal
from typing import Dict, Optional, Callable
from datetime import datetime, timedelta
from pathlib import Path

class ResourceMonitor:
    """Monitor and enforce resource limits for data scientist operations"""
    
    def __init__(self, memory_limit_mb: int = 1024, cpu_limit_percent: float = 65.0, 
                 timeout_minutes: int = 15):
        self.memory_limit_mb = memory_limit_mb
        self.cpu_limit_percent = cpu_limit_percent
        self.timeout_seconds = timeout_minutes * 60
        
        self.start_time = None
        self.monitoring = False
        self.exceeded_limits = False
        
        self.logger = logging.getLogger(__name__)
    
    def start_monitoring(self):
        """Start resource monitoring"""
        self.start_time = time.time()
        self.monitoring = True
        self.exceeded_limits = False
        
        # Start monitoring thread
        monitor_thread = threading.Thread(target=self._monitor_resources, daemon=True)
        monitor_thread.start()
        
        self.logger.info(f"Resource monitoring started - Memory: {self.memory_limit_mb}MB, CPU: {self.cpu_limit_percent}%, Timeout: {self.timeout_seconds}s")
    
    def stop_monitoring(self):
        """Stop resource monitoring"""
        self.monitoring = False
        if self.start_time:
            duration = time.time() - self.start_time
            self.logger.info(f"Resource monitoring stopped - Duration: {duration:.2f}s")
    
    def _monitor_resources(self):
        """Monitor system resources in background thread"""
        while self.monitoring:
            try:
                # Check timeout
                if self.start_time and (time.time() - self.start_time) > self.timeout_seconds:
                    self.logger.warning(f"Data scientist agent timeout exceeded: {self.timeout_seconds}s")
                    self.exceeded_limits = True
                    self._trigger_emergency_stop("Timeout exceeded")
                    break
                
                # Check memory usage
                memory_usage_mb = psutil.virtual_memory().used / (1024 * 1024)
                if memory_usage_mb > self.memory_limit_mb:
                    self.logger.warning(f"Memory limit exceeded: {memory_usage_mb:.1f}MB > {self.memory_limit_mb}MB")
                    self.exceeded_limits = True
                    self._trigger_emergency_stop("Memory limit exceeded")
                    break
                
                # Check CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                if cpu_percent > self.cpu_limit_percent:
                    self.logger.warning(f"CPU limit exceeded: {cpu_percent:.1f}% > {self.cpu_limit_percent}%")
                    # Don't immediately stop for CPU, just log warning
                
                time.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                self.logger.error(f"Resource monitoring error: {e}")
                time.sleep(10)  # Wait longer on error
    
    def _trigger_emergency_stop(self, reason: str):
        """Trigger emergency stop due to resource limits"""
        self.logger.critical(f"EMERGENCY STOP triggered: {reason}")
        
        # Create emergency stop file
        emergency_file = "/Users/bossio/6fb-booking/.claude/EMERGENCY_STOP"
        try:
            Path(emergency_file).touch()
            with open(emergency_file, 'w') as f:
                f.write(f"Data Scientist Agent Emergency Stop\nReason: {reason}\nTime: {datetime.now()}\n")
        except Exception as e:
            self.logger.error(f"Failed to create emergency stop file: {e}")
        
        # Send termination signal
        try:
            import os
            os.kill(os.getpid(), signal.SIGTERM)
        except Exception as e:
            self.logger.error(f"Failed to send termination signal: {e}")
    
    def get_current_usage(self) -> Dict[str, float]:
        """Get current resource usage"""
        return {
            'memory_mb': psutil.virtual_memory().used / (1024 * 1024),
            'cpu_percent': psutil.cpu_percent(),
            'runtime_seconds': time.time() - self.start_time if self.start_time else 0
        }

class RateLimiter:
    """Rate limiting for data scientist agent executions"""
    
    def __init__(self, max_executions_per_hour: int = 6, cooldown_minutes: int = 10):
        self.max_executions_per_hour = max_executions_per_hour
        self.cooldown_seconds = cooldown_minutes * 60
        
        self.execution_times = []
        self.last_execution = None
        
        self.logger = logging.getLogger(__name__)
    
    def can_execute(self) -> tuple[bool, str]:
        """Check if execution is allowed based on rate limits"""
        now = datetime.now()
        
        # Check cooldown period
        if self.last_execution:
            time_since_last = (now - self.last_execution).total_seconds()
            if time_since_last < self.cooldown_seconds:
                remaining = self.cooldown_seconds - time_since_last
                return False, f"Cooldown period active - {remaining:.0f}s remaining"
        
        # Clean up old executions (older than 1 hour)
        one_hour_ago = now - timedelta(hours=1)
        self.execution_times = [t for t in self.execution_times if t > one_hour_ago]
        
        # Check hourly limit
        if len(self.execution_times) >= self.max_executions_per_hour:
            return False, f"Hourly limit reached ({self.max_executions_per_hour} executions/hour)"
        
        return True, "Execution allowed"
    
    def record_execution(self):
        """Record an execution"""
        now = datetime.now()
        self.execution_times.append(now)
        self.last_execution = now
        
        self.logger.info(f"Execution recorded - Total in last hour: {len(self.execution_times)}")
    
    def get_status(self) -> Dict:
        """Get rate limiter status"""
        now = datetime.now()
        
        # Clean up old executions
        one_hour_ago = now - timedelta(hours=1)
        recent_executions = [t for t in self.execution_times if t > one_hour_ago]
        
        cooldown_remaining = 0
        if self.last_execution:
            time_since_last = (now - self.last_execution).total_seconds()
            cooldown_remaining = max(0, self.cooldown_seconds - time_since_last)
        
        return {
            'executions_last_hour': len(recent_executions),
            'max_executions_per_hour': self.max_executions_per_hour,
            'cooldown_remaining_seconds': cooldown_remaining,
            'can_execute': self.can_execute()[0]
        }

class SafetyValidator:
    """Validate and sanitize data scientist operations"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Define safe SQL operations
        self.safe_sql_operations = {
            'SELECT', 'EXPLAIN', 'DESCRIBE', 'SHOW', 'WITH'
        }
        
        # Define dangerous SQL patterns
        self.dangerous_sql_patterns = [
            'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE',
            'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL'
        ]
    
    def validate_sql_query(self, query: str) -> tuple[bool, str]:
        """Validate SQL query for safety"""
        if not query or not query.strip():
            return False, "Empty query"
        
        query_upper = query.upper().strip()
        
        # Check for dangerous operations
        for pattern in self.dangerous_sql_patterns:
            if pattern in query_upper:
                return False, f"Dangerous SQL operation detected: {pattern}"
        
        # Ensure it starts with a safe operation
        first_word = query_upper.split()[0] if query_upper.split() else ""
        if first_word not in self.safe_sql_operations:
            return False, f"SQL operation not in safe list: {first_word}"
        
        # Additional safety checks
        if ';' in query and query.count(';') > 1:
            return False, "Multiple SQL statements not allowed"
        
        if len(query) > 10000:
            return False, "Query too long (>10KB)"
        
        return True, "Query is safe"
    
    def validate_file_access(self, file_path: str) -> tuple[bool, str]:
        """Validate file access for safety"""
        if not file_path:
            return False, "Empty file path"
        
        # Convert to Path object for safety
        try:
            path = Path(file_path).resolve()
        except Exception as e:
            return False, f"Invalid file path: {e}"
        
        # Define allowed directories
        allowed_directories = [
            '/Users/bossio/6fb-booking',
            '/tmp',
            '/var/tmp'
        ]
        
        # Check if path is within allowed directories
        path_str = str(path)
        if not any(path_str.startswith(allowed_dir) for allowed_dir in allowed_directories):
            return False, f"File access outside allowed directories: {path_str}"
        
        # Prevent access to sensitive files
        sensitive_patterns = [
            '.env', 'password', 'secret', 'key', 'token', 'private'
        ]
        
        for pattern in sensitive_patterns:
            if pattern.lower() in path_str.lower():
                return False, f"Access to sensitive file denied: {pattern}"
        
        return True, "File access is safe"
    
    def validate_database_connection(self, connection_params: Dict) -> tuple[bool, str]:
        """Validate database connection parameters"""
        if not connection_params:
            return False, "No connection parameters provided"
        
        # Only allow read-only connections
        if connection_params.get('read_only') is not True:
            # Check if credentials suggest read-only access
            username = connection_params.get('user', '').lower()
            if 'readonly' not in username and 'read_only' not in username:
                self.logger.warning("Database connection may not be read-only")
        
        # Validate host restrictions
        host = connection_params.get('host', '')
        allowed_hosts = ['localhost', '127.0.0.1', '::1']
        
        if host and host not in allowed_hosts:
            return False, f"Database host not in allowed list: {host}"
        
        return True, "Database connection parameters are safe"

class ExecutionSafetyWrapper:
    """Wrapper for safe execution of data scientist operations"""
    
    def __init__(self, memory_limit_mb: int = 1024, cpu_limit_percent: float = 65.0,
                 timeout_minutes: int = 15, max_executions_per_hour: int = 6,
                 cooldown_minutes: int = 10):
        
        self.resource_monitor = ResourceMonitor(memory_limit_mb, cpu_limit_percent, timeout_minutes)
        self.rate_limiter = RateLimiter(max_executions_per_hour, cooldown_minutes)
        self.safety_validator = SafetyValidator()
        
        self.logger = logging.getLogger(__name__)
    
    def safe_execute(self, operation: Callable, *args, **kwargs) -> Dict:
        """Safely execute a data scientist operation with all safety mechanisms"""
        
        # Check rate limiting
        can_execute, rate_message = self.rate_limiter.can_execute()
        if not can_execute:
            return {
                'success': False,
                'error': f"Rate limit exceeded: {rate_message}",
                'safety_check': 'rate_limit_failed'
            }
        
        # Record execution
        self.rate_limiter.record_execution()
        
        # Start resource monitoring
        self.resource_monitor.start_monitoring()
        
        try:
            self.logger.info("Starting safe execution of data scientist operation")
            
            # Execute the operation
            result = operation(*args, **kwargs)
            
            # Check if resource limits were exceeded during execution
            if self.resource_monitor.exceeded_limits:
                return {
                    'success': False,
                    'error': "Resource limits exceeded during execution",
                    'safety_check': 'resource_limit_exceeded'
                }
            
            self.logger.info("Data scientist operation completed successfully")
            
            return {
                'success': True,
                'result': result,
                'resource_usage': self.resource_monitor.get_current_usage(),
                'rate_limit_status': self.rate_limiter.get_status()
            }
            
        except Exception as e:
            self.logger.error(f"Data scientist operation failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'safety_check': 'execution_failed'
            }
        
        finally:
            self.resource_monitor.stop_monitoring()
    
    def validate_sql_operation(self, query: str) -> Dict:
        """Validate SQL operation for safety"""
        is_safe, message = self.safety_validator.validate_sql_query(query)
        
        return {
            'is_safe': is_safe,
            'message': message,
            'query_length': len(query),
            'validation_time': datetime.now().isoformat()
        }
    
    def validate_file_operation(self, file_path: str) -> Dict:
        """Validate file operation for safety"""
        is_safe, message = self.safety_validator.validate_file_access(file_path)
        
        return {
            'is_safe': is_safe,
            'message': message,
            'file_path': file_path,
            'validation_time': datetime.now().isoformat()
        }
    
    def get_safety_status(self) -> Dict:
        """Get comprehensive safety status"""
        return {
            'resource_monitor': {
                'monitoring': self.resource_monitor.monitoring,
                'exceeded_limits': self.resource_monitor.exceeded_limits,
                'current_usage': self.resource_monitor.get_current_usage()
            },
            'rate_limiter': self.rate_limiter.get_status(),
            'emergency_stop_exists': Path("/Users/bossio/6fb-booking/.claude/EMERGENCY_STOP").exists()
        }

def create_safety_wrapper() -> ExecutionSafetyWrapper:
    """Create a configured safety wrapper for data scientist operations"""
    return ExecutionSafetyWrapper(
        memory_limit_mb=1024,
        cpu_limit_percent=65.0,
        timeout_minutes=15,
        max_executions_per_hour=6,
        cooldown_minutes=10
    )

if __name__ == '__main__':
    # Test safety mechanisms
    import json
    
    safety_wrapper = create_safety_wrapper()
    
    # Test SQL validation
    test_queries = [
        "SELECT * FROM users",
        "SELECT COUNT(*) FROM appointments WHERE created_at >= '2024-01-01'",
        "DROP TABLE users",  # Should fail
        "DELETE FROM users WHERE id = 1"  # Should fail
    ]
    
    print("SQL Safety Validation Tests:")
    for query in test_queries:
        result = safety_wrapper.validate_sql_operation(query)
        print(f"Query: {query}")
        print(f"Safe: {result['is_safe']}, Message: {result['message']}")
        print()
    
    # Test file validation
    test_files = [
        "/Users/bossio/6fb-booking/backend-v2/bookedbarber.db",
        "/Users/bossio/6fb-booking/.env",  # Should fail
        "/etc/passwd"  # Should fail
    ]
    
    print("File Safety Validation Tests:")
    for file_path in test_files:
        result = safety_wrapper.validate_file_operation(file_path)
        print(f"File: {file_path}")
        print(f"Safe: {result['is_safe']}, Message: {result['message']}")
        print()
    
    # Print safety status
    print("Safety Status:")
    print(json.dumps(safety_wrapper.get_safety_status(), indent=2))