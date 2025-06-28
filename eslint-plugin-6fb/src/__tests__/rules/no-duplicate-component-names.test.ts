import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../rules/no-duplicate-component-names';

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

ruleTester.run('no-duplicate-component-names', rule, {
  valid: [
    // Different component names are allowed
    {
      code: `
        function Button() { return <button />; }
        function Input() { return <input />; }
      `,
    },
    // Same name in test files should be ignored
    {
      code: `function Calendar() { return <div />; }`,
      filename: 'Calendar.test.tsx',
    },
    // Same name in demo files should be ignored
    {
      code: `function Calendar() { return <div />; }`,
      filename: 'Calendar.demo.tsx',
    },
    // Non-component functions are ignored
    {
      code: `
        function calculateTotal() { return 0; }
        function calculateTotal() { return 0; }
      `,
    },
    // Excluded patterns
    {
      code: `function Calendar() { return <div />; }`,
      filename: 'src/legacy/Calendar.tsx',
      options: [{ excludePatterns: ['legacy'] }],
    },
  ],
  invalid: [
    // Exact duplicate component names
    {
      code: `
        function Calendar() { return <div />; }
        function Calendar() { return <div />; }
      `,
      errors: [
        {
          messageId: 'duplicateComponent',
          data: {
            name: 'Calendar',
            otherFiles: expect.stringContaining(''),
          },
        },
      ],
    },
    // Similar component names when checkSimilarNames is true
    {
      code: `
        function Calendar() { return <div />; }
        function EnhancedCalendar() { return <div />; }
      `,
      options: [{ checkSimilarNames: true }],
      errors: [
        {
          messageId: 'similarComponent',
          data: {
            name: 'EnhancedCalendar',
            similarName: 'Calendar',
            otherFile: expect.stringContaining(''),
          },
        },
      ],
    },
    // Case-insensitive duplicates when ignoreCase is true
    {
      code: `
        function Calendar() { return <div />; }
        function calendar() { return <div />; }
      `,
      options: [{ ignoreCase: true }],
      errors: [
        {
          messageId: 'duplicateComponent',
        },
      ],
    },
    // Arrow function components
    {
      code: `
        const Calendar = () => <div />;
        const Calendar = () => <div />;
      `,
      errors: [
        {
          messageId: 'duplicateComponent',
        },
      ],
    },
    // Class components
    {
      code: `
        class Calendar extends React.Component { render() { return <div />; } }
        class Calendar extends React.Component { render() { return <div />; } }
      `,
      errors: [
        {
          messageId: 'duplicateComponent',
        },
      ],
    },
  ],
});