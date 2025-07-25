'use client'

/**
 * Comprehensive Image Optimization Utilities
 * Advanced image processing, optimization, and delivery strategies
 */

// Image optimization configuration
export const imageConfig = {
  // Next.js Image optimization settings
  domains: [
    'localhost',
    'api.bookedbarber.com',
    'images.unsplash.com',
    'via.placeholder.com',
    'cdn.stripe.com',
    'assets.stripe.com',
  ],
  
  // Supported formats in order of preference
  formats: ['image/avif', 'image/webp', 'image/jpeg', 'image/png'],
  
  // Quality settings for different use cases
  quality: {
    thumbnail: 60,
    preview: 75,
    standard: 85,
    high: 95,
    avatar: 90,
    hero: 85,
    gallery: 80,
  },
  
  // Size breakpoints for responsive images
  breakpoints: {
    xs: 320,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
  
  // Lazy loading thresholds
  lazyLoading: {
    rootMargin: '50px',
    threshold: 0.1,
    priority: 3, // First 3 images load immediately
  },
  
  // Placeholder settings
  placeholder: {
    blur: true,
    quality: 10,
    size: { width: 8, height: 8 },
  },
}

// Image format detection and optimization
export class ImageOptimizer {
  /**
   * Generate responsive image sizes string
   */
  static generateSizes(
    breakpoints: Record<string, number> = imageConfig.breakpoints,
    defaultSize: string = '100vw'
  ): string {
    const sizes = Object.entries(breakpoints)
      .sort(([, a], [, b]) => a - b)
      .map(([name, width], index, array) => {
        if (index === array.length - 1) return defaultSize
        return `(max-width: ${width}px) ${Math.round(width * 0.9)}px`
      })
    
    return sizes.join(', ')
  }

  /**
   * Generate placeholder image data URL
   */
  static generatePlaceholder(
    width: number,
    height: number,
    color: string = '#f3f4f6'
  ): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
      </svg>
    `
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }

  /**
   * Generate blur placeholder from image
   */
  static async generateBlurPlaceholder(
    src: string,
    quality: number = imageConfig.placeholder.quality
  ): Promise<string> {
    try {
      // This would be implemented with a serverless function or build-time generation
      // For now, return a generic blur placeholder
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Canvas context not available')
      
      canvas.width = imageConfig.placeholder.size.width
      canvas.height = imageConfig.placeholder.size.height
      
      // Create a simple gradient placeholder
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#f3f4f6')
      gradient.addColorStop(1, '#e5e7eb')
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      return canvas.toDataURL('image/jpeg', quality / 100)
    } catch (error) {
      console.warn('Failed to generate blur placeholder:', error)
      return ImageOptimizer.generatePlaceholder(
        imageConfig.placeholder.size.width,
        imageConfig.placeholder.size.height
      )
    }
  }

  /**
   * Optimize image URL with Next.js Image Optimization API
   */
  static optimizeUrl(
    src: string,
    options: {
      width?: number
      height?: number
      quality?: number
      format?: string
    } = {}
  ): string {
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      return src
    }

    const { width, height, quality = imageConfig.quality.standard, format } = options
    const params = new URLSearchParams()

    if (width) params.set('w', width.toString())
    if (height) params.set('h', height.toString())
    params.set('q', quality.toString())
    if (format) params.set('f', format)

    return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`
  }

  /**
   * Get optimal image format based on browser support
   */
  static getOptimalFormat(): string {
    if (typeof window === 'undefined') return 'image/webp'

    // Check for AVIF support
    const avifCanvas = document.createElement('canvas')
    avifCanvas.width = 1
    avifCanvas.height = 1
    
    try {
      const avifSupported = avifCanvas.toDataURL('image/avif').indexOf('data:image/avif') === 0
      if (avifSupported) return 'image/avif'
    } catch (e) {
      // AVIF not supported
    }

    // Check for WebP support
    try {
      const webpSupported = avifCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
      if (webpSupported) return 'image/webp'
    } catch (e) {
      // WebP not supported
    }

    return 'image/jpeg'
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth?: number,
    targetHeight?: number,
    mode: 'contain' | 'cover' | 'fill' = 'contain'
  ): { width: number; height: number } {
    if (!targetWidth && !targetHeight) {
      return { width: originalWidth, height: originalHeight }
    }

    const aspectRatio = originalWidth / originalHeight

    if (targetWidth && targetHeight) {
      if (mode === 'fill') {
        return { width: targetWidth, height: targetHeight }
      }
      
      const targetAspectRatio = targetWidth / targetHeight
      
      if (mode === 'cover') {
        if (aspectRatio > targetAspectRatio) {
          return { width: targetHeight * aspectRatio, height: targetHeight }
        } else {
          return { width: targetWidth, height: targetWidth / aspectRatio }
        }
      } else { // contain
        if (aspectRatio > targetAspectRatio) {
          return { width: targetWidth, height: targetWidth / aspectRatio }
        } else {
          return { width: targetHeight * aspectRatio, height: targetHeight }
        }
      }
    }

    if (targetWidth) {
      return { width: targetWidth, height: targetWidth / aspectRatio }
    }

    if (targetHeight) {
      return { width: targetHeight * aspectRatio, height: targetHeight }
    }

    return { width: originalWidth, height: originalHeight }
  }

  /**
   * Generate srcSet for responsive images
   */
  static generateSrcSet(
    src: string,
    sizes: number[],
    quality?: number
  ): string {
    return sizes
      .map(size => {
        const optimizedUrl = ImageOptimizer.optimizeUrl(src, { width: size, quality })
        return `${optimizedUrl} ${size}w`
      })
      .join(', ')
  }

  /**
   * Preload critical images
   */
  static preloadImage(src: string, priority: 'high' | 'low' = 'high'): void {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    if (priority === 'high') {
      link.fetchPriority = 'high'
    }
    
    document.head.appendChild(link)
  }

  /**
   * Batch preload multiple images
   */
  static preloadImages(images: Array<{ src: string; priority?: 'high' | 'low' }>): void {
    images.forEach(({ src, priority = 'low' }) => {
      ImageOptimizer.preloadImage(src, priority)
    })
  }
}

