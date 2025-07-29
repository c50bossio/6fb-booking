/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
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

    return config;
  },
}

module.exports = nextConfig;