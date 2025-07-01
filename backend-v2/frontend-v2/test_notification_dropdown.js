const puppeteer = require('puppeteer');

async function testNotificationDropdown() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  let page;
  
  try {
    page = await browser.newPage();
    
    // Navigate to the notification page
    await page.goto('http://localhost:3000/notifications');
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Page loaded, looking for notification button...');
    
    // Try to find and click the notification button in the header
    const notificationButton = await page.$('button[aria-label="Notifications"]');
    
    if (notificationButton) {
      console.log('Found notification button, clicking...');
      
      // Take screenshot before clicking
      await page.screenshot({ 
        path: 'notification_before_click.png',
        fullPage: true 
      });
      
      // Click the notification button
      await notificationButton.click();
      
      // Wait for dropdown to appear
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if dropdown is visible
      const dropdown = await page.$('[role="menu"]');
      
      if (dropdown) {
        const isVisible = await dropdown.isIntersectingViewport();
        console.log('Dropdown found and visible:', isVisible);
        
        // Take screenshot with dropdown open
        await page.screenshot({ 
          path: 'notification_dropdown_open.png',
          fullPage: true 
        });
        
        // Try to interact with dropdown items
        const dropdownItems = await page.$$('[role="menuitem"]');
        console.log(`Found ${dropdownItems.length} dropdown items`);
        
        // Check z-index and positioning
        const dropdownStyles = await page.evaluate(() => {
          const dropdown = document.querySelector('[role="menu"]');
          if (dropdown) {
            const styles = window.getComputedStyle(dropdown);
            return {
              position: styles.position,
              zIndex: styles.zIndex,
              display: styles.display,
              visibility: styles.visibility,
              opacity: styles.opacity
            };
          }
          return null;
        });
        
        console.log('Dropdown styles:', dropdownStyles);
        
        // Check if Portal is working
        const portalCheck = await page.evaluate(() => {
          const dropdown = document.querySelector('[role="menu"]');
          if (dropdown) {
            let parent = dropdown.parentElement;
            while (parent) {
              if (parent === document.body) {
                return 'Portal is working - dropdown is attached to body';
              }
              parent = parent.parentElement;
            }
            return 'Portal may not be working - dropdown is nested';
          }
          return 'No dropdown found';
        });
        
        console.log('Portal check:', portalCheck);
        
      } else {
        console.log('Dropdown not found after clicking');
        
        // Take screenshot to show current state
        await page.screenshot({ 
          path: 'notification_dropdown_not_found.png',
          fullPage: true 
        });
      }
      
    } else {
      console.log('Notification button not found');
      
      // Take screenshot to show current state
      await page.screenshot({ 
        path: 'notification_button_not_found.png',
        fullPage: true 
      });
    }
    
    // Test scrollbar styling
    console.log('\nChecking scrollbar styling...');
    const scrollbarStyles = await page.evaluate(() => {
      const testDiv = document.createElement('div');
      testDiv.style.height = '100px';
      testDiv.style.overflow = 'auto';
      testDiv.innerHTML = '<div style="height: 200px;"></div>';
      document.body.appendChild(testDiv);
      
      const styles = window.getComputedStyle(testDiv, '::-webkit-scrollbar');
      const result = {
        scrollbarWidth: styles.width,
        scrollbarPresent: testDiv.scrollHeight > testDiv.clientHeight
      };
      
      document.body.removeChild(testDiv);
      return result;
    });
    
    console.log('Scrollbar check:', scrollbarStyles);
    
  } catch (error) {
    console.error('Error during test:', error);
    
    // Take error screenshot if page exists
    if (page) {
      await page.screenshot({ 
        path: 'notification_error.png',
        fullPage: true 
      });
    }
  }
  
  console.log('\nTest complete. Check the screenshots.');
  await browser.close();
}

testNotificationDropdown().catch(console.error);