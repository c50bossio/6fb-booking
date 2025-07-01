const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

class SimpleCrawler {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.visitedUrls = new Set();
        this.discoveredUrls = new Set();
        this.pages = [];
        this.errors = [];
        this.resultsDir = path.join(__dirname);
    }

    async crawlPage(url, depth = 0, maxDepth = 2) {
        if (this.visitedUrls.has(url) || depth > maxDepth) {
            return;
        }

        console.log(`Crawling: ${url} (depth: ${depth})`);
        this.visitedUrls.add(url);

        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const dom = new JSDOM(response.data);
            const document = dom.window.document;

            // Extract page information
            const pageInfo = this.extractPageInfo(document, url, response);
            this.pages.push(pageInfo);

            // Find all links
            const links = this.extractLinks(document);
            
            // Add new internal links to discovery queue
            for (const link of links) {
                if (this.isInternalUrl(link) && !this.visitedUrls.has(link)) {
                    this.discoveredUrls.add(link);
                }
            }

            // Recursively crawl discovered links
            if (depth < maxDepth) {
                for (const link of Array.from(this.discoveredUrls)) {
                    if (!this.visitedUrls.has(link)) {
                        await this.crawlPage(link, depth + 1, maxDepth);
                        // Add delay to avoid overwhelming the server
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }

        } catch (error) {
            console.error(`Error crawling ${url}:`, error.message);
            this.errors.push({
                type: 'Crawling Error',
                url: url,
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText
            });
        }
    }

    extractPageInfo(document, url, response) {
        const headings = {
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
            h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
            h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim())
        };

        const images = Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            title: img.title
        }));

        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
            text: a.textContent.trim(),
            href: a.href,
            title: a.title
        }));

        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(btn => ({
            text: btn.textContent?.trim() || btn.value || '',
            type: btn.type,
            id: btn.id,
            className: btn.className
        }));

        const forms = Array.from(document.querySelectorAll('form')).map(form => {
            const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                type: input.type || input.tagName.toLowerCase(),
                name: input.name,
                id: input.id,
                placeholder: input.placeholder,
                required: input.required
            }));

            return {
                action: form.action,
                method: form.method,
                id: form.id,
                className: form.className,
                inputs: inputs
            };
        });

        const navigation = this.extractNavigation(document);
        const metaTags = this.extractMetaTags(document);
        const scripts = this.extractScripts(document);
        const styles = this.extractStyles(document);

        return {
            url: url,
            title: document.title,
            timestamp: new Date().toISOString(),
            status: response.status,
            contentType: response.headers['content-type'],
            responseTime: response.config.metadata?.endTime - response.config.metadata?.startTime || 0,
            wordCount: (document.body?.textContent?.trim() || '').split(/\s+/).length,
            headings,
            images,
            links,
            buttons,
            forms,
            navigation,
            metaTags,
            scripts,
            styles,
            components: this.analyzeComponents(document),
            accessibility: this.analyzeAccessibility(document)
        };
    }

    extractLinks(document) {
        return Array.from(document.querySelectorAll('a[href]'))
            .map(a => {
                try {
                    return new URL(a.href, this.baseUrl).href;
                } catch {
                    return null;
                }
            })
            .filter(href => href && !href.startsWith('mailto:') && !href.startsWith('tel:'));
    }

    extractNavigation(document) {
        const navElements = Array.from(document.querySelectorAll('nav, .nav, .navigation, .navbar, .menu'));
        return navElements.map(nav => ({
            tag: nav.tagName.toLowerCase(),
            className: nav.className,
            id: nav.id,
            links: Array.from(nav.querySelectorAll('a')).map(a => ({
                text: a.textContent.trim(),
                href: a.href
            }))
        }));
    }

    extractMetaTags(document) {
        const metaTags = {};
        Array.from(document.querySelectorAll('meta')).forEach(meta => {
            const name = meta.getAttribute('name') || meta.getAttribute('property');
            const content = meta.getAttribute('content');
            if (name && content) {
                metaTags[name] = content;
            }
        });
        return metaTags;
    }

    extractScripts(document) {
        return Array.from(document.querySelectorAll('script[src]')).map(script => ({
            src: script.src,
            type: script.type,
            async: script.async,
            defer: script.defer
        }));
    }

    extractStyles(document) {
        return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(link => ({
            href: link.href,
            media: link.media
        }));
    }

    analyzeComponents(document) {
        const components = {};
        
        // Look for common React/Next.js patterns
        const reactComponents = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
        components.react = reactComponents.length > 0;

        // Look for common UI frameworks
        components.tailwind = document.querySelector('[class*="tw-"], [class*="bg-"], [class*="text-"], [class*="p-"], [class*="m-"]') !== null;
        components.bootstrap = document.querySelector('[class*="btn"], [class*="container"], [class*="row"], [class*="col-"]') !== null;
        
        // Count interactive elements
        components.modals = document.querySelectorAll('[role="dialog"], .modal').length;
        components.dropdowns = document.querySelectorAll('[role="menu"], .dropdown').length;
        components.tabs = document.querySelectorAll('[role="tab"], .tab').length;
        
        return components;
    }

    analyzeAccessibility(document) {
        return {
            altTextMissing: Array.from(document.querySelectorAll('img:not([alt])')).length,
            ariaLabels: Array.from(document.querySelectorAll('[aria-label]')).length,
            headingStructure: this.validateHeadingStructure(document),
            formLabels: this.checkFormLabels(document),
            landmarks: Array.from(document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"]')).length
        };
    }

    validateHeadingStructure(document) {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return {
            total: headings.length,
            h1Count: document.querySelectorAll('h1').length,
            hasProperHierarchy: this.checkHeadingHierarchy(headings)
        };
    }

    checkHeadingHierarchy(headings) {
        let lastLevel = 0;
        for (const heading of headings) {
            const level = parseInt(heading.tagName[1]);
            if (level > lastLevel + 1 && lastLevel !== 0) {
                return false;
            }
            lastLevel = level;
        }
        return true;
    }

    checkFormLabels(document) {
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
        const labeled = inputs.filter(input => {
            return input.id && document.querySelector(`label[for="${input.id}"]`) ||
                   input.getAttribute('aria-label') ||
                   input.closest('label');
        });
        return {
            total: inputs.length,
            labeled: labeled.length,
            unlabeled: inputs.length - labeled.length
        };
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
            summary: {
                pageTypes: this.categorizePages(),
                commonComponents: this.identifyCommonComponents(),
                navigationStructure: this.analyzeNavigation(),
                formAnalysis: this.summarizeForms(),
                performanceMetrics: this.summarizePerformance(),
                accessibilityIssues: this.summarizeAccessibility(),
                technologyStack: this.analyzeTechnologyStack()
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
        const componentUsage = {};
        this.pages.forEach(page => {
            Object.entries(page.components).forEach(([component, value]) => {
                if (typeof value === 'boolean' && value) {
                    componentUsage[component] = (componentUsage[component] || 0) + 1;
                } else if (typeof value === 'number' && value > 0) {
                    componentUsage[component] = (componentUsage[component] || 0) + value;
                }
            });
        });
        return componentUsage;
    }

    analyzeNavigation() {
        const allNavigation = [];
        this.pages.forEach(page => {
            page.navigation.forEach(nav => {
                allNavigation.push(nav);
            });
        });
        return allNavigation;
    }

    summarizeForms() {
        const formSummary = {
            totalForms: 0,
            formTypes: {},
            commonInputs: {}
        };

        this.pages.forEach(page => {
            formSummary.totalForms += page.forms.length;
            page.forms.forEach(form => {
                const formType = this.inferFormType(form);
                formSummary.formTypes[formType] = (formSummary.formTypes[formType] || 0) + 1;
                
                form.inputs.forEach(input => {
                    formSummary.commonInputs[input.type] = (formSummary.commonInputs[input.type] || 0) + 1;
                });
            });
        });

        return formSummary;
    }

    inferFormType(form) {
        const inputs = form.inputs.map(i => i.type.toLowerCase());
        const hasPassword = inputs.includes('password');
        const hasEmail = inputs.includes('email');

        if (hasPassword && hasEmail) return 'login';
        if (hasPassword && inputs.length > 3) return 'registration';
        if (inputs.includes('search')) return 'search';
        if (inputs.includes('tel') || inputs.includes('date')) return 'booking';
        return 'generic';
    }

    summarizePerformance() {
        if (this.pages.length === 0) return {};

        const responseTimes = this.pages
            .map(p => p.responseTime)
            .filter(t => t && t > 0);

        if (responseTimes.length === 0) return {};

        return {
            averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
            minResponseTime: Math.min(...responseTimes),
            maxResponseTime: Math.max(...responseTimes),
            pagesAnalyzed: responseTimes.length
        };
    }

    summarizeAccessibility() {
        const accessibility = {
            totalAltTextMissing: 0,
            totalAriaLabels: 0,
            totalUnlabeledFormInputs: 0,
            pagesWithH1Issues: 0
        };

        this.pages.forEach(page => {
            accessibility.totalAltTextMissing += page.accessibility.altTextMissing;
            accessibility.totalAriaLabels += page.accessibility.ariaLabels;
            accessibility.totalUnlabeledFormInputs += page.accessibility.formLabels.unlabeled;
            if (page.accessibility.headingStructure.h1Count !== 1) {
                accessibility.pagesWithH1Issues++;
            }
        });

        return accessibility;
    }

    analyzeTechnologyStack() {
        const technologies = new Set();
        
        this.pages.forEach(page => {
            // Check for Next.js
            if (page.scripts.some(script => script.src.includes('_next/'))) {
                technologies.add('Next.js');
            }
            
            // Check for React
            if (page.components.react) {
                technologies.add('React');
            }
            
            // Check for Tailwind CSS
            if (page.components.tailwind) {
                technologies.add('Tailwind CSS');
            }
            
            // Check for Bootstrap
            if (page.components.bootstrap) {
                technologies.add('Bootstrap');
            }
            
            // Check for common libraries in scripts
            page.scripts.forEach(script => {
                if (script.src.includes('stripe')) technologies.add('Stripe');
                if (script.src.includes('google')) technologies.add('Google APIs');
                if (script.src.includes('jquery')) technologies.add('jQuery');
            });
        });

        return Array.from(technologies);
    }

    generateHumanReadableReport(report) {
        return `# 6FB Booking Site Analysis Report

## Overview
- **Base URL**: ${report.metadata.baseUrl}
- **Crawled At**: ${report.metadata.crawledAt}
- **Total Pages Discovered**: ${report.metadata.totalPages}
- **Total Errors**: ${report.metadata.totalErrors}

## Technology Stack
${report.summary.technologyStack.map(tech => `- ${tech}`).join('\n')}

## Site Structure

### Page Categories
${Object.entries(report.summary.pageTypes).map(([category, urls]) => 
    `- **${category}**: ${urls.length} pages`
).join('\n')}

### Navigation Analysis
- **Total Navigation Elements**: ${report.summary.navigationStructure.length}

## Pages Analyzed

${report.pages.map(page => `
### ${page.title || 'Untitled Page'}
- **URL**: ${page.url}
- **Status**: ${page.status}
- **Word Count**: ${page.wordCount}
- **Images**: ${page.images.length}
- **Links**: ${page.links.length}
- **Forms**: ${page.forms.length}
- **Response Time**: ${page.responseTime ? Math.round(page.responseTime) + 'ms' : 'N/A'}

**Headings**:
${page.headings.h1.map(h => `- H1: ${h}`).join('\n')}
${page.headings.h2.slice(0, 3).map(h => `- H2: ${h}`).join('\n')}

**Buttons**:
${page.buttons.slice(0, 5).map(btn => `- ${btn.text} (${btn.type})`).join('\n')}

**Accessibility Issues**:
- Missing alt text: ${page.accessibility.altTextMissing}
- Unlabeled form inputs: ${page.accessibility.formLabels.unlabeled}
- H1 count: ${page.accessibility.headingStructure.h1Count}
`).join('\n')}

## Forms Analysis

### Form Summary
- **Total Forms**: ${report.summary.formAnalysis.totalForms}
- **Form Types**: ${Object.entries(report.summary.formAnalysis.formTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}

### Common Input Types
${Object.entries(report.summary.formAnalysis.commonInputs).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

## Performance Metrics
${report.summary.performanceMetrics.averageResponseTime ? `
- **Average Response Time**: ${Math.round(report.summary.performanceMetrics.averageResponseTime)}ms
- **Fastest Page**: ${Math.round(report.summary.performanceMetrics.minResponseTime)}ms
- **Slowest Page**: ${Math.round(report.summary.performanceMetrics.maxResponseTime)}ms
` : 'Performance data not available'}

## Accessibility Summary
- **Missing Alt Text**: ${report.summary.accessibilityIssues.totalAltTextMissing} images
- **Unlabeled Form Inputs**: ${report.summary.accessibilityIssues.totalUnlabeledFormInputs}
- **Pages with H1 Issues**: ${report.summary.accessibilityIssues.pagesWithH1Issues}

## Component Usage
${Object.entries(report.summary.commonComponents).map(([component, count]) => `- ${component}: ${count}`).join('\n')}

## Errors Encountered
${report.errors.length > 0 ? report.errors.map(error => `
### ${error.type}
- **URL**: ${error.url || 'Unknown'}
- **Status**: ${error.status || 'N/A'}
- **Message**: ${error.message}
`).join('\n') : 'No errors encountered during crawling.'}

## Recommendations

### Technical Issues
${report.errors.length > 0 ? `
- Fix ${report.errors.length} errors identified during crawling
- Review failed requests and connectivity issues
` : '- No critical technical issues identified'}

### Performance Optimization
${report.summary.performanceMetrics.averageResponseTime > 1000 ? `
- Consider optimizing response times (current average: ${Math.round(report.summary.performanceMetrics.averageResponseTime)}ms)
- Implement caching strategies
- Optimize database queries
` : '- Response times appear acceptable'}

### Accessibility Improvements
${report.summary.accessibilityIssues.totalAltTextMissing > 0 ? `
- Add alt text to ${report.summary.accessibilityIssues.totalAltTextMissing} images
` : ''}${report.summary.accessibilityIssues.totalUnlabeledFormInputs > 0 ? `
- Add labels to ${report.summary.accessibilityIssues.totalUnlabeledFormInputs} form inputs
` : ''}${report.summary.accessibilityIssues.pagesWithH1Issues > 0 ? `
- Fix heading structure on ${report.summary.accessibilityIssues.pagesWithH1Issues} pages
` : ''}

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

    async run() {
        try {
            console.log(`Starting crawl of ${this.baseUrl}...`);
            await this.crawlPage(this.baseUrl);
            
            console.log('Generating reports...');
            const report = await this.generateReport();
            
            console.log('\n=== CRAWL COMPLETE ===');
            console.log(`✅ Successfully crawled ${this.pages.length} pages`);
            console.log(`📊 Reports saved to: ${this.resultsDir}`);
            
            if (this.errors.length > 0) {
                console.log(`⚠️  ${this.errors.length} errors encountered during crawling`);
            }

            return report;
        } catch (error) {
            console.error('Fatal error during crawling:', error);
            throw error;
        }
    }
}

// Export for module use or run directly
if (require.main === module) {
    const crawler = new SimpleCrawler();
    crawler.run().catch(console.error);
}

module.exports = SimpleCrawler;