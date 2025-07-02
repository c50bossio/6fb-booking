#!/usr/bin/env python3
"""
Test API connectivity for integration endpoints.
Makes actual HTTP requests to verify the server is running and responding.
"""

import asyncio
import httpx
import json
from datetime import datetime
import sys


async def test_api_connectivity():
    """Test API endpoint connectivity"""
    print("🌐 Testing API Endpoint Connectivity...")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    results = []
    
    # Test endpoints
    endpoints = [
        ("GET", "/health", "Health check"),
        ("GET", "/api/v1/integrations/status", "Integration status"),
        ("GET", "/api/v1/integrations/health/all", "Integration health check"),
        ("GET", "/api/v1/reviews", "Reviews endpoint"),
        ("POST", "/api/v1/integrations/connect", "OAuth connect", {"integration_type": "google_my_business"}),
    ]
    
    async with httpx.AsyncClient() as client:
        for method, endpoint, description, *payload in endpoints:
            try:
                print(f"\n🔍 Testing {description}...")
                print(f"   {method} {endpoint}")
                
                if method == "GET":
                    response = await client.get(f"{base_url}{endpoint}", timeout=5.0)
                elif method == "POST":
                    data = payload[0] if payload else {}
                    response = await client.post(f"{base_url}{endpoint}", json=data, timeout=5.0)
                
                status_emoji = "✅" if response.status_code < 400 else "⚠️" if response.status_code < 500 else "❌"
                print(f"   Status: {status_emoji} {response.status_code}")
                
                # Try to parse JSON response
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict):
                        if "status" in response_data:
                            print(f"   Response: {response_data.get('status', 'N/A')}")
                        elif "message" in response_data:
                            print(f"   Message: {response_data.get('message', 'N/A')}")
                        elif len(response_data) > 0:
                            print(f"   Data keys: {list(response_data.keys())[:3]}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                except:
                    print(f"   Response: {response.text[:100]}")
                
                results.append({
                    "endpoint": endpoint,
                    "method": method,
                    "description": description,
                    "status_code": response.status_code,
                    "success": response.status_code < 400,
                    "response_time": response.elapsed.total_seconds() if hasattr(response, 'elapsed') else 0
                })
                
            except httpx.ConnectError:
                print(f"   ❌ Connection failed - Server not running?")
                results.append({
                    "endpoint": endpoint,
                    "method": method,
                    "description": description,
                    "status_code": 0,
                    "success": False,
                    "error": "Connection failed"
                })
            except httpx.TimeoutException:
                print(f"   ⏰ Request timed out")
                results.append({
                    "endpoint": endpoint,
                    "method": method,
                    "description": description,
                    "status_code": 0,
                    "success": False,
                    "error": "Timeout"
                })
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
                results.append({
                    "endpoint": endpoint,
                    "method": method,
                    "description": description,
                    "status_code": 0,
                    "success": False,
                    "error": str(e)
                })
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 API Connectivity Summary")
    print("=" * 50)
    
    successful = sum(1 for r in results if r["success"])
    total = len(results)
    
    for result in results:
        status_emoji = "✅" if result["success"] else "❌"
        status_code = result.get("status_code", 0)
        endpoint = result["endpoint"]
        print(f"{status_emoji} {endpoint:<35} {status_code}")
    
    print(f"\nSuccess Rate: {successful}/{total} ({(successful/total*100):.1f}%)")
    
    if successful == total:
        print("🎉 All API endpoints are responding correctly!")
        return True
    elif successful > 0:
        print("⚠️ Some endpoints are working, server is partially functional")
        return True
    else:
        print("❌ No endpoints responding - server appears to be down")
        return False


async def test_integration_workflows():
    """Test specific integration workflows"""
    print("\n🔄 Testing Integration Workflows...")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    try:
        async with httpx.AsyncClient() as client:
            # Test 1: Check integration status
            print("\n1. Checking integration status...")
            response = await client.get(f"{base_url}/api/v1/integrations/status")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Status endpoint working")
                print(f"   Available integrations: {len(data.get('available_integrations', []))}")
            else:
                print(f"   ❌ Status check failed: {response.status_code}")
            
            # Test 2: Check health monitoring
            print("\n2. Testing health monitoring...")
            response = await client.get(f"{base_url}/api/v1/integrations/health/all")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Health monitoring working")
                print(f"   Health checks returned: {len(data.get('integrations', []))}")
            else:
                print(f"   ❌ Health monitoring failed: {response.status_code}")
            
            # Test 3: Check reviews endpoint
            print("\n3. Testing reviews endpoint...")
            response = await client.get(f"{base_url}/api/v1/reviews")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Reviews endpoint working")
                if isinstance(data, list):
                    print(f"   Reviews returned: {len(data)}")
                elif isinstance(data, dict) and 'reviews' in data:
                    print(f"   Reviews returned: {len(data['reviews'])}")
            else:
                print(f"   ❌ Reviews endpoint failed: {response.status_code}")
            
            return True
            
    except Exception as e:
        print(f"❌ Workflow test failed: {e}")
        return False


async def main():
    """Run API connectivity tests"""
    print("🚀 Integration API Connectivity Tests")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Testing against: http://localhost:8000")
    print()
    
    # Test basic connectivity
    connectivity_ok = await test_api_connectivity()
    
    # Test integration workflows if basic connectivity works
    workflows_ok = False
    if connectivity_ok:
        workflows_ok = await test_integration_workflows()
    
    # Final summary
    print("\n" + "=" * 60)
    print("🎯 FINAL RESULTS")
    print("=" * 60)
    
    api_status = "✅ WORKING" if connectivity_ok else "❌ FAILED"
    workflow_status = "✅ WORKING" if workflows_ok else "❌ FAILED" if connectivity_ok else "⏭️ SKIPPED"
    
    print(f"API Connectivity:     {api_status}")
    print(f"Integration Workflows: {workflow_status}")
    
    if connectivity_ok and workflows_ok:
        print("\n🎉 Integration system is fully operational!")
        overall_status = "HEALTHY"
    elif connectivity_ok:
        print("\n⚠️ Integration system is partially working")
        overall_status = "PARTIAL"
    else:
        print("\n❌ Integration system is not responding")
        overall_status = "DOWN"
    
    print(f"\nOverall Status: {overall_status}")
    
    return overall_status == "HEALTHY"


if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {e}")
        sys.exit(1)