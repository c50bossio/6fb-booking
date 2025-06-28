import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import {
  ComponentInfo,
  extractComponentName,
  getComponentType,
  isReactComponent,
  normalizeComponentName,
  getRelativeFilePath,
  isTestFile,
  isDemoFile
} from '../utils/component-utils';

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/6fb-booking/eslint-plugin-6fb/blob/main/docs/rules/${name}.md`
);

interface ComponentRegistry {
  [componentName: string]: ComponentInfo[];
}

const rule = createRule({
  name: 'no-duplicate-component-names',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow duplicate React component names across the codebase',
    },
    messages: {
      duplicateComponent: 'Component "{{name}}" is already defined in {{otherFiles}}. Consider renaming or consolidating.',
      similarComponent: 'Component "{{name}}" is similar to "{{similarName}}" in {{otherFile}}. This might be a duplicate.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreCase: {
            type: 'boolean',
            default: false,
          },
          checkSimilarNames: {
            type: 'boolean',
            default: true,
          },
          excludePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreCase: false,
      checkSimilarNames: true,
      excludePatterns: [],
    },
  ],
  create(context) {
    const options = context.options[0];
    const filename = context.getFilename();
    const sourceCode = context.getSourceCode();

    // Skip test and demo files
    if (isTestFile(filename) || isDemoFile(filename)) {
      return {};
    }

    // Check if file matches exclude patterns
    if (options.excludePatterns.some((pattern: string) => new RegExp(pattern).test(filename))) {
      return {};
    }

    // Global registry to track all components across files
    // In a real implementation, this would be shared across files
    const componentRegistry: ComponentRegistry = {};

    function checkForDuplicates(node: TSESTree.Node, componentName: string) {
      const normalizedName = options.ignoreCase ? componentName.toLowerCase() : componentName;
      const currentFile = getRelativeFilePath(filename, process.cwd());

      // Check for exact duplicates
      if (componentRegistry[normalizedName]) {
        const duplicates = componentRegistry[normalizedName].filter(
          comp => comp.filePath !== currentFile
        );

        if (duplicates.length > 0) {
          const otherFiles = duplicates.map(d => d.filePath).join(', ');
          context.report({
            node,
            messageId: 'duplicateComponent',
            data: {
              name: componentName,
              otherFiles,
            },
          });
        }
      }

      // Check for similar names
      if (options.checkSimilarNames) {
        const normalized = normalizeComponentName(componentName);

        Object.entries(componentRegistry).forEach(([registeredName, components]) => {
          const registeredNormalized = normalizeComponentName(registeredName);

          if (normalized === registeredNormalized &&
              registeredName !== componentName &&
              components.some(c => c.filePath !== currentFile)) {
            const otherComponent = components.find(c => c.filePath !== currentFile);
            if (otherComponent) {
              context.report({
                node,
                messageId: 'similarComponent',
                data: {
                  name: componentName,
                  similarName: registeredName,
                  otherFile: otherComponent.filePath,
                },
              });
            }
          }
        });
      }

      // Register the component
      if (!componentRegistry[normalizedName]) {
        componentRegistry[normalizedName] = [];
      }

      componentRegistry[normalizedName].push({
        name: componentName,
        filePath: currentFile,
        node,
        type: getComponentType(node) || 'function',
      });
    }

    return {
      FunctionDeclaration(node) {
        const name = extractComponentName(node);
        if (name && isReactComponent(name)) {
          checkForDuplicates(node, name);
        }
      },

      VariableDeclarator(node) {
        const name = extractComponentName(node);
        if (name && isReactComponent(name)) {
          checkForDuplicates(node, name);
        }
      },

      ClassDeclaration(node) {
        const name = extractComponentName(node);
        if (name && isReactComponent(name)) {
          checkForDuplicates(node, name);
        }
      },

      ExportDefaultDeclaration(node) {
        const name = extractComponentName(node);
        if (name && isReactComponent(name)) {
          checkForDuplicates(node, name);
        }
      },
    };
  },
});

export default rule;
