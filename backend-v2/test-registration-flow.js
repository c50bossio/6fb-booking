const puppeteer = require('puppeteer');

async function testRegistrationFlow() {
  console.log('🚀 Starting Registration Flow Test...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    devtools: true, // Open devtools automatically
    slowMo: 100 // Slow down actions for visibility
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });
  
  // Capture network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('🌐 API Request:', request.method(), request.url());
      if (request.method() === 'POST') {
        console.log('   Body:', request.postData());
      }
    }
  });
  
  // Capture network responses
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`📡 API Response: ${response.status()} ${response.url()}`);
    }
  });
  
  // Capture errors
  page.on('error', err => {
    console.error('❌ Page error:', err);
  });
  
  page.on('pageerror', err => {
    console.error('❌ Page error:', err);
  });
  
  try {
    // Test development environment first
    console.log('📍 Testing Development Environment (port 3000)...\n');
    
    // Navigate to registration page
    console.log('1️⃣ Navigating to registration page...');
    await page.goto('http://localhost:3000/register', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    console.log('   ✅ Registration page loaded\n');
    
    // Check if page loaded correctly
    const pageTitle = await page.title();
    console.log(`   Page title: ${pageTitle}`);
    
    // Check for error messages on page
    const errorElements = await page.$$('.bg-red-50');
    if (errorElements.length > 0) {
      const errorText = await page.$eval('.bg-red-50', el => el.textContent);
      console.log(`   ⚠️ Error message on page: ${errorText}`);
    }
    
    // Generate test data
    const timestamp = Date.now();
    const testData = {
      name: `Test User ${timestamp}`,
      email: `testuser${timestamp}@example.com`,
      password: 'TestPass123!',
      confirmPassword: 'TestPass123!'
    };
    
    console.log('2️⃣ Filling registration form...');
    console.log(`   Name: ${testData.name}`);
    console.log(`   Email: ${testData.email}`);
    console.log(`   Password: ${testData.password}`);
    
    // Fill form fields
    await page.waitForSelector('#name', { timeout: 5000 });
    await page.type('#name', testData.name);
    
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.type('#email', testData.email);
    
    await page.waitForSelector('#password', { timeout: 5000 });
    await page.type('#password', testData.password);
    
    await page.waitForSelector('#confirmPassword', { timeout: 5000 });
    await page.type('#confirmPassword', testData.confirmPassword);
    
    // Check consent boxes
    console.log('\n3️⃣ Checking consent boxes...');
    
    // Terms consent
    const termsCheckbox = await page.$('#terms-consent');
    if (termsCheckbox) {
      await termsCheckbox.click();
      console.log('   ✅ Terms consent checked');
    } else {
      console.log('   ❌ Terms consent checkbox not found');
    }
    
    // Privacy consent
    const privacyCheckbox = await page.$('#privacy-consent');
    if (privacyCheckbox) {
      await privacyCheckbox.click();
      console.log('   ✅ Privacy consent checked');
    } else {
      console.log('   ❌ Privacy consent checkbox not found');
    }
    
    // Test data consent
    const testDataCheckbox = await page.$('#test-data-consent');
    if (testDataCheckbox) {
      await testDataCheckbox.click();
      console.log('   ✅ Test data consent checked');
    } else {
      console.log('   ⚠️ Test data consent checkbox not found');
    }
    
    // Check if submit button is enabled
    console.log('\n4️⃣ Checking submit button...');
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      const isDisabled = await page.$eval('button[type="submit"]', btn => btn.disabled);
      console.log(`   Submit button disabled: ${isDisabled}`);
      
      if (isDisabled) {
        // Check password requirements
        const passwordChecks = await page.$$eval('.text-xs.flex.items-center', elements => 
          elements.map(el => ({
            text: el.textContent,
            isValid: el.classList.contains('text-green-600')
          }))
        );
        
        console.log('   Password requirements:');
        passwordChecks.forEach(check => {
          console.log(`     ${check.isValid ? '✅' : '❌'} ${check.text}`);
        });
      }
    }
    
    // Capture network activity during submission
    console.log('\n5️⃣ Attempting form submission...');
    
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/auth/register'),
      { timeout: 10000 }
    ).catch(() => null);
    
    // Click submit button
    await page.click('button[type="submit"]');
    console.log('   ✅ Submit button clicked');
    
    // Wait for response or timeout
    const response = await responsePromise;
    
    if (response) {
      console.log(`\n📡 Registration API Response: ${response.status()}`);
      
      try {
        const responseData = await response.json();
        console.log('   Response data:', JSON.stringify(responseData, null, 2));
      } catch (e) {
        const responseText = await response.text();
        console.log('   Response text:', responseText);
      }
      
      // Check for error messages on page after submission
      await page.waitForTimeout(2000);
      const postSubmitErrors = await page.$$('.bg-red-50');
      if (postSubmitErrors.length > 0) {
        const errorText = await page.$eval('.bg-red-50', el => el.textContent);
        console.log(`\n❌ Error after submission: ${errorText}`);
      }
    } else {
      console.log('\n❌ No registration API response received (timeout)');
      
      // Check console for errors
      const pageErrors = await page.evaluate(() => {
        const errors = [];
        const logs = document.querySelectorAll('*');
        logs.forEach(el => {
          if (el.textContent && el.textContent.includes('error')) {
            errors.push(el.textContent);
          }
        });
        return errors;
      });
      
      if (pageErrors.length > 0) {
        console.log('\nPage errors found:', pageErrors);
      }
    }
    
    // Check if we're still on registration page or redirected
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/login')) {
      console.log('✅ Successfully redirected to login page!');
    } else if (currentUrl.includes('/register')) {
      console.log('❌ Still on registration page - registration likely failed');
    }
    
    // Test API directly
    console.log('\n6️⃣ Testing API directly with fetch...');
    const apiTestResult = await page.evaluate(async (testData) => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: testData.email + '.direct',
            password: testData.password,
            name: testData.name + ' Direct',
            create_test_data: true
          })
        });
        
        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data: data
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    }, testData);
    
    console.log('   API Test Result:', JSON.stringify(apiTestResult, null, 2));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
  
  // Keep browser open for manual inspection
  console.log('\n✅ Test complete. Browser will remain open for inspection.');
  console.log('Press Ctrl+C to close.');
}

// Run the test
testRegistrationFlow().catch(console.error);