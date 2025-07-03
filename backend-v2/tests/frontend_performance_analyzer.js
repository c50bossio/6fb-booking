/**
 * BookedBarber V2 Frontend Performance Analyzer
 * Comprehensive frontend performance testing using Puppeteer
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class FrontendPerformanceAnalyzer {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.results = [];
        this.testRoutes = [
            { path: '/', name: 'Homepage' },
            { path: '/dashboard', name: 'Dashboard' },
            { path: '/calendar', name: 'Calendar' },
            { path: '/analytics', name: 'Analytics' },
            { path: '/booking', name: 'Booking' },
            { path: '/login', name: 'Login' },
            { path: '/register', name: 'Register' }
        ];
        
        this.performanceThresholds = {
            firstContentfulPaint: 1500,  // ms
            largestContentfulPaint: 2500, // ms
            firstInputDelay: 100,         // ms
            cumulativeLayoutShift: 0.1,   // score
            totalBlockingTime: 300,       // ms
            loadTime: 3000               // ms
        };
    }

    async initializeBrowser() {
        console.log('🚀 Initializing browser for performance testing...');
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async measurePagePerformance(route) {
        console.log(`📊 Testing ${route.name} (${route.path})...`);
        
        const page = await this.browser.newPage();
        
        // Set viewport for consistent testing
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Enable performance monitoring
        await page.setCacheEnabled(false);
        const client = await page.target().createCDPSession();
        await client.send('Performance.enable');
        await client.send('Runtime.enable');
        
        const url = `${this.baseUrl}${route.path}`;
        const startTime = Date.now();
        
        try {
            // Start tracing for detailed performance metrics
            await page.tracing.start({
                path: `trace_${route.name.toLowerCase()}.json`,
                screenshots: true
            });
            
            // Navigate to page
            const response = await page.goto(url, {
                waitUntil: ['networkidle2', 'domcontentloaded'],
                timeout: 30000
            });
            
            const loadTime = Date.now() - startTime;
            
            // Wait for any dynamic content to load
            await page.waitForTimeout(2000);
            
            // Get Core Web Vitals
            const coreWebVitals = await this.getCoreWebVitals(page);
            
            // Get resource loading metrics
            const resourceMetrics = await this.getResourceMetrics(page);
            
            // Get bundle size analysis
            const bundleAnalysis = await this.analyzeBundleSize(page);
            
            // Get JavaScript performance metrics
            const jsPerformance = await this.getJavaScriptPerformance(page);
            
            // Take screenshot for visual verification
            const screenshotPath = `screenshot_${route.name.toLowerCase()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: false });
            
            // Stop tracing
            await page.tracing.stop();
            
            // Get Lighthouse metrics (simplified)
            const lighthouseMetrics = await this.getLighthouseMetrics(page);
            
            const result = {
                route: route.path,
                name: route.name,
                url: url,
                timestamp: new Date().toISOString(),
                loadTime: loadTime,
                statusCode: response ? response.status() : 0,
                coreWebVitals: coreWebVitals,
                resourceMetrics: resourceMetrics,
                bundleAnalysis: bundleAnalysis,
                jsPerformance: jsPerformance,
                lighthouseMetrics: lighthouseMetrics,
                screenshot: screenshotPath,
                traceFile: `trace_${route.name.toLowerCase()}.json`,
                performance: this.evaluatePerformance(loadTime, coreWebVitals)
            };
            
            console.log(`✅ ${route.name}: ${loadTime}ms load time`);
            await page.close();
            return result;
            
        } catch (error) {
            console.log(`❌ Error testing ${route.name}: ${error.message}`);
            await page.close();
            return {
                route: route.path,
                name: route.name,
                url: url,
                error: error.message,
                timestamp: new Date().toISOString(),
                loadTime: Date.now() - startTime
            };
        }
    }

    async getCoreWebVitals(page) {
        return await page.evaluate(() => {
            return new Promise((resolve) => {
                const vitals = {
                    fcp: null, // First Contentful Paint
                    lcp: null, // Largest Contentful Paint
                    fid: null, // First Input Delay
                    cls: null, // Cumulative Layout Shift
                    tbt: null  // Total Blocking Time
                };

                // FCP - First Contentful Paint
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        if (entry.name === 'first-contentful-paint') {
                            vitals.fcp = entry.startTime;
                        }
                    });
                }).observe({ entryTypes: ['paint'] });

                // LCP - Largest Contentful Paint
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    vitals.lcp = lastEntry.startTime;
                }).observe({ entryTypes: ['largest-contentful-paint'] });

                // CLS - Cumulative Layout Shift
                let clsValue = 0;
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                    vitals.cls = clsValue;
                }).observe({ entryTypes: ['layout-shift'] });

                // Get navigation timing
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    vitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
                    vitals.loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
                }

                // Resolve after a short delay to collect metrics
                setTimeout(() => resolve(vitals), 1000);
            });
        });
    }

    async getResourceMetrics(page) {
        return await page.evaluate(() => {
            const resources = performance.getEntriesByType('resource');
            const resourceSummary = {
                totalResources: resources.length,
                totalSize: 0,
                byType: {},
                largestResources: [],
                slowestResources: []
            };

            resources.forEach(resource => {
                const type = resource.initiatorType || 'other';
                const size = resource.transferSize || 0;
                const duration = resource.duration;

                if (!resourceSummary.byType[type]) {
                    resourceSummary.byType[type] = {
                        count: 0,
                        totalSize: 0,
                        avgDuration: 0
                    };
                }

                resourceSummary.byType[type].count++;
                resourceSummary.byType[type].totalSize += size;
                resourceSummary.totalSize += size;

                // Track largest and slowest resources
                if (size > 100000) { // > 100KB
                    resourceSummary.largestResources.push({
                        name: resource.name,
                        size: size,
                        type: type
                    });
                }

                if (duration > 1000) { // > 1s
                    resourceSummary.slowestResources.push({
                        name: resource.name,
                        duration: duration,
                        type: type
                    });
                }
            });

            // Calculate averages
            Object.keys(resourceSummary.byType).forEach(type => {
                const typeData = resourceSummary.byType[type];
                typeData.avgDuration = resources
                    .filter(r => (r.initiatorType || 'other') === type)
                    .reduce((sum, r) => sum + r.duration, 0) / typeData.count;
            });

            // Sort and limit arrays
            resourceSummary.largestResources.sort((a, b) => b.size - a.size).slice(0, 10);
            resourceSummary.slowestResources.sort((a, b) => b.duration - a.duration).slice(0, 10);

            return resourceSummary;
        });
    }

    async analyzeBundleSize(page) {
        return await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            
            const bundleInfo = {
                scripts: scripts.map(script => ({
                    src: script.src,
                    async: script.async,
                    defer: script.defer,
                    module: script.type === 'module'
                })),
                stylesheets: stylesheets.map(link => ({
                    href: link.href,
                    media: link.media || 'all'
                })),
                inlineScripts: document.querySelectorAll('script:not([src])').length,
                inlineStyles: document.querySelectorAll('style').length
            };

            // Check for common frameworks/libraries
            bundleInfo.frameworks = {
                react: !!window.React,
                next: !!window.__NEXT_DATA__,
                jquery: !!window.$,
                tailwind: document.querySelector('[class*="tw-"]') !== null
            };

            return bundleInfo;
        });
    }

    async getJavaScriptPerformance(page) {
        return await page.evaluate(() => {
            const jsMetrics = {
                memoryUsage: null,
                timing: {},
                errors: []
            };

            // Memory usage (if available)
            if (performance.memory) {
                jsMetrics.memoryUsage = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            }

            // Timing information
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                jsMetrics.timing = {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
                    loadComplete: navigation.loadEventEnd - navigation.navigationStart,
                    domInteractive: navigation.domInteractive - navigation.navigationStart,
                    domComplete: navigation.domComplete - navigation.navigationStart
                };
            }

            // Long tasks (performance bottlenecks)
            const longTasks = performance.getEntriesByType('longtask');
            jsMetrics.longTasks = longTasks.map(task => ({
                duration: task.duration,
                startTime: task.startTime
            }));

            return jsMetrics;
        });
    }

    async getLighthouseMetrics(page) {
        // Simplified lighthouse-style metrics
        return await page.evaluate(() => {
            const metrics = {};
            
            // Count DOM elements
            metrics.domSize = document.querySelectorAll('*').length;
            
            // Check for common performance issues
            metrics.issues = [];
            
            // Check for images without alt text
            const imagesWithoutAlt = document.querySelectorAll('img:not([alt])').length;
            if (imagesWithoutAlt > 0) {
                metrics.issues.push(`${imagesWithoutAlt} images missing alt text`);
            }
            
            // Check for render-blocking resources
            const renderBlockingScripts = document.querySelectorAll('script[src]:not([async]):not([defer])').length;
            if (renderBlockingScripts > 0) {
                metrics.issues.push(`${renderBlockingScripts} render-blocking scripts`);
            }
            
            // Check for unused CSS (basic check)
            const stylesheets = document.querySelectorAll('link[rel="stylesheet"]').length;
            metrics.stylesheets = stylesheets;
            
            return metrics;
        });
    }

    evaluatePerformance(loadTime, coreWebVitals) {
        const score = {
            overall: 'good',
            issues: [],
            recommendations: []
        };

        // Evaluate load time
        if (loadTime > this.performanceThresholds.loadTime) {
            score.overall = 'poor';
            score.issues.push(`Load time (${loadTime}ms) exceeds threshold (${this.performanceThresholds.loadTime}ms)`);
            score.recommendations.push('Optimize bundle size and implement code splitting');
        }

        // Evaluate Core Web Vitals
        if (coreWebVitals.fcp && coreWebVitals.fcp > this.performanceThresholds.firstContentfulPaint) {
            score.overall = score.overall === 'good' ? 'needs-improvement' : 'poor';
            score.issues.push(`First Contentful Paint (${coreWebVitals.fcp}ms) is slow`);
            score.recommendations.push('Optimize critical rendering path and reduce server response time');
        }

        if (coreWebVitals.lcp && coreWebVitals.lcp > this.performanceThresholds.largestContentfulPaint) {
            score.overall = score.overall === 'good' ? 'needs-improvement' : 'poor';
            score.issues.push(`Largest Contentful Paint (${coreWebVitals.lcp}ms) is slow`);
            score.recommendations.push('Optimize largest element loading and implement lazy loading');
        }

        if (coreWebVitals.cls && coreWebVitals.cls > this.performanceThresholds.cumulativeLayoutShift) {
            score.overall = score.overall === 'good' ? 'needs-improvement' : 'poor';
            score.issues.push(`Cumulative Layout Shift (${coreWebVitals.cls}) is high`);
            score.recommendations.push('Set explicit dimensions for images and dynamic content');
        }

        return score;
    }

    async runMobilePerformanceTest(route) {
        console.log(`📱 Testing ${route.name} on mobile...`);
        
        const page = await this.browser.newPage();
        
        // Simulate mobile device
        await page.emulate({
            name: 'iPhone 12',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            viewport: {
                width: 390,
                height: 844,
                deviceScaleFactor: 3,
                isMobile: true,
                hasTouch: true,
                isLandscape: false
            }
        });

        // Simulate slower network
        await page.emulateNetworkConditions({
            offline: false,
            downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
            uploadThroughput: 750 * 1024 / 8, // 750 Kbps
            latency: 40 // 40ms
        });

        const url = `${this.baseUrl}${route.path}`;
        const startTime = Date.now();

        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            const loadTime = Date.now() - startTime;

            // Test touch interactions
            const touchMetrics = await this.testTouchInteractions(page);

            // Take mobile screenshot
            const screenshotPath = `mobile_screenshot_${route.name.toLowerCase()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: false });

            await page.close();

            return {
                route: route.path,
                name: route.name,
                device: 'iPhone 12',
                loadTime: loadTime,
                touchMetrics: touchMetrics,
                screenshot: screenshotPath
            };

        } catch (error) {
            await page.close();
            return {
                route: route.path,
                name: route.name,
                device: 'iPhone 12',
                error: error.message,
                loadTime: Date.now() - startTime
            };
        }
    }

    async testTouchInteractions(page) {
        try {
            // Test common touch interactions
            const touchTargets = await page.$$('button, a, [role="button"]');
            const touchMetrics = {
                totalTouchTargets: touchTargets.length,
                minTouchTargetSize: null,
                touchTargetSizes: []
            };

            for (const target of touchTargets.slice(0, 10)) { // Test first 10 elements
                const box = await target.boundingBox();
                if (box) {
                    const size = Math.min(box.width, box.height);
                    touchMetrics.touchTargetSizes.push(size);
                }
            }

            if (touchMetrics.touchTargetSizes.length > 0) {
                touchMetrics.minTouchTargetSize = Math.min(...touchMetrics.touchTargetSizes);
                touchMetrics.avgTouchTargetSize = touchMetrics.touchTargetSizes.reduce((a, b) => a + b, 0) / touchMetrics.touchTargetSizes.length;
            }

            return touchMetrics;
        } catch (error) {
            return { error: error.message };
        }
    }

    async runComprehensiveTest() {
        console.log('🎯 Starting comprehensive frontend performance analysis...');
        console.log(`Testing: ${this.baseUrl}`);
        console.log('=' * 60);

        await this.initializeBrowser();

        const results = {
            testInfo: {
                startTime: new Date().toISOString(),
                baseUrl: this.baseUrl,
                testRoutes: this.testRoutes,
                thresholds: this.performanceThresholds
            },
            desktopResults: [],
            mobileResults: [],
            summary: {},
            recommendations: []
        };

        try {
            // Desktop performance tests
            console.log('🖥️  Running desktop performance tests...');
            for (const route of this.testRoutes) {
                const result = await this.measurePagePerformance(route);
                results.desktopResults.push(result);
            }

            // Mobile performance tests
            console.log('📱 Running mobile performance tests...');
            for (const route of this.testRoutes) {
                const result = await this.runMobilePerformanceTest(route);
                results.mobileResults.push(result);
            }

            // Generate summary and recommendations
            results.summary = this.generateSummary(results.desktopResults, results.mobileResults);
            results.recommendations = this.generateRecommendations(results.desktopResults, results.mobileResults);

        } finally {
            await this.closeBrowser();
        }

        results.testInfo.endTime = new Date().toISOString();
        results.testInfo.duration = (new Date(results.testInfo.endTime) - new Date(results.testInfo.startTime)) / 1000;

        return results;
    }

    generateSummary(desktopResults, mobileResults) {
        const validDesktopResults = desktopResults.filter(r => !r.error);
        const validMobileResults = mobileResults.filter(r => !r.error);

        if (validDesktopResults.length === 0) {
            return { error: 'No valid desktop test results' };
        }

        const summary = {
            desktop: {
                totalPages: desktopResults.length,
                successfulTests: validDesktopResults.length,
                avgLoadTime: validDesktopResults.reduce((sum, r) => sum + r.loadTime, 0) / validDesktopResults.length,
                fastestPage: validDesktopResults.reduce((min, r) => r.loadTime < min.loadTime ? r : min),
                slowestPage: validDesktopResults.reduce((max, r) => r.loadTime > max.loadTime ? r : max)
            },
            mobile: {
                totalPages: mobileResults.length,
                successfulTests: validMobileResults.length
            }
        };

        if (validMobileResults.length > 0) {
            summary.mobile.avgLoadTime = validMobileResults.reduce((sum, r) => sum + r.loadTime, 0) / validMobileResults.length;
            summary.mobile.fastestPage = validMobileResults.reduce((min, r) => r.loadTime < min.loadTime ? r : min);
            summary.mobile.slowestPage = validMobileResults.reduce((max, r) => r.loadTime > max.loadTime ? r : max);
        }

        return summary;
    }

    generateRecommendations(desktopResults, mobileResults) {
        const recommendations = [];
        const validResults = desktopResults.filter(r => !r.error && r.performance);

        // Analyze common issues
        const slowPages = validResults.filter(r => r.loadTime > this.performanceThresholds.loadTime);
        const largeResourcePages = validResults.filter(r => r.resourceMetrics && r.resourceMetrics.totalSize > 5000000); // > 5MB

        if (slowPages.length > 0) {
            recommendations.push({
                priority: 'high',
                category: 'Performance',
                issue: `${slowPages.length} pages have slow load times (>${this.performanceThresholds.loadTime}ms)`,
                solution: 'Implement code splitting, optimize images, and reduce bundle size'
            });
        }

        if (largeResourcePages.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'Bundle Size',
                issue: `${largeResourcePages.length} pages load >5MB of resources`,
                solution: 'Implement lazy loading, compress assets, and use CDN'
            });
        }

        // Check for framework optimizations
        const hasReact = validResults.some(r => r.bundleAnalysis && r.bundleAnalysis.frameworks && r.bundleAnalysis.frameworks.react);
        if (hasReact) {
            recommendations.push({
                priority: 'medium',
                category: 'React Optimization',
                issue: 'React app detected',
                solution: 'Implement React.memo, useMemo, and React.lazy for better performance'
            });
        }

        // Mobile-specific recommendations
        if (mobileResults.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'Mobile Optimization',
                issue: 'Mobile performance testing completed',
                solution: 'Ensure touch targets are at least 44px, optimize for mobile viewports'
            });
        }

        return recommendations;
    }

    saveResults(results, filename = null) {
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `frontend_performance_report_${timestamp}.json`;
        }

        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        return filename;
    }
}

// Main execution
async function main() {
    const baseUrl = process.argv[2] || 'http://localhost:3000';
    
    console.log('🎯 BookedBarber V2 Frontend Performance Analyzer');
    console.log(`Testing URL: ${baseUrl}`);
    
    const analyzer = new FrontendPerformanceAnalyzer(baseUrl);
    
    try {
        const results = await analyzer.runComprehensiveTest();
        const filename = analyzer.saveResults(results);
        
        console.log('\n📊 Frontend Performance Analysis Complete!');
        console.log(`📄 Results saved to: ${filename}`);
        
        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('FRONTEND PERFORMANCE SUMMARY');
        console.log('='.repeat(60));
        
        if (results.summary.desktop) {
            const desktop = results.summary.desktop;
            console.log(`🖥️  Desktop Results:`);
            console.log(`   Successful Tests: ${desktop.successfulTests}/${desktop.totalPages}`);
            console.log(`   Average Load Time: ${desktop.avgLoadTime?.toFixed(2)}ms`);
            if (desktop.fastestPage) {
                console.log(`   Fastest Page: ${desktop.fastestPage.name} (${desktop.fastestPage.loadTime}ms)`);
            }
            if (desktop.slowestPage) {
                console.log(`   Slowest Page: ${desktop.slowestPage.name} (${desktop.slowestPage.loadTime}ms)`);
            }
        }
        
        if (results.summary.mobile && results.summary.mobile.avgLoadTime) {
            const mobile = results.summary.mobile;
            console.log(`\n📱 Mobile Results:`);
            console.log(`   Successful Tests: ${mobile.successfulTests}/${mobile.totalPages}`);
            console.log(`   Average Load Time: ${mobile.avgLoadTime?.toFixed(2)}ms`);
        }
        
        console.log('\n📋 Key Recommendations:');
        results.recommendations.slice(0, 5).forEach((rec, i) => {
            console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
            console.log(`   Solution: ${rec.solution}`);
        });
        
        console.log(`\n📄 Full report: ${filename}`);
        
    } catch (error) {
        console.error('❌ Error running frontend performance analysis:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = FrontendPerformanceAnalyzer;