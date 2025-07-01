const puppeteer = require('puppeteer');

async function testNotificationClick() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Listen for console logs and errors
    page.on('console', msg => console.log(`[Browser]: ${msg.text()}`));
    page.on('pageerror', error => console.log(`[Page Error]: ${error.message}`));
    
    try {
        await page.goto('http://localhost:3000/calendar');
        await page.waitForTimeout(3000);
        
        // Add some debugging to the page
        await page.evaluate(() => {
            console.log('Setting up click debugging...');
            
            // Find all buttons
            const buttons = document.querySelectorAll('button');
            console.log(`Found ${buttons.length} buttons`);
            
            // Look for notification button
            buttons.forEach((btn, index) => {
                const hasIcon = btn.querySelector('svg');
                if (hasIcon) {
                    console.log(`Button ${index}: has SVG icon`);
                    btn.addEventListener('click', () => {
                        console.log(`Button ${index} clicked!`);
                    });
                }
            });
        });
        
        // Try to click notification button
        const notificationButton = await page.$('button:has(svg)');
        if (notificationButton) {
            console.log('Found notification button, clicking...');
            await notificationButton.click();
            await page.waitForTimeout(2000);
            
            // Check if anything appeared
            const hasPortal = await page.evaluate(() => {
                const portal = document.getElementById('portal-root');
                return portal ? portal.innerHTML.length > 0 : false;
            });
            
            console.log('Portal has content:', hasPortal);
        } else {
            console.log('No notification button found');
        }
        
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

testNotificationClick();