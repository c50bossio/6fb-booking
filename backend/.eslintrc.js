module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['6fb'],
  extends: ['eslint:recommended'],
  rules: {
    // Custom rules to prevent duplicate components and bad patterns
    '6fb/no-duplicate-component-names': 'error',
    '6fb/no-prefixed-components': ['error', {
      forbiddenPrefixes: ['Enhanced', 'Simple', 'Demo', 'Test', 'Mock', 'Temp', 'Old', 'New'],
      allowInTests: true,
      allowInDemos: true,
    }],
    '6fb/no-multiple-implementations': ['error', {
      patterns: [
        {
          pattern: 'Auth(Service|Manager|Handler|Controller)',
          category: 'authentication',
          suggestion: 'Use a single authentication service throughout the application.',
        },
        {
          pattern: 'Payment(Service|Processor|Handler|Gateway)',
          category: 'payment processing',
          suggestion: 'Consolidate payment processing into a single service.',
        },
        {
          pattern: '(User|Customer|Client)(Service|Manager|Controller)',
          category: 'user management',
          suggestion: 'Use a single user/customer management service.',
        },
        {
          pattern: 'Email(Service|Sender|Manager)',
          category: 'email service',
          suggestion: 'Use a single email service throughout the application.',
        },
        {
          pattern: 'Database(Service|Manager|Connection)',
          category: 'database',
          suggestion: 'Use a single database service/connection manager.',
        },
        {
          pattern: 'Cache(Service|Manager|Provider)',
          category: 'caching',
          suggestion: 'Use a single caching service throughout the application.',
        },
      ],
    }],
    '6fb/single-source-of-truth': ['error', {
      keyComponents: [
        'DatabaseService',
        'AuthService',
        'PaymentService',
        'EmailService',
        'CacheService',
        'ConfigService',
      ],
      canonicalPaths: {
        DatabaseService: 'services/database',
        AuthService: 'services/auth_service',
        PaymentService: 'services/payment_service',
        EmailService: 'services/email_service',
        CacheService: 'services/cache_service',
        ConfigService: 'config/settings',
      },
    }],
    '6fb/limit-directory-components': ['warn', {
      max: 15,
      directories: {
        'api/v1/endpoints': 20,
        'services': 15,
        'models': 20,
        'utils': 10,
        'middleware': 10,
      },
      countOnlyExported: true,
    }],
    '6fb/no-copy-paste-code': ['warn', {
      minLines: 8,
      threshold: 0.85,
      ignoreImports: true,
    }],
  },
  overrides: [
    {
      files: ['*.py'],
      processor: 'python',
    },
  ],
};