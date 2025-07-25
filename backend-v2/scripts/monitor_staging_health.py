#!/usr/bin/env python3
"""
Staging Environment Health Monitor
Real-time monitoring script for BookedBarber V2 staging infrastructure.
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, Any
import time

class StagingHealthMonitor:
    def __init__(self):
        self.endpoints = {
            "backend": "https://sixfb-backend-v2-staging.onrender.com",
            "frontend": "https://sixfb-frontend-v2-staging.onrender.com"
        }
        
        self.health_checks = [
            {"path": "/", "name": "Root endpoint"},
            {"path": "/health", "name": "Health check"},
            {"path": "/api/v2/health/", "name": "API health check"},
            {"path": "/docs", "name": "API documentation"},
        ]
    
    async def check_endpoint(self, session: aiohttp.ClientSession, service: str, base_url: str, check: Dict[str, str]) -> Dict[str, Any]:
        """Check a single endpoint"""
        url = f"{base_url}{check['path']}"
        result = {
            "service": service,
            "endpoint": check["name"],
            "url": url,
            "timestamp": datetime.now().isoformat(),
            "status_code": None,
            "response_time_ms": None,
            "error": None,
            "headers": {},
            "success": False
        }
        
        start_time = time.time()
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                result["status_code"] = response.status
                result["response_time_ms"] = round((time.time() - start_time) * 1000, 2)
                result["headers"] = dict(response.headers)
                result["success"] = 200 <= response.status < 400
                
                # Try to get response body for error analysis
                if response.status >= 400:
                    try:
                        text = await response.text()
                        result["error_body"] = text[:500]  # First 500 chars
                    except:
                        pass
                        
        except asyncio.TimeoutError:
            result["error"] = "Request timeout (10s)"
            result["response_time_ms"] = round((time.time() - start_time) * 1000, 2)
        except Exception as e:
            result["error"] = str(e)
            result["response_time_ms"] = round((time.time() - start_time) * 1000, 2)
        
        return result
    
    async def run_health_check(self) -> Dict[str, Any]:
        """Run complete health check on all services"""
        print(f"🔍 Running staging health check at {datetime.now().strftime('%H:%M:%S')}")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "results": [],
            "summary": {
                "total_checks": 0,
                "successful": 0,
                "failed": 0,
                "services_status": {}
            }
        }
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            
            # Create tasks for all endpoint checks
            for service, base_url in self.endpoints.items():
                for check in self.health_checks:
                    task = self.check_endpoint(session, service, base_url, check)
                    tasks.append(task)
            
            # Execute all checks concurrently
            check_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for result in check_results:
                if isinstance(result, Exception):
                    print(f"❌ Check failed with exception: {result}")
                    continue
                    
                results["results"].append(result)
                results["summary"]["total_checks"] += 1
                
                if result["success"]:
                    results["summary"]["successful"] += 1
                    status_emoji = "✅"
                else:
                    results["summary"]["failed"] += 1
                    status_emoji = "❌"
                
                # Print real-time status
                print(f"{status_emoji} {result['service']:<10} {result['endpoint']:<20} "
                      f"[{result['status_code'] or 'ERR'}] {result['response_time_ms'] or 0:>6.1f}ms")
                
                if result.get("error"):
                    print(f"   └─ Error: {result['error']}")
        
        # Calculate service-level status
        for service in self.endpoints.keys():
            service_results = [r for r in results["results"] if r["service"] == service]
            successful = sum(1 for r in service_results if r["success"])
            total = len(service_results)
            
            results["summary"]["services_status"][service] = {
                "healthy": successful == total,
                "success_rate": round(successful / total * 100, 1) if total > 0 else 0,
                "successful": successful,
                "total": total
            }
        
        return results
    
    def print_summary(self, results: Dict[str, Any]):
        """Print health check summary"""
        summary = results["summary"]
        print(f"\n📊 Health Check Summary:")
        print(f"   Total Checks: {summary['total_checks']}")
        print(f"   Successful: {summary['successful']} ✅")
        print(f"   Failed: {summary['failed']} ❌")
        print(f"   Success Rate: {round(summary['successful'] / summary['total_checks'] * 100, 1)}%")
        
        print(f"\n🔧 Service Status:")
        for service, status in summary["services_status"].items():
            emoji = "✅" if status["healthy"] else "❌"
            print(f"   {emoji} {service:<10} {status['success_rate']:>5.1f}% ({status['successful']}/{status['total']})")
    
    async def continuous_monitoring(self, interval_seconds: int = 30):
        """Run continuous monitoring"""
        print(f"🚀 Starting continuous staging health monitoring (every {interval_seconds}s)")
        print("Press Ctrl+C to stop\n")
        
        try:
            while True:
                results = await self.run_health_check()
                self.print_summary(results)
                
                # Save results to file
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"staging_health_{timestamp}.json"
                
                with open(filename, 'w') as f:
                    json.dump(results, f, indent=2)
                
                print(f"📝 Results saved to: {filename}")
                print("-" * 60)
                
                await asyncio.sleep(interval_seconds)
                
        except KeyboardInterrupt:
            print("\n👋 Monitoring stopped by user")

async def main():
    """Main function"""
    import sys
    
    monitor = StagingHealthMonitor()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--continuous":
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        await monitor.continuous_monitoring(interval)
    else:
        # Single health check
        results = await monitor.run_health_check()
        monitor.print_summary(results)
        
        # Check for critical issues
        if results["summary"]["failed"] > 0:
            print(f"\n⚠️  Found {results['summary']['failed']} failed checks. Please investigate:")
            for result in results["results"]:
                if not result["success"]:
                    status_code = result.get('status_code', 'N/A')
                    error_msg = result.get('error', f'HTTP {status_code}')
                    print(f"   • {result['service']} {result['endpoint']}: {error_msg}")

if __name__ == "__main__":
    asyncio.run(main())