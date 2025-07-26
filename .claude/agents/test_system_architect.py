#!/usr/bin/env python3
"""
Test Suite for System Architect Agent Integration

This module provides comprehensive testing for the System Architect Agent,
including integration tests, trigger validation, and end-to-end workflow testing.
"""

import os
import sys
import json
import time
import logging
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import tempfile
import shutil
from datetime import datetime
import unittest
from unittest.mock import Mock, patch, MagicMock

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Import agent modules
from .system_architect_agent import SystemArchitectAgent, ArchitecturalEvent
from .architectural_patterns import ArchitecturalPatternAnalyzer
from .bookedbarber_architecture_templates import BookedBarberArchitecturalTemplates
from .architecture_documentation import ArchitectureDocumentationGenerator
from .architecture_monitoring import ArchitecturalMonitoringService
from .safety_mechanisms import SafetyManager

class SystemArchitectAgentTest(unittest.TestCase):
    """
    Test cases for System Architect Agent
    """
    
    def setUp(self):
        """Setup test environment"""
        self.test_dir = Path(tempfile.mkdtemp())
        self.agent = SystemArchitectAgent()
        self.agent.project_root = self.test_dir
        
        # Create test directory structure
        self._create_test_structure()
        
        # Setup logging
        logging.basicConfig(level=logging.DEBUG)
        self.logger = logging.getLogger("SystemArchitectAgentTest")
    
    def tearDown(self):
        """Cleanup test environment"""
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
    
    def _create_test_structure(self):
        """Create test directory structure"""
        # Create backend-v2 structure
        backend_dir = self.test_dir / "backend-v2"
        backend_dir.mkdir(parents=True)
        
        # Create layer directories
        for layer in ["api", "services", "models", "middleware"]:
            layer_dir = backend_dir / layer
            layer_dir.mkdir()
            
            # Create sample files
            if layer == "api":
                (layer_dir / "v2").mkdir()
                (layer_dir / "v2" / "booking.py").write_text("# Booking API endpoints")
                (layer_dir / "v2" / "payment.py").write_text("# Payment API endpoints")
            elif layer == "services":
                (layer_dir / "booking_service.py").write_text("# Booking service")
                (layer_dir / "payment_service.py").write_text("# Payment service")
            elif layer == "models":
                (layer_dir / "appointment.py").write_text("# Appointment model")
                (layer_dir / "payment.py").write_text("# Payment model")
            elif layer == "middleware":
                (layer_dir / "auth.py").write_text("# Authentication middleware")
        
        # Create frontend-v2 structure
        frontend_dir = backend_dir / "frontend-v2"
        frontend_dir.mkdir()
        
        for layer in ["app", "components", "lib"]:
            layer_dir = frontend_dir / layer
            layer_dir.mkdir()
            
            if layer == "components":
                (layer_dir / "BookingForm.tsx").write_text("// Booking form component")
                (layer_dir / "PaymentForm.tsx").write_text("// Payment form component")
        
        # Create .claude directory
        claude_dir = self.test_dir / ".claude"
        claude_dir.mkdir()
    
    def test_agent_initialization(self):
        """Test agent initialization"""
        self.assertIsNotNone(self.agent)
        self.assertTrue(self.agent.project_root.exists())
        self.assertTrue(self.agent.log_file.parent.exists())
    
    def test_trigger_detection(self):
        """Test architectural event trigger detection"""
        # Create test event data
        event_data = {
            "changed_files": [
                "backend-v2/api/v2/booking.py",
                "backend-v2/services/booking_service.py",
                "backend-v2/models/appointment.py"
            ],
            "new_files": [
                "backend-v2/api/v2/analytics.py",
                "backend-v2/services/analytics_service.py"
            ],
            "error_patterns": [],
            "performance_metrics": {"response_time_ms": 800}
        }
        
        should_trigger, event_type = self.agent.should_trigger(event_data)
        
        self.assertTrue(should_trigger)
        self.assertIsNotNone(event_type)
        self.logger.info(f"Detected event type: {event_type}")
    
    def test_architectural_analysis(self):
        """Test architectural analysis execution"""
        # Create test event
        event_type = ArchitecturalEvent.API_DESIGN_REVIEW
        event_data = {
            "changed_files": ["backend-v2/api/v2/booking.py"],
            "new_files": ["backend-v2/api/v2/analytics.py"],
            "error_patterns": [],
            "performance_metrics": {}
        }
        
        # Run analysis
        analysis = self.agent.analyze_architecture(event_type, event_data)
        
        self.assertIsNotNone(analysis)
        self.assertEqual(analysis.event_type, event_type)
        self.assertGreater(len(analysis.system_components), 0)
        self.assertGreater(len(analysis.recommendations), 0)
        self.logger.info(f"Analysis completed with {len(analysis.recommendations)} recommendations")
    
    def test_six_figure_barber_alignment(self):
        """Test Six Figure Barber methodology alignment"""
        event_data = {
            "changed_files": [
                "backend-v2/services/booking_service.py",
                "backend-v2/models/commission.py",
                "backend-v2/api/v2/analytics.py"
            ],
            "new_files": [],
            "error_patterns": [],
            "performance_metrics": {}
        }
        
        alignment = self.agent._check_six_figure_barber_alignment(
            ArchitecturalEvent.MAJOR_FEATURE_ADDITION, 
            event_data
        )
        
        self.assertIn("alignment", alignment.lower())
        self.logger.info(f"Six Figure Barber alignment: {alignment}")
    
    def test_component_detection(self):
        """Test system component detection"""
        components = self.agent._analyze_system_components()
        
        self.assertGreater(len(components), 0)
        self.assertTrue(any("api" in comp.lower() for comp in components))
        self.assertTrue(any("service" in comp.lower() for comp in components))
        self.logger.info(f"Detected {len(components)} system components")

