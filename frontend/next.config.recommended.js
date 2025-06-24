/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // Essential TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },

  // Essential ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Only essential webpack configuration - avoid complex optimizations
  webpack: (config, { dev, isServer }) => {
    if (!isServer && dev) {
      // Simple fallback configuration for client-side development
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },

  // Essential headers without complex CSP (let middleware handle CSP)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig