import type {
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
  IdentifierKey,
  KeyNode,
  Property,
  CommentNode,
  Document,
} from './types.js'

export function parse(source: string): Document {
  if (typeof source !== 'string') throw TypeError('Source must be a string')

  let pos = 0,
    lineNumber = 1,
    columnNumber = 0,
    ch: string,
    done = false

  const comments: CommentNode[] = []

  const docStart = { offset: 0, line: 1, column: 1 }
  next()
  const value = parseValue()
  skipWhitespace()

  if (!done) {
    throw new SyntaxError(errorSnippet())
  }

  expectValue(value)
  const docEnd = here()
  const doc: Document = {
    type: 'Document',
    value: value!,
    leadingComments: [],
    trailingComments: [],
    span: { start: docStart, end: docEnd },
  }
  attachComments(doc, comments, source)
  attachBlankLines(doc.value, source)
  return doc

  function next() {
    if (pos < source.length) {
      ch = source[pos]
      pos++
      if (ch === '\n') {
        lineNumber++
        columnNumber = 0
      } else {
        columnNumber++
      }
    } else {
      ch = ''
      done = true
    }
  }

  function here(): Position {
    if (done) {
      return {
        offset: source.length,
        line: lineNumber,
        column: columnNumber + 1,
      }
    }
    return { offset: pos - 1, line: lineNumber, column: columnNumber }
  }

  function lookahead(n: number) {
    return source.substring(pos, pos + n)
  }

  function parseValue(): ValueNode | undefined {
    skipWhitespace()
    return (
      parseRawString() ??
      parseString() ??
      parseNumber() ??
      parseObject() ??
      parseArray() ??
      parseKeyword('true') ??
      parseKeyword('false') ??
      parseKeyword('null')
    )
  }

  function parseString(): StringNode | undefined {
    if (ch !== '"') return
    const start = here()
    let str = ''
    let escaped = false
    while (true) {
      next()
      if (escaped) {
        if ((ch as string) === 'u') {
          next()
          if ((ch as string) !== '{') {
            throw new SyntaxError(
              errorSnippet(
                errorMap.u + ' ' + JSON.stringify(ch) + ' (expected "{")',
              ),
            )
          }
          let hex = ''
          while (true) {
            next()
            if ((ch as string) === '}') break
            if (!isHexDigit(ch)) {
              throw new SyntaxError(
                errorSnippet(errorMap.u + ' ' + JSON.stringify(ch)),
              )
            }
            hex += ch
            if (hex.length > 6) {
              throw new SyntaxError(
                errorSnippet(errorMap.u + ' (too many hex digits)'),
              )
            }
          }
          if (hex.length === 0) {
            throw new SyntaxError(errorSnippet(errorMap.u))
          }
          const codePoint = parseInt(hex, 16)
          if (codePoint > 0x10ffff) {
            throw new SyntaxError(errorSnippet(errorMap.u + ' (out of range)'))
          }
          str += String.fromCodePoint(codePoint)
        } else {
          const escapedChar = escapeMap[ch]
          if (!escapedChar) {
            throw new SyntaxError(
              errorSnippet(errorMap.u + ' ' + JSON.stringify(ch)),
            )
          }
          str += escapedChar
        }
        escaped = false
      } else if ((ch as string) === '\\') {
        escaped = true
      } else if (ch === '"') {
        break
      } else if ((ch as string) === '\n') {
        throw new SyntaxError(errorSnippet())
      } else if ((ch as string) < '\x1F') {
        throw new SyntaxError(errorSnippet())
      } else {
        str += ch
      }
    }
    next()
    const end = here()
    const raw = source.substring(start.offset, end.offset)
    return { type: 'String', value: str, raw, span: { start, end } }
  }

  function parseRawString(): RawStringNode | undefined {
    if (ch !== '"' || lookahead(2) !== '""') return
    const start = here()
    next()
    next()
    next()
    let hasLeadingNewline = false
    if ((ch as string) === '\r' && lookahead(1) === '\n') {
      next()
    }
    if ((ch as string) === '\n') {
      hasLeadingNewline = true
      next()
    }

    let str = ''
    while (!done) {
      if (ch === '"' && lookahead(2) === '""') {
        next()
        next()
        next()
        if (str === '' && !hasLeadingNewline) {
          throw new SyntaxError(errorSnippet('Raw strings cannot be empty'))
        }
        const end = here()
        const raw = source.substring(start.offset, end.offset)
        return { type: 'RawString', value: str, raw, span: { start, end } }
      }
      str += ch
      next()
    }
    throw new SyntaxError(errorSnippet())
  }

  function parseNumber(): IntegerNode | FloatNode | undefined {
    if (!isDigit(ch) && ch !== '-') return
    const start = here()
    let numStr = ''
    let float = false
    if (ch === '-') {
      numStr += ch
      next()
      if (!isDigit(ch)) {
        throw new SyntaxError(errorSnippet())
      }
    }
    if (ch === '0') {
      numStr += ch
      next()
    } else {
      while (isDigit(ch)) {
        numStr += ch
        next()
      }
    }
    if (ch === '.') {
      float = true
      numStr += ch
      next()
      if (!isDigit(ch)) {
        throw new SyntaxError(errorSnippet())
      }
      while (isDigit(ch)) {
        numStr += ch
        next()
      }
    }
    if (ch === 'e' || ch === 'E') {
      float = true
      numStr += ch
      next()
      if ((ch as string) === '+' || (ch as string) === '-') {
        numStr += ch
        next()
      }
      if (!isDigit(ch)) {
        throw new SyntaxError(errorSnippet())
      }
      while (isDigit(ch)) {
        numStr += ch
        next()
      }
    }
    const end = here()
    const span: Span = { start, end }
    if (float) {
      return { type: 'Float', value: parseFloat(numStr), raw: numStr, span }
    }
    return {
      type: 'Integer',
      value: toSafeNumber(numStr),
      raw: numStr,
      span,
    }
  }

  function parseObject(): ObjectNode | undefined {
    if (ch !== '{') return
    const start = here()
    next()
    skipWhitespace()
    const properties: Property[] = []
    const seen = new Set<string>()
    if ((ch as string) === '}') {
      next()
      const end = here()
      return {
        type: 'Object',
        properties,
        span: { start, end },
        innerComments: [],
      }
    }
    while (true) {
      const keyStart = here()
      let key: KeyNode
      if ((ch as string) === '"') {
        key = parseString()!
      } else {
        key = parseKey()
      }
      if (seen.has(key.value)) {
        pos = keyStart.offset + 1
        throw new SyntaxError(
          errorSnippet(`Duplicate key ${JSON.stringify(key.value)}`),
        )
      }
      seen.add(key.value)
      skipWhitespace()
      if ((ch as string) !== ':') {
        throw new SyntaxError(errorSnippet())
      }
      next()
      const value = parseValue()
      expectValue(value)
      const propSpan: Span = { start: keyStart, end: value!.span.end }
      properties.push({
        key,
        value: value!,
        span: propSpan,
        leadingComments: [],
        trailingComment: null,
        emptyLineBefore: false,
      })
      const newlineAfterValue = skipWhitespace()
      if ((ch as string) === '}') {
        next()
        const end = here()
        return {
          type: 'Object',
          properties,
          span: { start, end },
          innerComments: [],
        }
      } else if ((ch as string) === ',') {
        next()
        skipWhitespace()
        if ((ch as string) === '}') {
          next()
          const end = here()
          return {
            type: 'Object',
            properties,
            span: { start, end },
            innerComments: [],
          }
        }
      } else if (newlineAfterValue) {
        continue
      } else {
        throw new SyntaxError(
          errorSnippet('Expected comma or newline between key-value pairs'),
        )
      }
    }
  }

  function parseKey(): IdentifierKey {
    const start = here()
    let identifier = ''
    while (isKeyChar(ch)) {
      identifier += ch
      next()
    }
    if (identifier === '') {
      throw new SyntaxError(errorSnippet())
    }
    const end = here()
    return { type: 'Identifier', value: identifier, span: { start, end } }
  }

  function parseArray(): ArrayNode | undefined {
    if (ch !== '[') return
    const start = here()
    next()
    skipWhitespace()
    const elements: ValueNode[] = []
    if ((ch as string) === ']') {
      next()
      const end = here()
      return {
        type: 'Array',
        elements,
        span: { start, end },
        innerComments: [],
        emptyLinesBefore: [],
      }
    }
    while (true) {
      const value = parseValue()
      expectValue(value)
      elements.push(value!)
      const newLineAfterValue = skipWhitespace()
      if ((ch as string) === ']') {
        next()
        const end = here()
        return {
          type: 'Array',
          elements,
          span: { start, end },
          innerComments: [],
          emptyLinesBefore: [],
        }
      } else if ((ch as string) === ',') {
        next()
        skipWhitespace()
        if ((ch as string) === ']') {
          next()
          const end = here()
          return {
            type: 'Array',
            elements,
            span: { start, end },
            innerComments: [],
            emptyLinesBefore: [],
          }
        }
      } else if (newLineAfterValue) {
        continue
      } else {
        throw new SyntaxError(
          errorSnippet('Expected comma or newline between values'),
        )
      }
    }
  }

  function parseKeyword(name: string): BooleanNode | NullNode | undefined {
    if (ch !== name[0]) return
    const start = here()
    for (let i = 1; i < name.length; i++) {
      next()
      if (ch !== name[i]) {
        throw new SyntaxError(errorSnippet())
      }
    }
    next()
    if (isWhitespace(ch) || ch === ',' || ch === '}' || ch === ']' || done) {
      const end = here()
      const span: Span = { start, end }
      if (name === 'null') {
        return { type: 'Null', value: null, span }
      }
      return { type: 'Boolean', value: name === 'true', span }
    }
    throw new SyntaxError(errorSnippet())
  }

  function skipWhitespace(): boolean {
    let hasNewline = false
    while (isWhitespace(ch)) {
      hasNewline ||= ch === '\n'
      next()
    }
    const hasNewlineAfterComment = skipComment()
    return hasNewline || hasNewlineAfterComment
  }

  function skipComment(): boolean {
    if (ch === '#') {
      const start = here()
      let text = ''
      next() // skip '#'
      while (!done && (ch as string) !== '\n') {
        text += ch
        next()
      }
      const end = here()
      comments.push({ type: 'Comment', value: text, span: { start, end } })
      return skipWhitespace()
    }
    return false
  }

  function isWhitespace(ch: string) {
    return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r'
  }

  function isHexDigit(ch: string) {
    return (ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'F')
  }

  function isDigit(ch: string) {
    return ch >= '0' && ch <= '9'
  }

  function isKeyChar(ch: string) {
    return (
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      (ch >= '0' && ch <= '9') ||
      ch === '_' ||
      ch === '-'
    )
  }

  function toSafeNumber(str: string) {
    if (str == '-0') return -0
    const num = Number(str)
    return num >= Number.MIN_SAFE_INTEGER && num <= Number.MAX_SAFE_INTEGER
      ? num
      : BigInt(str)
  }

  function expectValue(value: unknown) {
    if (value === undefined) {
      throw new SyntaxError(errorSnippet())
    }
  }

  function errorSnippet(
    message = `Unexpected character ${JSON.stringify(ch)}`,
  ) {
    if (!ch) message = 'Unexpected end of input'
    const lines = source.substring(pos - 40, pos).split('\n')
    let lastLine = lines.at(-1) || ''
    let postfix =
      source
        .substring(pos, pos + 40)
        .split('\n', 1)
        .at(0) || ''
    if (lastLine === '') {
      // error at "\n"
      lastLine = lines.at(-2) || ''
      lastLine += ' '
      lineNumber--
      postfix = ''
    }
    const snippet = `    ${lastLine}${postfix}\n`
    const pointer = `    ${'.'.repeat(Math.max(0, lastLine.length - 1))}^\n`
    return `${message} on line ${lineNumber}.\n\n${snippet}${pointer}`
  }
}

