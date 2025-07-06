"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const path_1 = __importDefault(require("path"));
const createRule = utils_1.ESLintUtils.RuleCreator(name => `https://github.com/6fb-booking/eslint-plugin-6fb/blob/main/docs/rules/${name}.md`);
const rule = createRule({
    name: 'single-source-of-truth',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce single source of truth for key components',
        },
        messages: {
            multipleExports: 'Component "{{name}}" is exported from multiple locations: {{locations}}. Use a single export source.',
            reExport: 'Component "{{name}}" is re-exported here. Import from the original source: {{source}}',
            inconsistentImport: 'Component "{{name}}" should be imported from {{canonical}} instead of {{current}}',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    keyComponents: {
                        type: 'array',
                        items: { type: 'string' },
                        default: [],
                    },
                    canonicalPaths: {
                        type: 'object',
                        additionalProperties: { type: 'string' },
                        default: {},
                    },
                    checkAllComponents: {
                        type: 'boolean',
                        default: false,
                    },
                    allowBarrelExports: {
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
            keyComponents: [
                'AuthProvider',
                'ThemeProvider',
                'AppRouter',
                'Layout',
                'Header',
                'Footer',
                'Navigation',
                'Calendar',
                'PaymentForm',
                'BookingForm',
                'Dashboard',
            ],
            canonicalPaths: {
                AuthProvider: 'src/providers/AuthProvider',
                ThemeProvider: 'src/providers/ThemeProvider',
                Layout: 'src/components/Layout',
                Calendar: 'src/components/Calendar',
            },
            checkAllComponents: false,
            allowBarrelExports: true,
        },
    ],
    create(context) {
        const options = context.options[0];
        const filename = context.getFilename();
        const sourceCode = context.getSourceCode();
        // Track component sources
        const componentSources = new Map();
        function isKeyComponent(name) {
            return options.checkAllComponents || options.keyComponents.includes(name);
        }
        function getCanonicalPath(componentName) {
            return options.canonicalPaths[componentName] || null;
        }
        function isBarrelFile(filePath) {
            const basename = path_1.default.basename(filePath, path_1.default.extname(filePath));
            return basename === 'index';
        }
        function trackComponentSource(name, isExported, importedFrom) {
            if (!isKeyComponent(name))
                return;
            const source = {
                name,
                path: filename,
                isExported,
                importedFrom,
            };
            if (!componentSources.has(name)) {
                componentSources.set(name, []);
            }
            componentSources.get(name).push(source);
        }
        return {
            // Track exports
            ExportNamedDeclaration(node) {
                if (node.declaration) {
                    // export function Component() {}
                    if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
                        trackComponentSource(node.declaration.id.name, true);
                    }
                    // export class Component {}
                    else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
                        trackComponentSource(node.declaration.id.name, true);
                    }
                    // export const Component = ...
                    else if (node.declaration.type === 'VariableDeclaration') {
                        for (const declarator of node.declaration.declarations) {
                            if (declarator.id.type === 'Identifier') {
                                trackComponentSource(declarator.id.name, true);
                            }
                        }
                    }
                }
                else if (node.specifiers) {
                    // export { Component } from './Component'
                    for (const specifier of node.specifiers) {
                        if (specifier.type === 'ExportSpecifier') {
                            const exportedName = specifier.exported.type === 'Identifier'
                                ? specifier.exported.name
                                : specifier.local.name;
                            trackComponentSource(exportedName, true, node.source?.value);
                        }
                    }
                }
            },
            ExportDefaultDeclaration(node) {
                // export default Component
                if (node.declaration.type === 'Identifier') {
                    trackComponentSource(node.declaration.name, true);
                }
            },
            // Track imports and check canonical paths
            ImportDeclaration(node) {
                const importPath = node.source.value;
                for (const specifier of node.specifiers) {
                    if (specifier.type === 'ImportSpecifier' ||
                        specifier.type === 'ImportDefaultSpecifier') {
                        const importedName = specifier.local.name;
                        if (isKeyComponent(importedName)) {
                            const canonicalPath = getCanonicalPath(importedName);
                            if (canonicalPath) {
                                // Check if import is from canonical path
                                const normalizedImport = importPath.replace(/^\.\//, '').replace(/\.(js|jsx|ts|tsx)$/, '');
                                const normalizedCanonical = canonicalPath.replace(/^\.\//, '').replace(/\.(js|jsx|ts|tsx)$/, '');
                                if (!normalizedImport.endsWith(normalizedCanonical) &&
                                    !normalizedImport.endsWith(normalizedCanonical + '/index')) {
                                    context.report({
                                        node: specifier,
                                        messageId: 'inconsistentImport',
                                        data: {
                                            name: importedName,
                                            canonical: canonicalPath,
                                            current: importPath,
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
            },
            // Check for multiple exports at the end
            'Program:exit'() {
                for (const [componentName, sources] of componentSources.entries()) {
                    const exportSources = sources.filter(s => s.isExported);
                    if (exportSources.length > 1) {
                        // Check if any are barrel exports
                        const nonBarrelExports = options.allowBarrelExports
                            ? exportSources.filter(s => !isBarrelFile(s.path))
                            : exportSources;
                        if (nonBarrelExports.length > 1) {
                            const locations = nonBarrelExports.map(s => path_1.default.relative(process.cwd(), s.path)).join(', ');
                            // Report on all export locations
                            for (const source of nonBarrelExports) {
                                if (source.path === filename) {
                                    context.report({
                                        node: sourceCode.ast,
                                        messageId: 'multipleExports',
                                        data: {
                                            name: componentName,
                                            locations,
                                        },
                                    });
                                }
                            }
                        }
                    }
                    // Check for re-exports
                    const reExports = sources.filter(s => s.isExported && s.importedFrom);
                    if (reExports.length > 0 && !options.allowBarrelExports) {
                        for (const reExport of reExports) {
                            if (reExport.path === filename) {
                                context.report({
                                    node: sourceCode.ast,
                                    messageId: 'reExport',
                                    data: {
                                        name: componentName,
                                        source: reExport.importedFrom || 'original source',
                                    },
                                });
                            }
                        }
                    }
                }
            },
        };
    },
});
exports.default = rule;
