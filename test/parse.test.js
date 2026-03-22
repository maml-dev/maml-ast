import { test, describe, expect } from 'vitest'
import { parse, toValue } from '../build/index.js'
import { loadTestCases } from './utils.js'

test('example', () => {
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

describe('parse', () => {
  const testCases = loadTestCases('parse.test.txt')
  for (const { name, input, expected } of testCases) {
    test(name, () => {
      expect(toValue(parse(input))).toStrictEqual(JSON.parse(expected))
    })
  }
})

describe('extra', () => {
  test('bigint', () => {
    const ast = parse(`9007199254740992`) // Number.MAX_SAFE_INTEGER + 1
    expect(toValue(ast)).toStrictEqual(9007199254740992n)
  })

  test('maml in global', async () => {
    await import('../build/maml.min.js')
    expect('MAML' in globalThis).toBeTruthy()
  })

  test('raw string with CRLF newlines', () => {
    const ast = parse('"""line1\r\nline2\r\nline3"""')
    expect(toValue(ast)).toStrictEqual('line1\r\nline2\r\nline3')
  })

  test('raw string with mixed CRLF and LF newlines', () => {
    const ast = parse('"""line1\r\nline2\nline3\r\n"""')
    expect(toValue(ast)).toStrictEqual('line1\r\nline2\nline3\r\n')
  })

  test('raw string with CR inside and CRLF newline', () => {
    const ast = parse('"""the \r char\r\n"""')
    expect(toValue(ast)).toStrictEqual('the \r char\r\n')
  })

  test('raw string with CR at the end', () => {
    const ast = parse('"""string\r"""')
    expect(toValue(ast)).toStrictEqual('string\r')
  })

  test('raw string with leading LF', () => {
    const ast = parse('"""\nstring\r\n"""')
    expect(toValue(ast)).toStrictEqual('string\r\n')
  })

  test('raw string with leading CRLF', () => {
    const ast = parse('"""\r\nstring\r\n"""')
    expect(toValue(ast)).toStrictEqual('string\r\n')
  })

  test('raw string with leading CR', () => {
    const ast = parse('"""\rstring\r\n"""')
    expect(toValue(ast)).toStrictEqual('\rstring\r\n')
  })
})
