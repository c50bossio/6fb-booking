import { ESLintUtils } from '@typescript-eslint/utils';
declare const rule: ESLintUtils.RuleModule<"multipleExports" | "reExport" | "inconsistentImport", [{
    keyComponents: string[];
    canonicalPaths: {
        AuthProvider: string;
        ThemeProvider: string;
        Layout: string;
        Calendar: string;
    };
    checkAllComponents: boolean;
    allowBarrelExports: boolean;
}], ESLintUtils.RuleListener>;
export default rule;
