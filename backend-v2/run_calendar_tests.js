#!/usr/bin/env node

const { spawn } = require('child_process');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

// ANSI color codes (in case chalk is not installed)
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Simple logger
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  header: (msg) => {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.blue}${msg}${colors.reset}`);
    console.log('='.repeat(60) + '\n');
  }
};

// Check if services are running
async function checkServices() {
  log.header('🔍 Checking Required Services');
  
  const services = [
    { name: 'Backend API', url: 'http://localhost:8000/docs', port: 8000 },
    { name: 'Frontend App', url: 'http://localhost:3000', port: 3000 }
  ];
  
  const axios = require('axios').default;
  let allRunning = true;
  
  for (const service of services) {
    try {
      await axios.get(service.url, { timeout: 5000 });
      log.success(`${service.name} is running on port ${service.port}`);
    } catch (error) {
      log.error(`${service.name} is not running on port ${service.port}`);
      allRunning = false;
    }
  }
  
  // Check Redis
  try {
    const redis = require('redis');
    const client = redis.createClient();
    await client.connect();
    await client.ping();
    await client.quit();
    log.success('Redis is running');
  } catch (error) {
    log.warn('Redis is not running (some features may not work)');
  }
  
  return allRunning;
}

// Install dependencies
async function installDependencies() {
  log.header('📦 Checking Dependencies');
  
  const requiredPackages = ['puppeteer', 'axios'];
  const { execSync } = require('child_process');
  
  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      log.success(`${pkg} is installed`);
    } catch (e) {
      log.warn(`Installing ${pkg}...`);
      try {
        execSync(`npm install ${pkg}`, { stdio: 'inherit' });
        log.success(`${pkg} installed successfully`);
      } catch (installError) {
        log.error(`Failed to install ${pkg}`);
        return false;
      }
    }
  }
  
  return true;
}

// Run a test file
async function runTest(testFile, testName) {
  return new Promise((resolve) => {
    log.header(`🧪 Running ${testName}`);
    
    const startTime = Date.now();
    const test = spawn('node', [testFile], { stdio: 'inherit' });
    
    test.on('close', async (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (code === 0) {
        log.success(`${testName} completed successfully (${duration}s)`);
      } else {
        log.error(`${testName} failed with code ${code} (${duration}s)`);
      }
      
      resolve({ testName, success: code === 0, duration });
    });
    
    test.on('error', (err) => {
      log.error(`Failed to run ${testName}: ${err.message}`);
      resolve({ testName, success: false, error: err.message });
    });
  });
}

// Create test data
async function setupTestData() {
  log.header('🔧 Setting Up Test Data');
  
  try {
    const axios = require('axios').default;
    
    // Create test barber account
    try {
      await axios.post('http://localhost:8000/api/v1/auth/register', {
        email: 'barber@test.com',
        password: 'testpass123',
        first_name: 'Test',
        last_name: 'Barber',
        role: 'barber'
      });
      log.success('Test barber account created');
    } catch (e) {
      if (e.response?.status === 400) {
        log.info('Test barber account already exists');
      } else {
        throw e;
      }
    }
    
    // Set up barber availability
    // This would require authentication and more complex setup
    log.info('Test data setup complete');
    
    return true;
  } catch (error) {
    log.error(`Test data setup failed: ${error.message}`);
    return false;
  }
}

// Generate comprehensive report
async function generateReport(results) {
  log.header('📊 Test Report Generation');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    },
    results: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalDuration: results.reduce((sum, r) => sum + parseFloat(r.duration || 0), 0).toFixed(2)
    }
  };
  
  // Console report
  console.log('\n' + '='.repeat(60));
  console.log(colors.blue + 'FINAL TEST REPORT' + colors.reset);
  console.log('='.repeat(60));
  
  console.log(`\nTotal Tests: ${report.summary.total}`);
  console.log(`${colors.green}Passed: ${report.summary.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${report.summary.failed}${colors.reset}`);
  console.log(`Total Duration: ${report.summary.totalDuration}s`);
  console.log(`Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`);
  
  console.log('\nTest Results:');
  results.forEach(result => {
    const status = result.success ? colors.green + '✅' : colors.red + '❌';
    console.log(`  ${status} ${result.testName} (${result.duration}s)${colors.reset}`);
  });
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'calendar-test-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Check for screenshots
  try {
    const screenshotDirs = ['test-screenshots', 'test-screenshots/features'];
    let totalScreenshots = 0;
    
    for (const dir of screenshotDirs) {
      try {
        const files = await fs.readdir(dir);
        const screenshots = files.filter(f => f.endsWith('.png'));
        totalScreenshots += screenshots.length;
      } catch (e) {
        // Directory doesn't exist
      }
    }
    
    if (totalScreenshots > 0) {
      console.log(`📸 ${totalScreenshots} screenshots captured`);
    }
  } catch (e) {
    // Ignore screenshot counting errors
  }
  
  return report;
}

// Main test orchestrator
async function runAllTests() {
  console.clear();
  console.log(colors.blue + '🚀 BookedBarber Calendar System - Comprehensive Test Suite' + colors.reset);
  console.log('='.repeat(60));
  console.log('This will test the entire calendar booking system end-to-end\n');
  
  const startTime = Date.now();
  const results = [];
  
  try {
    // Check services
    const servicesRunning = await checkServices();
    if (!servicesRunning) {
      log.error('\nPlease start the required services:');
      log.info('  Backend: cd backend-v2 && uvicorn main:app --reload');
      log.info('  Frontend: cd backend-v2/frontend-v2 && npm run dev');
      log.info('  Redis: redis-server (optional)\n');
      process.exit(1);
    }
    
    // Install dependencies if needed
    const depsInstalled = await installDependencies();
    if (!depsInstalled) {
      log.error('Failed to install required dependencies');
      process.exit(1);
    }
    
    // Setup test data
    await setupTestData();
    
    // Run E2E tests
    const e2eResult = await runTest('./test_calendar_e2e_complete.js', 'E2E Complete Flow Test');
    results.push(e2eResult);
    
    // Run feature tests
    const featureResult = await runTest('./test_calendar_features.js', 'Feature-Specific Tests');
    results.push(featureResult);
    
    // Generate final report
    const report = await generateReport(results);
    
    // Calculate total time
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Total test execution time: ${totalTime}s`);
    
    // Exit with appropriate code
    const allPassed = results.every(r => r.success);
    if (allPassed) {
      console.log(colors.green + '\n🎉 All tests passed! The calendar system is working correctly.\n' + colors.reset);
      process.exit(0);
    } else {
      console.log(colors.red + '\n⚠️  Some tests failed. Please check the logs above.\n' + colors.reset);
      process.exit(1);
    }
    
  } catch (error) {
    log.error(`\nTest suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle interrupts gracefully
process.on('SIGINT', () => {
  console.log('\n\nTest suite interrupted by user');
  process.exit(1);
});

// Run the test suite
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };