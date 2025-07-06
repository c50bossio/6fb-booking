const CDP = require('chrome-remote-interface');

async function checkCalendarConsole() {
    let client;
    try {
        // Connect to Chrome
        client = await CDP();
        const { Runtime, Console, Page } = client;

        // Enable domains
        await Runtime.enable();
        await Console.enable();
        await Page.enable();

        // Navigate to calendar page
        await Page.navigate({ url: 'http://localhost:3000/calendar' });
        
        // Wait for page to load
        await Page.loadEventFired();
        
        // Wait a bit more for React to render
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get console messages
        const logs = [];
        Console.messageAdded((params) => {
            logs.push({
                level: params.message.level,
                text: params.message.text,
                source: params.message.source,
                url: params.message.url,
                line: params.message.line
            });
        });

        // Evaluate page state
        const pageState = await Runtime.evaluate({
            expression: `
                (() => {
                    const result = {
                        title: document.title,
                        url: window.location.href,
                        hasErrors: false,
                        errors: [],
                        calendarVisible: false,
                        devHealthMonitor: null
                    };
                    
                    // Check for calendar element
                    const calendarElement = document.querySelector('[data-testid="unified-calendar"]') || 
                                          document.querySelector('.calendar-container') ||
                                          document.querySelector('#calendar');
                    result.calendarVisible = !!calendarElement;
                    
                    // Check for Dev Health Monitor
                    const devHealthElement = document.querySelector('[data-testid="dev-health-monitor"]') ||
                                           document.querySelector('.dev-health-monitor');
                    if (devHealthElement) {
                        result.devHealthMonitor = devHealthElement.textContent || 'Found but empty';
                    }
                    
                    // Check for error elements
                    const errorElements = document.querySelectorAll('.error, .error-message, [role="alert"]');
                    errorElements.forEach(el => {
                        result.errors.push(el.textContent);
                    });
                    
                    result.hasErrors = result.errors.length > 0;
                    
                    return result;
                })()
            `
        });

        console.log('\n=== Calendar Page Status ===');
        console.log('URL:', pageState.result.value.url);
        console.log('Title:', pageState.result.value.title);
        console.log('Calendar Visible:', pageState.result.value.calendarVisible);
        console.log('Has Errors:', pageState.result.value.hasErrors);
        
        if (pageState.result.value.errors.length > 0) {
            console.log('\nErrors found on page:');
            pageState.result.value.errors.forEach(err => console.log('  -', err));
        }
        
        if (pageState.result.value.devHealthMonitor) {
            console.log('\nDev Health Monitor:', pageState.result.value.devHealthMonitor);
        }
        
        // Wait a bit to collect console messages
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (logs.length > 0) {
            console.log('\n=== Console Messages ===');
            logs.forEach(log => {
                console.log(`[${log.level}] ${log.text}`);
                if (log.url && log.line) {
                    console.log(`  at ${log.url}:${log.line}`);
                }
            });
        } else {
            console.log('\nNo console messages detected.');
        }

    } catch (error) {
        console.error('Error checking calendar:', error);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

checkCalendarConsole();