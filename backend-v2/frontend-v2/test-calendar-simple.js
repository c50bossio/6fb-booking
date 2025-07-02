const puppeteer = require('puppeteer');

async function testCalendar() {
    console.log('🔧 Testing calendar page and barber filter...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 800 }
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable request interception to check API calls
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.url().includes('/api/v1/users') || request.url().includes('role=barber')) {
                console.log('📡 API Request:', request.url());
            }
            request.continue();
        });
        
        page.on('response', (response) => {
            if (response.url().includes('/api/v1/users') || response.url().includes('role=barber')) {
                console.log('📡 API Response:', response.url(), response.status());
            }
        });
        
        // Go to home page first to see what's available
        console.log('🏠 Navigating to home page...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
        
        // Take initial screenshot
        await page.screenshot({ 
            path: '/Users/bossio/6fb-booking/backend-v2/frontend-v2/home-page-test.png',
            fullPage: true 
        });
        
        console.log('📸 Home page screenshot saved');
        
        // Try to access calendar directly
        console.log('📅 Navigating to calendar...');
        await page.goto('http://localhost:3001/calendar', { waitUntil: 'networkidle2' });
        
        // Wait a bit for any potential redirects or loading
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check current URL
        const currentUrl = page.url();
        console.log('🌐 Current URL:', currentUrl);
        
        // Take screenshot of calendar page
        await page.screenshot({ 
            path: '/Users/bossio/6fb-booking/backend-v2/frontend-v2/calendar-page-test.png',
            fullPage: true 
        });
        
        console.log('📸 Calendar page screenshot saved');
        
        // Check what's on the page
        const pageContent = await page.evaluate(() => {
            return {
                title: document.title,
                hasCalendarPage: !!document.querySelector('.calendar-page'),
                hasBarberFilter: Array.from(document.querySelectorAll('button')).some(b => 
                    b.textContent.includes('All Staff') || b.textContent.includes('All')),
                hasBarberButtons: Array.from(document.querySelectorAll('button')).filter(b => {
                    const text = b.textContent.toLowerCase();
                    return text.includes('barber') || text.includes('test') || text.includes('john');
                }).length,
                hasViewSwitcher: Array.from(document.querySelectorAll('button')).some(b => 
                    b.textContent.includes('Day') || b.textContent.includes('Week') || b.textContent.includes('Month')),
                allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).slice(0, 15),
                errors: Array.from(document.querySelectorAll('.error, [class*="error"]')).map(e => e.textContent),
                isLoginPage: !!document.querySelector('input[type="email"]') && !!document.querySelector('input[type="password"]'),
                hasCalendarDayView: document.body.innerHTML.includes('CalendarDayView') || !!document.querySelector('[class*="calendar"]'),
                classNames: Array.from(document.querySelectorAll('*')).map(el => el.className).filter(c => c && typeof c === 'string' && c.includes('calendar')).slice(0, 10)
            };
        });
        
        console.log('📊 Page content analysis:', pageContent);
        
        if (pageContent.isLoginPage) {
            console.log('🔄 Redirected to login page - need authentication');
        } else if (pageContent.hasCalendarPage) {
            console.log('✅ Calendar page loaded successfully');
            
            // Check for barber filter specifically
            if (pageContent.hasBarberFilter) {
                console.log('✅ Barber filter found!');
            } else {
                console.log('⚠️ Barber filter not found - checking console for errors');
                
                // Check browser console for errors
                const logs = await page.evaluate(() => {
                    return window.console ? 'Console available' : 'No console';
                });
                console.log('📝 Console status:', logs);
            }
        } else {
            console.log('❌ Calendar page not found');
        }
        
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        // Take error screenshot
        try {
            await page.screenshot({ 
                path: '/Users/bossio/6fb-booking/backend-v2/frontend-v2/calendar-test-error.png',
                fullPage: true 
            });
        } catch (e) {}
    } finally {
        await browser.close();
    }
}

testCalendar();