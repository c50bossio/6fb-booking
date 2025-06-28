#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class HealthMetricsCollector {
  constructor(config) {
    this.config = config;
    this.metrics = {
      timestamp: new Date().toISOString(),
      files: {},
      duplicates: [],
      bundleSize: {},
      dependencies: {},
      complexity: {},
      testCoverage: {},
      todos: [],
      performance: {}
    };
  }

  async collect() {
    console.log('🔍 Starting health metrics collection...');

    await this.collectFileMetrics();
    await this.detectDuplicates();
    await this.analyzeBundleSize();
    await this.checkDependencies();
    await this.analyzeComplexity();
    await this.collectTestCoverage();
    await this.findTodos();
    await this.collectPerformanceMetrics();

    console.log('✅ Metrics collection complete');
    return this.metrics;
  }

  async collectFileMetrics() {
    console.log('📊 Collecting file metrics...');
    const fileTypes = {};
    const fileSizes = {};

    const walkDir = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.config.projectRoot, fullPath);

        // Check if should ignore
        if (this.shouldIgnore(relativePath)) continue;

        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          const stats = await fs.stat(fullPath);

          fileTypes[ext] = (fileTypes[ext] || 0) + 1;
          fileSizes[ext] = (fileSizes[ext] || 0) + stats.size;
        }
      }
    };

    await walkDir(this.config.projectRoot);

    this.metrics.files = {
      byType: fileTypes,
      totalCount: Object.values(fileTypes).reduce((a, b) => a + b, 0),
      totalSize: Object.values(fileSizes).reduce((a, b) => a + b, 0),
      sizeByType: fileSizes
    };
  }

  async detectDuplicates() {
    console.log('🔍 Detecting duplicate components...');
    const componentFiles = [];
    const duplicates = [];

    const findComponents = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.config.projectRoot, fullPath);

        if (this.shouldIgnore(relativePath)) continue;

        if (entry.isDirectory()) {
          await findComponents(fullPath);
        } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const hash = crypto.createHash('md5').update(content).digest('hex');
            componentFiles.push({
              path: relativePath,
              name: entry.name,
              hash,
              size: content.length
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    };

    await findComponents(path.join(this.config.projectRoot, 'frontend/src'));

    // Find duplicates by content hash
    const hashMap = {};
    componentFiles.forEach(file => {
      if (!hashMap[file.hash]) {
        hashMap[file.hash] = [];
      }
      hashMap[file.hash].push(file);
    });

    Object.values(hashMap).forEach(files => {
      if (files.length > 1) {
        duplicates.push({
          hash: files[0].hash,
          files: files.map(f => f.path),
          size: files[0].size
        });
      }
    });

    // Also check for similar names
    const nameMap = {};
    componentFiles.forEach(file => {
      const baseName = path.basename(file.name, path.extname(file.name));
      if (!nameMap[baseName]) {
        nameMap[baseName] = [];
      }
      nameMap[baseName].push(file);
    });

    Object.entries(nameMap).forEach(([name, files]) => {
      if (files.length > 1) {
        duplicates.push({
          type: 'similar-name',
          name,
          files: files.map(f => f.path)
        });
      }
    });

    this.metrics.duplicates = duplicates;
  }

  async analyzeBundleSize() {
    console.log('📦 Analyzing bundle sizes...');

    try {
      // Check if Next.js build output exists
      const buildManifest = path.join(this.config.projectRoot, 'frontend/.next/build-manifest.json');
      if (await this.fileExists(buildManifest)) {
        const manifest = JSON.parse(await fs.readFile(buildManifest, 'utf8'));

        // Analyze page bundles
        const pageSizes = {};
        for (const [page, assets] of Object.entries(manifest.pages || {})) {
          let totalSize = 0;
          for (const asset of assets) {
            const assetPath = path.join(this.config.projectRoot, 'frontend/.next', asset);
            try {
              const stats = await fs.stat(assetPath);
              totalSize += stats.size;
            } catch (error) {
              // Asset might not exist
            }
          }
          pageSizes[page] = totalSize;
        }

        this.metrics.bundleSize = {
          pages: pageSizes,
          totalSize: Object.values(pageSizes).reduce((a, b) => a + b, 0)
        };
      }

      // Check backend bundle size (if applicable)
      const backendDir = path.join(this.config.projectRoot, 'backend');
      const backendSize = await this.getDirectorySize(backendDir);
      this.metrics.bundleSize.backend = backendSize;

    } catch (error) {
      console.warn('⚠️  Could not analyze bundle size:', error.message);
      this.metrics.bundleSize = { error: error.message };
    }
  }

  async checkDependencies() {
    console.log('📦 Checking dependencies...');

    const results = {
      frontend: {},
      backend: {}
    };

    // Check frontend dependencies
    try {
      const frontendPath = path.join(this.config.projectRoot, 'frontend');
      if (await this.fileExists(path.join(frontendPath, 'package.json'))) {
        const packageJson = JSON.parse(await fs.readFile(path.join(frontendPath, 'package.json'), 'utf8'));

        // Count dependencies
        results.frontend.dependencies = Object.keys(packageJson.dependencies || {}).length;
        results.frontend.devDependencies = Object.keys(packageJson.devDependencies || {}).length;

        // Check for outdated packages
        try {
          const outdated = execSync('npm outdated --json', {
            cwd: frontendPath,
            encoding: 'utf8'
          });
          if (outdated) {
            const outdatedPkgs = JSON.parse(outdated);
            results.frontend.outdated = Object.keys(outdatedPkgs).length;
            results.frontend.outdatedList = outdatedPkgs;
          }
        } catch (error) {
          // npm outdated returns non-zero exit code when packages are outdated
          if (error.stdout) {
            try {
              const outdatedPkgs = JSON.parse(error.stdout);
              results.frontend.outdated = Object.keys(outdatedPkgs).length;
              results.frontend.outdatedList = outdatedPkgs;
            } catch (parseError) {
              results.frontend.outdated = 0;
            }
          }
        }

        // Check for security vulnerabilities
        try {
          const audit = execSync('npm audit --json', {
            cwd: frontendPath,
            encoding: 'utf8'
          });
          const auditResult = JSON.parse(audit);
          results.frontend.vulnerabilities = auditResult.metadata.vulnerabilities;
        } catch (error) {
          // npm audit might fail
          results.frontend.vulnerabilities = { error: 'Could not run npm audit' };
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not check frontend dependencies:', error.message);
    }

    // Check backend dependencies
    try {
      const backendPath = path.join(this.config.projectRoot, 'backend');
      const requirementsPath = path.join(backendPath, 'requirements.txt');

      if (await this.fileExists(requirementsPath)) {
        const requirements = await fs.readFile(requirementsPath, 'utf8');
        results.backend.dependencies = requirements.split('\n').filter(line => line.trim() && !line.startsWith('#')).length;

        // Check for outdated Python packages
        try {
          const outdated = execSync('pip list --outdated --format=json', {
            cwd: backendPath,
            encoding: 'utf8'
          });
          if (outdated) {
            const outdatedPkgs = JSON.parse(outdated);
            results.backend.outdated = outdatedPkgs.length;
            results.backend.outdatedList = outdatedPkgs;
          }
        } catch (error) {
          results.backend.outdated = 0;
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not check backend dependencies:', error.message);
    }

    this.metrics.dependencies = results;
  }

  async analyzeComplexity() {
    console.log('🧩 Analyzing code complexity...');

    const complexityResults = {
      files: [],
      summary: {
        totalFiles: 0,
        avgComplexity: 0,
        maxComplexity: 0,
        filesOverThreshold: 0
      }
    };

    const analyzeFile = async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(this.config.projectRoot, filePath);

        // Simple complexity metrics
        const metrics = {
          path: relativePath,
          lines: lines.length,
          functions: 0,
          complexity: 0,
          todos: 0
        };

        // Count functions and estimate complexity
        if (/\.(js|jsx|ts|tsx)$/.test(filePath)) {
          metrics.functions = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{/g) || []).length;
          metrics.complexity = this.estimateComplexity(content);
        } else if (/\.py$/.test(filePath)) {
          metrics.functions = (content.match(/def\s+\w+|class\s+\w+/g) || []).length;
          metrics.complexity = this.estimateComplexity(content);
        }

        metrics.todos = (content.match(/TODO|FIXME|HACK|XXX/gi) || []).length;

        return metrics;
      } catch (error) {
        return null;
      }
    };

    // Analyze all code files
    const codeFiles = await this.findCodeFiles();

    for (const file of codeFiles) {
      const metrics = await analyzeFile(file);
      if (metrics) {
        complexityResults.files.push(metrics);
        complexityResults.summary.totalFiles++;
        complexityResults.summary.avgComplexity += metrics.complexity;
        complexityResults.summary.maxComplexity = Math.max(complexityResults.summary.maxComplexity, metrics.complexity);

        if (metrics.complexity > this.config.thresholds.complexity.maxCyclomaticComplexity) {
          complexityResults.summary.filesOverThreshold++;
        }
      }
    }

    if (complexityResults.summary.totalFiles > 0) {
      complexityResults.summary.avgComplexity /= complexityResults.summary.totalFiles;
    }

    this.metrics.complexity = complexityResults;
  }

  estimateComplexity(content) {
    // Simple cyclomatic complexity estimation
    let complexity = 1;

    // Count decision points
    const decisionPatterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*[^:]+:/g,  // ternary operators
      /&&/g,
      /\|\|/g
    ];

    decisionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  async collectTestCoverage() {
    console.log('🧪 Collecting test coverage...');

    const coverage = {
      frontend: {},
      backend: {}
    };

    // Check for frontend coverage
    try {
      const frontendCoveragePath = path.join(this.config.projectRoot, 'frontend/coverage/coverage-summary.json');
      if (await this.fileExists(frontendCoveragePath)) {
        const coverageData = JSON.parse(await fs.readFile(frontendCoveragePath, 'utf8'));
        coverage.frontend = {
          lines: coverageData.total.lines.pct,
          statements: coverageData.total.statements.pct,
          functions: coverageData.total.functions.pct,
          branches: coverageData.total.branches.pct
        };
      }
    } catch (error) {
      console.warn('⚠️  Could not read frontend coverage:', error.message);
    }

    // Check for backend coverage
    try {
      const backendCoveragePath = path.join(this.config.projectRoot, 'backend/.coverage');
      if (await this.fileExists(backendCoveragePath)) {
        // Try to get coverage report
        try {
          const coverageReport = execSync('coverage report --format=json', {
            cwd: path.join(this.config.projectRoot, 'backend'),
            encoding: 'utf8'
          });
          coverage.backend = JSON.parse(coverageReport);
        } catch (error) {
          coverage.backend = { error: 'Coverage data exists but could not generate report' };
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not read backend coverage:', error.message);
    }

    this.metrics.testCoverage = coverage;
  }

  async findTodos() {
    console.log('📝 Finding TODOs and FIXMEs...');

    const todos = [];
    const codeFiles = await this.findCodeFiles();

    for (const file of codeFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(this.config.projectRoot, file);

        lines.forEach((line, index) => {
          const todoMatch = line.match(/(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE|REFACTOR):\s*(.+)/i);
          if (todoMatch) {
            todos.push({
              file: relativePath,
              line: index + 1,
              type: todoMatch[1].toUpperCase(),
              message: todoMatch[2].trim()
            });
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }

    this.metrics.todos = todos;
  }

  async collectPerformanceMetrics() {
    console.log('⚡ Collecting performance metrics...');

    const performance = {
      loadTime: {},
      apiResponse: {},
      databaseQueries: {}
    };

    // Check for performance logs or metrics
    try {
      // Look for frontend performance metrics
      const perfLogPath = path.join(this.config.projectRoot, 'frontend/performance.log');
      if (await this.fileExists(perfLogPath)) {
        const perfData = await fs.readFile(perfLogPath, 'utf8');
        // Parse performance data (format depends on your logging)
        performance.frontend = { raw: perfData };
      }

      // Look for backend performance metrics
      const backendPerfPath = path.join(this.config.projectRoot, 'backend/logs/performance.json');
      if (await this.fileExists(backendPerfPath)) {
        performance.backend = JSON.parse(await fs.readFile(backendPerfPath, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  Could not collect performance metrics:', error.message);
    }

    this.metrics.performance = performance;
  }

  async findCodeFiles() {
    const codeFiles = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py'];

    const walkDir = async (dir) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(this.config.projectRoot, fullPath);

          if (this.shouldIgnore(relativePath)) continue;

          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            codeFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    await walkDir(this.config.projectRoot);
    return codeFiles;
  }

  async getDirectorySize(dir) {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!this.shouldIgnore(path.relative(this.config.projectRoot, fullPath))) {
            totalSize += await this.getDirectorySize(fullPath);
          }
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }

    return totalSize;
  }

  shouldIgnore(relativePath) {
    // Check directory ignores
    for (const dir of this.config.ignore.directories) {
      if (relativePath.includes(dir)) {
        return true;
      }
    }

    // Check file ignores
    const fileName = path.basename(relativePath);
    for (const pattern of this.config.ignore.files) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        if (regex.test(fileName)) {
          return true;
        }
      } else if (fileName === pattern) {
        return true;
      }
    }

    return false;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = HealthMetricsCollector;
