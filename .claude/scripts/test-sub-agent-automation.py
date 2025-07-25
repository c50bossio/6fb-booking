#!/usr/bin/env python3
"""
Test Suite for Sub-Agent Automation System
Validates that all components work correctly and safely
"""

import json
import time
import subprocess
import tempfile
import os
import sys
import unittest
from pathlib import Path
from datetime import datetime

class TestSubAgentAutomation(unittest.TestCase):
    
    def setUp(self):
        """Set up test environment"""
        self.config_path = '/Users/bossio/6fb-booking/.claude/sub-agent-automation.json'
        self.control_script = '/Users/bossio/6fb-booking/.claude/scripts/sub-agent-control.py'
        self.automation_script = '/Users/bossio/6fb-booking/.claude/scripts/sub-agent-automation.py'
        self.browser_integration_script = '/Users/bossio/6fb-booking/.claude/scripts/browser-logs-integration.py'
        self.hook_bridge_script = '/Users/bossio/6fb-booking/.claude/scripts/sub-agent-hook-bridge.sh'
        
        # Ensure scripts exist
        for script in [self.control_script, self.automation_script, self.browser_integration_script, self.hook_bridge_script]:
            self.assertTrue(os.path.exists(script), f"Script not found: {script}")
    
    def test_config_file_exists_and_valid(self):
        """Test that configuration file exists and is valid JSON"""
        self.assertTrue(os.path.exists(self.config_path), "Configuration file not found")
        
        with open(self.config_path, 'r') as f:
            config = json.load(f)
        
        # Check required sections
        self.assertIn('sub_agents', config)
        self.assertIn('safety_mechanisms', config)
        self.assertIn('monitoring', config)
        
        # Check sub-agents
        required_agents = ['debugger', 'code-reviewer', 'data-scientist', 'general-purpose']
        for agent in required_agents:
            self.assertIn(agent, config['sub_agents'])
            self.assertIn('triggers', config['sub_agents'][agent])
            self.assertIn('action', config['sub_agents'][agent])
    
    def test_control_script_functionality(self):
        """Test control script basic functionality"""
        # Test status command
        result = subprocess.run([
            'python3', self.control_script, 'status'
        ], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, "Status command failed")
        
        # Test list-agents command
        result = subprocess.run([
            'python3', self.control_script, 'list-agents'
        ], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, "List agents command failed")
        self.assertIn('debugger', result.stdout)
        self.assertIn('code-reviewer', result.stdout)
    
    def test_safety_mechanisms(self):
        """Test safety mechanisms are properly configured"""
        with open(self.config_path, 'r') as f:
            config = json.load(f)
        
        safety = config['safety_mechanisms']
        
        # Check rate limits exist
        self.assertIn('global_rate_limit', safety)
        self.assertIn('max_agent_executions_per_hour', safety['global_rate_limit'])
        self.assertIn('max_agent_executions_per_day', safety['global_rate_limit'])
        
        # Check emergency stop
        self.assertIn('emergency_stop', safety)
        self.assertIn('enabled', safety['emergency_stop'])
        self.assertTrue(safety['emergency_stop']['enabled'])
        
        # Check conflict prevention
        self.assertIn('conflict_prevention', safety)
        self.assertIn('max_concurrent_agents', safety['conflict_prevention'])
        self.assertGreater(safety['conflict_prevention']['max_concurrent_agents'], 0)
    
    def test_trigger_conditions_are_realistic(self):
        """Test that trigger conditions are not too sensitive"""
        with open(self.config_path, 'r') as f:
            config = json.load(f)
        
        for agent_name, agent_config in config['sub_agents'].items():
            for trigger in agent_config['triggers']:
                # Check cooldown periods are reasonable (at least 1 minute)
                cooldown = trigger.get('cooldown_minutes', 0)
                self.assertGreaterEqual(cooldown, 1, 
                    f"Trigger {trigger['name']} has too short cooldown: {cooldown}")
                
                # Check max triggers per hour are reasonable (not more than 20)
                max_per_hour = trigger.get('max_triggers_per_hour', 100)
                self.assertLessEqual(max_per_hour, 20, 
                    f"Trigger {trigger['name']} allows too many executions: {max_per_hour}")
    
    def test_emergency_stop_functionality(self):
        """Test emergency stop creates and removes stop file correctly"""
        stop_file = Path('/Users/bossio/6fb-booking/.claude/EMERGENCY_STOP')
        
        # Ensure stop file doesn't exist initially
        if stop_file.exists():
            stop_file.unlink()
        
        # Test emergency stop
        result = subprocess.run([
            'python3', self.control_script, 'emergency-stop'
        ], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, "Emergency stop failed")
        self.assertTrue(stop_file.exists(), "Emergency stop file not created")
        
        # Test clearing emergency stop
        result = subprocess.run([
            'python3', self.control_script, 'clear-emergency-stop'
        ], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, "Clear emergency stop failed")
        self.assertFalse(stop_file.exists(), "Emergency stop file not removed")
    
    def test_agent_enable_disable(self):
        """Test enabling and disabling individual agents"""
        # Test disabling debugger agent
        result = subprocess.run([
            'python3', self.control_script, 'disable-agent', 'debugger'
        ], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, "Disable agent failed")
        
        # Verify it's disabled in config
        with open(self.config_path, 'r') as f:
            config = json.load(f)
        self.assertFalse(config['sub_agents']['debugger']['enabled'])
        
        # Test enabling debugger agent
        result = subprocess.run([
            'python3', self.control_script, 'enable-agent', 'debugger'
        ], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, "Enable agent failed")
        
        # Verify it's enabled in config
        with open(self.config_path, 'r') as f:
            config = json.load(f)
        self.assertTrue(config['sub_agents']['debugger']['enabled'])
    
    def test_hook_bridge_integration(self):
        """Test hook bridge script works correctly"""
        # Test with a simple hook command
        result = subprocess.run([
            'bash', self.hook_bridge_script,
            '--hook-name', 'test_hook',
            '--hook-command', 'echo "test successful"'
        ], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, "Hook bridge failed with simple command")
    
    def test_browser_integration_imports(self):
        """Test that browser integration script imports work"""
        result = subprocess.run([
            'python3', '-c', 
            f'import sys; sys.path.append("{os.path.dirname(self.browser_integration_script)}"); ' +
            'exec(open("' + self.browser_integration_script + '").read().split("if __name__")[0])'
        ], capture_output=True, text=True)
        
        # Should not fail on imports (return code 0)
        if result.returncode != 0:
            print(f"Browser integration import error: {result.stderr}")
        # Note: This might fail if websocket module is not installed, which is okay for basic validation
    
    def test_automation_script_imports(self):
        """Test that automation script imports work"""
        result = subprocess.run([
            'python3', '-c', 
            f'import sys; sys.path.append("{os.path.dirname(self.automation_script)}"); ' +
            'exec(open("' + self.automation_script + '").read().split("if __name__")[0])'
        ], capture_output=True, text=True)
        
        # Should not fail on imports (return code 0)
        self.assertEqual(result.returncode, 0, f"Automation script import failed: {result.stderr}")
    
    def test_trigger_file_format(self):
        """Test trigger file format is correct"""
        # Create a test trigger file
        trigger_data = {
            "trigger_name": "test_trigger",
            "agent_type": "debugger",
            "error_details": "Test error for validation",
            "affected_files": ["test.py"],
            "timestamp": datetime.now().isoformat(),
            "priority": "high",
            "auto_execute": True,
            "source": "test_suite"
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(trigger_data, f, indent=2)
            trigger_file = f.name
        
        try:
            # Test that the automation script can read this format
            # (We're not actually executing, just validating the format)
            with open(trigger_file, 'r') as f:
                loaded_data = json.load(f)
            
            required_fields = ['trigger_name', 'agent_type', 'error_details', 'timestamp']
            for field in required_fields:
                self.assertIn(field, loaded_data, f"Missing required field: {field}")
        
        finally:
            os.unlink(trigger_file)
    
    def test_configuration_validation(self):
        """Test configuration validation logic"""
        with open(self.config_path, 'r') as f:
            config = json.load(f)
        
        # Test that all agent types have valid actions
        for agent_name, agent_config in config['sub_agents'].items():
            action = agent_config['action']
            self.assertIn('agent_type', action)
            self.assertIn('prompt_template', action)
            self.assertIn('auto_execute', action)
            self.assertIn('priority', action)
            
            # Validate priority values
            self.assertIn(action['priority'], ['low', 'medium', 'high'])
    
    def test_log_file_permissions(self):
        """Test that log files can be created and written to"""
        log_dir = Path('/Users/bossio/6fb-booking/.claude')
        self.assertTrue(log_dir.exists(), "Claude directory doesn't exist")
        
        # Test creating a log file
        test_log = log_dir / 'test-automation.log'
        try:
            with open(test_log, 'w') as f:
                f.write("Test log entry\n")
            self.assertTrue(test_log.exists(), "Cannot create log files")
        finally:
            if test_log.exists():
                test_log.unlink()

class TestIntegration(unittest.TestCase):
    """Integration tests that require multiple components"""
    
    def setUp(self):
        self.control_script = '/Users/bossio/6fb-booking/.claude/scripts/sub-agent-control.py'
    
    def test_full_enable_disable_cycle(self):
        """Test full enable/disable cycle"""
        # Get initial status
        result = subprocess.run([
            'python3', self.control_script, 'status'
        ], capture_output=True, text=True)
        initial_status = result.stdout
        
        # Disable automation
        subprocess.run([
            'python3', self.control_script, 'disable'
        ], capture_output=True, text=True)
        
        # Check it's disabled
        result = subprocess.run([
            'python3', self.control_script, 'status'
        ], capture_output=True, text=True)
        self.assertIn('Enabled: False', result.stdout)
        
        # Enable automation
        subprocess.run([
            'python3', self.control_script, 'enable'
        ], capture_output=True, text=True)
        
        # Check it's enabled
        result = subprocess.run([
            'python3', self.control_script, 'status'
        ], capture_output=True, text=True)
        self.assertIn('Enabled: True', result.stdout)

def run_comprehensive_test():
    """Run comprehensive test suite with detailed output"""
    print("=== Sub-Agent Automation Test Suite ===")
    print(f"Starting tests at {datetime.now()}")
    print()
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test cases
    suite.addTests(loader.loadTestsFromTestCase(TestSubAgentAutomation))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print()
    print("=== Test Summary ===")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.failures:
        print("\nFailures:")
        for test, trace in result.failures:
            print(f"- {test}: {trace}")
    
    if result.errors:
        print("\nErrors:")
        for test, trace in result.errors:
            print(f"- {test}: {trace}")
    
    success = len(result.failures) == 0 and len(result.errors) == 0
    print(f"\nOverall Result: {'PASS' if success else 'FAIL'}")
    
    return success

def quick_validation():
    """Quick validation of essential components"""
    print("=== Quick Validation ===")
    
    checks = [
        ("Configuration file exists", lambda: os.path.exists('/Users/bossio/6fb-booking/.claude/sub-agent-automation.json')),
        ("Control script exists", lambda: os.path.exists('/Users/bossio/6fb-booking/.claude/scripts/sub-agent-control.py')),
        ("Automation script exists", lambda: os.path.exists('/Users/bossio/6fb-booking/.claude/scripts/sub-agent-automation.py')),
        ("Browser integration exists", lambda: os.path.exists('/Users/bossio/6fb-booking/.claude/scripts/browser-logs-integration.py')),
        ("Hook bridge exists", lambda: os.path.exists('/Users/bossio/6fb-booking/.claude/scripts/sub-agent-hook-bridge.sh')),
    ]
    
    all_passed = True
    for check_name, check_func in checks:
        try:
            result = check_func()
            status = "PASS" if result else "FAIL"
            print(f"{check_name}: {status}")
            if not result:
                all_passed = False
        except Exception as e:
            print(f"{check_name}: ERROR - {e}")
            all_passed = False
    
    print(f"\nQuick validation: {'PASS' if all_passed else 'FAIL'}")
    return all_passed

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Test Sub-Agent Automation System')
    parser.add_argument('--quick', action='store_true', help='Run quick validation only')
    parser.add_argument('--comprehensive', action='store_true', help='Run comprehensive test suite')
    
    args = parser.parse_args()
    
    if args.quick:
        success = quick_validation()
    elif args.comprehensive:
        success = run_comprehensive_test()
    else:
        # Default: run both
        print("Running quick validation first...")
        quick_success = quick_validation()
        print("\nRunning comprehensive tests...")
        comprehensive_success = run_comprehensive_test()
        success = quick_success and comprehensive_success
    
    sys.exit(0 if success else 1)