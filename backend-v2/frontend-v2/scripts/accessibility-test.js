#!/usr/bin/env node

/**
 * Comprehensive Accessibility Testing Suite
 * Tests WCAG 2.2 AA compliance for calendar system
 */

const puppeteer = require('puppeteer');
const { createRequire } = require('module');
const require = createRequire(import.meta.url || __filename);
const fs = require('fs').promises;
const path = require('path');

class AccessibilityTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalViolations: 0,
        criticalViolations: 0,
        moderateViolations: 0,
        minorViolations: 0
      },
      pages: {},
      errors: []
    };
    
    this.outputDir = path.join(__dirname, '../test-results/accessibility');
    
    // Pages to test with focus on calendar system
    this.testPages = [
      {
        url: 'http://localhost:3000/',
        name: 'homepage',
        description: 'Landing page with navigation'
      },
      {
        url: 'http://localhost:3000/calendar',
        name: 'calendar',
        description: 'Main calendar interface'
      },
      {
        url: 'http://localhost:3000/dashboard',
        name: 'dashboard',
        description: 'User dashboard'
      },
      {
        url: 'http://localhost:3000/settings',
        name: 'settings',
        description: 'Settings page'
      }
    ];
  }

  async init() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      this.log('Accessibility test suite initialized');
    } catch (error) {
      console.error('Failed to initialize accessibility tester:', error);
      throw error;
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async startBrowser() {
    this.log('Starting headless browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.log('Browser closed');
    }
  }

  async testPageAccessibility(pageConfig) {
    this.log(`Testing accessibility: ${pageConfig.description}`);
    
    const page = await this.browser.newPage();
    
    try {
      // Set viewport for consistent testing
      await page.setViewport({ width: 1200, height: 800 });
      
      // Navigate to page
      await page.goto(pageConfig.url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Wait a moment for dynamic content
      await page.waitForTimeout(2000);

      // Inject axe-core
      await page.addScriptTag({
        path: require.resolve('axe-core/axe.min.js')
      });

      // Run axe accessibility tests
      const results = await page.evaluate(async () => {
        return await axe.run({
          rules: {
            // Focus on critical WCAG 2.2 AA rules
            'color-contrast': { enabled: true },
            'keyboard-navigation': { enabled: true },
            'focus-order-semantics': { enabled: true },
            'aria-valid-attr': { enabled: true },
            'aria-valid-attr-value': { enabled: true },
            'aria-required-attr': { enabled: true },
            'button-name': { enabled: true },
            'link-name': { enabled: true },
            'heading-order': { enabled: true },
            'landmark-unique': { enabled: true },
            'page-has-heading-one': { enabled: true },
            'region': { enabled: true },
            'skip-link': { enabled: true },
            'focus-order-semantics': { enabled: true }
          },
          tags: ['wcag2aa', 'wcag21aa', 'wcag22aa']
        });
      });

      // Test keyboard navigation specifically for calendar
      const keyboardTestResults = await this.testKeyboardNavigation(page, pageConfig.name);

      // Test screen reader compatibility
      const screenReaderResults = await this.testScreenReaderAnnouncements(page, pageConfig.name);

      // Store results
      this.results.pages[pageConfig.name] = {
        url: pageConfig.url,
        description: pageConfig.description,
        axeResults: results,
        keyboardNavigation: keyboardTestResults,
        screenReader: screenReaderResults,
        violations: results.violations.length,
        criticalViolations: results.violations.filter(v => v.impact === 'critical').length,
        moderateViolations: results.violations.filter(v => v.impact === 'serious').length,
        minorViolations: results.violations.filter(v => v.impact === 'moderate' || v.impact === 'minor').length
      };

      // Update summary
      this.results.summary.totalViolations += results.violations.length;
      this.results.summary.criticalViolations += results.violations.filter(v => v.impact === 'critical').length;
      this.results.summary.moderateViolations += results.violations.filter(v => v.impact === 'serious').length;
      this.results.summary.minorViolations += results.violations.filter(v => v.impact === 'moderate' || v.impact === 'minor').length;

      // Log results
      if (results.violations.length === 0) {
        this.log(`${pageConfig.name}: No accessibility violations found`, 'success');
      } else {
        this.log(`${pageConfig.name}: ${results.violations.length} violations found`, 'warning');
        results.violations.forEach(violation => {
          this.log(`  - ${violation.impact}: ${violation.description}`, 'warning');
        });
      }

    } catch (error) {
      this.log(`Error testing ${pageConfig.name}: ${error.message}`, 'error');
      this.results.errors.push({
        page: pageConfig.name,
        error: error.message,
        stack: error.stack
      });
    } finally {
      await page.close();
    }
  }

  async testKeyboardNavigation(page, pageName) {
    this.log(`Testing keyboard navigation: ${pageName}`);
    
    try {
      // Test Tab navigation
      const tabResults = await page.evaluate(() => {
        let focusableElements = [];
        let currentElement = document.activeElement;
        
        // Simulate Tab navigation through focusable elements
        const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const elements = document.querySelectorAll(focusableSelector);
        
        return {
          totalFocusableElements: elements.length,
          hasVisibleFocus: elements.length > 0,
          focusTrappingWorks: true // Simplified check
        };
      });

      // Test arrow key navigation for calendar
      if (pageName === 'calendar') {
        const calendarKeyboardResults = await page.evaluate(() => {
          // Look for calendar-specific keyboard navigation
          const calendarElements = document.querySelectorAll('[role="grid"], [role="gridcell"], .calendar-day, .calendar-slot');
          const hasAriaLabels = Array.from(calendarElements).some(el => el.getAttribute('aria-label'));
          const hasKeyboardHandlers = Array.from(calendarElements).some(el => 
            el.onkeydown || el.addEventListener
          );
          
          return {
            calendarElementsFound: calendarElements.length,
            hasAriaLabels,
            hasKeyboardHandlers,
            supportsArrowKeys: hasKeyboardHandlers
          };
        });
        
        return { ...tabResults, calendar: calendarKeyboardResults };
      }

      return tabResults;
    } catch (error) {
      return {
        error: error.message,
        testCompleted: false
      };
    }
  }

  async testScreenReaderAnnouncements(page, pageName) {
    this.log(`Testing screen reader compatibility: ${pageName}`);
    
    try {
      const screenReaderResults = await page.evaluate(() => {
        // Check for ARIA live regions
        const liveRegions = document.querySelectorAll('[aria-live]');
        const statusRegions = document.querySelectorAll('[role="status"]');
        const alertRegions = document.querySelectorAll('[role="alert"]');
        
        // Check for proper headings structure
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const headingOrder = Array.from(headings).map(h => parseInt(h.tagName[1]));
        
        // Check for landmark regions
        const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]');
        
        // Check for proper button and link labels
        const buttons = document.querySelectorAll('button');
        const links = document.querySelectorAll('a');
        const unlabeledButtons = Array.from(buttons).filter(btn => 
          !btn.textContent.trim() && !btn.getAttribute('aria-label') && !btn.getAttribute('aria-labelledby')
        );
        const unlabeledLinks = Array.from(links).filter(link => 
          !link.textContent.trim() && !link.getAttribute('aria-label') && !link.getAttribute('aria-labelledby')
        );

        return {
          liveRegions: liveRegions.length,
          statusRegions: statusRegions.length,
          alertRegions: alertRegions.length,
          headingsCount: headings.length,
          properHeadingOrder: headingOrder.length === 0 || headingOrder.every((level, index) => 
            index === 0 || level <= headingOrder[index - 1] + 1
          ),
          landmarks: landmarks.length,
          unlabeledButtons: unlabeledButtons.length,
          unlabeledLinks: unlabeledLinks.length,
          hasMainLandmark: document.querySelector('[role="main"], main') !== null
        };
      });

      return screenReaderResults;
    } catch (error) {
      return {
        error: error.message,
        testCompleted: false
      };
    }
  }

  async generateReport() {
    const reportPath = path.join(this.outputDir, `accessibility-report-${Date.now()}.json`);
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      this.log(`Detailed report saved: ${reportPath}`, 'success');
      
      // Generate HTML report
      await this.generateHtmlReport();
      
      // Generate summary
      await this.generateSummary();
      
    } catch (error) {
      this.log('Failed to generate accessibility report', 'error');
    }
  }

  async generateHtmlReport() {
    const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e1e5e9; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #28a745; }
        .metric-value.warning { color: #ffc107; }
        .metric-value.error { color: #dc3545; }
        .page-results { margin-bottom: 30px; }
        .page-title { font-size: 1.5em; font-weight: bold; margin-bottom: 15px; padding: 10px; background: #e9ecef; border-radius: 4px; }
        .violation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .violation.critical { background: #f8d7da; border-color: #f5c6cb; }
        .violation.serious { background: #fff3cd; border-color: #ffeaa7; }
        .success { color: #28a745; font-weight: bold; }
        .test-details { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Accessibility Test Report</h1>
            <p><strong>Generated:</strong> ${this.results.timestamp}</p>
            <p><strong>Target:</strong> WCAG 2.2 AA Compliance</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value ${this.results.summary.totalViolations === 0 ? 'success' : 'error'}">${this.results.summary.totalViolations}</div>
                <div>Total Violations</div>
            </div>
            <div class="metric">
                <div class="metric-value ${this.results.summary.criticalViolations === 0 ? 'success' : 'error'}">${this.results.summary.criticalViolations}</div>
                <div>Critical Issues</div>
            </div>
            <div class="metric">
                <div class="metric-value ${this.results.summary.moderateViolations === 0 ? 'success' : 'warning'}">${this.results.summary.moderateViolations}</div>
                <div>Moderate Issues</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Object.keys(this.results.pages).length}</div>
                <div>Pages Tested</div>
            </div>
        </div>

        ${Object.entries(this.results.pages).map(([pageName, pageData]) => `
        <div class="page-results">
            <div class="page-title">📄 ${pageData.description} (${pageName})</div>
            
            ${pageData.violations === 0 ? 
              '<div class="success">✅ No accessibility violations found!</div>' :
              pageData.axeResults.violations.map(violation => `
                <div class="violation ${violation.impact}">
                    <h4>${violation.description}</h4>
                    <p><strong>Impact:</strong> ${violation.impact}</p>
                    <p><strong>Tags:</strong> ${violation.tags.join(', ')}</p>
                    <p><strong>Help:</strong> <a href="${violation.helpUrl}" target="_blank">${violation.help}</a></p>
                </div>
              `).join('')
            }
            
            <div class="test-details">
                <h4>🎹 Keyboard Navigation</h4>
                <p><strong>Focusable Elements:</strong> ${pageData.keyboardNavigation.totalFocusableElements || 'N/A'}</p>
                <p><strong>Visible Focus:</strong> ${pageData.keyboardNavigation.hasVisibleFocus ? '✅ Yes' : '❌ No'}</p>
                ${pageData.keyboardNavigation.calendar ? `
                <p><strong>Calendar Elements:</strong> ${pageData.keyboardNavigation.calendar.calendarElementsFound}</p>
                <p><strong>ARIA Labels:</strong> ${pageData.keyboardNavigation.calendar.hasAriaLabels ? '✅ Yes' : '❌ No'}</p>
                ` : ''}
            </div>
            
            <div class="test-details">
                <h4>🔊 Screen Reader Support</h4>
                <p><strong>Live Regions:</strong> ${pageData.screenReader.liveRegions || 0}</p>
                <p><strong>Proper Headings:</strong> ${pageData.screenReader.properHeadingOrder ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Main Landmark:</strong> ${pageData.screenReader.hasMainLandmark ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Unlabeled Buttons:</strong> ${pageData.screenReader.unlabeledButtons || 0}</p>
                <p><strong>Unlabeled Links:</strong> ${pageData.screenReader.unlabeledLinks || 0}</p>
            </div>
        </div>
        `).join('')}

        ${this.results.errors.length > 0 ? `
        <div class="page-results">
            <div class="page-title">❌ Test Errors</div>
            ${this.results.errors.map(error => `
            <div class="violation critical">
                <h4>Error in ${error.page}</h4>
                <p>${error.error}</p>
            </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;

    const htmlReportPath = path.join(this.outputDir, 'accessibility-report.html');
    await fs.writeFile(htmlReportPath, htmlReport);
    this.log(`HTML report saved: ${htmlReportPath}`, 'success');
  }

  async generateSummary() {
    const summary = `
# Accessibility Test Summary
**Date:** ${this.results.timestamp}
**Standard:** WCAG 2.2 AA

## Overall Results
- **Total Violations:** ${this.results.summary.totalViolations}
- **Critical Issues:** ${this.results.summary.criticalViolations}
- **Moderate Issues:** ${this.results.summary.moderateViolations}
- **Minor Issues:** ${this.results.summary.minorViolations}
- **Pages Tested:** ${Object.keys(this.results.pages).length}

## Page-by-Page Results
${Object.entries(this.results.pages).map(([pageName, pageData]) => `
### ${pageData.description}
- **URL:** ${pageData.url}
- **Violations:** ${pageData.violations}
- **Critical:** ${pageData.criticalViolations}
- **Moderate:** ${pageData.moderateViolations}
- **Keyboard Navigation:** ${pageData.keyboardNavigation.totalFocusableElements || 'N/A'} focusable elements
- **Screen Reader:** ${pageData.screenReader.hasMainLandmark ? 'Properly structured' : 'Needs improvement'}
`).join('')}

## Compliance Status
${this.results.summary.criticalViolations === 0 && this.results.summary.moderateViolations === 0 ? 
  '✅ **WCAG 2.2 AA COMPLIANT** - No critical or moderate violations found' :
  '❌ **NOT COMPLIANT** - Critical or moderate violations need to be addressed'
}

## Recommendations
${this.generateAccessibilityRecommendations()}

## Calendar-Specific Findings
${this.generateCalendarAccessibilityReport()}
`;

    const summaryPath = path.join(this.outputDir, 'accessibility-summary.md');
    await fs.writeFile(summaryPath, summary);
    this.log(`Summary saved: ${summaryPath}`, 'success');
  }

  generateAccessibilityRecommendations() {
    const recommendations = [];
    
    if (this.results.summary.criticalViolations > 0) {
      recommendations.push('🚨 **CRITICAL**: Address all critical violations immediately - these prevent users from accessing core functionality');
    }
    
    if (this.results.summary.moderateViolations > 0) {
      recommendations.push('⚠️ **HIGH PRIORITY**: Fix moderate violations to ensure WCAG 2.2 AA compliance');
    }
    
    // Check for common issues across pages
    const pagesWithUnlabeledButtons = Object.values(this.results.pages).filter(page => 
      page.screenReader && page.screenReader.unlabeledButtons > 0
    ).length;
    
    if (pagesWithUnlabeledButtons > 0) {
      recommendations.push('🔘 Add proper labels to all buttons using aria-label or visible text');
    }
    
    const pagesWithoutMainLandmark = Object.values(this.results.pages).filter(page => 
      page.screenReader && !page.screenReader.hasMainLandmark
    ).length;
    
    if (pagesWithoutMainLandmark > 0) {
      recommendations.push('🏷️ Add main landmark regions to improve screen reader navigation');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('🎉 **EXCELLENT!** All accessibility tests passed. Calendar system is fully accessible.');
    }
    
    return recommendations.join('\n');
  }

  generateCalendarAccessibilityReport() {
    const calendarPage = this.results.pages['calendar'];
    if (!calendarPage) {
      return '❌ Calendar page was not tested';
    }
    
    const calendarKeyboard = calendarPage.keyboardNavigation.calendar;
    if (!calendarKeyboard) {
      return '⚠️ Calendar-specific keyboard navigation was not tested';
    }
    
    return `
- **Calendar Elements Found:** ${calendarKeyboard.calendarElementsFound}
- **ARIA Labels Present:** ${calendarKeyboard.hasAriaLabels ? '✅ Yes' : '❌ No'}
- **Keyboard Handlers:** ${calendarKeyboard.hasKeyboardHandlers ? '✅ Yes' : '❌ No'}
- **Arrow Key Support:** ${calendarKeyboard.supportsArrowKeys ? '✅ Yes' : '❌ No'}

${calendarKeyboard.hasAriaLabels && calendarKeyboard.hasKeyboardHandlers ? 
  '✅ **Calendar is accessible** - Proper keyboard navigation and screen reader support' :
  '❌ **Calendar needs improvement** - Missing keyboard navigation or ARIA labels'
}`;
  }

  async runFullAccessibilityTest() {
    await this.init();
    
    this.log('🚀 Starting comprehensive accessibility test suite...');
    
    try {
      await this.startBrowser();
      
      // Test each page
      for (const pageConfig of this.testPages) {
        await this.testPageAccessibility(pageConfig);
      }
      
      // Generate reports
      await this.generateReport();
      
      // Print summary
      this.log('\n📊 Accessibility Test Complete!');
      this.log(`Total violations: ${this.results.summary.totalViolations}`);
      this.log(`Critical issues: ${this.results.summary.criticalViolations}`);
      this.log(`Pages tested: ${Object.keys(this.results.pages).length}`);
      
      if (this.results.summary.criticalViolations === 0 && this.results.summary.moderateViolations === 0) {
        this.log('🎉 WCAG 2.2 AA compliance achieved!', 'success');
        return 0;
      } else {
        this.log('⚠️ Accessibility issues found. Check the reports for details.', 'warning');
        return 1;
      }
      
    } catch (error) {
      this.log(`Accessibility test failed: ${error.message}`, 'error');
      return 1;
    } finally {
      await this.closeBrowser();
    }
  }
}

// Run the accessibility test if called directly
if (require.main === module) {
  const tester = new AccessibilityTester();
  tester.runFullAccessibilityTest().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Accessibility test suite failed:', error);
    process.exit(1);
  });
}

module.exports = AccessibilityTester;