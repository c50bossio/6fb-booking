#!/usr/bin/env python3
"""
Test script for the automated test generator agent
Validates deployment and functionality
"""

import json
import subprocess
import os
import sys
import tempfile
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('test-automated-test-generator')

def test_agent_script_exists():
    """Test that the agent script exists and is executable"""
    agent_script = "/Users/bossio/6fb-booking/.claude/scripts/automated-test-generator-agent.py"
    
    if not os.path.exists(agent_script):
        logger.error(f"Agent script does not exist: {agent_script}")
        return False
    
    if not os.access(agent_script, os.X_OK):
        logger.error(f"Agent script is not executable: {agent_script}")
        return False
    
    logger.info("✓ Agent script exists and is executable")
    return True

def test_agent_configuration():
    """Test that the agent is properly configured in sub-agent-automation.json"""
    config_file = "/Users/bossio/6fb-booking/.claude/sub-agent-automation.json"
    
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        if 'automated-test-generator' not in config.get('sub_agents', {}):
            logger.error("automated-test-generator not found in sub-agent configuration")
            return False
        
        agent_config = config['sub_agents']['automated-test-generator']
        
        # Check required fields
        required_fields = ['description', 'enabled', 'triggers', 'action']
        for field in required_fields:
            if field not in agent_config:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Check that agent is enabled
        if not agent_config['enabled']:
            logger.error("automated-test-generator is not enabled")
            return False
        
        # Check triggers
        triggers = agent_config['triggers']
        if len(triggers) < 5:
            logger.warning(f"Only {len(triggers)} triggers configured, expected at least 5")
        
        logger.info(f"✓ Agent properly configured with {len(triggers)} triggers")
        return True
        
    except Exception as e:
        logger.error(f"Error reading configuration: {e}")
        return False

def test_agent_execution():
    """Test that the agent can be executed with sample data"""
    agent_script = "/Users/bossio/6fb-booking/.claude/scripts/automated-test-generator-agent.py"
    
    # Create sample trigger data
    sample_trigger = {
        "trigger_name": "test_trigger",
        "changed_files": ["/tmp/test_component.py"],
        "test_types_needed": ["unit", "integration"],
        "priority": "high",
        "six_figure_barber_context": True
    }
    
    # Create a temporary test file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write("""
def test_function(x, y):
    '''Test function for validation'''
    return x + y

class TestClass:
    '''Test class for validation'''
    def test_method(self):
        return True
