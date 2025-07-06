import { TSESTree } from '@typescript-eslint/utils';
export interface ComponentInfo {
    name: string;
    filePath: string;
    node: TSESTree.Node;
    type: 'function' | 'class' | 'arrow' | 'forwardRef';
}
export declare function isReactComponent(name: string): boolean;
export declare function extractComponentName(node: TSESTree.Node): string | null;
export declare function getComponentType(node: TSESTree.Node): ComponentInfo['type'] | null;
export declare function normalizeComponentName(name: string): string;
export declare function getRelativeFilePath(filePath: string, projectRoot: string): string;
export declare function isTestFile(filePath: string): boolean;
export declare function isDemoFile(filePath: string): boolean;
