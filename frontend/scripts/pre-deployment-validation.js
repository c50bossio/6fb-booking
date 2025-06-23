#!/usr/bin/env node

/**
 * Comprehensive Pre-deployment Validation Script for 6FB Booking Frontend
 * This script performs thorough validation of the frontend application before deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Validation results tracking
const validationResults = {
  passed: [],
  warnings: [],
  errors: [],
  metrics: {},
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

  console.log(`${prefix}${message}${colors.reset}`);

  // Track results
  if (type === 'success') validationResults.passed.push(message);
  if (type === 'warning') validationResults.warnings.push(message);
  if (type === 'error') validationResults.errors.push(message);
}

function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}📋 ${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
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

// Validation functions
function validateNodeVersion() {
  logSection('Node.js Version Check');

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  const minVersion = 18;

  if (majorVersion < minVersion) {
    log(`Node.js version ${minVersion} or higher is required (current: ${nodeVersion})`, 'error');
    return false;
  }

  log(`Node.js version: ${nodeVersion}`, 'success');
  validationResults.metrics.nodeVersion = nodeVersion;
  return true;
}

function validatePackageJson() {
  logSection('Package.json Validation');

  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    log('package.json not found', 'error');
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check required scripts
    const requiredScripts = ['dev', 'build', 'start', 'lint'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);

    if (missingScripts.length > 0) {
      log(`Missing required scripts: ${missingScripts.join(', ')}`, 'error');
      return false;
    }

    log('All required scripts found', 'success');

    // Check version
    if (!packageJson.version) {
      log('Package version not specified', 'warning');
    } else {
      log(`Package version: ${packageJson.version}`, 'success');
      validationResults.metrics.packageVersion = packageJson.version;
    }

    // Check engine requirements
    if (packageJson.engines) {
      log(`Engine requirements: ${JSON.stringify(packageJson.engines)}`, 'info');
    }

    return true;
  } catch (error) {
    log(`Failed to parse package.json: ${error.message}`, 'error');
    return false;
  }
}

function validateDependencies() {
  logSection('Dependencies Validation');

  // Check if package-lock.json exists
  const lockFilePath = path.join(process.cwd(), 'package-lock.json');
  if (!fs.existsSync(lockFilePath)) {
    log('package-lock.json not found', 'error');
    log('Run "npm install" to generate lock file', 'info');
    return false;
  }

  log('Package lock file found', 'success');

  // Check if node_modules exists
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log('node_modules not found', 'warning');
    log('Installing dependencies...', 'info');

    const install = executeCommand('npm ci', { silent: false });
    if (!install.success) {
      log('Failed to install dependencies', 'error');
      return false;
    }
  }

  // Check for outdated packages
  log('Checking for outdated packages...', 'info');
  const outdated = executeCommand('npm outdated --json', { silent: true });

  if (outdated.output && outdated.output.trim() !== '{}') {
    try {
      const outdatedPackages = JSON.parse(outdated.output);
      const criticalUpdates = Object.entries(outdatedPackages).filter(([_, info]) =>
        info.wanted !== info.current && info.type === 'dependencies'
      );

      if (criticalUpdates.length > 0) {
        log(`${criticalUpdates.length} packages have updates available`, 'warning');
        criticalUpdates.forEach(([name, info]) => {
          log(`  ${name}: ${info.current} → ${info.wanted}`, 'warning');
        });
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Security audit
  log('Running security audit...', 'info');
  const audit = executeCommand('npm audit --json', { silent: true });

  try {
    const auditResult = JSON.parse(audit.output || '{}');
    const vulnerabilities = auditResult.metadata?.vulnerabilities || {};
    const total = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);

    if (total > 0) {
      log(`Found ${total} vulnerabilities:`, 'warning');
      Object.entries(vulnerabilities).forEach(([level, count]) => {
        if (count > 0) {
          log(`  ${level}: ${count}`, level === 'critical' || level === 'high' ? 'error' : 'warning');
        }
      });

      if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
        log('Critical or high vulnerabilities found. Run "npm audit fix" to resolve.', 'error');
        return false;
      }
    } else {
      log('No security vulnerabilities found', 'success');
    }
  } catch (e) {
    log('Could not parse audit results', 'warning');
  }

  return true;
}

function validateEnvironmentVariables() {
  logSection('Environment Variables Validation');

  // Check for environment template files
  const envFiles = [
    '.env.production.example',
    '.env.example',
    '.env.template'
  ];

  let envTemplate = null;
  for (const file of envFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      envTemplate = filePath;
      break;
    }
  }

  if (!envTemplate) {
    log('No environment template file found', 'warning');
    log('Create .env.production.example with required variables', 'info');
    return true;
  }

  // Parse required environment variables
  const envContent = fs.readFileSync(envTemplate, 'utf8');
  const requiredVars = envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=')[0].trim())
    .filter(Boolean);

  log(`Found ${requiredVars.length} required environment variables`, 'info');

  // Check critical variables
  const criticalVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_APP_URL'
  ];

  const missingCritical = criticalVars.filter(varName =>
    requiredVars.includes(varName) && !process.env[varName]
  );

  if (missingCritical.length > 0) {
    log(`Missing critical environment variables: ${missingCritical.join(', ')}`, 'warning');
    log('These must be set in your deployment environment', 'info');
  }

  // Check all variables
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      log(`${varName}: Set`, 'success');
    } else {
      log(`${varName}: Not set (configure in deployment)`, 'warning');
    }
  });

  return true;
}

function validateBuildConfiguration() {
  logSection('Build Configuration Validation');

  // Check Next.js config
  const nextConfigPath = path.join(process.cwd(), 'next.config.js');
  if (!fs.existsSync(nextConfigPath)) {
    log('next.config.js not found', 'error');
    return false;
  }

  log('Next.js configuration found', 'success');

  // Check TypeScript config
  const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (!fs.existsSync(tsConfigPath)) {
    log('tsconfig.json not found', 'error');
    return false;
  }

  log('TypeScript configuration found', 'success');

  // Check Tailwind config
  const tailwindConfigPath = path.join(process.cwd(), 'tailwind.config.js');
  if (!fs.existsSync(tailwindConfigPath)) {
    log('tailwind.config.js not found', 'error');
    return false;
  }

  log('Tailwind CSS configuration found', 'success');

  // Check PostCSS config
  const postcssConfigPath = path.join(process.cwd(), 'postcss.config.js');
  if (!fs.existsSync(postcssConfigPath)) {
    log('postcss.config.js not found', 'error');
    return false;
  }

  log('PostCSS configuration found', 'success');

  return true;
}

function validateSourceCode() {
  logSection('Source Code Validation');

  // Check for required directories
  const requiredDirs = [
    'src/app',
    'src/components',
    'src/lib',
    'public'
  ];

  const missingDirs = requiredDirs.filter(dir =>
    !fs.existsSync(path.join(process.cwd(), dir))
  );

  if (missingDirs.length > 0) {
    log(`Missing required directories: ${missingDirs.join(', ')}`, 'error');
    return false;
  }

  log('All required directories found', 'success');

  // Check for app router structure
  const appDir = path.join(process.cwd(), 'src/app');
  const layoutPath = path.join(appDir, 'layout.tsx');
  const pagePath = path.join(appDir, 'page.tsx');

  if (!fs.existsSync(layoutPath)) {
    log('Root layout.tsx not found in app directory', 'error');
    return false;
  }

  if (!fs.existsSync(pagePath)) {
    log('Root page.tsx not found in app directory', 'error');
    return false;
  }

  log('App router structure validated', 'success');

  // Run linting
  log('Running ESLint...', 'info');
  const lint = executeCommand('npm run lint', { silent: true });

  if (!lint.success) {
    log('ESLint found issues', 'warning');
    log('Run "npm run lint" to see details', 'info');
  } else {
    log('ESLint passed', 'success');
  }

  // Check for TypeScript errors
  log('Checking TypeScript...', 'info');
  const tsc = executeCommand('npx tsc --noEmit', { silent: true });

  if (!tsc.success) {
    log('TypeScript compilation errors found', 'warning');
    log('Run "npx tsc --noEmit" to see details', 'info');
  } else {
    log('TypeScript validation passed', 'success');
  }

  return true;
}

function performBuildTest() {
  logSection('Production Build Test');

  log('Starting production build...', 'info');
  const startTime = Date.now();

  // Clean previous build
  const buildDir = path.join(process.cwd(), '.next');
  if (fs.existsSync(buildDir)) {
    log('Cleaning previous build...', 'info');
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  // Run build
  const build = executeCommand('npm run build', { silent: false });

  if (!build.success) {
    log('Build failed', 'error');
    return false;
  }

  const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`Build completed in ${buildTime}s`, 'success');
  validationResults.metrics.buildTime = buildTime;

  // Verify build output
  if (!fs.existsSync(buildDir)) {
    log('Build directory not created', 'error');
    return false;
  }

  // Check standalone output for deployment
  const standaloneDir = path.join(buildDir, 'standalone');
  if (fs.existsSync(standaloneDir)) {
    log('Standalone build created (optimized for deployment)', 'success');

    // Calculate build size
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

    const buildSize = getDirectorySize(buildDir);
    const buildSizeMB = (buildSize / (1024 * 1024)).toFixed(2);
    log(`Build size: ${buildSizeMB} MB`, 'info');
    validationResults.metrics.buildSize = buildSizeMB;

    if (buildSize > 100 * 1024 * 1024) {
      log('Build size exceeds 100MB', 'warning');
      log('Consider optimizing bundle size', 'info');
    }
  } else {
    log('Standalone build not created', 'warning');
    log('Add "output: \'standalone\'" to next.config.js for optimized deployment', 'info');
  }

  // Analyze bundle
  log('Analyzing bundle...', 'info');
  const pagesDir = path.join(buildDir, 'server/pages');
  const appDir = path.join(buildDir, 'server/app');

  if (fs.existsSync(pagesDir) || fs.existsSync(appDir)) {
    log('Server-side rendering enabled', 'success');
  }

  return true;
}

function checkResourceOptimization() {
  logSection('Resource Optimization Check');

  // Check image optimization
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    const images = files.filter(file =>
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
    );

    let largeImages = 0;
    images.forEach(image => {
      const filePath = path.join(publicDir, image);
      const stats = fs.statSync(filePath);
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB > 1) {
        largeImages++;
        log(`Large image: ${image} (${sizeMB.toFixed(2)} MB)`, 'warning');
      }
    });

    if (largeImages > 0) {
      log(`Found ${largeImages} large images`, 'warning');
      log('Consider optimizing images or using Next.js Image component', 'info');
    } else if (images.length > 0) {
      log('All images are optimized', 'success');
    }
  }

  // Check for unused dependencies
  log('Checking for unused dependencies...', 'info');
  const depcheck = executeCommand('npx depcheck --json', { silent: true });

  if (depcheck.success && depcheck.output) {
    try {
      const result = JSON.parse(depcheck.output);
      const unused = result.dependencies || [];

      if (unused.length > 0) {
        log(`Found ${unused.length} potentially unused dependencies:`, 'warning');
        unused.forEach(dep => log(`  - ${dep}`, 'warning'));
        log('Review and remove unused dependencies to reduce bundle size', 'info');
      } else {
        log('No unused dependencies found', 'success');
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  return true;
}

function generateValidationReport() {
  logSection('Validation Summary');

  const totalChecks = validationResults.passed.length +
                     validationResults.warnings.length +
                     validationResults.errors.length;

  console.log(`\n${colors.cyan}Validation Results:${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${validationResults.passed.length}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${validationResults.warnings.length}${colors.reset}`);
  console.log(`${colors.red}❌ Errors: ${validationResults.errors.length}${colors.reset}`);
  console.log(`Total checks: ${totalChecks}`);

  if (Object.keys(validationResults.metrics).length > 0) {
    console.log(`\n${colors.cyan}Metrics:${colors.reset}`);
    Object.entries(validationResults.metrics).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  // Generate report file
  const report = {
    timestamp: new Date().toISOString(),
    results: validationResults,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    recommendation: validationResults.errors.length === 0 ? 'READY_TO_DEPLOY' : 'FIX_ERRORS_FIRST'
  };

  const reportPath = path.join(process.cwd(), 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\nValidation report saved to: ${reportPath}`, 'info');

  return validationResults.errors.length === 0;
}

// Main validation function
async function runValidation() {
  console.log(`${colors.magenta}🚀 6FB Booking Frontend Pre-deployment Validation${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);

  const checks = [
    validateNodeVersion,
    validatePackageJson,
    validateDependencies,
    validateEnvironmentVariables,
    validateBuildConfiguration,
    validateSourceCode,
    performBuildTest,
    checkResourceOptimization,
  ];

  for (const check of checks) {
    const result = await check();
    if (!result && validationResults.errors.length > 0) {
      // Stop on critical errors
      break;
    }
  }

  const isValid = generateValidationReport();

  if (isValid) {
    console.log(`\n${colors.green}✅ All validations passed! Your frontend is ready for deployment.${colors.reset}`);
    console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
    console.log('1. Review any warnings above');
    console.log('2. Set environment variables in your deployment platform');
    console.log('3. Deploy using your preferred method');
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ Validation failed. Please fix the errors above before deploying.${colors.reset}`);
    process.exit(1);
  }
}

// Run validation
runValidation().catch(error => {
  console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
  process.exit(1);
});
