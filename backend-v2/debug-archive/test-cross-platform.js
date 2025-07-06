/**
 * Cross-Platform Testing Suite for BookedBarber V2 Premium Calendar
 * Tests responsive design, browser compatibility, and device-specific features
 */

const puppeteer = require('puppeteer');

const DEVICE_CONFIGURATIONS = [
  {
    name: 'iPhone 12',
    viewport: { width: 390, height: 844, isMobile: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'iPad Pro',
    viewport: { width: 1024, height: 1366, isMobile: false },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'Desktop 1080p',
    viewport: { width: 1920, height: 1080, isMobile: false },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  {
    name: 'Desktop 4K',
    viewport: { width: 3840, height: 2160, isMobile: false },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
];

const BROWSER_CONFIGURATIONS = [
  { name: 'Chrome', executablePath: null }, // Default Chrome
  // Add other browsers if available
];

class CrossPlatformTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = [];
  }

  async runFullTestSuite() {
    console.log('🚀 Starting Cross-Platform Testing Suite...\n');
    
    for (const device of DEVICE_CONFIGURATIONS) {
      for (const browser of BROWSER_CONFIGURATIONS) {
        await this.testDeviceBrowserCombination(device, browser);
      }
    }
    
    this.generateReport();
  }

  async testDeviceBrowserCombination(device, browser) {
    console.log(`📱 Testing: ${device.name} on ${browser.name}`);
    
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    if (browser.executablePath) {
      launchOptions.executablePath = browser.executablePath;
    }

    const browserInstance = await puppeteer.launch(launchOptions);
    
    try {
      const page = await browserInstance.newPage();
      await page.setViewport(device.viewport);
      await page.setUserAgent(device.userAgent);
      
      const testResult = await this.runDeviceTests(page, device, browser);
      this.results.push(testResult);
      
    } catch (error) {
      console.error(`❌ Error testing ${device.name} on ${browser.name}:`, error.message);
      this.results.push({
        device: device.name,
        browser: browser.name,
        success: false,
        error: error.message,
        tests: []
      });
    } finally {
      await browserInstance.close();
    }
  }

  async runDeviceTests(page, device, browser) {
    const tests = [];
    
    try {
      // Test 1: Page Load and Basic Functionality
      console.log('  ⏳ Testing page load...');
      const loadStart = Date.now();
      await page.goto(`${this.baseUrl}/calendar`, { waitUntil: 'networkidle0', timeout: 30000 });
      const loadTime = Date.now() - loadStart;
      
      tests.push({
        name: 'Page Load',
        success: loadTime < 5000,
        duration: loadTime,
        details: `Load time: ${loadTime}ms`
      });

      // Test 2: Responsive Design Validation
      console.log('  📐 Testing responsive design...');
      const responsiveTest = await this.testResponsiveDesign(page, device);
      tests.push(responsiveTest);

      // Test 3: Calendar View Switching
      console.log('  📅 Testing calendar view switching...');
      const viewSwitchTest = await this.testCalendarViews(page, device);
      tests.push(viewSwitchTest);

      // Test 4: Touch/Mouse Interactions
      console.log('  👆 Testing interactions...');
      const interactionTest = await this.testInteractions(page, device);
      tests.push(interactionTest);

      // Test 5: Premium Features Visibility
      console.log('  ✨ Testing premium features...');
      const premiumTest = await this.testPremiumFeatures(page, device);
      tests.push(premiumTest);

      // Test 6: Performance Metrics
      console.log('  📊 Testing performance...');
      const performanceTest = await this.testPerformance(page, device);
      tests.push(performanceTest);

      return {
        device: device.name,
        browser: browser.name,
        viewport: device.viewport,
        success: tests.every(test => test.success),
        tests: tests
      };

    } catch (error) {
      return {
        device: device.name,
        browser: browser.name,
        success: false,
        error: error.message,
        tests: tests
      };
    }
  }

  async testResponsiveDesign(page, device) {
    try {
      // Check if calendar grid adapts to screen size
      const calendarGrid = await page.$('.calendar-grid, [data-testid="calendar-grid"]');
      if (!calendarGrid) {
        return { name: 'Responsive Design', success: false, details: 'Calendar grid not found' };
      }

      const gridStyles = await page.evaluate(() => {
        const grid = document.querySelector('.calendar-grid, [data-testid="calendar-grid"]');
        const computed = window.getComputedStyle(grid);
        return {
          display: computed.display,
          gridTemplateColumns: computed.gridTemplateColumns,
          width: computed.width
        };
      });

      // Check mobile adaptations
      if (device.viewport.isMobile) {
        const hasProperMobileLayout = await page.evaluate(() => {
          // Check for mobile-specific classes or layouts
          return document.querySelector('.mobile-layout, .sm\\:block, .md\\:hidden') !== null;
        });
        
        return {
          name: 'Responsive Design',
          success: hasProperMobileLayout,
          details: `Mobile layout detected: ${hasProperMobileLayout}`
        };
      } else {
        return {
          name: 'Responsive Design',
          success: gridStyles.display !== 'none',
          details: `Grid display: ${gridStyles.display}`
        };
      }
    } catch (error) {
      return { name: 'Responsive Design', success: false, details: error.message };
    }
  }

  async testCalendarViews(page, device) {
    try {
      // Test view switching buttons
      const viewButtons = await page.$$('[data-testid*="view-"], .view-toggle, .calendar-view-button');
      
      if (viewButtons.length === 0) {
        return { name: 'Calendar Views', success: false, details: 'No view buttons found' };
      }

      let successfulSwitches = 0;
      
      for (let i = 0; i < Math.min(viewButtons.length, 3); i++) {
        try {
          await viewButtons[i].click();
          await page.waitForTimeout(1000); // Wait for view to load
          
          // Check if calendar content changed
          const calendarContent = await page.$('.calendar-content, [data-testid="calendar-content"]');
          if (calendarContent) {
            successfulSwitches++;
          }
        } catch (e) {
          // View switch failed, continue
        }
      }

      return {
        name: 'Calendar Views',
        success: successfulSwitches > 0,
        details: `${successfulSwitches}/${viewButtons.length} view switches successful`
      };
    } catch (error) {
      return { name: 'Calendar Views', success: false, details: error.message };
    }
  }

  async testInteractions(page, device) {
    try {
      // Test click/tap interactions
      const appointments = await page.$$('.appointment, [data-testid*="appointment"]');
      
      if (appointments.length === 0) {
        return { name: 'Interactions', success: true, details: 'No appointments to test (expected in empty calendar)' };
      }

      // Test first appointment click
      await appointments[0].click();
      await page.waitForTimeout(500);

      // Check if interaction was successful (modal, selection, etc.)
      const interactionResult = await page.evaluate(() => {
        // Check for modals, selected states, or other interaction feedback
        return document.querySelector('.modal, .selected, [aria-selected="true"]') !== null;
      });

      return {
        name: 'Interactions',
        success: interactionResult,
        details: `Appointment interaction: ${interactionResult ? 'success' : 'no response'}`
      };
    } catch (error) {
      return { name: 'Interactions', success: false, details: error.message };
    }
  }

  async testPremiumFeatures(page, device) {
    try {
      // Check for premium visual features
      const premiumFeatures = await page.evaluate(() => {
        const features = {
          serviceColors: document.querySelector('[style*="background-color"], .service-color') !== null,
          barberSymbols: document.querySelector('.barber-symbol, [data-testid*="barber-symbol"]') !== null,
          premiumEffects: document.querySelector('.glassmorphism, .backdrop-blur, .shadow-lg') !== null,
          dragDropZones: document.querySelector('[draggable="true"], .droppable-zone') !== null
        };
        
        return {
          ...features,
          total: Object.values(features).filter(Boolean).length
        };
      });

      return {
        name: 'Premium Features',
        success: premiumFeatures.total >= 2, // At least 2 premium features should be visible
        details: `${premiumFeatures.total}/4 premium features detected`
      };
    } catch (error) {
      return { name: 'Premium Features', success: false, details: error.message };
    }
  }

  async testPerformance(page, device) {
    try {
      // Measure page performance
      const performanceMetrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return {
          loadTime: perf.loadEventEnd - perf.loadEventStart,
          domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
          firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0
        };
      });

      const isPerformant = performanceMetrics.loadTime < 2000 && performanceMetrics.firstPaint < 1500;

      return {
        name: 'Performance',
        success: isPerformant,
        details: `Load: ${performanceMetrics.loadTime}ms, FP: ${performanceMetrics.firstPaint}ms`
      };
    } catch (error) {
      return { name: 'Performance', success: false, details: error.message };
    }
  }

  generateReport() {
    console.log('\n📋 CROSS-PLATFORM TESTING REPORT');
    console.log('='.repeat(50));

    let totalTests = 0;
    let passedTests = 0;

    this.results.forEach(result => {
      console.log(`\n📱 ${result.device} (${result.browser})`);
      console.log(`Overall: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
      
      if (result.tests) {
        result.tests.forEach(test => {
          console.log(`  ${test.success ? '✅' : '❌'} ${test.name}: ${test.details}`);
          totalTests++;
          if (test.success) passedTests++;
        });
      }
      
      if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      }
    });

    console.log('\n📊 SUMMARY');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${totalTests - passedTests}`);

    // Device compatibility summary
    console.log('\n📱 DEVICE COMPATIBILITY');
    DEVICE_CONFIGURATIONS.forEach(device => {
      const deviceResult = this.results.find(r => r.device === device.name);
      console.log(`${device.name}: ${deviceResult?.success ? '✅ Compatible' : '❌ Issues detected'}`);
    });

    console.log(`\n${passedTests === totalTests ? '🎉 All tests passed!' : '⚠️ Some tests failed - review results above'}`);
  }
}

// Run the test suite
if (require.main === module) {
  const tester = new CrossPlatformTester();
  tester.runFullTestSuite().catch(console.error);
}

module.exports = CrossPlatformTester;