import { TSESTree } from '@typescript-eslint/utils';
import path from 'path';

export interface ComponentInfo {
  name: string;
  filePath: string;
  node: TSESTree.Node;
  type: 'function' | 'class' | 'arrow' | 'forwardRef';
}

export function isReactComponent(name: string): boolean {
  // React components start with uppercase letter
  return /^[A-Z]/.test(name);
}

export function extractComponentName(node: TSESTree.Node): string | null {
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

export function getComponentType(node: TSESTree.Node): ComponentInfo['type'] | null {
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

export function normalizeComponentName(name: string): string {
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

export function getRelativeFilePath(filePath: string, projectRoot: string): string {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

export function isTestFile(filePath: string): boolean {
  const testPatterns = [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /__tests__/,
    /test-/,
    /-test/,
  ];

  return testPatterns.some(pattern => pattern.test(filePath));
}

export function isDemoFile(filePath: string): boolean {
  const demoPatterns = [
    /\.demo\.[jt]sx?$/,
    /demo-/,
    /-demo/,
    /\/demos?\//,
  ];

  return demoPatterns.some(pattern => pattern.test(filePath));
}
