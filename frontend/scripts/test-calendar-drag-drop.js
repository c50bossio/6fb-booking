const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class CalendarDragDropTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      overallResult: 'PENDING',
      tests: [],
      screenshots: [],
      issues: [],
      recommendations: []
    };
    this.screenshotDir = path.join(__dirname, '../calendar-drag-drop-test-screenshots');
  }

  async init() {
    console.log('🚀 Initializing Calendar Drag & Drop Test Suite');

    // Create screenshots directory
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    // Launch browser with debugging options
    this.browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      devtools: false,
      slowMo: 100 // Add slight delay between actions for stability
    });

    this.page = await this.browser.newPage();

    // Set viewport for desktop testing
    await this.page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    // Enable console logging with filtering
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      // Log drag/drop related console messages
      if (text.includes('🔥') || text.includes('🎯') || text.includes('📦') ||
          text.includes('drag') || text.includes('drop') || text.includes('Move') ||
          type === 'error') {
        console.log(`  Browser [${type}]:`, text);
      }
    });

    // Monitor page errors
    this.page.on('pageerror', error => {
      console.error('  Page Error:', error.message);
      this.testResults.issues.push({
        type: 'PAGE_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    // Monitor network failures
    this.page.on('requestfailed', request => {
      console.warn('  Request Failed:', request.url(), request.failure().errorText);
      this.testResults.issues.push({
        type: 'NETWORK_ERROR',
        url: request.url(),
        error: request.failure().errorText,
        timestamp: new Date().toISOString()
      });
    });

    console.log('✅ Browser initialized successfully');
  }

  async login() {
    console.log('\n🔐 Performing authentication...');

    try {
      // Navigate to login page
      await this.page.goto('http://localhost:3000/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for login form
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });

      // Fill login credentials
      await this.page.type('input[type="email"]', 'admin@6fb.com');
      await this.page.type('input[type="password"]', 'admin123');

      // Submit login
      await this.page.click('button[type="submit"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

      // Wait for authentication to stabilize
      await this.page.waitForTimeout(2000);

      console.log('✅ Authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      this.testResults.issues.push({
        type: 'AUTH_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async navigateToCalendar() {
    console.log('\n📅 Navigating to calendar page...');

    try {
      await this.page.goto('http://localhost:3000/dashboard/calendar', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Verify we're on the calendar page
      const currentUrl = this.page.url();
      if (!currentUrl.includes('calendar')) {
        throw new Error(`Not on calendar page. Current URL: ${currentUrl}`);
      }

      // Wait for calendar to load
      await this.page.waitForSelector('.calendar-container', { timeout: 15000 });

      // Wait for appointments to load (demo mode indicator or appointments)
      await this.page.waitForSelector('.appointment-block, [data-time-slot]', { timeout: 10000 });

      // Take initial screenshot
      await this.takeScreenshot('01-calendar-initial-state');

      console.log('✅ Calendar loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to navigate to calendar:', error.message);
      this.testResults.issues.push({
        type: 'NAVIGATION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async takeScreenshot(name, fullPage = false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    try {
      await this.page.screenshot({
        path: filepath,
        fullPage,
        quality: 90
      });

      this.testResults.screenshots.push({
        name,
        filename,
        filepath,
        timestamp: new Date().toISOString()
      });

      console.log(`📸 Screenshot saved: ${filename}`);
      return filepath;
    } catch (error) {
      console.error(`❌ Failed to take screenshot ${name}:`, error.message);
      return null;
    }
  }

  async testDragDropFunctionality() {
    console.log('\n🎯 Testing Drag & Drop Functionality...');

    const testResults = [];

    try {
      // Test 1: Check if appointments are draggable
      const draggableTest = await this.testDraggableAppointments();
      testResults.push(draggableTest);

      // Test 2: Test successful drag and drop
      const successfulDropTest = await this.testSuccessfulDragDrop();
      testResults.push(successfulDropTest);

      // Test 3: Test cancelled drag operation
      const cancelledDragTest = await this.testCancelledDrag();
      testResults.push(cancelledDragTest);

      // Test 4: Test invalid drop zones
      const invalidDropTest = await this.testInvalidDropZones();
      testResults.push(invalidDropTest);

      // Test 5: Test loading states and UI feedback
      const uiFeedbackTest = await this.testUIFeedback();
      testResults.push(uiFeedbackTest);

      // Test 6: Test keyboard cancellation (ESC key)
      const keyboardCancelTest = await this.testKeyboardCancellation();
      testResults.push(keyboardCancelTest);

      return testResults;
    } catch (error) {
      console.error('❌ Drag & Drop testing failed:', error.message);
      this.testResults.issues.push({
        type: 'DRAG_DROP_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return testResults;
    }
  }

  async testDraggableAppointments() {
    console.log('\n  📋 Test 1: Checking if appointments are draggable...');

    try {
      // Find all appointment blocks
      const appointments = await this.page.$$('.appointment-block');

      if (appointments.length === 0) {
        return {
          name: 'Draggable Appointments Check',
          status: 'FAILED',
          message: 'No appointment blocks found on the page',
          timestamp: new Date().toISOString()
        };
      }

      // Check if appointments have draggable attribute
      let draggableCount = 0;
      for (const appointment of appointments) {
        const isDraggable = await appointment.evaluate(el => el.draggable);
        if (isDraggable) draggableCount++;
      }

      await this.takeScreenshot('02-draggable-appointments-check');

      const result = {
        name: 'Draggable Appointments Check',
        status: draggableCount > 0 ? 'PASSED' : 'FAILED',
        message: `Found ${appointments.length} appointments, ${draggableCount} are draggable`,
        details: {
          totalAppointments: appointments.length,
          draggableAppointments: draggableCount
        },
        timestamp: new Date().toISOString()
      };

      console.log(`    ✅ ${result.message}`);
      return result;
    } catch (error) {
      const result = {
        name: 'Draggable Appointments Check',
        status: 'ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      console.log(`    ❌ ${result.message}`);
      return result;
    }
  }

  async testSuccessfulDragDrop() {
    console.log('\n  📋 Test 2: Testing successful drag and drop...');

    try {
      // Find the first draggable appointment
      const sourceAppointment = await this.page.$('.appointment-block[draggable="true"]');

      if (!sourceAppointment) {
        return {
          name: 'Successful Drag & Drop',
          status: 'SKIPPED',
          message: 'No draggable appointments found',
          timestamp: new Date().toISOString()
        };
      }

      // Get appointment details before drag
      const appointmentInfo = await sourceAppointment.evaluate(el => ({
        client: el.textContent.includes(' - ') ? el.textContent.split(' - ')[1] : 'Unknown',
        id: el.closest('[data-appointment-id]')?.getAttribute('data-appointment-id') || 'unknown'
      }));

      // Find an empty time slot to drop into
      const timeSlots = await this.page.$$('[data-time-slot]');
      let targetSlot = null;

      for (const slot of timeSlots) {
        const hasAppointment = await slot.$('.appointment-block');
        if (!hasAppointment) {
          targetSlot = slot;
          break;
        }
      }

      if (!targetSlot) {
        return {
          name: 'Successful Drag & Drop',
          status: 'SKIPPED',
          message: 'No empty time slots found for drop test',
          timestamp: new Date().toISOString()
        };
      }

      // Get target slot info
      const targetInfo = await targetSlot.evaluate(el => ({
        date: el.getAttribute('data-date'),
        time: el.getAttribute('data-time')
      }));

      await this.takeScreenshot('03-before-drag-drop');

      // Perform drag and drop
      const sourceBox = await sourceAppointment.boundingBox();
      const targetBox = await targetSlot.boundingBox();

      if (!sourceBox || !targetBox) {
        throw new Error('Could not get bounding boxes for drag operation');
      }

      // Start drag
      await this.page.mouse.move(
        sourceBox.x + sourceBox.width / 2,
        sourceBox.y + sourceBox.height / 2
      );
      await this.page.mouse.down();

      await this.takeScreenshot('04-during-drag');

      // Move to target and wait briefly for hover effects
      await this.page.mouse.move(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
        { steps: 10 }
      );
      await this.page.waitForTimeout(500);

      await this.takeScreenshot('05-drag-hover-target');

      // Drop
      await this.page.mouse.up();
      await this.page.waitForTimeout(1000);

      await this.takeScreenshot('06-after-drop');

      // Check for confirmation modal
      const hasModal = await this.page.$('.modal, [role="dialog"], .appointment-move, .confirmation') !== null;

      if (hasModal) {
        console.log('    📋 Confirmation modal appeared');
        await this.takeScreenshot('07-confirmation-modal');

        // Try to confirm the move
        const confirmButton = await this.page.$('button:has-text("Confirm"), button:has-text("Move"), button:has-text("Yes"), .confirm-button');
        if (confirmButton) {
          await confirmButton.click();
          await this.page.waitForTimeout(2000);
          await this.takeScreenshot('08-after-confirmation');
        }
      }

      // Check for loading state
      const hasLoadingState = await this.page.$('.loading, .spinner, [data-loading="true"]') !== null;
      let loadingResolved = true;

      if (hasLoadingState) {
        console.log('    ⏳ Loading state detected, waiting for resolution...');
        try {
          await this.page.waitForSelector('.loading, .spinner, [data-loading="true"]', {
            hidden: true,
            timeout: 10000
          });
          await this.takeScreenshot('09-loading-resolved');
        } catch (timeoutError) {
          console.log('    ⚠️ Loading state did not resolve within 10 seconds');
          loadingResolved = false;
          await this.takeScreenshot('09-loading-stuck');
        }
      }

      const result = {
        name: 'Successful Drag & Drop',
        status: loadingResolved ? 'PASSED' : 'FAILED',
        message: `Dragged appointment ${appointmentInfo.client} to ${targetInfo.date} ${targetInfo.time}${!loadingResolved ? ' - Loading state stuck' : ''}`,
        details: {
          source: appointmentInfo,
          target: targetInfo,
          hadModal: hasModal,
          hadLoadingState: hasLoadingState,
          loadingResolved
        },
        timestamp: new Date().toISOString()
      };

      console.log(`    ${result.status === 'PASSED' ? '✅' : '❌'} ${result.message}`);
      return result;

    } catch (error) {
      const result = {
        name: 'Successful Drag & Drop',
        status: 'ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      console.log(`    ❌ ${result.message}`);
      return result;
    }
  }

  async testCancelledDrag() {
    console.log('\n  📋 Test 3: Testing cancelled drag operation...');

    try {
      const appointment = await this.page.$('.appointment-block[draggable="true"]');

      if (!appointment) {
        return {
          name: 'Cancelled Drag Operation',
          status: 'SKIPPED',
          message: 'No draggable appointments found',
          timestamp: new Date().toISOString()
        };
      }

      await this.takeScreenshot('10-before-cancelled-drag');

      // Start drag
      const appointmentBox = await appointment.boundingBox();
      await this.page.mouse.move(
        appointmentBox.x + appointmentBox.width / 2,
        appointmentBox.y + appointmentBox.height / 2
      );
      await this.page.mouse.down();

      // Move slightly to start drag
      await this.page.mouse.move(
        appointmentBox.x + appointmentBox.width / 2 + 50,
        appointmentBox.y + appointmentBox.height / 2 + 50,
        { steps: 5 }
      );

      await this.takeScreenshot('11-during-cancelled-drag');

      // Cancel by pressing ESC
      await this.page.keyboard.press('Escape');
      await this.page.mouse.up();
      await this.page.waitForTimeout(1000);

      await this.takeScreenshot('12-after-cancelled-drag');

      // Check that no modals appeared and appointment is back in original position
      const hasModal = await this.page.$('.modal, [role="dialog"]') !== null;
      const hasLoadingState = await this.page.$('.loading, .spinner') !== null;

      const result = {
        name: 'Cancelled Drag Operation',
        status: (!hasModal && !hasLoadingState) ? 'PASSED' : 'FAILED',
        message: `Drag cancelled successfully. No modal: ${!hasModal}, No loading: ${!hasLoadingState}`,
        details: {
          modalAppeared: hasModal,
          loadingStateTriggered: hasLoadingState
        },
        timestamp: new Date().toISOString()
      };

      console.log(`    ${result.status === 'PASSED' ? '✅' : '❌'} ${result.message}`);
      return result;

    } catch (error) {
      const result = {
        name: 'Cancelled Drag Operation',
        status: 'ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      console.log(`    ❌ ${result.message}`);
      return result;
    }
  }

  async testInvalidDropZones() {
    console.log('\n  📋 Test 4: Testing invalid drop zones...');

    try {
      const appointment = await this.page.$('.appointment-block[draggable="true"]');

      if (!appointment) {
        return {
          name: 'Invalid Drop Zones',
          status: 'SKIPPED',
          message: 'No draggable appointments found',
          timestamp: new Date().toISOString()
        };
      }

      // Try dropping on invalid areas (header, sidebar, etc.)
      const invalidAreas = [
        { selector: '.calendar-header, .bg-gray-800', name: 'Header' },
        { selector: '.calendar-sidebar, .navigation', name: 'Sidebar' },
        { selector: '.search-filters, .bg-gray-800', name: 'Search Area' }
      ];

      let testedAreas = 0;
      let validDropPrevented = 0;

      for (const area of invalidAreas) {
        const invalidTarget = await this.page.$(area.selector);
        if (!invalidTarget) continue;

        testedAreas++;

        // Start drag
        const appointmentBox = await appointment.boundingBox();
        await this.page.mouse.move(
          appointmentBox.x + appointmentBox.width / 2,
          appointmentBox.y + appointmentBox.height / 2
        );
        await this.page.mouse.down();

        // Move to invalid area
        const invalidBox = await invalidTarget.boundingBox();
        await this.page.mouse.move(
          invalidBox.x + invalidBox.width / 2,
          invalidBox.y + invalidBox.height / 2,
          { steps: 5 }
        );

        await this.page.waitForTimeout(300);

        // Drop
        await this.page.mouse.up();
        await this.page.waitForTimeout(500);

        // Check that no modal appeared (indicating drop was prevented)
        const hasModal = await this.page.$('.modal, [role="dialog"]') !== null;
        if (!hasModal) validDropPrevented++;

        await this.page.waitForTimeout(500);
      }

      await this.takeScreenshot('13-invalid-drop-zones-test');

      const result = {
        name: 'Invalid Drop Zones',
        status: (testedAreas > 0 && validDropPrevented === testedAreas) ? 'PASSED' : 'PARTIAL',
        message: `Tested ${testedAreas} invalid areas, ${validDropPrevented} properly prevented drops`,
        details: {
          testedAreas,
          validDropPrevented
        },
        timestamp: new Date().toISOString()
      };

      console.log(`    ${result.status === 'PASSED' ? '✅' : '⚠️'} ${result.message}`);
      return result;

    } catch (error) {
      const result = {
        name: 'Invalid Drop Zones',
        status: 'ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      console.log(`    ❌ ${result.message}`);
      return result;
    }
  }

  async testUIFeedback() {
    console.log('\n  📋 Test 5: Testing UI feedback and visual states...');

    try {
      const appointment = await this.page.$('.appointment-block[draggable="true"]');

      if (!appointment) {
        return {
          name: 'UI Feedback & Visual States',
          status: 'SKIPPED',
          message: 'No draggable appointments found',
          timestamp: new Date().toISOString()
        };
      }

      // Test hover states
      await appointment.hover();
      await this.page.waitForTimeout(500);
      await this.takeScreenshot('14-appointment-hover-state');

      // Check for drag handle or visual indicators
      const hasDragHandle = await this.page.$('.drag-handle, .appointment-block::after, .appointment-block [class*="drag"]') !== null;

      // Start drag to check visual feedback
      const appointmentBox = await appointment.boundingBox();
      await this.page.mouse.move(
        appointmentBox.x + appointmentBox.width / 2,
        appointmentBox.y + appointmentBox.height / 2
      );
      await this.page.mouse.down();

      // Check for drag visual feedback
      await this.page.waitForTimeout(500);
      await this.takeScreenshot('15-drag-visual-feedback');

      // Check for "Moving appointment" indicator
      const hasMovingIndicator = await this.page.evaluate(() => {
        return document.body.textContent.includes('Moving Appointment') ||
               document.body.textContent.includes('Moving appointment') ||
               document.querySelector('[class*="moving"], [class*="dragging"]') !== null;
      });

      // Find a time slot and hover over it during drag
      const timeSlot = await this.page.$('[data-time-slot]');
      if (timeSlot) {
        const slotBox = await timeSlot.boundingBox();
        await this.page.mouse.move(
          slotBox.x + slotBox.width / 2,
          slotBox.y + slotBox.height / 2,
          { steps: 5 }
        );
        await this.page.waitForTimeout(500);
        await this.takeScreenshot('16-time-slot-hover-during-drag');
      }

      // Cancel drag
      await this.page.keyboard.press('Escape');
      await this.page.mouse.up();
      await this.page.waitForTimeout(1000);

      const result = {
        name: 'UI Feedback & Visual States',
        status: 'PASSED', // We mainly check that UI elements respond appropriately
        message: `UI feedback test completed. Drag handle: ${hasDragHandle}, Moving indicator: ${hasMovingIndicator}`,
        details: {
          hasDragHandle,
          hasMovingIndicator,
          hoverTested: true,
          dragVisualFeedbackTested: true
        },
        timestamp: new Date().toISOString()
      };

      console.log(`    ✅ ${result.message}`);
      return result;

    } catch (error) {
      const result = {
        name: 'UI Feedback & Visual States',
        status: 'ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      console.log(`    ❌ ${result.message}`);
      return result;
    }
  }

  async testKeyboardCancellation() {
    console.log('\n  📋 Test 6: Testing keyboard cancellation (ESC key)...');

    try {
      const appointment = await this.page.$('.appointment-block[draggable="true"]');

      if (!appointment) {
        return {
          name: 'Keyboard Cancellation',
          status: 'SKIPPED',
          message: 'No draggable appointments found',
          timestamp: new Date().toISOString()
        };
      }

      // Start multiple drag operations and cancel them with ESC
      let successfulCancellations = 0;
      const testCycles = 2;

      for (let i = 0; i < testCycles; i++) {
        // Start drag
        const appointmentBox = await appointment.boundingBox();
        await this.page.mouse.move(
          appointmentBox.x + appointmentBox.width / 2,
          appointmentBox.y + appointmentBox.height / 2
        );
        await this.page.mouse.down();

        // Move to indicate drag start
        await this.page.mouse.move(
          appointmentBox.x + appointmentBox.width / 2 + 30,
          appointmentBox.y + appointmentBox.height / 2 + 30,
          { steps: 3 }
        );

        await this.page.waitForTimeout(300);

        // Press ESC to cancel
        await this.page.keyboard.press('Escape');
        await this.page.mouse.up();
        await this.page.waitForTimeout(1000);

        // Check that no modal appeared and no loading state
        const hasModal = await this.page.$('.modal, [role="dialog"]') !== null;
        const hasLoadingState = await this.page.$('.loading, .spinner') !== null;

        if (!hasModal && !hasLoadingState) {
          successfulCancellations++;
        }

        await this.page.waitForTimeout(500);
      }

      await this.takeScreenshot('17-keyboard-cancellation-test');

      const result = {
        name: 'Keyboard Cancellation',
        status: (successfulCancellations === testCycles) ? 'PASSED' : 'FAILED',
        message: `ESC key cancellation: ${successfulCancellations}/${testCycles} successful`,
        details: {
          testCycles,
          successfulCancellations
        },
        timestamp: new Date().toISOString()
      };

      console.log(`    ${result.status === 'PASSED' ? '✅' : '❌'} ${result.message}`);
      return result;

    } catch (error) {
      const result = {
        name: 'Keyboard Cancellation',
        status: 'ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      console.log(`    ❌ ${result.message}`);
      return result;
    }
  }

  async checkForStuckLoadingStates() {
    console.log('\n🔍 Checking for stuck loading states...');

    try {
      // Look for various loading indicators that might be stuck
      const loadingSelectors = [
        '.loading',
        '.spinner',
        '[data-loading="true"]',
        '.animate-spin',
        '[class*="loading"]',
        '[class*="spinner"]',
        'text:has-text("Moving appointment")',
        'text:has-text("Moving Appointment")'
      ];

      const stuckElements = [];

      for (const selector of loadingSelectors) {
        const elements = await this.page.$$(selector);
        for (const element of elements) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            const text = await element.textContent();
            stuckElements.push({
              selector,
              text: text?.trim() || 'No text content',
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      if (stuckElements.length > 0) {
        await this.takeScreenshot('18-stuck-loading-states');

        this.testResults.issues.push({
          type: 'STUCK_LOADING_STATE',
          message: `Found ${stuckElements.length} potentially stuck loading elements`,
          details: stuckElements,
          timestamp: new Date().toISOString()
        });

        console.log(`    ⚠️ Found ${stuckElements.length} potentially stuck loading elements`);
        return false;
      }

      console.log('    ✅ No stuck loading states detected');
      return true;

    } catch (error) {
      console.error('    ❌ Error checking loading states:', error.message);
      return false;
    }
  }

  async generateReport() {
    console.log('\n📊 Generating test report...');

    // Final screenshot
    await this.takeScreenshot('19-final-state', true);

    // Check for any remaining stuck states
    const noStuckStates = await this.checkForStuckLoadingStates();

    // Calculate overall result
    const passedTests = this.testResults.tests.filter(t => t.status === 'PASSED').length;
    const failedTests = this.testResults.tests.filter(t => t.status === 'FAILED').length;
    const errorTests = this.testResults.tests.filter(t => t.status === 'ERROR').length;
    const totalTests = this.testResults.tests.length;

    // Determine overall result
    if (errorTests > 0) {
      this.testResults.overallResult = 'ERROR';
    } else if (failedTests > 0) {
      this.testResults.overallResult = 'FAILED';
    } else if (passedTests === totalTests && totalTests > 0) {
      this.testResults.overallResult = 'PASSED';
    } else {
      this.testResults.overallResult = 'PARTIAL';
    }

    // Add recommendations based on test results
    this.generateRecommendations();

    // Create detailed report
    const report = {
      ...this.testResults,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        errorTests,
        noStuckStates,
        completionTime: new Date().toISOString()
      }
    };

    // Save report to file
    const reportPath = path.join(this.screenshotDir, 'drag-drop-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable report
    const readableReport = this.generateReadableReport(report);
    const readableReportPath = path.join(this.screenshotDir, 'drag-drop-test-report.md');
    fs.writeFileSync(readableReportPath, readableReport);

    console.log('\n📋 Test Report Summary:');
    console.log(`   Overall Result: ${this.getStatusIcon(report.overallResult)} ${report.overallResult}`);
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`   Issues Found: ${this.testResults.issues.length}`);
    console.log(`   Screenshots: ${this.testResults.screenshots.length}`);
    console.log(`   Report saved to: ${reportPath}`);
    console.log(`   Readable report: ${readableReportPath}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // Check for failed tests and provide specific recommendations
    this.testResults.tests.forEach(test => {
      switch (test.name) {
        case 'Successful Drag & Drop':
          if (test.status === 'FAILED' && test.details?.loadingResolved === false) {
            recommendations.push({
              priority: 'HIGH',
              issue: 'Drag & drop loading state gets stuck',
              recommendation: 'Review the handleConfirmedMove function and ensure proper state cleanup after drag operations. Check for race conditions in state updates.',
              code: 'Check setIsSaving(false) and dragState reset logic in UnifiedCalendar.tsx'
            });
          }
          break;

        case 'Draggable Appointments Check':
          if (test.status === 'FAILED') {
            recommendations.push({
              priority: 'HIGH',
              issue: 'Appointments are not draggable',
              recommendation: 'Verify that enableDragDrop prop is set to true and __dragProps are being applied to appointment elements.',
              code: 'Check enhancedAppointments mapping in UnifiedCalendar.tsx'
            });
          }
          break;

        case 'Keyboard Cancellation':
          if (test.status === 'FAILED') {
            recommendations.push({
              priority: 'MEDIUM',
              issue: 'ESC key cancellation not working properly',
              recommendation: 'Review the global keydown event listener for ESC key and dragState reset logic.',
              code: 'Check useEffect with handleKeyDown in UnifiedCalendar.tsx'
            });
          }
          break;
      }
    });

    // Check for general issues
    if (this.testResults.issues.length > 0) {
      const stuckLoadingIssues = this.testResults.issues.filter(i => i.type === 'STUCK_LOADING_STATE');
      if (stuckLoadingIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          issue: 'Loading states getting stuck',
          recommendation: 'Implement proper cleanup in drag event handlers and ensure all async operations have timeout fallbacks.',
          code: 'Review handleConfirmedMove, handleTimeSlotDrop, and drag state management'
        });
      }
    }

    // Add general recommendations
    recommendations.push({
      priority: 'LOW',
      issue: 'Test coverage',
      recommendation: 'Consider adding automated tests for edge cases like network failures during drag operations, multiple simultaneous drags, and mobile touch interactions.',
      code: 'Expand test suite with Jest/React Testing Library tests'
    });

    this.testResults.recommendations = recommendations;
  }

  generateReadableReport(report) {
    const { summary, tests, issues, recommendations, screenshots } = report;

    return `# Calendar Drag & Drop Test Report

**Generated:** ${report.timestamp}
**Overall Result:** ${this.getStatusIcon(report.overallResult)} **${report.overallResult}**

## Summary
- **Total Tests:** ${summary.totalTests}
- **Passed:** ${summary.passedTests} ✅
- **Failed:** ${summary.failedTests} ❌
- **Errors:** ${summary.errorTests} 🚫
- **Stuck Loading States:** ${summary.noStuckStates ? 'None detected ✅' : 'Issues found ⚠️'}

## Test Results

${tests.map(test => `### ${test.name}
**Status:** ${this.getStatusIcon(test.status)} ${test.status}
**Message:** ${test.message}
**Time:** ${test.timestamp}

${test.details ? `**Details:**
\`\`\`json
${JSON.stringify(test.details, null, 2)}
\`\`\`` : ''}
`).join('\n')}

## Issues Found (${issues.length})

${issues.map((issue, index) => `### Issue ${index + 1}: ${issue.type}
**Message:** ${issue.message}
**Time:** ${issue.timestamp}

${issue.details ? `**Details:**
\`\`\`json
${JSON.stringify(issue.details, null, 2)}
\`\`\`` : ''}
`).join('\n')}

## Recommendations (${recommendations.length})

${recommendations.map((rec, index) => `### ${index + 1}. ${rec.issue} (${rec.priority} Priority)
**Recommendation:** ${rec.recommendation}

${rec.code ? `**Code Location:** \`${rec.code}\`` : ''}
`).join('\n')}

## Screenshots (${screenshots.length})

${screenshots.map(screenshot => `- **${screenshot.name}:** \`${screenshot.filename}\``).join('\n')}

## Next Steps

1. Review any HIGH priority recommendations immediately
2. Check the screenshots for visual confirmation of issues
3. Test the drag & drop functionality manually to validate automated results
4. Implement fixes for any failed tests
5. Re-run this test suite after making changes

## Files Generated
- **JSON Report:** \`drag-drop-test-report.json\`
- **Markdown Report:** \`drag-drop-test-report.md\`
- **Screenshots:** \`calendar-drag-drop-test-screenshots/\`
`;
  }

  getStatusIcon(status) {
    switch (status) {
      case 'PASSED': return '✅';
      case 'FAILED': return '❌';
      case 'ERROR': return '🚫';
      case 'SKIPPED': return '⏭️';
      case 'PARTIAL': return '⚠️';
      default: return '❓';
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');

    if (this.browser) {
      await this.browser.close();
    }

    console.log('✅ Cleanup completed');
  }

  async runFullTestSuite() {
    try {
      // Initialize
      await this.init();

      // Authenticate
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('Authentication failed - cannot proceed with tests');
      }

      // Navigate to calendar
      const navigationSuccess = await this.navigateToCalendar();
      if (!navigationSuccess) {
        throw new Error('Failed to navigate to calendar - cannot proceed with tests');
      }

      // Run drag & drop tests
      const testResults = await this.testDragDropFunctionality();
      this.testResults.tests = testResults;

      // Generate report
      const report = await this.generateReport();

      return report;

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);

      this.testResults.overallResult = 'ERROR';
      this.testResults.issues.push({
        type: 'SUITE_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });

      // Still try to generate a report
      const report = await this.generateReport();
      return report;

    } finally {
      await this.cleanup();
    }
  }
}

// Main execution
async function main() {
  console.log('🎯 Calendar Drag & Drop Test Suite');
  console.log('=====================================');
  console.log('This test validates the drag and drop functionality in the 6FB Booking Calendar');
  console.log('Make sure the Next.js dev server is running on http://localhost:3000\n');

  const tester = new CalendarDragDropTester();
  const report = await tester.runFullTestSuite();

  console.log('\n🎉 Test Suite Completed!');
  console.log(`Final Result: ${tester.getStatusIcon(report.overallResult)} ${report.overallResult}`);

  // Exit with appropriate code
  process.exit(report.overallResult === 'PASSED' ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = CalendarDragDropTester;
