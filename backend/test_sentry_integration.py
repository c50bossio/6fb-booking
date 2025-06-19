"""
Automated tests for Sentry integration
Run with: python3 test_sentry_integration.py
"""
import unittest
import sentry_sdk
from sentry_config import init_sentry
import time

class TestSentryIntegration(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        """Initialize Sentry for tests"""
        init_sentry()
        cls.test_errors = []
    
    def test_capture_exception(self):
        """Test that exceptions are captured"""
        try:
            raise ValueError("Test exception for Sentry")
        except Exception as e:
            event_id = sentry_sdk.capture_exception(e)
            self.assertIsNotNone(event_id)
            self.test_errors.append(event_id)
            print(f"✅ Exception captured with ID: {event_id}")
    
    def test_capture_message(self):
        """Test that messages are captured"""
        event_id = sentry_sdk.capture_message("Test message from unit tests", "info")
        self.assertIsNotNone(event_id)
        self.test_errors.append(event_id)
        print(f"✅ Message captured with ID: {event_id}")
    
    def test_breadcrumbs(self):
        """Test that breadcrumbs are recorded"""
        sentry_sdk.add_breadcrumb(
            category='test',
            message='Test breadcrumb',
            level='info',
            data={'test_id': '123'}
        )
        
        try:
            raise RuntimeError("Error with breadcrumbs")
        except Exception as e:
            event_id = sentry_sdk.capture_exception(e)
            self.assertIsNotNone(event_id)
            self.test_errors.append(event_id)
            print(f"✅ Exception with breadcrumbs captured: {event_id}")
    
    def test_context_and_tags(self):
        """Test context and tags"""
        sentry_sdk.set_tag("test_suite", "integration")
        sentry_sdk.set_user({"id": "test-user", "email": "test@example.com"})
        sentry_sdk.set_context("test_run", {
            "timestamp": time.time(),
            "environment": "test"
        })
        
        event_id = sentry_sdk.capture_message("Test with context", "info")
        self.assertIsNotNone(event_id)
        self.test_errors.append(event_id)
        print(f"✅ Context and tags test passed: {event_id}")
    
    def test_performance_transaction(self):
        """Test performance monitoring"""
        with sentry_sdk.start_transaction(op="test", name="test_transaction") as transaction:
            with sentry_sdk.start_span(op="test.step", description="First step"):
                time.sleep(0.1)  # Simulate work
            
            with sentry_sdk.start_span(op="test.step", description="Second step"):
                time.sleep(0.1)  # Simulate work
        
        print("✅ Performance transaction completed")
    
    @classmethod
    def tearDownClass(cls):
        """Report test results"""
        print(f"\n📊 Test Summary:")
        print(f"Total events sent to Sentry: {len(cls.test_errors)}")
        print(f"Event IDs: {cls.test_errors}")
        print("\n🔗 View in Sentry: https://sentry.io/organizations/sixfb/issues/?project=4509526819012608")

if __name__ == "__main__":
    print("🧪 Running Sentry Integration Tests...\n")
    unittest.main(verbosity=2)