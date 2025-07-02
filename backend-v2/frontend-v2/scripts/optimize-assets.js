#!/usr/bin/env node

/**
 * Asset Optimization Script
 * Comprehensive optimization for images, fonts, and other static assets
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class AssetOptimizer {
  constructor() {
    this.publicDir = path.join(process.cwd(), 'public')
    this.optimizedCount = 0
    this.totalSaved = 0
    this.results = {
      images: [],
      fonts: [],
      icons: [],
      other: [],
    }
  }

  async optimize() {
    console.log('🚀 Starting asset optimization...\n')

    try {
      // Create optimized directories if they don't exist
      this.ensureDirectories()
      
      // Optimize different asset types
      await this.optimizeImages()
      await this.optimizeFonts()
      await this.optimizeIcons()
      await this.optimizeOtherAssets()
      
      // Generate report
      this.generateReport()
      
      console.log('✅ Asset optimization complete!')
      
    } catch (error) {
      console.error('❌ Asset optimization failed:', error.message)
      process.exit(1)
    }
  }

  ensureDirectories() {
    const dirs = [
      path.join(this.publicDir, 'images', 'optimized'),
      path.join(this.publicDir, 'fonts', 'optimized'),
      path.join(this.publicDir, 'icons', 'optimized'),
    ]

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })
  }

  async optimizeImages() {
    console.log('🖼️  Optimizing images...')
    
    const imageDir = path.join(this.publicDir, 'images')
    if (!fs.existsSync(imageDir)) {
      console.log('   No images directory found, skipping...')
      return
    }

    const imageFiles = this.getFiles(imageDir, ['.jpg', '.jpeg', '.png', '.webp', '.avif'])
    
    for (const file of imageFiles) {
      await this.optimizeImage(file)
    }

    console.log(`   Optimized ${imageFiles.length} images`)
  }

  async optimizeImage(filePath) {
    try {
      const stats = fs.statSync(filePath)
      const originalSize = stats.size
      const ext = path.extname(filePath).toLowerCase()
      const basename = path.basename(filePath, ext)
      const dir = path.dirname(filePath)
      const optimizedDir = path.join(dir, 'optimized')

      let optimizedPath
      let command

      switch (ext) {
        case '.jpg':
        case '.jpeg':
          optimizedPath = path.join(optimizedDir, `${basename}.webp`)
          // Convert to WebP with quality optimization
          command = `npx @squoosh/cli --webp '{"quality":85}' "${filePath}" --output-dir "${optimizedDir}"`
          break

        case '.png':
          optimizedPath = path.join(optimizedDir, `${basename}.webp`)
          // Convert PNG to WebP
          command = `npx @squoosh/cli --webp '{"quality":90}' "${filePath}" --output-dir "${optimizedDir}"`
          break

        case '.webp':
          // Re-optimize WebP
          optimizedPath = path.join(optimizedDir, path.basename(filePath))
          command = `npx @squoosh/cli --webp '{"quality":85}' "${filePath}" --output-dir "${optimizedDir}"`
          break

        default:
          return
      }

      try {
        execSync(command, { stdio: 'pipe' })
        
        if (fs.existsSync(optimizedPath)) {
          const optimizedStats = fs.statSync(optimizedPath)
          const optimizedSize = optimizedStats.size
          const saved = originalSize - optimizedSize
          const savings = ((saved / originalSize) * 100).toFixed(1)

          this.results.images.push({
            original: path.relative(this.publicDir, filePath),
            optimized: path.relative(this.publicDir, optimizedPath),
            originalSize: this.formatBytes(originalSize),
            optimizedSize: this.formatBytes(optimizedSize),
            saved: this.formatBytes(saved),
            savings: `${savings}%`,
          })

          this.optimizedCount++
          this.totalSaved += saved
        }
      } catch (optimizeError) {
        console.warn(`   Warning: Failed to optimize ${path.basename(filePath)}`)
      }
    } catch (error) {
      console.warn(`   Warning: Error processing ${filePath}:`, error.message)
    }
  }

  async optimizeFonts() {
    console.log('🔤 Optimizing fonts...')
    
    const fontDir = path.join(this.publicDir, 'fonts')
    if (!fs.existsSync(fontDir)) {
      console.log('   No fonts directory found, skipping...')
      return
    }

    const fontFiles = this.getFiles(fontDir, ['.ttf', '.otf', '.woff', '.woff2'])
    
    for (const file of fontFiles) {
      await this.optimizeFont(file)
    }

    console.log(`   Processed ${fontFiles.length} fonts`)
  }

  async optimizeFont(filePath) {
    try {
      const stats = fs.statSync(filePath)
      const originalSize = stats.size
      const ext = path.extname(filePath).toLowerCase()
      const basename = path.basename(filePath, ext)
      const dir = path.dirname(filePath)
      const optimizedDir = path.join(dir, 'optimized')

      let optimizedPath
      let command

      if (ext === '.woff2') {
        // Already optimized format
        this.results.fonts.push({
          file: path.relative(this.publicDir, filePath),
          status: 'Already optimized (WOFF2)',
          size: this.formatBytes(originalSize),
        })
        return
      }

      // Convert to WOFF2 (best compression)
      optimizedPath = path.join(optimizedDir, `${basename}.woff2`)
      
      try {
        // Use woff2 compression if available
        command = `npx woff2_compress "${filePath}"`
        execSync(command, { cwd: optimizedDir, stdio: 'pipe' })
        
        if (fs.existsSync(optimizedPath)) {
          const optimizedStats = fs.statSync(optimizedPath)
          const optimizedSize = optimizedStats.size
          const saved = originalSize - optimizedSize
          const savings = ((saved / originalSize) * 100).toFixed(1)

          this.results.fonts.push({
            original: path.relative(this.publicDir, filePath),
            optimized: path.relative(this.publicDir, optimizedPath),
            originalSize: this.formatBytes(originalSize),
            optimizedSize: this.formatBytes(optimizedSize),
            saved: this.formatBytes(saved),
            savings: `${savings}%`,
          })

          this.totalSaved += saved
        }
      } catch (optimizeError) {
        this.results.fonts.push({
          file: path.relative(this.publicDir, filePath),
          status: 'Optimization failed (missing woff2 tools)',
          size: this.formatBytes(originalSize),
        })
      }
    } catch (error) {
      console.warn(`   Warning: Error processing font ${filePath}:`, error.message)
    }
  }

  async optimizeIcons() {
    console.log('🎨 Optimizing icons...')
    
    const iconDir = path.join(this.publicDir, 'icons')
    if (!fs.existsSync(iconDir)) {
      console.log('   No icons directory found, skipping...')
      return
    }

    const svgFiles = this.getFiles(iconDir, ['.svg'])
    
    for (const file of svgFiles) {
      await this.optimizeSvg(file)
    }

    console.log(`   Optimized ${svgFiles.length} SVG icons`)
  }

  async optimizeSvg(filePath) {
    try {
      const stats = fs.statSync(filePath)
      const originalSize = stats.size
      const basename = path.basename(filePath)
      const dir = path.dirname(filePath)
      const optimizedDir = path.join(dir, 'optimized')
      const optimizedPath = path.join(optimizedDir, basename)

      // Use SVGO for SVG optimization
      const command = `npx svgo "${filePath}" --output "${optimizedPath}" --config '{"plugins":[{"name":"preset-default","params":{"overrides":{"removeViewBox":false}}}]}'`
      
      try {
        execSync(command, { stdio: 'pipe' })
        
        if (fs.existsSync(optimizedPath)) {
          const optimizedStats = fs.statSync(optimizedPath)
          const optimizedSize = optimizedStats.size
          const saved = originalSize - optimizedSize
          const savings = ((saved / originalSize) * 100).toFixed(1)

          this.results.icons.push({
            original: path.relative(this.publicDir, filePath),
            optimized: path.relative(this.publicDir, optimizedPath),
            originalSize: this.formatBytes(originalSize),
            optimizedSize: this.formatBytes(optimizedSize),
            saved: this.formatBytes(saved),
            savings: `${savings}%`,
          })

          this.totalSaved += saved
        }
      } catch (optimizeError) {
        console.warn(`   Warning: Failed to optimize ${basename}`)
      }
    } catch (error) {
      console.warn(`   Warning: Error processing SVG ${filePath}:`, error.message)
    }
  }

  async optimizeOtherAssets() {
    console.log('📄 Checking other assets...')
    
    // Check for CSS files that can be minified
    const cssFiles = this.getFiles(this.publicDir, ['.css'])
    
    for (const file of cssFiles) {
      await this.optimizeCss(file)
    }

    // Check for large JSON files
    const jsonFiles = this.getFiles(this.publicDir, ['.json'])
    
    for (const file of jsonFiles) {
      this.analyzeJson(file)
    }

    console.log(`   Processed ${cssFiles.length} CSS files and ${jsonFiles.length} JSON files`)
  }

  async optimizeCss(filePath) {
    try {
      const stats = fs.statSync(filePath)
      const originalSize = stats.size
      const content = fs.readFileSync(filePath, 'utf8')
      
      // Simple CSS minification
      const minified = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
        .replace(/\s*{\s*/g, '{') // Clean up braces
        .replace(/\s*}\s*/g, '}')
        .replace(/\s*;\s*/g, ';')
        .replace(/\s*:\s*/g, ':')
        .replace(/\s*,\s*/g, ',')
        .trim()

      const optimizedSize = Buffer.byteLength(minified, 'utf8')
      const saved = originalSize - optimizedSize
      const savings = ((saved / originalSize) * 100).toFixed(1)

      if (saved > 0) {
        const basename = path.basename(filePath, '.css')
        const dir = path.dirname(filePath)
        const optimizedPath = path.join(dir, `${basename}.min.css`)
        
        fs.writeFileSync(optimizedPath, minified, 'utf8')

        this.results.other.push({
          type: 'CSS',
          original: path.relative(this.publicDir, filePath),
          optimized: path.relative(this.publicDir, optimizedPath),
          originalSize: this.formatBytes(originalSize),
          optimizedSize: this.formatBytes(optimizedSize),
          saved: this.formatBytes(saved),
          savings: `${savings}%`,
        })

        this.totalSaved += saved
      }
    } catch (error) {
      console.warn(`   Warning: Error processing CSS ${filePath}:`, error.message)
    }
  }

  analyzeJson(filePath) {
    try {
      const stats = fs.statSync(filePath)
      const size = stats.size
      
      if (size > 100 * 1024) { // Larger than 100KB
        this.results.other.push({
          type: 'JSON',
          file: path.relative(this.publicDir, filePath),
          size: this.formatBytes(size),
          recommendation: 'Consider splitting or compressing large JSON files',
        })
      }
    } catch (error) {
      console.warn(`   Warning: Error analyzing JSON ${filePath}:`, error.message)
    }
  }

  getFiles(dir, extensions) {
    const files = []
    
    const walk = (currentDir) => {
      try {
        const items = fs.readdirSync(currentDir)
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item)
          const stat = fs.statSync(fullPath)
          
          if (stat.isDirectory() && !item.includes('optimized')) {
            walk(fullPath)
          } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase()
            if (extensions.includes(ext)) {
              files.push(fullPath)
            }
          }
        }
      } catch (error) {
        console.warn(`   Warning: Cannot read directory ${currentDir}:`, error.message)
      }
    }
    
    if (fs.existsSync(dir)) {
      walk(dir)
    }
    
    return files
  }

  generateReport() {
    console.log('\n📊 Asset Optimization Report')
    console.log('=' .repeat(50))
    
    console.log(`\n📈 Summary:`)
    console.log(`Total files optimized: ${this.optimizedCount}`)
    console.log(`Total space saved: ${this.formatBytes(this.totalSaved)}`)
    
    // Images report
    if (this.results.images.length > 0) {
      console.log('\n🖼️  Images:')
      this.results.images.forEach(img => {
        console.log(`  ${img.original} → ${img.optimized}`)
        console.log(`    ${img.originalSize} → ${img.optimizedSize} (saved ${img.saved}, ${img.savings})`)
      })
    }
    
    // Fonts report
    if (this.results.fonts.length > 0) {
      console.log('\n🔤 Fonts:')
      this.results.fonts.forEach(font => {
        if (font.optimized) {
          console.log(`  ${font.original} → ${font.optimized}`)
          console.log(`    ${font.originalSize} → ${font.optimizedSize} (saved ${font.saved}, ${font.savings})`)
        } else {
          console.log(`  ${font.file}: ${font.status} (${font.size})`)
        }
      })
    }
    
    // Icons report
    if (this.results.icons.length > 0) {
      console.log('\n🎨 Icons:')
      this.results.icons.forEach(icon => {
        console.log(`  ${icon.original} → ${icon.optimized}`)
        console.log(`    ${icon.originalSize} → ${icon.optimizedSize} (saved ${icon.saved}, ${icon.savings})`)
      })
    }
    
    // Other assets report
    if (this.results.other.length > 0) {
      console.log('\n📄 Other Assets:')
      this.results.other.forEach(asset => {
        if (asset.optimized) {
          console.log(`  [${asset.type}] ${asset.original} → ${asset.optimized}`)
          console.log(`    ${asset.originalSize} → ${asset.optimizedSize} (saved ${asset.saved}, ${asset.savings})`)
        } else {
          console.log(`  [${asset.type}] ${asset.file}: ${asset.recommendation} (${asset.size})`)
        }
      })
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:')
    console.log('  • Use WebP/AVIF images for better compression')
    console.log('  • Convert TTF/OTF fonts to WOFF2 format')
    console.log('  • Optimize SVG icons with SVGO')
    console.log('  • Enable Brotli/Gzip compression on your server')
    console.log('  • Consider using a CDN for static assets')
    console.log('  • Implement lazy loading for images below the fold')
    
    // Save detailed report
    this.saveDetailedReport()
    console.log('\n📄 Detailed report saved to: asset-optimization-report.json')
  }

  saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOptimized: this.optimizedCount,
        totalSaved: this.totalSaved,
        totalSavedFormatted: this.formatBytes(this.totalSaved),
      },
      results: this.results,
      recommendations: [
        'Use modern image formats (WebP, AVIF)',
        'Convert fonts to WOFF2',
        'Optimize SVG icons',
        'Enable server compression',
        'Use CDN for static assets',
        'Implement lazy loading',
      ]
    }
    
    fs.writeFileSync('asset-optimization-report.json', JSON.stringify(report, null, 2))
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Check for required tools
function checkRequiredTools() {
  const tools = [
    { name: 'npx', command: 'npx --version' },
  ]
  
  const missing = []
  
  tools.forEach(tool => {
    try {
      execSync(tool.command, { stdio: 'pipe' })
    } catch (error) {
      missing.push(tool.name)
    }
  })
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing tools: ${missing.join(', ')}`)
    console.log('Some optimizations may be skipped.')
  }
}

// Run optimization
if (require.main === module) {
  checkRequiredTools()
  const optimizer = new AssetOptimizer()
  optimizer.optimize().catch(console.error)
}

module.exports = AssetOptimizer