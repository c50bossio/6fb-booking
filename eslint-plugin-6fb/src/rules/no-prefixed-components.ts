import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { 
  extractComponentName, 
  isReactComponent,
  isTestFile,
  isDemoFile
} from '../utils/component-utils';

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/6fb-booking/eslint-plugin-6fb/blob/main/docs/rules/${name}.md`
);

const rule = createRule({
  name: 'no-prefixed-components',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow components with prefixes like "Enhanced", "Simple", "Demo", "Test" in production code',
    },
    messages: {
      forbiddenPrefix: 'Component "{{name}}" uses forbidden prefix "{{prefix}}". {{suggestion}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          forbiddenPrefixes: {
            type: 'array',
            items: { type: 'string' },
            default: ['Enhanced', 'Simple', 'Demo', 'Test', 'Mock', 'Temp', 'Old', 'New'],
          },
          allowInTests: {
            type: 'boolean',
            default: true,
          },
          allowInDemos: {
            type: 'boolean',
            default: true,
          },
          suggestions: {
            type: 'object',
            additionalProperties: { type: 'string' },
            default: {
              Enhanced: 'Use composition or hooks to enhance functionality instead of creating a new component.',
              Simple: 'Use props or conditional rendering instead of creating a simplified version.',
              Demo: 'Move demo components to a dedicated demo or storybook directory.',
              Test: 'Move test components to test files or __tests__ directory.',
              Mock: 'Use proper mocking libraries or move to test files.',
              Temp: 'Temporary components should be refactored or removed.',
              Old: 'Remove old components or refactor the existing one.',
              New: 'Replace the original component instead of creating a "New" version.',
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      forbiddenPrefixes: ['Enhanced', 'Simple', 'Demo', 'Test', 'Mock', 'Temp', 'Old', 'New'],
      allowInTests: true,
      allowInDemos: true,
      suggestions: {
        Enhanced: 'Use composition or hooks to enhance functionality instead of creating a new component.',
        Simple: 'Use props or conditional rendering instead of creating a simplified version.',
        Demo: 'Move demo components to a dedicated demo or storybook directory.',
        Test: 'Move test components to test files or __tests__ directory.',
        Mock: 'Use proper mocking libraries or move to test files.',
        Temp: 'Temporary components should be refactored or removed.',
        Old: 'Remove old components or refactor the existing one.',
        New: 'Replace the original component instead of creating a "New" version.',
      },
    },
  ],
  create(context) {
    const options = context.options[0];
    const filename = context.getFilename();
    
    // Skip if in test/demo files and allowed
    if ((options.allowInTests && isTestFile(filename)) ||
        (options.allowInDemos && isDemoFile(filename))) {
      return {};
    }
    
    function checkComponentName(node: TSESTree.Node, componentName: string) {
      for (const prefix of options.forbiddenPrefixes) {
        if (componentName.startsWith(prefix)) {
          // Check if the prefix is actually part of a longer word
          // e.g., "Testament" shouldn't trigger for "Test" prefix
          const charAfterPrefix = componentName[prefix.length];
          if (!charAfterPrefix || charAfterPrefix === charAfterPrefix.toUpperCase()) {
            context.report({
              node,
              messageId: 'forbiddenPrefix',
              data: {
                name: componentName,
                prefix,
                suggestion: (options.suggestions as any)[prefix] || 'Consider using a more descriptive name.',
              },
            });
            break;
          }
        }
      }
    }
    
    return {
      FunctionDeclaration(node) {
        const name = extractComponentName(node);
        if (name && isReactComponent(name)) {
          checkComponentName(node, name);
        }
      },
      
      VariableDeclarator(node) {
        const name = extractComponentName(node);
        if (name && isReactComponent(name)) {
          checkComponentName(node, name);
        }
      },
      
      ClassDeclaration(node) {
        const name = extractComponentName(node);
        if (name && isReactComponent(name)) {
          checkComponentName(node, name);
        }
      },
      
      ExportDefaultDeclaration(node) {
        const name = extractComponentName(node);
        if (name && isReactComponent(name)) {
          checkComponentName(node, name);
        }
      },
    };
  },
});

export default rule;