class ArchitecturalPatternsTest(unittest.TestCase):
    """
    Test cases for Architectural Pattern Analysis
    """
    
    def setUp(self):
        """Setup test environment"""
        self.test_dir = Path(tempfile.mkdtemp())
        self.analyzer = ArchitecturalPatternAnalyzer(self.test_dir)
        
        # Create test structure
        self._create_test_structure()
    
    def tearDown(self):
        """Cleanup test environment"""
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
    
    def _create_test_structure(self):
        """Create test structure for pattern analysis"""
        backend_dir = self.test_dir / "backend-v2"
        backend_dir.mkdir(parents=True)
        
        # Create clean architecture structure
        for layer in ["api", "services", "models", "middleware"]:
            layer_dir = backend_dir / layer
            layer_dir.mkdir()
            (layer_dir / f"{layer}_file.py").write_text(f"# {layer} implementation")
    
    def test_clean_architecture_detection(self):
        """Test clean architecture pattern detection"""
        analysis = self.analyzer._analyze_clean_architecture()
        
        self.assertIsNotNone(analysis)
        self.assertGreater(analysis.confidence, 0.5)
        self.assertGreater(len(analysis.evidence), 0)
    
    def test_pattern_analysis_execution(self):
        """Test pattern analysis execution"""
        patterns = self.analyzer.analyze_all_patterns()
        
        self.assertGreater(len(patterns), 0)
        self.assertIn("clean_architecture", [p.value for p in patterns.keys()])
    
    def test_code_metrics_calculation(self):
        """Test code metrics calculation"""
        metrics = self.analyzer.calculate_code_metrics()
        
        self.assertIsNotNone(metrics)
        self.assertGreaterEqual(metrics.total_files, 0)
        self.assertGreaterEqual(metrics.complexity_score, 0.0)

class ArchitecturalTemplatesTest(unittest.TestCase):
    """
    Test cases for BookedBarber Architectural Templates
    """
    
    def setUp(self):
        """Setup test environment"""
        self.templates = BookedBarberArchitecturalTemplates()
    
    def test_template_initialization(self):
        """Test template system initialization"""
        self.assertIsNotNone(self.templates)
        self.assertGreater(len(self.templates.templates), 0)
    
    def test_booking_engine_template(self):
        """Test booking engine template"""
        from .bookedbarber_architecture_templates import BusinessDomain
        
        template = self.templates.get_template(BusinessDomain.BOOKING_ENGINE)
        
        self.assertIsNotNone(template)
        self.assertEqual(template.domain, BusinessDomain.BOOKING_ENGINE)
        self.assertGreater(len(template.principles), 0)
        self.assertIn("structure", template.structure)
    
    def test_implementation_checklist(self):
        """Test implementation checklist generation"""
        from .bookedbarber_architecture_templates import BusinessDomain
        
        checklist = self.templates.generate_implementation_checklist(BusinessDomain.PAYMENT_PROCESSING)
        
        self.assertIsNotNone(checklist)
        self.assertGreater(len(checklist), 0)
        self.assertTrue(any("Implementation Checklist" in item for item in checklist))
    
    def test_architecture_compliance(self):
        """Test architecture compliance validation"""
        from .bookedbarber_architecture_templates import BusinessDomain
        
        implementation_data = {
            "has_api_layer": True,
            "has_service_layer": True,
            "has_database_layer": True
        }
        
        compliance = self.templates.validate_architecture_compliance(
            BusinessDomain.USER_MANAGEMENT, 
            implementation_data
        )
        
        self.assertIsNotNone(compliance)
        self.assertIn("valid", compliance)
        self.assertIn("score", compliance)

class DocumentationGenerationTest(unittest.TestCase):
    """
    Test cases for Architecture Documentation Generation
    """
    
    def setUp(self):
        """Setup test environment"""
        self.test_dir = Path(tempfile.mkdtemp())
        self.doc_generator = ArchitectureDocumentationGenerator(self.test_dir)
    
    def tearDown(self):
        """Cleanup test environment"""
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
    
    def test_system_overview_generation(self):
        """Test system overview documentation generation"""
        doc_file = self.doc_generator.generate_system_overview_documentation()
        
        self.assertTrue(Path(doc_file).exists())
        self.assertGreater(Path(doc_file).stat().st_size, 1000)  # Should be substantial
    
    def test_api_documentation_generation(self):
        """Test API documentation generation"""
        api_doc = self.doc_generator.generate_api_documentation()
        
        self.assertTrue(Path(api_doc).exists())
        
        # Check content
        with open(api_doc, 'r') as f:
            content = f.read()
            self.assertIn("API Documentation", content)
            self.assertIn("/api/v2", content)
    
    def test_diagram_generation(self):
        """Test architecture diagram generation"""
        diagram = self.doc_generator._generate_system_context_diagram()
        
        self.assertIsNotNone(diagram)
        self.assertIn("mermaid", diagram.mermaid_content)
        self.assertIn("BookedBarber", diagram.mermaid_content)
    
    def test_component_diagram_generation(self):
        """Test component diagram generation"""
        diagram = self.doc_generator.generate_component_diagram("booking_engine")
        
        self.assertIsNotNone(diagram)
        self.assertIn("Component Architecture", diagram.title)
    
    def test_sequence_diagram_generation(self):
        """Test sequence diagram generation"""
        diagram = self.doc_generator.generate_sequence_diagram("booking_flow")
        
        self.assertIsNotNone(diagram)
        self.assertIn("sequenceDiagram", diagram.mermaid_content)

class SafetyMechanismsTest(unittest.TestCase):
    """
    Test cases for Safety Mechanisms
    """
    
    def setUp(self):
        """Setup test environment"""
        self.test_dir = Path(tempfile.mkdtemp())
        self.safety_manager = SafetyManager(self.test_dir)
    
    def tearDown(self):
        """Cleanup test environment"""
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
    
    def test_safety_manager_initialization(self):
        """Test safety manager initialization"""
        self.assertIsNotNone(self.safety_manager)
        self.assertTrue(self.safety_manager.config["enabled"])
    
    def test_emergency_stop_mechanism(self):
        """Test emergency stop mechanism"""
        # Trigger emergency stop
        self.safety_manager.trigger_emergency_stop("Test emergency stop")
        
        self.assertTrue(self.safety_manager.check_emergency_stop())
        self.assertTrue(self.safety_manager.emergency_stop_file.exists())
        
        # Clear emergency stop
        self.safety_manager.clear_emergency_stop()
        self.assertFalse(self.safety_manager.check_emergency_stop())
    
    def test_protected_path_validation(self):
        """Test protected path validation"""
        # Test protected path
        is_protected = self.safety_manager.is_path_protected(".git/config")
        self.assertTrue(is_protected)
        
        # Test normal path
        is_protected = self.safety_manager.is_path_protected("backend-v2/services/test.py")
        self.assertFalse(is_protected)
    
    def test_dangerous_operation_detection(self):
        """Test dangerous operation detection"""
        # Test dangerous operation
        is_dangerous = self.safety_manager.is_operation_dangerous("rm -rf /")
        self.assertTrue(is_dangerous)
        
        # Test safe operation
        is_dangerous = self.safety_manager.is_operation_dangerous("create file")
        self.assertFalse(is_dangerous)
    
    def test_safe_execution_context(self):
        """Test safe execution context manager"""
        with self.safety_manager.safe_execution("test_execution"):
            # Simulate some work
            time.sleep(0.1)
        
        # Check that execution was recorded
        history = self.safety_manager.get_execution_history(1)
        self.assertGreater(len(history), 0)

