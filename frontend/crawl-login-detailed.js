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
    
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    // Wait for the page to fully render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot
    await page.screenshot({ path: 'login-page-screenshot.png', fullPage: true });
    console.log('Screenshot saved to login-page-screenshot.png');
    
    // Get page content
    const pageContent = await page.content();
    
    // Check for V1/V2 indicators in the HTML
    const indicators = {
      has6FBPlatform: pageContent.includes('6FB Platform'),
      hasBookedBarber: pageContent.includes('BookedBarber'),
      hasLoginText: pageContent.includes('Login') || pageContent.includes('Sign in'),
      hasDemoMode: pageContent.includes('demo') || pageContent.includes('Demo')
    };
    
    console.log('\nV1/V2 Indicators from HTML:');
    console.log('- Has "6FB Platform" text:', indicators.has6FBPlatform);
    console.log('- Has "BookedBarber" text:', indicators.hasBookedBarber);
    console.log('- Has Login/Sign in text:', indicators.hasLoginText);
    console.log('- Has Demo mode text:', indicators.hasDemoMode);
    
    // Try to get text content
    const textContent = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText || '',
        title: document.title,
        h1Text: document.querySelector('h1')?.innerText || 'No H1 found',
        h2Text: document.querySelector('h2')?.innerText || 'No H2 found',
        h3Text: document.querySelector('h3')?.innerText || 'No H3 found',
        buttonTexts: Array.from(document.querySelectorAll('button')).map(b => b.innerText).filter(t => t),
        linkTexts: Array.from(document.querySelectorAll('a')).map(a => a.innerText).filter(t => t)
      };
    });
    
    console.log('\nPage Text Content:');
    console.log('- Title:', textContent.title);
    console.log('- H1:', textContent.h1Text);
    console.log('- H2:', textContent.h2Text);
    console.log('- H3:', textContent.h3Text);
    console.log('- Buttons:', textContent.buttonTexts);
    console.log('- Links:', textContent.linkTexts);
    console.log('- Body preview:', textContent.bodyText.substring(0, 200) + '...');
    
    // Check specific V1 login page structure
    const v1LoginCheck = await page.evaluate(() => {
      const form = document.querySelector('form');
      const emailInput = document.querySelector('input[type="email"]');
      const passwordInput = document.querySelector('input[type="password"]');
      const submitButton = document.querySelector('button[type="submit"]');
      
      return {
        hasForm: !!form,
        hasEmailInput: !!emailInput,
        hasPasswordInput: !!passwordInput,
        hasSubmitButton: !!submitButton,
        emailPlaceholder: emailInput?.placeholder || '',
        submitButtonText: submitButton?.innerText || ''
      };
    });
    
    console.log('\nLogin Form Structure:');
    console.log('- Has form:', v1LoginCheck.hasForm);
    console.log('- Has email input:', v1LoginCheck.hasEmailInput);
    console.log('- Has password input:', v1LoginCheck.hasPasswordInput);
    console.log('- Has submit button:', v1LoginCheck.hasSubmitButton);
    console.log('- Email placeholder:', v1LoginCheck.emailPlaceholder);
    console.log('- Submit button text:', v1LoginCheck.submitButtonText);
    
  } catch (error) {
    console.error('Error during crawl:', error.message);
  } finally {
    await browser.close();
  }
})();