#!/usr/bin/env python3
"""
Data Scientist Agent Control Script
Provides commands to manage, configure, test, and monitor the data scientist agent
"""

import json
import argparse
import subprocess
import sys
import time
import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Configuration paths
AGENT_PATH = '/Users/bossio/6fb-booking/.claude/agents/data-scientist-agent.py'
SAFETY_PATH = '/Users/bossio/6fb-booking/.claude/agents/data_scientist_safety.py'
TEST_PATH = '/Users/bossio/6fb-booking/.claude/agents/test_data_scientist.py'
CONFIG_PATH = '/Users/bossio/6fb-booking/.claude/sub-agent-automation.json'
LOG_PATH = '/Users/bossio/6fb-booking/.claude/data-scientist-agent.log'

class DataScientistController:
    def __init__(self):
        self.agent_path = AGENT_PATH
        self.safety_path = SAFETY_PATH
        self.test_path = TEST_PATH
        self.config_path = CONFIG_PATH
        self.log_path = LOG_PATH
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def status(self) -> Dict:
        """Get data scientist agent status"""
        status = {
            'agent_installed': os.path.exists(self.agent_path),
            'safety_module_installed': os.path.exists(self.safety_path),
            'test_suite_available': os.path.exists(self.test_path),
            'configuration_exists': os.path.exists(self.config_path),
            'log_file_exists': os.path.exists(self.log_path),
            'timestamp': datetime.now().isoformat()
        }
        
        # Check configuration details
        if status['configuration_exists']:
            try:
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                
                data_scientist_config = config.get('sub_agents', {}).get('data-scientist', {})
                status['agent_enabled'] = data_scientist_config.get('enabled', False)
                status['trigger_count'] = len(data_scientist_config.get('triggers', []))
                status['has_script_path'] = 'script_path' in data_scientist_config.get('action', {})
                
            except Exception as e:
                status['configuration_error'] = str(e)
        
        # Check log file size and recent activity
        if status['log_file_exists']:
            try:
                log_stat = os.stat(self.log_path)
                status['log_size_kb'] = round(log_stat.st_size / 1024, 2)
                status['log_modified'] = datetime.fromtimestamp(log_stat.st_mtime).isoformat()
            except Exception as e:
                status['log_error'] = str(e)
        
        return status
    
    def test_agent(self, test_type: str = 'all') -> bool:
        """Run data scientist agent tests"""
        self.logger.info(f"Running data scientist agent tests: {test_type}")
        
        if not os.path.exists(self.test_path):
            self.logger.error("Test suite not found")
            return False
        
        try:
            if test_type == 'safety':
                # Test safety mechanisms only
                cmd = [sys.executable, self.safety_path]
            elif test_type == 'quick':
                # Quick validation tests
                cmd = [sys.executable, self.test_path, '-v', '--pattern=test_*initialization*']
            else:
                # Full comprehensive test suite
                cmd = [sys.executable, self.test_path]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                self.logger.info("All tests passed successfully")
                print(result.stdout)
                return True
            else:
                self.logger.error(f"Tests failed with return code {result.returncode}")
                print("STDOUT:", result.stdout)
                print("STDERR:", result.stderr)
                return False
                
        except subprocess.TimeoutExpired:
            self.logger.error("Test execution timed out")
            return False
        except Exception as e:
            self.logger.error(f"Test execution failed: {e}")
            return False
    
    def validate_configuration(self) -> bool:
        """Validate data scientist agent configuration"""
        self.logger.info("Validating data scientist agent configuration")
        
        if not os.path.exists(self.config_path):
            self.logger.error("Configuration file not found")
            return False
        
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            # Check data scientist configuration
            if 'sub_agents' not in config:
                self.logger.error("No sub_agents section in configuration")
                return False
            
            if 'data-scientist' not in config['sub_agents']:
                self.logger.error("No data-scientist configuration found")
                return False
            
            ds_config = config['sub_agents']['data-scientist']
            
            # Validate required fields
            required_fields = ['description', 'enabled', 'triggers', 'action']
            for field in required_fields:
                if field not in ds_config:
                    self.logger.error(f"Missing required field: {field}")
                    return False
            
            # Validate triggers
            triggers = ds_config['triggers']
            if not isinstance(triggers, list) or len(triggers) == 0:
                self.logger.error("No triggers configured")
                return False
            
            # Validate each trigger
            for i, trigger in enumerate(triggers):
                required_trigger_fields = ['name', 'description', 'events', 'matchers', 'conditions']
                for field in required_trigger_fields:
                    if field not in trigger:
                        self.logger.error(f"Trigger {i}: Missing field {field}")
                        return False
            
            # Validate action configuration
            action = ds_config['action']
            if action.get('script_path') != self.agent_path:
                self.logger.warning(f"Script path mismatch: {action.get('script_path')} != {self.agent_path}")
            
            # Validate safety mechanisms
            if 'safety_mechanisms' in config:
                safety = config['safety_mechanisms']
                
                # Check resource limits
                if 'resource_protection' in safety:
                    resource_limits = safety['resource_protection']
                    if resource_limits.get('max_execution_time_minutes', 0) < 10:
                        self.logger.warning("Low execution timeout may cause analysis failures")
                    
                    if resource_limits.get('memory_limit_mb', 0) < 512:
                        self.logger.warning("Low memory limit may cause analysis failures")
            
            self.logger.info("Configuration validation passed")
            return True
            
        except json.JSONDecodeError as e:
            self.logger.error(f"Invalid JSON in configuration: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Configuration validation failed: {e}")
            return False
    
    def analyze_sample_data(self, analysis_type: str = 'database_performance') -> bool:
        """Run sample data analysis to test agent functionality"""
        self.logger.info(f"Running sample analysis: {analysis_type}")
        
        if not os.path.exists(self.agent_path):
            self.logger.error("Data scientist agent not found")
            return False
        
        try:
            # Prepare context for analysis
            context = {
                'analysis_type': analysis_type,
                'test_mode': True,
                'sample_data': True
            }
            
            cmd = [
                sys.executable, 
                self.agent_path,
                '--trigger', analysis_type,
                '--context', json.dumps(context)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
            
            if result.returncode == 0:
                self.logger.info("Sample analysis completed successfully")
                try:
                    analysis_result = json.loads(result.stdout)
                    print(json.dumps(analysis_result, indent=2))
                    return analysis_result.get('status') == 'success'
                except json.JSONDecodeError:
                    print(result.stdout)
                    return True
            else:
                self.logger.error(f"Sample analysis failed with return code {result.returncode}")
                print("STDERR:", result.stderr)
                return False
                
        except subprocess.TimeoutExpired:
            self.logger.error("Sample analysis timed out")
            return False
        except Exception as e:
            self.logger.error(f"Sample analysis failed: {e}")
            return False
    
    def enable_agent(self) -> bool:
        """Enable the data scientist agent in configuration"""
        self.logger.info("Enabling data scientist agent")
        
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            if 'sub_agents' in config and 'data-scientist' in config['sub_agents']:
                config['sub_agents']['data-scientist']['enabled'] = True
                
                with open(self.config_path, 'w') as f:
                    json.dump(config, f, indent=2)
                
                self.logger.info("Data scientist agent enabled successfully")
                return True
            else:
                self.logger.error("Data scientist configuration not found")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to enable agent: {e}")
            return False
    
    def disable_agent(self) -> bool:
        """Disable the data scientist agent in configuration"""
        self.logger.info("Disabling data scientist agent")
        
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            if 'sub_agents' in config and 'data-scientist' in config['sub_agents']:
                config['sub_agents']['data-scientist']['enabled'] = False
                
                with open(self.config_path, 'w') as f:
                    json.dump(config, f, indent=2)
                
                self.logger.info("Data scientist agent disabled successfully")
                return True
            else:
                self.logger.error("Data scientist configuration not found")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to disable agent: {e}")
            return False
    
    def view_logs(self, lines: int = 50) -> None:
        """View recent data scientist agent logs"""
        if not os.path.exists(self.log_path):
            print("No log file found")
            return
        
        try:
            with open(self.log_path, 'r') as f:
                log_lines = f.readlines()
            
            # Show last N lines
            recent_lines = log_lines[-lines:] if len(log_lines) > lines else log_lines
            
            print(f"=== Last {len(recent_lines)} lines of data scientist agent logs ===")
            for line in recent_lines:
                print(line.rstrip())
                
        except Exception as e:
            self.logger.error(f"Failed to read logs: {e}")
    
    def benchmark_performance(self) -> Dict:
        """Benchmark data scientist agent performance"""
        self.logger.info("Running performance benchmark")
        
        benchmarks = {
            'sql_validation': self._benchmark_sql_validation(),
            'safety_checks': self._benchmark_safety_checks(),
            'analytics_processing': self._benchmark_analytics()
        }
        
        return benchmarks
    
    def _benchmark_sql_validation(self) -> Dict:
        """Benchmark SQL validation performance"""
        try:
            start_time = time.time()
            
            # Import and test safety module
            sys.path.append(str(Path(self.safety_path).parent))
            from data_scientist_safety import SafetyValidator
            
            validator = SafetyValidator()
            
            # Test queries
            test_queries = [
                "SELECT * FROM users WHERE id = 1",
                "SELECT COUNT(*) FROM appointments WHERE date >= '2024-01-01'",
                "SELECT AVG(price) FROM services GROUP BY barber_id",
                "EXPLAIN SELECT * FROM complex_join_query"
            ]
            
            validation_times = []
            for query in test_queries:
                query_start = time.time()
                validator.validate_sql_query(query)
                validation_times.append(time.time() - query_start)
            
            total_time = time.time() - start_time
            
            return {
                'total_time_seconds': round(total_time, 4),
                'avg_validation_time_ms': round(sum(validation_times) / len(validation_times) * 1000, 2),
                'queries_tested': len(test_queries),
                'queries_per_second': round(len(test_queries) / total_time, 2)
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _benchmark_safety_checks(self) -> Dict:
        """Benchmark safety mechanism performance"""
        try:
            start_time = time.time()
            
            sys.path.append(str(Path(self.safety_path).parent))
            from data_scientist_safety import ExecutionSafetyWrapper
            
            wrapper = ExecutionSafetyWrapper()
            
            # Test safety operations
            operations = [
                ('sql_validation', lambda: wrapper.validate_sql_operation("SELECT * FROM test")),
                ('file_validation', lambda: wrapper.validate_file_operation("/tmp/test.txt")),
                ('safety_status', lambda: wrapper.get_safety_status())
            ]
            
            operation_times = {}
            for name, operation in operations:
                op_start = time.time()
                operation()
                operation_times[name] = round((time.time() - op_start) * 1000, 2)
            
            total_time = time.time() - start_time
            
            return {
                'total_time_seconds': round(total_time, 4),
                'operation_times_ms': operation_times,
                'operations_tested': len(operations)
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _benchmark_analytics(self) -> Dict:
        """Benchmark analytics processing performance"""
        try:
            # Simple analytics simulation
            start_time = time.time()
            
            # Simulate data processing operations
            import json
            import statistics
            
            # Generate test data
            test_data = [
                {'revenue': 100 + i * 10, 'clients': 5 + i, 'efficiency': 0.8 + (i * 0.01)}
                for i in range(100)
            ]
            
            # Perform analytics calculations
            total_revenue = sum(item['revenue'] for item in test_data)
            avg_clients = statistics.mean(item['clients'] for item in test_data)
            efficiency_variance = statistics.variance(item['efficiency'] for item in test_data)
            
            # Simulate insights generation
            insights = [
                f"Total revenue: ${total_revenue}",
                f"Average clients: {avg_clients:.1f}",
                f"Efficiency variance: {efficiency_variance:.4f}"
            ]
            
            processing_time = time.time() - start_time
            
            return {
                'processing_time_seconds': round(processing_time, 4),
                'data_points_processed': len(test_data),
                'insights_generated': len(insights),
                'processing_rate_points_per_second': round(len(test_data) / processing_time, 2)
            }
            
        except Exception as e:
            return {'error': str(e)}

def main():
    """Main command line interface"""
    parser = argparse.ArgumentParser(description='Data Scientist Agent Control Interface')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show agent status')
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Run agent tests')
    test_parser.add_argument('--type', choices=['all', 'safety', 'quick'], default='all',
                           help='Type of tests to run')
    
    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate configuration')
    
    # Analyze command
    analyze_parser = subparsers.add_parser('analyze', help='Run sample analysis')
    analyze_parser.add_argument('--type', 
                               choices=['database_performance', 'six_figure_metrics', 'statistical_analysis'],
                               default='database_performance',
                               help='Type of analysis to run')
    
    # Enable/Disable commands
    enable_parser = subparsers.add_parser('enable', help='Enable the agent')
    disable_parser = subparsers.add_parser('disable', help='Disable the agent')
    
    # Logs command
    logs_parser = subparsers.add_parser('logs', help='View agent logs')
    logs_parser.add_argument('--lines', type=int, default=50, help='Number of lines to show')
    
    # Benchmark command
    benchmark_parser = subparsers.add_parser('benchmark', help='Run performance benchmarks')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    controller = DataScientistController()
    
    try:
        if args.command == 'status':
            status = controller.status()
            print(json.dumps(status, indent=2))
            
        elif args.command == 'test':
            success = controller.test_agent(args.type)
            return 0 if success else 1
            
        elif args.command == 'validate':
            success = controller.validate_configuration()
            return 0 if success else 1
            
        elif args.command == 'analyze':
            success = controller.analyze_sample_data(args.type)
            return 0 if success else 1
            
        elif args.command == 'enable':
            success = controller.enable_agent()
            return 0 if success else 1
            
        elif args.command == 'disable':
            success = controller.disable_agent()
            return 0 if success else 1
            
        elif args.command == 'logs':
            controller.view_logs(args.lines)
            
        elif args.command == 'benchmark':
            benchmarks = controller.benchmark_performance()
            print(json.dumps(benchmarks, indent=2))
            
        return 0
        
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())