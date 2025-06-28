import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import path from 'path';

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/6fb-booking/eslint-plugin-6fb/blob/main/docs/rules/${name}.md`
);

interface ImplementationPattern {
  pattern: RegExp;
  category: string;
  suggestion: string;
}

const rule = createRule({
  name: 'no-multiple-implementations',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect multiple implementations of the same functionality (auth providers, payment processors, etc.)',
    },
    messages: {
      multipleImplementations: 'Multiple {{category}} implementations detected. {{suggestion}}',
      duplicateProvider: 'Provider "{{name}}" appears to duplicate functionality of "{{existing}}". {{suggestion}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          patterns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                pattern: { type: 'string' },
                category: { type: 'string' },
                suggestion: { type: 'string' },
              },
              required: ['pattern', 'category', 'suggestion'],
            },
          },
          checkImports: {
            type: 'boolean',
            default: true,
          },
          checkExports: {
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
      patterns: [
        {
          pattern: 'Auth(Provider|Context|Service|Manager|Handler)',
          category: 'authentication',
          suggestion: 'Use a single authentication provider/context throughout the application.',
        },
        {
          pattern: 'Payment(Provider|Processor|Service|Handler|Gateway)',
          category: 'payment processing',
          suggestion: 'Consolidate payment processing into a single service.',
        },
        {
          pattern: '(User|Customer|Client)(Provider|Context|Service)',
          category: 'user management',
          suggestion: 'Use a single user/customer management service.',
        },
        {
          pattern: 'Theme(Provider|Context|Manager)',
          category: 'theme management',
          suggestion: 'Use a single theme provider for consistent styling.',
        },
        {
          pattern: '(Api|HTTP|Rest)(Client|Service|Provider)',
          category: 'API client',
          suggestion: 'Consolidate API calls into a single client service.',
        },
        {
          pattern: 'Calendar(Provider|Service|Component|Widget)',
          category: 'calendar',
          suggestion: 'Use a single calendar implementation throughout the application.',
        },
        {
          pattern: 'Notification(Provider|Service|Manager)',
          category: 'notifications',
          suggestion: 'Consolidate notification handling into a single service.',
        },
      ],
      checkImports: true,
      checkExports: true,
    },
  ],
  create(context) {
    const options = context.options[0];
    const filename = context.getFilename();
    const detectedImplementations: Map<string, Set<string>> = new Map();

    // Convert string patterns to RegExp objects
    const implementationPatterns: ImplementationPattern[] = options.patterns.map((p: any) => ({
      pattern: new RegExp(p.pattern),
      category: p.category,
      suggestion: p.suggestion,
    }));

    function checkForMultipleImplementations(name: string, node: TSESTree.Node) {
      for (const { pattern, category, suggestion } of implementationPatterns) {
        if (pattern.test(name)) {
          if (!detectedImplementations.has(category)) {
            detectedImplementations.set(category, new Set());
          }

          const implementations = detectedImplementations.get(category)!;

          if (implementations.size > 0 && !implementations.has(name)) {
            const existing = Array.from(implementations)[0];
            context.report({
              node,
              messageId: 'duplicateProvider',
              data: {
                name,
                existing,
                suggestion,
              },
            });
          }

          implementations.add(name);
          break;
        }
      }
    }

    return {
      // Check function/class declarations
      FunctionDeclaration(node) {
        if (node.id?.name) {
          checkForMultipleImplementations(node.id.name, node);
        }
      },

      ClassDeclaration(node) {
        if (node.id?.name) {
          checkForMultipleImplementations(node.id.name, node);
        }
      },

      // Check variable declarations
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier') {
          checkForMultipleImplementations(node.id.name, node);
        }
      },

      // Check imports if enabled
      ImportDeclaration(node) {
        if (!options.checkImports) return;

        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier' ||
              specifier.type === 'ImportDefaultSpecifier') {
            const importedName = specifier.local.name;
            checkForMultipleImplementations(importedName, specifier);
          }
        }
      },

      // Check exports if enabled
      ExportNamedDeclaration(node) {
        if (!options.checkExports) return;

        if (node.declaration) {
          if (node.declaration.type === 'FunctionDeclaration' ||
              node.declaration.type === 'ClassDeclaration') {
            if (node.declaration.id?.name) {
              checkForMultipleImplementations(node.declaration.id.name, node.declaration);
            }
          } else if (node.declaration.type === 'VariableDeclaration') {
            for (const declarator of node.declaration.declarations) {
              if (declarator.id.type === 'Identifier') {
                checkForMultipleImplementations(declarator.id.name, declarator);
              }
            }
          }
        }
      },

      // Check for Context.Provider usage
      JSXElement(node) {
        if (node.openingElement.name.type === 'JSXMemberExpression') {
          const object = node.openingElement.name.object;
          const property = node.openingElement.name.property;

          if (object.type === 'JSXIdentifier' && property.type === 'JSXIdentifier' &&
              property.name === 'Provider') {
            checkForMultipleImplementations(object.name, node);
          }
        }
      },

      // Report summary at the end of file
      'Program:exit'() {
        for (const [category, implementations] of detectedImplementations.entries()) {
          if (implementations.size > 1) {
            const pattern = implementationPatterns.find(p => p.category === category);
            if (pattern) {
              context.report({
                node: context.getSourceCode().ast,
                messageId: 'multipleImplementations',
                data: {
                  category,
                  suggestion: pattern.suggestion,
                },
              });
            }
          }
        }
      },
    };
  },
});

export default rule;
