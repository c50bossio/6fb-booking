const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const nextConfig = require('./next.config.js');

module.exports = {
  ...nextConfig,
  webpack: (config, options) => {
    // Apply existing webpack config
    if (nextConfig.webpack) {
      config = nextConfig.webpack(config, options);
    }

    // Add bundle analyzer
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: options.isServer
            ? '../analyze/server.html'
            : '../analyze/client.html',
        })
      );
    }

    return config;
  },
};