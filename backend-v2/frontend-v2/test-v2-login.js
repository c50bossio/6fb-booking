const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to V2 login page...');
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    // Wait for the page to fully render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot
    await page.screenshot({ path: 'v2-login-screenshot.png', fullPage: true });
    console.log('Screenshot saved to v2-login-screenshot.png');
    
    // Get page content
    const pageContent = await page.content();
    
    // Check for V2 indicators
    const indicators = {
      has6FBPlatform: pageContent.includes('6FB Platform'),
      hasBookedBarber: pageContent.includes('BookedBarber'),
      hasSignIn: pageContent.includes('Sign in') || pageContent.includes('Sign In'),
      hasDemoMode: pageContent.includes('demo') || pageContent.includes('Demo')
    };
    
    console.log('\nV2 Indicators:');
    console.log('- Has "6FB Platform" text:', indicators.has6FBPlatform);
    console.log('- Has "BookedBarber" text:', indicators.hasBookedBarber);
    console.log('- Has Sign in text:', indicators.hasSignIn);
    console.log('- Has Demo mode:', indicators.hasDemoMode);
    
    // Get specific page elements
    const pageElements = await page.evaluate(() => {
      return {
        title: document.title,
        h1Text: document.querySelector('h1')?.innerText || 'No H1',
        h2Text: document.querySelector('h2')?.innerText || 'No H2',
        logoAlt: document.querySelector('img[alt*="Logo"]')?.alt || 'No logo found',
        buttonTexts: Array.from(document.querySelectorAll('button')).map(b => b.innerText).filter(t => t),
        cardTitle: document.querySelector('[class*="card-title"]')?.innerText || 
                   document.querySelector('.text-2xl')?.innerText || 'No card title'
      };
    });
    
    console.log('\nPage Elements:');
    console.log('- Title:', pageElements.title);
    console.log('- H1:', pageElements.h1Text);
    console.log('- H2:', pageElements.h2Text);
    console.log('- Logo:', pageElements.logoAlt);
    console.log('- Card Title:', pageElements.cardTitle);
    console.log('- Buttons:', pageElements.buttonTexts);
    
    // Check form structure
    const formCheck = await page.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passwordInput = document.querySelector('input[type="password"]');
      const submitButton = document.querySelector('button[type="submit"]');
      
      return {
        hasEmailInput: !!emailInput,
        hasPasswordInput: !!passwordInput,
        hasSubmitButton: !!submitButton,
        emailPlaceholder: emailInput?.placeholder || '',
        submitText: submitButton?.innerText || ''
      };
    });
    
    console.log('\nForm Structure:');
    console.log('- Has email input:', formCheck.hasEmailInput);
    console.log('- Has password input:', formCheck.hasPasswordInput);
    console.log('- Email placeholder:', formCheck.emailPlaceholder);
    console.log('- Submit button text:', formCheck.submitText);
    
    console.log('\n✅ V2 Frontend Test Complete!');
    
  } catch (error) {
    console.error('Error during V2 test:', error.message);
  } finally {
    await browser.close();
  }
})();