const puppeteer = require('puppeteer');

async function testRegistration() {
    console.log('🚀 Starting registration test...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        // Navigate to registration page
        console.log('📍 Navigating to registration page...');
        await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2' });
        
        // Wait for form to load
        await page.waitForSelector('form', { timeout: 10000 });
        
        // Test data
        const testData = {
            name: 'Test User',
            email: `test+${Date.now()}@example.com`,
            password: 'TestPassword123!',
            businessType: 'individual'
        };
        
        console.log('📝 Filling registration form...');
        
        // Fill form fields
        await page.type('input[name="name"]', testData.name);
        await page.type('input[name="email"]', testData.email);
        await page.type('input[name="password"]', testData.password);
        
        // Select business type
        await page.click('input[value="individual"]');
        
        // Submit form
        console.log('🔄 Submitting registration form...');
        await page.click('button[type="submit"]');
        
        // Wait for result
        await page.waitForTimeout(3000);
        
        // Check if registration was successful
        const currentUrl = page.url();
        console.log('📍 Current URL:', currentUrl);
        
        // Look for success indicators
        const hasSuccessMessage = await page.$('.success') !== null;
        const hasErrorMessage = await page.$('.error') !== null;
        
        if (hasSuccessMessage || currentUrl.includes('dashboard')) {
            console.log('✅ Registration successful!');
            console.log('📧 Test user created:', testData.email);
            
            // Test trial tracker
            console.log('🔍 Looking for trial tracker...');
            const trialBanner = await page.$('[data-testid="trial-banner"]');
            if (trialBanner) {
                const trialText = await page.evaluate(el => el.textContent, trialBanner);
                console.log('📊 Trial status:', trialText);
            } else {
                console.log('⚠️  No trial banner found');
            }
            
            // Test subscription CTA
            console.log('🔍 Looking for subscription CTA...');
            const upgradeCTA = await page.$('[data-testid="upgrade-cta"]');
            if (upgradeCTA) {
                console.log('💰 Upgrade CTA found');
            } else {
                console.log('⚠️  No upgrade CTA found');
            }
            
        } else if (hasErrorMessage) {
            const errorText = await page.$eval('.error', el => el.textContent);
            console.log('❌ Registration failed:', errorText);
        } else {
            console.log('⚠️  Registration status unclear');
        }
        
    } catch (error) {
        console.log('❌ Registration test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testRegistration();