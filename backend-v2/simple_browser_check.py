#!/usr/bin/env python3
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Configure Chrome options
chrome_options = Options()
chrome_options.add_experimental_option("debuggerAddress", "localhost:9222")

print("Connecting to Chrome...")
driver = webdriver.Chrome(options=chrome_options)

# Navigate to calendar
print("Navigating to calendar page...")
driver.get("http://localhost:3000/calendar")
time.sleep(5)

print(f"\nCurrent URL: {driver.current_url}")
print(f"Page Title: {driver.title}")

# Execute JavaScript to check for errors
print("\n=== Checking for JavaScript errors ===")
js_errors = driver.execute_script("""
    // Check if there's a loading state
    const loadingText = document.body.innerText.includes('Loading...') ? 'Yes' : 'No';
    
    // Check for dev health monitor
    const devHealthText = Array.from(document.querySelectorAll('*'))
        .find(el => el.innerText && el.innerText.includes('Dev Health Monitor'));
    
    // Get any error messages
    const errorElements = document.querySelectorAll('[class*="error"], .text-red-500, [role="alert"]');
    const errors = Array.from(errorElements).map(el => el.innerText).filter(Boolean);
    
    // Check API health endpoint
    let apiStatus = 'Unknown';
    try {
        fetch('http://localhost:8000/api/v2/health').then(r => {
            console.log('API Health Status:', r.status);
        }).catch(e => {
            console.error('API Health Check Failed:', e);
        });
    } catch(e) {}
    
    return {
        url: window.location.href,
        hasLoadingText: loadingText,
        hasDevHealthMonitor: !!devHealthText,
        devHealthText: devHealthText ? devHealthText.innerText : null,
        errors: errors,
        bodyPreview: document.body.innerText.substring(0, 500)
    };
""")

print(f"Page has 'Loading...' text: {js_errors['hasLoadingText']}")
print(f"Has Dev Health Monitor: {js_errors['hasDevHealthMonitor']}")

if js_errors['devHealthText']:
    print(f"\nDev Health Monitor says:")
    print(js_errors['devHealthText'])

if js_errors['errors']:
    print(f"\nErrors found: {js_errors['errors']}")

print(f"\nPage content preview:")
print(js_errors['bodyPreview'])

# Try to check console logs one more time
print("\n=== Attempting to capture console logs ===")
try:
    # Inject console interceptor
    driver.execute_script("""
        if (!window._consoleLogs) {
            window._consoleLogs = [];
            const oldLog = console.log;
            const oldError = console.error;
            const oldWarn = console.warn;
            
            console.log = function(...args) {
                window._consoleLogs.push({type: 'log', message: args.join(' ')});
                oldLog.apply(console, args);
            };
            console.error = function(...args) {
                window._consoleLogs.push({type: 'error', message: args.join(' ')});
                oldError.apply(console, args);
            };
            console.warn = function(...args) {
                window._consoleLogs.push({type: 'warn', message: args.join(' ')});
                oldWarn.apply(console, args);
            };
        }
        
        // Trigger a refresh to capture logs
        console.log('Console interceptor installed');
    """)
    
    # Refresh page to capture logs
    driver.refresh()
    time.sleep(5)
    
    # Get captured logs
    captured_logs = driver.execute_script("return window._consoleLogs || [];")
    if captured_logs:
        print("Captured console logs:")
        for log in captured_logs:
            print(f"[{log['type'].upper()}] {log['message']}")
    else:
        print("No console logs captured")
        
except Exception as e:
    print(f"Could not capture console logs: {e}")

print("\n=== Browser left open for manual inspection ===")