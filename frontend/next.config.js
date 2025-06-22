/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone for production deployment
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  typescript: {
    // Allow production builds to complete even with TypeScript errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to complete even with ESLint errors
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
      {
        protocol: 'https',
        hostname: 'bookbarber.com',
      },
      {
        protocol: 'https',
        hostname: '*.bookbarber.com',
      },
    ],
  },
  // Clean webpack configuration without deprecated options
  webpack: (config, { dev }) => {
    // Don't override devtool in development - let Next.js handle it
    // This prevents the warning about reverting webpack devtool
    
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