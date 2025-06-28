import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../rules/no-prefixed-components';

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

ruleTester.run('no-prefixed-components', rule, {
  valid: [
    // Components without forbidden prefixes
    {
      code: `function Calendar() { return <div />; }`,
    },
    {
      code: `const Button = () => <button />;`,
    },
    // Prefixes that are part of a longer word
    {
      code: `function Testament() { return <div />; }`, // "Test" is prefix but part of word
    },
    {
      code: `function Simplicity() { return <div />; }`, // "Simple" is prefix but part of word
    },
    // Allowed in test files
    {
      code: `function TestCalendar() { return <div />; }`,
      filename: 'Calendar.test.tsx',
      options: [{ allowInTests: true }],
    },
    // Allowed in demo files
    {
      code: `function DemoCalendar() { return <div />; }`,
      filename: 'Calendar.demo.tsx',
      options: [{ allowInDemos: true }],
    },
    // Non-components are ignored
    {
      code: `function testHelper() { return null; }`,
    },
  ],
  invalid: [
    // Enhanced prefix
    {
      code: `function EnhancedCalendar() { return <div />; }`,
      errors: [
        {
          messageId: 'forbiddenPrefix',
          data: {
            name: 'EnhancedCalendar',
            prefix: 'Enhanced',
            suggestion: 'Use composition or hooks to enhance functionality instead of creating a new component.',
          },
        },
      ],
    },
    // Simple prefix
    {
      code: `const SimpleButton = () => <button />;`,
      errors: [
        {
          messageId: 'forbiddenPrefix',
          data: {
            name: 'SimpleButton',
            prefix: 'Simple',
            suggestion: 'Use props or conditional rendering instead of creating a simplified version.',
          },
        },
      ],
    },
    // Demo prefix in production code
    {
      code: `function DemoCalendar() { return <div />; }`,
      filename: 'src/components/Calendar.tsx',
      errors: [
        {
          messageId: 'forbiddenPrefix',
          data: {
            name: 'DemoCalendar',
            prefix: 'Demo',
            suggestion: 'Move demo components to a dedicated demo or storybook directory.',
          },
        },
      ],
    },
    // Test prefix in production code
    {
      code: `class TestComponent extends React.Component { render() { return <div />; } }`,
      filename: 'src/components/Component.tsx',
      errors: [
        {
          messageId: 'forbiddenPrefix',
          data: {
            name: 'TestComponent',
            prefix: 'Test',
            suggestion: 'Move test components to test files or __tests__ directory.',
          },
        },
      ],
    },
    // Multiple forbidden prefixes
    {
      code: `
        function OldCalendar() { return <div />; }
        function NewCalendar() { return <div />; }
        function TempCalendar() { return <div />; }
      `,
      errors: [
        {
          messageId: 'forbiddenPrefix',
          data: { name: 'OldCalendar', prefix: 'Old' },
        },
        {
          messageId: 'forbiddenPrefix',
          data: { name: 'NewCalendar', prefix: 'New' },
        },
        {
          messageId: 'forbiddenPrefix',
          data: { name: 'TempCalendar', prefix: 'Temp' },
        },
      ],
    },
    // Custom forbidden prefixes
    {
      code: `function BetaFeature() { return <div />; }`,
      options: [{ forbiddenPrefixes: ['Beta', 'Alpha'] }],
      errors: [
        {
          messageId: 'forbiddenPrefix',
          data: {
            name: 'BetaFeature',
            prefix: 'Beta',
          },
        },
      ],
    },
  ],
});