const puppeteer = require('puppeteer');

async function testLoginSimple() {
  console.log('🔍 Simple Login Test\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Log all console messages
  page.on('console', msg => {
    console.log(`Browser [${msg.type()}]:`, msg.text());
  });
  
  // Log network failures
  page.on('requestfailed', request => {
    console.log(`❌ Request failed: ${request.url()} - ${request.failure().errorText}`);
  });
  
  // Monitor responses
  page.on('response', response => {
    if (response.url().includes('/api/') || response.url().includes('login')) {
      console.log(`API Response: ${response.url()} - Status: ${response.status()}`);
    }
  });
  
  try {
    console.log('1. Going to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Close cookie banner if present
    try {
      await page.click('button:has-text("Accept All")', { timeout: 1000 });
    } catch (e) {}
    
    console.log('\n2. Filling form...');
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    
    console.log('\n3. Clicking submit...');
    await page.click('button[type="submit"]');
    
    console.log('\n4. Waiting 5 seconds to see what happens...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const currentUrl = page.url();
    console.log(`\nCurrent URL: ${currentUrl}`);
    
    // Check for error messages
    const errorCheck = await page.evaluate(() => {
      const errors = document.querySelectorAll('[role="alert"], .error, .text-red, .text-destructive');
      const errorTexts = Array.from(errors).map(e => e.textContent?.trim());
      
      // Check for form validation errors
      const formErrors = document.querySelectorAll('.text-sm.text-destructive');
      const formErrorTexts = Array.from(formErrors).map(e => e.textContent?.trim());
      
      return {
        hasErrors: errors.length > 0 || formErrors.length > 0,
        errorMessages: [...errorTexts, ...formErrorTexts].filter(Boolean),
        pageTitle: document.title,
        isStillOnLogin: window.location.pathname === '/login'
      };
    });
    
    console.log('\n📊 Results:');
    console.log('Still on login page:', errorCheck.isStillOnLogin);
    console.log('Has errors:', errorCheck.hasErrors);
    if (errorCheck.errorMessages.length > 0) {
      console.log('Error messages:', errorCheck.errorMessages);
    }
    
    // If still on login, check form state
    if (errorCheck.isStillOnLogin) {
      const formState = await page.evaluate(() => {
        const emailInput = document.querySelector('#email');
        const passwordInput = document.querySelector('#password');
        const submitButton = document.querySelector('button[type="submit"]');
        
        return {
          emailValue: emailInput?.value,
          passwordValue: passwordInput?.value ? '***hidden***' : 'empty',
          submitDisabled: submitButton?.hasAttribute('disabled'),
          submitText: submitButton?.textContent
        };
      });
      
      console.log('\nForm state:');
      console.log('Email:', formState.emailValue);
      console.log('Password:', formState.passwordValue);
      console.log('Submit disabled:', formState.submitDisabled);
      console.log('Submit text:', formState.submitText);
    }
    
    await page.screenshot({ path: 'login_test_result.png' });
    console.log('\n📸 Screenshot saved: login_test_result.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\nKeeping browser open for 20 seconds...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    await browser.close();
  }
}

testLoginSimple().catch(console.error);