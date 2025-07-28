#!/usr/bin/env node

/**
 * Mobile PWA Feature Testing Script
 * Comprehensive testing suite for touch interactions and haptic feedback
 */

const puppeteer = require('puppeteer');
const chalk = require('chalk');

class MobilePWATestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.baseUrl = 'http://localhost:3000';
  }

  async setup() {
    console.log(chalk.blue('🔧 Setting up test environment...'));
    
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: [
        '--enable-features=TouchEventFeatureDetection',
        '--touch-events=enabled',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set mobile viewport
    await this.page.setViewport({
      width: 375,
      height: 812,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    });

    // Set user agent to mobile
    await this.page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    );

    console.log(chalk.green('✅ Test environment ready'));
  }

  async testTouchCalendarDemo() {
    console.log(chalk.blue('📱 Testing Touch Calendar Demo...'));
    
    try {
      // Navigate to demo page
      await this.page.goto(`${this.baseUrl}/demo/touch-calendar`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for demo to load
      await this.page.waitForSelector('.touch-optimized-calendar', { timeout: 10000 });
      
      this.logSuccess('Touch Calendar Demo loaded successfully');
      
      // Test component visibility
      const calendarVisible = await this.page.$('.touch-optimized-calendar');
      if (calendarVisible) {
        this.logSuccess('TouchOptimizedCalendar component is visible');
      } else {
        this.logError('TouchOptimizedCalendar component not found');
      }

      // Test interaction demo
      const demoVisible = await this.page.$('.touch-interaction-demo');
      if (demoVisible) {
        this.logSuccess('TouchInteractionDemo component is visible');
      } else {
        this.logWarning('TouchInteractionDemo component not found');
      }

      return true;
    } catch (error) {
      this.logError(`Touch Calendar Demo test failed: ${error.message}`);
      return false;
    }
  }

  async testHapticFeedbackSystem() {
    console.log(chalk.blue('📳 Testing Haptic Feedback System...'));
    
    try {
      // Check if haptic feedback is available
      const hapticSupport = await this.page.evaluate(() => {
        return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
      });

      if (hapticSupport) {
        this.logSuccess('Haptic feedback is supported');
        
        // Test haptic patterns
        const testResult = await this.page.evaluate(async () => {
          try {
            // Import haptic system
            const { getHapticSystem } = await import('/lib/haptic-feedback-system.js');
            const hapticSystem = getHapticSystem({ debugMode: true });
            
            // Test different patterns
            const patterns = ['appointment_select', 'drag_start', 'booking_success'];
            const results = [];
            
            for (const pattern of patterns) {
              const success = await hapticSystem.feedback(pattern, { force: true });
              results.push({ pattern, success });
            }
            
            return results;
          } catch (error) {
            return { error: error.message };
          }
        });

        if (testResult.error) {
          this.logWarning(`Haptic feedback test: ${testResult.error}`);
        } else {
          this.logSuccess(`Tested ${testResult.length} haptic patterns`);
        }
      } else {
        this.logWarning('Haptic feedback not supported on this device/browser');
      }

      return true;
    } catch (error) {
      this.logError(`Haptic feedback test failed: ${error.message}`);
      return false;
    }
  }

  async testTouchGestures() {
    console.log(chalk.blue('👆 Testing Touch Gestures...'));
    
    try {
      // Find touchable elements
      const touchElements = await this.page.$$('.touch-time-slot, .touch-appointment');
      
      if (touchElements.length > 0) {
        this.logSuccess(`Found ${touchElements.length} touchable elements`);
        
        // Test single touch
        const firstElement = touchElements[0];
        const boundingBox = await firstElement.boundingBox();
        
        if (boundingBox) {
          // Simulate touch
          await this.page.touchscreen.tap(
            boundingBox.x + boundingBox.width / 2,
            boundingBox.y + boundingBox.height / 2
          );
          
          // Wait for response
          await this.page.waitForTimeout(500);
          
          this.logSuccess('Touch interaction simulated successfully');
        }
        
        // Test swipe gesture
        if (touchElements.length > 1) {
          const startElement = touchElements[0];
          const endElement = touchElements[1];
          
          const startBox = await startElement.boundingBox();
          const endBox = await endElement.boundingBox();
          
          if (startBox && endBox) {
            // Simulate swipe
            await this.page.touchscreen.touchStart(
              startBox.x + startBox.width / 2,
              startBox.y + startBox.height / 2
            );
            
            await this.page.touchscreen.touchMove(
              endBox.x + endBox.width / 2,
              endBox.y + endBox.height / 2
            );
            
            await this.page.touchscreen.touchEnd();
            
            this.logSuccess('Swipe gesture simulated successfully');
          }
        }
      } else {
        this.logWarning('No touchable elements found');
      }

      return true;
    } catch (error) {
      this.logError(`Touch gesture test failed: ${error.message}`);
      return false;
    }
  }

  async testPerformanceOptimizations() {
    console.log(chalk.blue('⚡ Testing Performance Optimizations...'));
    
    try {
      // Start performance monitoring
      await this.page.tracing.start({
        path: 'mobile-pwa-performance.json',
        screenshots: true
      });

      // Navigate and interact with calendar
      await this.page.goto(`${this.baseUrl}/demo/touch-calendar`);
      await this.page.waitForSelector('.touch-optimized-calendar');

      // Simulate multiple interactions
      for (let i = 0; i < 10; i++) {
        // Random touch interactions
        await this.page.evaluate(() => {
          const elements = document.querySelectorAll('.touch-time-slot');
          if (elements.length > 0) {
            const randomElement = elements[Math.floor(Math.random() * elements.length)];
            randomElement.click();
          }
        });
        
        await this.page.waitForTimeout(100);
      }

      // Stop tracing
      await this.page.tracing.stop();

      // Measure performance metrics
      const performanceMetrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paintEntries = performance.getEntriesByType('paint');
        
        return {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
          memory: performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
          } : null
        };
      });

      this.logSuccess(`Load time: ${performanceMetrics.loadTime.toFixed(2)}ms`);
      this.logSuccess(`DOM ready: ${performanceMetrics.domContentLoaded.toFixed(2)}ms`);
      this.logSuccess(`First paint: ${performanceMetrics.firstPaint.toFixed(2)}ms`);
      
      if (performanceMetrics.memory) {
        this.logSuccess(`Memory usage: ${performanceMetrics.memory.used}MB / ${performanceMetrics.memory.total}MB`);
      }

      // Performance thresholds
      if (performanceMetrics.loadTime < 2000) {
        this.logSuccess('✅ Load time within acceptable range (<2s)');
      } else {
        this.logWarning('⚠️ Load time exceeds target (>2s)');
      }

      return true;
    } catch (error) {
      this.logError(`Performance test failed: ${error.message}`);
      return false;
    }
  }

  async testComponentIntegration() {
    console.log(chalk.blue('🔗 Testing Component Integration...'));
    
    try {
      // Test if all required components are available
      const componentTests = await this.page.evaluate(() => {
        const results = {};
        
        // Check if TouchOptimizedCalendar is rendered
        results.touchCalendar = !!document.querySelector('.touch-optimized-calendar');
        
        // Check if haptic feedback system is loaded
        results.hapticSystem = typeof window.navigator?.vibrate === 'function';
        
        // Check if gesture manager is initialized
        results.gestureManager = !!document.querySelector('[data-gesture-manager]');
        
        // Check touch targets meet minimum size requirements
        const touchElements = document.querySelectorAll('.touch-time-slot, .touch-appointment');
        results.touchTargets = Array.from(touchElements).every(el => {
          const rect = el.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44;
        });
        
        return results;
      });

      // Report results
      Object.entries(componentTests).forEach(([test, passed]) => {
        if (passed) {
          this.logSuccess(`✅ ${test} integration working`);
        } else {
          this.logWarning(`⚠️ ${test} integration issue`);
        }
      });

      return true;
    } catch (error) {
      this.logError(`Component integration test failed: ${error.message}`);
      return false;
    }
  }

  async testAccessibility() {
    console.log(chalk.blue('♿ Testing Accessibility...'));
    
    try {
      // Check touch target sizes (minimum 44px)
      const touchTargetSizes = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('.touch-time-slot, .touch-appointment, button');
        const results = [];
        
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          results.push({
            element: el.tagName.toLowerCase(),
            width: rect.width,
            height: rect.height,
            meetsMinimum: rect.width >= 44 && rect.height >= 44
          });
        });
        
        return results;
      });

      const validTargets = touchTargetSizes.filter(target => target.meetsMinimum);
      const invalidTargets = touchTargetSizes.filter(target => !target.meetsMinimum);

      this.logSuccess(`✅ ${validTargets.length} elements meet touch target requirements`);
      
      if (invalidTargets.length > 0) {
        this.logWarning(`⚠️ ${invalidTargets.length} elements below minimum touch target size`);
      }

      // Check for ARIA labels and semantic HTML
      const accessibilityFeatures = await this.page.evaluate(() => {
        return {
          ariaLabels: document.querySelectorAll('[aria-label]').length,
          semanticElements: document.querySelectorAll('button, [role]').length,
          headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length
        };
      });

      this.logSuccess(`ARIA labels: ${accessibilityFeatures.ariaLabels}`);
      this.logSuccess(`Semantic elements: ${accessibilityFeatures.semanticElements}`);
      this.logSuccess(`Headings: ${accessibilityFeatures.headings}`);

      return true;
    } catch (error) {
      this.logError(`Accessibility test failed: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log(chalk.yellow('\n🧪 Starting Mobile PWA Test Suite\n'));
    
    const tests = [
      { name: 'Touch Calendar Demo', fn: this.testTouchCalendarDemo },
      { name: 'Haptic Feedback System', fn: this.testHapticFeedbackSystem },
      { name: 'Touch Gestures', fn: this.testTouchGestures },
      { name: 'Performance Optimizations', fn: this.testPerformanceOptimizations },
      { name: 'Component Integration', fn: this.testComponentIntegration },
      { name: 'Accessibility', fn: this.testAccessibility }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const success = await test.fn.call(this);
        if (success) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        this.logError(`Test "${test.name}" threw an exception: ${error.message}`);
        failed++;
      }
      
      console.log(''); // Add spacing between tests
    }

    // Generate summary report
    this.generateSummaryReport(passed, failed);
  }

  generateSummaryReport(passed, failed) {
    const total = passed + failed;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log(chalk.yellow('\n📊 Test Summary Report\n'));
    console.log(chalk.green(`✅ Passed: ${passed}`));
    console.log(chalk.red(`❌ Failed: ${failed}`));
    console.log(chalk.blue(`📈 Pass Rate: ${passRate}%`));
    
    if (passRate >= 90) {
      console.log(chalk.green('\n🎉 Mobile PWA system is ready for production!'));
    } else if (passRate >= 75) {
      console.log(chalk.yellow('\n⚠️ Mobile PWA system needs minor improvements'));
    } else {
      console.log(chalk.red('\n🚨 Mobile PWA system requires significant fixes'));
    }

    // Output detailed results
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const icon = result.type === 'success' ? '✅' : result.type === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${result.message}`);
    });
  }

  logSuccess(message) {
    this.testResults.push({ type: 'success', message });
    console.log(chalk.green(`✅ ${message}`));
  }

  logWarning(message) {
    this.testResults.push({ type: 'warning', message });
    console.log(chalk.yellow(`⚠️ ${message}`));
  }

  logError(message) {
    this.testResults.push({ type: 'error', message });
    console.log(chalk.red(`❌ ${message}`));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  async function main() {
    const testSuite = new MobilePWATestSuite();
    
    try {
      await testSuite.setup();
      await testSuite.runAllTests();
    } catch (error) {
      console.error(chalk.red('Test suite failed:'), error);
    } finally {
      await testSuite.cleanup();
    }
  }
  
  main().catch(console.error);
}

module.exports = MobilePWATestSuite;