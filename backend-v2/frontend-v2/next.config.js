const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // TypeScript error checking restored - ignoreBuildErrors removed
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  
  // Bundle optimization
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'lucide-react', 'date-fns'],
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Optimize bundle splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
          },
          icons: {
            test: /[\\/]node_modules[\\/](@heroicons|lucide-react)[\\/]/,
            name: 'icons',
            priority: 20,
            chunks: 'all',
          },
          charts: {
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
            name: 'charts',
            priority: 20,
            chunks: 'all',
          },
        },
      }
    }
    return config
  },
  
  // Removed rewrites to use direct API calls
}

module.exports = withBundleAnalyzer(nextConfig)