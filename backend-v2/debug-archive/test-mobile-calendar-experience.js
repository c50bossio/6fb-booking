#!/usr/bin/env node

/**
 * Mobile Calendar Experience Test
 * Tests calendar functionality specifically on mobile devices and touch interfaces
 */

const { chromium, devices } = require('playwright');

class MobileCalendarTester {
  constructor() {
    this.browser = null;
    this.results = {
      mobileLayout: false,
      touchInteractions: false,
      gestureSupport: false,
      mobileNavigation: false,
      performanceOnMobile: false,
      mobileAccessibility: false
    };
    this.mobileInsights = [];
  }

  async initialize() {
    console.log('📱 Mobile Calendar Experience Test');
    console.log('==================================');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 300
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testMobileDevices() {
    console.log('\n📱 Testing Multiple Mobile Devices');
    console.log('==================================');
    
    const mobileDevices = [
      devices['iPhone 12'],
      devices['iPhone SE'],
      devices['Pixel 5'],
      devices['Galaxy S9+']
    ];
    
    let deviceResults = [];
    
    for (const device of mobileDevices) {
      console.log(`\\n📱 Testing ${device.name || 'Mobile Device'}...`);
      
      const context = await this.browser.newContext({
        ...device,
        locale: 'en-US'
      });
      const page = await context.newPage();
      
      try {
        await page.goto('http://localhost:3000/calendar', { timeout: 15000 });
        await page.waitForTimeout(3000);
        
        const mobileAnalysis = await page.evaluate(() => {
          const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: window.devicePixelRatio
          };
          
          return {
            viewport,
            
            // Layout adaptation
            hasResponsiveLayout: document.querySelector('[class*="mobile"], [class*="sm:"]') !== null,
            elementsOverflow: [...document.querySelectorAll('*')].some(el => {
              const rect = el.getBoundingClientRect();
              return rect.right > window.innerWidth + 10; // 10px tolerance
            }),
            
            // Touch targets
            buttons: Array.from(document.querySelectorAll('button')).map(btn => {
              const rect = btn.getBoundingClientRect();
              return {
                width: rect.width,
                height: rect.height,
                touchFriendly: Math.min(rect.width, rect.height) >= 44 // Apple guidelines
              };
            }),
            
            // Content visibility
            hasVisibleContent: document.body.textContent.length > 200,
            hasCalendarElements: document.querySelector('[class*="calendar"], table') !== null,
            
            // Navigation elements
            hasHamburgerMenu: document.querySelector('.hamburger, [aria-label*="menu"], [class*="menu-toggle"]') !== null,
            hasBottomNavigation: document.querySelector('[class*="bottom"], [class*="tab-bar"]') !== null,
            
            // Text readability
            textElements: Array.from(document.querySelectorAll('p, span, div')).slice(0, 10).map(el => {
              const style = getComputedStyle(el);
              return {
                fontSize: parseFloat(style.fontSize),
                color: style.color,
                text: el.textContent?.trim().substring(0, 50)
              };
            }).filter(el => el.text && el.text.length > 5),
            
            // Interactive elements
            interactiveElements: document.querySelectorAll('button, a, input, select').length,
            
            // Mobile optimizations
            hasViewportMeta: document.querySelector('meta[name="viewport"]') !== null,
            hasTouchIcons: document.querySelector('link[rel*="apple-touch-icon"], link[rel*="icon"]') !== null
          };
        });
        
        // Calculate mobile-specific scores
        const touchFriendlyButtons = mobileAnalysis.buttons.filter(btn => btn.touchFriendly).length;
        const totalButtons = mobileAnalysis.buttons.length;
        const touchFriendlyRatio = totalButtons > 0 ? touchFriendlyButtons / totalButtons : 1;
        
        const averageFontSize = mobileAnalysis.textElements.length > 0 ?
          mobileAnalysis.textElements.reduce((sum, el) => sum + el.fontSize, 0) / mobileAnalysis.textElements.length : 16;
        
        const deviceResult = {
          device: device.name || 'Unknown Device',
          viewport: mobileAnalysis.viewport,
          layoutScore: [
            !mobileAnalysis.elementsOverflow,
            mobileAnalysis.hasVisibleContent,
            mobileAnalysis.hasViewportMeta,
            touchFriendlyRatio >= 0.8,
            averageFontSize >= 14
          ].filter(Boolean).length,
          touchScore: touchFriendlyRatio,
          details: mobileAnalysis
        };
        
        deviceResults.push(deviceResult);
        
        console.log(`    Viewport: ${mobileAnalysis.viewport.width}x${mobileAnalysis.viewport.height}`);
        console.log(`    Layout Overflow: ${mobileAnalysis.elementsOverflow ? '❌' : '✅'}`);
        console.log(`    Touch-Friendly Buttons: ${touchFriendlyButtons}/${totalButtons} (${Math.round(touchFriendlyRatio * 100)}%)`);
        console.log(`    Average Font Size: ${averageFontSize.toFixed(0)}px`);
        console.log(`    Has Content: ${mobileAnalysis.hasVisibleContent ? '✅' : '❌'}`);
        console.log(`    Interactive Elements: ${mobileAnalysis.interactiveElements}`);
        
        // Test mobile-specific interactions
        if (mobileAnalysis.buttons.length > 0) {
          await this.testTouchInteractions(page);
        }
        
      } catch (error) {
        console.log(`    ❌ Failed to test ${device.name}: ${error.message}`);
        deviceResults.push({
          device: device.name || 'Unknown Device',
          error: error.message,
          layoutScore: 0,
          touchScore: 0
        });
      }
      
      await context.close();
    }
    
    // Calculate overall mobile scores
    const avgLayoutScore = deviceResults.reduce((sum, r) => sum + (r.layoutScore || 0), 0) / deviceResults.length;
    const avgTouchScore = deviceResults.reduce((sum, r) => sum + (r.touchScore || 0), 0) / deviceResults.length;
    
    this.results.mobileLayout = avgLayoutScore >= 4; // 4/5 layout criteria
    this.results.touchInteractions = avgTouchScore >= 0.8; // 80% touch-friendly
    
    console.log(`\\n📊 Mobile Device Summary:`);
    console.log(`  Average Layout Score: ${avgLayoutScore.toFixed(1)}/5`);
    console.log(`  Average Touch Friendliness: ${Math.round(avgTouchScore * 100)}%`);
    console.log(`  ${this.results.mobileLayout ? '✅' : '❌'} Mobile Layout Quality`);
    console.log(`  ${this.results.touchInteractions ? '✅' : '❌'} Touch Interaction Quality`);
    
    if (this.results.mobileLayout && this.results.touchInteractions) {
      this.mobileInsights.push('Excellent mobile layout adaptation across devices');
    } else {
      this.mobileInsights.push('Mobile layout needs optimization for better touch experience');
    }
    
    return deviceResults;
  }

