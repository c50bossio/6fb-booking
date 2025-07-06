import { ESLintUtils } from '@typescript-eslint/utils';
declare const rule: ESLintUtils.RuleModule<"multipleImplementations" | "duplicateProvider", [{
    patterns: {
        pattern: string;
        category: string;
        suggestion: string;
    }[];
    checkImports: boolean;
    checkExports: boolean;
}], ESLintUtils.RuleListener>;
export default rule;
