/**
 * Simplified Apple Design System Verification
 * Quick check of key design elements
 */

const puppeteer = require('puppeteer');

const CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 10000,
  pages: [
    { path: '/', name: 'homepage' },
    { path: '/login', name: 'login' },
  ]
};

async function checkAppleDesignFeatures(page) {
  const features = {
    glassEffects: false,
    iosColors: false,
    premiumShadows: false,
    iosTypography: false,
    totalScore: 0
  };

  try {
    // Check for glass morphism effects
    const glassElements = await page.$$eval('[class*="backdrop-blur"], [class*="glass-"], [class*="bg-white/"], [class*="bg-slate/"]', 
      elements => elements.length
    );
    features.glassEffects = glassElements > 0;

    // Check for iOS-style colors (teal, slate, premium gradients)
    const iosColors = await page.$$eval('[class*="teal-"], [class*="slate-"], [class*="gradient-"], [class*="from-slate"]',
      elements => elements.length
    );
    features.iosColors = iosColors > 0;

    // Check for premium shadow effects
    const shadows = await page.$$eval('[class*="shadow-"], [class*="hover:shadow-"], [class*="drop-shadow"]',
      elements => elements.length
    );
    features.premiumShadows = shadows > 0;

    // Check for iOS typography (proper font weights, spacing)
    const typography = await page.$$eval('[class*="font-"], [class*="text-"], [class*="leading-"], [class*="tracking-"]',
      elements => elements.length
    );
    features.iosTypography = typography > 0;

    // Calculate score
    const totalFeatures = 4;
    const implementedFeatures = Object.values(features).filter(Boolean).length - 1; // -1 for totalScore
    features.totalScore = Math.round((implementedFeatures / totalFeatures) * 100);

    return features;
  } catch (error) {
    console.error('Error checking design features:', error);
    return features;
  }
}

async function runSimpleVerification() {
  console.log('🚀 Starting Simplified Design Verification...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    timeout: CONFIG.timeout 
  });
  
  const results = {
    pages: {},
    summary: { totalScore: 0, pagesChecked: 0, averageScore: 0 }
  };

  for (const pageConfig of CONFIG.pages) {
    try {
      console.log(`🔍 Checking: ${pageConfig.name} (${pageConfig.path})`);
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      
      const response = await page.goto(`${CONFIG.baseURL}${pageConfig.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.timeout
      });

      if (response && response.ok()) {
        const features = await checkAppleDesignFeatures(page);
        results.pages[pageConfig.name] = {
          url: `${CONFIG.baseURL}${pageConfig.path}`,
          status: 'success',
          features: features,
          score: features.totalScore
        };
        
        console.log(`  ✅ Success - Score: ${features.totalScore}%`);
        console.log(`     Glass Effects: ${features.glassEffects ? '✓' : '✗'}`);
        console.log(`     iOS Colors: ${features.iosColors ? '✓' : '✗'}`);
        console.log(`     Premium Shadows: ${features.premiumShadows ? '✓' : '✗'}`);
        console.log(`     iOS Typography: ${features.iosTypography ? '✓' : '✗'}`);
        
        results.summary.totalScore += features.totalScore;
        results.summary.pagesChecked++;
      } else {
        console.log(`  ❌ Failed to load page`);
        results.pages[pageConfig.name] = {
          url: `${CONFIG.baseURL}${pageConfig.path}`,
          status: 'failed',
          error: 'Page did not load successfully'
        };
      }

      await page.close();
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.pages[pageConfig.name] = {
        url: `${CONFIG.baseURL}${pageConfig.path}`,
        status: 'failed',
        error: error.message
      };
    }
  }

  await browser.close();

  // Calculate average score
  if (results.summary.pagesChecked > 0) {
    results.summary.averageScore = Math.round(results.summary.totalScore / results.summary.pagesChecked);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎨 APPLE DESIGN SYSTEM VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`📄 Pages Checked: ${results.summary.pagesChecked}`);
  console.log(`📊 Average Score: ${results.summary.averageScore}%`);
  
  if (results.summary.averageScore >= 75) {
    console.log('🎉 EXCELLENT Apple Design Implementation!');
  } else if (results.summary.averageScore >= 50) {
    console.log('👍 GOOD Apple Design Implementation');  
  } else if (results.summary.averageScore >= 25) {
    console.log('⚠️  PARTIAL Apple Design Implementation');
  } else {
    console.log('❌ Apple Design System needs MORE WORK');
  }

  return results;
}

// Run the verification
runSimpleVerification()
  .then(results => {
    console.log('\n📊 Detailed Results:');
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(error => {
    console.error('❌ Verification failed:', error);
  });