/**
 * Mobile PWA Bundle Optimizer
 * Advanced webpack optimizations and bundle analysis for mobile features
 * Version: 1.0.0
 */

interface BundleStats {
  totalSize: number
  gzippedSize: number
  chunks: ChunkInfo[]
  modules: ModuleInfo[]
  assets: AssetInfo[]
}

interface ChunkInfo {
  name: string
  size: number
  modules: number
  isAsync: boolean
}

interface ModuleInfo {
  name: string
  size: number
  chunks: string[]
  reasons: string[]
}

interface AssetInfo {
  name: string
  size: number
  type: string
  isOverSizeLimit: boolean
}

interface OptimizationConfig {
  enableTreeShaking: boolean
  enableCodeSplitting: boolean
  enableMinification: boolean
  targetBundleSize: number // KB
  chunkSizeWarning: number // KB
  enablePreload: boolean
  enablePrefetch: boolean
}

const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  enableTreeShaking: true,
  enableCodeSplitting: true,
  enableMinification: true,
  targetBundleSize: 250, // 250KB target
  chunkSizeWarning: 100, // Warn if chunk > 100KB
  enablePreload: true,
  enablePrefetch: false // Conservative prefetching
}

export class MobilePWABundleOptimizer {
  private config: OptimizationConfig
  private bundleStats: BundleStats | null = null
  private optimizationHistory: Array<{ timestamp: number; stats: BundleStats }> = []

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config }
  }

  /**
   * Generate Next.js webpack configuration optimizations
   */
  getWebpackOptimizations(): any {
    return {
      optimization: {
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Mobile PWA features bundle
            mobilePWA: {
              test: /[\\/]lib[\\/](mobile-|haptic-|touch-)/,
              name: 'mobile-pwa-core',
              chunks: 'all',
              priority: 30,
              enforce: true
            },
            // Analytics and monitoring bundle
            analytics: {
              test: /[\\/](analytics|monitoring)[\\/]/,
              name: 'mobile-pwa-analytics',
              chunks: 'async',
              priority: 25
            },
            // Touch gesture components
            touchComponents: {
              test: /[\\/]components[\\/](Touch|Mobile)/,
              name: 'mobile-touch-components',
              chunks: 'async',
              priority: 20
            },
            // Demo and onboarding (lowest priority)
            demos: {
              test: /[\\/](demo|onboarding)[\\/]/,
              name: 'mobile-pwa-demos',
              chunks: 'async',
              priority: 10
            }
          }
        },
        usedExports: this.config.enableTreeShaking,
        sideEffects: false
      },
      resolve: {
        alias: {
          // Optimize common imports
          '@mobile-pwa': '/lib/mobile-pwa-lazy-loader'
        }
      }
    }
  }

  /**
   * Analyze bundle and provide optimization recommendations
   */
  analyzeBundleSize(stats: any): {
    summary: BundleStats
    recommendations: string[]
    warnings: string[]
    optimizations: string[]
  } {
    const bundleStats = this.extractBundleStats(stats)
    this.bundleStats = bundleStats
    this.optimizationHistory.push({
      timestamp: Date.now(),
      stats: bundleStats
    })

    const recommendations = this.generateRecommendations(bundleStats)
    const warnings = this.generateWarnings(bundleStats)
    const optimizations = this.generateOptimizations(bundleStats)

    return {
      summary: bundleStats,
      recommendations,
      warnings,
      optimizations
    }
  }

  private extractBundleStats(stats: any): BundleStats {
    const compilation = stats.compilation || stats
    const assets = compilation.assets || {}
    const chunks = compilation.chunks || []
    const modules = compilation.modules || []

    // Calculate total sizes
    let totalSize = 0
    let gzippedSize = 0

    const assetInfo: AssetInfo[] = Object.entries(assets).map(([name, asset]: [string, any]) => {
      const size = asset.size || 0
      totalSize += size
      
      return {
        name,
        size,
        type: this.getAssetType(name),
        isOverSizeLimit: size > this.config.chunkSizeWarning * 1024
      }
    })

    const chunkInfo: ChunkInfo[] = chunks.map((chunk: any) => ({
      name: chunk.name || chunk.id,
      size: chunk.size || 0,
      modules: chunk.modules ? chunk.modules.length : 0,
      isAsync: !chunk.isOnlyInitial()
    }))

    const moduleInfo: ModuleInfo[] = modules.slice(0, 50).map((module: any) => ({
      name: module.name || module.identifier || 'unknown',
      size: module.size || 0,
      chunks: module.chunks ? module.chunks.map((c: any) => c.name || c.id) : [],
      reasons: module.reasons ? module.reasons.map((r: any) => r.moduleName || 'unknown') : []
    }))

    // Estimate gzipped size (roughly 70% of original)
    gzippedSize = Math.round(totalSize * 0.7)

    return {
      totalSize,
      gzippedSize,
      chunks: chunkInfo,
      modules: moduleInfo,
      assets: assetInfo
    }
  }

  private getAssetType(filename: string): string {
    if (filename.endsWith('.js')) return 'javascript'
    if (filename.endsWith('.css')) return 'stylesheet'
    if (filename.match(/\.(png|jpg|jpeg|gif|svg)$/)) return 'image'
    if (filename.match(/\.(woff|woff2|ttf|eot)$/)) return 'font'
    return 'other'
  }

  private generateRecommendations(stats: BundleStats): string[] {
    const recommendations = []
    const totalSizeKB = Math.round(stats.totalSize / 1024)

    if (totalSizeKB > this.config.targetBundleSize) {
      recommendations.push(
        `Bundle size (${totalSizeKB}KB) exceeds target (${this.config.targetBundleSize}KB). Consider lazy loading more components.`
      )
    }

    // Check for large chunks
    const largeChunks = stats.chunks.filter(chunk => chunk.size > this.config.chunkSizeWarning * 1024)
    if (largeChunks.length > 0) {
      recommendations.push(
        `${largeChunks.length} chunks exceed size warning (${this.config.chunkSizeWarning}KB): ${largeChunks.map(c => c.name).join(', ')}`
      )
    }

    // Check for synchronous chunks that could be async
    const syncChunks = stats.chunks.filter(chunk => !chunk.isAsync && chunk.size > 50 * 1024)
    if (syncChunks.length > 1) {
      recommendations.push(
        `Consider making ${syncChunks.length} large synchronous chunks async: ${syncChunks.map(c => c.name).join(', ')}`
      )
    }

    // Check for duplicate dependencies
    const moduleNames = stats.modules.map(m => m.name)
    const duplicates = moduleNames.filter((name, index) => 
      moduleNames.indexOf(name) !== index && name.includes('node_modules')
    )
    if (duplicates.length > 0) {
      recommendations.push(
        `Possible duplicate dependencies detected: ${[...new Set(duplicates)].slice(0, 3).join(', ')}`
      )
    }

    return recommendations
  }

  private generateWarnings(stats: BundleStats): string[] {
    const warnings = []

    // Warn about very large assets
    const largeAssets = stats.assets.filter(asset => asset.isOverSizeLimit)
    if (largeAssets.length > 0) {
      warnings.push(
        `${largeAssets.length} assets exceed size limits: ${largeAssets.map(a => `${a.name} (${Math.round(a.size/1024)}KB)`).join(', ')}`
      )
    }

    // Warn about main bundle size
    const mainChunk = stats.chunks.find(chunk => chunk.name === 'main' || chunk.name === 'index')
    if (mainChunk && mainChunk.size > 200 * 1024) {
      warnings.push(
        `Main bundle is large (${Math.round(mainChunk.size/1024)}KB). Consider moving features to async chunks.`
      )
    }

    return warnings
  }

  private generateOptimizations(stats: BundleStats): string[] {
    const optimizations = []

    // Suggest specific mobile PWA optimizations
    const mobilePWAModules = stats.modules.filter(m => 
      m.name.includes('mobile-') || m.name.includes('touch-') || m.name.includes('haptic-')
    )

    if (mobilePWAModules.length > 5) {
      optimizations.push(
        'Split mobile PWA features into separate chunks with lazy loading'
      )
    }

    // Suggest demo/onboarding optimizations
    const demoModules = stats.modules.filter(m => 
      m.name.includes('demo') || m.name.includes('onboarding')
    )

    if (demoModules.length > 0) {
      optimizations.push(
        'Move demo and onboarding components to async loading (they\'re rarely used in production)'
      )
    }

    // Suggest analytics optimizations
    const analyticsModules = stats.modules.filter(m => 
      m.name.includes('analytics') || m.name.includes('monitoring')
    )

    if (analyticsModules.length > 3) {
      optimizations.push(
        'Load analytics and monitoring modules on-demand when dashboard is accessed'
      )
    }

    return optimizations
  }

  /**
   * Generate performance budget configuration
   */
  getPerformanceBudget(): any {
    return {
      performanceBudgets: [
        {
          resourceSizes: [
            {
              resourceType: 'script',
              maximumSize: this.config.targetBundleSize * 1024 // Convert to bytes
            },
            {
              resourceType: 'total',
              maximumSize: this.config.targetBundleSize * 1.5 * 1024 // 50% overhead
            }
          ]
        }
      ]
    }
  }

  /**
   * Generate preload/prefetch suggestions
   */
  getResourceHints(): { preload: string[]; prefetch: string[] } {
    if (!this.bundleStats) {
      return { preload: [], prefetch: [] }
    }

    const preload = []
    const prefetch = []

    // Preload critical mobile PWA chunks
    const criticalChunks = this.bundleStats.chunks.filter(chunk => 
      chunk.name.includes('mobile-pwa-core') || chunk.name.includes('touch')
    )

    if (this.config.enablePreload) {
      preload.push(...criticalChunks.map(chunk => `/_next/static/chunks/${chunk.name}.js`))
    }

    // Prefetch demo and analytics chunks (lower priority)
    const prefetchChunks = this.bundleStats.chunks.filter(chunk => 
      chunk.name.includes('demo') || chunk.name.includes('analytics')
    )

    if (this.config.enablePrefetch) {
      prefetch.push(...prefetchChunks.map(chunk => `/_next/static/chunks/${chunk.name}.js`))
    }

    return { preload, prefetch }
  }

  /**
   * Compare current bundle with historical data
   */
  getBundleTrends(): {
    sizeChange: number
    chunkCountChange: number
    recommendations: string[]
  } {
    if (this.optimizationHistory.length < 2) {
      return {
        sizeChange: 0,
        chunkCountChange: 0,
        recommendations: ['Need more build data to show trends']
      }
    }

    const current = this.optimizationHistory[this.optimizationHistory.length - 1]
    const previous = this.optimizationHistory[this.optimizationHistory.length - 2]

    const sizeChange = current.stats.totalSize - previous.stats.totalSize
    const chunkCountChange = current.stats.chunks.length - previous.stats.chunks.length

    const recommendations = []
    
    if (sizeChange > 10 * 1024) { // 10KB increase
      recommendations.push(`Bundle size increased by ${Math.round(sizeChange/1024)}KB since last build`)
    }
    
    if (chunkCountChange > 0) {
      recommendations.push(`${chunkCountChange} new chunks added - verify they're properly optimized`)
    }

    if (sizeChange < -20 * 1024) { // 20KB decrease
      recommendations.push(`Great! Bundle size reduced by ${Math.round(-sizeChange/1024)}KB`)
    }

    return {
      sizeChange,
      chunkCountChange,
      recommendations
    }
  }

  /**
   * Export optimization report
   */
  generateOptimizationReport(): {
    summary: any
    analysis: any
    trends: any
    recommendations: string[]
    nextSteps: string[]
  } {
    if (!this.bundleStats) {
      throw new Error('No bundle stats available. Run analysis first.')
    }

    const analysis = this.analyzeBundleSize({ compilation: { 
      assets: {}, 
      chunks: this.bundleStats.chunks, 
      modules: this.bundleStats.modules 
    }})
    
    const trends = this.getBundleTrends()
    const resourceHints = this.getResourceHints()

    const summary = {
      totalSize: `${Math.round(this.bundleStats.totalSize / 1024)}KB`,
      gzippedSize: `${Math.round(this.bundleStats.gzippedSize / 1024)}KB`,
      chunkCount: this.bundleStats.chunks.length,
      targetAchieved: this.bundleStats.totalSize <= this.config.targetBundleSize * 1024,
      optimizationScore: this.calculateOptimizationScore()
    }

    const nextSteps = [
      'Implement lazy loading for demo components',
      'Split analytics modules into async chunks',
      'Add resource hints for critical chunks',
      'Monitor bundle size in CI/CD pipeline',
      'Consider tree-shaking unused utilities'
    ]

    return {
      summary,
      analysis,
      trends,
      recommendations: [
        ...analysis.recommendations,
        ...analysis.optimizations,
        ...trends.recommendations
      ],
      nextSteps
    }
  }

  private calculateOptimizationScore(): number {
    if (!this.bundleStats) return 0

    let score = 100
    const totalSizeKB = this.bundleStats.totalSize / 1024

    // Size penalty
    if (totalSizeKB > this.config.targetBundleSize) {
      score -= Math.min(50, (totalSizeKB - this.config.targetBundleSize) / 10)
    }

    // Chunk size penalty
    const largeChunks = this.bundleStats.chunks.filter(
      chunk => chunk.size > this.config.chunkSizeWarning * 1024
    )
    score -= largeChunks.length * 10

    // Async chunk bonus
    const asyncChunks = this.bundleStats.chunks.filter(chunk => chunk.isAsync)
    score += Math.min(20, asyncChunks.length * 2)

    return Math.max(0, Math.round(score))
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Singleton instance
let globalBundleOptimizer: MobilePWABundleOptimizer | null = null

/**
 * Get or create bundle optimizer instance
 */
export function getBundleOptimizer(config?: Partial<OptimizationConfig>): MobilePWABundleOptimizer {
  if (!globalBundleOptimizer) {
    globalBundleOptimizer = new MobilePWABundleOptimizer(config)
  }
  return globalBundleOptimizer
}

/**
 * Next.js config generator for mobile PWA optimization
 */
export function generateNextJSConfig(customConfig?: Partial<OptimizationConfig>) {
  const optimizer = getBundleOptimizer(customConfig)
  const webpackOptimizations = optimizer.getWebpackOptimizations()
  const performanceBudget = optimizer.getPerformanceBudget()

  return {
    experimental: {
      optimizeCss: true,
      optimizePackageImports: [
        '@/lib/mobile-pwa-lazy-loader',
        '@/lib/haptic-feedback-system',
        '@/lib/mobile-touch-gestures'
      ]
    },
    webpack: (config: any, { dev, isServer }: any) => {
      if (!dev && !isServer) {
        // Apply optimizations only in production client builds
        config.optimization = {
          ...config.optimization,
          ...webpackOptimizations.optimization
        }

        config.resolve = {
          ...config.resolve,
          ...webpackOptimizations.resolve
        }
      }

      return config
    },
    // Bundle analyzer integration
    generateBuildId: async () => {
      return `mobile-pwa-${Date.now()}`
    }
  }
}

export default MobilePWABundleOptimizer