import { ESLintUtils } from '@typescript-eslint/utils';
declare const rule: ESLintUtils.RuleModule<"tooManyComponents" | "suggestReorganization", [{
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
}], ESLintUtils.RuleListener>;
export default rule;
