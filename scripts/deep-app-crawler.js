#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:8000',
  viewportSizes: {
    desktop: { width: 1920, height: 1080 },
    mobile: { width: 375, height: 812 }
  },
  timeout: 30000,
  screenshotDir: path.join(__dirname, 'crawler-screenshots'),
  reportFile: path.join(__dirname, 'deep-app-crawler-report.json'),
  authTokens: {
    valid: null, // Will be set during runtime
    invalid: 'invalid-token-12345',
    expired: 'expired-token-67890'
  },
  testScenarios: [
    { name: 'no-auth', description: 'Without authentication (clear session)' },
    { name: 'valid-auth', description: 'With valid authentication token' },
    { name: 'invalid-auth', description: 'With invalid authentication token' },
    { name: 'demo-mode', description: 'In demo mode' }
  ]
};

// Utility functions
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
  }
}

async function discoverAllRoutes() {
  console.log('🔍 Discovering all routes in the application...');

  const appDir = path.join(__dirname, '../frontend/src/app');
  const routes = [];

  async function scanDirectory(dir, basePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip special Next.js directories and node_modules
        if (entry.name.startsWith('_') || entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }

        // Check if this directory has a page.tsx
        try {
          await fs.access(path.join(fullPath, 'page.tsx'));

          // Handle dynamic routes
          let routePath = basePath + '/' + entry.name;
          if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
            const paramName = entry.name.slice(1, -1);
            // Add both a sample route and the pattern
            routes.push({
              path: routePath.replace(`[${paramName}]`, 'sample-' + paramName),
              pattern: routePath,
              isDynamic: true,
              param: paramName,
              file: path.join(fullPath, 'page.tsx')
            });
          } else {
            routes.push({
              path: routePath,
              pattern: routePath,
              isDynamic: false,
              file: path.join(fullPath, 'page.tsx')
            });
          }
        } catch {
          // No page.tsx in this directory
        }

        // Continue scanning subdirectories
        await scanDirectory(fullPath, basePath + '/' + entry.name);
      }
    }
  }

  // Check for root page.tsx
  try {
    await fs.access(path.join(appDir, 'page.tsx'));
    routes.push({
      path: '/',
      pattern: '/',
      isDynamic: false,
      file: path.join(appDir, 'page.tsx')
    });
  } catch {
    // No root page
  }

  await scanDirectory(appDir);

  // Clean up paths
  routes.forEach(route => {
    route.path = route.path.replace(/\/+/g, '/');
    route.pattern = route.pattern.replace(/\/+/g, '/');
  });

  console.log(`✅ Discovered ${routes.length} routes`);
  return routes;
}

async function classifyRoute(route) {
  // Read the file to check for authentication requirements
  try {
    const content = await fs.readFile(route.file, 'utf-8');

    // Check for common patterns that indicate protected routes
    const isProtected =
      content.includes('useAuth') ||
      content.includes('requireAuth') ||
      content.includes('withAuth') ||
      content.includes('isAuthenticated') ||
      route.path.includes('/dashboard') ||
      route.path.includes('/app/') ||
      route.path.includes('/settings') ||
      route.path.includes('/admin');

    const isPublic =
      content.includes('public: true') ||
      route.path.includes('/login') ||
      route.path.includes('/signup') ||
      route.path.includes('/book/') ||
      route.path === '/' ||
      route.path.includes('/about') ||
      route.path.includes('/contact') ||
      route.path.includes('/privacy') ||
      route.path.includes('/terms');

    return {
      ...route,
      expectedBehavior: isProtected ? 'protected' : (isPublic ? 'public' : 'unknown'),
      hasAuthCheck: content.includes('useAuth') || content.includes('getServerSession')
    };
  } catch (error) {
    return {
      ...route,
      expectedBehavior: 'unknown',
      hasAuthCheck: false
    };
  }
}

async function getValidAuthToken() {
  // Try to get a valid token by logging in
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle0' });

    // Try to login with test credentials
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});

    // Get the auth token from localStorage or cookies
    const token = await page.evaluate(() => {
      return localStorage.getItem('authToken') || localStorage.getItem('token');
    });

    await browser.close();
    return token;
  } catch (error) {
    await browser.close();
    console.log('⚠️  Could not obtain valid auth token, using mock token');
    return 'mock-valid-token-12345';
  }
}

async function testRoute(browser, route, scenario) {
  const page = await browser.newPage();
  const results = {
    route: route.path,
    scenario: scenario.name,
    timestamp: new Date().toISOString(),
    errors: [],
    warnings: [],
    networkErrors: [],
    redirects: [],
    statusCode: null,
    loadTime: null,
    screenshot: null,
    contentLoaded: false,
    javascriptErrors: []
  };

  // Set up error tracking
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.errors.push({
        type: 'console-error',
        text: msg.text(),
        location: msg.location()
      });
    } else if (msg.type() === 'warning') {
      results.warnings.push({
        type: 'console-warning',
        text: msg.text()
      });
    }
  });

  page.on('pageerror', error => {
    results.javascriptErrors.push({
      message: error.message,
      stack: error.stack
    });
  });

  // Track network errors
  page.on('requestfailed', request => {
    results.networkErrors.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()
    });
  });

  // Track redirects
  page.on('response', response => {
    if (response.status() >= 300 && response.status() < 400) {
      results.redirects.push({
        from: response.url(),
        to: response.headers()['location'],
        status: response.status()
      });
    }
  });

  try {
    // Clear session based on scenario
    if (scenario.name === 'no-auth') {
      await page.evaluateOnNewDocument(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.deleteCookie(...(await page.cookies()));
    } else if (scenario.name === 'valid-auth' && CONFIG.authTokens.valid) {
      await page.evaluateOnNewDocument((token) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem('token', token);
      }, CONFIG.authTokens.valid);
    } else if (scenario.name === 'invalid-auth') {
      await page.evaluateOnNewDocument((token) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem('token', token);
      }, CONFIG.authTokens.invalid);
    } else if (scenario.name === 'demo-mode') {
      await page.evaluateOnNewDocument(() => {
        localStorage.setItem('demoMode', 'true');
      });
    }

    // Navigate to the page
    const startTime = Date.now();
    const response = await page.goto(`${CONFIG.baseUrl}${route.path}`, {
      waitUntil: 'networkidle0',
      timeout: CONFIG.timeout
    });

    results.loadTime = Date.now() - startTime;
    results.statusCode = response ? response.status() : null;
    results.finalUrl = page.url();

    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);

    // Check if content loaded
    results.contentLoaded = await page.evaluate(() => {
      return document.body && document.body.innerText.trim().length > 0;
    });

    // Check for common error indicators
    const pageContent = await page.content();
    const errorIndicators = [
      'error',
      'Error',
      'ERROR',
      '404',
      '500',
      'not found',
      'Not Found',
      'Internal Server Error',
      'Something went wrong',
      'Oops',
      'crashed'
    ];

    const pageText = await page.evaluate(() => document.body.innerText);
    errorIndicators.forEach(indicator => {
      if (pageText.includes(indicator) && !route.path.includes('error')) {
        results.warnings.push({
          type: 'error-indicator',
          text: `Page contains error indicator: "${indicator}"`
        });
      }
    });

    // Take screenshot if there are errors or warnings
    if (results.errors.length > 0 || results.warnings.length > 0 || results.networkErrors.length > 0 || results.statusCode >= 400) {
      const screenshotName = `${route.path.replace(/\//g, '-')}-${scenario.name}-${Date.now()}.png`;
      const screenshotPath = path.join(CONFIG.screenshotDir, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      results.screenshot = screenshotName;
    }

  } catch (error) {
    results.errors.push({
      type: 'navigation-error',
      message: error.message,
      stack: error.stack
    });

    // Try to take a screenshot even if navigation failed
    try {
      const screenshotName = `${route.path.replace(/\//g, '-')}-${scenario.name}-error-${Date.now()}.png`;
      const screenshotPath = path.join(CONFIG.screenshotDir, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      results.screenshot = screenshotName;
    } catch (screenshotError) {
      // Ignore screenshot errors
    }
  } finally {
    await page.close();
  }

  return results;
}

