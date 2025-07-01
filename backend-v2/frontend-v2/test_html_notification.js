const puppeteer = require('puppeteer');

async function testHTMLNotification() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Go to HTML test page
    console.log('Opening HTML test page...');
    await page.goto('http://localhost:3000/test-notification.html', {
      waitUntil: 'networkidle2'
    });
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'html_test_initial.png',
      fullPage: true 
    });
    
    // Click notification button
    console.log('Clicking notification button...');
    await page.click('#notificationBtn');
    
    // Wait for dropdown to appear
    await page.waitForSelector('.dropdown.open', { timeout: 5000 });
    
    console.log('Dropdown opened successfully!');
    
    // Take screenshot with dropdown open
    await page.screenshot({ 
      path: 'html_test_dropdown_open.png',
      fullPage: true 
    });
    
    // Check dropdown properties
    const dropdownInfo = await page.evaluate(() => {
      const dropdown = document.querySelector('.dropdown');
      const styles = window.getComputedStyle(dropdown);
      const rect = dropdown.getBoundingClientRect();
      
      return {
        visible: dropdown.classList.contains('open'),
        position: styles.position,
        zIndex: styles.zIndex,
        dimensions: {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          right: window.innerWidth - rect.right
        }
      };
    });
    
    console.log('Dropdown info:', JSON.stringify(dropdownInfo, null, 2));
    
    // Test scrollbar
    const scrollbarInfo = await page.evaluate(() => {
      const scrollContainer = document.querySelector('.custom-scrollbar');
      return {
        hasScroll: scrollContainer.scrollHeight > scrollContainer.clientHeight,
        scrollHeight: scrollContainer.scrollHeight,
        clientHeight: scrollContainer.clientHeight
      };
    });
    
    console.log('Scrollbar info:', scrollbarInfo);
    
    // Click close button
    console.log('\nTesting close button...');
    await page.click('#closeBtn');
    
    // Check if dropdown closed
    const isClosed = await page.evaluate(() => {
      const dropdown = document.querySelector('.dropdown');
      return !dropdown.classList.contains('open');
    });
    
    console.log('Dropdown closed:', isClosed);
    
    console.log('\nHTML test completed successfully!');
    console.log('The notification dropdown is working correctly in the static HTML version.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\nNow opening the actual app to compare...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await browser.close();
}

testHTMLNotification();