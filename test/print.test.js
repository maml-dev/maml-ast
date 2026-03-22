import { test, describe, expect } from 'vitest'
import { parse, print } from '../build/index.js'

describe('print', () => {
  test('int', () => {
    expect(print(parse('42'))).toStrictEqual('42')
  })

  test('bigint', () => {
    // Number.MAX_SAFE_INTEGER + 1
    expect(print(parse('9007199254740992'))).toStrictEqual('9007199254740992')
  })

  test('float', () => {
    expect(print(parse('1.5'))).toStrictEqual('1.5')
  })

  test('boolean', () => {
    expect(print(parse('true'))).toStrictEqual('true')
  })

  test('null', () => {
    expect(print(parse('null'))).toStrictEqual('null')
  })

  test('string', () => {
    expect(print(parse('"foo"'))).toStrictEqual('"foo"')
  })

  test('array', () => {
    expect(print(parse('[1, 2, 3]'))).toStrictEqual(`[\n  1\n  2\n  3\n]`)
  })

  test('object', () => {
    expect(print(parse('{foo: "foo", bar: "bar"}'))).toStrictEqual(
      `{\n  foo: "foo"\n  bar: "bar"\n}`,
    )
  })

  test('object with quoted keys', () => {
    expect(print(parse('{"foo bar": "value"}'))).toStrictEqual(
      `{\n  "foo bar": "value"\n}`,
    )
  })

  test('empty object', () => {
    expect(print(parse('{}'))).toStrictEqual('{}')
  })

  test('empty array', () => {
    expect(print(parse('[]'))).toStrictEqual('[]')
  })

  test('raw string round-trip', () => {
    expect(print(parse('"""hello"""'))).toStrictEqual('"""hello"""')
  })

  test('float exponent preserved', () => {
    expect(print(parse('1e6'))).toStrictEqual('1e6')
  })

  test('object with leading comments', () => {
    const input = '{\n  # comment\n  a: 1\n}'
    expect(print(parse(input))).toStrictEqual('{\n  # comment\n  a: 1\n}')
  })

  test('object with trailing comments', () => {
    const input = '{\n  a: 1 # inline\n}'
    expect(print(parse(input))).toStrictEqual('{\n  a: 1 # inline\n}')
  })

  test('object with inner comments', () => {
    const input = '{\n  a: 1\n  # end\n}'
    expect(print(parse(input))).toStrictEqual('{\n  a: 1\n  # end\n}')
  })

  test('document with leading comment', () => {
    const input = '# header\n42'
    expect(print(parse(input))).toStrictEqual('# header\n42')
  })

  test('document with trailing comment', () => {
    const input = '42 # end'
    expect(print(parse(input))).toStrictEqual('42 # end')
  })

  test('array with comments', () => {
    const input = '[\n  1 # one\n  2 # two\n]'
    expect(print(parse(input))).toStrictEqual(
      '[\n  1\n  # one\n  2\n  # two\n]',
    )
  })

  test('multiple leading comments', () => {
    const input = '{\n  # c1\n  # c2\n  a: 1\n}'
    expect(print(parse(input))).toStrictEqual('{\n  # c1\n  # c2\n  a: 1\n}')
  })

  test('print raw ValueNode (not Document)', () => {
    const doc = parse('42')
    expect(print(doc.value)).toStrictEqual('42')
  })
})
