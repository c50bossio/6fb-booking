import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import path from 'path';
import { extractComponentName, isReactComponent } from '../utils/component-utils';

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/6fb-booking/eslint-plugin-6fb/blob/main/docs/rules/${name}.md`
);

interface DirectoryComponentCount {
  [directory: string]: {
    count: number;
    components: string[];
  };
}

const rule = createRule({
  name: 'limit-directory-components',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Limit the number of components in specific directories',
    },
    messages: {
      tooManyComponents: 'Directory "{{directory}}" contains {{count}} components (max: {{max}}). Consider reorganizing.',
      suggestReorganization: 'Components in this directory: {{components}}. Consider creating subdirectories or moving related components together.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            default: 10,
          },
          directories: {
            type: 'object',
            additionalProperties: { type: 'number' },
            default: {},
          },
          exclude: {
            type: 'array',
            items: { type: 'string' },
            default: ['node_modules', '__tests__', '__mocks__', '.storybook'],
          },
          countOnlyExported: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      max: 10,
      directories: {
        'src/components': 5,
        'src/components/modals': 5,
        'src/components/forms': 5,
        'src/pages': 15,
        'src/features': 10,
      },
      exclude: ['node_modules', '__tests__', '__mocks__', '.storybook'],
      countOnlyExported: true,
    },
  ],
  create(context) {
    const options = context.options[0];
    const filename = context.getFilename();
    const sourceCode = context.getSourceCode();

    // Skip excluded directories
    if (options.exclude.some((pattern: string) => filename.includes(pattern))) {
      return {};
    }

    const directoryComponentCount: DirectoryComponentCount = {};

    function getDirectory(filePath: string): string {
      return path.dirname(filePath);
    }

    function getMaxForDirectory(directory: string): number {
      // Check for exact match first
      if ((options.directories as any)[directory] !== undefined) {
        return (options.directories as any)[directory];
      }

      // Check for partial matches (subdirectories)
      for (const [configDir, max] of Object.entries(options.directories)) {
        if (directory.includes(configDir)) {
          return max as number;
        }
      }

      return options.max;
    }

    function trackComponent(componentName: string, node: TSESTree.Node, isExported: boolean) {
      if (options.countOnlyExported && !isExported) {
        return;
      }

      const directory = getDirectory(filename);

      if (!directoryComponentCount[directory]) {
        directoryComponentCount[directory] = {
          count: 0,
          components: [],
        };
      }

      directoryComponentCount[directory].count++;
      directoryComponentCount[directory].components.push(componentName);
    }

    let hasExportDefault = false;
    let hasNamedExports = false;

    return {
      // Track exported components
      ExportNamedDeclaration(node) {
        hasNamedExports = true;

        if (node.declaration) {
          if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
            const name = extractComponentName(node.declaration);
            if (name && isReactComponent(name)) {
              trackComponent(name, node, true);
            }
          } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
            const name = extractComponentName(node.declaration);
            if (name && isReactComponent(name)) {
              trackComponent(name, node, true);
            }
          } else if (node.declaration.type === 'VariableDeclaration') {
            for (const declarator of node.declaration.declarations) {
              const name = extractComponentName(declarator);
              if (name && isReactComponent(name)) {
                trackComponent(name, node, true);
              }
            }
          }
        }
      },

      ExportDefaultDeclaration(node) {
        hasExportDefault = true;

        if (node.declaration.type === 'FunctionDeclaration' ||
            node.declaration.type === 'ClassDeclaration') {
          const name = extractComponentName(node.declaration);
          if (name && isReactComponent(name)) {
            trackComponent(name, node, true);
          }
        } else if (node.declaration.type === 'Identifier') {
          trackComponent(node.declaration.name, node, true);
        }
      },

      // Track non-exported components if needed
      FunctionDeclaration(node) {
        if (!options.countOnlyExported && node.id) {
          const name = extractComponentName(node);
          if (name && isReactComponent(name)) {
            trackComponent(name, node, false);
          }
        }
      },

      VariableDeclarator(node) {
        if (!options.countOnlyExported) {
          const name = extractComponentName(node);
          if (name && isReactComponent(name)) {
            trackComponent(name, node, false);
          }
        }
      },

      ClassDeclaration(node) {
        if (!options.countOnlyExported && node.id) {
          const name = extractComponentName(node);
          if (name && isReactComponent(name)) {
            trackComponent(name, node, false);
          }
        }
      },

      // Check limits at the end of file
      'Program:exit'() {
        for (const [directory, info] of Object.entries(directoryComponentCount)) {
          const maxComponents = getMaxForDirectory(directory);

          if (info.count > maxComponents) {
            const relativeDir = path.relative(process.cwd(), directory);

            context.report({
              node: sourceCode.ast,
              messageId: 'tooManyComponents',
              data: {
                directory: relativeDir,
                count: info.count,
                max: maxComponents,
              },
            });

            // Provide additional context about which components are in the directory
            context.report({
              node: sourceCode.ast,
              messageId: 'suggestReorganization',
              data: {
                components: info.components.join(', '),
              },
            });
          }
        }
      },
    };
  },
});

export default rule;
