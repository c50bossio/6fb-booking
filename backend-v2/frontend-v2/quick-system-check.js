/**
 * Quick System Health Check
 * Immediate verification of core system functionality
 */

const puppeteer = require('puppeteer');

const URLS_TO_TEST = [
    'http://localhost:3001',           // Homepage
    'http://localhost:3001/login',     // Login
    'http://localhost:3001/register',  // Register
    'http://localhost:3001/dashboard', // Dashboard
    'http://localhost:3001/calendar',  // Calendar
    'http://localhost:3001/book'       // Booking
];

async function quickHealthCheck() {
    console.log('🏥 Quick System Health Check');
    console.log('============================');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    let results = [];
    let consoleErrors = 0;
    
    // Count console errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors++;
        }
    });
    
    for (const url of URLS_TO_TEST) {
        try {
            const startTime = Date.now();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
            const loadTime = Date.now() - startTime;
            
            // Check if page loaded without major errors
            const title = await page.title();
            const hasContent = await page.evaluate(() => {
                return document.body.innerText.length > 100;
            });
            
            const status = hasContent && !title.includes('Error') ? '✅' : '❌';
            console.log(`${status} ${url.split('/').pop() || 'Home'} - ${loadTime}ms`);
            
            results.push({
                url,
                success: hasContent && !title.includes('Error'),
                loadTime,
                title
            });
            
        } catch (error) {
            console.log(`❌ ${url.split('/').pop() || 'Home'} - FAILED: ${error.message}`);
            results.push({
                url,
                success: false,
                error: error.message
            });
        }
    }
    
    await browser.close();
    
    // Summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    console.log('\n📊 QUICK SUMMARY');
    console.log('================');
    console.log(`✅ Working: ${successCount}/${results.length}`);
    console.log(`❌ Broken: ${failCount}/${results.length}`);
    console.log(`🔥 Console Errors: ${consoleErrors}`);
    console.log(`📈 Success Rate: ${Math.round((successCount / results.length) * 100)}%`);
    
    if (successCount >= 4) {
        console.log('🎉 System Status: MOSTLY FUNCTIONAL');
    } else if (successCount >= 2) {
        console.log('⚠️  System Status: PARTIALLY FUNCTIONAL');
    } else {
        console.log('🚨 System Status: CRITICAL ISSUES');
    }
    
    return results;
}

// API Connectivity Check
async function checkAPIHealth() {
    console.log('\n🔌 API Health Check');
    console.log('===================');
    
    try {
        const response = await fetch('http://localhost:8000/');
        if (response.ok) {
            console.log('✅ Backend API - RESPONSIVE');
        } else {
            console.log('❌ Backend API - ERROR:', response.status);
        }
    } catch (error) {
        console.log('❌ Backend API - UNREACHABLE:', error.message);
    }
}

async function main() {
    await quickHealthCheck();
    await checkAPIHealth();
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Check USER_JOURNEY_TEST_REPORT.md for detailed analysis');
    console.log('2. Focus on fixing calendar and booking components');
    console.log('3. Resolve 403/500 API errors');
    console.log('4. Re-run comprehensive tests after fixes');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { quickHealthCheck, checkAPIHealth };