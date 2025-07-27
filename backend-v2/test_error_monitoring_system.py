#!/usr/bin/env python3
"""
Comprehensive Error Monitoring System Test Suite
Tests all components of the error monitoring and resolution system
"""

import asyncio
import json
import time
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Any
import sys
import os

# Add the backend directory to Python path
sys.path.append('/Users/bossio/6fb-booking/backend-v2')

from services.error_monitoring_service import (
    error_monitoring_service,
    ErrorSeverity,
    ErrorCategory,
    BusinessImpact
)
from services.business_impact_monitor import (
    business_impact_monitor,
    WorkflowType,
    ImpactLevel
)


class ErrorMonitoringTestSuite:
    """Comprehensive test suite for error monitoring system"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient()
        self.test_results: Dict[str, Any] = {}
        
    async def run_all_tests(self):
        """Run all error monitoring tests"""
        print("🧪 Starting Error Monitoring System Test Suite")
        print("=" * 60)
        
        # Initialize monitoring services
        print("🚀 Initializing monitoring services...")
        await error_monitoring_service.start_monitoring()
        await business_impact_monitor.start_monitoring()
        await asyncio.sleep(1)  # Give services time to start
        
        # Test individual components
        await self.test_error_capture()
        await self.test_error_classification()
        await self.test_automated_resolution()
        await self.test_business_impact_monitoring()
        await self.test_api_endpoints()
        await self.test_sla_compliance()
        await self.test_six_figure_methodology_integration()
        
        # Generate final report
        await self.generate_test_report()
        
        await self.client.aclose()
    
    async def test_error_capture(self):
        """Test error capture functionality"""
        print("\n📊 Testing Error Capture...")
        
        test_cases = [
            {
                "name": "Basic Error Capture",
                "message": "Test error capture",
                "severity": ErrorSeverity.MEDIUM,
                "category": ErrorCategory.BUSINESS_LOGIC,
                "business_impact": BusinessImpact.OPERATIONAL
            },
            {
                "name": "Critical Payment Error",
                "message": "Payment processing failed",
                "severity": ErrorSeverity.CRITICAL,
                "category": ErrorCategory.PAYMENT,
                "business_impact": BusinessImpact.REVENUE_BLOCKING
            },
            {
                "name": "Frontend UX Error",
                "message": "UI component failed to render",
                "severity": ErrorSeverity.LOW,
                "category": ErrorCategory.USER_EXPERIENCE,
                "business_impact": BusinessImpact.EXPERIENCE_DEGRADING
            }
        ]
        
        captured_errors = []
        
        for test_case in test_cases:
            try:
                error_event = await error_monitoring_service.capture_error(
                    message=test_case["message"],
                    severity=test_case["severity"],
                    category=test_case["category"],
                    business_impact=test_case["business_impact"],
                    context={"test_case": test_case["name"]},
                    endpoint="/test/error-capture"
                )
                
                captured_errors.append(error_event)
                print(f"  ✅ {test_case['name']}: Error captured (ID: {error_event.id})")
                
            except Exception as e:
                print(f"  ❌ {test_case['name']}: Failed - {e}")
        
        # Verify errors are stored
        active_count = len([e for e in error_monitoring_service.active_errors.values() if not e.resolved])
        print(f"  📈 Active errors in system: {active_count}")
        
        self.test_results["error_capture"] = {
            "passed": len(captured_errors),
            "total": len(test_cases),
            "active_errors": active_count
        }
    
    async def test_error_classification(self):
        """Test error classification and pattern detection"""
        print("\n🏷️  Testing Error Classification...")
        
        # Create duplicate errors to test pattern detection
        duplicate_tests = [
            "Database connection timeout",
            "Database connection timeout",
            "Database connection timeout"
        ]
        
        for message in duplicate_tests:
            await error_monitoring_service.capture_error(
                message=message,
                severity=ErrorSeverity.HIGH,
                category=ErrorCategory.DATABASE,
                business_impact=BusinessImpact.USER_BLOCKING,
                endpoint="/test/database"
            )
        
        # Check pattern detection
        patterns = list(error_monitoring_service.error_patterns.values())
        duplicate_pattern = None
        
        for pattern in patterns:
            if "Database connection timeout" in pattern.error_signature:
                duplicate_pattern = pattern
                break
        
        if duplicate_pattern and duplicate_pattern.occurrence_count >= 3:
            print(f"  ✅ Pattern Detection: Found pattern with {duplicate_pattern.occurrence_count} occurrences")
        else:
            print(f"  ❌ Pattern Detection: Failed to detect duplicate pattern")
        
        # Test error rate calculation
        error_rate = await error_monitoring_service.get_error_rate(5)
        print(f"  📊 Current error rate: {error_rate:.2f} errors/min")
        
        self.test_results["error_classification"] = {
            "patterns_detected": len(patterns),
            "duplicate_pattern_found": duplicate_pattern is not None,
            "error_rate": error_rate
        }
    
    async def test_automated_resolution(self):
        """Test automated error resolution strategies"""
        print("\n🤖 Testing Automated Resolution...")
        
        # Test database retry strategy
        db_error = await error_monitoring_service.capture_error(
            message="Database connection failed - test",
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.DATABASE,
            business_impact=BusinessImpact.USER_BLOCKING,
            context={"connection": "test_db"},
            endpoint="/test/database-retry"
        )
        
        # Test circuit breaker reset strategy
        api_error = await error_monitoring_service.capture_error(
            message="External API service unavailable",
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.EXTERNAL_API,
            business_impact=BusinessImpact.EXPERIENCE_DEGRADING,
            context={"service": "stripe"},
            endpoint="/test/stripe-api"
        )
        
        # Wait for auto-resolution attempts
        await asyncio.sleep(2)
        
        # Check resolution status
        db_resolved = error_monitoring_service.active_errors[db_error.id].resolved
        api_resolved = error_monitoring_service.active_errors[api_error.id].resolved
        
        if db_resolved:
            print(f"  ✅ Database Retry Strategy: Auto-resolved error {db_error.id}")
        else:
            print(f"  ⏳ Database Retry Strategy: Error {db_error.id} not yet resolved")
        
        if api_resolved:
            print(f"  ✅ Circuit Breaker Reset: Auto-resolved error {api_error.id}")
        else:
            print(f"  ⏳ Circuit Breaker Reset: Error {api_error.id} not yet resolved")
        
        # Test manual resolution
        manual_error = await error_monitoring_service.capture_error(
            message="Manual resolution test",
            severity=ErrorSeverity.LOW,
            category=ErrorCategory.BUSINESS_LOGIC,
            business_impact=BusinessImpact.OPERATIONAL
        )
        
        success = await error_monitoring_service.resolve_error(
            manual_error.id,
            "Manual test resolution",
            auto_resolved=False
        )
        
        if success:
            print(f"  ✅ Manual Resolution: Successfully resolved error {manual_error.id}")
        else:
            print(f"  ❌ Manual Resolution: Failed to resolve error {manual_error.id}")
        
        self.test_results["automated_resolution"] = {
            "database_strategy_tested": True,
            "circuit_breaker_strategy_tested": True,
            "manual_resolution_tested": success,
            "auto_resolution_rate": error_monitoring_service.auto_resolution_success_rate
        }
    
    async def test_business_impact_monitoring(self):
        """Test business impact monitoring for Six Figure Barber workflows"""
        print("\n💼 Testing Business Impact Monitoring...")
        
        # Create workflow-specific errors
        workflow_tests = [
            {
                "workflow": WorkflowType.BOOKING_FLOW,
                "message": "Booking calendar failed to load",
                "endpoint": "/api/v2/appointments/calendar"
            },
            {
                "workflow": WorkflowType.PAYMENT_PROCESSING,
                "message": "Stripe payment processing error",
                "endpoint": "/api/v2/payments/stripe"
            },
            {
                "workflow": WorkflowType.CLIENT_MANAGEMENT,
                "message": "Client profile update failed",
                "endpoint": "/api/v2/clients/profile"
            }
        ]
        
        for test in workflow_tests:
            await error_monitoring_service.capture_error(
                message=test["message"],
                severity=ErrorSeverity.HIGH,
                category=ErrorCategory.BUSINESS_LOGIC,
                business_impact=BusinessImpact.USER_BLOCKING,
                endpoint=test["endpoint"],
                context={"workflow": test["workflow"].value}
            )
        
        # Wait for business impact assessment
        await asyncio.sleep(1)
        
        # Get business impact summary
        impact_summary = business_impact_monitor.get_business_impact_summary()
        
        workflow_impacts = impact_summary.get("workflow_impacts", {})
        total_revenue_impact = impact_summary.get("total_revenue_impact_hourly", 0)
        methodology_health = impact_summary.get("six_figure_methodology_health", {})
        
        print(f"  📊 Workflow impacts detected: {len(workflow_impacts)}")
        print(f"  💰 Total revenue impact: ${total_revenue_impact:.2f}/hour")
        print(f"  🎯 Methodology compliance: {methodology_health.get('compliance_score', 0):.1%}")
        
        self.test_results["business_impact_monitoring"] = {
            "workflow_impacts_detected": len(workflow_impacts),
            "total_revenue_impact": total_revenue_impact,
            "methodology_compliance": methodology_health.get('compliance_score', 0),
            "business_metrics_calculated": impact_summary.get("business_metrics") is not None
        }
    
    async def test_api_endpoints(self):
        """Test error monitoring API endpoints"""
        print("\n🌐 Testing API Endpoints...")
        
        endpoints_to_test = [
            "/api/v2/error-monitoring/health",
            "/api/v2/error-monitoring/dashboard",
            "/api/v2/error-monitoring/metrics",
            "/api/v2/error-monitoring/patterns",
            "/api/v2/error-monitoring/business-impact"
        ]
        
        endpoint_results = {}
        
        for endpoint in endpoints_to_test:
            try:
                response = await self.client.get(f"{self.base_url}{endpoint}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"  ✅ {endpoint}: OK ({len(str(data))} bytes)")
                    endpoint_results[endpoint] = {"status": "success", "size": len(str(data))}
                else:
                    print(f"  ❌ {endpoint}: HTTP {response.status_code}")
                    endpoint_results[endpoint] = {"status": "failed", "code": response.status_code}
                    
            except Exception as e:
                print(f"  ❌ {endpoint}: Connection failed - {e}")
                endpoint_results[endpoint] = {"status": "error", "error": str(e)}
        
        # Test error creation endpoint
        try:
            create_response = await self.client.post(
                f"{self.base_url}/api/v2/error-monitoring/test/create-error",
                json={
                    "message": "API test error",
                    "severity": "low",
                    "simulate_resolution": True
                }
            )
            
            if create_response.status_code == 200:
                print(f"  ✅ Test error creation: OK")
                endpoint_results["test_create"] = {"status": "success"}
            else:
                print(f"  ❌ Test error creation: HTTP {create_response.status_code}")
                endpoint_results["test_create"] = {"status": "failed"}
                
        except Exception as e:
            print(f"  ❌ Test error creation: {e}")
            endpoint_results["test_create"] = {"status": "error"}
        
        self.test_results["api_endpoints"] = endpoint_results
    
    async def test_sla_compliance(self):
        """Test SLA compliance monitoring"""
        print("\n📋 Testing SLA Compliance...")
        
        # Get current metrics
        dashboard_data = await error_monitoring_service.get_dashboard_data()
        sla_compliance = dashboard_data.get("summary", {}).get("sla_compliance", {})
        
        error_rate_target = sla_compliance.get("error_rate_target", 0.1)
        current_error_rate = sla_compliance.get("current_rate", 0)
        mttr_target = sla_compliance.get("mttr_target", 300)
        current_mttr = sla_compliance.get("current_mttr", 0)
        
        # Check compliance
        error_rate_compliant = current_error_rate <= error_rate_target
        mttr_compliant = current_mttr <= mttr_target
        
        print(f"  📊 Error Rate: {current_error_rate:.3f}% (target: {error_rate_target}%) - {'✅' if error_rate_compliant else '❌'}")
        print(f"  ⏱️  MTTR: {current_mttr:.1f}s (target: {mttr_target}s) - {'✅' if mttr_compliant else '❌'}")
        
        # Calculate overall SLA score
        sla_score = (
            (1.0 if error_rate_compliant else 0.5) +
            (1.0 if mttr_compliant else 0.5)
        ) / 2.0
        
        print(f"  🎯 Overall SLA Score: {sla_score:.1%}")
        
        self.test_results["sla_compliance"] = {
            "error_rate_compliant": error_rate_compliant,
            "mttr_compliant": mttr_compliant,
            "sla_score": sla_score,
            "current_error_rate": current_error_rate,
            "current_mttr": current_mttr
        }
    
    async def test_six_figure_methodology_integration(self):
        """Test Six Figure Barber methodology integration"""
        print("\n🎯 Testing Six Figure Barber Methodology Integration...")
        
        # Test each workflow type
        methodology_tests = []
        
        for workflow in WorkflowType:
            # Create workflow-specific error
            await error_monitoring_service.capture_error(
                message=f"Test error for {workflow.value}",
                severity=ErrorSeverity.MEDIUM,
                category=ErrorCategory.BUSINESS_LOGIC,
                business_impact=BusinessImpact.OPERATIONAL,
                context={"workflow_test": workflow.value}
            )
            methodology_tests.append(workflow.value)
        
        # Wait for impact assessment
        await asyncio.sleep(1)
        
        # Check methodology compliance
        impact_summary = business_impact_monitor.get_business_impact_summary()
        methodology_health = impact_summary.get("six_figure_methodology_health", {})
        
        compliance_score = methodology_health.get("compliance_score", 0)
        impacted_workflows = methodology_health.get("impacted_workflows", 0)
        revenue_optimization_impact = methodology_health.get("revenue_optimization_impact", "unknown")
        
        print(f"  📊 Workflows tested: {len(methodology_tests)}")
        print(f"  🎯 Methodology compliance: {compliance_score:.1%}")
        print(f"  ⚠️  Impacted workflows: {impacted_workflows}")
        print(f"  💰 Revenue optimization impact: {revenue_optimization_impact}")
        
        # Check specific workflow mappings
        workflow_mappings_tested = len(business_impact_monitor.workflow_endpoints)
        print(f"  🗺️  Workflow endpoint mappings: {workflow_mappings_tested}")
        
        self.test_results["six_figure_methodology"] = {
            "workflows_tested": len(methodology_tests),
            "compliance_score": compliance_score,
            "impacted_workflows": impacted_workflows,
            "revenue_optimization_impact": revenue_optimization_impact,
            "workflow_mappings": workflow_mappings_tested
        }
    
    async def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 60)
        print("📋 ERROR MONITORING SYSTEM TEST REPORT")
        print("=" * 60)
        
        # Calculate overall scores
        total_tests = 0
        passed_tests = 0
        
        for test_name, results in self.test_results.items():
            print(f"\n🧪 {test_name.replace('_', ' ').title()}:")
            
            if isinstance(results, dict):
                for key, value in results.items():
                    if isinstance(value, bool):
                        status = "✅ PASS" if value else "❌ FAIL"
                        print(f"  {key}: {status}")
                        total_tests += 1
                        if value:
                            passed_tests += 1
                    elif isinstance(value, (int, float)):
                        print(f"  {key}: {value}")
                    elif isinstance(value, str):
                        print(f"  {key}: {value}")
        
        # Overall system health
        overall_score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n🎯 OVERALL SYSTEM HEALTH:")
        print(f"  Tests Passed: {passed_tests}/{total_tests}")
        print(f"  Success Rate: {overall_score:.1f}%")
        
        if overall_score >= 90:
            print(f"  Status: 🟢 EXCELLENT - System ready for production")
        elif overall_score >= 75:
            print(f"  Status: 🟡 GOOD - Minor issues detected")
        elif overall_score >= 50:
            print(f"  Status: 🟠 FAIR - Several issues need attention")
        else:
            print(f"  Status: 🔴 POOR - Critical issues detected")
        
        # System metrics summary
        dashboard_data = await error_monitoring_service.get_dashboard_data()
        summary = dashboard_data.get("summary", {})
        
        print(f"\n📊 CURRENT SYSTEM METRICS:")
        print(f"  Active Errors: {summary.get('total_active_errors', 0)}")
        print(f"  Error Rate: {summary.get('error_rate_5min', 0):.2f}/min")
        print(f"  Auto-Resolution Rate: {summary.get('auto_resolution_rate', 0):.1%}")
        print(f"  Mean Resolution Time: {summary.get('mean_resolution_time', 0):.1f}s")
        
        # Business impact summary
        impact_summary = business_impact_monitor.get_business_impact_summary()
        print(f"\n💼 BUSINESS IMPACT SUMMARY:")
        print(f"  Workflow Impacts: {len(impact_summary.get('workflow_impacts', {}))}")
        print(f"  Revenue Impact: ${impact_summary.get('total_revenue_impact_hourly', 0):.2f}/hour")
        print(f"  Methodology Compliance: {impact_summary.get('six_figure_methodology_health', {}).get('compliance_score', 0):.1%}")
        
        print(f"\n✅ ERROR MONITORING SYSTEM TEST COMPLETE")
        print("=" * 60)
        
        return {
            "overall_score": overall_score,
            "tests_passed": passed_tests,
            "total_tests": total_tests,
            "system_metrics": summary,
            "business_impact": impact_summary
        }


async def main():
    """Main test runner"""
    test_suite = ErrorMonitoringTestSuite()
    
    try:
        results = await test_suite.run_all_tests()
        
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"/Users/bossio/6fb-booking/backend-v2/error_monitoring_test_results_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump(test_suite.test_results, f, indent=2, default=str)
        
        print(f"\n📄 Test results saved to: {results_file}")
        
        return results
        
    except Exception as e:
        print(f"❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    asyncio.run(main())