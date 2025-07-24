#!/usr/bin/env node

/**
 * Integration Testing Suite
 * Tests calendar system with real API data and backend integration
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { 
  CONFIG, 
  SELECTORS, 
  login, 
  takeScreenshot, 
  TestResult,
  setupNetworkMonitoring
} = require('../tests/e2e/puppeteer/test-utils');

class IntegrationTester {
  constructor() {
    this.results = [];
    this.browser = null;
    this.outputDir = path.join(__dirname, '../test-results/integration');
    
    // API endpoints to test
    this.apiEndpoints = [
      {
        endpoint: '/api/v2/appointments/',
        method: 'GET',
        description: 'Fetch user appointments',
        requiresAuth: true
      },
      {
        endpoint: '/api/v2/calendar/events',
        method: 'GET',
        description: 'Fetch calendar events',
        requiresAuth: true
      },
      {
        endpoint: '/api/v2/auth/me',
        method: 'GET',
        description: 'Get current user profile',
        requiresAuth: true
      },
      {
        endpoint: '/api/v2/dashboard/client-metrics',
        method: 'GET',
        description: 'Get dashboard metrics',
        requiresAuth: true
      }
    ];

    // Integration test scenarios
    this.testScenarios = [
      {
        name: 'api_connectivity',
        description: 'Backend API connectivity and response validation',
        test: this.testApiConnectivity.bind(this)
      },
      {
        name: 'calendar_data_loading',
        description: 'Calendar loads real appointment data',
        test: this.testCalendarDataLoading.bind(this)
      },
      {
        name: 'authentication_flow',
        description: 'Complete authentication flow with backend',
        test: this.testAuthenticationFlow.bind(this)
      },
      {
        name: 'calendar_interactions',
        description: 'Calendar interactions update backend state',
        test: this.testCalendarInteractions.bind(this)
      },
      {
        name: 'error_handling',
        description: 'Proper error handling for API failures',
        test: this.testErrorHandling.bind(this)
      },
      {
        name: 'real_data_rendering',
        description: 'Calendar renders real appointment data correctly',
        test: this.testRealDataRendering.bind(this)
      }
    ];
  }

  async init() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      this.log('Integration test suite initialized');
    } catch (error) {
      console.error('Failed to initialize integration tester:', error);
      throw error;
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async startBrowser() {
    this.log('Starting browser for integration testing...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.log('Browser closed');
    }
  }

  async testApiConnectivity(page) {
    const result = new TestResult('api_connectivity');
    
    try {
      // Set up network monitoring
      const networkMonitoring = setupNetworkMonitoring(page);
      
      // Navigate to calendar page (should trigger API calls)
      await page.goto(`${CONFIG.baseUrl}/calendar`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Wait for potential API calls
      await page.waitForTimeout(3000);

      // Check network requests
      const apiRequests = networkMonitoring.requests.filter(req => 
        req.url.includes('/api/v2/') || req.url.includes('/api/v1/')
      );
      
      result.addStep('API Requests Made', apiRequests.length > 0, {
        requestCount: apiRequests.length,
        endpoints: apiRequests.map(req => req.url)
      });

      // Check API responses
      const apiResponses = networkMonitoring.responses.filter(res => 
        res.url.includes('/api/v2/') || res.url.includes('/api/v1/')
      );

      const successfulResponses = apiResponses.filter(res => 
        res.status >= 200 && res.status < 300
      );
      
      const errorResponses = apiResponses.filter(res => 
        res.status >= 400
      );

      result.addStep('Successful API Responses', successfulResponses.length > 0, {
        successCount: successfulResponses.length,
        errorCount: errorResponses.length,
        responses: apiResponses.map(res => ({ url: res.url, status: res.status }))
      });

      // Test specific endpoints
      for (const endpoint of this.apiEndpoints) {
        const endpointRequests = apiRequests.filter(req => 
          req.url.includes(endpoint.endpoint)
        );
        
        result.addStep(`${endpoint.description}`, endpointRequests.length > 0, {
          endpoint: endpoint.endpoint,
          found: endpointRequests.length > 0
        });
      }

    } catch (error) {
      result.addError(error);
    }

    return result.finish();
  }

  async testCalendarDataLoading(page) {
    const result = new TestResult('calendar_data_loading');
    
    try {
      // Login first to get authenticated data
      const loginSuccess = await this.performLogin(page);
      result.addStep('Authentication', loginSuccess);

      if (loginSuccess) {
        // Navigate to calendar
        await page.goto(`${CONFIG.baseUrl}/calendar`, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        // Check for calendar container
        const calendarElement = await page.$('.unified-calendar');
        result.addStep('Calendar Container Present', !!calendarElement);

        // Check for loading states
        const loadingElement = await page.$('.loading, .spinner, [role="progressbar"]');
        const hasLoadingState = !!loadingElement;
        result.addStep('Loading State Implemented', hasLoadingState);

        // Wait for data to load
        await page.waitForTimeout(5000);

        // Check for appointment data
        const appointmentElements = await page.$$('.appointment, .booking, .event');
        result.addStep('Appointment Data Loaded', appointmentElements.length > 0, {
          appointmentCount: appointmentElements.length
        });

        // Check for empty state if no appointments
        if (appointmentElements.length === 0) {
          const emptyState = await page.$('.empty-state, .no-appointments');
          result.addStep('Empty State Displayed', !!emptyState);
        }

        // Check for calendar navigation elements
        const navElements = await page.$$('.calendar-nav, .prev-button, .next-button');
        result.addStep('Navigation Elements Present', navElements.length > 0);

        // Take screenshot of loaded calendar
        const screenshot = `calendar-loaded-${Date.now()}.png`;
        await page.screenshot({
          path: path.join(this.outputDir, screenshot),
          fullPage: true
        });
        result.addScreenshot(screenshot);
      }

    } catch (error) {
      result.addError(error);
    }

    return result.finish();
  }

  async testAuthenticationFlow(page) {
    const result = new TestResult('authentication_flow');
    
    try {
      // Start from login page
      await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle0' });
      
      // Check login form exists
      const emailInput = await page.$(SELECTORS.emailInput);
      const passwordInput = await page.$(SELECTORS.passwordInput);
      const submitButton = await page.$(SELECTORS.submitButton);
      
      result.addStep('Login Form Present', !!(emailInput && passwordInput && submitButton));

      // Perform login
      const loginSuccess = await this.performLogin(page);
      result.addStep('Login Successful', loginSuccess);

      if (loginSuccess) {
        // Check if redirected to authenticated area
        const currentUrl = page.url();
        const isAuthenticated = currentUrl.includes('/dashboard') || currentUrl.includes('/calendar');
        result.addStep('Post-Login Redirect', isAuthenticated, { redirectUrl: currentUrl });

        // Check for authenticated API calls
        const networkMonitoring = setupNetworkMonitoring(page);
        
        // Navigate to calendar to trigger authenticated requests
        await page.goto(`${CONFIG.baseUrl}/calendar`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(3000);

        const authRequests = networkMonitoring.requests.filter(req => 
          req.headers && (req.headers['authorization'] || req.headers['Authorization'])
        );
        
        result.addStep('Authenticated Requests', authRequests.length > 0, {
          authRequestCount: authRequests.length
        });
      }

    } catch (error) {
      result.addError(error);
    }

    return result.finish();
  }

  async testCalendarInteractions(page) {
    const result = new TestResult('calendar_interactions');
    
    try {
      // Login and navigate to calendar
      const loginSuccess = await this.performLogin(page);
      if (!loginSuccess) {
        result.addError(new Error('Login failed - cannot test interactions'));
        return result.finish(false);
      }

      await page.goto(`${CONFIG.baseUrl}/calendar`, { waitUntil: 'networkidle0' });

      // Set up network monitoring for interactions
      const networkMonitoring = setupNetworkMonitoring(page);

      // Test calendar navigation
      const nextButton = await page.$('[aria-label*="next"], .next-button, button[title*="Next"]');
      if (nextButton) {
        await nextButton.click();
        await page.waitForTimeout(2000);
        
        result.addStep('Calendar Navigation Click', true);
        
        // Check if navigation caused API requests
        const navRequests = networkMonitoring.requests.filter(req => 
          req.url.includes('/api/') && req.timestamp > Date.now() - 5000
        );
        
        result.addStep('Navigation API Requests', navRequests.length > 0, {
          requestCount: navRequests.length
        });
      }

      // Test time slot interaction (if available)
      const timeSlots = await page.$$('.time-slot, .calendar-slot, .available-time');
      if (timeSlots.length > 0) {
        await timeSlots[0].click();
        await page.waitForTimeout(1000);
        
        result.addStep('Time Slot Interaction', true);
        
        // Check for modal or booking interface
        const modal = await page.$('[role="dialog"], .modal, .booking-modal');
        result.addStep('Booking Interface Opens', !!modal);
      }

      // Test appointment interaction (if appointments exist)
      const appointments = await page.$$('.appointment, .booking, .event');
      if (appointments.length > 0) {
        await appointments[0].click();
        await page.waitForTimeout(1000);
        
        result.addStep('Appointment Click', true);
        
        // Check for appointment details
        const details = await page.$('.appointment-details, .booking-details, .event-details');
        result.addStep('Appointment Details Shown', !!details);
      }

    } catch (error) {
      result.addError(error);
    }

    return result.finish();
  }

  async testErrorHandling(page) {
    const result = new TestResult('error_handling');
    
    try {
      // Test with invalid authentication
      await page.goto(`${CONFIG.baseUrl}/api/v2/appointments/`, { 
        waitUntil: 'networkidle0' 
      });
      
      // Should get 401 or redirect to login
      const currentUrl = page.url();
      const isErrorHandled = currentUrl.includes('/login') || 
                            currentUrl.includes('401') || 
                            currentUrl.includes('unauthorized');
      
      result.addStep('Unauthorized Access Handled', isErrorHandled);

      // Test calendar with potential API errors
      await page.goto(`${CONFIG.baseUrl}/calendar`, { waitUntil: 'networkidle0' });
      
      // Check for error boundaries/handling
      await page.waitForTimeout(3000);
      
      // Look for error messages
      const errorElements = await page.$$('.error, .text-red-600, [role="alert"]');
      
      // Check if page still renders despite potential API errors
      const calendarElement = await page.$('.unified-calendar');
      result.addStep('Calendar Renders Despite Errors', !!calendarElement);
      
      // Check for graceful error display
      if (errorElements.length > 0) {
        result.addStep('Error Messages Displayed', true, {
          errorCount: errorElements.length
        });
      }

      // Check console for unhandled errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(5000);
      
      result.addStep('No Unhandled Console Errors', consoleErrors.length === 0, {
        consoleErrors
      });

    } catch (error) {
      result.addError(error);
    }

    return result.finish();
  }

  async testRealDataRendering(page) {
    const result = new TestResult('real_data_rendering');
    
    try {
      // Login to get real user data
      const loginSuccess = await this.performLogin(page);
      result.addStep('Authentication for Data', loginSuccess);

      if (loginSuccess) {
        await page.goto(`${CONFIG.baseUrl}/calendar`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(5000);

        // Check calendar elements render correctly
        const calendarElement = await page.$('.unified-calendar');
        result.addStep('Calendar Component Renders', !!calendarElement);

        // Check for date elements
        const dateElements = await page.$$('.calendar-date, .day, .date');
        result.addStep('Date Elements Present', dateElements.length > 0, {
          dateCount: dateElements.length
        });

        // Check for time elements
        const timeElements = await page.$$('.time-slot, .hour, .time');
        result.addStep('Time Elements Present', timeElements.length > 0, {
          timeCount: timeElements.length
        });

        // Verify appointment data structure
        const appointments = await page.evaluate(() => {
          const appointmentElements = document.querySelectorAll('.appointment, .booking, .event');
          return Array.from(appointmentElements).map(el => ({
            hasClientName: !!el.querySelector('.client-name, .client'),
            hasTime: !!el.querySelector('.time, .start-time'),
            hasService: !!el.querySelector('.service, .service-name'),
            hasStatus: !!el.querySelector('.status')
          }));
        });

        if (appointments.length > 0) {
          const wellFormedAppointments = appointments.filter(apt => 
            apt.hasClientName && apt.hasTime
          ).length;
          
          result.addStep('Well-Formed Appointments', wellFormedAppointments > 0, {
            totalAppointments: appointments.length,
            wellFormedCount: wellFormedAppointments,
            appointmentStructure: appointments.slice(0, 3) // Sample structure
          });
        }

        // Check calendar navigation displays current period
        const headerText = await page.evaluate(() => {
          const header = document.querySelector('.calendar-header h1, .calendar-header h2, .current-period');
          return header ? header.textContent.trim() : '';
        });

        result.addStep('Period Display', !!headerText && headerText.length > 0, {
          headerText
        });

        // Take screenshot of real data
        const screenshot = `real-data-calendar-${Date.now()}.png`;
        await page.screenshot({
          path: path.join(this.outputDir, screenshot),
          fullPage: true
        });
        result.addScreenshot(screenshot);
      }

    } catch (error) {
      result.addError(error);
    }

    return result.finish();
  }

  async performLogin(page) {
    try {
      await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle0' });
      
      // Use test credentials (admin user)
      await page.type(SELECTORS.emailInput, 'admin.test@bookedbarber.com');
      await page.type(SELECTORS.passwordInput, 'AdminTest123');
      await page.click(SELECTORS.submitButton);
      
      // Wait for navigation or error
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
        page.waitForSelector(SELECTORS.errorMessage, { timeout: 5000 })
      ]).catch(() => {});

      // Check if login was successful
      const currentUrl = page.url();
      return currentUrl.includes('/dashboard') || 
             currentUrl.includes('/calendar') || 
             !currentUrl.includes('/login');
             
    } catch (error) {
      this.log(`Login failed: ${error.message}`, 'error');
      return false;
    }
  }

  async generateIntegrationReport() {
    const reportPath = path.join(this.outputDir, `integration-report-${Date.now()}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.success).length,
        failedTests: this.results.filter(r => !r.success).length,
        successRate: Math.round((this.results.filter(r => r.success).length / this.results.length) * 100)
      },
      testResults: this.results,
      apiEndpointsCovered: this.apiEndpoints.length,
      errors: this.results.reduce((all, result) => [...all, ...result.errors], [])
    };

    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.log(`Integration report saved: ${reportPath}`, 'success');
      
      // Generate summary
      await this.generateSummary(report);
      
    } catch (error) {
      this.log('Failed to generate integration report', 'error');
    }
  }

  async generateSummary(report) {
    const summary = `
# Integration Test Summary
**Date:** ${report.timestamp}

## Overall Results
- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passedTests}
- **Failed:** ${report.summary.failedTests}
- **Success Rate:** ${report.summary.successRate}%

## Test Results
${this.results.map(result => `
### ${result.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
- **Status:** ${result.success ? '✅ PASS' : '❌ FAIL'}
- **Duration:** ${result.duration}ms
- **Steps:** ${result.steps.filter(s => s.success).length}/${result.steps.length} passed
${result.errors.length > 0 ? `- **Errors:** ${result.errors.map(e => e.message).join(', ')}` : ''}
`).join('')}

## API Integration Status
- **Endpoints Tested:** ${this.apiEndpoints.length}
- **Backend Connectivity:** ${report.testResults.find(r => r.name === 'api_connectivity')?.success ? '✅ Working' : '❌ Issues'}
- **Authentication Flow:** ${report.testResults.find(r => r.name === 'authentication_flow')?.success ? '✅ Working' : '❌ Issues'}
- **Data Loading:** ${report.testResults.find(r => r.name === 'calendar_data_loading')?.success ? '✅ Working' : '❌ Issues'}

## Integration Health
${report.summary.successRate >= 80 ? 
  '✅ **HEALTHY** - Calendar system integrates well with backend' :
  report.summary.successRate >= 60 ?
  '⚠️ **NEEDS ATTENTION** - Some integration issues found' :
  '❌ **CRITICAL ISSUES** - Major integration problems detected'
}

## Recommendations
${this.generateIntegrationRecommendations(report)}
`;

    const summaryPath = path.join(this.outputDir, 'integration-summary.md');
    await fs.writeFile(summaryPath, summary);
    this.log(`Summary saved: ${summaryPath}`, 'success');
  }

  generateIntegrationRecommendations(report) {
    const recommendations = [];
    
    const failedTests = this.results.filter(r => !r.success);
    
    if (failedTests.some(t => t.name === 'api_connectivity')) {
      recommendations.push('🔌 **Fix API connectivity** - Backend endpoints are not responding properly');
    }
    
    if (failedTests.some(t => t.name === 'authentication_flow')) {
      recommendations.push('🔑 **Fix authentication** - Login/auth flow has issues');
    }
    
    if (failedTests.some(t => t.name === 'calendar_data_loading')) {
      recommendations.push('📅 **Fix data loading** - Calendar not loading appointment data correctly');
    }
    
    if (failedTests.some(t => t.name === 'error_handling')) {
      recommendations.push('⚠️ **Improve error handling** - Better error boundaries and user feedback needed');
    }
    
    if (report.errors.length > 0) {
      recommendations.push('🐛 **Address JavaScript errors** - Unhandled errors affecting functionality');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('🎉 **Integration is working well!** All tests passed successfully.');
    }
    
    return recommendations.join('\n');
  }

  async runFullIntegrationTest() {
    await this.init();
    
    this.log('🚀 Starting integration test suite...');
    
    try {
      await this.startBrowser();
      const page = await this.browser.newPage();
      
      // Run all integration tests
      for (const scenario of this.testScenarios) {
        this.log(`Testing: ${scenario.description}`);
        
        try {
          const result = await scenario.test(page);
          this.results.push(result);
          
          const status = result.success ? '✅' : '❌';
          this.log(`  ${status} ${scenario.description}`, result.success ? 'success' : 'error');
          
        } catch (error) {
          this.log(`  ❌ ${scenario.description} failed: ${error.message}`, 'error');
          
          const failedResult = new TestResult(scenario.name);
          failedResult.addError(error);
          failedResult.finish(false);
          this.results.push(failedResult);
        }
      }
      
      await page.close();
      
      // Generate report
      await this.generateIntegrationReport();
      
      // Print summary
      const totalTests = this.results.length;
      const passedTests = this.results.filter(r => r.success).length;
      const successRate = Math.round((passedTests / totalTests) * 100);
      
      this.log('\n📊 Integration Test Complete!');
      this.log(`Total tests: ${totalTests}`);
      this.log(`Passed: ${passedTests}`);
      this.log(`Failed: ${totalTests - passedTests}`);
      this.log(`Success rate: ${successRate}%`);
      
      if (successRate >= 80) {
        this.log('🎉 Integration tests passed!', 'success');
        return 0;
      } else {
        this.log('⚠️ Some integration issues found. Check the reports.', 'warning');
        return 1;
      }
      
    } catch (error) {
      this.log(`Integration test failed: ${error.message}`, 'error');
      return 1;
    } finally {
      await this.closeBrowser();
    }
  }
}

// Run the integration test if called directly
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runFullIntegrationTest().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Integration test suite failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTester;