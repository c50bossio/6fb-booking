const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
    console.log('Navigating to homepage...');
    await page.goto('http://localhost:3000/', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if page is blank
    const bodyContent = await page.evaluate(() => {
      const body = document.body;
      return {
        innerHTML: body.innerHTML.substring(0, 500),
        textContent: body.textContent?.trim().substring(0, 200),
        childElementCount: body.childElementCount,
        backgroundColor: window.getComputedStyle(body).backgroundColor,
        display: window.getComputedStyle(body).display,
        visibility: window.getComputedStyle(body).visibility
      };
    });
    
    console.log('\nBody analysis:', bodyContent);
    
    // Check for Next.js root
    const nextRoot = await page.evaluate(() => {
      const root = document.getElementById('__next');
      if (!root) return null;
      return {
        exists: true,
        innerHTML: root.innerHTML.substring(0, 500),
        childElementCount: root.childElementCount,
        display: window.getComputedStyle(root).display
      };
    });
    
    console.log('\nNext.js root:', nextRoot);
    
    // Check for any visible content
    const visibleElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const visible = [];
      
      for (let el of elements) {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        
        if (rect.width > 0 && rect.height > 0 && 
            styles.display !== 'none' && 
            styles.visibility !== 'hidden' &&
            styles.opacity !== '0') {
          visible.push({
            tagName: el.tagName,
            className: el.className,
            textContent: el.textContent?.substring(0, 50),
            backgroundColor: styles.backgroundColor
          });
        }
      }
      
      return visible.slice(0, 10); // First 10 visible elements
    });
    
    console.log('\nVisible elements:', visibleElements);
    
    // Take a screenshot
    await page.screenshot({ path: 'homepage-debug.png', fullPage: true });
    console.log('\nScreenshot saved as homepage-debug.png');
    
    // Check for any errors in React
    const reactErrors = await page.evaluate(() => {
      const errorBoundary = document.querySelector('.error-boundary');
      return errorBoundary ? errorBoundary.textContent : null;
    });
    
    if (reactErrors) {
      console.log('\nReact errors found:', reactErrors);
    }
    
  } catch (error) {
    console.error('Error during page load:', error);
  } finally {
    await browser.close();
  }
})();