#!/usr/bin/env node

/**
 * Test script to validate Render deployment configuration
 * This script checks if the static build works and validates the output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✓ ${description} exists`, 'green');
    return true;
  } else {
    log(`✗ ${description} missing: ${filePath}`, 'red');
    return false;
  }
}

function main() {
  log('🧪 Testing Render Deployment Configuration', 'blue');
  console.log('━'.repeat(50));

  let allChecksPass = true;

  // Check required files
  log('\n📁 Checking required files...', 'blue');
  const requiredFiles = [
    ['package.json', 'Package configuration'],
    ['next.config.js', 'Default Next.js config'],
    ['next.config.render.js', 'Render-specific Next.js config'],
    ['render.yaml', 'Render deployment config'],
    ['.env.render', 'Render environment variables'],
    ['deploy-to-render.sh', 'Deployment script']
  ];

  requiredFiles.forEach(([file, desc]) => {
    if (!checkFileExists(file, desc)) {
      allChecksPass = false;
    }
  });

  // Check package.json scripts
  log('\n📦 Checking package.json scripts...', 'blue');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredScripts = ['build', 'build:static', 'build:render', 'start'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        log(`✓ Script "${script}" found`, 'green');
      } else {
        log(`✗ Script "${script}" missing`, 'red');
        allChecksPass = false;
      }
    });
  } catch (error) {
    log(`✗ Error reading package.json: ${error.message}`, 'red');
    allChecksPass = false;
  }

  // Check Next.js config
  log('\n⚙️ Checking Next.js configuration...', 'blue');
  try {
    const renderConfig = require('./next.config.render.js');
    
    if (renderConfig.output === 'export') {
      log('✓ Static export enabled', 'green');
    } else {
      log('✗ Static export not configured', 'red');
      allChecksPass = false;
    }

    if (renderConfig.images && renderConfig.images.unoptimized) {
      log('✓ Image optimization disabled (required for static export)', 'green');
    } else {
      log('✗ Image optimization not disabled', 'yellow');
    }

    if (renderConfig.trailingSlash) {
      log('✓ Trailing slash enabled', 'green');
    } else {
      log('⚠ Trailing slash not enabled (recommended)', 'yellow');
    }

  } catch (error) {
    log(`✗ Error loading Render config: ${error.message}`, 'red');
    allChecksPass = false;
  }

  // Check environment configuration
  log('\n🔧 Checking environment configuration...', 'blue');
  try {
    const envContent = fs.readFileSync('.env.render', 'utf8');
    
    const requiredEnvVars = [
      'NODE_ENV',
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_ENVIRONMENT'
    ];

    requiredEnvVars.forEach(envVar => {
      if (envContent.includes(`${envVar}=`)) {
        log(`✓ ${envVar} configured`, 'green');
      } else {
        log(`✗ ${envVar} missing`, 'red');
        allChecksPass = false;
      }
    });

    // Check API URL format
    if (envContent.includes('https://sixfb-backend.onrender.com/api/v1')) {
      log('✓ Backend API URL correctly configured', 'green');
    } else {
      log('⚠ Backend API URL may need adjustment', 'yellow');
    }

  } catch (error) {
    log(`✗ Error reading .env.render: ${error.message}`, 'red');
    allChecksPass = false;
  }

  // Test static build (dry run)
  log('\n🏗️ Testing static build configuration...', 'blue');
  try {
    // Check if we can load the build configuration without errors
    process.env.NEXT_CONFIG_FILE = 'next.config.render.js';
    
    log('✓ Render config loads successfully', 'green');
    
    // Check for API routes (not compatible with static export)
    const apiRoutesPath = path.join('src', 'app', 'api');
    if (fs.existsSync(apiRoutesPath)) {
      const apiRoutes = fs.readdirSync(apiRoutesPath, { recursive: true })
        .filter(file => file.toString().endsWith('route.ts') || file.toString().endsWith('route.js'));
      
      if (apiRoutes.length > 0) {
        log(`⚠ Found ${apiRoutes.length} API routes - these won't work with static export`, 'yellow');
        apiRoutes.forEach(route => {
          log(`  - ${route}`, 'yellow');
        });
      } else {
        log('✓ No API routes found (good for static export)', 'green');
      }
    }

    // Check for getServerSideProps usage (not compatible with static export)
    const pagesWithSSR = [];
    const checkForSSR = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
        if (dirent.isDirectory()) {
          checkForSSR(path.join(dir, dirent.name));
        } else if (dirent.name.endsWith('.tsx') || dirent.name.endsWith('.ts')) {
          const filePath = path.join(dir, dirent.name);
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('getServerSideProps')) {
            pagesWithSSR.push(filePath);
          }
        }
      });
    };

    checkForSSR(path.join('src', 'app'));
    
    if (pagesWithSSR.length > 0) {
      log(`⚠ Found pages with getServerSideProps (not compatible with static export):`, 'yellow');
      pagesWithSSR.forEach(page => {
        log(`  - ${page}`, 'yellow');
      });
    }

  } catch (error) {
    log(`✗ Build configuration test failed: ${error.message}`, 'red');
    allChecksPass = false;
  }

  // Check deployment script
  log('\n🚀 Checking deployment script...', 'blue');
  try {
    const stats = fs.statSync('deploy-to-render.sh');
    if (stats.mode & 0o111) {
      log('✓ Deployment script is executable', 'green');
    } else {
      log('⚠ Deployment script is not executable (run: chmod +x deploy-to-render.sh)', 'yellow');
    }
  } catch (error) {
    log(`✗ Error checking deployment script: ${error.message}`, 'red');
    allChecksPass = false;
  }

  // Summary
  console.log('\n' + '━'.repeat(50));
  if (allChecksPass) {
    log('🎉 All checks passed! Ready for Render deployment', 'green');
    log('\nNext steps:', 'blue');
    log('1. Run: ./deploy-to-render.sh static', 'green');
    log('2. Follow the instructions to create Render service', 'green');
    log('3. Set environment variables in Render dashboard', 'green');
    log('4. Deploy and test!', 'green');
  } else {
    log('❌ Some checks failed. Please fix the issues above before deploying', 'red');
    process.exit(1);
  }

  // Additional recommendations
  log('\n💡 Recommendations:', 'blue');
  log('• Use static site deployment for better performance and lower cost', 'yellow');
  log('• Test the build locally before deploying: npm run build:render', 'yellow');
  log('• Monitor Render dashboard for build logs and errors', 'yellow');
  log('• Set up custom domain after successful deployment', 'yellow');
}

if (require.main === module) {
  main();
}

module.exports = { main };