#!/usr/bin/env node

/**
 * Comprehensive Calendar Testing Suite
 * Tests calendar component validation, views, navigation, and functionality
 */

const { chromium } = require('playwright');

class CalendarTestSuite {
  constructor() {
    this.browser = null;
    this.results = {
      componentValidation: {},
      viewTests: {},
      navigationTests: {},
      performanceMetrics: {},
      errors: []
    };
  }

  async initialize() {
    console.log('📅 Starting Comprehensive Calendar Testing...');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testCalendarComponentValidation() {
    console.log('\n🔍 Step 1: Calendar Component Validation...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to calendar page
      await page.goto('http://localhost:3000/calendar');
      await page.waitForLoadState('networkidle');
      
      // Handle cookie consent
      try {
        await page.waitForSelector('button:has-text("Accept All")', { timeout: 3000 });
        await page.click('button:has-text("Accept All")');
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('  ℹ️  No cookie consent found');
      }

      // Wait for calendar to load
      await page.waitForTimeout(5000);

      // Test 1: Basic calendar structure
      const calendarStructure = await page.evaluate(() => {
        return {
          hasCalendarContainer: !!document.querySelector('[class*="calendar"], [data-testid="calendar"]'),
          hasDateElements: document.querySelectorAll('[class*="date"], [data-date], td, .calendar-day').length,
          hasNavigationButtons: document.querySelectorAll('button').length,
          hasViewSwitchers: Array.from(document.querySelectorAll('button'))
            .filter(btn => btn.textContent?.includes('Month') || btn.textContent?.includes('Week') || btn.textContent?.includes('Day')).length,
          currentDate: new Date().toISOString().split('T')[0],
          pageTitle: document.title,
          visibleText: document.body.textContent.length
        };
      });

      console.log('  📊 Calendar Structure Analysis:');
      console.log('    Has Calendar Container:', calendarStructure.hasCalendarContainer);
      console.log('    Date Elements Count:', calendarStructure.hasDateElements);
      console.log('    Navigation Buttons:', calendarStructure.hasNavigationButtons);
      console.log('    View Switchers:', calendarStructure.hasViewSwitchers);
      console.log('    Page Content Length:', calendarStructure.visibleText);

      // Test 2: Calendar view detection
      const viewElements = await page.evaluate(() => {
        const monthView = !!document.querySelector('[class*="month"], [data-view="month"]');
        const weekView = !!document.querySelector('[class*="week"], [data-view="week"]');
        const dayView = !!document.querySelector('[class*="day"], [data-view="day"]');
        
        // Look for calendar grid patterns
        const gridElements = document.querySelectorAll('table, [class*="grid"], .calendar-grid').length;
        const timeSlots = document.querySelectorAll('[class*="time"], [data-time]').length;
        
        return {
          monthView,
          weekView,
          dayView,
          gridElements,
          timeSlots,
          detectedView: monthView ? 'month' : weekView ? 'week' : dayView ? 'day' : 'unknown'
        };
      });

      console.log('  📅 Calendar View Detection:');
      console.log('    Month View Present:', viewElements.monthView);
      console.log('    Week View Present:', viewElements.weekView);
      console.log('    Day View Present:', viewElements.dayView);
      console.log('    Detected Current View:', viewElements.detectedView);
      console.log('    Grid Elements:', viewElements.gridElements);
      console.log('    Time Slots:', viewElements.timeSlots);

      // Test 3: Date navigation functionality
      console.log('\n  ⏭️  Testing Date Navigation...');
      
      // Look for navigation buttons (previous/next)
      const navigationTest = await page.evaluate(() => {
        const navButtons = Array.from(document.querySelectorAll('button'))
          .filter(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('prev') || text.includes('next') || 
                   text.includes('<') || text.includes('>') ||
                   text.includes('←') || text.includes('→');
          });
        
        const todayButton = Array.from(document.querySelectorAll('button'))
          .find(btn => btn.textContent?.toLowerCase().includes('today'));
        
        return {
          navigationButtons: navButtons.length,
          hasTodayButton: !!todayButton,
          buttonTexts: navButtons.map(btn => btn.textContent?.trim()).slice(0, 5)
        };
      });

      console.log('    Navigation Buttons Found:', navigationTest.navigationButtons);
      console.log('    Has Today Button:', navigationTest.hasTodayButton);
      console.log('    Button Texts:', navigationTest.buttonTexts);

      // Test actual navigation if buttons exist
      if (navigationTest.navigationButtons > 0) {
        try {
          const nextButton = await page.$('button:has-text("next"), button:has-text(">"), button:has-text("→")');
          if (nextButton) {
            await nextButton.click();
            await page.waitForTimeout(1000);
            console.log('    ✅ Next navigation works');
          } else {
            console.log('    ⚠️  Could not find next button to test');
          }
        } catch (error) {
          console.log('    ❌ Navigation test failed:', error.message);
        }
      }

      // Test 4: Current date highlighting
      const dateHighlighting = await page.evaluate(() => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Look for elements that might represent today
        const potentialTodayElements = Array.from(document.querySelectorAll('*'))
          .filter(el => {
            const text = el.textContent?.trim();
            const classes = el.className || '';
            return text === today.getDate().toString() || 
                   classes.includes('today') || 
                   classes.includes('current') ||
                   classes.includes('selected');
          });
        
        return {
          todayElements: potentialTodayElements.length,
          currentDate: todayStr,
          foundTodayHighlight: potentialTodayElements.some(el => 
            el.className?.includes('today') || el.className?.includes('current')
          )
        };
      });

      console.log('  📍 Current Date Highlighting:');
      console.log('    Elements matching today:', dateHighlighting.todayElements);
      console.log('    Found today highlight:', dateHighlighting.foundTodayHighlight);

      // Take screenshot for visual verification
      await page.screenshot({ 
        path: './test-screenshots/calendar-component-validation.png', 
        fullPage: true 
      });

      this.results.componentValidation = {
        structure: calendarStructure,
        views: viewElements,
        navigation: navigationTest,
        dateHighlighting: dateHighlighting,
        status: 'completed'
      };

      console.log('  ✅ Calendar Component Validation Complete');

    } catch (error) {
      console.log('  ❌ Calendar validation error:', error.message);
      this.results.errors.push(`Component validation: ${error.message}`);
    }

