const puppeteer = require('puppeteer');

async function testNotificationPage() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  let page;
  
  try {
    page = await browser.newPage();
    
    // Go to test page
    console.log('Going to test notification page...');
    await page.goto('http://localhost:3000/test-notification', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    console.log('Page loaded, testing dropdowns...');
    
    // Test 1: Radix UI Dropdown
    console.log('\nTesting Radix UI dropdown...');
    const radixButton = await page.$('button[aria-label="Notifications"]');
    if (radixButton) {
      await radixButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const radixDropdown = await page.$('[role="menu"]');
      console.log('Radix dropdown found:', !!radixDropdown);
      
      await page.screenshot({ 
        path: 'test_radix_dropdown.png',
        fullPage: true 
      });
    }
    
    // Click somewhere to close
    await page.click('body');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 2: Custom Portal
    console.log('\nTesting custom portal dropdown...');
    const customButtons = await page.$$('button[aria-label="Notifications"]');
    if (customButtons.length > 1) {
      await customButtons[1].click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await page.screenshot({ 
        path: 'test_custom_dropdown.png',
        fullPage: true 
      });
      
      // Check if dropdown is visible
      const customDropdownVisible = await page.evaluate(() => {
        const dropdowns = document.querySelectorAll('.fixed.z-\\[9999\\]');
        return dropdowns.length > 0;
      });
      console.log('Custom dropdown visible:', customDropdownVisible);
    }
    
    // Click backdrop to close
    await page.click('body');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 3: React Portal
    console.log('\nTesting React portal dropdown...');
    const portalButtons = await page.$$('button[aria-label="Notifications"]');
    if (portalButtons.length > 2) {
      await portalButtons[2].click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await page.screenshot({ 
        path: 'test_portal_dropdown.png',
        fullPage: true 
      });
      
      // Check portal implementation
      const portalInfo = await page.evaluate(() => {
        const dropdowns = document.querySelectorAll('.fixed.z-\\[9999\\]');
        const portalDropdown = Array.from(dropdowns).find(d => 
          d.textContent?.includes('React Portal')
        );
        
        if (portalDropdown) {
          const parent = portalDropdown.parentElement;
          return {
            found: true,
            parentTag: parent?.tagName,
            isDirectBodyChild: parent === document.body,
            position: {
              top: portalDropdown.style.top,
              right: portalDropdown.style.right
            }
          };
        }
        return { found: false };
      });
      
      console.log('Portal info:', JSON.stringify(portalInfo, null, 2));
    }
    
    console.log('\nAll tests complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
    try {
      await page.screenshot({ 
        path: 'test_error.png',
        fullPage: true 
      });
    } catch (e) {
      console.error('Could not take screenshot');
    }
  }
  
  await browser.close();
}

testNotificationPage();