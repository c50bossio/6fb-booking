#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

/**
 * Build Validation Script
 *
 * This script runs comprehensive validation checks before and after builds.
 * It can be run standalone or integrated into the build process.
 */

class BuildValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = path.join(__dirname, '..');
  }

  async validate() {
    console.log(chalk.bold('\n🔍 Running Build Validation...\n'));

    const startTime = Date.now();

    // Run all validation checks
    await Promise.all([
      this.checkDependencies(),
      this.checkEnvironmentVariables(),
      this.validateProjectStructure(),
      this.checkForDuplicateComponents(),
      this.validateImports(),
      this.checkBundleSize(),
      this.validateTypeScript(),
      this.checkForSecurityIssues()
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Report results
    this.reportResults(duration);

    // Exit with appropriate code
    if (this.errors.length > 0) {
      process.exit(1);
    }
  }

  async checkDependencies() {
    try {
      // Check for duplicate packages
      const packageLock = require(path.join(this.projectRoot, 'package-lock.json'));
      const duplicates = this.findDuplicatePackages(packageLock);

      if (duplicates.length > 0) {
        this.warnings.push({
          type: 'DUPLICATE_DEPENDENCIES',
          message: 'Duplicate packages detected',
          details: duplicates.map(d => `  - ${d.name}: ${d.versions.join(', ')}`).join('\n')
        });
      }

      // Check for security vulnerabilities
      try {
        execSync('npm audit --json', { cwd: this.projectRoot });
      } catch (err) {
        const audit = JSON.parse(err.stdout.toString());
        if (audit.metadata.vulnerabilities.high > 0 || audit.metadata.vulnerabilities.critical > 0) {
          this.errors.push({
            type: 'SECURITY_VULNERABILITIES',
            message: 'High or critical vulnerabilities found',
            details: `Run 'npm audit' for details`
          });
        }
      }
    } catch (err) {
      this.warnings.push({
        type: 'DEPENDENCY_CHECK_FAILED',
        message: 'Failed to check dependencies',
        details: err.message
      });
    }
  }

  async checkEnvironmentVariables() {
    const requiredEnvVars = [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
    ];

    const missing = requiredEnvVars.filter(v => !process.env[v]);

    if (missing.length > 0) {
      this.warnings.push({
        type: 'MISSING_ENV_VARS',
        message: 'Required environment variables missing',
        details: missing.map(v => `  - ${v}`).join('\n')
      });
    }
  }

  async validateProjectStructure() {
    const expectedStructure = [
      'src/app',
      'src/components',
      'src/lib',
      'src/hooks',
      'public',
      'build-validation'
    ];

    const missing = expectedStructure.filter(dir =>
      !fs.existsSync(path.join(this.projectRoot, dir))
    );

    if (missing.length > 0) {
      this.warnings.push({
        type: 'MISSING_DIRECTORIES',
        message: 'Expected project directories missing',
        details: missing.map(d => `  - ${d}`).join('\n')
      });
    }
  }

  async checkForDuplicateComponents() {
    const componentsDir = path.join(this.projectRoot, 'src/components');
    const componentMap = new Map();

    this.scanDirectory(componentsDir, (filePath) => {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        const name = path.basename(filePath, path.extname(filePath));
        const simplifiedName = name.replace(/(Enhanced|New|V2|2)/, '');

        if (!componentMap.has(simplifiedName)) {
          componentMap.set(simplifiedName, []);
        }
        componentMap.get(simplifiedName).push(filePath);
      }
    });

    for (const [name, files] of componentMap) {
      if (files.length > 1) {
        this.errors.push({
          type: 'DUPLICATE_COMPONENT',
          message: `Duplicate component: ${name}`,
          details: files.map(f => `  - ${path.relative(this.projectRoot, f)}`).join('\n')
        });
      }
    }
  }

  async validateImports() {
    const srcDir = path.join(this.projectRoot, 'src');
    const circularImports = [];
    const absoluteImports = [];

    this.scanDirectory(srcDir, (filePath) => {
      if (!this.isSourceFile(filePath)) return;

      const content = fs.readFileSync(filePath, 'utf8');
      const imports = this.extractImports(content);

      imports.forEach(imp => {
        // Check for absolute imports that should be relative
        if (imp.startsWith('/') && !imp.startsWith('/@')) {
          absoluteImports.push({
            file: path.relative(this.projectRoot, filePath),
            import: imp
          });
        }
      });
    });

    if (absoluteImports.length > 0) {
      this.warnings.push({
        type: 'ABSOLUTE_IMPORTS',
        message: 'Absolute imports detected',
        details: absoluteImports.slice(0, 5).map(a =>
          `  - ${a.file}: ${a.import}`
        ).join('\n')
      });
    }
  }

  async checkBundleSize() {
    const buildDir = path.join(this.projectRoot, '.next');
    if (!fs.existsSync(buildDir)) {
      return; // No build to check
    }

    try {
      const buildManifest = require(path.join(buildDir, 'build-manifest.json'));
      const chunks = Object.values(buildManifest.pages).flat();

      const oversizedChunks = [];
      const chunkSizeLimit = 200 * 1024; // 200KB

      chunks.forEach(chunk => {
        const chunkPath = path.join(buildDir, 'static', chunk);
        if (fs.existsSync(chunkPath)) {
          const stats = fs.statSync(chunkPath);
          if (stats.size > chunkSizeLimit) {
            oversizedChunks.push({
              chunk: path.basename(chunk),
              size: (stats.size / 1024).toFixed(2) + 'KB'
            });
          }
        }
      });

      if (oversizedChunks.length > 0) {
        this.warnings.push({
          type: 'LARGE_CHUNKS',
          message: 'Large JavaScript chunks detected',
          details: oversizedChunks.slice(0, 5).map(c =>
            `  - ${c.chunk}: ${c.size}`
          ).join('\n')
        });
      }
    } catch (err) {
      // Build manifest not available
    }
  }

  async validateTypeScript() {
    try {
      const result = execSync('npx tsc --noEmit --pretty false', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
    } catch (err) {
      const output = err.stdout ? err.stdout.toString() : '';
      const errorCount = (output.match(/error TS/g) || []).length;

      if (errorCount > 0) {
        this.warnings.push({
          type: 'TYPESCRIPT_ERRORS',
          message: `TypeScript compilation errors: ${errorCount}`,
          details: 'Run `npm run type-check` for details'
        });
      }
    }
  }

  async checkForSecurityIssues() {
    const srcDir = path.join(this.projectRoot, 'src');
    const issues = [];

    this.scanDirectory(srcDir, (filePath) => {
      if (!this.isSourceFile(filePath)) return;

      const content = fs.readFileSync(filePath, 'utf8');

      // Check for common security issues
      const patterns = [
        { pattern: /dangerouslySetInnerHTML/g, issue: 'Dangerous HTML injection' },
        { pattern: /eval\(/g, issue: 'eval() usage' },
        { pattern: /innerHTML\s*=/g, issue: 'Direct innerHTML assignment' },
        { pattern: /document\.write/g, issue: 'document.write usage' },
        { pattern: /(api_key|apiKey|api_secret|private_key|secret_key)\s*[:=]\s*["'][^"']+["']/gi, issue: 'Hardcoded secrets' }
      ];

      patterns.forEach(({ pattern, issue }) => {
        const matches = content.match(pattern);
        if (matches) {
          issues.push({
            file: path.relative(this.projectRoot, filePath),
            issue,
            count: matches.length
          });
        }
      });
    });

    if (issues.length > 0) {
      this.errors.push({
        type: 'SECURITY_ISSUES',
        message: 'Potential security issues detected',
        details: issues.slice(0, 10).map(i =>
          `  - ${i.file}: ${i.issue} (${i.count})`
        ).join('\n')
      });
    }
  }

  // Helper methods
  findDuplicatePackages(packageLock) {
    const packages = new Map();

    const traverse = (deps) => {
      Object.entries(deps || {}).forEach(([name, info]) => {
        if (!packages.has(name)) {
          packages.set(name, new Set());
        }
        packages.get(name).add(info.version);

        if (info.dependencies) {
          traverse(info.dependencies);
        }
      });
    };

    traverse(packageLock.dependencies);

    return Array.from(packages.entries())
      .filter(([_, versions]) => versions.size > 1)
      .map(([name, versions]) => ({
        name,
        versions: Array.from(versions)
      }));
  }

  scanDirectory(dir, callback) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        this.scanDirectory(filePath, callback);
      } else if (stat.isFile()) {
        callback(filePath);
      }
    });
  }

  isSourceFile(filePath) {
    return /\.(ts|tsx|js|jsx)$/.test(filePath) &&
           !filePath.includes('node_modules') &&
           !filePath.includes('.next');
  }

  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:{[^}]+}|[^'"]+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  reportResults(duration) {
    console.log('\n' + chalk.bold('Build Validation Results'));
    console.log('=' .repeat(60));

    const totalIssues = this.errors.length + this.warnings.length;

    if (totalIssues === 0) {
      console.log(chalk.green('✅ All validation checks passed!'));
      console.log(chalk.gray(`Completed in ${duration}s`));
      return;
    }

    if (this.errors.length > 0) {
      console.log('\n' + chalk.red.bold(`❌ Errors (${this.errors.length}):`));
      this.errors.forEach((error, index) => {
        console.log('\n' + chalk.red(`${index + 1}. ${error.type}`));
        console.log(chalk.red(`   ${error.message}`));
        if (error.details) {
          console.log(chalk.gray(error.details));
        }
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n' + chalk.yellow.bold(`⚠️  Warnings (${this.warnings.length}):`));
      this.warnings.forEach((warning, index) => {
        console.log('\n' + chalk.yellow(`${index + 1}. ${warning.type}`));
        console.log(chalk.yellow(`   ${warning.message}`));
        if (warning.details) {
          console.log(chalk.gray(warning.details));
        }
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log(chalk.gray(`Completed in ${duration}s`));

    if (this.errors.length > 0) {
      console.log('\n' + chalk.red.bold('❌ Build validation failed!'));
      console.log(chalk.gray('Fix the errors above before proceeding.\n'));
    } else {
      console.log('\n' + chalk.yellow.bold('⚠️  Build validation completed with warnings.'));
      console.log(chalk.gray('Consider addressing the warnings above.\n'));
    }
  }
}

// Run validation
const validator = new BuildValidator();
validator.validate().catch(err => {
  console.error(chalk.red('Validation failed:'), err);
  process.exit(1);
});
