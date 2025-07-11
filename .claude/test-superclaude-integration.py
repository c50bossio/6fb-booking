#!/usr/bin/env python3
"""
SuperClaude Integration Testing & Optimization Suite
Comprehensive testing of automatic command selection and optimization
"""

import os
import sys
import json
import yaml
from datetime import datetime
from typing import List, Dict, Tuple

# Import our systems
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util

# Import smart routing
spec = importlib.util.spec_from_file_location("smart_routing", ".claude/smart-routing.py")
smart_routing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smart_routing)

# Import BookedBarber integration
spec = importlib.util.spec_from_file_location("bb_superclaude", ".claude/bookedbarber-superclaude.py")
bb_superclaude = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bb_superclaude)

class SuperClaudeIntegrationTester:
    def __init__(self):
        self.project_root = "/Users/bossio/6fb-booking"
        self.router = smart_routing.SuperClaudeRouter()
        self.bb_integration = bb_superclaude.BookedBarberSuperClaude()
        
        # Test scenarios for different contexts
        self.test_scenarios = self._load_test_scenarios()
        self.test_results = []
        
    def _load_test_scenarios(self) -> List[Dict]:
        """Load comprehensive test scenarios"""
        return [
            # Backend Development Scenarios
            {
                "category": "backend_development",
                "task": "Fix authentication bug in payment system",
                "files": ["backend-v2/routers/auth.py", "backend-v2/routers/payments.py"],
                "expected_persona": "--persona-security",
                "expected_mcp": ["sequential-thinking", "context7"],
                "6fb_context": "payment_processing"
            },
            {
                "category": "backend_development", 
                "task": "Optimize database queries for appointment booking",
                "files": ["backend-v2/models/appointment.py", "backend-v2/services/booking_service.py"],
                "expected_persona": "--persona-performance",
                "expected_mcp": ["puppeteer", "sequential-thinking"],
                "6fb_context": "booking_system"
            },
            {
                "category": "backend_development",
                "task": "Add new API endpoint for client management",
                "files": ["backend-v2/routers/clients.py"],
                "expected_persona": "--persona-backend",
                "expected_mcp": ["context7"],
                "6fb_context": "client_management"
            },
            
            # Frontend Development Scenarios
            {
                "category": "frontend_development",
                "task": "Create new React component for booking calendar",
                "files": ["backend-v2/frontend-v2/components/Calendar.tsx"],
                "expected_persona": "--persona-frontend",
                "expected_mcp": ["magic-mcp", "context7"],
                "6fb_context": "booking_system"
            },
            {
                "category": "frontend_development",
                "task": "Build dashboard for analytics and reporting",
                "files": ["backend-v2/frontend-v2/app/analytics/page.tsx"],
                "expected_persona": "--persona-frontend",
                "expected_mcp": ["magic-mcp"],
                "6fb_context": "analytics_dashboard"
            },
            {
                "category": "frontend_development",
                "task": "Improve UI responsiveness and performance",
                "files": ["backend-v2/frontend-v2/components/ui/Dashboard.tsx"],
                "expected_persona": "--persona-performance",
                "expected_mcp": ["puppeteer"],
                "6fb_context": "client_management"
            },
            
            # Security Scenarios
            {
                "category": "security",
                "task": "Security audit of Stripe payment integration",
                "files": ["backend-v2/services/stripe_service.py", "backend-v2/routers/payments.py"],
                "expected_persona": "--persona-security",
                "expected_mcp": ["context7", "sequential-thinking"],
                "6fb_context": "payment_processing"
            },
            {
                "category": "security",
                "task": "Review authentication flow for vulnerabilities",
                "files": ["backend-v2/middleware/auth.py", "backend-v2/routers/auth.py"],
                "expected_persona": "--persona-security",
                "expected_mcp": ["context7"],
                "6fb_context": "client_management"
            },
            
            # Performance Scenarios
            {
                "category": "performance",
                "task": "Optimize slow loading dashboard pages",
                "files": ["backend-v2/frontend-v2/app/dashboard/page.tsx"],
                "expected_persona": "--persona-performance",
                "expected_mcp": ["puppeteer", "sequential-thinking"],
                "6fb_context": "analytics_dashboard"
            },
            {
                "category": "performance",
                "task": "Improve API response times for booking endpoints",
                "files": ["backend-v2/routers/bookings.py", "backend-v2/services/booking_service.py"],
                "expected_persona": "--persona-performance",
                "expected_mcp": ["sequential-thinking"],
                "6fb_context": "booking_system"
            },
            
            # Architecture & Design Scenarios
            {
                "category": "architecture",
                "task": "Design microservices architecture for scalability",
                "files": ["backend-v2/services/", "backend-v2/api/"],
                "expected_persona": "--persona-architect",
                "expected_mcp": ["sequential-thinking", "context7"],
                "6fb_context": "analytics_dashboard"
            },
            {
                "category": "architecture",
                "task": "Refactor payment system for better maintainability",
                "files": ["backend-v2/services/payment_service.py"],
                "expected_persona": "--persona-refactorer",
                "expected_mcp": ["sequential-thinking"],
                "6fb_context": "payment_processing"
            },
            
            # Marketing Integration Scenarios
            {
                "category": "marketing",
                "task": "Integrate Google My Business API for review management",
                "files": ["backend-v2/services/gmb_service.py", "backend-v2/routers/marketing.py"],
                "expected_persona": "--persona-backend",
                "expected_mcp": ["context7", "sequential-thinking"],
                "6fb_context": "marketing_integrations"
            },
            {
                "category": "marketing",
                "task": "Build automated email marketing workflows",
                "files": ["backend-v2/services/email_service.py"],
                "expected_persona": "--persona-backend",
                "expected_mcp": ["context7"],
                "6fb_context": "marketing_integrations"
            }
        ]
    
    def run_comprehensive_tests(self) -> Dict:
        """Run comprehensive tests on all scenarios"""
        print("🧪 Running SuperClaude Integration Tests...")
        print(f"   Testing {len(self.test_scenarios)} scenarios")
        print()
        
        results = {
            "total_tests": len(self.test_scenarios),
            "passed_tests": 0,
            "failed_tests": 0,
            "accuracy_scores": [],
            "performance_metrics": [],
            "category_performance": {},
            "detailed_results": []
        }
        
        for i, scenario in enumerate(self.test_scenarios, 1):
            print(f"   Test {i}/{len(self.test_scenarios)}: {scenario['category']}")
            
            test_result = self._run_single_test(scenario)
            results["detailed_results"].append(test_result)
            
            if test_result["passed"]:
                results["passed_tests"] += 1
                print(f"   ✅ PASSED (accuracy: {test_result['accuracy']:.1f}%)")
            else:
                results["failed_tests"] += 1
                print(f"   ❌ FAILED (accuracy: {test_result['accuracy']:.1f}%)")
                print(f"      Expected: {test_result['expected']}")
                print(f"      Got: {test_result['actual']}")
            
            results["accuracy_scores"].append(test_result["accuracy"])
            
            # Track category performance
            category = scenario["category"]
            if category not in results["category_performance"]:
                results["category_performance"][category] = {"total": 0, "passed": 0}
            results["category_performance"][category]["total"] += 1
            if test_result["passed"]:
                results["category_performance"][category]["passed"] += 1
        
        # Calculate overall metrics
        results["overall_accuracy"] = sum(results["accuracy_scores"]) / len(results["accuracy_scores"])
        results["pass_rate"] = (results["passed_tests"] / results["total_tests"]) * 100
        
        return results
    
    def _run_single_test(self, scenario: Dict) -> Dict:
        """Run a single test scenario"""
        start_time = datetime.now()
        
        # Test smart router
        router_context = self.router.analyze_context(
            file_paths=scenario["files"],
            task_description=scenario["task"],
            current_directory=self.project_root
        )
        
        # Test BookedBarber integration
        bb_recommendation = self.bb_integration.get_6fb_aligned_command(
            task_description=scenario["task"],
            file_paths=scenario["files"]
        )
        
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds()
        
        # Evaluate results
        accuracy_score = self._calculate_accuracy(scenario, router_context, bb_recommendation)
        
        return {
            "scenario": scenario["task"][:50],
            "category": scenario["category"],
            "expected": scenario["expected_persona"],
            "actual": router_context.persona,
            "bb_command": bb_recommendation["command"],
            "accuracy": accuracy_score,
            "response_time": response_time,
            "passed": accuracy_score >= 70,  # 70% threshold for passing
            "6fb_alignment": bb_recommendation.get("methodology_alignment", ""),
            "business_score": bb_recommendation.get("business_impact", 0)
        }
    
    def _calculate_accuracy(self, scenario: Dict, router_result, bb_result) -> float:
        """Calculate accuracy score for test result"""
        score = 0
        max_score = 100
        
        # Persona matching (40 points)
        if scenario["expected_persona"] in router_result.persona:
            score += 40
        elif any(p in router_result.persona for p in ["--persona-backend", "--persona-frontend", "--persona-security"]):
            score += 20  # Partial credit for reasonable persona
        
        # MCP server matching (30 points)
        expected_mcp = set(scenario["expected_mcp"])
        actual_mcp = set(router_result.mcp_servers)
        mcp_overlap = len(expected_mcp.intersection(actual_mcp))
        mcp_score = (mcp_overlap / len(expected_mcp)) * 30 if expected_mcp else 0
        score += mcp_score
        
        # 6FB context detection (30 points)
        if scenario["6fb_context"] in bb_result.get("methodology_alignment", "").lower():
            score += 30
        elif bb_result.get("business_impact", 0) >= 7:  # High business impact
            score += 15
        
        return min(score, max_score)
    
    def run_performance_benchmarks(self) -> Dict:
        """Run performance benchmarks"""
        print("⚡ Running Performance Benchmarks...")
        
        # Test response times for different scenario complexities
        simple_scenarios = [s for s in self.test_scenarios if len(s["files"]) == 1]
        complex_scenarios = [s for s in self.test_scenarios if len(s["files"]) > 1]
        
        simple_times = []
        complex_times = []
        
        # Test simple scenarios
        for scenario in simple_scenarios[:5]:
            start_time = datetime.now()
            self.router.analyze_context(
                file_paths=scenario["files"],
                task_description=scenario["task"]
            )
            end_time = datetime.now()
            simple_times.append((end_time - start_time).total_seconds())
        
        # Test complex scenarios
        for scenario in complex_scenarios[:5]:
            start_time = datetime.now()
            self.router.analyze_context(
                file_paths=scenario["files"],
                task_description=scenario["task"]
            )
            end_time = datetime.now()
            complex_times.append((end_time - start_time).total_seconds())
        
        return {
            "simple_avg_time": sum(simple_times) / len(simple_times) if simple_times else 0,
            "complex_avg_time": sum(complex_times) / len(complex_times) if complex_times else 0,
            "cache_efficiency": len(self.router.cache) / max(len(simple_times) + len(complex_times), 1),
            "performance_grade": self._calculate_performance_grade(simple_times, complex_times)
        }
    
    def _calculate_performance_grade(self, simple_times: List[float], complex_times: List[float]) -> str:
        """Calculate performance grade"""
        avg_simple = sum(simple_times) / len(simple_times) if simple_times else 0
        avg_complex = sum(complex_times) / len(complex_times) if complex_times else 0
        
        if avg_simple <= 0.1 and avg_complex <= 0.3:
            return "A+ (Excellent)"
        elif avg_simple <= 0.2 and avg_complex <= 0.5:
            return "A (Very Good)"
        elif avg_simple <= 0.3 and avg_complex <= 0.8:
            return "B (Good)"
        else:
            return "C (Needs Optimization)"
    
    def optimize_trigger_conditions(self) -> Dict:
        """Optimize trigger conditions based on test results"""
        print("🔧 Optimizing Trigger Conditions...")
        
        # Analyze failed tests to identify optimization opportunities
        failed_tests = [r for r in self.test_results if not r["passed"]]
        
        optimizations = {
            "confidence_threshold_adjustments": {},
            "keyword_additions": {},
            "pattern_enhancements": {},
            "persona_mapping_improvements": {}
        }
        
        # Analyze patterns in failures
        for test in failed_tests:
            category = test["category"]
            
            # Suggest confidence threshold adjustments
            if test["accuracy"] < 50:
                optimizations["confidence_threshold_adjustments"][category] = "Lower threshold to 0.4"
            
            # Suggest keyword additions
            if "security" in test["scenario"] and test["actual"] != "--persona-security":
                optimizations["keyword_additions"]["security"] = "Add more security-related keywords"
            
            if "performance" in test["scenario"] and test["actual"] != "--persona-performance":
                optimizations["keyword_additions"]["performance"] = "Add more performance-related keywords"
        
        return optimizations
    
    def generate_comprehensive_report(self) -> str:
        """Generate comprehensive test report"""
        
        # Run all tests
        test_results = self.run_comprehensive_tests()
        performance_results = self.run_performance_benchmarks()
        optimizations = self.optimize_trigger_conditions()
        
        # Get 6FB metrics
        bb_metrics = self.bb_integration.get_6fb_metrics()
        
        report = f"""
# SuperClaude Integration Test Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Test Results Summary
- **Total Tests**: {test_results['total_tests']}
- **Passed**: {test_results['passed_tests']} ✅
- **Failed**: {test_results['failed_tests']} ❌
- **Pass Rate**: {test_results['pass_rate']:.1f}%
- **Overall Accuracy**: {test_results['overall_accuracy']:.1f}%

## Performance Metrics
- **Simple Scenarios**: {performance_results['simple_avg_time']:.3f}s avg
- **Complex Scenarios**: {performance_results['complex_avg_time']:.3f}s avg
- **Cache Efficiency**: {performance_results['cache_efficiency']:.2f}
- **Performance Grade**: {performance_results['performance_grade']}

## Category Performance
"""
        
        for category, stats in test_results['category_performance'].items():
            success_rate = (stats['passed'] / stats['total']) * 100
            report += f"- **{category}**: {stats['passed']}/{stats['total']} ({success_rate:.1f}%)\n"
        
        report += f"""
## Six Figure Barber Methodology Alignment
- **6FB Alignment Percentage**: {bb_metrics.get('6fb_alignment_percentage', 0):.1f}%
- **High Impact Commands**: {bb_metrics.get('high_impact_commands', 0)}
- **Average Business Score**: {bb_metrics.get('average_business_score', 0):.1f}/10

## Optimization Recommendations
"""
        
        for category, recommendation in optimizations.get('confidence_threshold_adjustments', {}).items():
            report += f"- **{category}**: {recommendation}\n"
        
        report += """
## Detailed Test Results
"""
        
        for result in test_results['detailed_results'][:10]:  # Show first 10
            status = "✅ PASS" if result['passed'] else "❌ FAIL"
            report += f"""
### {result['scenario']}
- **Status**: {status} ({result['accuracy']:.1f}% accuracy)
- **Category**: {result['category']}
- **Expected Persona**: {result['expected']}
- **Actual Persona**: {result['actual']}
- **6FB Command**: {result['bb_command']}
- **Business Score**: {result['business_score']}/10
- **Response Time**: {result['response_time']:.3f}s
"""
        
        return report

