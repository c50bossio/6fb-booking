/**
 * ESLint rule: no-cross-package-imports
 * Prevents packages from importing each other in ways that violate clean architecture
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce clean architecture by preventing invalid cross-package imports',
      category: 'Architecture',
      recommended: true
    },
    fixable: null,
    schema: []
  },

  create(context) {
    const allowedImports = {
      '@6fb/core': ['@6fb/core'], // Core can only import from itself
      '@6fb/api': ['@6fb/core'], // API can import from core
      '@6fb/web': ['@6fb/core', '@6fb/ui'], // Web can import from core and ui
      '@6fb/ui': ['@6fb/core'], // UI can import from core
      '@6fb/mobile': ['@6fb/core', '@6fb/ui'] // Mobile can import from core and ui
    };

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const currentPackage = getCurrentPackage(context.getFilename());

        if (!currentPackage || !importPath.startsWith('@6fb/')) {
          return;
        }

        const importedPackage = importPath.split('/')[0];
        const allowed = allowedImports[currentPackage] || [];

        if (!allowed.includes(importedPackage) && importedPackage !== currentPackage) {
          context.report({
            node,
            message: `Package '${currentPackage}' cannot import from '${importedPackage}'. Allowed imports: ${allowed.join(', ')}`
          });
        }
      }
    };
  }
};

function getCurrentPackage(filename) {
  const match = filename.match(/packages\/(core|api|web|ui|mobile)/);
  if (match) {
    return `@6fb/${match[1]}`;
  }
  return null;
}
