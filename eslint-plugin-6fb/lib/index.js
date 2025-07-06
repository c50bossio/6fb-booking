"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const no_duplicate_component_names_1 = __importDefault(require("./rules/no-duplicate-component-names"));
const no_prefixed_components_1 = __importDefault(require("./rules/no-prefixed-components"));
const no_multiple_implementations_1 = __importDefault(require("./rules/no-multiple-implementations"));
const single_source_of_truth_1 = __importDefault(require("./rules/single-source-of-truth"));
const limit_directory_components_1 = __importDefault(require("./rules/limit-directory-components"));
const no_copy_paste_code_1 = __importDefault(require("./rules/no-copy-paste-code"));
const rules = {
    'no-duplicate-component-names': no_duplicate_component_names_1.default,
    'no-prefixed-components': no_prefixed_components_1.default,
    'no-multiple-implementations': no_multiple_implementations_1.default,
    'single-source-of-truth': single_source_of_truth_1.default,
    'limit-directory-components': limit_directory_components_1.default,
    'no-copy-paste-code': no_copy_paste_code_1.default,
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
module.exports = { rules, configs };
