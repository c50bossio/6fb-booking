const { test, expect } = require('@playwright/test');

// Frontend Performance Testing for BookedBarber V2
// Tests Six Figure Barber dashboard and CRM interface under load

test.describe('BookedBarber V2 Frontend Performance', () => {
  const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'loadtest@bookedbarber.com';
  const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'LoadTest2024!';
  
  let performanceMetrics = {
    pageLoadTimes: [],
    interactionTimes: [],
    errorCounts: 0,
    memoryUsage: [],
    networkRequests: []
  };

  test.beforeEach(async ({ page }) => {
    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        performanceMetrics.errorCounts++;
        console.error('Frontend Error:', msg.text());
      }
    });

    // Monitor network requests
    page.on('response', (response) => {
      performanceMetrics.networkRequests.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing()
      });
    });

    // Monitor memory usage (if available)
    page.on('metrics', (metrics) => {
      if (metrics.JSHeapUsedSize) {
        performanceMetrics.memoryUsage.push(metrics.JSHeapUsedSize);
      }
    });
  });

  test('Six Figure Barber Dashboard Load Performance', async ({ page }) => {
    // Navigate to login page and measure load time
    const loginStart = Date.now();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const loginLoadTime = Date.now() - loginStart;
    performanceMetrics.pageLoadTimes.push({ page: 'login', time: loginLoadTime });

    // Perform login
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    const loginSubmitStart = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    const loginSubmitTime = Date.now() - loginSubmitStart;
    performanceMetrics.interactionTimes.push({ action: 'login', time: loginSubmitTime });

    // Navigate to Six Figure Barber dashboard and measure performance
    const dashboardStart = Date.now();
    await page.goto(`${BASE_URL}/six-figure-barber/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Wait for Six Figure Barber specific elements
    await page.waitForSelector('[data-testid="six-fb-overall-score"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="six-fb-revenue-optimization"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="six-fb-client-value"]', { timeout: 10000 });
    
    const dashboardLoadTime = Date.now() - dashboardStart;
    performanceMetrics.pageLoadTimes.push({ page: 'six-fb-dashboard', time: dashboardLoadTime });

    // Test dashboard interactivity
    const interactionStart = Date.now();
    
    // Test revenue metrics interaction
    if (await page.locator('[data-testid="revenue-metrics-card"]').isVisible()) {
      await page.click('[data-testid="revenue-metrics-card"]');
      await page.waitForTimeout(1000); // Allow animation/loading
    }

    // Test client value tier interaction
    if (await page.locator('[data-testid="client-value-tiers"]').isVisible()) {
      await page.click('[data-testid="client-value-tiers"]');
      await page.waitForTimeout(1000);
    }

    const interactionTime = Date.now() - interactionStart;
    performanceMetrics.interactionTimes.push({ action: 'dashboard-interactions', time: interactionTime });

    // Performance assertions
    expect(dashboardLoadTime).toBeLessThan(5000); // Dashboard should load within 5 seconds
    expect(loginSubmitTime).toBeLessThan(3000); // Login should complete within 3 seconds
  });

  test('Six Figure Barber CRM Performance Under Load', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to CRM section
    const crmStart = Date.now();
    await page.goto(`${BASE_URL}/six-figure-barber/crm`);
    await page.waitForLoadState('networkidle');
    
    // Wait for CRM specific elements
    await page.waitForSelector('[data-testid="client-list"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="client-value-tiers-chart"]', { timeout: 10000 });
    
    const crmLoadTime = Date.now() - crmStart;
    performanceMetrics.pageLoadTimes.push({ page: 'six-fb-crm', time: crmLoadTime });

    // Test CRM search functionality performance
    const searchStart = Date.now();
    const searchInput = page.locator('[data-testid="client-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test client');
      await page.waitForTimeout(2000); // Allow search to complete
    }
    const searchTime = Date.now() - searchStart;
    performanceMetrics.interactionTimes.push({ action: 'client-search', time: searchTime });

    // Test client detail view performance
    const firstClient = page.locator('[data-testid="client-row"]').first();
    if (await firstClient.isVisible()) {
      const clientDetailStart = Date.now();
      await firstClient.click();
      await page.waitForSelector('[data-testid="client-detail-modal"]', { timeout: 10000 });
      const clientDetailTime = Date.now() - clientDetailStart;
      performanceMetrics.interactionTimes.push({ action: 'client-detail-view', time: clientDetailTime });
      
      // Close modal
      await page.click('[data-testid="close-modal"]');
    }

    // Performance assertions
    expect(crmLoadTime).toBeLessThan(6000); // CRM should load within 6 seconds
    expect(searchTime).toBeLessThan(2000); // Search should be responsive
  });

  test('Revenue Analytics Performance Testing', async ({ page }) => {
    // Login and navigate to revenue analytics
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    const analyticsStart = Date.now();
    await page.goto(`${BASE_URL}/six-figure-barber/revenue-analytics`);
    await page.waitForLoadState('networkidle');
    
    // Wait for analytics charts and data
    await page.waitForSelector('[data-testid="revenue-chart"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="goal-progress-chart"]', { timeout: 10000 });
    
    const analyticsLoadTime = Date.now() - analyticsStart;
    performanceMetrics.pageLoadTimes.push({ page: 'revenue-analytics', time: analyticsLoadTime });

    // Test date range picker performance
    const dateRangeStart = Date.now();
    if (await page.locator('[data-testid="date-range-picker"]').isVisible()) {
      await page.click('[data-testid="date-range-picker"]');
      await page.click('[data-testid="last-30-days"]');
      await page.waitForTimeout(3000); // Allow chart refresh
    }
    const dateRangeTime = Date.now() - dateRangeStart;
    performanceMetrics.interactionTimes.push({ action: 'date-range-change', time: dateRangeTime });

    // Test goal creation performance
    if (await page.locator('[data-testid="create-goal-button"]').isVisible()) {
      const goalCreationStart = Date.now();
      await page.click('[data-testid="create-goal-button"]');
      await page.waitForSelector('[data-testid="goal-creation-modal"]', { timeout: 5000 });
      
      // Fill goal form
      await page.fill('[data-testid="goal-name"]', 'Performance Test Goal');
      await page.fill('[data-testid="target-revenue"]', '150000');
      await page.click('[data-testid="save-goal"]');
      
      const goalCreationTime = Date.now() - goalCreationStart;
      performanceMetrics.interactionTimes.push({ action: 'goal-creation', time: goalCreationTime });
    }

    // Performance assertions
    expect(analyticsLoadTime).toBeLessThan(8000); // Analytics should load within 8 seconds
    expect(dateRangeTime).toBeLessThan(4000); // Date range changes should be responsive
  });

  test('Mobile Responsiveness Performance', async ({ page }) => {
    // Test mobile viewport performance
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    const mobileLoginStart = Date.now();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const mobileLoginTime = Date.now() - mobileLoginStart;
    performanceMetrics.pageLoadTimes.push({ page: 'mobile-login', time: mobileLoginTime });

    // Login on mobile
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Test mobile dashboard performance
    const mobileDashboardStart = Date.now();
    await page.goto(`${BASE_URL}/six-figure-barber/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="mobile-navigation"]', { timeout: 10000 });
    const mobileDashboardTime = Date.now() - mobileDashboardStart;
    performanceMetrics.pageLoadTimes.push({ page: 'mobile-dashboard', time: mobileDashboardTime });

    // Test mobile navigation performance
    const mobileNavStart = Date.now();
    await page.click('[data-testid="mobile-menu-toggle"]');
    await page.waitForSelector('[data-testid="mobile-menu"]', { timeout: 5000 });
    await page.click('[data-testid="mobile-crm-link"]');
    await page.waitForLoadState('networkidle');
    const mobileNavTime = Date.now() - mobileNavStart;
    performanceMetrics.interactionTimes.push({ action: 'mobile-navigation', time: mobileNavTime });

    // Performance assertions for mobile
    expect(mobileLoginTime).toBeLessThan(6000); // Mobile login should load within 6 seconds
    expect(mobileDashboardTime).toBeLessThan(8000); // Mobile dashboard within 8 seconds
    expect(mobileNavTime).toBeLessThan(3000); // Mobile navigation should be fast
  });

  test('Concurrent User Simulation', async ({ page, context }) => {
    // Simulate multiple concurrent operations
    const concurrentStart = Date.now();
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Open multiple tabs/pages to simulate concurrent usage
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);

    // Navigate different pages concurrently
    const concurrentOperations = [
      pages[0].goto(`${BASE_URL}/six-figure-barber/dashboard`),
      pages[1].goto(`${BASE_URL}/six-figure-barber/crm`),
      pages[2].goto(`${BASE_URL}/six-figure-barber/revenue-analytics`)
    ];

    await Promise.all(concurrentOperations);
    
    // Wait for all pages to load
    await Promise.all([
      pages[0].waitForLoadState('networkidle'),
      pages[1].waitForLoadState('networkidle'),
      pages[2].waitForLoadState('networkidle')
    ]);

    const concurrentTime = Date.now() - concurrentStart;
    performanceMetrics.interactionTimes.push({ action: 'concurrent-navigation', time: concurrentTime });

    // Close additional pages
    await Promise.all(pages.map(p => p.close()));

    // Performance assertion
    expect(concurrentTime).toBeLessThan(15000); // Concurrent operations within 15 seconds
  });

  test.afterEach(async ({ page }) => {
    // Collect final performance metrics
    const performanceTiming = await page.evaluate(() => {
      return JSON.stringify(window.performance.timing);
    });

    console.log('Performance Timing:', performanceTiming);
  });

  test.afterAll(async () => {
    // Generate performance report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        averagePageLoadTime: performanceMetrics.pageLoadTimes.reduce((sum, p) => sum + p.time, 0) / performanceMetrics.pageLoadTimes.length,
        averageInteractionTime: performanceMetrics.interactionTimes.reduce((sum, i) => sum + i.time, 0) / performanceMetrics.interactionTimes.length,
        totalErrors: performanceMetrics.errorCounts,
        networkRequestCount: performanceMetrics.networkRequests.length,
        averageMemoryUsage: performanceMetrics.memoryUsage.reduce((sum, m) => sum + m, 0) / performanceMetrics.memoryUsage.length
      },
      pageLoadTimes: performanceMetrics.pageLoadTimes,
      interactionTimes: performanceMetrics.interactionTimes,
      networkRequests: performanceMetrics.networkRequests.map(req => ({
        url: req.url,
        status: req.status,
        responseTime: req.timing.responseEnd - req.timing.requestStart
      })),
      recommendations: generatePerformanceRecommendations(performanceMetrics)
    };

    // Save report
    const fs = require('fs');
    const path = require('path');
    const resultsDir = path.join(__dirname, 'results');
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `frontend-performance-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Frontend performance report saved to: ${reportPath}`);
  });
});

function generatePerformanceRecommendations(metrics) {
  const recommendations = [];
  
  const avgPageLoad = metrics.pageLoadTimes.reduce((sum, p) => sum + p.time, 0) / metrics.pageLoadTimes.length;
  const avgInteraction = metrics.interactionTimes.reduce((sum, i) => sum + i.time, 0) / metrics.interactionTimes.length;
  
  if (avgPageLoad > 5000) {
    recommendations.push('🐌 SLOW PAGE LOADS: Consider optimizing bundle size and implementing code splitting');
  }
  
  if (avgInteraction > 2000) {
    recommendations.push('⚡ SLOW INTERACTIONS: Optimize React re-renders and implement better caching');
  }
  
  if (metrics.errorCounts > 0) {
    recommendations.push(`🚨 FRONTEND ERRORS: Fix ${metrics.errorCounts} console errors for better stability`);
  }
  
  const slowNetworkRequests = metrics.networkRequests.filter(req => {
    const responseTime = req.timing.responseEnd - req.timing.requestStart;
    return responseTime > 3000;
  });
  
  if (slowNetworkRequests.length > 0) {
    recommendations.push(`🌐 SLOW API CALLS: ${slowNetworkRequests.length} requests taking >3s - optimize backend or add loading states`);
  }
  
  const avgMemory = metrics.memoryUsage.reduce((sum, m) => sum + m, 0) / metrics.memoryUsage.length;
  if (avgMemory > 50 * 1024 * 1024) { // 50MB
    recommendations.push('💾 HIGH MEMORY USAGE: Consider implementing virtual scrolling and memory cleanup');
  }
  
  return recommendations;
}