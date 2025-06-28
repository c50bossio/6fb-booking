const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

class WebpackValidationPlugin {
  constructor(options = {}) {
    this.options = {
      maxFilesPerDirectory: options.maxFilesPerDirectory || 20,
      forbiddenPatterns: options.forbiddenPatterns || [
        /\.test\.(tsx?|jsx?)$/,
        /\.spec\.(tsx?|jsx?)$/,
        /__tests__/,
        /\.stories\.(tsx?|jsx?)$/
      ],
      duplicateDetection: options.duplicateDetection !== false,
      componentRegistry: options.componentRegistry || null,
      maxBundleSize: options.maxBundleSize || 5 * 1024 * 1024, // 5MB default
      apiEndpointValidation: options.apiEndpointValidation !== false,
      authSystemValidation: options.authSystemValidation !== false,
      excludePaths: options.excludePaths || ['node_modules', '.next', 'build', 'dist']
    };
    this.errors = [];
    this.warnings = [];
  }

  apply(compiler) {
    compiler.hooks.beforeCompile.tapAsync('WebpackValidationPlugin', (compilation, callback) => {
      this.errors = [];
      this.warnings = [];
      
      Promise.all([
        this.validateDuplicateComponents(),
        this.validateDirectoryFileCounts(),
        this.validateForbiddenPatterns(),
        this.validateComponentRegistry(),
        this.validateAPIEndpoints(),
        this.validateAuthSystem()
      ]).then(() => {
        this.reportResults();
        if (this.errors.length > 0) {
          callback(new Error('Build validation failed'));
        } else {
          callback();
        }
      }).catch(err => {
        callback(err);
      });
    });

    // Validate bundle size after compilation
    compiler.hooks.afterEmit.tapAsync('WebpackValidationPlugin', (compilation, callback) => {
      this.validateBundleSize(compilation);
      callback();
    });
  }

  async validateDuplicateComponents() {
    if (!this.options.duplicateDetection) return;

    const componentMap = new Map();
    const srcDir = path.join(process.cwd(), 'src');
    
    this.walkDirectory(srcDir, (filePath) => {
      if (!this.isComponentFile(filePath)) return;
      
      const componentName = this.extractComponentName(filePath);
      if (componentName) {
        if (!componentMap.has(componentName)) {
          componentMap.set(componentName, []);
        }
        componentMap.get(componentName).push(filePath);
      }
    });

    // Check for duplicates
    for (const [name, files] of componentMap) {
      if (files.length > 1) {
        // Check if these are truly duplicates (similar names)
        const similarNames = this.findSimilarComponentNames(name, files);
        if (similarNames.length > 0) {
          this.errors.push({
            type: 'DUPLICATE_COMPONENT',
            message: `Duplicate component detected: ${name}`,
            details: `Found in:\n${files.map(f => `  - ${this.getRelativePath(f)}`).join('\n')}`,
            remediation: 'Consider consolidating these components or renaming them to be more specific'
          });
        }
      }
    }
  }

  async validateDirectoryFileCounts() {
    const directoryCounts = new Map();
    const srcDir = path.join(process.cwd(), 'src');
    
    this.walkDirectory(srcDir, (filePath, isDirectory) => {
      if (isDirectory) {
        const files = fs.readdirSync(filePath).filter(f => {
          const fullPath = path.join(filePath, f);
          return fs.statSync(fullPath).isFile() && !f.startsWith('.');
        });
        
        if (files.length > this.options.maxFilesPerDirectory) {
          directoryCounts.set(filePath, files.length);
        }
      }
    });

    for (const [dir, count] of directoryCounts) {
      this.warnings.push({
        type: 'DIRECTORY_FILE_LIMIT',
        message: `Directory exceeds file limit: ${this.getRelativePath(dir)}`,
        details: `Contains ${count} files (limit: ${this.options.maxFilesPerDirectory})`,
        remediation: 'Consider organizing files into subdirectories or extracting related functionality'
      });
    }
  }

  async validateForbiddenPatterns() {
    const srcDir = path.join(process.cwd(), 'src');
    const violations = [];
    
    this.walkDirectory(srcDir, (filePath) => {
      const relativePath = this.getRelativePath(filePath);
      
      // Skip test directories
      if (relativePath.includes('__tests__') || relativePath.includes('tests/')) {
        return;
      }
      
      for (const pattern of this.options.forbiddenPatterns) {
        if (pattern.test(filePath)) {
          violations.push({
            file: relativePath,
            pattern: pattern.toString()
          });
        }
      }
    });

    if (violations.length > 0) {
      this.errors.push({
        type: 'FORBIDDEN_FILE_PATTERN',
        message: 'Test files found outside test directories',
        details: violations.map(v => `  - ${v.file}`).join('\n'),
        remediation: 'Move test files to __tests__ directories or tests/ folder'
      });
    }
  }

