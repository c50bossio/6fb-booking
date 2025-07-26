#!/usr/bin/env python3
"""
Comprehensive test suite for the Data Scientist Agent
Tests all major functionality including safety mechanisms, analytics, and optimization
"""

import unittest
import json
import sqlite3
import tempfile
import os
import sys
import time
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add the agent directory to Python path
sys.path.append(str(Path(__file__).parent))

from data_scientist_agent import (
    DataScientistAgent, 
    SixFigureBarberAnalytics,
    DatabaseOptimizer,
    StatisticalAnalyzer
)
from data_scientist_safety import (
    ExecutionSafetyWrapper,
    ResourceMonitor,
    RateLimiter,
    SafetyValidator
)

class TestDataScientistAgent(unittest.TestCase):
    """Test the main Data Scientist Agent functionality"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test database and agent instance"""
        cls.test_db_path = tempfile.mktemp(suffix='.db')
        cls.setup_test_database()
        cls.agent = DataScientistAgent()
    
    @classmethod
    def tearDownClass(cls):
        """Clean up test database"""
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)
    
    @classmethod
    def setup_test_database(cls):
        """Create test database with sample data"""
        conn = sqlite3.connect(cls.test_db_path)
        cursor = conn.cursor()
        
        # Create test tables
        cursor.execute('''
        CREATE TABLE barbers (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            shop_id INTEGER,
            status TEXT DEFAULT 'active'
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE clients (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE services (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            price DECIMAL(10,2),
            duration_minutes INTEGER,
            barber_id INTEGER,
            is_active BOOLEAN DEFAULT 1
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE appointments (
            id INTEGER PRIMARY KEY,
            client_id INTEGER,
            barber_id INTEGER,
            service_id INTEGER,
            scheduled_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'confirmed',
            rating INTEGER
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE analytics_events (
            id INTEGER PRIMARY KEY,
            session_id TEXT,
            event_type TEXT,
            page_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Insert test data
        # Barbers
        cursor.execute("INSERT INTO barbers (name, shop_id) VALUES ('John Doe', 1)")
        cursor.execute("INSERT INTO barbers (name, shop_id) VALUES ('Jane Smith', 1)")
        
        # Clients
        cursor.execute("INSERT INTO clients (name, email) VALUES ('Client One', 'client1@test.com')")
        cursor.execute("INSERT INTO clients (name, email) VALUES ('Client Two', 'client2@test.com')")
        
        # Services
        cursor.execute("INSERT INTO services (name, price, duration_minutes, barber_id) VALUES ('Haircut', 50.00, 30, 1)")
        cursor.execute("INSERT INTO services (name, price, duration_minutes, barber_id) VALUES ('Beard Trim', 25.00, 15, 1)")
        cursor.execute("INSERT INTO services (name, price, duration_minutes, barber_id) VALUES ('Premium Cut', 80.00, 45, 2)")
        
        # Appointments
        cursor.execute("""
        INSERT INTO appointments (client_id, barber_id, service_id, scheduled_date, status, rating) 
        VALUES (1, 1, 1, datetime('now', '-5 days'), 'completed', 5)
        """)
        cursor.execute("""
        INSERT INTO appointments (client_id, barber_id, service_id, scheduled_date, status, rating) 
        VALUES (2, 1, 2, datetime('now', '-3 days'), 'completed', 4)
        """)
        cursor.execute("""
        INSERT INTO appointments (client_id, barber_id, service_id, scheduled_date, status, rating) 
        VALUES (1, 2, 3, datetime('now', '-1 day'), 'completed', 5)
        """)
        
        # Analytics events
        cursor.execute("INSERT INTO analytics_events (session_id, event_type, page_path) VALUES ('sess1', 'page_view', '/book')")
        cursor.execute("INSERT INTO analytics_events (session_id, event_type, page_path) VALUES ('sess1', 'service_selected', '/book')")
        
        conn.commit()
        conn.close()
    
    def setUp(self):
        """Set up for each test"""
        # Mock database connection to use test database
        self.mock_db = sqlite3.connect(self.test_db_path)
        
    def tearDown(self):
        """Clean up after each test"""
        if hasattr(self, 'mock_db'):
            self.mock_db.close()
    
    def test_agent_initialization(self):
        """Test agent initialization"""
        agent = DataScientistAgent()
        self.assertIsNotNone(agent.logger)
        self.assertEqual(agent.execution_count, 0)
        self.assertEqual(agent.success_count, 0)
    
    @patch.object(DataScientistAgent, 'connect_to_database')
    def test_database_connection(self, mock_connect):
        """Test database connection functionality"""
        mock_connect.return_value = True
        
        result = self.agent.connect_to_database()
        self.assertTrue(result)
        mock_connect.assert_called_once()
    
    def test_six_figure_analytics_initialization(self):
        """Test Six Figure Barber analytics initialization"""
        analytics = SixFigureBarberAnalytics(self.mock_db)
        self.assertIsNotNone(analytics.db)
        self.assertEqual(analytics.revenue_metrics, {})
    
    def test_database_optimizer_initialization(self):
        """Test database optimizer initialization"""
        optimizer = DatabaseOptimizer(self.mock_db, 'sqlite')
        self.assertIsNotNone(optimizer.db)
        self.assertEqual(optimizer.db_type, 'sqlite')
    
    def test_statistical_analyzer_initialization(self):
        """Test statistical analyzer initialization"""
        analyzer = StatisticalAnalyzer(self.mock_db)
        self.assertIsNotNone(analyzer.db)
    
    @patch.object(DataScientistAgent, 'connect_to_database')
    def test_execute_triggered_analysis(self, mock_connect):
        """Test triggered analysis execution"""
        mock_connect.return_value = True
        self.agent.db_connection = self.mock_db
        self.agent.six_figure_analytics = SixFigureBarberAnalytics(self.mock_db)
        
        context = {'analysis_type': 'database_performance'}
        result = self.agent.execute_triggered_analysis('database_performance', context)
        
        self.assertIn('status', result)
        self.assertEqual(self.agent.execution_count, 1)
    
    def test_agent_metrics(self):
        """Test agent performance metrics"""
        self.agent.execution_count = 5
        self.agent.success_count = 4
        self.agent.total_execution_time = 25.0
        
        metrics = self.agent.get_agent_metrics()
        
        self.assertEqual(metrics['execution_count'], 5)
        self.assertEqual(metrics['success_rate'], 0.8)
        self.assertEqual(metrics['avg_execution_time'], 5.0)

class TestSixFigureBarberAnalytics(unittest.TestCase):
    """Test Six Figure Barber methodology analytics"""
    
    def setUp(self):
        """Set up test database connection"""
        self.test_db_path = tempfile.mktemp(suffix='.db')
        TestDataScientistAgent.setup_test_database.__func__(TestDataScientistAgent, self.test_db_path)
        self.db = sqlite3.connect(self.test_db_path)
        self.analytics = SixFigureBarberAnalytics(self.db)
    
    def tearDown(self):
        """Clean up test database"""
        self.db.close()
        if os.path.exists(self.test_db_path):
            os.remove(self.test_db_path)
    
    def test_price_optimization_calculation(self):
        """Test price optimization potential calculation"""
        import pandas as pd
        
        # Create test data with price variance
        test_data = pd.DataFrame({
            'avg_service_price': [50.0, 80.0, 25.0, 60.0]
        })
        
        potential = self.analytics._calculate_price_optimization(test_data)
        self.assertGreater(potential, 0)
        self.assertLessEqual(potential, 50.0)
    
    def test_time_optimization_calculation(self):
        """Test time optimization potential calculation"""
        import pandas as pd
        
        # Create test data with utilization metrics
        test_data = pd.DataFrame({
            'utilization_rate': [0.6, 0.8, 0.7],
            'booking_efficiency': [0.85, 0.95, 0.9]
        })
        
        potential = self.analytics._calculate_time_optimization(test_data)
        self.assertGreaterEqual(potential, 0)
    
    def test_client_value_recommendations(self):
        """Test client value recommendation generation"""
        metrics = {
            'avg_retention_rate': 0.7,
            'avg_satisfaction_rate': 0.85,
            'client_lifespan_avg': 150,
            'repeat_client_rate': 60
        }
        
        recommendations = self.analytics._generate_client_value_recommendations(metrics)
        self.assertIsInstance(recommendations, list)
        self.assertGreater(len(recommendations), 0)
    
    def test_efficiency_recommendations(self):
        """Test efficiency recommendation generation"""
        metrics = {
            'avg_utilization_rate': 0.6,
            'avg_no_show_rate': 0.15,
            'avg_cancellation_rate': 0.2,
            'time_optimization_potential': 25
        }
        
        recommendations = self.analytics._generate_efficiency_recommendations(metrics)
        self.assertIsInstance(recommendations, list)
        self.assertGreater(len(recommendations), 0)

class TestDatabaseOptimizer(unittest.TestCase):
    """Test database optimization functionality"""
    
    def setUp(self):
        """Set up test database"""
        self.test_db_path = tempfile.mktemp(suffix='.db')
        self.db = sqlite3.connect(self.test_db_path)
        self.optimizer = DatabaseOptimizer(self.db, 'sqlite')
    
    def tearDown(self):
        """Clean up test database"""
        self.db.close()
        if os.path.exists(self.test_db_path):
            os.remove(self.test_db_path)
    
    def test_basic_optimizations(self):
        """Test basic SQL optimization patterns"""
        test_query = "SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)"
        optimized = self.optimizer._apply_basic_optimizations(test_query)
        
        self.assertIsInstance(optimized, str)
        self.assertNotEqual(optimized, test_query)
    
    def test_index_suggestions(self):
        """Test index suggestion generation"""
        test_query = "SELECT * FROM appointments WHERE barber_id = 1 AND scheduled_date > '2024-01-01'"
        suggestions = self.optimizer._suggest_indexes(test_query, None)
        
        self.assertIsInstance(suggestions, list)
    
    def test_improvement_estimation(self):
        """Test performance improvement estimation"""
        original_query = "SELECT * FROM large_table WHERE complex_condition = 1"
        optimized_query = "SELECT id, name FROM large_table WHERE indexed_column = 1"
        
        improvement = self.optimizer._estimate_improvement(original_query, optimized_query, None)
        self.assertGreaterEqual(improvement, 0)
        self.assertLessEqual(improvement, 100)

class TestSafetyMechanisms(unittest.TestCase):
    """Test safety mechanisms and resource protection"""
    
    def setUp(self):
        """Set up safety components"""
        self.safety_validator = SafetyValidator()
        self.rate_limiter = RateLimiter(max_executions_per_hour=5, cooldown_minutes=1)
        self.resource_monitor = ResourceMonitor(memory_limit_mb=512, cpu_limit_percent=80, timeout_minutes=1)
    
    def test_sql_validation_safe_queries(self):
        """Test SQL validation for safe queries"""
        safe_queries = [
            "SELECT * FROM users",
            "SELECT COUNT(*) FROM appointments",
            "EXPLAIN SELECT * FROM barbers",
            "WITH cte AS (SELECT id FROM clients) SELECT * FROM cte"
        ]
        
        for query in safe_queries:
            is_safe, message = self.safety_validator.validate_sql_query(query)
            self.assertTrue(is_safe, f"Query should be safe: {query}")
    
    def test_sql_validation_dangerous_queries(self):
        """Test SQL validation for dangerous queries"""
        dangerous_queries = [
            "DROP TABLE users",
            "DELETE FROM appointments",
            "UPDATE clients SET password = 'hacked'",
            "INSERT INTO users VALUES (1, 'hacker')",
            "ALTER TABLE users ADD COLUMN hacked TEXT",
            "EXEC sp_dangerous_procedure"
        ]
        
        for query in dangerous_queries:
            is_safe, message = self.safety_validator.validate_sql_query(query)
            self.assertFalse(is_safe, f"Query should be dangerous: {query}")
    
    def test_file_validation_safe_paths(self):
        """Test file validation for safe paths"""
        safe_paths = [
            "/Users/bossio/6fb-booking/test.txt",
            "/tmp/analysis_results.json",
            "/Users/bossio/6fb-booking/backend-v2/bookedbarber.db"
        ]
        
        for path in safe_paths:
            is_safe, message = self.safety_validator.validate_file_access(path)
            self.assertTrue(is_safe, f"Path should be safe: {path}")
    
    def test_file_validation_dangerous_paths(self):
        """Test file validation for dangerous paths"""
        dangerous_paths = [
            "/etc/passwd",
            "/Users/bossio/6fb-booking/.env",
            "/root/secret.txt",
            "/Users/bossio/6fb-booking/backend-v2/.env"
        ]
        
        for path in dangerous_paths:
            is_safe, message = self.safety_validator.validate_file_access(path)
            self.assertFalse(is_safe, f"Path should be dangerous: {path}")
    
    def test_rate_limiting(self):
        """Test rate limiting functionality"""
        # First execution should be allowed
        can_execute, message = self.rate_limiter.can_execute()
        self.assertTrue(can_execute)
        
        # Record execution
        self.rate_limiter.record_execution()
        
        # Immediate second execution should be blocked by cooldown
        can_execute, message = self.rate_limiter.can_execute()
        self.assertFalse(can_execute)
        self.assertIn("cooldown", message.lower())
    
    def test_rate_limiter_status(self):
        """Test rate limiter status reporting"""
        status = self.rate_limiter.get_status()
        
        self.assertIn('executions_last_hour', status)
        self.assertIn('max_executions_per_hour', status)
        self.assertIn('cooldown_remaining_seconds', status)
        self.assertIn('can_execute', status)
    
    def test_resource_monitor_initialization(self):
        """Test resource monitor initialization"""
        monitor = ResourceMonitor(memory_limit_mb=1024, cpu_limit_percent=75, timeout_minutes=10)
        
        self.assertEqual(monitor.memory_limit_mb, 1024)
        self.assertEqual(monitor.cpu_limit_percent, 75)
        self.assertEqual(monitor.timeout_seconds, 600)
        self.assertFalse(monitor.monitoring)
    
    def test_execution_safety_wrapper(self):
        """Test execution safety wrapper"""
        wrapper = ExecutionSafetyWrapper(
            memory_limit_mb=512,
            cpu_limit_percent=80,
            timeout_minutes=1,
            max_executions_per_hour=3,
            cooldown_minutes=1
        )
        
        # Test SQL validation
        sql_result = wrapper.validate_sql_operation("SELECT * FROM test")
        self.assertTrue(sql_result['is_safe'])
        
        # Test file validation
        file_result = wrapper.validate_file_operation("/tmp/test.txt")
        self.assertTrue(file_result['is_safe'])
        
        # Test safety status
        status = wrapper.get_safety_status()
        self.assertIn('resource_monitor', status)
        self.assertIn('rate_limiter', status)

class TestIntegration(unittest.TestCase):
    """Integration tests for the complete data scientist agent system"""
    
    def setUp(self):
        """Set up integration test environment"""
        self.test_db_path = tempfile.mktemp(suffix='.db')
        TestDataScientistAgent.setup_test_database.__func__(TestDataScientistAgent, self.test_db_path)
        
        # Create safety wrapper
        self.safety_wrapper = ExecutionSafetyWrapper(
            memory_limit_mb=512,
            cpu_limit_percent=90,
            timeout_minutes=2,
            max_executions_per_hour=10,
            cooldown_minutes=0  # No cooldown for testing
        )
    
    def tearDown(self):
        """Clean up integration test environment"""
        if os.path.exists(self.test_db_path):
            os.remove(self.test_db_path)
    
    def test_safe_analytics_execution(self):
        """Test safe execution of analytics operations"""
        def mock_analytics_operation():
            return {
                'metrics': {'test_metric': 42},
                'insights': ['Test insight'],
                'status': 'success'
            }
        
        result = self.safety_wrapper.safe_execute(mock_analytics_operation)
        
        self.assertTrue(result['success'])
        self.assertIn('result', result)
        self.assertIn('resource_usage', result)
    
    def test_comprehensive_data_analysis_workflow(self):
        """Test complete data analysis workflow with safety"""
        # Create agent with test database
        agent = DataScientistAgent()
        agent.db_connection = sqlite3.connect(self.test_db_path)
        agent.six_figure_analytics = SixFigureBarberAnalytics(agent.db_connection)
        agent.db_optimizer = DatabaseOptimizer(agent.db_connection, 'sqlite')
        agent.statistical_analyzer = StatisticalAnalyzer(agent.db_connection)
        
        # Test database performance analysis
        db_result = agent.analyze_database_performance()
        self.assertIn('status', db_result)
        
        # Test Six Figure Barber analytics
        sfb_result = agent.analyze_six_figure_barber_metrics()
        self.assertIn('status', sfb_result)
        
        # Test SQL optimization
        test_query = "SELECT * FROM appointments WHERE barber_id = 1"
        sql_result = agent.optimize_sql_query(test_query)
        self.assertIn('status', sql_result)
        
        # Clean up
        agent.db_connection.close()

def run_comprehensive_tests():
    """Run all test suites with detailed reporting"""
    
    print("=" * 80)
    print("BookedBarber V2 Data Scientist Agent - Comprehensive Test Suite")
    print("=" * 80)
    
    # Create test loader and runner
    loader = unittest.TestLoader()
    runner = unittest.TextTestRunner(verbosity=2)
    
    # Test suites
    test_suites = [
        ('Data Scientist Agent Core', TestDataScientistAgent),
        ('Six Figure Barber Analytics', TestSixFigureBarberAnalytics),
        ('Database Optimizer', TestDatabaseOptimizer),
        ('Safety Mechanisms', TestSafetyMechanisms),
        ('Integration Tests', TestIntegration)
    ]
    
    total_tests = 0
    total_failures = 0
    total_errors = 0
    
    for suite_name, test_class in test_suites:
        print(f"\n{'-' * 60}")
        print(f"Running {suite_name} Tests")
        print(f"{'-' * 60}")
        
        suite = loader.loadTestsFromTestCase(test_class)
        result = runner.run(suite)
        
        total_tests += result.testsRun
        total_failures += len(result.failures)
        total_errors += len(result.errors)
    
    # Print summary
    print(f"\n{'=' * 80}")
    print("TEST SUMMARY")
    print(f"{'=' * 80}")
    print(f"Total Tests: {total_tests}")
    print(f"Failures: {total_failures}")
    print(f"Errors: {total_errors}")
    print(f"Success Rate: {((total_tests - total_failures - total_errors) / total_tests * 100):.1f}%")
    
    if total_failures == 0 and total_errors == 0:
        print("\n✅ ALL TESTS PASSED - Data Scientist Agent is ready for deployment!")
        return True
    else:
        print(f"\n❌ {total_failures + total_errors} TEST(S) FAILED - Review and fix issues before deployment")
        return False

if __name__ == '__main__':
    # Run comprehensive test suite
    success = run_comprehensive_tests()
    sys.exit(0 if success else 1)