#!/usr/bin/env python3
"""
BookedBarber V2 Performance Benchmark Runner
Master script to run all performance tests and generate comprehensive analysis
"""

import asyncio
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
import logging
import requests

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PerformanceBenchmarkRunner:
    def __init__(self, backend_url: str = "http://localhost:8000", frontend_url: str = "http://localhost:3000"):
        self.backend_url = backend_url.rstrip('/')
        self.frontend_url = frontend_url.rstrip('/')
        self.test_start_time = datetime.now()
        
        # Performance projections for different user loads
        self.scalability_targets = [100, 1000, 10000]
        
        # Production readiness thresholds
        self.production_thresholds = {
            "api_response_time_p95_ms": 200,
            "frontend_load_time_ms": 2000,
            "booking_flow_time_ms": 5000,
            "database_query_time_ms": 50,
            "success_rate_percent": 99.0,
            "concurrent_users_supported": 100,
            "memory_usage_per_user_mb": 10
        }

    def check_prerequisites(self) -> Dict[str, bool]:
        """Check if all required components are available"""
        logger.info("🔍 Checking prerequisites...")
        
        prerequisites = {
            "backend_server": False,
            "frontend_server": False,
            "node_js": False,
            "python_dependencies": False
        }
        
        # Check backend server
        try:
            response = requests.get(f"{self.backend_url}/api/v2/health", timeout=5)
            prerequisites["backend_server"] = response.status_code == 200
            logger.info(f"✅ Backend server: {'Available' if prerequisites['backend_server'] else 'Not responding'}")
        except:
            logger.warning(f"❌ Backend server not available at {self.backend_url}")
        
        # Check frontend server
        try:
            response = requests.get(self.frontend_url, timeout=5)
            prerequisites["frontend_server"] = response.status_code == 200
            logger.info(f"✅ Frontend server: {'Available' if prerequisites['frontend_server'] else 'Not responding'}")
        except:
            logger.warning(f"⚠️  Frontend server not available at {self.frontend_url}")
        
        # Check Node.js
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, text=True)
            prerequisites["node_js"] = result.returncode == 0
            logger.info(f"✅ Node.js: {'Available' if prerequisites['node_js'] else 'Not available'}")
        except:
            logger.warning("❌ Node.js not available")
        
        # Check Python dependencies
        try:
            prerequisites["python_dependencies"] = True
            logger.info("✅ Python dependencies: Available")
        except ImportError as e:
            logger.warning(f"❌ Missing Python dependencies: {e}")
        
        return prerequisites

    async def run_backend_performance_tests(self) -> Dict[str, Any]:
        """Run comprehensive backend performance tests"""
        logger.info("🔧 Running backend performance tests...")
        
        try:
            # Import and run the performance benchmark suite
            from performance_benchmark_suite import PerformanceBenchmarkSuite
            
            benchmark = PerformanceBenchmarkSuite(self.backend_url, self.frontend_url)
            results = await benchmark.run_comprehensive_benchmark()
            
            logger.info("✅ Backend performance tests completed")
            return results
        except Exception as e:
            logger.error(f"❌ Backend performance tests failed: {e}")
            return {"error": str(e)}

    def run_frontend_performance_tests(self) -> Dict[str, Any]:
        """Run frontend performance tests using Node.js"""
        logger.info("🌐 Running frontend performance tests...")
        
        try:
            # Check if we have the frontend test script
            script_path = Path("frontend_performance_analyzer.js")
            if not script_path.exists():
                return {"error": "Frontend performance script not found"}
            
            # Run the frontend test
            result = subprocess.run([
                'node', str(script_path), self.frontend_url
            ], capture_output=True, text=True, timeout=600)
            
            if result.returncode == 0:
                # Look for the results file
                results_files = list(Path(".").glob("frontend_performance_report_*.json"))
                if results_files:
                    latest_results = max(results_files, key=lambda x: x.stat().st_mtime)
                    with open(latest_results, 'r') as f:
                        results = json.load(f)
                    logger.info("✅ Frontend performance tests completed")
                    return results
                else:
                    return {"error": "No results file generated"}
            else:
                logger.error(f"Frontend test stderr: {result.stderr}")
                return {"error": f"Frontend test failed: {result.stderr}"}
                
        except subprocess.TimeoutExpired:
            logger.error("Frontend tests timed out")
            return {"error": "Frontend tests timed out"}
        except Exception as e:
            logger.error(f"❌ Frontend performance tests failed: {e}")
            return {"error": str(e)}

    async def run_e2e_performance_tests(self) -> Dict[str, Any]:
        """Run end-to-end booking flow performance tests"""
        logger.info("🔄 Running E2E booking flow performance tests...")
        
        try:
            from e2e_booking_performance_test import E2EBookingPerformanceTest
            
            e2e_test = E2EBookingPerformanceTest(self.backend_url, self.frontend_url)
            results = await e2e_test.run_comprehensive_test()
            
            logger.info("✅ E2E performance tests completed")
            return results
        except Exception as e:
            logger.error(f"❌ E2E performance tests failed: {e}")
            return {"error": str(e)}

    def analyze_scalability_projections(self, backend_results: Dict, e2e_results: Dict) -> Dict[str, Any]:
        """Generate scalability projections for different user loads"""
        logger.info("📊 Analyzing scalability projections...")
        
        projections = {}
        
        # Extract key metrics from test results
        baseline_metrics = {
            "api_response_time_ms": 0,
            "booking_flow_time_ms": 0,
            "requests_per_second": 0,
            "memory_usage_mb": 0,
            "success_rate": 0
        }
        
        # Get API performance baseline
        if "api_performance" in backend_results and "overall" in backend_results["api_performance"]:
            api_perf = backend_results["api_performance"]["overall"]
            if "avg_response_time_ms" in api_perf:
                baseline_metrics["api_response_time_ms"] = api_perf["avg_response_time_ms"]
            if "success_rate" in api_perf:
                baseline_metrics["success_rate"] = api_perf["success_rate"]
        
        # Get booking flow baseline
        if "performance_analysis" in e2e_results and "overview" in e2e_results["performance_analysis"]:
            e2e_perf = e2e_results["performance_analysis"]["overview"]
            if "avg_total_time_ms" in e2e_perf:
                baseline_metrics["booking_flow_time_ms"] = e2e_perf["avg_total_time_ms"]
            if "success_rate" in e2e_perf:
                baseline_metrics["success_rate"] = max(baseline_metrics["success_rate"], e2e_perf["success_rate"])
        
        # Get load test baseline
        if "load_tests" in backend_results and "summary" in backend_results["load_tests"]:
            load_summary = backend_results["load_tests"]["summary"]
            if "peak_requests_per_second" in load_summary:
                baseline_metrics["requests_per_second"] = load_summary["peak_requests_per_second"]
        
        # Get memory usage
        if "memory_usage" in e2e_results and "memory_per_flow_mb" in e2e_results["memory_usage"]:
            baseline_metrics["memory_usage_mb"] = e2e_results["memory_usage"]["memory_per_flow_mb"]
        
        # Generate projections for each target user load
        for target_users in self.scalability_targets:
            # Simple scaling model (in production, this would be more sophisticated)
            scaling_factor = target_users / 10  # Assume baseline is ~10 concurrent users
            
            # Response time typically increases logarithmically with load
            projected_api_time = baseline_metrics["api_response_time_ms"] * (1 + 0.1 * scaling_factor)
            projected_booking_time = baseline_metrics["booking_flow_time_ms"] * (1 + 0.2 * scaling_factor)
            
            # Success rate typically decreases with increased load
            projected_success_rate = max(0.5, baseline_metrics["success_rate"] * (1 - 0.001 * scaling_factor))
            
            # Memory usage scales roughly linearly
            projected_memory = baseline_metrics["memory_usage_mb"] * target_users
            
            # RPS capacity estimate
            projected_rps = baseline_metrics["requests_per_second"] * min(10, target_users / 10)
            
            # Determine infrastructure requirements
            infrastructure_needs = self.estimate_infrastructure_needs(target_users, projected_memory, projected_rps)
            
            # Generate recommendations
            recommendations = self.generate_scaling_recommendations(target_users, projected_api_time, projected_success_rate)
            
            projections[f"{target_users}_users"] = {
                "target_concurrent_users": target_users,
                "projected_metrics": {
                    "api_response_time_ms": round(projected_api_time, 1),
                    "booking_flow_time_ms": round(projected_booking_time, 1),
                    "success_rate": round(projected_success_rate, 3),
                    "memory_usage_total_mb": round(projected_memory, 1),
                    "requests_per_second": round(projected_rps, 1)
                },
                "infrastructure_needs": infrastructure_needs,
                "recommendations": recommendations,
                "production_readiness": self.assess_production_readiness(projected_api_time, projected_booking_time, projected_success_rate)
            }
        
        return {
            "baseline_metrics": baseline_metrics,
            "projections": projections,
            "scaling_analysis": self.analyze_scaling_patterns(projections)
        }

    def estimate_infrastructure_needs(self, users: int, memory_mb: float, rps: float) -> Dict[str, Any]:
        """Estimate infrastructure requirements for target user load"""
        
        # Database requirements
        db_connections = min(users * 2, 1000)  # 2 connections per user, max 1000
        db_memory_gb = max(8, (memory_mb / 1024) * 2)  # At least 8GB, scale with app memory
        
        # Backend instances
        backend_instances = max(1, users // 100)  # 1 instance per 100 users
        backend_cpu_cores = max(2, users // 50)   # 1 core per 50 users
        backend_memory_gb = max(4, memory_mb / 1024 * 1.5)  # 50% overhead
        
        # Cache requirements
        cache_memory_gb = max(1, users // 100)  # 1GB cache per 100 users
        
        return {
            "database": {
                "connections": db_connections,
                "memory_gb": round(db_memory_gb, 1),
                "storage_gb": max(100, users * 0.1),  # 100MB per user
                "type": "PostgreSQL with read replicas" if users > 1000 else "PostgreSQL"
            },
            "backend": {
                "instances": backend_instances,
                "cpu_cores_per_instance": round(backend_cpu_cores / backend_instances, 1),
                "memory_gb_per_instance": round(backend_memory_gb / backend_instances, 1),
                "total_memory_gb": round(backend_memory_gb, 1)
            },
            "cache": {
                "memory_gb": cache_memory_gb,
                "type": "Redis Cluster" if cache_memory_gb > 10 else "Redis"
            },
            "load_balancer": users > 100,
            "cdn": users > 500,
            "estimated_monthly_cost_usd": self.estimate_infrastructure_cost(users, backend_instances, db_memory_gb, cache_memory_gb)
        }

    def estimate_infrastructure_cost(self, users: int, backend_instances: int, db_memory_gb: float, cache_memory_gb: float) -> int:
        """Rough estimate of monthly infrastructure costs"""
        
        # Backend instances (AWS EC2 t3.medium ~$30/month each)
        backend_cost = backend_instances * 30
        
        # Database (AWS RDS, roughly $1 per GB RAM per month)
        db_cost = db_memory_gb * 20
        
        # Cache (AWS ElastiCache, roughly $50 per GB per month)
        cache_cost = cache_memory_gb * 50
        
        # CDN and load balancer
        cdn_cost = 20 if users > 500 else 0
        lb_cost = 25 if users > 100 else 0
        
        # Monitoring and extras
        monitoring_cost = 100 if users > 1000 else 50
        
        total_cost = backend_cost + db_cost + cache_cost + cdn_cost + lb_cost + monitoring_cost
        
        return round(total_cost)

    def generate_scaling_recommendations(self, users: int, api_time: float, success_rate: float) -> List[str]:
        """Generate specific recommendations for scaling to target users"""
        recommendations = []
        
        if users <= 100:
            recommendations.extend([
                "Single server setup with optimized database indexes",
                "Implement basic caching for frequently accessed data",
                "Monitor response times and error rates"
            ])
        elif users <= 1000:
            recommendations.extend([
                "Deploy load balancer with multiple backend instances",
                "Implement Redis caching layer",
                "Set up database connection pooling",
                "Add database read replicas for read-heavy operations",
                "Implement API rate limiting"
            ])
        else:  # > 1000 users
            recommendations.extend([
                "Kubernetes cluster with auto-scaling",
                "Redis Cluster for distributed caching",
                "PostgreSQL with multiple read replicas",
                "CDN for static assets and API responses",
                "Comprehensive monitoring with APM tools",
                "Database sharding if data volume is high",
                "Message queue for background processing",
                "Circuit breakers for external API calls"
            ])
        
        # Performance-specific recommendations
        if api_time > self.production_thresholds["api_response_time_p95_ms"]:
            recommendations.append(f"API optimization required: current projection {api_time:.1f}ms > {self.production_thresholds['api_response_time_p95_ms']}ms target")
        
        if success_rate < self.production_thresholds["success_rate_percent"] / 100:
            recommendations.append(f"Reliability improvements needed: projected success rate {success_rate:.1%} < {self.production_thresholds['success_rate_percent']}% target")
        
        return recommendations

    def assess_production_readiness(self, api_time: float, booking_time: float, success_rate: float) -> Dict[str, Any]:
        """Assess production readiness for projected performance"""
        
        readiness_score = 0
        max_score = 3
        issues = []
        
        # Check API response time
        if api_time <= self.production_thresholds["api_response_time_p95_ms"]:
            readiness_score += 1
        else:
            issues.append(f"API response time ({api_time:.1f}ms) exceeds production threshold")
        
        # Check booking flow time
        if booking_time <= self.production_thresholds["booking_flow_time_ms"]:
            readiness_score += 1
        else:
            issues.append(f"Booking flow time ({booking_time:.1f}ms) exceeds production threshold")
        
        # Check success rate
        if success_rate >= self.production_thresholds["success_rate_percent"] / 100:
            readiness_score += 1
        else:
            issues.append(f"Success rate ({success_rate:.1%}) below production threshold")
        
        readiness_level = "ready" if readiness_score == max_score else "needs_optimization" if readiness_score >= 2 else "not_ready"
        
        return {
            "level": readiness_level,
            "score": f"{readiness_score}/{max_score}",
            "percentage": round((readiness_score / max_score) * 100),
            "issues": issues
        }

    def analyze_scaling_patterns(self, projections: Dict) -> Dict[str, Any]:
        """Analyze scaling patterns across different user loads"""
        
        user_loads = []
        api_times = []
        success_rates = []
        
        for key, projection in projections.items():
            if "projected_metrics" in projection:
                user_loads.append(projection["target_concurrent_users"])
                api_times.append(projection["projected_metrics"]["api_response_time_ms"])
                success_rates.append(projection["projected_metrics"]["success_rate"])
        
        if len(user_loads) < 2:
            return {"error": "Not enough data points for scaling analysis"}
        
        # Calculate scaling efficiency
        scaling_efficiency = {}
        for i in range(1, len(user_loads)):
            load_increase = user_loads[i] / user_loads[i-1]
            time_increase = api_times[i] / api_times[i-1] if api_times[i-1] > 0 else float('inf')
            success_decrease = success_rates[i-1] / success_rates[i] if success_rates[i] > 0 else float('inf')
            
            scaling_efficiency[f"{user_loads[i-1]}_to_{user_loads[i]}"] = {
                "load_multiplier": round(load_increase, 1),
                "response_time_multiplier": round(time_increase, 1),
                "success_rate_degradation": round(success_decrease, 2),
                "efficiency_score": round(load_increase / (time_increase * success_decrease), 2)
            }
        
        # Identify bottlenecks
        bottlenecks = []
        if any(t > self.production_thresholds["api_response_time_p95_ms"] for t in api_times):
            bottlenecks.append("API response time becomes bottleneck at higher loads")
        
        if any(s < 0.95 for s in success_rates):
            bottlenecks.append("System reliability degrades significantly under load")
        
        return {
            "scaling_efficiency": scaling_efficiency,
            "bottlenecks": bottlenecks,
            "recommended_max_users": self.find_recommended_max_users(projections),
            "scaling_strategy": self.recommend_scaling_strategy(projections)
        }

    def find_recommended_max_users(self, projections: Dict) -> int:
        """Find recommended maximum users before significant performance degradation"""
        
        for key, projection in projections.items():
            if "projected_metrics" in projection:
                metrics = projection["projected_metrics"]
                
                # Check if performance is still acceptable
                if (metrics["api_response_time_ms"] > self.production_thresholds["api_response_time_p95_ms"] or
                    metrics["success_rate"] < 0.95):
                    
                    # Previous target was the last acceptable level
                    prev_targets = [int(k.split("_")[0]) for k in projections.keys() if k != key]
                    if prev_targets:
                        return max([t for t in prev_targets if t < projection["target_concurrent_users"]])
        
        # If all projections are acceptable, return the highest tested
        return max([int(k.split("_")[0]) for k in projections.keys()])

    def recommend_scaling_strategy(self, projections: Dict) -> List[str]:
        """Recommend overall scaling strategy based on projections"""
        
        max_users = max([int(k.split("_")[0]) for k in projections.keys()])
        
        if max_users <= 100:
            return [
                "Vertical scaling strategy: optimize single server performance",
                "Focus on database query optimization and caching",
                "Monitor and optimize bottlenecks before horizontal scaling"
            ]
        elif max_users <= 1000:
            return [
                "Hybrid scaling strategy: vertical optimization + horizontal scaling",
                "Implement load balancing and database read replicas",
                "Invest in caching infrastructure and connection pooling"
            ]
        else:
            return [
                "Horizontal scaling strategy: distributed architecture",
                "Microservices architecture with independent scaling",
                "Advanced caching, database sharding, and queue systems",
                "Comprehensive monitoring and automated scaling"
            ]

    async def run_comprehensive_benchmark(self) -> Dict[str, Any]:
        """Run all performance tests and generate comprehensive analysis"""
        logger.info("🚀 Starting Comprehensive BookedBarber V2 Performance Benchmark")
        logger.info("=" * 80)
        
        # Check prerequisites
        prerequisites = self.check_prerequisites()
        if not prerequisites["backend_server"]:
            return {"error": "Backend server is required but not available"}
        
        results = {
            "benchmark_info": {
                "start_time": self.test_start_time.isoformat(),
                "backend_url": self.backend_url,
                "frontend_url": self.frontend_url,
                "prerequisites": prerequisites,
                "production_thresholds": self.production_thresholds
            }
        }
        
        # 1. Backend Performance Tests
        logger.info("\n1️⃣  Backend Performance Tests")
        backend_results = await self.run_backend_performance_tests()
        results["backend_performance"] = backend_results
        
        # 2. Frontend Performance Tests (if Node.js available)
        if prerequisites["node_js"] and prerequisites["frontend_server"]:
            logger.info("\n2️⃣  Frontend Performance Tests")
            frontend_results = self.run_frontend_performance_tests()
            results["frontend_performance"] = frontend_results
        else:
            logger.warning("⚠️  Skipping frontend tests (Node.js or frontend server not available)")
            results["frontend_performance"] = {"skipped": "Node.js or frontend server not available"}
        
        # 3. E2E Performance Tests
        logger.info("\n3️⃣  End-to-End Performance Tests")
        e2e_results = await self.run_e2e_performance_tests()
        results["e2e_performance"] = e2e_results
        
        # 4. Scalability Analysis
        logger.info("\n4️⃣  Scalability Analysis")
        scalability_analysis = self.analyze_scalability_projections(backend_results, e2e_results)
        results["scalability_analysis"] = scalability_analysis
        
        # 5. Production Readiness Assessment
        logger.info("\n5️⃣  Production Readiness Assessment")
        production_assessment = self.assess_overall_production_readiness(results)
        results["production_readiness"] = production_assessment
        
        # Finalize results
        end_time = datetime.now()
        results["benchmark_info"]["end_time"] = end_time.isoformat()
        results["benchmark_info"]["total_duration_minutes"] = (end_time - self.test_start_time).total_seconds() / 60
        
        return results

    def assess_overall_production_readiness(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall production readiness based on all test results"""
        
        assessment = {
            "overall_score": 0,
            "max_score": 5,
            "category_scores": {},
            "critical_issues": [],
            "recommendations": [],
            "ready_for_production": False
        }
        
        # 1. Backend API Performance (1 point)
        if "backend_performance" in results and "api_performance" in results["backend_performance"]:
            api_perf = results["backend_performance"]["api_performance"]
            if "overall" in api_perf and "p95_response_time_ms" in api_perf["overall"]:
                p95_time = api_perf["overall"]["p95_response_time_ms"]
                if p95_time <= self.production_thresholds["api_response_time_p95_ms"]:
                    assessment["overall_score"] += 1
                    assessment["category_scores"]["api_performance"] = "pass"
                else:
                    assessment["category_scores"]["api_performance"] = "fail"
                    assessment["critical_issues"].append(f"API P95 response time ({p95_time:.1f}ms) exceeds threshold")
        
        # 2. Database Performance (1 point)
        if "backend_performance" in results and "database_performance" in results["backend_performance"]:
            db_perf = results["backend_performance"]["database_performance"]
            if "average_query_time_ms" in db_perf:
                avg_time = db_perf["average_query_time_ms"]
                if avg_time <= self.production_thresholds["database_query_time_ms"]:
                    assessment["overall_score"] += 1
                    assessment["category_scores"]["database_performance"] = "pass"
                else:
                    assessment["category_scores"]["database_performance"] = "fail"
                    assessment["critical_issues"].append(f"Database query time ({avg_time:.1f}ms) exceeds threshold")
        
        # 3. E2E Flow Performance (1 point)
        if "e2e_performance" in results and "performance_analysis" in results["e2e_performance"]:
            e2e_perf = results["e2e_performance"]["performance_analysis"]
            if "overview" in e2e_perf and "avg_total_time_ms" in e2e_perf["overview"]:
                flow_time = e2e_perf["overview"]["avg_total_time_ms"]
                if flow_time <= self.production_thresholds["booking_flow_time_ms"]:
                    assessment["overall_score"] += 1
                    assessment["category_scores"]["e2e_performance"] = "pass"
                else:
                    assessment["category_scores"]["e2e_performance"] = "fail"
                    assessment["critical_issues"].append(f"Booking flow time ({flow_time:.1f}ms) exceeds threshold")
        
        # 4. System Reliability (1 point)
        if "e2e_performance" in results and "performance_analysis" in results["e2e_performance"]:
            e2e_perf = results["e2e_performance"]["performance_analysis"]
            if "overview" in e2e_perf and "success_rate" in e2e_perf["overview"]:
                success_rate = e2e_perf["overview"]["success_rate"]
                if success_rate >= self.production_thresholds["success_rate_percent"] / 100:
                    assessment["overall_score"] += 1
                    assessment["category_scores"]["reliability"] = "pass"
                else:
                    assessment["category_scores"]["reliability"] = "fail"
                    assessment["critical_issues"].append(f"Success rate ({success_rate:.1%}) below threshold")
        
        # 5. Scalability Potential (1 point)
        if "scalability_analysis" in results and "projections" in results["scalability_analysis"]:
            projections = results["scalability_analysis"]["projections"]
            if "100_users" in projections:
                readiness_100 = projections["100_users"]["production_readiness"]
                if readiness_100["level"] in ["ready", "needs_optimization"]:
                    assessment["overall_score"] += 1
                    assessment["category_scores"]["scalability"] = "pass"
                else:
                    assessment["category_scores"]["scalability"] = "fail"
                    assessment["critical_issues"].append("System not ready for 100 concurrent users")
        
        # Generate recommendations
        if assessment["overall_score"] >= 4:
            assessment["ready_for_production"] = True
            assessment["recommendations"].extend([
                "System shows good performance characteristics",
                "Consider implementing monitoring and alerting",
                "Plan for gradual traffic increase with monitoring"
            ])
        elif assessment["overall_score"] >= 3:
            assessment["recommendations"].extend([
                "Address critical performance issues before production",
                "Implement performance monitoring",
                "Consider load testing with actual production data"
            ])
        else:
            assessment["recommendations"].extend([
                "Significant optimization required before production",
                "Focus on database and API performance improvements",
                "Consider architecture review and optimization"
            ])
        
        assessment["overall_percentage"] = round((assessment["overall_score"] / assessment["max_score"]) * 100)
        
        return assessment

    def save_results(self, results: Dict[str, Any], filename: str = None) -> str:
        """Save comprehensive benchmark results"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"bookedbarber_v2_performance_benchmark_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        return filename

    def print_summary(self, results: Dict[str, Any]) -> None:
        """Print comprehensive benchmark summary"""
        print("\n" + "=" * 80)
        print("BOOKEDBARBER V2 PERFORMANCE BENCHMARK SUMMARY")
        print("=" * 80)
        
        # Test overview
        if "benchmark_info" in results:
            info = results["benchmark_info"]
            print(f"🕐 Test Duration: {info.get('total_duration_minutes', 0):.1f} minutes")
            print(f"🔗 Backend: {info.get('backend_url', 'N/A')}")
            print(f"🌐 Frontend: {info.get('frontend_url', 'N/A')}")
        
        # Production readiness
        if "production_readiness" in results:
            readiness = results["production_readiness"]
            score_pct = readiness.get("overall_percentage", 0)
            ready = readiness.get("ready_for_production", False)
            
            print(f"\n🎯 PRODUCTION READINESS: {score_pct}% ({'✅ READY' if ready else '⚠️  NEEDS WORK'})")
            print(f"   Score: {readiness.get('overall_score', 0)}/{readiness.get('max_score', 5)}")
            
            if readiness.get("critical_issues"):
                print("   Critical Issues:")
                for issue in readiness["critical_issues"][:3]:
                    print(f"   • {issue}")
        
        # Performance metrics
        print("\n📊 PERFORMANCE METRICS:")
        
        # API Performance
        if "backend_performance" in results and "api_performance" in results["backend_performance"]:
            api_perf = results["backend_performance"]["api_performance"].get("overall", {})
            if "avg_response_time_ms" in api_perf:
                print(f"   API Response Time: {api_perf['avg_response_time_ms']:.1f}ms avg, {api_perf.get('p95_response_time_ms', 0):.1f}ms p95")
                print(f"   API Success Rate: {api_perf.get('success_rate', 0):.1%}")
        
        # Database Performance
        if "backend_performance" in results and "database_performance" in results["backend_performance"]:
            db_perf = results["backend_performance"]["database_performance"]
            if "average_query_time_ms" in db_perf:
                print(f"   Database Query Time: {db_perf['average_query_time_ms']:.1f}ms avg")
        
        # E2E Performance
        if "e2e_performance" in results and "performance_analysis" in results["e2e_performance"]:
            e2e_perf = results["e2e_performance"]["performance_analysis"].get("overview", {})
            if "avg_total_time_ms" in e2e_perf:
                print(f"   Booking Flow Time: {e2e_perf['avg_total_time_ms']:.1f}ms avg")
                print(f"   E2E Success Rate: {e2e_perf.get('success_rate', 0):.1%}")
        
        # Scalability projections
        if "scalability_analysis" in results and "projections" in results["scalability_analysis"]:
            print("\n🚀 SCALABILITY PROJECTIONS:")
            projections = results["scalability_analysis"]["projections"]
            
            for target in ["100_users", "1000_users", "10000_users"]:
                if target in projections:
                    proj = projections[target]
                    users = proj["target_concurrent_users"]
                    readiness = proj["production_readiness"]["level"]
                    readiness_emoji = "✅" if readiness == "ready" else "⚠️" if readiness == "needs_optimization" else "❌"
                    
                    print(f"   {users:,} users: {readiness_emoji} {readiness}")
                    
                    if "infrastructure_needs" in proj and "estimated_monthly_cost_usd" in proj["infrastructure_needs"]:
                        cost = proj["infrastructure_needs"]["estimated_monthly_cost_usd"]
                        print(f"      Infrastructure cost: ~${cost:,}/month")
        
        # Top recommendations
        print("\n📋 TOP RECOMMENDATIONS:")
        if "production_readiness" in results and "recommendations" in results["production_readiness"]:
            for i, rec in enumerate(results["production_readiness"]["recommendations"][:5], 1):
                print(f"   {i}. {rec}")
        
        print("\n" + "=" * 80)

async def main():
    """Main execution function"""
    
    # Parse command line arguments
    backend_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    frontend_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3000"
    
    print("🎯 BookedBarber V2 Performance Benchmark Suite")
    print(f"Backend: {backend_url}")
    print(f"Frontend: {frontend_url}")
    print("This comprehensive test will take 5-15 minutes depending on system performance.")
    print("=" * 80)
    
    # Run comprehensive benchmark
    runner = PerformanceBenchmarkRunner(backend_url, frontend_url)
    results = await runner.run_comprehensive_benchmark()
    
    # Save results
    filename = runner.save_results(results)
    
    # Print summary
    runner.print_summary(results)
    
    print(f"\n📄 Full detailed report saved to: {filename}")
    print("🎉 Performance benchmark complete!")

if __name__ == "__main__":
    asyncio.run(main())