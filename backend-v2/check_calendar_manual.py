#!/usr/bin/env python3
"""
Manual browser checker using Selenium
"""
import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

def check_calendar_page():
    # Configure Chrome options
    chrome_options = Options()
    chrome_options.add_experimental_option("debuggerAddress", "localhost:9222")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    print("Connecting to Chrome...")
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        # Navigate to calendar page
        print("\nNavigating to http://localhost:3000/calendar...")
        driver.get("http://localhost:3000/calendar")
        
        # Wait for page to load or redirect
        time.sleep(3)
        
        # Get current URL after any redirects
        current_url = driver.current_url
        print(f"Current URL: {current_url}")
        
        # Get page title
        print(f"Page Title: {driver.title}")
        
        # Get console logs
        logs = driver.get_log('browser')
        if logs:
            print("\n=== Browser Console Logs ===")
            for log in logs:
                level = log['level']
                message = log['message']
                print(f"[{level}] {message}")
        else:
            print("\nNo console logs found")
        
        # Check for error elements on the page
        print("\n=== Checking for error elements ===")
        error_selectors = [
            "[class*='error']",
            "[id*='error']",
            ".text-red-500",
            ".text-destructive",
            "[role='alert']"
        ]
        
        for selector in error_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                for elem in elements:
                    text = elem.text.strip()
                    if text:
                        print(f"Error element found ({selector}): {text}")
            except Exception as e:
                pass
        
        # Check network errors by evaluating JavaScript
        print("\n=== Checking Network Activity ===")
        network_script = """
        return window.performance.getEntriesByType('resource')
            .filter(e => e.responseStatus >= 400 || e.responseStatus === 0)
            .map(e => ({
                url: e.name,
                status: e.responseStatus,
                duration: e.duration
            }));
        """
        
        try:
            failed_requests = driver.execute_script(network_script)
            if failed_requests:
                print("Failed network requests:")
                for req in failed_requests:
                    print(f"  - {req['status']} {req['url']}")
            else:
                print("No failed network requests detected")
        except Exception as e:
            print(f"Could not check network activity: {e}")
        
        # Check if we're on login page
        if "/login" in current_url:
            print("\n=== Redirected to Login Page ===")
            print("The calendar page requires authentication.")
            
            # Check if there's a test account we can use
            print("\nChecking for test login credentials...")
            
            # Try to login with test credentials
            try:
                email_input = driver.find_element(By.NAME, "email")
                password_input = driver.find_element(By.NAME, "password")
                
                # Use test credentials
                email_input.send_keys("admin@6fb-booking.com")
                password_input.send_keys("test123")
                
                # Find and click login button
                login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                login_button.click()
                
                print("Attempted login with test credentials...")
                time.sleep(3)
                
                # Check if login was successful
                if "/calendar" in driver.current_url:
                    print("Login successful! Now on calendar page.")
                    
                    # Get console logs after navigation
                    logs = driver.get_log('browser')
                    if logs:
                        print("\n=== Calendar Page Console Logs ===")
                        for log in logs:
                            print(f"[{log['level']}] {log['message']}")
                else:
                    print(f"Login failed or redirected to: {driver.current_url}")
                    
            except NoSuchElementException:
                print("Could not find login form elements")
            except Exception as e:
                print(f"Error during login attempt: {e}")
        
        # Get page source preview
        print("\n=== Page Content Preview ===")
        body_text = driver.find_element(By.TAG_NAME, "body").text
        preview = body_text[:500] if body_text else "No body text"
        print(f"{preview}...")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Don't close the browser
        print("\n=== Browser left open for manual inspection ===")
        print("You can manually inspect the page in the Chrome window.")

if __name__ == "__main__":
    check_calendar_page()