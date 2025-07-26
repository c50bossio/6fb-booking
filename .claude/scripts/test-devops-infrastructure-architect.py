#!/usr/bin/env python3
"""
Test Script for BookedBarber V2 DevOps Infrastructure Architect Agent
Validates enterprise infrastructure automation capabilities
"""

import os
import sys
import json
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Any

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

class DevOpsArchitectTester:
    """Test suite for DevOps Infrastructure Architect Agent"""
    
    def __init__(self):
        self.project_root = Path("/Users/bossio/6fb-booking")
        self.agent_script = self.project_root / ".claude" / "scripts" / "devops-infrastructure-architect-agent.py"
        self.test_results = []
        self.test_start_time = time.time()
    
    def log_test(self, test_name: str, status: str, details: str = ""):
        """Log test results"""
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": time.time() - self.test_start_time
        }
        self.test_results.append(result)
        status_emoji = "✅" if status == "PASS" else "❌"
        print(f"{status_emoji} {test_name}: {status}")
        if details:
            print(f"   Details: {details}")
    
    def run_agent_test(self, trigger: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Run the DevOps agent with specific trigger and context"""
        try:
            cmd = [
                "python3",
                str(self.agent_script),
                "--trigger", trigger,
                "--context", json.dumps(context)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                return json.loads(result.stdout)
            else:
                return {
                    "status": "error",
                    "error": result.stderr,
                    "stdout": result.stdout
                }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def test_docker_optimization_trigger(self):
        """Test Docker configuration optimization"""
        test_name = "Docker Configuration Optimization"
        
        context = {
            "trigger_type": "docker_configuration_changes",
            "files_changed": ["docker-compose.yml", "Dockerfile"],
            "change_type": "optimization_required"
        }
        
        result = self.run_agent_test("docker_configuration_changes", context)
        
        if result.get("status") == "success":
            actions = result.get("actions_taken", [])
            docker_actions = [a for a in actions if "docker" in a.get("action", "").lower()]
            
            if docker_actions:
                self.log_test(test_name, "PASS", f"Generated {len(docker_actions)} Docker optimizations")
            else:
                self.log_test(test_name, "FAIL", "No Docker optimizations generated")
        else:
            self.log_test(test_name, "FAIL", result.get("error", "Unknown error"))
    
    def test_kubernetes_deployment(self):
        """Test Kubernetes manifest generation"""
        test_name = "Kubernetes Manifest Generation"
        
        context = {
            "trigger_type": "kubernetes_manifest_changes",
            "files_changed": ["k8s/backend-deployment.yaml"],
            "change_type": "enterprise_scaling_required"
        }
        
        result = self.run_agent_test("kubernetes_manifest_changes", context)
        
        if result.get("status") == "success":
            actions = result.get("actions_taken", [])
            k8s_actions = [a for a in actions if "kubernetes" in a.get("action", "").lower() or "k8s" in a.get("action", "").lower()]
            
            if k8s_actions:
                self.log_test(test_name, "PASS", f"Generated {len(k8s_actions)} Kubernetes configurations")
            else:
                self.log_test(test_name, "FAIL", "No Kubernetes configurations generated")
        else:
            self.log_test(test_name, "FAIL", result.get("error", "Unknown error"))
    
    def test_terraform_infrastructure(self):
        """Test Terraform infrastructure automation"""
        test_name = "Terraform Infrastructure Automation"
        
        context = {
            "trigger_type": "terraform_infrastructure_changes",
            "files_changed": ["terraform/main.tf"],
            "change_type": "infrastructure_provisioning"
        }
        
        result = self.run_agent_test("terraform_infrastructure_changes", context)
        
        if result.get("status") == "success":
            actions = result.get("actions_taken", [])
            terraform_actions = [a for a in actions if "terraform" in a.get("action", "").lower()]
            
            if terraform_actions:
                self.log_test(test_name, "PASS", f"Generated {len(terraform_actions)} Terraform configurations")
            else:
                self.log_test(test_name, "FAIL", "No Terraform configurations generated")
        else:
            self.log_test(test_name, "FAIL", result.get("error", "Unknown error"))
    
    def test_monitoring_stack_deployment(self):
        """Test monitoring stack deployment"""
        test_name = "Monitoring Stack Deployment"
        
        context = {
            "trigger_type": "monitoring_infrastructure_changes",
            "files_changed": ["monitoring/prometheus.yml"],
            "change_type": "monitoring_setup_required"
        }
        
        result = self.run_agent_test("monitoring_infrastructure_changes", context)
        
        if result.get("status") == "success":
            actions = result.get("actions_taken", [])
            monitoring_actions = [a for a in actions if "monitoring" in a.get("action", "").lower()]
            
            if monitoring_actions:
                self.log_test(test_name, "PASS", f"Generated {len(monitoring_actions)} monitoring configurations")
            else:
                self.log_test(test_name, "FAIL", "No monitoring configurations generated")
        else:
            self.log_test(test_name, "FAIL", result.get("error", "Unknown error"))
    
    def test_cicd_pipeline_deployment(self):
        """Test CI/CD pipeline deployment"""
        test_name = "CI/CD Pipeline Deployment"
        
        context = {
            "trigger_type": "cicd_pipeline_optimization",
            "files_changed": [".github/workflows/deploy.yml"],
            "change_type": "pipeline_enhancement"
        }
        
        result = self.run_agent_test("cicd_pipeline_optimization", context)
        
        if result.get("status") == "success":
            actions = result.get("actions_taken", [])
            cicd_actions = [a for a in actions if "cicd" in a.get("action", "").lower() or "pipeline" in a.get("action", "").lower()]
            
            if cicd_actions:
                self.log_test(test_name, "PASS", f"Generated {len(cicd_actions)} CI/CD configurations")
            else:
                self.log_test(test_name, "FAIL", "No CI/CD configurations generated")
        else:
            self.log_test(test_name, "FAIL", result.get("error", "Unknown error"))
    
    def test_deployment_failure_recovery(self):
        """Test deployment failure recovery"""
        test_name = "Deployment Failure Recovery"
        
        context = {
            "trigger_type": "deployment_failures",
            "error_details": "kubectl apply failed: connection refused",
            "change_type": "deployment_troubleshooting"
        }
        
        result = self.run_agent_test("deployment_failures", context)
        
        if result.get("status") == "success":
            recommendations = result.get("recommendations", [])
            
            if recommendations:
                self.log_test(test_name, "PASS", f"Generated {len(recommendations)} recovery recommendations")
            else:
                self.log_test(test_name, "FAIL", "No recovery recommendations generated")
        else:
            self.log_test(test_name, "FAIL", result.get("error", "Unknown error"))
    
    def test_infrastructure_scaling(self):
        """Test infrastructure scaling recommendations"""
        test_name = "Infrastructure Scaling Recommendations"
        
        context = {
            "trigger_type": "infrastructure_scaling_requirements",
            "performance_metrics": {
                "cpu_usage": "85%",
                "memory_usage": "90%",
                "response_time": "1200ms"
            },
            "change_type": "scaling_optimization"
        }
        
        result = self.run_agent_test("infrastructure_scaling_requirements", context)
        
        if result.get("status") == "success":
            recommendations = result.get("recommendations", [])
            
            if recommendations:
                self.log_test(test_name, "PASS", f"Generated {len(recommendations)} scaling recommendations")
            else:
                self.log_test(test_name, "FAIL", "No scaling recommendations generated")
        else:
            self.log_test(test_name, "FAIL", result.get("error", "Unknown error"))
    
    def test_security_infrastructure(self):
        """Test security infrastructure deployment"""
        test_name = "Security Infrastructure Deployment"
        
        context = {
            "trigger_type": "security_infrastructure_requirements",
            "files_changed": ["k8s/security/network-policies.yaml"],
            "change_type": "security_hardening"
        }
        
        result = self.run_agent_test("security_infrastructure_requirements", context)
        
        if result.get("status") == "success":
            actions = result.get("actions_taken", [])
            
            if actions:
                self.log_test(test_name, "PASS", f"Generated {len(actions)} security configurations")
            else:
                self.log_test(test_name, "FAIL", "No security configurations generated")
        else:
            self.log_test(test_name, "FAIL", result.get("error", "Unknown error"))
    
    def test_enterprise_summary_generation(self):
        """Test enterprise infrastructure summary generation"""
        test_name = "Enterprise Summary Generation"
        
        context = {
            "trigger_type": "comprehensive_infrastructure_deployment",
            "scope": "full_enterprise_stack",
            "change_type": "complete_deployment"
        }
        
        result = self.run_agent_test("comprehensive_infrastructure_deployment", context)
        
        if result.get("status") == "success":
            summary = result.get("summary", "")
            
            if summary and len(summary) > 1000:  # Check for substantial summary
                self.log_test(test_name, "PASS", f"Generated comprehensive summary ({len(summary)} characters)")
            else:
                self.log_test(test_name, "FAIL", "Summary too short or missing")
        else:
            self.log_test(test_name, "FAIL", result.get("error", "Unknown error"))
    
    def test_bookedbarber_specific_features(self):
        """Test BookedBarber V2 specific infrastructure features"""
        test_name = "BookedBarber V2 Specific Features"
        
        context = {
            "trigger_type": "barbershop_platform_optimization",
            "business_requirements": {
                "six_figure_barber_methodology": True,
                "real_time_booking": True,
                "payment_processing": True,
                "multi_location_support": True
            },
            "change_type": "barbershop_optimization"
        }
        
        result = self.run_agent_test("barbershop_platform_optimization", context)
        
        if result.get("status") == "success":
            summary = result.get("summary", "")
            barbershop_keywords = ["barber", "booking", "appointment", "revenue", "six figure"]
            
            found_keywords = [kw for kw in barbershop_keywords if kw.lower() in summary.lower()]
            
            if len(found_keywords) >= 3:
                self.log_test(test_name, "PASS", f"Contains barbershop-specific features: {', '.join(found_keywords)}")
            else:
                self.log_test(test_name, "FAIL", f"Missing barbershop-specific features (found: {', '.join(found_keywords)})")
        else:
            self.log_test(test_name, "FAIL", result.get("error", "Unknown error"))
    
    def run_all_tests(self):
        """Run all DevOps infrastructure architect tests"""
        print("🚀 Starting BookedBarber V2 DevOps Infrastructure Architect Agent Tests")
        print("=" * 80)
        
        # Check if agent script exists
        if not self.agent_script.exists():
            print(f"❌ Agent script not found: {self.agent_script}")
            return False
        
        # Run all tests
        test_methods = [
            self.test_docker_optimization_trigger,
            self.test_kubernetes_deployment,
            self.test_terraform_infrastructure,
            self.test_monitoring_stack_deployment,
            self.test_cicd_pipeline_deployment,
            self.test_deployment_failure_recovery,
            self.test_infrastructure_scaling,
            self.test_security_infrastructure,
            self.test_enterprise_summary_generation,
            self.test_bookedbarber_specific_features
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                test_name = test_method.__name__.replace("test_", "").replace("_", " ").title()
                self.log_test(test_name, "ERROR", str(e))
        
        # Generate test summary
        self.generate_test_summary()
        
        return True
    
    def generate_test_summary(self):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 DevOps Infrastructure Architect Agent Test Summary")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAIL"])
        error_tests = len([r for r in self.test_results if r["status"] == "ERROR"])
        
        pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📈 Overall Results:")
        print(f"   • Total Tests: {total_tests}")
        print(f"   • Passed: {passed_tests} ✅")
        print(f"   • Failed: {failed_tests} ❌")
        print(f"   • Errors: {error_tests} 🔥")
        print(f"   • Pass Rate: {pass_rate:.1f}%")
        
        print(f"\n⏱️  Execution Time: {time.time() - self.test_start_time:.2f} seconds")
        
        # Detailed results
        if failed_tests > 0 or error_tests > 0:
            print(f"\n🔍 Failed/Error Test Details:")
            for result in self.test_results:
                if result["status"] in ["FAIL", "ERROR"]:
                    print(f"   • {result['test']}: {result['status']}")
                    if result.get("details"):
                        print(f"     Details: {result['details']}")
        
        # Infrastructure coverage assessment
        print(f"\n🏗️  Infrastructure Coverage Assessment:")
        infrastructure_areas = [
            "Docker", "Kubernetes", "Terraform", "Monitoring", 
            "CI/CD", "Security", "Scaling", "Enterprise"
        ]
        
        covered_areas = []
        for area in infrastructure_areas:
            area_tests = [r for r in self.test_results if area.lower() in r["test"].lower() and r["status"] == "PASS"]
            if area_tests:
                covered_areas.append(area)
        
        coverage_rate = (len(covered_areas) / len(infrastructure_areas) * 100)
        print(f"   • Infrastructure Areas Covered: {len(covered_areas)}/{len(infrastructure_areas)} ({coverage_rate:.1f}%)")
        print(f"   • Covered Areas: {', '.join(covered_areas)}")
        
        if coverage_rate < 80:
            missing_areas = [area for area in infrastructure_areas if area not in covered_areas]
            print(f"   • Missing Areas: {', '.join(missing_areas)}")
        
        # Final verdict
        print(f"\n🎯 Final Verdict:")
        if pass_rate >= 90 and coverage_rate >= 80:
            print("   ✅ DevOps Infrastructure Architect Agent is PRODUCTION READY")
        elif pass_rate >= 70 and coverage_rate >= 60:
            print("   ⚠️  DevOps Infrastructure Architect Agent needs MINOR IMPROVEMENTS")
        else:
            print("   ❌ DevOps Infrastructure Architect Agent needs MAJOR IMPROVEMENTS")
        
        print("=" * 80)

def main():
    """Main test execution"""
    tester = DevOpsArchitectTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())