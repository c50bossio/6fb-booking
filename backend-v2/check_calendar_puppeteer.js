const puppeteer = require('puppeteer');

async function checkCalendarPage() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Collect console messages
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
        });
    });
    
    // Collect page errors
    const pageErrors = [];
    page.on('pageerror', error => {
        pageErrors.push({
            message: error.message,
            stack: error.stack
        });
    });
    
    // Collect failed requests
    const failedRequests = [];
    page.on('requestfailed', request => {
        failedRequests.push({
            url: request.url(),
            failure: request.failure()
        });
    });
    
    try {
        console.log('Navigating to calendar page...');
        await page.goto('http://localhost:3000/calendar', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait for React to render
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check page state
        const pageState = await page.evaluate(() => {
            const result = {
                title: document.title,
                url: window.location.href,
                calendarFound: false,
                devHealthMonitorFound: false,
                devHealthMonitorContent: null,
                errorElements: [],
                bodyClasses: document.body.className,
                mainContent: null
            };
            
            // Check for calendar
            const calendarSelectors = [
                '[data-testid="unified-calendar"]',
                '.calendar-container',
                '#calendar',
                '.fc-view-container',
                '.fc-header-toolbar'
            ];
            
            for (const selector of calendarSelectors) {
                if (document.querySelector(selector)) {
                    result.calendarFound = true;
                    break;
                }
            }
            
            // Check for Dev Health Monitor
            const devHealthSelectors = [
                '[data-testid="dev-health-monitor"]',
                '.dev-health-monitor',
                '#dev-health-monitor'
            ];
            
            for (const selector of devHealthSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    result.devHealthMonitorFound = true;
                    result.devHealthMonitorContent = element.textContent.trim();
                    break;
                }
            }
            
            // Check for errors
            const errorSelectors = [
                '.error',
                '.error-message',
                '[role="alert"]',
                '.text-red-500',
                '.text-destructive'
            ];
            
            errorSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.textContent.trim()) {
                        result.errorElements.push(el.textContent.trim());
                    }
                });
            });
            
            // Get main content
            const main = document.querySelector('main');
            if (main) {
                result.mainContent = main.textContent.substring(0, 200);
            }
            
            return result;
        });
        
        console.log('\n=== Calendar Page Analysis ===');
        console.log('URL:', pageState.url);
        console.log('Title:', pageState.title);
        console.log('Calendar Found:', pageState.calendarFound);
        console.log('Dev Health Monitor Found:', pageState.devHealthMonitorFound);
        
        if (pageState.devHealthMonitorContent) {
            console.log('\nDev Health Monitor Content:');
            console.log(pageState.devHealthMonitorContent);
        }
        
        if (pageState.errorElements.length > 0) {
            console.log('\nError Elements Found:');
            pageState.errorElements.forEach(err => console.log('  -', err));
        }
        
        if (consoleLogs.length > 0) {
            console.log('\n=== Console Logs ===');
            consoleLogs.forEach(log => {
                console.log(`[${log.type}] ${log.text}`);
                if (log.location && log.location.url) {
                    console.log(`  at ${log.location.url}:${log.location.lineNumber}`);
                }
            });
        } else {
            console.log('\nNo console logs detected.');
        }
        
        if (pageErrors.length > 0) {
            console.log('\n=== Page Errors ===');
            pageErrors.forEach(error => {
                console.log('Error:', error.message);
                if (error.stack) {
                    console.log('Stack:', error.stack);
                }
            });
        }
        
        if (failedRequests.length > 0) {
            console.log('\n=== Failed Requests ===');
            failedRequests.forEach(req => {
                console.log('URL:', req.url);
                console.log('Failure:', req.failure);
            });
        }
        
        if (!pageState.calendarFound) {
            console.log('\n⚠️  Calendar component not found on page!');
            console.log('Main content preview:', pageState.mainContent);
        }
        
        // Take a screenshot
        await page.screenshot({ path: 'calendar-page-state.png' });
        console.log('\nScreenshot saved as calendar-page-state.png');
        
    } catch (error) {
        console.error('Error checking calendar page:', error);
    } finally {
        await browser.close();
    }
}

checkCalendarPage();