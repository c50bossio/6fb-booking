const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function testFixes() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Testing notification dropdown and scrollbar fixes...\n');

  try {
    // Navigate to login page
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    console.log('Please log in manually in the browser window.');
    console.log('Once logged in and you see the dashboard, press Enter to continue...');
    
    // Wait for user to manually log in
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    // Navigate to a page with the header
    console.log('\nNavigating to calendar page...');
    await page.goto('http://localhost:3000/calendar', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Test 1: Notification Dropdown
    console.log('\n=== TESTING NOTIFICATION DROPDOWN ===');
    
    const notificationTest = await page.evaluate(() => {
      // Find the notification button
      const buttons = Array.from(document.querySelectorAll('button'));
      let bellButton = null;
      
      for (const button of buttons) {
        if (button.querySelector('svg path[d*="M10 2a6"]') || 
            button.querySelector('svg path[d*="M18 8A6"]') ||
            button.innerHTML.includes('BellIcon')) {
          bellButton = button;
          break;
        }
      }
      
      if (!bellButton) {
        return { success: false, error: 'Notification button not found' };
      }
      
      // Click the button
      bellButton.click();
      
      // Wait a moment for dropdown to appear
      return new Promise(resolve => {
        setTimeout(() => {
          // Check for the dropdown
          const dropdown = document.querySelector('div[style*="z-index: 2147483647"]');
          
          if (!dropdown) {
            resolve({ success: false, error: 'Dropdown not found after click' });
            return;
          }
          
          const rect = dropdown.getBoundingClientRect();
          const styles = window.getComputedStyle(dropdown);
          
          // Check visibility
          const isVisible = rect.width > 0 && 
                           rect.height > 0 && 
                           styles.display !== 'none' && 
                           styles.visibility !== 'hidden';
          
          // Check position
          const isInViewport = rect.top >= 0 && 
                              rect.left >= 0 && 
                              rect.bottom <= window.innerHeight && 
                              rect.right <= window.innerWidth;
          
          resolve({
            success: isVisible && isInViewport,
            details: {
              visible: isVisible,
              inViewport: isInViewport,
              position: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              },
              styles: {
                position: styles.position,
                zIndex: styles.zIndex,
                display: styles.display
              }
            }
          });
        }, 500);
      });
    });

    console.log('Notification dropdown test result:', JSON.stringify(notificationTest, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'notification-dropdown-test.png', fullPage: false });

    // Test 2: Scrollbar Styling
    console.log('\n=== TESTING SCROLLBAR STYLING ===');
    
    const scrollbarTest = await page.evaluate(() => {
      // Create a test element with scrollbar
      const testDiv = document.createElement('div');
      testDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        height: 300px;
        overflow-y: scroll;
        background: white;
        border: 2px solid #ccc;
        padding: 20px;
        z-index: 99999;
      `;
      testDiv.className = 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600';
      testDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Scrollbar Style Test</h3>
        ${Array.from({length: 50}, (_, i) => `<p class="text-gray-700 dark:text-gray-300 mb-2">Test line ${i + 1}</p>`).join('')}
      `;
      document.body.appendChild(testDiv);
      
      // Check computed styles
      const computedStyles = window.getComputedStyle(testDiv);
      const isDarkMode = document.documentElement.classList.contains('dark');
      
      // Try to get scrollbar styles (webkit specific)
      const scrollbarStyles = {
        isDarkMode,
        scrollbarWidth: testDiv.offsetWidth - testDiv.clientWidth,
        hasCustomStyles: false
      };
      
      // Check if custom scrollbar styles are applied
      try {
        const styleSheets = Array.from(document.styleSheets);
        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules || []);
            for (const rule of rules) {
              if (rule.selectorText && rule.selectorText.includes('scrollbar')) {
                scrollbarStyles.hasCustomStyles = true;
                break;
              }
            }
          } catch (e) {
            // Cross-origin or other access issues
          }
        }
      } catch (e) {
        // Error checking stylesheets
      }
      
      return scrollbarStyles;
    });

    console.log('Scrollbar test result:', JSON.stringify(scrollbarTest, null, 2));
    
    // Take screenshot with scrollbar test
    await page.screenshot({ path: 'scrollbar-style-test.png', fullPage: false });

    // Clean up test element
    await page.evaluate(() => {
      const testDiv = document.querySelector('div[style*="overflow-y: scroll"]');
      if (testDiv && testDiv.style.position === 'fixed') {
        testDiv.remove();
      }
    });

    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`1. Notification Dropdown: ${notificationTest.success ? '✅ WORKING' : '❌ NOT WORKING'}`);
    if (notificationTest.success) {
      console.log('   - Dropdown is visible and positioned correctly');
    } else {
      console.log(`   - Issue: ${notificationTest.error || 'Dropdown not visible or out of viewport'}`);
    }
    
    console.log(`\n2. Scrollbar Styling: ${scrollbarTest.hasCustomStyles ? '✅ CUSTOM STYLES APPLIED' : '⚠️  DEFAULT STYLES'}`);
    console.log(`   - Dark mode: ${scrollbarTest.isDarkMode ? 'Yes' : 'No'}`);
    console.log(`   - Scrollbar width: ${scrollbarTest.scrollbarWidth}px`);

    console.log('\nScreenshots saved:');
    console.log('- notification-dropdown-test.png');
    console.log('- scrollbar-style-test.png');

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    console.log('\nPress Enter to close the browser...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    await browser.close();
  }
}

testFixes();