#!/usr/bin/env python3
"""
Check browser console logs and network requests for the calendar page
"""
import asyncio
from pyppeteer import launch
import time

async def check_calendar_page():
    # Connect to existing Chrome instance
    browser = await launch(
        browserURL='http://localhost:9222',
        args=['--no-sandbox', '--disable-setuid-sandbox']
    )
    
    # Get all pages
    pages = await browser.pages()
    
    # Find or create calendar page
    calendar_page = None
    for page in pages:
        if 'calendar' in page.url:
            calendar_page = page
            break
    
    if not calendar_page:
        # Open new tab with calendar page
        calendar_page = await browser.newPage()
        
    # Enable console log collection
    console_logs = []
    calendar_page.on('console', lambda msg: console_logs.append({
        'type': msg.type,
        'text': msg.text,
        'time': time.time()
    }))
    
    # Enable request/response tracking
    network_logs = []
    
    async def log_request(request):
        network_logs.append({
            'type': 'request',
            'url': request.url,
            'method': request.method,
            'time': time.time()
        })
    
    async def log_response(response):
        network_logs.append({
            'type': 'response',
            'url': response.url,
            'status': response.status,
            'time': time.time()
        })
    
    async def log_request_failed(request):
        network_logs.append({
            'type': 'failed',
            'url': request.url,
            'error': request.failure()['errorText'] if request.failure() else 'Unknown error',
            'time': time.time()
        })
    
    calendar_page.on('request', log_request)
    calendar_page.on('response', log_response)
    calendar_page.on('requestfailed', log_request_failed)
    
    # Navigate to calendar page
    print("Navigating to http://localhost:3000/calendar...")
    try:
        response = await calendar_page.goto('http://localhost:3000/calendar', {
            'waitUntil': 'networkidle0',
            'timeout': 30000
        })
        print(f"Navigation response status: {response.status if response else 'No response'}")
    except Exception as e:
        print(f"Navigation error: {e}")
    
    # Wait a bit for any async operations
    await asyncio.sleep(3)
    
    # Get page errors
    try:
        errors = await calendar_page.evaluate('''() => {
            const errors = [];
            // Check for any error elements
            const errorElements = document.querySelectorAll('[class*="error"], [id*="error"]');
            errorElements.forEach(el => {
                if (el.textContent.trim()) {
                    errors.push(el.textContent.trim());
                }
            });
            return errors;
        }''')
        if errors:
            print("\nError elements found on page:")
            for error in errors:
                print(f"  - {error}")
    except Exception as e:
        print(f"Error checking page errors: {e}")
    
    # Print console logs
    print("\n=== Console Logs ===")
    if console_logs:
        for log in console_logs:
            print(f"[{log['type'].upper()}] {log['text']}")
    else:
        print("No console logs captured")
    
    # Print network logs
    print("\n=== Network Requests ===")
    failed_requests = [log for log in network_logs if log['type'] == 'failed']
    error_responses = [log for log in network_logs if log['type'] == 'response' and log['status'] >= 400]
    
    if failed_requests:
        print("\nFailed Requests:")
        for req in failed_requests:
            print(f"  - {req['url']} - Error: {req.get('error', 'Unknown')}")
    
    if error_responses:
        print("\nError Responses:")
        for resp in error_responses:
            print(f"  - {resp['status']} {resp['url']}")
    
    if not failed_requests and not error_responses:
        print("No failed requests or error responses")
    
    # Get current page content info
    try:
        page_info = await calendar_page.evaluate('''() => {
            return {
                title: document.title,
                url: window.location.href,
                bodyText: document.body ? document.body.innerText.substring(0, 200) : 'No body',
                hasCalendar: !!document.querySelector('[class*="calendar"], [id*="calendar"]')
            };
        }''')
        print(f"\n=== Page Info ===")
        print(f"Title: {page_info['title']}")
        print(f"URL: {page_info['url']}")
        print(f"Has calendar element: {page_info['hasCalendar']}")
        print(f"Body preview: {page_info['bodyText']}...")
    except Exception as e:
        print(f"Error getting page info: {e}")
    
    # Don't close the browser connection
    # await browser.disconnect()

if __name__ == "__main__":
    asyncio.run(check_calendar_page())