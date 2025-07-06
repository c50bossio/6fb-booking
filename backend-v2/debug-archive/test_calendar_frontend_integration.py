#!/usr/bin/env python3
"""
Test calendar frontend integration with authentication and appointment display.
"""

import asyncio
import json
from datetime import datetime, timedelta
from playwright.async_api import async_playwright

async def test_frontend_login_and_calendar():
    """Test logging in and accessing the calendar with appointments"""
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False)  # Set to True for headless
        page = await browser.new_page()
        
        try:
            print("🌐 Testing Frontend Calendar Integration...")
            
            # Test 1: Login to the application
            print("\n1️⃣ Testing Login...")
            await page.goto('http://localhost:3000/login')
            await page.wait_for_load_state('networkidle')
            
            # Check if login page loads
            login_title = await page.title()
            print(f"   Login page title: {login_title}")
            
            # Fill login form with our test admin user
            await page.fill('input[type="email"]', 'admin@bookedbarber.com')
            await page.fill('input[type="password"]', 'admin123')  # Common test password
            
            # Click login button
            await page.click('button[type="submit"]')
            await page.wait_for_load_state('networkidle')
            
            # Check if we're redirected (successful login)
            current_url = page.url
            print(f"   Current URL after login: {current_url}")
            
            if 'login' in current_url:
                print("   ❌ Login failed - still on login page")
                
                # Try to find error messages
                error_elements = await page.query_selector_all('.error, .alert-error, [role="alert"]')
                if error_elements:
                    for element in error_elements:
                        text = await element.inner_text()
                        print(f"   Error message: {text}")
                
                # Take screenshot for debugging
                await page.screenshot(path='login_error.png')
                print("   📸 Screenshot saved as login_error.png")
                return False
            else:
                print("   ✅ Login successful!")
            
            # Test 2: Navigate to calendar
            print("\n2️⃣ Testing Calendar Access...")
            await page.goto('http://localhost:3000/calendar')
            await page.wait_for_load_state('networkidle')
            
            # Wait a bit for any async loading
            await page.wait_for_timeout(3000)
            
            # Check page title
            calendar_title = await page.title()
            print(f"   Calendar page title: {calendar_title}")
            
            # Check for permission denied or error messages
            permission_denied = await page.query_selector('text="Permission Denied"')
            if permission_denied:
                print("   ❌ Permission denied on calendar page")
                await page.screenshot(path='calendar_permission_denied.png')
                return False
            
            # Check for loading states
            loading_elements = await page.query_selector_all('text="Loading"')
            if loading_elements:
                print(f"   ⏳ Found {len(loading_elements)} loading elements")
                # Wait a bit more for loading to complete
                await page.wait_for_timeout(5000)
            
            # Test 3: Look for calendar components and appointments
            print("\n3️⃣ Testing Calendar Display...")
            
            # Look for calendar grid
            calendar_grid = await page.query_selector('.calendar-grid, .calendar-day-view, [data-testid="calendar"]')
            if calendar_grid:
                print("   ✅ Calendar grid found")
            else:
                print("   ❌ Calendar grid not found")
            
            # Look for appointments
            appointment_elements = await page.query_selector_all('.calendar-appointment, .appointment, [data-appointment-id]')
            print(f"   📅 Found {len(appointment_elements)} appointment elements")
            
            if appointment_elements:
                print("   ✅ Appointments are displaying!")
                
                # Get details of first few appointments
                for i, element in enumerate(appointment_elements[:3]):
                    try:
                        appointment_text = await element.inner_text()
                        appointment_id = await element.get_attribute('data-appointment-id')
                        print(f"      Appointment {i+1}: ID={appointment_id}, Text='{appointment_text[:50]}...'")
                    except Exception as e:
                        print(f"      Error reading appointment {i+1}: {e}")
                
                # Check if our test appointment (ID 52) is visible
                test_appointment = await page.query_selector('[data-appointment-id="52"]')
                if test_appointment:
                    print("   🎯 Test appointment ID 52 found in calendar!")
                    appointment_text = await test_appointment.inner_text()
                    print(f"      Content: {appointment_text}")
                else:
                    print("   ⚠️  Test appointment ID 52 not visible (might be on different date)")
            else:
                print("   ❌ No appointments displaying")
            
            # Test 4: Check console for errors
            print("\n4️⃣ Checking Console Errors...")
            
            # Enable console logging
            console_messages = []
            page.on('console', lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
            
            # Refresh to capture console messages
            await page.reload()
            await page.wait_for_load_state('networkidle')
            await page.wait_for_timeout(3000)
            
            # Report console errors
            errors = [msg for msg in console_messages if 'error' in msg.lower()]
            warnings = [msg for msg in console_messages if 'warn' in msg.lower()]
            
            print(f"   Errors: {len(errors)}")
            for error in errors[:5]:  # Show first 5 errors
                print(f"      {error}")
            
            print(f"   Warnings: {len(warnings)}")
            
            # Test 5: Test creating a new appointment
            print("\n5️⃣ Testing Appointment Creation...")
            
            # Look for "Add Appointment" or "+" button
            add_buttons = await page.query_selector_all('button:has-text("Add"), button[aria-label*="Add"], .add-appointment, [data-testid="add-appointment"]')
            plus_buttons = await page.query_selector_all('button:has(svg), .plus-icon')
            
            create_button = None
            for button in add_buttons + plus_buttons:
                text = await button.inner_text()
                aria_label = await button.get_attribute('aria-label')
                if 'add' in text.lower() or 'create' in text.lower() or (aria_label and 'add' in aria_label.lower()):
                    create_button = button
                    break
            
            if create_button:
                print("   ✅ Found appointment creation button")
                
                # Click to open modal
                await create_button.click()
                await page.wait_for_timeout(1000)
                
                # Check if modal opened
                modal = await page.query_selector('.modal, [role="dialog"], .appointment-modal')
                if modal:
                    print("   ✅ Appointment creation modal opened")
                    
                    # Take screenshot of modal
                    await page.screenshot(path='appointment_modal.png')
                    print("   📸 Modal screenshot saved as appointment_modal.png")
                else:
                    print("   ❌ Appointment creation modal did not open")
            else:
                print("   ❌ Appointment creation button not found")
            
            # Final screenshot
            await page.screenshot(path='calendar_final_state.png')
            print("\n📸 Final calendar screenshot saved as calendar_final_state.png")
            
            return True
            
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            await page.screenshot(path='test_error.png')
            return False
        
        finally:
            await browser.close()

async def main():
    """Run the frontend integration test"""
    print("🧪 Starting Calendar Frontend Integration Test")
    print("=" * 50)
    
    success = await test_frontend_login_and_calendar()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Frontend integration test completed!")
    else:
        print("⚠️  Frontend integration test encountered issues.")
    
    print("\nCheck the generated screenshots for visual verification:")
    print("- login_error.png (if login failed)")
    print("- calendar_permission_denied.png (if access denied)")
    print("- appointment_modal.png (if modal opened)")
    print("- calendar_final_state.png (final state)")

if __name__ == "__main__":
    asyncio.run(main())