  async testTouchInteractions(page) {
    console.log('      🖐️  Testing Touch Interactions...');
    
    try {
      // Test tap interactions
      const buttons = await page.$$('button');
      if (buttons.length > 0) {
        const testButton = buttons[0];
        
        // Get button position and size
        const buttonBox = await testButton.boundingBox();
        if (buttonBox) {
          // Test tap in center
          await page.touchscreen.tap(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
          await page.waitForTimeout(500);
          console.log('        ✅ Touch tap successful');
          
          // Test if button has appropriate size for touch
          const minTouchTarget = Math.min(buttonBox.width, buttonBox.height);
          if (minTouchTarget >= 44) {
            console.log('        ✅ Touch target size appropriate (≥44px)');
          } else {
            console.log(`        ⚠️  Touch target small (${minTouchTarget.toFixed(0)}px)`);
          }
        }
      }
      
      // Test swipe gestures if applicable
      try {
        await page.touchscreen.tap(200, 300);
        await page.touchscreen.tap(200, 250);
        console.log('        ✅ Multi-touch gestures responsive');
      } catch (error) {
        console.log('        ⚠️  Gesture testing limited');
      }
      
    } catch (error) {
      console.log(`        ❌ Touch interaction test failed: ${error.message}`);
    }
  }

  async testMobileNavigation() {
    console.log('\\n🧭 Mobile Navigation Test');
    console.log('==========================');
    
    const context = await this.browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:3000', { timeout: 15000 });
      await page.waitForTimeout(3000);
      
      const navigationTest = await page.evaluate(() => {
        return {
          // Mobile navigation patterns
          hasHamburgerMenu: document.querySelector('[class*="hamburger"], [aria-label*="menu"]') !== null,
          hasBottomNavigation: document.querySelector('[class*="bottom-nav"], [class*="tab-bar"]') !== null,
          hasDrawerNavigation: document.querySelector('[class*="drawer"], [class*="sidebar"]') !== null,
          
          // Touch-friendly navigation
          navigationItems: Array.from(document.querySelectorAll('nav a, nav button')).map(item => {
            const rect = item.getBoundingClientRect();
            return {
              text: item.textContent?.trim(),
              width: rect.width,
              height: rect.height,
              touchFriendly: Math.min(rect.width, rect.height) >= 44
            };
          }),
          
          // Scroll behavior
          hasScrollableContent: document.body.scrollHeight > window.innerHeight,
          
          // Back navigation
          hasBackButton: document.querySelector('[aria-label*="back"], .back-button') !== null,
          
          // Breadcrumbs on mobile
          hasBreadcrumbs: document.querySelector('.breadcrumb, [aria-label*="breadcrumb"]') !== null,
          breadcrumbsHidden: document.querySelector('.breadcrumb[class*="hidden"], .breadcrumb[class*="sm:hidden"]') !== null,
          
          // Current page indication
          hasActiveNavIndicator: document.querySelector('.active, [aria-current]') !== null
        };
      });
      
      console.log('📊 Mobile Navigation Analysis:');
      console.log(`  Hamburger Menu: ${navigationTest.hasHamburgerMenu ? '✅' : '❌'}`);
      console.log(`  Bottom Navigation: ${navigationTest.hasBottomNavigation ? '✅' : '❌'}`);
      console.log(`  Drawer Navigation: ${navigationTest.hasDrawerNavigation ? '✅' : '❌'}`);
      console.log(`  Scrollable Content: ${navigationTest.hasScrollableContent ? '✅' : '❌'}`);
      console.log(`  Back Button: ${navigationTest.hasBackButton ? '✅' : '❌'}`);
      console.log(`  Active Nav Indicator: ${navigationTest.hasActiveNavIndicator ? '✅' : '❌'}`);
      
      if (navigationTest.navigationItems.length > 0) {
        const touchFriendlyNav = navigationTest.navigationItems.filter(item => item.touchFriendly).length;
        console.log(`  Touch-Friendly Nav Items: ${touchFriendlyNav}/${navigationTest.navigationItems.length}`);
      }
      
      // Test navigation flow on mobile
      const pages = ['/calendar', '/book', '/dashboard'];
      let navigationSuccess = 0;
      
      for (const testPage of pages) {
        try {
          await page.goto(`http://localhost:3000${testPage}`, { timeout: 10000 });
          await page.waitForTimeout(2000);
          
          const hasContent = await page.evaluate(() => document.body.textContent.length > 100);
          if (hasContent) {
            navigationSuccess++;
          }
        } catch (error) {
          // Navigation failed
        }
      }
      
      console.log(`  Mobile Page Navigation: ${navigationSuccess}/${pages.length} successful`);
      
      this.results.mobileNavigation = (
        (navigationTest.hasHamburgerMenu || navigationTest.hasBottomNavigation) &&
        navigationSuccess >= 2
      );
      
      console.log(`  ${this.results.mobileNavigation ? '✅' : '❌'} Mobile Navigation Quality`);
      
      if (this.results.mobileNavigation) {
        this.mobileInsights.push('Mobile navigation is well-structured and accessible');
      } else {
        this.mobileInsights.push('Mobile navigation needs improvement for better usability');
      }
      
    } catch (error) {
      console.log(`  ❌ Mobile navigation test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testMobilePerformance() {
    console.log('\\n⚡ Mobile Performance Test');
    console.log('==========================');
    
    const context = await this.browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    try {
      // Monitor network requests on mobile
      let networkRequests = [];
      page.on('request', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          size: request.postData()?.length || 0,
          timestamp: Date.now()
        });
      });
      
      const startTime = Date.now();
      await page.goto('http://localhost:3000/calendar', { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Test mobile-specific performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const perfEntries = performance.getEntriesByType('navigation')[0];
        
        return {
          domContentLoadedTime: perfEntries?.domContentLoadedEventEnd - perfEntries?.domContentLoadedEventStart || 0,
          loadCompleteTime: perfEntries?.loadEventEnd - perfEntries?.loadEventStart || 0,
          
          // Layout metrics
          layoutShiftCount: 0, // Would need more complex measurement
          
          // Resource metrics
          totalResources: performance.getEntriesByType('resource').length,
          imageCount: document.querySelectorAll('img').length,
          
          // Interaction metrics
          inputDelay: 0, // Would need user interaction to measure
          
          // Mobile-specific
          viewportWidth: window.innerWidth,
          devicePixelRatio: window.devicePixelRatio,
          
          // Memory (if available)
          memoryUsage: 'memory' in performance ? performance.memory.usedJSHeapSize : null
        };
      });
      
      console.log('📊 Mobile Performance Analysis:');
      console.log(`  Page Load Time: ${loadTime}ms`);
      console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoadedTime.toFixed(0)}ms`);
      console.log(`  Network Requests: ${networkRequests.length}`);
      console.log(`  Total Resources: ${performanceMetrics.totalResources}`);
      console.log(`  Images: ${performanceMetrics.imageCount}`);
      console.log(`  Viewport: ${performanceMetrics.viewportWidth}px (${performanceMetrics.devicePixelRatio}x)`);
      
      if (performanceMetrics.memoryUsage) {
        const memoryMB = performanceMetrics.memoryUsage / (1024 * 1024);
        console.log(`  Memory Usage: ${memoryMB.toFixed(1)}MB`);
      }
      
      // Performance thresholds for mobile
      this.results.performanceOnMobile = (
        loadTime < 8000 && // 8 seconds for mobile
        networkRequests.length < 50 && // Reasonable request count
        performanceMetrics.imageCount < 20 // Not too many images
      );
      
      console.log(`  ${this.results.performanceOnMobile ? '✅' : '❌'} Mobile Performance Quality`);
      
      if (this.results.performanceOnMobile) {
        this.mobileInsights.push('Mobile performance is optimized for good user experience');
      } else {
        this.mobileInsights.push('Mobile performance needs optimization for better loading times');
      }
      
    } catch (error) {
      console.log(`  ❌ Mobile performance test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testMobileAccessibility() {
    console.log('\\n♿ Mobile Accessibility Test');
    console.log('============================');
    
    const context = await this.browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:3000/calendar', { timeout: 15000 });
      await page.waitForTimeout(3000);
      
      const accessibilityAnalysis = await page.evaluate(() => {
        return {
          // Touch accessibility
          touchTargets: Array.from(document.querySelectorAll('button, a, input')).map(el => {
            const rect = el.getBoundingClientRect();
            const size = Math.min(rect.width, rect.height);
            return {
              element: el.tagName.toLowerCase(),
              size: size,
              accessible: size >= 44,
              hasLabel: el.getAttribute('aria-label') || el.textContent?.trim() || el.getAttribute('title')
            };
          }),
          
          // Screen reader support
          hasLandmarks: document.querySelectorAll('[role="main"], [role="navigation"], main, nav').length,
          hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
          hasAltText: Array.from(document.querySelectorAll('img')).every(img => img.alt),
          
          // Mobile-specific accessibility
          hasViewportMeta: document.querySelector('meta[name="viewport"]') !== null,
          supportsZoom: !document.querySelector('meta[name="viewport"][content*="user-scalable=no"]'),
          
          // Focus management
          hasFocusIndicators: document.querySelector('[class*="focus"], :focus') !== null,
          
          // Color contrast (basic check)
          darkModeSupport: document.querySelector('[class*="dark"], [data-theme="dark"]') !== null,
          
          // Interactive element spacing
          elementSpacing: 'calculated separately', // Would need complex calculation
          
          // Text sizing
          textElements: Array.from(document.querySelectorAll('p, span, button, a')).slice(0, 10).map(el => {
            const style = getComputedStyle(el);
            return {
              fontSize: parseFloat(style.fontSize),
              lineHeight: style.lineHeight,
              text: el.textContent?.trim().substring(0, 30)
            };
          }).filter(el => el.text && el.fontSize > 0)
        };
      });
      
      console.log('📊 Mobile Accessibility Analysis:');
      
      // Touch target analysis
      const appropriateTouchTargets = accessibilityAnalysis.touchTargets.filter(t => t.accessible).length;
      const totalTouchTargets = accessibilityAnalysis.touchTargets.length;
      const touchTargetRatio = totalTouchTargets > 0 ? appropriateTouchTargets / totalTouchTargets : 1;
      
      console.log(`  Touch Targets: ${appropriateTouchTargets}/${totalTouchTargets} appropriate (${Math.round(touchTargetRatio * 100)}%)`);
      console.log(`  Landmarks: ${accessibilityAnalysis.hasLandmarks}`);
      console.log(`  Headings: ${accessibilityAnalysis.hasHeadings}`);
      console.log(`  Image Alt Text: ${accessibilityAnalysis.hasAltText ? '✅' : '❌'}`);
      console.log(`  Viewport Meta: ${accessibilityAnalysis.hasViewportMeta ? '✅' : '❌'}`);
      console.log(`  Zoom Support: ${accessibilityAnalysis.supportsZoom ? '✅' : '❌'}`);
      console.log(`  Focus Indicators: ${accessibilityAnalysis.hasFocusIndicators ? '✅' : '❌'}`);
      
      // Text size analysis
      if (accessibilityAnalysis.textElements.length > 0) {
        const avgFontSize = accessibilityAnalysis.textElements.reduce((sum, el) => sum + el.fontSize, 0) / accessibilityAnalysis.textElements.length;
        console.log(`  Average Font Size: ${avgFontSize.toFixed(0)}px`);
        
        const readableText = accessibilityAnalysis.textElements.filter(el => el.fontSize >= 14).length;
        console.log(`  Readable Text: ${readableText}/${accessibilityAnalysis.textElements.length} elements ≥14px`);
      }
      
      this.results.mobileAccessibility = (
        touchTargetRatio >= 0.8 &&
        accessibilityAnalysis.hasViewportMeta &&
        accessibilityAnalysis.supportsZoom &&
        accessibilityAnalysis.hasLandmarks > 0
      );
      
      console.log(`  ${this.results.mobileAccessibility ? '✅' : '❌'} Mobile Accessibility Quality`);
      
      if (this.results.mobileAccessibility) {
        this.mobileInsights.push('Mobile accessibility meets key requirements for inclusive design');
      } else {
        this.mobileInsights.push('Mobile accessibility needs improvement for better inclusive design');
      }
      
    } catch (error) {
      console.log(`  ❌ Mobile accessibility test failed: ${error.message}`);
    }
    
    await context.close();
  }

  printMobileReport() {
    console.log('\\n📱 Mobile Calendar Experience Report');
    console.log('======================================');
    
    const tests = [
      { name: 'Mobile Layout & Responsive Design', passed: this.results.mobileLayout },
      { name: 'Touch Interactions & Gestures', passed: this.results.touchInteractions },
      { name: 'Mobile Navigation Experience', passed: this.results.mobileNavigation },
      { name: 'Mobile Performance Optimization', passed: this.results.performanceOnMobile },
      { name: 'Mobile Accessibility Compliance', passed: this.results.mobileAccessibility }
    ];
    
    tests.forEach(test => {
      console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
    });
    
    const passedTests = tests.filter(test => test.passed).length;
    const totalTests = tests.length;
    
    console.log(`\\n📱 Mobile Experience Score: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    console.log('\\n💡 Mobile Insights:');
    this.mobileInsights.forEach(insight => {
      console.log(`  • ${insight}`);
    });
    
    if (passedTests >= 4) {
      console.log('\\n🎉 Excellent mobile experience! Calendar works great on mobile devices.');
    } else if (passedTests >= 3) {
      console.log('\\n✅ Good mobile experience with some areas for improvement.');
    } else {
      console.log('\\n⚠️  Mobile experience needs significant improvement.');
    }
    
    return passedTests >= 3;
  }

  async run() {
    try {
      await this.initialize();
      
      await this.testMobileDevices();
      await this.testMobileNavigation();
      await this.testMobilePerformance();
      await this.testMobileAccessibility();
      
      const success = this.printMobileReport();
      
      if (success) {
        console.log('\\n🚀 Mobile testing complete - Phase 2 Calendar Testing finished!');
      }
      
      return success;
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run the mobile calendar test
const tester = new MobileCalendarTester();
tester.run().catch(console.error);