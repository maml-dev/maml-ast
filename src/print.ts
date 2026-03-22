import type { ValueNode, Document, CommentNode } from './types.js'

type ColorFn = (s: string) => string

export interface PrintColors {
  string?: ColorFn
  number?: ColorFn
  boolean?: ColorFn
  null?: ColorFn
  key?: ColorFn
  comment?: ColorFn
  bracket?: ColorFn
  colon?: ColorFn
}

export interface PrintOptions {
  colors?: PrintColors
}

export function print(
  node: ValueNode | Document,
  options?: PrintOptions,
): string {
  const colors = options?.colors
  if (node.type === 'Document') {
    let out = ''
    for (const c of node.leadingComments) {
      out += colorize(colors?.comment, '#' + c.value) + '\n'
    }
    out += doPrint(node.value, 0, colors)
    for (const c of node.trailingComments) {
      out += ' ' + colorize(colors?.comment, '#' + c.value)
    }
    return out
  }
  return doPrint(node, 0, colors)
}

function colorize(fn: ColorFn | undefined, s: string): string {
  return fn ? fn(s) : s
}

function printComments(
  comments: CommentNode[],
  indent: string,
  colors?: PrintColors,
): string {
  let out = ''
  for (const c of comments) {
    out += indent + colorize(colors?.comment, '#' + c.value) + '\n'
  }
  return out
}

function doPrint(node: ValueNode, level: number, colors?: PrintColors): string {
  switch (node.type) {
    case 'String':
      return colorize(colors?.string, JSON.stringify(node.value))

    case 'RawString':
      return colorize(colors?.string, node.raw)

    case 'Integer':
    case 'Float':
      return colorize(colors?.number, node.raw)

    case 'Boolean':
      return colorize(colors?.boolean, `${node.value}`)

    case 'Null':
      return colorize(colors?.null, 'null')

    case 'Array': {
      const len = node.elements.length
      const hasComments = node.innerComments.length > 0
      if (len === 0 && !hasComments)
        return colorize(colors?.bracket, '[') + colorize(colors?.bracket, ']')

      const childIndent = getIndent(level + 1)
      const parentIndent = getIndent(level)

      let out = colorize(colors?.bracket, '[') + '\n'

      // Build a list of elements and comments, sorted by position
      const items: {
        offset: number
        kind: 'element' | 'comment'
        el?: ValueNode
        comment?: CommentNode
        elIndex?: number
      }[] = []
      for (let ei = 0; ei < node.elements.length; ei++) {
        const el = node.elements[ei]
        items.push({
          offset: el.span.start.offset,
          kind: 'element',
          el,
          elIndex: ei,
        })
      }
      for (const c of node.innerComments) {
        items.push({
          offset: c.span.start.offset,
          kind: 'comment',
          comment: c,
        })
      }
      items.sort((a, b) => a.offset - b.offset)

      let first = true
      for (const item of items) {
        if (!first) {
          out += '\n'
          if (item.kind === 'element' && node.emptyLinesBefore[item.elIndex!]) {
            out += '\n'
          }
        }
        first = false
        if (item.kind === 'element') {
          out += childIndent + doPrint(item.el!, level + 1, colors)
        } else {
          out +=
            childIndent + colorize(colors?.comment, '#' + item.comment!.value)
        }
      }
      return out + '\n' + parentIndent + colorize(colors?.bracket, ']')
    }

    case 'Object': {
      const len = node.properties.length
      const hasComments = node.innerComments.length > 0
      if (len === 0 && !hasComments)
        return colorize(colors?.bracket, '{') + colorize(colors?.bracket, '}')

      const childIndent = getIndent(level + 1)
      const parentIndent = getIndent(level)
      let out = colorize(colors?.bracket, '{') + '\n'

      for (let i = 0; i < len; i++) {
        const prop = node.properties[i]

        // Leading comments for this property
        if (i > 0) {
          out += '\n'
          if (prop.emptyLineBefore) out += '\n'
        }
        out += printComments(prop.leadingComments, childIndent, colors)

        const keyStr =
          prop.key.type === 'Identifier'
            ? prop.key.value
            : JSON.stringify(prop.key.value)
        out +=
          childIndent +
          colorize(colors?.key, keyStr) +
          colorize(colors?.colon, ':') +
          ' ' +
          doPrint(prop.value, level + 1, colors)

        // Trailing comment for this property
        if (prop.trailingComment) {
          out +=
            ' ' + colorize(colors?.comment, '#' + prop.trailingComment.value)
        }
      }

      // Inner comments (after last property)
      if (node.innerComments.length > 0) {
        out += '\n'
        out += printComments(node.innerComments, childIndent, colors)
        // Remove last newline since we add one before }
        out = out.replace(/\n$/, '')
      }

      return out + '\n' + parentIndent + colorize(colors?.bracket, '}')
    }
  }
}

function getIndent(level: number) {
  return ' '.repeat(2 * level)
}