// Image performance monitoring
export class ImagePerformanceMonitor {
  private static observers: Map<string, PerformanceObserver> = new Map()

  /**
   * Monitor Largest Contentful Paint for images
   */
  static monitorLCP(callback?: (entry: PerformanceEntry) => void): void {
    if (typeof window === 'undefined') return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        
        if (lastEntry.entryType === 'largest-contentful-paint') {
          const element = (lastEntry as any).element
          if (element && element.tagName === 'IMG') {
              src: element.src,
              loadTime: lastEntry.startTime,
              size: (lastEntry as any).size,
            })
            callback?.(lastEntry)
          }
        }
      })

      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.set('lcp', observer)
    } catch (error) {
      console.warn('LCP monitoring not supported:', error)
    }
  }

  /**
   * Monitor image loading performance
   */
  static monitorImageLoading(): void {
    if (typeof window === 'undefined') return

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if ((entry as any).initiatorType === 'img') {
              src: entry.name,
              duration: entry.duration,
              transferSize: (entry as any).transferSize,
              encodedBodySize: (entry as any).encodedBodySize,
            })
          }
        })
      })

      observer.observe({ entryTypes: ['resource'] })
      this.observers.set('images', observer)
    } catch (error) {
      console.warn('Image loading monitoring not supported:', error)
    }
  }

  /**
   * Clean up observers
   */
  static cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()
  }
}

// Image compression utilities
export class ImageCompressor {
  /**
   * Compress image file on the client side
   */
  static async compressFile(
    file: File,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: string
    } = {}
  ): Promise<File> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'image/jpeg'
    } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      img.onload = () => {
        const { width, height } = ImageOptimizer.calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight,
          'contain'
        )

        canvas.width = width
        canvas.height = height

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: format,
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          format,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Resize image while maintaining aspect ratio
   */
  static async resizeImage(
    src: string,
    targetWidth: number,
    targetHeight?: number,
    quality: number = 0.9
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      img.onload = () => {
        const { width, height } = ImageOptimizer.calculateDimensions(
          img.width,
          img.height,
          targetWidth,
          targetHeight
        )

        canvas.width = width
        canvas.height = height

        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = src
    })
  }
}

