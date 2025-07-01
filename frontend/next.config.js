/** @type {import('next').NextConfig} */
// const withValidation = require('./next.config.validation');

const nextConfig = {
  reactStrictMode: false,
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
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'stripe.com',
      },
    ],
  },
}

// Temporarily disable validation
// const nextConfig = withValidation(baseConfig);

module.exports = nextConfig