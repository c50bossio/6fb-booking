#!/usr/bin/env python3
"""
PostgreSQL Setup Testing Script for BookedBarber V2

This script tests the PostgreSQL setup and configuration to ensure
everything is working correctly before running the actual migration.
"""

import os
import sys
import time
import logging
import psycopg2
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from psycopg2.extras import RealDictCursor
import argparse


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PostgreSQLTester:
    """Tests PostgreSQL setup and configuration"""
    
    def __init__(self, pg_config: Dict[str, str]):
        self.pg_config = pg_config
        self.pg_conn = None
        self.test_results = {
            'connection_test': {},
            'database_setup_test': {},
            'permissions_test': {},
            'performance_test': {},
            'extension_test': {},
            'configuration_test': {},
            'overall_status': 'pending',
            'errors': [],
            'warnings': []
        }
    
    def connect_database(self) -> bool:
        """Connect to PostgreSQL database"""
        try:
            self.pg_conn = psycopg2.connect(**self.pg_config)
            logger.info(f"Connected to PostgreSQL: {self.pg_config['host']}:{self.pg_config['port']}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            self.test_results['errors'].append(f"Connection failed: {str(e)}")
            return False
    
    def test_connection(self) -> bool:
        """Test basic database connection and information"""
        logger.info("Testing database connection...")
        
        try:
            with self.pg_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get PostgreSQL version
                cursor.execute("SELECT version()")
                version = cursor.fetchone()['version']
                
                # Get database information
                cursor.execute("""
                    SELECT 
                        current_database() as database_name,
                        current_user as connected_user,
                        current_setting('server_version') as server_version,
                        current_setting('server_encoding') as encoding,
                        current_setting('timezone') as timezone
                """)
                db_info = cursor.fetchone()
                
                # Test basic query
                cursor.execute("SELECT 1 as test_value")
                test_result = cursor.fetchone()
                
                self.test_results['connection_test'] = {
                    'success': True,
                    'version': version,
                    'database_info': dict(db_info),
                    'test_query_result': test_result['test_value']
                }
                
                logger.info(f"✓ Connection successful - PostgreSQL {db_info['server_version']}")
                logger.info(f"✓ Connected to database: {db_info['database_name']}")
                logger.info(f"✓ Connected as user: {db_info['connected_user']}")
                
                return True
                
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            self.test_results['connection_test'] = {'success': False, 'error': str(e)}
            self.test_results['errors'].append(f"Connection test: {str(e)}")
            return False
    
    def test_database_setup(self) -> bool:
        """Test that required databases exist"""
        logger.info("Testing database setup...")
        
        try:
            with self.pg_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Check for required databases
                cursor.execute("""
                    SELECT datname 
                    FROM pg_database 
                    WHERE datname IN ('bookedbarber_v2', 'bookedbarber_v2_staging', 'bookedbarber_v2_test')
                    ORDER BY datname
                """)
                existing_databases = [row['datname'] for row in cursor.fetchall()]
                
                required_databases = ['bookedbarber_v2', 'bookedbarber_v2_staging', 'bookedbarber_v2_test']
                missing_databases = set(required_databases) - set(existing_databases)
                
                self.test_results['database_setup_test'] = {
                    'success': len(missing_databases) == 0,
                    'existing_databases': existing_databases,
                    'missing_databases': list(missing_databases)
                }
                
                if missing_databases:
                    logger.error(f"✗ Missing databases: {missing_databases}")
                    return False
                else:
                    logger.info(f"✓ All required databases exist: {existing_databases}")
                    return True
                
        except Exception as e:
            logger.error(f"Database setup test failed: {e}")
            self.test_results['database_setup_test'] = {'success': False, 'error': str(e)}
            self.test_results['errors'].append(f"Database setup test: {str(e)}")
            return False
    
    def test_user_permissions(self) -> bool:
        """Test user permissions and access"""
        logger.info("Testing user permissions...")
        
        try:
            with self.pg_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Test table creation
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS test_permissions (
                        id SERIAL PRIMARY KEY,
                        test_data VARCHAR(50),
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Test insert
                cursor.execute("""
                    INSERT INTO test_permissions (test_data) 
                    VALUES ('permission_test') 
                    RETURNING id
                """)
                test_id = cursor.fetchone()['id']
                
                # Test select
                cursor.execute("SELECT * FROM test_permissions WHERE id = %s", (test_id,))
                test_record = cursor.fetchone()
                
                # Test update
                cursor.execute("""
                    UPDATE test_permissions 
                    SET test_data = 'permission_test_updated' 
                    WHERE id = %s
                """, (test_id,))
                
                # Test delete
                cursor.execute("DELETE FROM test_permissions WHERE id = %s", (test_id,))
                
                # Clean up
                cursor.execute("DROP TABLE test_permissions")
                
                self.pg_conn.commit()
                
                self.test_results['permissions_test'] = {
                    'success': True,
                    'create_table': True,
                    'insert_data': True,
                    'select_data': True,
                    'update_data': True,
                    'delete_data': True,
                    'drop_table': True
                }
                
                logger.info("✓ All CRUD operations successful")
                return True
                
        except Exception as e:
            logger.error(f"Permissions test failed: {e}")
            self.test_results['permissions_test'] = {'success': False, 'error': str(e)}
            self.test_results['errors'].append(f"Permissions test: {str(e)}")
            self.pg_conn.rollback()
            return False
    
    def test_extensions(self) -> bool:
        """Test required PostgreSQL extensions"""
        logger.info("Testing PostgreSQL extensions...")
        
        try:
            with self.pg_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Check for required extensions
                cursor.execute("""
                    SELECT extname, extversion 
                    FROM pg_extension 
                    WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_stat_statements', 'pg_trgm')
                    ORDER BY extname
                """)
                installed_extensions = {row['extname']: row['extversion'] for row in cursor.fetchall()}
                
                required_extensions = ['uuid-ossp', 'pgcrypto']
                optional_extensions = ['pg_stat_statements', 'pg_trgm']
                
                missing_required = set(required_extensions) - set(installed_extensions.keys())
                missing_optional = set(optional_extensions) - set(installed_extensions.keys())
                
                # Test UUID generation
                uuid_test = False
                if 'uuid-ossp' in installed_extensions:
                    cursor.execute("SELECT uuid_generate_v4()")
                    uuid_result = cursor.fetchone()
                    uuid_test = uuid_result is not None
                
                # Test pgcrypto
                crypto_test = False
                if 'pgcrypto' in installed_extensions:
                    cursor.execute("SELECT crypt('test', gen_salt('bf'))")
                    crypto_result = cursor.fetchone()
                    crypto_test = crypto_result is not None
                
                self.test_results['extension_test'] = {
                    'success': len(missing_required) == 0,
                    'installed_extensions': installed_extensions,
                    'missing_required': list(missing_required),
                    'missing_optional': list(missing_optional),
                    'uuid_test': uuid_test,
                    'crypto_test': crypto_test
                }
                
                if missing_required:
                    logger.error(f"✗ Missing required extensions: {missing_required}")
                    return False
                else:
                    logger.info(f"✓ All required extensions installed: {list(installed_extensions.keys())}")
                    if missing_optional:
                        logger.warning(f"⚠ Missing optional extensions: {missing_optional}")
                    return True
                
        except Exception as e:
            logger.error(f"Extension test failed: {e}")
            self.test_results['extension_test'] = {'success': False, 'error': str(e)}
            self.test_results['errors'].append(f"Extension test: {str(e)}")
            return False
    
    def test_performance(self) -> bool:
        """Test basic database performance"""
        logger.info("Testing database performance...")
        
        try:
            with self.pg_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Create test table with sample data
                cursor.execute("""
                    CREATE TEMPORARY TABLE performance_test (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100),
                        email VARCHAR(100),
                        created_at TIMESTAMP DEFAULT NOW(),
                        random_data TEXT
                    )
                """)
                
                # Insert test data and measure time
                start_time = time.time()
                test_data = [(f'User {i}', f'user{i}@test.com', f'Random data {i}' * 10) 
                           for i in range(1000)]
                
                cursor.executemany("""
                    INSERT INTO performance_test (name, email, random_data) 
                    VALUES (%s, %s, %s)
                """, test_data)
                
                insert_time = time.time() - start_time
                
                # Test select performance
                start_time = time.time()
                cursor.execute("SELECT COUNT(*) FROM performance_test")
                count_result = cursor.fetchone()['count']
                select_time = time.time() - start_time
                
                # Test index creation
                start_time = time.time()
                cursor.execute("CREATE INDEX idx_perf_test_email ON performance_test(email)")
                index_time = time.time() - start_time
                
                # Test indexed query
                start_time = time.time()
                cursor.execute("SELECT * FROM performance_test WHERE email = 'user500@test.com'")
                indexed_result = cursor.fetchone()
                indexed_query_time = time.time() - start_time
                
                self.test_results['performance_test'] = {
                    'success': True,
                    'insert_1000_records_time': insert_time,
                    'count_query_time': select_time,
                    'index_creation_time': index_time,
                    'indexed_query_time': indexed_query_time,
                    'records_inserted': count_result,
                    'indexed_record_found': indexed_result is not None
                }
                
                logger.info(f"✓ Performance test completed:")
                logger.info(f"  - Insert 1000 records: {insert_time:.3f}s")
                logger.info(f"  - Count query: {select_time:.3f}s")
                logger.info(f"  - Index creation: {index_time:.3f}s")
                logger.info(f"  - Indexed query: {indexed_query_time:.3f}s")
                
                return True
                
        except Exception as e:
            logger.error(f"Performance test failed: {e}")
            self.test_results['performance_test'] = {'success': False, 'error': str(e)}
            self.test_results['errors'].append(f"Performance test: {str(e)}")
            return False
    
    def test_configuration(self) -> bool:
        """Test PostgreSQL configuration settings"""
        logger.info("Testing PostgreSQL configuration...")
        
        try:
            with self.pg_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Check important configuration settings
                config_checks = [
                    'max_connections',
                    'shared_buffers',
                    'effective_cache_size',
                    'work_mem',
                    'maintenance_work_mem',
                    'checkpoint_completion_target',
                    'wal_buffers',
                    'default_statistics_target',
                    'random_page_cost',
                    'log_statement',
                    'log_min_duration_statement'
                ]
                
                configuration = {}
                for setting in config_checks:
                    try:
                        cursor.execute("SELECT current_setting(%s)", (setting,))
                        value = cursor.fetchone()[0]
                        configuration[setting] = value
                    except Exception:
                        configuration[setting] = 'not_available'
                
                # Check if logging is properly configured
                log_statement = configuration.get('log_statement', 'none')
                log_duration = configuration.get('log_min_duration_statement', '-1')
                
                self.test_results['configuration_test'] = {
                    'success': True,
                    'configuration': configuration,
                    'recommendations': []
                }
                
                # Add recommendations
                recommendations = []
                if int(configuration.get('max_connections', '0')) < 100:
                    recommendations.append("Consider increasing max_connections for production")
                
                if log_statement == 'all':
                    recommendations.append("log_statement=all may impact performance in production")
                
                if int(log_duration) == 0:
                    recommendations.append("Logging all statements may impact performance")
                
                self.test_results['configuration_test']['recommendations'] = recommendations
                
                logger.info("✓ Configuration check completed")
                for rec in recommendations:
                    logger.warning(f"⚠ {rec}")
                
                return True
                
        except Exception as e:
            logger.error(f"Configuration test failed: {e}")
            self.test_results['configuration_test'] = {'success': False, 'error': str(e)}
            self.test_results['errors'].append(f"Configuration test: {str(e)}")
            return False
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        logger.info("Generating test report...")
        
        # Calculate overall status
        all_tests = [
            self.test_results['connection_test'].get('success', False),
            self.test_results['database_setup_test'].get('success', False),
            self.test_results['permissions_test'].get('success', False),
            self.test_results['extension_test'].get('success', False),
            self.test_results['performance_test'].get('success', False),
            self.test_results['configuration_test'].get('success', False)
        ]
        
        self.test_results['overall_status'] = 'PASSED' if all(all_tests) else 'FAILED'
        
        # Add summary
        self.test_results['summary'] = {
            'total_tests': len(all_tests),
            'tests_passed': sum(all_tests),
            'tests_failed': len(all_tests) - sum(all_tests),
            'total_errors': len(self.test_results['errors']),
            'total_warnings': len(self.test_results['warnings']),
            'test_timestamp': datetime.now().isoformat()
        }
        
        return self.test_results
    
    def run_tests(self) -> bool:
        """Run all PostgreSQL setup tests"""
        logger.info("Starting PostgreSQL setup tests...")
        
        try:
            # Connect to database
            if not self.connect_database():
                return False
            
            # Run all tests
            test_steps = [
                ("Connection Test", self.test_connection),
                ("Database Setup Test", self.test_database_setup),
                ("User Permissions Test", self.test_user_permissions),
                ("Extensions Test", self.test_extensions),
                ("Performance Test", self.test_performance),
                ("Configuration Test", self.test_configuration)
            ]
            
            overall_success = True
            
            for test_name, test_function in test_steps:
                logger.info(f"Running {test_name}...")
                try:
                    success = test_function()
                    if not success:
                        overall_success = False
                        logger.error(f"{test_name} failed")
                    else:
                        logger.info(f"{test_name} completed successfully")
                except Exception as e:
                    logger.error(f"{test_name} encountered an error: {e}")
                    self.test_results['errors'].append(f"{test_name}: {str(e)}")
                    overall_success = False
            
            # Generate final report
            report = self.generate_report()
            
            if overall_success and report['overall_status'] == 'PASSED':
                logger.info("🎉 PostgreSQL setup tests PASSED! ✓")
                logger.info("Database is ready for migration.")
            else:
                logger.error("❌ PostgreSQL setup tests FAILED! ✗")
                logger.error("Fix the issues before proceeding with migration.")
            
            return overall_success
            
        except Exception as e:
            logger.error(f"Test process failed: {e}")
            return False
        
        finally:
            if self.pg_conn:
                self.pg_conn.close()


def main():
    """Main test script"""
    parser = argparse.ArgumentParser(description='Test BookedBarber V2 PostgreSQL setup')
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
    
    # Run tests
    tester = PostgreSQLTester(pg_config)
    success = tester.run_tests()
    
    # Save report if requested
    if args.report_file:
        report = tester.generate_report()
        with open(args.report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        logger.info(f"Detailed report saved to: {args.report_file}")
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()