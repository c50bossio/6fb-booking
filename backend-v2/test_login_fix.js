const puppeteer = require('puppeteer');

async function testLoginFix() {
    console.log('🚀 Testing login fix with cookie authentication...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: null
        });
        
        const page = await browser.newPage();
        
        // Navigate to login page
        console.log('🧭 Navigating to login page...');
        await page.goto('http://localhost:3000/login', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        console.log('✅ Login page loaded\n');
        
        // Fill in credentials
        console.log('📝 Filling login form...');
        await page.waitForSelector('#email', { timeout: 5000 });
        await page.waitForSelector('#password', { timeout: 5000 });
        
        await page.type('#email', 'admin.test@bookedbarber.com', {delay: 50});
        await page.type('#password', 'AdminTest123', {delay: 50});
        console.log('✅ Credentials entered\n');
        
        // Click login button and wait for navigation
        console.log('🚀 Clicking Sign in button...');
        
        // Set up promise to wait for navigation
        const navigationPromise = page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: 10000
        });
        
        await page.click('button[type="submit"]');
        
        // Wait for navigation
        try {
            await navigationPromise;
            console.log('✅ Navigation completed\n');
        } catch (navError) {
            console.log('⚠️ Navigation timeout, checking current state...\n');
        }
        
        // Wait a bit more for any redirects
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check current URL
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}\n`);
        
        // Check cookies
        const cookies = await page.cookies();
        const tokenCookie = cookies.find(c => c.name === 'token');
        
        if (tokenCookie) {
            console.log('✅ Token cookie found!');
            console.log(`   Name: ${tokenCookie.name}`);
            console.log(`   Value: ${tokenCookie.value.substring(0, 50)}...`);
            console.log(`   Path: ${tokenCookie.path}`);
            console.log(`   Expires: ${new Date(tokenCookie.expires * 1000).toISOString()}\n`);
        } else {
            console.log('❌ Token cookie NOT found\n');
        }
        
        // Check localStorage
        const localStorageToken = await page.evaluate(() => {
            return localStorage.getItem('token');
        });
        
        if (localStorageToken) {
            console.log('✅ Token in localStorage found!');
            console.log(`   Value: ${localStorageToken.substring(0, 50)}...\n`);
        } else {
            console.log('❌ Token NOT in localStorage\n');
        }
        
        // Final result
        if (currentUrl.includes('/dashboard')) {
            console.log('✅ SUCCESS: Successfully logged in and redirected to dashboard!');
        } else if (currentUrl.includes('/login')) {
            console.log('❌ FAILED: Still on login page');
            
            // Check for error messages
            const errorText = await page.evaluate(() => {
                const errors = [];
                document.querySelectorAll('.text-red-600, .bg-red-50, [role="alert"]').forEach(el => {
                    const text = el.textContent?.trim();
                    if (text && text.length > 0) {
                        errors.push(text);
                    }
                });
                return errors;
            });
            
            if (errorText.length > 0) {
                console.log('Error messages found:');
                errorText.forEach(err => console.log(`   - ${err}`));
            }
        } else {
            console.log(`🤔 UNEXPECTED: Ended up at ${currentUrl}`);
        }
        
        console.log('\n⏸️  Keeping browser open for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n✅ Browser closed');
        }
    }
}

testLoginFix().catch(console.error);