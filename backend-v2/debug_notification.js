const puppeteer = require('puppeteer');

async function debugNotification() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        devtools: true
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔍 Debugging notification dropdown...');
        
        await page.goto('http://localhost:3000/calendar');
        await page.waitForTimeout(3000);
        
        // Add debug styles to highlight elements
        await page.addStyleTag({
            content: `
                .debug-highlight {
                    outline: 3px solid red !important;
                    background: rgba(255, 0, 0, 0.1) !important;
                }
                .debug-notification {
                    outline: 5px solid lime !important;
                    background: rgba(0, 255, 0, 0.3) !important;
                }
            `
        });
        
        // Find and highlight the notification button
        const notificationButton = await page.$('button:has(svg[class*="BellIcon"], svg[stroke])');
        
        if (!notificationButton) {
            console.log('❌ Notification button not found');
            // List all buttons to debug
            const buttons = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('button')).map(btn => ({
                    text: btn.textContent.trim(),
                    html: btn.innerHTML.substring(0, 100),
                    classes: btn.className
                }));
            });
            console.log('Available buttons:', buttons);
            return;
        }
        
        console.log('✅ Found notification button');
        
        // Highlight the button
        await page.evaluate(btn => btn.classList.add('debug-highlight'), notificationButton);
        
        // Get button info
        const buttonInfo = await page.evaluate(btn => {
            const rect = btn.getBoundingClientRect();
            return {
                position: rect,
                computedStyle: window.getComputedStyle(btn),
                parentInfo: {
                    tagName: btn.parentElement.tagName,
                    classes: btn.parentElement.className,
                    overflow: window.getComputedStyle(btn.parentElement).overflow
                }
            };
        }, notificationButton);
        
        console.log('📍 Button info:', JSON.stringify(buttonInfo, null, 2));
        
        // Click the button
        console.log('🖱️ Clicking notification button...');
        await notificationButton.click();
        await page.waitForTimeout(1000);
        
        // Look for the dropdown
        const dropdownSelectors = [
            '[class*="absolute"][class*="right-0"]',
            'div:has(h3:contains("Notifications"))',
            '[class*="z-[10000]"]',
            '.notification-dropdown',
            '[role="menu"]'
        ];
        
        let dropdown = null;
        for (const selector of dropdownSelectors) {
            try {
                dropdown = await page.$(selector);
                if (dropdown) {
                    console.log(`✅ Found dropdown with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Continue
            }
        }
        
        if (!dropdown) {
            console.log('❌ No dropdown found. Checking if element exists in DOM...');
            
            // Check if element exists but is hidden
            const hiddenDropdown = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('*')).filter(el => 
                    el.textContent.includes('Notifications') && 
                    el.tagName === 'H3'
                );
                
                if (elements.length > 0) {
                    const dropdown = elements[0].closest('div');
                    if (dropdown) {
                        const style = window.getComputedStyle(dropdown);
                        const rect = dropdown.getBoundingClientRect();
                        return {
                            found: true,
                            display: style.display,
                            visibility: style.visibility,
                            opacity: style.opacity,
                            zIndex: style.zIndex,
                            position: style.position,
                            rect: rect,
                            innerHTML: dropdown.innerHTML.substring(0, 200)
                        };
                    }
                }
                return { found: false };
            });
            
            console.log('🔍 Hidden dropdown check:', hiddenDropdown);
        } else {
            // Analyze the dropdown
            await page.evaluate(dropdown => dropdown.classList.add('debug-notification'), dropdown);
            
            const dropdownInfo = await page.evaluate(dropdown => {
                const style = window.getComputedStyle(dropdown);
                const rect = dropdown.getBoundingClientRect();
                return {
                    visible: rect.width > 0 && rect.height > 0,
                    position: rect,
                    computedStyle: {
                        display: style.display,
                        visibility: style.visibility,
                        opacity: style.opacity,
                        zIndex: style.zIndex,
                        position: style.position,
                        overflow: style.overflow
                    },
                    parentOverflow: window.getComputedStyle(dropdown.parentElement).overflow,
                    content: dropdown.textContent.substring(0, 100)
                };
            }, dropdown);
            
            console.log('📋 Dropdown analysis:', JSON.stringify(dropdownInfo, null, 2));
            
            // Check for clipping containers
            const clippingContainers = await page.evaluate(() => {
                const header = document.querySelector('header');
                if (header) {
                    let parent = header.parentElement;
                    const containers = [];
                    
                    while (parent && parent !== document.body) {
                        const style = window.getComputedStyle(parent);
                        if (style.overflow === 'hidden' || style.overflow === 'clip') {
                            containers.push({
                                tagName: parent.tagName,
                                classes: parent.className,
                                overflow: style.overflow,
                                rect: parent.getBoundingClientRect()
                            });
                        }
                        parent = parent.parentElement;
                    }
                    return containers;
                }
                return [];
            });
            
            console.log('🔒 Clipping containers:', clippingContainers);
        }
        
        // Take screenshot for analysis
        await page.screenshot({ path: 'notification_debug.png', fullPage: true });
        console.log('📸 Debug screenshot saved as notification_debug.png');
        
        // Keep browser open for inspection
        console.log('🔍 Browser staying open for inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
    } finally {
        await browser.close();
    }
}

debugNotification();