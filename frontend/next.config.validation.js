const WebpackValidationPlugin = require('./build-validation/webpack-validation-plugin');

/**
 * Next.js Build Validation Configuration
 * 
 * This configuration adds comprehensive build-time validation to ensure:
 * - No duplicate components
 * - Proper file organization
 * - Consistent authentication
 * - Bundle size limits
 * - API endpoint uniqueness
 */

const validationConfig = {
  // Enable/disable validation in different environments
  enableValidation: process.env.SKIP_BUILD_VALIDATION !== 'true',
  
  // Validation rules
  rules: {
    maxFilesPerDirectory: 20,
    maxBundleSize: 5 * 1024 * 1024, // 5MB
    componentRegistry: 'src/components/component-registry.ts',
    
    // Patterns for files that shouldn't be in src
    forbiddenPatterns: [
      /\.test\.(tsx?|jsx?)$/,
      /\.spec\.(tsx?|jsx?)$/,
      /\.stories\.(tsx?|jsx?)$/,
      /__tests__/,
      /\.mock\.(tsx?|jsx?)$/
    ],
    
    // Paths to exclude from validation
    excludePaths: [
      'node_modules',
      '.next',
      'build',
      'dist',
      'coverage',
      '.git'
    ]
  },
  
  // Custom webpack configuration
  webpack: (config, { dev, isServer }) => {
    if (validationConfig.enableValidation) {
      config.plugins.push(
        new WebpackValidationPlugin({
          ...validationConfig.rules,
          // Only run full validation in production builds
          duplicateDetection: !dev,
          componentRegistry: !dev ? validationConfig.rules.componentRegistry : null,
          apiEndpointValidation: !dev,
          authSystemValidation: !dev,
          // Always check bundle size
          maxBundleSize: validationConfig.rules.maxBundleSize
        })
      );
    }
    
    return config;
  }
};

// Export as a function that can be merged with existing Next.js config
module.exports = function withValidation(nextConfig = {}) {
  return {
    ...nextConfig,
    webpack: (config, options) => {
      // Apply validation webpack config
      config = validationConfig.webpack(config, options);
      
      // Apply any existing webpack config
      if (typeof nextConfig.webpack === 'function') {
        config = nextConfig.webpack(config, options);
      }
      
      return config;
    }
  };
};