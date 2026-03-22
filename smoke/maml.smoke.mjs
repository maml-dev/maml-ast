import assert from 'node:assert'
import * as MAML from '../build/index.js'

const ast = MAML.parse(`{
  project: "MAML"
  tags: [
    "minimal"
    "readable"
  ]
}`)

assert.strictEqual(ast.type, 'Document')
assert.strictEqual(ast.value.type, 'Object')
assert.strictEqual(ast.value.properties.length, 2)

const value = MAML.toValue(ast)
assert.deepEqual(value, {
  project: 'MAML',
  tags: ['minimal', 'readable'],
})

const str = MAML.print(ast)
const ast2 = MAML.parse(str)
assert.deepEqual(MAML.toValue(ast2), value)

console.log('smoke ESM — ok')
