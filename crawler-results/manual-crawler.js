const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ManualCrawler {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.pages = [];
        this.errors = [];
        this.resultsDir = path.join(__dirname);
        
        // Define common routes to test
        this.routesToTest = [
            '/',
            '/login',
            '/signup',
            '/register',
            '/dashboard',
            '/booking',
            '/appointments',
            '/calendar',
            '/profile',
            '/settings',
            '/admin',
            '/api/health',
            '/api/auth/me',
            '/api/appointments',
            '/api/bookings',
            '/contact',
            '/about',
            '/services',
            '/barbers',
            '/pricing'
        ];
    }

    async testRoute(route) {
        const url = `${this.baseUrl}${route}`;
        console.log(`Testing route: ${route}`);
        
        try {
            const startTime = Date.now();
            const response = await axios.get(url, {
                timeout: 10000,
                validateStatus: () => true, // Accept all status codes
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });
            const endTime = Date.now();

            const pageInfo = this.analyzeResponse(route, url, response, endTime - startTime);
            this.pages.push(pageInfo);
            
            return pageInfo;
        } catch (error) {
            console.error(`Error testing ${route}:`, error.message);
            this.errors.push({
                route: route,
                url: url,
                error: error.message,
                code: error.code,
                status: error.response?.status
            });
            return null;
        }
    }

    analyzeResponse(route, url, response, responseTime) {
        const html = response.data;
        
        // Basic HTML analysis without DOM parsing
        const pageInfo = {
            route: route,
            url: url,
            status: response.status,
            statusText: response.statusText,
            responseTime: responseTime,
            contentType: response.headers['content-type'],
            contentLength: response.headers['content-length'],
            timestamp: new Date().toISOString(),
            
            // Extract basic information using regex
            title: this.extractTitle(html),
            metaTags: this.extractMetaTags(html),
            headings: this.extractHeadings(html),
            links: this.extractLinks(html),
            forms: this.extractForms(html),
            scripts: this.extractScripts(html),
            images: this.extractImages(html),
            components: this.detectComponents(html),
            errors: this.findJavaScriptErrors(html)
        };

        return pageInfo;
    }

    extractTitle(html) {
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        return titleMatch ? titleMatch[1].trim() : '';
    }

    extractMetaTags(html) {
        const metaTags = {};
        const metaMatches = html.match(/<meta[^>]*>/gi) || [];
        
        metaMatches.forEach(meta => {
            const nameMatch = meta.match(/name=["']([^"']*)["']/i);
            const propertyMatch = meta.match(/property=["']([^"']*)["']/i);
            const contentMatch = meta.match(/content=["']([^"']*)["']/i);
            
            const key = nameMatch?.[1] || propertyMatch?.[1];
            const content = contentMatch?.[1];
            
            if (key && content) {
                metaTags[key] = content;
            }
        });
        
        return metaTags;
    }

    extractHeadings(html) {
        const headings = { h1: [], h2: [], h3: [] };
        
        // Extract H1 tags
        const h1Matches = html.match(/<h1[^>]*>([^<]*)<\/h1>/gi) || [];
        headings.h1 = h1Matches.map(h1 => h1.replace(/<[^>]*>/g, '').trim());
        
        // Extract H2 tags
        const h2Matches = html.match(/<h2[^>]*>([^<]*)<\/h2>/gi) || [];
        headings.h2 = h2Matches.map(h2 => h2.replace(/<[^>]*>/g, '').trim());
        
        // Extract H3 tags
        const h3Matches = html.match(/<h3[^>]*>([^<]*)<\/h3>/gi) || [];
        headings.h3 = h3Matches.map(h3 => h3.replace(/<[^>]*>/g, '').trim());
        
        return headings;
    }

    extractLinks(html) {
        const linkMatches = html.match(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi) || [];
        return linkMatches.map(link => {
            const hrefMatch = link.match(/href=["']([^"']*)["']/i);
            const textMatch = link.match(/>([^<]*)<\/a>/i);
            return {
                href: hrefMatch?.[1] || '',
                text: textMatch?.[1]?.trim() || ''
            };
        }).filter(link => link.href);
    }

    extractForms(html) {
        const formMatches = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
        return formMatches.map(form => {
            const actionMatch = form.match(/action=["']([^"']*)["']/i);
            const methodMatch = form.match(/method=["']([^"']*)["']/i);
            const inputMatches = form.match(/<input[^>]*>/gi) || [];
            
            const inputs = inputMatches.map(input => {
                const typeMatch = input.match(/type=["']([^"']*)["']/i);
                const nameMatch = input.match(/name=["']([^"']*)["']/i);
                const placeholderMatch = input.match(/placeholder=["']([^"']*)["']/i);
                
                return {
                    type: typeMatch?.[1] || 'text',
                    name: nameMatch?.[1] || '',
                    placeholder: placeholderMatch?.[1] || ''
                };
            });
            
            return {
                action: actionMatch?.[1] || '',
                method: methodMatch?.[1] || 'GET',
                inputs: inputs
            };
        });
    }

    extractScripts(html) {
        const scriptMatches = html.match(/<script[^>]*src=["']([^"']*)["'][^>]*>/gi) || [];
        return scriptMatches.map(script => {
            const srcMatch = script.match(/src=["']([^"']*)["']/i);
            return {
                src: srcMatch?.[1] || ''
            };
        }).filter(script => script.src);
    }

    extractImages(html) {
        const imgMatches = html.match(/<img[^>]*>/gi) || [];
        return imgMatches.map(img => {
            const srcMatch = img.match(/src=["']([^"']*)["']/i);
            const altMatch = img.match(/alt=["']([^"']*)["']/i);
            return {
                src: srcMatch?.[1] || '',
                alt: altMatch?.[1] || ''
            };
        }).filter(img => img.src);
    }

    detectComponents(html) {
        const components = {};
        
        // Check for React/Next.js
        components.react = html.includes('__NEXT_DATA__') || html.includes('data-reactroot');
        components.nextjs = html.includes('__NEXT_DATA__') || html.includes('_next/');
        
        // Check for CSS frameworks
        components.tailwind = /class=["'][^"']*(?:bg-|text-|p-|m-|flex|grid)[^"']*["']/.test(html);
        components.bootstrap = /class=["'][^"']*(?:btn|container|row|col-)[^"']*["']/.test(html);
        
        // Check for UI libraries
        components.modals = html.includes('modal') || html.includes('dialog');
        components.dropdowns = html.includes('dropdown') || html.includes('menu');
        
        // Check for authentication
        components.login = html.includes('login') || html.includes('signin');
        components.signup = html.includes('signup') || html.includes('register');
        
        // Check for booking functionality
        components.calendar = html.includes('calendar') || html.includes('date');
        components.booking = html.includes('book') || html.includes('appointment');
        
        // Check for payment integration
        components.stripe = html.includes('stripe') || html.includes('payment');
        
        return components;
    }

    findJavaScriptErrors(html) {
        const errors = [];
        
        // Look for common error patterns in script tags
        const scriptContent = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
        scriptContent.forEach(script => {
            if (script.includes('error') || script.includes('Error')) {
                errors.push('Potential JavaScript error found in script tag');
            }
        });
        
        return errors;
    }

    async generateReport() {
        console.log('Generating comprehensive report...');
        
        const report = {
            metadata: {
                baseUrl: this.baseUrl,
                crawledAt: new Date().toISOString(),
                totalPages: this.pages.length,
                totalErrors: this.errors.length,
                routesTested: this.routesToTest.length
            },
            pages: this.pages,
            errors: this.errors,
            summary: {
                statusCodes: this.summarizeStatusCodes(),
                pageTypes: this.categorizePages(),
                performance: this.summarizePerformance(),
                technologies: this.analyzeTechnologies(),
                forms: this.summarizeForms(),
                accessibility: this.summarizeAccessibility()
            }
        };

        // Save main report
        const reportPath = path.join(this.resultsDir, 'manual-analysis-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        // Generate human-readable report
        const humanReadableReport = this.generateHumanReadableReport(report);
        const readableReportPath = path.join(this.resultsDir, 'manual-analysis-report.md');
        await fs.writeFile(readableReportPath, humanReadableReport);

        console.log(`Reports generated:`);
        console.log(`- JSON Report: ${reportPath}`);
        console.log(`- Readable Report: ${readableReportPath}`);

        return report;
    }

    summarizeStatusCodes() {
        const statusCodes = {};
        this.pages.forEach(page => {
            statusCodes[page.status] = (statusCodes[page.status] || 0) + 1;
        });
        return statusCodes;
    }

    categorizePages() {
        const categories = {
            public: [],
            auth: [],
            dashboard: [],
            api: [],
            admin: [],
            other: []
        };

        this.pages.forEach(page => {
            const route = page.route;
            if (route.startsWith('/api/')) {
                categories.api.push(route);
            } else if (route.includes('login') || route.includes('signup') || route.includes('register')) {
                categories.auth.push(route);
            } else if (route.includes('dashboard') || route.includes('profile') || route.includes('settings')) {
                categories.dashboard.push(route);
            } else if (route.includes('admin')) {
                categories.admin.push(route);
            } else if (route === '/' || route.includes('about') || route.includes('contact')) {
                categories.public.push(route);
            } else {
                categories.other.push(route);
            }
        });

        return categories;
    }

    summarizePerformance() {
        const responseTimes = this.pages
            .map(page => page.responseTime)
            .filter(time => time > 0);

        if (responseTimes.length === 0) return {};

        return {
            average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
            min: Math.min(...responseTimes),
            max: Math.max(...responseTimes),
            count: responseTimes.length
        };
    }

    analyzeTechnologies() {
        const technologies = new Set();
        
        this.pages.forEach(page => {
            if (page.components.react) technologies.add('React');
            if (page.components.nextjs) technologies.add('Next.js');
            if (page.components.tailwind) technologies.add('Tailwind CSS');
            if (page.components.bootstrap) technologies.add('Bootstrap');
            if (page.components.stripe) technologies.add('Stripe');
            
            // Check scripts for additional technologies
            page.scripts.forEach(script => {
                if (script.src.includes('google')) technologies.add('Google APIs');
                if (script.src.includes('stripe')) technologies.add('Stripe');
                if (script.src.includes('jquery')) technologies.add('jQuery');
            });
        });

        return Array.from(technologies);
    }

    summarizeForms() {
        let totalForms = 0;
        const formTypes = {};
        const inputTypes = {};

        this.pages.forEach(page => {
            totalForms += page.forms.length;
            page.forms.forEach(form => {
                // Infer form type from inputs
                const inputs = form.inputs.map(i => i.type);
                let formType = 'generic';
                
                if (inputs.includes('password') && inputs.includes('email')) {
                    formType = 'login';
                } else if (inputs.includes('password') && inputs.length > 3) {
                    formType = 'registration';
                } else if (inputs.includes('search')) {
                    formType = 'search';
                } else if (inputs.includes('date') || inputs.includes('tel')) {
                    formType = 'booking';
                }
                
                formTypes[formType] = (formTypes[formType] || 0) + 1;
                
                form.inputs.forEach(input => {
                    inputTypes[input.type] = (inputTypes[input.type] || 0) + 1;
                });
            });
        });

        return { totalForms, formTypes, inputTypes };
    }

    summarizeAccessibility() {
        let missingAltText = 0;
        let h1Issues = 0;

        this.pages.forEach(page => {
            missingAltText += page.images.filter(img => !img.alt).length;
            if (page.headings.h1.length !== 1) {
                h1Issues++;
            }
        });

        return { missingAltText, h1Issues };
    }

    generateHumanReadableReport(report) {
        return `# 6FB Booking Manual Site Analysis Report

## Overview
- **Base URL**: ${report.metadata.baseUrl}
- **Crawled At**: ${report.metadata.crawledAt}
- **Total Pages Analyzed**: ${report.metadata.totalPages}
- **Routes Tested**: ${report.metadata.routesTested}
- **Total Errors**: ${report.metadata.totalErrors}

## Technology Stack
${report.summary.technologies.map(tech => `- ${tech}`).join('\n')}

## Status Code Analysis
${Object.entries(report.summary.statusCodes).map(([code, count]) => `- **${code}**: ${count} pages`).join('\n')}

## Page Categories
${Object.entries(report.summary.pageTypes).map(([category, routes]) => 
    `- **${category}**: ${routes.length} pages (${routes.join(', ')})`
).join('\n')}

## Performance Summary
${report.summary.performance.average ? `
- **Average Response Time**: ${Math.round(report.summary.performance.average)}ms
- **Fastest Response**: ${Math.round(report.summary.performance.min)}ms
- **Slowest Response**: ${Math.round(report.summary.performance.max)}ms
` : 'No performance data available'}

## Forms Analysis
- **Total Forms**: ${report.summary.forms.totalForms}
- **Form Types**: ${Object.entries(report.summary.forms.formTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}
- **Input Types**: ${Object.entries(report.summary.forms.inputTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}

## Accessibility Issues
- **Images Missing Alt Text**: ${report.summary.accessibility.missingAltText}
- **Pages with H1 Issues**: ${report.summary.accessibility.h1Issues}

## Detailed Page Analysis

${report.pages.map(page => `
### ${page.route} - ${page.title || 'No Title'}
- **Status**: ${page.status} ${page.statusText}
- **Response Time**: ${page.responseTime}ms
- **Content Type**: ${page.contentType}

**Features Detected**:
${Object.entries(page.components).filter(([key, value]) => value).map(([key]) => `- ${key}`).join('\n')}

**Headings**:
${page.headings.h1.map(h => `- H1: ${h}`).join('\n')}
${page.headings.h2.slice(0, 3).map(h => `- H2: ${h}`).join('\n')}

**Forms**: ${page.forms.length}
**Links**: ${page.links.length}
**Images**: ${page.images.length}
**Scripts**: ${page.scripts.length}
`).join('\n')}

## Errors Encountered
${report.errors.length > 0 ? report.errors.map(error => `
### ${error.route}
- **URL**: ${error.url}
- **Error**: ${error.error}
- **Status**: ${error.status || 'N/A'}
`).join('\n') : 'No errors encountered during testing.'}

## Recommendations

### Technical Issues
${report.errors.length > 0 ? `
- Investigate ${report.errors.length} failed routes
- Check server configuration and routing
` : '- No critical routing issues identified'}

### Performance
${report.summary.performance.average > 1000 ? `
- Optimize response times (current average: ${Math.round(report.summary.performance.average)}ms)
- Consider implementing caching
- Review database queries
` : '- Response times appear acceptable'}

### Accessibility
${report.summary.accessibility.missingAltText > 0 ? `
- Add alt text to ${report.summary.accessibility.missingAltText} images
` : ''}${report.summary.accessibility.h1Issues > 0 ? `
- Fix heading structure on ${report.summary.accessibility.h1Issues} pages
` : ''}

### Security
- Review authentication flows on login/signup pages
- Ensure HTTPS is enforced in production
- Validate all form inputs properly

---
Generated by 6FB Manual Crawler on ${new Date().toISOString()}
`;
    }

    async run() {
        try {
            console.log(`Starting manual crawl of ${this.baseUrl}...`);
            
            // Test all defined routes
            for (const route of this.routesToTest) {
                await this.testRoute(route);
                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log('Generating reports...');
            const report = await this.generateReport();
            
            console.log('\n=== MANUAL CRAWL COMPLETE ===');
            console.log(`✅ Successfully tested ${this.pages.length} routes`);
            console.log(`📊 Reports saved to: ${this.resultsDir}`);
            
            if (this.errors.length > 0) {
                console.log(`⚠️  ${this.errors.length} routes returned errors`);
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
    const crawler = new ManualCrawler();
    crawler.run().catch(console.error);
}

module.exports = ManualCrawler;