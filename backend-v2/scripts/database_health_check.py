#!/usr/bin/env python3
"""
Database Health Check Script for BookedBarber V2
===============================================

Comprehensive health check script that validates database configuration,
performance, and readiness for production deployment.

Usage:
    python scripts/database_health_check.py
    python scripts/database_health_check.py --check-indexes
    python scripts/database_health_check.py --performance-test
    python scripts/database_health_check.py --production-readiness
"""

import os
import sys
import time
import json
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import concurrent.futures

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from sqlalchemy.orm import sessionmaker
import logging

from config.database_production import DatabaseHealthChecker, create_optimized_engine

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class HealthCheckResult:
    """Result of a health check test."""
    test_name: str
    status: str  # 'PASS', 'WARN', 'FAIL'
    message: str
    details: Optional[Dict[str, Any]] = None
    execution_time: Optional[float] = None


class DatabaseHealthChecker:
    """Comprehensive database health checker."""
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL not provided or configured")
            
        self.is_postgresql = self.database_url.startswith('postgresql')
        self.engine = None
        self.session_factory = None
        self.results: List[HealthCheckResult] = []
        
    def setup_connection(self):
        """Setup database connection."""
        try:
            self.engine = create_optimized_engine(os.getenv('ENVIRONMENT', 'development'))
            self.session_factory = sessionmaker(bind=self.engine)
            logger.info(f"Connected to database: {str(self.engine.url)[:50]}...")
        except Exception as e:
            raise ConnectionError(f"Failed to connect to database: {e}")
            
    def run_all_checks(self) -> List[HealthCheckResult]:
        """Run all health checks and return results."""
        logger.info("Starting comprehensive database health check...")
        
        self.setup_connection()
        
        # Core health checks
        self.check_basic_connectivity()
        self.check_table_structure()
        self.check_required_indexes()
        self.check_connection_pool()
        
        # Performance checks
        self.check_query_performance()
        self.check_index_usage()
        
        # Production readiness checks
        self.check_production_config()
        self.check_backup_configuration()
        self.check_security_settings()
        
        # Generate summary
        self.generate_summary()
        
        return self.results
        
    def check_basic_connectivity(self):
        """Test basic database connectivity."""
        start_time = time.time()
        
        try:
            with self.session_factory() as session:
                result = session.execute(text("SELECT 1")).fetchone()
                if result and result[0] == 1:
                    self.results.append(HealthCheckResult(
                        test_name="Basic Connectivity",
                        status="PASS",
                        message="Database connection successful",
                        execution_time=time.time() - start_time
                    ))
                else:
                    self.results.append(HealthCheckResult(
                        test_name="Basic Connectivity",
                        status="FAIL",
                        message="Unexpected response from database",
                        execution_time=time.time() - start_time
                    ))
        except Exception as e:
            self.results.append(HealthCheckResult(
                test_name="Basic Connectivity",
                status="FAIL",
                message=f"Connection failed: {str(e)}",
                execution_time=time.time() - start_time
            ))
            
    def check_table_structure(self):
        """Verify all required tables exist with correct structure."""
        start_time = time.time()
        
        required_tables = [
            'users', 'appointments', 'payments', 'clients', 'services',
            'booking_settings', 'barbershop_locations'
        ]
        
        try:
            inspector = inspect(self.engine)
            existing_tables = inspector.get_table_names()
            
            missing_tables = [table for table in required_tables if table not in existing_tables]
            
            if not missing_tables:
                # Check critical columns
                table_issues = []
                
                # Check appointments table structure
                try:
                    appointments_columns = [col['name'] for col in inspector.get_columns('appointments')]
                    required_appointment_columns = [
                        'id', 'user_id', 'barber_id', 'start_time', 'status', 
                        'duration_minutes', 'service_name', 'price'
                    ]
                    
                    missing_columns = [col for col in required_appointment_columns if col not in appointments_columns]
                    if missing_columns:
                        table_issues.append(f"appointments table missing columns: {missing_columns}")
                        
                except Exception as e:
                    table_issues.append(f"Could not inspect appointments table: {e}")
                
                if table_issues:
                    self.results.append(HealthCheckResult(
                        test_name="Table Structure",
                        status="WARN",
                        message="Some table structure issues found",
                        details={"issues": table_issues},
                        execution_time=time.time() - start_time
                    ))
                else:
                    self.results.append(HealthCheckResult(
                        test_name="Table Structure",
                        status="PASS",
                        message="All required tables and columns present",
                        details={"tables_found": len(existing_tables)},
                        execution_time=time.time() - start_time
                    ))
            else:
                self.results.append(HealthCheckResult(
                    test_name="Table Structure",
                    status="FAIL",
                    message=f"Missing required tables: {missing_tables}",
                    details={"missing_tables": missing_tables},
                    execution_time=time.time() - start_time
                ))
                
        except Exception as e:
            self.results.append(HealthCheckResult(
                test_name="Table Structure",
                status="FAIL",
                message=f"Could not inspect table structure: {str(e)}",
                execution_time=time.time() - start_time
            ))
            
    def check_required_indexes(self):
        """Check for critical performance indexes."""
        start_time = time.time()
        
        if not self.is_postgresql:
            self.results.append(HealthCheckResult(
                test_name="Required Indexes",
                status="WARN",
                message="Index checking only available for PostgreSQL",
                execution_time=time.time() - start_time
            ))
            return
            
        critical_indexes = [
            'idx_appointments_start_time_status',
            'idx_appointments_barber_start_time_status',
            'idx_appointments_user_start_time_status',
            'idx_payments_appointment_status'
        ]
        
        try:
            with self.session_factory() as session:
                # Get all indexes
                result = session.execute(text("""
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE schemaname = 'public'
                """)).fetchall()
                
                existing_indexes = {row[0] for row in result}
                missing_indexes = [idx for idx in critical_indexes if idx not in existing_indexes]
                
                if not missing_indexes:
                    self.results.append(HealthCheckResult(
                        test_name="Required Indexes",
                        status="PASS",
                        message="All critical indexes present",
                        details={"indexes_found": len(existing_indexes)},
                        execution_time=time.time() - start_time
                    ))
                else:
                    self.results.append(HealthCheckResult(
                        test_name="Required Indexes",
                        status="FAIL",
                        message=f"Missing critical indexes: {missing_indexes}",
                        details={"missing_indexes": missing_indexes},
                        execution_time=time.time() - start_time
                    ))
                    
        except Exception as e:
            self.results.append(HealthCheckResult(
                test_name="Required Indexes",
                status="FAIL",
                message=f"Could not check indexes: {str(e)}",
                execution_time=time.time() - start_time
            ))
            
    def check_connection_pool(self):
        """Check connection pool configuration."""
        start_time = time.time()
        
        try:
            pool = self.engine.pool
            pool_info = {
                'pool_size': pool.size(),
                'checked_in': pool.checkedin(),
                'checked_out': pool.checkedout(),
                'overflow': pool.overflow(),
                'invalid': pool.invalid()
            }
            
            # Check pool configuration
            issues = []
            if pool.size() < 10:
                issues.append(f"Pool size ({pool.size()}) may be too small for production")
                
            if hasattr(pool, '_max_overflow') and pool._max_overflow < 20:
                issues.append(f"Max overflow ({pool._max_overflow}) may be too small for production")
                
            if issues:
                self.results.append(HealthCheckResult(
                    test_name="Connection Pool",
                    status="WARN",
                    message="Pool configuration may need adjustment",
                    details={"pool_info": pool_info, "issues": issues},
                    execution_time=time.time() - start_time
                ))
            else:
                self.results.append(HealthCheckResult(
                    test_name="Connection Pool",
                    status="PASS",
                    message="Connection pool properly configured",
                    details={"pool_info": pool_info},
                    execution_time=time.time() - start_time
                ))
                
        except Exception as e:
            self.results.append(HealthCheckResult(
                test_name="Connection Pool",
                status="FAIL",
                message=f"Could not check connection pool: {str(e)}",
                execution_time=time.time() - start_time
            ))
            
    def check_query_performance(self):
        """Test performance of critical queries."""
        start_time = time.time()
        
        test_queries = [
            {
                'name': 'Simple Select',
                'query': text("SELECT COUNT(*) FROM appointments"),
                'threshold': 0.1
            },
            {
                'name': 'Date Range Query',
                'query': text("""
                    SELECT COUNT(*) FROM appointments 
                    WHERE start_time >= :start_date 
                    AND start_time < :end_date
                """),
                'params': {
                    'start_date': datetime.now(),
                    'end_date': datetime.now() + timedelta(days=1)
                },
                'threshold': 0.5
            },
            {
                'name': 'User Appointments',
                'query': text("""
                    SELECT a.*, u.name 
                    FROM appointments a 
                    JOIN users u ON a.user_id = u.id 
                    WHERE a.user_id = 1 
                    ORDER BY a.start_time DESC 
                    LIMIT 10
                """),
                'threshold': 0.3
            }
        ]
        
        query_results = []
        slow_queries = []
        
        try:
            with self.session_factory() as session:
                for test in test_queries:
                    query_start = time.time()
                    
                    try:
                        if 'params' in test:
                            session.execute(test['query'], test['params']).fetchall()
                        else:
                            session.execute(test['query']).fetchall()
                            
                        query_time = time.time() - query_start
                        query_results.append({
                            'name': test['name'],
                            'time': query_time,
                            'threshold': test['threshold']
                        })
                        
                        if query_time > test['threshold']:
                            slow_queries.append(test['name'])
                            
                    except Exception as e:
                        query_results.append({
                            'name': test['name'],
                            'error': str(e),
                            'threshold': test['threshold']
                        })
                        
            if slow_queries:
                self.results.append(HealthCheckResult(
                    test_name="Query Performance",
                    status="WARN",
                    message=f"Some queries exceeded thresholds: {slow_queries}",
                    details={"query_results": query_results},
                    execution_time=time.time() - start_time
                ))
            else:
                self.results.append(HealthCheckResult(
                    test_name="Query Performance",
                    status="PASS",
                    message="All test queries within acceptable time",
                    details={"query_results": query_results},
                    execution_time=time.time() - start_time
                ))
                
        except Exception as e:
            self.results.append(HealthCheckResult(
                test_name="Query Performance",
                status="FAIL",
                message=f"Could not test query performance: {str(e)}",
                execution_time=time.time() - start_time
            ))
            
    def check_index_usage(self):
        """Check index usage statistics (PostgreSQL only)."""
        start_time = time.time()
        
        if not self.is_postgresql:
            self.results.append(HealthCheckResult(
                test_name="Index Usage",
                status="WARN",
                message="Index usage checking only available for PostgreSQL",
                execution_time=time.time() - start_time
            ))
            return
            
        try:
            with self.session_factory() as session:
                # Check for unused indexes
                unused_indexes_result = session.execute(text("""
                    SELECT schemaname, tablename, indexname, idx_scan
                    FROM pg_stat_user_indexes 
                    WHERE schemaname = 'public' 
                    AND idx_scan = 0
                    AND indexname NOT LIKE '%_pkey'
                """)).fetchall()
                
                unused_indexes = [row[2] for row in unused_indexes_result]
                
                # Check index efficiency
                inefficient_indexes_result = session.execute(text("""
                    SELECT schemaname, tablename, indexname, 
                           idx_scan, idx_tup_read, idx_tup_fetch,
                           CASE WHEN idx_tup_read > 0 
                                THEN round((idx_tup_fetch / idx_tup_read * 100.0), 2) 
                                ELSE 0 
                           END as efficiency
                    FROM pg_stat_user_indexes 
                    WHERE schemaname = 'public' 
                    AND idx_scan > 100
                    AND idx_tup_read > 0
                    HAVING (idx_tup_fetch / idx_tup_read * 100.0) < 50
                """)).fetchall()
                
                inefficient_indexes = [(row[2], row[7]) for row in inefficient_indexes_result]
                
                issues = []
                if unused_indexes:
                    issues.append(f"Unused indexes found: {len(unused_indexes)}")
                if inefficient_indexes:
                    issues.append(f"Inefficient indexes found: {len(inefficient_indexes)}")
                    
                if issues:
                    self.results.append(HealthCheckResult(
                        test_name="Index Usage",
                        status="WARN",
                        message="Index optimization opportunities found",
                        details={
                            "unused_indexes": unused_indexes,
                            "inefficient_indexes": inefficient_indexes,
                            "issues": issues
                        },
                        execution_time=time.time() - start_time
                    ))
                else:
                    self.results.append(HealthCheckResult(
                        test_name="Index Usage",
                        status="PASS",
                        message="Index usage appears optimal",
                        execution_time=time.time() - start_time
                    ))
                    
        except Exception as e:
            self.results.append(HealthCheckResult(
                test_name="Index Usage",
                status="FAIL",
                message=f"Could not check index usage: {str(e)}",
                execution_time=time.time() - start_time
            ))
            
    def check_production_config(self):
        """Check production configuration settings."""
        start_time = time.time()
        
        config_issues = []
        
        # Check environment variables
        required_env_vars = ['DATABASE_URL']
        missing_env_vars = [var for var in required_env_vars if not os.getenv(var)]
        
        if missing_env_vars:
            config_issues.append(f"Missing environment variables: {missing_env_vars}")
            
        # Check database URL format
        if self.database_url:
            if 'localhost' in self.database_url or '127.0.0.1' in self.database_url:
                config_issues.append("Database URL appears to be local (not production)")
                
            if not self.database_url.startswith(('postgresql://', 'postgres://')):
                config_issues.append("Non-PostgreSQL database detected (SQLite not recommended for production)")
                
        # Check SSL configuration for production
        if self.is_postgresql and 'sslmode=' not in self.database_url:
            config_issues.append("SSL mode not specified in database URL")
            
        if config_issues:
            self.results.append(HealthCheckResult(
                test_name="Production Config",
                status="WARN",
                message="Production configuration issues found",
                details={"issues": config_issues},
                execution_time=time.time() - start_time
            ))
        else:
            self.results.append(HealthCheckResult(
                test_name="Production Config",
                status="PASS",
                message="Production configuration appears correct",
                execution_time=time.time() - start_time
            ))
            
    def check_backup_configuration(self):
        """Check backup and recovery configuration."""
        start_time = time.time()
        
        backup_issues = []
        
        if not self.is_postgresql:
            backup_issues.append("Automated backup checking only available for PostgreSQL")
        else:
            try:
                with self.session_factory() as session:
                    # Check WAL archiving
                    wal_result = session.execute(text("SHOW archive_mode")).fetchone()
                    if wal_result and wal_result[0] != 'on':
                        backup_issues.append("WAL archiving not enabled")
                        
                    # Check if we can determine backup frequency (this would be environment-specific)
                    # For now, just check if basic backup infrastructure exists
                    
            except Exception as e:
                backup_issues.append(f"Could not check backup configuration: {str(e)}")
                
        if backup_issues:
            self.results.append(HealthCheckResult(
                test_name="Backup Configuration",
                status="WARN",
                message="Backup configuration needs attention",
                details={"issues": backup_issues},
                execution_time=time.time() - start_time
            ))
        else:
            self.results.append(HealthCheckResult(
                test_name="Backup Configuration",
                status="PASS",
                message="Backup configuration appears correct",
                execution_time=time.time() - start_time
            ))
            
    def check_security_settings(self):
        """Check database security settings."""
        start_time = time.time()
        
        security_issues = []
        
        if self.is_postgresql:
            try:
                with self.session_factory() as session:
                    # Check for default passwords or weak settings
                    # This is a basic check - in practice you'd want more comprehensive security auditing
                    
                    # Check if we're using a secure connection
                    ssl_result = session.execute(text("SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()")).fetchone()
                    if ssl_result and not ssl_result[0]:
                        security_issues.append("SSL not enabled for database connections")
                        
            except Exception as e:
                security_issues.append(f"Could not check security settings: {str(e)}")
        else:
            security_issues.append("Security checking limited for non-PostgreSQL databases")
            
        if security_issues:
            self.results.append(HealthCheckResult(
                test_name="Security Settings",
                status="WARN",
                message="Security configuration needs attention",
                details={"issues": security_issues},
                execution_time=time.time() - start_time
            ))
        else:
            self.results.append(HealthCheckResult(
                test_name="Security Settings",
                status="PASS",
                message="Security configuration appears correct",
                execution_time=time.time() - start_time
            ))
            
    def generate_summary(self):
        """Generate a summary of all health check results."""
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r.status == 'PASS'])
        warning_tests = len([r for r in self.results if r.status == 'WARN'])
        failed_tests = len([r for r in self.results if r.status == 'FAIL'])
        
        summary = {
            'total_tests': total_tests,
            'passed': passed_tests,
            'warnings': warning_tests,
            'failures': failed_tests,
            'success_rate': round((passed_tests / total_tests) * 100, 1) if total_tests > 0 else 0,
            'overall_status': 'HEALTHY' if failed_tests == 0 and warning_tests <= 2 else 'NEEDS_ATTENTION' if failed_tests == 0 else 'CRITICAL'
        }
        
        self.results.append(HealthCheckResult(
            test_name="Overall Health Summary",
            status=summary['overall_status'],
            message=f"Health check complete: {passed_tests} passed, {warning_tests} warnings, {failed_tests} failures",
            details=summary
        ))
        
    def run_performance_test(self, duration_seconds: int = 30) -> Dict[str, Any]:
        """Run a stress test to check performance under load."""
        logger.info(f"Starting {duration_seconds}-second performance test...")
        
        def execute_test_query():
            """Execute a test query and return execution time."""
            try:
                with self.session_factory() as session:
                    start_time = time.time()
                    session.execute(text("""
                        SELECT COUNT(*) FROM appointments a
                        JOIN users u ON a.user_id = u.id
                        WHERE a.start_time >= NOW() - INTERVAL '30 days'
                    """)).fetchone()
                    return time.time() - start_time
            except Exception as e:
                logger.error(f"Query error: {e}")
                return None
                
        # Run concurrent queries for the specified duration
        start_time = time.time()
        query_times = []
        errors = 0
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            
            while time.time() - start_time < duration_seconds:
                future = executor.submit(execute_test_query)
                futures.append(future)
                time.sleep(0.1)  # Submit a query every 100ms
                
            # Collect results
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result is not None:
                    query_times.append(result)
                else:
                    errors += 1
                    
        # Calculate statistics
        if query_times:
            avg_time = sum(query_times) / len(query_times)
            max_time = max(query_times)
            min_time = min(query_times)
            
            # Calculate percentiles
            sorted_times = sorted(query_times)
            p95_time = sorted_times[int(len(sorted_times) * 0.95)]
            p99_time = sorted_times[int(len(sorted_times) * 0.99)]
            
            return {
                'duration': duration_seconds,
                'total_queries': len(query_times),
                'errors': errors,
                'queries_per_second': len(query_times) / duration_seconds,
                'avg_response_time': avg_time,
                'min_response_time': min_time,
                'max_response_time': max_time,
                'p95_response_time': p95_time,
                'p99_response_time': p99_time,
                'error_rate': (errors / (len(query_times) + errors)) * 100 if (len(query_times) + errors) > 0 else 0
            }
        else:
            return {'error': 'No successful queries completed'}
            
    def print_results(self):
        """Print health check results in a formatted way."""
        print("\n" + "=" * 80)
        print("DATABASE HEALTH CHECK RESULTS")
        print("=" * 80)
        
        for result in self.results:
            status_icon = "✅" if result.status == "PASS" else "⚠️" if result.status == "WARN" else "❌"
            print(f"\n{status_icon} {result.test_name}: {result.status}")
            print(f"   {result.message}")
            
            if result.execution_time:
                print(f"   Execution time: {result.execution_time:.3f}s")
                
            if result.details:
                if result.test_name == "Overall Health Summary":
                    details = result.details
                    print(f"   Success rate: {details['success_rate']}%")
                    print(f"   Tests: {details['passed']} passed, {details['warnings']} warnings, {details['failures']} failures")
                    
        print("\n" + "=" * 80)


