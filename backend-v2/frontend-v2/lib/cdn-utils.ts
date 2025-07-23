/**
 * CDN Utilities for Dynamic Asset URL Generation
 * 
 * This module provides utilities for generating CDN-optimized URLs for static assets
 * including images, fonts, stylesheets, and other resources. It supports multiple
 * CDN providers (CloudFlare, CloudFront, Fastly) with automatic fallback to local assets.
 */

export type CDNProvider = 'cloudflare' | 'cloudfront' | 'fastly' | 'disabled'

export interface CDNConfig {
  provider: CDNProvider
  domain: string
  staticPath: string
  imagesPath: string
  version: string
  ttl: {
    static: number
    images: number
    dynamic: number
  }
}

/**
 * Get CDN configuration from environment variables
 */
export function getCDNConfig(): CDNConfig {
  const provider = (process.env.NEXT_PUBLIC_CDN_PROVIDER || 'disabled') as CDNProvider
  
  let domain = ''
  switch (provider) {
    case 'cloudflare':
      domain = process.env.NEXT_PUBLIC_CLOUDFLARE_DOMAIN || ''
      break
    case 'cloudfront':
      domain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || ''
      break
    case 'fastly':
      domain = process.env.NEXT_PUBLIC_FASTLY_DOMAIN || ''
      break
    default:
      domain = ''
  }
  
  return {
    provider,
    domain,
    staticPath: process.env.NEXT_PUBLIC_CDN_STATIC_PATH || '/static',
    imagesPath: process.env.NEXT_PUBLIC_CDN_IMAGES_PATH || '/images',
    version: process.env.NEXT_PUBLIC_CDN_VERSION || Date.now().toString(),
    ttl: {
      static: 31536000, // 1 year
      images: 604800,   // 1 week
      dynamic: 300,     // 5 minutes
    }
  }
}

/**
 * Check if CDN is enabled and properly configured
 */
export function isCDNEnabled(): boolean {
  const config = getCDNConfig()
  return config.provider !== 'disabled' && !!config.domain
}

/**
 * Get the base CDN URL
 */
export function getCDNBaseURL(): string {
  if (!isCDNEnabled()) {
    return ''
  }
  
  const config = getCDNConfig()
  const baseUrl = config.domain.startsWith('http') 
    ? config.domain 
    : `https://${config.domain}`
  
  return baseUrl
}

/**
 * Generate CDN URL for static assets (JS, CSS, fonts, etc.)
 */
export function getCDNStaticURL(assetPath: string): string {
  if (!isCDNEnabled()) {
    return assetPath
  }
  
  const config = getCDNConfig()
  const baseURL = getCDNBaseURL()
  
  // Remove leading slash from assetPath if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath
  
  // Add version for cache busting
  const versionedPath = `${cleanPath}?v=${config.version}`
  
  return `${baseURL}${config.staticPath}/${versionedPath}`
}

/**
 * Generate CDN URL for images with optimization parameters
 */
export function getCDNImageURL(
  imagePath: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpg'
  } = {}
): string {
  if (!isCDNEnabled()) {
    return imagePath
  }
  
  const config = getCDNConfig()
  const baseURL = getCDNBaseURL()
  
  // Remove leading slash from imagePath if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  
  // Build query parameters for image optimization
  const params = new URLSearchParams()
  
  if (options.width) params.set('w', options.width.toString())
  if (options.height) params.set('h', options.height.toString())
  if (options.quality) params.set('q', options.quality.toString())
  if (options.format) params.set('f', options.format)
  
  // Add version for cache busting
  params.set('v', config.version)
  
  const queryString = params.toString()
  const fullPath = `${baseURL}${config.imagesPath}/${cleanPath}${queryString ? `?${queryString}` : ''}`
  
  return fullPath
}

/**
 * Generate CDN URL for any asset with custom path
 */
export function getCDNAssetURL(assetPath: string, customPath?: string): string {
  if (!isCDNEnabled()) {
    return assetPath
  }
  
  const config = getCDNConfig()
  const baseURL = getCDNBaseURL()
  
  // Remove leading slash from assetPath if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath
  
  // Use custom path or default static path
  const pathPrefix = customPath || config.staticPath
  
  // Add version for cache busting
  const versionedPath = `${cleanPath}?v=${config.version}`
  
  return `${baseURL}${pathPrefix}/${versionedPath}`
}

/**
 * Get appropriate cache headers for different asset types
 */
export function getCacheHeaders(assetType: 'static' | 'images' | 'dynamic'): Record<string, string> {
  const config = getCDNConfig()
  const ttl = config.ttl[assetType]
  
  return {
    'Cache-Control': `public, max-age=${ttl}, stale-while-revalidate=${Math.floor(ttl / 10)}`,
    'Expires': new Date(Date.now() + ttl * 1000).toUTCString(),
    'X-CDN-Provider': config.provider,
  }
}

/**
 * Preload critical assets through CDN
 */
export function preloadCriticalAssets(assets: Array<{
  href: string
  as: 'script' | 'style' | 'font' | 'image'
  type?: string
  crossorigin?: 'anonymous' | 'use-credentials'
}>): void {
  if (typeof window === 'undefined') return
  
  assets.forEach(asset => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = isCDNEnabled() ? getCDNStaticURL(asset.href) : asset.href
    link.as = asset.as
    
    if (asset.type) link.type = asset.type
    if (asset.crossorigin) link.crossOrigin = asset.crossorigin
    
    document.head.appendChild(link)
  })
}

/**
 * Generate responsive image srcset using CDN
 */
export function generateResponsiveSrcSet(
  imagePath: string,
  sizes: number[],
  options: { quality?: number; format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpg' } = {}
): string {
  return sizes
    .map(size => {
      const url = getCDNImageURL(imagePath, { ...options, width: size })
      return `${url} ${size}w`
    })
    .join(', ')
}

/**
 * Get CDN status for debugging/monitoring
 */
export function getCDNStatus(): {
  enabled: boolean
  provider: CDNProvider
  domain: string
  baseURL: string
  version: string
} {
  const config = getCDNConfig()
  const enabled = isCDNEnabled()
  
  return {
    enabled,
    provider: config.provider,
    domain: config.domain,
    baseURL: enabled ? getCDNBaseURL() : '',
    version: config.version,
  }
}

/**
 * React hook for CDN utilities
 */
export function useCDN() {
  const config = getCDNConfig()
  const enabled = isCDNEnabled()
  
  return {
    enabled,
    config,
    getStaticURL: getCDNStaticURL,
    getImageURL: getCDNImageURL,
    getAssetURL: getCDNAssetURL,
    generateSrcSet: generateResponsiveSrcSet,
    preloadAssets: preloadCriticalAssets,
    getStatus: getCDNStatus,
  }
}

// Export default CDN utilities
export default {
  getCDNConfig,
  isCDNEnabled,
  getCDNBaseURL,
  getCDNStaticURL,
  getCDNImageURL,
  getCDNAssetURL,
  getCacheHeaders,
  preloadCriticalAssets,
  generateResponsiveSrcSet,
  getCDNStatus,
  useCDN,
}