async function analyzeResults(allResults) {
  const analysis = {
    totalRoutes: 0,
    totalTests: 0,
    routesWithErrors: new Set(),
    routesWithWarnings: new Set(),
    authenticationIssues: [],
    performanceIssues: [],
    networkIssues: [],
    brokenRoutes: [],
    redirectChains: [],
    summary: {
      errors: 0,
      warnings: 0,
      networkErrors: 0,
      slowPages: 0,
      authFailures: 0
    }
  };

  const routeResults = {};

  allResults.forEach(result => {
    analysis.totalTests++;

    if (!routeResults[result.route]) {
      routeResults[result.route] = {
        route: result.route,
        scenarios: {},
        hasErrors: false,
        hasWarnings: false
      };
      analysis.totalRoutes++;
    }

    routeResults[result.route].scenarios[result.scenario] = result;

    if (result.errors.length > 0) {
      analysis.routesWithErrors.add(result.route);
      routeResults[result.route].hasErrors = true;
      analysis.summary.errors += result.errors.length;
    }

    if (result.warnings.length > 0) {
      analysis.routesWithWarnings.add(result.route);
      routeResults[result.route].hasWarnings = true;
      analysis.summary.warnings += result.warnings.length;
    }

    if (result.networkErrors.length > 0) {
      analysis.summary.networkErrors += result.networkErrors.length;
      analysis.networkIssues.push({
        route: result.route,
        scenario: result.scenario,
        errors: result.networkErrors
      });
    }

    if (result.loadTime > 5000) {
      analysis.summary.slowPages++;
      analysis.performanceIssues.push({
        route: result.route,
        scenario: result.scenario,
        loadTime: result.loadTime
      });
    }

    if (result.statusCode >= 400 || !result.contentLoaded) {
      analysis.brokenRoutes.push({
        route: result.route,
        scenario: result.scenario,
        statusCode: result.statusCode,
        contentLoaded: result.contentLoaded
      });
    }

    if (result.redirects.length > 2) {
      analysis.redirectChains.push({
        route: result.route,
        scenario: result.scenario,
        chain: result.redirects
      });
    }
  });

  // Analyze authentication patterns
  Object.values(routeResults).forEach(routeData => {
    const noAuth = routeData.scenarios['no-auth'];
    const validAuth = routeData.scenarios['valid-auth'];

    if (noAuth && validAuth) {
      // Check if protected routes are properly secured
      if (routeData.route.includes('/dashboard') || routeData.route.includes('/app/') || routeData.route.includes('/settings')) {
        if (noAuth.statusCode === 200 && noAuth.finalUrl === `${CONFIG.baseUrl}${routeData.route}`) {
          analysis.authenticationIssues.push({
            route: routeData.route,
            issue: 'Protected route accessible without authentication',
            severity: 'high'
          });
          analysis.summary.authFailures++;
        }
      }

      // Check if public routes redirect authenticated users unnecessarily
      if (routeData.route.includes('/login') || routeData.route.includes('/signup')) {
        if (validAuth.statusCode !== 200 || validAuth.finalUrl !== `${CONFIG.baseUrl}${routeData.route}`) {
          analysis.authenticationIssues.push({
            route: routeData.route,
            issue: 'Public route redirects authenticated users',
            severity: 'low'
          });
        }
      }
    }
  });

  analysis.routesWithErrors = Array.from(analysis.routesWithErrors);
  analysis.routesWithWarnings = Array.from(analysis.routesWithWarnings);

  return { analysis, routeResults };
}

async function generateReport(routes, allResults, analysis) {
  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      totalRoutes: routes.length,
      totalTests: allResults.length,
      duration: null,
      baseUrl: CONFIG.baseUrl
    },
    routes: routes.map(route => ({
      ...route,
      file: path.relative(process.cwd(), route.file)
    })),
    results: allResults,
    analysis: analysis,
    recommendations: []
  };

  // Generate recommendations
  if (analysis.authenticationIssues.length > 0) {
    report.recommendations.push({
      category: 'Authentication',
      priority: 'high',
      issues: analysis.authenticationIssues,
      recommendation: 'Review authentication middleware and ensure protected routes are properly secured'
    });
  }

  if (analysis.performanceIssues.length > 0) {
    report.recommendations.push({
      category: 'Performance',
      priority: 'medium',
      issues: analysis.performanceIssues,
      recommendation: 'Optimize slow-loading pages, consider lazy loading and code splitting'
    });
  }

  if (analysis.networkIssues.length > 0) {
    report.recommendations.push({
      category: 'Network',
      priority: 'high',
      issues: analysis.networkIssues,
      recommendation: 'Fix failed network requests and ensure all API endpoints are available'
    });
  }

  if (analysis.brokenRoutes.length > 0) {
    report.recommendations.push({
      category: 'Broken Routes',
      priority: 'critical',
      issues: analysis.brokenRoutes,
      recommendation: 'Fix broken routes that return error status codes or fail to load content'
    });
  }

  await fs.writeFile(CONFIG.reportFile, JSON.stringify(report, null, 2));

  // Also generate a human-readable summary
  const summaryPath = path.join(__dirname, 'deep-app-crawler-summary.md');
  const summary = generateMarkdownSummary(report);
  await fs.writeFile(summaryPath, summary);

  return report;
}

