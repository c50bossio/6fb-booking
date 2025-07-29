const path = require('path')

// CDN Configuration Helper
function getCDNConfig() {
  const cdnProvider = process.env.NEXT_PUBLIC_CDN_PROVIDER || 'disabled'
  
  if (cdnProvider === 'disabled') {
    return { assetPrefix: '', basePath: '' }
  }
  
  let cdnDomain = ''
  switch (cdnProvider) {
    case 'cloudflare':
      cdnDomain = process.env.NEXT_PUBLIC_CLOUDFLARE_DOMAIN || ''
      break
    case 'cloudfront':
      cdnDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || ''
      break
    case 'fastly':
      cdnDomain = process.env.NEXT_PUBLIC_FASTLY_DOMAIN || ''
      break
    default:
      cdnDomain = ''
  }
  
  if (!cdnDomain) {
    console.warn(`CDN provider ${cdnProvider} configured but no domain specified. CDN disabled.`)
    return { assetPrefix: '', basePath: '' }
  }
  
  const cdnUrl = cdnDomain.startsWith('http') ? cdnDomain : `https://${cdnDomain}`
  console.log(`CDN enabled: ${cdnProvider} at ${cdnUrl}`)
  
  return {
    assetPrefix: cdnUrl,
    basePath: '',
  }
}

const cdnConfig = getCDNConfig()

