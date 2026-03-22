import type { ValueNode, Document, CommentNode } from './types.js'

export function print(node: ValueNode | Document): string {
  if (node.type === 'Document') {
    let out = ''
    for (const c of node.leadingComments) {
      out += '#' + c.value + '\n'
    }
    out += doPrint(node.value, 0)
    for (const c of node.trailingComments) {
      out += ' #' + c.value
    }
    return out
  }
  return doPrint(node, 0)
}

function printComments(comments: CommentNode[], indent: string): string {
  let out = ''
  for (const c of comments) {
    out += indent + '#' + c.value + '\n'
  }
  return out
}

function doPrint(node: ValueNode, level: number): string {
  switch (node.type) {
    case 'String':
      return JSON.stringify(node.value)

    case 'RawString':
      return node.raw

    case 'Integer':
    case 'Float':
      return node.raw

    case 'Boolean':
      return `${node.value}`

    case 'Null':
      return 'null'

    case 'Array': {
      const len = node.elements.length
      const hasComments = node.innerComments.length > 0
      if (len === 0 && !hasComments) return '[]'

      const childIndent = getIndent(level + 1)
      const parentIndent = getIndent(level)

      // Collect all items with their offsets for interleaving comments
      let out = '[\n'

      // Build a list of elements and comments, sorted by position
      const items: {
        offset: number
        kind: 'element' | 'comment'
        el?: ValueNode
        comment?: CommentNode
      }[] = []
      for (const el of node.elements) {
        items.push({ offset: el.span.start.offset, kind: 'element', el })
      }
      for (const c of node.innerComments) {
        items.push({ offset: c.span.start.offset, kind: 'comment', comment: c })
      }
      items.sort((a, b) => a.offset - b.offset)

      let first = true
      for (const item of items) {
        if (!first) out += '\n'
        first = false
        if (item.kind === 'element') {
          out += childIndent + doPrint(item.el!, level + 1)
        } else {
          out += childIndent + '#' + item.comment!.value
        }
      }
      return out + '\n' + parentIndent + ']'
    }

    case 'Object': {
      const len = node.properties.length
      const hasComments = node.innerComments.length > 0
      if (len === 0 && !hasComments) return '{}'

      const childIndent = getIndent(level + 1)
      const parentIndent = getIndent(level)
      let out = '{\n'

      for (let i = 0; i < len; i++) {
        const prop = node.properties[i]

        // Leading comments for this property
        out += printComments(prop.leadingComments, childIndent)

        if (i > 0 && prop.leadingComments.length === 0) out += '\n'

        const keyStr =
          prop.key.type === 'Identifier'
            ? prop.key.value
            : JSON.stringify(prop.key.value)
        out += childIndent + keyStr + ': ' + doPrint(prop.value, level + 1)

        // Trailing comment for this property
        if (prop.trailingComment) {
          out += ' #' + prop.trailingComment.value
        }
      }

      // Inner comments (after last property)
      if (node.innerComments.length > 0) {
        out += '\n'
        out += printComments(node.innerComments, childIndent)
        // Remove last newline since we add one before ]
        out = out.replace(/\n$/, '')
      }

      return out + '\n' + parentIndent + '}'
    }
  }
}

function getIndent(level: number) {
  return ' '.repeat(2 * level)
}
