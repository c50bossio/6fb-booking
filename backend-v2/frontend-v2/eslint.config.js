/**
 * ESLint Configuration (v9+ Flat Config Format)
 * Migrated from .eslintrc.json and .eslintrc.custom.js
 */

const { FlatCompat } = require('@eslint/eslintrc')
const path = require('path')

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

module.exports = [
  // Base Next.js configuration
  ...compat.extends('next/core-web-vitals'),
  
  // Global configuration
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    
    // Simple rules that work without additional plugins
    rules: {
      // Basic JavaScript/React rules
      'react/no-unescaped-entities': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  
  // Test files configuration
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
  
  // Configuration files
  {
    files: ['*.config.{js,ts}', '*.setup.{js,ts}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      '*.min.js',
      'public/**',
      'coverage/**',
      '.env*',
      '*.log',
    ],
  },
]