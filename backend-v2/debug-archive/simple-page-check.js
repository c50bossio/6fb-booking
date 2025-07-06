const puppeteer = require('puppeteer');

async function checkRegistrationPage() {
  console.log('🚀 Checking registration page...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Monitor console messages
    page.on('console', msg => {
      console.log(`Console [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('Page Error:', error.message);
    });
    
    console.log('📍 Navigating to http://localhost:3000/register...');
    
    try {
      await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2', timeout: 15000 });
      console.log('✅ Successfully loaded port 3000');
    } catch (e) {
      console.log('❌ Port 3000 failed, trying port 3001...');
      await page.goto('http://localhost:3001/register', { waitUntil: 'networkidle2', timeout: 15000 });
      console.log('✅ Successfully loaded port 3001');
    }
    
    // Get basic page info
    const title = await page.title();
    const url = page.url();
    console.log(`📄 Title: "${title}"`);
    console.log(`🔗 URL: ${url}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: '/Users/bossio/6fb-booking/backend-v2/registration-page.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved as registration-page.png');
    
    // Check for form elements
    const formFound = await page.$('form') !== null;
    const nameInputFound = await page.$('input[name="name"], input[id="name"]') !== null;
    const emailInputFound = await page.$('input[name="email"], input[id="email"]') !== null;
    const submitButtonFound = await page.$('button[type="submit"]') !== null;
    
    console.log(`📋 Form found: ${formFound}`);
    console.log(`👤 Name input found: ${nameInputFound}`);
    console.log(`📧 Email input found: ${emailInputFound}`);
    console.log(`🚀 Submit button found: ${submitButtonFound}`);
    
    // Get page content sample
    const bodyText = await page.evaluate(() => {
      return document.body ? document.body.innerText.substring(0, 300) : 'No content';
    });
    console.log('📝 Page content preview:');
    console.log(bodyText);
    
    // Check for specific error indicators
    const hasErrors = await page.evaluate(() => {
      const errorKeywords = ['error', 'failed', '404', '500', 'not found'];
      const text = document.body.innerText.toLowerCase();
      return errorKeywords.some(keyword => text.includes(keyword));
    });
    
    if (hasErrors) {
      console.log('⚠️  Page appears to contain error messages');
    } else {
      console.log('✅ No obvious error messages detected');
    }
    
  } catch (error) {
    console.error('💥 Error during page check:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

checkRegistrationPage().catch(console.error);