const puppeteer = require('puppeteer');

async function testNotificationDropdown() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  let page;
  
  try {
    page = await browser.newPage();
    
    // First, login
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill in login credentials
    await page.type('input[type="email"]', 'admin@6fb.com');
    await page.type('input[type="password"]', 'admin123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForNavigation();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Navigate to the notifications page
    console.log('Navigating to notifications page...');
    await page.goto('http://localhost:3000/notifications');
    
    // Wait for the page to load
    await page.waitForSelector('main', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Page loaded, looking for notification button...');
    
    // Try multiple selectors for the notification button
    const selectors = [
      'button[aria-label="Notifications"]',
      'button svg.lucide-bell',
      'button:has(svg.lucide-bell)',
      '[role="button"]:has(svg.lucide-bell)',
      'header button:has(svg.lucide-bell)'
    ];
    
    let notificationButton = null;
    for (const selector of selectors) {
      try {
        notificationButton = await page.$(selector);
        if (notificationButton) {
          console.log(`Found notification button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    if (notificationButton) {
      console.log('Found notification button, clicking...');
      
      // Take screenshot before clicking
      await page.screenshot({ 
        path: 'notification_before_click.png',
        fullPage: true 
      });
      
      // Get button position for debugging
      const box = await notificationButton.boundingBox();
      console.log('Button position:', box);
      
      // Click the notification button
      await notificationButton.click();
      
      // Wait for dropdown to appear
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check if dropdown is visible using multiple selectors
      const dropdownSelectors = [
        '[role="menu"]',
        '.notification-dropdown',
        '[data-radix-popper-content-wrapper]',
        'div[data-state="open"]'
      ];
      
      let dropdown = null;
      for (const selector of dropdownSelectors) {
        dropdown = await page.$(selector);
        if (dropdown) {
          console.log(`Found dropdown with selector: ${selector}`);
          break;
        }
      }
      
      if (dropdown) {
        const isVisible = await dropdown.isIntersectingViewport();
        console.log('Dropdown found and visible:', isVisible);
        
        // Take screenshot with dropdown open
        await page.screenshot({ 
          path: 'notification_dropdown_open.png',
          fullPage: true 
        });
        
        // Get dropdown position and styles
        const dropdownInfo = await page.evaluate(() => {
          const elements = document.querySelectorAll('[role="menu"], .notification-dropdown, [data-radix-popper-content-wrapper]');
          const results = [];
          
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            results.push({
              selector: el.className || el.getAttribute('role') || 'unknown',
              position: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              },
              styles: {
                position: styles.position,
                zIndex: styles.zIndex,
                display: styles.display,
                visibility: styles.visibility,
                opacity: styles.opacity
              },
              parent: el.parentElement.tagName
            });
          });
          
          return results;
        });
        
        console.log('Dropdown info:', JSON.stringify(dropdownInfo, null, 2));
        
        // Check if Portal is working
        const portalCheck = await page.evaluate(() => {
          const dropdown = document.querySelector('[role="menu"], .notification-dropdown');
          if (dropdown) {
            let parent = dropdown;
            let depth = 0;
            while (parent && depth < 10) {
              if (parent === document.body) {
                return `Portal is working - dropdown is ${depth} levels from body`;
              }
              parent = parent.parentElement;
              depth++;
            }
            return `Portal may not be working - dropdown is nested ${depth} levels deep`;
          }
          return 'No dropdown found';
        });
        
        console.log('Portal check:', portalCheck);
        
      } else {
        console.log('Dropdown not found after clicking');
        
        // Check what elements are visible
        const visibleElements = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          const highZIndex = [];
          
          elements.forEach(el => {
            const styles = window.getComputedStyle(el);
            const zIndex = parseInt(styles.zIndex);
            if (zIndex > 50) {
              highZIndex.push({
                tag: el.tagName,
                class: el.className,
                zIndex: zIndex,
                position: styles.position
              });
            }
          });
          
          return highZIndex.sort((a, b) => b.zIndex - a.zIndex).slice(0, 5);
        });
        
        console.log('High z-index elements:', visibleElements);
        
        // Take screenshot to show current state
        await page.screenshot({ 
          path: 'notification_dropdown_not_found.png',
          fullPage: true 
        });
      }
      
    } else {
      console.log('Notification button not found with any selector');
      
      // Check header structure
      const headerInfo = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (header) {
          const buttons = header.querySelectorAll('button');
          return {
            headerFound: true,
            buttonCount: buttons.length,
            buttons: Array.from(buttons).map(btn => ({
              text: btn.textContent?.trim(),
              hasIcon: btn.querySelector('svg') !== null,
              iconClass: btn.querySelector('svg')?.className?.baseVal || 'no-icon'
            }))
          };
        }
        return { headerFound: false };
      });
      
      console.log('Header info:', JSON.stringify(headerInfo, null, 2));
      
      // Take screenshot to show current state
      await page.screenshot({ 
        path: 'notification_button_not_found.png',
        fullPage: true 
      });
    }
    
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