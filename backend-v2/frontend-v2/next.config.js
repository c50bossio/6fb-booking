/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // Enable TypeScript build errors for production safety
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable ESLint checks during builds for code quality
    ignoreDuringBuilds: false,
  },
  images: {
    // Secure image domain restrictions
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'www.gravatar.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.bookedbarber.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Performance optimizations
  experimental: {
    // Disabled optimizeCss due to critters module issue
    // optimizeCss: true,
    gzipSize: true,
  },
  // Bundle optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Security headers including CSP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://www.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 http://localhost:* http://127.0.0.1:* http://backend:8000 http://bookedbarber-backend:8000 https://api.stripe.com https://www.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net wss: ws:",
              "frame-src 'self' https://js.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
  // API rewrites to proxy backend calls
  async rewrites() {
    const backendUrl = process.env.DOCKER_BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/v2/:path*',
        destination: `${backendUrl}/api/v2/:path*`,
      },
    ];
  },
  webpack: (config, { isServer, dev }) => {
    const webpack = require('webpack');
    const path = require('path');
    
    // Server-side polyfills for SSR
    if (isServer) {
      // Inject our comprehensive polyfills
      config.resolve.alias = {
        ...config.resolve.alias,
        'window': path.resolve(__dirname, 'lib/ssr-polyfills.js'),
        'global': path.resolve(__dirname, 'lib/ssr-polyfills.js'),
        'self': path.resolve(__dirname, 'lib/ssr-polyfills.js'),
      };

      // Define globals for SSR
      config.plugins.push(
        new webpack.ProvidePlugin({
          window: path.resolve(__dirname, 'lib/ssr-polyfills.js'),
          global: path.resolve(__dirname, 'lib/ssr-polyfills.js'),
          self: path.resolve(__dirname, 'lib/ssr-polyfills.js'),
        })
      );
    }

    // Performance optimizations
    if (!dev) {
      // Bundle splitting optimizations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
            analytics: {
              test: /[\\/]components[\\/]analytics[\\/]/,
              name: 'analytics',
              priority: 15,
              reuseExistingChunk: true,
            },
            dashboard: {
              test: /[\\/]components[\\/]dashboard[\\/]/,
              name: 'dashboard',
              priority: 15,
              reuseExistingChunk: true,
            },
            calendar: {
              test: /[\\/]components[\\/]calendar[\\/]/,
              name: 'calendar',
              priority: 15,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
}

module.exports = withBundleAnalyzer(nextConfig);