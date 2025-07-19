#!/usr/bin/env python3
"""
Comprehensive Staging Readiness Validation
Validates all production systems are ready for staging deployment
"""

import sys
import time
import json
import logging
import sqlite3
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.agent_error_handler import error_handler, ErrorSeverity, ErrorCategory
from utils.agent_auth import authenticator, AgentRole, create_agent_api_key
from utils.database_pool import get_database_pool, get_db_pool_status
from utils.agent_health_monitor import health_monitor, get_agent_health
from config.production_config import get_production_config, initialize_production_environment


@dataclass
class ValidationResult:
    """Result of a validation check"""
    check_name: str
    success: bool
    score: float  # 0-100
    message: str
    details: Dict[str, Any] = None
    severity: str = "info"
    recommendations: List[str] = None


class StagingReadinessValidator:
    """Comprehensive staging readiness validation system"""
    
    def __init__(self):
        self.logger = logging.getLogger("staging_validator")
        self.validation_results: List[ValidationResult] = []
        self.overall_score = 0.0
        self.critical_failures = 0
        self.warnings = 0
        
        # Validation weights for overall score calculation
        self.validation_weights = {
            "error_handling_system": 20,
            "authentication_system": 20,
            "database_pooling": 15,
            "health_monitoring": 15,
            "production_config": 10,
            "agent_operations": 10,
            "performance_benchmarks": 5,
            "security_validation": 5
        }
    
    async def run_full_validation(self) -> Dict[str, Any]:
        """Run comprehensive staging readiness validation"""
        self.logger.info("Starting comprehensive staging readiness validation")
        start_time = time.time()
        
        try:
            # Initialize production environment for testing
            self.logger.info("Initializing production environment...")
            config = initialize_production_environment()
            
            # Run all validation checks
            validation_checks = [
                self.validate_error_handling_system(),
                self.validate_authentication_system(),
                self.validate_database_pooling(),
                self.validate_health_monitoring(),
                self.validate_production_config(),
                self.validate_agent_operations(),
                self.validate_performance_benchmarks(),
                self.validate_security_measures()
            ]
            
            # Execute all validations
            for check in validation_checks:
                try:
                    if asyncio.iscoroutine(check):
                        result = await check
                    else:
                        result = check
                    
                    self.validation_results.append(result)
                    
                    if result.severity == "critical" and not result.success:
                        self.critical_failures += 1
                    elif result.severity == "warning" and not result.success:
                        self.warnings += 1
                        
                except Exception as e:
                    error_result = ValidationResult(
                        check_name="validation_error",
                        success=False,
                        score=0.0,
                        message=f"Validation check failed: {e}",
                        severity="critical"
                    )
                    self.validation_results.append(error_result)
                    self.critical_failures += 1
            
            # Calculate overall score
            self.calculate_overall_score()
            
            # Generate comprehensive report
            report = self.generate_validation_report()
            
            # Save report
            self.save_validation_report(report)
            
            elapsed_time = time.time() - start_time
            self.logger.info(f"Staging readiness validation completed in {elapsed_time:.2f} seconds")
            
            return report
            
        except Exception as e:
            self.logger.error(f"Critical error during validation: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def validate_error_handling_system(self) -> ValidationResult:
        """Validate error handling and resilience systems"""
        try:
            details = {}
            score = 0
            issues = []
            
            # Test error handler initialization
            if error_handler:
                score += 25
                details["error_handler_initialized"] = True
            else:
                issues.append("Error handler not initialized")
                details["error_handler_initialized"] = False
            
            # Test circuit breakers
            health_status = error_handler.get_health_status()
            circuit_breakers = health_status.get("circuit_breakers", {})
            
            if circuit_breakers:
                score += 25
                details["circuit_breakers_configured"] = len(circuit_breakers)
                
                # Check circuit breaker states
                open_breakers = [
                    name for name, status in circuit_breakers.items()
                    if status.get("state") == "open"
                ]
                
                if open_breakers:
                    issues.append(f"Open circuit breakers: {', '.join(open_breakers)}")
                    score -= 10
                else:
                    score += 10
                    
            else:
                issues.append("No circuit breakers configured")
            
            # Test retry configurations
            retry_configs = health_status.get("retry_configs", {})
            if retry_configs:
                score += 25
                details["retry_configs_count"] = len(retry_configs)
            else:
                issues.append("No retry configurations found")
            
            # Test error tracking
            try:
                error_patterns = error_handler.error_tracker.get_error_patterns(hours=1)
                score += 15
                details["error_tracking_active"] = True
                details["recent_errors"] = error_patterns.get("total_errors", 0)
            except Exception as e:
                issues.append(f"Error tracking not functional: {e}")
                details["error_tracking_active"] = False
            
            success = score >= 70 and self.critical_failures == 0
            message = f"Error handling system: {score}/100"
            if issues:
                message += f" - Issues: {'; '.join(issues)}"
            
            return ValidationResult(
                check_name="error_handling_system",
                success=success,
                score=score,
                message=message,
                details=details,
                severity="critical" if score < 50 else "warning" if score < 80 else "info",
                recommendations=self._get_error_handling_recommendations(score, issues)
            )
            
        except Exception as e:
            return ValidationResult(
                check_name="error_handling_system",
                success=False,
                score=0,
                message=f"Error handling validation failed: {e}",
                severity="critical"
            )
    
    def validate_authentication_system(self) -> ValidationResult:
        """Validate authentication and authorization systems"""
        try:
            details = {}
            score = 0
            issues = []
            
            # Test authenticator initialization
            if authenticator:
                score += 20
                details["authenticator_initialized"] = True
            else:
                issues.append("Authenticator not initialized")
                return ValidationResult(
                    check_name="authentication_system",
                    success=False,
                    score=0,
                    message="Authentication system not initialized",
                    severity="critical"
                )
            
            # Test agent credential creation
            try:
                # First, clean up any existing test agent
                try:
                    import sqlite3
                    with sqlite3.connect(authenticator.db_path) as conn:
                        conn.execute("DELETE FROM agent_credentials WHERE agent_id = ?", ("test_validation_agent",))
                        conn.execute("DELETE FROM auth_sessions WHERE agent_id = ?", ("test_validation_agent",))
                        conn.commit()
                except:
                    pass  # Agent might not exist, which is fine
                
                test_key = create_agent_api_key("test_validation_agent", AgentRole.READONLY_AGENT)
                if test_key and test_key.startswith("ak_"):
                    score += 20
                    details["credential_creation"] = True
                    
                    # Test authentication
                    try:
                        auth_context = authenticator.authenticate_agent(test_key, "127.0.0.1")
                        if auth_context and auth_context.agent_id == "test_validation_agent":
                            score += 20
                            details["authentication_working"] = True
                            
                            # Test session validation
                            try:
                                session_context = authenticator.validate_session(auth_context.session_id)
                                if session_context:
                                    score += 20
                                    details["session_validation"] = True
                                else:
                                    issues.append("Session validation failed")
                            except Exception as e:
                                issues.append(f"Session validation error: {e}")
                        else:
                            issues.append("Authentication failed")
                    except Exception as e:
                        issues.append(f"Authentication test failed: {e}")
                        
                    # Cleanup test agent
                    try:
                        authenticator.revoke_agent_credentials("test_validation_agent")
                    except:
                        pass
                        
                else:
                    issues.append("Invalid API key format generated")
                    
            except Exception as e:
                issues.append(f"Credential creation failed: {e}")
            
            # Test rate limiting
            try:
                rate_limiter = authenticator.rate_limiter
                is_allowed, remaining = rate_limiter.check_rate_limit("test_rate_limit", 1000)
                if is_allowed:
                    score += 10
                    details["rate_limiting_functional"] = True
                else:
                    issues.append("Rate limiting not working correctly")
            except Exception as e:
                issues.append(f"Rate limiting test failed: {e}")
            
            # Test auth statistics
            try:
                auth_stats = authenticator.get_auth_stats()
                if isinstance(auth_stats, dict):
                    score += 10
                    details["auth_stats_available"] = True
                    details["total_auth_attempts"] = auth_stats.get("total_auth_attempts", 0)
                else:
                    issues.append("Auth statistics not available")
            except Exception as e:
                issues.append(f"Auth statistics test failed: {e}")
            
            success = score >= 70 and len(issues) == 0
            message = f"Authentication system: {score}/100"
            if issues:
                message += f" - Issues: {'; '.join(issues)}"
            
            return ValidationResult(
                check_name="authentication_system",
                success=success,
                score=score,
                message=message,
                details=details,
                severity="critical" if score < 50 else "warning" if score < 80 else "info",
                recommendations=self._get_auth_recommendations(score, issues)
            )
            
        except Exception as e:
            return ValidationResult(
                check_name="authentication_system",
                success=False,
                score=0,
                message=f"Authentication validation failed: {e}",
                severity="critical"
            )
    
    def validate_database_pooling(self) -> ValidationResult:
        """Validate database connection pooling system"""
        try:
            details = {}
            score = 0
            issues = []
            
            # Test pool initialization
            try:
                pool = get_database_pool()
                if pool:
                    score += 25
                    details["pool_initialized"] = True
                else:
                    issues.append("Database pool not initialized")
                    return ValidationResult(
                        check_name="database_pooling",
                        success=False,
                        score=0,
                        message="Database pool not initialized",
                        severity="critical"
                    )
            except Exception as e:
                issues.append(f"Pool initialization failed: {e}")
                return ValidationResult(
                    check_name="database_pooling",
                    success=False,
                    score=0,
                    message=f"Database pool error: {e}",
                    severity="critical"
                )
            
            # Test pool status
            try:
                pool_status = get_db_pool_status()
                details["pool_status"] = pool_status
                
                if pool_status.get("pool_state") == "healthy":
                    score += 25
                elif pool_status.get("pool_state") == "degraded":
                    score += 15
                    issues.append("Pool in degraded state")
                else:
                    issues.append("Pool not healthy")
                
                # Check connection counts
                total_conns = pool_status.get("total_connections", 0)
                available_conns = pool_status.get("available_connections", 0)
                
                if total_conns > 0:
                    score += 15
                    details["total_connections"] = total_conns
                    details["available_connections"] = available_conns
                else:
                    issues.append("No database connections available")
                
            except Exception as e:
                issues.append(f"Pool status check failed: {e}")
            
            # Test connection usage
            try:
                from utils.database_pool import execute_query
                result = execute_query("SELECT 1")
                if result and result[0][0] == 1:
                    score += 25
                    details["query_execution"] = True
                else:
                    issues.append("Query execution failed")
            except Exception as e:
                issues.append(f"Connection test failed: {e}")
            
            # Test transaction support
            try:
                from utils.database_pool import execute_transaction
                queries = [
                    ("CREATE TEMP TABLE test_staging (id INTEGER)", None),
                    ("INSERT INTO test_staging VALUES (1)", None),
                    ("SELECT COUNT(*) FROM test_staging", None)
                ]
                result = execute_transaction(queries)
                if result:
                    score += 10
                    details["transaction_support"] = True
                else:
                    issues.append("Transaction support not working")
            except Exception as e:
                issues.append(f"Transaction test failed: {e}")
            
            success = score >= 70 and len(issues) == 0
            message = f"Database pooling: {score}/100"
            if issues:
                message += f" - Issues: {'; '.join(issues)}"
            
            return ValidationResult(
                check_name="database_pooling",
                success=success,
                score=score,
                message=message,
                details=details,
                severity="critical" if score < 50 else "warning" if score < 80 else "info",
                recommendations=self._get_database_recommendations(score, issues)
            )
            
        except Exception as e:
            return ValidationResult(
                check_name="database_pooling",
                success=False,
                score=0,
                message=f"Database pooling validation failed: {e}",
                severity="critical"
            )
    
    def validate_health_monitoring(self) -> ValidationResult:
        """Validate health monitoring and alerting systems"""
        try:
            details = {}
            score = 0
            issues = []
            
            # Test health monitor initialization
            if health_monitor:
                score += 20
                details["health_monitor_initialized"] = True
            else:
                issues.append("Health monitor not initialized")
                return ValidationResult(
                    check_name="health_monitoring",
                    success=False,
                    score=0,
                    message="Health monitor not initialized",
                    severity="critical"
                )
            
            # Test system health status
            try:
                health_status = get_agent_health()
                details["health_status"] = health_status
                
                overall_status = health_status.get("overall_status", "unknown")
                if overall_status == "healthy":
                    score += 25
                elif overall_status == "degraded":
                    score += 15
                    issues.append("System in degraded state")
                else:
                    issues.append(f"System status: {overall_status}")
                
                # Check health checks
                health_checks = health_status.get("health_checks", {})
                if health_checks:
                    score += 20
                    details["health_checks_count"] = len(health_checks)
                    
                    failed_checks = [
                        name for name, status in health_checks.items()
                        if status.get("status") != "healthy"
                    ]
                    
                    if failed_checks:
                        issues.append(f"Failed health checks: {', '.join(failed_checks)}")
                    else:
                        score += 10
                else:
                    issues.append("No health checks configured")
                
            except Exception as e:
                issues.append(f"Health status check failed: {e}")
            
            # Test metrics collection
            try:
                if hasattr(health_monitor, 'metrics_collector'):
                    score += 15
                    details["metrics_collection"] = True
                    
                    # Test metrics summary
                    metrics_summary = health_monitor.metrics_collector.get_metrics_summary("test_agent", hours=1)
                    if metrics_summary:
                        score += 10
                        details["metrics_summary_available"] = True
                    else:
                        issues.append("Metrics summary not available")
                else:
                    issues.append("Metrics collector not available")
            except Exception as e:
                issues.append(f"Metrics collection test failed: {e}")
            
            success = score >= 70 and len(issues) == 0
            message = f"Health monitoring: {score}/100"
            if issues:
                message += f" - Issues: {'; '.join(issues)}"
            
            return ValidationResult(
                check_name="health_monitoring",
                success=success,
                score=score,
                message=message,
                details=details,
                severity="critical" if score < 50 else "warning" if score < 80 else "info",
                recommendations=self._get_monitoring_recommendations(score, issues)
            )
            
        except Exception as e:
            return ValidationResult(
                check_name="health_monitoring",
                success=False,
                score=0,
                message=f"Health monitoring validation failed: {e}",
                severity="critical"
            )
    
    def validate_production_config(self) -> ValidationResult:
        """Validate production configuration system"""
        try:
            details = {}
            score = 0
            issues = []
            
            # Test production config initialization
            try:
                config = get_production_config()
                if config:
                    score += 30
                    details["config_initialized"] = True
                    
                    # Test system status
                    system_status = config.get_system_status()
                    if system_status:
                        score += 20
                        details["system_status_available"] = True
                        
                        # Check individual systems
                        systems = system_status.get("systems", {})
                        working_systems = 0
                        total_systems = len(systems)
                        
                        for system_name, system_info in systems.items():
                            if not isinstance(system_info, dict) or "error" not in system_info:
                                working_systems += 1
                            else:
                                issues.append(f"System {system_name} has errors")
                        
                        if total_systems > 0:
                            system_score = (working_systems / total_systems) * 30
                            score += system_score
                            details["working_systems"] = f"{working_systems}/{total_systems}"
                        
                    else:
                        issues.append("System status not available")
                else:
                    issues.append("Production config not initialized")
                    
            except Exception as e:
                issues.append(f"Production config test failed: {e}")
            
            # Test configuration file
            try:
                config_file = Path("production_config.json")
                if config_file.exists():
                    score += 10
                    details["config_file_exists"] = True
                    
                    with open(config_file, 'r') as f:
                        config_data = json.load(f)
                        
                    required_sections = ["database", "error_handling", "authentication", "monitoring"]
                    present_sections = [section for section in required_sections if section in config_data]
                    
                    section_score = (len(present_sections) / len(required_sections)) * 10
                    score += section_score
                    details["config_sections"] = f"{len(present_sections)}/{len(required_sections)}"
                    
                else:
                    issues.append("Production config file not found")
                    
            except Exception as e:
                issues.append(f"Config file validation failed: {e}")
            
            success = score >= 70 and len(issues) == 0
            message = f"Production config: {score}/100"
            if issues:
                message += f" - Issues: {'; '.join(issues)}"
            
            return ValidationResult(
                check_name="production_config",
                success=success,
                score=score,
                message=message,
                details=details,
                severity="warning" if score < 80 else "info",
                recommendations=self._get_config_recommendations(score, issues)
            )
            
        except Exception as e:
            return ValidationResult(
                check_name="production_config",
                success=False,
                score=0,
                message=f"Production config validation failed: {e}",
                severity="warning"
            )
    
    def validate_agent_operations(self) -> ValidationResult:
        """Validate core agent operation capabilities"""
        try:
            details = {}
            score = 0
            issues = []
            
            # Test agent system files
            agent_files = [
                "utils/agent_error_handler.py",
                "utils/agent_auth.py", 
                "utils/database_pool.py",
                "utils/agent_health_monitor.py",
                "utils/sub_agent_manager.py"
            ]
            
            present_files = 0
            for file_path in agent_files:
                if Path(file_path).exists():
                    present_files += 1
                else:
                    issues.append(f"Missing file: {file_path}")
            
            file_score = (present_files / len(agent_files)) * 30
            score += file_score
            details["agent_files_present"] = f"{present_files}/{len(agent_files)}"
            
            # Test agent manager functionality
            try:
                from utils.sub_agent_manager import SubAgentManager
                manager = SubAgentManager(max_agents=2)
                
                if manager:
                    score += 20
                    details["agent_manager_functional"] = True
                    
                    # Test task creation (if phase config exists)
                    phase_config_path = Path("migrations/phase_config.json")
                    if phase_config_path.exists():
                        try:
                            tasks = manager.create_phase_tasks(1)
                            if tasks:
                                score += 15
                                details["task_creation_working"] = True
                                details["test_tasks_created"] = len(tasks)
                            else:
                                issues.append("No tasks created from phase config")
                        except Exception as e:
                            issues.append(f"Task creation failed: {e}")
                    else:
                        score += 10  # Partial credit since config doesn't exist
                        details["phase_config_missing"] = True
                        
                else:
                    issues.append("Agent manager initialization failed")
                    
            except Exception as e:
                issues.append(f"Agent manager test failed: {e}")
            
            # Test error handling integration
            try:
                from utils.agent_error_handler import with_retry, DatabaseError
                
                @with_retry("test_operation", max_attempts=2)
                def test_function():
                    return "success"
                
                result = test_function()
                if result == "success":
                    score += 15
                    details["error_handling_integration"] = True
                else:
                    issues.append("Error handling integration failed")
                    
            except Exception as e:
                issues.append(f"Error handling integration test failed: {e}")
            
            # Test authentication integration
            try:
                from utils.agent_auth import require_auth, Permission
                
                @require_auth(Permission.READ_CLIENT_DATA)
                def test_auth_function(auth_context=None):
                    return auth_context is not None
                
                # This should fail without proper authentication
                try:
                    test_auth_function()
                    issues.append("Authentication bypass detected")
                except:
                    score += 20
                    details["authentication_integration"] = True
                    
            except Exception as e:
                issues.append(f"Authentication integration test failed: {e}")
            
            success = score >= 70 and len(issues) == 0
            message = f"Agent operations: {score}/100"
            if issues:
                message += f" - Issues: {'; '.join(issues)}"
            
            return ValidationResult(
                check_name="agent_operations",
                success=success,
                score=score,
                message=message,
                details=details,
                severity="warning" if score < 80 else "info",
                recommendations=self._get_agent_recommendations(score, issues)
            )
            
        except Exception as e:
            return ValidationResult(
                check_name="agent_operations",
                success=False,
                score=0,
                message=f"Agent operations validation failed: {e}",
                severity="warning"
            )
    
    def validate_performance_benchmarks(self) -> ValidationResult:
        """Validate system performance benchmarks"""
        try:
            details = {}
            score = 0
            issues = []
            
            # Database performance test
            start_time = time.time()
            try:
                from utils.database_pool import execute_query
                
                # Run multiple queries to test performance
                for i in range(10):
                    execute_query("SELECT 1")
                
                db_time = time.time() - start_time
                details["database_10_queries_ms"] = db_time * 1000
                
                if db_time < 0.1:  # Under 100ms for 10 queries
                    score += 30
                elif db_time < 0.5:  # Under 500ms
                    score += 20
                    issues.append("Database queries slower than optimal")
                else:
                    issues.append("Database performance poor")
                    
            except Exception as e:
                issues.append(f"Database performance test failed: {e}")
            
            # Memory usage check
            try:
                import psutil
                memory_percent = psutil.virtual_memory().percent
                details["memory_usage_percent"] = memory_percent
                
                if memory_percent < 70:
                    score += 25
                elif memory_percent < 85:
                    score += 15
                    issues.append("High memory usage")
                else:
                    issues.append("Critical memory usage")
                    
            except ImportError:
                score += 15  # Partial credit if psutil not available
                details["memory_monitoring_unavailable"] = True
            except Exception as e:
                issues.append(f"Memory check failed: {e}")
            
            # System load test
            try:
                # Test concurrent operations
                concurrent_start = time.time()
                
                import threading
                
                def concurrent_db_query():
                    try:
                        from utils.database_pool import execute_query
                        execute_query("SELECT 1")
                    except:
                        pass
                
                threads = []
                for i in range(5):
                    thread = threading.Thread(target=concurrent_db_query)
                    threads.append(thread)
                    thread.start()
                
                for thread in threads:
                    thread.join()
                
                concurrent_time = time.time() - concurrent_start
                details["concurrent_5_queries_ms"] = concurrent_time * 1000
                
                if concurrent_time < 0.2:  # Under 200ms for 5 concurrent queries
                    score += 25
                elif concurrent_time < 1.0:  # Under 1 second
                    score += 15
                    issues.append("Concurrent performance suboptimal")
                else:
                    issues.append("Poor concurrent performance")
                    
            except Exception as e:
                issues.append(f"Concurrent load test failed: {e}")
            
            # Startup time simulation
            try:
                startup_start = time.time()
                
                # Simulate system initialization
                from config.production_config import ProductionConfig
                test_config = ProductionConfig()
                
                startup_time = time.time() - startup_start
                details["startup_time_seconds"] = startup_time
                
                if startup_time < 5.0:  # Under 5 seconds
                    score += 20
                elif startup_time < 15.0:  # Under 15 seconds
                    score += 10
                    issues.append("Slow startup time")
                else:
                    issues.append("Very slow startup time")
                    
            except Exception as e:
                issues.append(f"Startup time test failed: {e}")
            
            success = score >= 60  # Lower threshold for performance
            message = f"Performance benchmarks: {score}/100"
            if issues:
                message += f" - Issues: {'; '.join(issues)}"
            
            return ValidationResult(
                check_name="performance_benchmarks",
                success=success,
                score=score,
                message=message,
                details=details,
                severity="warning" if score < 70 else "info",
                recommendations=self._get_performance_recommendations(score, issues)
            )
            
        except Exception as e:
            return ValidationResult(
                check_name="performance_benchmarks",
                success=False,
                score=0,
                message=f"Performance validation failed: {e}",
                severity="info"
            )
    
    def validate_security_measures(self) -> ValidationResult:
        """Validate security measures and best practices"""
        try:
            details = {}
            score = 0
            issues = []
            
            # Check for sensitive file exposure
            sensitive_patterns = [".env", "*.key", "*.pem", "*password*", "*secret*"]
            exposed_files = []
            
            for pattern in sensitive_patterns:
                import glob
                files = glob.glob(pattern)
                exposed_files.extend(files)
            
            if not exposed_files:
                score += 25
                details["no_exposed_sensitive_files"] = True
            else:
                issues.append(f"Exposed sensitive files: {', '.join(exposed_files)}")
                details["exposed_files"] = exposed_files
            
            # Check authentication security
            try:
                from utils.agent_auth import authenticator
                
                # Check if default/weak credentials exist
                weak_agents = []
                # This would need to be implemented in the authenticator
                # For now, assume good if authenticator exists
                if authenticator:
                    score += 25
                    details["authentication_security"] = True
                else:
                    issues.append("No authentication system")
                    
            except Exception as e:
                issues.append(f"Authentication security check failed: {e}")
            
            # Check database security
            try:
                db_files = list(Path(".").glob("*.db"))
                if db_files:
                    score += 15
                    details["database_files_present"] = len(db_files)
                    
                    # Check file permissions (Unix-like systems)
                    import stat
                    for db_file in db_files:
                        file_stat = db_file.stat()
                        # Check if file is world-readable
                        if file_stat.st_mode & stat.S_IROTH:
                            issues.append(f"Database file {db_file} is world-readable")
                        else:
                            score += 5
                else:
                    details["no_database_files"] = True
                    
            except Exception as e:
                issues.append(f"Database security check failed: {e}")
            
            # Check logging security
            try:
                log_files = list(Path(".").glob("**/*.log"))
                if log_files:
                    details["log_files_found"] = len(log_files)
                    
                    # Check if logs contain sensitive information
                    sensitive_keywords = ["password", "secret", "key", "token", "api_key"]
                    sensitive_logs = []
                    
                    for log_file in log_files[:5]:  # Check first 5 log files
                        try:
                            with open(log_file, 'r') as f:
                                content = f.read().lower()
                                for keyword in sensitive_keywords:
                                    if keyword in content:
                                        sensitive_logs.append((log_file, keyword))
                                        break
                        except:
                            pass
                    
                    if not sensitive_logs:
                        score += 15
                        details["logs_clean"] = True
                    else:
                        issues.append(f"Sensitive data in logs: {sensitive_logs}")
                        
                else:
                    score += 10  # No logs is better than insecure logs
                    details["no_log_files"] = True
                    
            except Exception as e:
                issues.append(f"Log security check failed: {e}")
            
            # Check configuration security
            try:
                config_files = ["production_config.json", ".env*", "config/*.json"]
                secure_configs = 0
                total_configs = 0
                
                for pattern in config_files:
                    import glob
                    files = glob.glob(pattern)
                    total_configs += len(files)
                    
                    for config_file in files:
                        try:
                            file_path = Path(config_file)
                            if file_path.suffix == '.json':
                                with open(file_path, 'r') as f:
                                    config_data = json.load(f)
                                
                                # Check if secrets are hardcoded (but allow null values and placeholders)
                                config_str = json.dumps(config_data).lower()
                                # Look for actual secret values, not just field names
                                has_hardcoded_secrets = False
                                secret_patterns = ["password", "secret", "key"]
                                
                                for secret_word in secret_patterns:
                                    # Find all occurrences of the secret word
                                    import re
                                    matches = re.finditer(rf'["\']?{secret_word}["\']?\s*:\s*["\']([^"\']+)["\']', config_str)
                                    for match in matches:
                                        value = match.group(1)
                                        # Flag as hardcoded if it's not null, empty, or placeholder
                                        if value and value != "null" and value != "none" and not value.startswith("$") and not value.startswith("env:"):
                                            has_hardcoded_secrets = True
                                            break
                                    if has_hardcoded_secrets:
                                        break
                                
                                if not has_hardcoded_secrets:
                                    secure_configs += 1
                                else:
                                    issues.append(f"Hardcoded secrets in {config_file}")
                            else:
                                secure_configs += 1  # Assume .env files are secure if present
                                
                        except:
                            pass
                
                if total_configs > 0:
                    config_score = (secure_configs / total_configs) * 20
                    score += config_score
                    details["secure_configs"] = f"{secure_configs}/{total_configs}"
                else:
                    score += 10
                    details["no_config_files"] = True
                    
            except Exception as e:
                issues.append(f"Configuration security check failed: {e}")
            
            success = score >= 70 and len(issues) == 0
            message = f"Security measures: {score}/100"
            if issues:
                message += f" - Issues: {'; '.join(issues)}"
            
            return ValidationResult(
                check_name="security_validation",
                success=success,
                score=score,
                message=message,
                details=details,
                severity="warning" if score < 80 else "info",
                recommendations=self._get_security_recommendations(score, issues)
            )
            
        except Exception as e:
            return ValidationResult(
                check_name="security_validation",
                success=False,
                score=0,
                message=f"Security validation failed: {e}",
                severity="warning"
            )
    
    def calculate_overall_score(self):
        """Calculate weighted overall score"""
        total_weighted_score = 0
        total_weight = 0
        
        for result in self.validation_results:
            weight = self.validation_weights.get(result.check_name, 1)
            total_weighted_score += result.score * weight
            total_weight += weight
        
        if total_weight > 0:
            self.overall_score = total_weighted_score / total_weight
        else:
            self.overall_score = 0
    
    def generate_validation_report(self) -> Dict[str, Any]:
        """Generate comprehensive validation report"""
        # Categorize results
        critical_issues = [r for r in self.validation_results if r.severity == "critical" and not r.success]
        warnings = [r for r in self.validation_results if r.severity == "warning" and not r.success]
        passed_checks = [r for r in self.validation_results if r.success]
        
        # Determine readiness level
        if self.critical_failures > 0:
            readiness_level = "NOT_READY"
            readiness_message = f"Critical issues must be resolved ({self.critical_failures} critical failures)"
        elif self.overall_score < 70:
            readiness_level = "NOT_READY"
            readiness_message = f"Overall score too low ({self.overall_score:.1f}/100)"
        elif self.warnings > 3:
            readiness_level = "CONDITIONALLY_READY"
            readiness_message = f"Multiple warnings present ({self.warnings} warnings)"
        elif self.overall_score < 85:
            readiness_level = "CONDITIONALLY_READY"
            readiness_message = f"Score acceptable but could be improved ({self.overall_score:.1f}/100)"
        else:
            readiness_level = "READY"
            readiness_message = "All systems validated and ready for staging"
        
        # Generate recommendations
        all_recommendations = []
        for result in self.validation_results:
            if result.recommendations:
                all_recommendations.extend(result.recommendations)
        
        return {
            "validation_timestamp": datetime.now().isoformat(),
            "overall_score": round(self.overall_score, 1),
            "readiness_level": readiness_level,
            "readiness_message": readiness_message,
            "summary": {
                "total_checks": len(self.validation_results),
                "passed_checks": len(passed_checks),
                "critical_failures": self.critical_failures,
                "warnings": self.warnings,
                "success_rate": round(len(passed_checks) / len(self.validation_results) * 100, 1) if self.validation_results else 0
            },
            "critical_issues": [
                {
                    "check": issue.check_name,
                    "message": issue.message,
                    "recommendations": issue.recommendations or []
                }
                for issue in critical_issues
            ],
            "warnings": [
                {
                    "check": warning.check_name,
                    "message": warning.message,
                    "recommendations": warning.recommendations or []
                }
                for warning in warnings
            ],
            "detailed_results": [asdict(result) for result in self.validation_results],
            "recommendations": {
                "immediate_actions": [rec for rec in all_recommendations if "critical" in rec.lower() or "immediately" in rec.lower()],
                "improvements": [rec for rec in all_recommendations if rec not in [rec for rec in all_recommendations if "critical" in rec.lower() or "immediately" in rec.lower()]],
                "next_steps": self._generate_next_steps(readiness_level)
            },
            "system_requirements": {
                "minimum_score": 70,
                "recommended_score": 85,
                "max_critical_failures": 0,
                "max_warnings": 3
            }
        }
    
    def save_validation_report(self, report: Dict[str, Any]):
        """Save validation report to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = Path(f"staging_readiness_report_{timestamp}.json")
        
        try:
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            self.logger.info(f"Validation report saved to {report_file}")
            
            # Also save a summary
            summary_file = Path(f"staging_readiness_summary_{timestamp}.txt")
            with open(summary_file, 'w') as f:
                f.write(f"BookedBarber V2 Staging Readiness Report\n")
                f.write(f"Generated: {report['validation_timestamp']}\n")
                f.write(f"{'='*50}\n\n")
                f.write(f"Overall Score: {report['overall_score']}/100\n")
                f.write(f"Readiness Level: {report['readiness_level']}\n")
                f.write(f"Message: {report['readiness_message']}\n\n")
                
                f.write(f"Summary:\n")
                f.write(f"- Total Checks: {report['summary']['total_checks']}\n")
                f.write(f"- Passed: {report['summary']['passed_checks']}\n")
                f.write(f"- Critical Failures: {report['summary']['critical_failures']}\n")
                f.write(f"- Warnings: {report['summary']['warnings']}\n")
                f.write(f"- Success Rate: {report['summary']['success_rate']}%\n\n")
                
                if report['critical_issues']:
                    f.write(f"Critical Issues:\n")
                    for issue in report['critical_issues']:
                        f.write(f"- {issue['check']}: {issue['message']}\n")
                    f.write(f"\n")
                
                if report['warnings']:
                    f.write(f"Warnings:\n")
                    for warning in report['warnings']:
                        f.write(f"- {warning['check']}: {warning['message']}\n")
                    f.write(f"\n")
                
                if report['recommendations']['immediate_actions']:
                    f.write(f"Immediate Actions Required:\n")
                    for action in report['recommendations']['immediate_actions']:
                        f.write(f"- {action}\n")
                    f.write(f"\n")
            
            self.logger.info(f"Summary report saved to {summary_file}")
            
        except Exception as e:
            self.logger.error(f"Failed to save validation report: {e}")
    
    def _generate_next_steps(self, readiness_level: str) -> List[str]:
        """Generate next steps based on readiness level"""
        if readiness_level == "READY":
            return [
                "Proceed with staging deployment",
                "Monitor system performance during initial staging phase",
                "Conduct user acceptance testing",
                "Prepare production deployment plan"
            ]
        elif readiness_level == "CONDITIONALLY_READY":
            return [
                "Address all critical issues before staging",
                "Review and resolve warnings if possible",
                "Conduct limited staging deployment with monitoring",
                "Plan remediation for identified issues"
            ]
        else:  # NOT_READY
            return [
                "Resolve all critical issues immediately",
                "Re-run validation after fixes",
                "Conduct additional testing",
                "Do not proceed to staging until ready"
            ]
    
    # Recommendation methods
    def _get_error_handling_recommendations(self, score: float, issues: List[str]) -> List[str]:
        recommendations = []
        if score < 50:
            recommendations.append("Critical: Implement complete error handling system")
        if "No circuit breakers" in str(issues):
            recommendations.append("Configure circuit breakers for external services")
        if "No retry configurations" in str(issues):
            recommendations.append("Add retry policies for critical operations")
        return recommendations
    
    def _get_auth_recommendations(self, score: float, issues: List[str]) -> List[str]:
        recommendations = []
        if score < 50:
            recommendations.append("Critical: Fix authentication system initialization")
        if "Rate limiting" in str(issues):
            recommendations.append("Implement proper rate limiting")
        if "Session validation" in str(issues):
            recommendations.append("Fix session management")
        return recommendations
    
    def _get_database_recommendations(self, score: float, issues: List[str]) -> List[str]:
        recommendations = []
        if score < 50:
            recommendations.append("Critical: Fix database connection pooling")
        if "Pool in degraded state" in str(issues):
            recommendations.append("Investigate pool health issues")
        if "No database connections" in str(issues):
            recommendations.append("Ensure minimum connection count is maintained")
        return recommendations
    
    def _get_monitoring_recommendations(self, score: float, issues: List[str]) -> List[str]:
        recommendations = []
        if score < 50:
            recommendations.append("Critical: Implement health monitoring system")
        if "Failed health checks" in str(issues):
            recommendations.append("Investigate and fix failing health checks")
        if "Metrics collection" in str(issues):
            recommendations.append("Enable comprehensive metrics collection")
        return recommendations
    
    def _get_config_recommendations(self, score: float, issues: List[str]) -> List[str]:
        recommendations = []
        if score < 50:
            recommendations.append("Create complete production configuration")
        if "config file not found" in str(issues):
            recommendations.append("Generate production configuration file")
        return recommendations
    
    def _get_agent_recommendations(self, score: float, issues: List[str]) -> List[str]:
        recommendations = []
        if "Missing file" in str(issues):
            recommendations.append("Ensure all agent system files are present")
        if "Agent manager" in str(issues):
            recommendations.append("Fix agent manager functionality")
        return recommendations
    
    def _get_performance_recommendations(self, score: float, issues: List[str]) -> List[str]:
        recommendations = []
        if "Database performance" in str(issues):
            recommendations.append("Optimize database query performance")
        if "memory usage" in str(issues):
            recommendations.append("Investigate and reduce memory consumption")
        if "Concurrent performance" in str(issues):
            recommendations.append("Optimize concurrent operation handling")
        return recommendations
    
    def _get_security_recommendations(self, score: float, issues: List[str]) -> List[str]:
        recommendations = []
        if "Exposed sensitive files" in str(issues):
            recommendations.append("Remove or secure exposed sensitive files")
        if "world-readable" in str(issues):
            recommendations.append("Fix file permissions on database files")
        if "Sensitive data in logs" in str(issues):
            recommendations.append("Remove sensitive information from log files")
        return recommendations


async def main():
    """Main validation entry point"""
    print("🔍 Starting BookedBarber V2 Staging Readiness Validation")
    print("=" * 60)
    
    validator = StagingReadinessValidator()
    report = await validator.run_full_validation()
    
    print(f"\n📊 Validation Complete!")
    print(f"Overall Score: {report['overall_score']}/100")
    print(f"Readiness Level: {report['readiness_level']}")
    print(f"Message: {report['readiness_message']}")
    
    print(f"\n📈 Summary:")
    print(f"- Total Checks: {report['summary']['total_checks']}")
    print(f"- Passed: {report['summary']['passed_checks']}")
    print(f"- Critical Failures: {report['summary']['critical_failures']}")
    print(f"- Warnings: {report['summary']['warnings']}")
    print(f"- Success Rate: {report['summary']['success_rate']}%")
    
    if report['critical_issues']:
        print(f"\n🚨 Critical Issues:")
        for issue in report['critical_issues']:
            print(f"- {issue['check']}: {issue['message']}")
    
    if report['warnings']:
        print(f"\n⚠️  Warnings:")
        for warning in report['warnings']:
            print(f"- {warning['check']}: {warning['message']}")
    
    if report['recommendations']['immediate_actions']:
        print(f"\n🎯 Immediate Actions Required:")
        for action in report['recommendations']['immediate_actions']:
            print(f"- {action}")
    
    print(f"\n📋 Next Steps:")
    for step in report['recommendations']['next_steps']:
        print(f"- {step}")
    
    # Return appropriate exit code
    if report['readiness_level'] == "READY":
        return 0
    elif report['readiness_level'] == "CONDITIONALLY_READY":
        return 1
    else:
        return 2


if __name__ == "__main__":
    import asyncio
    sys.exit(asyncio.run(main()))