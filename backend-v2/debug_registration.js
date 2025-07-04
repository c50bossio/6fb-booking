const puppeteer = require('puppeteer');

async function testRegistrationPage() {
    let browser;
    
    try {
        console.log('🔍 Starting browser testing for registration page...');
        
        // Connect to Chrome instance
        browser = await puppeteer.connect({
            browserURL: 'http://localhost:9222'
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
        
        // Check for registration form
        const registrationForm = await page.$('form');
        if (registrationForm) {
            console.log('✅ Registration form found on page');
            
            // Get form details
            const formHTML = await page.evaluate(() => {
                const form = document.querySelector('form');
                return form ? form.innerHTML : null;
            });
            
            console.log('📋 Form elements found:');
            const inputs = await page.$$eval('input', inputs => 
                inputs.map(input => ({ type: input.type, name: input.name, id: input.id }))
            );
            inputs.forEach(input => console.log(`  - ${input.type}: ${input.name || input.id}`));
            
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
        }
        
        // Test registration form submission (if form exists)
        if (registrationForm) {
            console.log('🧪 Testing form submission...');
            
            // Fill form with test data
            await page.type('input[name="email"], input[type="email"]', 'test@example.com');
            await page.type('input[name="password"], input[type="password"]', 'TestPassword123!');
            await page.type('input[name="name"], input[name="first_name"]', 'Test User');
            
            console.log('📝 Form filled with test data');
            
            // Submit form
            const submitButton = await page.$('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                console.log('🚀 Submitting form...');
                await submitButton.click();
                
                // Wait for network activity
                await page.waitForTimeout(2000);
                
                console.log('✅ Form submitted, checking for response...');
            } else {
                console.log('❌ No submit button found');
            }
        }
        
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
    } finally {
        if (browser) {
            await browser.disconnect();
        }
    }
}

// Run the test
testRegistrationPage().catch(console.error);