const puppeteer = require('puppeteer');

async function testLogin() {
    console.log('🚀 Starting Puppeteer login test...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: null
        });
        
        const page = await browser.newPage();
        
        // Capture console logs
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            
            // Skip React DevTools and accessibility warnings
            if (text.includes('React DevTools') || 
                text.includes('accessibility') || 
                text.includes('Download the React DevTools')) {
                return;
            }
            
            const prefix = {
                'error': '❌ ERROR',
                'warning': '⚠️  WARN',
                'log': '📝 LOG'
            }[type] || '📝';
            
            console.log(`${prefix}: ${text}`);
        });
        
        // Capture page errors
        page.on('pageerror', error => {
            console.log('🚨 PAGE ERROR:', error.message);
        });
        
        // Monitor API requests
        page.on('request', request => {
            if (request.url().includes('/api/v1/auth/login')) {
                console.log('\n🌐 Login API Request:');
                console.log('   Method:', request.method());
                console.log('   URL:', request.url());
                console.log('   Headers:', JSON.stringify(request.headers(), null, 2));
                if (request.postData()) {
                    console.log('   Body:', request.postData());
                }
            }
        });
        
        page.on('requestfailed', request => {
            if (request.url().includes('localhost')) {
                console.log('\n❌ REQUEST FAILED:');
                console.log('   URL:', request.url());
                console.log('   Error:', request.failure().errorText);
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('/api/v1/auth/login')) {
                console.log('\n🌐 Login API Response:');
                console.log('   Status:', response.status());
                console.log('   URL:', response.url());
                response.text().then(body => {
                    console.log('   Body:', body);
                }).catch(() => {});
            }
        });
        
        // Navigate to login page
        console.log('🧭 Navigating to http://localhost:3000/login');
        await page.goto('http://localhost:3000/login', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        console.log('✅ Login page loaded\n');
        
        // Wait for form elements
        await page.waitForSelector('#email', { timeout: 5000 });
        await page.waitForSelector('#password', { timeout: 5000 });
        await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
        console.log('✅ Form elements ready\n');
        
        // Fill credentials
        console.log('📝 Entering credentials...');
        await page.type('#email', 'admin.test@bookedbarber.com', {delay: 50});
        await page.type('#password', 'AdminTest123', {delay: 50});
        console.log('✅ Credentials entered\n');
        
        // Wait a moment for React state to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Click login button
        console.log('🚀 Clicking Sign in button...\n');
        
        // Start monitoring for navigation
        const navigationPromise = page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: 10000
        }).catch(() => null);
        
        await page.click('button[type="submit"]');
        
        // Wait for result
        console.log('⏳ Waiting for response...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check result
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}\n`);
        
        if (currentUrl.includes('/dashboard')) {
            console.log('✅ SUCCESS: Logged in and redirected to dashboard!');
        } else if (currentUrl.includes('/login')) {
            console.log('❌ FAILED: Still on login page\n');
            
            // Look for error messages
            const errorText = await page.evaluate(() => {
                const errors = [];
                
                // Check for red error messages
                document.querySelectorAll('.text-red-600, .bg-red-50, [role="alert"]').forEach(el => {
                    const text = el.textContent?.trim();
                    if (text && text.length > 0) {
                        errors.push(`Error: ${text}`);
                    }
                });
                
                // Check for yellow warnings
                document.querySelectorAll('.bg-yellow-50').forEach(el => {
                    const text = el.textContent?.trim();
                    if (text && text.length > 0) {
                        errors.push(`Warning: ${text}`);
                    }
                });
                
                return errors;
            });
            
            if (errorText.length > 0) {
                console.log('📋 Error messages found:');
                errorText.forEach(err => console.log(`   ${err}`));
            }
        }
        
        // Keep browser open for inspection
        console.log('\n⏸️  Browser left open for inspection. Press Ctrl+C to close.');
        
    } catch (error) {
        console.error('\n❌ Test error:', error.message);
        if (browser) await browser.close();
    }
}

testLogin().catch(console.error);