function generateMarkdownSummary(report) {
  const { analysis } = report;

  let summary = `# Deep App Crawler Report

Generated: ${report.metadata.timestamp}

## Overview
- **Total Routes Tested**: ${report.metadata.totalRoutes}
- **Total Test Scenarios**: ${report.metadata.totalTests}
- **Base URL**: ${report.metadata.baseUrl}

## Summary Statistics
- **Total Errors**: ${analysis.summary.errors}
- **Total Warnings**: ${analysis.summary.warnings}
- **Network Errors**: ${analysis.summary.networkErrors}
- **Slow Pages**: ${analysis.summary.slowPages}
- **Authentication Failures**: ${analysis.summary.authFailures}

## Critical Issues

### 🔴 Broken Routes (${analysis.brokenRoutes.length})
`;

  if (analysis.brokenRoutes.length > 0) {
    analysis.brokenRoutes.forEach(issue => {
      summary += `- **${issue.route}** (${issue.scenario}): Status ${issue.statusCode}, Content Loaded: ${issue.contentLoaded}\n`;
    });
  } else {
    summary += 'None found ✅\n';
  }

  summary += `
### 🔐 Authentication Issues (${analysis.authenticationIssues.length})
`;

  if (analysis.authenticationIssues.length > 0) {
    analysis.authenticationIssues.forEach(issue => {
      summary += `- **${issue.route}**: ${issue.issue} (Severity: ${issue.severity})\n`;
    });
  } else {
    summary += 'None found ✅\n';
  }

  summary += `
### ⚡ Performance Issues (${analysis.performanceIssues.length})
`;

  if (analysis.performanceIssues.length > 0) {
    analysis.performanceIssues.forEach(issue => {
      summary += `- **${issue.route}** (${issue.scenario}): Load time ${issue.loadTime}ms\n`;
    });
  } else {
    summary += 'None found ✅\n';
  }

  summary += `
### 🌐 Network Issues (${analysis.networkIssues.length})
`;

  if (analysis.networkIssues.length > 0) {
    analysis.networkIssues.forEach(issue => {
      summary += `- **${issue.route}** (${issue.scenario}): ${issue.errors.length} failed requests\n`;
      issue.errors.forEach(error => {
        summary += `  - ${error.method} ${error.url}: ${error.failure.errorText}\n`;
      });
    });
  } else {
    summary += 'None found ✅\n';
  }

  summary += `
## Routes with Issues

### Routes with Errors (${analysis.routesWithErrors.length})
`;

  if (analysis.routesWithErrors.length > 0) {
    analysis.routesWithErrors.forEach(route => {
      summary += `- ${route}\n`;
    });
  } else {
    summary += 'None found ✅\n';
  }

  summary += `
### Routes with Warnings (${analysis.routesWithWarnings.length})
`;

  if (analysis.routesWithWarnings.length > 0) {
    analysis.routesWithWarnings.forEach(route => {
      summary += `- ${route}\n`;
    });
  } else {
    summary += 'None found ✅\n';
  }

  summary += `
## Recommendations

`;

  report.recommendations.forEach(rec => {
    summary += `### ${rec.category} (Priority: ${rec.priority})
${rec.recommendation}

`;
  });

  summary += `
## Full Report
See \`deep-app-crawler-report.json\` for complete details.

## Screenshots
Error screenshots are saved in \`${path.relative(process.cwd(), CONFIG.screenshotDir)}\`
`;

  return summary;
}

