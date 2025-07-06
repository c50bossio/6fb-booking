"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const crypto_1 = __importDefault(require("crypto"));
const createRule = utils_1.ESLintUtils.RuleCreator(name => `https://github.com/6fb-booking/eslint-plugin-6fb/blob/main/docs/rules/${name}.md`);
const rule = createRule({
    name: 'no-copy-paste-code',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Detect and flag copy-paste code patterns',
        },
        messages: {
            duplicateCode: 'This code block appears to be duplicated from {{location}}. Consider extracting to a shared function.',
            similarPattern: 'This code pattern is very similar to {{location}}. Consider refactoring to reduce duplication.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    minLines: {
                        type: 'number',
                        default: 5,
                    },
                    threshold: {
                        type: 'number',
                        default: 0.8,
                        minimum: 0,
                        maximum: 1,
                    },
                    ignoreComments: {
                        type: 'boolean',
                        default: true,
                    },
                    ignoreImports: {
                        type: 'boolean',
                        default: true,
                    },
                    ignoreExports: {
                        type: 'boolean',
                        default: true,
                    },
                    checkAcrossFiles: {
                        type: 'boolean',
                        default: false,
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [
        {
            minLines: 5,
            threshold: 0.8,
            ignoreComments: true,
            ignoreImports: true,
            ignoreExports: true,
            checkAcrossFiles: false,
        },
    ],
    create(context) {
        const options = context.options[0];
        const sourceCode = context.getSourceCode();
        const codeBlocks = [];
        function shouldIgnoreNode(node) {
            if (options.ignoreImports &&
                (node.type === 'ImportDeclaration' ||
                    node.type === 'ImportSpecifier')) {
                return true;
            }
            if (options.ignoreExports &&
                (node.type === 'ExportNamedDeclaration' ||
                    node.type === 'ExportDefaultDeclaration' ||
                    node.type === 'ExportAllDeclaration')) {
                return true;
            }
            return false;
        }
        function normalizeCode(text) {
            let normalized = text;
            // Remove comments if ignoring
            if (options.ignoreComments) {
                normalized = normalized
                    .replace(/\/\/.*$/gm, '') // Single-line comments
                    .replace(/\/\*[\s\S]*?\*\//g, '') // Multi-line comments
                    .replace(/^\s*\*.*$/gm, ''); // JSDoc style comments
            }
            // Normalize whitespace
            normalized = normalized
                .replace(/\s+/g, ' ') // Multiple spaces to single space
                .replace(/\s*([{}()[\],;:])\s*/g, '$1') // Remove spaces around punctuation
                .trim();
            return normalized;
        }
        function calculateHash(text) {
            const normalized = normalizeCode(text);
            return crypto_1.default.createHash('md5').update(normalized).digest('hex');
        }
        function calculateSimilarity(text1, text2) {
            const normalized1 = normalizeCode(text1);
            const normalized2 = normalizeCode(text2);
            // Simple character-based similarity
            const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
            const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
            let matches = 0;
            for (let i = 0; i < shorter.length; i++) {
                if (shorter[i] === longer[i]) {
                    matches++;
                }
            }
            return matches / longer.length;
        }
        function getNodeLocation(node) {
            const loc = node.loc;
            if (loc) {
                return `line ${loc.start.line}:${loc.start.column}`;
            }
            return 'unknown location';
        }
        function checkCodeBlock(node) {
            if (shouldIgnoreNode(node))
                return;
            const text = sourceCode.getText(node);
            const lines = text.split('\n').length;
            if (lines < options.minLines)
                return;
            const hash = calculateHash(text);
            const location = getNodeLocation(node);
            // Check for exact duplicates
            const exactDuplicate = codeBlocks.find(block => block.hash === hash);
            if (exactDuplicate) {
                context.report({
                    node,
                    messageId: 'duplicateCode',
                    data: {
                        location: exactDuplicate.location,
                    },
                });
                return;
            }
            // Check for similar patterns
            for (const block of codeBlocks) {
                const similarity = calculateSimilarity(text, block.text);
                if (similarity >= options.threshold) {
                    context.report({
                        node,
                        messageId: 'similarPattern',
                        data: {
                            location: block.location,
                        },
                    });
                    break;
                }
            }
            // Add to tracked blocks
            codeBlocks.push({
                hash,
                node,
                text,
                location,
            });
        }
        return {
            // Check function bodies
            FunctionDeclaration(node) {
                if (node.body) {
                    checkCodeBlock(node.body);
                }
            },
            FunctionExpression(node) {
                if (node.body) {
                    checkCodeBlock(node.body);
                }
            },
            ArrowFunctionExpression(node) {
                if (node.body.type === 'BlockStatement') {
                    checkCodeBlock(node.body);
                }
            },
            // Check class methods
            MethodDefinition(node) {
                if (node.value.body) {
                    checkCodeBlock(node.value.body);
                }
            },
            // Check conditional blocks
            IfStatement(node) {
                checkCodeBlock(node.consequent);
                if (node.alternate) {
                    checkCodeBlock(node.alternate);
                }
            },
            // Check loop bodies
            ForStatement(node) {
                checkCodeBlock(node.body);
            },
            WhileStatement(node) {
                checkCodeBlock(node.body);
            },
            DoWhileStatement(node) {
                checkCodeBlock(node.body);
            },
            // Check switch cases
            SwitchCase(node) {
                if (node.consequent.length >= options.minLines) {
                    checkCodeBlock(node);
                }
            },
            // Check try-catch blocks
            TryStatement(node) {
                checkCodeBlock(node.block);
                if (node.handler) {
                    checkCodeBlock(node.handler.body);
                }
                if (node.finalizer) {
                    checkCodeBlock(node.finalizer);
                }
            },
            // Check JSX render methods
            JSXElement(node) {
                const jsxText = sourceCode.getText(node);
                const lines = jsxText.split('\n').length;
                if (lines >= options.minLines) {
                    checkCodeBlock(node);
                }
            },
        };
    },
});
exports.default = rule;
