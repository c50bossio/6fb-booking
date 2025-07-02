#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Comprehensive bundle size analysis and optimization recommendations
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const BUNDLE_ANALYSIS_DIR = '.next/analyze'
const STATIC_DIR = '.next/static'

class BundleAnalyzer {
  constructor() {
    this.results = {
      totalSize: 0,
      chunks: [],
      recommendations: [],
      performance: {}
    }
  }

  async analyze() {
    console.log('🔍 Starting bundle analysis...\n')

    try {
      // Ensure build exists
      this.ensureBuildExists()
      
      // Analyze chunks
      this.analyzeChunks()
      
      // Analyze static assets
      this.analyzeStaticAssets()
      
      // Generate recommendations
      this.generateRecommendations()
      
      // Calculate performance metrics
      this.calculatePerformanceMetrics()
      
      // Generate report
      this.generateReport()
      
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message)
      process.exit(1)
    }
  }

  ensureBuildExists() {
    if (!fs.existsSync('.next')) {
      console.log('📦 No build found. Running build...')
      execSync('npm run build', { stdio: 'inherit' })
    }
  }

  analyzeChunks() {
    const chunksPath = path.join(STATIC_DIR, 'chunks')
    
    if (!fs.existsSync(chunksPath)) {
      throw new Error('Chunks directory not found. Please run npm run build first.')
    }

    console.log('📊 Analyzing chunks...')
    
    const chunks = this.getFilesRecursively(chunksPath)
    
    chunks.forEach(chunk => {
      const stats = fs.statSync(chunk)
      const relativePath = path.relative('.next', chunk)
      const size = stats.size
      
      this.results.chunks.push({
        path: relativePath,
        size: size,
        sizeFormatted: this.formatBytes(size),
        type: this.getChunkType(chunk),
        isLarge: size > 250 * 1024 // 250KB threshold
      })
      
      this.results.totalSize += size
    })

    // Sort by size (largest first)
    this.results.chunks.sort((a, b) => b.size - a.size)
  }

  analyzeStaticAssets() {
    console.log('🖼️  Analyzing static assets...')
    
    const cssPath = path.join(STATIC_DIR, 'css')
    const mediaPath = path.join(STATIC_DIR, 'media')
    
    // Analyze CSS
    if (fs.existsSync(cssPath)) {
      const cssFiles = this.getFilesRecursively(cssPath)
      cssFiles.forEach(file => {
        const stats = fs.statSync(file)
        this.results.chunks.push({
          path: path.relative('.next', file),
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
          type: 'css',
          isLarge: stats.size > 50 * 1024 // 50KB threshold for CSS
        })
      })
    }

    // Analyze media files
    if (fs.existsSync(mediaPath)) {
      const mediaFiles = this.getFilesRecursively(mediaPath)
      mediaFiles.forEach(file => {
        const stats = fs.statSync(file)
        this.results.chunks.push({
          path: path.relative('.next', file),
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
          type: 'media',
          isLarge: stats.size > 100 * 1024 // 100KB threshold for media
        })
      })
    }
  }

  generateRecommendations() {
    console.log('💡 Generating recommendations...')
    
    const largeChunks = this.results.chunks.filter(chunk => chunk.isLarge)
    const totalSizeMB = this.results.totalSize / (1024 * 1024)

    // Size-based recommendations
    if (totalSizeMB > 1) {
      this.results.recommendations.push({
        type: 'warning',
        title: 'Large bundle size',
        description: `Total bundle size (${this.formatBytes(this.results.totalSize)}) exceeds 1MB`,
        suggestions: [
          'Enable tree shaking for unused exports',
          'Implement code splitting with dynamic imports',
          'Consider lazy loading non-critical components',
          'Optimize large dependencies'
        ]
      })
    }

    // Large chunks
    if (largeChunks.length > 0) {
      this.results.recommendations.push({
        type: 'info',
        title: 'Large chunks detected',
        description: `Found ${largeChunks.length} chunks larger than recommended size`,
        suggestions: largeChunks.slice(0, 5).map(chunk => 
          `Split ${chunk.path} (${chunk.sizeFormatted})`
        )
      })
    }

    // Library-specific recommendations
    const hasChartJS = this.results.chunks.some(chunk => 
      chunk.path.includes('chart') || chunk.path.includes('chartjs')
    )
    
    if (hasChartJS) {
      this.results.recommendations.push({
        type: 'tip',
        title: 'Chart.js optimization',
        description: 'Chart.js detected in bundle',
        suggestions: [
          'Use tree shaking to import only needed chart types',
          'Consider lazy loading chart components',
          'Use dynamic imports for chart pages'
        ]
      })
    }

    // CSS recommendations
    const largeCSS = this.results.chunks.filter(chunk => 
      chunk.type === 'css' && chunk.size > 30 * 1024
    )
    
    if (largeCSS.length > 0) {
      this.results.recommendations.push({
        type: 'info',
        title: 'CSS optimization opportunities',
        description: 'Large CSS files detected',
        suggestions: [
          'Enable CSS purging in production',
          'Consider critical CSS extraction',
          'Use CSS-in-JS for component-specific styles',
          'Optimize Tailwind CSS configuration'
        ]
      })
    }
  }

  calculatePerformanceMetrics() {
    const jsChunks = this.results.chunks.filter(chunk => 
      chunk.type === 'js' || chunk.path.includes('.js')
    )
    const cssChunks = this.results.chunks.filter(chunk => chunk.type === 'css')
    
    this.results.performance = {
      totalJS: jsChunks.reduce((sum, chunk) => sum + chunk.size, 0),
      totalCSS: cssChunks.reduce((sum, chunk) => sum + chunk.size, 0),
      chunkCount: this.results.chunks.length,
      largeChunkCount: this.results.chunks.filter(chunk => chunk.isLarge).length,
      estimatedLoadTime: this.estimateLoadTime(this.results.totalSize),
      grades: this.calculateGrades()
    }
  }

  calculateGrades() {
    const totalSizeMB = this.results.totalSize / (1024 * 1024)
    const largeChunkRatio = this.results.performance.largeChunkCount / this.results.performance.chunkCount
    
    // Size grade (A-F)
    let sizeGrade = 'A'
    if (totalSizeMB > 2) sizeGrade = 'F'
    else if (totalSizeMB > 1.5) sizeGrade = 'D'
    else if (totalSizeMB > 1) sizeGrade = 'C'
    else if (totalSizeMB > 0.5) sizeGrade = 'B'

    // Optimization grade
    let optimizationGrade = 'A'
    if (largeChunkRatio > 0.5) optimizationGrade = 'F'
    else if (largeChunkRatio > 0.3) optimizationGrade = 'D'
    else if (largeChunkRatio > 0.2) optimizationGrade = 'C'
    else if (largeChunkRatio > 0.1) optimizationGrade = 'B'

    return { size: sizeGrade, optimization: optimizationGrade }
  }

  estimateLoadTime(bytes) {
    // Estimate based on 3G connection (1.6 Mbps)
    const bitsPerSecond = 1.6 * 1024 * 1024
    const bytesPerSecond = bitsPerSecond / 8
    return (bytes / bytesPerSecond).toFixed(2)
  }

  generateReport() {
    console.log('\n📋 Bundle Analysis Report')
    console.log('=' .repeat(50))
    
    // Overall metrics
    console.log('\n📊 Overall Metrics:')
    console.log(`Total bundle size: ${this.formatBytes(this.results.totalSize)}`)
    console.log(`Total JS size: ${this.formatBytes(this.results.performance.totalJS)}`)
    console.log(`Total CSS size: ${this.formatBytes(this.results.performance.totalCSS)}`)
    console.log(`Number of chunks: ${this.results.performance.chunkCount}`)
    console.log(`Large chunks: ${this.results.performance.largeChunkCount}`)
    console.log(`Estimated load time (3G): ${this.results.performance.estimatedLoadTime}s`)
    
    // Grades
    console.log('\n🎯 Performance Grades:')
    console.log(`Size grade: ${this.getGradeEmoji(this.results.performance.grades.size)} ${this.results.performance.grades.size}`)
    console.log(`Optimization grade: ${this.getGradeEmoji(this.results.performance.grades.optimization)} ${this.results.performance.grades.optimization}`)
    
    // Top 10 largest chunks
    console.log('\n📦 Largest Chunks:')
    this.results.chunks.slice(0, 10).forEach((chunk, index) => {
      const indicator = chunk.isLarge ? '⚠️ ' : '✅ '
      console.log(`${index + 1}. ${indicator}${chunk.path} - ${chunk.sizeFormatted}`)
    })
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      this.results.recommendations.forEach((rec, index) => {
        const emoji = rec.type === 'warning' ? '⚠️' : rec.type === 'info' ? 'ℹ️' : '💡'
        console.log(`\n${index + 1}. ${emoji} ${rec.title}`)
        console.log(`   ${rec.description}`)
        rec.suggestions.forEach(suggestion => {
          console.log(`   • ${suggestion}`)
        })
      })
    }
    
    // Save detailed report
    this.saveDetailedReport()
    
    console.log('\n✅ Analysis complete!')
    console.log(`📄 Detailed report saved to: bundle-analysis-report.json`)
  }

  saveDetailedReport() {
    const reportPath = 'bundle-analysis-report.json'
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSize: this.results.totalSize,
        totalSizeFormatted: this.formatBytes(this.results.totalSize),
        performance: this.results.performance,
        grades: this.results.performance.grades
      },
      chunks: this.results.chunks,
      recommendations: this.results.recommendations
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  }

  // Utility methods
  getFilesRecursively(dir) {
    const files = []
    
    const walk = (currentDir) => {
      const items = fs.readdirSync(currentDir)
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          walk(fullPath)
        } else {
          files.push(fullPath)
        }
      }
    }
    
    if (fs.existsSync(dir)) {
      walk(dir)
    }
    
    return files
  }

  getChunkType(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    const basename = path.basename(filePath, ext)
    
    if (ext === '.css') return 'css'
    if (ext === '.js') {
      if (basename.includes('framework')) return 'framework'
      if (basename.includes('vendor')) return 'vendor'
      if (basename.includes('main')) return 'main'
      if (basename.includes('chunk')) return 'chunk'
      return 'js'
    }
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) return 'image'
    return 'other'
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  getGradeEmoji(grade) {
    const emojis = { A: '🟢', B: '🟡', C: '🟠', D: '🔴', F: '⚫' }
    return emojis[grade] || '⚪'
  }
}

// Run analysis
if (require.main === module) {
  const analyzer = new BundleAnalyzer()
  analyzer.analyze().catch(console.error)
}

module.exports = BundleAnalyzer