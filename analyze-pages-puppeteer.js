const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:8000',
  maxConcurrency: 5,
  crawlTimeout: 60000,
  pageLoadTimeout: 30000,
  startupDelay: 5000,
  authCredentials: {
    email: 'test@example.com',
    password: 'testpassword123'
  }
};

// Track discovered pages and their analysis
const discoveredPages = new Map();
const pageContentHashes = new Map();
const deadLinks = new Set();
const authRequiredPages = new Set();
const publicPages = new Set();

// Server management
let frontendProcess = null;
let backendProcess = null;

// Utility functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateContentHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function checkServerRunning(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function startServers() {
  console.log('🚀 Checking server status...');

  // Check if servers are already running
  const frontendRunning = await checkServerRunning(CONFIG.frontendUrl);
  const backendRunning = await checkServerRunning(CONFIG.backendUrl);

  if (!backendRunning) {
    console.log('📦 Starting backend server...');
    backendProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'pipe'
    });

    backendProcess.on('error', (err) => {
      console.error('Backend server error:', err);
    });
  }

  if (!frontendRunning) {
    console.log('🎨 Starting frontend server...');
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'pipe',
      shell: true
    });

    frontendProcess.on('error', (err) => {
      console.error('Frontend server error:', err);
    });
  }

  // Wait for servers to be ready
  console.log('⏳ Waiting for servers to start...');
  await delay(CONFIG.startupDelay);

  // Verify servers are running
  let retries = 0;
  while (retries < 30) {
    const frontendReady = await checkServerRunning(CONFIG.frontendUrl);
    const backendReady = await checkServerRunning(CONFIG.backendUrl);

    if (frontendReady && backendReady) {
      console.log('✅ Both servers are running!');
      return;
    }

    await delay(1000);
    retries++;
  }

  throw new Error('Servers failed to start after 30 seconds');
}

async function extractPageInfo(page) {
  try {
    return await page.evaluate(() => {
      // Extract all links
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({
          href: a.href,
          text: a.textContent.trim(),
          isExternal: a.hostname !== window.location.hostname
        }))
        .filter(link => link.href && !link.href.startsWith('javascript:'));

      // Extract forms
      const forms = Array.from(document.querySelectorAll('form')).map(form => ({
        action: form.action || 'current page',
        method: form.method || 'GET',
        inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
          name: input.name,
          type: input.type || 'text',
          required: input.required
        }))
      }));

      // Extract page metadata
      const title = document.title;
      const h1Text = document.querySelector('h1')?.textContent?.trim() || '';
      const metaDescription = document.querySelector('meta[name="description"]')?.content || '';

      // Extract main content (for similarity comparison)
      const mainContent = document.body.innerText
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000); // Limit to first 5000 chars

      // Check for auth elements
      const hasLoginForm = !!document.querySelector('form[action*="login"], form[action*="signin"], input[type="password"]');
      const hasLogoutLink = !!document.querySelector('a[href*="logout"], button[onclick*="logout"]');

      // Check for specific page types
      const isAuthPage = hasLoginForm || window.location.pathname.includes('auth') || window.location.pathname.includes('login');
      const isDashboard = window.location.pathname.includes('dashboard');
      const isBookingPage = window.location.pathname.includes('booking') || window.location.pathname.includes('appointment');
      const isPublicPage = window.location.pathname === '/' || window.location.pathname.includes('public');

      return {
        url: window.location.href,
        pathname: window.location.pathname,
        title,
        h1Text,
        metaDescription,
        links,
        forms,
        mainContent,
        hasLoginForm,
        hasLogoutLink,
        isAuthPage,
        isDashboard,
        isBookingPage,
        isPublicPage,
        contentLength: document.body.innerText.length
      };
    });
  } catch (error) {
    console.error(`Error extracting page info: ${error.message}`);
    return null;
  }
}

