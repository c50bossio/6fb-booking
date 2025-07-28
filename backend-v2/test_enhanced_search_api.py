#!/usr/bin/env python3
"""
API Test for Enhanced Semantic Search

Tests the enhanced search API endpoints to ensure they work correctly.
"""

import requests
import json
import time
from typing import Dict, Any


def test_enhanced_search_api():
    """Test the enhanced search API endpoints"""
    
    base_url = "http://localhost:8000"
    
    # Test authentication (you might need to adjust this)
    auth_headers = {
        "Authorization": "Bearer your_test_token_here",
        "Content-Type": "application/json"
    }
    
    print("🧪 Testing Enhanced Search API")
    print("=" * 50)
    
    # Test 1: Enhanced barber search
    print("\n1. Testing Enhanced Barber Search")
    print("-" * 40)
    
    search_params = {
        "q": "experienced barber",
        "limit": 5,
        "search_type": "hybrid",
        "min_similarity": 0.5,
        "session_id": "test_session_123"
    }
    
    try:
        response = requests.get(
            f"{base_url}/api/v2/search/enhanced/barbers",
            params=search_params,
            headers=auth_headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Search successful")
            print(f"   Query: {data['query']}")
            print(f"   Results: {data['total']}")
            print(f"   Search type: {data['search_type']}")
            print(f"   Response time: {data['took_ms']}ms")
            
            if data['results']:
                print("   Top results:")
                for result in data['results'][:3]:
                    print(f"     - {result['title']} (Score: {result['similarity_score']:.3f})")
            
            # Show analytics
            if 'analytics' in data and data['analytics']:
                analytics = data['analytics']
                print(f"   Analytics:")
                print(f"     - Semantic results: {analytics.get('semantic_results', 0)}")
                print(f"     - Keyword results: {analytics.get('keyword_results', 0)}")
                print(f"     - Avg similarity: {analytics.get('avg_similarity', 0):.3f}")
            
        else:
            print(f"❌ Search failed: {response.status_code}")
            print(f"   Error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    
    # Test 2: Search analytics
    print("\n2. Testing Search Analytics")
    print("-" * 40)
    
    try:
        response = requests.get(
            f"{base_url}/api/v2/search/analytics/query-performance",
            params={"limit": 10},
            headers=auth_headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Analytics retrieved successfully")
            
            if 'summary' in data:
                summary = data['summary']
                print(f"   Total searches: {summary.get('total_searches', 0)}")
                print(f"   Avg response time: {summary.get('avg_response_time_ms', 0):.1f}ms")
                print(f"   Success rate: {summary.get('success_rate', 0):.1f}%")
                
                print(f"   Search types:")
                print(f"     - Semantic: {summary.get('semantic_searches', 0)}")
                print(f"     - Keyword: {summary.get('keyword_searches', 0)}")
                print(f"     - Hybrid: {summary.get('hybrid_searches', 0)}")
            
            if 'popular_queries' in data and data['popular_queries']:
                print("   Popular queries:")
                for query in data['popular_queries'][:3]:
                    print(f"     - '{query['query']}' ({query['search_count']} searches)")
                    
        else:
            print(f"❌ Analytics failed: {response.status_code}")
            print(f"   Error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Analytics request failed: {e}")
    
    # Test 3: Click tracking
    print("\n3. Testing Click Tracking")
    print("-" * 40)
    
    click_data = {
        "query": "experienced barber",
        "result_id": 1,
        "result_type": "barber",
        "position": 1,
        "similarity_score": 0.85,
        "time_to_click_ms": 1500,
        "session_id": "test_session_123"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/v2/search/analytics/click-tracking",
            json=click_data,
            headers=auth_headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Click tracking successful")
            print(f"   Status: {data.get('status')}")
            print(f"   Message: {data.get('message')}")
        else:
            print(f"❌ Click tracking failed: {response.status_code}")
            print(f"   Error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Click tracking request failed: {e}")
    
    # Test 4: Different search types
    print("\n4. Testing Different Search Types")
    print("-" * 40)
    
    search_types = ["semantic", "keyword", "hybrid"]
    query = "beard specialist"
    
    for search_type in search_types:
        try:
            params = {
                "q": query,
                "limit": 3,
                "search_type": search_type,
                "session_id": f"test_{search_type}"
            }
            
            start_time = time.time()
            response = requests.get(
                f"{base_url}/api/v2/search/enhanced/barbers",
                params=params,
                headers=auth_headers,
                timeout=10
            )
            end_time = time.time()
            
            if response.status_code == 200:
                data = response.json()
                print(f"   {search_type.capitalize()}: {data['total']} results in {(end_time-start_time)*1000:.0f}ms")
            else:
                print(f"   {search_type.capitalize()}: Failed ({response.status_code})")
                
        except requests.exceptions.RequestException as e:
            print(f"   {search_type.capitalize()}: Request failed")
    
    print("\n✅ API testing completed!")


def test_server_availability():
    """Test if the server is running"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running")
            return True
        else:
            print(f"❌ Server returned {response.status_code}")
            return False
    except requests.exceptions.RequestException:
        print("❌ Server is not accessible at http://localhost:8000")
        print("   Please make sure the backend server is running:")
        print("   cd backend-v2 && uvicorn main:app --reload")
        return False


if __name__ == "__main__":
    print("🚀 Enhanced Search API Tests")
    
    # Check server availability
    if not test_server_availability():
        exit(1)
    
    # Note about authentication
    print("\n📝 Note: You may need to update the auth_headers")
    print("   with a valid JWT token for your test user")
    
    # Run tests
    test_enhanced_search_api()