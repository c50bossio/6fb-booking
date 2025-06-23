#!/usr/bin/env node

/**
 * Health Check Endpoint Monitor for 6FB Booking Frontend
 * Monitors the health of the deployed frontend application
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  endpoints: [
    {
      name: 'Homepage',
      path: '/',
      expectedStatus: 200,
      timeout: 30000,
      checkContent: '<html',
    },
    {
      name: 'API Health',
      path: '/api/health',
      expectedStatus: 200,
      timeout: 10000,
      checkContent: null,
    },
    {
      name: 'Login Page',
      path: '/login',
      expectedStatus: 200,
      timeout: 30000,
      checkContent: null,
    },
    {
      name: 'Static Assets',
      path: '/_next/static/css',
      expectedStatus: 200,
      timeout: 10000,
      checkContent: null,
      isPrefix: true,
    },
  ],
  retryAttempts: 3,
  retryDelay: 5000,
  checkInterval: 60000, // 1 minute
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

// Health check results
const healthResults = {
  checks: [],
  startTime: new Date(),
  healthy: true,
};

// Helper functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: `${colors.blue}ℹ️ `,
    success: `${colors.green}✅ `,
    warning: `${colors.yellow}⚠️  `,
    error: `${colors.red}❌ `,
  }[type] || '';

  console.log(`[${timestamp}] ${prefix}${message}${colors.reset}`);
}

function parseUrl(urlString) {
  try {
    const url = new URL(urlString);
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
    };
  } catch (error) {
    throw new Error(`Invalid URL: ${urlString}`);
  }
}

async function checkEndpoint(baseUrl, endpoint) {
  const url = parseUrl(baseUrl + endpoint.path);
  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const startTime = Date.now();
    const result = {
      name: endpoint.name,
      path: endpoint.path,
      status: 'unknown',
      statusCode: null,
      responseTime: null,
      error: null,
      timestamp: new Date().toISOString(),
    };

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.path,
      method: 'GET',
      timeout: endpoint.timeout,
      headers: {
        'User-Agent': '6FB-Health-Check-Monitor/1.0',
      },
    };

    const req = client.request(options, (res) => {
      result.statusCode = res.statusCode;
      result.responseTime = Date.now() - startTime;

      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        // Check status code
        if (endpoint.isPrefix && res.statusCode >= 200 && res.statusCode < 400) {
          result.status = 'healthy';
        } else if (res.statusCode === endpoint.expectedStatus) {
          result.status = 'healthy';
        } else {
          result.status = 'unhealthy';
          result.error = `Expected status ${endpoint.expectedStatus}, got ${res.statusCode}`;
        }

        // Check content if specified
        if (result.status === 'healthy' && endpoint.checkContent && body) {
          if (!body.includes(endpoint.checkContent)) {
            result.status = 'unhealthy';
            result.error = `Response does not contain expected content: ${endpoint.checkContent}`;
          }
        }

        resolve(result);
      });
    });

    req.on('error', (error) => {
      result.status = 'unhealthy';
      result.error = error.message;
      result.responseTime = Date.now() - startTime;
      resolve(result);
    });

    req.on('timeout', () => {
      req.destroy();
      result.status = 'unhealthy';
      result.error = 'Request timeout';
      result.responseTime = Date.now() - startTime;
      resolve(result);
    });

    req.end();
  });
}

async function performHealthCheck(baseUrl) {
  log(`Performing health check for: ${baseUrl}`, 'info');

  const results = [];
  let allHealthy = true;

  for (const endpoint of config.endpoints) {
    let result = null;
    let attempts = 0;

    // Retry logic
    while (attempts < config.retryAttempts) {
      attempts++;
      result = await checkEndpoint(baseUrl, endpoint);

      if (result.status === 'healthy') {
        break;
      } else if (attempts < config.retryAttempts) {
        log(`${endpoint.name} check failed, retrying in ${config.retryDelay / 1000}s...`, 'warning');
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }

    results.push(result);

    // Log result
    if (result.status === 'healthy') {
      log(`${result.name}: ${result.statusCode} (${result.responseTime}ms)`, 'success');
    } else {
      log(`${result.name}: ${result.error}`, 'error');
      allHealthy = false;
    }
  }

  return { results, allHealthy };
}

function generateHealthReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    duration: Date.now() - healthResults.startTime.getTime(),
    totalChecks: healthResults.checks.length,
    healthy: results.every(check => check.results.allHealthy),
    endpoints: results.flatMap(check => check.results.results),
  };

  // Calculate statistics
  const healthyChecks = report.endpoints.filter(e => e.status === 'healthy').length;
  const avgResponseTime = report.endpoints
    .filter(e => e.responseTime !== null)
    .reduce((sum, e) => sum + e.responseTime, 0) / report.endpoints.length || 0;

  report.statistics = {
    healthyEndpoints: healthyChecks,
    totalEndpoints: report.endpoints.length,
    uptime: (healthyChecks / report.endpoints.length * 100).toFixed(2) + '%',
    averageResponseTime: Math.round(avgResponseTime) + 'ms',
  };

  return report;
}

async function continuousMonitoring(baseUrl) {
  log(`Starting continuous health monitoring for: ${baseUrl}`, 'info');
  log(`Check interval: ${config.checkInterval / 1000} seconds`, 'info');
  log('Press Ctrl+C to stop monitoring\n', 'info');

  // Set up graceful shutdown
  process.on('SIGINT', () => {
    log('\nStopping health monitor...', 'info');

    // Generate final report
    const report = generateHealthReport(healthResults.checks);
    const reportPath = path.join(process.cwd(), 'health-check-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    log(`Health report saved to: ${reportPath}`, 'info');
    log(`Total uptime: ${report.statistics.uptime}`, 'info');
    log(`Average response time: ${report.statistics.averageResponseTime}`, 'info');

    process.exit(0);
  });

  // Initial check
  const initialCheck = await performHealthCheck(baseUrl);
  healthResults.checks.push({
    timestamp: new Date().toISOString(),
    results: initialCheck,
  });

  // Continuous monitoring loop
  setInterval(async () => {
    const check = await performHealthCheck(baseUrl);
    healthResults.checks.push({
      timestamp: new Date().toISOString(),
      results: check,
    });

    // Keep only last 100 checks in memory
    if (healthResults.checks.length > 100) {
      healthResults.checks = healthResults.checks.slice(-100);
    }

    // Alert on status change
    if (healthResults.checks.length >= 2) {
      const previousCheck = healthResults.checks[healthResults.checks.length - 2];
      const currentCheck = healthResults.checks[healthResults.checks.length - 1];

      if (previousCheck.results.allHealthy !== currentCheck.results.allHealthy) {
        if (currentCheck.results.allHealthy) {
          log('🎉 Service recovered and is now healthy!', 'success');
        } else {
          log('🚨 Service health degraded!', 'error');
        }
      }
    }
  }, config.checkInterval);
}

async function singleHealthCheck(baseUrl) {
  const check = await performHealthCheck(baseUrl);

  console.log(`\n${colors.cyan}Health Check Summary:${colors.reset}`);
  console.log(`URL: ${baseUrl}`);
  console.log(`Status: ${check.allHealthy ? `${colors.green}HEALTHY${colors.reset}` : `${colors.red}UNHEALTHY${colors.reset}`}`);

  // Generate report
  const report = generateHealthReport([{ timestamp: new Date().toISOString(), results: check }]);

  console.log(`\n${colors.cyan}Statistics:${colors.reset}`);
  console.log(`Healthy Endpoints: ${report.statistics.healthyEndpoints}/${report.statistics.totalEndpoints}`);
  console.log(`Average Response Time: ${report.statistics.averageResponseTime}`);

  // Save report
  const reportPath = path.join(process.cwd(), 'health-check-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\nReport saved to: ${reportPath}`, 'info');

  return check.allHealthy;
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`${colors.yellow}Usage:${colors.reset}`);
    console.log('  node health-check-monitor.js <url> [options]');
    console.log('\nOptions:');
    console.log('  --continuous    Run continuous monitoring');
    console.log('  --help          Show this help message');
    console.log('\nExamples:');
    console.log('  node health-check-monitor.js https://your-app.onrender.com');
    console.log('  node health-check-monitor.js http://localhost:3000 --continuous');
    process.exit(1);
  }

  if (args.includes('--help')) {
    console.log('Health Check Monitor for 6FB Booking Frontend');
    console.log('Monitors the health of your deployed application');
    process.exit(0);
  }

  const baseUrl = args[0].replace(/\/$/, ''); // Remove trailing slash
  const continuous = args.includes('--continuous');

  try {
    // Validate URL
    new URL(baseUrl);

    if (continuous) {
      await continuousMonitoring(baseUrl);
    } else {
      const isHealthy = await singleHealthCheck(baseUrl);
      process.exit(isHealthy ? 0 : 1);
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the monitor
main();
