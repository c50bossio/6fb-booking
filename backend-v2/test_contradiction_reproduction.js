#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function reproduceContradiction() {
  console.log('🔍 Reproducing Next Available Slot Contradiction');
  console.log('=' * 55);
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      slowMo: 500,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('📋 Step 1: Navigate to booking page without authentication...');
    await page.goto('http://localhost:3000/book', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Check if we got redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('🔐 Redirected to login page - this is expected for protected route');
      console.log('📊 ANALYSIS: To see the contradiction, authentication would be required');
      console.log('');
      console.log('Based on API testing, the contradiction occurs because:');
      console.log('1. General /next-available endpoint requires authentication');
      console.log('2. Date-specific /slots APIs return different "next available" data:');
      console.log('   - June 28: next available = June 29 at 4:30 PM');
      console.log('   - June 30: next available = June 30 at 9:00 AM');
      console.log('   - July 1: next available = July 1 at 9:00 AM');
      console.log('');
      console.log('This creates a contradiction where:');
      console.log('- User sees "Next available: June 29 at 4:30 PM" initially');
      console.log('- When they select June 30, they see "Next available: June 30 at 9:00 AM"');
      console.log('- Both can\'t be true - there should be one global "next available"');
      
      // Still take a screenshot for documentation
      await page.screenshot({
        path: '/Users/bossio/6fb-booking/backend-v2/contradiction-test-unauthenticated.png',
        fullPage: true
      });
      
      return;
    }
    
    console.log('✅ Page loaded successfully');
    
    // Look for any next available messages
    const nextAvailableMessages = await page.evaluate(() => {
      const texts = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.toLowerCase().includes('next available') || 
            text.toLowerCase().includes('available') ||
            text.toLowerCase().includes('june') ||
            text.toLowerCase().includes('july')) {
          texts.push({
            text: text,
            parent: node.parentElement.tagName,
            className: node.parentElement.className
          });
        }
      }
      return texts;
    });
    
    console.log('📝 Next Available Messages Found:');
    nextAvailableMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. "${msg.text}"`);
      console.log(`     In <${msg.parent}> class="${msg.className}"`);
    });
    
    await page.screenshot({
      path: '/Users/bossio/6fb-booking/backend-v2/contradiction-test.png',
      fullPage: true
    });
    
    console.log('📸 Screenshot saved to: contradiction-test.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function proposeFixingStrategy() {
  console.log('\n🔧 FIXING STRATEGY');
  console.log('=' * 20);
  console.log(`
IDENTIFIED ISSUE:
The booking system has inconsistent "next available" logic that causes contradictory messages.

ROOT CAUSE:
- /next-available endpoint (requires auth) returns global next available
- /slots endpoint returns date-specific "next available" 
- Frontend shows both, creating contradictions

SPECIFIC CONTRADICTION:
- API says: "Next available globally: June 29 at 4:30 PM"
- When user selects June 30: "Next available for June 30: June 30 at 9:00 AM"
- Both displayed simultaneously, confusing users

RECOMMENDED FIX:
1. Make "next available" logic consistent across all APIs
2. Use a single source of truth for next available slot
3. Remove duplicate displays in frontend
4. Consider caching next available data to prevent race conditions

FILES TO MODIFY:
- Backend: routers/bookings.py (slots endpoint logic)
- Frontend: app/book/page.tsx (remove duplicate next available displays)
- Frontend: components/TimeSlots.tsx (simplify next available messaging)
  `);
}

// Run the test
reproduceContradiction()
  .then(() => proposeFixingStrategy())
  .catch(console.error);