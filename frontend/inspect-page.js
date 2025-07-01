const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    
    // Get all elements that contain BookBarber text
    const elements = await page.evaluate(() => {
      const results = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        if (node.nodeValue && node.nodeValue.includes('BookBarber')) {
          const parent = node.parentElement;
          if (parent) {
            const styles = window.getComputedStyle(parent);
            const rect = parent.getBoundingClientRect();
            results.push({
              text: node.nodeValue.trim(),
              tagName: parent.tagName,
              className: parent.className,
              id: parent.id,
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              position: styles.position,
              top: rect.top,
              height: rect.height,
              isVisible: rect.width > 0 && rect.height > 0
            });
          }
        }
      }
      return results;
    });
    
    console.log('Found elements with BookBarber text:', elements);
    
    // Also check for any fixed position elements at the top
    const topElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const topFixed = [];
      
      for (let el of elements) {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        if ((styles.position === 'fixed' || styles.position === 'sticky') && 
            rect.top >= 0 && rect.top < 100 && 
            rect.height > 0 && rect.height < 100) {
          topFixed.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            text: el.textContent?.substring(0, 100),
            backgroundColor: styles.backgroundColor,
            top: rect.top,
            height: rect.height
          });
        }
      }
      
      return topFixed;
    });
    
    console.log('\nFixed/sticky elements at top:', topElements);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();