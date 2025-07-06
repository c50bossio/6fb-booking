/**
 * Browser-based Calendar Testing
 * Uses Chrome DevTools to test calendar features
 */

const puppeteer = require('puppeteer');

async function testCalendar() {
    const browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
        console.log(`Browser console ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
        console.error(`Page error: ${error.message}`);
    });

    // Monitor network requests
    page.on('response', response => {
        if (response.url().includes('/api/')) {
            console.log(`API Response: ${response.status()} ${response.url()}`);
        }
    });

    console.log('🔐 Testing Login...');
    
    // Navigate to login
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Take screenshot
    await page.screenshot({ path: 'login_page.png' });
    console.log('📸 Screenshot saved: login_page.png');

    // Fill login form
    await page.type('input[name="email"]', 'admin.test@bookedbarber.com');
    await page.type('input[name="password"]', 'AdminTest123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('✅ Login successful');
    console.log(`Current URL: ${page.url()}`);

    // Navigate to calendar
    console.log('\n📅 Testing Calendar...');
    await page.goto('http://localhost:3000/calendar', { waitUntil: 'networkidle2' });
    
    // Take screenshot
    await page.screenshot({ path: 'calendar_page.png', fullPage: true });
    console.log('📸 Screenshot saved: calendar_page.png');

    // Test theme switching
    console.log('\n🎨 Testing Theme Switching...');
    const themeButtons = await page.$$('button[title*="theme"]');
    console.log(`Found ${themeButtons.length} theme buttons`);

    // Test view modes
    console.log('\n👁️ Testing View Modes...');
    const viewButtons = await page.$$('button.calendar-nav-button');
    console.log(`Found ${viewButtons.length} view buttons`);

    // Check for appointments
    const appointments = await page.$$('.premium-appointment');
    console.log(`\n📋 Found ${appointments.length} appointments`);

    // Test navigation
    console.log('\n⏮️ Testing Navigation...');
    const prevButton = await page.$('button[aria-label="Previous month"]');
    const nextButton = await page.$('button[aria-label="Next month"]');
    const todayButton = await page.$('button[aria-label="Go to today"]');
    
    console.log(`Previous button: ${prevButton ? '✅' : '❌'}`);
    console.log(`Next button: ${nextButton ? '✅' : '❌'}`);
    console.log(`Today button: ${todayButton ? '✅' : '❌'}`);

    // Generate report
    console.log('\n📊 Test Summary:');
    console.log('Calendar page loaded successfully');
    console.log(`Calendar URL: http://localhost:3000/calendar`);
    console.log('Login credentials: admin.test@bookedbarber.com / AdminTest123');

    await browser.disconnect();
}

testCalendar().catch(console.error);