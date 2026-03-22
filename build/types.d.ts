export interface Position {
    offset: number;
    line: number;
    column: number;
}
export interface Span {
    start: Position;
    end: Position;
}
export interface StringNode {
    type: 'String';
    value: string;
    raw: string;
    span: Span;
}
export interface RawStringNode {
    type: 'RawString';
    value: string;
    raw: string;
    span: Span;
}
export interface IntegerNode {
    type: 'Integer';
    value: number | bigint;
    raw: string;
    span: Span;
}
export interface FloatNode {
    type: 'Float';
    value: number;
    raw: string;
    span: Span;
}
export interface BooleanNode {
    type: 'Boolean';
    value: boolean;
    span: Span;
}
export interface NullNode {
    type: 'Null';
    value: null;
    span: Span;
}
export interface IdentifierKey {
    type: 'Identifier';
    value: string;
    span: Span;
}
export type KeyNode = IdentifierKey | StringNode;
export interface CommentNode {
    type: 'Comment';
    value: string;
    span: Span;
}
export interface Property {
    key: KeyNode;
    value: ValueNode;
    span: Span;
    leadingComments: CommentNode[];
    trailingComment: CommentNode | null;
    emptyLineBefore: boolean;
}
export interface ObjectNode {
    type: 'Object';
    properties: Property[];
    span: Span;
    danglingComments: CommentNode[];
}
export interface Element {
    value: ValueNode;
    leadingComments: CommentNode[];
    trailingComment: CommentNode | null;
    emptyLineBefore: boolean;
}
export interface ArrayNode {
    type: 'Array';
    elements: Element[];
    span: Span;
    danglingComments: CommentNode[];
}
export type ValueNode = StringNode | RawStringNode | IntegerNode | FloatNode | BooleanNode | NullNode | ObjectNode | ArrayNode;
export interface Document {
    type: 'Document';
    value: ValueNode;
    leadingComments: CommentNode[];
    trailingComments: CommentNode[];
    span: Span;
}
