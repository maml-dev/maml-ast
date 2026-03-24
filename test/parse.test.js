import { test, describe, expect } from 'vitest'
import { parse, toValue } from '../build/index.js'
import { loadTestCases } from './utils.js'

describe('parse', () => {
  const testCases = loadTestCases('parse.test.txt')
  for (const { name, input, expected } of testCases) {
    test(name, () => {
      expect(toValue(parse(input))).toStrictEqual(JSON.parse(expected))
    })
  }

  test('full example', () => {
    const ast = parse(`
{
  project: "MAML"
  tags: [
    "minimal"
    "readable"
  ]

  # A simple nested object
  spec: {
    version: 1
    author: "Anton Medvedev"
  }

  # Array of objects with nested objects
  examples: [
    {
      json: {
        name: "JSON"
        born: 2001
      }
    }
    {
      maml: {
        name: "MAML"
        born: 2025
      }
    }
  ]

  notes: """
This is a raw multiline strings.
Keeps formatting as-is.
"""
}
  `)
    expect(ast.type).toBe('Document')
    expect(ast.value.type).toBe('Object')
    expect(ast.value.properties[2].leadingComments.length).toBe(1)
    expect(ast.value.properties[3].leadingComments.length).toBe(1)
  })

  test('bigint', () => {
    const ast = parse('9007199254740992') // Number.MAX_SAFE_INTEGER + 1
    expect(toValue(ast)).toStrictEqual(9007199254740992n)
  })

  test('maml in global', async () => {
    await import('../build/maml.min.js')
    expect('MAML' in globalThis).toBeTruthy()
  })
})

describe('string control characters', () => {
  test('allows literal tab', () => {
    const ast = parse('"hello\tworld"')
    expect(toValue(ast)).toBe('hello\tworld')
  })

  test('rejects control char U+001F', () => {
    expect(() => parse('"\x1F"')).toThrow()
  })

  test('rejects DEL U+007F', () => {
    expect(() => parse('"\x7F"')).toThrow()
  })

  test('unicode scalar value boundaries parse correctly', () => {
    expect(toValue(parse('"\\u{0}"'))).toBe(String.fromCodePoint(0x0000))
    expect(toValue(parse('"\\u{D7FF}"'))).toBe(String.fromCodePoint(0xD7FF))
    expect(toValue(parse('"\\u{E000}"'))).toBe(String.fromCodePoint(0xE000))
    expect(toValue(parse('"\\u{FFFF}"'))).toBe(String.fromCodePoint(0xFFFF))
    expect(toValue(parse('"\\u{10000}"'))).toBe(String.fromCodePoint(0x10000))
    expect(toValue(parse('"\\u{10FFFF}"'))).toBe(String.fromCodePoint(0x10FFFF))
  })

  test('surrogate code points are rejected', () => {
    expect(() => parse('"\\u{D800}"')).toThrow('out of range')
    expect(() => parse('"\\u{DBFF}"')).toThrow('out of range')
    expect(() => parse('"\\u{DC00}"')).toThrow('out of range')
    expect(() => parse('"\\u{DFFF}"')).toThrow('out of range')
  })

  test('all control characters below U+0020 are rejected unescaped (except tab)', () => {
    for (let code = 0; code < 0x20; code++) {
      if (code === 0x09) continue // tab is allowed
      expect(() => parse(`"${String.fromCharCode(code)}"`)).toThrow()
    }
  })
})

describe('raw strings', () => {
  test('CRLF newlines', () => {
    const ast = parse('"""line1\r\nline2\r\nline3"""')
    expect(toValue(ast)).toBe('line1\r\nline2\r\nline3')
  })

  test('mixed CRLF and LF newlines', () => {
    const ast = parse('"""line1\r\nline2\nline3\r\n"""')
    expect(toValue(ast)).toBe('line1\r\nline2\nline3\r\n')
  })

  test('CR inside and CRLF newline', () => {
    const ast = parse('"""the \r char\r\n"""')
    expect(toValue(ast)).toBe('the \r char\r\n')
  })

  test('CR at the end', () => {
    const ast = parse('"""string\r"""')
    expect(toValue(ast)).toBe('string\r')
  })

  test('leading LF stripped', () => {
    const ast = parse('"""\nstring\r\n"""')
    expect(toValue(ast)).toBe('string\r\n')
  })

  test('leading CRLF stripped', () => {
    const ast = parse('"""\r\nstring\r\n"""')
    expect(toValue(ast)).toBe('string\r\n')
  })

  test('leading CR not stripped', () => {
    const ast = parse('"""\rstring\r\n"""')
    expect(toValue(ast)).toBe('\rstring\r\n')
  })
})
