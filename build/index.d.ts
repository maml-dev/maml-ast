export type { Position, Span, ValueNode, StringNode, RawStringNode, IntegerNode, FloatNode, BooleanNode, NullNode, ObjectNode, ArrayNode, IdentifierKey, KeyNode, Property, CommentNode, Document, } from './types.js';
export { parse } from './parse.js';
export { print } from './print.js';
export type { PrintOptions, PrintColors } from './print.js';
import type { ValueNode, Document } from './types.js';
export declare function toValue(node: ValueNode | Document): any;
