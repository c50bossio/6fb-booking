#!/usr/bin/env node

/**
 * Performance Baseline Test for 6FB Booking Frontend
 * Establishes performance benchmarks for the application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

// Configuration
const config = {
  pages: [
    { name: 'Homepage', path: '/', critical: true },
    { name: 'Login', path: '/login', critical: true },
    { name: 'Dashboard', path: '/dashboard', critical: false },
    { name: 'Appointments', path: '/appointments', critical: false },
    { name: 'Analytics', path: '/analytics', critical: false },
  ],
  metrics: {
    // Target thresholds (in milliseconds)
    firstContentfulPaint: 1800,
    largestContentfulPaint: 2500,
    timeToInteractive: 3800,
    totalBlockingTime: 300,
    cumulativeLayoutShift: 0.1,
    // Bundle size thresholds (in KB)
    maxBundleSize: 300,
    maxPageSize: 150,
  },
  lighthouse: {
    categories: ['performance', 'accessibility', 'best-practices', 'seo'],
    minScores: {
      performance: 85,
      accessibility: 90,
      'best-practices': 85,
      seo: 85,
    },
  },
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Results tracking
const performanceResults = {
  timestamp: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
  },
  bundleAnalysis: {},
  pageMetrics: [],
  lighthouseScores: [],
  recommendations: [],
};

// Helper functions
function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}ℹ️ `,
    success: `${colors.green}✅ `,
    warning: `${colors.yellow}⚠️  `,
    error: `${colors.red}❌ `,
    metric: `${colors.cyan}📊 `,
  }[type] || '';

  console.log(`${prefix}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.magenta}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.magenta}${title}${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
}

function executeCommand(command, options = {}) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function analyzeBundleSize() {
  logSection('Bundle Size Analysis');

  // Build the application
  log('Building application for analysis...', 'info');
  const build = executeCommand('npm run build', { silent: true });

  if (!build.success) {
    log('Build failed', 'error');
    return false;
  }

  // Analyze .next directory
  const nextDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(nextDir)) {
    log('.next directory not found', 'error');
    return false;
  }

  // Calculate bundle sizes
  const getDirectorySize = (dir) => {
    let size = 0;
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        size += getDirectorySize(filePath);
      } else {
        size += stats.size;
      }
    });

    return size;
  };

  // Analyze static files
  const staticDir = path.join(nextDir, 'static');
  const staticSize = fs.existsSync(staticDir) ? getDirectorySize(staticDir) : 0;
  const staticSizeKB = Math.round(staticSize / 1024);

  log(`Static files size: ${staticSizeKB} KB`, 'metric');

  // Analyze chunks
  const chunksDir = path.join(staticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const chunks = fs.readdirSync(chunksDir);
    const jsChunks = chunks.filter(f => f.endsWith('.js'));

    log(`JavaScript chunks: ${jsChunks.length}`, 'metric');

    // Find largest chunks
    const chunkSizes = jsChunks.map(chunk => ({
      name: chunk,
      size: fs.statSync(path.join(chunksDir, chunk)).size,
    })).sort((a, b) => b.size - a.size);

    log('Largest chunks:', 'info');
    chunkSizes.slice(0, 5).forEach(chunk => {
      const sizeKB = Math.round(chunk.size / 1024);
      log(`  ${chunk.name}: ${sizeKB} KB`, 'metric');
    });

    performanceResults.bundleAnalysis.chunks = chunkSizes.slice(0, 10);
  }

  // Check against thresholds
  performanceResults.bundleAnalysis.totalSize = staticSizeKB;

  if (staticSizeKB > config.metrics.maxBundleSize) {
    log(`Bundle size exceeds threshold (${config.metrics.maxBundleSize} KB)`, 'warning');
    performanceResults.recommendations.push({
      type: 'bundle_size',
      severity: 'high',
      message: `Reduce bundle size from ${staticSizeKB} KB to under ${config.metrics.maxBundleSize} KB`,
      suggestions: [
        'Use dynamic imports for large components',
        'Remove unused dependencies',
        'Enable tree shaking',
        'Optimize images and assets',
      ],
    });
  } else {
    log('Bundle size within acceptable limits', 'success');
  }

  // Analyze CSS
  const cssFiles = fs.readdirSync(staticDir).filter(f => f.endsWith('.css'));
  const totalCssSize = cssFiles.reduce((sum, file) => {
    return sum + fs.statSync(path.join(staticDir, file)).size;
  }, 0);

  log(`CSS size: ${Math.round(totalCssSize / 1024)} KB`, 'metric');
  performanceResults.bundleAnalysis.cssSize = Math.round(totalCssSize / 1024);

  return true;
}

async function checkLighthouse(url) {
  logSection('Lighthouse Performance Audit');

  // Check if lighthouse is installed
  const lighthouseCheck = executeCommand('which lighthouse', { silent: true });

  if (!lighthouseCheck.success) {
    log('Lighthouse not installed', 'warning');
    log('Install with: npm install -g lighthouse', 'info');
    log('Skipping Lighthouse audit', 'warning');
    return true;
  }

  // Run lighthouse for each critical page
  for (const page of config.pages.filter(p => p.critical)) {
    log(`Auditing ${page.name}...`, 'info');

    const outputPath = path.join(process.cwd(), `lighthouse-${page.name.toLowerCase()}.json`);
    const command = `lighthouse ${url}${page.path} --output=json --output-path=${outputPath} --chrome-flags="--headless" --quiet`;

    const result = executeCommand(command, { silent: true });

    if (result.success && fs.existsSync(outputPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        const scores = {};

        // Extract scores
        config.lighthouse.categories.forEach(category => {
          const categoryData = report.categories[category];
          if (categoryData) {
            scores[category] = Math.round(categoryData.score * 100);
          }
        });

        // Log scores
        log(`${page.name} scores:`, 'metric');
        Object.entries(scores).forEach(([category, score]) => {
          const minScore = config.lighthouse.minScores[category];
          const status = score >= minScore ? 'success' : 'warning';
          log(`  ${category}: ${score}/100 (min: ${minScore})`, status);
        });

        // Extract performance metrics
        if (report.audits) {
          const metrics = {
            FCP: report.audits['first-contentful-paint']?.numericValue,
            LCP: report.audits['largest-contentful-paint']?.numericValue,
            TTI: report.audits['interactive']?.numericValue,
            TBT: report.audits['total-blocking-time']?.numericValue,
            CLS: report.audits['cumulative-layout-shift']?.numericValue,
          };

          log('Core Web Vitals:', 'metric');
          Object.entries(metrics).forEach(([metric, value]) => {
            if (value !== undefined) {
              const displayValue = metric === 'CLS' ? value.toFixed(3) : `${Math.round(value)}ms`;
              log(`  ${metric}: ${displayValue}`, 'metric');
            }
          });

          performanceResults.pageMetrics.push({
            page: page.name,
            path: page.path,
            metrics,
          });
        }

        performanceResults.lighthouseScores.push({
          page: page.name,
          scores,
        });

        // Clean up
        fs.unlinkSync(outputPath);
      } catch (error) {
        log(`Failed to parse Lighthouse results: ${error.message}`, 'error');
      }
    } else {
      log(`Failed to audit ${page.name}`, 'warning');
    }
  }

  return true;
}

async function measureLoadTime(url) {
  logSection('Page Load Time Measurement');

  for (const page of config.pages) {
    const fullUrl = url + page.path;
    log(`Measuring ${page.name}: ${fullUrl}`, 'info');

    const measurements = [];
    const iterations = 3;

    // Take multiple measurements
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        await new Promise((resolve, reject) => {
          const urlObj = new URL(fullUrl);
          const client = urlObj.protocol === 'https:' ? https : http;

          const req = client.get(fullUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              const loadTime = performance.now() - start;
              measurements.push(loadTime);
              resolve();
            });
          });

          req.on('error', reject);
          req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
        });
      } catch (error) {
        log(`Failed to measure ${page.name}: ${error.message}`, 'error');
      }
    }

    if (measurements.length > 0) {
      const avgLoadTime = Math.round(measurements.reduce((a, b) => a + b) / measurements.length);
      log(`Average load time: ${avgLoadTime}ms`, 'metric');

      // Check against threshold
      if (avgLoadTime > 3000) {
        log('Load time exceeds 3 seconds', 'warning');
        if (page.critical) {
          performanceResults.recommendations.push({
            type: 'load_time',
            severity: 'high',
            message: `${page.name} takes ${avgLoadTime}ms to load (target: <3000ms)`,
            suggestions: [
              'Optimize server response time',
              'Enable compression',
              'Use CDN for static assets',
              'Implement caching strategies',
            ],
          });
        }
      }
    }
  }

  return true;
}

function analyzePackageJson() {
  logSection('Package.json Analysis');

  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Check for performance-related dependencies
  const performanceDeps = {
    '@next/bundle-analyzer': 'Bundle size analysis',
    'compression': 'Response compression',
    'next-pwa': 'Progressive Web App support',
    'sharp': 'Image optimization',
  };

  log('Performance optimizations:', 'info');
  Object.entries(performanceDeps).forEach(([dep, description]) => {
    const hasDep = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
    if (hasDep) {
      log(`${dep}: Installed`, 'success');
    } else {
      log(`${dep}: Not installed (${description})`, 'warning');
    }
  });

  // Check Next.js version
  const nextVersion = packageJson.dependencies?.next;
  if (nextVersion) {
    log(`Next.js version: ${nextVersion}`, 'metric');

    // Check if using latest stable
    const versionMatch = nextVersion.match(/(\d+)\.(\d+)\.(\d+)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1]);
      if (major < 14) {
        performanceResults.recommendations.push({
          type: 'framework',
          severity: 'medium',
          message: 'Consider upgrading to Next.js 14+ for better performance',
          suggestions: [
            'Next.js 14 includes App Router with improved performance',
            'Better streaming and partial rendering support',
            'Improved build times and smaller bundles',
          ],
        });
      }
    }
  }

  return true;
}

function generatePerformanceReport() {
  logSection('Performance Report');

  // Calculate overall health
  let healthScore = 100;
  const issues = [];

  // Check bundle size
  if (performanceResults.bundleAnalysis.totalSize > config.metrics.maxBundleSize) {
    healthScore -= 20;
    issues.push('Bundle size exceeds threshold');
  }

  // Check Lighthouse scores
  performanceResults.lighthouseScores.forEach(result => {
    Object.entries(result.scores).forEach(([category, score]) => {
      const minScore = config.lighthouse.minScores[category];
      if (score < minScore) {
        healthScore -= 10;
        issues.push(`${result.page} ${category} score below threshold`);
      }
    });
  });

  // Display summary
  console.log(`\n${colors.cyan}Performance Health Score: ${healthScore}/100${colors.reset}`);

  if (issues.length > 0) {
    console.log(`\n${colors.yellow}Issues found:${colors.reset}`);
    issues.forEach(issue => console.log(`  - ${issue}`));
  }

  if (performanceResults.recommendations.length > 0) {
    console.log(`\n${colors.cyan}Recommendations:${colors.reset}`);
    performanceResults.recommendations.forEach(rec => {
      console.log(`\n${colors.yellow}${rec.severity.toUpperCase()}: ${rec.message}${colors.reset}`);
      rec.suggestions.forEach(suggestion => {
        console.log(`  • ${suggestion}`);
      });
    });
  }

  // Save detailed report
  const report = {
    ...performanceResults,
    summary: {
      healthScore,
      issues,
      timestamp: new Date().toISOString(),
    },
  };

  const reportPath = path.join(process.cwd(), 'performance-baseline.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(`\nDetailed report saved to: ${reportPath}`, 'info');

  return healthScore >= 70; // Pass if score is 70 or above
}

// Main function
async function main() {
  console.log(`${colors.magenta}🚀 6FB Booking Frontend Performance Baseline Test${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);

  const args = process.argv.slice(2);
  const url = args[0] || 'http://localhost:3000';

  if (args.includes('--help')) {
    console.log('Usage: node performance-baseline.js [url]');
    console.log('\nExamples:');
    console.log('  node performance-baseline.js');
    console.log('  node performance-baseline.js https://your-app.onrender.com');
    process.exit(0);
  }

  log(`Testing URL: ${url}`, 'info');

  // Run tests
  const tests = [
    analyzePackageJson,
    analyzeBundleSize,
    () => measureLoadTime(url),
    () => checkLighthouse(url),
  ];

  for (const test of tests) {
    const result = await test();
    if (!result) {
      log('Test failed, skipping remaining tests', 'error');
      break;
    }
  }

  // Generate report
  const passed = generatePerformanceReport();

  if (passed) {
    console.log(`\n${colors.green}✅ Performance baseline established successfully!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.yellow}⚠️  Performance needs improvement before deployment${colors.reset}`);
    process.exit(1);
  }
}

// Run the baseline test
main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