async function main() {
  console.log('🚀 Starting Deep App Crawler...\n');

  const startTime = Date.now();

  try {
    // Ensure directories exist
    await ensureDir(CONFIG.screenshotDir);

    // Check if servers are running
    console.log('🏥 Checking server health...');
    try {
      execSync(`curl -s ${CONFIG.baseUrl} > /dev/null`, { stdio: 'ignore' });
      console.log('✅ Frontend server is running');
    } catch {
      console.error('❌ Frontend server is not running. Please start it with: cd frontend && npm run dev');
      process.exit(1);
    }

    try {
      execSync(`curl -s ${CONFIG.backendUrl}/health > /dev/null`, { stdio: 'ignore' });
      console.log('✅ Backend server is running');
    } catch {
      console.warn('⚠️  Backend server is not running. Some features may not work properly.');
    }

    // Discover all routes
    const routes = await discoverAllRoutes();

    // Classify routes
    console.log('\n📋 Classifying routes...');
    const classifiedRoutes = await Promise.all(routes.map(classifyRoute));

    // Get valid auth token
    console.log('\n🔑 Obtaining authentication token...');
    CONFIG.authTokens.valid = await getValidAuthToken();

    // Launch browser
    console.log('\n🌐 Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Test all routes in all scenarios
    console.log('\n🧪 Testing all routes...\n');
    const allResults = [];
    let completed = 0;
    const total = classifiedRoutes.length * CONFIG.testScenarios.length;

    for (const route of classifiedRoutes) {
      for (const scenario of CONFIG.testScenarios) {
        process.stdout.write(`\rProgress: ${completed}/${total} (${Math.round(completed/total*100)}%) - Testing ${route.path} in ${scenario.name} mode...`);

        const result = await testRoute(browser, route, scenario);
        allResults.push(result);
        completed++;
      }
    }

    console.log('\n\n✅ All routes tested!');

    // Close browser
    await browser.close();

    // Analyze results
    console.log('\n📊 Analyzing results...');
    const { analysis, routeResults } = await analyzeResults(allResults);

    // Generate report
    console.log('\n📝 Generating report...');
    const report = await generateReport(classifiedRoutes, allResults, analysis);
    report.metadata.duration = Date.now() - startTime;

    // Save final report
    await fs.writeFile(CONFIG.reportFile, JSON.stringify(report, null, 2));
    const summaryPath = path.join(__dirname, 'deep-app-crawler-summary.md');
    await fs.writeFile(summaryPath, generateMarkdownSummary(report));

    // Print summary
    console.log('\n\n📈 CRAWLER SUMMARY');
    console.log('==================');
    console.log(`Total Routes: ${analysis.totalRoutes}`);
    console.log(`Total Tests: ${analysis.totalTests}`);
    console.log(`Total Errors: ${analysis.summary.errors}`);
    console.log(`Total Warnings: ${analysis.summary.warnings}`);
    console.log(`Broken Routes: ${analysis.brokenRoutes.length}`);
    console.log(`Auth Issues: ${analysis.authenticationIssues.length}`);
    console.log(`Performance Issues: ${analysis.performanceIssues.length}`);
    console.log(`Network Issues: ${analysis.networkIssues.length}`);
    console.log(`\nDuration: ${Math.round(report.metadata.duration / 1000)}s`);

    console.log('\n📁 Output Files:');
    console.log(`- Report: ${CONFIG.reportFile}`);
    console.log(`- Summary: ${summaryPath}`);
    console.log(`- Screenshots: ${CONFIG.screenshotDir}/`);

    // Exit with error code if critical issues found
    if (analysis.brokenRoutes.length > 0 || analysis.authenticationIssues.filter(i => i.severity === 'high').length > 0) {
      console.log('\n❌ Critical issues found! Check the report for details.');
      process.exit(1);
    } else {
      console.log('\n✅ No critical issues found!');
    }

  } catch (error) {
    console.error('\n\n❌ Crawler failed:', error);
    process.exit(1);
  }
}

// Run the crawler
if (require.main === module) {
  main();
}

module.exports = {
  discoverAllRoutes,
  testRoute,
  analyzeResults,
  generateReport
};
