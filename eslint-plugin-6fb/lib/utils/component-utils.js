"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReactComponent = isReactComponent;
exports.extractComponentName = extractComponentName;
exports.getComponentType = getComponentType;
exports.normalizeComponentName = normalizeComponentName;
exports.getRelativeFilePath = getRelativeFilePath;
exports.isTestFile = isTestFile;
exports.isDemoFile = isDemoFile;
const path_1 = __importDefault(require("path"));
function isReactComponent(name) {
    // React components start with uppercase letter
    return /^[A-Z]/.test(name);
}
function extractComponentName(node) {
    switch (node.type) {
        case 'FunctionDeclaration':
            return node.id?.name || null;
        case 'VariableDeclarator':
            if (node.id.type === 'Identifier' && node.init) {
                // Arrow function component
                if (node.init.type === 'ArrowFunctionExpression') {
                    return node.id.name;
                }
                // forwardRef component
                if (node.init.type === 'CallExpression' &&
                    node.init.callee.type === 'Identifier' &&
                    node.init.callee.name === 'forwardRef') {
                    return node.id.name;
                }
            }
            return null;
        case 'ClassDeclaration':
            return node.id?.name || null;
        case 'ExportDefaultDeclaration':
            if (node.declaration.type === 'FunctionDeclaration' ||
                node.declaration.type === 'ClassDeclaration') {
                return extractComponentName(node.declaration);
            }
            return null;
        default:
            return null;
    }
}
function getComponentType(node) {
    switch (node.type) {
        case 'FunctionDeclaration':
            return 'function';
        case 'ClassDeclaration':
            return 'class';
        case 'VariableDeclarator':
            if (node.init?.type === 'ArrowFunctionExpression') {
                return 'arrow';
            }
            if (node.init?.type === 'CallExpression' &&
                node.init.callee.type === 'Identifier' &&
                node.init.callee.name === 'forwardRef') {
                return 'forwardRef';
            }
            return null;
        default:
            return null;
    }
}
function normalizeComponentName(name) {
    // Remove common prefixes and suffixes for comparison
    const prefixes = ['Enhanced', 'Simple', 'Demo', 'Test', 'Mock', 'Base', 'Default'];
    const suffixes = ['Component', 'Container', 'Wrapper', 'Provider'];
    let normalized = name;
    // Remove prefixes
    for (const prefix of prefixes) {
        if (normalized.startsWith(prefix)) {
            normalized = normalized.slice(prefix.length);
            break;
        }
    }
    // Remove suffixes
    for (const suffix of suffixes) {
        if (normalized.endsWith(suffix)) {
            normalized = normalized.slice(0, -suffix.length);
            break;
        }
    }
    return normalized;
}
function getRelativeFilePath(filePath, projectRoot) {
    return path_1.default.relative(projectRoot, filePath).replace(/\\/g, '/');
}
function isTestFile(filePath) {
    const testPatterns = [
        /\.test\.[jt]sx?$/,
        /\.spec\.[jt]sx?$/,
        /__tests__/,
        /test-/,
        /-test/,
    ];
    return testPatterns.some(pattern => pattern.test(filePath));
}
function isDemoFile(filePath) {
    const demoPatterns = [
        /\.demo\.[jt]sx?$/,
        /demo-/,
        /-demo/,
        /\/demos?\//,
    ];
    return demoPatterns.some(pattern => pattern.test(filePath));
}
