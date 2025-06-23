#!/usr/bin/env node

/**
 * Quick Responsive Design Test
 * Manual testing helper that opens the app in different viewport sizes
 */

const puppeteer = require('puppeteer');

const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  mobileLarge: { width: 414, height: 896, name: 'iPhone 11 Pro' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  desktop: { width: 1440, height: 900, name: 'Desktop' }
};

const PAGES_TO_TEST = [
  '/',
  '/dashboard',
  '/book',
  '/barbers',
  '/clients'
];

async function quickResponsiveTest() {
  console.log('🔧 Starting Quick Responsive Test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const [viewportKey, viewport] of Object.entries(VIEWPORTS)) {
      console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      const page = await browser.newPage();
      await page.setViewport(viewport);

      for (const pagePath of PAGES_TO_TEST) {
        try {
          console.log(`  📄 Loading ${pagePath}...`);
          await page.goto(`http://localhost:3000${pagePath}`, {
            waitUntil: 'networkidle2',
            timeout: 10000
          });

          // Quick checks
          const issues = [];

          // Check for horizontal scroll
          const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
          });

          if (hasHorizontalScroll) {
            issues.push('❌ Horizontal scroll detected');
          }

          // Check sidebar behavior
          const sidebarElement = await page.$('.sidebar-dark, .sidebar-light');
          if (sidebarElement) {
            const sidebarWidth = await page.evaluate(el => el.offsetWidth, sidebarElement);

            if (viewport.width < 768 && sidebarWidth > 80) {
              issues.push('❌ Sidebar should be collapsed on mobile');
            }
          }

          // Check button sizes (sample)
          const buttons = await page.$$('button');
          if (buttons.length > 0) {
            const buttonHeight = await page.evaluate(el => el.offsetHeight, buttons[0]);
            if (viewport.width < 768 && buttonHeight < 44) {
              issues.push('❌ Buttons may be too small for touch');
            }
          }

          // Report results
          if (issues.length === 0) {
            console.log(`    ✅ ${pagePath} looks good`);
          } else {
            console.log(`    ⚠️  ${pagePath} has issues:`);
            issues.forEach(issue => console.log(`      ${issue}`));
          }

        } catch (error) {
          console.log(`    ❌ Failed to test ${pagePath}: ${error.message}`);
        }
      }

      await page.close();
      console.log('');
    }

    console.log('✅ Quick responsive test completed!');
    console.log('\n📋 Manual Testing Recommendations:');
    console.log('1. Test the sidebar toggle functionality');
    console.log('2. Verify form inputs are properly sized');
    console.log('3. Check calendar component responsiveness');
    console.log('4. Test modal dialogs on mobile');
    console.log('5. Verify touch interactions work smoothly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if the frontend is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Run the test
async function main() {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log('❌ Frontend server is not running on http://localhost:3000');
    console.log('💡 Start the server with: npm run dev');
    process.exit(1);
  }

  await quickResponsiveTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { quickResponsiveTest };
