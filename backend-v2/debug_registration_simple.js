const puppeteer = require('puppeteer');

async function debugRegistrationPage() {
  console.log('=== BookedBarber Registration Page Debug Report ===\n');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Collect console messages
    const consoleLogs = [];
    const errors = [];
    const warnings = [];
    
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();
      
      const logEntry = {
        type,
        text,
        location: location.url ? `${location.url}:${location.lineNumber}` : 'unknown'
      };
      
      consoleLogs.push(logEntry);
      
      if (type === 'error') errors.push(logEntry);
      if (type === 'warning') warnings.push(logEntry);
    });
    
    // Collect page errors
    page.on('pageerror', error => {
      errors.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack
      });
    });
    
    // Collect failed requests
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure()
      });
    });
    
    // Collect API requests
    const apiRequests = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('api') || url.includes('localhost:8000')) {
        apiRequests.push({
          url,
          status: response.status(),
          statusText: response.statusText(),
          method: response.request().method()
        });
      }
    });
    
    console.log('1. Navigating to registration page...');
    await page.goto('http://localhost:3000/register', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✓ Page loaded\n');
    
    // Check page structure
    console.log('2. Page Structure Analysis:');
    const pageAnalysis = await page.evaluate(() => {
      return {
        title: document.title,
        hasReactRoot: !!document.querySelector('#__next'),
        hasForm: !!document.querySelector('form'),
        formCount: document.querySelectorAll('form').length,
        inputCount: document.querySelectorAll('input').length,
        buttonCount: document.querySelectorAll('button').length,
        errorMessages: Array.from(document.querySelectorAll('.error, .text-red-500, [role="alert"]'))
          .map(el => el.textContent.trim()),
        currentUrl: window.location.href
      };
    });
    
    console.log(`  Title: ${pageAnalysis.title}`);
    console.log(`  React Root: ${pageAnalysis.hasReactRoot ? '✓' : '✗'}`);
    console.log(`  Forms: ${pageAnalysis.formCount}`);
    console.log(`  Input fields: ${pageAnalysis.inputCount}`);
    console.log(`  Buttons: ${pageAnalysis.buttonCount}`);
    console.log(`  Error messages: ${pageAnalysis.errorMessages.length}`);
    if (pageAnalysis.errorMessages.length > 0) {
      pageAnalysis.errorMessages.forEach(err => {
        console.log(`    - ${err}`);
      });
    }
    console.log('');
    
    // Check registration components
    console.log('3. Registration Components:');
    const components = await page.evaluate(() => {
      return {
        multiStepRegistration: !!document.querySelector('[data-testid="multi-step-registration"]'),
        businessTypeSelection: !!document.querySelector('[data-testid="business-type-selection"]'),
        accountSetup: !!document.querySelector('[data-testid="account-setup"]'),
        paymentSetup: !!document.querySelector('[data-testid="payment-setup"]'),
        progressIndicator: !!document.querySelector('.progress-bar, [role="progressbar"], [class*="progress"]'),
        currentStepText: document.querySelector('[class*="Step"], [data-current-step]')?.textContent || 'Not found'
      };
    });
    
    Object.entries(components).forEach(([key, value]) => {
      console.log(`  ${key}: ${value === true ? '✓' : value === false ? '✗' : value}`);
    });
    console.log('');
    
    // Test buttons and form interactions
    console.log('4. Interactive Elements:');
    const interactions = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const inputs = Array.from(document.querySelectorAll('input'));
      
      return {
        buttons: buttons.map(btn => ({
          text: btn.textContent.trim(),
          disabled: btn.disabled,
          type: btn.type,
          hasOnClick: !!btn.onclick || !!btn.getAttribute('onClick'),
          hasReactHandler: Object.keys(btn).some(key => key.startsWith('__react'))
        })),
        inputs: inputs.map(input => ({
          name: input.name || input.id,
          type: input.type,
          required: input.required,
          disabled: input.disabled,
          value: input.value ? '[has value]' : '[empty]'
        }))
      };
    });
    
    console.log(`  Buttons (${interactions.buttons.length}):`);
    interactions.buttons.forEach(btn => {
      const status = btn.disabled ? '✗' : '✓';
      const handler = btn.hasOnClick || btn.hasReactHandler ? 'has handler' : 'no handler';
      console.log(`    ${status} "${btn.text}" - ${btn.type} - ${handler}`);
    });
    
    console.log(`\n  Input Fields (${interactions.inputs.length}):`);
    interactions.inputs.forEach(input => {
      const status = input.disabled ? '✗' : '✓';
      console.log(`    ${status} ${input.type}: ${input.name} ${input.required ? '(required)' : ''} ${input.value}`);
    });
    console.log('');
    
    // Try to interact with first step
    console.log('5. Testing First Step Interaction:');
    try {
      // Check if business type selection is visible
      const businessTypeVisible = await page.evaluate(() => {
        const elem = document.querySelector('[data-testid="business-type-selection"]');
        return elem && window.getComputedStyle(elem).display !== 'none';
      });
      
      if (businessTypeVisible) {
        console.log('  Business type selection is visible');
        
        // Try to click a business type
        const businessTypes = await page.$$('[data-business-type], [role="radio"], .business-type-card, [class*="business-type"]');
        console.log(`  Found ${businessTypes.length} business type options`);
        
        if (businessTypes.length > 0) {
          await businessTypes[0].click();
          console.log('  ✓ Clicked first business type');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to find and click continue button
          const continueButton = await page.$('button:contains("Continue"), button:contains("Next")');
          if (continueButton) {
            const buttonText = await continueButton.evaluate(el => el.textContent);
            const isDisabled = await continueButton.evaluate(el => el.disabled);
            console.log(`  Found continue button: "${buttonText.trim()}" (disabled: ${isDisabled})`);
          }
        }
      } else {
        console.log('  Business type selection not visible - checking current step');
      }
    } catch (err) {
      console.log(`  Error during interaction: ${err.message}`);
    }
    console.log('');
    
    // Console logs
    console.log('6. Console Logs:');
    if (consoleLogs.length === 0) {
      console.log('  No console logs captured');
    } else {
      consoleLogs.slice(-20).forEach(log => {
        const icon = log.type === 'error' ? '❌' : log.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} [${log.type}] ${log.text}`);
        if (log.location !== 'unknown') {
          console.log(`     at ${log.location}`);
        }
      });
    }
    console.log('');
    
    // JavaScript Errors
    console.log('7. JavaScript Errors:');
    if (errors.length === 0) {
      console.log('  ✓ No JavaScript errors detected');
    } else {
      errors.forEach(error => {
        console.log(`  ❌ ${error.text}`);
        if (error.stack) {
          console.log(`     Stack trace:\n${error.stack.split('\n').map(line => '       ' + line).join('\n')}`);
        }
      });
    }
    console.log('');
    
    // Network/API Requests
    console.log('8. API Requests:');
    if (apiRequests.length === 0) {
      console.log('  No API requests captured');
    } else {
      apiRequests.forEach(req => {
        const icon = req.status < 400 ? '✓' : '❌';
        console.log(`  ${icon} ${req.method} ${req.url} - ${req.status} ${req.statusText}`);
      });
    }
    
    if (failedRequests.length > 0) {
      console.log('\n  Failed Requests:');
      failedRequests.forEach(req => {
        console.log(`  ❌ ${req.method} ${req.url}`);
        console.log(`     Failure: ${req.failure.errorText}`);
      });
    }
    console.log('');
    
    // Check specific subscription button issue
    console.log('9. Subscription/Pricing Step Analysis:');
    const pricingAnalysis = await page.evaluate(() => {
      // Look for pricing-related elements
      const pricingElements = document.querySelectorAll('[class*="pricing"], [class*="subscription"], [class*="payment"], [data-testid="payment-setup"]');
      const subscribeButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.toLowerCase().includes('subscribe') || 
        btn.textContent.toLowerCase().includes('payment') ||
        btn.textContent.toLowerCase().includes('continue')
      );
      
      return {
        pricingElementsCount: pricingElements.length,
        pricingElementsVisible: Array.from(pricingElements).filter(el => 
          window.getComputedStyle(el).display !== 'none'
        ).length,
        subscribeButtons: subscribeButtons.map(btn => ({
          text: btn.textContent.trim(),
          disabled: btn.disabled,
          visible: window.getComputedStyle(btn).display !== 'none',
          parent: btn.parentElement?.className || 'unknown'
        }))
      };
    });
    
    console.log(`  Pricing elements found: ${pricingAnalysis.pricingElementsCount}`);
    console.log(`  Pricing elements visible: ${pricingAnalysis.pricingElementsVisible}`);
    console.log(`  Subscribe/Continue buttons: ${pricingAnalysis.subscribeButtons.length}`);
    pricingAnalysis.subscribeButtons.forEach(btn => {
      console.log(`    - "${btn.text}" (disabled: ${btn.disabled}, visible: ${btn.visible})`);
    });
    
    console.log('\n=== END OF ANALYSIS ===');
    
  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the debug script
debugRegistrationPage().catch(console.error);