#\!/usr/bin/env python3
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Configure Chrome options
chrome_options = Options()
chrome_options.add_experimental_option("debuggerAddress", "localhost:9222")

print("Connecting to Chrome...")
driver = webdriver.Chrome(options=chrome_options)

# Navigate to calendar if not already there
if 'calendar' not in driver.current_url:
    driver.get("http://localhost:3000/calendar")
    time.sleep(3)

# Inject network monitoring
print("\n=== Injecting network monitor ===")
driver.execute_script("""
    window._networkRequests = [];
    
    // Override fetch to capture requests
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        const startTime = Date.now();
        try {
            const response = await originalFetch.apply(this, args);
            const duration = Date.now() - startTime;
            
            window._networkRequests.push({
                url: url,
                method: options.method || 'GET',
                status: response.status,
                statusText: response.statusText,
                duration: duration,
                timestamp: new Date().toISOString(),
                ok: response.ok
            });
            
            if (\!response.ok) {
                console.error(`API Error: ${options.method || 'GET'} ${url} - ${response.status} ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            window._networkRequests.push({
                url: url,
                method: options.method || 'GET',
                status: 0,
                statusText: error.message,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                ok: false,
                error: true
            });
            throw error;
        }
    };
    
    console.log('Network monitor installed');
""")

# Refresh to capture network requests
print("Refreshing page to capture network requests...")
driver.refresh()
time.sleep(5)

# Get captured requests
captured_requests = driver.execute_script("return window._networkRequests || [];")

print(f"\n=== Captured {len(captured_requests)} API requests ===")
for req in captured_requests:
    status_icon = "✅" if req['ok'] else "❌"
    print(f"{status_icon} {req['method']} {req['url']}")
    print(f"   Status: {req['status']} {req['statusText']} ({req['duration']}ms)")
    if not req['ok']:
        print(f"   ERROR: Request failed")
    print()

# Check for specific 404 errors
not_found_requests = [req for req in captured_requests if req['status'] == 404]
if not_found_requests:
    print("\n=== 404 Not Found Errors ===")
    for req in not_found_requests:
        print(f"❌ {req['method']} {req['url']}")

# Check current page state
page_state = driver.execute_script("""
    return {
        hasCalendar: \!\!document.querySelector('.unified-calendar, [class*="UnifiedCalendar"]'),
        appointmentCount: document.querySelectorAll('[class*="appointment"], [class*="Appointment"]').length,
        hasErrors: document.body.innerText.includes('Error') || document.body.innerText.includes('error'),
        devHealthStatus: document.querySelector('[class*="DevHealth"]')?.innerText || 'Not found'
    };
""")

print(f"\n=== Page State ===")
print(f"Has calendar component: {page_state['hasCalendar']}")
print(f"Visible appointments: {page_state['appointmentCount']}")
print(f"Has error text: {page_state['hasErrors']}")

print("\n=== Browser left open for inspection ===")
