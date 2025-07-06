/**
 * Mobile Responsiveness Test Suite
 * 
 * Tests responsive design on different viewport sizes, mobile navigation,
 * touch interactions, and responsive layouts
 */

const puppeteer = require('puppeteer');
const {
    CONFIG,
    TEST_USERS,
    SELECTORS,
    waitForSelector,
    clickElement,
    fillField,
    takeScreenshot,
    checkForConsoleErrors,
    setupNetworkMonitoring,
    login,
    generateReport,
    TestResult
} = require('./test-utils');

// Device configurations
const DEVICES = {
    iPhoneSE: { name: 'iPhone SE', width: 375, height: 667, isMobile: true, hasTouch: true },
    iPhone12: { name: 'iPhone 12', width: 390, height: 844, isMobile: true, hasTouch: true },
    iPadMini: { name: 'iPad Mini', width: 768, height: 1024, isMobile: true, hasTouch: true },
    iPadPro: { name: 'iPad Pro', width: 1024, height: 1366, isMobile: true, hasTouch: true },
    GalaxyS21: { name: 'Galaxy S21', width: 360, height: 800, isMobile: true, hasTouch: true },
    Desktop: { name: 'Desktop', width: 1920, height: 1080, isMobile: false, hasTouch: false }
};

class MobileResponsiveTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
    }

    async init() {
        console.log('🚀 Starting Mobile Responsiveness Tests...\n');
        
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            defaultViewport: null,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Set up monitoring
        this.consoleErrors = await checkForConsoleErrors(this.page);
        this.networkMonitoring = setupNetworkMonitoring(this.page);
    }

    async testDeviceLayouts() {
        const result = new TestResult('Device Layouts Test');
        
        try {
            console.log('📍 Test: Device Layouts');
            
            // Test each device
            for (const [key, device] of Object.entries(DEVICES)) {
                console.log(`\n   Testing ${device.name} (${device.width}x${device.height})`);
                
                // Set viewport
                await this.page.setViewport({
                    width: device.width,
                    height: device.height,
                    isMobile: device.isMobile,
                    hasTouch: device.hasTouch
                });
                
                // Navigate to homepage
                await this.page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'networkidle2' });
                
                // Check viewport meta tag
                const hasViewportMeta = await this.page.evaluate(() => {
                    const meta = document.querySelector('meta[name="viewport"]');
                    return meta && meta.content.includes('width=device-width');
                });
                result.addStep(`${device.name}: Has viewport meta tag`, hasViewportMeta);
                
                // Check for horizontal scroll
                const hasHorizontalScroll = await this.page.evaluate(() => {
                    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
                });
                result.addStep(`${device.name}: No horizontal scroll`, !hasHorizontalScroll);
                
                // Check text readability
                const textReadability = await this.page.evaluate(() => {
                    const elements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6');
                    let tooSmall = 0;
                    elements.forEach(el => {
                        const styles = window.getComputedStyle(el);
                        const fontSize = parseFloat(styles.fontSize);
                        if (fontSize < 12) tooSmall++;
                    });
                    return {
                        totalText: elements.length,
                        tooSmall: tooSmall,
                        readable: tooSmall === 0
                    };
                });
                result.addStep(`${device.name}: Text readable`, textReadability.readable, textReadability);
                
                // Check button/link sizes for touch
                if (device.hasTouch) {
                    const touchTargets = await this.page.evaluate(() => {
                        const targets = document.querySelectorAll('button, a, input, select, textarea');
                        let tooSmall = 0;
                        targets.forEach(el => {
                            const rect = el.getBoundingClientRect();
                            if (rect.width < 44 || rect.height < 44) {
                                tooSmall++;
                            }
                        });
                        return {
                            total: targets.length,
                            tooSmall: tooSmall,
                            adequate: tooSmall / targets.length < 0.1 // Less than 10% too small
                        };
                    });
                    result.addStep(`${device.name}: Touch targets adequate`, touchTargets.adequate, touchTargets);
                }
                
                // Take screenshot
                const screenshot = await takeScreenshot(this.page, `layout-${key.toLowerCase()}`);
                result.addScreenshot(screenshot);
            }
            
            result.finish(true);
            console.log('\n✅ Device layouts test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Device layouts test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testMobileNavigation() {
        const result = new TestResult('Mobile Navigation Test');
        
        try {
            console.log('\n📍 Test: Mobile Navigation');
            
            // Set mobile viewport
            await this.page.setViewport(DEVICES.iPhone12);
            
            // Navigate to homepage
            await this.page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'networkidle2' });
            
            // Check for mobile menu button
            const mobileMenuButton = await this.page.$('.mobile-menu-button, .hamburger, .menu-toggle, button[aria-label*="menu"]');
            result.addStep('Mobile menu button exists', !!mobileMenuButton);
            
            if (mobileMenuButton) {
                // Check if desktop nav is hidden
                const desktopNavHidden = await this.page.evaluate(() => {
                    const nav = document.querySelector('.desktop-nav, nav.hidden-mobile, .main-nav');
                    if (!nav) return true;
                    const styles = window.getComputedStyle(nav);
                    return styles.display === 'none' || styles.visibility === 'hidden';
                });
                result.addStep('Desktop navigation hidden on mobile', desktopNavHidden);
                
                // Click menu button
                await mobileMenuButton.click();
                await this.page.waitForTimeout(500);
                
                // Check if menu opened
                const mobileMenu = await this.page.$('.mobile-menu, .nav-open, .sidebar-open, [data-state="open"]');
                result.addStep('Mobile menu opens', !!mobileMenu);
                
                // Take screenshot of open menu
                const menuOpenScreenshot = await takeScreenshot(this.page, 'mobile-menu-open');
                result.addScreenshot(menuOpenScreenshot);
                
                // Check menu items
                const menuItems = await this.page.$$('.mobile-menu a, .nav-open a, nav[data-state="open"] a');
                result.addStep('Menu items present', menuItems.length > 0, { count: menuItems.length });
                
                // Test menu close
                const closeButton = await this.page.$('.close-menu, .menu-close, button[aria-label*="close"]');
                if (closeButton) {
                    await closeButton.click();
                } else {
                    // Try clicking menu button again
                    await mobileMenuButton.click();
                }
                await this.page.waitForTimeout(500);
                
                // Verify menu closed
                const menuClosed = await this.page.evaluate(() => {
                    const menu = document.querySelector('.mobile-menu, .nav-open, [data-state="open"]');
                    return !menu || menu.getAttribute('data-state') === 'closed';
                });
                result.addStep('Mobile menu closes', menuClosed);
                
                // Test navigation link
                await mobileMenuButton.click();
                await this.page.waitForTimeout(500);
                
                const firstLink = await this.page.$('.mobile-menu a:first-child, nav[data-state="open"] a:first-child');
                if (firstLink) {
                    const linkText = await firstLink.evaluate(el => el.textContent);
                    await firstLink.click();
                    await this.page.waitForTimeout(1000);
                    
                    // Check if navigation occurred
                    const navigated = await this.page.evaluate((text) => {
                        return !document.querySelector('.mobile-menu-open, [data-state="open"]');
                    }, linkText);
                    result.addStep('Navigation closes menu', navigated);
                }
            }
            
            // Test bottom navigation (if present)
            const bottomNav = await this.page.$('.bottom-nav, .tab-bar, nav[class*="bottom"]');
            if (bottomNav) {
                result.addStep('Bottom navigation present', true);
                
                const bottomNavItems = await bottomNav.$$('a, button');
                result.addStep('Bottom nav items', bottomNavItems.length > 0, { count: bottomNavItems.length });
            }
            
            result.finish(true);
            console.log('✅ Mobile navigation test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Mobile navigation test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testTouchInteractions() {
        const result = new TestResult('Touch Interactions Test');
        
        try {
            console.log('\n📍 Test: Touch Interactions');
            
            // Set mobile viewport with touch
            await this.page.setViewport({
                ...DEVICES.iPhone12,
                hasTouch: true
            });
            
            // Login first
            await login(this.page, 'client');
            
            // Navigate to a page with interactive elements
            await this.page.goto(`${CONFIG.baseUrl}/book`, { waitUntil: 'networkidle2' });
            
            // Test swipe gestures on carousel/slider (if present)
            const carousel = await this.page.$('.carousel, .slider, .swiper');
            if (carousel) {
                console.log('   Testing carousel/slider swipe');
                
                const box = await carousel.boundingBox();
                if (box) {
                    // Simulate swipe
                    await this.page.touchscreen.tap(box.x + box.width - 50, box.y + box.height / 2);
                    await this.page.touchscreen.tap(box.x + 50, box.y + box.height / 2);
                    await this.page.waitForTimeout(500);
                    
                    result.addStep('Carousel swipe gesture', true);
                }
            }
            
            // Test tap interactions
            const cards = await this.page.$$('.card, .service-card, .clickable');
            if (cards.length > 0) {
                console.log('   Testing tap interactions');
                
                const firstCard = cards[0];
                const box = await firstCard.boundingBox();
                
                if (box) {
                    // Tap card
                    await this.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
                    await this.page.waitForTimeout(300);
                    
                    // Check if card responded (selected class, expanded, etc.)
                    const cardResponded = await firstCard.evaluate(el => {
                        return el.classList.contains('selected') || 
                               el.classList.contains('active') ||
                               el.getAttribute('aria-selected') === 'true';
                    });
                    result.addStep('Card tap response', cardResponded);
                }
            }
            
            // Test long press (if applicable)
            const longPressElements = await this.page.$$('[data-long-press], .context-menu-trigger');
            if (longPressElements.length > 0) {
                console.log('   Testing long press');
                
                const element = longPressElements[0];
                const box = await element.boundingBox();
                
                if (box) {
                    // Simulate long press
                    await this.page.touchscreen.touchStart(box.x + box.width / 2, box.y + box.height / 2);
                    await this.page.waitForTimeout(800); // Long press duration
                    await this.page.touchscreen.touchEnd();
                    
                    // Check for context menu or action
                    const contextMenu = await this.page.$('.context-menu, .popup-menu, [role="menu"]');
                    result.addStep('Long press triggers action', !!contextMenu);
                }
            }
            
            // Test form inputs on mobile
            console.log('   Testing mobile form inputs');
            const textInput = await this.page.$('input[type="text"], input[type="email"]');
            if (textInput) {
                const box = await textInput.boundingBox();
                if (box) {
                    // Tap to focus
                    await this.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
                    await this.page.waitForTimeout(500);
                    
                    // Check if keyboard would appear (focus state)
                    const isFocused = await textInput.evaluate(el => document.activeElement === el);
                    result.addStep('Input focuses on tap', isFocused);
                    
                    // Type with virtual keyboard
                    await this.page.keyboard.type('Test input');
                    
                    const hasValue = await textInput.evaluate(el => el.value.length > 0);
                    result.addStep('Virtual keyboard input works', hasValue);
                }
            }
            
            // Test pinch-to-zoom (if enabled)
            const zoomableElements = await this.page.$$('img[data-zoomable], .gallery-image, .zoomable');
            if (zoomableElements.length > 0) {
                result.addStep('Zoomable elements present', true, { count: zoomableElements.length });
            }
            
            result.finish(true);
            console.log('✅ Touch interactions test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Touch interactions test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testResponsiveForms() {
        const result = new TestResult('Responsive Forms Test');
        
        try {
            console.log('\n📍 Test: Responsive Forms');
            
            // Test form on different devices
            for (const [key, device] of Object.entries(DEVICES)) {
                if (device.name === 'Desktop') continue; // Skip desktop for this test
                
                console.log(`   Testing forms on ${device.name}`);
                
                await this.page.setViewport(device);
                await this.page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
                
                // Check form layout
                const formLayout = await this.page.evaluate(() => {
                    const form = document.querySelector('form');
                    if (!form) return null;
                    
                    const inputs = form.querySelectorAll('input, select, textarea');
                    const labels = form.querySelectorAll('label');
                    const buttons = form.querySelectorAll('button');
                    
                    return {
                        formWidth: form.offsetWidth,
                        inputs: inputs.length,
                        fullWidthInputs: Array.from(inputs).filter(input => {
                            const width = input.offsetWidth;
                            const parentWidth = input.parentElement.offsetWidth;
                            return width / parentWidth > 0.9; // 90% or more of parent width
                        }).length,
                        labels: labels.length,
                        buttons: buttons.length,
                        stackedLayout: Array.from(inputs).every((input, index, arr) => {
                            if (index === 0) return true;
                            const prevInput = arr[index - 1];
                            return input.offsetTop > prevInput.offsetTop;
                        })
                    };
                });
                
                if (formLayout) {
                    result.addStep(`${device.name}: Form found`, true, formLayout);
                    result.addStep(`${device.name}: Inputs full width`, 
                        formLayout.fullWidthInputs === formLayout.inputs);
                    result.addStep(`${device.name}: Stacked layout`, 
                        formLayout.stackedLayout);
                }
                
                // Test input interaction
                await fillField(this.page, SELECTORS.emailInput, 'test@example.com');
                const emailFilled = await this.page.$eval(SELECTORS.emailInput, el => el.value);
                result.addStep(`${device.name}: Can fill inputs`, emailFilled === 'test@example.com');
                
                // Check if labels are properly associated
                const labelAssociation = await this.page.evaluate(() => {
                    const inputs = document.querySelectorAll('input');
                    let properlyLabeled = 0;
                    inputs.forEach(input => {
                        const id = input.id;
                        const label = document.querySelector(`label[for="${id}"]`);
                        if (label || input.getAttribute('aria-label')) {
                            properlyLabeled++;
                        }
                    });
                    return {
                        total: inputs.length,
                        labeled: properlyLabeled,
                        allLabeled: properlyLabeled === inputs.length
                    };
                });
                
                result.addStep(`${device.name}: Inputs properly labeled`, 
                    labelAssociation.allLabeled, labelAssociation);
                
                // Take screenshot
                const formScreenshot = await takeScreenshot(this.page, `form-${key.toLowerCase()}`);
                result.addScreenshot(formScreenshot);
            }
            
            result.finish(true);
            console.log('✅ Responsive forms test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Responsive forms test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testResponsiveImages() {
        const result = new TestResult('Responsive Images Test');
        
        try {
            console.log('\n📍 Test: Responsive Images');
            
            // Test on different viewports
            const viewports = [
                { name: 'Mobile', ...DEVICES.iPhone12 },
                { name: 'Tablet', ...DEVICES.iPadMini },
                { name: 'Desktop', ...DEVICES.Desktop }
            ];
            
            for (const viewport of viewports) {
                console.log(`   Testing images on ${viewport.name}`);
                
                await this.page.setViewport(viewport);
                await this.page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'networkidle2' });
                
                // Analyze images
                const imageAnalysis = await this.page.evaluate(() => {
                    const images = document.querySelectorAll('img');
                    const results = {
                        total: images.length,
                        responsive: 0,
                        lazyLoaded: 0,
                        withAlt: 0,
                        properSize: 0,
                        overflowing: 0
                    };
                    
                    images.forEach(img => {
                        // Check for responsive attributes
                        if (img.srcset || img.sizes || img.style.maxWidth === '100%' || 
                            window.getComputedStyle(img).maxWidth === '100%') {
                            results.responsive++;
                        }
                        
                        // Check lazy loading
                        if (img.loading === 'lazy' || img.dataset.src) {
                            results.lazyLoaded++;
                        }
                        
                        // Check alt text
                        if (img.alt && img.alt.trim().length > 0) {
                            results.withAlt++;
                        }
                        
                        // Check if image fits container
                        const rect = img.getBoundingClientRect();
                        const parentRect = img.parentElement.getBoundingClientRect();
                        if (rect.width <= parentRect.width) {
                            results.properSize++;
                        } else {
                            results.overflowing++;
                        }
                    });
                    
                    return results;
                });
                
                result.addStep(`${viewport.name}: Images analyzed`, true, imageAnalysis);
                result.addStep(`${viewport.name}: Images responsive`, 
                    imageAnalysis.responsive === imageAnalysis.total);
                result.addStep(`${viewport.name}: No overflowing images`, 
                    imageAnalysis.overflowing === 0);
                result.addStep(`${viewport.name}: Images have alt text`, 
                    imageAnalysis.withAlt === imageAnalysis.total);
            }
            
            result.finish(true);
            console.log('✅ Responsive images test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Responsive images test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testOrientationChanges() {
        const result = new TestResult('Orientation Changes Test');
        
        try {
            console.log('\n📍 Test: Orientation Changes');
            
            const device = DEVICES.iPhone12;
            
            // Test portrait orientation
            console.log('   Testing portrait orientation');
            await this.page.setViewport({
                width: device.width,
                height: device.height,
                isMobile: true,
                hasTouch: true
            });
            
            await this.page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'networkidle2' });
            
            const portraitLayout = await this.page.evaluate(() => {
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth,
                    orientation: window.innerWidth < window.innerHeight ? 'portrait' : 'landscape'
                };
            });
            
            result.addStep('Portrait layout correct', 
                portraitLayout.orientation === 'portrait' && 
                portraitLayout.scrollWidth <= portraitLayout.clientWidth,
                portraitLayout
            );
            
            // Take portrait screenshot
            const portraitScreenshot = await takeScreenshot(this.page, 'orientation-portrait');
            result.addScreenshot(portraitScreenshot);
            
            // Test landscape orientation
            console.log('   Testing landscape orientation');
            await this.page.setViewport({
                width: device.height, // Swap dimensions
                height: device.width,
                isMobile: true,
                hasTouch: true
            });
            
            await this.page.waitForTimeout(1000); // Wait for reflow
            
            const landscapeLayout = await this.page.evaluate(() => {
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth,
                    orientation: window.innerWidth < window.innerHeight ? 'portrait' : 'landscape'
                };
            });
            
            result.addStep('Landscape layout correct', 
                landscapeLayout.orientation === 'landscape' && 
                landscapeLayout.scrollWidth <= landscapeLayout.clientWidth,
                landscapeLayout
            );
            
            // Take landscape screenshot
            const landscapeScreenshot = await takeScreenshot(this.page, 'orientation-landscape');
            result.addScreenshot(landscapeScreenshot);
            
            // Check if content adapts properly
            const contentAdaptation = await this.page.evaluate(() => {
                const mainContent = document.querySelector('main, .main-content, #content');
                if (!mainContent) return false;
                
                const styles = window.getComputedStyle(mainContent);
                return styles.display !== 'none' && styles.visibility !== 'hidden';
            });
            
            result.addStep('Content adapts to orientation', contentAdaptation);
            
            result.finish(true);
            console.log('✅ Orientation changes test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Orientation changes test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async runAllTests() {
        try {
            await this.init();
            
            // Run all mobile tests
            await this.testDeviceLayouts();
            await this.testMobileNavigation();
            await this.testTouchInteractions();
            await this.testResponsiveForms();
            await this.testResponsiveImages();
            await this.testOrientationChanges();
            
            // Generate report
            const report = generateReport('mobile-responsive', this.results);
            
            // Check console errors
            if (this.consoleErrors.length > 0) {
                console.log('\n⚠️  Console errors detected:');
                this.consoleErrors.forEach(error => {
                    console.log(`   - ${error.text}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new MobileResponsiveTester();
    tester.runAllTests().catch(console.error);
}

module.exports = MobileResponsiveTester;