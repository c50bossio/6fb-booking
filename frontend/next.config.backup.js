/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable to prevent double renders and improve stability

  // Enable standalone for production deployment
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Production optimizations
  swcMinify: true,
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // TypeScript configuration
  typescript: {
    // Allow production builds to complete even with TypeScript errors
    ignoreBuildErrors: true,
  },

  // ESLint configuration
  eslint: {
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Experimental features for performance
  experimental: {
    // Enable optimized CSS loading
    optimizeCss: true,
    // Enable gzipSize for bundle analysis
    gzipSize: true,
  },
  // Image optimization
  images: {
    // Enable image optimization
    formats: ['image/webp', 'image/avif'],
    // CDN configuration
    loader: process.env.NODE_ENV === 'production' && process.env.CDN_URL ? 'custom' : 'default',
    loaderFile: process.env.NODE_ENV === 'production' && process.env.CDN_URL ? './lib/image-loader.js' : undefined,
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different use cases
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Remote patterns
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'stripe.com',
      },
      {
        protocol: 'https',
        hostname: 'js.stripe.com',
      },
      {
        protocol: 'https',
        hostname: 'bookbarber.com',
      },
      {
        protocol: 'https',
        hostname: '*.bookbarber.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.6fbplatform.com',
      },
      {
        protocol: 'https',
        hostname: 'static.6fbplatform.com',
      },
    ],
    // Minimize layout shift
    minimumCacheTTL: 31536000, // 1 year
  },

  // Asset prefix for CDN
  assetPrefix: process.env.CDN_URL || '',

  // Trailing slash configuration
  trailingSlash: false,
  // Clean webpack configuration without deprecated options
  webpack: (config, { dev, isServer }) => {
    // Don't override devtool in development - let Next.js handle it
    // This prevents the warning about reverting webpack devtool

    // Handle Chrome extension script injection issues and improve chunk loading
    if (!isServer && dev) {
      // Temporarily disable chunk splitting to debug vendor.js issue
      // config.optimization.splitChunks = {
      //   chunks: 'all',
      //   maxInitialRequests: 25,
      //   maxAsyncRequests: 25,
      //   cacheGroups: {
      //     vendor: {
      //       test: /[\\/]node_modules[\\/]/,
      //       name: 'vendors',
      //       chunks: 'all',
      //       priority: 10,
      //     },
      //     common: {
      //       name: 'common',
      //       minChunks: 2,
      //       chunks: 'all',
      //       priority: 5,
      //       reuseExistingChunk: true,
      //     },
      //   },
      // };

      // Better error handling for chunk loading
      config.output.crossOriginLoading = false;
      config.output.hotUpdateMainFilename = 'static/webpack/[fullhash].hot-update.json';
      config.output.hotUpdateChunkFilename = 'static/webpack/[id].[fullhash].hot-update.js';

      // Ignore chrome-extension protocol in module resolution
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          // Prevent fs module errors from extensions
          fs: false,
          path: false,
          crypto: false,
        },
      };

      // Add externals to ignore extension protocols
      config.externals = [
        ...(config.externals || []),
        function ({ request }, callback) {
          if (request && (
            request.startsWith('chrome-extension://') ||
            request.startsWith('moz-extension://') ||
            request.startsWith('extension://')
          )) {
            // Treat extension URLs as external dependencies
            return callback(null, 'commonjs ' + request);
          }
          callback();
        },
      ];

      // Configure webpack to be more tolerant of extension interference
      config.stats = {
        ...config.stats,
        warningsFilter: [
          /Failed to parse source map/,
          /DevTools failed to load source map/,
          /chrome-extension/,
          /moz-extension/,
        ],
      };

      // Add babel-loader to transpile problematic modules
      config.module.rules.push({
        test: /\.(js|mjs|jsx)$/,
        include: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel'],
            compact: false,
          },
        },
      });
    }

    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Only add CSP in production - let middleware handle it in development
          ...(process.env.NODE_ENV === 'production' ? [
            {
              key: 'Content-Security-Policy',
              value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; frame-src 'self' https://js.stripe.com; object-src 'none';"
            }
          ] : []),
        ],
      },
    ];
  },
}

module.exports = nextConfig
