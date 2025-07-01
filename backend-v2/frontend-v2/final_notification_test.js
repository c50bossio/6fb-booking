const puppeteer = require('puppeteer');

(async () => {
  console.log('Final notification button test on port 3001...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log' && !msg.text().includes('LCP')) {
      console.log('BROWSER:', msg.text());
    }
  });
  
  try {
    console.log('Navigating to calendar page on new port...');
    await page.goto('http://localhost:3001/calendar', { waitUntil: 'domcontentloaded' });
    
    // Wait for React to load and hydrate
    await page.waitForFunction(() => {
      // Wait for either the app to load OR login page to appear
      return !document.body.textContent.includes('Loading...') || 
             document.querySelector('input[type="email"]') !== null;
    }, { timeout: 15000 });
    
    console.log('Page loaded. Current URL:', await page.url());
    
    // Check if we're on login page
    const isLoginPage = await page.$('input[type="email"]');
    if (isLoginPage) {
      console.log('📝 On login page - will attempt to log in...');
      
      // Try to log in with admin credentials
      await page.type('input[type="email"]', 'admin@6fb.com');
      await page.type('input[type="password"]', 'admin123');
      
      // Click login button
      const loginButton = await page.$('button[type="submit"]');
      if (loginButton) {
        await loginButton.click();
        console.log('Login submitted, waiting for redirect...');
        
        // Wait for navigation
        try {
          await page.waitForNavigation({ timeout: 10000 });
          console.log('Redirected to:', await page.url());
          
          // Navigate to calendar if not already there
          if (!await page.url().includes('/calendar')) {
            await page.goto('http://localhost:3001/calendar', { waitUntil: 'domcontentloaded' });
          }
          
        } catch (err) {
          console.log('Login may have failed or no redirect occurred');
        }
      }
    }
    
    // Give time for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Looking for notification button...');
    
    // Look for the notification button with badge
    const notificationResult = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      console.log('Found', buttons.length, 'buttons total');
      
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        // Look for red notification badge
        const badge = button.querySelector('span.bg-error-500');
        if (badge) {
          console.log('✅ Found notification button with badge at index:', i);
          return { found: true, index: i };
        }
      }
      
      return { found: false };
    });
    
    if (notificationResult.found) {
      console.log('🔔 Found notification button! Testing click...');
      
      // Click the notification button
      const clickResult = await page.evaluate((index) => {
        const buttons = document.querySelectorAll('button');
        const button = buttons[index];
        
        console.log('Clicking notification button...');
        button.click();
        
        return { clicked: true };
      }, notificationResult.index);
      
      console.log('Button clicked, waiting for dropdown...');
      
      // Wait and check for dropdown
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const dropdownResult = await page.evaluate(() => {
        // Look for dropdown with high z-index
        const highZElements = document.querySelectorAll('[style*="999999"]');
        if (highZElements.length > 0) {
          const dropdown = highZElements[0];
          return {
            found: true,
            content: dropdown.textContent.substring(0, 200),
            hasNotificationText: dropdown.textContent.includes('Notifications'),
            hasBookingText: dropdown.textContent.includes('booking')
          };
        }
        
        // Also check for absolute positioned elements
        const absoluteElements = document.querySelectorAll('.absolute.right-0');
        for (let el of absoluteElements) {
          if (el.textContent.includes('Notifications')) {
            return {
              found: true,
              content: el.textContent.substring(0, 200),
              hasNotificationText: true,
              hasBookingText: el.textContent.includes('booking')
            };
          }
        }
        
        return { found: false };
      });
      
      if (dropdownResult.found) {
        console.log('🎉 SUCCESS! Notification dropdown appeared!');
        console.log('✅ Has "Notifications" text:', dropdownResult.hasNotificationText);
        console.log('✅ Has booking content:', dropdownResult.hasBookingText);
        console.log('📝 Content preview:', dropdownResult.content);
        
        // Test clicking outside to close
        console.log('🖱️ Testing click outside to close dropdown...');
        await page.click('body', { offset: { x: 100, y: 100 } });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const stillVisible = await page.evaluate(() => {
          const elements = document.querySelectorAll('[style*="999999"], .absolute.right-0');
          for (let el of elements) {
            if (el.textContent.includes('Notifications')) {
              return true;
            }
          }
          return false;
        });
        
        if (!stillVisible) {
          console.log('✅ Dropdown correctly closes when clicking outside');
        } else {
          console.log('⚠️ Dropdown did not close when clicking outside');
        }
        
      } else {
        console.log('❌ FAILED: Notification dropdown did not appear after click');
      }
      
    } else {
      console.log('❌ No notification button with badge found');
      
      // Debug: Show what we found
      const debugInfo = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (header) {
          const buttons = header.querySelectorAll('button');
          return {
            hasHeader: true,
            headerButtonCount: buttons.length,
            headerContent: header.textContent.substring(0, 300)
          };
        }
        return { hasHeader: false };
      });
      
      console.log('Debug info:', debugInfo);
    }
    
    console.log('🔍 Test completed! Keeping browser open for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();