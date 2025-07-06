/**
 * Registration Page Scrolling Analysis Test
 * 
 * Specifically designed to identify and analyze scrolling issues
 * on the registration page including container overflow, element
 * accessibility, and viewport conflicts.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const {
    CONFIG,
    SELECTORS,
    generateTestUser,
    waitForSelector,
    clickElement,
    fillField,
    takeScreenshot,
    checkForConsoleErrors,
    setupNetworkMonitoring,
    waitForPageLoad,
    generateReport,
    TestResult
} = require('./test-utils');

class RegistrationScrollingTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
        this.measurements = {};
    }

    async init() {
        console.log('🔍 Starting Registration Scrolling Analysis...\n');
        
        this.browser = await puppeteer.launch({
            headless: false, // Always run headed to see scroll issues
            slowMo: 100,
            defaultViewport: { width: 1280, height: 800 },
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-dev-shm-usage'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Set up monitoring
        this.consoleErrors = await checkForConsoleErrors(this.page);
        this.networkMonitoring = setupNetworkMonitoring(this.page);
        
        // Enable console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('🔴 Console Error:', msg.text());
            }
        });
    }

    async measurePageDimensions() {
        const result = new TestResult('Page Dimensions Analysis');
        
        try {
            console.log('📐 Measuring page dimensions and scroll behavior...');
            
            // Navigate to registration page
            await this.page.goto(`${CONFIG.baseUrl}/register`, { waitUntil: 'networkidle2' });
            result.addStep('Navigate to registration page', true);
            
            // Wait for page to fully load
            await this.page.waitForTimeout(2000);
            
            // Get page dimensions
            const dimensions = await this.page.evaluate(() => {
                return {
                    // Viewport dimensions
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight,
                    
                    // Document dimensions
                    documentWidth: document.documentElement.scrollWidth,
                    documentHeight: document.documentElement.scrollHeight,
                    
                    // Body dimensions
                    bodyWidth: document.body.scrollWidth,
                    bodyHeight: document.body.scrollHeight,
                    
                    // Scroll position
                    scrollTop: window.pageYOffset || document.documentElement.scrollTop,
                    scrollLeft: window.pageXOffset || document.documentElement.scrollLeft,
                    
                    // Maximum scroll
                    maxScrollTop: Math.max(
                        document.body.scrollHeight - window.innerHeight,
                        document.documentElement.scrollHeight - window.innerHeight,
                        0
                    ),
                    maxScrollLeft: Math.max(
                        document.body.scrollWidth - window.innerWidth,
                        document.documentElement.scrollWidth - window.innerWidth,
                        0
                    ),
                    
                    // Check for overflow containers
                    overflowContainers: Array.from(document.querySelectorAll('*')).filter(el => {
                        const style = window.getComputedStyle(el);
                        return style.overflow === 'hidden' || 
                               style.overflowY === 'hidden' || 
                               style.overflowX === 'hidden';
                    }).map(el => ({
                        tagName: el.tagName,
                        className: el.className,
                        id: el.id,
                        overflow: window.getComputedStyle(el).overflow,
                        overflowY: window.getComputedStyle(el).overflowY,
                        height: el.offsetHeight,
                        scrollHeight: el.scrollHeight
                    }))
                };
            });
            
            this.measurements.dimensions = dimensions;
            
            console.log('   Viewport:', dimensions.viewportWidth + 'x' + dimensions.viewportHeight);
            console.log('   Document:', dimensions.documentWidth + 'x' + dimensions.documentHeight);
            console.log('   Max Scroll:', dimensions.maxScrollTop + 'px vertically');
            console.log('   Overflow containers found:', dimensions.overflowContainers.length);
            
            result.addStep('Measure page dimensions', true, dimensions);
            
            // Check if page is scrollable
            const isScrollable = dimensions.maxScrollTop > 0 || dimensions.maxScrollLeft > 0;
            result.addStep('Page is scrollable', isScrollable, {
                verticalScroll: dimensions.maxScrollTop,
                horizontalScroll: dimensions.maxScrollLeft
            });
            
            // Take screenshot of initial state
            const initialScreenshot = await takeScreenshot(this.page, 'registration-initial-state');
            result.addScreenshot(initialScreenshot);
            
            result.finish(true);
            console.log('✅ Page dimensions analysis completed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Page dimensions analysis failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testScrollBehavior() {
        const result = new TestResult('Scroll Behavior Test');
        
        try {
            console.log('🔄 Testing scroll behavior and accessibility...');
            
            // Test vertical scrolling
            console.log('   Testing vertical scroll...');
            
            // Scroll to different positions and take screenshots
            const scrollPositions = [0, 0.25, 0.5, 0.75, 1.0];
            const scrollResults = [];
            
            for (let i = 0; i < scrollPositions.length; i++) {
                const position = scrollPositions[i];
                
                // Calculate scroll position
                const scrollTop = Math.round(this.measurements.dimensions.maxScrollTop * position);
                
                console.log(`   Scrolling to ${Math.round(position * 100)}% (${scrollTop}px)...`);
                
                // Scroll to position
                await this.page.evaluate((scrollTop) => {
                    window.scrollTo(0, scrollTop);
                }, scrollTop);
                
                // Wait for scroll to complete
                await this.page.waitForTimeout(500);
                
                // Get actual scroll position
                const actualScrollTop = await this.page.evaluate(() => window.pageYOffset);
                
                // Check visible elements
                const visibleElements = await this.page.evaluate(() => {
                    const elements = document.querySelectorAll('button, input, select, textarea, a[href]');
                    const visible = [];
                    
                    elements.forEach((el, index) => {
                        const rect = el.getBoundingClientRect();
                        const isVisible = rect.top >= 0 && 
                                         rect.bottom <= window.innerHeight && 
                                         rect.left >= 0 && 
                                         rect.right <= window.innerWidth;
                        
                        if (isVisible) {
                            visible.push({
                                tagName: el.tagName,
                                type: el.type,
                                className: el.className,
                                id: el.id,
                                text: el.textContent ? el.textContent.substring(0, 50) : '',
                                rect: {
                                    top: Math.round(rect.top),
                                    bottom: Math.round(rect.bottom),
                                    left: Math.round(rect.left),
                                    right: Math.round(rect.right),
                                    width: Math.round(rect.width),
                                    height: Math.round(rect.height)
                                }
                            });
                        }
                    });
                    
                    return visible;
                });
                
                scrollResults.push({
                    requestedPosition: scrollTop,
                    actualPosition: actualScrollTop,
                    visibleElements: visibleElements.length,
                    elements: visibleElements
                });
                
                // Take screenshot at this scroll position
                const screenshot = await takeScreenshot(this.page, `scroll-position-${Math.round(position * 100)}`);
                result.addScreenshot(screenshot);
            }
            
            result.addStep('Test scroll positions', true, { scrollResults });
            
            // Test if all form elements are reachable
            console.log('   Checking form element accessibility...');
            
            const formAnalysis = await this.page.evaluate(() => {
                const formElements = document.querySelectorAll('input, select, textarea, button[type="submit"]');
                const unreachable = [];
                const reachable = [];
                
                formElements.forEach((el, index) => {
                    const rect = el.getBoundingClientRect();
                    const isInViewport = rect.top >= -window.innerHeight && 
                                        rect.bottom <= window.innerHeight * 2;
                    
                    const elementInfo = {
                        index,
                        tagName: el.tagName,
                        type: el.type,
                        className: el.className,
                        id: el.id,
                        placeholder: el.placeholder || '',
                        value: el.value || '',
                        rect: {
                            top: Math.round(rect.top),
                            bottom: Math.round(rect.bottom),
                            height: Math.round(rect.height)
                        },
                        isInViewport
                    };
                    
                    if (isInViewport) {
                        reachable.push(elementInfo);
                    } else {
                        unreachable.push(elementInfo);
                    }
                });
                
                return {
                    total: formElements.length,
                    reachable: reachable.length,
                    unreachable: unreachable.length,
                    unreachableElements: unreachable,
                    reachableElements: reachable
                };
            });
            
            console.log(`   Form elements: ${formAnalysis.total} total, ${formAnalysis.reachable} reachable, ${formAnalysis.unreachable} unreachable`);
            
            result.addStep('Analyze form accessibility', true, formAnalysis);
            
            // Test smooth scrolling to important elements
            console.log('   Testing scroll to form elements...');
            
            const importantSelectors = [
                'input[type="email"]',
                'input[type="password"]',
                'button[type="submit"]',
                '.business-type-option',
                '[data-testid="continue-button"]'
            ];
            
            for (const selector of importantSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        console.log(`   Scrolling to: ${selector}`);
                        
                        // Get element position before scroll
                        const beforeRect = await element.boundingBox();
                        
                        // Scroll element into view
                        await element.scrollIntoView();
                        await this.page.waitForTimeout(300);
                        
                        // Get element position after scroll
                        const afterRect = await element.boundingBox();
                        
                        // Check if element is now visible
                        const isVisible = afterRect && 
                                         afterRect.y >= 0 && 
                                         afterRect.y + afterRect.height <= this.measurements.dimensions.viewportHeight;
                        
                        result.addStep(`Scroll to ${selector}`, isVisible, {
                            beforePosition: beforeRect,
                            afterPosition: afterRect,
                            isVisible
                        });
                    }
                } catch (error) {
                    console.log(`   Element not found: ${selector}`);
                }
            }
            
            result.finish(true);
            console.log('✅ Scroll behavior test completed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Scroll behavior test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testMobileScrolling() {
        const result = new TestResult('Mobile Scrolling Test');
        
        try {
            console.log('📱 Testing mobile viewport scrolling...');
            
            // Set mobile viewport
            await this.page.setViewport({ width: 375, height: 667 }); // iPhone 6/7/8
            
            // Reload page with mobile viewport
            await this.page.reload({ waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(2000);
            
            // Get mobile dimensions
            const mobileDimensions = await this.page.evaluate(() => {
                return {
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight,
                    documentHeight: document.documentElement.scrollHeight,
                    maxScrollTop: Math.max(
                        document.body.scrollHeight - window.innerHeight,
                        document.documentElement.scrollHeight - window.innerHeight,
                        0
                    )
                };
            });
            
            console.log('   Mobile viewport:', mobileDimensions.viewportWidth + 'x' + mobileDimensions.viewportHeight);
            console.log('   Mobile document height:', mobileDimensions.documentHeight);
            console.log('   Mobile max scroll:', mobileDimensions.maxScrollTop);
            
            result.addStep('Set mobile viewport', true, mobileDimensions);
            
            // Take mobile screenshot
            const mobileScreenshot = await takeScreenshot(this.page, 'mobile-initial');
            result.addScreenshot(mobileScreenshot);
            
            // Test mobile scrolling
            if (mobileDimensions.maxScrollTop > 0) {
                console.log('   Testing mobile scroll...');
                
                // Scroll to middle
                await this.page.evaluate(() => {
                    window.scrollTo(0, window.innerHeight);
                });
                await this.page.waitForTimeout(500);
                
                const mobileMiddleScreenshot = await takeScreenshot(this.page, 'mobile-middle-scroll');
                result.addScreenshot(mobileMiddleScreenshot);
                
                // Scroll to bottom
                await this.page.evaluate(() => {
                    window.scrollTo(0, document.documentElement.scrollHeight);
                });
                await this.page.waitForTimeout(500);
                
                const mobileBottomScreenshot = await takeScreenshot(this.page, 'mobile-bottom-scroll');
                result.addScreenshot(mobileBottomScreenshot);
                
                result.addStep('Test mobile scrolling', true);
            } else {
                result.addStep('Mobile page not scrollable', false);
            }
            
            // Test touch scrolling simulation
            console.log('   Simulating touch scroll...');
            try {
                await this.page.touchscreen.tap(200, 300);
                await this.page.waitForTimeout(100);
                
                // Simulate swipe up (scroll down)
                await this.page.touchscreen.tap(200, 400);
                await this.page.touchscreen.tap(200, 200);
                await this.page.waitForTimeout(500);
                
                result.addStep('Touch scroll simulation', true);
            } catch (error) {
                result.addStep('Touch scroll simulation', false, { error: error.message });
            }
            
            result.finish(true);
            console.log('✅ Mobile scrolling test completed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Mobile scrolling test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testFormInteraction() {
        const result = new TestResult('Form Interaction During Scroll');
        
        try {
            console.log('📝 Testing form interaction while scrolling...');
            
            // Reset to desktop viewport
            await this.page.setViewport({ width: 1280, height: 800 });
            await this.page.reload({ waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(2000);
            
            const testUser = generateTestUser();
            
            // Try to complete the registration form step by step
            console.log('   Step 1: Business Type Selection');
            
            // Look for business type options
            const businessTypes = await this.page.$$('.business-type-option, [data-testid*="business"], .card');
            if (businessTypes.length > 0) {
                console.log(`   Found ${businessTypes.length} business type options`);
                
                // Try to click the first option
                const firstOption = businessTypes[0];
                const beforeClick = await firstOption.boundingBox();
                
                // Scroll to element if needed
                await firstOption.scrollIntoView();
                await this.page.waitForTimeout(500);
                
                const afterScroll = await firstOption.boundingBox();
                
                try {
                    await firstOption.click();
                    await this.page.waitForTimeout(1000);
                    
                    result.addStep('Click business type option', true, {
                        beforeClick,
                        afterScroll,
                        clicked: true
                    });
                } catch (error) {
                    result.addStep('Click business type option', false, {
                        error: error.message,
                        beforeClick,
                        afterScroll
                    });
                }
            }
            
            // Look for continue/next button
            const continueButton = await this.page.$('button:has-text("Continue"), button:has-text("Next"), [data-testid="continue"]');
            if (continueButton) {
                console.log('   Found continue button');
                
                const buttonRect = await continueButton.boundingBox();
                const isVisible = buttonRect && 
                                 buttonRect.y >= 0 && 
                                 buttonRect.y + buttonRect.height <= 800;
                
                console.log(`   Continue button visible: ${isVisible}`);
                
                if (!isVisible) {
                    console.log('   Scrolling to continue button...');
                    await continueButton.scrollIntoView();
                    await this.page.waitForTimeout(500);
                }
                
                try {
                    await continueButton.click();
                    await this.page.waitForTimeout(2000);
                    
                    result.addStep('Click continue button', true, {
                        buttonPosition: buttonRect,
                        wasVisible: isVisible
                    });
                } catch (error) {
                    result.addStep('Click continue button', false, {
                        error: error.message,
                        buttonPosition: buttonRect
                    });
                }
            }
            
            // Test form field interaction
            console.log('   Step 2: Form Fields');
            
            const formFields = [
                { selector: 'input[name="firstName"], input[placeholder*="first" i]', value: testUser.firstName },
                { selector: 'input[name="lastName"], input[placeholder*="last" i]', value: testUser.lastName },
                { selector: 'input[type="email"]', value: testUser.email },
                { selector: 'input[type="password"]', value: testUser.password }
            ];
            
            for (const field of formFields) {
                try {
                    const element = await this.page.$(field.selector);
                    if (element) {
                        console.log(`   Testing field: ${field.selector}`);
                        
                        // Scroll to field
                        await element.scrollIntoView();
                        await this.page.waitForTimeout(300);
                        
                        // Get field position
                        const fieldRect = await element.boundingBox();
                        
                        // Try to click and type
                        await element.click();
                        await this.page.waitForTimeout(100);
                        
                        // Clear and type
                        await element.click({ clickCount: 3 }); // Select all
                        await element.type(field.value);
                        
                        result.addStep(`Fill field ${field.selector}`, true, {
                            position: fieldRect,
                            value: field.value
                        });
                    }
                } catch (error) {
                    result.addStep(`Fill field ${field.selector}`, false, {
                        error: error.message
                    });
                }
            }
            
            // Take screenshot of filled form
            const filledFormScreenshot = await takeScreenshot(this.page, 'form-filled');
            result.addScreenshot(filledFormScreenshot);
            
            result.finish(true);
            console.log('✅ Form interaction test completed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Form interaction test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async generateScrollingReport() {
        console.log('\n📊 Generating Scrolling Analysis Report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            testDuration: Date.now() - this.startTime,
            totalTests: this.results.length,
            passed: this.results.filter(r => r.passed).length,
            failed: this.results.filter(r => !r.passed).length,
            measurements: this.measurements,
            consoleErrors: this.consoleErrors.length,
            findings: [],
            recommendations: []
        };
        
        // Analyze findings
        if (this.measurements.dimensions) {
            const dims = this.measurements.dimensions;
            
            // Check for scroll issues
            if (dims.maxScrollTop === 0 && dims.documentHeight > dims.viewportHeight) {
                report.findings.push('⚠️ Page content exceeds viewport but scrolling is disabled');
                report.recommendations.push('Check for overflow:hidden on html/body elements');
            }
            
            if (dims.overflowContainers.length > 3) {
                report.findings.push(`⚠️ Many overflow:hidden containers found (${dims.overflowContainers.length})`);
                report.recommendations.push('Review container overflow settings for scrollability');
            }
        }
        
        // Check test results for patterns
        const scrollTests = this.results.filter(r => r.testName.includes('Scroll'));
        const failedScrollTests = scrollTests.filter(r => !r.passed);
        
        if (failedScrollTests.length > 0) {
            report.findings.push('❌ Multiple scroll-related test failures detected');
            report.recommendations.push('Review page layout and container CSS properties');
        }
        
        // Console errors analysis
        if (this.consoleErrors.length > 0) {
            report.findings.push(`⚠️ ${this.consoleErrors.length} console errors detected during testing`);
            report.recommendations.push('Fix JavaScript errors that may affect scroll behavior');
        }
        
        // Save report
        const reportPath = path.join(CONFIG.reportDir, `scrolling-analysis-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📋 Scrolling Analysis Summary:');
        console.log('=====================================');
        console.log(`Total Tests: ${report.totalTests}`);
        console.log(`Passed: ${report.passed} ✅`);
        console.log(`Failed: ${report.failed} ❌`);
        console.log(`Console Errors: ${report.consoleErrors}`);
        console.log(`\nFindings: ${report.findings.length}`);
        report.findings.forEach(finding => console.log(`  ${finding}`));
        console.log(`\nRecommendations: ${report.recommendations.length}`);
        report.recommendations.forEach(rec => console.log(`  • ${rec}`));
        console.log(`\nFull report saved to: ${reportPath}`);
        
        return report;
    }

    async runAllScrollTests() {
        this.startTime = Date.now();
        
        try {
            await this.init();
            
            // Run scrolling-specific tests
            await this.measurePageDimensions();
            await this.testScrollBehavior();
            await this.testMobileScrolling();
            await this.testFormInteraction();
            
            // Generate comprehensive report
            const report = await this.generateScrollingReport();
            
            return report;
            
        } catch (error) {
            console.error('❌ Scrolling test suite failed:', error.message);
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new RegistrationScrollingTester();
    tester.runAllScrollTests()
        .then(report => {
            console.log('\n🎉 Scrolling analysis completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Scrolling analysis failed:', error.message);
            process.exit(1);
        });
}

module.exports = RegistrationScrollingTester;