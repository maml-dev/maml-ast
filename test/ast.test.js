import { test, describe, expect } from 'vitest'
import { parse } from '../build/index.js'

describe('document', () => {
  test('wraps value', () => {
    const doc = parse('42')
    expect(doc.type).toBe('Document')
    expect(doc.value.type).toBe('Integer')
    expect(doc.leadingComments).toStrictEqual([])
    expect(doc.danglingComments).toStrictEqual([])
  })

  test('document span covers entire source', () => {
    const doc = parse('42')
    expect(doc.span.start).toStrictEqual({ offset: 0, line: 1, column: 1 })
    expect(doc.span.end).toStrictEqual({ offset: 2, line: 1, column: 3 })
  })
})

describe('node types', () => {
  test('string', () => {
    const node = parse('"hello"').value
    expect(node.type).toBe('String')
    expect(node.value).toBe('hello')
    expect(node.raw).toBe('"hello"')
  })

  test('raw string', () => {
    const node = parse('"""hello"""').value
    expect(node.type).toBe('RawString')
    expect(node.value).toBe('hello')
    expect(node.raw).toBe('"""hello"""')
  })

  test('integer', () => {
    const node = parse('42').value
    expect(node.type).toBe('Integer')
    expect(node.value).toBe(42)
    expect(node.raw).toBe('42')
  })

  test('negative integer', () => {
    const node = parse('-100').value
    expect(node.type).toBe('Integer')
    expect(node.value).toBe(-100)
    expect(node.raw).toBe('-100')
  })

  test('bigint', () => {
    const node = parse('9007199254740992').value // Number.MAX_SAFE_INTEGER + 1
    expect(node.type).toBe('Integer')
    expect(node.value).toBe(9007199254740992n)
    expect(node.raw).toBe('9007199254740992')
  })

  test('float', () => {
    const node = parse('3.14').value
    expect(node.type).toBe('Float')
    expect(node.value).toBe(3.14)
    expect(node.raw).toBe('3.14')
  })

  test('float with exponent', () => {
    const node = parse('1e6').value
    expect(node.type).toBe('Float')
    expect(node.value).toBe(1e6)
    expect(node.raw).toBe('1e6')
  })

  test('boolean true', () => {
    const node = parse('true').value
    expect(node.type).toBe('Boolean')
    expect(node.value).toBe(true)
  })

  test('boolean false', () => {
    const node = parse('false').value
    expect(node.type).toBe('Boolean')
    expect(node.value).toBe(false)
  })

  test('null', () => {
    const node = parse('null').value
    expect(node.type).toBe('Null')
    expect(node.value).toBe(null)
  })

  test('empty object', () => {
    const node = parse('{}').value
    expect(node.type).toBe('Object')
    expect(node.properties).toStrictEqual([])
  })

  test('empty array', () => {
    const node = parse('[]').value
    expect(node.type).toBe('Array')
    expect(node.elements).toStrictEqual([])
  })
})

describe('positions', () => {
  test('integer at start', () => {
    const node = parse('42').value
    expect(node.span.start).toStrictEqual({ offset: 0, line: 1, column: 1 })
    expect(node.span.end).toStrictEqual({ offset: 2, line: 1, column: 3 })
  })

  test('integer with leading whitespace', () => {
    const node = parse('  42').value
    expect(node.span.start).toStrictEqual({ offset: 2, line: 1, column: 3 })
    expect(node.span.end).toStrictEqual({ offset: 4, line: 1, column: 5 })
  })

  test('string positions', () => {
    const node = parse('"hi"').value
    expect(node.span.start).toStrictEqual({ offset: 0, line: 1, column: 1 })
    expect(node.span.end).toStrictEqual({ offset: 4, line: 1, column: 5 })
  })

  test('multiline object positions', () => {
    const node = parse('{\n  a: 1\n}').value
    expect(node.type).toBe('Object')
    expect(node.span.start).toStrictEqual({ offset: 0, line: 1, column: 1 })
    const prop = node.properties[0]
    expect(prop.key.span.start).toStrictEqual({ offset: 4, line: 2, column: 3 })
    expect(prop.value.span.start).toStrictEqual({ offset: 7, line: 2, column: 6 })
  })

  test('array element positions', () => {
    const node = parse('[1, 2]').value
    expect(node.type).toBe('Array')
    expect(node.elements[0].value.span.start).toStrictEqual({
      offset: 1,
      line: 1,
      column: 2,
    })
    expect(node.elements[1].value.span.start).toStrictEqual({
      offset: 4,
      line: 1,
      column: 5,
    })
  })

  test('boolean positions', () => {
    const node = parse('true').value
    expect(node.span.start).toStrictEqual({ offset: 0, line: 1, column: 1 })
    expect(node.span.end).toStrictEqual({ offset: 4, line: 1, column: 5 })
  })

  test('null positions', () => {
    const node = parse('null').value
    expect(node.span.start).toStrictEqual({ offset: 0, line: 1, column: 1 })
    expect(node.span.end).toStrictEqual({ offset: 4, line: 1, column: 5 })
  })
})

