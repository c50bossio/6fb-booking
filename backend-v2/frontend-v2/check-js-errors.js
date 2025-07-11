#!/usr/bin/env node

const puppeteer = require('puppeteer');

const criticalPages = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Calendar', path: '/calendar' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Financial Analytics', path: '/finance/analytics' },
    { name: 'Marketing Analytics', path: '/marketing/analytics' },
    { name: 'Payment Overview', path: '/payments' },
    { name: 'Settings Profile', path: '/settings/profile' },
    { name: 'Admin Overview', path: '/admin' }
];

async function checkJavaScriptErrors() {
    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: 'http://localhost:9222',
            defaultViewport: null
        });
        
        const page = await browser.newPage();
        const results = [];
        
        // Enable console logging
        await page.evaluateOnNewDocument(() => {
            window.addEventListener('error', (event) => {
                console.error('Global error:', event.error);
            });
        });
        
        // Monitor console messages
        page.on('console', msg => {
            if (msg.type() === 'error') {
                results.push({
                    type: 'console_error',
                    page: 'current',
                    message: msg.text(),
                    location: msg.location()
                });
            }
        });
        
        // Monitor page errors
        page.on('pageerror', error => {
            results.push({
                type: 'page_error',
                page: 'current',
                message: error.message,
                stack: error.stack
            });
        });
        
        // Monitor failed requests
        page.on('requestfailed', request => {
            results.push({
                type: 'request_failed',
                page: 'current',
                url: request.url(),
                failure: request.failure()
            });
        });
        
        // Monitor response errors
        page.on('response', response => {
            if (response.status() >= 400) {
                results.push({
                    type: 'response_error',
                    page: 'current',
                    url: response.url(),
                    status: response.status(),
                    statusText: response.statusText()
                });
            }
        });
        
        console.log('🔍 Checking JavaScript errors on critical pages...\n');
        
        // Check each critical page
        for (const pageInfo of criticalPages) {
            console.log(`Checking ${pageInfo.name} (${pageInfo.path})...`);
            
            // Clear previous results for this page
            const currentResults = results.length;
            
            try {
                await page.goto(`http://localhost:3000${pageInfo.path}`, { 
                    waitUntil: 'networkidle2',
                    timeout: 15000 
                });
                
                // Wait for any delayed JavaScript execution
                await page.waitForTimeout(3000);
                
                // Check for specific error patterns in the page
                const pageContent = await page.content();
                
                // Look for error messages
                if (pageContent.includes('ChunkLoadError') || 
                    pageContent.includes('Loading chunk') || 
                    pageContent.includes('Failed to fetch dynamically imported module')) {
                    results.push({
                        type: 'chunk_load_error',
                        page: pageInfo.name,
                        path: pageInfo.path,
                        message: 'JavaScript chunk loading error detected'
                    });
                }
                
                // Look for unhandled promise rejections
                const unhandledRejections = await page.evaluate(() => {
                    return window.unhandledRejections || [];
                });
                
                if (unhandledRejections.length > 0) {
                    results.push({
                        type: 'unhandled_promise_rejection',
                        page: pageInfo.name,
                        path: pageInfo.path,
                        rejections: unhandledRejections
                    });
                }
                
                // Check for React errors
                const reactErrors = await page.evaluate(() => {
                    return window.__REACT_DEVTOOLS_GLOBAL_HOOK__ && 
                           window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot ? 
                           'React DevTools detected' : 'No React errors detected';
                });
                
                // Update page reference in results
                for (let i = currentResults; i < results.length; i++) {
                    results[i].page = pageInfo.name;
                    results[i].path = pageInfo.path;
                }
                
                console.log(`  ✅ ${pageInfo.name} loaded successfully`);
                
            } catch (error) {
                results.push({
                    type: 'navigation_error',
                    page: pageInfo.name,
                    path: pageInfo.path,
                    error: error.message
                });
                console.log(`  ❌ ${pageInfo.name} failed to load: ${error.message}`);
            }
        }
        
        console.log('\n🔍 Running additional checks...');
        
        // Check for common issues
        await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
        
        // Check for missing dependencies
        const missingDeps = await page.evaluate(() => {
            const errors = [];
            if (typeof React === 'undefined') errors.push('React not loaded');
            if (typeof ReactDOM === 'undefined') errors.push('ReactDOM not loaded');
            return errors;
        });
        
        if (missingDeps.length > 0) {
            results.push({
                type: 'missing_dependencies',
                page: 'Dashboard',
                missing: missingDeps
            });
        }
        
        // Generate report
        console.log('\n\n=== JAVASCRIPT ERROR REPORT ===\n');
        
        if (results.length === 0) {
            console.log('✅ No JavaScript errors found on critical pages!');
        } else {
            console.log(`Found ${results.length} JavaScript-related issues:\n`);
            
            // Group by type
            const errorsByType = {};
            results.forEach(result => {
                if (!errorsByType[result.type]) {
                    errorsByType[result.type] = [];
                }
                errorsByType[result.type].push(result);
            });
            
            Object.entries(errorsByType).forEach(([type, errors]) => {
                console.log(`\n${type.toUpperCase().replace(/_/g, ' ')}:`);
                errors.forEach(error => {
                    console.log(`  📍 ${error.page} (${error.path || 'unknown path'})`);
                    console.log(`     ${error.message || error.failure || 'No message'}`);
                    if (error.url) console.log(`     URL: ${error.url}`);
                    if (error.status) console.log(`     Status: ${error.status}`);
                    if (error.stack) console.log(`     Stack: ${error.stack.substring(0, 100)}...`);
                });
            });
        }
        
        // Save detailed results
        require('fs').writeFileSync(
            'js-error-results.json',
            JSON.stringify(results, null, 2)
        );
        
        console.log('\n\nDetailed results saved to js-error-results.json');
        
    } catch (error) {
        console.error('Failed to connect to Chrome DevTools:', error.message);
        console.log('Make sure Chrome is running with: google-chrome --remote-debugging-port=9222');
    } finally {
        if (browser) {
            await browser.disconnect();
        }
    }
}

checkJavaScriptErrors().catch(console.error);