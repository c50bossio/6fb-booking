const puppeteer = require('puppeteer');

async function testCalendarDirect() {
    console.log('🔧 Testing calendar page content directly...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 800 }
    });
    
    try {
        const page = await browser.newPage();
        
        // Log console messages from the page
        page.on('console', (message) => {
            console.log(`🖥️ Console [${message.type()}]:`, message.text());
        });
        
        // Log network errors
        page.on('requestfailed', (request) => {
            console.log(`❌ Request failed: ${request.url()} - ${request.failure().errorText}`);
        });
        
        // Navigate to calendar page
        console.log('📅 Navigating to calendar...');
        await page.goto('http://localhost:3001/calendar', { waitUntil: 'networkidle2' });
        
        // Wait for React to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Get page content and structure
        const diagnostics = await page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                bodyHTML: document.body.innerHTML.substring(0, 1000) + '...',
                hasReact: !!window.React,
                hasNext: !!window.__NEXT_DATA__,
                allElements: Array.from(document.querySelectorAll('*')).length,
                divs: Array.from(document.querySelectorAll('div')).length,
                buttons: Array.from(document.querySelectorAll('button')).length,
                scripts: Array.from(document.querySelectorAll('script')).length,
                errors: window.console ? 'Console available' : 'No console',
                nextData: window.__NEXT_DATA__ ? Object.keys(window.__NEXT_DATA__) : null,
                calendarElements: Array.from(document.querySelectorAll('*')).filter(el => 
                    el.className && el.className.toString().toLowerCase().includes('calendar')
                ).map(el => ({ 
                    tag: el.tagName, 
                    class: el.className.toString(),
                    id: el.id
                })),
                hasAuthToken: !!localStorage.getItem('token'),
                hasUserData: !!localStorage.getItem('user')
            };
        });
        
        console.log('🔍 Page diagnostics:', JSON.stringify(diagnostics, null, 2));
        
        // Check if we need to set auth token manually for testing
        if (!diagnostics.hasAuthToken) {
            console.log('🔐 No auth token found, trying to set one...');
            
            // Try to log in first to get a token
            await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Fill login form
            try {
                await page.type('input[type="email"]', 'barber@example.com');
                await page.type('input[type="password"]', 'testpass123');
                await page.click('button[type="submit"]');
                
                // Wait for potential redirect
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                
                console.log('🔓 Login attempted, current URL:', page.url());
                
                // Now go back to calendar
                await page.goto('http://localhost:3001/calendar', { waitUntil: 'networkidle2' });
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Re-check diagnostics
                const postAuthDiagnostics = await page.evaluate(() => {
                    return {
                        hasAuthToken: !!localStorage.getItem('token'),
                        hasUserData: !!localStorage.getItem('user'),
                        calendarPage: !!document.querySelector('.calendar-page'),
                        calendarElements: Array.from(document.querySelectorAll('*')).filter(el => 
                            el.className && el.className.toString().toLowerCase().includes('calendar')
                        ).length,
                        barberFilter: Array.from(document.querySelectorAll('button')).some(b => 
                            b.textContent.includes('All Staff') || b.textContent.includes('All')),
                        viewButtons: Array.from(document.querySelectorAll('button')).filter(b => 
                            b.textContent.includes('Day') || b.textContent.includes('Week') || b.textContent.includes('Month')
                        ).map(b => b.textContent.trim())
                    };
                });
                
                console.log('🔍 Post-auth diagnostics:', JSON.stringify(postAuthDiagnostics, null, 2));
                
            } catch (loginError) {
                console.log('❌ Login failed:', loginError.message);
            }
        }
        
        // Take final screenshot
        await page.screenshot({ 
            path: '/Users/bossio/6fb-booking/backend-v2/frontend-v2/calendar-direct-test.png',
            fullPage: true 
        });
        
        console.log('📸 Screenshot saved as calendar-direct-test.png');
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testCalendarDirect();