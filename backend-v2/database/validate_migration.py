#!/usr/bin/env python3
"""
Database Migration Validation Script for BookedBarber V2

This script validates the migration from SQLite to PostgreSQL by:
- Comparing row counts between databases
- Validating data integrity and consistency
- Testing application functionality with PostgreSQL
- Performance benchmarking
- Schema validation
"""

import os
import sys
import sqlite3
import psycopg2
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Any, Optional
from psycopg2.extras import RealDictCursor
import argparse
from collections import defaultdict


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'validation_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class MigrationValidator:
    """Validates SQLite to PostgreSQL migration"""
    
    def __init__(self, sqlite_path: str, pg_config: Dict[str, str]):
        self.sqlite_path = sqlite_path
        self.pg_config = pg_config
        self.sqlite_conn = None
        self.pg_conn = None
        self.validation_results = {
            'row_count_validation': {},
            'data_integrity_checks': {},
            'schema_validation': {},
            'performance_tests': {},
            'application_tests': {},
            'overall_status': 'pending',
            'errors': [],
            'warnings': []
        }
    
    def connect_databases(self) -> bool:
        """Connect to both databases"""
        try:
            # Connect to SQLite
            self.sqlite_conn = sqlite3.connect(self.sqlite_path)
            self.sqlite_conn.row_factory = sqlite3.Row
            logger.info(f"Connected to SQLite: {self.sqlite_path}")
            
            # Connect to PostgreSQL
            self.pg_conn = psycopg2.connect(**self.pg_config)
            logger.info(f"Connected to PostgreSQL: {self.pg_config['host']}:{self.pg_config['port']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to databases: {e}")
            return False
    
    def validate_row_counts(self) -> bool:
        """Validate that row counts match between databases"""
        logger.info("Validating row counts...")
        
        try:
            sqlite_cursor = self.sqlite_conn.cursor()
            pg_cursor = self.pg_conn.cursor()
            
            # Get all table names from SQLite
            sqlite_cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name != 'alembic_version'
                ORDER BY name
            """)
            
            tables = [row[0] for row in sqlite_cursor.fetchall()]
            validation_passed = True
            
            for table_name in tables:
                # Get SQLite count
                sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                sqlite_count = sqlite_cursor.fetchone()[0]
                
                # Get PostgreSQL count
                pg_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                pg_count = pg_cursor.fetchone()[0]
                
                # Compare counts
                matches = sqlite_count == pg_count
                self.validation_results['row_count_validation'][table_name] = {
                    'sqlite_count': sqlite_count,
                    'postgresql_count': pg_count,
                    'matches': matches,
                    'difference': pg_count - sqlite_count
                }
                
                if matches:
                    logger.info(f"✓ {table_name}: {sqlite_count} rows")
                else:
                    logger.error(f"✗ {table_name}: SQLite={sqlite_count}, PostgreSQL={pg_count}")
                    validation_passed = False
            
            if validation_passed:
                logger.info("✓ All table row counts match")
            else:
                logger.error("✗ Row count validation failed")
            
            return validation_passed
            
        except Exception as e:
            logger.error(f"Row count validation failed: {e}")
            self.validation_results['errors'].append(f"Row count validation: {str(e)}")
            return False
    
    def validate_data_integrity(self) -> bool:
        """Validate data integrity by comparing sample records"""
        logger.info("Validating data integrity...")
        
        try:
            sqlite_cursor = self.sqlite_conn.cursor()
            pg_cursor = self.pg_conn.cursor(cursor_factory=RealDictCursor)
            
            # Define critical tables to validate in detail
            critical_tables = ['users', 'appointments', 'payments', 'clients', 'services']
            validation_passed = True
            
            for table_name in critical_tables:
                # Check if table exists in both databases
                sqlite_cursor.execute(f"SELECT COUNT(*) FROM sqlite_master WHERE name='{table_name}'")
                if sqlite_cursor.fetchone()[0] == 0:
                    continue
                
                # Get table structure
                sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
                columns = [col[1] for col in sqlite_cursor.fetchall()]
                
                if not columns:
                    continue
                
                # Get sample records from both databases
                sample_size = min(100, self.get_table_count(table_name))
                if sample_size == 0:
                    continue
                
                primary_key = self.get_primary_key(table_name)
                order_by = f"ORDER BY {primary_key}" if primary_key else "ORDER BY 1"
                
                # SQLite sample
                sqlite_cursor.execute(f"SELECT * FROM {table_name} {order_by} LIMIT {sample_size}")
                sqlite_rows = sqlite_cursor.fetchall()
                
                # PostgreSQL sample
                pg_cursor.execute(f"SELECT * FROM {table_name} {order_by} LIMIT {sample_size}")
                pg_rows = pg_cursor.fetchall()
                
                # Compare samples
                table_validation = self.compare_table_data(table_name, sqlite_rows, pg_rows, columns)
                self.validation_results['data_integrity_checks'][table_name] = table_validation
                
                if not table_validation['data_matches']:
                    validation_passed = False
                    logger.error(f"✗ {table_name}: Data integrity check failed")
                else:
                    logger.info(f"✓ {table_name}: Data integrity validated")
            
            return validation_passed
            
        except Exception as e:
            logger.error(f"Data integrity validation failed: {e}")
            self.validation_results['errors'].append(f"Data integrity validation: {str(e)}")
            return False
    
    def compare_table_data(self, table_name: str, sqlite_rows: List, pg_rows: List, columns: List) -> Dict:
        """Compare data between SQLite and PostgreSQL for a specific table"""
        result = {
            'sqlite_sample_size': len(sqlite_rows),
            'postgresql_sample_size': len(pg_rows),
            'data_matches': True,
            'mismatched_rows': [],
            'column_type_issues': []
        }
        
        if len(sqlite_rows) != len(pg_rows):
            result['data_matches'] = False
            result['size_mismatch'] = True
            return result
        
        for i, (sqlite_row, pg_row) in enumerate(zip(sqlite_rows, pg_rows)):
            row_matches = True
            row_differences = {}
            
            for j, column in enumerate(columns):
                sqlite_val = sqlite_row[j] if j < len(sqlite_row) else None
                pg_val = pg_row[column] if column in pg_row else None
                
                # Handle type conversions and special cases
                if not self.values_match(sqlite_val, pg_val, column):
                    row_matches = False
                    row_differences[column] = {
                        'sqlite_value': sqlite_val,
                        'postgresql_value': pg_val,
                        'sqlite_type': type(sqlite_val).__name__,
                        'postgresql_type': type(pg_val).__name__
                    }
            
            if not row_matches:
                result['data_matches'] = False
                result['mismatched_rows'].append({
                    'row_index': i,
                    'differences': row_differences
                })
                
                # Limit the number of mismatched rows we track
                if len(result['mismatched_rows']) >= 10:
                    break
        
        return result
    
    def values_match(self, sqlite_val: Any, pg_val: Any, column: str) -> bool:
        """Check if values match, handling type conversions"""
        # Handle None values
        if sqlite_val is None and pg_val is None:
            return True
        if sqlite_val is None or pg_val is None:
            return False
        
        # Handle boolean conversions
        if isinstance(sqlite_val, int) and isinstance(pg_val, bool):
            return bool(sqlite_val) == pg_val
        if isinstance(sqlite_val, bool) and isinstance(pg_val, bool):
            return sqlite_val == pg_val
        
        # Handle JSON columns
        if isinstance(sqlite_val, str) and isinstance(pg_val, (dict, list)):
            try:
                sqlite_json = json.loads(sqlite_val) if sqlite_val else None
                return sqlite_json == pg_val
            except json.JSONDecodeError:
                pass
        
        # Handle datetime strings
        if isinstance(sqlite_val, str) and hasattr(pg_val, 'isoformat'):
            try:
                sqlite_dt = datetime.fromisoformat(sqlite_val.replace('Z', '+00:00'))
                return sqlite_dt == pg_val.replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        
        # Handle numeric comparisons with tolerance
        if isinstance(sqlite_val, (int, float)) and isinstance(pg_val, (int, float)):
            return abs(float(sqlite_val) - float(pg_val)) < 0.001
        
        # Default string comparison
        return str(sqlite_val) == str(pg_val)
    
    def get_table_count(self, table_name: str) -> int:
        """Get row count for a table"""
        try:
            cursor = self.sqlite_conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            return cursor.fetchone()[0]
        except:
            return 0
    
    def get_primary_key(self, table_name: str) -> Optional[str]:
        """Get primary key column for a table"""
        try:
            cursor = self.sqlite_conn.cursor()
            cursor.execute(f"PRAGMA table_info({table_name})")
            for col in cursor.fetchall():
                if col[5]:  # pk column
                    return col[1]  # column name
            return None
        except:
            return None
    
    def validate_schema(self) -> bool:
        """Validate that PostgreSQL schema matches expectations"""
        logger.info("Validating schema...")
        
        try:
            pg_cursor = self.pg_conn.cursor(cursor_factory=RealDictCursor)
            
            # Check that all expected tables exist
            pg_cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            pg_tables = [row['table_name'] for row in pg_cursor.fetchall()]
            
            # Get SQLite tables
            sqlite_cursor = self.sqlite_conn.cursor()
            sqlite_cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name != 'alembic_version'
                ORDER BY name
            """)
            sqlite_tables = [row[0] for row in sqlite_cursor.fetchall()]
            
            missing_tables = set(sqlite_tables) - set(pg_tables)
            extra_tables = set(pg_tables) - set(sqlite_tables)
            
            schema_valid = len(missing_tables) == 0
            
            self.validation_results['schema_validation'] = {
                'sqlite_tables': sqlite_tables,
                'postgresql_tables': pg_tables,
                'missing_tables': list(missing_tables),
                'extra_tables': list(extra_tables),
                'schema_valid': schema_valid
            }
            
            if missing_tables:
                logger.error(f"✗ Missing tables in PostgreSQL: {missing_tables}")
            if extra_tables:
                logger.warning(f"⚠ Extra tables in PostgreSQL: {extra_tables}")
            
            if schema_valid:
                logger.info("✓ Schema validation passed")
            else:
                logger.error("✗ Schema validation failed")
            
            return schema_valid
            
        except Exception as e:
            logger.error(f"Schema validation failed: {e}")
            self.validation_results['errors'].append(f"Schema validation: {str(e)}")
            return False
    
    def test_performance(self) -> bool:
        """Test basic performance of PostgreSQL vs SQLite"""
        logger.info("Running performance tests...")
        
        try:
            performance_results = {}
            
            # Test common queries
            test_queries = [
                ("user_count", "SELECT COUNT(*) FROM users"),
                ("recent_appointments", "SELECT COUNT(*) FROM appointments WHERE created_at > NOW() - INTERVAL '30 days'"),
                ("active_services", "SELECT COUNT(*) FROM services WHERE is_active = true"),
            ]
            
            for test_name, query in test_queries:
                # SQLite timing
                start_time = time.time()
                try:
                    cursor = self.sqlite_conn.cursor()
                    cursor.execute(query.replace("NOW() - INTERVAL '30 days'", "datetime('now', '-30 days')"))
                    sqlite_result = cursor.fetchone()[0]
                    sqlite_time = time.time() - start_time
                except Exception as e:
                    sqlite_time = -1
                    sqlite_result = None
                    logger.warning(f"SQLite query failed for {test_name}: {e}")
                
                # PostgreSQL timing
                start_time = time.time()
                try:
                    cursor = self.pg_conn.cursor()
                    cursor.execute(query)
                    pg_result = cursor.fetchone()[0]
                    pg_time = time.time() - start_time
                except Exception as e:
                    pg_time = -1
                    pg_result = None
                    logger.warning(f"PostgreSQL query failed for {test_name}: {e}")
                
                performance_results[test_name] = {
                    'sqlite_time': sqlite_time,
                    'postgresql_time': pg_time,
                    'sqlite_result': sqlite_result,
                    'postgresql_result': pg_result,
                    'results_match': sqlite_result == pg_result,
                    'performance_ratio': pg_time / sqlite_time if sqlite_time > 0 and pg_time > 0 else None
                }
                
                if sqlite_time > 0 and pg_time > 0:
                    ratio = pg_time / sqlite_time
                    logger.info(f"✓ {test_name}: SQLite={sqlite_time:.3f}s, PostgreSQL={pg_time:.3f}s (ratio: {ratio:.2f})")
                else:
                    logger.warning(f"⚠ {test_name}: Performance test incomplete")
            
            self.validation_results['performance_tests'] = performance_results
            return True
            
        except Exception as e:
            logger.error(f"Performance testing failed: {e}")
            self.validation_results['errors'].append(f"Performance testing: {str(e)}")
            return False
    
    def test_application_functionality(self) -> bool:
        """Test basic application functionality with PostgreSQL"""
        logger.info("Testing application functionality...")
        
        try:
            pg_cursor = self.pg_conn.cursor()
            
            # Test basic CRUD operations
            test_results = {}
            
            # Test 1: Insert a test record
            try:
                pg_cursor.execute("""
                    INSERT INTO users (email, name, role, is_active, created_at) 
                    VALUES ('test@validation.com', 'Test User', 'client', true, NOW())
                    RETURNING id
                """)
                test_user_id = pg_cursor.fetchone()[0]
                self.pg_conn.commit()
                test_results['insert_test'] = {'success': True, 'user_id': test_user_id}
                logger.info("✓ Insert operation successful")
            except Exception as e:
                test_results['insert_test'] = {'success': False, 'error': str(e)}
                logger.error(f"✗ Insert operation failed: {e}")
                self.pg_conn.rollback()
            
            # Test 2: Query the record
            try:
                pg_cursor.execute("SELECT * FROM users WHERE email = 'test@validation.com'")
                user_record = pg_cursor.fetchone()
                test_results['select_test'] = {'success': user_record is not None}
                if user_record:
                    logger.info("✓ Select operation successful")
                else:
                    logger.error("✗ Select operation failed - record not found")
            except Exception as e:
                test_results['select_test'] = {'success': False, 'error': str(e)}
                logger.error(f"✗ Select operation failed: {e}")
            
            # Test 3: Update the record
            try:
                pg_cursor.execute("""
                    UPDATE users 
                    SET name = 'Updated Test User' 
                    WHERE email = 'test@validation.com'
                """)
                self.pg_conn.commit()
                test_results['update_test'] = {'success': True}
                logger.info("✓ Update operation successful")
            except Exception as e:
                test_results['update_test'] = {'success': False, 'error': str(e)}
                logger.error(f"✗ Update operation failed: {e}")
                self.pg_conn.rollback()
            
            # Test 4: Delete the record
            try:
                pg_cursor.execute("DELETE FROM users WHERE email = 'test@validation.com'")
                self.pg_conn.commit()
                test_results['delete_test'] = {'success': True}
                logger.info("✓ Delete operation successful")
            except Exception as e:
                test_results['delete_test'] = {'success': False, 'error': str(e)}
                logger.error(f"✗ Delete operation failed: {e}")
                self.pg_conn.rollback()
            
            # Test 5: Check foreign key constraints
            try:
                # Try to insert an appointment with invalid user_id
                pg_cursor.execute("""
                    INSERT INTO appointments (user_id, service_id, start_time, end_time, status) 
                    VALUES (99999, 1, NOW(), NOW() + INTERVAL '1 hour', 'pending')
                """)
                self.pg_conn.commit()
                test_results['foreign_key_test'] = {'success': False, 'error': 'Foreign key constraint not enforced'}
                logger.error("✗ Foreign key constraint test failed")
            except Exception:
                test_results['foreign_key_test'] = {'success': True}
                logger.info("✓ Foreign key constraints working")
                self.pg_conn.rollback()
            
            self.validation_results['application_tests'] = test_results
            
            # Determine overall success
            all_tests_passed = all(test.get('success', False) for test in test_results.values())
            return all_tests_passed
            
        except Exception as e:
            logger.error(f"Application functionality testing failed: {e}")
            self.validation_results['errors'].append(f"Application testing: {str(e)}")
            return False
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive validation report"""
        logger.info("Generating validation report...")
        
        # Calculate overall status
        all_validations = [
            all(v.get('matches', False) for v in self.validation_results['row_count_validation'].values()),
            all(v.get('data_matches', False) for v in self.validation_results['data_integrity_checks'].values()),
            self.validation_results['schema_validation'].get('schema_valid', False),
            len(self.validation_results['errors']) == 0
        ]
        
        self.validation_results['overall_status'] = 'PASSED' if all(all_validations) else 'FAILED'
        
        # Add summary statistics
        self.validation_results['summary'] = {
            'total_tables_validated': len(self.validation_results['row_count_validation']),
            'tables_with_row_count_issues': len([v for v in self.validation_results['row_count_validation'].values() if not v.get('matches', False)]),
            'tables_with_data_issues': len([v for v in self.validation_results['data_integrity_checks'].values() if not v.get('data_matches', False)]),
            'total_errors': len(self.validation_results['errors']),
            'total_warnings': len(self.validation_results['warnings']),
            'validation_timestamp': datetime.now().isoformat()
        }
        
        return self.validation_results
    
    def run_validation(self) -> bool:
        """Run complete validation process"""
        logger.info("Starting migration validation...")
        
        try:
            # Connect to databases
            if not self.connect_databases():
                return False
            
            # Run all validation steps
            steps = [
                ("Row Count Validation", self.validate_row_counts),
                ("Data Integrity Validation", self.validate_data_integrity),
                ("Schema Validation", self.validate_schema),
                ("Performance Testing", self.test_performance),
                ("Application Functionality Testing", self.test_application_functionality)
            ]
            
            overall_success = True
            
            for step_name, step_function in steps:
                logger.info(f"Running {step_name}...")
                try:
                    success = step_function()
                    if not success:
                        overall_success = False
                        logger.error(f"{step_name} failed")
                    else:
                        logger.info(f"{step_name} completed successfully")
                except Exception as e:
                    logger.error(f"{step_name} encountered an error: {e}")
                    self.validation_results['errors'].append(f"{step_name}: {str(e)}")
                    overall_success = False
            
            # Generate final report
            report = self.generate_report()
            
            if overall_success and report['overall_status'] == 'PASSED':
                logger.info("🎉 Migration validation PASSED! ✓")
                logger.info("PostgreSQL database is ready for production use.")
            else:
                logger.error("❌ Migration validation FAILED! ✗")
                logger.error("Review the errors and re-run migration if necessary.")
            
            return overall_success
            
        except Exception as e:
            logger.error(f"Validation process failed: {e}")
            return False
        
        finally:
            if self.sqlite_conn:
                self.sqlite_conn.close()
            if self.pg_conn:
                self.pg_conn.close()


def main():
    """Main validation script"""
    parser = argparse.ArgumentParser(description='Validate BookedBarber V2 PostgreSQL migration')
    parser.add_argument('--sqlite-path', default='6fb_booking.db', help='Path to SQLite database')
    parser.add_argument('--pg-host', default='localhost', help='PostgreSQL host')
    parser.add_argument('--pg-port', default='5432', help='PostgreSQL port')
    parser.add_argument('--pg-database', default='bookedbarber_v2', help='PostgreSQL database name')
    parser.add_argument('--pg-user', default='bookedbarber_app', help='PostgreSQL user')
    parser.add_argument('--pg-password', required=True, help='PostgreSQL password')
    parser.add_argument('--report-file', help='Save detailed report to JSON file')
    
    args = parser.parse_args()
    
    # PostgreSQL configuration
    pg_config = {
        'host': args.pg_host,
        'port': args.pg_port,
        'dbname': args.pg_database,
        'user': args.pg_user,
        'password': args.pg_password
    }
    
    # Check if SQLite database exists
    if not os.path.exists(args.sqlite_path):
        logger.error(f"SQLite database not found: {args.sqlite_path}")
        sys.exit(1)
    
    # Run validation
    validator = MigrationValidator(args.sqlite_path, pg_config)
    success = validator.run_validation()
    
    # Save report if requested
    if args.report_file:
        report = validator.generate_report()
        with open(args.report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        logger.info(f"Detailed report saved to: {args.report_file}")
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()