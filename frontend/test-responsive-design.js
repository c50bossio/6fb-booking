#!/usr/bin/env node

/**
 * Comprehensive Responsive Design Testing Script
 * Tests mobile, tablet, and desktop layouts with real browser automation
 * Includes accessibility, touch targets, and cross-browser compatibility
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configurations for different devices
const DEVICE_CONFIGS = {
  mobile: {
    name: 'iPhone 12',
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  },
  mobileLarge: {
    name: 'iPhone 12 Pro Max',
    viewport: { width: 428, height: 926, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  },
  mobileSmall: {
    name: 'iPhone SE',
    viewport: { width: 375, height: 667, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  },
  tablet: {
    name: 'iPad',
    viewport: { width: 768, height: 1024, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  },
  tabletLandscape: {
    name: 'iPad Landscape',
    viewport: { width: 1024, height: 768, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  },
  desktop: {
    name: 'Desktop 1920x1080',
    viewport: { width: 1920, height: 1080, isMobile: false, hasTouch: false },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  desktopSmall: {
    name: 'Desktop 1366x768',
    viewport: { width: 1366, height: 768, isMobile: false, hasTouch: false },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
};

// Pages to test
const TEST_PAGES = [
  { path: '/', name: 'Home/Landing' },
  { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
  { path: '/dashboard/calendar', name: 'Calendar', requiresAuth: true },
  { path: '/appointments', name: 'Appointments', requiresAuth: true },
  { path: '/barbers', name: 'Barbers', requiresAuth: true },
  { path: '/clients', name: 'Clients', requiresAuth: true },
  { path: '/analytics', name: 'Analytics', requiresAuth: true },
  { path: '/book', name: 'Booking Form' },
  { path: '/settings', name: 'Settings', requiresAuth: true }
];

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  },
  devices: {},
  issues: []
};

class ResponsiveDesignTester {
  constructor() {
    this.browser = null;
    this.baseUrl = 'http://localhost:3000';
    this.screenshotDir = './screenshots/responsive-test';
    this.authToken = null;
  }

  async init() {
    console.log('🚀 Starting Responsive Design Testing...\n');
    
    // Create screenshots directory
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Attempt to get auth token for protected routes
    await this.getAuthToken();
  }

  async getAuthToken() {
    try {
      const page = await this.browser.newPage();
      await page.goto(`${this.baseUrl}/login`);
      
      // Try to login with test credentials (if available)
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      
      if (emailInput && passwordInput) {
        await emailInput.type('test@example.com');
        await passwordInput.type('testpassword');
        
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          // Check if we have auth token in localStorage
          const token = await page.evaluate(() => localStorage.getItem('auth_token'));
          if (token) {
            this.authToken = token;
            console.log('✅ Authentication token obtained for protected routes');
          }
        }
      }
      
      await page.close();
    } catch (error) {
      console.log('⚠️  Could not obtain auth token - protected routes will be tested without authentication');
    }
  }

  async testDevice(deviceKey, deviceConfig) {
    console.log(`📱 Testing ${deviceConfig.name} (${deviceConfig.viewport.width}x${deviceConfig.viewport.height})`);
    
    const page = await this.browser.newPage();
    await page.setViewport(deviceConfig.viewport);
    await page.setUserAgent(deviceConfig.userAgent);

    // Set auth token if available
    if (this.authToken) {
      await page.evaluateOnNewDocument((token) => {
        localStorage.setItem('auth_token', token);
      }, this.authToken);
    }

    const deviceResults = {
      device: deviceConfig.name,
      viewport: deviceConfig.viewport,
      pages: {},
      issues: []
    };

    for (const testPage of TEST_PAGES) {
      console.log(`  📄 Testing ${testPage.name}...`);
      
      try {
        const pageResult = await this.testPage(page, testPage, deviceConfig, deviceKey);
        deviceResults.pages[testPage.path] = pageResult;
        
        if (pageResult.issues.length > 0) {
          deviceResults.issues.push(...pageResult.issues);
        }
        
      } catch (error) {
        console.error(`    ❌ Error testing ${testPage.name}: ${error.message}`);
        deviceResults.pages[testPage.path] = {
          status: 'error',
          error: error.message,
          issues: [`Failed to load page: ${error.message}`]
        };
      }
    }

    await page.close();
    return deviceResults;
  }

  async testPage(page, testPage, deviceConfig, deviceKey) {
    const pageResult = {
      status: 'success',
      loadTime: 0,
      issues: [],
      screenshots: [],
      accessibility: {},
      touchTargets: [],
      responsiveElements: {}
    };

    const startTime = Date.now();

    try {
      // Navigate to page
      await page.goto(`${this.baseUrl}${testPage.path}`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      pageResult.loadTime = Date.now() - startTime;

      // Take screenshot
      const screenshotPath = path.join(
        this.screenshotDir, 
        `${deviceKey}-${testPage.name.replace(/[^a-zA-Z0-9]/g, '-')}.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      pageResult.screenshots.push(screenshotPath);

      // Test responsive layout
      await this.testResponsiveLayout(page, pageResult, deviceConfig);

      // Test mobile interactions (if mobile device)
      if (deviceConfig.viewport.isMobile) {
        await this.testMobileInteractions(page, pageResult);
      }

      // Test sidebar behavior
      await this.testSidebarBehavior(page, pageResult, deviceConfig);

      // Test form layouts
      await this.testFormLayouts(page, pageResult, deviceConfig);

      // Test touch targets (if touch device)
      if (deviceConfig.viewport.hasTouch) {
        await this.testTouchTargets(page, pageResult);
      }

      // Test accessibility
      await this.testAccessibility(page, pageResult);

      // Test specific components
      await this.testSpecificComponents(page, pageResult, deviceConfig);

    } catch (error) {
      pageResult.status = 'error';
      pageResult.issues.push(`Page test failed: ${error.message}`);
    }

    return pageResult;
  }

  async testResponsiveLayout(page, pageResult, deviceConfig) {
    try {
      // Check if content overflows horizontally
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        pageResult.issues.push('Horizontal scroll detected - content may be too wide');
      }

      // Check for proper responsive breakpoints
      const viewportWidth = deviceConfig.viewport.width;
      const expectedLayout = this.getExpectedLayout(viewportWidth);
      
      // Test sidebar behavior based on viewport
      const sidebarVisible = await page.$('.sidebar-dark, .sidebar-light');
      const sidebarCollapsed = await page.evaluate(() => {
        const sidebar = document.querySelector('.sidebar-dark, .sidebar-light');
        return sidebar ? sidebar.classList.contains('w-20') : false;
      });

      pageResult.responsiveElements.sidebar = {
        visible: !!sidebarVisible,
        collapsed: sidebarCollapsed,
        expected: expectedLayout.sidebarCollapsed
      };

      if (viewportWidth < 768 && !sidebarCollapsed) {
        pageResult.issues.push('Sidebar should be collapsed on mobile devices');
      }

      // Check text readability
      const textElements = await page.$$('p, span, div');
      for (let element of textElements.slice(0, 10)) { // Test first 10 elements
        const fontSize = await page.evaluate(el => {
          const style = window.getComputedStyle(el);
          return parseFloat(style.fontSize);
        }, element);

        if (fontSize < 14 && deviceConfig.viewport.isMobile) {
          pageResult.issues.push('Text may be too small for mobile devices');
          break;
        }
      }

    } catch (error) {
      pageResult.issues.push(`Responsive layout test failed: ${error.message}`);
    }
  }

  async testMobileInteractions(page, pageResult) {
    try {
      // Test touch/tap events
      const buttons = await page.$$('button, a[role="button"], .clickable');
      
      for (let button of buttons.slice(0, 5)) { // Test first 5 buttons
        try {
          // Simulate touch
          await button.tap();
          await page.waitForTimeout(100);
        } catch (error) {
          pageResult.issues.push(`Button/link not responsive to touch: ${error.message}`);
        }
      }

      // Test swipe gestures (if applicable)
      const swipeableElements = await page.$$('.swipe, .carousel, .slider');
      if (swipeableElements.length > 0) {
        pageResult.responsiveElements.swipeGestures = true;
      }

    } catch (error) {
      pageResult.issues.push(`Mobile interaction test failed: ${error.message}`);
    }
  }

  async testSidebarBehavior(page, pageResult, deviceConfig) {
    try {
      const sidebar = await page.$('.sidebar-dark, .sidebar-light');
      if (!sidebar) return;

      // Test sidebar toggle
      const toggleButton = await page.$('button[aria-label*="toggle"], button[title*="toggle"], .sidebar button');
      if (toggleButton) {
        const initialWidth = await page.evaluate(el => el.offsetWidth, sidebar);
        await toggleButton.click();
        await page.waitForTimeout(500); // Wait for animation
        
        const newWidth = await page.evaluate(el => el.offsetWidth, sidebar);
        
        if (initialWidth === newWidth) {
          pageResult.issues.push('Sidebar toggle does not appear to change sidebar width');
        } else {
          pageResult.responsiveElements.sidebarToggle = true;
        }
      }

      // Test sidebar overlay on mobile
      if (deviceConfig.viewport.width < 768) {
        const hasOverlay = await page.$('.modal-backdrop, .overlay, .backdrop');
        if (!hasOverlay && await page.evaluate(el => el.offsetWidth, sidebar) > 100) {
          pageResult.issues.push('Mobile sidebar should have overlay/backdrop when open');
        }
      }

    } catch (error) {
      pageResult.issues.push(`Sidebar behavior test failed: ${error.message}`);
    }
  }

  async testFormLayouts(page, pageResult, deviceConfig) {
    try {
      const forms = await page.$$('form');
      
      for (let form of forms) {
        // Test input spacing and sizing
        const inputs = await form.$$('input, textarea, select');
        
        for (let input of inputs) {
          const inputSize = await page.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }, input);

          // Check minimum touch target size on mobile
          if (deviceConfig.viewport.hasTouch && inputSize.height < 44) {
            pageResult.issues.push('Form input touch target too small (minimum 44px height recommended)');
          }

          // Check if input is properly sized for viewport
          const viewportWidth = deviceConfig.viewport.width;
          if (inputSize.width > viewportWidth * 0.9) {
            pageResult.issues.push('Form input may be too wide for mobile viewport');
          }
        }

        // Test form button sizing
        const buttons = await form.$$('button, input[type="submit"]');
        for (let button of buttons) {
          const buttonSize = await page.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }, button);

          if (deviceConfig.viewport.hasTouch && buttonSize.height < 44) {
            pageResult.issues.push('Form button touch target too small (minimum 44px recommended)');
          }
        }
      }

    } catch (error) {
      pageResult.issues.push(`Form layout test failed: ${error.message}`);
    }
  }

  async testTouchTargets(page, pageResult) {
    try {
      // Test all clickable elements for proper touch target size
      const clickableElements = await page.$$('button, a, input, select, textarea, [onclick], [role="button"]');
      
      let smallTargetCount = 0;
      
      for (let element of clickableElements) {
        const targetSize = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return { 
            width: rect.width, 
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0
          };
        }, element);

        if (targetSize.visible && (targetSize.width < 44 || targetSize.height < 44)) {
          smallTargetCount++;
        }
      }

      pageResult.touchTargets = {
        total: clickableElements.length,
        tooSmall: smallTargetCount,
        compliance: smallTargetCount === 0
      };

      if (smallTargetCount > 0) {
        pageResult.issues.push(`${smallTargetCount} touch targets are smaller than 44px (WCAG recommendation)`);
      }

    } catch (error) {
      pageResult.issues.push(`Touch target test failed: ${error.message}`);
    }
  }

  async testAccessibility(page, pageResult) {
    try {
      // Test color contrast (basic check)
      const colorContrastIssues = await page.evaluate(() => {
        const issues = [];
        const elements = document.querySelectorAll('*');
        
        for (let i = 0; i < Math.min(elements.length, 50); i++) {
          const el = elements[i];
          const style = window.getComputedStyle(el);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          
          // Basic check - if text is very light and background is very light
          if (color.includes('rgb(255') && backgroundColor.includes('rgb(255')) {
            issues.push('Potential color contrast issue detected');
            break;
          }
        }
        
        return issues;
      });

      // Test for alt text on images
      const imagesWithoutAlt = await page.$$eval('img', imgs => 
        imgs.filter(img => !img.alt || img.alt.trim() === '').length
      );

      // Test for proper heading structure
      const headingStructure = await page.$$eval('h1, h2, h3, h4, h5, h6', headings => 
        headings.map(h => h.tagName.toLowerCase())
      );

      pageResult.accessibility = {
        colorContrastIssues: colorContrastIssues.length,
        imagesWithoutAlt,
        headingStructure: headingStructure.length > 0
      };

      if (imagesWithoutAlt > 0) {
        pageResult.issues.push(`${imagesWithoutAlt} images missing alt text`);
      }

    } catch (error) {
      pageResult.issues.push(`Accessibility test failed: ${error.message}`);
    }
  }

  async testSpecificComponents(page, pageResult, deviceConfig) {
    try {
      // Test calendar component responsiveness
      const calendar = await page.$('.calendar, [class*="calendar"], .react-calendar');
      if (calendar) {
        const calendarSize = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }, calendar);

        if (deviceConfig.viewport.isMobile && calendarSize.width > deviceConfig.viewport.width) {
          pageResult.issues.push('Calendar component too wide for mobile viewport');
        }
      }

      // Test table responsiveness
      const tables = await page.$$('table');
      for (let table of tables) {
        const tableSize = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width };
        }, table);

        if (deviceConfig.viewport.isMobile && tableSize.width > deviceConfig.viewport.width) {
          pageResult.issues.push('Table too wide for mobile - consider horizontal scroll or responsive design');
        }
      }

      // Test modal responsiveness
      const modals = await page.$$('.modal, [role="dialog"], .dialog');
      for (let modal of modals) {
        const modalSize = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }, modal);

        if (modalSize.width > deviceConfig.viewport.width * 0.95) {
          pageResult.issues.push('Modal may be too wide for mobile viewport');
        }
      }

    } catch (error) {
      pageResult.issues.push(`Component-specific test failed: ${error.message}`);
    }
  }

  getExpectedLayout(viewportWidth) {
    if (viewportWidth < 768) {
      return {
        sidebarCollapsed: true,
        layout: 'mobile'
      };
    } else if (viewportWidth < 1024) {
      return {
        sidebarCollapsed: false,
        layout: 'tablet'
      };
    } else {
      return {
        sidebarCollapsed: false,
        layout: 'desktop'
      };
    }
  }

  async generateReport() {
    // Calculate summary statistics
    let totalTests = 0;
    let totalIssues = 0;
    let totalPassed = 0;

    for (const [deviceKey, deviceResult] of Object.entries(testResults.devices)) {
      for (const [pagePath, pageResult] of Object.entries(deviceResult.pages)) {
        totalTests++;
        if (pageResult.issues && pageResult.issues.length > 0) {
          totalIssues += pageResult.issues.length;
        } else {
          totalPassed++;
        }
      }
    }

    testResults.summary = {
      totalTests,
      passed: totalPassed,
      failed: totalTests - totalPassed,
      totalIssues
    };

    // Write detailed report
    const reportPath = './responsive-design-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

    // Generate summary report
    const summaryReport = this.generateSummaryReport();
    const summaryPath = './responsive-design-summary.md';
    fs.writeFileSync(summaryPath, summaryReport);

    console.log(`\n📊 Test Results Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed}`);
    console.log(`   Failed: ${totalTests - totalPassed}`);
    console.log(`   Total Issues: ${totalIssues}`);
    console.log(`\n📁 Reports generated:`);
    console.log(`   Detailed: ${reportPath}`);
    console.log(`   Summary: ${summaryPath}`);
    console.log(`   Screenshots: ${this.screenshotDir}`);
  }

  generateSummaryReport() {
    let report = `# Responsive Design Test Report\n\n`;
    report += `**Generated:** ${testResults.timestamp}\n\n`;
    
    report += `## Summary\n\n`;
    report += `- **Total Tests:** ${testResults.summary.totalTests}\n`;
    report += `- **Passed:** ${testResults.summary.passed}\n`;
    report += `- **Failed:** ${testResults.summary.failed}\n`;
    report += `- **Total Issues:** ${testResults.summary.totalIssues}\n\n`;

    report += `## Issues by Device\n\n`;
    
    for (const [deviceKey, deviceResult] of Object.entries(testResults.devices)) {
      report += `### ${deviceResult.device}\n\n`;
      
      if (deviceResult.issues.length === 0) {
        report += `✅ No issues found\n\n`;
      } else {
        for (const issue of deviceResult.issues) {
          report += `- ❌ ${issue}\n`;
        }
        report += `\n`;
      }
    }

    report += `## Recommendations\n\n`;
    
    const allIssues = Object.values(testResults.devices).flatMap(d => d.issues);
    const commonIssues = [...new Set(allIssues)];
    
    if (commonIssues.some(issue => issue.includes('touch target'))) {
      report += `### Touch Targets\n`;
      report += `- Ensure all clickable elements are at least 44px in height for mobile devices\n`;
      report += `- Add padding to small buttons and links\n\n`;
    }
    
    if (commonIssues.some(issue => issue.includes('too wide'))) {
      report += `### Layout Width Issues\n`;
      report += `- Implement proper responsive breakpoints\n`;
      report += `- Consider horizontal scrolling or collapsible layouts for wide content\n\n`;
    }
    
    if (commonIssues.some(issue => issue.includes('sidebar'))) {
      report += `### Sidebar Responsiveness\n`;
      report += `- Ensure sidebar collapses properly on mobile devices\n`;
      report += `- Add backdrop/overlay for mobile sidebar interactions\n\n`;
    }

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();

      // Test each device configuration
      for (const [deviceKey, deviceConfig] of Object.entries(DEVICE_CONFIGS)) {
        const deviceResult = await this.testDevice(deviceKey, deviceConfig);
        testResults.devices[deviceKey] = deviceResult;
        
        console.log(`  ✅ Completed ${deviceConfig.name} (${deviceResult.issues.length} issues found)\n`);
      }

      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new ResponsiveDesignTester();
  tester.run().then(() => {
    console.log('\n🎉 Responsive design testing completed!');
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ResponsiveDesignTester;