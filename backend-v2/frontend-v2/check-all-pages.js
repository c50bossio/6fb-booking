#!/usr/bin/env node

const puppeteer = require('puppeteer');

const pages = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Calendar', path: '/calendar' },
  { name: 'My Bookings', path: '/bookings' },
  { name: 'Availability', path: '/barber/availability' },
  { name: 'Recurring', path: '/recurring' },
  { name: 'Clients', path: '/clients' },
  { name: 'Communication', path: '/notifications' },
  { name: 'Marketing Campaigns', path: '/marketing/campaigns' },
  { name: 'Marketing Templates', path: '/marketing/templates' },
  { name: 'Marketing Contacts', path: '/marketing/contacts' },
  { name: 'Marketing Analytics', path: '/marketing/analytics' },
  { name: 'Marketing Billing', path: '/marketing/billing' },
  { name: 'Payment Overview', path: '/payments' },
  { name: 'Earnings', path: '/barber/earnings' },
  { name: 'Gift Certificates', path: '/payments/gift-certificates' },
  { name: 'Commissions', path: '/commissions' },
  { name: 'Payouts', path: '/payouts' },
  { name: 'Financial Analytics', path: '/finance/analytics' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Enterprise', path: '/enterprise/dashboard' },
  { name: 'Admin Overview', path: '/admin' },
  { name: 'Services', path: '/admin/services' },
  { name: 'Staff Invitations', path: '/dashboard/staff/invitations' },
  { name: 'Booking Rules', path: '/admin/booking-rules' },
  { name: 'Data Import', path: '/import' },
  { name: 'Data Export', path: '/export' },
  { name: 'Webhooks', path: '/admin/webhooks' },
  { name: 'Product Catalog', path: '/products' },
  { name: 'Profile Settings', path: '/settings/profile' },
  { name: 'Calendar Sync', path: '/settings/calendar' },
  { name: 'Notification Settings', path: '/settings/notifications' },
  { name: 'Integrations', path: '/settings/integrations' },
  { name: 'Tracking Pixels', path: '/settings/tracking-pixels' },
  { name: 'Test Data', path: '/settings/test-data' },
  { name: 'Support', path: '/support' },
  { name: 'Sign Out', path: '/logout' }
];

async function checkPages() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const results = [];
  
  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.push({
        type: 'console_error',
        page: page.url(),
        message: msg.text()
      });
    }
  });
  
  // Monitor page errors
  page.on('error', err => {
    results.push({
      type: 'page_error',
      page: page.url(),
      message: err.toString()
    });
  });
  
  // Monitor response errors
  page.on('response', response => {
    if (response.status() >= 400) {
      results.push({
        type: 'network_error',
        page: page.url(),
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });
  
  // First try to login
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  
  // Check if we need to login
  if (page.url().includes('/login')) {
    console.log('Logging in...');
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }
  
  // Check each page
  for (const pageInfo of pages) {
    console.log(`Checking ${pageInfo.name} (${pageInfo.path})...`);
    
    try {
      const response = await page.goto(`http://localhost:3000${pageInfo.path}`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait a bit for any delayed errors
      await page.waitForTimeout(2000);
      
      // Check for specific error indicators
      const pageContent = await page.content();
      if (pageContent.includes('404') || pageContent.includes('Page not found')) {
        results.push({
          type: 'page_not_found',
          page: pageInfo.name,
          path: pageInfo.path
        });
      }
      
      if (pageContent.includes('500') || pageContent.includes('Internal Server Error')) {
        results.push({
          type: 'server_error',
          page: pageInfo.name,
          path: pageInfo.path
        });
      }
      
    } catch (error) {
      results.push({
        type: 'navigation_error',
        page: pageInfo.name,
        path: pageInfo.path,
        error: error.message
      });
    }
  }
  
  await browser.close();
  
  // Generate report
  console.log('\n\n=== PAGE CHECK REPORT ===\n');
  
  if (results.length === 0) {
    console.log('✅ All pages loaded successfully with no errors!');
  } else {
    console.log(`Found ${results.length} issues:\n`);
    
    // Group by page
    const groupedResults = {};
    results.forEach(result => {
      const key = result.page || result.path || 'Unknown';
      if (!groupedResults[key]) {
        groupedResults[key] = [];
      }
      groupedResults[key].push(result);
    });
    
    Object.entries(groupedResults).forEach(([page, issues]) => {
      console.log(`\n${page}:`);
      issues.forEach(issue => {
        console.log(`  - ${issue.type}: ${issue.message || issue.statusText || 'No details'}`);
        if (issue.url) console.log(`    URL: ${issue.url}`);
        if (issue.status) console.log(`    Status: ${issue.status}`);
      });
    });
  }
  
  // Save detailed results
  require('fs').writeFileSync(
    'page-check-results.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n\nDetailed results saved to page-check-results.json');
}

checkPages().catch(console.error);