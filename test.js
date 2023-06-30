import test from 'node:test'
import assert from 'node:assert/strict';
import { stringify } from './stringify.js';
import { evalstring, makeFitzJSON } from './fitzjson.js';

const fitzJSON = await makeFitzJSON()

test('stringify', () => {
  assert.equal(stringify("\uD800"), '"\\ud800"') // '"\\ud800"'
  assert.equal(stringify("\uD800\uDC12"), '"𐀒"') // '"𐀒"'
  assert.equal(stringify("\uDC12"), '"\\udc12"') // '"\udc12"'
  assert.equal(stringify(Object(Symbol())), '{}') // {}
  assert.equal(stringify(Symbol()), undefined) // undefined
  assert.equal(stringify([Symbol()]), '[null]') // [null]
  assert.equal(stringify({a: Symbol()}), '{}') // {}
  // todo: perhaps escape these the way firefox does
  assert.equal(stringify("\u2028\u2029"), '"\u2028\u2029"')
})

test('parse', async () => {
  assert.deepEqual(fitzJSON.parse("{a: 1}"), {a: 1})

  assert.equal(fitzJSON.parse("123_456"), 123456)
  assert.equal(fitzJSON.parse("NaN"), NaN)
  assert.equal(fitzJSON.parse("Infinity"), Infinity)
  assert.equal(fitzJSON.parse("@bigint 123_456"), 123456n)

  assert.throws(() => fitzJSON.parse("@bigint NaN"), /SyntaxError/)
})

test('roundtrip', async () => {
  const input = `{"a":@bigint 2219302139021039219030213902193}`

  const parsed = fitzJSON.parse(input)

  const stringified = fitzJSON.stringify(parsed)

  assert.equal(input, stringified)
})

test('mods', async () => {
  process.env.TEST = 'TEST'
  const parsed = fitzJSON.parse(`
  {
    i32: @i32 3456
    join: @join ['a' 'b' 'c']
    env: @env 'TEST'
  }
  `, {
    mods: {
      i32: ({node, value}) => {
        assert(node.type === 'number')
        const num = value | 0
        assert(value === num, `Not an int32: ${value}`)
        return {value: num}
      },
      join: ({value}) => {
        assert(Array.isArray(value))

        return {value: value.join('')}
      },
      env: ({node}) => {
        let key
        if (node.type === 'id') key = node.text
        else if (node.type === 'string') key = evalstring(node.child(0))
        else throw Error(`@env`)

        return {value: process.env[key]}
      }
    }
  });

  assert.deepEqual(parsed, { i32: 3456, join: 'abc', env: 'TEST' })

  assert.equal(
    stringify(parsed, null, 2), 
`{
  "i32": 3456,
  "join": "abc",
  "env": "TEST"
}`)
  assert.equal(stringify(parsed), `{"i32":3456,"join":"abc","env":"TEST"}`)
})