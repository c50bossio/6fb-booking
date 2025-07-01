const puppeteer = require('puppeteer');

async function testHomepage() {
  console.log('Starting homepage test with Puppeteer...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to false to see the browser
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Take a screenshot for reference
    await page.screenshot({ path: 'homepage-test.png', fullPage: true });
    console.log('Screenshot saved as homepage-test.png');
    
    // Check for blue bar elements
    console.log('\n--- Checking for blue bars ---');
    
    // Check for any elements with blue/slate background classes
    const blueBarElements = await page.evaluate(() => {
      const elements = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        const className = el.className;
        if (typeof className === 'string') {
          if (className.includes('bg-slate-') || 
              className.includes('bg-blue-') || 
              className.includes('from-slate-') ||
              className.includes('to-slate-')) {
            const rect = el.getBoundingClientRect();
            if (rect.height > 0 && rect.width > 0) {
              elements.push({
                tag: el.tagName,
                className: className,
                text: el.textContent?.substring(0, 100),
                position: { top: rect.top, height: rect.height }
              });
            }
          }
        }
      });
      
      return elements;
    });
    
    console.log(`Found ${blueBarElements.length} elements with blue/slate backgrounds:`);
    blueBarElements.forEach((el, i) => {
      console.log(`${i + 1}. ${el.tag} at top: ${el.position.top}px, height: ${el.position.height}px`);
      console.log(`   Classes: ${el.className}`);
      console.log(`   Text: ${el.text?.trim().substring(0, 50)}...`);
    });
    
    // Check for buttons and their functionality
    console.log('\n--- Checking buttons ---');
    
    const buttons = await page.evaluate(() => {
      const buttonInfo = [];
      
      // Find all links and buttons
      const links = document.querySelectorAll('a[href], button');
      
      links.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          buttonInfo.push({
            type: el.tagName,
            text: el.textContent?.trim(),
            href: el.getAttribute('href'),
            className: el.className,
            position: { top: rect.top, left: rect.left },
            visible: rect.top >= 0 && rect.top < window.innerHeight
          });
        }
      });
      
      return buttonInfo;
    });
    
    console.log(`Found ${buttons.length} clickable elements:`);
    buttons.forEach((btn, i) => {
      console.log(`${i + 1}. ${btn.type}: "${btn.text}" ${btn.href ? `-> ${btn.href}` : ''}`);
      console.log(`   Visible: ${btn.visible}, Position: top=${btn.position.top}px`);
    });
    
    // Test button clicks
    console.log('\n--- Testing button clicks ---');
    
    // Test Login button
    try {
      const loginButton = await page.$('a[href="/login"]');
      if (loginButton) {
        console.log('Found Login button, testing click...');
        
        // Add navigation promise
        const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
        await loginButton.click();
        
        try {
          await navigationPromise;
          const newUrl = page.url();
          console.log(`✅ Login button clicked successfully! Navigated to: ${newUrl}`);
          
          // Go back to homepage
          await page.goBack();
        } catch (navError) {
          console.log('❌ Login button clicked but navigation did not occur');
        }
      } else {
        console.log('❌ Login button not found');
      }
    } catch (error) {
      console.log('❌ Error testing Login button:', error.message);
    }
    
    // Test Start Free Trial button
    try {
      const signupButton = await page.$('a[href="/signup"]');
      if (signupButton) {
        console.log('\nFound Start Free Trial button, testing click...');
        
        const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
        await signupButton.click();
        
        try {
          await navigationPromise;
          const newUrl = page.url();
          console.log(`✅ Start Free Trial button clicked successfully! Navigated to: ${newUrl}`);
        } catch (navError) {
          console.log('❌ Start Free Trial button clicked but navigation did not occur');
        }
      } else {
        console.log('❌ Start Free Trial button not found');
      }
    } catch (error) {
      console.log('❌ Error testing Start Free Trial button:', error.message);
    }
    
    // Check page content
    console.log('\n--- Page Content Check ---');
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        h1Text: document.querySelector('h1')?.textContent,
        hasBookedBarberLogo: !!document.querySelector('img[alt*="BookedBarber"]'),
        bodyClasses: document.body.className
      };
    });
    
    console.log('Page title:', pageContent.title);
    console.log('Main heading:', pageContent.h1Text);
    console.log('Has BookedBarber logo:', pageContent.hasBookedBarberLogo);
    console.log('Body classes:', pageContent.bodyClasses);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\n--- Test complete. Browser will remain open for 10 seconds ---');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await browser.close();
  }
}

// Run the test
testHomepage().catch(console.error);