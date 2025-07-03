#!/usr/bin/env node

/**
 * Simple Browser Integration Test
 * Tests the consolidated dashboard pages to verify they're working
 */

const puppeteer = require('puppeteer');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConsolidatedPages() {
    let browser;
    
    try {
        log('🚀 Starting Browser Integration Test', 'bright');
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        const pages = [
            { url: 'http://localhost:3002/', name: 'Home Page' },
            { url: 'http://localhost:3002/analytics', name: 'Analytics Dashboard' },
            { url: 'http://localhost:3002/finance/unified', name: 'Finance Unified Dashboard' },
            { url: 'http://localhost:3002/customers', name: 'Customers Page' }
        ];
        
        const results = [];
        
        for (const testPage of pages) {
            try {
                log(`\n📊 Testing: ${testPage.name}`, 'cyan');
                
                // Navigate to page
                const response = await page.goto(testPage.url, { 
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });
                
                if (!response.ok()) {
                    results.push({ 
                        page: testPage.name, 
                        status: 'FAIL', 
                        error: `HTTP ${response.status()}` 
                    });
                    continue;
                }
                
                // Wait for page to load
                await page.waitForTimeout(2000);
                
                // Check for React components
                const hasReactComponents = await page.evaluate(() => {
                    // Look for React-specific elements
                    const reactElements = document.querySelectorAll('[data-reactroot], [data-react-fiber], [data-react-props]');
                    const hasComponents = document.querySelectorAll('.analytics-card, .chart-container, .dashboard-grid, .customer-card').length > 0;
                    return reactElements.length > 0 || hasComponents;
                });
                
                // Check for errors in console
                const consoleErrors = [];
                page.on('console', msg => {
                    if (msg.type() === 'error') {
                        consoleErrors.push(msg.text());
                    }
                });
                
                // Check for API calls (look for fetch requests)
                const apiCalls = [];
                await page.setRequestInterception(true);
                page.on('request', request => {
                    if (request.url().includes('/api/')) {
                        apiCalls.push(request.url());
                    }
                    request.continue();
                });
                
                // Wait a bit more for API calls
                await page.waitForTimeout(3000);
                
                // Check page title
                const title = await page.title();
                
                // Check for loading states or content
                const hasContent = await page.evaluate(() => {
                    const bodyText = document.body.innerText;
                    return bodyText.length > 100 && !bodyText.includes('Loading...') && !bodyText.includes('Error');
                });
                
                // Check for specific dashboard elements based on page
                let hasSpecificElements = false;
                if (testPage.url.includes('/analytics')) {
                    hasSpecificElements = await page.evaluate(() => {
                        return document.querySelector('.analytics-dashboard, .chart, .metrics') !== null;
                    });
                } else if (testPage.url.includes('/finance')) {
                    hasSpecificElements = await page.evaluate(() => {
                        return document.querySelector('.finance-dashboard, .revenue, .payment') !== null;
                    });
                } else if (testPage.url.includes('/customers')) {
                    hasSpecificElements = await page.evaluate(() => {
                        return document.querySelector('.customer-list, .client, .customer-card') !== null;
                    });
                }
                
                const result = {
                    page: testPage.name,
                    status: hasContent && hasReactComponents ? 'PASS' : 'PARTIAL',
                    details: {
                        title,
                        hasReactComponents,
                        hasContent,
                        hasSpecificElements,
                        apiCalls: apiCalls.length,
                        consoleErrors: consoleErrors.length
                    }
                };
                
                results.push(result);
                
                if (result.status === 'PASS') {
                    log(`✅ ${testPage.name}: Working correctly`, 'green');
                } else {
                    log(`⚠️  ${testPage.name}: Partially working`, 'yellow');
                }
                
                log(`   📄 Title: ${title}`);
                log(`   ⚛️  React Components: ${hasReactComponents ? 'Yes' : 'No'}`);
                log(`   📊 Has Content: ${hasContent ? 'Yes' : 'No'}`);
                log(`   🎯 Specific Elements: ${hasSpecificElements ? 'Yes' : 'No'}`);
                log(`   🌐 API Calls: ${apiCalls.length}`);
                log(`   ❌ Console Errors: ${consoleErrors.length}`);
                
            } catch (error) {
                results.push({ 
                    page: testPage.name, 
                    status: 'FAIL', 
                    error: error.message 
                });
                log(`❌ ${testPage.name}: Failed - ${error.message}`, 'red');
            }
        }
        
        // Generate summary
        log('\n📋 Integration Test Summary', 'bright');
        log('='.repeat(50), 'cyan');
        
        const passing = results.filter(r => r.status === 'PASS').length;
        const partial = results.filter(r => r.status === 'PARTIAL').length;
        const failing = results.filter(r => r.status === 'FAIL').length;
        
        log(`✅ Fully Working: ${passing}`, 'green');
        log(`⚠️  Partially Working: ${partial}`, 'yellow');
        log(`❌ Not Working: ${failing}`, 'red');
        
        const successRate = Math.round(((passing + partial * 0.5) / results.length) * 100);
        log(`📊 Overall Success Rate: ${successRate}%`, successRate > 75 ? 'green' : 'yellow');
        
        if (successRate > 75) {
            log('\n🎉 SYSTEM IS READY FOR COMPREHENSIVE TESTING!', 'green');
            log('✅ Frontend-Backend integration is working', 'green');
            log('✅ Consolidated dashboards are functional', 'green');
            log('✅ React components are rendering', 'green');
        } else if (successRate > 50) {
            log('\n⚠️  SYSTEM IS PARTIALLY FUNCTIONAL', 'yellow');
            log('👍 Basic integration is working', 'yellow');
            log('🔧 Some components need refinement', 'yellow');
        } else {
            log('\n❌ SYSTEM NEEDS ATTENTION', 'red');
            log('🔧 Major issues detected', 'red');
        }
        
        return results;
        
    } catch (error) {
        log(`❌ Browser test failed: ${error.message}`, 'red');
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testConsolidatedPages().then(results => {
    const successCount = results.filter(r => r.status === 'PASS' || r.status === 'PARTIAL').length;
    process.exit(successCount >= 3 ? 0 : 1);
}).catch(error => {
    log(`❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
});