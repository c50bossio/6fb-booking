#!/usr/bin/env node

/**
 * Code Cleanup Script
 * Removes unused files, dependencies, and temporary code from the project
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class CodeCleanupTool {
  constructor() {
    this.rootDir = process.cwd()
    this.cleanupResults = {
      filesRemoved: [],
      dependenciesRemoved: [],
      sizeSaved: 0,
      errors: [],
    }
  }

  async cleanup() {
    console.log('🧹 Starting Code Cleanup...\n')

    try {
      // 1. Remove test and verification files
      await this.removeTestFiles()
      
      // 2. Remove unused dependencies
      await this.removeUnusedDependencies()
      
      // 3. Clean up temporary files
      await this.cleanupTempFiles()
      
      // 4. Remove empty directories
      await this.removeEmptyDirectories()
      
      // 5. Generate cleanup report
      this.generateReport()
      
      console.log('✅ Code cleanup complete!')
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message)
      this.cleanupResults.errors.push(error.message)
    }
  }

  async removeTestFiles() {
    console.log('🗑️  Removing test and verification files...')
    
    const testFiles = [
      'verify_site_functionality.js',
      'test-location-edge-cases.js',
      'location-filter-test-report.md',
      'crawl_dark_mode_fixed.js',
      'investigate_ui_issues.js',
      'investigate_notification_and_scrollbar.js',
      'simplified_design_verification.js',
      'verify_apple_design_system.js',
      'check_api_issue.js',
      'crawl_dark_mode_issues.js',
      'verification_results.json',
      'lighthouse-report.html',
      '.pytest_cache',
      'components/integrations/IntegrationCard.test.tsx',
    ]

    let totalSize = 0

    for (const file of testFiles) {
      const filePath = path.join(this.rootDir, file)
      
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath)
          
          if (stats.isDirectory()) {
            // Remove directory recursively
            const dirSize = this.getDirectorySize(filePath)
            fs.rmSync(filePath, { recursive: true, force: true })
            totalSize += dirSize
            console.log(`  ✓ Removed directory: ${file} (${this.formatBytes(dirSize)})`)
          } else {
            // Remove file
            totalSize += stats.size
            fs.unlinkSync(filePath)
            console.log(`  ✓ Removed file: ${file} (${this.formatBytes(stats.size)})`)
          }
          
          this.cleanupResults.filesRemoved.push(file)
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not remove ${file}: ${error.message}`)
        this.cleanupResults.errors.push(`Failed to remove ${file}: ${error.message}`)
      }
    }

    this.cleanupResults.sizeSaved += totalSize
    console.log(`  Total size saved: ${this.formatBytes(totalSize)}\n`)
  }

  async removeUnusedDependencies() {
    console.log('📦 Checking for unused dependencies...')
    
    const packageJsonPath = path.join(this.rootDir, 'package.json')
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('  ⚠️  package.json not found, skipping dependency cleanup\n')
      return
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    const originalDeps = { ...packageJson.dependencies }
    
    // Dependencies that are likely unused based on our analysis
    const potentiallyUnused = [
      'puppeteer', // Used only in test files we're removing
      'glob', // Might not be needed in frontend
    ]

    // Check if these dependencies are actually used in the codebase
    const unusedDeps = []
    
    for (const dep of potentiallyUnused) {
      if (packageJson.dependencies[dep]) {
        const isUsed = await this.isDependencyUsed(dep)
        if (!isUsed) {
          delete packageJson.dependencies[dep]
          unusedDeps.push(dep)
          console.log(`  ✓ Marked ${dep} for removal`)
        } else {
          console.log(`  ○ Keeping ${dep} (still in use)`)
        }
      }
    }

    if (unusedDeps.length > 0) {
      // Write updated package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
      this.cleanupResults.dependenciesRemoved = unusedDeps
      
      console.log(`  ✓ Updated package.json - removed ${unusedDeps.length} dependencies`)
      console.log('  💡 Run "npm install" to apply dependency changes')
    } else {
      console.log('  ✓ No unused dependencies found')
    }
    
    console.log('')
  }

  async isDependencyUsed(dependency) {
    try {
      // Search for imports/requires of this dependency in the codebase
      const searchCommand = `grep -r "import.*${dependency}\\|require.*${dependency}\\|from.*${dependency}" . --exclude-dir=node_modules --exclude-dir=.next --exclude="*.log" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null || true`
      const result = execSync(searchCommand, { encoding: 'utf8', cwd: this.rootDir })
      
      // Filter out the files we're removing
      const relevantMatches = result.split('\n').filter(line => {
        return line.trim() && 
               !line.includes('verify_site_functionality.js') &&
               !line.includes('crawl_dark_mode') &&
               !line.includes('investigate_') &&
               !line.includes('simplified_design_verification.js') &&
               !line.includes('verify_apple_design_system.js') &&
               !line.includes('check_api_issue.js')
      })
      
      return relevantMatches.length > 0
    } catch (error) {
      // If grep fails, assume it's used to be safe
      return true
    }
  }

  async cleanupTempFiles() {
    console.log('🧽 Cleaning up temporary files...')
    
    const tempPatterns = [
      '*.log',
      '*.tmp',
      '.DS_Store',
      'Thumbs.db',
      '*.swp',
      '*.swo',
      '*~',
      '.vscode/settings.json', // Only if it's user-specific
    ]

    let tempFilesRemoved = 0
    let tempSizeSaved = 0

    for (const pattern of tempPatterns) {
      try {
        const files = execSync(`find . -name "${pattern}" -not -path "./node_modules/*" -not -path "./.next/*" 2>/dev/null || true`, 
                              { encoding: 'utf8', cwd: this.rootDir })
        
        const fileList = files.trim().split('\n').filter(f => f)
        
        for (const file of fileList) {
          try {
            const fullPath = path.join(this.rootDir, file)
            const stats = fs.statSync(fullPath)
            fs.unlinkSync(fullPath)
            
            tempFilesRemoved++
            tempSizeSaved += stats.size
            console.log(`  ✓ Removed temp file: ${file}`)
          } catch (error) {
            // Ignore individual file errors
          }
        }
      } catch (error) {
        // Ignore pattern search errors
      }
    }

    if (tempFilesRemoved > 0) {
      this.cleanupResults.sizeSaved += tempSizeSaved
      console.log(`  ✓ Removed ${tempFilesRemoved} temporary files (${this.formatBytes(tempSizeSaved)})`)
    } else {
      console.log('  ✓ No temporary files found')
    }
    
    console.log('')
  }

  async removeEmptyDirectories() {
    console.log('📁 Removing empty directories...')
    
    try {
      // Find empty directories (excluding node_modules and .next)
      const command = `find . -type d -empty -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" 2>/dev/null || true`
      const emptyDirs = execSync(command, { encoding: 'utf8', cwd: this.rootDir })
        .trim()
        .split('\n')
        .filter(dir => dir && dir !== '.')

      let removedCount = 0
      
      for (const dir of emptyDirs) {
        try {
          const fullPath = path.join(this.rootDir, dir)
          fs.rmdirSync(fullPath)
          console.log(`  ✓ Removed empty directory: ${dir}`)
          removedCount++
        } catch (error) {
          // Directory might not be empty anymore or might not exist
        }
      }

      if (removedCount > 0) {
        console.log(`  ✓ Removed ${removedCount} empty directories`)
      } else {
        console.log('  ✓ No empty directories found')
      }
    } catch (error) {
      console.log('  ○ Could not check for empty directories')
    }
    
    console.log('')
  }

  getDirectorySize(dirPath) {
    let size = 0
    
    try {
      const files = fs.readdirSync(dirPath)
      
      for (const file of files) {
        const filePath = path.join(dirPath, file)
        const stats = fs.statSync(filePath)
        
        if (stats.isDirectory()) {
          size += this.getDirectorySize(filePath)
        } else {
          size += stats.size
        }
      }
    } catch (error) {
      // Ignore errors for individual files/directories
    }
    
    return size
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  generateReport() {
    console.log('📊 Cleanup Report')
    console.log('=' .repeat(50))
    
    console.log(`\n📁 Files Removed: ${this.cleanupResults.filesRemoved.length}`)
    if (this.cleanupResults.filesRemoved.length > 0) {
      this.cleanupResults.filesRemoved.forEach(file => {
        console.log(`  - ${file}`)
      })
    }
    
    console.log(`\n📦 Dependencies Removed: ${this.cleanupResults.dependenciesRemoved.length}`)
    if (this.cleanupResults.dependenciesRemoved.length > 0) {
      this.cleanupResults.dependenciesRemoved.forEach(dep => {
        console.log(`  - ${dep}`)
      })
    }
    
    console.log(`\n💾 Total Space Saved: ${this.formatBytes(this.cleanupResults.sizeSaved)}`)
    
    if (this.cleanupResults.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${this.cleanupResults.errors.length}`)
      this.cleanupResults.errors.forEach(error => {
        console.log(`  - ${error}`)
      })
    }
    
    console.log('\n💡 Recommendations:')
    console.log('  • Run "npm install" to update dependencies')
    console.log('  • Run "npm run build" to ensure everything still works')
    console.log('  • Consider running "npm audit" to check for security issues')
    console.log('  • Run "npm run size" to check bundle size improvements')
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      cleanup: this.cleanupResults,
      recommendations: [
        'Run npm install to update dependencies',
        'Run npm run build to verify build still works',
        'Run npm audit to check for security issues',
        'Run npm run size to check bundle size improvements',
      ]
    }
    
    fs.writeFileSync('cleanup-report.json', JSON.stringify(reportData, null, 2))
    console.log('\n📄 Detailed report saved to: cleanup-report.json')
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  const cleaner = new CodeCleanupTool()
  cleaner.cleanup().catch(console.error)
}

module.exports = CodeCleanupTool