/** @type {import('next').NextConfig} */
const nextConfig = {
  // React strict mode for better error detection
  reactStrictMode: true,

  // Enable SWC minification for better performance
  swcMinify: true,

  // Compression
  compress: true,

  // Disable x-powered-by header
  poweredByHeader: false,

  // TypeScript configuration
  typescript: {
    // Enable type checking for better code quality
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Enable ESLint during builds for code quality
    ignoreDuringBuilds: false,
    // Specify directories for ESLint checking
    dirs: ['app', 'components', 'lib', 'hooks'],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },

  // API proxy to forward requests to FastAPI backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },

  // Webpack configuration for better module resolution and bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Enhanced module resolution for Linux compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, '.'),
    }

    // Bundle optimization for better code splitting
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Common components shared across routes
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              name: 'common',
            },
            // Calendar-specific components (heavy)
            calendar: {
              test: /[\\/]components[\\/](calendar|UnifiedCalendar)/,
              name: 'calendar',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Analytics components
            analytics: {
              test: /[\\/]components[\\/]analytics/,
              name: 'analytics',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Admin components
            admin: {
              test: /[\\/](app[\\/]admin|components[\\/]admin)/,
              name: 'admin',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Marketing components
            marketing: {
              test: /[\\/]components[\\/]marketing/,
              name: 'marketing',
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }
    
    return config
  },
}

module.exports = nextConfig