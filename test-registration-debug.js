const puppeteer = require('puppeteer');

async function testRegistration() {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging and network monitoring
  page.on('console', msg => {
    console.log('CONSOLE:', msg.type(), msg.text());
  });
  
  page.on('response', response => {
    console.log('RESPONSE:', response.url(), response.status());
  });
  
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });
  
  try {
    console.log('Navigating to registration page...');
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });
    
    console.log('Filling out registration form...');
    await page.type('#name', 'Test User Debug');
    await page.type('#email', 'debug@test.com');
    await page.type('#password', 'TestPass123');
    await page.type('#confirmPassword', 'TestPass123');
    
    // Check required consents
    await page.click('#terms-consent');
    await page.click('#privacy-consent');
    
    console.log('Submitting registration form...');
    
    // Monitor network requests during submission
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/register') && response.status() !== 0
    );
    
    await page.click('button[type="submit"]');
    
    // Wait for the API response
    const response = await responsePromise;
    console.log('Registration API Response:', await response.text());
    
    // Wait a bit to see any follow-up actions
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Error during registration test:', error);
  } finally {
    console.log('Test completed. Keeping browser open for manual inspection...');
    // Don't close browser to allow manual inspection
    // await browser.close();
  }
}

testRegistration().catch(console.error);