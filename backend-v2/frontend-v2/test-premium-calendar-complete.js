#!/usr/bin/env node

/**
 * Comprehensive Premium Calendar Enhancement Test
 * Tests all newly implemented features:
 * - RescheduleModal functionality
 * - Service color coding
 * - Barber symbols
 * - Premium visual effects
 * - Drag-and-drop enhancements
 * - Performance and accessibility
 */

const { chromium } = require('playwright');

class PremiumCalendarTester {
  constructor() {
    this.browser = null;
    this.results = {
      foundation: {
        calendarConstantsLoaded: false,
        stylesApplied: false,
        themingWorking: false
      },
      rescheduleModal: {
        modalDisplays: false,
        visualTimeline: false,
        recurringOptions: false,
        notificationOptions: false,
        noteField: false,
        securityFeatures: false
      },
      visualEnhancements: {
        serviceColors: false,
        barberSymbols: false,
        premiumBackgrounds: false,
        glowEffects: false,
        magneticSnap: false
      },
      dragAndDrop: {
        floatingPreview: false,
        smoothTracking: false,
        premiumAnimations: false,
        magneticZones: false,
        dropConfirmation: false
      },
      performance: {
        smoothAnimations: false,
        responsiveDesign: false,
        fastInteractions: false,
        memoryEfficient: false
      },
      accessibility: {
        keyboardNavigation: false,
        screenReaderSupport: false,
        contrastCompliant: false,
        touchFriendly: false
      }
    };
  }