class IntegrationTest(unittest.TestCase):
    """
    Integration tests for the complete System Architect Agent workflow
    """
    
    def setUp(self):
        """Setup integration test environment"""
        self.test_dir = Path(tempfile.mkdtemp())
        self._create_complete_test_structure()
        
        # Initialize all components
        self.agent = SystemArchitectAgent()
        self.agent.project_root = self.test_dir
        self.safety_manager = SafetyManager(self.test_dir)
        self.doc_generator = ArchitectureDocumentationGenerator(self.test_dir)
    
    def tearDown(self):
        """Cleanup integration test environment"""
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
    
    def _create_complete_test_structure(self):
        """Create complete test project structure"""
        # Create BookedBarber V2 project structure
        backend_dir = self.test_dir / "backend-v2"
        backend_dir.mkdir(parents=True)
        
        # Create all required directories and files
        structure = {
            "api/v2": ["booking.py", "payment.py", "user.py", "analytics.py"],
            "services": ["booking_service.py", "payment_service.py", "user_service.py"],
            "models": ["appointment.py", "payment.py", "user.py", "barbershop.py"],
            "middleware": ["auth.py", "security.py", "logging.py"],
            "tests": ["test_booking.py", "test_payment.py"]
        }
        
        for dir_path, files in structure.items():
            dir_full_path = backend_dir / dir_path
            dir_full_path.mkdir(parents=True, exist_ok=True)
            
            for file_name in files:
                file_path = dir_full_path / file_name
                file_path.write_text(f"# {file_name} implementation\nclass {file_name.split('.')[0].title()}:\n    pass\n")
        
        # Create frontend structure
        frontend_dir = backend_dir / "frontend-v2"
        frontend_structure = {
            "app": ["layout.tsx", "page.tsx"],
            "components": ["BookingForm.tsx", "PaymentForm.tsx", "Dashboard.tsx"],
            "lib": ["api.ts", "utils.ts"]
        }
        
        for dir_path, files in frontend_structure.items():
            dir_full_path = frontend_dir / dir_path
            dir_full_path.mkdir(parents=True, exist_ok=True)
            
            for file_name in files:
                file_path = dir_full_path / file_name
                file_path.write_text(f"// {file_name} implementation\nexport default function {file_name.split('.')[0]}() {{}}\n")
        
        # Create main.py
        main_file = backend_dir / "main.py"
        main_file.write_text("""
from fastapi import FastAPI

app = FastAPI(title="BookedBarber V2", version="2.0.0")

@app.get("/")
def read_root():
    return {"message": "BookedBarber V2 API"}
""")
        
        # Create .claude directory
        claude_dir = self.test_dir / ".claude"
        claude_dir.mkdir()
    
    def test_complete_architectural_analysis_workflow(self):
        """Test complete architectural analysis workflow"""
        # Simulate major feature addition
        event_data = {
            "changed_files": [
                "backend-v2/api/v2/analytics.py",
                "backend-v2/services/analytics_service.py",
                "backend-v2/models/analytics.py"
            ],
            "new_files": [
                "backend-v2/api/v2/reporting.py",
                "backend-v2/services/reporting_service.py"
            ],
            "error_patterns": [],
            "performance_metrics": {"response_time_ms": 600}
        }
        
        # Test trigger detection
        should_trigger, event_type = self.agent.should_trigger(event_data)
        self.assertTrue(should_trigger)
        
        # Test analysis execution with safety
        with self.safety_manager.safe_execution("integration_test"):
            analysis = self.agent.analyze_architecture(event_type, event_data)
            
            self.assertIsNotNone(analysis)
            self.assertGreater(len(analysis.system_components), 0)
            self.assertGreater(len(analysis.recommendations), 0)
            self.assertIn("Six Figure Barber", analysis.six_figure_barber_alignment)
        
        # Test documentation generation
        docs = self.doc_generator.generate_all_documentation()
        self.assertGreater(len(docs), 0)
        
        # Verify all generated files exist
        for doc_file in docs:
            self.assertTrue(Path(doc_file).exists())
    
    def test_end_to_end_agent_execution(self):
        """Test end-to-end agent execution"""
        # Create event data for comprehensive test
        event_data = {
            "changed_files": [
                "backend-v2/api/v2/booking.py",
                "backend-v2/services/booking_service.py",
                "backend-v2/models/appointment.py",
                "backend-v2/frontend-v2/components/BookingForm.tsx"
            ],
            "new_files": [
                "backend-v2/api/v2/commission.py",
                "backend-v2/services/commission_service.py"
            ],
            "error_patterns": ["ImportError: No module named booking"],
            "performance_metrics": {
                "response_time_ms": 1200,
                "memory_usage_mb": 256,
                "cpu_usage_percent": 45
            }
        }
        
        # Execute complete agent workflow
        should_trigger, event_type = self.agent.should_trigger(event_data)
        self.assertTrue(should_trigger)
        
        analysis = self.agent.analyze_architecture(event_type, event_data)
        
        # Verify comprehensive analysis
        self.assertIsNotNone(analysis)
        self.assertIn("booking", analysis.analysis_summary.lower())
        self.assertGreater(len(analysis.affected_services), 0)
        self.assertGreater(len(analysis.architectural_patterns), 0)
        self.assertGreater(len(analysis.recommendations), 5)
        
        # Verify Six Figure Barber alignment
        self.assertIn("barber", analysis.six_figure_barber_alignment.lower())
        
        # Verify documentation generation
        system_doc = self.doc_generator.generate_system_overview_documentation()
        self.assertTrue(Path(system_doc).exists())
        
        api_doc = self.doc_generator.generate_api_documentation()
        self.assertTrue(Path(api_doc).exists())

