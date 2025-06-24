/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Simple webpack config without complex optimizations
  webpack: (config, { dev, isServer }) => {
    if (!isServer && dev) {
      // Simple configuration for development
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig