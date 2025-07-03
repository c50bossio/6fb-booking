#!/usr/bin/env python3
"""
Review Management System Demo
Demonstrates all review management features with live API calls
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
TEST_EMAIL = "validation_test@example.com"
TEST_PASSWORD = "ValidTest123"

class ReviewSystemDemo:
    def __init__(self):
        self.headers = {"Content-Type": "application/json"}
        self.token = None
        
    def authenticate(self):
        """Get authentication token"""
        print("🔐 Authenticating...")
        login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
        
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data, headers=self.headers)
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers["Authorization"] = f"Bearer {self.token}"
            print(f"✅ Authentication successful!")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    def test_reviews_endpoint(self):
        """Test getting reviews with filters"""
        print("\n📋 Testing Reviews Endpoint...")
        
        # Test basic reviews fetch
        response = requests.get(f"{BASE_URL}/api/v1/reviews", headers=self.headers)
        print(f"GET /api/v1/reviews: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Reviews fetched successfully")
            print(f"   Total reviews: {data.get('total', 0)}")
            print(f"   Reviews returned: {len(data.get('reviews', []))}")
            print(f"   Has more: {data.get('has_more', False)}")
        else:
            print(f"Response: {response.text}")
            
        # Test with filters
        print("\n📊 Testing with filters...")
        params = {
            "platform": "google",
            "min_rating": 4,
            "limit": 10,
            "sort_by": "rating",
            "sort_order": "desc"
        }
        
        response = requests.get(f"{BASE_URL}/api/v1/reviews", headers=self.headers, params=params)
        print(f"GET /api/v1/reviews (with filters): {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Filtered reviews fetched successfully")
            print(f"   Filtered results: {len(data.get('reviews', []))}")

    def test_review_templates(self):
        """Test review response templates"""
        print("\n📝 Testing Review Templates...")
        
        # Get existing templates
        response = requests.get(f"{BASE_URL}/api/v1/reviews/templates", headers=self.headers)
        print(f"GET /api/v1/reviews/templates: {response.status_code}")
        
        if response.status_code == 200:
            templates = response.json()
            print(f"✅ Found {len(templates)} templates")
            for template in templates[:3]:  # Show first 3
                print(f"   - {template.get('name', 'Unnamed')}: {template.get('category', 'No category')}")
        
        # Create a new template
        print("\n➕ Creating new template...")
        template_data = {
            "name": "Demo Positive Response",
            "description": "Demo template for positive reviews",
            "category": "positive",
            "platform": "google",
            "template_text": "Thank you so much for the {rating}-star review, {reviewer_name}! We're thrilled you had such a great experience at {business_name}. Our team takes pride in providing excellent barbering services and we're glad it shows. We look forward to seeing you again soon!",
            "placeholders": ["rating", "reviewer_name", "business_name"],
            "min_rating": 4,
            "max_rating": 5,
            "seo_keywords": ["barber", "barbershop", "excellent", "professional"],
            "include_business_name": True,
            "include_cta": True,
            "cta_text": "Book your next appointment today!",
            "is_active": True,
            "priority": 1
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/reviews/templates", json=template_data, headers=self.headers)
        print(f"POST /api/v1/reviews/templates: {response.status_code}")
        
        if response.status_code == 200:
            template = response.json()
            print(f"✅ Template created: {template.get('name')}")
            print(f"   ID: {template.get('id')}")
            return template.get('id')
        else:
            print(f"Template creation failed: {response.text}")
            return None

    def test_review_sync(self):
        """Test review sync functionality"""
        print("\n🔄 Testing Review Sync...")
        
        sync_data = {
            "platform": "google",
            "date_range_days": 30,
            "sync_responses": True
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/reviews/sync", json=sync_data, headers=self.headers)
        print(f"POST /api/v1/reviews/sync: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sync completed successfully")
            print(f"   New reviews: {data.get('new_reviews', 0)}")
            print(f"   Updated reviews: {data.get('updated_reviews', 0)}")
            print(f"   Total after sync: {data.get('total_reviews_after_sync', 0)}")
        elif response.status_code == 400:
            print(f"⚠️  Sync not configured (expected): Google My Business integration not found")
        elif response.status_code == 404:
            print(f"⚠️  No integration found (expected for demo)")
        else:
            print(f"Sync response: {response.text}")

    def test_gmb_integration(self):
        """Test Google My Business integration endpoints"""
        print("\n🏢 Testing Google My Business Integration...")
        
        # Test GMB auth initiation
        auth_data = {
            "redirect_uri": "http://localhost:3000/integrations/gmb/callback"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/reviews/gmb/auth", json=auth_data, headers=self.headers)
        print(f"POST /api/v1/reviews/gmb/auth: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ OAuth URL generated successfully")
            print(f"   Auth URL: {data.get('auth_url', 'N/A')[:50]}...")
        else:
            print(f"GMB auth response: {response.text}")
            
        # Test GMB locations
        response = requests.get(f"{BASE_URL}/api/v1/reviews/gmb/locations", headers=self.headers)
        print(f"GET /api/v1/reviews/gmb/locations: {response.status_code}")
        
        if response.status_code == 404:
            print(f"⚠️  No GMB integration found (expected for demo)")
        elif response.status_code == 200:
            locations = response.json()
            print(f"✅ Found {len(locations)} GMB locations")

    def test_bulk_operations(self):
        """Test bulk review operations"""
        print("\n📦 Testing Bulk Operations...")
        
        # Test bulk response generation (will fail gracefully since no reviews exist)
        bulk_data = {
            "review_ids": [1, 2, 3],  # Demo IDs
            "template_id": None,  # Use auto-generation
            "business_name": "Demo Barbershop",
            "auto_send": False
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/reviews/bulk/respond", json=bulk_data, headers=self.headers)
        print(f"POST /api/v1/reviews/bulk/respond: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Bulk operation completed")
            print(f"   Successful: {data.get('successful_responses', 0)}")
            print(f"   Failed: {data.get('failed_responses', 0)}")
        else:
            print(f"Bulk operation response: {response.text}")

    def test_auto_response_stats(self):
        """Test auto-response statistics"""
        print("\n📊 Testing Auto-Response Stats...")
        
        response = requests.get(f"{BASE_URL}/api/v1/reviews/auto-response/stats", headers=self.headers)
        print(f"GET /api/v1/reviews/auto-response/stats: {response.status_code}")
        
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Auto-response stats retrieved")
            print(f"   Total auto-responses: {stats.get('total_auto_responses', 0)}")
            print(f"   Success rate: {stats.get('success_rate', 0)}%")
        else:
            print(f"Stats response: {response.text}")

    def show_api_endpoints(self):
        """Show all available review management endpoints"""
        print("\n🔗 Review Management API Endpoints:")
        endpoints = [
            "GET    /api/v1/reviews                     - Get reviews with filtering",
            "GET    /api/v1/reviews/{id}               - Get specific review",
            "POST   /api/v1/reviews/{id}/respond       - Create review response",
            "PUT    /api/v1/reviews/responses/{id}     - Update review response", 
            "POST   /api/v1/reviews/responses/{id}/send - Send review response",
            "",
            "GET    /api/v1/reviews/analytics          - Get review analytics",
            "POST   /api/v1/reviews/sync               - Sync reviews from platform",
            "",
            "GET    /api/v1/reviews/templates          - Get response templates",
            "POST   /api/v1/reviews/templates          - Create response template",
            "PUT    /api/v1/reviews/templates/{id}     - Update response template",
            "DELETE /api/v1/reviews/templates/{id}     - Delete response template",
            "POST   /api/v1/reviews/templates/{id}/generate - Generate response from template",
            "",
            "POST   /api/v1/reviews/bulk/respond       - Bulk generate responses",
            "GET    /api/v1/reviews/auto-response/stats - Auto-response statistics",
            "",
            "POST   /api/v1/reviews/gmb/auth           - Initiate GMB OAuth",
            "GET    /api/v1/reviews/gmb/locations      - Get GMB locations"
        ]
        
        for endpoint in endpoints:
            print(f"   {endpoint}")

    def run_demo(self):
        """Run complete review system demo"""
        print("🚀 Review Management System Demo")
        print("=" * 50)
        
        if not self.authenticate():
            return
            
        self.show_api_endpoints()
        self.test_reviews_endpoint()
        self.test_review_templates()
        self.test_review_sync()
        self.test_gmb_integration()
        self.test_bulk_operations()
        self.test_auto_response_stats()
        
        print("\n" + "=" * 50)
        print("🎉 Review Management System Demo Complete!")
        print("\n📱 Frontend Test Links:")
        print("   Integration Settings: http://localhost:3000/settings/integrations")
        print("   Marketing Tools: http://localhost:3000/marketing/booking-links")
        print("\n📚 API Documentation: http://localhost:8000/docs")

if __name__ == "__main__":
    demo = ReviewSystemDemo()
    demo.run_demo()