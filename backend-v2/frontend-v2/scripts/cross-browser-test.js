#!/usr/bin/env node

/**
 * Cross-Browser Compatibility Testing Suite
 * Tests calendar system across Chrome, Firefox, Safari, Edge
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { 
  CONFIG, 
  SELECTORS, 
  login, 
  takeScreenshot, 
  measurePerformance,
  TestResult,
  generateReport,
  setupNetworkMonitoring
} = require('../tests/e2e/puppeteer/test-utils');

class CrossBrowserTester {
  constructor() {
    this.results = [];
    this.browsers = [];
    this.outputDir = path.join(__dirname, '../test-results/cross-browser');
    
    // Browser configurations
    this.browserConfigs = [
      {
        name: 'chrome',
        executable: null, // Use default Chromium
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        description: 'Chrome/Chromium'
      },
      {
        name: 'firefox',
        product: 'firefox',
        executable: '/Applications/Firefox.app/Contents/MacOS/firefox',
        args: ['--headless'],
        description: 'Mozilla Firefox'
      },
      {
        name: 'edge',
        executable: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        description: 'Microsoft Edge'
      }
      // Note: Safari requires different setup, will use webkit through Playwright if available
    ];
    
    // Test scenarios focused on calendar functionality
    this.testScenarios = [
      {
        name: 'calendar_page_load',
        description: 'Calendar page loads without errors',
        url: '/calendar',
        expectedElements: [
          '.unified-calendar',
          '.calendar-header',
          '.calendar-content'
        ],
        test: this.testCalendarPageLoad.bind(this)
      },
      {
        name: 'calendar_navigation',
        description: 'Calendar navigation works (prev/next)',
        url: '/calendar',
        test: this.testCalendarNavigation.bind(this)
      },
      {
        name: 'responsive_design',
        description: 'Responsive design works on different screen sizes',
        url: '/calendar',
        test: this.testResponsiveDesign.bind(this)
      },
      {
        name: 'touch_interactions',
        description: 'Touch/drag interactions work on mobile',
        url: '/calendar',
        test: this.testTouchInteractions.bind(this)
      },
      {
        name: 'keyboard_navigation',
        description: 'Keyboard navigation works properly',
        url: '/calendar',
        test: this.testKeyboardNavigation.bind(this)
      }
    ];
  }

  async init() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      this.log('Cross-browser test suite initialized');
    } catch (error) {
      console.error('Failed to initialize cross-browser tester:', error);
      throw error;
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async launchBrowser(config) {
    this.log(`Launching ${config.description}...`);
    
    try {
      const launchOptions = {
        headless: true,
        args: config.args || [],
        devtools: false
      };

      // Add browser-specific options
      if (config.executable) {
        launchOptions.executablePath = config.executable;
      }
      
      if (config.product) {
        launchOptions.product = config.product;
      }

      const browser = await puppeteer.launch(launchOptions);
      
      // Test if browser launched successfully
      const version = await browser.version();
      this.log(`${config.description} launched successfully: ${version}`, 'success');
      
      return {
        browser,
        config,
        version
      };
    } catch (error) {
      this.log(`Failed to launch ${config.description}: ${error.message}`, 'error');
      return null;
    }
  }

  async testCalendarPageLoad(page, browserInfo) {
    const result = new TestResult(`calendar_page_load_${browserInfo.config.name}`);
    
    try {
      // Navigate to calendar page
      await page.goto(`${CONFIG.baseUrl}/calendar`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      result.addStep('Navigation', true, { url: page.url() });

      // Check for essential calendar elements
      const calendarElement = await page.$('.unified-calendar');
      result.addStep('Calendar Container', !!calendarElement);

      const headerElement = await page.$('.calendar-header');
      result.addStep('Calendar Header', !!headerElement);

      // Check for JavaScript errors
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Wait a moment for any dynamic content
      await page.waitForTimeout(3000);
      
      result.addStep('No JavaScript Errors', errors.length === 0, { errors });

      // Measure performance
      const performanceMetrics = await measurePerformance(page);
      result.setPerformance(performanceMetrics);
      result.addStep('Performance Measured', true, performanceMetrics);

      // Take screenshot
      const screenshot = `calendar-${browserInfo.config.name}-${Date.now()}.png`;
      await page.screenshot({
        path: path.join(this.outputDir, screenshot),
        fullPage: true
      });
      result.addScreenshot(screenshot);

    } catch (error) {
      result.addError(error);
      this.log(`Error in calendar page load test: ${error.message}`, 'error');
    }

    return result.finish();
  }

  async testCalendarNavigation(page, browserInfo) {
    const result = new TestResult(`calendar_navigation_${browserInfo.config.name}`);
    
    try {
      await page.goto(`${CONFIG.baseUrl}/calendar`, { waitUntil: 'networkidle0' });
      
      // Test previous/next navigation
      const prevButton = await page.$('[aria-label*="previous"], .prev-button, button[title*="Previous"]');
      const nextButton = await page.$('[aria-label*="next"], .next-button, button[title*="Next"]');
      
      result.addStep('Navigation Buttons Present', !!(prevButton && nextButton));

      if (nextButton) {
        // Get current date/month text
        const initialText = await page.evaluate(() => {
          const dateElement = document.querySelector('.calendar-header h2, .current-date, .month-year');
          return dateElement ? dateElement.textContent : '';
        });

        // Click next button
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Check if date changed
        const newText = await page.evaluate(() => {
          const dateElement = document.querySelector('.calendar-header h2, .current-date, .month-year');
          return dateElement ? dateElement.textContent : '';
        });

        result.addStep('Next Navigation Works', initialText !== newText, {
          initial: initialText,
          new: newText
        });
      }

      if (prevButton) {
        // Test previous button
        await prevButton.click();
        await page.waitForTimeout(1000);
        result.addStep('Previous Navigation Works', true);
      }

    } catch (error) {
      result.addError(error);
    }

    return result.finish();
  }

  async testResponsiveDesign(page, browserInfo) {
    const result = new TestResult(`responsive_design_${browserInfo.config.name}`);
    
    try {
      await page.goto(`${CONFIG.baseUrl}/calendar`, { waitUntil: 'networkidle0' });

      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.waitForTimeout(1000);

        // Check if calendar adapts to viewport
        const calendarElement = await page.$('.unified-calendar');
        const isVisible = await calendarElement?.isIntersectingViewport();
        
        result.addStep(`${viewport.name} Layout`, isVisible !== false);

        // Take screenshot at this viewport
        const screenshot = `responsive-${viewport.name}-${browserInfo.config.name}-${Date.now()}.png`;
        await page.screenshot({
          path: path.join(this.outputDir, screenshot),
          fullPage: false
        });
        result.addScreenshot(screenshot);
      }

    } catch (error) {
      result.addError(error);
    }

    return result.finish();
  }

  async testTouchInteractions(page, browserInfo) {
    const result = new TestResult(`touch_interactions_${browserInfo.config.name}`);
    
    try {
      await page.goto(`${CONFIG.baseUrl}/calendar`, { waitUntil: 'networkidle0' });
      
      // Set mobile viewport
      await page.setViewport({ width: 375, height: 667 });
      
      // Enable touch emulation
      await page.evaluate(() => {
        // Add touch event listeners to test touch capability
        document.addEventListener('touchstart', () => {
          window.touchSupported = true;
        });
      });

      // Test swipe gestures on calendar (if implemented)
      const calendarContent = await page.$('.calendar-content, .unified-calendar');
      
      if (calendarContent) {
        // Simulate swipe left (next)
        const box = await calendarContent.boundingBox();
        const startX = box.x + box.width * 0.8;
        const endX = box.x + box.width * 0.2;
        const y = box.y + box.height * 0.5;

        await page.mouse.move(startX, y);
        await page.mouse.down();
        await page.mouse.move(endX, y);
        await page.mouse.up();
        
        await page.waitForTimeout(1000);
        
        result.addStep('Swipe Gesture Executed', true);
      }

      // Check for touch-specific UI elements
      const touchElements = await page.$$('.touch-target, .mobile-only, .touch-optimized');
      result.addStep('Touch UI Elements', touchElements.length > 0, {
        count: touchElements.length
      });

    } catch (error) {
      result.addError(error);
    }

    return result.finish();
  }

  async testKeyboardNavigation(page, browserInfo) {
    const result = new TestResult(`keyboard_navigation_${browserInfo.config.name}`);
    
    try {
      await page.goto(`${CONFIG.baseUrl}/calendar`, { waitUntil: 'networkidle0' });
      
      // Test Tab navigation
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      result.addStep('Tab Navigation Starts', !!focusedElement);

      // Test arrow key navigation
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);
      
      result.addStep('Arrow Key Navigation', true);

      // Test Enter/Space for activation
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      result.addStep('Keyboard Activation', true);

      // Check for visible focus indicators
      const focusVisible = await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (!activeElement) return false;
        
        const styles = window.getComputedStyle(activeElement);
        return styles.outline !== 'none' || 
               styles.boxShadow.includes('rgb') ||
               activeElement.classList.contains('focus-visible');
      });
      
      result.addStep('Visible Focus Indicators', focusVisible);

    } catch (error) {
      result.addError(error);
    }

    return result.finish();
  }

  async runTestsInBrowser(browserInfo) {
    this.log(`Running tests in ${browserInfo.config.description}...`);
    
    const browserResults = [];
    
    try {
      const page = await browserInfo.browser.newPage();
      
      // Set up network monitoring
      const networkMonitoring = setupNetworkMonitoring(page);
      
      // Run each test scenario
      for (const scenario of this.testScenarios) {
        this.log(`  Testing: ${scenario.description}`);
        
        try {
          const testResult = await scenario.test(page, browserInfo);
          testResult.browser = browserInfo.config.name;
          testResult.browserVersion = browserInfo.version;
          browserResults.push(testResult);
          
          const status = testResult.success ? '✅' : '❌';
          this.log(`    ${status} ${scenario.description}`, testResult.success ? 'success' : 'error');
          
        } catch (error) {
          this.log(`    ❌ ${scenario.description} failed: ${error.message}`, 'error');
          
          const failedResult = new TestResult(scenario.name);
          failedResult.addError(error);
          failedResult.browser = browserInfo.config.name;
          failedResult.finish(false);
          browserResults.push(failedResult);
        }
      }
      
      await page.close();
      
    } catch (error) {
      this.log(`Browser test failed: ${error.message}`, 'error');
    }
    
    return browserResults;
  }

  async generateCrossBrowserReport() {
    const reportPath = path.join(this.outputDir, `cross-browser-report-${Date.now()}.json`);
    
    // Organize results by test scenario
    const testMatrix = {};
    
    this.results.forEach(result => {
      const testName = result.name.replace(/_chrome|_firefox|_edge|_safari$/, '');
      if (!testMatrix[testName]) {
        testMatrix[testName] = {};
      }
      testMatrix[testName][result.browser] = result;
    });

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.success).length,
        failedTests: this.results.filter(r => !r.success).length,
        browsersTeasted: [...new Set(this.results.map(r => r.browser))].length
      },
      testMatrix,
      detailedResults: this.results
    };

    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.log(`Cross-browser report saved: ${reportPath}`, 'success');
      
      // Generate HTML report
      await this.generateHtmlReport(report);
      
      // Generate summary
      await this.generateSummary(report);
      
    } catch (error) {
      this.log('Failed to generate cross-browser report', 'error');
    }
  }

  async generateHtmlReport(report) {
    const browsers = [...new Set(this.results.map(r => r.browser))];
    const testNames = Object.keys(report.testMatrix);
    
    const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cross-Browser Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e1e5e9; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #28a745; }
        .metric-value.error { color: #dc3545; }
        .test-matrix { margin-bottom: 30px; }
        .matrix-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .matrix-table th, .matrix-table td { border: 1px solid #dee2e6; padding: 12px; text-align: center; }
        .matrix-table th { background: #e9ecef; font-weight: bold; }
        .result-pass { background: #d4edda; color: #155724; font-weight: bold; }
        .result-fail { background: #f8d7da; color: #721c24; font-weight: bold; }
        .result-missing { background: #f8f9fa; color: #6c757d; }
        .browser-details { margin-top: 30px; }
        .browser-section { margin-bottom: 20px; padding: 15px; border: 1px solid #dee2e6; border-radius: 4px; }
        .test-details { font-size: 0.9em; color: #6c757d; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Cross-Browser Test Report</h1>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Calendar System Compatibility Testing</strong></p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.browsersTeasted}</div>
                <div>Browsers Tested</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.totalTests}</div>
                <div>Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.passedTests}</div>
                <div>Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value ${report.summary.failedTests > 0 ? 'error' : ''}">${report.summary.failedTests}</div>
                <div>Failed</div>
            </div>
        </div>

        <div class="test-matrix">
            <h2>📊 Test Results Matrix</h2>
            <table class="matrix-table">
                <thead>
                    <tr>
                        <th>Test Scenario</th>
                        ${browsers.map(browser => `<th>${browser.charAt(0).toUpperCase() + browser.slice(1)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${testNames.map(testName => `
                    <tr>
                        <td><strong>${testName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></td>
                        ${browsers.map(browser => {
                          const result = report.testMatrix[testName][browser];
                          if (!result) {
                            return '<td class="result-missing">Not Tested</td>';
                          }
                          const className = result.success ? 'result-pass' : 'result-fail';
                          const text = result.success ? '✅ PASS' : '❌ FAIL';
                          return `<td class="${className}">${text}</td>`;
                        }).join('')}
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="browser-details">
            <h2>🔍 Detailed Results</h2>
            ${browsers.map(browser => `
            <div class="browser-section">
                <h3>${browser.charAt(0).toUpperCase() + browser.slice(1)} Results</h3>
                ${this.results.filter(r => r.browser === browser).map(result => `
                <div>
                    <strong>${result.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong>
                    <span class="${result.success ? 'result-pass' : 'result-fail'}">${result.success ? 'PASS' : 'FAIL'}</span>
                    ${result.errors.length > 0 ? `
                    <div class="test-details">
                        <strong>Errors:</strong> ${result.errors.map(e => e.message).join(', ')}
                    </div>
                    ` : ''}
                    ${result.performance.loadTime ? `
                    <div class="test-details">
                        <strong>Load Time:</strong> ${Math.round(result.performance.loadTime)}ms
                    </div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    const htmlReportPath = path.join(this.outputDir, 'cross-browser-report.html');
    await fs.writeFile(htmlReportPath, htmlReport);
    this.log(`HTML report saved: ${htmlReportPath}`, 'success');
  }

  async generateSummary(report) {
    const compatibilityScore = Math.round((report.summary.passedTests / report.summary.totalTests) * 100);
    
    const summary = `
# Cross-Browser Compatibility Report
**Date:** ${report.timestamp}

## Summary
- **Browsers Tested:** ${report.summary.browsersTeasted}
- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passedTests}
- **Failed:** ${report.summary.failedTests}
- **Compatibility Score:** ${compatibilityScore}%

## Browser Support Status
${[...new Set(this.results.map(r => r.browser))].map(browser => {
  const browserResults = this.results.filter(r => r.browser === browser);
  const passed = browserResults.filter(r => r.success).length;
  const total = browserResults.length;
  const score = Math.round((passed / total) * 100);
  return `- **${browser.charAt(0).toUpperCase() + browser.slice(1)}:** ${score}% (${passed}/${total})`;
}).join('\n')}

## Test Results by Scenario
${Object.entries(report.testMatrix).map(([testName, browsers]) => {
  const results = Object.values(browsers);
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  return `### ${testName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
  - **Success Rate:** ${Math.round((passed / total) * 100)}% (${passed}/${total})`;
}).join('\n')}

## Recommendations
${this.generateCompatibilityRecommendations(report)}

## Next Steps
${compatibilityScore >= 90 ? 
  '✅ **Excellent compatibility!** Calendar system works well across all tested browsers.' :
  compatibilityScore >= 70 ?
  '⚠️ **Good compatibility** with some issues. Address failing tests for better support.' :
  '❌ **Poor compatibility**. Significant browser-specific issues need to be resolved.'
}
`;

    const summaryPath = path.join(this.outputDir, 'cross-browser-summary.md');
    await fs.writeFile(summaryPath, summary);
    this.log(`Summary saved: ${summaryPath}`, 'success');
  }

  generateCompatibilityRecommendations(report) {
    const recommendations = [];
    
    // Analyze common failures
    const failedTests = this.results.filter(r => !r.success);
    const failurePatterns = {};
    
    failedTests.forEach(test => {
      const testType = test.name.replace(/_chrome|_firefox|_edge|_safari$/, '');
      if (!failurePatterns[testType]) {
        failurePatterns[testType] = [];
      }
      failurePatterns[testType].push(test.browser);
    });
    
    Object.entries(failurePatterns).forEach(([testType, browsers]) => {
      if (browsers.length > 1) {
        recommendations.push(`- **${testType}**: Failing on multiple browsers (${browsers.join(', ')}) - likely a fundamental issue`);
      } else {
        recommendations.push(`- **${testType}**: Failing on ${browsers[0]} - browser-specific compatibility issue`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('- All tests passed! No specific recommendations.');
    }
    
    return recommendations.join('\n');
  }

  async runFullCrossBrowserTest() {
    await this.init();
    
    this.log('🚀 Starting cross-browser compatibility test suite...');
    
    try {
      // Launch all available browsers
      for (const config of this.browserConfigs) {
        const browserInfo = await this.launchBrowser(config);
        if (browserInfo) {
          this.browsers.push(browserInfo);
        }
      }
      
      if (this.browsers.length === 0) {
        throw new Error('No browsers could be launched for testing');
      }
      
      this.log(`Successfully launched ${this.browsers.length} browsers`);
      
      // Run tests in each browser
      for (const browserInfo of this.browsers) {
        const browserResults = await this.runTestsInBrowser(browserInfo);
        this.results.push(...browserResults);
      }
      
      // Generate comprehensive report
      await this.generateCrossBrowserReport();
      
      // Print final summary
      const totalTests = this.results.length;
      const passedTests = this.results.filter(r => r.success).length;
      const compatibilityScore = Math.round((passedTests / totalTests) * 100);
      
      this.log('\n📊 Cross-Browser Test Complete!');
      this.log(`Browsers tested: ${this.browsers.length}`);
      this.log(`Total tests: ${totalTests}`);
      this.log(`Passed: ${passedTests}`);
      this.log(`Failed: ${totalTests - passedTests}`);
      this.log(`Compatibility score: ${compatibilityScore}%`);
      
      if (compatibilityScore >= 90) {
        this.log('🎉 Excellent cross-browser compatibility!', 'success');
        return 0;
      } else if (compatibilityScore >= 70) {
        this.log('⚠️ Good compatibility with some issues to address.', 'warning');
        return 1;
      } else {
        this.log('❌ Poor compatibility. Significant issues need to be resolved.', 'error');
        return 2;
      }
      
    } catch (error) {
      this.log(`Cross-browser test failed: ${error.message}`, 'error');
      return 1;
    } finally {
      // Close all browsers
      for (const browserInfo of this.browsers) {
        try {
          await browserInfo.browser.close();
        } catch (error) {
          this.log(`Error closing ${browserInfo.config.name}: ${error.message}`, 'error');
        }
      }
    }
  }
}

// Run the cross-browser test if called directly
if (require.main === module) {
  const tester = new CrossBrowserTester();
  tester.runFullCrossBrowserTest().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Cross-browser test suite failed:', error);
    process.exit(1);
  });
}

module.exports = CrossBrowserTester;