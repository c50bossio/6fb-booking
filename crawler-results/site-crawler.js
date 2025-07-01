const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class SiteCrawler {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.visitedUrls = new Set();
        this.discoveredUrls = new Set();
        this.pages = [];
        this.errors = [];
        this.screenshots = {};
        this.resultsDir = path.join(__dirname);
        this.screenshotsDir = path.join(this.resultsDir, 'screenshots');
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('Initializing browser...');
        try {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ],
                timeout: 60000,
                protocolTimeout: 60000
            });
        } catch (error) {
            console.log('First launch attempt failed, trying with different settings...');
            this.browser = await puppeteer.launch({
                headless: false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ],
                timeout: 60000
            });
        }

        // Create screenshots directory
        try {
            await fs.mkdir(this.screenshotsDir, { recursive: true });
        } catch (error) {
            console.log('Screenshots directory already exists or could not be created');
        }

        console.log('Browser initialized successfully');
    }

    async createPage() {
        const page = await this.browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });

        // Listen for console logs and errors
        page.on('console', (msg) => {
            console.log(`[${msg.type()}] ${msg.text()}`);
        });

        page.on('pageerror', (error) => {
            this.errors.push({
                type: 'JavaScript Error',
                message: error.message,
                stack: error.stack,
                url: page.url()
            });
        });

        page.on('requestfailed', (request) => {
            this.errors.push({
                type: 'Request Failed',
                url: request.url(),
                failure: request.failure()?.errorText,
                page: page.url()
            });
        });

        return page;
    }

    async crawlPage(url, depth = 0, maxDepth = 3) {
        if (this.visitedUrls.has(url) || depth > maxDepth) {
            return;
        }

        console.log(`Crawling: ${url} (depth: ${depth})`);
        this.visitedUrls.add(url);

        let page = null;
        let retries = 3;

        while (retries > 0) {
            try {
                page = await this.createPage();
                
                // Navigate to page with extended timeout
                await page.goto(url, { 
                    waitUntil: ['domcontentloaded'],
                    timeout: 15000 
                });

                // Wait a bit for any dynamic content
                await page.waitForTimeout(1000);
                break;

            } catch (error) {
                console.log(`Retry ${4 - retries} failed for ${url}: ${error.message}`);
                if (page) {
                    await page.close().catch(() => {});
                    page = null;
                }
                retries--;
                if (retries === 0) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        try {

            // Extract page information
            const pageInfo = await this.extractPageInfo(page, url);
            this.pages.push(pageInfo);

            // Take screenshot
            const screenshotPath = await this.takeScreenshot(page, url);
            pageInfo.screenshot = screenshotPath;

            // Find forms and test them safely
            const forms = await this.analyzeForms(page);
            pageInfo.forms = forms;

            // Find all links
            const links = await this.extractLinks(page);
            
            // Add new internal links to discovery queue
            for (const link of links) {
                if (this.isInternalUrl(link) && !this.visitedUrls.has(link)) {
                    this.discoveredUrls.add(link);
                }
            }

            await page.close();

            // Recursively crawl discovered links
            if (depth < maxDepth) {
                for (const link of Array.from(this.discoveredUrls)) {
                    if (!this.visitedUrls.has(link)) {
                        await this.crawlPage(link, depth + 1, maxDepth);
                    }
                }
            }

        } catch (error) {
            console.error(`Error crawling ${url}:`, error.message);
            this.errors.push({
                type: 'Crawling Error',
                url: url,
                message: error.message,
                stack: error.stack
            });
        }
    }

    async extractPageInfo(page, url) {
        const info = await page.evaluate(() => {
            return {
                title: document.title,
                description: document.querySelector('meta[name="description"]')?.content || '',
                keywords: document.querySelector('meta[name="keywords"]')?.content || '',
                headings: {
                    h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
                    h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
                    h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim())
                },
                textContent: document.body?.textContent?.trim() || '',
                wordCount: (document.body?.textContent?.trim() || '').split(/\s+/).length,
                images: Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.src,
                    alt: img.alt,
                    title: img.title
                })),
                links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
                    text: a.textContent.trim(),
                    href: a.href,
                    title: a.title
                })),
                buttons: Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(btn => ({
                    text: btn.textContent?.trim() || btn.value || '',
                    type: btn.type,
                    id: btn.id,
                    className: btn.className
                })),
                navigation: this.extractNavigation(),
                componentStructure: this.analyzeComponents()
            };
        });

        // Add additional metadata
        info.url = url;
        info.timestamp = new Date().toISOString();
        info.performance = await this.measurePerformance(page);

        return info;
    }

    async extractLinks(page) {
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .map(a => a.href)
                .filter(href => href && !href.startsWith('mailto:') && !href.startsWith('tel:'));
        });
    }

    async analyzeForms(page) {
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('form')).map(form => {
                const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                    type: input.type || input.tagName.toLowerCase(),
                    name: input.name,
                    id: input.id,
                    placeholder: input.placeholder,
                    required: input.required,
                    value: input.type === 'password' ? '[HIDDEN]' : input.value
                }));

                return {
                    action: form.action,
                    method: form.method,
                    id: form.id,
                    className: form.className,
                    inputs: inputs,
                    submitButtons: Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]')).map(btn => ({
                        text: btn.textContent?.trim() || btn.value || '',
                        id: btn.id,
                        className: btn.className
                    }))
                };
            });
        });
    }

    async takeScreenshot(page, url) {
        try {
            const urlPath = new URL(url).pathname;
            const filename = this.sanitizeFilename(urlPath || 'index') + '.png';
            const screenshotPath = path.join(this.screenshotsDir, filename);
            
            await page.screenshot({ 
                path: screenshotPath, 
                fullPage: true,
                quality: 80
            });
            
            console.log(`Screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            console.error(`Error taking screenshot for ${url}:`, error.message);
            return null;
        }
    }

    async measurePerformance(page) {
        try {
            const metrics = await page.metrics();
            const performance = await page.evaluate(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                return {
                    loadTime: perfData ? perfData.loadEventEnd - perfData.navigationStart : null,
                    domContentLoaded: perfData ? perfData.domContentLoadedEventEnd - perfData.navigationStart : null,
                    firstPaint: perfData ? perfData.responseEnd - perfData.navigationStart : null
                };
            });

            return {
                ...performance,
                jsHeapUsedSize: metrics.JSHeapUsedSize,
                jsHeapTotalSize: metrics.JSHeapTotalSize,
                scriptDuration: metrics.ScriptDuration,
                taskDuration: metrics.TaskDuration
            };
        } catch (error) {
            console.error('Error measuring performance:', error.message);
            return {};
        }
    }

    isInternalUrl(url) {
        try {
            const urlObj = new URL(url);
            const baseUrlObj = new URL(this.baseUrl);
            return urlObj.hostname === baseUrlObj.hostname;
        } catch {
            return false;
        }
    }

    sanitizeFilename(name) {
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    async testAuthentication() {
        console.log('Testing authentication flows...');
        const page = await this.createPage();
        
        try {
            // Test login page
            await page.goto(`${this.baseUrl}/login`, { waitUntil: 'networkidle0' });
            
            const loginInfo = await page.evaluate(() => {
                const form = document.querySelector('form');
                const emailInput = document.querySelector('input[type="email"], input[name="email"]');
                const passwordInput = document.querySelector('input[type="password"]');
                const submitButton = document.querySelector('button[type="submit"], input[type="submit"]');
                
                return {
                    hasLoginForm: !!form,
                    hasEmailInput: !!emailInput,
                    hasPasswordInput: !!passwordInput,
                    hasSubmitButton: !!submitButton,
                    formAction: form?.action,
                    formMethod: form?.method
                };
            });

            await page.close();
            return loginInfo;
        } catch (error) {
            console.error('Error testing authentication:', error.message);
            await page.close();
            return { error: error.message };
        }
    }

    async generateReport() {
        console.log('Generating comprehensive report...');
        
        const report = {
            metadata: {
                baseUrl: this.baseUrl,
                crawledAt: new Date().toISOString(),
                totalPages: this.pages.length,
                totalErrors: this.errors.length,
                totalUrls: this.visitedUrls.size
            },
            sitemap: {
                discoveredUrls: Array.from(this.discoveredUrls),
                visitedUrls: Array.from(this.visitedUrls)
            },
            pages: this.pages,
            errors: this.errors,
            authentication: await this.testAuthentication(),
            summary: {
                pageTypes: this.categorizePages(),
                commonComponents: this.identifyCommonComponents(),
                navigationStructure: this.analyzeNavigation(),
                formAnalysis: this.summarizeForms(),
                performanceMetrics: this.summarizePerformance()
            }
        };

        // Save main report
        const reportPath = path.join(this.resultsDir, 'site-analysis-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        // Generate human-readable report
        const humanReadableReport = this.generateHumanReadableReport(report);
        const readableReportPath = path.join(this.resultsDir, 'site-analysis-report.md');
        await fs.writeFile(readableReportPath, humanReadableReport);

        // Generate sitemap
        const sitemap = this.generateSitemap();
        const sitemapPath = path.join(this.resultsDir, 'sitemap.md');
        await fs.writeFile(sitemapPath, sitemap);

        console.log(`Reports generated:`);
        console.log(`- JSON Report: ${reportPath}`);
        console.log(`- Readable Report: ${readableReportPath}`);
        console.log(`- Sitemap: ${sitemapPath}`);

        return report;
    }

    categorizePages() {
        const categories = {};
        this.pages.forEach(page => {
            const url = new URL(page.url);
            const pathSegments = url.pathname.split('/').filter(segment => segment);
            const category = pathSegments[0] || 'root';
            
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(page.url);
        });
        return categories;
    }

    identifyCommonComponents() {
        const components = {};
        this.pages.forEach(page => {
            if (page.componentStructure) {
                Object.keys(page.componentStructure).forEach(component => {
                    components[component] = (components[component] || 0) + 1;
                });
            }
        });
        return components;
    }

    analyzeNavigation() {
        const navigationItems = new Set();
        this.pages.forEach(page => {
            if (page.navigation) {
                page.navigation.forEach(item => navigationItems.add(item));
            }
        });
        return Array.from(navigationItems);
    }

    summarizeForms() {
        const formSummary = {
            totalForms: 0,
            formTypes: {},
            commonInputs: {}
        };

        this.pages.forEach(page => {
            if (page.forms) {
                formSummary.totalForms += page.forms.length;
                page.forms.forEach(form => {
                    const formType = this.inferFormType(form);
                    formSummary.formTypes[formType] = (formSummary.formTypes[formType] || 0) + 1;
                    
                    form.inputs.forEach(input => {
                        formSummary.commonInputs[input.type] = (formSummary.commonInputs[input.type] || 0) + 1;
                    });
                });
            }
        });

        return formSummary;
    }

    inferFormType(form) {
        const inputs = form.inputs.map(i => i.type.toLowerCase());
        const hasPassword = inputs.includes('password');
        const hasEmail = inputs.includes('email');
        const hasSubmit = form.submitButtons.length > 0;

        if (hasPassword && hasEmail) return 'login';
        if (hasPassword && inputs.length > 3) return 'registration';
        if (inputs.includes('search')) return 'search';
        if (inputs.includes('tel') || inputs.includes('date')) return 'booking';
        return 'generic';
    }

    summarizePerformance() {
        if (this.pages.length === 0) return {};

        const loadTimes = this.pages
            .map(p => p.performance?.loadTime)
            .filter(t => t && t > 0);

        if (loadTimes.length === 0) return {};

        return {
            averageLoadTime: loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length,
            minLoadTime: Math.min(...loadTimes),
            maxLoadTime: Math.max(...loadTimes),
            pagesAnalyzed: loadTimes.length
        };
    }

    generateHumanReadableReport(report) {
        return `# 6FB Booking Site Analysis Report

## Overview
- **Base URL**: ${report.metadata.baseUrl}
- **Crawled At**: ${report.metadata.crawledAt}
- **Total Pages Discovered**: ${report.metadata.totalPages}
- **Total Errors**: ${report.metadata.totalErrors}

## Site Structure

### Page Categories
${Object.entries(report.summary.pageTypes).map(([category, urls]) => 
    `- **${category}**: ${urls.length} pages`
).join('\n')}

### Navigation Structure
${report.summary.navigationStructure.map(item => `- ${item}`).join('\n')}

## Pages Analyzed

${report.pages.map(page => `
### ${page.title || 'Untitled Page'}
- **URL**: ${page.url}
- **Word Count**: ${page.wordCount}
- **Images**: ${page.images.length}
- **Links**: ${page.links.length}
- **Forms**: ${page.forms.length}
- **Load Time**: ${page.performance?.loadTime ? Math.round(page.performance.loadTime) + 'ms' : 'N/A'}

**Headings**:
${page.headings.h1.map(h => `- H1: ${h}`).join('\n')}
${page.headings.h2.map(h => `- H2: ${h}`).join('\n')}

**Buttons**:
${page.buttons.map(btn => `- ${btn.text} (${btn.type})`).join('\n')}
`).join('\n')}

## Forms Analysis

### Form Summary
- **Total Forms**: ${report.summary.formAnalysis.totalForms}
- **Form Types**: ${Object.entries(report.summary.formAnalysis.formTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}

### Common Input Types
${Object.entries(report.summary.formAnalysis.commonInputs).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

## Performance Metrics
${report.summary.performanceMetrics.averageLoadTime ? `
- **Average Load Time**: ${Math.round(report.summary.performanceMetrics.averageLoadTime)}ms
- **Fastest Page**: ${Math.round(report.summary.performanceMetrics.minLoadTime)}ms
- **Slowest Page**: ${Math.round(report.summary.performanceMetrics.maxLoadTime)}ms
` : 'Performance data not available'}

## Authentication Testing
${JSON.stringify(report.authentication, null, 2)}

## Errors Encountered
${report.errors.length > 0 ? report.errors.map(error => `
### ${error.type}
- **URL**: ${error.url || 'Unknown'}
- **Message**: ${error.message}
`).join('\n') : 'No errors encountered during crawling.'}

## Recommendations

### Technical Issues
${report.errors.length > 0 ? `
- Fix ${report.errors.length} errors identified during crawling
- Review failed requests and JavaScript errors
` : '- No critical technical issues identified'}

### Performance Optimization
${report.summary.performanceMetrics.averageLoadTime > 3000 ? `
- Consider optimizing page load times (current average: ${Math.round(report.summary.performanceMetrics.averageLoadTime)}ms)
- Implement image optimization and lazy loading
- Minify CSS and JavaScript files
` : '- Page performance appears acceptable'}

### SEO & Content
- Ensure all pages have descriptive titles and meta descriptions
- Review heading structure for proper hierarchy
- Add alt text to images where missing

---
Generated by 6FB Site Crawler on ${new Date().toISOString()}
`;
    }

    generateSitemap() {
        return `# 6FB Booking Site Map

## Discovered URLs
${Array.from(this.visitedUrls).sort().map(url => `- [${url}](${url})`).join('\n')}

## URL Structure Analysis
${Object.entries(this.categorizePages()).map(([category, urls]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)} Section
${urls.map(url => `- [${url}](${url})`).join('\n')}
`).join('\n')}

---
Generated on ${new Date().toISOString()}
`;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('Browser closed successfully');
        }
    }

    async run() {
        try {
            await this.init();
            
            console.log(`Starting crawl of ${this.baseUrl}...`);
            await this.crawlPage(this.baseUrl);
            
            console.log('Generating reports...');
            const report = await this.generateReport();
            
            console.log('\n=== CRAWL COMPLETE ===');
            console.log(`✅ Successfully crawled ${this.pages.length} pages`);
            console.log(`📸 Screenshots saved to: ${this.screenshotsDir}`);
            console.log(`📊 Reports saved to: ${this.resultsDir}`);
            
            if (this.errors.length > 0) {
                console.log(`⚠️  ${this.errors.length} errors encountered during crawling`);
            }

            return report;
        } catch (error) {
            console.error('Fatal error during crawling:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Export for module use or run directly
if (require.main === module) {
    const crawler = new SiteCrawler();
    crawler.run().catch(console.error);
}

module.exports = SiteCrawler;