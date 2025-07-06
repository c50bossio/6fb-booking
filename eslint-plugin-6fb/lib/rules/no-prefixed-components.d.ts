import { ESLintUtils } from '@typescript-eslint/utils';
declare const rule: ESLintUtils.RuleModule<"forbiddenPrefix", [{
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
}], ESLintUtils.RuleListener>;
export default rule;
