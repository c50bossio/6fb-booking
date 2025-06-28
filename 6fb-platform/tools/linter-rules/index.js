/**
 * Custom ESLint rules for 6FB Platform
 * Enforces clean architecture and prevents code duplication
 */

module.exports = {
  rules: {
    'no-cross-package-imports': require('./rules/no-cross-package-imports'),
    'enforce-dependency-direction': require('./rules/enforce-dependency-direction'),
    'no-duplicate-api-endpoints': require('./rules/no-duplicate-api-endpoints'),
    'require-typed-api-responses': require('./rules/require-typed-api-responses'),
    'consistent-error-handling': require('./rules/consistent-error-handling'),
    'no-business-logic-in-ui': require('./rules/no-business-logic-in-ui')
  }
};