/** @type {import('next').NextConfig} */
const nextConfig = {
  // React strict mode for better error detection
  reactStrictMode: true,

  // Enable SWC minification for better performance
  swcMinify: true,

  // Disable ESLint during build to avoid ESLint 9.x compatibility issues
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript errors during build for now
  typescript: {
    ignoreBuildErrors: false,
  },

  // Image optimization configuration
  images: {
    domains: [
      'localhost', 
      'bookedbarber.com', 
      'api.bookedbarber.com',
      'staging.bookedbarber.com',
      'api-staging.bookedbarber.com',
      'sixfb-backend-v2-staging.onrender.com',
      'sixfb-frontend-v2-staging.onrender.com'
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Compression
  compress: true,

  // Enhanced performance optimizations
  experimental: {
    optimizeCss: true,
    webpackBuildWorker: true,
    // Better handling of server components and streaming
    serverComponentsExternalPackages: ['@stripe/stripe-js'],
    // Improved memory management
    memoryBasedWorkersCount: true,
    // Better caching for development
    isrFlushToDisk: false,
    // Better static generation
    staticWorkerRequestDeduping: true,
    // Enhanced package optimization
    optimizePackageImports: [
      '@heroicons/react',
      'lucide-react', 
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'date-fns',
      '@tanstack/react-query'
    ],
    // Better development experience
    optimisticClientCache: true,
    // Enhanced server-side rendering
    scrollRestoration: true,
  },

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Port conflict prevention and better development experience
    if (dev && !isServer) {
      // Handle port conflicts more gracefully
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      }
      
      // Prevent memory leaks in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      }

      // Better error handling for development
      config.stats = {
        ...config.stats,
        errorDetails: true,
        warnings: true,
        errors: true,
      }
    }

    // Global error handling improvements
    config.resolve = {
      ...config.resolve,
      // Fallback for Node.js modules in browser
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    // Bundle analyzer in development
    if (!isServer && !dev) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: '../bundle-analyzer.html',
          openAnalyzer: false,
        })
      )
    }

    // Enhanced chunk optimization
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: false,
            vendors: false,
            // React/Next.js framework chunk
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next|scheduler)[\\/]/,
              chunks: 'all',
              priority: 50,
              enforce: true,
            },
            // Radix UI components chunk
            radix: {
              name: 'radix',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              chunks: 'all',
              priority: 40,
            },
            // Stripe chunk
            stripe: {
              name: 'stripe',
              test: /[\\/]node_modules[\\/]@stripe[\\/]/,
              chunks: 'all',
              priority: 35,
            },
            // Heroicons/Lucide chunk
            icons: {
              name: 'icons',
              test: /[\\/]node_modules[\\/](@heroicons\/react|lucide-react)[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Date utilities chunk
            dates: {
              name: 'dates',
              test: /[\\/]node_modules[\\/](date-fns|react-day-picker)[\\/]/,
              chunks: 'all',
              priority: 25,
            },
            // UI components chunk
            ui: {
              name: 'ui',
              test: /components\/ui/,
              chunks: 'all',
              priority: 20,
            },
            // Other vendor libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 10,
            },
            // Common application code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }

    return config
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400'
          }
        ]
      }
    ]
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },

  // Rewrites for API proxy
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },

  // Enable modular imports for specific packages
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },

  // Production optimizations
  productionBrowserSourceMaps: false,
  
  // Disable x-powered-by header
  poweredByHeader: false,

  // Output configuration
  output: 'standalone',

  // Enhanced error handling
  onDemandEntries: {
    // Keep pages in memory for better performance
    maxInactiveAge: 60 * 1000,
    // Number of pages to keep in memory
    pagesBufferLength: 5,
  },

  // Better development server configuration
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },

  // Enhanced error boundaries
  generateBuildId: async () => {
    // Use timestamp for development, git hash for production
    return process.env.NODE_ENV === 'development' 
      ? `dev-${Date.now()}`
      : process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
  },

  // Port conflict resilience
  serverRuntimeConfig: {
    // Enable graceful shutdowns
    keepAliveTimeout: 5000,
  },

  // Client-side error handling
  publicRuntimeConfig: {
    // Error tracking configuration
    enableErrorReporting: process.env.NODE_ENV === 'production',
    // Environment detection
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development',
    // Feature flags for staging
    isStaging: process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging',
    enableDebugPanel: process.env.NEXT_PUBLIC_ENABLE_DEBUG_PANEL === 'true',
    showTestData: process.env.NEXT_PUBLIC_SHOW_TEST_DATA === 'true',
  },
}

module.exports = nextConfig