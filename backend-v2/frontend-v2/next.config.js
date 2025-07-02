const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // TypeScript error checking restored - ignoreBuildErrors removed
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  
  // Enhanced bundle optimization
  experimental: {
    optimizePackageImports: [
      '@heroicons/react',
      'lucide-react', 
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast',
    ],
    // Enable SWC minification for better performance
    swcMinify: true,
    // Tree shaking optimizations
    esmExternals: true,
    // Modular imports removed - not supported in Next.js 14.2.5
  },
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // 24 hours
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Enhanced Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Enhanced bundle splitting for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        maxAsyncRequests: 30,
        cacheGroups: {
          default: false,
          vendors: false,
          // Framework chunk (React, Next.js core)
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // UI Libraries chunk
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@radix-ui|@heroicons|lucide-react|class-variance-authority)[\\/]/,
            priority: 30,
          },
          // Charts and heavy libraries
          charts: {
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
            name: 'charts',
            priority: 25,
            chunks: 'all',
          },
          // Date utilities
          dates: {
            test: /[\\/]node_modules[\\/](date-fns|date-fns-tz)[\\/]/,
            name: 'dates',
            priority: 25,
            chunks: 'all',
          },
          // Payment related
          payments: {
            test: /[\\/]node_modules[\\/](@stripe)[\\/]/,
            name: 'payments',
            priority: 25,
            chunks: 'all',
          },
          // Common vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            priority: 10,
            chunks: 'all',
            minChunks: 2,
          },
          // Common application code
          common: {
            minChunks: 2,
            chunks: 'all',
            name: 'common',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      }
      
      // Tree shaking optimizations
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
    }
    
    // Module resolution optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    }
    
    return config
  },
  
  // Performance optimizations
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  
  // Removed rewrites to use direct API calls
}

module.exports = withBundleAnalyzer(nextConfig)