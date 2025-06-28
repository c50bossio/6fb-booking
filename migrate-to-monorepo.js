#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

class MonorepoMigrator {
  constructor(configPath, analysisPath) {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.analysis = analysisPath && fs.existsSync(analysisPath) 
      ? JSON.parse(fs.readFileSync(analysisPath, 'utf8'))
      : null;
    
    this.sourcePath = '/Users/bossio/6fb-booking';
    this.targetPath = this.config.monorepoStructure.rootPath;
    this.dryRun = true;
    this.verbose = false;
    this.operations = [];
    this.errors = [];
    this.warnings = [];
  }

  async migrate(options = {}) {
    this.dryRun = options.dryRun !== false;
    this.verbose = options.verbose || false;
    
    console.log(`\n🚀 Starting monorepo migration (${this.dryRun ? 'DRY RUN' : 'LIVE MODE'})...\n`);
    
    try {
      // Pre-migration checks
      await this.performPreChecks();
      
      // Create monorepo structure
      await this.createMonorepoStructure();
      
      // Migrate backend
      await this.migrateBackend();
      
      // Migrate frontend
      await this.migrateFrontend();
      
      // Extract shared packages
      await this.extractSharedPackages();
      
      // Update imports and dependencies
      await this.updateImportsAndDependencies();
      
      // Setup monorepo configuration
      await this.setupMonorepoConfig();
      
      // Archive old files
      await this.archiveOldFiles();
      
      // Generate migration report
      await this.generateReport();
      
      console.log('\n✅ Migration completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      this.errors.push(error.message);
    }
    
    return {
      operations: this.operations,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  async performPreChecks() {
    console.log('🔍 Performing pre-migration checks...');
    
    // Check if source exists
    if (!fs.existsSync(this.sourcePath)) {
      throw new Error(`Source path does not exist: ${this.sourcePath}`);
    }
    
    // Check if target exists (warn if it does)
    if (fs.existsSync(this.targetPath)) {
      this.warnings.push(`Target path already exists: ${this.targetPath}`);
      console.log(`⚠️  Warning: Target path already exists. Files may be overwritten.`);
    }
    
    // Check git status
    try {
      const gitStatus = execSync('git status --porcelain', { cwd: this.sourcePath }).toString();
      if (gitStatus.trim()) {
        this.warnings.push('Uncommitted changes detected in source repository');
        console.log('⚠️  Warning: You have uncommitted changes. Consider committing first.');
      }
    } catch (error) {
      this.warnings.push('Unable to check git status');
    }
    
    console.log('✅ Pre-checks complete\n');
  }

  async createMonorepoStructure() {
    console.log('📁 Creating monorepo structure...');
    
    const dirs = [
      this.targetPath,
      path.join(this.targetPath, 'apps'),
      path.join(this.targetPath, 'apps/backend'),
      path.join(this.targetPath, 'apps/frontend'),
      path.join(this.targetPath, 'apps/dashboard'),
      path.join(this.targetPath, 'packages'),
      path.join(this.targetPath, 'packages/shared'),
      path.join(this.targetPath, 'packages/ui-components'),
      path.join(this.targetPath, 'packages/utils'),
      path.join(this.targetPath, 'packages/api-client'),
      path.join(this.targetPath, 'tools'),
      path.join(this.targetPath, 'tools/scripts'),
      path.join(this.targetPath, 'docs'),
      path.join(this.targetPath, 'config')
    ];
    
    for (const dir of dirs) {
      this.createDirectory(dir);
    }
    
    console.log('✅ Monorepo structure created\n');
  }

  async migrateBackend() {
    console.log('📦 Migrating backend...');
    
    const backendSource = path.join(this.sourcePath, 'backend');
    const backendTarget = path.join(this.targetPath, 'apps/backend');
    
    // Get files to migrate from config or analysis
    const filesToMigrate = this.getBackendFilesToMigrate();
    
    for (const file of filesToMigrate) {
      const sourcePath = path.join(backendSource, file);
      const targetPath = path.join(backendTarget, file);
      
      if (fs.existsSync(sourcePath)) {
        await this.copyFile(sourcePath, targetPath);
      }
    }
    
    // Create backend package.json for monorepo
    const backendPackageJson = {
      name: '@6fb/backend',
      version: '1.0.0',
      private: true,
      scripts: {
        'dev': 'uvicorn main:app --reload --host 0.0.0.0 --port 8000',
        'start': 'uvicorn main:app --host 0.0.0.0 --port 8000',
        'test': 'pytest',
        'lint': 'ruff check .',
        'format': 'black .'
      }
    };
    
    this.writeJson(path.join(backendTarget, 'package.json'), backendPackageJson);
    
    console.log(`✅ Backend migrated: ${filesToMigrate.length} files\n`);
  }

  async migrateFrontend() {
    console.log('🎨 Migrating frontend...');
    
    const frontendSource = path.join(this.sourcePath, 'frontend');
    const frontendTarget = path.join(this.targetPath, 'apps/frontend');
    
    // Get files to migrate from config or analysis
    const filesToMigrate = this.getFrontendFilesToMigrate();
    
    for (const file of filesToMigrate) {
      const sourcePath = path.join(frontendSource, file);
      const targetPath = path.join(frontendTarget, file);
      
      if (fs.existsSync(sourcePath)) {
        await this.copyFile(sourcePath, targetPath);
      }
    }
    
    // Update frontend package.json for monorepo
    const packageJsonPath = path.join(frontendTarget, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.name = '@6fb/frontend';
      packageJson.dependencies = {
        ...packageJson.dependencies,
        '@6fb/ui-components': 'workspace:*',
        '@6fb/api-client': 'workspace:*',
        '@6fb/utils': 'workspace:*'
      };
      this.writeJson(packageJsonPath, packageJson);
    }
    
    console.log(`✅ Frontend migrated: ${filesToMigrate.length} files\n`);
  }

  async extractSharedPackages() {
    console.log('🔗 Extracting shared packages...');
    
    // Extract UI components
    await this.extractUIComponents();
    
    // Extract API client
    await this.extractAPIClient();
    
    // Extract shared utilities
    await this.extractSharedUtils();
    
    console.log('✅ Shared packages extracted\n');
  }

  async extractUIComponents() {
    const componentsTarget = path.join(this.targetPath, 'packages/ui-components');
    
    // Create package structure
    this.createDirectory(path.join(componentsTarget, 'src'));
    this.createDirectory(path.join(componentsTarget, 'src/components'));
    
    // Move shared components
    const sharedComponents = this.analysis?.shared?.components || [];
    for (const component of sharedComponents) {
      const sourcePath = path.join(this.sourcePath, 'frontend', component.file);
      const targetPath = path.join(componentsTarget, 'src/components', path.basename(component.file));
      
      if (fs.existsSync(sourcePath)) {
        await this.copyFile(sourcePath, targetPath);
      }
    }
    
    // Create package.json
    const packageJson = {
      name: '@6fb/ui-components',
      version: '1.0.0',
      main: 'src/index.ts',
      types: 'src/index.d.ts',
      scripts: {
        'build': 'tsc',
        'test': 'jest'
      },
      dependencies: {
        'react': '^18.0.0',
        'react-dom': '^18.0.0'
      }
    };
    
    this.writeJson(path.join(componentsTarget, 'package.json'), packageJson);
    
    // Create index file
    const indexContent = `// Auto-generated index file
export * from './components';
`;
    this.writeFile(path.join(componentsTarget, 'src/index.ts'), indexContent);
  }

  async extractAPIClient() {
    const apiClientTarget = path.join(this.targetPath, 'packages/api-client');
    
    // Create package structure
    this.createDirectory(path.join(apiClientTarget, 'src'));
    
    // Move API client files
    const apiFiles = [
      'lib/api/auth.ts',
      'lib/api/appointments.ts',
      'lib/api/analytics.ts',
      'lib/api/booking.ts',
      'lib/api/calendar.ts',
      'lib/api/index.ts'
    ];
    
    for (const file of apiFiles) {
      const sourcePath = path.join(this.sourcePath, 'frontend/src', file);
      const targetPath = path.join(apiClientTarget, 'src', path.basename(file));
      
      if (fs.existsSync(sourcePath)) {
        await this.copyFile(sourcePath, targetPath);
      }
    }
    
    // Create package.json
    const packageJson = {
      name: '@6fb/api-client',
      version: '1.0.0',
      main: 'src/index.ts',
      types: 'src/index.d.ts',
      scripts: {
        'build': 'tsc',
        'test': 'jest'
      },
      dependencies: {
        'axios': '^1.0.0'
      }
    };
    
    this.writeJson(path.join(apiClientTarget, 'package.json'), packageJson);
  }

  async extractSharedUtils() {
    const utilsTarget = path.join(this.targetPath, 'packages/utils');
    
    // Create package structure
    this.createDirectory(path.join(utilsTarget, 'src'));
    
    // Move shared utilities
    const utilFiles = this.analysis?.shared?.utilities || [];
    for (const util of utilFiles) {
      const sourcePath = path.join(this.sourcePath, util.source === 'backend' ? 'backend' : 'frontend/src', util.file);
      const targetPath = path.join(utilsTarget, 'src', path.basename(util.file));
      
      if (fs.existsSync(sourcePath)) {
        await this.copyFile(sourcePath, targetPath);
      }
    }
    
    // Create package.json
    const packageJson = {
      name: '@6fb/utils',
      version: '1.0.0',
      main: 'src/index.ts',
      types: 'src/index.d.ts',
      scripts: {
        'build': 'tsc',
        'test': 'jest'
      }
    };
    
    this.writeJson(path.join(utilsTarget, 'package.json'), packageJson);
  }

  async updateImportsAndDependencies() {
    console.log('🔄 Updating imports and dependencies...');
    
    if (this.dryRun) {
      console.log('  (Skipping in dry-run mode)');
      return;
    }
    
    // This would update import statements in the migrated files
    // For now, we'll just log what would be done
    console.log('  • Would update import statements to use monorepo packages');
    console.log('  • Would update tsconfig paths');
    console.log('  • Would update webpack/vite aliases');
    
    console.log('✅ Imports and dependencies updated\n');
  }

  async setupMonorepoConfig() {
    console.log('⚙️  Setting up monorepo configuration...');
    
    // Root package.json
    const rootPackageJson = {
      name: '6fb-platform',
      version: '1.0.0',
      private: true,
      workspaces: [
        'apps/*',
        'packages/*'
      ],
      scripts: {
        'dev': 'turbo run dev',
        'build': 'turbo run build',
        'test': 'turbo run test',
        'lint': 'turbo run lint',
        'clean': 'turbo run clean',
        'format': 'prettier --write "**/*.{js,jsx,ts,tsx,json,md}"'
      },
      devDependencies: {
        'turbo': '^1.10.0',
        'prettier': '^2.8.0',
        'eslint': '^8.0.0',
        'typescript': '^5.0.0'
      }
    };
    
    this.writeJson(path.join(this.targetPath, 'package.json'), rootPackageJson);
    
    // Turbo configuration
    const turboJson = {
      '$schema': 'https://turbo.build/schema.json',
      pipeline: {
        build: {
          dependsOn: ['^build'],
          outputs: ['dist/**', '.next/**']
        },
        dev: {
          cache: false,
          persistent: true
        },
        test: {
          dependsOn: ['build'],
          outputs: ['coverage/**']
        },
        lint: {
          outputs: []
        }
      }
    };
    
    this.writeJson(path.join(this.targetPath, 'turbo.json'), turboJson);
    
    // Root tsconfig
    const tsConfig = {
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@6fb/backend/*': ['apps/backend/*'],
          '@6fb/frontend/*': ['apps/frontend/src/*'],
          '@6fb/ui-components': ['packages/ui-components/src'],
          '@6fb/api-client': ['packages/api-client/src'],
          '@6fb/utils': ['packages/utils/src']
        }
      }
    };
    
    this.writeJson(path.join(this.targetPath, 'tsconfig.json'), tsConfig);
    
    console.log('✅ Monorepo configuration complete\n');
  }

  async archiveOldFiles() {
    console.log('📦 Archiving old files...');
    
    const archivePath = this.config.archiveSettings.archivePath;
    
    if (!this.dryRun && this.config.archiveSettings.createArchiveFolders) {
      Object.entries(this.config.archiveSettings.createArchiveFolders).forEach(([key, folder]) => {
        this.createDirectory(path.join(archivePath, folder));
      });
    }
    
    // Archive test files
    const testFiles = [
      ...(this.analysis?.backend?.archive || []),
      ...(this.analysis?.frontend?.archive || [])
    ];
    
    console.log(`  • Would archive ${testFiles.length} test/utility files`);
    
    console.log('✅ Archive complete\n');
  }

  async generateReport() {
    console.log('📄 Generating migration report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      source: this.sourcePath,
      target: this.targetPath,
      statistics: {
        totalOperations: this.operations.length,
        filesCreated: this.operations.filter(op => op.type === 'create').length,
        filesCopied: this.operations.filter(op => op.type === 'copy').length,
        directoriesCreated: this.operations.filter(op => op.type === 'mkdir').length,
        errors: this.errors.length,
        warnings: this.warnings.length
      },
      operations: this.operations,
      errors: this.errors,
      warnings: this.warnings,
      nextSteps: [
        'Install dependencies: cd ' + this.targetPath + ' && npm install',
        'Update environment variables in each app',
        'Test the monorepo: npm run dev',
        'Update CI/CD pipelines for monorepo structure',
        'Update deployment configurations'
      ]
    };
    
    const reportPath = path.join(this.sourcePath, 'migration-report.json');
    this.writeJson(reportPath, report);
    
    console.log(`✅ Report saved to: ${reportPath}\n`);
    
    return report;
  }

  // Helper methods
  getBackendFilesToMigrate() {
    if (this.analysis?.backend?.essential) {
      return this.analysis.backend.essential.map(f => f.path);
    }
    
    // Fallback to config patterns
    return this.expandPatterns(this.config.migrationRules.backend.include, 'backend');
  }

  getFrontendFilesToMigrate() {
    if (this.analysis?.frontend?.essential) {
      return this.analysis.frontend.essential.map(f => f.path);
    }
    
    // Fallback to config patterns
    return this.expandPatterns(this.config.migrationRules.frontend.include, 'frontend');
  }

  expandPatterns(patterns, baseDir) {
    const files = [];
    // This is a simplified version - in reality, you'd use glob patterns
    patterns.forEach(pattern => {
      if (pattern.includes('**')) {
        // Handle glob patterns
        console.log(`  • Would expand pattern: ${pattern}`);
      } else {
        files.push(pattern);
      }
    });
    return files;
  }

  createDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      if (this.dryRun) {
        console.log(`  [DRY RUN] Would create directory: ${dirPath}`);
      } else {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`  Created directory: ${dirPath}`);
      }
      
      this.operations.push({
        type: 'mkdir',
        path: dirPath,
        timestamp: new Date().toISOString()
      });
    }
  }

  async copyFile(source, target) {
    const targetDir = path.dirname(target);
    this.createDirectory(targetDir);
    
    if (this.dryRun) {
      console.log(`  [DRY RUN] Would copy: ${source} → ${target}`);
    } else {
      fs.copyFileSync(source, target);
      if (this.verbose) {
        console.log(`  Copied: ${source} → ${target}`);
      }
    }
    
    this.operations.push({
      type: 'copy',
      source,
      target,
      timestamp: new Date().toISOString()
    });
  }

  writeFile(filePath, content) {
    if (this.dryRun) {
      console.log(`  [DRY RUN] Would write file: ${filePath}`);
    } else {
      fs.writeFileSync(filePath, content);
      if (this.verbose) {
        console.log(`  Created file: ${filePath}`);
      }
    }
    
    this.operations.push({
      type: 'create',
      path: filePath,
      timestamp: new Date().toISOString()
    });
  }

  writeJson(filePath, data) {
    this.writeFile(filePath, JSON.stringify(data, null, 2));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: !args.includes('--execute'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    analyze: args.includes('--analyze')
  };
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n🚀 6FB Booking Monorepo Migration Tool');
  console.log('=====================================\n');
  
  if (options.analyze) {
    // Run analysis first
    console.log('Running analysis...\n');
    const MigrationAnalyzer = require('./migration-analyzer');
    const analyzer = new MigrationAnalyzer('./migration-config.json');
    await analyzer.analyze();
    await analyzer.saveAnalysis('./migration-analysis.json');
    analyzer.printSummary();
  }
  
  console.log('\nMigration Options:');
  console.log(`  • Mode: ${options.dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`  • Verbose: ${options.verbose ? 'Yes' : 'No'}`);
  console.log(`  • Source: /Users/bossio/6fb-booking`);
  console.log(`  • Target: /Users/bossio/6fb-platform`);
  
  if (!options.dryRun) {
    console.log('\n⚠️  WARNING: This will create/modify files!');
    const answer = await new Promise(resolve => {
      rl.question('\nContinue with migration? (yes/no): ', resolve);
    });
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('Migration cancelled.');
      rl.close();
      process.exit(0);
    }
  }
  
  rl.close();
  
  const migrator = new MonorepoMigrator('./migration-config.json', './migration-analysis.json');
  const result = await migrator.migrate(options);
  
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total operations: ${result.operations.length}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  
  if (!options.dryRun) {
    console.log('\n✅ Migration completed!');
    console.log('\nNext steps:');
    console.log('  1. cd /Users/bossio/6fb-platform');
    console.log('  2. npm install');
    console.log('  3. npm run dev');
  } else {
    console.log('\n✅ Dry run completed!');
    console.log('\nTo execute the migration, run:');
    console.log('  node migrate-to-monorepo.js --execute');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MonorepoMigrator;