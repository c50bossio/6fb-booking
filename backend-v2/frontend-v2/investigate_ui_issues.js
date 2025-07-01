const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function investigateUIIssues() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Set viewport for consistent testing
  await page.setViewport({ width: 1440, height: 900 });

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'ui-investigation');
  try {
    await fs.mkdir(screenshotsDir, { recursive: true });
  } catch (err) {
    console.log('Screenshots directory already exists or error:', err.message);
  }

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  console.log('Navigating to site...');
  
  try {
    // Try to navigate to any page with the header
    await page.goto('http://localhost:3000/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for any dynamic content
    await new Promise(r => setTimeout(r, 2000));

    // Take initial screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, '01-initial-page.png'),
      fullPage: true
    });

    console.log('\n=== INVESTIGATING NOTIFICATION BUTTON ===\n');

    // Look for the notification button in the header
    const notificationButtonInfo = await page.evaluate(() => {
      // Try to find the bell icon button
      const buttons = Array.from(document.querySelectorAll('button'));
      let bellButton = null;
      
      for (const button of buttons) {
        // Check if button contains a bell icon
        const svgs = button.querySelectorAll('svg');
        for (const svg of svgs) {
          const paths = svg.querySelectorAll('path');
          for (const path of paths) {
            const d = path.getAttribute('d');
            // Check for bell icon path patterns
            if (d && (d.includes('M10 2a6') || d.includes('M18 8A6') || d.includes('bell'))) {
              bellButton = button;
              break;
            }
          }
          if (bellButton) break;
        }
        
        // Also check for BellIcon class
        if (button.innerHTML.includes('BellIcon') || button.querySelector('.lucide-bell')) {
          bellButton = button;
          break;
        }
      }
      
      if (!bellButton) {
        return { found: false, message: 'Bell button not found' };
      }
      
      const rect = bellButton.getBoundingClientRect();
      const styles = window.getComputedStyle(bellButton);
      const parent = bellButton.parentElement;
      const parentStyles = parent ? window.getComputedStyle(parent) : null;
      
      // Check all ancestors for overflow/clipping
      const ancestors = [];
      let current = bellButton;
      while (current && current !== document.body) {
        const ancestorStyles = window.getComputedStyle(current);
        ancestors.push({
          tagName: current.tagName,
          className: current.className,
          id: current.id,
          overflow: ancestorStyles.overflow,
          overflowX: ancestorStyles.overflowX,
          overflowY: ancestorStyles.overflowY,
          position: ancestorStyles.position,
          zIndex: ancestorStyles.zIndex,
          transform: ancestorStyles.transform,
          clipPath: ancestorStyles.clipPath
        });
        current = current.parentElement;
      }
      
      return {
        found: true,
        position: {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        },
        styles: {
          position: styles.position,
          zIndex: styles.zIndex,
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          overflow: styles.overflow
        },
        parentInfo: parent ? {
          tagName: parent.tagName,
          className: parent.className,
          position: parentStyles.position,
          overflow: parentStyles.overflow,
          zIndex: parentStyles.zIndex
        } : null,
        ancestors: ancestors
      };
    });

    console.log('Notification button info:', JSON.stringify(notificationButtonInfo, null, 2));

    if (notificationButtonInfo.found) {
      // Highlight the button
      await page.evaluate((pos) => {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = pos.top + 'px';
        div.style.left = pos.left + 'px';
        div.style.width = pos.width + 'px';
        div.style.height = pos.height + 'px';
        div.style.border = '3px solid red';
        div.style.zIndex = '9999999';
        div.style.pointerEvents = 'none';
        div.id = 'highlight-box';
        document.body.appendChild(div);
      }, notificationButtonInfo.position);

      await page.screenshot({
        path: path.join(screenshotsDir, '02-notification-button-highlighted.png')
      });

      // Click the notification button
      console.log('\nClicking notification button...');
      
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const button of buttons) {
          const svgs = button.querySelectorAll('svg');
          for (const svg of svgs) {
            const paths = svg.querySelectorAll('path');
            for (const path of paths) {
              const d = path.getAttribute('d');
              if (d && (d.includes('M10 2a6') || d.includes('M18 8A6'))) {
                button.click();
                return true;
              }
            }
          }
        }
        return false;
      });

      // Wait for dropdown to potentially appear
      await new Promise(r => setTimeout(r, 1500));

      // Check what happened after click
      const afterClickAnalysis = await page.evaluate(() => {
        // Look for any dropdown/popover elements
        const potentialDropdowns = [
          'div[style*="z-index: 2147483647"]',
          'div[style*="position: fixed"]',
          '[role="menu"]',
          '.dropdown',
          '.popover',
          'div[class*="notification"]'
        ];

        const foundElements = [];
        
        for (const selector of potentialDropdowns) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            
            // Check if element is visible
            if (rect.width > 0 && rect.height > 0 && styles.display !== 'none') {
              // Get computed position
              const computedTop = parseFloat(styles.top) || 0;
              const computedRight = parseFloat(styles.right) || 0;
              const computedLeft = parseFloat(styles.left) || 0;
              
              foundElements.push({
                selector: selector,
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                position: {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                  viewportPosition: {
                    top: rect.top,
                    right: window.innerWidth - rect.right,
                    bottom: window.innerHeight - rect.bottom,
                    left: rect.left
                  }
                },
                styles: {
                  position: styles.position,
                  top: styles.top,
                  right: styles.right,
                  left: styles.left,
                  zIndex: styles.zIndex,
                  display: styles.display,
                  visibility: styles.visibility,
                  opacity: styles.opacity,
                  transform: styles.transform
                },
                computedPosition: {
                  top: computedTop,
                  right: computedRight,
                  left: computedLeft
                },
                content: el.textContent?.substring(0, 100),
                hasNotificationContent: el.textContent?.includes('Notification') || el.textContent?.includes('notification')
              });
            }
          }
        }

        // Check body and html for any overflow issues
        const bodyStyles = window.getComputedStyle(document.body);
        const htmlStyles = window.getComputedStyle(document.documentElement);
        
        return {
          foundElements: foundElements,
          bodyOverflow: {
            overflow: bodyStyles.overflow,
            overflowX: bodyStyles.overflowX,
            overflowY: bodyStyles.overflowY,
            position: bodyStyles.position
          },
          htmlOverflow: {
            overflow: htmlStyles.overflow,
            overflowX: htmlStyles.overflowX,
            overflowY: htmlStyles.overflowY
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        };
      });

      console.log('\nAfter click analysis:', JSON.stringify(afterClickAnalysis, null, 2));

      await page.screenshot({
        path: path.join(screenshotsDir, '03-after-notification-click.png'),
        fullPage: true
      });

      // Check if dropdown is cut off
      const viewportAnalysis = await page.evaluate(() => {
        const element = document.querySelector('div[style*="z-index: 2147483647"]');
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        
        return {
          elementPosition: {
            top: rect.top,
            right: window.innerWidth - rect.right,
            bottom: window.innerHeight - rect.bottom,
            left: rect.left
          },
          isVisible: rect.width > 0 && rect.height > 0,
          isInViewport: rect.top >= 0 && rect.left >= 0 && 
                       rect.bottom <= window.innerHeight && 
                       rect.right <= window.innerWidth,
          cutOffSides: {
            top: rect.top < 0,
            right: rect.right > window.innerWidth,
            bottom: rect.bottom > window.innerHeight,
            left: rect.left < 0
          },
          styles: {
            position: styles.position,
            top: styles.top,
            right: styles.right,
            width: styles.width,
            maxWidth: styles.maxWidth
          }
        };
      });

      console.log('\nViewport analysis:', JSON.stringify(viewportAnalysis, null, 2));
    }

    console.log('\n=== INVESTIGATING SCROLLBAR STYLING ===\n');

    // Check scrollbar styles
    const scrollbarAnalysis = await page.evaluate(() => {
      // Get all stylesheets and look for scrollbar rules
      const scrollbarRules = [];
      
      try {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules || sheet.rules || []) {
              if (rule.selectorText && rule.selectorText.includes('scrollbar')) {
                scrollbarRules.push({
                  selector: rule.selectorText,
                  styles: rule.style.cssText
                });
              }
            }
          } catch (e) {
            // Cross-origin stylesheets
          }
        }
      } catch (e) {
        console.error('Error checking stylesheets:', e);
      }

      // Check computed styles on body and html
      const bodyStyles = window.getComputedStyle(document.body);
      const htmlStyles = window.getComputedStyle(document.documentElement);
      
      // Check for dark mode
      const isDarkMode = document.documentElement.classList.contains('dark') ||
                        document.body.classList.contains('dark');

      // Look for Tailwind scrollbar utilities
      const elementsWithScrollbar = [];
      document.querySelectorAll('[class*="scrollbar"]').forEach(el => {
        elementsWithScrollbar.push({
          tagName: el.tagName,
          className: el.className
        });
      });

      // Create a test element to check scrollbar appearance
      const testDiv = document.createElement('div');
      testDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        width: 200px;
        height: 150px;
        overflow-y: scroll;
        background: var(--background, white);
        border: 2px solid red;
        z-index: 999999;
        padding: 10px;
      `;
      testDiv.innerHTML = Array.from({length: 20}, (_, i) => `<p>Test line ${i + 1}</p>`).join('');
      document.body.appendChild(testDiv);
      
      // Get scrollbar width
      const scrollbarWidth = testDiv.offsetWidth - testDiv.clientWidth;
      
      return {
        isDarkMode,
        scrollbarRules,
        elementsWithScrollbar,
        scrollbarWidth,
        colorScheme: {
          body: bodyStyles.colorScheme,
          html: htmlStyles.colorScheme
        },
        cssVariables: {
          '--scrollbar-thumb': getComputedStyle(document.documentElement).getPropertyValue('--scrollbar-thumb'),
          '--scrollbar-track': getComputedStyle(document.documentElement).getPropertyValue('--scrollbar-track'),
          '--scrollbar-width': getComputedStyle(document.documentElement).getPropertyValue('--scrollbar-width')
        }
      };
    });

    console.log('Scrollbar analysis:', JSON.stringify(scrollbarAnalysis, null, 2));

    await page.screenshot({
      path: path.join(screenshotsDir, '04-with-scrollbar-test.png')
    });

    // Final report
    const report = {
      timestamp: new Date().toISOString(),
      notificationButton: notificationButtonInfo,
      afterClickAnalysis: afterClickAnalysis,
      viewportAnalysis: viewportAnalysis,
      scrollbarAnalysis: scrollbarAnalysis,
      consoleMessages: consoleMessages
    };

    await fs.writeFile(
      path.join(screenshotsDir, 'investigation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n=== SUMMARY ===');
    console.log('1. Notification dropdown issue:');
    if (afterClickAnalysis?.foundElements?.length > 0) {
      console.log('   - Dropdown element found with z-index 2147483647');
      console.log('   - Check screenshots to see if it\'s visible');
      if (viewportAnalysis) {
        console.log('   - Viewport analysis:', viewportAnalysis.isInViewport ? 'In viewport' : 'Outside viewport');
      }
    } else {
      console.log('   - No dropdown element found after click');
    }
    
    console.log('\n2. Scrollbar styling:');
    console.log('   - Dark mode:', scrollbarAnalysis.isDarkMode ? 'Yes' : 'No');
    console.log('   - Scrollbar width:', scrollbarAnalysis.scrollbarWidth, 'px');
    console.log('   - Custom scrollbar rules found:', scrollbarAnalysis.scrollbarRules.length);

    console.log('\nInvestigation complete! Check the ui-investigation folder for screenshots and detailed report.');

  } catch (error) {
    console.error('Error during investigation:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\nBrowser will remain open for manual inspection. Close it when done.');
  }
}

investigateUIIssues();