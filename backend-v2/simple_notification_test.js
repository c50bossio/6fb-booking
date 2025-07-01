const puppeteer = require('puppeteer');

async function testNotification() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(3000);
        
        // Look for bell icon
        const bellButton = await page.$('button:has(svg)');
        if (bellButton) {
            console.log('Found bell button, clicking...');
            
            // Take before screenshot
            await page.screenshot({ path: 'before_click.png' });
            
            await bellButton.click();
            await page.waitForTimeout(1000);
            
            // Take after screenshot  
            await page.screenshot({ path: 'after_click.png' });
            
            // Check if dropdown appeared
            const dropdown = await page.$('[class*="absolute"][class*="right-0"]');
            if (dropdown) {
                const isVisible = await page.evaluate(el => {
                    const rect = el.getBoundingClientRect();
                    const style = getComputedStyle(el);
                    return rect.width > 0 && rect.height > 0 && 
                           style.display !== 'none' && style.visibility !== 'hidden';
                }, dropdown);
                console.log('Dropdown visible:', isVisible);
            } else {
                console.log('No dropdown found');
            }
        }
        
        await page.waitForTimeout(5000); // Keep browser open
        
    } finally {
        await browser.close();
    }
}

testNotification();