describe('key types', () => {
  test('identifier key', () => {
    const node = parse('{foo: 1}').value
    expect(node.type).toBe('Object')
    const key = node.properties[0].key
    expect(key.type).toBe('Identifier')
    expect(key.value).toBe('foo')
  })

  test('quoted string key', () => {
    const node = parse('{"foo": 1}').value
    expect(node.type).toBe('Object')
    const key = node.properties[0].key
    expect(key.type).toBe('String')
    expect(key.value).toBe('foo')
    expect(key.raw).toBe('"foo"')
  })

  test('identifier key with digits', () => {
    const node = parse('{123: "val"}').value
    expect(node.type).toBe('Object')
    const key = node.properties[0].key
    expect(key.type).toBe('Identifier')
    expect(key.value).toBe('123')
  })
})

describe('property spans', () => {
  test('property span covers key through value', () => {
    const node = parse('{foo: 42}').value
    const prop = node.properties[0]
    expect(prop.span.start).toStrictEqual(prop.key.span.start)
    expect(prop.span.end).toStrictEqual(prop.value.span.end)
  })
})

describe('raw field', () => {
  test('string raw includes quotes', () => {
    const node = parse('"hello"').value
    expect(node.raw).toBe('"hello"')
  })

  test('string with escapes raw', () => {
    const node = parse('"a\\nb"').value
    expect(node.value).toBe('a\nb')
    expect(node.raw).toBe('"a\\nb"')
  })

  test('raw string raw includes triple quotes', () => {
    const node = parse('"""hello"""').value
    expect(node.raw).toBe('"""hello"""')
  })

  test('number raw preserves format', () => {
    const node = parse('1e6').value
    expect(node.raw).toBe('1e6')
    expect(node.value).toBe(1000000)
  })

  test('negative zero raw', () => {
    const node = parse('-0').value
    expect(node.raw).toBe('-0')
    expect(Object.is(node.value, -0)).toBe(true)
  })
})

describe('comment attachment', () => {
  describe('document', () => {
    test('leading comment', () => {
      const doc = parse('# header\n42')
      expect(doc.leadingComments.length).toBe(1)
      expect(doc.leadingComments[0].value).toBe(' header')
    })

    test('dangling comment', () => {
      const doc = parse('42 # end')
      expect(doc.danglingComments.length).toBe(1)
      expect(doc.danglingComments[0].value).toBe(' end')
    })

    test('multiple leading comments', () => {
      const doc = parse('# one\n# two\n42')
      expect(doc.leadingComments.length).toBe(2)
    })

    test('no comments', () => {
      const doc = parse('42')
      expect(doc.leadingComments).toStrictEqual([])
      expect(doc.danglingComments).toStrictEqual([])
    })
  })

  describe('object', () => {
    test('leading comment on property', () => {
      const doc = parse('{\n  # comment\n  a: 1\n}')
      const obj = doc.value
      expect(obj.properties[0].leadingComments.length).toBe(1)
      expect(obj.properties[0].leadingComments[0].value).toBe(' comment')
    })

    test('trailing comment on property', () => {
      const doc = parse('{\n  a: 1 # inline\n}')
      const obj = doc.value
      expect(obj.properties[0].trailingComment).not.toBeNull()
      expect(obj.properties[0].trailingComment.value).toBe(' inline')
    })

    test('inner comment', () => {
      const doc = parse('{\n  a: 1\n  # end\n}')
      const obj = doc.value
      expect(obj.danglingComments.length).toBe(1)
      expect(obj.danglingComments[0].value).toBe(' end')
    })

    test('inner comment in empty object', () => {
      const doc = parse('{\n  # empty\n}')
      const obj = doc.value
      expect(obj.danglingComments.length).toBe(1)
      expect(obj.danglingComments[0].value).toBe(' empty')
    })

    test('leading and trailing on same property', () => {
      const doc = parse('{\n  # lead\n  a: 1 # trail\n}')
      const prop = doc.value.properties[0]
      expect(prop.leadingComments.length).toBe(1)
      expect(prop.leadingComments[0].value).toBe(' lead')
      expect(prop.trailingComment.value).toBe(' trail')
    })

    test('comments between properties', () => {
      const doc = parse('{\n  a: 1 # after a\n  # before b\n  b: 2\n}')
      const props = doc.value.properties
      expect(props[0].trailingComment.value).toBe(' after a')
      expect(props[1].leadingComments[0].value).toBe(' before b')
    })
  })

  describe('array', () => {
    test('trailing comment on element', () => {
      const doc = parse('[\n  1 # one\n  2 # two\n]')
      const arr = doc.value
      expect(arr.elements[0].trailingComment.value).toBe(' one')
      expect(arr.elements[1].trailingComment.value).toBe(' two')
      expect(arr.danglingComments.length).toBe(0)
    })

    test('leading comment on element', () => {
      const doc = parse('[\n  # first\n  1\n  2\n]')
      const arr = doc.value
      expect(arr.elements[0].leadingComments.length).toBe(1)
      expect(arr.elements[0].leadingComments[0].value).toBe(' first')
      expect(arr.elements[1].leadingComments.length).toBe(0)
    })

    test('inner comment (dangling)', () => {
      const doc = parse('[\n  1\n  # end\n]')
      const arr = doc.value
      expect(arr.danglingComments.length).toBe(1)
      expect(arr.danglingComments[0].value).toBe(' end')
    })

    test('inner comment in empty array', () => {
      const doc = parse('[\n  # empty\n]')
      const arr = doc.value
      expect(arr.danglingComments.length).toBe(1)
      expect(arr.danglingComments[0].value).toBe(' empty')
    })

    test('comment inside nested object in array', () => {
      const doc = parse('[\n  {\n    # nested\n    a: 1\n  }\n]')
      const arr = doc.value
      expect(arr.danglingComments.length).toBe(0)
      const obj = arr.elements[0].value
      expect(obj.properties[0].leadingComments.length).toBe(1)
      expect(obj.properties[0].leadingComments[0].value).toBe(' nested')
    })

    test('leading and trailing on same element', () => {
      const doc = parse('[\n  # lead\n  1 # trail\n]')
      const el = doc.value.elements[0]
      expect(el.leadingComments.length).toBe(1)
      expect(el.leadingComments[0].value).toBe(' lead')
      expect(el.trailingComment.value).toBe(' trail')
    })

    test('comments between elements', () => {
      const doc = parse('[\n  1 # after 1\n  # before 2\n  2\n]')
      const els = doc.value.elements
      expect(els[0].trailingComment.value).toBe(' after 1')
      expect(els[1].leadingComments[0].value).toBe(' before 2')
    })
  })
})

