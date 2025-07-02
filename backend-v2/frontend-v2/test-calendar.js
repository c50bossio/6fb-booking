const puppeteer = require('puppeteer');

async function testCalendarPage() {
    console.log('🚀 Starting calendar frontend test...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false, // Set to true for headless mode
            devtools: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Listen for console messages (including errors)
        const consoleMessages = [];
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            consoleMessages.push({ type, text });
            console.log(`📊 Console [${type.toUpperCase()}]: ${text}`);
        });
        
        // Listen for network requests
        const networkRequests = [];
        page.on('request', request => {
            if (request.url().includes('appointment') || request.url().includes('calendar')) {
                networkRequests.push({
                    url: request.url(),
                    method: request.method()
                });
                console.log(`🌐 Network Request: ${request.method()} ${request.url()}`);
            }
        });
        
        // Listen for network responses
        page.on('response', response => {
            if (response.url().includes('appointment') || response.url().includes('calendar')) {
                console.log(`📡 Network Response: ${response.status()} ${response.url()}`);
            }
        });
        
        // Set viewport
        await page.setViewport({ width: 1280, height: 720 });
        
        console.log('🌐 Navigating to calendar page...');
        
        // Navigate to calendar page
        await page.goto('http://localhost:3000/calendar', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        console.log('✅ Calendar page loaded successfully');
        
        // Wait a bit for any dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for common calendar elements
        console.log('\n🔍 Checking for calendar elements...');
        
        // Check if calendar container exists
        const calendarContainer = await page.$('[data-testid="calendar"], .calendar, [class*="calendar"]');
        console.log(`📅 Calendar container found: ${!!calendarContainer}`);
        
        // Check for appointment elements
        const appointmentElements = await page.$$('[data-testid="appointment"], .appointment, [class*="appointment"]');
        console.log(`📋 Appointment elements found: ${appointmentElements.length}`);
        
        // Check for loading states
        const loadingElements = await page.$$('[data-testid="loading"], .loading, .spinner');
        console.log(`⏳ Loading elements found: ${loadingElements.length}`);
        
        // Check for error messages
        const errorElements = await page.$$('[data-testid="error"], .error, [class*="error"]');
        console.log(`❌ Error elements found: ${errorElements.length}`);
        
        // Try to find specific appointment data
        console.log('\n🔍 Searching for appointment data...');
        
        // Look for appointment ID 52 specifically
        const appointment52 = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('52') || text.includes('appointment');
        });
        console.log(`🎯 Appointment ID 52 or appointment text found: ${appointment52}`);
        
        // Check for any data attributes that might contain appointment info
        const dataElements = await page.evaluate(() => {
            const elements = document.querySelectorAll('[data-appointment-id], [data-id]');
            return Array.from(elements).map(el => ({
                tag: el.tagName,
                dataAttributes: Array.from(el.attributes)
                    .filter(attr => attr.name.startsWith('data-'))
                    .map(attr => `${attr.name}="${attr.value}"`)
            }));
        });
        console.log(`📊 Data elements found: ${dataElements.length}`);
        if (dataElements.length > 0) {
            console.log('Data elements:', dataElements.slice(0, 5)); // Show first 5
        }
        
        // Check the page title
        const title = await page.title();
        console.log(`📄 Page title: "${title}"`);
        
        // Get current URL
        const currentUrl = await page.url();
        console.log(`🔗 Current URL: ${currentUrl}`);
        
        // Check for React components or Next.js indicators
        const reactElements = await page.evaluate(() => {
            return {
                hasNextjs: !!window.__NEXT_DATA__,
                hasReact: !!window.React,
                hasReactQuery: !!window.ReactQuery
            };
        });
        console.log(`⚛️  React/Next.js indicators:`, reactElements);
        
        // Try to find any text content that suggests appointments
        const pageText = await page.evaluate(() => {
            return document.body.innerText.toLowerCase();
        });
        
        const appointmentKeywords = ['appointment', 'booking', 'schedule', 'calendar', 'client'];
        const foundKeywords = appointmentKeywords.filter(keyword => pageText.includes(keyword));
        console.log(`🔤 Found appointment-related keywords: ${foundKeywords.join(', ')}`);
        
        // Check for API calls in network requests
        const apiCalls = networkRequests.filter(req => 
            req.url.includes('/api/') || 
            req.url.includes('appointment') || 
            req.url.includes('calendar')
        );
        console.log(`\n🔌 API calls detected: ${apiCalls.length}`);
        apiCalls.forEach(call => {
            console.log(`  - ${call.method} ${call.url}`);
        });
        
        // Check for JavaScript errors
        const jsErrors = consoleMessages.filter(msg => msg.type === 'error');
        console.log(`\n🚨 JavaScript errors detected: ${jsErrors.length}`);
        jsErrors.forEach(error => {
            console.log(`  - ${error.text}`);
        });
        
        // Take a screenshot for visual inspection
        await page.screenshot({ 
            path: '/Users/bossio/6fb-booking/backend-v2/frontend-v2/calendar-test-screenshot.png',
            fullPage: true 
        });
        console.log('📸 Screenshot saved as calendar-test-screenshot.png');
        
        // Wait a bit more to see if any delayed content loads
        console.log('\n⏳ Waiting for potential delayed content...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Final check for appointments after waiting
        const finalAppointmentElements = await page.$$('[data-testid="appointment"], .appointment, [class*="appointment"]');
        console.log(`📋 Final appointment elements count: ${finalAppointmentElements.length}`);
        
        // Check if there's any indication of data loading or empty state
        const emptyStateElements = await page.$$('[data-testid="empty"], .empty, [class*="empty"]');
        console.log(`📭 Empty state elements found: ${emptyStateElements.length}`);
        
        console.log('\n✅ Calendar test completed!');
        
        return {
            success: true,
            calendarFound: !!calendarContainer,
            appointmentCount: finalAppointmentElements.length,
            apiCalls: apiCalls.length,
            jsErrors: jsErrors.length,
            keywords: foundKeywords
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testCalendarPage().then(result => {
    console.log('\n📊 Test Summary:', result);
    process.exit(result.success ? 0 : 1);
}).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
});