#\!/usr/bin/env python3
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

chrome_options = Options()
chrome_options.add_experimental_option("debuggerAddress", "localhost:9222")

driver = webdriver.Chrome(options=chrome_options)

# Check network via Performance API
print("Checking API calls via Performance API...")
api_calls = driver.execute_script("""
    const entries = performance.getEntriesByType('resource');
    const apiCalls = entries.filter(e => e.name.includes('/api/'));
    return apiCalls.map(e => ({
        url: e.name,
        duration: Math.round(e.duration),
        transferSize: e.transferSize,
        status: e.responseStatus || 0
    }));
""")

print(f"\n=== Found {len(api_calls)} API calls ===")
for call in api_calls:
    status = call['status']
    icon = "✅" if status >= 200 and status < 300 else "❌"
    print(f"{icon} {call['url']}")
    print(f"   Status: {status}, Duration: {call['duration']}ms")

# Look for 404s specifically
print("\n=== Checking for 404 errors ===")
errors = driver.execute_script("""
    // Check Dev Health Monitor text
    const devHealth = document.querySelector('[class*="DevHealth"]');
    const devHealthText = devHealth ? devHealth.innerText : '';
    
    // Look for error indicators
    const hasNotFound = devHealthText.includes('Not Found');
    const hasRequestFailed = devHealthText.includes('Request Failed');
    
    return {
        devHealthText: devHealthText,
        hasNotFound: hasNotFound,
        hasRequestFailed: hasRequestFailed
    };
""")

if errors['hasNotFound']:
    print("❌ Dev Health Monitor shows 'Not Found' error")
    print(f"Full text: {errors['devHealthText']}")

# Try to identify which endpoint is failing
print("\n=== Checking console for errors ===")
driver.execute_script("console.error('TEST: Checking for API errors');")

print("\nBrowser left open for inspection")
