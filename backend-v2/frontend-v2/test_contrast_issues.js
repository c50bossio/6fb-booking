const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'contrast-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Pages to test for contrast issues
const testPages = [
  { name: 'dashboard', url: 'http://localhost:3000/dashboard' },
  { name: 'calendar', url: 'http://localhost:3000/calendar' },
  { name: 'book', url: 'http://localhost:3000/book' },
  { name: 'bookings', url: 'http://localhost:3000/bookings' },
  { name: 'clients', url: 'http://localhost:3000/clients' },
  { name: 'analytics', url: 'http://localhost:3000/analytics' },
  { name: 'settings', url: 'http://localhost:3000/settings' },
  { name: 'notifications', url: 'http://localhost:3000/notifications' }
];

// Login credentials for testing authenticated pages
const testCredentials = {
  email: 'test@example.com',
  password: 'testpassword'
};

async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    console.log(`Element ${selector} not found within ${timeout}ms`);
    return false;
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page) {
  try {
    console.log('Attempting to log in...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    const emailInput = await waitForElement(page, 'input[type="email"], input[name="email"]');
    const passwordInput = await waitForElement(page, 'input[type="password"], input[name="password"]');
    
    if (emailInput && passwordInput) {
      await page.type('input[type="email"], input[name="email"]', testCredentials.email);
      await page.type('input[type="password"], input[name="password"]', testCredentials.password);
      
      const loginButton = await waitForElement(page, 'button[type="submit"], button:contains("Login"), button:contains("Sign In")');
      if (loginButton) {
        await page.click('button[type="submit"], button:contains("Login"), button:contains("Sign In")');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        console.log('Login successful');
        return true;
      }
    }
    
    console.log('Could not find login form elements');
    return false;
  } catch (error) {
    console.log('Login failed:', error.message);
    return false;
  }
}

async function toggleDarkMode(page) {
  try {
    // Try multiple approaches to toggle dark mode
    const darkModeSelectors = [
      'button[aria-label*="dark"], button[aria-label*="Dark"]',
      'button[title*="dark"], button[title*="Dark"]',
      '.theme-toggle, .dark-mode-toggle',
      'button:contains("Dark"), button:contains("Light")',
      '[data-theme-toggle]'
    ];
    
    for (const selector of darkModeSelectors) {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        await delay(500); // Wait for theme transition
        console.log(`Toggled dark mode using selector: ${selector}`);
        return true;
      }
    }
    
    // Try keyboard shortcut if available
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyD');
    await page.keyboard.up('Control');
    await delay(500);
    
    console.log('Attempted to toggle dark mode');
    return true;
  } catch (error) {
    console.log('Could not toggle dark mode:', error.message);
    return false;
  }
}

async function analyzeContrast(page, mode) {
  const contrastIssues = await page.evaluate((themeMode) => {
    const issues = [];
    
    // Find potentially problematic text elements
    const textElements = document.querySelectorAll(`
      p, span, div, h1, h2, h3, h4, h5, h6, label, 
      .text-gray-400, .text-gray-300, .text-gray-500,
      [class*="text-gray"], [class*="opacity-"]
    `);
    
    textElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);
      const textColor = styles.color;
      const backgroundColor = styles.backgroundColor;
      const opacity = styles.opacity;
      
      // Check if element has visible text
      const textContent = element.textContent?.trim();
      if (!textContent || textContent.length === 0) return;
      
      // Get element position and classes for identification
      const rect = element.getBoundingClientRect();
      const classes = element.className;
      const tagName = element.tagName.toLowerCase();
      
      // Check for potentially problematic patterns
      const hasLowOpacity = parseFloat(opacity) < 0.7;
      const hasGrayText = classes.includes('text-gray-400') || classes.includes('text-gray-300');
      const isSmallText = rect.height < 16;
      
      if (hasLowOpacity || hasGrayText || (isSmallText && textContent.length > 10)) {
        issues.push({
          index,
          tagName,
          classes,
          textContent: textContent.substring(0, 100) + (textContent.length > 100 ? '...' : ''),
          textColor,
          backgroundColor,
          opacity,
          position: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          issues: {
            lowOpacity: hasLowOpacity,
            grayText: hasGrayText,
            smallText: isSmallText
          }
        });
      }
    });
    
    return issues;
  }, mode);
  
  return contrastIssues;
}

