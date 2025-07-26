#!/usr/bin/env python3
"""
Test script for Production Fullstack Dev Agent
Validates functionality and integration with BookedBarber V2
"""

import os
import sys
import json
import time
import logging
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

class ProductionDevAgentTester:
    """Test harness for the Production Fullstack Dev Agent"""
    
    def __init__(self):
        self.project_root = Path("/Users/bossio/6fb-booking")
        self.claude_dir = self.project_root / ".claude"
        self.agent_script = self.claude_dir / "scripts" / "production-fullstack-dev-agent.py"
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("ProductionDevAgentTester")
        
        # Test results
        self.test_results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_details": []
        }
    
    def log_test_result(self, test_name: str, status: str, details: str = ""):
        """Log individual test result"""
        self.test_results["total_tests"] += 1
        if status == "PASSED":
            self.test_results["passed_tests"] += 1
        else:
            self.test_results["failed_tests"] += 1
        
        self.test_results["test_details"].append({
            "test_name": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
        self.logger.info(f"Test: {test_name} - {status}")
        if details:
            self.logger.info(f"Details: {details}")
    
    def test_agent_script_exists(self) -> bool:
        """Test that the agent script exists and is executable"""
        try:
            if not self.agent_script.exists():
                self.log_test_result("Agent Script Exists", "FAILED", "Script file not found")
                return False
            
            if not os.access(self.agent_script, os.X_OK):
                self.log_test_result("Agent Script Executable", "FAILED", "Script is not executable")
                return False
            
            self.log_test_result("Agent Script Exists", "PASSED", "Script found and executable")
            return True
            
        except Exception as e:
            self.log_test_result("Agent Script Exists", "FAILED", str(e))
            return False
    
    def test_agent_configuration(self) -> bool:
        """Test that the agent is properly configured in sub-agent automation"""
        try:
            config_file = self.claude_dir / "sub-agent-automation.json"
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            # Check if production-fullstack-dev agent is configured
            agents = config.get("sub_agents", {})
            if "production-fullstack-dev" not in agents:
                self.log_test_result("Agent Configuration", "FAILED", "Agent not found in configuration")
                return False
            
            prod_agent = agents["production-fullstack-dev"]
            
            # Check required fields
            required_fields = ["description", "enabled", "triggers", "action"]
            for field in required_fields:
                if field not in prod_agent:
                    self.log_test_result("Agent Configuration", "FAILED", f"Missing field: {field}")
                    return False
            
            # Check if agent is enabled
            if not prod_agent.get("enabled", False):
                self.log_test_result("Agent Configuration", "FAILED", "Agent is disabled")
                return False
            
            # Check trigger count
            triggers = prod_agent.get("triggers", [])
            if len(triggers) < 5:
                self.log_test_result("Agent Configuration", "FAILED", f"Insufficient triggers: {len(triggers)}")
                return False
            
            self.log_test_result("Agent Configuration", "PASSED", f"Agent configured with {len(triggers)} triggers")
            return True
            
        except Exception as e:
            self.log_test_result("Agent Configuration", "FAILED", str(e))
            return False
    
    def test_agent_initialization(self) -> bool:
        """Test that the agent can be initialized"""
        try:
            # Test basic initialization
            result = subprocess.run([
                sys.executable, str(self.agent_script), 
                "test_initialization", "Test initialization"
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                self.log_test_result("Agent Initialization", "FAILED", 
                                   f"Exit code: {result.returncode}, Error: {result.stderr}")
                return False
            
            self.log_test_result("Agent Initialization", "PASSED", "Agent initialized successfully")
            return True
            
        except subprocess.TimeoutExpired:
            self.log_test_result("Agent Initialization", "FAILED", "Timeout during initialization")
            return False
        except Exception as e:
            self.log_test_result("Agent Initialization", "FAILED", str(e))
            return False
    
    def test_trigger_detection(self) -> bool:
        """Test trigger detection for different scenarios"""
        test_cases = [
            {
                "name": "API Endpoint Creation",
                "trigger": "api_endpoint_creation",
                "error": "New FastAPI endpoint created",
                "files": ["/Users/bossio/6fb-booking/backend-v2/api/v2/test.py"]
            },
            {
                "name": "Database Model Changes", 
                "trigger": "database_model_changes",
                "error": "Database model modified",
                "files": ["/Users/bossio/6fb-booking/backend-v2/models/test_model.py"]
            },
            {
                "name": "Component Development",
                "trigger": "component_development", 
                "error": "React component created",
                "files": ["/Users/bossio/6fb-booking/backend-v2/frontend-v2/components/TestComponent.tsx"]
            },
            {
                "name": "Authentication Security",
                "trigger": "authentication_security_features",
                "error": "Authentication system updated",
                "files": ["/Users/bossio/6fb-booking/backend-v2/middleware/auth.py"]
            },
            {
                "name": "Payment Processing",
                "trigger": "payment_booking_core_features",
                "error": "Payment processing enhanced", 
                "files": ["/Users/bossio/6fb-booking/backend-v2/services/payment_service.py"]
            }
        ]
        
        passed_cases = 0
        for case in test_cases:
            try:
                # Create test command
                cmd = [
                    sys.executable, str(self.agent_script),
                    case["trigger"], case["error"]
                ] + case["files"]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                
                if result.returncode == 0:
                    passed_cases += 1
                    self.log_test_result(f"Trigger Detection - {case['name']}", "PASSED", 
                                       "Trigger detected and processed")
                else:
                    self.log_test_result(f"Trigger Detection - {case['name']}", "FAILED",
                                       f"Exit code: {result.returncode}")
                    
            except subprocess.TimeoutExpired:
                self.log_test_result(f"Trigger Detection - {case['name']}", "FAILED", "Timeout")
            except Exception as e:
                self.log_test_result(f"Trigger Detection - {case['name']}", "FAILED", str(e))
        
        success_rate = passed_cases / len(test_cases)
        if success_rate >= 0.8:  # 80% success rate required
            self.log_test_result("Trigger Detection Overall", "PASSED", 
                               f"Success rate: {success_rate:.1%}")
            return True
        else:
            self.log_test_result("Trigger Detection Overall", "FAILED",
                               f"Success rate: {success_rate:.1%} (below 80%)")
            return False
    
    def test_implementation_standards(self) -> bool:
        """Test that implementation standards are properly loaded"""
        try:
            # Import the agent class to test standards loading
            import importlib.util
            spec = importlib.util.spec_from_file_location("production_agent", self.agent_script)
            agent_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(agent_module)
            
            # Create agent instance
            agent = agent_module.ProductionFullstackDevAgent()
            
            # Check implementation standards
            standards = agent.implementation_standards
            
            required_categories = [
                "code_quality", "security", "performance", 
                "accessibility", "six_figure_barber_alignment"
            ]
            
            for category in required_categories:
                if category not in standards:
                    self.log_test_result("Implementation Standards", "FAILED", 
                                       f"Missing category: {category}")
                    return False
            
            # Check specific standards
            if not standards["code_quality"].get("typescript_strict_mode"):
                self.log_test_result("Implementation Standards", "FAILED", 
                                   "TypeScript strict mode not enabled")
                return False
            
            if standards["security"].get("test_coverage_minimum", 0) < 80:
                self.log_test_result("Implementation Standards", "FAILED", 
                                   "Test coverage minimum too low")
                return False
            
            self.log_test_result("Implementation Standards", "PASSED", 
                               "All implementation standards loaded correctly")
            return True
            
        except Exception as e:
            self.log_test_result("Implementation Standards", "FAILED", str(e))
            return False
    
    def test_report_generation(self) -> bool:
        """Test that reports are generated correctly"""
        try:
            # Run agent with a simple test case
            result = subprocess.run([
                sys.executable, str(self.agent_script),
                "test_report_generation", "Test report generation",
                "/Users/bossio/6fb-booking/backend-v2/test_file.py"
            ], capture_output=True, text=True, timeout=120)
            
            if result.returncode != 0:
                self.log_test_result("Report Generation", "FAILED", 
                                   f"Agent execution failed: {result.stderr}")
                return False
            
            # Check for generated report files
            timestamp = datetime.now().strftime("%Y%m%d")
            report_pattern = f"production-dev-report-{timestamp}*.json"
            plan_pattern = f"production-dev-plan-{timestamp}*.md"
            
            report_files = list(self.claude_dir.glob(report_pattern))
            plan_files = list(self.claude_dir.glob(plan_pattern))
            
            if not report_files:
                self.log_test_result("Report Generation", "FAILED", 
                                   "No JSON report generated")
                return False
            
            if not plan_files:
                self.log_test_result("Report Generation", "FAILED", 
                                   "No markdown plan generated")
                return False
            
            # Validate report content
            with open(report_files[0], 'r') as f:
                report_data = json.load(f)
            
            required_sections = ["metadata", "results"]
            for section in required_sections:
                if section not in report_data:
                    self.log_test_result("Report Generation", "FAILED", 
                                       f"Missing report section: {section}")
                    return False
            
            self.log_test_result("Report Generation", "PASSED", 
                               "Reports generated successfully")
            return True
            
        except Exception as e:
            self.log_test_result("Report Generation", "FAILED", str(e))
            return False
    
    def test_safety_mechanisms(self) -> bool:
        """Test safety mechanisms and resource limits"""
        try:
            # Load configuration to check safety settings
            config_file = self.claude_dir / "sub-agent-automation.json"
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            safety = config.get("safety_mechanisms", {})
            
            # Check global rate limits
            global_limit = safety.get("global_rate_limit", {})
            if global_limit.get("max_agent_executions_per_hour", 0) < 10:
                self.log_test_result("Safety Mechanisms", "FAILED", 
                                   "Global rate limit too low")
                return False
            
            # Check resource protection
            resource_protection = safety.get("resource_protection", {})
            if resource_protection.get("max_execution_time_minutes", 0) < 10:
                self.log_test_result("Safety Mechanisms", "FAILED", 
                                   "Execution timeout too low")
                return False
            
            if resource_protection.get("memory_limit_mb", 0) < 512:
                self.log_test_result("Safety Mechanisms", "FAILED", 
                                   "Memory limit too low")
                return False
            
            # Check emergency stop configuration
            emergency = safety.get("emergency_stop", {})
            if not emergency.get("enabled", False):
                self.log_test_result("Safety Mechanisms", "FAILED", 
                                   "Emergency stop not enabled")
                return False
            
            # Check conflict prevention
            conflict = safety.get("conflict_prevention", {})
            priority_order = conflict.get("agent_priority_order", [])
            if "production-fullstack-dev" not in priority_order:
                self.log_test_result("Safety Mechanisms", "FAILED", 
                                   "Production dev agent not in priority order")
                return False
            
            self.log_test_result("Safety Mechanisms", "PASSED", 
                               "All safety mechanisms configured correctly")
            return True
            
        except Exception as e:
            self.log_test_result("Safety Mechanisms", "FAILED", str(e))
            return False
    
    def test_six_figure_alignment(self) -> bool:
        """Test Six Figure Barber methodology alignment features"""
        try:
            # Import agent to test alignment functionality
            import importlib.util
            spec = importlib.util.spec_from_file_location("production_agent", self.agent_script)
            agent_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(agent_module)
            
            agent = agent_module.ProductionFullstackDevAgent()
            
            # Test context detection for Six Figure Barber relevance
            context = agent.detect_trigger_context(
                "payment_booking_core_features",
                "commission calculation for barber revenue optimization",
                ["/Users/bossio/6fb-booking/backend-v2/services/commission_service.py"]
            )
            
            if not context.get("six_figure_methodology_relevant"):
                self.log_test_result("Six Figure Alignment", "FAILED", 
                                   "Six Figure methodology relevance not detected")
                return False
            
            if "api_endpoints" not in context.get("system_components", []):
                self.log_test_result("Six Figure Alignment", "FAILED", 
                                   "System components not properly identified")
                return False
            
            # Check implementation standards alignment
            standards = agent.implementation_standards
            six_figure_standards = standards.get("six_figure_barber_alignment", {})
            
            required_alignments = [
                "revenue_optimization", "client_value_creation", 
                "business_efficiency", "professional_growth", "scalability"
            ]
            
            for alignment in required_alignments:
                if not six_figure_standards.get(alignment, False):
                    self.log_test_result("Six Figure Alignment", "FAILED", 
                                       f"Missing alignment: {alignment}")
                    return False
            
            self.log_test_result("Six Figure Alignment", "PASSED", 
                               "Six Figure Barber methodology properly aligned")
            return True
            
        except Exception as e:
            self.log_test_result("Six Figure Alignment", "FAILED", str(e))
            return False
    
    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive test suite"""
        self.logger.info("Starting Production Fullstack Dev Agent Test Suite")
        self.logger.info("=" * 60)
        
        # Run all tests
        tests = [
            ("Agent Script Validation", self.test_agent_script_exists),
            ("Agent Configuration", self.test_agent_configuration),
            ("Agent Initialization", self.test_agent_initialization),
            ("Trigger Detection", self.test_trigger_detection),
            ("Implementation Standards", self.test_implementation_standards),
            ("Report Generation", self.test_report_generation),
            ("Safety Mechanisms", self.test_safety_mechanisms),
            ("Six Figure Alignment", self.test_six_figure_alignment)
        ]
        
        for test_name, test_func in tests:
            self.logger.info(f"\nRunning test: {test_name}")
            try:
                test_func()
            except Exception as e:
                self.log_test_result(test_name, "FAILED", f"Test exception: {str(e)}")
        
        # Generate test summary
        self.logger.info("\n" + "=" * 60)
        self.logger.info("TEST SUMMARY")
        self.logger.info("=" * 60)
        self.logger.info(f"Total Tests: {self.test_results['total_tests']}")
        self.logger.info(f"Passed: {self.test_results['passed_tests']}")
        self.logger.info(f"Failed: {self.test_results['failed_tests']}")
        
        success_rate = (self.test_results['passed_tests'] / self.test_results['total_tests']) * 100
        self.logger.info(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            self.logger.info("✅ PRODUCTION DEV AGENT TEST SUITE PASSED")
            overall_status = "PASSED"
        elif success_rate >= 75:
            self.logger.info("⚠️  PRODUCTION DEV AGENT TEST SUITE PARTIALLY PASSED")
            overall_status = "PARTIAL"
        else:
            self.logger.info("❌ PRODUCTION DEV AGENT TEST SUITE FAILED")
            overall_status = "FAILED"
        
        # Save test results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = self.claude_dir / f"production-dev-agent-test-results-{timestamp}.json"
        
        test_summary = {
            "overall_status": overall_status,
            "success_rate": success_rate,
            "timestamp": datetime.now().isoformat(),
            "test_results": self.test_results
        }
        
        with open(results_file, 'w') as f:
            json.dump(test_summary, f, indent=2)
        
        self.logger.info(f"\nTest results saved: {results_file}")
        
        return test_summary


def main():
    """Main entry point for testing"""
    tester = ProductionDevAgentTester()
    results = tester.run_comprehensive_test()
    
    if results["overall_status"] == "PASSED":
        sys.exit(0)
    elif results["overall_status"] == "PARTIAL":
        sys.exit(1)
    else:
        sys.exit(2)


if __name__ == "__main__":
    main()