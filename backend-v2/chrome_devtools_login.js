const CDP = require('chrome-remote-interface');

async function testLogin() {
    console.log('🚀 Starting Chrome DevTools login test...\n');
    
    try {
        // Connect to Chrome
        const client = await CDP();
        const {Page, Runtime, Network, Console} = client;
        
        // Enable domains
        await Page.enable();
        await Runtime.enable();
        await Network.enable();
        await Console.enable();
        
        // Listen to console logs
        Console.messageAdded((params) => {
            const {level, text, url, line} = params.message;
            const prefix = {
                'error': '❌ ERROR',
                'warning': '⚠️  WARN',
                'info': '📘 INFO',
                'verbose': '📝 VERBOSE',
                'log': '📝 LOG'
            }[level] || '📝';
            
            console.log(`${prefix}: ${text}`);
            if (url && !url.includes('chrome-extension://')) {
                console.log(`   at ${url}:${line}`);
            }
        });
        
        // Listen to network events
        Network.requestWillBeSent((params) => {
            if (params.request.url.includes('auth/login')) {
                console.log('\n🌐 Login Request:', params.request.method, params.request.url);
                if (params.request.postData) {
                    console.log('   Body:', params.request.postData);
                }
            }
        });
        
        Network.responseReceived((params) => {
            if (params.response.url.includes('auth/login')) {
                console.log('🌐 Login Response:', params.response.status, params.response.url);
            }
        });
        
        Network.loadingFailed((params) => {
            if (params.errorText && !params.canceled) {
                console.log('❌ Network Request Failed:', params.errorText);
                console.log('   URL:', params.documentURL || 'unknown');
            }
        });
        
        // Navigate to login page
        console.log('🧭 Navigating to login page...');
        await Page.navigate({url: 'http://localhost:3000/login'});
        await Page.loadEventFired();
        console.log('✅ Page loaded\n');
        
        // Wait a bit for React to render
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fill in the form
        console.log('📝 Filling login form...');
        
        const fillFormScript = `
            (function() {
                const emailField = document.getElementById('email');
                const passwordField = document.getElementById('password');
                
                if (!emailField || !passwordField) {
                    console.error('❌ Form fields not found');
                    return false;
                }
                
                // Fill email
                emailField.value = 'admin.test@bookedbarber.com';
                emailField.dispatchEvent(new Event('input', {bubbles: true}));
                emailField.dispatchEvent(new Event('change', {bubbles: true}));
                
                // Fill password
                passwordField.value = 'AdminTest123';
                passwordField.dispatchEvent(new Event('input', {bubbles: true}));
                passwordField.dispatchEvent(new Event('change', {bubbles: true}));
                
                console.log('✅ Form filled successfully');
                return true;
            })();
        `;
        
        const fillResult = await Runtime.evaluate({
            expression: fillFormScript,
            returnByValue: true
        });
        
        if (!fillResult.result.value) {
            console.log('❌ Failed to fill form');
            await client.close();
            return;
        }
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Submit the form
        console.log('\n🚀 Submitting login form...\n');
        
        const submitScript = `
            (function() {
                const submitButton = document.querySelector('button[type="submit"]');
                if (submitButton) {
                    console.log('🚀 Clicking submit button...');
                    submitButton.click();
                    return true;
                }
                console.error('❌ Submit button not found');
                return false;
            })();
        `;
        
        await Runtime.evaluate({
            expression: submitScript,
            returnByValue: true
        });
        
        // Wait for response or navigation
        console.log('⏳ Waiting for response...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check current URL
        const urlResult = await Runtime.evaluate({
            expression: 'window.location.href',
            returnByValue: true
        });
        
        console.log(`\n📍 Current URL: ${urlResult.result.value}`);
        
        if (urlResult.result.value.includes('/dashboard')) {
            console.log('✅ Successfully logged in and redirected to dashboard!');
        } else if (urlResult.result.value.includes('/login')) {
            console.log('❌ Still on login page - login failed');
            
            // Check for error messages
            const errorCheck = await Runtime.evaluate({
                expression: `
                    (function() {
                        const errors = [];
                        // Check for error alerts
                        document.querySelectorAll('[role="alert"], .text-red-600, .bg-red-50').forEach(el => {
                            if (el.textContent) errors.push(el.textContent.trim());
                        });
                        // Check for warnings
                        document.querySelectorAll('.bg-yellow-50').forEach(el => {
                            if (el.textContent) errors.push('Warning: ' + el.textContent.trim());
                        });
                        return errors;
                    })();
                `,
                returnByValue: true
            });
            
            if (errorCheck.result.value && errorCheck.result.value.length > 0) {
                console.log('\n📋 Error messages found:');
                errorCheck.result.value.forEach(err => console.log(`   - ${err}`));
            }
        }
        
        // Keep connection open for a moment to catch any final logs
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await client.close();
        console.log('\n✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Check if chrome-remote-interface is available
try {
    require.resolve('chrome-remote-interface');
    testLogin();
} catch (e) {
    // Try using HTTP API directly
    console.log('Using HTTP API to control Chrome...\n');
    
    const http = require('http');
    
    // Simple HTTP-based Chrome control
    const makeRequest = (path, data) => {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 9222,
                path: path,
                method: data ? 'POST' : 'GET',
                headers: data ? {'Content-Type': 'application/json'} : {}
            };
            
            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                });
            });
            
            req.on('error', reject);
            if (data) req.write(JSON.stringify(data));
            req.end();
        });
    };
    
    // Get active tab
    makeRequest('/json/list')
        .then(tabs => {
            if (tabs && tabs[0]) {
                console.log('📱 Found active tab:', tabs[0].title);
                console.log('🔗 URL:', tabs[0].url);
                
                // Navigate to login if needed
                if (!tabs[0].url.includes('/login')) {
                    console.log('\n🧭 Need to navigate to login page');
                    console.log('Please go to: http://localhost:3000/login');
                } else {
                    console.log('\n✅ Already on login page');
                    console.log('Please enter credentials:');
                    console.log('Email: admin.test@bookedbarber.com');
                    console.log('Password: AdminTest123');
                }
            }
        })
        .catch(err => console.error('❌ Failed to connect to Chrome:', err.message));
}