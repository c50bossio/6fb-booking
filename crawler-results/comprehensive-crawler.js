const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveCrawler {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.pages = [];
        this.errors = [];
        this.resultsDir = path.join(__dirname);
        
        // Define actual routes based on the Next.js structure found
        this.actualRoutes = [
            // Root and public pages
            '/',
            '/about',
            '/contact',
            '/login',
            '/signup',
            
            // Dashboard and authenticated routes
            '/dashboard',
            '/dashboard/appointments',
            '/dashboard/appointments/new',
            '/dashboard/calendar',
            '/dashboard/clients',
            '/dashboard/services',
            '/dashboard/financial',
            '/dashboard/notifications',
            '/dashboard/gift-certificates',
            
            // Booking flow
            '/book',
            '/booking-demo',
            '/booking-calendar-demo',
            
            // Customer portal
            '/customer/login',
            '/customer/signup',
            '/customer/dashboard',
            '/customer/appointments',
            '/customer/profile',
            
            // Settings and configuration
            '/settings',
            '/settings/payments',
            '/settings/google-calendar',
            '/settings/compensation',
            
            // Payment and billing
            '/payments',
            '/payment/success',
            '/payment/failure',
            '/payouts',
            '/billing',
            
            // Analytics and reports
            '/analytics',
            '/analytics/ai',
            
            // App features
            '/app',
            '/app/analytics',
            '/app/appointments',
            '/app/barbers',
            '/app/calendar',
            '/app/clients',
            '/app/payments',
            '/app/payouts/dashboard',
            
            // Barber management
            '/barbers',
            '/barber-payments',
            
            // POS system
            '/pos',
            
            // Calendar demos and tests
            '/calendar-demo',
            '/calendar-google-demo',
            '/simple-calendar-demo',
            '/enhanced-calendar-demo',
            '/test-calendar',
            
            // Gift certificates
            '/gift-certificates',
            '/gift-certificates/purchase',
            
            // Other features
            '/locations',
            '/communications',
            '/notifications',
            '/email-campaigns',
            '/local-seo',
            '/recurring-bookings',
            '/payout-schedules',
            
            // Legal and support
            '/privacy',
            '/terms',
            '/support',
            
            // API endpoints
            '/api/health',
            '/api/list-pages',
            '/api/verify-pages',
            
            // Test pages
            '/test',
            '/test-login',
            '/test-dashboard',
            '/test-public',
            '/auth-test',
            '/emergency-login'
        ];
    }

    async testRoute(route) {
        const url = `${this.baseUrl}${route}`;
        console.log(`Testing route: ${route}`);
        
        try {
            const startTime = Date.now();
            const response = await axios.get(url, {
                timeout: 15000,
                validateStatus: () => true,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache'
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
                status: error.response?.status,
                statusText: error.response?.statusText
            });
            return null;
        }
    }

    analyzeResponse(route, url, response, responseTime) {
        const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        
        const pageInfo = {
            route: route,
            url: url,
            status: response.status,
            statusText: response.statusText,
            responseTime: responseTime,
            contentType: response.headers['content-type'],
            contentLength: response.headers['content-length'],
            timestamp: new Date().toISOString(),
            
            // Extract information
            title: this.extractTitle(html),
            metaTags: this.extractMetaTags(html),
            headings: this.extractHeadings(html),
            links: this.extractLinks(html),
            forms: this.extractForms(html),
            scripts: this.extractScripts(html),
            images: this.extractImages(html),
            components: this.detectComponents(html),
            uiElements: this.detectUIElements(html),
            accessibility: this.checkAccessibility(html),
            seo: this.analyzeSEO(html),
            performance: this.analyzePerformance(response, responseTime)
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
        const headings = { h1: [], h2: [], h3: [], h4: [] };
        
        for (let level = 1; level <= 4; level++) {
            const regex = new RegExp(`<h${level}[^>]*>([^<]*)</h${level}>`, 'gi');
            const matches = html.match(regex) || [];
            headings[`h${level}`] = matches.map(h => h.replace(/<[^>]*>/g, '').trim());
        }
        
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
        }).filter(link => link.href && !link.href.startsWith('mailto:') && !link.href.startsWith('tel:'));
    }

    extractForms(html) {
        const formMatches = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
        return formMatches.map(form => {
            const actionMatch = form.match(/action=["']([^"']*)["']/i);
            const methodMatch = form.match(/method=["']([^"']*)["']/i);
            const inputMatches = form.match(/<input[^>]*>/gi) || [];
            const textareaMatches = form.match(/<textarea[^>]*>/gi) || [];
            const selectMatches = form.match(/<select[^>]*>/gi) || [];
            
            const inputs = [...inputMatches, ...textareaMatches, ...selectMatches].map(input => {
                const typeMatch = input.match(/type=["']([^"']*)["']/i);
                const nameMatch = input.match(/name=["']([^"']*)["']/i);
                const placeholderMatch = input.match(/placeholder=["']([^"']*)["']/i);
                const requiredMatch = input.match(/required/i);
                
                return {
                    type: typeMatch?.[1] || input.includes('<textarea') ? 'textarea' : input.includes('<select') ? 'select' : 'text',
                    name: nameMatch?.[1] || '',
                    placeholder: placeholderMatch?.[1] || '',
                    required: !!requiredMatch
                };
            });
            
            return {
                action: actionMatch?.[1] || '',
                method: methodMatch?.[1] || 'GET',
                inputs: inputs,
                hasSubmitButton: form.includes('type="submit"') || form.includes('<button')
            };
        });
    }

    extractScripts(html) {
        const scriptMatches = html.match(/<script[^>]*src=["']([^"']*)["'][^>]*>/gi) || [];
        return scriptMatches.map(script => {
            const srcMatch = script.match(/src=["']([^"']*)["']/i);
            const asyncMatch = script.match(/async/i);
            const deferMatch = script.match(/defer/i);
            
            return {
                src: srcMatch?.[1] || '',
                async: !!asyncMatch,
                defer: !!deferMatch
            };
        }).filter(script => script.src);
    }

    extractImages(html) {
        const imgMatches = html.match(/<img[^>]*>/gi) || [];
        return imgMatches.map(img => {
            const srcMatch = img.match(/src=["']([^"']*)["']/i);
            const altMatch = img.match(/alt=["']([^"']*)["']/i);
            const titleMatch = img.match(/title=["']([^"']*)["']/i);
            const loadingMatch = img.match(/loading=["']([^"']*)["']/i);
            
            return {
                src: srcMatch?.[1] || '',
                alt: altMatch?.[1] || '',
                title: titleMatch?.[1] || '',
                loading: loadingMatch?.[1] || ''
            };
        }).filter(img => img.src);
    }

    detectComponents(html) {
        const components = {};
        
        // Framework detection
        components.react = html.includes('__NEXT_DATA__') || html.includes('data-reactroot') || html.includes('_next/');
        components.nextjs = html.includes('__NEXT_DATA__') || html.includes('_next/');
        
        // CSS frameworks
        components.tailwind = /class=["'][^"']*(?:bg-|text-|p-|m-|flex|grid|w-|h-|border-)[^"']*["']/.test(html);
        components.bootstrap = /class=["'][^"']*(?:btn|container|row|col-|navbar|modal)[^"']*["']/.test(html);
        
        // UI components
        components.modals = html.includes('modal') || html.includes('dialog') || html.includes('Modal');
        components.dropdowns = html.includes('dropdown') || html.includes('menu') || html.includes('Dropdown');
        components.tabs = html.includes('tab') || html.includes('Tab');
        components.calendar = html.includes('calendar') || html.includes('Calendar') || html.includes('date-picker');
        
        // Authentication
        components.login = html.includes('login') || html.includes('signin') || html.includes('Login');
        components.signup = html.includes('signup') || html.includes('register') || html.includes('Register');
        
        // Booking functionality
        components.booking = html.includes('book') || html.includes('appointment') || html.includes('Booking');
        components.payment = html.includes('stripe') || html.includes('payment') || html.includes('Payment');
        
        // Analytics
        components.analytics = html.includes('analytics') || html.includes('chart') || html.includes('Chart');
        components.dashboard = html.includes('dashboard') || html.includes('Dashboard');
        
        return components;
    }

    detectUIElements(html) {
        return {
            buttons: (html.match(/<button[^>]*>/gi) || []).length,
            inputs: (html.match(/<input[^>]*>/gi) || []).length,
            textareas: (html.match(/<textarea[^>]*>/gi) || []).length,
            selects: (html.match(/<select[^>]*>/gi) || []).length,
            tables: (html.match(/<table[^>]*>/gi) || []).length,
            lists: (html.match(/<ul[^>]*>|<ol[^>]*>/gi) || []).length,
            divs: (html.match(/<div[^>]*>/gi) || []).length,
            sections: (html.match(/<section[^>]*>/gi) || []).length,
            articles: (html.match(/<article[^>]*>/gi) || []).length,
            navs: (html.match(/<nav[^>]*>/gi) || []).length
        };
    }

    checkAccessibility(html) {
        return {
            imagesWithoutAlt: (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length,
            ariaLabels: (html.match(/aria-label=["'][^"']*["']/gi) || []).length,
            ariaDescribedby: (html.match(/aria-describedby=["'][^"']*["']/gi) || []).length,
            roles: (html.match(/role=["'][^"']*["']/gi) || []).length,
            skipLinks: (html.match(/skip|Skip/g) || []).length,
            landmarkRoles: (html.match(/role=["'](?:main|navigation|banner|contentinfo|complementary)["']/gi) || []).length,
            tabindex: (html.match(/tabindex=["'][^"']*["']/gi) || []).length
        };
    }

    analyzeSEO(html) {
        const title = this.extractTitle(html);
        const metaTags = this.extractMetaTags(html);
        const headings = this.extractHeadings(html);
        
        return {
            hasTitle: !!title,
            titleLength: title.length,
            hasDescription: !!metaTags.description,
            descriptionLength: metaTags.description?.length || 0,
            hasKeywords: !!metaTags.keywords,
            h1Count: headings.h1.length,
            hasOpenGraph: !!(metaTags['og:title'] || metaTags['og:description']),
            hasTwitterCard: !!(metaTags['twitter:card'] || metaTags['twitter:title']),
            hasCanonical: html.includes('rel="canonical"'),
            hasStructuredData: html.includes('application/ld+json') || html.includes('schema.org')
        };
    }

    analyzePerformance(response, responseTime) {
        return {
            responseTime: responseTime,
            contentLength: parseInt(response.headers['content-length']) || 0,
            gzipped: response.headers['content-encoding'] === 'gzip',
            cached: !!(response.headers['cache-control'] || response.headers['etag']),
            serverTiming: response.headers['server-timing'] || null
        };
    }

    async generateComprehensiveReport() {
        console.log('Generating comprehensive site analysis report...');
        
        const report = {
            metadata: {
                baseUrl: this.baseUrl,
                crawledAt: new Date().toISOString(),
                totalPages: this.pages.length,
                totalErrors: this.errors.length,
                routesTested: this.actualRoutes.length,
                crawler: 'Comprehensive 6FB Site Crawler'
            },
            pages: this.pages,
            errors: this.errors,
            summary: {
                statusCodes: this.summarizeStatusCodes(),
                pageCategories: this.categorizePages(),
                performance: this.summarizePerformance(),
                technologies: this.analyzeTechnologies(),
                forms: this.summarizeForms(),
                accessibility: this.summarizeAccessibility(),
                seo: this.summarizeSEO(),
                components: this.summarizeComponents(),
                uiElements: this.summarizeUIElements()
            },
            insights: this.generateInsights()
        };

        // Save main report
        const reportPath = path.join(this.resultsDir, 'comprehensive-analysis-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        // Generate human-readable report
        const humanReadableReport = this.generateHumanReadableReport(report);
        const readableReportPath = path.join(this.resultsDir, 'comprehensive-analysis-report.md');
        await fs.writeFile(readableReportPath, humanReadableReport);

        // Generate sitemap
        const sitemap = this.generateSitemap(report);
        const sitemapPath = path.join(this.resultsDir, 'sitemap.md');
        await fs.writeFile(sitemapPath, sitemap);

        // Generate route status summary
        const routeStatusSummary = this.generateRouteStatusSummary(report);
        const routeStatusPath = path.join(this.resultsDir, 'route-status-summary.md');
        await fs.writeFile(routeStatusPath, routeStatusSummary);

        console.log(`Comprehensive reports generated:`);
        console.log(`- JSON Report: ${reportPath}`);
        console.log(`- Readable Report: ${readableReportPath}`);
        console.log(`- Sitemap: ${sitemapPath}`);
        console.log(`- Route Status: ${routeStatusPath}`);

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
            public: { routes: [], description: 'Public pages accessible without authentication' },
            auth: { routes: [], description: 'Authentication and signup pages' },
            dashboard: { routes: [], description: 'Main dashboard and management pages' },
            booking: { routes: [], description: 'Booking flow and calendar pages' },
            customer: { routes: [], description: 'Customer portal pages' },
            settings: { routes: [], description: 'Configuration and settings pages' },
            payments: { routes: [], description: 'Payment and billing pages' },
            analytics: { routes: [], description: 'Analytics and reporting pages' },
            api: { routes: [], description: 'API endpoints' },
            demo: { routes: [], description: 'Demo and test pages' },
            other: { routes: [], description: 'Other pages' }
        };

        this.pages.forEach(page => {
            const route = page.route;
            if (route.startsWith('/api/')) {
                categories.api.routes.push({ route, status: page.status, title: page.title });
            } else if (route.includes('demo') || route.includes('test')) {
                categories.demo.routes.push({ route, status: page.status, title: page.title });
            } else if (route.includes('login') || route.includes('signup') || route.includes('auth')) {
                categories.auth.routes.push({ route, status: page.status, title: page.title });
            } else if (route.includes('dashboard') || route.includes('app/')) {
                categories.dashboard.routes.push({ route, status: page.status, title: page.title });
            } else if (route.includes('book') || route.includes('calendar') || route.includes('appointment')) {
                categories.booking.routes.push({ route, status: page.status, title: page.title });
            } else if (route.includes('customer/')) {
                categories.customer.routes.push({ route, status: page.status, title: page.title });
            } else if (route.includes('settings') || route.includes('config')) {
                categories.settings.routes.push({ route, status: page.status, title: page.title });
            } else if (route.includes('payment') || route.includes('billing') || route.includes('payout')) {
                categories.payments.routes.push({ route, status: page.status, title: page.title });
            } else if (route.includes('analytics')) {
                categories.analytics.routes.push({ route, status: page.status, title: page.title });
            } else if (route === '/' || route.includes('about') || route.includes('contact') || route.includes('privacy') || route.includes('terms')) {
                categories.public.routes.push({ route, status: page.status, title: page.title });
            } else {
                categories.other.routes.push({ route, status: page.status, title: page.title });
            }
        });

        return categories;
    }

    summarizePerformance() {
        const responseTimes = this.pages.map(page => page.responseTime).filter(time => time > 0);
        const contentSizes = this.pages.map(page => page.performance?.contentLength || 0).filter(size => size > 0);

        return {
            responseTime: {
                average: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
                min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
                max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
                count: responseTimes.length
            },
            contentSize: {
                average: contentSizes.length > 0 ? contentSizes.reduce((a, b) => a + b, 0) / contentSizes.length : 0,
                min: contentSizes.length > 0 ? Math.min(...contentSizes) : 0,
                max: contentSizes.length > 0 ? Math.max(...contentSizes) : 0,
                count: contentSizes.length
            }
        };
    }

    analyzeTechnologies() {
        const technologies = new Set();
        
        this.pages.forEach(page => {
            Object.entries(page.components).forEach(([tech, detected]) => {
                if (detected) technologies.add(tech);
            });
            
            page.scripts.forEach(script => {
                if (script.src.includes('stripe')) technologies.add('Stripe');
                if (script.src.includes('google')) technologies.add('Google APIs');
                if (script.src.includes('analytics')) technologies.add('Google Analytics');
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
                const formType = this.classifyForm(form);
                formTypes[formType] = (formTypes[formType] || 0) + 1;
                
                form.inputs.forEach(input => {
                    inputTypes[input.type] = (inputTypes[input.type] || 0) + 1;
                });
            });
        });

        return { totalForms, formTypes, inputTypes };
    }

    classifyForm(form) {
        const inputs = form.inputs.map(i => i.type.toLowerCase());
        const hasPassword = inputs.includes('password');
        const hasEmail = inputs.includes('email');
        const hasDate = inputs.includes('date') || inputs.includes('datetime-local');
        const hasTime = inputs.includes('time');
        
        if (hasPassword && hasEmail && inputs.length <= 3) return 'login';
        if (hasPassword && inputs.length > 3) return 'registration';
        if (inputs.includes('search')) return 'search';
        if (hasDate || hasTime) return 'booking';
        if (inputs.includes('tel') || inputs.includes('number')) return 'contact';
        return 'generic';
    }

    summarizeAccessibility() {
        let totalIssues = 0;
        const issues = {
            imagesWithoutAlt: 0,
            ariaLabels: 0,
            roles: 0,
            landmarkRoles: 0
        };

        this.pages.forEach(page => {
            issues.imagesWithoutAlt += page.accessibility.imagesWithoutAlt;
            issues.ariaLabels += page.accessibility.ariaLabels;
            issues.roles += page.accessibility.roles;
            issues.landmarkRoles += page.accessibility.landmarkRoles;
            totalIssues += page.accessibility.imagesWithoutAlt;
        });

        return { totalIssues, ...issues };
    }

    summarizeSEO() {
        const seoIssues = {
            pagesWithoutTitle: 0,
            pagesWithoutDescription: 0,
            pagesWithoutH1: 0,
            pagesWithMultipleH1: 0,
            pagesWithOpenGraph: 0,
            pagesWithStructuredData: 0
        };

        this.pages.forEach(page => {
            if (!page.seo.hasTitle) seoIssues.pagesWithoutTitle++;
            if (!page.seo.hasDescription) seoIssues.pagesWithoutDescription++;
            if (page.seo.h1Count === 0) seoIssues.pagesWithoutH1++;
            if (page.seo.h1Count > 1) seoIssues.pagesWithMultipleH1++;
            if (page.seo.hasOpenGraph) seoIssues.pagesWithOpenGraph++;
            if (page.seo.hasStructuredData) seoIssues.pagesWithStructuredData++;
        });

        return seoIssues;
    }

    summarizeComponents() {
        const componentUsage = {};
        this.pages.forEach(page => {
            Object.entries(page.components).forEach(([component, detected]) => {
                if (detected) {
                    componentUsage[component] = (componentUsage[component] || 0) + 1;
                }
            });
        });
        return componentUsage;
    }

    summarizeUIElements() {
        const totalElements = {
            buttons: 0,
            inputs: 0,
            forms: 0,
            images: 0,
            links: 0
        };

        this.pages.forEach(page => {
            totalElements.buttons += page.uiElements.buttons;
            totalElements.inputs += page.uiElements.inputs;
            totalElements.forms += page.forms.length;
            totalElements.images += page.images.length;
            totalElements.links += page.links.length;
        });

        return totalElements;
    }

    generateInsights() {
        const workingPages = this.pages.filter(p => p.status === 200);
        const errorPages = this.pages.filter(p => p.status >= 400);
        
        return {
            siteHealth: {
                workingPagesCount: workingPages.length,
                errorPagesCount: errorPages.length,
                healthScore: Math.round((workingPages.length / this.pages.length) * 100)
            },
            keyFindings: [
                `${workingPages.length} pages are working correctly`,
                `${errorPages.length} pages returned errors`,
                `Site uses ${this.analyzeTechnologies().join(', ')}`,
                `Average response time: ${Math.round(this.summarizePerformance().responseTime.average)}ms`
            ],
            recommendations: this.generateRecommendations()
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const seo = this.summarizeSEO();
        const accessibility = this.summarizeAccessibility();
        const performance = this.summarizePerformance();

        if (seo.pagesWithoutTitle > 0) {
            recommendations.push(`Add titles to ${seo.pagesWithoutTitle} pages`);
        }
        if (seo.pagesWithoutDescription > 0) {
            recommendations.push(`Add meta descriptions to ${seo.pagesWithoutDescription} pages`);
        }
        if (accessibility.imagesWithoutAlt > 0) {
            recommendations.push(`Add alt text to ${accessibility.imagesWithoutAlt} images`);
        }
        if (performance.responseTime.average > 1000) {
            recommendations.push('Optimize page load times');
        }

        return recommendations;
    }

    generateHumanReadableReport(report) {
        return `# 6FB Booking Comprehensive Site Analysis

## Executive Summary
- **Base URL**: ${report.metadata.baseUrl}
- **Analysis Date**: ${report.metadata.crawledAt}
- **Pages Analyzed**: ${report.metadata.totalPages}
- **Health Score**: ${report.insights.siteHealth.healthScore}%

## Key Findings
${report.insights.keyFindings.map(finding => `- ${finding}`).join('\n')}

## Technology Stack
${report.summary.technologies.map(tech => `- ${tech}`).join('\n')}

## Site Health Overview

### Status Code Distribution
${Object.entries(report.summary.statusCodes).map(([code, count]) => `- **HTTP ${code}**: ${count} pages`).join('\n')}

### Page Categories
${Object.entries(report.summary.pageCategories).map(([category, data]) => 
    `- **${category.charAt(0).toUpperCase() + category.slice(1)}**: ${data.routes.length} pages - ${data.description}`
).join('\n')}

## Performance Analysis

### Response Times
- **Average**: ${Math.round(report.summary.performance.responseTime.average)}ms
- **Fastest**: ${Math.round(report.summary.performance.responseTime.min)}ms
- **Slowest**: ${Math.round(report.summary.performance.responseTime.max)}ms

### Content Size Analysis
- **Average Page Size**: ${Math.round(report.summary.performance.contentSize.average / 1024)}KB
- **Largest Page**: ${Math.round(report.summary.performance.contentSize.max / 1024)}KB

## SEO Analysis
- **Pages Without Titles**: ${report.summary.seo.pagesWithoutTitle}
- **Pages Without Descriptions**: ${report.summary.seo.pagesWithoutDescription}
- **Pages Without H1**: ${report.summary.seo.pagesWithoutH1}
- **Pages With Multiple H1**: ${report.summary.seo.pagesWithMultipleH1}
- **Pages With OpenGraph**: ${report.summary.seo.pagesWithOpenGraph}
- **Pages With Structured Data**: ${report.summary.seo.pagesWithStructuredData}

## Accessibility Assessment
- **Images Missing Alt Text**: ${report.summary.accessibility.imagesWithoutAlt}
- **Pages With ARIA Labels**: ${report.summary.accessibility.ariaLabels}
- **Pages With Roles**: ${report.summary.accessibility.roles}
- **Pages With Landmark Roles**: ${report.summary.accessibility.landmarkRoles}

## Component Usage
${Object.entries(report.summary.components).map(([component, count]) => `- **${component}**: ${count} pages`).join('\n')}

## Forms Analysis
- **Total Forms**: ${report.summary.forms.totalForms}
- **Form Types**: ${Object.entries(report.summary.forms.formTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}
- **Input Types**: ${Object.entries(report.summary.forms.inputTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}

## UI Elements Summary
- **Total Buttons**: ${report.summary.uiElements.buttons}
- **Total Form Inputs**: ${report.summary.uiElements.inputs}
- **Total Images**: ${report.summary.uiElements.images}
- **Total Links**: ${report.summary.uiElements.links}

## Detailed Page Analysis

${report.pages.slice(0, 20).map(page => `
### ${page.route} ${page.status === 200 ? '✅' : page.status === 404 ? '❌' : '⚠️'}
- **Title**: ${page.title || 'No title'}
- **Status**: ${page.status} ${page.statusText}
- **Response Time**: ${page.responseTime}ms
- **Components**: ${Object.entries(page.components).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'None detected'}
- **Forms**: ${page.forms.length}
- **Images**: ${page.images.length}
- **SEO Score**: ${this.calculatePageSEOScore(page)}/10
`).join('\n')}

${report.pages.length > 20 ? `\n*... and ${report.pages.length - 20} more pages*` : ''}

## Error Analysis

${report.errors.length > 0 ? `
### Failed Routes
${report.errors.map(error => `
- **${error.route}**: ${error.error} (Status: ${error.status || 'N/A'})
`).join('\n')}` : 'No errors encountered during crawling.'}

## Recommendations

### High Priority
${report.insights.recommendations.slice(0, 3).map(rec => `- ${rec}`).join('\n')}

### Technical Improvements
- Implement proper error pages for 404s
- Add loading states for better UX
- Optimize images and assets
- Implement proper caching headers

### SEO Improvements
- Add meta descriptions to all pages
- Implement Open Graph tags
- Add structured data markup
- Optimize heading structure

### Accessibility Improvements
- Add alt text to all images
- Implement proper focus management
- Add ARIA labels where needed
- Ensure keyboard navigation works

---
*Generated by 6FB Comprehensive Site Crawler on ${new Date().toISOString()}*
`;
    }

    calculatePageSEOScore(page) {
        let score = 0;
        if (page.seo.hasTitle) score += 2;
        if (page.seo.titleLength > 10 && page.seo.titleLength < 60) score += 1;
        if (page.seo.hasDescription) score += 2;
        if (page.seo.descriptionLength > 50 && page.seo.descriptionLength < 160) score += 1;
        if (page.seo.h1Count === 1) score += 2;
        if (page.seo.hasOpenGraph) score += 1;
        if (page.seo.hasStructuredData) score += 1;
        return Math.min(score, 10);
    }

    generateSitemap(report) {
        return `# 6FB Booking Site Map

## Working Pages (HTTP 200)
${report.pages.filter(p => p.status === 200).map(page => 
    `- [${page.route}](${page.url}) - ${page.title || 'No title'}`
).join('\n')}

## Redirect Pages (HTTP 3xx)
${report.pages.filter(p => p.status >= 300 && p.status < 400).map(page => 
    `- [${page.route}](${page.url}) - ${page.statusText}`
).join('\n')}

## Error Pages (HTTP 4xx/5xx)
${report.pages.filter(p => p.status >= 400).map(page => 
    `- [${page.route}](${page.url}) - ${page.status} ${page.statusText}`
).join('\n')}

## Page Categories
${Object.entries(report.summary.pageCategories).map(([category, data]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)} Pages
${data.routes.map(route => `- [${route.route}](${report.metadata.baseUrl}${route.route}) - ${route.status} - ${route.title || 'No title'}`).join('\n')}
`).join('\n')}

---
*Generated on ${new Date().toISOString()}*
`;
    }

    generateRouteStatusSummary(report) {
        return `# Route Status Summary

## Quick Status Overview
${this.actualRoutes.map(route => {
    const page = this.pages.find(p => p.route === route);
    const status = page ? page.status : 'NOT_TESTED';
    const emoji = status === 200 ? '✅' : status === 404 ? '❌' : status === 'NOT_TESTED' ? '⏭️' : '⚠️';
    return `${emoji} \`${route}\` - ${status} ${page?.statusText || ''}`;
}).join('\n')}

## Statistics
- **Total Routes Tested**: ${this.actualRoutes.length}
- **Working Routes**: ${report.pages.filter(p => p.status === 200).length}
- **404 Routes**: ${report.pages.filter(p => p.status === 404).length}
- **Error Routes**: ${report.pages.filter(p => p.status >= 500).length}
- **Redirect Routes**: ${report.pages.filter(p => p.status >= 300 && p.status < 400).length}

## Next Steps
1. Fix or implement missing 404 routes
2. Test authentication-protected routes
3. Verify API endpoints functionality
4. Check responsive design on working pages

---
*Generated on ${new Date().toISOString()}*
`;
    }

    async run() {
        try {
            console.log(`\n🚀 Starting comprehensive crawl of ${this.baseUrl}...`);
            console.log(`📋 Testing ${this.actualRoutes.length} routes based on actual Next.js structure\n`);
            
            let completed = 0;
            for (const route of this.actualRoutes) {
                await this.testRoute(route);
                completed++;
                
                if (completed % 10 === 0) {
                    console.log(`✅ Completed ${completed}/${this.actualRoutes.length} routes`);
                }
                
                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            console.log('\n📊 Generating comprehensive reports...');
            const report = await this.generateComprehensiveReport();
            
            console.log('\n=== COMPREHENSIVE CRAWL COMPLETE ===');
            console.log(`✅ Successfully analyzed ${this.pages.length} pages`);
            console.log(`📈 Site Health Score: ${report.insights.siteHealth.healthScore}%`);
            console.log(`🏆 Working Pages: ${report.insights.siteHealth.workingPagesCount}`);
            console.log(`❌ Error Pages: ${report.insights.siteHealth.errorPagesCount}`);
            console.log(`📊 Reports saved to: ${this.resultsDir}`);
            
            if (this.errors.length > 0) {
                console.log(`⚠️  ${this.errors.length} routes had issues`);
            }

            return report;
        } catch (error) {
            console.error('Fatal error during comprehensive crawling:', error);
            throw error;
        }
    }
}

// Export for module use or run directly
if (require.main === module) {
    const crawler = new ComprehensiveCrawler();
    crawler.run().catch(console.error);
}

module.exports = ComprehensiveCrawler;