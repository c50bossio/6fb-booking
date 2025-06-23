#!/usr/bin/env node

/**
 * Pre-deployment validation script for 6FB Booking Frontend
 * Checks for common issues before deploying to Render
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Validating frontend build configuration...\n');

let hasErrors = false;

// Check Node version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

  if (majorVersion < 18) {
    console.error('❌ Node.js version 18 or higher is required');
    console.error(`   Current version: ${nodeVersion}`);
    hasErrors = true;
  } else {
    console.log(`✅ Node.js version: ${nodeVersion}`);
  }
}

// Check required files
function checkRequiredFiles() {
  const requiredFiles = [
    'package.json',
    'package-lock.json',
    'next.config.js',
    'tsconfig.json',
    'tailwind.config.js',
    'postcss.config.js'
  ];

  console.log('\n📋 Checking required files:');

  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}`);
    } else {
      console.error(`❌ Missing: ${file}`);
      hasErrors = true;
    }
  });
}

// Check environment variables
function checkEnvironmentVariables() {
  console.log('\n🔐 Checking environment variables:');

  const envExample = path.join(process.cwd(), '.env.production.example');
  if (!fs.existsSync(envExample)) {
    console.warn('⚠️  No .env.production.example found to validate against');
    return;
  }

  const envContent = fs.readFileSync(envExample, 'utf8');
  const requiredVars = envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=')[0].trim())
    .filter(Boolean);

  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName} is set`);
    } else {
      console.warn(`⚠️  ${varName} is not set (will need to be set in Render)`);
    }
  });
}

// Check dependencies
function checkDependencies() {
  console.log('\n📦 Checking dependencies:');

  try {
    // Check if node_modules exists
    if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
      console.log('📥 Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });
    }

    // Run npm audit
    console.log('\n🔒 Running security audit:');
    try {
      execSync('npm audit --production', { stdio: 'inherit' });
      console.log('✅ No security vulnerabilities found');
    } catch (e) {
      console.warn('⚠️  Security vulnerabilities detected. Run "npm audit fix" to resolve.');
    }
  } catch (error) {
    console.error('❌ Failed to check dependencies:', error.message);
    hasErrors = true;
  }
}

// Test build
function testBuild() {
  console.log('\n🏗️  Testing production build:');

  try {
    console.log('Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed successfully');

    // Check build output
    const buildDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(buildDir)) {
      const stats = fs.statSync(buildDir);
      console.log(`✅ Build directory created: ${buildDir}`);

      // Check standalone directory for Render deployment
      const standaloneDir = path.join(buildDir, 'standalone');
      if (fs.existsSync(standaloneDir)) {
        console.log('✅ Standalone build created (optimized for deployment)');
      }
    } else {
      console.error('❌ Build directory not found');
      hasErrors = true;
    }
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    hasErrors = true;
  }
}

// Check for common issues
function checkCommonIssues() {
  console.log('\n🔍 Checking for common issues:');

  // Check for large files
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    files.forEach(file => {
      const filePath = path.join(publicDir, file);
      const stats = fs.statSync(filePath);
      const sizeMB = stats.size / (1024 * 1024);
      if (sizeMB > 5) {
        console.warn(`⚠️  Large file detected: public/${file} (${sizeMB.toFixed(2)}MB)`);
        console.warn('   Consider optimizing or moving to a CDN');
      }
    });
  }

  // Check package.json scripts
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!packageJson.scripts.build) {
    console.error('❌ Missing "build" script in package.json');
    hasErrors = true;
  } else {
    console.log('✅ Build script configured');
  }

  if (!packageJson.scripts.start) {
    console.error('❌ Missing "start" script in package.json');
    hasErrors = true;
  } else {
    console.log('✅ Start script configured');
  }
}

// Run all checks
function runValidation() {
  checkNodeVersion();
  checkRequiredFiles();
  checkEnvironmentVariables();
  checkDependencies();
  testBuild();
  checkCommonIssues();

  console.log('\n' + '='.repeat(50));

  if (hasErrors) {
    console.error('\n❌ Validation failed. Please fix the errors above before deploying.');
    process.exit(1);
  } else {
    console.log('\n✅ All checks passed! Your frontend is ready for deployment to Render.');
    console.log('\n📚 Next steps:');
    console.log('   1. Commit all changes: git add . && git commit -m "Prepare for deployment"');
    console.log('   2. Push to GitHub: git push origin main');
    console.log('   3. Follow the deployment guide in RENDER_FRONTEND_DEPLOYMENT_GUIDE.md');
  }
}

// Run validation
runValidation();
