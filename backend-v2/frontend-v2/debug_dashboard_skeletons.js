/**
 * Debug script to investigate dashboard skeleton placeholder issue
 * This script will:
 * 1. Login with test credentials
 * 2. Navigate to dashboard
 * 3. Monitor console errors
 * 4. Check network requests
 * 5. Look for skeleton elements
 */

const puppeteer = require('puppeteer');

async function debugDashboardSkeletons() {
  console.log('🔍 Starting dashboard skeleton debugging...');
  
  // Connect to existing Chrome instance
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222'
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`🖥️  CONSOLE [${type.toUpperCase()}]: ${text}`);
    });

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📨 RESPONSE: ${response.status()} ${response.url()}`);
      }
    });

    // Step 1: Navigate to login page
    console.log('🚪 Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Step 2: Login with test credentials
    console.log('🔑 Attempting login...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'admin@bookedbarber.com');
    await page.type('input[type="password"]', 'admin123');
    
    // Click login button
    await page.click('button[type="submit"]');
    console.log('⏳ Waiting for login to complete...');
    
    // Wait for redirect to dashboard
    await page.waitForFunction(
      () => window.location.pathname === '/dashboard' || window.location.pathname === '/admin',
      { timeout: 10000 }
    );
    
    console.log(`✅ Login successful! Current URL: ${page.url()}`);
    
    // Step 3: Navigate to dashboard if not already there
    if (!page.url().includes('/dashboard')) {
      console.log('🏠 Navigating to dashboard...');
      await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    }
    
    // Step 4: Wait for page to load and check for skeletons
    console.log('⏳ Waiting for dashboard to load...');
    await page.waitForTimeout(3000); // Wait 3 seconds for data to load
    
    // Step 5: Check for skeleton elements
    const skeletonElements = await page.$$eval('.animate-pulse', elements => {
      return elements.map(el => ({
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent.slice(0, 50),
        visible: el.offsetWidth > 0 && el.offsetHeight > 0
      }));
    });
    
    console.log(`🦴 Found ${skeletonElements.length} skeleton elements:`);
    skeletonElements.forEach((el, index) => {
      console.log(`  ${index + 1}. ${el.tagName}.${el.className} - Visible: ${el.visible}`);
    });
    
    // Step 6: Check for actual data elements
    const dataElements = await page.evaluate(() => {
      // Look for elements that should contain data
      const elements = [];
      
      // Check for revenue/appointment numbers
      const numbers = document.querySelectorAll('[class*="text-2xl"], [class*="font-bold"]');
      numbers.forEach(el => {
        if (el.textContent.match(/\$|\d+/)) {
          elements.push({
            type: 'data',
            text: el.textContent,
            className: el.className
          });
        }
      });
      
      // Check for loading states
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="skeleton"]');
      loadingElements.forEach(el => {
        elements.push({
          type: 'loading',
          text: el.textContent,
          className: el.className
        });
      });
      
      return elements;
    });
    
    console.log(`📊 Found ${dataElements.length} data/loading elements:`);
    dataElements.forEach((el, index) => {
      console.log(`  ${index + 1}. [${el.type.toUpperCase()}] "${el.text}" - ${el.className}`);
    });
    
    // Step 7: Check for JavaScript errors
    const jsErrors = await page.evaluate(() => {
      // Return any stored errors from console
      return window.jsErrors || [];
    });
    
    // Step 8: Check API call status
    console.log('\n📡 Checking recent API calls...');
    const networkLog = await page.evaluate(() => {
      return window.networkLog || [];
    });
    
    // Step 9: Take a screenshot for visual inspection
    await page.screenshot({ 
      path: '/Users/bossio/6fb-booking/backend-v2/frontend-v2/dashboard-debug-skeleton.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved as dashboard-debug-skeleton.png');
    
    // Step 10: Wait for any async operations to complete
    console.log('⏳ Waiting for any pending async operations...');
    await page.waitForTimeout(5000);
    
    // Step 11: Final check for persistent skeletons
    const finalSkeletons = await page.$$eval('.animate-pulse', elements => {
      return elements.length;
    });
    
    console.log(`\n🔍 FINAL ANALYSIS:`);
    console.log(`   Persistent skeleton elements: ${finalSkeletons}`);
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Page title: ${await page.title()}`);
    
    if (finalSkeletons > 0) {
      console.log(`❌ ISSUE CONFIRMED: ${finalSkeletons} skeleton elements are still visible after 5+ seconds`);
      
      // Get the specific skeleton elements for debugging
      const persistentSkeletons = await page.evaluate(() => {
        const skeletons = document.querySelectorAll('.animate-pulse');
        return Array.from(skeletons).map(el => ({
          innerHTML: el.innerHTML.slice(0, 100),
          className: el.className,
          parentClassName: el.parentElement?.className || 'no-parent'
        }));
      });
      
      console.log('🦴 Persistent skeleton details:');
      persistentSkeletons.forEach((skeleton, index) => {
        console.log(`   ${index + 1}. Parent: ${skeleton.parentClassName}`);
        console.log(`      Class: ${skeleton.className}`);
        console.log(`      HTML: ${skeleton.innerHTML}...`);
      });
    } else {
      console.log(`✅ NO ISSUE: All skeleton elements have been replaced with data`);
    }
    
    console.log('\n🔍 Debug session complete. Check the screenshot and console output above.');
    console.log('   Keep the browser open to inspect elements manually if needed.');
    
  } catch (error) {
    console.error('❌ Debug session failed:', error);
  }
  
  // Don't close the browser - leave it open for manual inspection
  // await browser.close();
}

// Run the debug session
debugDashboardSkeletons().catch(console.error);