""")
        test_file = f.name
    
    try:
        # Update sample trigger with real file
        sample_trigger["changed_files"] = [test_file]
        
        # Execute agent
        result = subprocess.run([
            'python3', agent_script, json.dumps(sample_trigger)
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            logger.error(f"Agent execution failed: {result.stderr}")
            return False
        
        # Parse output
        try:
            output = json.loads(result.stdout)
            logger.info(f"✓ Agent executed successfully: {output.get('status', 'unknown')}")
            return True
        except json.JSONDecodeError:
            logger.error(f"Agent output is not valid JSON: {result.stdout}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error("Agent execution timed out")
        return False
    except Exception as e:
        logger.error(f"Error executing agent: {e}")
        return False
    finally:
        # Clean up temporary file
        if os.path.exists(test_file):
            os.unlink(test_file)

def test_trigger_conditions():
    """Test that trigger conditions are properly configured"""
    config_file = "/Users/bossio/6fb-booking/.claude/sub-agent-automation.json"
    
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        agent_config = config['sub_agents']['automated-test-generator']
        triggers = agent_config['triggers']
        
        # Test each trigger
        trigger_tests = {
            'new_feature_implementation': ['Write(file_path:*/backend-v2/api/*)'],
            'code_modifications_without_tests': ['Edit(file_path:*/backend-v2/*.py)'],
            'model_schema_changes': ['Edit(file_path:*/backend-v2/models/*)'],
            'integration_point_additions': ['Edit(file_path:*stripe*)'],
            'six_figure_barber_business_logic': ['Edit(file_path:*booking*)'],
            'critical_path_implementations': ['Edit(file_path:*auth*)'],
            'missing_test_coverage': ['*']
        }
        
        for trigger in triggers:
            trigger_name = trigger['name']
            if trigger_name in trigger_tests:
                expected_matchers = trigger_tests[trigger_name]
                actual_matchers = trigger.get('matchers', [])
                
                for expected in expected_matchers:
                    if expected in actual_matchers:
                        logger.info(f"✓ Trigger {trigger_name}: found expected matcher {expected}")
                    else:
                        logger.warning(f"⚠ Trigger {trigger_name}: missing expected matcher {expected}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error testing trigger conditions: {e}")
        return False

def test_safety_mechanisms():
    """Test that safety mechanisms are properly configured"""
    config_file = "/Users/bossio/6fb-booking/.claude/sub-agent-automation.json"
    
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        agent_config = config['sub_agents']['automated-test-generator']
        action_config = agent_config['action']
        
        # Check resource limits
        resource_limits = action_config.get('resource_limits', {})
        if 'memory_mb' not in resource_limits:
            logger.warning("No memory limit configured")
        else:
            memory_limit = resource_limits['memory_mb']
            if memory_limit > 1024:
                logger.warning(f"High memory limit: {memory_limit}MB")
            else:
                logger.info(f"✓ Memory limit configured: {memory_limit}MB")
        
        if 'cpu_percent' not in resource_limits:
            logger.warning("No CPU limit configured")
        else:
            cpu_limit = resource_limits['cpu_percent']
            if cpu_limit > 75:
                logger.warning(f"High CPU limit: {cpu_limit}%")
            else:
                logger.info(f"✓ CPU limit configured: {cpu_limit}%")
        
        # Check execution timeout
        timeout = action_config.get('execution_timeout_minutes', 0)
        if timeout == 0:
            logger.warning("No execution timeout configured")
        elif timeout > 20:
            logger.warning(f"High execution timeout: {timeout} minutes")
        else:
            logger.info(f"✓ Execution timeout configured: {timeout} minutes")
        
        return True
        
    except Exception as e:
        logger.error(f"Error testing safety mechanisms: {e}")
        return False

def test_integration_with_existing_system():
    """Test integration with existing sub-agent system"""
    # Check if sub-agent automation process is running
    try:
        result = subprocess.run(['pgrep', '-f', 'sub-agent-automation'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            logger.info("✓ Sub-agent automation system is running")
        else:
            logger.warning("⚠ Sub-agent automation system is not running")
        
        # Check if metrics file exists and is being updated
        metrics_file = "/Users/bossio/6fb-booking/.claude/sub-agent-metrics.json"
        if os.path.exists(metrics_file):
            logger.info("✓ Sub-agent metrics file exists")
            
            with open(metrics_file, 'r') as f:
                metrics = json.load(f)
            
            if 'total_executions' in metrics:
                logger.info(f"✓ Metrics tracking working: {metrics['total_executions']} total executions")
            else:
                logger.warning("⚠ Metrics not properly tracking")
        else:
            logger.warning("⚠ Sub-agent metrics file not found")
        
        return True
        
    except Exception as e:
        logger.error(f"Error testing integration: {e}")
        return False

def run_all_tests():
    """Run all test functions"""
    tests = [
        ("Agent Script Exists", test_agent_script_exists),
        ("Agent Configuration", test_agent_configuration),
        ("Agent Execution", test_agent_execution),
        ("Trigger Conditions", test_trigger_conditions),
        ("Safety Mechanisms", test_safety_mechanisms),
        ("System Integration", test_integration_with_existing_system)
    ]
    
    passed = 0
    total = len(tests)
    
    logger.info("=" * 60)
    logger.info("AUTOMATED TEST GENERATOR AGENT - DEPLOYMENT TEST")
    logger.info("=" * 60)
    
    for test_name, test_func in tests:
        logger.info(f"\nRunning: {test_name}")
        logger.info("-" * 40)
        
        try:
            if test_func():
                logger.info(f"✓ PASSED: {test_name}")
                passed += 1
            else:
                logger.error(f"✗ FAILED: {test_name}")
        except Exception as e:
            logger.error(f"✗ ERROR in {test_name}: {e}")
    
    logger.info("=" * 60)
    logger.info(f"TEST RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 ALL TESTS PASSED - Automated Test Generator Agent is ready!")
        return True
    else:
        logger.error(f"❌ {total - passed} tests failed - Please review configuration")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)