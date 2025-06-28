import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../rules/limit-directory-components';

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

ruleTester.run('limit-directory-components', rule, {
  valid: [
    // Within default limit
    {
      code: `
        export function Button() { return null; }
        export function Input() { return null; }
      `,
      filename: 'src/components/forms/Input.tsx',
    },
    // Within custom directory limit
    {
      code: `
        export function Modal() { return null; }
        export function Dialog() { return null; }
      `,
      filename: 'src/components/modals/Dialog.tsx',
      options: [{
        directories: { 'src/components/modals': 5 },
      }],
    },
    // Non-exported components when countOnlyExported is true
    {
      code: `
        function InternalHelper() { return null; }
        function AnotherHelper() { return null; }
        export function PublicComponent() { return null; }
      `,
      filename: 'src/components/Component.tsx',
      options: [{
        max: 1,
        countOnlyExported: true,
      }],
    },
    // Excluded directories
    {
      code: `
        export function TestComponent1() { return null; }
        export function TestComponent2() { return null; }
        export function TestComponent3() { return null; }
      `,
      filename: 'src/__tests__/Component.test.tsx',
      options: [{
        max: 1,
        exclude: ['__tests__'],
      }],
    },
    // Non-component exports
    {
      code: `
        export const config = {};
        export function helperFunction() {}
        export function Component() { return null; }
      `,
      filename: 'src/utils/helpers.ts',
      options: [{
        max: 1,
      }],
    },
  ],
  invalid: [
    // Exceeds default limit
    {
      code: `
        export function Component1() { return null; }
        export function Component2() { return null; }
        export function Component3() { return null; }
      `,
      filename: 'src/components/index.tsx',
      options: [{
        max: 2,
      }],
      errors: [
        {
          messageId: 'tooManyComponents',
          data: {
            directory: 'src/components',
            count: 3,
            max: 2,
          },
        },
        {
          messageId: 'suggestReorganization',
          data: {
            components: 'Component1, Component2, Component3',
          },
        },
      ],
    },
    // Exceeds custom directory limit
    {
      code: `
        export function Modal1() { return null; }
        export function Modal2() { return null; }
        export function Modal3() { return null; }
      `,
      filename: 'src/components/modals/Modal3.tsx',
      options: [{
        directories: { 'src/components/modals': 2 },
      }],
      errors: [
        {
          messageId: 'tooManyComponents',
          data: {
            directory: expect.stringContaining('modals'),
            count: 3,
            max: 2,
          },
        },
        {
          messageId: 'suggestReorganization',
        },
      ],
    },
    // Count all components when countOnlyExported is false
    {
      code: `
        function Internal1() { return null; }
        function Internal2() { return null; }
        export function Public() { return null; }
      `,
      filename: 'src/components/Component.tsx',
      options: [{
        max: 2,
        countOnlyExported: false,
      }],
      errors: [
        {
          messageId: 'tooManyComponents',
          data: {
            count: 3,
            max: 2,
          },
        },
      ],
    },
    // Multiple types of components
    {
      code: `
        export function FunctionComponent() { return null; }
        export const ArrowComponent = () => null;
        export class ClassComponent extends React.Component {
          render() { return null; }
        }
        export default function DefaultComponent() { return null; }
      `,
      filename: 'src/components/index.tsx',
      options: [{
        max: 3,
      }],
      errors: [
        {
          messageId: 'tooManyComponents',
          data: {
            count: 4,
            max: 3,
          },
        },
      ],
    },
  ],
});
