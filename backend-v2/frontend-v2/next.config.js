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
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Simple polyfill injection
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.DefinePlugin({
          'typeof self': '"object"',
          'typeof window': '"object"',
          'typeof document': '"object"',
        })
      );
    }
    return config;
  },
}

module.exports = nextConfig;