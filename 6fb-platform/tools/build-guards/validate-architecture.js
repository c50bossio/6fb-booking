#!/usr/bin/env node

/**
 * Build-time validation to ensure clean architecture
 * Run this before builds to catch architecture violations
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class ArchitectureValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate() {
    console.log('🏗️  Validating architecture...\n');

    this.validatePackageStructure();
    this.validateNoDuplicateTypes();
    this.validateNoDuplicateEndpoints();
    this.validateDependencyDirection();
    this.validateNoBusinessLogicInUI();

    this.reportResults();
  }

  validatePackageStructure() {
    const requiredPackages = ['core', 'api', 'web', 'ui'];
    const packagesDir = path.join(__dirname, '../../packages');

    requiredPackages.forEach(pkg => {
      const pkgPath = path.join(packagesDir, pkg);
      if (!fs.existsSync(pkgPath)) {
        this.errors.push(`Missing required package: ${pkg}`);
      } else {
        // Check for required structure
        const requiredFiles = ['package.json', 'tsconfig.lib.json', 'src/index.ts'];
        requiredFiles.forEach(file => {
          if (!fs.existsSync(path.join(pkgPath, file))) {
            this.errors.push(`Missing required file in ${pkg}: ${file}`);
          }
        });
      }
    });
  }

  validateNoDuplicateTypes() {
    const coreTypes = this.findTypeDefinitions('packages/core/src/types');
    const otherPackages = ['api', 'web', 'ui', 'mobile'];

    otherPackages.forEach(pkg => {
      const pkgTypes = this.findTypeDefinitions(`packages/${pkg}/src`);

      pkgTypes.forEach(type => {
        if (coreTypes.includes(type)) {
          this.errors.push(`Duplicate type definition '${type}' found in ${pkg}. Should only exist in core.`);
        }
      });
    });
  }

  validateNoDuplicateEndpoints() {
    const apiEndpoints = this.findAPIEndpoints('packages/api/src');
    const duplicates = this.findDuplicates(apiEndpoints);

    duplicates.forEach(dup => {
      this.errors.push(`Duplicate API endpoint: ${dup}`);
    });
  }

  validateDependencyDirection() {
    // Check that dependencies only flow in allowed directions
    const packages = ['core', 'api', 'web', 'ui', 'mobile'];

    packages.forEach(pkg => {
      const pkgJsonPath = path.join(__dirname, `../../packages/${pkg}/package.json`);
      if (fs.existsSync(pkgJsonPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        const deps = Object.keys(pkgJson.dependencies || {});

        deps.forEach(dep => {
          if (dep.startsWith('@6fb/')) {
            this.validateAllowedDependency(pkg, dep);
          }
        });
      }
    });
  }

  validateNoBusinessLogicInUI() {
    const uiFiles = glob.sync('packages/ui/src/**/*.{ts,tsx}');
    const businessLogicPatterns = [
      /calculatePrice/,
      /validatePayment/,
      /processBooking/,
      /authenticateUser/,
      /SQL/i,
      /database/i
    ];

    uiFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');

      businessLogicPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          this.warnings.push(`Possible business logic in UI component: ${file}`);
        }
      });
    });
  }

  validateAllowedDependency(pkg, dep) {
    const allowedDeps = {
      'core': [],
      'api': ['@6fb/core'],
      'web': ['@6fb/core', '@6fb/ui'],
      'ui': ['@6fb/core'],
      'mobile': ['@6fb/core', '@6fb/ui']
    };

    const depPkg = dep.replace('@6fb/', '');
    if (!allowedDeps[pkg].includes(dep)) {
      this.errors.push(`Invalid dependency: ${pkg} cannot depend on ${dep}`);
    }
  }

  findTypeDefinitions(dir) {
    if (!fs.existsSync(dir)) return [];

    const files = glob.sync(`${dir}/**/*.{ts,tsx}`);
    const types = [];

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/(?:interface|type|enum)\s+(\w+)/g) || [];

      matches.forEach(match => {
        const typeName = match.split(/\s+/)[1];
        types.push(typeName);
      });
    });

    return types;
  }

  findAPIEndpoints(dir) {
    if (!fs.existsSync(dir)) return [];

    const files = glob.sync(`${dir}/**/*.{ts,py}`);
    const endpoints = [];

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      // Look for route definitions
      const matches = content.match(/(?:@app\.|router\.)(?:get|post|put|delete|patch)\(['"]([^'"]+)['"]/g) || [];

      matches.forEach(match => {
        const endpoint = match.match(/['"]([^'"]+)['"]/)[1];
        endpoints.push(endpoint);
      });
    });

    return endpoints;
  }

  findDuplicates(arr) {
    const seen = new Set();
    const duplicates = new Set();

    arr.forEach(item => {
      if (seen.has(item)) {
        duplicates.add(item);
      }
      seen.add(item);
    });

    return Array.from(duplicates);
  }

  reportResults() {
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ Architecture validation passed!\n');
      process.exit(0);
    }

    if (this.errors.length > 0) {
      console.error('❌ Architecture validation failed!\n');
      console.error('Errors:');
      this.errors.forEach(error => console.error(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    if (this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run validation
new ArchitectureValidator().validate();
