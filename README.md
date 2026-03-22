# maml-ast

AST parser for the [MAML](https://maml.dev) data format. Produces a full abstract syntax tree with node types, source
positions, and comment preservation — designed for building formatters, linters, codemods, and editor tooling.

For a simpler parser that returns plain JavaScript values, see [maml.js](https://github.com/maml-dev/maml.js).

- Full AST with discriminated union node types
- Source positions (offset, line, column) on every node
- Comments preserved and attached to nodes
- `print()` reconstructs source from AST, including comments
- Zero dependencies, ESM first
- Works in Node.js, Deno, Bun and browsers

## Installation

```
npm install maml-ast
```

## Usage

### Parsing

```ts
import { parse, print, toValue } from 'maml-ast'

const doc = parse(`{
  # Database config
  host: "localhost"
  port: 5432
}`)
```

### Printing

`print()` reconstructs MAML source from an AST, preserving comments:

```ts
print(doc)
// {
//   # Database config
//   host: "localhost"
//   port: 5432
// }
```

### Converting to plain values

`toValue()` strips AST metadata and returns plain JavaScript values:

```ts
toValue(doc)  // { host: 'localhost', port: 5432 }
```

## AST Node Types

Every node has a `type` discriminant and a `span` with start/end positions.

| Node Type  | `type`        | `value`            | `raw` |
|------------|---------------|--------------------|-------|
| String     | `'String'`    | `string`           | yes   |
| Raw String | `'RawString'` | `string`           | yes   |
| Integer    | `'Integer'`   | `number \| bigint` | yes   |
| Float      | `'Float'`     | `number`           | yes   |
| Boolean    | `'Boolean'`   | `boolean`          | —     |
| Null       | `'Null'`      | `null`             | —     |
| Object     | `'Object'`    | `properties`       | —     |
| Array      | `'Array'`     | `elements`         | —     |

### Keys

Object keys are either `IdentifierKey` (`type: 'Identifier'`) for bare keys like `foo`, or `StringNode` (
`type: 'String'`) for quoted keys like `"foo bar"`.

### Comments

Comments are attached to the nearest node:

- **`Property.leadingComments`** — comments on lines before the property
- **`Property.trailingComment`** — comment on the same line after the value
- **`ObjectNode.innerComments`** / **`ArrayNode.innerComments`** — comments inside an empty container or after the last
  entry
- **`Document.leadingComments`** / **`Document.trailingComments`** — comments before/after the root value

### Document

`parse()` returns a `Document` node wrapping the root value:

```ts
interface Document {
  type: 'Document'
  value: ValueNode
  leadingComments: CommentNode[]
  trailingComments: CommentNode[]
  span: Span
}
```

## License

[MIT](LICENSE)