// Image validation utilities
export class ImageValidator {
  /**
   * Validate image file
   */
  static validateFile(
    file: File,
    options: {
      maxSize?: number // in bytes
      allowedTypes?: string[]
      maxWidth?: number
      maxHeight?: number
    } = {}
  ): Promise<{ valid: boolean; errors: string[] }> {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
      maxWidth = 4000,
      maxHeight = 4000,
    } = options

    const errors: string[] = []

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / (1024 * 1024)).toFixed(2)}MB)`)
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type (${file.type}) is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }

    // Check dimensions
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        if (img.width > maxWidth) {
          errors.push(`Image width (${img.width}px) exceeds maximum allowed width (${maxWidth}px)`)
        }
        if (img.height > maxHeight) {
          errors.push(`Image height (${img.height}px) exceeds maximum allowed height (${maxHeight}px)`)
        }

        resolve({ valid: errors.length === 0, errors })
      }

      img.onerror = () => {
        errors.push('Invalid image file')
        resolve({ valid: false, errors })
      }

      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Check if image URL is accessible
   */
  static async checkImageAccessibility(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = src
    })
  }
}

// Asset optimization utilities
export class AssetOptimizer {
  /**
   * Generate CSS sprite from multiple images
   */
  static async generateSprite(
    images: Array<{ src: string; id: string }>,
    options: {
      spacing?: number
      format?: string
      quality?: number
    } = {}
  ): Promise<{ spriteUrl: string; css: string }> {
    const { spacing = 10, format = 'image/png', quality = 1 } = options

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Canvas context not available')
    }

    const loadedImages = await Promise.all(
      images.map(({ src, id }) => {
        return new Promise<{ img: HTMLImageElement; id: string }>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve({ img, id })
          img.onerror = reject
          img.src = src
        })
      })
    )

    // Calculate sprite dimensions
    let totalWidth = 0
    let maxHeight = 0

    loadedImages.forEach(({ img }) => {
      totalWidth += img.width + spacing
      maxHeight = Math.max(maxHeight, img.height)
    })

    canvas.width = totalWidth - spacing
    canvas.height = maxHeight

    // Draw images on sprite
    let currentX = 0
    const cssRules: string[] = []

    loadedImages.forEach(({ img, id }) => {
      ctx.drawImage(img, currentX, 0)
      
      cssRules.push(`
        .sprite-${id} {
          background-image: url(sprite.png);
          background-position: -${currentX}px 0;
          width: ${img.width}px;
          height: ${img.height}px;
        }
      `)

      currentX += img.width + spacing
    })

    const spriteUrl = canvas.toDataURL(format, quality)
    const css = cssRules.join('\n')

    return { spriteUrl, css }
  }

  /**
   * Minify CSS
   */
  static minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
      .replace(/\s*{\s*/g, '{') // Clean up braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';')
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*,\s*/g, ',')
      .trim()
  }

  /**
   * Generate favicons for different devices
   */
  static async generateFavicons(
    src: string,
    sizes: number[] = [16, 32, 48, 64, 128, 256]
  ): Promise<Array<{ size: number; url: string }>> {
    const favicons = await Promise.all(
      sizes.map(async (size) => {
        const resizedUrl = await ImageCompressor.resizeImage(src, size, size, 1)
        return { size, url: resizedUrl }
      })
    )

    return favicons
  }
}

// Initialize performance monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ImagePerformanceMonitor.monitorLCP()
  ImagePerformanceMonitor.monitorImageLoading()
}

export default {
  imageConfig,
  ImageOptimizer,
  ImagePerformanceMonitor,
  ImageCompressor,
  ImageValidator,
  AssetOptimizer,
}