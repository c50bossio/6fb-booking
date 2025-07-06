declare const _default: {
    rules: {
        'no-duplicate-component-names': import("@typescript-eslint/utils/ts-eslint").RuleModule<"duplicateComponent" | "similarComponent", [{
            ignoreCase: boolean;
            checkSimilarNames: boolean;
            excludePatterns: never[];
        }], import("@typescript-eslint/utils/ts-eslint").RuleListener>;
        'no-prefixed-components': import("@typescript-eslint/utils/ts-eslint").RuleModule<"forbiddenPrefix", [{
            forbiddenPrefixes: string[];
            allowInTests: boolean;
            allowInDemos: boolean;
            suggestions: {
                Enhanced: string;
                Simple: string;
                Demo: string;
                Test: string;
                Mock: string;
                Temp: string;
                Old: string;
                New: string;
            };
        }], import("@typescript-eslint/utils/ts-eslint").RuleListener>;
        'no-multiple-implementations': import("@typescript-eslint/utils/ts-eslint").RuleModule<"multipleImplementations" | "duplicateProvider", [{
            patterns: {
                pattern: string;
                category: string;
                suggestion: string;
            }[];
            checkImports: boolean;
            checkExports: boolean;
        }], import("@typescript-eslint/utils/ts-eslint").RuleListener>;
        'single-source-of-truth': import("@typescript-eslint/utils/ts-eslint").RuleModule<"multipleExports" | "reExport" | "inconsistentImport", [{
            keyComponents: string[];
            canonicalPaths: {
                AuthProvider: string;
                ThemeProvider: string;
                Layout: string;
                Calendar: string;
            };
            checkAllComponents: boolean;
            allowBarrelExports: boolean;
        }], import("@typescript-eslint/utils/ts-eslint").RuleListener>;
        'limit-directory-components': import("@typescript-eslint/utils/ts-eslint").RuleModule<"tooManyComponents" | "suggestReorganization", [{
            max: number;
            directories: {
                'src/components': number;
                'src/components/modals': number;
                'src/components/forms': number;
                'src/pages': number;
                'src/features': number;
            };
            exclude: string[];
            countOnlyExported: boolean;
        }], import("@typescript-eslint/utils/ts-eslint").RuleListener>;
        'no-copy-paste-code': import("@typescript-eslint/utils/ts-eslint").RuleModule<"duplicateCode" | "similarPattern", [{
            minLines: number;
            threshold: number;
            ignoreComments: boolean;
            ignoreImports: boolean;
            ignoreExports: boolean;
            checkAcrossFiles: boolean;
        }], import("@typescript-eslint/utils/ts-eslint").RuleListener>;
    };
    configs: {
        recommended: {
            plugins: string[];
            rules: {
                '6fb/no-duplicate-component-names': string;
                '6fb/no-prefixed-components': string;
                '6fb/no-multiple-implementations': string;
                '6fb/single-source-of-truth': string;
                '6fb/limit-directory-components': (string | {
                    max: number;
                })[];
                '6fb/no-copy-paste-code': string;
            };
        };
        strict: {
            plugins: string[];
            rules: {
                '6fb/no-duplicate-component-names': string;
                '6fb/no-prefixed-components': string;
                '6fb/no-multiple-implementations': string;
                '6fb/single-source-of-truth': string;
                '6fb/limit-directory-components': (string | {
                    max: number;
                })[];
                '6fb/no-copy-paste-code': string;
            };
        };
    };
};
export = _default;
