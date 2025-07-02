const puppeteer = require('puppeteer');

async function testBarberFilter() {
    console.log('🔧 Testing barber filter functionality...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 800 }
    });
    
    try {
        const page = await browser.newPage();
        
        // Go to login page first
        console.log('📱 Navigating to login page...');
        await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
        
        // Login with test credentials
        console.log('🔐 Logging in...');
        await page.type('input[type="email"]', 'barber@example.com');
        await page.type('input[type="password"]', 'testpass123');
        await page.click('button[type="submit"]');
        
        // Wait for redirect to dashboard or calendar
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Navigate to calendar page
        console.log('📅 Navigating to calendar...');
        await page.goto('http://localhost:3001/calendar', { waitUntil: 'networkidle2' });
        
        // Wait for calendar to load
        await page.waitForSelector('.calendar-page', { timeout: 10000 });
        
        // Switch to day view to see barber filter
        console.log('🔄 Switching to day view...');
        try {
            await page.click('button:has-text("Day")');
        } catch (e) {
            // Try alternative selector
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const dayButton = buttons.find(b => b.textContent.includes('Day'));
                if (dayButton) dayButton.click();
            });
        }
        
        // Wait for day view to load
        await page.waitForTimeout(2000);
        
        // Check if barber filter exists
        console.log('🔍 Checking for barber filter...');
        
        // Look for barber filter buttons
        const barberFilterExists = await page.evaluate(() => {
            // Look for "All Staff" button or barber avatars
            const allStaffButton = document.querySelector('button:has(span:contains("All Staff"))') ||
                                   Array.from(document.querySelectorAll('button')).find(b => 
                                       b.textContent.includes('All Staff') || b.textContent.includes('All')
                                   );
            
            // Look for individual barber buttons
            const barberButtons = Array.from(document.querySelectorAll('button')).filter(b => {
                const text = b.textContent.toLowerCase();
                return text.includes('barber') || text.includes('john') || text.includes('test');
            });
            
            return {
                allStaffExists: !!allStaffButton,
                barberButtons: barberButtons.length,
                barberButtonTexts: barberButtons.map(b => b.textContent.trim())
            };
        });
        
        console.log('📊 Barber filter status:', barberFilterExists);
        
        // Take screenshot for verification
        await page.screenshot({ 
            path: '/Users/bossio/6fb-booking/backend-v2/frontend-v2/barber-filter-test.png',
            fullPage: true 
        });
        
        console.log('📸 Screenshot saved as barber-filter-test.png');
        
        // Check for appointments
        const appointmentCount = await page.evaluate(() => {
            return document.querySelectorAll('.calendar-appointment').length;
        });
        
        console.log(`📋 Found ${appointmentCount} appointments in calendar`);
        
        // Test barber selection if filter exists
        if (barberFilterExists.allStaffExists || barberFilterExists.barberButtons > 0) {
            console.log('✅ Barber filter UI found!');
            
            // Try to click a barber filter
            if (barberFilterExists.barberButtons > 0) {
                console.log('🎯 Testing barber selection...');
                await page.evaluate(() => {
                    const barberButtons = Array.from(document.querySelectorAll('button')).filter(b => {
                        const text = b.textContent.toLowerCase();
                        return text.includes('barber') || text.includes('john') || text.includes('test');
                    });
                    
                    if (barberButtons[0]) {
                        barberButtons[0].click();
                        console.log('Clicked barber button:', barberButtons[0].textContent);
                    }
                });
                
                await page.waitForTimeout(1000);
                
                // Take another screenshot after selection
                await page.screenshot({ 
                    path: '/Users/bossio/6fb-booking/backend-v2/frontend-v2/barber-filter-selected.png',
                    fullPage: true 
                });
                
                console.log('📸 Screenshot after barber selection saved');
            }
        } else {
            console.log('❌ Barber filter UI not found');
        }
        
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        // Take error screenshot
        try {
            await page.screenshot({ 
                path: '/Users/bossio/6fb-booking/backend-v2/frontend-v2/barber-filter-error.png',
                fullPage: true 
            });
        } catch (e) {}
    } finally {
        await browser.close();
    }
}

testBarberFilter();