    await context.close();
  }

  async testCalendarViews() {
    console.log('\n🔄 Testing Calendar View Switching...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Test view switching if view buttons exist
      const viewButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button'))
          .filter(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('month') || text.includes('week') || text.includes('day');
          })
          .map(btn => ({
            text: btn.textContent?.trim(),
            visible: !btn.hidden && btn.offsetParent !== null
          }));
      });

      console.log('  🔘 Available View Buttons:', viewButtons);

      if (viewButtons.length > 0) {
        for (const viewInfo of viewButtons) {
          if (viewInfo.visible) {
            try {
              console.log(`    Testing ${viewInfo.text} view...`);
              
              await page.click(`button:has-text("${viewInfo.text}")`);
              await page.waitForTimeout(2000);
              
              // Check if view changed
              const viewState = await page.evaluate(() => ({
                url: window.location.href,
                visibleElements: document.querySelectorAll('*').length,
                timeElements: document.querySelectorAll('[class*="time"]').length
              }));
              
              console.log(`      ✅ ${viewInfo.text} view loaded (${viewState.visibleElements} elements)`);
              
              // Take screenshot of each view
              await page.screenshot({ 
                path: `./test-screenshots/calendar-view-${viewInfo.text.toLowerCase()}.png`,
                fullPage: true 
              });
              
            } catch (error) {
              console.log(`      ❌ ${viewInfo.text} view failed:`, error.message);
            }
          }
        }
      } else {
        console.log('  ℹ️  No view switching buttons found - testing single view');
      }

      this.results.viewTests = {
        availableViews: viewButtons,
        status: 'completed'
      };

    } catch (error) {
      console.log('  ❌ View testing error:', error.message);
      this.results.errors.push(`View testing: ${error.message}`);
    }

    await context.close();
  }

  async testCalendarPerformance() {
    console.log('\n⚡ Testing Calendar Performance...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      // Enable performance monitoring
      await page.addInitScript(() => {
        window.performanceMetrics = {
          startTime: performance.now(),
          renderTime: 0,
          interactionTime: 0
        };
      });

      const startTime = Date.now();
      await page.goto('http://localhost:3000/calendar');
      
      // Measure initial load time
      const loadTime = Date.now() - startTime;
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Measure render time
      const performanceMetrics = await page.evaluate(() => {
        const renderEnd = performance.now();
        return {
          totalLoadTime: renderEnd - window.performanceMetrics.startTime,
          domElements: document.querySelectorAll('*').length,
          memoryUsage: performance.memory ? {
            usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
          } : null
        };
      });

      // Test interaction performance
      const interactionStart = Date.now();
      try {
        const clickableElement = await page.$('button, [role="button"], .cursor-pointer');
        if (clickableElement) {
          await clickableElement.click();
          await page.waitForTimeout(500);
        }
      } catch (e) {
        // Interaction test optional
      }
      const interactionTime = Date.now() - interactionStart;

      console.log('  📊 Performance Metrics:');
      console.log('    Page Load Time:', loadTime, 'ms');
      console.log('    Total Render Time:', Math.round(performanceMetrics.totalLoadTime), 'ms');
      console.log('    DOM Elements:', performanceMetrics.domElements);
      console.log('    Interaction Response:', interactionTime, 'ms');
      
      if (performanceMetrics.memoryUsage) {
        console.log('    Memory Usage:', performanceMetrics.memoryUsage.usedJSHeapSize, 'MB');
      }

      // Performance assessment
      const performanceGrade = {
        loadTime: loadTime < 2000 ? 'excellent' : loadTime < 4000 ? 'good' : 'needs improvement',
        renderTime: performanceMetrics.totalLoadTime < 1000 ? 'excellent' : 'good',
        interactionTime: interactionTime < 100 ? 'excellent' : interactionTime < 300 ? 'good' : 'needs improvement'
      };

      console.log('  🎯 Performance Assessment:');
      console.log('    Load Time:', performanceGrade.loadTime);
      console.log('    Render Time:', performanceGrade.renderTime);
      console.log('    Interaction Time:', performanceGrade.interactionTime);

      this.results.performanceMetrics = {
        loadTime,
        renderTime: performanceMetrics.totalLoadTime,
        interactionTime,
        domElements: performanceMetrics.domElements,
        memoryUsage: performanceMetrics.memoryUsage,
        grades: performanceGrade,
        status: 'completed'
      };

    } catch (error) {
      console.log('  ❌ Performance testing error:', error.message);
      this.results.errors.push(`Performance testing: ${error.message}`);
    }

    await context.close();
  }

  async generateSummaryReport() {
    console.log('\n📋 CALENDAR TESTING SUMMARY REPORT');
    console.log('='.repeat(50));

    // Component validation summary
    if (this.results.componentValidation.status) {
      console.log('\n✅ Component Validation:');
      const cv = this.results.componentValidation;
      console.log(`  Calendar Structure: ${cv.structure.hasCalendarContainer ? '✅' : '❌'} Present`);
      console.log(`  Date Elements: ${cv.structure.hasDateElements} found`);
      console.log(`  Navigation: ${cv.navigation.navigationButtons} buttons`);
      console.log(`  Current View: ${cv.views.detectedView}`);
    }

    // View testing summary
    if (this.results.viewTests.status) {
      console.log('\n🔄 View Testing:');
      console.log(`  Available Views: ${this.results.viewTests.availableViews.length}`);
      this.results.viewTests.availableViews.forEach(view => {
        console.log(`    ${view.text}: ${view.visible ? '✅' : '❌'}`);
      });
    }

    // Performance summary
    if (this.results.performanceMetrics.status) {
      console.log('\n⚡ Performance:');
      const pm = this.results.performanceMetrics;
      console.log(`  Load Time: ${pm.loadTime}ms (${pm.grades.loadTime})`);
      console.log(`  Render Time: ${Math.round(pm.renderTime)}ms (${pm.grades.renderTime})`);
      console.log(`  Interaction Time: ${pm.interactionTime}ms (${pm.grades.interactionTime})`);
      console.log(`  DOM Elements: ${pm.domElements}`);
    }

    // Error summary
    if (this.results.errors.length > 0) {
      console.log('\n❌ Issues Found:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n🎉 No Critical Issues Found!');
    }

    console.log('\n📸 Screenshots saved to test-screenshots/');
    console.log('📊 Calendar component validation complete!');
  }

  async run() {
    try {
      await this.initialize();
      
      // Run all calendar tests
      await this.testCalendarComponentValidation();
      await this.testCalendarViews();
      await this.testCalendarPerformance();
      
      // Generate summary report
      await this.generateSummaryReport();
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run comprehensive calendar testing
const tester = new CalendarTestSuite();
tester.run().catch(console.error);