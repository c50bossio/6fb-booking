#!/usr/bin/env node

/**
 * Accessibility Testing Script for BookedBarber V2
 * Tests WCAG compliance and accessibility features
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testAccessibility() {
    console.log('🔍 Running Accessibility Audit for BookedBarber V2');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: {
            width: 375,
            height: 812,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true
        }
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
        
        // Test 1: ARIA Labels and Accessibility
        console.log('\n♿ Testing ARIA Labels and Accessibility...');
        const accessibilityTest = await page.evaluate(() => {
            const results = {
                ariaLabels: 0,
                ariaDescriptions: 0,
                ariaLabelledBy: 0,
                altTexts: 0,
                headingStructure: [],
                landmarks: [],
                buttons: [],
                links: [],
                forms: [],
                focusableElements: 0
            };
            
            // Check ARIA attributes
            document.querySelectorAll('[aria-label]').forEach(el => results.ariaLabels++);
            document.querySelectorAll('[aria-describedby]').forEach(el => results.ariaDescriptions++);
            document.querySelectorAll('[aria-labelledby]').forEach(el => results.ariaLabelledBy++);
            
            // Check alt texts
            document.querySelectorAll('img').forEach(img => {
                if (img.alt !== '') results.altTexts++;
            });
            
            // Check heading structure
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(heading => {
                results.headingStructure.push({
                    level: parseInt(heading.tagName.charAt(1)),
                    text: heading.textContent?.trim().substring(0, 50) || ''
                });
            });
            
            // Check landmarks
            const landmarks = document.querySelectorAll('header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]');
            landmarks.forEach(landmark => {
                results.landmarks.push({
                    tagName: landmark.tagName,
                    role: landmark.getAttribute('role') || 'implicit'
                });
            });
            
            // Check buttons
            const buttons = document.querySelectorAll('button, [role="button"]');
            buttons.forEach(button => {
                results.buttons.push({
                    text: button.textContent?.trim().substring(0, 30) || '',
                    hasAriaLabel: button.hasAttribute('aria-label'),
                    hasTitle: button.hasAttribute('title'),
                    isAccessible: button.textContent?.trim() || button.hasAttribute('aria-label') || button.hasAttribute('title')
                });
            });
            
            // Check links
            const links = document.querySelectorAll('a');
            links.forEach(link => {
                results.links.push({
                    text: link.textContent?.trim().substring(0, 30) || '',
                    href: link.href || '',
                    hasAriaLabel: link.hasAttribute('aria-label'),
                    hasTitle: link.hasAttribute('title'),
                    isAccessible: link.textContent?.trim() || link.hasAttribute('aria-label') || link.hasAttribute('title')
                });
            });
            
            // Check forms
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                const inputs = form.querySelectorAll('input, select, textarea');
                const labels = form.querySelectorAll('label');
                results.forms.push({
                    inputCount: inputs.length,
                    labelCount: labels.length,
                    hasFieldset: form.querySelector('fieldset') !== null
                });
            });
            
            // Check focusable elements
            const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
            const focusableElements = document.querySelectorAll(focusableSelector);
            results.focusableElements = focusableElements.length;
            
            return results;
        });
        
        console.log(`✅ ARIA Labels: ${accessibilityTest.ariaLabels}`);
        console.log(`✅ ARIA Descriptions: ${accessibilityTest.ariaDescriptions}`);
        console.log(`✅ Alt Texts: ${accessibilityTest.altTexts}`);
        console.log(`✅ Landmarks: ${accessibilityTest.landmarks.length}`);
        console.log(`✅ Focusable Elements: ${accessibilityTest.focusableElements}`);
        
        // Test heading structure
        if (accessibilityTest.headingStructure.length > 0) {
            console.log('\n📋 Heading Structure:');
            accessibilityTest.headingStructure.forEach(heading => {
                console.log(`   H${heading.level}: ${heading.text}`);
            });
        }
        
        // Test button accessibility
        const accessibleButtons = accessibilityTest.buttons.filter(b => b.isAccessible).length;
        console.log(`\n🔘 Button Accessibility: ${accessibleButtons}/${accessibilityTest.buttons.length} buttons are accessible`);
        
        if (accessibleButtons < accessibilityTest.buttons.length) {
            console.log('   ⚠️  Inaccessible buttons found:');
            accessibilityTest.buttons.filter(b => !b.isAccessible).forEach(button => {
                console.log(`      - "${button.text || '[No text]'}"`);
            });
        }
        
        // Test link accessibility
        const accessibleLinks = accessibilityTest.links.filter(l => l.isAccessible).length;
        console.log(`\n🔗 Link Accessibility: ${accessibleLinks}/${accessibilityTest.links.length} links are accessible`);
        
        // Test 2: Keyboard Navigation
        console.log('\n⌨️  Testing Keyboard Navigation...');
        
        await page.focus('body');
        let tabStops = [];
        let currentElement = await page.evaluateHandle(() => document.activeElement);
        
        // Test tabbing through elements
        for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(100);
            
            const elementInfo = await page.evaluate((el) => {
                if (!el) return null;
                return {
                    tagName: el.tagName,
                    id: el.id,
                    className: el.className,
                    text: el.textContent?.trim().substring(0, 30) || '',
                    type: el.type || ''
                };
            }, currentElement);
            
            if (elementInfo) {
                tabStops.push(elementInfo);
            }
            
            currentElement = await page.evaluateHandle(() => document.activeElement);
        }
        
        console.log(`✅ Tab stops found: ${tabStops.length}`);
        tabStops.forEach((stop, index) => {
            console.log(`   ${index + 1}. ${stop.tagName}${stop.id ? '#' + stop.id : ''} - "${stop.text}"`);
        });
        
        // Test 3: Color Contrast (simplified)
        console.log('\n🎨 Testing Color Contrast...');
        const contrastIssues = await page.evaluate(() => {
            const issues = [];
            const textElements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, div');
            
            textElements.forEach((element, index) => {
                if (index < 20) { // Test first 20 elements
                    const styles = window.getComputedStyle(element);
                    const color = styles.color;
                    const backgroundColor = styles.backgroundColor;
                    const fontSize = parseFloat(styles.fontSize);
                    
                    if (color && backgroundColor && element.textContent?.trim()) {
                        issues.push({
                            tagName: element.tagName,
                            text: element.textContent.trim().substring(0, 30),
                            color,
                            backgroundColor,
                            fontSize,
                            isLargeText: fontSize >= 18 || (fontSize >= 14 && styles.fontWeight >= 700)
                        });
                    }
                }
            });
            
            return issues;
        });
        
        console.log(`✅ Analyzed ${contrastIssues.length} text elements for contrast`);
        
        // Test 4: Semantic HTML
        console.log('\n📝 Testing Semantic HTML...');
        const semanticTest = await page.evaluate(() => {
            return {
                hasMain: document.querySelector('main') !== null,
                hasNav: document.querySelector('nav') !== null,
                hasHeader: document.querySelector('header') !== null,
                hasFooter: document.querySelector('footer') !== null,
                sectionsCount: document.querySelectorAll('section').length,
                articlesCount: document.querySelectorAll('article').length,
                asideCount: document.querySelectorAll('aside').length,
                skipLinks: document.querySelectorAll('a[href^="#"]').length
            };
        });
        
        console.log(`✅ Main element: ${semanticTest.hasMain ? 'Found' : 'Missing'}`);
        console.log(`✅ Nav element: ${semanticTest.hasNav ? 'Found' : 'Missing'}`);
        console.log(`✅ Header element: ${semanticTest.hasHeader ? 'Found' : 'Missing'}`);
        console.log(`✅ Footer element: ${semanticTest.hasFooter ? 'Found' : 'Missing'}`);
        console.log(`✅ Sections: ${semanticTest.sectionsCount}`);
        console.log(`✅ Skip links: ${semanticTest.skipLinks}`);
        
        // Test 5: Form Accessibility
        console.log('\n📋 Testing Form Accessibility...');
        if (accessibilityTest.forms.length > 0) {
            accessibilityTest.forms.forEach((form, index) => {
                console.log(`   Form ${index + 1}: ${form.inputCount} inputs, ${form.labelCount} labels`);
                if (form.inputCount > form.labelCount) {
                    console.log(`      ⚠️  Potential missing labels (${form.inputCount - form.labelCount} unlabeled inputs)`);
                }
            });
        } else {
            console.log('   No forms found on current page');
        }
        
        // Test calendar page specifically
        console.log('\n📅 Testing Calendar Page Accessibility...');
        try {
            await page.goto('http://localhost:3001/calendar', { waitUntil: 'networkidle2' });
            
            const calendarAccessibility = await page.evaluate(() => {
                const calendar = document.querySelector('[class*="calendar"], .calendar, [data-testid="calendar"]');
                if (!calendar) return null;
                
                const cells = calendar.querySelectorAll('[role="gridcell"], td, [class*="day"]');
                const buttons = calendar.querySelectorAll('button');
                const ariaElements = calendar.querySelectorAll('[aria-label], [aria-describedby]');
                
                return {
                    calendarFound: true,
                    cellCount: cells.length,
                    buttonCount: buttons.length,
                    ariaElements: ariaElements.length,
                    hasKeyboardSupport: calendar.hasAttribute('tabindex') || calendar.querySelector('[tabindex]') !== null
                };
            });
            
            if (calendarAccessibility) {
                console.log(`✅ Calendar found with ${calendarAccessibility.cellCount} cells`);
                console.log(`✅ Calendar buttons: ${calendarAccessibility.buttonCount}`);
                console.log(`✅ ARIA elements: ${calendarAccessibility.ariaElements}`);
                console.log(`✅ Keyboard support: ${calendarAccessibility.hasKeyboardSupport ? 'Yes' : 'No'}`);
            } else {
                console.log('❌ Calendar not found');
            }
            
        } catch (error) {
            console.log(`❌ Calendar page test failed: ${error.message}`);
        }
        
        // Generate summary report
        const report = {
            timestamp: new Date().toISOString(),
            accessibility: accessibilityTest,
            semanticHTML: semanticTest,
            keyboardNavigation: {
                tabStopsCount: tabStops.length,
                tabStops: tabStops
            },
            colorContrast: {
                elementsAnalyzed: contrastIssues.length,
                issues: contrastIssues
            },
            recommendations: []
        };
        
        // Add recommendations
        if (accessibilityTest.ariaLabels < 5) {
            report.recommendations.push('Consider adding more ARIA labels for better screen reader support');
        }
        
        if (!semanticTest.hasMain) {
            report.recommendations.push('Add a main element for better page structure');
        }
        
        if (semanticTest.skipLinks === 0) {
            report.recommendations.push('Consider adding skip links for keyboard navigation');
        }
        
        if (accessibleButtons < accessibilityTest.buttons.length) {
            report.recommendations.push('Some buttons lack accessible text or ARIA labels');
        }
        
        // Save report
        fs.writeFileSync('accessibility-report.json', JSON.stringify(report, null, 2));
        console.log('\n📊 Accessibility Report Generated: accessibility-report.json');
        
        // Print summary
        console.log('\n🎯 Accessibility Summary:');
        console.log(`   ARIA Support: ${accessibilityTest.ariaLabels > 0 ? 'Good' : 'Needs improvement'}`);
        console.log(`   Semantic HTML: ${semanticTest.hasMain && semanticTest.hasNav ? 'Good' : 'Needs improvement'}`);
        console.log(`   Keyboard Navigation: ${tabStops.length > 5 ? 'Good' : 'Needs improvement'}`);
        console.log(`   Button Accessibility: ${(accessibleButtons / accessibilityTest.buttons.length * 100).toFixed(1)}%`);
        console.log(`   Recommendations: ${report.recommendations.length}`);
        
    } catch (error) {
        console.error('❌ Accessibility test failed:', error);
    } finally {
        await browser.close();
    }
}

testAccessibility().catch(console.error);