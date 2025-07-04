const puppeteer = require('puppeteer');

async function testLogin() {
    console.log('🚀 Starting Puppeteer login test...\n');
    
    const browser = await puppeteer.launch({
        headless: false, // Show browser window
        devtools: true,  // Open DevTools
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console log capture
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        const location = msg.location();
        
        // Color code by type
        const prefix = {
            'error': '❌ ERROR',
            'warning': '⚠️  WARN',
            'info': '📘 INFO',
            'log': '📝 LOG'
        }[type] || '📝 LOG';
        
        console.log(`${prefix}: ${text}`);
        if (location.url && !location.url.includes('chrome-extension://')) {
            console.log(`   at ${location.url}:${location.lineNumber}`);
        }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
        console.log('🚨 PAGE ERROR:', error.message);
    });
    
    // Capture request failures
    page.on('requestfailed', request => {
        console.log('❌ REQUEST FAILED:', request.url(), '-', request.failure().errorText);
    });
    
    // Monitor network requests
    page.on('request', request => {
        if (request.url().includes('auth/login')) {
            console.log('🌐 Login Request:', request.method(), request.url());
            console.log('   Headers:', request.headers());
            if (request.postData()) {
                console.log('   Body:', request.postData());
            }
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('auth/login')) {
            console.log('🌐 Login Response:', response.status(), response.url());
            console.log('   Headers:', response.headers());
        }
    });
    
    try {
        // Navigate to login page
        console.log('🧭 Navigating to login page...');
        await page.goto('http://localhost:3000/login', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        console.log('✅ Login page loaded\n');
        
        // Wait for form to be ready
        await page.waitForSelector('#email', { timeout: 5000 });
        await page.waitForSelector('#password', { timeout: 5000 });
        await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
        console.log('✅ Form elements found\n');
        
        // Fill in credentials
        console.log('📝 Filling login form...');
        await page.type('#email', 'admin.test@bookedbarber.com');
        await page.type('#password', 'AdminTest123');
        console.log('✅ Credentials entered\n');
        
        // Take screenshot before submit
        await page.screenshot({ path: 'before_login.png' });
        
        // Click submit and wait for navigation or error
        console.log('🚀 Clicking submit button...\n');
        
        // Set up promises to wait for either navigation or error
        const navigationPromise = page.waitForNavigation({ 
            waitUntil: 'networkidle2',
            timeout: 10000 
        }).catch(() => null);
        
        // Click the button
        await page.click('button[type="submit"]');
        
        // Wait a bit for any immediate errors
        await page.waitForTimeout(2000);
        
        // Check if we navigated
        const navigation = await navigationPromise;
        
        const currentUrl = page.url();
        console.log(`\n📍 Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('/dashboard')) {
            console.log('✅ Successfully redirected to dashboard!');
            await page.screenshot({ path: 'dashboard.png' });
        } else if (currentUrl.includes('/login')) {
            console.log('❌ Still on login page - checking for error messages...');
            
            // Look for error messages
            const errorElement = await page.$('.text-red-600, .bg-red-50, .border-red-200, [role="alert"]');
            if (errorElement) {
                const errorText = await page.evaluate(el => el.textContent, errorElement);
                console.log(`❌ Error message found: ${errorText}`);
            }
            
            // Check for verification warning
            const verificationWarning = await page.$('.bg-yellow-50, .border-yellow-200');
            if (verificationWarning) {
                const warningText = await page.evaluate(el => el.textContent, verificationWarning);
                console.log(`⚠️  Verification warning: ${warningText}`);
            }
            
            await page.screenshot({ path: 'login_failed.png' });
        }
        
        // Get any console errors from the page
        const metrics = await page.metrics();
        console.log('\n📊 Page Metrics:', metrics);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        await page.screenshot({ path: 'error.png' });
    }
    
    // Keep browser open for inspection
    console.log('\n⏸️  Keeping browser open for inspection. Press Ctrl+C to close.');
    
    // Don't close browser automatically
    // await browser.close();
}

// Check if puppeteer is installed
try {
    require.resolve('puppeteer');
    testLogin().catch(console.error);
} catch (e) {
    console.log('❌ Puppeteer not installed. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install puppeteer', { stdio: 'inherit' });
    console.log('✅ Puppeteer installed. Please run the script again.');
}