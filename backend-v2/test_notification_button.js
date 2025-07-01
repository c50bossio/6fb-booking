const puppeteer = require('puppeteer');

async function testNotificationButton() {
    console.log('🔍 Testing notification button behavior...');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: { width: 1200, height: 800 },
        devtools: true
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
        });
        
        // Navigate to the app
        console.log('📍 Navigating to http://localhost:3000...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        // Wait for page to load
        await page.waitForTimeout(2000);
        
        // Take initial screenshot
        await page.screenshot({ path: 'notification_test_initial.png', fullPage: true });
        console.log('📸 Initial screenshot saved');
        
        // Look for notification button - try multiple selectors
        const notificationSelectors = [
            '[data-testid="notification-button"]',
            'button[aria-label*="notification"]',
            'button[aria-label*="Notification"]',
            'svg[data-icon="bell"]',
            '.notification-button',
            'button:has(svg)',
            '[role="button"]:has(svg)',
            // Look for bell icon patterns
            'button svg[class*="bell"]',
            'button:has(svg[stroke="currentColor"])',
            // Header area buttons
            'header button',
            '.header button'
        ];
        
        let notificationButton = null;
        let usedSelector = '';
        
        for (const selector of notificationSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    // Check if this looks like a notification button
                    const html = await page.evaluate(el => el.outerHTML, element);
                    if (html.toLowerCase().includes('bell') || 
                        html.toLowerCase().includes('notification') ||
                        html.includes('BellIcon')) {
                        notificationButton = element;
                        usedSelector = selector;
                        console.log(`✅ Found notification button with selector: ${selector}`);
                        break;
                    }
                }
            } catch (e) {
                // Continue trying other selectors
            }
        }
        
        if (!notificationButton) {
            // Let's examine the header structure
            console.log('🔍 Examining header structure...');
            const headerContent = await page.evaluate(() => {
                const header = document.querySelector('header') || document.querySelector('.header');
                return header ? header.innerHTML : 'No header found';
            });
            console.log('Header content:', headerContent.substring(0, 500));
            
            // Look for any buttons in the top right
            const topRightButtons = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.map(btn => ({
                    text: btn.textContent.trim(),
                    classes: btn.className,
                    innerHTML: btn.innerHTML,
                    position: btn.getBoundingClientRect()
                })).filter(btn => btn.position.right > window.innerWidth * 0.7);
            });
            console.log('Top right buttons:', topRightButtons);
        }
        
        if (notificationButton) {
            // Get button position and properties
            const buttonInfo = await page.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return {
                    position: rect,
                    visible: rect.width > 0 && rect.height > 0,
                    innerHTML: el.innerHTML,
                    className: el.className,
                    disabled: el.disabled
                };
            }, notificationButton);
            
            console.log('📍 Notification button info:', buttonInfo);
            
            // Click the notification button
            console.log('🖱️ Clicking notification button...');
            await notificationButton.click();
            
            // Wait for any animations or state changes
            await page.waitForTimeout(1000);
            
            // Take screenshot after click
            await page.screenshot({ path: 'notification_test_after_click.png', fullPage: true });
            console.log('📸 After-click screenshot saved');
            
            // Check for notification dropdown/panel
            const dropdownSelectors = [
                '[data-testid="notification-dropdown"]',
                '[data-testid="notification-panel"]',
                '.notification-dropdown',
                '.notification-panel',
                '[role="dialog"]',
                '[role="menu"]',
                '.dropdown-menu',
                '.popover',
                '.tooltip'
            ];
            
            let foundDropdown = false;
            for (const selector of dropdownSelectors) {
                const dropdown = await page.$(selector);
                if (dropdown) {
                    const isVisible = await page.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        const rect = el.getBoundingClientRect();
                        return style.display !== 'none' && 
                               style.visibility !== 'hidden' && 
                               style.opacity !== '0' &&
                               rect.width > 0 && rect.height > 0;
                    }, dropdown);
                    
                    if (isVisible) {
                        console.log(`✅ Found visible dropdown with selector: ${selector}`);
                        foundDropdown = true;
                        
                        const dropdownInfo = await page.evaluate(el => {
                            const rect = el.getBoundingClientRect();
                            return {
                                position: rect,
                                content: el.textContent.trim(),
                                innerHTML: el.innerHTML.substring(0, 200)
                            };
                        }, dropdown);
                        console.log('📋 Dropdown info:', dropdownInfo);
                        break;
                    }
                }
            }
            
            if (!foundDropdown) {
                console.log('❌ No notification dropdown found after click');
                
                // Check for any elements that might have appeared
                const newElements = await page.evaluate(() => {
                    const allElements = Array.from(document.querySelectorAll('*'));
                    return allElements.filter(el => {
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        return rect.width > 50 && rect.height > 50 && 
                               style.position === 'absolute' || style.position === 'fixed';
                    }).map(el => ({
                        tagName: el.tagName,
                        className: el.className,
                        position: el.getBoundingClientRect(),
                        content: el.textContent.trim().substring(0, 100)
                    }));
                });
                console.log('🔍 Positioned elements that might be dropdowns:', newElements);
            }
            
            // Check console for errors
            const errors = await page.evaluate(() => {
                return window.console.error ? 'Check browser console for errors' : 'No console errors detected';
            });
            
        } else {
            console.log('❌ Could not find notification button');
            
            // Take a screenshot to see what's there
            await page.screenshot({ path: 'notification_test_no_button.png', fullPage: true });
            
            // List all buttons for debugging
            const allButtons = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('button')).map(btn => ({
                    text: btn.textContent.trim(),
                    classes: btn.className,
                    innerHTML: btn.innerHTML.substring(0, 100),
                    position: btn.getBoundingClientRect()
                }));
            });
            console.log('🔍 All buttons found:', allButtons);
        }
        
    } catch (error) {
        console.error('❌ Error during testing:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
testNotificationButton().catch(console.error);