/**
 * Quick Layout Verification Test
 * Simple test to verify registration page layout after fixes
 */

const puppeteer = require('puppeteer');

async function checkRegistrationLayout() {
    console.log('🔍 Checking registration page layout...');
    
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        defaultViewport: { width: 1280, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    try {
        // Navigate to registration page
        await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2' });
        
        // Wait a moment for hydration
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Take screenshot
        await page.screenshot({ 
            path: 'registration-layout-check.png',
            fullPage: true 
        });
        
        // Get page dimensions and card info
        const layoutInfo = await page.evaluate(() => {
            const cards = document.querySelectorAll('.card, [class*="card"]');
            const container = document.querySelector('.max-w-7xl, .max-w-4xl');
            
            return {
                containerWidth: container ? container.offsetWidth : 0,
                containerClass: container ? container.className : 'not found',
                cardCount: cards.length,
                cardWidths: Array.from(cards).slice(0, 3).map(card => card.offsetWidth),
                cardHeights: Array.from(cards).slice(0, 3).map(card => card.offsetHeight),
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                documentHeight: document.documentElement.scrollHeight,
                isScrollable: document.documentElement.scrollHeight > window.innerHeight
            };
        });
        
        console.log('📊 Layout Information:');
        console.log('  Container width:', layoutInfo.containerWidth + 'px');
        console.log('  Container class:', layoutInfo.containerClass);
        console.log('  Number of cards:', layoutInfo.cardCount);
        console.log('  Card widths:', layoutInfo.cardWidths);
        console.log('  Card heights:', layoutInfo.cardHeights);
        console.log('  Viewport:', layoutInfo.viewportWidth + 'x' + layoutInfo.viewportHeight);
        console.log('  Document height:', layoutInfo.documentHeight);
        console.log('  Page is scrollable:', layoutInfo.isScrollable);
        
        console.log('\n🚨 Console Errors:', consoleErrors.length);
        if (consoleErrors.length > 0) {
            console.log('  First few errors:');
            consoleErrors.slice(0, 3).forEach((error, i) => {
                console.log(`  ${i + 1}. ${error.substring(0, 100)}...`);
            });
        }
        
        // Check for business type cards specifically
        const businessCards = await page.$$eval('.grid > *', cards => {
            return cards.length;
        });
        
        console.log('\n✅ Business type cards found:', businessCards);
        
        console.log('\n📸 Screenshot saved as: registration-layout-check.png');
        console.log('✅ Layout check completed successfully!');
        
        // Check if cards look wider (should be close to container width / 3)
        const expectedCardWidth = Math.floor(layoutInfo.containerWidth / 3 - 32); // Account for gaps
        const actualCardWidth = layoutInfo.cardWidths[0] || 0;
        const isWider = actualCardWidth > 350; // Cards should be wider than 350px now
        
        console.log('\n🎯 Width Analysis:');
        console.log('  Expected card width (approx):', expectedCardWidth + 'px');
        console.log('  Actual card width:', actualCardWidth + 'px');
        console.log('  Cards are wider than before:', isWider ? '✅ YES' : '❌ NO');
        
    } catch (error) {
        console.error('❌ Layout check failed:', error.message);
    } finally {
        await browser.close();
    }
}

checkRegistrationLayout();