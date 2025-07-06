"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const component_utils_1 = require("../utils/component-utils");
const createRule = utils_1.ESLintUtils.RuleCreator(name => `https://github.com/6fb-booking/eslint-plugin-6fb/blob/main/docs/rules/${name}.md`);
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
        if ((0, component_utils_1.isTestFile)(filename) || (0, component_utils_1.isDemoFile)(filename)) {
            return {};
        }
        // Check if file matches exclude patterns
        if (options.excludePatterns.some((pattern) => new RegExp(pattern).test(filename))) {
            return {};
        }
        // Global registry to track all components across files
        // In a real implementation, this would be shared across files
        const componentRegistry = {};
        function checkForDuplicates(node, componentName) {
            const normalizedName = options.ignoreCase ? componentName.toLowerCase() : componentName;
            const currentFile = (0, component_utils_1.getRelativeFilePath)(filename, process.cwd());
            // Check for exact duplicates
            if (componentRegistry[normalizedName]) {
                const duplicates = componentRegistry[normalizedName].filter(comp => comp.filePath !== currentFile);
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
                const normalized = (0, component_utils_1.normalizeComponentName)(componentName);
                Object.entries(componentRegistry).forEach(([registeredName, components]) => {
                    const registeredNormalized = (0, component_utils_1.normalizeComponentName)(registeredName);
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
                type: (0, component_utils_1.getComponentType)(node) || 'function',
            });
        }
        return {
            FunctionDeclaration(node) {
                const name = (0, component_utils_1.extractComponentName)(node);
                if (name && (0, component_utils_1.isReactComponent)(name)) {
                    checkForDuplicates(node, name);
                }
            },
            VariableDeclarator(node) {
                const name = (0, component_utils_1.extractComponentName)(node);
                if (name && (0, component_utils_1.isReactComponent)(name)) {
                    checkForDuplicates(node, name);
                }
            },
            ClassDeclaration(node) {
                const name = (0, component_utils_1.extractComponentName)(node);
                if (name && (0, component_utils_1.isReactComponent)(name)) {
                    checkForDuplicates(node, name);
                }
            },
            ExportDefaultDeclaration(node) {
                const name = (0, component_utils_1.extractComponentName)(node);
                if (name && (0, component_utils_1.isReactComponent)(name)) {
                    checkForDuplicates(node, name);
                }
            },
        };
    },
});
exports.default = rule;