function hasNewlineBetween(source: string, from: number, to: number): boolean {
  for (let i = from; i < to; i++) {
    if (source[i] === '\n') return true
  }
  return false
}

function hasBlankLine(source: string, from: number, to: number): boolean {
  let afterNewline = false
  for (let i = from; i < to; i++) {
    if (source[i] === '\n') {
      if (afterNewline) return true
      afterNewline = true
    } else if (source[i] !== ' ' && source[i] !== '\t' && source[i] !== '\r') {
      afterNewline = false
    }
  }
  return false
}

function attachBlankLines(node: ValueNode, source: string) {
  if (node.type === 'Object') {
    const props = node.properties
    for (let i = 0; i < props.length; i++) {
      const regionStart =
        i === 0
          ? node.span.start.offset + 1
          : props[i - 1].trailingComment
            ? props[i - 1].trailingComment!.span.end.offset
            : props[i - 1].span.end.offset
      const regionEnd =
        props[i].leadingComments.length > 0
          ? props[i].leadingComments[0].span.start.offset
          : props[i].key.span.start.offset
      props[i].emptyLineBefore = hasBlankLine(source, regionStart, regionEnd)
      attachBlankLines(props[i].value, source)
    }
  } else if (node.type === 'Array') {
    const elements = node.elements
    for (let i = 0; i < elements.length; i++) {
      const regionStart =
        i === 0 ? node.span.start.offset + 1 : elements[i - 1].span.end.offset
      const regionEnd = elements[i].span.start.offset
      node.emptyLinesBefore.push(hasBlankLine(source, regionStart, regionEnd))
      attachBlankLines(elements[i], source)
    }
  }
}