def main():
    """Main CLI interface for database health check."""
    parser = argparse.ArgumentParser(description='Database Health Check for BookedBarber V2')
    parser.add_argument('--database-url', type=str, help='Database URL to check')
    parser.add_argument('--check-indexes', action='store_true', help='Focus on index analysis')
    parser.add_argument('--performance-test', action='store_true', help='Run performance stress test')
    parser.add_argument('--test-duration', type=int, default=30, help='Performance test duration in seconds')
    parser.add_argument('--production-readiness', action='store_true', help='Focus on production readiness checks')
    parser.add_argument('--output-json', type=str, help='Save results to JSON file')
    
    args = parser.parse_args()
    
    try:
        checker = DatabaseHealthChecker(args.database_url)
        
        if args.performance_test:
            checker.setup_connection()
            results = checker.run_performance_test(args.test_duration)
            print("\nPerformance Test Results:")
            print(json.dumps(results, indent=2))
        else:
            results = checker.run_all_checks()
            checker.print_results()
            
            if args.output_json:
                output_data = {
                    'timestamp': datetime.now().isoformat(),
                    'database_url': str(checker.engine.url)[:50] + "...",
                    'results': [
                        {
                            'test_name': r.test_name,
                            'status': r.status,
                            'message': r.message,
                            'details': r.details,
                            'execution_time': r.execution_time
                        }
                        for r in results
                    ]
                }
                
                with open(args.output_json, 'w') as f:
                    json.dump(output_data, f, indent=2)
                    
                print(f"\nResults saved to {args.output_json}")
                
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return 1
        
    return 0


if __name__ == '__main__':
    sys.exit(main())