async function crawlPage(browser, url, visited = new Set()) {
  if (visited.has(url)) return;
  visited.add(url);

  console.log(`🔍 Crawling: ${url}`);

  const page = await browser.newPage();
  try {
    // Set timeout
    page.setDefaultTimeout(CONFIG.pageLoadTimeout);

    // Try to navigate to the page
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.pageLoadTimeout
    });

    // Check if page loaded successfully
    if (!response || !response.ok()) {
      deadLinks.add(url);
      console.log(`❌ Dead link found: ${url}`);
      return;
    }

    // Wait a bit for dynamic content
    await page.waitForTimeout(1000);

    // Extract page information
    const pageInfo = await extractPageInfo(page);
    if (!pageInfo) return;

    // Generate content hash for duplicate detection
    const contentHash = generateContentHash(pageInfo.mainContent);

    // Store page information
    discoveredPages.set(url, {
      ...pageInfo,
      contentHash,
      timestamp: new Date().toISOString()
    });

    // Track content hashes for duplicate detection
    if (!pageContentHashes.has(contentHash)) {
      pageContentHashes.set(contentHash, []);
    }
    pageContentHashes.get(contentHash).push(url);

    // Categorize page
    if (pageInfo.isAuthPage || pageInfo.hasLoginForm) {
      authRequiredPages.add(url);
    } else {
      publicPages.add(url);
    }

    // Extract and queue new links for crawling
    const newLinks = pageInfo.links
      .filter(link => !link.isExternal)
      .map(link => link.href)
      .filter(href => href.startsWith(CONFIG.frontendUrl))
      .filter(href => !visited.has(href));

    // Crawl discovered links (with concurrency control)
    const chunks = [];
    for (let i = 0; i < newLinks.length; i += CONFIG.maxConcurrency) {
      chunks.push(newLinks.slice(i, i + CONFIG.maxConcurrency));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(link => crawlPage(browser, link, visited)));
    }

  } catch (error) {
    console.error(`Error crawling ${url}: ${error.message}`);
    deadLinks.add(url);
  } finally {
    await page.close();
  }
}