function attachComments(
  doc: Document,
  comments: CommentNode[],
  source: string,
) {
  const { value } = doc
  if (comments.length === 0) return

  const valueStart = value.span.start.offset
  const valueEnd = value.span.end.offset

  const inside: CommentNode[] = []
  for (const c of comments) {
    if (c.span.start.offset < valueStart) {
      doc.leadingComments.push(c)
    } else if (c.span.start.offset >= valueEnd) {
      doc.trailingComments.push(c)
    } else {
      inside.push(c)
    }
  }

  if (inside.length > 0) {
    distributeComments(value, inside, source)
  }
}

function distributeComments(
  node: ValueNode,
  comments: CommentNode[],
  source: string,
) {
  if (node.type === 'Object') distributeToObject(node, comments, source)
  else if (node.type === 'Array') distributeToArray(node, comments, source)
}

function distributeToObject(
  node: ObjectNode,
  comments: CommentNode[],
  source: string,
) {
  const props = node.properties

  if (props.length === 0) {
    node.innerComments = comments
    return
  }

  for (const c of comments) {
    // Check if comment is inside a nested value
    let nested = false
    for (const prop of props) {
      if (
        c.span.start.offset >= prop.value.span.start.offset &&
        c.span.start.offset < prop.value.span.end.offset
      ) {
        distributeComments(prop.value, [c], source)
        nested = true
        break
      }
    }
    if (nested) continue

    // Try to attach as trailing comment (on same line as a property's value)
    let attached = false
    for (const prop of props) {
      if (
        c.span.start.offset > prop.value.span.end.offset &&
        !hasNewlineBetween(
          source,
          prop.value.span.start.offset,
          c.span.start.offset,
        )
      ) {
        prop.trailingComment = c
        attached = true
        break
      }
    }
    if (attached) continue

    // Try to attach as leading comment (before a property's key)
    for (const prop of props) {
      if (c.span.start.offset < prop.key.span.start.offset) {
        prop.leadingComments.push(c)
        attached = true
        break
      }
    }
    if (attached) continue

    // Dangling comment (after last property, before closing brace)
    node.innerComments.push(c)
  }
}

function distributeToArray(
  node: ArrayNode,
  comments: CommentNode[],
  source: string,
) {
  const elements = node.elements

  if (elements.length === 0) {
    node.innerComments = comments
    return
  }

  for (const c of comments) {
    // Check if comment is inside a nested value
    let nested = false
    for (const el of elements) {
      if (
        c.span.start.offset >= el.span.start.offset &&
        c.span.start.offset < el.span.end.offset
      ) {
        distributeComments(el, [c], source)
        nested = true
        break
      }
    }
    if (nested) continue

    // For arrays, all non-nested comments go to innerComments
    node.innerComments.push(c)
  }
}

const escapeMap: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  n: '\n',
  r: '\r',
  t: '\t',
}

const errorMap = {
  u: 'Invalid escape sequence',
}
