/**
 * Simple Customer Journey Testing for BookedBarber V2
 * Manual verification approach with automated page checks
 */

const puppeteer = require('puppeteer');

async function testCustomerJourney() {
    console.log('🚀 Starting Simple Customer Journey Test...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        console.log('1. Testing Homepage...');
        await page.goto('http://localhost:3000');
        const title = await page.title();
        console.log(`   ✅ Title: ${title}`);
        
        console.log('2. Testing Login Page...');
        await page.goto('http://localhost:3000/login');
        const loginTitle = await page.title();
        console.log(`   ✅ Login page loaded: ${loginTitle}`);
        
        console.log('3. Testing Book Page...');
        await page.goto('http://localhost:3000/book');
        const bookTitle = await page.title();
        console.log(`   ✅ Book page loaded: ${bookTitle}`);
        
        console.log('4. Testing Dashboard...');
        await page.goto('http://localhost:3000/dashboard');
        const dashTitle = await page.title();
        console.log(`   ✅ Dashboard loaded: ${dashTitle}`);
        
        console.log('✅ All basic page tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testCustomerJourney();