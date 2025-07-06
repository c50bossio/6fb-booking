const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function debugRegistrationPage() {
  console.log('🚀 Starting Puppeteer registration page investigation...');
  
  let browser;
  try {
    // Launch browser with debugging options
    browser = await puppeteer.launch({
      headless: false, // Show browser window
      devtools: true,  // Open DevTools
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1200, height: 800 });
    
    // Arrays to store logs and network requests
    const consoleLogs = [];
    const networkRequests = [];
    const errors = [];

    // Monitor console messages
    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      };
      consoleLogs.push(logEntry);
      console.log(`📝 Console [${msg.type()}]:`, msg.text());
    });

    // Monitor page errors
    page.on('pageerror', error => {
      const errorEntry = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      errors.push(errorEntry);
      console.log('❌ Page Error:', error.message);
    });

    // Monitor network requests
    page.on('request', request => {
      const requestEntry = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: new Date().toISOString()
      };
      networkRequests.push(requestEntry);
      console.log(`🌐 Request: ${request.method()} ${request.url()}`);
    });

    // Monitor network responses
    page.on('response', response => {
      console.log(`📡 Response: ${response.status()} ${response.url()}`);
      if (response.status() >= 400) {
        console.log(`⚠️  Failed Response: ${response.status()} ${response.url()}`);
      }
    });

    console.log('📍 Navigating to registration page...');
    
    try {
      // Navigate to registration page
      await page.goto('http://localhost:3000/register', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      console.log('✅ Page loaded successfully');
    } catch (navError) {
      console.log('❌ Navigation failed:', navError.message);
      
      // Try alternative port
      console.log('🔄 Trying port 3001...');
      await page.goto('http://localhost:3001/register', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    }

    // Take initial screenshot
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ 
      path: '/Users/bossio/6fb-booking/backend-v2/registration-page-initial.png',
      fullPage: true 
    });

    // Wait a bit for React to hydrate
    await page.waitForTimeout(2000);

    // Check page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`📄 Page Title: "${title}"`);
    console.log(`🔗 Current URL: ${url}`);

    // Try to find form elements
    console.log('🔍 Looking for form elements...');
    
    const formExists = await page.$('form');
    console.log(`📋 Form element found: ${formExists ? 'YES' : 'NO'}`);

    const nameInput = await page.$('input[name="name"], input[id="name"]');
    console.log(`👤 Name input found: ${nameInput ? 'YES' : 'NO'}`);

    const emailInput = await page.$('input[name="email"], input[id="email"]');
    console.log(`📧 Email input found: ${emailInput ? 'YES' : 'NO'}`);

    const passwordInput = await page.$('input[name="password"], input[id="password"]');
    console.log(`🔒 Password input found: ${passwordInput ? 'YES' : 'NO'}`);

    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    console.log(`🚀 Submit button found: ${submitButton ? 'YES' : 'NO'}`);

    // Get page content preview
    const bodyText = await page.evaluate(() => {
      return document.body ? document.body.innerText.substring(0, 500) : 'No body content';
    });
    console.log('📝 Page content preview:', bodyText.substring(0, 200) + '...');

    // Check for specific error messages
    const errorElements = await page.$$('.error, .alert, [class*="error"], [class*="alert"]');
    if (errorElements.length > 0) {
      console.log(`⚠️  Found ${errorElements.length} error-related elements`);
      for (let i = 0; i < errorElements.length; i++) {
        const errorText = await errorElements[i].textContent();
        console.log(`   Error ${i + 1}: ${errorText}`);
      }
    }

    // Try to fill out and submit the form if it exists
    if (formExists && nameInput && emailInput && passwordInput) {
      console.log('📝 Attempting to fill out the form...');
      
      try {
        await nameInput.type('Puppeteer Test User');
        await emailInput.type('puppeteer.test@example.com');
        await passwordInput.type('TestPassword123');
        
        // Look for confirm password field
        const confirmPasswordInput = await page.$('input[name="confirmPassword"], input[name="password_confirm"], input[id="confirmPassword"]');
        if (confirmPasswordInput) {
          await confirmPasswordInput.type('TestPassword123');
        }
        
        // Look for and check consent checkboxes
        const checkboxes = await page.$$('input[type="checkbox"]');
        console.log(`☑️  Found ${checkboxes.length} checkboxes`);
        
        for (const checkbox of checkboxes) {
          const isRequired = await checkbox.evaluate(el => el.hasAttribute('required'));
          if (isRequired) {
            await checkbox.click();
            console.log('✅ Checked required checkbox');
          }
        }
        
        // Take screenshot before submission
        await page.screenshot({ 
          path: '/Users/bossio/6fb-booking/backend-v2/registration-form-filled.png',
          fullPage: true 
        });
        
        console.log('🚀 Attempting to submit form...');
        
        // Submit the form
        if (submitButton) {
          await submitButton.click();
          
          // Wait for navigation or response
          await page.waitForTimeout(3000);
          
          // Take screenshot after submission
          await page.screenshot({ 
            path: '/Users/bossio/6fb-booking/backend-v2/registration-after-submit.png',
            fullPage: true 
          });
          
          const newUrl = page.url();
          console.log(`🔗 URL after submission: ${newUrl}`);
          
          // Check for success or error messages
          const pageContent = await page.evaluate(() => document.body.innerText);
          if (pageContent.includes('success') || pageContent.includes('check your email')) {
            console.log('✅ Form submission appears successful');
          } else if (pageContent.includes('error') || pageContent.includes('failed')) {
            console.log('❌ Form submission appears to have failed');
          }
        }
        
      } catch (formError) {
        console.log('❌ Error during form interaction:', formError.message);
      }
    }

    // Save debug information
    const debugData = {
      url,
      title,
      consoleLogs,
      networkRequests,
      errors,
      timestamp: new Date().toISOString(),
      pageContent: bodyText
    };
    
    fs.writeFileSync(
      '/Users/bossio/6fb-booking/backend-v2/registration-debug-data.json',
      JSON.stringify(debugData, null, 2)
    );

    console.log('📊 Debug data saved to registration-debug-data.json');
    console.log(`📸 Screenshots saved:`);
    console.log('   - registration-page-initial.png');
    console.log('   - registration-form-filled.png (if form found)');
    console.log('   - registration-after-submit.png (if form submitted)');

  } catch (error) {
    console.error('💥 Critical error during debugging:', error);
  } finally {
    if (browser) {
      // Keep browser open for manual inspection
      console.log('🔍 Browser will remain open for manual inspection...');
      console.log('Press Ctrl+C to close when done');
      
      // Wait for manual termination
      process.on('SIGINT', async () => {
        console.log('📚 Closing browser...');
        await browser.close();
        process.exit(0);
      });
    }
  }
}

// Run the debug function
debugRegistrationPage().catch(console.error);