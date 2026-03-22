export type {
  Position,
  Span,
  ValueNode,
  StringNode,
  RawStringNode,
  IntegerNode,
  FloatNode,
  BooleanNode,
  NullNode,
  ObjectNode,
  ArrayNode,
  Element,
  IdentifierKey,
  KeyNode,
  Property,
  CommentNode,
  Document,
} from './types.js'
export { parse } from './parse.js'
export { print } from './print.js'
export type { PrintOptions, PrintColors } from './print.js'

import type { ValueNode, Document } from './types.js'

export function toValue(node: ValueNode | Document): any {
  if (node.type === 'Document') return toValue(node.value)
  switch (node.type) {
    case 'String':
    case 'RawString':
    case 'Integer':
    case 'Float':
    case 'Boolean':
      return node.value
    case 'Null':
      return null
    case 'Array':
      return node.elements.map((el) => toValue(el.value))
    case 'Object': {
      const obj: Record<string, any> = {}
      for (const prop of node.properties) {
        obj[prop.key.value] = toValue(prop.value)
      }
      return obj
    }
  }
}
