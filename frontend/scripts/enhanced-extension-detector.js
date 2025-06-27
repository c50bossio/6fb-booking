#!/usr/bin/env node

/**
 * Enhanced Browser Extension Compatibility Detection System
 *
 * This script builds upon the existing extension handling system to provide
 * comprehensive detection, analysis, and resolution recommendations for
 * browser extension conflicts with the 6FB Booking Platform.
 *
 * Features:
 * - Automatic detection of problematic extensions
 * - Specific recommendations for each extension type
 * - Test extension interference with localhost
 * - Generate detailed compatibility reports
 * - Suggest browser configurations
 * - Real-time localhost connectivity testing
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

console.log('🔧 6FB Booking Platform - Enhanced Extension Compatibility Detector');
console.log('='.repeat(70));

// Load existing configuration
const configPath = path.join(process.cwd(), 'dev-extension-config.json');
const extensionConfigPath = path.join(process.cwd(), 'src', 'lib', 'extension-config.ts');

let existingConfig = {};
try {
  if (fs.existsSync(configPath)) {
    existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.warn('⚠️  Could not load existing config:', error.message);
}

// Enhanced extension detection database
const EXTENSION_DATABASE = {
  adBlockers: {
    patterns: [
      { name: 'uBlock Origin', indicators: ['uBlock', 'ublock'], chromeId: 'cjpalhdlnbpafiamejdnhcphjbkeiagm' },
      { name: 'AdBlock Plus', indicators: ['adblockplus', 'abp'], chromeId: 'cfhdojbkjhnklbpkdaibdccddilifddb' },
      { name: 'AdBlock', indicators: ['adblock'], chromeId: 'gighmmpiobklfepjocnamgkkbiglidom' },
      { name: 'Ghostery', indicators: ['ghostery'], chromeId: 'mlomiejdfkolichcflejclcbmpeaniij' },
      { name: 'Privacy Badger', indicators: ['privacybadger'], chromeId: 'pkehgijcmpdhfbdbbnkijodmdjhbjlgp' }
    ],
    risks: ['API requests blocked', 'CSS/JS resources blocked', 'localhost connectivity issues'],
    solutions: ['Add localhost to whitelist', 'Disable for development domain', 'Create exception rules']
  },
  corsModifiers: {
    patterns: [
      { name: 'CORS Unblock', indicators: ['cors-unblock', 'cors'], chromeId: 'lfhmikememgdcahcdlaciloancbhjino' },
      { name: 'Allow CORS', indicators: ['allow-cors'], chromeId: 'lhobafahddgcelffkeicbaginigeejlf' },
      { name: 'CORS Everywhere', indicators: ['cors-everywhere'], chromeId: 'dboaklophljenpcjkbbibpkbkpnigdda' },
      { name: 'ModHeader', indicators: ['modheader'], chromeId: 'idgpnmonknjnojddfkpgkljpfnnfcklj' }
    ],
    risks: ['Modified request headers', 'Authentication bypass', 'API response corruption'],
    solutions: ['Disable for localhost', 'Clear all custom headers', 'Add development domain exceptions']
  },
  developerTools: {
    patterns: [
      { name: 'React Developer Tools', indicators: ['react-devtools', '__REACT_DEVTOOLS_GLOBAL_HOOK__'], safe: true },
      { name: 'Redux DevTools', indicators: ['redux-devtools', '__REDUX_DEVTOOLS_EXTENSION__'], safe: true },
      { name: 'Vue.js devtools', indicators: ['vue-devtools'], safe: true },
      { name: 'Angular DevTools', indicators: ['angular-devtools'], safe: true },
      { name: 'Lighthouse', indicators: ['lighthouse'], safe: true }
    ],
    risks: ['Performance impact', 'State mutation', 'Hook interference'],
    solutions: ['Configure to minimize interference', 'Disable strict mode warnings', 'Use production builds for testing']
  },
  security: {
    patterns: [
      { name: 'HTTPS Everywhere', indicators: ['https-everywhere'], chromeId: 'gcbommkclmclpchllfjekcdonpmejbdp' },
      { name: 'Disconnect', indicators: ['disconnect'], chromeId: 'jeoacafpbcihiomhlakheieifhpjdfeo' },
      { name: 'DuckDuckGo Privacy Essentials', indicators: ['duckduckgo'], chromeId: 'bkdgflcldnnnapblkhphbgpggdiikppg' }
    ],
    risks: ['Request blocking', 'Tracking prevention conflicts', 'localhost security warnings'],
    solutions: ['Add localhost to trusted sites', 'Disable tracking protection for development', 'Configure security exceptions']
  },
  contentModifiers: {
    patterns: [
      { name: 'Grammarly', indicators: ['grammarly'], chromeId: 'kbfnbcaeplbcioakkpcpgfkobkghlhen' },
      { name: 'Honey', indicators: ['honey'], chromeId: 'bmnlcjabgnpnenekpadlanbbkooimhnj' },
      { name: 'LastPass', indicators: ['lastpass'], chromeId: 'hdokiejnpimakedhajhdlcegeplioahd' },
      { name: '1Password', indicators: ['1password'], safe: true },
      { name: 'Bitwarden', indicators: ['bitwarden'], safe: true }
    ],
    risks: ['Form injection', 'DOM modification', 'Input interference'],
    solutions: ['Disable form injection', 'Add development domain to ignore list', 'Use manual mode for testing']
  }
};

// Test suite for extension interference
const extensionTests = {
  // Test basic localhost connectivity
  async testLocalhostConnectivity() {
    console.log('\n🌐 Testing Localhost Connectivity...');
    const endpoints = [
      'http://localhost:3000',
      'http://localhost:8000',
      'http://localhost:8000/api/v1/auth/health',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8000'
    ];

    const results = {};
    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(endpoint, { timeout: 5000 });
        results[endpoint] = {
          status: 'success',
          statusCode: response.statusCode,
          responseTime: response.responseTime
        };
        console.log(`✅ ${endpoint}: ${response.statusCode} (${response.responseTime}ms)`);
      } catch (error) {
        results[endpoint] = {
          status: 'failed',
          error: error.message
        };
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
    return results;
  },

  // Test CORS headers
  async testCorsHeaders() {
    console.log('\n🔒 Testing CORS Headers...');
    try {
      const response = await this.makeRequest('http://localhost:8000/api/v1/auth/health', {
        headers: { 'Origin': 'http://localhost:3000' }
      });

      const corsHeaders = {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'access-control-allow-methods': response.headers['access-control-allow-methods'],
        'access-control-allow-headers': response.headers['access-control-allow-headers']
      };

      console.log('CORS Headers:', corsHeaders);
      return { success: true, headers: corsHeaders };
    } catch (error) {
      console.log('❌ CORS test failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Test CSP headers
  async testCSPHeaders() {
    console.log('\n🛡️ Testing CSP Headers...');
    try {
      const response = await this.makeRequest('http://localhost:3000');
      const csp = response.headers['content-security-policy'];

      if (csp) {
        console.log('✅ CSP Header found');
        const extensionFriendly = csp.includes('chrome-extension:') || csp.includes('moz-extension:');
        console.log(`Extension-friendly CSP: ${extensionFriendly ? '✅' : '❌'}`);
        return { success: true, csp, extensionFriendly };
      } else {
        console.log('⚠️  No CSP header found');
        return { success: false, message: 'No CSP header' };
      }
    } catch (error) {
      console.log('❌ CSP test failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Test for blocked resources
  async testResourceBlocking() {
    console.log('\n📦 Testing Resource Blocking...');
    const testResources = [
      'http://localhost:3000/_next/static/css/app.css',
      'http://localhost:3000/_next/static/js/app.js',
      'http://localhost:8000/api/v1/auth/health'
    ];

    const results = {};
    for (const resource of testResources) {
      try {
        const response = await this.makeRequest(resource);
        results[resource] = { blocked: false, status: response.statusCode };
        console.log(`✅ ${resource}: ${response.statusCode}`);
      } catch (error) {
        results[resource] = { blocked: true, error: error.message };
        console.log(`❌ ${resource}: ${error.message}`);
      }
    }
    return results;
  },

  // Helper method to make HTTP requests
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      const timeout = options.timeout || 10000;

      const startTime = Date.now();
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout
      }, (res) => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          responseTime
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }
};

// Extension detection methods
const extensionDetector = {
  // Detect extensions via browser automation (if available)
  async detectViaAutomation() {
    console.log('\n🔍 Attempting Extension Detection via Browser Automation...');

    // Check if we can use puppeteer for detection
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: false });
      const page = await browser.newPage();

      // Navigate to a test page
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

      // Check for extension indicators in the page context
      const extensions = await page.evaluate(() => {
        const detected = [];

        // Check for common extension globals
        const indicators = {
          'React Developer Tools': '__REACT_DEVTOOLS_GLOBAL_HOOK__',
          'Redux DevTools': '__REDUX_DEVTOOLS_EXTENSION__',
          'Grammarly': 'grammarly',
          'LastPass': 'lpxes',
          'Honey': 'honey'
        };

        for (const [name, indicator] of Object.entries(indicators)) {
          if (window[indicator]) {
            detected.push(name);
          }
        }

        return detected;
      });

      await browser.close();
      console.log('Detected extensions:', extensions);
      return extensions;
    } catch (error) {
      console.log('⚠️  Browser automation not available:', error.message);
      return [];
    }
  },

  // Generate extension-specific recommendations
  generateRecommendations(detectedExtensions) {
    const recommendations = [];

    for (const [category, config] of Object.entries(EXTENSION_DATABASE)) {
      for (const pattern of config.patterns) {
        const isDetected = detectedExtensions.some(ext =>
          pattern.indicators.some(indicator =>
            ext.toLowerCase().includes(indicator.toLowerCase())
          )
        );

        if (isDetected) {
          recommendations.push({
            extension: pattern.name,
            category,
            safe: pattern.safe || false,
            risks: config.risks,
            solutions: config.solutions,
            chromeId: pattern.chromeId
          });
        }
      }
    }

    return recommendations;
  }
};

// Report generator
const reportGenerator = {
  generateCompatibilityReport(testResults, detectedExtensions, recommendations) {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd()
      },
      testResults,
      detectedExtensions,
      recommendations,
      scores: this.calculateCompatibilityScores(testResults, recommendations),
      actionItems: this.generateActionItems(testResults, recommendations),
      browserConfigurations: this.generateBrowserConfigurations(),
      troubleshootingGuide: this.generateTroubleshootingGuide(recommendations)
    };

    return report;
  },

  calculateCompatibilityScores(testResults, recommendations) {
    let totalScore = 100;
    const deductions = {
      connectivityFailed: 30,
      corsIssues: 20,
      cspIssues: 15,
      resourceBlocked: 25,
      problematicExtension: 10
    };

    // Connectivity issues
    if (testResults.connectivity) {
      const failedEndpoints = Object.values(testResults.connectivity)
        .filter(result => result.status === 'failed').length;
      totalScore -= failedEndpoints * deductions.connectivityFailed;
    }

    // CORS issues
    if (testResults.cors && !testResults.cors.success) {
      totalScore -= deductions.corsIssues;
    }

    // CSP issues
    if (testResults.csp && (!testResults.csp.success || !testResults.csp.extensionFriendly)) {
      totalScore -= deductions.cspIssues;
    }

    // Resource blocking
    if (testResults.resources) {
      const blockedResources = Object.values(testResults.resources)
        .filter(result => result.blocked).length;
      totalScore -= blockedResources * (deductions.resourceBlocked / 3);
    }

    // Problematic extensions
    const problematicExtensions = recommendations.filter(rec => !rec.safe).length;
    totalScore -= problematicExtensions * deductions.problematicExtension;

    return {
      overall: Math.max(0, totalScore),
      breakdown: {
        connectivity: testResults.connectivity ? 'pass' : 'fail',
        cors: testResults.cors?.success ? 'pass' : 'fail',
        csp: testResults.csp?.extensionFriendly ? 'pass' : 'warning',
        resources: testResults.resources ? 'pass' : 'fail',
        extensions: problematicExtensions === 0 ? 'pass' : 'warning'
      }
    };
  },

  generateActionItems(testResults, recommendations) {
    const actionItems = [];

    // Connectivity issues
    if (testResults.connectivity) {
      const failedEndpoints = Object.entries(testResults.connectivity)
        .filter(([_, result]) => result.status === 'failed');

      if (failedEndpoints.length > 0) {
        actionItems.push({
          priority: 'high',
          category: 'connectivity',
          action: 'Fix localhost connectivity issues',
          details: `Failed endpoints: ${failedEndpoints.map(([url, _]) => url).join(', ')}`,
          commands: [
            'npm run dev (frontend)',
            'cd ../backend && uvicorn main:app --reload (backend)'
          ]
        });
      }
    }

    // Extension-specific actions
    recommendations.forEach(rec => {
      if (!rec.safe) {
        actionItems.push({
          priority: rec.category === 'corsModifiers' ? 'high' : 'medium',
          category: 'extension',
          action: `Configure ${rec.extension}`,
          details: rec.solutions.join(', '),
          extension: rec.extension,
          chromeId: rec.chromeId
        });
      }
    });

    // CSP configuration
    if (testResults.csp && !testResults.csp.extensionFriendly) {
      actionItems.push({
        priority: 'medium',
        category: 'configuration',
        action: 'Update CSP configuration',
        details: 'Add extension protocol support to CSP headers',
        file: 'middleware.ts'
      });
    }

    return actionItems.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });
  },

  generateBrowserConfigurations() {
    return {
      chrome: {
        developerFlags: [
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--allow-running-insecure-content',
          '--disable-backgrounding-occluded-windows'
        ],
        extensionSettings: {
          'uBlock Origin': {
            action: 'whitelist',
            domains: ['localhost:3000', 'localhost:8000', '127.0.0.1:3000', '127.0.0.1:8000'],
            instructions: 'Click uBlock icon → Dashboard → Whitelist → Add domains'
          },
          'Privacy Badger': {
            action: 'disable',
            domains: ['localhost', '127.0.0.1'],
            instructions: 'Click Privacy Badger icon → Disable on this site'
          }
        }
      },
      firefox: {
        aboutConfigSettings: {
          'dom.security.https_only_mode': false,
          'security.tls.insecure_fallback_hosts': 'localhost,127.0.0.1',
          'network.stricttransportsecurity.preloadlist': false
        },
        instructions: 'Type about:config in address bar and modify settings'
      },
      safari: {
        settings: {
          'Intelligent Tracking Prevention': 'disabled',
          'Block all cookies': 'disabled',
          'Popup blocking': 'disabled for localhost'
        },
        instructions: 'Safari → Preferences → Privacy → Disable ITP for development'
      }
    };
  },

  generateTroubleshootingGuide(recommendations) {
    return {
      quickFixes: [
        {
          issue: 'API requests failing',
          solutions: [
            'Test in incognito mode',
            'Disable ad blockers',
            'Check browser console for CORS errors',
            'Verify backend is running on port 8000'
          ]
        },
        {
          issue: 'CSS/JS not loading',
          solutions: [
            'Clear browser cache',
            'Disable content modifying extensions',
            'Check network tab for blocked resources',
            'Verify frontend is running on port 3000'
          ]
        },
        {
          issue: 'Authentication issues',
          solutions: [
            'Disable CORS modifying extensions',
            'Clear cookies and localStorage',
            'Check for header modification extensions',
            'Test with extensions disabled'
          ]
        }
      ],
      testingSteps: [
        '1. Test in incognito/private mode',
        '2. Disable all extensions',
        '3. Re-enable safe extensions only',
        '4. Configure problematic extensions',
        '5. Test each feature thoroughly',
        '6. Document working configuration'
      ],
      diagnosticCommands: [
        'curl -I http://localhost:3000',
        'curl -I http://localhost:8000/api/v1/auth/health',
        'npm run build',
        'npm run test'
      ]
    };
  }
};

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Enhanced Extension Compatibility Detection...\n');

    // Run all tests
    console.log('📊 Running Compatibility Tests...');
    const testResults = {
      connectivity: await extensionTests.testLocalhostConnectivity(),
      cors: await extensionTests.testCorsHeaders(),
      csp: await extensionTests.testCSPHeaders(),
      resources: await extensionTests.testResourceBlocking()
    };

    // Detect extensions
    console.log('\n🔍 Detecting Browser Extensions...');
    const detectedExtensions = await extensionDetector.detectViaAutomation();

    // Generate recommendations
    console.log('\n💡 Generating Recommendations...');
    const recommendations = extensionDetector.generateRecommendations(detectedExtensions);

    // Generate comprehensive report
    console.log('\n📋 Generating Compatibility Report...');
    const report = reportGenerator.generateCompatibilityReport(
      testResults,
      detectedExtensions,
      recommendations
    );

    // Save report
    const reportPath = path.join(process.cwd(), 'enhanced-extension-compatibility-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Display summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPATIBILITY SUMMARY');
    console.log('='.repeat(70));

    console.log(`Overall Compatibility Score: ${report.scores.overall}/100`);
    console.log('\nTest Results:');
    Object.entries(report.scores.breakdown).forEach(([test, result]) => {
      const icon = result === 'pass' ? '✅' : result === 'warning' ? '⚠️' : '❌';
      console.log(`  ${icon} ${test}: ${result.toUpperCase()}`);
    });

    if (report.actionItems.length > 0) {
      console.log('\n🔧 ACTION ITEMS (Priority Order):');
      report.actionItems.slice(0, 5).forEach((item, index) => {
        const priority = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
        console.log(`  ${index + 1}. ${priority} ${item.action}`);
        console.log(`     ${item.details}`);
      });
    }

    console.log('\n📄 Reports Generated:');
    console.log(`  • Enhanced Report: ${reportPath}`);
    console.log(`  • Legacy Report: ${path.join(process.cwd(), 'extension-conflict-report.json')}`);

    console.log('\n🛠️  Next Steps:');
    console.log('  1. Review the enhanced compatibility report');
    console.log('  2. Follow the action items in priority order');
    console.log('  3. Test in incognito mode if issues persist');
    console.log('  4. Configure extensions using the browser-specific guides');
    console.log('  5. Re-run this script after making changes');

    console.log('\n💡 Quick Test Commands:');
    console.log('  • Test frontend: curl -I http://localhost:3000');
    console.log('  • Test backend: curl -I http://localhost:8000/api/v1/auth/health');
    console.log('  • Run existing tests: node scripts/test-extensions.js');

    // Return success/failure based on score
    const success = report.scores.overall >= 80;
    if (!success) {
      console.log('\n⚠️  Low compatibility score detected. Please address the action items above.');
      process.exit(1);
    } else {
      console.log('\n🎉 Good compatibility score! Your development environment should work well.');
    }

  } catch (error) {
    console.error('❌ Enhanced detection failed:', error.message);
    console.error('Falling back to basic extension tests...');

    // Fallback to existing test script
    try {
      execSync('node scripts/test-extensions.js', { stdio: 'inherit' });
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
      process.exit(1);
    }
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n👋 Extension detection interrupted. Cleaning up...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  extensionTests,
  extensionDetector,
  reportGenerator,
  EXTENSION_DATABASE
};