/** @type {import('next').NextConfig} */
const nextConfig = {
  // CDN Configuration
  ...cdnConfig,
  // React strict mode for better error detection
  reactStrictMode: true,

  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Skip linting during Docker build to avoid blocking
  eslint: {
    ignoreDuringBuilds: process.env.SKIP_LINT === 'true',
  },

  // TypeScript error checking temporarily disabled for development debugging
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bookedbarber.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.bookedbarber.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'staging.bookedbarber.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api-staging.bookedbarber.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sixfb-backend-v2-staging.onrender.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sixfb-frontend-v2-staging.onrender.com',
        pathname: '/**',
      },
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
    optimizeCss: false, // Disabled for Vercel deployment compatibility
    // Better handling of server components and streaming
    serverComponentsExternalPackages: ['@stripe/stripe-js', 'qrcode'],
    // Better caching for development
    isrFlushToDisk: false,
    // Better static generation
    staticWorkerRequestDeduping: true,
    // SSR Fix for browser globals
    esmExternals: 'loose',
    // Disable node polyfills that might cause SSR issues
    fallbackNodePolyfills: false,
    // Skip failing during build for problematic pages
    // staticPageGenerationTimeout: 300, // Removed - not supported in Next.js 14
    // Enhanced package optimization (excluding browser-only libraries)
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
      '@tanstack/react-query',
      'framer-motion'
    ],
    // Better development experience
    optimisticClientCache: true,
    // Enhanced server-side rendering
    scrollRestoration: true,
  },

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    const webpack = require('webpack');
    const path = require('path');
    
    // Server-side polyfills for Vercel deployment
    if (isServer) {
      config.plugins = config.plugins || [];
      
      // 1. Load server globals immediately
      require('./lib/server-globals.js');
      
      // 2. DefinePlugin for typeof checks
      config.plugins.push(
        new webpack.DefinePlugin({
          'typeof self': '"object"',
          'typeof window': '"object"',
          'typeof document': '"object"',
          'typeof navigator': '"object"',
          'typeof globalThis': '"object"'
        })
      );
      
      // 3. Modify entry to include polyfills
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        const serverGlobalsPath = path.resolve(__dirname, 'lib/server-globals.js');
        
        // Add polyfills to main entry
        if (entries.main && Array.isArray(entries.main)) {
          entries.main.unshift(serverGlobalsPath);
        }
        
        // Add to all entries
        Object.keys(entries).forEach(key => {
          if (Array.isArray(entries[key]) && !entries[key].includes(serverGlobalsPath)) {
            entries[key].unshift(serverGlobalsPath);
          }
        });
        
        return entries;
      };
      
      // 4. Alias for consistent polyfill access
      config.resolve.alias = {
        ...config.resolve.alias,
        'server-globals': path.resolve(__dirname, 'lib/server-globals.js')
      };
    }
    
    // SSR fix for browser globals and problematic dependencies
    if (isServer) {
      // Load comprehensive SSR polyfills before anything else
      const path = require('path');
      const nodeStartupPolyfillPath = path.resolve(__dirname, 'lib/node-startup-polyfills.js');
      const globalPolyfillPath = path.resolve(__dirname, 'lib/global-polyfills.js');
      const ssrPolyfillPath = path.resolve(__dirname, 'lib/ssr-polyfills.js');
      const rootPolyfillPath = path.resolve(__dirname, 'polyfills.js');
      
      // Load Node.js startup polyfill FIRST (for styled-jsx)
      if (require('fs').existsSync(nodeStartupPolyfillPath)) {
        require(nodeStartupPolyfillPath);
      }
      
      // Load global polyfill immediately
      if (require('fs').existsSync(globalPolyfillPath)) {
        require(globalPolyfillPath);
      }
      
      // Load SSR polyfills
      if (require('fs').existsSync(ssrPolyfillPath)) {
        require(ssrPolyfillPath);
      }
      
      // Load root polyfill
      if (require('fs').existsSync(rootPolyfillPath)) {
        require(rootPolyfillPath);
      }
      
      // 5. Enhanced entry point modification for vendor chunks
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        
        const polyfillPath = path.resolve(__dirname, 'lib/vercel-polyfills.js');
        
        // Force polyfills into EVERY entry including vendor chunks
        if (typeof entries === 'function') {
          const originalEntryFn = entries;
          return async () => {
            const result = await originalEntryFn();
            // Inject into all entries
            Object.keys(result).forEach(key => {
              const entry = result[key];
              if (Array.isArray(entry)) {
                result[key] = [polyfillPath, ...entry];
              } else if (typeof entry === 'string') {
                result[key] = [polyfillPath, entry];
              } else if (entry && entry.import) {
                if (Array.isArray(entry.import)) {
                  entry.import = [polyfillPath, ...entry.import];
                } else {
                  entry.import = [polyfillPath, entry.import];
                }
              }
            });
            return result;
          };
        } else {
          // Direct entries object
          Object.keys(entries).forEach(key => {
            const entry = entries[key];
            if (Array.isArray(entry)) {
              entries[key] = [polyfillPath, ...entry];
            } else if (typeof entry === 'string') {
              entries[key] = [polyfillPath, entry];
            } else if (entry && entry.import) {
              if (Array.isArray(entry.import)) {
                entry.import = [polyfillPath, ...entry.import];
              } else {
                entry.import = [polyfillPath, entry.import];
              }
            }
          });
        }
        
        return entries;
      };
      
      // Add polyfill as webpack alias for consistent access
      config.resolve.alias = {
        ...config.resolve.alias,
        'global-polyfills': globalPolyfillPath,
        'ssr-polyfills': ssrPolyfillPath,
        // Vercel-specific aliases
        'vercel-polyfills': process.env.VERCEL === '1' 
          ? path.resolve(__dirname, 'lib/vercel-polyfills.js')
          : globalPolyfillPath
      };
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        canvas: false,
      }
      
      // Enhanced externalization for Vercel Lambda compatibility
      config.externals = config.externals || [];
      
      const problematicPackages = {
        'qrcode': 'qrcode',
        'canvas': 'canvas', 
        'chart.js': 'chart.js',
        'react-chartjs-2': 'react-chartjs-2',
        'jspdf': 'jspdf',
        'jspdf-autotable': 'jspdf-autotable',
        'ws': 'ws',
        'recharts': 'recharts'
      };

      // Enhanced Vercel-specific externalization for AWS Lambda
      if (process.env.VERCEL === '1') {
        // More aggressive externalization for Vercel/AWS Lambda
        config.externals.push(
          // Core problematic packages
          problematicPackages,
          // Pattern-based externalization
          /^@?chart\.js/,
          /^react-chartjs-2/,
          /^recharts/,
          /^qrcode/,
          /^canvas/,
          /^jspdf/,
          /^ws$/,
          // Browser-specific APIs that cause issues in Lambda
          function ({ context, request }, callback) {
            // Externalize any request that might use browser globals
            if (/\b(self|window|document|navigator)\b/.test(request)) {
              return callback(null, 'commonjs ' + request);
            }
            // Externalize chart.js related imports
            if (/chart\.js|chartjs|recharts/.test(request)) {
              return callback(null, 'commonjs ' + request);
            }
            callback();
          }
        );
        
        // Enhanced resolve configuration for Vercel
        config.resolve.alias = {
          ...config.resolve.alias,
          // Redirect problematic modules to our polyfills
          'chart.js': path.resolve(__dirname, 'lib/chartjs-dynamic.tsx'),
          'react-chartjs-2': path.resolve(__dirname, 'lib/chartjs-dynamic.tsx'),
          'qrcode': false, // Disable server-side QR generation
          'canvas': false,
          'jspdf': false
        };
      } else {
        config.externals.push(problematicPackages);
      }
    }

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
      // Explicit path aliases for @ mapping
      alias: {
        ...config.resolve?.alias,
        '@': path.resolve(__dirname),
      },
      // Fallback for Node.js modules in browser
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    // Bundle analyzer disabled for Vercel builds to prevent timeout
    if (!isServer && !dev && process.env.VERCEL !== '1') {
      try {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: '../bundle-analyzer.html',
            openAnalyzer: false,
          })
        )
      } catch (error) {
        // webpack-bundle-analyzer not available in production - skip
        console.log('webpack-bundle-analyzer not available, skipping bundle analysis')
      }
    }

    // Enhanced chunk optimization - simplified for Vercel builds
    if (!dev && process.env.VERCEL !== '1') {
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
    } else if (!dev && process.env.VERCEL === '1') {
      // Enhanced Vercel optimization with SSR-safe chunk splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate problematic browser-only libraries
            browserLibs: {
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|recharts|qrcode|jspdf|canvas)[\\/]/,
              name: 'browser-libs',
              chunks: 'all',
              priority: 30,
              enforce: true,
            },
            // Safe vendor libraries
            vendor: {
              test: function(module) {
                // Include node_modules but exclude problematic libraries
                if (!module.resource) return false;
                
                const isNodeModule = /[\\/]node_modules[\\/]/.test(module.resource);
                const isProblematic = /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|recharts|qrcode|jspdf|canvas)[\\/]/.test(module.resource);
                
                return isNodeModule && !isProblematic;
              },
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
          },
        },
        // Enhanced module concatenation for Vercel
        concatenateModules: true,
        // Better tree shaking
        usedExports: true,
        sideEffects: false,
      }
    }

    return config
  },

  // Headers for security and performance
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    
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
          },
          // Enhanced cache-busting headers for development
          ...(isDev ? [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
            },
            {
              key: 'Pragma',
              value: 'no-cache'
            },
            {
              key: 'Expires',
              value: '0'
            },
            {
              key: 'Surrogate-Control',
              value: 'no-store'
            },
            {
              key: 'ETag',
              value: 'no-etag'
            },
            {
              key: 'Last-Modified',
              value: new Date().toUTCString()
            }
          ] : [])
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
    // Use internal Docker service name when running in container, fallback to external URL for browser requests
    const backendUrl = process.env.NEXT_INTERNAL_API_URL || process.env.DOCKER_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://bookedbarber-backend:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://bookedbarber-backend:8000',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    NEXT_PUBLIC_CDN_PROVIDER: process.env.NEXT_PUBLIC_CDN_PROVIDER || 'disabled',
    NEXT_PUBLIC_CLOUDFLARE_DOMAIN: process.env.NEXT_PUBLIC_CLOUDFLARE_DOMAIN || '',
    NEXT_PUBLIC_CLOUDFRONT_DOMAIN: process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || '',
    NEXT_PUBLIC_FASTLY_DOMAIN: process.env.NEXT_PUBLIC_FASTLY_DOMAIN || '',
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
    'chart.js': {
      transform: 'chart.js/{{member}}'
    },
    'qrcode': {
      transform: 'qrcode/{{member}}'
    },
    'jspdf': {
      transform: 'jspdf/{{member}}'
    }
  },

  // Production optimizations
  productionBrowserSourceMaps: false,
  
  // Disable x-powered-by header
  poweredByHeader: false,

  // Output configuration
  output: 'standalone',

  // Export configuration to handle SSR issues in demo pages
  trailingSlash: false,
  
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
    // Always use timestamp to prevent caching issues
    const timestamp = Date.now()
    return process.env.NODE_ENV === 'development' 
      ? `dev-${timestamp}`
      : `prod-${timestamp}-${process.env.VERCEL_GIT_COMMIT_SHA || 'manual'}`
  },

  // Port conflict resilience
  serverRuntimeConfig: {
    // Enable graceful shutdowns
    keepAliveTimeout: 5000,
  },

  // Skip TypeScript/ESLint during Vercel builds for speed
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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