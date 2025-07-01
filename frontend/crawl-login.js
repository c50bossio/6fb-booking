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
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Take screenshot
    await page.screenshot({ path: 'login-page-screenshot.png', fullPage: true });
    console.log('Screenshot saved to login-page-screenshot.png');
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for V1 indicators
    const v1Indicators = await page.evaluate(() => {
      const indicators = {
        has6FBPlatform: false,
        hasBookedBarber: false,
        headerText: '',
        welcomeText: '',
        logoAlt: '',
        buttonText: '',
        demoModeVisible: false
      };
      
      // Check for "6FB Platform" text
      const platformText = document.querySelector('h1, h2, h3');
      if (platformText) {
        indicators.headerText = platformText.textContent;
        indicators.has6FBPlatform = platformText.textContent.includes('6FB Platform');
        indicators.hasBookedBarber = platformText.textContent.includes('BookedBarber');
      }
      
      // Check welcome text
      const welcomeEl = document.querySelector('p');
      if (welcomeEl) {
        indicators.welcomeText = welcomeEl.textContent;
      }
      
      // Check logo
      const logo = document.querySelector('img[alt*="Logo"]');
      if (logo) {
        indicators.logoAlt = logo.alt;
      }
      
      // Check button text
      const button = document.querySelector('button[type="submit"]');
      if (button) {
        indicators.buttonText = button.textContent;
      }
      
      // Check for demo mode
      const demoMode = document.querySelector('[class*="demo"], [id*="demo"]');
      indicators.demoModeVisible = !!demoMode;
      
      return indicators;
    });
    
    console.log('\nV1/V2 Indicators:');
    console.log('- Has "6FB Platform" text:', v1Indicators.has6FBPlatform);
    console.log('- Has "BookedBarber" text:', v1Indicators.hasBookedBarber);
    console.log('- Header text:', v1Indicators.headerText);
    console.log('- Welcome text:', v1Indicators.welcomeText);
    console.log('- Logo alt text:', v1Indicators.logoAlt);
    console.log('- Button text:', v1Indicators.buttonText);
    console.log('- Demo mode visible:', v1Indicators.demoModeVisible);
    
    // Get form structure
    const formStructure = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      
      const inputs = Array.from(form.querySelectorAll('input')).map(input => ({
        type: input.type,
        name: input.name,
        placeholder: input.placeholder,
        id: input.id
      }));
      
      return {
        action: form.action,
        method: form.method,
        inputs: inputs
      };
    });
    
    console.log('\nForm structure:', JSON.stringify(formStructure, null, 2));
    
    // Check CSS classes for version hints
    const versionClasses = await page.evaluate(() => {
      const body = document.body;
      const mainContainer = document.querySelector('main, div[class*="container"]');
      return {
        bodyClasses: body.className,
        mainClasses: mainContainer ? mainContainer.className : 'none'
      };
    });
    
    console.log('\nCSS Classes:');
    console.log('- Body:', versionClasses.bodyClasses);
    console.log('- Main container:', versionClasses.mainClasses);
    
  } catch (error) {
    console.error('Error during crawl:', error);
  } finally {
    await browser.close();
  }
})();