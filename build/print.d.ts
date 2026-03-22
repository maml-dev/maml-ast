import type { ValueNode, Document } from './types.js';
type ColorFn = (s: string) => string;
export interface PrintColors {
    string?: ColorFn;
    number?: ColorFn;
    boolean?: ColorFn;
    null?: ColorFn;
    key?: ColorFn;
    comment?: ColorFn;
    bracket?: ColorFn;
    colon?: ColorFn;
}
export interface PrintOptions {
    colors?: PrintColors;
}
export declare function print(node: ValueNode | Document, options?: PrintOptions): string;
export {};
