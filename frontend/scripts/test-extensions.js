#!/usr/bin/env node

/**
 * Browser Extension Conflict Testing Script
 *
 * This script helps identify and resolve browser extension conflicts
 * with the 6FB Booking Platform.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 6FB Booking Platform - Extension Conflict Tester');
console.log('='.repeat(50));

// Test functions
const tests = {
  async testApiConnectivity() {
    console.log('\n📡 Testing API Connectivity...');
    try {
      // Check if backend is running
      const response = await fetch('http://localhost:8000/api/v1/health');
      if (response.ok) {
        console.log('✅ Backend API is accessible');
        return true;
      } else {
        console.log('❌ Backend API returned error:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ Backend API is not accessible:', error.message);
      console.log('💡 Make sure to start the backend: cd backend && uvicorn main:app --reload');
      return false;
    }
  },

  testFrontendBuild() {
    console.log('\n🏗️ Testing Frontend Build...');
    try {
      execSync('npm run build', { stdio: 'pipe', cwd: process.cwd() });
      console.log('✅ Frontend builds successfully');
      return true;
    } catch (error) {
      console.log('❌ Frontend build failed');
      console.log('Error output:', error.stdout?.toString() || error.message);
      return false;
    }
  },

  testTypeScript() {
    console.log('\n📝 Testing TypeScript...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: process.cwd() });
      console.log('✅ TypeScript compilation successful');
      return true;
    } catch (error) {
      console.log('⚠️  TypeScript has some issues (this might be okay in development)');
      const output = error.stdout?.toString() || error.message;
      if (output.includes('error TS')) {
        console.log('TypeScript errors found. Check the output above.');
      }
      return false;
    }
  },

  checkCSPConfiguration() {
    console.log('\n🛡️ Checking CSP Configuration...');
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');
    if (fs.existsSync(middlewarePath)) {
      console.log('✅ CSP middleware file exists');
      const content = fs.readFileSync(middlewarePath, 'utf8');
      if (content.includes('Content-Security-Policy')) {
        console.log('✅ CSP headers are configured');
        return true;
      } else {
        console.log('⚠️  CSP headers not found in middleware');
        return false;
      }
    } else {
      console.log('❌ CSP middleware file not found');
      return false;
    }
  },

  generateExtensionReport() {
    console.log('\n📊 Generating Extension Conflict Report...');

    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      recommendations: {
        safeExtensions: [
          'React Developer Tools',
          'Redux DevTools',
          '1Password',
          'Bitwarden',
          'Grammarly (with form injection disabled)',
        ],
        problematicExtensions: [
          'uBlock Origin (configure to whitelist localhost)',
          'AdBlock Plus (disable for localhost)',
          'Privacy Badger (add localhost to whitelist)',
          'Ghostery (disable for development)',
          'CORS Everywhere (disable for localhost)',
          'ModHeader (clear CSP rules)',
          'Requestly (remove CSP modifications)',
        ],
        testingSteps: [
          '1. Test in incognito/private mode',
          '2. Disable all extensions',
          '3. Re-enable extensions one by one',
          '4. Configure problematic extensions',
          '5. Clear browser cache completely',
        ],
      },
      browserSpecificIssues: {
        chrome: [
          'React DevTools interference with hooks',
          'Manifest V3 extension compatibility',
          'Performance monitoring extensions',
        ],
        firefox: [
          'Enhanced Tracking Protection',
          'Strict security settings',
          'Add-on compatibility issues',
        ],
        safari: [
          'Intelligent Tracking Prevention',
          'Website tracking settings',
          'Extension sandboxing',
        ],
      },
      developmentTips: [
        'Create a separate browser profile for development',
        'Use incognito mode for testing',
        'Keep a list of working extension configurations',
        'Test across multiple browsers',
        'Use browser developer tools for debugging',
      ],
    };

    const reportPath = path.join(process.cwd(), 'extension-conflict-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Report saved to: ${reportPath}`);

    return report;
  }
};

// Main execution
async function main() {
  const results = {};

  // Run all tests
  results.apiConnectivity = await tests.testApiConnectivity();
  results.frontendBuild = tests.testFrontendBuild();
  results.typeScript = tests.testTypeScript();
  results.cspConfiguration = tests.checkCSPConfiguration();

  // Generate report
  const report = tests.generateExtensionReport();

  // Summary
  console.log('\n📋 Test Summary:');
  console.log('='.repeat(30));

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const allPassed = Object.values(results).every(result => result);

  if (allPassed) {
    console.log('\n🎉 All tests passed! The app should work correctly.');
    console.log('If you\'re still experiencing issues, they\'re likely browser extension related.');
  } else {
    console.log('\n⚠️  Some tests failed. Address these issues first before troubleshooting extensions.');
  }

  console.log('\n🔧 Next Steps:');
  console.log('1. Read the full troubleshooting guide: BROWSER_EXTENSION_TROUBLESHOOTING.md');
  console.log('2. Test in incognito/private mode');
  console.log('3. Check the generated report: extension-conflict-report.json');
  console.log('4. Configure problematic extensions using dev-extension-config.json');

  console.log('\n💡 Quick Commands:');
  console.log('• Test API: curl -X GET "http://localhost:8000/api/v1/health"');
  console.log('• Start frontend: npm run dev');
  console.log('• Start backend: cd ../backend && uvicorn main:app --reload');
  console.log('• Clear npm cache: npm cache clean --force');
  console.log('• Reinstall dependencies: rm -rf node_modules package-lock.json && npm install');
}

// Run the main function
main().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});
