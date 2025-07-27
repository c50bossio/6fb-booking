/**
 * Comprehensive E2E Tests for Six Figure Barber Methodology
 * 
 * This test suite covers complete workflows for the Six Figure Barber methodology,
 * ensuring that all critical business flows work end-to-end across the entire platform.
 * 
 * Coverage:
 * - Client lifecycle management and value tracking
 * - Revenue optimization and analytics workflows
 * - Service delivery excellence monitoring
 * - Professional growth tracking systems
 * - Multi-role user interactions
 * 
 * Target: 90%+ coverage of critical business paths
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { authHelpers } from '../utils/authHelpers';
import { testHelpers } from '../utils/testHelpers';
import { apiHelpers } from '../utils/apiHelpers';

// Test data for Six Figure Barber methodology
const testData = {
  barber: {
    email: 'sixfigure.barber@test.com',
    password: 'SecureBarber123!',
    name: 'Professional Six Figure Barber',
    role: 'barber',
    shopId: 'test-shop-001',
    sixFigureEnrolled: true,
    sixFigureTier: 'GROWTH',
    targetAnnualRevenue: 150000
  },
  client: {
    email: 'premium.client@test.com',
    password: 'ClientPass123!',
    name: 'Premium Test Client',
    phone: '+1234567890',
    tier: 'GOLD'
  },
  shopOwner: {
    email: 'shop.owner@test.com',
    password: 'OwnerPass123!',
    name: 'Test Shop Owner',
    role: 'shop_owner'
  },
  services: [
    {
      name: 'Premium Haircut',
      price: 95,
      duration: 60,
      category: 'haircut'
    },
    {
      name: 'Beard Styling',
      price: 45,
      duration: 30,
      category: 'beard'
    },
    {
      name: 'Hair Treatment',
      price: 75,
      duration: 45,
      category: 'treatment'
    }
  ]
};

test.describe('Six Figure Barber Methodology - Complete Workflows', () => {
  let context: BrowserContext;
  let barberPage: Page;
  let clientPage: Page;
  let shopOwnerPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Create separate contexts for different user roles
    context = await browser.newContext();
    barberPage = await context.newPage();
    clientPage = await context.newPage();
    shopOwnerPage = await context.newPage();

    // Setup test data
    await testHelpers.setupTestEnvironment();
    await testHelpers.createTestUsers(testData);
    await testHelpers.createTestServices(testData.services);
  });

  test.afterAll(async () => {
    await testHelpers.cleanupTestEnvironment();
    await context.close();
  });

  test.describe('Client Lifecycle Management and Value Tracking', () => {
    
    test('Complete client onboarding and lifecycle progression', async () => {
      // 1. Barber logs in and accesses Six Figure Barber dashboard
      await authHelpers.loginAsBarber(barberPage, testData.barber);
      await barberPage.goto('/dashboard/six-figure-barber');
      
      // Verify Six Figure Barber dashboard loads
      await expect(barberPage.locator('[data-testid="six-figure-dashboard"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="revenue-metrics"]')).toBeVisible();
      
      // 2. Client registration and first booking
      await authHelpers.registerClient(clientPage, testData.client);
      await clientPage.goto('/book');
      
      // Select barber and service
      await clientPage.click('[data-testid="barber-select"]');
      await clientPage.click(`[data-testid="barber-${testData.barber.email}"]`);
      await clientPage.click('[data-testid="service-premium-haircut"]');
      
      // Select time slot
      await clientPage.click('[data-testid="calendar-next-week"]');
      await clientPage.click('[data-testid="time-slot-available"]:first-child');
      
      // Complete booking
      await clientPage.fill('[data-testid="client-notes"]', 'First time client interested in premium services');
      await clientPage.click('[data-testid="confirm-booking"]');
      
      // Verify booking confirmation
      await expect(clientPage.locator('[data-testid="booking-confirmation"]')).toBeVisible();
      
      // 3. Barber tracks new client in CRM
      await barberPage.goto('/dashboard/clients');
      await barberPage.click('[data-testid="new-client-notification"]');
      
      // Set client value tier and notes
      await barberPage.click('[data-testid="client-tier-select"]');
      await barberPage.click('[data-testid="tier-silver"]');
      await barberPage.fill('[data-testid="client-notes"]', 'New client with high potential');
      await barberPage.click('[data-testid="save-client-profile"]');
      
      // 4. Complete service and track satisfaction
      await barberPage.goto('/dashboard/appointments');
      await barberPage.click(`[data-testid="appointment-${testData.client.email}"]`);
      await barberPage.click('[data-testid="start-service"]');
      
      // Mark service as completed
      await barberPage.click('[data-testid="complete-service"]');
      await barberPage.fill('[data-testid="service-notes"]', 'Excellent service delivery, client very satisfied');
      await barberPage.click('[data-testid="request-client-feedback"]');
      
      // 5. Client provides feedback
      await clientPage.goto('/feedback/latest');
      await clientPage.click('[data-testid="rating-5-stars"]');
      await clientPage.fill('[data-testid="feedback-text"]', 'Amazing haircut, will definitely book again!');
      await clientPage.click('[data-testid="submit-feedback"]');
      
      // 6. Verify client value score calculation
      await barberPage.goto('/dashboard/six-figure-barber/clients');
      await expect(barberPage.locator(`[data-testid="client-${testData.client.email}"]`)).toBeVisible();
      
      const clientValueScore = await barberPage.locator(`[data-testid="client-value-score-${testData.client.email}"]`);
      await expect(clientValueScore).toBeVisible();
      
      // Value score should be calculated based on satisfaction and potential
      const scoreText = await clientValueScore.textContent();
      expect(parseInt(scoreText || '0')).toBeGreaterThan(70);
      
      // 7. Track client progression to REGULAR stage
      await testHelpers.simulateTimePassage(30); // 30 days later
      await testHelpers.createAdditionalBookings(testData.client, 2);
      
      await barberPage.reload();
      const clientTier = await barberPage.locator(`[data-testid="client-tier-${testData.client.email}"]`);
      await expect(clientTier).toContainText('GOLD');
    });

    test('Client retention and loyalty program progression', async () => {
      // Test client retention tracking and loyalty program advancement
      await authHelpers.loginAsBarber(barberPage, testData.barber);
      await barberPage.goto('/dashboard/six-figure-barber/retention');
      
      // Verify retention dashboard
      await expect(barberPage.locator('[data-testid="retention-metrics"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="at-risk-clients"]')).toBeVisible();
      
      // Create at-risk client scenario
      await testHelpers.createAtRiskClient();
      await barberPage.reload();
      
      // Verify at-risk client appears
      await expect(barberPage.locator('[data-testid="at-risk-client-alert"]')).toBeVisible();
      
      // Execute retention action plan
      await barberPage.click('[data-testid="retention-action-plan"]');
      await barberPage.click('[data-testid="send-personal-message"]');
      await barberPage.fill('[data-testid="retention-message"]', 'We miss you! Special offer just for you.');
      await barberPage.click('[data-testid="send-retention-message"]');
      
      // Verify retention action is tracked
      await expect(barberPage.locator('[data-testid="retention-action-logged"]')).toBeVisible();
    });

  });

  test.describe('Revenue Optimization and Analytics Workflows', () => {
    
    test('Complete revenue tracking and optimization workflow', async () => {
      await authHelpers.loginAsBarber(barberPage, testData.barber);
      await barberPage.goto('/dashboard/six-figure-barber/revenue');
      
      // 1. Verify revenue dashboard loads with current metrics
      await expect(barberPage.locator('[data-testid="revenue-dashboard"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="monthly-revenue"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="revenue-per-hour"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="six-figure-progress"]')).toBeVisible();
      
      // 2. Set Six Figure Barber goals
      await barberPage.click('[data-testid="set-revenue-goal"]');
      await barberPage.fill('[data-testid="annual-target"]', '150000');
      await barberPage.fill('[data-testid="monthly-target"]', '12500');
      await barberPage.click('[data-testid="save-goal"]');
      
      // Verify goal is set and progress tracking begins
      await expect(barberPage.locator('[data-testid="goal-progress-bar"]')).toBeVisible();
      
      // 3. Analyze service pricing optimization
      await barberPage.click('[data-testid="pricing-optimization"]');
      await expect(barberPage.locator('[data-testid="pricing-recommendations"]')).toBeVisible();
      
      // Review pricing suggestions
      const pricingRecommendation = barberPage.locator('[data-testid="premium-haircut-recommendation"]');
      await expect(pricingRecommendation).toBeVisible();
      
      // Apply pricing optimization
      await barberPage.click('[data-testid="apply-pricing-recommendation"]');
      await barberPage.click('[data-testid="confirm-price-change"]');
      
      // 4. Schedule optimization analysis
      await barberPage.goto('/dashboard/six-figure-barber/schedule');
      await expect(barberPage.locator('[data-testid="schedule-optimization"]')).toBeVisible();
      
      // View optimal schedule density recommendations
      await barberPage.click('[data-testid="view-schedule-analysis"]');
      await expect(barberPage.locator('[data-testid="optimal-appointments-per-day"]')).toBeVisible();
      
      // 5. Upselling opportunity identification
      await barberPage.goto('/dashboard/six-figure-barber/upselling');
      await expect(barberPage.locator('[data-testid="upselling-opportunities"]')).toBeVisible();
      
      // Review client-specific upselling suggestions
      const upsellingSuggestion = barberPage.locator('[data-testid="upselling-suggestion"]:first-child');
      await expect(upsellingSuggestion).toBeVisible();
      
      // Create upselling campaign
      await barberPage.click('[data-testid="create-upsell-campaign"]');
      await barberPage.fill('[data-testid="campaign-message"]', 'Try our new premium hair treatment!');
      await barberPage.click('[data-testid="launch-campaign"]');
      
      // 6. Verify revenue impact tracking
      await testHelpers.simulateRevenueIncrease(500);
      await barberPage.goto('/dashboard/six-figure-barber/revenue');
      
      const revenueIncrease = barberPage.locator('[data-testid="monthly-revenue-increase"]');
      await expect(revenueIncrease).toBeVisible();
    });

    test('Advanced analytics and business intelligence', async () => {
      await authHelpers.loginAsBarber(barberPage, testData.barber);
      await barberPage.goto('/dashboard/six-figure-barber/analytics');
      
      // 1. Verify advanced analytics dashboard
      await expect(barberPage.locator('[data-testid="advanced-analytics"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="predictive-analytics"]')).toBeVisible();
      
      // 2. Test revenue forecasting
      await barberPage.click('[data-testid="revenue-forecasting"]');
      await expect(barberPage.locator('[data-testid="6-month-forecast"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="12-month-forecast"]')).toBeVisible();
      
      // 3. Client lifetime value analysis
      await barberPage.click('[data-testid="client-ltv-analysis"]');
      await expect(barberPage.locator('[data-testid="average-ltv"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="ltv-by-tier"]')).toBeVisible();
      
      // 4. Business efficiency metrics
      await barberPage.click('[data-testid="efficiency-metrics"]');
      await expect(barberPage.locator('[data-testid="time-utilization"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="revenue-per-hour-trend"]')).toBeVisible();
      
      // 5. Export analytics report
      await barberPage.click('[data-testid="export-analytics"]');
      await barberPage.click('[data-testid="export-pdf"]');
      
      // Verify download initiated
      const downloadPromise = barberPage.waitForEvent('download');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('six-figure-analytics');
    });

  });

  test.describe('Service Delivery Excellence Monitoring', () => {
    
    test('Complete service excellence tracking workflow', async () => {
      await authHelpers.loginAsBarber(barberPage, testData.barber);
      await barberPage.goto('/dashboard/six-figure-barber/excellence');
      
      // 1. Verify service excellence dashboard
      await expect(barberPage.locator('[data-testid="excellence-dashboard"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="excellence-score"]')).toBeVisible();
      
      // 2. Track service delivery metrics
      const excellenceScore = await barberPage.locator('[data-testid="current-excellence-score"]');
      await expect(excellenceScore).toBeVisible();
      
      // Score should be calculated from multiple factors
      const scoreValue = await excellenceScore.textContent();
      expect(parseFloat(scoreValue || '0')).toBeGreaterThan(80);
      
      // 3. Monitor punctuality tracking
      await expect(barberPage.locator('[data-testid="on-time-percentage"]')).toBeVisible();
      
      // 4. Track client satisfaction trends
      await barberPage.click('[data-testid="satisfaction-trends"]');
      await expect(barberPage.locator('[data-testid="satisfaction-chart"]')).toBeVisible();
      
      // 5. Review improvement recommendations
      await barberPage.click('[data-testid="improvement-recommendations"]');
      await expect(barberPage.locator('[data-testid="recommendation-list"]')).toBeVisible();
      
      // Implement improvement action
      await barberPage.click('[data-testid="implement-recommendation"]:first-child');
      await barberPage.click('[data-testid="confirm-improvement-action"]');
    });

    test('Quality assurance and compliance tracking', async () => {
      await authHelpers.loginAsBarber(barberPage, testData.barber);
      await barberPage.goto('/dashboard/six-figure-barber/quality');
      
      // 1. Verify quality metrics dashboard
      await expect(barberPage.locator('[data-testid="quality-metrics"]')).toBeVisible();
      
      // 2. Track compliance with Six Figure standards
      await expect(barberPage.locator('[data-testid="compliance-score"]')).toBeVisible();
      
      // 3. Monitor rebooking rates
      await expect(barberPage.locator('[data-testid="rebooking-rate"]')).toBeVisible();
      
      // 4. Track referral generation
      await expect(barberPage.locator('[data-testid="referral-rate"]')).toBeVisible();
    });

  });

  test.describe('Professional Growth Tracking Systems', () => {
    
    test('Complete professional development workflow', async () => {
      await authHelpers.loginAsBarber(barberPage, testData.barber);
      await barberPage.goto('/dashboard/six-figure-barber/growth');
      
      // 1. Verify professional growth dashboard
      await expect(barberPage.locator('[data-testid="growth-dashboard"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="skill-progression"]')).toBeVisible();
      
      // 2. Set professional development goals
      await barberPage.click('[data-testid="set-growth-goals"]');
      await barberPage.fill('[data-testid="skill-goal"]', 'Master advanced beard styling techniques');
      await barberPage.click('[data-testid="add-goal"]');
      
      // 3. Track certification progress
      await barberPage.click('[data-testid="certifications"]');
      await expect(barberPage.locator('[data-testid="certification-progress"]')).toBeVisible();
      
      // 4. Monitor brand development
      await barberPage.click('[data-testid="brand-development"]');
      await expect(barberPage.locator('[data-testid="brand-metrics"]')).toBeVisible();
      
      // 5. Track business expansion opportunities
      await barberPage.click('[data-testid="expansion-opportunities"]');
      await expect(barberPage.locator('[data-testid="growth-recommendations"]')).toBeVisible();
    });

  });

  test.describe('Multi-Role User Interactions', () => {
    
    test('Complete multi-stakeholder workflow', async () => {
      // 1. Shop owner sets up Six Figure Barber program
      await authHelpers.loginAsShopOwner(shopOwnerPage, testData.shopOwner);
      await shopOwnerPage.goto('/dashboard/admin/six-figure-program');
      
      // Enable Six Figure Barber program for shop
      await shopOwnerPage.click('[data-testid="enable-six-figure-program"]');
      await shopOwnerPage.fill('[data-testid="program-budget"]', '10000');
      await shopOwnerPage.click('[data-testid="save-program-settings"]');
      
      // 2. Enroll barber in program
      await shopOwnerPage.click('[data-testid="enroll-barber"]');
      await shopOwnerPage.click(`[data-testid="barber-${testData.barber.email}"]`);
      await shopOwnerPage.click('[data-testid="confirm-enrollment"]');
      
      // 3. Barber accesses enhanced features
      await authHelpers.loginAsBarber(barberPage, testData.barber);
      await barberPage.goto('/dashboard/six-figure-barber');
      
      // Verify enhanced features are available
      await expect(barberPage.locator('[data-testid="advanced-analytics"]')).toBeVisible();
      await expect(barberPage.locator('[data-testid="premium-tools"]')).toBeVisible();
      
      // 4. Client books premium service
      await authHelpers.loginAsClient(clientPage, testData.client);
      await clientPage.goto('/book');
      
      // Select Six Figure enrolled barber
      await clientPage.click('[data-testid="six-figure-barber-badge"]');
      await clientPage.click('[data-testid="book-premium-service"]');
      
      // 5. Shop owner monitors program ROI
      await shopOwnerPage.goto('/dashboard/admin/six-figure-analytics');
      await expect(shopOwnerPage.locator('[data-testid="program-roi"]')).toBeVisible();
      await expect(shopOwnerPage.locator('[data-testid="revenue-increase"]')).toBeVisible();
    });

  });

  test.describe('Integration and Data Flow Tests', () => {
    
    test('End-to-end data consistency across all Six Figure features', async () => {
      // Test that data flows correctly between all Six Figure Barber components
      
      // 1. Create appointment and verify data propagation
      await testHelpers.createTestAppointment(testData.barber, testData.client);
      
      // 2. Check revenue tracking
      await authHelpers.loginAsBarber(barberPage, testData.barber);
      await barberPage.goto('/dashboard/six-figure-barber/revenue');
      
      // Verify appointment revenue is tracked
      await expect(barberPage.locator('[data-testid="recent-revenue"]')).toContainText('95'); // Premium haircut price
      
      // 3. Check client value calculation
      await barberPage.goto('/dashboard/six-figure-barber/clients');
      const clientValue = barberPage.locator(`[data-testid="client-total-value-${testData.client.email}"]`);
      await expect(clientValue).toBeVisible();
      
      // 4. Check analytics aggregation
      await barberPage.goto('/dashboard/six-figure-barber/analytics');
      await expect(barberPage.locator('[data-testid="total-clients"]')).toContainText('1');
      
      // 5. Verify goal progress update
      await barberPage.goto('/dashboard/six-figure-barber/goals');
      const goalProgress = barberPage.locator('[data-testid="annual-goal-progress"]');
      await expect(goalProgress).toBeVisible();
    });

  });

  test.describe('Error Handling and Edge Cases', () => {
    
    test('Graceful handling of edge cases and errors', async () => {
      await authHelpers.loginAsBarber(barberPage, testData.barber);
      
      // 1. Test with no data scenarios
      await barberPage.goto('/dashboard/six-figure-barber/revenue');
      await testHelpers.clearAllData();
      await barberPage.reload();
      
      // Should show empty state gracefully
      await expect(barberPage.locator('[data-testid="no-revenue-data"]')).toBeVisible();
      
      // 2. Test network failure scenarios
      await barberPage.route('**/api/v2/six-figure/**', route => route.abort());
      await barberPage.reload();
      
      // Should show error state
      await expect(barberPage.locator('[data-testid="loading-error"]')).toBeVisible();
      
      // 3. Test invalid data scenarios
      await barberPage.unroute('**/api/v2/six-figure/**');
      await testHelpers.injectInvalidData();
      await barberPage.reload();
      
      // Should handle invalid data gracefully
      await expect(barberPage.locator('[data-testid="data-validation-error"]')).toBeVisible();
    });

  });

});