async function tryAuthenticatedCrawl(browser) {
  console.log('\n🔐 Attempting authenticated crawl...');

  const page = await browser.newPage();
  try {
    // Try to find and use login page
    const loginUrls = [
      `${CONFIG.frontendUrl}/login`,
      `${CONFIG.frontendUrl}/auth/login`,
      `${CONFIG.frontendUrl}/signin`,
      `${CONFIG.frontendUrl}/auth/signin`
    ];

    for (const loginUrl of loginUrls) {
      try {
        await page.goto(loginUrl, { waitUntil: 'networkidle2' });

        // Check if we found a login form
        const hasLoginForm = await page.evaluate(() => {
          return !!document.querySelector('input[type="password"]');
        });

        if (hasLoginForm) {
          console.log(`Found login form at: ${loginUrl}`);

          // Try to fill and submit login form
          await page.type('input[type="email"], input[type="text"]', CONFIG.authCredentials.email);
          await page.type('input[type="password"]', CONFIG.authCredentials.password);

          // Submit form
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"], input[type="submit"]')
          ]);

          // Check if login was successful
          const currentUrl = page.url();
          if (currentUrl !== loginUrl && !currentUrl.includes('login')) {
            console.log('✅ Authentication successful!');

            // Crawl authenticated pages
            const authPages = [
              `${CONFIG.frontendUrl}/dashboard`,
              `${CONFIG.frontendUrl}/appointments`,
              `${CONFIG.frontendUrl}/analytics`,
              `${CONFIG.frontendUrl}/settings`,
              `${CONFIG.frontendUrl}/profile`
            ];

            for (const authPage of authPages) {
              await crawlPage(browser, authPage);
            }
          }
          break;
        }
      } catch (error) {
        console.log(`Login attempt failed at ${loginUrl}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Authenticated crawl error:', error.message);
  } finally {
    await page.close();
  }
}

async function scanPublicFiles() {
  console.log('\n📁 Scanning public HTML files...');

  const publicDir = path.join(__dirname, 'frontend', 'public');
  try {
    const files = await fs.readdir(publicDir);
    const htmlFiles = files.filter(file => file.endsWith('.html'));

    for (const file of htmlFiles) {
      const url = `${CONFIG.frontendUrl}/${file}`;
      publicPages.add(url);
      console.log(`Found public file: ${file}`);
    }
  } catch (error) {
    console.error('Error scanning public files:', error.message);
  }
}

async function analyzeResults() {
  console.log('\n📊 Analyzing crawl results...\n');

  const report = {
    summary: {
      totalPagesDiscovered: discoveredPages.size,
      deadLinks: deadLinks.size,
      publicPages: publicPages.size,
      authRequiredPages: authRequiredPages.size,
      duplicateGroups: 0
    },
    pages: [],
    duplicates: [],
    deadLinks: Array.from(deadLinks),
    recommendations: []
  };

  // Analyze pages
  for (const [url, pageInfo] of discoveredPages) {
    report.pages.push({
      url,
      pathname: pageInfo.pathname,
      title: pageInfo.title,
      purpose: determinePurpose(pageInfo),
      type: determinePageType(pageInfo),
      hasAuth: pageInfo.hasLoginForm,
      linksCount: pageInfo.links.length,
      formsCount: pageInfo.forms.length,
      contentLength: pageInfo.contentLength
    });
  }

  // Find duplicates
  for (const [hash, urls] of pageContentHashes) {
    if (urls.length > 1) {
      report.duplicates.push({
        contentHash: hash,
        urls,
        pages: urls.map(url => ({
          url,
          title: discoveredPages.get(url)?.title || 'Unknown'
        }))
      });
      report.summary.duplicateGroups++;
    }
  }

  // Generate recommendations
  if (report.summary.duplicateGroups > 0) {
    report.recommendations.push({
      type: 'DUPLICATE_CONTENT',
      severity: 'HIGH',
      message: `Found ${report.summary.duplicateGroups} groups of pages with duplicate content`,
      affectedPages: report.duplicates.flatMap(d => d.urls)
    });
  }

  if (deadLinks.size > 0) {
    report.recommendations.push({
      type: 'DEAD_LINKS',
      severity: 'HIGH',
      message: `Found ${deadLinks.size} dead or broken links`,
      affectedPages: Array.from(deadLinks)
    });
  }

  // Check for redundant auth pages
  const authPages = Array.from(discoveredPages.entries())
    .filter(([_, info]) => info.isAuthPage)
    .map(([url, _]) => url);

  if (authPages.length > 2) {
    report.recommendations.push({
      type: 'REDUNDANT_AUTH',
      severity: 'MEDIUM',
      message: `Found ${authPages.length} authentication-related pages, consider consolidating`,
      affectedPages: authPages
    });
  }

  // Check for demo/test pages in production
  const demoPages = Array.from(discoveredPages.entries())
    .filter(([url, _]) => url.includes('demo') || url.includes('test') || url.includes('debug'))
    .map(([url, _]) => url);

  if (demoPages.length > 0) {
    report.recommendations.push({
      type: 'DEMO_PAGES',
      severity: 'MEDIUM',
      message: `Found ${demoPages.length} demo/test pages that might not belong in production`,
      affectedPages: demoPages
    });
  }

  return report;
}

function determinePurpose(pageInfo) {
  const { pathname, title, h1Text, isAuthPage, isDashboard, isBookingPage } = pageInfo;

  if (isAuthPage) return 'Authentication';
  if (isDashboard) return 'Dashboard/Analytics';
  if (isBookingPage) return 'Booking/Appointments';
  if (pathname === '/') return 'Homepage';
  if (pathname.includes('settings')) return 'Settings/Configuration';
  if (pathname.includes('profile')) return 'User Profile';
  if (pathname.includes('admin')) return 'Admin Panel';

  return 'General Content';
}

function determinePageType(pageInfo) {
  if (pageInfo.hasLoginForm) return 'AUTH_FORM';
  if (pageInfo.isDashboard) return 'DASHBOARD';
  if (pageInfo.isBookingPage) return 'BOOKING';
  if (pageInfo.forms.length > 0) return 'FORM_PAGE';
  if (pageInfo.links.length > 10) return 'NAVIGATION_HUB';

  return 'CONTENT_PAGE';
}

async function generateReport(analysis) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, `page-analysis-report-${timestamp}.json`);
  const readableReportPath = path.join(__dirname, `page-analysis-report-${timestamp}.md`);

  // Save JSON report
  await fs.writeFile(reportPath, JSON.stringify(analysis, null, 2));

  // Generate readable markdown report
  const markdownReport = `# 6FB Booking Page Analysis Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Pages Discovered**: ${analysis.summary.totalPagesDiscovered}
- **Dead Links**: ${analysis.summary.deadLinks}
- **Public Pages**: ${analysis.summary.publicPages}
- **Auth-Required Pages**: ${analysis.summary.authRequiredPages}
- **Duplicate Content Groups**: ${analysis.summary.duplicateGroups}

## Discovered Pages

${analysis.pages.map(page => `### ${page.title || page.pathname}
- **URL**: ${page.url}
- **Purpose**: ${page.purpose}
- **Type**: ${page.type}
- **Has Auth**: ${page.hasAuth ? 'Yes' : 'No'}
- **Links**: ${page.linksCount}
- **Forms**: ${page.formsCount}
`).join('\n')}

## Duplicate Content

${analysis.duplicates.length > 0 ? analysis.duplicates.map(dup => `### Duplicate Group (${dup.urls.length} pages)
${dup.pages.map(p => `- ${p.url} - "${p.title}"`).join('\n')}
`).join('\n') : 'No duplicate content found.'}

## Dead Links

${analysis.deadLinks.length > 0 ? analysis.deadLinks.map(link => `- ${link}`).join('\n') : 'No dead links found.'}

## Recommendations

${analysis.recommendations.map(rec => `### ${rec.type}
- **Severity**: ${rec.severity}
- **Message**: ${rec.message}
- **Affected Pages**:
${rec.affectedPages.map(page => `  - ${page}`).join('\n')}
`).join('\n')}
`;

  await fs.writeFile(readableReportPath, markdownReport);

  console.log(`\n📄 Reports saved:`);
  console.log(`   - JSON: ${reportPath}`);
  console.log(`   - Markdown: ${readableReportPath}`);

  return { reportPath, readableReportPath };
}

async function cleanup() {
  console.log('\n🧹 Cleaning up...');

  if (frontendProcess) {
    frontendProcess.kill();
    console.log('Frontend server stopped');
  }

  if (backendProcess) {
    backendProcess.kill();
    console.log('Backend server stopped');
  }
}

async function main() {
  console.log('🚀 Starting 6FB Booking Page Analysis with Puppeteer\n');

  let browser;
  try {
    // Start servers if needed
    await startServers();

    // Launch Puppeteer
    console.log('\n🌐 Launching Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Scan public files first
    await scanPublicFiles();

    // Start crawling from homepage
    console.log('\n🕷️ Starting crawl from homepage...');
    await crawlPage(browser, CONFIG.frontendUrl);

    // Try authenticated crawl
    await tryAuthenticatedCrawl(browser);

    // Crawl any public HTML files
    for (const publicUrl of publicPages) {
      if (!discoveredPages.has(publicUrl)) {
        await crawlPage(browser, publicUrl);
      }
    }

    // Analyze results
    const analysis = await analyzeResults();

    // Generate and save report
    const { readableReportPath } = await generateReport(analysis);

    // Print summary
    console.log('\n✅ Analysis Complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Pages discovered: ${analysis.summary.totalPagesDiscovered}`);
    console.log(`   - Duplicate groups: ${analysis.summary.duplicateGroups}`);
    console.log(`   - Dead links: ${analysis.summary.deadLinks}`);
    console.log(`\n📄 Full report available at: ${readableReportPath}`);

  } catch (error) {
    console.error('\n❌ Error during analysis:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    await cleanup();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Interrupted by user');
  await cleanup();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('\n💥 Uncaught exception:', error);
  await cleanup();
  process.exit(1);
});

// Run the analysis
main().catch(console.error);
