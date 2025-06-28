# Changelog

All notable changes to eslint-plugin-6fb will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-28

### Added

- Initial release with 6 custom ESLint rules
- `no-duplicate-component-names` - Detects duplicate React component names
- `no-prefixed-components` - Flags components with forbidden prefixes
- `no-multiple-implementations` - Detects multiple implementations of the same functionality
- `single-source-of-truth` - Enforces single export source for key components
- `limit-directory-components` - Limits components per directory
- `no-copy-paste-code` - Detects duplicate code blocks
- Comprehensive test suite for all rules
- TypeScript support
- Detailed documentation for each rule
- Example configurations for frontend and backend