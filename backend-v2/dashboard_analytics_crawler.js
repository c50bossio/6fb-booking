/**
 * Dashboard Analytics Crawler
 * Comprehensive Puppeteer script to diagnose component loading issues
 * and capture detailed browser logs for the BookedBarber dashboard
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class DashboardCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        this.logs = {
            console: [],
            errors: [],
            requests: [],
            responses: [],
            screenshots: []
        };
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    }

    async init() {
        console.log('🚀 Starting Dashboard Analytics Crawler...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Keep visible for debugging
            devtools: true,  // Open DevTools
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Set viewport
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('✅ Browser initialized successfully');
    }

    setupEventListeners() {
        // Console logs
        this.page.on('console', (msg) => {
            const logEntry = {
                timestamp: new Date().toISOString(),
                type: msg.type(),
                text: msg.text(),
                location: msg.location()
            };
            this.logs.console.push(logEntry);
            console.log(`📝 Console [${msg.type()}]: ${msg.text()}`);
        });

        // JavaScript errors
        this.page.on('pageerror', (error) => {
            const errorEntry = {
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack,
                name: error.name
            };
            this.logs.errors.push(errorEntry);
            console.error(`❌ JavaScript Error: ${error.message}`);
        });

        // Request monitoring
        this.page.on('request', (request) => {
            const requestEntry = {
                timestamp: new Date().toISOString(),
                url: request.url(),
                method: request.method(),
                resourceType: request.resourceType(),
                headers: request.headers()
            };
            this.logs.requests.push(requestEntry);
            
            if (request.url().includes('/api/')) {
                console.log(`🌐 API Request: ${request.method()} ${request.url()}`);
            }
        });

        // Response monitoring
        this.page.on('response', (response) => {
            const responseEntry = {
                timestamp: new Date().toISOString(),
                url: response.url(),
                status: response.status(),
                statusText: response.statusText(),
                headers: response.headers()
            };
            this.logs.responses.push(responseEntry);
            
            if (response.url().includes('/api/')) {
                console.log(`📡 API Response: ${response.status()} ${response.url()}`);
                
                // Log failed requests
                if (response.status() >= 400) {
                    console.error(`❌ Failed Request: ${response.status()} ${response.url()}`);
                }
            }
        });

        // Request failures
        this.page.on('requestfailed', (request) => {
            const failureEntry = {
                timestamp: new Date().toISOString(),
                url: request.url(),
                failure: request.failure().errorText,
                resourceType: request.resourceType()
            };
            this.logs.errors.push(failureEntry);
            console.error(`💥 Request Failed: ${request.url()} - ${request.failure().errorText}`);
        });
    }

    async takeScreenshot(name) {
        const filename = `screenshot_${this.timestamp}_${name}.png`;
        const filepath = path.join(__dirname, 'crawler_reports', filename);
        
        // Ensure directory exists
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        await this.page.screenshot({ 
            path: filepath, 
            fullPage: true 
        });
        
        this.logs.screenshots.push({
            timestamp: new Date().toISOString(),
            name: name,
            filename: filename,
            path: filepath
        });
        
        console.log(`📸 Screenshot saved: ${filename}`);
        return filepath;
    }

    async navigateToHomepage() {
        console.log('🏠 Navigating to homepage...');
        
        try {
            await this.page.goto('http://localhost:3001', { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            await this.takeScreenshot('01_homepage');
            
            // Wait for homepage to load
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check for auth buttons
            const authButtons = await this.page.$$('[data-testid*="auth"], .auth-button, button:contains("Login"), button:contains("Register")');
            console.log(`Found ${authButtons.length} auth-related buttons`);
            
            return true;
        } catch (error) {
            console.error(`❌ Failed to load homepage: ${error.message}`);
            await this.takeScreenshot('01_homepage_error');
            return false;
        }
    }

    async attemptLogin() {
        console.log('🔐 Attempting to log in...');
        
        try {
            // Look for login button
            const loginButton = await this.page.$('button:contains("Login"), a[href*="login"], .login-btn');
            
            if (loginButton) {
                await loginButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.takeScreenshot('02_login_page');
            } else {
                // Try to navigate directly to login
                await this.page.goto('http://localhost:3001/login', { 
                    waitUntil: 'networkidle2' 
                });
                await this.takeScreenshot('02_login_direct');
            }
            
            // Fill in test credentials
            const emailInput = await this.page.$('input[type="email"], input[name="email"], #email');
            const passwordInput = await this.page.$('input[type="password"], input[name="password"], #password');
            
            if (emailInput && passwordInput) {
                await emailInput.type('admin.test@bookedbarber.com');
                await passwordInput.type('TestPassword123!');
                
                await this.takeScreenshot('03_login_filled');
                
                // Submit form
                const submitButton = await this.page.$('button[type="submit"], .submit-btn, button:contains("Sign In")');
                if (submitButton) {
                    await submitButton.click();
                    
                    // Wait for navigation
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await this.takeScreenshot('04_post_login');
                    
                    return true;
                }
            }
            
            console.log('⚠️ Could not find login form elements');
            return false;
            
        } catch (error) {
            console.error(`❌ Login failed: ${error.message}`);
            await this.takeScreenshot('04_login_error');
            return false;
        }
    }

    async navigateToDashboard() {
        console.log('📊 Navigating to dashboard...');
        
        try {
            // Try multiple dashboard navigation methods
            const currentUrl = this.page.url();
            
            if (currentUrl.includes('/dashboard')) {
                console.log('✅ Already on dashboard');
            } else {
                // Try clicking dashboard link
                const dashboardLink = await this.page.$('a[href*="dashboard"], .dashboard-link, button:contains("Dashboard")');
                
                if (dashboardLink) {
                    await dashboardLink.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    // Navigate directly
                    await this.page.goto('http://localhost:3001/dashboard', { 
                        waitUntil: 'networkidle2' 
                    });
                }
            }
            
            await this.takeScreenshot('05_dashboard_initial');
            
            // Wait for dashboard components to load
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            await this.takeScreenshot('06_dashboard_loaded');
            
            return true;
            
        } catch (error) {
            console.error(`❌ Dashboard navigation failed: ${error.message}`);
            await this.takeScreenshot('06_dashboard_error');
            return false;
        }
    }

    async analyzeComponents() {
        console.log('🔍 Analyzing dashboard components...');
        
        try {
            // Check for loading states
            const loadingElements = await this.page.$$('.loading, [data-testid*="loading"], .spinner, .skeleton');
            console.log(`Found ${loadingElements.length} loading elements`);
            
            // Check for error messages
            const errorElements = await this.page.$$('.error, [data-testid*="error"], .alert-error, .text-red');
            console.log(`Found ${errorElements.length} error elements`);
            
            // Check for analytics components specifically
            const analyticsElements = await this.page.$$('[data-testid*="analytics"], .analytics, .six-figure, .dashboard-metric');
            console.log(`Found ${analyticsElements.length} analytics elements`);
            
            // Get detailed component information
            const componentInfo = await this.page.evaluate(() => {
                const info = {
                    loadingComponents: [],
                    errorComponents: [],
                    analyticsComponents: [],
                    reactErrors: []
                };
                
                // Find loading components
                document.querySelectorAll('.loading, [data-testid*="loading"]').forEach(el => {
                    info.loadingComponents.push({
                        tagName: el.tagName,
                        className: el.className,
                        textContent: el.textContent.substring(0, 100),
                        id: el.id
                    });
                });
                
                // Find error components
                document.querySelectorAll('.error, [data-testid*="error"], .alert-error').forEach(el => {
                    info.errorComponents.push({
                        tagName: el.tagName,
                        className: el.className,
                        textContent: el.textContent.substring(0, 200),
                        id: el.id
                    });
                });
                
                // Find analytics components
                document.querySelectorAll('[data-testid*="analytics"], .analytics, .six-figure').forEach(el => {
                    info.analyticsComponents.push({
                        tagName: el.tagName,
                        className: el.className,
                        textContent: el.textContent.substring(0, 100),
                        id: el.id
                    });
                });
                
                // Check for React error boundaries
                if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
                    try {
                        const reactFiber = document.querySelector('#__next')._reactInternalFiber;
                        // This is a simplified check - React errors would be in console already
                    } catch (e) {
                        info.reactErrors.push(e.message);
                    }
                }
                
                return info;
            });
            
            this.logs.componentAnalysis = componentInfo;
            
            await this.takeScreenshot('07_component_analysis');
            
            return componentInfo;
            
        } catch (error) {
            console.error(`❌ Component analysis failed: ${error.message}`);
            return null;
        }
    }

    async checkAPIResponses() {
        console.log('🔍 Checking API responses...');
        
        // Filter API requests and responses
        const apiRequests = this.logs.requests.filter(req => req.url.includes('/api/'));
        const apiResponses = this.logs.responses.filter(res => res.url.includes('/api/'));
        
        console.log(`Found ${apiRequests.length} API requests and ${apiResponses.length} API responses`);
        
        // Check for failed analytics requests
        const analyticsRequests = apiResponses.filter(res => 
            res.url.includes('/analytics') || res.url.includes('/six-figure')
        );
        
        console.log(`Found ${analyticsRequests.length} analytics-related requests`);
        
        // Try to capture response bodies for failed requests
        for (const response of apiResponses) {
            if (response.status >= 400) {
                try {
                    const responseBody = await this.page.evaluate(async (url) => {
                        const response = await fetch(url);
                        return await response.text();
                    }, response.url);
                    
                    response.body = responseBody;
                } catch (error) {
                    console.log(`Could not capture response body for ${response.url}`);
                }
            }
        }
        
        return {
            apiRequests,
            apiResponses,
            analyticsRequests
        };
    }

    async generateReport() {
        console.log('📝 Generating comprehensive report...');
        
        const apiData = await this.checkAPIResponses();
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalConsoleMessages: this.logs.console.length,
                totalErrors: this.logs.errors.length,
                totalRequests: this.logs.requests.length,
                totalResponses: this.logs.responses.length,
                totalScreenshots: this.logs.screenshots.length
            },
            console: this.logs.console,
            errors: this.logs.errors,
            requests: this.logs.requests,
            responses: this.logs.responses,
            screenshots: this.logs.screenshots,
            componentAnalysis: this.logs.componentAnalysis || {},
            apiAnalysis: apiData
        };
        
        // Save report to file
        const reportFilename = `dashboard_analysis_${this.timestamp}.json`;
        const reportPath = path.join(__dirname, 'crawler_reports', reportFilename);
        
        // Ensure directory exists
        const dir = path.dirname(reportPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`📄 Full report saved to: ${reportPath}`);
        
        // Generate summary
        const summary = this.generateSummary(report);
        const summaryPath = path.join(__dirname, 'crawler_reports', `summary_${this.timestamp}.md`);
        fs.writeFileSync(summaryPath, summary);
        
        console.log(`📋 Summary report saved to: ${summaryPath}`);
        
        return {
            fullReport: reportPath,
            summary: summaryPath,
            data: report
        };
    }

    generateSummary(report) {
        const errorsByType = {};
        report.errors.forEach(error => {
            const type = error.name || 'Unknown';
            errorsByType[type] = (errorsByType[type] || 0) + 1;
        });
        
        const failedRequests = report.responses.filter(res => res.status >= 400);
        
        return `# Dashboard Analytics Crawler Report
Generated: ${report.timestamp}

## Summary
- Console Messages: ${report.summary.totalConsoleMessages}
- JavaScript Errors: ${report.summary.totalErrors}
- API Requests: ${report.summary.totalRequests}
- API Responses: ${report.summary.totalResponses}
- Screenshots: ${report.summary.totalScreenshots}

## JavaScript Errors
${Object.entries(errorsByType).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

## Failed API Requests
${failedRequests.map(req => `- ${req.status} ${req.url}`).join('\n')}

## Top Console Errors
${report.console
    .filter(log => log.type === 'error')
    .slice(0, 10)
    .map(log => `- ${log.text}`)
    .join('\n')}

## Component Analysis
- Loading Components: ${report.componentAnalysis.loadingComponents?.length || 0}
- Error Components: ${report.componentAnalysis.errorComponents?.length || 0}
- Analytics Components: ${report.componentAnalysis.analyticsComponents?.length || 0}

## Recommendations
${this.generateRecommendations(report)}
`;
    }

    generateRecommendations(report) {
        const recommendations = [];
        
        if (report.errors.some(e => e.message.includes('undefined'))) {
            recommendations.push('- Fix undefined property access errors in React components');
        }
        
        if (report.responses.some(r => r.status === 404 && r.url.includes('/api/'))) {
            recommendations.push('- Check for missing API endpoints or routing issues');
        }
        
        if (report.console.some(l => l.text.includes('Warning'))) {
            recommendations.push('- Address React warnings for better performance');
        }
        
        if (report.componentAnalysis.loadingComponents?.length > 3) {
            recommendations.push('- Investigate slow-loading components');
        }
        
        return recommendations.length > 0 ? recommendations.join('\n') : '- No specific issues detected';
    }

    async run() {
        try {
            await this.init();
            
            // Step 1: Navigate to homepage
            const homepageLoaded = await this.navigateToHomepage();
            if (!homepageLoaded) {
                throw new Error('Failed to load homepage');
            }
            
            // Step 2: Attempt login
            const loginSuccessful = await this.attemptLogin();
            if (!loginSuccessful) {
                console.log('⚠️ Login failed, continuing to analyze public pages...');
            }
            
            // Step 3: Navigate to dashboard
            const dashboardLoaded = await this.navigateToDashboard();
            if (!dashboardLoaded) {
                throw new Error('Failed to load dashboard');
            }
            
            // Step 4: Analyze components
            await this.analyzeComponents();
            
            // Step 5: Generate report
            const reportData = await this.generateReport();
            
            console.log('✅ Crawler analysis complete!');
            console.log(`📁 Reports saved in: crawler_reports/`);
            
            return reportData;
            
        } catch (error) {
            console.error(`❌ Crawler failed: ${error.message}`);
            await this.takeScreenshot('error_final');
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run the crawler
async function main() {
    const crawler = new DashboardCrawler();
    
    try {
        const results = await crawler.run();
        console.log('🎉 Dashboard analysis completed successfully!');
        return results;
    } catch (error) {
        console.error('💥 Dashboard analysis failed:', error);
        process.exit(1);
    }
}

// Export for module use or run directly
if (require.main === module) {
    main();
}

module.exports = DashboardCrawler;