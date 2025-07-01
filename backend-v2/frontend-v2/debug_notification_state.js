const puppeteer = require('puppeteer');

(async () => {
  console.log('Debugging notification button state...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging from the browser
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });
  
  try {
    await page.goto('http://localhost:3000/calendar', { waitUntil: 'domcontentloaded' });
    
    // Wait for React to fully load
    await page.waitForFunction(() => {
      return document.readyState === 'complete';
    }, { timeout: 10000 });
    
    // Give additional time for React hydration
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Page loaded, checking React state...');
    
    // Check current page state
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.textContent.substring(0, 500),
        hasHeader: !!document.querySelector('header'),
        buttonCount: document.querySelectorAll('button').length,
        hasLoadingText: document.body.textContent.includes('Loading...'),
        reactMounted: !!window.React || !!document.querySelector('[data-reactroot]') || document.querySelector('#__next') !== null
      };
    });
    
    console.log('Page state:', pageState);
    
    if (pageState.hasLoadingText) {
      console.log('⚠️ Page is still showing loading state');
      console.log('Waiting longer for React to hydrate...');
      
      // Wait up to 30 seconds for loading to complete
      try {
        await page.waitForFunction(() => {
          return !document.body.textContent.includes('Loading...');
        }, { timeout: 30000 });
        console.log('Loading completed!');
      } catch (err) {
        console.log('Page still loading after 30 seconds, continuing anyway...');
      }
    }
    
    // Re-check page state after loading
    const finalState = await page.evaluate(() => {
      return {
        hasHeader: !!document.querySelector('header'),
        buttonCount: document.querySelectorAll('button').length,
        hasNotificationButton: (() => {
          const buttons = document.querySelectorAll('button');
          for (let button of buttons) {
            const badge = button.querySelector('span.bg-error-500, span.absolute.top-1.right-1');
            if (badge) return true;
          }
          return false;
        })(),
        hasAuthenticatedContent: document.body.textContent.includes('Dashboard') || 
                                document.body.textContent.includes('Calendar') ||
                                document.body.textContent.includes('Appointments'),
        allButtonInfo: Array.from(document.querySelectorAll('button')).map((btn, i) => ({
          index: i,
          innerHTML: btn.innerHTML.substring(0, 100),
          classes: btn.className,
          hasSpan: !!btn.querySelector('span')
        }))
      };
    });
    
    console.log('Final page state:', finalState);
    
    if (finalState.hasNotificationButton) {
      console.log('✅ Notification button found! Testing click...');
      
      const clickResult = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (let i = 0; i < buttons.length; i++) {
          const button = buttons[i];
          const badge = button.querySelector('span.bg-error-500, span.absolute.top-1.right-1');
          if (badge) {
            console.log('Clicking notification button at index', i);
            button.click();
            
            // Check immediately for dropdown
            setTimeout(() => {
              const dropdown = document.querySelector('[style*="999999"]') || 
                              document.querySelector('.absolute.right-0');
              
              if (dropdown && dropdown.textContent.includes('Notifications')) {
                console.log('✅ SUCCESS: Dropdown appeared!');
                console.log('Dropdown content:', dropdown.textContent.substring(0, 300));
              } else {
                console.log('❌ FAILED: Dropdown did not appear');
                console.log('Looking for any new elements...');
                
                const allAbsolute = document.querySelectorAll('.absolute');
                console.log('Found', allAbsolute.length, 'absolute positioned elements');
                
                for (let el of allAbsolute) {
                  if (el.textContent.includes('Notification')) {
                    console.log('Found notification-related element:', el.textContent.substring(0, 100));
                  }
                }
              }
            }, 500);
            
            return { success: true, buttonIndex: i };
          }
        }
        return { success: false, reason: 'No notification button found' };
      });
      
      console.log('Click result:', clickResult);
      
      // Wait to see the dropdown result
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } else {
      console.log('❌ No notification button found');
      console.log('Available buttons:', finalState.allButtonInfo);
    }
    
    console.log('Test completed. Keeping browser open for 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.log('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();