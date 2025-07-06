import { ESLintUtils } from '@typescript-eslint/utils';
declare const rule: ESLintUtils.RuleModule<"duplicateComponent" | "similarComponent", [{
    ignoreCase: boolean;
    checkSimilarNames: boolean;
    excludePatterns: never[];
}], ESLintUtils.RuleListener>;
export default rule;
