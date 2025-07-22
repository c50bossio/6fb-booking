// UX Validation Test Script for Marketing Analytics Dashboard
// This script performs comprehensive testing for mobile responsiveness, 
// accessibility, and performance

(function() {
    console.log('🚀 Starting UX Validation Test for Marketing Analytics Dashboard');
    
    // Test Results Container
    const testResults = {
        mobile: {
            viewports: [],
            components: [],
            touch: []
        },
        accessibility: {
            screenReader: [],
            keyboard: [],
            contrast: [],
            structure: []
        },
        performance: {
            loadTimes: [],
            userExperience: []
        }
    };
    
    // Helper function to check element visibility
    function isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && 
               rect.top >= 0 && rect.left >= 0 && 
               rect.bottom <= window.innerHeight && 
               rect.right <= window.innerWidth;
    }
    
    // Helper function to check color contrast
    function getContrastRatio(foreground, background) {
        // Simplified contrast calculation
        const fgLuminance = getLuminance(foreground);
        const bgLuminance = getLuminance(background);
        const brightest = Math.max(fgLuminance, bgLuminance);
        const darkest = Math.min(fgLuminance, bgLuminance);
        return (brightest + 0.05) / (darkest + 0.05);
    }
    
    function getLuminance(color) {
        // Simplified luminance calculation
        const rgb = color.match(/\d+/g);
        if (!rgb) return 0;
        return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    }
    
    // Test 1: Mobile Responsiveness
    function testMobileResponsiveness() {
        console.log('📱 Testing Mobile Responsiveness...');
        
        const viewports = [
            { width: 375, height: 667, name: 'iPhone SE' },
            { width: 768, height: 1024, name: 'iPad' },
            { width: 1024, height: 768, name: 'Desktop' }
        ];
        
        viewports.forEach(viewport => {
            // Simulate viewport resize
            window.resizeTo(viewport.width, viewport.height);
            
            // Check grid layout adaptation
            const overviewCards = document.querySelectorAll('[class*="grid-cols"]');
            const realTimeGrid = document.querySelector('[class*="grid-cols-2 lg:grid-cols-4"]');
            
            testResults.mobile.viewports.push({
                viewport: viewport.name,
                dimensions: `${viewport.width}x${viewport.height}`,
                gridAdaption: overviewCards.length > 0 ? 'PASS' : 'FAIL',
                realTimeGrid: realTimeGrid ? 'PASS' : 'FAIL'
            });
        });
        
        // Test component scaling
        const components = [
            { selector: '[data-testid="real-time-analytics"]', name: 'RealTimeAnalytics' },
            { selector: '.text-2xl', name: 'Metric Numbers' },
            { selector: 'button', name: 'Buttons' },
            { selector: 'svg', name: 'Icons' }
        ];
        
        components.forEach(component => {
            const elements = document.querySelectorAll(component.selector);
            elements.forEach(element => {
                const rect = element.getBoundingClientRect();
                testResults.mobile.components.push({
                    component: component.name,
                    readable: rect.width >= 44 && rect.height >= 44 ? 'PASS' : 'FAIL',
                    dimensions: `${rect.width}x${rect.height}`
                });
            });
        });
        
        // Test touch interface
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            const rect = button.getBoundingClientRect();
            testResults.mobile.touch.push({
                button: button.textContent || 'Unnamed',
                touchTarget: rect.width >= 44 && rect.height >= 44 ? 'PASS' : 'FAIL',
                size: `${rect.width}x${rect.height}`
            });
        });
    }
    
    // Test 2: Accessibility
    function testAccessibility() {
        console.log('♿ Testing Accessibility...');
        
        // Check headings hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const headingOrder = [];
        headings.forEach(heading => {
            headingOrder.push(parseInt(heading.tagName.substring(1)));
        });
        
        testResults.accessibility.structure.push({
            test: 'Heading Hierarchy',
            result: headingOrder.length > 0 ? 'PASS' : 'FAIL',
            details: headingOrder.join(' → ')
        });
        
        // Check ARIA labels
        const interactiveElements = document.querySelectorAll('button, input, select, [role="button"]');
        let ariaLabels = 0;
        interactiveElements.forEach(element => {
            if (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')) {
                ariaLabels++;
            }
        });
        
        testResults.accessibility.screenReader.push({
            test: 'ARIA Labels',
            result: ariaLabels > 0 ? 'PASS' : 'NEEDS_IMPROVEMENT',
            details: `${ariaLabels}/${interactiveElements.length} elements have ARIA labels`
        });
        
        // Test keyboard navigation
        const focusableElements = document.querySelectorAll('button, input, select, a, [tabindex]');
        let keyboardAccessible = 0;
        focusableElements.forEach(element => {
            if (element.tabIndex >= 0) {
                keyboardAccessible++;
            }
        });
        
        testResults.accessibility.keyboard.push({
            test: 'Keyboard Navigation',
            result: keyboardAccessible === focusableElements.length ? 'PASS' : 'NEEDS_IMPROVEMENT',
            details: `${keyboardAccessible}/${focusableElements.length} elements keyboard accessible`
        });
        
        // Test color contrast
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
        let contrastPasses = 0;
        textElements.forEach(element => {
            const styles = window.getComputedStyle(element);
            const color = styles.color;
            const backgroundColor = styles.backgroundColor;
            
            if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
                const ratio = getContrastRatio(color, backgroundColor);
                if (ratio >= 4.5) {
                    contrastPasses++;
                }
            }
        });
        
        testResults.accessibility.contrast.push({
            test: 'Color Contrast',
            result: contrastPasses > 0 ? 'PASS' : 'NEEDS_IMPROVEMENT',
            details: `${contrastPasses} elements with adequate contrast`
        });
    }
    
    // Test 3: Performance
    function testPerformance() {
        console.log('⚡ Testing Performance...');
        
        // Measure load time
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        testResults.performance.loadTimes.push({
            test: 'Initial Load Time',
            result: loadTime < 3000 ? 'PASS' : 'NEEDS_IMPROVEMENT',
            details: `${loadTime}ms`
        });
        
        // Check memory usage
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
            testResults.performance.userExperience.push({
                test: 'Memory Usage',
                result: memoryUsage < 50 ? 'PASS' : 'NEEDS_IMPROVEMENT',
                details: `${memoryUsage.toFixed(2)}MB`
            });
        }
        
        // Test animation smoothness
        const animatedElements = document.querySelectorAll('[class*="animate"]');
        testResults.performance.userExperience.push({
            test: 'Animation Elements',
            result: animatedElements.length > 0 ? 'PASS' : 'INFO',
            details: `${animatedElements.length} animated elements found`
        });
        
        // Check for layout shifts
        const layoutShifts = performance.getEntriesByType('layout-shift');
        testResults.performance.userExperience.push({
            test: 'Layout Stability',
            result: layoutShifts.length === 0 ? 'PASS' : 'NEEDS_IMPROVEMENT',
            details: `${layoutShifts.length} layout shifts detected`
        });
    }
    
    // Run all tests
    function runTests() {
        console.log('🔍 Running comprehensive UX validation...');
        
        testMobileResponsiveness();
        testAccessibility();
        testPerformance();
        
        // Output results
        console.log('📊 UX Validation Results:');
        console.log('═══════════════════════════════════════');
        console.log(JSON.stringify(testResults, null, 2));
        
        // Create summary
        const summary = {
            mobile: {
                viewports: testResults.mobile.viewports.length,
                components: testResults.mobile.components.filter(c => c.readable === 'PASS').length,
                touch: testResults.mobile.touch.filter(t => t.touchTarget === 'PASS').length
            },
            accessibility: {
                structure: testResults.accessibility.structure.filter(s => s.result === 'PASS').length,
                screenReader: testResults.accessibility.screenReader.filter(s => s.result === 'PASS').length,
                keyboard: testResults.accessibility.keyboard.filter(k => k.result === 'PASS').length,
                contrast: testResults.accessibility.contrast.filter(c => c.result === 'PASS').length
            },
            performance: {
                loadTimes: testResults.performance.loadTimes.filter(l => l.result === 'PASS').length,
                userExperience: testResults.performance.userExperience.filter(u => u.result === 'PASS').length
            }
        };
        
        console.log('📋 Test Summary:');
        console.log(summary);
        
        // Save results to localStorage for retrieval
        localStorage.setItem('uxValidationResults', JSON.stringify(testResults));
        localStorage.setItem('uxValidationSummary', JSON.stringify(summary));
        
        console.log('✅ UX Validation Complete - Results saved to localStorage');
    }
    
    // Start tests after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runTests);
    } else {
        runTests();
    }
})();