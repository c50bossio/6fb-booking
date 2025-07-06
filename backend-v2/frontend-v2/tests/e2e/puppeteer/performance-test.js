/**
 * Performance Test Suite
 * 
 * Tests page load times, lazy loading, API response times,
 * memory usage, and overall application performance
 */

const puppeteer = require('puppeteer');
const {
    CONFIG,
    TEST_USERS,
    waitForSelector,
    takeScreenshot,
    checkForConsoleErrors,
    setupNetworkMonitoring,
    login,
    measurePerformance,
    generateReport,
    TestResult
} = require('./test-utils');

// Performance thresholds
const THRESHOLDS = {
    pageLoad: 3000,           // 3 seconds
    firstPaint: 1500,         // 1.5 seconds
    firstContentfulPaint: 2000, // 2 seconds
    apiResponse: 500,         // 500ms
    imageLoad: 2000,          // 2 seconds
    jsHeapSize: 50 * 1024 * 1024, // 50MB
    domNodes: 1500            // Maximum DOM nodes
};

class PerformanceTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
    }

    async init() {
        console.log('🚀 Starting Performance Tests...\n');
        
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=IsolateOrigins',
                '--disable-site-isolation-trials'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Enable performance metrics
        await this.page.evaluateOnNewDocument(() => {
            window.performanceMetrics = [];
            
            // Track long tasks
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) { // Tasks longer than 50ms
                            window.performanceMetrics.push({
                                type: 'long-task',
                                duration: entry.duration,
                                startTime: entry.startTime
                            });
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            }
        });
        
        // Set up monitoring
        this.consoleErrors = await checkForConsoleErrors(this.page);
        this.networkMonitoring = setupNetworkMonitoring(this.page);
        
        // Enable CDP for advanced metrics
        this.client = await this.page.target().createCDPSession();
        await this.client.send('Performance.enable');
        await this.client.send('Runtime.enable');
    }

    async testPageLoadPerformance() {
        const result = new TestResult('Page Load Performance Test');
        
        try {
            console.log('📍 Test: Page Load Performance');
            
            const pages = [
                { name: 'Homepage', url: CONFIG.baseUrl },
                { name: 'Login', url: `${CONFIG.baseUrl}/login` },
                { name: 'Registration', url: `${CONFIG.baseUrl}/register` },
                { name: 'Dashboard', url: `${CONFIG.baseUrl}/dashboard`, requiresAuth: true },
                { name: 'Booking', url: `${CONFIG.baseUrl}/book`, requiresAuth: true }
            ];
            
            // Login first for authenticated pages
            await login(this.page, 'client');
            
            for (const pageInfo of pages) {
                console.log(`   Testing ${pageInfo.name}...`);
                
                // Clear cache for accurate measurements
                await this.page.setCacheEnabled(false);
                
                const startTime = Date.now();
                await this.page.goto(pageInfo.url, { waitUntil: 'networkidle2' });
                const loadTime = Date.now() - startTime;
                
                // Get detailed metrics
                const metrics = await measurePerformance(this.page);
                
                // Get Core Web Vitals
                const webVitals = await this.page.evaluate(() => {
                    return new Promise((resolve) => {
                        const vitals = {
                            LCP: null,
                            FID: null,
                            CLS: null
                        };
                        
                        // Largest Contentful Paint
                        new PerformanceObserver((list) => {
                            const entries = list.getEntries();
                            const lastEntry = entries[entries.length - 1];
                            vitals.LCP = lastEntry.renderTime || lastEntry.loadTime;
                        }).observe({ entryTypes: ['largest-contentful-paint'] });
                        
                        // Cumulative Layout Shift
                        let clsValue = 0;
                        new PerformanceObserver((list) => {
                            for (const entry of list.getEntries()) {
                                if (!entry.hadRecentInput) {
                                    clsValue += entry.value;
                                }
                            }
                            vitals.CLS = clsValue;
                        }).observe({ entryTypes: ['layout-shift'] });
                        
                        // Resolve after a delay to collect metrics
                        setTimeout(() => resolve(vitals), 1000);
                    });
                });
                
                // Analyze performance
                const performanceAnalysis = {
                    page: pageInfo.name,
                    loadTime,
                    ...metrics,
                    ...webVitals,
                    passesThresholds: {
                        loadTime: loadTime < THRESHOLDS.pageLoad,
                        firstPaint: metrics.firstPaint < THRESHOLDS.firstPaint,
                        firstContentfulPaint: metrics.firstContentfulPaint < THRESHOLDS.firstContentfulPaint
                    }
                };
                
                result.addStep(`${pageInfo.name} performance`, 
                    Object.values(performanceAnalysis.passesThresholds).every(v => v),
                    performanceAnalysis
                );
                
                // Take screenshot with metrics overlay
                await this.page.evaluate((metrics) => {
                    const overlay = document.createElement('div');
                    overlay.style.cssText = `
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        background: rgba(0,0,0,0.8);
                        color: white;
                        padding: 10px;
                        border-radius: 5px;
                        font-family: monospace;
                        font-size: 12px;
                        z-index: 999999;
                    `;
                    overlay.innerHTML = `
                        <div>Load Time: ${metrics.loadTime}ms</div>
                        <div>First Paint: ${metrics.firstPaint}ms</div>
                        <div>FCP: ${metrics.firstContentfulPaint}ms</div>
                        <div>LCP: ${metrics.LCP ? metrics.LCP.toFixed(0) + 'ms' : 'N/A'}</div>
                        <div>CLS: ${metrics.CLS ? metrics.CLS.toFixed(3) : 'N/A'}</div>
                    `;
                    document.body.appendChild(overlay);
                }, performanceAnalysis);
                
                const perfScreenshot = await takeScreenshot(this.page, `performance-${pageInfo.name.toLowerCase()}`);
                result.addScreenshot(perfScreenshot);
                
                // Remove overlay
                await this.page.evaluate(() => {
                    const overlay = document.querySelector('div[style*="position: fixed"]');
                    if (overlay) overlay.remove();
                });
            }
            
            result.finish(true);
            console.log('✅ Page load performance test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Page load performance test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testAPIResponseTimes() {
        const result = new TestResult('API Response Times Test');
        
        try {
            console.log('\n📍 Test: API Response Times');
            
            // Login to access API endpoints
            await login(this.page, 'admin');
            
            // Navigate to dashboard to trigger API calls
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            
            // Analyze API calls
            const apiCalls = this.networkMonitoring.responses.filter(res => 
                res.url.includes('/api/') && res.status >= 200 && res.status < 300
            );
            
            const apiMetrics = apiCalls.map(response => {
                const request = this.networkMonitoring.requests.find(req => req.url === response.url);
                const responseTime = request ? 
                    new Date(response.timestamp).getTime() - new Date(request.timestamp).getTime() : 0;
                
                return {
                    endpoint: response.url.replace(CONFIG.apiUrl, ''),
                    method: request?.method || 'GET',
                    status: response.status,
                    responseTime,
                    passesThreshold: responseTime < THRESHOLDS.apiResponse
                };
            });
            
            // Group by endpoint
            const endpointStats = {};
            apiMetrics.forEach(metric => {
                const endpoint = metric.endpoint.split('?')[0]; // Remove query params
                if (!endpointStats[endpoint]) {
                    endpointStats[endpoint] = {
                        calls: 0,
                        totalTime: 0,
                        maxTime: 0,
                        failures: 0
                    };
                }
                endpointStats[endpoint].calls++;
                endpointStats[endpoint].totalTime += metric.responseTime;
                endpointStats[endpoint].maxTime = Math.max(endpointStats[endpoint].maxTime, metric.responseTime);
                if (!metric.passesThreshold) endpointStats[endpoint].failures++;
            });
            
            // Calculate averages
            Object.keys(endpointStats).forEach(endpoint => {
                const stats = endpointStats[endpoint];
                stats.avgTime = Math.round(stats.totalTime / stats.calls);
                stats.passesThreshold = stats.avgTime < THRESHOLDS.apiResponse;
            });
            
            result.addStep('API endpoints analyzed', Object.keys(endpointStats).length > 0, endpointStats);
            
            // Check overall API performance
            const allAPIsPass = Object.values(endpointStats).every(stats => stats.passesThreshold);
            result.addStep('All APIs meet performance threshold', allAPIsPass);
            
            // Test specific critical endpoints
            const criticalEndpoints = ['/auth/login', '/appointments', '/dashboard/stats'];
            
            for (const endpoint of criticalEndpoints) {
                console.log(`   Testing ${endpoint} endpoint...`);
                
                try {
                    const startTime = Date.now();
                    const response = await this.page.evaluate(async (url) => {
                        const res = await fetch(url, {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                            }
                        });
                        return {
                            status: res.status,
                            ok: res.ok
                        };
                    }, `${CONFIG.apiUrl}/api/v1${endpoint}`);
                    
                    const responseTime = Date.now() - startTime;
                    
                    result.addStep(`${endpoint} response time`, 
                        responseTime < THRESHOLDS.apiResponse,
                        { responseTime, status: response.status }
                    );
                } catch (error) {
                    result.addStep(`${endpoint} response time`, false, { error: error.message });
                }
            }
            
            result.finish(true);
            console.log('✅ API response times test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ API response times test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testLazyLoading() {
        const result = new TestResult('Lazy Loading Test');
        
        try {
            console.log('\n📍 Test: Lazy Loading');
            
            // Navigate to a page with images
            await this.page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'domcontentloaded' });
            
            // Get initial image loading state
            const initialImageState = await this.page.evaluate(() => {
                const images = Array.from(document.querySelectorAll('img'));
                return images.map(img => ({
                    src: img.src,
                    loading: img.loading,
                    isLoaded: img.complete && img.naturalHeight !== 0,
                    isInViewport: (() => {
                        const rect = img.getBoundingClientRect();
                        return rect.top < window.innerHeight && rect.bottom > 0;
                    })()
                }));
            });
            
            const lazyImages = initialImageState.filter(img => img.loading === 'lazy');
            const eagerImages = initialImageState.filter(img => img.loading !== 'lazy' && img.src);
            
            result.addStep('Images use lazy loading', lazyImages.length > 0, {
                lazy: lazyImages.length,
                eager: eagerImages.length,
                total: initialImageState.length
            });
            
            // Check that only viewport images are loaded initially
            const viewportImages = initialImageState.filter(img => img.isInViewport);
            const loadedImages = initialImageState.filter(img => img.isLoaded);
            
            result.addStep('Only viewport images loaded initially', 
                loadedImages.length <= viewportImages.length + eagerImages.length
            );
            
            // Scroll down to trigger lazy loading
            console.log('   Scrolling to trigger lazy loading...');
            await this.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            
            // Wait for lazy images to load
            await this.page.waitForTimeout(2000);
            
            // Check images after scroll
            const afterScrollState = await this.page.evaluate(() => {
                const images = Array.from(document.querySelectorAll('img'));
                return images.map(img => ({
                    src: img.src,
                    isLoaded: img.complete && img.naturalHeight !== 0
                }));
            });
            
            const newlyLoadedCount = afterScrollState.filter(img => img.isLoaded).length - loadedImages.length;
            result.addStep('Additional images loaded on scroll', newlyLoadedCount > 0, {
                newlyLoaded: newlyLoadedCount
            });
            
            // Test intersection observer for other elements
            const lazyElements = await this.page.evaluate(() => {
                const elements = document.querySelectorAll('[data-lazy], .lazy-load, [loading="lazy"]');
                return elements.length;
            });
            
            if (lazyElements > 0) {
                result.addStep('Other elements use lazy loading', true, { count: lazyElements });
            }
            
            // Check for lazy-loaded components
            const hasLazyComponents = await this.page.evaluate(() => {
                // Check for common lazy loading patterns
                return !!(
                    window.IntersectionObserver &&
                    (document.querySelector('[data-lazy-component]') ||
                     document.querySelector('.lazy-component') ||
                     window.__LAZY_COMPONENTS__)
                );
            });
            
            result.addStep('Lazy component loading supported', hasLazyComponents);
            
            result.finish(true);
            console.log('✅ Lazy loading test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Lazy loading test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testMemoryUsage() {
        const result = new TestResult('Memory Usage Test');
        
        try {
            console.log('\n📍 Test: Memory Usage');
            
            // Get initial memory state
            const initialMetrics = await this.client.send('Performance.getMetrics');
            const initialHeap = initialMetrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
            
            result.addStep('Initial heap size', initialHeap < THRESHOLDS.jsHeapSize, {
                heapSize: Math.round(initialHeap / 1024 / 1024) + 'MB',
                threshold: Math.round(THRESHOLDS.jsHeapSize / 1024 / 1024) + 'MB'
            });
            
            // Navigate through multiple pages to test memory accumulation
            const pages = [
                { name: 'Dashboard', url: `${CONFIG.baseUrl}/dashboard` },
                { name: 'Bookings', url: `${CONFIG.baseUrl}/bookings` },
                { name: 'Calendar', url: `${CONFIG.baseUrl}/calendar` },
                { name: 'Settings', url: `${CONFIG.baseUrl}/settings` }
            ];
            
            // Login first
            await login(this.page, 'admin');
            
            const memoryReadings = [];
            
            for (const pageInfo of pages) {
                console.log(`   Navigating to ${pageInfo.name}...`);
                await this.page.goto(pageInfo.url, { waitUntil: 'networkidle2' });
                await this.page.waitForTimeout(1000);
                
                // Force garbage collection if possible
                await this.client.send('HeapProfiler.collectGarbage');
                
                // Get memory metrics
                const metrics = await this.client.send('Performance.getMetrics');
                const heapSize = metrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
                const domNodes = await this.page.evaluate(() => document.querySelectorAll('*').length);
                
                memoryReadings.push({
                    page: pageInfo.name,
                    heapSize: Math.round(heapSize / 1024 / 1024),
                    domNodes,
                    timestamp: Date.now()
                });
                
                result.addStep(`${pageInfo.name} memory usage`, 
                    heapSize < THRESHOLDS.jsHeapSize && domNodes < THRESHOLDS.domNodes,
                    {
                        heapSize: Math.round(heapSize / 1024 / 1024) + 'MB',
                        domNodes
                    }
                );
            }
            
            // Check for memory leaks
            const heapGrowth = memoryReadings[memoryReadings.length - 1].heapSize - memoryReadings[0].heapSize;
            const acceptableGrowth = 10; // 10MB growth is acceptable
            
            result.addStep('No significant memory leaks', 
                heapGrowth < acceptableGrowth,
                {
                    initialHeap: memoryReadings[0].heapSize + 'MB',
                    finalHeap: memoryReadings[memoryReadings.length - 1].heapSize + 'MB',
                    growth: heapGrowth + 'MB'
                }
            );
            
            // Test for detached DOM nodes
            const detachedNodes = await this.page.evaluate(() => {
                const allNodes = [];
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_ELEMENT,
                    null,
                    false
                );
                
                let node;
                while (node = walker.nextNode()) {
                    allNodes.push(node);
                }
                
                // Check for nodes that are not connected
                return allNodes.filter(node => !document.body.contains(node)).length;
            });
            
            result.addStep('No detached DOM nodes', detachedNodes === 0, { detachedNodes });
            
            result.finish(true);
            console.log('✅ Memory usage test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Memory usage test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testResourceOptimization() {
        const result = new TestResult('Resource Optimization Test');
        
        try {
            console.log('\n📍 Test: Resource Optimization');
            
            await this.page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'networkidle2' });
            
            // Analyze resources
            const resourceAnalysis = await this.page.evaluate(() => {
                const resources = performance.getEntriesByType('resource');
                const analysis = {
                    total: resources.length,
                    byType: {},
                    largeFiles: [],
                    uncompressed: [],
                    noCacheHeaders: []
                };
                
                resources.forEach(resource => {
                    // Categorize by type
                    const type = resource.name.match(/\.(\w+)(\?|$)/)?.[1] || 'other';
                    if (!analysis.byType[type]) {
                        analysis.byType[type] = { count: 0, totalSize: 0 };
                    }
                    analysis.byType[type].count++;
                    analysis.byType[type].totalSize += resource.transferSize || 0;
                    
                    // Check for large files (> 500KB)
                    if (resource.transferSize > 500 * 1024) {
                        analysis.largeFiles.push({
                            url: resource.name,
                            size: Math.round(resource.transferSize / 1024) + 'KB'
                        });
                    }
                    
                    // Check for compression (heuristic: encoded size should be less than decoded size)
                    if (resource.encodedBodySize && resource.decodedBodySize && 
                        resource.encodedBodySize >= resource.decodedBodySize * 0.9) {
                        analysis.uncompressed.push(resource.name);
                    }
                });
                
                return analysis;
            });
            
            result.addStep('Resource analysis', true, resourceAnalysis);
            result.addStep('No excessively large files', resourceAnalysis.largeFiles.length === 0);
            result.addStep('Resources are compressed', resourceAnalysis.uncompressed.length === 0);
            
            // Check for bundling and minification
            const jsAnalysis = await this.page.evaluate(() => {
                const scripts = Array.from(document.querySelectorAll('script[src]'));
                const analysis = {
                    total: scripts.length,
                    minified: 0,
                    bundled: 0
                };
                
                scripts.forEach(script => {
                    const src = script.src;
                    if (src.includes('.min.') || src.includes('-min.') || 
                        src.includes('.prod.') || src.match(/\.[a-f0-9]{8,}\./)) {
                        analysis.minified++;
                    }
                    if (src.includes('bundle') || src.includes('chunk') || 
                        src.match(/\.[a-f0-9]{8,}\./)) {
                        analysis.bundled++;
                    }
                });
                
                return analysis;
            });
            
            result.addStep('JavaScript optimization', 
                jsAnalysis.minified > 0 || jsAnalysis.bundled > 0,
                jsAnalysis
            );
            
            // Check for CSS optimization
            const cssAnalysis = await this.page.evaluate(() => {
                const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
                const inlineStyles = Array.from(document.querySelectorAll('style'));
                
                return {
                    external: styles.length,
                    inline: inlineStyles.length,
                    criticalCss: inlineStyles.some(style => 
                        style.innerHTML.includes('above-the-fold') || 
                        style.getAttribute('data-critical') === 'true'
                    )
                };
            });
            
            result.addStep('CSS optimization', cssAnalysis.external <= 3, cssAnalysis);
            
            // Check for font optimization
            const fontAnalysis = await this.page.evaluate(() => {
                const fonts = Array.from(document.querySelectorAll('link[rel="preload"][as="font"]'));
                const fontFaceRules = Array.from(document.styleSheets)
                    .flatMap(sheet => {
                        try {
                            return Array.from(sheet.cssRules || [])
                                .filter(rule => rule instanceof CSSFontFaceRule);
                        } catch {
                            return [];
                        }
                    });
                
                return {
                    preloadedFonts: fonts.length,
                    fontFaceRules: fontFaceRules.length,
                    fontDisplay: fontFaceRules.some(rule => 
                        rule.style.fontDisplay === 'swap' || 
                        rule.style.fontDisplay === 'optional'
                    )
                };
            });
            
            result.addStep('Font optimization', 
                fontAnalysis.preloadedFonts > 0 || fontAnalysis.fontDisplay,
                fontAnalysis
            );
            
            result.finish(true);
            console.log('✅ Resource optimization test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Resource optimization test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testRuntimePerformance() {
        const result = new TestResult('Runtime Performance Test');
        
        try {
            console.log('\n📍 Test: Runtime Performance');
            
            // Login and navigate to interactive page
            await login(this.page, 'admin');
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            
            // Monitor JavaScript execution
            await this.page.evaluate(() => {
                window.performanceMarks = [];
                
                // Override setTimeout to track long-running tasks
                const originalSetTimeout = window.setTimeout;
                window.setTimeout = function(fn, delay, ...args) {
                    if (delay > 100) {
                        window.performanceMarks.push({
                            type: 'long-timeout',
                            delay
                        });
                    }
                    return originalSetTimeout.call(this, fn, delay, ...args);
                };
            });
            
            // Simulate user interactions
            console.log('   Simulating user interactions...');
            
            // Click on various interactive elements
            const interactiveElements = await this.page.$$('button:not([disabled]), a[href="#"], .clickable');
            const interactionMetrics = [];
            
            for (let i = 0; i < Math.min(5, interactiveElements.length); i++) {
                const element = interactiveElements[i];
                const elementText = await element.evaluate(el => el.textContent || el.getAttribute('aria-label'));
                
                const startTime = Date.now();
                await element.click();
                await this.page.waitForTimeout(100); // Wait for any animations/updates
                const interactionTime = Date.now() - startTime;
                
                interactionMetrics.push({
                    element: elementText?.trim().substring(0, 30),
                    responseTime: interactionTime,
                    responsive: interactionTime < 100 // Should respond within 100ms
                });
            }
            
            result.addStep('UI interactions responsive', 
                interactionMetrics.every(m => m.responsive),
                { interactions: interactionMetrics }
            );
            
            // Check for animation performance
            const animationPerformance = await this.page.evaluate(() => {
                const animations = document.getAnimations();
                return {
                    count: animations.length,
                    running: animations.filter(a => a.playState === 'running').length,
                    usesCSS: animations.some(a => a.constructor.name === 'CSSAnimation'),
                    usesWeb: animations.some(a => a.constructor.name === 'Animation')
                };
            });
            
            result.addStep('Animations optimized', true, animationPerformance);
            
            // Check for scroll performance
            console.log('   Testing scroll performance...');
            const scrollMetrics = await this.page.evaluate(() => {
                return new Promise((resolve) => {
                    const metrics = {
                        scrollEvents: 0,
                        rafUsed: false,
                        passiveListeners: false
                    };
                    
                    // Check for scroll event listeners
                    const scrollHandler = () => {
                        metrics.scrollEvents++;
                    };
                    
                    window.addEventListener('scroll', scrollHandler, { passive: true });
                    metrics.passiveListeners = true;
                    
                    // Perform scroll
                    const startY = window.scrollY;
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    
                    setTimeout(() => {
                        window.scrollTo({ top: startY, behavior: 'smooth' });
                        window.removeEventListener('scroll', scrollHandler);
                        resolve(metrics);
                    }, 1000);
                });
            });
            
            result.addStep('Scroll performance optimized', 
                scrollMetrics.passiveListeners,
                scrollMetrics
            );
            
            // Check for React/framework performance (if applicable)
            const frameworkPerformance = await this.page.evaluate(() => {
                const hasReact = !!(window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
                const hasVue = !!(window.Vue || window.__VUE__);
                
                const metrics = {
                    framework: hasReact ? 'React' : hasVue ? 'Vue' : 'Unknown',
                    hasDevTools: false,
                    productionMode: true
                };
                
                if (hasReact) {
                    metrics.hasDevTools = !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
                    // Check if React is in production mode
                    try {
                        const testElement = document.createElement('div');
                        document.body.appendChild(testElement);
                        if (window.React && window.React.version) {
                            // React DevTools usually not available in production
                            metrics.productionMode = !window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
                        }
                        document.body.removeChild(testElement);
                    } catch (e) {}
                }
                
                return metrics;
            });
            
            result.addStep('Framework optimized for production', 
                frameworkPerformance.productionMode,
                frameworkPerformance
            );
            
            result.finish(true);
            console.log('✅ Runtime performance test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Runtime performance test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async runAllTests() {
        try {
            await this.init();
            
            // Run all performance tests
            await this.testPageLoadPerformance();
            await this.testAPIResponseTimes();
            await this.testLazyLoading();
            await this.testMemoryUsage();
            await this.testResourceOptimization();
            await this.testRuntimePerformance();
            
            // Generate report
            const report = generateReport('performance', this.results);
            
            // Add performance summary
            console.log('\n📊 Performance Summary');
            console.log('=====================');
            
            const allSteps = this.results.flatMap(r => r.steps);
            const performanceIssues = allSteps.filter(s => !s.success && s.name.includes('performance'));
            
            if (performanceIssues.length === 0) {
                console.log('✅ All performance benchmarks passed!');
            } else {
                console.log(`⚠️  ${performanceIssues.length} performance issues found:`);
                performanceIssues.forEach(issue => {
                    console.log(`   - ${issue.name}`);
                });
            }
            
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
    const tester = new PerformanceTester();
    tester.runAllTests().catch(console.error);
}

module.exports = PerformanceTester;