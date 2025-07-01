/**
 * Apple Premium Design System Verification Script
 * Comprehensive analysis of the 6FB Booking V2 frontend implementation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseURL: 'http://localhost:3001',
  screenshotDir: './design-verification-screenshots',
  outputFile: './apple-design-verification-report.json',
  
  // Pages to test
  pages: [
    { path: '/', name: 'homepage', auth: false },
    { path: '/login', name: 'login', auth: false },
    { path: '/register', name: 'register', auth: false },
    { path: '/dashboard', name: 'dashboard', auth: true },
    { path: '/book', name: 'booking', auth: true },
    { path: '/settings', name: 'settings', auth: true },
    { path: '/admin', name: 'admin', auth: true },
    { path: '/notifications', name: 'notifications', auth: true },
    { path: '/analytics', name: 'analytics', auth: true },
  ],
  
  // Viewports to test
  viewports: [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 },
  ],
  
  // Test user credentials (for auth-required pages)
  testUser: {
    email: 'admin@6fb.com',
    password: 'admin123'
  }
};

class AppleDesignVerifier {
  constructor() {
    this.browser = null;
    this.page = null;
    this.report = {
      timestamp: new Date().toISOString(),
      summary: {},
      pages: {},
      performance: {},
      errors: [],
      designSystem: {
        appliedPages: [],
        missingFeatures: [],
        inconsistencies: []
      }
    };
  }

  async init() {
    console.log('🚀 Starting Apple Design System Verification...\n');
    
    // Create screenshot directory
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }

    // Launch browser with optimized settings
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=TranslateUI',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.report.errors.push({
          type: 'console',
          message: msg.text(),
          url: this.page.url()
        });
      }
    });

    // Enable network monitoring
    this.page.on('response', response => {
      if (!response.ok()) {
        this.report.errors.push({
          type: 'network',
          status: response.status(),
          url: response.url()
        });
      }
    });
  }

  async login() {
    console.log('🔐 Attempting login...');
    
    try {
      await this.page.goto(`${CONFIG.baseURL}/login`);
      await this.page.waitForSelector('input[type="email"]', { timeout: 5000 });
      
      await this.page.type('input[type="email"]', CONFIG.testUser.email);
      await this.page.type('input[type="password"]', CONFIG.testUser.password);
      
      await Promise.all([
        this.page.click('button[type="submit"]'),
        this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 })
      ]);
      
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.log('❌ Login failed:', error.message);
      return false;
    }
  }

  async analyzeDesignSystem(pageName) {
    console.log(`  🎨 Analyzing design system for ${pageName}...`);
    
    try {
      const designAnalysis = await this.page.evaluate(() => {
        const analysis = {
          applePremiumFeatures: {
            glassEffects: false,
            iosColors: false,
            premiumShadows: false,
            iosTypography: false,
            smoothAnimations: false,
            responsiveDesign: false
          },
          componentCoverage: {
            cards: [],
            buttons: [],
            modals: [],
            inputs: []
          },
          colorScheme: {
            primary: null,
            hasGradients: false,
            hasDarkMode: false
          },
          performance: {
            backdropBlurSupport: false,
            animationFramerate: null
          }
        };

        // Check for glass morphism effects
        const glassElements = document.querySelectorAll('.glass, .backdrop-blur-ios, [style*="backdrop-filter"]');
        analysis.applePremiumFeatures.glassEffects = glassElements.length > 0;

        // Check for iOS color system
        const bodyClasses = document.body.className;
        const hasIosColors = bodyClasses.includes('primary-') || 
                           document.querySelector('[class*="primary-"]') !== null ||
                           document.querySelector('[class*="ios-"]') !== null;
        analysis.applePremiumFeatures.iosColors = hasIosColors;

        // Check for premium shadows
        const shadowElements = document.querySelectorAll('[class*="shadow-ios"], [class*="shadow-premium"], [class*="shadow-glass"]');
        analysis.applePremiumFeatures.premiumShadows = shadowElements.length > 0;

        // Check for iOS typography
        const typographyElements = document.querySelectorAll('[class*="text-ios"], [class*="font-ios"]');
        analysis.applePremiumFeatures.iosTypography = typographyElements.length > 0;

        // Check for smooth animations
        const animatedElements = document.querySelectorAll('[class*="transition"], [class*="animate-"]');
        analysis.applePremiumFeatures.smoothAnimations = animatedElements.length > 0;

        // Check responsive design
        const responsiveElements = document.querySelectorAll('[class*="sm:"], [class*="md:"], [class*="lg:"]');
        analysis.applePremiumFeatures.responsiveDesign = responsiveElements.length > 0;

        // Analyze card components
        const cards = document.querySelectorAll('[class*="card"], .rounded-ios');
        analysis.componentCoverage.cards = Array.from(cards).map(card => ({
          hasGlass: card.classList.contains('glass') || card.classList.contains('backdrop-blur'),
          hasElevation: card.classList.toString().includes('shadow-'),
          hasRoundedCorners: card.classList.toString().includes('rounded-'),
          variant: card.className.match(/card-(\w+)/)?.[1] || 'default'
        }));

        // Analyze button components
        const buttons = document.querySelectorAll('button, [role="button"]');
        analysis.componentCoverage.buttons = Array.from(buttons).map(btn => ({
          hasIosStyle: btn.classList.toString().includes('ios') || btn.classList.toString().includes('rounded-'),
          hasTransition: btn.classList.toString().includes('transition'),
          hasElevation: btn.classList.toString().includes('shadow-'),
          variant: btn.className.match(/btn-(\w+)|variant-(\w+)/)?.[1] || 'default'
        }));

        // Check color scheme
        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor = computedStyle.getPropertyValue('--color-primary');
        analysis.colorScheme.primary = primaryColor;
        analysis.colorScheme.hasGradients = document.querySelector('[class*="gradient"]') !== null;
        analysis.colorScheme.hasDarkMode = document.documentElement.classList.contains('dark') || 
                                         document.body.classList.contains('dark');

        // Check backdrop-filter support
        analysis.performance.backdropBlurSupport = CSS.supports('backdrop-filter', 'blur(10px)') || 
                                                  CSS.supports('-webkit-backdrop-filter', 'blur(10px)');

        return analysis;
      });

      return designAnalysis;
    } catch (error) {
      console.log(`  ⚠️  Design analysis failed for ${pageName}:`, error.message);
      return null;
    }
  }

  async measurePerformance() {
    try {
      // Get Core Web Vitals
      const metrics = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = {};
          
          // Get paint metrics
          const paintMetrics = performance.getEntriesByType('paint');
          paintMetrics.forEach(metric => {
            metrics[metric.name] = metric.startTime;
          });

          // Get navigation timing
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
            metrics.loadComplete = navigation.loadEventEnd - navigation.fetchStart;
          }

          // Get layout shift
          let cls = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            }
            metrics.cls = cls;
          }).observe({ type: 'layout-shift', buffered: true });

          setTimeout(() => resolve(metrics), 1000);
        });
      });

      return metrics;
    } catch (error) {
      console.log('  ⚠️  Performance measurement failed:', error.message);
      return {};
    }
  }

  async captureScreenshots(pageName) {
    const screenshots = {};
    
    for (const viewport of CONFIG.viewports) {
      try {
        await this.page.setViewport(viewport);
        await this.page.waitForTimeout(500); // Allow animations to settle
        
        const screenshotPath = path.join(CONFIG.screenshotDir, `${pageName}-${viewport.name}.png`);
        await this.page.screenshot({
          path: screenshotPath,
          fullPage: true,
          type: 'png'
        });
        
        screenshots[viewport.name] = screenshotPath;
        console.log(`  📸 Screenshot saved: ${viewport.name}`);
      } catch (error) {
        console.log(`  ⚠️  Screenshot failed for ${viewport.name}:`, error.message);
      }
    }
    
    return screenshots;
  }

  async testPage(pageConfig) {
    console.log(`\n🔍 Testing page: ${pageConfig.name} (${pageConfig.path})`);
    
    try {
      // Navigate to page
      const response = await this.page.goto(`${CONFIG.baseURL}${pageConfig.path}`, {
        waitUntil: 'networkidle0',
        timeout: 15000
      });

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      // Wait for page to fully load
      await this.page.waitForTimeout(2000);

      // Capture screenshots
      const screenshots = await this.captureScreenshots(pageConfig.name);

      // Analyze design system
      const designAnalysis = await this.analyzeDesignSystem(pageConfig.name);

      // Measure performance
      const performance = await this.measurePerformance();

      // Store results
      this.report.pages[pageConfig.name] = {
        url: `${CONFIG.baseURL}${pageConfig.path}`,
        status: 'success',
        screenshots,
        designAnalysis,
        performance,
        loadTime: performance.loadComplete || 0
      };

      console.log(`✅ Page analysis complete: ${pageConfig.name}`);
      
    } catch (error) {
      console.log(`❌ Page test failed: ${pageConfig.name} - ${error.message}`);
      
      this.report.pages[pageConfig.name] = {
        url: `${CONFIG.baseURL}${pageConfig.path}`,
        status: 'failed',
        error: error.message
      };
    }
  }

  async generateSummary() {
    console.log('\n📊 Generating summary report...');
    
    const pageResults = Object.values(this.report.pages);
    const successfulPages = pageResults.filter(p => p.status === 'success');
    
    this.report.summary = {
      totalPages: pageResults.length,
      successfulPages: successfulPages.length,
      failedPages: pageResults.length - successfulPages.length,
      averageLoadTime: successfulPages.length > 0 ? 
        successfulPages.reduce((sum, p) => sum + (p.loadTime || 0), 0) / successfulPages.length : 0,
      totalErrors: this.report.errors.length,
      
      designSystemCoverage: {
        pagesWithGlass: successfulPages.filter(p => p.designAnalysis?.applePremiumFeatures?.glassEffects).length,
        pagesWithIosColors: successfulPages.filter(p => p.designAnalysis?.applePremiumFeatures?.iosColors).length,
        pagesWithPremiumShadows: successfulPages.filter(p => p.designAnalysis?.applePremiumFeatures?.premiumShadows).length,
        pagesWithIosTypography: successfulPages.filter(p => p.designAnalysis?.applePremiumFeatures?.iosTypography).length,
        overallCoverageScore: 0
      }
    };

    // Calculate overall coverage score
    const features = this.report.summary.designSystemCoverage;
    const totalFeatures = 4; // glass, colors, shadows, typography
    const coverageSum = features.pagesWithGlass + features.pagesWithIosColors + 
                       features.pagesWithPremiumShadows + features.pagesWithIosTypography;
    features.overallCoverageScore = successfulPages.length > 0 ? 
      (coverageSum / (totalFeatures * successfulPages.length)) * 100 : 0;
  }

  async run() {
    try {
      await this.init();
      
      // First, try to login for auth-required pages
      const loginSuccess = await this.login();
      
      // Test all pages
      for (const pageConfig of CONFIG.pages) {
        if (pageConfig.auth && !loginSuccess) {
          console.log(`⏭️  Skipping auth-required page: ${pageConfig.name}`);
          continue;
        }
        
        await this.testPage(pageConfig);
      }
      
      // Generate summary
      await this.generateSummary();
      
      // Save report
      fs.writeFileSync(CONFIG.outputFile, JSON.stringify(this.report, null, 2));
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🎨 APPLE DESIGN SYSTEM VERIFICATION REPORT');
    console.log('='.repeat(60));
    
    const summary = this.report.summary;
    
    console.log(`📄 Pages Tested: ${summary.totalPages}`);
    console.log(`✅ Successful: ${summary.successfulPages}`);
    console.log(`❌ Failed: ${summary.failedPages}`);
    console.log(`⚡ Average Load Time: ${summary.averageLoadTime.toFixed(2)}ms`);
    console.log(`🚨 Total Errors: ${summary.totalErrors}`);
    
    console.log('\n🎨 Design System Coverage:');
    const coverage = summary.designSystemCoverage;
    console.log(`  Glass Effects: ${coverage.pagesWithGlass}/${summary.successfulPages} pages`);
    console.log(`  iOS Colors: ${coverage.pagesWithIosColors}/${summary.successfulPages} pages`);
    console.log(`  Premium Shadows: ${coverage.pagesWithPremiumShadows}/${summary.successfulPages} pages`);
    console.log(`  iOS Typography: ${coverage.pagesWithIosTypography}/${summary.successfulPages} pages`);
    console.log(`  Overall Score: ${coverage.overallCoverageScore.toFixed(1)}%`);
    
    console.log(`\n📊 Full report saved to: ${CONFIG.outputFile}`);
    console.log(`📸 Screenshots saved to: ${CONFIG.screenshotDir}/`);
    
    if (coverage.overallCoverageScore >= 80) {
      console.log('\n🎉 Apple Design System is WELL IMPLEMENTED!');
    } else if (coverage.overallCoverageScore >= 60) {
      console.log('\n⚠️  Apple Design System is PARTIALLY IMPLEMENTED');
    } else {
      console.log('\n❌ Apple Design System needs MORE WORK');
    }
  }
}

// Run the verification
const verifier = new AppleDesignVerifier();
verifier.run().catch(console.error);