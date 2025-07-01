const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function investigateIssues() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Set viewport for consistent testing
  await page.setViewport({ width: 1440, height: 900 });

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'notification-investigation');
  try {
    await fs.mkdir(screenshotsDir, { recursive: true });
  } catch (err) {
    console.log('Screenshots directory already exists or error:', err.message);
  }

  console.log('Navigating to calendar page...');
  
  try {
    // Navigate to the calendar page
    await page.goto('http://localhost:3000/calendar', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for any dynamic content
    await new Promise(r => setTimeout(r, 2000));

    // Take initial screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, '01-initial-calendar-page.png'),
      fullPage: true
    });

    // First, let's check if we need to login
    const loginRequired = await page.evaluate(() => {
      return window.location.pathname.includes('login') || 
             document.querySelector('input[type="email"]') !== null;
    });

    if (loginRequired) {
      console.log('Login required. Please ensure you are logged in first.');
      await browser.close();
      return;
    }

    console.log('\n=== INVESTIGATING NOTIFICATION BUTTON ===\n');

    // Look for the notification button
    const notificationButton = await page.evaluate(() => {
      // Try multiple selectors
      const selectors = [
        'button[aria-label*="notification"]',
        'button[aria-label*="Notification"]',
        'button svg[class*="bell"]',
        'button .lucide-bell',
        '[class*="notification-button"]',
        'button:has(svg path[d*="M18 8A6"])', // Bell icon path
        'header button:has(svg)',
        '.relative button'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          if (text.includes('bell') || ariaLabel.includes('notif') || 
              el.querySelector('svg')?.innerHTML.includes('bell') ||
              el.innerHTML.includes('bell')) {
            
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            
            return {
              found: true,
              selector: selector,
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
              html: el.outerHTML.substring(0, 200),
              parentInfo: {
                tagName: el.parentElement?.tagName,
                className: el.parentElement?.className,
                position: el.parentElement ? window.getComputedStyle(el.parentElement).position : null,
                overflow: el.parentElement ? window.getComputedStyle(el.parentElement).overflow : null
              }
            };
          }
        }
      }
      
      return { found: false, checkedSelectors: selectors };
    });

    console.log('Notification button search result:', JSON.stringify(notificationButton, null, 2));

    if (notificationButton.found) {
      console.log('\nNotification button found! Attempting to click...');
      
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
      }, notificationButton.position);

      await page.screenshot({
        path: path.join(screenshotsDir, '02-notification-button-highlighted.png')
      });

      // Try to click the button
      try {
        await page.click(`button:has(svg path[d*="M18 8"])`, { delay: 100 });
        console.log('Clicked notification button!');
        
        // Wait for potential dropdown
        await new Promise(r => setTimeout(r, 1000));

        // Check for dropdown
        const dropdownInfo = await page.evaluate(() => {
          // Look for dropdown elements
          const possibleDropdowns = [
            '[role="menu"]',
            '[class*="dropdown"]',
            '[class*="popover"]',
            '[class*="notification-dropdown"]',
            '[class*="notification-menu"]',
            '[data-radix-popper-content-wrapper]',
            '[data-state="open"]',
            '.absolute[class*="bg-"]',
            'div[style*="z-index: 2147483647"]'
          ];

          const results = [];
          
          for (const selector of possibleDropdowns) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              
              if (rect.width > 0 && rect.height > 0) {
                results.push({
                  selector: selector,
                  visible: true,
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
                    opacity: styles.opacity,
                    overflow: styles.overflow,
                    transform: styles.transform
                  },
                  parentOverflow: el.parentElement ? window.getComputedStyle(el.parentElement).overflow : null,
                  content: el.textContent?.substring(0, 100)
                });
              }
            }
          }

          // Also check all elements with high z-index
          const allElements = document.querySelectorAll('*');
          const highZIndexElements = [];
          
          for (const el of allElements) {
            const zIndex = window.getComputedStyle(el).zIndex;
            if (zIndex && parseInt(zIndex) > 1000) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                highZIndexElements.push({
                  tagName: el.tagName,
                  className: el.className,
                  zIndex: zIndex,
                  visible: rect.width > 0 && rect.height > 0,
                  position: {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                  }
                });
              }
            }
          }

          return {
            dropdowns: results,
            highZIndexElements: highZIndexElements,
            checkedSelectors: possibleDropdowns
          };
        });

        console.log('\nDropdown search results:', JSON.stringify(dropdownInfo, null, 2));

        await page.screenshot({
          path: path.join(screenshotsDir, '03-after-click.png'),
          fullPage: true
        });

        // Check for any clipping or overflow issues
        const clippingAnalysis = await page.evaluate(() => {
          const checkElement = (el) => {
            const ancestors = [];
            let current = el;
            
            while (current && current !== document.body) {
              const styles = window.getComputedStyle(current);
              const rect = current.getBoundingClientRect();
              
              ancestors.push({
                tagName: current.tagName,
                className: current.className || '',
                id: current.id || '',
                styles: {
                  overflow: styles.overflow,
                  overflowX: styles.overflowX,
                  overflowY: styles.overflowY,
                  position: styles.position,
                  zIndex: styles.zIndex,
                  clip: styles.clip,
                  clipPath: styles.clipPath,
                  transform: styles.transform,
                  opacity: styles.opacity,
                  display: styles.display,
                  visibility: styles.visibility
                },
                rect: {
                  width: rect.width,
                  height: rect.height
                }
              });
              
              current = current.parentElement;
            }
            
            return ancestors;
          };

          // Find the notification button again
          const button = document.querySelector('button:has(svg path[d*="M18 8"])');
          if (button) {
            return {
              buttonAncestors: checkElement(button),
              bodyStyles: {
                overflow: document.body.style.overflow || window.getComputedStyle(document.body).overflow,
                position: window.getComputedStyle(document.body).position
              },
              htmlStyles: {
                overflow: document.documentElement.style.overflow || window.getComputedStyle(document.documentElement).overflow
              }
            };
          }
          
          return null;
        });

        console.log('\nClipping analysis:', JSON.stringify(clippingAnalysis, null, 2));

      } catch (error) {
        console.error('Error clicking notification button:', error);
      }
    } else {
      console.log('Notification button not found!');
    }

    console.log('\n=== INVESTIGATING SCROLLBAR STYLING ===\n');

    // Check scrollbar styles
    const scrollbarInfo = await page.evaluate(() => {
      const getScrollbarStyles = () => {
        const styles = [];
        
        // Check for CSS custom properties
        const computedStyles = window.getComputedStyle(document.documentElement);
        const customProps = [
          '--scrollbar-width',
          '--scrollbar-thumb',
          '--scrollbar-track'
        ];
        
        const customPropValues = {};
        for (const prop of customProps) {
          const value = computedStyles.getPropertyValue(prop);
          if (value) {
            customPropValues[prop] = value;
          }
        }

        // Check for webkit scrollbar styles
        const styleSheets = Array.from(document.styleSheets);
        const scrollbarRules = [];
        
        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules || sheet.rules || []);
            for (const rule of rules) {
              if (rule.selectorText && rule.selectorText.includes('scrollbar')) {
                scrollbarRules.push({
                  selector: rule.selectorText,
                  styles: rule.style.cssText
                });
              }
            }
          } catch (e) {
            // Cross-origin stylesheets will throw
          }
        }

        // Check body and html overflow
        const bodyStyles = window.getComputedStyle(document.body);
        const htmlStyles = window.getComputedStyle(document.documentElement);

        // Check for Tailwind scrollbar classes
        const scrollbarClasses = [];
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const classes = el.className;
          if (typeof classes === 'string' && classes.includes('scrollbar')) {
            scrollbarClasses.push({
              element: el.tagName,
              classes: classes
            });
          }
        }

        // Check current theme
        const isDarkMode = document.documentElement.classList.contains('dark') || 
                          document.documentElement.getAttribute('data-theme') === 'dark';

        return {
          isDarkMode,
          customProperties: customPropValues,
          scrollbarRules,
          scrollbarClasses,
          overflow: {
            body: bodyStyles.overflow,
            html: htmlStyles.overflow
          },
          colorScheme: computedStyles.colorScheme
        };
      };

      return getScrollbarStyles();
    });

    console.log('Scrollbar styling info:', JSON.stringify(scrollbarInfo, null, 2));

    // Test scrollbar visibility by creating a scrollable element
    await page.evaluate(() => {
      const testDiv = document.createElement('div');
      testDiv.id = 'scrollbar-test';
      testDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 300px;
        height: 200px;
        overflow-y: scroll;
        background: var(--background, white);
        border: 2px solid red;
        z-index: 999999;
        padding: 10px;
      `;
      
      testDiv.innerHTML = `
        <h3>Scrollbar Test</h3>
        <p>Line 1</p>
        <p>Line 2</p>
        <p>Line 3</p>
        <p>Line 4</p>
        <p>Line 5</p>
        <p>Line 6</p>
        <p>Line 7</p>
        <p>Line 8</p>
        <p>Line 9</p>
        <p>Line 10</p>
        <p>Line 11</p>
        <p>Line 12</p>
        <p>Line 13</p>
        <p>Line 14</p>
        <p>Line 15</p>
      `;
      
      document.body.appendChild(testDiv);
    });

    await page.screenshot({
      path: path.join(screenshotsDir, '04-scrollbar-test.png')
    });

    // Check console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Final analysis summary
    const summary = await page.evaluate(() => {
      // Check if notification dropdown exists but is hidden
      const dropdowns = document.querySelectorAll('[role="menu"], [class*="dropdown"], [data-radix-popper-content-wrapper]');
      const hiddenDropdowns = [];
      
      for (const dd of dropdowns) {
        const rect = dd.getBoundingClientRect();
        const styles = window.getComputedStyle(dd);
        
        if (rect.width === 0 || rect.height === 0 || 
            styles.display === 'none' || 
            styles.visibility === 'hidden' ||
            parseFloat(styles.opacity) === 0) {
          hiddenDropdowns.push({
            selector: dd.className || dd.id || dd.tagName,
            reason: rect.width === 0 ? 'zero width' : 
                   rect.height === 0 ? 'zero height' :
                   styles.display === 'none' ? 'display none' :
                   styles.visibility === 'hidden' ? 'visibility hidden' :
                   'opacity 0',
            styles: {
              display: styles.display,
              visibility: styles.visibility,
              opacity: styles.opacity,
              position: styles.position,
              zIndex: styles.zIndex
            }
          });
        }
      }
      
      return {
        hiddenDropdowns,
        totalDropdownsFound: dropdowns.length
      };
    });

    console.log('\n=== FINAL SUMMARY ===');
    console.log('Hidden dropdowns found:', JSON.stringify(summary, null, 2));
    console.log('Console errors:', consoleErrors);

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      notificationButton: notificationButton,
      dropdownInfo: dropdownInfo,
      clippingAnalysis: clippingAnalysis,
      scrollbarInfo: scrollbarInfo,
      summary: summary,
      consoleErrors: consoleErrors
    };

    await fs.writeFile(
      path.join(screenshotsDir, 'investigation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\nInvestigation complete! Check the notification-investigation folder for screenshots and report.');

  } catch (error) {
    console.error('Error during investigation:', error);
  } finally {
    await browser.close();
  }
}

investigateIssues();