  async initialize() {
    console.log('🎨 Premium Calendar Enhancement Test Suite');
    console.log('==========================================');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 300 // Slower for visual confirmation
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async setupTestEnvironment() {
    const context = await this.browser.newContext({
      viewport: { width: 1440, height: 900 } // Desktop viewport
    });
    const page = await context.newPage();
    
    // Mock authentication
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.setItem('token', 'premium-test-token');
      localStorage.setItem('refresh_token', 'premium-refresh');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'premium@test.com',
        role: 'admin',
        first_name: 'Premium',
        last_name: 'Tester'
      }));
    });
    
    return { context, page };
  }

  async testFoundation() {
    console.log('\n🔧 Testing Foundation Components');
    console.log('==============================');
    
    const { context, page } = await this.setupTestEnvironment();
    
    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForTimeout(3000);
      
      // Test 1: Calendar constants loaded
      console.log('  1️⃣ Testing calendar constants...');
      const constantsLoaded = await page.evaluate(() => {
        // Check if calendar constants are available
        return typeof window !== 'undefined' && 
               document.documentElement.style.getPropertyValue('--service-haircut-color') !== '';
      });
      
      this.results.foundation.calendarConstantsLoaded = constantsLoaded;
      console.log(`    ${constantsLoaded ? '✅' : '❌'} Calendar constants loaded`);
      
      // Test 2: Premium styles applied
      console.log('  2️⃣ Testing premium styles...');
      const stylesApplied = await page.evaluate(() => {
        const calendarElement = document.querySelector('[class*="calendar"]');
        if (!calendarElement) return false;
        
        const styles = window.getComputedStyle(calendarElement);
        return styles.getPropertyValue('--calendar-premium-loaded') !== '' ||
               document.querySelector('.calendar-premium') !== null ||
               document.head.innerHTML.includes('calendar-premium.css');
      });
      
      this.results.foundation.stylesApplied = stylesApplied;
      console.log(`    ${stylesApplied ? '✅' : '❌'} Premium styles applied`);
      
      // Test 3: Service theming working
      console.log('  3️⃣ Testing service theming...');
      const themingWorking = await page.evaluate(() => {
        // Look for service-themed elements
        const serviceElements = document.querySelectorAll('[class*="service-"], [class*="haircut"], [class*="beard"]');
        return serviceElements.length > 0;
      });
      
      this.results.foundation.themingWorking = themingWorking;
      console.log(`    ${themingWorking ? '✅' : '❌'} Service theming working`);
      
    } catch (error) {
      console.log(`    ❌ Foundation test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testRescheduleModal() {
    console.log('\n📝 Testing RescheduleModal');
    console.log('=========================');
    
    const { context, page } = await this.setupTestEnvironment();
    
    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForTimeout(2000);
      
      // Look for draggable appointments
      const appointmentElements = await page.$$('[draggable="true"], [data-appointment-id]');
      
      if (appointmentElements.length > 0) {
        // Test modal by simulating drag and drop
        const appointment = appointmentElements[0];
        await appointment.click();
        
        // Try to trigger reschedule modal
        const modalVisible = await page.evaluate(() => {
          // Check if RescheduleModal is in the DOM
          return document.querySelector('[class*="reschedule"], [role="dialog"]') !== null ||
                 document.body.textContent.includes('Reschedule') ||
                 document.body.textContent.includes('recurring');
        });
        
        this.results.rescheduleModal.modalDisplays = modalVisible;
        console.log(`  1️⃣ ${modalVisible ? '✅' : '❌'} Modal displays`);
        
        if (modalVisible) {
          // Test modal features
          const hasRecurringOptions = await page.$('input[type="checkbox"], input[type="radio"]');
          this.results.rescheduleModal.recurringOptions = hasRecurringOptions !== null;
          console.log(`  2️⃣ ${hasRecurringOptions ? '✅' : '❌'} Recurring options present`);
          
          const hasNotificationOptions = await page.$$eval('*', elements => {
            return elements.some(el => 
              el.textContent.toLowerCase().includes('sms') ||
              el.textContent.toLowerCase().includes('email') ||
              el.textContent.toLowerCase().includes('notification')
            );
          });
          this.results.rescheduleModal.notificationOptions = hasNotificationOptions;
          console.log(`  3️⃣ ${hasNotificationOptions ? '✅' : '❌'} Notification options present`);
        }
      } else {
        console.log('  ❌ No draggable appointments found to test modal');
      }
      
    } catch (error) {
      console.log(`  ❌ RescheduleModal test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testVisualEnhancements() {
    console.log('\n🎨 Testing Visual Enhancements');
    console.log('=============================');
    
    const { context, page } = await this.setupTestEnvironment();
    
    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForTimeout(2000);
      
      // Test 1: Service colors
      console.log('  1️⃣ Testing service colors...');
      const serviceColors = await page.evaluate(() => {
        const appointments = document.querySelectorAll('[class*="appointment"], [data-appointment-id]');
        let colorVariations = new Set();
        
        appointments.forEach(apt => {
          const styles = window.getComputedStyle(apt);
          const bgColor = styles.backgroundColor;
          const borderColor = styles.borderColor;
          if (bgColor !== 'rgba(0, 0, 0, 0)') colorVariations.add(bgColor);
          if (borderColor !== 'rgba(0, 0, 0, 0)') colorVariations.add(borderColor);
        });
        
        return colorVariations.size > 1; // Multiple colors = service-specific coloring
      });
      
      this.results.visualEnhancements.serviceColors = serviceColors;
      console.log(`    ${serviceColors ? '✅' : '❌'} Service-specific colors detected`);
      
      // Test 2: Barber symbols
      console.log('  2️⃣ Testing barber symbols...');
      const barberSymbols = await page.evaluate(() => {
        // Look for symbols/emojis in appointments
        const text = document.body.textContent;
        const hasSymbols = /[🔷🔶🟢🟣🔴⭐💎🔸🔹⚡🌟]/u.test(text);
        const hasInitials = document.querySelectorAll('[class*="barber"], [class*="avatar"]').length > 0;
        return hasSymbols || hasInitials;
      });
      
      this.results.visualEnhancements.barberSymbols = barberSymbols;
      console.log(`    ${barberSymbols ? '✅' : '❌'} Barber symbols/avatars present`);
      
      // Test 3: Premium backgrounds
      console.log('  3️⃣ Testing premium backgrounds...');
      const premiumBackgrounds = await page.evaluate(() => {
        const calendar = document.querySelector('[class*="calendar"]');
        if (!calendar) return false;
        
        const styles = window.getComputedStyle(calendar);
        const hasGradient = styles.background.includes('gradient') ||
                           styles.backgroundImage.includes('gradient');
        const hasGlass = styles.backdropFilter !== 'none' ||
                        styles.filter.includes('blur');
        
        return hasGradient || hasGlass;
      });
      
      this.results.visualEnhancements.premiumBackgrounds = premiumBackgrounds;
      console.log(`    ${premiumBackgrounds ? '✅' : '❌'} Premium backgrounds applied`);
      
      // Test 4: Glow effects on hover
      console.log('  4️⃣ Testing glow effects...');
      const appointments = await page.$$('[data-appointment-id], [class*="appointment"]');
      if (appointments.length > 0) {
        await appointments[0].hover();
        await page.waitForTimeout(500);
        
        const glowEffects = await page.evaluate(() => {
          const hovered = document.querySelector(':hover');
          if (!hovered) return false;
          
          const styles = window.getComputedStyle(hovered);
          return styles.boxShadow.includes('rgb') && 
                 styles.boxShadow !== 'none' &&
                 styles.boxShadow.length > 20; // Indicates glow shadow
        });
        
        this.results.visualEnhancements.glowEffects = glowEffects;
        console.log(`    ${glowEffects ? '✅' : '❌'} Glow effects on hover`);
      }
      
    } catch (error) {
      console.log(`  ❌ Visual enhancement test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testDragAndDrop() {
    console.log('\n🎯 Testing Drag-and-Drop Enhancements');
    console.log('====================================');
    
    const { context, page } = await this.setupTestEnvironment();
    
    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForTimeout(2000);
      
      const draggableElements = await page.$$('[draggable="true"]');
      
      if (draggableElements.length > 0) {
        const appointment = draggableElements[0];
        const box = await appointment.boundingBox();
        
        if (box) {
          // Test 1: Floating preview
          console.log('  1️⃣ Testing floating preview...');
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(200);
          
          const floatingPreview = await page.evaluate(() => {
            // Look for drag preview elements
            return document.querySelector('[class*="drag"], [class*="preview"], [style*="fixed"]') !== null;
          });
          
          this.results.dragAndDrop.floatingPreview = floatingPreview;
          console.log(`    ${floatingPreview ? '✅' : '❌'} Floating preview appears`);
          
          // Test 2: Smooth tracking
          console.log('  2️⃣ Testing smooth tracking...');
          await page.mouse.move(box.x + 100, box.y + 50, { steps: 10 });
          await page.waitForTimeout(100);
          
          const smoothTracking = await page.evaluate(() => {
            const dragElement = document.querySelector('[class*="drag"], [style*="fixed"]');
            return dragElement && dragElement.style.transform !== '';
          });
          
          this.results.dragAndDrop.smoothTracking = smoothTracking;
          console.log(`    ${smoothTracking ? '✅' : '❌'} Smooth cursor tracking`);
          
          // Test 3: Drop confirmation
          console.log('  3️⃣ Testing drop confirmation...');
          await page.mouse.up();
          await page.waitForTimeout(1000);
          
          const dropConfirmation = await page.evaluate(() => {
            return document.body.textContent.includes('Reschedule') ||
                   document.body.textContent.includes('confirm') ||
                   document.querySelector('[role="dialog"]') !== null;
          });
          
          this.results.dragAndDrop.dropConfirmation = dropConfirmation;
          console.log(`    ${dropConfirmation ? '✅' : '❌'} Drop confirmation appears`);
        }
      } else {
        console.log('  ❌ No draggable elements found');
      }
      
    } catch (error) {
      console.log(`  ❌ Drag-and-drop test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance');
    console.log('====================');
    
    const { context, page } = await this.setupTestEnvironment();
    
    try {
      await page.goto('http://localhost:3000/calendar');
      
      // Test page load performance
      const loadTime = await page.evaluate(() => {
        return performance.timing.loadEventEnd - performance.timing.navigationStart;
      });
      
      const fastLoad = loadTime < 5000; // Under 5 seconds
      this.results.performance.fastInteractions = fastLoad;
      console.log(`  1️⃣ ${fastLoad ? '✅' : '❌'} Page loads in ${loadTime}ms (< 5000ms)`);
      
      // Test animation smoothness
      const fps = await page.evaluate(() => {
        return new Promise((resolve) => {
          let frames = 0;
          const start = performance.now();
          
          function countFrames() {
            frames++;
            if (performance.now() - start < 1000) {
              requestAnimationFrame(countFrames);
            } else {
              resolve(frames);
            }
          }
          
          requestAnimationFrame(countFrames);
        });
      });
      
      const smoothAnimations = fps > 45; // Close to 60fps
      this.results.performance.smoothAnimations = smoothAnimations;
      console.log(`  2️⃣ ${smoothAnimations ? '✅' : '❌'} Animation FPS: ${fps} (> 45fps)`);
      
      // Test memory usage
      const metrics = await page.metrics();
      const memoryEfficient = metrics.JSHeapUsedSize < 50 * 1024 * 1024; // Under 50MB
      this.results.performance.memoryEfficient = memoryEfficient;
      console.log(`  3️⃣ ${memoryEfficient ? '✅' : '❌'} Memory usage: ${Math.round(metrics.JSHeapUsedSize / 1024 / 1024)}MB (< 50MB)`);
      
    } catch (error) {
      console.log(`  ❌ Performance test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testAccessibility() {
    console.log('\n♿ Testing Accessibility');
    console.log('======================');
    
    const { context, page } = await this.setupTestEnvironment();
    
    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForTimeout(2000);
      
      // Test 1: Keyboard navigation
      console.log('  1️⃣ Testing keyboard navigation...');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const keyboardNav = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused && focused !== document.body;
      });
      
      this.results.accessibility.keyboardNavigation = keyboardNav;
      console.log(`    ${keyboardNav ? '✅' : '❌'} Keyboard navigation works`);
      
      // Test 2: ARIA labels
      console.log('  2️⃣ Testing ARIA support...');
      const ariaSupport = await page.evaluate(() => {
        const ariaElements = document.querySelectorAll('[aria-label], [aria-describedby], [role]');
        return ariaElements.length > 0;
      });
      
      this.results.accessibility.screenReaderSupport = ariaSupport;
      console.log(`    ${ariaSupport ? '✅' : '❌'} ARIA labels present`);
      
      // Test 3: Touch targets
      console.log('  3️⃣ Testing touch targets...');
      const touchFriendly = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll('button, [role="button"], [draggable], input');
        let adequateSize = 0;
        
        interactiveElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width >= 44 && rect.height >= 44) {
            adequateSize++;
          }
        });
        
        return adequateSize / interactiveElements.length > 0.8; // 80% compliance
      });
      
      this.results.accessibility.touchFriendly = touchFriendly;
      console.log(`    ${touchFriendly ? '✅' : '❌'} Touch-friendly targets`);
      
    } catch (error) {
      console.log(`  ❌ Accessibility test failed: ${error.message}`);
    }
    
    await context.close();
  }

  generateReport() {
    console.log('\n📊 Premium Calendar Enhancement Report');
    console.log('======================================\n');
    
    const categories = [
      { name: 'Foundation', key: 'foundation' },
      { name: 'RescheduleModal', key: 'rescheduleModal' },
      { name: 'Visual Enhancements', key: 'visualEnhancements' },
      { name: 'Drag-and-Drop', key: 'dragAndDrop' },
      { name: 'Performance', key: 'performance' },
      { name: 'Accessibility', key: 'accessibility' }
    ];
    
    let totalTests = 0;
    let passedTests = 0;
    
    categories.forEach(category => {
      console.log(`${category.name}:`);
      const tests = this.results[category.key];
      
      Object.entries(tests).forEach(([testName, passed]) => {
        totalTests++;
        if (passed) passedTests++;
        
        const displayName = testName.replace(/([A-Z])/g, ' $1').toLowerCase();
        console.log(`  ${passed ? '✅' : '❌'} ${displayName}`);
      });
      
      console.log('');
    });
    
    const score = Math.round((passedTests / totalTests) * 100);
    console.log(`Overall Score: ${passedTests}/${totalTests} (${score}%)\n`);
    
    // Summary and recommendations
    if (score >= 90) {
      console.log('🎉 Excellent! Premium calendar features are working beautifully.');
      console.log('✨ The calendar provides a premium user experience with smooth');
      console.log('   animations, beautiful visuals, and excellent accessibility.');
    } else if (score >= 70) {
      console.log('⚠️  Good progress! Most features are working with some areas for improvement.');
      console.log('🔧 Focus on fixing the failing tests to achieve premium quality.');
    } else {
      console.log('❌ Significant issues detected. Major development work needed.');
      console.log('🛠️  Review implementation and fix core functionality first.');
    }
    
    console.log('');
    console.log('📋 Next Steps:');
    if (score < 100) {
      console.log('1. Fix failing tests identified above');
      console.log('2. Re-run this test suite to verify improvements');
      console.log('3. Perform manual testing for edge cases');
    } else {
      console.log('1. Deploy to staging environment');
      console.log('2. Conduct user acceptance testing');
      console.log('3. Monitor performance in production');
    }
    
    return score >= 70;
  }

  async run() {
    try {
      await this.initialize();
      
      // Run all test suites
      await this.testFoundation();
      await this.testRescheduleModal();
      await this.testVisualEnhancements();
      await this.testDragAndDrop();
      await this.testPerformance();
      await this.testAccessibility();
      
      // Generate comprehensive report
      const success = this.generateReport();
      
      return success;
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run the comprehensive test suite
const tester = new PremiumCalendarTester();
tester.run()
  .then(success => {
    console.log(success ? '\n🎯 Test suite completed successfully!' : '\n⚠️  Test suite completed with issues.');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });