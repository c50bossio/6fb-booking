#!/usr/bin/env python3
"""
Simple test to verify registration page password requirements
"""
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys

def test_registration():
    print("🚀 Starting registration validation test...\n")
    
    # Setup Chrome driver
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    try:
        driver = webdriver.Chrome(options=options)
        driver.set_window_size(1280, 800)
        
        # Navigate to registration page
        print("📍 Navigating to registration page...")
        driver.get("http://localhost:3001/register")
        time.sleep(3)
        
        # Step 1: Check password requirements display
        print("\n📋 Checking password requirements display...")
        
        try:
            # Find all requirement list items
            req_elements = driver.find_elements(By.CSS_SELECTOR, ".text-xs.text-muted-foreground li")
            requirements = [elem.text for elem in req_elements]
            
            print("Password requirements found:")
            for req in requirements:
                print(f"  • {req}")
            
            # Verify the requirements
            has_min_length = any("At least 8 characters" in req for req in requirements)
            has_uppercase = any("One uppercase letter" in req for req in requirements)
            has_lowercase = any("One lowercase letter" in req for req in requirements)
            has_number = any("One number" in req for req in requirements)
            has_special = any("One special character" in req for req in requirements)
            
            print("\n✅ Requirement Checks:")
            print(f"  • 8 character minimum: {'✅' if has_min_length else '❌'}")
            print(f"  • Uppercase requirement: {'✅' if has_uppercase else '❌'}")
            print(f"  • Lowercase requirement: {'✅' if has_lowercase else '❌'}")
            print(f"  • Number requirement: {'✅' if has_number else '❌'}")
            print(f"  • Special character requirement: {'✅' if has_special else '❌'}")
            
        except Exception as e:
            print(f"❌ Error checking requirements: {e}")
        
        # Step 2: Test real-time validation
        print("\n🔍 Testing real-time password validation...")
        
        try:
            password_input = driver.find_element(By.NAME, "password")
            
            # Test different password combinations
            test_passwords = [
                ("pass", "Testing 'pass' - all should be unchecked"),
                ("Pass", "Testing 'Pass' - uppercase should be checked"),
                ("Pass1", "Testing 'Pass1' - uppercase and number should be checked"),
                ("Pass123!", "Testing 'Pass123!' - all should be checked")
            ]
            
            for pwd, description in test_passwords:
                print(f"\n  {description}...")
                
                # Clear and type password
                password_input.clear()
                password_input.send_keys(pwd)
                time.sleep(1)
                
                # Check validation state
                validation_items = driver.find_elements(By.CSS_SELECTOR, ".text-xs.text-muted-foreground li")
                print("  Validation state:")
                
                for item in validation_items:
                    # Check if item has green checkmark
                    has_check = len(item.find_elements(By.CSS_SELECTOR, "svg.text-green-500")) > 0
                    print(f"    • {item.text}: {'✅' if has_check else '❌'}")
        
        except Exception as e:
            print(f"❌ Error testing validation: {e}")
        
        # Step 3: Fill out complete form and submit
        print("\n📝 Filling out complete registration form...")
        
        try:
            timestamp = int(time.time())
            test_email = f"test.{timestamp}@example.com"
            
            # Fill form fields
            driver.find_element(By.NAME, "name").send_keys("Test User")
            driver.find_element(By.NAME, "email").send_keys(test_email)
            
            # Select user type (client)
            client_radio = driver.find_element(By.CSS_SELECTOR, 'input[value="client"]')
            client_radio.click()
            
            # Password is already filled from previous test
            password_input.clear()
            password_input.send_keys("Pass123!")
            
            # Confirm password
            driver.find_element(By.NAME, "confirmPassword").send_keys("Pass123!")
            
            # Check consent boxes
            checkboxes = driver.find_elements(By.CSS_SELECTOR, 'input[type="checkbox"][required]')
            for checkbox in checkboxes:
                if not checkbox.is_selected():
                    checkbox.click()
            
            print("\n  Form filled with:")
            print(f"    • Name: Test User")
            print(f"    • Email: {test_email}")
            print(f"    • User Type: client")
            print(f"    • Password: Pass123!")
            print(f"    • Consent boxes: checked")
            
            # Submit form
            print("\n🚀 Submitting registration form...")
            submit_button = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
            submit_button.click()
            
            # Wait for navigation or error
            time.sleep(5)
            
            # Check current URL
            current_url = driver.current_url
            print(f"\n📍 Current URL: {current_url}")
            
            if "check-email" in current_url:
                print("✅ Successfully redirected to check-email page!")
                print("✅ Registration completed successfully!")
            else:
                print("❌ Did not redirect to check-email page")
                
                # Check for error messages
                try:
                    error_elements = driver.find_elements(By.CSS_SELECTOR, ".text-destructive, .text-red-500, [role='alert']")
                    if error_elements:
                        print("\n❌ Error messages found:")
                        for elem in error_elements:
                            if elem.text:
                                print(f"  • {elem.text}")
                except:
                    pass
            
            # Take screenshot
            driver.save_screenshot("registration_test_result.png")
            print("\n📸 Screenshot saved as registration_test_result.png")
            
        except Exception as e:
            print(f"❌ Error during form submission: {e}")
            
    except Exception as e:
        print(f"❌ Test error: {e}")
    
    finally:
        print("\n🏁 Test completed.")
        # Keep browser open for 10 seconds for inspection
        time.sleep(10)
        driver.quit()

if __name__ == "__main__":
    test_registration()