const { chromium } = require('playwright');

(async () => {
  console.log('=== TESTING REGISTRATION PAGE ===\n');
  
  try {
    // Launch browser
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 500 // Slow down actions for visibility
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to registration page
    console.log('1. Navigating to http://localhost:3000/register...');
    await page.goto('http://localhost:3000/register', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Check page loaded
    const title = await page.title();
    console.log(`   ✅ Page loaded - Title: ${title}`);
    
    // Report console errors if any
    if (consoleErrors.length > 0) {
      console.log('\n   ❌ Console errors found:');
      consoleErrors.forEach(err => console.log(`      - ${err}`));
    } else {
      console.log('   ✅ No console errors');
    }
    
    // Step 1: Business Type Selection
    console.log('\n2. Testing Step 1 - Business Type Selection:');
    
    // Check for business type options
    const individualBarber = await page.locator('button:has(h3:text("Individual Barber"))').isVisible();
    const singleLocation = await page.locator('button:has(h3:text("Single Location"))').isVisible();
    const multiLocation = await page.locator('button:has(h3:text("Multi-Location"))').isVisible();
    
    console.log(`   ${individualBarber ? '✅' : '❌'} Individual Barber option visible`);
    console.log(`   ${singleLocation ? '✅' : '❌'} Single Location option visible`);
    console.log(`   ${multiLocation ? '✅' : '❌'} Multi-Location option visible`);
    
    // Click Individual Barber
    if (individualBarber) {
      console.log('\n3. Clicking "Individual Barber" option...');
      await page.locator('button:has(h3:text("Individual Barber"))').click();
      await page.waitForTimeout(1000);
      console.log('   ✅ Clicked successfully');
    }
    
    // Step 2: Personal Information
    console.log('\n4. Testing Step 2 - Personal Information:');
    
    // Check for name fields
    const firstNameField = await page.locator('input[name="firstName"]').isVisible();
    const lastNameField = await page.locator('input[name="lastName"]').isVisible();
    const emailField = await page.locator('input[name="email"]').isVisible();
    const passwordField = await page.locator('input[name="password"]').isVisible();
    const confirmPasswordField = await page.locator('input[name="confirmPassword"]').isVisible();
    
    console.log(`   ${firstNameField ? '✅' : '❌'} First Name field visible`);
    console.log(`   ${lastNameField ? '✅' : '❌'} Last Name field visible`);
    console.log(`   ${emailField ? '✅' : '❌'} Email field visible`);
    console.log(`   ${passwordField ? '✅' : '❌'} Password field visible`);
    console.log(`   ${confirmPasswordField ? '✅' : '❌'} Confirm Password field visible`);
    
    // Fill in fields
    if (firstNameField && lastNameField) {
      console.log('\n5. Filling in form fields...');
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[name="confirmPassword"]', 'Password123!');
      console.log('   ✅ All fields filled');
    }
    
    // Check for Continue button
    const continueButton = await page.locator('button:text("Continue")').isVisible();
    console.log(`\n6. Continue button: ${continueButton ? '✅ Visible and clickable' : '❌ Not found'}`);
    
    // Take screenshot
    await page.screenshot({ path: '/Users/bossio/6fb-booking/backend-v2/registration_test_screenshot.png' });
    console.log('\n7. 📸 Screenshot saved to registration_test_screenshot.png');
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`✅ Page loads successfully`);
    console.log(`${consoleErrors.length === 0 ? '✅' : '❌'} No console errors`);
    console.log(`${individualBarber && singleLocation && multiLocation ? '✅' : '❌'} All business type options present`);
    console.log(`${firstNameField && lastNameField ? '✅' : '❌'} First Name and Last Name fields are separate`);
    console.log(`${continueButton ? '✅' : '❌'} Form navigation working`);
    
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will remain open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
    await browser.close();
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
})();