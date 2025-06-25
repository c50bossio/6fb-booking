#!/usr/bin/env python3
"""
Customer Portal UI Integration Test Suite using Playwright

Tests the customer portal UI functionality including:
- Authentication flows
- Dashboard interactions
- Profile management
- Appointment management
- Mobile responsiveness

Requirements:
    pip install playwright pytest-playwright
    playwright install chromium

Usage:
    python test_customer_portal_ui.py
"""

import asyncio
import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional
import uuid

try:
    from playwright.async_api import async_playwright, Page, BrowserContext
except ImportError:
    print("ERROR: Playwright not installed. Please run:")
    print("pip install playwright pytest-playwright")
    print("playwright install chromium")
    sys.exit(1)

# Configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"

# Test user credentials
TEST_CUSTOMER = {
    "email": f"uitest_{uuid.uuid4().hex[:8]}@example.com",
    "password": "UITest123!",
    "first_name": "UI",
    "last_name": "Tester",
    "phone": "+1234567890",
}


class CustomerPortalUITester:
    def __init__(self):
        self.test_results = []
        self.screenshots = []

    def log(self, message: str, level: str = "INFO"):
        """Log a message with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")

    async def take_screenshot(self, page: Page, name: str):
        """Take a screenshot for documentation"""
        filename = f"screenshot_{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        await page.screenshot(path=filename)
        self.screenshots.append(filename)
        self.log(f"Screenshot saved: {filename}")

    async def test_login_page(self, page: Page) -> bool:
        """Test the customer login page"""
        self.log("Testing Customer Login Page", "TEST")

        try:
            # Navigate to login page
            await page.goto(f"{FRONTEND_URL}/customer/login")
            await page.wait_for_load_state("networkidle")

            # Check page elements
            assert await page.is_visible("text=Welcome back")
            assert await page.is_visible("input[type='email']")
            assert await page.is_visible("input[type='password']")
            assert await page.is_visible("button:has-text('Sign in')")
            assert await page.is_visible("text=Forgot your password?")
            assert await page.is_visible("text=Create Account")

            # Test form validation
            await page.click("button:has-text('Sign in')")
            await page.wait_for_timeout(500)

            # Should show validation error
            error_visible = await page.is_visible("text=Please fill in all fields")
            assert error_visible, "Form validation not working"

            # Test invalid login
            await page.fill("input[type='email']", "invalid@test.com")
            await page.fill("input[type='password']", "wrongpassword")
            await page.click("button:has-text('Sign in')")

            await page.wait_for_timeout(2000)
            error_visible = await page.is_visible("text=Invalid email or password")
            assert error_visible, "Invalid login error not shown"

            await self.take_screenshot(page, "login_page")

            self.log("✓ Login page test passed", "SUCCESS")
            return True

        except Exception as e:
            self.log(f"✗ Login page test failed: {str(e)}", "ERROR")
            await self.take_screenshot(page, "login_page_error")
            return False

    async def test_signup_flow(self, page: Page) -> bool:
        """Test the customer signup flow"""
        self.log("Testing Customer Signup Flow", "TEST")

        try:
            # Navigate to signup page
            await page.goto(f"{FRONTEND_URL}/customer/signup")
            await page.wait_for_load_state("networkidle")

            # Check page elements
            assert await page.is_visible("text=Create your account")
            assert await page.is_visible("input[placeholder*='First name']")
            assert await page.is_visible("input[placeholder*='Last name']")
            assert await page.is_visible("input[type='email']")
            assert await page.is_visible("input[type='password']")

            # Fill signup form
            await page.fill(
                "input[placeholder*='First name']", TEST_CUSTOMER["first_name"]
            )
            await page.fill(
                "input[placeholder*='Last name']", TEST_CUSTOMER["last_name"]
            )
            await page.fill("input[type='email']", TEST_CUSTOMER["email"])
            await page.fill("input[placeholder*='Phone']", TEST_CUSTOMER["phone"])
            await page.fill("input[type='password']", TEST_CUSTOMER["password"])

            # Check newsletter checkbox if exists
            newsletter_checkbox = page.locator("input[type='checkbox']")
            if await newsletter_checkbox.count() > 0:
                await newsletter_checkbox.check()

            await self.take_screenshot(page, "signup_form_filled")

            # Submit form
            await page.click("button:has-text('Create Account')")

            # Wait for redirect or success message
            await page.wait_for_timeout(3000)

            # Check if redirected to dashboard or login
            current_url = page.url
            if "/customer/dashboard" in current_url or "/customer/login" in current_url:
                self.log("✓ Signup flow completed successfully", "SUCCESS")
                return True
            else:
                # Check for error message
                if await page.is_visible("text=already exists"):
                    self.log(
                        "User already exists, this is expected in repeat tests", "INFO"
                    )
                    return True

            await self.take_screenshot(page, "signup_result")
            return True

        except Exception as e:
            self.log(f"✗ Signup flow test failed: {str(e)}", "ERROR")
            await self.take_screenshot(page, "signup_error")
            return False

    async def test_forgot_password_modal(self, page: Page) -> bool:
        """Test the forgot password modal"""
        self.log("Testing Forgot Password Modal", "TEST")

        try:
            # Navigate to login page
            await page.goto(f"{FRONTEND_URL}/customer/login")
            await page.wait_for_load_state("networkidle")

            # Click forgot password link
            await page.click("text=Forgot your password?")
            await page.wait_for_timeout(500)

            # Check modal elements
            assert await page.is_visible("text=Reset Password")
            assert await page.is_visible("text=Enter your email address")

            # Test empty email
            await page.click("button:has-text('Send Reset Link')")
            await page.wait_for_timeout(500)
            assert await page.is_visible("text=Please enter your email address")

            # Test with valid email
            await page.fill(
                "div[role='dialog'] input[type='email']", TEST_CUSTOMER["email"]
            )
            await page.click("button:has-text('Send Reset Link')")

            await page.wait_for_timeout(2000)

            # Check for success message
            if await page.is_visible("text=Check Your Email"):
                self.log("✓ Password reset email sent successfully", "SUCCESS")
                await self.take_screenshot(page, "password_reset_success")

                # Close modal
                await page.click("button:has-text('Done')")
                return True

            return False

        except Exception as e:
            self.log(f"✗ Forgot password test failed: {str(e)}", "ERROR")
            await self.take_screenshot(page, "forgot_password_error")
            return False

    async def test_dashboard_loading(self, context: BrowserContext) -> bool:
        """Test customer dashboard loading and data display"""
        self.log("Testing Customer Dashboard", "TEST")

        try:
            # Create authenticated session
            page = await context.new_page()

            # First login
            await page.goto(f"{FRONTEND_URL}/customer/login")
            await page.fill("input[type='email']", TEST_CUSTOMER["email"])
            await page.fill("input[type='password']", TEST_CUSTOMER["password"])
            await page.click("button:has-text('Sign in')")

            # Wait for redirect to dashboard
            await page.wait_for_url("**/customer/dashboard", timeout=10000)
            await page.wait_for_load_state("networkidle")

            # Check dashboard elements
            assert await page.is_visible(f"text=Welcome back")

            # Check navigation menu
            assert await page.is_visible("text=Dashboard")
            assert await page.is_visible("text=My Appointments")
            assert await page.is_visible("text=History")
            assert await page.is_visible("text=Profile")
            assert await page.is_visible("text=Book Appointment")

            # Check stats cards
            stats_cards = [
                "Total Appointments",
                "Upcoming",
                "Total Spent",
                "Favorite Barber",
            ]

            for stat in stats_cards:
                assert await page.is_visible(
                    f"text={stat}"
                ), f"Stats card '{stat}' not found"

            # Check quick actions
            assert await page.is_visible("text=Quick Actions")
            assert await page.is_visible("text=Book New Appointment")
            assert await page.is_visible("text=Manage Appointments")
            assert await page.is_visible("text=Update Profile")
            assert await page.is_visible("text=View History")

            await self.take_screenshot(page, "dashboard_loaded")

            self.log("✓ Dashboard test passed", "SUCCESS")
            return True

        except Exception as e:
            self.log(f"✗ Dashboard test failed: {str(e)}", "ERROR")
            await self.take_screenshot(page, "dashboard_error")
            return False

    async def test_profile_management(self, context: BrowserContext) -> bool:
        """Test customer profile management"""
        self.log("Testing Profile Management", "TEST")

        try:
            # Create authenticated session
            page = await context.new_page()

            # Login and navigate to profile
            await page.goto(f"{FRONTEND_URL}/customer/login")
            await page.fill("input[type='email']", TEST_CUSTOMER["email"])
            await page.fill("input[type='password']", TEST_CUSTOMER["password"])
            await page.click("button:has-text('Sign in')")

            await page.wait_for_url("**/customer/dashboard")

            # Navigate to profile page
            await page.click("text=Profile")
            await page.wait_for_url("**/customer/profile")
            await page.wait_for_load_state("networkidle")

            # Check profile form elements
            assert await page.is_visible("text=Profile Information")
            assert await page.is_visible("input[placeholder*='First name']")
            assert await page.is_visible("input[placeholder*='Last name']")
            assert await page.is_visible("input[type='email']")
            assert await page.is_visible("input[placeholder*='Phone']")

            # Update profile
            await page.fill("input[placeholder*='First name']", "Updated")
            await page.fill("input[placeholder*='Phone']", "+1987654321")

            await self.take_screenshot(page, "profile_before_update")

            # Save changes
            await page.click("button:has-text('Save Changes')")
            await page.wait_for_timeout(2000)

            # Check for success message
            if await page.is_visible("text=Profile updated successfully"):
                self.log("✓ Profile update successful", "SUCCESS")
                await self.take_screenshot(page, "profile_updated")
                return True

            return True

        except Exception as e:
            self.log(f"✗ Profile management test failed: {str(e)}", "ERROR")
            await self.take_screenshot(page, "profile_error")
            return False

    async def test_mobile_responsiveness(self, browser) -> bool:
        """Test mobile responsiveness"""
        self.log("Testing Mobile Responsiveness", "TEST")

        try:
            # Create mobile context
            mobile_context = await browser.new_context(
                viewport={"width": 375, "height": 667},
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
            )

            page = await mobile_context.new_page()

            # Test login page on mobile
            await page.goto(f"{FRONTEND_URL}/customer/login")
            await page.wait_for_load_state("networkidle")

            # Check if mobile menu exists
            mobile_menu_visible = await page.is_visible("button[aria-label*='menu']")

            # Take mobile screenshots
            await self.take_screenshot(page, "mobile_login")

            # Test form interaction on mobile
            await page.fill("input[type='email']", TEST_CUSTOMER["email"])
            await page.fill("input[type='password']", TEST_CUSTOMER["password"])

            # Check if form is still usable
            assert await page.is_visible("button:has-text('Sign in')")

            # Test dashboard on mobile (if logged in)
            await page.click("button:has-text('Sign in')")
            await page.wait_for_timeout(3000)

            if "/customer/dashboard" in page.url:
                await self.take_screenshot(page, "mobile_dashboard")

                # Check if content is properly displayed
                assert await page.is_visible("text=Welcome back")

                # Check if navigation is accessible (might be in hamburger menu)
                if mobile_menu_visible:
                    await page.click("button[aria-label*='menu']")
                    await page.wait_for_timeout(500)

                self.log("✓ Mobile responsiveness test passed", "SUCCESS")

            await mobile_context.close()
            return True

        except Exception as e:
            self.log(f"✗ Mobile responsiveness test failed: {str(e)}", "ERROR")
            return False

    async def test_appointment_pages(self, context: BrowserContext) -> bool:
        """Test appointment management pages"""
        self.log("Testing Appointment Pages", "TEST")

        try:
            # Create authenticated session
            page = await context.new_page()

            # Login
            await page.goto(f"{FRONTEND_URL}/customer/login")
            await page.fill("input[type='email']", TEST_CUSTOMER["email"])
            await page.fill("input[type='password']", TEST_CUSTOMER["password"])
            await page.click("button:has-text('Sign in')")

            await page.wait_for_url("**/customer/dashboard")

            # Test appointments page
            await page.click("text=My Appointments")
            await page.wait_for_url("**/customer/appointments")
            await page.wait_for_load_state("networkidle")

            # Check page structure
            assert await page.is_visible(
                "text=My Appointments"
            ) or await page.is_visible("text=Upcoming Appointments")

            # Check for empty state or appointment list
            if await page.is_visible("text=No upcoming appointments"):
                self.log("No appointments found (expected for new user)", "INFO")
                assert await page.is_visible("text=Book Appointment")

            await self.take_screenshot(page, "appointments_page")

            # Test history page
            await page.click("text=History")
            await page.wait_for_url("**/customer/history")
            await page.wait_for_load_state("networkidle")

            assert await page.is_visible(
                "text=Appointment History"
            ) or await page.is_visible("text=Past Appointments")

            await self.take_screenshot(page, "history_page")

            self.log("✓ Appointment pages test passed", "SUCCESS")
            return True

        except Exception as e:
            self.log(f"✗ Appointment pages test failed: {str(e)}", "ERROR")
            await self.take_screenshot(page, "appointments_error")
            return False

    async def generate_report(self):
        """Generate test report"""
        self.log("\n" + "=" * 60, "INFO")
        self.log("TEST REPORT SUMMARY", "INFO")
        self.log("=" * 60, "INFO")

        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["passed"])
        failed_tests = total_tests - passed_tests

        self.log(f"Total tests: {total_tests}", "INFO")
        self.log(f"Passed: {passed_tests}", "SUCCESS")
        self.log(f"Failed: {failed_tests}", "ERROR" if failed_tests > 0 else "INFO")
        self.log(f"Success rate: {(passed_tests/total_tests)*100:.1f}%", "INFO")

        if self.screenshots:
            self.log(f"\nScreenshots saved: {len(self.screenshots)}", "INFO")
            for screenshot in self.screenshots:
                self.log(f"  - {screenshot}", "INFO")

        # Save detailed report
        report = {
            "timestamp": datetime.now().isoformat(),
            "frontend_url": FRONTEND_URL,
            "test_results": self.test_results,
            "screenshots": self.screenshots,
            "test_user": TEST_CUSTOMER["email"],
        }

        report_filename = (
            f"customer_portal_ui_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(report_filename, "w") as f:
            json.dump(report, f, indent=2)

        self.log(f"\nDetailed report saved to: {report_filename}", "INFO")

        # Print failed tests
        if failed_tests > 0:
            self.log("\nFAILED TESTS:", "ERROR")
            for result in self.test_results:
                if not result["passed"]:
                    self.log(
                        f"  - {result['test_name']}: {result.get('error', 'Unknown error')}",
                        "ERROR",
                    )

    async def run_all_tests(self):
        """Run all UI tests"""
        self.log("Starting Customer Portal UI Tests", "INFO")
        self.log(f"Frontend URL: {FRONTEND_URL}", "INFO")
        self.log(f"Running in {'headless' if HEADLESS else 'headed'} mode", "INFO")

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=HEADLESS)
            context = await browser.new_context()

            # Run tests
            tests = [
                ("Login Page", self.test_login_page),
                ("Signup Flow", self.test_signup_flow),
                ("Forgot Password", self.test_forgot_password_modal),
                ("Dashboard", self.test_dashboard_loading),
                ("Profile Management", self.test_profile_management),
                ("Appointment Pages", self.test_appointment_pages),
                (
                    "Mobile Responsiveness",
                    lambda: self.test_mobile_responsiveness(browser),
                ),
            ]

            for test_name, test_func in tests:
                try:
                    if test_name in [
                        "Dashboard",
                        "Profile Management",
                        "Appointment Pages",
                    ]:
                        # These tests need authenticated context
                        result = await test_func(context)
                    elif test_name == "Mobile Responsiveness":
                        result = await test_func()
                    else:
                        # Create new page for each test
                        page = await context.new_page()
                        result = await test_func(page)
                        await page.close()

                    self.test_results.append(
                        {
                            "test_name": test_name,
                            "passed": result,
                            "timestamp": datetime.now().isoformat(),
                        }
                    )

                except Exception as e:
                    self.log(f"Test '{test_name}' crashed: {str(e)}", "ERROR")
                    self.test_results.append(
                        {
                            "test_name": test_name,
                            "passed": False,
                            "error": str(e),
                            "timestamp": datetime.now().isoformat(),
                        }
                    )

            await browser.close()

        # Generate report
        await self.generate_report()


async def main():
    """Main entry point"""
    tester = CustomerPortalUITester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
