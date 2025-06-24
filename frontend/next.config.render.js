/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for Render static sites
  output: 'export',
  
  // Output directory for static export
  distDir: '.next',
  
  // Disable server-side features not compatible with static export
  reactStrictMode: false,
  
  // Image optimization settings for static export
  images: {
    unoptimized: true, // Required for static export
    domains: ['localhost', 'sixfb-backend.onrender.com', 'stripe.com'],
  },
  
  // Essential TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },

  // Essential ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable server-side features for static export
  experimental: {
    // Disable middleware for static export
    runtime: undefined,
  },

  // Webpack configuration for static builds
  webpack: (config, { dev, isServer }) => {
    // Only modify client-side config for static export
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        os: false,
      };
    }
    return config;
  },

  // Trailing slash for static hosting
  trailingSlash: true,
  
  // Skip build-time API routes (not compatible with static export)
  skipTrailingSlashRedirect: true,

  // Generate all possible static paths (required for dynamic routes)
  async generateStaticParams() {
    return [
      { shopId: 'demo' },
      { shopId: 'test' },
      { id: 'demo' },
      { id: 'test' }
    ];
  },

  // Essential headers for static hosting (won't work with static export but keeping for reference)
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
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Environment variables for static build
  env: {
    NEXT_PUBLIC_DEPLOY_TARGET: 'render-static',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
}

module.exports = nextConfig