/**
 * End-to-End tests for complete Six Figure Barber methodology workflows.
 * Tests critical user journeys from initial discovery to long-term client relationships.
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import { 
  setupSixFigureBarberTestData,
  loginAsBarber,
  loginAsClient,
  createPremiumService,
  simulatePaymentSuccess
} from '../test-utils/six-figure-test-helpers';

test.describe('Six Figure Barber Complete Client Lifecycle', () => {
  let context: BrowserContext;
  let barberPage: Page;
  let clientPage: Page;
  let barberData: any;
  let clientData: any;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    barberPage = await context.newPage();
    clientPage = await context.newPage();
    
    // Setup test data
    const testData = await setupSixFigureBarberTestData();
    barberData = testData.barber;
    clientData = testData.client;
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Complete Six Figure Barber client discovery and onboarding journey', async () => {
    // Phase 1: Barber sets up Six Figure methodology services
    await loginAsBarber(barberPage, barberData);
    
    // Navigate to Six Figure Barber dashboard
    await barberPage.goto('/dashboard/six-figure-barber');
    await expect(barberPage.locator('[data-testid="six-figure-dashboard"]')).toBeVisible();
    
    // Set Six Figure revenue goal
    await barberPage.click('[data-testid="set-revenue-goal"]');
    await barberPage.fill('[data-testid="annual-target-input"]', '150000');
    await barberPage.click('[data-testid="save-goal"]');
    
    await expect(barberPage.locator('text="Goal set successfully"')).toBeVisible();
    
    // Create premium service aligned with Six Figure methodology
    await barberPage.goto('/services/new');
    await barberPage.fill('[data-testid="service-name"]', 'Executive Premium Experience');
    await barberPage.fill('[data-testid="service-price"]', '175');
    await barberPage.fill('[data-testid="service-duration"]', '90');
    await barberPage.check('[data-testid="six-figure-compliant"]');
    await barberPage.fill('[data-testid="service-description"]', 
      'Luxury grooming experience with premium consultation and styling');
    
    await barberPage.click('[data-testid="create-service"]');
    await expect(barberPage.locator('text="Service created successfully"')).toBeVisible();
    
    // Phase 2: Client discovery and first booking
    await loginAsClient(clientPage, clientData);
    
    // Search for Six Figure Barber services
    await clientPage.goto('/');
    await clientPage.fill('[data-testid="search-input"]', 'premium grooming');
    await clientPage.press('[data-testid="search-input"]', 'Enter');
    
    // Verify Six Figure services appear prominently
    await expect(clientPage.locator('[data-testid="six-figure-badge"]')).toBeVisible();
    await expect(clientPage.locator('text="Executive Premium Experience"')).toBeVisible();
    
    // Click on premium service
    await clientPage.click('[data-testid="service-card"]:has-text("Executive Premium Experience")');
    
    // Verify service details show Six Figure methodology benefits
    await expect(clientPage.locator('[data-testid="six-figure-benefits"]')).toBeVisible();
    await expect(clientPage.locator('text="Premium consultation"')).toBeVisible();
    await expect(clientPage.locator('text="$175"')).toBeVisible();
    
    // Book the service
    await clientPage.click('[data-testid="book-service"]');
    
    // Select date and time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    await clientPage.click(`[data-testid="date-${dateString}"]`);
    await clientPage.click('[data-testid="time-slot-1400"]'); // 2:00 PM
    
    // Fill consultation form (Six Figure methodology)
    await clientPage.fill('[data-testid="style-preferences"]', 
      'Looking for a sophisticated business look');
    await clientPage.fill('[data-testid="lifestyle-notes"]', 
      'Frequently travels for business, need low-maintenance styling');
    
    await clientPage.click('[data-testid="confirm-booking"]');
    
    // Process payment
    await simulatePaymentSuccess(clientPage, {
      amount: 175,
      tip: 35, // Premium tip amount
      paymentMethod: 'card'
    });
    
    await expect(clientPage.locator('text="Booking confirmed"')).toBeVisible();
    
    // Phase 3: Pre-appointment client value assessment
    // Switch back to barber view
    await barberPage.goto('/appointments/upcoming');
    
    // View client profile and assessment
    await barberPage.click('[data-testid="appointment-details"]');
    await barberPage.click('[data-testid="client-profile-tab"]');
    
    // Verify Six Figure client assessment tools
    await expect(barberPage.locator('[data-testid="client-value-score"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="lifestyle-analysis"]')).toBeVisible();
    
    // Add pre-service notes
    await barberPage.fill('[data-testid="pre-service-notes"]', 
      'New client, business professional, premium experience expected');
    await barberPage.click('[data-testid="save-notes"]');
    
    // Phase 4: Service delivery and real-time tracking
    // Simulate appointment start
    await barberPage.click('[data-testid="start-appointment"]');
    
    // Track service delivery metrics
    await barberPage.click('[data-testid="service-tracking-tab"]');
    await barberPage.fill('[data-testid="consultation-notes"]', 
      'Discussed professional image goals, recommended monthly maintenance');
    
    // Mark consultation phase complete
    await barberPage.click('[data-testid="consultation-complete"]');
    
    // Track service execution
    await barberPage.select('[data-testid="technique-used"]', 'scissor-over-comb');
    await barberPage.fill('[data-testid="products-used"]', 'Premium styling paste, texture spray');
    
    // Complete service
    await barberPage.click('[data-testid="service-complete"]');
    
    // Client satisfaction assessment
    await barberPage.select('[data-testid="client-satisfaction"]', '5');
    await barberPage.fill('[data-testid="service-notes"]', 
      'Excellent result, client very pleased with styling and consultation');
    
    await barberPage.click('[data-testid="complete-appointment"]');
    
    // Phase 5: Post-service client journey progression
    // Verify client journey advancement
    await barberPage.goto('/six-figure-barber/client-journey');
    await barberPage.fill('[data-testid="client-search"]', clientData.email);
    await barberPage.press('[data-testid="client-search"]', 'Enter');
    
    // Check client progression from DISCOVERY to TRIAL stage
    await expect(barberPage.locator('[data-testid="client-stage"]')).toHaveText('TRIAL');
    await expect(barberPage.locator('[data-testid="value-score"]')).toBeVisible();
    
    // Schedule follow-up touchpoint
    await barberPage.click('[data-testid="schedule-followup"]');
    await barberPage.select('[data-testid="followup-type"]', 'satisfaction-check');
    await barberPage.fill('[data-testid="followup-date"]', '3'); // 3 days
    await barberPage.click('[data-testid="schedule"]');
    
    await expect(barberPage.locator('text="Follow-up scheduled"')).toBeVisible();
  });

  test('Six Figure Barber revenue optimization workflow', async () => {
    await loginAsBarber(barberPage, barberData);
    
    // Navigate to revenue optimization dashboard
    await barberPage.goto('/six-figure-barber/revenue-optimization');
    
    // Verify key revenue metrics are displayed
    await expect(barberPage.locator('[data-testid="monthly-revenue"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="revenue-per-hour"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="goal-progress"]')).toBeVisible();
    
    // Test schedule optimization recommendations
    await barberPage.click('[data-testid="schedule-optimization-tab"]');
    
    // View current schedule utilization
    await expect(barberPage.locator('[data-testid="utilization-score"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="optimization-suggestions"]')).toBeVisible();
    
    // Apply optimization suggestion
    await barberPage.click('[data-testid="optimize-suggestion"]:first-child');
    await barberPage.click('[data-testid="apply-optimization"]');
    
    await expect(barberPage.locator('text="Schedule optimized"')).toBeVisible();
    
    // Test pricing optimization
    await barberPage.click('[data-testid="pricing-optimization-tab"]');
    
    // View service pricing analysis
    await expect(barberPage.locator('[data-testid="pricing-analysis"]')).toBeVisible();
    
    // Review premium service performance
    await barberPage.click('[data-testid="premium-services"]');
    await expect(barberPage.locator('[data-testid="premium-revenue-share"]')).toBeVisible();
    
    // Test upselling opportunity identification
    await barberPage.click('[data-testid="upselling-opportunities-tab"]');
    
    // Verify upselling recommendations
    await expect(barberPage.locator('[data-testid="upsell-recommendations"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="revenue-impact"]')).toBeVisible();
    
    // Configure automated upselling
    await barberPage.check('[data-testid="enable-auto-upselling"]');
    await barberPage.click('[data-testid="save-upselling-config"]');
    
    await expect(barberPage.locator('text="Upselling configured"')).toBeVisible();
  });

  test('Client value management and retention workflow', async () => {
    await loginAsBarber(barberPage, barberData);
    
    // Navigate to client value management
    await barberPage.goto('/six-figure-barber/client-value-management');
    
    // View client value dashboard
    await expect(barberPage.locator('[data-testid="client-value-dashboard"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="total-client-value"]')).toBeVisible();
    
    // Filter high-value clients
    await barberPage.click('[data-testid="filter-high-value"]');
    
    // Verify high-value client list
    await expect(barberPage.locator('[data-testid="high-value-clients"]')).toBeVisible();
    
    // Select a client for detailed analysis
    await barberPage.click('[data-testid="client-item"]:first-child');
    
    // View detailed client profile
    await expect(barberPage.locator('[data-testid="client-lifetime-value"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="retention-probability"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="value-tier"]')).toBeVisible();
    
    // Test retention strategy recommendations
    await barberPage.click('[data-testid="retention-strategies-tab"]');
    
    // Verify personalized retention strategies
    await expect(barberPage.locator('[data-testid="retention-plan"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="communication-schedule"]')).toBeVisible();
    
    // Implement retention action
    await barberPage.click('[data-testid="retention-action"]:first-child');
    await barberPage.click('[data-testid="execute-action"]');
    
    await expect(barberPage.locator('text="Retention action executed"')).toBeVisible();
    
    // Test client segmentation
    await barberPage.click('[data-testid="client-segmentation-tab"]');
    
    // Create custom client segment
    await barberPage.click('[data-testid="create-segment"]');
    await barberPage.fill('[data-testid="segment-name"]', 'VIP Executive Clients');
    await barberPage.fill('[data-testid="segment-criteria"]', 'value_score > 80 AND tier = PLATINUM');
    await barberPage.click('[data-testid="save-segment"]');
    
    await expect(barberPage.locator('text="Segment created"')).toBeVisible();
  });

  test('Professional growth tracking and Six Figure methodology compliance', async () => {
    await loginAsBarber(barberPage, barberData);
    
    // Navigate to professional growth dashboard
    await barberPage.goto('/six-figure-barber/professional-growth');
    
    // View growth metrics
    await expect(barberPage.locator('[data-testid="growth-dashboard"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="skill-scores"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="methodology-compliance"]')).toBeVisible();
    
    // Test skill assessment
    await barberPage.click('[data-testid="skill-assessment-tab"]');
    
    // Complete customer service skill assessment
    await barberPage.click('[data-testid="assess-customer-service"]');
    await barberPage.select('[data-testid="consultation-quality"]', '9');
    await barberPage.select('[data-testid="communication-effectiveness"]', '8');
    await barberPage.select('[data-testid="client-satisfaction"]', '9');
    
    await barberPage.click('[data-testid="submit-assessment"]');
    
    // Verify skill score update
    await expect(barberPage.locator('[data-testid="customer-service-score"]')).toBeVisible();
    
    // Test Six Figure methodology compliance tracking
    await barberPage.click('[data-testid="methodology-compliance-tab"]');
    
    // View compliance metrics
    await expect(barberPage.locator('[data-testid="compliance-score"]')).toBeVisible();
    await expect(barberPage.locator('[data-testid="compliance-areas"]')).toBeVisible();
    
    // Review improvement recommendations
    await barberPage.click('[data-testid="improvement-recommendations"]');
    await expect(barberPage.locator('[data-testid="recommendations-list"]')).toBeVisible();
    
    // Set professional development goal
    await barberPage.click('[data-testid="set-development-goal"]');
    await barberPage.fill('[data-testid="goal-description"]', 'Achieve 95% client satisfaction average');
    await barberPage.fill('[data-testid="target-date"]', '2024-12-31');
    await barberPage.click('[data-testid="save-goal"]');
    
    await expect(barberPage.locator('text="Development goal set"')).toBeVisible();
    
    // Test certification tracking
    await barberPage.click('[data-testid="certifications-tab"]');
    
    // Add completed certification
    await barberPage.click('[data-testid="add-certification"]');
    await barberPage.fill('[data-testid="certification-name"]', 'Advanced Six Figure Barber Methodology');
    await barberPage.fill('[data-testid="completion-date"]', '2024-01-15');
    await barberPage.fill('[data-testid="issuing-organization"]', 'Six Figure Barber Academy');
    
    await barberPage.click('[data-testid="save-certification"]');
    
    await expect(barberPage.locator('text="Certification added"')).toBeVisible();
  });
});

test.describe('Client Experience Journey Tests', () => {
  test('Premium client booking and service experience', async ({ page }) => {
    const clientData = await setupSixFigureBarberTestData();
    await loginAsClient(page, clientData.client);
    
    // Navigate to premium services
    await page.goto('/services?premium=true');
    
    // Verify premium service indicators
    await expect(page.locator('[data-testid="premium-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="six-figure-methodology"]')).toBeVisible();
    
    // Book premium service
    await page.click('[data-testid="book-premium-service"]');
    
    // Complete premium booking flow
    await page.fill('[data-testid="style-consultation"]', 
      'Executive look for board meetings and client presentations');
    await page.check('[data-testid="lifestyle-consultation"]');
    await page.check('[data-testid="product-recommendations"]');
    
    // Select premium time slot
    await page.click('[data-testid="premium-time-slot"]');
    
    // Add premium add-ons
    await page.check('[data-testid="scalp-treatment"]');
    await page.check('[data-testid="styling-tutorial"]');
    
    // Complete booking
    await page.click('[data-testid="confirm-premium-booking"]');
    
    // Verify premium booking confirmation
    await expect(page.locator('[data-testid="premium-confirmation"]')).toBeVisible();
    await expect(page.locator('text="Premium experience scheduled"')).toBeVisible();
    
    // Test pre-service preparation
    await page.click('[data-testid="pre-service-prep"]');
    await expect(page.locator('[data-testid="style-prep-guide"]')).toBeVisible();
    await expect(page.locator('[data-testid="consultation-questions"]')).toBeVisible();
  });

  test('Client loyalty and repeat booking journey', async ({ page }) => {
    const clientData = await setupSixFigureBarberTestData();
    await loginAsClient(page, clientData.client);
    
    // Simulate returning VIP client
    await page.goto('/dashboard');
    
    // Verify VIP client status
    await expect(page.locator('[data-testid="vip-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="loyalty-tier"]')).toHaveText('GOLD');
    
    // Use quick rebook feature
    await page.click('[data-testid="quick-rebook"]');
    
    // Verify previous service preferences are pre-filled
    await expect(page.locator('[data-testid="previous-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="preferred-barber"]')).toBeVisible();
    
    // Confirm repeat booking
    await page.click('[data-testid="confirm-repeat-booking"]');
    
    // Verify loyalty benefits applied
    await expect(page.locator('[data-testid="loyalty-discount"]')).toBeVisible();
    await expect(page.locator('[data-testid="priority-scheduling"]')).toBeVisible();
    
    // Test referral system
    await page.click('[data-testid="refer-friend"]');
    await page.fill('[data-testid="friend-email"]', 'friend@example.com');
    await page.fill('[data-testid="referral-message"]', 
      'You have to try this barber - amazing Six Figure experience!');
    
    await page.click('[data-testid="send-referral"]');
    
    await expect(page.locator('text="Referral sent"')).toBeVisible();
    await expect(page.locator('[data-testid="referral-reward"]')).toBeVisible();
  });
});

test.describe('Business Intelligence and Analytics Tests', () => {
  test('Real-time analytics dashboard functionality', async ({ page }) => {
    const barberData = await setupSixFigureBarberTestData();
    await loginAsBarber(page, barberData.barber);
    
    // Navigate to analytics dashboard
    await page.goto('/analytics/six-figure-barber');
    
    // Verify real-time metrics
    await expect(page.locator('[data-testid="real-time-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="live-client-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="satisfaction-meter"]')).toBeVisible();
    
    // Test data filtering
    await page.selectOption('[data-testid="time-period"]', '30days');
    await page.click('[data-testid="apply-filter"]');
    
    // Verify charts update
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="client-retention-chart"]')).toBeVisible();
    
    // Test export functionality
    await page.click('[data-testid="export-data"]');
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.click('[data-testid="download-export"]');
    
    // Verify download started
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/six-figure-analytics.*\.csv/);
    
    // Test goal tracking
    await page.click('[data-testid="goal-tracking-tab"]');
    
    // Verify goal progress visualization
    await expect(page.locator('[data-testid="annual-goal-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-targets"]')).toBeVisible();
    
    // Test predictive analytics
    await page.click('[data-testid="predictive-analytics-tab"]');
    
    // Verify forecasting
    await expect(page.locator('[data-testid="revenue-forecast"]')).toBeVisible();
    await expect(page.locator('[data-testid="client-growth-prediction"]')).toBeVisible();
  });

  test('Business efficiency optimization workflow', async ({ page }) => {
    const barberData = await setupSixFigureBarberTestData();
    await loginAsBarber(page, barberData.barber);
    
    // Navigate to efficiency dashboard
    await page.goto('/six-figure-barber/business-efficiency');
    
    // View efficiency metrics
    await expect(page.locator('[data-testid="efficiency-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="time-utilization"]')).toBeVisible();
    await expect(page.locator('[data-testid="resource-optimization"]')).toBeVisible();
    
    // Test schedule optimization
    await page.click('[data-testid="optimize-schedule"]');
    
    // Verify optimization suggestions
    await expect(page.locator('[data-testid="schedule-suggestions"]')).toBeVisible();
    
    // Apply optimization
    await page.click('[data-testid="apply-optimization"]');
    await page.click('[data-testid="confirm-changes"]');
    
    await expect(page.locator('text="Schedule optimized"')).toBeVisible();
    
    // Test resource management
    await page.click('[data-testid="resource-management-tab"]');
    
    // Track product usage
    await expect(page.locator('[data-testid="product-usage"]')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-optimization"]')).toBeVisible();
    
    // Set efficiency targets
    await page.click('[data-testid="set-efficiency-targets"]');
    await page.fill('[data-testid="utilization-target"]', '92');
    await page.fill('[data-testid="revenue-per-hour-target"]', '150');
    
    await page.click('[data-testid="save-targets"]');
    
    await expect(page.locator('text="Targets set successfully"')).toBeVisible();
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('Network failure handling during booking process', async ({ page }) => {
    const clientData = await setupSixFigureBarberTestData();
    await loginAsClient(page, clientData.client);
    
    // Start booking process
    await page.goto('/book/premium-service');
    
    // Fill booking form
    await page.fill('[data-testid="service-date"]', '2024-03-15');
    await page.fill('[data-testid="service-time"]', '14:00');
    
    // Simulate network failure during payment
    await page.route('**/api/v2/payments', route => route.abort());
    
    await page.click('[data-testid="complete-booking"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-payment"]')).toBeVisible();
    
    // Test retry mechanism
    await page.unroute('**/api/v2/payments');
    await page.click('[data-testid="retry-payment"]');
    
    // Verify successful retry
    await expect(page.locator('text="Payment processed"')).toBeVisible();
  });

  test('Handling of concurrent booking attempts', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const testData = await setupSixFigureBarberTestData();
    
    // Login two different clients
    await loginAsClient(page1, testData.client1);
    await loginAsClient(page2, testData.client2);
    
    // Both try to book the same time slot
    const bookingData = {
      service: 'premium-cut',
      date: '2024-03-20',
      time: '15:00'
    };
    
    // Navigate both to booking page
    await Promise.all([
      page1.goto('/book/premium-cut'),
      page2.goto('/book/premium-cut')
    ]);
    
    // Fill forms simultaneously
    await Promise.all([
      page1.fill('[data-testid="service-date"]', bookingData.date),
      page2.fill('[data-testid="service-date"]', bookingData.date)
    ]);
    
    await Promise.all([
      page1.fill('[data-testid="service-time"]', bookingData.time),
      page2.fill('[data-testid="service-time"]', bookingData.time)
    ]);
    
    // Submit both bookings simultaneously
    await Promise.all([
      page1.click('[data-testid="submit-booking"]'),
      page2.click('[data-testid="submit-booking"]')
    ]);
    
    // Verify one succeeds and one gets conflict error
    const results = await Promise.allSettled([
      page1.waitForSelector('text="Booking confirmed"'),
      page2.waitForSelector('text="Time slot no longer available"')
    ]);
    
    // One should succeed, one should fail
    expect(results.some(r => r.status === 'fulfilled')).toBeTruthy();
    expect(results.some(r => r.status === 'rejected')).toBeTruthy();
    
    await Promise.all([
      context1.close(),
      context2.close()
    ]);
  });
});

// Performance benchmarks
test.describe('Performance Benchmarks', () => {
  test('Dashboard loading performance', async ({ page }) => {
    const barberData = await setupSixFigureBarberTestData();
    await loginAsBarber(page, barberData.barber);
    
    // Measure dashboard load time
    const startTime = Date.now();
    await page.goto('/dashboard/six-figure-barber');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');
    const loadTime = Date.now() - startTime;
    
    // Should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
    
    // Verify all critical components loaded
    await expect(page.locator('[data-testid="revenue-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="client-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="goal-progress"]')).toBeVisible();
  });

  test('Analytics query performance', async ({ page }) => {
    const barberData = await setupSixFigureBarberTestData();
    await loginAsBarber(page, barberData.barber);
    
    await page.goto('/analytics/six-figure-barber');
    
    // Test complex analytics query performance
    const queryStartTime = Date.now();
    await page.selectOption('[data-testid="date-range"]', '1year');
    await page.click('[data-testid="generate-report"]');
    await page.waitForSelector('[data-testid="analytics-complete"]');
    const queryTime = Date.now() - queryStartTime;
    
    // Complex queries should complete within 5 seconds
    expect(queryTime).toBeLessThan(5000);
  });
});