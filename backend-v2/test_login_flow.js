const puppeteer = require('puppeteer');

async function testLoginFlow() {
    console.log('Starting login flow test...');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        // Step 1: Navigate to login page
        console.log('\n1. Navigating to login page...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
        console.log('✓ Login page loaded');
        
        // Step 2: Fill in login credentials
        console.log('\n2. Entering login credentials...');
        await page.waitForSelector('input[name="email"]', { timeout: 5000 });
        await page.type('input[name="email"]', 'admin@bookedbarber.com');
        await page.type('input[name="password"]', 'admin123');
        console.log('✓ Credentials entered');
        
        // Step 3: Submit login form
        console.log('\n3. Submitting login form...');
        await page.click('button[type="submit"]');
        
        // Wait for navigation or error
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
        
        const currentUrl = page.url();
        console.log(`✓ Current URL after login: ${currentUrl}`);
        
        // Check if we're on dashboard
        if (currentUrl.includes('/dashboard')) {
            console.log('✓ Successfully redirected to dashboard');
        } else {
            console.log('⚠️  Not redirected to dashboard as expected');
        }
        
        // Step 4: Navigate to welcome page
        console.log('\n4. Navigating to welcome page...');
        await page.goto('http://localhost:3000/dashboard/welcome', { waitUntil: 'networkidle0' });
        console.log('✓ Welcome page loaded');
        
        // Step 5: Look for Skip button
        console.log('\n5. Looking for Skip button...');
        const skipButton = await page.$('button:has-text("Skip for now"), a:has-text("Skip for now")').catch(() => null);
        
        if (!skipButton) {
            // Try alternative selectors
            const buttons = await page.$$eval('button, a', els => 
                els.map(el => ({ text: el.textContent, tag: el.tagName, href: el.href || '' }))
            );
            console.log('Available buttons/links:', buttons);
            
            // Try clicking by text content
            await page.evaluate(() => {
                const elements = [...document.querySelectorAll('button, a')];
                const skipElement = elements.find(el => el.textContent.includes('Skip'));
                if (skipElement) {
                    console.log('Found skip element:', skipElement.outerHTML);
                    skipElement.click();
                } else {
                    console.log('No skip element found');
                }
            });
        } else {
            await skipButton.click();
            console.log('✓ Clicked Skip button');
        }
        
        // Wait a moment for any navigation
        await page.waitForTimeout(2000);
        
        const finalUrl = page.url();
        console.log(`\n6. Final URL: ${finalUrl}`);
        
        if (finalUrl.includes('/dashboard') && !finalUrl.includes('/welcome')) {
            console.log('✅ Successfully skipped and redirected to main dashboard');
        } else {
            console.log('⚠️  Did not redirect to main dashboard after skip');
        }
        
        // Check for any console errors
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
        
        // Get page content for debugging
        const pageContent = await page.content();
        if (pageContent.includes('error') || pageContent.includes('Error')) {
            console.log('\n⚠️  Page may contain errors');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
    } finally {
        console.log('\n7. Test completed. Keeping browser open for manual inspection...');
        // Keep browser open for manual inspection
        await new Promise(resolve => setTimeout(resolve, 30000));
        await browser.close();
    }
}

testLoginFlow().catch(console.error);