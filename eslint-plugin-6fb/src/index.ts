import noDuplicateComponentNames from './rules/no-duplicate-component-names';
import noPrefixedComponents from './rules/no-prefixed-components';
import noMultipleImplementations from './rules/no-multiple-implementations';
import singleSourceOfTruth from './rules/single-source-of-truth';
import limitDirectoryComponents from './rules/limit-directory-components';
import noCopyPasteCode from './rules/no-copy-paste-code';

const rules = {
  'no-duplicate-component-names': noDuplicateComponentNames,
  'no-prefixed-components': noPrefixedComponents,
  'no-multiple-implementations': noMultipleImplementations,
  'single-source-of-truth': singleSourceOfTruth,
  'limit-directory-components': limitDirectoryComponents,
  'no-copy-paste-code': noCopyPasteCode,
};

const configs = {
  recommended: {
    plugins: ['6fb'],
    rules: {
      '6fb/no-duplicate-component-names': 'error',
      '6fb/no-prefixed-components': 'error',
      '6fb/no-multiple-implementations': 'error',
      '6fb/single-source-of-truth': 'error',
      '6fb/limit-directory-components': ['warn', { max: 10 }],
      '6fb/no-copy-paste-code': 'warn',
    },
  },
  strict: {
    plugins: ['6fb'],
    rules: {
      '6fb/no-duplicate-component-names': 'error',
      '6fb/no-prefixed-components': 'error',
      '6fb/no-multiple-implementations': 'error',
      '6fb/single-source-of-truth': 'error',
      '6fb/limit-directory-components': ['error', { max: 5 }],
      '6fb/no-copy-paste-code': 'error',
    },
  },
};

export = { rules, configs };
