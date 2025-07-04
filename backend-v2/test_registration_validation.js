const puppeteer = require('puppeteer');

async function testRegistrationValidation() {
  console.log('🚀 Starting registration validation test...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.log('❌ Console Error:', msg.text());
      } else if (type === 'warning') {
        console.log('⚠️  Console Warning:', msg.text());
      }
    });

    // Monitor network requests
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`❌ Network Error: ${response.status()} - ${response.url()}`);
      }
    });

    console.log('📍 Navigating to registration page...');
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    // Step 1: Check password requirements display
    console.log('\n📋 Checking password requirements display...');
    
    const requirements = await page.evaluate(() => {
      const reqElements = document.querySelectorAll('.text-xs.text-muted-foreground li');
      return Array.from(reqElements).map(el => el.textContent.trim());
    });
    
    console.log('Password requirements found:');
    requirements.forEach(req => console.log(`  • ${req}`));
    
    // Verify the requirements
    const hasMinLength = requirements.some(req => req.includes('At least 8 characters'));
    const hasUppercase = requirements.some(req => req.includes('One uppercase letter'));
    const hasLowercase = requirements.some(req => req.includes('One lowercase letter'));
    const hasNumber = requirements.some(req => req.includes('One number'));
    const hasSpecial = requirements.some(req => req.includes('One special character'));
    
    console.log('\n✅ Requirement Checks:');
    console.log(`  • 8 character minimum: ${hasMinLength ? '✅' : '❌'}`);
    console.log(`  • Uppercase requirement: ${hasUppercase ? '✅' : '❌'}`);
    console.log(`  • Lowercase requirement: ${hasLowercase ? '✅' : '❌'}`);
    console.log(`  • Number requirement: ${hasNumber ? '✅' : '❌'}`);
    console.log(`  • Special character requirement: ${hasSpecial ? '✅' : '❌'}`);

    // Step 2: Test real-time validation
    console.log('\n🔍 Testing real-time password validation...');
    
    const passwordInput = await page.$('input[name="password"]');
    
    // Test 1: Type "pass" - all should be unchecked
    console.log('\n  Testing "pass"...');
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type('pass');
    await page.waitForTimeout(500);
    
    let validationState = await page.evaluate(() => {
      const items = document.querySelectorAll('.text-xs.text-muted-foreground li');
      return Array.from(items).map(el => ({
        text: el.textContent.trim(),
        hasCheck: el.querySelector('svg.text-green-500') !== null
      }));
    });
    
    console.log('  Validation state:');
    validationState.forEach(item => {
      console.log(`    • ${item.text}: ${item.hasCheck ? '✅' : '❌'}`);
    });

    // Test 2: Type "Pass" - uppercase should be checked
    console.log('\n  Testing "Pass"...');
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type('Pass');
    await page.waitForTimeout(500);
    
    validationState = await page.evaluate(() => {
      const items = document.querySelectorAll('.text-xs.text-muted-foreground li');
      return Array.from(items).map(el => ({
        text: el.textContent.trim(),
        hasCheck: el.querySelector('svg.text-green-500') !== null
      }));
    });
    
    console.log('  Validation state:');
    validationState.forEach(item => {
      console.log(`    • ${item.text}: ${item.hasCheck ? '✅' : '❌'}`);
    });

    // Test 3: Type "Pass1" - uppercase and number should be checked
    console.log('\n  Testing "Pass1"...');
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type('Pass1');
    await page.waitForTimeout(500);
    
    validationState = await page.evaluate(() => {
      const items = document.querySelectorAll('.text-xs.text-muted-foreground li');
      return Array.from(items).map(el => ({
        text: el.textContent.trim(),
        hasCheck: el.querySelector('svg.text-green-500') !== null
      }));
    });
    
    console.log('  Validation state:');
    validationState.forEach(item => {
      console.log(`    • ${item.text}: ${item.hasCheck ? '✅' : '❌'}`);
    });

    // Test 4: Type "Pass123!" - all should be checked
    console.log('\n  Testing "Pass123!"...');
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type('Pass123!');
    await page.waitForTimeout(500);
    
    validationState = await page.evaluate(() => {
      const items = document.querySelectorAll('.text-xs.text-muted-foreground li');
      return Array.from(items).map(el => ({
        text: el.textContent.trim(),
        hasCheck: el.querySelector('svg.text-green-500') !== null
      }));
    });
    
    console.log('  Validation state:');
    validationState.forEach(item => {
      console.log(`    • ${item.text}: ${item.hasCheck ? '✅' : '❌'}`);
    });

    // Step 3: Fill out complete form and submit
    console.log('\n📝 Filling out complete registration form...');
    
    const timestamp = Date.now();
    const testEmail = `test.${timestamp}@example.com`;
    
    // Fill name
    await page.type('input[name="name"]', 'Test User');
    
    // Fill email
    await page.type('input[name="email"]', testEmail);
    
    // Select user type (client)
    const userTypeRadio = await page.$('input[value="client"]');
    await userTypeRadio.click();
    
    // Confirm password
    await page.type('input[name="confirmPassword"]', 'Pass123!');
    
    // Check consent boxes
    const consentBoxes = await page.$$('input[type="checkbox"][required]');
    for (const box of consentBoxes) {
      await box.click();
    }
    
    console.log('\n  Form filled with:');
    console.log(`    • Name: Test User`);
    console.log(`    • Email: ${testEmail}`);
    console.log(`    • User Type: client`);
    console.log(`    • Password: Pass123!`);
    console.log(`    • Consent boxes: checked`);

    // Submit form
    console.log('\n🚀 Submitting registration form...');
    
    const submitButton = await page.$('button[type="submit"]');
    await submitButton.click();
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('check-email')) {
      console.log('✅ Successfully redirected to check-email page!');
      console.log('✅ Registration completed successfully!');
    } else {
      console.log('❌ Did not redirect to check-email page');
      
      // Check for any error messages
      const errorMessages = await page.evaluate(() => {
        const errors = document.querySelectorAll('.text-destructive, .text-red-500, [role="alert"]');
        return Array.from(errors).map(el => el.textContent.trim());
      });
      
      if (errorMessages.length > 0) {
        console.log('\n❌ Error messages found:');
        errorMessages.forEach(msg => console.log(`  • ${msg}`));
      }
    }

    // Take a screenshot for reference
    await page.screenshot({ path: 'registration_test_result.png' });
    console.log('\n📸 Screenshot saved as registration_test_result.png');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    console.log('\n🏁 Test completed. Browser will remain open for inspection.');
    // Keep browser open for manual inspection
    await new Promise(() => {});
  }
}

testRegistrationValidation().catch(console.error);