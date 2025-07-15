const puppeteer = require('puppeteer');

async function testRegistration() {
    console.log('🚀 Starting registration test...');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    try {
        // Navigate to registration page
        console.log('📍 Navigating to registration page...');
        await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2' });
        
        // Wait for page to load and check what's available
        console.log('⏳ Waiting for page elements...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check what's on the page
        const pageContent = await page.content();
        console.log('📄 Page length:', pageContent.length);
        
        // Look for any forms or registration elements
        const forms = await page.$$('form');
        console.log('📝 Forms found:', forms.length);
        
        const inputs = await page.$$('input');
        console.log('📝 Input fields found:', inputs.length);
        
        // Try to find specific registration elements
        const registerButton = await page.$('button[type="submit"]');
        const emailInput = await page.$('input[type="email"]');
        
        console.log('📧 Email input found:', !!emailInput);
        console.log('🔘 Submit button found:', !!registerButton);
        
        if (forms.length === 0) {
            console.log('❌ No forms found on registration page');
            
            // Check for JavaScript errors
            const logs = await page.evaluate(() => {
                const errors = [];
                const logs = [];
                
                // Check for error messages in console
                const errorElements = document.querySelectorAll('[role="alert"], .error, .alert-destructive');
                errorElements.forEach(el => errors.push(el.textContent));
                
                // Check page title
                logs.push('Title: ' + document.title);
                
                // Check if React is loaded
                logs.push('React: ' + (typeof window.React !== 'undefined' ? 'loaded' : 'not loaded'));
                
                return { errors, logs };
            });
            
            console.log('📊 Page logs:', logs.logs);
            console.log('❌ Page errors:', logs.errors);
            
            return;
        }
        
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
        await new Promise(resolve => setTimeout(resolve, 3000));
        
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