  async validateComponentRegistry() {
    if (!this.options.componentRegistry) return;
    
    const registryPath = path.join(process.cwd(), this.options.componentRegistry);
    if (!fs.existsSync(registryPath)) {
      this.warnings.push({
        type: 'MISSING_COMPONENT_REGISTRY',
        message: 'Component registry file not found',
        details: `Expected at: ${registryPath}`,
        remediation: 'Create a component registry or disable this validation'
      });
      return;
    }

    try {
      const registry = require(registryPath);
      const allowedComponents = new Set(registry.allowedComponents || []);
      const componentImports = new Map();
      
      // Scan for component imports
      const srcDir = path.join(process.cwd(), 'src');
      this.walkDirectory(srcDir, (filePath) => {
        if (!this.isSourceFile(filePath)) return;
        
        const content = fs.readFileSync(filePath, 'utf8');
        const imports = this.extractComponentImports(content);
        
        imports.forEach(imp => {
          if (!allowedComponents.has(imp) && !this.isInternalImport(imp)) {
            if (!componentImports.has(imp)) {
              componentImports.set(imp, []);
            }
            componentImports.get(imp).push(filePath);
          }
        });
      });

      for (const [component, files] of componentImports) {
        this.warnings.push({
          type: 'UNREGISTERED_COMPONENT',
          message: `Component not in registry: ${component}`,
          details: `Used in:\n${files.map(f => `  - ${this.getRelativePath(f)}`).join('\n')}`,
          remediation: 'Add this component to the registry or use an approved alternative'
        });
      }
    } catch (err) {
      this.errors.push({
        type: 'REGISTRY_VALIDATION_ERROR',
        message: 'Failed to validate component registry',
        details: err.message,
        remediation: 'Check the component registry file format'
      });
    }
  }

  async validateAPIEndpoints() {
    if (!this.options.apiEndpointValidation) return;
    
    const endpoints = new Map();
    const apiDir = path.join(process.cwd(), 'src/app/api');
    
    if (fs.existsSync(apiDir)) {
      this.walkDirectory(apiDir, (filePath) => {
        if (filePath.endsWith('route.ts') || filePath.endsWith('route.js')) {
          const endpoint = this.extractAPIEndpoint(filePath);
          const methods = this.extractAPIMethods(filePath);
          
          methods.forEach(method => {
            const key = `${method} ${endpoint}`;
            if (!endpoints.has(key)) {
              endpoints.set(key, []);
            }
            endpoints.get(key).push(filePath);
          });
        }
      });

      // Check for duplicates
      for (const [endpoint, files] of endpoints) {
        if (files.length > 1) {
          this.errors.push({
            type: 'DUPLICATE_API_ENDPOINT',
            message: `Duplicate API endpoint: ${endpoint}`,
            details: `Found in:\n${files.map(f => `  - ${this.getRelativePath(f)}`).join('\n')}`,
            remediation: 'Remove duplicate endpoints or consolidate the logic'
          });
        }
      }
    }
  }

  async validateAuthSystem() {
    if (!this.options.authSystemValidation) return;
    
    const authPatterns = [
      /useAuth/,
      /AuthProvider/,
      /AuthContext/,
      /authentication/i,
      /login|signin/i
    ];
    
    const authSystems = new Map();
    const srcDir = path.join(process.cwd(), 'src');
    
    this.walkDirectory(srcDir, (filePath) => {
      if (!this.isSourceFile(filePath)) return;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const authImports = this.detectAuthSystem(content, authPatterns);
      
      authImports.forEach(system => {
        if (!authSystems.has(system)) {
          authSystems.set(system, []);
        }
        authSystems.get(system).push(filePath);
      });
    });

    if (authSystems.size > 1) {
      this.errors.push({
        type: 'MULTIPLE_AUTH_SYSTEMS',
        message: 'Multiple authentication systems detected',
        details: Array.from(authSystems.entries())
          .map(([system, files]) => `${system}:\n${files.slice(0, 3).map(f => `  - ${this.getRelativePath(f)}`).join('\n')}`)
          .join('\n\n'),
        remediation: 'Use a single authentication system throughout the application'
      });
    }
  }