async function testPageContrast(page, pageName, url) {
  const results = {
    pageName,
    url,
    lightMode: null,
    darkMode: null,
    errors: []
  };
  
  try {
    console.log(`\n📄 Testing ${pageName}: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    
    // Wait for page to fully load
    await delay(2000);
    
    // Test Light Mode
    console.log(`  🌞 Testing light mode...`);
    await page.screenshot({
      path: path.join(screenshotsDir, `${pageName}-light.png`),
      fullPage: true
    });
    
    const lightModeIssues = await analyzeContrast(page, 'light');
    results.lightMode = {
      issueCount: lightModeIssues.length,
      issues: lightModeIssues
    };
    
    // Toggle to Dark Mode
    console.log(`  🌙 Switching to dark mode...`);
    await toggleDarkMode(page);
    await delay(1000); // Wait for theme transition
    
    await page.screenshot({
      path: path.join(screenshotsDir, `${pageName}-dark.png`),
      fullPage: true
    });
    
    const darkModeIssues = await analyzeContrast(page, 'dark');
    results.darkMode = {
      issueCount: darkModeIssues.length,
      issues: darkModeIssues
    };
    
    console.log(`  ✅ Light mode: ${lightModeIssues.length} issues, Dark mode: ${darkModeIssues.length} issues`);
    
  } catch (error) {
    console.log(`  ❌ Error testing ${pageName}: ${error.message}`);
    results.errors.push(error.message);
  }
  
  return results;
}

async function generateReport(allResults) {
  const reportPath = path.join(screenshotsDir, 'contrast-report.json');
  const summary = {
    testDate: new Date().toISOString(),
    totalPages: allResults.length,
    summary: {
      lightModeIssues: allResults.reduce((sum, result) => sum + (result.lightMode?.issueCount || 0), 0),
      darkModeIssues: allResults.reduce((sum, result) => sum + (result.darkMode?.issueCount || 0), 0),
      pagesWithErrors: allResults.filter(result => result.errors.length > 0).length
    },
    results: allResults
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  
  // Generate readable summary
  const summaryPath = path.join(screenshotsDir, 'contrast-summary.md');
  let markdown = `# Contrast Analysis Report\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `- **Total Pages Tested:** ${summary.totalPages}\n`;
  markdown += `- **Light Mode Issues:** ${summary.summary.lightModeIssues}\n`;
  markdown += `- **Dark Mode Issues:** ${summary.summary.darkModeIssues}\n`;
  markdown += `- **Pages with Errors:** ${summary.summary.pagesWithErrors}\n\n`;
  
  markdown += `## Page-by-Page Results\n\n`;
  
  allResults.forEach(result => {
    markdown += `### ${result.pageName}\n\n`;
    if (result.errors.length > 0) {
      markdown += `❌ **Errors:** ${result.errors.join(', ')}\n\n`;
    } else {
      markdown += `- **Light Mode:** ${result.lightMode?.issueCount || 0} contrast issues\n`;
      markdown += `- **Dark Mode:** ${result.darkMode?.issueCount || 0} contrast issues\n\n`;
      
      // List specific issues
      if (result.lightMode?.issues.length > 0) {
        markdown += `**Light Mode Issues:**\n`;
        result.lightMode.issues.slice(0, 5).forEach(issue => {
          markdown += `- ${issue.tagName}.${issue.classes}: "${issue.textContent}"\n`;
        });
        if (result.lightMode.issues.length > 5) {
          markdown += `- ...and ${result.lightMode.issues.length - 5} more\n`;
        }
        markdown += `\n`;
      }
      
      if (result.darkMode?.issues.length > 0) {
        markdown += `**Dark Mode Issues:**\n`;
        result.darkMode.issues.slice(0, 5).forEach(issue => {
          markdown += `- ${issue.tagName}.${issue.classes}: "${issue.textContent}"\n`;
        });
        if (result.darkMode.issues.length > 5) {
          markdown += `- ...and ${result.darkMode.issues.length - 5} more\n`;
        }
        markdown += `\n`;
      }
    }
  });
  
  fs.writeFileSync(summaryPath, markdown);
  
  console.log(`\n📊 Reports generated:`);
  console.log(`   JSON: ${reportPath}`);
  console.log(`   Summary: ${summaryPath}`);
  console.log(`   Screenshots: ${screenshotsDir}/`);
}

async function main() {
  console.log('🔍 Starting contrast analysis...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const allResults = [];
  
  try {
    // First, try to login for authenticated pages
    const loginSuccess = await login(page);
    
    if (!loginSuccess) {
      console.log('⚠️  Login failed - will only test public pages');
    }
    
    // Test each page
    for (const testPage of testPages) {
      if (!loginSuccess && testPage.name !== 'book') {
        console.log(`⏭️  Skipping ${testPage.name} (authentication required)`);
        continue;
      }
      
      const result = await testPageContrast(page, testPage.name, testPage.url);
      allResults.push(result);
      
      // Small delay between pages
      await delay(1000);
    }
    
    // Generate comprehensive report
    await generateReport(allResults);
    
    console.log('\n✅ Contrast analysis complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run the analysis
main().catch(console.error);