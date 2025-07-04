const puppeteer = require('puppeteer');

async function testRegistrationPage() {
    let browser;
    
    try {
        console.log('🔍 Starting browser testing for registration page...');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
        });
        
        const page = await browser.newPage();
        
        // Listen for console messages
        page.on('console', msg => {
            console.log(`📝 CONSOLE [${msg.type()}]: ${msg.text()}`);
        });
        
        // Listen for page errors
        page.on('pageerror', error => {
            console.error(`❌ PAGE ERROR: ${error.message}`);
        });
        
        // Listen for network failures
        page.on('requestfailed', request => {
            console.error(`🌐 NETWORK FAILED: ${request.url()} - ${request.failure().errorText}`);
        });
        
        // Listen for network requests
        page.on('request', request => {
            console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
        });
        
        // Listen for responses
        page.on('response', response => {
            if (response.status() >= 400) {
                console.error(`❌ RESPONSE ERROR: ${response.status()} ${response.url()}`);
            } else {
                console.log(`✅ RESPONSE: ${response.status()} ${response.url()}`);
            }
        });
        
        console.log('🚀 Navigating to registration page...');
        
        // Navigate to registration page
        const response = await page.goto('http://localhost:3000/register', {
            waitUntil: 'networkidle2',
            timeout: 10000
        });
        
        console.log(`📄 Page loaded with status: ${response.status()}`);
        
        // Check if page loaded successfully
        const title = await page.title();
        console.log(`📝 Page title: ${title}`);
        
        // Take a screenshot
        await page.screenshot({ path: 'registration_page.png' });
        console.log('📸 Screenshot saved as registration_page.png');
        
        // Check for registration form
        const registrationForm = await page.$('form');
        if (registrationForm) {
            console.log('✅ Registration form found on page');
            
            // Get form details
            const inputs = await page.$$eval('input', inputs => 
                inputs.map(input => ({ type: input.type, name: input.name, id: input.id, placeholder: input.placeholder }))
            );
            console.log('📋 Form inputs found:');
            inputs.forEach(input => console.log(`  - ${input.type}: ${input.name || input.id} (${input.placeholder || 'no placeholder'})`));
            
        } else {
            console.log('❌ No registration form found on page');
        }
        
        // Check for any visible errors
        const errorMessages = await page.$$eval('[role="alert"], .error, .alert-danger', 
            elements => elements.map(el => el.textContent.trim())
        );
        
        if (errorMessages.length > 0) {
            console.log('⚠️ Error messages found:');
            errorMessages.forEach(msg => console.log(`  - ${msg}`));
        } else {
            console.log('✅ No error messages found on page');
        }
        
        // Check page content
        const pageContent = await page.evaluate(() => {
            const main = document.querySelector('main') || document.querySelector('body');
            return main ? main.textContent.substring(0, 500) : 'No content found';
        });
        console.log(`📄 Page content preview: ${pageContent.trim()}`);
        
        console.log('🎉 Testing completed successfully!');
        
    } catch (error) {
        console.error('💥 Error during testing:', error.message);
        
        if (error.message.includes('ERR_CONNECTION_REFUSED')) {
            console.log('🔍 Connection refused - checking server status...');
            console.log('   Frontend should be running on http://localhost:3000');
            console.log('   Backend should be running on http://localhost:8000');
            console.log('   Check if both servers are running with:');
            console.log('   ps aux | grep -E "(python.*main|node.*next)"');
        }
        
        if (error.message.includes('Navigation timeout')) {
            console.log('🔍 Page navigation timed out');
            console.log('   This might indicate the page is taking too long to load');
            console.log('   or there are network issues');
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testRegistrationPage().catch(console.error);