#!/usr/bin/env node

/**
 * Calendar UX and Accessibility Test
 * Tests user experience quality, accessibility compliance, and interaction polish
 */

const { chromium } = require('playwright');

class CalendarUXTester {
  constructor() {
    this.browser = null;
    this.results = {
      visualDesign: false,
      interaction: false,
      accessibility: false,
      userFlow: false,
      responsiveDesign: false,
      errorHandling: false
    };
    this.insights = [];
  }

  async initialize() {
    console.log('✨ Calendar UX & Accessibility Test');
    console.log('===================================');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 500
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testVisualDesign() {
    console.log('\n🎨 Visual Design & Layout Test');
    console.log('==============================');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForTimeout(3000);
      
      const visualAnalysis = await page.evaluate(() => {
        return {
          // Color and typography
          hasCSSLoaded: getComputedStyle(document.body).fontSize !== '16px' ||
                       getComputedStyle(document.body).fontFamily !== 'Times',
          
          // Layout structure
          hasHeader: document.querySelector('header, nav, [role="banner"]') !== null,
          hasMainContent: document.querySelector('main, [role="main"], .main-content') !== null,
          hasFooter: document.querySelector('footer, [role="contentinfo"]') !== null,
          
          // Navigation elements
          hasNavigation: document.querySelector('nav, [role="navigation"]') !== null,
          navigationItems: document.querySelectorAll('nav a, nav button').length,
          
          // Calendar-specific design elements
          hasCalendarContainer: document.querySelector('[class*="calendar"], table, .grid') !== null,
          hasDateElements: document.querySelectorAll('[class*="date"], td, [data-date]').length,
          hasInteractiveElements: document.querySelectorAll('button, [role="button"], .clickable').length,
          
          // Visual hierarchy
          hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
          headingStructure: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
            tag: h.tagName,
            text: h.textContent?.trim().substring(0, 50)
          })),
          
          // Responsive indicators
          hasResponsiveClasses: document.querySelector('[class*="sm:"], [class*="md:"], [class*="lg:"]') !== null,
          viewportWidth: window.innerWidth,
          
          // Brand consistency
          hasLogo: document.querySelector('img[alt*="logo"], .logo, [class*="logo"]') !== null,
          hasBrandColors: document.body.innerHTML.includes('black') || 
                         document.body.innerHTML.includes('#000'),
          
          // Content quality
          hasLoadingStates: document.querySelector('[class*="loading"], [class*="skeleton"]') !== null,
          hasEmptyStates: document.body.textContent.toLowerCase().includes('no appointments') ||
                         document.body.textContent.toLowerCase().includes('empty'),
          
          // Overall page quality
          totalElements: document.querySelectorAll('*').length,
          hasRichContent: document.body.textContent.length > 500
        };
      });
      
      console.log('📊 Visual Design Analysis:');
      console.log(`  CSS Loaded: ${visualAnalysis.hasCSSLoaded ? '✅' : '❌'}`);
      console.log(`  Layout Structure: ${visualAnalysis.hasHeader && visualAnalysis.hasMainContent ? '✅' : '❌'}`);
      console.log(`  Navigation: ${visualAnalysis.hasNavigation ? '✅' : '❌'} (${visualAnalysis.navigationItems} items)`);
      console.log(`  Calendar Design: ${visualAnalysis.hasCalendarContainer ? '✅' : '❌'}`);
      console.log(`  Date Elements: ${visualAnalysis.hasDateElements}`);
      console.log(`  Interactive Elements: ${visualAnalysis.hasInteractiveElements}`);
      console.log(`  Heading Structure: ${visualAnalysis.hasHeadings} headings`);
      console.log(`  Responsive Design: ${visualAnalysis.hasResponsiveClasses ? '✅' : '❌'}`);
      console.log(`  Brand Elements: ${visualAnalysis.hasLogo ? '✅' : '❌'}`);
      
      // Print heading structure for accessibility review
      if (visualAnalysis.headingStructure.length > 0) {
        console.log('  Heading Hierarchy:');
        visualAnalysis.headingStructure.forEach(h => {
          console.log(`    ${h.tag}: "${h.text}"`);
        });
      }
      
      // Overall visual design score
      const designScore = [
        visualAnalysis.hasCSSLoaded,
        visualAnalysis.hasHeader && visualAnalysis.hasMainContent,
        visualAnalysis.hasNavigation,
        visualAnalysis.hasCalendarContainer,
        visualAnalysis.hasInteractiveElements > 0,
        visualAnalysis.hasRichContent
      ].filter(Boolean).length;
      
      this.results.visualDesign = designScore >= 5; // 5/6 criteria met
      console.log(`  ${this.results.visualDesign ? '✅' : '❌'} Visual Design Score: ${designScore}/6`);
      
      if (this.results.visualDesign) {
        this.insights.push('Visual design is well-structured and professional');
      } else {
        this.insights.push('Visual design needs improvement in layout or styling');
      }
      
    } catch (error) {
      console.log(`  ❌ Visual design test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testInteractionQuality() {
    console.log('\n🖱️  Interaction Quality Test');
    console.log('============================');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForTimeout(3000);
      
      // Test hover states and feedback
      const interactionTest = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const links = document.querySelectorAll('a');
        const clickableElements = document.querySelectorAll('[onclick], [role="button"], .cursor-pointer');
        
        return {
          totalButtons: buttons.length,
          totalLinks: links.length,
          totalClickable: clickableElements.length,
          
          // Check for interaction feedback
          hasHoverStates: Array.from(buttons).some(btn => {
            const style = getComputedStyle(btn);
            return style.cursor === 'pointer' || btn.classList.contains('hover:');
          }),
          
          // Check for focus states
          hasFocusStyles: document.querySelector('[class*="focus:"], button:focus') !== null,
          
          // Check for disabled states
          hasDisabledStates: document.querySelector('button:disabled, [aria-disabled="true"]') !== null,
          
          // Check for loading states
          hasLoadingStates: document.querySelector('[class*="loading"], .spinner') !== null,
          
          // Check button text quality
          buttonTexts: Array.from(buttons)
            .map(btn => btn.textContent?.trim())
            .filter(text => text && text.length > 0)
            .slice(0, 10),
          
          // Check for keyboard navigation
          hasTabIndex: document.querySelector('[tabindex]') !== null,
          
          // Check for ARIA labels
          hasAriaLabels: document.querySelector('[aria-label], [aria-labelledby]') !== null
        };
      });
      
      console.log('📊 Interaction Analysis:');
      console.log(`  Interactive Elements: ${interactionTest.totalButtons} buttons, ${interactionTest.totalLinks} links`);
      console.log(`  Hover Feedback: ${interactionTest.hasHoverStates ? '✅' : '❌'}`);
      console.log(`  Focus States: ${interactionTest.hasFocusStyles ? '✅' : '❌'}`);
      console.log(`  Keyboard Navigation: ${interactionTest.hasTabIndex ? '✅' : '❌'}`);
      console.log(`  ARIA Labels: ${interactionTest.hasAriaLabels ? '✅' : '❌'}`);
      
      if (interactionTest.buttonTexts.length > 0) {
        console.log('  Button Labels:', interactionTest.buttonTexts.slice(0, 5).join(', '));
      }
      
      // Test actual button interactions
      console.log('\\n  🔄 Testing Button Interactions...');
      const buttons = await page.$$('button');
      
      let interactionResponses = 0;
      for (const button of buttons.slice(0, 3)) { // Test first 3 buttons
        try {
          const beforeClick = await page.evaluate(() => document.activeElement?.tagName);
          await button.click();
          await page.waitForTimeout(500);
          
          // Check if something happened (focus change, navigation, etc.)
          const afterClick = await page.evaluate(() => ({
            activeElement: document.activeElement?.tagName,
            url: window.location.href
          }));
          
          if (beforeClick !== afterClick.activeElement || afterClick.url !== page.url()) {
            interactionResponses++;
          }
          
        } catch (error) {
          // Button interaction failed, that's ok for testing
        }
      }
      
      console.log(`    Responsive Interactions: ${interactionResponses}/${Math.min(buttons.length, 3)}`);
      
      const interactionScore = [
        interactionTest.totalButtons > 0,
        interactionTest.hasHoverStates,
        interactionTest.hasFocusStyles,
        interactionTest.hasAriaLabels,
        interactionResponses > 0
      ].filter(Boolean).length;
      
      this.results.interaction = interactionScore >= 4; // 4/5 criteria met
      console.log(`  ${this.results.interaction ? '✅' : '❌'} Interaction Quality Score: ${interactionScore}/5`);
      
      if (this.results.interaction) {
        this.insights.push('User interactions are well-designed and responsive');
      } else {
        this.insights.push('User interactions need better feedback and accessibility');
      }
      
    } catch (error) {
      console.log(`  ❌ Interaction test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testAccessibilityCompliance() {
    console.log('\\n♿ Accessibility Compliance Test');
    console.log('=================================');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForTimeout(3000);
      
      const accessibilityAnalysis = await page.evaluate(() => {
        return {
          // Semantic HTML
          hasMainLandmark: document.querySelector('main, [role="main"]') !== null,
          hasNavLandmark: document.querySelector('nav, [role="navigation"]') !== null,
          hasHeadingStructure: document.querySelector('h1') !== null,
          
          // ARIA attributes
          hasAriaLabels: document.querySelectorAll('[aria-label]').length,
          hasAriaDescribedBy: document.querySelectorAll('[aria-describedby]').length,
          hasAriaExpanded: document.querySelectorAll('[aria-expanded]').length,
          hasRoleAttributes: document.querySelectorAll('[role]').length,
          
          // Form accessibility
          hasFormLabels: document.querySelectorAll('label').length,
          hasFieldsets: document.querySelectorAll('fieldset').length,
          hasRequiredFields: document.querySelectorAll('[required], [aria-required="true"]').length,
          
          // Image accessibility
          hasImageAlts: Array.from(document.querySelectorAll('img')).every(img => 
            img.alt !== undefined && img.alt !== ''),
          imageCount: document.querySelectorAll('img').length,
          
          // Color and contrast (basic check)
          hasContrastIssues: false, // Would need more complex analysis
          
          // Keyboard navigation
          hasFocusableElements: document.querySelectorAll('button, a, input, select, textarea, [tabindex]').length,
          hasSkipLinks: document.querySelector('a[href="#main"], .skip-link') !== null,
          
          // Screen reader support
          hasLiveRegions: document.querySelectorAll('[aria-live]').length,
          hasHiddenContent: document.querySelectorAll('[aria-hidden], .sr-only').length,
          
          // Calendar-specific accessibility
          hasTableHeaders: document.querySelectorAll('th').length,
          hasTableScope: document.querySelectorAll('[scope]').length,
          hasDateLabels: document.querySelectorAll('[aria-label*="date"], [title]').length,
          
          // Error handling accessibility
          hasErrorMessages: document.querySelectorAll('[role="alert"], .error, [aria-invalid]').length,
          
          // Overall page structure
          pageTitle: document.title,
          hasLang: document.documentElement.lang !== ''
        };
      });
      
      console.log('📊 Accessibility Analysis:');
      console.log(`  Page Title: "${accessibilityAnalysis.pageTitle}"`);
      console.log(`  Language Attribute: ${accessibilityAnalysis.hasLang ? '✅' : '❌'}`);
      console.log(`  Main Landmark: ${accessibilityAnalysis.hasMainLandmark ? '✅' : '❌'}`);
      console.log(`  Navigation Landmark: ${accessibilityAnalysis.hasNavLandmark ? '✅' : '❌'}`);
      console.log(`  Heading Structure: ${accessibilityAnalysis.hasHeadingStructure ? '✅' : '❌'}`);
      console.log(`  ARIA Labels: ${accessibilityAnalysis.hasAriaLabels} elements`);
      console.log(`  Role Attributes: ${accessibilityAnalysis.hasRoleAttributes} elements`);
      console.log(`  Focusable Elements: ${accessibilityAnalysis.hasFocusableElements}`);
      console.log(`  Image Alt Text: ${accessibilityAnalysis.hasImageAlts ? '✅' : '❌'} (${accessibilityAnalysis.imageCount} images)`);
      console.log(`  Skip Links: ${accessibilityAnalysis.hasSkipLinks ? '✅' : '❌'}`);
      
      // Calendar-specific accessibility
      if (accessibilityAnalysis.hasTableHeaders > 0) {
        console.log(`  Table Headers: ${accessibilityAnalysis.hasTableHeaders} (calendar structure)`);
      }
      if (accessibilityAnalysis.hasDateLabels > 0) {
        console.log(`  Date Labels: ${accessibilityAnalysis.hasDateLabels} (date accessibility)`);
      }
      
      // Calculate accessibility score
      const accessibilityScore = [
        accessibilityAnalysis.hasLang,
        accessibilityAnalysis.hasMainLandmark,
        accessibilityAnalysis.hasHeadingStructure,
        accessibilityAnalysis.hasAriaLabels > 0,
        accessibilityAnalysis.hasFocusableElements > 0,
        accessibilityAnalysis.hasImageAlts,
        accessibilityAnalysis.pageTitle.length > 0
      ].filter(Boolean).length;
      
      this.results.accessibility = accessibilityScore >= 6; // 6/7 criteria met
      console.log(`  ${this.results.accessibility ? '✅' : '❌'} Accessibility Score: ${accessibilityScore}/7`);
      
      if (this.results.accessibility) {
        this.insights.push('Good accessibility compliance with semantic HTML and ARIA');
      } else {
        this.insights.push('Accessibility needs improvement - add ARIA labels and semantic structure');
      }
      
    } catch (error) {
      console.log(`  ❌ Accessibility test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testUserFlow() {
    console.log('\\n🗺️  User Flow & Navigation Test');
    console.log('================================');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      // Test navigation flow
      const pages = [
        { url: 'http://localhost:3000', name: 'Home' },
        { url: 'http://localhost:3000/calendar', name: 'Calendar' },
        { url: 'http://localhost:3000/book', name: 'Booking' },
        { url: 'http://localhost:3000/dashboard', name: 'Dashboard' }
      ];
      
      let navigationSuccess = 0;
      let navigationFlow = [];
      
      for (const testPage of pages) {
        try {
          await page.goto(testPage.url, { timeout: 10000 });
          await page.waitForTimeout(2000);
          
          const pageInfo = await page.evaluate(() => ({
            title: document.title,
            path: window.location.pathname,
            hasContent: document.body.textContent.length > 100,
            hasNavigation: document.querySelector('nav, [role="navigation"]') !== null,
            breadcrumbs: document.querySelector('.breadcrumb, [aria-label*="breadcrumb"]') !== null
          }));
          
          if (pageInfo.hasContent) {
            navigationSuccess++;
            navigationFlow.push({
              page: testPage.name,
              success: true,
              title: pageInfo.title
            });
          } else {
            navigationFlow.push({
              page: testPage.name,
              success: false,
              title: pageInfo.title
            });
          }
          
        } catch (error) {
          navigationFlow.push({
            page: testPage.name,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log('📊 Navigation Flow Analysis:');
      navigationFlow.forEach(nav => {
        console.log(`  ${nav.page}: ${nav.success ? '✅' : '❌'} ${nav.title || nav.error || ''}`);
      });
      
      // Test back/forward navigation
      let browserNavigation = false;
      try {
        await page.goBack();
        await page.waitForTimeout(1000);
        await page.goForward();
        await page.waitForTimeout(1000);
        browserNavigation = true;
        console.log('  Browser Navigation: ✅ Back/Forward works');
      } catch (error) {
        console.log('  Browser Navigation: ❌ Issues detected');
      }
      
      this.results.userFlow = navigationSuccess >= 3 && browserNavigation;
      console.log(`  ${this.results.userFlow ? '✅' : '❌'} User Flow Score: ${navigationSuccess}/4 pages accessible`);
      
      if (this.results.userFlow) {
        this.insights.push('Navigation flow is intuitive and works well');
      } else {
        this.insights.push('Navigation flow needs improvement or has broken links');
      }
      
    } catch (error) {
      console.log(`  ❌ User flow test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testResponsiveDesign() {
    console.log('\\n📱 Responsive Design Test');
    console.log('==========================');
    
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1366, height: 768, name: 'Desktop Standard' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    let responsiveResults = [];
    
    for (const viewport of viewports) {
      const context = await this.browser.newContext({ viewport });
      const page = await context.newPage();
      
      try {
        await page.goto('http://localhost:3000/calendar');
        await page.waitForTimeout(2000);
        
        const responsiveAnalysis = await page.evaluate(() => {
          return {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
            hasResponsiveClasses: document.querySelector('[class*="sm:"], [class*="md:"], [class*="lg:"]') !== null,
            elementsVisible: document.querySelectorAll(':not([style*="display: none"])').length,
            hasOverflow: [...document.querySelectorAll('*')].some(el => {
              const rect = el.getBoundingClientRect();
              return rect.right > window.innerWidth;
            }),
            mobileOptimizations: {
              hasViewportMeta: document.querySelector('meta[name="viewport"]') !== null,
              hasTouchOptimization: document.querySelector('[class*="touch"], [class*="mobile"]') !== null,
              buttonSizes: Array.from(document.querySelectorAll('button')).map(btn => {
                const rect = btn.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
              }).slice(0, 5)
            }
          };
        });
        
        responsiveResults.push({
          viewport: viewport.name,
          width: viewport.width,
          success: !responsiveAnalysis.hasHorizontalScroll && !responsiveAnalysis.hasOverflow,
          details: responsiveAnalysis
        });
        
        console.log(`  ${viewport.name} (${viewport.width}px):`);
        console.log(`    Horizontal Scroll: ${responsiveAnalysis.hasHorizontalScroll ? '❌' : '✅'}`);
        console.log(`    Element Overflow: ${responsiveAnalysis.hasOverflow ? '❌' : '✅'}`);
        console.log(`    Responsive Classes: ${responsiveAnalysis.hasResponsiveClasses ? '✅' : '❌'}`);
        
        if (viewport.width <= 768) { // Mobile/tablet
          console.log(`    Viewport Meta: ${responsiveAnalysis.mobileOptimizations.hasViewportMeta ? '✅' : '❌'}`);
          const avgButtonSize = responsiveAnalysis.mobileOptimizations.buttonSizes.length > 0 ?
            responsiveAnalysis.mobileOptimizations.buttonSizes.reduce((sum, btn) => sum + Math.min(btn.width, btn.height), 0) / responsiveAnalysis.mobileOptimizations.buttonSizes.length : 0;
          console.log(`    Touch Target Size: ${avgButtonSize >= 44 ? '✅' : '⚠️'} (${avgButtonSize.toFixed(0)}px avg)`);
        }
        
      } catch (error) {
        console.log(`    ❌ Failed to test ${viewport.name}: ${error.message}`);
        responsiveResults.push({
          viewport: viewport.name,
          width: viewport.width,
          success: false,
          error: error.message
        });
      }
      
      await context.close();
    }
    
    const responsiveScore = responsiveResults.filter(r => r.success).length;
    this.results.responsiveDesign = responsiveScore >= 3; // 3/4 viewports work well
    console.log(`  ${this.results.responsiveDesign ? '✅' : '❌'} Responsive Design Score: ${responsiveScore}/4 viewports`);
    
    if (this.results.responsiveDesign) {
      this.insights.push('Responsive design works well across different screen sizes');
    } else {
      this.insights.push('Responsive design needs improvement for mobile/tablet compatibility');
    }
  }

  printUXReport() {
    console.log('\\n📋 Calendar UX & Accessibility Report');
    console.log('=======================================');
    
    const tests = [
      { name: 'Visual Design & Layout', passed: this.results.visualDesign },
      { name: 'Interaction Quality', passed: this.results.interaction },
      { name: 'Accessibility Compliance', passed: this.results.accessibility },
      { name: 'User Flow & Navigation', passed: this.results.userFlow },
      { name: 'Responsive Design', passed: this.results.responsiveDesign }
    ];
    
    tests.forEach(test => {
      console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
    });
    
    const passedTests = tests.filter(test => test.passed).length;
    const totalTests = tests.length;
    
    console.log(`\\n🎯 UX Quality Score: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    console.log('\\n💡 Key Insights:');
    this.insights.forEach(insight => {
      console.log(`  • ${insight}`);
    });
    
    if (passedTests >= 4) {
      console.log('\\n🎉 Excellent UX quality! Calendar provides a great user experience.');
    } else if (passedTests >= 3) {
      console.log('\\n✅ Good UX quality with room for minor improvements.');
    } else {
      console.log('\\n⚠️  UX needs significant improvement before proceeding.');
    }
    
    return passedTests >= 4;
  }

  async run() {
    try {
      await this.initialize();
      
      await this.testVisualDesign();
      await this.testInteractionQuality();
      await this.testAccessibilityCompliance();
      await this.testUserFlow();
      await this.testResponsiveDesign();
      
      const success = this.printUXReport();
      
      if (success) {
        console.log('\\n🚀 UX testing complete - ready for mobile testing!');
      }
      
      return success;
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run the UX test
const tester = new CalendarUXTester();
tester.run().catch(console.error);