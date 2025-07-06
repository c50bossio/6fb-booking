import { ESLintUtils } from '@typescript-eslint/utils';
declare const rule: ESLintUtils.RuleModule<"duplicateCode" | "similarPattern", [{
    minLines: number;
    threshold: number;
    ignoreComments: boolean;
    ignoreImports: boolean;
    ignoreExports: boolean;
    checkAcrossFiles: boolean;
}], ESLintUtils.RuleListener>;
export default rule;
