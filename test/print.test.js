import { test, describe, expect } from 'vitest'
import { parse, print } from '../build/index.js'

describe('print', () => {
  describe('values', () => {
    test('integer', () => {
      expect(print(parse('42'))).toBe('42')
    })

    test('bigint', () => {
      expect(print(parse('9007199254740992'))).toBe('9007199254740992')
    })

    test('64-bit max boundary', () => {
      const I64_MAX = `${2n ** 63n - 1n}`
      expect(print(parse(I64_MAX))).toBe(I64_MAX)
    })

    test('64-bit min boundary', () => {
      const I64_MIN = `${-(2n ** 63n)}`
      expect(print(parse(I64_MIN))).toBe(I64_MIN)
    })

    test('float', () => {
      expect(print(parse('1.5'))).toBe('1.5')
    })

    test('float exponent preserved', () => {
      expect(print(parse('1e6'))).toBe('1e6')
    })

    test('boolean', () => {
      expect(print(parse('true'))).toBe('true')
    })

    test('null', () => {
      expect(print(parse('null'))).toBe('null')
    })

    test('string', () => {
      expect(print(parse('"foo"'))).toBe('"foo"')
    })

    test('raw string', () => {
      expect(print(parse('"""hello"""'))).toBe('"""hello"""')
    })

    test('string with quote and backslash', () => {
      expect(print(parse('"say \\"hi\\""'))).toBe('"say \\"hi\\""')
      expect(print(parse('"a\\\\b"'))).toBe('"a\\\\b"')
    })

    test('string with tab', () => {
      expect(print(parse('"hello\\tworld"'))).toBe('"hello\\tworld"')
    })

    test('string with newline and carriage return', () => {
      expect(print(parse('"a\\nb"'))).toBe('"a\\nb"')
      expect(print(parse('"a\\rb"'))).toBe('"a\\rb"')
    })

    test('string with control characters', () => {
      expect(print(parse('"\\u{0}"'))).toBe('"\\u{0}"')
      expect(print(parse('"\\u{8}"'))).toBe('"\\u{8}"')
      expect(print(parse('"\\u{C}"'))).toBe('"\\u{C}"')
      expect(print(parse('"\\u{1F}"'))).toBe('"\\u{1F}"')
      expect(print(parse('"\\u{7F}"'))).toBe('"\\u{7F}"')
    })

    test('unicode scalar value boundary characters pass through as-is', () => {
      const d7ff = String.fromCodePoint(0xD7FF)
      expect(print(parse(`"${d7ff}"`))).toBe(`"${d7ff}"`)
      const e000 = String.fromCodePoint(0xE000)
      expect(print(parse(`"${e000}"`))).toBe(`"${e000}"`)
      const sup = String.fromCodePoint(0x10000)
      expect(print(parse(`"${sup}"`))).toBe(`"${sup}"`)
      const max = String.fromCodePoint(0x10FFFF)
      expect(print(parse(`"${max}"`))).toBe(`"${max}"`)
    })

    test('all control characters 0x01-0x1F except tab are escaped', () => {
      for (let code = 1; code < 0x20; code++) {
        if (code === 0x09) continue // tab uses \t
        if (code === 0x0A) continue // newline uses \n
        if (code === 0x0D) continue // CR uses \r
        const result = print(parse(`"\\u{${code.toString(16).toUpperCase()}}"`))
        expect(result).toBe(`"\\u{${code.toString(16).toUpperCase()}}"`)
      }
    })
  })

  describe('containers', () => {
    test('array', () => {
      expect(print(parse('[1, 2, 3]'))).toBe('[\n  1\n  2\n  3\n]')
    })

    test('empty array', () => {
      expect(print(parse('[]'))).toBe('[]')
    })

    test('object', () => {
      expect(print(parse('{foo: "foo", bar: "bar"}'))).toBe(
        '{\n  foo: "foo"\n  bar: "bar"\n}',
      )
    })

    test('object with quoted keys', () => {
      expect(print(parse('{"foo bar": "value"}'))).toBe(
        '{\n  "foo bar": "value"\n}',
      )
    })

    test('empty object', () => {
      expect(print(parse('{}'))).toBe('{}')
    })
  })

  describe('comments', () => {
    test('document leading comment', () => {
      expect(print(parse('# header\n42'))).toBe('# header\n42')
    })

    test('document dangling comment', () => {
      expect(print(parse('42 # end'))).toBe('42\n# end')
    })

    test('object leading comments', () => {
      const input = '{\n  # comment\n  a: 1\n}'
      expect(print(parse(input))).toBe('{\n  # comment\n  a: 1\n}')
    })

    test('object multiple leading comments', () => {
      const input = '{\n  # c1\n  # c2\n  a: 1\n}'
      expect(print(parse(input))).toBe('{\n  # c1\n  # c2\n  a: 1\n}')
    })

    test('object trailing comment', () => {
      const input = '{\n  a: 1 # inline\n}'
      expect(print(parse(input))).toBe('{\n  a: 1 # inline\n}')
    })

    test('object inner comments', () => {
      const input = '{\n  a: 1\n  # end\n}'
      expect(print(parse(input))).toBe('{\n  a: 1\n  # end\n}')
    })

    test('array trailing comments', () => {
      const input = '[\n  1 # one\n  2 # two\n]'
      expect(print(parse(input))).toBe('[\n  1 # one\n  2 # two\n]')
    })

    test('array leading comments', () => {
      const input = '[\n  # first\n  1\n  2\n]'
      expect(print(parse(input))).toBe('[\n  # first\n  1\n  2\n]')
    })

    test('array inner comments', () => {
      const input = '[\n  1\n  # end\n]'
      expect(print(parse(input))).toBe('[\n  1\n  # end\n]')
    })
  })

  describe('blank lines', () => {
    test('object blank lines between properties', () => {
      const input = '{\n  a: 1\n\n  b: 2\n}'
      expect(print(parse(input))).toBe('{\n  a: 1\n\n  b: 2\n}')
    })

    test('object no blank line between properties', () => {
      const input = '{\n  a: 1\n  b: 2\n}'
      expect(print(parse(input))).toBe('{\n  a: 1\n  b: 2\n}')
    })

    test('object blank line before comment', () => {
      const input = '{\n  a: 1\n\n  # section\n  b: 2\n}'
      expect(print(parse(input))).toBe('{\n  a: 1\n\n  # section\n  b: 2\n}')
    })

    test('array blank lines between elements', () => {
      const input = '[\n  1\n  2\n\n  3\n]'
      expect(print(parse(input))).toBe('[\n  1\n  2\n\n  3\n]')
    })

    test('array no blank line between elements', () => {
      const input = '[\n  1\n  2\n  3\n]'
      expect(print(parse(input))).toBe('[\n  1\n  2\n  3\n]')
    })

    test('array blank line before comment', () => {
      const input = '[\n  1\n\n  # section\n  2\n]'
      expect(print(parse(input))).toBe('[\n  1\n\n  # section\n  2\n]')
    })
  })

  describe('colors', () => {
    const tag = (name) => (s) => `<${name}>${s}</${name}>`

    const allColors = {
      string: tag('s'),
      number: tag('n'),
      boolean: tag('b'),
      null: tag('x'),
      key: tag('k'),
      comment: tag('c'),
      bracket: tag('br'),
      colon: tag('co'),
    }

    test('string', () => {
      expect(print(parse('"hi"'), { colors: allColors })).toBe('<s>"hi"</s>')
    })

    test('raw string', () => {
      expect(print(parse('"""hi"""'), { colors: allColors })).toBe(
        '<s>"""hi"""</s>',
      )
    })

    test('integer', () => {
      expect(print(parse('42'), { colors: allColors })).toBe('<n>42</n>')
    })

    test('float', () => {
      expect(print(parse('1.5'), { colors: allColors })).toBe('<n>1.5</n>')
    })

    test('boolean', () => {
      expect(print(parse('true'), { colors: allColors })).toBe('<b>true</b>')
    })

    test('null', () => {
      expect(print(parse('null'), { colors: allColors })).toBe('<x>null</x>')
    })

    test('object with key and colon', () => {
      expect(print(parse('{a: 1}'), { colors: allColors })).toBe(
        '<br>{</br>\n  <k>a</k><co>:</co> <n>1</n>\n<br>}</br>',
      )
    })

    test('empty object', () => {
      expect(print(parse('{}'), { colors: allColors })).toBe(
        '<br>{</br><br>}</br>',
      )
    })

    test('array', () => {
      expect(print(parse('[1]'), { colors: allColors })).toBe(
        '<br>[</br>\n  <n>1</n>\n<br>]</br>',
      )
    })

    test('empty array', () => {
      expect(print(parse('[]'), { colors: allColors })).toBe(
        '<br>[</br><br>]</br>',
      )
    })

    test('document leading comment', () => {
      expect(print(parse('# hdr\n42'), { colors: allColors })).toBe(
        '<c># hdr</c>\n<n>42</n>',
      )
    })

    test('document dangling comment', () => {
      expect(print(parse('42 # end'), { colors: allColors })).toBe(
        '<n>42</n>\n<c># end</c>',
      )
    })

    test('object leading comment', () => {
      const input = '{\n  # c\n  a: 1\n}'
      expect(print(parse(input), { colors: allColors })).toBe(
        '<br>{</br>\n  <c># c</c>\n  <k>a</k><co>:</co> <n>1</n>\n<br>}</br>',
      )
    })

    test('object trailing comment', () => {
      const input = '{\n  a: 1 # t\n}'
      expect(print(parse(input), { colors: allColors })).toBe(
        '<br>{</br>\n  <k>a</k><co>:</co> <n>1</n> <c># t</c>\n<br>}</br>',
      )
    })

    test('object inner comment', () => {
      const input = '{\n  a: 1\n  # end\n}'
      expect(print(parse(input), { colors: allColors })).toBe(
        '<br>{</br>\n  <k>a</k><co>:</co> <n>1</n>\n  <c># end</c>\n<br>}</br>',
      )
    })

    test('array trailing comment', () => {
      const input = '[\n  1 # c\n]'
      expect(print(parse(input), { colors: allColors })).toBe(
        '<br>[</br>\n  <n>1</n> <c># c</c>\n<br>]</br>',
      )
    })

    test('array leading comment', () => {
      const input = '[\n  # c\n  1\n]'
      expect(print(parse(input), { colors: allColors })).toBe(
        '<br>[</br>\n  <c># c</c>\n  <n>1</n>\n<br>]</br>',
      )
    })

    test('array inner comment', () => {
      const input = '[\n  1\n  # end\n]'
      expect(print(parse(input), { colors: allColors })).toBe(
        '<br>[</br>\n  <n>1</n>\n  <c># end</c>\n<br>]</br>',
      )
    })

    test('quoted key', () => {
      expect(print(parse('{"a b": 1}'), { colors: allColors })).toBe(
        '<br>{</br>\n  <k>"a b"</k><co>:</co> <n>1</n>\n<br>}</br>',
      )
    })

    test('partial colors only applies provided', () => {
      const partial = { key: tag('k') }
      expect(print(parse('{a: 1}'), { colors: partial })).toBe(
        '{\n  <k>a</k>: 1\n}',
      )
    })

    test('no options same as plain print', () => {
      const input = '{a: 1}'
      expect(print(parse(input))).toBe(print(parse(input), {}))
      expect(print(parse(input))).toBe(print(parse(input), { colors: {} }))
    })
  })

  test('print raw ValueNode (not Document)', () => {
    const doc = parse('42')
    expect(print(doc.value)).toBe('42')
  })
})
