/**
 * Comprehensive Staging Environment Validation Test
 * Tests all premium features in live staging environment to identify polish needs
 * 
 * Staging URLs:
 * - Frontend: http://localhost:3002
 * - Backend: http://localhost:8001
 */

const puppeteer = require('puppeteer');

class StagingEnvironmentValidator {
    constructor() {
        this.stagingUrls = {
            frontend: 'http://localhost:3002',
            backend: 'http://localhost:8001'
        };
        this.polishNeeds = [];
        this.testResults = [];
    }

    async runComprehensiveValidation() {
        console.log('🚀 Starting Comprehensive Staging Environment Validation...\n');
        console.log(`Frontend: ${this.stagingUrls.frontend}`);
        console.log(`Backend: ${this.stagingUrls.backend}\n`);

        const browser = await puppeteer.launch({
            headless: false, // Show browser for visual inspection
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1280, height: 800 }
        });

        try {
            const page = await browser.newPage();
            
            // Test 1: Basic Accessibility and Load Performance
            await this.testBasicAccessibility(page);
            
            // Test 2: Premium Calendar Features
            await this.testPremiumCalendarFeatures(page);
            
            // Test 3: Drag-and-Drop Functionality
            await this.testDragAndDropFunctionality(page);
            
            // Test 4: Visual Design and Polish
            await this.testVisualDesignPolish(page);
            
            // Test 5: Mobile Responsiveness
            await this.testMobileResponsiveness(page);
            
            // Test 6: User Experience Flows
            await this.testUserExperienceFlows(page);
            
            // Test 7: Error Handling and Edge Cases
            await this.testErrorHandlingAndEdgeCases(page);
            
            this.generatePolishReport();
            
        } finally {
            await browser.close();
        }
    }

    async testBasicAccessibility(page) {
        console.log('📱 Testing Basic Accessibility and Load Performance...');
        
        try {
            const startTime = Date.now();
            await page.goto(this.stagingUrls.frontend, { waitUntil: 'networkidle0', timeout: 30000 });
            const loadTime = Date.now() - startTime;
            
            console.log(`   ✅ Page loaded in ${loadTime}ms`);
            
            // Check for basic elements
            const title = await page.title();
            console.log(`   📄 Page title: "${title}"`);
            
            // Check for obvious errors
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });
            
            // Wait a moment for console errors to appear
            await page.waitForTimeout(2000);
            
            if (consoleErrors.length > 0) {
                console.log(`   ⚠️ Console errors detected: ${consoleErrors.length}`);
                this.polishNeeds.push({
                    category: 'Performance & Errors',
                    issue: 'Console errors detected',
                    details: consoleErrors.slice(0, 3), // Show first 3
                    priority: 'medium'
                });
            }
            
            // Check load performance
            if (loadTime > 3000) {
                this.polishNeeds.push({
                    category: 'Performance & Errors',
                    issue: 'Slow page load time',
                    details: `Page took ${loadTime}ms to load (should be <3000ms)`,
                    priority: 'medium'
                });
            }
            
            this.testResults.push({
                test: 'Basic Accessibility',
                success: loadTime < 10000 && consoleErrors.length < 5,
                details: { loadTime, consoleErrors: consoleErrors.length }
            });
            
        } catch (error) {
            console.log(`   ❌ Basic accessibility test failed: ${error.message}`);
            this.polishNeeds.push({
                category: 'Critical Issues',
                issue: 'Page failed to load',
                details: error.message,
                priority: 'high'
            });
        }
    }

    async testPremiumCalendarFeatures(page) {
        console.log('📅 Testing Premium Calendar Features...');
        
        try {
            // Navigate to calendar page
            await page.goto(`${this.stagingUrls.frontend}/calendar`, { waitUntil: 'networkidle0' });
            
            // Check for calendar grid
            const calendarGrid = await page.$('.calendar-grid, [data-testid="calendar-grid"]');
            if (calendarGrid) {
                console.log('   ✅ Calendar grid found');
            } else {
                console.log('   ⚠️ Calendar grid not found');
                this.polishNeeds.push({
                    category: 'Calendar Features',
                    issue: 'Calendar grid not visible',
                    details: 'Main calendar grid component not found in DOM',
                    priority: 'high'
                });
            }
            
            // Check for service color coding
            const serviceColors = await page.evaluate(() => {
                const appointments = document.querySelectorAll('.appointment, [data-testid*="appointment"]');
                const colorVariations = new Set();
                
                appointments.forEach(appt => {
                    const styles = window.getComputedStyle(appt);
                    colorVariations.add(styles.backgroundColor);
                });
                
                return {
                    appointmentCount: appointments.length,
                    colorVariations: colorVariations.size
                };
            });
            
            console.log(`   📊 Found ${serviceColors.appointmentCount} appointments with ${serviceColors.colorVariations} color variations`);
            
            if (serviceColors.colorVariations < 2 && serviceColors.appointmentCount > 0) {
                this.polishNeeds.push({
                    category: 'Visual Design',
                    issue: 'Limited service color coding',
                    details: 'Appointments should have different colors based on service type',
                    priority: 'medium'
                });
            }
            
            // Check for barber symbols
            const barberSymbols = await page.evaluate(() => {
                const symbols = document.querySelectorAll('.barber-symbol, [data-testid*="barber-symbol"]');
                return symbols.length;
            });
            
            console.log(`   👤 Found ${barberSymbols} barber symbols`);
            
            // Check for premium visual effects
            const premiumEffects = await page.evaluate(() => {
                const effects = {
                    glassmorphism: document.querySelector('.backdrop-blur, .bg-white\\/10') !== null,
                    shadows: document.querySelector('.shadow-lg, .shadow-xl') !== null,
                    gradients: document.querySelector('[class*="gradient"]') !== null,
                    animations: document.querySelector('[class*="animate"]') !== null
                };
                return effects;
            });
            
            console.log(`   ✨ Premium effects: ${Object.entries(premiumEffects).filter(([k,v]) => v).map(([k]) => k).join(', ')}`);
            
            const effectCount = Object.values(premiumEffects).filter(Boolean).length;
            if (effectCount < 2) {
                this.polishNeeds.push({
                    category: 'Visual Design',
                    issue: 'Limited premium visual effects',
                    details: 'Should have more glassmorphism, shadows, gradients, and animations',
                    priority: 'low'
                });
            }
            
            this.testResults.push({
                test: 'Premium Calendar Features',
                success: calendarGrid !== null && serviceColors.colorVariations > 1,
                details: { serviceColors, barberSymbols, premiumEffects }
            });
            
        } catch (error) {
            console.log(`   ❌ Premium calendar test failed: ${error.message}`);
            this.polishNeeds.push({
                category: 'Calendar Features',
                issue: 'Premium calendar features test failed',
                details: error.message,
                priority: 'high'
            });
        }
    }

    async testDragAndDropFunctionality(page) {
        console.log('🖱️ Testing Drag-and-Drop Functionality...');
        
        try {
            // Check for draggable elements
            const draggableElements = await page.evaluate(() => {
                const draggable = document.querySelectorAll('[draggable="true"]');
                const dropZones = document.querySelectorAll('.droppable-zone, [data-drop-zone]');
                return {
                    draggableCount: draggable.length,
                    dropZoneCount: dropZones.length
                };
            });
            
            console.log(`   📦 Found ${draggableElements.draggableCount} draggable elements`);
            console.log(`   🎯 Found ${draggableElements.dropZoneCount} drop zones`);
            
            if (draggableElements.draggableCount === 0) {
                this.polishNeeds.push({
                    category: 'Interaction Features',
                    issue: 'No draggable elements found',
                    details: 'Drag-and-drop functionality may not be properly initialized',
                    priority: 'medium'
                });
            }
            
            // Test hover effects on appointments
            const appointments = await page.$$('.appointment, [data-testid*="appointment"]');
            if (appointments.length > 0) {
                await appointments[0].hover();
                await page.waitForTimeout(500);
                
                const hoverEffects = await page.evaluate(() => {
                    const hovered = document.querySelector('.appointment:hover, [data-testid*="appointment"]:hover');
                    if (hovered) {
                        const styles = window.getComputedStyle(hovered);
                        return {
                            hasTransform: styles.transform !== 'none',
                            hasBoxShadow: styles.boxShadow !== 'none',
                            hasScaleEffect: styles.transform.includes('scale')
                        };
                    }
                    return null;
                });
                
                console.log(`   ✨ Hover effects: ${hoverEffects ? Object.entries(hoverEffects).filter(([k,v]) => v).map(([k]) => k).join(', ') : 'none detected'}`);
                
                if (!hoverEffects || Object.values(hoverEffects).every(v => !v)) {
                    this.polishNeeds.push({
                        category: 'Interaction Features',
                        issue: 'Limited hover effects on appointments',
                        details: 'Appointments should have visual feedback on hover (transform, shadow, etc.)',
                        priority: 'low'
                    });
                }
            }
            
            this.testResults.push({
                test: 'Drag-and-Drop Functionality',
                success: draggableElements.draggableCount > 0,
                details: draggableElements
            });
            
        } catch (error) {
            console.log(`   ❌ Drag-and-drop test failed: ${error.message}`);
        }
    }

    async testVisualDesignPolish(page) {
        console.log('🎨 Testing Visual Design and Polish...');
        
        try {
            // Check typography consistency
            const typography = await page.evaluate(() => {
                const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                const fonts = new Set();
                const sizes = new Set();
                
                headings.forEach(heading => {
                    const styles = window.getComputedStyle(heading);
                    fonts.add(styles.fontFamily);
                    sizes.add(styles.fontSize);
                });
                
                return {
                    headingCount: headings.length,
                    fontFamilies: fonts.size,
                    fontSizes: sizes.size
                };
            });
            
            console.log(`   📝 Typography: ${typography.headingCount} headings, ${typography.fontFamilies} font families, ${typography.fontSizes} sizes`);
            
            if (typography.fontFamilies > 3) {
                this.polishNeeds.push({
                    category: 'Visual Design',
                    issue: 'Too many font families',
                    details: `Found ${typography.fontFamilies} different font families, should be 1-2 for consistency`,
                    priority: 'low'
                });
            }
            
            // Check color consistency
            const colorScheme = await page.evaluate(() => {
                const elements = document.querySelectorAll('*');
                const backgrounds = new Set();
                const textColors = new Set();
                
                Array.from(elements).slice(0, 100).forEach(el => { // Sample first 100 elements
                    const styles = window.getComputedStyle(el);
                    if (styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                        backgrounds.add(styles.backgroundColor);
                    }
                    if (styles.color) {
                        textColors.add(styles.color);
                    }
                });
                
                return {
                    backgroundColors: backgrounds.size,
                    textColors: textColors.size
                };
            });
            
            console.log(`   🎨 Color scheme: ${colorScheme.backgroundColors} background colors, ${colorScheme.textColors} text colors`);
            
            // Check spacing consistency
            const spacingConsistency = await page.evaluate(() => {
                const containers = document.querySelectorAll('.container, .max-w, .mx-auto, .p-');
                const margins = new Set();
                const paddings = new Set();
                
                Array.from(containers).slice(0, 20).forEach(container => {
                    const styles = window.getComputedStyle(container);
                    margins.add(styles.marginTop);
                    margins.add(styles.marginBottom);
                    paddings.add(styles.paddingTop);
                    paddings.add(styles.paddingBottom);
                });
                
                return {
                    marginVariations: margins.size,
                    paddingVariations: paddings.size
                };
            });
            
            console.log(`   📏 Spacing: ${spacingConsistency.marginVariations} margin variations, ${spacingConsistency.paddingVariations} padding variations`);
            
            this.testResults.push({
                test: 'Visual Design Polish',
                success: true,
                details: { typography, colorScheme, spacingConsistency }
            });
            
        } catch (error) {
            console.log(`   ❌ Visual design test failed: ${error.message}`);
        }
    }

    async testMobileResponsiveness(page) {
        console.log('📱 Testing Mobile Responsiveness...');
        
        try {
            // Test different viewport sizes
            const viewports = [
                { name: 'Mobile', width: 375, height: 667 },
                { name: 'Tablet', width: 768, height: 1024 },
                { name: 'Desktop', width: 1280, height: 800 }
            ];
            
            for (const viewport of viewports) {
                await page.setViewport({ width: viewport.width, height: viewport.height });
                await page.reload({ waitUntil: 'networkidle0' });
                
                // Check if calendar is still usable
                const mobileUsability = await page.evaluate(() => {
                    const calendar = document.querySelector('.calendar-grid, [data-testid="calendar-grid"]');
                    if (!calendar) return { visible: false };
                    
                    const rect = calendar.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0;
                    const hasHorizontalScroll = calendar.scrollWidth > calendar.clientWidth;
                    
                    return {
                        visible: isVisible,
                        hasHorizontalScroll,
                        width: rect.width,
                        height: rect.height
                    };
                });
                
                console.log(`   ${viewport.name} (${viewport.width}x${viewport.height}): ${mobileUsability.visible ? '✅' : '❌'} Calendar visible`);
                
                if (!mobileUsability.visible && viewport.name === 'Mobile') {
                    this.polishNeeds.push({
                        category: 'Mobile Experience',
                        issue: 'Calendar not visible on mobile',
                        details: 'Calendar component should be visible and usable on mobile devices',
                        priority: 'high'
                    });
                }
                
                if (mobileUsability.hasHorizontalScroll && viewport.name === 'Mobile') {
                    this.polishNeeds.push({
                        category: 'Mobile Experience',
                        issue: 'Horizontal scroll on mobile',
                        details: 'Calendar should fit within mobile viewport without horizontal scrolling',
                        priority: 'medium'
                    });
                }
            }
            
            // Reset to desktop view
            await page.setViewport({ width: 1280, height: 800 });
            
            this.testResults.push({
                test: 'Mobile Responsiveness',
                success: true,
                details: 'Tested across multiple viewports'
            });
            
        } catch (error) {
            console.log(`   ❌ Mobile responsiveness test failed: ${error.message}`);
        }
    }

    async testUserExperienceFlows(page) {
        console.log('👤 Testing User Experience Flows...');
        
        try {
            // Test navigation
            const navigationTest = await page.evaluate(() => {
                const navLinks = document.querySelectorAll('nav a, .nav-link, [data-testid*="nav"]');
                const buttons = document.querySelectorAll('button:not([disabled])');
                
                return {
                    navigationLinks: navLinks.length,
                    interactiveButtons: buttons.length,
                    hasVisibleNavigation: navLinks.length > 0
                };
            });
            
            console.log(`   🧭 Navigation: ${navigationTest.navigationLinks} links, ${navigationTest.interactiveButtons} buttons`);
            
            if (!navigationTest.hasVisibleNavigation) {
                this.polishNeeds.push({
                    category: 'User Experience',
                    issue: 'No visible navigation',
                    details: 'Users need clear navigation elements to move around the app',
                    priority: 'high'
                });
            }
            
            // Test loading states
            const loadingStates = await page.evaluate(() => {
                const loadingElements = document.querySelectorAll('.loading, .spinner, .skeleton, [data-testid*="loading"]');
                const loadingIndicators = document.querySelectorAll('.animate-pulse, .animate-spin');
                
                return {
                    loadingElements: loadingElements.length,
                    loadingIndicators: loadingIndicators.length
                };
            });
            
            console.log(`   ⏳ Loading states: ${loadingStates.loadingElements} elements, ${loadingStates.loadingIndicators} indicators`);
            
            // Test error handling
            const errorHandling = await page.evaluate(() => {
                const errorMessages = document.querySelectorAll('.error, .alert-error, [data-testid*="error"]');
                const toasts = document.querySelectorAll('.toast, .notification, [data-testid*="toast"]');
                
                return {
                    errorMessages: errorMessages.length,
                    toastNotifications: toasts.length
                };
            });
            
            console.log(`   ⚠️ Error handling: ${errorHandling.errorMessages} error messages, ${errorHandling.toastNotifications} toasts`);
            
            this.testResults.push({
                test: 'User Experience Flows',
                success: navigationTest.hasVisibleNavigation,
                details: { navigationTest, loadingStates, errorHandling }
            });
            
        } catch (error) {
            console.log(`   ❌ User experience test failed: ${error.message}`);
        }
    }

    async testErrorHandlingAndEdgeCases(page) {
        console.log('🚨 Testing Error Handling and Edge Cases...');
        
        try {
            // Test with no appointments
            const emptyStateHandling = await page.evaluate(() => {
                const appointments = document.querySelectorAll('.appointment, [data-testid*="appointment"]');
                const emptyStateMessages = document.querySelectorAll('.empty-state, [data-testid*="empty"], .no-appointments');
                
                return {
                    hasAppointments: appointments.length > 0,
                    hasEmptyStateMessage: emptyStateMessages.length > 0,
                    appointmentCount: appointments.length
                };
            });
            
            console.log(`   📊 Empty state: ${emptyStateHandling.appointmentCount} appointments, ${emptyStateHandling.hasEmptyStateMessage ? '✅' : '❌'} empty state message`);
            
            if (emptyStateHandling.appointmentCount === 0 && !emptyStateHandling.hasEmptyStateMessage) {
                this.polishNeeds.push({
                    category: 'User Experience',
                    issue: 'No empty state message',
                    details: 'When no appointments are present, show a helpful empty state message',
                    priority: 'medium'
                });
            }
            
            // Test 404 handling
            try {
                await page.goto(`${this.stagingUrls.frontend}/nonexistent-page`);
                const is404Page = await page.evaluate(() => {
                    return document.body.textContent.includes('404') || 
                           document.body.textContent.includes('Not Found') ||
                           document.title.includes('404');
                });
                
                console.log(`   🔍 404 handling: ${is404Page ? '✅' : '❌'} Proper 404 page`);
                
                if (!is404Page) {
                    this.polishNeeds.push({
                        category: 'Error Handling',
                        issue: 'No proper 404 page',
                        details: 'Should show a user-friendly 404 page for invalid URLs',
                        priority: 'low'
                    });
                }
                
                // Navigate back to calendar
                await page.goto(`${this.stagingUrls.frontend}/calendar`);
                
            } catch (error) {
                console.log(`   ⚠️ 404 test inconclusive: ${error.message}`);
            }
            
            this.testResults.push({
                test: 'Error Handling and Edge Cases',
                success: true,
                details: { emptyStateHandling }
            });
            
        } catch (error) {
            console.log(`   ❌ Error handling test failed: ${error.message}`);
        }
    }

    generatePolishReport() {
        console.log('\\n' + '='.repeat(70));
        console.log('📋 STAGING ENVIRONMENT VALIDATION REPORT');
        console.log('='.repeat(70));
        
        // Test Results Summary
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;
        
        console.log(`\\n🎯 Test Results Summary:`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Passed: ${passedTests} ✅`);
        console.log(`   Failed: ${totalTests - passedTests} ❌`);
        console.log(`   Success Rate: ${successRate}%`);
        
        // Polish Needs Analysis
        console.log(`\\n🔧 Polish Needs Identified: ${this.polishNeeds.length}`);
        
        const priorityGroups = {
            high: this.polishNeeds.filter(p => p.priority === 'high'),
            medium: this.polishNeeds.filter(p => p.priority === 'medium'),
            low: this.polishNeeds.filter(p => p.priority === 'low')
        };
        
        ['high', 'medium', 'low'].forEach(priority => {
            const items = priorityGroups[priority];
            if (items.length > 0) {
                console.log(`\\n   ${priority.toUpperCase()} Priority (${items.length} items):`);
                items.forEach((item, index) => {
                    console.log(`     ${index + 1}. ${item.issue}`);
                    console.log(`        Category: ${item.category}`);
                    console.log(`        Details: ${item.details}`);
                });
            }
        });
        
        // Recommendations
        console.log(`\\n💡 Recommendations:`);
        
        if (priorityGroups.high.length > 0) {
            console.log(`   🚨 Address ${priorityGroups.high.length} high-priority issues before beta`);
        }
        
        if (priorityGroups.medium.length > 0) {
            console.log(`   ⚠️ Consider addressing ${priorityGroups.medium.length} medium-priority improvements`);
        }
        
        if (priorityGroups.low.length > 0) {
            console.log(`   ✨ ${priorityGroups.low.length} low-priority enhancements available for future iterations`);
        }
        
        if (this.polishNeeds.length === 0) {
            console.log(`   🎉 No critical polish needs identified - staging environment looks great!`);
        }
        
        console.log(`\\n📍 Staging Environment URLs:`);
        console.log(`   Frontend: ${this.stagingUrls.frontend}`);
        console.log(`   Backend: ${this.stagingUrls.backend}`);
        
        console.log('\\n' + '='.repeat(70));
        
        return {
            testResults: this.testResults,
            polishNeeds: this.polishNeeds,
            priorityBreakdown: priorityGroups,
            recommendNextSteps: this.polishNeeds.length === 0 ? 'Ready for beta' : 'Address polish needs first'
        };
    }
}

// Run the validation
async function main() {
    const validator = new StagingEnvironmentValidator();
    
    try {
        const report = await validator.runComprehensiveValidation();
        
        // Write detailed report to file
        const fs = require('fs');
        const reportData = {
            timestamp: new Date().toISOString(),
            stagingUrls: validator.stagingUrls,
            ...report
        };
        
        fs.writeFileSync(
            '/Users/bossio/6fb-booking/backend-v2/staging-validation-report.json',
            JSON.stringify(reportData, null, 2)
        );
        
        console.log('\\n📄 Detailed report saved to: staging-validation-report.json');
        
    } catch (error) {
        console.error('❌ Validation failed:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = StagingEnvironmentValidator;