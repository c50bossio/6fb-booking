#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MigrationAnalyzer {
  constructor(configPath) {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.basePath = '/Users/bossio/6fb-booking';
    this.analysis = {
      timestamp: new Date().toISOString(),
      statistics: {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {},
        duplicateFiles: [],
        largeFiles: [],
        emptyFiles: [],
        deadCode: []
      },
      backend: {
        essential: [],
        archive: [],
        ignore: []
      },
      frontend: {
        essential: [],
        archive: [],
        ignore: []
      },
      shared: {
        components: [],
        utilities: [],
        types: []
      },
      dependencies: {
        backend: {},
        frontend: {}
      },
      recommendations: []
    };
  }

  async analyze() {
    console.log('🔍 Starting codebase analysis...\n');
    
    await this.analyzeBackend();
    await this.analyzeFrontend();
    await this.findSharedCode();
    await this.analyzeDependencies();
    await this.detectDeadCode();
    await this.generateRecommendations();
    
    return this.analysis;
  }

  async analyzeBackend() {
    console.log('📦 Analyzing backend...');
    const backendPath = path.join(this.basePath, 'backend');
    
    if (!fs.existsSync(backendPath)) {
      console.log('❌ Backend directory not found');
      return;
    }

    const files = this.walkDirectory(backendPath);
    
    for (const file of files) {
      const relativePath = path.relative(backendPath, file);
      const stats = fs.statSync(file);
      
      // Skip virtual environment and cache
      if (relativePath.includes('venv/') || relativePath.includes('__pycache__')) {
        this.analysis.backend.ignore.push(relativePath);
        continue;
      }
      
      // Categorize files
      if (this.isEssentialBackendFile(relativePath)) {
        this.analysis.backend.essential.push({
          path: relativePath,
          size: stats.size,
          modified: stats.mtime
        });
      } else if (this.isArchivableFile(relativePath)) {
        this.analysis.backend.archive.push({
          path: relativePath,
          size: stats.size,
          reason: this.getArchiveReason(relativePath)
        });
      } else {
        this.analysis.backend.ignore.push(relativePath);
      }
      
      // Update statistics
      this.updateStatistics(file, stats);
    }
    
    console.log(`✅ Backend analysis complete: ${this.analysis.backend.essential.length} essential files\n`);
  }

  async analyzeFrontend() {
    console.log('🎨 Analyzing frontend...');
    const frontendPath = path.join(this.basePath, 'frontend');
    
    if (!fs.existsSync(frontendPath)) {
      console.log('❌ Frontend directory not found');
      return;
    }

    const files = this.walkDirectory(frontendPath);
    
    for (const file of files) {
      const relativePath = path.relative(frontendPath, file);
      const stats = fs.statSync(file);
      
      // Skip node_modules and build artifacts
      if (relativePath.includes('node_modules/') || 
          relativePath.includes('.next/') ||
          relativePath.includes('dist/') ||
          relativePath.includes('build/')) {
        this.analysis.frontend.ignore.push(relativePath);
        continue;
      }
      
      // Categorize files
      if (this.isEssentialFrontendFile(relativePath)) {
        this.analysis.frontend.essential.push({
          path: relativePath,
          size: stats.size,
          modified: stats.mtime
        });
      } else if (this.isArchivableFile(relativePath)) {
        this.analysis.frontend.archive.push({
          path: relativePath,
          size: stats.size,
          reason: this.getArchiveReason(relativePath)
        });
      } else {
        this.analysis.frontend.ignore.push(relativePath);
      }
      
      // Update statistics
      this.updateStatistics(file, stats);
    }
    
    console.log(`✅ Frontend analysis complete: ${this.analysis.frontend.essential.length} essential files\n`);
  }

  async findSharedCode() {
    console.log('🔗 Identifying shared components...');
    
    // Find components that could be shared
    const componentPatterns = [
      { pattern: /Modal/, category: 'modals' },
      { pattern: /Button/, category: 'buttons' },
      { pattern: /Form/, category: 'forms' },
      { pattern: /Card/, category: 'cards' },
      { pattern: /Layout/, category: 'layouts' }
    ];
    
    // Analyze frontend components
    this.analysis.frontend.essential.forEach(file => {
      if (file.path.includes('components/')) {
        componentPatterns.forEach(({ pattern, category }) => {
          if (pattern.test(file.path)) {
            this.analysis.shared.components.push({
              file: file.path,
              category,
              suggestedPackage: 'ui-components'
            });
          }
        });
      }
    });
    
    // Find shared utilities
    const utilityFiles = [
      ...this.analysis.backend.essential.filter(f => f.path.includes('utils/')),
      ...this.analysis.frontend.essential.filter(f => f.path.includes('lib/utils/'))
    ];
    
    utilityFiles.forEach(file => {
      this.analysis.shared.utilities.push({
        file: file.path,
        source: file.path.includes('backend/') ? 'backend' : 'frontend',
        suggestedPackage: 'utils'
      });
    });
    
    console.log(`✅ Found ${this.analysis.shared.components.length} shared components and ${this.analysis.shared.utilities.length} shared utilities\n`);
  }

  async analyzeDependencies() {
    console.log('📊 Analyzing dependencies...');
    
    // Backend dependencies
    const requirementsPath = path.join(this.basePath, 'backend', 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      const requirements = fs.readFileSync(requirementsPath, 'utf8');
      const deps = requirements.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      deps.forEach(dep => {
        const [name, version] = dep.split('==');
        if (name) {
          this.analysis.dependencies.backend[name.trim()] = version ? version.trim() : 'latest';
        }
      });
    }
    
    // Frontend dependencies
    const packageJsonPath = path.join(this.basePath, 'frontend', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      this.analysis.dependencies.frontend = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
    }
    
    console.log(`✅ Dependencies analyzed: ${Object.keys(this.analysis.dependencies.backend).length} backend, ${Object.keys(this.analysis.dependencies.frontend).length} frontend\n`);
  }

  async detectDeadCode() {
    console.log('🧹 Detecting potential dead code...');
    
    const deadCodePatterns = [
      { pattern: /TODO.*deprecated/i, type: 'deprecated' },
      { pattern: /FIXME.*old/i, type: 'old-fixme' },
      { pattern: /console\.log\(/g, type: 'debug-logs' },
      { pattern: /debugger;/g, type: 'debugger-statements' }
    ];
    
    const filesToCheck = [
      ...this.analysis.backend.essential,
      ...this.analysis.frontend.essential
    ];
    
    for (const file of filesToCheck) {
      const fullPath = path.join(this.basePath, file.path.includes('backend/') ? 'backend' : 'frontend', file.path);
      
      if (fs.existsSync(fullPath) && this.isTextFile(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          deadCodePatterns.forEach(({ pattern, type }) => {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
              this.analysis.statistics.deadCode.push({
                file: file.path,
                type,
                occurrences: matches.length
              });
            }
          });
        } catch (error) {
          // Skip binary files or files that can't be read
        }
      }
    }
    
    console.log(`✅ Dead code detection complete: ${this.analysis.statistics.deadCode.length} files with potential issues\n`);
  }

  generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    // Large files recommendation
    if (this.analysis.statistics.largeFiles.length > 0) {
      this.analysis.recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: `Found ${this.analysis.statistics.largeFiles.length} large files (>1MB). Consider optimizing or moving to CDN.`,
        files: this.analysis.statistics.largeFiles.slice(0, 5)
      });
    }
    
    // Duplicate files recommendation
    if (this.analysis.statistics.duplicateFiles.length > 0) {
      this.analysis.recommendations.push({
        type: 'cleanup',
        priority: 'high',
        message: `Found ${this.analysis.statistics.duplicateFiles.length} potential duplicate files. Consider consolidating.`,
        files: this.analysis.statistics.duplicateFiles.slice(0, 5)
      });
    }
    
    // Shared code recommendation
    if (this.analysis.shared.components.length > 10) {
      this.analysis.recommendations.push({
        type: 'architecture',
        priority: 'high',
        message: `Found ${this.analysis.shared.components.length} components that could be shared. Create a shared UI package.`
      });
    }
    
    // Dead code recommendation
    if (this.analysis.statistics.deadCode.length > 0) {
      this.analysis.recommendations.push({
        type: 'cleanup',
        priority: 'low',
        message: `Found potential dead code in ${this.analysis.statistics.deadCode.length} files. Review and clean up.`
      });
    }
    
    // Test files recommendation
    const testFiles = this.analysis.backend.archive.filter(f => f.reason === 'test-file').length +
                     this.analysis.frontend.archive.filter(f => f.reason === 'test-file').length;
    
    if (testFiles > 50) {
      this.analysis.recommendations.push({
        type: 'organization',
        priority: 'medium',
        message: `Found ${testFiles} test files. Consider organizing into a proper test suite structure.`
      });
    }
    
    console.log(`✅ Generated ${this.analysis.recommendations.length} recommendations\n`);
  }

  // Helper methods
  walkDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        this.walkDirectory(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }

  isEssentialBackendFile(path) {
    const essentialPatterns = [
      /^main\.py$/,
      /^alembic\.ini$/,
      /^requirements\.txt$/,
      /^pyproject\.toml$/,
      /^pytest\.ini$/,
      /^config\//,
      /^models\//,
      /^api\//,
      /^services\//,
      /^middleware\//,
      /^utils\//,
      /^alembic\//,
      /^schemas\//
    ];
    
    return essentialPatterns.some(pattern => pattern.test(path)) &&
           !this.isTestFile(path) &&
           !this.isTemporaryFile(path);
  }

  isEssentialFrontendFile(path) {
    const essentialPatterns = [
      /^src\//,
      /^public\//,
      /^package\.json$/,
      /^tsconfig\.json$/,
      /^next\.config\.js$/,
      /^tailwind\.config\.js$/,
      /^postcss\.config\.mjs$/,
      /^middleware\.ts$/,
      /^components\//,
      /^lib\//
    ];
    
    return essentialPatterns.some(pattern => pattern.test(path)) &&
           !this.isTestFile(path) &&
           !this.isTemporaryFile(path);
  }

  isArchivableFile(path) {
    return this.isTestFile(path) ||
           this.isReportFile(path) ||
           this.isScriptFile(path) ||
           this.isDocumentationFile(path);
  }

  isTestFile(path) {
    return /test[_\-]|[_\-]test|\.test\.|\.spec\./.test(path);
  }

  isReportFile(path) {
    return /_report|_results|_summary|\.report\.|\.results\./.test(path);
  }

  isScriptFile(path) {
    return /^(create|seed|fix|check|verify|debug|simple|quick|add|reset|setup|migrate)_/.test(path.split('/').pop());
  }

  isDocumentationFile(path) {
    return path.endsWith('.md') && !['README.md', 'CLAUDE.md'].includes(path.split('/').pop());
  }

  isTemporaryFile(path) {
    return /\.(log|pid|pyc|db|db-shm|db-wal)$/.test(path) ||
           path.includes('__pycache__') ||
           path.includes('.pytest_cache');
  }

  isTextFile(path) {
    const textExtensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml', '.css', '.scss'];
    return textExtensions.some(ext => path.endsWith(ext));
  }

  getArchiveReason(path) {
    if (this.isTestFile(path)) return 'test-file';
    if (this.isReportFile(path)) return 'report-file';
    if (this.isScriptFile(path)) return 'utility-script';
    if (this.isDocumentationFile(path)) return 'documentation';
    return 'other';
  }

  updateStatistics(file, stats) {
    this.analysis.statistics.totalFiles++;
    this.analysis.statistics.totalSize += stats.size;
    
    const ext = path.extname(file).toLowerCase();
    this.analysis.statistics.filesByType[ext] = (this.analysis.statistics.filesByType[ext] || 0) + 1;
    
    // Track large files (> 1MB)
    if (stats.size > 1024 * 1024) {
      this.analysis.statistics.largeFiles.push({
        path: file,
        size: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
      });
    }
    
    // Track empty files
    if (stats.size === 0) {
      this.analysis.statistics.emptyFiles.push(file);
    }
  }

  async saveAnalysis(outputPath) {
    const output = JSON.stringify(this.analysis, null, 2);
    fs.writeFileSync(outputPath, output);
    console.log(`\n📄 Analysis saved to: ${outputPath}`);
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Statistics:`);
    console.log(`  • Total files: ${this.analysis.statistics.totalFiles}`);
    console.log(`  • Total size: ${(this.analysis.statistics.totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  • File types: ${Object.keys(this.analysis.statistics.filesByType).length}`);
    
    console.log(`\n📦 Backend:`);
    console.log(`  • Essential files: ${this.analysis.backend.essential.length}`);
    console.log(`  • Archive files: ${this.analysis.backend.archive.length}`);
    console.log(`  • Ignored files: ${this.analysis.backend.ignore.length}`);
    
    console.log(`\n🎨 Frontend:`);
    console.log(`  • Essential files: ${this.analysis.frontend.essential.length}`);
    console.log(`  • Archive files: ${this.analysis.frontend.archive.length}`);
    console.log(`  • Ignored files: ${this.analysis.frontend.ignore.length}`);
    
    console.log(`\n🔗 Shared Code:`);
    console.log(`  • Shared components: ${this.analysis.shared.components.length}`);
    console.log(`  • Shared utilities: ${this.analysis.shared.utilities.length}`);
    
    console.log(`\n💡 Recommendations:`);
    this.analysis.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
    });
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the analyzer
async function main() {
  const analyzer = new MigrationAnalyzer('./migration-config.json');
  const analysis = await analyzer.analyze();
  
  await analyzer.saveAnalysis('./migration-analysis.json');
  analyzer.printSummary();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MigrationAnalyzer;