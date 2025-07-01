const puppeteer = require('puppeteer');

// Mobile viewport configurations
const MOBILE_VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 12': { width: 390, height: 844 },
  'Samsung Galaxy S20': { width: 412, height: 915 },
  'iPad': { width: 768, height: 1024 },
  'Desktop': { width: 1366, height: 768 }
};

// Pages to test
const PAGES_TO_TEST = [
  { name: 'Login', path: '/login' },
  { name: 'Dashboard', path: '/dashboard', requiresAuth: true },
  { name: 'Book Appointment', path: '/book', requiresAuth: true },
  { name: 'Settings', path: '/settings', requiresAuth: true }
];

async function testMobileResponsiveness() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = [];
  
  // Test each viewport
  for (const [deviceName, viewport] of Object.entries(MOBILE_VIEWPORTS)) {
    console.log(`\n📱 Testing ${deviceName} (${viewport.width}x${viewport.height})...`);
    
    const page = await browser.newPage();
    await page.setViewport(viewport);
    
    // Login first if needed
    await page.goto('http://localhost:3000/login');
    await page.type('input[name="email"]', 'testuser@example.com');
    await page.type('input[name="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Test each page
    for (const pageToTest of PAGES_TO_TEST) {
      try {
        console.log(`  - Testing ${pageToTest.name}...`);
        
        await page.goto(`http://localhost:3000${pageToTest.path}`, {
          waitUntil: 'networkidle0'
        });
        
        // Check for horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        
        // Check for overlapping elements
        const hasOverlap = await page.evaluate(() => {
          const elements = document.querySelectorAll('button, a, input, select, textarea');
          const rects = Array.from(elements).map(el => {
            const rect = el.getBoundingClientRect();
            return {
              element: el.tagName,
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom
            };
          });
          
          // Simple overlap detection
          for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
              const r1 = rects[i];
              const r2 = rects[j];
              
              if (!(r1.right < r2.left || r2.right < r1.left || 
                    r1.bottom < r2.top || r2.bottom < r1.top)) {
                return true;
              }
            }
          }
          return false;
        });
        
        // Check text readability (font size)
        const textSizes = await page.evaluate(() => {
          const texts = document.querySelectorAll('p, span, div, label, button');
          const sizes = Array.from(texts).map(el => {
            const style = window.getComputedStyle(el);
            return parseInt(style.fontSize);
          }).filter(size => size > 0);
          
          return {
            min: Math.min(...sizes),
            avg: sizes.reduce((a, b) => a + b, 0) / sizes.length
          };
        });
        
        // Check touch target sizes
        const touchTargets = await page.evaluate(() => {
          const interactive = document.querySelectorAll('button, a, input, select, textarea');
          const small = Array.from(interactive).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44; // Apple's recommended minimum
          });
          
          return {
            total: interactive.length,
            tooSmall: small.length
          };
        });
        
        // Take screenshot
        const screenshotPath = `./screenshots/${deviceName.replace(' ', '_')}_${pageToTest.name.replace(' ', '_')}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        results.push({
          device: deviceName,
          page: pageToTest.name,
          viewport: viewport,
          issues: {
            horizontalScroll: hasHorizontalScroll,
            overlappingElements: hasOverlap,
            minFontSize: textSizes.min,
            avgFontSize: textSizes.avg,
            smallTouchTargets: touchTargets.tooSmall,
            totalTouchTargets: touchTargets.total
          },
          screenshot: screenshotPath
        });
        
        // Log issues
        if (hasHorizontalScroll) {
          console.log(`    ⚠️ Horizontal scroll detected`);
        }
        if (hasOverlap) {
          console.log(`    ⚠️ Overlapping elements detected`);
        }
        if (textSizes.min < 12) {
          console.log(`    ⚠️ Small text detected (${textSizes.min}px)`);
        }
        if (touchTargets.tooSmall > 0) {
          console.log(`    ⚠️ ${touchTargets.tooSmall} touch targets too small`);
        }
        
        if (!hasHorizontalScroll && !hasOverlap && textSizes.min >= 12 && touchTargets.tooSmall === 0) {
          console.log(`    ✅ All checks passed`);
        }
        
      } catch (error) {
        console.log(`    ❌ Error testing ${pageToTest.name}: ${error.message}`);
        results.push({
          device: deviceName,
          page: pageToTest.name,
          viewport: viewport,
          error: error.message
        });
      }
    }
    
    await page.close();
  }
  
  await browser.close();
  
  // Generate report
  console.log('\n📊 MOBILE RESPONSIVENESS REPORT');
  console.log('================================\n');
  
  const totalTests = results.length;
  const passedTests = results.filter(r => !r.error && !r.issues?.horizontalScroll && 
                                           !r.issues?.overlappingElements && 
                                           r.issues?.minFontSize >= 12 && 
                                           r.issues?.smallTouchTargets === 0).length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
  
  // Issues summary
  const horizontalScrollIssues = results.filter(r => r.issues?.horizontalScroll).length;
  const overlapIssues = results.filter(r => r.issues?.overlappingElements).length;
  const fontSizeIssues = results.filter(r => r.issues?.minFontSize < 12).length;
  const touchTargetIssues = results.filter(r => r.issues?.smallTouchTargets > 0).length;
  
  console.log('Issues Summary:');
  if (horizontalScrollIssues > 0) {
    console.log(`  - Horizontal Scroll: ${horizontalScrollIssues} pages`);
  }
  if (overlapIssues > 0) {
    console.log(`  - Overlapping Elements: ${overlapIssues} pages`);
  }
  if (fontSizeIssues > 0) {
    console.log(`  - Small Font Size: ${fontSizeIssues} pages`);
  }
  if (touchTargetIssues > 0) {
    console.log(`  - Small Touch Targets: ${touchTargetIssues} pages`);
  }
  
  // Save detailed results
  const fs = require('fs');
  fs.writeFileSync('mobile_responsiveness_report.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Detailed report saved to: mobile_responsiveness_report.json');
  console.log('📸 Screenshots saved to: ./screenshots/');
}

// Create screenshots directory
const fs = require('fs');
if (!fs.existsSync('./screenshots')) {
  fs.mkdirSync('./screenshots');
}

// Run tests
testMobileResponsiveness().catch(console.error);