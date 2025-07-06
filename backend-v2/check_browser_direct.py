#\!/usr/bin/env python3
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

# Enable browser logging
caps = DesiredCapabilities.CHROME
caps['goog:loggingPrefs'] = {'browser': 'ALL'}

# Configure Chrome options
chrome_options = Options()
chrome_options.add_experimental_option("debuggerAddress", "localhost:9222")
chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

print("Connecting to Chrome and navigating to calendar...")
driver = webdriver.Chrome(options=chrome_options, desired_capabilities=caps)

# Navigate to calendar
driver.get("http://localhost:3000/calendar")
time.sleep(5)  # Wait for page to load

print(f"\nCurrent URL: {driver.current_url}")
print(f"Page Title: {driver.title}")

# Get console logs
print("\n=== JavaScript Console Logs ===")
logs = driver.get_log('browser')
for log in logs:
    print(f"[{log['level']}] {log['message']}")

# Check for React error boundary
print("\n=== Checking React Error Boundary ===")
error_check = driver.execute_script("""
    const errorElements = document.querySelectorAll('[class*="error"], [role="alert"]');
    const errors = [];
    errorElements.forEach(el => {
        if (el.textContent) errors.push(el.textContent);
    });
    return {
        hasErrors: errors.length > 0,
        errors: errors,
        bodyHTML: document.body.innerHTML.substring(0, 1000)
    };
""")

if error_check['hasErrors']:
    print("Errors found on page:")
    for error in error_check['errors']:
        print(f"  - {error}")
else:
    print("No error elements found")

print("\n=== Page Body Preview ===")
print(error_check['bodyHTML'][:500] + "...")

# Check for specific calendar loading issues
print("\n=== Calendar Component Check ===")
calendar_check = driver.execute_script("""
    return {
        hasUnifiedCalendar: \!\!document.querySelector('.unified-calendar, [class*="calendar"]'),
        hasLoadingIndicator: \!\!document.querySelector('[class*="loading"], [class*="skeleton"]'),
        hasDevHealthMonitor: \!\!document.querySelector('[class*="DevHealth"]'),
        reactRoot: \!\!document.getElementById('__next')
    };
""")
print(f"Has calendar component: {calendar_check['hasUnifiedCalendar']}")
print(f"Has loading indicator: {calendar_check['hasLoadingIndicator']}")
print(f"Has DevHealthMonitor: {calendar_check['hasDevHealthMonitor']}")
print(f"Has React root: {calendar_check['reactRoot']}")

print("\n=== Leaving browser open for inspection ===")
