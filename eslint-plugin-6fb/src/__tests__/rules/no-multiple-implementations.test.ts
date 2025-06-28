import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../rules/no-multiple-implementations';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('no-multiple-implementations', rule, {
  valid: [
    // Single auth provider
    {
      code: `
        function AuthProvider({ children }) {
          return <Context.Provider>{children}</Context.Provider>;
        }
      `,
    },
    // Different types of services
    {
      code: `
        class UserService {}
        class ProductService {}
        class OrderService {}
      `,
    },
    // Non-matching patterns
    {
      code: `
        function useAuth() {}
        function useUser() {}
        function useTheme() {}
      `,
    },
    // Single implementation with imports disabled
    {
      code: `
        import { AuthProvider } from './auth';
        import { AuthContext } from './auth';
      `,
      options: [{ checkImports: false }],
    },
  ],
  invalid: [
    // Multiple auth providers
    {
      code: `
        function AuthProvider() {}
        function AuthManager() {}
      `,
      errors: [
        {
          messageId: 'duplicateProvider',
          data: {
            name: 'AuthManager',
            existing: 'AuthProvider',
            suggestion: 'Use a single authentication provider/context throughout the application.',
          },
        },
        {
          messageId: 'multipleImplementations',
          data: {
            category: 'authentication',
            suggestion: 'Use a single authentication provider/context throughout the application.',
          },
        },
      ],
    },
    // Multiple payment processors
    {
      code: `
        class PaymentService {}
        class PaymentProcessor {}
        const PaymentGateway = {};
      `,
      errors: [
        {
          messageId: 'duplicateProvider',
          data: {
            name: 'PaymentProcessor',
            existing: 'PaymentService',
          },
        },
        {
          messageId: 'duplicateProvider',
          data: {
            name: 'PaymentGateway',
            existing: 'PaymentService',
          },
        },
        {
          messageId: 'multipleImplementations',
          data: {
            category: 'payment processing',
          },
        },
      ],
    },
    // Multiple calendar implementations
    {
      code: `
        function CalendarProvider() {}
        function CalendarService() {}
        function CalendarWidget() {}
      `,
      errors: [
        {
          messageId: 'duplicateProvider',
        },
        {
          messageId: 'duplicateProvider',
        },
        {
          messageId: 'multipleImplementations',
          data: {
            category: 'calendar',
          },
        },
      ],
    },
    // Imports of multiple implementations
    {
      code: `
        import { AuthProvider } from './auth1';
        import { AuthContext } from './auth2';
        import { AuthService } from './auth3';
      `,
      options: [{ checkImports: true }],
      errors: [
        {
          messageId: 'duplicateProvider',
        },
        {
          messageId: 'duplicateProvider',
        },
        {
          messageId: 'multipleImplementations',
        },
      ],
    },
    // JSX Context providers
    {
      code: `
        function App() {
          return (
            <>
              <AuthContext.Provider>
                <AuthProvider.Provider>
                  {children}
                </AuthProvider.Provider>
              </AuthContext.Provider>
            </>
          );
        }
      `,
      errors: [
        {
          messageId: 'duplicateProvider',
          data: {
            name: 'AuthProvider',
            existing: 'AuthContext',
          },
        },
      ],
    },
    // Custom patterns
    {
      code: `
        class DatabaseService {}
        class DatabaseManager {}
      `,
      options: [{
        patterns: [
          {
            pattern: 'Database(Service|Manager)',
            category: 'database',
            suggestion: 'Use a single database service.',
          },
        ],
      }],
      errors: [
        {
          messageId: 'duplicateProvider',
        },
        {
          messageId: 'multipleImplementations',
          data: {
            category: 'database',
            suggestion: 'Use a single database service.',
          },
        },
      ],
    },
  ],
});
