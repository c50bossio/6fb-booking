#!/usr/bin/env python3
"""
Test higher load with optimized system.
"""

import sys
from quick_load_test import QuickLoadTest

def test_various_loads():
    """Test different load levels to find optimal capacity."""
    tester = QuickLoadTest()
    
    test_levels = [30, 50, 75]
    results = []
    
    for num_users in test_levels:
        print(f"\n🚀 Testing {num_users} concurrent users...")
        
        # Reset results for each test
        tester.results = []
        
        success = tester.run_concurrent_test(num_users)
        
        # Simple result tracking
        successful_requests = [r for r in tester.results if r.get("success", False)]
        total_requests = len(tester.results)
        success_rate = len(successful_requests) / total_requests * 100 if total_requests > 0 else 0
        
        results.append({
            "users": num_users,
            "success_rate": success_rate,
            "total_requests": total_requests
        })
        
        # Stop testing if success rate drops below 70%
        if success_rate < 70:
            print(f"⚠️  Success rate dropped to {success_rate:.1f}% - stopping higher load tests")
            break
    
    print(f"\n📊 Load Test Summary:")
    print("=" * 40)
    for result in results:
        print(f"👥 {result['users']:2d} users: {result['success_rate']:5.1f}% success ({result['total_requests']} requests)")
    
    return results

if __name__ == "__main__":
    test_various_loads()