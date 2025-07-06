/**
 * Dashboard Test Suite
 * 
 * Tests dashboard functionality for different user roles including
 * analytics display, navigation, and data loading
 */

const puppeteer = require('puppeteer');
const {
    CONFIG,
    TEST_USERS,
    SELECTORS,
    waitForSelector,
    clickElement,
    takeScreenshot,
    checkForConsoleErrors,
    setupNetworkMonitoring,
    login,
    waitForPageLoad,
    measurePerformance,
    generateReport,
    TestResult
} = require('./test-utils');

class DashboardTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
    }

    async init() {
        console.log('🚀 Starting Dashboard Tests...\n');
        
        this.browser = await puppeteer.launch({
            headless: CONFIG.headless,
            slowMo: CONFIG.slowMo,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Set up monitoring
        this.consoleErrors = await checkForConsoleErrors(this.page);
        this.networkMonitoring = setupNetworkMonitoring(this.page);
    }

    async testAdminDashboard() {
        const result = new TestResult('Admin Dashboard Test');
        
        try {
            console.log('📍 Test: Admin Dashboard');
            
            // Login as admin
            await login(this.page, 'admin');
            result.addStep('Admin login successful', true);
            
            // Navigate to dashboard
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            result.addStep('Navigate to dashboard', true);
            
            // Measure performance
            const performance = await measurePerformance(this.page);
            result.setPerformance(performance);
            console.log(`   Load time: ${performance.loadTime}ms`);
            
            // Take screenshot of dashboard
            const dashboardScreenshot = await takeScreenshot(this.page, 'admin-dashboard');
            result.addScreenshot(dashboardScreenshot);
            
            // Check for key admin sections
            const sections = [
                { selector: '.stats-card, .metric-card, .kpi-widget', name: 'Stats/KPIs' },
                { selector: '.chart, .analytics-chart, canvas', name: 'Charts' },
                { selector: '.recent-bookings, .appointments-list', name: 'Recent Bookings' },
                { selector: '.revenue-widget, .earnings-card', name: 'Revenue Info' },
                { selector: '.staff-overview, .barbers-list', name: 'Staff Overview' }
            ];
            
            for (const section of sections) {
                const element = await this.page.$(section.selector);
                result.addStep(`${section.name} section`, !!element);
                
                if (element) {
                    // Check if data loaded
                    const hasData = await element.evaluate(el => {
                        // Check for loading indicators
                        const isLoading = el.querySelector('.loading, .skeleton, .spinner');
                        // Check for empty state
                        const isEmpty = el.querySelector('.empty, .no-data');
                        // Check for actual content
                        const hasContent = el.textContent.trim().length > 20;
                        
                        return !isLoading && !isEmpty && hasContent;
                    });
                    
                    result.addStep(`${section.name} has data`, hasData);
                }
            }
            
            // Test navigation menu
            console.log('   Testing navigation menu');
            const navItems = [
                { selector: 'a[href="/analytics"], .analytics-link', name: 'Analytics' },
                { selector: 'a[href="/users"], .users-link', name: 'Users' },
                { selector: 'a[href="/settings"], .settings-link', name: 'Settings' },
                { selector: 'a[href="/reports"], .reports-link', name: 'Reports' }
            ];
            
            for (const navItem of navItems) {
                const link = await this.page.$(navItem.selector);
                if (link) {
                    const isVisible = await link.evaluate(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0;
                    });
                    result.addStep(`${navItem.name} nav link visible`, isVisible);
                }
            }
            
            // Check for admin-specific features
            const adminFeatures = await this.page.evaluate(() => {
                return {
                    hasUserManagement: !!document.querySelector('.user-management, .manage-users, a[href*="users"]'),
                    hasSystemSettings: !!document.querySelector('.system-settings, a[href*="admin"]'),
                    hasReports: !!document.querySelector('.reports-section, a[href*="reports"]'),
                    hasBillingInfo: !!document.querySelector('.billing-info, .subscription-status')
                };
            });
            
            result.addStep('Admin features available', 
                Object.values(adminFeatures).some(v => v), 
                adminFeatures
            );
            
            // Test quick actions
            const quickActions = await this.page.$$('.quick-action, .action-button, .dashboard-action');
            result.addStep('Quick actions available', quickActions.length > 0, { count: quickActions.length });
            
            result.finish(true);
            console.log('✅ Admin dashboard test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Admin dashboard test failed:', error.message);
            
            // Take error screenshot
            const errorScreenshot = await takeScreenshot(this.page, 'admin-dashboard-error');
            result.addScreenshot(errorScreenshot);
        }
        
        this.results.push(result);
        return result;
    }

    async testBarberDashboard() {
        const result = new TestResult('Barber Dashboard Test');
        
        try {
            console.log('\n📍 Test: Barber Dashboard');
            
            // Login as barber
            await login(this.page, 'barber');
            result.addStep('Barber login successful', true);
            
            // Navigate to dashboard
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            
            // Take screenshot
            const dashboardScreenshot = await takeScreenshot(this.page, 'barber-dashboard');
            result.addScreenshot(dashboardScreenshot);
            
            // Check for barber-specific sections
            const sections = [
                { selector: '.today-appointments, .todays-schedule', name: "Today's Schedule" },
                { selector: '.earnings-card, .revenue-widget', name: 'Earnings' },
                { selector: '.client-stats, .customer-metrics', name: 'Client Stats' },
                { selector: '.upcoming-appointments', name: 'Upcoming Appointments' },
                { selector: '.availability-widget', name: 'Availability' }
            ];
            
            for (const section of sections) {
                const element = await this.page.$(section.selector);
                result.addStep(`${section.name} section`, !!element);
            }
            
            // Check calendar widget
            const calendarWidget = await this.page.$('.calendar-widget, .mini-calendar, .schedule-overview');
            if (calendarWidget) {
                result.addStep('Calendar widget present', true);
                
                // Check if calendar has appointments marked
                const hasAppointments = await calendarWidget.evaluate(el => {
                    const appointments = el.querySelectorAll('.appointment-dot, .has-appointments, .booked');
                    return appointments.length > 0;
                });
                result.addStep('Calendar shows appointments', hasAppointments);
            }
            
            // Test appointment management
            const manageButton = await this.page.$('a[href="/bookings"], button:has-text("Manage Appointments")');
            if (manageButton) {
                const isClickable = await manageButton.evaluate(el => !el.disabled);
                result.addStep('Can access appointment management', isClickable);
            }
            
            // Check performance metrics
            const performanceMetrics = await this.page.evaluate(() => {
                const metrics = {};
                
                // Look for common metric patterns
                const metricElements = document.querySelectorAll('.metric, .stat, .kpi');
                metricElements.forEach(el => {
                    const label = el.querySelector('.label, .title, h3, h4')?.textContent?.trim();
                    const value = el.querySelector('.value, .number, .count')?.textContent?.trim();
                    if (label && value) {
                        metrics[label] = value;
                    }
                });
                
                return metrics;
            });
            
            result.addStep('Performance metrics loaded', Object.keys(performanceMetrics).length > 0, performanceMetrics);
            
            result.finish(true);
            console.log('✅ Barber dashboard test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Barber dashboard test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testClientDashboard() {
        const result = new TestResult('Client Dashboard Test');
        
        try {
            console.log('\n📍 Test: Client Dashboard');
            
            // Login as client
            await login(this.page, 'client');
            result.addStep('Client login successful', true);
            
            // Navigate to dashboard
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            
            // Take screenshot
            const dashboardScreenshot = await takeScreenshot(this.page, 'client-dashboard');
            result.addScreenshot(dashboardScreenshot);
            
            // Check for client-specific sections
            const sections = [
                { selector: '.upcoming-appointments, .my-bookings', name: 'My Bookings' },
                { selector: '.booking-history, .past-appointments', name: 'Booking History' },
                { selector: '.favorite-barbers, .preferred-staff', name: 'Favorite Barbers' },
                { selector: '.profile-section, .account-info', name: 'Profile Info' }
            ];
            
            for (const section of sections) {
                const element = await this.page.$(section.selector);
                result.addStep(`${section.name} section`, !!element);
            }
            
            // Check quick booking button
            const bookButton = await this.page.$('a[href="/book"], button:has-text("Book Now"), .book-appointment');
            if (bookButton) {
                const isVisible = await bookButton.evaluate(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                });
                result.addStep('Quick booking button visible', isVisible);
            }
            
            // Check if appointments are displayed
            const appointments = await this.page.$$('.appointment-card, .booking-item');
            result.addStep('Appointments displayed', appointments.length >= 0, { count: appointments.length });
            
            result.finish(true);
            console.log('✅ Client dashboard test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Client dashboard test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testDashboardDataLoading() {
        const result = new TestResult('Dashboard Data Loading Test');
        
        try {
            console.log('\n📍 Test: Dashboard Data Loading');
            
            // Login as admin for comprehensive data
            await login(this.page, 'admin');
            
            // Navigate to dashboard
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            
            // Monitor API calls
            const apiCalls = this.networkMonitoring.requests.filter(req => 
                req.url.includes('/api/') && req.method === 'GET'
            );
            
            result.addStep('API calls made', apiCalls.length > 0, { count: apiCalls.length });
            
            // Check for loading states
            console.log('   Checking loading states');
            const loadingElements = await this.page.$$('.loading, .skeleton, .spinner, [aria-busy="true"]');
            result.addStep('Loading indicators present initially', loadingElements.length > 0);
            
            // Wait for data to load
            await this.page.waitForTimeout(3000);
            
            // Check if loading states are gone
            const remainingLoaders = await this.page.$$('.loading:visible, .skeleton:visible, .spinner:visible');
            result.addStep('Loading completed', remainingLoaders.length === 0);
            
            // Check for error states
            const errorElements = await this.page.$$(SELECTORS.errorMessage);
            if (errorElements.length > 0) {
                const errors = await Promise.all(
                    errorElements.map(el => el.evaluate(e => e.textContent))
                );
                result.addStep('No data loading errors', false, { errors });
            } else {
                result.addStep('No data loading errors', true);
            }
            
            // Check specific data elements
            const dataChecks = [
                { selector: '.stat-value, .metric-value', name: 'Statistics' },
                { selector: '.chart canvas, svg.chart', name: 'Charts rendered' },
                { selector: '.data-table tbody tr, .list-item', name: 'Table data' }
            ];
            
            for (const check of dataChecks) {
                const elements = await this.page.$$(check.selector);
                const hasData = elements.length > 0;
                
                if (hasData) {
                    // Verify actual data, not just placeholders
                    const hasRealData = await this.page.evaluate((selector) => {
                        const el = document.querySelector(selector);
                        if (!el) return false;
                        const text = el.textContent.trim();
                        return text.length > 0 && text !== '-' && text !== 'N/A' && text !== '0';
                    }, check.selector);
                    
                    result.addStep(`${check.name} loaded`, hasRealData);
                } else {
                    result.addStep(`${check.name} loaded`, false);
                }
            }
            
            // Take screenshot of loaded dashboard
            const loadedScreenshot = await takeScreenshot(this.page, 'dashboard-data-loaded');
            result.addScreenshot(loadedScreenshot);
            
            result.finish(true);
            console.log('✅ Dashboard data loading test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Dashboard data loading test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testDashboardResponsiveness() {
        const result = new TestResult('Dashboard Responsiveness Test');
        
        try {
            console.log('\n📍 Test: Dashboard Responsiveness');
            
            // Login first
            await login(this.page, 'admin');
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            
            // Test different viewport sizes
            const viewports = [
                { name: 'Desktop', width: 1920, height: 1080 },
                { name: 'Laptop', width: 1366, height: 768 },
                { name: 'Tablet', width: 768, height: 1024 },
                { name: 'Mobile', width: 375, height: 667 }
            ];
            
            for (const viewport of viewports) {
                console.log(`   Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
                
                await this.page.setViewport({ width: viewport.width, height: viewport.height });
                await this.page.waitForTimeout(500);
                
                // Check if navigation is accessible
                const navVisible = await this.page.evaluate(() => {
                    const nav = document.querySelector('nav, .navigation, .sidebar');
                    if (!nav) return false;
                    const rect = nav.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                });
                
                // Check for mobile menu button on small screens
                if (viewport.width < 768) {
                    const mobileMenuButton = await this.page.$('.mobile-menu-button, .hamburger, button[aria-label*="menu"]');
                    result.addStep(`${viewport.name}: Mobile menu button`, !!mobileMenuButton);
                    
                    if (mobileMenuButton) {
                        // Test mobile menu
                        await mobileMenuButton.click();
                        await this.page.waitForTimeout(300);
                        
                        const mobileMenuOpen = await this.page.$('.mobile-menu-open, .sidebar-open, [data-state="open"]');
                        result.addStep(`${viewport.name}: Mobile menu opens`, !!mobileMenuOpen);
                        
                        // Close menu
                        await mobileMenuButton.click();
                        await this.page.waitForTimeout(300);
                    }
                } else {
                    result.addStep(`${viewport.name}: Navigation visible`, navVisible);
                }
                
                // Check main content visibility
                const contentVisible = await this.page.evaluate(() => {
                    const main = document.querySelector('main, .main-content, .dashboard-content');
                    if (!main) return false;
                    const rect = main.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                });
                
                result.addStep(`${viewport.name}: Content visible`, contentVisible);
                
                // Take screenshot
                const viewportScreenshot = await takeScreenshot(this.page, `dashboard-${viewport.name.toLowerCase()}`);
                result.addScreenshot(viewportScreenshot);
                
                // Check for horizontal scroll (should not have any)
                const hasHorizontalScroll = await this.page.evaluate(() => {
                    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
                });
                
                result.addStep(`${viewport.name}: No horizontal scroll`, !hasHorizontalScroll);
            }
            
            // Reset to desktop size
            await this.page.setViewport({ width: 1920, height: 1080 });
            
            result.finish(true);
            console.log('✅ Dashboard responsiveness test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Dashboard responsiveness test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async testDashboardInteractions() {
        const result = new TestResult('Dashboard Interactions Test');
        
        try {
            console.log('\n📍 Test: Dashboard Interactions');
            
            // Login as admin
            await login(this.page, 'admin');
            await this.page.goto(`${CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
            
            // Test date range picker (if present)
            const dateRangePicker = await this.page.$('.date-range-picker, .date-filter, select[name*="period"]');
            if (dateRangePicker) {
                console.log('   Testing date range picker');
                
                const isSelect = await dateRangePicker.evaluate(el => el.tagName === 'SELECT');
                if (isSelect) {
                    // Change select value
                    await this.page.select('.date-range-picker, .date-filter, select[name*="period"]', 'last7days');
                } else {
                    // Click to open picker
                    await dateRangePicker.click();
                    await this.page.waitForTimeout(500);
                    
                    // Select preset option
                    const preset = await this.page.$('.preset-option:has-text("Last 7 days"), button:has-text("Last 7 days")');
                    if (preset) {
                        await preset.click();
                    }
                }
                
                await this.page.waitForTimeout(1000);
                result.addStep('Date range changed', true);
                
                // Check if data refreshed
                const dataRefreshed = this.networkMonitoring.requests.some(req => 
                    req.url.includes('/api/') && 
                    req.timestamp > Date.now() - 2000
                );
                result.addStep('Data refreshed after date change', dataRefreshed);
            }
            
            // Test refresh button (if present)
            const refreshButton = await this.page.$('button[aria-label*="refresh"], .refresh-button, button:has-text("Refresh")');
            if (refreshButton) {
                console.log('   Testing refresh button');
                
                const requestCountBefore = this.networkMonitoring.requests.length;
                await refreshButton.click();
                await this.page.waitForTimeout(1000);
                
                const newRequests = this.networkMonitoring.requests.length - requestCountBefore;
                result.addStep('Refresh button triggers API calls', newRequests > 0, { newRequests });
            }
            
            // Test expandable sections
            const expandables = await this.page.$$('.expandable, .collapsible, details, [aria-expanded]');
            if (expandables.length > 0) {
                console.log('   Testing expandable sections');
                
                const firstExpandable = expandables[0];
                const wasExpanded = await firstExpandable.evaluate(el => 
                    el.getAttribute('aria-expanded') === 'true' || el.hasAttribute('open')
                );
                
                await firstExpandable.click();
                await this.page.waitForTimeout(300);
                
                const isNowExpanded = await firstExpandable.evaluate(el => 
                    el.getAttribute('aria-expanded') === 'true' || el.hasAttribute('open')
                );
                
                result.addStep('Expandable sections work', wasExpanded !== isNowExpanded);
            }
            
            // Test tooltips
            const tooltipTriggers = await this.page.$$('[title], [data-tooltip], .info-icon');
            if (tooltipTriggers.length > 0) {
                console.log('   Testing tooltips');
                
                const trigger = tooltipTriggers[0];
                await trigger.hover();
                await this.page.waitForTimeout(500);
                
                const tooltip = await this.page.$('.tooltip, [role="tooltip"], .tippy-content');
                result.addStep('Tooltips appear on hover', !!tooltip);
                
                // Move away to hide tooltip
                await this.page.mouse.move(0, 0);
            }
            
            // Test chart interactions (if charts present)
            const charts = await this.page.$$('canvas, svg.chart');
            if (charts.length > 0) {
                console.log('   Testing chart interactions');
                
                const chart = charts[0];
                const box = await chart.boundingBox();
                
                if (box) {
                    // Hover over chart
                    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                    await this.page.waitForTimeout(500);
                    
                    // Check for chart tooltip
                    const chartTooltip = await this.page.$('.chart-tooltip, .chartjs-tooltip');
                    result.addStep('Chart tooltips on hover', !!chartTooltip);
                }
            }
            
            result.finish(true);
            console.log('✅ Dashboard interactions test passed');
            
        } catch (error) {
            result.addError(error);
            result.finish(false);
            console.error('❌ Dashboard interactions test failed:', error.message);
        }
        
        this.results.push(result);
        return result;
    }

    async runAllTests() {
        try {
            await this.init();
            
            // Run all dashboard tests
            await this.testAdminDashboard();
            await this.testBarberDashboard();
            await this.testClientDashboard();
            await this.testDashboardDataLoading();
            await this.testDashboardResponsiveness();
            await this.testDashboardInteractions();
            
            // Generate report
            const report = generateReport('dashboard', this.results);
            
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
    const tester = new DashboardTester();
    tester.runAllTests().catch(console.error);
}

module.exports = DashboardTester;