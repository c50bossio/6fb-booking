/**
 * CDN-related type definitions for BookedBarber V2
 */

export type CDNProvider = 'disabled' | 'cloudflare' | 'cloudfront' | 'fastly'

export interface CDNConfig {
  provider: CDNProvider
  enabled: boolean
  domain?: string
  assetPrefix?: string
  version?: string
}

export interface ImageOptimizationParams {
  width?: number
  height?: number
  format?: 'webp' | 'avif' | 'jpg' | 'png' | 'auto'
  quality?: number
  fit?: 'cover' | 'contain' | 'fill' | 'crop'
}

export interface CDNAsset {
  path: string
  type: 'static' | 'image' | 'font' | 'script' | 'style'
  size?: number
  lastModified?: string
  cacheControl?: string
}

export interface CDNPerformanceMetrics {
  cacheHitRate: number
  totalRequests: number
  bandwidthSavedMB: number
  avgResponseTimeMs: number
  errorRate: number
  topAssets: Array<{
    path: string
    requests: number
    size: number
  }>
}

export interface CDNHealthStatus {
  enabled: boolean
  healthy: boolean
  provider?: CDNProvider
  responseTime?: number
  lastChecked?: string
  error?: string
}

export interface PurgeRequest {
  paths?: string[]
  tags?: string[]
  purgeAll?: boolean
}

export interface PurgeResponse {
  success: boolean
  jobId?: string
  message?: string
  errors?: string[]
}

export interface CDNConfiguration {
  // CloudFlare settings
  cloudflare?: {
    zoneId: string
    apiToken: string
    domain: string
    accountId?: string
  }
  
  // CloudFront settings
  cloudfront?: {
    distributionId: string
    domain: string
    accessKeyId: string
    secretAccessKey: string
    region: string
  }
  
  // Fastly settings
  fastly?: {
    serviceId: string
    apiToken: string
    domain: string
  }
}

export interface CDNAnalytics {
  timeRange: {
    start: string
    end: string
  }
  metrics: CDNPerformanceMetrics
  breakdown: {
    byCountry: Array<{
      country: string
      requests: number
      bandwidth: number
    }>
    byAssetType: Array<{
      type: string
      requests: number
      bandwidth: number
    }>
    byStatusCode: Array<{
      statusCode: number
      requests: number
    }>
  }
}

export interface CDNOptimizationSettings {
  imageOptimization: {
    enabled: boolean
    formats: string[]
    quality: number
    maxWidth: number
    maxHeight: number
  }
  compression: {
    gzip: boolean
    brotli: boolean
    minifyJs: boolean
    minifyCss: boolean
    minifyHtml: boolean
  }
  caching: {
    staticTTL: number
    imageTTL: number
    dynamicTTL: number
    browserCaching: boolean
  }
  security: {
    hotlinkProtection: boolean
    allowedReferrers: string[]
    rateLimiting: boolean
  }
}