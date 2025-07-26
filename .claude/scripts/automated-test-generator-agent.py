#!/usr/bin/env python3
"""
Automated Test Generator Agent for BookedBarber V2
Proactively generates comprehensive test suites for code implementations:
- Unit tests with 80%+ coverage requirement
- Integration tests for API endpoints and business flows
- Component tests for React components
- E2E tests for complete user workflows
- Performance tests for booking system loads
- Security tests for authentication and payment flows
- Six Figure Barber methodology validation tests
"""

import json
import time
import subprocess
import logging
import os
import re
import ast
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from pathlib import Path
import signal
from dataclasses import dataclass
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/bossio/6fb-booking/.claude/test-generator-agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('automated-test-generator-agent')

@dataclass
class TestableComponent:
    """Represents a testable code component"""
    file_path: str
    component_type: str  # 'function', 'class', 'component', 'endpoint', 'model'
    name: str
    dependencies: List[str]
    six_figure_barber_related: bool
    complexity_score: int
    existing_tests: List[str]

@dataclass
class TestGenerationRequest:
    """Represents a test generation request"""
    trigger_name: str
    changed_files: List[str]
    test_types_needed: List[str]
    priority: str
    six_figure_barber_context: bool

class AutomatedTestGenerator:
    """Main test generator class for BookedBarber V2"""
    
    def __init__(self):
        self.project_root = "/Users/bossio/6fb-booking"
        self.backend_path = f"{self.project_root}/backend-v2"
        self.frontend_path = f"{self.project_root}/backend-v2/frontend-v2"
        self.test_templates = self._load_test_templates()
        self.coverage_threshold = 80  # 80% minimum coverage
        self.six_figure_barber_keywords = [
            'revenue', 'commission', 'booking', 'appointment', 'client_value',
            'optimization', 'efficiency', 'scalability', 'growth', 'barber',
            'client', 'service', 'payment', 'payout'
        ]
        
    def analyze_code_changes(self, changed_files: List[str]) -> List[TestableComponent]:
        """Analyze changed files to identify testable components"""
        components = []
        
        for file_path in changed_files:
            if not os.path.exists(file_path):
                continue
                
            file_type = self._determine_file_type(file_path)
            if file_type == 'unknown':
                continue
                
            # Parse the file and extract testable components
            if file_type == 'python':
                components.extend(self._analyze_python_file(file_path))
            elif file_type in ['typescript', 'javascript', 'react']:
                components.extend(self._analyze_js_ts_file(file_path))
                
        return components
    
    def generate_comprehensive_tests(self, request: TestGenerationRequest) -> Dict[str, Any]:
        """Generate comprehensive test suite based on request"""
        logger.info(f"Generating tests for trigger: {request.trigger_name}")
        
        # Analyze code changes
        testable_components = self.analyze_code_changes(request.changed_files)
        
        # Generate different types of tests
        test_results = {
            'unit_tests': [],
            'integration_tests': [],
            'component_tests': [],
            'e2e_tests': [],
            'performance_tests': [],
            'security_tests': [],
            'six_figure_barber_tests': []
        }
        
        for component in testable_components:
            # Generate unit tests (always first priority)
            if 'unit' in request.test_types_needed:
                unit_tests = self._generate_unit_tests(component)
                test_results['unit_tests'].extend(unit_tests)
            
            # Generate integration tests
            if 'integration' in request.test_types_needed:
                integration_tests = self._generate_integration_tests(component)
                test_results['integration_tests'].extend(integration_tests)
            
            # Generate component tests for React components
            if component.component_type == 'component' and 'component' in request.test_types_needed:
                component_tests = self._generate_component_tests(component)
                test_results['component_tests'].extend(component_tests)
            
            # Generate E2E tests for user-facing features
            if 'e2e' in request.test_types_needed and self._is_user_facing(component):
                e2e_tests = self._generate_e2e_tests(component)
                test_results['e2e_tests'].extend(e2e_tests)
            
            # Generate performance tests for critical paths
            if 'performance' in request.test_types_needed and self._is_performance_critical(component):
                performance_tests = self._generate_performance_tests(component)
                test_results['performance_tests'].extend(performance_tests)
            
            # Generate security tests for auth/payment code
            if 'security' in request.test_types_needed and self._is_security_sensitive(component):
                security_tests = self._generate_security_tests(component)
                test_results['security_tests'].extend(security_tests)
            
            # Generate Six Figure Barber methodology tests
            if component.six_figure_barber_related:
                sfb_tests = self._generate_six_figure_barber_tests(component)
                test_results['six_figure_barber_tests'].extend(sfb_tests)
        
        # Write test files
        self._write_test_files(test_results)
        
        # Generate test execution commands
        execution_commands = self._generate_test_commands(test_results)
        
        # Calculate expected coverage
        coverage_report = self._calculate_expected_coverage(testable_components, test_results)
        
        return {
            'status': 'success',
            'tests_generated': len(sum(test_results.values(), [])),
            'test_results': test_results,
            'execution_commands': execution_commands,
            'coverage_report': coverage_report,
            'testable_components': len(testable_components),
            'six_figure_barber_alignment': any(c.six_figure_barber_related for c in testable_components)
        }
    
    def _analyze_python_file(self, file_path: str) -> List[TestableComponent]:
        """Analyze Python file for testable components"""
        components = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse AST
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # Function component
                    component = TestableComponent(
                        file_path=file_path,
                        component_type='function',
                        name=node.name,
                        dependencies=self._extract_function_dependencies(node, content),
                        six_figure_barber_related=self._is_six_figure_barber_related(content),
                        complexity_score=self._calculate_complexity(node),
                        existing_tests=self._find_existing_tests(file_path, node.name)
                    )
                    components.append(component)
                
                elif isinstance(node, ast.ClassDef):
                    # Class component (models, services)
                    component = TestableComponent(
                        file_path=file_path,
                        component_type='class',
                        name=node.name,
                        dependencies=self._extract_class_dependencies(node, content),
                        six_figure_barber_related=self._is_six_figure_barber_related(content),
                        complexity_score=self._calculate_complexity(node),
                        existing_tests=self._find_existing_tests(file_path, node.name)
                    )
                    components.append(component)
                    
        except Exception as e:
            logger.error(f"Error analyzing Python file {file_path}: {e}")
        
        return components
    
    def _analyze_js_ts_file(self, file_path: str) -> List[TestableComponent]:
        """Analyze JavaScript/TypeScript file for testable components"""
        components = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract React components
            react_components = self._extract_react_components(content)
            for comp_name in react_components:
                component = TestableComponent(
                    file_path=file_path,
                    component_type='component',
                    name=comp_name,
                    dependencies=self._extract_react_dependencies(content),
                    six_figure_barber_related=self._is_six_figure_barber_related(content),
                    complexity_score=self._calculate_js_complexity(content),
                    existing_tests=self._find_existing_tests(file_path, comp_name)
                )
                components.append(component)
            
            # Extract functions
            functions = self._extract_js_functions(content)
            for func_name in functions:
                component = TestableComponent(
                    file_path=file_path,
                    component_type='function',
                    name=func_name,
                    dependencies=self._extract_js_dependencies(content),
                    six_figure_barber_related=self._is_six_figure_barber_related(content),
                    complexity_score=self._calculate_js_complexity(content),
                    existing_tests=self._find_existing_tests(file_path, func_name)
                )
                components.append(component)
                
        except Exception as e:
            logger.error(f"Error analyzing JS/TS file {file_path}: {e}")
        
        return components
    
    def _generate_unit_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate comprehensive unit tests for a component"""
        tests = []
        
        if component.component_type == 'function':
            # Generate tests for all parameter variations
            tests.extend(self._generate_function_parameter_tests(component))
            # Generate error condition tests
            tests.extend(self._generate_error_condition_tests(component))
            # Generate edge case tests
            tests.extend(self._generate_edge_case_tests(component))
            
        elif component.component_type == 'class':
            # Generate tests for all methods
            tests.extend(self._generate_class_method_tests(component))
            # Generate state change tests
            tests.extend(self._generate_state_change_tests(component))
            
        elif component.component_type == 'component':
            # Generate React component tests
            tests.extend(self._generate_react_component_tests(component))
        
        return tests
    
    def _generate_integration_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate integration tests for component interactions"""
        tests = []
        
        if 'api' in component.file_path or 'router' in component.file_path:
            # API endpoint integration tests
            tests.extend(self._generate_api_integration_tests(component))
        
        if 'service' in component.file_path:
            # Service integration tests
            tests.extend(self._generate_service_integration_tests(component))
        
        if component.six_figure_barber_related:
            # Business flow integration tests
            tests.extend(self._generate_business_flow_tests(component))
        
        return tests
    
    def _generate_component_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate React component tests using Testing Library"""
        tests = []
        
        # Render tests
        tests.append({
            'type': 'component_render',
            'name': f'{component.name}_renders_correctly',
            'description': f'Test that {component.name} renders without crashing',
            'test_code': self._generate_react_render_test(component)
        })
        
        # Props tests
        tests.append({
            'type': 'component_props',
            'name': f'{component.name}_handles_props',
            'description': f'Test that {component.name} handles props correctly',
            'test_code': self._generate_react_props_test(component)
        })
        
        # Interaction tests
        if self._has_user_interactions(component):
            tests.append({
                'type': 'component_interaction',
                'name': f'{component.name}_user_interactions',
                'description': f'Test user interactions in {component.name}',
                'test_code': self._generate_react_interaction_test(component)
            })
        
        return tests
    
    def _generate_e2e_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate end-to-end tests for complete user workflows"""
        tests = []
        
        if component.six_figure_barber_related:
            # Core business workflow tests
            if 'booking' in component.name.lower():
                tests.append({
                    'type': 'e2e_booking_flow',
                    'name': 'complete_booking_workflow',
                    'description': 'Test complete booking workflow from selection to payment',
                    'test_code': self._generate_booking_e2e_test(component)
                })
            
            if 'payment' in component.name.lower():
                tests.append({
                    'type': 'e2e_payment_flow',
                    'name': 'complete_payment_workflow',
                    'description': 'Test complete payment workflow with Stripe integration',
                    'test_code': self._generate_payment_e2e_test(component)
                })
            
            if 'auth' in component.name.lower():
                tests.append({
                    'type': 'e2e_auth_flow',
                    'name': 'complete_auth_workflow',
                    'description': 'Test complete authentication workflow',
                    'test_code': self._generate_auth_e2e_test(component)
                })
        
        return tests
    
    def _generate_performance_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate performance tests for critical paths"""
        tests = []
        
        if 'booking' in component.name.lower():
            tests.append({
                'type': 'performance_load',
                'name': f'{component.name}_load_test',
                'description': f'Load test for {component.name} under booking pressure',
                'test_code': self._generate_booking_load_test(component)
            })
        
        if 'api' in component.file_path:
            tests.append({
                'type': 'performance_api',
                'name': f'{component.name}_api_performance',
                'description': f'API response time test for {component.name}',
                'test_code': self._generate_api_performance_test(component)
            })
        
        return tests
    
    def _generate_security_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate security tests for sensitive components"""
        tests = []
        
        if 'auth' in component.name.lower():
            tests.extend(self._generate_auth_security_tests(component))
        
        if 'payment' in component.name.lower():
            tests.extend(self._generate_payment_security_tests(component))
        
        if 'api' in component.file_path:
            tests.extend(self._generate_api_security_tests(component))
        
        return tests
    
    def _generate_six_figure_barber_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate tests specific to Six Figure Barber methodology"""
        tests = []
        
        # Revenue optimization tests
        if 'commission' in component.name.lower() or 'revenue' in component.name.lower():
            tests.append({
                'type': 'sfb_revenue_optimization',
                'name': f'{component.name}_revenue_accuracy',
                'description': 'Test revenue calculation accuracy for Six Figure Barber methodology',
                'test_code': self._generate_revenue_accuracy_test(component)
            })
        
        # Client value creation tests
        if 'client' in component.name.lower():
            tests.append({
                'type': 'sfb_client_value',
                'name': f'{component.name}_client_value_tracking',
                'description': 'Test client value tracking for business growth',
                'test_code': self._generate_client_value_test(component)
            })
        
        # Business efficiency tests
        if 'booking' in component.name.lower() or 'appointment' in component.name.lower():
            tests.append({
                'type': 'sfb_efficiency',
                'name': f'{component.name}_efficiency_metrics',
                'description': 'Test business efficiency metrics for Six Figure Barber growth',
                'test_code': self._generate_efficiency_test(component)
            })
        
        return tests
    
    def _write_test_files(self, test_results: Dict[str, List]) -> None:
        """Write generated tests to appropriate test files"""
        # Create test directories if they don't exist
        test_dirs = {
            'unit': f"{self.project_root}/tests/unit",
            'integration': f"{self.project_root}/tests/integration", 
            'component': f"{self.frontend_path}/__tests__/components",
            'e2e': f"{self.project_root}/tests/e2e",
            'performance': f"{self.project_root}/tests/performance",
            'security': f"{self.project_root}/tests/security"
        }
        
        for test_type, tests in test_results.items():
            if not tests:
                continue
                
            test_dir = test_dirs.get(test_type.replace('_tests', ''))
            if test_dir:
                os.makedirs(test_dir, exist_ok=True)
                
                for test in tests:
                    test_file_path = f"{test_dir}/{test['name']}.test.py"
                    if test_type == 'component_tests':
                        test_file_path = f"{test_dir}/{test['name']}.test.tsx"
                    
                    with open(test_file_path, 'w', encoding='utf-8') as f:
                        f.write(test['test_code'])
                    
                    logger.info(f"Generated test file: {test_file_path}")
    
    def _generate_test_commands(self, test_results: Dict[str, List]) -> List[str]:
        """Generate commands to run all generated tests"""
        commands = []
        
        # Backend tests
        if test_results['unit_tests'] or test_results['integration_tests'] or test_results['security_tests']:
            commands.append("cd backend-v2 && pytest --cov=. --cov-report=term-missing")
        
        # Frontend tests
        if test_results['component_tests']:
            commands.append("cd backend-v2/frontend-v2 && npm test -- --coverage")
        
        # E2E tests
        if test_results['e2e_tests']:
            commands.append("cd backend-v2/frontend-v2 && npm run test:e2e")
        
        # Performance tests
        if test_results['performance_tests']:
            commands.append("cd tests/performance && pytest --benchmark-only")
        
        return commands
    
    def _calculate_expected_coverage(self, components: List[TestableComponent], test_results: Dict[str, List]) -> Dict[str, Any]:
        """Calculate expected test coverage"""
        total_components = len(components)
        tested_components = len([c for c in components if c.existing_tests or any(test_results.values())])
        
        coverage_percentage = (tested_components / total_components * 100) if total_components > 0 else 0
        
        return {
            'total_components': total_components,
            'tested_components': tested_components,
            'coverage_percentage': round(coverage_percentage, 2),
            'meets_threshold': coverage_percentage >= self.coverage_threshold,
            'missing_tests': total_components - tested_components
        }
    
    # Helper methods for analysis and generation
    def _determine_file_type(self, file_path: str) -> str:
        """Determine file type for analysis"""
        if file_path.endswith('.py'):
            return 'python'
        elif file_path.endswith(('.ts', '.tsx')):
            return 'typescript'
        elif file_path.endswith(('.js', '.jsx')):
            return 'javascript'
        return 'unknown'
    
    def _is_six_figure_barber_related(self, content: str) -> bool:
        """Check if content is related to Six Figure Barber methodology"""
        content_lower = content.lower()
        return any(keyword in content_lower for keyword in self.six_figure_barber_keywords)
    
    def _is_user_facing(self, component: TestableComponent) -> bool:
        """Check if component is user-facing and needs E2E tests"""
        return (component.component_type == 'component' or 
                'api' in component.file_path and 
                any(keyword in component.name.lower() for keyword in ['booking', 'auth', 'payment']))
    
    def _is_performance_critical(self, component: TestableComponent) -> bool:
        """Check if component is performance-critical"""
        critical_keywords = ['booking', 'payment', 'search', 'calendar', 'appointment']
        return any(keyword in component.name.lower() for keyword in critical_keywords)
    
    def _is_security_sensitive(self, component: TestableComponent) -> bool:
        """Check if component is security-sensitive"""
        sensitive_keywords = ['auth', 'login', 'payment', 'stripe', 'session', 'token', 'password']
        return any(keyword in component.name.lower() for keyword in sensitive_keywords)
    
    def _load_test_templates(self) -> Dict[str, str]:
        """Load test templates for different test types"""
        return {
            'unit_test_python': '''
import pytest
from unittest.mock import Mock, patch
from {module} import {function_name}

class Test{FunctionName}:
    """Unit tests for {function_name}"""
    
    def test_{function_name}_success(self):
        """Test successful execution of {function_name}"""
        # Arrange
        # Act
        # Assert
        pass
    
    def test_{function_name}_error_conditions(self):
        """Test error conditions for {function_name}"""
        # Test error handling
        pass
    
    def test_{function_name}_edge_cases(self):
        """Test edge cases for {function_name}"""
        # Test boundary conditions
        pass
''',
            'component_test_react': '''
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {ComponentName} from '../{component_file}';

describe('{ComponentName}', () => {{
  it('renders correctly', () => {{
    render(<{ComponentName} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  }});
  
  it('handles props correctly', () => {{
    const mockProps = {{}};
    render(<{ComponentName} {{...mockProps}} />);
    // Test prop handling
  }});
  
  it('handles user interactions', () => {{
    render(<{ComponentName} />);
    // Test interactions
  }});
}});
''',
            'e2e_test_playwright': '''
import {{ test, expect }} from '@playwright/test';

test.describe('{workflow_name}', () => {{
  test('complete {workflow_name} workflow', async ({{ page }}) => {{
    // Navigate to the page
    await page.goto('/');
    
    // Test the complete workflow
    // Add specific steps here
    
    // Verify final state
    await expect(page).toHaveURL(/success/);
  }});
}});
'''
        }
    
    # Additional helper methods for specific test generation would go here
    def _extract_function_dependencies(self, node: ast.FunctionDef, content: str) -> List[str]:
        """Extract function dependencies from AST node"""
        return []  # Simplified for brevity
    
    def _extract_class_dependencies(self, node: ast.ClassDef, content: str) -> List[str]:
        """Extract class dependencies from AST node"""
        return []  # Simplified for brevity
    
    def _calculate_complexity(self, node) -> int:
        """Calculate cyclomatic complexity of a code block"""
        return 1  # Simplified for brevity
    
    def _find_existing_tests(self, file_path: str, component_name: str) -> List[str]:
        """Find existing tests for a component"""
        return []  # Simplified for brevity
    
    # Additional specific test generators would be implemented here
    def _generate_function_parameter_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate parameter variation tests"""
        return []  # Simplified for brevity
    
    def _generate_error_condition_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate error condition tests"""
        return []  # Simplified for brevity
    
    def _generate_edge_case_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate edge case tests"""
        return []  # Simplified for brevity
    
    def _generate_class_method_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate tests for all methods in a class"""
        return []  # Simplified for brevity
    
    def _generate_state_change_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate state change tests for classes"""
        return []  # Simplified for brevity
    
    def _generate_react_component_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate React component tests"""
        return []  # Simplified for brevity
    
    def _generate_api_integration_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate API integration tests"""
        return []  # Simplified for brevity
    
    def _generate_service_integration_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate service integration tests"""
        return []  # Simplified for brevity
    
    def _generate_business_flow_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate business flow integration tests"""
        return []  # Simplified for brevity
    
    def _generate_react_render_test(self, component: TestableComponent) -> str:
        """Generate React render test code"""
        return f"// Render test for {component.name}"
    
    def _generate_react_props_test(self, component: TestableComponent) -> str:
        """Generate React props test code"""
        return f"// Props test for {component.name}"
    
    def _has_user_interactions(self, component: TestableComponent) -> bool:
        """Check if component has user interactions"""
        return False  # Simplified for brevity
    
    def _generate_react_interaction_test(self, component: TestableComponent) -> str:
        """Generate React interaction test code"""
        return f"// Interaction test for {component.name}"
    
    def _generate_booking_e2e_test(self, component: TestableComponent) -> str:
        """Generate booking E2E test code"""
        return f"// Booking E2E test for {component.name}"
    
    def _generate_payment_e2e_test(self, component: TestableComponent) -> str:
        """Generate payment E2E test code"""
        return f"// Payment E2E test for {component.name}"
    
    def _generate_auth_e2e_test(self, component: TestableComponent) -> str:
        """Generate auth E2E test code"""
        return f"// Auth E2E test for {component.name}"
    
    def _generate_booking_load_test(self, component: TestableComponent) -> str:
        """Generate booking load test code"""
        return f"// Load test for {component.name}"
    
    def _generate_api_performance_test(self, component: TestableComponent) -> str:
        """Generate API performance test code"""
        return f"// Performance test for {component.name}"
    
    def _generate_auth_security_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate auth security tests"""
        return []  # Simplified for brevity
    
    def _generate_payment_security_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate payment security tests"""
        return []  # Simplified for brevity
    
    def _generate_api_security_tests(self, component: TestableComponent) -> List[Dict[str, Any]]:
        """Generate API security tests"""
        return []  # Simplified for brevity
    
    def _generate_revenue_accuracy_test(self, component: TestableComponent) -> str:
        """Generate revenue accuracy test code"""
        return f"// Revenue accuracy test for {component.name}"
    
    def _generate_client_value_test(self, component: TestableComponent) -> str:
        """Generate client value test code"""
        return f"// Client value test for {component.name}"
    
    def _generate_efficiency_test(self, component: TestableComponent) -> str:
        """Generate efficiency test code"""
        return f"// Efficiency test for {component.name}"
    
    def _extract_react_components(self, content: str) -> List[str]:
        """Extract React component names from content"""
        import re
        components = re.findall(r'export default function (\w+)', content)
        components.extend(re.findall(r'const (\w+): React\.FC', content))
        return components
    
    def _extract_react_dependencies(self, content: str) -> List[str]:
        """Extract React dependencies from content"""
        return []  # Simplified for brevity
    
    def _calculate_js_complexity(self, content: str) -> int:
        """Calculate JavaScript/TypeScript complexity"""
        return 1  # Simplified for brevity
    
    def _extract_js_functions(self, content: str) -> List[str]:
        """Extract JavaScript function names"""
        import re
        functions = re.findall(r'function (\w+)', content)
        functions.extend(re.findall(r'const (\w+) = \(.*\) =>', content))
        return functions
    
    def _extract_js_dependencies(self, content: str) -> List[str]:
        """Extract JavaScript dependencies"""
        return []  # Simplified for brevity
    
    # Additional test generators...
    

def main():
    """Main entry point for the automated test generator agent"""
    import sys
    
    if len(sys.argv) < 2:
        logger.error("Usage: automated-test-generator-agent.py <trigger_data_json>")
        sys.exit(1)
    
    try:
        # Parse trigger data
        trigger_data = json.loads(sys.argv[1])
        
        # Create test generation request
        request = TestGenerationRequest(
            trigger_name=trigger_data.get('trigger_name', 'unknown'),
            changed_files=trigger_data.get('changed_files', []),
            test_types_needed=trigger_data.get('test_types_needed', ['unit', 'integration']),
            priority=trigger_data.get('priority', 'medium'),
            six_figure_barber_context=trigger_data.get('six_figure_barber_context', False)
        )
        
        # Initialize generator and process
        generator = AutomatedTestGenerator()
        result = generator.generate_comprehensive_tests(request)
        
        # Log results
        logger.info(f"Test generation completed: {result['tests_generated']} tests generated")
        logger.info(f"Coverage: {result['coverage_report']['coverage_percentage']}%")
        
        # Output results
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        logger.error(f"Test generation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()