def main():
    """Main testing interface"""
    tester = SuperClaudeIntegrationTester()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--report":
        # Generate comprehensive report
        report = tester.generate_comprehensive_report()
        
        # Save to file
        report_file = "/Users/bossio/6fb-booking/.claude/superclaude-test-report.md"
        with open(report_file, 'w') as f:
            f.write(report)
        
        print(f"📋 Comprehensive report saved to: {report_file}")
        print()
        print("📊 Test Summary:")
        
        # Run quick summary
        results = tester.run_comprehensive_tests()
        print(f"   Pass Rate: {results['pass_rate']:.1f}%")
        print(f"   Accuracy: {results['overall_accuracy']:.1f}%")
        
    else:
        # Interactive testing mode
        print("🧪 SuperClaude Integration Tester")
        print("Commands: test, performance, optimize, report, exit")
        
        while True:
            try:
                command = input("\n🔬 Command: ").strip().lower()
                
                if command in ['exit', 'quit', 'q']:
                    break
                elif command == 'test':
                    results = tester.run_comprehensive_tests()
                    print(f"\n📊 Results: {results['pass_rate']:.1f}% pass rate, {results['overall_accuracy']:.1f}% accuracy")
                elif command == 'performance':
                    results = tester.run_performance_benchmarks()
                    print(f"\n⚡ Performance: {results['performance_grade']}")
                elif command == 'optimize':
                    optimizations = tester.optimize_trigger_conditions()
                    print(f"\n🔧 Found {len(optimizations)} optimization opportunities")
                elif command == 'report':
                    report = tester.generate_comprehensive_report()
                    print("\n📋 Full report generated (see above)")
                    
            except KeyboardInterrupt:
                print("\n👋 Testing complete!")
                break

if __name__ == "__main__":
    main()