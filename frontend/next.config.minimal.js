/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // Minimal TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },

  // Minimal ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig