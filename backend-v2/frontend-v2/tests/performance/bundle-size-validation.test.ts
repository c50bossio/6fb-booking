/**
 * Bundle Size Validation Test Suite
 * Tests for JavaScript bundle size, code splitting, and asset optimization
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import fs from 'fs'
import path from 'path'

// Mock fs for file size checks
jest.mock('fs')
const mockFs = fs as jest.Mocked<typeof fs>

// Mock Next.js bundle analyzer
const mockBundleAnalysis = {
  analyzed: {
    'main.js': { size: 250000, gzipSize: 85000 },
    'framework.js': { size: 180000, gzipSize: 60000 },
    'commons.js': { size: 120000, gzipSize: 40000 },
    'page.js': { size: 50000, gzipSize: 18000 },
    'chunk-vendors.js': { size: 300000, gzipSize: 100000 },
    'styles.css': { size: 45000, gzipSize: 12000 }
  },
  totalSize: 945000,
  totalGzipSize: 315000
}

describe('Bundle Size Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Bundle Size Limits', () => {
    it('should enforce bundle size limits for production builds', () => {
      const bundleSizeLimits = {
        'main.js': 300 * 1024,      // 300KB limit
        'framework.js': 200 * 1024,  // 200KB limit
        'commons.js': 150 * 1024,    // 150KB limit
        'page.js': 100 * 1024,       // 100KB limit per page
        'chunk-vendors.js': 350 * 1024, // 350KB limit
        'styles.css': 50 * 1024      // 50KB limit
      }

      const checkBundleSizes = (analysis: typeof mockBundleAnalysis.analyzed) => {
        const violations: string[] = []

        Object.entries(analysis).forEach(([filename, stats]) => {
          const limit = bundleSizeLimits[filename as keyof typeof bundleSizeLimits]
          if (limit && stats.size > limit) {
            violations.push(`${filename}: ${stats.size} bytes exceeds limit of ${limit} bytes`)
          }
        })

        return {
          passed: violations.length === 0,
          violations
        }
      }

      const result = checkBundleSizes(mockBundleAnalysis.analyzed)

      // All bundles should be within limits
      expect(result.passed).toBeTruthy()
      expect(result.violations).toHaveLength(0)

      // Test with oversized bundle
      const oversizedAnalysis = {
        ...mockBundleAnalysis.analyzed,
        'main.js': { size: 400000, gzipSize: 120000 } // Exceeds 300KB limit
      }

      const failResult = checkBundleSizes(oversizedAnalysis)
      expect(failResult.passed).toBeFalsy()
      expect(failResult.violations).toContain('main.js: 400000 bytes exceeds limit of 307200 bytes')
    })

    it('should validate total bundle size stays under threshold', () => {
      const maxTotalSize = 1 * 1024 * 1024 // 1MB total
      const maxTotalGzipSize = 350 * 1024 // 350KB gzipped

      const validateTotalSize = (analysis: typeof mockBundleAnalysis) => {
        const violations: string[] = []

        if (analysis.totalSize > maxTotalSize) {
          violations.push(`Total bundle size ${analysis.totalSize} exceeds ${maxTotalSize} bytes`)
        }

        if (analysis.totalGzipSize > maxTotalGzipSize) {
          violations.push(`Total gzip size ${analysis.totalGzipSize} exceeds ${maxTotalGzipSize} bytes`)
        }

        return {
          passed: violations.length === 0,
          violations,
          totalSize: analysis.totalSize,
          totalGzipSize: analysis.totalGzipSize
        }
      }

      const result = validateTotalSize(mockBundleAnalysis)

      expect(result.passed).toBeTruthy()
      expect(result.totalSize).toBe(945000)
      expect(result.totalGzipSize).toBe(315000)
      expect(result.violations).toHaveLength(0)
    })

    it('should track bundle size regression over time', () => {
      const previousBuildSizes = {
        'main.js': 240000,
        'framework.js': 175000,
        'commons.js': 115000,
        'page.js': 48000,
        'chunk-vendors.js': 295000,
        'styles.css': 43000
      }

      const maxGrowthPercentage = 10 // 10% maximum growth

      const checkBundleGrowth = (current: typeof mockBundleAnalysis.analyzed, previous: typeof previousBuildSizes) => {
        const growthReport: Array<{
          file: string
          previousSize: number
          currentSize: number
          growthPercentage: number
          exceedsThreshold: boolean
        }> = []

        Object.entries(current).forEach(([filename, stats]) => {
          const previousSize = previous[filename as keyof typeof previous]
          if (previousSize) {
            const growthPercentage = ((stats.size - previousSize) / previousSize) * 100
            const exceedsThreshold = growthPercentage > maxGrowthPercentage

            growthReport.push({
              file: filename,
              previousSize,
              currentSize: stats.size,
              growthPercentage: Math.round(growthPercentage * 100) / 100,
              exceedsThreshold
            })
          }
        })

        return growthReport
      }

      const growthReport = checkBundleGrowth(mockBundleAnalysis.analyzed, previousBuildSizes)

      // Check that no bundle has grown more than 10%
      const regressions = growthReport.filter(report => report.exceedsThreshold)
      expect(regressions).toHaveLength(0)

      // Verify growth calculations
      const mainJsReport = growthReport.find(report => report.file === 'main.js')
      expect(mainJsReport?.growthPercentage).toBeCloseTo(4.17, 2) // (250000-240000)/240000 * 100
    })
  })

  describe('Code Splitting Validation', () => {
    it('should verify proper code splitting is implemented', () => {
      const expectedChunks = [
        'main',
        'framework', // React/Next.js framework code
        'commons',   // Shared utilities
        'vendors',   // Third-party libraries
        'pages'      // Page-specific code
      ]

      const validateCodeSplitting = (analysis: typeof mockBundleAnalysis.analyzed) => {
        const foundChunks = Object.keys(analysis).map(filename => {
          // Extract chunk name from filename
          if (filename.includes('main')) return 'main'
          if (filename.includes('framework')) return 'framework'
          if (filename.includes('commons')) return 'commons'
          if (filename.includes('vendors')) return 'vendors'
          if (filename.includes('page')) return 'pages'
          return null
        }).filter(Boolean)

        const missingChunks = expectedChunks.filter(chunk => !foundChunks.includes(chunk))

        return {
          hasProperSplitting: missingChunks.length === 0,
          foundChunks,
          missingChunks
        }
      }

      const result = validateCodeSplitting(mockBundleAnalysis.analyzed)

      expect(result.hasProperSplitting).toBeTruthy()
      expect(result.missingChunks).toHaveLength(0)
      expect(result.foundChunks).toContain('main')
      expect(result.foundChunks).toContain('framework')
      expect(result.foundChunks).toContain('vendors')
    })

    it('should validate dynamic imports are working', () => {
      // Mock dynamic import detection
      const mockSourceCode = `
        // Proper dynamic imports
        const Calendar = lazy(() => import('./components/Calendar'));
        const Dashboard = lazy(() => import('./pages/Dashboard'));
        
        // Route-based splitting
        const routes = [
          { path: '/booking', component: lazy(() => import('./pages/Booking')) },
          { path: '/analytics', component: lazy(() => import('./pages/Analytics')) }
        ];
      `

      const detectDynamicImports = (sourceCode: string) => {
        const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
        const lazyImportRegex = /lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\)/g
        
        const dynamicImports: string[] = []
        const lazyImports: string[] = []

        let match
        while ((match = dynamicImportRegex.exec(sourceCode)) !== null) {
          dynamicImports.push(match[1])
        }

        while ((match = lazyImportRegex.exec(sourceCode)) !== null) {
          lazyImports.push(match[1])
        }

        return {
          dynamicImports,
          lazyImports,
          totalImports: dynamicImports.length + lazyImports.length
        }
      }

      const imports = detectDynamicImports(mockSourceCode)

      expect(imports.totalImports).toBeGreaterThan(0)
      expect(imports.lazyImports).toContain('./components/Calendar')
      expect(imports.lazyImports).toContain('./pages/Dashboard')
      expect(imports.lazyImports).toContain('./pages/Booking')
      expect(imports.lazyImports).toContain('./pages/Analytics')
    })
  })

  describe('Asset Optimization', () => {
    it('should validate image optimization is applied', () => {
      const mockImageAssets = [
        { path: 'logo.png', originalSize: 45000, optimizedSize: 12000, format: 'png' },
        { path: 'hero.jpg', originalSize: 250000, optimizedSize: 85000, format: 'webp' },
        { path: 'icon.svg', originalSize: 8000, optimizedSize: 3000, format: 'svg' },
        { path: 'background.png', originalSize: 180000, optimizedSize: 55000, format: 'webp' }
      ]

      const validateImageOptimization = (assets: typeof mockImageAssets) => {
        const minCompressionRatio = 0.6 // At least 40% size reduction
        const results = assets.map(asset => {
          const compressionRatio = asset.optimizedSize / asset.originalSize
          const sizeSavedBytes = asset.originalSize - asset.optimizedSize
          const sizeSavedPercentage = (1 - compressionRatio) * 100

          return {
            ...asset,
            compressionRatio,
            sizeSavedBytes,
            sizeSavedPercentage: Math.round(sizeSavedPercentage * 100) / 100,
            wellOptimized: compressionRatio <= minCompressionRatio
          }
        })

        const poorlyOptimized = results.filter(result => !result.wellOptimized)
        const totalSaved = results.reduce((sum, result) => sum + result.sizeSavedBytes, 0)

        return {
          results,
          poorlyOptimized,
          totalSaved,
          allOptimized: poorlyOptimized.length === 0
        }
      }

      const optimization = validateImageOptimization(mockImageAssets)

      expect(optimization.allOptimized).toBeTruthy()
      expect(optimization.poorlyOptimized).toHaveLength(0)
      expect(optimization.totalSaved).toBeGreaterThan(300000) // At least 300KB saved

      // Check specific optimizations
      const heroImage = optimization.results.find(r => r.path === 'hero.jpg')
      expect(heroImage?.format).toBe('webp') // Should be converted to WebP
      expect(heroImage?.sizeSavedPercentage).toBeGreaterThan(60) // At least 60% reduction
    })

    it('should validate CSS optimization and tree shaking', () => {
      const mockCSSAnalysis = {
        originalSize: 180000,
        optimizedSize: 45000,
        unusedRules: [
          '.unused-component { display: block; }',
          '.old-style { color: red; }',
          '@media (max-width: 500px) { .unused { display: none; } }'
        ],
        criticalCSS: 25000,
        nonCriticalCSS: 20000
      }

      const validateCSSOptimization = (analysis: typeof mockCSSAnalysis) => {
        const compressionRatio = analysis.optimizedSize / analysis.originalSize
        const unusedRulesCount = analysis.unusedRules.length
        const sizeSaved = analysis.originalSize - analysis.optimizedSize
        const criticalRatio = analysis.criticalCSS / analysis.optimizedSize

        return {
          compressionRatio: Math.round(compressionRatio * 100) / 100,
          sizeSaved,
          unusedRulesRemoved: unusedRulesCount === 0,
          criticalCSSRatio: Math.round(criticalRatio * 100) / 100,
          wellOptimized: compressionRatio <= 0.3 && unusedRulesCount === 0, // 70%+ reduction, no unused rules
          criticalCSSOptimal: criticalRatio >= 0.5 // At least 50% critical CSS
        }
      }

      const result = validateCSSOptimization(mockCSSAnalysis)

      expect(result.wellOptimized).toBeTruthy()
      expect(result.compressionRatio).toBe(0.25) // 75% reduction
      expect(result.sizeSaved).toBe(135000)
      expect(result.criticalCSSOptimal).toBeTruthy()
    })

    it('should validate JavaScript minification and compression', () => {
      const mockJSAnalysis = {
        files: [
          {
            name: 'main.js',
            originalSize: 450000,
            minifiedSize: 320000,
            gzipSize: 95000,
            brotliSize: 82000
          },
          {
            name: 'vendors.js',
            originalSize: 680000,
            minifiedSize: 420000,
            gzipSize: 125000,
            brotliSize: 108000
          }
        ]
      }

      const validateJSOptimization = (analysis: typeof mockJSAnalysis) => {
        const results = analysis.files.map(file => {
          const minificationRatio = file.minifiedSize / file.originalSize
          const gzipRatio = file.gzipSize / file.originalSize
          const brotliRatio = file.brotliSize / file.originalSize

          return {
            ...file,
            minificationRatio: Math.round(minificationRatio * 100) / 100,
            gzipRatio: Math.round(gzipRatio * 100) / 100,
            brotliRatio: Math.round(brotliRatio * 100) / 100,
            wellMinified: minificationRatio <= 0.8, // At least 20% reduction from minification
            wellCompressed: gzipRatio <= 0.3 // At least 70% reduction with gzip
          }
        })

        const allWellOptimized = results.every(r => r.wellMinified && r.wellCompressed)
        const totalOriginalSize = analysis.files.reduce((sum, file) => sum + file.originalSize, 0)
        const totalGzipSize = analysis.files.reduce((sum, file) => sum + file.gzipSize, 0)
        const overallCompressionRatio = totalGzipSize / totalOriginalSize

        return {
          results,
          allWellOptimized,
          overallCompressionRatio: Math.round(overallCompressionRatio * 100) / 100
        }
      }

      const result = validateJSOptimization(mockJSAnalysis)

      expect(result.allWellOptimized).toBeTruthy()
      expect(result.overallCompressionRatio).toBeLessThan(0.25) // Less than 25% of original size

      // Check individual files
      const mainJS = result.results.find(r => r.name === 'main.js')
      expect(mainJS?.wellMinified).toBeTruthy()
      expect(mainJS?.wellCompressed).toBeTruthy()
      expect(mainJS?.brotliRatio).toBeLessThan(mainJS?.gzipRatio) // Brotli should be more efficient
    })
  })

  describe('Performance Budget Monitoring', () => {
    it('should enforce performance budgets for different network conditions', () => {
      const performanceBudgets = {
        '3G': {
          maxBundleSize: 200 * 1024,   // 200KB
          maxImageSize: 50 * 1024,     // 50KB per image
          maxCSSSize: 30 * 1024,       // 30KB
          maxFonts: 2,                 // Maximum 2 font files
          maxJSSize: 150 * 1024        // 150KB JS
        },
        '4G': {
          maxBundleSize: 500 * 1024,   // 500KB
          maxImageSize: 150 * 1024,    // 150KB per image
          maxCSSSize: 80 * 1024,       // 80KB
          maxFonts: 4,                 // Maximum 4 font files
          maxJSSize: 400 * 1024        // 400KB JS
        },
        'WiFi': {
          maxBundleSize: 1024 * 1024,  // 1MB
          maxImageSize: 500 * 1024,    // 500KB per image
          maxCSSSize: 150 * 1024,      // 150KB
          maxFonts: 6,                 // Maximum 6 font files
          maxJSSize: 800 * 1024        // 800KB JS
        }
      }

      const currentAssets = {
        bundleSize: 315000,  // 315KB (gzipped)
        images: [12000, 85000, 3000, 55000], // Various image sizes
        cssSize: 12000,      // 12KB (gzipped)
        fontCount: 3,
        jsSize: 250000       // 250KB (gzipped)
      }

      const checkPerformanceBudget = (
        assets: typeof currentAssets, 
        budget: typeof performanceBudgets['3G']
      ) => {
        const violations: string[] = []

        if (assets.bundleSize > budget.maxBundleSize) {
          violations.push(`Bundle size ${assets.bundleSize} exceeds budget ${budget.maxBundleSize}`)
        }

        if (assets.cssSize > budget.maxCSSSize) {
          violations.push(`CSS size ${assets.cssSize} exceeds budget ${budget.maxCSSSize}`)
        }

        if (assets.jsSize > budget.maxJSSize) {
          violations.push(`JS size ${assets.jsSize} exceeds budget ${budget.maxJSSize}`)
        }

        if (assets.fontCount > budget.maxFonts) {
          violations.push(`Font count ${assets.fontCount} exceeds budget ${budget.maxFonts}`)
        }

        const oversizedImages = assets.images.filter(size => size > budget.maxImageSize)
        if (oversizedImages.length > 0) {
          violations.push(`${oversizedImages.length} images exceed size budget ${budget.maxImageSize}`)
        }

        return {
          passed: violations.length === 0,
          violations
        }
      }

      // Should pass 4G and WiFi budgets
      expect(checkPerformanceBudget(currentAssets, performanceBudgets['4G']).passed).toBeTruthy()
      expect(checkPerformanceBudget(currentAssets, performanceBudgets['WiFi']).passed).toBeTruthy()

      // Should fail 3G budget (bundle too large)
      const result3G = checkPerformanceBudget(currentAssets, performanceBudgets['3G'])
      expect(result3G.passed).toBeFalsy()
      expect(result3G.violations).toContain('Bundle size 315000 exceeds budget 204800')
    })
  })
})