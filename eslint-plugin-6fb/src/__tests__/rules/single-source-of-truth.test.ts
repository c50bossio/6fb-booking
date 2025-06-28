import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../rules/single-source-of-truth';

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

ruleTester.run('single-source-of-truth', rule, {
  valid: [
    // Single export source
    {
      code: `export function AuthProvider() { return null; }`,
      filename: 'src/providers/AuthProvider.tsx',
    },
    // Import from canonical path
    {
      code: `import { AuthProvider } from '../providers/AuthProvider';`,
      options: [{
        keyComponents: ['AuthProvider'],
        canonicalPaths: { AuthProvider: 'src/providers/AuthProvider' },
      }],
    },
    // Non-key components can be exported from multiple places
    {
      code: `export function Button() { return null; }`,
      options: [{
        keyComponents: ['AuthProvider'],
        checkAllComponents: false,
      }],
    },
    // Barrel exports allowed
    {
      code: `export { AuthProvider } from './AuthProvider';`,
      filename: 'src/providers/index.ts',
      options: [{
        keyComponents: ['AuthProvider'],
        allowBarrelExports: true,
      }],
    },
    // Import from index file when canonical path is the directory
    {
      code: `import { Calendar } from '../components/Calendar';`,
      options: [{
        keyComponents: ['Calendar'],
        canonicalPaths: { Calendar: 'src/components/Calendar' },
      }],
    },
  ],
  invalid: [
    // Multiple exports of the same component
    {
      code: `
        export function AuthProvider() { return null; }
        export function AuthProvider() { return null; }
      `,
      options: [{
        keyComponents: ['AuthProvider'],
      }],
      errors: [
        {
          messageId: 'multipleExports',
          data: {
            name: 'AuthProvider',
            locations: expect.stringContaining(''),
          },
        },
      ],
    },
    // Import from non-canonical path
    {
      code: `import { AuthProvider } from './components/auth/AuthProvider';`,
      options: [{
        keyComponents: ['AuthProvider'],
        canonicalPaths: { AuthProvider: 'src/providers/AuthProvider' },
      }],
      errors: [
        {
          messageId: 'inconsistentImport',
          data: {
            name: 'AuthProvider',
            canonical: 'src/providers/AuthProvider',
            current: './components/auth/AuthProvider',
          },
        },
      ],
    },
    // Re-export when not allowed
    {
      code: `export { AuthProvider } from './AuthProvider';`,
      filename: 'src/components/index.ts',
      options: [{
        keyComponents: ['AuthProvider'],
        allowBarrelExports: false,
      }],
      errors: [
        {
          messageId: 'reExport',
          data: {
            name: 'AuthProvider',
            source: './AuthProvider',
          },
        },
      ],
    },
    // Multiple exports from different files (simulated)
    {
      code: `
        export function Calendar() { return null; }
        export const CalendarWidget = Calendar;
      `,
      options: [{
        keyComponents: ['Calendar'],
        checkAllComponents: false,
      }],
      errors: [
        {
          messageId: 'multipleExports',
        },
      ],
    },
    // Check all components when enabled
    {
      code: `
        export function Button() { return null; }
        export function Button() { return null; }
      `,
      options: [{
        checkAllComponents: true,
      }],
      errors: [
        {
          messageId: 'multipleExports',
        },
      ],
    },
  ],
});