describe('blank lines', () => {
  describe('object', () => {
    test('blank line between properties', () => {
      const doc = parse('{\n  a: 1\n\n  b: 2\n}')
      const props = doc.value.properties
      expect(props[0].emptyLineBefore).toBe(false)
      expect(props[1].emptyLineBefore).toBe(true)
    })

    test('no blank line between properties', () => {
      const doc = parse('{\n  a: 1\n  b: 2\n}')
      const props = doc.value.properties
      expect(props[0].emptyLineBefore).toBe(false)
      expect(props[1].emptyLineBefore).toBe(false)
    })

    test('blank line before comment group', () => {
      const doc = parse('{\n  a: 1\n\n  # section\n  b: 2\n}')
      const props = doc.value.properties
      expect(props[1].emptyLineBefore).toBe(true)
    })

    test('nested object blank lines', () => {
      const doc = parse('{\n  x: {\n    a: 1\n\n    b: 2\n  }\n}')
      const inner = doc.value.properties[0].value
      expect(inner.properties[0].emptyLineBefore).toBe(false)
      expect(inner.properties[1].emptyLineBefore).toBe(true)
    })
  })

  describe('array', () => {
    test('blank line between elements', () => {
      const doc = parse('[\n  1\n\n  2\n]')
      const els = doc.value.elements
      expect(els[0].emptyLineBefore).toBe(false)
      expect(els[1].emptyLineBefore).toBe(true)
    })

    test('no blank line between elements', () => {
      const doc = parse('[\n  1\n  2\n]')
      const els = doc.value.elements
      expect(els[0].emptyLineBefore).toBe(false)
      expect(els[1].emptyLineBefore).toBe(false)
    })

    test('nested array blank lines', () => {
      const doc = parse('[\n  [\n    1\n\n    2\n  ]\n]')
      const inner = doc.value.elements[0].value
      expect(inner.elements[0].emptyLineBefore).toBe(false)
      expect(inner.elements[1].emptyLineBefore).toBe(true)
    })

    test('empty array has no elements', () => {
      const doc = parse('[]')
      expect(doc.value.elements).toStrictEqual([])
    })

    test('blank line before comment group', () => {
      const doc = parse('[\n  1\n\n  # section\n  2\n]')
      const els = doc.value.elements
      expect(els[1].emptyLineBefore).toBe(true)
    })
  })
})
