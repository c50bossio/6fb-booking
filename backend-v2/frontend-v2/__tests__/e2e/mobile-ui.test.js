#!/usr/bin/env node

/**
 * Mobile UI Testing Script for BookedBarber V2
 * Tests mobile interface improvements on staging environment
 * 
 * Run with: node test-mobile-ui.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
    baseUrl: 'http://localhost:3001',
    viewport: {
        width: 375,
        height: 812,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
    },
    timeout: 30000,
    screenshotDir: './test-results/mobile-screenshots',
    reportFile: './test-results/mobile-test-report.json'
};

// Test results storage
const testResults = {
    timestamp: new Date().toISOString(),
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
    },
    tests: []
};

// Utility functions
function addTestResult(testName, passed, message, details = {}) {
    testResults.tests.push({
        name: testName,
        passed,
        message,
        details,
        timestamp: new Date().toISOString()
    });
    
    testResults.summary.total++;
    if (passed) {
        testResults.summary.passed++;
    } else {
        testResults.summary.failed++;
    }
    
    console.log(`${passed ? '✅' : '❌'} ${testName}: ${message}`);
}

function addWarning(testName, message, details = {}) {
    testResults.tests.push({
        name: testName,
        passed: true,
        message,
        details,
        warning: true,
        timestamp: new Date().toISOString()
    });
    
    testResults.summary.total++;
    testResults.summary.warnings++;
    
    console.log(`⚠️  ${testName}: ${message}`);
}

async function takeScreenshot(page, name) {
    const screenshotPath = path.join(CONFIG.screenshotDir, `${name}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
}

// Test functions
async function testHorizontalScrolling(page) {
    console.log('\n🔍 Testing Horizontal Scrolling...');
    
    try {
        const pages = [
            '/',
            '/booking',
            '/calendar',
            '/dashboard',
            '/profile'
        ];
        
        for (const pagePath of pages) {
            try {
                await page.goto(`${CONFIG.baseUrl}${pagePath}`, { waitUntil: 'networkidle2' });
                
                // Check for horizontal overflow
                const hasHorizontalOverflow = await page.evaluate(() => {
                    const body = document.body;
                    const html = document.documentElement;
                    
                    // Check body overflow
                    const bodyOverflow = body.scrollWidth > body.clientWidth;
                    
                    // Check html overflow
                    const htmlOverflow = html.scrollWidth > html.clientWidth;
                    
                    // Check viewport overflow
                    const viewportOverflow = window.innerWidth < document.documentElement.scrollWidth;
                    
                    return {
                        bodyOverflow,
                        htmlOverflow,
                        viewportOverflow,
                        bodyScrollWidth: body.scrollWidth,
                        bodyClientWidth: body.clientWidth,
                        htmlScrollWidth: html.scrollWidth,
                        htmlClientWidth: html.clientWidth,
                        viewportWidth: window.innerWidth,
                        documentWidth: document.documentElement.scrollWidth
                    };
                });
                
                if (hasHorizontalOverflow.bodyOverflow || hasHorizontalOverflow.htmlOverflow || hasHorizontalOverflow.viewportOverflow) {
                    await takeScreenshot(page, `horizontal-overflow-${pagePath.replace('/', 'home')}`);
                    addTestResult(
                        `Horizontal Scrolling - ${pagePath}`,
                        false,
                        'Horizontal overflow detected on mobile viewport',
                        hasHorizontalOverflow
                    );
                } else {
                    addTestResult(
                        `Horizontal Scrolling - ${pagePath}`,
                        true,
                        'No horizontal overflow detected'
                    );
                }
                
                // Check for overflow-x: hidden implementation
                const overflowXSettings = await page.evaluate(() => {
                    const body = document.body;
                    const html = document.documentElement;
                    
                    const bodyStyle = window.getComputedStyle(body);
                    const htmlStyle = window.getComputedStyle(html);
                    
                    return {
                        bodyOverflowX: bodyStyle.overflowX,
                        htmlOverflowX: htmlStyle.overflowX,
                        bodyOverflow: bodyStyle.overflow,
                        htmlOverflow: htmlStyle.overflow
                    };
                });
                
                if (overflowXSettings.bodyOverflowX === 'hidden' || overflowXSettings.htmlOverflowX === 'hidden') {
                    addTestResult(
                        `Overflow-X Hidden - ${pagePath}`,
                        true,
                        'overflow-x: hidden properly implemented',
                        overflowXSettings
                    );
                } else {
                    addWarning(
                        `Overflow-X Hidden - ${pagePath}`,
                        'overflow-x: hidden not detected, may cause horizontal scroll',
                        overflowXSettings
                    );
                }
                
            } catch (error) {
                addTestResult(
                    `Horizontal Scrolling - ${pagePath}`,
                    false,
                    `Error testing page: ${error.message}`
                );
            }
        }
        
    } catch (error) {
        addTestResult(
            'Horizontal Scrolling Test',
            false,
            `Test failed: ${error.message}`
        );
    }
}

async function testTouchTargets(page) {
    console.log('\n🔍 Testing Touch Targets...');
    
    try {
        await page.goto(`${CONFIG.baseUrl}/`, { waitUntil: 'networkidle2' });
        
        // Test navigation buttons
        const touchTargets = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, a[role="button"], .btn, [class*="button"]');
            const results = [];
            
            buttons.forEach((button, index) => {
                const rect = button.getBoundingClientRect();
                const styles = window.getComputedStyle(button);
                
                // Check if element is visible
                const isVisible = rect.width > 0 && rect.height > 0 && 
                    styles.visibility !== 'hidden' && styles.display !== 'none';
                
                if (isVisible) {
                    results.push({
                        index,
                        tagName: button.tagName,
                        className: button.className,
                        id: button.id,
                        text: button.textContent?.trim().substring(0, 30) || '',
                        width: rect.width,
                        height: rect.height,
                        area: rect.width * rect.height,
                        meetsTouchTarget: rect.width >= 44 && rect.height >= 44 // 44px is minimum touch target
                    });
                }
            });
            
            return results;
        });
        
        const totalButtons = touchTargets.length;
        const validTouchTargets = touchTargets.filter(t => t.meetsTouchTarget).length;
        const invalidTouchTargets = touchTargets.filter(t => !t.meetsTouchTarget);
        
        addTestResult(
            'Touch Target Sizes',
            invalidTouchTargets.length === 0,
            `${validTouchTargets}/${totalButtons} buttons meet minimum touch target size (44px)`,
            {
                totalButtons,
                validTouchTargets,
                invalidTouchTargets: invalidTouchTargets.length,
                failedButtons: invalidTouchTargets.slice(0, 5) // Show first 5 failing buttons
            }
        );
        
        // Test specific navigation elements
        const navigationElements = await page.evaluate(() => {
            const nav = document.querySelector('nav');
            if (!nav) return null;
            
            const navButtons = nav.querySelectorAll('button, a');
            const results = [];
            
            navButtons.forEach((button, index) => {
                const rect = button.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    results.push({
                        index,
                        text: button.textContent?.trim() || '',
                        width: rect.width,
                        height: rect.height,
                        meetsTouchTarget: rect.width >= 44 && rect.height >= 44
                    });
                }
            });
            
            return results;
        });
        
        if (navigationElements) {
            const validNavButtons = navigationElements.filter(n => n.meetsTouchTarget).length;
            addTestResult(
                'Navigation Touch Targets',
                validNavButtons === navigationElements.length,
                `${validNavButtons}/${navigationElements.length} navigation buttons meet touch target requirements`,
                { navigationElements }
            );
        }
        
    } catch (error) {
        addTestResult(
            'Touch Targets Test',
            false,
            `Test failed: ${error.message}`
        );
    }
}

async function testResponsiveLayout(page) {
    console.log('\n🔍 Testing Responsive Layout...');
    
    try {
        // Test booking form
        await page.goto(`${CONFIG.baseUrl}/booking`, { waitUntil: 'networkidle2' });
        
        const bookingFormLayout = await page.evaluate(() => {
            const form = document.querySelector('form');
            if (!form) return null;
            
            const formRect = form.getBoundingClientRect();
            const inputs = form.querySelectorAll('input, select, textarea');
            const buttons = form.querySelectorAll('button');
            
            const inputSizes = Array.from(inputs).map(input => {
                const rect = input.getBoundingClientRect();
                return {
                    width: rect.width,
                    height: rect.height,
                    type: input.type || input.tagName
                };
            });
            
            const buttonSizes = Array.from(buttons).map(button => {
                const rect = button.getBoundingClientRect();
                return {
                    width: rect.width,
                    height: rect.height,
                    text: button.textContent?.trim()
                };
            });
            
            return {
                formWidth: formRect.width,
                formHeight: formRect.height,
                inputCount: inputs.length,
                buttonCount: buttons.length,
                inputSizes,
                buttonSizes,
                fitsInViewport: formRect.width <= window.innerWidth
            };
        });
        
        if (bookingFormLayout) {
            addTestResult(
                'Booking Form Layout',
                bookingFormLayout.fitsInViewport,
                `Booking form ${bookingFormLayout.fitsInViewport ? 'fits' : 'overflows'} mobile viewport`,
                bookingFormLayout
            );
        }
        
        // Test calendar layout
        await page.goto(`${CONFIG.baseUrl}/calendar`, { waitUntil: 'networkidle2' });
        
        const calendarLayout = await page.evaluate(() => {
            const calendar = document.querySelector('[class*="calendar"], .calendar, [data-testid="calendar"]');
            if (!calendar) return null;
            
            const calendarRect = calendar.getBoundingClientRect();
            const calendarCells = calendar.querySelectorAll('[class*="day"], [class*="date"], td');
            
            const cellSizes = Array.from(calendarCells).slice(0, 10).map(cell => {
                const rect = cell.getBoundingClientRect();
                return {
                    width: rect.width,
                    height: rect.height
                };
            });
            
            return {
                calendarWidth: calendarRect.width,
                calendarHeight: calendarRect.height,
                cellCount: calendarCells.length,
                cellSizes,
                fitsInViewport: calendarRect.width <= window.innerWidth
            };
        });
        
        if (calendarLayout) {
            addTestResult(
                'Calendar Layout',
                calendarLayout.fitsInViewport,
                `Calendar ${calendarLayout.fitsInViewport ? 'fits' : 'overflows'} mobile viewport`,
                calendarLayout
            );
        }
        
        // Test navigation layout
        await page.goto(`${CONFIG.baseUrl}/`, { waitUntil: 'networkidle2' });
        
        const navigationLayout = await page.evaluate(() => {
            const nav = document.querySelector('nav');
            if (!nav) return null;
            
            const navRect = nav.getBoundingClientRect();
            const navItems = nav.querySelectorAll('a, button');
            
            return {
                navWidth: navRect.width,
                navHeight: navRect.height,
                itemCount: navItems.length,
                fitsInViewport: navRect.width <= window.innerWidth,
                position: window.getComputedStyle(nav).position
            };
        });
        
        if (navigationLayout) {
            addTestResult(
                'Navigation Layout',
                navigationLayout.fitsInViewport,
                `Navigation ${navigationLayout.fitsInViewport ? 'fits' : 'overflows'} mobile viewport`,
                navigationLayout
            );
        }
        
    } catch (error) {
        addTestResult(
            'Responsive Layout Test',
            false,
            `Test failed: ${error.message}`
        );
    }
}

async function testAccessibility(page) {
    console.log('\n🔍 Testing Accessibility...');
    
    try {
        await page.goto(`${CONFIG.baseUrl}/`, { waitUntil: 'networkidle2' });
        
        // Test ARIA labels
        const ariaLabels = await page.evaluate(() => {
            const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
            const buttons = document.querySelectorAll('button');
            const links = document.querySelectorAll('a');
            
            const ariaStats = {
                totalElementsWithAria: elementsWithAria.length,
                buttonsWithAria: 0,
                linksWithAria: 0
            };
            
            buttons.forEach(button => {
                if (button.hasAttribute('aria-label') || button.hasAttribute('aria-labelledby') || button.textContent?.trim()) {
                    ariaStats.buttonsWithAria++;
                }
            });
            
            links.forEach(link => {
                if (link.hasAttribute('aria-label') || link.hasAttribute('aria-labelledby') || link.textContent?.trim()) {
                    ariaStats.linksWithAria++;
                }
            });
            
            return {
                ...ariaStats,
                totalButtons: buttons.length,
                totalLinks: links.length
            };
        });
        
        const buttonAccessibility = ariaStats.buttonsWithAria / ariaStats.totalButtons * 100;
        const linkAccessibility = ariaStats.linksWithAria / ariaStats.totalLinks * 100;
        
        addTestResult(
            'ARIA Labels',
            buttonAccessibility > 80 && linkAccessibility > 80,
            `Button accessibility: ${buttonAccessibility.toFixed(1)}%, Link accessibility: ${linkAccessibility.toFixed(1)}%`,
            ariaStats
        );
        
        // Test semantic HTML
        const semanticHTML = await page.evaluate(() => {
            const semanticElements = document.querySelectorAll('header, nav, main, section, article, aside, footer');
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const landmarks = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]');
            
            return {
                semanticElements: semanticElements.length,
                headings: headings.length,
                landmarks: landmarks.length,
                hasMainElement: document.querySelector('main') !== null,
                hasNavElement: document.querySelector('nav') !== null
            };
        });
        
        addTestResult(
            'Semantic HTML',
            semanticHTML.hasMainElement && semanticHTML.hasNavElement && semanticHTML.headings > 0,
            `Found ${semanticHTML.semanticElements} semantic elements, ${semanticHTML.headings} headings`,
            semanticHTML
        );
        
        // Test keyboard navigation
        const keyboardNav = await page.evaluate(() => {
            const focusableElements = document.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            let tabbableCount = 0;
            focusableElements.forEach(element => {
                const style = window.getComputedStyle(element);
                const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                const tabIndex = element.getAttribute('tabindex');
                
                if (isVisible && (tabIndex === null || parseInt(tabIndex) >= 0)) {
                    tabbableCount++;
                }
            });
            
            return {
                totalFocusable: focusableElements.length,
                tabbableElements: tabbableCount
            };
        });
        
        addTestResult(
            'Keyboard Navigation',
            keyboardNav.tabbableElements > 0,
            `${keyboardNav.tabbableElements} elements are keyboard accessible`,
            keyboardNav
        );
        
    } catch (error) {
        addTestResult(
            'Accessibility Test',
            false,
            `Test failed: ${error.message}`
        );
    }
}

async function testCalendarMobileUsability(page) {
    console.log('\n🔍 Testing Calendar Mobile Usability...');
    
    try {
        await page.goto(`${CONFIG.baseUrl}/calendar`, { waitUntil: 'networkidle2' });
        
        // Test calendar touch interactions
        const calendarTouchTest = await page.evaluate(() => {
            const calendar = document.querySelector('[class*="calendar"], .calendar, [data-testid="calendar"]');
            if (!calendar) return null;
            
            const calendarRect = calendar.getBoundingClientRect();
            const draggableElements = calendar.querySelectorAll('[draggable="true"], [class*="draggable"]');
            const clickableElements = calendar.querySelectorAll('[onclick], [class*="clickable"], button, a');
            
            // Check for touch event handlers
            const hasTouchEvents = calendar.ontouchstart !== undefined || 
                                  calendar.ontouchmove !== undefined || 
                                  calendar.ontouchend !== undefined;
            
            return {
                calendarFound: true,
                calendarWidth: calendarRect.width,
                calendarHeight: calendarRect.height,
                draggableElements: draggableElements.length,
                clickableElements: clickableElements.length,
                hasTouchEvents,
                fitsInViewport: calendarRect.width <= window.innerWidth
            };
        });
        
        if (calendarTouchTest) {
            addTestResult(
                'Calendar Touch Support',
                calendarTouchTest.hasTouchEvents || calendarTouchTest.clickableElements > 0,
                `Calendar has ${calendarTouchTest.draggableElements} draggable and ${calendarTouchTest.clickableElements} clickable elements`,
                calendarTouchTest
            );
        } else {
            addTestResult(
                'Calendar Touch Support',
                false,
                'Calendar not found on page'
            );
        }
        
        // Test calendar cell sizes for touch
        const calendarCellSizes = await page.evaluate(() => {
            const cells = document.querySelectorAll('[class*="day"], [class*="date"], td');
            const cellSizes = [];
            
            cells.forEach((cell, index) => {
                if (index < 10) { // Test first 10 cells
                    const rect = cell.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        cellSizes.push({
                            width: rect.width,
                            height: rect.height,
                            meetsTouchTarget: rect.width >= 44 && rect.height >= 44
                        });
                    }
                }
            });
            
            return cellSizes;
        });
        
        if (calendarCellSizes.length > 0) {
            const validCells = calendarCellSizes.filter(c => c.meetsTouchTarget).length;
            addTestResult(
                'Calendar Cell Touch Targets',
                validCells > calendarCellSizes.length * 0.8,
                `${validCells}/${calendarCellSizes.length} calendar cells meet touch target requirements`,
                { calendarCellSizes }
            );
        }
        
    } catch (error) {
        addTestResult(
            'Calendar Mobile Usability Test',
            false,
            `Test failed: ${error.message}`
        );
    }
}

async function testCSSIssues(page) {
    console.log('\n🔍 Testing CSS Issues...');
    
    try {
        const pages = ['/', '/booking', '/calendar'];
        
        for (const pagePath of pages) {
            await page.goto(`${CONFIG.baseUrl}${pagePath}`, { waitUntil: 'networkidle2' });
            
            // Check for common CSS issues
            const cssIssues = await page.evaluate(() => {
                const issues = [];
                
                // Check for elements that overflow the viewport
                const allElements = document.querySelectorAll('*');
                let overflowElements = 0;
                
                allElements.forEach(element => {
                    const rect = element.getBoundingClientRect();
                    if (rect.width > window.innerWidth) {
                        overflowElements++;
                    }
                });
                
                // Check for fixed positioning that might cause issues
                const fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
                const computedFixed = [];
                
                allElements.forEach(element => {
                    const style = window.getComputedStyle(element);
                    if (style.position === 'fixed') {
                        computedFixed.push({
                            tagName: element.tagName,
                            className: element.className,
                            id: element.id
                        });
                    }
                });
                
                // Check for text that might be too small on mobile
                const textElements = document.querySelectorAll('p, span, div, a, button, h1, h2, h3, h4, h5, h6');
                let smallTextCount = 0;
                
                textElements.forEach(element => {
                    const style = window.getComputedStyle(element);
                    const fontSize = parseFloat(style.fontSize);
                    if (fontSize < 16) {
                        smallTextCount++;
                    }
                });
                
                return {
                    overflowElements,
                    fixedElements: computedFixed.length,
                    fixedElementDetails: computedFixed.slice(0, 3),
                    smallTextCount,
                    totalTextElements: textElements.length,
                    viewportWidth: window.innerWidth,
                    documentWidth: document.documentElement.scrollWidth
                };
            });
            
            addTestResult(
                `CSS Issues - ${pagePath}`,
                cssIssues.overflowElements === 0,
                `Found ${cssIssues.overflowElements} overflow elements, ${cssIssues.fixedElements} fixed elements, ${cssIssues.smallTextCount} small text elements`,
                cssIssues
            );
        }
        
    } catch (error) {
        addTestResult(
            'CSS Issues Test',
            false,
            `Test failed: ${error.message}`
        );
    }
}

// Main test runner
async function runMobileUITests() {
    console.log('🚀 Starting Mobile UI Tests for BookedBarber V2');
    console.log(`Testing at: ${CONFIG.baseUrl}`);
    console.log(`Viewport: ${CONFIG.viewport.width}x${CONFIG.viewport.height}`);
    
    // Create screenshots directory
    if (!fs.existsSync(CONFIG.screenshotDir)) {
        fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false, // Set to true for headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: CONFIG.viewport
        });
        
        const page = await browser.newPage();
        await page.setViewport(CONFIG.viewport);
        
        // Enable touch events
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'maxTouchPoints', {
                get: () => 10,
            });
        });
        
        // Run all tests
        await testHorizontalScrolling(page);
        await testTouchTargets(page);
        await testResponsiveLayout(page);
        await testAccessibility(page);
        await testCalendarMobileUsability(page);
        await testCSSIssues(page);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        addTestResult('Test Execution', false, `Overall test failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    // Generate report
    const reportPath = CONFIG.reportFile;
    if (!fs.existsSync(path.dirname(reportPath))) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    
    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`Passed: ${testResults.summary.passed}`);
    console.log(`Failed: ${testResults.summary.failed}`);
    console.log(`Warnings: ${testResults.summary.warnings}`);
    console.log(`Success Rate: ${(testResults.summary.passed / testResults.summary.total * 100).toFixed(1)}%`);
    console.log(`\nReport saved to: ${reportPath}`);
    
    return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runMobileUITests().catch(console.error);
}

module.exports = { runMobileUITests };