  validateBundleSize(compilation) {
    const stats = compilation.getStats().toJson({
      all: false,
      assets: true
    });

    const oversizedAssets = stats.assets.filter(asset => {
      return asset.size > this.options.maxBundleSize && 
             !asset.name.includes('sourcemap') &&
             (asset.name.endsWith('.js') || asset.name.endsWith('.css'));
    });

    oversizedAssets.forEach(asset => {
      this.warnings.push({
        type: 'BUNDLE_SIZE_LIMIT',
        message: `Bundle exceeds size limit: ${asset.name}`,
        details: `Size: ${(asset.size / 1024 / 1024).toFixed(2)}MB (limit: ${(this.options.maxBundleSize / 1024 / 1024).toFixed(2)}MB)`,
        remediation: 'Consider code splitting, lazy loading, or removing unused dependencies'
      });
    });
  }

  // Helper methods
  walkDirectory(dir, callback, _isRoot = true) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    if (_isRoot) {
      callback(dir, true);
    }
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      // Skip excluded paths
      if (this.options.excludePaths.some(exclude => filePath.includes(exclude))) {
        return;
      }
      
      if (stat.isDirectory()) {
        callback(filePath, true);
        this.walkDirectory(filePath, callback, false);
      } else {
        callback(filePath, false);
      }
    });
  }

  isComponentFile(filePath) {
    return /\.(tsx|jsx)$/.test(filePath) && 
           !filePath.includes('__tests__') &&
           !filePath.includes('.test.') &&
           !filePath.includes('.spec.');
  }

  isSourceFile(filePath) {
    return /\.(ts|tsx|js|jsx)$/.test(filePath);
  }

  extractComponentName(filePath) {
    const basename = path.basename(filePath, path.extname(filePath));
    // Remove common suffixes
    return basename.replace(/(Component|Container|Page|View|Modal|Dialog)$/, '');
  }

  findSimilarComponentNames(baseName, files) {
    const variations = [
      baseName,
      `Enhanced${baseName}`,
      `${baseName}Enhanced`,
      `New${baseName}`,
      `${baseName}New`,
      `${baseName}V2`,
      `${baseName}2`
    ];
    
    return files.filter(file => {
      const name = this.extractComponentName(file);
      return variations.some(v => v.toLowerCase() === name.toLowerCase());
    });
  }

  extractComponentImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('@/components/') || importPath.startsWith('../components/')) {
        const componentName = path.basename(importPath);
        imports.push(componentName);
      }
    }
    
    return imports;
  }

  isInternalImport(importPath) {
    return importPath.startsWith('.') || importPath.startsWith('@/');
  }

  extractAPIEndpoint(filePath) {
    const apiDir = path.join(process.cwd(), 'src/app/api');
    const relative = path.relative(apiDir, filePath);
    const parts = relative.split(path.sep);
    parts.pop(); // Remove 'route.ts'
    return '/api/' + parts.join('/');
  }

  extractAPIMethods(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const methods = [];
    const methodRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      methods.push(match[1]);
    }
    
    return methods.length > 0 ? methods : ['GET']; // Default to GET if no methods found
  }

  detectAuthSystem(content, patterns) {
    const systems = new Set();
    
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        // Try to identify the specific auth system
        if (/next-auth|NextAuth/.test(content)) {
          systems.add('NextAuth');
        } else if (/clerk|@clerk/.test(content)) {
          systems.add('Clerk');
        } else if (/auth0|Auth0/.test(content)) {
          systems.add('Auth0');
        } else if (/supabase.*auth/.test(content)) {
          systems.add('Supabase Auth');
        } else if (/firebase.*auth/.test(content)) {
          systems.add('Firebase Auth');
        } else if (/useAuth|AuthContext/.test(content)) {
          systems.add('Custom Auth');
        }
      }
    });
    
    return Array.from(systems);
  }

  getRelativePath(filePath) {
    return path.relative(process.cwd(), filePath);
  }

  reportResults() {
    console.log('\n' + chalk.bold('Build Validation Results'));
    console.log('=' .repeat(50));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('✓ All validation checks passed!'));
      return;
    }
    
    if (this.errors.length > 0) {
      console.log('\n' + chalk.red.bold(`Errors (${this.errors.length}):`));
      this.errors.forEach((error, index) => {
        console.log('\n' + chalk.red(`${index + 1}. ${error.type}: ${error.message}`));
        console.log(chalk.gray(error.details));
        console.log(chalk.yellow(`→ ${error.remediation}`));
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n' + chalk.yellow.bold(`Warnings (${this.warnings.length}):`));
      this.warnings.forEach((warning, index) => {
        console.log('\n' + chalk.yellow(`${index + 1}. ${warning.type}: ${warning.message}`));
        console.log(chalk.gray(warning.details));
        console.log(chalk.blue(`→ ${warning.remediation}`));
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (this.errors.length > 0) {
      console.log(chalk.red.bold('\n✗ Build validation failed!'));
      console.log(chalk.gray('Fix the errors above and try again.\n'));
    }
  }
}

module.exports = WebpackValidationPlugin;