def run_performance_test():
    """Run performance test for the System Architect Agent"""
    test_dir = Path(tempfile.mkdtemp())
    
    try:
        # Create large test structure
        backend_dir = test_dir / "backend-v2"
        backend_dir.mkdir(parents=True)
        
        # Create many files to test scalability
        for i in range(100):
            api_file = backend_dir / f"api/endpoint_{i}.py"
            api_file.parent.mkdir(parents=True, exist_ok=True)
            api_file.write_text(f"# API endpoint {i}")
        
        # Initialize agent
        agent = SystemArchitectAgent()
        agent.project_root = test_dir
        
        # Measure analysis performance
        start_time = time.time()
        
        event_data = {
            "changed_files": [str(f) for f in backend_dir.glob("**/*.py")],
            "new_files": [],
            "error_patterns": [],
            "performance_metrics": {}
        }
        
        should_trigger, event_type = agent.should_trigger(event_data)
        
        if should_trigger:
            analysis = agent.analyze_architecture(event_type, event_data)
        
        execution_time = time.time() - start_time
        
        print(f"Performance Test Results:")
        print(f"  Files analyzed: {len(event_data['changed_files'])}")
        print(f"  Execution time: {execution_time:.2f} seconds")
        print(f"  Trigger detected: {should_trigger}")
        print(f"  Event type: {event_type}")
        
        if execution_time > 30:  # Should complete within 30 seconds
            print("WARNING: Performance test exceeded expected time limit")
        else:
            print("✅ Performance test passed")
    
    finally:
        shutil.rmtree(test_dir)

def main():
    """
    Run all tests for the System Architect Agent
    """
    print("🏗️  System Architect Agent Test Suite")
    print("=" * 50)
    
    # Run unit tests
    test_suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        SystemArchitectAgentTest,
        ArchitecturalPatternsTest,
        ArchitecturalTemplatesTest,
        DocumentationGenerationTest,
        SafetyMechanismsTest,
        IntegrationTest
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.failures:
        print("\nFailures:")
        for test, traceback in result.failures:
            print(f"  {test}: {traceback}")
    
    if result.errors:
        print("\nErrors:")
        for test, traceback in result.errors:
            print(f"  {test}: {traceback}")
    
    # Run performance test
    print("\n🚀 Running Performance Test...")
    run_performance_test()
    
    # Overall result
    if result.wasSuccessful():
        print("\n✅ All tests passed! System Architect Agent is ready for deployment.")
        return 0
    else:
        print("\n❌ Some tests failed. Please review the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())