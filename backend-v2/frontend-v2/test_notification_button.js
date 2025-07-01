const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1400, height: 900 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      console.log('BROWSER:', msg.text());
    });
    
    // Enable error logging
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    console.log('Navigating to calendar page...');
    await page.goto('http://localhost:3000/calendar');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    console.log('Looking for notification bell button...');
    
    // Look for the bell icon specifically
    const notificationButton = await page.evaluate(() => {
      // Find all buttons
      const buttons = document.querySelectorAll('button');
      for (let button of buttons) {
        // Check if this button contains a bell icon (BellIcon from heroicons)
        const svg = button.querySelector('svg');
        if (svg && svg.innerHTML.includes('path')) {
          // BellIcon has a specific path pattern
          const paths = svg.querySelectorAll('path');
          for (let path of paths) {
            const d = path.getAttribute('d');
            if (d && d.includes('M14.857 17.082')) { // BellIcon specific path
              return true;
            }
          }
        }
      }
      return false;
    });
    
    if (!notificationButton) {
      console.log('Specific bell icon not found, trying general approach...');
      
      // Try to find button with bell-like characteristics
      const bellButtonExists = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (let button of buttons) {
          const hasSpan = button.querySelector('span.absolute.top-1.right-1');
          if (hasSpan) {
            console.log('Found button with notification badge');
            return true;
          }
        }
        return false;
      });
      
      if (!bellButtonExists) {
        console.log('No notification button found');
        console.log('Current page URL:', await page.url());
        console.log('Page title:', await page.title());
        
        // Check if we're on login page
        const isLoginPage = await page.$('input[type="email"]');
        if (isLoginPage) {
          console.log('Appears to be on login page, authentication may be required');
        }
        
        await browser.close();
        return;
      }
    }
    
    console.log('Found notification button, testing click functionality...');
    
    // Click the notification button using the notification badge as indicator
    const clickResult = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (let button of buttons) {
        // Look for the notification badge span
        const badge = button.querySelector('span.absolute.top-1.right-1');
        if (badge) {
          button.click();
          return true;
        }
      }
      return false;
    });
    
    if (!clickResult) {
      console.log('Could not find and click notification button');
      await browser.close();
      return;
    }
    
    console.log('Clicked notification button');
    
    // Wait for dropdown to appear
    await page.waitForTimeout(1000);
    
    // Check if dropdown appeared
    const dropdown = await page.evaluate(() => {
      // Look for dropdown with high z-index
      const elements = document.querySelectorAll('div[style*="999999"]');
      if (elements.length > 0) {
        return elements[0].textContent;
      }
      
      // Also check for absolute positioned elements that could be the dropdown
      const absolutes = document.querySelectorAll('.absolute.right-0');
      for (let el of absolutes) {
        if (el.textContent.includes('Notifications')) {
          return el.textContent;
        }
      }
      
      return null;
    });
    
    if (dropdown) {
      console.log('✅ SUCCESS: Notification dropdown appeared!');
      console.log('Dropdown content:', dropdown);
      
      // Check if it contains expected elements
      if (dropdown.includes('Notifications') && dropdown.includes('New booking request')) {
        console.log('✅ Dropdown contains expected notification content');
      } else {
        console.log('⚠️ Dropdown content may be incomplete');
      }
      
      // Test clicking outside to close
      console.log('Testing click outside to close dropdown...');
      await page.click('body', {offset: {x: 100, y: 100}});
      await page.waitForTimeout(500);
      
      const dropdownAfterClick = await page.evaluate(() => {
        const elements = document.querySelectorAll('div[style*="999999"]');
        return elements.length > 0;
      });
      
      if (!dropdownAfterClick) {
        console.log('✅ Dropdown correctly closes when clicking outside');
      } else {
        console.log('⚠️ Dropdown did not close when clicking outside');
      }
      
    } else {
      console.log('❌ FAILED: Notification dropdown did not appear');
      
      // Debug: Check what happened
      console.log('Checking page state after click...');
      const hasNotificationText = await page.evaluate(() => {
        return document.body.textContent.includes('Notifications');
      });
      console.log('Page contains notification text:', hasNotificationText);
    }
    
    await page.waitForTimeout(2000);
    await browser.close();
    
  } catch (error) {
    console.log('Test error:', error.message);
    if (browser) await browser.close();
  }
})();